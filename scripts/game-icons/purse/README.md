# Générateur de l'icône « bourse »

Télécharge le SVG de [game-icons.net](https://game-icons.net) (licence CC BY 3.0),
le nettoie (fond retiré, couleur neutralisée en `currentColor`) et régénère
`src/lib/ui/purseIcon.ts`.

Jeu d'une **seule** icône (le sac à monnaie affiché en tête du bloc « Inventaire ») :
le fichier généré exporte des constantes uniques (`PURSE_ICON_PATH`,
`PURSE_ICON_SOURCE`) plutôt qu'une table indexée. L'affichage passe par le composant
`<PurseIcon>`.

## Correspondance

Le fichier `map.tsv` associe la clé `purse` à son fichier source
(`<auteur>/<icone>.svg`) dans le dépôt
[game-icons/icons](https://github.com/game-icons/icons).

## Régénérer

```sh
cd scripts/game-icons/purse
# 1. (re)télécharger le SVG brut dans ./gi-raw/
mkdir -p gi-raw
while IFS=$'\t' read -r id path; do
  [ -z "$id" ] && continue
  curl -fsS "https://raw.githubusercontent.com/game-icons/icons/master/$path" -o "gi-raw/$id.svg"
done < map.tsv
# 2. générer le fichier TS
node gen.mjs
# 3. copier le résultat
cp purseIcon.ts ../../../src/lib/ui/purseIcon.ts
```

Toute nouvelle icône doit venir de game-icons.net (source unique, licence unique)
et être reportée dans `NOTICE.md`.
