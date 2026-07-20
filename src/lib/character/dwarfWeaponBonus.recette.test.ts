import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { equipmentById } from '@/data';
import type { Weapon } from '@/data/schema';
import { migrateCharacter } from '@/lib/engine/migrations';
import { deriveStats } from '@/lib/engine';
import { rulesContext } from '@/lib/character/rulesContext';
import { extraMasteredWeaponIds, isWeaponMastered, masteredClassIds } from '@/lib/character/mastery';
import { weaponAffinities } from '@/lib/character/weaponAffinity';
import { buildCharacterDerivedView } from '@/components/sheet/characterDerivedView';
import type { Character } from '@/lib/character/types';

function loadFixture(name: string): Character {
  const raw = JSON.parse(readFileSync(join(process.cwd(), 'examples/characters', `${name}.json`), 'utf8'));
  return migrateCharacter(raw);
}

/** L'arme du catalogue `itemId` est-elle maîtrisée par le personnage (aucun dé malus) ? */
function masters(c: Character, itemId: string): boolean {
  const item = equipmentById.get(itemId) as Weapon;
  return isWeaponMastered(item, masteredClassIds(c, rulesContext), rulesContext, c.firearmsAllowed, extraMasteredWeaponIds(c));
}

describe('PER-154 — nain « Haches et marteaux » (recette end-to-end)', () => {
  it('nain guerrier + hache → +1 att (fondu, attribué) et +1 DM au contact, arme de peuple maîtrisée', () => {
    const c = loadFixture('recette-per154-nain-guerrier-hache');
    const view = buildCharacterDerivedView(c);
    expect(view.attackBonusModSources.meleeAttack).toEqual([
      { label: 'Haches et marteaux', value: 1, featureId: 'nain-r2' },
    ]);
    expect(view.meleeWeaponDamage?.flatBonuses).toMatchObject([{ featureId: 'nain-r2', value: 1 }]);
    // Aucun bonus à distance (hache = contact seul).
    expect(view.attackBonusModSources.rangedAttack).toBeUndefined();
    // Badge positif d'affinité + maîtrise.
    expect(weaponAffinities(c, 'hache').map((a) => a.kind)).toEqual(['ancestry-weapon']);
    expect(masters(c, 'hache')).toBe(true);
  });

  it('nain MAGICIEN + marteau → maîtrisé « quel que soit le profil » (pas de dé malus) + bonus', () => {
    const c = loadFixture('recette-per154-nain-magicien-marteau');
    const view = buildCharacterDerivedView(c);
    // Un magicien ne maîtrise pas les contondantes : ici c'est l'octroi de peuple qui l'accorde.
    expect(masters(c, 'marteau')).toBe(true);
    expect(weaponAffinities(c, 'marteau').map((a) => a.kind)).toEqual(['ancestry-weapon']);
    expect(view.attackBonusModSources.meleeAttack).toEqual([
      { label: 'Haches et marteaux', value: 1, featureId: 'nain-r2' },
    ]);
    expect(view.meleeWeaponDamage?.flatBonuses).toMatchObject([{ featureId: 'nain-r2', value: 1 }]);
  });

  it('contrôle négatif : nain magicien + masse → aucun bonus, aucune affinité, NON maîtrisée', () => {
    const c = loadFixture('recette-per154-nain-magicien-masse-controle');
    const view = buildCharacterDerivedView(c);
    expect(view.attackBonusModSources.meleeAttack).toBeUndefined();
    expect(view.meleeWeaponDamage?.flatBonuses).toEqual([]);
    expect(weaponAffinities(c, 'masse')).toHaveLength(0);
    // La masse n'est ni une hache ni un marteau : l'octroi du nain ne s'y applique pas.
    expect(masters(c, 'masse')).toBe(false);
  });

  it('nain + hachette LANCÉE → +1 att et +1 DM À DISTANCE (une « hache » de jet, p. 185)', () => {
    const c = loadFixture('recette-per154-nain-hachette-lancee');
    const view = buildCharacterDerivedView(c);
    expect(view.attackBonusModSources.rangedAttack).toEqual([
      { label: 'Haches et marteaux', value: 1, featureId: 'nain-r2' },
    ]);
    expect(view.rangedWeaponDamage?.flatBonuses).toMatchObject([{ featureId: 'nain-r2', value: 1 }]);
    expect(weaponAffinities(c, 'hachette').map((a) => a.kind)).toEqual(['ancestry-weapon']);
    expect(masters(c, 'hachette')).toBe(true);
  });
});
