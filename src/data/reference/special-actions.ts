/**
 * AIDE-MÉMOIRE — ACTIONS SPÉCIALES DE COMBAT (extraction PER-40).
 *
 * Actions et situations particulières du chapitre « Le combat » : surprise / embuscade (p. 208-209),
 * modes de déplacement (sprinter, nager, ramper/escalader, p. 211-212), conditions particulières
 * (combat à deux armes, confiné, monté, aquatique, p. 215) et retarder son tour (p. 216). Texte `body`
 * recopié VERBATIM ; les tests de résolution sont isolés dans `test` quand la règle en prévoit un.
 */

import type { ReferenceTextEntry } from './schema';

const SUBSECTION = 'special-actions';

/** Actions et conditions spéciales de combat (chapitre p. 208-216). */
export const SPECIAL_ACTIONS: ReferenceTextEntry[] = [
  {
    kind: 'text',
    id: 'tendre-une-embuscade',
    title: 'Tendre une embuscade',
    section: 'combat',
    subsection: SUBSECTION,
    tags: ['embuscade', 'surprise', 'PER', 'vigilance'],
    sourcePage: 208,
    shortEffect: 'Les cibles ratant leur test de PER (Vigilance) débutent le combat surprises.',
    body: `Les cibles de l’embuscade doivent effectuer un test de PER (Vigilance) difficulté [10 + AGI des assaillants embusqués] (pas de pénalité d’armure). Chaque protagoniste qui rate son test de PER est surpris lors du premier round de combat (pas d’action possible et -5 en DEF au premier tour de combat). La difficulté correspond à une embuscade tendue en forêt à une dizaine de mètres de distance. Le MJ peut modifier cette difficulté en fonction de la distance et de l’environnement, et les créatures qui bénéficient d’un bonus de discrétion l’ajoutent à la difficulté. Dans le cas où les embusqués possèdent des bonus d’AGI ou de discrétion différents, comparez le résultat du test de PER à chaque seuil de difficulté pour déterminer qui est surpris par rapport à qui.`,
    test: 'Test de PER (Vigilance), difficulté 10 + AGI des assaillants embusqués (pas de pénalité d’armure)',
  },
  {
    kind: 'text',
    id: 'approche-discrete',
    title: 'Tenter une approche discrète',
    section: 'combat',
    subsection: SUBSECTION,
    tags: ['surprise', 'discrétion', 'AGI', 'attaque sournoise'],
    sourcePage: 209,
    shortEffect: 'En cas de réussite, le défenseur débute le combat surpris.',
    body: `Dans la situation où l’attaquant essaie de s’approcher discrètement du défenseur pour lui porter une attaque par surprise, le MJ peut demander un test d’AGI (Discrétion) opposé à un test de PER (Vigilance). Par exemple, pour déterminer si un voleur réussit à s’approcher de sa cible afin de lui infliger une attaque sournoise. En cas de réussite, le défenseur débute le combat surpris.`,
    test: 'Test opposé d’AGI (Discrétion) contre PER (Vigilance)',
  },
  {
    kind: 'text',
    id: 'sprinter',
    title: 'Sprinter',
    section: 'combat',
    subsection: SUBSECTION,
    tags: ['déplacement', 'sprint', 'course', 'AGI'],
    sourcePage: 211,
    shortEffect: 'Parcourt 3× la distance en ligne droite ; -5 en DEF et dé malus à tous les tests jusqu’au prochain round.',
    body: `Si un personnage ou une créature veut se déplacer en ligne droite plus rapidement en sacrifiant toute précaution, utilisez l’action Sprinter.

Sprinter (L) : le personnage se déplace en ligne droite et parcourt trois fois la distance parcourue par une action de mouvement (soit 30 m pour la plupart des créatures). Il perd 5 en DEF et subit un dé malus à tous ses tests jusqu’à son prochain round. Il peut faire un test d’AGI (course) difficulté 10 (avec malus d’armure) pour parcourir 10 m de plus (pas de dé malus pour ce test). Le MJ peut lui imposer un malus supplémentaire selon les conditions : sac à dos, arme encombrante tenue en main, nature du terrain, maintien du sprint, etc.`,
    test: 'Test d’AGI (course) difficulté 10 (avec malus d’armure) pour parcourir 10 m de plus',
  },
  {
    kind: 'text',
    id: 'nager',
    title: 'Nager',
    section: 'combat',
    subsection: SUBSECTION,
    tags: ['déplacement', 'nage', 'aquatique'],
    sourcePage: 212,
    shortEffect: 'Déplacement de 5 m par action de mouvement (sauf créatures aquatiques).',
    body: `Un personnage qui nage se déplace seulement de 5 m par action de mouvement (les créatures aquatiques n’ont pas cette pénalité).`,
  },
  {
    kind: 'text',
    id: 'ramper-escalader',
    title: 'Ramper ou escalader',
    section: 'combat',
    subsection: SUBSECTION,
    tags: ['déplacement', 'ramper', 'escalade'],
    sourcePage: 212,
    shortEffect: 'Déplacement de 3 m par action de mouvement.',
    body: `Un personnage qui rampe au sol ou qui escalade une paroi se déplace de 3 m par action de mouvement.`,
  },
  {
    kind: 'text',
    id: 'combat-a-deux-armes',
    title: 'Combat à deux armes',
    section: 'combat',
    subsection: SUBSECTION,
    tags: ['deux armes', 'action limitée', 'dé malus'],
    sourcePage: 215,
    shortEffect: 'Action limitée : deux attaques à dé malus, DM normaux ; main faible ≤ 1d6 DM.',
    body: `Combat à deux armes (L) : attaquer avec une arme dans chaque main est une action limitée. Chacune des deux attaques subit un dé malus au test d’attaque et inflige des DM normaux. Un combattant à deux armes doit manier une arme peu encombrante dans sa main faible (maxi 1d6 DM). Certains profils proposent des capacités qui permettent d’améliorer les conditions du combat à deux armes.`,
  },
  {
    kind: 'text',
    id: 'combat-confine',
    title: 'Combat confiné',
    section: 'combat',
    subsection: SUBSECTION,
    tags: ['espace confiné', 'armes à deux mains', 'taille'],
    sourcePage: 215,
    shortEffect: 'En espace exigu : armes à deux mains impossibles, dé malus aux armes plus longues qu’une dague.',
    body: `Combat confiné : si les PJ combattent dans un espace confiné prévu pour des créatures de taille petite (gobelins, kobolds), l’utilisation d’armes à deux mains devient impossible et les armes plus longues qu’une dague infligent un dé malus en attaque. Les créatures de taille petite ou inférieure ne souffrent pas de ces pénalités.`,
  },
  {
    kind: 'text',
    id: 'combat-monte',
    title: 'Combat monté',
    section: 'combat',
    subsection: SUBSECTION,
    tags: ['monture', 'cavalier', 'cheval'],
    sourcePage: 215,
    shortEffect: 'Monter est une action de mouvement ; un cheval de selle inflige un dé malus au cavalier en combat.',
    body: `Combat monté : monter à cheval est une action de mouvement. Le cheval de selle est un animal peureux qui inflige un dé malus au cavalier s’il doit combattre en selle. Il faut un cheval de guerre pour participer à un combat sans pénalité. La voie du cavalier permet d’obtenir des avantages supplémentaires (comme faire attaquer la monture de façon indépendante).

La monture agit à l’initiative de son cavalier mais, si un personnage descend de sa monture, elle peut s’activer à sa propre initiative au round suivant. Lorsqu’il est en selle, le cavalier doit utiliser ses propres actions pour faire agir sa monture. Autrement dit, le couple cavalier et monture s’active à l’Initiative du cavalier et dispose du même nombre d’actions qu’un personnage normal (sauf exception provenant de la voie du cavalier). Si une action de mouvement est utilisée pour la monture, le personnage monté se déplace à la vitesse de la monture (y compris en vol si la monture en dispose). Un personnage et sa monture sont attaqués séparément, ce sont les attaquants qui décident qui attaquer. Cavalier et monture sont touchés séparément par les attaques de zone.`,
  },
  {
    kind: 'text',
    id: 'combat-aquatique',
    title: 'Combat en milieu aquatique',
    section: 'combat',
    subsection: SUBSECTION,
    tags: ['aquatique', 'immergé', 'natation', 'CON', 'suffocation'],
    sourcePage: 215,
    shortEffect: 'Immergé : déplacements ÷2, dé malus en attaque, -5 en DEF ; suffocation via test de CON (Natation).',
    body: `Combat en milieu aquatique : lorsqu’elles combattent complètement immergées, les créatures qui ne sont pas adaptées au combat aquatique (comme les PJ) divisent leurs déplacements par deux et subissent un dé malus en attaque et -5 en DEF.

Nous laissons à la discrétion du MJ la possibilité d’être plus sévère avec certaines armes (quid de l’efficacité d’une masse sous l’eau…).

Lorsqu’un PJ combat sous l’eau sans reprendre sa respiration, il doit faire un test de CON (Natation) difficulté 10 à chaque round. En cas d’échec, il perd 1 PV à cause de la suffocation. La difficulté du test et le nombre de PV perdus augmentent de 1 point à chaque round tant que le PJ ne reprend pas sa respiration. N’oubliez pas que le malus d’armure (généralement égal à la DEF, sauf pour une armure magique) s’ajoute à la difficulté.

Vous pouvez considérer qu’une créature aquatique a un NC augmenté de 1 lorsqu’elle est combattue dans son milieu naturel.`,
    test: 'Test de CON (Natation) difficulté 10 par round (difficulté et PV perdus +1 par round tant que la respiration n’est pas reprise ; le malus d’armure s’ajoute à la difficulté)',
  },
  {
    kind: 'text',
    id: 'retarder-son-tour',
    title: 'Retarder son tour',
    section: 'combat',
    subsection: SUBSECTION,
    tags: ['initiative', 'tour', 'timing'],
    sourcePage: 216,
    shortEffect: 'Agir après une créature à plus faible initiative ; retour à l’initiative normale au prochain round.',
    body: `Un personnage ou une créature peut choisir de retarder le moment où il va agir pour jouer après une créature avec une plus faible initiative. Le personnage retrouve son initiative normale au prochain round. À l’inverse, une créature lente ne peut pas décider de jouer après une créature plus rapide si celle-ci ne le veut pas.

Cette règle permet aux protagonistes les plus rapides de bénéficier de l’avantage d’attaquer en premier, en laissant les adversaires venir à eux en dépensant une action de mouvement, lorsque le combat débute à distance.`,
  },
];
