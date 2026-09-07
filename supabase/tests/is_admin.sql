-- Test — fonction `is_admin()` (PER-508)
--
-- Éprouve la migration 0047 : un compte ajouté à `app_admins` est reconnu
-- admin par `is_admin()`, un compte absent de la table ne l'est pas — y
-- compris un compte authentifié quelconque (pas seulement l'anonyme).
--
-- Même protocole que les autres tests RLS : rôle privilégié pour les
-- fixtures, bascule vers `authenticated` + `request.jwt.claims` pour éprouver
-- la fonction, le tout en transaction ROLLBACK. Un échec lève via `assert`.
--
-- Usage : psql "$DATABASE_URL" -f supabase/tests/is_admin.sql

begin;

-- ── Fixtures (rôle privilégié : RLS contournée) ──
insert into auth.users (id, email) values
  ('f0000000-0000-0000-0000-0000000000a1', 'admin@test.local'),
  ('f0000000-0000-0000-0000-0000000000a2', 'not-admin@test.local');

insert into public.app_admins (user_id) values
  ('f0000000-0000-0000-0000-0000000000a1');

-- ── Session ADMIN ──
set local role authenticated;
set local request.jwt.claims to '{"sub":"f0000000-0000-0000-0000-0000000000a1","role":"authenticated"}';

do $$
begin
  assert (select public.is_admin()) = true,
    'Un compte ajouté à app_admins doit être reconnu admin';
end $$;

-- ── Session compte réel NON admin ──
set local request.jwt.claims to '{"sub":"f0000000-0000-0000-0000-0000000000a2","role":"authenticated"}';

do $$
begin
  assert (select public.is_admin()) = false,
    'Un compte absent de app_admins ne doit PAS être reconnu admin';
end $$;

-- ── Anonyme sans claims ──
set local request.jwt.claims to '{"sub":"e0000000-0000-0000-0000-00000000dead","role":"authenticated"}';

do $$
begin
  assert (select public.is_admin()) = false,
    'Un anonyme ne doit PAS être reconnu admin';
end $$;

reset role;

do $$ begin raise notice 'is_admin() (PER-508) : tous les tests OK'; end $$;

rollback;
