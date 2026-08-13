/**
 * Non-cumul rage/furie du berserk (p. 82, note « RAGE ET AUTRES CAPACITÉS ») vs les 6 voies citées
 * verbatim (maître d'armes/guerrier, escrime/barde, maîtrise+méditation/moine, spadassin+assassin/
 * voleur), recette end-to-end. Câblé via `RAGE_INCOMPATIBLE_FEATURE_IDS` (`disablesFeatures` sur
 * rage-r3/rage-r5, fighters.ts) + généralisation de `activeFeatureIdsForMods`/`criticalRangeSources`
 * (effects.ts) pour que l'exclusion touche réellement les bonus dérivés, pas seulement le grisage
 * de la carte (jusque-là `disablesFeatures` n'agissait que sur des interrupteurs cibles, jamais sur
 * un `stat-bonus`/`test-bonus`/`criticalRange` permanent — cf. la carte Frappe chirurgicale ci-dessous).
 * Fixture NON RAW-légale par construction (barbare + capacités empruntées des 4 autres profils) —
 * un fixture moteur, pas un personnage de table.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { migrateCharacter } from '@/lib/engine/migrations';
import {
  activeFeatureIdsForMods,
  criticalRangeSources,
  disabledFeatureReasons,
  effectContext,
  modsFromFeatures,
  testBonusSources,
} from '@/lib/character/effects';
import type { Character } from '@/lib/character/types';

const TARGET_FEATURE_IDS = [
  'maitre-d-armes-r1', 'maitre-d-armes-r2', 'maitre-d-armes-r3', 'maitre-d-armes-r4', 'maitre-d-armes-r5',
  'escrime-r1', 'escrime-r2', 'escrime-r3', 'escrime-r4', 'escrime-r5',
  'maitrise-r1', 'maitrise-r2', 'maitrise-r3', 'maitrise-r4', 'maitrise-r5',
  'meditation-r1', 'meditation-r2', 'meditation-r3', 'meditation-r4', 'meditation-r5',
  'spadassin-r1', 'spadassin-r2', 'spadassin-r3', 'spadassin-r4', 'spadassin-r5',
  'assassin-r1', 'assassin-r2', 'assassin-r3', 'assassin-r4', 'assassin-r5',
];

function loadFixture(name: string): Character {
  const raw = JSON.parse(readFileSync(join(process.cwd(), 'examples/characters', `${name}.json`), 'utf8'));
  return migrateCharacter(raw);
}

describe('Non-cumul rage/furie du berserk vs 6 voies (p. 82, recette end-to-end)', () => {
  const character = loadFixture('recette-rage-cumul-voies');
  const raging: Character = { ...character, effectToggles: { 'rage-r3': [true] } };
  const furious: Character = { ...character, effectToggles: { 'rage-r5': [true] } };

  it('hors rage/furie, aucune des 30 capacités des 6 voies n’est grisée', () => {
    expect(disabledFeatureReasons(character).size).toBe(0);
  });

  it('Rage du berserk active grise/désactive exactement les 30 capacités', () => {
    const reasons = disabledFeatureReasons(raging);
    expect(reasons.size).toBe(TARGET_FEATURE_IDS.length);
    for (const id of TARGET_FEATURE_IDS) {
      expect(reasons.has(id)).toBe(true);
      expect(reasons.get(id)?.byFeatureId).toBe('rage-r3');
    }
  });

  it('Furie du berserk active grise/désactive aussi les 30 capacités (même liste)', () => {
    const reasons = disabledFeatureReasons(furious);
    expect(reasons.size).toBe(TARGET_FEATURE_IDS.length);
    for (const id of TARGET_FEATURE_IDS) expect(reasons.has(id)).toBe(true);
  });

  it('le bonus de DEF des 6 voies disparaît des stats dérivées pendant la rage', () => {
    const ctxOff = effectContext(character);
    const ctxOn = effectContext(raging);
    const defOff = modsFromFeatures(activeFeatureIdsForMods(character), ctxOff).def ?? 0;
    const defOn = modsFromFeatures(activeFeatureIdsForMods(raging), ctxOn).def ?? 0;
    // Contribution DEF des 30 capacités seules (permanente, hors tout interrupteur de rage).
    const targetDefContribution = modsFromFeatures(TARGET_FEATURE_IDS, ctxOff).def ?? 0;
    expect(targetDefContribution).toBeGreaterThan(0);
    // La rage retire cette contribution ET ajoute son propre malus -2 (rage-r3, DEF pendant la rage).
    expect(defOn).toBe(defOff - targetDefContribution - 2);
  });

  it('le bonus de DEF des 6 voies disparaît aussi pendant la furie (malus -4)', () => {
    const ctxOff = effectContext(character);
    const ctxOn = effectContext(furious);
    const defOff = modsFromFeatures(activeFeatureIdsForMods(character), ctxOff).def ?? 0;
    const defOn = modsFromFeatures(activeFeatureIdsForMods(furious), ctxOn).def ?? 0;
    const targetDefContribution = modsFromFeatures(TARGET_FEATURE_IDS, ctxOff).def ?? 0;
    expect(defOn).toBe(defOff - targetDefContribution - 4);
  });

  it('les bonus de compétence des 6 voies (acrobaties/discrétion) disparaissent pendant la rage', () => {
    const testsOff = testBonusSources(activeFeatureIdsForMods(character), effectContext(character));
    const testsOn = testBonusSources(activeFeatureIdsForMods(raging), effectContext(raging));
    // Acrobaties (maîtrise-r1) et discrétion (assassin-r1) : présents hors rage...
    expect(testsOff.find((b) => b.domain === 'acrobatics')).toBeDefined();
    expect(testsOff.find((b) => b.domain === 'stealth')).toBeDefined();
    // ... absents pendant la rage.
    expect(testsOn.find((b) => b.domain === 'acrobatics')).toBeUndefined();
    expect(testsOn.find((b) => b.domain === 'stealth')).toBeUndefined();
  });

  it('la plage de critique élargie de Frappe chirurgicale (spadassin-r3) disparaît pendant la rage', () => {
    const critOff = criticalRangeSources(character);
    const critOn = criticalRangeSources(raging);
    expect(critOff.find((c) => c.featureId === 'spadassin-r3')).toMatchObject({ scope: 'melee', value: 2 });
    expect(critOn.find((c) => c.featureId === 'spadassin-r3')).toBeUndefined();
  });
});
