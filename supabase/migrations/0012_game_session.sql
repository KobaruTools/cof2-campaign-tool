-- Migration 0012 — Socle base de données de la session de table synchronisée (PER-263)
--
-- Premier maillon de la milestone PER-259 « Session de table synchronisée en temps
-- réel MJ↔joueurs » (conception validée le 2026-07-28, la description Linear de
-- PER-259 fait office d'ADR). On pose ICI, testé et sécurisé, UNIQUEMENT les
-- fondations en base de données — AUCUNE UI, AUCUN temps réel côté client :
--
--   * `game_sessions`            : la notion de « session en cours » (active =
--                                  `ended_at IS NULL`, au plus une par campagne).
--   * `game_session_participants`: journal horodaté des présences (posé ici,
--                                  consommé par le ticket de suite « Journal de session »).
--   * `campaign_combat`          : état de combat partagé, portée CAMPAGNE (persiste
--                                  entre sessions, MJ seul auteur).
--   * RPC `merge_game_state`     : chemin d'écriture d'ÉTAT DE JEU qui fusionne dans le
--                                  blob `characters` UNIQUEMENT les clés d'état de jeu
--                                  (allowlist), SANS toucher ni vérifier `version` —
--                                  pour cohabiter sans conflit avec le verrou de version
--                                  des éditions de CONSTRUCTION (PER-192).
--
-- RLS : réutilise les helpers de la migration 0002 (`current_player_id()`,
-- `current_player_campaign_id()`). Écriture réservée au MJ propriétaire de la
-- campagne, lecture ouverte aux membres (MJ + joueurs dont le claim `campaign_id`
-- correspond). Autorisation du canal Broadcast `session:<campaign_id>` via policy
-- sur `realtime.messages`.
--
-- Idempotente (`if not exists` / `create or replace` / `drop policy if exists`).

-- ────────────────────────────────────────────────────────────────────────────
-- Helper : l'appelant est-il MEMBRE de la campagne ?
-- ────────────────────────────────────────────────────────────────────────────
-- Membre = MJ propriétaire de la campagne OU joueur dont le claim `campaign_id`
-- (lien magique, migration 0002) pointe sur elle. `security definer` pour ne pas
-- dépendre de la RLS de `campaigns` (évite la récursion de politiques) ;
-- `search_path = ''` + qualification complète (durcissement Supabase).

create or replace function public.is_campaign_member(cid uuid)
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
    or public.current_player_campaign_id() = cid,
    false
  );
$$;

