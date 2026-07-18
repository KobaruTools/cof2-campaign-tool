import { describe, expect, it } from 'vitest';
import type { Depletion } from './types';
import {
  applyDamage,
  currentGauge,
  currentHp,
  currentMana,
  currentRecoveryDice,
  healHp,
  hpHealthState,
  hpMissing,
  pruneDepletion,
  currentLuck,
  resetHp,
  resetLuck,
  resetMana,
  resetRecoveryDice,
  restoreLuck,
  restoreMana,
  restoreRecoveryDice,
  setLuckMissing,
  setManaMissing,
  spendLuck,
  spendMana,
  spendRecoveryDice,
} from './gauges';

describe('currentGauge', () => {
  it('jauge pleine sans manque', () => {
    expect(currentGauge(20)).toBe(20);
    expect(currentGauge(20, 0)).toBe(20);
  });

  it('soustrait le manque', () => {
    expect(currentGauge(20, 7)).toBe(13);
  });

  it('borne basse à 0 (jamais négatif — p. 220)', () => {
    expect(currentGauge(20, 25)).toBe(0);
  });

  it('borne haute au max (manque négatif ignoré)', () => {
    expect(currentGauge(20, -5)).toBe(20);
  });
});

describe('hpMissing', () => {
  it('0 sans entrée', () => {
    expect(hpMissing(undefined)).toBe(0);
  });

  it('somme létal + temporaire', () => {
    expect(hpMissing({ lethal: 4, temp: 3 })).toBe(7);
  });

  it('borne chaque composante à ≥ 0', () => {
    expect(hpMissing({ lethal: -2, temp: 5 })).toBe(5);
  });
});

describe('currentHp', () => {
  it('PV pleins quand depletion vide', () => {
    expect(currentHp(30, {})).toBe(30);
  });

  it('retranche létal et temporaire', () => {
    expect(currentHp(30, { hp: { lethal: 8, temp: 4 } })).toBe(18);
  });

  it('borne basse à 0', () => {
    expect(currentHp(30, { hp: { lethal: 40, temp: 0 } })).toBe(0);
  });

  it('suit automatiquement un changement de max (pas de re-clamp)', () => {
    const dep: Depletion = { hp: { lethal: 10, temp: 0 } };
    // Même manque, deux maximums différents → deux courants cohérents.
    expect(currentHp(30, dep)).toBe(20);
    expect(currentHp(40, dep)).toBe(30); // montée de niveau : le courant remonte
  });
});

describe('currentMana', () => {
  it('mana plein quand aucune dépense', () => {
    expect(currentMana(12, {})).toBe(12);
  });

  it('retranche le mana dépensé', () => {
    expect(currentMana(12, { mana: 5 })).toBe(7);
  });

  it('borne basse à 0', () => {
    expect(currentMana(12, { mana: 99 })).toBe(0);
  });
});

describe('points de chance (PER-155)', () => {
  it('current = clamp(max − dépensés, 0, max)', () => {
    expect(currentLuck(5, {})).toBe(5);
    expect(currentLuck(5, { luck: 2 })).toBe(3);
    expect(currentLuck(5, { luck: 99 })).toBe(0);
  });

  it('suit automatiquement un changement de max (pas de re-clamp)', () => {
    const dep: Depletion = { luck: 2 };
    expect(currentLuck(5, dep)).toBe(3);
    expect(currentLuck(7, dep)).toBe(5); // CHA plus élevé : le courant remonte
  });

  it('setLuckMissing borne à [0, max] et retire la clé à plein', () => {
    expect(setLuckMissing({}, 3, 5)).toEqual({ luck: 3 });
    expect(setLuckMissing({ luck: 3 }, 0, 5)).toEqual({});
    expect(setLuckMissing({}, 99, 5)).toEqual({ luck: 5 });
    expect(setLuckMissing({ luck: 4 }, -2, 5)).toEqual({});
    expect(setLuckMissing({ luck: 3 }, 3, 0)).toEqual({});
  });

  it('dépense / récupère bornés, reset conserve les autres jauges', () => {
    expect(spendLuck({}, 2, 5)).toEqual({ luck: 2 });
    expect(spendLuck({ luck: 4 }, 5, 5)).toEqual({ luck: 5 });
    expect(restoreLuck({ luck: 3 }, 1, 5)).toEqual({ luck: 2 });
    expect(restoreLuck({ luck: 1 }, 5, 5)).toEqual({});
    expect(resetLuck({ luck: 2, mana: 3 })).toEqual({ mana: 3 });
  });

  it('pruneDepletion normalise les points de chance pleins', () => {
    expect(pruneDepletion({ luck: 0 })).toEqual({});
    expect(pruneDepletion({ luck: 2 })).toEqual({ luck: 2 });
  });

  it('préserve les autres jauges (mana, PV)', () => {
    expect(spendLuck({ mana: 3, hp: { lethal: 2, temp: 0 } }, 1, 5)).toEqual({
      mana: 3,
      hp: { lethal: 2, temp: 0 },
      luck: 1,
    });
  });
});

