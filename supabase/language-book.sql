-- HER LITTLE UNIVERSE: 200 Languages poetry book
-- Run this file once in Supabase Dashboard > SQL Editor.
-- Uses the existing hlu_members roles and birthday access functions.

create table if not exists public.hlu_language_book_pages (
  page_number integer primary key check (page_number between 1 and 200),
  language text not null check (length(trim(language)) between 1 and 60),
  opening text not null default '',
  poem text not null,
  ending text not null default '',
  tamil_translation text not null default '',
  english_translation text not null default '',
  audio_original_path text not null,
  audio_tamil_path text not null,
  audio_english_path text not null,
  is_published boolean not null default false,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint hlu_language_book_poem_not_empty check (length(trim(poem)) > 0)
);

create index if not exists hlu_language_book_published_idx
  on public.hlu_language_book_pages(is_published, page_number);

alter table public.hlu_language_book_pages enable row level security;

drop policy if exists "language book read published pages" on public.hlu_language_book_pages;
create policy "language book read published pages"
on public.hlu_language_book_pages for select to authenticated
using (public.hlu_is_admin() or (is_published and public.hlu_can_read_archive()));

drop policy if exists "language book admin insert pages" on public.hlu_language_book_pages;
create policy "language book admin insert pages"
on public.hlu_language_book_pages for insert to authenticated
with check (public.hlu_can_manage_archive() and created_by = auth.uid());

drop policy if exists "language book admin update pages" on public.hlu_language_book_pages;
create policy "language book admin update pages"
on public.hlu_language_book_pages for update to authenticated
using (public.hlu_can_manage_archive() and created_by = auth.uid())
with check (public.hlu_can_manage_archive() and created_by = auth.uid());

drop policy if exists "language book admin delete pages" on public.hlu_language_book_pages;
create policy "language book admin delete pages"
on public.hlu_language_book_pages for delete to authenticated
using (public.hlu_is_admin() and created_by = auth.uid());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('hlu-language-book','hlu-language-book',false,26214400,
  array['audio/mpeg','audio/mp4','audio/webm','audio/ogg','audio/wav','audio/x-wav','audio/aac','audio/x-aac','audio/3gpp','audio/flac','audio/mp3','audio/m4a','audio/x-m4a'])
on conflict (id) do update set public=false, file_size_limit=excluded.file_size_limit, allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists "language book read audio" on storage.objects;
create policy "language book read audio" on storage.objects
for select to authenticated using (
  bucket_id='hlu-language-book' and public.hlu_can_read_archive()
);

drop policy if exists "language book admin upload audio" on storage.objects;
create policy "language book admin upload audio" on storage.objects
for insert to authenticated with check (
  bucket_id='hlu-language-book'
  and public.hlu_can_manage_archive()
  and (storage.foldername(name))[1]=auth.uid()::text
);

drop policy if exists "language book admin update audio" on storage.objects;
create policy "language book admin update audio" on storage.objects
for update to authenticated using (
  bucket_id='hlu-language-book'
  and public.hlu_can_manage_archive()
  and (storage.foldername(name))[1]=auth.uid()::text
) with check (
  bucket_id='hlu-language-book'
  and public.hlu_can_manage_archive()
  and (storage.foldername(name))[1]=auth.uid()::text
);

drop policy if exists "language book admin delete audio" on storage.objects;
create policy "language book admin delete audio" on storage.objects
for delete to authenticated using (
  bucket_id='hlu-language-book'
  and public.hlu_is_admin()
  and (storage.foldername(name))[1]=auth.uid()::text
);
