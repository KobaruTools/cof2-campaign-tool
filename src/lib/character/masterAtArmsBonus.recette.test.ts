import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { migrateCharacter } from '@/lib/engine/migrations';
import { deriveStats } from '@/lib/engine';
import { buildCharacterDerivedView } from '@/components/sheet/characterDerivedView';

function loadFixture(name: string) {
  const raw = JSON.parse(readFileSync(join(process.cwd(), 'examples/characters', `${name}.json`), 'utf8'));
  return migrateCharacter(raw);
}

describe('PER-226 — maître d’armes : +1 att FONDU au score et +N DM câblés à l’arme de prédilection (recette end-to-end)', () => {
  it('épée de prédilection + Spécialisation → touche +1 (fondue, attribuée dans le breakdown) ET +2 DM (+ crit 19-20)', () => {
    const view = buildCharacterDerivedView(loadFixture('recette-per226-maitre-armes-epee-specialisation'));
    const stats = deriveStats(view.derivedInput!);
    // Niveau 12 (base 10) + FOR 3 + 1 (maître d'armes, fondu dans le score) = 14.
    expect(stats.meleeAttack).toBe(14);
    // Attribution de la source dans l'infobulle « i » (pas de badge).
    expect(view.attackBonusModSources.meleeAttack).toEqual([
      { label: 'Armes de prédilection', value: 1, featureId: 'maitre-d-armes-r1' },
    ]);
    // +2 DM plat de Spécialisation, agrégé à l'expression de DM.
    expect(view.meleeWeaponDamage?.flat).toBe(2);
    expect(view.meleeWeaponDamage?.abilities).toEqual(['FOR']);
    // Science du critique (r2) suit la même arme de prédilection.
    expect(view.meleeCriticalRanges[0]?.text).toBe('19-20');
  });

  it('MÊME maître d’armes tenant une masse (hors prédilection) → aucun bonus (contrôle négatif)', () => {
    const view = buildCharacterDerivedView(loadFixture('recette-per226-maitre-armes-masse-controle'));
    const stats = deriveStats(view.derivedInput!);
    // Niveau 12 (base 10) + FOR 3, sans +1 (masse hors prédilection).
    expect(stats.meleeAttack).toBe(13);
    expect(view.attackBonusModSources.meleeAttack).toBeUndefined();
    expect(view.meleeWeaponDamage?.flat).toBe(0);
    expect(view.meleeCriticalRanges).toHaveLength(0);
  });

  it('arme de jet de prédilection à distance → touche à distance +1 (fondue) ET +1 DM (aucune carac, p. 185)', () => {
    const view = buildCharacterDerivedView(loadFixture('recette-per226-maitre-armes-jet-distance'));
    const stats = deriveStats(view.derivedInput!);
    // Niveau 9 + AGI 2 + 1 (maître d'armes, arme de jet) = 12.
    expect(stats.rangedAttack).toBe(12);
    expect(view.attackBonusModSources.rangedAttack).toEqual([
      { label: 'Armes de prédilection', value: 1, featureId: 'maitre-d-armes-r1' },
    ]);
    expect(view.rangedWeaponDamage?.flat).toBe(1);
    expect(view.rangedWeaponDamage?.abilities).toEqual([]);
    // Le contact ne bénéficie de rien (pas d'arme de contact portée) → pas d'attribution melee.
    expect(view.attackBonusModSources.meleeAttack).toBeUndefined();
  });
});
