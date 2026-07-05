import { describe, expect, it } from 'vitest';
import type { Character } from './types';
import { longRest, resetAll, shortRest } from './rest';

/** Personnage minimal pour tester le repos (les fonctions ne lisent que ces champs). */
const make = (over: Partial<Character>): Character =>
  ({ level: 5, featureIds: [], usageCounters: {}, depletion: {}, equipment: [], ...over }) as Character;

// rage-r3 : compteur `resetOn` par défaut ('day', clé partagée 'rage').
// fauve-r5 (« Les sept vies du chat ») : `resetOn: 'manual'` (compteur à vie).
const base = {
  featureIds: ['rage-r3', 'fauve-r5'],
  usageCounters: { rage: 0, 'fauve-r5': 2 },
  depletion: { hp: { lethal: 5, temp: 3 }, mana: 4, recoveryDice: 2 },
};

describe('shortRest — récupération rapide', () => {
  it('régénère les dégâts temporaires, conserve le létal, le mana et les DR', () => {
    const { depletion } = shortRest(make(base));
    expect(depletion).toEqual({ hp: { lethal: 5, temp: 0 }, mana: 4, recoveryDice: 2 });
  });

  it('ne réinitialise pas les compteurs « par jour » ni « manuel »', () => {
    const { usageCounters } = shortRest(make(base));
    expect(usageCounters).toEqual({ rage: 0, 'fauve-r5': 2 });
  });

  it('dépense 1 DR et soigne [dé + ½ niveau] PV (niveau 5 → +2)', () => {
    // Létaux 10, un DR déjà dépensé (recoveryDice 1) sur un max de 4. Dé lancé = 6 → soin 6 + 2 = 8.
    const { depletion } = shortRest(
      make({ level: 5, depletion: { hp: { lethal: 10, temp: 3 }, recoveryDice: 1 } }),
      { dieRoll: 6, recoveryDiceMax: 4 },
    );
    // Létaux 10 − 8 = 2 ; temp régénéré ; DR dépensés 1 → 2.
    expect(depletion).toEqual({ hp: { lethal: 2, temp: 0 }, recoveryDice: 2 });
  });

  it('ne soigne pas sans DR disponible (tous dépensés)', () => {
    const { depletion } = shortRest(
      make({ level: 5, depletion: { hp: { lethal: 10, temp: 0 }, recoveryDice: 4 } }),
      { dieRoll: 6, recoveryDiceMax: 4 },
    );
    // Aucun DR dispo (4/4 dépensés) → pas de soin ni de dépense supplémentaire.
    expect(depletion).toEqual({ hp: { lethal: 10, temp: 0 }, recoveryDice: 4 });
  });
});

describe('longRest — récupération complète', () => {
  it('temp régénéré, mana plein, +1 DR (attrition), létal conservé', () => {
    const { depletion } = longRest(make(base));
    // mana retiré (plein), recoveryDice 2 → 1, hp temp → 0.
    expect(depletion).toEqual({ hp: { lethal: 5, temp: 0 }, recoveryDice: 1 });
  });

  it('ne descend pas sous 0 DR dépensés', () => {
    const { depletion } = longRest(make({ depletion: { recoveryDice: 0 } }));
    expect(depletion.recoveryDice).toBeUndefined();
  });

  it('réinitialise les compteurs « par jour » mais pas les « manuel »', () => {
    const { usageCounters } = longRest(make(base));
    expect(usageCounters).toEqual({ 'fauve-r5': 2 }); // rage (day) réinitialisée, sept vies (manual) conservée
  });

  it('option soin : valeur MAX du dé + ½ niveau, réserve de DR INCHANGÉE (dé gagné consommé aussitôt)', () => {
    // Niveau 5 (½ = 2), dé d10 (faces 10) → soin max = 12. Létaux 15, 2 DR dépensés.
    const { depletion } = longRest(
      make({ level: 5, depletion: { hp: { lethal: 15, temp: 4 }, recoveryDice: 2 } }),
      { dieFaces: 10 },
    );
    // Le DR gagné est consommé par le soin → recoveryDice inchangé (2) ; létaux 15 − 12 = 3.
    expect(depletion).toEqual({ hp: { lethal: 3, temp: 0 }, recoveryDice: 2 });
  });

  it('option soin à DR PLEIN (0 dépensé) : soigne sans consommer de DR (reste plein)', () => {
    // Cas du bug : à 6/6, le repos long avec soin doit rester à 6/6.
    const { depletion } = longRest(
      make({ level: 5, depletion: { hp: { lethal: 15, temp: 0 } } }),
      { dieFaces: 10 },
    );
    // recoveryDice absent (plein) et le reste plein ; létaux 15 − 12 = 3.
    expect(depletion).toEqual({ hp: { lethal: 3, temp: 0 } });
  });

  it('sans option soin : garde le +1 DR, ne soigne pas les létaux', () => {
    const { depletion } = longRest(
      make({ level: 5, depletion: { hp: { lethal: 15, temp: 4 }, recoveryDice: 2 } }),
    );
    expect(depletion).toEqual({ hp: { lethal: 15, temp: 0 }, recoveryDice: 1 });
  });
});

