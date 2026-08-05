# Générateur des icônes de sous-catégorie d'objet

Télécharge les SVG de [game-icons.net](https://game-icons.net) (licence CC BY 3.0),
les nettoie (fond retiré, couleur neutralisée en `currentColor`) et régénère
`src/lib/ui/itemIcons.ts`.

Troisième étage de la même chaîne que `scripts/game-icons/item-types` (7 types d'objet)
et `scripts/game-icons/weapon-kinds` (20 sous-types d'arme) : ici les **sous-catégories**
des objets qui ne sont pas des armes — armures, boucliers, équipement — plus un jeu
d'icônes « libres » (parchemin, gemmes, anneau, cape…) qui n'existent pas au catalogue
mais que le joueur peut choisir pour un objet personnalisé.

Le vocabulaire d'ids est dans `src/data/item-icons.ts` : c'est de la **donnée** (chaque
objet du catalogue y référence son icône via `EquipmentItem.icon`), pas de l'UI. La
résolution ligne d'inventaire → icône et le rendu vivent dans `src/lib/ui/itemIcon.ts`
et le composant `src/components/ItemIcon.tsx`.

## Correspondance

`map.tsv` associe chaque `ItemSubcategoryIcon` à son fichier source
(`<auteur>/<icone>.svg`) dans le dépôt [game-icons/icons](https://github.com/game-icons/icons).

Quelques choix méritent une note, faute d'équivalent exact dans le dépôt :

- `lamp-oil` → `delapouite/amphora.svg` : les icônes « oil » du dépôt sont des bidons
  industriels ; une amphore est la bonne époque.
- `waterskin` → `delapouite/jug.svg` : pas d'outre ni de gourde ; `water-bottle` est une
  bouteille en plastique.
- `precious-metal` → `delapouite/gold-stack.svg` : le durium est un métal (lingots), pas
  un objet fini — aucune icône « lingot » n'existe.
- `octopus` → `lorc/octopus.svg` : pour le pnoulpe, « une sorte de petit poulpe » (p. 195).

## Régénérer

```sh
cd scripts/game-icons/item-icons
mkdir -p gi-raw
while IFS=$'\t' read -r id path; do
  [ -z "$id" ] && continue
  curl -fsS "https://raw.githubusercontent.com/game-icons/icons/master/$path" -o "gi-raw/$id.svg"
done < map.tsv
node gen.mjs
cp itemIcons.ts ../../../src/lib/ui/itemIcons.ts
```

Toute nouvelle icône doit venir de game-icons.net (source unique, licence unique).
La table `ITEM_SUBCATEGORY_ICON_SOURCES` du fichier généré trace la provenance
(audit / attribution) et doit être reflétée dans `NOTICE.md`.
