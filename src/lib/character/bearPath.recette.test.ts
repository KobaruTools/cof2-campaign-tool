/**
 * PER-74 — voie de l'ours (p. 151-152, 10ᵉ voie COMBATTANT), recette end-to-end.
 *
 * r4 Caractère d'ours : +5 intimidation permanent (`test-bonus`) + compteur 1×/combat sur le grondement
 * (fuite forcée laissée verbatim, aucun `inflictableStates` — un seul état, le compteur suffit déjà).
 * r5 Hibernation : verbatim seul. r6 Métamorphose : `creatureProfile.transformation` (patron Loup du
 * lycanthrope / Drake du chevalier dragon) + `abilityOverrides` SET sur AGI/CON/FOR/PER/CHA ; INT
 * inchangée ; VOL+2 en écart RAW assumé (delta non exprimable par `abilityOverrides`, qui n'admet
 * qu'une surcharge ABSOLUE) mais correctement affiché sur la mini-fiche (`abilitiesFromMaster`, qui
 * gère nativement les deltas). r7 Étreinte de l'ours : verbatim + richText balisé, compteur 1×/combat.
 * r8 Métamorphose supérieure : REMPLACE la cadence/durée de r6 via `usageCounter.conditionalFrequency`
 * (patron Cape d'ombre/Manteau d'ombre) — pas une 2ᵉ forme distincte (arbitrage propriétaire).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { featureById, pathById } from '@/data';
import { migrateCharacter } from '@/lib/engine/migrations';
import {
  activeAbilityOverrideSources,
  activeFeatureIdsForMods,
  capacityResourceGauges,
  effectContext,
  effectiveAbilities,
  effectiveUsageResetOn,
  testBonusSources,
} from '@/lib/character/effects';
import { displayCreatureProfile, listCompanions } from '@/lib/character/companions';
import { resolveCreatureAbilities } from '@/lib/ui/creature';
import { parseRichText } from '@/lib/ui/featureRichText';
import type { Character } from '@/lib/character/types';

const PATH_ID = 'prestige-ours';
const R4 = `${PATH_ID}-r4`;
const R5 = `${PATH_ID}-r5`;
const R6 = `${PATH_ID}-r6`;
const R7 = `${PATH_ID}-r7`;
const R8 = `${PATH_ID}-r8`;

function loadFixture(name: string): Character {
  const raw = JSON.parse(readFileSync(join(process.cwd(), 'examples/characters', `${name}.json`), 'utf8'));
  return migrateCharacter(raw);
}

describe('PER-74 — voie de l’ours (p. 151-152, recette end-to-end)', () => {
  const character = loadFixture('recette-per74-ours');
  const bearOn: Character = { ...character, effectToggles: { [R6]: [true] } };

  it('voie de prestige de la famille des combattants, sans prérequis, avec sa note RP', () => {
    const path = pathById.get(PATH_ID)!;
    expect(path.type).toBe('prestige');
    expect('category' in path && path.category).toBe('fighter');
    expect(path.sourcePage).toBe(151);
    expect('prerequisites' in path && path.prerequisites).toBe('');
    expect('note' in path && path.note).toMatch(/philosophie/);
  });

  it("r4 Caractère d'ours : +5 intimidation permanent, compteur 1×/combat, aucun marqueur d'état", () => {
    expect(featureById.get(R4)?.effects).toEqual([{ kind: 'test-bonus', domains: ['intimidation'], value: 5 }]);
    expect(featureById.get(R4)?.usageCounter).toEqual({ max: 1, resetOn: 'short-rest', hideFromStatusPanel: true });
    expect(featureById.get(R4)?.inflictableStates).toBeUndefined();
    const bonuses = testBonusSources(activeFeatureIdsForMods(character), effectContext(character));
    const source = bonuses.find((t) => t.domain === 'intimidation')?.sources.find((s) => s.featureId === R4);
    expect(source?.value).toBe(5);
  });

  it('r4 : la fuite forcée reste balisée en dé (rounds), sans retomber en littéral', () => {
    const dice = parseRichText(featureById.get(R4)!.richText!).filter((s) => s.kind === 'die');
    expect(dice).toHaveLength(1);
    expect(dice[0]).toMatchObject({ token: { count: 1, die: 'd4', evolving: false } });
  });

  it('r5 Hibernation : verbatim seul, rien à chiffrer', () => {
    expect(featureById.get(R5)?.effects).toBeUndefined();
    expect(featureById.get(R5)?.usageCounter).toBeUndefined();
    expect(featureById.get(R5)?.richText).toBeUndefined();
  });

  it('r6 Métamorphose : forme inactive → aucune surcharge, caractéristiques inchangées', () => {
    expect(effectiveAbilities(character).FOR).toBe(3);
    expect(activeAbilityOverrideSources(character)).toEqual({});
  });

  it('r6 : forme active → AGI/CON/FOR/PER/CHA imposées (SET absolu, pas un delta)', () => {
    const eff = effectiveAbilities(bearOn);
    expect(eff.AGI).toBe(1);
    expect(eff.CON).toBe(6);
    expect(eff.FOR).toBe(6);
    expect(eff.PER).toBe(2);
    expect(eff.CHA).toBe(-2);
    const src = activeAbilityOverrideSources(bearOn);
    expect(src.CON).toMatchObject({ featureId: R6, value: 6, name: 'Métamorphose' });
  });

  it('r6 : INT reste celle du personnage (« conserve sa propre INT »)', () => {
    expect(effectiveAbilities(bearOn).INT).toBe(character.abilities.INT);
  });

  it('r6 : écart RAW assumé — VOL+2 ne se répercute PAS sur le reste de la fiche (aucune primitive de delta gated)', () => {
    expect(effectiveAbilities(bearOn).VOL).toBe(character.abilities.VOL);
  });

  it('r6 : la mini-fiche affiche correctement VOL+2 (abilitiesFromMaster gère les deltas, contrairement à abilityOverrides)', () => {
    const profile = displayCreatureProfile(featureById.get(R6)!, character)!;
    expect(profile.name).toBe('Ours');
    expect(profile.transformation).toBe(true);
    expect(profile.bonusDieAbilities).toEqual(['CON']);
    const resolved = resolveCreatureAbilities(profile, character.abilities)!;
    expect(resolved).toMatchObject({ FOR: 6, AGI: 1, CON: 6, PER: 2, CHA: -2 });
    expect(resolved.INT).toBe(character.abilities.INT);
    expect(resolved.VOL).toBe(character.abilities.VOL + 2);
  });

  it('r6 : transformation → EXCLUE de la section Compagnons (le personnage PREND la forme)', () => {
    expect(listCompanions(bearOn)).toHaveLength(0);
    expect(listCompanions(character)).toHaveLength(0);
  });

  it('r6/r8 : R8 REMPLACE la cadence de R6 (conditionalFrequency), pas un 2ᵉ usage distinct', () => {
    const counter = featureById.get(R6)!.usageCounter!;
    expect(counter).toMatchObject({ max: 1, resetOn: 'day' });
    const withoutR8 = character.featureIds.filter((id) => id !== R8);
    expect(effectiveUsageResetOn(counter, withoutR8)).toBe('day');
    expect(effectiveUsageResetOn(counter, character.featureIds)).toBe('short-rest');
    expect(featureById.get(R8)?.effects).toBeUndefined();
    expect(featureById.get(R8)?.usageCounter).toBeUndefined();
  });

  it('r8 : le dé de durée reste une FORMULE ([1d6+CON]), pas un dé bare — même patron que les durées existantes', () => {
    const dice = parseRichText(featureById.get(R8)!.richText!).filter((s) => s.kind === 'die');
    expect(dice).toHaveLength(0);
    expect(featureById.get(R8)!.richText).toContain('[1d6 + CON] heures');
  });

  it("r7 Étreinte de l'ours : compteur 1×/combat, DM balisé, opposition de FOR laissée verbatim", () => {
    expect(featureById.get(R7)?.usageCounter).toEqual({ max: 1, resetOn: 'short-rest', hideFromStatusPanel: true });
    expect(featureById.get(R7)?.effects).toBeUndefined();
    const segments = parseRichText(featureById.get(R7)!.richText!);
    const leaked = segments
      .filter((x): x is { kind: 'text'; value: string } => x.kind === 'text')
      .some((x) => /[{[]/.test(x.value));
    expect(leaked).toBe(false);
    expect(featureById.get(R7)!.richText).toContain('[2d4° + FOR] DM');
  });

  it('la voie ne remonte aucune jauge dans « État du personnage »', () => {
    const gauges = capacityResourceGauges(character);
    expect(gauges.every((g) => !g.key.startsWith(PATH_ID))).toBe(true);
  });
});
