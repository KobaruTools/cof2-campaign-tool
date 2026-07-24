-- Migration 0010 — Retrait par l'utilisateur de son propre entitlement (PER-243)
--
-- Besoin (recette / gestion de compte) : pouvoir lister et SUPPRIMER ses propres
-- déblocages depuis `/account`, notamment pour rejouer des tests. Retirer son propre
-- accès est une action INOFFENSIVE (on ne fait que se re-fermer une porte) — à
-- l'inverse de l'OCTROI, qui reste verrouillé (RPC + allowlist, 0008/0009).
--
-- On ajoute donc UNIQUEMENT une policy DELETE bornée à ses propres lignes. L'octroi
-- (INSERT) reste sans policy → impossible via l'API, seul le chemin RPC l'ouvre.

drop policy if exists source_entitlements_delete_own on public.source_entitlements;
create policy source_entitlements_delete_own on public.source_entitlements
  for delete
  to authenticated
  using (user_id = auth.uid());

grant delete on public.source_entitlements to authenticated;
