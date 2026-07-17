import { describe, expect, it } from 'vitest';
import { featureById, classById, pathById } from '@/data';
import { families } from '@/data/families';
import { progression } from '@/data/progression';
import type { FamilyId } from '@/data/schema';
import { SCHEMA_VERSION, type Character } from '@/lib/character/types';
import {
  featureCost,
  featurePointBudget,
  minLevelForRank,
  canAcquireFeature,
  checkCompliance,
  classFamiliesWithFeatures,
  isHybrid,
  ownedRanks,
  skippedRanks,
  type RulesContext,
} from './legality';

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
    featureIds: [],
    featureChoices: {},
    effectToggles: {},
    effectInputs: {},
    usageCounters: {},
    depletion: {},
    purse: { platinum: 0, gold: 0, silver: 0, copper: 0 },
    levelUpHistory: [],
    equipment: [],
    overrides: {},
    notes: '',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...over,
  };
}

describe('capacité divine du prêtre spécialiste — pas d’hybridation (p. 122)', () => {
  // foi-r1 remplacée par la capacité divine d'Axénder (meneur-d-hommes-r1, famille
  // « combattants »), prêtre spécialiste.
  const priest = makeCharacter({
    classId: 'pretre',
    featureIds: ['meneur-d-hommes-r1', 'priere-r1', 'humain-r1'],
    priestVocation: { mode: 'specialist', godId: 'axender', hostPathId: 'foi' },
  });

  it('la capacité divine ne compte pas comme une autre famille', () => {
    expect([...classFamiliesWithFeatures(priest, ctx)]).toEqual(['mystics']);
    expect(isHybrid(priest, ctx)).toBe(false);
  });

  it('sanity : sans la vocation spécialiste, la même capacité déclencherait l’hybride', () => {
    expect(isHybrid({ ...priest, priestVocation: null }, ctx)).toBe(true);
  });
});

describe('progression : la capacité divine occupe le slot de la voie d’accueil (p. 122)', () => {
  const priest = makeCharacter({
    classId: 'pretre',
    level: 5,
    featureIds: ['meneur-d-hommes-r1', 'priere-r1', 'humain-r1'],
    priestVocation: { mode: 'specialist', godId: 'axender', hostPathId: 'foi' },
    levelUpHistory: [{ level: 1, chosenFeatureIds: ['meneur-d-hommes-r1', 'priere-r1', 'humain-r1'] }],
  });

  it('la divine compte pour la voie d’accueil, pas pour sa voie d’origine', () => {
    expect(ownedRanks(priest, 'foi', ctx)).toEqual([1]);
    expect(ownedRanks(priest, 'meneur-d-hommes', ctx)).toEqual([]);
  });

  it('la voie d’accueil passe au rang 2 ; son rang 1 natif est bloqué (slot occupé)', () => {
    expect(canAcquireFeature(priest, 'foi-r2', ctx).legal).toBe(true);
    expect(canAcquireFeature(priest, 'foi-r1', ctx).legal).toBe(false);
  });

  it('skip de rang : la voie d’origine se poursuit au rang suivant sans reprendre le rang détenu', () => {
    // Le rang 1 natif (meneur-d-hommes-r1) EST la capacité divine : on ne peut pas le
    // reprendre (p. 40, « pas deux fois la même capacité »)…
    expect(canAcquireFeature(priest, 'meneur-d-hommes-r1', ctx).legal).toBe(false);
    // …mais il compte comme prérequis satisfait, donc le rang 2 est accessible
    // directement (skip de rang, p. 122).
    expect(canAcquireFeature(priest, 'meneur-d-hommes-r2', ctx).legal).toBe(true);
  });
});

