-- Migration 0044 — Suivi soumetteur ↔ ticket Linear (PER-507)
--
-- Le formulaire de retour (`/api/feedback`) crée un ticket Linear mais ne
-- retient nulle part qui l'a soumis. Cette table relie chaque ticket créé à
-- son soumetteur, pour permettre plus tard (PER-510/511/512) de retrouver
-- « mes tickets » et d'y répondre.
--
-- `owner_user_id` XOR `player_id` : l'un des deux est renseigné selon le rôle
-- de la session qui a soumis le retour (jamais les deux, jamais aucun — voir
-- CONTEXT.md sur les rôles de session). `player_id` reste l'identifiant STABLE
-- même si le lien de campagne du joueur est régénéré ensuite (migration 0002 :
-- seule `player_auth_sessions` est révoquée, pas la ligne `players`).
--
-- RLS joueur ancrée sur `player_auth_sessions` (source d'autorité), PAS sur le
-- claim JWT `app_metadata.player_id` — cohérence avec
-- docs/adr/0003-player-membership-rls-via-table-not-jwt-claims.md (PER-498) :
-- une Identité qui a soumis un retour en tant que Joueur A doit continuer à le
-- voir même après avoir rejoint une 2e campagne (PER-499) et changé de claim
-- actif.

create table if not exists public.feedback_submissions (
  id               uuid primary key default gen_random_uuid(),
  owner_user_id    uuid references auth.users (id) on delete cascade,
  player_id        uuid references public.players (id) on delete cascade,
  linear_issue_id  text not null,
  linear_issue_url text not null,
  created_at       timestamptz not null default now(),
  constraint feedback_submissions_single_submitter check (
    (owner_user_id is not null and player_id is null)
    or (owner_user_id is null and player_id is not null)
  )
);

create index if not exists feedback_submissions_owner_user_id_idx
  on public.feedback_submissions (owner_user_id);
create index if not exists feedback_submissions_player_id_idx
  on public.feedback_submissions (player_id);

-- ────────────────────────────────────────────────────────────────────────────
-- Helper : l'Identité courante possède-t-elle CE `player_id` (via
-- `player_auth_sessions`), quelle que soit sa campagne active du moment ?
-- ────────────────────────────────────────────────────────────────────────────

-- `security definer` : `player_auth_sessions` a la RLS activée SANS policy
-- (accès réservé au client admin, 0002) — un `security invoker` ne verrait
-- donc JAMAIS aucune ligne, même la sienne, et retournerait toujours `false`.
create or replace function public.owns_player(target_player_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.player_auth_sessions pas
    where pas.auth_user_id = (select auth.uid())
      and pas.player_id = target_player_id
  );
$$;

-- ────────────────────────────────────────────────────────────────────────────
-- RLS — le soumetteur ne voit que ses propres lignes
-- ────────────────────────────────────────────────────────────────────────────

alter table public.feedback_submissions enable row level security;

drop policy if exists feedback_submissions_owner_select on public.feedback_submissions;
create policy feedback_submissions_owner_select on public.feedback_submissions
  for select
  to authenticated
  using (owner_user_id = (select auth.uid()));

drop policy if exists feedback_submissions_owner_insert on public.feedback_submissions;
create policy feedback_submissions_owner_insert on public.feedback_submissions
  for insert
  to authenticated
  with check (owner_user_id = (select auth.uid()) and player_id is null);

drop policy if exists feedback_submissions_player_select on public.feedback_submissions;
create policy feedback_submissions_player_select on public.feedback_submissions
  for select
  to authenticated
  using (player_id is not null and public.owns_player(player_id));

drop policy if exists feedback_submissions_player_insert on public.feedback_submissions;
create policy feedback_submissions_player_insert on public.feedback_submissions
  for insert
  to authenticated
  with check (owner_user_id is null and player_id is not null and public.owns_player(player_id));

-- Volontairement aucune policy update/delete : une réponse s'écrit sur le
-- ticket Linear (commentaire, PER-509), pas sur cette table de suivi.
