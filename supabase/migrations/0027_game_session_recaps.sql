-- Migration 0027 — Recap MJ partagé par partie (PER-407)
--
-- Texte libre écrit par le MJ après une partie, PRIVÉ par défaut (lui seul le
-- lit), publiable explicitement aux joueurs de la campagne d'un coup de
-- bascule (`visible_to_players`). Système SÉPARÉ des notes perso joueur
-- (`character_session_notes`, migration 0026) : droits et cardinalité
-- différents (une note par personnage+partie, VS un recap par partie, tous
-- personnages confondus).
--
-- Table dédiée plutôt qu'une colonne sur `game_sessions` : la policy de
-- lecture existante `game_sessions_member_read` (0012) donne aux joueurs
-- lecture de la ligne ENTIÈRE — une colonne recap dessus serait donc visible
-- aux joueurs quelle que soit sa visibilité voulue (RLS filtre par LIGNE, pas
-- par colonne). Une table à part permet une policy de lecture row-level
-- distincte, conditionnée à `visible_to_players`.
--
-- Cardinalité : UNE ligne par session, contrainte unique. Pas de fenêtre
-- d'écriture liée à l'état ouvert/clos de la partie (contrairement à
-- `character_session_notes`) : un recap s'écrit typiquement après la fin de
-- la partie, mais rien n'empêche le MJ de la rédiger pendant qu'elle est
-- encore en cours.

create table if not exists public.game_session_recaps (
  id                 uuid primary key default gen_random_uuid(),
  session_id         uuid not null references public.game_sessions (id) on delete cascade,
  -- Même format que les autres champs de texte riche (`descriptionToDoc` /
  -- `docToDescription`) : chaîne sérialisée côté client, opaque ici.
  content            text not null default '',
  visible_to_players boolean not null default false,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint game_session_recaps_one_per_session unique (session_id)
);

create index if not exists game_session_recaps_session_id_idx
  on public.game_session_recaps (session_id);

drop trigger if exists game_session_recaps_touch_updated_at on public.game_session_recaps;
create trigger game_session_recaps_touch_updated_at
  before update on public.game_session_recaps
  for each row execute function public.touch_updated_at();

-- ────────────────────────────────────────────────────────────────────────────
-- RLS
-- ────────────────────────────────────────────────────────────────────────────

alter table public.game_session_recaps enable row level security;

-- Lecture : MJ propriétaire de la campagne — toujours. Joueur membre de la
-- campagne — uniquement si le MJ a publié le recap (`visible_to_players`).
drop policy if exists game_session_recaps_read on public.game_session_recaps;
create policy game_session_recaps_read on public.game_session_recaps
  for select
  to authenticated
  using (
    exists (
      select 1 from public.game_sessions s
      join public.campaigns c on c.id = s.campaign_id
      where s.id = game_session_recaps.session_id
        and (
          c.owner_id = (select auth.uid())
          or (game_session_recaps.visible_to_players and public.is_campaign_member(c.id))
        )
    )
  );

-- Écriture (création/édition) : MJ propriétaire de la campagne uniquement —
-- les joueurs n'ont jamais la main sur le recap, même une fois publié.
drop policy if exists game_session_recaps_owner_write on public.game_session_recaps;
create policy game_session_recaps_owner_write on public.game_session_recaps
  for all
  to authenticated
  using (
    exists (
      select 1 from public.game_sessions s
      join public.campaigns c on c.id = s.campaign_id
      where s.id = game_session_recaps.session_id
        and c.owner_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.game_sessions s
      join public.campaigns c on c.id = s.campaign_id
      where s.id = game_session_recaps.session_id
        and c.owner_id = (select auth.uid())
    )
  );
