-- ---------------------------------------------------------------------------
-- Bio-Flow — Rappels côté serveur + abonnements Web Push.
--
-- Pourquoi ces tables : un rappel qui doit sonner alors que l'application est
-- fermée ne peut pas être déclenché par le navigateur. C'est un travail
-- planifié côté serveur qui envoie la notification. Les rappels doivent donc
-- exister ailleurs que dans le localStorage de l'appareil.
--
-- L'identifiant est fourni par le client (même uuid que la copie locale), ce
-- qui rend la synchronisation idempotente : un même rappel ne peut pas être
-- inséré deux fois depuis deux appareils.
-- ---------------------------------------------------------------------------

create table if not exists public.reminders (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  note text,
  -- Heure locale de l'utilisateur, "HH:MM". Volontairement pas un timestamp :
  -- « 18:00 tous les jours » n'est pas un instant, c'est une heure murale.
  time text not null check (time ~ '^[0-2][0-9]:[0-5][0-9]$'),
  repeat text not null check (repeat in ('once', 'daily', 'weekdays', 'weekly')),
  -- Uniquement pour repeat = 'once'.
  date date,
  -- Uniquement pour repeat = 'weekly' : 0 = dimanche … 6 = samedi.
  weekday smallint check (weekday between 0 and 6),
  enabled boolean not null default true,
  -- Fuseau IANA de l'appareil qui a créé le rappel ("Europe/Paris").
  -- Sans lui, le serveur ne sait pas quand « 18:00 » tombe.
  timezone text not null default 'Europe/Paris',
  -- Clé de la dernière occurrence envoyée, en heure locale : "2026-09-08T18:00".
  -- Comparaison de chaînes plutôt que d'instants : aucune arithmétique de
  -- fuseau, donc aucun doublon au changement d'heure.
  last_sent_key text,
  last_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists reminders_user_idx on public.reminders (user_id);
create index if not exists reminders_due_idx on public.reminders (enabled) where enabled;

alter table public.reminders enable row level security;

drop policy if exists "reminders - own select" on public.reminders;
drop policy if exists "reminders - own insert" on public.reminders;
drop policy if exists "reminders - own update" on public.reminders;
drop policy if exists "reminders - own delete" on public.reminders;

create policy "reminders - own select" on public.reminders
  for select using (auth.uid() = user_id);
create policy "reminders - own insert" on public.reminders
  for insert with check (auth.uid() = user_id);
create policy "reminders - own update" on public.reminders
  for update using (auth.uid() = user_id);
create policy "reminders - own delete" on public.reminders
  for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Abonnements Web Push : un par navigateur/appareil.
-- `endpoint` est unique côté navigateur, il sert de clé naturelle.
-- ---------------------------------------------------------------------------

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  timezone text,
  failure_count integer not null default 0,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create index if not exists push_subscriptions_user_idx
  on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

drop policy if exists "push - own select" on public.push_subscriptions;
drop policy if exists "push - own insert" on public.push_subscriptions;
drop policy if exists "push - own update" on public.push_subscriptions;
drop policy if exists "push - own delete" on public.push_subscriptions;

create policy "push - own select" on public.push_subscriptions
  for select using (auth.uid() = user_id);
create policy "push - own insert" on public.push_subscriptions
  for insert with check (auth.uid() = user_id);
create policy "push - own update" on public.push_subscriptions
  for update using (auth.uid() = user_id);
create policy "push - own delete" on public.push_subscriptions
  for delete using (auth.uid() = user_id);

-- `updated_at` tenu à jour automatiquement sur les rappels.
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists reminders_touch_updated_at on public.reminders;
create trigger reminders_touch_updated_at
  before update on public.reminders
  for each row execute function public.touch_updated_at();
