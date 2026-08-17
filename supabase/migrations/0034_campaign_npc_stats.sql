-- PER-431 : statistiques de combat optionnelles d'un PNJ.
--
-- Stocke une COPIE FIGÉE (jamais une référence vivante) au format `CustomCreature`
-- (`src/lib/session/customCreature.ts`, même forme qu'une créature du tracker créée à
-- la main) — que le MJ l'ait remplie manuellement ou copiée depuis une entrée du
-- bestiaire au moment de la sélection. `null` = aucune statistique renseignée (section
-- repliée, pas de tri par NC possible pour ce PNJ).
--
-- `challenge_rating` (0033) est désormais DÉRIVÉ du NC de ce bloc (`deriveChallengeRatingFromStats`,
-- `npc.ts`) plutôt que saisi séparément — la colonne reste distincte pour que le tri
-- `sortNpcsByChallenge` (PER-430) n'ait pas à parser le jsonb à chaque comparaison.
alter table public.campaign_npcs
  add column if not exists stats jsonb;
