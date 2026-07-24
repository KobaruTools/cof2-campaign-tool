-- Migration 0008 — Déblocage du contenu payant par code (PER-243)
--
-- Dernière brique de gating de la milestone « Contenu payant gaté » : donner à
-- l'utilisateur un moyen SELF-SERVICE de débloquer une source payante en saisissant
-- un CODE, sans exposer de surface d'admin ni la `service_role`.
--
-- Principe (modèle `redeemJoinSecret`, PER-189) : le code n'est JAMAIS la barrière —
-- il ne fait que REMPLIR un entitlement (`source_entitlements`, PER-242) ; la vraie
-- barrière reste la RLS de 0007. Une RPC `SECURITY DEFINER` valide le code contre le
-- secret stocké de la source et pose la ligne d'entitlement de l'utilisateur courant.
--
--   * Code STOCKÉ sur la source (`sources.redeem_code`) : une source non-entitlée
--     n'étant même pas LISIBLE via la RLS (0007), le code reste secret côté client.
--   * Code ROTABLE : `update sources set redeem_code = …` ne touche pas les
--     `source_entitlements` déjà posés (accès déjà accordés conservés).
--   * Sessions ANONYMES (joueurs PER-191) EXCLUES du déblocage (`is_anonymous()`).

-- ────────────────────────────────────────────────────────────────────────────
-- Colonne : code de déblocage de la source (payantes seulement, secret)
-- ────────────────────────────────────────────────────────────────────────────
-- Nullable : les sources gratuites n'en ont pas. Un index unique PARTIEL
-- (insensible à la casse) garantit qu'un code débloque AU PLUS une source.

alter table public.sources
  add column if not exists redeem_code text;

create unique index if not exists sources_redeem_code_unique
  on public.sources (lower(redeem_code))
  where redeem_code is not null;

-- ────────────────────────────────────────────────────────────────────────────
-- RPC : déblocage d'une source par code (octroi d'entitlement)
-- ────────────────────────────────────────────────────────────────────────────
-- `SECURITY DEFINER` + `search_path = ''` (modèle `touch_player_presence` 0005 /
-- `redeemJoinSecret` PER-189) : le corps s'exécute avec les droits du propriétaire
-- pour LIRE la source payante (invisible à l'appelant via la RLS 0007) et INSÉRER
-- l'entitlement (aucune policy d'écriture sur `source_entitlements`). Le périmètre
-- reste sûr : l'insertion est bornée à `auth.uid()` (le JWT de l'appelant, non
-- falsifiable — `SECURITY DEFINER` ne change PAS `auth.uid()`, seulement le rôle DB).
--
-- Retour `jsonb` :
--   * succès → { ok: true, source_slug, source_name } (message UX en français) ;
--   * échec  → { ok: false } — SANS fuite sur l'existence du code / de la source,
--              et SANS création d'entitlement.
--
-- Un utilisateur anonyme (session joueur PER-191) est refusé même s'il présente un
-- code valide : `is_anonymous()` est FAIL-SAFE (claim absent ⇒ anonyme ⇒ refus).

create or replace function public.redeem_source_code(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_code   text := btrim(coalesce(p_code, ''));
  v_source record;
begin
  -- Sessions anonymes (joueurs) et non authentifiées : jamais de déblocage.
  if public.is_anonymous() or auth.uid() is null then
    return jsonb_build_object('ok', false);
  end if;

  -- Code vide/blanc : échec propre sans toucher la base.
  if v_code = '' then
    return jsonb_build_object('ok', false);
  end if;

  -- Source PAYANTE portant ce code (comparaison insensible à la casse). DEFINER →
  -- contourne la RLS de `sources` (une source payante est invisible à l'appelant).
  select s.id, s.slug, s.name
    into v_source
    from public.sources s
   where s.is_paid = true
     and s.redeem_code is not null
     and lower(s.redeem_code) = lower(v_code)
   limit 1;

  -- Code inconnu : échec propre, aucun entitlement, sans fuite d'existence.
  if v_source.id is null then
    return jsonb_build_object('ok', false);
  end if;

  -- Pose l'entitlement de l'utilisateur COURANT (idempotent : re-saisir un code
  -- déjà utilisé ne crée pas de doublon et reste un succès).
  insert into public.source_entitlements (user_id, source_id)
  values (auth.uid(), v_source.id)
  on conflict (user_id, source_id) do nothing;

  return jsonb_build_object(
    'ok', true,
    'source_slug', v_source.slug,
    'source_name', v_source.name
  );
end;
$$;

-- ────────────────────────────────────────────────────────────────────────────
-- GRANTs : réservé aux sessions authentifiées (jamais `anon`)
-- ────────────────────────────────────────────────────────────────────────────
-- Par défaut PostgreSQL accorde EXECUTE à PUBLIC : on le RÉVOQUE puis on n'ouvre
-- qu'à `authenticated`. Un utilisateur anonyme Supabase porte AUSSI le rôle DB
-- `authenticated` (c'est un vrai `auth.users`) → l'exclusion des joueurs anonymes
-- est faite DANS le corps (`is_anonymous()`), pas par le grant.

revoke execute on function public.redeem_source_code(text) from public;
grant execute on function public.redeem_source_code(text) to authenticated;
