-- PER-430 : catégories de PNJ (regroupement/tri/recherche) + PER-431 (cadrage) : stub
-- de statistique de combat (NC) pour permettre le tri « par NC » dès PER-430, sans UI
-- d'édition avant PER-431.
--
-- `category_id` référence une entrée de `campaigns.npc_categories` (jsonb, posée par
-- 0029) SANS contrainte FK — même motif que `ancestry_id`/`sex` (0031/0032) : les
-- catégories vivent dans un jsonb, pas une table, une FK Postgres est impossible ici.
-- `null` = « Sans catégorie ».
alter table public.campaign_npcs
  add column if not exists category_id text;

-- `challenge_rating` : Niveau de Challenge du PNJ, purement narratif tant que PER-431
-- n'a pas câblé le calcul de stats de combat. `null` = non renseigné (fin de liste au
-- tri par NC).
alter table public.campaign_npcs
  add column if not exists challenge_rating numeric;
