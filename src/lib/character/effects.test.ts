import { describe, expect, it } from 'vitest';
import type { AbilityId } from '@/data/schema';
import type { Character } from './types';
import {
  abilityBonusDiceFromFeatures,
  abilityModSources,
  abilityModsFromFeatures,
  abilityTestBonusSources,
  conditionalEffectsOf,
  conditionalEffectBonuses,
  creatureBonusDiceForPath,
  disabledFeatureIds,
  disabledFeatureReasons,
  effectContext,
  effectiveAbilities,
  featureModSources,
  hpAbilitySwapSources,
  isEffectActive,
  modsFromFeatures,
  pathRanksFromFeatures,
  pruneEffectToggles,
  setEffectToggle,
  testBonusSources,
  type EffectContext,
} from './effects';

/** Contexte d'effets de test (FOR 3, niveau 5, aucun interrupteur). */
const ctx = (over: Partial<EffectContext> = {}): EffectContext => ({
  level: 5,
  abilities: { AGI: 0, CON: 0, FOR: 3, PER: 0, CHA: 0, INT: 0, VOL: 0 } as Record<AbilityId, number>,
  toggles: {},
  ...over,
});

/** Personnage minimal pour tester les helpers d'interrupteurs (lecture seule). */
const charWith = (toggles: Record<string, boolean[]>): Character =>
  ({
    level: 5,
    abilities: ctx().abilities,
    featureIds: [] as string[],
    effectToggles: toggles,
    featureChoices: {},
  }) as Character;

describe('modsFromFeatures — bonus plats constants (PER-63)', () => {
  it('aucune capacité → sac vide', () => {
    expect(modsFromFeatures([])).toEqual({});
  });

  it('ignore les ids inconnus et les capacités sans effects', () => {
    expect(modsFromFeatures(['id-inexistant', 'air-r2'])).toEqual({});
  });

  it('agrège un bonus plat unique (Murmures dans le vent, air r1 : +1 Init, +1 DEF)', () => {
    expect(modsFromFeatures(['air-r1'])).toEqual({ initiative: 1, def: 1 });
  });

  it('agrège la part plate de Réflexes éclair (pourfendeur r1 : +3 Init, +1 DEF)', () => {
    expect(modsFromFeatures(['pourfendeur-r1'])).toEqual({ initiative: 3, def: 1 });
  });

  it('somme les bonus de plusieurs capacités, par stat (cas Lhagva)', () => {
    expect(modsFromFeatures(['pourfendeur-r1', 'humain-r1'])).toEqual({
      initiative: 3,
      def: 1,
      luckPoints: 1,
    });
  });
});

describe('modsFromFeatures — valeurs scalantes (PER-67)', () => {
  it('sans contexte, une valeur scalante est ignorée (non résoluble)', () => {
    // Argument de taille (brute r1) : maxHp += FOR — non résoluble sans contexte.
    expect(modsFromFeatures(['brute-r1'])).toEqual({});
  });

  it('résout une valeur = caractéristique (brute r1 : maxHp += FOR)', () => {
    expect(modsFromFeatures(['brute-r1'], ctx())).toEqual({ maxHp: 3 });
  });
});

describe('modsFromFeatures — effets conditionnels / temporaires (PER-67)', () => {
  it('un effet conditionnel inactif par défaut ne compte pas', () => {
    // Rage du berserk (rage r3) : -2 DEF temporaire, inactif par défaut.
    expect(modsFromFeatures(['rage-r3'])).toEqual({});
    expect(modsFromFeatures(['rage-r3'], ctx())).toEqual({});
  });

  it("compte l'effet quand l'interrupteur l'active (rage r3 : -2 DEF)", () => {
    expect(modsFromFeatures(['rage-r3'], ctx({ toggles: { 'rage-r3': [true] } }))).toEqual({
      def: -2,
    });
  });

  it('résout la valeur scalante par paliers de rang de voie (Parade croisée)', () => {
    const toggles = { 'combat-a-deux-armes-r2': [true] };
    // Rang 2 dans la voie → palier { min: 1 } → +1 en DEF.
    expect(modsFromFeatures(['combat-a-deux-armes-r2'], ctx({ toggles }))).toEqual({ def: 1 });
    // Rang 5 atteint dans la voie → palier { min: 5 } → +2 en DEF.
    expect(
      modsFromFeatures(['combat-a-deux-armes-r2', 'combat-a-deux-armes-r5'], ctx({ toggles })),
    ).toEqual({ def: 2 });
  });
});

