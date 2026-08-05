-- Migration 0017 — Rumeurs de taverne par campagne (PER-199)
--
-- Ajoute la réserve de rumeurs du MJ à la campagne : accroches libres pré-écrites,
-- piochées au hasard en jeu (à l'entrée d'une taverne). Rattachement PROPRE à la
-- campagne (décision de cadrage) → une simple colonne jsonb sur `public.campaigns`,
-- dans le même esprit que `rules` : pas de nouvelle table, pas de nouvelle policy.
--
-- La RLS propriétaire posée en 0001 (owner_id = auth.uid()) couvre déjà toute la
-- ligne : les rumeurs héritent de cette protection, les JOUEURS n'accèdent jamais
-- à la table `campaigns`.
--
-- Forme d'un élément (validée côté client, blob opaque pour la base) :
--   { "id": uuid, "text": string, "served": boolean }
-- Défaut `[]` : les campagnes existantes démarrent avec une réserve vide.

alter table public.campaigns
  add column if not exists rumors jsonb not null default '[]'::jsonb;
