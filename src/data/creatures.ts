/**
 * Bestiaire du livre de base CO2 (PER-95) — chapitre 3 « Opposition », p. 259-303.
 *
 * Extraction EXHAUSTIVE et VERBATIM des blocs de stats des créatures. Entité
 * `Creature` (schéma dédié, cf. src/data/schema.ts) — DISTINCTE du
 * `CreatureProfile` des créatures octroyées par une capacité.
 *
 * Organisation : trois catégories du livre, dans l'ordre imprimé —
 *   1. HUMANOÏDES            (p. 262-266)
 *   2. ANIMAUX               (p. 266-274)
 *   3. CRÉATURES FANTASTIQUES (p. 275-302)
 *
 * Règles d'extraction :
 *   - Textes affichés (nom, description, capacités) en français verbatim.
 *   - `nc` = valeur numérique du NC principal imprimé (« 1/2 » → 0.5) ; `ncNote`
 *     conserve la forme exacte quand ce n'est pas un simple nombre.
 *   - `*` sur une caractéristique → `bonusDieAbilities` (dé bonus inné, p. 261).
 *   - Chaque bloc de stats imprimé = une entrée ; les variantes nommées pointent
 *     leur base via `baseCreatureId`.
 *   - Aucune valeur devinée : incertitudes signalées par `TODO(extraction)`.
 *
 * Source : CBHS_06_Chroniques_Oubliees_2_web_v2.pdf, p. 259-303.
 */

import type { Creature } from './schema';

// ===========================================================================
// 1. HUMANOÏDES (p. 262-266)
// ===========================================================================

const humanoids: Creature[] = [
  {
    id: 'assassin',
    name: 'Assassin',
    category: 'humanoides',
    nc: 4,
    nature: ['humanoide'],
    description:
      "Ce professionnel du meurtre est un adversaire redoutable, mais il ne s'amuse jamais à attaquer un groupe de PJ de front. Il attaque par surprise et de préférence un PJ solitaire avant de disparaître dans les ombres.",
    abilities: { AGI: 3, CON: 3, FOR: 2, PER: 2, CHA: 1, INT: 1, VOL: 2 },
    bonusDieAbilities: ['AGI', 'PER'],
    defense: 17,
    hitPoints: 40,
    initiative: 15,
    attacks: [{ name: 'Épée courte', attackCount: 2, bonus: '+7', damage: '1d6+3' }],
    specialAbilities: [
      {
        name: 'Attaque mortelle (A)',
        text: "Une attaque qui doit être exécutée dans le dos ou par surprise. L'assassin obtient un dé bonus en attaque et ajoute +4d6 aux DM de sa première attaque (il fait ensuite sa seconde attaque dans des conditions normales).",
        richText: "Une attaque qui doit être exécutée dans le dos ou par surprise. L'assassin obtient un dé bonus en attaque et ajoute +{4d6} aux DM de sa première attaque (il fait ensuite sa seconde attaque dans des conditions normales).",
      },
      {
        name: 'Assassinat (L)',
        text: "Au premier round de combat, si la cible est Surprise, une Attaque mortelle réussie l'oblige à réussir un test de CON difficulté 13 ou tomber à 0 PV.",
      },
      {
        name: 'Disparition (L)',
        text: "L'assassin devient invisible (passage dans les ombres, cape magique, sort, etc.) et peut se déplacer de 20 m. Il réapparaît à son prochain tour et s'il emporte un test opposé d'AGI (discrétion +5) contre la PER (vigilance) de sa cible, il peut effectuer une Attaque mortelle.",
      },
    ],
    sourcePage: 262,
  },

  // --- Bandits (p. 263) -----------------------------------------------------
  {
    id: 'bandit-de-base',
    name: 'Bandit de base',
    category: 'humanoides',
    nc: 0.5,
    ncNote: '1/2',
    nature: ['humanoide'],
    description:
      "Ce profil regroupe les différents types de bandits et de brigands croisés sur les routes ainsi que les bandes de pillards ou les soldats démobilisés appelés écorcheurs. Vous trouverez également, dans la section des PNJ, des escrimeurs qui peuvent correspondre à des profils avancés de ce type d'adversaires.\n\nUn bandit vétéran peut servir de chef à un groupe de petites frappes (augmentez son CHA de +1). Un bandit vétéran accompagné de 4 bandits est une rencontre assez difficile (entre ordinaire et difficile) pour un groupe de niveau 2.\n\nUn chef bandit, ses deux lieutenants (vétérans) et huit bandits forment une rencontre difficile de niveau 3 ou une rencontre ordinaire de niveau 4.",
    abilities: { AGI: 1, CON: 1, FOR: 1, PER: 0, CHA: 0, INT: 0, VOL: -1 },
    bonusDieAbilities: ['AGI'],
    defense: 12,
    hitPoints: 9,
    initiative: 10,
    attacks: [
      { name: 'Épée longue', bonus: '+2', damage: '1d8+1' },
      { name: 'Arc', range: '30 m', bonus: '+2', damage: '1d6' },
    ],
    specialAbilities: [
      {
        name: 'Embuscade',
        text: "Au premier round de combat, si l'environnement permet de se dissimuler, la cible doit faire un test de PER difficulté 16 ou être surprise.",
      },
    ],
    sourcePage: 263,
  },
  {
    id: 'bandit-veteran',
    name: 'Bandit vétéran',
    category: 'humanoides',
    nc: 1,
    nature: ['humanoide'],
    baseCreatureId: 'bandit-de-base',
    abilities: { AGI: 1, CON: 3, FOR: 2, PER: 0, CHA: 0, INT: 0, VOL: 0 },
    bonusDieAbilities: ['AGI', 'PER'],
    defense: 14,
    hitPoints: 15,
    initiative: 13,
    attacks: [
      { name: 'Épée longue', bonus: '+4', damage: '1d8+2' },
      { name: 'Arc', range: '30 m', bonus: '+3', damage: '1d6' },
    ],
    specialAbilities: [
      {
        name: 'Embuscade',
        text: "Au premier round de combat, si l'environnement permet de se dissimuler, la cible doit faire un test de PER difficulté 16 ou être surprise.",
      },
    ],
    sourcePage: 263,
  },
  {
    id: 'chef-bandit',
    name: 'Chef bandit',
    category: 'humanoides',
    nc: 2,
    nature: ['humanoide'],
    baseCreatureId: 'bandit-de-base',
    abilities: { AGI: 2, CON: 3, FOR: 3, PER: 0, CHA: 2, INT: 0, VOL: 2 },
    bonusDieAbilities: ['AGI', 'PER'],
    defense: 16,
    hitPoints: 25,
    initiative: 13,
    attacks: [
      { name: 'Épée longue', bonus: '+6', damage: '1d8+3' },
      { name: 'Arc', range: '30 m', bonus: '+5', damage: '1d6+2' },
    ],
    specialAbilities: [
      {
        name: 'Embuscade',
        text: "Au premier round de combat, si l'environnement permet de se dissimuler, la cible doit faire un test de PER difficulté 16 ou être surprise.",
      },
      {
        name: 'Attaque en traître (L)',
        text: "Si la créature attaque en même temps qu'un allié ou par surprise, elle obtient +1d4 DM.",
        richText: "Si la créature attaque en même temps qu'un allié ou par surprise, elle obtient +{1d4} DM.",
      },
      {
        name: 'Chef',
        text: "Le chef bandit donne un bonus de +1 en Init., en attaque et aux DM à tous les bandits à portée de vue.",
      },
    ],
    sourcePage: 263,
  },

  // --- Gardes (p. 263-265) --------------------------------------------------
  {
    id: 'milicien',
    name: 'Milicien',
    category: 'humanoides',
    nc: 0.5,
    ncNote: '1/2',
    nature: ['humanoide'],
    description:
      "Des villages et zones rurales aux grandes cités, il existe un éventail de personnes chargées de protéger la population et (parfois surtout) les dirigeants, avec des compétences variables.\nLe milicien est un simple citoyen qui a été peu entraîné et armé pour défendre son village ou patrouiller.\nLe garde de la ville est un garde professionnel, mieux équipé et entraîné qu'un simple milicien.\nUn vétéran ou un garde de palais ducal a déjà connu la guerre ou fait partie d'une force d'élite, ce qui lui vaut d'être au service direct de son seigneur. Il peut aussi diriger une équipe de milicien.\nLe capitaine est un officier qui a gravi les échelons grâce à ses compétences ou qui est bien né et a profité des meilleurs mentors et du meilleur équipement possible.",
    abilities: { AGI: 0, CON: 1, FOR: 1, PER: 0, CHA: 0, INT: -1, VOL: -1 },
    defense: 14,
    hitPoints: 9,
    initiative: 10,
    attacks: [{ name: 'Pique', bonus: '+2', damage: '1d10+1' }],
    sourcePage: 264,
  },
  {
    id: 'garde-de-la-ville',
    name: 'Garde de la ville',
    category: 'humanoides',
    nc: 1,
    nature: ['humanoide'],
    baseCreatureId: 'milicien',
    abilities: { AGI: 0, CON: 1, FOR: 2, PER: 0, CHA: 0, INT: -1, VOL: 0 },
    defense: 16,
    hitPoints: 15,
    initiative: 10,
    attacks: [
      { name: 'Épée longue', bonus: '+4', damage: '1d8+2' },
      { name: 'Arbalète', range: '30 m', bonus: '+4', damage: '2d4' },
    ],
    sourcePage: 264,
  },
  {
    id: 'veteran-garde-palais-ducal',
    name: 'Vétéran ou garde de palais ducal',
    category: 'humanoides',
    nc: 2,
    nature: ['humanoide'],
    baseCreatureId: 'milicien',
    abilities: { AGI: 0, CON: 2, FOR: 2, PER: 0, CHA: 0, INT: 0, VOL: 1 },
    bonusDieAbilities: ['CON', 'PER'],
    defense: 17,
    hitPoints: 25,
    initiative: 13,
    attacks: [
      { name: 'Épée longue', bonus: '+6', damage: '1d8+4' },
      { name: 'Arbalète lourde', range: '50 m', bonus: '+6', damage: '3d4' },
    ],
    specialAbilities: [
      {
        name: 'Capacité au choix',
        text: 'Choisir une capacité parmi les trois proposées : Brise-genou, Imparable ou Sergent.',
      },
      {
        name: 'Brise-genou',
        text: "Si un adversaire au contact tente de s'éloigner de la créature (généralement pour fuir), elle obtient une attaque de contact gratuite contre lui. Si cette attaque est réussie, en plus des DM habituels, la cible doit réussir un test de CON difficulté 15 ou diviser par deux tous ses déplacements pour le reste du combat.",
      },
      {
        name: 'Imparable',
        text: "Si la créature obtient 15-20 au d20 d'un test d'attaque (17 à 20 si la créature possède 2 attaques), elle inflige +2d4 DM supplémentaire et l'attaque est automatiquement réussie (quelle que soit la DEF de son adversaire). Les dés bonus ne sont pas multipliés en cas de critique.",
        richText: "Si la créature obtient 15-20 au d20 d'un test d'attaque (17 à 20 si la créature possède 2 attaques), elle inflige +{2d4} DM supplémentaire et l'attaque est automatiquement réussie (quelle que soit la DEF de son adversaire). Les dés bonus ne sont pas multipliés en cas de critique.",
      },
      {
        name: 'Sergent (G)',
        text: "Une fois par round, le sergent peut donner une action supplémentaire à n'importe quel allié sous ses ordres à portée de vue (attaque ou mouvement). Une fois par combat, une attaque qui aurait dû amener le sergent à 0 PV est ignorée.",
      },
    ],
    sourcePage: 264,
  },
  {
    id: 'capitaine',
    name: 'Capitaine',
    category: 'humanoides',
    nc: 4,
    nature: ['humanoide'],
    baseCreatureId: 'milicien',
    abilities: { AGI: 1, CON: 2, FOR: 3, PER: 0, CHA: 2, INT: 1, VOL: 2 },
    bonusDieAbilities: ['CON'],
    defense: 18,
    hitPoints: 50,
    initiative: 10,
    attacks: [{ name: 'Épée longue', attackCount: 2, bonus: '+8', damage: '1d8+3' }],
    specialAbilities: [
      {
        name: 'Capitaine',
        text: 'Le capitaine donne un bonus de +2 en initiative, en attaque et aux DM à toutes les créatures sous ses ordres à portée de vue.',
      },
      {
        name: 'Riposte',
        text: "La créature peut effectuer une attaque en action gratuite contre chaque adversaire qui l'attaque à l'exception de celui qu'elle a elle-même choisi d'attaquer à son tour.",
      },
    ],
    sourcePage: 265,
  },

  // --- Garde du corps (p. 265) ----------------------------------------------
  {
    id: 'garde-du-corps',
    name: 'Garde du corps',
    category: 'humanoides',
    nc: 3,
    nature: ['humanoide'],
    description: 'Un guerrier en armure chargé de protéger un marchand, un politicien ou un magicien.',
    abilities: { AGI: 1, CON: 3, FOR: 3, PER: 0, CHA: 0, INT: 0, VOL: 2 },
    bonusDieAbilities: ['PER'],
    defense: 20,
    hitPoints: 45,
    initiative: 13,
    attacks: [{ name: 'Épée longue', bonus: '+6', damage: '1d8+3' }],
    specialAbilities: [
      {
        name: 'Garde du corps',
        text: "La créature peut désigner gratuitement une cible à son contact chaque round (ce peut être une créature, mais aussi un objet). Elle réduit tous les DM que la cible subit de 5 points. Elle ne peut pas se désigner elle-même.",
      },
      {
        name: 'Inamovible',
        text: "La créature est immunisée aux états préjudiciables suivants : Surpris, Immobilisé, Renversé et elle ne peut être désarmée. De plus, elle ne subit aucun DM de la capacité Attaque sournoise du voleur ou d'autres capacités similaires.",
      },
    ],
    sourcePage: 265,
  },

  // --- Sorcier (p. 265-266) -------------------------------------------------
  {
    id: 'sorcier',
    name: 'Sorcier',
    category: 'humanoides',
    nc: 5,
    nature: ['humanoide'],
    description:
      "L'archétype du vil sorcier qui trafique avec la mort et les démons, il est forcément coupable de toutes les horreurs dont vos PJ cherchent l'origine… ou pas.",
    abilities: { AGI: 1, CON: 1, FOR: -1, PER: 0, CHA: 1, INT: 3, VOL: 3 },
    defense: 18,
    hitPoints: 45,
    initiative: 10,
    attacks: [
      { name: 'Dague', bonus: '+6', damage: '1d4+2', rider: '+2d6 poison' },
      { name: 'Attaque magique', bonus: '+10' },
    ],
    specialAbilities: [
      {
        name: 'Animer un cadavre (L)',
        text: "Ce pouvoir permet d'animer le cadavre d'une créature morte (portée 10 m) pendant le combat. La créature conserve son profil, mais elle subit une pénalité de -2 en attaque, en DEF et en Initiative. Lorsque le cadavre est à nouveau vaincu, il ne peut pas être réanimé. Le cadavre de la créature animée ne peut être d'un NC supérieur à 2.",
      },
      {
        name: 'Injonction mortelle (L)',
        text: "Une cible située à une distance maximum de 30 m doit réussir un test de CON difficulté 15 ou tomber à 0 PV (et mourir immédiatement s'il s'agit d'un PNJ). En cas de succès, la cible subit tout de même 2d6+5 DM. Ce pouvoir ne peut prendre une même créature pour cible qu'une seule fois par combat.",
        richText: "Une cible située à une distance maximum de 30 m doit réussir un test de CON difficulté 15 ou tomber à 0 PV (et mourir immédiatement s'il s'agit d'un PNJ). En cas de succès, la cible subit tout de même {2d6}+5 DM. Ce pouvoir ne peut prendre une même créature pour cible qu'une seule fois par combat.",
      },
      {
        name: "Pas de l'ombre (L)",
        text: "Le sorcier se fond dans les ombres et se téléporter à une distance maximum de 100 m jusqu'à 3 fois par combat. Le lieu d'arrivée doit être en ligne de vue ou parfaitement connu (10 minutes pour étudier le lieu).",
      },
      {
        name: 'Vampirisation (L)',
        text: "Le sorcier doit réussir un test opposé d'attaque magique contre une cible vivante à une distance maximum de 30 m. En cas de réussite, la cible subit 2d8 DM et le sorcier régénère autant de PV que de DM infligés. De plus, à chaque fois qu'une créature meurt à moins de 20 mètres de lui, il siphonne son énergie et gagne un nombre de PV égal au double du NC de la créature qui vient de mourir.",
        richText: "Le sorcier doit réussir un test opposé d'attaque magique contre une cible vivante à une distance maximum de 30 m. En cas de réussite, la cible subit {2d8} DM et le sorcier régénère autant de PV que de DM infligés. De plus, à chaque fois qu'une créature meurt à moins de 20 mètres de lui, il siphonne son énergie et gagne un nombre de PV égal au double du NC de la créature qui vient de mourir.",
      },
    ],
    sourcePage: 265,
  },
];

// ===========================================================================
// 2. ANIMAUX (p. 266-274)
// ===========================================================================

