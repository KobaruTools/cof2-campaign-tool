-- Tests RLS — socle de la session de table synchronisée (PER-263)
--
-- Éprouve la migration 0012 : tables `game_sessions` / `game_session_participants`
-- / `campaign_combat` (écriture MJ, lecture membres) et la RPC `merge_game_state`
-- (fusionne l'état de jeu SANS toucher `version` ni écraser la construction ;
-- rejette un appelant non autorisé).
--
-- Même protocole que `rls_player_isolation.sql` : fixtures en rôle privilégié,
-- bascule vers `authenticated` + `request.jwt.claims` pour éprouver la RLS, le
-- tout en transaction ROLLBACK. Un échec lève via `assert`.
--
-- Prérequis : migrations 0001, 0002 et 0012 appliquées.
-- Usage : psql "$DATABASE_URL" -f supabase/tests/rls_game_session.sql

begin;

-- ── Fixtures (rôle privilégié : RLS contournée) ──
insert into auth.users (id, email) values
  ('a0000000-0000-0000-0000-0000000000aa', 'mj-a@test.local'),
  ('a0000000-0000-0000-0000-0000000000bb', 'mj-b@test.local');

insert into public.campaigns (id, owner_id, name) values
  ('c0000000-0000-0000-0000-0000000000aa', 'a0000000-0000-0000-0000-0000000000aa', 'Campagne de A'),
  ('c0000000-0000-0000-0000-0000000000bb', 'a0000000-0000-0000-0000-0000000000bb', 'Campagne de B');

insert into public.players (id, campaign_id, name) values
  ('b0000000-0000-0000-0000-0000000000a1', 'c0000000-0000-0000-0000-0000000000aa', 'Joueur A1'),
  ('b0000000-0000-0000-0000-0000000000a2', 'c0000000-0000-0000-0000-0000000000aa', 'Joueur A2'),
  ('b0000000-0000-0000-0000-0000000000b1', 'c0000000-0000-0000-0000-0000000000bb', 'Joueur B1');

-- Fiche du joueur A1 : construction (characteristics) + état de jeu (depletion) +
-- une monture possédée (id m1) pour éprouver la fusion fine des PV.
insert into public.characters (id, owner_id, campaign_id, player_id, schema_version, data) values
  ('d0000000-0000-0000-0000-0000000000a1', 'a0000000-0000-0000-0000-0000000000aa',
   'c0000000-0000-0000-0000-0000000000aa', 'b0000000-0000-0000-0000-0000000000a1', 21,
   '{"characteristics":{"FOR":2},"depletion":{"mana":1},"mounts":[{"id":"m1","catalogId":"cheval-de-guerre","name":"Bucéphale","hp":{}}]}'::jsonb),
  -- Fiche d'un colistier (joueur A2) : A1 ne doit PAS pouvoir la merger.
  ('d0000000-0000-0000-0000-0000000000a2', 'a0000000-0000-0000-0000-0000000000aa',
   'c0000000-0000-0000-0000-0000000000aa', 'b0000000-0000-0000-0000-0000000000a2', 21, '{}'::jsonb);

-- Session active + état de combat + une présence, sur la campagne A.
insert into public.game_sessions (id, campaign_id) values
  ('f0000000-0000-0000-0000-0000000000aa', 'c0000000-0000-0000-0000-0000000000aa');

insert into public.campaign_combat (campaign_id, state) values
  ('c0000000-0000-0000-0000-0000000000aa', '{}'::jsonb);

insert into public.game_session_participants (session_id, player_id) values
  ('f0000000-0000-0000-0000-0000000000aa', 'b0000000-0000-0000-0000-0000000000a1');

-- ════════════════════════════════════════════════════════════════════════════
-- Test 1 : un joueur d'une AUTRE campagne (B1) ne lit NI session, NI combat,
--          NI participants de la campagne A.
-- ════════════════════════════════════════════════════════════════════════════
set local role authenticated;
set local request.jwt.claims to '{"sub":"e0000000-0000-0000-0000-0000000000b1","role":"authenticated","app_metadata":{"player_id":"b0000000-0000-0000-0000-0000000000b1","campaign_id":"c0000000-0000-0000-0000-0000000000bb"}}';

