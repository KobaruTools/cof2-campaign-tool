-- Migration 0023 — Zone de recadrage du portrait personnalisé (PER-394)
--
-- Le fichier `{characterId}/portrait` cesse d'être pré-recadré : c'est désormais
-- toujours l'illustration ORIGINALE (le filigrane d'en-tête en a besoin entière
-- quand son fond est transparent). Le carré choisi par le joueur est déposé à
-- part, `{characterId}/portrait-crop.json`, dans le MÊME bucket
-- `character-portraits` (migration 0020) — pas de nouveau champ sur
-- `characters`, cohérent avec le principe déjà posé de ne rien dupliquer dans
-- le blob JSONB pour ce qui vit dans le bucket.
--
-- Deux ajustements sur le socle 0020, tous deux nécessaires à ce second objet :
-- le bucket n'acceptait que des images (`allowed_mime_types`), et les policies
-- RLS n'autorisaient QUE le chemin exact `{uuid}/portrait` (`$` en fin de regex).

update storage.buckets
set allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp', 'application/json']
where id = 'character-portraits';

drop policy if exists character_portraits_select on storage.objects;
create policy character_portraits_select on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'character-portraits'
    and objects.name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/portrait(-crop\.json)?$'
    and exists (
      select 1
      from public.characters c
      where c.id = split_part(objects.name, '/', 1)::uuid
        and (
          (c.owner_id = (select auth.uid()) and not public.is_anonymous())
          or (public.current_player_id() is not null and c.player_id = public.current_player_id())
          or (public.current_player_campaign_id() is not null and c.campaign_id = public.current_player_campaign_id())
        )
    )
  );

drop policy if exists character_portraits_manage on storage.objects;
create policy character_portraits_manage on storage.objects
  for all
  to authenticated
  using (
    bucket_id = 'character-portraits'
    and objects.name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/portrait(-crop\.json)?$'
    and exists (
      select 1
      from public.characters c
      where c.id = split_part(objects.name, '/', 1)::uuid
        and (
          (c.owner_id = (select auth.uid()) and not public.is_anonymous())
          or (public.current_player_id() is not null and c.player_id = public.current_player_id())
        )
    )
  )
  with check (
    bucket_id = 'character-portraits'
    and objects.name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/portrait(-crop\.json)?$'
    and exists (
      select 1
      from public.characters c
      where c.id = split_part(objects.name, '/', 1)::uuid
        and (
          (c.owner_id = (select auth.uid()) and not public.is_anonymous())
          or (public.current_player_id() is not null and c.player_id = public.current_player_id())
        )
    )
  );
