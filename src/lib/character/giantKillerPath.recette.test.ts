/**
 * PER-74 — voie du tueur de géants (p. 153, 12ᵉ et DERNIÈRE voie COMBATTANT), recette end-to-end.
 * Après cette voie, la catégorie COMBATTANT est BOUCLÉE (12/12).
 *
 * Profil différent des voies précédentes : la majorité des rangs sont conditionnés à la TAILLE DE
 * L'ADVERSAIRE, une dimension que le moteur ne suit pas (pas de « cible courante » sur la fiche) :
 * r4 Profil bas et r6 Réduire la distance passent par des interrupteurs MANUELS (patron Vision des
 * ombres, `prestige-ombres-r4`) — r6 en pose TROIS indépendants (+1/+2/+3 DEF, un par palier de
 * taille, aucune exclusion mutuelle imposée par le moteur). r8 Tueur de géants est un dé bonus DM
 * SITUATIONNEL ×3 (patron Chasseur émérite, `traqueur-r3`), badges sous la carte d'attaque. r5
 * Ventre mou (bypass de RD adverse) et r7 Pieds d'argile (mélange état de base + effet situationnel,
 * limite « 1×/combat PAR CIBLE » sans équivalent moteur) restent verbatim seuls ; r7 porte un tag
 * data-only (`situationalEffectIds`) pour le futur Combat Tracker, sans effet actif aujourd'hui.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { equipmentById, featureById, pathById } from '@/data';
import { migrateCharacter } from '@/lib/engine/migrations';
import { activeFeatureIdsForMods, effectContext, modsFromFeatures, testBonusSources } from '@/lib/character/effects';
import { weaponDamageBonuses } from '@/lib/character/weaponDamageBonus';
import { checkCompliance } from '@/lib/engine/legality';
import { rulesContext } from '@/lib/character/rulesContext';
import { parseRichText } from '@/lib/ui/featureRichText';
import type { Weapon } from '@/data/schema';
import type { Character } from '@/lib/character/types';

function assertNoLeakedTokens(richText: string) {
  const leaked = parseRichText(richText)
    .filter((s): s is { kind: 'text'; value: string } => s.kind === 'text')
    .some((s) => /[{[]/.test(s.value));
  expect(leaked).toBe(false);
}

const PATH_ID = 'prestige-tueur-de-geants';
const R4 = `${PATH_ID}-r4`;
const R5 = `${PATH_ID}-r5`;
const R6 = `${PATH_ID}-r6`;
const R7 = `${PATH_ID}-r7`;
const R8 = `${PATH_ID}-r8`;

function loadFixture(name: string): Character {
  const raw = JSON.parse(readFileSync(join(process.cwd(), 'examples/characters', `${name}.json`), 'utf8'));
  return migrateCharacter(raw);
}

describe('PER-74 — voie du tueur de géants (p. 153, recette end-to-end)', () => {
  const character = loadFixture('recette-per74-tueur-de-geants');
  const mods = (c: Character) => modsFromFeatures(activeFeatureIdsForMods(c), effectContext(c));

  it('voie de prestige de la famille des combattants, sans prérequis, avec sa note RP', () => {
    const path = pathById.get(PATH_ID)!;
    expect(path.type).toBe('prestige');
    expect('category' in path && path.category).toBe('fighter');
    expect(path.sourcePage).toBe(153);
    expect('prerequisites' in path && path.prerequisites).toBe('');
    expect('note' in path && path.note).toMatch(/têtes brûlées/);
  });

  it('aucune anomalie de conformité sur le fixture (compliance propre)', () => {
    expect(checkCompliance(character, rulesContext)).toEqual([]);
  });

  it('r4 Profil bas : interrupteur manuel, +5 discrétion (patron Vision des ombres)', () => {
    expect(featureById.get(R4)?.effects).toEqual([
      {
        kind: 'conditional-stat-bonus',
        bonuses: [],
        testBonusDomains: ['stealth'],
        testBonusValue: 5,
        activation: {
          kind: 'condition',
          label: 'Contre une créature de taille grande ou supérieure',
          activeByDefault: false,
        },
      },
    ]);
    const offSources = testBonusSources(activeFeatureIdsForMods(character), effectContext(character));
    expect(offSources.find((b) => b.domain === 'stealth')).toBeUndefined();

    const on: Character = { ...character, effectToggles: { ...character.effectToggles, [R4]: [true] } };
    const onSources = testBonusSources(activeFeatureIdsForMods(on), effectContext(on));
    expect(onSources.find((b) => b.domain === 'stealth')).toMatchObject({ total: 5 });
  });

  it("r5 Ventre mou : verbatim seul (bypass de RD adverse, aucun mécanisme existant)", () => {
    expect(featureById.get(R5)?.effects).toBeUndefined();
    expect(featureById.get(R5)?.text).toContain('Il ignore la RD des créatures');
  });

  it('r6 Réduire la distance : 3 interrupteurs indépendants, DEF +1/+2/+3 par taille', () => {
    expect(featureById.get(R6)?.effects).toEqual([
      {
        kind: 'conditional-stat-bonus',
        bonuses: [{ stat: 'def', value: 1 }],
        activation: { kind: 'condition', label: 'Contre une créature de taille grande', activeByDefault: false },
      },
      {
        kind: 'conditional-stat-bonus',
        bonuses: [{ stat: 'def', value: 2 }],
        activation: { kind: 'condition', label: 'Contre une créature de taille énorme', activeByDefault: false },
      },
      {
        kind: 'conditional-stat-bonus',
        bonuses: [{ stat: 'def', value: 3 }],
        activation: { kind: 'condition', label: 'Contre une créature de taille colossale', activeByDefault: false },
      },
    ]);
    expect(mods(character).def).toBeUndefined();

    const grande: Character = { ...character, effectToggles: { ...character.effectToggles, [R6]: [true, false, false] } };
    expect(mods(grande).def).toBe(1);
    const enorme: Character = { ...character, effectToggles: { ...character.effectToggles, [R6]: [false, true, false] } };
    expect(mods(enorme).def).toBe(2);
    const colossale: Character = { ...character, effectToggles: { ...character.effectToggles, [R6]: [false, false, true] } };
    expect(mods(colossale).def).toBe(3);
  });

  it("r7 Pieds d'argile : verbatim + tag data-only (invalidating-attack), aucun effet actif", () => {
    expect(featureById.get(R7)?.effects).toBeUndefined();
    expect(featureById.get(R7)?.situationalEffectIds).toEqual(['invalidating-attack']);
    expect(featureById.get(R7)?.text).toContain("ralentie au prochain round et invalide");
  });

  it('r8 Tueur de géants : 3 dés bonus DM situationnels par taille (patron Chasseur émérite), richText balisé', () => {
    expect(featureById.get(R8)?.effects).toEqual([
      {
        kind: 'weapon-damage-bonus',
        dice: { count: 1, die: 'd6' },
        condition: { label: 'contre une créature de taille grande' },
        situational: true,
      },
      {
        kind: 'weapon-damage-bonus',
        dice: { count: 1, die: 'd4', evolving: true },
        condition: { label: 'contre une créature de taille énorme' },
        situational: true,
      },
      {
        kind: 'weapon-damage-bonus',
        dice: { count: 2, die: 'd4', evolving: true },
        condition: { label: 'contre une créature de taille colossale' },
        situational: true,
      },
    ]);

    const epeeLongue = equipmentById.get('epee-longue') as Weapon;
    const bonuses = weaponDamageBonuses(character, 'melee', epeeLongue);
    expect(bonuses.situational).toEqual([
      expect.objectContaining({ conditionLabel: 'contre une créature de taille grande', dice: { count: 1, die: 'd6' } }),
      expect.objectContaining({ conditionLabel: 'contre une créature de taille énorme' }),
      expect.objectContaining({ conditionLabel: 'contre une créature de taille colossale' }),
    ]);

    const richText = featureById.get(R8)!.richText!;
    expect(richText).toContain('{1d6}');
    expect(richText).toContain('{1d4°}');
    expect(richText).toContain('{2d4°}');
    assertNoLeakedTokens(richText);
  });
});
