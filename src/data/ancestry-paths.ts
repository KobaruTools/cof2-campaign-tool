/**
 * Voies de peuple (chap. 3, p. 48-60) et voie du mage (p. 60).
 *
 * Textes de capacités verbatim (césures de fin de ligne du livre recollées).
 * Marqueurs relevés : `*` après le nom → `estSort`, lettres entre
 * parenthèses → `typesAction` ; le nom stocké est sans marqueurs.
 *
 * Rappel (p. 46) : le demi-elfe n'a pas de voie dédiée et choisit entre la
 * voie de l'humain et une des deux voies d'elfe — d'où sa présence dans les
 * `peupleIds` de ces trois voies.
 */

import type { Feature, AncestryPath, MagePath } from './schema';

// ---------------------------------------------------------------------------
// Voies de peuple
// ---------------------------------------------------------------------------

export const ancestryPaths: AncestryPath[] = [
  {
    id: 'demi-orc',
    name: 'Voie du demi-orc',
    type: 'ancestry',
    ancestryIds: ['demi-orc'],
    featureIds: ['demi-orc-r1', 'demi-orc-r2', 'demi-orc-r3', 'demi-orc-r4', 'demi-orc-r5'],
    sourcePage: 48,
  },
  {
    id: 'elfe-haut',
    name: 'Voie de l’elfe haut',
    type: 'ancestry',
    ancestryIds: ['elfe-haut', 'demi-elfe'],
    featureIds: ['elfe-haut-r1', 'elfe-haut-r2', 'elfe-haut-r3', 'elfe-haut-r4', 'elfe-haut-r5'],
    sourcePage: 50,
  },
  {
    id: 'elfe-sylvain',
    name: 'Voie de l’elfe sylvain',
    type: 'ancestry',
    ancestryIds: ['elfe-sylvain', 'demi-elfe'],
    featureIds: [
      'elfe-sylvain-r1',
      'elfe-sylvain-r2',
      'elfe-sylvain-r3',
      'elfe-sylvain-r4',
      'elfe-sylvain-r5',
    ],
    sourcePage: 52,
  },
  {
    id: 'gnome',
    name: 'Voie du gnome',
    type: 'ancestry',
    ancestryIds: ['gnome'],
    featureIds: ['gnome-r1', 'gnome-r2', 'gnome-r3', 'gnome-r4', 'gnome-r5'],
    sourcePage: 53,
  },
  {
    id: 'halfelin',
    name: 'Voie du halfelin',
    type: 'ancestry',
    ancestryIds: ['halfelin'],
    featureIds: ['halfelin-r1', 'halfelin-r2', 'halfelin-r3', 'halfelin-r4', 'halfelin-r5'],
    sourcePage: 55,
  },
  {
    id: 'humain',
    name: 'Voie de l’humain',
    type: 'ancestry',
    ancestryIds: ['humain', 'demi-elfe'],
    featureIds: ['humain-r1', 'humain-r2', 'humain-r3', 'humain-r4', 'humain-r5'],
    sourcePage: 57,
  },
  {
    id: 'nain',
    name: 'Voie du nain',
    type: 'ancestry',
    ancestryIds: ['nain'],
    featureIds: ['nain-r1', 'nain-r2', 'nain-r3', 'nain-r4', 'nain-r5'],
    sourcePage: 59,
  },
];

// ---------------------------------------------------------------------------
// Voie du mage — p. 60
// ---------------------------------------------------------------------------

export const magePath: MagePath = {
  id: 'mage',
  name: 'Voie du mage',
  type: 'mage',
  featureIds: ['mage-r1', 'mage-r2', 'mage-r3', 'mage-r4', 'mage-r5'],
  // Règles d'accès et de remplacement de la voie de peuple — p. 60 (verbatim).
  note:
    'Un personnage de la famille des mages (ensorceleur, forgesort, magicien, sorcier) peut choisir de remplacer sa voie de peuple par la voie du mage. Il renonce à ses racines en échange d’un plus grand pouvoir occulte.\n\n' +
    'Il ne conserve que la capacité de rang 1 de sa voie de peuple, acquise dès la création du personnage. Ce choix doit être fait avant d’obtenir le rang 2 de la voie de peuple et il est définitif. Désormais, le personnage ne peut plus obtenir de nouvelles capacités de sa voie de peuple.\n\n' +
    'Cette voie remplace la voie de peuple du personnage, elle occupe le même emplacement sur la fiche de personnage et son premier rang est gratuit comme n’importe quelle voie de peuple.',
  sourcePage: 60,
};

// ---------------------------------------------------------------------------
// Capacités
// ---------------------------------------------------------------------------