do $$
begin
  assert (select count(*) from public.game_sessions)             = 0, 'B1 ne doit voir AUCUNE session de A';
  assert (select count(*) from public.campaign_combat)           = 0, 'B1 ne doit voir AUCUN combat de A';
  assert (select count(*) from public.game_session_participants) = 0, 'B1 ne doit voir AUCUN participant de A';
end $$;

-- ════════════════════════════════════════════════════════════════════════════
-- Test 2 : un joueur MEMBRE (A1) LIT session/combat/participants, mais N'ÉCRIT PAS.
-- ════════════════════════════════════════════════════════════════════════════
set local request.jwt.claims to '{"sub":"e0000000-0000-0000-0000-0000000000a1","role":"authenticated","app_metadata":{"player_id":"b0000000-0000-0000-0000-0000000000a1","campaign_id":"c0000000-0000-0000-0000-0000000000aa"}}';

do $$
declare touched integer;
begin
  -- Lecture : membre → voit les 3.
  assert (select count(*) from public.game_sessions)             = 1, 'A1 doit voir la session de sa campagne';
  assert (select count(*) from public.campaign_combat)           = 1, 'A1 doit voir le combat de sa campagne';
  assert (select count(*) from public.game_session_participants) = 1, 'A1 doit voir la présence de sa campagne';

  -- Écriture session : aucune policy d'écriture membre → 0 ligne.
  update public.game_sessions set last_active_at = now()
    where id = 'f0000000-0000-0000-0000-0000000000aa';
  get diagnostics touched = row_count;
  assert touched = 0, 'A1 (membre) ne doit PAS pouvoir écrire la session';

  -- Écriture combat : aucune policy d'écriture membre → 0 ligne.
  update public.campaign_combat set state = '{"x":1}'::jsonb
    where campaign_id = 'c0000000-0000-0000-0000-0000000000aa';
  get diagnostics touched = row_count;
  assert touched = 0, 'A1 (membre) ne doit PAS pouvoir écrire le combat';

  -- Insertion combat : refusée par la RLS (aucune policy INSERT membre).
  begin
    insert into public.campaign_combat (campaign_id, state)
      values ('c0000000-0000-0000-0000-0000000000bb', '{}'::jsonb);
    assert false, 'A1 (membre) ne doit PAS pouvoir insérer un combat';
  exception when insufficient_privilege then null; -- attendu
  end;
end $$;

-- ════════════════════════════════════════════════════════════════════════════
-- Test 3 : le MJ propriétaire (A) ÉCRIT session et combat.
-- ════════════════════════════════════════════════════════════════════════════
-- `is_anonymous:false` : la propriété est réservée aux vrais comptes (migration
-- 0003, `is_anonymous()` fail-safe). Un vrai JWT MJ signé porte ce claim.
set local request.jwt.claims to '{"sub":"a0000000-0000-0000-0000-0000000000aa","role":"authenticated","is_anonymous":false}';

do $$
declare touched integer;
begin
  update public.game_sessions set last_active_at = now()
    where id = 'f0000000-0000-0000-0000-0000000000aa';
  get diagnostics touched = row_count;
  assert touched = 1, 'Le MJ doit pouvoir écrire la session';

  update public.campaign_combat set state = '{"turn":1}'::jsonb
    where campaign_id = 'c0000000-0000-0000-0000-0000000000aa';
  get diagnostics touched = row_count;
  assert touched = 1, 'Le MJ doit pouvoir écrire le combat';

  -- Le MJ peut clore la session (write) — respecte le check de cohérence.
  update public.game_sessions
    set ended_at = now(), ended_reason = 'gm'
    where id = 'f0000000-0000-0000-0000-0000000000aa';
  get diagnostics touched = row_count;
  assert touched = 1, 'Le MJ doit pouvoir clore la session';
end $$;

-- ════════════════════════════════════════════════════════════════════════════
-- Test 4 : `merge_game_state` (MJ A) fusionne l'état de jeu SANS toucher `version`
--          ni écraser la construction ; monture fusionnée finement par id.
-- ════════════════════════════════════════════════════════════════════════════
do $$
declare
  v_before integer;
  v_after  integer;
  d        jsonb;
