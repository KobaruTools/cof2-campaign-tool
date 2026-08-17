-- Migration 0032 — Champ Genre du PNJ (PER-433)
--
-- Même motif que `ancestry_id` (0031) : fait narratif simple, PAS de contrainte
-- Postgres (enum/check) tant qu'aucun besoin explicite ne le justifie. Réutilise
-- les valeurs de `Sex` (`'male' | 'female'`) déjà utilisées côté personnage-joueur
-- (`Identity.sex`) — la contrainte de forme reste côté TypeScript.

alter table public.campaign_npcs
  add column if not exists sex text;
