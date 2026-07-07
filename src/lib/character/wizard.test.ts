import { describe, expect, it } from 'vitest';
import type { AbilityId, Ancestry } from '@/data/schema';
import {
  applyModifiers,
  choicesComplete,
  initialChoices,
  modifierDeltas,
  lowestAbilities,
} from './ancestry';
import {
  level1FeatureIds,
  finalAbilities,
  createDraft,
  materializeDraft,
  effectiveAncestryPath,
  involvedClassIds,
  pathsStepComplete,
  priestVocationComplete,
  divineFeatureOfVocation,
  divineHostComplete,
  type WizardDraft,
} from './wizard';

const zero = (): Record<AbilityId, number> => ({
  AGI: 0,
  CON: 0,
  FOR: 0,
  PER: 0,
  CHA: 0,
  INT: 0,
  VOL: 0,
});

// Fixture : peuple à deux modificateurs « ou » (façon demi-elfe).
const halfElf: Ancestry = {
  id: 'demi-elfe',
  name: 'Demi-elfe',
  description: '',
  physical: { startingAge: '', lifeExpectancy: '', height: '', weight: '', traits: '' },
  names: { note: '', male: [], female: [], sourcePage: 45 },
  abilityModifiers: [
    { value: 1, abilities: ['PER', 'CHA'] },
    { value: -1, abilities: ['FOR', 'CON'] },
  ],
  ancestryPathIds: ['humain', 'elfe-sylvain', 'elfe-haut'],
  sourcePage: 45,
};

// Fixture : peuple à modificateur fixe + un choix (façon nain).
const dwarf: Ancestry = {
  id: 'nain',
  name: 'Nain',
  description: '',
  physical: { startingAge: '', lifeExpectancy: '', height: '', weight: '', traits: '' },
  names: { note: '', male: [], female: [], sourcePage: 58 },
  abilityModifiers: [
    { value: 1, abilities: ['CON', 'VOL'] },
    { value: -1, abilities: ['AGI'] },
  ],
  ancestryPathIds: ['nain'],
  sourcePage: 58,
};

describe('choix de modificateurs de peuple', () => {
  it('initialise les caracs fixes et laisse les choix à null', () => {
    expect(initialChoices(halfElf)).toEqual([null, null]);
    expect(initialChoices(dwarf)).toEqual([null, 'AGI']);
  });

  it('détecte les choix incomplets', () => {
    expect(choicesComplete(halfElf, [null, null])).toBe(false);
    expect(choicesComplete(halfElf, ['PER', 'CON'])).toBe(true);
    expect(choicesComplete(dwarf, [null, 'AGI'])).toBe(false);
    expect(choicesComplete(dwarf, ['CON', 'AGI'])).toBe(true);
  });
});

describe('application des modificateurs', () => {
  it('calcule les deltas résolus', () => {
    expect(modifierDeltas(halfElf, ['PER', 'CON'])).toMatchObject({ PER: 1, CON: -1 });
    expect(modifierDeltas(dwarf, ['VOL', 'AGI'])).toMatchObject({ VOL: 1, AGI: -1 });
  });

  it('applique les deltas aux valeurs de base', () => {
    const base = { ...zero(), PER: 2, FOR: 3 };
    const out = applyModifiers(base, halfElf, ['PER', 'FOR']);
    expect(out.PER).toBe(3);
    expect(out.FOR).toBe(2);
  });

  it('ignore les choix non résolus (delta 0)', () => {
    expect(modifierDeltas(halfElf, [null, null])).toEqual(zero());
  });

  it('trouve les deux caractéristiques les plus faibles', () => {
    const base = { AGI: 2, CON: 1, FOR: -1, PER: 3, CHA: 0, INT: -2, VOL: 1 };
    expect(lowestAbilities(base)).toEqual(['INT', 'FOR']);
  });

  it('inclut toutes les caractéristiques à égalité sur la valeur la plus faible', () => {
    const base = { AGI: 1, CON: 2, FOR: 4, PER: 0, CHA: 0, INT: 0, VOL: 0 };
    expect(lowestAbilities(base)).toEqual(['PER', 'CHA', 'INT', 'VOL']);
  });
});

