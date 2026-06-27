# Générateur des icônes de peuple

Télécharge les SVG de [game-icons.net](https://game-icons.net) (licence CC BY 3.0),
les nettoie (fond retiré, couleur neutralisée en `currentColor`) et régénère
`src/lib/ui/ancestryIcons.ts`.

## Correspondance

Le fichier `map.tsv` associe chaque `id` de voie de peuple à son fichier source
(`<auteur>/<icone>.svg`) dans le dépôt [game-icons/icons](https://github.com/game-icons/icons).

## Régénérer

```sh
cd scripts/game-icons/ancestries
# 1. (re)télécharger les SVG bruts dans ./gi-raw/
mkdir -p gi-raw
while IFS=$'\t' read -r id path; do
  [ -z "$id" ] && continue
  curl -fsS "https://raw.githubusercontent.com/game-icons/icons/master/$path" -o "gi-raw/$id.svg"
done < map.tsv
# 2. générer le fichier TS
node gen.mjs
# 3. copier le résultat
cp ancestryIcons.ts ../../../src/lib/ui/ancestryIcons.ts
```

Toute nouvelle icône doit venir de game-icons.net (source unique, licence unique)
et être ajoutée à `map.tsv` puis reportée dans `NOTICE.md`.
