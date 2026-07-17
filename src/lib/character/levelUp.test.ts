import { describe, expect, it } from 'vitest';
import { featureById, classById, pathById } from '@/data';
import { families } from '@/data/families';
import { progression } from '@/data/progression';
import type { FamilyId } from '@/data/schema';
import type { RulesContext } from '@/lib/engine';
import { SCHEMA_VERSION, type Character } from './types';
import {
  acquirableFeatures,
  applyLevelUp,
  canUndoLastLevelUp,
  deselectFeature,
  FEATURE_POINTS_PER_LEVEL,
  featureIdsFromHistory,
  forgettableFeatures,
  levelUpDieFamily,
  lockedRank12Family,
  manualFeatureIds,
  maxRetrainings,
  totalFeatureCost,
  undoLastLevelUp,
} from './levelUp';

const ctx: RulesContext = {
  featureById,
  pathById,
  classById,
  familyById: new Map(families.map((f) => [f.id as FamilyId, f])),
  progression,
};

function makeCharacter(over: Partial<Character> = {}): Character {
  return {
    schemaVersion: SCHEMA_VERSION,
    id: 'test',
    name: 'Test',
    identity: {},
    ancestryId: 'humain',
    classId: 'barbare',
    level: 1,
    priestVocation: null,
    portraitVariant: 'default',
    firearmsAllowed: true,
    campaignId: 'default-campaign',
    playerId: 'default-player',
    status: 'active',
    abilities: { AGI: 0, CON: 0, FOR: 0, PER: 0, CHA: 0, INT: 0, VOL: 0 },
    baseAbilities: { AGI: 0, CON: 0, FOR: 0, PER: 0, CHA: 0, INT: 0, VOL: 0 },
    ancestryChoices: [],
    ancestryPathId: 'humain',
    featureIds: ['rage-r1'],
    featureChoices: {},
    effectToggles: {},
    effectInputs: {},
    usageCounters: {},
    depletion: {},
    purse: { platinum: 0, gold: 0, silver: 0, copper: 0 },
    levelUpHistory: [{ level: 1, chosenFeatureIds: ['rage-r1'] }],
    equipment: [],
    overrides: {},
    notes: '',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...over,
  };
}

describe('acquirableFeatures', () => {
  it('ne propose que des capacités légales (rang suivant d’une voie entamée)', () => {
    // Niveau 2 : rage-r1 acquis → rage-r2 (rang 2, niveau requis 2) doit être proposé.
    const c = makeCharacter({ level: 2 });
    const ids = acquirableFeatures(c, ctx).map((f) => f.id);
    expect(ids).toContain('rage-r2');
    // Aucune capacité déjà acquise.
    expect(ids).not.toContain('rage-r1');
    // Aucun rang « à trous » : rage-r3 (niveau requis 3) absent au niveau 2.
    expect(ids).not.toContain('rage-r3');
  });

  it('exclut les voies de prestige avant le niveau 5', () => {
    const c = makeCharacter({ level: 4 });
    const ids = acquirableFeatures(c, ctx).map((f) => f.id);
    expect(ids).not.toContain('prestige-expert-r4');
  });
});

describe('totalFeatureCost', () => {
  it('rang 1-2 coûtent 1 point, rang 3+ coûtent 2 points', () => {
    expect(totalFeatureCost(['brute-r1'], ctx)).toBe(1);
    expect(totalFeatureCost(['brute-r1', 'brute-r2'], ctx)).toBe(2);
    expect(totalFeatureCost(['brute-r3'], ctx)).toBe(2);
    // Deux capacités de rang 3 = 4 points : au-delà du budget d'un niveau (2).
    expect(totalFeatureCost(['brute-r3', 'rage-r3'], ctx)).toBeGreaterThan(
      FEATURE_POINTS_PER_LEVEL,
    );
  });

  it('budget par niveau = 2 points', () => {
    expect(FEATURE_POINTS_PER_LEVEL).toBe(2);
  });
});