export const ancestryFeatures: Feature[] = [
  // --- Voie du demi-orc — p. 48 ------------------------------------------
  {
    id: 'demi-orc-r1',
    name: 'Impressionnant',
    pathId: 'demi-orc',
    rank: 1,
    isSpell: false,
    actionTypes: [],
    text:
      'Le demi-orc gagne un bonus de +3 à tous les tests d’intimidation. De plus, dans le noir total, le demi-orc voit comme dans la pénombre jusqu’à 30 m.',
    // Bonus de compétence (PER-89) : intimidation (FOR), domaine nommé inconditionnel ;
    // valeur +3 déduite de la catégorie « voie de peuple ». La vision dans le noir reste verbatim.
    effects: [{ kind: 'test-bonus', domains: ['intimidation'] }],
    sourcePage: 48,
  },
  {
    id: 'demi-orc-r2',
    name: 'Talent pour la violence',
    pathId: 'demi-orc',
    rank: 2,
    isSpell: false,
    actionTypes: [],
    text:
      'Le joueur choisit une capacité de rang 1 de n’importe quelle voie de barbare ou de guerrier.',
    choices: [
      {
        kind: 'feature-from-path',
        prompt: 'Capacité de rang 1 (voie de barbare ou de guerrier)',
        allowedRanks: [1],
        classIds: ['barbare', 'guerrier'],
      },
    ],
    sourcePage: 48,
  },
  {
    id: 'demi-orc-r3',
    name: 'Critique brutal',
    pathId: 'demi-orc',
    rank: 3,
    isSpell: false,
    actionTypes: [],
    text:
      'Le demi-orc augmente de 1 point la zone de critique sur une attaque au contact (19-20 au d20) et ajoute +1d4° aux DM en cas de critique.',
    // PER-133 : élargissement de la plage de critique au CONTACT (+1 → 19-20), inconditionnel
    // (s'applique à toute attaque au contact, comme Briseur d'os). Affiché en puce sous la carte
    // Attaque au contact. Le +1d4° de DM sur critique reste verbatim (DM non modélisés) → richText.
    richText:
      'Le demi-orc augmente de 1 point la zone de critique sur une attaque au contact (19-20 au d20) et ajoute +{1d4°} aux DM en cas de critique.',
    criticalRange: { scope: 'melee', value: 1 },
    sourcePage: 48,
  },
  {
    id: 'demi-orc-r4',
    name: 'Attaque sanglante',
    pathId: 'demi-orc',
    rank: 4,
    isSpell: false,
    actionTypes: ['L'],
    text:
      'Le demi-orc réalise une attaque de contact qui provoque une hémorragie. En plus des DM normaux, l’attaque produit un saignement qui inflige à la victime 1d4° DM à chaque round suivant jusqu’à ce que la cible soit soignée (tout effet de soins ou une action limitée utilisée à cet effet). On ne peut pas cumuler plusieurs effets de saignement.',
    // Rendu enrichi (PER-64) : DM de saignement « 1d4° » → dé évolutif {1d4°}. Le saignement
    // (durée, soins, non-cumul) reste verbatim (mécanique non modélisée).
    richText:
      'Le demi-orc réalise une attaque de contact qui provoque une hémorragie. En plus des DM normaux, l’attaque produit un saignement qui inflige à la victime {1d4°} DM à chaque round suivant jusqu’à ce que la cible soit soignée (tout effet de soins ou une action limitée utilisée à cet effet). On ne peut pas cumuler plusieurs effets de saignement.',
    sourcePage: 48,
  },
  {
    id: 'demi-orc-r5',
    name: 'Colosse',
    pathId: 'demi-orc',
    rank: 5,
    isSpell: false,
    actionTypes: [],
    text: 'Le demi-orc augmente ses valeurs de FOR et de CON de +1.',
    // Modificateurs PERMANENTS de caractéristique (PER-67) : +1 FOR, +1 CON.
    effects: [
      { kind: 'ability-bonus', ability: 'FOR', value: 1 },
      { kind: 'ability-bonus', ability: 'CON', value: 1 },
    ],
    sourcePage: 48,
  },

  // --- Voie de l'elfe haut — p. 50 ----------------------------------------
  {
    id: 'elfe-haut-r1',
    name: 'Lumière intérieure',
    pathId: 'elfe-haut',
    rank: 1,
    isSpell: false,
    actionTypes: [],
    text:
      'Pour un elfe, l’obscurité de la nuit sous la lumière des étoiles est considérée comme de la pénombre. De plus, il gagne un bonus de +3 à tous les tests d’érudition (INT) et artistiques (CHA).',
    // Bonus de compétence (PER-89) : érudition (INT) et art (CHA), domaines nommés annotés de
    // leur carac par le livre. Valeur +3 déduite de la catégorie « voie de peuple ». La vision
    // sous les étoiles reste verbatim.
    effects: [{ kind: 'test-bonus', domains: ['erudition', 'art'] }],
    sourcePage: 50,
  },
  {
    id: 'elfe-haut-r2',
    name: 'Force d’âme',
    pathId: 'elfe-haut',
    rank: 2,
    isSpell: false,
    actionTypes: [],
    text:
      'L’elfe est immunisé à la peur et au sommeil magique. De plus, il obtient un bonus égal à son rang lorsqu’il doit faire un test opposé d’attaque magique pour résister à un sort.',
    // PER-103 : immunités permanentes à la peur (`fear`) et au sommeil magique (`magic-sleep`,
    // ajouté pour cette voie). Rendu enrichi : « bonus égal à son rang » → terme nommé [#rang]
    // (le déterminant « son » réclame le mot). Ce bonus est SITUATIONNEL (résister à un sort) →
    // hors périmètre du bonus de compétence (PER-89), laissé verbatim côté moteur.
    richText:
      'L’elfe est immunisé à la peur et au sommeil magique. De plus, il obtient un bonus égal à son [#rang] lorsqu’il doit faire un test opposé d’attaque magique pour résister à un sort.',
    effects: [{ kind: 'immunity', immunities: ['fear', 'magic-sleep'] }],
    sourcePage: 50,
  },
  {
    id: 'elfe-haut-r3',
    name: 'Talent pour la magie',
    pathId: 'elfe-haut',
    rank: 3,
    isSpell: false,
    actionTypes: [],
    text:
      'Le joueur choisit une capacité de rang 1 de n’importe quelle voie de magicien ou d’ensorceleur. Il peut utiliser cette capacité en armure sans pénalité (mais pas une capacité qui offre un bonus de DEF). À la place, il peut choisir une capacité de rang 2, mais ne doit alors pas porter d’armure pour lancer le sort.',
    // « mais pas une capacité qui offre un bonus de DEF » → filtrage DUR du domaine
    // (`excludeDefBonus`) : sinon on empilerait Armure de mana / Murmures dans le vent /
    // Divination / Familier sur une armure physique (DEF ahurissante). Détection via
    // `featureGrantsDefBonus` (effets `def` plats ou conditionnels).
    // WIP (PER-144) : la variante « capacité de rang 2 → ne doit pas porter d'armure pour
    // lancer le sort » attend le modèle d'armure portée (milestone Armures et équipement porté).
    choices: [
      {
        kind: 'feature-from-path',
        prompt: 'Capacité de magicien ou d’ensorceleur (rang 1, ou rang 2 sans armure)',
        allowedRanks: [1, 2],
        classIds: ['magicien', 'ensorceleur'],
        excludeDefBonus: true,
      },
    ],
    wip: 'Variante rang 2 : « ne doit pas porter d’armure pour lancer le sort » — en attente du modèle d’armure portée (PER-144).',
    sourcePage: 50,
  },
  {
    id: 'elfe-haut-r4',
    name: 'Immortel',
    pathId: 'elfe-haut',
    rank: 4,
    isSpell: false,
    actionTypes: [],
    text:
      'L’elfe n’a besoin que de la moitié du repos, de la nourriture ou de la boisson d’un humain normal pour être en pleine forme. Il est immunisé aux effets des poisons et des maladies.',
    // PER-137 : immunité (kind 'immunity') aux poisons et aux maladies — même patron que Masque
    // mortuaire (sorcier). Le besoin réduit de repos/nourriture reste verbatim (non modélisé).
    damageReduction: { kind: 'immunity', scopes: ['poison', 'disease'] },
    sourcePage: 50,
  },
  {
    id: 'elfe-haut-r5',
    name: 'Supériorité elfique',
    pathId: 'elfe-haut',
    rank: 5,
    isSpell: false,
    actionTypes: [],
    text: 'L’elfe augmente sa valeur de VOL de +1 et sa valeur d’INT ou de CHA de +1.',
    // +1 VOL inconditionnel ; +1 à INT OU CHA au choix (PER-66/PER-67).
    effects: [
      { kind: 'ability-bonus', ability: 'VOL', value: 1 },
      { kind: 'ability-bonus-from-choice', choiceIndex: 0, value: 1 },
    ],
    choices: [{ kind: 'ability', allowed: ['INT', 'CHA'], prompt: 'Caractéristique à augmenter de +1 (INT ou CHA)' }],
    sourcePage: 50,
  },

  // --- Voie de l'elfe sylvain — p. 52 --------------------------------------
  {
    id: 'elfe-sylvain-r1',
    name: 'Lumière des étoiles',
    pathId: 'elfe-sylvain',
    rank: 1,
    isSpell: false,
    actionTypes: [],
    text:
      'Pour un elfe sylvain, l’obscurité de la nuit sous la lumière des étoiles est considérée comme de la pénombre. De plus, l’elfe gagne un bonus de +3 à tous les tests de survie en forêt (escalade, discrétion, chasse, etc.).',
    // Bonus de compétence (PER-89) : « survie en forêt » énumérée par ses exemples nommés —
    // escalade (`climbing`), discrétion (`stealth`), chasse (`hunting`). Le « etc. » ouvert reste
    // verbatim. Valeur +3 déduite de la catégorie « voie de peuple ». Vision sous les étoiles verbatim.
    effects: [{ kind: 'test-bonus', domains: ['climbing', 'stealth', 'hunting'] }],
    sourcePage: 52,
  },
  {
    id: 'elfe-sylvain-r2',
    name: 'Enfant de la forêt',
    pathId: 'elfe-sylvain',
    rank: 2,
    isSpell: false,
    actionTypes: [],
    text:
      'Le joueur choisit une capacité de rang 1 de n’importe quelle voie de druide ou de rôdeur. Il peut utiliser cette capacité en armure jusqu’à l’armure de cuir renforcé sans pénalité.',
    // Choix (PER-66) : capacité de rang 1 d'une voie de druide ou de rôdeur ; ses propres effets
    // comptent côté moteur une fois retenue. La tolérance d'armure (jusqu'au cuir renforcé) reste verbatim.
    choices: [
      {
        kind: 'feature-from-path',
        prompt: 'Capacité de rang 1 (voie de druide ou de rôdeur)',
        allowedRanks: [1],
        classIds: ['druide', 'rodeur'],
      },
    ],
    sourcePage: 52,
  },
  {
    id: 'elfe-sylvain-r3',
    name: 'Archer émérite',
    pathId: 'elfe-sylvain',
    rank: 3,
    isSpell: false,
    actionTypes: [],
    text:
      'L’elfe augmente de 1 la zone de critique lorsqu’il utilise un arc (19-20 au d20) et ajoute +1d4° aux DM en cas de critique. Il sait utiliser les arcs courts, quel que soit son profil.',
    // PER-133 : élargissement de la plage de critique à DISTANCE (+1 → 19-20), CONDITIONNÉ À L'ARME
    // (« lorsqu'il utilise un arc ») → suit un interrupteur manuel (conditional-stat-bonus marqueur
    // d'état) en attendant le câblage automatique au type d'arme porté (PER-136). Même patron que
    // maitre-d-armes-r2. Le +1d4° de DM sur critique et la maîtrise des arcs courts restent verbatim.
    richText:
      'L’elfe augmente de 1 la zone de critique lorsqu’il utilise un arc (19-20 au d20) et ajoute +{1d4°} aux DM en cas de critique. Il sait utiliser les arcs courts, quel que soit son profil.',
    effects: [
      {
        kind: 'conditional-stat-bonus',
        bonuses: [],
        activation: { kind: 'condition', label: 'arc en main' },
      },
    ],
    criticalRange: { scope: 'ranged', value: 1 },
    wip: "Plage de critique conditionnée à l'arc — activation manuelle en attendant le câblage automatique au type d'arme porté (PER-136).",
    sourcePage: 52,
  },
  {
    id: 'elfe-sylvain-r4',
    name: 'Flèche sanglante',
    pathId: 'elfe-sylvain',
    rank: 4,
    isSpell: false,
    actionTypes: ['L'],
    text:
      'L’elfe fait une attaque à distance qui provoque une hémorragie. En plus des DM normaux, la flèche produit un effet de saignement qui inflige à la victime 1d4° DM à chaque round suivant jusqu’à ce que la cible soit soignée (tout effet de soins ou une action limitée utilisée à cet effet). On ne peut cumuler plusieurs effets de saignement.',
    // Rendu enrichi (PER-64) : DM de saignement « 1d4° » → {1d4°}. Saignement non modélisé (verbatim).
    richText:
      'L’elfe fait une attaque à distance qui provoque une hémorragie. En plus des DM normaux, la flèche produit un effet de saignement qui inflige à la victime {1d4°} DM à chaque round suivant jusqu’à ce que la cible soit soignée (tout effet de soins ou une action limitée utilisée à cet effet). On ne peut cumuler plusieurs effets de saignement.',
    sourcePage: 52,
  },
  {
    id: 'elfe-sylvain-r5',
    name: 'Supériorité elfique',
    pathId: 'elfe-sylvain',
    rank: 5,
    isSpell: false,
    actionTypes: [],
    text: 'L’elfe augmente ses valeurs d’AGI et PER de +1.',
    // Modificateurs PERMANENTS de caractéristique : +1 AGI, +1 PER.
    effects: [
      { kind: 'ability-bonus', ability: 'AGI', value: 1 },
      { kind: 'ability-bonus', ability: 'PER', value: 1 },
    ],
    sourcePage: 52,
  },

  // --- Voie du gnome — p. 53-54 --------------------------------------------
  {
    id: 'gnome-r1',
    name: 'Don étrange',
    pathId: 'gnome',
    rank: 1,
    isSpell: false,
    actionTypes: [],
    text:
      'Le gnome possède un talent inné pour les sciences, qu’elles soient occultes ou plus ordinaires. Il gagne un bonus de +3 à tous les tests scientifiques (INT) et il choisit une capacité de rang 1 d’ensorceleur. S’il porte une armure, il ne peut pas utiliser ce sort plus d’une fois par jour (il doit payer le coût en PM de façon normale). Dans le noir total, le gnome voit comme dans la pénombre jusqu’à 10 m.',
    // Bonus de compétence (PER-89) : science (INT), domaine annoté de sa carac. Choix (PER-66) :
    // capacité de rang 1 d'ensorceleur. La limitation en armure et la vision dans le noir restent verbatim.
    effects: [{ kind: 'test-bonus', domains: ['science'] }],
    choices: [
      {
        kind: 'feature-from-path',
        prompt: 'Capacité de rang 1 (voie d’ensorceleur)',
        allowedRanks: [1],
        classIds: ['ensorceleur'],
      },
    ],
    sourcePage: 53,
  },
  {
    id: 'gnome-r2',
    name: 'Petit pote',
    pathId: 'gnome',
    rank: 2,
    isSpell: false,
    actionTypes: [],
    text:
      'Le gnome est un compagnon sympathique et difficile à considérer comme dangereux ou malintentionné. Il gagne +3 à tous les tests d’interaction sociale sauf pour intimider. Il gagne aussi 1 point de chance.',
    // Bonus de compétence (PER-89) : « tous les tests d'interaction sociale sauf intimider » →
    // énumération des domaines SOCIAUX (CHA) du catalogue. L'intimidation (FOR) est de fait exclue
    // (carac différente). Sont écartés les domaines de PRESTATION (art, musique, danse, mime,
    // jonglerie) et d'animaux (influence animale, dressage), qui ne sont pas de l'« interaction
    // sociale ». Valeur +3 déduite de la catégorie « voie de peuple ». +1 PC → stat-bonus luckPoints.
    effects: [
      {
        kind: 'test-bonus',
        domains: [
          'fast-talk',
          'seduction',
          'persuasion',
          'negotiation',
          'deception',
          'commerce',
          'etiquette',
          'haranguing',
          'preaching',
        ],
      },
      { kind: 'stat-bonus', stat: 'luckPoints', value: 1 },
    ],
    sourcePage: 54,
  },
  {
    id: 'gnome-r3',
    name: 'Insignifiant',
    pathId: 'gnome',
    rank: 3,
    isSpell: false,
    actionTypes: [],
    text:
      'Le gnome sait comment échapper aux attaques des grandes créatures comme les géants. Il gagne un bonus de +2 en DEF contre les créatures de taille grande ou supérieure. Ce bonus passe à +3 au rang 5.',
    // PER-67 : bonus de DEF CONDITIONNEL (contre les créatures de taille grande ou +), scalant
    // par rang de voie (+2 → +3 au rang 5). Interrupteur manuel (situation de jeu).
    effects: [
      {
        kind: 'conditional-stat-bonus',
        bonuses: [
          {
            stat: 'def',
            value: { scale: 'stepped', by: 'path-rank', steps: [{ min: 1, value: 2 }, { min: 5, value: 3 }] },
          },
        ],
        activation: { kind: 'condition', label: 'contre une créature de taille grande ou supérieure' },
      },
    ],
    sourcePage: 54,
  },
  {
    id: 'gnome-r4',
    name: 'Merveille technologique',
    pathId: 'gnome',
    rank: 4,
    isSpell: false,
    actionTypes: [],
    text:
      'Le gnome sait utiliser les arbalètes (et les armes à poudre si votre MJ autorise leur usage), quel que soit son profil. Il ajoute son AGI aux DM qu’il inflige avec ces armes.',
    sourcePage: 54,
  },
  {
    id: 'gnome-r5',
    name: 'Bonne nature',
    pathId: 'gnome',
    rank: 5,
    isSpell: false,
    actionTypes: [],
    text: 'Le gnome augmente ses valeurs de CON et de CHA de +1.',
    // Modificateurs PERMANENTS de caractéristique : +1 CON, +1 CHA.
    effects: [
      { kind: 'ability-bonus', ability: 'CON', value: 1 },
      { kind: 'ability-bonus', ability: 'CHA', value: 1 },
    ],
    sourcePage: 54,
  },

  // --- Voie du halfelin — p. 55-56 -----------------------------------------
  {
    id: 'halfelin-r1',
    name: 'Petite taille',
    pathId: 'halfelin',
    rank: 1,
    isSpell: false,
    actionTypes: [],
    text:
      'Le halfelin obtient un bonus de +1 en DEF et de +3 à tous les tests de discrétion ainsi qu’à tous les tests effectués pour subtiliser quelque chose (pickpocket, vol à l’étalage, etc.). En revanche, un halfelin ne peut pas utiliser à une main une arme dont les DM dépassent 1d6 (épée courte, masse, etc., mais pas rapière). Il lui faut utiliser les deux mains pour les armes qui infligent 1d8 à 1d10 de DM (épée longue) et il lui est interdit d’utiliser les armes qui infligent plus de 1d10 DM. Il ne peut pas utiliser d’arc long ni d’arbalète lourde.',
    // +1 DEF permanent (petite taille) → stat-bonus. Bonus de compétence (PER-89) : discrétion
    // (`stealth`) et subtilisation (`pickpocketing` — pickpocket/vol à l'étalage). Les restrictions
    // d'armes par taille restent verbatim (milestone Armures/équipement).
    effects: [
      { kind: 'stat-bonus', stat: 'def', value: 1 },
      { kind: 'test-bonus', domains: ['stealth', 'pickpocketing'] },
    ],
    sourcePage: 55,
  },
  {
    id: 'halfelin-r2',
    name: 'Résistance légendaire',
    pathId: 'halfelin',
    rank: 2,
    isSpell: false,
    actionTypes: [],
    text:
      'Le halfelin obtient un bonus égal à son rang à tous les tests opposés d’attaque magique effectués pour résister à un sort.',
    // Rendu enrichi : « bonus égal à son rang » → terme nommé [#rang]. Bonus SITUATIONNEL
    // (résister à un sort) → hors périmètre du bonus de compétence (PER-89), laissé verbatim côté moteur.
    richText:
      'Le halfelin obtient un bonus égal à son [#rang] à tous les tests opposés d’attaque magique effectués pour résister à un sort.',
    sourcePage: 55,
  },
  {
    id: 'halfelin-r3',
    name: 'Bon pour le moral',
    pathId: 'halfelin',
    rank: 3,
    isSpell: false,
    actionTypes: [],
    text:
      'Un halfelin qui mange bien est un halfelin heureux. À chaque repas (jusqu’à 4 fois par jour, espacés d’au moins 3 h) au cours duquel le personnage boit et mange des mets de qualité et en quantité, il récupère 1d4° PV.',
    // Rendu enrichi (PER-64) : « 1d4° PV » → {1d4°}. La récupération (repas, cadence) reste verbatim.
    richText:
      'Un halfelin qui mange bien est un halfelin heureux. À chaque repas (jusqu’à 4 fois par jour, espacés d’au moins 3 h) au cours duquel le personnage boit et mange des mets de qualité et en quantité, il récupère {1d4°} PV.',
    sourcePage: 55,
  },
  {
    id: 'halfelin-r4',
    name: 'Petit veinard',
    pathId: 'halfelin',
    rank: 4,
    isSpell: false,
    actionTypes: [],
    text:
      'Le halfelin gagne 1 PC supplémentaire. De plus, il peut esquiver une attaque de son choix par combat (avant d’avoir pris connaissance des DM, mais pas un critique).',
    // +1 PC permanent → stat-bonus luckPoints. L'esquive (une attaque par combat) reste verbatim.
    effects: [{ kind: 'stat-bonus', stat: 'luckPoints', value: 1 }],
    sourcePage: 56,
  },
  {
    id: 'halfelin-r5',
    name: 'Vif et bien nourri',
    pathId: 'halfelin',
    rank: 5,
    isSpell: false,
    actionTypes: [],
    text: 'Le halfelin augmente ses valeurs d’AGI et de CON de +1.',
    // Modificateurs PERMANENTS de caractéristique : +1 AGI, +1 CON.
    effects: [
      { kind: 'ability-bonus', ability: 'AGI', value: 1 },
      { kind: 'ability-bonus', ability: 'CON', value: 1 },
    ],
    sourcePage: 56,
  },

  // --- Voie de l'humain — p. 57 (liste d'origines p. 57, suite et exemple
  // p. 58, rattachés au rang 1 qui y renvoie : « voir ci-dessous ») ---------
  {
    id: 'humain-r1',
    name: 'Diversité',
    pathId: 'humain',
    rank: 1,
    isSpell: false,
    actionTypes: [],
    text:
      'Un humain obtient un bonus de +3 aux tests de deux domaines associés à son origine géographique ou sociale (voir ci-dessous). De plus, il gagne 1 PC supplémentaire.\n\n' +
      'Origine géographique ou sociale (choisissez ou lancez un d6) :\n' +
      '1. Montagnard (escalade et résistance au froid).\n' +
      '2. Citadin (commerce et résistance aux maladies).\n' +
      '3. Campagnard (météorologie et équitation).\n' +
      '4. Riverain (natation et navigation).\n' +
      '5. Sauvage (chasser et pister).\n' +
      '6. Nomade (orientation et résistance à la chaleur ou au froid).\n\n' +
      'Le MJ peut en inventer d’autres selon les cultures présentes dans son univers de jeu (troglodyte, marais, etc.). Éventuellement, le joueur peut remplacer un des bonus d’origine géographique par un bonus en relation avec son origine sociale ou un gagne-pain de son choix (serrurier, forgeron, scribe, maçon, chasseur, cuisinier, acrobate, pickpocket, bibliothécaire, étudiant, etc.). Le gagne-pain ne peut pas être un profil et le bonus obtenu ne s’applique jamais à des tests de combat.\n\n' +
      'Exemple : Un citadin étudiant en magie pourrait obtenir un bonus de +3 aux tests de commerce et +3 aux tests d’érudition occulte, même si son personnage est finalement devenu guerrier.',
    // Part plate inconditionnelle : +1 PC (`luckPoints`). Le +3 aux deux domaines de
    // l'origine relève du bonus de compétence (PER-89) : chaque option porte ses deux
    // domaines (`testBonusDomains`) ; la valeur (+3) est déduite de la catégorie « voie de
    // peuple ». L'agrégation est faite par `testBonusSources`. La saisie LIBRE d'un
    // gagne-pain et le remplacement d'un domaine d'origine (p. 57) relèvent de PER-68.
    effects: [{ kind: 'stat-bonus', stat: 'luckPoints', value: 1 }],
    choices: [
      {
        kind: 'option',
        prompt: 'Origine géographique ou sociale',
        options: [
          { id: 'highlander', label: 'Montagnard (escalade et résistance au froid)', testBonusDomains: ['climbing', 'cold-resistance'] },
          { id: 'city-dweller', label: 'Citadin (commerce et résistance aux maladies)', testBonusDomains: ['commerce', 'disease-resistance'] },
          { id: 'countryman', label: 'Campagnard (météorologie et équitation)', testBonusDomains: ['meteorology', 'riding'] },
          { id: 'riverfolk', label: 'Riverain (natation et navigation)', testBonusDomains: ['swimming', 'navigation'] },
          { id: 'wildling', label: 'Sauvage (chasser et pister)', testBonusDomains: ['hunting', 'tracking'] },
          { id: 'nomad', label: 'Nomade (orientation et résistance à la chaleur ou au froid)', testBonusDomains: ['orientation', 'heat-resistance'] },
        ],
      },
    ],
    sourcePage: 57,
  },
  {
    id: 'humain-r2',
    name: 'Instinct de survie',
    pathId: 'humain',
    rank: 2,
    isSpell: false,
    actionTypes: [],
    text:
      'Une fois par combat, lorsqu’une attaque devrait amener l’humain à 0 PV, les DM qu’elle inflige sont divisés par 2 (minimum 1). Après avoir bénéficié de cette capacité, l’humain gagne pour le reste du combat un bonus de +2 en DEF.',
    // PER-67 : +2 DEF TEMPORAIRE (« pour le reste du combat », une fois la capacité déclenchée) →
    // conditional-stat-bonus, interrupteur manuel. La division des DM par 2 (déclenchement ponctuel
    // à 0 PV, une fois par combat) reste verbatim — ce n'est pas une RD permanente.
    effects: [
      {
        kind: 'conditional-stat-bonus',
        bonuses: [{ stat: 'def', value: 2 }],
        activation: { kind: 'temporary', label: 'Instinct de survie déclenché ce combat' },
      },
    ],
    sourcePage: 57,
  },
  {
    id: 'humain-r3',
    name: 'Touche-à-tout',
    pathId: 'humain',
    rank: 3,
    isSpell: false,
    actionTypes: [],
    text:
      'Le personnage obtient une capacité de rang 1 ou 2 de n’importe quel profil au choix du joueur. Si la capacité est de rang 2 ou accorde un bonus de DEF, il doit respecter les limitations d’armure.',
    choices: [
      {
        kind: 'feature-from-path',
        prompt: 'Capacité de rang 1 ou 2 (n’importe quel profil)',
        allowedRanks: [1, 2],
      },
    ],
    sourcePage: 57,
  },
  {
    id: 'humain-r4',
    name: 'Loup parmi les loups',
    pathId: 'humain',
    rank: 4,
    isSpell: false,
    actionTypes: [],
    text:
      'Une fois par round, l’humain gagne +1d4° aux DM qu’il inflige lorsqu’il combat un adversaire humanoïde de taille moyenne. Ce bonus ne s’applique qu’aux DM initiaux d’une attaque, pas aux DM sur la durée.',
    // Rendu enrichi (PER-64) : « +1d4° aux DM » → {1d4°}. Le bonus de DM (conditionnel à la cible)
    // n'est pas un bonus de stat → reste verbatim côté moteur.
    richText:
      'Une fois par round, l’humain gagne +{1d4°} aux DM qu’il inflige lorsqu’il combat un adversaire humanoïde de taille moyenne. Ce bonus ne s’applique qu’aux DM initiaux d’une attaque, pas aux DM sur la durée.',
    sourcePage: 57,
  },
  {
    id: 'humain-r5',
    name: 'Polyvalence',
    pathId: 'humain',
    rank: 5,
    isSpell: false,
    actionTypes: [],
    text: 'Le personnage augmente sa caractéristique la plus faible de +1 et sa Volonté de +1.',
    // +1 VOL inconditionnel ; +1 à la caractéristique la plus faible au choix (PER-66/PER-67).
    effects: [
      { kind: 'ability-bonus', ability: 'VOL', value: 1 },
      { kind: 'ability-bonus-from-choice', choiceIndex: 0, value: 1 },
    ],
    choices: [
      {
        kind: 'ability',
        lowestHint: true,
        prompt: 'Caractéristique à augmenter de +1 (la plus faible, choisir en cas d’égalité)',
      },
    ],
    sourcePage: 57,
  },

  // --- Voie du nain — p. 59-60 ---------------------------------------------
  {
    id: 'nain-r1',
    name: 'Habitant des tunnels',
    pathId: 'nain',
    rank: 1,
    isSpell: false,
    actionTypes: [],
    text:
      'Dans le noir total, le nain voit comme dans la pénombre jusqu’à 30 m. De plus, il obtient un bonus de +3 à tous les tests en rapport avec la pierre, l’architecture ou les mines ainsi qu’avec les passages secrets et les pièges dans les murs et les parois rocheuses.',
    // Bonus de compétence (PER-89) : domaines de pierre énumérés — pierre/architecture
    // (`masonry`), mines (`mining`) et la détection STONE-spécifique des passages secrets et pièges
    // dans la roche (`stone-secrets`, distincte des `searching`/`trap-detection` génériques pour ne
    // pas déborder hors contexte rocheux). Valeur +3 déduite de la catégorie « voie de peuple ».
    // La vision dans le noir reste verbatim.
    effects: [{ kind: 'test-bonus', domains: ['masonry', 'mining', 'stone-secrets'] }],
    sourcePage: 59,
  },
  {
    id: 'nain-r2',
    name: 'Haches et marteaux',
    pathId: 'nain',
    rank: 2,
    isSpell: false,
    actionTypes: [],
    text:
      'Le nain gagne un bonus de +1 en attaque et aux DM lorsqu’il utilise une hache ou un marteau de guerre. Il sait utiliser ces armes, quel que soit son profil.',
    sourcePage: 59,
  },
  {
    id: 'nain-r3',
    name: 'Résistance à la magie',
    pathId: 'nain',
    rank: 3,
    isSpell: false,
    actionTypes: [],
    text:
      'Une fois par jour, le nain peut choisir d’ignorer les effets d’un sort qui le prend pour cible (mais pas un sort de zone). Les créatures dont le niveau (NC) est au moins égal au double du nain ignorent cette capacité.',
    sourcePage: 59,
  },
  {
    id: 'nain-r4',
    name: 'Fils du roc',
    pathId: 'nain',
    rank: 4,
    isSpell: false,
    actionTypes: [],
    text:
      'Le nain réduit tous les DM subis de 2 points (mais il subit toujours au moins 1 DM par attaque reçue). La réduction passe à 3 au niveau 10. Elle est cumulable avec d’autres sources de réduction des DM comme la peau d’acier du barbare.',
    // PER-137 : RD permanente plate sur TOUS les DM, scalante par NIVEAU (2 → 3 au niveau 10). Le
    // plancher « au moins 1 DM » et le cumul explicite restent verbatim (non modélisés).
    damageReduction: {
      kind: 'flat',
      value: { scale: 'stepped', by: 'level', steps: [{ min: 1, value: 2 }, { min: 10, value: 3 }] },
    },
    sourcePage: 59,
  },
  {
    id: 'nain-r5',
    name: 'Ténacité',
    pathId: 'nain',
    rank: 5,
    isSpell: false,
    actionTypes: [],
    text: 'Le nain augmente ses valeurs de CON et de VOL de +1.',
    // Modificateurs PERMANENTS de caractéristique : +1 CON, +1 VOL.
    effects: [
      { kind: 'ability-bonus', ability: 'CON', value: 1 },
      { kind: 'ability-bonus', ability: 'VOL', value: 1 },
    ],
    sourcePage: 60,
  },

  // --- Voie du mage — p. 60 -------------------------------------------------
  {
    id: 'mage-r1',
    name: 'Capacité de peuple + occultisme',
    pathId: 'mage',
    rank: 1,
    isSpell: false,
    actionTypes: [],
    text:
      'Le mage conserve sa capacité de peuple de rang 1. De plus, il ajoute son rang + 2 aux tests de connaissance et d’érudition en rapport avec la magie.',
    // Bonus de compétence (PER-89) : érudition occulte (`occult-lore`). La voie du mage est de
    // catégorie « peuple » (déduction = +3 fixe), MAIS le texte impose « rang + 2 » → on OVERRIDE
    // la valeur explicitement (stepped par rang de voie = 2 + rang). Rendu enrichi : « rang + 2 »
    // → formule [rang + 2]. « conserve sa capacité de peuple de rang 1 » est une règle d'accès (verbatim).
    richText:
      'Le mage conserve sa capacité de peuple de rang 1. De plus, il ajoute son [rang + 2] aux tests de connaissance et d’érudition en rapport avec la magie.',
    effects: [
      {
        kind: 'test-bonus',
        domains: ['occult-lore'],
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
    ],
    sourcePage: 60,
  },
  {
    id: 'mage-r2',
    name: 'Maîtrise de la magie',
    pathId: 'mage',
    rank: 2,
    isSpell: true,
    actionTypes: ['L'],
    text:
      'Le mage peut détecter la présence de magie (y compris la présence d’objets magiques) dans un rayon de 10 m. Un test d’INT difficulté [10 + rang du sort] permet de déterminer la fonction générale de l’enchantement. Il peut aussi tenter de dissiper un sort non permanent d’un rang maximal égal à ceux qu’il est capable de lancer en emportant un test opposé d’attaque magique contre l’auteur du sort.',
    sourcePage: 60,
  },
  {
    id: 'mage-r3',
    name: 'Tour de magie',
    pathId: 'mage',
    rank: 3,
    isSpell: true,
    actionTypes: ['G'],
    text:
      'Le mage peut réaliser un tour de magie (portée 10 m) par round en action gratuite sans dépenser aucun PM. Par exemple, fermer une porte à distance, éteindre ou allumer une bougie en claquant des doigts. Il ne peut réaliser aucune action qui nécessite une valeur de caractéristique supérieure à 0 (par exemple, s’il faut au moins +1 ou un test de FOR pour pousser une porte lourde, ce sort ne permet pas de la fermer). Cette capacité ne peut produire aucun DM direct. De plus, le mage gagne +1 en DEF et +2 PM (en plus de celui gagné avec cette capacité ; au total, en apprenant ce sort, le mage acquiert donc 3 PM d’un coup).',
    // Bonus permanents inconditionnels (PER-63) : +1 DEF et +2 PM. Le +1 PM « gagné avec cette
    // capacité » est automatique (sort connu de plus, compté par le moteur), d'où le total de 3 PM
    // signalé par le livre ; on ne modélise donc QUE le +2 explicite. Le tour de magie reste verbatim.
    effects: [
      { kind: 'stat-bonus', stat: 'def', value: 1 },
      { kind: 'stat-bonus', stat: 'manaPoints', value: 2 },
    ],
    sourcePage: 60,
  },
  {
    id: 'mage-r4',
    name: 'Esprit supérieur',
    pathId: 'mage',
    rank: 4,
    isSpell: false,
    actionTypes: [],
    text:
      'Le mage augmente son INT et sa VOL de +1. Désormais, il obtient un dé bonus aux tests d’INT.',
    // +1 INT, +1 VOL (modificateurs permanents) ; dé bonus PERMANENT aux tests d'INT (ability-bonus-die).
    effects: [
      { kind: 'ability-bonus', ability: 'INT', value: 1 },
      { kind: 'ability-bonus', ability: 'VOL', value: 1 },
      { kind: 'ability-bonus-die', ability: 'INT' },
    ],
    sourcePage: 60,
  },
  {
    id: 'mage-r5',
    name: 'Tempête de mana',
    pathId: 'mage',
    rank: 5,
    isSpell: false,
    actionTypes: [],
    text:
      'Lorsqu’il lance un sort, le mage peut augmenter les DM de +1d4° (en cas de DM sur la durée, une seule fois) en payant +1 PM pour un sort à cible unique ou +3 PM pour un sort de zone (Explosion de feu, Foudre, etc.).',
    // Rendu enrichi (PER-64) : « +1d4° » → {1d4°}. Le surcoût en PM (dynamique, au choix) reste verbatim.
    richText:
      'Lorsqu’il lance un sort, le mage peut augmenter les DM de +{1d4°} (en cas de DM sur la durée, une seule fois) en payant +1 PM pour un sort à cible unique ou +3 PM pour un sort de zone (Explosion de feu, Foudre, etc.).',
    sourcePage: 60,
  },
];
