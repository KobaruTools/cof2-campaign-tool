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
| Demi-elfe | `delapouite/elf-ear.svg` | Delapouite |
| Demi-orc | `delapouite/orc-head.svg` | Delapouite |
| Elfe haut | `delapouite/woman-elf-face.svg` | Delapouite |
| Elfe sylvain | `delapouite/bow-arrow.svg` | Delapouite |
| Gnome | `delapouite/wizard-face.svg` | Delapouite |
| Halfelin | `lorc/footprint.svg` | Lorc |
| Humain | `delapouite/person.svg` | Delapouite |
| Nain | `delapouite/dwarf-face.svg` | Delapouite |
| Voie du mage | `lorc/pointy-hat.svg` | Lorc |
| Voie de prestige | `lorc/laurels.svg` | Lorc |

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

## Icônes de domaine des dieux (Codex)

Les icônes de domaine des dieux du panthéon d'Osgild (sous-page « Dieux » du Codex, PER-420)
proviennent également de [game-icons.net](https://game-icons.net), sous licence
[Creative Commons BY 3.0](https://creativecommons.org/licenses/by/3.0/). Couverture PARTIELLE
volontaire (19 dieux sur 32) : les dieux absents de ce tableau retombent sur l'icône de la
voie d'origine de leur capacité divine plutôt que sur une icône de domaine dédiée.

Auteurs : **Lorc** et **Delapouite** (https://game-icons.net).

Les SVG ont été nettoyés (fond retiré, couleur neutralisée) et intégrés dans
`src/lib/ui/godDomainIcons.ts`. La correspondance dieu → fichier source est conservée dans
`GOD_DOMAIN_ICON_SOURCES` (même fichier) et dans `scripts/game-icons/god-domains/map.tsv`.
L'affichage passe par le composant `src/components/GodDomainIcon.tsx`.

| Dieu | Domaine | Fichier game-icons.net | Auteur |
| --- | --- | --- | --- |
| Arshran | feu et forgerons | `lorc/anvil.svg` | Lorc |
| Dénora | compassion et guérison | `delapouite/heart-wings.svg` | Delapouite |
| Axénder | devoir et honneur | `lorc/laurel-crown.svg` | Lorc |
| Irrion | ordre et noblesse | `lorc/crown.svg` | Lorc |
| Vorona | justice et loi | `lorc/scales.svg` | Lorc |
| Trenner | temps et ancêtres | `lorc/hourglass.svg` | Lorc |
| Tulsadün | jungle et reptiles | `lorc/snake.svg` | Lorc |
| Sélenne | lune et liberté | `lorc/moon.svg` | Lorc |
| Mirandia | sommeil et rêves | `delapouite/night-sleep.svg` | Delapouite |
| Solar | lumière et savoir | `lorc/sun.svg` | Lorc |
| Suëlle | beauté et amour | `lorc/shining-heart.svg` | Lorc |
| Forthur | courage et exploits | `lorc/punch.svg` | Lorc |
| Gorom | pierre et architectes | `lorc/stone-block.svg` | Lorc |
| Mélenna | forêts et animaux | `lorc/paw.svg` | Lorc |
| Méphistre | ombre et secrets | `lorc/drama-masks.svg` | Lorc |
| Cérès | agriculture et travail | `delapouite/grain-bundle.svg` | Delapouite |
| Oumaros | air et cieux | `lorc/feather.svg` | Lorc |
| Ellona | perception et vérité | `lorc/octogonal-eye.svg` | Lorc |
| Tyriolth | chaos et feu purificateur | `lorc/fireball.svg` | Lorc |

## Icône « Points de violence »

L'icône de la barre « Points de violence » (demi-ogre, PER-325) provient également de
[game-icons.net](https://game-icons.net), sous licence
[Creative Commons BY 3.0](https://creativecommons.org/licenses/by/3.0/).

Le SVG a été nettoyé (fond retiré, couleur neutralisée) et intégré en dur dans
`src/lib/ui/violenceIcon.ts` (`OGRE_ICON_PATH`, source dans `OGRE_ICON_SOURCE`).

| Usage | Fichier game-icons.net | Auteur |
| --- | --- | --- |
| Points de violence | `delapouite/ogre.svg` | Delapouite |

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

**Exception — d3** : le d3 (`src/lib/character/types.ts`, `DamageDie`) n'existe pas au
catalogue game-icons.net. Son icône est un DESSIN MAISON (le corps du d6 coupé en deux par
une barre verticale, moitié gauche pleine et moitié droite en simple contour pointillé, avec
sa face à 3 points en diagonale) plutôt qu'une importation — seule exception à la règle
« toute icône vient de game-icons.net » de ce dépôt. Voir `scripts/game-icons/dice/gen.mjs`
(constante `CUSTOM_ICONS`) et `map.tsv`.

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

## Icônes de statut « mort »

L'icône « pierre tombale » marquant un personnage mort (statut, PER-183) et la
« tête de mort » posée sur la carte d'une créature vaincue (0 PV) dans le tracker
projeté proviennent de [game-icons.net](https://game-icons.net), sous licence
[Creative Commons BY 3.0](https://creativecommons.org/licenses/by/3.0/).

Auteur : **Lorc** (https://game-icons.net).

Les SVG ont été nettoyés (fond retiré, couleur neutralisée) et embarqués en dur dans
les composants `src/components/TombstoneIcon.tsx` et `src/components/SkullIcon.tsx`
(rendus via `SvgIcon`, sans requête réseau). Les autres marqueurs de statut
(« Vivant », « Retraité ») sont des icônes Material UI, non issues de game-icons.net.

| Élément | Fichier game-icons.net | Auteur |
| --- | --- | --- |
| Mort (pierre tombale) | `lorc/tombstone.svg` | Lorc |
| Créature vaincue (tête de mort) | `lorc/skull-crossed-bones.svg` | Lorc |

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

## Icône de marque (logo)

L'icône « tête de dragon » servant de logo de marque de l'application (en-tête global,
PER-239) provient de [game-icons.net](https://game-icons.net), sous licence
[Creative Commons BY 3.0](https://creativecommons.org/licenses/by/3.0/).

Auteur : **Lorc** (https://game-icons.net).

Le SVG a été nettoyé (fond retiré, couleur neutralisée) et embarqué en dur dans le
composant `src/components/AppHeaderBrand.tsx` (rendu via `SvgIcon`, sans requête réseau).

| Élément | Fichier game-icons.net | Auteur |
| --- | --- | --- |
| Logo (tête de dragon) | `lorc/dragon-head.svg` | Lorc |

## Icônes des types d'objet

Les icônes des 7 types d'objet d'inventaire (arme, armure, bouclier, consommable,
équipement, trésor, divers) proviennent également de
[game-icons.net](https://game-icons.net), sous licence
[Creative Commons BY 3.0](https://creativecommons.org/licenses/by/3.0/).

Auteurs : **Lorc**, **Delapouite** et **Willdabeast** (https://game-icons.net).

Les SVG ont été nettoyés (fond retiré, couleur neutralisée) et intégrés dans
`src/lib/ui/itemTypeIcons.ts`. La correspondance type → fichier source est conservée
dans `ITEM_TYPE_ICON_SOURCES` (même fichier) et dans `scripts/game-icons/item-types/map.tsv`.
L'affichage passe par le composant commun `src/components/ItemTypeIcon.tsx`.

| Type | Fichier game-icons.net | Auteur |
| --- | --- | --- |
| Arme | `lorc/pointy-sword.svg` | Lorc |
| Armure | `lorc/breastplate.svg` | Lorc |
| Bouclier | `willdabeast/round-shield.svg` | Willdabeast |
| Consommable | `lorc/potion-ball.svg` | Lorc |
| Équipement | `delapouite/rope-coil.svg` | Delapouite |
| Trésor | `lorc/cut-diamond.svg` | Lorc |
| Divers | `delapouite/cardboard-box.svg` | Delapouite |

## Icônes des sous-types d'arme

Les icônes affinant le type « arme » par SOUS-TYPE (épée, dague, hache, arc, arbalète…)
proviennent également de [game-icons.net](https://game-icons.net), sous licence
[Creative Commons BY 3.0](https://creativecommons.org/licenses/by/3.0/).

Auteurs : **Lorc**, **Delapouite** et **Skoll** (https://game-icons.net).

Les SVG ont été nettoyés (fond retiré, couleur neutralisée) et intégrés dans
`src/lib/ui/weaponKindIcons.ts`. La correspondance sous-type → fichier source est conservée
dans `WEAPON_KIND_ICON_SOURCES` (même fichier) et dans
`scripts/game-icons/weapon-kinds/map.tsv`. La résolution arme → sous-type vit dans
`src/lib/ui/weaponKind.ts`, l'affichage passe par `src/components/ItemTypeIcon.tsx`.

| Sous-type d'arme | Fichier game-icons.net | Auteur |
| --- | --- | --- |
| Épée | `lorc/pointy-sword.svg` | Lorc |
| Dague | `lorc/plain-dagger.svg` | Lorc |
| Hache | `lorc/battle-axe.svg` | Lorc |
| Marteau | `delapouite/warhammer.svg` | Delapouite |
| Masse | `lorc/spiked-mace.svg` | Lorc |
| Fléau | `delapouite/flail.svg` | Delapouite |
| Arme d'hast | `lorc/barbed-spear.svg` | Lorc |
| Trident | `lorc/trident.svg` | Lorc |
| Faux | `lorc/scythe.svg` | Lorc |
| Pioche | `lorc/mining.svg` | Lorc |
| Bâton | `delapouite/bo.svg` | Delapouite |
| Mains nues | `lorc/mailed-fist.svg` | Lorc |
| Arc | `delapouite/bow-arrow.svg` | Delapouite |
| Arbalète | `skoll/ballista.svg` | Skoll |
| Fronde | `delapouite/sling.svg` | Delapouite |
| Arme à poudre | `lorc/blunderbuss.svg` | Lorc |
| Canon | `lorc/cannon.svg` | Lorc |
| Arme de jet | `delapouite/spear-feather.svg` | Delapouite |
| Poêle | `delapouite/cooking-pot.svg` | Delapouite |
| Rouleau à pâtisserie | `delapouite/dough-roller.svg` | Delapouite |

## Icônes des sous-catégories d'objet

Les icônes des SOUS-CATÉGORIES d'objet — celles qui distinguent une corde d'un grappin, une
chemise de mailles d'une cotte de mailles, et le jeu d'icônes « libres » (parchemin, gemmes,
anneau, cape…) proposé au joueur pour un objet personnalisé — proviennent également de
[game-icons.net](https://game-icons.net), sous licence
[Creative Commons BY 3.0](https://creativecommons.org/licenses/by/3.0/).

Auteurs : **Lorc**, **Delapouite** et **Willdabeast** (https://game-icons.net).

Les SVG ont été nettoyés (fond retiré, couleur neutralisée) et intégrés dans
`src/lib/ui/itemIcons.ts`. La correspondance sous-catégorie → fichier source est conservée dans
`ITEM_SUBCATEGORY_ICON_SOURCES` (même fichier) et dans `scripts/game-icons/item-icons/map.tsv`.
Le vocabulaire d'ids vit dans `src/data/item-icons.ts` (la donnée d'équipement le référence via
`EquipmentItem.icon`), la résolution dans `src/lib/ui/itemIcon.ts`, et l'affichage passe par le
composant commun `src/components/ItemIcon.tsx`.

| Sous-catégorie | Fichier game-icons.net | Auteur |
| --- | --- | --- |
| Vêtements (`clothes`) | `delapouite/clothes.svg` | Delapouite |
| Tissus matelassés, fourrures (`padded-armor`) | `delapouite/fur-shirt.svg` | Delapouite |
| Cuir (`leather-armor`) | `lorc/leather-vest.svg` | Lorc |
| Cuir renforcé, broigne (`studded-armor`) | `delapouite/leather-armor.svg` | Delapouite |
| Chemise de mailles (`mail-shirt`) | `lorc/mail-shirt.svg` | Lorc |
| Cotte de mailles (`heavy-mail`) | `lorc/scale-mail.svg` | Lorc |
| Plaques (`plate-armor`) | `lorc/breastplate.svg` | Lorc |
| Plaque complète (`full-plate`) | `lorc/layered-armor.svg` | Lorc |
| Petit bouclier (`small-shield`) | `willdabeast/round-shield.svg` | Willdabeast |
| Grand bouclier (`large-shield`) | `lorc/bordered-shield.svg` | Lorc |
| Corde (`rope`) | `delapouite/rope-coil.svg` | Delapouite |
| Grappin (`grapple`) | `lorc/grapple.svg` | Lorc |
| Briquet, allume-feu (`tinderbox`) | `delapouite/flint-spark.svg` | Delapouite |
| Carquois, munitions (`quiver`) | `delapouite/quiver.svg` | Delapouite |
| Couverture (`blanket`) | `delapouite/blanket.svg` | Delapouite |
| Lanterne (`lantern`) | `lorc/lantern.svg` | Lorc |
| Huile, amphore (`lamp-oil`) | `delapouite/amphora.svg` | Delapouite |
| Torche (`torch`) | `delapouite/torch.svg` | Delapouite |
| Matériel d'écriture (`writing-kit`) | `lorc/quill-ink.svg` | Lorc |
| Outils de crochetage (`lockpicks`) | `delapouite/lockpicks.svg` | Delapouite |
| Potion (`potion`) | `delapouite/health-potion.svg` | Delapouite |
| Vivres, ration (`ration`) | `lorc/meat.svg` | Lorc |
| Gamelle, popote (`mess-kit`) | `delapouite/meal.svg` | Delapouite |
| Outre, gourde (`waterskin`) | `delapouite/jug.svg` | Delapouite |
| Sac à dos (`backpack`) | `delapouite/backpack.svg` | Delapouite |
| Grimoire (`spellbook`) | `lorc/book-aura.svg` | Lorc |
| Instrument de musique (`instrument`) | `delapouite/harp.svg` | Delapouite |
| Métal précieux (`precious-metal`) | `delapouite/gold-stack.svg` | Delapouite |
| Chope, récipient (`mug`) | `lorc/beer-stein.svg` | Lorc |
| Créature aquatique (`octopus`) | `lorc/octopus.svg` | Lorc |
| Parchemin (`scroll`) | `lorc/tied-scroll.svg` | Lorc |
| Gemmes (`gems`) | `lorc/gems.svg` | Lorc |
| Pièces (`coins`) | `delapouite/coins.svg` | Delapouite |
| Clé (`key`) | `lorc/key.svg` | Lorc |
| Coffre (`chest`) | `lorc/locked-chest.svg` | Lorc |
| Bourse (`pouch`) | `lorc/swap-bag.svg` | Lorc |
| Baguette (`wand`) | `lorc/crystal-wand.svg` | Lorc |
| Tente (`tent`) | `delapouite/camping-tent.svg` | Delapouite |
| Anneau (`ring`) | `delapouite/diamond-ring.svg` | Delapouite |
| Amulette (`amulet`) | `lorc/gem-pendant.svg` | Lorc |
| Cape (`cloak`) | `delapouite/cape.svg` | Delapouite |
| Bottes (`boots`) | `lorc/leather-boot.svg` | Lorc |
| Herbes (`herbs`) | `delapouite/herbs-bundle.svg` | Delapouite |
| Bandages (`bandage`) | `lorc/bandage-roll.svg` | Lorc |
| Symbole sacré (`holy-symbol`) | `lorc/holy-symbol.svg` | Lorc |
| Casque (`helmet`) | `lorc/barbute.svg` | Lorc |
| Gants (`gloves`) | `delapouite/gloves.svg` | Delapouite |

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
| Compagnons | `lorc/wolf-head.svg` | Lorc |
| Manœuvres de combat | `lorc/crossed-swords.svg` | Lorc |
| Voies & capacités | `lorc/tree-branch.svg` | Lorc |
| Inventaire | `delapouite/backpack.svg` | Delapouite |
| Identité | `delapouite/id-card.svg` | Delapouite |
| Notes | `lorc/quill-ink.svg` | Lorc |
| Historique des niveaux | `delapouite/upgrade.svg` | Delapouite |
| Montures & véhicules (Codex) | `lorc/horse-head.svg` | Lorc |
| PNJ | `lorc/cowled.svg` | Lorc |

## Icônes des types de dégât

Les icônes des types de dégât réductibles (feu, froid, foudre, acide, poison, DM
physiques/contondants/perforants/tranchants…) proviennent également de
[game-icons.net](https://game-icons.net), sous licence
[Creative Commons BY 3.0](https://creativecommons.org/licenses/by/3.0/).

Auteurs : **Lorc**, **Delapouite** et **Carl Olsen** (https://game-icons.net).

Les SVG ont été nettoyés (fond retiré, couleur neutralisée) et intégrés dans
`src/lib/ui/damageTypeIcons.ts`. La correspondance type → fichier source est conservée
dans `DAMAGE_TYPE_ICON_SOURCES` (même fichier) et dans
`scripts/game-icons/damage-types/map.tsv`. L'affichage passe par le composant commun
`src/components/DamageTypeIcon.tsx` (puces de réduction de dégâts et d'immunité).

| Type de dégât | Fichier game-icons.net | Auteur |
| --- | --- | --- |
| Physiques | `lorc/punch.svg` | Lorc |
| Non magiques / armes non argentées | `lorc/crossed-swords.svg` | Lorc |
| Magiques | `lorc/magic-swirl.svg` | Lorc |
| Feu | `carl-olsen/flame.svg` | Carl Olsen |
| Froid | `lorc/snowflake-1.svg` | Lorc |
| Foudre | `lorc/lightning-trio.svg` | Lorc |
| Acide | `lorc/chemical-drop.svg` | Lorc |
| Poison | `lorc/poison-bottle.svg` | Lorc |
| Maladie | `lorc/virus.svg` | Lorc |
| Projectiles métalliques | `lorc/arrow-cluster.svg` | Lorc |
| Naturels non magiques | `delapouite/forest.svg` | Delapouite |
| Zone / souffles | `delapouite/expand.svg` | Delapouite |
| Contondants | `lorc/mace-head.svg` | Lorc |
| Perforants | `lorc/spear-hook.svg` | Lorc |
| Tranchants | `lorc/sword-slice.svg` | Lorc |
| Armes hors fer froid | `lorc/anvil.svg` | Lorc |
| Armes non bénies | `lorc/holy-symbol.svg` | Lorc |
| Armes | `lorc/broadsword.svg` | Lorc |

## Icônes des états de combat

Les icônes des états de combat — immunités d'état (peur, charme/possession, ralenti,
immobilisé, sommeil magique, paralysé, renversé, surpris), états préjudiciables du
glossaire (aveuglé, affaibli, essoufflé, étourdi, invalide…, palette du Combat Tracker,
PER-279) et états d'environnement (combat aquatique, p. 215) — proviennent également de
[game-icons.net](https://game-icons.net), sous licence
[Creative Commons BY 3.0](https://creativecommons.org/licenses/by/3.0/).

Auteurs : **Lorc**, **Sbed** et **Delapouite** (https://game-icons.net).

Les SVG ont été nettoyés (fond retiré, couleur neutralisée) et intégrés dans
`src/lib/ui/statusEffectIcons.ts`. La correspondance état → fichier source est conservée
dans `STATUS_EFFECT_ICON_SOURCES` (même fichier) et dans
`scripts/game-icons/status-effects/map.tsv`. L'affichage passe par le composant commun
`src/components/StatusEffectIcon.tsx`.

| État | Fichier game-icons.net | Auteur |
| --- | --- | --- |
| Peur | `lorc/terror.svg` | Lorc |
| Charme / possession | `lorc/psychic-waves.svg` | Lorc |
| Ralenti | `lorc/snail.svg` | Lorc |
| Immobilisé | `lorc/manacles.svg` | Lorc |
| Sommeil magique | `lorc/sleepy.svg` | Lorc |
| Paralysé | `lorc/power-lightning.svg` | Lorc |
| Renversé | `sbed/falling.svg` | Sbed |
| Surpris | `lorc/surprised.svg` | Lorc |
| Aveuglé | `delapouite/blindfold.svg` | Delapouite |
| Affaibli | `delapouite/arm-sling.svg` | Delapouite |
| Essoufflé | `delapouite/lungs.svg` | Delapouite |
| Étourdi | `lorc/star-swirl.svg` | Lorc |
| Invalide | `lorc/broken-bone.svg` | Lorc |
| Combat aquatique | `lorc/big-wave.svg` | Lorc |
| Détection magique | `lorc/crystal-ball.svg` | Lorc |

## Icônes des badges défensifs

L'icône qui marque une protection **situationnelle** dans la carte « Défense » — une
immunité qui ne joue que contre un type d'agresseur nommé (voie du combat du mal,
rang 8, p. 149 : « … provoqués par les morts-vivants, les démons ou les animaux
maléfiques ou corrompus ») — provient de [game-icons.net](https://game-icons.net),
sous licence [Creative Commons BY 3.0](https://creativecommons.org/licenses/by/3.0/).

Auteur : **Lorc** (https://game-icons.net).

Le SVG a été nettoyé (fond retiré, couleur neutralisée) et intégré dans
`src/lib/ui/defenseBadgeIcons.ts` (table `DEFENSE_BADGE_ICON_PATHS`, sources dans
`DEFENSE_BADGE_ICON_SOURCES` et `scripts/game-icons/defense-badges/map.tsv`). Le rendu
est inline, dans `src/components/sheet/DefenseBadge.tsx`.

| Badge | Fichier game-icons.net | Auteur |
| --- | --- | --- |
| Immunité situationnelle (tête de démon) | `lorc/daemon-skull.svg` | Lorc |
