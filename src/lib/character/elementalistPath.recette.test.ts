/**
 * PER-74 — voie de l'élémentaliste (p. 157, 4ᵉ voie MAGE dans l'ordre du livre), recette end-to-end.
 *
 * R4 Élément de prédilection : choix PERMANENT (patron EXACT Ascendance draconique, sang-dragon-r4)
 * parmi feu/froid/électricité/acide — pilote le SCOPE de la RD de r5 (cross-capacité,
 * `elementFromChoice`/`scopeFromElement`). Le bonus d'attaque magique +2 / malus de résistance +2
 * restent VERBATIM : pas de primitive de bonus d'attaque de SORT scopée par type de dégâts
 * (`AttackBonusEffect` ne couvre que les armes). R5 Résistance élémentaire : RD ÷2 scopée, échange
 * de sort en action gratuite verbatim. R6 Invocation d'élémentaire : mini-fiche structurée (patron
 * Invocation d'un démon, sorcier demon-r5) + marqueur d'invocation. R7 Élément puissant : verbatim
 * (même écart que r4, pas de primitive de bonus de DM de sort). R8 Métamorphose élémentaire :
 * RD 5 déjà mécanisée (PER-137, commit antérieur f06ab60) — non retouchée ici.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { featureById, pathById } from '@/data';
import { migrateCharacter } from '@/lib/engine/migrations';
import { damageReductionSources } from '@/lib/character/effects';
import { checkCompliance } from '@/lib/engine/legality';
import { rulesContext } from '@/lib/character/rulesContext';
import type { Character } from '@/lib/character/types';

const PATH_ID = 'prestige-elementaliste';
const R4 = `${PATH_ID}-r4`;
const R5 = `${PATH_ID}-r5`;
const R6 = `${PATH_ID}-r6`;
const R7 = `${PATH_ID}-r7`;
const R8 = `${PATH_ID}-r8`;

function loadFixture(name: string): Character {
  const raw = JSON.parse(readFileSync(join(process.cwd(), 'examples/characters', `${name}.json`), 'utf8'));
  return migrateCharacter(raw);
}

describe("PER-74 — voie de l'élémentaliste (p. 157, recette end-to-end)", () => {
  const character = loadFixture('recette-per74-elementaliste');

  it('voie de prestige de la catégorie mage, sans prérequis', () => {
    const path = pathById.get(PATH_ID)!;
    expect(path.type).toBe('prestige');
    expect('category' in path && path.category).toBe('mage');
    expect(path.sourcePage).toBe(157);
    expect('prerequisites' in path && path.prerequisites).toBe('');
  });

  it('aucune anomalie de conformité sur le fixture (compliance propre)', () => {
    expect(checkCompliance(character, rulesContext)).toEqual([]);
  });

  it('r4 Élément de prédilection : choix option permanent parmi feu/froid/électricité/acide', () => {
    const r4 = featureById.get(R4)!;
    expect(r4.choices).toEqual([
      {
        kind: 'option',
        prompt: 'Élément de prédilection',
        options: [
          { id: 'fire', label: 'Feu' },
          { id: 'cold', label: 'Froid' },
          { id: 'lightning', label: 'Électricité' },
          { id: 'acid', label: 'Acide' },
        ],
      },
    ]);
    expect(r4.effects).toBeUndefined();
  });

  it('r5 Résistance élémentaire : RD ÷2 scopée sur l’élément retenu au rang 4 (cross-capacité)', () => {
    const r5 = featureById.get(R5)!;
    expect(r5.elementFromChoice).toEqual({ choiceFeatureId: R4, choiceIndex: 0 });
    expect(r5.damageReduction).toEqual({ kind: 'divide', value: 2, scopeFromElement: true });

    const drs = damageReductionSources(character);
    const resistance = drs.find((d) => d.featureId === R5);
    expect(resistance?.reduction).toMatchObject({ kind: 'divide', value: 2, scopes: ['fire'] });
  });

  it('r5 : sans élément de prédilection choisi, la RD disparaît (pas de repli, comme sang-dragon)', () => {
    const sansChoix: Character = { ...character, featureIds: [R5], featureChoices: {} };
    expect(damageReductionSources(sansChoix).find((d) => d.featureId === R5)).toBeUndefined();
  });

  it("r6 Invocation d'élémentaire : mini-fiche structurée (Coup sur l'attaque magique du maître) + marqueur d'invocation", () => {
    const r6 = featureById.get(R6)!;
    expect(r6.creatureProfile).toMatchObject({
      name: 'Élémentaire',
      companionType: 'summon',
      size: 'grande',
      defense: '19',
      hitPoints: '[=niveau × 5]',
      initiative: '10',
      attack: { fromMaster: 'magicAttack', damage: '2d4°+6' },
    });
    expect(r6.creatureProfile?.specialAbilities).toHaveLength(4);
    expect(r6.effects).toEqual([
      {
        kind: 'conditional-stat-bonus',
        bonuses: [],
        activation: { kind: 'temporary', label: 'Élémentaire invoqué', activeByDefault: false },
      },
    ]);
  });

  it('r7 Élément puissant : verbatim seul (aucun effet chiffré — pas de primitive de bonus de DM de sort)', () => {
    const r7 = featureById.get(R7)!;
    expect(r7.effects).toBeUndefined();
    expect(r7.text).toContain('+1d4');
  });

  it('r8 Métamorphose élémentaire : RD 5 déjà mécanisée (PER-137), inchangée', () => {
    const r8 = featureById.get(R8)!;
    expect(r8.damageReduction).toEqual({ kind: 'flat', value: 5 });
  });
});
