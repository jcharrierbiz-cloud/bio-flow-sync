-- ---------------------------------------------------------------------------
-- Horizons — état synchronisé de l'application de planification (public/horizons/).
--
-- Même principe que calyre_state : un seul document JSON par utilisateur
-- (éléments, espaces, tableaux, ascensions). L'application est
-- mono-utilisateur et se lit d'un bloc ; le document est comparé par `rev`,
-- un compteur que le client incrémente à chaque écriture locale, et le client
-- ne remplace jamais une version qu'il n'a pas vue sans demander.
--
-- Table séparée de calyre_state : les deux applications sont indépendantes,
-- et l'une ne doit pas pouvoir écraser l'autre.
--
-- Migration idempotente : applicable par la chaîne de déploiement ou collée à
-- la main dans l'éditeur SQL, dans n'importe quel ordre.
-- ---------------------------------------------------------------------------

create table if not exists public.horizons_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  -- Révision du document telle que l'appareil émetteur l'a comptée.
  rev bigint not null default 0,
  -- Indication d'origine, purement informative ("Android", "Windows").
  device text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.horizons_state enable row level security;

-- Chacun ne voit et n'écrit que sa propre ligne. C'est la seule chose qui
-- protège le contenu : la clé publiable du client est publique par construction.
drop policy if exists "horizons - own select" on public.horizons_state;
create policy "horizons - own select" on public.horizons_state
  for select using (auth.uid() = user_id);

drop policy if exists "horizons - own insert" on public.horizons_state;
create policy "horizons - own insert" on public.horizons_state
  for insert with check (auth.uid() = user_id);

drop policy if exists "horizons - own update" on public.horizons_state;
create policy "horizons - own update" on public.horizons_state
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "horizons - own delete" on public.horizons_state;
create policy "horizons - own delete" on public.horizons_state
  for delete using (auth.uid() = user_id);

-- Déclarée ici aussi pour que la migration tienne seule. Corps identique à
-- celui des migrations précédentes, donc sans effet si elle existe déjà.
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists horizons_state_touch_updated_at on public.horizons_state;
create trigger horizons_state_touch_updated_at
  before update on public.horizons_state
  for each row execute function public.touch_updated_at();
