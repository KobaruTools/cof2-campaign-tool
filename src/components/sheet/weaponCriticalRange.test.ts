import { describe, expect, it } from 'vitest';
import type { AbilityId } from '@/data/schema';
import type { Character, EquipmentLine } from '@/lib/character/types';
import { weaponLineCriticalRange } from './weaponCriticalRange';

/** Guerrier de niveau 16 tenant la voie des armes à deux mains (r4-r8), équipement paramétrable. */
const char = (equipment: EquipmentLine[], featureIds: string[] = TWO_HANDED_RANKS): Character =>
  ({
    level: 16,
    abilities: { AGI: 2, CON: 3, FOR: 4, PER: 1, CHA: 0, INT: 0, VOL: 1 } as Record<AbilityId, number>,
    featureIds,
    effectToggles: {},
    featureChoices: {},
    equipment,
  }) as Character;

const TWO_HANDED_RANKS = [4, 5, 6, 7, 8].map((r) => `prestige-armes-a-deux-mains-r${r}`);

describe('weaponLineCriticalRange (PER-74) — plage de critique sur la ligne d’inventaire', () => {
  it('arme à deux mains en main + Critique destructeur → 19-20 avec la capacité en source', () => {
    const line: EquipmentLine = { itemId: 'epee-a-deux-mains', quantity: 1, worn: { slot: 'mainHand' } };
    const info = weaponLineCriticalRange(char([line]), line);
    expect(info).toEqual({
      scope: 'melee',
      total: 1,
      sources: [{ name: 'Critique destructeur', value: 1, featureId: 'prestige-armes-a-deux-mains-r7' }],
    });
  });

  it('cumule la plage INTRINSÈQUE de l’arme (vivelame 19-20) et la capacité → 18-20, deux sources', () => {
    const line: EquipmentLine = { itemId: 'vivelame', quantity: 1, worn: { slot: 'mainHand' } };
    const info = weaponLineCriticalRange(char([line]), line);
    expect(info?.total).toBe(2);
    expect(info?.sources.map((s) => s.name)).toEqual(['Critique destructeur', 'Vivelame']);
  });

  it('arme RANGÉE (non portée) : aucune puce, même avec une plage intrinsèque', () => {
    const line: EquipmentLine = { itemId: 'vivelame', quantity: 1 };
    expect(weaponLineCriticalRange(char([line]), line)).toBeNull();
  });

  it('épée bâtarde : la PRISE décide — à deux mains 19-20, à une main aucune puce', () => {
    const twoHands: EquipmentLine = {
      itemId: 'epee-batarde',
      quantity: 1,
      worn: { slot: 'mainHand', grip: 'twoHands' },
    };
    expect(weaponLineCriticalRange(char([twoHands]), twoHands)?.total).toBe(1);
    const oneHand: EquipmentLine = {
      itemId: 'epee-batarde',
      quantity: 1,
      worn: { slot: 'mainHand', grip: 'oneHand' },
    };
    expect(weaponLineCriticalRange(char([oneHand]), oneHand)).toBeNull();
  });

  it('sans aucune source de critique (épée longue, personnage sans capacité) : null', () => {
    const line: EquipmentLine = { itemId: 'epee-longue', quantity: 1, worn: { slot: 'mainHand' } };
    expect(weaponLineCriticalRange(char([line], []), line)).toBeNull();
  });

  it('combat à deux armes : CHAQUE ligne porte SA propre plage (PER-116)', () => {
    // Deux épées courtes (famille swords), Maître d'armes « épées » + Science du critique : les DEUX
    // mains bénéficient du 19-20, donc les DEUX lignes d'inventaire l'affichent (avant : seule la
    // principale — la 2ᵉ arme, ex. variante « taille grande », restait sans puce).
    const main: EquipmentLine = { itemId: 'epee-courte', quantity: 1, worn: { slot: 'mainHand' } };
    const off: EquipmentLine = { itemId: 'epee-courte', quantity: 1, worn: { slot: 'offHand' } };
    const c: Character = {
      ...char([main, off], ['maitre-d-armes-r1', 'maitre-d-armes-r2']),
      featureChoices: { 'maitre-d-armes-r1': [['swords']] },
    };
    expect(weaponLineCriticalRange(c, main)?.sources.map((s) => s.name)).toContain('Science du critique');
    expect(weaponLineCriticalRange(c, off)?.sources.map((s) => s.name)).toContain('Science du critique');
  });

  it('combat à deux armes : la main secondaire SANS source de critique reste sans puce', () => {
    // Rapière (19-20 intrinsèque) en main principale, épée courte nue en main secondaire (aucune
    // capacité) : la principale affiche « Rapière », la secondaire n'a AUCUNE source → pas de puce.
    const main: EquipmentLine = { itemId: 'rapiere', quantity: 1, worn: { slot: 'mainHand' } };
    const off: EquipmentLine = { itemId: 'epee-courte', quantity: 1, worn: { slot: 'offHand' } };
    const c = char([main, off], []);
    expect(weaponLineCriticalRange(c, main)?.sources.map((s) => s.name)).toEqual(['Rapière']);
    expect(weaponLineCriticalRange(c, off)).toBeNull();
  });

  it('arme à DISTANCE en main : la plage remonte sur sa propre portée (arbalète + Tir précis)', () => {
    const line: EquipmentLine = { itemId: 'arbalete-legere', quantity: 1, worn: { slot: 'mainHand' } };
    const info = weaponLineCriticalRange(char([line], ['maitre-des-arbaletes-r2']), line);
    expect(info?.scope).toBe('ranged');
    expect(info?.sources.map((s) => s.name)).toContain('Science du critique');
  });

  it('une armure portée n’a pas de plage de critique', () => {
    const armor: EquipmentLine = { itemId: 'cotte-de-mailles', quantity: 1, worn: { slot: 'armor' } };
    const weapon: EquipmentLine = { itemId: 'epee-a-deux-mains', quantity: 1, worn: { slot: 'mainHand' } };
    expect(weaponLineCriticalRange(char([armor, weapon]), armor)).toBeNull();
  });
});
