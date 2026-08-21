-- Migration 0040 — Tag « animal fantastique » sur les créatures (PER-378, Amitié animale, voie du
-- maître de la nature r4-r8, p. 172-173).
--
-- Colonne PROJETÉE (pas seulement une clé du blob `data`) : le roster ouvert d'Amitié animale
-- (`WildAllyRosterPicker`, FeaturesByPath.tsx) filtre sur la liste LÉGÈRE (`LIST_COLUMNS`,
-- src/lib/bestiary/repo.ts), pas le blob complet — même motif que `animal_form_category`/
-- `animal_form_flavor` (0039), sinon il faudrait charger le blob de chaque créature fantastique pour
-- savoir si elle est éligible. Pas de contrainte Postgres : la forme reste côté TypeScript
-- (`Creature.isFantasticAnimal`).

alter table public.creatures
  add column if not exists is_fantastic_animal boolean not null default false;
