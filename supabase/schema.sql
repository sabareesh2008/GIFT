-- HER LITTLE UNIVERSE: secure daily mailbox
-- Run this entire file in Supabase Dashboard > SQL Editor.
-- Configured birthday unlock: 23 April 2027 (next birthday after the project setup date).
-- The supplied birth date was 2008-04-23; this archive unlocks on the next occurrence, 2027-04-23,
-- then remains read-only for the viewer permanently after that date.

create extension if not exists pgcrypto;

create table if not exists public.hlu_app_config (
  singleton boolean primary key default true check (singleton = true),
  birthday date not null default date '2027-04-23',
  timezone text not null default 'Asia/Kolkata',
  updated_at timestamptz not null default now()
);
insert into public.hlu_app_config (singleton, birthday, timezone)
values (true, date '2027-04-23', 'Asia/Kolkata')
on conflict (singleton) do update
set birthday = excluded.birthday, timezone = excluded.timezone, updated_at = now();

create table if not exists public.hlu_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('admin', 'viewer')),
  created_at timestamptz not null default now()
);

create table if not exists public.hlu_daily_entries (
  id uuid primary key default gen_random_uuid(),
  entry_date date not null,
  entry_type text not null check (entry_type in ('text', 'audio', 'video', 'image')),
  title text not null default '',
  notes text not null default '',
  text_content text not null default '',
  media jsonb not null default '[]'::jsonb,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint hlu_text_content_check check (entry_type <> 'text' or length(trim(text_content)) > 0),
  constraint hlu_media_check check (entry_type = 'text' or jsonb_array_length(media) > 0)
);
create index if not exists hlu_daily_entries_date_idx on public.hlu_daily_entries(entry_date, created_at);

create or replace function public.hlu_my_role()
returns text
language sql stable security definer
set search_path = public
as $$
  select role from public.hlu_members where user_id = auth.uid() limit 1;
$$;

create or replace function public.hlu_is_admin()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select coalesce(public.hlu_my_role() = 'admin', false);
$$;

create or replace function public.hlu_birthday_reached()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select coalesce(
    (now() at time zone coalesce((select timezone from public.hlu_app_config where singleton = true), 'Asia/Kolkata'))::date
      >= (select birthday from public.hlu_app_config where singleton = true),
    false
  );
$$;

create or replace function public.hlu_can_manage_archive()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select public.hlu_is_admin() and not public.hlu_birthday_reached();
$$;

create or replace function public.hlu_can_read_archive()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select public.hlu_is_admin()
      or (coalesce(public.hlu_my_role() = 'viewer', false) and public.hlu_birthday_reached());
$$;

alter table public.hlu_app_config enable row level security;
alter table public.hlu_members enable row level security;
alter table public.hlu_daily_entries enable row level security;

drop policy if exists "hlu config authenticated read" on public.hlu_app_config;
create policy "hlu config authenticated read" on public.hlu_app_config
for select to authenticated using (true);

drop policy if exists "hlu members read own role" on public.hlu_members;
create policy "hlu members read own role" on public.hlu_members
for select to authenticated using (user_id = auth.uid());

-- Admin can view entries while preparing them. Viewer can view only on/after birthday.
drop policy if exists "hlu read permitted archive" on public.hlu_daily_entries;
create policy "hlu read permitted archive" on public.hlu_daily_entries
for select to authenticated using (public.hlu_can_read_archive());

drop policy if exists "hlu admin insert before birthday" on public.hlu_daily_entries;
create policy "hlu admin insert before birthday" on public.hlu_daily_entries
for insert to authenticated with check (public.hlu_can_manage_archive() and created_by = auth.uid());

drop policy if exists "hlu admin update before birthday" on public.hlu_daily_entries;
create policy "hlu admin update before birthday" on public.hlu_daily_entries
for update to authenticated using (public.hlu_can_manage_archive() and created_by = auth.uid())
with check (public.hlu_can_manage_archive() and created_by = auth.uid());

drop policy if exists "hlu admin delete entries" on public.hlu_daily_entries;
create policy "hlu admin delete entries" on public.hlu_daily_entries
for delete to authenticated using (public.hlu_is_admin() and created_by = auth.uid());

-- Private media bucket. Browser uploads are stored under <auth-user-uuid>/<entry-uuid>/...
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'hlu-daily-love', 'hlu-daily-love', false, 104857600,
  array['image/jpeg','image/png','image/webp','image/gif','image/heic','audio/mpeg','audio/mp4','audio/webm','audio/ogg','video/mp4','video/webm','video/quicktime']
)
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "hlu media read permitted archive" on storage.objects;
create policy "hlu media read permitted archive" on storage.objects
for select to authenticated using (bucket_id = 'hlu-daily-love' and public.hlu_can_read_archive());

drop policy if exists "hlu media upload admin before birthday" on storage.objects;
create policy "hlu media upload admin before birthday" on storage.objects
for insert to authenticated with check (
  bucket_id = 'hlu-daily-love'
  and public.hlu_can_manage_archive()
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "hlu media update admin before birthday" on storage.objects;
create policy "hlu media update admin before birthday" on storage.objects
for update to authenticated using (
  bucket_id = 'hlu-daily-love'
  and public.hlu_can_manage_archive()
  and (storage.foldername(name))[1] = auth.uid()::text
) with check (
  bucket_id = 'hlu-daily-love'
  and public.hlu_can_manage_archive()
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "hlu media delete admin" on storage.objects;
create policy "hlu media delete admin" on storage.objects
for delete to authenticated using (
  bucket_id = 'hlu-daily-love'
  and public.hlu_is_admin()
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- After creating both Supabase Auth accounts, assign roles using their Auth user UUIDs:
-- insert into public.hlu_members(user_id, role) values ('YOUR_AUTH_USER_UUID', 'admin');
-- insert into public.hlu_members(user_id, role) values ('SANTHIYA_AUTH_USER_UUID', 'viewer');
-- Do these two inserts in SQL Editor. Never assign admin to Santhiya.

-- The configured unlock date is 2027-04-23 (Asia/Kolkata).
-- This is the next birthday based on the supplied birth date 2008-04-23.
