import { describe, expect, it } from 'vitest';
import { families } from '@/data/families';
import type { Family } from '@/data/schema';
import { deriveStats, type Abilities, type DerivedInput } from '@/lib/engine';
import { DERIVED_STAT_IDS, type DerivedStatId } from './derivedStats';
import { derivedStatBreakdown } from './derivedStatBreakdown';

const family = (id: string): Family => {
  const f = families.find((x) => x.id === id);
  if (!f) throw new Error(`famille introuvable: ${id}`);
  return f;
};

const abilities = (overrides: Partial<Abilities> = {}): Abilities => ({
  FOR: 1, AGI: 2, CON: 2, PER: 1, CHA: 0, INT: 0, VOL: 1, ...overrides,
});

/** Valeur du moteur correspondant à un id de détail. */
const engineValue = (id: DerivedStatId, s: ReturnType<typeof deriveStats>): number | null => {
  switch (id) {
    case 'maxHp': return s.maxHp;
    case 'defense': return s.defense;
    case 'initiative': return s.initiative;
    case 'luckPoints': return s.luckPoints;
    case 'recoveryDice': return s.recoveryDiceCount;
    case 'manaPoints': return s.manaPoints;
    case 'meleeAttack': return s.meleeAttack;
    case 'rangedAttack': return s.rangedAttack;
    case 'magicAttack': return s.magicAttack;
  }
};

const cases: Array<{ name: string; input: DerivedInput }> = [
  {
    name: 'combattant niveau 1, sans sort, sans armure',
    input: {
      abilities: abilities(),
      level: 1,
      family: family('fighters'),
      defenseEquipment: { defBonus: 0, maxAgi: null },
      spellCount: 0,
    },
  },
  {
    name: 'mage niveau 1 avec sorts et bonus de famille',
    input: {
      abilities: abilities({ VOL: 3, CHA: 1 }),
      level: 1,
      family: family('mages'),
      defenseEquipment: { defBonus: 2, maxAgi: null },
      spellCount: 2,
    },
  },
  {
    name: 'AGI plafonnée par l’armure',
    input: {
      abilities: abilities({ AGI: 4 }),
      level: 1,
      family: family('adventurers'),
      defenseEquipment: { defBonus: 6, maxAgi: 1 },
      spellCount: 0,
    },
  },
  {
    name: 'niveau 5 (PV multi-niveaux, attaques plafonnées plus tard)',
    input: {
      abilities: abilities({ FOR: 3, CON: 2 }),
      level: 5,
      family: family('mystics'),
      defenseEquipment: { defBonus: 3, maxAgi: 2 },
      spellCount: 1,
    },
  },
  {
    name: 'hybride niveau 1 (PV de base = somme des deux familles, p. 180)',
    input: {
      abilities: abilities({ CON: 2 }),
      level: 1,
      family: family('fighters'), // profil principal combattant
      defenseEquipment: { defBonus: 0, maxAgi: null },
      spellCount: 0,
      hpLevel1Family: 9, // combattant 5 + mystique 4
      hpLevel1Families: ['fighters', 'mystics'],
    },
  },
];

describe('derivedStatBreakdown ↔ deriveStats', () => {
  for (const { name, input } of cases) {
    it(`le total de chaque détail vaut la valeur du moteur — ${name}`, () => {
      const stats = deriveStats(input);
      for (const id of DERIVED_STAT_IDS) {
        const bd = derivedStatBreakdown(id, input);
        expect(bd.total, id).toBe(engineValue(id, stats));
      }
    });
  }

  it('PV hybrides niveau 1 : une sous-ligne par famille + renvoi p. 180', () => {
    const bd = derivedStatBreakdown('maxHp', {
      abilities: abilities({ CON: 2 }),
      level: 1,
      family: family('fighters'),
      defenseEquipment: { defBonus: 0, maxAgi: null },
      spellCount: 0,
      hpLevel1Family: 9,
      hpLevel1Families: ['fighters', 'mystics'],
    });
    expect(bd.page).toBe(180);
    expect(bd.note).toBeTruthy();
    // Deux sous-lignes de famille (5 et 4) + CON (2) = 11.
    expect(bd.terms.filter((t) => t.label.startsWith('Famille des'))).toHaveLength(2);
    expect(bd.total).toBe(11);
  });

  it('mana : pas de détail ni de total quand aucun sort connu', () => {
    const bd = derivedStatBreakdown('manaPoints', cases[0].input);
    expect(bd.total).toBeNull();
    expect(bd.terms).toHaveLength(0);
    expect(bd.note).toBeTruthy();
  });
});
