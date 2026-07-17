# Générateur des icônes de types d'objet

Télécharge les SVG de [game-icons.net](https://game-icons.net) (licence CC BY 3.0),
les nettoie (fond retiré, couleur neutralisée en `currentColor`) et régénère
`src/lib/ui/itemTypeIcons.ts`.

Même chaîne que `scripts/game-icons/damage-types`, pour les **7 types d'objet**
d'inventaire (`ItemType` : arme, armure, bouclier, consommable, équipement, trésor,
divers ; cf. `src/lib/character/types.ts`). L'affichage passe par le composant
`<ItemTypeIcon>`, utilisé à gauche du nom de chaque ligne d'inventaire (PER-213).

## Correspondance

`map.tsv` associe chaque `ItemType` à son fichier source (`<auteur>/<icone>.svg`)
dans le dépôt [game-icons/icons](https://github.com/game-icons/icons).

## Régénérer

```sh
cd scripts/game-icons/item-types
mkdir -p gi-raw
while IFS=$'\t' read -r id path; do
  [ -z "$id" ] && continue
  curl -fsS "https://raw.githubusercontent.com/game-icons/icons/master/$path" -o "gi-raw/$id.svg"
done < map.tsv
node gen.mjs
cp itemTypeIcons.ts ../../../src/lib/ui/itemTypeIcons.ts
```

Toute nouvelle icône doit venir de game-icons.net (source unique, licence unique).
La table `ITEM_TYPE_ICON_SOURCES` du fichier généré trace la provenance (audit / attribution).