begin
  select version into v_before from public.characters
    where id = 'd0000000-0000-0000-0000-0000000000a1';

  -- Patch : depletion (état de jeu, remplacé), characteristics (CONSTRUCTION →
  -- doit être IGNORÉE), mounts (m1 mis à jour, id inconnu « ghost » ignoré).
  perform public.merge_game_state(
    'd0000000-0000-0000-0000-0000000000a1',
    '{"depletion":{"mana":3},"characteristics":{"HACK":true},"mounts":[{"id":"m1","hp":{"hp":{"lethal":5}}},{"id":"ghost","hp":{"hp":{"lethal":99}}}]}'::jsonb
  );

  select version, data into v_after, d from public.characters
    where id = 'd0000000-0000-0000-0000-0000000000a1';

  -- `version` (verrou de construction) NON incrémenté.
  assert v_after = v_before, 'merge_game_state ne doit PAS incrémenter version';

  -- État de jeu appliqué.
  assert d -> 'depletion' ->> 'mana' = '3', 'depletion.mana doit valoir 3 (état de jeu appliqué)';

  -- Construction NON écrasée : characteristics d'origine préservée, clé HACK absente.
  assert d -> 'characteristics' ->> 'FOR' = '2', 'characteristics.FOR d''origine doit être préservée';
  assert not (d -> 'characteristics' ? 'HACK'), 'la clé de construction du patch doit être IGNORÉE';

  -- Monture : hp de m1 remplacé, construction préservée, aucun ajout de monture.
  assert jsonb_array_length(d -> 'mounts') = 1, 'aucune monture ajoutée via l''état de jeu (ghost ignoré)';
  assert d -> 'mounts' -> 0 -> 'hp' -> 'hp' ->> 'lethal' = '5', 'hp de la monture m1 doit être fusionné';
  assert d -> 'mounts' -> 0 ->> 'catalogId' = 'cheval-de-guerre', 'catalogId (construction) de la monture préservé';
  assert d -> 'mounts' -> 0 ->> 'name' = 'Bucéphale', 'name (construction) de la monture préservé';
end $$;

-- ════════════════════════════════════════════════════════════════════════════
-- Test 5 : `merge_game_state` — autorisation.
--   5a. Le joueur A1 merge SA propre fiche : OK.
--   5b. Le joueur A1 sur la fiche d'un colistier (A2) : REJET.
--   5c. Un joueur d'une autre campagne (B1) sur une fiche de A : REJET.
-- ════════════════════════════════════════════════════════════════════════════
set local request.jwt.claims to '{"sub":"e0000000-0000-0000-0000-0000000000a1","role":"authenticated","app_metadata":{"player_id":"b0000000-0000-0000-0000-0000000000a1","campaign_id":"c0000000-0000-0000-0000-0000000000aa"}}';

do $$
declare d jsonb;
begin
  -- 5a : A1 sur sa fiche → autorisé.
  d := public.merge_game_state(
    'd0000000-0000-0000-0000-0000000000a1',
    '{"usageCounters":{"rage":1}}'::jsonb
  );
  assert d -> 'usageCounters' ->> 'rage' = '1', 'A1 doit pouvoir merger SA fiche';

  -- 5b : A1 sur la fiche du colistier A2 → rejet.
  begin
    perform public.merge_game_state(
      'd0000000-0000-0000-0000-0000000000a2',
      '{"usageCounters":{"rage":1}}'::jsonb
    );
    assert false, 'A1 ne doit PAS pouvoir merger la fiche d''un colistier';
  exception when insufficient_privilege then null; -- attendu (errcode 42501)
  end;
end $$;

set local request.jwt.claims to '{"sub":"e0000000-0000-0000-0000-0000000000b1","role":"authenticated","app_metadata":{"player_id":"b0000000-0000-0000-0000-0000000000b1","campaign_id":"c0000000-0000-0000-0000-0000000000bb"}}';

do $$
begin
  -- 5c : joueur d'une autre campagne sur une fiche de A → rejet.
  begin
    perform public.merge_game_state(
      'd0000000-0000-0000-0000-0000000000a1',
      '{"usageCounters":{"rage":9}}'::jsonb
    );
    assert false, 'B1 ne doit PAS pouvoir merger une fiche de la campagne A';
  exception when insufficient_privilege then null; -- attendu
  end;
end $$;

reset role;

do $$ begin raise notice 'RLS session synchronisée (PER-263) : tous les tests OK'; end $$;

rollback;
