/**
 * PER-74 — Voie de prestige du GUERRIER-MAGE (p. 151), 9ᵉ voie de la catégorie COMBATTANT, HYBRIDE
 * (nécessite au moins une voie de combattant ET une voie de mage).
 *
 * Le test charge la RECETTE livrée (`examples/characters/recette-per74-guerrier-mage.json`) — magicien
 * (voie de la magie des arcanes) + 2 rangs de chevalier (Preux, maîtrise de l'armure de plaques),
 * rang 8 acquis dans la voie de prestige.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { migrateCharacter } from '@/lib/engine/migrations';
import { featureById, pathById } from '@/data';
import { rulesContext } from './rulesContext';
import { spellArmorManaSurcharge } from './manaSurcharge';
import { combatRitualDiscount } from './warmagePath';
import { spellManaCost } from '@/lib/engine';
import { buildCharacterDerivedView } from '@/components/sheet/characterDerivedView';
import type { Character } from './types';

const PATH_ID = 'prestige-guerrier-mage';
const R4 = `${PATH_ID}-r4`;
const R5 = `${PATH_ID}-r5`;
const R6 = `${PATH_ID}-r6`;
const R7 = `${PATH_ID}-r7`;
const R8 = `${PATH_ID}-r8`;
const RANKS = [R4, R5, R6, R7, R8];
const SPELL_ID = 'magie-des-arcanes-r1';

const recette = (): Character =>
  migrateCharacter(
    JSON.parse(
      readFileSync(join(process.cwd(), 'examples', 'characters', 'recette-per74-guerrier-mage.json'), 'utf-8'),
    ),
  ) as Character;

describe('PER-74 — Voie du guerrier-mage : données (p. 151)', () => {
  it('la voie est sourcée p. 151, habillée COMBATTANT (rouge), prérequis hybride', () => {
    const path = pathById.get(PATH_ID)!;
    expect(path.sourcePage).toBe(151);
    expect(path.type).toBe('prestige');
    if (path.type !== 'prestige') throw new Error('voie de prestige attendue');
    expect(path.category).toBe('fighter');
    expect(path.prerequisites).toContain('voie de combattant');
    expect(path.prerequisites).toContain('voie de mage');
  });

  it('les 5 rangs sont sourcés p. 151 ; seul r8 porte un balisage (seul rang à contenir un dé)', () => {
    for (const id of RANKS) expect(featureById.get(id)?.sourcePage).toBe(151);
    for (const id of [R4, R5, R6, R7]) expect(featureById.get(id)?.richText).toBeUndefined();
    expect(featureById.get(R8)?.richText).toContain('{1d4°}');
  });

  it('r5 porte un sélecteur known-feature (sorts connus)', () => {
    const choices = featureById.get(R5)?.choices ?? [];
    expect(choices).toHaveLength(1);
    expect(choices[0]).toMatchObject({ kind: 'known-feature', spellsOnly: true });
  });
});

describe('PER-74 — r4 Magie en armure : dispense de surcoût de mana (chiffré)', () => {
  it('sur la recette (rang 8, armure de plaques DEF 6, maîtrisée) : surcoût DISPENSÉ', () => {
    const c = recette();
    const spell = featureById.get(SPELL_ID)!;
    const res = spellArmorManaSurcharge(c, rulesContext, spell);
    expect(res?.wornArmorDef).toBe(6);
    expect(res?.allowanceDef).toBe(0);
    expect(res?.armorMastered).toBe(true);
    expect(res?.surcharge).toBe(0);
    expect(res?.blockedByMastery).toBe(false);
  });

  it('sans le rang 8 (seuil retombe à 5 < DEF 6) : la dispense ne joue plus, surcoût plein', () => {
    const c = recette();
    const withoutR8: Character = { ...c, featureIds: c.featureIds.filter((id) => id !== R8) };
    const res = spellArmorManaSurcharge(withoutR8, rulesContext, featureById.get(SPELL_ID)!);
    expect(res?.surcharge).toBe(6);
  });
});

describe('PER-74 — r5 Rituel de combat : réduction de coût du sort désigné (chiffré)', () => {
  it('le Projectile de mana désigné coûte 1 PM de moins (1 → 0 PM)', () => {
    const c = recette();
    const spell = featureById.get(SPELL_ID)!;
    expect(spellManaCost(spell)).toBe(1);
    expect(combatRitualDiscount(c, spell)).toBe(1);
  });

  it('un AUTRE sort connu (non désigné) ne bénéficie pas de la réduction', () => {
    const c = recette();
    expect(combatRitualDiscount(c, featureById.get('magie-des-arcanes-r2')!)).toBe(0);
  });
});

describe('PER-74 — r6/r8 : badges de rappel AMBRE (réactions payées en PM, non chiffrées)', () => {
  it('carte Défense : badge Déflexion arcanique présent', () => {
    const view = buildCharacterDerivedView(recette());
    const badge = view.defenseBadges.find((b) => b.key === 'arcane-deflection-warmage-r6');
    expect(badge).toBeDefined();
    expect(badge?.variant).toBe('arcane-deflection');
  });

  it('carte Attaque au contact : note Frappe des arcanes présente, ambre, les deux modes', () => {
    const view = buildCharacterDerivedView(recette());
    const note = view.meleeAttackNotes.find((n) => n.featureId === R8);
    expect(note).toBeDefined();
    expect(note?.color).toBe('warning');
    expect(note?.weaponOnly).toBeUndefined();
  });

  it('sans R6/R8, aucun badge/note', () => {
    const c = recette();
    const without: Character = { ...c, featureIds: c.featureIds.filter((id) => ![R6, R8].includes(id)) };
    const view = buildCharacterDerivedView(without);
    expect(view.defenseBadges.some((b) => b.key === 'arcane-deflection-warmage-r6')).toBe(false);
    expect(view.meleeAttackNotes.some((n) => n.featureId === R8)).toBe(false);
  });
});

describe('PER-74 — r7 Magie de combat : verbatim seul, aucun effet chiffré', () => {
  it('aucun effect structuré (choix ponctuel à l’incantation, hors périmètre du moteur)', () => {
    expect(featureById.get(R7)?.effects ?? []).toHaveLength(0);
  });
});
