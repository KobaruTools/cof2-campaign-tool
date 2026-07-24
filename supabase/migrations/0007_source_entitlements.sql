-- Migration 0007 — Gating par source : entitlements + RLS du contenu payant (PER-242)
--
-- Deuxième tranche de la milestone « Contenu payant gaté », posée PAR-DESSUS le
-- socle de 0006 (bestiaire en base + lecture publique du gratuit) sans le casser.
--
-- Principe : une source PAYANTE (`sources.is_paid = true`) reste TOTALEMENT
-- invisible (ni listée, ni détaillée, ni comptée) tant que l'utilisateur courant
-- ne possède pas un ENTITLEMENT sur cette source. Le gating est une donnée en
-- base (une ligne `source_entitlements`), pas une constante de code.
--
--   source_entitlements : une ligne = « cet utilisateur a accès à cette source ».
--                         L'octroi se fera par code rotable (RPC redeem, PER-243) ;
--                         ici les lignes se posent à la MAIN en SQL (`service_role`)
--                         pour la recette. AUCUNE policy d'écriture via l'API →
--                         un utilisateur ne peut pas s'auto-accorder un accès.
--
-- Joueurs anonymes (PER-191) : leur session est un utilisateur ANONYME Supabase
-- (`is_anonymous = true`). Le helper de gating les EXCLUT explicitement — un accès
-- payant n'est jamais servi à une session joueur, même si une ligne existait.

-- ────────────────────────────────────────────────────────────────────────────
-- Table de liaison utilisateur ↔ source (entitlement)
-- ────────────────────────────────────────────────────────────────────────────

create table if not exists public.source_entitlements (
  user_id    uuid not null references auth.users (id) on delete cascade,
  source_id  uuid not null references public.sources (id) on delete cascade,
  -- Date d'octroi (audit léger ; l'octroi par code viendra en PER-243).
  granted_at timestamptz not null default now(),
  primary key (user_id, source_id)
);

-- Recherche inverse « qui a accès à cette source » (admin / RPC redeem PER-243).
create index if not exists source_entitlements_source_id_idx
  on public.source_entitlements (source_id);

-- ────────────────────────────────────────────────────────────────────────────
-- Helper : l'utilisateur courant est-il entitlé sur cette source ?
-- ────────────────────────────────────────────────────────────────────────────
-- SECURITY DEFINER + `search_path = ''` : contourne la RLS de `source_entitlements`
-- à l'intérieur (le filtre `user_id = auth.uid()` borne malgré tout à ses propres
-- lignes) et évite toute récursion de RLS quand ce helper est appelé depuis la
-- policy de `sources`. Exclut les sessions ANONYMES (joueurs PER-191) via le helper
-- `public.is_anonymous()` de 0003, FAIL-SAFE (claim absent ⇒ anonyme ⇒ refus) : un
-- accès payant n'est jamais servi à une session joueur.

create or replace function public.current_user_is_entitled(p_source_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    not public.is_anonymous()
    and exists (
      select 1
      from public.source_entitlements e
      where e.source_id = p_source_id
        and e.user_id = auth.uid()
    );
$$;

-- ────────────────────────────────────────────────────────────────────────────
-- RLS de `source_entitlements` : chacun ne voit QUE ses propres lignes
-- ────────────────────────────────────────────────────────────────────────────
-- Aucune policy INSERT/UPDATE/DELETE : l'écriture reste réservée à la
-- `service_role` (contourne la RLS) — pose manuelle en recette, RPC redeem en
-- PER-243. Un utilisateur ne peut donc pas s'accorder un accès lui-même.

alter table public.source_entitlements enable row level security;

drop policy if exists source_entitlements_read_own on public.source_entitlements;
create policy source_entitlements_read_own on public.source_entitlements
  for select
  to authenticated
  using (user_id = auth.uid());

-- ────────────────────────────────────────────────────────────────────────────
-- Resserrement RLS de `sources` : gratuit OU entitlé
-- ────────────────────────────────────────────────────────────────────────────
-- Remplace la policy « gratuit seulement » de 0006. Une source payante devient
-- visible dès que l'utilisateur courant est entitlé — sinon elle disparaît
-- complètement (invisibilité totale, pas de teaser).

drop policy if exists sources_public_read_free on public.sources;
drop policy if exists sources_read_visible on public.sources;
create policy sources_read_visible on public.sources
  for select
  to anon, authenticated
  using (
    is_paid = false
    or public.current_user_is_entitled(id)
  );

-- ────────────────────────────────────────────────────────────────────────────
-- Resserrement RLS de `creatures` : visible ssi sa source l'est
-- ────────────────────────────────────────────────────────────────────────────
-- La policy DÉLÈGUE désormais entièrement le gating à `sources` : une créature
-- est lisible si et seulement si sa source est lisible pour le rôle courant. La
-- sous-requête sur `sources` respecte la RLS de `sources` (gratuit OU entitlé)
-- → plus besoin du littéral `is_paid = false` de 0006. Gating à un seul endroit.

drop policy if exists creatures_public_read_free on public.creatures;
drop policy if exists creatures_read_visible on public.creatures;
create policy creatures_read_visible on public.creatures
  for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.sources s
      where s.id = creatures.source_id
    )
  );

-- ────────────────────────────────────────────────────────────────────────────
-- GRANTs explicites (le défaut cloud ne ré-expose pas les nouvelles tables aux
-- rôles de la Data API). La RLS reste le garde-fou réel.
-- ────────────────────────────────────────────────────────────────────────────
-- Pas de grant à `anon` : un entitlement suppose un utilisateur authentifié.
grant select on public.source_entitlements to authenticated;
-- Pose manuelle en recette + RPC redeem PER-243 (contourne la RLS).
grant all on public.source_entitlements to service_role;
