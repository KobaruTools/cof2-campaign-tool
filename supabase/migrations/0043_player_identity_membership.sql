-- Migration 0043 — Fondation Identité joueur multi-campagnes (PER-498)
--
-- Décisions actées au grilling (2026-09-05), voir CONTEXT.md (« Joueur » /
-- « Identité joueur ») et docs/adr/0003-player-membership-rls-via-table-not-jwt-claims.md.
--
-- Le Joueur reste local à UNE campagne (invariant `characters_player_requires_campaign`
-- inchangé). Ce qui change : une Identité joueur (une session, anonyme ou compte réel)
-- peut désormais être liée à PLUSIEURS Joueurs. `player_auth_sessions` devient la
-- source d'autorité pour ce périmètre élargi — PAS les claims JWT (`app_metadata`),
-- qui resteraient valides jusqu'à expiration après un retrait de membership
-- (régression sur la révocation forte déjà garantie par 0002).
--
-- Portée VOLONTAIREMENT limitée : `current_player_id()`/`current_player_campaign_id()`
-- (JWT) restent inchangées et continuent de servir ~13 autres migrations (sessions de
-- jeu, présence, portraits, notes, transferts d'objets, PNJ) qui n'ont aujourd'hui
-- jamais plus d'une ligne par Identité — donc aucune régression pour elles. Seules
-- les policies de lecture roster (`characters`/`players`/`campaigns`), qui deviennent
-- un ceiling multi-campagne, basculent sur les nouveaux helpers ci-dessous. Étendre
-- les ~13 autres migrations au modèle multi-membership est un ticket séparé, à faire
-- quand PER-499 peuplera réellement plus d'une ligne par Identité.

-- ────────────────────────────────────────────────────────────────────────────
-- `player_auth_sessions` : clé composite (une Identité porte désormais N Joueurs)
-- ────────────────────────────────────────────────────────────────────────────
-- Rien à migrer : chaque `auth_user_id` n'a aujourd'hui qu'une ligne (redeem crée
-- toujours une session anonyme fraîche), donc élargir la PK à la paire ne casse
-- aucune donnée existante — c'est un sur-ensemble compatible.

alter table public.player_auth_sessions
  drop constraint player_auth_sessions_pkey;

alter table public.player_auth_sessions
  add constraint player_auth_sessions_pkey primary key (auth_user_id, player_id);

-- ────────────────────────────────────────────────────────────────────────────
-- Helpers d'appartenance (source d'autorité : la table, pas le JWT)
-- ────────────────────────────────────────────────────────────────────────────

create or replace function public.is_member_of_campaign(target_campaign_id uuid)
returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (
    select 1
    from public.player_auth_sessions pas
    join public.players p on p.id = pas.player_id
    where pas.auth_user_id = (select auth.uid())
      and p.campaign_id = target_campaign_id
  );
$$;

-- ────────────────────────────────────────────────────────────────────────────
-- Policies roster (lecture) : ceiling multi-campagne via les helpers ci-dessus
-- ────────────────────────────────────────────────────────────────────────────
-- Ce ceiling autorise désormais TOUTES les campagnes membres de l'Identité, pas
-- une seule — le code appelant (`/play`) DOIT filtrer explicitement la campagne
-- affichée (`.eq('campaign_id', …)`), la RLS n'étant plus le seul filet qui
-- garantissait « une ligne ». Voir `src/app/play/page.tsx`.

drop policy if exists characters_player_read_roster on public.characters;
create policy characters_player_read_roster on public.characters
  for select
  to authenticated
  using (public.is_member_of_campaign(campaign_id));

drop policy if exists players_player_read_roster on public.players;
create policy players_player_read_roster on public.players
  for select
  to authenticated
  using (public.is_member_of_campaign(campaign_id));

drop policy if exists campaigns_player_read on public.campaigns;
create policy campaigns_player_read on public.campaigns
  for select
  to authenticated
  using (public.is_member_of_campaign(id));
