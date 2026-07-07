-- Migration 0004 — Réclamation d'une fiche non attribuée par un JOUEUR (PER-196)
--
-- Contexte : le socle joueur (0002) laisse un joueur LIRE tout le roster de sa
-- campagne, ÉDITER et CRÉER SA fiche, mais **gèle `player_id` en UPDATE** — un
-- joueur ne peut donc pas s'attribuer un pré-tiré préparé par le MJ (fiche de sa
-- campagne, `player_id` vide). L'espace joueur `/play` (PER-196) a besoin de ce
-- geste : « réclamer une fiche non attribuée ».
--
-- Modèle validé (PER-196) : un joueur peut faire passer `player_id` de
-- **`null` → lui-même**, et UNIQUEMENT :
--   * sur une fiche de SA campagne (`campaign_id = claim`),
--   * actuellement NON attribuée (`old.player_id is null`).
-- Interdits (inchangés) : voler une fiche déjà prise, « rendre » sa fiche
-- (soi → null, reste une action MJ, PER-184), déplacer `owner_id`/`campaign_id`.
--
-- Deux verrous se combinent (défense en profondeur) :
--   1. Policy `characters_player_update_own` — sa clause `USING` doit désormais
--      rendre VISIBLE en UPDATE, en plus de ses propres fiches, les fiches non
--      attribuées de sa campagne (sinon la réclamation ne matche aucune ligne).
--   2. Trigger `enforce_player_character_scope` — n'autorise le changement de
--      `player_id` que pour le cas de réclamation ci-dessus ; gèle sinon.
-- Le `WITH CHECK` (état final `player_id = soi`) reste inchangé : il garantit
-- qu'une simple édition de contenu d'une fiche non attribuée (sans réclamation)
-- est REFUSÉE — seule une réclamation véritable (player_id → soi) aboutit.

-- ────────────────────────────────────────────────────────────────────────────
-- Trigger : autoriser la réclamation (null → soi), geler tout le reste
-- ────────────────────────────────────────────────────────────────────────────

create or replace function public.enforce_player_character_scope()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  pid        uuid := public.current_player_id();
  cid        uuid := public.current_player_campaign_id();
  camp_owner uuid;
begin
  -- Acteur non-joueur (MJ) : aucune contrainte ajoutée ici (le socle 0001 gère).
  if pid is null then
    return new;
  end if;

  if tg_op = 'INSERT' then
    -- Un joueur ne crée que dans SA campagne, attribué à LUI.
    if new.campaign_id is distinct from cid or new.player_id is distinct from pid then
      raise exception 'player_scope_violation: insert hors de la campagne/joueur du lien';
    end if;
    -- `owner_id` TOUJOURS = MJ de la campagne (la fiche survit à la révocation).
    select c.owner_id into camp_owner from public.campaigns c where c.id = new.campaign_id;
    if camp_owner is null then
      raise exception 'player_scope_violation: campagne introuvable';
    end if;
    new.owner_id := camp_owner;
    return new;
  end if;

  -- UPDATE : owner_id/campaign_id TOUJOURS gelés (le joueur ne déplace pas sa fiche).
  new.owner_id    := old.owner_id;
  new.campaign_id := old.campaign_id;

  -- `player_id` : gelé, SAUF réclamation d'une fiche non attribuée de SA campagne
  -- (null → soi). Interdit de « rendre » (soi → null) ou de voler (déjà attribuée).
  if old.player_id is null and new.player_id = pid and old.campaign_id = cid then
    -- réclamation autorisée : on conserve new.player_id = pid tel quel.
    null;
  else
    new.player_id := old.player_id;
  end if;
  return new;
end;
$$;

-- (Le trigger `characters_enforce_player_scope` de 0002 pointe déjà sur cette
--  fonction : `create or replace` suffit, pas besoin de recréer le trigger.)

-- ────────────────────────────────────────────────────────────────────────────
-- Policy UPDATE joueur : rendre les fiches réclamables visibles en écriture
-- ────────────────────────────────────────────────────────────────────────────
-- `USING` élargi : ses propres fiches OU les fiches non attribuées de sa campagne
-- (candidates à la réclamation). `WITH CHECK` inchangé (état final `player_id = soi`
-- dans sa campagne) → une édition sans réclamation d'une fiche non attribuée échoue.

drop policy if exists characters_player_update_own on public.characters;
create policy characters_player_update_own on public.characters
  for update
  to authenticated
  using (
    current_player_id() is not null
    and (
      player_id = current_player_id()
      or (player_id is null and campaign_id = current_player_campaign_id())
    )
  )
  with check (
    current_player_id() is not null
    and player_id = current_player_id()
    and campaign_id = current_player_campaign_id()
  );