describe('skip de rang : divine de rang 2 (Basile → survie-r2, accueil = foi)', () => {
  const priest = makeCharacter({
    classId: 'pretre',
    level: 5,
    featureIds: ['foi-r1', 'priere-r1', 'humain-r1', 'survie-r2'],
    priestVocation: { mode: 'specialist', godId: 'basile', hostPathId: 'foi' },
  });

  it('expose le rang sauté de la voie d’origine', () => {
    expect(skippedRanks(priest, 'survie', ctx)).toEqual([2]);
    expect(skippedRanks(priest, 'foi', ctx)).toEqual([]); // pas un saut côté accueil
  });

  it('le rang 3 d’origine est bloqué tant que le rang 1 n’est pas comblé', () => {
    expect(canAcquireFeature(priest, 'survie-r3', ctx).legal).toBe(false);
  });

  it('après le rang 1 d’origine, le rang 3 est accessible (rang 2 sauté via la divine)', () => {
    const withR1 = { ...priest, featureIds: [...priest.featureIds, 'survie-r1'] };
    expect(canAcquireFeature(withR1, 'survie-r2', ctx).legal).toBe(false); // détenu (divine)
    expect(canAcquireFeature(withR1, 'survie-r3', ctx).legal).toBe(true);
  });

  it('la voie d’accueil reste intacte : rang 3 ouvert, rang 2 natif occupé', () => {
    expect(canAcquireFeature(priest, 'foi-r3', ctx).legal).toBe(true);
    expect(canAcquireFeature(priest, 'foi-r2', ctx).legal).toBe(false);
  });

  it('conformité : pas de faux « rang manquant » dû à la divine', () => {
    const missing = (c: Character) =>
      checkCompliance(c, ctx).filter((w) => w.code === 'MISSING_RANK');
    // Voie d'accueil avancée (foi-r3) + voie d'origine non développée : la divine
    // comble foi rang 2, et survie n'est pas signalée (logée dans foi).
    const host = { ...priest, level: 7, featureIds: ['foi-r1', 'foi-r3', 'priere-r1', 'humain-r1', 'survie-r2'] };
    expect(missing(host)).toEqual([]);
    // Voie d'origine développée via skip (survie-r1 + r3, rang 2 = divine) : aucun trou.
    const developed = { ...host, level: 9, featureIds: [...host.featureIds, 'survie-r1', 'survie-r3'] };
    expect(missing(developed)).toEqual([]);
  });
});

describe('featureCost', () => {
  const feature = (id: string) => featureById.get(id)!;
  it('rang 1 et 2 coûtent 1, rang 3+ coûtent 2', () => {
    expect(featureCost(feature('brute-r1'), progression)).toBe(1);
    expect(featureCost(feature('brute-r2'), progression)).toBe(1);
    expect(featureCost(feature('brute-r3'), progression)).toBe(2);
    expect(featureCost(feature('brute-r5'), progression)).toBe(2);
  });
});

describe('featurePointBudget', () => {
  it('niveau 1 correctement créé : 0 disponible, 0 dépensé (tout gratuit)', () => {
    const free = ['pourfendeur-r1', 'rage-r1', 'humain-r1'];
    const c = makeCharacter({
      level: 1,
      featureIds: free,
      levelUpHistory: [{ level: 1, chosenFeatureIds: free }],
    });
    const budget = featurePointBudget(c, ctx);
    expect(budget).toEqual({ available: 0, spent: 0, known: true });
  });

  it('compte les capacités achetées (hors gratuites) et 2 points par niveau', () => {
    const free = ['pourfendeur-r1', 'rage-r1', 'humain-r1'];
    const c = makeCharacter({
      level: 3,
      featureIds: [...free, 'brute-r1', 'pagne-r1'], // 2 voies achetées, rang 1 → 2 points
      levelUpHistory: [
        { level: 1, chosenFeatureIds: free },
        { level: 2, chosenFeatureIds: ['brute-r1'] },
        { level: 3, chosenFeatureIds: ['pagne-r1'] },
      ],
    });
    const budget = featurePointBudget(c, ctx);
    expect(budget).toEqual({ available: 4, spent: 2, known: true });
  });

  it('inconnu si l’entrée de niveau 1 est absente (pas de faux gratuit)', () => {
    const c = makeCharacter({ level: 1, featureIds: ['pourfendeur-r1'], levelUpHistory: [] });
    expect(featurePointBudget(c, ctx).known).toBe(false);
  });
});

describe('minLevelForRank', () => {
  const mages = families.find((f) => f.id === 'mages')!;
  const combattants = families.find((f) => f.id === 'fighters')!;
  it('suit la table (rang 3 → 3, rang 4 → 5)', () => {
    expect(minLevelForRank(3, combattants, progression)).toBe(3);
    expect(minLevelForRank(4, combattants, progression)).toBe(5);
  });
  it('exception mage : rang 2 dès le niveau 1', () => {
    expect(minLevelForRank(2, mages, progression)).toBe(1);
    expect(minLevelForRank(2, combattants, progression)).toBe(2);
  });
});

