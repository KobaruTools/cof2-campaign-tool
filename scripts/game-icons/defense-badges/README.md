# Générateur des icônes de badges défensifs

Télécharge les SVG de [game-icons.net](https://game-icons.net) (licence CC BY 3.0),
les nettoie (fond retiré, couleur neutralisée en `currentColor`) et régénère
`src/lib/ui/defenseBadgeIcons.ts`.

Même chaîne que `scripts/game-icons/status-effects`, mais pour les icônes qui
décrivent la **nature d'une protection** plutôt que son objet — donc ni un type de
dégât (`damage-types`), ni un état de combat (`status-effects`), ni une stat
dérivée (`derived-stats`).

| Clé | Icône | Ce que le badge dit |
| --- | --- | --- |
| `situational-immunity` | tête de démon | la protection ne joue **que** contre un type d'**agresseur** nommé (voie du combat du mal, rang 8, p. 149) — à distinguer de l'immunité permanente, dont le bouclier vert laisserait croire à une protection générale |

## Régénérer

```sh
cd scripts/game-icons/defense-badges
mkdir -p gi-raw
while IFS=$'\t' read -r id path; do
  [ -z "$id" ] && continue
  curl -fsS "https://raw.githubusercontent.com/game-icons/icons/master/$path" -o "gi-raw/$id.svg"
done < map.tsv
node gen.mjs
cp defenseBadgeIcons.ts ../../../src/lib/ui/defenseBadgeIcons.ts
```

Toute nouvelle icône doit venir de game-icons.net (source unique, licence unique).
La table `DEFENSE_BADGE_ICON_SOURCES` du fichier généré trace la provenance (audit / attribution).
