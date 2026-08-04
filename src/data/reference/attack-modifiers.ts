/**
 * AIDE-MÉMOIRE — MODIFICATEURS D'ATTAQUE (extraction PER-40).
 *
 * Le livre présente ces modificateurs sous forme d'un TABLEAU unique (« Modificateurs d'attaque à
 * distance selon la situation », p. 214) — on le restitue donc en `ReferenceTableEntry` plutôt que de
 * l'éclater en badges, ce qui perdrait le regroupement (Portée / Situation de la cible / Situation du
 * tireur / Visibilité) et les renvois « Spécial ». La colonne `group` porte l'intitulé de regroupement
 * imprimé dans le livre ; cellules recopiées VERBATIM.
 */

import type { ReferenceTableEntry } from './schema';

/** Modificateurs d'attaque à distance selon la situation (tableau p. 214). */
export const ATTACK_MODIFIERS: ReferenceTableEntry[] = [
  {
    kind: 'table',
    id: 'ranged-attack-modifiers',
    title: 'Modificateurs d’attaque à distance selon la situation',
    section: 'combat',
    subsection: 'attack-modifiers',
    tags: [
      'attaque à distance',
      'couvert',
      'portée longue',
      'tireur au contact',
      'pleine mêlée',
      'brouillard',
      'pénombre',
      'noir total',
      'visibilité',
    ],
    sourcePage: 214,
    columns: [
      { key: 'group', label: 'Catégorie' },
      { key: 'situation', label: 'Situation' },
      { key: 'modifier', label: 'Modificateur' },
      { key: 'comment', label: 'Commentaire' },
    ],
    rows: [
      {
        group: 'Portée',
        situation: 'Longue',
        modifier: 'Dé malus',
        comment:
          'Utiliser une arme de tir (arc, fronde, arbalète etc.) entre la portée indiquée et le double de cette valeur.',
      },
      {
        group: 'Situation de la cible',
        situation: 'Cible à couvert – faiblement (végétation)',
        modifier: '-2',
        comment: '',
      },
      {
        group: 'Situation de la cible',
        situation: 'Cible à couvert – fortement (muraille)',
        modifier: '-5',
        comment: '',
      },
      {
        group: 'Situation de la cible',
        situation: 'Cible en pleine mêlée',
        modifier: '-2 (-5)',
        comment: 'Le malus est porté à -5 si un allié masque la cible.',
      },
      {
        group: 'Situation du tireur',
        situation: 'Tireur au contact',
        modifier: 'Dé malus',
        comment:
          'Utiliser une arme de tir (arc, fronde, arbalète etc.) en étant au contact d’un adversaire',
      },
      {
        group: 'Visibilité',
        situation: 'Brouillard dense',
        modifier: 'Spécial',
        comment: 'Comme Brouillard léger dans un rayon de 10 m, puis équivalent au Noir total.',
      },
      {
        group: 'Visibilité',
        situation: 'Brouillard léger',
        modifier: '-5',
        comment: '',
      },
      {
        group: 'Visibilité',
        situation: 'Noir total',
        modifier: 'Spécial',
        comment:
          'Le tireur subit l’état préjudiciable « aveuglé » (sauf s’il a une capacité indiquant le contraire).',
      },
      {
        group: 'Visibilité',
        situation: 'Pénombre',
        modifier: '-5',
        comment: '',
      },
    ],
    note: 'Dans un corps à corps, l’attaquant engagé qui souhaite tirer à distance subit un dé malus (voir « Tireur au contact »). Le malus des situations de couvert / pleine mêlée va de -2 à -5.',
  },
];
