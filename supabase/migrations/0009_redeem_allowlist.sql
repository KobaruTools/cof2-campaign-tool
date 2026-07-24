-- Migration 0009 — Allowlist du déblocage par code (PER-243, resserrement)
--
-- Contexte : le déblocage par code (RPC `redeem_source_code`, 0008) est une capacité
-- SENSIBLE (raisons légales — la distribution de contenu payant doit rester sous
-- contrôle strict). Tant que le mécanisme n'est pas ouvert plus largement, seul le
-- PROPRIÉTAIRE doit pouvoir déclencher un déblocage, identifié par son compte
-- Supabase.
--
-- Modèle : une table `redeem_allowlist` (une ligne = « ce compte peut débloquer »).
-- La ligne du propriétaire est posée À LA MAIN sur le remote (comme les
-- `source_entitlements`), JAMAIS dans git : ce dépôt est public (KobaruTools), on n'y
-- inscrit donc AUCUN identifiant de compte. La RPC refuse tout compte absent de
-- l'allowlist — c'est une vraie barrière côté serveur, pas seulement un masquage d'UI.

-- ────────────────────────────────────────────────────────────────────────────
-- Table d'autorisation : comptes habilités à débloquer du contenu
-- ────────────────────────────────────────────────────────────────────────────

create table if not exists public.redeem_allowlist (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  -- Note d'audit libre (ex. « propriétaire » / raison de l'octroi).
  note       text,
  granted_at timestamptz not null default now()
);

-- ────────────────────────────────────────────────────────────────────────────
-- RLS : chacun ne voit QUE sa propre ligne (permet à l'UI de savoir « suis-je
-- habilité ? » sans exposer l'allowlist). Aucune policy d'écriture : la pose reste
-- réservée à la `service_role` (manuelle) — un compte ne s'auto-habilite pas.
-- ────────────────────────────────────────────────────────────────────────────

alter table public.redeem_allowlist enable row level security;

drop policy if exists redeem_allowlist_read_own on public.redeem_allowlist;
create policy redeem_allowlist_read_own on public.redeem_allowlist
  for select
  to authenticated
  using (user_id = auth.uid());

grant select on public.redeem_allowlist to authenticated;
grant all on public.redeem_allowlist to service_role;

-- ────────────────────────────────────────────────────────────────────────────
-- Resserrement de la RPC `redeem_source_code` (0008) : exige l'allowlist
-- ────────────────────────────────────────────────────────────────────────────
-- Ajoute une condition d'entrée : l'appelant doit être un compte NON anonyme ET
-- présent dans `redeem_allowlist`. Tout le reste (lecture DEFINER de la source
-- payante, insertion de l'entitlement, retour sans fuite) est inchangé.

create or replace function public.redeem_source_code(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_code   text := btrim(coalesce(p_code, ''));
  v_source record;
begin
  -- Sessions anonymes / non authentifiées : jamais de déblocage.
  if public.is_anonymous() or auth.uid() is null then
    return jsonb_build_object('ok', false);
  end if;

  -- Barrière d'habilitation : seul un compte de l'allowlist peut débloquer.
  if not exists (
    select 1 from public.redeem_allowlist a where a.user_id = auth.uid()
  ) then
    return jsonb_build_object('ok', false);
  end if;

  -- Code vide/blanc : échec propre sans toucher la base.
  if v_code = '' then
    return jsonb_build_object('ok', false);
  end if;

  -- Source PAYANTE portant ce code (comparaison insensible à la casse). DEFINER →
  -- contourne la RLS de `sources` (une source payante est invisible à l'appelant).
  select s.id, s.slug, s.name
    into v_source
    from public.sources s
   where s.is_paid = true
     and s.redeem_code is not null
     and lower(s.redeem_code) = lower(v_code)
   limit 1;

  -- Code inconnu : échec propre, aucun entitlement, sans fuite d'existence.
  if v_source.id is null then
    return jsonb_build_object('ok', false);
  end if;

  -- Pose l'entitlement de l'utilisateur COURANT (idempotent).
  insert into public.source_entitlements (user_id, source_id)
  values (auth.uid(), v_source.id)
  on conflict (user_id, source_id) do nothing;

  return jsonb_build_object(
    'ok', true,
    'source_slug', v_source.slug,
    'source_name', v_source.name
  );
end;
$$;

-- GRANTs inchangés (0008 les a déjà posés ; `create or replace` les conserve).