describe('manualFeatureIds', () => {
  it('repère les capacités absentes de l’historique (ajout manuel sur la fiche)', () => {
    const c = makeCharacter({
      featureIds: ['rage-r1', 'brute-r1'], // brute-r1 ajouté hors wizard
      levelUpHistory: [{ level: 1, chosenFeatureIds: ['rage-r1'] }],
    });
    const manual = manualFeatureIds(c);
    expect(manual.has('brute-r1')).toBe(true);
    expect(manual.has('rage-r1')).toBe(false);
  });

  it('rien de manuel quand tout vient de l’historique', () => {
    const c = makeCharacter({
      featureIds: ['rage-r1', 'brute-r1'],
      levelUpHistory: [
        { level: 1, chosenFeatureIds: ['rage-r1'] },
        { level: 2, chosenFeatureIds: ['brute-r1'] },
      ],
    });
    expect(manualFeatureIds(c).size).toBe(0);
  });

  it('ensemble vide si aucun historique (rien à distinguer)', () => {
    const c = makeCharacter({ featureIds: ['rage-r1', 'brute-r1'], levelUpHistory: [] });
    expect(manualFeatureIds(c).size).toBe(0);
  });
});

describe('featureIdsFromHistory', () => {
  it('reconstruit les capacités en rejouant l’historique (dans l’ordre)', () => {
    const c = makeCharacter({
      featureIds: ['rage-r1', 'brute-r1'],
      levelUpHistory: [
        { level: 1, chosenFeatureIds: ['rage-r1'] },
        { level: 2, chosenFeatureIds: ['brute-r1'] },
      ],
    });
    expect(featureIdsFromHistory(c)).toEqual(['rage-r1', 'brute-r1']);
  });

  it('ignore les capacités ajoutées à la main (absentes de l’historique)', () => {
    const c = makeCharacter({
      featureIds: ['rage-r1', 'brute-r1'], // brute-r1 ajouté hors wizard
      levelUpHistory: [{ level: 1, chosenFeatureIds: ['rage-r1'] }],
    });
    expect(featureIdsFromHistory(c)).toEqual(['rage-r1']);
  });

  it('restitue une capacité supprimée à la main (présente dans l’historique)', () => {
    const c = makeCharacter({
      featureIds: ['rage-r1'], // rage-r2 supprimé à la main sur la fiche
      levelUpHistory: [
        { level: 1, chosenFeatureIds: ['rage-r1'] },
        { level: 2, chosenFeatureIds: ['rage-r2'] },
      ],
    });
    expect(featureIdsFromHistory(c)).toEqual(['rage-r1', 'rage-r2']);
  });

  it('retire les capacités oubliées (changement d’orientation, p. 43)', () => {
    const c = makeCharacter({
      levelUpHistory: [
        { level: 1, chosenFeatureIds: ['rage-r1'] },
        { level: 2, chosenFeatureIds: ['brute-r1'], forgottenFeatureIds: ['rage-r1'] },
      ],
    });
    expect(featureIdsFromHistory(c)).toEqual(['brute-r1']);
  });

  it('renvoie null si l’historique est vide (rien à reconstruire)', () => {
    const c = makeCharacter({ featureIds: ['rage-r1', 'brute-r1'], levelUpHistory: [] });
    expect(featureIdsFromHistory(c)).toBeNull();
  });
});

describe('deselectFeature', () => {
  it('retire la capacité visée et les rangs supérieurs de la même voie', () => {
    const picked = ['rage-r2', 'rage-r3', 'brute-r2'];
    expect(deselectFeature(picked, 'rage-r2')).toEqual(['brute-r2']);
  });

  it('ne touche pas aux autres voies', () => {
    const picked = ['rage-r2', 'brute-r2'];
    expect(deselectFeature(picked, 'brute-r2')).toEqual(['rage-r2']);
  });
});

