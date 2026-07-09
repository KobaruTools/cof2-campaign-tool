# Attributions tierces

## Icônes des profils

Les icônes illustrant chaque profil proviennent de [game-icons.net](https://game-icons.net),
distribuées sous licence [Creative Commons BY 3.0](https://creativecommons.org/licenses/by/3.0/).

Auteurs : **Lorc**, **Delapouite** et **Carl Olsen** (https://game-icons.net).

Les SVG ont été nettoyés (fond retiré, couleur neutralisée) et intégrés dans
`src/lib/ui/classIcons.ts`. La correspondance profil → fichier source est conservée
dans `CLASS_ICON_SOURCES` (même fichier) et dans `scripts/game-icons/classes/map.tsv`.

| Profil | Fichier game-icons.net | Auteur |
| --- | --- | --- |
| Arquebusier | `lorc/blunderbuss.svg` | Lorc |
| Arbalétrier (arquebusier sans armes à feu) | `carl-olsen/crossbow.svg` | Carl Olsen |
| Barde | `lorc/lyre.svg` | Lorc |
| Rôdeur | `lorc/high-shot.svg` | Lorc |
| Voleur | `lorc/hood.svg` | Lorc |
| Barbare | `lorc/battle-axe.svg` | Lorc |
| Chevalier | `delapouite/knight-banner.svg` | Delapouite |
| Guerrier | `lorc/crossed-swords.svg` | Lorc |
| Ensorceleur | `lorc/fire-ray.svg` | Lorc |
| Forgesort | `lorc/anvil-impact.svg` | Lorc |
| Magicien | `lorc/book-cover.svg` | Lorc |
| Sorcier | `lorc/imp.svg` | Lorc |
| Druide | `delapouite/oak-leaf.svg` | Delapouite |
| Moine | `lorc/meditation.svg` | Lorc |
| Prêtre | `lorc/holy-symbol.svg` | Lorc |

## Icônes des peuples

Les icônes illustrant chaque voie de peuple proviennent de
[game-icons.net](https://game-icons.net), sous licence
[Creative Commons BY 3.0](https://creativecommons.org/licenses/by/3.0/).

Auteurs : **Lorc** et **Delapouite** (https://game-icons.net).

Les SVG ont été nettoyés (fond retiré, couleur neutralisée) et intégrés dans
`src/lib/ui/ancestryIcons.ts`. La correspondance peuple → fichier source est
conservée dans `ANCESTRY_ICON_SOURCES` (même fichier) et dans
`scripts/game-icons/ancestries/map.tsv`. L'affichage passe par le composant commun
`src/components/AncestryIcon.tsx`.

| Peuple | Fichier game-icons.net | Auteur |
| --- | --- | --- |
| Demi-orc | `delapouite/orc-head.svg` | Delapouite |
| Elfe haut | `delapouite/woman-elf-face.svg` | Delapouite |
| Elfe sylvain | `delapouite/bow-arrow.svg` | Delapouite |
| Gnome | `delapouite/wizard-face.svg` | Delapouite |
| Halfelin | `lorc/footprint.svg` | Lorc |
| Humain | `delapouite/person.svg` | Delapouite |
| Nain | `delapouite/dwarf-face.svg` | Delapouite |
| Voie du mage | `lorc/pointy-hat.svg` | Lorc |

## Icônes des statistiques dérivées

Les icônes des statistiques dérivées (PV, Défense, Initiative, etc.) proviennent
également de [game-icons.net](https://game-icons.net), sous licence
[Creative Commons BY 3.0](https://creativecommons.org/licenses/by/3.0/).

Auteurs : **Lorc**, **Sbed**, **Skoll** et **Delapouite** (https://game-icons.net).

Les SVG ont été nettoyés (fond retiré, couleur neutralisée) et intégrés dans
`src/lib/ui/derivedStatIcons.ts`. La correspondance statistique → fichier source
est conservée dans `DERIVED_STAT_ICON_SOURCES` (même fichier) et dans
`scripts/game-icons/derived-stats/map.tsv`. L'affichage passe par le composant commun
`src/components/DerivedStatIcon.tsx`, qui cercle l'icône.

| Statistique | Fichier game-icons.net | Auteur |
| --- | --- | --- |
| Points de vigueur | `skoll/hearts.svg` | Skoll |
| Défense | `sbed/shield.svg` | Sbed |
| Initiative | `lorc/sprint.svg` | Lorc |
| Points de chance | `lorc/clover.svg` | Lorc |
| Dés de récupération | `sbed/health-normal.svg` | Sbed |
| Points de mana | `sbed/water-drop.svg` | Sbed |
| Attaque contact | `lorc/broadsword.svg` | Lorc |
| Attaque distance | `lorc/pocket-bow.svg` | Lorc |
| Attaque magique | `delapouite/falling-star.svg` | Delapouite |

## Icônes des dés

Les icônes des dés polyédriques (d4, d6, d8, d10, d12, d20) proviennent également
de [game-icons.net](https://game-icons.net), sous licence
[Creative Commons BY 3.0](https://creativecommons.org/licenses/by/3.0/).

Auteurs : **Skoll** et **Delapouite** (https://game-icons.net).

Les SVG ont été nettoyés (fond retiré, couleur neutralisée) et intégrés dans
`src/lib/ui/diceIcons.ts`. La correspondance dé → fichier source est conservée
dans `DIE_ICON_SOURCES` (même fichier) et dans `scripts/game-icons/dice/map.tsv`.
L'affichage passe par le composant commun `src/components/DieIcon.tsx`.

| Dé | Fichier game-icons.net | Auteur |
| --- | --- | --- |
| d4 | `skoll/d4.svg` | Skoll |
| d6 | `delapouite/dice-six-faces-six.svg` | Delapouite |
| d8 | `delapouite/dice-eight-faces-eight.svg` | Delapouite |
| d10 | `skoll/d10.svg` | Skoll |
| d12 | `skoll/d12.svg` | Skoll |
| d20 | `delapouite/dice-twenty-faces-twenty.svg` | Delapouite |

## Icônes des caractéristiques

Les icônes des 7 caractéristiques (AGI, CON, FOR, PER, CHA, INT, VOL) proviennent
également de [game-icons.net](https://game-icons.net), sous licence
[Creative Commons BY 3.0](https://creativecommons.org/licenses/by/3.0/).

Auteurs : **Lorc** et **Delapouite** (https://game-icons.net).

Les SVG ont été nettoyés (fond retiré, couleur neutralisée) et intégrés dans
`src/lib/ui/abilityIcons.ts`. La correspondance caractéristique → fichier source
est conservée dans `ABILITY_ICON_SOURCES` (même fichier) et dans
`scripts/game-icons/abilities/map.tsv`. L'affichage passe par le composant commun
`src/components/AbilityIcon.tsx`.

| Caractéristique | Fichier game-icons.net | Auteur |
| --- | --- | --- |
| Agilité (AGI) | `lorc/barefoot.svg` | Lorc |
| Constitution (CON) | `delapouite/muscular-torso.svg` | Delapouite |
| Force (FOR) | `delapouite/biceps.svg` | Delapouite |
| Perception (PER) | `delapouite/eye-target.svg` | Delapouite |
| Charisme (CHA) | `delapouite/public-speaker.svg` | Delapouite |
| Intelligence (INT) | `lorc/brain.svg` | Lorc |
| Volonté (VOL) | `lorc/inner-self.svg` | Lorc |

## Icône de la bourse

L'icône « bourse » (sac à monnaie) en tête du bloc « Inventaire » provient également
de [game-icons.net](https://game-icons.net), sous licence
[Creative Commons BY 3.0](https://creativecommons.org/licenses/by/3.0/).

Auteur : **Lorc** (https://game-icons.net).

Le SVG a été nettoyé (fond retiré, couleur neutralisée) et intégré dans
`src/lib/ui/purseIcon.ts` (constante `PURSE_ICON_PATH`, source dans
`PURSE_ICON_SOURCE` et `scripts/game-icons/purse/map.tsv`). L'affichage passe par le
composant `src/components/PurseIcon.tsx`.

| Élément | Fichier game-icons.net | Auteur |
| --- | --- | --- |
| Bourse | `lorc/swap-bag.svg` | Lorc |

## Icône de statut « mort »

L'icône « pierre tombale » marquant un personnage mort (statut, PER-183) provient
de [game-icons.net](https://game-icons.net), sous licence
[Creative Commons BY 3.0](https://creativecommons.org/licenses/by/3.0/).

Auteur : **Lorc** (https://game-icons.net).

Le SVG a été nettoyé (fond retiré, couleur neutralisée) et embarqué en dur dans le
composant `src/components/TombstoneIcon.tsx` (rendu via `SvgIcon`, sans requête
réseau). Les autres marqueurs de statut (« Vivant », « Retraité ») sont des icônes
Material UI, non issues de game-icons.net.

| Élément | Fichier game-icons.net | Auteur |
| --- | --- | --- |
| Mort (pierre tombale) | `lorc/tombstone.svg` | Lorc |

## Icône « Campagnes » (quête)

L'icône « parchemin déroulé » du bouton « Campagnes » (en-tête d'accueil) provient
de [game-icons.net](https://game-icons.net), sous licence
[Creative Commons BY 3.0](https://creativecommons.org/licenses/by/3.0/).

Auteur : **Lorc** (https://game-icons.net).

Le SVG a été nettoyé (fond retiré, couleur neutralisée) et embarqué en dur dans le
composant `src/components/QuestIcon.tsx` (rendu via `SvgIcon`, sans requête réseau).

| Élément | Fichier game-icons.net | Auteur |
| --- | --- | --- |
| Campagnes (quête) | `lorc/scroll-unfurled.svg` | Lorc |

## Icônes des titres de section

Les icônes ornant les titres de section de la fiche de personnage (Caractéristiques,
Inventaire, etc.) proviennent également de [game-icons.net](https://game-icons.net),
sous licence [Creative Commons BY 3.0](https://creativecommons.org/licenses/by/3.0/).

Auteurs : **Lorc** et **Delapouite** (https://game-icons.net).

Les SVG ont été nettoyés (fond retiré, couleur neutralisée) et intégrés dans
`src/lib/ui/sectionIcons.ts`. La correspondance section → fichier source est conservée
dans `SECTION_ICON_SOURCES` (même fichier) et dans `scripts/game-icons/sections/map.tsv`.
L'affichage passe par le composant commun `src/components/SectionIcon.tsx`.

| Section | Fichier game-icons.net | Auteur |
| --- | --- | --- |
| Caractéristiques | `delapouite/skills.svg` | Delapouite |
| Statistiques dérivées | `delapouite/abacus.svg` | Delapouite |
| Compétences & tests | `delapouite/rolling-dices.svg` | Delapouite |
| État du personnage | `delapouite/heart-beats.svg` | Delapouite |
| Voies & capacités | `lorc/tree-branch.svg` | Lorc |
| Inventaire | `delapouite/backpack.svg` | Delapouite |
| Identité | `delapouite/id-card.svg` | Delapouite |
| Notes | `lorc/quill-ink.svg` | Lorc |
| Historique des niveaux | `delapouite/upgrade.svg` | Delapouite |
