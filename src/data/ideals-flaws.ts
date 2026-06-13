/**
 * Table d20 « Idéaux héroïques / Travers » — p. 33 (étape 15, « Touche
 * finale », section « Idéal et travers »).
 *
 * Tirage indicatif : « lancez un d20 et consultant la table ci-dessous » ;
 * si le tirage ne convient pas, le joueur peut relancer, ou choisir
 * librement, ou déterminer deux idéaux héroïques (ou deux travers).
 */

import type { IdealFlaw } from './schema';

export const idealsFlaws: IdealFlaw[] = [
  { d20: 1, ideal: 'Abnégation', flaw: 'Alcoolique', sourcePage: 33 },
  { d20: 2, ideal: 'Clémence', flaw: 'Couard', sourcePage: 33 },
  { d20: 3, ideal: 'Compassion', flaw: 'Crédule', sourcePage: 33 },
  { d20: 4, ideal: 'Courage', flaw: 'Cupide', sourcePage: 33 },
  { d20: 5, ideal: 'Égalité', flaw: 'Colérique', sourcePage: 33 },
  { d20: 6, ideal: 'Éducation', flaw: 'Distrait', sourcePage: 33 },
  { d20: 7, ideal: 'Fraternité', flaw: 'Dragueur', sourcePage: 33 },
  { d20: 8, ideal: 'Frugalité', flaw: 'Fanfaron', sourcePage: 33 },
  { d20: 9, ideal: 'Générosité', flaw: 'Gourmand', sourcePage: 33 },
  { d20: 10, ideal: 'Honnêteté', flaw: 'Grossier', sourcePage: 33 },
  { d20: 11, ideal: 'Honneur', flaw: 'Impatient', sourcePage: 33 },
  { d20: 12, ideal: 'Humilité', flaw: 'Indécis', sourcePage: 33 },
  { d20: 13, ideal: 'Justice', flaw: 'Menteur', sourcePage: 33 },
  { d20: 14, ideal: 'Liberté', flaw: 'Orgueilleux', sourcePage: 33 },
  { d20: 15, ideal: 'Loyauté', flaw: 'Paranoïaque', sourcePage: 33 },
  { d20: 16, ideal: 'Pacifisme', flaw: 'Paresseux', sourcePage: 33 },
  { d20: 17, ideal: 'Protection', flaw: 'Phobie (au choix)', sourcePage: 33 },
  { d20: 18, ideal: 'Sens du sacrifice', flaw: 'Timide', sourcePage: 33 },
  { d20: 19, ideal: 'Solidarité', flaw: 'Violent', sourcePage: 33 },
  { d20: 20, ideal: 'Vérité', flaw: 'Voleur', sourcePage: 33 },
];