describe('capacités de niveau 1', () => {
  const base = (over: Partial<WizardDraft> = {}): WizardDraft => ({
    ...createDraft('id-1', '2026-01-01T00:00:00.000Z'),
    chosenPaths: ['rage', 'pourfendeur'],
    ancestryPathId: 'humain',
    ...over,
  });

  it('non-mage : rang 1 des 2 voies + rang 1 de la voie de peuple', () => {
    expect(level1FeatureIds(base()).sort()).toEqual(
      ['humain-r1', 'pourfendeur-r1', 'rage-r1'].sort(),
    );
  });

  it('mage avec bonus rang 2 dans une voie de profil', () => {
    const ids = level1FeatureIds(
      base({
        chosenPaths: ['air', 'invocation'],
        ancestryPathId: 'elfe-haut',
        magePathSlot: true,
        mageBonus: { type: 'class-rank2', pathId: 'invocation' },
      }),
    );
    expect(ids).toEqual(
      expect.arrayContaining(['air-r1', 'invocation-r1', 'elfe-haut-r1', 'mage-r1', 'invocation-r2']),
    );
  });

  it('mage avec bonus rang 2 de la voie du mage', () => {
    const ids = level1FeatureIds(base({ mageBonus: { type: 'mage-rank2' } }));
    expect(ids).toEqual(expect.arrayContaining(['mage-r1', 'mage-r2']));
  });

  it("voie du mage occupe l'emplacement de peuple", () => {
    expect(effectiveAncestryPath(base({ magePathSlot: true }))).toBe('mage');
    expect(effectiveAncestryPath(base())).toBe('humain');
  });
});

describe('vocation du prêtre (p. 122)', () => {
  const draft = (over: Partial<WizardDraft> = {}): WizardDraft => ({
    ...createDraft('id-p', '2026-01-01T00:00:00.000Z'),
    ...over,
  });

  it('non-prêtre : toujours complet (champ non pertinent)', () => {
    expect(priestVocationComplete(draft({ classId: 'barbare' }))).toBe(true);
    expect(priestVocationComplete(draft({ classId: 'barbare', priestVocation: null }))).toBe(true);
  });

  it('prêtre sans vocation : incomplet (wizard bloquant)', () => {
    expect(priestVocationComplete(draft({ classId: 'pretre' }))).toBe(false);
  });

  it('prêtre généraliste : complet', () => {
    expect(priestVocationComplete(draft({ classId: 'pretre', priestVocation: { mode: 'generalist' } }))).toBe(true);
  });

  it('prêtre spécialiste : complet seulement avec un dieu désigné', () => {
    expect(
      priestVocationComplete(draft({ classId: 'pretre', priestVocation: { mode: 'specialist', godId: '' } })),
    ).toBe(false);
    expect(
      priestVocationComplete(draft({ classId: 'pretre', priestVocation: { mode: 'specialist', godId: 'morn' } })),
    ).toBe(true);
  });

  it('materializeDraft : vocation conservée pour un prêtre, forcée à null sinon', () => {
    const ancestry = { id: 'humain', abilityModifiers: [] } as unknown as Ancestry;
    const priest = materializeDraft(
      draft({ classId: 'pretre', priestVocation: { mode: 'specialist', godId: 'morn' } }),
      ancestry,
      '2026-01-01T00:00:00.000Z',
    );
    expect(priest.priestVocation).toEqual({ mode: 'specialist', godId: 'morn' });
    const barbarian = materializeDraft(
      draft({ classId: 'barbare', priestVocation: { mode: 'generalist' } }),
      ancestry,
      '2026-01-01T00:00:00.000Z',
    );
    expect(barbarian.priestVocation).toBeNull();
  });
});

