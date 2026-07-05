-- Migration 0002 — Accès JOUEUR par lien magique (PER-191)
--
-- Complète le socle propriétaire de 0001 avec l'accès des JOUEURS sans compte.
-- Modèle validé au grilling (2026-07-05) :
--
--   * Le joueur n'a PAS de compte : sa session est un **utilisateur anonyme**
--     Supabase (`enable_anonymous_sign_ins`), auquel l'échange du lien magique
--     (route serveur, PER-191) attache `player_id` + `campaign_id` dans
--     `app_metadata` (posé par la clé secrète → non falsifiable côté joueur).
--   * `getUser()` valide donc un vrai utilisateur → le gating PER-189 reste inchangé.
--   * La RLS joueur lit ces claims via `auth.jwt() -> 'app_metadata'`.
--
-- Droits joueur : lecture du roster de SA campagne (personnages, joueurs, nom de
-- campagne) + édition/création de SA fiche uniquement. Aucune écriture sur
-- `campaigns`/`players`. `owner_id` d'une fiche reste TOUJOURS le MJ (propriétaire
-- de la campagne), jamais l'utilisateur anonyme — sinon la révocation forte
-- (suppression des anon) cascade-supprimerait la fiche du joueur.
--
-- Les politiques joueur sont PERMISSIVES : elles s'ajoutent en OR au socle
-- propriétaire de 0001 (le MJ garde tous ses droits ; un joueur n'est jamais MJ).

-- ────────────────────────────────────────────────────────────────────────────
-- Helpers : claims de la session joueur (null si l'appelant n'est pas un joueur)
-- ────────────────────────────────────────────────────────────────────────────

-- `search_path = ''` + qualification complète : durcissement contre le hijack de
-- résolution de noms (recommandation Supabase pour les fonctions en base).

create or replace function public.current_player_id()
returns uuid
language sql
stable
set search_path = ''
as $$
  select nullif(auth.jwt() -> 'app_metadata' ->> 'player_id', '')::uuid;
$$;

create or replace function public.current_player_campaign_id()
returns uuid
language sql
stable
set search_path = ''
as $$
  select nullif(auth.jwt() -> 'app_metadata' ->> 'campaign_id', '')::uuid;
$$;

-- ────────────────────────────────────────────────────────────────────────────
-- Table de liaison utilisateur anonyme ↔ joueur (révocation forte)
-- ────────────────────────────────────────────────────────────────────────────
-- Remplie au redeem du lien magique. Sert à retrouver et supprimer les
-- utilisateurs anonymes d'un joueur quand le MJ régénère/révoque son lien (ce
-- qui invalide leurs refresh tokens → déconnexion). Accès réservé au client
-- admin (clé secrète) : RLS activée SANS aucune politique → aucun accès via
-- l'API PostgREST (authenticated/anon). La suppression de l'utilisateur anonyme
-- (ou du joueur) purge la ligne par cascade.

create table if not exists public.player_auth_sessions (
  auth_user_id uuid primary key references auth.users (id) on delete cascade,
  player_id    uuid not null references public.players (id) on delete cascade,
  created_at   timestamptz not null default now()
);

create index if not exists player_auth_sessions_player_id_idx
  on public.player_auth_sessions (player_id);

alter table public.player_auth_sessions enable row level security;
-- (Volontairement aucune policy : seul le client admin, qui contourne la RLS,
--  lit/écrit cette table.)

-- ────────────────────────────────────────────────────────────────────────────
-- Trigger : impose le périmètre d'écriture d'un JOUEUR sur `characters`
-- ────────────────────────────────────────────────────────────────────────────
-- N'agit QUE si l'appelant est un joueur (JWT portant `player_id`) ; le MJ passe
-- outre. À l'INSERT : force `owner_id` au MJ de la campagne (jamais l'anon) et
-- exige campagne/joueur = ceux du claim. À l'UPDATE : gèle owner_id/campaign_id/
-- player_id (le joueur n'édite que le contenu et le statut de sa fiche).

create or replace function public.enforce_player_character_scope()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  pid        uuid := public.current_player_id();
  cid        uuid := public.current_player_campaign_id();
  camp_owner uuid;
begin
  -- Acteur non-joueur (MJ) : aucune contrainte ajoutée ici (le socle 0001 gère).
  if pid is null then
    return new;
  end if;

  if tg_op = 'INSERT' then
    -- Un joueur ne crée que dans SA campagne, attribué à LUI.
    if new.campaign_id is distinct from cid or new.player_id is distinct from pid then
      raise exception 'player_scope_violation: insert hors de la campagne/joueur du lien';
    end if;
    -- `owner_id` TOUJOURS = MJ de la campagne (la fiche survit à la révocation).
    select c.owner_id into camp_owner from public.campaigns c where c.id = new.campaign_id;
    if camp_owner is null then
      raise exception 'player_scope_violation: campagne introuvable';
    end if;
    new.owner_id := camp_owner;
    return new;
  end if;

  -- UPDATE : le joueur ne peut pas déplacer sa fiche ni en changer le propriétaire.
  new.owner_id    := old.owner_id;
  new.campaign_id := old.campaign_id;
  new.player_id   := old.player_id;
  return new;
end;
$$;

drop trigger if exists characters_enforce_player_scope on public.characters;
create trigger characters_enforce_player_scope
  before insert or update on public.characters
  for each row execute function public.enforce_player_character_scope();

-- ────────────────────────────────────────────────────────────────────────────
-- Politiques RLS joueur (permissives, en OR avec le socle propriétaire 0001)
-- ────────────────────────────────────────────────────────────────────────────

-- characters — le joueur LIT tout le roster de SA campagne (lecture seule).
drop policy if exists characters_player_read_roster on public.characters;
create policy characters_player_read_roster on public.characters
  for select
  to authenticated
  using (
    current_player_campaign_id() is not null
    and campaign_id = current_player_campaign_id()
  );

-- characters — le joueur CRÉE une fiche attribuée à lui dans sa campagne.
-- `owner_id` (= MJ) est imposé par le trigger ; le `with check` verrouille le scope.
drop policy if exists characters_player_insert_own on public.characters;
create policy characters_player_insert_own on public.characters
  for insert
  to authenticated
  with check (
    current_player_id() is not null
    and player_id = current_player_id()
    and campaign_id = current_player_campaign_id()
  );

-- characters — le joueur ÉDITE sa (ses) seule(s) fiche(s). Le trigger gèle les
-- colonnes d'attribution ; le `with check` refuse toute tentative de sortie de scope.
drop policy if exists characters_player_update_own on public.characters;
create policy characters_player_update_own on public.characters
  for update
  to authenticated
  using (
    current_player_id() is not null
    and player_id = current_player_id()
  )
  with check (
    current_player_id() is not null
    and player_id = current_player_id()
    and campaign_id = current_player_campaign_id()
  );

-- players — le joueur voit le roster (noms) de SA campagne (lecture seule).
drop policy if exists players_player_read_roster on public.players;
create policy players_player_read_roster on public.players
  for select
  to authenticated
  using (
    current_player_campaign_id() is not null
    and campaign_id = current_player_campaign_id()
  );

-- campaigns — le joueur voit SA campagne (nom d'affichage) (lecture seule).
drop policy if exists campaigns_player_read on public.campaigns;
create policy campaigns_player_read on public.campaigns
  for select
  to authenticated
  using (
    current_player_campaign_id() is not null
    and id = current_player_campaign_id()
  );
