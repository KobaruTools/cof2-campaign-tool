/**
 * AIDE-MÉMOIRE — OPTIONS TACTIQUES DE COMBAT (extraction PER-40).
 *
 * Section « Options tactiques » du livre de base (p. 215-217) : options utilisables par les PJ comme
 * par leurs adversaires. Chaque option indique son type d'action entre parenthèses ([A] attaque,
 * [L] limitée). Texte `body` recopié VERBATIM. Riposte et Attaque groupée disposent de règles détaillées
 * (p. 216-217) reprises dans leur `body`.
 */

import type { ReferenceTextEntry } from './schema';

const SUBSECTION = 'tactical-options';

/** Options tactiques de combat (p. 215-217). */
export const TACTICAL_OPTIONS: ReferenceTextEntry[] = [
  {
    kind: 'text',
    id: 'tactical-options-overview',
    title: 'Options tactiques',
    section: 'combat',
    subsection: SUBSECTION,
    tags: ['options tactiques'],
    sourcePage: 215,
    shortEffect: 'Options utilisables par les PJ comme par leurs adversaires pour rendre les combats plus vivants.',
    body: `Pour rendre les combats un peu plus intéressants et vivants, nous vous proposons ci-dessous quelques options tactiques utilisables tant par les PJ que par leurs adversaires.`,
  },
  {
    kind: 'text',
    id: 'attaque-assuree',
    title: 'Attaque assurée',
    section: 'combat',
    subsection: SUBSECTION,
    tags: ['attaque assurée', 'action d’attaque'],
    sourcePage: 216,
    shortEffect: '+5 en attaque, mais DM divisés par 2.',
    body: `Attaque assurée (A) : attaquer au contact ou à distance avec +5 en attaque, mais DM divisés par 2.`,
  },
  {
    kind: 'text',
    id: 'attaque-precise-violente',
    title: 'Attaque précise/violente',
    section: 'combat',
    subsection: SUBSECTION,
    tags: ['attaque précise', 'attaque violente', 'action d’attaque'],
    sourcePage: 216,
    shortEffect: '-3 en attaque, +1d4° DM (ou -7 pour +2d4° DM).',
    body: `Attaque précise/violente (A) : attaquer au contact ou à distance avec -3 en attaque, +1d4° DM (ou -7 pour +2d4° DM).`,
  },
  {
    kind: 'text',
    id: 'defense-partielle',
    title: 'Défense partielle',
    section: 'combat',
    subsection: SUBSECTION,
    tags: ['défense', 'DEF', 'action d’attaque'],
    sourcePage: 216,
    shortEffect: '+3 en DEF et aux tests opposés pour résister pendant 1 round.',
    body: `Défense partielle (A) : +3 en DEF et aux tests opposés pour résister à une attaque ou un effet pendant 1 round.`,
  },
  {
    kind: 'text',
    id: 'defense-totale',
    title: 'Défense totale',
    section: 'combat',
    subsection: SUBSECTION,
    tags: ['défense', 'DEF', 'action limitée'],
    sourcePage: 216,
    shortEffect: '+5 en DEF et aux tests opposés pour résister pendant 1 round.',
    body: `Défense totale (L) : +5 en DEF et aux tests opposés pour résister à une attaque ou un effet pendant 1 round.`,
  },
  {
    kind: 'text',
    id: 'riposte',
    title: 'Riposte',
    section: 'combat',
    subsection: SUBSECTION,
    tags: ['riposte', 'contre-attaque', 'posture'],
    sourcePage: 216,
    shortEffect: 'Se préparer à riposter à une attaque au contact (une fois par round).',
    body: `Riposte (L ou A) : se préparer à riposter à une attaque.

Au début du round (avant le tour des protagonistes), le personnage déclare se mettre en posture de riposte. Durant ce round, si une créature l’attaque au contact, il peut prendre son tour pour riposter immédiatement (action normale, une seule fois par round). Toutefois, si cela l’amène à agir avant sa propre valeur d’initiative, il ne peut utiliser qu’une action d’attaque.`,
  },
  {
    kind: 'text',
    id: 'soutenir',
    title: 'Soutenir',
    section: 'combat',
    subsection: SUBSECTION,
    tags: ['soutenir', 'allié', 'action limitée'],
    sourcePage: 216,
    shortEffect: 'Sacrifier ses actions pour donner +5 en attaque au contact à un allié (1 round).',
    body: `Soutenir (L) : sacrifiez toutes vos actions pour donner +5 en attaque au contact à un allié lors de sa prochaine attaque contre la créature désignée. Pour soutenir, vous devez être au contact de la créature désignée et cela compte comme une action offensive. Le bonus ne dure pas plus d’un round (jusqu’au tour du personnage, au round suivant).`,
  },
  {
    kind: 'text',
    id: 'attaque-groupee',
    title: 'Attaque groupée',
    section: 'combat',
    subsection: SUBSECTION,
    tags: ['attaque groupée', 'MJ', 'groupe', 'même profil'],
    sourcePage: 217,
    shortEffect: 'Réservée au MJ : un seul d20 pour un groupe au même profil, bonus selon le nombre (+5 / +10 / touche auto).',
    body: `L’option d’attaque groupée est réservée aux MJ. Elle se différencie de l’option tactique Soutenir (L) par le fait qu’elle ne peut être utilisée que si toutes les créatures concernées possèdent le même profil et agissent à la même initiative (par exemple, un groupe de gobelins), mais elle ne nécessite qu’une action d’attaque.

Le MJ ne lance qu’un seul d20 en attaque pour un groupe de créatures similaires avec un bonus qui dépend du nombre de créatures :
- 2 créatures : +5 en attaque.
- 3 créatures : +10 en attaque.
- 4 créatures : touche automatique, ne lancez pas de dé.

Si une capacité de la cible autorise une riposte en cas d’attaque ratée, considérez que si l’attaque est ratée, toutes les créatures ont échoué et, si l’attaque est réussie, une seule créature a manqué son attaque.

Si plus de 4 créatures attaquent un PJ, répartissez-les en 2 groupes de tailles similaires. Un maximum de 8 créatures peut attaquer un PJ simultanément (soit 2 groupes de 4). Si les créatures sont de taille grande, elles seront 6 au maximum, 4 pour des tailles énormes et enfin 2 pour des créatures de taille colossale.`,
  },
];
