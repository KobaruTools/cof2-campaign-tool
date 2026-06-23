/**
 * Panthéon d'Osgild — « Principales religions d'Osgild » (livre de base CO2,
 * p. 126-127). Sert au choix du prêtre **spécialiste** (p. 122).
 *
 * Chaque dieu porte :
 *  - son/ses **arme(s) sacrée(s)** (ids d'équipement ; plusieurs = choix du joueur) ;
 *  - sa **capacité divine** = une feature d'un AUTRE profil (id), qui remplacera une
 *    capacité de même rang d'une voie de prêtre choisie.
 *
 * Notes de la table p. 127 prises en compte :
 *  - ¹ arc long ou court au choix → `['arc-long', 'arc-court']` ;
 *  - ² faux = arme à 2 mains, d10 DM (arme créée, cf. `equipment.ts`) ;
 *  - ³ pioche = arme à 2 mains, d8 DM ;
 *  - ⁴ trident « semblable à un épieu » ;
 *  - ⁵ faux : ou rouleau à pâtisserie ou poêle au choix, même DM.
 *
 * Coquilles du livre confirmées (le NOM de capacité, lui, est sans ambiguïté) :
 *  - Périnde « voie des végétaux — prêtre » → druide (`vegetaux-r2`) ;
 *  - Tyriolth « voie du feu » → voie des élixirs (`elixirs-r2`) ;
 *  - Tulsadün « voie de la survie » → voie de la nature (`nature-r2`).
 *
 * Convention (CLAUDE.md) : `id` = slug (clé de contenu) ; textes en français.
 */
import type { PriestGod } from './schema';

