import { describe, expect, it } from 'vitest';
import { rulesContext } from './rulesContext';
import { createBlankCharacter } from './factory';
import type { Character, EquipmentLine } from './types';
import { armorRestrictionViolations } from './armorRestrictions';

const ctx = rulesContext;

function makeChar(over: Partial<Character>): Character {
  return {
    ...createBlankCharacter({ now: '2026-01-01T00:00:00.000Z' }),
    ancestryId: 'humain',
    ancestryPathId: 'humain',
    ...over,
  };
}

const wornArmor = (itemId: string): EquipmentLine => ({ itemId, quantity: 1, worn: { slot: 'armor' } });
const wornShield = (itemId: string): EquipmentLine => ({ itemId, quantity: 1, worn: { slot: 'shield' } });

describe('armorRestrictionViolations — armure', () => {
  it('signale une armure plus lourde que le plafond du profil (guerrier / plaque)', () => {
    const guerrier = makeChar({ classId: 'guerrier', equipment: [wornArmor('armure-de-plaques')] });
    const violations = armorRestrictionViolations(guerrier, ctx);
    expect(violations.some((v) => v.kind === 'armor-too-heavy')).toBe(true);
  });

  it('accepte une armure au plafond exact (guerrier / cotte de mailles)', () => {
    const guerrier = makeChar({ classId: 'guerrier', equipment: [wornArmor('cotte-de-mailles')] });
    expect(armorRestrictionViolations(guerrier, ctx)).toHaveLength(0);
  });

  it('accepte une armure plus légère que le plafond (guerrier / cuir simple)', () => {
    const guerrier = makeChar({ classId: 'guerrier', equipment: [wornArmor('cuir-simple')] });
    expect(armorRestrictionViolations(guerrier, ctx)).toHaveLength(0);
  });

  it("ne signale rien quand aucune armure n'est portée", () => {
    const magicien = makeChar({ classId: 'magicien' });
    expect(armorRestrictionViolations(magicien, ctx)).toHaveLength(0);
  });

  it('un profil sans armure autorisée (magicien) signale toute armure portée', () => {
    const magicien = makeChar({ classId: 'magicien', equipment: [wornArmor('cuir-simple')] });
    expect(armorRestrictionViolations(magicien, ctx).some((v) => v.kind === 'armor-too-heavy')).toBe(true);
  });

  it('la maîtrise d’un autre profil (≥ 2 rangs) relève le plafond de port (p. 177/180)', () => {
    // Barbare (plafond cuir renforcé, DEF +3) ayant investi 2 rangs de guerrier
    // (voie du combat) : il maîtrise le guerrier → peut porter la cotte de mailles.
    const barbareGuerrier = makeChar({
      classId: 'barbare',
      featureIds: ['combat-r1', 'combat-r2'],
      equipment: [wornArmor('cotte-de-mailles')],
    });
    expect(armorRestrictionViolations(barbareGuerrier, ctx)).toHaveLength(0);
    // Sans ces rangs, la même cotte dépasse le plafond du barbare (contrôle).
    const barbareSeul = makeChar({ classId: 'barbare', equipment: [wornArmor('cotte-de-mailles')] });
    expect(armorRestrictionViolations(barbareSeul, ctx).some((v) => v.kind === 'armor-too-heavy')).toBe(true);
  });

  it('Tour de force (brute-r2) relève le plafond du barbare à la chemise de mailles (PER-81)', () => {
    // Barbare (plafond cuir renforcé, DEF +3) portant une chemise de mailles (DEF +4) :
    // interdit par défaut, autorisé dès l'acquisition de Tour de force (brute-r1 puis brute-r2).
    const sansRang = makeChar({ classId: 'barbare', equipment: [wornArmor('chemise-de-mailles')] });
    expect(armorRestrictionViolations(sansRang, ctx).some((v) => v.kind === 'armor-too-heavy')).toBe(true);
    const avecRang = makeChar({
      classId: 'barbare',
      featureIds: ['brute-r1', 'brute-r2'],
      equipment: [wornArmor('chemise-de-mailles')],
    });
    expect(armorRestrictionViolations(avecRang, ctx)).toHaveLength(0);
    // Mais Tour de force seul ne débloque PAS la cotte de mailles (DEF +5).
    const cotte = makeChar({
      classId: 'barbare',
      featureIds: ['brute-r1', 'brute-r2'],
      equipment: [wornArmor('cotte-de-mailles')],
    });
    expect(armorRestrictionViolations(cotte, ctx).some((v) => v.kind === 'armor-too-heavy')).toBe(true);
  });

  it('Briseur d’os (brute-r5) relève le plafond du barbare à la cotte de mailles (PER-81)', () => {
    const barbare = makeChar({
      classId: 'barbare',
      featureIds: ['brute-r1', 'brute-r2', 'brute-r3', 'brute-r4', 'brute-r5'],
      equipment: [wornArmor('cotte-de-mailles')],
    });
    expect(armorRestrictionViolations(barbare, ctx)).toHaveLength(0);
    // La plaque (DEF +6) reste hors de portée, même avec Briseur d'os.
    const plaque = makeChar({
      classId: 'barbare',
      featureIds: ['brute-r1', 'brute-r2', 'brute-r3', 'brute-r4', 'brute-r5'],
      equipment: [wornArmor('armure-de-plaques')],
    });
    expect(armorRestrictionViolations(plaque, ctx).some((v) => v.kind === 'armor-too-heavy')).toBe(true);
  });

  it('Autorité naturelle (noblesse-r3) débloque la plaque complète du chevalier (PER-81)', () => {
    // Plaque complète (DEF +7) au-delà du plafond chevalier (plaque, DEF +6) sans le rang.
    const sansRang = makeChar({ classId: 'chevalier', equipment: [wornArmor('plaque-complete')] });
    expect(armorRestrictionViolations(sansRang, ctx).some((v) => v.kind === 'armor-too-heavy')).toBe(true);
    const avecRang = makeChar({
      classId: 'chevalier',
      featureIds: ['noblesse-r1', 'noblesse-r2', 'noblesse-r3'],
      equipment: [wornArmor('plaque-complete')],
    });
    expect(armorRestrictionViolations(avecRang, ctx)).toHaveLength(0);
  });

  it('une armure personnalisée portée est ignorée (stats inconnues du moteur)', () => {
    const magicien = makeChar({
      classId: 'magicien',
      equipment: [{ custom: true, name: 'Armure de fortune', quantity: 1, worn: { slot: 'armor' } }],
    });
    expect(armorRestrictionViolations(magicien, ctx)).toHaveLength(0);
  });
});

