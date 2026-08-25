-- Migration 0041 — Bibliothèque de combats préparés à l'avance (PER-448)
--
-- Le MJ prépare des rencontres (adversaires, éventuellement alliés/PNJ) ENTRE deux
-- séances, indépendamment du combat en cours (`campaign_combat`, une seule ligne par
-- campagne). Une campagne peut avoir PLUSIEURS presets nommés.
--
-- Réservé au MJ : contrairement à `campaign_combat` (que les joueurs peuvent LIRE en
-- projection), un preset n'est jamais montré à un joueur — pas de politique de lecture
-- membre ici, uniquement `owner_all`.
--
-- Idempotente (`if not exists` / `drop policy if exists`).

create table if not exists public.campaign_encounter_preset (
  id          uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  name        text not null,
  note        text,
  -- Composition : liste d'entrées `{slug, custom?, name?, side, count}` (cf.
  -- `EncounterPresetEntry`, `src/lib/session/encounterPreset.ts`). Pas de PV ni d'id
  -- d'instance ici — ce n'est pas un combat, juste une recette à relancer.
  entries     jsonb not null default '[]'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists campaign_encounter_preset_campaign_id_idx
  on public.campaign_encounter_preset (campaign_id);

drop trigger if exists campaign_encounter_preset_touch_updated_at on public.campaign_encounter_preset;
create trigger campaign_encounter_preset_touch_updated_at
  before update on public.campaign_encounter_preset
  for each row execute function public.touch_updated_at();

alter table public.campaign_encounter_preset enable row level security;

drop policy if exists campaign_encounter_preset_owner_all on public.campaign_encounter_preset;
create policy campaign_encounter_preset_owner_all on public.campaign_encounter_preset
  for all
  to authenticated
  using (
    exists (
      select 1 from public.campaigns c
      where c.id = campaign_encounter_preset.campaign_id and c.owner_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.campaigns c
      where c.id = campaign_encounter_preset.campaign_id and c.owner_id = (select auth.uid())
    )
  );
