-- Tests d'isolation RLS — réclamation d'une fiche par un JOUEUR (PER-196)
--
-- Éprouve la migration 0004 : un joueur (utilisateur anonyme portant
-- `app_metadata.player_id` + `campaign_id`) peut RÉCLAMER une fiche NON attribuée
-- de SA campagne (`player_id` null → soi), mais ne peut ni voler une fiche déjà
-- prise, ni « rendre » la sienne, ni déplacer `owner_id`/`campaign_id`, ni
-- réclamer un pré-tiré d'une AUTRE campagne.
--
-- Même protocole que `rls_player_isolation.sql` : rôle privilégié pour les
-- fixtures, bascule vers `authenticated` + `request.jwt.claims` pour éprouver la
-- RLS, le tout en transaction ROLLBACK. Un échec lève via `assert`.
--
-- Usage : psql "$DATABASE_URL" -f supabase/tests/rls_player_claim.sql

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

-- Fiches (ids en hexadécimal valide) :
--  d0…00f0 « a-free »  : pré-tiré NON attribué de la campagne A (réclamable par A1).
--  d0…00a2 « a-taken » : fiche de la campagne A déjà attribuée à A2 (non volable).
--  d0…00a1 « a-mine »  : fiche déjà attribuée à A1 (interdiction de « rendre »).
--  d0…00b0 « b-free »  : pré-tiré NON attribué de la campagne B (hors de portée de A1).
insert into public.characters (id, owner_id, campaign_id, player_id, schema_version, data) values
  ('d0000000-0000-0000-0000-0000000000f0', 'a0000000-0000-0000-0000-0000000000aa',
   'c0000000-0000-0000-0000-0000000000aa', null, 16, '{}'::jsonb),
  ('d0000000-0000-0000-0000-0000000000a2', 'a0000000-0000-0000-0000-0000000000aa',
   'c0000000-0000-0000-0000-0000000000aa', 'b0000000-0000-0000-0000-0000000000a2', 16, '{}'::jsonb),
  ('d0000000-0000-0000-0000-0000000000a1', 'a0000000-0000-0000-0000-0000000000aa',
   'c0000000-0000-0000-0000-0000000000aa', 'b0000000-0000-0000-0000-0000000000a1', 16, '{}'::jsonb),
  ('d0000000-0000-0000-0000-0000000000b0', 'a0000000-0000-0000-0000-0000000000bb',
   'c0000000-0000-0000-0000-0000000000bb', null, 16, '{}'::jsonb);

-- ── Session JOUEUR A1 (utilisateur anonyme + claims scopés) ──
set local role authenticated;
set local request.jwt.claims to '{"sub":"e0000000-0000-0000-0000-0000000000a1","role":"authenticated","app_metadata":{"player_id":"b0000000-0000-0000-0000-0000000000a1","campaign_id":"c0000000-0000-0000-0000-0000000000aa"}}';

-- Test 1 : A1 RÉCLAME un pré-tiré non attribué de sa campagne (null → soi).
do $$
declare touched integer; new_player uuid;
begin
  update public.characters
    set player_id = 'b0000000-0000-0000-0000-0000000000a1'
    where id = 'd0000000-0000-0000-0000-0000000000f0';
  get diagnostics touched = row_count;
  assert touched = 1, 'A1 doit pouvoir réclamer une fiche non attribuée de sa campagne';
  select player_id into new_player from public.characters
    where id = 'd0000000-0000-0000-0000-0000000000f0';
  assert new_player = 'b0000000-0000-0000-0000-0000000000a1',
    'La fiche réclamée doit désormais appartenir à A1';
end $$;

-- Test 2 : A1 ne peut PAS voler une fiche déjà attribuée à A2 (USING ne matche pas).
do $$
declare touched integer; owner_player uuid;
begin
  update public.characters
    set player_id = 'b0000000-0000-0000-0000-0000000000a1'
    where id = 'd0000000-0000-0000-0000-0000000000a2';
  get diagnostics touched = row_count;
  assert touched = 0, 'A1 ne doit PAS pouvoir voler la fiche attribuée à A2';
  -- A1 voit la fiche en lecture (roster) : elle reste attribuée à A2.
  select player_id into owner_player from public.characters
    where id = 'd0000000-0000-0000-0000-0000000000a2';
  assert owner_player = 'b0000000-0000-0000-0000-0000000000a2',
    'La fiche de A2 doit rester attribuée à A2';
end $$;

-- Test 3 : A1 ne peut PAS « rendre » sa propre fiche (soi → null : le trigger gèle).
do $$
declare still_player uuid;
begin
  update public.characters
    set player_id = null
    where id = 'd0000000-0000-0000-0000-0000000000a1';
  select player_id into still_player from public.characters
    where id = 'd0000000-0000-0000-0000-0000000000a1';
  assert still_player = 'b0000000-0000-0000-0000-0000000000a1',
    'Le trigger doit avoir regelé player_id (désattribution = action MJ, pas joueur)';
end $$;

-- Test 4 : réclamer/éditer ne doit PAS permettre de déplacer owner_id/campaign_id.
do $$
declare c uuid; o uuid;
begin
  update public.characters
    set campaign_id = 'c0000000-0000-0000-0000-0000000000bb',
        owner_id    = 'a0000000-0000-0000-0000-0000000000bb'
    where id = 'd0000000-0000-0000-0000-0000000000a1';
  select campaign_id, owner_id into c, o from public.characters
    where id = 'd0000000-0000-0000-0000-0000000000a1';
  assert c = 'c0000000-0000-0000-0000-0000000000aa',
    'campaign_id doit rester gelé lors d''une écriture joueur';
  assert o = 'a0000000-0000-0000-0000-0000000000aa',
    'owner_id doit rester gelé lors d''une écriture joueur';
end $$;

-- Test 5 : A1 ne réclame PAS un pré-tiré d'une AUTRE campagne (ni visible, ni écrivable).
do $$
declare touched integer;
begin
  update public.characters
    set player_id = 'b0000000-0000-0000-0000-0000000000a1'
    where id = 'd0000000-0000-0000-0000-0000000000b0';
  get diagnostics touched = row_count;
  assert touched = 0, 'A1 ne doit PAS pouvoir réclamer un pré-tiré de la campagne B';
end $$;

reset role;

do $$ begin raise notice 'RLS joueur — réclamation (PER-196) : tous les tests OK'; end $$;

rollback;
