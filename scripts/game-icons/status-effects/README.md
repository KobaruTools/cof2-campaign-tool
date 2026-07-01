# Générateur des icônes d'immunités d'état

Télécharge les SVG de [game-icons.net](https://game-icons.net) (licence CC BY 3.0),
les nettoie (fond retiré, couleur neutralisée en `currentColor`) et régénère
`src/lib/ui/statusEffectIcons.ts`.

Même chaîne que `scripts/game-icons/damage-types`, mais pour les **immunités
d'état** (`ImmunityId` : peur, charme/possession, ralenti, immobilisé, sommeil
magique). L'affichage passe par le composant `<StatusEffectIcon>`, utilisé dans
les puces d'immunité de la carte Défense à la place du bouclier générique.

## Correspondance

`map.tsv` associe chaque `ImmunityId` (cf. `src/data/schema.ts`) à son fichier
source (`<auteur>/<icone>.svg`) dans le dépôt
[game-icons/icons](https://github.com/game-icons/icons).

## Régénérer

```sh
cd scripts/game-icons/status-effects
mkdir -p gi-raw
while IFS=$'\t' read -r id path; do
  [ -z "$id" ] && continue
  curl -fsS "https://raw.githubusercontent.com/game-icons/icons/master/$path" -o "gi-raw/$id.svg"
done < map.tsv
node gen.mjs
cp statusEffectIcons.ts ../../../src/lib/ui/statusEffectIcons.ts
```

Toute nouvelle icône doit venir de game-icons.net (source unique, licence unique).
La table `STATUS_EFFECT_ICON_SOURCES` du fichier généré trace la provenance (audit / attribution).
