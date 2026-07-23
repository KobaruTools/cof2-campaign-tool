/**
 * Famille des combattants — chap. 5, p. 78-90 du livre de base CO2.
 *
 * Profils : barbare (p. 79), chevalier (p. 83), guerrier (p. 87).
 * Textes verbatim (décision PRD #3). Les notes de bas de page signalées
 * par « * » dans le livre sont conservées à la fin du texte de la capacité
 * qu'elles annotent.
 *
 * Aucune capacité de cette famille n'est un sort (aucun astérisque après
 * un nom de capacité sur les pages 78-90).
 */

import type { CharacterClass, ClassPath, Feature } from '../schema';

// ---------------------------------------------------------------------------
// Profils
// ---------------------------------------------------------------------------

// caracsConseillees : caractéristiques « les plus utiles au personnage par
// ordre d'importance », indiquées entre crochets dans la liste des profils
// p. 24 du livre de base (et non sur les pages de profil 78-90).
// TODO(extraction): aligner `armureMaxId` et les `itemId` d'équipement sur les
// slugs définitifs du catalogue d'équipement (table des armures p. 188).

export const fighterClasses: CharacterClass[] = [
  {
    id: 'barbare',
    name: 'Barbare',
    familyId: 'fighters',
    description:
      'Le barbare est un combattant sauvage issu d’une culture primitive. Il affronte ses ennemis avec rage sans se cacher derrière une lourde armure.\n' +
      'Dans les Terres d’Osgild : les nations des Terres d’Osgild se considèrent toutes comme civilisées, selon leurs propres critères. On trouve toutefois quelques clans de rudes montagnards qui vivent dans les monts Vierges à l’ouest de Clairval et de la forêt de Myrviel. En guerre incessante contre les humanoïdes du désert de Krön, leur mode de vie à la fois guerrier et simple correspond à l’idée que les autres peuples se font des barbares. Un personnage de profil barbare peut également venir de la grande jungle de Luir-An-Doral où vivent de nombreuses tribus primitives d’elfes, d’humains, mais aussi d’orcs. Enfin, les royaumes barbares du nord fournissent une origine lointaine classique.',
    weaponsAndArmor:
      'Le barbare sait manier toutes les armes au contact, toutes les armes à distance (sauf les arbalètes et les armes d’une technologie trop complexe).\n' +
      'Les voies de barbare limitent l’armure au cuir renforcé. Le barbare peut en revanche utiliser tous les boucliers.',
    maxArmorId: 'cuir-renforce-broigne',
    shieldAccess: 'all',
    meleeAccess: 'all',
    rangedAccess: 'all',
    allowedWeaponIds: [],
    excludedWeaponIds: ['arbalete-de-poing', 'arbalete-legere', 'arbalete-lourde'],
    weaponNotes: "Sauf les arbalètes et les armes d'une technologie trop complexe.",
    startingEquipment: [
      {
        itemId: null,
        label: 'Hache à deux mains (DM 2d6) ou Arme à une main (d8) et bouclier (+2 en DEF)',
        quantity: 1,
        // Choix « X ou Y » (p. 79). Le lot « arme à une main (d8) + bouclier » est
        // aplati en options concrètes (les deux armes à une main d8 possibles).
        choice: [
          { label: 'Hache à deux mains (DM 2d6)', items: [{ itemId: 'hache-a-deux-mains', quantity: 1 }] },
          {
            label: 'Épée longue (DM 1d8) + grand bouclier (DEF +2)',
            items: [
              { itemId: 'epee-longue', quantity: 1 },
              { itemId: 'grand-bouclier', quantity: 1 },
            ],
          },
          {
            label: 'Hache (DM 1d8) + grand bouclier (DEF +2)',
            items: [
              { itemId: 'hache', quantity: 1 },
              { itemId: 'grand-bouclier', quantity: 1 },
            ],
          },
        ],
      },
      { itemId: 'javelot', label: 'Javelots (DM 1d6, portée 20 m)', quantity: 2 },
      { itemId: 'dague', label: 'Dague (DM 1d4)', quantity: 1 },
      { itemId: 'cuir-simple', label: 'Armure de cuir (DEF +2)', quantity: 1 },
    ],
    pathIds: ['brute', 'pagne', 'pourfendeur', 'primitif', 'rage'],
    recommendedAbilities: ['FOR', 'CON', 'AGI'],
    sourcePage: 79,
  },
  {
    id: 'chevalier',
    name: 'Chevalier',
    familyId: 'fighters',
    description:
      'Le chevalier est un noble guerrier errant, monté sur un puissant destrier et protégé par une armure lourde. Il parcourt la campagne en quête de torts à redresser et d’occasions de mettre son courage à l’épreuve.\n' +
      'Dans les Terres d’Osgild : de nombreuses nations humaines peuvent prétendre adouber des chevaliers en bonne et due forme. D’ouest en est : le comté du Ponant, la principauté d’Arly, les marches du Piémont, le duché de Périk, la baronnie de Bordant et le royaume de Cobis. Parmi celles-ci, seules les trois premières et le royaume de Cobis possèdent un véritable ordre de chevalerie. Toutefois, appartenir à un tel ordre est une charge à temps complet et un personnage sera plus probablement un jeune noble errant, fils cadet d’une famille, condamné à se tailler un domaine ou, au moins une réputation, à la pointe de son épée et à la force de son courage. Les chevaliers sont assez fréquents parmi la noblesse des elfes hauts et chez les nains, mais quasi inexistants chez les autres peuples. Il faudrait donc un historique très particulier pour justifier une telle bizarrerie.',
    weaponsAndArmor:
      'Le chevalier sait manier toutes les armes de contact, mais il dédaigne les armes à distance qu’il considère comme des armes de couard.\n' +
      'Les voies de chevalier limitent l’armure à celle de plaque (l’armure de plaque complète nécessite une capacité particulière). Il peut utiliser tous les boucliers.',
    maxArmorId: 'armure-de-plaques',
    shieldAccess: 'all',
    meleeAccess: 'all',
    rangedAccess: 'none',
    allowedWeaponIds: [],
    weaponNotes: 'Dédaigne les armes à distance (considérées comme des armes de couard).',
    startingEquipment: [
      { itemId: 'epee-longue', label: 'Épée longue (DM 1d8)', quantity: 1 },
      { itemId: 'grand-bouclier', label: 'Grand bouclier (DEF +2)', quantity: 1 },
      { itemId: 'lance-de-cavalerie', label: 'Lance de cavalerie (DM 2d6)', quantity: 1 },
      { itemId: 'dague', label: 'Dague (DM 1d4)', quantity: 1 },
      { itemId: 'cotte-de-mailles', label: 'Cotte de mailles (DEF +5)', quantity: 1 },
    ],
    pathIds: ['cavalier', 'guerre', 'preux', 'meneur-d-hommes', 'noblesse'],
    recommendedAbilities: ['FOR', 'CHA', 'CON'],
    sourcePage: 83,
  },
  {
    id: 'guerrier',
    name: 'Guerrier',
    familyId: 'fighters',
    description:
      'Le guerrier est un combattant émérite qui ne craint pas le danger et qui affronte ses ennemis l’arme à la main. De tous les profils de combattant, il est le plus spécialisé et le plus complet dans l’art du combat au corps à corps.\n' +
      'Dans les Terres d’Osgild : le guerrier est sans doute le profil le plus commun de toutes les Terres d’Osgild. Un personnage de ce type peut virtuellement venir de n’importe quelle région du monde (connu et inconnu !). Un guerrier peut avoir été formé au sein d’une armée ou d’une milice ou encore par un mentor. Il peut venir d’une force armée, avoir reçu une éducation martiale ou simplement être un gros bras issu des bas quartiers.',
    weaponsAndArmor:
      'Le guerrier sait manier toutes les armes de contact et toutes les armes à distance.\n' +
      'Les voies de guerrier limitent l’armure à la cotte de mailles. Il peut utiliser tous les boucliers.',
    maxArmorId: 'cotte-de-mailles',
    shieldAccess: 'all',
    meleeAccess: 'all',
    rangedAccess: 'all',
    allowedWeaponIds: [],
    startingEquipment: [
      { itemId: 'epee-longue', label: 'Épée longue (DM 1d8)', quantity: 1 },
      {
        itemId: null,
        label: 'Épée ou hache à deux mains (DM 2d6)',
        quantity: 1,
        choice: [
          { label: 'Épée à deux mains (DM 2d6)', items: [{ itemId: 'epee-a-deux-mains', quantity: 1 }] },
          { label: 'Hache à deux mains (DM 2d6)', items: [{ itemId: 'hache-a-deux-mains', quantity: 1 }] },
        ],
      },
      {
        itemId: null,
        label: 'Dague ou hachette de lancer',
        quantity: 1,
        choice: [
          { label: 'Dague (DM 1d4)', items: [{ itemId: 'dague', quantity: 1 }] },
          { label: 'Hachette (DM 1d6)', items: [{ itemId: 'hachette', quantity: 1 }] },
        ],
      },
      { itemId: 'grand-bouclier', label: 'Grand bouclier (DEF +2)', quantity: 1 },
      { itemId: 'chemise-de-mailles', label: 'Chemise de mailles (DEF +4)', quantity: 1 },
    ],
    pathIds: ['bouclier', 'combat', 'maitre-d-armes', 'resistance', 'soldat'],
    recommendedAbilities: ['FOR', 'CON', 'AGI'],
    sourcePage: 87,
  },
];

// ---------------------------------------------------------------------------
// Voies
// ---------------------------------------------------------------------------

export const fighterPaths: ClassPath[] = [
  // -- Barbare ---------------------------------------------------------------
  {
    type: 'class',
    id: 'brute',
    name: 'Voie de la brute',
    classIds: ['barbare'],
    featureIds: ['brute-r1', 'brute-r2', 'brute-r3', 'brute-r4', 'brute-r5'],
    sourcePage: 79,
  },
  {
    type: 'class',
    id: 'pagne',
    name: 'Voie du pagne',
    classIds: ['barbare'],
    featureIds: ['pagne-r1', 'pagne-r2', 'pagne-r3', 'pagne-r4', 'pagne-r5'],
    sourcePage: 80,
  },
  {
    type: 'class',
    id: 'pourfendeur',
    name: 'Voie du pourfendeur',
    classIds: ['barbare'],
    featureIds: [
      'pourfendeur-r1',
      'pourfendeur-r2',
      'pourfendeur-r3',
      'pourfendeur-r4',
      'pourfendeur-r5',
    ],
    sourcePage: 81,
  },
  {
    type: 'class',
    id: 'primitif',
    name: 'Voie du primitif',
    classIds: ['barbare'],
    featureIds: ['primitif-r1', 'primitif-r2', 'primitif-r3', 'primitif-r4', 'primitif-r5'],
    sourcePage: 81,
  },
  {
    type: 'class',
    id: 'rage',
    name: 'Voie de la rage',
    classIds: ['barbare'],
    featureIds: ['rage-r1', 'rage-r2', 'rage-r3', 'rage-r4', 'rage-r5'],
    // Encadré p. 82 (les puces du livre sont rendues par « • »).
    note:
      'RAGE ET AUTRES CAPACITÉS\n' +
      'La rage du barbare est basée sur une explosion de colère primitive et elle ne s’accorde avec aucune capacité qui nécessite maîtrise et concentration. Pour cette raison, il est impossible de lancer un sort en état de rage, mais il est aussi impossible d’utiliser certaines capacités comme l’Attaque sournoise du voleur. Les capacités issues des voies suivantes ne sont pas cumulables avec la rage (ou la furie) du barbare :\n' +
      '• Voie du maître d’armes du guerrier\n' +
      '• Voie de l’escrime du barde\n' +
      '• Voie de la maîtrise, voie de la méditation de moine\n' +
      '• Voie du spadassin, voie de l’assassin du voleur\n' +
      'La liste exacte des cumuls est laissée à la discrétion du MJ, mais le nom d’une capacité est souvent un bon indice. Par exemple, Attaque puissante ou Attaque brutale sont des cumuls possibles évidents.',
    sourcePage: 82,
  },

  // -- Chevalier -------------------------------------------------------------
  {
    type: 'class',
    id: 'cavalier',
    name: 'Voie du cavalier',
    classIds: ['chevalier'],
    featureIds: ['cavalier-r1', 'cavalier-r2', 'cavalier-r3', 'cavalier-r4', 'cavalier-r5'],
    // Le profil de la FIDÈLE MONTURE (encadré p. 84, jadis recopié ici en note) est désormais
    // STRUCTURÉ en `creatureProfile` sur cavalier-r1 (mini-fiche animal, comme le loup du rôdeur).
    // L'astérisque « CON +4* » du livre = DÉ BONUS INNÉ (convention des blocs de stats de créature,
    // cf. CreatureProfile.bonusDieAbilities) — ce qui résout l'ancien TODO(extraction) de la voie.
    sourcePage: 83,
  },
  {
    type: 'class',
    id: 'guerre',
    name: 'Voie de la guerre',
    classIds: ['chevalier'],
    featureIds: ['guerre-r1', 'guerre-r2', 'guerre-r3', 'guerre-r4', 'guerre-r5'],
    sourcePage: 84,
  },
  {
    type: 'class',
    id: 'preux',
    name: 'Voie du preux',
    classIds: ['chevalier'],
    featureIds: ['preux-r1', 'preux-r2', 'preux-r3', 'preux-r4', 'preux-r5'],
    sourcePage: 85,
  },
  {
    type: 'class',
    id: 'meneur-d-hommes',
    // Nom au pluriel en tête de voie p. 85 (« Voie du meneur d'homme » au
    // singulier dans la table récapitulative p. 78).
    name: 'Voie du meneur d’hommes',
    classIds: ['chevalier'],
    featureIds: [
      'meneur-d-hommes-r1',
      'meneur-d-hommes-r2',
      'meneur-d-hommes-r3',
      'meneur-d-hommes-r4',
      'meneur-d-hommes-r5',
    ],
    sourcePage: 85,
  },
  {
    type: 'class',
    id: 'noblesse',
    name: 'Voie de la noblesse',
    classIds: ['chevalier'],
    featureIds: ['noblesse-r1', 'noblesse-r2', 'noblesse-r3', 'noblesse-r4', 'noblesse-r5'],
    sourcePage: 86,
  },

  // -- Guerrier ---------------------------------------------------------------
  {
    type: 'class',
    id: 'bouclier',
    name: 'Voie du bouclier',
    classIds: ['guerrier'],
    featureIds: ['bouclier-r1', 'bouclier-r2', 'bouclier-r3', 'bouclier-r4', 'bouclier-r5'],
    // Phrase d'introduction de la voie, p. 87.
    note: 'Pour utiliser les capacités suivantes, le guerrier doit obligatoirement manier un bouclier.',
    // Le gating moteur (`requiresShield`/`shieldDisabledFeatureIds`, PER-142) porte sur la voie
    // native ; une capacité EMPRUNTÉE échappe à ce gating, d'où ce rappel explicite sur sa carte.
    borrowedNote: 'Pour utiliser cette capacité, il faut obligatoirement manier un bouclier.',
    // PER-142 : condition structurée de la note ci-dessus. Sans bouclier porté, toutes les capacités
    // de la voie sont désactivées (cf. `shieldDisabledFeatureIds`) ; un bouclier les réactive auto.
    requiresShield: true,
    sourcePage: 87,
  },
  {
    type: 'class',
    id: 'combat',
    name: 'Voie du combat',
    classIds: ['guerrier'],
    featureIds: ['combat-r1', 'combat-r2', 'combat-r3', 'combat-r4', 'combat-r5'],
    // Exemple en italique placé à la fin de la voie, p. 88 (référencé par
    // « voir exemple » dans Attaque puissante, rang 3).
    note: 'Exemple : un guerrier peut choisir de se déplacer puis d’utiliser attaque puissante sur une action d’attaque (A). Il subit alors un dé malus en attaque et inflige +2d4° DM. Il peut choisir de faire une double attaque en puissance (seulement s’il connaît aussi la capacité double attaque), ce qui lui demande une action limitée. Il fait alors deux attaques avec un dé malus et -2 en attaque, et chaque attaque réussie inflige +2d4° DM. Enfin, il peut utiliser une action limitée pour faire une seule attaque puissante ; il subit un dé malus et si l’attaque est réussie, il inflige +3d4° DM.',
    sourcePage: 88,
  },
  {
    type: 'class',
    id: 'maitre-d-armes',
    name: 'Voie du maître d’armes',
    classIds: ['guerrier'],
    featureIds: [
      'maitre-d-armes-r1',
      'maitre-d-armes-r2',
      'maitre-d-armes-r3',
      'maitre-d-armes-r4',
      'maitre-d-armes-r5',
    ],
    sourcePage: 88,
  },
  {
    type: 'class',
    id: 'resistance',
    name: 'Voie de la résistance',
    classIds: ['guerrier'],
    featureIds: [
      'resistance-r1',
      'resistance-r2',
      'resistance-r3',
      'resistance-r4',
      'resistance-r5',
    ],
    sourcePage: 89,
  },
  {
    type: 'class',
    id: 'soldat',
    name: 'Voie du soldat',
    classIds: ['guerrier'],
    featureIds: ['soldat-r1', 'soldat-r2', 'soldat-r3', 'soldat-r4', 'soldat-r5'],
    sourcePage: 90,
  },
];

