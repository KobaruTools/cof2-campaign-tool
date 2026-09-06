-- Tests d'isolation RLS — suivi soumetteur ↔ ticket Linear (PER-507)
--
-- Éprouve la migration 0044 : un soumetteur (compte réel OU joueur anonyme) ne
-- voit que ses propres lignes `feedback_submissions`, jamais celles d'un autre
-- soumetteur. Cas clé : une Identité joueur qui possède PLUSIEURS `player_id`
-- (PER-498/499, multi-appartenance) voit ses tickets soumis sous CHACUN
-- d'entre eux, même si son claim JWT actif ne pointe que sur l'un des deux —
-- l'autorité est `player_auth_sessions`, pas le claim (docs/adr/0003).
--
-- Même protocole que `rls_player_isolation.sql` : rôle privilégié pour les
-- fixtures, bascule vers `authenticated` + `request.jwt.claims` pour éprouver
-- la RLS, le tout en transaction ROLLBACK. Un échec lève via `assert`.
--
-- Usage : psql "$DATABASE_URL" -f supabase/tests/rls_feedback_submissions.sql

begin;

-- ── Fixtures (rôle privilégié : RLS contournée) ──
insert into auth.users (id, email) values
  ('f0000000-0000-0000-0000-000000000001', 'owner-a@test.local'),
  ('f0000000-0000-0000-0000-000000000002', 'owner-b@test.local'),
  ('e0000000-0000-0000-0000-0000000000a1', null); -- Identité anonyme (joueur), pas d'email

insert into public.campaigns (id, owner_id, name) values
  ('c0000000-0000-0000-0000-000000000f01', 'f0000000-0000-0000-0000-000000000001', 'Campagne A'),
  ('c0000000-0000-0000-0000-000000000f02', 'f0000000-0000-0000-0000-000000000001', 'Campagne D');

-- p1 et p2 sont DEUX joueurs distincts (locaux chacun à leur campagne), mais
-- possédés par la MÊME Identité anonyme (multi-appartenance PER-498/499).
-- P99 : joueur existant qu'aucun test n'attribue à l'Identité X (sert au test 5).
insert into public.players (id, campaign_id, name) values
  ('b0000000-0000-0000-0000-0000000000c1', 'c0000000-0000-0000-0000-000000000f01', 'Joueur P1'),
  ('b0000000-0000-0000-0000-0000000000c2', 'c0000000-0000-0000-0000-000000000f02', 'Joueur P2'),
  ('b0000000-0000-0000-0000-0000000000c9', 'c0000000-0000-0000-0000-000000000f02', 'Joueur P99');

insert into public.player_auth_sessions (auth_user_id, player_id) values
  ('e0000000-0000-0000-0000-0000000000a1', 'b0000000-0000-0000-0000-0000000000c1'),
  ('e0000000-0000-0000-0000-0000000000a1', 'b0000000-0000-0000-0000-0000000000c2');

insert into public.feedback_submissions (id, owner_user_id, player_id, linear_issue_id, linear_issue_url) values
  ('a0000000-0000-0000-0000-0000000000d1', 'f0000000-0000-0000-0000-000000000001', null, 'issue-a', 'https://linear.app/issue-a'),
  ('a0000000-0000-0000-0000-0000000000d2', 'f0000000-0000-0000-0000-000000000002', null, 'issue-b', 'https://linear.app/issue-b'),
  ('a0000000-0000-0000-0000-0000000000d3', null, 'b0000000-0000-0000-0000-0000000000c1', 'issue-p1', 'https://linear.app/issue-p1'),
  ('a0000000-0000-0000-0000-0000000000d4', null, 'b0000000-0000-0000-0000-0000000000c2', 'issue-p2', 'https://linear.app/issue-p2');

-- ── Session PROPRIÉTAIRE (owner-a) ──
set local role authenticated;
set local request.jwt.claims to '{"sub":"f0000000-0000-0000-0000-000000000001","role":"authenticated"}';

-- Test 1 : owner-a ne voit que SON ticket, jamais celui de owner-b ni des joueurs.
do $$
begin
  assert (select count(*) from public.feedback_submissions) = 1,
    'owner-a doit voir exactement 1 ligne (la sienne)';
  assert exists (select 1 from public.feedback_submissions where id = 'a0000000-0000-0000-0000-0000000000d1'),
    'owner-a doit voir son propre ticket';
  assert not exists (select 1 from public.feedback_submissions where id = 'a0000000-0000-0000-0000-0000000000d2'),
    'owner-a ne doit PAS voir le ticket de owner-b';
