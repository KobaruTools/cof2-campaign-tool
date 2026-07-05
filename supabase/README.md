# Socle Supabase (PER-187)

Fondations du service cloud multi-tenant. Modèle **perso-first** (pivot PER-180) :
la campagne est un regroupement **optionnel**, la propriété s'ancre sur
`characters.owner_id`.

## Contenu

- `migrations/0001_foundations.sql` — schéma (`campaigns`, `players`, `characters`)
  + index + trigger `updated_at` + **RLS propriétaire**.
- `tests/rls_isolation.sql` — tests d'isolation MJ↔MJ (transaction `ROLLBACK`).

Côté application :

- `src/lib/supabase/client.ts` — fabrique client **navigateur**.
- `src/lib/supabase/server.ts` — fabrique client **serveur** (Next 16, `await cookies()`).
- `src/lib/supabase/types.ts` — types de la base (alignés à la main sur la migration).

## Provisionnement (à faire par le propriétaire du projet)

Ces étapes nécessitent un compte Supabase — elles ne peuvent pas être automatisées ici.

1. **Créer le projet** sur https://supabase.com (choisir une région proche,
   free-tier). Noter l'URL du projet et les clés (Project Settings → API).
2. **Renseigner l'environnement** : copier `.env.example` → `.env.local` à la
   racine et remplir `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   (clé `sb_publishable_…`, ex-`anon`), `SUPABASE_SECRET_KEY` (clé `sb_secret_…`,
   ex-`service_role`). Ajouter les mêmes variables sur Vercel (Environment
   Variables) pour la prod.
3. **Appliquer la migration**. Au choix :
   - **Éditeur SQL Supabase** : coller le contenu de `migrations/0001_foundations.sql`
     et exécuter.
   - **CLI Supabase** (si on l'adopte) : `supabase link` puis `supabase db push`.
4. **Vérifier l'isolation** : exécuter `tests/rls_isolation.sql` (éditeur SQL ou
   `psql`). Le script doit se terminer sur « RLS isolation : tous les tests OK »
   sans lever d'exception, puis annuler ses données (`ROLLBACK`).

## Authentification CLI PAR DOSSIER (pas globale)

`supabase login` stocke un token **global** à la machine : sur un poste qui gère
plusieurs projets Supabase (comptes/organisations différents), ce token peut faire
« déborder » le mauvais compte. Pour scoper l'auth CLI à CE dossier :

1. Générer un **Personal Access Token** pour le compte propriétaire du projet
   (Dashboard → Account → Access Tokens).
2. Le mettre dans `.env.local` : `SUPABASE_ACCESS_TOKEN=sbp_…` (+ `SUPABASE_DB_PASSWORD`
   pour `db push` sans invite). La CLI **préfère** cette variable au login global.
3. Lancer les commandes CLI avec l'environnement du dossier chargé, ex. :
   `set -a; . ./.env.local; set +a; npx supabase projects list`

L'état de link (`supabase/.temp/`) et `config.toml` (`project_id`) sont déjà locaux
au dossier. Ne jamais committer `.env.local`.