-- ────────────────────────────────────────────────────────────────────────────
-- Table `game_sessions` — la notion de session (le gate d'abonnement temps réel)
-- ────────────────────────────────────────────────────────────────────────────
-- La session active d'une campagne = la ligne `ended_at IS NULL`. L'index partiel
-- unique en garantit AU PLUS UNE par campagne. `last_active_at` porte le battement
-- basse fréquence qui alimentera la fermeture auto « vide depuis X » (PER-264).

create table if not exists public.game_sessions (
  id             uuid primary key default gen_random_uuid(),
  campaign_id    uuid not null references public.campaigns (id) on delete cascade,
  started_at     timestamptz not null default now(),
  -- `null` = session ACTIVE. Renseigné à la fermeture (avec `ended_reason`).
  ended_at       timestamptz,
  -- Battement basse fréquence (~2-3 min par n'importe quel présent), pour la
  -- fermeture paresseuse « vide depuis X » (PER-264). Pas de cron.
  last_active_at timestamptz not null default now(),
  -- Raison de fin : explicite MJ / vide / plafond 12 h. Cohérent avec `ended_at`
  -- via le check ci-dessous (les deux nuls ensemble, ou renseignés ensemble).
  ended_reason   text check (ended_reason in ('gm', 'empty', 'expired')),
  created_at     timestamptz not null default now(),
  constraint game_sessions_ended_consistency
    check ((ended_at is null) = (ended_reason is null))
);

-- Au plus UNE session active (`ended_at IS NULL`) par campagne.
create unique index if not exists game_sessions_one_active_per_campaign
  on public.game_sessions (campaign_id)
  where ended_at is null;

create index if not exists game_sessions_campaign_id_idx
  on public.game_sessions (campaign_id);

-- ────────────────────────────────────────────────────────────────────────────
-- Table `game_session_participants` — journal horodaté des présences
-- ────────────────────────────────────────────────────────────────────────────
-- `player_id` null = MJ. Posée ici ; sa CONSOMMATION (journal / historique de
-- session) est un ticket de suite (PER-270), hors périmètre PER-263.

create table if not exists public.game_session_participants (
  id         uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.game_sessions (id) on delete cascade,
  -- `null` = MJ ; sinon joueur local (référence `players`).
  player_id  uuid references public.players (id) on delete cascade,
  joined_at  timestamptz not null default now(),
  left_at    timestamptz
);

create index if not exists game_session_participants_session_id_idx
  on public.game_session_participants (session_id);

-- ────────────────────────────────────────────────────────────────────────────
-- Table `campaign_combat` — état de combat partagé, portée CAMPAGNE
-- ────────────────────────────────────────────────────────────────────────────
-- Une seule ligne par campagne (PK = `campaign_id`). Relogé de `localStorage`
-- (`gm-combat:<cid>`) vers cette table en PER-267. MJ seul auteur → pas de RPC de
-- merge (écriture directe + broadcast) ; persiste entre sessions (préparation de
-- rencontres à l'avance, comme aujourd'hui).

create table if not exists public.campaign_combat (
  campaign_id uuid primary key references public.campaigns (id) on delete cascade,
  -- Instances de créatures, dépletions, tour courant, visibilité, camp.
  state       jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);

drop trigger if exists campaign_combat_touch_updated_at on public.campaign_combat;
create trigger campaign_combat_touch_updated_at
  before update on public.campaign_combat
  for each row execute function public.touch_updated_at();

-- ────────────────────────────────────────────────────────────────────────────
-- Fusion fine des PV de monture (`mounts[].hp`) par id d'instance
-- ────────────────────────────────────────────────────────────────────────────
-- `mounts` est le SEUL tableau d'état de jeu qui mêle construction (`catalogId`,
-- `bardeId`, `name`) et état de jeu (`hp`). Pour honorer le principe de l'ADR
-- « clés d'état de jeu DISJOINTES de la construction → aucun écrasement mutuel »,
-- on ne remplace JAMAIS le tableau en bloc : le patch ne porte que `{id, hp}` par
-- monture, et on remplace UNIQUEMENT le `hp` de la monture correspondante. Les
-- ids inconnus du patch sont ignorés (impossible d'ajouter/retirer une monture
-- via le canal d'état de jeu — ça reste de la construction, sous verrou de version).

create or replace function public.merge_mount_hp(current_mounts jsonb, patch_mounts jsonb)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select coalesce(
    jsonb_agg(
      case when pm.hp is not null then jsonb_set(m.elem, '{hp}', pm.hp) else m.elem end
      order by m.ord
    ),
    '[]'::jsonb
  )
  from jsonb_array_elements(coalesce(current_mounts, '[]'::jsonb))
       with ordinality as m(elem, ord)
  left join lateral (
    select pe.elem -> 'hp' as hp
    from jsonb_array_elements(coalesce(patch_mounts, '[]'::jsonb)) as pe(elem)
    where pe.elem ->> 'id' = m.elem ->> 'id'
    limit 1
  ) pm on true;
$$;

-- ────────────────────────────────────────────────────────────────────────────
-- RPC `merge_game_state(character_id, patch)` — écriture d'ÉTAT DE JEU
-- ────────────────────────────────────────────────────────────────────────────
-- Fusionne dans `characters.data` UNIQUEMENT les clés d'état de jeu (allowlist),
-- SANS toucher ni vérifier `version` : c'est la primitive qui permet aux écritures
-- d'état de jeu de cohabiter avec le verrou de version des éditions de construction
-- (PER-192) sans conflit. Les clés hors allowlist du `patch` sont IGNORÉES.
--
-- `security definer` (contourne la RLS de `characters`) → l'autorisation est
-- VÉRIFIÉE EXPLICITEMENT ici : seul le MJ propriétaire de la fiche, ou le joueur
-- sur SA propre fiche (claim `player_id`), peut écrire. Le trigger de périmètre
-- joueur de 0002 (gel de l'attribution) reste actif sur l'UPDATE. `version` n'est
-- jamais écrit ; `updated_at` est rafraîchi par le trigger existant.
--
-- Renvoie le `data` fusionné (l'appelant confirme l'état absolu résultant).

create or replace function public.merge_game_state(character_id uuid, patch jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  ch       public.characters%rowtype;
  -- Clés d'état de jeu TOP-LEVEL autorisées (disjointes de la construction).
  -- `mounts` est traité à part (fusion fine par id, voir merge_mount_hp).
  allowed  text[] := array[
    'depletion', 'effectToggles', 'effectInputs', 'usageCounters',
    'companionDepletion', 'companionInstances', 'mountedKey'
  ];
  filtered jsonb := '{}'::jsonb;
  k        text;
begin
  select * into ch from public.characters c where c.id = character_id;
  if not found then
    raise exception 'merge_game_state: personnage introuvable';
  end if;

  -- Autorisation : MJ propriétaire de la fiche, OU joueur sur SA propre fiche.
  if not (
    ch.owner_id = (select auth.uid())
    or (public.current_player_id() is not null
        and ch.player_id = public.current_player_id())
  ) then
    raise exception 'merge_game_state: appelant non autorisé'
      using errcode = '42501';
  end if;

  -- Ne retenir du patch que les clés d'état de jeu de l'allowlist.
  foreach k in array allowed loop
    if patch ? k then
      filtered := filtered || jsonb_build_object(k, patch -> k);
    end if;
  end loop;

  -- `mounts` : fusion fine des PV par id (jamais de remplacement en bloc).
  if patch ? 'mounts' then
    filtered := filtered || jsonb_build_object(
      'mounts',
      public.merge_mount_hp(ch.data -> 'mounts', patch -> 'mounts')
    );
  end if;

  update public.characters
    set data = data || filtered
    where id = character_id;

  return (select c.data from public.characters c where c.id = character_id);
end;
$$;

grant execute on function public.merge_game_state(uuid, jsonb) to authenticated;

-- ────────────────────────────────────────────────────────────────────────────
-- RLS — game_sessions / campaign_combat / game_session_participants
-- ────────────────────────────────────────────────────────────────────────────

alter table public.game_sessions              enable row level security;
alter table public.game_session_participants  enable row level security;
alter table public.campaign_combat            enable row level security;

-- game_sessions : écriture MJ propriétaire, lecture membres de la campagne.
drop policy if exists game_sessions_owner_all on public.game_sessions;
create policy game_sessions_owner_all on public.game_sessions
  for all
  to authenticated
  using (
    exists (
      select 1 from public.campaigns c
      where c.id = game_sessions.campaign_id and c.owner_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.campaigns c
      where c.id = game_sessions.campaign_id and c.owner_id = (select auth.uid())
    )
  );

drop policy if exists game_sessions_member_read on public.game_sessions;
create policy game_sessions_member_read on public.game_sessions
  for select
  to authenticated
  using (public.is_campaign_member(campaign_id));

-- campaign_combat : écriture MJ propriétaire, lecture membres de la campagne.
drop policy if exists campaign_combat_owner_all on public.campaign_combat;
create policy campaign_combat_owner_all on public.campaign_combat
  for all
  to authenticated
  using (
    exists (
      select 1 from public.campaigns c
      where c.id = campaign_combat.campaign_id and c.owner_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.campaigns c
      where c.id = campaign_combat.campaign_id and c.owner_id = (select auth.uid())
    )
  );

drop policy if exists campaign_combat_member_read on public.campaign_combat;
create policy campaign_combat_member_read on public.campaign_combat
  for select
  to authenticated
  using (public.is_campaign_member(campaign_id));

-- game_session_participants : lecture membres de la campagne (aucune écriture
-- directe par `authenticated` — les entrées de présence seront posées par un
-- chemin dédié dans un ticket de suite : RPC `security definer` ou service role).
drop policy if exists game_session_participants_member_read on public.game_session_participants;
create policy game_session_participants_member_read on public.game_session_participants
  for select
  to authenticated
  using (
    exists (
      select 1 from public.game_sessions s
      where s.id = game_session_participants.session_id
        and public.is_campaign_member(s.campaign_id)
    )
  );

-- ────────────────────────────────────────────────────────────────────────────
-- Autorisation du canal Broadcast `session:<campaign_id>` (Supabase Realtime)
-- ────────────────────────────────────────────────────────────────────────────
-- Un client ne peut rejoindre (recevoir) ni émettre (broadcast/presence) sur le
-- canal `session:<campaign_id>` que s'il est MEMBRE de la campagne. Le nom du
-- canal (topic) est lu via `realtime.topic()` ; le `campaign_id` est le 2e segment
-- (`session:<uuid>`). Topic malformé → uuid null → `is_campaign_member(null)` =
-- false → refus. Cohérent avec la RLS actuelle où les membres lisent déjà le roster.

drop policy if exists game_session_broadcast_read on realtime.messages;
create policy game_session_broadcast_read on realtime.messages
  for select
  to authenticated
  using (
    realtime.messages.extension in ('broadcast', 'presence')
    and (select realtime.topic()) like 'session:%'
    and public.is_campaign_member(
      nullif(split_part((select realtime.topic()), ':', 2), '')::uuid
    )
  );

drop policy if exists game_session_broadcast_write on realtime.messages;
create policy game_session_broadcast_write on realtime.messages
  for insert
  to authenticated
  with check (
    realtime.messages.extension in ('broadcast', 'presence')
    and (select realtime.topic()) like 'session:%'
    and public.is_campaign_member(
      nullif(split_part((select realtime.topic()), ':', 2), '')::uuid
    )
  );
