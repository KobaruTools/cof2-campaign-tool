-- Migration 0018 — Réserve de butin par campagne (PER-200, Partie A)
--
-- Ajoute la réserve d'objets de butin du MJ à la campagne : objets pré-écrits
-- (nom + description + niveau de magie), piochés au hasard en jeu (trésor de
-- coffre, récompense, butin sur un adversaire). Même mécanique et même
-- rattachement que les rumeurs de taverne (0017) → une simple colonne jsonb sur
-- `public.campaigns`, pas de nouvelle table ni de nouvelle policy.
--
-- La RLS propriétaire posée en 0001 (owner_id = auth.uid()) couvre déjà toute la
-- ligne : le butin hérite de cette protection, les JOUEURS n'accèdent jamais à la
-- table `campaigns`.
--
-- Forme d'un élément (validée côté client, blob opaque pour la base) :
--   { "id": uuid, "served": boolean, "line": EquipmentLine }
-- `line` est un objet d'inventaire produit par la modale d'objet des fiches
-- (`ItemDialog`) : variante catalogue (`{ itemId, ... }`) ou objet libre
-- (`{ custom: true, name, ... }`). Attribuer le butin pousse cette ligne intacte dans
-- l'inventaire d'un personnage. Défaut `[]` : les campagnes existantes démarrent avec
-- une réserve vide.

alter table public.campaigns
  add column if not exists loot jsonb not null default '[]'::jsonb;
