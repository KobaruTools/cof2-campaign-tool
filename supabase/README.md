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

## Accès joueur par lien magique (PER-191)

- `migrations/0002_player_access.sql` — RLS **joueur** (lecture du roster de sa
  campagne + édition/création de sa seule fiche), trigger imposant `owner_id`
  = MJ de la campagne sur les fiches créées par un joueur, et table de liaison
  `player_auth_sessions` (RLS verrouillée, accès clé secrète seule) pour la
  révocation forte.
- `tests/rls_player_isolation.sql` — isolation joueur (transaction `ROLLBACK`).
  Exécuter comme le test propriétaire : doit finir sur « RLS joueur (PER-191) :
  tous les tests OK ».

Mécanique : le joueur n'a pas de compte ; le lien `/join/<join_secret>` ouvre une
**session utilisateur anonyme** Supabase à laquelle la route serveur attache
`player_id`/`campaign_id` dans `app_metadata` (posé par la clé secrète → non
falsifiable). La RLS lit ces claims. `getUser()` valide un vrai utilisateur → le
gating reste inchangé ; le proxy confine ensuite la session joueur à `/play` +
`/character/*`.

Provisionnement (en plus du socle) :

1. **Activer les connexions anonymes** sur le projet hébergé. Soit dans le
   dashboard (Authentication → Sign In / Providers → *Anonymous sign-ins*), soit
   via l'API Management (ciblé, sans écraser `site_url`) :
   ```sh
   set -a; . ./.env.local; set +a
   curl -s -X PATCH \
     -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" -H "Content-Type: application/json" \
     -d '{"external_anonymous_users_enabled": true}' \
     "https://api.supabase.com/v1/projects/<project-ref>/config/auth"
   ```
   `config.toml` a déjà `enable_anonymous_sign_ins = true` pour le dev local.
2. **`SUPABASE_SECRET_KEY`** est nécessaire côté serveur (échange du lien,
   révocation) : présente en `.env.local` **et** sur Vercel (prod).
3. Recette locale du login joueur : ajouter `http://localhost:3000/**` aux
   *Redirect URLs* Supabase.

## Bestiaire en base + sources gatables (PER-241)

- `migrations/0006_bestiary_sources.sql` — tables `sources` (`is_paid`,
  `content_version`) et `creatures` (blob JSONB + colonnes projetées), RLS
  **lecture publique du contenu gratuit** (`is_paid = false`), écriture réservée
  à la `service_role`.
- `scripts/ingest-bestiary.ts` — ingestion locale (`npm run ingest`).

Le bestiaire n'est plus embarqué dans le bundle : `BestiaryBrowser` lit la base en
deux étages (liste légère projetée + blob à la demande) via le store `bestiary`.
`src/data/creatures.ts` est conservé comme **artefact d'extraction** (lu par le
script d'ingestion), mais n'est plus ré-exporté par `@/data`.

Provisionnement (en plus du socle) :

1. **Appliquer la migration** `0006` (éditeur SQL Supabase, ou `supabase db push`).
2. **Ingérer le contenu gratuit** : `SUPABASE_SECRET_KEY` (service_role) et
   `NEXT_PUBLIC_SUPABASE_URL` doivent être en `.env.local`, puis
   ```sh
   npm run ingest
   ```
   Idempotent : ré-exécutable sans doublon (upsert sur `(source_id, slug)`),
   incrémente `content_version`, synchronise les suppressions. La `service_role`
   reste **locale** — jamais commitée ni déployée en CI.
3. **Recette** : `/bestiary` en anonyme doit afficher les 85 créatures DRS depuis
   la base ; filtres/recherche/tri instantanés (liste légère client) ; la
   sélection charge le blob de détail à la demande.

L'ingestion du futur PDF **payant** « Le Bestiaire » passera par le même script,
depuis une source distincte (`is_paid = true`, contenu hors git) — gating par
entitlement livré en PER-242 (ci-dessous).

### Gating par source : entitlements (PER-242)

- `migrations/0007_source_entitlements.sql` — table `source_entitlements
  (user_id, source_id)` (une ligne = accès accordé) + resserrement de la RLS :
  une source (et donc ses créatures) est **visible ssi** `is_paid = false` **OU**
  l'utilisateur courant possède un entitlement dessus (helper
  `current_user_is_entitled`, qui exclut les sessions anonymes via
  `is_anonymous()`). Un non-entitled ne reçoit **aucune** ligne d'une source
  payante — invisibilité totale (ni liste, ni détail, ni count). La policy
  `creatures` **délègue** entièrement le gating à `sources`.
- L'écriture de `source_entitlements` reste réservée à la `service_role` (aucune
  policy d'écriture) : pose manuelle en recette, RPC de déblocage par code en
  PER-243. Les sessions joueur anonymes (PER-191) ne peuvent donc jamais obtenir
  d'accès payant.

Recette du gating (l'octroi par code = PER-243 ; ici on pose l'entitlement à la
main) :

1. **Seeder une source de test payante** (créatures factices, aucun vrai contenu) :
   ```sh
   npm run ingest -- --with-test-source
   ```
   Crée la source `test-bestiaire-payant` (`is_paid = true`) + 2 créatures FACTICES.
2. **Vérifier l'invisibilité** : `/bestiary` en anonyme et avec un compte SANS
   entitlement → la source de test est ABSENTE (créatures factices non listées).
3. **Accorder l'accès** (SQL Supabase, `service_role`), pour un utilisateur réel :
   ```sql
   insert into public.source_entitlements (user_id, source_id)
   select '<AUTH_USER_UUID>', id from public.sources where slug = 'test-bestiaire-payant';
   ```
   → au rechargement, ce compte VOIT désormais la source de test et ses créatures.
4. **Retrait d'accès** (`delete` de la ligne) → la source disparaît du manifeste,
   le cache IndexedDB (PER-244) la purge automatiquement au chargement suivant.
5. **Nettoyage** : supprimer la source de test (`delete from public.sources where
   slug = 'test-bestiaire-payant'` — cascade sur créatures + entitlements).

### Cache persistant côté client (PER-244)

Le navigateur met en cache la liste légère et les blobs déjà consultés dans
**IndexedDB** (base `cof2-bestiary`), estampillés par la `content_version` de leur
source. Au refresh / hors-ligne, le contenu déjà vu s'affiche instantanément sans
re-requête. Le seul appel toujours frais est le **manifeste** des sources
(`sources → content_version`) : le client ne re-fetche que les sources dont la
version a bougé.

- **Recette F5** : recharger `/bestiary` → affichage immédiat depuis le cache, un
  seul appel manifeste en fond (pas de squelette).
- **Recette bump de version** : relancer `npm run ingest` (incrémente
  `content_version` de `drs`) → au prochain chargement, seule la source `drs` est
  re-fetchée. Note : l'ingestion actuelle réécrit toutes les créatures (upsert
  global), donc un bump touche l'`updated_at` de toutes ; l'invalidation FINE des
  blobs (ne jeter que les créatures réellement modifiées) ne portera ses fruits que
  si l'ingestion n'écrit un jour que les lignes changées.

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