describe('modsFromFeatures — paliers de famille CROSS-VOIE (milestone-count + sum)', () => {
  it('Divination : base + palier in-voie + un par voie d’ensorceleur au rang 5', () => {
    // Divination seule (voie au rang 1) : stepped → 1 ; milestone (voies au rang 5) → 0.
    expect(modsFromFeatures(['divination-r1'], ctx())).toEqual({ initiative: 1, def: 1 });
    // 5 voies d’ensorceleur au rang 5 → stepped (rang de voie 5) = 2, milestone = 5 → 7.
    const five = ['divination-r1', 'divination-r5', 'air-r5', 'envouteur-r5', 'illusions-r5', 'invocation-r5'];
    expect(modsFromFeatures(five, ctx())).toEqual({ initiative: 7, def: 7 });
  });

  it('Armure de mana : 4 (rang 3) + 5 (voies de magicien au rang 5) = 9, si interrupteur actif', () => {
    const ids = [
      'magie-protectrice-r1', 'magie-protectrice-r5', 'magie-des-arcanes-r5',
      'magie-destructrice-r5', 'magie-elementaire-r5', 'magie-universelle-r5',
    ];
    expect(modsFromFeatures(ids, ctx({ toggles: { 'magie-protectrice-r1': [true] } }))).toEqual({ def: 9 });
    // Interrupteur inactif → l’effet temporaire ne compte pas.
    expect(modsFromFeatures(ids, ctx())).toEqual({});
  });

  it("Armure d'os : 3 + 5 (voies de sorcier au rang 4) = 8", () => {
    const ids = ['outre-tombe-r2', 'outre-tombe-r4', 'demon-r4', 'mort-r4', 'sang-r4', 'sombre-magie-r4'];
    // demon-r4 (Aspect du démon, +5 DEF) est conditionnel inactif → exclu.
    expect(modsFromFeatures(ids, ctx())).toEqual({ def: 8 });
  });
});

describe('featureModSources', () => {
  it('marque les contributions conditionnelles actives', () => {
    const sources = featureModSources(['rage-r3'], ctx({ toggles: { 'rage-r3': [true] } }));
    expect(sources.def).toEqual([
      { featureId: 'rage-r3', name: 'Rage du berserk', value: -2, conditional: true },
    ]);
  });

  it("n'inclut pas une contribution conditionnelle inactive", () => {
    expect(featureModSources(['rage-r3'], ctx())).toEqual({});
  });
});

describe('pathRanksFromFeatures', () => {
  it('retient le rang le plus élevé par voie', () => {
    expect(
      pathRanksFromFeatures(['combat-a-deux-armes-r2', 'combat-a-deux-armes-r5', 'rage-r3']),
    ).toEqual({ 'combat-a-deux-armes': 5, rage: 3 });
  });
});

