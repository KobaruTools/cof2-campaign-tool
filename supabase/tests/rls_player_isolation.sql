-- Tests d'isolation RLS — accès JOUEUR par lien magique (PER-191)
--
-- Éprouve les politiques joueur de 0002 : un joueur (utilisateur anonyme portant
-- `app_metadata.player_id` + `campaign_id`) LIT le roster de SA campagne, ÉDITE
-- et CRÉE uniquement SA fiche (owner_id forcé au MJ), n'écrit rien sur
-- `players`/`campaigns`, et un anonyme SANS claims ne voit rien.
--
-- Même protocole que `rls_isolation.sql` : rôle privilégié pour les fixtures,
-- bascule vers `authenticated` + `request.jwt.claims` pour éprouver la RLS, le
-- tout en transaction ROLLBACK. Un échec lève via `assert`.
--
-- Usage : psql "$DATABASE_URL" -f supabase/tests/rls_player_isolation.sql

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

insert into public.characters (id, owner_id, campaign_id, player_id, schema_version, data) values
  ('d0000000-0000-0000-0000-0000000000a1', 'a0000000-0000-0000-0000-0000000000aa',
   'c0000000-0000-0000-0000-0000000000aa', 'b0000000-0000-0000-0000-0000000000a1', 16, '{}'::jsonb),
  ('d0000000-0000-0000-0000-0000000000a2', 'a0000000-0000-0000-0000-0000000000aa',
   'c0000000-0000-0000-0000-0000000000aa', 'b0000000-0000-0000-0000-0000000000a2', 16, '{}'::jsonb),
  ('d0000000-0000-0000-0000-0000000000b1', 'a0000000-0000-0000-0000-0000000000bb',
   'c0000000-0000-0000-0000-0000000000bb', 'b0000000-0000-0000-0000-0000000000b1', 16, '{}'::jsonb);

-- ── Session JOUEUR A1 (utilisateur anonyme + claims scopés) ──
set local role authenticated;
set local request.jwt.claims to '{"sub":"e0000000-0000-0000-0000-0000000000a1","role":"authenticated","app_metadata":{"player_id":"b0000000-0000-0000-0000-0000000000a1","campaign_id":"c0000000-0000-0000-0000-0000000000aa"}}';

-- Test 1 : le joueur LIT tout le roster de SA campagne, rien d'autre.
do $$
begin
  assert (select count(*) from public.campaigns)  = 1, 'A1 doit voir 1 campagne (la sienne)';
  assert (select count(*) from public.players)    = 2, 'A1 doit voir les 2 joueurs de sa campagne';
  assert (select count(*) from public.characters) = 2, 'A1 doit voir les 2 fiches de sa campagne (roster)';
  assert not exists (select 1 from public.campaigns where id = 'c0000000-0000-0000-0000-0000000000bb'),
    'A1 ne doit PAS voir la campagne de B';
  assert not exists (select 1 from public.characters where id = 'd0000000-0000-0000-0000-0000000000b1'),
    'A1 ne doit PAS voir la fiche de la campagne B';
end $$;

-- Test 2 : le joueur ÉDITE sa fiche (1 ligne), pas celle d'un colistier (0 ligne).
do $$
declare touched integer;
begin
  update public.characters set status = 'dead' where id = 'd0000000-0000-0000-0000-0000000000a1';
  get diagnostics touched = row_count;
  assert touched = 1, 'A1 doit pouvoir éditer SA fiche';

  update public.characters set status = 'dead' where id = 'd0000000-0000-0000-0000-0000000000a2';
  get diagnostics touched = row_count;
  assert touched = 0, 'A1 ne doit PAS pouvoir éditer la fiche d''un colistier';
end $$;

