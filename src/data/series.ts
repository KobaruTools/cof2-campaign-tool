/**
 * Séries de valeurs de caractéristiques proposées à la création — p. 27.
 *
 * « À la création d'un personnage, commencez par choisir l'une des trois
 * séries de valeurs suivantes (polyvalent, expert, spécialiste) selon ce
 * qui correspond le mieux à l'image que vous vous faites de votre
 * personnage. » Les 7 valeurs sont ensuite réparties librement entre les
 * 7 caractéristiques (conseil du livre : affecter les trois meilleures
 * valeurs aux trois caractéristiques du profil).
 *
 * Sommes différentes assumées par le livre (encadré « L'équité est
 * différente de l'égalité », p. 28) : polyvalent +7, expert +6,
 * spécialiste +5.
 */

import type { SerieDeValeurs } from './schema';

export const series: SerieDeValeurs[] = [
  {
    id: 'polyvalent',
    nom: 'Polyvalent',
    valeurs: [2, 2, 2, 1, 1, 0, -1],
    sourcePage: 27,
  },
  {
    id: 'expert',
    nom: 'Expert',
    valeurs: [3, 2, 1, 1, 0, 0, -1],
    sourcePage: 27,
  },
  {
    id: 'specialiste',
    nom: 'Spécialiste',
    valeurs: [4, 2, 1, 0, 0, -1, -1],
    sourcePage: 27,
  },
];
