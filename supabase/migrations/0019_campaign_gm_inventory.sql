-- Migration 0019 — Inventaire permanent du MJ par campagne (PER-200, extension)
--
-- Réserve permanente d'objets, à part de la réserve piochée au hasard (`loot`,
-- 0018) : le MJ y prépare des objets uniques qu'il distribue à la main (pas de
-- tirage), organisés en catégories renommables/repliables. Même rattachement que
-- `loot`/`rumors` → une simple colonne jsonb sur `public.campaigns`, couverte par
-- la RLS propriétaire posée en 0001.
--
-- Forme (validée côté client, blob opaque pour la base) :
--   {
--     "categories": [{ "id": uuid, "name": string, "collapsed": boolean }, ...],
--     "items": [{ "id": uuid, "line": EquipmentLine, "categoryId": uuid | null }, ...]
--   }
-- `line` est un objet d'inventaire produit par `ItemDialog`, comme dans `loot`.
-- Défaut vide : les campagnes existantes (dont la réserve aléatoire `loot` déjà
-- peuplée) démarrent avec un inventaire permanent vide, sans rien perdre.

alter table public.campaigns
  add column if not exists gm_inventory jsonb not null default '{"categories":[],"items":[]}'::jsonb;
