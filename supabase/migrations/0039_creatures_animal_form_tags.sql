-- Migration 0039 — Tags « Forme animale » sur les créatures (catégorie taxonomique +
-- variante géante/préhistorique).
--
-- Colonnes PROJETÉES (pas seulement des clés du blob `data`) : le sélecteur de forme
-- animale (`AnimalFormSelector`, FeaturesByPath.tsx) filtre sur la liste LÉGÈRE
-- (`LIST_COLUMNS`, src/lib/bestiary/repo.ts), pas le blob complet — sans ces colonnes
-- il faudrait charger le blob de chaque créature pour filtrer, ce qui n'est pas
-- praticable pour une liste de ~80 entrées. Pas de contrainte Postgres (enum/check) :
-- même motif que `sex` (0032), la forme reste côté TypeScript (`Creature.animalFormCategory`
-- / `animalFormFlavor`).

alter table public.creatures
  add column if not exists animal_form_category text,
  add column if not exists animal_form_flavor text;