const animals: Creature[] = [
  {
    id: 'aigle-commun',
    name: 'Aigle commun',
    category: 'animaux',
    nc: 0.5,
    ncNote: '1/2',
    size: 'petite',
    description: "Ce profil correspond à tous les oiseaux de proie de grande taille (environ 2 m d'envergure).",
    abilities: { AGI: 3, CON: 2, FOR: -3, PER: 4, CHA: 0, INT: -4, VOL: 0 },
    bonusDieAbilities: ['AGI', 'PER'],
    defense: 13,
    hitPoints: 3,
    initiative: 16,
    attacks: [{ name: 'Serres', bonus: '+3', damage: '1d4' }],
    specialAbilities: [
      {
        name: 'Vol rapide',
        text: "La créature obtient une action de mouvement supplémentaire par round lorsqu'elle est en vol. Au premier round de combat, la créature obtient un dé bonus en attaque et +1d4 aux DM si elle est en vol et attaque une créature au sol.",
        richText: "La créature obtient une action de mouvement supplémentaire par round lorsqu'elle est en vol. Au premier round de combat, la créature obtient un dé bonus en attaque et +{1d4} aux DM si elle est en vol et attaque une créature au sol.",
      },
      {
        name: 'Emporter dans les airs',
        text: "La créature peut emporter dans les airs une créature de taille minuscule ou moins. En cas de chute, les créatures de taille minuscule subissent seulement 1 DM par dé de chute (au lieu de 1d4°).",
        richText: "La créature peut emporter dans les airs une créature de taille minuscule ou moins. En cas de chute, les créatures de taille minuscule subissent seulement 1 DM par dé de chute (au lieu de {1d4°}).",
      },
    ],
    sourcePage: 266,
  },
  {
    id: 'animal-minuscule',
    name: 'Animal minuscule',
    category: 'animaux',
    nc: 0,
    size: 'minuscule',
    description: 'Exemple : souris',
    abilities: { AGI: 3, CON: -4, FOR: -4, PER: 2, CHA: -2, INT: -4, VOL: -2 },
    bonusDieAbilities: ['AGI', 'PER'],
    defense: 13,
    hitPoints: 1,
    initiative: 16,
    attacks: [{ name: 'Morsure', bonus: '+1', damage: '0' }],
    specialAbilities: [
      {
        name: 'Minuscule',
        text: "La créature obtient un bonus de +10 aux tests d'escalade et de discrétion.",
      },
      {
        name: 'Attaques ridicules',
        text: "La créature n'inflige pas de DM sauf sur une réussite critique (1 DM).",
      },
    ],
    sourcePage: 266,
  },
  {
    id: 'animal-petit',
    name: 'Animal petit',
    category: 'animaux',
    nc: 0,
    size: 'petite',
    description: "Exemple : gros chien. L'aigle possède son propre profil.",
    abilities: { AGI: 2, CON: -2, FOR: -2, PER: 2, CHA: -2, INT: -4, VOL: 0 },
    bonusDieAbilities: ['AGI', 'PER'],
    defense: 13,
    hitPoints: 3,
    initiative: 15,
    attacks: [{ name: 'Morsure', bonus: '+3', damage: '1d6-2' }],
    sourcePage: 266,
  },
  {
    id: 'animal-tres-petit',
    name: 'Animal très petit',
    category: 'animaux',
    nc: 0,
    size: 'tres-petite',
    description: 'Exemple : chat',
    abilities: { AGI: 3, CON: -3, FOR: -3, PER: 2, CHA: -2, INT: -4, VOL: 0 },
    bonusDieAbilities: ['AGI', 'PER'],
    defense: 13,
    hitPoints: 2,
    initiative: 16,
    attacks: [{ name: 'Morsure', bonus: '+2', damage: '1' }],
    specialAbilities: [
      {
        name: 'Très petit',
        text: "La créature obtient un bonus de +5 aux tests d'escalade et de discrétion.",
      },
    ],
    sourcePage: 267,
  },
  {
    id: 'cheval-de-selle',
    name: 'Cheval de selle',
    category: 'animaux',
    nc: 1,
    size: 'grande',
    description:
      "Un cheval de selle n'est pas apte à subir le stress du combat, son cavalier subit un dé malus à toutes ses actions en selle en situation de combat.",
    abilities: { AGI: 0, CON: 4, FOR: 4, PER: 0, CHA: -1, INT: -4, VOL: -2 },
    bonusDieAbilities: ['CON'],
    defense: 11,
    hitPoints: 14,
    initiative: 10,
    attacks: [{ name: 'Ruade', bonus: '+2', damage: '1d4+4' }],
    specialAbilities: [
      { name: 'Monture', text: 'La créature double sa FOR pour porter une charge.' },
    ],
    sourcePage: 267,
  },
  {
    id: 'cheval-de-guerre',
    name: 'Cheval de guerre',
    category: 'animaux',
    nc: 1,
    size: 'grande',
    abilities: { AGI: 0, CON: 4, FOR: 5, PER: 0, CHA: -1, INT: -4, VOL: 0 },
    bonusDieAbilities: ['CON'],
    defense: 11,
    hitPoints: 14,
    initiative: 10,
    attacks: [{ name: 'Ruade', bonus: '+4', damage: '1d4+5' }],
    specialAbilities: [
      {
        name: 'Monture',
        text: "La créature double sa FOR pour porter une charge.\nUn cheval de guerre est apte à porter une barde, un ensemble de protections pour lui. Un caparaçon de maille augmente la DEF du cheval de +2 pour un prix de 100 pa. Une barde de plaques de métal apporte un bonus de +4 en DEF pour un prix de 400 pa. Les bardes font subir au cheval et à son cavalier un malus en Init. égal au bonus de DEF.\nLa DEF de la fidèle monture du chevalier (Voie du cavalier, rang 1), tient déjà compte du bonus de DEF d'une éventuelle barde. En revanche, le MJ peut toujours décider de lui permettre de trouver une barde magique pour améliorer sa DEF.\nEn tant que PNJ, un cheval de guerre lourd pour un cavalier de haut niveau pourrait bénéficier d'un ou plusieurs rangs de boss.",
      },
    ],
    sourcePage: 267,
  },
  {
    id: 'crocodile',
    name: 'Crocodile',
    category: 'animaux',
    nc: 2,
    size: 'moyenne',
    description:
      "Ces caractéristiques correspondent à tous les lézards de grande taille (environ 3 m) à forte dentition (alligator et autres varans).",
    abilities: { AGI: 0, CON: 3, FOR: 4, PER: 2, CHA: -2, INT: -4, VOL: 2 },
    bonusDieAbilities: ['AGI', 'FOR', 'PER'],
    defense: 15,
    hitPoints: 15,
    initiative: 15,
    attacks: [{ name: 'Morsure', bonus: '+4', damage: '1d6+3' }],
    specialAbilities: [
      {
        name: 'Embuscade',
        text: "Au premier round de combat, si l'environnement permet à la créature de se dissimuler, la cible doit faire un test de PER difficulté 15 ou être surprise. La créature obtient un dé bonus en attaque contre une cible surprise et, si l'attaque est réussie, toute créature dont la FOR est inférieure à la sienne est renversée. La créature obtient un bonus de +5 à tous les tests de discrétion.",
      },
      {
        name: 'Dévorer',
        text: "Lorsque la créature réussit une attaque avec un résultat de 15-20 au d20, elle saisit sa proie entre ses crocs ou ses griffes et lui inflige immédiatement une attaque gratuite supplémentaire.",
      },
    ],
    sourcePage: 267,
  },
  {
    id: 'bison',
    name: 'Bison',
    category: 'animaux',
    nc: 2,
    size: 'grande',
    description:
      "Ce profil correspond à tous les grands herbivores à cornes (taureau, etc.). Les femelles fuient généralement à moins de défendre un petit.",
    abilities: { AGI: 0, CON: 4, FOR: 4, PER: 2, CHA: -2, INT: -4, VOL: -2 },
    bonusDieAbilities: ['CON'],
    defense: 14,
    hitPoints: 30,
    initiative: 12,
    attacks: [{ name: 'Cornes', bonus: '+5', damage: '1d6+4' }],
    specialAbilities: [
      {
        name: 'Charge (L)',
        text: "La créature parcourt une distance maximale de 20 m et réalise une attaque avec un dé bonus. Si l'attaque est réussie, en plus des DM normaux, une victime de taille inférieure ou égale à la créature, doit faire un test de FOR difficulté 14 ou être renversée. Dans ce cas, la créature piétine (ou embroche) sa victime et les DM sont doublés.",
      },
      {
        // Ligne directrice générique pour fabriquer une variante « grand mâle » (le livre écrit
        // « généralement ») : ne correspond pas exactement aux deltas du Grand mâle du bison ni du lion.
        name: 'Grand mâle',
        text: 'Les grands mâles ont généralement un NC augmenté de 1 et +2 en attaque, en DEF et aux DM ainsi que +20 PV.',
      },
    ],
    sourcePage: 268,
  },
  {
    id: 'bison-grand-male',
    name: 'Grand mâle',
    category: 'animaux',
    nc: 3,
    size: 'grande',
    baseCreatureId: 'bison',
    description: 'Un grand mâle, environ 1,80 m au garrot pour une tonne.',
    abilities: { AGI: 0, CON: 6, FOR: 6, PER: 2, CHA: -2, INT: -4, VOL: 0 },
    bonusDieAbilities: ['CON'],
    defense: 15,
    hitPoints: 40,
    initiative: 12,
    attacks: [{ name: 'Cornes', bonus: '+8', damage: '2d6+6' }],
    specialAbilities: [{ name: 'Charge (voir ci-dessus)', text: 'Voir la Charge du Bison de base.' }],
    sourcePage: 268,
  },
  {
    id: 'elephant',
    name: 'Éléphant',
    category: 'animaux',
    nc: 6,
    size: 'enorme',
    description: "Ce profil correspond à un éléphant d'Afrique moyen.",
    abilities: { AGI: 0, CON: 10, FOR: 10, PER: 1, CHA: -2, INT: -4, VOL: 0 },
    bonusDieAbilities: ['CON', 'FOR'],
    defense: 21,
    hitPoints: 90,
    hitPointsNote: 'RD3',
    initiative: 11,
    attacks: [{ name: 'Trompe et défenses', bonus: '+12', damage: '2d10+12' }],
    specialAbilities: [
      {
        name: 'Charge (L)',
        text: "La créature parcourt une distance maximale de 20 m et réalise une attaque avec un dé bonus. Si l'attaque est réussie, en plus des DM normaux, une victime de taille inférieure ou égale à la créature, doit faire un test de FOR difficulté 20 ou être renversée. Dans ce cas, la créature piétine (ou embroche) sa victime et les DM sont doublés.",
      },
      {
        name: 'Fauchage',
        text: "Sur 15 à 20 au test d'attaque, si l'attaque est réussie, la victime doit réussir au choix un test de FOR ou d'AGI difficulté 20 ou être renversée. La créature retranche 3 à tous les DM subis (RD 3).",
      },
    ],
    sourcePage: 268,
  },
  {
    id: 'gorille',
    name: 'Gorille',
    category: 'animaux',
    nc: 3,
    size: 'grande',
    description:
      "Le gorille est habituellement un animal placide si on ne le dérange pas, toutefois rien ne vous empêche de décider que la version fantastique de cet animal est plus agressive. Un gorille mâle pèse environ 250 kg et possède une envergure de bras impressionnante de 2,50 m…",
    abilities: { AGI: 4, CON: 5, FOR: 5, PER: 2, CHA: -2, INT: -3, VOL: 0 },
    bonusDieAbilities: ['AGI', 'CON', 'FOR'],
    defense: 18,
    hitPoints: 30,
    initiative: 12,
    attacks: [{ name: 'Poings et morsure', bonus: '+7', damage: '2d6+5' }],
    specialAbilities: [
      {
        name: 'Charge (L)',
        text: "Le gorille parcourt une distance maximale de 20 m et réalise une attaque avec un dé bonus. Si l'attaque est réussie, en plus des DM normaux, une victime de taille inférieure ou égale à la créature, doit faire un test de FOR difficulté 15 ou être renversée. Dans ce cas, le gorille roue de coups sa victime et les DM sont doublés.",
      },
      {
        name: 'Passage par les arbres',
        text: "Le gorille se déplace aussi vite dans les arbres qu'au sol. Le gorille obtient un bonus de +5 en discrétion en forêt.",
      },
    ],
    sourcePage: 269,
  },
  {
    id: 'lion',
    name: 'Lion',
    category: 'animaux',
    nc: 3,
    size: 'grande',
    description: "Ce profil correspond à un jeune lion ou à une lionne d'environ 150 kg.",
    abilities: { AGI: 4, CON: 5, FOR: 5, PER: 2, CHA: -2, INT: -3, VOL: 0 },
    bonusDieAbilities: ['AGI', 'PER'],
    defense: 17,
    hitPoints: 30,
    initiative: 15,
    attacks: [{ name: 'Morsure et griffes', bonus: '+6', damage: '2d6+5' }],
    specialAbilities: [
      {
        name: 'Embuscade',
        text: "Au premier round de combat, si l'environnement permet à la créature de se dissimuler, la cible doit faire un test de PER difficulté 19 ou être surprise. Si elle attaque avec succès une cible surprise, la créature inflige +1d4 aux DM et toute créature dont la FOR est inférieure à la sienne est renversée. La créature obtient un bonus de +5 à tous les tests de discrétion.",
        richText: "Au premier round de combat, si l'environnement permet à la créature de se dissimuler, la cible doit faire un test de PER difficulté 19 ou être surprise. Si elle attaque avec succès une cible surprise, la créature inflige +{1d4} aux DM et toute créature dont la FOR est inférieure à la sienne est renversée. La créature obtient un bonus de +5 à tous les tests de discrétion.",
      },
      {
        name: 'Dévorer',
        text: "Lorsque la créature réussit une attaque avec un résultat de 15-20 au d20, elle saisit sa proie entre ses crocs ou ses griffes et lui inflige immédiatement une attaque gratuite supplémentaire.",
      },
    ],
    sourcePage: 269,
  },
  {
    id: 'lion-grand-male',
    name: 'Grand mâle',
    category: 'animaux',
    nc: 4,
    size: 'grande',
    baseCreatureId: 'lion',
    description:
      "Un lion mâle peut peser jusqu'à 300 kg, le tigre du Bengale n'est pas beaucoup plus gros qu'un lion. Le tigre de Sibérie, la plus grande espèce, peut peser jusqu'à plus de 350 kg pour 1,20 m au garrot.",
    abilities: { AGI: 4, CON: 6, FOR: 6, PER: 2, CHA: -2, INT: -3, VOL: 2 },
    bonusDieAbilities: ['AGI', 'PER'],
    defense: 18,
    hitPoints: 50,
    initiative: 15,
    attacks: [{ name: 'Morsure et griffes', bonus: '+8', damage: '2d6+8' }],
    sharedAbilitiesNote: 'Capacités : voir ci-dessus (Lion).',
    sourcePage: 269,
  },
  {
    id: 'loup',
    name: 'Loup',
    category: 'animaux',
    nc: 1,
    size: 'moyenne',
    description: "Ce profil correspond à un loup d'une cinquantaine de kilogrammes.",
    abilities: { AGI: 1, CON: 1, FOR: 1, PER: 2, CHA: -2, INT: -4, VOL: 0 },
    bonusDieAbilities: ['CON', 'PER'],
    defense: 13,
    defenseNote: '16',
    hitPoints: 9,
    initiative: 15,
    attacks: [{ name: 'Morsure', bonus: '+3', damage: '1d6+1' }],
    specialAbilities: [
      {
        name: 'Interchangeables',
        text: "Tant que la créature et ses alliées sont plus nombreuses que la cible, elles se relaient pour esquiver ses attaques et elles obtiennent un bonus de +3 en DEF. Si plusieurs créatures semblables sont au contact du PJ, le MJ a toute latitude pour infliger les DM d'une attaque sur une créature au hasard, le personnage ne sait jamais laquelle il blesse. Seul, le loup n'a pas usage de la capacité interchangeable et son NC passe à ½.",
      },
      {
        name: 'Chien',
        text: 'Vous pouvez aussi utiliser le profil du loup pour les gros chiens en retirant de 2 à 4 PV.',
      },
    ],
    sourcePage: 270,
  },
  {
    id: 'loup-male-alpha',
    name: 'Mâle alpha',
    category: 'animaux',
    nc: 2,
    size: 'moyenne',
    baseCreatureId: 'loup',
    description:
      "Chaque meute de loups possède un mâle dominant plus gros que ses congénères (jusqu'à 80 kg). Si les personnages rencontrent un loup solitaire, il sera souvent basé sur ce profil. Un chef de meute accompagné de sa bande de 6 loups est une rencontre ordinaire de niveau 5.",
    abilities: { AGI: 1, CON: 3, FOR: 3, PER: 2, CHA: -2, INT: -4, VOL: 2 },
    bonusDieAbilities: ['AGI', 'CON', 'PER'],
    defense: 15,
    hitPoints: 15,
    initiative: 15,
    attacks: [{ name: 'Morsure', bonus: '+4', damage: '1d6+3' }],
    specialAbilities: [
      {
        name: 'Chef de meute',
        text: "Le chef de meute donne un bonus de +2 en initiative, en attaque et aux DM, à tous les loups de sa meute à portée de vue. De plus, s'il attaque en même temps qu'un autre loup, il réalise une attaque avec un dé bonus et +2d4 DM.",
        richText: "Le chef de meute donne un bonus de +2 en initiative, en attaque et aux DM, à tous les loups de sa meute à portée de vue. De plus, s'il attaque en même temps qu'un autre loup, il réalise une attaque avec un dé bonus et +{2d4} DM.",
      },
    ],
    sourcePage: 270,
  },
  {
    id: 'ours-noir',
    name: 'Ours noir',
    category: 'animaux',
    nc: 2,
    size: 'moyenne',
    description:
      "Ce profil correspond aux espèces d'ours de petite taille ne dépassant pas 150 kg. Plus agile et plus rapide que son cousin l'ours brun, il est tout à fait capable de grimper aux arbres.",
    abilities: { AGI: 2, CON: 3, FOR: 3, PER: 2, CHA: -2, INT: -4, VOL: 0 },
    bonusDieAbilities: ['AGI', 'FOR'],
    defense: 17,
    hitPoints: 35,
    initiative: 12,
    attacks: [{ name: 'Morsure et griffes', bonus: '+6', damage: '2d6+3' }],
    sourcePage: 270,
  },
  {
    id: 'ours-brun',
    name: 'Ours brun',
    category: 'animaux',
    nc: 4,
    size: 'grande',
    description:
      "L'ours brun mesure environ 1,50 m au garrot et jusqu'à 2,50 m lorsqu'il se dresse sur ses pattes postérieures pour un poids d'environ 300 kg. On peut aussi trouver des spécimens d'ours noir particulièrement massifs (jusqu'à 400 kg) qui correspondent à ce profil.",
    abilities: { AGI: 1, CON: 6, FOR: 6, PER: 2, CHA: -2, INT: -4, VOL: 1 },
    bonusDieAbilities: ['CON'],
    defense: 18,
    hitPoints: 50,
    initiative: 12,
    attacks: [{ name: 'Morsure et griffes', bonus: '+10', damage: '2d6+6' }],
    specialAbilities: [
      {
        name: 'Charge (L)',
        text: "La créature parcourt une distance maximale de 20 m et réalise une attaque avec un dé bonus. Si l'attaque est réussie, en plus des DM normaux, une victime de taille inférieure ou égale à la créature, doit faire un test de FOR difficulté 16 ou être renversée. Dans ce cas, la créature piétine (ou embroche) sa victime et les DM sont doublés.",
      },
      {
        name: 'Enragé',
        text: "Lorsqu'elle reçoit un coup critique, la créature devient enragée. Elle ignore les pénalités de douleur ou la peur, augmente de +3 sa valeur d'attaque au contact et ses DM de +1d4. Elle peut encore agir un tour complet après avoir atteint 0 PV.",
        richText: "Lorsqu'elle reçoit un coup critique, la créature devient enragée. Elle ignore les pénalités de douleur ou la peur, augmente de +3 sa valeur d'attaque au contact et ses DM de +{1d4}. Elle peut encore agir un tour complet après avoir atteint 0 PV.",
      },
    ],
    sourcePage: 271,
  },
  {
    id: 'ours-polaire',
    name: 'Ours polaire',
    category: 'animaux',
    nc: 6,
    size: 'grande',
    description:
      "Avec des mensurations moyennes de 500 kg pour 3 m le grand ours polaire mâle est le plus gros prédateur terrestre avec l'ours Kodiak (encore un peu plus gros).",
    abilities: { AGI: 0, CON: 8, FOR: 8, PER: 2, CHA: -2, INT: -4, VOL: 1 },
    bonusDieAbilities: ['CON', 'FOR'],
    defense: 20,
    hitPoints: 80,
    initiative: 12,
    attacks: [{ name: 'Morsure et griffes', bonus: '+12', damage: '2d8+10' }],
    specialAbilities: [
      {
        name: 'Charge (L)',
        text: "La créature parcourt une distance maximale de 20 m et réalise une attaque avec un dé bonus. Si l'attaque est réussie, en plus des DM normaux, une victime de taille inférieure ou égale à la créature, doit faire un test de FOR difficulté 16 ou être renversée. Dans ce cas, la créature piétine (ou embroche) sa victime et les DM sont doublés.",
      },
      {
        name: 'Dévorer',
        text: "Lorsque la créature réussit une attaque avec un résultat de 15-20 au d20, elle saisit sa proie entre ses crocs ou ses griffes et lui inflige immédiatement une attaque gratuite supplémentaire.",
      },
      {
        name: 'Enragé',
        text: "Lorsqu'elle reçoit un coup critique, la créature devient enragée. Elle ignore les pénalités de douleur ou la peur, augmente de +3 sa valeur d'attaque au contact et ses DM d'attaque de +1d4. Elle peut encore agir un tour complet après avoir atteint 0 PV.",
        richText: "Lorsqu'elle reçoit un coup critique, la créature devient enragée. Elle ignore les pénalités de douleur ou la peur, augmente de +3 sa valeur d'attaque au contact et ses DM d'attaque de +{1d4}. Elle peut encore agir un tour complet après avoir atteint 0 PV.",
      },
    ],
    sourcePage: 271,
  },
  {
    id: 'panthere',
    name: 'Panthère',
    category: 'animaux',
    nc: 2,
    size: 'moyenne',
    description:
      "Ce profil convient à tous les félins de taille moyenne comme le léopard, le jaguar ou le lion des montagnes.",
    abilities: { AGI: 4, CON: 2, FOR: 2, PER: 2, CHA: -2, INT: -4, VOL: 1 },
    bonusDieAbilities: ['AGI', 'PER'],
    defense: 16,
    hitPoints: 15,
    initiative: 15,
    attacks: [{ name: 'Morsure et Griffes', bonus: '+5', damage: '1d6+2' }],
    specialAbilities: [
      {
        name: 'Embuscade',
        text: "Au premier round de combat, si l'environnement permet à la créature de se dissimuler, la cible doit faire un test de PER difficulté 19 ou être surprise. Si elle attaque avec succès une cible surprise, la créature inflige +1d4 DM et toute créature dont la FOR est inférieure à la sienne est renversée. La créature obtient un bonus de +5 à tous les tests de discrétion.",
        richText: "Au premier round de combat, si l'environnement permet à la créature de se dissimuler, la cible doit faire un test de PER difficulté 19 ou être surprise. Si elle attaque avec succès une cible surprise, la créature inflige +{1d4} DM et toute créature dont la FOR est inférieure à la sienne est renversée. La créature obtient un bonus de +5 à tous les tests de discrétion.",
      },
      {
        name: 'Dévorer',
        text: "Lorsque la créature réussit une attaque avec un résultat de 15-20 au d20, elle saisit sa proie entre ses crocs ou ses griffes et lui inflige immédiatement une attaque gratuite supplémentaire.",
      },
    ],
    sourcePage: 271,
  },
  {
    id: 'requin',
    name: 'Requin',
    category: 'animaux',
    nc: 4,
    size: 'grande',
    abilities: { AGI: 3, CON: 5, FOR: 5, PER: 0, CHA: -3, INT: -4, VOL: 2 },
    defense: 18,
    hitPoints: 50,
    initiative: 13,
    attacks: [{ name: 'Morsure', bonus: '+10', damage: '2d8+5' }],
    specialAbilities: [
      {
        name: 'Dévorer',
        text: "Lorsque le requin réussit une attaque avec un résultat de 15-20 au d20, il saisit sa proie entre ses crocs et lui inflige immédiatement une attaque gratuite supplémentaire. Si la FOR de la cible est inférieure ou égale au prédateur, elle est de plus immobilisée. Pour se libérer, la victime doit réussir un test de FOR difficulté 15 lors de son tour et cela lui demande une action de mouvement.",
      },
      {
        name: 'Créature aquatique',
        text: "Le requin ne subit aucune pénalité pour attaquer et se déplacer sous l'eau et il bénéficie d'un bonus de +3 en initiative.",
      },
    ],
    sourcePage: 272,
  },
  {
    id: 'rhinoceros',
    name: 'Rhinocéros',
    category: 'animaux',
    nc: 4,
    size: 'grande',
    description:
      "Selon les espèces, le rhinocéros peut mesurer de 3 à 4 m de long pour un poids de 800 kg à 2 t. Les grands rhinocéros blancs pèsent parfois plus de 3 t et vous pourrez leur ajouter un rang de Boss (+1 NC, +2 en DEF et en Att, +2 DM et +2 PV).",
    abilities: { AGI: 0, CON: 8, FOR: 8, PER: 0, CHA: -2, INT: -4, VOL: 0 },
    bonusDieAbilities: ['CON', 'FOR'],
    defense: 18,
    hitPoints: 50,
    initiative: 10,
    attacks: [{ name: 'Corne', bonus: '+8', damage: '2d6+8' }],
    specialAbilities: [
      {
        name: 'Charge (L)',
        text: "La créature parcourt une distance maximale de 20 m et réalise une attaque avec un dé bonus. Si l'attaque est réussie, en plus de subir les DM normaux, une victime de taille inférieure ou égale à la créature doit faire un test de FOR difficulté 18 ou être renversée. Dans ce cas, la créature piétine sa victime et les DM sont doublés.",
      },
      {
        name: 'Enragé',
        text: "Lorsqu'elle reçoit un coup critique, la créature devient enragée. Elle ignore les pénalités de douleur ou la peur, augmente de +3 sa valeur d'attaque au contact et ses DM de +1d4. Elle peut encore agir un tour complet après avoir atteint 0 PV.",
        richText: "Lorsqu'elle reçoit un coup critique, la créature devient enragée. Elle ignore les pénalités de douleur ou la peur, augmente de +3 sa valeur d'attaque au contact et ses DM de +{1d4}. Elle peut encore agir un tour complet après avoir atteint 0 PV.",
      },
    ],
    sourcePage: 273,
  },
  {
    id: 'sanglier',
    name: 'Sanglier',
    category: 'animaux',
    nc: 3,
    size: 'moyenne',
    description:
      "Les sangliers mâles pèsent généralement autour de 150 kg, mais on peut rencontrer des spécimens de 200 à 300 kg.",
    abilities: { AGI: 0, CON: 3, FOR: 3, PER: 1, CHA: -2, INT: -4, VOL: 2 },
    bonusDieAbilities: ['CON', 'FOR'],
    defense: 16,
    hitPoints: 20,
    initiative: 11,
    attacks: [{ name: 'Défenses', bonus: '+6', damage: '2d4+3' }],
    specialAbilities: [
      {
        name: 'Charge (L)',
        text: "La créature parcourt une distance maximale de 20 m et réalise une attaque avec un dé bonus. Si l'attaque est réussie, en plus de subir les DM normaux, une victime de taille inférieure ou égale à la créature, doit faire un test de FOR difficulté 13 ou être renversée. Dans ce cas, la créature éventre sa victime et les DM sont doublés.",
      },
      {
        name: 'Tape dur',
        text: "Si la créature obtient 15 à 20 au dé du test d'attaque, l'attaque est automatiquement réussie. De surcroît, la victime doit réussir un test de CON difficulté 13 ou être étourdie pendant 1 round.",
      },
      {
        name: 'Enragé',
        text: "Lorsqu'elle reçoit un coup critique, la créature devient enragée. Elle ignore les pénalités de douleur ou la peur, augmente de +3 sa valeur d'attaque au contact et ses DM de +1d4. Elle peut encore agir un tour complet après avoir atteint 0 PV.",
        richText: "Lorsqu'elle reçoit un coup critique, la créature devient enragée. Elle ignore les pénalités de douleur ou la peur, augmente de +3 sa valeur d'attaque au contact et ses DM de +{1d4}. Elle peut encore agir un tour complet après avoir atteint 0 PV.",
      },
    ],
    sourcePage: 273,
  },
  {
    id: 'serpent-constricteur',
    name: 'Serpent constricteur',
    category: 'animaux',
    nc: 3,
    size: 'moyenne',
    description:
      "Ce profil correspond au boa ou au python. Toutefois, cette famille de serpents comprend de grandes disparités de taille et de poids, allant de 2 m pour une quinzaine de kilos à plus de 6 m pour 150 kg et au-delà. Les caractéristiques présentées ici correspondent à un spécimen d'environ 4 m pour 80 kg.",
    abilities: { AGI: 0, CON: 4, FOR: 4, PER: 0, CHA: -2, INT: -4, VOL: 0 },
    bonusDieAbilities: ['FOR', 'PER'],
    defense: 15,
    hitPoints: 30,
    initiative: 13,
    attacks: [{ name: 'Morsure', bonus: '+4', damage: '1d6+4', rider: '+ étreinte' }],
    specialAbilities: [
      {
        name: 'Embuscade',
        text: "Au premier round de combat, si l'environnement permet à la créature de se dissimuler, la cible doit faire un test de PER difficulté 15 ou être surprise. Si elle attaque avec succès une cible surprise, la créature inflige +1d4 DM et toute créature dont la FOR est inférieure à la sienne est renversée. La créature obtient un bonus de +5 à tous les tests de discrétion.",
        richText: "Au premier round de combat, si l'environnement permet à la créature de se dissimuler, la cible doit faire un test de PER difficulté 15 ou être surprise. Si elle attaque avec succès une cible surprise, la créature inflige +{1d4} DM et toute créature dont la FOR est inférieure à la sienne est renversée. La créature obtient un bonus de +5 à tous les tests de discrétion.",
      },
      {
        name: 'Étreinte',
        text: "Chaque fois que le serpent réussit une attaque, la cible doit réussir un test de FOR (ou d'AGI au choix) difficulté 10. En cas d'échec, le serpent s'enroule autour d'elle et commence à l'étouffer, infligeant automatiquement 1d4 DM supplémentaires par round. La victime est immobilisée. Elle peut tenter de se libérer au prix d'une action de mouvement à son tour, en réussissant un test de FOR difficulté 14.",
        richText: "Chaque fois que le serpent réussit une attaque, la cible doit réussir un test de FOR (ou d'AGI au choix) difficulté 10. En cas d'échec, le serpent s'enroule autour d'elle et commence à l'étouffer, infligeant automatiquement {1d4} DM supplémentaires par round. La victime est immobilisée. Elle peut tenter de se libérer au prix d'une action de mouvement à son tour, en réussissant un test de FOR difficulté 14.",
      },
    ],
    sourcePage: 274,
  },
  {
    id: 'serpent-venimeux',
    name: 'Serpent venimeux',
    category: 'animaux',
    nc: 1,
    size: 'tres-petite',
    description: "Ce profil correspond à un serpent d'environ un mètre de long : crotale, vipère, etc.",
    abilities: { AGI: 3, CON: 0, FOR: -3, PER: 2, CHA: -2, INT: -4, VOL: -2 },
    bonusDieAbilities: ['AGI'],
    defense: 15,
    hitPoints: 2,
    initiative: 12,
    attacks: [{ name: 'Morsure', bonus: '+3', damage: '1', rider: '+ Poison' }],
    specialAbilities: [
      {
        name: 'Embuscade',
        text: "Au premier round de combat, si l'environnement permet à la créature de se dissimuler, la cible doit faire un test de PER difficulté 15 ou être surprise. La créature obtient un bonus de +5 à tous les tests de discrétion.",
      },
      {
        name: 'Venin',
        text: "La victime d'une morsure de serpent venimeux doit faire un test de CON difficulté 15 à chaque morsure. En cas d'échec la victime subit 1 DM supplémentaire par round pendant 1d6 rounds. De plus, la victime est affaiblie pour une durée similaire exprimée en heures. Chaque nouvelle morsure augmente la durée (mais pas les DM par round).",
        richText: "La victime d'une morsure de serpent venimeux doit faire un test de CON difficulté 15 à chaque morsure. En cas d'échec la victime subit 1 DM supplémentaire par round pendant {1d6} rounds. De plus, la victime est affaiblie pour une durée similaire exprimée en heures. Chaque nouvelle morsure augmente la durée (mais pas les DM par round).",
      },
      {
        name: 'Crachat (A)',
        text: "Certains serpents crachent leur venin dans les yeux de leur adversaire pour l'aveugler. La victime doit réussir un test d'AGI difficulté 12 ou être aveuglée pour 1d6 rounds.",
        richText: "Certains serpents crachent leur venin dans les yeux de leur adversaire pour l'aveugler. La victime doit réussir un test d'AGI difficulté 12 ou être aveuglée pour {1d6} rounds.",
      },
    ],
    sourcePage: 274,
  },
];