describe('canAcquireFeature', () => {
  it('légal : ouvrir une voie de profil au rang 1', () => {
    const c = makeCharacter({ classId: 'guerrier', featureIds: [] });
    expect(canAcquireFeature(c, 'combat-r1', ctx).legal).toBe(true);
  });

  it('illégal : capacité déjà acquise', () => {
    const c = makeCharacter({ featureIds: ['brute-r1'] });
    const r = canAcquireFeature(c, 'brute-r1', ctx);
    expect(r.legal).toBe(false);
    expect(r.reasons.join(' ')).toMatch(/déjà acquise/);
  });

  it('illégal : rang dans le désordre (rang 3 sans 1 et 2)', () => {
    const c = makeCharacter({ level: 3, featureIds: [] });
    const r = canAcquireFeature(c, 'brute-r3', ctx);
    expect(r.legal).toBe(false);
    expect(r.reasons.join(' ')).toMatch(/Rang 1.*non acquis|Rang 2.*non acquis/);
  });

  it('illégal : niveau insuffisant pour le rang', () => {
    const c = makeCharacter({ level: 1, featureIds: ['brute-r1', 'brute-r2'] });
    const r = canAcquireFeature(c, 'brute-r3', ctx);
    expect(r.legal).toBe(false);
    expect(r.reasons.join(' ')).toMatch(/Niveau 3 requis/);
  });

  it('illégal : voie de prestige avant le niveau 5', () => {
    const c = makeCharacter({ level: 4 });
    const r = canAcquireFeature(c, 'prestige-expert-r4', ctx);
    expect(r.legal).toBe(false);
    expect(r.reasons.join(' ')).toMatch(/niveau 5/);
  });

  it('légal : familier fantastique (rang 3) dès le niveau 3', () => {
    // Anomalie p. 132 : cette voie de prestige commence au rang 3 → accessible
    // au niveau 3 (niveau requis du rang le plus bas), pas au niveau 5.
    const c = makeCharacter({ level: 3, featureIds: [] });
    expect(canAcquireFeature(c, 'prestige-familier-fantastique-r3', ctx).legal).toBe(true);
  });

  it('illégal : familier fantastique avant le niveau 3', () => {
    const c = makeCharacter({ level: 2, featureIds: [] });
    const r = canAcquireFeature(c, 'prestige-familier-fantastique-r3', ctx);
    expect(r.legal).toBe(false);
    expect(r.reasons.join(' ')).toMatch(/niveau 3/);
  });

  it('légal : voie hybride d’un autre profil tant qu’une voie du profil principal est vierge', () => {
    // « combat » (guerrier) n’est pas une voie du barbare, mais l’hybridation
    // est permise tant qu’une des 5 voies du profil principal est vierge (p. 176).
    const c = makeCharacter({ classId: 'barbare', featureIds: [] });
    expect(canAcquireFeature(c, 'combat-r1', ctx).legal).toBe(true);
  });

  it('illégal : voie hybride quand les 5 voies du profil principal sont entamées', () => {
    const c = makeCharacter({
      classId: 'barbare',
      level: 5,
      featureIds: ['brute-r1', 'pagne-r1', 'pourfendeur-r1', 'primitif-r1', 'rage-r1'],
    });
    const r = canAcquireFeature(c, 'combat-r1', ctx);
    expect(r.legal).toBe(false);
    expect(r.reasons.join(' ')).toMatch(/profil hybride impossible/);
  });

  it('légal : poursuivre une voie hybride déjà entamée même sans voie vierge', () => {
    // Les 5 voies du profil principal sont entamées, mais « combat » l’est aussi
    // (rang 1) → son rang 2 reste accessible.
    const c = makeCharacter({
      classId: 'barbare',
      level: 5,
      featureIds: ['brute-r1', 'pagne-r1', 'pourfendeur-r1', 'primitif-r1', 'rage-r1', 'combat-r1'],
    });
    expect(canAcquireFeature(c, 'combat-r2', ctx).legal).toBe(true);
  });

  it('illégal : voie de l’expert pour un hybride d’une autre famille', () => {
    // Barbare (combattant) ayant pris une capacité de druide (mystique) — p. 129.
    const c = makeCharacter({ classId: 'barbare', level: 5, featureIds: ['brute-r1', 'animaux-r1'] });
    const r = canAcquireFeature(c, 'prestige-expert-r4', ctx);
    expect(r.legal).toBe(false);
    expect(r.reasons.join(' ')).toMatch(/voie de l'expert/i);
  });

  it('légal : voie de l’expert pour un profil non hybride (ou hybride de même famille)', () => {
    const c = makeCharacter({ classId: 'barbare', level: 5, featureIds: ['brute-r1'] });
    expect(canAcquireFeature(c, 'prestige-expert-r4', ctx).legal).toBe(true);
  });

  it('illégal : voie de peuple d’un autre peuple', () => {
    // Voie de peuple retenue = humain ; on ne peut pas progresser dans « nain ».
    const c = makeCharacter({ ancestryPathId: 'humain', featureIds: [] });
    const r = canAcquireFeature(c, 'nain-r1', ctx);
    expect(r.legal).toBe(false);
    expect(r.reasons.join(' ')).toMatch(/n'est pas votre voie de peuple/);
  });

  it('légal : sa propre voie de peuple', () => {
    const c = makeCharacter({ ancestryPathId: 'humain', featureIds: [] });
    expect(canAcquireFeature(c, 'humain-r1', ctx).legal).toBe(true);
  });

  it('légal : ouvrir une autre voie de son propre profil', () => {
    // Barbare : « brute » fait partie de ses 5 voies, ouvrable au rang 1.
    const c = makeCharacter({ classId: 'barbare', featureIds: [] });
    expect(canAcquireFeature(c, 'brute-r1', ctx).legal).toBe(true);
  });
});

describe('checkCompliance', () => {
  it('Lhagva niveau 1 (capacités réelles) : aucun avertissement', () => {
    const c = makeCharacter({
      classId: 'barbare',
      ancestryId: 'humain',
      ancestryPathId: 'humain',
      level: 1,
      abilities: { AGI: 1, CON: 2, FOR: 3, PER: 1, CHA: -1, INT: 0, VOL: 1 },
      featureIds: ['pourfendeur-r1', 'rage-r1', 'humain-r1'],
    });
    expect(checkCompliance(c, ctx)).toEqual([]);
  });

  it('signale un trou de rang dans une voie', () => {
    const c = makeCharacter({ level: 5, featureIds: ['brute-r1', 'brute-r3'] });
    const codes = checkCompliance(c, ctx).map((a) => a.code);
    expect(codes).toContain('MISSING_RANK');
  });

  it('signale une caractéristique hors plage', () => {
    const c = makeCharacter({
      abilities: { AGI: 0, CON: 7, FOR: 0, PER: 0, CHA: 0, INT: 0, VOL: 0 },
      featureIds: [],
    });
    const codes = checkCompliance(c, ctx).map((a) => a.code);
    expect(codes).toContain('ABILITY_OUT_OF_RANGE');
  });

  it('signale une capacité de rang au-dessus du niveau', () => {
    // brute rang 3 (niveau requis 3) sur un personnage de niveau 1
    const c = makeCharacter({ level: 1, featureIds: ['brute-r1', 'brute-r2', 'brute-r3'] });
    const codes = checkCompliance(c, ctx).map((a) => a.code);
    expect(codes).toContain('RANK_LEVEL_TOO_LOW');
  });

  it('signale un profil hybride (familles multiples) en information', () => {
    // Barbare (combattant) + capacité de druide (mystique) = deux familles.
    const c = makeCharacter({ classId: 'barbare', level: 3, featureIds: ['brute-r1', 'animaux-r1'] });
    const hybrid = checkCompliance(c, ctx).find((a) => a.code === 'HYBRID_PROFILE');
    expect(hybrid).toBeDefined();
    expect(hybrid?.severity).toBe('info');
  });

  it('pas d’avertissement hybride pour une voie d’une même famille', () => {
    // Barbare + voie de guerrier : même famille (combattant), pas d’hybridation
    // au sens des PV / familles.
    const c = makeCharacter({ classId: 'barbare', level: 3, featureIds: ['brute-r1', 'combat-r1'] });
    const codes = checkCompliance(c, ctx).map((a) => a.code);
    expect(codes).not.toContain('HYBRID_PROFILE');
  });

  it('niveau 1 créé via le wizard (historique présent) : pas de sur-dépense', () => {
    const free = ['pourfendeur-r1', 'rage-r1', 'humain-r1'];
    const c = makeCharacter({
      level: 1,
      featureIds: free,
      levelUpHistory: [{ level: 1, chosenFeatureIds: free }],
    });
    const codes = checkCompliance(c, ctx).map((a) => a.code);
    expect(codes).not.toContain('FEATURE_POINTS_OVERSPENT');
  });

  it('signale une sur-dépense de points de capacité', () => {
    // Niveau 2 (2 points dispo) mais 3 voies achetées en plus du gratuit → 3 points.
    const free = ['pourfendeur-r1', 'rage-r1', 'humain-r1'];
    const c = makeCharacter({
      level: 2,
      featureIds: [...free, 'brute-r1', 'pagne-r1', 'primitif-r1'],
      levelUpHistory: [{ level: 1, chosenFeatureIds: free }],
    });
    const codes = checkCompliance(c, ctx).map((a) => a.code);
    expect(codes).toContain('FEATURE_POINTS_OVERSPENT');
  });

  it('pas de sur-dépense quand les points dépensés tiennent dans le budget', () => {
    const free = ['pourfendeur-r1', 'rage-r1', 'humain-r1'];
    const c = makeCharacter({
      level: 2,
      featureIds: [...free, 'brute-r1'], // 1 point dépensé pour 2 disponibles
      levelUpHistory: [
        { level: 1, chosenFeatureIds: free },
        { level: 2, chosenFeatureIds: ['brute-r1'] },
      ],
    });
    const codes = checkCompliance(c, ctx).map((a) => a.code);
    expect(codes).not.toContain('FEATURE_POINTS_OVERSPENT');
  });
});

describe('variante « Arbalétrier » : échange de voie explosifs ↔ maître des arbalètes (p. 62)', () => {
  it('armes à feu autorisées : la voie des explosifs est accessible, pas celle du maître des arbalètes', () => {
    const c = makeCharacter({ classId: 'arquebusier', ancestryId: 'humain', ancestryPathId: 'humain' });
    expect(canAcquireFeature(c, 'explosifs-r1', ctx).legal).toBe(true);
    expect(canAcquireFeature(c, 'maitre-des-arbaletes-r1', ctx).legal).toBe(false);
  });

  it('armes à feu interdites : la voie du maître des arbalètes remplace celle des explosifs', () => {
    const c = makeCharacter({
      classId: 'arquebusier',
      ancestryId: 'humain',
      ancestryPathId: 'humain',
      firearmsAllowed: false,
    });
    expect(canAcquireFeature(c, 'maitre-des-arbaletes-r1', ctx).legal).toBe(true);
    expect(canAcquireFeature(c, 'explosifs-r1', ctx).legal).toBe(false);
  });

  it('personnage existant : bascule armes à feu interdites avec la voie des explosifs déjà entamée → avertissement non bloquant', () => {
    const c = makeCharacter({
      classId: 'arquebusier',
      ancestryId: 'humain',
      ancestryPathId: 'humain',
      firearmsAllowed: false,
      featureIds: ['explosifs-r1', 'humain-r1'],
    });
    const warnings = checkCompliance(c, ctx);
    const disabled = warnings.find((w) => w.code === 'FIREARMS_DISABLED_PATH');
    expect(disabled?.pathId).toBe('explosifs');
  });

  it('aucun avertissement quand la voie effective est cohérente avec le réglage', () => {
    const withFirearms = makeCharacter({
      classId: 'arquebusier',
      ancestryId: 'humain',
      ancestryPathId: 'humain',
      featureIds: ['explosifs-r1', 'humain-r1'],
    });
    expect(checkCompliance(withFirearms, ctx).map((w) => w.code)).not.toContain('FIREARMS_DISABLED_PATH');
  });

  // PER-185 : la valeur EFFECTIVE (règle campagne ∧ choix perso) est passée en
  // paramètre. Un Arquebusier (snapshot true) dont la campagne interdit la poudre
  // reçoit l'effectif false → il joue « Arbalétrier » sans que ses données changent.
  it('effectif passé en paramètre : campagne interdit la poudre → maître des arbalètes acquérable, explosifs bloqué', () => {
    const c = makeCharacter({ classId: 'arquebusier', ancestryId: 'humain', ancestryPathId: 'humain' });
    expect(c.firearmsAllowed).toBe(true); // snapshot inchangé
    expect(canAcquireFeature(c, 'maitre-des-arbaletes-r1', ctx, false).legal).toBe(true);
    expect(canAcquireFeature(c, 'explosifs-r1', ctx, false).legal).toBe(false);
  });

  it('effectif passé en paramètre : Arquebusier avec explosifs déjà pris + campagne interdit → FIREARMS_DISABLED_PATH', () => {
    const c = makeCharacter({
      classId: 'arquebusier',
      ancestryId: 'humain',
      ancestryPathId: 'humain',
      featureIds: ['explosifs-r1', 'humain-r1'],
    });
    const disabled = checkCompliance(c, ctx, false).find((w) => w.code === 'FIREARMS_DISABLED_PATH');
    expect(disabled?.pathId).toBe('explosifs');
  });

  it('effectif par défaut = snapshot du personnage (pas de campagne)', () => {
    const c = makeCharacter({
      classId: 'arquebusier',
      ancestryId: 'humain',
      ancestryPathId: 'humain',
      firearmsAllowed: false,
    });
    expect(canAcquireFeature(c, 'maitre-des-arbaletes-r1', ctx).legal).toBe(true);
  });

  // PER-185 : détection LÉGÈRE d'une arme à feu équipée quand la poudre est
  // interdite (traitement propre = PER-197, milestone équipement porté).
  it('arme à feu équipée + poudre interdite : avertissement FIREARMS_DISABLED_ITEM', () => {
    const c = makeCharacter({
      classId: 'arquebusier',
      ancestryId: 'humain',
      ancestryPathId: 'humain',
      equipment: [{ itemId: 'mousquet', quantity: 1 }],
    });
    const item = checkCompliance(c, ctx, false).find((w) => w.code === 'FIREARMS_DISABLED_ITEM');
    expect(item).toBeDefined();
  });

  it('arme à feu équipée + poudre autorisée : aucun avertissement d’item', () => {
    const c = makeCharacter({
      classId: 'arquebusier',
      ancestryId: 'humain',
      ancestryPathId: 'humain',
      equipment: [{ itemId: 'mousquet', quantity: 1 }],
    });
    expect(checkCompliance(c, ctx, true).map((w) => w.code)).not.toContain('FIREARMS_DISABLED_ITEM');
  });
});

describe('checkCompliance : restrictions d’armure par profil (PER-80)', () => {
  it('avertit d’une armure trop lourde pour le profil (magicien / cuir simple porté)', () => {
    const c = makeCharacter({
      classId: 'magicien',
      equipment: [{ itemId: 'cuir-simple', quantity: 1, worn: { slot: 'armor' } }],
    });
    expect(checkCompliance(c, ctx).map((w) => w.code)).toContain('ARMOR_TOO_HEAVY');
  });

  it('avertit d’un bouclier non autorisé (magicien / petit bouclier porté)', () => {
    const c = makeCharacter({
      classId: 'magicien',
      equipment: [{ itemId: 'petit-bouclier', quantity: 1, worn: { slot: 'shield' } }],
    });
    expect(checkCompliance(c, ctx).map((w) => w.code)).toContain('SHIELD_NOT_ALLOWED');
  });

  it('aucun avertissement d’armure au plafond exact du profil (guerrier / cotte de mailles)', () => {
    const c = makeCharacter({
      classId: 'guerrier',
      equipment: [{ itemId: 'cotte-de-mailles', quantity: 1, worn: { slot: 'armor' } }],
    });
    const codes = checkCompliance(c, ctx).map((w) => w.code);
    expect(codes).not.toContain('ARMOR_TOO_HEAVY');
    expect(codes).not.toContain('SHIELD_NOT_ALLOWED');
  });
});

describe('checkCompliance : restriction fine d’usage par capacité d’origine (PER-86)', () => {
  it('avertit qu’une armure portable gêne une capacité de moine (hybride moine/guerrier)', () => {
    // Le guerrier peut porter la cotte (aucun ARMOR_TOO_HEAVY), mais sa capacité de moine
    // (poing-r1) exige de ne porter aucune armure → FEATURE_ARMOR_RESTRICTED, sans ARMOR_TOO_HEAVY.
    const c = makeCharacter({
      classId: 'guerrier',
      featureIds: ['combat-r1', 'poing-r1'],
      equipment: [{ itemId: 'cotte-de-mailles', quantity: 1, worn: { slot: 'armor' } }],
    });
    const warnings = checkCompliance(c, ctx);
    const codes = warnings.map((w) => w.code);
    expect(codes).toContain('FEATURE_ARMOR_RESTRICTED');
    expect(codes).not.toContain('ARMOR_TOO_HEAVY');
    const message = warnings.find((w) => w.code === 'FEATURE_ARMOR_RESTRICTED')!.message;
    expect(message).toContain('Moine');
    expect(message).toContain('(p. 177)'); // référence de page parsée par PageRefText côté UI
  });

  it('aucun avertissement fin quand l’armure respecte le plafond de chaque capacité', () => {
    const c = makeCharacter({
      classId: 'guerrier',
      featureIds: ['combat-r1'],
      equipment: [{ itemId: 'cotte-de-mailles', quantity: 1, worn: { slot: 'armor' } }],
    });
    expect(checkCompliance(c, ctx).map((w) => w.code)).not.toContain('FEATURE_ARMOR_RESTRICTED');
  });
});