// ---------------------------------------------------------------------------
// Capacités
// ---------------------------------------------------------------------------

export const fighterFeatures: Feature[] = [
  // -- Barbare : voie de la brute (p. 79-80) ----------------------------------
  {
    id: 'brute-r1',
    name: 'Argument de taille',
    pathId: 'brute',
    rank: 1,
    isSpell: false,
    actionTypes: [],
    text:
      'Le barbare ajoute sa FOR à son maximum de PV ainsi qu’à ses tests de CHA et à ceux de ses alliés au contact pour les tests de négociation, de persuasion ou d’intimidation. Allez savoir pourquoi, sa simple présence donne de la force aux arguments de ses alliés…',
    // PER-67 : « ajoute sa FOR à son maximum de PV » → bonus permanent SCALANT (valeur = FOR).
    // PER-123 : « ajoute sa FOR à ses tests de … négociation, persuasion ou intimidation » →
    // bonus de compétence DU PORTEUR, valeur = FOR (valeur scalante `ability`), sur les domaines
    // négociation / persuasion / intimidation. La part « et à ceux de ses alliés » n'est PAS
    // comptabilisée (bonus aux alliés hors périmètre) → reste verbatim.
    effects: [
      { kind: 'stat-bonus', stat: 'maxHp', value: { scale: 'ability', ability: 'FOR' } },
      {
        kind: 'test-bonus',
        domains: ['negotiation', 'persuasion', 'intimidation'],
        value: { scale: 'ability', ability: 'FOR' },
      },
    ],
    sourcePage: 79,
  },
  {
    id: 'brute-r2',
    name: 'Tour de force',
    pathId: 'brute',
    rank: 2,
    isSpell: false,
    actionTypes: ['G'],
    text:
      'Le barbare peut temporairement décupler ses ressources physiques pour faire usage d’une force prodigieuse. Il obtient un bonus de +10 sur un test de FOR (pas un jet de DM ou un test d’attaque), mais cela lui coûte 1d4° PV (à décider avant de lancer les dés). Enfin, le barbare peut désormais porter une chemise de mailles et utiliser toutes les capacités des voies de barbare auparavant autorisées avec une armure de cuir renforcé.',
    // Rendu enrichi (PER-72) : coût en PV {1d4°}. Le « +10 sur un test de FOR » est un bonus
    // SITUATIONNEL à un test de caractéristique (déclenché, optionnel) → hors périmètre PER-89,
    // verbatim. PER-81 : « peut désormais porter une chemise de mailles » → effet `armor-access`
    // qui relève le plafond de port du barbare (cuir renforcé DEF +3 → chemise de mailles DEF +4).
    richText:
      'Le barbare peut temporairement décupler ses ressources physiques pour faire usage d’une force prodigieuse. Il obtient un bonus de +10 sur un test de FOR (pas un jet de DM ou un test d’attaque), mais cela lui coûte {1d4°} PV (à décider avant de lancer les dés). Enfin, le barbare peut désormais porter une chemise de mailles et utiliser toutes les capacités des voies de barbare auparavant autorisées avec une armure de cuir renforcé.',
    effects: [{ kind: 'armor-access', maxArmorId: 'chemise-de-mailles' }],
    sourcePage: 79,
  },
  {
    id: 'brute-r3',
    name: 'Attaque brutale',
    pathId: 'brute',
    rank: 3,
    isSpell: false,
    actionTypes: ['L'],
    text:
      'Le barbare effectue une puissante attaque au contact qui inflige +1d4° aux DM. À la place, il peut choisir de s’imposer un malus de -3 au test d’attaque pour obtenir +2d4° aux DM. Sur une attaque brutale réussie, il peut sacrifier 1d4° DM pour faire reculer de 3 m un adversaire de NC inférieur au rang atteint dans la voie, ou sacrifier 2d4° DM pour le renverser.',
    // Rendu enrichi (PER-72) : dés de DM {1d4°}/{2d4°} ; « inférieur au rang atteint dans la voie »
    // → terme nommé [#rang]. Augmentation des DM d'arme → PER-115 (verbatim). Le recul / renversement
    // (effets de contrôle) relèvent du tracker de combat (PER-104/105). Pas d'effet structuré.
    richText:
      'Le barbare effectue une puissante attaque au contact qui inflige +{1d4°} aux DM. À la place, il peut choisir de s’imposer un malus de -3 au test d’attaque pour obtenir +{2d4°} aux DM. Sur une attaque brutale réussie, il peut sacrifier {1d4°} DM pour faire reculer de 3 m un adversaire de NC inférieur au [#rang] atteint dans la voie, ou sacrifier {2d4°} DM pour le renverser.',
    sourcePage: 79,
  },
  {
    id: 'brute-r4',
    name: 'Force héroïque',
    pathId: 'brute',
    rank: 4,
    isSpell: false,
    actionTypes: [],
    text: 'Le barbare augmente sa FOR de +1. Désormais, il obtient un dé bonus aux tests de FOR.',
    // Caractéristique héroïque (mécanique core) : +1 FOR permanent + dé bonus aux tests de FOR.
    effects: [
      { kind: 'ability-bonus', ability: 'FOR', value: 1 },
      { kind: 'ability-bonus-die', ability: 'FOR' },
    ],
    sourcePage: 80,
  },
  {
    id: 'brute-r5',
    name: 'Briseur d’os',
    pathId: 'brute',
    rank: 5,
    isSpell: false,
    actionTypes: [],
    text:
      'Le barbare augmente de 1 point les chances d’obtenir un critique sur les attaques au contact (par exemple 19-20 au lieu de 20). Lorsqu’il obtient un critique sur une attaque au contact, en plus des DM doublés, la cible est étourdie pendant 1 round. Enfin, le barbare peut désormais porter une cotte de mailles et utiliser toutes les capacités des voies de barbare auparavant autorisées avec une chemise de mailles.',
    // PER-133 : élargissement de la plage de critique au CONTACT (+1 → 19-20), inconditionnel (passif).
    // Affiché en puce sous la carte Attaque au contact. L'effet « cible étourdie sur critique » reste en
    // verbatim (non modélisé). PER-81 : « peut désormais porter une cotte de mailles » → effet
    // `armor-access` qui relève le plafond de port du barbare (chemise DEF +4 → cotte de mailles DEF +5).
    criticalRange: { scope: 'melee', value: 1 },
    effects: [{ kind: 'armor-access', maxArmorId: 'cotte-de-mailles' }],
    sourcePage: 80,
  },

  // -- Barbare : voie du pagne (p. 80-81) -------------------------------------
  {
    id: 'pagne-r1',
    name: 'Vigueur',
    pathId: 'pagne',
    rank: 1,
    isSpell: false,
    actionTypes: [],
    text:
      'Le barbare est un athlète capable de prouesses physiques extraordinaires, il ajoute son rang + 2 aux tests de course, de saut ou d’escalade. De plus, il gagne 1 PV supplémentaire par rang atteint dans la voie.',
    // Rendu enrichi (PER-72) : « son rang + 2 » → [rang + 2]. La montée des PV « par rang » reste
    // décrite en prose (format §7). PER-89 : bonus de compétence INCONDITIONNEL aux domaines course
    // (running), saut (jumping) et escalade (climbing) — valeur déduite de la catégorie de voie.
    // « 1 PV supplémentaire par rang atteint dans la voie » → bonus PERMANENT scalant aux PV (= rang).
    richText:
      'Le barbare est un athlète capable de prouesses physiques extraordinaires, il ajoute son [rang + 2] aux tests de course, de saut ou d’escalade. De plus, il gagne 1 PV supplémentaire par rang atteint dans la voie.',
    effects: [
      { kind: 'test-bonus', domains: ['running', 'jumping', 'climbing'] },
      {
        kind: 'stat-bonus',
        stat: 'maxHp',
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
    sourcePage: 80,
  },
  {
    id: 'pagne-r2',
    name: 'Peau de pierre',
    pathId: 'pagne',
    rank: 2,
    isSpell: false,
    actionTypes: [],
    text:
      'Le barbare est particulièrement endurci, il encaisse les coups plutôt que de les esquiver. Il peut choisir de remplacer son AGI par sa CON pour calculer sa DEF (la limitation du bonus maximal en fonction de l’armure portée s’applique toujours, mais cette fois elle s’applique à la CON).\n' +
      'Autrement (si son AGI est supérieure ou égale à sa CON), il reçoit +1 en DEF et ce bonus passe à +2 au rang 4.',
    // PER-124/PER-131 : le barbare CHOISIT entre deux régimes de DEF, exposés comme une SÉLECTION
    // (couche choix PER-66), affichée en puce COURTE « CON » / « AGI » sur la carte (shortLabel,
    // PER-130). Le CALCUL est désormais câblé au moteur de DEF (milestone Armures, PER-131) :
    //  - « con-for-def » → `defAbility: 'CON'` : `defense()` calcule sur la CON au lieu de l'AGI, le
    //    plafond d'armure (p. 188) s'appliquant alors à la CON (résolu par `defenseAbility`) ;
    //  - « def-bonus » → `statBonuses` : bonus PLAT +1 en DEF, passant à +2 au rang 4 de la voie
    //    (palier `path-rank`), agrégé au sac `DerivedMods` par `optionStatBonusSources`.
    // Aucun jeton parsable (DEF auto-glossée, « +1/+2 » et « rang 4 » en prose) → pas de richText.
    choices: [
      {
        kind: 'option',
        prompt: 'Calcul de la défense',
        options: [
          {
            id: 'con-for-def',
            label: 'Remplacer l’AGI par la CON pour la DEF',
            shortLabel: 'CON',
            defAbility: 'CON',
          },
          {
            id: 'def-bonus',
            label: '+1 en DEF (+2 au rang 4), si l’AGI est supérieure ou égale à la CON',
            shortLabel: 'AGI',
            statBonuses: [
              {
                stat: 'def',
                value: { scale: 'stepped', by: 'path-rank', steps: [{ min: 2, value: 1 }, { min: 4, value: 2 }] },
              },
            ],
          },
        ],
      },
    ],
    sourcePage: 80,
  },
  {
    id: 'pagne-r3',
    name: 'Tatouages',
    pathId: 'pagne',
    rank: 3,
    isSpell: false,
    actionTypes: [],
    // L'astérisque renvoie à la note de bas de page (p. 81), reproduite à la fin.
    text:
      'Le barbare possède un tatouage magique* qui améliore ses performances physiques ou mentales. Au choix : Taureau (+3 aux tests de FOR), ours (+3 aux tests de CON), panthère (+3 aux tests d’AGI), chouette (+3 aux tests de PER), loup (+3 aux tests de CHA), renard (+3 aux tests d’INT) ou serpent (+3 aux tests de VOL). De plus, lorsqu’il subit l’état étourdi, il est seulement ralenti.\n' +
      '* Ce bonus n’est pas un bonus de compétence, mais un bonus de magie qui ne peut donc pas se cumuler à un bonus fourni par un objet magique.',
    // PER-66 / PER-125 : le tatouage est un CHOIX d'option (7 totems) ; l'option retenue octroie un
    // bonus CHIFFRÉ de +3 aux tests de SA caractéristique (`abilityTestBonus`), rendu sur la ligne de
    // la carac dans Compétences & tests. C'est un bonus aux tests d'une CARAC (axe distinct des domaines
    // de compétence PER-89). La note de bas de page (« bonus de magie, non cumulable avec un objet
    // magique ») reste verbatim — pas d'objets magiques en jeu. « étourdi → ralenti » : état (tracker
    // PER-104/105).
    choices: [
      {
        kind: 'option',
        prompt: 'Tatouage magique',
        options: [
          { id: 'bull', label: 'Taureau (+3 aux tests de FOR)', abilityTestBonus: { ability: 'FOR', value: 3 } },
          { id: 'bear', label: 'Ours (+3 aux tests de CON)', abilityTestBonus: { ability: 'CON', value: 3 } },
          { id: 'panther', label: 'Panthère (+3 aux tests d’AGI)', abilityTestBonus: { ability: 'AGI', value: 3 } },
          { id: 'owl', label: 'Chouette (+3 aux tests de PER)', abilityTestBonus: { ability: 'PER', value: 3 } },
          { id: 'wolf', label: 'Loup (+3 aux tests de CHA)', abilityTestBonus: { ability: 'CHA', value: 3 } },
          { id: 'fox', label: 'Renard (+3 aux tests d’INT)', abilityTestBonus: { ability: 'INT', value: 3 } },
          { id: 'snake', label: 'Serpent (+3 aux tests de VOL)', abilityTestBonus: { ability: 'VOL', value: 3 } },
        ],
      },
    ],
    sourcePage: 80,
  },
  {
    id: 'pagne-r4',
    name: 'Constitution héroïque',
    pathId: 'pagne',
    rank: 4,
    isSpell: false,
    actionTypes: [],
    text:
      'Le barbare augmente sa valeur de CON de +1 et obtient un dé bonus aux tests de CON.',
    // Caractéristique héroïque (mécanique core) : +1 CON permanent + dé bonus aux tests de CON.
    effects: [
      { kind: 'ability-bonus', ability: 'CON', value: 1 },
      { kind: 'ability-bonus-die', ability: 'CON' },
    ],
    sourcePage: 80,
  },
  {
    id: 'pagne-r5',
    name: 'Peau d’acier',
    pathId: 'pagne',
    rank: 5,
    isSpell: false,
    actionTypes: [],
    text:
      'Le barbare ne sent plus la douleur et ignore les égratignures, il réduit tous les DM subis de 3 points (RD 3). Une attaque lui inflige toujours au minimum 1 DM.',
    // PER-72 : réduction de dégâts PERMANENTE de 3 sur TOUS les DM subis (RD 3) → `damageReduction`
    // plate, sans `scopes` (tous les DM). Posée dans les données ; pas encore consommée par le moteur
    // (cf. DamageReduction). « minimum 1 DM » : plancher non modélisé (verbatim). Pas de jeton parsable.
    damageReduction: { kind: 'flat', value: 3 },
    sourcePage: 81,
  },

  // -- Barbare : voie du pourfendeur (p. 81) ----------------------------------
  {
    id: 'pourfendeur-r1',
    name: 'Réflexes éclair',
    pathId: 'pourfendeur',
    rank: 1,
    isSpell: false,
    actionTypes: [],
    text:
      'Le barbare ajoute son rang + 2 à tous les tests d’AGI destinés à esquiver (Explosion de feu, souffle, pièges, etc.). De plus, il gagne +3 en Init. et +1 en DEF. Le bonus de DEF passe à +2 au rang 5.',
    // Rendu enrichi (PER-72) : « son rang + 2 » → [rang + 2]. PER-127 :
    // - bonus de compétence INCONDITIONNEL au domaine esquive (`evasion`, AGI) — décision propriétaire ;
    // - effets plats : +3 Init (constant) ; +1 DEF passant à +2 au rang 5 → DEF SCALANTE (stepped
    //   path-rank {1:1,5:2}), comme barde vagabond-r3 / Parade croisée (la montée reste aussi en prose).
    richText:
      'Le barbare ajoute son [rang + 2] à tous les tests d’AGI destinés à esquiver (Explosion de feu, souffle, pièges, etc.). De plus, il gagne +3 en Init. et +1 en DEF. Le bonus de DEF passe à +2 au rang 5.',
    effects: [
      { kind: 'stat-bonus', stat: 'initiative', value: 3 },
      {
        kind: 'stat-bonus',
        stat: 'def',
        value: { scale: 'stepped', by: 'path-rank', steps: [{ min: 1, value: 1 }, { min: 5, value: 2 }] },
      },
      { kind: 'test-bonus', domains: ['evasion'] },
    ],
    sourcePage: 81,
  },
  {
    id: 'pourfendeur-r2',
    name: 'Charge',
    pathId: 'pourfendeur',
    rank: 2,
    isSpell: false,
    actionTypes: ['L'],
    text:
      'Le barbare se déplace en ligne droite entre 5 m et 10 m et effectue une attaque au contact avec un dé bonus et +1d4° aux DM. Il ne peut pas lancer une charge s’il est au contact d’un adversaire.',
    // Rendu enrichi (PER-72) : DM {1d4°}. « un dé bonus » au test d'attaque (situationnel) et la hausse
    // des DM d'arme → PER-115/PER-116 (verbatim). Pas d'effet structuré.
    richText:
      'Le barbare se déplace en ligne droite entre 5 m et 10 m et effectue une attaque au contact avec un dé bonus et +{1d4°} aux DM. Il ne peut pas lancer une charge s’il est au contact d’un adversaire.',
    sourcePage: 81,
  },
  {
    id: 'pourfendeur-r3',
    name: 'Enchaînement',
    pathId: 'pourfendeur',
    rank: 3,
    isSpell: false,
    actionTypes: [],
    text:
      'Chaque fois que le barbare réduit un adversaire à 0 PV avec une attaque de contact, il bénéficie d’une action d’attaque gratuite sur un autre adversaire à son contact. Enchaînement ne peut pas être cumulé à un déchaînement d’acier ou une attaque tourbillon.',
    sourcePage: 81,
  },
  {
    id: 'pourfendeur-r4',
    name: 'Déchaînement d’acier',
    pathId: 'pourfendeur',
    rank: 4,
    isSpell: false,
    actionTypes: ['L'],
    text:
      'Le barbare parcourt 10 m en ligne droite en dépassant autant d’ennemis qu’il le souhaite. Il porte une attaque avec un malus de -2 à chaque adversaire sur son passage. Il doit traverser l’espace occupé par ceux-ci pour porter un coup, mais il ne peut terminer son déplacement à un endroit occupé par un ennemi.',
    sourcePage: 81,
  },
  {
    id: 'pourfendeur-r5',
    name: 'Attaque tourbillon',
    pathId: 'pourfendeur',
    rank: 5,
    isSpell: false,
    actionTypes: ['L'],
    text:
      'Une fois par combat, le barbare tourne sur lui-même en assénant des attaques à toutes les cibles au contact. Il inflige automatiquement des DM correspondant à l’arme utilisée (plus tous les bonus habituels) à toutes les cibles dans un rayon de 5 m autour de lui.',
    // « Une fois par combat » → compteur réinitialisé au repos court (PER-73/151).
    usageCounter: { max: 1, resetOn: 'combat', hideFromStatusPanel: true },
    sourcePage: 81,
  },

  // -- Barbare : voie du primitif (p. 81-82) ----------------------------------
  {
    id: 'primitif-r1',
    name: 'Proche de la nature',
    pathId: 'primitif',
    rank: 1,
    isSpell: false,
    actionTypes: [],
    text:
      'Le barbare ajoute son rang + 2 à ses tests de survie (dont les tests de récupération) et de discrétion en milieu naturel. De plus, il gagne 1 PV supplémentaire.',
    // Rendu enrichi (PER-72) : « son rang + 2 » → [rang + 2]. PER-117 : bonus de compétence survie
    // (survival) et discrétion (stealth) CONDITIONNELS (« en milieu naturel ») → conditional-stat-bonus
    // avec testBonusDomains + interrupteur (cf. rôdeur survie-r1). « 1 PV supplémentaire » : bonus
    // PERMANENT plat aux PV (+1, inconditionnel) → stat-bonus.
    richText:
      'Le barbare ajoute son [rang + 2] à ses tests de survie (dont les tests de récupération) et de discrétion en milieu naturel. De plus, il gagne 1 PV supplémentaire.',
    effects: [
      { kind: 'stat-bonus', stat: 'maxHp', value: 1 },
      {
        kind: 'conditional-stat-bonus',
        bonuses: [],
        testBonusDomains: ['survival', 'stealth'],
        activation: { kind: 'condition', label: 'en milieu naturel', activeByDefault: false },
      },
    ],
    sourcePage: 81,
  },
  {
    id: 'primitif-r2',
    name: 'Armure de vent',
    pathId: 'primitif',
    rank: 2,
    isSpell: false,
    actionTypes: [],
    text:
      'Lorsqu’il ne porte aucune armure, le barbare peut se relever par une action de mouvement et il obtient +2 en DEF. Ce bonus passe à +3 au rang 5. S’il porte une armure, il gagne seulement +1 en DEF.',
    // PER-132 : bonus de DEF conditionné à l'armure RÉELLEMENT portée (worn), résolu AUTOMATIQUEMENT
    // depuis l'équipement — sans interrupteur manuel (l'ancien pis-aller PER-67/72 était un
    // conditional-stat-bonus à bascule manuelle « aucune armure portée »). Sans armure : +2 en DEF,
    // passant à +3 au rang 5 de la voie (palier `path-rank`) ; avec une armure : +1 en DEF. Le moteur
    // choisit la branche via `ctx.armorWorn` (cf. `effects.ts`). Aucun jeton parsable.
    effects: [
      {
        kind: 'armor-def-bonus',
        whenUnarmored: { scale: 'stepped', by: 'path-rank', steps: [{ min: 2, value: 2 }, { min: 5, value: 3 }] },
        whenArmored: 1,
      },
    ],
    sourcePage: 81,
  },
  {
    id: 'primitif-r3',
    name: 'Vigilance',
    pathId: 'primitif',
    rank: 3,
    isSpell: false,
    actionTypes: [],
    text:
      'Le barbare possède des sens très affûtés, il est difficile de le surprendre, il ajoute son rang + 2 à tous les tests effectués pour détecter les pièges mécaniques, magiques (ses poils se hérissent) ou les embuscades. Il devient immunisé aux Attaques sournoises d’un voleur ou à toute capacité similaire d’une créature de niveau inférieur au sien.',
    // Rendu enrichi (PER-72) : « son rang + 2 » → [rang + 2]. PER-89 : bonus de compétence INCONDITIONNEL
    // aux domaines détection de pièges (trap-detection, couvre pièges mécaniques ET magiques) et vigilance
    // (repérer une embuscade / éviter la surprise). L'immunité aux attaques sournoises est CONDITIONNELLE
    // (« créature de niveau inférieur au sien »), hors de la liste fermée IMMUNITY_IDS → verbatim.
    richText:
      'Le barbare possède des sens très affûtés, il est difficile de le surprendre, il ajoute son [rang + 2] à tous les tests effectués pour détecter les pièges mécaniques, magiques (ses poils se hérissent) ou les embuscades. Il devient immunisé aux Attaques sournoises d’un voleur ou à toute capacité similaire d’une créature de niveau inférieur au sien.',
    effects: [{ kind: 'test-bonus', domains: ['trap-detection', 'vigilance'] }],
    sourcePage: 81,
  },
  {
    id: 'primitif-r4',
    name: 'Résistance à la magie',
    pathId: 'primitif',
    rank: 4,
    isSpell: false,
    actionTypes: ['G'],
    // L'astérisque renvoie à la note de bas de page (p. 82), reproduite à la fin.
    text:
      'Le barbare devient capable de résister à la magie. Lorsqu’il est la cible d’un sort, une fois par round, il peut faire un test d’attaque magique* opposé à celui du sort (si le sort n’en demande pas, faites-en tout de même un à cette occasion). En cas de réussite, il n’en subit pas les effets.\n' +
      '* Si le personnage est un profil hybride et qu’il est capable de faire de la magie (il possède au moins une capacité de sort), il subit un dé malus sur ce test opposé. Avoir cédé à la magie le rend moins apte à y résister.',
    sourcePage: 81,
  },
  {
    id: 'primitif-r5',
    name: 'Vitalité débordante',
    pathId: 'primitif',
    rank: 5,
    isSpell: false,
    actionTypes: [],
    text:
      'Le barbare guérit à une vitesse presque surnaturelle. Tant que son niveau actuel de PV est compris entre 1 et un tiers de son maximum, il récupère 1d4° PV par heure, de nuit comme de jour.',
    // Rendu enrichi (PER-72) : soin {1d4°} PV par heure. Le seuil « entre 1 et un tiers du maximum »
    // reste en prose (régime de guérison, pas une stat dérivée) → pas d'effet structuré.
    richText:
      'Le barbare guérit à une vitesse presque surnaturelle. Tant que son niveau actuel de PV est compris entre 1 et un tiers de son maximum, il récupère {1d4°} PV par heure, de nuit comme de jour.',
    sourcePage: 82,
  },

  // -- Barbare : voie de la rage (p. 82) --------------------------------------
  {
    id: 'rage-r1',
    name: 'Cri de guerre',
    pathId: 'rage',
    rank: 1,
    isSpell: false,
    actionTypes: ['G'],
    text:
      'Une fois par combat, le barbare pousse un hurlement qui effraie ses adversaires dans un rayon de 10 m. Les adversaires dont la FOR est inférieure à celle du barbare subissent un dé malus à leurs tests d’attaque au contact durant leur prochain tour. De plus, le barbare est sans peur, il ajoute son rang + 2 à tous les tests de VOL destinés à résister à la peur.',
    // Rendu enrichi (PER-72) : « son rang + 2 » → [rang + 2]. PER-128 : bonus de compétence
    // INCONDITIONNEL au domaine « résister à la peur » (`fear-resistance`, VOL). Le dé malus infligé
    // aux ennemis (effet de groupe) relève du tracker de combat (PER-104/105). « Une fois par combat »
    // → compteur réinitialisé au repos court (resetOn 'combat', PER-73/151).
    richText:
      'Une fois par combat, le barbare pousse un hurlement qui effraie ses adversaires dans un rayon de 10 m. Les adversaires dont la FOR est inférieure à celle du barbare subissent un dé malus à leurs tests d’attaque au contact durant leur prochain tour. De plus, le barbare est sans peur, il ajoute son [rang + 2] à tous les tests de VOL destinés à résister à la peur.',
    effects: [{ kind: 'test-bonus', domains: ['fear-resistance'] }],
    usageCounter: { max: 1, resetOn: 'combat', hideFromStatusPanel: true },
    sourcePage: 82,
  },
  {
    id: 'rage-r2',
    name: 'Défier la mort',
    pathId: 'rage',
    rank: 2,
    isSpell: false,
    actionTypes: [],
    text:
      'Une fois par combat, lorsque le barbare subit des DM d’une attaque qui devrait l’amener à 0 PV, il peut réaliser un test de CON difficulté 10. En cas de réussite, il conserve 1 PV. S’il est enragé, la réussite est automatique.',
    // « Une fois par combat » → compteur réinitialisé au repos court (PER-73/151).
    usageCounter: { max: 1, resetOn: 'combat', hideFromStatusPanel: true },
    sourcePage: 82,
  },
  {
    id: 'rage-r3',
    name: 'Rage du berserk',
    pathId: 'rage',
    rank: 3,
    isSpell: false,
    actionTypes: ['L'],
    text:
      'Une fois par jour, le barbare entre dans une rage berserk pour le reste du combat, ce qui le rend particulièrement dangereux. Il obtient +1d4° DM sur ses attaques au contact, mais il subit -2 en DEF et ne peut fuir de son propre gré ou attaquer à distance. Enfin, il obtient un dé bonus pour tous les tests de VOL. S’il veut stopper la rage avant d’avoir éliminé tous les ennemis sur le terrain, le barbare doit réussir un test de VOL difficulté 15 (un seul essai, à la fin de son tour). S’il devient inconscient, la rage cesse. Le personnage peut entrer en rage une fois de plus par jour pour chaque capacité de rang 4 qu’il atteint dans une voie de barbare.',
    // Part structurable (PER-67) : « il subit -2 en DEF » est un malus TEMPORAIRE
    // (le temps de la rage) → effet conditionnel à interrupteur, inactif par
    // défaut. Le +1d4° DM au contact, le malus de mouvement et le dé bonus de VOL
    // ne touchent pas une stat dérivée → restent verbatim.
    // Rendu enrichi (PER-72) : DM {1d4°}. Le dé bonus TEMPORAIRE aux tests de VOL (pendant la rage)
    // reste verbatim (les dés bonus permanents seuls sont structurés). « Une fois par jour … +1 par
    // capacité de rang 4 » : compteur d'usages non automatisable proprement → verbatim.
    richText:
      'Une fois par jour, le barbare entre dans une rage berserk pour le reste du combat, ce qui le rend particulièrement dangereux. Il obtient +{1d4°} DM sur ses attaques au contact, mais il subit -2 en DEF et ne peut fuir de son propre gré ou attaquer à distance. Enfin, il obtient un dé bonus pour tous les tests de VOL. S’il veut stopper la rage avant d’avoir éliminé tous les ennemis sur le terrain, le barbare doit réussir un test de VOL difficulté 15 (un seul essai, à la fin de son tour). S’il devient inconscient, la rage cesse. Le personnage peut entrer en rage une fois de plus par jour pour chaque capacité de rang 4 qu’il atteint dans une voie de barbare.',
    effects: [
      {
        kind: 'conditional-stat-bonus',
        bonuses: [{ stat: 'def', value: -2 }],
        activation: { kind: 'temporary', label: 'pendant la rage berserk', activeByDefault: false },
        // Exclusif de la Furie du berserk (rage-r5) : activer l'un éteint l'autre, sans le désactiver.
        mutuallyExclusiveWith: ['rage-r5'],
      },
      // PER-129/PER-236 : le +1d4° DM au CONTACT est conditionnel à l'état de rage → `weapon-damage-bonus`
      // en dé SITUATIONNEL (badge sous la carte d'attaque au contact), gaté sur l'interrupteur de rage
      // ci-dessus (`requiresActiveEffectIndex: 0`), suivant l'arme de contact effectivement maniée
      // (patron Cavalier émérite, cavalier-r2). Le {1d4°} du richText reste l'affichage sur la carte de voie.
      {
        kind: 'weapon-damage-bonus',
        dice: { count: 1, die: 'd4', evolving: true },
        condition: { attackMode: 'melee', label: 'pendant la rage berserk' },
        requiresActiveEffectIndex: 0,
        situational: true,
      },
    ],
    // PER-130 : réserve quotidienne de RAGE, partagée avec Furie du berserk (rage-r5). Max scalant =
    // 1 + une par capacité de rang 4 atteinte dans une voie de barbare (maxByRankCount).
    usageCounter: {
      maxByRankCount: { classIds: ['barbare'], rank: 4, base: 1 },
      sharedKey: 'rage',
      label: 'Rages',
    },
    sourcePage: 82,
  },
  {
    id: 'rage-r4',
    name: 'Même pas mal',
    pathId: 'rage',
    rank: 4,
    isSpell: false,
    actionTypes: [],
    text:
      'Une fois par combat, le barbare peut ignorer les DM d’un coup critique (il ne subit aucun DM) et il peut alors immédiatement entrer en Rage par une action gratuite.',
    // « Une fois par combat » → compteur réinitialisé au repos court (PER-73/151).
    usageCounter: { max: 1, resetOn: 'combat', hideFromStatusPanel: true },
    sourcePage: 82,
  },
  {
    id: 'rage-r5',
    name: 'Furie du berserk',
    pathId: 'rage',
    rank: 5,
    isSpell: false,
    actionTypes: ['L'],
    text:
      'Au lieu de la Rage du berserk, le barbare peut entrer en Furie du berserk, mais cela consomme deux utilisations de la rage. Cet état est similaire à la rage, mais le barbare ajoute 2d4° aux DM (au lieu de 1d4°) et subit -4 en DEF. La difficulté du test pour mettre prématurément fin à la furie est égale à 20.',
    // Rendu enrichi (PER-72) : DM {2d4°} (au lieu de {1d4°}). Malus de DEF -4 TEMPORAIRE pendant la furie
    // → conditional-stat-bonus à interrupteur (même modèle que Rage du berserk, rage-r3). EXCLUSION
    // MUTUELLE d'interrupteurs avec la Rage du berserk (rage-r3) : on est dans l'un OU l'autre état, jamais
    // les deux → `mutuallyExclusiveWith` (basculement ON/OFF, sans désactiver/griser).
    richText:
      'Au lieu de la Rage du berserk, le barbare peut entrer en Furie du berserk, mais cela consomme deux utilisations de la rage. Cet état est similaire à la rage, mais le barbare ajoute {2d4°} aux DM (au lieu de {1d4°}) et subit -4 en DEF. La difficulté du test pour mettre prématurément fin à la furie est égale à 20.',
    effects: [
      {
        kind: 'conditional-stat-bonus',
        bonuses: [{ stat: 'def', value: -4 }],
        activation: { kind: 'temporary', label: 'pendant la furie du berserk', activeByDefault: false },
        // Exclusif de la Rage du berserk (rage-r3) : activer l'un éteint l'autre, sans le désactiver.
        mutuallyExclusiveWith: ['rage-r3'],
      },
      // PER-129/PER-236 : le +2d4° DM au CONTACT est conditionnel à l'état de furie → `weapon-damage-bonus`
      // en dé SITUATIONNEL, gaté sur l'interrupteur de furie ci-dessus (`requiresActiveEffectIndex: 0`),
      // suivant l'arme de contact maniée (même patron que Rage du berserk, rage-r3).
      {
        kind: 'weapon-damage-bonus',
        dice: { count: 2, die: 'd4', evolving: true },
        condition: { attackMode: 'melee', label: 'pendant la furie du berserk' },
        requiresActiveEffectIndex: 0,
        situational: true,
      },
    ],
    // PER-130 : la Furie puise dans la MÊME réserve de rage (sharedKey 'rage') mais consomme 2 points
    // (« cela consomme deux utilisations de la rage ») → `cost: 2` ; le décrément est bloqué s'il reste
    // moins de 2. Même maximum scalant que rage-r3.
    usageCounter: {
      maxByRankCount: { classIds: ['barbare'], rank: 4, base: 1 },
      sharedKey: 'rage',
      label: 'Rages',
      cost: 2,
    },
    sourcePage: 82,
  },

  // -- Chevalier : voie du cavalier (p. 83-84) --------------------------------
  {
    id: 'cavalier-r1',
    name: 'Fidèle monture',
    pathId: 'cavalier',
    rank: 1,
    isSpell: false,
    actionTypes: [],
    text:
      'Le chevalier possède une fidèle monture (voir page suivante), un cheval de guerre bien dressé qui comprend les ordres simples. À cheval, il peut ajouter un déplacement de 10 m avant ou après une action normale (par exemple, parcourir 10 m et réaliser une action limitée). La monture n’attaque que si elle est elle-même attaquée au contact par une créature. De plus, le chevalier ajoute son rang + 2 aux tests d’équitation et de dressage.',
    // Rendu enrichi (PER-72) : « son rang + 2 » → [rang + 2]. PER-89 : bonus de compétence
    // INCONDITIONNEL aux domaines équitation (`riding`) et dressage (`animal-training`) — valeur
    // déduite de la catégorie de voie. Le renvoi « (voir page suivante) » est RETIRÉ du richText
    // (aucune pagination dans l'app ; le `text` verbatim le conserve comme source) : la « page
    // suivante » est le profil de la monture, désormais rendu en mini-fiche via `creatureProfile`.
    richText:
      'Le chevalier possède une fidèle monture, un cheval de guerre bien dressé qui comprend les ordres simples. À cheval, il peut ajouter un déplacement de 10 m avant ou après une action normale (par exemple, parcourir 10 m et réaliser une action limitée). La monture n’attaque que si elle est elle-même attaquée au contact par une créature. De plus, le chevalier ajoute son [rang + 2] aux tests d’équitation et de dressage.',
    effects: [{ kind: 'test-bonus', domains: ['riding', 'animal-training'] }],
    // Profil structuré de la FIDÈLE MONTURE (encadré p. 84) — mini-fiche animal (CreatureStatBlock),
    // comme le loup du rôdeur. DEF [12 + rang] (rang ATTEINT dans la voie du cavalier) ; PV
    // [=10 + niveau × 4] (niveau du chevalier) ; Init. recopiée du maître ; attaque PROPRE à la
    // monture (« Ruade +5 », sa FOR), DM [1d4° + 5]. CON +4* → dé bonus inné (`bonusDieAbilities`).
    // `defenseAlt` : Cavalier émérite (cavalier-r2) donne à la monture, EN SELLE, une DEF égale à
    // celle du chevalier → affichée ici quand l'interrupteur « en selle » de cavalier-r2 est actif
    // (cas d'affichage maître→créature trivial, traité en avance de PER-94).
    creatureProfile: {
      name: 'Fidèle monture',
      abilities: { AGI: 0, CON: 4, FOR: 5, PER: 0, CHA: 0, INT: -2, VOL: 2 },
      bonusDieAbilities: ['CON'],
      defense: '[12 + rang]',
      defenseAlt: { value: { fromMaster: 'def' }, conditionLabel: 'en selle', sourceLabel: 'Cavalier émérite', sourceFeatureId: 'cavalier-r2' },
      hitPoints: '[=10 + niveau × 4]',
      initiative: { fromMaster: 'initiative' },
      attack: { label: 'Ruade', value: '+5', damage: '[1d4° + 5]' },
      note: 'La monture peut être soignée comme un personnage et elle récupère 1d8+4 PV par nuit. Si la fidèle monture meurt, le chevalier en récupère une au niveau suivant. Selon son peuple, un personnage peut obtenir une monture différente ayant les mêmes caractéristiques : yack ou sanglier (nain), cerf ou orignal (elfe).',
    },
    sourcePage: 83,
  },
  {
    id: 'cavalier-r2',
    name: 'Cavalier émérite',
    pathId: 'cavalier',
    rank: 2,
    isSpell: false,
    actionTypes: [],
    text:
      'Lorsqu’il est en selle, le chevalier gagne un bonus de +1 aux DM de ses attaques au contact, et sa monture obtient une DEF égale à celle du chevalier. Monter ou descendre de cheval est désormais une action gratuite. Le bonus aux DM passe à +2 au rang 5.',
    // PER-72 : « en selle » est un ÉTAT → interrupteur (conditional-stat-bonus marqueur, sans bonus de
    // stat dérivée du chevalier ; activeByDefault false, effet index 0). Il pilote DEUX rendus :
    //  · la DEF de la FIDÈLE MONTURE = celle du chevalier en selle (cavalier-r1 `defenseAlt`, déjà câblé) ;
    //  · PER-139 : le +1 (puis +2 au rang 5 de la voie) aux DM d'arme au CONTACT, suivant l'arme de contact
    //    effectivement maniée. Modélisé en `weapon-damage-bonus` plat SCALANT (`stepped` `path-rank`),
    //    gaté sur l'interrupteur « en selle » via `requiresActiveEffectIndex: 0`.
    effects: [
      {
        kind: 'conditional-stat-bonus',
        bonuses: [],
        activation: { kind: 'condition', label: 'en selle', activeByDefault: false },
      },
      {
        kind: 'weapon-damage-bonus',
        flat: { scale: 'stepped', by: 'path-rank', steps: [{ min: 2, value: 1 }, { min: 5, value: 2 }] },
        condition: { attackMode: 'melee' },
        requiresActiveEffectIndex: 0,
      },
    ],
    sourcePage: 83,
  },
  {
    id: 'cavalier-r3',
    name: 'Charge',
    pathId: 'cavalier',
    rank: 3,
    isSpell: false,
    actionTypes: ['L'],
    text:
      'À cheval, le chevalier peut effectuer un déplacement de 10 à 20 m en ligne droite et faire une attaque de contact placée au moment de son choix. Le joueur obtient un dé bonus au test d’attaque et ajoute 1d4° aux DM. Si une créature s’interpose pour bloquer la charge du chevalier, elle doit réussir un test de FOR difficulté 20 ou être contrainte de céder le passage en subissant 1d4° DM. Si elle réussit ce test, la Charge est bloquée et le tour du chevalier se termine.',
    // Rendu enrichi (PER-72) : dés de DM {1d4°}. « un dé bonus » au test d'attaque (situationnel) et
    // la hausse des DM d'arme → PER-115 (verbatim). Le test de FOR adverse / le contrôle (céder le
    // passage) relèvent du tracker de combat. Pas d'effet structuré.
    richText:
      'À cheval, le chevalier peut effectuer un déplacement de 10 à 20 m en ligne droite et faire une attaque de contact placée au moment de son choix. Le joueur obtient un dé bonus au test d’attaque et ajoute {1d4°} aux DM. Si une créature s’interpose pour bloquer la charge du chevalier, elle doit réussir un test de FOR difficulté 20 ou être contrainte de céder le passage en subissant {1d4°} DM. Si elle réussit ce test, la Charge est bloquée et le tour du chevalier se termine.',
    sourcePage: 84,
  },
  {
    id: 'cavalier-r4',
    name: 'Monture magique',
    pathId: 'cavalier',
    rank: 4,
    isSpell: false,
    actionTypes: [],
    text:
      'Le chevalier obtient une monture magique, qui peut apparaître et disparaître depuis un autre plan à volonté. Il peut l’invoquer à tout moment (c’est une action limitée) et elle apparaît alors pour se mettre à son service. Lorsqu’il la laisse au moins une heure dans son plan d’origine, elle guérit l’ensemble de ses PV.',
    sourcePage: 84,
  },
  {
    id: 'cavalier-r5',
    name: 'Monture fantastique',
    pathId: 'cavalier',
    rank: 5,
    isSpell: false,
    actionTypes: [],
    // PER-140 : le STATBLOCK recopié est RETIRÉ du richText (conservé dans `text` verbatim, source) et
    // devient une mini-fiche `creatureProfile` DÉPENDANTE de la monture choisie (couche choix PER-66 +
    // `FeatureChoiceOption.creatureProfile`). Choix DYNAMIQUE selon le niveau : les montures VOLANTES
    // (`minLevel: 9`) ne sont proposées qu'à partir du niveau 9. Gabarit commun (livre, p. 84) : DEF 20,
    // attaque = attaque magique du chevalier, DM 2d4°+5, Init. recopiée du maître ; PV [=10 + niveau × 6]
    // (terrestres) ou [=10 + niveau × 5] (volantes). Les CARACTÉRISTIQUES (« varient selon la créature »)
    // sont tirées du bestiaire du livre : Cheval de guerre p. 267, Lion (félin géant) p. 269, Ours brun
    // p. 271. Les montures volantes (pégase/griffon/hippogriffe) ne figurant PAS au bestiaire du livre de
    // base, leurs caractéristiques sont EXTRAPOLÉES (cheval + aigle commun p. 266) — TODO(extraction) à
    // affiner si une source officielle les donne. Le richText garde la prose (PV volante [=10 + niveau × 5]
    // affichés dynamiquement).
    richText:
      'Le chevalier obtient une monture puissante (cheval de guerre lourd, ours, félin géant, etc.). La valeur exacte des caractéristiques peut varier selon la créature. Lorsqu’il est en selle, le chevalier peut faire attaquer sa monture une fois par round en action gratuite. À partir du niveau 9, le chevalier peut obtenir une monture volante (pégase, griffon, hippogriffe, etc.) si le MJ l’autorise (il devra vérifier qu’une monture volante n’entre pas en contradiction avec les aventures prévues). Dans ce cas, en vol, la monture couvre une distance de 20 m par action de mouvement, mais ses PV sont seulement égaux à [=10 + niveau × 5].',
    text:
      'Le chevalier obtient une monture puissante (cheval de guerre lourd, ours, félin géant, etc.). Init. [Init. du chevalier], DEF 20, PV [10 + niveau du chevalier × 6], Ruade ou morsure [attaque magique], DM 2d4°+5. La valeur exacte des caractéristiques peut varier selon la créature. Lorsqu’il est en selle, le chevalier peut faire attaquer sa monture une fois par round en action gratuite. À partir du niveau 9, le chevalier peut obtenir une monture volante (pégase, griffon, hippogriffe, etc.) si le MJ l’autorise (il devra vérifier qu’une monture volante n’entre pas en contradiction avec les aventures prévues). Dans ce cas, en vol, la monture couvre une distance de 20 m par action de mouvement, mais ses PV sont seulement égaux à [10 + niveau × 5].',
    choices: [
      {
        kind: 'option',
        prompt: 'Monture fantastique',
        options: [
          {
            id: 'war-horse',
            label: 'Cheval de guerre lourd',
            creatureProfile: {
              name: 'Cheval de guerre lourd',
              abilities: { AGI: 0, CON: 4, FOR: 5, PER: 0, CHA: -1, INT: -4, VOL: 0 },
              defense: '20',
              hitPoints: '[=10 + niveau × 6]',
              initiative: { fromMaster: 'initiative' },
              attack: { label: 'Ruade', fromMaster: 'magicAttack', damage: '[2d4° + 5]' },
            },
          },
          {
            id: 'bear',
            label: 'Ours',
            creatureProfile: {
              name: 'Ours',
              abilities: { AGI: 1, CON: 6, FOR: 6, PER: 2, CHA: -2, INT: -4, VOL: 1 },
              defense: '20',
              hitPoints: '[=10 + niveau × 6]',
              initiative: { fromMaster: 'initiative' },
              attack: { label: 'Morsure et griffes', fromMaster: 'magicAttack', damage: '[2d4° + 5]' },
            },
          },
          {
            id: 'giant-cat',
            label: 'Félin géant',
            creatureProfile: {
              name: 'Félin géant',
              abilities: { AGI: 4, CON: 5, FOR: 5, PER: 2, CHA: -2, INT: -3, VOL: 0 },
              defense: '20',
              hitPoints: '[=10 + niveau × 6]',
              initiative: { fromMaster: 'initiative' },
              attack: { label: 'Morsure et griffes', fromMaster: 'magicAttack', damage: '[2d4° + 5]' },
            },
          },
          {
            id: 'pegasus',
            label: 'Pégase (monture volante)',
            minLevel: 9,
            creatureProfile: {
              name: 'Pégase',
              abilities: { AGI: 2, CON: 4, FOR: 5, PER: 2, CHA: 0, INT: -3, VOL: 1 },
              defense: '20',
              hitPoints: '[=10 + niveau × 5]',
              initiative: { fromMaster: 'initiative' },
              attack: { label: 'Ruade', fromMaster: 'magicAttack', damage: '[2d4° + 5]' },
              note: 'En vol : 20 m par action de mouvement. Caractéristiques extrapolées (absente du bestiaire du livre de base).',
            },
          },
          {
            id: 'griffin',
            label: 'Griffon (monture volante)',
            minLevel: 9,
            creatureProfile: {
              name: 'Griffon',
              abilities: { AGI: 3, CON: 5, FOR: 5, PER: 3, CHA: -2, INT: -3, VOL: 2 },
              defense: '20',
              hitPoints: '[=10 + niveau × 5]',
              initiative: { fromMaster: 'initiative' },
              attack: { label: 'Bec et griffes', fromMaster: 'magicAttack', damage: '[2d4° + 5]' },
              note: 'En vol : 20 m par action de mouvement. Caractéristiques extrapolées (absent du bestiaire du livre de base).',
            },
          },
          {
            id: 'hippogriff',
            label: 'Hippogriffe (monture volante)',
            minLevel: 9,
            creatureProfile: {
              name: 'Hippogriffe',
              abilities: { AGI: 3, CON: 4, FOR: 5, PER: 3, CHA: -1, INT: -4, VOL: 1 },
              defense: '20',
              hitPoints: '[=10 + niveau × 5]',
              initiative: { fromMaster: 'initiative' },
              attack: { label: 'Bec et griffes', fromMaster: 'magicAttack', damage: '[2d4° + 5]' },
              note: 'En vol : 20 m par action de mouvement. Caractéristiques extrapolées (absent du bestiaire du livre de base).',
            },
          },
        ],
      },
    ],
    sourcePage: 84,
  },

  // -- Chevalier : voie de la guerre (p. 84-85) --------------------------------
  {
    id: 'guerre-r1',
    name: 'Armure sur mesure',
    pathId: 'guerre',
    rank: 1,
    isSpell: false,
    actionTypes: [],
    text:
      'L’armure du chevalier est parfaitement ajustée, aussi il n’ajoute que la moitié de sa DEF à la difficulté des tests pour lesquels l’armure inflige une pénalité. De plus, lorsqu’il porte une armure lourde (plaque ou plaque complète), il obtient un bonus de +1 en DEF à chaque fois qu’il atteint le rang 5 dans une voie de chevalier.',
    // PER-72 : les deux effets dépendent de l'ARMURE réellement portée — moitié de la DEF d'armure
    // retranchée aux pénalités d'armure ; et +1 en DEF par rang 5 atteint dans une voie de chevalier,
    // SEULEMENT en armure lourde (plaque / plaque complète). Non résoluble sans l'équipement porté
    // → modélisation différée à la milestone Armures (PER-76). Verbatim ; badge WIP.
    wip: "Armure sur mesure dépend de l'armure portée — pénalités d'armure réduites de moitié, et +1 en DEF par rang 5 de voie de chevalier en armure lourde — non branché sur le calcul du malus d'armure — suivi : PER-236.",
    sourcePage: 84,
  },
  {
    id: 'guerre-r2',
    name: 'Encaisser un coup',
    pathId: 'guerre',
    rank: 2,
    isSpell: false,
    actionTypes: ['M'],
    text:
      'Le chevalier se place de façon à dévier un coup sur son armure. Jusqu’à son tour au round suivant, il peut retrancher la valeur de DEF de son armure (bonus de magie inclus si elle est enchantée) aux DM d’une seule attaque au contact qu’il subit (minimum 1 DM). Au rang 5, il peut ajouter son bonus de bouclier (là aussi, bonus de magie inclus et cumulable au bonus d’armure). Le chevalier ne peut pas être étourdi ou renversé par une attaque qu’il a décidé d’encaisser.',
    // PER-137 : RD = valeur de DEF de l'armure (et du bouclier au rang 5) PORTÉE, sur une attaque,
    // 1×/round. La valeur dépend de l'équipement porté → modélisation différée à PER-76. Laissé
    // verbatim ; badge WIP pour la relecture.
    wip: "Réduction de DM égale à la DEF de l'armure (puis du bouclier) portée — manœuvre 1×/round dépendante de l'équipement porté, hors du modèle de RD continue — suivi : PER-236.",
    sourcePage: 85,
  },
  {
    id: 'guerre-r3',
    name: 'Frappe du justicier',
    pathId: 'guerre',
    rank: 3,
    isSpell: false,
    actionTypes: ['L'],
    text:
      'Lorsque le chevalier réalise cette attaque au contact, si le test d’attaque est un échec, il inflige tout de même ½ DM à sa cible. Un résultat de 1 au d20 n’inflige aucun DM.',
    sourcePage: 85,
  },
  {
    id: 'guerre-r4',
    name: 'Force héroïque',
    pathId: 'guerre',
    rank: 4,
    isSpell: false,
    actionTypes: [],
    text:
      'Le chevalier augmente sa FOR de +1. Désormais, il obtient un dé bonus aux tests de FOR.',
    // Caractéristique héroïque (mécanique core) : +1 FOR permanent + dé bonus aux tests de FOR.
    effects: [
      { kind: 'ability-bonus', ability: 'FOR', value: 1 },
      { kind: 'ability-bonus-die', ability: 'FOR' },
    ],
    sourcePage: 85,
  },
  {
    id: 'guerre-r5',
    name: 'Mon armure est une arme',
    pathId: 'guerre',
    rank: 5,
    isSpell: false,
    actionTypes: ['G'],
    text:
      'Une fois par combat, le chevalier peut donner un coup avec son armure (gantelet, heaume, spallière, etc.) en action gratuite. Il inflige automatiquement [1d4° + FOR] DM, et si la FOR de la cible est inférieure à celle du chevalier, elle est (au choix du chevalier) renversée ou étourdie pour 1 round ou recule de 3 m.',
    // Rendu enrichi (PER-72) : DM = formule dé + carac [1d4° + FOR]. La « FOR de la cible » est la
    // stat d'un ADVERSAIRE → référence non calculée @FOR (cf. format §5). Le contrôle (renversé /
    // étourdi / recul) relève du tracker de combat. Pas d'effet structuré.
    richText:
      'Une fois par combat, le chevalier peut donner un coup avec son armure (gantelet, heaume, spallière, etc.) en action gratuite. Il inflige automatiquement [1d4° + FOR] DM, et si la @FOR de la cible est inférieure à celle du chevalier, elle est (au choix du chevalier) renversée ou étourdie pour 1 round ou recule de 3 m.',
    // « Une fois par combat » → compteur réinitialisé au repos court (PER-73/151).
    usageCounter: { max: 1, resetOn: 'combat', hideFromStatusPanel: true },
    sourcePage: 85,
  },

  // -- Chevalier : voie du preux (p. 85) ---------------------------------------
  {
    id: 'preux-r1',
    name: 'Ignorer la douleur',
    pathId: 'preux',
    rank: 1,
    isSpell: false,
    actionTypes: ['G'],
    text:
      'Une fois par combat, le chevalier peut noter à part les DM subis par une attaque (mais pas un critique). Il ne subira les DM que lorsque le combat sera terminé. De plus le héros gagne un bonus égal à rang + 2 pour haranguer et convaincre les foules (au moins 15 individus).',
    // Rendu enrichi (PER-72) : « rang + 2 » → [rang + 2]. PER-89 : bonus de compétence INCONDITIONNEL
    // au domaine harangue (`haranguing`, CHA). Le report des DM en fin de combat (« noter à part »)
    // relève du tracker de combat → verbatim.
    richText:
      'Une fois par combat, le chevalier peut noter à part les DM subis par une attaque (mais pas un critique). Il ne subira les DM que lorsque le combat sera terminé. De plus le héros gagne un bonus égal à [rang + 2] pour haranguer et convaincre les foules (au moins 15 individus).',
    effects: [{ kind: 'test-bonus', domains: ['haranguing'] }],
    usageCounter: { max: 1, resetOn: 'combat', hideFromStatusPanel: true },
    sourcePage: 85,
  },
  {
    id: 'preux-r2',
    name: 'Piqûres d’insectes',
    pathId: 'preux',
    rank: 2,
    isSpell: false,
    actionTypes: [],
    text:
      'Le chevalier obtient une réduction des DM (RD) des attaques à distance (arcs, arbalètes, lances, etc.) qui dépend de l’armure qu’il porte. Armure de plaques (complète ou non) RD 3, armure intermédiaire (Chemise ou cotte de mailles) RD 2, armure de cuir (simple ou renforcée) RD 1. Les DM infligés par une attaque sont toujours au minimum d’un point.',
    // PER-137 : RD contre les attaques à DISTANCE, valeur (1/2/3) fonction du TYPE d'armure portée.
    // Non résoluble sans l'équipement porté → modélisation différée à PER-76. Verbatim ; badge WIP.
    wip: "RD contre les attaques à distance dont la valeur (1/2/3) dépend du type d'armure portée — dépendante de l'équipement porté — suivi : PER-236.",
    sourcePage: 85,
  },
  {
    id: 'preux-r3',
    name: 'Laissez-le-moi',
    pathId: 'preux',
    rank: 3,
    isSpell: false,
    actionTypes: [],
    text:
      'Le chevalier met un point d’honneur à combattre le leader ennemi. Lorsqu’il peut aisément être identifié dans un groupe d’au moins 4 créatures, le chevalier lui inflige +1d4° DM par attaque au contact. Chaque fois que le chevalier inflige des DM à une créature de cette façon, la créature doit réussir un test d’INT difficulté 15 ou elle ne peut pas attaquer d’autre adversaire que lui à son prochain tour.',
    // Rendu enrichi (PER-72) : DM {1d4°}. Le +1d4° est SITUATIONNEL (cible identifiable dans un
    // groupe) → bonus aux DM d'arme conditionnel, affichage différé à PER-115 (verbatim). Le contrôle
    // (test d'INT adverse) relève du tracker de combat. Pas d'effet structuré.
    richText:
      'Le chevalier met un point d’honneur à combattre le leader ennemi. Lorsqu’il peut aisément être identifié dans un groupe d’au moins 4 créatures, le chevalier lui inflige +{1d4°} DM par attaque au contact. Chaque fois que le chevalier inflige des DM à une créature de cette façon, la créature doit réussir un test d’INT difficulté 15 ou elle ne peut pas attaquer d’autre adversaire que lui à son prochain tour.',
    sourcePage: 85,
  },
  {
    id: 'preux-r4',
    name: 'Charisme héroïque',
    pathId: 'preux',
    rank: 4,
    isSpell: false,
    actionTypes: [],
    text:
      'Le chevalier augmente son CHA de +1. Désormais, il obtient un dé bonus aux tests de CHA.',
    // Caractéristique héroïque (mécanique core) : +1 CHA permanent + dé bonus aux tests de CHA.
    effects: [
      { kind: 'ability-bonus', ability: 'CHA', value: 1 },
      { kind: 'ability-bonus-die', ability: 'CHA' },
    ],
    sourcePage: 85,
  },
  {
    id: 'preux-r5',
    name: 'Seul contre tous',
    pathId: 'preux',
    rank: 5,
    isSpell: false,
    actionTypes: [],
    text:
      'Le chevalier sait faire face à de nombreux adversaires. Lorsque au moins 3 adversaires l’attaquent au contact à ce round, il obtient une action d’attaque (A) supplémentaire à ce round.',
    sourcePage: 85,
  },

  // -- Chevalier : voie du meneur d'hommes (p. 85-86) ---------------------------
  {
    id: 'meneur-d-hommes-r1',
    name: 'Sans peur',
    pathId: 'meneur-d-hommes',
    rank: 1,
    isSpell: false,
    actionTypes: [],
    text:
      'Le chevalier est immunisé aux effets de peur et il offre un bonus égal à son CHA aux tests de tous ses alliés contre ce type d’effet. De plus, le chevalier ajoute son rang + 2 aux tests de stratégie et de tactique militaire ou pour commander une troupe.',
    // PER-103 : immunité permanente à la PEUR (`fear`). PER-89 : bonus de compétence INCONDITIONNEL
    // aux domaines tactique militaire (`military-tactics`, INT) et commandement (`command`, CHA) —
    // « son rang + 2 » → [rang + 2]. Le bonus de CHA aux tests des ALLIÉS contre la peur est hors
    // périmètre (bonus aux alliés) → verbatim (CHA auto-glossé).
    richText:
      'Le chevalier est immunisé aux effets de peur et il offre un bonus égal à son CHA aux tests de tous ses alliés contre ce type d’effet. De plus, le chevalier ajoute son [rang + 2] aux tests de stratégie et de tactique militaire ou pour commander une troupe.',
    effects: [
      { kind: 'immunity', immunities: ['fear'] },
      { kind: 'test-bonus', domains: ['military-tactics', 'command'] },
    ],
    sourcePage: 85,
  },
  {
    id: 'meneur-d-hommes-r2',
    name: 'Intercepter',
    pathId: 'meneur-d-hommes',
    rank: 2,
    isSpell: false,
    actionTypes: ['G'],
    text:
      'Une fois par round, le chevalier peut encaisser une attaque au contact ou à distance à la place d’un allié à son contact. Il utilise sa DEF plutôt que celle de la cible initiale et retranche son rang dans la voie aux DM (en cas de synergie avec la capacité Piqûres d’insectes ou encaisser un coup, la réduction des DM se cumule). Le joueur doit annoncer son intention d’intercepter avant de connaître le résultat de l’attaque.',
    // PER-137 : manœuvre 1×/round protégeant un ALLIÉ — RD = rang sur l'attaque interceptée, et cumul
    // avec les RD d'armure (Piqûres d'insectes / Encaisser un coup). Dépend de l'équipement porté et du
    // suivi de combat → modélisation différée. Badge WIP conservé.
    // Rendu enrichi (PER-72) : « son rang dans la voie » → [#rang] (rang ATTEINT dans la voie du meneur).
    // « Piqûres d'insectes » et « encaisser un coup » sont des RÉFÉRENCES de capacité (preux-r2, guerre-r2)
    // → balisées [&id] (SANS texte d'override : on affiche le NOM CANONIQUE de la capacité, donc capitalisé
    // « Encaisser un coup »), rendues en puce aux couleurs du profil. Le balisage consomme « insectes »,
    // ce qui évite sa glose parasite « catégorie d'arthropodes » (terme de jeu du rôdeur, PER-114).
    richText:
      'Une fois par round, le chevalier peut encaisser une attaque au contact ou à distance à la place d’un allié à son contact. Il utilise sa DEF plutôt que celle de la cible initiale et retranche son [#rang] dans la voie aux DM (en cas de synergie avec la capacité [&preux-r2] ou [&guerre-r2], la réduction des DM se cumule). Le joueur doit annoncer son intention d’intercepter avant de connaître le résultat de l’attaque.',
    wip: "Interception : réduit de son rang les DM d'une attaque encaissée pour un allié (manœuvre 1×/round, cumul avec les RD d'armure) — manœuvre au tour par tour hors du modèle de RD continue — suivi : PER-236.",
    sourcePage: 85,
  },
  {
    id: 'meneur-d-hommes-r3',
    name: 'Exemplaire',
    pathId: 'meneur-d-hommes',
    rank: 3,
    isSpell: false,
    actionTypes: ['G'],
    text:
      'Une fois par round, le chevalier donne un dé bonus à un allié qui attaque un adversaire à son contact. Le dé bonus doit être attribué avant de lancer les dés.',
    sourcePage: 86,
  },
  {
    id: 'meneur-d-hommes-r4',
    name: 'Charge fantastique',
    pathId: 'meneur-d-hommes',
    rank: 4,
    isSpell: false,
    actionTypes: ['G'],
    text:
      'Une fois par combat, lorsque le chevalier déclare l’utilisation de cette capacité, tous ses alliés en vue et lui obtiennent 10 m de déplacement supplémentaire au début de leur tour puis un dé bonus et +1d4° DM à toutes leurs attaques. Ne se cumule ni avec exemplaire ni avec ordre de bataille.',
    // Rendu enrichi (PER-72) : DM {1d4°}. Buff de groupe TEMPORAIRE (le chevalier ET ses alliés) au
    // déclenchement → relève du tracker de combat (alliés hors périmètre). Pas d'effet structuré.
    richText:
      'Une fois par combat, lorsque le chevalier déclare l’utilisation de cette capacité, tous ses alliés en vue et lui obtiennent 10 m de déplacement supplémentaire au début de leur tour puis un dé bonus et +{1d4°} DM à toutes leurs attaques. Ne se cumule ni avec exemplaire ni avec ordre de bataille.',
    // « Une fois par combat » → compteur réinitialisé au repos court (PER-73/151).
    usageCounter: { max: 1, resetOn: 'combat', hideFromStatusPanel: true },
    sourcePage: 86,
  },
  {
    id: 'meneur-d-hommes-r5',
    name: 'Ordre de bataille',
    pathId: 'meneur-d-hommes',
    rank: 5,
    isSpell: false,
    actionTypes: ['G'],
    text:
      'Le chevalier donne des ordres tactiques pertinents au cœur de la bataille. Une fois par round, il octroie une action supplémentaire gratuite à un allié en vue (une action de mouvement ou une action d’attaque, mais pas une action limitée). Chaque allié ne peut profiter d’un ordre de bataille qu’une seule fois par combat.',
    sourcePage: 86,
  },

  // -- Chevalier : voie de la noblesse (p. 86) ----------------------------------
  {
    id: 'noblesse-r1',
    name: 'Éduqué',
    pathId: 'noblesse',
    rank: 1,
    isSpell: false,
    actionTypes: [],
    text:
      'Le chevalier sait lire et écrire, et apprend à parler une langue supplémentaire. De plus, il ajoute son rang + 2 à tous les tests d’histoire, d’héraldique et de géographie ainsi qu’aux tests pour savoir se comporter dans la haute société.',
    // Rendu enrichi (PER-72) : « son rang + 2 » → [rang + 2]. PER-89 : bonus de compétence
    // INCONDITIONNEL aux domaines histoire (`history`), héraldique (`heraldry`), géographie
    // (`geography`) et étiquette (`etiquette`, « se comporter dans la haute société »). La lecture/
    // écriture et la langue supplémentaire restent en prose (non modélisées).
    richText:
      'Le chevalier sait lire et écrire, et apprend à parler une langue supplémentaire. De plus, il ajoute son [rang + 2] à tous les tests d’histoire, d’héraldique et de géographie ainsi qu’aux tests pour savoir se comporter dans la haute société.',
    effects: [{ kind: 'test-bonus', domains: ['history', 'heraldry', 'geography', 'etiquette'] }],
    sourcePage: 86,
  },
  {
    id: 'noblesse-r2',
    name: 'Écuyer',
    pathId: 'noblesse',
    rank: 2,
    isSpell: false,
    actionTypes: [],
    text:
      'Le chevalier dispose d’un écuyer à son service (Init. [chevalier], DEF [10 + rang], PV [niveau × 4], Att [attaque magique], DM 1d4°+1). Il est absolument loyal à son maître, il s’occupe de sa monture et de son équipement, prépare le campement, panse les blessures, etc. Grâce à l’écuyer, les armes du chevalier sont parfaitement affûtées et il augmente de 1 point les chances d’obtenir un critique sur les attaques au contact (par exemple, 19-20 au lieu de 20). De plus, le chevalier, sa monture et jusqu’à CHA alliés récupèrent 1d4° PV supplémentaires après chaque récupération complète s’ils profitent des services de l’écuyer. Si l’écuyer vient à mourir, le chevalier en prendra un autre à son service au niveau suivant.',
    // Le STATBLOCK recopié « (Init. … DM 1d4°+1) » est RETIRÉ du richText (conservé dans `text` verbatim,
    // source) et devient une mini-fiche `creatureProfile` (ci-dessous), comme la fidèle monture. Dans la
    // prose : « jusqu’à CHA alliés » → quantité dynamique [=CHA] (nombre brut, bleu souligné) ; « 1d4° PV »
    // → dé évolutif {1d4°} au niveau courant.
    richText:
      'Le chevalier dispose d’un écuyer à son service. Il est absolument loyal à son maître, il s’occupe de sa monture et de son équipement, prépare le campement, panse les blessures, etc. Grâce à l’écuyer, les armes du chevalier sont parfaitement affûtées et il augmente de 1 point les chances d’obtenir un critique sur les attaques au contact (par exemple, 19-20 au lieu de 20). De plus, le chevalier, sa monture et jusqu’à [=CHA] alliés récupèrent {1d4°} PV supplémentaires après chaque récupération complète s’ils profitent des services de l’écuyer. Si l’écuyer vient à mourir, le chevalier en prendra un autre à son service au niveau suivant.',
    // PER-133 : élargissement de la plage de critique au CONTACT (+1 → 19-20). L'écuyer affûte les armes :
    // la plage n'est donc valable que tant que l'écuyer est EN VIE. Modélisé par un interrupteur
    // `conditional-stat-bonus` MARQUEUR D'ÉTAT (sans bonus de stat), ACTIVÉ PAR DÉFAUT (écuyer vivant) ; en
    // cas de mort de l'écuyer, le joueur le COUPE et `criticalRangeSources` cesse de retenir la plage (même
    // patron que les plages conditionnées à l'arme). Affiché en puce sous la carte Attaque au contact.
    criticalRange: { scope: 'melee', value: 1 },
    effects: [
      {
        kind: 'conditional-stat-bonus',
        bonuses: [],
        activation: { kind: 'condition', label: 'écuyer en vie', activeByDefault: true },
      },
    ],
    // Profil structuré de l'ÉCUYER (p. 86) — mini-fiche (CreatureStatBlock), comme la fidèle monture.
    // Le livre ne lui donne PAS de bloc de 7 caractéristiques (seulement Init/DEF/PV/Att/DM) → `abilities`
    // absent (grille de carac omise). Init. recopiée du maître ; DEF [10 + rang] (rang atteint dans la voie
    // de noblesse) ; PV [=niveau × 4] (niveau du chevalier) ; attaque = attaque magique du chevalier,
    // DM [1d4° + 1] (dé évolutif au niveau courant).
    creatureProfile: {
      name: 'Écuyer',
      defense: '[10 + rang]',
      hitPoints: '[=niveau × 4]',
      initiative: { fromMaster: 'initiative' },
      attack: { fromMaster: 'magicAttack', damage: '[1d4° + 1]' },
    },
    sourcePage: 86,
  },
  {
    id: 'noblesse-r3',
    name: 'Autorité naturelle',
    pathId: 'noblesse',
    rank: 3,
    isSpell: false,
    actionTypes: [],
    // L'astérisque renvoie à la note de bas de page (p. 86), reproduite à la fin.
    text:
      'Le chevalier ajoute son rang + 2 aux tests réalisés pour donner des ordres ou intimider. De plus, le noble chevalier reçoit la formation nécessaire au port de l’armure de plaque complète (DEF +7). Désormais, il peut utiliser toutes les capacités des voies de chevalier* en portant cette armure.\n' +
      '* Pour un profil hybride de combattant, cette capacité permet d’augmenter le niveau d’armure d’un cran pour toutes les autres voies de combattant : jusqu’à l’armure de plaque pour les voies de guerrier et jusqu’à la chemise de mailles pour les voies de barbare.',
    // Rendu enrichi (PER-72) : « son rang + 2 » → [rang + 2]. PER-89 : bonus de compétence
    // INCONDITIONNEL aux domaines commandement (`command`, « donner des ordres ») et intimidation
    // (`intimidation`, déjà au catalogue). PER-81 : « formation nécessaire au port de l'armure de
    // plaque complète (DEF +7) » → effet `armor-access` qui relève le plafond de port du chevalier
    // (plaque DEF +6 → plaque complète DEF +7). Le relèvement d'UN CRAN par voie de combattant pour
    // un profil HYBRIDE (note de bas de page*) est une restriction FINE d'USAGE par voie d'origine
    // (PER-86) : porté par `hybridClassRaises` sur l'effet `armor-access` (guerrier → armure de
    // plaques DEF +6, barbare → chemise de mailles DEF +4). Ne relève QUE l'armure d'usage des
    // capacités de ces voies (hors sorts) ; le plafond de PORT global (PER-80/81) l'ignore.
    richText:
      'Le chevalier ajoute son [rang + 2] aux tests réalisés pour donner des ordres ou intimider. De plus, le noble chevalier reçoit la formation nécessaire au port de l’armure de plaque complète (DEF +7). Désormais, il peut utiliser toutes les capacités des voies de chevalier* en portant cette armure.\n' +
      '* Pour un profil hybride de combattant, cette capacité permet d’augmenter le niveau d’armure d’un cran pour toutes les autres voies de combattant : jusqu’à l’armure de plaque pour les voies de guerrier et jusqu’à la chemise de mailles pour les voies de barbare.',
    effects: [
      { kind: 'test-bonus', domains: ['command', 'intimidation'] },
      {
        kind: 'armor-access',
        maxArmorId: 'plaque-complete',
        hybridClassRaises: [
          { classId: 'guerrier', maxArmorId: 'armure-de-plaques' },
          { classId: 'barbare', maxArmorId: 'chemise-de-mailles' },
        ],
      },
    ],
    sourcePage: 86,
  },
  {
    id: 'noblesse-r4',
    name: 'Massacrer la piétaille',
    pathId: 'noblesse',
    rank: 4,
    isSpell: false,
    actionTypes: [],
    text:
      'Le chevalier ajoute +1d4° aux DM contre la piétaille. S’il y a au moins 4 créatures aux statistiques semblables impliquées dans le combat, elles sont assimilées à de la piétaille (même si leur nombre est par la suite réduit à moins de 4 au cours du combat). Les cavaliers ne sont jamais considérés comme de la piétaille.',
    // Rendu enrichi (PER-72) : DM {1d4°}. Le +1d4° est SITUATIONNEL (cible « piétaille ») → bonus aux
    // DM d'arme conditionnel, affichage différé à PER-115 (verbatim). Pas d'effet structuré.
    richText:
      'Le chevalier ajoute +{1d4°} aux DM contre la piétaille. S’il y a au moins 4 créatures aux statistiques semblables impliquées dans le combat, elles sont assimilées à de la piétaille (même si leur nombre est par la suite réduit à moins de 4 au cours du combat). Les cavaliers ne sont jamais considérés comme de la piétaille.',
    sourcePage: 86,
  },
  {
    id: 'noblesse-r5',
    name: 'Formation d’élite',
    pathId: 'noblesse',
    rank: 5,
    isSpell: false,
    actionTypes: [],
    text:
      'Le chevalier possède les moyens et la culture nécessaires pour obtenir une formation dans n’importe quel domaine qui lui sied. Choisissez une capacité de rang 1 à 3 dans n’importe quel profil issu de la famille des combattants ou des aventuriers (voir page 78). De plus, le chevalier choisit une caractéristique ; désormais, il obtient un dé bonus lors des tests en rapport avec celle-ci.',
    // PER-66 : DEUX choix. (0) capacité empruntée de rang 1 à 3 dans une voie des familles
    // « combattants » (barbare, chevalier, guerrier) OU « aventuriers » (barde, rôdeur, voleur,
    // aventurier) — `feature-from-path` ; la capacité retenue est acquise, ses propres effects
    // comptent côté moteur. (1) une caractéristique au choix → dé bonus à ses tests
    // (`ability-bonus-die-from-choice` sur le choix d'index 1, sans restriction de carac).
    choices: [
      {
        kind: 'feature-from-path',
        prompt: 'Capacité de rang 1 à 3 (famille des combattants ou des aventuriers)',
        allowedRanks: [1, 2, 3],
        classIds: ['barbare', 'chevalier', 'guerrier', 'barde', 'rodeur', 'voleur', 'aventurier'],
      },
      {
        kind: 'ability',
        prompt: 'Caractéristique bénéficiant d’un dé bonus aux tests',
      },
    ],
    effects: [{ kind: 'ability-bonus-die-from-choice', choiceIndex: 1 }],
    sourcePage: 86,
  },

  // -- Guerrier : voie du bouclier (p. 87-88) -----------------------------------
  {
    id: 'bouclier-r1',
    name: 'Protéger un allié',
    pathId: 'bouclier',
    rank: 1,
    isSpell: false,
    actionTypes: ['G'],
    text:
      'S’il n’est pas surpris, le guerrier peut accorder un bonus de DEF de +2 à un allié à son contact contre une attaque par round. Il doit annoncer son intention avant de connaître le résultat de l’attaque. De plus, vous ajoutez votre rang + 2 à tous les tests destinés à éviter d’être surpris.',
    // Rendu enrichi (PER-72) : « votre rang + 2 » → [rang + 2]. PER-89 : bonus de compétence
    // INCONDITIONNEL au domaine vigilance (`vigilance`, PER, « éviter d'être surpris » — déjà au
    // catalogue). Le +2 en DEF accordé à un ALLIÉ est hors périmètre (bonus aux alliés) → verbatim.
    richText:
      'S’il n’est pas surpris, le guerrier peut accorder un bonus de DEF de +2 à un allié à son contact contre une attaque par round. Il doit annoncer son intention avant de connaître le résultat de l’attaque. De plus, vous ajoutez votre [rang + 2] à tous les tests destinés à éviter d’être surpris.',
    effects: [{ kind: 'test-bonus', domains: ['vigilance'] }],
    sourcePage: 87,
  },
  {
    id: 'bouclier-r2',
    name: 'Parer un coup',
    pathId: 'bouclier',
    rank: 2,
    isSpell: false,
    actionTypes: ['M'],
    // À partir du rang 5 de la voie, la parade peut AUSSI se faire en action gratuite (au choix du
    // joueur, avec un dé malus au test opposé) → marqueur (G) additionnel au rang 5 (PER-72).
    actionTypesFromRank: { rank: 5, actionTypes: ['G'] },
    text:
      'Le guerrier utilise une action de mouvement pour se mettre en posture défensive. Il peut alors essayer de parer une attaque à tout moment avant son prochain tour. Il doit faire un test d’attaque au contact (il peut remplacer la FOR par l’AGI pour ce test) en opposition au test de l’attaque au contact ou à distance réussie par son adversaire. S’il l’emporte, l’attaque adverse est bloquée par le bouclier. Il ne subit aucun DM sauf si la créature est de taille énorme ou colossale, auquel cas, il subit tout de même la moitié des DM. À partir du rang 5, le guerrier peut utiliser cette capacité en action gratuite (toujours une fois par round), mais dans ce cas, il subit un dé malus au test opposé.',
    // PER-137 : parade au bouclier (test opposé) qui ANNULE les DM (moitié contre créatures énorme/
    // colossale) — manœuvre liée au bouclier porté et au suivi de combat, pas une RD continue.
    // Modélisation différée. Verbatim ; badge WIP.
    wip: "Parade au bouclier (test opposé) annulant les DM d'une attaque (moitié contre les créatures énormes/colossales) — manœuvre liée à l'équipement porté, hors du modèle de RD continue — suivi : PER-236.",
    sourcePage: 87,
  },
  {
    id: 'bouclier-r3',
    name: 'Défense au bouclier',
    pathId: 'bouclier',
    rank: 3,
    isSpell: false,
    actionTypes: [],
    text:
      'Le guerrier obtient un bonus de +1 en DEF lorsqu’il manie un bouclier. Ce bonus passe à +2 au rang 5. De plus, lorsqu’il tient son bouclier en main, il retranche son rang à tous les DM des attaques de zone (sorts d’Explosion de feu, mains brûlantes, foudre, etc. et aux souffles) sauf s’il est surpris.',
    // PER-142 : le +1 en DEF (passant à +2 au rang 5) est CONDITIONNÉ au maniement d'un bouclier.
    // La condition est désormais AUTOMATIQUE (déduite de l'équipement porté) : toute la Voie du
    // bouclier est marquée `requiresShield` et désactivée sans bouclier (cf. `shieldDisabledFeatureIds`).
    // Le bonus est donc un `stat-bonus` INCONDITIONNEL (plus d'interrupteur manuel « bouclier en main ») ;
    // DEF SCALANTE stepped path-rank {1:1, 5:2}. La RÉDUCTION DE DM « son rang » contre les attaques de
    // ZONE/souffles est portée par `damageReduction` (type `area`, PER-72) : valeur = rang de la voie
    // (stepped {3:3, 4:4, 5:5}) ; `damageReductionSources` la retire elle aussi quand aucun bouclier
    // n'est porté. La nuance « sauf s'il est surpris » reste verbatim (état de combat non modélisé).
    effects: [
      {
        kind: 'stat-bonus',
        stat: 'def',
        value: { scale: 'stepped', by: 'path-rank', steps: [{ min: 1, value: 1 }, { min: 5, value: 2 }] },
      },
    ],
    damageReduction: {
      kind: 'flat',
      value: { scale: 'stepped', by: 'path-rank', steps: [{ min: 3, value: 3 }, { min: 4, value: 4 }, { min: 5, value: 5 }] },
      scopes: ['area'],
    },
    sourcePage: 88,
  },
  {
    id: 'bouclier-r4',
    name: 'Absorber un sort',
    pathId: 'bouclier',
    rank: 4,
    isSpell: false,
    actionTypes: [],
    text:
      'Lorsqu’il s’est préparé à parer un coup, le guerrier peut décider à la place d’absorber un sort. S’il réussit un test d’attaque au contact (il peut remplacer la FOR par l’AGI pour ce test) opposé à un test d’attaque magique du lanceur de sort, le sort est absorbé par le bouclier et n’a aucun effet sur le guerrier (mais s’il s’agit d’un sort de zone, les autres cibles sont affectées normalement).',
    sourcePage: 88,
  },
  {
    id: 'bouclier-r5',
    name: 'Renvoi de sort',
    pathId: 'bouclier',
    rank: 5,
    isSpell: false,
    actionTypes: ['G'],
    text:
      'Le guerrier peut décider de renvoyer un sort qu’il vient d’absorber grâce à sa capacité Absorber un sort. Au lieu d’être annulé, le sort absorbé est immédiatement retourné contre son expéditeur : le lanceur du sort subit alors les effets de sa propre attaque ! Cet effet ne fonctionne pas contre les sorts de zone.',
    // Rendu enrichi (PER-72) : « sa capacité Absorber un sort » → RÉFÉRENCE de capacité [&bouclier-r4]
    // (puce aux couleurs du guerrier, nom canonique « Absorber un sort »). Pas d'effet structuré.
    richText:
      'Le guerrier peut décider de renvoyer un sort qu’il vient d’absorber grâce à sa capacité [&bouclier-r4]. Au lieu d’être annulé, le sort absorbé est immédiatement retourné contre son expéditeur : le lanceur du sort subit alors les effets de sa propre attaque ! Cet effet ne fonctionne pas contre les sorts de zone.',
    sourcePage: 88,
  },

  // -- Guerrier : voie du combat (p. 88) ----------------------------------------
  {
    id: 'combat-r1',
    name: 'Vivacité',
    pathId: 'combat',
    rank: 1,
    isSpell: false,
    actionTypes: [],
    text:
      'Le guerrier gagne +3 en Initiative et aux tests d’AGI ou de FOR pour éviter d’être immobilisé ou renversé. De plus, une fois par combat, il obtient une action de mouvement supplémentaire à son tour.',
    // PER-72 : « +3 en Initiative » → bonus PERMANENT plat à l'Init. (stat-bonus). Le « +3 aux tests
    // d'AGI ou de FOR pour éviter d'être immobilisé ou renversé » est un bonus SITUATIONNEL à un test
    // de caractéristique (état de combat) → hors périmètre PER-89, verbatim. L'action de mouvement
    // supplémentaire relève du tracker de combat. Pas de jeton parsable (« +3 » plat, Init. auto-glosée).
    effects: [{ kind: 'stat-bonus', stat: 'initiative', value: 3 }],
    // « Une fois par combat » (action de mouvement suppl.) → compteur réinitialisé au repos court (PER-73/151).
    usageCounter: { max: 1, resetOn: 'combat', hideFromStatusPanel: true },
    sourcePage: 88,
  },
  {
    id: 'combat-r2',
    name: 'Manœuvre',
    pathId: 'combat',
    rank: 2,
    isSpell: false,
    actionTypes: [],
    text: 'Le guerrier obtient un dé bonus lorsqu’il exécute une manœuvre en combat.',
    sourcePage: 88,
  },
  {
    id: 'combat-r3',
    name: 'Attaque puissante',
    pathId: 'combat',
    rank: 3,
    isSpell: false,
    actionTypes: [],
    text:
      'Le guerrier peut choisir de s’imposer un dé malus sur une attaque au contact et il ajoute +2d4° aux DM. Cette capacité peut être utilisée avec Double attaque, Attaque circulaire ou Attaque parfaite (voir exemple). Transformez cette capacité en action limitée (L) pour obtenir +3d4° aux DM au lieu de +2d4°.',
    // Rendu enrichi (PER-72) : dés de DM {2d4°}/{3d4°}. Les capacités citées sont des RÉFÉRENCES :
    // Double attaque (combat-r4), Attaque circulaire (combat-r5) et Attaque parfaite (maitre-d-armes-r4)
    // → balisées [&id] (puces aux couleurs du guerrier). « (voir exemple) » renvoie à la note de la voie
    // (affichée). Le +2d4°/+3d4° aux DM d'arme n'est pas encore câblé au bloc Attaque au contact (PER-115).
    richText:
      'Le guerrier peut choisir de s’imposer un dé malus sur une attaque au contact et il ajoute +{2d4°} aux DM. Cette capacité peut être utilisée avec [&combat-r4], [&combat-r5] ou [&maitre-d-armes-r4] (voir exemple). Transformez cette capacité en action limitée (L) pour obtenir +{3d4°} aux DM au lieu de +{2d4°}.',
    sourcePage: 88,
  },
  {
    id: 'combat-r4',
    name: 'Double attaque',
    pathId: 'combat',
    rank: 4,
    isSpell: false,
    actionTypes: ['L'],
    text: 'Le guerrier fait deux attaques au contact durant son tour avec un malus de -2.',
    sourcePage: 88,
  },
  {
    id: 'combat-r5',
    name: 'Attaque circulaire',
    pathId: 'combat',
    rank: 5,
    isSpell: false,
    actionTypes: ['L'],
    text:
      'Le guerrier peut faire une attaque au contact avec un malus de -2 contre chaque adversaire engagé au contact avec lui (il fait un test d’attaque pour chaque adversaire).',
    sourcePage: 88,
  },

  // -- Guerrier : voie du maître d'armes (p. 88-89) ------------------------------
  {
    id: 'maitre-d-armes-r1',
    name: 'Armes de prédilection',
    pathId: 'maitre-d-armes',
    rank: 1,
    isSpell: false,
    actionTypes: [],
    // « lorsqu'il l'utilise une arme » : sic, coquille présente dans le livre.
    text:
      'Le guerrier choisit une catégorie d’armes de prédilection parmi épées, haches, mains nues, masses, lances (épieu, lance, pique) et enfin armes de jet (dague de lancer, javelot, etc.), et il gagne +1 en attaque lorsqu’il l’utilise une arme de cette catégorie. De plus, vous ajoutez votre rang + 2 à tous les tests destinés à estimer la valeur d’une arme ou la réputation martiale d’un adversaire.',
    // PER-66 : CHOIX d'option (6 catégories d'armes de prédilection). PER-89 : bonus de compétence
    // INCONDITIONNEL au domaine connaissance martiale (`martial-lore`, « estimer la valeur d'une arme
    // ou la réputation martiale d'un adversaire ») — « votre rang + 2 » → [rang + 2]. PER-226 : le +1 en
    // attaque est un effet `attack-bonus` conditionné aux familles de prédilection CHOISIES (ce même
    // choix, index 0) et à l'arme réellement portée (`weaponFamiliesFromChoice`) — contact OU distance
    // (arme de jet), câblage AUTOMATIQUE sans interrupteur, comme la Science du critique (PER-136).
    // PER-72 : le choix est RÉPÉTABLE et regroupe ICI tout le système d'armes de prédilection (lecture) :
    // `base: 1` = la catégorie de base (toujours, dès le rang 1) ; `requiresFeatureId: maitre-d-armes-r3`
    // débloque les picks supplémentaires (Spécialisation) — chaque voie de guerrier au rang 5 ajoute un
    // jalon dépensable en nouvelle catégorie (distincte) OU « +1 DM » (option `repeatable`, doublons
    // autorisés). Le système des jalons n'apparaît donc QUE si r3 est prise ET ≥1 voie au rang 5
    // (`budget > base`). Patron : « Langage des animaux » (animaux-r1).
    richText:
      'Le guerrier choisit une catégorie d’armes de prédilection parmi épées, haches, mains nues, masses, lances (épieu, lance, pique) et enfin armes de jet (dague de lancer, javelot, etc.), et il gagne +1 en attaque lorsqu’il l’utilise une arme de cette catégorie. De plus, vous ajoutez votre [rang + 2] à tous les tests destinés à estimer la valeur d’une arme ou la réputation martiale d’un adversaire.',
    choices: [
      {
        kind: 'option',
        prompt: 'Armes de prédilection',
        repeat: {
          by: 'paths-at-rank',
          classIds: ['guerrier'],
          rank: 5,
          base: 1,
          requiresFeatureId: 'maitre-d-armes-r3',
        },
        options: [
          { id: 'swords', label: 'Épées' },
          { id: 'axes', label: 'Haches' },
          { id: 'unarmed', label: 'Mains nues' },
          { id: 'maces', label: 'Masses' },
          { id: 'polearms', label: 'Lances (épieu, lance, pique)' },
          { id: 'thrown', label: 'Armes de jet (dague de lancer, javelot, etc.)' },
          { id: 'dm-bonus', label: '+1 DM (catégorie connue, via Spécialisation)', repeatable: true },
        ],
      },
    ],
    effects: [
      { kind: 'test-bonus', domains: ['martial-lore'] },
      // PER-226 : +1 en attaque avec une arme d'une famille de prédilection retenue (choix index 0).
      // Pas d'`attackMode` → s'applique au contact comme à distance (armes de jet). Actif d'après l'arme
      // portée (`weaponAttackBonuses`) : aucune famille retenue / arme hors familles → aucun bonus.
      {
        kind: 'attack-bonus',
        value: 1,
        condition: { weaponFamiliesFromChoice: { choiceFeatureId: 'maitre-d-armes-r1' } },
      },
    ],
    sourcePage: 88,
  },
  {
    id: 'maitre-d-armes-r2',
    name: 'Science du critique',
    pathId: 'maitre-d-armes',
    rank: 2,
    isSpell: false,
    actionTypes: [],
    text:
      'Le guerrier augmente de 1 point les chances d’obtenir un critique sur les attaques effectuées avec une arme de prédilection (par exemple, 19-20 au lieu de 20).',
    // PER-133/136 : élargissement de la plage de critique au CONTACT (+1 → 19-20), CONDITIONNÉ à une
    // arme de PRÉDILECTION en main. Câblage AUTOMATIQUE (PER-136) : `criticalRangeSources` active la
    // plage dès que l'arme de contact portée (`wornMeleeWeapon`) appartient à une des familles
    // choisies sur « Armes de prédilection » (`maitre-d-armes-r1`), sans interrupteur manuel. Affiché
    // en puce sous la carte Attaque au contact.
    criticalRange: {
      scope: 'melee',
      value: 1,
      weaponCondition: { kind: 'weaponFamiliesFromChoice', choiceFeatureId: 'maitre-d-armes-r1' },
    },
    sourcePage: 89,
  },
  {
    id: 'maitre-d-armes-r3',
    name: 'Spécialisation',
    pathId: 'maitre-d-armes',
    rank: 3,
    isSpell: false,
    actionTypes: [],
    text:
      'Lorsque le guerrier emploie une arme de prédilection, il gagne un bonus de +1 DM. Chaque fois que le personnage atteint le rang 5 dans une voie de guerrier, il peut choisir une nouvelle catégorie d’arme de prédilection (il gagne les avantages des rangs 1 à 3) ou décider d’augmenter de +1 le bonus aux DM d’une catégorie qu’il connaît déjà (pour un maximum de +6 pour un guerrier ayant atteint le rang 5 dans les cinq voies).',
    // PER-72 : cette capacité DÉBLOQUE les picks supplémentaires du choix « Armes de prédilection »
    // (maitre-d-armes-r1, `requiresFeatureId: maitre-d-armes-r3`) — catégories additionnelles + « +1 DM »
    // par voie de guerrier au rang 5. Le CHOIX est hébergé sur r1 (lecture regroupée du système de
    // prédilection), pas ici. PER-226 : le +DM (jusqu'à +6) est un `weapon-damage-bonus` PLAT = `base: 1`
    // (le +1 DM acquis dès r3, verbatim « il gagne un bonus de +1 DM ») + le nombre de « +1 DM »
    // (`dm-bonus`) retenus sur ce choix (index 0), plafonné à 6 (socle 1 + 5 voies au rang 5), appliqué
    // à l'arme portée si elle appartient à une famille de prédilection retenue. Agrégé à l'expression de
    // DM comme la carac de base. « avantages des rangs 1 à 3 » pour une catégorie additionnelle : le +1
    // att / la Science du critique suivent d'eux-mêmes l'arme portée (r1/r2 lisent les MÊMES familles).
    effects: [
      {
        kind: 'weapon-damage-bonus',
        flat: { featureId: 'maitre-d-armes-r1', choiceIndex: 0, optionId: 'dm-bonus', base: 1, max: 6 },
        condition: { weaponFamiliesFromChoice: { choiceFeatureId: 'maitre-d-armes-r1' } },
      },
    ],
    sourcePage: 89,
  },
  {
    id: 'maitre-d-armes-r4',
    name: 'Attaque parfaite',
    pathId: 'maitre-d-armes',
    rank: 4,
    isSpell: false,
    actionTypes: ['L'],
    text:
      'Vous obtenez un dé bonus en attaque au contact (ou à distance pour une arme de lancer) et ajoutez +1d4° DM. Vous devez utiliser une arme de prédilection. Éventuellement, le guerrier peut choisir de ne pas infliger les DM de son attaque parfaite pour désarmer une cible dont le NC est inférieur à son bonus de DM de spécialisation.',
    // Rendu enrichi (PER-72) : DM {1d4°}. « un dé bonus » au test d'attaque (situationnel) et le +1d4°
    // aux DM d'arme → câblage différé à PER-115 (verbatim). « NC … bonus de DM de spécialisation » :
    // comparaison de table (auto-glose NC). Pas d'effet structuré.
    richText:
      'Vous obtenez un dé bonus en attaque au contact (ou à distance pour une arme de lancer) et ajoutez +{1d4°} DM. Vous devez utiliser une arme de prédilection. Éventuellement, le guerrier peut choisir de ne pas infliger les DM de son attaque parfaite pour désarmer une cible dont le NC est inférieur à son bonus de DM de spécialisation.',
    sourcePage: 89,
  },
  {
    id: 'maitre-d-armes-r5',
    name: 'Riposte',
    pathId: 'maitre-d-armes',
    rank: 5,
    isSpell: false,
    actionTypes: ['G'],
    text:
      'Lorsqu’un adversaire rate une attaque de contact contre lui, le personnage obtient immédiatement une attaque au contact contre cet adversaire. Le personnage ne peut obtenir qu’une seule attaque supplémentaire de cette façon à chaque round et si plusieurs adversaires le ratent, il choisit contre lequel il effectue la riposte.',
    sourcePage: 89,
  },

  // -- Guerrier : voie de la résistance (p. 89-90) --------------------------------
  {
    id: 'resistance-r1',
    name: 'Robustesse',
    pathId: 'resistance',
    rank: 1,
    isSpell: false,
    actionTypes: [],
    text:
      'Le guerrier augmente sa valeur maximale de PV de rang + 2. De plus, vous ajoutez votre rang + 2 à tous les tests destinés à résister aux efforts physiques, à la chaleur ou au froid (conditions naturelles).',
    // PER-72 : « augmente sa valeur maximale de PV de rang + 2 » → bonus PERMANENT scalant aux PV
    // (= rang + 2), rendu quantité [=rang + 2] ; modélisé en stepped path-rank {1:3 … 5:7}. PER-89 :
    // bonus de compétence INCONDITIONNEL aux domaines résistance (`endurance`, « efforts physiques »),
    // chaleur (`heat-resistance`) et froid (`cold-resistance`) — « votre rang + 2 » → [rang + 2].
    richText:
      'Le guerrier augmente sa valeur maximale de PV de [=rang + 2]. De plus, vous ajoutez votre [rang + 2] à tous les tests destinés à résister aux efforts physiques, à la chaleur ou au froid (conditions naturelles).',
    effects: [
      {
        kind: 'stat-bonus',
        stat: 'maxHp',
        value: {
          scale: 'stepped',
          by: 'path-rank',
          steps: [
            { min: 1, value: 3 },
            { min: 2, value: 4 },
            { min: 3, value: 5 },
            { min: 4, value: 6 },
            { min: 5, value: 7 },
          ],
        },
      },
      { kind: 'test-bonus', domains: ['endurance', 'heat-resistance', 'cold-resistance'] },
    ],
    sourcePage: 89,
  },
  {
    id: 'resistance-r2',
    name: 'Résilient',
    pathId: 'resistance',
    rank: 2,
    isSpell: false,
    actionTypes: [],
    text:
      'Désormais, il suffit de 10 min au guerrier pour bénéficier des effets d’une récupération rapide (au lieu de 30 min) et cela passe à 5 min au rang 4 de la voie. De plus, le guerrier obtient un bonus égal au rang atteint dans la voie pour tous les tests destinés à résister aux états étourdi et affaibli.',
    // Rendu enrichi (PER-72) : « un bonus égal au rang atteint dans la voie » → terme nommé [#rang]
    // (déterminant « au »). PER-89 : bonus de compétence INCONDITIONNEL aux domaines résister à
    // l'étourdissement (`stun-resistance`) et à l'affaiblissement (`weakened-resistance`) — VALEUR
    // EXPLICITE = rang (et non « 2 + rang » de catégorie de voie) → stepped path-rank {1:1 … 5:5}.
    // Le raccourcissement du temps de récupération rapide (30→10→5 min) reste en prose (régime de
    // récupération, pas une stat dérivée).
    richText:
      'Désormais, il suffit de 10 min au guerrier pour bénéficier des effets d’une récupération rapide (au lieu de 30 min) et cela passe à 5 min au rang 4 de la voie. De plus, le guerrier obtient un bonus égal au [#rang] atteint dans la voie pour tous les tests destinés à résister aux états étourdi et affaibli.',
    effects: [
      {
        kind: 'test-bonus',
        domains: ['stun-resistance', 'weakened-resistance'],
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
    sourcePage: 90,
  },
  {
    id: 'resistance-r3',
    name: 'Armure lourde',
    pathId: 'resistance',
    rank: 3,
    isSpell: false,
    actionTypes: [],
    // L'astérisque renvoie à la note de bas de page (p. 90), reproduite à la fin.
    text:
      'Au choix le guerrier gagne +1 en DEF ou il apprend à porter l’armure de plaque (DEF +6) et désormais, il peut utiliser toutes les capacités de guerrier avec cette armure*.\n' +
      '* Dans le cas d’un profil hybride, le personnage apprend à utiliser une armure d’une catégorie au-dessus de celles autorisées par son profil principal et il peut désormais utiliser toutes les capacités de ce profil avec cette armure. Par exemple, un barbare qui choisit cette capacité peut désormais entrer en rage en portant une chemise de mailles.',
    // PER-66 : CHOIX entre deux bénéfices. (a) « +1 en DEF » → bonus PERMANENT plat à la DEF, porté par
    // l'option (`statBonuses`, comme l'option DR de l'Éclaireur du rôdeur). (b) « apprend à porter
    // l'armure de plaque (DEF +6) » → accès d'armure, dépendant de l'équipement porté → différé à la
    // milestone Armures (PER-76), d'où le badge WIP. La note de bas de page (« * », profil hybride :
    // relèvement d'un cran) reste verbatim, comme les déblocages d'armure du barbare/chevalier.
    choices: [
      {
        kind: 'option',
        prompt: 'Bénéfice de l’armure lourde',
        options: [
          { id: 'def-bonus', label: '+1 en DEF', shortLabel: '+1 DEF', statBonuses: [{ stat: 'def', value: 1 }] },
          { id: 'plate-armor', label: 'Port de l’armure de plaque (DEF +6)', shortLabel: 'Plaque' },
        ],
      },
    ],
    wip: "Option « port de l'armure de plaque » (accès d'armure + usage des capacités en plaque, relèvement d'un cran pour les hybrides) — effet armor-access à poser sur l'option (comme barbare/chevalier) — suivi : PER-236.",
    sourcePage: 90,
  },
  {
    id: 'resistance-r4',
    name: 'Constitution héroïque',
    pathId: 'resistance',
    rank: 4,
    isSpell: false,
    actionTypes: [],
    text:
      'Le guerrier augmente sa CON de +1. Désormais, il obtient un dé bonus aux tests de CON.',
    // Caractéristique héroïque (mécanique core) : +1 CON permanent + dé bonus aux tests de CON.
    effects: [
      { kind: 'ability-bonus', ability: 'CON', value: 1 },
      { kind: 'ability-bonus-die', ability: 'CON' },
    ],
    sourcePage: 90,
  },
  {
    id: 'resistance-r5',
    name: 'Dur à cuire',
    pathId: 'resistance',
    rank: 5,
    isSpell: false,
    actionTypes: [],
    text:
      'Le guerrier gagne +1 en DEF et, une fois par combat, lorsqu’il tombe à 0 PV, il peut encore agir un round avant de tomber inconscient. De plus, il ne subit plus de dé malus lorsqu’il est immobilisé et lorsqu’il est étourdi ; il peut encore attaquer, mais avec un dé malus.',
    // PER-72 : « +1 en DEF » → bonus PERMANENT plat à la DEF (stat-bonus, inconditionnel). Le sursis à
    // 0 PV (1×/combat) et l'absence de dé malus en état immobilisé/étourdi relèvent du tracker de
    // combat / des états (PER-104/105) → verbatim. Pas de jeton parsable (« +1 » plat).
    effects: [{ kind: 'stat-bonus', stat: 'def', value: 1 }],
    // « Une fois par combat » (sursis à 0 PV) → compteur réinitialisé au repos court (PER-73/151).
    usageCounter: { max: 1, resetOn: 'combat', hideFromStatusPanel: true },
    sourcePage: 90,
  },

  // -- Guerrier : voie du soldat (p. 90) ------------------------------------------
  {
    id: 'soldat-r1',
    name: 'Teigneux',
    pathId: 'soldat',
    rank: 1,
    isSpell: false,
    actionTypes: ['G'],
    text:
      'Une fois par round, si une créature à votre contact tente de s’éloigner de vous, vous obtenez une attaque au contact en action gratuite contre elle. De plus vous ajoutez votre rang + 2 aux tests destinés à résister à l’alcool et à la privation de nourriture ou de sommeil.',
    // Rendu enrichi (PER-72) : « votre rang + 2 » → [rang + 2]. PER-89 : bonus de compétence
    // INCONDITIONNEL au domaine résistance aux privations (`deprivation-resistance`, « alcool,
    // privation de nourriture ou de sommeil »). L'attaque d'opportunité gratuite (créature qui
    // s'éloigne) relève du tracker de combat → verbatim.
    richText:
      'Une fois par round, si une créature à votre contact tente de s’éloigner de vous, vous obtenez une attaque au contact en action gratuite contre elle. De plus vous ajoutez votre [rang + 2] aux tests destinés à résister à l’alcool et à la privation de nourriture ou de sommeil.',
    effects: [{ kind: 'test-bonus', domains: ['deprivation-resistance'] }],
    sourcePage: 90,
  },
  {
    id: 'soldat-r2',
    name: 'Prouesse',
    pathId: 'soldat',
    rank: 2,
    isSpell: false,
    actionTypes: ['G'],
    text:
      'Le guerrier réussit souvent des exploits physiques hors-norme. Une fois par round, vous pouvez sacrifier 1d4° PV pour obtenir +5 sur un test de FOR ou de CON. Vous pouvez annoncer l’utilisation de cette capacité après avoir pris connaissance du résultat du test de caractéristique.',
    // Rendu enrichi (PER-72) : coût en PV {1d4°}. Le « +5 sur un test de FOR ou de CON » est un bonus
    // SITUATIONNEL à un test de caractéristique (déclenché, optionnel) → hors périmètre PER-89, verbatim.
    richText:
      'Le guerrier réussit souvent des exploits physiques hors-norme. Une fois par round, vous pouvez sacrifier {1d4°} PV pour obtenir +5 sur un test de FOR ou de CON. Vous pouvez annoncer l’utilisation de cette capacité après avoir pris connaissance du résultat du test de caractéristique.',
    sourcePage: 90,
  },
  {
    id: 'soldat-r3',
    name: 'Piqûre de rappel',
    pathId: 'soldat',
    rank: 3,
    isSpell: false,
    actionTypes: ['G'],
    text:
      'Vous n’admettez pas qu’un adversaire vous ignore. Une fois par round, si un adversaire à votre contact attaque une autre créature que vous, vous obtenez une attaque en action gratuite contre lui. Si l’INT de cet adversaire est négative et que vous lui infligez des DM sur cette attaque, il vous prend automatiquement pour cible lors de sa prochaine attaque.',
    // Rendu enrichi (PER-72) : « l'INT de cet adversaire » = stat d'une CIBLE → référence non calculée
    // @INT (cf. format §5). L'attaque d'opportunité gratuite et la prise pour cible automatique relèvent
    // du tracker de combat. Pas d'effet structuré.
    richText:
      'Vous n’admettez pas qu’un adversaire vous ignore. Une fois par round, si un adversaire à votre contact attaque une autre créature que vous, vous obtenez une attaque en action gratuite contre lui. Si l’@INT de cet adversaire est négative et que vous lui infligez des DM sur cette attaque, il vous prend automatiquement pour cible lors de sa prochaine attaque.',
    sourcePage: 90,
  },
  {
    id: 'soldat-r4',
    name: 'Force héroïque',
    pathId: 'soldat',
    rank: 4,
    isSpell: false,
    actionTypes: [],
    text:
      'Le guerrier augmente sa FOR de +1. Désormais, il obtient un dé bonus aux tests de FOR.',
    // Caractéristique héroïque (mécanique core) : +1 FOR permanent + dé bonus aux tests de FOR.
    effects: [
      { kind: 'ability-bonus', ability: 'FOR', value: 1 },
      { kind: 'ability-bonus-die', ability: 'FOR' },
    ],
    sourcePage: 90,
  },
  {
    id: 'soldat-r5',
    name: 'Rempart',
    pathId: 'soldat',
    rank: 5,
    isSpell: false,
    actionTypes: [],
    text:
      'Vous pouvez désormais utiliser Teigneux contre un nombre d’adversaires égal à votre AGI + 2 à chaque round. Si vous réussissez cette attaque, le déplacement de votre adversaire est stoppé à l’endroit où vous l’avez attaqué. De plus vous gagnez +1 en DEF.',
    // Rendu enrichi (PER-72) : « Teigneux » → RÉFÉRENCE de capacité [&soldat-r1] (puce aux couleurs du
    // guerrier) ; « votre AGI + 2 » = nombre d'adversaires → TERME NOMMÉ [#AGI + 2] (substantif « AGI + 2 (4) »,
    // pas la valeur nue « votre 4 » : le déterminant « votre » réclame que la formule reste lisible). « +1 en
    // DEF » → bonus PERMANENT plat à la DEF (stat-bonus). L'arrêt du déplacement adverse relève du tracker.
    richText:
      'Vous pouvez désormais utiliser [&soldat-r1] contre un nombre d’adversaires égal à votre [#AGI + 2] à chaque round. Si vous réussissez cette attaque, le déplacement de votre adversaire est stoppé à l’endroit où vous l’avez attaqué. De plus vous gagnez +1 en DEF.',
    effects: [{ kind: 'stat-bonus', stat: 'def', value: 1 }],
    sourcePage: 90,
  },
];
