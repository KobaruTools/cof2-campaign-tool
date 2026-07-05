-- Migration 0001 — Fondations multi-tenant (PER-187)
--
-- Pose les 3 tables du service cloud + la RLS propriétaire. Modèle validé
-- (pivot PER-180) : la campagne est un regroupement OPTIONNEL, la propriété
-- (tenancy) s'ancre sur `characters.owner_id`, pas sur la campagne.
--
--   campaigns  : possédées par un utilisateur (MJ de la campagne).
--   players    : joueurs LOCAUX à une campagne (identité légère, lien magique).
--   characters : possédés par un utilisateur ; campagne/joueur = rattachement
--                OPTIONNEL (nullable). Le personnage est l'entité première.
--
-- Le `Character` reste un blob JSONB opaque (schemaVersion géré côté client,
-- actuellement 16) — aucune migration de schéma de perso n'est introduite ici.
--
-- La RLS JOUEUR (lien magique, JWT scopé) est livrée en PER-191 ; ici on ne
-- pose que le socle PROPRIÉTAIRE.

create extension if not exists pgcrypto; -- gen_random_uuid()

-- ────────────────────────────────────────────────────────────────────────────
-- Tables
-- ────────────────────────────────────────────────────────────────────────────

create table if not exists public.campaigns (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references auth.users (id) on delete cascade,
  name        text not null,
  description text,
  -- Réglages de règles de table (armes à feu, dé de vie…) — détail en PER-190.
  rules       jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.players (
  id          uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  name        text not null,
  -- Secret du lien magique joueur — régénérable/révocable (exploité en PER-191).
  join_secret uuid not null default gen_random_uuid(),
  created_at  timestamptz not null default now()
);

create table if not exists public.characters (
  id             uuid primary key default gen_random_uuid(),
  -- Ancre de propriété/tenancy : un perso appartient TOUJOURS à un utilisateur.
  owner_id       uuid not null references auth.users (id) on delete cascade,
  -- Rattachement OPTIONNEL. `null` = « Non attribué ». Supprimer une campagne
  -- DÉTACHE ses persos (SET NULL), ne les détruit pas.
  campaign_id    uuid references public.campaigns (id) on delete set null,
  player_id      uuid references public.players (id) on delete set null,
  status         text not null default 'active'
                   check (status in ('active', 'dead', 'retired')),
  -- Verrou optimiste (PER-192) : incrémenté à chaque écriture.
  version        integer not null default 1,
  -- Version du blob `data` (schemaVersion du `Character`) — recopie pour filet
  -- analytique, sans éclater le blob.
  schema_version integer not null,
  -- Le `Character` sérialisé, opaque et versionné côté client.
  data           jsonb not null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  -- Cohérence : un joueur n'a de sens que dans une campagne (le joueur est LOCAL
  -- à sa campagne). Pas de player_id sans campaign_id.
  constraint characters_player_requires_campaign
    check (player_id is null or campaign_id is not null)
);

-- Index de support (RLS + filtres de listes).
create index if not exists campaigns_owner_id_idx   on public.campaigns (owner_id);
create index if not exists players_campaign_id_idx   on public.players (campaign_id);
create index if not exists characters_owner_id_idx    on public.characters (owner_id);
create index if not exists characters_campaign_id_idx on public.characters (campaign_id);
create index if not exists characters_player_id_idx   on public.characters (player_id);

-- ────────────────────────────────────────────────────────────────────────────
-- updated_at auto
-- ────────────────────────────────────────────────────────────────────────────

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists campaigns_touch_updated_at on public.campaigns;
create trigger campaigns_touch_updated_at
  before update on public.campaigns
  for each row execute function public.touch_updated_at();

drop trigger if exists characters_touch_updated_at on public.characters;
create trigger characters_touch_updated_at
  before update on public.characters
  for each row execute function public.touch_updated_at();

-- ────────────────────────────────────────────────────────────────────────────
-- RLS — socle propriétaire (ancré sur owner_id)
-- ────────────────────────────────────────────────────────────────────────────

alter table public.campaigns  enable row level security;
alter table public.players    enable row level security;
alter table public.characters enable row level security;

-- campaigns : le propriétaire lit/écrit ses campagnes.
drop policy if exists campaigns_owner_all on public.campaigns;
create policy campaigns_owner_all on public.campaigns
  for all
  to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

-- characters : le propriétaire lit/écrit ses persos (indépendamment de la campagne).
drop policy if exists characters_owner_all on public.characters;
create policy characters_owner_all on public.characters
  for all
  to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

-- players : accessibles via la campagne parente POSSÉDÉE par l'utilisateur.
drop policy if exists players_via_owned_campaign on public.players;
create policy players_via_owned_campaign on public.players
  for all
  to authenticated
  using (
    exists (
      select 1 from public.campaigns c
      where c.id = players.campaign_id
        and c.owner_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.campaigns c
      where c.id = players.campaign_id
        and c.owner_id = (select auth.uid())
    )
  );

-- NOTE (PER-191) : la visibilité MJ↔joueur (le MJ voit le roster, le joueur
-- édite sa seule fiche via lien magique) s'ajoutera par des politiques dédiées
-- s'appuyant sur un JWT scopé, sans retirer ce socle propriétaire.
