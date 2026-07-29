-- Migration 0015 — Étend l'allowlist d'état de jeu de `merge_game_state` (PER-266)
--
-- Ajoute `equipment` et `purse` aux clés d'état de jeu synchronisables SANS verrou de
-- version, pour que le port d'équipement (main principale/secondaire, équipé/non, deux
-- mains), la consommation d'objets (quantités) et la bourse (argent gagné/dépensé) se
-- propagent en direct pendant une session — actions FRÉQUENTES en partie, qui méritent le
-- chemin sans conflit (comme les PV), pas le verrou (qui poserait des invitations à recharger).
--
-- Ces deux clés portent AUSSI de la construction (objets possédés, quantités) : faute d'id
-- stable sur les lignes d'équipement, on ne peut pas fusionner finement (comme `mounts[].hp`).
-- On REMPLACE donc le tableau `equipment` / l'objet `purse` en entier (LWW valeur absolue,
-- cohérent avec l'ADR PER-259). Une édition de CONSTRUCTION d'inventaire concurrente (mode
-- « Modifier ») peut être écrasée — rare en pleine partie, risque assumé.
--
-- La SIGNATURE de la fonction est inchangée (`merge_game_state(character_id, patch)`) → aucun
-- regénération de types nécessaire. `create or replace` idempotent ; seule l'allowlist change.

create or replace function public.merge_game_state(character_id uuid, patch jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  ch       public.characters%rowtype;
  -- Clés d'état de jeu TOP-LEVEL autorisées (disjointes de la construction, SAUF equipment/purse
  -- qui la mêlent — remplacement complet assumé, cf. entête). `mounts` est traité à part (fusion
  -- fine par id, voir merge_mount_hp).
  allowed  text[] := array[
    'depletion', 'effectToggles', 'effectInputs', 'usageCounters',
    'companionDepletion', 'companionInstances', 'mountedKey',
    'equipment', 'purse'
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
