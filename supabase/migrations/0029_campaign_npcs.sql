-- Migration 0029 — Socle PNJ du MJ (PER-428)
--
-- Première brique de la milestone « PNJ du MJ à la volée » : une table DÉDIÉE
-- pour les PNJ de campagne, PAS un jsonb sur `campaigns` comme le Butin (0018)
-- ou l'inventaire du MJ (0019). Motif : le ticket suivant (PER-429) ajoute des
-- champs qui ne doivent JAMAIS être vus par un joueur (notes secrètes du MJ,
-- statistiques de combat) à côté d'un champ qui pourra un jour devenir montrable
-- (description publique). La RLS Postgres filtre par LIGNE, pas par colonne à
-- l'intérieur d'un jsonb — un jsonb sur `campaigns` (déjà lisible par les joueurs
-- membres via `is_campaign_member`, migration 0012) aurait fui tout son contenu
-- dès qu'un joueur y aurait eu accès, quelle que soit la logique côté client.
-- Même constat déjà fait pour `game_session_recaps` (0027).
--
-- ⚠️ RÈGLE DURE, à respecter dans CE ticket et tous les suivants de la milestone :
-- tant qu'aucun écran joueur n'existe pour les PNJ, cette table reste 100% MJ
-- (RLS propriétaire IDENTIQUE à `campaigns`/`players`, migration 0001). Le jour où
-- un écran joueur (projection, futur système de Lieux, notes de session
-- partagées) doit afficher un PNJ, il DOIT lire cette table via une VUE ou un RPC
-- serveur qui ne sélectionne QUE `name` + `description` (et seulement si son futur
-- flag de publication est actif) — jamais un accès client brut qui se
-- contenterait d'omettre les champs sensibles à l'affichage.
--
-- Contenu volontairement minimal (PER-428) : seul le nom est porté ici. Les
-- champs riches (description publique, `gm_notes` privées, disposition, statut,
-- lieu, rôle, liens PJ, stats) arrivent en PER-429/431.

create table if not exists public.campaign_npcs (
  id          uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  name        text not null,
  created_at  timestamptz not null default now()
);

create index if not exists campaign_npcs_campaign_id_idx
  on public.campaign_npcs (campaign_id);

-- Catégories de PNJ (renommables/repliables, PER-430) — même logique légère que
-- `GmInventory.categories` (0019) : aucune sensibilité, pas besoin de table à
-- part. Défaut vide : les campagnes existantes démarrent sans catégorie.
alter table public.campaigns
  add column if not exists npc_categories jsonb not null default '[]'::jsonb;

-- ────────────────────────────────────────────────────────────────────────────
-- RLS — campaign_npcs : 100% MJ, RLS propriétaire via la campagne parente,
-- IDENTIQUE au motif de `players` (0001). Aucune lecture joueur pour l'instant.
-- ────────────────────────────────────────────────────────────────────────────

alter table public.campaign_npcs enable row level security;

drop policy if exists campaign_npcs_via_owned_campaign on public.campaign_npcs;
create policy campaign_npcs_via_owned_campaign on public.campaign_npcs
  for all
  to authenticated
  using (
    exists (
      select 1 from public.campaigns c
      where c.id = campaign_npcs.campaign_id
        and c.owner_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.campaigns c
      where c.id = campaign_npcs.campaign_id
        and c.owner_id = (select auth.uid())
    )
  );
