/**
 * AIDE-MÉMOIRE — RÉSOLUTION DE LA MAGIE (extraction PER-41, section 'resolution').
 *
 * Chapitre 3 « Magie et sorts » du livre de base (p. 227-229) : lancer un sort (incantation, magie profane /
 * divine), dépense de points de mana, concentration accrue, brûlure de mana, effets (niveau des cibles, sorts
 * de zone), rendement décroissant, durée du sort, magicien inconscient, mettre fin à un sort, récupération des
 * PM, magicien sans grimoire. `body` recopié VERBATIM ; `sourcePage` = page imprimée.
 *
 * Toutes les entrées sont des `ReferenceTextEntry` (le chapitre magie ne comporte pas de tableau).
 */

import type { ReferenceTextEntry } from './schema';

const SUBSECTION = 'magic';

/** Résolution de la magie (p. 227-229). */
export const MAGIC: ReferenceTextEntry[] = [
  {
    kind: 'text',
    id: 'casting-a-spell',
    title: 'Lancer un sort',
    section: 'resolution',
    subsection: SUBSECTION,
    tags: ['sort', 'incantation', 'magie profane', 'magie divine', 'astérisque'],
    sourcePage: 227,
    shortEffect: 'Un sort (capacité signalée par un astérisque) demande une incantation : parler et, pour la magie profane, avoir au moins une main libre.',
    body: `Les sorts sont toutes les capacités qui sont signalées par un astérisque (*) après leur nom.

Lancer un sort peut se faire (techniquement parlant) de plusieurs façons différentes (par exemple, un test d’attaque magique contre la DEF de la cible, ou un test d’attaque magique en opposition) qui sont décrites dans les capacités concernées.

On peut décomposer le lancement d’un sort de la façon suivante :
– incantation ;
– dépense de points de mana ;
– effet ;
– durée du sort.

Incantation
Lancer un sort demande une incantation basée sur une composante vocale (formules magiques) et une composante gestuelle (mouvement des mains et des bras, voire davantage). Un lanceur de sort a besoin de pouvoir parler et d’avoir les mains libres pour incanter.

La magie profane nécessite d’avoir au moins une main libre pour réaliser la composante gestuelle de l’incantation. Si le lanceur de sort tient une arme à deux mains, comme c’est le cas du bâton des magicien, il suffit d’appuyer l’arme au sol en la tenant d’une seule main au moment où un sort est lancé. En revanche, il n’est pas possible d’utiliser un bouclier et une arme ou une arme dans chaque main tout en lançant des sorts de magie profane.

La magie divine n’est pas soumise à la même exigence, mais il est nécessaire de respecter les obligations morales qu’elle impose, c’est-à-dire de se restreindre à la liste d’armes auxquelles la voie est associée. Masse et marteau, plus une éventuelle arme de culte pour le prêtre. Bâton, épieu, etc. pour le druide. Sinon, l’entité qui accorde le sort ne répondra pas à la prière.

Durée de l’incantation. Dans Chroniques Oubliées Fantasy, l’incantation d’un sort est relativement rapide. Selon la capacité, elle va nécessiter un type d’action spécifique (A, L, G ou M) ; dans tous les cas, lancer un sort s’effectue dans le cadre d’un round de combat.

Il est tout à fait possible de lancer plusieurs sorts par round, si le type d’action requis le permet. Par exemple, si un sort peut être lancé en action mouvement et un autre en action d’attaque, alors le magicien peut lancer ces deux sorts dans le même round, tant qu’il peut payer le coût en PM. Les sorts de rang 1 et 2 peuvent ainsi voir leur coût réduit à 0.`,
  },
  {
    kind: 'text',
    id: 'mana-cost',
    title: 'Dépenses de points de mana',
    section: 'resolution',
    subsection: SUBSECTION,
    tags: ['points de mana', 'PM', 'coût', 'rang'],
    sourcePage: 228,
    shortEffect: 'Lancer un sort coûte un nombre de PM égal au rang de la capacité ; sans PM suffisants, impossible sauf brûlure de mana.',
    body: `Lancer un sort coûte un nombre de points de mana égal au rang de la capacité à laquelle il est associé.

Lorsqu’un lanceur de sort n’a plus ou pas assez de points de mana, il ne peut tout simplement plus lancer de sort, sauf s’il a recours à l’option brûlure de mana.

Exemple : Au niveau 1, Ionas connaît deux sorts de rang 1 et un sort de rang 2. Il a donc 3 PM auxquels il ajoute sa VOL de +2 pour un total de 5 PM. Ionas dépense 1 PM pour lancer chaque sort de rang 1 et 2 PM pour son sort de rang 2.`,
  },
  {
    kind: 'text',
    id: 'concentration',
    title: 'Concentration accrue',
    section: 'resolution',
    subsection: SUBSECTION,
    tags: ['concentration', 'PM', 'action d’attaque', 'action limitée'],
    sourcePage: 228,
    shortEffect: 'Un sort lancé en action d’attaque (A) peut devenir une action limitée (L) pour réduire son coût de 2 PM.',
    body: `Lorsqu’il utilise un sort qui nécessite une action d’attaque (A) pour être lancé, le personnage peut se concentrer plus longtemps pour réduire le coût du sort de 2 PM : le sort devient une action limitée (L).

Les sorts qui n’utilisent pas une action d’attaque pour être lancés ne peuvent pas bénéficier de la concentration.

Les sorts qui indiquent une action limitée (L), une action de mouvement (M) ou une action gratuite (G) ne peuvent pas bénéficier de l’effet d’une concentration pour être lancés. Ils ont donc un coût égal à leur rang qui ne peut pas être réduit par cette option.`,
  },
  {
    kind: 'text',
    id: 'mana-burn',
    title: 'Brûlure de mana',
    section: 'resolution',
    subsection: SUBSECTION,
    tags: ['brûlure de mana', 'PM', 'dé de récupération', 'DR', 'sacrifice'],
    sourcePage: 228,
    shortEffect: 'Sans PM, sacrifier son énergie vitale : 1 DR de PV perdus par PM dépensé (aucune RD), sauf pour un sort de soins.',
    body: `Lorsqu’il n’a plus de points de mana, un personnage peut choisir de sacrifier son énergie vitale pour continuer à lancer des sorts. Pour chaque PM dépensé, il subit des DM égaux à son dé de récupération (DR).

PV perdus = 1 DR par point de mana du sort

Aucune RD ne s’applique à cette perte de PV.

Exemple : un magicien, qui est à 0 PM, a besoin de 2 PM pour lancer un sort. Son dé de récupération étant le d6, il doit sacrifier 2d6 PV. Il lance les dés et obtient 2 et 5 pour un total de 7 PV perdus.

Un guerrier-magicien (profil principal guerrier, le DR est donc le d10) à court de mana sacrifie 2d10 PV pour obtenir 2 PM. Il lance les dés et obtient 3 et 9 pour un total de 12 PV perdus.

Attention, il est impossible d’utiliser la brûlure de mana pour lancer un sort de soins.`,
  },
  {
    kind: 'text',
    id: 'spell-effects-target-level',
    title: 'Niveau des cibles',
    section: 'resolution',
    subsection: SUBSECTION,
    tags: ['niveau', 'NC', 'cible', 'effet des sorts'],
    sourcePage: 228,
    shortEffect: 'Quand un sort dépend du niveau de la cible, on lit indistinctement son niveau (PJ) ou son NC (créature).',
    body: `De nombreux sorts voient leur effet varier en fonction du niveau de la cible. On se reporte alors indistinctement au niveau ou au NC de la cible. On parle de niveau lorsqu’il s’agit d’un PJ et de NC (niveau de créature) pour les adversaires des PJ.

Exemple : si un sort indique qu’il fait effet contre les cibles d’un NC inférieur au niveau du PJ, alors un PJ de niveau 6 peut lancer ce sort sur toute créature de NC 5 ou moins, ou sur un autre PJ de niveau 5 maximum.`,
  },
  {
    kind: 'text',
    id: 'area-spells',
    title: 'Sorts de zone',
    section: 'resolution',
    subsection: SUBSECTION,
    tags: ['sort de zone', 'allié', 'cible', 'test d’AGI', 'diviser les DM'],
    sourcePage: 228,
    shortEffect: 'Un allié au contact de la cible est touché : le lanceur privilégie sa cible (allié +5 en AGI) ou son allié (allié épargné).',
    body: `Dans un combat, il est presque impossible de lancer un sort de zone (Feu grégeois, Explosion de feu, etc.) sur un adversaire sans toucher un allié engagé au corps à corps avec la cible. Ne laissez pas un joueur vous persuader du contraire parce que, sur le plan, il peut dessiner un cercle dont la limite passe au bon endroit. Un combat est dynamique et les adversaires sont sans cesse en mouvement, ce type de précision est illusoire.

Dans cette configuration, le PJ qui utilise l’attaque de zone peut choisir entre deux options.

Il privilégie sa cible. La cible subit les DM normaux. L’allié à son contact subit aussi les DM du sort, mais il bénéficie d’un bonus de +5 au test d’AGI pour diviser les DM par deux.

Il privilégie son allié. L’allié ne subit aucun DM. Dans ce cas, une cible à son contact divise les DM par deux si elle rate son test d’AGI et ne subit aucun DM si elle le réussit.`,
  },
  {
    kind: 'text',
    id: 'diminishing-returns',
    title: 'Rendement décroissant',
    section: 'resolution',
    subsection: SUBSECTION,
    tags: ['rendement décroissant', 'test opposé', 'attaque magique', 'état préjudiciable'],
    sourcePage: 229,
    shortEffect: 'Un sort de contrôle / d’état répété sur la même cible en combat lui donne +5 cumulatif pour y résister (pas les sorts de DM directs).',
    body: `De nombreux sorts ont un effet décroissant lorsqu’ils visent la même cible de façon répétée durant un combat. Cela simule tout simplement que la cible s’adapte et résiste mieux. Il s’agit de tous les sorts qui nécessitent un test opposé d’attaque magique (les sorts de contrôle mental, par exemple) ou ceux qui provoquent un état préjudiciable (par exemple, Renversé ou Étourdi).

La cible obtient un bonus cumulatif de +5 au test pour résister à la capacité, que ce soit au test opposé d’attaque magique ou au test de caractéristique pour résister à l’effet préjudiciable.

L’effet de rendement décroissant ne concerne pas les tests d’attaque magique contre la DEF d’un adversaire et les DM infligés (par exemple, un sort de flèche de feu, une Explosion de feu, etc.).`,
  },
  {
    kind: 'text',
    id: 'spell-duration',
    title: 'Durée du sort',
    section: 'resolution',
    subsection: SUBSECTION,
    tags: ['durée', 'sort'],
    sourcePage: 229,
    shortEffect: 'La durée est précisée dans la capacité ; le sort peut prendre fin plus tôt si le lanceur le veut ou perd connaissance.',
    body: `La durée d’un sort est précisée dans la capacité éponyme. Toutefois, il peut prendre fin prématurément si le lanceur de sort le souhaite ou s’il perd connaissance.`,
  },
  {
    kind: 'text',
    id: 'unconscious-caster',
    title: 'Magicien inconscient',
    section: 'resolution',
    subsection: SUBSECTION,
    tags: ['inconscient', 'sort', 'permanent', 'lanceur de sort'],
    sourcePage: 229,
    shortEffect: 'Quand un lanceur de sort perd conscience, les sorts qu’il a lancés cessent (sauf les sorts permanents).',
    body: `Lorsqu’un lanceur de sort perd conscience, les sorts qu’il a lancés (sauf les sorts permanents) cessent de faire effet. Ainsi éliminer le lanceur de sort reste un bon moyen pour une créature de se débarrasser du sort qui lui a été lancé.`,
  },
  {
    kind: 'text',
    id: 'ending-a-spell',
    title: 'Mettre fin à un sort',
    section: 'resolution',
    subsection: SUBSECTION,
    tags: ['mettre fin', 'sort', 'action gratuite'],
    sourcePage: 229,
    shortEffect: 'Sauf mention contraire, un lanceur peut mettre fin à un de ses sorts en une action gratuite.',
    body: `Si rien dans la capacité ne précise le contraire, un lanceur de sort peut mettre fin à un sort en une action gratuite.`,
  },
  {
    kind: 'text',
    id: 'recovering-mana',
    title: 'Récupérer les points de mana',
    section: 'resolution',
    subsection: SUBSECTION,
    tags: ['points de mana', 'PM', 'récupération complète', 'prêtre', 'druide'],
    sourcePage: 229,
    shortEffect: 'Une récupération complète (8 h) rend tous les PM ; pour le prêtre / druide, le MJ peut n’en rendre qu’une partie selon le comportement.',
    body: `Une fois par jour, le personnage regagne l’ensemble des PM dépensés lorsqu’il termine une récupération complète (8 h). Durant cette période, il doit prendre au moins une demi-heure pour réviser ses sorts, méditer ou prier selon la nature de sa magie. Le MJ a toute latitude pour ne rendre qu’une partie des PM (la moitié, par exemple) en cas de stress, d’inconfort ou de combat en pleine nuit.

Dans le cas des prêtres, la récupération des PM est liée au comportement du personnage : il ne récupère ceux-ci que si ses actions et l’utilisation de ses sorts étaient en accord avec les préceptes de son dieu. Le MJ à toute latitude pour ne rendre qu’une partie de ceux-ci, voire aucun, si le PJ n’a pas suivi le dogme de sa religion. Il en va de même pour un druide qui aurait meurtri la nature.`,
  },
  {
    kind: 'text',
    id: 'wizard-without-grimoire',
    title: 'Grimoire de magicien',
    section: 'resolution',
    subsection: SUBSECTION,
    tags: ['grimoire', 'magicien', 'coût doublé', 'réviser'],
    sourcePage: 229,
    shortEffect: 'Sans son grimoire pour réviser, le coût des sorts du magicien est doublé jusqu’à ce qu’il puisse à nouveau réviser.',
    body: `Si un magicien a égaré son grimoire et qu’il ne peut pas y réviser ses sorts, leur coût est doublé jusqu’à ce qu’il puisse à nouveau réviser. Ainsi, un sort de rang 3 aura un coût de 6 PM. Si le grimoire est définitivement perdu, le magicien peut en rédiger un autre au prix d’une journée de travail et 10 pa par rang de sort inscrit. Il lui faut du matériel d’écriture et un grimoire vierge qu’il ne pourra trouver que dans une cité de taille respectable, dans une académie de magie ou peut-être chez un confrère (déjà comptabilisé dans le coût de 10 pa par rang).`,
  },
];
