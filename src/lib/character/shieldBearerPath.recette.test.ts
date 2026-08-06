/**
 * PER-74 — voie du porteur de bouclier (p. 152-153, 11ᵉ voie COMBATTANT), recette end-to-end.
 *
 * Toute la voie est marquée `requiresShield` (patron Voie du bouclier du guerrier, PER-142) :
 * sans bouclier manié, les 5 rangs sont désactivés (`shieldDisabledFeatureIds`), y compris le
 * bonus de DEF de r6. r4 Parade au bouclier : `usageCounter` 1×/combat (patron Étreinte de
 * l'ours), la parade elle-même (annule les DM d'une attaque sauf critique) reste verbatim.
 * r5 Attaque au bouclier et r7 Dévier les coups : verbatim seuls, patron Riposte du maître
 * d'armes (1×/round, aucun suivi par round dans l'app). r6 Bousculade : la poussée/test opposé
 * reste verbatim ; le bonus de DEF est en revanche PERMANENT et scalant par rang de la voie
 * (`stat-bonus def` stepped {6:+1, 8:+2}). r8 Lancer de bouclier : verbatim seul (action
 * multi-étapes sans limite d'usage déclarée).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { featureById, pathById } from '@/data';
import { migrateCharacter } from '@/lib/engine/migrations';
import { activeFeatureIdsForMods, effectContext, modsFromFeatures } from '@/lib/character/effects';
import { isShieldWorn, shieldDisabledFeatureIds } from '@/lib/character/armorRestrictions';
import { checkCompliance } from '@/lib/engine/legality';
import { rulesContext } from '@/lib/character/rulesContext';
import { parseRichText } from '@/lib/ui/featureRichText';
import type { Character } from '@/lib/character/types';

function assertNoLeakedTokens(richText: string) {
  const leaked = parseRichText(richText)
    .filter((s): s is { kind: 'text'; value: string } => s.kind === 'text')
    .some((s) => /[{[]/.test(s.value));
  expect(leaked).toBe(false);
}

const PATH_ID = 'prestige-porteur-de-bouclier';
const R4 = `${PATH_ID}-r4`;
const R5 = `${PATH_ID}-r5`;
const R6 = `${PATH_ID}-r6`;
const R7 = `${PATH_ID}-r7`;
const R8 = `${PATH_ID}-r8`;

function loadFixture(name: string): Character {
  const raw = JSON.parse(readFileSync(join(process.cwd(), 'examples/characters', `${name}.json`), 'utf8'));
  return migrateCharacter(raw);
}

describe('PER-74 — voie du porteur de bouclier (p. 152-153, recette end-to-end)', () => {
  const character = loadFixture('recette-per74-porteur-de-bouclier');
  const mods = (c: Character) => modsFromFeatures(activeFeatureIdsForMods(c), effectContext(c));

  it('voie de prestige de la famille des combattants, sans prérequis, avec sa note RP', () => {
    const path = pathById.get(PATH_ID)!;
    expect(path.type).toBe('prestige');
    expect('category' in path && path.category).toBe('fighter');
    expect(path.sourcePage).toBe(152);
    expect('prerequisites' in path && path.prerequisites).toBe('');
    expect('note' in path && path.note).toMatch(/expert du bouclier/);
    expect('requiresShield' in path && path.requiresShield).toBe(true);
  });

  it('aucune anomalie de conformité sur le fixture (compliance propre)', () => {
    expect(checkCompliance(character, rulesContext)).toEqual([]);
  });

  it("toute la voie exige un bouclier manié — désactivée sans bouclier (PER-142)", () => {
    expect(isShieldWorn(character.equipment)).toBe(true);
    const noShield: Character = {
      ...character,
      equipment: character.equipment.filter((line) => line.worn?.slot !== 'shield'),
    };
    expect(shieldDisabledFeatureIds(character, rulesContext).size).toBe(0);
    expect(shieldDisabledFeatureIds(noShield, rulesContext)).toEqual(new Set([R4, R5, R6, R7, R8]));
    expect(mods(noShield).def).toBeUndefined();
  });

  it('r4 Parade au bouclier : compteur 1×/combat, parade elle-même verbatim', () => {
    expect(featureById.get(R4)?.usageCounter).toEqual({ max: 1, resetOn: 'short-rest', hideFromStatusPanel: true });
    expect(featureById.get(R4)?.effects).toBeUndefined();
  });

  it("r5 Attaque au bouclier : verbatim seul (patron Riposte, aucun suivi par round), DM balisé", () => {
    expect(featureById.get(R5)?.effects).toBeUndefined();
    expect(featureById.get(R5)?.usageCounter).toBeUndefined();
    expect(featureById.get(R5)?.text).toContain('[1d4°+FOR] DM');
    const richText = featureById.get(R5)!.richText!;
    expect(richText).toContain('[1d4° + FOR] DM');
    assertNoLeakedTokens(richText);
    const expr = parseRichText(richText).find((s) => s.kind === 'expr');
    expect(expr).toMatchObject({
      terms: [
        { kind: 'die', sign: 1, token: { count: 1, die: 'd4', evolving: true } },
        { kind: 'ability', sign: 1, ability: 'FOR' },
      ],
    });
  });

  it('r6 Bousculade : DEF +1 dès le rang 6, +2 au rang 8 (avec bouclier)', () => {
    expect(featureById.get(R6)?.effects).toEqual([
      {
        kind: 'stat-bonus',
        stat: 'def',
        value: { scale: 'stepped', by: 'path-rank', steps: [{ min: 6, value: 1 }, { min: 8, value: 2 }] },
      },
    ]);
    expect(mods(character).def).toBe(2);
    const rank6Only: Character = { ...character, featureIds: character.featureIds.filter((id) => id !== R7 && id !== R8) };
    expect(mods(rank6Only).def).toBe(1);
  });

  it('r7 Dévier les coups : verbatim seul (patron Riposte, aucun suivi par round)', () => {
    expect(featureById.get(R7)?.effects).toBeUndefined();
    expect(featureById.get(R7)?.usageCounter).toBeUndefined();
    expect(featureById.get(R7)?.text).toContain("sauf s'il est surpris");
  });

  it('r8 Lancer de bouclier : verbatim seul (action multi-étapes, aucune limite déclarée), difficulté balisée', () => {
    expect(featureById.get(R8)?.effects).toBeUndefined();
    expect(featureById.get(R8)?.usageCounter).toBeUndefined();
    // Le text VERBATIM garde le libellé du livre (« du personnage », non parsable tel quel).
    expect(featureById.get(R8)?.text).toContain('[10 + FOR du personnage]');
    // Le richText reformule en formule parsable (même valeur, FOR du porteur implicite).
    const richText = featureById.get(R8)!.richText!;
    expect(richText).toContain('[10 + FOR]');
    assertNoLeakedTokens(richText);
    const expr = parseRichText(richText).find((s) => s.kind === 'expr');
    expect(expr).toMatchObject({
      terms: [
        { kind: 'number', sign: 1, value: 10 },
        { kind: 'ability', sign: 1, ability: 'FOR' },
      ],
    });
  });
});
