-- Migration 0042 — Catégories de combats préparés (PER-448, retour propriétaire)
--
-- Même patron que les catégories de PNJ (migrations 0029/0033) : les combats
-- préparés vivent dans leur table dédiée `campaign_encounter_preset` (migration
-- 0041), mais leurs CATÉGORIES (regroupement libre, renommable, repliable,
-- glisser-déposer) vivent en jsonb sur `campaigns`, SANS FK — même motif que
-- `campaigns.npc_categories` / `campaign_npcs.category_id`.
--
-- Idempotente (`add column if not exists`).

alter table public.campaigns
  add column if not exists encounter_preset_categories jsonb not null default '[]'::jsonb;

alter table public.campaign_encounter_preset
  add column if not exists category_id text;