describe('interrupteurs des effets conditionnels', () => {
  it('liste les effets conditionnels avec leur index et libellé', () => {
    const entries = conditionalEffectsOf('combat-a-deux-armes-r2');
    expect(entries).toHaveLength(1);
    expect(entries[0].index).toBe(0);
    expect(entries[0].effect.activation.label).toBe('une arme dans chaque main');
  });

  it('renvoie une liste vide pour une capacité sans effet conditionnel', () => {
    expect(conditionalEffectsOf('air-r1')).toEqual([]);
    expect(conditionalEffectsOf('brute-r1')).toEqual([]);
    expect(conditionalEffectsOf('id-inexistant')).toEqual([]);
  });

  it('conditionalEffectBonuses résout les bonus courants (pour l’affichage)', () => {
    // Rage du berserk : -2 DEF, constant.
    expect(conditionalEffectBonuses(charWith({}), 'rage-r3', 0)).toEqual([{ stat: 'def', value: -2 }]);
    // Parade croisée : +1 au rang 2 de la voie, +2 au rang 5 (selon featureIds).
    const rk2 = { featureIds: ['combat-a-deux-armes-r2'] } as Character;
    const rk5 = { featureIds: ['combat-a-deux-armes-r2', 'combat-a-deux-armes-r5'] } as Character;
    expect(conditionalEffectBonuses(rk2, 'combat-a-deux-armes-r2', 0)).toEqual([{ stat: 'def', value: 1 }]);
    expect(conditionalEffectBonuses(rk5, 'combat-a-deux-armes-r2', 0)).toEqual([{ stat: 'def', value: 2 }]);
    // Familier : un seul effet, DEUX bonus résolus (init + def).
    expect(conditionalEffectBonuses(charWith({}), 'magie-universelle-r2', 0)).toEqual([
      { stat: 'initiative', value: 2 },
      { stat: 'def', value: 2 },
    ]);
    // Index ne pointant pas un effet conditionnel → null.
    expect(conditionalEffectBonuses(charWith({}), 'air-r1', 0)).toBeNull();
  });

  it('Familier : un seul interrupteur pilote +2 Init. ET +2 DEF (pas deux toggles)', () => {
    // Un seul effet conditionnel → un seul interrupteur.
    expect(conditionalEffectsOf('magie-universelle-r2')).toHaveLength(1);
    expect(modsFromFeatures(['magie-universelle-r2'], ctx({ toggles: { 'magie-universelle-r2': [true] } }))).toEqual({
      initiative: 2,
      def: 2,
    });
    expect(modsFromFeatures(['magie-universelle-r2'], ctx())).toEqual({});
  });

  it("isEffectActive suit l'interrupteur, sinon l'état par défaut", () => {
    expect(isEffectActive(charWith({}), 'rage-r3', 0)).toBe(false);
    expect(isEffectActive(charWith({ 'rage-r3': [true] }), 'rage-r3', 0)).toBe(true);
  });

  it('setEffectToggle fixe une case sans muter le personnage', () => {
    const next = setEffectToggle(charWith({}), 'rage-r3', 0, true);
    expect(next).toEqual({ 'rage-r3': [true] });
  });

  it('pruneEffectToggles retire les interrupteurs orphelins', () => {
    expect(pruneEffectToggles({ a: [true], b: [false] }, ['a'])).toEqual({ a: [true] });
  });
});

describe('effectContext', () => {
  it('extrait niveau, caractéristiques et interrupteurs du personnage', () => {
    const c = charWith({ 'rage-r3': [true] });
    expect(effectContext(c)).toEqual({
      level: 5,
      abilities: c.abilities,
      toggles: { 'rage-r3': [true] },
      featureChoices: {},
    });
  });
});

describe('abilityTestBonusSources — buff conditionnel aux tests de carac (Bénédiction, priere-r1)', () => {
  // L'effet conditionnel de Bénédiction est le 2e (index 1) : test-bonus puis conditional.
  const ON = (toggles: Record<string, boolean[]>): EffectContext => ctx({ toggles });

  it('interrupteur éteint ou sans contexte → aucun buff', () => {
    expect(abilityTestBonusSources(['priere-r1'])).toEqual([]);
    expect(abilityTestBonusSources(['priere-r1'], ctx())).toEqual([]);
  });

  it('interrupteur allumé → +1 aux tests de carac au rang 1 de la voie', () => {
    expect(abilityTestBonusSources(['priere-r1'], ON({ 'priere-r1': [false, true] }))).toEqual([
      { featureId: 'priere-r1', name: 'Bénédiction', value: 1 },
    ]);
  });

  it('passe à +2 quand la voie de la prière atteint le rang 5', () => {
    expect(
      abilityTestBonusSources(['priere-r1', 'priere-r5'], ON({ 'priere-r1': [false, true] })),
    ).toEqual([{ featureId: 'priere-r1', name: 'Bénédiction', value: 2 }]);
  });
});

