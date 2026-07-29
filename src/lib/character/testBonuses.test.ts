import { describe, expect, it } from 'vitest';
import {
  COMPETENCE_BONUS_CAP,
  freelyStackingAbilityTestBonuses,
  magicTestBonusSources,
  resolveTestBonus,
  testBonusSources,
  type EffectContext,
  type MagicTestSource,
} from './effects';
import { testBonusSourcesFromEquipment } from './equipment';
import type { EquipmentLine } from './types';

/** Contexte minimal : les bonus testés ici ne dépendent ni du niveau ni des caracs. */
const ctx: EffectContext = {
  level: 5,
  abilities: { AGI: 2, CON: 2, FOR: 3, PER: 1, CHA: 0, INT: 0, VOL: 1 },
  toggles: {},
};

/** Un accessoire porté, seul vecteur usuel d'un objet enchanté (anneau, cape, bottes…). */
const worn = (name: string, testBonuses: Record<string, number>): EquipmentLine => ({
  custom: true,
  name,
  quantity: 1,
  worn: { slot: 'accessory' },
  testBonuses,
});

describe('testBonusSourcesFromEquipment (apports aux tests des objets, PER-275)', () => {
  it("ne compte que les objets PORTÉS (le sac n'apporte rien)", () => {
    const lines: EquipmentLine[] = [
      worn('Cape d’ombre', { stealth: 5 }),
      { custom: true, name: 'Cape rangée', quantity: 1, testBonuses: { stealth: 5 } },
    ];
    const { byDomain } = testBonusSourcesFromEquipment(lines);
    expect(byDomain).toEqual({ stealth: [{ name: 'Cape d’ombre', value: 5 }] });
  });

  it('démêle les cibles CARAC des cibles DOMAINE', () => {
    const lines: EquipmentLine[] = [worn('Anneau de vigueur', { FOR: 2, breaking: 3 })];
    const { byAbility, byDomain } = testBonusSourcesFromEquipment(lines);
    expect(byAbility).toEqual({ FOR: [{ name: 'Anneau de vigueur', value: 2 }] });
    expect(byDomain).toEqual({ breaking: [{ name: 'Anneau de vigueur', value: 3 }] });
  });

  it('ignore une cible INCONNUE et un apport à 0, sans écarter les autres du même objet', () => {
    const lines: EquipmentLine[] = [
      worn('Amulette bricolée', { stealth: 5, 'domaine-inexistant': 4, climbing: 0 }),
    ];
    const { byAbility, byDomain } = testBonusSourcesFromEquipment(lines);
    expect(byDomain).toEqual({ stealth: [{ name: 'Amulette bricolée', value: 5 }] });
    expect(byAbility).toEqual({});
  });

  it('liste TOUS les objets portés qui visent la même cible (le tri est fait à l’arbitrage)', () => {
    const lines: EquipmentLine[] = [
      worn('Cape d’ombre', { stealth: 5 }),
      worn('Bottes feutrées', { stealth: 2 }),
    ];
    expect(testBonusSourcesFromEquipment(lines).byDomain.stealth).toEqual([
      { name: 'Cape d’ombre', value: 5 },
      { name: 'Bottes feutrées', value: 2 },
    ]);
  });
});

describe('magicTestBonusSources (famille des bonus de magie, PER-275 / PER-134)', () => {
  it('collecte le bonus de magie d’une capacité marquée (Tatouages, p. 80)', () => {
    const sources = magicTestBonusSources(['pagne-r3'], [], {
      ...ctx,
      featureChoices: { 'pagne-r3': ['bull'] },
    });
    expect(sources).toEqual([
      { name: 'Tatouages', featureId: 'pagne-r3', value: 3, scope: { kind: 'ability', ability: 'FOR' } },
    ]);
  });

  it('ignore les bonus aux tests NON marqués comme magiques (ils se cumulent librement)', () => {
    // `pagne-r1` (Vigueur) accorde un bonus de COMPÉTENCE à trois domaines : il relève de la
    // grille de la p. 203, pas de la famille magique.
    expect(magicTestBonusSources(['pagne-r1'], [], ctx)).toEqual([]);
  });

  it('collecte les objets portés, avec leur portée, et sans featureId (source = un objet)', () => {
    const lines: EquipmentLine[] = [worn('Cape d’ombre', { stealth: 5, AGI: 1 })];
    expect(magicTestBonusSources([], lines, ctx)).toEqual([
      { name: 'Cape d’ombre', value: 1, scope: { kind: 'ability', ability: 'AGI' } },
      { name: 'Cape d’ombre', value: 5, scope: { kind: 'domain', domain: 'stealth' } },
    ]);
  });
});

