-- Migration 0025 — Visibilité profil via relation d'amitié (PER-402)
--
-- Gap de la migration 0024 : `profiles_self_all` ne permet de lire QUE sa propre
-- ligne — une fois une relation créée (pending ou accepted), aucune policy ne
-- permet de lire le handle/display_name/last_seen_at de l'AUTRE partie. Sans ça,
-- la liste d'amis et les demandes en attente n'ont aucun nom à afficher.
--
-- Élargit la lecture à toute ligne `profiles` liée à l'utilisateur courant par une
-- ligne `friend_requests` (n'importe quel statut — une demande pending doit déjà
-- montrer qui a demandé). Aucune fuite d'annuaire : il faut DÉJÀ avoir une relation
-- (créée via recherche exact-match ou lien d'invitation) pour que la policy matche.

drop policy if exists profiles_visible_via_friend_request on public.profiles;
create policy profiles_visible_via_friend_request on public.profiles
  for select
  to authenticated
  using (
    not public.is_anonymous()
    and exists (
      select 1 from public.friend_requests fr
      where (fr.from_user_id = (select auth.uid()) and fr.to_user_id = profiles.id)
         or (fr.to_user_id = (select auth.uid()) and fr.from_user_id = profiles.id)
    )
  );
