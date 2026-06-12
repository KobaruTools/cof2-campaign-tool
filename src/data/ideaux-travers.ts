/**
 * Table d20 « Idéaux héroïques / Travers » — p. 33 (étape 15, « Touche
 * finale », section « Idéal et travers »).
 *
 * Tirage indicatif : « lancez un d20 et consultant la table ci-dessous » ;
 * si le tirage ne convient pas, le joueur peut relancer, ou choisir
 * librement, ou déterminer deux idéaux héroïques (ou deux travers).
 */

import type { IdealTravers } from './schema';

export const ideauxTravers: IdealTravers[] = [
  { d20: 1, ideal: 'Abnégation', travers: 'Alcoolique', sourcePage: 33 },
  { d20: 2, ideal: 'Clémence', travers: 'Couard', sourcePage: 33 },
  { d20: 3, ideal: 'Compassion', travers: 'Crédule', sourcePage: 33 },
  { d20: 4, ideal: 'Courage', travers: 'Cupide', sourcePage: 33 },
  { d20: 5, ideal: 'Égalité', travers: 'Colérique', sourcePage: 33 },
  { d20: 6, ideal: 'Éducation', travers: 'Distrait', sourcePage: 33 },
  { d20: 7, ideal: 'Fraternité', travers: 'Dragueur', sourcePage: 33 },
  { d20: 8, ideal: 'Frugalité', travers: 'Fanfaron', sourcePage: 33 },
  { d20: 9, ideal: 'Générosité', travers: 'Gourmand', sourcePage: 33 },
  { d20: 10, ideal: 'Honnêteté', travers: 'Grossier', sourcePage: 33 },
  { d20: 11, ideal: 'Honneur', travers: 'Impatient', sourcePage: 33 },
  { d20: 12, ideal: 'Humilité', travers: 'Indécis', sourcePage: 33 },
  { d20: 13, ideal: 'Justice', travers: 'Menteur', sourcePage: 33 },
  { d20: 14, ideal: 'Liberté', travers: 'Orgueilleux', sourcePage: 33 },
  { d20: 15, ideal: 'Loyauté', travers: 'Paranoïaque', sourcePage: 33 },
  { d20: 16, ideal: 'Pacifisme', travers: 'Paresseux', sourcePage: 33 },
  { d20: 17, ideal: 'Protection', travers: 'Phobie (au choix)', sourcePage: 33 },
  { d20: 18, ideal: 'Sens du sacrifice', travers: 'Timide', sourcePage: 33 },
  { d20: 19, ideal: 'Solidarité', travers: 'Violent', sourcePage: 33 },
  { d20: 20, ideal: 'Vérité', travers: 'Voleur', sourcePage: 33 },
];
