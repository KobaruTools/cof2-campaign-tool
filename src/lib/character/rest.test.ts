import { describe, expect, it } from 'vitest';
import type { Character } from './types';
import { longRest, resetAll, shortRest } from './rest';

/** Personnage minimal pour tester le repos (les fonctions ne lisent que ces champs). */
const make = (over: Partial<Character>): Character =>
  ({ level: 5, featureIds: [], usageCounters: {}, depletion: {}, ...over }) as Character;

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
});

describe('resetAll — tout réinitialiser', () => {
  it('vide toutes les jauges et tous les compteurs', () => {
    expect(resetAll()).toEqual({ depletion: {}, usageCounters: {} });
  });
});
