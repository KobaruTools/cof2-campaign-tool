-- Migration 0006 — Bestiaire en base + sources gatables (PER-241)
--
-- Première tranche de la milestone « Contenu payant gaté ». Pose les deux tables
-- de contenu du bestiaire et la RLS de LECTURE PUBLIQUE du contenu GRATUIT ; le
-- gating par entitlement (contenu payant) arrive en PER-242 et s'ajoutera SANS
-- retoucher ce socle.
--
--   sources   : provenance d'un lot de contenu (livre de base/DRS, bestiaire
--               payant, atlas…). C'est la source qui décide du gating via
--               `is_paid` — donnée en base, pas constante de code. `content_version`
--               sert l'invalidation de cache (PER-244).
--   creatures : une entrée = un bloc de stats du bestiaire. Le `Creature` complet
--               est stocké en blob JSONB opaque (versionné côté données), doublé
--               de COLONNES PROJETÉES indexées pour le filtrage/tri de la liste
--               légère (lecture « deux étages » : liste projetée puis blob à la
--               demande). Pattern maison (cf. `campaigns.rules`, `characters.data`).
--
-- Écriture réservée à la `service_role` (script d'ingestion local, hors RLS) :
-- aucune policy d'écriture n'est posée, RLS activée ⇒ anon/authenticated ne
-- peuvent pas muter, la clé secrète contourne la RLS.

-- ────────────────────────────────────────────────────────────────────────────
-- Tables
-- ────────────────────────────────────────────────────────────────────────────

create table if not exists public.sources (
  id              uuid primary key default gen_random_uuid(),
  -- Slug stable, clé de contenu (référencée par le script d'ingestion). En
  -- anglais neutre côté clé, libellé affiché en français dans `name`.
  slug            text not null unique,
  -- Nom affiché de la source (français).
  name            text not null,
  -- Gating : le contenu d'une source payante n'est lisible que par un utilisateur
  -- entitlé (PER-242). Le contenu gratuit (`false`) est en lecture PUBLIQUE.
  is_paid         boolean not null default false,
  -- Version du contenu de la source, incrémentée à chaque ingestion. Sert
  -- l'invalidation de cache par manifeste (PER-244).
  content_version integer not null default 1,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table if not exists public.creatures (
  id                uuid primary key default gen_random_uuid(),
  source_id         uuid not null references public.sources (id) on delete cascade,
  -- Slug FR de la créature (`Creature.id`, ex. 'loup'). Unique DANS une source :
  -- clé d'upsert idempotente du script d'ingestion.
  slug              text not null,
  -- ── Colonnes projetées (miroir du blob) pour le filtrage/tri client sans
  --    charger le blob. Le blob `data` reste la source de vérité affichée. ──
  name              text not null,
  category          text not null,
  nc                numeric,          -- NC numérique (« 1/2 » → 0.5) ; null = gabarit sans NC.
  nc_note           text,             -- NC verbatim quand ≠ nombre simple (label de liste).
  size              text,
  nature            text[] not null default '{}',
  -- Variante rattachée à sa base (imbrication de la liste, ordre du livre).
  base_creature_id  text,
  -- Ordre d'impression du livre (index d'extraction) : reproduit fidèlement le
  -- tri « par catégorie » (catégories contiguës, base avant variantes).
  sort_order        integer not null,
  -- Le `Creature` complet, opaque, tel qu'extrait (verbatim). Rendu par
  -- `BestiaryStatBlock` sans transformation.
  data              jsonb not null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint creatures_source_slug_unique unique (source_id, slug)
);

-- Index de support (RLS + filtres/tri de la liste légère).
create index if not exists creatures_source_id_idx on public.creatures (source_id);
create index if not exists creatures_category_idx  on public.creatures (category);
create index if not exists creatures_nc_idx         on public.creatures (nc);
create index if not exists creatures_size_idx       on public.creatures (size);
create index if not exists creatures_sort_order_idx on public.creatures (sort_order);
-- Filtre par nature (tableau) : recherche d'appartenance → GIN.
create index if not exists creatures_nature_gin_idx on public.creatures using gin (nature);

-- ────────────────────────────────────────────────────────────────────────────
-- updated_at auto (réutilise le trigger de 0001)
-- ────────────────────────────────────────────────────────────────────────────

drop trigger if exists sources_touch_updated_at on public.sources;
create trigger sources_touch_updated_at
  before update on public.sources
  for each row execute function public.touch_updated_at();

drop trigger if exists creatures_touch_updated_at on public.creatures;
create trigger creatures_touch_updated_at
  before update on public.creatures
  for each row execute function public.touch_updated_at();

-- ────────────────────────────────────────────────────────────────────────────
-- RLS — lecture publique du contenu GRATUIT ; écriture service_role seule
-- ────────────────────────────────────────────────────────────────────────────

alter table public.sources   enable row level security;
alter table public.creatures enable row level security;

-- sources : une source GRATUITE est visible de tous (anon inclus). Une source
-- payante reste invisible tant que PER-242 n'ajoute pas la visibilité par
-- entitlement — pas de teaser (design verrouillé).
drop policy if exists sources_public_read_free on public.sources;
create policy sources_public_read_free on public.sources
  for select
  to anon, authenticated
  using (is_paid = false);

-- creatures : lisible si sa source est GRATUITE. La sous-requête sur `sources`
-- respecte la RLS de `sources` pour le rôle courant ⇒ seul le contenu gratuit
-- remonte. PER-242 élargira via un entitlement, sans toucher cette policy.
drop policy if exists creatures_public_read_free on public.creatures;
create policy creatures_public_read_free on public.creatures
  for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.sources s
      where s.id = creatures.source_id
        and s.is_paid = false
    )
  );

-- ────────────────────────────────────────────────────────────────────────────
-- GRANTs explicites (le nouveau défaut cloud NE ré-expose PAS automatiquement les
-- nouvelles tables aux rôles de la Data API — cf. config.toml). La RLS reste le
-- garde-fou réel ; les grants ne font qu'ouvrir la table au rôle.
-- ────────────────────────────────────────────────────────────────────────────

grant select on public.sources   to anon, authenticated;
grant select on public.creatures to anon, authenticated;
-- Ingestion locale (contourne la RLS via BYPASSRLS de service_role).
grant all on public.sources   to service_role;
grant all on public.creatures to service_role;