end $$;

-- Test 2 : owner-a insère sous son propre owner_user_id, pas sous celui d'un autre.
do $$
begin
  insert into public.feedback_submissions (owner_user_id, linear_issue_id, linear_issue_url)
    values ('f0000000-0000-0000-0000-000000000001', 'issue-a-2', 'https://linear.app/issue-a-2');

  begin
    insert into public.feedback_submissions (owner_user_id, linear_issue_id, linear_issue_url)
      values ('f0000000-0000-0000-0000-000000000002', 'issue-usurpe', 'https://linear.app/issue-usurpe');
    assert false, 'owner-a ne devrait PAS pouvoir insérer une ligne au nom de owner-b';
  exception
    when others then null; -- attendu : violation RLS
  end;
end $$;

-- ── Session JOUEUR — Identité liée à P1 ET P2, claim ACTIF = P1 seulement ──
set local request.jwt.claims to '{"sub":"e0000000-0000-0000-0000-0000000000a1","role":"authenticated","app_metadata":{"player_id":"b0000000-0000-0000-0000-0000000000c1","campaign_id":"c0000000-0000-0000-0000-000000000f01"}}';

-- Test 3 : l'Identité voit ses tickets soumis sous P1 ET P2 (autorité = table,
-- pas le claim actif qui ne mentionne que P1) — jamais ceux des propriétaires.
do $$
begin
  assert (select count(*) from public.feedback_submissions) = 2,
    'L''Identité doit voir ses 2 tickets (soumis sous P1 et sous P2)';
  assert exists (select 1 from public.feedback_submissions where id = 'a0000000-0000-0000-0000-0000000000d3'),
    'Doit voir le ticket soumis sous P1 (claim actif)';
  assert exists (select 1 from public.feedback_submissions where id = 'a0000000-0000-0000-0000-0000000000d4'),
    'Doit voir le ticket soumis sous P2 (membership non-actif, table fait autorité)';
  assert not exists (select 1 from public.feedback_submissions where id = 'a0000000-0000-0000-0000-0000000000d1'),
    'Ne doit PAS voir le ticket de owner-a';
end $$;

-- Test 4 : l'Identité insère sous P1 (claim actif) ET sous P2 (membership non-actif) — les deux lui appartiennent.
do $$
begin
  insert into public.feedback_submissions (player_id, linear_issue_id, linear_issue_url)
    values ('b0000000-0000-0000-0000-0000000000c1', 'issue-p1-2', 'https://linear.app/issue-p1-2');
  insert into public.feedback_submissions (player_id, linear_issue_id, linear_issue_url)
    values ('b0000000-0000-0000-0000-0000000000c2', 'issue-p2-2', 'https://linear.app/issue-p2-2');
end $$;

-- Test 5 : l'Identité ne peut PAS insérer au nom d'un joueur qu'elle ne possède pas.
do $$
begin
  begin
    insert into public.feedback_submissions (player_id, linear_issue_id, linear_issue_url)
      values ('b0000000-0000-0000-0000-0000000000c9', 'issue-usurpe-2', 'https://linear.app/issue-usurpe-2');
    assert false, 'L''Identité ne devrait PAS pouvoir insérer au nom d''un joueur qu''elle ne possède pas';
  exception
    when others then null; -- attendu : violation RLS
  end;
end $$;

-- ── Anonyme SANS claims (lien non échangé) : ne voit/écrit rien ──
set local request.jwt.claims to '{"sub":"e0000000-0000-0000-0000-00000000dead","role":"authenticated"}';

do $$
begin
  assert (select count(*) from public.feedback_submissions) = 0,
    'Anon sans claims : aucune ligne visible';

  begin
    insert into public.feedback_submissions (owner_user_id, linear_issue_id, linear_issue_url)
      values ('f0000000-0000-0000-0000-000000000001', 'issue-anon', 'https://linear.app/issue-anon');
    assert false, 'Anon sans claims ne devrait rien pouvoir insérer au nom d''un autre compte';
  exception
    when others then null; -- attendu : violation RLS (auth.uid() != owner_user_id posé)
  end;
end $$;

reset role;

do $$ begin raise notice 'RLS feedback_submissions (PER-507) : tous les tests OK'; end $$;

rollback;