describe('repos — extinction des états temporaires (PER-161)', () => {
  // rage-r3 porte un effet TEMPORAIRE (index 0) ; priere-r2 (Sanctuaire) aussi.
  const withTemporaryActive = make({
    featureIds: ['rage-r3', 'priere-r2'],
    effectToggles: { 'rage-r3': [true], 'priere-r2': [true] },
  });

  it('le repos court éteint les interrupteurs d’effets temporaires actifs', () => {
    const { effectToggles } = shortRest(withTemporaryActive);
    expect(effectToggles).toEqual({ 'rage-r3': [false], 'priere-r2': [false] });
  });

  it('le repos long éteint aussi les interrupteurs d’effets temporaires actifs', () => {
    const { effectToggles } = longRest(withTemporaryActive);
    expect(effectToggles).toEqual({ 'rage-r3': [false], 'priere-r2': [false] });
  });
});

describe('repos — purge des saisies libres orphelines (PER-164)', () => {
  // animaux-r5 (Forme animale) : interrupteur TEMPORAIRE (index 0) + saisie libre corrélée (l'animal).
  const transformed = make({
    featureIds: ['animaux-r5'],
    effectToggles: { 'animaux-r5': [true] },
    effectInputs: { 'animaux-r5': 'loup' },
  });

  it('le repos court efface la saisie libre d’une capacité dont l’interrupteur temporaire est éteint', () => {
    const { effectInputs } = shortRest(transformed);
    expect(effectInputs).toEqual({});
  });

  it('le repos long efface aussi la saisie libre orpheline', () => {
    const { effectInputs } = longRest(transformed);
    expect(effectInputs).toEqual({});
  });

  it('préserve la saisie d’un effet SITUATIONNEL (sans interrupteur temporaire) — ex. élément résisté', () => {
    // magie-elementaire-r2 (Maîtrise des éléments) : le sélecteur d'élément TIENT LIEU d'activation,
    // pas d'interrupteur temporaire → un repos ne doit pas effacer l'élément choisi.
    const withScopeChoice = make({
      featureIds: ['magie-elementaire-r2'],
      effectInputs: { 'magie-elementaire-r2': 'fire' },
    });
    expect(shortRest(withScopeChoice).effectInputs).toEqual({ 'magie-elementaire-r2': 'fire' });
    expect(longRest(withScopeChoice).effectInputs).toEqual({ 'magie-elementaire-r2': 'fire' });
  });

  it('préserve la saisie d’une capacité dont l’interrupteur temporaire n’était PAS actif', () => {
    const notTransformed = make({
      featureIds: ['animaux-r5'],
      effectToggles: { 'animaux-r5': [false] },
      effectInputs: { 'animaux-r5': 'loup' },
    });
    expect(shortRest(notTransformed).effectInputs).toEqual({ 'animaux-r5': 'loup' });
    expect(longRest(notTransformed).effectInputs).toEqual({ 'animaux-r5': 'loup' });
  });
});

describe('repos — élixirs du forgesort (voie des élixirs, p. 98)', () => {
  const withElixirs = make({
    equipment: [
      { itemId: 'epee-longue', quantity: 1 },
      { custom: true, name: 'Élixir — Fortifiant', quantity: 2 },
      { custom: true, name: 'Élixir — Feu grégeois', quantity: 1 },
      { custom: true, name: 'Corde', quantity: 1 },
    ],
  });

  it('le repos long purge toutes les doses d’élixir de l’inventaire', () => {
    const { equipment } = longRest(withElixirs);
    expect(equipment).toEqual([
      { itemId: 'epee-longue', quantity: 1 },
      { custom: true, name: 'Corde', quantity: 1 },
    ]);
  });

  it('le repos court ne touche PAS l’équipement (pas de champ equipment)', () => {
    expect(shortRest(withElixirs).equipment).toBeUndefined();
  });
});

describe('repos — surcoût mana croissant (foi-r5, PER-162)', () => {
  const withSurcharge = make({ featureIds: ['foi-r5'], usageCounters: { 'foi-r5': 3 } });

  it('le repos court remet le surcoût croissant à 0', () => {
    expect(shortRest(withSurcharge).usageCounters).toEqual({});
  });

  it('le repos long remet aussi le surcoût croissant à 0', () => {
    expect(longRest(withSurcharge).usageCounters).toEqual({});
  });
});

describe('repos — charges explosives (voie des explosifs, PER-157)', () => {
  // Réserve QUOTIDIENNE partagée (clé 'explosifs-charges') entre Démolition (r2), Piège explosif (r4)
  // et Boulet explosif (r5) ; le livre précise « chaque jour » (p. 63-64) → `resetOn` par défaut ('day').
  // La recharge quotidienne passe par le mécanisme générique du repos long (PER-151), pas de code dédié.
  const withCharges = make({
    featureIds: ['explosifs-r2', 'explosifs-r4', 'explosifs-r5'],
    usageCounters: { 'explosifs-charges': 1 },
  });

  it('le repos long recharge la réserve partagée (clé retirée → pleine)', () => {
    expect(longRest(withCharges).usageCounters).toEqual({});
  });

  it('le repos court ne recharge PAS la réserve (compteur « par jour » conservé)', () => {
    expect(shortRest(withCharges).usageCounters).toEqual({ 'explosifs-charges': 1 });
  });
});

describe('resetAll — tout réinitialiser', () => {
  it('vide toutes les jauges, tous les compteurs et tous les interrupteurs', () => {
    expect(resetAll()).toEqual({ depletion: {}, usageCounters: {}, effectToggles: {}, effectInputs: {} });
  });
});