describe('freelyStackingAbilityTestBonuses', () => {
  it('écarte les bonus de magie et garde les autres', () => {
    const kept = freelyStackingAbilityTestBonuses([
      { featureId: 'pagne-r3', name: 'Tatouages', value: 3, magic: true },
      { featureId: 'divination-r5', name: 'Prescience', value: 10 },
    ]);
    expect(kept.map((s) => s.featureId)).toEqual(['divination-r5']);
  });
});

describe('resolveTestBonus (cumul p. 203 + non-cumul des bonus de magie p. 80)', () => {
  /** Bonus de compétence RÉEL de la Voie du pagne sur l'escalade : +3 (profil, 2 + rang 1). */
  const climbingCompetence = () =>
    testBonusSources(['pagne-r1'], ctx).find((b) => b.domain === 'climbing');

  it('un bonus de compétence de voie et un objet magique S’ADDITIONNENT (p. 203)', () => {
    const competence = climbingCompetence();
    expect(competence?.total).toBe(3);
    const magic = magicTestBonusSources([], [worn('Bottes d’escalade', { climbing: 5 })], ctx);
    const resolved = resolveTestBonus({ competence, magic, ability: 'AGI', domain: 'climbing' });
    expect(resolved.flat).toBe(8);
    expect(resolved.keptMagic?.name).toBe('Bottes d’escalade');
    expect(resolved.dominatedMagic).toEqual([]);
    expect(resolved.capped).toBe(false);
  });

  it('deux objets portés sur le MÊME test NE SE CUMULENT PAS : on garde le meilleur', () => {
    const magic = magicTestBonusSources(
      [],
      [worn('Cape d’ombre', { stealth: 5 }), worn('Bottes feutrées', { stealth: 2 })],
      ctx,
    );
    const resolved = resolveTestBonus({ magic, ability: 'AGI', domain: 'stealth' });
    expect(resolved.flat).toBe(5);
    expect(resolved.keptMagic?.name).toBe('Cape d’ombre');
    expect(resolved.dominatedMagic.map((s) => s.name)).toEqual(['Bottes feutrées']);
  });

  it('déséquiper l’objet rend la valeur d’origine (plus aucun bonus de magie)', () => {
    const stowed: EquipmentLine[] = [
      { custom: true, name: 'Cape d’ombre', quantity: 1, testBonuses: { stealth: 5 } },
    ];
    const resolved = resolveTestBonus({
      magic: magicTestBonusSources([], stowed, ctx),
      ability: 'AGI',
      domain: 'stealth',
    });
    expect(resolved.flat).toBe(0);
    expect(resolved.keptMagic).toBeNull();
  });

  it('un MALUS s’applique quand il est le seul bonus de magie du test', () => {
    const magic = magicTestBonusSources([], [worn('Heaume maudit', { senses: -2 })], ctx);
    const resolved = resolveTestBonus({ magic, ability: 'PER', domain: 'senses' });
    expect(resolved.flat).toBe(-2);
    expect(resolved.keptMagic?.value).toBe(-2);
  });

  it('plafonne le total (compétence + magie) à +15 (p. 203)', () => {
    // Compétence forgée à +14 pour n'éprouver ici QUE le plafond.
    const competence = {
      domain: 'stealth',
      total: 14,
      capped: false,
      sources: [{ featureId: 'x', name: 'Voie fictive', category: 'class' as const, value: 14 }],
    };
    const magic = magicTestBonusSources([], [worn('Cape d’ombre', { stealth: 5 })], ctx);
    const resolved = resolveTestBonus({ competence, magic, ability: 'AGI', domain: 'stealth' });
    expect(resolved.flat).toBe(COMPETENCE_BONUS_CAP);
    expect(resolved.capped).toBe(true);
  });

  it('n’efface pas un plafond déjà atteint par les seuls bonus de compétence', () => {
    const competence = { domain: 'stealth', total: 15, capped: true, sources: [] };
    const resolved = resolveTestBonus({ competence, magic: [], ability: 'AGI', domain: 'stealth' });
    expect(resolved.flat).toBe(15);
    expect(resolved.capped).toBe(true);
  });

  it('sépare le bonus de magie de portée CARAC du bonus PLAT du domaine', () => {
    // Un objet visant la carac vaut pour tous ses tests : il est porté par la ligne d'en-tête
    // « test de CARAC » et ne s'ajoute au domaine que lorsqu'on inclut la carac.
    const magic = magicTestBonusSources([], [worn('Anneau de vigueur', { FOR: 2 })], ctx);
    const resolved = resolveTestBonus({ magic, ability: 'FOR', domain: 'breaking' });
    expect(resolved.flat).toBe(0);
    expect(resolved.abilityMagic).toBe(2);
  });

  it('un bonus de portée DOMAINE ne s’applique pas à un test de carac NU', () => {
    const magic = magicTestBonusSources([], [worn('Cape d’ombre', { stealth: 5 })], ctx);
    const resolved = resolveTestBonus({ magic, ability: 'AGI' });
    expect(resolved.flat).toBe(0);
    expect(resolved.abilityMagic).toBe(0);
    expect(resolved.keptMagic).toBeNull();
  });

  it('un bonus de portée CARAC ne vaut que pour SA carac (domaine multi-carac)', () => {
    // Équitation relève de CON et de CHA (p. 233) : un anneau « +2 aux tests de CON » compte
    // quand le MJ demande un jet de CON, pas quand il demande un jet de CHA.
    const magic = magicTestBonusSources([], [worn('Anneau du cavalier', { CON: 2 })], ctx);
    expect(resolveTestBonus({ magic, ability: 'CON', domain: 'riding' }).abilityMagic).toBe(2);
    expect(resolveTestBonus({ magic, ability: 'CHA', domain: 'riding' }).abilityMagic).toBe(0);
  });

  describe('PER-134 — non-cumul du bonus de magie d’une capacité avec celui d’un objet', () => {
    const tattooCtx: EffectContext = { ...ctx, featureChoices: { 'pagne-r3': ['bull'] } };

    it('le Tatouage (+3 FOR) et un anneau (+2 FOR) ne se cumulent pas : le tatouage l’emporte', () => {
      const magic = magicTestBonusSources(
        ['pagne-r3'],
        [worn('Anneau de vigueur', { FOR: 2 })],
        tattooCtx,
      );
      const resolved = resolveTestBonus({ magic, ability: 'FOR' });
      expect(resolved.abilityMagic).toBe(3);
      expect(resolved.keptMagic?.featureId).toBe('pagne-r3');
      expect(resolved.dominatedMagic.map((s) => s.name)).toEqual(['Anneau de vigueur']);
    });

    it('un anneau PLUS FORT (+5 FOR) domine le Tatouage (on retient le meilleur, pas la somme)', () => {
      const magic = magicTestBonusSources(
        ['pagne-r3'],
        [worn('Anneau de force du géant', { FOR: 5 })],
        tattooCtx,
      );
      const resolved = resolveTestBonus({ magic, ability: 'FOR' });
      expect(resolved.abilityMagic).toBe(5);
      expect(resolved.keptMagic?.name).toBe('Anneau de force du géant');
      expect(resolved.dominatedMagic.map((s) => s.featureId)).toEqual(['pagne-r3']);
    });

    it('le Tatouage reste intact face à un objet visant une AUTRE caractéristique', () => {
      const magic = magicTestBonusSources(
        ['pagne-r3'],
        [worn('Bottes de vivacité', { AGI: 2 })],
        tattooCtx,
      );
      expect(resolveTestBonus({ magic, ability: 'FOR' }).abilityMagic).toBe(3);
      expect(resolveTestBonus({ magic, ability: 'AGI' }).abilityMagic).toBe(2);
    });

    it('le Tatouage se cumule avec un bonus de COMPÉTENCE (familles différentes)', () => {
      const magic = magicTestBonusSources(['pagne-r1', 'pagne-r3'], [], {
        ...tattooCtx,
      });
      const competence = testBonusSources(['pagne-r1'], ctx).find((b) => b.domain === 'climbing');
      const resolved = resolveTestBonus({ competence, magic, ability: 'AGI', domain: 'climbing' });
      // Le tatouage choisi vise FOR : rien sur un test d'AGI, seul le +3 de compétence compte.
      expect(resolved.flat).toBe(3);
      expect(resolved.abilityMagic).toBe(0);
    });

    it('un objet de portée DOMAINE reste cumulable au bonus de compétence du même domaine', () => {
      const sources: MagicTestSource[] = [
        { name: 'Bottes d’escalade', value: 5, scope: { kind: 'domain', domain: 'climbing' } },
      ];
      const competence = climbingCompetence();
      expect(resolveTestBonus({ competence, magic: sources, ability: 'AGI', domain: 'climbing' }).flat).toBe(8);
    });
  });
});
