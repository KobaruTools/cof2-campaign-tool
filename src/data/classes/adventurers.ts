import type { CharacterClass, ClassPath, EffectValue, Feature } from '../schema';

/**
 * Valeur scalante « +1, puis +2 au rang 5 de la voie » — bonus de buff récurrent
 * (Chant des héros, musicien-r1 ; cf. Bénédiction du prêtre). Rang = rang ATTEINT
 * dans la voie hôte.
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
 * Famille des aventuriers — chapitre 4 (p. 61-77) du livre de base CO2.
 * Profils : arquebusier, barde, rôdeur, voleur.
 *
 * Éléments partagés par la famille (p. 61) :
 *   Points de vigueur / niveau : 4 — Dé de récupération : d8 — +1 point de chance.
 *
 * Textes verbatim ; ids en slugs ASCII. Voir conventions du projet.
 *
 * caracsConseillees : caractéristiques « les plus utiles au personnage par
 * ordre d'importance », indiquées entre crochets dans la liste des profils
 * p. 24-25 du livre de base (et non sur les pages de profil elles-mêmes).
 */

export const adventurerClasses: CharacterClass[] = [
  {
    id: 'arquebusier',
    name: 'Arquebusier',
    familyId: 'adventurers',
    description:
      "L'arquebusier est un dur à cuire, un mercenaire qui vient généralement d'un pays lointain et maîtrise un style de combat exotique : les armes à feu et les explosifs.\n\nDans les Terres d'Osgild. L'arquebusier est un personnage atypique dans les Terres d'Osgild. Il est toutefois plus commun dans les régions de l'est, où les armes à poudre ont d'abord été importées par le Protectorat de fer, tête de pont d'un vaste empire expansionniste qui a traversé l'océan. Mais cette nation est en guerre larvée permanente avec tous ses voisins et elle garde jalousement le secret des armes à poudre. Plus au sud, les nains de Kaer Glimmerstern maîtrisent à présent eux aussi la poudre et depuis peu ils s'en sont ouverts à leurs alliés, le royaume de Cobis et le duché de Périk. Guilde et Port-Libre, les deux grandes cités commerçantes se sont saisies de l'occasion et font désormais le commerce des armes à poudre, à prix d'or… Un PJ arquebusier devra donc avoir séjourné dans l'un de ces lieux.",
    weaponsAndArmor:
      "L'arquebusier sait manier toutes les armes de contact à une main, les armes à distance, armes à poudre incluses. Un arquebusier sait fabriquer sa propre poudre et elle ne risque pas d'exploser malgré lui (voir la section Équipement).\n\nLes voies d'arquebusier limitent l'armure à la chemise de mailles et interdisent l'utilisation du bouclier.",
    maxArmorId: 'chemise-de-mailles',
    shieldAccess: 'none',
    meleeAccess: 'oneHanded',
    rangedAccess: 'all',
    allowedWeaponIds: [],
    powderAllowed: true,
    weaponNotes: "Fabrique sa propre poudre, sans risque d'explosion accidentelle.",
    startingEquipment: [
      { itemId: null, label: 'Pétoire ou arbalète de poing (DM 1d10, portée 20 m)', quantity: 1 },
      { itemId: 'epee-longue', label: 'Épée longue (DM 1d8)', quantity: 1 },
      { itemId: 'dague', label: 'Dague (DM 1d4)', quantity: 1 },
      { itemId: 'cuir-renforce-broigne', label: 'Cuir renforcé (DEF +3)', quantity: 1 },
    ],
    pathIds: ['artilleur', 'explosifs', 'mercenaire', 'pistolero', 'precision'],
    recommendedAbilities: ['AGI', 'INT', 'CON'],
    sourcePage: 62,
  },
  {
    id: 'barde',
    name: 'Barde',
    familyId: 'adventurers',
    description:
      "Le barde est un personnage polyvalent qui utilise la magie et le spectacle pour divertir et parvenir à ses fins. Il est aussi habitué aux ruses qu'à la diplomatie. Ses capacités sont globalement moins tournées vers le combat et davantage vers les interactions douces.\n\nDans les Terres d'Osgild : toutes les nations civilisées des Terres d'Osgild, à l'exception du Protectorat de fer, accueillent des bardes. Les elfes ont un grand amour des arts, de la musique, du chant et de la danse, bien qu'ils pratiquent parfois un art si conceptuel que les humains ont du mal à l'apprécier. Il se dit même que les chants elfiques dont la beauté touche le cœur des hommes ne sont en réalité que des comptines pour enfant… Dans la principauté d'Arly, Benastir, Valastir et surtout Ferrance sont des cités particulièrement versées dans la culture. Le prince Thomar d'Arly est un ami des lettres et des arts. Il entretient de nombreux artistes et finance d'incroyables festivals dans la ville portuaire. Les nains quant à eux sont des spécialistes du tambour et de la cornemuse, mais il est assez rare que leurs scaldes se produisent en dehors des cités naines. Malgré tout, ce sont les hauts elfes du royaume de Hautesylve qui comptent le plus de bardes dans leur population.",
    weaponsAndArmor:
      "Le barde sait manier les armes à une main. Les voies de barde limitent l'armure au cuir renforcé et interdisent l'utilisation du bouclier. Il est nécessaire d'avoir une main libre pour utiliser les capacités de bardes (ni arme secondaire ni bouclier).",
    maxArmorId: 'cuir-renforce-broigne',
    shieldAccess: 'none',
    meleeAccess: 'oneHanded',
    rangedAccess: 'none',
    allowedWeaponIds: [],
    weaponNotes:
      'Une main doit rester libre pour les capacités de barde (ni arme secondaire ni bouclier).',
    startingEquipment: [
      { itemId: 'rapiere', label: 'Rapière (DM 1d6, Crit 19-20)', quantity: 1 },
      { itemId: 'dague', label: 'Dague (DM 1d4)', quantity: 1 },
      // TODO(extraction): « instrument de musique » non listé dans le catalogue de prix (équipement de départ du barde, p. 66).
      { itemId: null, label: 'Instrument de musique', quantity: 1 },
      { itemId: 'cuir-simple', label: 'Armure de cuir (DEF +2)', quantity: 1 },
    ],
    pathIds: ['escrime', 'musicien', 'saltimbanque', 'seduction', 'vagabond'],
    recommendedAbilities: ['CHA', 'AGI', 'VOL'],
    sourcePage: 66,
  },
  {
    id: 'rodeur',
    name: 'Rôdeur',
    familyId: 'adventurers',
    description:
      "Le rôdeur est à l'aise dans les forêts ténébreuses, où il traque les animaux dangereux et les créatures monstrueuses ou, au contraire, se fait l'ami des bêtes et le protecteur des lieux sauvages.\n\nDans les Terres d'Osgild : on trouve des rôdeurs dans tous les lieux naturels sauvages ou dans les villes et les villages à proximité où ils peuvent servir de guide aux marchands ou aux explorateurs. Dans la principauté d'Arly, le bois de Myrviel, le bois Dormant ou celui d'Astréis sont de bons points de départ tout comme les monts Vierges.",
    weaponsAndArmor:
      "Le rôdeur sait manier les armes de contact à une main et toutes les armes à distance.\n\nLes voies de rôdeur limitent l'armure au cuir renforcé et interdisent le port du bouclier.",
    maxArmorId: 'cuir-renforce-broigne',
    shieldAccess: 'none',
    meleeAccess: 'oneHanded',
    rangedAccess: 'all',
    allowedWeaponIds: [],
    startingEquipment: [
      { itemId: 'epee-longue', label: 'Épée longue (DM 1d8)', quantity: 1 },
      {
        itemId: 'arc-court',
        label:
          "Arc court et carquois (DM 1d6, portée 30 m) ou autre arme de contact (épée courte, hachette, lance)",
        quantity: 1,
      },
      { itemId: 'dague', label: 'Dague (DM 1d4)', quantity: 1 },
      { itemId: 'cuir-renforce-broigne', label: 'Armure de cuir renforcé (DEF +3)', quantity: 1 },
    ],
    pathIds: ['archer', 'compagnon-animal', 'survie', 'traqueur', 'combat-a-deux-armes'],
    recommendedAbilities: ['AGI', 'PER', 'CON'],
    sourcePage: 70,
  },
  {
    id: 'voleur',
    name: 'Voleur',
    familyId: 'adventurers',
    description:
      "Le voleur crochète les portes, détecte les pièges et préfère piller les cadavres des ennemis que se salir les mains pendant le combat. Toutefois, s'il doit combattre, il possède un répertoire impressionnant de coups tordus qui font de lui un redoutable adversaire.\n\nDans les Terres d'Osgild : les voleurs sont très courants partout, ils sont toutefois plus fréquents là où les concentrations de richesses et la misère sont plus importantes, c'est-à-dire dans les grandes villes. Dans la principauté d'Arly, Benastir, Valastir ou Ferrance font l'affaire. Si les aventures débutent loin d'une agglomération, il vous faut alors déterminer pourquoi le jeune délinquant a quitté la cité. Peut-être sa vie était-elle en danger : pour avoir volé la mauvaise personne, parce qu'une puissante organisation du crime a des comptes à régler avec lui ? Il existe en effet des guildes de voleurs très organisées dans certaines cités et il ne fait pas bon empiéter sur leurs plates-bandes. Une épine de plus dans le pied du voleur indépendant qui doit déjà échapper aux forces de l'ordre. C'est pourquoi les tire-laines et autres monte-en-l'air épris de liberté choisissent en général la vie d'aventurier, elle leur permet de changer fréquemment de terrain de chasse sans laisser le temps aux guildes locales de s'intéresser de trop près à leurs activités.",
    weaponsAndArmor:
      "Le voleur sait manier les armes de contact à une main et toutes les armes à distance.\n\nLes voies de voleur limitent l'armure au cuir simple et interdisent l'utilisation du bouclier.",
    maxArmorId: 'cuir-simple',
    shieldAccess: 'none',
    meleeAccess: 'oneHanded',
    rangedAccess: 'all',
    allowedWeaponIds: [],
    startingEquipment: [
      { itemId: 'rapiere', label: 'Rapière (DM 1d6, Crit 19-20)', quantity: 1 },
      { itemId: 'dague', label: 'Dague (DM 1d4, portée 5 m)', quantity: 5 },
      { itemId: 'outils-de-crochetage', label: 'Outils de crochetage', quantity: 1 },
      { itemId: 'cuir-simple', label: 'Armure de cuir (DEF +2)', quantity: 1 },
      { itemId: 'corde-15-m', label: 'Corde de 10 m', quantity: 1 },
    ],
    pathIds: ['assassin', 'aventurier', 'deplacement', 'roublard', 'spadassin'],
    recommendedAbilities: ['AGI', 'INT', 'CHA'],
    sourcePage: 74,
  },
];

export const adventurerPaths: ClassPath[] = [
  // --- Arquebusier -------------------------------------------------------
  {
    id: 'artilleur',
    name: "Voie de l'artilleur",
    type: 'class',
    classIds: ['arquebusier'],
    featureIds: ['artilleur-r1', 'artilleur-r2', 'artilleur-r3', 'artilleur-r4', 'artilleur-r5'],
    sourcePage: 62,
  },
  {
    id: 'explosifs',
    name: 'Voie des explosifs',
    type: 'class',
    classIds: ['arquebusier'],
    featureIds: ['explosifs-r1', 'explosifs-r2', 'explosifs-r3', 'explosifs-r4', 'explosifs-r5'],
    note: "Si le personnage n'est pas arquebusier (profil hybride), obtenir le premier rang dans cette voie lui permet aussi de ne plus avoir de risque d'explosion lorsqu'il utilise une arme à poudre (voir les règles spécifiques des armes à poudre à la section Équipement).",
    sourcePage: 63,
  },
  {
    id: 'mercenaire',
    name: 'Voie du mercenaire',
    type: 'class',
    classIds: ['arquebusier'],
    featureIds: [
      'mercenaire-r1',
      'mercenaire-r2',
      'mercenaire-r3',
      'mercenaire-r4',
      'mercenaire-r5',
    ],
    note: "Note : à titre exceptionnel, si la voie du mercenaire est choisie pour construire un profil hybride, elle ne donne pas accès à la maîtrise des armes à poudre. En revanche, elle n'interdit pas le port du bouclier.",
    sourcePage: 64,
  },
  {
    id: 'pistolero',
    name: 'Voie du pistolero',
    type: 'class',
    classIds: ['arquebusier'],
    featureIds: ['pistolero-r1', 'pistolero-r2', 'pistolero-r3', 'pistolero-r4', 'pistolero-r5'],
    sourcePage: 64,
  },
  {
    id: 'precision',
    name: 'Voie de la précision',
    type: 'class',
    classIds: ['arquebusier'],
    featureIds: ['precision-r1', 'precision-r2', 'precision-r3', 'precision-r4', 'precision-r5'],
    sourcePage: 65,
  },

  // --- Barde -------------------------------------------------------------
  {
    id: 'escrime',
    name: "Voie de l'escrime",
    type: 'class',
    classIds: ['barde'],
    featureIds: ['escrime-r1', 'escrime-r2', 'escrime-r3', 'escrime-r4', 'escrime-r5'],
    sourcePage: 66,
  },
  {
    id: 'musicien',
    name: 'Voie du musicien',
    type: 'class',
    classIds: ['barde'],
    featureIds: ['musicien-r1', 'musicien-r2', 'musicien-r3', 'musicien-r4', 'musicien-r5'],
    sourcePage: 67,
  },
  {
    id: 'saltimbanque',
    name: 'Voie du saltimbanque',
    type: 'class',
    classIds: ['barde'],
    featureIds: [
      'saltimbanque-r1',
      'saltimbanque-r2',
      'saltimbanque-r3',
      'saltimbanque-r4',
      'saltimbanque-r5',
    ],
    sourcePage: 67,
  },
  {
    id: 'seduction',
    name: 'Voie de la séduction',
    type: 'class',
    classIds: ['barde'],
    featureIds: ['seduction-r1', 'seduction-r2', 'seduction-r3', 'seduction-r4', 'seduction-r5'],
    sourcePage: 68,
  },
  {
    id: 'vagabond',
    name: 'Voie du vagabond',
    type: 'class',
    classIds: ['barde'],
    featureIds: ['vagabond-r1', 'vagabond-r2', 'vagabond-r3', 'vagabond-r4', 'vagabond-r5'],
    sourcePage: 68,
  },

  // --- Rôdeur ------------------------------------------------------------
  {
    id: 'archer',
    name: "Voie de l'archer",
    type: 'class',
    classIds: ['rodeur'],
    featureIds: ['archer-r1', 'archer-r2', 'archer-r3', 'archer-r4', 'archer-r5'],
    note: "Note : Si le MJ le permet, cette voie peut être déclinée pour une autre catégorie d'arme à distance : arbalètes, armes à poudre, etc.\n\nConseil aux joueurs : utilisez plutôt Flèche de mort contre une cible avec une haute DEF et Tir rapide contre des cibles multiples et une faible DEF.",
    sourcePage: 70,
  },
  {
    id: 'compagnon-animal',
    name: 'Voie du compagnon animal',
    type: 'class',
    classIds: ['rodeur'],
    featureIds: [
      'compagnon-animal-r1',
      'compagnon-animal-r2',
      'compagnon-animal-r3',
      'compagnon-animal-r4',
      'compagnon-animal-r5',
    ],
    note: "GÉRER UN COMPAGNON ANIMAL\n\nEn ville : le loup du rôdeur n'est pas très à l'aise en milieu urbain. Généralement, il préfère rester à l'extérieur de l'agglomération et se débrouiller seul en attendant que son maître le réclame. Toutefois le joueur peut décider que son personnage adopte un très gros chien plutôt qu'un loup ; dans ce cas, les aventures urbaines ne poseront aucun problème. En revanche, le chien voudra suivre son maître partout.\n\nSoigner un compagnon animal : un compagnon animal peut être soigné par magie et récupère tous les PV perdus après une récupération complète.\n\nCompagnon animal à 0 PV : lorsque le compagnon animal tombe à 0 PV, s'il est en milieu naturel considérez qu'il s'enfuit (il revient au bout de 8 h avec tous ses PV). S'il ne peut pas, il doit être soigné comme le serait un personnage.\n\nMort d'un compagnon animal : le PJ pourra retrouver un nouveau compagnon au passage de niveau suivant. Joueur et MJ doivent se mettre d'accord quant au moment opportun et cela peut faire l'objet d'une scène de jeu.\n\nMontreur d'ours : alternativement, le MJ peut autoriser le joueur à adopter un autre animal et modifier la voie en conséquence. Par exemple, un montreur d'ours pourrait bénéficier des modifications suivantes : au rang 2, remplacer le bonus aux tests pour pister et de surprise par un bonus en intimidation et en spectacle. Retrancher 2 en DEF et ajouter +2 en FOR (et donc +2 aux DM) du compagnon.",
    sourcePage: 70,
  },
  {
    id: 'survie',
    name: 'Voie de la survie',
    type: 'class',
    classIds: ['rodeur'],
    featureIds: ['survie-r1', 'survie-r2', 'survie-r3', 'survie-r4', 'survie-r5'],
    sourcePage: 72,
  },
  {
    id: 'traqueur',
    name: 'Voie du traqueur',
    type: 'class',
    classIds: ['rodeur'],
    featureIds: ['traqueur-r1', 'traqueur-r2', 'traqueur-r3', 'traqueur-r4', 'traqueur-r5'],
    sourcePage: 72,
  },
  {
    id: 'combat-a-deux-armes',
    name: 'Voie du combat à deux armes',
    type: 'class',
    classIds: ['rodeur'],
    featureIds: [
      'combat-a-deux-armes-r1',
      'combat-a-deux-armes-r2',
      'combat-a-deux-armes-r3',
      'combat-a-deux-armes-r4',
      'combat-a-deux-armes-r5',
    ],
    note: "Les capacités de cette voie nécessitent toutes l'usage d'une arme dans chaque main (à l'exception de Combattant héroïque). Cette voie est une exception aux règles sur les profils hybrides, un personnage peut l'utiliser en portant toutes les armures autorisées pas son profil principal. Les capacités de cette voie fonctionnent avec des armes de contact, mais aussi avec des armes de lancer.",
    sourcePage: 73,
  },

  // --- Voleur ------------------------------------------------------------
  {
    id: 'assassin',
    name: "Voie de l'assassin",
    type: 'class',
    classIds: ['voleur'],
    featureIds: ['assassin-r1', 'assassin-r2', 'assassin-r3', 'assassin-r4', 'assassin-r5'],
    note: "** Attaquer dans le dos : lorsque le voleur attaque la même créature qu'un allié au contact de cette cible, on considère qu'il peut attaquer celle-ci dans le dos (sauf si la cible peut se placer dos à un obstacle infranchissable).\n\nIl est possible de réaliser une attaque sournoise à distance, mais pas à portée longue et uniquement contre un adversaire surpris (pas avec la règle d'attaque dans le dos ci-dessus).",
    sourcePage: 74,
  },
  {
    id: 'aventurier',
    name: "Voie de l'aventurier",
    type: 'class',
    classIds: ['voleur'],
    featureIds: ['aventurier-r1', 'aventurier-r2', 'aventurier-r3', 'aventurier-r4', 'aventurier-r5'],
    sourcePage: 74,
  },
  {
    id: 'deplacement',
    name: 'Voie du déplacement',
    type: 'class',
    classIds: ['voleur'],
    featureIds: [
      'deplacement-r1',
      'deplacement-r2',
      'deplacement-r3',
      'deplacement-r4',
      'deplacement-r5',
    ],
    sourcePage: 75,
  },
  {
    id: 'roublard',
    name: 'Voie du roublard',
    type: 'class',
    classIds: ['voleur'],
    featureIds: ['roublard-r1', 'roublard-r2', 'roublard-r3', 'roublard-r4', 'roublard-r5'],
    sourcePage: 76,
  },
  {
    id: 'spadassin',
    name: 'Voie du spadassin',
    type: 'class',
    classIds: ['voleur'],
    featureIds: ['spadassin-r1', 'spadassin-r2', 'spadassin-r3', 'spadassin-r4', 'spadassin-r5'],
    sourcePage: 77,
  },
];

