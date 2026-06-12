# PRD — Éditeur / Simulateur de personnage Chroniques Oubliées Fantasy 2 (CO2)

**Statut** : validé pour implémentation (phase 1)
**Date** : 2026-06-12
**Dossier de travail** : `E:\www\cof2-character-editor`

---

## 1. Contexte et objectif

Outil web de création et d'évolution de personnages pour le jeu de rôle **Chroniques Oubliées Fantasy, 2e édition (CO2)**, destiné à une table de jeu privée (le propriétaire du projet et ses joueurs, plus le MJ).

Objectifs :
- Créer un personnage CO2 complet via un assistant guidé, sans connaître les règles par cœur.
- Faire évoluer le personnage niveau par niveau (choix de capacités dans les voies, recalcul automatique des statistiques).
- Servir d'outil de **simulation de build** : tester des combinaisons, dupliquer, comparer.
- À terme (phase 2) : permettre au MJ de consulter les fiches à jour de tous les joueurs depuis son PC.

Mots d'ordre : **très simple, facile à utiliser**. Pas de fonctionnalité au-delà du besoin réel de la table.

---

## 2. Sources de règles

| Fichier | Rôle | Statut |
|---|---|---|
| `E:\www\cof2-character-editor\CBHS_06_Chroniques_Oubliees_2_web_v2.pdf` | **Livre de base CO2** (~358 pages). Source unique et exhaustive des données de règles de la phase 1. | ✅ **EN SCOPE** |
| `E:\www\cof2-character-editor\[COF2_40]--Le-Compagnon_web_v0b.pdf` | Extension "Le Compagnon". | ❌ **HORS SCOPE — ne pas ouvrir, ne pas extraire.** Sera traité dans une itération ultérieure à la demande explicite du propriétaire. |

⚠️ **Important pour l'implémentation** : toute extraction de données se fait exclusivement depuis `CBHS_06_Chroniques_Oubliees_2_web_v2.pdf`. Ne pas confondre les deux PDF.

---

## 3. Décisions de design (validées en session de cadrage)