describe('hpHealthState', () => {
  it('normal au-dessus de 1 PV', () => {
    expect(hpHealthState(30, {})).toBe('normal');
    expect(hpHealthState(30, { hp: { lethal: 10, temp: 0 } })).toBe('normal');
  });

  it('affaibli exactement à 1 PV', () => {
    expect(hpHealthState(30, { hp: { lethal: 29, temp: 0 } })).toBe('weakened');
    expect(hpHealthState(30, { hp: { lethal: 20, temp: 9 } })).toBe('weakened');
  });

  it('à terre / mourant à 0 PV avec des dégâts létaux', () => {
    expect(hpHealthState(30, { hp: { lethal: 30, temp: 0 } })).toBe('down');
    // Létaux + temporaires qui atteignent 0 : la présence de létal fait tomber à terre.
    expect(hpHealthState(30, { hp: { lethal: 25, temp: 10 } })).toBe('down');
  });

  it('assommé à 0 PV par dégâts temporaires seuls (aucun létal)', () => {
    expect(hpHealthState(30, { hp: { lethal: 0, temp: 30 } })).toBe('stunned');
    expect(hpHealthState(30, { hp: { lethal: 0, temp: 45 } })).toBe('stunned');
  });
});

describe('pruneDepletion', () => {
  it('retire une jauge PV pleine (manque nul)', () => {
    expect(pruneDepletion({ hp: { lethal: 0, temp: 0 } })).toEqual({});
  });

  it('conserve une dépletion PV réelle et re-borne les négatifs', () => {
    expect(pruneDepletion({ hp: { lethal: -3, temp: 5 } })).toEqual({ hp: { lethal: 0, temp: 5 } });
  });

  it('retire un mana plein (0 dépensé)', () => {
    expect(pruneDepletion({ mana: 0 })).toEqual({});
  });

  it('conserve un mana dépensé', () => {
    expect(pruneDepletion({ mana: 4 })).toEqual({ mana: 4 });
  });

  it('normalise un objet mixte', () => {
    expect(pruneDepletion({ hp: { lethal: 2, temp: 0 }, mana: 0 })).toEqual({
      hp: { lethal: 2, temp: 0 },
    });
  });
});

describe('applyDamage', () => {
  it('crée la dépletion PV depuis une jauge pleine', () => {
    expect(applyDamage({}, 5, 'lethal')).toEqual({ hp: { lethal: 5, temp: 0 } });
    expect(applyDamage({}, 3, 'temp')).toEqual({ hp: { lethal: 0, temp: 3 } });
  });

  it('cumule sur la composante ciblée sans toucher l’autre', () => {
    expect(applyDamage({ hp: { lethal: 2, temp: 1 } }, 4, 'lethal')).toEqual({
      hp: { lethal: 6, temp: 1 },
    });
    expect(applyDamage({ hp: { lethal: 2, temp: 1 } }, 4, 'temp')).toEqual({
      hp: { lethal: 2, temp: 5 },
    });
  });

  it('préserve les autres jauges (mana)', () => {
    expect(applyDamage({ mana: 3 }, 2, 'lethal')).toEqual({ mana: 3, hp: { lethal: 2, temp: 0 } });
  });

  it('ignore un montant nul ou négatif', () => {
    const dep = { hp: { lethal: 2, temp: 0 } };
    expect(applyDamage(dep, 0, 'lethal')).toBe(dep);
    expect(applyDamage(dep, -3, 'lethal')).toBe(dep);
  });

  it('plafonne le manque total au maxHp (jamais de PV sous 0)', () => {
    // maxHp = 10 : 8 dégâts de plus depuis 6 létaux ne pousse le manque qu'à 10.
    expect(applyDamage({ hp: { lethal: 6, temp: 0 } }, 8, 'lethal', 10)).toEqual({
      hp: { lethal: 10, temp: 0 },
    });
    // La composante ciblée est bornée à maxHp − autre composante (total ≤ max).
    expect(applyDamage({ hp: { lethal: 4, temp: 2 } }, 20, 'lethal', 10)).toEqual({
      hp: { lethal: 8, temp: 2 },
    });
  });

  it('renvoie la dépletion inchangée quand le manque est déjà au plafond', () => {
    const dep = { hp: { lethal: 10, temp: 0 } };
    expect(applyDamage(dep, 5, 'lethal', 10)).toBe(dep);
    const dep2 = { hp: { lethal: 7, temp: 3 } };
    expect(applyDamage(dep2, 5, 'temp', 10)).toBe(dep2);
  });

  it('sans maxHp, aucun plafond (comportement historique)', () => {
    expect(applyDamage({ hp: { lethal: 6, temp: 0 } }, 8, 'lethal')).toEqual({
      hp: { lethal: 14, temp: 0 },
    });
  });
});

