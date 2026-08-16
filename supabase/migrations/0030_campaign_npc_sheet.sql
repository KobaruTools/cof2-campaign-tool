-- Migration 0030 — Fiche PNJ complète, séparation stricte public/privé (PER-429)
--
-- Étoffe `campaign_npcs` (0029, socle nom seul) avec les champs narratifs validés
-- en cadrage. Respecte la RÈGLE DURE posée par 0029 : `gm_notes` reste 100% MJ,
-- SANS bascule de publication — seule `description` porte une bascule
-- (`description_visible_to_players`, désactivée par défaut, même motif que
-- `game_session_recaps.visible_to_players`, migration 0027). Personne ne lit
-- cette bascule aujourd'hui côté joueur (aucun écran joueur PNJ n'existe) : elle
-- prépare juste le terrain sans migration supplémentaire plus tard.
--
-- `linked_character_ids` référence `public.characters` mais volontairement SANS
-- contrainte FK : un tableau (pas une ligne à ligne) de UUID, cohérent avec le
-- reste de la fiche PNJ qui reste un blob éditable par le MJ — la résolution des
-- noms se fait côté client via le store `characters` déjà chargé (même motif que
-- `campaignCharacters` dans `LootTreasurePanel`). Un id qui ne résout plus aucun
-- personnage (suppression depuis une autre session) est traité comme absent par
-- l'UI, sans jamais lever.

alter table public.campaign_npcs
  add column if not exists description text,
  add column if not exists description_visible_to_players boolean not null default false,
  add column if not exists gm_notes text,
  add column if not exists disposition text not null default 'neutral'
    check (disposition in ('ally', 'enemy', 'neutral')),
  add column if not exists status text not null default 'not-encountered'
    check (status in ('not-encountered', 'encountered', 'dead')),
  add column if not exists location text,
  add column if not exists role text,
  add column if not exists linked_character_ids uuid[] not null default '{}';
