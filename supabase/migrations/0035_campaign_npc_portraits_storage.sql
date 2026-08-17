-- Migration 0035 — Illustration/portrait de PNJ (PER-437) : socle stockage
--
-- Bucket privé DÉDIÉ `npc-portraits` — surtout PAS `character-portraits`
-- (0020) : un PNJ n'appartient à aucun joueur en particulier (contrairement à
-- un personnage), le prédicat de droits est différent (voir plus bas) et le
-- ticket demande explicitement un espace de stockage séparé. UN objet par PNJ
-- (chemin `{npcId}/portrait`, sans extension — même convention que 0020),
-- écrasé à chaque remplacement (upsert), pas d'historique.
--
-- Formats/tailles : mêmes garde-fous que 0020 (le client recompresse toujours
-- en WebP avant l'envoi ; cette limite ne couvre que le pire cas).
--
-- Droits (décidés au ticket) :
--   * ÉCRITURE (dépôt/remplacement/retrait) : le MJ (propriétaire de la
--     campagne) SEUL — jamais un joueur, un PNJ n'étant jamais créé/géré par
--     un joueur (contrairement au portrait de personnage, où le joueur gère
--     aussi le sien).
--   * LECTURE : le MJ, ET tout joueur (même sans compte, session anonyme via
--     lien d'invitation) membre de la CAMPAGNE du PNJ — `current_player_campaign_id()`,
--     exactement le même prédicat que la lecture du portrait de personnage
--     (0020), simplement rejoint via `campaign_npcs.campaign_id` plutôt que
--     `characters.campaign_id` (le reste de la fiche PNJ, nom/notes MJ/stats,
--     reste 100% MJ — RLS de `campaign_npcs`, migration 0029 — ce bucket est
--     la SEULE exception volontairement plus permissive en lecture).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'npc-portraits',
  'npc-portraits',
  false,
  2097152, -- 2 Mio
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update set
  file_size_limit    = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- ────────────────────────────────────────────────────────────────────────────
-- RLS — lecture : MJ propriétaire de la campagne OU joueur (compte ou anonyme)
-- membre de cette campagne.
-- ────────────────────────────────────────────────────────────────────────────
-- Le 1er segment du chemin (`{npcId}/portrait`) est validé par une regex AVANT
-- le cast `::uuid` : un cast qui échoue lève une exception qui casse toute
-- l'évaluation de la policy (pas juste la ligne courante) — même précaution que
-- 0011/0020.

drop policy if exists npc_portraits_select on storage.objects;
create policy npc_portraits_select on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'npc-portraits'
    and objects.name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/portrait$'
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

-- ────────────────────────────────────────────────────────────────────────────
-- RLS — écriture (dépôt/remplacement/retrait) : MJ propriétaire SEUL.
-- ────────────────────────────────────────────────────────────────────────────

drop policy if exists npc_portraits_manage on storage.objects;
create policy npc_portraits_manage on storage.objects
  for all
  to authenticated
  using (
    bucket_id = 'npc-portraits'
    and objects.name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/portrait$'
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
    and objects.name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/portrait$'
    and exists (
      select 1
      from public.campaign_npcs n
      join public.campaigns c on c.id = n.campaign_id
      where n.id = split_part(objects.name, '/', 1)::uuid
        and c.owner_id = (select auth.uid())
        and not public.is_anonymous()
    )
  );
