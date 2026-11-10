-- ME, ALWAYS HERE: private AI identity, approved memories and chat history.
-- Run after the existing supabase/schema.sql. All tables are protected by RLS.
create table if not exists public.hlu_ai_profile (
  id boolean primary key default true check (id = true),
  display_name text not null default 'Sabareesh',
  personality_instructions text not null default
    'Communicate in a caring, affectionate, casual, natural and direct style. Match the incoming language: conversational Tamil, Tanglish or English. Use dii, thangoo and my princess sparingly and only when natural. Be warm without being theatrical. Do not claim to be the real person.',
  style_examples jsonb not null default '[]'::jsonb,
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);
insert into public.hlu_ai_profile(id) values (true) on conflict (id) do nothing;

create table if not exists public.hlu_ai_memories (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in ('personality','life_detail','relationship','important_date','approved_conversation')),
  memory_text text not null check (length(trim(memory_text)) between 1 and 4000),
  event_date date,
  approved boolean not null default false,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);
create index if not exists hlu_ai_memories_approved_idx on public.hlu_ai_memories(approved, category);

create table if not exists public.hlu_ai_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Our conversation',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists hlu_ai_conversations_user_updated_idx on public.hlu_ai_conversations(user_id, updated_at desc);

create table if not exists public.hlu_ai_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.hlu_ai_conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user','assistant')),
  content text not null check (length(trim(content)) between 1 and 12000),
  language text,
  created_at timestamptz not null default now()
);
create index if not exists hlu_ai_messages_conversation_created_idx on public.hlu_ai_messages(conversation_id, created_at);

alter table public.hlu_ai_profile enable row level security;
alter table public.hlu_ai_memories enable row level security;
alter table public.hlu_ai_conversations enable row level security;
alter table public.hlu_ai_messages enable row level security;

drop policy if exists "AI profile member read" on public.hlu_ai_profile;
create policy "AI profile member read" on public.hlu_ai_profile for select to authenticated
using (exists(select 1 from public.hlu_members m where m.user_id = auth.uid()));
drop policy if exists "AI profile admin manage" on public.hlu_ai_profile;
create policy "AI profile admin manage" on public.hlu_ai_profile for all to authenticated
using (public.hlu_is_admin()) with check (public.hlu_is_admin());

drop policy if exists "AI approved memories member read" on public.hlu_ai_memories;
create policy "AI approved memories member read" on public.hlu_ai_memories for select to authenticated
using (approved and exists(select 1 from public.hlu_members m where m.user_id = auth.uid()));
drop policy if exists "AI admin manage memories" on public.hlu_ai_memories;
create policy "AI admin manage memories" on public.hlu_ai_memories for all to authenticated
using (public.hlu_is_admin()) with check (public.hlu_is_admin() and created_by = auth.uid());

drop policy if exists "AI own conversations" on public.hlu_ai_conversations;
create policy "AI own conversations" on public.hlu_ai_conversations for all to authenticated
using (user_id = auth.uid() and exists(select 1 from public.hlu_members m where m.user_id = auth.uid()))
with check (user_id = auth.uid() and exists(select 1 from public.hlu_members m where m.user_id = auth.uid()));

drop policy if exists "AI own messages" on public.hlu_ai_messages;
create policy "AI own messages" on public.hlu_ai_messages for all to authenticated
using (user_id = auth.uid() and exists (
  select 1 from public.hlu_ai_conversations c where c.id = conversation_id and c.user_id = auth.uid()
))
with check (user_id = auth.uid() and exists (
  select 1 from public.hlu_ai_conversations c where c.id = conversation_id and c.user_id = auth.uid()
));

-- Restrict browser-side writes of AI assistant messages: writes are performed by the Edge Function
-- using the user's JWT and this policy allows the authenticated conversation owner only.
-- For stronger role separation, do not expose a direct message insert UI.