export const priestGods: PriestGod[] = [
  {
    id: 'arcanna',
    name: 'Arcanna',
    domain: 'déesse de la magie blanche',
    symbol: 'une étoile',
    sacredWeaponIds: ['baton'],
    divineFeatureId: 'mage-r2', // maîtrise de la magie (voie du mage)
    sourcePage: 126,
  },
  {
    id: 'arshran',
    name: 'Arshran',
    domain: 'dieu du feu et des forgerons',
    symbol: 'une enclume',
    sacredWeaponIds: ['marteau'],
    divineFeatureId: 'metal-r1', // morsure de la forge (voie du métal — forgesort)
    sourcePage: 126,
  },
  {
    id: 'arwendee',
    name: 'Arwendée',
    domain: 'déesse de la chasse et des archers',
    symbol: 'une flèche',
    sacredWeaponIds: ['arc-long', 'arc-court'], // ¹ arc long ou court au choix
    divineFeatureId: 'archer-r1', // archer émérite (voie de l'archer — rôdeur)
    sourcePage: 126,
  },
  {
    id: 'aurilla',
    name: 'Aurilla',
    domain: 'déesse de la chance et des aventuriers',
    symbol: 'un dé',
    sacredWeaponIds: ['epee-courte'],
    divineFeatureId: 'seduction-r1', // charmant (voie de la séduction — barde)
    sourcePage: 126,
  },
  {
    id: 'axender',
    name: 'Axénder',
    domain: 'dieu du devoir et de l’honneur',
    symbol: 'une épée',
    sacredWeaponIds: ['epee-longue'],
    divineFeatureId: 'meneur-d-hommes-r1', // sans peur (voie du meneur d'hommes — chevalier)
    sourcePage: 126,
  },
  {
    id: 'basile',
    name: 'Basile',
    domain: 'dieu de la gourmandise et de la nourriture',
    symbol: 'un chou',
    sacredWeaponIds: ['gourdin'],
    divineFeatureId: 'survie-r2', // nature nourricière (voie de la survie — rôdeur)
    sourcePage: 126,
  },
  {
    id: 'ceres',
    name: 'Cérès',
    domain: 'dieu de l’agriculture et du travail',
    symbol: 'un épi de blé',
    sacredWeaponIds: ['faux', 'rouleau-a-patisserie', 'poele'], // ²/⁵
    divineFeatureId: 'resistance-r1', // robustesse (voie de la résistance — guerrier)
    sourcePage: 126,
  },
  {
    id: 'denora',
    name: 'Dénora',
    domain: 'déesse de la compassion et de la guérison',
    symbol: 'une main',
    sacredWeaponIds: ['baton'],
    divineFeatureId: 'protecteur-r1', // baies magiques (voie du protecteur — druide)
    sourcePage: 126,
  },
  {
    id: 'ellona',
    name: 'Ellona',
    domain: 'déesse de la perception et de la vérité',
    symbol: 'un œil',
    sacredWeaponIds: ['arc-court'],
    divineFeatureId: 'divination-r2', // détection de l'invisible (voie de la divination — ensorceleur)
    sourcePage: 126,
  },
  {
    id: 'forthur',
    name: 'Forthur',
    domain: 'dieu du courage et des exploits',
    symbol: 'un poing',
    sacredWeaponIds: ['epee-a-deux-mains'],
    divineFeatureId: 'brute-r2', // tour de force (voie de la brute — barbare)
    sourcePage: 126,
  },
  {
    id: 'gaeln',
    name: 'Gaëln',
    domain: 'dieu des arts et des artistes',
    symbol: 'une lyre',
    sacredWeaponIds: ['rapiere'],
    divineFeatureId: 'musicien-r2', // chant de réconfort (voie du musicien — barde)
    sourcePage: 126,
  },
  {
    id: 'gorom',
    name: 'Gorom',
    domain: 'dieu de la pierre et des architectes',
    symbol: 'un marteau',
    sacredWeaponIds: ['marteau'],
    divineFeatureId: 'pagne-r2', // peau de pierre (voie du pagne — barbare)
    sourcePage: 126,
  },
  {
    id: 'guardal',
    name: 'Guardal',
    domain: 'dieu de la loyauté et des gardiens',
    symbol: 'un bouclier',
    sacredWeaponIds: ['masse'],
    divineFeatureId: 'bouclier-r1', // protéger un allié (voie du bouclier — guerrier)
    sourcePage: 127,
  },
  {
    id: 'hellion',
    name: 'Hellion',
    domain: 'dieu des voleurs et du pillage',
    symbol: 'une cape',
    sacredWeaponIds: ['epee-courte'],
    divineFeatureId: 'roublard-r1', // doigts agiles (voie du roublard — voleur)
    sourcePage: 127,
  },
  {
    id: 'irrion',
    name: 'Irrion',
    domain: 'dieu de l’ordre et de la noblesse',
    symbol: 'une épée',
    sacredWeaponIds: ['epee-longue'],
    divineFeatureId: 'noblesse-r3', // autorité naturelle (voie de la noblesse — chevalier)
    sourcePage: 127,
  },
  {
    id: 'jeweln',
    name: 'Jeweln',
    domain: 'dieu des souterrains et des mineurs',
    symbol: 'une pioche',
    sacredWeaponIds: ['pioche'], // ³ semblable à un épieu
    divineFeatureId: 'explosifs-r2', // démolition (voie des explosifs — arquebusier)
    sourcePage: 127,
  },
  {
    id: 'linnarre',
    name: 'Linnarré',
    domain: 'déesse de la mer et des marins',
    symbol: 'un coquillage',
    sacredWeaponIds: ['trident'], // ⁴
    divineFeatureId: 'magie-elementaire-r4', // respiration aquatique (voie de la magie élémentaire — magicien)
    sourcePage: 127,
  },
  {
    id: 'melenna',
    name: 'Mélenna',
    domain: 'déesse des forêts et des animaux',
    symbol: 'un arbre',
    sacredWeaponIds: ['arc-long', 'arc-court'], // ¹
    divineFeatureId: 'survie-r2', // nature nourricière (voie de la survie — rôdeur)
    sourcePage: 127,
  },
  {
    id: 'mephistre',
    name: 'Méphistre',
    domain: 'dieu de l’ombre et des secrets',
    symbol: 'un masque',
    sacredWeaponIds: ['dague'],
    divineFeatureId: 'assassin-r1', // discrétion (voie de l'assassin — voleur)
    sourcePage: 127,
  },
  {
    id: 'mirandia',
    name: 'Mirandia',
    domain: 'déesse du sommeil et des rêves',
    symbol: 'une demi-lune',
    sacredWeaponIds: ['baton'],
    divineFeatureId: 'envouteur-r2', // sommeil (voie de l'envoûteur — ensorceleur)
    sourcePage: 127,
  },
  {
    id: 'mondovael',
    name: 'Mondovaël',
    domain: 'dieu des nomades et du voyage',
    symbol: 'une botte',
    sacredWeaponIds: ['baton'],
    divineFeatureId: 'survie-r1', // survie (voie de la survie — rôdeur)
    sourcePage: 127,
  },
  {
    id: 'morn',
    name: 'Morn',
    domain: 'dieu de la mort et du passage dans l’au-delà',
    symbol: 'une faux',
    sacredWeaponIds: ['faux', 'rouleau-a-patisserie', 'poele'], // ²/⁵
    divineFeatureId: 'mort-r2', // masque mortuaire (voie de la mort — sorcier)
    sourcePage: 127,
  },
  {
    id: 'orbis',
    name: 'Orbis',
    domain: 'dieu du commerce et des marchands',
    symbol: 'une pièce d’or',
    sacredWeaponIds: ['arbalete-legere'],
    divineFeatureId: 'artefacts-r3', // sac sans fond (voie des artefacts — forgesort)
    sourcePage: 127,
  },
  {
    id: 'oumaros',
    name: 'Oumaros',
    domain: 'dieu de l’air et des cieux',
    symbol: 'un nuage',
    sacredWeaponIds: ['arc-long', 'arc-court'], // ¹
    divineFeatureId: 'magie-des-arcanes-r2', // lévitation (voie des arcanes — magicien)
    sourcePage: 127,
  },
  {
    id: 'perinde',
    name: 'Périnde',
    domain: 'déesse de la fertilité et des mères',
    symbol: 'une femme enceinte',
    sacredWeaponIds: ['baton'],
    divineFeatureId: 'vegetaux-r2', // prison végétale (voie des végétaux — druide ; coquille « prêtre » p. 127)
    sourcePage: 127,
  },
  {
    id: 'selenne',
    name: 'Sélenne',
    domain: 'déesse de la lune et de la liberté',
    symbol: 'un oiseau blanc',
    sacredWeaponIds: ['mains-nues'],
    divineFeatureId: 'poing-r1', // poings de fer (voie du poing — moine)
    sourcePage: 127,
  },
  {
    id: 'solar',
    name: 'Solar',
    domain: 'dieu de la lumière et du savoir',
    symbol: 'le soleil',
    sacredWeaponIds: ['baton'],
    divineFeatureId: 'magie-universelle-r1', // lumière (voie de la magie universelle — magicien)
    sourcePage: 127,
  },
  {
    id: 'suelle',
    name: 'Suëlle',
    domain: 'déesse de la beauté et de l’amour',
    symbol: 'un cœur',
    sacredWeaponIds: ['baton'],
    divineFeatureId: 'demon-r2', // beauté de la succube (voie du démon — sorcier)
    sourcePage: 127,
  },
  {
    id: 'trenner',
    name: 'Trenner',
    domain: 'dieu du temps et des ancêtres',
    symbol: 'un sablier',
    sacredWeaponIds: ['baton'],
    divineFeatureId: 'vagabond-r1', // rumeurs et légendes (voie du vagabond — barde)
    sourcePage: 127,
  },
  {
    id: 'tulsadun',
    name: 'Tulsadün',
    domain: 'dieu de la jungle et des reptiles',
    symbol: 'un serpent qui se mord la queue',
    sacredWeaponIds: ['arc-court'],
    divineFeatureId: 'nature-r2', // terrains difficiles (voie de la nature — druide ; coquille « survie » p. 127)
    sourcePage: 127,
  },
  {
    id: 'tyriolth',
    name: 'Tyriolth',
    domain: 'dieu du combat contre le chaos et du feu purificateur',
    symbol: 'une flamme',
    sacredWeaponIds: ['masse'],
    divineFeatureId: 'elixirs-r2', // feu grégeois (voie des élixirs — forgesort ; coquille « voie du feu » p. 127)
    sourcePage: 127,
  },
  {
    id: 'vorona',
    name: 'Vorona',
    domain: 'déesse de la justice et de la loi',
    symbol: 'une balance',
    sacredWeaponIds: ['epee-longue'],
    divineFeatureId: 'meneur-d-hommes-r1', // sans peur (voie du meneur d'hommes — chevalier)
    sourcePage: 127,
  },
];

/** Index de lookup par id (clé de contenu → dieu). */
export const priestGodById = new Map<string, PriestGod>(priestGods.map((g) => [g.id, g]));
