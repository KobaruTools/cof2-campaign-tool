# Générateur des icônes de sous-types d'arme

Télécharge les SVG de [game-icons.net](https://game-icons.net) (licence CC BY 3.0),
les nettoie (fond retiré, couleur neutralisée en `currentColor`) et régénère
`src/lib/ui/weaponKindIcons.ts`.

Même chaîne que `scripts/game-icons/item-types`, mais un cran plus fin : toutes les armes
partageaient l'unique icône du type `weapon` (une épée), ce qui rendait l'inventaire illisible.
Chaque **sous-type d'arme** (`WeaponIconKind`, cf. `src/lib/ui/weaponKind.ts`) a désormais la
sienne — épée, dague, hache, marteau, masse, fléau, arme d'hast, trident, faux, pioche, bâton,
mains nues, arc, arbalète, fronde, arme à poudre, canon, arme de jet, poêle, rouleau.

La résolution arme → sous-type est PURE et dérivée des données (`weaponFamilies`, `rangedKind`
et une poignée d'`id`), cf. `weaponIconKind()`.

## Correspondance

`map.tsv` associe chaque `WeaponIconKind` à son fichier source (`<auteur>/<icone>.svg`)
dans le dépôt [game-icons/icons](https://github.com/game-icons/icons).

Deux choix méritent une note, le dépôt n'ayant pas d'icône dédiée :

- **arbalète** → `skoll/ballista.svg` : aucune « crossbow » n'existe chez game-icons ; la
  baliste (arbalète montée) est la seule silhouette qui se lit comme une arbalète. La baliste
  du catalogue (`rangedKind: 'crossbow'`) y retombe donc naturellement, ce qui est exact.
- **arme de jet** → `delapouite/spear-feather.svg` : `lorc/thrown-spear.svg` dessine en fait
  une lame en croissant. Seul le javelot atterrit dans ce sous-type (dagues, hachette et lances
  lancées sont captées avant par leur famille de contact).

## Régénérer

```sh
cd scripts/game-icons/weapon-kinds
mkdir -p gi-raw
while IFS=$'\t' read -r id path; do
  [ -z "$id" ] && continue
  curl -fsS "https://raw.githubusercontent.com/game-icons/icons/master/$path" -o "gi-raw/$id.svg"
done < map.tsv
node gen.mjs
cp weaponKindIcons.ts ../../../src/lib/ui/weaponKindIcons.ts
```

Toute nouvelle icône doit venir de game-icons.net (source unique, licence unique).
La table `WEAPON_KIND_ICON_SOURCES` du fichier généré trace la provenance (audit / attribution).
