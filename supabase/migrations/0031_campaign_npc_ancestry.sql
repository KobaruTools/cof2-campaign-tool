-- Migration 0031 — Champ Peuple (ancestry) du PNJ (PER-432)
--
-- Purement narratif : aucune caractéristique/statistique dérivée n'en dépend
-- (contrairement à `Character.ancestryId`). Le peuple reste une donnée
-- STATIQUE de l'app (`src/data/ancestries.ts`, éventuellement enrichie par le
-- contenu payant « Le Compagnon » via `contentRegistry.ts`) — pas une table,
-- donc PAS de contrainte FK ici, même motif que `linked_character_ids` (0030).
-- Un id qui ne résout plus aucun peuple connu (contenu payant non chargé côté
-- client) est traité comme absent par l'UI, sans jamais lever.

alter table public.campaign_npcs
  add column if not exists ancestry_id text;
