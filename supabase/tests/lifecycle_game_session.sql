-- Tests — cycle de vie de la session de table synchronisée (PER-264)
--
-- Éprouve la migration 0013 : les RPC `resolve_active_session` (gate + fermeture
-- paresseuse : 3 filets) et `touch_game_session` (battement), toutes deux
-- `security definer` gatées par `is_campaign_member`.
--
-- Même protocole que `rls_game_session.sql` : fixtures en rôle privilégié, bascule
-- vers `authenticated` + `request.jwt.claims`, le tout en transaction ROLLBACK. Un
-- échec lève via `assert`. `is_anonymous:false` pour le MJ (propriété réservée aux
-- vrais comptes, migration 0003).
--
-- Prérequis : migrations 0001, 0002, 0012 et 0013 appliquées.
-- Usage : psql "$DATABASE_URL" -f supabase/tests/lifecycle_game_session.sql

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
  ('b0000000-0000-0000-0000-0000000000b1', 'c0000000-0000-0000-0000-0000000000bb', 'Joueur B1');

-- ════════════════════════════════════════════════════════════════════════════
-- Test 1 : le MJ A démarre (écriture directe), puis le gate renvoie la session.
-- ════════════════════════════════════════════════════════════════════════════
set local role authenticated;
set local request.jwt.claims to '{"sub":"a0000000-0000-0000-0000-0000000000aa","role":"authenticated","is_anonymous":false}';

do $$
declare rows integer;
begin
  -- Aucune session → gate renvoie 0 ligne.
  select count(*) into rows from public.resolve_active_session('c0000000-0000-0000-0000-0000000000aa');
  assert rows = 0, 'gate sans session doit renvoyer 0 ligne';

  -- Démarrer (écriture directe MJ, RLS 0012).
  insert into public.game_sessions (id, campaign_id)
    values ('f0000000-0000-0000-0000-0000000000aa', 'c0000000-0000-0000-0000-0000000000aa');

  -- Session fraîche → gate renvoie 1 ligne active.
  select count(*) into rows from public.resolve_active_session('c0000000-0000-0000-0000-0000000000aa');
  assert rows = 1, 'gate session fraîche doit renvoyer 1 ligne';
end $$;

-- ════════════════════════════════════════════════════════════════════════════
-- Test 2 : filet VIDE — `last_active_at` périmé (> 5 min) → close 'empty', gate 0.
-- ════════════════════════════════════════════════════════════════════════════
do $$
declare rows integer; reason text; closed boolean;
begin
  update public.game_sessions set last_active_at = now() - interval '6 minutes'
    where id = 'f0000000-0000-0000-0000-0000000000aa';

  select count(*) into rows from public.resolve_active_session('c0000000-0000-0000-0000-0000000000aa');
  assert rows = 0, 'gate sur session périmée doit renvoyer 0 ligne (close paresseuse)';

  select ended_reason, (ended_at is not null) into reason, closed
    from public.game_sessions where id = 'f0000000-0000-0000-0000-0000000000aa';
  assert closed, 'la session périmée doit être close';
  assert reason = 'empty', 'ended_reason doit valoir empty';
end $$;

-- ════════════════════════════════════════════════════════════════════════════
-- Test 3 : filet PLAFOND — `started_at` > 12 h → close 'expired', gate 0.
-- ════════════════════════════════════════════════════════════════════════════
do $$
declare rows integer; reason text;
begin
  insert into public.game_sessions (id, campaign_id, started_at)
    values ('f0000000-0000-0000-0000-0000000000bb', 'c0000000-0000-0000-0000-0000000000aa',
            now() - interval '13 hours');

  select count(*) into rows from public.resolve_active_session('c0000000-0000-0000-0000-0000000000aa');
  assert rows = 0, 'gate sur session > 12 h doit renvoyer 0 ligne (close paresseuse)';

  select ended_reason into reason
    from public.game_sessions where id = 'f0000000-0000-0000-0000-0000000000bb';
  assert reason = 'expired', 'ended_reason doit valoir expired';
end $$;

-- ════════════════════════════════════════════════════════════════════════════
-- Test 4 : battement — `touch_game_session` rafraîchit `last_active_at` et
--          garde la session vivante (le gate la renvoie encore).
-- ════════════════════════════════════════════════════════════════════════════
do $$
declare rows integer; fresh boolean;
begin
  insert into public.game_sessions (id, campaign_id, last_active_at)
    values ('f0000000-0000-0000-0000-0000000000cc', 'c0000000-0000-0000-0000-0000000000aa',
            now() - interval '4 minutes');

  perform public.touch_game_session('c0000000-0000-0000-0000-0000000000aa');

  select (last_active_at > now() - interval '10 seconds') into fresh
    from public.game_sessions where id = 'f0000000-0000-0000-0000-0000000000cc';
  assert fresh, 'le battement doit rafraîchir last_active_at';

  select count(*) into rows from public.resolve_active_session('c0000000-0000-0000-0000-0000000000aa');
  assert rows = 1, 'après battement, la session reste active pour le gate';
end $$;

-- ════════════════════════════════════════════════════════════════════════════
-- Test 5 : un MEMBRE joueur (A1) peut résoudre et battre (security definer).
-- ════════════════════════════════════════════════════════════════════════════
set local request.jwt.claims to '{"sub":"e0000000-0000-0000-0000-0000000000a1","role":"authenticated","app_metadata":{"player_id":"b0000000-0000-0000-0000-0000000000a1","campaign_id":"c0000000-0000-0000-0000-0000000000aa"}}';

do $$
declare rows integer;
begin
  select count(*) into rows from public.resolve_active_session('c0000000-0000-0000-0000-0000000000aa');
  assert rows = 1, 'un joueur membre doit pouvoir résoudre la session active';
  perform public.touch_game_session('c0000000-0000-0000-0000-0000000000aa'); -- ne lève pas
end $$;

-- ════════════════════════════════════════════════════════════════════════════
-- Test 6 : un NON-MEMBRE (MJ B / joueur B1) est refusé (errcode 42501) sur les
--          deux RPC — il ne peut ni clore, ni battre la session d'une autre table.
-- ════════════════════════════════════════════════════════════════════════════
set local request.jwt.claims to '{"sub":"a0000000-0000-0000-0000-0000000000bb","role":"authenticated","is_anonymous":false}';

do $$
begin
  begin
    perform public.resolve_active_session('c0000000-0000-0000-0000-0000000000aa');
    assert false, 'MJ B (non membre) ne doit PAS pouvoir résoudre la session de A';
  exception when insufficient_privilege then null; end; -- attendu (42501)

  begin
    perform public.touch_game_session('c0000000-0000-0000-0000-0000000000aa');
    assert false, 'MJ B (non membre) ne doit PAS pouvoir battre la session de A';
  exception when insufficient_privilege then null; end;
end $$;

set local request.jwt.claims to '{"sub":"e0000000-0000-0000-0000-0000000000b1","role":"authenticated","app_metadata":{"player_id":"b0000000-0000-0000-0000-0000000000b1","campaign_id":"c0000000-0000-0000-0000-0000000000bb"}}';

do $$
begin
  begin
    perform public.resolve_active_session('c0000000-0000-0000-0000-0000000000aa');
    assert false, 'joueur B1 (autre campagne) ne doit PAS pouvoir résoudre la session de A';
  exception when insufficient_privilege then null; end;
end $$;

reset role;

do $$ begin raise notice 'Cycle de vie session synchronisée (PER-264) : tous les tests OK'; end $$;

rollback;
