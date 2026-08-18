-- Migration 0037 — Lecture PNJ par le joueur (onglet « PNJ » de la fiche)
--
-- Premier écran joueur pour les PNJ (annoncé comme futur ticket par le
-- commentaire de 0029/0030) : un joueur voit, dans sa fiche personnage, les
-- PNJ que le MJ a marqués « rencontré » ou « mort » dans son écran de MJ —
-- jamais ceux encore `not-encountered`.
--
-- Conformément à la RÈGLE DURE posée en 0029 (RLS filtre par LIGNE, pas par
-- colonne dans `campaign_npcs`) : PAS de policy RLS joueur sur la table (qui
-- exposerait `stats`/`gm_notes` en plus des colonnes voulues), mais un RPC
-- `security definer` qui ne SÉLECTIONNE que les colonnes publiques et
-- n'inclut `description` que si `description_visible_to_players` est vrai —
-- même motif que `give_item_to_character` (0021) pour l'écriture, ici pour la
-- lecture.
--
-- `challenge_rating` (dérivé des stats de combat) et `category_id`/
-- `linked_character_ids` (organisation interne du MJ) restent hors de cette
-- vue : ce ne sont pas des champs narratifs destinés au joueur.

create or replace function public.fetch_campaign_npcs_for_player(cid uuid)
returns table (
  id uuid,
  name text,
  role text,
  ancestry_id text,
  sex text,
  location text,
  disposition text,
  status text,
  description text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    n.id,
    n.name,
    n.role,
    n.ancestry_id,
    n.sex,
    n.location,
    n.disposition,
    n.status,
    case when n.description_visible_to_players then n.description else null end as description,
    n.created_at
  from public.campaign_npcs n
  where n.campaign_id = cid
    and public.is_campaign_member(cid)
    and n.status <> 'not-encountered'
  order by n.name;
$$;

revoke all on function public.fetch_campaign_npcs_for_player(uuid) from public;
grant execute on function public.fetch_campaign_npcs_for_player(uuid) to authenticated;
