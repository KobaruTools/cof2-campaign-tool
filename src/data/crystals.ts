/**
 * Catalogue des 14 cristaux de la Voie des cristaux (PER-74, prestige mage, p. 156).
 *
 * Le personnage APPREND des cristaux (choix `option`, un par slot, sur les rangs 4-8 de
 * `prestige-cristaux` — cf. `part2.ts`) : c'est un savoir PERMANENT (`Character.featureChoices`,
 * comme tout choix figé). Il peut ensuite en ACTIVER un sous-ensemble à tout moment (limite qui
 * grandit avec le rang atteint dans la voie), et c'est SEULEMENT tant qu'un cristal est activé que
 * son effet compte — état de jeu dynamique, distinct de l'apprentissage (cf. mémoire « choix permanent
 * vs dynamique »), porté par `Character.activeCrystalIds` (voir `src/lib/character/crystals.ts`).
 *
 * Résistance (Noir fumé, Orange) et régénération (Blanc laiteux) restent PUREMENT DESCRIPTIVES :
 * le moteur ne consomme pas encore la réduction de dégâts (cf. `DamageReduction`, schema.ts) ni un
 * quelconque suivi de PV au fil du temps — on ne le simule pas ici non plus, cohérent avec le reste
 * du catalogue. Irisé et Translucide (survie sans respirer/boire/manger) sont narratifs, sans effet
 * chiffré, comme les pouvoirs « originaux » sans contrepartie mécanique des familiers fantastiques.
 *
 * Source : CBHS_06_Chroniques_Oubliees_2_web_v2.pdf, p. 156.
 */
import type { AbilityId, DerivedStatId, ResistibleDamageType } from './schema';

export interface Crystal {
  /** Id stable persisté (slug FR, exception de convention comme les ids d'objets/peuples). */
  id: string;
  /** Couleur (nom d'affichage principal). */
  color: string;
  /** Forme (fuseau / sphère / rhombe / prisme). */
  shape: string;
  /** Effet, tel que décrit dans la table p. 156 (verbatim court). */
  effectText: string;
  /** Modificateur PERMANENT de caractéristique tant que le cristal est ACTIF. */
  abilityBonus?: { ability: AbilityId; value: number };
  /** Bonus à une ou plusieurs stats dérivées tant que le cristal est ACTIF. */
  statBonuses?: { stat: DerivedStatId; value: number }[];
  /** Résistance typée (descriptive — cf. note de module). */
  resistance?: { types: ResistibleDamageType[]; value: number };
  /** Régénération de PV par heure (descriptive — cf. note de module). */
  regenPerHour?: number;
}

export const CRYSTALS: Crystal[] = [
  {
    id: 'cristal-blanc-laiteux',
    color: 'Blanc laiteux',
    shape: 'Fuseau',
    effectText: 'Régénération (1 PV/h)',
    regenPerHour: 1,
  },
  {
    id: 'cristal-bleu-incandescent',
    color: 'Bleu incandescent',
    shape: 'Sphère',
    effectText: 'Bonus de +1 en PER',
    abilityBonus: { ability: 'PER', value: 1 },
  },
  {
    id: 'cristal-bleu-nuit',
    color: 'Bleu nuit',
    shape: 'Rhombe',
    effectText: 'Bonus de +5 en Init.',
    statBonuses: [{ stat: 'initiative', value: 5 }],
  },
  {
    id: 'cristal-bleu-pale',
    color: 'Bleu pâle',
    shape: 'Rhombe',
    effectText: 'Bonus de +1 en FOR',
    abilityBonus: { ability: 'FOR', value: 1 },
  },
  {
    id: 'cristal-irise',
    color: 'Irisé',
    shape: 'Fuseau',
    effectText: 'Permet de survivre sans respirer',
  },
  {
    id: 'cristal-noir-fume',
    color: 'Noir fumé',
    shape: 'Prisme',
    effectText: 'Résistance au feu et au froid 10 points',
    resistance: { types: ['fire', 'cold'], value: 10 },
  },
  {
    id: 'cristal-orange',
    color: 'Orange',
    shape: 'Fuseau',
    effectText: 'Résistance acide et électricité 10 points',
    resistance: { types: ['acid', 'lightning'], value: 10 },
  },
  {
    id: 'cristal-violet',
    color: 'Violet',
    shape: 'Sphère',
    effectText: 'Bonus de +1 en CHA',
    abilityBonus: { ability: 'CHA', value: 1 },
  },
  {
    id: 'cristal-rose-laiteux',
    color: 'Rose laiteux',
    shape: 'Prisme',
    effectText: 'Bonus de +2 en DEF',
    statBonuses: [{ stat: 'def', value: 2 }],
  },
  {
    id: 'cristal-rouge-sang',
    color: 'Rouge sang',
    shape: 'Rhombe',
    effectText: 'Bonus de +1 en CON',
    abilityBonus: { ability: 'CON', value: 1 },
  },
  {
    id: 'cristal-rouge-et-bleu',
    color: 'Rouge et bleu',
    shape: 'Sphère',
    effectText: 'Bonus de +1 en INT',
    abilityBonus: { ability: 'INT', value: 1 },
  },
  {
    id: 'cristal-rose-vif',
    color: 'Rose vif',
    shape: 'Sphère',
    effectText: 'Bonus de +1 en AGI',
    abilityBonus: { ability: 'AGI', value: 1 },
  },
  {
    id: 'cristal-translucide',
    color: 'Translucide',
    shape: 'Fuseau',
    effectText: 'Permet de subsister sans boire ni manger',
  },
  {
    id: 'cristal-vert-pale',
    color: 'Vert pâle',
    shape: 'Prisme',
    // « Bonus de +1 en attaque » sans qualificatif = les trois jets (cf. Prescience, divination-r5,
    // même tournure verbatim résolue en `meleeAttack`/`rangedAttack`/`magicAttack`).
    effectText: 'Bonus de +1 en attaque',
    statBonuses: [
      { stat: 'meleeAttack', value: 1 },
      { stat: 'rangedAttack', value: 1 },
      { stat: 'magicAttack', value: 1 },
    ],
  },
];

export const crystalById = new Map<string, Crystal>(CRYSTALS.map((c) => [c.id, c]));

/** Libellé d'affichage d'un cristal pour un sélecteur (« Couleur (Forme) »). */
export function crystalLabel(crystal: Crystal): string {
  return `${crystal.color} (${crystal.shape})`;
}
