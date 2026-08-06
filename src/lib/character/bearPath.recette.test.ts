/**
 * PER-74 — voie de l'ours (p. 151-152, 10ᵉ voie COMBATTANT), recette end-to-end.
 *
 * r4 Caractère d'ours : +5 intimidation permanent (`test-bonus`) + compteur 1×/combat sur le grondement ;
 * la fuite forcée est cataloguée en effet SITUATIONNEL `frightened` (retour propriétaire : suivable à
 * l'écran de MJ). r5 Hibernation : verbatim seul. r6 Métamorphose : `creatureProfile.transformation`
 * (patron Loup du lycanthrope / Drake du chevalier dragon) + `abilityOverrides` SET sur AGI/CON/FOR/PER/
 * CHA ; INT inchangée ; VOL+2 en écart RAW assumé (delta non exprimable par `abilityOverrides`, qui
 * n'admet qu'une surcharge ABSOLUE) mais correctement affiché sur la mini-fiche (`abilitiesFromMaster`,
 * qui gère nativement les deltas). Retour propriétaire mécanisé : (a) plafond d'armure PROPRE À CETTE
 * CAPACITÉ (`Feature.maxArmorId`, mirroir de `Path.maxArmorId` mais à la granularité du rang — R4/R5/R7/
 * R8 restent utilisables en armure lourde) ; (b) « ne peut plus utiliser ses capacités de profil » —
 * `disablesProfileFeatures` désactive dynamiquement toute voie de type 'class' possédée tant que la
 * forme est active (grisage ET exclusion réelle des mods actifs). r7 Étreinte de l'ours : verbatim +
 * richText balisé, compteur 1×/combat. r8 Métamorphose supérieure : REMPLACE la cadence/durée de r6 via
 * `usageCounter.conditionalFrequency` (patron Cape d'ombre/Manteau d'ombre) — pas une 2ᵉ forme distincte.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { featureById, pathById } from '@/data';
import { SITUATIONAL_EFFECTS } from '@/data/schema';
import { migrateCharacter } from '@/lib/engine/migrations';
import {
  activeAbilityOverrideSources,
  activeFeatureIdsForMods,
  capacityResourceGauges,
  disabledFeatureReasons,
  effectContext,
  effectiveAbilities,
  effectiveUsageResetOn,
  profileFeaturesDisabledByTransformation,
  testBonusSources,
} from '@/lib/character/effects';
import { pathArmorDisabledFeatureIds, pathArmorDisabledReasons } from '@/lib/character/armorRestrictions';
import { rulesContext } from '@/lib/character/rulesContext';
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

  it("r4 : la fuite forcée est cataloguée en effet situationnel 'frightened' (retour propriétaire)", () => {
    expect(featureById.get(R4)?.situationalEffectIds).toEqual(['frightened']);
    expect(SITUATIONAL_EFFECTS.frightened).toMatchObject({ label: 'Effrayé', sourcePage: 151 });
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

  it("r6 : plafond d'armure PROPRE à cette capacité (cuir renforcé max), pas à toute la voie", () => {
    expect(featureById.get(R6)?.maxArmorId).toBe('cuir-renforce-broigne');
    const plateWorn: Character = {
      ...character,
      equipment: [...character.equipment, { itemId: 'armure-de-plaques', quantity: 1, worn: { slot: 'armor' } }],
    };
    const disabled = pathArmorDisabledFeatureIds(plateWorn, rulesContext);
    expect(disabled.has(R6)).toBe(true);
    expect(disabled.has(R4)).toBe(false);
    expect(disabled.has(R7)).toBe(false);
    expect(pathArmorDisabledReasons(plateWorn, rulesContext).get(R6)).toContain('cette capacité');
  });

  it("r6 : armure de plaques + interrupteur allumé → la forme ne s'applique PAS (surcharge inerte)", () => {
    const plateBearOn: Character = {
      ...character,
      equipment: [...character.equipment, { itemId: 'armure-de-plaques', quantity: 1, worn: { slot: 'armor' } }],
      effectToggles: { [R6]: [true] },
    };
    expect(activeAbilityOverrideSources(plateBearOn)).toEqual({});
    expect(effectiveAbilities(plateBearOn).FOR).toBe(character.abilities.FOR);
  });

  it("r6 : « ne peut plus utiliser ses capacités de profil » → toute la voie du combat (profil) désactivée", () => {
    expect(profileFeaturesDisabledByTransformation(character).size).toBe(0);
    const disabled = profileFeaturesDisabledByTransformation(bearOn);
    for (const id of ['combat-r1', 'combat-r2', 'combat-r3', 'combat-r4', 'combat-r5']) {
      expect(disabled.has(id)).toBe(true);
    }
    // La voie de PRESTIGE (l'ours elle-même) n'est jamais visée : ce n'est pas une voie de profil.
    expect(disabled.has(R4)).toBe(false);
    expect(disabled.has(R6)).toBe(false);
    expect(disabled.has(R7)).toBe(false);
  });

  it('r6 : grisage UI ET exclusion réelle des mods actifs (pas seulement visuel)', () => {
    const reasons = disabledFeatureReasons(bearOn);
    expect(reasons.get('combat-r1')).toMatchObject({ byFeatureId: R6, kind: 'transformed' });
    expect(activeFeatureIdsForMods(bearOn)).not.toContain('combat-r1');
    // Contrôle : forme éteinte → la voie du combat reste pleinement active.
    expect(activeFeatureIdsForMods(character)).toContain('combat-r1');
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
