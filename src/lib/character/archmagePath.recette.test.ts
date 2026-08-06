/**
 * PER-74 — voie de l'archimage (p. 154, 1ʳᵉ voie MAGE dans l'ordre du livre), recette end-to-end.
 *
 * R4 Sceptre défensif : DEF chiffrée (patron EXACT « Tenir à distance », armes-à-deux-mains r6,
 * p. 146) — résolue AUTOMATIQUEMENT depuis le bâton réellement en main (`staff-def-bonus` +
 * `ctx.staffWielded`), sans interrupteur. Le bonus aux tests opposés de résistance à la magie reste
 * VERBATIM (hors périmètre moteur, comme l'elfe p. 50 et le halfelin p. 56). R5/R7 Bâton magique :
 * sort de rang 1 (R5) puis rang 2 (R7) GRANTED via `feature-from-path` (`familyScope:'mages'`),
 * castables SANS dépense de mana (`archmageFreeSpellDiscount`, réutilisation du `discount` de
 * SpellManaBadge). Le 2ᵉ sort est porté par le choix de R7 (pas un 2ᵉ slot sur R5) : le personnage
 * ne peut matériellement pas le désigner avant d'avoir atteint le rang 7. R6 Paralysie / R7 Barrière
 * magique : richText balisé seul (R6) ou + usageCounter 1×/jour (R7, patron magie-universelle-r5).
 * R8 Métamorphose d'autrui : verbatim seul (limite « 1×/combat PAR CIBLE » sans équivalent moteur,
 * même écart que Pieds d'argile, tueur de géants r7).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { featureById, pathById } from '@/data';
import { migrateCharacter } from '@/lib/engine/migrations';
import { activeFeatureIdsForMods, effectContext, modsFromFeatures } from '@/lib/character/effects';
import { archmageFreeSpellDiscount } from '@/lib/character/archmagePath';
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

const PATH_ID = 'prestige-archimage';
const R4 = `${PATH_ID}-r4`;
const R5 = `${PATH_ID}-r5`;
const R6 = `${PATH_ID}-r6`;
const R7 = `${PATH_ID}-r7`;
const R8 = `${PATH_ID}-r8`;
const RANK1_SPELL = 'magie-des-arcanes-r1';
const RANK2_SPELL = 'magie-des-arcanes-r2';

function loadFixture(name: string): Character {
  const raw = JSON.parse(readFileSync(join(process.cwd(), 'examples/characters', `${name}.json`), 'utf8'));
  return migrateCharacter(raw);
}

describe("PER-74 — voie de l'archimage (p. 154, recette end-to-end)", () => {
  const character = loadFixture('recette-per74-archimage');

  it('voie de prestige de la catégorie mage, sans prérequis', () => {
    const path = pathById.get(PATH_ID)!;
    expect(path.type).toBe('prestige');
    expect('category' in path && path.category).toBe('mage');
    expect(path.sourcePage).toBe(154);
    expect('prerequisites' in path && path.prerequisites).toBe('');
  });

  it('aucune anomalie de conformité sur le fixture (compliance propre)', () => {
    expect(checkCompliance(character, rulesContext)).toEqual([]);
  });

  it('r4 Sceptre défensif : DEF automatique tant que le bâton est en main, stepped par rang de voie', () => {
    expect(featureById.get(R4)?.effects).toEqual([
      {
        kind: 'staff-def-bonus',
        value: { scale: 'stepped', by: 'path-rank', steps: [{ min: 4, value: 1 }, { min: 6, value: 2 }, { min: 8, value: 3 }] },
      },
    ]);

    const ctx = effectContext(character);
    expect(ctx.staffWielded).toBe(true);
    expect(modsFromFeatures(activeFeatureIdsForMods(character), ctx).def).toBe(3);

    const sansBaton: Character = { ...character, equipment: [] };
    const ctxSansBaton = effectContext(sansBaton);
    expect(ctxSansBaton.staffWielded).toBe(false);
    expect(modsFromFeatures(activeFeatureIdsForMods(sansBaton), ctxSansBaton).def).toBeUndefined();

    const r4Only: Character = { ...character, featureIds: [R4] };
    expect(modsFromFeatures(activeFeatureIdsForMods(r4Only), effectContext(r4Only)).def).toBe(1);
  });

  it('r4 : le bonus aux tests opposés de résistance à la magie reste verbatim (hors périmètre moteur)', () => {
    expect(featureById.get(R4)?.text).toContain('tests opposés de magie');
  });

  it('r5/r7 Bâton magique : sorts de rang 1 et 2 accordés SANS dépense de mana', () => {
    const rank1 = featureById.get(RANK1_SPELL)!;
    const rank2 = featureById.get(RANK2_SPELL)!;
    expect(archmageFreeSpellDiscount(character, rank1)).toBe(1);
    expect(archmageFreeSpellDiscount(character, rank2)).toBe(2);

    // Un AUTRE sort (non désigné) ne bénéficie de rien.
    expect(archmageFreeSpellDiscount(character, featureById.get('magie-des-arcanes-r3')!)).toBe(0);

    // Sans r7, le sort de rang 2 (même si son choix restait renseigné) n'est plus gratuit.
    const sansR7: Character = { ...character, featureIds: character.featureIds.filter((id) => id !== R7) };
    expect(archmageFreeSpellDiscount(sansR7, rank2)).toBe(0);

    // Les deux sorts sont bien ACQUIS (empruntés), pas seulement désignés.
    const active = activeFeatureIdsForMods(character);
    expect(active).toContain(RANK1_SPELL);
    expect(active).toContain(RANK2_SPELL);
  });

  it('r6 Paralysie : richText balisé seul (PAS de inflictableStates, sort répétable — PER-290)', () => {
    const r6 = featureById.get(R6)!;
    expect(r6.effects).toBeUndefined();
    expect(r6.richText).toContain('[1d4° + INT]');
    assertNoLeakedTokens(r6.richText!);
  });

  it('r7 Barrière magique : richText balisé + usageCounter 1×/jour', () => {
    const r7 = featureById.get(R7)!;
    expect(r7.richText).toContain('[5d4° + INT]');
    assertNoLeakedTokens(r7.richText!);
    expect(r7.usageCounter).toEqual({ max: 1, resetOn: 'day', hideFromStatusPanel: true });
  });

  it("r8 Métamorphose d'autrui : verbatim seul (limite « par cible » sans équivalent moteur)", () => {
    const r8 = featureById.get(R8)!;
    expect(r8.effects).toBeUndefined();
    expect(r8.text).toContain("plus d'une fois par combat");
  });
});
