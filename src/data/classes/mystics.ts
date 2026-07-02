import type { CharacterClass, ClassPath, EffectValue, Feature } from '../schema';

/**
 * Valeur scalante « +1, puis +2 au rang 5 de la voie » (palier sur le rang de la
 * voie hôte). Partagée par les facettes de Bénédiction (prêtre, priere-r1) — tests
 * de carac et tests d'attaque montent ensemble au rang 5.
 */
const STEP_1_THEN_2_AT_R5: EffectValue = {
  scale: 'stepped',
  by: 'path-rank',
  steps: [
    { min: 1, value: 1 },
    { min: 5, value: 2 },
  ],
};

/**
 * Famille des mystiques — druide, moine, prêtre.
 * Source : livre de base CO2 (CBHS_06_Chroniques_Oubliees_2_web_v2.pdf), p. 112-125.
 * Textes verbatim. Capacités : `*` → estSort ; (A)/(L)/(G)/(M) → typesAction.
 *
 * caracsConseillees : caractéristiques « les plus utiles au personnage par
 * ordre d'importance », indiquées entre crochets dans la liste des profils
 * p. 25 du livre de base (et non sur les pages de profil 112-125).
 */

// ---------------------------------------------------------------------------
// Profils
// ---------------------------------------------------------------------------

export const mysticClasses: CharacterClass[] = [
  {
    id: 'druide',
    name: 'Druide',
    familyId: 'mystics',
    description:
      "Le druide est un prêtre de la nature qui défend sa pureté originelle et tire ses pouvoirs de la vie, des animaux et des plantes. Dans les Terres d'Osgild : généralement un druide veille sur une forêt ou un lieu sauvage et ce n'est pas ce genre d'endroit qui manque dans les Terres d'Osgild. Un jeune druide peut être un autodidacte élevé à l'école de la survie dans une zone sauvage ou alors un initié d'un cercle druidique. Dans la principauté d'Arly, un tel cercle protège le bois d'Astréis et le Bois dormant. Chez les elfes, un cercle très puissant veille sur Hautesylve, mais il est exclusivement réservé aux elfes. Les druides doivent leurs pouvoirs aux Puissances, des forces naturelles très anciennes antérieures aux dieux. Les Premiers-Nés (elfes et nains) pratiquaient cette religion animiste avant l'arrivée des hommes. Ils priaient les six Forces de la nature (Esprit, Vent, Terre, Feu, Eau et Mort), les Seigneurs des saisons (Hiver, Automne, Printemps et Été) et enfin les Seigneurs des animaux (Ours, Renard, Corbeau, etc.). Aujourd'hui, les humains appellent ces divinités les Anciens Dieux et leur culte est quasi éteint, seuls les druides les prient encore.",
    weaponsAndArmor:
      "Le druide sait manier la dague, le bâton noueux (équivalent au bâton ferré), l'épieu, le javelot et l'arc court. Les voies de druide limitent l'armure au cuir simple. Il peut utiliser le petit bouclier en bois (DEF +1).",
    maxArmorId: 'cuir-simple',
    shieldAccess: 'small',
    meleeAccess: 'none',
    rangedAccess: 'none',
    allowedWeaponIds: ['dague', 'baton-ferre', 'epieu', 'javelot', 'arc-court'],
    weaponNotes: 'Le bâton noueux équivaut au bâton ferré.',
    startingEquipment: [
      // Le livre précise « bâton noueux (équivalent au bâton ferré) » (p. 113).
      { itemId: 'baton-ferre', label: 'Bâton noueux (DM 1d6)', quantity: 1 },
      { itemId: 'epieu', label: 'ou épieu (DM 1d6 ou 1d10)', quantity: 1 },
      { itemId: 'dague', label: 'Dague (DM 1d4)', quantity: 1 },
      { itemId: 'arc-court', label: 'Arc court (DM 1d6, portée 30 m)', quantity: 1 },
      { itemId: 'cuir-simple', label: 'Armure de cuir (DEF +2)', quantity: 1 },
    ],
    pathIds: ['animaux', 'fauve', 'nature', 'protecteur', 'vegetaux'],
    // p. 25 : [Perception, Volonté, Constitution ou Agilité] — la 3e place
    // est un choix « CON ou AGI » ; les deux sont listées ici dans cet ordre.
    recommendedAbilities: ['PER', 'VOL', 'CON', 'AGI'],
    sourcePage: 113,
  },
  {
    id: 'moine',
    name: 'Moine',
    familyId: 'mystics',
    description:
      "Le moine combat à mains nues et utilise le contrôle qu'il a sur son esprit et son corps pour transformer ce dernier en arme de chair. Il peut être issu d'un monastère et pratiquer les arts martiaux, mais vous pouvez aussi développer toutes sortes de combattants à mains nues, depuis un gladiateur formé à la lutte, en passant par un enfant sauvage qui n'a jamais eu d'autre arme que ce que dame nature lui a donné. Toutefois, le profil de moine ne se cantonne pas au combat à mains nues, il couvre tous les combattants acrobates qui réalisent des prouesses martiales. Les capacités de moine peuvent être déclinées avec une arme de prédilection et elles ouvrent alors une infinité de profils hybrides. Dans les Terres d'Osgild : dans la principauté d'Arly, le seul ordre capable de former des moines est installé à Monastir. Toutefois, l'ordre de Saint Môn est dédié à la garde de la Grande Bibliothèque de la cité et ses disciples ne voyagent pas. En revanche, les maîtres enseignent librement les techniques de combat et de méditation à tous ceux qui ont la volonté de suivre le difficile chemin vers la maîtrise corporelle et l'illumination. Le personnage peut donc être un auditeur libre attiré par la réputation de l'enseignement qu'on y prodigue. Il peut aussi avoir postulé pour entrer dans l'ordre de Saint Môn et avoir échoué. Les elfes de Hautesylve possèdent leur propre ordre monastique, le Tyr'Nan Lwe. Aussi appelés elfes verts, ces elfes ont fait vœu de ne jamais utiliser de métal ou de pierre pour blesser autrui, de ne pas couper de plante vivante et de ne pas porter la peau d'animaux morts. Ils n'utilisent pas non plus de monnaie et vivent de troc ou de mendicité. Ce sont des pacifistes très respectés chez les elfes, mais considérés comme des fous partout ailleurs. Certains ont décidé de parcourir le monde pour diffuser la parole de la vie et former des adeptes parmi les autres peuples. Il existe enfin une intense tradition monastique dans les îles d'Ouister. Installés sur des pics vertigineux battus par les vents de l'océan, ces monastères organisent régulièrement des tournois afin de permettre à leurs disciples de se mesurer et de progresser sur le chemin de la connaissance de soi.",
    weaponsAndArmor:
      "Le moine sait manier toutes les armes (sauf les armes à poudre), y compris celles à deux mains, mais la plupart des moines n'y font pas appel et sont plus efficaces à mains nues. En effet, tous les moines infligent des DM létaux avec les attaques à mains nues lorsqu'ils le souhaitent. Les voies de moine interdisent de porter une armure ou d'utiliser un bouclier.",
    maxArmorId: null,
    shieldAccess: 'none',
    meleeAccess: 'all',
    rangedAccess: 'all',
    allowedWeaponIds: [],
    weaponNotes:
      'Toutes les armes, y compris à deux mains, sauf les armes à poudre. Mains nues : DM létaux au choix.',
    startingEquipment: [{ itemId: 'baton', label: 'Bâton (DM 1d6)', quantity: 1 }],
    pathIds: ['energie-vitale', 'maitrise', 'meditation', 'poing', 'vent'],
    recommendedAbilities: ['VOL', 'PER', 'AGI'],
    sourcePage: 118,
  },
  {
    id: 'pretre',
    name: 'Prêtre',
    familyId: 'mystics',
    description:
      "Le prêtre perçoit la nature divine du monde et les desseins des dieux. Il utilise l'énergie transmise par sa divinité pour mener à bien ses missions avec la force de la foi, mais aussi celle des armes si nécessaire. Dans les Terres d'Osgild : Vous trouverez page 126 un tableau qui récapitule la liste des armes sacrées et des capacités divines des principales religions officielles des Terres d'Osgild. Les humains considèrent que les dieux sont les créateurs du monde, tandis que les Premiers-nés (elfes et nains) affirment que les dieux sont arrivés bien après la création du monde par les Puissances (air, terre, feu, eau, esprit et mort). Ils appellent parfois les dieux, les nouveaux dieux, ce qui n'est pas du goût de toutes les religions. Toutefois, il n'y a pas de réel conflit, le culte des Puissances étant quasi éteint.",
    weaponsAndArmor:
      "Le prêtre sait manier les armes contondantes à une main ainsi que le bâton ferré. Les prêtres ont l'interdiction morale de faire couler le sang (!) et n'utilisent donc pas les armes tranchantes ou perçantes pour des raisons religieuses. L'arme sacrée d'un prêtre spécialiste constitue une exception. Les voies de prêtre limitent l'armure à la chemise de mailles et permettent d'utiliser le petit bouclier (DEF +1).",
    maxArmorId: 'chemise-de-mailles',
    shieldAccess: 'small',
    meleeAccess: 'none',
    rangedAccess: 'none',
    allowedWeaponIds: ['fleau', 'gourdin', 'marteau', 'masse', 'baton-ferre'],
    weaponNotes:
      "Armes contondantes à une main + bâton ferré ; pas d'armes tranchantes ou perçantes (raisons religieuses). L'arme sacrée du spécialiste fait exception.",
    startingEquipment: [
      { itemId: 'masse', label: 'Masse', quantity: 1 },
      { itemId: 'marteau', label: 'Marteau de guerre (DM 1d6)', quantity: 1 },
      { itemId: 'baton-ferre', label: 'ou bâton ferré (DM 1d6, à deux mains)', quantity: 1 },
      { itemId: 'petit-bouclier', label: 'Petit bouclier (DEF +1)', quantity: 1 },
      { itemId: 'chemise-de-mailles', label: 'Chemise de mailles (DEF +4)', quantity: 1 },
    ],
    pathIds: ['foi', 'guerre-sainte', 'priere', 'soins', 'spiritualite'],
    recommendedAbilities: ['CHA', 'VOL', 'FOR'],
    sourcePage: 122,
  },
];

// ---------------------------------------------------------------------------
// Voies
// ---------------------------------------------------------------------------

export const mysticPaths: ClassPath[] = [
  // --- Druide ---
  {
    id: 'animaux',
    name: 'Voie des animaux',
    type: 'class',
    classIds: ['druide'],
    featureIds: ['animaux-r1', 'animaux-r2', 'animaux-r3', 'animaux-r4', 'animaux-r5'],
    sourcePage: 114,
  },
  {
    id: 'fauve',
    name: 'Voie du fauve',
    type: 'class',
    classIds: ['druide'],
    featureIds: ['fauve-r1', 'fauve-r2', 'fauve-r3', 'fauve-r4', 'fauve-r5'],
    sourcePage: 115,
  },
  {
    id: 'nature',
    name: 'Voie de la nature',
    type: 'class',
    classIds: ['druide'],
    featureIds: ['nature-r1', 'nature-r2', 'nature-r3', 'nature-r4', 'nature-r5'],
    sourcePage: 116,
  },
  {
    id: 'protecteur',
    name: 'Voie du protecteur',
    type: 'class',
    classIds: ['druide'],
    featureIds: [
      'protecteur-r1',
      'protecteur-r2',
      'protecteur-r3',
      'protecteur-r4',
      'protecteur-r5',
    ],
    sourcePage: 116,
  },
  {
    id: 'vegetaux',
    name: 'Voie des végétaux',
    type: 'class',
    classIds: ['druide'],
    featureIds: ['vegetaux-r1', 'vegetaux-r2', 'vegetaux-r3', 'vegetaux-r4', 'vegetaux-r5'],
    sourcePage: 117,
  },
  // --- Moine ---
  {
    id: 'energie-vitale',
    name: "Voie de l'énergie vitale",
    type: 'class',
    classIds: ['moine'],
    featureIds: [
      'energie-vitale-r1',
      'energie-vitale-r2',
      'energie-vitale-r3',
      'energie-vitale-r4',
      'energie-vitale-r5',
    ],
    sourcePage: 119,
  },
  {
    id: 'maitrise',
    name: 'Voie de la maîtrise',
    type: 'class',
    classIds: ['moine'],
    featureIds: ['maitrise-r1', 'maitrise-r2', 'maitrise-r3', 'maitrise-r4', 'maitrise-r5'],
    sourcePage: 119,
  },
  {
    id: 'meditation',
    name: 'Voie de la méditation',
    type: 'class',
    classIds: ['moine'],
    featureIds: [
      'meditation-r1',
      'meditation-r2',
      'meditation-r3',
      'meditation-r4',
      'meditation-r5',
    ],
    sourcePage: 120,
  },
  {
    id: 'poing',
    name: 'Voie du poing',
    type: 'class',
    classIds: ['moine'],
    note: "MAINS NUES OU ARMES\nPlutôt que de se battre à mains nues, le moine peut décider d'utiliser une arme de son choix. Dans ce cas, dans les différentes capacités de la voie du moine mentionnant « à mains nues », vous pouvez remplacer « à mains nues » par « avec l'arme de son choix » ; et la voie du poing doit alors être renommée en fonction de l'arme choisie (par exemple, voie du bâton ou voie du sabre). Attention, dans le cas d'un profil hybride, ces capacités imposent toujours de ne porter aucune armure ni bouclier.",
    featureIds: ['poing-r1', 'poing-r2', 'poing-r3', 'poing-r4', 'poing-r5'],
    sourcePage: 121,
  },
  {
    id: 'vent',
    name: 'Voie du vent',
    type: 'class',
    classIds: ['moine'],
    featureIds: ['vent-r1', 'vent-r2', 'vent-r3', 'vent-r4', 'vent-r5'],
    sourcePage: 121,
  },
  // --- Prêtre ---
  {
    id: 'foi',
    name: 'Voie de la foi',
    type: 'class',
    classIds: ['pretre'],
    featureIds: ['foi-r1', 'foi-r2', 'foi-r3', 'foi-r4', 'foi-r5'],
    sourcePage: 122,
  },
  {
    id: 'guerre-sainte',
    name: 'Voie de la guerre sainte',
    type: 'class',
    classIds: ['pretre'],
    featureIds: [
      'guerre-sainte-r1',
      'guerre-sainte-r2',
      'guerre-sainte-r3',
      'guerre-sainte-r4',
      'guerre-sainte-r5',
    ],
    sourcePage: 123,
  },
  {
    id: 'priere',
    name: 'Voie de la prière',
    type: 'class',
    classIds: ['pretre'],
    featureIds: ['priere-r1', 'priere-r2', 'priere-r3', 'priere-r4', 'priere-r5'],
    sourcePage: 124,
  },
  {
    id: 'soins',
    name: 'Voie des soins',
    type: 'class',
    classIds: ['pretre'],
    featureIds: ['soins-r1', 'soins-r2', 'soins-r3', 'soins-r4', 'soins-r5'],
    sourcePage: 124,
  },
  {
    id: 'spiritualite',
    name: 'Voie de la spiritualité',
    type: 'class',
    classIds: ['pretre'],
    featureIds: [
      'spiritualite-r1',
      'spiritualite-r2',
      'spiritualite-r3',
      'spiritualite-r4',
      'spiritualite-r5',
    ],
    sourcePage: 125,
  },
];

