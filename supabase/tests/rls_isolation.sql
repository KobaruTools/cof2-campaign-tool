-- Tests d'isolation RLS — socle propriétaire (PER-187)
--
-- Vérifie qu'un utilisateur ne voit/écrit QUE ses propres campagnes, joueurs et
-- personnages. À exécuter avec un rôle privilégié (éditeur SQL Supabase =
-- `postgres`, ou `psql` en service role) : le script bascule lui-même vers le
-- rôle `authenticated` pour éprouver la RLS (le superuser/propriétaire de table
-- la contourne).
--
-- Tout est enveloppé dans une transaction ROLLBACK : aucun résidu en base.
-- Un échec lève une exception via `assert` et interrompt le script.
--
-- Usage : psql "$DATABASE_URL" -f supabase/tests/rls_isolation.sql
--   (ou coller dans l'éditeur SQL Supabase).

begin;

-- ── Fixtures (rôle privilégié : RLS contournée pour préparer les données) ──
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000aa', 'mj-a@test.local'),
  ('00000000-0000-0000-0000-0000000000bb', 'mj-b@test.local');

insert into public.campaigns (id, owner_id, name) values
  ('10000000-0000-0000-0000-0000000000aa', '00000000-0000-0000-0000-0000000000aa', 'Campagne de A'),
  ('10000000-0000-0000-0000-0000000000bb', '00000000-0000-0000-0000-0000000000bb', 'Campagne de B');

insert into public.players (id, campaign_id, name) values
  ('20000000-0000-0000-0000-0000000000aa', '10000000-0000-0000-0000-0000000000aa', 'Joueur de A');

insert into public.characters (id, owner_id, campaign_id, player_id, schema_version, data) values
  ('30000000-0000-0000-0000-0000000000aa', '00000000-0000-0000-0000-0000000000aa',
   '10000000-0000-0000-0000-0000000000aa', '20000000-0000-0000-0000-0000000000aa', 16, '{}'::jsonb),
  -- Perso « Non attribué » de A (campagne nulle) : doit rester visible par A.
  ('30000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000aa',
   null, null, 16, '{}'::jsonb),
  ('30000000-0000-0000-0000-0000000000bb', '00000000-0000-0000-0000-0000000000bb',
   '10000000-0000-0000-0000-0000000000bb', null, 16, '{}'::jsonb);

-- ── Test 1 : A ne voit QUE ses données ──
set local role authenticated;
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000aa","role":"authenticated"}';

do $$
begin
  assert (select count(*) from public.campaigns)  = 1, 'A doit voir 1 campagne (la sienne)';
  assert (select count(*) from public.players)    = 1, 'A doit voir 1 joueur (le sien)';
  assert (select count(*) from public.characters) = 2, 'A doit voir ses 2 persos (dont 1 non attribué)';
  assert not exists (
    select 1 from public.campaigns where owner_id = '00000000-0000-0000-0000-0000000000bb'
  ), 'A ne doit voir AUCUNE campagne de B';
end $$;

-- ── Test 2 : B ne voit QUE ses données (pas celles de A) ──
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-0000000000bb","role":"authenticated"}';

do $$
begin
  assert (select count(*) from public.campaigns)  = 1, 'B doit voir 1 campagne (la sienne)';
  assert (select count(*) from public.players)    = 0, 'B ne doit voir aucun joueur (le joueur est chez A)';
  assert (select count(*) from public.characters) = 1, 'B doit voir 1 perso (le sien)';
  assert not exists (
    select 1 from public.characters where id = '30000000-0000-0000-0000-0000000000aa'
  ), 'B ne doit PAS voir le perso de A';
end $$;

-- ── Test 3 : B ne peut pas créer un perso au nom de A (WITH CHECK) ──
do $$
begin
  begin
    insert into public.characters (owner_id, schema_version, data)
    values ('00000000-0000-0000-0000-0000000000aa', 16, '{}'::jsonb);
    assert false, 'B ne devrait PAS pouvoir créer un perso possédé par A';
  exception
    when insufficient_privilege then null; -- attendu : violation de politique RLS
  end;
end $$;

-- ── Test 4 : B ne peut pas modifier le perso de A (ligne invisible → 0 ligne) ──
do $$
declare
  touched integer;
begin
  update public.characters set status = 'dead'
  where id = '30000000-0000-0000-0000-0000000000aa';
  get diagnostics touched = row_count;
  assert touched = 0, 'B ne devrait modifier AUCUNE ligne de A';
end $$;

reset role;

do $$ begin raise notice 'RLS isolation : tous les tests OK'; end $$;

rollback;
