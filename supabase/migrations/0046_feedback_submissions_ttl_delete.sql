-- Migration 0046 — Purge paresseuse des lignes feedback_submissions expirées
--
-- Pas de vrai TTL natif en Postgres et le projet a déjà écarté pg_cron à deux
-- reprises (migrations 0012/0013, « SANS cron ») au profit d'un nettoyage
-- paresseux déclenché par le trafic normal. Même choix ici : `/api/feedback`
-- purge ses propres lignes de plus de 15 jours juste avant chaque insertion
-- (PER-510). Un ticket Linear vieux de 15 jours est presque toujours résolu
-- (Done/Canceled/supprimé) — la ligne de suivi n'a plus d'utilité.
--
-- Ces policies DELETE reprennent exactement le scoping des policies SELECT
-- existantes (owner_user_id = auth.uid() / owns_player(player_id)) : chaque
-- soumetteur ne peut purger QUE ses propres lignes expirées, jamais celles
-- d'un autre.

drop policy if exists feedback_submissions_owner_delete_expired on public.feedback_submissions;
create policy feedback_submissions_owner_delete_expired on public.feedback_submissions
  for delete
  to authenticated
  using (owner_user_id = (select auth.uid()) and created_at < now() - interval '15 days');

drop policy if exists feedback_submissions_player_delete_expired on public.feedback_submissions;
create policy feedback_submissions_player_delete_expired on public.feedback_submissions
  for delete
  to authenticated
  using (player_id is not null and public.owns_player(player_id) and created_at < now() - interval '15 days');
