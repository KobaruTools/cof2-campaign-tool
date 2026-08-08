/**
 * PER-74 — voie des cristaux (p. 156, catégorie MAGE), recette end-to-end.
 *
 * Mécanisme à DEUX couches, inédit dans le projet (ni le patron des familiers — un seul choix
 * simple — ni celui des choix `option` répétables — `repeat`, progression dynamique — ne
 * convenait) : cristaux APPRIS (`Character.featureChoices` sur r4-r8, 1/1/2/2/3 slots `option`
 * simples, permanents) vs cristaux ACTIFS (`Character.activeCrystalIds`, état de jeu dynamique,
 * plafonné par le rang atteint mais jamais bloqué — fiche permissive, cf. `crystalOverCapWarning`).
 * Voir `src/data/crystals.ts` (catalogue des 14 cristaux) et `src/lib/character/crystals.ts`
 * (couche pure appris/actif/bonus). Résistance typée (Noir fumé, Orange) et régénération (Blanc
 * laiteux) restent PUREMENT DESCRIPTIVES (le moteur ne consomme pas la RD, cf. `DamageReduction`) ;
 * Irisé et Translucide sont narratifs, sans effet chiffré.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { featureById, pathById } from '@/data';
import { CRYSTALS, crystalById } from '@/data/crystals';
import { migrateCharacter } from '@/lib/engine/migrations';
import { checkCompliance } from '@/lib/engine/legality';
import { rulesContext } from '@/lib/character/rulesContext';
import {
  activeKnownCrystals,
  crystalAbilityBonuses,
  crystalOverCapWarning,
  crystalStatBonuses,
  isCrystalActive,
  knownCrystalIds,
  maxActiveCrystals,
  toggleCrystalActive,
} from '@/lib/character/crystals';
import { effectiveAbilities } from '@/lib/character/effects';
import type { Character } from '@/lib/character/types';

const PATH_ID = 'prestige-cristaux';
const R4 = `${PATH_ID}-r4`;
const R5 = `${PATH_ID}-r5`;
const R6 = `${PATH_ID}-r6`;
const R7 = `${PATH_ID}-r7`;
const R8 = `${PATH_ID}-r8`;

function loadFixture(name: string): Character {
  const raw = JSON.parse(readFileSync(join(process.cwd(), 'examples/characters', `${name}.json`), 'utf8'));
  return migrateCharacter(raw);
}

describe('PER-74 — voie des cristaux (p. 156, catalogue)', () => {
  it('14 cristaux, tous avec couleur/forme/effet, ids uniques', () => {
    expect(CRYSTALS).toHaveLength(14);
    const ids = new Set(CRYSTALS.map((c) => c.id));
    expect(ids.size).toBe(14);
    for (const c of CRYSTALS) {
      expect(c.color.length).toBeGreaterThan(0);
      expect(c.shape.length).toBeGreaterThan(0);
      expect(c.effectText.length).toBeGreaterThan(0);
    }
  });

  it('6 cristaux à bonus d\'habileté, 2 à bonus de stat dérivée + 1 triple attaque, 2 à résistance, 1 régén., 2 narratifs', () => {
    const abilityBonus = CRYSTALS.filter((c) => c.abilityBonus);
    const statBonus = CRYSTALS.filter((c) => c.statBonuses?.length);
    const resistance = CRYSTALS.filter((c) => c.resistance);
    const regen = CRYSTALS.filter((c) => c.regenPerHour);
    const narrative = CRYSTALS.filter(
      (c) => !c.abilityBonus && !c.statBonuses?.length && !c.resistance && !c.regenPerHour,
    );
    expect(abilityBonus).toHaveLength(6);
    expect(statBonus).toHaveLength(3); // bleu nuit (init), rose laiteux (def), vert pâle (triple attaque)
    expect(resistance).toHaveLength(2);
    expect(regen).toHaveLength(1);
    expect(narrative).toHaveLength(2); // irisé, translucide
    // Vert pâle : les trois jets d'attaque (pas seulement l'un des trois).
    const vertPale = crystalById.get('cristal-vert-pale')!;
    expect(vertPale.statBonuses).toEqual([
      { stat: 'meleeAttack', value: 1 },
      { stat: 'rangedAttack', value: 1 },
      { stat: 'magicAttack', value: 1 },
    ]);
  });
});

describe('PER-74 — voie des cristaux (p. 156, capacités + choix)', () => {
  it('voie de prestige de la famille des mages, sans prérequis', () => {
    const path = pathById.get(PATH_ID)!;
    expect(path.type).toBe('prestige');
    expect('category' in path && path.category).toBe('mage');
    expect(path.sourcePage).toBe(156);
    expect('prerequisites' in path && path.prerequisites).toBe('');
  });

  it.each([
    [R4, 1],
    [R5, 1],
    [R6, 2],
    [R7, 2],
    [R8, 3],
  ])('%s porte %d slot(s) de choix « cristal appris », options = catalogue complet', (featureId, slotCount) => {
    const f = featureById.get(featureId)!;
    expect(f.choices).toHaveLength(slotCount);
    for (const choice of f.choices!) {
      expect(choice.kind).toBe('option');
      expect(choice.kind === 'option' && choice.options).toHaveLength(14);
      expect(choice.kind === 'option' && choice.repeat).toBeUndefined();
    }
  });

  it('r4-r8 restent verbatim (aucun effet chiffré porté par la capacité elle-même)', () => {
    for (const id of [R4, R5, R6, R7, R8]) {
      expect(featureById.get(id)!.effects).toBeUndefined();
    }
  });
});

describe('PER-74 — voie des cristaux (p. 156, recette end-to-end)', () => {
  const character = loadFixture('recette-per74-cristaux');

  it('aucune anomalie de conformité sur le fixture (compliance propre)', () => {
    expect(checkCompliance(character, rulesContext)).toEqual([]);
  });

  it('9 cristaux APPRIS (1+1+2+2+3), dédoublonnés', () => {
    const known = knownCrystalIds(character);
    expect(known).toHaveLength(9);
    expect(new Set(known).size).toBe(9);
  });

  it('rang 8 atteint → 5 cristaux activables simultanément', () => {
    expect(maxActiveCrystals(character)).toBe(5);
  });

  it('5 cristaux ACTIFS sur le fixture, conformes à la limite (aucun avertissement)', () => {
    expect(activeKnownCrystals(character)).toHaveLength(5);
    expect(crystalOverCapWarning(character)).toBeNull();
  });

  it('seuls les cristaux ACTIFS comptent dans les bonus (les 4 appris-mais-inactifs sont ignorés)', () => {
    expect(isCrystalActive(character, 'cristal-bleu-nuit')).toBe(true);
    expect(isCrystalActive(character, 'cristal-bleu-incandescent')).toBe(false); // appris (r6), non activé
    expect(crystalAbilityBonuses(character)).toEqual({ CHA: 1, AGI: 1 });
    expect(crystalStatBonuses(character)).toEqual({
      initiative: 5,
      def: 2,
      meleeAttack: 1,
      rangedAttack: 1,
      magicAttack: 1,
    });
  });

  it("les bonus d'habileté actifs se retrouvent dans les caractéristiques EFFECTIVES du personnage", () => {
    const abilities = effectiveAbilities(character);
    expect(abilities.CHA).toBe(character.abilities.CHA + 1); // cristal violet actif
    expect(abilities.AGI).toBe(character.abilities.AGI + 1); // cristal rose vif actif
    expect(abilities.FOR).toBe(character.abilities.FOR); // cristal bleu pâle APPRIS mais pas actif
  });

  it('activer un cristal APPRIS non actif l\'ajoute (idempotent), désactiver le retire', () => {
    const patch = toggleCrystalActive(character, 'cristal-bleu-pale', true);
    expect(patch.activeCrystalIds).toContain('cristal-bleu-pale');
    expect(patch.activeCrystalIds).toHaveLength(6);
    const idempotent = toggleCrystalActive({ ...character, activeCrystalIds: patch.activeCrystalIds }, 'cristal-bleu-pale', true);
    expect(idempotent.activeCrystalIds).toHaveLength(6);
    const off = toggleCrystalActive(character, 'cristal-bleu-nuit', false);
    expect(off.activeCrystalIds).not.toContain('cristal-bleu-nuit');
    expect(off.activeCrystalIds).toHaveLength(4);
  });

  it('dépassement de la limite d\'activation (édition manuelle) : avertissement non bloquant, pas de blocage', () => {
    const overCapped: Character = {
      ...character,
      activeCrystalIds: [...knownCrystalIds(character)], // les 9 appris, tous activés
    };
    expect(crystalOverCapWarning(overCapped)).toMatch(/9 cristaux activés.*limite de 5/);
    // Non bloquant : les bonus des 9 comptent quand même (aucune troncature silencieuse).
    expect(activeKnownCrystals(overCapped)).toHaveLength(9);
  });
});
