import { describe, expect, it } from 'vitest';
import { createBlankCharacter } from '@/lib/character/factory';
import type { Character } from '@/lib/character/types';
import { statusSheetImpact } from '@/lib/character/statusEffects';
import { buildCharacterDerivedView } from './characterDerivedView';
import { buildSheetDisplayView } from './sheetDisplayView';

/** Personnage de test : fabrique réelle, niveau 5. */
function char(over: Partial<Character> = {}): Character {
  return { ...createBlankCharacter({ now: '2026-01-01T00:00:00.000Z' }), level: 5, ...over };
}

/**
 * Repli des états de combat dans le détail « i » des stats dérivées (PER-281) : `buildSheetDisplayView`
 * ne fait qu'AJOUTER la ventilation « État : … » à `extraModSources` ; le TOTAL chiffré, lui, est fondu
 * dans `derivedInput.mods` par l'appelant. Hors état (param omis), le détail reste inchangé.
 */
describe('buildSheetDisplayView — répercussion des états de combat', () => {
  it('n’ajoute aucune source d’état quand le paramètre est omis', () => {
    const c = char();
    const derived = buildCharacterDerivedView(c);
    const view = buildSheetDisplayView(c, derived);
    expect(view.extraModSources.def).toBeUndefined();
    expect(view.extraModSources.rangedAttack).toBeUndefined();
  });

  it('ventile les deltas d’un état dans extraModSources, sans écraser les sources existantes', () => {
    const c = char();
    const derived = buildCharacterDerivedView(c);
    const impact = statusSheetImpact([{ id: 'blinded' }]);
    const view = buildSheetDisplayView(c, derived, undefined, impact);

    // La ventilation « État : Aveuglé » apparaît sur chaque stat touchée.
    expect(view.extraModSources.def).toEqual(
      expect.arrayContaining([{ label: 'État : Aveuglé', value: -5 }]),
    );
    expect(view.extraModSources.rangedAttack).toEqual(
      expect.arrayContaining([{ label: 'État : Aveuglé', value: -10 }]),
    );
  });

  it('reporte le malus plat « à tous les tests » sur les attaques (Attaque invalidante)', () => {
    const c = char();
    const derived = buildCharacterDerivedView(c);
    const impact = statusSheetImpact([{ id: 'invalidating-attack', intensity: 2 }]);
    const view = buildSheetDisplayView(c, derived, undefined, impact);
    expect(view.extraModSources.meleeAttack).toEqual(
      expect.arrayContaining([{ label: 'État : Attaque invalidante', value: -2 }]),
    );
  });

  // PER-104 — le canal « tests de caractéristique » : ni une stat dérivée, ni un `mods`, il vit à
  // part (`statusTestBonus`) et n'est sommé que par `TestDomainsPanel`.
  it('expose la ventilation « tests de caractéristique », vide hors session', () => {
    const c = char();
    const derived = buildCharacterDerivedView(c);
    expect(buildSheetDisplayView(c, derived).statusTestBonus).toEqual([]);
  });

  it('un buff de groupe se voit sur les attaques ET sur les tests de caractéristique', () => {
    const c = char();
    const derived = buildCharacterDerivedView(c);
    const impact = statusSheetImpact([{ id: 'heroes-song' }]);
    const view = buildSheetDisplayView(c, derived, undefined, impact);
    // Sur les attaques : ventilé sous son propre nom (ce n'est pas un « État : » subi).
    expect(view.extraModSources.meleeAttack).toEqual(
      expect.arrayContaining([{ label: 'Chant des héros', value: 1 }]),
    );
    // Sur les tests de carac : canal dédié.
    expect(view.statusTestBonus).toEqual([
      { id: 'heroes-song', label: 'Chant des héros', value: 1 },
    ]);
  });

  it('un malus plat alimente aussi le canal des tests de caractéristique', () => {
    const c = char();
    const derived = buildCharacterDerivedView(c);
    const impact = statusSheetImpact([{ id: 'insect-swarm' }]);
    const view = buildSheetDisplayView(c, derived, undefined, impact);
    expect(view.statusTestBonus).toEqual([
      { id: 'insect-swarm', label: "État : Nuée d'insectes", value: -2 },
    ]);
  });
});