describe('armorRestrictionViolations — bouclier', () => {
  it('un profil sans accès bouclier (magicien) signale tout bouclier porté (p. 188)', () => {
    const magicien = makeChar({ classId: 'magicien', equipment: [wornShield('petit-bouclier')] });
    expect(armorRestrictionViolations(magicien, ctx).some((v) => v.kind === 'shield-not-allowed')).toBe(true);
  });

  it('un accès « petit bouclier » (druide) signale un grand bouclier porté', () => {
    const druide = makeChar({ classId: 'druide', equipment: [wornShield('grand-bouclier')] });
    expect(armorRestrictionViolations(druide, ctx).some((v) => v.kind === 'shield-not-allowed')).toBe(true);
  });

  it('un accès « petit bouclier » (druide) accepte un petit bouclier', () => {
    const druide = makeChar({ classId: 'druide', equipment: [wornShield('petit-bouclier')] });
    expect(armorRestrictionViolations(druide, ctx).some((v) => v.kind === 'shield-not-allowed')).toBe(false);
  });

  it('un accès « tous boucliers » (guerrier) accepte le grand bouclier', () => {
    const guerrier = makeChar({ classId: 'guerrier', equipment: [wornShield('grand-bouclier')] });
    expect(armorRestrictionViolations(guerrier, ctx).some((v) => v.kind === 'shield-not-allowed')).toBe(false);
  });
});
