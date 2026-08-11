-- Migration 0024 — Système d'amis (PER-402)
--
-- Cadrage validé : pas de présence temps réel (Realtime Presence jugé trop
-- lourd) — un simple `last_seen_at` rafraîchi par heartbeat, patron identique
-- à `touch_player_presence` (0005). Trois façons de retrouver un ami, sans
-- jamais exposer d'annuaire (aucune policy SELECT permettant l'énumération) :
--   * handle public choisi (recherche exact-match via RPC)
--   * email exact (RPC)
--   * lien d'invitation à usage unique (patron `join_secret`, PER-191)
--
-- Portée : comptes RÉELS uniquement. Les sessions anonymes (joueurs liens
-- magiques, PER-191) sont exclues partout via `is_anonymous()` (0003) — un
-- joueur sans compte n'a pas d'amis.

-- ────────────────────────────────────────────────────────────────────────────
-- `public.profiles` — miroir léger d'`auth.users`, créé à la volée
-- ────────────────────────────────────────────────────────────────────────────
-- Pas de trigger sur `auth.users` : la ligne est créée/rafraîchie paresseusement
-- par les fonctions ci-dessous (heartbeat, choix du handle, redeem d'invitation).
-- `display_name` est recopié depuis `auth.users` à chaque heartbeat — auto-
-- réparant, jamais de désynchronisation durable pendant qu'un compte est actif.
-- Aucune policy SELECT globale : la table n'est PAS un annuaire, seule la
-- ligne propre est lisible directement ; la recherche d'un tiers passe par les
-- RPC `security definer` (exact-match only, plus bas).

create table if not exists public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  handle        text unique,
  display_name  text,
  last_seen_at  timestamptz,
  created_at    timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists profiles_self_all on public.profiles;
create policy profiles_self_all on public.profiles
  for all
  to authenticated
  using (id = (select auth.uid()) and not public.is_anonymous())
  with check (id = (select auth.uid()) and not public.is_anonymous());

-- ────────────────────────────────────────────────────────────────────────────
-- Heartbeat de présence (patron identique à `touch_player_presence`, 0005)
-- ────────────────────────────────────────────────────────────────────────────
-- Crée la ligne de profil si absente, rafraîchit `last_seen_at` et resynchronise
-- `display_name` depuis `auth.users`. No-op silencieux pour un appelant anonyme
-- ou non authentifié (heartbeat best-effort, jamais critique).

create or replace function public.touch_my_presence()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  dn  text;
begin
  if uid is null or public.is_anonymous() then
    return;
  end if;

  select coalesce(u.raw_user_meta_data ->> 'display_name', u.email)
    into dn
    from auth.users u
   where u.id = uid;

  insert into public.profiles (id, display_name, last_seen_at)
  values (uid, dn, now())
  on conflict (id) do update
    set display_name = excluded.display_name,
        last_seen_at  = excluded.last_seen_at;
end;
$$;

grant execute on function public.touch_my_presence() to authenticated;

-- ────────────────────────────────────────────────────────────────────────────
-- Choix du handle public
-- ────────────────────────────────────────────────────────────────────────────
-- Format imposé : minuscules/chiffres/underscore, 3 à 24 caractères. Normalisé
-- en minuscules avant stockage (unicité insensible à la casse portée par la
-- colonne elle-même, déjà stockée en minuscules).

create or replace function public.set_my_handle(p_handle text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  h   text := lower(trim(p_handle));
begin
  if uid is null or public.is_anonymous() then
    raise exception 'friend_handle_requires_account';
  end if;
  if h !~ '^[a-z0-9_]{3,24}$' then
    raise exception 'friend_handle_invalid_format';
  end if;

  insert into public.profiles (id, handle) values (uid, h)
    on conflict (id) do update set handle = h;
exception
  when unique_violation then
    raise exception 'friend_handle_taken';
end;
$$;

grant execute on function public.set_my_handle(text) to authenticated;

-- ────────────────────────────────────────────────────────────────────────────
-- Recherche exact-match (jamais de liste — bloque l'énumération de comptes)
-- ────────────────────────────────────────────────────────────────────────────

create or replace function public.find_profile_by_handle(p_handle text)
returns table (id uuid, handle text, display_name text)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.handle, p.display_name
  from public.profiles p
  where auth.uid() is not null
    and not public.is_anonymous()
    and lower(p.handle) = lower(p_handle)
  limit 1;
$$;

grant execute on function public.find_profile_by_handle(text) to authenticated;

-- Requête directement `auth.users` (une adresse email n'a pas besoin d'avoir
-- déjà choisi de handle pour être trouvable) ; `display_name` retombe sur
-- l'email si le profil n'existe pas encore (compte jamais vu par le heartbeat).

create or replace function public.find_profile_by_email(p_email text)
returns table (id uuid, handle text, display_name text)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or public.is_anonymous() then
    return;
  end if;

  return query
    select u.id, p.handle, coalesce(p.display_name, u.email)
    from auth.users u
    left join public.profiles p on p.id = u.id
    where lower(u.email) = lower(p_email)
    limit 1;
end;
$$;

grant execute on function public.find_profile_by_email(text) to authenticated;

-- ────────────────────────────────────────────────────────────────────────────
-- `public.friend_requests` — demande pending → accepted/declined
-- ────────────────────────────────────────────────────────────────────────────
-- Index unique sur la PAIRE NON ORDONNÉE (least/greatest) plutôt que sur
-- (from, to) : empêche deux lignes croisées A→B et B→A d'exister en même temps
-- (double demande simultanée). Cas connu à gérer côté application (PER-402
-- suite) : si B envoie une demande alors qu'une ligne A→B pending existe déjà,
-- l'insert échoue (violation unique) — l'app doit alors accepter la ligne
-- existante plutôt que d'en créer une nouvelle.

create table if not exists public.friend_requests (
  id            uuid primary key default gen_random_uuid(),
  from_user_id  uuid not null references auth.users (id) on delete cascade,
  to_user_id    uuid not null references auth.users (id) on delete cascade,
  status        text not null default 'pending'
                  check (status in ('pending', 'accepted', 'declined')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint friend_requests_no_self check (from_user_id <> to_user_id)
);

create unique index if not exists friend_requests_unique_unordered_pair
  on public.friend_requests (least(from_user_id, to_user_id), greatest(from_user_id, to_user_id));

create index if not exists friend_requests_from_user_id_idx on public.friend_requests (from_user_id);
create index if not exists friend_requests_to_user_id_idx   on public.friend_requests (to_user_id);

alter table public.friend_requests enable row level security;

-- SELECT/DELETE : visible et supprimable par les deux parties (annulation d'une
-- demande pending par l'émetteur, ou rupture d'amitié acceptée par l'un ou l'autre).
drop policy if exists friend_requests_parties_select on public.friend_requests;
create policy friend_requests_parties_select on public.friend_requests
  for select
  to authenticated
  using (
    not public.is_anonymous()
    and (from_user_id = (select auth.uid()) or to_user_id = (select auth.uid()))
  );

drop policy if exists friend_requests_parties_delete on public.friend_requests;
create policy friend_requests_parties_delete on public.friend_requests
  for delete
  to authenticated
  using (
    not public.is_anonymous()
    and (from_user_id = (select auth.uid()) or to_user_id = (select auth.uid()))
  );

-- INSERT : uniquement l'émetteur, statut de départ forcé à 'pending' (une
-- demande acceptée d'office ne passe QUE par le lien d'invitation ci-dessous,
-- via la fonction `security definer` qui contourne la RLS).
drop policy if exists friend_requests_sender_insert on public.friend_requests;
create policy friend_requests_sender_insert on public.friend_requests
  for insert
  to authenticated
  with check (
    not public.is_anonymous()
    and from_user_id = (select auth.uid())
    and to_user_id <> (select auth.uid())
    and status = 'pending'
  );

-- UPDATE : policy large (les deux parties), le VRAI verrou est le trigger
-- ci-dessous — patron identique à `enforce_player_character_scope` (0002/0004) :
-- la policy élargit la visibilité en écriture, le trigger gèle ce qui n'est pas
-- une transition légitime plutôt que de faire échouer la requête.
drop policy if exists friend_requests_parties_update on public.friend_requests;
create policy friend_requests_parties_update on public.friend_requests
  for update
  to authenticated
  using (
    not public.is_anonymous()
    and (from_user_id = (select auth.uid()) or to_user_id = (select auth.uid()))
  )
  with check (
    not public.is_anonymous()
    and (from_user_id = (select auth.uid()) or to_user_id = (select auth.uid()))
  );

create or replace function public.enforce_friend_request_transition()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.from_user_id := old.from_user_id;
  new.to_user_id    := old.to_user_id;
  new.created_at    := old.created_at;

  -- Seul le DESTINATAIRE peut faire passer une demande pending à accepted/declined.
  if auth.uid() = old.to_user_id and old.status = 'pending' and new.status in ('accepted', 'declined') then
    new.updated_at := now();
    return new;
  end if;

  -- Toute autre tentative de modification du statut est gelée (no-op silencieux).
  new.status     := old.status;
  new.updated_at := old.updated_at;
  return new;
end;
$$;

drop trigger if exists friend_requests_enforce_transition on public.friend_requests;
create trigger friend_requests_enforce_transition
  before update on public.friend_requests
  for each row execute function public.enforce_friend_request_transition();

-- ────────────────────────────────────────────────────────────────────────────
-- `public.friend_invite_links` — lien d'invitation à usage unique
-- ────────────────────────────────────────────────────────────────────────────
-- Patron identique à `players.join_secret` (0001/PER-191) : un token opaque,
-- consommé une seule fois. Le propriétaire gère ses liens directement (policy
-- `for all`) ; la consommation par un TIERS passe uniquement par la fonction
-- `redeem_friend_invite` ci-dessous (aucune policy UPDATE pour un non-propriétaire).

create table if not exists public.friend_invite_links (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null references auth.users (id) on delete cascade,
  token      uuid not null unique default gen_random_uuid(),
  created_at timestamptz not null default now(),
  used_by    uuid references auth.users (id) on delete set null,
  used_at    timestamptz
);

create index if not exists friend_invite_links_owner_id_idx on public.friend_invite_links (owner_id);

alter table public.friend_invite_links enable row level security;

drop policy if exists friend_invite_links_owner_all on public.friend_invite_links;
create policy friend_invite_links_owner_all on public.friend_invite_links
  for all
  to authenticated
  using (owner_id = (select auth.uid()) and not public.is_anonymous())
  with check (owner_id = (select auth.uid()) and not public.is_anonymous());

-- Consommation : `security definer` pour pouvoir lire le lien d'un AUTRE
-- utilisateur (le propriétaire du lien) et créer l'amitié acceptée d'office.
-- Périmètre borné dans le corps (token non consommé, pas soi-même).

create or replace function public.redeem_friend_invite(p_token uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me      uuid := auth.uid();
  inviter uuid;
begin
  if me is null or public.is_anonymous() then
    raise exception 'friend_invite_requires_account';
  end if;

  select owner_id into inviter
    from public.friend_invite_links
   where token = p_token and used_by is null;

  if inviter is null then
    raise exception 'friend_invite_invalid_or_used';
  end if;
  if inviter = me then
    raise exception 'friend_invite_self';
  end if;

  update public.friend_invite_links
     set used_by = me, used_at = now()
   where token = p_token;

  insert into public.friend_requests (from_user_id, to_user_id, status)
  values (inviter, me, 'accepted')
  on conflict (least(from_user_id, to_user_id), greatest(from_user_id, to_user_id))
  do update set status = 'accepted', updated_at = now();
end;
$$;

grant execute on function public.redeem_friend_invite(uuid) to authenticated;