describe('applyLevelUp', () => {
  it('incrémente le niveau, ajoute les capacités et journalise', () => {
    const c = makeCharacter({ level: 1 });
    const next = applyLevelUp(c, ['rage-r2']);
    expect(next.level).toBe(2);
    expect(next.featureIds).toContain('rage-r2');
    expect(next.levelUpHistory).toHaveLength(2);
    expect(next.levelUpHistory[1]).toEqual({ level: 2, chosenFeatureIds: ['rage-r2'] });
  });

  it('n’ajoute pas de doublon dans featureIds', () => {
    const c = makeCharacter({ level: 1, featureIds: ['rage-r1'] });
    const next = applyLevelUp(c, ['rage-r1', 'brute-r1']);
    expect(next.featureIds.filter((id) => id === 'rage-r1')).toHaveLength(1);
    expect(next.featureIds).toContain('brute-r1');
  });
});

describe('maxRetrainings (changement d’orientation, p. 43)', () => {
  it('1 reconversion par défaut, 2 dès +2 en INT', () => {
    const abilities = { AGI: 0, CON: 0, FOR: 0, PER: 0, CHA: 0, INT: 1, VOL: 0 };
    expect(maxRetrainings(makeCharacter({ abilities }))).toBe(1);
    expect(maxRetrainings(makeCharacter({ abilities: { ...abilities, INT: 2 } }))).toBe(2);
    expect(maxRetrainings(makeCharacter({ abilities: { ...abilities, INT: 4 } }))).toBe(2);
  });
});

describe('forgettableFeatures (changement d’orientation, p. 43)', () => {
  it('n’expose que le rang le plus haut de chaque voie, hors capacités gratuites', () => {
    const c = makeCharacter({
      level: 3,
      featureIds: ['rage-r1', 'rage-r2', 'brute-r1'],
      levelUpHistory: [
        // rage-r1 + brute-r1 = gratuites (jeunesse / voie de départ) → jamais oubliables.
        { level: 1, chosenFeatureIds: ['rage-r1', 'brute-r1'] },
        { level: 2, chosenFeatureIds: ['rage-r2'] },
      ],
    });
    const ids = forgettableFeatures(c).map((f) => f.id);
    // Seule rage-r2 (rang le plus haut de la voie, achetée) est oubliable.
    expect(ids).toEqual(['rage-r2']);
  });

  it('ne propose rien si le gratuit n’est pas identifiable (pas d’historique de niveau 1)', () => {
    const c = makeCharacter({ featureIds: ['rage-r1', 'brute-r1'], levelUpHistory: [] });
    expect(forgettableFeatures(c)).toEqual([]);
  });

  it('n’oublie jamais la voie de peuple, même un rang acheté (p. 43)', () => {
    // Elfe haut : voie de peuple avec plusieurs rangs. elfe-haut-r2 est acheté (hors gratuit)
    // et rang le plus haut de sa voie, mais reste NON oubliable (voie de peuple).
    const c = makeCharacter({
      ancestryId: 'elfe-haut',
      ancestryPathId: 'elfe-haut',
      level: 4,
      featureIds: ['rage-r1', 'brute-r1', 'elfe-haut-r1', 'elfe-haut-r2', 'rage-r2'],
      levelUpHistory: [
        { level: 1, chosenFeatureIds: ['rage-r1', 'brute-r1', 'elfe-haut-r1'] },
        { level: 2, chosenFeatureIds: ['elfe-haut-r2'] },
        { level: 3, chosenFeatureIds: ['rage-r2'] },
      ],
    });
    const ids = forgettableFeatures(c).map((f) => f.id);
    expect(ids).not.toContain('elfe-haut-r2'); // voie de peuple : jamais oubliable
    expect(ids).toContain('rage-r2'); // voie de profil achetée : oubliable
  });
});

describe('applyLevelUp avec changement d’orientation', () => {
  const base = () =>
    makeCharacter({
      level: 2,
      featureIds: ['rage-r1', 'rage-r2', 'brute-r1'],
      levelUpHistory: [
        { level: 1, chosenFeatureIds: ['rage-r1', 'brute-r1'] },
        { level: 2, chosenFeatureIds: ['rage-r2'] },
      ],
    });

  it('retire la capacité oubliée, ajoute le remplacement et journalise l’oubli', () => {
    const next = applyLevelUp(base(), ['pagne-r1'], [], ['rage-r2']);
    expect(next.level).toBe(3);
    expect(next.featureIds).not.toContain('rage-r2');
    expect(next.featureIds).toContain('pagne-r1');
    expect(next.levelUpHistory[2]).toEqual({
      level: 3,
      chosenFeatureIds: ['pagne-r1'],
      forgottenFeatureIds: ['rage-r2'],
    });
  });

  it('round-trip : oublier puis annuler restitue la capacité oubliée', () => {
    const c = base();
    const undone = undoLastLevelUp(applyLevelUp(c, ['pagne-r1'], [], ['rage-r2']));
    expect(undone.level).toBe(2);
    expect(undone.featureIds).not.toContain('pagne-r1');
    expect(new Set(undone.featureIds)).toEqual(new Set(c.featureIds));
    expect(undone.levelUpHistory).toEqual(c.levelUpHistory);
  });
});