-- Test 3 : le joueur ne peut pas déplacer sa fiche (le trigger gèle l'attribution).
do $$
declare moved_campaign uuid;
begin
  update public.characters
    set campaign_id = 'c0000000-0000-0000-0000-0000000000bb',
        owner_id    = 'a0000000-0000-0000-0000-0000000000bb'
    where id = 'd0000000-0000-0000-0000-0000000000a1';
  select campaign_id into moved_campaign from public.characters
    where id = 'd0000000-0000-0000-0000-0000000000a1';
  assert moved_campaign = 'c0000000-0000-0000-0000-0000000000aa',
    'Le trigger doit avoir gelé campaign_id (fiche non déplaçable par le joueur)';
end $$;

-- Test 4 : le joueur CRÉE sa fiche ; owner_id est forcé au MJ (pas à l'anon ni au MJ fourni).
do $$
declare new_id uuid; new_owner uuid;
begin
  insert into public.characters (owner_id, campaign_id, player_id, schema_version, data)
    -- owner_id volontairement FAUX (MJ B) : le trigger doit le remplacer par MJ A.
    values ('a0000000-0000-0000-0000-0000000000bb',
            'c0000000-0000-0000-0000-0000000000aa',
            'b0000000-0000-0000-0000-0000000000a1', 16, '{}'::jsonb)
    returning id into new_id;
  select owner_id into new_owner from public.characters where id = new_id;
  assert new_owner = 'a0000000-0000-0000-0000-0000000000aa',
    'owner_id d''une fiche créée par le joueur doit être le MJ de la campagne';
end $$;

-- Test 5 : le joueur ne peut PAS créer une fiche hors de sa campagne / pour un autre joueur.
do $$
begin
  begin
    insert into public.characters (owner_id, campaign_id, player_id, schema_version, data)
      values ('a0000000-0000-0000-0000-0000000000bb',
              'c0000000-0000-0000-0000-0000000000bb',
              'b0000000-0000-0000-0000-0000000000b1', 16, '{}'::jsonb);
    assert false, 'A1 ne devrait PAS pouvoir créer une fiche dans la campagne B';
  exception
    when others then null; -- attendu : trigger (scope) ou violation de politique RLS
  end;

  begin
    insert into public.characters (owner_id, campaign_id, player_id, schema_version, data)
      values ('a0000000-0000-0000-0000-0000000000aa',
              'c0000000-0000-0000-0000-0000000000aa',
              'b0000000-0000-0000-0000-0000000000a2', 16, '{}'::jsonb);
    assert false, 'A1 ne devrait PAS pouvoir créer une fiche pour le joueur A2';
  exception
    when others then null;
  end;
end $$;

-- Test 6 : le joueur n'écrit NI sur players NI sur campaigns.
do $$
declare touched integer;
begin
  -- Renommer un joueur : aucune ligne modifiée (pas de policy d'écriture joueur).
  update public.players set name = 'Pirate' where id = 'b0000000-0000-0000-0000-0000000000a1';
  get diagnostics touched = row_count;
  assert touched = 0, 'Le joueur ne doit modifier AUCUN enregistrement players';

  -- Renommer la campagne : aucune ligne modifiée.
  update public.campaigns set name = 'Détournée' where id = 'c0000000-0000-0000-0000-0000000000aa';
  get diagnostics touched = row_count;
  assert touched = 0, 'Le joueur ne doit modifier AUCUNE campagne';

  -- Créer un joueur : refusé par la RLS (aucune policy INSERT permissive).
  begin
    insert into public.players (campaign_id, name)
      values ('c0000000-0000-0000-0000-0000000000aa', 'Intrus');
    assert false, 'Le joueur ne devrait PAS pouvoir créer un joueur';
  exception
    when insufficient_privilege then null; -- attendu
  end;
end $$;

-- ── Anonyme SANS claims (lien non échangé) : ne voit/écrit rien ──
set local request.jwt.claims to '{"sub":"e0000000-0000-0000-0000-00000000dead","role":"authenticated"}';

do $$
declare touched integer;
begin
  assert (select count(*) from public.campaigns)  = 0, 'Anon sans claims : aucune campagne';
  assert (select count(*) from public.players)    = 0, 'Anon sans claims : aucun joueur';
  assert (select count(*) from public.characters) = 0, 'Anon sans claims : aucune fiche';

  update public.characters set status = 'dead' where id = 'd0000000-0000-0000-0000-0000000000a1';
  get diagnostics touched = row_count;
  assert touched = 0, 'Anon sans claims : aucune écriture';
end $$;

reset role;

do $$ begin raise notice 'RLS joueur (PER-191) : tous les tests OK'; end $$;

rollback;
