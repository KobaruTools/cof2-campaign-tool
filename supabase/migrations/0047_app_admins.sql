-- Migration 0047 — Rôle admin via table, pas via claim JWT (PER-508)
--
-- Pour répondre à n'importe quel ticket de retour (pas seulement les siens), il
-- faut un accès admin réservé au développeur. Même choix que 0002/0043/0045
-- (docs/adr/0003-player-membership-rls-via-table-not-jwt-claims.md) : une table
-- vérifiée à la requête, pas un claim posé dans le JWT (qui resterait valide
-- après une révocation, jusqu'à expiration du jeton).
--
-- `app_admins` ne référence AUCUNE campagne/joueur : c'est un rôle applicatif
-- global (le développeur, propriétaire du projet), pas une appartenance.
-- RLS activée SANS aucune policy — même pattern que `player_auth_sessions`
-- (0002) : seul le client admin (clé secrète, qui contourne la RLS) lit/écrit
-- cette table. Un compte y est ajouté manuellement (aucune UI, ticket PER-508).

create table if not exists public.app_admins (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.app_admins enable row level security;
-- (Volontairement aucune policy : seul le client admin, qui contourne la RLS,
--  lit/écrit cette table.)

-- ────────────────────────────────────────────────────────────────────────────
-- Helper : l'Identité courante est-elle admin ?
-- ────────────────────────────────────────────────────────────────────────────

-- `security definer` : `app_admins` a la RLS activée SANS policy (accès réservé
-- au client admin) — un `security invoker` ne verrait donc JAMAIS aucune ligne,
-- même la sienne, et retournerait toujours `false` (même bug que 0043→0045).
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.app_admins
    where user_id = (select auth.uid())
  );
$$;