// ===========================================================================
// 3. CRÉATURES FANTASTIQUES (p. 275-302)
// ===========================================================================

const fantasticCreatures: Creature[] = [
  {
    id: 'araignee-geante',
    name: 'Araignée géante',
    category: 'creatures-fantastiques',
    nc: 3,
    size: 'moyenne',
    description:
      "Les araignées géantes (arthropodes) sont des monstres terrifiants : rapides, puissants et capables de survivre aux pires blessures. On trouve les araignées géantes dans les forêts sombres et reculées, mais aussi dans les souterrains, surtout les plus grosses d'entre elles. Il en existe de nombreuses variantes, mais celle que nous vous proposons ici fait le poids d'un humain, elle est donc moins haute mais occupe un espace de presque 2 m de diamètre.",
    abilities: { AGI: 4, CON: 3, FOR: 3, PER: 2, CHA: -4, INT: -4, VOL: 0 },
    bonusDieAbilities: ['AGI', 'CON', 'FOR'],
    defense: 17,
    hitPoints: 30,
    initiative: 12,
    attacks: [{ name: 'Attaque', bonus: '+6', damage: '2d6+4', rider: '+ poison (2d6, difficulté 12)' }],
    specialAbilities: [
      {
        name: 'Poison mortel',
        text: "Le poison inflige 2d6 DM supplémentaires à la victime à chaque attaque. Si la victime réussit un test de CON de la difficulté indiquée, elle subit seulement la moitié des DM.",
        richText: "Le poison inflige {2d6} DM supplémentaires à la victime à chaque attaque. Si la victime réussit un test de CON de la difficulté indiquée, elle subit seulement la moitié des DM.",
      },
      {
        name: 'Vermine',
        text: "Une araignée géante peut encore agir un round complet lorsqu'elle atteint 0 PV. Une araignée se déplace de 15 m par action de mouvement.",
      },
      {
        name: 'Variantes',
        text: 'Choisissez un type de poison et soit Toile (L), soit Araignée chasseuse.',
      },
      {
        name: 'Araignée chasseuse',
        text: "Au premier round de combat, si l'environnement permet à la créature de se dissimuler, la cible doit faire un test de PER difficulté 19 ou être surprise. Si elle attaque avec succès une cible surprise, la créature inflige +1d4 DM et toute créature dont la FOR est inférieure à la sienne est renversée. La créature obtient un bonus de +5 à tous les tests de discrétion.",
        richText: "Au premier round de combat, si l'environnement permet à la créature de se dissimuler, la cible doit faire un test de PER difficulté 19 ou être surprise. Si elle attaque avec succès une cible surprise, la créature inflige +{1d4} DM et toute créature dont la FOR est inférieure à la sienne est renversée. La créature obtient un bonus de +5 à tous les tests de discrétion.",
      },
      {
        name: 'Toile (L)',
        text: "Sur un test d'attaque réussi (portée 3 m), l'araignée emprisonne sa cible dans une toile gluante et solide. Elle est immobilisée ; se libérer nécessite l'usage d'une action limitée et il faut réussir un test de FOR difficulté 12.",
      },
    ],
    sourcePage: 275,
  },
  {
    id: 'basilic',
    name: 'Basilic',
    category: 'creatures-fantastiques',
    nc: 3,
    size: 'grande',
    description:
      "Le basilic est un reptile à 8 pattes d'environ 150 kg particulièrement hideux. Toutefois, peu de personnes peuvent se vanter de connaître son apparence exacte, car son regard pétrifiant rend son observation directe particulièrement mortelle. Le basilic vit dans une grande variété de milieux naturels, mais il est très commun dans les déserts ou les montagnes. Un basilic voit dans le noir.",
    abilities: { AGI: 0, CON: 3, FOR: 3, PER: 2, CHA: -1, INT: -4, VOL: 0 },
    bonusDieAbilities: ['FOR'],
    defense: 17,
    hitPoints: 30,
    initiative: 12,
    attacks: [{ name: 'Morsure', bonus: '+6', damage: '2d6+4' }],
    specialAbilities: [
      {
        name: 'Regard pétrifiant',
        text: "Celui qui regarde le basilic et croise son regard est pétrifié. Un personnage qui n'est pas conscient du danger doit réussir un test de CON difficulté 15 à chaque round de combat (à son tour) ou être immédiatement transformé en pierre. La transformation est permanente, mais un sort de Délivrance (prêtre) lancé moins de 1 jour par niveau du prêtre après la pétrification peut ramener la victime à la vie.",
      },
      {
        name: 'Détourner le regard',
        text: "Un personnage qui combat le basilic sans tactique particulière, si ce n'est éviter de croiser son regard doit réussir un test de CON difficulté 10 au début de son tour ou être pétrifié. Il subit un dé malus en attaque.",
      },
      {
        name: 'Fermer les yeux',
        text: "Le personnage est aveuglé (-5 en DEF et en attaque, pas d'attaque à distance ni de sorts ciblés), mais il ne risque pas d'être pétrifié, sauf échec critique en attaque (dans ce cas test de CON difficulté 10).",
      },
    ],
    sourcePage: 276,
  },
  {
    id: 'chimere',
    name: 'Chimère',
    category: 'creatures-fantastiques',
    nc: 7,
    size: 'grande',
    description:
      "La chimère est un monstre improbable, mélange de trois créatures. On pourrait la comparer à un lion pourvu de deux têtes supplémentaires, à gauche une tête de chèvre et à droite une tête d'aigle, tandis que sa queue est un long serpent aux crocs dégoulinants de poison. Des ailes se déploient dans son dos et les mots peinent à décrire une créature issue des pires cauchemars. La chimère fait la taille d'un énorme taureau, elle voit dans le noir et comprend le noir parler.",
    abilities: { AGI: 1, CON: 6, FOR: 6, PER: 2, CHA: -4, INT: -2, VOL: 2 },
    bonusDieAbilities: ['AGI', 'PER'],
    defense: 21,
    hitPoints: 100,
    initiative: 15,
    attacks: [
      { name: 'Morsure, bec ou cornes', attackCount: 3, bonus: '+14', damage: '1d6+6' },
      { name: 'Morsure de serpent', bonus: '+14', damage: '1d4+3', rider: '+ poison' },
    ],
    specialAbilities: [
      {
        name: 'Poison',
        text: "La victime subit 1d6 DM de poison et elle doit faire un test de CON difficulté 16. En cas d'échec, elle subit 1d6 DM supplémentaires par round pendant 5 rounds.",
        richText: "La victime subit {1d6} DM de poison et elle doit faire un test de CON difficulté 16. En cas d'échec, elle subit {1d6} DM supplémentaires par round pendant 5 rounds.",
      },
      {
        name: 'Riposte sournoise',
        text: "Si une créature attaque la chimère dans le dos, la chimère obtient une attaque supplémentaire de serpent contre cet attaquant en plus de ces attaques normales à ce tour.",
      },
      {
        name: 'Vol rapide',
        text: "La créature obtient une action de mouvement supplémentaire par round lorsqu'elle est en vol. Au premier round de combat, la créature obtient un dé bonus en attaque et +1d6 aux DM si elle est en vol et attaque une créature au sol.",
        richText: "La créature obtient une action de mouvement supplémentaire par round lorsqu'elle est en vol. Au premier round de combat, la créature obtient un dé bonus en attaque et +{1d6} aux DM si elle est en vol et attaque une créature au sol.",
      },
    ],
    sourcePage: 276,
  },
  {
    id: 'chimere-draconique',
    name: 'Chimère draconique',
    category: 'creatures-fantastiques',
    nc: 7,
    size: 'grande',
    baseCreatureId: 'chimere',
    description:
      "La chimère draconique est une cousine de la chimère ordinaire, mais sa tête d'aigle est remplacée par une tête de dragon. Encore plus dangereuse, elle est dotée d'un souffle qui dépend de la couleur de la tête de dragon (rouge pour feu, blanc pour froid, etc.). Elle parle le draconique.",
    sharedAbilitiesNote: 'Caractéristiques et autres capacités : comme la Chimère.',
    specialAbilities: [
      {
        // Le livre imprime « test de DEX » (terminologie héritée) ; corrigé en AGI (validé par le
        // propriétaire, 2026-07-23) — CO2 n'a pas de caractéristique DEX.
        name: 'Souffle (L)',
        text: "Le souffle est une attaque de zone affectant toutes les créatures dans un cône de 10 m de long sur 10 m de large. L'attaque inflige automatiquement (pas de test d'attaque) 6d6+9 DM. Les DM sont divisés par deux si la victime réussit un test d'AGI difficulté 15. La créature doit attendre 2d4 rounds avant d'utiliser à nouveau son souffle après chaque utilisation.",
        richText: "Le souffle est une attaque de zone affectant toutes les créatures dans un cône de 10 m de long sur 10 m de large. L'attaque inflige automatiquement (pas de test d'attaque) {6d6}+9 DM. Les DM sont divisés par deux si la victime réussit un test d'AGI difficulté 15. La créature doit attendre {2d4} rounds avant d'utiliser à nouveau son souffle après chaque utilisation.",
      },
    ],
    sourcePage: 277,
  },
  {
    id: 'demonet',
    name: 'Démonet',
    category: 'creatures-fantastiques',
    nc: 2,
    ncNote: '2 (3)',
    size: 'tres-petite',
    nature: ['humanoide'],
    description:
      "Le démonet représente l'image d'Épinal d'un démon miniature, de celui qui se perche sur votre épaule pour vous suggérer des actions maléfiques. Il possède une tête humaine, des ailes de chauve-souris, des cornes et une queue reptilienne fourchue à son extrémité.",
    abilities: { AGI: 3, CON: -2, FOR: -2, PER: 2, CHA: 0, INT: 1, VOL: -1 },
    bonusDieAbilities: ['AGI', 'CON', 'PER'],
    defense: 15,
    hitPoints: 15,
    hitPointsNote: 'RD 5',
    initiative: 15,
    attacks: [
      { name: 'Griffes et morsure', bonus: '+4', damage: '1d4' },
      { name: 'Queue fourchue', bonus: '+4', damage: '1', rider: '+ venin' },
    ],
    specialAbilities: [
      { name: 'Venin', text: "La victime doit réussir un test de CON difficulté 10 ou être affaiblie pendant 1d6 min." },
      {
        name: 'Transformation (L)',
        text: "Le démonet peut se transformer en n'importe quel animal de taille très petite (chien, chat, rat, corbeau, etc.) aussi longtemps qu'il le souhaite.",
      },
      {
        name: 'Invisibilité (A)*',
        text: "Le démon se rend invisible pendant 1d4 min. Une fois invisible, personne ne peut plus détecter sa présence ou lui porter d'attaque directe. S'il attaque, il redevient visible.",
        richText: "Le démon se rend invisible pendant {1d4} min. Une fois invisible, personne ne peut plus détecter sa présence ou lui porter d'attaque directe. S'il attaque, il redevient visible.",
      },
      { name: 'Vol', text: "Un démonet peut se déplacer en vol de 10 m par action de mouvement." },
      {
        name: 'Démon',
        text: "Les démons ne sont pas considérés comme des créatures non vivantes. Toutefois, ils partagent avec celles-ci de nombreux traits. Ils ne respirent pas, ne dorment jamais, ne connaissent pas la fatigue et sont immunisés au poison et aux maladies non magiques. Ils n'ont pas besoin de se sustenter, du moins pas de nourritures terrestres.",
      },
      { name: 'Résistance', text: "Tous les démons réduisent les DM de feu et d'acide de 10 points." },
      {
        name: 'Résistance aux armes',
        text: "Le démonet possède une RD 5 sur les armes non magiques. Si les PJ ne sont pas équipés des armes appropriées, le NC des démons augmente de 1.",
      },
      {
        name: 'Télépathie',
        text: "Les démons peuvent communiquer avec toutes les créatures par télépathie à une distance de 50 m sans avoir besoin de partager une langue commune. Ils parlent l'abyssal.",
      },
      {
        name: 'Téléportation (L)',
        text: "Le démonet peut se téléporter à n'importe quel endroit qu'il voit ou qu'il connaît à une distance maximale de 200 m jusqu'à 3 fois par combat.",
      },
      {
        name: 'Tentation du mal',
        text: "Les démons aiment corrompre les mortels en leur offrant le pouvoir. Un démon peut donner un dé bonus à toutes les actions d'un mortel durant 24 h (ce mortel doit avoir un niveau inférieur au NC du démon). À la fin de cette période, le mortel est affaibli pendant une semaine, ce qui le pousse généralement à négocier un nouveau don de pouvoir. Ce que le démon fait payer de plus en plus cher, jusqu'à obtenir l'âme de sa proie. Après chaque nouvelle période de 24 h, la période d'affaiblissement augmente d'une semaine.",
      },
      { name: 'Vision dans le noir', text: "Tous les démons voient dans le noir comme en plein jour à une distance de 30 m." },
      {
        name: 'Ténèbres (L)*',
        text: "Tous les démons peuvent invoquer à volonté une zone fixe de ténèbres magiques de 10 m de diamètre, à une portée de 20 m pour une durée de 1 min. Même les créatures capables de voir dans le noir sont aveuglées dans cette zone. Il ne peut maintenir plus d'une zone de ténèbres à la fois.",
      },
    ],
    sourcePage: 277,
  },
  {
    id: 'dragon-des-forets',
    name: 'Dragon des forêts',
    category: 'creatures-fantastiques',
    nc: 10,
    size: 'enorme',
    description:
      "Énormes créatures reptiliennes, les dragons possèdent quatre pattes et de grandes ailes membraneuses semblables à celles des chauves-souris. Les dragons des forêts sont reconnaissables aux patchs de plumes qui poussent au creux de certaines de leurs articulations (cou notamment) et en vieillissant leurs écailles ressemblent à de l'écorce. Leur souffle est un nuage empoisonné et ils utilisent généralement la magie druidique. Le caractère de chaque dragon varie selon l'individu, mais tous sont orgueilleux et attirés par les trésors et ceux qui ont réuni un butin fabuleux évitent de s'en éloigner. Le profil du dragon fourni ci-dessous, correspond à une jeune femelle d'environ un siècle.",
    abilities: { AGI: 3, CON: 8, FOR: 8, PER: 3, CHA: 2, INT: 2, VOL: 5 },
    bonusDieAbilities: ['AGI', 'PER'],
    defense: 24,
    hitPoints: 140,
    initiative: 16,
    attacks: [
      { name: 'Morsure et griffes', attackCount: 2, bonus: '+14', damage: '1d12+8' },
      { name: 'Attaque magique', bonus: '+15' },
    ],
    specialAbilities: [
      {
        name: 'Coup de queue (G)',
        text: "Chaque fois qu'un adversaire attaque le dragon dans le dos, il subit une attaque de queue gratuite équivalant à une attaque avec des DM divisés par deux.",
      },
      {
        name: 'Emporter dans les airs',
        text: "Sur un résultat de 17 à 20 au test d'attaque, le dragon peut emporter dans les airs une victime de taille inférieure à la sienne au prix d'une action de mouvement. Au premier round, si la victime se libère (test de FOR difficulté 18), elle subit, 4d4° DM de chute. Au round suivant, si la créature décide de prendre de l'altitude, les DM passent à 7d4° et enfin 10d4° aux rounds suivants. Le dé évolutif des DM de chute est indexé sur le niveau de la victime, et non sur celui de la créature.",
        richText: "Sur un résultat de 17 à 20 au test d'attaque, le dragon peut emporter dans les airs une victime de taille inférieure à la sienne au prix d'une action de mouvement. Au premier round, si la victime se libère (test de FOR difficulté 18), elle subit, {4d4°} DM de chute. Au round suivant, si la créature décide de prendre de l'altitude, les DM passent à {7d4°} et enfin {10d4°} aux rounds suivants. Le dé évolutif des DM de chute est indexé sur le niveau de la victime, et non sur celui de la créature.",
      },
      {
        name: 'Immunités',
        text: "Un dragon des forêts est immunisé au sommeil et à la paralysie et ne subit aucun DM de poison.",
      },
      {
        name: 'Inspirer la terreur',
        text: "Lorsque le dragon attaque pour la première fois, toutes les créatures à moins de 30 m doivent réussir un test d'attaque magique contre 25 ou être submergées par la peur et subir l'état affaibli pendant 1d4 rounds. Si le test est raté avec une marge de 10 plus, la victime doit fuir aussi loin que possible pendant la même durée.",
        richText: "Lorsque le dragon attaque pour la première fois, toutes les créatures à moins de 30 m doivent réussir un test d'attaque magique contre 25 ou être submergées par la peur et subir l'état affaibli pendant {1d4} rounds. Si le test est raté avec une marge de 10 plus, la victime doit fuir aussi loin que possible pendant la même durée.",
      },
      {
        name: 'Souffle (L)',
        text: "Le souffle est un nuage de gaz empoisonné affectant toutes les créatures dans un cône 15 m × 15 m. Retenir sa respiration est inutile, le poison fonctionne par simple contact. L'attaque inflige automatiquement (pas de test d'attaque) 6d6+18 DM de poison. Les DM sont divisés par deux si la victime réussit un test d'AGI difficulté 15. La créature doit attendre 1d4 rounds avant d'utiliser à nouveau son souffle après chaque utilisation.",
        richText: "Le souffle est un nuage de gaz empoisonné affectant toutes les créatures dans un cône 15 m × 15 m. Retenir sa respiration est inutile, le poison fonctionne par simple contact. L'attaque inflige automatiquement (pas de test d'attaque) {6d6}+18 DM de poison. Les DM sont divisés par deux si la victime réussit un test d'AGI difficulté 15. La créature doit attendre {1d4} rounds avant d'utiliser à nouveau son souffle après chaque utilisation.",
      },
      {
        name: 'Vol rapide',
        text: "La créature obtient une action de mouvement supplémentaire par round lorsqu'elle est en vol. Au premier round de combat, la créature obtient un dé bonus en attaque et +1d8 DM si elle est en vol et attaque une créature au sol.",
        richText: "La créature obtient une action de mouvement supplémentaire par round lorsqu'elle est en vol. Au premier round de combat, la créature obtient un dé bonus en attaque et +{1d8} DM si elle est en vol et attaque une créature au sol.",
      },
    ],
    sourcePage: 278,
  },
  {
    id: 'elementaire-eau-grand',
    name: "Élémentaire d'eau (grand)",
    category: 'creatures-fantastiques',
    nc: 5,
    size: 'grande',
    nature: ['non-vivant'],
    description:
      "L'élémentaire d'eau est l'incarnations de son élément primordial. Il peut être invoqué par magie et se manifeste dans notre monde sous la forme d'une créature au buste vaguement humanoïde mêlée à un tourbillon d'eau. L'élémentaire d'eau percute l'adversaire ou le noie.",
    abilities: { AGI: 2, CON: 6, FOR: 6, PER: 0, CHA: -2, INT: -2, VOL: 4 },
    bonusDieAbilities: ['CON'],
    defense: 19,
    hitPoints: 70,
    hitPointsNote: 'RD 3',
    initiative: 10,
    attacks: [{ name: 'Coups', attackCount: 2, bonus: '+10', damage: '1d8+6' }],
    specialAbilities: [
      { name: 'Eau de vie', text: "L'élémentaire d'eau régénère 5 PV par round (sauf DM de feu)." },
      {
        name: 'Fauchage',
        text: "Sur 17 à 20 au test d'attaque, si l'attaque est réussie, la victime doit réussir au choix un test de FOR ou d'AGI difficulté 16 ou être renversée.",
      },
      { name: 'Grand', text: 'La créature retranche 3 à tous les DM subis (RD 3).' },
      {
        name: 'Résistance',
        text: "Les élémentaires divisent par deux tous les DM des armes non magiques (de +0 à +1 au NC selon l'équipement des PJ). Les élémentaires d'eau sont immunisés aux DM d'acide.",
      },
      {
        name: 'Tourbillon (L)',
        text: "Une fois par combat, un élémentaire peut se transformer en tourbillon liquide pendant 3 rounds. Sous cette forme, il peut se déplacer à travers les créatures et les objets à la vitesse de 10 m par action de mouvement (20 m pour les élémentaires d'air). Toute créature sur son passage doit faire un test d'AGI ou de FOR au choix de difficulté 16. En cas d'échec, la cible subit automatiquement les DM de base de l'élémentaire (selon la taille) et elle est renversée (si sa taille ne dépasse pas celle de l'élémentaire). En cas de succès, elle ne subit que la moitié des DM et peut rester debout.",
      },
      {
        name: 'Vision',
        text: "Ils voient dans le noir à 30 m et ils peuvent déterminer la localisation de toute créature en contact avec leur élément à moins de 30 m, même si celle-ci est invisible.",
      },
    ],
    sourcePage: 279,
  },
  {
    id: 'geant-du-feu',
    name: 'Géant du feu',
    category: 'creatures-fantastiques',
    nc: 9,
    size: 'enorme',
    nature: ['humanoide'],
    description:
      "Les géants du feu sont de grande créature à la peau charbonneuse, aux cheveux et à la barbe de feu. Le front des mâles est orné de cornes recourbées, plus ou moins longues selon leur âge. Ils aiment arborer des tatouages et des décorations en or.",
    abilities: { AGI: -1, CON: 12, FOR: 12, PER: 2, CHA: 0, INT: 0, VOL: 0 },
    bonusDieAbilities: ['FOR'],
    defense: 25,
    hitPoints: 160,
    hitPointsNote: 'RD 6',
    initiative: 12,
    attacks: [
      { name: 'Marteau de guerre', bonus: '+14', damage: '4d8+16' },
      { name: 'Lancer de rocher', range: '20 m', bonus: '+14', damage: '2d8+12' },
    ],
    specialAbilities: [
      {
        name: 'Fauchage',
        text: "Sur 15 à 20 au test d'attaque, si l'attaque est réussie, la victime doit réussir au choix un test de FOR ou d'AGI difficulté 20 ou être renversée.",
      },
      {
        name: 'Balayage',
        text: "La créature utilise sa grande taille pour affecter deux créatures à son contact d'un seul coup de patte/arme. Faites un seul test et comparez-le à la DEF des deux cibles. Si les deux cibles sont touchées, la cible secondaire (désignée par le MJ) subit la moitié des DM.",
      },
      { name: 'Immunisé au feu', text: 'Le géant du feu est immunisé aux DM de feu.' },
    ],
    sourcePage: 280,
  },
  {
    id: 'geoselachis',
    name: 'Geoselachis',
    category: 'creatures-fantastiques',
    nc: 7,
    size: 'grande',
    description:
      "Aussi appelé requin terrestre, le geoselachis est un prédateur puissant et très dangereux capable de s'enterrer pour surprendre sa proie. Imaginez une taupe géante dotée d'un exosquelette impénétrable, de la mâchoire d'un grand requin et enfin de la puissance et de la capacité à encorner d'un rhinocéros et vous aurez un aperçu de cette machine à tuer… Les multiples dents triangulaires qui constituent la mâchoire du geoselachis sont autant de cristaux transparents semblables à des diamants. La créature possède 50+1d60 dents récupérables (les autres sont en mauvais état), il faut environ 1 min pour retirer une dent sur son cadavre et chaque dent vaut environ 1 pa. Elles sont utilisées pour concevoir des outils tranchants, en particulier dans les tribus du désert qui n'ont pas d'accès à la manufacture de métaux. Chasseur de geoselachis est un des plus dangereux métiers du monde.",
    abilities: { AGI: 0, CON: 8, FOR: 8, PER: 2, CHA: -2, INT: -4, VOL: 2 },
    bonusDieAbilities: ['AGI', 'PER'],
    defense: 22,
    hitPoints: 110,
    initiative: 15,
    attacks: [{ name: 'Morsure et griffes', attackCount: 2, bonus: '+13', damage: '1d12+8' }],
    specialAbilities: [
      {
        name: 'Embuscade',
        text: "Au premier round de combat, si le geoselachis peut se dissimuler sous terre, la cible doit faire un test de PER difficulté 15 ou être surprise. Si elle attaque avec succès une cible surprise, la créature inflige +1d6 DM et toute créature dont la FOR est inférieure à la sienne est renversée. La créature obtient un bonus de +5 à tous les tests de discrétion.",
        richText: "Au premier round de combat, si le geoselachis peut se dissimuler sous terre, la cible doit faire un test de PER difficulté 15 ou être surprise. Si elle attaque avec succès une cible surprise, la créature inflige +{1d6} DM et toute créature dont la FOR est inférieure à la sienne est renversée. La créature obtient un bonus de +5 à tous les tests de discrétion.",
      },
      {
        name: 'Encorner',
        text: "Lorsque la créature réussit une attaque avec un résultat de 17-20 au d20, elle encorne sa proie et lui inflige immédiatement une attaque gratuite supplémentaire.",
      },
      {
        name: 'Déplacement sous terre',
        text: "Le geoselachis est capable de parcourir 5 m par action de mouvement en creusant dans un sol meuble (le tunnel s'effondre derrière lui).",
      },
    ],
    sourcePage: 281,
  },

  // --- Gnoll (p. 282-283) ---------------------------------------------------
  {
    id: 'gnoll-de-base',
    name: 'Gnoll de base',
    category: 'creatures-fantastiques',
    nc: 1,
    nature: ['humanoide'],
    description:
      "Le gnoll est un humanoïde puissant de plus de 2 m dont la particularité est une tête d'hyène et une fourrure jaune sale. Les gnolls combattent généralement en nombre et malgré leur force, ils sont souvent lâches préférant le harcèlement et la supériorité numérique pour affronter leurs adversaires. Il n'est pas rare de trouver des groupes de gnolls disposant des capacités supplémentaires indiquées ci-après (NC+1) sous les ordres d'un chef plus expérimenté. Les quelques aventuriers qui ont survécu à une telle rencontre racontent une expérience traumatisante sous les rires irritants de leurs bourreaux.",
    abilities: { AGI: 0, CON: 3, FOR: 3, PER: 0, CHA: -2, INT: -2, VOL: -2 },
    defense: 14,
    hitPoints: 15,
    initiative: 10,
    attacks: [{ name: 'Hache', bonus: '+4', damage: '1d8+3' }],
    specialAbilities: [
      {
        name: 'Rires insupportables',
        text: "À chaque round, un PJ qui combat des gnolls au contact doit réussir un test de VOL difficulté (5 + nombre de gnolls) à son contact ou subir un dé malus en attaque.",
      },
    ],
    sourcePage: 282,
  },
  {
    id: 'meute-de-gnolls',
    name: 'Meute de gnolls',
    category: 'creatures-fantastiques',
    nc: 2,
    ncNote: '+1 Niveau',
    nature: ['humanoide'],
    baseCreatureId: 'gnoll-de-base',
    description:
      'Une meute de gnolls comprend au moins 3 gnolls par PJ.',
    sharedAbilitiesNote: "Comme le Gnoll de base, avec les capacités supplémentaires ci-dessous (NC+1).",
    specialAbilities: [
      {
        name: 'Interchangeables',
        text: "Tant que les gnolls sont plus nombreux que la cible, ils se relaient pour esquiver ses attaques et ils obtiennent un bonus de +3 en DEF. Si plusieurs gnolls sont au contact du PJ, le MJ a toute latitude pour infliger les DM d'une attaque sur le gnoll de son choix, le personnage ne sait jamais lequel il blesse.",
      },
      {
        name: "L'hallali",
        text: "Les gnolls profitent d'une erreur de leur victime pour lui porter des attaques fatales. Chaque fois que la victime de la meute rate une attaque ou obtient sur un test d'attaque un résultat au d20 allant de 1 à 5 (inclus), elle déclenche la curée. Chaque gnoll à son contact bénéficie immédiatement et gratuitement d'une attaque contre la victime.",
      },
    ],
    sourcePage: 282,
  },
  {
    id: 'sergent-gnoll',
    name: 'Sergent gnoll',
    category: 'creatures-fantastiques',
    nc: 2,
    nature: ['humanoide'],
    baseCreatureId: 'gnoll-de-base',
    description: 'Un sergent gnoll est généralement à la tête de cinq gnolls standard. Ils forment une rencontre de NC 4.',
    abilities: { AGI: 0, CON: 4, FOR: 4, PER: 0, CHA: -1, INT: -1, VOL: -1 },
    defense: 16,
    hitPoints: 25,
    initiative: 10,
    attacks: [{ name: 'Hache', bonus: '+6', damage: '1d8+4' }],
    specialAbilities: [
      {
        name: 'Sergent',
        text: "Une fois par round, le sergent peut donner une action supplémentaire à n'importe quel allié sous ses ordres à portée de vue (attaque ou mouvement). Une fois par combat, une attaque qui aurait dû amener le sergent à 0 PV est ignorée.",
      },
    ],
    sourcePage: 283,
  },
  {
    id: 'chef-gnoll',
    name: 'Chef gnoll',
    category: 'creatures-fantastiques',
    nc: 4,
    nature: ['humanoide'],
    baseCreatureId: 'gnoll-de-base',
    description: 'Une meute de douze gnolls commandée par le chef gnoll équivaut à une rencontre ordinaire NC 7.',
    abilities: { AGI: 0, CON: 4, FOR: 4, PER: 0, CHA: -1, INT: -1, VOL: 0 },
    defense: 17,
    hitPoints: 50,
    initiative: 10,
    attacks: [{ name: 'Hache', attackCount: 2, bonus: '+8', damage: '1d8+4' }],
    specialAbilities: [
      {
        name: 'Capitaine',
        text: 'Le chef donne un bonus de +2 en initiative, en attaque et aux DM à toutes les créatures sous ses ordres à portée de vue.',
      },
      {
        name: 'Commandant',
        text: "Tant qu'au moins 4 créatures sous ses ordres sont à moins de 20 m du commandant, il ne subit que la moitié des DM qui lui sont infligés.",
      },
    ],
    sourcePage: 283,
  },

  // --- Gobelin (p. 283-284) -------------------------------------------------
  {
    id: 'gobelin-de-base',
    name: 'Gobelin de base',
    category: 'creatures-fantastiques',
    nc: 0,
    size: 'petite',
    nature: ['humanoide'],
    description:
      "Le gobelin « peau verte » est une petite créature à la peau grisâtre d'environ un mètre de haut, cruelle, vicieuse et qui attaque en bande. Les gobelins sont généralement couards : blessés ou en sous-nombre, ils s'enfuient la plupart du temps.\nUn groupe de cinq gobelins de base forme une rencontre ordinaire de niveau 1.",
    abilities: { AGI: 2, CON: -1, FOR: -1, PER: 0, CHA: -2, INT: -2, VOL: -2 },
    bonusDieAbilities: ['AGI', 'PER'],
    defense: 12,
    hitPoints: 3,
    initiative: 13,
    attacks: [{ name: 'Arme', bonus: '+2', damage: '1d4-1' }],
    specialAbilities: [
      {
        name: 'Attaque en meute',
        text: "Lorsque au moins 2 gobelins attaquent la même cible en même temps, ils bénéficient d'un bonus de +2 en attaque (bonus qui peut s'ajouter à une éventuelle attaque groupée).",
      },
    ],
    sourcePage: 283,
  },
  {
    id: 'gobelin-elite',
    name: 'Gobelin élite',
    category: 'creatures-fantastiques',
    nc: 0.5,
    ncNote: '1/2',
    size: 'petite',
    nature: ['humanoide'],
    baseCreatureId: 'gobelin-de-base',
    description: "Un gobelin d'élite accompagné de huit gobelins de base forment une rencontre ordinaire de niveau 2.",
    abilities: { AGI: 2, CON: 0, FOR: 0, PER: 0, CHA: -1, INT: -1, VOL: -1 },
    bonusDieAbilities: ['AGI', 'PER'],
    defense: 13,
    hitPoints: 9,
    initiative: 13,
    attacks: [{ name: 'Arme', bonus: '+4', damage: '1d6' }],
    specialAbilities: [
      {
        name: 'Attaque en meute',
        text: "Lorsque au moins 2 gobelins attaquent la même cible en même temps, ils bénéficient d'un bonus de +2 en attaque (bonus qui peut s'ajouter à une éventuelle attaque groupée).",
      },
    ],
    sourcePage: 283,
  },
  {
    id: 'chef-gobelin',
    name: 'Chef gobelin',
    category: 'creatures-fantastiques',
    nc: 2,
    size: 'petite',
    nature: ['humanoide'],
    baseCreatureId: 'gobelin-de-base',
    description:
      "Un chef gobelin accompagné d'un shaman, de ses deux gardes du corps (gobelins élite) et à la tête de quinze gobelins est une rencontre ordinaire de niveau 4 (ou difficile au niveau 3).",
    abilities: { AGI: 2, CON: 1, FOR: 1, PER: 0, CHA: 1, INT: 0, VOL: 0 },
    bonusDieAbilities: ['AGI', 'PER'],
    defense: 16,
    hitPoints: 22,
    initiative: 13,
    attacks: [{ name: 'Arme', attackCount: 2, bonus: '+5', damage: '1d6+1' }],
    specialAbilities: [
      {
        name: 'Attaque en meute',
        text: "Lorsque au moins 2 gobelins attaquent la même cible en même temps, ils bénéficient d'un bonus de +2 en attaque (bonus qui peut s'ajouter à une éventuelle attaque groupée).",
      },
      {
        name: 'Sergent',
        text: "Une fois par round, le sergent peut donner une action supplémentaire à n'importe quel allié sous ses ordres à portée de vue (attaque ou mouvement). Une fois par combat, une attaque qui aurait dû amener le sergent à 0 PV est ignorée.",
      },
    ],
    sourcePage: 284,
  },
  {
    id: 'shaman-gobelin',
    name: 'Shaman gobelin',
    category: 'creatures-fantastiques',
    nc: 1,
    size: 'petite',
    nature: ['humanoide'],
    baseCreatureId: 'gobelin-de-base',
    abilities: { AGI: 2, CON: 1, FOR: 0, PER: 0, CHA: 1, INT: 1, VOL: 1 },
    bonusDieAbilities: ['AGI', 'PER'],
    defense: 13,
    hitPoints: 9,
    initiative: 13,
    attacks: [
      { name: 'Arme', bonus: '+4', damage: '1d6' },
      { name: 'Attaque magique', bonus: '+4' },
    ],
    specialAbilities: [
      {
        name: 'Attaque en meute',
        text: "Lorsque au moins 2 gobelins attaquent la même cible en même temps, ils bénéficient d'un bonus de +2 en attaque (bonus qui peut s'ajouter à une éventuelle attaque groupée).",
      },
      {
        name: 'Attaque magique (A)',
        text: "La créature possède un pouvoir magique qui inflige 2d6 DM sur un test d'attaque magique réussi (portée 30 m) sur une cible unique.",
        richText: "La créature possède un pouvoir magique qui inflige {2d6} DM sur un test d'attaque magique réussi (portée 30 m) sur une cible unique.",
      },
    ],
    sourcePage: 284,
  },

  {
    id: 'golem-de-chair',
    name: 'Golem de chair',
    category: 'creatures-fantastiques',
    nc: 7,
    size: 'grande',
    nature: ['non-vivant'],
    description:
      "Un golem de chair ressemble approximativement au monstre de Frankenstein. Il fait preuve d'une force inhumaine. Créature à la fois pitoyable et effrayante, le golem est une créature imposante mesurant presque 2,50 m constituée de l'assemblage grossier de divers cadavres.",
    abilities: { AGI: 1, CON: 6, FOR: 6, PER: 0, CHA: -4, INT: -4, VOL: 6 },
    bonusDieAbilities: ['CON'],
    defense: 20,
    hitPoints: 90,
    initiative: 10,
    attacks: [{ name: 'Poings', attackCount: 2, bonus: '+11', damage: '1d10+6' }],
    specialAbilities: [
      {
        name: 'Une petite dernière',
        text: "Si un adversaire au contact tente de s'éloigner de la créature (généralement pour fuir), elle obtient une attaque de contact gratuite contre lui.",
      },
      {
        name: 'Tape dur',
        text: "Si la créature obtient 17 à 20 au dé du test d'attaque, l'attaque est automatiquement réussie. De surcroît, la victime doit réussir un test de CON difficulté 16 ou être étourdie pendant 1 round.",
      },
      {
        name: 'Enragé',
        text: "Lorsqu'elle reçoit un coup critique, la créature devient enragée. Elle augmente de +3 sa valeur d'attaque au contact et ses DM de +1d6. Elle peut encore agir un tour complet après avoir atteint 0 PV.",
        richText: "Lorsqu'elle reçoit un coup critique, la créature devient enragée. Elle augmente de +3 sa valeur d'attaque au contact et ses DM de +{1d6}. Elle peut encore agir un tour complet après avoir atteint 0 PV.",
      },
      {
        name: 'Résistance',
        text: "Le golem divise par 2 tous les DM élémentaires (feu, froid, acide) ainsi que les DM contondants. Il est immunisé au poison.",
      },
      {
        name: "Absorber l'électricité",
        text: "Non seulement le golem de chair est immunisé à l'électricité, mais en plus les DM de ce type lui permettent de guérir de ses blessures. Il régénère 1 PV pour 3 points de DM d'électricité qui lui sont infligés.",
      },
    ],
    sourcePage: 284,
  },
  {
    id: 'goule',
    name: 'Goule',
    category: 'creatures-fantastiques',
    nc: 2,
    nature: ['non-vivant'],
    description:
      "La goule est un humanoïde mort d'une maladie atroce appelée fièvre des goules. Son corps cadavérique est décharné, et même partiellement décomposé, des griffes noires et des dents acérées lui poussent tandis qu'un appétit insatiable pour la chair humaine le submerge.",
    abilities: { AGI: 1, CON: 1, FOR: 1, PER: 2, CHA: -4, INT: 0, VOL: 2 },
    defense: 15,
    hitPoints: 19,
    initiative: 12,
    attacks: [{ name: 'Morsure et griffes', bonus: '+5', damage: '1d6+2', rider: '+ paralysie' }],
    specialAbilities: [
      {
        name: 'Paralysie',
        text: "Une créature blessée par la morsure d'une goule doit réussir un test de CON difficulté 10 ou être paralysée pendant 1d6 rounds.",
        richText: "Une créature blessée par la morsure d'une goule doit réussir un test de CON difficulté 10 ou être paralysée pendant {1d6} rounds.",
      },
      { name: 'Devenir une goule', text: 'Une créature tuée par une goule en devient une à son tour au prochain crépuscule.' },
      {
        name: 'Fièvre des goules',
        text: "À la fin du combat, si le personnage a été blessé au moins une fois par la morsure d'une goule, il doit réussir un test de CON difficulté 15 ou contracter la maladie. Chaque jour, il subit 1d4° DM retranchés directement à sa valeur de PV maximale (il ne peut plus dépasser cette nouvelle valeur) et doit faire un nouveau test de CON difficulté 15 pour vaincre la maladie. Lorsqu'il arrive à 0 PV, il meurt et se transforme en goule. S'il guérit, les PV perdus peuvent être récupérés normalement. Un sort de Délivrance (rang 3 de la voie de la spiritualité) peut mettre fin à la fièvre des goules.",
        richText: "À la fin du combat, si le personnage a été blessé au moins une fois par la morsure d'une goule, il doit réussir un test de CON difficulté 15 ou contracter la maladie. Chaque jour, il subit {1d4°} DM retranchés directement à sa valeur de PV maximale (il ne peut plus dépasser cette nouvelle valeur) et doit faire un nouveau test de CON difficulté 15 pour vaincre la maladie. Lorsqu'il arrive à 0 PV, il meurt et se transforme en goule. S'il guérit, les PV perdus peuvent être récupérés normalement. Un sort de Délivrance (rang 3 de la voie de la spiritualité) peut mettre fin à la fièvre des goules.",
      },
    ],
    sourcePage: 285,
  },
  {
    id: 'goule-abomination',
    name: 'Abomination',
    category: 'creatures-fantastiques',
    nc: 4,
    nature: ['non-vivant'],
    baseCreatureId: 'goule',
    description:
      "L'abomination est une goule plus puissante, plus ancienne et sans doute un meneur ou un personnage important de son vivant. Avec l'âge, elle a développé des excroissances osseuses acérées au niveau des articulations (coude, genou, épine dorsale) et sa bouche s'est totalement déformée en une gueule immonde.",
    abilities: { AGI: 1, CON: 4, FOR: 4, PER: 2, CHA: -4, INT: 1, VOL: 4 },
    defense: 17,
    hitPoints: 35,
    initiative: 12,
    attacks: [
      { name: 'Morsure', bonus: '+9', damage: '1d6+4' },
      { name: 'Griffes', bonus: '+9', damage: '1d6+4' },
    ],
    specialAbilities: [
      {
        name: 'Paralysie',
        text: "Une créature blessée par la morsure d'une goule puissante doit réussir un test de CON difficulté 15 ou être paralysée pendant 1d6 rounds.",
        richText: "Une créature blessée par la morsure d'une goule puissante doit réussir un test de CON difficulté 15 ou être paralysée pendant {1d6} rounds.",
      },
      {
        name: 'Miasmes',
        text: "La goule puissante émet une odeur de cadavre en décomposition absolument infâme et des miasmes toxiques dans un rayon de 2 m. À chaque round, à la fin du tour de la goule, ses adversaires au contact doivent réussir un test de CON difficulté 10 ou être affaiblis et perdre 1d4 PV.",
        richText: "La goule puissante émet une odeur de cadavre en décomposition absolument infâme et des miasmes toxiques dans un rayon de 2 m. À chaque round, à la fin du tour de la goule, ses adversaires au contact doivent réussir un test de CON difficulté 10 ou être affaiblis et perdre {1d4} PV.",
      },
      { name: 'Fièvre des goules', text: 'Comme pour la goule, avec un test de CON difficulté 18.' },
    ],
    sourcePage: 286,
  },
  {
    id: 'griffon',
    name: 'Griffon',
    category: 'creatures-fantastiques',
    nc: 4,
    size: 'grande',
    description:
      "Le griffon est une puissante créature au corps de lion pourvue de la tête et des ailes d'un aigle. Ce mélange ne manque pas de majesté et cet animal fantastique est parfois utilisé comme monture par les chevaliers. La créature pèse environ 300 kg pour une envergure de 7 m. Un griffon est plus intelligent qu'un simple animal et, même s'il ne parle pas, il peut apprendre à comprendre une langue s'il y est habitué très tôt.",
    abilities: { AGI: 3, CON: 6, FOR: 6, PER: 2, CHA: 0, INT: -3, VOL: 1 },
    bonusDieAbilities: ['PER'],
    defense: 18,
    hitPoints: 50,
    initiative: 15,
    attacks: [{ name: 'Morsures et griffes', bonus: '+8', damage: '2d6+8' }],
    specialAbilities: [
      {
        name: 'Vol rapide',
        text: "La créature obtient une action de mouvement supplémentaire par round lorsqu'elle est en vol. Au premier round de combat, la créature obtient un dé bonus en attaque et +1d4 aux DM si elle est en vol et attaque une créature au sol.",
        richText: "La créature obtient une action de mouvement supplémentaire par round lorsqu'elle est en vol. Au premier round de combat, la créature obtient un dé bonus en attaque et +{1d4} aux DM si elle est en vol et attaque une créature au sol.",
      },
      {
        name: 'Agripper',
        text: "Sur un résultat de 15-20 au d20 en attaque, la créature agrippe sa proie et ne la lâche plus. Elle obtient un bonus de +5 en attaque et inflige +1d4 aux DM contre la cible qu'elle agrippe et celle-ci est immobilisée si elle est de taille inférieure. Une fois par round, la victime peut essayer de se libérer au prix d'une action de mouvement en réussissant un test de FOR difficulté 16.\nUn œuf de griffon viable est un bien très précieux, il vaut 3 000 pa, un tout jeune animal se vend autour de 5 000 pa. Les dresseurs professionnels demandent 1 000 pa pour apprivoiser ou entraîner un griffon.",
        richText: "Sur un résultat de 15-20 au d20 en attaque, la créature agrippe sa proie et ne la lâche plus. Elle obtient un bonus de +5 en attaque et inflige +{1d4} aux DM contre la cible qu'elle agrippe et celle-ci est immobilisée si elle est de taille inférieure. Une fois par round, la victime peut essayer de se libérer au prix d'une action de mouvement en réussissant un test de FOR difficulté 16.\nUn œuf de griffon viable est un bien très précieux, il vaut 3 000 pa, un tout jeune animal se vend autour de 5 000 pa. Les dresseurs professionnels demandent 1 000 pa pour apprivoiser ou entraîner un griffon.",
      },
    ],
    sourcePage: 286,
  },

  // --- Hydre (p. 287-288) ---------------------------------------------------
  {
    id: 'hydre-cinq-tetes',
    name: 'Hydre à cinq têtes',
    category: 'creatures-fantastiques',
    nc: 5,
    size: 'enorme',
    description:
      "L'hydre est une grande créature reptilienne de presque 2 tonnes pourvue de multiples têtes. Imaginez un petit diplodocus doté de 5 à 12 têtes de dragon et vous aurez une idée de l'apparence de cet épouvantable monstre.",
    abilities: { AGI: 0, CON: 10, FOR: 10, PER: 0, CHA: -2, INT: -4, VOL: 0 },
    bonusDieAbilities: ['FOR'],
    defense: 18,
    hitPoints: 50,
    initiative: 10,
    attacks: [{ name: 'Morsure', attackCount: 5, bonus: '+8', damage: '1d8+4' }],
    specialAbilities: [
      {
        name: 'Couper une tête',
        text: "L'hydre est un adversaire très dangereux à cause de son nombre élevé d'attaques. Pour réduire le nombre de têtes, un personnage peut tenter de la décapiter. Dans ce cas, l'attaque souffre d'une pénalité de -5 et elle doit infliger au moins 10 DM en une seule fois. En cas de réussite, la tête est coupée et les PV du monstre baissent de 10. Toutefois, la guérison accélérée de l'hydre fait repousser la tête en 2 rounds (sauf DM de feu). En cas d'échec, l'hydre ne subit aucun DM.",
      },
      {
        name: 'Ajouter des têtes',
        text: "pour chaque tête supplémentaire, ajoutez 20 PV, +1 en attaque et en DEF et une attaque supplémentaire. Le NC augmente de +1.",
      },
      {
        name: 'Attaques multiples',
        text: "L'hydre peut effectuer un total de 5 attaques, mais pas plus de 4 attaques sur la même cible chaque round. Utilisez la règle des attaques groupées pour gagner du temps (par exemple, +5 pour l'attaque de deux têtes à la fois).",
      },
      { name: 'Guérison accélérée', text: "L'hydre régénère 5 PV par round sauf contre les DM de feu." },
    ],
    sourcePage: 287,
  },
  {
    id: 'cryohydre-dix-tetes',
    name: 'Cryohydre à dix têtes',
    category: 'creatures-fantastiques',
    nc: 11,
    size: 'enorme',
    baseCreatureId: 'hydre-cinq-tetes',
    description: "Une cryohydre est une hydre des glaces capable de souffler un nuage glacial mortel.",
    abilities: { AGI: 0, CON: 8, FOR: 8, PER: 0, CHA: -2, INT: -4, VOL: 2 },
    bonusDieAbilities: ['FOR'],
    defense: 23,
    hitPoints: 150,
    initiative: 10,
    attacks: [{ name: 'Morsure', attackCount: 10, bonus: '+13', damage: '1d8+4', rider: '+1d6 de froid' }],
    specialAbilities: [
      {
        name: 'Souffle glacial',
        text: "Cône de 20 m, tous les 1d4 rounds. DM 6d6+18 (test d'AGI difficulté 15 pour réduire les DM de moitié). Immunité aux DM de froid.",
        richText: "Cône de 20 m, tous les {1d4} rounds. DM {6d6}+18 (test d'AGI difficulté 15 pour réduire les DM de moitié). Immunité aux DM de froid.",
      },
      {
        name: 'Guérison accélérée',
        text: "L'hydre guérit de 5 PV par tour au début de son tour, sauf si les DM subis sont de feu.",
      },
      {
        name: 'Attaques multiples',
        text: "L'hydre peut effectuer un total de 10 attaques, mais pas plus de 4 attaques sur la même cible chaque round. Utilisez la règle des attaques groupées pour gagner du temps (par exemple, +5 pour l'attaque de 2 têtes à la fois).",
      },
      {
        name: 'Créature élémentaire',
        text: "La cryohydre possède un souffle glacial (voir plus haut), elle est immunisée aux DM de froid et les DM de morsure augmentent de +1d6. Ces éléments augmentent le NC global de la créature de +1. Il existe aussi des hydres de feu, appelées pyrohydre. Elles sont immunisées aux DM de feu et seul l'acide permet de les empêcher de se régénérer.",
        richText: "La cryohydre possède un souffle glacial (voir plus haut), elle est immunisée aux DM de froid et les DM de morsure augmentent de +{1d6}. Ces éléments augmentent le NC global de la créature de +1. Il existe aussi des hydres de feu, appelées pyrohydre. Elles sont immunisées aux DM de feu et seul l'acide permet de les empêcher de se régénérer.",
      },
    ],
    sourcePage: 288,
  },

  // --- Kobold (p. 288-289) --------------------------------------------------
  {
    id: 'kobold-de-base',
    name: 'Kobold de base',
    category: 'creatures-fantastiques',
    nc: 0,
    size: 'petite',
    nature: ['humanoide'],
    description:
      "Les Kobolds sont de petits humanoïdes reptiliens dont le faciès fait penser au crocodile. Vicieux et malins, ils sont passés maîtres dans l'art de tendre pièges et embuscades. Ils mesurent moins d'un mètre pour une vingtaine de kilos.",
    abilities: { AGI: 2, CON: -1, FOR: -1, PER: 1, CHA: -2, INT: 0, VOL: -2 },
    defense: 12,
    hitPoints: 3,
    initiative: 11,
    attacks: [
      { name: 'Lance', bonus: '+2', damage: '1d6-1' },
      { name: 'Fronde', range: '20 m', bonus: '+2', damage: '1d4' },
    ],
    sourcePage: 288,
  },
  {
    id: 'chef-kobold',
    name: 'Chef kobold',
    category: 'creatures-fantastiques',
    nc: 1,
    size: 'petite',
    nature: ['humanoide'],
    baseCreatureId: 'kobold-de-base',
    description:
      "Un chef kobold accompagné de 5 kobolds de base est une rencontre ordinaire pour un groupe de niveau 2 (difficile pour un groupe de niveau 1). Ajoutez un prêtre et vous obtiendrez une rencontre ordinaire de niveau 3.",
    abilities: { AGI: 2, CON: 0, FOR: 0, PER: 1, CHA: 1, INT: 0, VOL: 0 },
    bonusDieAbilities: ['CHA'],
    defense: 13,
    hitPoints: 15,
    initiative: 11,
    attacks: [{ name: 'Lance', bonus: '+3', damage: '1d6' }],
    specialAbilities: [
      {
        name: 'Imparable',
        text: "Si la créature obtient 15-20 au d20 d'un test d'attaque, elle inflige 2d4 DM supplémentaires et l'attaque est automatiquement réussie (quelle que soit la DEF de son adversaire). Les dés bonus ne sont pas multipliés en cas de critique.",
        richText: "Si la créature obtient 15-20 au d20 d'un test d'attaque, elle inflige {2d4} DM supplémentaires et l'attaque est automatiquement réussie (quelle que soit la DEF de son adversaire). Les dés bonus ne sont pas multipliés en cas de critique.",
      },
    ],
    sourcePage: 289,
  },
  {
    id: 'pretre-kobold',
    name: 'Prêtre kobold',
    category: 'creatures-fantastiques',
    nc: 2,
    size: 'petite',
    nature: ['humanoide'],
    baseCreatureId: 'kobold-de-base',
    description:
      "Les prêtres kobolds vénèrent les dragons qui les ont créés (c'est ce qu'ils pensent, mais rien ne le prouve…). Les prêtres sont choisis parmi ceux dont la couleur des écailles correspond à la couleur du dragon qu'ils vénèrent et ils utilisent une magie élémentaire qui correspond à cette couleur (par exemple, un sort de feu si sa peau est rouge).",
    abilities: { AGI: 2, CON: -1, FOR: -1, PER: 1, CHA: 1, INT: 0, VOL: 1 },
    bonusDieAbilities: ['CHA'],
    defense: 15,
    hitPoints: 30,
    initiative: 11,
    attacks: [
      { name: 'Dague', bonus: '+4', damage: '1d4-1' },
      { name: 'Attaque magique', range: '20 m', bonus: '+6', damage: '3d6', rider: '(élémentaires)' },
    ],
    sourcePage: 289,
  },

  {
    id: 'licorne',
    name: 'Licorne',
    category: 'creatures-fantastiques',
    nc: 3,
    size: 'grande',
    description:
      "La licorne ressemble à un cheval aux proportions parfaites et à la robe immaculée et elle est pourvue d'une corne torsadée unique. Cet animal féérique et majestueux habite seulement au sein des forêts sauvages et vierges. Il est très rare de l'apercevoir tant elle est discrète et prompte à s'éclipser. La corne de la licorne conserve ses propriétés magiques, même si elle est sectionnée, ce qui pousse souvent les créatures sans scrupule comme les orcs et même les humains à la chasser.\nLes légendes disent que la licorne accepte parfois de servir de monture à une jeune fille au cœur pur.",
    abilities: { AGI: 4, CON: 5, FOR: 5, PER: 4, CHA: 4, INT: 0, VOL: 4 },
    bonusDieAbilities: ['AGI', 'PER'],
    defense: 18,
    hitPoints: 35,
    initiative: 17,
    attacks: [{ name: 'Corne et sabots', bonus: '+8', damage: '2d6+5' }],
    specialAbilities: [
      {
        name: 'Célérité',
        text: "Si la licorne ne transporte aucune charge supérieure à 50 kg, elle peut parcourir jusqu'à 15 m par action de mouvement.",
      },
      {
        name: 'Corne magique (L)',
        text: "Si la licorne touche une créature à 0 PV de sa corne, celle-ci récupère 2d4° PV. Si la créature est empoisonnée, elle a immédiatement droit à un test de CON difficulté 10 pour neutraliser les effets du poison.",
        richText: "Si la licorne touche une créature à 0 PV de sa corne, celle-ci récupère {2d4°} PV. Si la créature est empoisonnée, elle a immédiatement droit à un test de CON difficulté 10 pour neutraliser les effets du poison.",
      },
      {
        name: 'Déplacement magique',
        text: "3 fois par combat, la licorne peut se téléporter à une portée de 60 m. Toutefois, cette capacité ne peut être utilisée que dans les limites de la forêt natale de la licorne.",
      },
      {
        name: 'Résistance aux DM',
        text: "Une licorne réduit de 5 les DM de toutes les armes qui ne sont pas en fer froid (un alliage spécial forgé à froid et particulièrement rare). En revanche, elle double les DM reçus par de telles armes.",
      },
    ],
    sourcePage: 289,
  },

  // --- Momie (p. 290-291) ---------------------------------------------------
  {
    id: 'momie',
    name: 'Momie',
    category: 'creatures-fantastiques',
    nc: 5,
    nature: ['non-vivant'],
    description:
      "La momie est un mort-vivant couvert de bandelettes, un cadavre animé par une magie antique qui permet à un humanoïde une parodie de vie après la mort. La momie doit rester éternellement immobile au fond de son sarcophage et elle ne peut que rarement trouver l'énergie de s'en extraire. Toutefois, lorsque cela arrive, elle fait preuve d'une haine des vivants qui dérangent son sommeil et d'une force impie qui défie les lois de la physique.",
    abilities: { AGI: 1, CON: 3, FOR: 5, PER: 1, CHA: -2, INT: -2, VOL: 4 },
    bonusDieAbilities: ['CON', 'FOR'],
    defense: 20,
    hitPoints: 70,
    initiative: 11,
    attacks: [{ name: 'Coup', attackCount: 2, bonus: '+10', damage: '1d8+5', rider: '+ putréfaction' }],
    specialAbilities: [
      { name: 'Résistance aux DM', text: 'La momie réduit de 5 tous les DM subis, sauf par le feu.' },
      {
        name: 'Putréfaction',
        text: "Toute créature blessée par une momie doit réussir un test de CON difficulté 15 ou contracter une horrible maladie qui occasionne le pourrissement rapide de ses chairs, une sorte de lèpre fulgurante. La victime subit 1d6 DM par round pendant 5 rounds. Tant qu'elle est sous l'effet de la putréfaction, il n'est pas nécessaire de réaliser un nouveau test de CON lorsque la victime est la cible d'une attaque de la momie. L'utilisation de la capacité de prêtre Délivrance permet de soigner cette maladie.",
        richText: "Toute créature blessée par une momie doit réussir un test de CON difficulté 15 ou contracter une horrible maladie qui occasionne le pourrissement rapide de ses chairs, une sorte de lèpre fulgurante. La victime subit {1d6} DM par round pendant 5 rounds. Tant qu'elle est sous l'effet de la putréfaction, il n'est pas nécessaire de réaliser un nouveau test de CON lorsque la victime est la cible d'une attaque de la momie. L'utilisation de la capacité de prêtre Délivrance permet de soigner cette maladie.",
      },
    ],
    sourcePage: 290,
  },
  {
    id: 'momie-auguste',
    name: 'Momie auguste',
    category: 'creatures-fantastiques',
    nc: 10,
    nature: ['non-vivant'],
    baseCreatureId: 'momie',
    abilities: { AGI: 3, CON: 6, FOR: 6, PER: 2, CHA: -2, INT: 3, VOL: 6 },
    bonusDieAbilities: ['CON', 'FOR'],
    defense: 24,
    hitPoints: 160,
    initiative: 12,
    attacks: [{ name: 'Coup', attackCount: 2, bonus: '+16', damage: '2d6+8', rider: '+ putréfaction' }],
    specialAbilities: [
      { name: 'Résistance aux DM', text: 'La momie réduit de 5 tous les DM subis, sauf par le feu.' },
      {
        name: 'Putréfaction',
        text: "Toute créature blessée par une momie doit réussir un test de CON difficulté 15 ou contracter une horrible maladie qui occasionne le pourrissement rapide de ses chairs. Une sorte de lèpre fulgurante. La victime subit 1d10 DM par round pendant 5 rounds. Tant qu'elle est sous l'effet de la putréfaction, il n'est pas nécessaire de réaliser un nouveau test de CON lorsque la victime est la cible d'une attaque de la momie.",
        richText: "Toute créature blessée par une momie doit réussir un test de CON difficulté 15 ou contracter une horrible maladie qui occasionne le pourrissement rapide de ses chairs. Une sorte de lèpre fulgurante. La victime subit {1d10} DM par round pendant 5 rounds. Tant qu'elle est sous l'effet de la putréfaction, il n'est pas nécessaire de réaliser un nouveau test de CON lorsque la victime est la cible d'une attaque de la momie.",
      },
      {
        name: 'Injonction mortelle (L)',
        text: "Une cible située à une distance maximale de 30 m doit réussir un test de CON difficulté 15 ou tomber à 0 PV (et mourir immédiatement s'il s'agit d'un PNJ). En cas de succès, la cible subit tout de même 2d8+10 DM. Ce pouvoir ne peut prendre une même créature pour cible qu'une seule fois par combat.",
        richText: "Une cible située à une distance maximale de 30 m doit réussir un test de CON difficulté 15 ou tomber à 0 PV (et mourir immédiatement s'il s'agit d'un PNJ). En cas de succès, la cible subit tout de même {2d8}+10 DM. Ce pouvoir ne peut prendre une même créature pour cible qu'une seule fois par combat.",
      },
      {
        name: 'Voie de la magie universelle rang 5',
        text: 'La momie auguste peut lancer tous les sorts de cette voie à volonté.',
      },
    ],
    sourcePage: 291,
  },

  // --- Ogre (p. 291-292) ----------------------------------------------------
  {
    id: 'ogre-de-base',
    name: 'Ogre de base',
    category: 'creatures-fantastiques',
    nc: 3,
    size: 'grande',
    nature: ['humanoide'],
    description:
      "L'ogre est une brute épaisse mesurant plus de 2,50 m (pour 300 kg). Cette créature maléfique a un penchant pour les armes démesurées et la boucherie gratuite. C'est un adversaire formidable et un combat contre un ogre n'est jamais sans risque. Il parle le noir parler et parfois le commun.\nUn chef ogre accompagné de 5 ogres est une rencontre ordinaire de niveau 10.",
    abilities: { AGI: 1, CON: 6, FOR: 6, PER: 0, CHA: -2, INT: -2, VOL: 0 },
    bonusDieAbilities: ['FOR'],
    defense: 17,
    hitPoints: 40,
    initiative: 10,
    attacks: [{ name: 'Hachoir', bonus: '+7', damage: '2d6+6' }],
    specialAbilities: [
      { name: 'Capacité au choix', text: 'Une capacité au choix parmi Tape dur ou Imparable.' },
      {
        name: 'Tape dur',
        text: "Si la créature obtient 15 à 20 au dé du test d'attaque, l'attaque est automatiquement réussie. De surcroît, la victime doit réussir un test de CON difficulté 16 ou être étourdie pendant 1 round.",
      },
      {
        name: 'Imparable (L)',
        text: "L'ogre réalise une attaque avec un dé bonus et garde le meilleur résultat. S'il obtient 15-20 au d20 d'un test d'attaque (même sans utiliser Imparable), il inflige +1d6 DM et l'attaque est automatiquement réussie (quelle que soit la DEF de son adversaire).",
        richText: "L'ogre réalise une attaque avec un dé bonus et garde le meilleur résultat. S'il obtient 15-20 au d20 d'un test d'attaque (même sans utiliser Imparable), il inflige +{1d6} DM et l'attaque est automatiquement réussie (quelle que soit la DEF de son adversaire).",
      },
      {
        name: 'Note de conception',
        text: "Attention, même à haut niveau des ogres dotés de la capacité Tape dur en grand nombre sont des adversaires redoutables, si vous n'utilisez pas la règle de l'attaque groupée, les chances sont grandes que leur victime passe plus de temps étourdie que dans la capacité d'agir…",
      },
    ],
    sourcePage: 291,
  },
  {
    id: 'chef-ogre',
    name: 'Chef ogre',
    category: 'creatures-fantastiques',
    nc: 6,
    size: 'grande',
    nature: ['humanoide'],
    baseCreatureId: 'ogre-de-base',
    abilities: { AGI: 1, CON: 6, FOR: 6, PER: 0, CHA: -2, INT: -2, VOL: 1 },
    bonusDieAbilities: ['FOR'],
    defense: 20,
    hitPoints: 70,
    initiative: 10,
    attacks: [{ name: 'Hachoir', attackCount: 2, bonus: '+12', damage: '2d6+6' }],
    specialAbilities: [
      { name: 'Capacité au choix', text: 'Une capacité au choix parmi Tape dur ou Imparable.' },
      {
        name: 'Tape dur',
        text: "Si la créature obtient 17 à 20 au dé du test d'attaque, l'attaque est automatiquement réussie. De surcroît, la victime doit réussir un test de CON difficulté 16 ou être étourdie pendant 1 round.",
      },
      {
        name: 'Imparable (L)',
        text: "L'ogre réalise une attaque avec un dé bonus et garde le meilleur résultat. S'il obtient 15-20 au d20 d'un test d'attaque (même sans utiliser Imparable), il inflige +1d6 DM et l'attaque est automatiquement réussie (quelle que soit la DEF de son adversaire).",
        richText: "L'ogre réalise une attaque avec un dé bonus et garde le meilleur résultat. S'il obtient 15-20 au d20 d'un test d'attaque (même sans utiliser Imparable), il inflige +{1d6} DM et l'attaque est automatiquement réussie (quelle que soit la DEF de son adversaire).",
      },
      {
        name: 'Teigneuse',
        text: "Si la créature rate une attaque, sa prochaine attaque bénéficie d'un dé bonus et de +2d6 DM.",
        richText: "Si la créature rate une attaque, sa prochaine attaque bénéficie d'un dé bonus et de +{2d6} DM.",
      },
      {
        name: 'Enragé',
        text: "Lorsqu'elle reçoit un coup critique, la créature devient enragée. Elle ignore les pénalités de douleur ou la peur, augmente de +3 sa valeur d'attaque au contact et de +1d6 ses DM. Elle peut encore agir un tour complet après avoir atteint 0 PV.",
        richText: "Lorsqu'elle reçoit un coup critique, la créature devient enragée. Elle ignore les pénalités de douleur ou la peur, augmente de +3 sa valeur d'attaque au contact et de +{1d6} ses DM. Elle peut encore agir un tour complet après avoir atteint 0 PV.",
      },
    ],
    sourcePage: 292,
  },

  // --- Orc (p. 292-294) -----------------------------------------------------
  {
    id: 'orc-de-base',
    name: 'Orc de base',
    category: 'creatures-fantastiques',
    nc: 0.5,
    ncNote: '1/2',
    size: 'moyenne',
    description:
      "Les orcs sont des créatures robustes, un peu plus grandes que les humains, dotées de traits bestiaux et habituellement violentes. Ils vivent en tribus sous la domination d'un chef qui règne par la loi du plus fort. Les orcs parlent le noir parler.",
    abilities: { AGI: 0, CON: 2, FOR: 2, PER: 0, CHA: -2, INT: -2, VOL: -1 },
    bonusDieAbilities: ['FOR'],
    defense: 13,
    hitPoints: 12,
    initiative: 10,
    attacks: [{ name: 'Hache ou masse', bonus: '+3', damage: '1d8+2' }],
    specialAbilities: [
      {
        name: 'Sensible à la lumière',
        text: "Créatures souterraines, les orcs détestent la lumière du jour. La lumière du soleil leur inflige un dé malus en attaque.",
      },
    ],
    sourcePage: 293,
  },
  {
    id: 'orc-noir',
    name: 'Orc noir',
    category: 'creatures-fantastiques',
    nc: 1,
    size: 'moyenne',
    baseCreatureId: 'orc-de-base',
    description:
      "Les orcs noirs sont une race d'orcs d'élite obtenue par sélection et reproduction par de puissants maîtres maléfiques souhaitant construire l'armée ultime. Leur peau est plus sombre et leur musculature plus imposante. Ils manient des armes à deux mains, mais surtout, ils ne sont plus sensibles à la lumière du jour.",
    abilities: { AGI: 0, CON: 3, FOR: 3, PER: 0, CHA: -2, INT: -2, VOL: 1 },
    bonusDieAbilities: ['FOR'],
    defense: 15,
    hitPoints: 15,
    initiative: 10,
    attacks: [{ name: 'Arme à deux mains', bonus: '+4', damage: '2d6+3' }],
    sourcePage: 293,
  },
  {
    id: 'berserker-orc',
    name: 'Berserker orc',
    category: 'creatures-fantastiques',
    nc: 2,
    size: 'moyenne',
    baseCreatureId: 'orc-de-base',
    abilities: { AGI: 0, CON: 3, FOR: 3, PER: 0, CHA: -2, INT: -2, VOL: 4 },
    bonusDieAbilities: ['FOR'],
    defense: 13,
    hitPoints: 15,
    initiative: 10,
    attacks: [{ name: 'Arme à deux mains', bonus: '+6', damage: '2d6+3' }],
    specialAbilities: [
      {
        name: 'Imparable',
        text: "Si la créature obtient 15-20 sur le d20 d'un test d'attaque, elle inflige +2d4 DM et l'attaque est automatiquement réussie (quelle que soit la DEF de son adversaire). Les dés bonus ne sont pas multipliés en cas de critique.",
        richText: "Si la créature obtient 15-20 sur le d20 d'un test d'attaque, elle inflige +{2d4} DM et l'attaque est automatiquement réussie (quelle que soit la DEF de son adversaire). Les dés bonus ne sont pas multipliés en cas de critique.",
      },
      {
        name: 'Teigneuse',
        text: "Si la créature rate une attaque, sa prochaine attaque bénéficie d'un dé bonus et de +2d4 DM.",
        richText: "Si la créature rate une attaque, sa prochaine attaque bénéficie d'un dé bonus et de +{2d4} DM.",
      },
    ],
    sourcePage: 293,
  },
  {
    id: 'sergent-orc',
    name: 'Sergent orc',
    category: 'creatures-fantastiques',
    nc: 3,
    size: 'moyenne',
    baseCreatureId: 'orc-de-base',
    abilities: { AGI: 0, CON: 3, FOR: 4, PER: 0, CHA: -1, INT: -1, VOL: 1 },
    bonusDieAbilities: ['FOR'],
    defense: 18,
    hitPoints: 40,
    initiative: 10,
    attacks: [{ name: 'Épée deux mains', bonus: '+7', damage: '2d6+6' }],
    specialAbilities: [
      {
        name: 'Imparable',
        text: "Si la créature obtient 15-20 sur le d20 d'un test d'attaque, elle inflige +2d4 DM et l'attaque est automatiquement réussie (quelle que soit la DEF de son adversaire). Les dés bonus ne sont pas multipliés en cas de critique.",
        richText: "Si la créature obtient 15-20 sur le d20 d'un test d'attaque, elle inflige +{2d4} DM et l'attaque est automatiquement réussie (quelle que soit la DEF de son adversaire). Les dés bonus ne sont pas multipliés en cas de critique.",
      },
    ],
    sourcePage: 293,
  },
  {
    id: 'shaman-orc',
    name: 'Shaman orc',
    category: 'creatures-fantastiques',
    nc: 3,
    size: 'moyenne',
    baseCreatureId: 'orc-de-base',
    abilities: { AGI: 0, CON: 3, FOR: 1, PER: 3, CHA: -1, INT: 0, VOL: 3 },
    defense: 17,
    hitPoints: 40,
    initiative: 13,
    attacks: [
      { name: 'Dague', attackCount: 2, bonus: '+6', damage: '1d4+1' },
      { name: 'Attaque magique', bonus: '+6' },
    ],
    specialAbilities: [
      {
        name: 'Vampirisation (L)',
        text: "La créature doit réussir un test opposé d'attaque magique contre une cible vivante à une distance maximum de 30 m. En cas de réussite, la cible subit 2d8 DM et la créature régénère autant de PV que de DM infligés. De plus, chaque fois qu'une créature meurt à moins de 20 m d'elle, la créature siphonne son énergie et gagne un nombre de PV égal au double du NC de la créature.",
        richText: "La créature doit réussir un test opposé d'attaque magique contre une cible vivante à une distance maximum de 30 m. En cas de réussite, la cible subit {2d8} DM et la créature régénère autant de PV que de DM infligés. De plus, chaque fois qu'une créature meurt à moins de 20 m d'elle, la créature siphonne son énergie et gagne un nombre de PV égal au double du NC de la créature.",
      },
      {
        name: 'Animer un cadavre (L)',
        text: "Ce pouvoir permet d'animer le cadavre d'une créature morte (portée 10 m) pendant le combat. La créature se relève avec les mêmes caractéristiques, mais elle subit une pénalité de -2 en attaque, en DEF et en Init. Lorsque le cadavre est à nouveau vaincu, il ne peut plus être réanimé. Le cadavre de la créature animée ne peut être d'un NC supérieur à 2.",
      },
    ],
    sourcePage: 294,
  },
  {
    id: 'chef-orc',
    name: 'Chef orc',
    category: 'creatures-fantastiques',
    nc: 6,
    size: 'moyenne',
    baseCreatureId: 'orc-de-base',
    abilities: { AGI: 0, CON: 5, FOR: 5, PER: 0, CHA: 1, INT: 0, VOL: 2 },
    bonusDieAbilities: ['FOR', 'CHA'],
    defense: 20,
    hitPoints: 60,
    initiative: 10,
    attacks: [{ name: 'Épée deux mains', attackCount: 2, bonus: '+10', damage: '2d6+5' }],
    specialAbilities: [
      {
        name: 'Imparable',
        text: "Si la créature obtient 15-20 sur le d20 d'un test d'attaque, elle inflige +2d6 DM et l'attaque est automatiquement réussie (quelle que soit la DEF de son adversaire). Les dés bonus ne sont pas multipliés en cas de critique.",
        richText: "Si la créature obtient 15-20 sur le d20 d'un test d'attaque, elle inflige +{2d6} DM et l'attaque est automatiquement réussie (quelle que soit la DEF de son adversaire). Les dés bonus ne sont pas multipliés en cas de critique.",
      },
      {
        name: 'Brise-genou',
        text: "Si un adversaire au contact tente de s'éloigner de la créature (généralement pour fuir), celle-ci obtient une attaque de contact gratuite contre lui. Si cette attaque est réussie, en plus des DM habituels, la cible doit réussir un test de CON difficulté 15 ou diviser par deux tous ses déplacements pour le reste du combat.",
      },
      {
        name: 'Capitaine',
        text: 'Le capitaine donne un bonus de +2 en Init., en attaque et aux DM à toutes les créatures sous ses ordres à portée de vue.',
      },
      {
        name: 'Commandant',
        text: "Tant qu'au moins 4 créatures sous ses ordres sont à moins de 20 m du commandant, il ne subit que la moitié des DM qui lui sont infligés.",
      },
    ],
    sourcePage: 294,
  },

  {
    id: 'ourhible',
    name: 'Ourhible',
    category: 'creatures-fantastiques',
    nc: 5,
    size: 'grande',
    description:
      "Les ourhibles sont des ours mutants dont la tête a été remplacée par celle d'un autre animal : crapaud, sanglier, rapace ou même crocodile. Les ourhibles ont les membres supérieurs hypertrophiés prolongés de griffes puissantes. Très agressifs, ils attaquent sans sommation, les yeux injectés de sang et le regard fou.\nDans les Terres d'Osgild : les ourhibles ont été créés lors de la période sombre des guerres qui ont succédé à la chute de l'empire d'Osgild. Le plus célèbre et plus commun des ourhibles est le terrible choursette, mélange de chouette et d'ours.",
    abilities: { AGI: 1, CON: 6, FOR: 6, PER: 2, CHA: -2, INT: -4, VOL: 3 },
    bonusDieAbilities: ['CON'],
    defense: 18,
    hitPoints: 70,
    initiative: 12,
    attacks: [{ name: 'Morsure/défense/bec et griffes', attackCount: 2, bonus: '+10', damage: '1d8+6' }],
    specialAbilities: [
      {
        name: 'Charge (L)',
        text: "La créature parcourt une distance maximale de 20 m et réalise une attaque avec un dé bonus. Si l'attaque est réussie, en plus des DM normaux, une victime de taille inférieure ou égale à la créature doit réussir un test de FOR difficulté 16 ou être renversée. Dans ce cas, la créature piétine sa victime et les DM sont doublés.",
      },
      {
        name: 'Enragé',
        text: "Lorsqu'elle reçoit un coup critique, la créature devient enragée. Elle ignore les pénalités de douleur ou la peur, augmente de +3 sa valeur d'attaque au contact et de +1d4 ses DM. Elle peut encore agir un tour complet après avoir atteint 0 PV.",
        richText: "Lorsqu'elle reçoit un coup critique, la créature devient enragée. Elle ignore les pénalités de douleur ou la peur, augmente de +3 sa valeur d'attaque au contact et de +{1d4} ses DM. Elle peut encore agir un tour complet après avoir atteint 0 PV.",
      },
    ],
    sourcePage: 294,
  },
  {
    id: 'rat-geant',
    name: 'Rat géant',
    category: 'creatures-fantastiques',
    nc: 0.5,
    ncNote: '1/2',
    size: 'petite',
    description:
      "Ce rongeur de la taille d'un chien est beaucoup plus agressif qu'un rat ordinaire. Il pue autant qu'il est laid. Et il est particulièrement laid.",
    abilities: { AGI: 1, CON: 1, FOR: 1, PER: 2, CHA: -4, INT: -4, VOL: -2 },
    bonusDieAbilities: ['PER'],
    defense: 13,
    hitPoints: 4,
    initiative: 15,
    attacks: [{ name: 'Morsure', bonus: '+3', damage: '1d4+1' }],
    specialAbilities: [
      {
        name: 'Maladie',
        text: "Chaque créature mordue par un rat doit faire un test de CON difficulté 10 à la fin du combat. En cas d'échec, elle contracte une maladie dont les symptômes se manifestent après 2d6 h. La victime est affaiblie et perd 1d4 PV toutes les 24 h, qui ne peuvent pas être soignés par le repos. Réalisez un nouveau test de CON difficulté 15 chaque jour pour tenter de mettre fin à la maladie. Les PV perdus sont alors récupérés au rythme de 1 par jour de repos.",
        richText: "Chaque créature mordue par un rat doit faire un test de CON difficulté 10 à la fin du combat. En cas d'échec, elle contracte une maladie dont les symptômes se manifestent après {2d6} h. La victime est affaiblie et perd {1d4} PV toutes les 24 h, qui ne peuvent pas être soignés par le repos. Réalisez un nouveau test de CON difficulté 15 chaque jour pour tenter de mettre fin à la maladie. Les PV perdus sont alors récupérés au rythme de 1 par jour de repos.",
      },
    ],
    sourcePage: 295,
  },
  {
    id: 'skrambler',
    name: 'Skrambler',
    category: 'creatures-fantastiques',
    nc: 3,
    size: 'grande',
    description:
      "Le skrambler est une horrible créature souterraine qui ressemble à une énorme mante religieuse. Son corps est muni d'une épaisse carapace de chitine et de huit pattes. Ses pattes antérieures sont similaires à des faux géantes et sont chargées de saisir et découper ses proies. Le skrambler est capable de se déplacer sous terre grâce à un cône d'onde vibratoire qui fracture la roche. Il n'a alors plus qu'à se dégager un passage à l'aide de ses terribles pattes avant. Il mesure environ 3 m pour 400 kg.",
    abilities: { AGI: 1, CON: 6, FOR: 6, PER: 2, CHA: -4, INT: -4, VOL: 2 },
    bonusDieAbilities: ['AGI', 'PER'],
    defense: 17,
    hitPoints: 30,
    initiative: 14,
    initiativeNote: '19',
    attacks: [{ name: 'Pattes', bonus: '+8', damage: '2d6+6' }],
    specialAbilities: [
      {
        name: 'Creuser (L)',
        text: "Au prix d'une action limitée, le skrambler est capable de creuser sur une profondeur de 10 m par round. Le tunnel s'effondre derrière lui. Il peut utiliser sa capacité Embuscade pour surgir du sol et attaquer.",
      },
      {
        name: 'Embuscade',
        text: "Au premier round de combat, si l'environnement permet à la créature de se dissimuler, la cible doit faire un test de PER difficulté 16 ou être surprise. Si elle attaque avec succès une cible surprise, la créature inflige +1d4 DM et toute créature dont la FOR est inférieure à la sienne est renversée. La créature obtient un bonus de +5 à tous les tests de discrétion et en Init.",
        richText: "Au premier round de combat, si l'environnement permet à la créature de se dissimuler, la cible doit faire un test de PER difficulté 16 ou être surprise. Si elle attaque avec succès une cible surprise, la créature inflige +{1d4} DM et toute créature dont la FOR est inférieure à la sienne est renversée. La créature obtient un bonus de +5 à tous les tests de discrétion et en Init.",
      },
      {
        name: 'Onde dévastatrice (A)',
        text: "Cette onde fracture la roche dans un cône de 10 m de long pour 3 m de large. Une créature dans la zone d'effet (même s'il n'y a pas de roche !) subit 5d6 DM et peut faire un test de CON difficulté 15 pour diviser les DM par deux.",
        richText: "Cette onde fracture la roche dans un cône de 10 m de long pour 3 m de large. Une créature dans la zone d'effet (même s'il n'y a pas de roche !) subit {5d6} DM et peut faire un test de CON difficulté 15 pour diviser les DM par deux.",
      },
    ],
    sourcePage: 296,
  },

  // --- Squelette (p. 296-297) -----------------------------------------------
  {
    id: 'squelette-de-base',
    name: 'Squelette de base',
    category: 'creatures-fantastiques',
    nc: 1,
    nature: ['non-vivant'],
    description:
      "En animant par magie les ossements d'une créature défunte, on obtient un mort-vivant assez fragile appelé le squelette. Un squelette est une créature sans cervelle immunisée à toute forme d'attaque mentale. Et non, il ne parle pas !",
    abilities: { AGI: 1, CON: 1, FOR: 1, PER: -1, CHA: -4, INT: -4, VOL: 6 },
    defense: 13,
    hitPoints: 9,
    initiative: 9,
    attacks: [{ name: 'Épée (ou autre)', bonus: '+4', damage: '1d6+1' }],
    specialAbilities: [
      {
        name: 'Sans esprit',
        text: "Aucune âme n'habite la carcasse morte, le squelette est immunisé à tous les sorts qui affectent l'esprit.",
      },
      {
        name: 'Résistance aux DM',
        text: "Tous les DM infligés à un squelette avec des armes sont divisés par deux, sauf si l'attaquant utilise une arme contondante.",
      },
      { name: 'Réduction des DM de froid', text: 'Réduit de 5 tous les DM de froid reçus.' },
    ],
    sourcePage: 297,
  },
  {
    id: 'squelette-geant',
    name: 'Squelette géant',
    category: 'creatures-fantastiques',
    nc: 4,
    size: 'grande',
    nature: ['non-vivant'],
    baseCreatureId: 'squelette-de-base',
    description: "Un squelette d'ogre ou de troll de presque 3 m de haut…",
    abilities: { AGI: 1, CON: 6, FOR: 6, PER: -2, CHA: -4, INT: -4, VOL: 6 },
    defense: 18,
    hitPoints: 60,
    initiative: 9,
    attacks: [{ name: 'Massue à deux mains', bonus: '+9', damage: '2d8+6' }],
    specialAbilities: [
      {
        name: 'Sans esprit',
        text: "Aucune âme n'habite la carcasse morte, le squelette est immunisé à tous les sorts qui affectent l'esprit.",
      },
      {
        name: 'Résistance aux DM',
        text: "Tous les DM infligés à un squelette avec des armes sont divisés par deux, sauf si l'attaquant utilise une arme contondante.",
      },
      { name: 'Réduction des DM de froid', text: 'Réduit de 5 tous les DM de froid reçus.' },
    ],
    sourcePage: 297,
  },

  {
    id: 'troll',
    name: 'Troll',
    category: 'creatures-fantastiques',
    nc: 5,
    size: 'grande',
    nature: ['humanoide'],
    description:
      "Les trolls sont de grands humanoïdes de 2,70 m à la peau caoutchouteuse verdâtre couverte d'excroissances et de champignons. Non seulement les armes rebondissent sur cette épaisse peau élastique, mais en plus les blessures infligées se referment comme par magie. Aussi, le troll est un monstre dénué de peur, confiant en sa capacité à échapper à la mort et il combat férocement. Les trolls parlent en général le noir parler. Ils vivent le plus souvent dans des endroits reculés : forêts profondes, marais nauséabonds.",
    abilities: { AGI: 1, CON: 6, FOR: 6, PER: 0, CHA: -2, INT: -2, VOL: 2 },
    defense: 19,
    hitPoints: 70,
    hitPointsNote: 'RD3',
    initiative: 10,
    attacks: [
      { name: 'Griffes ou gourdin', attackCount: 2, bonus: '+10', damage: '1d6+6' },
      { name: 'Lancer de rocher', range: '10 m', bonus: '+10', damage: '2d6+6' },
    ],
    specialAbilities: [
      {
        name: 'Fauchage',
        text: "Sur 17 à 20 sur le d20 d'un test d'attaque, si l'attaque est réussie, la victime doit réussir au choix un test de FOR ou d'AGI difficulté 16 ou être renversée. La créature retranche 3 à tous les DM subis (RD 3).",
      },
      {
        name: 'Vitalité surnaturelle',
        text: "Un troll récupère 5 PV par tour, sauf si les DM subis sont de feu ou d'acide. Même à 0 PV, il continue à régénérer les tissus morts à moins qu'on ne brûle son corps ou si un PJ utilise une action limitée pour achever la créature (par exemple, en séparant la tête du corps).",
      },
    ],
    sourcePage: 298,
  },

  // --- Vampire (p. 298-300) -------------------------------------------------
  {
    id: 'vampire',
    name: 'Vampire',
    category: 'creatures-fantastiques',
    nc: 8,
    ncNote: '8 (7)',
    nature: ['non-vivant'],
    description:
      "Le vampire est un humanoïde mort-vivant qui se nourrit du sang des vivants, il peut aisément passer pour un être humain lorsqu'il vient de se gaver de sang frais. Toutefois, il peut aussi prendre une apparence plus ou moins cadavérique ou encore la forme d'une chauve-souris.",
    abilities: { AGI: 4, CON: 5, FOR: 5, PER: 4, CHA: 4, INT: 4, VOL: 4 },
    bonusDieAbilities: ['AGI', 'CON', 'PER'],
    defense: 20,
    hitPoints: 70,
    initiative: 17,
    attacks: [
      { name: 'Griffes et morsure', attackCount: 2, bonus: '+11', damage: '1d8+5', rider: "+ absorption d'énergie" },
      { name: 'Épée longue', attackCount: 2, bonus: '+11', damage: '1d8+7' },
    ],
    specialAbilities: [
      {
        name: "Absorption d'énergie",
        text: "Le vampire récupère 5 PV chaque fois qu'il blesse une créature avec ses armes naturelles. Si la victime est réduite à 0 PV par une telle attaque, elle se transforme en vampirien au prochain crépuscule.",
      },
      {
        name: 'Immortel',
        text: "Lorsqu'il tombe à 0 PV, il passe automatiquement en forme gazeuse et se dirige vers son cercueil où il reprend forme de chair. Il se réveille avec tous ses PV au prochain crépuscule. Pour le tuer, il est alors nécessaire de lui planter un pieu dans le cœur pendant qu'il dort pour l'empêcher de se réveiller et de repasser en forme gazeuse, puis de brûler son corps et son cercueil.",
      },
      {
        name: 'Forme gazeuse (A)',
        text: "Le vampire prend la consistance d'un gaz. Il se déplace au ras du sol (s'il chute, il le fait au ralenti) à une vitesse de 5 m par action de mouvement (M). Il peut s'introduire par les plus petits interstices (comme sous une porte), mais ne peut utiliser aucune capacité ni subir de DM.",
      },
      {
        name: "Pattes d'araignée",
        text: "Le vampire peut se déplacer de 10 m par action de mouvement sur les murs et les plafonds.",
      },
      {
        name: 'Regard envoûtant (M)',
        text: "Le regard du vampire sape la volonté de ses opposants. 3 fois par combat, il peut utiliser une action de mouvement pour tenter d'envoûter son adversaire. La cible doit réussir un test de VOL difficulté 15 ou être affaiblie pour 1d6 rounds. Les créatures de niveau 1 ou inférieur passent sous le contrôle du vampire.",
        richText:
          "Le regard du vampire sape la volonté de ses opposants. 3 fois par combat, il peut utiliser une action de mouvement pour tenter d'envoûter son adversaire. La cible doit réussir un test de VOL difficulté 15 ou être affaiblie pour {1d6} rounds. Les créatures de niveau 1 ou inférieur passent sous le contrôle du vampire.",
      },
      {
        name: 'Résistance impie',
        text: "Le vampire retranche 10 à tous les DM qu'il subit (magie incluse) à l'exception des blessures des armes en argent et du feu. Cette RD ne s'ajoute pas à celle que tous les morts-vivants ont contre le froid.",
      },
      {
        name: 'Riposte éclair',
        text: "La créature peut effectuer une attaque en action gratuite contre chaque adversaire qui l'attaque à l'exception de celui qu'elle a elle-même choisi d'attaquer à son tour.",
      },
      {
        name: 'Transformation en chauve-souris (L)',
        text: "Sous cette forme, le vampire ne peut plus attaquer, mais il se déplace de 20 m par action de mouvement.",
      },
      {
        name: 'Vulnérabilité au soleil',
        text: "Un vampire exposé au soleil subit 2d10 DM par tour sur son maximum de PV (il ne peut pas le régénérer tant qu'il reste à la lumière). Si son maximum de PV est réduit à 0 de cette façon, il est réduit en cendre et définitivement détruit.",
        richText:
          "Un vampire exposé au soleil subit {2d10} DM par tour sur son maximum de PV (il ne peut pas le régénérer tant qu'il reste à la lumière). Si son maximum de PV est réduit à 0 de cette façon, il est réduit en cendre et définitivement détruit.",
      },
    ],
    sourcePage: 298,
  },
  {
    id: 'vampire-ancien',
    name: 'Vampire ancien',
    category: 'creatures-fantastiques',
    nc: 13,
    ncNote: '13 (12)',
    nature: ['non-vivant'],
    baseCreatureId: 'vampire',
    description:
      "Après quelques millénaires, un vampire devient une créature vicieuse, calculatrice et dominatrice capable de contrôler un mortel d'un seul regard.",
    abilities: { AGI: 4, CON: 5, FOR: 5, PER: 4, CHA: 4, INT: 4, VOL: 6 },
    bonusDieAbilities: ['AGI', 'CON', 'PER'],
    defense: 25,
    hitPoints: 160,
    initiative: 17,
    attacks: [
      {
        name: 'Griffes et morsure',
        attackCount: 2,
        bonus: '+14',
        damage: '1d8+8',
        rider: "+ 1d8 de froid + absorption d'énergie",
      },
      { name: 'Épée longue', attackCount: 2, bonus: '+14', damage: '1d8+8', rider: '+1d8 de froid' },
    ],
    sharedAbilitiesNote: 'En plus des capacités du vampire précédent (voir Vampire) :',
    specialAbilities: [
      {
        name: 'Estropier',
        text: "Le vampire inflige des blessures qui se nécrosent et laissent de terribles cicatrices. Ses attaques infligent des DM que vous devez comptabiliser à part, car les effets des sorts et des capacités de guérison sont divisés par deux. De plus, il triple les DM en cas de coup critique au lieu de les doubler.",
      },
      {
        name: 'Magicien',
        text: "La plupart des vampires anciens sont aussi des magiciens ; choisissez une voie de mage au rang 5 (souvent une voie de sorcier).",
      },
      {
        name: 'Regard envoûtant (M)',
        text: "Le regard du vampire sape la volonté de ses opposants. Il peut utiliser une action de mouvement pour tenter d'envoûter son adversaire. La cible doit réussir un test de VOL difficulté 20 ou être affaiblie pour 1d6 rounds ; les créatures de niveau 3 ou inférieur passent sous le contrôle du vampire.",
        richText:
          "Le regard du vampire sape la volonté de ses opposants. Il peut utiliser une action de mouvement pour tenter d'envoûter son adversaire. La cible doit réussir un test de VOL difficulté 20 ou être affaiblie pour {1d6} rounds ; les créatures de niveau 3 ou inférieur passent sous le contrôle du vampire.",
      },
    ],
    sourcePage: 299,
  },
  {
    id: 'vampirien',
    name: 'Vampirien',
    category: 'creatures-fantastiques',
    nc: 4,
    nature: ['humanoide', 'non-vivant'],
    baseCreatureId: 'vampire',
    description:
      "Le vampirien est un mort-vivant mineur au service du vampire qui l'a créé, il ressemble à un humain d'une pâleur mortelle.",
    abilities: { AGI: 2, CON: 3, FOR: 3, PER: 0, CHA: 1, INT: 0, VOL: 2 },
    bonusDieAbilities: ['AGI', 'CON'],
    defense: 17,
    hitPoints: 35,
    hitPointsNote: 'RD 5',
    initiative: 10,
    attacks: [{ name: 'Morsure et griffes', attackCount: 2, bonus: '+6', damage: '1d6+3' }],
    specialAbilities: [
      {
        name: "Absorption d'énergie",
        text: "Chaque fois que le vampirien blesse une créature, il récupère 5 PV.",
      },
      {
        name: 'Forme gazeuse (A)',
        text: "Une fois par jour, le vampirien prend la consistance d'un gaz pendant 1 min. Il se déplace au ras du sol (s'il chute, il le fait au ralenti) à une vitesse de 5 m par action de mouvement (M). Il peut s'introduire par les plus petits interstices (comme sous une porte), mais ne peut utiliser aucune capacité ni subir de DM.",
      },
      {
        name: "Pattes d'araignée",
        text: "Le vampirien peut se déplacer de 10 m par action de mouvement sur les murs et les plafonds.",
      },
      {
        name: 'Regard envoûtant (A)',
        text: "Le regard du vampirien sape la volonté de ses opposants. Une fois par combat, il peut utiliser une action d'attaque pour tenter d'envoûter son adversaire. La cible doit réussir un test de VOL difficulté 10 ou être affaiblie tant qu'elle est sous le regard du vampirien.",
      },
      {
        name: 'Résistances',
        text: "Le vampirien retranche 5 à tous les DM, sauf s'ils sont infligés par des armes en argent ou par le feu.",
      },
      {
        name: 'Vulnérabilité au soleil',
        text: "Un vampirien exposé au soleil subit 2d6 DM par tour sur son maximum de PV (il ne peut pas le régénérer tant qu'il reste à la lumière). Si son maximum de PV est réduit à 0 de cette façon, il est réduit en cendre et définitivement détruit.",
        richText: "Un vampirien exposé au soleil subit {2d6} DM par tour sur son maximum de PV (il ne peut pas le régénérer tant qu'il reste à la lumière). Si son maximum de PV est réduit à 0 de cette façon, il est réduit en cendre et définitivement détruit.",
      },
    ],
    sourcePage: 300,
  },

  // --- Worg (p. 300-301) ----------------------------------------------------
  {
    id: 'worg',
    name: 'Worg',
    category: 'creatures-fantastiques',
    nc: 3,
    size: 'moyenne',
    description:
      "Les worgs sont des cousins maléfiques des loups, plus puissants (jusqu'à 150 kg) et plus intelligents. Ils comprennent le noir parler et ils servent parfois de monture aux gobelins.",
    abilities: { AGI: 1, CON: 5, FOR: 5, PER: 2, CHA: -2, INT: -4, VOL: 2 },
    bonusDieAbilities: ['AGI', 'CON', 'PER'],
    defense: 17,
    hitPoints: 35,
    initiative: 15,
    attacks: [{ name: 'Morsure', bonus: '+7', damage: '1d6+5' }],
    specialAbilities: [
      {
        name: 'Embuscade',
        text: "Au premier round de combat, si l'environnement permet à la créature de se dissimuler, la cible doit faire un test de PER difficulté 16 ou être surprise. Si elle attaque avec succès une cible surprise, la créature inflige +1d4 DM et toute créature dont la FOR est inférieure à la sienne est renversée. La créature obtient un bonus de +5 à tous les tests de discrétion.",
        richText: "Au premier round de combat, si l'environnement permet à la créature de se dissimuler, la cible doit faire un test de PER difficulté 16 ou être surprise. Si elle attaque avec succès une cible surprise, la créature inflige +{1d4} DM et toute créature dont la FOR est inférieure à la sienne est renversée. La créature obtient un bonus de +5 à tous les tests de discrétion.",
      },
      {
        name: 'Brise-genou',
        text: "Si un adversaire au contact tente de s'éloigner de la créature (généralement pour fuir), elle obtient une attaque de contact gratuite contre lui. Si cette attaque est réussie, en plus des DM habituels, la cible doit réussir un test de CON difficulté 15 ou diviser par deux tous ses déplacements pour le reste du combat.",
      },
    ],
    sourcePage: 300,
  },
  {
    id: 'worg-en-meute',
    name: 'Worg en meute',
    category: 'creatures-fantastiques',
    // NC = 8 (valeur de l'en-tête « NC 8+ »), validé par le propriétaire (2026-07-23). Le texte
    // mentionne aussi « leur NC augmente de +1 » (worg NC 3 → 4) et « rencontre de niveau 8 ».
    nc: 8,
    ncNote: '8+',
    size: 'moyenne',
    baseCreatureId: 'worg',
    description:
      "En meute d'au moins 4 individus, les worgs sont des prédateurs vicieux qui s'acharnent sur une proie. Une meute de 6 worgs est une rencontre ordinaire de niveau 8. Leur NC augmente de +1 et elles obtiennent les capacités suivantes :",
    sharedAbilitiesNote: 'Comme le Worg, avec les capacités supplémentaires ci-dessous.',
    specialAbilities: [
      {
        name: 'Attaque en traître (L)',
        text: "Si le worg attaque en même temps qu'un autre worg, dans le dos ou par surprise, il réalise une attaque sournoise avec un dé bonus et +2d4 DM.",
        richText: "Si le worg attaque en même temps qu'un autre worg, dans le dos ou par surprise, il réalise une attaque sournoise avec un dé bonus et +{2d4} DM.",
      },
      {
        name: "L'hallali",
        text: "Les worgs profitent d'une erreur de leur victime pour lui porter des attaques fatales. Chaque fois que la victime de la meute rate une attaque ou obtient un résultat de 1 à 5 sur le d20 lors d'un test d'attaque, elle déclenche la curée. Chaque créature dotée de cette capacité bénéficie immédiatement et gratuitement d'une attaque en traître.",
      },
    ],
    sourcePage: 301,
  },

  // --- Zombie (p. 301-302) --------------------------------------------------
  // Le livre présente le Zombie comme un GABARIT (recette générique, sans NC ni bloc chiffré),
  // avec deux exemples chiffrés (Zombie humain, Zombie choursette). D'où `nc` absent ici.
  {
    id: 'zombie',
    name: 'Zombie',
    category: 'creatures-fantastiques',
    nature: ['non-vivant'],
    description:
      "Un zombie est un mort-vivant animé à partir d'un cadavre récent. Les chairs peuvent être à un stade plus ou moins avancé de putréfaction, mais le corps doit être globalement complet. Le zombie est une créature stupide qui suit les ordres de son créateur ou erre sans but et attaque toute créature vivante à portée.\nPour obtenir un zombie, vous pouvez partir de n'importe quelle créature, qui acquiert le type non-vivante. Ajoutez les capacités suivantes.",
    specialAbilities: [
      {
        name: 'Résistance aux DM',
        text: "Divisez par deux tous les DM infligés au zombie par des armes, sauf s'il s'agit d'armes tranchantes.",
      },
      {
        name: 'Sans esprit',
        text: "Aucune âme n'habite la carcasse morte, le zombie est immunisé à tous les sorts qui affectent l'esprit. L'INT et le CHA passent à -4, la VOL à +6.",
      },
      {
        name: 'Lenteur',
        text: "Le zombie voit son AGI réduite à -1 et sa PER à -2, et il ne se déplace que de 5 m par action de mouvement.",
      },
      {
        name: 'Insensible à la douleur',
        text: "Ajoutez 3 x NC aux PV et retranchez 5 à la DEF. La créature peut encore faire une action (attaque ou mouvement) après avoir été réduite à 0 PV.",
      },
    ],
    sourcePage: 301,
  },
  {
    id: 'zombie-humain',
    name: 'Zombie humain',
    category: 'creatures-fantastiques',
    nc: 1,
    nature: ['non-vivant'],
    baseCreatureId: 'zombie',
    abilities: { AGI: -1, CON: 1, FOR: 2, PER: -2, CHA: -4, INT: -4, VOL: 6 },
    defense: 10,
    hitPoints: 18,
    initiative: 8,
    attacks: [{ name: 'Attaque', bonus: '+4', damage: '1d6+3 ou selon arme +3' }],
    sharedAbilitiesNote: 'Capacités : voir ci-dessus (recette du Zombie).',
    sourcePage: 302,
  },
  {
    id: 'zombie-choursette',
    name: 'Zombie choursette',
    category: 'creatures-fantastiques',
    nc: 4,
    size: 'grande',
    nature: ['non-vivant'],
    baseCreatureId: 'zombie',
    description:
      "Le zombie choursette voit son NC réduit par rapport à la créature originale, car il a perdu les capacités charge et enragé.",
    abilities: { AGI: 1, CON: 6, FOR: 6, PER: -2, CHA: -2, INT: -4, VOL: 6 },
    bonusDieAbilities: ['CON'],
    defense: 13,
    hitPoints: 85,
    initiative: 8,
    attacks: [{ name: 'Bec et griffes', bonus: '+12', damage: '2d8+10' }],
    sharedAbilitiesNote: 'Capacités : voir ci-dessus (recette du Zombie).',
    sourcePage: 302,
  },
];

