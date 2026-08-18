-- Migration 0036 — Corrige l'envoi de la zone de recadrage du portrait de PNJ
--
-- Bug PER-437 : `uploadNpcPortrait` (npcPortrait.ts) envoie DEUX objets
-- (`{npcId}/portrait` puis `{npcId}/portrait-crop.json`), mais la migration
-- 0035 n'autorisait que le premier — `allowed_mime_types` limité aux images,
-- policies RLS ancrées `$` juste après `/portrait`. Le second envoi était donc
-- systématiquement refusé (erreur visible au MJ), alors que l'image elle-même
-- avait déjà été déposée avec succès (visible après rechargement). Même bug
-- déjà corrigé côté portrait de personnage, cf. 0023.

update storage.buckets
set allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp', 'application/json']
where id = 'npc-portraits';

drop policy if exists npc_portraits_select on storage.objects;
create policy npc_portraits_select on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'npc-portraits'
    and objects.name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/portrait(-crop\.json)?$'
    and exists (
      select 1
      from public.campaign_npcs n
      join public.campaigns c on c.id = n.campaign_id
      where n.id = split_part(objects.name, '/', 1)::uuid
        and (
          (c.owner_id = (select auth.uid()) and not public.is_anonymous())
          or (public.current_player_campaign_id() is not null and n.campaign_id = public.current_player_campaign_id())
        )
    )
  );

drop policy if exists npc_portraits_manage on storage.objects;
create policy npc_portraits_manage on storage.objects
  for all
  to authenticated
  using (
    bucket_id = 'npc-portraits'
    and objects.name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/portrait(-crop\.json)?$'
    and exists (
      select 1
      from public.campaign_npcs n
      join public.campaigns c on c.id = n.campaign_id
      where n.id = split_part(objects.name, '/', 1)::uuid
        and c.owner_id = (select auth.uid())
        and not public.is_anonymous()
    )
  )
  with check (
    bucket_id = 'npc-portraits'
    and objects.name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/portrait(-crop\.json)?$'
    and exists (
      select 1
      from public.campaign_npcs n
      join public.campaigns c on c.id = n.campaign_id
      where n.id = split_part(objects.name, '/', 1)::uuid
        and c.owner_id = (select auth.uid())
        and not public.is_anonymous()
    )
  );
