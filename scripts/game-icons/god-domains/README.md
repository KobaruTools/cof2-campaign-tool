# Générateur des icônes de domaine des dieux (Codex, PER-420)

Télécharge les SVG de [game-icons.net](https://game-icons.net) (licence CC BY 3.0),
les nettoie (fond retiré, couleur neutralisée en `currentColor`) et régénère
`src/lib/ui/godDomainIcons.ts`.

Même chaîne que `scripts/game-icons/derived-stats`, mais **volontairement partiel** :
une entrée par dieu du panthéon d'Osgild (`src/data/priest-gods.ts`) dont le domaine a un
match assez littéral sur game-icons.net. Les dieux absents de `map.tsv` retombent sur
l'icône de la VOIE d'origine de leur capacité divine (`CodexGodsBrowser.tsx`) — ex. Perinde
(fertilité/mères), aucun thème correspondant trouvé sur le site source.

## Correspondance

Le fichier `map.tsv` associe chaque `id` de dieu (`PriestGod.id`, cf. `priest-gods.ts`) à son
fichier source (`<auteur>/<icone>.svg`) dans le dépôt [game-icons/icons](https://github.com/game-icons/icons).

## Régénérer

```sh
cd scripts/game-icons/god-domains
# 1. (re)télécharger les SVG bruts dans ./gi-raw/
mkdir -p gi-raw
while IFS=$'\t' read -r id path; do
  [ -z "$id" ] && continue
  curl -fsS "https://raw.githubusercontent.com/game-icons/icons/master/$path" -o "gi-raw/$id.svg"
done < map.tsv
# 2. générer le fichier TS
node gen.mjs
# 3. copier le résultat
cp godDomainIcons.ts ../../../src/lib/ui/godDomainIcons.ts
```

Toute nouvelle icône doit venir de game-icons.net (source unique, licence unique)
et être ajoutée à `map.tsv` puis reportée dans `NOTICE.md`.
