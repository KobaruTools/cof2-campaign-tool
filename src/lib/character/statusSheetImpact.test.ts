import { describe, expect, it } from 'vitest';
import { statusSheetImpact } from './statusEffects';

/**
 * Impact des états de combat sur la FICHE du joueur (PER-281). On vérifie l'injection des deltas
 * chiffrés (fondus dans `mods` ET ventilés dans `modSources`), les drapeaux de dé malus par portée,
 * les malus plats (tests / DM), l'intensité des états cumulatifs, et le repli des états
 * comportementaux (badge seul, aucun chiffre).
 */
describe('statusSheetImpact', () => {
  it('ne produit aucun chiffre pour une liste vide', () => {
    const r = statusSheetImpact([]);
    expect(r.statuses).toEqual([]);
    expect(r.mods).toEqual({});
    expect(r.modSources).toEqual({});
    expect(r.allTestsMalusDie).toEqual([]);
    expect(r.attackTestsMalusDie).toEqual([]);
    expect(r.allTestsFlat).toBe(0);
    expect(r.damageDealt).toBe(0);
  });

  it('Aveuglé : reporte les deltas de stats dérivées et les ventile par source', () => {
    const r = statusSheetImpact([{ id: 'blinded' }]);
    expect(r.mods).toEqual({
      initiative: -5,
      def: -5,
      meleeAttack: -5,
      magicAttack: -5,
      rangedAttack: -10,
    });
    // Chaque stat touchée porte sa source « État : Aveuglé » avec la valeur exacte.
    expect(r.modSources.rangedAttack).toEqual([{ label: 'État : Aveuglé', value: -10 }]);
    expect(r.modSources.def).toEqual([{ label: 'État : Aveuglé', value: -5 }]);
    expect(r.allTestsMalusDie).toEqual([]);
    expect(r.allTestsFlat).toBe(0);
  });

  it('Affaibli : dé malus à TOUS les tests, aucun delta chiffré', () => {
    const r = statusSheetImpact([{ id: 'weakened' }]);
    expect(r.allTestsMalusDie).toEqual(['Affaibli']);
    expect(r.attackTestsMalusDie).toEqual([]);
    expect(r.mods).toEqual({});
  });

  it('Immobilisé : dé malus aux seuls tests d’attaque', () => {
    const r = statusSheetImpact([{ id: 'immobilized' }]);
    expect(r.attackTestsMalusDie).toEqual(['Immobilisé']);
    expect(r.allTestsMalusDie).toEqual([]);
    expect(r.mods).toEqual({});
  });

  it('Attaque invalidante ×2 : malus plat cumulé aux tests, aux DM, et reporté sur les trois attaques', () => {
    const r = statusSheetImpact([{ id: 'invalidating-attack', intensity: 2 }]);
    expect(r.allTestsFlat).toBe(-2);
    expect(r.damageDealt).toBe(-2);
    // Reporté sur les trois attaques (jets d'attaque = tests d'attaque).
    expect(r.mods).toEqual({ meleeAttack: -2, rangedAttack: -2, magicAttack: -2 });
    expect(r.modSources.meleeAttack).toEqual([{ label: 'État : Attaque invalidante', value: -2 }]);
  });

  it('clampe l’intensité au plafond du catalogue (Attaque invalidante max 3)', () => {
    const r = statusSheetImpact([{ id: 'invalidating-attack', intensity: 9 }]);
    expect(r.allTestsFlat).toBe(-3);
    expect(r.damageDealt).toBe(-3);
    expect(r.mods.meleeAttack).toBe(-3);
  });

  it('cumule plusieurs états sur une même stat (Aveuglé + Renversé → def -10)', () => {
    const r = statusSheetImpact([{ id: 'blinded' }, { id: 'prone' }]);
    expect(r.mods.def).toBe(-10);
    expect(r.modSources.def).toEqual([
      { label: 'État : Aveuglé', value: -5 },
      { label: 'État : Renversé', value: -5 },
    ]);
    // meleeAttack : -5 (Aveuglé) + -5 (Renversé) = -10 ; rangedAttack : -10 (Aveuglé) + -5 (Renversé) = -15.
    expect(r.mods.meleeAttack).toBe(-10);
    expect(r.mods.rangedAttack).toBe(-15);
  });

  it('conserve un état purement comportemental en badge, sans chiffre', () => {
    const r = statusSheetImpact([{ id: 'winded' }]);
    expect(r.statuses).toEqual([{ id: 'winded' }]);
    expect(r.mods).toEqual({});
    expect(r.allTestsMalusDie).toEqual([]);
    expect(r.allTestsFlat).toBe(0);
  });

  it('ignore silencieusement un id inconnu', () => {
    const r = statusSheetImpact([{ id: 'unknown-xyz' as never }, { id: 'dazed' }]);
    expect(r.statuses).toEqual([{ id: 'dazed' }]);
    expect(r.mods).toEqual({ def: -5 });
  });
});
