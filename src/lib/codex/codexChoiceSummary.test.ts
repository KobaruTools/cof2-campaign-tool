import { describe, expect, it } from 'vitest';
import { featureById } from '@/data';
import type { PathFeatureChoice } from '@/data/schema';
import { summarizeCodexChoice } from './codexChoiceSummary';

function pathFeatureChoiceOf(featureId: string): PathFeatureChoice {
  const choice = featureById.get(featureId)?.choices?.[0];
  if (!choice || choice.kind !== 'feature-from-path') {
    throw new Error(`${featureId} n'a pas de choix feature-from-path en position 0`);
  }
  return choice;
}

describe('summarizeCodexChoice — kind: option/ability', () => {
  it('énumère toutes les options statiques (aucun personnage requis)', () => {
    const feature = featureById.get('humain-r1');
    const choice = feature?.choices?.find((c) => c.kind === 'option');
    if (!choice) throw new Error('fixture humain-r1 introuvable ou sans choix option');
    const summary = summarizeCodexChoice(feature!.id, choice);
    expect(summary.items?.length).toBeGreaterThan(0);
    expect(summary.borrowable).toBeUndefined();
  });
});

describe('summarizeCodexChoice — kind: feature-from-path', () => {
  it('familyScope littéral (touche-à-tout r4, aventuriers) : domaine statique non vide', () => {
    const choice = pathFeatureChoiceOf('prestige-touche-a-tout-r4');
    const summary = summarizeCodexChoice('prestige-touche-a-tout-r4', choice);
    expect(summary.unresolvedNote).toBeUndefined();
    expect(summary.borrowable).toBeDefined();
    expect(summary.borrowable!.length).toBeGreaterThan(0);
    for (const { feature } of summary.borrowable!) {
      expect([1, 2]).toContain(feature.rank);
    }
  });

  it('familyScope same-family : relatif au personnage, pas de fausse liste', () => {
    const choice = pathFeatureChoiceOf('prestige-expert-r4');
    const summary = summarizeCodexChoice('prestige-expert-r4', choice);
    expect(summary.borrowable).toBeUndefined();
    expect(summary.unresolvedNote).toMatch(/profil du personnage/);
  });

  it('familiarSpellProfile : relatif au personnage, pas de fausse liste', () => {
    const choice = pathFeatureChoiceOf('prestige-familier-fantastique-r5');
    const summary = summarizeCodexChoice('prestige-familier-fantastique-r5', choice);
    expect(summary.borrowable).toBeUndefined();
    expect(summary.unresolvedNote).toMatch(/familier fantastique/);
  });

  it('includePrestigePaths : étend le domaine aux voies de prestige (rangs 6-7 inclus)', () => {
    const choice = pathFeatureChoiceOf('prestige-armure-sacree-r7');
    const summary = summarizeCodexChoice('prestige-armure-sacree-r7', choice);
    expect(summary.unresolvedNote).toBeUndefined();
    const ranks = summary.borrowable!.map((b) => b.feature.rank);
    expect(ranks.some((r) => r === 6 || r === 7)).toBe(true);
    expect(summary.borrowable!.every((b) => b.feature.isSpell)).toBe(true);
  });
});

describe('summarizeCodexChoice — kinds non énumérables', () => {
  it('free-text : note explicite, aucune liste', () => {
    const summary = summarizeCodexChoice('x', {
      kind: 'free-text',
      prompt: 'Nom de la créature',
    });
    expect(summary.items).toBeUndefined();
    expect(summary.unresolvedNote).toBeTruthy();
  });
});