| # | Décision | Choix retenu | Justification |
|---|---|---|---|
| 1 | Périmètre fonctionnel | Création **+ montée de niveau** (du niveau 1 au niveau maximum prévu par le livre — à confirmer lors de l'extraction). Pas de gestion "en cours de partie" (PV courants, inventaire vivant, jets de dés). | Le système de voies/rangs rend la montée de niveau fastidieuse à la main : c'est là qu'est la valeur. |
| 2 | Stack | Next.js + TypeScript + zustand, **100% client** en phase 1 (aucune API, aucun backend). Données de règles en fichiers statiques. | Stack la plus rodée du propriétaire ; migration Supabase triviale en phase 2. |
| 3 | Données extraites | Tout ce qui sert à créer/faire évoluer un perso **+ le catalogue complet armes/armures/équipement**. Textes des capacités stockés **en verbatim**. | L'équipement de départ référence le catalogue ; la défense dépend de l'armure. Verbatim acceptable car usage privé. |
| 4 | UX | **Hybride** : wizard pas-à-pas pour la création initiale et la montée de niveau, puis **fiche entièrement éditable** post-création. | Le wizard guide sans erreur possible ; la fiche libre permet corrections et expérimentation. |
| 5 | Caractéristiques | **Saisie libre uniquement.** Aucune méthode de génération simulée (pas de lancer de dés virtuel, pas de répartition de points assistée). | Les dés se lancent en vrai à la table ; on ne fait que reporter les chiffres. |
| 6 | Persistance phase 1 | **localStorage** (multi-personnages, sauvegarde auto) **+ export/import JSON** par personnage. | Filet de sécurité, partage entre machines, et définit le format sérialisé qui partira vers Supabase en phase 2. |
| 7 | Validation des règles | **Hybride** : wizard **bloquant** (ne propose que les choix légaux) ; fiche éditable **permissive avec avertissements visibles** quand la fiche dévie des règles officielles. | Permet règles maison et dérogations MJ sans se battre contre l'outil. |
| 8 | Audience / déploiement | Phase 1 : usage local. Phase 2 : déployé en ligne **privé** (Vercel), pour la table uniquement. Jamais public en l'état (cf. §11 contraintes légales). | |
| 9 | Workflow d'extraction | **Extraction exhaustive en une passe** : schéma de données défini d'abord, puis lecture complète du PDF et production de tous les fichiers de données, relus/validés par le propriétaire **avant** de construire l'UI dessus. | Les données sont très interconnectées (profil→voies→capacités, équipement de départ→catalogue) ; l'incrémental multiplierait les retours en arrière. |
| 10 | Sortie | **Écran uniquement.** Pas de vue imprimable (réimprimer à chaque montée de niveau est inacceptable). Génération d'un vrai PDF type feuille officielle : hors scope, éventuellement bien plus tard. | La fiche à l'écran est la source de vérité. |
| 11 | UI | **MUI** (Material UI), comme `fellowship-builder`. Customisation/ambiance médiéval-fantasy : éventuellement plus tard, composant par composant. | Vitesse de développement prioritaire. |
| 12 | Appareils | **Desktop-first, responsive "passif"** : on développe pour grand écran en utilisant systématiquement les primitives responsive de MUI (`Grid`, `Stack`), sans largeurs figées ni tableaux intraversables. Pas de polish mobile en phase 1. | Consultation mobile "lisible mais pas jolie" suffit jusqu'à la phase 2. |
| 13 | Caractéristiques : pas de couche score → modificateur (tranché le 2026-06-12) | On suit le **livre tel quel** : chaque caractéristique est une **valeur unique** (-3 à +5, création de -2 à +5) ajoutée directement au d20 et consommée directement par les formules dérivées (DEF, attaques, PV, DR, PC, PM, init). Les ajustements ("+1 en CON" d'un peuple ou d'une capacité) s'appliquent à cette valeur. | Question soulevée puis retirée par le propriétaire : CO2 a simplifié l'ancien système score/modificateur qu'il connaissait — il n'y a plus que des "modificateurs". Vérifié dans le livre : p. 26-28 (échelle -3..+5), p. 202 (d20 + valeur), prétirés p. 349 (valeur unique par carac). **Ne pas réintroduire de scores.** |

---

## 4. Utilisateurs et cas d'usage

**Utilisateurs** : les joueurs de la table (création/évolution de leur perso) et le MJ (consultation — surtout en phase 2). Tous francophones ; **l'app est en français uniquement**.

Cas d'usage phase 1 :
1. **Créer un personnage niveau 1** de bout en bout via le wizard, en reportant les caractéristiques lancées aux vrais dés.
2. **Monter un personnage d'un niveau** : l'outil présente les choix légaux (nouvelles capacités selon les rangs/voies accessibles), applique les gains automatiques (PV, etc.).
3. **Corriger / ajuster librement** une fiche existante (erreur de saisie, règle maison validée par le MJ) — avec avertissement visuel si la fiche dévie des règles.
4. **Simuler des builds** : dupliquer un personnage, pousser la copie à un niveau cible, comparer des chemins de voies différents.
5. **Sauvegarder / restaurer** : les personnages persistent dans le navigateur ; export d'un perso en fichier `.json`, réimport sur une autre machine.

Hors scope phase 1 : comptes utilisateurs, partage en ligne, gestion en cours de partie (PV courants, états, jets), impression, PDF, Le Compagnon, contenu hors livre de base, multilingue.

**Hors scope phase 1, à ne pas oublier (décidé le 2026-06-12)** : le *système du prêtre spécialiste et des religions d'Osgild* (tables des armes sacrées et capacités divines par divinité, livre de base p. 126-127) n'est **pas** modélisé en phase 1. Les pages ont été lues mais aucune entité « divinité » n'existe dans le schéma. Le prêtre reste jouable via ses voies normales ; seul le sous-système « spécialiste d'un dieu » est reporté. À rouvrir explicitement si la table en a besoin.

---

## 5. Spécifications fonctionnelles

### 5.1 Gestion des personnages (écran d'accueil)

- Liste des personnages sauvegardés : nom, peuple, profil, niveau, date de dernière modification.
- Actions : **Créer** (lance le wizard), **Ouvrir** (fiche), **Dupliquer** (copie indépendante, suffixe "(copie)"), **Supprimer** (avec confirmation), **Exporter JSON**, **Importer JSON**.
- L'import valide le fichier contre le schéma de personnage (version incluse, cf. §7) et refuse proprement un fichier invalide avec un message clair.

### 5.2 Wizard de création (bloquant)

Étapes dans l'ordre du livre — **l'ordre et le contenu exacts des étapes seront affinés lors de l'extraction des règles**, mais la structure attendue est :

1. **Peuple** : choix dans la liste extraite du livre ; affichage des modificateurs et traits raciaux ; application automatique.
2. **Profil** : choix du profil ; affichage dé de vie, armes/armures autorisées, voies associées.
3. **Caractéristiques** : champs de **saisie libre** des valeurs (-3 à +5, décision #13 — l'utilisateur reporte ce qui a été déterminé à la table). Les statistiques dérivées s'affichent en direct. Aucune contrainte de méthode ; une simple indication de plage plausible peut être affichée à titre informatif sans bloquer.
4. **Voies et capacités de niveau 1** : sélection des capacités de départ selon les règles exactes du livre (nombre de points/choix au niveau 1 — à confirmer à l'extraction). Seuls les choix légaux sont proposés.
5. **Équipement** : équipement de départ du profil + ajustements depuis le catalogue armes/armures/équipement.
6. **Identité et finitions** : nom, sexe/âge/description libre, et tout champ d'identité prévu par le livre.
7. **Récapitulatif** : fiche complète calculée, bouton "Créer le personnage".

Comportement transverse :
- Navigation avant/arrière sans perte de saisie ; le wizard bloque l'étape suivante tant que l'étape courante n'est pas valide.
- Un brouillon de wizard abandonné en cours de route est conservé (localStorage) et proposé à la reprise.

### 5.3 Montée de niveau (wizard bloquant)

- Bouton "Monter au niveau N+1" sur la fiche, désactivé au niveau maximum du livre.
- Mini-wizard : gains automatiques (PV selon dé de vie/règles CO2 — formule exacte à extraire) + choix de la ou des nouvelles capacités, en ne proposant que les options légales (rangs dans l'ordre, prérequis de niveau pour voies de prestige le cas échéant, etc. — règles exactes à extraire).
- L'historique des choix par niveau est conservé dans le modèle de données (permet d'afficher "qu'ai-je pris au niveau 4 ?" et, plus tard, un éventuel "annuler le dernier niveau").

### 5.4 Fiche de personnage (éditable, permissive)

- Vue unique présentant : identité, peuple/profil/niveau, caractéristiques et modificateurs, statistiques dérivées (PV max, défense, initiative, scores d'attaque, ressources type mana/points selon les règles CO2 — liste exacte issue de l'extraction), voies avec capacités acquises (texte verbatim consultable), équipement.
- **Tout est éditable en place**, y compris des choix faits dans le wizard. Les valeurs dérivées se recalculent en direct.
- **Avertissements non bloquants** : quand l'état de la fiche dévie des règles (capacité prise sans le rang précédent, nombre de capacités incohérent avec le niveau, caractéristique hors plage du livre, équipement non autorisé par le profil…), un badge/encadré le signale clairement, sans empêcher la sauvegarde. La liste exacte des validations découle des règles extraites.
- Possibilité de **surcharger manuellement une valeur dérivée** (cas règle maison) : la surcharge est signalée visuellement et réversible ("revenir au calcul automatique").

### 5.5 Calculs dérivés

Toutes les formules (PV max, défense, initiative, attaque au contact/à distance/magique, ressources, etc.) sont extraites du livre et implémentées dans un **module de calcul pur** (fonctions TypeScript sans dépendance UI), testable unitairement. La fiche et le wizard consomment ce module — une seule source de vérité pour les maths.

---

## 6. Données de règles

### 6.1 Workflow d'extraction (décision #9)

1. **Définir le schéma** TypeScript des entités de règles (voir 6.2) — première tâche de l'implémentation.
2. **Lire l'intégralité du PDF de base** et produire tous les fichiers de données en une passe.
3. **Relecture/validation par le propriétaire** (qui connaît le jeu) avant toute construction d'UI s'appuyant sur ces données.
4. Toute donnée incertaine ou ambiguë lors de l'extraction est marquée `// TODO(extraction): page X — à vérifier` plutôt que devinée.

⚠️ Le PDF a une mise en page magazine (colonnes, encadrés) : l'extraction est une **lecture attentive**, pas un parsing automatique. Chaque entité extraite référence sa **page source** dans le PDF (champ `sourcePage`) pour faciliter la relecture et les corrections futures.

### 6.2 Entités attendues (schéma indicatif — à affiner contre le livre réel)

- **Peuple** : nom, modificateurs de caractéristiques, traits/capacités raciales, description (verbatim), `sourcePage`.
- **Profil** : nom, dé de vie, armes/armures autorisées, voies associées, équipement de départ, description, `sourcePage`.
- **Voie** : nom, type (profil / peuple / prestige / autre — selon ce que CO2 définit réellement), profil(s) ou condition d'accès, liste ordonnée de capacités par rang, `sourcePage`.
- **Capacité** : nom, rang, voie parente, texte verbatim complet, métadonnées mécaniques utiles au moteur (limitée/sort/passive… selon la taxonomie réelle du livre), `sourcePage`.
- **Arme / Armure / Équipement** : nom, catégorie, dégâts ou valeur de défense, propriétés, prix, `sourcePage`.
- **Règles de progression** : table par niveau (capacités gagnées, PV, éventuels bonus) telle que définie par le livre.
- **Formules dérivées** : encodées dans le module de calcul (§5.5), documentées avec leur page source en commentaire.

Format : fichiers TypeScript typés (ou JSON + types) sous `src/data/`, un fichier par domaine (`peuples.ts`, `profils.ts`, `voies.ts`, `equipement.ts`, …). Pas de base de données pour les règles — ce sont des données statiques versionnées avec le code.

### 6.3 Statut légal du contenu

Textes stockés **en verbatim** (décision #3) : acceptable pour un usage privé de table (équivalent numérique de la photocopie de sa page de voie). **Contrainte connue** : si l'outil devenait public un jour, il faudrait soit obtenir l'accord de Black Book Éditions, soit réécrire les textes en résumés mécaniques (chantier de données, pas d'architecture — le champ verbatim serait remplacé, le schéma tient).

---

## 7. Modèle de données « Personnage »

Le personnage est un objet **entièrement sérialisable en JSON** (contrainte structurante pour localStorage, export/import et la future migration Supabase).

Principes :
- Champ **`schemaVersion`** (entier) en tête : tout import/chargement passe par une étape de migration si la version est ancienne. Les migrations sont conservées dans le code dès la première évolution du schéma.
- Le personnage stocke des **références** aux données de règles (ids de peuple, profil, capacités) + ses **saisies propres** (caractéristiques, nom, équipement choisi, surcharges manuelles, historique des montées de niveau) — jamais de copie des textes de règles.
- Les valeurs dérivées **ne sont pas stockées** (recalculées à l'affichage), sauf surcharges manuelles explicites (§5.4).
- Un champ `notes` libre pour le joueur.

Esquisse (à affiner pendant l'implémentation) :

```ts
interface Character {
  schemaVersion: number;
  id: string;            // uuid
  name: string;
  identity: { /* sexe, âge, description… selon champs du livre */ };
  peupleId: string;
  profilId: string;
  niveau: number;
  caracteristiques: Record<CaracId, number>;  // saisie libre
  capaciteIds: string[];                      // capacités acquises
  levelUpHistory: Array<{ niveau: number; choix: string[] }>;
  equipment: Array<{ itemId: string; quantity: number } | CustomItem>;
  overrides: Partial<Record<DerivedStatId, number>>; // surcharges manuelles
  notes: string;
  createdAt: string;     // ISO
  updatedAt: string;     // ISO
}
```

---

## 8. Architecture technique

- **Next.js** (App Router) + **TypeScript strict**. Aucune route API en phase 1 — l'app est un client statique.
- **zustand** avec middleware `persist` (localStorage) pour le store des personnages et le brouillon de wizard.
- **MUI** pour l'UI ; thème par défaut acceptable, customisation plus tard.
- **Module de calcul pur** (`src/lib/engine/` ou équivalent) : création, dérivation des stats, validation des règles (légalité des choix, génération des avertissements). Testé unitairement (Vitest ou Jest) — c'est la partie la plus critique du projet.
- **Données de règles** : `src/data/`, statiques, typées, avec `sourcePage`.
- Pas d'auth, pas de variable d'environnement, pas de service externe en phase 1.

Organisation indicative :

```
cof2-character-editor/
├── PRD.md                  ← ce document
├── CLAUDE.md               ← contexte projet pour Claude Code
├── CBHS_06_Chroniques_Oubliees_2_web_v2.pdf      ← livre de base (EN SCOPE)
├── [COF2_40]--Le-Compagnon_web_v0b.pdf           ← extension (HORS SCOPE)
└── app/                    ← projet Next.js (créé à l'implémentation)
    ├── src/data/           ← données de règles extraites
    ├── src/lib/engine/     ← calculs, validation, migrations de schéma
    ├── src/stores/         ← zustand
    └── src/app/            ← écrans : accueil, wizard, fiche
```

*(Le projet Next.js peut aussi vivre à la racine du dossier ; à trancher au démarrage de l'implémentation. Les deux PDF doivent rester accessibles mais exclus du bundle et du dépôt git — `.gitignore`.)*

---

## 9. Plan d'implémentation suggéré (jalons)

1. **J1 — Schéma des données de règles** : types TypeScript des entités (§6.2), validés contre un survol du sommaire du PDF.
2. **J2 — Extraction exhaustive** : lecture complète du livre de base, production de tous les fichiers `src/data/`, marquage des incertitudes. **Point de validation : relecture par le propriétaire.**
3. **J3 — Moteur** : modèle Personnage, calculs dérivés, règles de légalité/avertissements, migrations de schéma. Tests unitaires.
4. **J4 — Socle app** : projet Next.js + MUI + zustand persist ; écran d'accueil (liste, créer, dupliquer, supprimer, export/import JSON).
5. **J5 — Wizard de création** (bloquant, brouillon repris).
6. **J6 — Fiche de personnage** (éditable, permissive, avertissements, surcharges).
7. **J7 — Montée de niveau** (mini-wizard bloquant, historique).
8. **J8 — Finitions** : passe responsive passive, messages d'erreur, polish léger.

Chaque jalon est livrable et testable indépendamment ; l'ordre J2 → J3 → UI est volontaire (décision #9 : les données d'abord).

---

## 10. Critères d'acceptation (phase 1)

- [ ] Créer un personnage niveau 1 complet via le wizard sans consulter le livre, en moins de ~10 minutes.
- [ ] Toutes les statistiques dérivées affichées correspondent aux règles du livre de base (vérification croisée sur au moins 2 personnages de profils différents, faite avec le propriétaire).
- [ ] Monter un personnage du niveau 1 au niveau maximum sans jamais pouvoir faire un choix illégal dans le wizard.
- [ ] Modifier librement une fiche et voir apparaître/disparaître les avertissements de conformité.
- [ ] Fermer le navigateur et retrouver tous ses personnages.
- [ ] Exporter un perso en JSON, le supprimer, le réimporter à l'identique.
- [ ] Le Compagnon n'apparaît nulle part dans les données.

---

## 11. Phase 2 (cadrage ultérieur — hors scope de ce PRD)

Esquisse pour mémoire, à re-cadrer le moment venu :
- **Supabase** : persistance des personnages en base, remplaçant/complétant le localStorage (le schéma sérialisable du §7 est conçu pour migrer tel quel).
- **Auth** légère (la table de jeu uniquement) et **déploiement Vercel privé**.
- **Vue MJ** : consultation des fiches de tous les joueurs.
- Éventuellement ensuite : intégration du **Compagnon**, génération PDF type feuille officielle, polish mobile, customisation visuelle.
