-- Migration 0016 — Lien de projection dédié (PER-271, suite de la milestone PER-259)
--
-- Un TROISIÈME vecteur d'accès au canal de session, à côté du MJ (owner) et du
-- joueur (lien magique, 0002). But : projeter le tracker d'initiative sur une TV /
-- un second ordinateur SANS se connecter en MJ ni en joueur sur cette machine, en
-- OBSERVATEUR strictement LECTURE SEULE.
--
-- Découverte structurante : l'appartenance campagne est portée par un CLAIM JWT
-- (`is_campaign_member(cid)` = owner OU `app_metadata.campaign_id == cid`, 0012 +
-- 0002). Un observateur de projection n'a donc besoin que d'un claim `campaign_id`
-- SANS `player_id` : il passe la LECTURE (canal Realtime privé, `game_sessions`,
-- `campaign_combat`, roster de persos) mais AUCUNE écriture de fiche (toutes les
-- policies d'écriture joueur exigent `current_player_id()` non-null, qu'il n'a pas).
-- Le socle RLS de LECTURE est donc INCHANGÉ ici.
--
-- Cette migration pose :
--   1. `projection_links`         : un lien réutilisable par campagne (secret rotable),
--                                    géré par le MJ propriétaire (RLS owner-only).
--   2. `projection_auth_sessions` : liaison anon↔campagne pour la révocation forte
--                                    (table verrouillée, accès admin seul), sur le
--                                    modèle de `player_auth_sessions` (0002).
--   3. `is_campaign_actor(cid)`    : « membre qui a le droit d'ÉCRIRE » (owner OU
--                                    joueur), et durcissement de la policy d'écriture
--                                    du canal Broadcast pour EXCLURE la projection —
--                                    lecture seule au niveau RLS, pas seulement client.
--
-- Idempotente.

-- ────────────────────────────────────────────────────────────────────────────
-- 1. `projection_links` — un lien de projection réutilisable par campagne
-- ────────────────────────────────────────────────────────────────────────────
-- PK = `campaign_id` : au plus un lien par campagne (décision proprio). Le secret
-- (uuid v4) est rotable — régénérer coupe l'ancien lien et, côté application, les
-- sessions de projection vivantes (via `projection_auth_sessions`). RLS : seul le MJ
-- propriétaire de la campagne gère la ligne ; le REDEEM lit le secret via le client
-- admin (contourne la RLS), comme le lien magique joueur.

create table if not exists public.projection_links (
  campaign_id uuid primary key references public.campaigns (id) on delete cascade,
  secret      uuid not null default gen_random_uuid(),
  created_at  timestamptz not null default now()
);

alter table public.projection_links enable row level security;

drop policy if exists projection_links_owner_all on public.projection_links;
create policy projection_links_owner_all on public.projection_links
  for all
  to authenticated
  using (
    exists (
      select 1 from public.campaigns c
      where c.id = projection_links.campaign_id and c.owner_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.campaigns c
      where c.id = projection_links.campaign_id and c.owner_id = (select auth.uid())
    )
  );

-- ────────────────────────────────────────────────────────────────────────────
-- 2. `projection_auth_sessions` — liaison anon↔campagne (révocation forte)
-- ────────────────────────────────────────────────────────────────────────────
-- Remplie au redeem d'un lien de projection. Sert à retrouver et supprimer les
-- utilisateurs anonymes d'une campagne quand le MJ régénère/révoque le lien (ce qui
-- invalide leurs refresh tokens → l'écran de projection est déconnecté). Comme
-- `player_auth_sessions` (0002) : RLS activée SANS aucune policy → aucun accès via
-- l'API PostgREST (authenticated/anon) ; seul le client admin (clé secrète) lit/écrit.
-- La suppression de l'utilisateur anonyme (ou de la campagne) purge la ligne en cascade.

create table if not exists public.projection_auth_sessions (
  auth_user_id uuid primary key references auth.users (id) on delete cascade,
  campaign_id  uuid not null references public.campaigns (id) on delete cascade,
  created_at   timestamptz not null default now()
);

create index if not exists projection_auth_sessions_campaign_id_idx
  on public.projection_auth_sessions (campaign_id);

alter table public.projection_auth_sessions enable row level security;
-- (Volontairement aucune policy : seul le client admin, qui contourne la RLS,
--  lit/écrit cette table.)

-- ────────────────────────────────────────────────────────────────────────────
-- 3. `is_campaign_actor(cid)` + durcissement de l'ÉCRITURE du canal Broadcast
-- ────────────────────────────────────────────────────────────────────────────
-- La policy d'écriture du canal `session:<cid>` (0012, `game_session_broadcast_write`)
-- gate sur `is_campaign_member` — que le claim de projection satisfait AUSSI. Le client
-- de projection n'émet jamais (broadcast comme présence), mais on ne veut pas s'en
-- remettre au client : un lien de projection fuité pourrait sinon forger des broadcasts.
-- On introduit donc `is_campaign_actor` = membre AYANT le droit d'écrire (owner OU
-- joueur, i.e. `current_player_id()` non-null) et on l'utilise pour l'écriture. La
-- LECTURE (`game_session_broadcast_read`) reste sur `is_campaign_member` : la projection
-- reçoit tout, n'émet rien. `security definer` + `search_path = ''` (durcissement Supabase).

create or replace function public.is_campaign_actor(cid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    exists (
      select 1 from public.campaigns c
      where c.id = cid and c.owner_id = (select auth.uid())
    )
    or (
      public.current_player_id() is not null
      and public.current_player_campaign_id() = cid
    ),
    false
  );
$$;

grant execute on function public.is_campaign_actor(uuid) to authenticated;

-- Réécriture de la policy d'écriture : la projection (claim campagne seul, sans
-- player_id, non owner) n'est PAS un acteur → ses broadcasts/présence sont refusés.
drop policy if exists game_session_broadcast_write on realtime.messages;
create policy game_session_broadcast_write on realtime.messages
  for insert
  to authenticated
  with check (
    realtime.messages.extension in ('broadcast', 'presence')
    and (select realtime.topic()) like 'session:%'
    and public.is_campaign_actor(
      nullif(split_part((select realtime.topic()), ':', 2), '')::uuid
    )
  );
