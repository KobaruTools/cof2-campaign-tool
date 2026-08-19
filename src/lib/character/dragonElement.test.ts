import { describe, expect, it } from 'vitest';
import { featureById } from '@/data';
import { DRAGON_ELEMENTS, dragonColorOptions } from '@/data/dragon-elements';
import { RESISTIBLE_DAMAGE_TYPES } from '@/data/schema';
import { SCHEMA_VERSION, type Character } from '@/lib/character/types';
import { declineText, resolveFeatureElement } from './dragonElement';

function makeCharacter(over: Partial<Character> = {}): Character {
  return {
    schemaVersion: SCHEMA_VERSION,
    id: 'test',
    name: 'Test',
    identity: {},
    ancestryId: 'humain',
    classId: 'chevalier',
    level: 12,
    priestVocation: null,
    portraitVariant: 'default',
    firearmsAllowed: true,
    campaignId: null,
    playerId: null,
    status: 'active',
    abilities: { AGI: 1, CON: 3, FOR: 3, PER: 1, CHA: 3, INT: 0, VOL: 1 },
    baseAbilities: { AGI: 1, CON: 3, FOR: 3, PER: 1, CHA: 3, INT: 0, VOL: 1 },
    ancestryChoices: [],
    ancestryPathId: 'humain',
    featureIds: ['cavalier-r5'],
    featureChoices: {},
    effectToggles: {},
    effectInputs: {},
    usageCounters: {},
    depletion: {},
    companionDepletion: {},
    transformationDepletion: {},
  transformationAbilities: {},
    transformationDerivedStats: {},
    companionInstances: {},
    mounts: [],
    poisonedWeapons: [],
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

const withColor = (color: string) =>
  makeCharacter({ featureChoices: { 'cavalier-r5': ['drake', color] } });

describe('DRAGON_ELEMENTS — table couleur → énergie (p. 147, mutualisée avec Ascendance draconique)', () => {
  it('les cinq couleurs chromatiques, chacune sur un type de dégâts VALIDE du moteur', () => {
    expect(DRAGON_ELEMENTS.map((e) => [e.color, e.id])).toEqual([
      ['rouge', 'fire'],
      ['blanc', 'cold'],
      ['bleu', 'lightning'],
      ['vert', 'acid'],
      ['noir', 'poison'],
    ]);
    for (const e of DRAGON_ELEMENTS) {
      expect(RESISTIBLE_DAMAGE_TYPES as readonly string[]).toContain(e.id);
    }
  });

  it('les options du choix sont générées depuis la table (pas de seconde liste à maintenir)', () => {
    expect(dragonColorOptions()).toEqual([
      { id: 'fire', label: 'Rouge (feu)' },
      { id: 'cold', label: 'Blanc (froid)' },
      { id: 'lightning', label: 'Bleu (foudre)' },
      { id: 'acid', label: 'Vert (acide)' },
      { id: 'poison', label: 'Noir (poison)' },
    ]);
  });

  it('la correspondance est la MÊME que celle d’Ascendance draconique (source unique de vérité)', () => {
    const choice = featureById.get('prestige-sang-dragon-r4')!.choices![0];
    const ancestryIds = choice.kind === 'option' ? choice.options.map((o) => o.id) : [];
    expect([...ancestryIds].sort()).toEqual(DRAGON_ELEMENTS.map((e) => e.id).sort());
  });
});

describe('resolveFeatureElement — lecture CROSS-CAPACITÉ du choix de couleur', () => {
  const r5 = () => featureById.get('prestige-chevalier-dragon-r5')!;

  it('couleur retenue sur cavalier-r5 → élément résolu sur la capacité de PRESTIGE', () => {
    expect(resolveFeatureElement(withColor('cold'), r5())?.id).toBe('cold');
  });

  it('aucune couleur retenue → null (la mécanique reste inerte)', () => {
    const c = makeCharacter({ featureChoices: { 'cavalier-r5': ['drake'] } });
    expect(resolveFeatureElement(c, r5())).toBeNull();
  });

  it('id obsolète/inconnu → null plutôt qu’un élément fantôme', () => {
    expect(resolveFeatureElement(withColor('plaid'), r5())).toBeNull();
  });

  it('capacité NON déclinable → null, sans regarder le personnage', () => {
    expect(resolveFeatureElement(withColor('fire'), featureById.get('cavalier-r1')!)).toBeNull();
  });
});

describe('declineText — formes fléchies françaises', () => {
  const el = (id: string) => DRAGON_ELEMENTS.find((e) => e.id === id)!;

  it('un texte SANS token traverse inchangé (même référence)', () => {
    const s = 'Le cavalier rejoint son ordre.';
    expect(declineText(s, el('cold'))).toBe(s);
  });

  it('élision et contraction correctes pour chaque couleur', () => {
    const tpl = 'RD %noun% — DM %of% — Résistance %toThe% — contre %theNoun%';
    expect(declineText(tpl, el('fire'))).toBe('RD feu — DM de feu — Résistance au feu — contre le feu');
    expect(declineText(tpl, el('lightning'))).toBe(
      'RD foudre — DM de foudre — Résistance à la foudre — contre la foudre',
    );
    expect(declineText(tpl, el('acid'))).toBe("RD acide — DM d'acide — Résistance à l'acide — contre l'acide");
    expect(declineText(tpl, el('poison'))).toBe(
      'RD poison — DM de poison — Résistance au poison — contre le poison',
    );
  });

  it('groupes verbaux : ni « acidifier » ni « cracher du froid »', () => {
    expect(declineText('%swordVerbPhrase%', el('acid'))).toBe("enduire son épée d'acide");
    expect(declineText('%breathPhrase%', el('cold'))).toBe('souffler un jet de froid');
    expect(declineText('Souffle %breathAdj%', el('poison'))).toBe('Souffle venimeux');
  });

  it('sans élément : repli sur le texte IMPRIMÉ du livre (le rouge), jamais un token brut', () => {
    expect(declineText('Résistance %toThe%', null)).toBe('Résistance au feu');
    expect(declineText('Souffle %breathAdj%', undefined)).toBe('Souffle enflammé');
  });

  it('%colorSuffix% est le SEUL token à repli VIDE (aucune source ne nomme la couleur du drake)', () => {
    expect(declineText('Drake%colorSuffix%', el('lightning'))).toBe('Drake bleu');
    expect(declineText('Drake%colorSuffix%', null)).toBe('Drake');
  });
});

describe('voie du chevalier dragon — cohérence des données tokenisées', () => {
  const RANKS = [4, 5, 6, 7, 8].map((r) => featureById.get(`prestige-chevalier-dragon-r${r}`)!);

  it('tous les rangs pointent le MÊME choix de couleur (celui du drake)', () => {
    for (const f of RANKS) {
      expect(f.elementFromChoice).toEqual({ choiceFeatureId: 'cavalier-r5', choiceIndex: 1 });
    }
  });

  it('le choix visé existe bien, est un choix d’options, et ses ids SONT des éléments', () => {
    const choice = featureById.get('cavalier-r5')!.choices![1];
    expect(choice.kind).toBe('option');
    expect(choice.visibleIfOption).toEqual({ choiceIndex: 0, optionId: 'drake' });
    const ids = choice.kind === 'option' ? choice.options.map((o) => o.id) : [];
    expect(ids).toEqual(DRAGON_ELEMENTS.map((e) => e.id));
  });

  it('aucun token ne subsiste dans le `text` VERBATIM (il reste la source imprimée)', () => {
    for (const f of RANKS) expect(f.text).not.toMatch(/%/);
  });

  it('tout token présent dans les données est un token CONNU (pas de faute de frappe muette)', () => {
    const known = new Set([
      '%color%', '%colorSuffix%', '%noun%', '%of%', '%toThe%', '%theNoun%',
      '%breathAdj%', '%breathPhrase%', '%swordAdj%', '%swordVerbPhrase%',
    ]);
    const texts = [
      ...RANKS.flatMap((f) => [
        f.name,
        f.richText ?? '',
        ...(f.effects ?? []).map((e) => ('activation' in e ? e.activation.label : '')),
        ...(f.effects ?? []).map((e) => ('condition' in e ? (e.condition?.label ?? '') : '')),
        f.creatureProfile?.name ?? '',
        ...(f.creatureUpgrade?.specialAbilities ?? []).flatMap((sa) => [sa.name, sa.richText ?? '']),
      ]),
      featureById.get('cavalier-r5')!.name,
      ...(featureById.get('cavalier-r5')!.choices ?? []).flatMap((ch) =>
        ch.kind === 'option' ? ch.options.map((o) => o.creatureProfile?.name ?? '') : [],
      ),
    ];
    for (const t of texts) {
      for (const token of t.match(/%[A-Za-z]+%/g) ?? []) expect(known).toContain(token);
    }
  });
});

/**
 * PER-74 (retour propriétaire 2026-08-09) — Métamorphose élémentaire (élémentaliste r8, p. 157)
 * décrit ses QUATRE formes d'un bloc, alors qu'un personnage n'en a qu'une. Le marqueur
 * `%branch:<élément>%` garde la sienne dans le corps du texte et rejette les autres en note.
 */
describe('declineText — branches élémentaires (%branch:…%)', () => {
  const el = (id: string) => DRAGON_ELEMENTS.find((e) => e.id === id)!;
  const TEXT =
    'Formes :\n' +
    '- %branch:fire%Feu : +2d4 DM.\n' +
    '- %branch:acid%Eau : guérison.\n' +
    '- %branch:cold%Terre : +3 FOR.\n' +
    '- %branch:lightning%Air : vol.';

  it('garde la branche de l’élément retenu et rejette les autres en note', () => {
    const out = declineText(TEXT, el('cold'));
    expect(out).toBe(
      'Formes :\n- Terre : +3 FOR.\n\nNote — autres formes, non retenues :\n' +
        '- Feu : +2d4 DM.\n- Eau : guérison.\n- Air : vol.',
    );
  });

  it('sans élément retenu, les quatre branches restent en place (texte imprimé)', () => {
    const out = declineText(TEXT, null);
    expect(out).toBe('Formes :\n- Feu : +2d4 DM.\n- Eau : guérison.\n- Terre : +3 FOR.\n- Air : vol.');
    expect(out).not.toContain('Note —');
  });

  it('un texte sans marqueur de branche traverse inchangé', () => {
    expect(declineText('Résistance %toThe%', el('acid'))).toBe("Résistance à l'acide");
  });

  it('les tokens de la branche RETENUE sont résolus, ceux des autres partent avec elles', () => {
    const out = declineText('- %branch:fire%Feu %noun%\n- %branch:cold%Terre %noun%', el('fire'));
    expect(out).toBe('- Feu feu\n\nNote — autres formes, non retenues :\n- Terre feu');
  });
});
