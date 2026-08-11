import { describe, expect, it } from 'vitest';
import type { Character, EquipmentLine } from '@/lib/character/types';
import { demiOgreMeleeAttackNotes, demiOgreRangedAttackNotes } from './demiOgrePath';

/** Personnage minimal (le builder ne lit que `featureIds` + `equipment`). CI-safe : `demi-ogre-r4`
 *  n'est qu'une chaîne, aucun contenu payant à enregistrer. */
const char = (featureIds: string[], equipment: EquipmentLine[] = []): Character =>
  ({ featureIds, equipment }) as Character;

const arc: EquipmentLine = { itemId: 'arc-court', quantity: 1, worn: { slot: 'mainHand' } };

describe('PER-325 — demi-ogre r4 : note « ignore la RD des créatures de grande taille »', () => {
  it('sans le rang 4 : aucune note (contact ni distance)', () => {
    expect(demiOgreMeleeAttackNotes(char([]))).toEqual([]);
    expect(demiOgreRangedAttackNotes(char([], [arc]))).toEqual([]);
  });

  it('avec r4 : note au CONTACT (arme ou mains nues, donc sans weaponOnly)', () => {
    const notes = demiOgreMeleeAttackNotes(char(['demi-ogre-r4']));
    expect(notes).toHaveLength(1);
    const [n] = notes;
    expect(n.featureId).toBe('demi-ogre-r4');
    expect(n.color).toBe('warning'); // ambre = situationnel
    expect(n.icon).toBe('ignore-rd');
    expect(n.sourcePage).toBe(206);
    expect(n.weaponOnly).toBeUndefined(); // contact ARME et mains nues
  });

  it('à DISTANCE : la note n’apparaît que si une arme à distance est portée', () => {
    expect(demiOgreRangedAttackNotes(char(['demi-ogre-r4']))).toEqual([]); // aucune arme à distance
    const withBow = demiOgreRangedAttackNotes(char(['demi-ogre-r4'], [arc]));
    expect(withBow).toHaveLength(1);
    expect(withBow[0].sourcePage).toBe(206);
  });
});
