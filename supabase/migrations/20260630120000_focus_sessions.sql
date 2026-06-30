-- focus_sessions : source de vérité unique des Focus Stats
create table if not exists public.focus_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  started_at timestamptz not null,
  ended_at timestamptz,
  duration_seconds integer not null default 0,
  target_seconds integer,
  completed boolean not null default false,
  label text,
  created_at timestamptz not null default now()
);

create index if not exists focus_sessions_user_started_idx
  on public.focus_sessions (user_id, started_at desc);

alter table public.focus_sessions enable row level security;

create policy "focus - own select" on public.focus_sessions
  for select using (auth.uid() = user_id);
create policy "focus - own insert" on public.focus_sessions
  for insert with check (auth.uid() = user_id);
create policy "focus - own update" on public.focus_sessions
  for update using (auth.uid() = user_id);
create policy "focus - own delete" on public.focus_sessions
  for delete using (auth.uid() = user_id);
