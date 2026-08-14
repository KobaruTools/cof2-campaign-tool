-- Migration 0026 — Notes de session par personnage (PER-414)
--
-- Première brique de PER-413 (fiche personnage : bloc « Notes » à onglets Notes
-- perso / Notes de session pendant une partie en cours). Une note ÉDITABLE en
-- place par (personnage, partie) — pas de journal à entrées multiples : le
-- joueur (ou le MJ sur la fiche qu'il possède) réécrit la même ligne tout au
-- long d'une partie donnée.
--
-- Cardinalité : UNE ligne par (character_id, session_id), contrainte unique.
-- Fenêtre d'écriture : UNIQUEMENT tant que la partie référencée est EN COURS
-- (`game_sessions.ended_at is null`) — posée en `with check`, pas de RPC dédiée
-- (contrairement à `merge_game_state`, pas de fusion fine à faire ici, un simple
-- upsert suffit). Partie close → ligne toujours LISIBLE (journal personnel), plus
-- écrivable.
--
-- Autorisation calquée sur `merge_game_state` (0012/0022) : MJ propriétaire de la
-- fiche OU joueur sur SA propre fiche (`current_player_id()`). Contrairement à
-- `merge_game_state`, pas de `security definer` nécessaire ici — RLS directe,
-- car aucune fusion de blob à protéger, juste une ligne dédiée.
--
-- Futur (PAS ce lot, PER-413) : notes MJ (recap partagé, joueurs jamais accès)
-- se greffera sur un mécanisme voisin — schéma volontairement SANS colonne
-- dédiée à ça pour l'instant, juste gardé possible (table séparée à prévoir,
-- pas une colonne ici).

create table if not exists public.character_session_notes (
  id           uuid primary key default gen_random_uuid(),
  character_id uuid not null references public.characters (id) on delete cascade,
  session_id   uuid not null references public.game_sessions (id) on delete cascade,
  -- Même format que les autres champs de texte riche (`descriptionToDoc` /
  -- `docToDescription`) : chaîne sérialisée côté client, opaque ici.
  content      text not null default '',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint character_session_notes_one_per_character_session
    unique (character_id, session_id)
);

create index if not exists character_session_notes_character_id_idx
  on public.character_session_notes (character_id);

create index if not exists character_session_notes_session_id_idx
  on public.character_session_notes (session_id);

drop trigger if exists character_session_notes_touch_updated_at on public.character_session_notes;
create trigger character_session_notes_touch_updated_at
  before update on public.character_session_notes
  for each row execute function public.touch_updated_at();

-- ────────────────────────────────────────────────────────────────────────────
-- RLS
-- ────────────────────────────────────────────────────────────────────────────

alter table public.character_session_notes enable row level security;

-- Lecture : MJ propriétaire de la fiche OU joueur sur SA propre fiche — quelle
-- que soit la partie référencée, close ou non (journal personnel toujours lisible).
drop policy if exists character_session_notes_read on public.character_session_notes;
create policy character_session_notes_read on public.character_session_notes
  for select
  to authenticated
  using (
    exists (
      select 1 from public.characters c
      where c.id = character_session_notes.character_id
        and (
          c.owner_id = (select auth.uid())
          or (public.current_player_id() is not null
              and c.player_id = public.current_player_id())
        )
    )
  );

-- Création : même autorisation que la lecture, ET la partie référencée doit
-- être EN COURS (`ended_at is null`) — impossible de créer une note rétroactive
-- sur une partie déjà close.
drop policy if exists character_session_notes_insert on public.character_session_notes;
create policy character_session_notes_insert on public.character_session_notes
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.characters c
      where c.id = character_session_notes.character_id
        and (
          c.owner_id = (select auth.uid())
          or (public.current_player_id() is not null
              and c.player_id = public.current_player_id())
        )
    )
    and exists (
      select 1 from public.game_sessions s
      where s.id = character_session_notes.session_id and s.ended_at is null
    )
  );

-- Édition : lisible par son auteur (cf. policy de lecture), mais réécrivable
-- UNIQUEMENT tant que la partie reste en cours — une fois close, la ligne
-- devient lecture seule (le `with check` bloque l'UPDATE, le `using` seul ne
-- suffirait pas à l'empêcher).
drop policy if exists character_session_notes_update on public.character_session_notes;
create policy character_session_notes_update on public.character_session_notes
  for update
  to authenticated
  using (
    exists (
      select 1 from public.characters c
      where c.id = character_session_notes.character_id
        and (
          c.owner_id = (select auth.uid())
          or (public.current_player_id() is not null
              and c.player_id = public.current_player_id())
        )
    )
  )
  with check (
    exists (
      select 1 from public.characters c
      where c.id = character_session_notes.character_id
        and (
          c.owner_id = (select auth.uid())
          or (public.current_player_id() is not null
              and c.player_id = public.current_player_id())
        )
    )
    and exists (
      select 1 from public.game_sessions s
      where s.id = character_session_notes.session_id and s.ended_at is null
    )
  );

-- Pas de policy `delete` : aucune suppression directe prévue pour ce lot.
