-- Migration 0021 — Don d'objet entre joueurs, SANS validation du MJ (PER-388)
--
-- Un enchanteur peut fabriquer un objet magique, mais rien ne lui permet aujourd'hui de le
-- donner à un autre joueur : le seul chemin d'attribution existant (butin, PER-200) est piloté
-- par le MJ, qui possède TOUTES les fiches de sa campagne. Un joueur, lui, n'a le droit d'écrire
-- que sur SA PROPRE fiche (RLS `characters_player_update_own`, migration 0002) — il ne peut donc
-- pas poser l'objet sur la fiche d'un camarade.
--
-- On pose ICI, comme pour `session_participant_join`/`leave` (0014), UNE fonction `security
-- definer` qui pousse UN objet dans l'inventaire d'un AUTRE personnage de la MÊME campagne, sans
-- intervention du MJ. Le retrait chez le DONNEUR, lui, N'A PAS besoin d'un chemin nouveau : c'est
-- une écriture ORDINAIRE de sa propre fiche (RLS existante, ou `merge_game_state` en session) —
-- câblée côté client dans `stores/characters.ts`.
--
-- Volontairement SIMPLE : la fonction ne fait qu'AJOUTER une ligne (jamais de fusion avec une
-- pile existante — un don répété peut donc produire deux lignes du même objet chez le receveur,
-- assumé). Elle ne connaît ni le donneur ni l'objet donné dans le détail : c'est le CLIENT qui a
-- déjà validé le don (objet non porté, quantité dans les bornes, cf. `itemTransfer.ts`) et
-- construit l'objet à transmettre ; la fonction ne fait que l'AUTORISATION (appelant membre de la
-- campagne du receveur, receveur = personnage de joueur, jamais soi-même) et l'ÉCRITURE.

create or replace function public.give_item_to_character(receiver_id uuid, item jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  receiver public.characters%rowtype;
begin
  select * into receiver from public.characters c where c.id = receiver_id for update;

  if receiver.id is null then
    raise exception 'give_item_to_character: personnage introuvable';
  end if;

  if receiver.player_id is null then
    raise exception 'give_item_to_character: seul un personnage de joueur peut recevoir un don'
      using errcode = '42501';
  end if;

  if receiver.campaign_id is null or not public.is_campaign_member(receiver.campaign_id) then
    raise exception 'give_item_to_character: appelant non membre de la campagne du destinataire'
      using errcode = '42501';
  end if;

  -- On ne peut pas se donner un objet à soi-même par ce chemin (les persos possédés par un MJ,
  -- non liés à un joueur, ne matchent jamais `current_player_id()` et passent donc toujours).
  if public.current_player_id() is not null and receiver.player_id = public.current_player_id() then
    raise exception 'give_item_to_character: on ne peut pas se donner un objet à soi-même'
      using errcode = '42501';
  end if;

  update public.characters
    set data = jsonb_set(
      data,
      '{equipment}',
      coalesce(data -> 'equipment', '[]'::jsonb) || jsonb_build_array(item)
    )
    where id = receiver.id;

  return (select c.data -> 'equipment' from public.characters c where c.id = receiver.id);
end;
$$;

revoke all on function public.give_item_to_character(uuid, jsonb) from public;
grant execute on function public.give_item_to_character(uuid, jsonb) to authenticated;