describe('modificateurs permanents de caractéristiques (ability-bonus)', () => {
  it('aucune capacité → aucun modificateur', () => {
    expect(abilityModsFromFeatures([])).toEqual({});
  });

  it('agrège le +1 de carac (Endurer/metal-r5 : +1 CON, Perception héroïque/divination-r4 : +1 PER)', () => {
    expect(abilityModsFromFeatures(['metal-r5'])).toEqual({ CON: 1 });
    expect(abilityModsFromFeatures(['divination-r4'])).toEqual({ PER: 1 });
  });

  it('cumule deux sources sur la même carac (metal-r5 + sombre-magie-r5 : +2 CON)', () => {
    expect(abilityModsFromFeatures(['metal-r5', 'sombre-magie-r5'])).toEqual({ CON: 2 });
  });

  it('détaille les capacités sources (pour le détail de la carac)', () => {
    expect(abilityModSources(['metal-r5']).CON).toEqual([{ featureId: 'metal-r5', name: 'Endurer', value: 1 }]);
  });
});

describe('dés bonus permanents aux tests (ability-bonus-die)', () => {
  it('signale la carac et nomme la capacité source', () => {
    expect(abilityBonusDiceFromFeatures(['sombre-magie-r5'])).toEqual({ CON: ['Pacte ténébreux'] });
  });

  it('aucune capacité concernée → vide', () => {
    expect(abilityBonusDiceFromFeatures(['air-r1'])).toEqual({});
  });
});

describe('creatureBonusDiceForPath — dés bonus du golem selon les options retenues', () => {
  const golemChar = (selection: string[]): Character =>
    ({
      featureIds: ['golem-r2', 'golem-r5'],
      featureChoices: { 'golem-r5': [selection] },
    }) as unknown as Character;

  it("« Forme de félin » octroie un dé bonus en AGI au golem", () => {
    expect(creatureBonusDiceForPath('golem', golemChar(['feline-form']))).toEqual(new Set(['AGI']));
  });

  it('« Puissant » → FOR ; les deux ensemble → AGI + FOR', () => {
    expect(creatureBonusDiceForPath('golem', golemChar(['mighty']))).toEqual(new Set(['FOR']));
    expect(creatureBonusDiceForPath('golem', golemChar(['feline-form', 'mighty']))).toEqual(new Set(['AGI', 'FOR']));
  });

  it('une option sans dé bonus → aucun dé', () => {
    expect(creatureBonusDiceForPath('golem', golemChar(['armor']))).toEqual(new Set());
  });
});

