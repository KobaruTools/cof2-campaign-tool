-- Migration 0020 — Portrait de personnage personnalisé : socle stockage (PER-382)
--
-- Bucket privé `character-portraits`, UN objet par personnage (chemin
-- `{characterId}/portrait`, sans extension — le type MIME stocké par Supabase
-- fait foi ; un remplacement écrase l'objet existant quel que soit le format
-- d'origine). Formats acceptés : png/jpeg/webp (pas de svg, cf. ticket).
--
-- `file_size_limit` est un garde-fou SERVEUR : le client redimensionne et
-- compresse TOUJOURS l'image avant l'envoi (canvas navigateur), cette limite ne
-- couvre que le pire cas (image quasi incompressible au format/dimension choisis).
-- Compte Supabase gratuit sans carte : un dépassement de quota bloque l'upload,
-- ne facture jamais — ces limites sont un garde-fou de DISPONIBILITÉ, pas
-- financier (cf. mémoire de design PER-382→385).
--
-- Droits (décidés au ticket) : le joueur propriétaire du personnage, ou le MJ de
-- la campagne à laquelle il appartient, peuvent déposer/remplacer/retirer son
-- portrait. Dans ce modèle (PER-180/191), `characters.owner_id` EST TOUJOURRS le
-- MJ de la campagne quand `campaign_id` est renseigné (imposé par le trigger
-- `enforce_player_character_scope`, migration 0002) — « MJ de la campagne » et
-- « owner_id » désignent donc la même condition, sans jointure supplémentaire sur
-- `campaigns`. La policy d'écriture réutilise ainsi exactement le même prédicat
-- que `characters_owner_all` (0001/0003) + `characters_player_update_own` (0002).
--
-- La lecture est plus large : tout le monde qui peut LIRE la fiche (le
-- propriétaire, le joueur, et le reste du roster de la campagne — pour
-- l'afficher dans les listings/tracker d'initiative/écran MJ) peut lire son
-- portrait, en réutilisant les prédicats de lecture existants de `characters`.

-- ────────────────────────────────────────────────────────────────────────────
-- Bucket privé `character-portraits`
-- ────────────────────────────────────────────────────────────────────────────

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'character-portraits',
  'character-portraits',
  false,
  2097152, -- 2 Mio
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update set
  file_size_limit    = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- ────────────────────────────────────────────────────────────────────────────
-- RLS — lecture (aligne les mêmes ayants droit que la lecture de `characters`)
-- ────────────────────────────────────────────────────────────────────────────
-- Le 1er segment du chemin (`{characterId}/portrait`) est validé par une regex
-- AVANT le cast `::uuid` : un cast qui échoue lève une exception qui casse toute
-- l'évaluation de la policy (pas juste la ligne courante) — même précaution que
-- la qualification `objects.name` de la migration 0011.

drop policy if exists character_portraits_select on storage.objects;
create policy character_portraits_select on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'character-portraits'
    and objects.name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/portrait$'
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

-- ────────────────────────────────────────────────────────────────────────────
-- RLS — écriture (dépôt/remplacement/retrait) : propriétaire OU joueur du perso
-- ────────────────────────────────────────────────────────────────────────────
-- Plus étroite que la lecture : le reste du roster (autres joueurs de la même
-- campagne) ne peut PAS déposer le portrait d'un personnage qui n'est pas le
-- sien. `for all` couvre insert/update/delete (et select, en supplément permissif
-- de la policy ci-dessus, sans jamais la restreindre).

drop policy if exists character_portraits_manage on storage.objects;
create policy character_portraits_manage on storage.objects
  for all
  to authenticated
  using (
    bucket_id = 'character-portraits'
    and objects.name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/portrait$'
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
    and objects.name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/portrait$'
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
