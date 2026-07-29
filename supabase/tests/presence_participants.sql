-- Tests — journal de présence de session (PER-265)
--
-- Éprouve la migration 0014 : les RPC `session_participant_join` /
-- `session_participant_leave`, `security definer` gatées par `is_campaign_member`,
-- qui posent/ferment une entrée de `game_session_participants` avec l'identité
-- (`player_id`) dérivée du JWT côté serveur.
--
-- Même protocole que `lifecycle_game_session.sql` : fixtures en rôle privilégié,
-- bascule vers `authenticated` + `request.jwt.claims`, transaction ROLLBACK, échec
-- via `assert`. `is_anonymous:false` pour le MJ (propriété réservée aux vrais comptes,
-- migration 0003).
--
-- Prérequis : migrations 0001, 0002, 0012, 0013 et 0014 appliquées.
-- Usage : psql "$DATABASE_URL" -f supabase/tests/presence_participants.sql

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

-- Session active de la campagne A (écriture directe, rôle privilégié ici).
insert into public.game_sessions (id, campaign_id)
  values ('f0000000-0000-0000-0000-0000000000aa', 'c0000000-0000-0000-0000-0000000000aa');

-- ════════════════════════════════════════════════════════════════════════════
-- Test 1 : le MJ A journalise son entrée → une ligne avec `player_id` NULL (= MJ),
--          `left_at` nul. Puis sa fermeture pose `left_at`.
-- ════════════════════════════════════════════════════════════════════════════
set local role authenticated;
set local request.jwt.claims to '{"sub":"a0000000-0000-0000-0000-0000000000aa","role":"authenticated","is_anonymous":false}';

do $$
declare pid uuid; pl uuid; closed boolean;
begin
  pid := public.session_participant_join('c0000000-0000-0000-0000-0000000000aa');
  assert pid is not null, 'le MJ membre doit obtenir une entrée de présence';

  select player_id, (left_at is not null) into pl, closed
    from public.game_session_participants where id = pid;
  assert pl is null, 'l''entrée du MJ doit avoir player_id NULL';
  assert not closed, 'l''entrée fraîche ne doit pas être fermée';

  perform public.session_participant_leave(pid);
  select (left_at is not null) into closed
    from public.game_session_participants where id = pid;
  assert closed, 'la fermeture doit poser left_at';

  -- Idempotence : refermer ne relève pas et reste fermé.
  perform public.session_participant_leave(pid);
  select (left_at is not null) into closed
    from public.game_session_participants where id = pid;
  assert closed, 'refermer une entrée déjà fermée reste un no-op fermé';
end $$;

-- ════════════════════════════════════════════════════════════════════════════
-- Test 2 : un joueur membre (A1) journalise → `player_id` = son id (dérivé du JWT,
--          pas de l'appelant).
-- ════════════════════════════════════════════════════════════════════════════
set local request.jwt.claims to '{"sub":"e0000000-0000-0000-0000-0000000000a1","role":"authenticated","app_metadata":{"player_id":"b0000000-0000-0000-0000-0000000000a1","campaign_id":"c0000000-0000-0000-0000-0000000000aa"}}';

do $$
declare pid uuid; pl uuid;
begin
  pid := public.session_participant_join('c0000000-0000-0000-0000-0000000000aa');
  assert pid is not null, 'le joueur membre doit obtenir une entrée';
  select player_id into pl from public.game_session_participants where id = pid;
  assert pl = 'b0000000-0000-0000-0000-0000000000a1',
    'l''entrée du joueur doit porter SON player_id (dérivé du JWT)';
end $$;

-- ════════════════════════════════════════════════════════════════════════════
-- Test 3 : sans session active, l'entrée renvoie NULL (rien à journaliser).
-- ════════════════════════════════════════════════════════════════════════════
set local request.jwt.claims to '{"sub":"a0000000-0000-0000-0000-0000000000bb","role":"authenticated","is_anonymous":false}';

do $$
declare pid uuid;
begin
  -- Campagne B : aucune session active.
  pid := public.session_participant_join('c0000000-0000-0000-0000-0000000000bb');
  assert pid is null, 'sans session active, session_participant_join doit renvoyer NULL';
end $$;

-- ════════════════════════════════════════════════════════════════════════════
-- Test 4 : un NON-MEMBRE (MJ B) est refusé (errcode 42501) sur l'entrée de A.
-- ════════════════════════════════════════════════════════════════════════════
do $$
begin
  begin
    perform public.session_participant_join('c0000000-0000-0000-0000-0000000000aa');
    assert false, 'MJ B (non membre) ne doit PAS pouvoir journaliser sur la table de A';
  exception when insufficient_privilege then null; end; -- attendu (42501)
end $$;

-- ════════════════════════════════════════════════════════════════════════════
-- Test 5 : un non-membre ne peut pas fermer l'entrée d'autrui (no-op silencieux :
--          la garde `is_campaign_member` du UPDATE ne matche aucune ligne).
-- ════════════════════════════════════════════════════════════════════════════
-- Entrée OUVERTE d'id fixe sur la session de A (rôle privilégié : RLS contournée).
reset role;
insert into public.game_session_participants (id, session_id, player_id)
  values ('d0000000-0000-0000-0000-0000000000aa', 'f0000000-0000-0000-0000-0000000000aa', null);

-- Le non-membre B1 tente de la fermer.
set local role authenticated;
set local request.jwt.claims to '{"sub":"e0000000-0000-0000-0000-0000000000b1","role":"authenticated","app_metadata":{"player_id":"b0000000-0000-0000-0000-0000000000b1","campaign_id":"c0000000-0000-0000-0000-0000000000bb"}}';
select public.session_participant_leave('d0000000-0000-0000-0000-0000000000aa'); -- ne lève pas, mais no-op

-- Vérification en rôle privilégié (le non-membre ne peut de toute façon pas la lire).
reset role;
do $$
declare closed boolean;
begin
  select (left_at is not null) into closed
    from public.game_session_participants where id = 'd0000000-0000-0000-0000-0000000000aa';
  assert not closed, 'un non-membre ne doit PAS pouvoir fermer l''entrée d''une autre table';
end $$;

do $$ begin raise notice 'Journal de présence session synchronisée (PER-265) : tous les tests OK'; end $$;

rollback;