// ---------------------------------------------------------------------------
// Capacités
// ---------------------------------------------------------------------------

export const mysticFeatures: Feature[] = [
  // =======================================================================
  // DRUIDE — Voie des animaux (p. 114)
  // =======================================================================
  {
    id: 'animaux-r1',
    name: 'Langage des animaux',
    pathId: 'animaux',
    rank: 1,
    isSpell: false,
    actionTypes: [],
    text:
      "Le druide sait communiquer avec les mammifères. La communication reste primitive et limitée à l'intelligence de l'animal et à son point de vue (prédateur, proie, etc.). De plus, il ajoute son rang + 2 à tous les tests destinés à influencer un animal avec lequel il peut communiquer. Chaque fois que le personnage atteint le rang 4 dans une voie de druide, il apprend à communiquer avec une nouvelle catégorie d'animaux de son choix : les oiseaux, les reptiles (et les amphibiens), les poissons (et les mollusques) ou les arthropodes (insectes, araignées, scorpions, etc.) et enfin les animaux fantastiques (griffon, pégase, etc.).",
    // Bonus de compétence (PER-89) : influence animale (CHA), domaine nommé inconditionnel.
    richText:
      "Le druide sait communiquer avec les mammifères. La communication reste primitive et limitée à l'intelligence de l'animal et à son point de vue (prédateur, proie, etc.). De plus, il ajoute son [rang + 2] à tous les tests destinés à influencer un animal avec lequel il peut communiquer. Chaque fois que le personnage atteint le rang 4 dans une voie de druide, il apprend à communiquer avec une nouvelle catégorie d'animaux de son choix : les oiseaux, les reptiles (et les amphibiens), les poissons (et les mollusques) ou les arthropodes (insectes, araignées, scorpions, etc.) et enfin les animaux fantastiques (griffon, pégase, etc.).",
    effects: [{ kind: 'test-bonus', domains: ['animal-handling'] }],
    // Catégories d'animaux supplémentaires : choix RÉPÉTABLE débloqué par paliers de
    // progression — une nouvelle catégorie « chaque fois que le personnage atteint le
    // rang 4 dans une voie de druide » (la voie hôte comprise) → `repeat: paths-at-rank`,
    // même mécanique que Golem supérieur (golem-r5, mages.ts). Les mammifères du rang 1
    // sont acquis d'office (pas une option). Options purement descriptives (aucun effet).
    choices: [
      {
        kind: 'option',
        prompt: "Catégorie d'animaux supplémentaire (par voie de druide au rang 4)",
        repeat: { by: 'paths-at-rank', classIds: ['druide'], rank: 4 },
        options: [
          { id: 'birds', label: 'Oiseaux' },
          { id: 'reptiles', label: 'Reptiles (et amphibiens)' },
          { id: 'fish', label: 'Poissons (et mollusques)' },
          { id: 'arthropods', label: 'Arthropodes (insectes, araignées, scorpions, etc.)' },
          { id: 'fantastic-animals', label: 'Animaux fantastiques (griffon, pégase, etc.)' },
        ],
      },
    ],
    sourcePage: 114,
  },
  {
    id: 'animaux-r2',
    name: 'Petit compagnon',
    pathId: 'animaux',
    rank: 2,
    isSpell: false,
    actionTypes: [],
    text:
      "Le druide choisit un petit animal (écureuil, corbeau, chat). Il peut utiliser les sens de son familier (voir par ses yeux, entendre ce qu'il entend, etc.) et communiquer avec lui à distance illimitée. Il gagne +2 en DEF lorsque son familier est en vue. Le familier récupère tous les PV perdus après une récupération rapide. S'il est réduit à 0 PV, le familier prend la fuite et réapparaît auprès de son maître 24 h plus tard, complètement soigné. S'il est tué (lors d'un fait de jeu que le MJ juge inévitable), le druide perd 1d4° PV en contrecoup et pourra trouver un autre familier au prochain passage de niveau (pas forcément le même animal).\n\nFAMILIER\nAGI +3* | CON 0 | FOR -4 | PER +2* | INT -2 | CHA -2 | VOL +2\nDéfense [13 + rang dans la voie]\nPoints de vigueur [niveau du druide × 2]\nInitiative [Init. du druide]\nUn familier est une créature trop petite pour attaquer et infliger des dommages.\n\nNote : Petit compagnon est une version non magique du Familier du magicien (voie de la magie universelle). Si un personnage décide de faire l'acquisition de ces deux capacités, le bonus de DEF ne se cumule pas.",
    // Profil structuré du familier (mini-fiche) ; le bloc de stats est retiré du richText.
    // Bonus CONDITIONNEL +2 DEF « familier en vue » → interrupteur manuel (PER-67).
    // EXCLUSION MUTUELLE avec le Familier du magicien (magie-universelle-r2) : le livre
    // dit « le bonus de DEF ne se cumule pas » → `disablesFeatures` réciproque (même
    // règle qu'Armure de pierre ↔ Déphasage, cf. effets-conditionnels-cadrage.md).
    richText:
      "Le druide choisit un petit animal (écureuil, corbeau, chat). Il peut utiliser les sens de son familier (voir par ses yeux, entendre ce qu'il entend, etc.) et communiquer avec lui à distance illimitée. Il gagne +2 en DEF lorsque son familier est en vue. Le familier récupère tous les PV perdus après une récupération rapide. S'il est réduit à 0 PV, le familier prend la fuite et réapparaît auprès de son maître 24 h plus tard, complètement soigné. S'il est tué (lors d'un fait de jeu que le MJ juge inévitable), le druide perd {1d4°} PV en contrecoup et pourra trouver un autre familier au prochain passage de niveau (pas forcément le même animal).\n\nNote : Petit compagnon est une version non magique du Familier du magicien (voie de la magie universelle). Si un personnage décide de faire l'acquisition de ces deux capacités, le bonus de DEF ne se cumule pas.",
    effects: [{ kind: 'conditional-stat-bonus', bonuses: [{ stat: 'def', value: 2 }], activation: { kind: 'condition', label: 'familier en vue', activeByDefault: false }, disablesFeatures: ['magie-universelle-r2'] }],
    creatureProfile: { name: 'Familier', abilities: { AGI: 3, CON: 0, FOR: -4, PER: 2, CHA: -2, INT: -2, VOL: 2 }, bonusDieAbilities: ['AGI', 'PER'], defense: '[13 + rang]', hitPoints: '[=niveau × 2]', initiative: { fromMaster: 'initiative' }, note: 'Créature trop petite pour attaquer ou infliger des dommages.' },
    sourcePage: 114,
  },
  {
    id: 'animaux-r3',
    name: "Nuée d'insectes",
    pathId: 'animaux',
    rank: 3,
    isSpell: true,
    actionTypes: ['A'],
    text:
      "En réussissant un test d'attaque magique contre la DEF de sa cible (portée 20 m), le druide libère sur celle-ci une nuée d'insectes volants qui piquent, aveuglent et la suivent pendant [3 + PER] rounds. La victime subit 1 DM par round et un malus de -2 à tous les tests. Les DM de zone détruisent la nuée.",
    richText:
      "En réussissant un test d'attaque magique contre la DEF de sa cible (portée 20 m), le druide libère sur celle-ci une nuée d'insectes volants qui piquent, aveuglent et la suivent pendant [=3 + PER] rounds. La victime subit 1 DM par round et un malus de -2 à tous les tests. Les DM de zone détruisent la nuée.",
    sourcePage: 114,
  },
  {
    id: 'animaux-r4',
    name: 'Masque du prédateur',
    pathId: 'animaux',
    rank: 4,
    isSpell: true,
    actionTypes: ['A'],
    text:
      "Pendant PER minutes, le druide prend les traits d'un fauve ou d'un loup. Il gagne +2 en Initiative, en DEF, en attaque et aux DM au contact et peut voir dans la nuit (comme un elfe).",
    // Buff TEMPORAIRE pendant le sort (interrupteur, PER-67) : +2 Init/DEF/attaque.
    // Le « +2 aux DM au contact » n'est pas une stat dérivée → reste verbatim.
    richText:
      "Pendant [=PER] minutes, le druide prend les traits d'un fauve ou d'un loup. Il gagne +2 en Initiative, en DEF, en attaque et aux DM au contact et peut voir dans la nuit (comme un elfe).",
    effects: [{ kind: 'conditional-stat-bonus', bonuses: [{ stat: 'initiative', value: 2 }, { stat: 'def', value: 2 }, { stat: 'meleeAttack', value: 2 }], activation: { kind: 'temporary', label: 'Masque du prédateur actif', activeByDefault: false } }],
    sourcePage: 114,
  },
  {
    id: 'animaux-r5',
    name: 'Forme animale',
    pathId: 'animaux',
    rank: 5,
    isSpell: true,
    actionTypes: ['A'],
    text:
      "Pendant une durée de PER minutes, le druide peut prendre la forme d'un animal de taille moyenne ou inférieure (minimum une souris) d'une catégorie dont il maîtrise la communication (voir rang 1, à l'exception des animaux fantastiques). Il conserve seulement ses PV, ses valeur d'INT et de VOL, et acquiert les caractéristiques, les attaques, la DEF et les capacités naturelles de la forme choisie (le vol pour un oiseau, la respiration aquatique pour le poisson, etc.). Le druide ne peut ni utiliser son équipement ni ses propres capacités sous cette forme. Le druide peut reprendre sa forme humaine lorsqu'il le désire par une action de mouvement (M).",
    richText:
      "Pendant une durée de [=PER] minutes, le druide peut prendre la forme d'un animal de taille moyenne ou inférieure (minimum une souris) d'une catégorie dont il maîtrise la communication (voir rang 1, à l'exception des animaux fantastiques). Il conserve seulement ses PV, ses valeur d'INT et de VOL, et acquiert les caractéristiques, les attaques, la DEF et les capacités naturelles de la forme choisie (le vol pour un oiseau, la respiration aquatique pour le poisson, etc.). Le druide ne peut ni utiliser son équipement ni ses propres capacités sous cette forme. Le druide peut reprendre sa forme humaine lorsqu'il le désire par une action de mouvement (M).",
    // Interrupteur MARQUEUR de transformation (PER-67) : aucun bonus chiffré — la forme
    // REMPLACE les caractéristiques (le druide acquiert AGI/CON/FOR/PER/DEF/attaques de
    // l'animal et ne garde que PV/INT/VOL), ce qui n'est pas modélisable en +X ; le toggle
    // ne porte donc que l'état « transformé » (comme Armure de pierre / Déphasage). Les
    // catégories accessibles sont dérivées des choix de Langage des animaux (animaux-r1).
    effects: [
      {
        kind: 'conditional-stat-bonus',
        bonuses: [],
        activation: { kind: 'temporary', label: 'Forme animale active', activeByDefault: false },
      },
    ],
    sourcePage: 114,
  },
  // =======================================================================
  // DRUIDE — Voie du fauve (p. 115)
  // =======================================================================
  {
    id: 'fauve-r1',
    name: 'Vitesse du félin',
    pathId: 'fauve',
    rank: 1,
    isSpell: false,
    actionTypes: [],
    text:
      "Le druide ajoute son rang + 2 aux tests de course, d'escalade ou de saut. De plus, il gagne +3 en Initiative et +1 en DEF. Le bonus de DEF passe à +2 au rang 3 et +3 au rang 5.",
    // Bonus de compétence course/escalade/saut (AGI). Init +3 plat ; DEF +1→+2 (r3)→+3 (r5).
    richText:
      "Le druide ajoute son [rang + 2] aux tests de course, d'escalade ou de saut. De plus, il gagne +3 en Initiative et +1 en DEF. Le bonus de DEF passe à +2 au rang 3 et +3 au rang 5.",
    effects: [{ kind: 'test-bonus', domains: ['running', 'climbing', 'jumping'] }, { kind: 'stat-bonus', stat: 'initiative', value: 3 }, { kind: 'stat-bonus', stat: 'def', value: { scale: 'stepped', by: 'path-rank', steps: [{ min: 1, value: 1 }, { min: 3, value: 2 }, { min: 5, value: 3 }] } }],
    sourcePage: 115,
  },
  {
    id: 'fauve-r2',
    name: 'Panthère',
    pathId: 'fauve',
    rank: 2,
    isSpell: false,
    actionTypes: [],
    text:
      "Le druide apprivoise une panthère (ou un puma) qui lui obéit au doigt et à l'œil.\n\nPANTHÈRE\nAGI +4* | CON +2 | FOR +2 | PER +2* | CHA -2 | INT -3 | VOL +2\nDéfense [13 + rang dans la voie]\nPoints de vigueur [niveau du druide × 4]\nInitiative [Init. du druide]\nAttaque au contact [attaque magique] · DM 1d4+2",
    // Profil structuré de la panthère (mini-fiche) ; bloc de stats retiré du richText.
    richText:
      "Le druide apprivoise une panthère (ou un puma) qui lui obéit au doigt et à l'œil.",
    creatureProfile: { name: 'Panthère', abilities: { AGI: 4, CON: 2, FOR: 2, PER: 2, CHA: -2, INT: -3, VOL: 2 }, bonusDieAbilities: ['AGI', 'PER'], defense: '[13 + rang]', hitPoints: '[=niveau × 4]', initiative: { fromMaster: 'initiative' }, attack: { fromMaster: 'magicAttack', damage: '[1d4 + 2]' } },
    sourcePage: 115,
  },
  {
    id: 'fauve-r3',
    name: 'Attaque bondissante',
    pathId: 'fauve',
    rank: 3,
    isSpell: false,
    actionTypes: ['L'],
    text:
      "Le druide ou son félin parcourt de 5 à 10 m et bénéficie d'un dé bonus au test d'attaque et de +1d4° aux DM contre sa cible. Il ne peut pas effectuer d'attaque bondissante s'il est au contact d'un adversaire.",
    richText:
      "Le druide ou son félin parcourt de 5 à 10 m et bénéficie d'un dé bonus au test d'attaque et de +{1d4°} aux DM contre sa cible. Il ne peut pas effectuer d'attaque bondissante s'il est au contact d'un adversaire.",
    sourcePage: 115,
  },
  {
    id: 'fauve-r4',
    name: 'Grand félin',
    pathId: 'fauve',
    rank: 4,
    isSpell: false,
    actionTypes: [],
    text:
      "La panthère devient un animal fabuleux ou est remplacée par un félin plus grand (tigre, lion). Le grand félin peut servir de monture au druide et il se déplace de 20 m par action de mouvement. Le druide peut communiquer avec son félin par télépathie et le guérir à distance en dépensant ses propres PV (-1 PV au druide par PV octroyé au félin).\n\nANIMAL FABULEUX\nAGI +4* | CON +5 | FOR +5 | PER +2* | CHA -2 | INT -2 | VOL +4\nDéfense [15 + rang]\nPoints de vigueur [niveau du druide × 5]\nInitiative [Init. du druide]\nAttaque au contact [attaque magique] · DM 1d4°+5",
    // Profil structuré de l'animal fabuleux (mini-fiche) ; bloc de stats retiré du richText.
    richText:
      "La panthère devient un animal fabuleux ou est remplacée par un félin plus grand (tigre, lion). Le grand félin peut servir de monture au druide et il se déplace de 20 m par action de mouvement. Le druide peut communiquer avec son félin par télépathie et le guérir à distance en dépensant ses propres PV (-1 PV au druide par PV octroyé au félin).",
    creatureProfile: { name: 'Animal fabuleux', abilities: { AGI: 4, CON: 5, FOR: 5, PER: 2, CHA: -2, INT: -2, VOL: 4 }, bonusDieAbilities: ['AGI', 'PER'], defense: '[15 + rang]', hitPoints: '[=niveau × 5]', initiative: { fromMaster: 'initiative' }, attack: { fromMaster: 'magicAttack', damage: '[1d4° + 5]' } },
    // « La panthère devient un animal fabuleux ou est remplacée par un félin plus
    // grand » : Grand félin supplante définitivement la Panthère (fauve-r2) dès son
    // acquisition → remplacement inconditionnel (≠ exclusion par interrupteur).
    replacesFeatures: ['fauve-r2'],
    sourcePage: 115,
  },
  {
    id: 'fauve-r5',
    name: 'Les sept vies du chat',
    pathId: 'fauve',
    rank: 5,
    isSpell: false,
    actionTypes: [],
    text:
      "Cette capacité ne peut être utilisée que six fois, et pas plus d'une fois par niveau. Lorsque les PV du druide tombent à 0 ou qu'il meurt, le druide peut choisir d'ignorer ce qui a provoqué la mort ou l'inconscience ! Le MJ et le joueur doivent se mettre d'accord et trouver une raison plausible (ou pas !) pour expliquer la survie du personnage, et le faire réapparaître immédiatement ou un peu plus tard dans l'aventure si nécessaire.",
    // Usages limités (PER-70) : « ne peut être utilisée que six fois » → compteur 6 → 0.
    // Malgré le nom « sept vies », la règle chiffrée est SIX (verbatim p. 115). La
    // sous-règle « pas plus d'une fois par niveau » reste en texte (non automatisée).
    // Compteur « à vie » (6 usages au total, pas de recharge journalière) → resetOn manuel.
    usageCounter: { max: 6, resetOn: 'manual', label: 'Usages restants' },
    sourcePage: 115,
  },
  // =======================================================================
  // DRUIDE — Voie de la nature (p. 116)
  // =======================================================================
  {
    id: 'nature-r1',
    name: 'Maître de la survie',
    pathId: 'nature',
    rank: 1,
    isSpell: false,
    actionTypes: [],
    text:
      "En milieu naturel, le druide ajoute son rang + 2 à tous les tests de survie (s'orienter, trouver un abri et de la nourriture, éviter les dangers, etc.) dont les tests de récupération effectués chaque nuit. Lorsqu'il dort en milieu naturel, s'il utilise 1 DR, il guérit 1d4° PV supplémentaire.",
    // Bonus de compétence survie (PER).
    richText:
      "En milieu naturel, le druide ajoute son [rang + 2] à tous les tests de survie (s'orienter, trouver un abri et de la nourriture, éviter les dangers, etc.) dont les tests de récupération effectués chaque nuit. Lorsqu'il dort en milieu naturel, s'il utilise 1 DR, il guérit {1d4°} PV supplémentaire.",
    effects: [{ kind: 'test-bonus', domains: ['survival'] }],
    sourcePage: 116,
  },
  {
    id: 'nature-r2',
    name: 'Terrains difficiles',
    pathId: 'nature',
    rank: 2,
    isSpell: false,
    actionTypes: [],
    text:
      "Le druide ne subit aucune pénalité de déplacement en terrain difficile (natation, neige, boue, broussailles, pente abrupte, etc.). Il obtient un bonus de +3 en initiative, et +1 en attaque et en DEF lors d'un combat dans ces conditions.",
    // Buff CONDITIONNEL (combat en terrain difficile) : +3 Init, +1 attaque, +1 DEF (PER-67).
    effects: [{ kind: 'conditional-stat-bonus', bonuses: [{ stat: 'initiative', value: 3 }, { stat: 'meleeAttack', value: 1 }, { stat: 'def', value: 1 }], activation: { kind: 'condition', label: 'combat en terrain difficile', activeByDefault: false } }],
    sourcePage: 116,
  },
  {
    id: 'nature-r3',
    name: 'Bâton de druide',
    pathId: 'nature',
    rank: 3,
    isSpell: false,
    actionTypes: ['L'],
    text:
      "Le druide combat avec les deux extrémités de son bâton de bois noueux (ou de son épieu). Lorsqu'il utilise cette capacité, il effectue deux attaques de contact pour lesquelles il peut remplacer sa FOR par son AGI en attaque s'il le souhaite. Il inflige [1d4°+FOR ou AGI au choix] DM par attaque (plus d'éventuels bonus si l'arme est magique) et il gagne +2 en DEF pendant 1 round.",
    // « FOR ou AGI au choix » non exprimable en formule unique → dé marqué, stats littérales.
    richText:
      "Le druide combat avec les deux extrémités de son bâton de bois noueux (ou de son épieu). Lorsqu'il utilise cette capacité, il effectue deux attaques de contact pour lesquelles il peut remplacer sa FOR par son AGI en attaque s'il le souhaite. Il inflige {1d4°} + FOR ou AGI au choix DM par attaque (plus d'éventuels bonus si l'arme est magique) et il gagne +2 en DEF pendant 1 round.",
    sourcePage: 116,
  },
  {
    id: 'nature-r4',
    name: 'Constitution héroïque',
    pathId: 'nature',
    rank: 4,
    isSpell: false,
    actionTypes: [],
    text:
      "Le druide augmente sa CON de +1. Désormais, il obtient un dé bonus aux tests de CON.",
    // CON +1 + dé bonus aux tests de CON (mécanique core).
    effects: [{ kind: 'ability-bonus', ability: 'CON', value: 1 }, { kind: 'ability-bonus-die', ability: 'CON' }],
    sourcePage: 116,
  },
  {
    id: 'nature-r5',
    name: 'Résistant',
    pathId: 'nature',
    rank: 5,
    isSpell: false,
    actionTypes: [],
    text:
      "Le druide divise par deux tous les DM « naturels non magiques » : froid, feu, chutes, poisons… mais aussi les DM provoqués par les animaux ou les insectes (même géants). Cette protection s'étend aussi à ses compagnons animaux.",
    // PER-137 : RD permanente ÷2 sur les DM « naturels non magiques » (regroupement large du livre :
    // froid, feu, chutes, poisons, animaux/insectes). L'extension aux compagnons animaux reste verbatim.
    damageReduction: { kind: 'divide', value: 2, scopes: ['natural-non-magical'] },
    sourcePage: 116,
  },
  // =======================================================================
  // DRUIDE — Voie du protecteur (p. 116-117)
  // =======================================================================
  {
    id: 'protecteur-r1',
    name: 'Baies magiques',
    pathId: 'protecteur',
    rank: 1,
    isSpell: true,
    actionTypes: ['L'],
    text:
      "Le druide doit se trouver devant un buisson ou un arbre vivant. Son incantation fait pousser PER fruits qu'il peut cueillir. Chaque fruit offre l'équivalent d'un repas et rend [1d4°+rang] PV après 1 min à celui qui le consomme. Les effets de ces fruits ne fonctionnent qu'une fois par jour et par personnage. En plus de ce sort, le druide ajoute son rang + 2 à tous les tests de vigilance et de discrétion en pleine nature.",
    // Bonus de vigilance/discrétion « en pleine nature » = SITUATIONNEL → laissé verbatim
    // (hors périmètre PER-89), seul le rendu [rang + 2] est balisé.
    richText:
      "Le druide doit se trouver devant un buisson ou un arbre vivant. Son incantation fait pousser [=PER] fruits qu'il peut cueillir. Chaque fruit offre l'équivalent d'un repas et rend [1d4° + rang] PV après 1 min à celui qui le consomme. Les effets de ces fruits ne fonctionnent qu'une fois par jour et par personnage. En plus de ce sort, le druide ajoute son [rang + 2] à tous les tests de vigilance et de discrétion en pleine nature.",
    sourcePage: 116,
  },
  {
    id: 'protecteur-r2',
    name: 'Forêt vivante',
    pathId: 'protecteur',
    rank: 2,
    isSpell: true,
    actionTypes: [],
    text:
      "Après un rituel de 30 min, la forêt s'éveille dans un rayon de 1 km par rang et devient une alliée du druide pendant 24 h. Dans ce périmètre, les ennemis du druide sont désorientés et gênés par les branches et les racines. Ils divisent leur déplacement par deux et subissent un dé malus à tous les tests de survie, d'orientation, de perception ou de discrétion. Le druide peut lancer ce sort une seule fois par jour. Si deux druides essaient d'influencer la forêt, c'est celui dont le niveau est le plus élevé qui l'emporte.",
    richText:
      "Après un rituel de 30 min, la forêt s'éveille dans un rayon de [=rang] km et devient une alliée du druide pendant 24 h. Dans ce périmètre, les ennemis du druide sont désorientés et gênés par les branches et les racines. Ils divisent leur déplacement par deux et subissent un dé malus à tous les tests de survie, d'orientation, de perception ou de discrétion. Le druide peut lancer ce sort une seule fois par jour. Si deux druides essaient d'influencer la forêt, c'est celui dont le niveau est le plus élevé qui l'emporte.",
    // « une seule fois par jour » → compteur 1 usage, rechargé au repos long.
    usageCounter: { max: 1, resetOn: 'day', hideFromStatusPanel: true },
    sourcePage: 116,
  },
  {
    id: 'protecteur-r3',
    name: 'Régénération',
    pathId: 'protecteur',
    rank: 3,
    isSpell: true,
    actionTypes: [],
    text:
      "Une cible touchée par le druide récupère [3d4°+PER] PV par un rituel de 10 min (la cible et le druide doivent rester au calme). À partir du rang 5, ce sort permet aussi de faire repousser les membres ou les parties du corps amputées. Une cible peut bénéficier de ce sort seulement une fois par jour.",
    richText:
      "Une cible touchée par le druide récupère [3d4° + PER] PV par un rituel de 10 min (la cible et le druide doivent rester au calme). À partir du rang 5, ce sort permet aussi de faire repousser les membres ou les parties du corps amputées. Une cible peut bénéficier de ce sort seulement une fois par jour.",
    sourcePage: 117,
  },
  {
    id: 'protecteur-r4',
    name: 'Perception héroïque',
    pathId: 'protecteur',
    rank: 4,
    isSpell: false,
    actionTypes: [],
    text:
      "Le druide augmente sa PER de +1. Désormais, il obtient un dé bonus aux tests de PER. De plus, il ajoute désormais sa PER pour calculer ses PM (en plus de sa VOL).",
    // PER +1 + dé bonus aux tests de PER + ajoute la PER aux PM (comme divination-r4).
    effects: [{ kind: 'stat-bonus', stat: 'manaPoints', value: { scale: 'ability', ability: 'PER' } }, { kind: 'ability-bonus', ability: 'PER', value: 1 }, { kind: 'ability-bonus-die', ability: 'PER' }],
    sourcePage: 117,
  },
  {
    id: 'protecteur-r5',
    name: "Forme d'arbre",
    pathId: 'protecteur',
    rank: 5,
    isSpell: true,
    actionTypes: ['A'],
    text:
      "Le druide peut se transformer en arbre (environ 5 m de hauteur) pendant PER minutes. Il prend les mêmes caractéristiques (à l'exception de l'INT, de la PER et de la VOL) que l'arbre animé (voir plus loin), y compris les PV. Sous cette forme, il ne peut pas parler, mais peut utiliser les sorts des voies du protecteur et des végétaux. À la fin du sort, ou s'il est réduit à 0 PV, il reprend forme humaine et retrouve les PV que le personnage avait au début du sort.",
    richText:
      "Le druide peut se transformer en arbre (environ 5 m de hauteur) pendant [=PER] minutes. Il prend les mêmes caractéristiques (à l'exception de l'INT, de la PER et de la VOL) que l'arbre animé (voir plus loin), y compris les PV. Sous cette forme, il ne peut pas parler, mais peut utiliser les sorts des voies du protecteur et des végétaux. À la fin du sort, ou s'il est réduit à 0 PV, il reprend forme humaine et retrouve les PV que le personnage avait au début du sort.",
    sourcePage: 117,
  },
  // =======================================================================
  // DRUIDE — Voie des végétaux (p. 117)
  // =======================================================================
  {
    id: 'vegetaux-r1',
    name: "Peau d'écorce",
    pathId: 'vegetaux',
    rank: 1,
    isSpell: true,
    actionTypes: ['M'],
    text:
      "La peau du druide prend la consistance de l'écorce. Il bénéficie d'un bonus à la DEF égal à +2 pendant PER minutes. Ce bonus augmente de +1 aux rangs 3 et 5. Les effets du sort ne sont pas cumulables au bonus d'une armure métallique ou d'un autre sort de protection qui ajoute un bonus de DEF (à l'exception du Masque du prédateur). En plus de ce sort, le druide ajoute son rang + 2 aux tests pour identifier les plantes et connaître leurs propriétés.",
    // DEF TEMPORAIRE pendant le sort : +2→+3 (r3)→+4 (r5), interrupteur (PER-67). Non-cumul
    // avec armure métallique/autre sort de protection → milestone Armures. Bonus de compétence herboristerie.
    richText:
      "La peau du druide prend la consistance de l'écorce. Il bénéficie d'un bonus à la DEF égal à +2 pendant [=PER] minutes. Ce bonus augmente de +1 aux rangs 3 et 5. Les effets du sort ne sont pas cumulables au bonus d'une armure métallique ou d'un autre sort de protection qui ajoute un bonus de DEF (à l'exception du Masque du prédateur). En plus de ce sort, le druide ajoute son [rang + 2] aux tests pour identifier les plantes et connaître leurs propriétés.",
    effects: [{ kind: 'conditional-stat-bonus', bonuses: [{ stat: 'def', value: { scale: 'stepped', by: 'path-rank', steps: [{ min: 1, value: 2 }, { min: 3, value: 3 }, { min: 5, value: 4 }] } }], activation: { kind: 'temporary', label: 'Peau d\'écorce active', activeByDefault: false } }, { kind: 'test-bonus', domains: ['herbalism'] }],
    sourcePage: 117,
  },
  {
    id: 'vegetaux-r2',
    name: 'Prison végétale',
    pathId: 'vegetaux',
    rank: 2,
    isSpell: true,
    actionTypes: ['L'],
    text:
      "Le druide peut commander à la végétation de pousser et bloquer ses ennemis (mais pas ses alliés) dans une zone de 10 m de diamètre (portée 20 m) pendant PER minutes. Les cibles sont immobilisées. À son tour, une créature peut se libérer (action d'attaque) avec un test de FOR difficulté [10 + PER du druide]. En cas de réussite, elle n'est plus affectée par le sort pour le reste du combat.",
    richText:
      "Le druide peut commander à la végétation de pousser et bloquer ses ennemis (mais pas ses alliés) dans une zone de 10 m de diamètre (portée 20 m) pendant [=PER] minutes. Les cibles sont immobilisées. À son tour, une créature peut se libérer (action d'attaque) avec un test de @FOR difficulté [10 + PER]. En cas de réussite, elle n'est plus affectée par le sort pour le reste du combat.",
    sourcePage: 117,
  },
  {
    id: 'vegetaux-r3',
    name: 'Flèche vivante',
    pathId: 'vegetaux',
    rank: 3,
    isSpell: true,
    actionTypes: ['A'],
    text:
      "En une action, le druide enchante une flèche et la tire (il doit tenir un arc en main). Cette flèche a pour particularité de prendre racine dans la plaie et de devenir un arbuste. S'il réussit un test d'attaque à distance, il inflige les DM habituels de son attaque, et au round suivant, la flèche inflige 3d4° DM supplémentaires. Si la victime est réduite à 0 PV par ce sort, un jeune arbuste pousse sur son cadavre.",
    richText:
      "En une action, le druide enchante une flèche et la tire (il doit tenir un arc en main). Cette flèche a pour particularité de prendre racine dans la plaie et de devenir un arbuste. S'il réussit un test d'attaque à distance, il inflige les DM habituels de son attaque, et au round suivant, la flèche inflige {3d4°} DM supplémentaires. Si la victime est réduite à 0 PV par ce sort, un jeune arbuste pousse sur son cadavre.",
    sourcePage: 117,
  },
  {
    id: 'vegetaux-r4',
    name: "Animation d'un arbre",
    pathId: 'vegetaux',
    rank: 4,
    isSpell: true,
    actionTypes: ['L'],
    text:
      "Le druide peut animer un arbre en le touchant. Il combat à son service pendant [niveau du druide] rounds. Il peut animer un seul arbre à la fois.\n\nARBRE ANIMÉ\nAGI -2 | CON +3 | FOR +3 | PER -2 | CHA -2 | INT -2 | VOL +0\nDéfense [10 + rang]\nPoints de vigueur [Niveau × 5]\nInitiative 8\nAttaque de contact [attaque magique] · DM 1d4°+3\nDéplacement 5 m par action de mouvement.",
    // Profil structuré de l'arbre animé (mini-fiche) ; bloc de stats retiré du richText.
    richText:
      "Le druide peut animer un arbre en le touchant. Il combat à son service pendant [=niveau] rounds. Il peut animer un seul arbre à la fois.",
    creatureProfile: { name: 'Arbre animé', abilities: { AGI: -2, CON: 3, FOR: 3, PER: -2, CHA: -2, INT: -2, VOL: 0 }, defense: '[10 + rang]', hitPoints: '[=niveau × 5]', initiative: '8', attack: { fromMaster: 'magicAttack', damage: '[1d4° + 3]' }, note: 'Déplacement 5 m par action de mouvement.' },
    sourcePage: 117,
  },
  {
    id: 'vegetaux-r5',
    name: 'Porte végétale',
    pathId: 'vegetaux',
    rank: 5,
    isSpell: true,
    actionTypes: ['A'],
    text:
      "Une fois par jour, le druide peut pénétrer dans le tronc d'un gros arbre et sortir de celui d'un autre arbre appartenant à la même forêt et situé à une distance maximale de PER × 10 km. À partir du niveau 10 et tous les 4 niveaux supplémentaires, le druide peut emmener une personne avec lui.",
    richText:
      "Une fois par jour, le druide peut pénétrer dans le tronc d'un gros arbre et sortir de celui d'un autre arbre appartenant à la même forêt et situé à une distance maximale de [=PER × 10] km. À partir du niveau 10 et tous les 4 niveaux supplémentaires, le druide peut emmener une personne avec lui.",
    // « Une fois par jour » → compteur 1 usage, rechargé au repos long.
    usageCounter: { max: 1, resetOn: 'day', hideFromStatusPanel: true },
    sourcePage: 117,
  },
  // =======================================================================
  // MOINE — Voie de l'énergie vitale (p. 119)
  // =======================================================================
  {
    id: 'energie-vitale-r1',
    name: "Mains d'énergie",
    pathId: 'energie-vitale',
    rank: 1,
    isSpell: false,
    actionTypes: ['L'],
    text:
      "Par un effort de concentration, le moine peut rendre ses mains intangibles. Au prix d'une action limitée, à son tour, il peut faire une attaque à mains nues avec un bonus en attaque égal au rang + 2. De plus, même lorsqu'il n'utilise pas Mains d'énergie, toutes les attaques à mains nues du moine sont considérées comme magiques et il peut choisir de remplacer sa FOR aux DM par sa VOL.",
    // Bonus d'attaque [rang + 2] propre à l'action Mains d'énergie (option d'attaque, pas un bonus permanent) → seul le rendu est balisé.
    richText:
      "Par un effort de concentration, le moine peut rendre ses mains intangibles. Au prix d'une action limitée, à son tour, il peut faire une attaque à mains nues avec un bonus en attaque égal au [rang + 2]. De plus, même lorsqu'il n'utilise pas Mains d'énergie, toutes les attaques à mains nues du moine sont considérées comme magiques et il peut choisir de remplacer sa FOR aux DM par sa VOL.",
    sourcePage: 119,
  },
  {
    id: 'energie-vitale-r2',
    name: 'Projection du ki',
    pathId: 'energie-vitale',
    rank: 2,
    isSpell: false,
    actionTypes: ['L'],
    text:
      "Le moine projette une vague de force avec son corps et son esprit à une distance maximale de 20 m. Un test d'attaque magique réussi lui permet d'infliger [1d4°+ VOL] DM. Les DM passent à [2d4°+ VOL] au rang 4.",
    // DM scalants par rang de voie : [1d4°|2@4 + VOL] (palier IN-VOIE) ; phrase explicative conservée.
    richText:
      "Le moine projette une vague de force avec son corps et son esprit à une distance maximale de 20 m. Un test d'attaque magique réussi lui permet d'infliger [1d4°|2@4 + VOL] DM. Les DM passent à {2d4°} + VOL au rang 4.",
    sourcePage: 119,
  },
  {
    id: 'energie-vitale-r3',
    name: 'Invulnérable',
    pathId: 'energie-vitale',
    rank: 3,
    isSpell: false,
    actionTypes: [],
    text:
      "Le moine ne reçoit que la moitié des DM de toutes les sources « élémentaires » : Feu, froid, foudre, acide… ainsi que des poisons ou des maladies. À partir du rang 5, il ne reçoit plus aucun DM ni effet des poisons et des maladies.",
    // PER-137 : ÷2 permanent sur feu/froid/foudre/acide ; poison/maladie ÷2 jusqu'au rang 4, puis
    // IMMUNITÉ totale à partir du rang 5 (gating par rang sur les entrées poison/maladie).
    damageReduction: [
      { kind: 'divide', value: 2, scopes: ['fire', 'cold', 'lightning', 'acid'] },
      { kind: 'divide', value: 2, scopes: ['poison', 'disease'], maxPathRank: 4 },
      { kind: 'immunity', scopes: ['poison', 'disease'], minPathRank: 5 },
    ],
    sourcePage: 119,
  },
  {
    id: 'energie-vitale-r4',
    name: 'Pression mortelle',
    pathId: 'energie-vitale',
    rank: 4,
    isSpell: false,
    actionTypes: ['M'],
    text:
      "Le moine frappe les points par lesquels circule l'énergie vitale d'une créature vivante. En touchant un point précis, il libère ensuite des effets dévastateurs. Lorsqu'il combat à mains nues, le joueur peut choisir de ne pas infliger immédiatement les DM de ses attaques, il les comptabilise à part et ajoute +1d4° aux DM de chaque attaque. À tout moment dans l'heure qui suit, il peut annoncer une Pression mortelle. Il doit alors réussir un test d'attaque au contact contre la DEF de la cible (action limitée), ce qui libère instantanément la totalité des DM infligés jusqu'alors. À partir du niveau 10, le moine n'a plus besoin de toucher sa cible pour déclencher cet effet ; dans ce cas, il remplace le test d'attaque au contact par un test opposé d'attaque magique, mais n'a droit qu'à un seul essai.",
    richText:
      "Le moine frappe les points par lesquels circule l'énergie vitale d'une créature vivante. En touchant un point précis, il libère ensuite des effets dévastateurs. Lorsqu'il combat à mains nues, le joueur peut choisir de ne pas infliger immédiatement les DM de ses attaques, il les comptabilise à part et ajoute +{1d4°} aux DM de chaque attaque. À tout moment dans l'heure qui suit, il peut annoncer une Pression mortelle. Il doit alors réussir un test d'attaque au contact contre la DEF de la cible (action limitée), ce qui libère instantanément la totalité des DM infligés jusqu'alors. À partir du niveau 10, le moine n'a plus besoin de toucher sa cible pour déclencher cet effet ; dans ce cas, il remplace le test d'attaque au contact par un test opposé d'attaque magique, mais n'a droit qu'à un seul essai.",
    sourcePage: 119,
  },
  {
    id: 'energie-vitale-r5',
    name: 'Ascétisme',
    pathId: 'energie-vitale',
    rank: 5,
    isSpell: false,
    actionTypes: [],
    text:
      "Le moine ne mange presque plus, et il peut subsister sans eau et sans sommeil pendant [5 + VOL] jour. Il ne subit aucune pénalité durant cette période. De plus, le moine augmente sa CON de +1 et obtient un dé bonus aux tests de CON.",
    // CON +1 + dé bonus aux tests de CON.
    richText:
      "Le moine ne mange presque plus, et il peut subsister sans eau et sans sommeil pendant [=5 + VOL] jour. Il ne subit aucune pénalité durant cette période. De plus, le moine augmente sa CON de +1 et obtient un dé bonus aux tests de CON.",
    effects: [{ kind: 'ability-bonus', ability: 'CON', value: 1 }, { kind: 'ability-bonus-die', ability: 'CON' }],
    sourcePage: 119,
  },
  // =======================================================================
  // MOINE — Voie de la maîtrise (p. 119-120)
  // =======================================================================
  {
    id: 'maitrise-r1',
    name: 'Agilité du singe',
    pathId: 'maitrise',
    rank: 1,
    isSpell: false,
    actionTypes: [],
    text:
      "Le moine ajoute son rang + 2 à tous ses tests pour effectuer des acrobaties ou esquiver et il gagne +2 en DEF. Ce bonus passe à +3 au rang 4. Se relever (si le personnage est renversé) devient une action gratuite.",
    // Bonus de compétence acrobaties (AGI) ; DEF +2→+3 (r4) permanent.
    richText:
      "Le moine ajoute son [rang + 2] à tous ses tests pour effectuer des acrobaties ou esquiver et il gagne +2 en DEF. Ce bonus passe à +3 au rang 4. Se relever (si le personnage est renversé) devient une action gratuite.",
    effects: [{ kind: 'test-bonus', domains: ['acrobatics'] }, { kind: 'stat-bonus', stat: 'def', value: { scale: 'stepped', by: 'path-rank', steps: [{ min: 1, value: 2 }, { min: 4, value: 3 }] } }],
    sourcePage: 119,
  },
  {
    id: 'maitrise-r2',
    name: 'Griffes du tigre',
    pathId: 'maitrise',
    rank: 2,
    isSpell: false,
    actionTypes: [],
    text:
      "Désormais, lorsque le moine obtient un résultat de 1 au dé de DM à mains nues, il le remplace par le résultat maximal du dé. De plus le moine peut choisir d'infliger des DM tranchants ou perforants lorsqu'il combat à mains nues au lieu de DM contondants.",
    sourcePage: 119,
  },
  {
    id: 'maitrise-r3',
    name: 'Morsure du serpent',
    pathId: 'maitrise',
    rank: 3,
    isSpell: false,
    actionTypes: [],
    text:
      "Lorsqu'il attaque à mains nues, le moine augmente de 1 point les chances d'obtenir un critique sur les attaques au contact (par exemple, 19-20 au lieu de 20). De plus, ses coups critiques portés à mains nues sont désormais si douloureux que la cible est affaiblie pendant 1 round.",
    // PER-133 : élargissement de la plage de critique au CONTACT (+1 → 19-20), CONDITIONNÉ au combat à
    // mains nues. En attendant le câblage automatique au type d'arme porté (PER-136), un interrupteur
    // manuel (effet conditionnel « marqueur d'état », bonuses vide) pilote l'affichage de la puce sous
    // la carte Attaque au contact. L'effet « cible affaiblie sur critique » reste en verbatim.
    effects: [
      {
        kind: 'conditional-stat-bonus',
        bonuses: [],
        activation: { kind: 'condition', label: 'à mains nues' },
      },
    ],
    criticalRange: { scope: 'melee', value: 1 },
    wip: "Plage de critique conditionnée au combat à mains nues — activation manuelle en attendant le câblage automatique au type d'arme porté (PER-136).",
    sourcePage: 119,
  },
  {
    id: 'maitrise-r4',
    name: 'Fureur du dragon',
    pathId: 'maitrise',
    rank: 4,
    isSpell: false,
    actionTypes: ['L'],
    text:
      "Une fois par combat, le moine peut effectuer une attaque tournoyante qui inflige automatiquement [3d4°+FOR] DM à tous les adversaires au contact et oblige ceux-ci à réussir un test de FOR difficulté 10 pour ne pas être renversés.",
    richText:
      "Une fois par combat, le moine peut effectuer une attaque tournoyante qui inflige automatiquement [3d4° + FOR] DM à tous les adversaires au contact et oblige ceux-ci à réussir un test de @FOR difficulté 10 pour ne pas être renversés.",
    // « Une fois par combat » → compteur réinitialisé au repos court (PER-73/151).
    usageCounter: { max: 1, resetOn: 'combat', hideFromStatusPanel: true },
    sourcePage: 119,
  },
  {
    id: 'maitrise-r5',
    name: 'Moment de perfection',
    pathId: 'maitrise',
    rank: 5,
    isSpell: false,
    actionTypes: [],
    text:
      "Une fois par jour, le moine peut choisir de réussir toutes ses attaques automatiquement (pas de critique) et d'esquiver toutes celles qui le prennent pour cible pendant un round. Tout semble aller au ralenti autour de lui… Il peut utiliser cette capacité une fois de plus chaque jour par rang 5 atteint dans une autre voie de moine, mais pas plus d'une fois par combat. De plus le moine augmente définitivement de +1 la valeur de sa plus faible caractéristique (choisir en cas d'égalité).",
    // « 1/jour + 1 par rang 5 atteint dans une AUTRE voie de moine » → max scalant = nombre de
    // capacités de rang 5 de moine acquises (la capacité hôte fournit le « 1 » de base, chaque
    // autre rang 5 ajoute +1) → base 0. Rechargé au repos long. Le plafond « pas plus d'une fois
    // par combat » et le +1 permanent à la plus faible caractéristique restent verbatim.
    usageCounter: {
      maxByRankCount: { classIds: ['moine'], rank: 5, base: 0 },
      resetOn: 'day',
      hideFromStatusPanel: true,
    },
    sourcePage: 120,
  },
  // =======================================================================
  // MOINE — Voie de la méditation (p. 120)
  // =======================================================================
  {
    id: 'meditation-r1',
    name: 'Pacifisme',
    pathId: 'meditation',
    rank: 1,
    isSpell: false,
    actionTypes: [],
    text:
      "Tant que le moine n'a réalisé aucune action offensive dans un combat, il bénéficie d'un bonus de +5 en DEF et divise par deux tous les DM subis par des attaques. De plus, il obtient un bonus égal à son rang + 2 à tous les tests d'empathie (pour analyser l'état émotionnel d'un interlocuteur) ou à ceux effectués pour apaiser un auditoire ou le convaincre de ne pas avoir recours à la violence.",
    // Bonus de compétence empathie (PER) ; +5 DEF CONDITIONNEL (aucune action offensive).
    // PER-137 : « divise par deux tous les DM subis par des attaques » → RD ÷2 (tous DM). Chevauche
    // l'interrupteur « aucune action offensive » ci-dessous : affichée seulement quand il est actif.
    richText:
      "Tant que le moine n'a réalisé aucune action offensive dans un combat, il bénéficie d'un bonus de +5 en DEF et divise par deux tous les DM subis par des attaques. De plus, il obtient un bonus égal à son [rang + 2] à tous les tests d'empathie (pour analyser l'état émotionnel d'un interlocuteur) ou à ceux effectués pour apaiser un auditoire ou le convaincre de ne pas avoir recours à la violence.",
    effects: [{ kind: 'test-bonus', domains: ['empathy'] }, { kind: 'conditional-stat-bonus', bonuses: [{ stat: 'def', value: 5 }], activation: { kind: 'condition', label: 'aucune action offensive ce combat', activeByDefault: false } }],
    damageReduction: { kind: 'divide', value: 2 },
    sourcePage: 120,
  },
  {
    id: 'meditation-r2',
    name: 'Transe de guérison',
    pathId: 'meditation',
    rank: 2,
    isSpell: false,
    actionTypes: [],
    text:
      "Le moine peut méditer pendant 10 min et récupérer ainsi [1d4°+VOL] PV. Les soins augmentent de +1d4° chaque fois que le personnage atteint le rang 4 dans une voie de moine. Il doit terminer une récupération rapide avant de pouvoir à nouveau utiliser cette capacité et il ne peut pas l'utiliser plus de trois fois par jour.",
    richText:
      "Le moine peut méditer pendant 10 min et récupérer ainsi [1d4°|2@1|3@2|4@3|5@4|6@5 + VOL] PV. Les soins augmentent de +{1d4°} chaque fois que le personnage atteint le rang 4 dans une voie de moine. Il doit terminer une récupération rapide avant de pouvoir à nouveau utiliser cette capacité et il ne peut pas l'utiliser plus de trois fois par jour.",
    // « pas plus de trois fois par jour » → compteur 3 usages, rechargé au repos long. La contrainte
    // « terminer une récupération rapide entre deux usages » reste verbatim (non modélisée).
    usageCounter: { max: 3, resetOn: 'day', hideFromStatusPanel: true },
    sourcePage: 120,
  },
  {
    id: 'meditation-r3',
    name: 'Maîtrise du ki',
    pathId: 'meditation',
    rank: 3,
    isSpell: false,
    actionTypes: [],
    text:
      "Le moine utilise sa force mentale pour augmenter son efficacité en combat. Il ajoute sa VOL à son Initiative et à ses PV. De plus, il gagne +2 en DEF (ce bonus passe à +3 au rang 5).",
    // Passif permanent : Init += VOL, PV += VOL, DEF +2→+3 (r5).
    effects: [{ kind: 'stat-bonus', stat: 'initiative', value: { scale: 'ability', ability: 'VOL' } }, { kind: 'stat-bonus', stat: 'maxHp', value: { scale: 'ability', ability: 'VOL' } }, { kind: 'stat-bonus', stat: 'def', value: { scale: 'stepped', by: 'path-rank', steps: [{ min: 1, value: 2 }, { min: 5, value: 3 }] } }],
    sourcePage: 120,
  },
  {
    id: 'meditation-r4',
    name: 'Volonté héroïque',
    pathId: 'meditation',
    rank: 4,
    isSpell: false,
    actionTypes: [],
    text:
      "Le moine augmente sa VOL de +1. Désormais, il obtient un dé bonus aux tests de VOL.",
    // VOL +1 + dé bonus aux tests de VOL.
    effects: [{ kind: 'ability-bonus', ability: 'VOL', value: 1 }, { kind: 'ability-bonus-die', ability: 'VOL' }],
    sourcePage: 120,
  },
  {
    id: 'meditation-r5',
    name: 'Projection mentale',
    pathId: 'meditation',
    rank: 5,
    isSpell: false,
    actionTypes: ['L'],
    text:
      "Une fois par jour, le moine entre en méditation et projette son esprit hors de son corps pendant [1d4°+VOL] minutes. Il ressemble à un ectoplasme de couleur blanche qui se déplace en volant à la vitesse de 10 m par round. Il peut passer au travers des murs, mais pas des êtres vivants ou des barrières magiques. Le moine ne perçoit le monde que par sa projection mentale, mais ressent les DM qui sont infligés à son corps. Il peut utiliser cette capacité une fois de plus chaque jour par rang 5 atteint dans une autre voie de moine. De plus le moine augmente définitivement de +1 la valeur de sa plus faible caractéristique (choisir en cas d'égalité).",
    richText:
      "Une fois par jour, le moine entre en méditation et projette son esprit hors de son corps pendant [1d4° + VOL] minutes. Il ressemble à un ectoplasme de couleur blanche qui se déplace en volant à la vitesse de 10 m par round. Il peut passer au travers des murs, mais pas des êtres vivants ou des barrières magiques. Le moine ne perçoit le monde que par sa projection mentale, mais ressent les DM qui sont infligés à son corps. Il peut utiliser cette capacité une fois de plus chaque jour par rang 5 atteint dans une autre voie de moine. De plus le moine augmente définitivement de +1 la valeur de sa plus faible caractéristique (choisir en cas d'égalité).",
    // « 1/jour + 1 par rang 5 atteint dans une AUTRE voie de moine » → max scalant = nombre de
    // capacités de rang 5 de moine acquises (hôte = « 1 » de base, chaque autre rang 5 = +1) → base 0.
    // Rechargé au repos long.
    usageCounter: {
      maxByRankCount: { classIds: ['moine'], rank: 5, base: 0 },
      resetOn: 'day',
      hideFromStatusPanel: true,
    },
    // +1 à la carac choisie (choix `ability`) → effet `ability-bonus-from-choice`.
    effects: [{ kind: 'ability-bonus-from-choice', choiceIndex: 0, value: 1 }],
    choices: [
      {
        kind: 'ability',
        lowestHint: true,
        prompt: "Caractéristique à augmenter de +1 (la plus faible, choisir en cas d'égalité)",
      },
    ],
    sourcePage: 120,
  },
  // =======================================================================
  // MOINE — Voie du poing (p. 121)
  // =======================================================================
  {
    id: 'poing-r1',
    name: 'Poings de fer',
    pathId: 'poing',
    rank: 1,
    isSpell: false,
    actionTypes: [],
    text:
      "Lorsqu'il combat à mains nues, le moine peut (s'il le souhaite) remplacer sa FOR par son AGI pour ses tests d'attaque au contact et il inflige [1d6+FOR] DM létaux (Voir « DM temporaires » page 219). Ces DM augmentent à chaque rang suivant : 1d8 au rang 2, 1d10 au rang 3, 1d12 au rang 4 et enfin 2d6 au rang 5.",
    // DM dont la TAILLE du dé monte par rang (d6→d8→d10→d12→2d6) : paliers de dé
    // complet `|CdF@R` → le DM principal se résout au rang de voie courant (le joueur
    // voit son dé réel) ; la progression est rappelée en NOTE (petit/gris, `splitNotes`).
    // Choix de table : la substitution optionnelle « remplacer FOR par AGI » (le livre
    // la prévoit pour le test d'attaque) est étendue au DM et rendue par la MEILLEURE
    // des deux carac (`FOR/AGI`) — le `text` verbatim reste « 1d6+FOR » inchangé.
    richText:
      "Lorsqu'il combat à mains nues, le moine peut (s'il le souhaite) remplacer sa FOR par son AGI pour ses tests d'attaque au contact et il inflige [1d6|1d8@2|1d10@3|1d12@4|2d6@5 + FOR/AGI] DM létaux (Voir « DM temporaires » page 219).\n\nNote : ces DM augmentent à chaque rang suivant : {1d8} au rang 2, {1d10} au rang 3, {1d12} au rang 4 et enfin {2d6} au rang 5.",
    sourcePage: 121,
  },
  {
    id: 'poing-r2',
    name: 'Peau de fer',
    pathId: 'poing',
    rank: 2,
    isSpell: false,
    actionTypes: [],
    text:
      "Le moine gagne un bonus de +2 en DEF et il divise tous les DM temporaires subis par deux. Le bonus de DEF passe à +3 au rang 5.",
    // DEF +2→+3 (r5) permanent. TODO(résistances) : « DM temporaires /2 » → DamageReduction (différé).
    effects: [{ kind: 'stat-bonus', stat: 'def', value: { scale: 'stepped', by: 'path-rank', steps: [{ min: 1, value: 2 }, { min: 5, value: 3 }] } }],
    wip: "« DM temporaires divisés par deux » non encore modélisé en réduction de dégâts — différé à la passe Résistances (seul le bonus de DEF est posé).",
    sourcePage: 121,
  },
  {
    id: 'poing-r3',
    name: 'Parade de projectiles',
    pathId: 'poing',
    rank: 3,
    isSpell: false,
    actionTypes: ['G'],
    text:
      "Le moine peut dévier un projectile (flèche, javelot…) une fois par round (sauf si le test d'attaque est un critique ou si l'attaque vient d'une arme à poudre).",
    sourcePage: 121,
  },
  {
    id: 'poing-r4',
    name: 'Déluge de coups',
    pathId: 'poing',
    rank: 4,
    isSpell: false,
    actionTypes: ['L'],
    text:
      "À son tour, le moine peut effectuer deux attaques au contact sur des cibles de son choix.",
    sourcePage: 121,
  },
  {
    id: 'poing-r5',
    name: 'Puissance du ki',
    pathId: 'poing',
    rank: 5,
    isSpell: false,
    actionTypes: [],
    text:
      "Le moine peut choisir de s'imposer un dé malus sur une attaque au contact et ajoute +2d4° aux DM. Cette capacité peut aussi être utilisée avec Projection du ki qui est une attaque magique.",
    richText:
      "Le moine peut choisir de s'imposer un dé malus sur une attaque au contact et ajoute +{2d4°} aux DM. Cette capacité peut aussi être utilisée avec Projection du ki qui est une attaque magique.",
    sourcePage: 121,
  },
  // =======================================================================
  // MOINE — Voie du vent (p. 121)
  // =======================================================================
  {
    id: 'vent-r1',
    name: 'Pas du vent',
    pathId: 'vent',
    rank: 1,
    isSpell: false,
    actionTypes: [],
    text:
      "Le moine peut se déplacer avant et après avoir attaqué (mais il couvre toujours une distance normale, il divise son mouvement en deux). De plus, il gagne +3 en Initiative et son rang + 2 à tous les tests de saut, de course ou d'escalade.",
    // Init +3 plat ; bonus de compétence saut/course/escalade (AGI).
    richText:
      "Le moine peut se déplacer avant et après avoir attaqué (mais il couvre toujours une distance normale, il divise son mouvement en deux). De plus, il gagne +3 en Initiative et son [rang + 2] à tous les tests de saut, de course ou d'escalade.",
    effects: [{ kind: 'stat-bonus', stat: 'initiative', value: 3 }, { kind: 'test-bonus', domains: ['jumping', 'running', 'climbing'] }],
    sourcePage: 121,
  },
  {
    id: 'vent-r2',
    name: 'Course du vent',
    pathId: 'vent',
    rank: 2,
    isSpell: false,
    actionTypes: [],
    text:
      "Le moine se déplace à une vitesse surhumaine, il gagne +1 en DEF et une action de mouvement lui permet de couvrir 15 m. Au rang 5, le bonus de DEF passe à +2 et l'action de mouvement lui permet de couvrir 20 m.",
    // DEF +1→+2 (r5) permanent (le gain de déplacement reste verbatim).
    effects: [{ kind: 'stat-bonus', stat: 'def', value: { scale: 'stepped', by: 'path-rank', steps: [{ min: 1, value: 1 }, { min: 5, value: 2 }] } }],
    sourcePage: 121,
  },
  {
    id: 'vent-r3',
    name: 'Course des airs',
    pathId: 'vent',
    rank: 3,
    isSpell: false,
    actionTypes: [],
    text:
      "Le moine défie les lois de la pesanteur et peut se déplacer sur des surfaces qui ne devraient pas supporter son poids. Il peut se déplacer sur l'eau, la neige, le feuillage des arbres ou courir sur un mur vertical. Il doit commencer et terminer son déplacement sur une surface normale. Il n'est plus ralenti par les terrains difficiles et il est désormais immunisé à l'état immobilisé.",
    sourcePage: 121,
  },
  {
    id: 'vent-r4',
    name: 'Agilité héroïque',
    pathId: 'vent',
    rank: 4,
    isSpell: false,
    actionTypes: [],
    text:
      "Le moine augmente son AGI de +1. Désormais, il obtient un dé bonus aux tests d'AGI.",
    // AGI +1 + dé bonus aux tests d'AGI.
    effects: [{ kind: 'ability-bonus', ability: 'AGI', value: 1 }, { kind: 'ability-bonus-die', ability: 'AGI' }],
    sourcePage: 121,
  },
  {
    id: 'vent-r5',
    name: 'Passe-muraille',
    pathId: 'vent',
    rank: 5,
    isSpell: false,
    actionTypes: ['L'],
    text:
      "Une fois par combat, le moine peut rendre son corps intangible le temps de passer au travers d'un mur d'une épaisseur maximal de VOL mètres. Il ne peut rester immatériel qu'un court instant et reprend corps dès qu'il émerge du mur. Si le mur est trop épais, la capacité ne fonctionne pas. De plus le moine augmente définitivement de +1 la valeur de sa plus faible caractéristique (choisir en cas d'égalité).",
    richText:
      "Une fois par combat, le moine peut rendre son corps intangible le temps de passer au travers d'un mur d'une épaisseur maximal de [=VOL] mètres. Il ne peut rester immatériel qu'un court instant et reprend corps dès qu'il émerge du mur. Si le mur est trop épais, la capacité ne fonctionne pas. De plus le moine augmente définitivement de +1 la valeur de sa plus faible caractéristique (choisir en cas d'égalité).",
    effects: [{ kind: 'ability-bonus-from-choice', choiceIndex: 0, value: 1 }],
    choices: [
      {
        kind: 'ability',
        lowestHint: true,
        prompt: "Caractéristique à augmenter de +1 (la plus faible, choisir en cas d'égalité)",
      },
    ],
    // « Une fois par combat » (intangibilité) → compteur réinitialisé au repos court (PER-73/151).
    usageCounter: { max: 1, resetOn: 'combat', hideFromStatusPanel: true },
    sourcePage: 121,
  },
  // =======================================================================
  // PRÊTRE — Voie de la foi (p. 122-123)
  // =======================================================================
  {
    id: 'foi-r1',
    name: 'Prédicateur',
    pathId: 'foi',
    rank: 1,
    isSpell: false,
    actionTypes: [],
    text:
      "Le prêtre ajoute son rang + 2 aux tests visant à convaincre ou convertir son auditoire. De plus, une fois par jour, il récupère 1 PC s'il réussit à convertir une créature (ou un groupe) à sa religion ou à convaincre une créature peu encline à le faire à suivre ses préceptes.",
    // Bonus de compétence persuasion + prêche (CHA).
    richText:
      "Le prêtre ajoute son [rang + 2] aux tests visant à convaincre ou convertir son auditoire. De plus, une fois par jour, il récupère 1 PC s'il réussit à convertir une créature (ou un groupe) à sa religion ou à convaincre une créature peu encline à le faire à suivre ses préceptes.",
    effects: [{ kind: 'test-bonus', domains: ['persuasion', 'preaching'] }],
    sourcePage: 122,
  },
  {
    id: 'foi-r2',
    name: 'Miracle mineur',
    pathId: 'foi',
    rank: 2,
    isSpell: true,
    actionTypes: ['A'],
    text:
      "Le prêtre réalise un petit miracle. Par exemple, purifier de l'eau croupie pour qu'elle devienne buvable ou des aliments avariés (mais il ne peut pas en créer), apaiser une douleur mineure (qui n'entraîne pas de malus) ou même une douleur majeure pendant un seul round, soigner une maladie bénigne (rhume, grippe, etc.). Ce sort permet aussi de rendre 1d4° PV à une créature à 0 PV.",
    richText:
      "Le prêtre réalise un petit miracle. Par exemple, purifier de l'eau croupie pour qu'elle devienne buvable ou des aliments avariés (mais il ne peut pas en créer), apaiser une douleur mineure (qui n'entraîne pas de malus) ou même une douleur majeure pendant un seul round, soigner une maladie bénigne (rhume, grippe, etc.). Ce sort permet aussi de rendre {1d4°} PV à une créature à 0 PV.",
    sourcePage: 122,
  },
  {
    id: 'foi-r3',
    name: 'Arme de lumière',
    pathId: 'foi',
    rank: 3,
    isSpell: true,
    actionTypes: ['M', 'L'],
    text:
      "Ce sort permet d'enchanter l'arme du prêtre pour une durée de CHA minutes. Elle produit de la lumière dans un rayon de 5 m et contre les démons et les morts-vivants, elle offre un dé bonus en attaque et ajoute +1d4° aux DM. À partir du rang 5, le prêtre peut utiliser ce sort sur l'arme d'un allié au prix d'une action limitée ou, s'il utilise le sort sur son arme personnelle, infliger +2d4° DM (au lieu de 1d4°). Le sort prend immédiatement fin si l'arme quitte les mains du prêtre.",
    richText:
      "Ce sort permet d'enchanter l'arme du prêtre pour une durée de [=CHA] minutes. Elle produit de la lumière dans un rayon de 5 m et contre les démons et les morts-vivants, elle offre un dé bonus en attaque et ajoute +{1d4°} aux DM. À partir du rang 5, le prêtre peut utiliser ce sort sur l'arme d'un allié au prix d'une action limitée ou, s'il utilise le sort sur son arme personnelle, infliger +{2d4°} DM (au lieu de {1d4°}). Le sort prend immédiatement fin si l'arme quitte les mains du prêtre.",
    sourcePage: 123,
  },
  {
    id: 'foi-r4',
    name: 'Ailes célestes',
    pathId: 'foi',
    rank: 4,
    isSpell: true,
    actionTypes: ['A'],
    text:
      "Des ailes divines poussent dans le dos du prêtre, qui peut voler à une vitesse équivalente à son déplacement normal pendant CHA minutes. Rester en vol stationnaire avec les ailes célestes est une action de mouvement.",
    richText:
      "Des ailes divines poussent dans le dos du prêtre, qui peut voler à une vitesse équivalente à son déplacement normal pendant [=CHA] minutes. Rester en vol stationnaire avec les ailes célestes est une action de mouvement.",
    sourcePage: 123,
  },
  {
    id: 'foi-r5',
    name: 'Foudres divines',
    pathId: 'foi',
    rank: 5,
    isSpell: true,
    actionTypes: ['A'],
    text:
      "La foudre frappe toutes les créatures désignées dans un rayon de 10 m autour du prêtre et leur inflige [2d4°+CHA] DM (pas de test d'attaque requis). Ce sort est gourmand en énergie et son coût augmente de +1 PM à chaque utilisation tant que le prêtre n'a pas terminé une récupération rapide.",
    // « +1 PM par utilisation » = surcoût DYNAMIQUE (par-dessus le coût de base) → pas de manaCost.
    richText:
      "La foudre frappe toutes les créatures désignées dans un rayon de 10 m autour du prêtre et leur inflige [2d4° + CHA] DM (pas de test d'attaque requis). Ce sort est gourmand en énergie et son coût augmente de +1 PM à chaque utilisation tant que le prêtre n'a pas terminé une récupération rapide.",
    sourcePage: 123,
  },
  // =======================================================================
  // PRÊTRE — Voie de la guerre sainte (p. 123-124)
  // =======================================================================
  {
    id: 'guerre-sainte-r1',
    name: 'Arme bénie',
    pathId: 'guerre-sainte',
    rank: 1,
    isSpell: true,
    actionTypes: ['A'],
    text:
      "Le prêtre effectue un court rituel et son arme est bénie pour une durée de 24 h. Lorsqu'il obtient un résultat de 1 sur son dé de DM, il relance le dé et garde le second résultat. Les DM de l'arme sont considérés comme magiques. L'arme n'est plus bénie si une autre créature l'utilise.",
    sourcePage: 123,
  },
  {
    id: 'guerre-sainte-r2',
    name: 'Bouclier de la foi',
    pathId: 'guerre-sainte',
    rank: 2,
    isSpell: false,
    actionTypes: [],
    text:
      "Le prêtre porte le symbole de sa foi sur son bouclier, ce qui lui confère un bonus supplémentaire de +1 en DEF lorsqu'il l'utilise. Ce bonus passe à +2 au rang 5. Comme pour l'arme bénie, le symbole de la foi n'est d'aucune utilité si le bouclier est utilisé par quelqu'un d'autre.",
    // DEF CONDITIONNELLE (porte son bouclier) : +1→+2 (r5), interrupteur manuel (PER-67).
    effects: [{ kind: 'conditional-stat-bonus', bonuses: [{ stat: 'def', value: { scale: 'stepped', by: 'path-rank', steps: [{ min: 1, value: 1 }, { min: 5, value: 2 }] } }], activation: { kind: 'condition', label: 'porte son bouclier', activeByDefault: false } }],
    sourcePage: 123,
  },
  {
    id: 'guerre-sainte-r3',
    name: 'Châtiment divin',
    pathId: 'guerre-sainte',
    rank: 3,
    isSpell: false,
    actionTypes: ['L'],
    text:
      "Le prêtre effectue une attaque de contact avec un dé bonus et ajoute son CHA aux dommages. De plus, lorsqu'il utilise cette capacité, le prêtre peut dépenser 1 PM pour ajouter +1d4° aux DM d'une attaque au contact qui touche. Au rang 5, il peut dépenser 2 PM pour ajouter +2d4°.",
    richText:
      "Le prêtre effectue une attaque de contact avec un dé bonus et ajoute son [CHA] aux dommages. De plus, lorsqu'il utilise cette capacité, le prêtre peut dépenser 1 PM pour ajouter +{1d4°} aux DM d'une attaque au contact qui touche. Au rang 5, il peut dépenser 2 PM pour ajouter +{2d4°}.",
    sourcePage: 123,
  },
  {
    id: 'guerre-sainte-r4',
    name: 'Marteau de la foi',
    pathId: 'guerre-sainte',
    rank: 4,
    isSpell: true,
    actionTypes: ['A'],
    text:
      "Le prêtre effectue un test d'attaque magique contre la DEF de sa cible (portée de 30 m). Un projectile d'énergie de la forme de l'arme du prêtre va percuter la cible, lui infligeant [2d4°+CHA] DM en cas de réussite. Si l'arme du prêtre est magique, il peut ajouter son bonus au test d'attaque et aux DM.\nNote : Les DM du marteau de la foi augmentent de +1 chaque fois que le personnage atteint le rang 4 dans une autre voie de prêtre.",
    // DM +1 par AUTRE voie de prêtre au rang 4 = scaling CROSS-VOIE PLAT sur les DM
    // (pas une stat dérivée). Encodé via le terme de formule `paliers` : le compte de
    // voies (voie hôte exclue) est injecté par FeaturesByPath (`milestoneBonusFor`),
    // omis de l'encadré quand il est nul. Le bonus « arme magique » reste verbatim
    // (dépend d'une arme magique équipée → milestone Armures/équipement).
    richText:
      "Le prêtre effectue un test d'attaque magique contre la DEF de sa cible (portée de 30 m). Un projectile d'énergie de la forme de l'arme du prêtre va percuter la cible, lui infligeant [2d4° + CHA + paliers] DM en cas de réussite. Si l'arme du prêtre est magique, il peut ajouter son bonus au test d'attaque et aux DM.\nNote : Les DM du marteau de la foi augmentent de +1 chaque fois que le personnage atteint le rang 4 dans une autre voie de prêtre.",
    sourcePage: 123,
  },
  {
    id: 'guerre-sainte-r5',
    name: 'Mot de pouvoir',
    pathId: 'guerre-sainte',
    rank: 5,
    isSpell: true,
    actionTypes: ['A'],
    text:
      "Une fois par jour, le prêtre peut prononcer un mot avec la voix de son dieu. Cela dépasse l'entendement des mortels et tous ses ennemis dans un rayon de 10 m sont étourdis pendant 1 round (pas d'action et -5 en DEF).",
    // « Une fois par jour » → compteur 1 usage, rechargé au repos long.
    usageCounter: { max: 1, resetOn: 'day', hideFromStatusPanel: true },
    sourcePage: 124,
  },
  // =======================================================================
  // PRÊTRE — Voie de la prière (p. 124)
  // =======================================================================
  {
    id: 'priere-r1',
    name: 'Bénédiction',
    pathId: 'priere',
    rank: 1,
    isSpell: true,
    actionTypes: ['L'],
    text:
      "Le prêtre entonne un chant pour encourager ses compagnons en vue. Ses alliés et lui bénéficient d'un bonus de +1 à tous leurs tests de caractéristique et d'attaque pendant CHA minutes. Ce bonus passe à +2 au rang 5. De plus, le prêtre obtient un bonus égal à son rang + 2 à tous les tests de théologie ou de cosmologie.",
    // Bonus de compétence théologie/cosmologie (permanent) + buff TEMPORAIRE à
    // interrupteur sur les tests de carac et d'attaque DU PRÊTRE. Le +1 aux ALLIÉS
    // reste hors périmètre (fiche mono-perso) → verbatim.
    richText:
      "Le prêtre entonne un chant pour encourager ses compagnons en vue. Ses alliés et lui bénéficient d'un bonus de +1 à tous leurs tests de caractéristique et d'attaque pendant [=CHA] minutes. Ce bonus passe à +2 au rang 5. De plus, le prêtre obtient un bonus égal à son [rang + 2] à tous les tests de théologie ou de cosmologie.",
    effects: [
      { kind: 'test-bonus', domains: ['theology', 'cosmology'] },
      {
        // « +1 à tous les tests de caractéristique ET d'attaque » (→ +2 au rang 5),
        // pendant CHA minutes : un seul interrupteur pilote les deux facettes. Les
        // tests de carac passent par `abilityTestBonus` (ils ne modifient PAS la
        // valeur des caracs) ; les tests d'attaque sont des stats dérivées.
        kind: 'conditional-stat-bonus',
        bonuses: [
          { stat: 'meleeAttack', value: STEP_1_THEN_2_AT_R5 },
          { stat: 'rangedAttack', value: STEP_1_THEN_2_AT_R5 },
          { stat: 'magicAttack', value: STEP_1_THEN_2_AT_R5 },
        ],
        abilityTestBonus: STEP_1_THEN_2_AT_R5,
        activation: { kind: 'temporary', label: 'pendant la Bénédiction (CHA min)', activeByDefault: false },
      },
    ],
    sourcePage: 124,
  },
  {
    id: 'priere-r2',
    name: 'Sanctuaire',
    pathId: 'priere',
    rank: 2,
    isSpell: true,
    actionTypes: ['L'],
    text:
      "Pendant 1 min (10 rounds), tous les adversaires qui veulent attaquer le prêtre doivent réussir un test d'INT difficulté [10 + CHA du prêtre]. S'ils échouent, ils ne peuvent pas l'attaquer pour la durée du sort. Ceux dont le niveau est inférieur à la moitié de celui du prêtre sont automatiquement affectés (pas de test d'INT). Si le prêtre commet une action offensive, le sort prend fin immédiatement et il ne peut plus être lancé avant de prendre une récupération rapide.",
    richText:
      "Pendant 1 min (10 rounds), tous les adversaires qui veulent attaquer le prêtre doivent réussir un test d'@INT difficulté [10 + CHA]. S'ils échouent, ils ne peuvent pas l'attaquer pour la durée du sort. Ceux dont le niveau est inférieur à la moitié de celui du prêtre sont automatiquement affectés (pas de test d'INT). Si le prêtre commet une action offensive, le sort prend fin immédiatement et il ne peut plus être lancé avant de prendre une récupération rapide.",
    sourcePage: 124,
  },
  {
    id: 'priere-r3',
    name: 'Destruction du mal',
    pathId: 'priere',
    rank: 3,
    isSpell: true,
    actionTypes: ['A'],
    text:
      "Tous les morts-vivants et les démons dans un rayon de 10 m autour du prêtre subissent automatiquement [2d4°+CHA] DM. Les DM passent à 3d4° au rang 5.",
    // DM scalants par rang de voie : [2d4°|3@5 + CHA] ; phrase explicative conservée.
    richText:
      "Tous les morts-vivants et les démons dans un rayon de 10 m autour du prêtre subissent automatiquement [2d4°|3@5 + CHA] DM. Les DM passent à {3d4°} au rang 5.",
    sourcePage: 124,
  },
  {
    id: 'priere-r4',
    name: 'Volonté héroïque',
    pathId: 'priere',
    rank: 4,
    isSpell: false,
    actionTypes: [],
    text:
      "Le prêtre augmente sa VOL de +1. Désormais, il obtient un dé bonus aux tests de VOL.",
    // VOL +1 + dé bonus aux tests de VOL.
    effects: [{ kind: 'ability-bonus', ability: 'VOL', value: 1 }, { kind: 'ability-bonus-die', ability: 'VOL' }],
    sourcePage: 124,
  },
  {
    id: 'priere-r5',
    name: 'Intervention divine',
    pathId: 'priere',
    rank: 5,
    isSpell: false,
    actionTypes: ['G'],
    text:
      "Le prêtre fait appel à son dieu pour changer le cours des événements. Une fois par combat, il peut décider qu'un test du MJ ou des joueurs est une réussite ou un échec, même après que les dés ont révélé leur résultat. Il ne peut pas modifier le résultat du test obtenu par une créature d'un NC supérieur à son niveau.",
    // « Une fois par combat » → compteur réinitialisé au repos court (PER-73/151).
    usageCounter: { max: 1, resetOn: 'combat', hideFromStatusPanel: true },
    sourcePage: 124,
  },
  // =======================================================================
  // PRÊTRE — Voie des soins (p. 124-125)
  // =======================================================================
  {
    id: 'soins-r1',
    name: 'Récupération mineure',
    pathId: 'soins',
    rank: 1,
    isSpell: true,
    actionTypes: ['A'],
    text:
      "Le prêtre peut apposer les mains sur un allié au contact (ou sur lui-même) pour le soigner. Le patient récupère [1d4°+CHA du prêtre] PV. Ce sort peut être lancé une fois par jour par rang atteint dans la voie, plus une fois supplémentaire chaque fois que le personnage atteint le rang 3 dans une autre voie de prêtre. En plus de ce sort, le prêtre ajoute son rang + 2 à tous les tests de médecine et de premiers soins.",
    // Bonus de compétence médecine + premiers soins.
    richText:
      "Le prêtre peut apposer les mains sur un allié au contact (ou sur lui-même) pour le soigner. Le patient récupère [1d4° + CHA] PV. Ce sort peut être lancé une fois par jour par rang atteint dans la voie, plus une fois supplémentaire chaque fois que le personnage atteint le rang 3 dans une autre voie de prêtre. En plus de ce sort, le prêtre ajoute son [rang + 2] à tous les tests de médecine et de premiers soins.",
    effects: [{ kind: 'test-bonus', domains: ['medicine', 'first-aid'] }],
    // « une fois par jour par rang atteint dans la voie, plus une fois par rang 3 atteint dans une
    // AUTRE voie de prêtre » → max = rang(soins) + nb de capacités de rang 3 des autres voies de
    // prêtre. Rechargé au repos long. Réserve de soins → jauge du bloc « État du personnage ».
    usageCounter: {
      maxByRankCount: {
        classIds: ['pretre'],
        rank: 3,
        base: 0,
        addPathRank: true,
        excludeHostPath: true,
      },
      resetOn: 'day',
    },
    sourcePage: 124,
  },
  {
    id: 'soins-r2',
    name: 'Vigueur divine',
    pathId: 'soins',
    rank: 2,
    isSpell: true,
    actionTypes: ['L'],
    text:
      "La cible au contact est guérie d'un poison ou d'une maladie. Si l'infection est surnaturelle, un test d'attaque magique (éventuellement opposé) peut être demandé par le MJ. De plus, le prêtre obtient un bonus égal au rang + 2 aux tests effectués pour résister aux maladies et aux poisons.",
    // Bonus de compétence résistance aux maladies/poisons (domaines nommés, sur le porteur).
    richText:
      "La cible au contact est guérie d'un poison ou d'une maladie. Si l'infection est surnaturelle, un test d'attaque magique (éventuellement opposé) peut être demandé par le MJ. De plus, le prêtre obtient un bonus égal au [rang + 2] aux tests effectués pour résister aux maladies et aux poisons.",
    effects: [{ kind: 'test-bonus', domains: ['disease-resistance', 'poison-resistance'] }],
    sourcePage: 124,
  },
  {
    id: 'soins-r3',
    name: 'Récupération majeure',
    pathId: 'soins',
    rank: 3,
    isSpell: true,
    actionTypes: ['L'],
    text:
      "Le prêtre peut soigner une cible (ou lui-même) à une portée de 20 m ; elle récupère immédiatement [3d4°+CHA du prêtre] PV.\nNote : Le montant des soins prodigués augmente de 1d4° chaque fois que le personnage atteint le rang 5 dans une voie de prêtre.",
    // Scaling CROSS-VOIE (même mécanique que meditation-r2) : le nombre de dés monte
    // de +1 par voie de prêtre au rang 5, encodé en paliers `|C@R` où le « rang »
    // passé à la formule est le COMPTE de voies de prêtre au rang 5 (0 → 3d4°, …,
    // 5 → 8d4°). Cf. `countClassPathsAtRank` dans FeaturesByPath. Le terme `rang`
    // n'est pas utilisé dans ce richText.
    richText:
      "Le prêtre peut soigner une cible (ou lui-même) à une portée de 20 m ; elle récupère immédiatement [3d4°|4@1|5@2|6@3|7@4|8@5 + CHA] PV.\nNote : Le montant des soins prodigués augmente de {1d4°} chaque fois que le personnage atteint le rang 5 dans une voie de prêtre.",
    sourcePage: 125,
  },
  {
    id: 'soins-r4',
    name: 'Phénix',
    pathId: 'soins',
    rank: 4,
    isSpell: false,
    actionTypes: [],
    text:
      "Une fois par jour, lorsque le personnage tombe à 0 PV, il se relève, nimbé d'une aura de lumière. Il produit alors une onde d'énergie positive qui restitue [2d4°+CHA du prêtre] PV à tous ses alliés dans un rayon de 20 m, et il récupère lui-même le double de PV.",
    richText:
      "Une fois par jour, lorsque le personnage tombe à 0 PV, il se relève, nimbé d'une aura de lumière. Il produit alors une onde d'énergie positive qui restitue [2d4° + CHA] PV à tous ses alliés dans un rayon de 20 m, et il récupère lui-même le double de PV.",
    // « Une fois par jour » → compteur 1 usage, rechargé au repos long. Le déclenchement « lorsque
    // le personnage tombe à 0 PV » reste verbatim (condition non modélisée).
    usageCounter: { max: 1, resetOn: 'day', hideFromStatusPanel: true },
    sourcePage: 125,
  },
  {
    id: 'soins-r5',
    name: 'Rétablissement',
    pathId: 'soins',
    rank: 5,
    isSpell: true,
    actionTypes: [],
    text:
      "Une fois par jour, le prêtre peut soigner une créature par point de CHA. Chaque patient (éventuellement lui-même inclus) obtient les mêmes effets qu'un sort de Récupération majeure. Le sort prend 10 min pendant lesquelles tous les patients doivent rester au repos dans un rayon de 5 m autour du prêtre qui se concentre et se nimbe de lumière divine. Ce sort ne peut pas être lancé avec la règle de concentration.",
    // « Une fois par jour » → compteur 1 usage, rechargé au repos long.
    usageCounter: { max: 1, resetOn: 'day', hideFromStatusPanel: true },
    sourcePage: 125,
  },
  // =======================================================================
  // PRÊTRE — Voie de la spiritualité (p. 125)
  // =======================================================================
  {
    id: 'spiritualite-r1',
    name: 'Vêtements sacrés',
    pathId: 'spiritualite',
    rank: 1,
    isSpell: false,
    actionTypes: [],
    text:
      "La tenue religieuse du prêtre est bénie et le protège. Lorsqu'il ne porte aucune armure (bouclier autorisé), il obtient un dé bonus à tous les tests pour résister à un contrôle mental (injonction, charme, domination…) et +2 en DEF. Ce bonus passe à +3 au rang 3 et +4 au rang 5. Éventuellement, si le prêtre prie une divinité guerrière, il peut choisir d'obtenir la maîtrise de la cotte de mailles (DEF +5) et l'autorisation d'utiliser les capacités des voies de prêtre avec cette armure (dans le cas d'un profil hybride, la maîtrise de la chemise de mailles est un prérequis pour bénéficier de cette variante).",
    // DEF +2→+3 (r3)→+4 (r5) « sans armure » : câblée comme Bouclier de la foi
    // (guerre-sainte-r2) — conditional-stat-bonus à interrupteur MANUEL. La condition
    // « sans armure (bouclier autorisé) » se coche à la main ; sa DÉTECTION AUTOMATIQUE
    // depuis l'équipement porté est différée au milestone Armures (PER-83, cas « bonus
    // si sans armure »). La variante cotte de mailles (DEF +5 + maîtrise d'armure +
    // capacités utilisables avec) est différée à PER-81 (accès armure par capacité).
    // Dé bonus « résister au contrôle mental » = situationnel → verbatim.
    effects: [
      {
        kind: 'conditional-stat-bonus',
        bonuses: [
          {
            stat: 'def',
            value: {
              scale: 'stepped',
              by: 'path-rank',
              steps: [
                { min: 1, value: 2 },
                { min: 3, value: 3 },
                { min: 5, value: 4 },
              ],
            },
          },
        ],
        activation: { kind: 'condition', label: 'sans armure (bouclier autorisé)', activeByDefault: false },
      },
    ],
    wip: "Bonus de DEF « sans armure » à interrupteur manuel — détection automatique de l'absence d'armure (PER-83) et variante cotte de mailles (maîtrise + capacités utilisables avec, PER-81) différées à la milestone Armures.",
    sourcePage: 125,
  },
  {
    id: 'spiritualite-r2',
    name: 'Augure',
    pathId: 'spiritualite',
    rank: 2,
    isSpell: true,
    actionTypes: ['L'],
    text:
      "Le prêtre entre en contact avec les forces de l'au-delà et demande un avis sur les conséquences d'une action (par exemple « quelles seront les conséquences si j'ouvre cette porte ? »). Il doit faire un test de CHA difficulté 10. En cas de succès, il reçoit une réponse déterminée par le MJ parmi : bénéfique, incertain, risqué ou préjudiciable. Le MJ essaie de donner la réponse la plus utile possible au scénario.",
    sourcePage: 125,
  },
  {
    id: 'spiritualite-r3',
    name: 'Délivrance',
    pathId: 'spiritualite',
    rank: 3,
    isSpell: true,
    actionTypes: ['L'],
    text:
      "En touchant sa cible, le prêtre annule les pénalités infligées par les sorts, les malédictions et les capacités spéciales (peur, douleur, affaiblissement, poisons, pétrification, etc., et les états étourdi, paralysé, ralenti ou immobilisé), mais pas les mutilations ou les amputations. Si la pénalité était permanente, le MJ peut requérir un test d'attaque magique opposé et imposer un éventuel malus selon la force de l'effet.",
    sourcePage: 125,
  },
  {
    id: 'spiritualite-r4',
    name: 'Charisme héroïque',
    pathId: 'spiritualite',
    rank: 4,
    isSpell: false,
    actionTypes: [],
    text:
      "Le prêtre augmente son CHA de +1. Désormais, il obtient un dé bonus aux tests de CHA.",
    // CHA +1 + dé bonus aux tests de CHA.
    effects: [{ kind: 'ability-bonus', ability: 'CHA', value: 1 }, { kind: 'ability-bonus-die', ability: 'CHA' }],
    sourcePage: 125,
  },
  {
    id: 'spiritualite-r5',
    name: 'Marche des plans',
    pathId: 'spiritualite',
    rank: 5,
    isSpell: true,
    actionTypes: ['L'],
    text:
      "Une fois par jour, le prêtre peut passer dans une dimension entre les plans d'existence où le temps et l'espace sont déformés pendant un maximum de CHA rounds. Il se déplace dans une sorte de brouillard gris où le paysage défile à toute vitesse. Pour chaque round de Marche des plans, il se déplace en réalité de 10 km. Le lieu de sortie n'est cependant pas très précis et le MJ doit déterminer une position au hasard autour du point visé (à 1d6 km près).",
    richText:
      "Une fois par jour, le prêtre peut passer dans une dimension entre les plans d'existence où le temps et l'espace sont déformés pendant un maximum de [=CHA] rounds. Il se déplace dans une sorte de brouillard gris où le paysage défile à toute vitesse. Pour chaque round de Marche des plans, il se déplace en réalité de 10 km. Le lieu de sortie n'est cependant pas très précis et le MJ doit déterminer une position au hasard autour du point visé (à {1d6} km près).",
    // « Une fois par jour » → compteur 1 usage, rechargé au repos long.
    usageCounter: { max: 1, resetOn: 'day', hideFromStatusPanel: true },
    sourcePage: 125,
  },
];
