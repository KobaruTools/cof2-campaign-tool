-- Migration 0028 — Notes de session MJ, prises EN COURS de partie (PER-427)
--
-- Texte libre écrit par le MJ PENDANT qu'une partie se joue — distinct du recap
-- (`game_session_recaps`, migration 0027, écrit après-coup, publiable aux joueurs)
-- et du journal perso joueur (`character_session_notes`, migration 0026, une note
-- par personnage). Ici : UNE note par partie, TOUJOURS privée (MJ seul, jamais les
-- joueurs) — pas de colonne `visible_to_players`, ce système n'a pas vocation à être
-- publié.
--
-- Cardinalité : UNE ligne par session, contrainte unique (même patron que les deux
-- tables voisines).
--
-- Fenêtre d'écriture : calquée sur `character_session_notes` (pas sur
-- `game_session_recaps`) — éditable UNIQUEMENT tant que la partie référencée est EN
-- COURS (`game_sessions.ended_at is null`). Passé la clôture, la note reste lisible
-- (brouillon relu avant de rédiger le recap final) mais devient lecture seule.

create table if not exists public.game_session_notes (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid not null references public.game_sessions (id) on delete cascade,
  -- Même format que les autres champs de texte riche (`descriptionToDoc` /
  -- `docToDescription`) : chaîne sérialisée côté client, opaque ici.
  content     text not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint game_session_notes_one_per_session unique (session_id)
);

create index if not exists game_session_notes_session_id_idx
  on public.game_session_notes (session_id);

drop trigger if exists game_session_notes_touch_updated_at on public.game_session_notes;
create trigger game_session_notes_touch_updated_at
  before update on public.game_session_notes
  for each row execute function public.touch_updated_at();

-- ────────────────────────────────────────────────────────────────────────────
-- RLS
-- ────────────────────────────────────────────────────────────────────────────

alter table public.game_session_notes enable row level security;

-- Lecture : MJ propriétaire de la campagne — SEUL, jamais les joueurs (à la
-- différence de `game_session_recaps`, ici aucune bascule de publication).
drop policy if exists game_session_notes_read on public.game_session_notes;
create policy game_session_notes_read on public.game_session_notes
  for select
  to authenticated
  using (
    exists (
      select 1 from public.game_sessions s
      join public.campaigns c on c.id = s.campaign_id
      where s.id = game_session_notes.session_id
        and c.owner_id = (select auth.uid())
    )
  );

-- Création : même autorisation que la lecture, ET la partie référencée doit
-- être EN COURS (`ended_at is null`) — pas de note rétroactive sur une partie close.
drop policy if exists game_session_notes_insert on public.game_session_notes;
create policy game_session_notes_insert on public.game_session_notes
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.game_sessions s
      join public.campaigns c on c.id = s.campaign_id
      where s.id = game_session_notes.session_id
        and c.owner_id = (select auth.uid())
        and s.ended_at is null
    )
  );

-- Édition : lisible par le MJ propriétaire (cf. policy de lecture), mais
-- réécrivable UNIQUEMENT tant que la partie reste en cours — une fois close, la
-- ligne devient lecture seule (le `with check` bloque l'UPDATE).
drop policy if exists game_session_notes_update on public.game_session_notes;
create policy game_session_notes_update on public.game_session_notes
  for update
  to authenticated
  using (
    exists (
      select 1 from public.game_sessions s
      join public.campaigns c on c.id = s.campaign_id
      where s.id = game_session_notes.session_id
        and c.owner_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.game_sessions s
      join public.campaigns c on c.id = s.campaign_id
      where s.id = game_session_notes.session_id
        and c.owner_id = (select auth.uid())
        and s.ended_at is null
    )
  );

-- Pas de policy `delete` : aucune suppression directe prévue pour ce lot.
