# Icônes — générateurs (source : game-icons.net)

Outillage **dev uniquement** pour intégrer des icônes [game-icons.net](https://game-icons.net)
(licence [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/)) dans l'app.

> ⚠️ Rien ici n'est nécessaire au runtime ni au déploiement. Le seul artefact utile
> est le fichier **`.ts` généré** (committé sous `src/lib/ui/`), qui embarque le
> markup SVG en dur — les icônes sont rendues *inline*, sans fichier image servi ni
> requête réseau. Ces scripts servent juste à (re)générer ces `.ts` et à tracer la
> provenance des icônes pour l'attribution (`NOTICE.md`).

## Jeux d'icônes

| Dossier | Génère | Composant d'affichage | Clés (`map.tsv`) |
| --- | --- | --- | --- |
| [`classes/`](./classes) | `src/lib/ui/classIcons.ts` | `<ClassIcon>` | id de profil |
| [`ancestries/`](./ancestries) | `src/lib/ui/ancestryIcons.ts` | `<AncestryIcon>` | id de voie de peuple |
| [`derived-stats/`](./derived-stats) | `src/lib/ui/derivedStatIcons.ts` | `<DerivedStatIcon>` | `DerivedStatId` |
| [`dice/`](./dice) | `src/lib/ui/diceIcons.ts` | `<DieIcon>` | `Die` (`d4`…`d20`) |
| [`abilities/`](./abilities) | `src/lib/ui/abilityIcons.ts` | `<AbilityIcon>` | `AbilityId` |

Chaque dossier contient le même trio : `map.tsv` (correspondance clé → fichier
source `<auteur>/<icône>.svg`), `gen.mjs` (téléchargement + nettoyage + écriture
du `.ts`), et un `README.md` détaillant la commande de régénération. Les SVG bruts
téléchargés (`gi-raw/`) et le `.ts` produit en local sont gitignorés ; on ne
committe que la copie dans `src/lib/ui/`.

## Méthode (principe commun)

1. Repérer l'icône voulue sur game-icons.net et noter son chemin `<auteur>/<icône>`
   dans le dépôt [game-icons/icons](https://github.com/game-icons/icons).
2. L'ajouter à `map.tsv` du jeu concerné (`<clé>\t<auteur>/<icône>.svg`).
3. Régénérer (cf. README du dossier) : `gen.mjs` télécharge le SVG, **retire le
   rect de fond noir**, **neutralise `fill="#fff"`** (l'icône hérite alors de
   `currentColor`, ce qui permet de la recolorer côté composant), puis écrit le
   `.ts` (markup + table des sources `*_SOURCES` pour l'audit).
4. Copier le `.ts` dans `src/lib/ui/`.
5. Reporter la nouvelle icône (clé → fichier → auteur) dans `NOTICE.md`.

## Ajouter un nouveau jeu d'icônes

Copier un dossier existant (le plus proche du besoin), puis adapter :

- `map.tsv` : les nouvelles correspondances clé → source.
- `gen.mjs` : le nom de la constante exportée et du fichier `.ts` de sortie.
- un composant d'affichage dédié sur le modèle de `ClassIcon` / `DerivedStatIcon`.
- une section dans `NOTICE.md`.

Règle d'or : **toutes les icônes viennent de game-icons.net** (source unique,
licence unique), pour garder un style cohérent et une attribution simple.
