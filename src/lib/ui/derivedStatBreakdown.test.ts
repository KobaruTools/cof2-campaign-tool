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

  it('Défense : note « warning » quand l’AGI est plafonnée par l’armure', () => {
    const bd = derivedStatBreakdown('defense', {
      abilities: abilities({ AGI: 4 }),
      level: 1,
      family: family('adventurers'),
      defenseEquipment: { defBonus: 6, maxAgi: 1 },
      spellCount: 0,
    });
    expect(bd.note).toContain('plafonnée');
    expect(bd.noteTone).toBe('warning');
  });

  it('Défense : ligne distincte pour le bonus magique de l’armure (PER-85)', () => {
    const bd = derivedStatBreakdown('defense', {
      abilities: abilities({ AGI: 1 }),
      level: 1,
      family: family('adventurers'),
      defenseEquipment: { defBonus: 2, maxAgi: null, magicDefBonus: 1 },
      spellCount: 0,
    });
    // DEF mondaine et bonus magique apparaissent sur DEUX lignes séparées.
    const magic = bd.terms.find((t) => t.label.toLowerCase().includes('magique'));
    expect(magic?.value).toBe(1);
    const mundane = bd.terms.find((t) => t.label.includes('Armure'));
    expect(mundane?.value).toBe(2);
    // Total = 10 + AGI 1 + mondaine 2 + magie 1 = 14.
    expect(bd.total).toBe(14);
  });

  it('Défense : aucune ligne « magique » sans bonus magique', () => {
    const bd = derivedStatBreakdown('defense', {
      abilities: abilities({ AGI: 1 }),
      level: 1,
      family: family('adventurers'),
      defenseEquipment: { defBonus: 2, maxAgi: null },
      spellCount: 0,
    });
    expect(bd.terms.find((t) => t.label.toLowerCase().includes('magique'))).toBeUndefined();
  });

  it('Défense : pas de note quand l’AGI n’est pas plafonnée', () => {
    const bd = derivedStatBreakdown('defense', {
      abilities: abilities({ AGI: 1 }),
      level: 1,
      family: family('adventurers'),
      defenseEquipment: { defBonus: 6, maxAgi: 3 }, // AGI 1 ≤ 3 → pas de plafonnement
      spellCount: 0,
    });
    expect(bd.note).toBeUndefined();
    expect(bd.noteTone).toBeUndefined();
  });

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
    expect(bd.page).toBe(180); // pas de niveau mixte → base hybride p. 180
    expect(bd.note).toBeTruthy();
    // Deux sous-lignes « Niveau 1 · <famille> » (5 et 4) + CON (2) = 11.
    expect(bd.terms.filter((t) => t.label.includes('PV de base du profil'))).toHaveLength(2);
    expect(bd.total).toBe(11);
  });

  it('PV hybrides niveau 2 mixte : une ligne par niveau, moyenne explicite, renvoi p. 177', () => {
    // Cas du forgesort/combattant niveau 2 : base 3 + 5 + CON 2 = 10, puis un
    // niveau mixte moyenne(Mages 3, Combattants 5) = 4, + CON 2 = 6. Total 16.
    const bd = derivedStatBreakdown('maxHp', {
      abilities: abilities({ CON: 2 }),
      level: 2,
      family: family('mages'),
      defenseEquipment: { defBonus: 0, maxAgi: null },
      spellCount: 0,
      hpLevel1Family: 8,
      hpLevel1Families: ['mages', 'fighters'],
      hpFamilyGains: [4],
      hpLevelGains: [{ level: 2, familyIds: ['mages', 'fighters'], familyGain: 4 }],
    });
    expect(bd.page).toBe(177); // niveau mixte → p. 177
    const mixedLine = bd.terms.find((t) => t.label.includes('niveau mixte'));
    expect(mixedLine?.label).toContain('moyenne');
    expect(mixedLine?.value).toBe(6); // 4 (famille) + 2 (CON)
    expect(bd.total).toBe(16);
  });

  it('PV hybrides à la base mais mono-famille ensuite : niveaux 2..N regroupés en une plage', () => {
    // Hybride prêtre/magicien : base mystiques 4 + mages 3 + CON 1 = 8, puis tous
    // les niveaux 2 à 5 sont mono-famille mystiques (4 PV) + CON 1 = 5 chacun.
    // Les quatre lignes identiques doivent fusionner en « Niveaux 2 à 5 ».
    const monoGains: { level: number; familyIds: ['mystics']; familyGain: number }[] = [
      { level: 2, familyIds: ['mystics'], familyGain: 4 },
      { level: 3, familyIds: ['mystics'], familyGain: 4 },
      { level: 4, familyIds: ['mystics'], familyGain: 4 },
      { level: 5, familyIds: ['mystics'], familyGain: 4 },
    ];
    const bd = derivedStatBreakdown('maxHp', {
      abilities: abilities({ CON: 1 }),
      level: 5,
      family: family('mystics'),
      defenseEquipment: { defBonus: 0, maxAgi: null },
      spellCount: 0,
      hpLevel1Family: 7,
      hpLevel1Families: ['mystics', 'mages'],
      hpFamilyGains: monoGains.map((g) => g.familyGain),
      hpLevelGains: monoGains,
    });
    // Une seule ligne de plage pour les niveaux 2 à 5 (pas quatre lignes).
    const rangeLine = bd.terms.find((t) => t.label.startsWith('Niveaux 2 à 5'));
    expect(rangeLine).toBeDefined();
    expect(rangeLine?.value).toBe(20); // (4 + CON 1) × 4
    // Aucune ligne « Niveau N · » individuelle pour N ≥ 2 (tout est dans la plage).
    expect(bd.terms.filter((t) => /^Niveau [2-9]\d* ·/.test(t.label))).toHaveLength(0);
    expect(bd.total).toBe(8 + 20); // base hybride 8 + plage 20
  });

  it('détaille les capacités sous « Capacités / divers » sans fausser le total', () => {
    const input: DerivedInput = {
      abilities: abilities(),
      level: 1,
      family: family('fighters'),
      defenseEquipment: { defBonus: 0, maxAgi: null },
      spellCount: 0,
      mods: { initiative: 3 },
    };
    const bd = derivedStatBreakdown('initiative', input, {
      initiative: [{ label: 'Réflexes éclair', value: 3 }],
    });
    const capLine = bd.terms.find((t) => t.label === 'Capacités / divers');
    expect(capLine?.value).toBe(3);
    expect(capLine?.subTerms).toEqual([{ label: 'Réflexes éclair', value: 3 }]);
    expect(bd.total).toBe(14); // 10 + PER 1 + mods 3 ; les sous-termes n'y entrent pas
  });

  it('affiche « Capacités / divers » même quand les contributions s’annulent (net 0)', () => {
    // Parade croisée +2 (conditionnel) et Rage du berserk −2 (temporaire) actives :
    // la somme nette est 0, mais le détail doit rester visible pour ne pas laisser
    // croire qu'un effet pourtant actif a disparu.
    const input: DerivedInput = {
      abilities: abilities(),
      level: 5,
      family: family('fighters'),
      defenseEquipment: { defBonus: 6, maxAgi: null },
      spellCount: 0,
      mods: { def: 0 }, // +2 et −2 sommés par le moteur
    };
    const bd = derivedStatBreakdown('defense', input, {
      def: [
        { label: 'Parade croisée (conditionnel)', value: 2 },
        { label: 'Rage du berserk (conditionnel)', value: -2 },
      ],
    });
    const capLine = bd.terms.find((t) => t.label === 'Capacités / divers');
    expect(capLine).toBeDefined();
    expect(capLine?.value).toBe(0);
    expect(capLine?.subTerms).toHaveLength(2);
    expect(bd.total).toBe(18); // 10 + AGI 2 + armure 6 + capacités 0
  });

  it('mana : pas de détail ni de total quand aucun sort connu', () => {
    const bd = derivedStatBreakdown('manaPoints', cases[0].input);
    expect(bd.total).toBeNull();
    expect(bd.terms).toHaveLength(0);
    expect(bd.note).toBeTruthy();
  });
});
