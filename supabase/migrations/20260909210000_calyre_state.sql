-- ---------------------------------------------------------------------------
-- CALYRE — état synchronisé de la console de pilotage (public/pilotage/).
--
-- Un seul document JSON par utilisateur : c'est la console entière (tâches,
-- objectifs, colonnes, mouvements, notes, dossiers, journal horaire, rappels).
--
-- Pourquoi un document et non une table par collection : la console est
-- strictement mono-utilisateur et se lit d'un bloc. Un schéma éclaté
-- imposerait une fusion par enregistrement avec pierres tombales — sans quoi
-- une suppression faite sur un appareil ressuscite depuis l'autre — pour un
-- gain nul quand il n'y a qu'un seul lecteur. Le document est comparé par
-- `rev`, un compteur que le client incrémente à chaque écriture locale ; le
-- client ne remplace jamais une version qu'il n'a pas vue sans demander.
--
-- Cette migration est idempotente : elle peut être appliquée par la chaîne de
-- déploiement ou collée à la main dans l'éditeur SQL, dans n'importe quel
-- ordre, sans effet de bord.
-- ---------------------------------------------------------------------------

create table if not exists public.calyre_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  -- Révision du document telle que l'appareil émetteur l'a comptée.
  rev bigint not null default 0,
  -- Indication d'origine, purement informative ("Android", "Windows").
  device text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.calyre_state enable row level security;

-- Chacun ne voit et n'écrit que sa propre ligne. C'est la seule chose qui
-- protège le contenu : la clé publiable du client, elle, est publique par
-- construction.
drop policy if exists "calyre - own select" on public.calyre_state;
create policy "calyre - own select" on public.calyre_state
  for select using (auth.uid() = user_id);

drop policy if exists "calyre - own insert" on public.calyre_state;
create policy "calyre - own insert" on public.calyre_state
  for insert with check (auth.uid() = user_id);

drop policy if exists "calyre - own update" on public.calyre_state;
create policy "calyre - own update" on public.calyre_state
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "calyre - own delete" on public.calyre_state;
create policy "calyre - own delete" on public.calyre_state
  for delete using (auth.uid() = user_id);

-- Déclarée ici aussi pour que la migration tienne seule si elle est appliquée
-- avant celle des rappels. Corps identique, donc sans effet si elle existe.
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists calyre_state_touch_updated_at on public.calyre_state;
create trigger calyre_state_touch_updated_at
  before update on public.calyre_state
  for each row execute function public.touch_updated_at();
