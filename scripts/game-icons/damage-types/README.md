# Générateur des icônes de types de dégât

Télécharge les SVG de [game-icons.net](https://game-icons.net) (licence CC BY 3.0),
les nettoie (fond retiré, couleur neutralisée en `currentColor`) et régénère
`src/lib/ui/damageTypeIcons.ts`.

Même chaîne que `scripts/game-icons/derived-stats`, pour les **types de dégât
réductibles** (`ResistibleDamageType` : feu, froid, foudre, acide, physique,
poison, maladie, etc.). L'affichage passe par le composant `<DamageTypeIcon>`,
utilisé dans les puces de réduction/immunité de la carte Défense (PER-137).

## Correspondance

`map.tsv` associe chaque `ResistibleDamageType` (cf. `src/data/schema.ts`) à son
fichier source (`<auteur>/<icone>.svg`) dans le dépôt
[game-icons/icons](https://github.com/game-icons/icons).

## Régénérer

```sh
cd scripts/game-icons/damage-types
mkdir -p gi-raw
while IFS=$'\t' read -r id path; do
  [ -z "$id" ] && continue
  curl -fsS "https://raw.githubusercontent.com/game-icons/icons/master/$path" -o "gi-raw/$id.svg"
done < map.tsv
node gen.mjs
cp damageTypeIcons.ts ../../../src/lib/ui/damageTypeIcons.ts
```

Toute nouvelle icône doit venir de game-icons.net (source unique, licence unique).
La table `DAMAGE_TYPE_ICON_SOURCES` du fichier généré trace la provenance (audit / attribution).
