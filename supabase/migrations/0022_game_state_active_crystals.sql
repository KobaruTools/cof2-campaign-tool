-- Migration 0022 — Ajoute `activeCrystalIds` à l'allowlist d'état de jeu (PER-360)
--
-- Activer ou désactiver un cristal de la Voie des cristaux (p. 156) est de l'ÉTAT DE JEU au même
-- titre qu'un interrupteur de capacité (`effectToggles`) : cela se fait en partie, à l'action
-- limitée, et cela n'a rien d'une édition de construction. Sans cette entrée, la clé passait par
-- le chemin verrouillé (verrou de version) et ne se propageait pas en direct — un cristal confié
-- puis RENDU par son porteur restait coché sur la fiche du mage jusqu'au rechargement.
--
-- La SIGNATURE de la fonction est inchangée (`merge_game_state(character_id, patch)`) → aucune
-- régénération de types nécessaire. `create or replace` idempotent ; seule l'allowlist change
-- (reprise verbatim de 0015, plus la nouvelle clé).

create or replace function public.merge_game_state(character_id uuid, patch jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  ch       public.characters%rowtype;
  -- Clés d'état de jeu TOP-LEVEL autorisées (disjointes de la construction, SAUF equipment/purse
  -- qui la mêlent — remplacement complet assumé, cf. 0015). `mounts` est traité à part (fusion
  -- fine par id, voir merge_mount_hp).
  allowed  text[] := array[
    'depletion', 'effectToggles', 'effectInputs', 'usageCounters',
    'companionDepletion', 'companionInstances', 'mountedKey',
    'equipment', 'purse', 'activeCrystalIds'
  ];
  filtered jsonb := '{}'::jsonb;
  k        text;
begin
  select * into ch from public.characters c where c.id = character_id;
  if not found then
    raise exception 'merge_game_state: personnage introuvable';
  end if;

  -- Autorisation : MJ propriétaire de la fiche, OU joueur sur SA propre fiche.
  if not (
    ch.owner_id = (select auth.uid())
    or (public.current_player_id() is not null
        and ch.player_id = public.current_player_id())
  ) then
    raise exception 'merge_game_state: appelant non autorisé'
      using errcode = '42501';
  end if;

  -- Ne retenir du patch que les clés d'état de jeu de l'allowlist.
  foreach k in array allowed loop
    if patch ? k then
      filtered := filtered || jsonb_build_object(k, patch -> k);
    end if;
  end loop;

  -- `mounts` : fusion fine des PV par id (jamais de remplacement en bloc).
  if patch ? 'mounts' then
    filtered := filtered || jsonb_build_object(
      'mounts',
      public.merge_mount_hp(ch.data -> 'mounts', patch -> 'mounts')
    );
  end if;

  update public.characters
    set data = data || filtered
    where id = character_id;

  return (select c.data from public.characters c where c.id = character_id);
end;
$$;

grant execute on function public.merge_game_state(uuid, jsonb) to authenticated;
