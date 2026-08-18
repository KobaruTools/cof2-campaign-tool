-- Migration 0038 — Corrige le portrait de PNJ invisible côté JOUEUR (PER-439)
--
-- Bug : la policy SELECT `npc_portraits_select` (0035/0036) autorise via un
-- sous-select DIRECT sur `campaign_npcs` (join `campaigns`). Mais
-- `campaign_npcs` a sa PROPRE RLS 100% MJ, SANS AUCUNE policy joueur (migration
-- 0029, à dessein : `gm_notes`/`stats` ne doivent jamais fuiter à un joueur).
-- Conséquence : pour un JOUEUR (même anonyme via lien magique, avec
-- `current_player_campaign_id()` correctement renseigné), ce sous-select est
-- déjà bloqué par la RLS de `campaign_npcs` AVANT même que le OR MJ/joueur de
-- la policy storage soit évalué — `exists(...)` retombe systématiquement à
-- `false`. Le portrait est donc TOUJOURS refusé côté joueur, quel que soit son
-- statut de membre légitime de la campagne.
--
-- Même piège déjà identifié et contourné pour `is_campaign_member` (0012,
-- `security definer` explicitement "pour ne pas dépendre de la RLS de
-- campaigns [et] éviter la récursion de politiques") — oublié ici pour
-- `campaign_npcs`. Fix : un helper `security definer` dédié qui contourne la
-- RLS de `campaign_npcs` pour cette seule vérification booléenne (il ne
-- renvoie jamais aucune colonne sensible de la ligne, juste vrai/faux).

create or replace function public.can_read_npc_portrait(p_npc_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.campaign_npcs n
    join public.campaigns c on c.id = n.campaign_id
    where n.id = p_npc_id
      and (
        (c.owner_id = (select auth.uid()) and not public.is_anonymous())
        or (public.current_player_campaign_id() is not null and n.campaign_id = public.current_player_campaign_id())
      )
  );
$$;

revoke all on function public.can_read_npc_portrait(uuid) from public;
grant execute on function public.can_read_npc_portrait(uuid) to authenticated;

drop policy if exists npc_portraits_select on storage.objects;
create policy npc_portraits_select on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'npc-portraits'
    and objects.name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/portrait(-crop\.json)?$'
    and public.can_read_npc_portrait(split_part(objects.name, '/', 1)::uuid)
  );