export const adventurerFeatures: Feature[] = [
  // ======================= ARQUEBUSIER ==================================
  // --- Voie de l'artilleur (p. 62) ---
  {
    id: 'artilleur-r1',
    name: 'Mécanismes',
    pathId: 'artilleur',
    rank: 1,
    isSpell: false,
    actionTypes: [],
    text:
      "L'arquebusier ajoute son rang + 2 à tous les tests visant à réparer ou à comprendre des mécanismes (cela inclut le fait de désamorcer des pièges mécaniques et de manipuler des armes de siège). Il obtient un dé bonus à tous les tests d'attaque avec des armes de siège (baliste, couleuvrine, canon, trébuchet, catapulte, etc.).",
    // Rendu enrichi (PER-71) : « son rang + 2 » → [rang + 2]. Bonus de compétence (PER-89)
    // INCONDITIONNEL aux domaines nommés : bricolage (tinkering — qui ABSORBE « réparer/comprendre
    // des mécanismes » et « manipuler des armes de siège », cf. sa description) et désamorçage de
    // pièges mécaniques (disarm-traps, déjà au catalogue). Le « dé bonus aux tests d'ATTAQUE avec des
    // armes de siège » est SITUATIONNEL (arme de siège en main) et porte sur un jet d'attaque, pas sur
    // un domaine de compétence → laissé verbatim.
    richText:
      "L'arquebusier ajoute son [rang + 2] à tous les tests visant à réparer ou à comprendre des mécanismes (cela inclut le fait de désamorcer des pièges mécaniques et de manipuler des armes de siège). Il obtient un dé bonus à tous les tests d'attaque avec des armes de siège (baliste, couleuvrine, canon, trébuchet, catapulte, etc.).",
    effects: [{ kind: 'test-bonus', domains: ['tinkering', 'disarm-traps'] }],
    sourcePage: 62,
  },
  {
    id: 'artilleur-r2',
    name: 'Arme à répétition',
    pathId: 'artilleur',
    rank: 2,
    isSpell: false,
    actionTypes: [],
    text:
      "L'arquebusier modifie jusqu'à deux armes de son choix pour les doter de chargeurs. La capacité du chargeur est égale à [2 + INT] et elle augmente de 1 projectile supplémentaire chaque fois que le personnage atteint le rang 3 dans une voie d'arquebusier. Chaque chargeur doit être ensuite rechargé au rythme d'une action limitée (L) par projectile.",
    // Rendu enrichi (PER-71 / PER-118) : la capacité du chargeur est une QUANTITÉ (compte de projectiles)
    // → [=2 + INT + paliers] (valeur brute). La montée « +1 projectile par rang 3 dans une voie d'arquebusier »
    // est un scaling CROSS-VOIE injecté par le terme `paliers` (milestoneBonus) : le composant câble
    // `countClassPathsAtRank('arquebusier', 3)` (voie hôte comprise, aucune exclusion) via `milestoneBonusFor`.
    // À 0 voie au rang 3, le terme `paliers` est omis → affichage « 2 + INT ».
    richText:
      "L'arquebusier modifie jusqu'à deux armes de son choix pour les doter de chargeurs. La capacité du chargeur est égale à [=2 + INT + paliers] et elle augmente de 1 projectile supplémentaire chaque fois que le personnage atteint le rang 3 dans une voie d'arquebusier. Chaque chargeur doit être ensuite rechargé au rythme d'une action limitée (L) par projectile.",
    sourcePage: 62,
  },
  {
    id: 'artilleur-r3',
    name: 'Tir de barrage',
    pathId: 'artilleur',
    rank: 3,
    isSpell: false,
    actionTypes: ['L'],
    text:
      "L'arquebusier surveille une zone de 20 m de large face à lui. Si une créature se déplace dans cette zone avant son prochain tour, il peut faire une attaque à distance. En cas de succès la victime choisit entre deux possibilités : soit elle subit le double des dommages, soit elle termine son tour et son déplacement à l'endroit de l'attaque et ne subit pas de dommages. L'arquebusier peut effectuer un tir de barrage sur plusieurs créatures durant le round, tant qu'il n'a pas besoin de recharger.",
    sourcePage: 62,
  },
  {
    id: 'artilleur-r4',
    name: 'Canon double',
    pathId: 'artilleur',
    rank: 4,
    isSpell: false,
    actionTypes: [],
    text:
      "L'arquebusier peut bricoler ses armes à poudre (mais pas une couleuvrine) pour les doter d'un second canon. Il double le dé de DM de l'arme (mais pas les dés bonus ni les bonus). Il doit recharger chaque canon individuellement (un canon double consomme 2 projectiles). En cas de critique le dé est triplé (au lieu de ×4). Ce type d'arme possède une double détente et il reste possible de décharger un seul canon à la fois.",
    // PER-71 : modifie le DM d'une ARME À POUDRE (dé de DM doublé, ×3 au critique au lieu de ×4)
    // → relève de l'affichage des DM d'arme augmentés par capacité (PER-115, milestone Armures).
    // Pas d'effet structuré ici ; texte verbatim conservé tel quel (aucune valeur à calculer).
    sourcePage: 63,
  },
  {
    id: 'artilleur-r5',
    name: 'Couleuvrine',
    pathId: 'artilleur',
    rank: 5,
    isSpell: false,
    actionTypes: ['L'],
    text:
      "L'arquebusier obtient une couleuvrine (un petit canon portatif). Sur un test d'attaque à distance réussi (dé bonus), la couleuvrine inflige [5d4° + INT] DM à une portée de 100 m. Il faut ensuite deux rounds (L) pour la recharger. C'est une arme encombrante et il est impossible de transporter plus d'une couleuvrine.",
    // Rendu enrichi (PER-71) : DM de la couleuvrine [5d4° + INT]. Le « (dé bonus) » sur le test
    // d'attaque est SITUATIONNEL (propre à la couleuvrine) → laissé verbatim. La couleuvrine est une
    // ARME octroyée (DM/portée affichés via PER-115, milestone Armures), pas une créature ni une stat.
    richText:
      "L'arquebusier obtient une couleuvrine (un petit canon portatif). Sur un test d'attaque à distance réussi (dé bonus), la couleuvrine inflige [5d4° + INT] DM à une portée de 100 m. Il faut ensuite deux rounds (L) pour la recharger. C'est une arme encombrante et il est impossible de transporter plus d'une couleuvrine.",
    sourcePage: 63,
  },

  // --- Voie des explosifs (p. 63) ---
  {
    id: 'explosifs-r1',
    name: 'Tir de grenaille',
    pathId: 'explosifs',
    rank: 1,
    isSpell: false,
    actionTypes: ['L'],
    text:
      "L'arquebusier sait réaliser un mélange de poudre et de grenaille. Quand il charge une arme à poudre, il peut choisir d'utiliser ce mélange à la place d'une munition normale (il doit l'annoncer au moment où il charge). Lorsqu'il tire cette munition (L), il fait un seul test d'attaque contre toutes les cibles lui faisant face dans un cône de 10 m de long et sur 5 m de large. Toutes les cibles dont il atteint la DEF subissent la moitié des DM habituels. De plus, le personnage ajoute son rang + 2 à tous les tests d'artificier (par exemple pour fabriquer et tirer des feux d'artifice).",
    // Rendu enrichi (PER-71) : « son rang + 2 » → [rang + 2]. Bonus de compétence INCONDITIONNEL
    // au domaine pyrotechnie (pyrotechnics, « tests d'artificier »). Le tir de grenaille en cône et la
    // moitié des DM relèvent du tracker de combat (PER-104/105) → laissés verbatim.
    richText:
      "L'arquebusier sait réaliser un mélange de poudre et de grenaille. Quand il charge une arme à poudre, il peut choisir d'utiliser ce mélange à la place d'une munition normale (il doit l'annoncer au moment où il charge). Lorsqu'il tire cette munition (L), il fait un seul test d'attaque contre toutes les cibles lui faisant face dans un cône de 10 m de long et sur 5 m de large. Toutes les cibles dont il atteint la DEF subissent la moitié des DM habituels. De plus, le personnage ajoute son [rang + 2] à tous les tests d'artificier (par exemple pour fabriquer et tirer des feux d'artifice).",
    effects: [{ kind: 'test-bonus', domains: ['pyrotechnics'] }],
    sourcePage: 63,
  },
  {
    id: 'explosifs-r2',
    name: 'Démolition',
    pathId: 'explosifs',
    rank: 2,
    isSpell: false,
    actionTypes: [],
    text:
      "L'arquebusier peut préparer un explosif qui lui permet de démolir facilement des structures. Il lui faut 3 rounds complets pour préparer et poser son explosif. Celui-ci inflige à la structure [3d4° + INT] DM et ignore la moitié de sa RD (et seulement 2d4° DM dans un rayon de 2 m). Chaque jour, l'arquebusier peut utiliser un nombre de charges explosives égal au rang dans la voie. Ces charges permettent indifféremment d'utiliser les capacités Démolition, Piège explosif ou Boulet explosif.",
    // Rendu enrichi (PER-71) : DM contre la structure [3d4° + INT] ; DM de zone {2d4°} (dé fixe).
    // « nombre de charges égal au rang dans la voie » → [#rang] (terme nommé, déterminant « au »).
    // PER-119 : les charges sont une réserve quotidienne PARTAGÉE entre Démolition (r2), Piège explosif (r4)
    // et Boulet explosif (r5) → un seul `usageCounter` à `maxByPathRank` (max = rang dans la voie, scalant)
    // et `sharedKey: 'explosifs-charges'` (même compteur sur les trois capacités). Réinitialisable au max.
    richText:
      "L'arquebusier peut préparer un explosif qui lui permet de démolir facilement des structures. Il lui faut 3 rounds complets pour préparer et poser son explosif. Celui-ci inflige à la structure [3d4° + INT] DM et ignore la moitié de sa RD (et seulement {2d4°} DM dans un rayon de 2 m). Chaque jour, l'arquebusier peut utiliser un nombre de charges explosives égal au [#rang] dans la voie. Ces charges permettent indifféremment d'utiliser les capacités Démolition, Piège explosif ou Boulet explosif.",
    usageCounter: { maxByPathRank: true, sharedKey: 'explosifs-charges', label: 'Charges explosives' },
    sourcePage: 63,
  },
  {
    id: 'explosifs-r3',
    name: 'Poudre puissante',
    pathId: 'explosifs',
    rank: 3,
    isSpell: false,
    actionTypes: [],
    text:
      "L'arquebusier sait préparer une poudre plus puissante, il ajoute +10 m à la portée et +1 aux DM des armes à poudre. Le bonus aux DM augmente de +1 à chaque fois que le personnage atteint le rang 5 dans une voie d'arquebusier. De plus, sa poudre est magique et elle permet à ses projectiles d'affecter les créatures immunisées aux armes non magiques.",
    // PER-71 : « +1 aux DM des armes à poudre » (scalant +1 par rang 5 cross-voie) modifie le DM d'une
    // ARME → relève de l'affichage des DM d'arme augmentés par capacité (PER-115, milestone Armures). Le
    // +10 m de portée et le caractère « poudre magique » (touche les créatures immunisées aux armes non
    // magiques) accompagnent ce traitement d'arme. Pas d'effet structuré ici ; texte verbatim conservé.
    sourcePage: 63,
  },
  {
    id: 'explosifs-r4',
    name: 'Piège explosif',
    pathId: 'explosifs',
    rank: 4,
    isSpell: false,
    actionTypes: ['L'],
    text:
      "Il faut 1 min à l'arquebusier pour installer un piège qui explose dans un rayon de 5 m en infligeant [5d4° + INT] DM de feu (test d'AGI difficulté 15 pour ne subir que la moitié des DM). Le piège est déclenché à l'intrusion de toute créature dans une zone d'un à deux mètres autour du piège. Une créature peut détecter le piège avec un test d'INT difficulté [15 + INT de l'arquebusier] avant de le déclencher.",
    // Rendu enrichi (PER-71) : DM du piège [5d4° + INT]. La difficulté de détection « [15 + INT de
    // l'arquebusier] » est calculée sur l'INT DU JOUEUR (suffixe « de l'arquebusier » implicite, format
    // §6) → [15 + INT]. La difficulté d'AGI 15 (créature touchée) est une constante → littérale. PER-119 :
    // consomme une charge de la réserve PARTAGÉE de la voie (même `sharedKey` que Démolition/Boulet).
    // Pas d'effet structuré (DM/piège, tracker PER-104/105).
    richText:
      "Il faut 1 min à l'arquebusier pour installer un piège qui explose dans un rayon de 5 m en infligeant [5d4° + INT] DM de feu (test d'AGI difficulté 15 pour ne subir que la moitié des DM). Le piège est déclenché à l'intrusion de toute créature dans une zone d'un à deux mètres autour du piège. Une créature peut détecter le piège avec un test d'INT difficulté [15 + INT] avant de le déclencher.",
    usageCounter: { maxByPathRank: true, sharedKey: 'explosifs-charges', label: 'Charges explosives' },
    sourcePage: 64,
  },
  {
    id: 'explosifs-r5',
    name: 'Boulet explosif',
    pathId: 'explosifs',
    rank: 5,
    isSpell: false,
    actionTypes: ['L'],
    text:
      "L'arquebusier sait fabriquer et lancer de petites boules de métal garnies de poudre et d'une portée de 20 m qui explosent dans un rayon de 5 m en infligeant [4d4° + INT] DM perforants, divisés par 2 pour les victimes qui réussissent un test d'AGI difficulté 10. Ceux qui ratent le test sont de plus aveuglés un round par le flash lumineux de l'explosion.",
    // Rendu enrichi (PER-71) : DM du boulet [4d4° + INT]. PER-119 : consomme une charge de la réserve
    // PARTAGÉE de la voie (même `sharedKey` que Démolition/Piège). DM divisés/état aveuglé : tracker de
    // combat (PER-104/105) → laissés verbatim.
    richText:
      "L'arquebusier sait fabriquer et lancer de petites boules de métal garnies de poudre et d'une portée de 20 m qui explosent dans un rayon de 5 m en infligeant [4d4° + INT] DM perforants, divisés par 2 pour les victimes qui réussissent un test d'AGI difficulté 10. Ceux qui ratent le test sont de plus aveuglés un round par le flash lumineux de l'explosion.",
    usageCounter: { maxByPathRank: true, sharedKey: 'explosifs-charges', label: 'Charges explosives' },
    sourcePage: 64,
  },

  // --- Voie du mercenaire (p. 64) ---
  {
    id: 'mercenaire-r1',
    name: 'Pilier de bar',
    pathId: 'mercenaire',
    rank: 1,
    isSpell: false,
    actionTypes: [],
    text:
      "L'arquebusier obtient un bonus égal à son rang + 2 aux tests d'interaction sociale dans les tavernes ou les auberges (renseignement, négociation, séduction, etc.) ainsi que pour résister aux effets de l'alcool. De plus, il inflige 1d4° DM à mains nues (non létal) et il divise par 2 tous les DM non létaux qu'on lui inflige.",
    // Rendu enrichi (PER-71) : « son rang + 2 » → [rang + 2] ; DM à mains nues {1d4°}. PER-117 : le bonus
    // de compétence social est CONDITIONNEL au lieu (« dans les tavernes ou les auberges ») → conditional-
    // stat-bonus avec testBonusDomains + interrupteur, `bonuses` vide. Domaines : renseignement (fast-talk),
    // négociation (persuasion), séduction (seduction). « résister aux effets de l'alcool » : application
    // situationnelle (résistance CON), non modélisée en domaine → verbatim. La division par 2 des DM non
    // létaux subis n'entre pas dans `DamageReduction` (pas de type « non létal » dans les scopes) → verbatim.
    richText:
      "L'arquebusier obtient un bonus égal à son [rang + 2] aux tests d'interaction sociale dans les tavernes ou les auberges (renseignement, négociation, séduction, etc.) ainsi que pour résister aux effets de l'alcool. De plus, il inflige {1d4°} DM à mains nues (non létal) et il divise par 2 tous les DM non létaux qu'on lui inflige.",
    effects: [
      {
        kind: 'conditional-stat-bonus',
        bonuses: [],
        testBonusDomains: ['fast-talk', 'persuasion', 'seduction'],
        activation: { kind: 'condition', label: 'dans une taverne ou une auberge', activeByDefault: false },
      },
    ],
    sourcePage: 64,
  },
  {
    id: 'mercenaire-r2',
    name: 'Mort ou vif',
    pathId: 'mercenaire',
    rank: 2,
    isSpell: false,
    actionTypes: ['L'],
    text:
      "L'arquebusier effectue une attaque au contact ou à distance (avec l'arme en main). Si l'attaque est réussie, il inflige ses DM habituels (mais peut choisir d'infliger des DM temporaires) et il choisit entre désarmer, renverser ou affaiblir (1d4 rounds) un adversaire dont le NC est inférieur au rang atteint dans la voie. Si l'attaque est une réussite critique, il peut choisir de cumuler deux effets.",
    // Rendu enrichi (PER-71) : durée de l'état affaibli {1d4} rounds ; « inférieur au rang atteint dans la
    // voie » → [#rang] (terme nommé). Le NC de la cible est auto-glossé. Effets de contrôle (désarmer/
    // renverser/affaiblir) : tracker de combat (PER-104/105) → pas d'effet structuré.
    richText:
      "L'arquebusier effectue une attaque au contact ou à distance (avec l'arme en main). Si l'attaque est réussie, il inflige ses DM habituels (mais peut choisir d'infliger des DM temporaires) et il choisit entre désarmer, renverser ou affaiblir ({1d4} rounds) un adversaire dont le NC est inférieur au [#rang] atteint dans la voie. Si l'attaque est une réussite critique, il peut choisir de cumuler deux effets.",
    sourcePage: 64,
  },
  {
    id: 'mercenaire-r3',
    name: 'Combattant aguerri',
    pathId: 'mercenaire',
    rank: 3,
    isSpell: false,
    actionTypes: [],
    text:
      "L'arquebusier choisit une capacité de rang 1 de son choix de guerrier, de voleur (armure de cuir) ou de rôdeur (armure de cuir renforcé). Il gagne aussi +1 en DEF.",
    // PER-71 : « +1 en DEF » PERMANENT (inconditionnel) → stat-bonus def +1. Le choix d'une capacité de
    // rang 1 (guerrier/voleur/rôdeur) est déjà porté par `choices` (feature-from-path). L'accès à l'armure
    // de cuir / cuir renforcé qu'ouvre l'option relève de la milestone Armures (non modélisé ici).
    choices: [
      {
        kind: 'feature-from-path',
        prompt: 'Capacité de rang 1 (guerrier, voleur ou rôdeur)',
        allowedRanks: [1],
        classIds: ['guerrier', 'voleur', 'rodeur'],
      },
    ],
    effects: [{ kind: 'stat-bonus', stat: 'def', value: 1 }],
    sourcePage: 64,
  },
  {
    id: 'mercenaire-r4',
    name: 'Constitution héroïque',
    pathId: 'mercenaire',
    rank: 4,
    isSpell: false,
    actionTypes: [],
    text:
      "L'arquebusier augmente sa valeur de CON de +1 et il obtient un dé bonus aux tests de CON.",
    // Caractéristique héroïque (mécanique core) : +1 CON permanent + dé bonus aux tests de CON.
    effects: [
      { kind: 'ability-bonus', ability: 'CON', value: 1 },
      { kind: 'ability-bonus-die', ability: 'CON' },
    ],
    sourcePage: 64,
  },
  {
    id: 'mercenaire-r5',
    name: 'Combat de masse',
    pathId: 'mercenaire',
    rank: 5,
    isSpell: false,
    actionTypes: [],
    text:
      "Si le combat implique au moins 10 créatures actives (en comptant l'arquebusier et ses alliés), l'arquebusier obtient, au choix, une action d'attaque ou une action de mouvement supplémentaire à son tour. De plus, l'arquebusier gagne +1 en DEF.",
    // PER-71 : l'action supplémentaire (attaque OU mouvement) relève du tracker de combat (PER-104/105)
    // → verbatim. Le « +1 en DEF » est rattaché par « De plus » à la même phrase conditionnelle (combat
    // d'au moins 10 créatures actives) → modélisé en conditional-stat-bonus def +1 avec interrupteur
    // (lecture validée par le propriétaire : entièrement CONDITIONNEL, pas un +1 DEF permanent).
    effects: [
      {
        kind: 'conditional-stat-bonus',
        bonuses: [{ stat: 'def', value: 1 }],
        activation: { kind: 'condition', label: 'combat de masse (≥ 10 créatures actives)', activeByDefault: false },
      },
    ],
    sourcePage: 64,
  },

  // --- Voie du pistolero (p. 64) ---
  {
    id: 'pistolero-r1',
    name: 'Plus vite que son ombre',
    pathId: 'pistolero',
    rank: 1,
    isSpell: false,
    actionTypes: [],
    text:
      "Si son arme à poudre est chargée et tenue en main, l'arquebusier peut tirer avec un bonus de +5 à son Initiative. De plus, il ne subit plus de dé malus lorsqu'il tire avec une arme à poudre ou une arbalète en étant engagé en combat au contact (sauf avec la couleuvrine).",
    // PER-71 / PER-121 : le « +5 à son Initiative » ne s'applique QU'À l'attaque de tir (pas à une action
    // longue ni à un mouvement) → inexprimable comme bonus d'Initiative de fiche (même conditionnel : il
    // fausserait l'Init dès que le perso ne tire pas). Laissé VERBATIM ; le cas « +5 Init seulement si
    // l'action est un tir » est reporté au tracker de combat (PER-121, milestone Rencontres). La
    // suppression du dé malus en tirant engagé au contact relève de l'exception au dé malus (PER-116).
    sourcePage: 64,
  },
  {
    id: 'pistolero-r2',
    name: 'Ajuster le tir',
    pathId: 'pistolero',
    rank: 2,
    isSpell: false,
    actionTypes: [],
    text:
      "Après avoir raté une attaque à distance, l'arquebusier déclare qu'il s'agissait d'un tir de réglage. Il obtient +5 sur le test de sa prochaine attaque à distance, si son prochain tir vise la même cible avant la fin du prochain round.",
    sourcePage: 64,
  },
  {
    id: 'pistolero-r3',
    name: 'Tir double',
    pathId: 'pistolero',
    rank: 3,
    isSpell: false,
    actionTypes: ['L'],
    text:
      "L'arquebusier est capable de tirer simultanément avec une pétoire (ou une arbalète de poing) dans chaque main avec un malus de -2 à chaque attaque. S'il décharge ses deux armes sur la même cible, il ne subit aucun malus.",
    // PER-71 : combat à deux armes à distance (malus de -2, annulé si même cible) → relève de la gestion
    // du dé malus / combat à deux armes (PER-116, milestone Armures). Pas d'effet structuré ; verbatim.
    sourcePage: 64,
  },
  {
    id: 'pistolero-r4',
    name: 'Agilité héroïque',
    pathId: 'pistolero',
    rank: 4,
    isSpell: false,
    actionTypes: [],
    text:
      "L'arquebusier augmente sa valeur d'AGI de +1 et il obtient un dé bonus aux tests d'AGI.",
    // Caractéristique héroïque (mécanique core) : +1 AGI permanent + dé bonus aux tests d'AGI.
    effects: [
      { kind: 'ability-bonus', ability: 'AGI', value: 1 },
      { kind: 'ability-bonus-die', ability: 'AGI' },
    ],
    sourcePage: 64,
  },
  {
    id: 'pistolero-r5',
    name: 'As de la gâchette',
    pathId: 'pistolero',
    rank: 5,
    isSpell: false,
    actionTypes: [],
    text:
      "Lors d'une attaque à distance avec une arme à poudre ou une arbalète, s'il obtient un résultat d'attaque supérieur ou égal à la DEF de son adversaire +10 points, l'arquebusier obtient un bonus de +2d4° aux DM de son attaque.",
    // Rendu enrichi (PER-71) : bonus aux DM {2d4°}. Bonus SITUATIONNEL (seuil de réussite ≥ DEF + 10 sur un
    // tir) → pas d'effet permanent (calqué sur le barde escrime-r5/saltimbanque, même structure de seuil).
    richText:
      "Lors d'une attaque à distance avec une arme à poudre ou une arbalète, s'il obtient un résultat d'attaque supérieur ou égal à la DEF de son adversaire +10 points, l'arquebusier obtient un bonus de +{2d4°} aux DM de son attaque.",
    sourcePage: 64,
  },

  // --- Voie de la précision (p. 65) ---
  {
    id: 'precision-r1',
    name: 'Joli coup',
    pathId: 'precision',
    rank: 1,
    isSpell: false,
    actionTypes: [],
    text:
      "L'arquebusier ignore la pénalité appliquée pour une couverture partielle de sa cible (-2 au test devient aucun malus) et réduit la pénalité pour une couverture importante à -2 (au lieu de -5).",
    sourcePage: 65,
  },
  {
    id: 'precision-r2',
    name: 'Défaut dans la cuirasse',
    pathId: 'precision',
    rank: 2,
    isSpell: false,
    actionTypes: ['A'],
    text:
      "L'arquebusier utilise une action d'attaque pour trouver le point faible de son adversaire et le viser. Au prochain round*, il réalise ses attaques à distance sur cette cible contre une DEF de [10 + AGI de la cible] et il peut ignorer sa résistance aux DM ou sa réduction des DM (sauf si cette dernière est acquise parce que la cible est immatérielle : ombre, fantôme, etc.).\n* Si l'arquebusier utilise la capacité Combat de masse pour son action d'attaque en début de round, alors la capacité s'applique seulement aux tirs du round en cours.",
    // Rendu enrichi (PER-71) : la DEF visée se calcule sur l'AGI de la CIBLE (stat d'autrui, format §5)
    // → NE PAS évaluer : @AGI en référence, « 10 + » et « de la cible » restent littéraux (pas de [...]
    // qui calculerait contre le joueur). Le contournement de RD/résistance relève du tracker (PER-104/105).
    // PER-122 : le renvoi « * » de bas de capacité est CONSERVÉ dans le texte (verbatim et richText) et
    // rendu en NOTE (petit/gris) par `splitNotes`/`NoteSpan`, comme les « Note : » — pas de duplication.
    richText:
      "L'arquebusier utilise une action d'attaque pour trouver le point faible de son adversaire et le viser. Au prochain round*, il réalise ses attaques à distance sur cette cible contre une DEF de 10 + @AGI de la cible et il peut ignorer sa résistance aux DM ou sa réduction des DM (sauf si cette dernière est acquise parce que la cible est immatérielle : ombre, fantôme, etc.).\n* Si l'arquebusier utilise la capacité Combat de masse pour son action d'attaque en début de round, alors la capacité s'applique seulement aux tirs du round en cours.",
    sourcePage: 65,
  },
  {
    id: 'precision-r3',
    name: 'Tir précis',
    pathId: 'precision',
    rank: 3,
    isSpell: false,
    actionTypes: [],
    text:
      "L'arquebusier inflige des critiques sur 19-20 sur ses attaques avec une arme à distance. La plage de critique passe à 18-20 à partir du rang 5.",
    // PER-133 : élargissement de la plage de critique à DISTANCE, SCALANT (19-20, puis 18-20 au rang 5
    // de la voie). Inconditionnel (capacité passive) → toujours actif. Affiché en puce sous la carte
    // Attaque à distance (donnée informative, non lue par le moteur). La montée par palier reste aussi
    // décrite en prose (verbatim conservé).
    criticalRange: {
      scope: 'ranged',
      value: {
        scale: 'stepped',
        by: 'path-rank',
        steps: [
          { min: 1, value: 1 },
          { min: 5, value: 2 },
        ],
      },
    },
    sourcePage: 65,
  },
  {
    id: 'precision-r4',
    name: "Tireur d'élite",
    pathId: 'precision',
    rank: 4,
    isSpell: false,
    actionTypes: ['L'],
    text:
      "L'arquebusier prend le temps d'ajuster une cible au loin (distance minimum de 10 m). Il double la portée de son arme et ajoute +2d4° aux DM. Il ne peut pas utiliser cette capacité s'il est au contact d'un adversaire ou dans une position instable (par exemple dans un véhicule).",
    // Rendu enrichi (PER-71) : bonus aux DM {2d4°}. Bonus SITUATIONNEL (tir ajusté, action limitée, hors
    // contact) → pas d'effet permanent. Le doublement de portée accompagne le traitement d'arme.
    richText:
      "L'arquebusier prend le temps d'ajuster une cible au loin (distance minimum de 10 m). Il double la portée de son arme et ajoute +{2d4°} aux DM. Il ne peut pas utiliser cette capacité s'il est au contact d'un adversaire ou dans une position instable (par exemple dans un véhicule).",
    sourcePage: 65,
  },
  {
    id: 'precision-r5',
    name: 'Tir fatal',
    pathId: 'precision',
    rank: 5,
    isSpell: false,
    actionTypes: ['L'],
    text:
      "S'il tire sur une créature dont le niveau (NC) est inférieur à la moitié du sien (arrondi au supérieur), l'arquebusier peut faire un test d'INT difficulté [10 + NC de la créature]. En cas de réussite, elle est morte. Dans tous les autres cas, elle subit les DM normaux.",
    // Rendu enrichi (PER-71) : la difficulté « [10 + NC de la créature] » dépend du NC de la CIBLE (stat
    // d'autrui, format §5) → NE PAS évaluer : « 10 + NC de la créature » littéral (NC auto-glossé). « la
    // moitié du sien » (demi-niveau du joueur) reste en prose. Mise à mort : tracker de combat (PER-104/105).
    richText:
      "S'il tire sur une créature dont le niveau (NC) est inférieur à la moitié du sien (arrondi au supérieur), l'arquebusier peut faire un test d'INT difficulté 10 + NC de la créature. En cas de réussite, elle est morte. Dans tous les autres cas, elle subit les DM normaux.",
    sourcePage: 65,
  },

  // ======================= BARDE ========================================
  // --- Voie de l'escrime (p. 66) ---
  {
    id: 'escrime-r1',
    name: 'Précision',
    pathId: 'escrime',
    rank: 1,
    isSpell: false,
    actionTypes: [],
    text:
      "Le barde peut remplacer sa FOR par son AGI pour ses tests d'attaque au contact (mais pas aux DM) lorsqu'il emploie une arme légère à une main (les armes légères sont la dague, l'épée courte et la rapière).",
    sourcePage: 66,
  },
  {
    id: 'escrime-r2',
    name: 'Feinte',
    pathId: 'escrime',
    rank: 2,
    isSpell: false,
    actionTypes: ['L'],
    text:
      "Le barde effectue une attaque fictive pour déséquilibrer son adversaire et réalise ensuite une attaque mortelle. Faites un test opposé de CHA contre la PER de votre adversaire à ce round. Au round suivant, vous obtenez un bonus en attaque égal au double de votre rang dans la voie de l'escrime (+4 au rang 2, par exemple) sur votre première attaque au contact contre cet adversaire et, si votre feinte a réussi, +2d4° aux DM.",
    // Rendu enrichi (PER-71) : @PER est la stat de la CIBLE (non calculée) ; bonus aux
    // DM {2d4°}. Le « double de votre rang (+4 au rang 2) » est un palier décrit en
    // prose (avec son exemple) → laissé littéral (cf. rich-text-format.md § 7).
    richText:
      "Le barde effectue une attaque fictive pour déséquilibrer son adversaire et réalise ensuite une attaque mortelle. Faites un test opposé de CHA contre la @PER de votre adversaire à ce round. Au round suivant, vous obtenez un bonus en attaque égal au double de votre rang dans la voie de l'escrime (+4 au rang 2, par exemple) sur votre première attaque au contact contre cet adversaire et, si votre feinte a réussi, +{2d4°} aux DM.",
    sourcePage: 66,
  },
  {
    id: 'escrime-r3',
    name: 'Intelligence du combat',
    pathId: 'escrime',
    rank: 3,
    isSpell: false,
    actionTypes: ['M'],
    text:
      "Une fois par combat, le barde peut au choix désarmer, renverser ou aveugler pour une durée de 1 round un adversaire dont le NC est inférieur au sien en emportant un test opposé d'INT. S'il a réussi une feinte contre cet adversaire à son tour précédent, il bénéficie d'un bonus de +5 au test d'INT.",
    // « Une fois par combat » → compteur réinitialisé au repos court (PER-73/151).
    usageCounter: { max: 1, resetOn: 'combat', hideFromStatusPanel: true },
    sourcePage: 66,
  },
  {
    id: 'escrime-r4',
    name: 'Attaque flamboyante',
    pathId: 'escrime',
    rank: 4,
    isSpell: false,
    actionTypes: ['L'],
    text:
      "Le style de combat du barde est flamboyant et surprenant : Il effectue une attaque de contact avec une arme légère et obtient un bonus d'attaque et de DM égal à son CHA (en plus de sa FOR ou de son AGI).",
    // Rendu enrichi (PER-71) : bonus d'attaque et de DM = [CHA]. Bonus SITUATIONNEL
    // (attaque au contact à l'arme légère, action limitée) → pas d'effet permanent.
    richText:
      "Le style de combat du barde est flamboyant et surprenant : Il effectue une attaque de contact avec une arme légère et obtient un bonus d'attaque et de DM égal à son [CHA] (en plus de sa FOR ou de son AGI).",
    sourcePage: 66,
  },
  {
    id: 'escrime-r5',
    name: 'Botte mortelle',
    pathId: 'escrime',
    rank: 5,
    isSpell: false,
    actionTypes: [],
    text:
      "Lors d'une attaque au contact avec une arme légère, s'il obtient un résultat d'attaque supérieur ou égal à (la DEF de son adversaire + 10 points), le barde obtient un bonus de +2d4° aux DM de son attaque (les dés bonus ne sont jamais multipliés en cas de critique).",
    // Rendu enrichi (PER-71) : bonus aux DM {2d4°}. « DEF de son adversaire » = stat de
    // la cible (auto-détectée comme stat dérivée, non calculée contre le joueur).
    richText:
      "Lors d'une attaque au contact avec une arme légère, s'il obtient un résultat d'attaque supérieur ou égal à (la DEF de son adversaire + 10 points), le barde obtient un bonus de +{2d4°} aux DM de son attaque (les dés bonus ne sont jamais multipliés en cas de critique).",
    sourcePage: 66,
  },

  // --- Voie du musicien (p. 67) ---
  {
    id: 'musicien-r1',
    name: 'Chant des héros',
    pathId: 'musicien',
    rank: 1,
    isSpell: true,
    actionTypes: ['L'],
    text:
      "Le barde peut chanter et inspirer ses compagnons, tous ses alliés à portée de voix et lui obtiennent un bonus de +1 à tous leurs tests pendant un nombre de minutes égal à sa valeur de CHA. Pendant toute la durée du sort, il fredonne (action gratuite qui ne l'empêche pas de lancer d'autres sorts de barde). Le bonus passe à +2 au rang 5. En plus de ce sort, le barde ajoute son rang + 2 aux tests pour jouer d'un instrument de musique ou chanter.",
    // Rendu enrichi (PER-71) : durée « égal à sa valeur de [#CHA] » (substantif) ;
    // « son [rang + 2] » aux tests de musique. Effets : (1) bonus de compétence permanent
    // en musique (PER-89) ; (2) buff TEMPORAIRE « +1 à tous leurs tests » (→ +2 au rang 5)
    // sur le BARDE — un interrupteur, tests de carac via `abilityTestBonus` + les trois
    // jets d'attaque (gabarit Bénédiction, priere-r1). Le +1 aux ALLIÉS reste hors
    // périmètre (fiche mono-perso) → verbatim. Coût de mana = rang (pas de dérogation).
    richText:
      "Le barde peut chanter et inspirer ses compagnons, tous ses alliés à portée de voix et lui obtiennent un bonus de +1 à tous leurs tests pendant un nombre de minutes égal à sa valeur de [#CHA]. Pendant toute la durée du sort, il fredonne (action gratuite qui ne l'empêche pas de lancer d'autres sorts de barde). Le bonus passe à +2 au rang 5. En plus de ce sort, le barde ajoute son [rang + 2] aux tests pour jouer d'un instrument de musique ou chanter.",
    effects: [
      { kind: 'test-bonus', domains: ['music'] },
      {
        kind: 'conditional-stat-bonus',
        bonuses: [
          { stat: 'meleeAttack', value: STEP_1_THEN_2_AT_R5 },
          { stat: 'rangedAttack', value: STEP_1_THEN_2_AT_R5 },
          { stat: 'magicAttack', value: STEP_1_THEN_2_AT_R5 },
        ],
        abilityTestBonus: STEP_1_THEN_2_AT_R5,
        activation: { kind: 'temporary', label: 'Chant des héros actif (CHA min)', activeByDefault: false },
      },
    ],
    sourcePage: 67,
  },
  {
    id: 'musicien-r2',
    name: 'Chant de réconfort',
    pathId: 'musicien',
    rank: 2,
    isSpell: true,
    actionTypes: ['L'],
    text:
      "Le barde chante ou joue de la musique pendant toute la durée d'une récupération rapide (30 min). Le barde et ses alliés dans un rayon de 10 m, récupèrent 1d4° PV. Les soins passent à 2d4° au rang 4.",
    // Rendu enrichi (PER-71) : soins {1d4°|2@4} — le nombre de dés passe à 2 au rang 4
    // de la voie (palier IN-VOIE). La phrase de palier passe en Note (PER-99). Coût mana = rang.
    richText:
      "Le barde chante ou joue de la musique pendant toute la durée d'une récupération rapide (30 min). Le barde et ses alliés dans un rayon de 10 m, récupèrent {1d4°|2@4} PV.\nNote : Les soins passent à 2d4° au rang 4.",
    sourcePage: 67,
  },
  {
    id: 'musicien-r3',
    name: 'Attaque sonore',
    pathId: 'musicien',
    rank: 3,
    isSpell: true,
    actionTypes: ['A'],
    text:
      "Le barde pousse un cri dont les effets sont dévastateurs (ou produit un son avec un instrument à cette même fin). Il inflige [2d4° + CHA] DM à toutes les cibles dans un cône de 10 m (de long et de large). Les cibles peuvent diviser les DM par 2 si elles réussissent un test de CON difficulté [10 + CHA du barde].",
    // Rendu enrichi (PER-71) : DM [2d4° + CHA] ; difficulté du test de CON (des cibles)
    // [10 + CHA] — CHA du barde (joueur), suffixe « du barde » implicite retiré (§ 6).
    richText:
      "Le barde pousse un cri dont les effets sont dévastateurs (ou produit un son avec un instrument à cette même fin). Il inflige [2d4° + CHA] DM à toutes les cibles dans un cône de 10 m (de long et de large). Les cibles peuvent diviser les DM par 2 si elles réussissent un test de CON difficulté [10 + CHA].",
    sourcePage: 67,
  },
  {
    id: 'musicien-r4',
    name: 'Zone de silence',
    pathId: 'musicien',
    rank: 4,
    isSpell: true,
    actionTypes: ['A'],
    text:
      "Le barde crée une zone de silence fixe de 5 m de diamètre, jusqu'à une portée de 30 m, pendant un nombre de minutes égal à sa valeur de CHA. Tous les sons émis dans cette sphère sont annulés. Dans cette zone, il faut réussir un test d'INT difficulté 10 pour lancer un sort.",
    // Rendu enrichi (PER-71) : durée « égal à sa valeur de [#CHA] » (substantif). Coût mana = rang.
    richText:
      "Le barde crée une zone de silence fixe de 5 m de diamètre, jusqu'à une portée de 30 m, pendant un nombre de minutes égal à sa valeur de [#CHA]. Tous les sons émis dans cette sphère sont annulés. Dans cette zone, il faut réussir un test d'INT difficulté 10 pour lancer un sort.",
    sourcePage: 67,
  },
  {
    id: 'musicien-r5',
    name: 'Danse irrésistible',
    pathId: 'musicien',
    rank: 5,
    isSpell: true,
    actionTypes: ['A'],
    text:
      "Le barde joue une gigue endiablée aux effets magiques. S'il réussit un test d'attaque magique opposé contre sa cible (portée 10 m), celle-ci se met à danser pendant [1d4° + CHA] rounds, elle subit un dé malus aux tests d'attaque et -5 en DEF. Si la cible est d'un niveau (NC) supérieur ou égal au barde, elle ne danse qu'un seul round.",
    // Rendu enrichi (PER-71) : durée [1d4° + CHA] rounds. « -5 en DEF » porte sur la
    // cible (DEF auto-détectée, non calculée). Coût mana = rang.
    richText:
      "Le barde joue une gigue endiablée aux effets magiques. S'il réussit un test d'attaque magique opposé contre sa cible (portée 10 m), celle-ci se met à danser pendant [1d4° + CHA] rounds, elle subit un dé malus aux tests d'attaque et -5 en DEF. Si la cible est d'un niveau (NC) supérieur ou égal au barde, elle ne danse qu'un seul round.",
    sourcePage: 67,
  },

  // --- Voie du saltimbanque (p. 67) ---
  {
    id: 'saltimbanque-r1',
    name: 'Acrobate',
    pathId: 'saltimbanque',
    rank: 1,
    isSpell: false,
    actionTypes: [],
    text:
      "Le barde ajoute son rang + 2 à tous les tests qu'il effectue pour réaliser des acrobaties, tenir en équilibre, faire des sauts ou de l'escalade.",
    // Rendu enrichi (PER-71) : « son [rang + 2] » aux tests. Bonus de compétence (PER-89)
    // aux domaines nommés : acrobaties (équilibre inclus), saut, escalade.
    richText:
      "Le barde ajoute son [rang + 2] à tous les tests qu'il effectue pour réaliser des acrobaties, tenir en équilibre, faire des sauts ou de l'escalade.",
    effects: [{ kind: 'test-bonus', domains: ['acrobatics', 'jumping', 'climbing'] }],
    sourcePage: 67,
  },
  {
    id: 'saltimbanque-r2',
    name: 'Grâce féline',
    pathId: 'saltimbanque',
    rank: 2,
    isSpell: false,
    actionTypes: [],
    text:
      "Le barde gagne son CHA en Initiative et +1 en DEF (+2 au rang 4). De plus, le barde ajoute son rang + 2 aux tests de danse, de mime ou de jonglerie.",
    // Rendu enrichi (PER-71) : « son [rang + 2] » aux tests. Effets : +CHA permanent en
    // Initiative (`stat-bonus` scalant sur le CHA), +1 DEF → +2 au rang 4 (palier de voie),
    // et bonus de compétence (PER-89) en danse/mime/jonglerie. « son CHA en Initiative »
    // auto-détecté (puce de carac) ; le palier +1/+2 reste en prose.
    richText:
      "Le barde gagne son CHA en Initiative et +1 en DEF (+2 au rang 4). De plus, le barde ajoute son [rang + 2] aux tests de danse, de mime ou de jonglerie.",
    effects: [
      { kind: 'stat-bonus', stat: 'initiative', value: { scale: 'ability', ability: 'CHA' } },
      {
        kind: 'stat-bonus',
        stat: 'def',
        value: { scale: 'stepped', by: 'path-rank', steps: [{ min: 1, value: 1 }, { min: 4, value: 2 }] },
      },
      { kind: 'test-bonus', domains: ['dance', 'mime', 'juggling'] },
    ],
    sourcePage: 68,
  },
  {
    id: 'saltimbanque-r3',
    name: 'Lanceur de couteau',
    pathId: 'saltimbanque',
    rank: 3,
    isSpell: false,
    actionTypes: ['G'],
    text:
      "Une fois par round, en plus de ses autres actions, le barde peut lancer un couteau sur une cible à distance (portée 10 m) en réussissant un test d'attaque à distance. Cette attaque occasionne [1d4 + AGI] DM. Il peut exécuter cette action sans pénalité, même s'il est engagé en combat au contact avec un autre adversaire. Les DM passent à 1d4° au rang 5.",
    // Rendu enrichi (PER-71 + PER-100) : DM [1d4|1d4°@5 + AGI] — le dé est fixe (1d4) aux
    // rangs 1-4 puis DEVIENT évolutif (1d4°) au rang 5 (palier de dé complet portant le
    // marqueur évolutif `°`). La phrase de palier passe en Note.
    richText:
      "Une fois par round, en plus de ses autres actions, le barde peut lancer un couteau sur une cible à distance (portée 10 m) en réussissant un test d'attaque à distance. Cette attaque occasionne [1d4|1d4°@5 + AGI] DM. Il peut exécuter cette action sans pénalité, même s'il est engagé en combat au contact avec un autre adversaire.\nNote : Les DM passent à 1d4° au rang 5.",
    sourcePage: 68,
  },
  {
    id: 'saltimbanque-r4',
    name: "Liberté d'action",
    pathId: 'saltimbanque',
    rank: 4,
    isSpell: false,
    actionTypes: [],
    text:
      "Le barde est immunisé à la peur et à tous les sorts qui asservissent l'esprit (possession, charme), il est immunisé aux états ralenti et immobilisé.",
    // PER-103 : immunités permanentes → effet `immunity`, agrégé dans l'encadré « Immunités ».
    // « sorts qui asservissent l'esprit (possession, charme) » → mind-control.
    effects: [{ kind: 'immunity', immunities: ['fear', 'mind-control', 'slowed', 'immobilized'] }],
    sourcePage: 68,
  },
  {
    id: 'saltimbanque-r5',
    name: 'Esquive acrobatique',
    pathId: 'saltimbanque',
    rank: 5,
    isSpell: false,
    actionTypes: ['G'],
    text:
      "Une fois par round, le barde peut réaliser une esquive en réussissant un test d'attaque à distance contre une difficulté égale au résultat obtenu par son adversaire, lors de son attaque. En cas de réussite, le barde ne subit aucun DM. Si cette attaque était un critique, il subit tout de même des DM normaux (il annule donc l'effet critique « dommages doublés »).",
    sourcePage: 68,
  },

  // --- Voie de la séduction (p. 68) ---
  {
    id: 'seduction-r1',
    name: 'Charmant',
    pathId: 'seduction',
    rank: 1,
    isSpell: false,
    actionTypes: [],
    text:
      "Le barde ajoute son rang + 2 aux tests effectués pour séduire, convaincre, mentir ou baratiner. Désormais, il peut dépenser 1 point de chance pour améliorer l'action d'un compagnon en vue, ce PC permet d'ajouter [1d4° + CHA] sur le résultat du test (au lieu de +10).",
    // Rendu enrichi (PER-71) : « son [rang + 2] » ; aide d'un compagnon [1d4° + CHA].
    // Bonus de compétence (PER-89) : séduction, persuasion (convaincre), mensonge, baratin.
    richText:
      "Le barde ajoute son [rang + 2] aux tests effectués pour séduire, convaincre, mentir ou baratiner. Désormais, il peut dépenser 1 point de chance pour améliorer l'action d'un compagnon en vue, ce PC permet d'ajouter [1d4° + CHA] sur le résultat du test (au lieu de +10).",
    effects: [{ kind: 'test-bonus', domains: ['seduction', 'persuasion', 'deception', 'fast-talk'] }],
    sourcePage: 68,
  },
  {
    id: 'seduction-r2',
    name: 'Dentelles et rapière',
    pathId: 'seduction',
    rank: 2,
    isSpell: false,
    actionTypes: [],
    text:
      "Le barde ne met pas d'armure, cela ne sied point en société. Sa seule armure est la dentelle, sa seule défense, la rapière. Lorsqu'il ne porte aucune armure, le barde ajoute son CHA en DEF (en plus de son AGI), toutefois ce bonus ne peut pas dépasser le rang atteint dans la voie.",
    // PER-71 (#6) — règle ajoutée « bêtement » : bonus de DEF CONDITIONNEL (« aucune armure »,
    // interrupteur manuel) valant le CHA. Le PLAFOND par le rang (min(CHA, rang)) et le branchement
    // sur le PORT EFFECTIF d'armure sont DIFFÉRÉS à PER-106 (milestone Armures) — les valeurs
    // scalantes actuelles n'ont pas de `min`, et la détection d'armure portée relève de cette
    // milestone. Tant que le plafond n'est pas posé, le bonus = CHA (surévalué si CHA > rang).
    effects: [
      {
        kind: 'conditional-stat-bonus',
        bonuses: [{ stat: 'def', value: { scale: 'ability', ability: 'CHA' } }],
        activation: { kind: 'condition', label: 'aucune armure portée', activeByDefault: false },
      },
    ],
    wip: "Bonus de DEF (CHA) à plafonner par min(CHA, rang) et à conditionner au PORT EFFECTIF d'armure — plafond non posé (valeur surévaluée si CHA > rang) et détection automatique différés à la milestone Armures (PER-106).",
    sourcePage: 68,
  },
  {
    id: 'seduction-r3',
    name: 'Baratineur de génie',
    pathId: 'seduction',
    rank: 3,
    isSpell: false,
    actionTypes: [],
    text:
      "Si le barde peut passer 10 minutes avec un humanoïde dont le niveau est inférieur ou égal à 1 (NC 1), il peut dépenser un 1 PC pour le charmer. La cible répond favorablement à vos requêtes dans la limite de ce que ferait un ami et ce lien peut se renforcer avec le temps. Si vous ne partagez pas une langue commune, cela vous coûte 2 PC.",
    sourcePage: 68,
  },
  {
    id: 'seduction-r4',
    name: 'Charisme héroïque',
    pathId: 'seduction',
    rank: 4,
    isSpell: false,
    actionTypes: [],
    text:
      "Le barde augmente sa valeur de CHA de +1. Désormais, il obtient un dé bonus aux tests de CHA. De plus, le barde peut désormais utiliser son CHA au lieu de sa VOL pour calculer le nombre de PM dont il dispose.",
    // Caractéristique héroïque : +1 CHA permanent + dé bonus aux tests de CHA.
    // PER-101 : « utiliser son CHA au lieu de sa VOL pour les PM » → `mana-ability-override`
    // (le moteur retient la meilleure de VOL/CHA pour la réserve de PM, cf. manaCastingAbility).
    effects: [
      { kind: 'ability-bonus', ability: 'CHA', value: 1 },
      { kind: 'ability-bonus-die', ability: 'CHA' },
      { kind: 'mana-ability-override', ability: 'CHA' },
    ],
    sourcePage: 68,
  },
  {
    id: 'seduction-r5',
    name: 'Suggestion',
    pathId: 'seduction',
    rank: 5,
    isSpell: true,
    actionTypes: ['A'],
    text:
      "Le barde peut suggérer une action à une créature en réussissant un test opposé d'attaque magique. En cas de réussite, la créature fera tout son possible pour satisfaire cette demande pendant 1 heure ou jusqu'à avoir réussi. Elle évitera les actions suicidaires (ce qui lui donnerait immédiatement un test d'INT difficulté 10 pour échapper au sort). Le sort ne peut pas affecter une créature de niveau supérieur ou égal à celui du lanceur.",
    sourcePage: 68,
  },

  // --- Voie du vagabond (p. 68) ---
  {
    id: 'vagabond-r1',
    name: 'Rumeurs et légendes',
    pathId: 'vagabond',
    rank: 1,
    isSpell: false,
    actionTypes: [],
    text:
      "À force de voyager, le barde possède une culture générale très vaste, il ajoute son rang + 2 aux tests d'INT pour se « souvenir » d'une information historique, politique, géographique ou occulte ou encore pour identifier un objet magique difficulté (25 – (2 x niveau de magie de l'objet)).",
    // Rendu enrichi (PER-71) : « son [rang + 2] ». La difficulté « 25 – 2 × niveau de magie
    // de l'objet » dépend de l'OBJET (pas du joueur) → littéral. Bonus de compétence (PER-89) :
    // savoirs (connaissances) + érudition occulte. L'identification d'objet magique est une
    // application situationnelle → non modélisée en domaine.
    richText:
      "À force de voyager, le barde possède une culture générale très vaste, il ajoute son [rang + 2] aux tests d'INT pour se « souvenir » d'une information historique, politique, géographique ou occulte ou encore pour identifier un objet magique difficulté (25 – (2 x niveau de magie de l'objet)).",
    effects: [{ kind: 'test-bonus', domains: ['knowledge', 'occult-lore'] }],
    sourcePage: 68,
  },
  {
    id: 'vagabond-r2',
    name: 'Éclectique',
    pathId: 'vagabond',
    rank: 2,
    isSpell: false,
    actionTypes: [],
    text:
      "Le barde obtient un bonus de +1 à tous les tests de compétence (absolument tous, de se cacher dans les ombres jusqu'à forger une épée, en passant par traduire une langue ancienne). Ce bonus ne peut se cumuler à aucun autre bonus de compétence sauf celui du rang 1 de la voie de peuple. Il augmente de +1 chaque fois qu'il atteint le rang 4 dans une voie de barde.",
    // PER-102 : bonus de compétence UNIVERSEL → effet `universal-test-bonus`. Valeur = 1
    // (base) + nb de voies de barde au rang 4 (5 voies → +6). NE se cumule PAS avec les
    // bonus de profil/prestige (prime au MAX : le plus élevé l'emporte), SE cumule avec le
    // peuple. Cf. universalTestBonus / testBonusSources.
    effects: [{ kind: 'universal-test-bonus', scaleByPathsAtRank: { classId: 'barde', rank: 4 } }],
    sourcePage: 69,
  },
  {
    id: 'vagabond-r3',
    name: 'Attirail',
    pathId: 'vagabond',
    rank: 3,
    isSpell: false,
    actionTypes: [],
    text:
      "Le barde possède toutes sortes de choses dans son sac ou ses poches. En dépensant 1 PC, il peut sortir un objet improbable qu'il avait sur lui, mais qui n'est pas inscrit sur sa fiche de PJ, par exemple un livre de poésie, une bouteille d'un excellent vin, un jouet pour enfant, un os pour le chien, une lettre de recommandation, etc. (pour une valeur maximale de 10 pa). Il peut aussi bricoler un objet avec trois bouts de ficelles et un clou (système D).",
    sourcePage: 69,
  },
  {
    id: 'vagabond-r4',
    name: 'Compréhension des langues',
    pathId: 'vagabond',
    rank: 4,
    isSpell: true,
    actionTypes: ['A'],
    text:
      "Ce sort permet au barde de lire, écrire et parler une langue vivante étrangère. Le sort a une durée maximale de CHA heures, mais il peut aussi être lancé sur un allié au contact et dans ce cas, il ne dure que CHA minutes. À partir du rang 5, il peut aussi déchiffrer une inscription dans une langue morte.",
    // Rendu enrichi (PER-71) : durées en quantités brutes [=CHA] heures / [=CHA] minutes. Coût mana = rang.
    richText:
      "Ce sort permet au barde de lire, écrire et parler une langue vivante étrangère. Le sort a une durée maximale de [=CHA] heures, mais il peut aussi être lancé sur un allié au contact et dans ce cas, il ne dure que [=CHA] minutes. À partir du rang 5, il peut aussi déchiffrer une inscription dans une langue morte.",
    sourcePage: 69,
  },
  {
    id: 'vagabond-r5',
    name: 'Déguisement',
    pathId: 'vagabond',
    rank: 5,
    isSpell: true,
    actionTypes: ['A'],
    text:
      "Ce sort permet au barde de prendre l'apparence de n'importe quelle humanoïde de taille à peu près équivalente (avec une marge d'environ 50 cm). S'il veut imiter une personne en particulier, il lui faudra réussir un test de CHA difficulté 15 (20 s'il ne la connaît pas mais l'a seulement vue, 10 s'il la connaît très bien). Le sort a une durée maximale de CHA heures, mais il peut aussi être lancé sur un allié au contact et dans ce cas, il ne dure que CHA minutes.",
    // Rendu enrichi (PER-71) : durées [=CHA] heures / [=CHA] minutes. « test de CHA difficulté
    // 15 » : CHA du joueur (auto-détecté), difficulté littérale. Sort de déguisement MAGIQUE —
    // distinct de la compétence `disguise` (assassin-r1). Coût mana = rang.
    richText:
      "Ce sort permet au barde de prendre l'apparence de n'importe quelle humanoïde de taille à peu près équivalente (avec une marge d'environ 50 cm). S'il veut imiter une personne en particulier, il lui faudra réussir un test de CHA difficulté 15 (20 s'il ne la connaît pas mais l'a seulement vue, 10 s'il la connaît très bien). Le sort a une durée maximale de [=CHA] heures, mais il peut aussi être lancé sur un allié au contact et dans ce cas, il ne dure que [=CHA] minutes.",
    sourcePage: 69,
  },

  // ======================= RÔDEUR =======================================
  // --- Voie de l'archer (p. 70) ---
  {
    id: 'archer-r1',
    name: 'Archer émérite',
    pathId: 'archer',
    rank: 1,
    isSpell: false,
    actionTypes: [],
    text:
      "Le rôdeur ajoute sa PER aux DM qu'il inflige à l'arc et +1 par rang dans la voie en initiative. Le joueur peut souhaiter une variante de cette capacité s'appliquant aux armes de jet (dague, hachette, javelot) plutôt qu'à l'arc (rebaptisez-la voie du lancer). Dans ce cas, le PJ ajoute sa FOR aux DM qu'il inflige et double la portée de jet (pas de bonus d'Init.). Par ailleurs, toutes les capacités de la voie qui suivent s'appliquent aux armes de jet plutôt qu'à l'arc.",
    // Rendu enrichi (PER-71) : « sa PER aux DM » = modificateur de DM (à l'arc) → [PER]. La
    // variante « voie du lancer » (FOR aux DM, pas de bonus d'Init.) reste en prose littérale
    // (build alternatif, non actif). Effet : « +1 par rang dans la voie en initiative » est un
    // bonus PERMANENT de l'archétype arc (la variante du lancer l'annule explicitement) →
    // `stat-bonus` à l'initiative, scalant par rang de voie hôte (+N au rang N). La montée par
    // rang reste décrite en prose (format §7). Le +PER aux DM n'est pas une stat dérivée → pas d'effet.
    richText:
      "Le rôdeur ajoute sa [PER] aux DM qu'il inflige à l'arc et +1 par rang dans la voie en initiative. Le joueur peut souhaiter une variante de cette capacité s'appliquant aux armes de jet (dague, hachette, javelot) plutôt qu'à l'arc (rebaptisez-la voie du lancer). Dans ce cas, le PJ ajoute sa FOR aux DM qu'il inflige et double la portée de jet (pas de bonus d'Init.). Par ailleurs, toutes les capacités de la voie qui suivent s'appliquent aux armes de jet plutôt qu'à l'arc.",
    effects: [
      {
        kind: 'stat-bonus',
        stat: 'initiative',
        value: {
          scale: 'stepped',
          by: 'path-rank',
          steps: [
            { min: 1, value: 1 },
            { min: 2, value: 2 },
            { min: 3, value: 3 },
            { min: 4, value: 4 },
            { min: 5, value: 5 },
          ],
        },
      },
    ],
    sourcePage: 70,
  },
  {
    id: 'archer-r2',
    name: 'Tir chirurgical',
    pathId: 'archer',
    rank: 2,
    isSpell: false,
    actionTypes: [],
    text:
      "Le rôdeur peut tirer sur une cible engagée en mêlée sans pénalité (mais pas sur une cible à couvert). Il ne risque jamais de toucher un allié, même en cas d'échec critique.",
    sourcePage: 70,
  },
  {
    id: 'archer-r3',
    name: 'Dans le mille',
    pathId: 'archer',
    rank: 3,
    isSpell: false,
    actionTypes: [],
    text:
      "Pour une attaque à distance, le rôdeur peut choisir de s'imposer un dé malus en attaque. Si elle est réussie, il ajoute 2d4° aux DM. Cette capacité peut être utilisée avec Tir rapide ou Flèche de mort par exemple. Transformez cette capacité en action limitée (L) pour obtenir +3d4° aux DM au lieu de 2d4°.",
    // Rendu enrichi (PER-71) : bonus aux DM {2d4°} (mode standard) et {3d4°} (mode action
    // limitée). Le rappel « au lieu de 2d4° » reste en prose. Bonus SITUATIONNEL → pas d'effet.
    richText:
      "Pour une attaque à distance, le rôdeur peut choisir de s'imposer un dé malus en attaque. Si elle est réussie, il ajoute {2d4°} aux DM. Cette capacité peut être utilisée avec Tir rapide ou Flèche de mort par exemple. Transformez cette capacité en action limitée (L) pour obtenir +{3d4°} aux DM au lieu de 2d4°.",
    sourcePage: 70,
  },
  {
    id: 'archer-r4',
    name: 'Tir rapide',
    pathId: 'archer',
    rank: 4,
    isSpell: false,
    actionTypes: ['L'],
    text:
      "Le rôdeur peut faire deux attaques à distance pendant son tour avec un malus de -2.",
    sourcePage: 70,
  },
  {
    id: 'archer-r5',
    name: 'Flèche de mort',
    pathId: 'archer',
    rank: 5,
    isSpell: false,
    actionTypes: ['L'],
    text:
      "Vous obtenez un dé bonus en attaque à distance et vous ajoutez 1d4° aux DM. Au lieu du dé bonus et de +1d4° aux DM, vous pouvez infliger un état préjudiciable de votre choix parmi aveuglé, affaibli, ralenti ou immobilisé pendant 1 round à une cible d'un NC inférieur au vôtre. Vous ne pouvez infliger chaque état préjudiciable qu'une seule fois par combat.",
    // Rendu enrichi (PER-71) : bonus aux DM {1d4°} (deux occurrences du même bonus). Le dé
    // bonus en attaque, l'état préjudiciable et « 1 round » restent en prose. Pas d'effet permanent.
    richText:
      "Vous obtenez un dé bonus en attaque à distance et vous ajoutez {1d4°} aux DM. Au lieu du dé bonus et de +{1d4°} aux DM, vous pouvez infliger un état préjudiciable de votre choix parmi aveuglé, affaibli, ralenti ou immobilisé pendant 1 round à une cible d'un NC inférieur au vôtre. Vous ne pouvez infliger chaque état préjudiciable qu'une seule fois par combat.",
    // « chaque état préjudiciable une seule fois par combat » → 4 états (aveuglé, affaibli, ralenti,
    // immobilisé), soit 4 utilisations par combat ; réinitialisé au repos court (PER-73/151).
    usageCounter: { max: 4, resetOn: 'combat', hideFromStatusPanel: true, label: 'États infligés' },
    sourcePage: 70,
  },

  // --- Voie du compagnon animal (p. 70) ---
  {
    id: 'compagnon-animal-r1',
    name: 'Le loup',
    pathId: 'compagnon-animal',
    rank: 1,
    isSpell: false,
    actionTypes: [],
    text:
      "Le rôdeur obtient un loup pour compagnon animal. En combat, le loup attaque en même temps que le rôdeur. Le loup comprend des ordres simples comme : garde, reste, apporte, attaque, etc.\n\nLOUP — CRÉATURE VIVANTE\nAGI +1 | CON +1* | FOR +2 | PER +2* | CHA -2 | INT -3 | VOL +2\n(S) Défense [12 + rang dans la voie]\n(V) Points de vigueur [niv. du rôdeur × 4]\n(I) Initiative [Init. du rôdeur]\nAttaque au contact [attaque magique du rôdeur] DM 1d4+2\n*Le loup obtient un dé bonus sur ses tests.",
    // Profil structuré du loup (mini-fiche, PER-69) ; le bloc de stats est retiré du richText.
    // Défense « [12 + rang dans la voie] » → [12 + rang] (rang = rang ATTEINT dans la voie hôte) ;
    // PV « [niv. du rôdeur × 4] » → quantité [=niveau × 4] ; Init. recopiée du maître ; attaque au
    // jet d'attaque magique du rôdeur, DM 1d4+2. Astérisques (CON+1*, PER+2* « dé bonus sur ses
    // tests ») → `bonusDieAbilities` (rendu double-d20, système unifié PER-107).
    richText:
      "Le rôdeur obtient un loup pour compagnon animal. En combat, le loup attaque en même temps que le rôdeur. Le loup comprend des ordres simples comme : garde, reste, apporte, attaque, etc.",
    creatureProfile: { name: 'Loup', type: 'Créature vivante', abilities: { AGI: 1, CON: 1, FOR: 2, PER: 2, CHA: -2, INT: -3, VOL: 2 }, defense: '[12 + rang]', hitPoints: '[=niveau × 4]', initiative: { fromMaster: 'initiative' }, attack: { fromMaster: 'magicAttack', damage: '[1d4 + 2]' }, bonusDieAbilities: ['CON', 'PER'] },
    sourcePage: 70,
  },
  {
    id: 'compagnon-animal-r2',
    name: "Travail d'équipe",
    pathId: 'compagnon-animal',
    rank: 2,
    isSpell: false,
    actionTypes: [],
    text:
      "Lorsque le loup et le rôdeur sont au contact, le loup obtient un dé bonus en attaque et le rôdeur obtient un dé bonus aux tests effectués pour pister ou pour éviter d'être surpris (Vigilance).",
    // PER-108 : effet CONDITIONNEL « le loup au contact » (interrupteur manuel) accordant au
    // RÔDEUR un DÉ BONUS (pas un bonus chiffré) aux tests de pister (tracking) et de vigilance
    // (vigilance) → `testDieDomains`, rendu par un double-d20 dans l'encadré des tests. `bonuses`
    // vide (aucune stat dérivée touchée). Le « dé bonus en attaque du LOUP » relève de PER-94
    // (bonus maître→créature) → non modélisé sur le profil du loup.
    effects: [
      {
        kind: 'conditional-stat-bonus',
        bonuses: [],
        testDieDomains: ['tracking', 'vigilance'],
        activation: { kind: 'condition', label: 'le loup au contact', activeByDefault: false },
      },
    ],
    sourcePage: 71,
  },
  {
    id: 'compagnon-animal-r3',
    name: 'Lien empathique',
    pathId: 'compagnon-animal',
    rank: 3,
    isSpell: false,
    actionTypes: ['L'],
    text:
      "Le rôdeur peut communiquer avec son loup par télépathie et le guérir à distance en dépensant ses propres PV (1 PV du rôdeur pour 1 PV octroyé au loup, sans limitation de quantité) au prix d'une action limitée.",
    sourcePage: 71,
  },
  {
    id: 'compagnon-animal-r4',
    name: 'Loup alpha',
    pathId: 'compagnon-animal',
    rank: 4,
    isSpell: false,
    actionTypes: [],
    text:
      "Le loup du rôdeur devient un spécimen particulièrement puissant.\n\nMÂLE ALPHA\nCON +3* | FOR +5\n(S) Défense 18\n(V) Points de vigueur [Niveau × 5]\nDM 1d4°+5",
    // Le loup « devient » un Mâle alpha : profil amélioré qui SUPPLANTE le loup de base
    // (compagnon-animal-r1) dès l'acquisition → `replacesFeatures` (même mécanique que Grand
    // félin/Panthère du druide). Le bloc « MÂLE ALPHA » ne réécrit que CON (+3), FOR (+5), la
    // Défense (18 fixe), les PV (niveau × 5) et les DM (1d4°+5) ; le reste du profil du loup est
    // reporté (AGI+1, PER+2*, CHA-2, INT-3, VOL+2 ; Init. du maître ; jet d'attaque magique).
    // Bloc de stats retiré du richText. Dés bonus innés (CON* de l'alpha + PER* reporté) →
    // `bonusDieAbilities` (rendu double-d20, PER-107).
    richText: "Le loup du rôdeur devient un spécimen particulièrement puissant.",
    creatureProfile: { name: 'Mâle alpha', type: 'Créature vivante', abilities: { AGI: 1, CON: 3, FOR: 5, PER: 2, CHA: -2, INT: -3, VOL: 2 }, defense: '18', hitPoints: '[=niveau × 5]', initiative: { fromMaster: 'initiative' }, attack: { fromMaster: 'magicAttack', damage: '[1d4° + 5]' }, bonusDieAbilities: ['CON', 'PER'] },
    replacesFeatures: ['compagnon-animal-r1'],
    sourcePage: 72,
  },
  {
    id: 'compagnon-animal-r5',
    name: 'Tactiques de meute',
    pathId: 'compagnon-animal',
    rank: 5,
    isSpell: false,
    actionTypes: [],
    text:
      "Lorsque le loup attaque la même cible que le rôdeur, il obtient un bonus de 1d4° aux DM. Chaque fois que le rôdeur dépense 1 PV pour soigner son loup, le loup récupère 2 PV. De plus, le rôdeur et son loup augmentent leur DEF de +1 chaque fois que le personnage atteint le rang 5 dans une voie de rôdeur (celle-ci incluse).",
    // Rendu enrichi (PER-71) : bonus aux DM du loup {1d4°} (situationnel). Effet : « le rôdeur …
    // augmente sa DEF de +1 chaque fois qu'il atteint le rang 5 dans une voie de rôdeur (celle-ci
    // incluse) » → `stat-bonus` DEF scalant par PALIERS DE FAMILLE (milestone-count : +1 par voie
    // de rôdeur au rang 5, voie hôte comprise ; même forme qu'Armure de mana). La montée reste en
    // prose (format §7). Le +1 DEF du LOUP (bonus maître→créature) relève de PER-94 → non modélisé
    // sur le profil du loup ; idem « le loup récupère 2 PV par PV dépensé ».
    richText:
      "Lorsque le loup attaque la même cible que le rôdeur, il obtient un bonus de {1d4°} aux DM. Chaque fois que le rôdeur dépense 1 PV pour soigner son loup, le loup récupère 2 PV. De plus, le rôdeur et son loup augmentent leur DEF de +1 chaque fois que le personnage atteint le rang 5 dans une voie de rôdeur (celle-ci incluse).",
    effects: [
      {
        kind: 'stat-bonus',
        stat: 'def',
        value: { scale: 'milestone-count', per: 1, rank: 5, classIds: ['rodeur'] },
      },
    ],
    sourcePage: 72,
  },

  // --- Voie de la survie (p. 72) ---
  {
    id: 'survie-r1',
    name: 'Survie',
    pathId: 'survie',
    rank: 1,
    isSpell: false,
    actionTypes: [],
    text:
      "Le rôdeur ajoute son rang + 2 à tous les tests d'escalade et de survie en milieu naturel (s'orienter, trouver un abri et de la nourriture, etc.) dont les tests de récupération effectués chaque nuit. Lorsqu'il dort en milieu naturel, s'il dépense 1 dé de récupération (DR), il guérit 1d4° PV supplémentaire (en plus de [DR max + ½ niveau]).",
    // Rendu enrichi (PER-71) : « son rang + 2 » → [rang + 2] ; soin supplémentaire {1d4°}. La
    // formule de récupération « [DR max + ½ niveau] » n'est pas exprimable (terme « DR max »,
    // demi-niveau) → laissée littérale (le parseur retombe proprement en texte).
    // PER-117 : le bonus de compétence (escalade/climbing, survie/survival) est CONDITIONNEL
    // (« en milieu naturel », pas tout le temps actif) → conditional-stat-bonus avec
    // `testBonusDomains` et un interrupteur, plutôt qu'un test-bonus statique.
    richText:
      "Le rôdeur ajoute son [rang + 2] à tous les tests d'escalade et de survie en milieu naturel (s'orienter, trouver un abri et de la nourriture, etc.) dont les tests de récupération effectués chaque nuit. Lorsqu'il dort en milieu naturel, s'il dépense 1 dé de récupération (DR), il guérit {1d4°} PV supplémentaire (en plus de [DR max + ½ niveau]).",
    effects: [
      {
        kind: 'conditional-stat-bonus',
        bonuses: [],
        testBonusDomains: ['climbing', 'survival'],
        activation: { kind: 'condition', label: 'en milieu naturel', activeByDefault: false },
      },
    ],
    sourcePage: 72,
  },
  {
    id: 'survie-r2',
    name: 'Nature nourricière',
    pathId: 'survie',
    rank: 2,
    isSpell: false,
    actionTypes: [],
    text:
      "Une fois par jour, si le rôdeur passe 1d6 h en milieu naturel sauvage (pas dans un champ), il trouve de quoi nourrir une personne par rang pour une journée et, s'il réussit un test de PER (Survie) difficulté 10, il trouve des plantes médicinales pour soigner 1d4° PV par rang. Les plantes doivent être utilisées immédiatement (10 min de préparation et autant pour faire effet) et les dés peuvent être répartis sur plusieurs patients.",
    // Rendu enrichi (PER-71 / PER-112) : durée {1d6} h ; soin {1d4°} PV. Les « par rang » désignent
    // le rang ATTEINT dans la voie de la survie → balisés en terme nommé [#rang] (« par rang (N) »,
    // info-bulle = valeur). « test de PER (Survie) » est un USAGE de la survie (pas une attribution
    // de bonus de compétence) → pas d'effet. « Une fois par jour » → compteur 1 usage (PER-73),
    // rechargé au repos long (bouton « Nouvelle journée »).
    richText:
      "Une fois par jour, si le rôdeur passe {1d6} h en milieu naturel sauvage (pas dans un champ), il trouve de quoi nourrir une personne par [#rang] pour une journée et, s'il réussit un test de PER (Survie) difficulté 10, il trouve des plantes médicinales pour soigner {1d4°} PV par [#rang]. Les plantes doivent être utilisées immédiatement (10 min de préparation et autant pour faire effet) et les dés peuvent être répartis sur plusieurs patients.",
    usageCounter: { max: 1, resetOn: 'day', hideFromStatusPanel: true },
    sourcePage: 72,
  },
  {
    id: 'survie-r3',
    name: 'Grand pas',
    pathId: 'survie',
    rank: 3,
    isSpell: false,
    actionTypes: ['G'],
    text:
      "En milieu naturel, le rôdeur obtient +1 en DEF (ce bonus passe à +2 au rang 5) et 10 m de déplacement en action gratuite (à son tour de jeu). Enfin, il n'est pas gêné par les terrains difficiles naturels, mais il n'obtient pas alors de déplacement supplémentaire.",
    // Bonus de DEF CONDITIONNEL (« en milieu naturel », interrupteur manuel PER-67), scalant par
    // rang de voie : +1, puis +2 au rang 5. Le déplacement gratuit et l'absence de gêne en terrain
    // difficile restent en prose. Pas de richText (aucun jeton parsable ; DEF auto-détectée).
    effects: [
      {
        kind: 'conditional-stat-bonus',
        bonuses: [
          {
            stat: 'def',
            value: { scale: 'stepped', by: 'path-rank', steps: [{ min: 1, value: 1 }, { min: 5, value: 2 }] },
          },
        ],
        activation: { kind: 'condition', label: 'en milieu naturel', activeByDefault: false },
      },
    ],
    sourcePage: 72,
  },
  {
    id: 'survie-r4',
    name: 'Constitution héroïque',
    pathId: 'survie',
    rank: 4,
    isSpell: false,
    actionTypes: [],
    text:
      "Le rôdeur augmente sa valeur de CON de +1. Désormais, il obtient un dé bonus aux tests de CON.",
    // Caractéristique héroïque (mécanique core) : +1 CON permanent + dé bonus aux tests de CON.
    effects: [
      { kind: 'ability-bonus', ability: 'CON', value: 1 },
      { kind: 'ability-bonus-die', ability: 'CON' },
    ],
    sourcePage: 72,
  },
  {
    id: 'survie-r5',
    name: 'Increvable',
    pathId: 'survie',
    rank: 5,
    isSpell: false,
    actionTypes: ['L'],
    text:
      "Une fois par combat, lorsqu'il tombe à 0PV, le rôdeur peut récupérer [4d4° + CON] PV au début de son prochain tour. Lorsqu'il se relève, il bénéficie d'un bonus de +5 en DEF pendant 1 round et il se débarrasse de tous les états préjudiciables non permanents qui l'affectent.",
    // Rendu enrichi (PER-71) : PV récupérés [4d4° + CON]. Le « +5 en DEF pendant 1 round » est un
    // buff TEMPORAIRE déclenché en tombant à 0 PV (pas un interrupteur de fiche persistant) → prose.
    richText:
      "Une fois par combat, lorsqu'il tombe à 0PV, le rôdeur peut récupérer [4d4° + CON] PV au début de son prochain tour. Lorsqu'il se relève, il bénéficie d'un bonus de +5 en DEF pendant 1 round et il se débarrasse de tous les états préjudiciables non permanents qui l'affectent.",
    // « Une fois par combat » → compteur réinitialisé au repos court (PER-73/151).
    usageCounter: { max: 1, resetOn: 'combat', hideFromStatusPanel: true },
    sourcePage: 72,
  },

  // --- Voie du traqueur (p. 72) ---
  {
    id: 'traqueur-r1',
    name: 'Éclaireur',
    pathId: 'traqueur',
    rank: 1,
    isSpell: false,
    actionTypes: [],
    text:
      "En milieu naturel, le rôdeur ajoute son rang + 2 à ses tests de discrétion et de vigilance ainsi qu'aux tests pour pister. De plus, le rôdeur peut remplacer le bonus de +1 PC de la famille des aventuriers par un bonus de +1 DR si le joueur le souhaite.",
    // Rendu enrichi (PER-71) : « son rang + 2 » → [rang + 2]. PER-111/PER-117 : les domaines
    // discrétion (stealth), vigilance et pister (tracking) sont reliés mais CONDITIONNELS
    // (« en milieu naturel », pas tout le temps actif) → conditional-stat-bonus avec
    // `testBonusDomains` + interrupteur. L'échange optionnel « +1 PC de famille → +1 DR » est un
    // CHOIX d'option portant des bonus de stats dérivées (luckPoints −1, recoveryDiceCount +1),
    // agrégé par `optionStatBonusSources`. Labels d'option « PC (…) / DR (…) » : le complément entre
    // parenthèses est masqué en vue colonne (forme courte « PC »/« DR »), gardé dans l'input.
    richText:
      "En milieu naturel, le rôdeur ajoute son [rang + 2] à ses tests de discrétion et de vigilance ainsi qu'aux tests pour pister. De plus, le rôdeur peut remplacer le bonus de +1 PC de la famille des aventuriers par un bonus de +1 DR si le joueur le souhaite.",
    effects: [
      {
        kind: 'conditional-stat-bonus',
        bonuses: [],
        testBonusDomains: ['stealth', 'vigilance', 'tracking'],
        activation: { kind: 'condition', label: 'en milieu naturel', activeByDefault: false },
      },
    ],
    choices: [
      {
        kind: 'option',
        prompt: 'Bonus de la famille des aventuriers',
        options: [
          { id: 'keep-luck', label: 'PC (garder le +1 point de chance de la famille)' },
          {
            id: 'take-recovery',
            label: 'DR (+1 dé de récupération au lieu du +1 PC)',
            statBonuses: [
              { stat: 'recoveryDiceCount', value: 1 },
              { stat: 'luckPoints', value: -1 },
            ],
          },
        ],
      },
    ],
    sourcePage: 72,
  },
  {
    id: 'traqueur-r2',
    name: 'Attaque éclair',
    pathId: 'traqueur',
    rank: 2,
    isSpell: false,
    actionTypes: ['L'],
    text:
      "Le rôdeur peut effectuer une attaque au contact très rapide. Il ajoute son AGI en attaque et aux DM pour cette attaque. À partir du rang 5, cette attaque peut être associée à 10 m de déplacement.",
    // Rendu enrichi (PER-71) : « son AGI en attaque et aux DM » = modificateur [AGI] (situationnel,
    // pour cette attaque limitée) → pas d'effet permanent.
    richText:
      "Le rôdeur peut effectuer une attaque au contact très rapide. Il ajoute son [AGI] en attaque et aux DM pour cette attaque. À partir du rang 5, cette attaque peut être associée à 10 m de déplacement.",
    sourcePage: 72,
  },
  {
    id: 'traqueur-r3',
    name: 'Chasseur émérite',
    pathId: 'traqueur',
    rank: 3,
    isSpell: false,
    actionTypes: [],
    text:
      "Le rôdeur obtient +1d4° aux DM de ses attaques au contact ou à distance lorsqu'il combat des animaux (même géants). Chaque fois qu'il atteint le rang 5 dans une voie de rôdeur, il peut choisir un ennemi juré contre lequel il obtient le même avantage parmi les goblinoïdes, les géants, les dragons, les morts-vivants, les insectes*, les démons.\n* arthropodes inclus.",
    // Rendu enrichi (PER-71) : bonus aux DM {1d4°} (contre les animaux, et chaque ennemi juré).
    // Choix RÉPÉTABLE d'« ennemi juré » débloqué par paliers de progression — un de plus « chaque
    // fois qu'il atteint le rang 5 dans une voie de rôdeur » (voie hôte comprise, le texte ne dit
    // pas « autre ») → `repeat: paths-at-rank` (même mécanique que Golem supérieur / Petit
    // compagnon). Options descriptives (le +1d4° vs la catégorie choisie n'est pas une stat → pas
    // d'effet mécanique, seul le choix est enregistré). PER-114 : la note de bas « * arthropodes
    // inclus » est retirée du richText au profit du terme de glossaire « insectes » (souligné
    // pointillé + info-bulle, auto-détecté via GAME_TERMS).
    richText:
      "Le rôdeur obtient +{1d4°} aux DM de ses attaques au contact ou à distance lorsqu'il combat des animaux (même géants). Chaque fois qu'il atteint le rang 5 dans une voie de rôdeur, il peut choisir un ennemi juré contre lequel il obtient le même avantage parmi les goblinoïdes, les géants, les dragons, les morts-vivants, les insectes, les démons.",
    choices: [
      {
        kind: 'option',
        prompt: 'Ennemi juré (par voie de rôdeur au rang 5)',
        repeat: { by: 'paths-at-rank', classIds: ['rodeur'], rank: 5 },
        options: [
          { id: 'goblinoids', label: 'Goblinoïdes' },
          { id: 'giants', label: 'Géants' },
          { id: 'dragons', label: 'Dragons' },
          { id: 'undead', label: 'Morts-vivants' },
          { id: 'insects', label: 'Insectes (arthropodes inclus)' },
          { id: 'demons', label: 'Démons' },
        ],
      },
    ],
    sourcePage: 72,
  },
  {
    id: 'traqueur-r4',
    name: 'Perception héroïque',
    pathId: 'traqueur',
    rank: 4,
    isSpell: false,
    actionTypes: [],
    text:
      "Le rôdeur augmente sa valeur de PER de +1. Désormais, il obtient un dé bonus aux tests de PER.",
    // Caractéristique héroïque (mécanique core) : +1 PER permanent + dé bonus aux tests de PER.
    effects: [
      { kind: 'ability-bonus', ability: 'PER', value: 1 },
      { kind: 'ability-bonus-die', ability: 'PER' },
    ],
    sourcePage: 73,
  },
  {
    id: 'traqueur-r5',
    name: 'Repli',
    pathId: 'traqueur',
    rank: 5,
    isSpell: false,
    actionTypes: ['L'],
    text:
      "En milieu naturel, le rôdeur se déplace de 30 m en s'éloignant de ses ennemis. Le joueur fait un test d'AGI difficulté 10, en cas de succès, il disparaît de la vue de ses poursuivants. Il peut s'éloigner ou rester caché sans risque d'être retrouvé ou rattrapé. Si le terrain est découvert (désert, plaine), la difficulté passe à 15.",
    sourcePage: 73,
  },

  // --- Voie du combat à deux armes (p. 73) ---
  {
    id: 'combat-a-deux-armes-r1',
    name: 'Attaque à suivre',
    pathId: 'combat-a-deux-armes',
    rank: 1,
    isSpell: false,
    actionTypes: ['G'],
    text:
      "Une fois par round, lorsqu'il rate une attaque de sa main principale, le rôdeur peut porter une attaque en action gratuite de son autre main avec une arme parmi dague (dague de lancer), hachette (hache de lancer) ou épée courte. S'il utilise une arme à une main en dehors de cette liste, il subit un dé malus sur cette attaque.",
    sourcePage: 73,
  },
  {
    id: 'combat-a-deux-armes-r2',
    name: 'Parade croisée',
    pathId: 'combat-a-deux-armes',
    rank: 2,
    isSpell: false,
    actionTypes: [],
    text:
      "Le rôdeur obtient un bonus de +1 en DEF lorsqu'il combat avec une arme dans chaque main. Ce bonus passe à +2 au rang 5 de la voie. Au début de son tour, s'il renonce à toute attaque de la main secondaire, il double ce bonus jusqu'à son prochain tour.",
    // Part structurable (PER-67) : « +1 en DEF avec une arme dans chaque main, passe à +2 au
    // rang 5 de la voie » → effet CONDITIONNEL (interrupteur : une arme dans chaque main) dont la
    // valeur est SCALANTE par paliers de rang de voie.
    // PER-109 : le doublement « s'il renonce à l'attaque secondaire » est un 2ᵉ interrupteur portant
    // le MÊME bonus scalant — les deux actifs s'additionnent → bonus doublé (+2 au lieu de +1, +4 au
    // rang 5). Dépendance À SENS UNIQUE (`deactivatesWithEffectIndex: 0`) : couper le 1ᵉʳ coupe le 2ᵉ.
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
                { min: 1, value: 1 },
                { min: 5, value: 2 },
              ],
            },
          },
        ],
        activation: { kind: 'condition', label: 'une arme dans chaque main', activeByDefault: false },
      },
      {
        kind: 'conditional-stat-bonus',
        bonuses: [
          {
            stat: 'def',
            value: {
              scale: 'stepped',
              by: 'path-rank',
              steps: [
                { min: 1, value: 1 },
                { min: 5, value: 2 },
              ],
            },
          },
        ],
        activation: { kind: 'condition', label: "bonus doublé (renonce à l'attaque secondaire)", activeByDefault: false },
        // Dépend du 1ᵉʳ interrupteur (index 0) : couper « une arme dans chaque main » coupe aussi
        // le doublement — on ne double qu'un bonus qu'on a (PER-109, sens unique).
        deactivatesWithEffectIndex: 0,
      },
    ],
    sourcePage: 73,
  },
  {
    id: 'combat-a-deux-armes-r3',
    name: 'Droite - gauche',
    pathId: 'combat-a-deux-armes',
    rank: 3,
    isSpell: false,
    actionTypes: ['G'],
    text:
      "Une fois par round, lorsqu'il attaque de sa main principale, le rôdeur obtient aussi une attaque de sa main secondaire en action gratuite. Si la cible n'est pas la même que celle de la main principale, il subit un dé malus au test. Cette capacité se substitue à Attaque à suivre.",
    // PER-113 : « Cette capacité se substitue à Attaque à suivre » → mise en Note (présentation),
    // ET `replacesFeatures` conservé (comportement d'origine validé) : Droite - gauche supplante
    // Attaque à suivre (combat-a-deux-armes-r1), qui est grisée dès l'acquisition.
    richText:
      "Une fois par round, lorsqu'il attaque de sa main principale, le rôdeur obtient aussi une attaque de sa main secondaire en action gratuite. Si la cible n'est pas la même que celle de la main principale, il subit un dé malus au test.\nNote : Cette capacité se substitue à Attaque à suivre.",
    replacesFeatures: ['combat-a-deux-armes-r1'],
    sourcePage: 73,
  },
  {
    id: 'combat-a-deux-armes-r4',
    name: 'Combattant héroïque',
    pathId: 'combat-a-deux-armes',
    rank: 4,
    isSpell: false,
    actionTypes: [],
    text:
      "Le rôdeur augmente sa valeur d'AGI de +1 et obtient un dé bonus aux tests d'AGI (lancer deux d20 et conserver le plus haut résultat). Plutôt qu'augmenter son AGI, le personnage peut choisir d'augmenter sa valeur de FOR de +1 (pas de dé bonus aux tests) et peut désormais attaquer avec la même arme dans la main secondaire sans subir de dé malus (par exemple deux épées longues).",
    // Caractéristique héroïque AVEC choix (PER-110) : le joueur augmente AGI ou FOR de +1
    // (`ability-bonus-from-choice`), mais le DÉ BONUS n'est accordé QUE si AGI est choisie
    // (`ability-bonus-die-from-choice` restreint à AGI — l'option FOR dit « pas de dé bonus »).
    // La clause « attaquer avec la même arme dans la main secondaire sans dé malus » (option FOR)
    // relève de la maîtrise des armes / indicateur de dé malus → milestone Armures (PER-116).
    choices: [
      {
        kind: 'ability',
        allowed: ['AGI', 'FOR'],
        prompt: 'Caractéristique à augmenter de +1 (AGI : dé bonus aux tests d’AGI ; FOR : pas de dé bonus, mais attaque possible avec la même arme dans la main secondaire)',
      },
    ],
    effects: [
      { kind: 'ability-bonus-from-choice', choiceIndex: 0, value: 1 },
      { kind: 'ability-bonus-die-from-choice', choiceIndex: 0, onlyIfAbility: ['AGI'] },
    ],
    sourcePage: 73,
  },
  {
    id: 'combat-a-deux-armes-r5',
    name: 'Double peine',
    pathId: 'combat-a-deux-armes',
    rank: 5,
    isSpell: false,
    actionTypes: [],
    text:
      "Si les deux armes du rôdeur atteignent la même cible lors d'un même tour, le personnage obtient un effet d'enchaînement qui ajoute 1d4° DM à l'une des deux attaques de son choix.",
    // Rendu enrichi (PER-71) : bonus aux DM de l'enchaînement {1d4°} (situationnel) → pas d'effet.
    richText:
      "Si les deux armes du rôdeur atteignent la même cible lors d'un même tour, le personnage obtient un effet d'enchaînement qui ajoute {1d4°} DM à l'une des deux attaques de son choix.",
    sourcePage: 73,
  },

  // ======================= VOLEUR =======================================
  // --- Voie de l'assassin (p. 74) ---
  {
    id: 'assassin-r1',
    name: 'Discrétion',
    pathId: 'assassin',
    rank: 1,
    isSpell: false,
    actionTypes: [],
    text:
      "Le voleur ajoute son rang + 2 à tous les tests de discrétion, de déguisement ou pour cacher une arme sur lui. Il apprend le langage silencieux à base de signe des voleurs (argotien) et enfin il obtient un dé bonus en attaque lorsqu'il attaque un adversaire surpris.",
    // Rendu enrichi (PER-71) : « son rang + 2 » est un bonus de MODIFICATEUR aux tests
    // → [rang + 2]. Bonus de compétence (PER-89) à trois domaines nommés inconditionnels :
    // discrétion (stealth), déguisement (disguise) et dissimulation d'objet (concealment).
    // Le dé bonus en attaque « contre un adversaire surpris » est SITUATIONNEL → verbatim.
    richText:
      "Le voleur ajoute son [rang + 2] à tous les tests de discrétion, de déguisement ou pour cacher une arme sur lui. Il apprend le langage silencieux à base de signe des voleurs (argotien) et enfin il obtient un dé bonus en attaque lorsqu'il attaque un adversaire surpris.",
    effects: [{ kind: 'test-bonus', domains: ['stealth', 'disguise', 'concealment'] }],
    sourcePage: 74,
  },
  {
    id: 'assassin-r2',
    name: 'Attaque sournoise',
    pathId: 'assassin',
    rank: 2,
    isSpell: false,
    actionTypes: ['L'],
    text:
      "Une fois par round, quand il attaque un adversaire surpris ou qui lui tourne le dos** avec une arme légère, le voleur inflige +2d4° DM supplémentaires. Les DM infligés par cette capacité augmentent de 1d4° à chaque fois qu'il atteint le rang 4 dans une voie de voleur (pour un maximum de 7d4°). Cette capacité nécessite l'utilisation d'une arme légère (dague, éventuellement lancée, épée courte, rapière) dans tous les autres cas, le bonus aux DM est divisé par deux (cela comprend les armes à distance).",
    // Rendu enrichi (PER-71) : DM scalant CROSS-VOIE (de famille) — base {2d4°}, +1 dé par
    // voie de voleur au rang 4 (la voie hôte comprise), plafonné à 7d4° (= 5 voies). Encodé
    // en paliers `|C@R` où le « rang » passé à la formule est le COMPTE de voies de voleur
    // au rang 4, injecté par `crossPathDieCount` (cf. countClassPathsAtRank, FeaturesByPath ;
    // même mécanique que soins-r3 du prêtre). Le terme `rang` n'est pas utilisé ici. La
    // phrase de scaling reste (avec {1d4°}) ; la restriction « arme légère » devient une Note.
    // Le renvoi « ** » du texte (note de la voie, p. 74) est retiré au profit du rendu.
    richText:
      "Une fois par round, quand il attaque un adversaire surpris ou qui lui tourne le dos avec une arme légère, le voleur inflige +{2d4°|3@1|4@2|5@3|6@4|7@5} DM supplémentaires. Les DM infligés par cette capacité augmentent de {1d4°} à chaque fois qu'il atteint le rang 4 dans une voie de voleur (pour un maximum de 7d4°).\nNote : Cette capacité nécessite l'utilisation d'une arme légère (dague, éventuellement lancée, épée courte, rapière) ; dans tous les autres cas, le bonus aux DM est divisé par deux (cela comprend les armes à distance).",
    sourcePage: 74,
  },
  {
    id: 'assassin-r3',
    name: 'Attaque par surprise',
    pathId: 'assassin',
    rank: 3,
    isSpell: false,
    actionTypes: ['A'],
    text:
      "Contre un adversaire surpris, le voleur peut réaliser une attaque sournoise en utilisant une action d'attaque plutôt qu'une action limitée et il augmente les DM de son attaque sournoise de 2d4°.",
    // Rendu enrichi (PER-71) : bonus aux DM de l'attaque sournoise {2d4°}.
    richText:
      "Contre un adversaire surpris, le voleur peut réaliser une attaque sournoise en utilisant une action d'attaque plutôt qu'une action limitée et il augmente les DM de son attaque sournoise de {2d4°}.",
    sourcePage: 74,
  },
  {
    id: 'assassin-r4',
    name: 'Disparition',
    pathId: 'assassin',
    rank: 4,
    isSpell: false,
    actionTypes: ['M'],
    text:
      "Une fois par combat, le voleur peut disparaître dans un flash lumineux et un nuage de fumée. Aucun adversaire ne peut l'attaquer pendant qu'il a disparu, mais il peut subir des DM de zone. Il ne réapparaît qu'au début de son prochain tour à une distance maximale de 20 m de sa position initiale. À ce moment, si le voleur a l'initiative, il peut réaliser une attaque sournoise.",
    // « Une fois par combat » → compteur réinitialisé au repos court (PER-73/151).
    usageCounter: { max: 1, resetOn: 'combat', hideFromStatusPanel: true },
    sourcePage: 74,
  },
  {
    id: 'assassin-r5',
    name: 'Ouverture mortelle',
    pathId: 'assassin',
    rank: 5,
    isSpell: false,
    actionTypes: ['L'],
    text:
      "Une fois par combat, le voleur obtient une réussite critique automatique contre la cible de son choix. Il profite donc d'une réussite automatique, des dommages multipliés par 2 prévus dans ce cas et d'une attaque sournoise (dont les DM ne sont pas doublés).",
    // « Une fois par combat » → compteur réinitialisé au repos court (PER-73/151).
    usageCounter: { max: 1, resetOn: 'combat', hideFromStatusPanel: true },
    sourcePage: 74,
  },

  // --- Voie de l'aventurier (p. 74) ---
  {
    id: 'aventurier-r1',
    name: 'Baratin',
    pathId: 'aventurier',
    rank: 1,
    isSpell: false,
    actionTypes: [],
    text:
      "Le voleur ajoute son rang + 2 aux tests destinés à baratiner, séduire, négocier, mentir ou pour trouver un objet au marché noir. De plus, il devient capable d'utiliser les parchemins ou les baguettes magiques en réussissant un test d'attaque magique (L) contre une difficulté de (10 + (2 x rang du sort inscrit)). En cas d'échec, le sort n'est pas lancé et le voleur peut faire une nouvelle tentative.",
    // Rendu enrichi (PER-71) : « son rang + 2 » → [rang + 2]. « rang du sort inscrit »
    // n'est PAS le rang de la voie hôte → laissé en littéral. Bonus de compétence (PER-89)
    // à des domaines nommés : baratin (fast-talk), séduction (seduction), négociation
    // (persuasion), mensonge (deception). « trouver un objet au marché noir » est une
    // application situationnelle → non modélisée en domaine, reste verbatim.
    richText:
      "Le voleur ajoute son [rang + 2] aux tests destinés à baratiner, séduire, négocier, mentir ou pour trouver un objet au marché noir. De plus, il devient capable d'utiliser les parchemins ou les baguettes magiques en réussissant un test d'attaque magique (L) contre une difficulté de (10 + (2 x rang du sort inscrit)). En cas d'échec, le sort n'est pas lancé et le voleur peut faire une nouvelle tentative.",
    effects: [{ kind: 'test-bonus', domains: ['fast-talk', 'seduction', 'persuasion', 'deception'] }],
    sourcePage: 74,
  },
  {
    id: 'aventurier-r2',
    name: 'Provocation',
    pathId: 'aventurier',
    rank: 2,
    isSpell: false,
    actionTypes: ['L'],
    text:
      "Le voleur maîtrise l'art de se rendre désagréable, voire insupportable. S'il emporte un test opposé de CHA contre INT d'un adversaire humanoïde à moins de 10 m, il force la cible à l'attaquer à son prochain tour. À ce moment-là, si le voleur est au contact, il peut riposter par une attaque de contact gratuite pour laquelle il bénéficie au choix d'une attaque sournoise ou d'un bonus de 1d4° aux DM.",
    // Rendu enrichi (PER-71) : test opposé du CHA (joueur, auto-détecté) contre l'@INT de
    // la CIBLE (stat d'autrui, non calculée) ; bonus aux DM de la riposte {1d4°}.
    richText:
      "Le voleur maîtrise l'art de se rendre désagréable, voire insupportable. S'il emporte un test opposé de CHA contre @INT d'un adversaire humanoïde à moins de 10 m, il force la cible à l'attaquer à son prochain tour. À ce moment-là, si le voleur est au contact, il peut riposter par une attaque de contact gratuite pour laquelle il bénéficie au choix d'une attaque sournoise ou d'un bonus de {1d4°} aux DM.",
    sourcePage: 75,
  },
  {
    id: 'aventurier-r3',
    name: 'Souplesse du félin',
    pathId: 'aventurier',
    rank: 3,
    isSpell: false,
    actionTypes: [],
    text:
      "Le voleur possède une démarche et une façon de se déplacer à la fois élégante, féline et souple. Il ajoute +2 en DEF et en Initiative. Ce bonus passe à +3 au rang 5. Il lui faut seulement une action de mouvement pour se relever.",
    // Bonus PERMANENT inconditionnel +2 DEF et +2 Init., scalant par paliers de rang de
    // voie (+3 au rang 5) → `stat-bonus` (PER-67), même forme que Réflexes éclair. La
    // montée par palier en prose reste littérale (pas de balisage richText).
    effects: [
      {
        kind: 'stat-bonus',
        stat: 'def',
        value: { scale: 'stepped', by: 'path-rank', steps: [{ min: 1, value: 2 }, { min: 5, value: 3 }] },
      },
      {
        kind: 'stat-bonus',
        stat: 'initiative',
        value: { scale: 'stepped', by: 'path-rank', steps: [{ min: 1, value: 2 }, { min: 5, value: 3 }] },
      },
    ],
    sourcePage: 75,
  },
  {
    id: 'aventurier-r4',
    name: 'Charisme héroïque',
    pathId: 'aventurier',
    rank: 4,
    isSpell: false,
    actionTypes: [],
    text:
      "Le voleur augmente sa valeur de CHA de +1. Désormais, il obtient un dé bonus aux tests de CHA.",
    // Caractéristique héroïque (mécanique core) : +1 CHA permanent + dé bonus aux tests de CHA.
    effects: [
      { kind: 'ability-bonus', ability: 'CHA', value: 1 },
      { kind: 'ability-bonus-die', ability: 'CHA' },
    ],
    sourcePage: 75,
  },
  {
    id: 'aventurier-r5',
    name: 'Attaque paralysante',
    pathId: 'aventurier',
    rank: 5,
    isSpell: false,
    actionTypes: ['L'],
    text:
      "Une fois par combat, le voleur peut, en réussissant une attaque de contact, paralyser un adversaire humanoïde de douleur. La cible ne subit aucun DM, mais elle est immobilisée pendant 1d4 rounds ou, si son NC est inférieur à la moitié du niveau du voleur, elle est paralysée. De plus, le voleur peut désormais utiliser au choix l'attaque sournoise (s'il détient cette capacité) ou infliger +1d4° DM contre tout adversaire immobilisé ou paralysé.",
    // Rendu enrichi (PER-71) : durée d'immobilisation {1d4} rounds ; bonus aux DM {1d4°}.
    // « la moitié du niveau du voleur » (seuil de NC) reste en prose (pas de division par
    // constante dans le format ; valeur situationnelle comparée au NC de la cible).
    richText:
      "Une fois par combat, le voleur peut, en réussissant une attaque de contact, paralyser un adversaire humanoïde de douleur. La cible ne subit aucun DM, mais elle est immobilisée pendant {1d4} rounds ou, si son NC est inférieur à la moitié du niveau du voleur, elle est paralysée. De plus, le voleur peut désormais utiliser au choix l'attaque sournoise (s'il détient cette capacité) ou infliger +{1d4°} DM contre tout adversaire immobilisé ou paralysé.",
    // « Une fois par combat » → compteur réinitialisé au repos court (PER-73/151).
    usageCounter: { max: 1, resetOn: 'combat', hideFromStatusPanel: true },
    sourcePage: 75,
  },

  // --- Voie du déplacement (p. 75) ---
  {
    id: 'deplacement-r1',
    name: 'Agile',
    pathId: 'deplacement',
    rank: 1,
    isSpell: false,
    actionTypes: [],
    text:
      "Le voleur ajoute son rang + 2 à tous tests liés à un déplacement (esquive, saut, course, équilibre, escalade, se glisser entre des barreaux ou échapper à une créature qui l'agrippe). De plus, il bénéficie d'un bonus de +1 en DEF et en Initiative. Ce bonus passe à +2 au rang 3 et +3 au rang 5.",
    // Rendu enrichi (PER-71) : « son rang + 2 » → [rang + 2]. Bonus de compétence (PER-89)
    // aux domaines nommés du déplacement : saut, course, escalade, et équilibre/acrobaties
    // (acrobatics). Esquive, « se glisser entre des barreaux », « échapper à une créature
    // qui l'agrippe » sont des applications situationnelles → non modélisées, reste verbatim.
    // Le +1 DEF/Init permanent (→ +2 rang 3, +3 rang 5) est un `stat-bonus` scalant.
    richText:
      "Le voleur ajoute son [rang + 2] à tous tests liés à un déplacement (esquive, saut, course, équilibre, escalade, se glisser entre des barreaux ou échapper à une créature qui l'agrippe). De plus, il bénéficie d'un bonus de +1 en DEF et en Initiative. Ce bonus passe à +2 au rang 3 et +3 au rang 5.",
    effects: [
      { kind: 'test-bonus', domains: ['jumping', 'running', 'climbing', 'acrobatics'] },
      {
        kind: 'stat-bonus',
        stat: 'def',
        value: { scale: 'stepped', by: 'path-rank', steps: [{ min: 1, value: 1 }, { min: 3, value: 2 }, { min: 5, value: 3 }] },
      },
      {
        kind: 'stat-bonus',
        stat: 'initiative',
        value: { scale: 'stepped', by: 'path-rank', steps: [{ min: 1, value: 1 }, { min: 3, value: 2 }, { min: 5, value: 3 }] },
      },
    ],
    sourcePage: 75,
  },
  {
    id: 'deplacement-r2',
    name: 'Réflexes félins',
    pathId: 'deplacement',
    rank: 2,
    isSpell: false,
    actionTypes: [],
    text:
      "Le voleur divise par 2 tous les DM de chute. De plus, une fois par combat, il obtient une action de mouvement supplémentaire à son tour. Au rang 5, il peut réaliser cet exploit 2 fois par combat (mais pas plus d'une fois par round).",
    sourcePage: 76,
  },
  {
    id: 'deplacement-r3',
    name: 'Acrobaties',
    pathId: 'deplacement',
    rank: 3,
    isSpell: false,
    actionTypes: ['G'],
    text:
      "Une fois par round, si le voleur réussit un test d'AGI difficulté 15, il peut effectuer une acrobatie pour franchir un obstacle (qui peut être un adversaire) ou attaquer dans le dos un adversaire au contact. Il peut alors au choix utiliser l'attaque sournoise ou infliger +1d4° DM.",
    // Rendu enrichi (PER-71) : bonus aux DM {1d4°}.
    richText:
      "Une fois par round, si le voleur réussit un test d'AGI difficulté 15, il peut effectuer une acrobatie pour franchir un obstacle (qui peut être un adversaire) ou attaquer dans le dos un adversaire au contact. Il peut alors au choix utiliser l'attaque sournoise ou infliger +{1d4°} DM.",
    sourcePage: 76,
  },
  {
    id: 'deplacement-r4',
    name: 'Agilité héroïque',
    pathId: 'deplacement',
    rank: 4,
    isSpell: false,
    actionTypes: [],
    text:
      "Le voleur augmente sa valeur d'AGI de +1. Désormais, il obtient un dé bonus aux tests d'AGI.",
    // Caractéristique héroïque (mécanique core) : +1 AGI permanent + dé bonus aux tests d'AGI.
    effects: [
      { kind: 'ability-bonus', ability: 'AGI', value: 1 },
      { kind: 'ability-bonus-die', ability: 'AGI' },
    ],
    sourcePage: 76,
  },
  {
    id: 'deplacement-r5',
    name: 'Esquive de la magie',
    pathId: 'deplacement',
    rank: 5,
    isSpell: false,
    actionTypes: ['G'],
    text:
      "Une fois par round, lorsqu'un sort qui inflige des DM physiques (feu, froid, projectile magique, etc.) le prend pour cible (y compris un sort de zone ou l'affectant en plus de la personne visée), le voleur peut effectuer un test d'attaque à distance opposé à un test d'attaque magique du lanceur sort. S'il réussit, il échappe au sort. S'il échoue, il subit les DM normaux.",
    sourcePage: 76,
  },

  // --- Voie du roublard (p. 76) ---
  {
    id: 'roublard-r1',
    name: 'Doigts agiles',
    pathId: 'roublard',
    rank: 1,
    isSpell: false,
    actionTypes: [],
    text:
      "Le voleur ajoute son rang + 2 aux tests liés à la précision manuelle (crocheter une serrure, désamorcer un piège, pickpocket…) ainsi qu'aux tests pour évaluer un objet précieux (joyaux, bijoux, etc.). De plus il obtient +1 aux DM des attaques à distance avec les dagues et couteaux. Ce bonus passe à +2 au rang 3 de la voie et +3 au rang 5.",
    // Rendu enrichi (PER-71) : « son rang + 2 » → [rang + 2]. Bonus de compétence (PER-89)
    // aux domaines nommés : crochetage (lockpicking), désamorçage de pièges (disarm-traps),
    // vol à la tire (pickpocketing), estimation (appraisal). Le « +1 aux DM des attaques à
    // distance avec dagues et couteaux » est un bonus aux DM RESTREINT à une catégorie
    // d'arme (situationnel, pas de stat dérivée dédiée) → laissé verbatim.
    richText:
      "Le voleur ajoute son [rang + 2] aux tests liés à la précision manuelle (crocheter une serrure, désamorcer un piège, pickpocket…) ainsi qu'aux tests pour évaluer un objet précieux (joyaux, bijoux, etc.). De plus il obtient +1 aux DM des attaques à distance avec les dagues et couteaux. Ce bonus passe à +2 au rang 3 de la voie et +3 au rang 5.",
    effects: [{ kind: 'test-bonus', domains: ['lockpicking', 'disarm-traps', 'pickpocketing', 'appraisal'] }],
    sourcePage: 76,
  },
  {
    id: 'roublard-r2',
    name: 'Aux aguets',
    pathId: 'roublard',
    rank: 2,
    isSpell: false,
    actionTypes: [],
    text:
      "Le voleur ajoute son rang + 2 aux tests effectués pour fouiller une pièce à la recherche d'un trésor, détecter un piège (même magique), un passage secret ou même une embuscade (Vigilance). De plus, il divise par 2 les DM infligés par des pièges.",
    // Rendu enrichi (PER-71) : « son rang + 2 » → [rang + 2]. Bonus de compétence (PER-89)
    // aux domaines nommés : fouille (searching, pièce/passage secret), détection de pièges
    // (trap-detection) et vigilance (embuscade — nommée par le livre). La division par 2
    // des DM de pièges est situationnelle (type de DM hors barème) → laissée verbatim.
    richText:
      "Le voleur ajoute son [rang + 2] aux tests effectués pour fouiller une pièce à la recherche d'un trésor, détecter un piège (même magique), un passage secret ou même une embuscade (Vigilance). De plus, il divise par 2 les DM infligés par des pièges.",
    effects: [{ kind: 'test-bonus', domains: ['searching', 'trap-detection', 'vigilance'] }],
    sourcePage: 76,
  },
  {
    id: 'roublard-r3',
    name: 'Feindre la mort',
    pathId: 'roublard',
    rank: 3,
    isSpell: false,
    actionTypes: ['G'],
    text:
      "Une fois par combat, le voleur peut feindre la mort après avoir reçu une blessure (même à 0 PV). Il peut ainsi passer pour mort aussi longtemps qu'il le souhaite et un test d'INT difficulté 20 est nécessaire pour révéler la supercherie. Lorsqu'il décide de se relever (action gratuite), le voleur récupère immédiatement 1d4° PV et s'il est au contact d'un adversaire, celui-ci est surpris. Un adversaire qui a déjà été victime de cette stratégie du voleur lors d'un précédent combat ne se laisse pas surprendre une seconde fois (sauf si son INT est de -4).",
    // Rendu enrichi (PER-71) : PV récupérés en se relevant {1d4°}. Le test d'INT difficulté
    // 20 (jet d'un observateur) et l'« INT de -4 » de l'adversaire restent en prose (stats
    // d'autrui, non calculées contre le joueur).
    richText:
      "Une fois par combat, le voleur peut feindre la mort après avoir reçu une blessure (même à 0 PV). Il peut ainsi passer pour mort aussi longtemps qu'il le souhaite et un test d'INT difficulté 20 est nécessaire pour révéler la supercherie. Lorsqu'il décide de se relever (action gratuite), le voleur récupère immédiatement {1d4°} PV et s'il est au contact d'un adversaire, celui-ci est surpris. Un adversaire qui a déjà été victime de cette stratégie du voleur lors d'un précédent combat ne se laisse pas surprendre une seconde fois (sauf si son INT est de -4).",
    // « Une fois par combat » → compteur réinitialisé au repos court (PER-73/151).
    usageCounter: { max: 1, resetOn: 'combat', hideFromStatusPanel: true },
    sourcePage: 76,
  },
  {
    id: 'roublard-r4',
    name: 'Expert en criminalité',
    pathId: 'roublard',
    rank: 4,
    isSpell: false,
    actionTypes: [],
    text:
      "Le voleur obtient un dé bonus sur tous les tests de recherche d'indice (Trouver une preuve [PER], Faire une déduction [INT] et Obtenir un aveu [CHA]) ainsi que pour tous les tests réalisés pour brouiller des pistes, réaliser de faux indices ou de faux documents. De plus, lorsqu'il est dans un lieu, s'il dépense 1 PC, le MJ devra lui donner un indice qui lui a échappé jusque-là. S'il n'y a pas d'indice, le PC n'est pas dépensé.",
    sourcePage: 76,
  },
  {
    id: 'roublard-r5',
    name: 'Maître du poison',
    pathId: 'roublard',
    rank: 5,
    isSpell: false,
    actionTypes: [],
    text:
      "Le voleur peut utiliser 3 doses de poison par jour sans risque de s'empoisonner lui-même. Une dose permet d'enduire une dague, une flèche ou un carreau pour infliger +2d4° DM supplémentaire et demande un test de CON difficulté (10 + INT du voleur) ou une cible vivante est affaiblie pour le reste du combat. Alternativement, une dose peut être versée dans les aliments pour une personne ; si la cible rate son test de CON, elle sombre dans l'inconscience pour 2d6 min (4d6 min pour 2 doses, etc.).",
    // Rendu enrichi (PER-71) : DM du poison {2d4°} ; difficulté du test de CON [10 + INT]
    // (INT du voleur = joueur) ; durée d'inconscience {2d6} min (« 4d6 pour 2 doses » =
    // palier d'usage décrit en prose, laissé littéral). Usages limités : 3 doses par jour
    // (usageCounter, comme Les sept vies du chat).
    richText:
      "Le voleur peut utiliser 3 doses de poison par jour sans risque de s'empoisonner lui-même. Une dose permet d'enduire une dague, une flèche ou un carreau pour infliger +{2d4°} DM supplémentaire et demande un test de CON difficulté [10 + INT] ou une cible vivante est affaiblie pour le reste du combat. Alternativement, une dose peut être versée dans les aliments pour une personne ; si la cible rate son test de CON, elle sombre dans l'inconscience pour {2d6} min (4d6 min pour 2 doses, etc.).",
    usageCounter: { max: 3, label: 'Doses de poison' },
    sourcePage: 76,
  },

  // --- Voie du spadassin (p. 77) ---
  {
    id: 'spadassin-r1',
    name: 'Attaque en finesse',
    pathId: 'spadassin',
    rank: 1,
    isSpell: false,
    actionTypes: [],
    text:
      "Le voleur ajoute son AGI à son Init. et peut remplacer sa FOR par son AGI pour ses tests d'attaque au contact (mais pas aux DM) lorsqu'il utilise une arme légère à une main (dague, épée courte ou rapière). Enfin, il obtient un bonus égal à son rang + 2 aux tests d'intimidation.",
    // Rendu enrichi (PER-71) : « son rang + 2 » → [rang + 2] (intimidation). AGI/FOR sont
    // auto-détectés (puces de carac). Effets : +AGI permanent en Initiative (`stat-bonus`
    // scalant sur l'AGI, comme Grâce féline du barde) et bonus de compétence à
    // l'intimidation (PER-89). La substitution FOR→AGI au test d'attaque au contact est
    // une mécanique de combat situationnelle (arme légère) → laissée verbatim.
    richText:
      "Le voleur ajoute son AGI à son Init. et peut remplacer sa FOR par son AGI pour ses tests d'attaque au contact (mais pas aux DM) lorsqu'il utilise une arme légère à une main (dague, épée courte ou rapière). Enfin, il obtient un bonus égal à son [rang + 2] aux tests d'intimidation.",
    effects: [
      { kind: 'stat-bonus', stat: 'initiative', value: { scale: 'ability', ability: 'AGI' } },
      { kind: 'test-bonus', domains: ['intimidation'] },
    ],
    sourcePage: 77,
  },
  {
    id: 'spadassin-r2',
    name: 'Esquive fatale',
    pathId: 'spadassin',
    rank: 2,
    isSpell: false,
    actionTypes: ['G'],
    text:
      "Une fois par combat, le voleur peut esquiver une attaque et s'arranger pour que celle-ci affecte un autre adversaire à son contact. Comparez le test d'attaque à la DEF de la nouvelle cible pour savoir si celle-ci subit des DM. Cette capacité ne peut pas être utilisée si le voleur n'a qu'un seul adversaire au contact et jamais contre une réussite critique (un critique touche toujours sa cible).",
    // « Une fois par combat » → compteur réinitialisé au repos court (PER-73/151).
    usageCounter: { max: 1, resetOn: 'combat', hideFromStatusPanel: true },
    sourcePage: 77,
  },
  {
    id: 'spadassin-r3',
    name: 'Frappe chirurgicale',
    pathId: 'spadassin',
    rank: 3,
    isSpell: false,
    actionTypes: [],
    text:
      "Par sa science de l'escrime (et de la fourberie), le voleur augmente ses chances de faire des coups critiques avec une arme légère de 2 points (ainsi, au lieu de 20, le critique standard est obtenu entre 18 et 20). Toutefois, la valeur minimale requise pour obtenir un critique ne peut être inférieure à 16 (voir page 213).",
    // PER-133 : élargissement de la plage de critique au CONTACT de 2 points (18-20), CONDITIONNÉ à
    // une arme légère en main. En attendant le câblage automatique au type d'arme porté (PER-136), un
    // interrupteur manuel (effet conditionnel « marqueur d'état », bonuses vide) pilote l'affichage de
    // la puce sous la carte Attaque au contact. Le plancher de 16 (p. 213) est appliqué à l'affichage.
    effects: [
      {
        kind: 'conditional-stat-bonus',
        bonuses: [],
        activation: { kind: 'condition', label: 'arme légère en main' },
      },
    ],
    criticalRange: { scope: 'melee', value: 2 },
    wip: "Plage de critique conditionnée à l'arme légère — activation manuelle en attendant le câblage automatique au type d'arme porté (PER-136).",
    sourcePage: 77,
  },
  {
    id: 'spadassin-r4',
    name: 'Ambidextrie',
    pathId: 'spadassin',
    rank: 4,
    isSpell: false,
    actionTypes: ['G'],
    text:
      "Avec sa main gauche, le voleur peut effectuer une attaque au contact gratuite avec une dague ou une épée courte à chaque round. Cette attaque ne peut pas bénéficier des avantages d'une attaque sournoise.",
    sourcePage: 77,
  },
  {
    id: 'spadassin-r5',
    name: 'Botte secrète',
    pathId: 'spadassin',
    rank: 5,
    isSpell: false,
    actionTypes: [],
    text:
      "Lorsque le voleur obtient un critique sur le dé d'une attaque au contact de sa main principale avec une arme légère (mais pas sur une ouverture mortelle), il inflige à sa cible un état préjudiciable au choix parmi affaibli, aveuglé, étourdi, immobilisé ou ralenti pendant 1 round. Vous ne pouvez infliger chaque état préjudiciable qu'une seule fois par combat. Alternativement, le voleur peut choisir que l'attaque devienne une attaque sournoise dont les DM s'ajoutent au critique (au lieu d'infliger un état préjudiciable).",
    // « chaque état préjudiciable une seule fois par combat » → 5 états (affaibli, aveuglé, étourdi,
    // immobilisé, ralenti), soit 5 utilisations par combat ; réinitialisé au repos court (PER-73/151).
    usageCounter: { max: 5, resetOn: 'combat', hideFromStatusPanel: true, label: 'États infligés' },
    sourcePage: 77,
  },
];
