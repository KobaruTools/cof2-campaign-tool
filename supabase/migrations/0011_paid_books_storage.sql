-- Migration 0011 — Servir les PDF payants gatés par entitlement (PER-252)
--
-- Suite de la milestone « Contenu payant gaté » : rendre les renvois de source
-- (« p. N ») des créatures payantes CLIQUABLES en servant le PDF du livre dans le
-- visualiseur intégré — accessible UNIQUEMENT aux comptes ayant débloqué la source,
-- sans jamais exposer le fichier publiquement ni le committer dans git.
--
-- Approche (validée en grill le 2026-07-27) : un bucket Supabase Storage PRIVÉ
-- `paid-books`, un fichier par source à la convention de chemin `{sourceSlug}/book.pdf`.
-- La lecture est gardée par une policy RLS sur `storage.objects` qui RÉUTILISE le
-- MÊME prédicat que les créatures (`current_user_is_entitled`, PER-242) : un retrait
-- d'entitlement referme aussi le PDF, et les sessions anonymes (joueurs PER-191) sont
-- exclues (fail-safe `is_anonymous()` dans le helper).
--
-- Livraison client = TÉLÉCHARGEMENT AUTHENTIFIÉ (pas d'URL signée) : le visualiseur
-- télécharge le fichier via la session (JWT), la RLS ci-dessous décide. Aucune URL
-- publique, aucun TTL. L'upload du fichier reste réservé à la `service_role`
-- (script one-shot local, comme l'ingestion) — aucune policy d'écriture ici.

-- ────────────────────────────────────────────────────────────────────────────
-- Bucket privé `paid-books`
-- ────────────────────────────────────────────────────────────────────────────
-- `public = false` : aucun accès anonyme par URL publique. Idempotent.

insert into storage.buckets (id, name, public)
values ('paid-books', 'paid-books', false)
on conflict (id) do nothing;

-- ────────────────────────────────────────────────────────────────────────────
-- RLS de lecture : gatée par entitlement sur la source déduite du chemin
-- ────────────────────────────────────────────────────────────────────────────
-- La RLS est déjà activée sur `storage.objects` (géré par Supabase) — on ne pose
-- QUE la policy SELECT. Le slug de source est le 1er segment du chemin
-- (`{sourceSlug}/book.pdf`) : on le résout en `sources`, puis on délègue au helper
-- `current_user_is_entitled` (PER-242, `SECURITY DEFINER`). Slug inconnu → l'`exists`
-- ne trouve aucune source → refus sûr.
--
-- ⚠️ Le nom de l'objet DOIT être qualifié `objects.name` : à l'intérieur d'un
-- sous-select sur `public.sources` (qui possède AUSSI une colonne `name`), un `name`
-- nu se lierait à `sources.name` (portée interne prioritaire) et non au chemin de
-- l'objet — le slug extrait serait alors le nom du livre, jamais un slug → refus
-- systématique même pour un compte entitlé. La forme `exists` avec `objects.name`
-- qualifié lève toute ambiguïté.
--
-- Rôle `authenticated` seul (jamais `anon`) : un accès payant suppose un compte, et
-- le helper exclut de toute façon les sessions anonymes. Aucune policy d'écriture →
-- l'upload reste réservé à la `service_role` (qui contourne la RLS).

drop policy if exists paid_books_read_entitled on storage.objects;
create policy paid_books_read_entitled on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'paid-books'
    and exists (
      select 1
      from public.sources s
      where s.slug = split_part(objects.name, '/', 1)
        and public.current_user_is_entitled(s.id)
    )
  );
