-- Migration 0003 — Durcissement RLS propriétaire face aux sessions anonymes (PER-194)
--
-- Contexte : activer `enable_anonymous_sign_ins` (requis par le lien magique
-- joueur, PER-191) place les utilisateurs anonymes dans le rôle `authenticated`.
-- Ils sont donc soumis aux MÊMES politiques que les vrais comptes. Le socle 0001
-- autorisait « owner_id = auth.uid() » pour tout `authenticated` → un anonyme brut
-- (obtenu via un simple `signInAnonymously()` avec la clé publique) pouvait CRÉER
-- des campagnes/personnages possédés par son propre uid anonyme. Pas de fuite
-- inter-tenant (chacun ne touche que ses lignes), mais un vecteur de POLLUTION
-- (lignes orphelines de comptes jetables).
--
-- Correctif : la **propriété (rôle MJ) est réservée aux vrais comptes**. Les
-- utilisateurs anonymes n'agissent QUE comme joueurs, via les politiques
-- permissives de 0002 (claims `player_id`/`campaign_id` posés par la clé secrète).
-- Un anonyme SANS claim (session anonyme brute) n'a alors accès à RIEN.
--
-- Les politiques joueur (0002) restent inchangées : elles ne dépendent pas de
-- `is_anonymous` mais des claims — un joueur légitime continue de lire son roster
-- et d'éditer sa fiche.

-- ────────────────────────────────────────────────────────────────────────────
-- Helper : la session courante est-elle anonyme ? (claim JWT `is_anonymous`)
-- ────────────────────────────────────────────────────────────────────────────
-- `search_path = ''` + qualification complète : durcissement contre le hijack de
-- résolution de noms (même posture que les helpers de 0002). Le `coalesce(…, true)`
-- est un choix FAIL-SAFE : si le claim `is_anonymous` manquait (cas anormal, hors
-- session signée), on considère la session comme anonyme → la propriété est refusée
-- plutôt qu'accordée par défaut.

create or replace function public.is_anonymous()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce((auth.jwt() ->> 'is_anonymous')::boolean, true);
$$;

-- ────────────────────────────────────────────────────────────────────────────
-- Réécriture des politiques propriétaire : réservées aux vrais comptes
-- ────────────────────────────────────────────────────────────────────────────

-- campaigns : seul un compte NON anonyme peut posséder/gérer ses campagnes.
drop policy if exists campaigns_owner_all on public.campaigns;
create policy campaigns_owner_all on public.campaigns
  for all
  to authenticated
  using (owner_id = (select auth.uid()) and not public.is_anonymous())
  with check (owner_id = (select auth.uid()) and not public.is_anonymous());

-- characters : idem — la propriété d'un perso est réservée aux vrais comptes.
-- (Un JOUEUR crée/édite via les politiques permissives de 0002, où `owner_id`
--  est forcé au MJ par le trigger — il ne passe jamais par cette politique-ci.)
drop policy if exists characters_owner_all on public.characters;
create policy characters_owner_all on public.characters
  for all
  to authenticated
  using (owner_id = (select auth.uid()) and not public.is_anonymous())
  with check (owner_id = (select auth.uid()) and not public.is_anonymous());

-- players : déjà dérivée de la possession d'une campagne (owner_id = auth.uid()).
-- Un anonyme ne possède aucune campagne une fois `campaigns` durcie → accès nul
-- de façon transitive. On explicite tout de même la condition pour la lisibilité
-- et la défense en profondeur.
drop policy if exists players_via_owned_campaign on public.players;
create policy players_via_owned_campaign on public.players
  for all
  to authenticated
  using (
    not public.is_anonymous()
    and exists (
      select 1 from public.campaigns c
      where c.id = players.campaign_id
        and c.owner_id = (select auth.uid())
    )
  )
  with check (
    not public.is_anonymous()
    and exists (
      select 1 from public.campaigns c
      where c.id = players.campaign_id
        and c.owner_id = (select auth.uid())
    )
  );