describe('undoLastLevelUp', () => {
  it('annule le dernier niveau : retire ses capacités et redescend d’un niveau', () => {
    const leveled = applyLevelUp(makeCharacter({ level: 1 }), ['rage-r2', 'brute-r1']);
    const undone = undoLastLevelUp(leveled);
    expect(undone.level).toBe(1);
    expect(undone.featureIds).not.toContain('rage-r2');
    expect(undone.featureIds).not.toContain('brute-r1');
    expect(undone.featureIds).toContain('rage-r1'); // capacité de création conservée
    expect(undone.levelUpHistory).toHaveLength(1);
  });

  it('ne défait jamais la création (niveau 1)', () => {
    const c = makeCharacter({ level: 1 });
    expect(canUndoLastLevelUp(c)).toBe(false);
    expect(undoLastLevelUp(c)).toBe(c);
  });

  it('round-trip : monter puis annuler restitue l’état initial', () => {
    const c = makeCharacter({ level: 1 });
    const round = undoLastLevelUp(applyLevelUp(c, ['rage-r2']));
    expect(round.level).toBe(c.level);
    expect(round.featureIds).toEqual(c.featureIds);
    expect(round.levelUpHistory).toEqual(c.levelUpHistory);
  });
});

describe('dé de vie à la montée de niveau (règle maison PER-87)', () => {
  it('applyLevelUp journalise rolledHp quand un jet est fourni ; absent sinon', () => {
    const c = makeCharacter({ level: 1 });
    const rolled = applyLevelUp(c, ['rage-r2'], [], [], 7);
    expect(rolled.levelUpHistory.at(-1)).toMatchObject({ level: 2, rolledHp: 7 });
    const fixed = applyLevelUp(c, ['rage-r2']);
    expect(fixed.levelUpHistory.at(-1)).not.toHaveProperty('rolledHp');
  });

  it('undo retire l’entrée (et son rolledHp) et redescend le personnage', () => {
    const c = makeCharacter({ level: 1 });
    const round = undoLastLevelUp(applyLevelUp(c, ['rage-r2'], [], [], 7));
    expect(round.level).toBe(1);
    expect(round.levelUpHistory).toEqual(c.levelUpHistory);
  });

  it('levelUpDieFamily : famille des voies montées ce niveau (fallback profil principal)', () => {
    expect(levelUpDieFamily(['brute-r2'], 'fighters', ctx)).toBe('fighters');
    // Voie d’un autre profil (aventurier) → sa propre famille.
    expect(levelUpDieFamily(['artilleur-r1'], 'fighters', ctx)).toBe('adventurers');
    // Rien de choisi → DR du profil principal.
    expect(levelUpDieFamily([], 'fighters', ctx)).toBe('fighters');
  });

  it('lockedRank12Family : famille imposée par les rangs 1-2 (null hors contrainte)', () => {
    // Un rang 1-2 engagé → sa famille est imposée aux autres rangs 1-2 du niveau.
    expect(lockedRank12Family(['artilleur-r1'], 'fighters', ctx)).toBe('adventurers');
    // Aucun rang 1-2 choisi → aucune contrainte.
    expect(lockedRank12Family([], 'fighters', ctx)).toBeNull();
    // Rang 3 seul (2 points, pas de double achat possible) → hors contrainte.
    expect(lockedRank12Family(['rage-r3'], 'fighters', ctx)).toBeNull();
  });
});