describe('hpAbilitySwapSources — Grosse tête (golem-r1) : PV basés sur l’INT au lieu de la CON', () => {
  // Contexte de test : INT 4, CON 1 → échange net +(4 − 1) = +3 PV, une seule fois.
  const swapCtx = (over: Partial<EffectContext> = {}): EffectContext =>
    ctx({
      abilities: { AGI: 0, CON: 1, FOR: 0, PER: 0, CHA: 0, INT: 4, VOL: 0 } as Record<AbilityId, number>,
      ...over,
    });

  it('sans contexte (catalogue seul) → aucune source (dépend des caracs et du choix)', () => {
    expect(hpAbilitySwapSources(['golem-r1'])).toEqual([]);
  });

  it("option par défaut (PV sur la CON) → aucun échange", () => {
    const c = swapCtx({ featureChoices: { 'golem-r1': ['pv-from-con'] } });
    expect(hpAbilitySwapSources(['golem-r1'], c)).toEqual([]);
  });

  it("choix pas encore fait (null) → aucun échange", () => {
    const c = swapCtx({ featureChoices: { 'golem-r1': [null] } });
    expect(hpAbilitySwapSources(['golem-r1'], c)).toEqual([]);
  });

  it("PV sur l’INT → échange net +(INT − CON), une seule fois", () => {
    const c = swapCtx({ featureChoices: { 'golem-r1': ['pv-from-int'] } });
    expect(hpAbilitySwapSources(['golem-r1'], c)).toEqual([
      { featureId: 'golem-r1', name: 'Grosse tête', value: 3 },
    ]);
  });

  it('INT inférieure à la CON → remplacement appliqué tel quel (delta négatif)', () => {
    const c = swapCtx({
      abilities: { AGI: 0, CON: 4, FOR: 0, PER: 0, CHA: 0, INT: 1, VOL: 0 } as Record<AbilityId, number>,
      featureChoices: { 'golem-r1': ['pv-from-int'] },
    });
    expect(hpAbilitySwapSources(['golem-r1'], c)).toEqual([
      { featureId: 'golem-r1', name: 'Grosse tête', value: -3 },
    ]);
  });

  it('INT égale à la CON → échange net nul, source omise (pas de terme « +0 »)', () => {
    const c = ctx({
      abilities: { AGI: 0, CON: 2, FOR: 0, PER: 0, CHA: 0, INT: 2, VOL: 0 } as Record<AbilityId, number>,
      featureChoices: { 'golem-r1': ['pv-from-int'] },
    });
    expect(hpAbilitySwapSources(['golem-r1'], c)).toEqual([]);
  });

  it("s'agrège au modificateur maxHp de `modsFromFeatures`", () => {
    const c = swapCtx({ featureChoices: { 'golem-r1': ['pv-from-int'] } });
    expect(modsFromFeatures(['golem-r1'], c)).toEqual({ maxHp: 3 });
  });

  it("apparaît dans `featureModSources` sous la stat maxHp (détail de l'infobulle)", () => {
    const c = swapCtx({ featureChoices: { 'golem-r1': ['pv-from-int'] } });
    expect(featureModSources(['golem-r1'], c).maxHp).toEqual([
      { featureId: 'golem-r1', name: 'Grosse tête', value: 3 },
    ]);
  });
});

describe('testBonusSources — bonus de compétence par domaine (PER-89)', () => {
  it('aucune capacité → aucun domaine', () => {
    expect(testBonusSources([])).toEqual([]);
  });

  it('ignore les ids inconnus et les capacités sans bonus de test', () => {
    expect(testBonusSources(['id-inexistant', 'air-r1'])).toEqual([]);
  });

  it('effet statique mage : Injonction (envouteur-r1) → persuasion & séduction, +3 (profil, rang 1)', () => {
    const byDomain = Object.fromEntries(testBonusSources(['envouteur-r1']).map((r) => [r.domain, r.total]));
    expect(byDomain).toEqual({ persuasion: 3, seduction: 3 });
  });

  it('valeur de profil DYNAMIQUE : 2 + rang atteint dans la voie (envouteur au rang 5 → +7)', () => {
    // envouteur-r5 n'octroie aucun bonus de test mais porte le rang de la voie à 5.
    const res = testBonusSources(['envouteur-r1', 'envouteur-r5']);
    expect(res.find((r) => r.domain === 'persuasion')?.total).toBe(7);
  });

  it('détail de provenance : capacité + catégorie + valeur (Ténèbres → érudition occulte)', () => {
    expect(testBonusSources(['sombre-magie-r1'])).toEqual([
      {
        domain: 'occult-lore',
        total: 3,
        capped: false,
        sources: [{ featureId: 'sombre-magie-r1', name: 'Ténèbres', category: 'class', value: 3 }],
      },
    ]);
  });

  it('domaines pilotés par une option (humain-r1 « Montagnard ») → escalade & résist. froid, +3 (peuple)', () => {
    const c = ctx({ featureChoices: { 'humain-r1': ['highlander'] } });
    const byDomain = Object.fromEntries(testBonusSources(['humain-r1'], c).map((r) => [r.domain, r.total]));
    expect(byDomain).toEqual({ climbing: 3, 'cold-resistance': 3 });
    const climbing = testBonusSources(['humain-r1'], c).find((r) => r.domain === 'climbing');
    expect(climbing?.sources[0]).toMatchObject({ category: 'ancestry', name: 'Diversité', value: 3 });
  });

  it('sans contexte, les domaines pilotés par option ne sont pas résolus', () => {
    expect(testBonusSources(['humain-r1'])).toEqual([]);
  });

  it('origine non choisie (ctx sans sélection) → aucun domaine de peuple', () => {
    expect(testBonusSources(['humain-r1'], ctx())).toEqual([]);
  });

  // NOTE cumul CROSS-CATÉGORIE + plafond +15 : non atteignable avec les seules familles
  // peuplées ici (mages = profil, humain = peuple, sans domaine commun). Couvert quand un
  // ticket de population aval ajoutera un domaine partagé entre catégories (PER-70→74).
});