describe('healHp', () => {
  it('résorbe les dégâts létaux en premier', () => {
    expect(healHp({ hp: { lethal: 8, temp: 4 } }, 3)).toEqual({ hp: { lethal: 5, temp: 4 } });
  });

  it('déborde sur les temporaires une fois les létaux épuisés', () => {
    expect(healHp({ hp: { lethal: 2, temp: 6 } }, 5)).toEqual({ hp: { lethal: 0, temp: 3 } });
  });

  it('normalise en jauge pleine si tout est soigné', () => {
    expect(healHp({ hp: { lethal: 2, temp: 3 } }, 10)).toEqual({});
  });

  it('ne fait rien sur des PV déjà pleins', () => {
    expect(healHp({}, 5)).toEqual({});
  });
});

describe('resetHp', () => {
  it('retire la dépletion de PV', () => {
    expect(resetHp({ hp: { lethal: 5, temp: 2 } })).toEqual({});
  });

  it('conserve les autres jauges', () => {
    expect(resetHp({ hp: { lethal: 5, temp: 2 }, mana: 3 })).toEqual({ mana: 3 });
  });
});

describe('setManaMissing', () => {
  it('borne à [0, max] et retire la clé à plein', () => {
    expect(setManaMissing({}, 3, 10)).toEqual({ mana: 3 });
    expect(setManaMissing({ mana: 3 }, 0, 10)).toEqual({});
    expect(setManaMissing({}, 99, 10)).toEqual({ mana: 10 });
    expect(setManaMissing({ mana: 5 }, -2, 10)).toEqual({});
  });

  it('conserve les PV', () => {
    expect(setManaMissing({ hp: { lethal: 4, temp: 0 } }, 2, 10)).toEqual({
      hp: { lethal: 4, temp: 0 },
      mana: 2,
    });
  });

  it('remet à plein si max ≤ 0', () => {
    expect(setManaMissing({ mana: 3 }, 3, 0)).toEqual({});
  });
});

describe('spendMana / restoreMana / resetMana', () => {
  it('dépense en cumulant le manque, borné au max', () => {
    expect(spendMana({}, 4, 10)).toEqual({ mana: 4 });
    expect(spendMana({ mana: 8 }, 5, 10)).toEqual({ mana: 10 });
  });

  it('récupère en réduisant le manque, plancher 0', () => {
    expect(restoreMana({ mana: 7 }, 3, 10)).toEqual({ mana: 4 });
    expect(restoreMana({ mana: 2 }, 5, 10)).toEqual({});
  });

  it('reset retire la dépletion de mana en conservant les PV', () => {
    expect(resetMana({ mana: 6, hp: { lethal: 3, temp: 0 } })).toEqual({ hp: { lethal: 3, temp: 0 } });
  });
});

describe('dés de récupération (DR)', () => {
  it('current = clamp(max − dépensés, 0, max)', () => {
    expect(currentRecoveryDice(4, {})).toBe(4);
    expect(currentRecoveryDice(4, { recoveryDice: 1 })).toBe(3);
    expect(currentRecoveryDice(4, { recoveryDice: 9 })).toBe(0);
  });

  it('dépense / regagne bornés, reset conserve les autres jauges', () => {
    expect(spendRecoveryDice({}, 2, 4)).toEqual({ recoveryDice: 2 });
    expect(spendRecoveryDice({ recoveryDice: 3 }, 5, 4)).toEqual({ recoveryDice: 4 });
    expect(restoreRecoveryDice({ recoveryDice: 3 }, 1, 4)).toEqual({ recoveryDice: 2 });
    expect(restoreRecoveryDice({ recoveryDice: 1 }, 5, 4)).toEqual({});
    expect(resetRecoveryDice({ recoveryDice: 2, mana: 3 })).toEqual({ mana: 3 });
  });

  it('pruneDepletion normalise les DR pleins', () => {
    expect(pruneDepletion({ recoveryDice: 0 })).toEqual({});
    expect(pruneDepletion({ recoveryDice: 2 })).toEqual({ recoveryDice: 2 });
  });
});