/**
 * Illustrations détourées (fond transparent) extraites du livre de base et servies depuis
 * `public/bestiary/`. Clé = id de la créature que le livre illustre (une seule illustration par
 * espèce, posée sur la créature de BASE). Injectées dans `illustration` ci-dessous ; les VARIANTES
 * de même espèce (`baseCreatureId`) héritent de l'illustration de leur base à défaut d'en avoir une.
 */
const CREATURE_ILLUSTRATIONS: Record<string, string> = {
  assassin: '/bestiary/assassin.webp',
  milicien: '/bestiary/milicien.webp',
  loup: '/bestiary/loup.webp',
  panthere: '/bestiary/panthere.webp',
  basilic: '/bestiary/basilic.webp',
  chimere: '/bestiary/chimere.webp',
  'dragon-des-forets': '/bestiary/dragon-des-forets.webp',
  'elementaire-eau-grand': '/bestiary/elementaire-eau-grand.webp',
  geoselachis: '/bestiary/geoselachis.webp',
  'gnoll-de-base': '/bestiary/gnoll-de-base.webp',
  'gobelin-de-base': '/bestiary/gobelin-de-base.webp',
  'golem-de-chair': '/bestiary/golem-de-chair.webp',
  goule: '/bestiary/goule.webp',
  griffon: '/bestiary/griffon.webp',
  'hydre-cinq-tetes': '/bestiary/hydre-cinq-tetes.webp',
  'kobold-de-base': '/bestiary/kobold-de-base.webp',
  licorne: '/bestiary/licorne.webp',
  momie: '/bestiary/momie.webp',
  'ogre-de-base': '/bestiary/ogre-de-base.webp',
  'orc-de-base': '/bestiary/orc-de-base.webp',
  ourhible: '/bestiary/ourhible.webp',
  'squelette-de-base': '/bestiary/squelette-de-base.webp',
  skrambler: '/bestiary/skrambler.webp',
  troll: '/bestiary/troll.webp',
  vampire: '/bestiary/vampire.webp',
  worg: '/bestiary/worg.webp',
  'zombie-humain': '/bestiary/zombie-humain.webp',
};

/** Attache l'illustration propre de chaque créature, avec repli sur celle de sa base. */
const withIllustrations = (list: Creature[]): Creature[] =>
  list.map((c) => {
    const illustration =
      CREATURE_ILLUSTRATIONS[c.id] ??
      (c.baseCreatureId ? CREATURE_ILLUSTRATIONS[c.baseCreatureId] : undefined);
    return illustration ? { ...c, illustration } : c;
  });

export const creatures: Creature[] = withIllustrations([
  ...humanoids,
  ...animals,
  ...fantasticCreatures,
]);

export const creatureById = new Map<string, Creature>(creatures.map((c) => [c.id, c]));