describe('effectiveAbilities — saisie + modificateurs permanents de capacités', () => {
  const charWithFeatures = (
    abilities: Record<AbilityId, number>,
    featureIds: string[],
    featureChoices: Record<string, (string | string[] | null)[]> = {},
  ): Character => ({ level: 5, abilities, featureIds, featureChoices, effectToggles: {} }) as Character;

  const ABILITIES_3 = { AGI: 0, CON: 3, FOR: 0, PER: 0, CHA: 0, INT: 3, VOL: 0 } as Record<AbilityId, number>;

  it('sans capacité à bonus → caractéristiques inchangées', () => {
    expect(effectiveAbilities(charWithFeatures(ABILITIES_3, ['air-r1']))).toEqual(ABILITIES_3);
  });

  it('replie le +1 CON permanent (Endurer/metal-r5) sur la saisie', () => {
    const eff = effectiveAbilities(charWithFeatures(ABILITIES_3, ['metal-r5']));
    expect(eff.CON).toBe(4);
    expect(eff.INT).toBe(3);
  });

  it('effectContext expose les caractéristiques effectives', () => {
    expect(effectContext(charWithFeatures(ABILITIES_3, ['metal-r5'])).abilities.CON).toBe(4);
  });

  it("scénario test-forgesort-nain : Endurer (+1 CON) rend l'échange Grosse tête→INT non nul", () => {
    // Saisie CON 3 / INT 3 ; Endurer porte la CON effective à 4 → échange = INT 3 − CON 4 = −1.
    const c = charWithFeatures(ABILITIES_3, ['metal-r5', 'golem-r1'], { 'golem-r1': ['pv-from-int'] });
    expect(modsFromFeatures(['metal-r5', 'golem-r1'], effectContext(c)).maxHp).toBe(-1);
  });
});

describe('disabledFeatureReasons — grisage des capacités (exclusion / remplacement)', () => {
  const char = (featureIds: string[], toggles: Record<string, boolean[]> = {}): Character =>
    ({ level: 5, abilities: ctx().abilities, featureIds, effectToggles: toggles, featureChoices: {} }) as Character;

  it('Grand félin (fauve-r4) remplace définitivement la Panthère (fauve-r2)', () => {
    const reasons = disabledFeatureReasons(char(['fauve-r2', 'fauve-r4']));
    expect(reasons.get('fauve-r2')).toEqual({
      byFeatureId: 'fauve-r4',
      byFeatureName: 'Grand félin',
      kind: 'replaced',
    });
    expect(disabledFeatureIds(char(['fauve-r2', 'fauve-r4']))).toEqual(new Set(['fauve-r2']));
  });

  it('sans Grand félin, la Panthère n’est pas grisée', () => {
    expect(disabledFeatureReasons(char(['fauve-r2'])).size).toBe(0);
  });

  it('exclusion mutuelle : Aspect du démon ACTIF grise Beauté de la succube (demon-r2)', () => {
    const reasons = disabledFeatureReasons(char(['demon-r2', 'demon-r4'], { 'demon-r4': [true] }));
    expect(reasons.get('demon-r2')).toEqual({
      byFeatureId: 'demon-r4',
      byFeatureName: 'Aspect du démon',
      kind: 'excluded',
    });
  });

  it('exclusion mutuelle : interrupteur éteint → aucun grisage', () => {
    expect(disabledFeatureReasons(char(['demon-r2', 'demon-r4'])).size).toBe(0);
  });
});
