-- Migration 0045 — Corrige `is_member_of_campaign()` : toujours `false` en prod
--
-- Régression introduite par la migration 0043 (PER-499) : `is_member_of_campaign()`
-- était `security invoker`, mais elle interroge `player_auth_sessions`, dont la RLS
-- est activée SANS AUCUNE policy (0002 : accès réservé au client admin/service_role).
-- Résultat : pour un rôle `authenticated` (une vraie session joueur), la table est
-- invisible même pour SA propre ligne — la fonction renvoie donc TOUJOURS `false`,
-- et les policies de lecture roster (`characters`/`players`/`campaigns`) qui en
-- dépendent depuis 0043 refusent TOUT joueur. Vérifié en direct (transaction
-- annulée) : `select count(*) from public.player_auth_sessions` sous `authenticated`
-- renvoie 0 même avec une ligne correspondant à `auth.uid()`.
--
-- Correctif : `security definer` (même pattern que `enforce_player_character_scope`,
-- 0002) — la fonction s'exécute alors avec les privilèges de son propriétaire
-- (contourne la RLS de `player_auth_sessions`), tout en restant bornée par son propre
-- filtre `pas.auth_user_id = auth.uid()` : aucune fuite, un joueur ne peut toujours
-- lire que SES propres lignes de liaison.

create or replace function public.is_member_of_campaign(target_campaign_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.player_auth_sessions pas
    join public.players p on p.id = pas.player_id
    where pas.auth_user_id = (select auth.uid())
      and p.campaign_id = target_campaign_id
  );
$$;