describe('capacité divine du prêtre spécialiste (p. 122)', () => {
  const draft = (over: Partial<WizardDraft> = {}): WizardDraft => ({
    ...createDraft('id-d', '2026-01-01T00:00:00.000Z'),
    classId: 'pretre',
    chosenPaths: ['foi', 'priere'],
    ancestryPathId: 'humain',
    ...over,
  });

  it('divineFeatureOfVocation renvoie la feature du dieu', () => {
    expect(divineFeatureOfVocation({ mode: 'specialist', godId: 'axender' })?.id).toBe('meneur-d-hommes-r1');
    expect(divineFeatureOfVocation({ mode: 'generalist' })).toBeNull();
    expect(divineFeatureOfVocation(null)).toBeNull();
  });

  it('divineHostComplete : une divine de rang 1 exige une voie d’accueil parmi les voies choisies', () => {
    // Axénder → meneur-d-hommes-r1 (rang 1).
    expect(divineHostComplete(draft({ priestVocation: { mode: 'specialist', godId: 'axender' } }))).toBe(false);
    // hostPathId hors des voies choisies → incomplet.
    expect(
      divineHostComplete(draft({ priestVocation: { mode: 'specialist', godId: 'axender', hostPathId: 'guerre-sainte' } })),
    ).toBe(false);
    expect(
      divineHostComplete(draft({ priestVocation: { mode: 'specialist', godId: 'axender', hostPathId: 'foi' } })),
    ).toBe(true);
  });

  it('divineHostComplete : une divine de rang 2+ ne demande rien à la création', () => {
    // Forthur → brute-r2 (rang 2).
    expect(divineHostComplete(draft({ priestVocation: { mode: 'specialist', godId: 'forthur' } }))).toBe(true);
  });

  it('level1FeatureIds : la divine de rang 1 remplace le rang 1 de la voie d’accueil', () => {
    const ids = level1FeatureIds(
      draft({ priestVocation: { mode: 'specialist', godId: 'axender', hostPathId: 'foi' } }),
    );
    expect(ids).toContain('meneur-d-hommes-r1'); // divine acquise
    expect(ids).toContain('priere-r1'); // autre voie inchangée
    expect(ids).toContain('humain-r1'); // voie de peuple inchangée
    expect(ids).not.toContain('foi-r1'); // native remplacée
  });

  it('level1FeatureIds : généraliste ou divine de rang 2+ → aucune substitution', () => {
    expect(level1FeatureIds(draft({ priestVocation: { mode: 'generalist' } }))).toContain('foi-r1');
    expect(
      level1FeatureIds(draft({ priestVocation: { mode: 'specialist', godId: 'forthur', hostPathId: 'foi' } })),
    ).toContain('foi-r1');
  });
});

describe('profil hybride à la création (p. 180)', () => {
  const draft = (over: Partial<WizardDraft> = {}): WizardDraft => ({
    ...createDraft('id-h', '2026-01-01T00:00:00.000Z'),
    classId: 'barbare',
    chosenPaths: ['rage', 'pourfendeur'],
    ...over,
  });

  it('involvedClassIds : profils dont sont issues les voies choisies', () => {
    // Voie du pagne (barbare) + voie des animaux (druide) — exemple du livre.
    expect(involvedClassIds(['pagne', 'animaux'])).toEqual(['barbare', 'druide']);
    expect(involvedClassIds([])).toEqual([]);
  });

  it('création standard : deux voies du profil principal', () => {
    expect(pathsStepComplete(draft())).toBe(true);
    // Une voie hors profil sans mode hybride → incomplet.
    expect(pathsStepComplete(draft({ chosenPaths: ['rage', 'animaux'] }))).toBe(false);
    // Moins de deux voies → incomplet.
    expect(pathsStepComplete(draft({ chosenPaths: ['rage'] }))).toBe(false);
  });

  it('création hybride : profil principal doit être l’un des profils des voies', () => {
    expect(
      pathsStepComplete(draft({ hybrid: true, classId: 'barbare', chosenPaths: ['pagne', 'animaux'] })),
    ).toBe(true);
    // Profil principal absent des profils des voies choisies → incomplet.
    expect(
      pathsStepComplete(draft({ hybrid: true, classId: 'guerrier', chosenPaths: ['pagne', 'animaux'] })),
    ).toBe(false);
  });

  it('arquebusier « poudre interdite » (PER-185) : la voie du maître des arbalètes est valide selon l’effectif', () => {
    // Voie du maître des arbalètes = variante « Arbalétrier » (pathIdsWithoutFirearms),
    // proposée quand les armes à feu sont EFFECTIVEMENT interdites (règle campagne).
    const arbaletrier = draft({ classId: 'arquebusier', chosenPaths: ['artilleur', 'maitre-des-arbaletes'] });
    // Effectif poudre autorisée (défaut snapshot) → voie inexistante → incomplet.
    expect(pathsStepComplete(arbaletrier)).toBe(false);
    // Effectif poudre interdite → la voie du maître des arbalètes est valide.
    expect(pathsStepComplete(arbaletrier, false)).toBe(true);
    // Symétrique : la voie des explosifs (poudre) n’est plus valide quand l’effectif interdit la poudre.
    const artificier = draft({ classId: 'arquebusier', chosenPaths: ['artilleur', 'explosifs'] });
    expect(pathsStepComplete(artificier)).toBe(true);
    expect(pathsStepComplete(artificier, false)).toBe(false);
  });

  it('mage : la capacité de rang 2 supplémentaire doit être désignée', () => {
    const mage = draft({ classId: 'magicien', chosenPaths: ['magie-des-arcanes', 'magie-destructrice'] });
    expect(pathsStepComplete(mage)).toBe(false);
    expect(
      pathsStepComplete({ ...mage, mageBonus: { type: 'class-rank2', pathId: 'magie-des-arcanes' } }),
    ).toBe(true);
  });
});

describe('materializeDraft', () => {
  it('produit un personnage de niveau 1 cohérent', () => {
    const draft = {
      ...createDraft('perso-9', '2026-01-01T00:00:00.000Z'),
      ancestryId: 'demi-elfe',
      ancestryPathId: 'humain',
      classId: 'barbare',
      baseAbilities: { ...zero(), FOR: 3, CON: 2 },
      ancestryChoices: ['PER', 'CON'] as (AbilityId | null)[],
      chosenPaths: ['rage', 'pourfendeur'],
      name: '  Maalik  ',
    };
    const c = materializeDraft(draft, halfElf, '2026-02-02T00:00:00.000Z');
    expect(c.id).toBe('perso-9');
    expect(c.name).toBe('Maalik'); // trim
    expect(c.level).toBe(1);
    expect(c.abilities.PER).toBe(1); // 0 +1
    expect(c.abilities.CON).toBe(1); // 2 -1
    expect(c.abilities.FOR).toBe(3);
    expect(c.featureIds.sort()).toEqual(['humain-r1', 'pourfendeur-r1', 'rage-r1'].sort());
    expect(c.levelUpHistory).toHaveLength(1);
    expect(c.createdAt).toBe('2026-01-01T00:00:00.000Z');
    expect(c.updatedAt).toBe('2026-02-02T00:00:00.000Z');
  });

  it('nom vide → libellé par défaut', () => {
    const c = materializeDraft(
      { ...createDraft('x', '2026-01-01T00:00:00.000Z'), ancestryId: 'demi-elfe' },
      halfElf,
      '2026-01-01T00:00:00.000Z',
    );
    expect(c.name).toBe('Nouveau personnage');
  });

  // PER-184 : le raccourci « recréer pour ce joueur » depuis un perso mort lance
  // la création avec la campagne ET le joueur pré-remplis ; le brouillon les porte
  // jusqu'à la matérialisation.
  it('campagne et joueur du brouillon reportés sur le personnage créé', () => {
    const c = materializeDraft(
      {
        ...createDraft('recree', '2026-01-01T00:00:00.000Z', 'camp-1', 'joueur-1'),
        ancestryId: 'demi-elfe',
      },
      halfElf,
      '2026-01-01T00:00:00.000Z',
    );
    expect(c.campaignId).toBe('camp-1');
    expect(c.playerId).toBe('joueur-1');
  });

  it('sans joueur seedé, le personnage créé a playerId null', () => {
    const c = materializeDraft(
      { ...createDraft('x', '2026-01-01T00:00:00.000Z', 'camp-1'), ancestryId: 'demi-elfe' },
      halfElf,
      '2026-01-01T00:00:00.000Z',
    );
    expect(c.campaignId).toBe('camp-1');
    expect(c.playerId).toBeNull();
  });
});

describe('createDraft — attribution (PER-184)', () => {
  it('porte le joueur seedé, ou null par défaut', () => {
    expect(createDraft('a', '2026-01-01T00:00:00.000Z').playerId).toBeNull();
    expect(createDraft('b', '2026-01-01T00:00:00.000Z', 'camp-1', 'joueur-1').playerId).toBe(
      'joueur-1',
    );
  });
});
