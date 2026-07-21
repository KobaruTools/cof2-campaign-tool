import { describe, expect, it } from 'vitest';
import { classById, featureById } from '@/data';
import { spellManaCost } from '@/lib/engine';
import { rulesContext } from './rulesContext';
import { createBlankCharacter } from './factory';
import type { Character, EquipmentLine } from './types';
import {
  spellArmorManaSurcharge,
  spellOriginClassId,
  spellcastingArmorAllowance,
} from './manaSurcharge';

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

/** Récupère une capacité (échoue le test si l'id n'existe plus). */
function feat(id: string) {
  const f = featureById.get(id);
  if (!f) throw new Error(`capacité introuvable : ${id}`);
  return f;
}

const cls = (id: string) => {
  const c = classById.get(id);
  if (!c) throw new Error(`profil introuvable : ${id}`);
  return c;
};

describe('spellcastingArmorAllowance — allocation d’armure d’incantation par profil (p. 178)', () => {
  it('magicien / ensorceleur / sorcier : aucune armure autorisée (0)', () => {
    expect(spellcastingArmorAllowance(cls('magicien'))).toBe(0);
    expect(spellcastingArmorAllowance(cls('ensorceleur'))).toBe(0);
    expect(spellcastingArmorAllowance(cls('sorcier'))).toBe(0);
  });

  it('forgesort / druide : cuir simple (DEF +2)', () => {
    expect(spellcastingArmorAllowance(cls('forgesort'))).toBe(2);
    expect(spellcastingArmorAllowance(cls('druide'))).toBe(2);
  });

  it('barde : cuir renforcé (DEF +3)', () => {
    expect(spellcastingArmorAllowance(cls('barde'))).toBe(3);
  });

  it('prêtre : illimitée (null) — sorts lançables en toute armure sans surcoût', () => {
    expect(spellcastingArmorAllowance(cls('pretre'))).toBeNull();
  });
});

describe('spellOriginClassId — profil d’origine d’un sort', () => {
  it('résout le profil de la voie de profil du sort', () => {
    expect(spellOriginClassId(feat('magie-des-arcanes-r3'))).toBe('magicien');
    expect(spellOriginClassId(feat('metal-r1'))).toBe('forgesort');
    expect(spellOriginClassId(feat('musicien-r1'))).toBe('barde');
    expect(spellOriginClassId(feat('foi-r2'))).toBe('pretre');
  });

  it('retourne null pour une voie sans profil unique (voie du mage)', () => {
    expect(spellOriginClassId(feat('mage-r3'))).toBeNull();
  });
});

describe('spellArmorManaSurcharge — exemples du livre (p. 178)', () => {
  it('sort de magicien de rang 3 (3 PM) en cuir simple (DEF +2) → surcoût +2 = 5 PM', () => {
    // Magicien maîtrisant le cuir (hybride guerrier) : l'exemple du livre montre la
    // FORMULE du surcoût, en supposant la maîtrise de l'armure acquise.
    const spell = feat('magie-des-arcanes-r3');
    const char = makeChar({
      classId: 'magicien',
      featureIds: ['combat-r1', 'combat-r2'],
      equipment: [wornArmor('cuir-simple')],
    });
    const res = spellArmorManaSurcharge(char, ctx, spell);
    expect(res?.surcharge).toBe(2);
    expect(spellManaCost(spell)).toBe(3);
    expect((spellManaCost(spell) ?? 0) + (res?.surcharge ?? 0)).toBe(5);
  });

  it('sort de forgesort en cotte de mailles (DEF +5) → surcoût +3 (5 − 2)', () => {
    const char = makeChar({
      classId: 'forgesort',
      // Maîtrise de la cotte via un profil combattant (2 rangs de guerrier).
      featureIds: ['combat-r1', 'combat-r2'],
      equipment: [wornArmor('cotte-de-mailles')],
    });
    expect(spellArmorManaSurcharge(char, ctx, feat('metal-r1'))?.surcharge).toBe(3);
  });

  it('sort de barde en cotte de mailles (DEF +5) → surcoût +2 (5 − 3)', () => {
    const char = makeChar({
      classId: 'barde',
      featureIds: ['combat-r1', 'combat-r2'],
      equipment: [wornArmor('cotte-de-mailles')],
    });
    expect(spellArmorManaSurcharge(char, ctx, feat('musicien-r1'))?.surcharge).toBe(2);
  });
});

describe('spellArmorManaSurcharge — cas de base', () => {
  it('prêtre : aucun surcoût, quelle que soit l’armure portée', () => {
    const char = makeChar({ classId: 'pretre', equipment: [wornArmor('cotte-de-mailles')] });
    const res = spellArmorManaSurcharge(char, ctx, feat('foi-r2'));
    expect(res?.surcharge).toBe(0);
    expect(res?.allowanceDef).toBeNull();
    expect(res?.blockedByMastery).toBe(false);
  });

  it('aucune armure portée → surcoût 0', () => {
    const char = makeChar({ classId: 'magicien' });
    expect(spellArmorManaSurcharge(char, ctx, feat('magie-des-arcanes-r3'))?.surcharge).toBe(0);
  });

  it('armure dans l’allocation du profil (forgesort en cuir simple) → surcoût 0', () => {
    const char = makeChar({ classId: 'forgesort', equipment: [wornArmor('cuir-simple')] });
    expect(spellArmorManaSurcharge(char, ctx, feat('metal-r1'))?.surcharge).toBe(0);
  });

  it('capacité non-sort → null', () => {
    // combat-r1 (Maître d'armes, guerrier) n'est pas un sort.
    expect(spellArmorManaSurcharge(makeChar({ classId: 'guerrier' }), ctx, feat('combat-r1'))).toBeNull();
  });

  it('sort de la voie du mage : magie générique → DEF complète (allocation 0)', () => {
    // Voie du mage = « tous les autres profils » (p. 178) → surcoût = DEF mondaine
    // portée (comme un sort de magicien). Cuir simple (DEF +2) → +2.
    const char = makeChar({
      classId: 'magicien',
      featureIds: ['combat-r1', 'combat-r2'],
      equipment: [wornArmor('cuir-simple')],
    });
    const res = spellArmorManaSurcharge(char, ctx, feat('mage-r3'));
    expect(res?.allowanceDef).toBe(0);
    expect(res?.surcharge).toBe(2);
    expect(res?.originClassId).toBeUndefined();
  });

  it('sort de voie de prestige (hors p. 177-178) → null (question ouverte)', () => {
    const char = makeChar({ classId: 'magicien', equipment: [wornArmor('cuir-simple')] });
    expect(spellArmorManaSurcharge(char, ctx, feat('prestige-archimage-r5'))).toBeNull();
  });
});

describe('spellArmorManaSurcharge — condition de maîtrise (p. 178)', () => {
  it('magicien pur en cuir : surcoût calculé mais lancement bloqué (armure non maîtrisée)', () => {
    const char = makeChar({ classId: 'magicien', equipment: [wornArmor('cuir-simple')] });
    const res = spellArmorManaSurcharge(char, ctx, feat('magie-des-arcanes-r3'));
    expect(res?.surcharge).toBe(2);
    expect(res?.armorMastered).toBe(false);
    expect(res?.blockedByMastery).toBe(true);
  });

  it('magicien/guerrier (2 rangs) en cotte : maîtrise l’armure → lançable avec surcoût +5', () => {
    const char = makeChar({
      classId: 'magicien',
      featureIds: ['combat-r1', 'combat-r2'],
      equipment: [wornArmor('cotte-de-mailles')],
    });
    const res = spellArmorManaSurcharge(char, ctx, feat('magie-des-arcanes-r3'));
    expect(res?.surcharge).toBe(5);
    expect(res?.armorMastered).toBe(true);
    expect(res?.blockedByMastery).toBe(false);
  });
});

describe('spellArmorManaSurcharge — Talent pour la magie affranchit du surcoût (PER-144, p. 50)', () => {
  // Un sort emprunté via « Talent pour la magie » (elfe-haut-r3) s'utilise « en armure sans pénalité »
  // (rang 1) — donc AUCUN surcoût d'armure, contrairement à un sort de magicien natif. Le rang 2 est,
  // lui, non lançable en armure (avertissement, cf. magicTalentSpellsBlockedByArmor) : la notion de
  // surcoût ne s'applique pas non plus. Base : un elfe haut guerrier (peut porter du cuir).
  const talent = (borrowedId: string): Character =>
    makeChar({
      ancestryId: 'elfe-haut',
      ancestryPathId: 'elfe-haut',
      classId: 'guerrier',
      featureIds: ['elfe-haut-r3'],
      featureChoices: { 'elfe-haut-r3': [borrowedId] },
      equipment: [wornArmor('cuir-simple')],
    });

  it('emprunt de RANG 1 en armure → aucun surcoût (null), « en armure sans pénalité »', () => {
    expect(spellArmorManaSurcharge(talent('magie-des-arcanes-r1'), ctx, feat('magie-des-arcanes-r1'))).toBeNull();
  });

  it('emprunt de RANG 2 en armure → aucun surcoût (null), l’interdiction est rendue en avertissement', () => {
    expect(spellArmorManaSurcharge(talent('magie-des-arcanes-r2'), ctx, feat('magie-des-arcanes-r2'))).toBeNull();
  });

  it('CONTRÔLE : le MÊME sort possédé NATIVEMENT (magicien pur, sans Talent) garde son surcoût +2', () => {
    const magicien = makeChar({
      classId: 'magicien',
      featureIds: ['magie-des-arcanes-r1'],
      equipment: [wornArmor('cuir-simple')],
    });
    expect(spellArmorManaSurcharge(magicien, ctx, feat('magie-des-arcanes-r1'))?.surcharge).toBe(2);
  });
});

describe('spellArmorManaSurcharge — Don étrange affranchit du surcoût (PER-146, p. 53)', () => {
  // « il doit payer le coût en PM de façon normale » = coût de BASE, non majoré : le sort d'ensorceleur
  // emprunté par le gnome est affranchi du surcoût d'armure (la contrepartie du port d'armure est la
  // limite 1/jour, pas un surcoût). Sans exemption, l'allocation d'armure de l'ensorceleur (0) rendrait
  // le sort injouable en armure lourde. Base : un gnome guerrier (peut porter jusqu'à la cotte de mailles).
  const donEtrange = (over: Partial<Character> = {}): Character =>
    makeChar({
      ancestryId: 'gnome',
      ancestryPathId: 'gnome',
      classId: 'guerrier',
      featureIds: ['gnome-r1'],
      featureChoices: { 'gnome-r1': ['air-r1'] },
      ...over,
    });

  it('sort emprunté en armure légère → aucun surcoût (null), coût normal', () => {
    const c = donEtrange({ equipment: [wornArmor('cuir-simple')] });
    expect(spellArmorManaSurcharge(c, ctx, feat('air-r1'))).toBeNull();
  });

  it('sort emprunté en cotte de mailles → aucun surcoût (null) : le sort reste jouable', () => {
    const c = donEtrange({ equipment: [wornArmor('cotte-de-mailles')] });
    expect(spellArmorManaSurcharge(c, ctx, feat('air-r1'))).toBeNull();
  });

  it('CONTRÔLE : le MÊME sort possédé NATIVEMENT (ensorceleur, sans Don étrange) garde un surcoût', () => {
    const ensorceleur = makeChar({
      classId: 'ensorceleur',
      featureIds: ['air-r1'],
      equipment: [wornArmor('cuir-simple')],
    });
    expect(spellArmorManaSurcharge(ensorceleur, ctx, feat('air-r1'))?.surcharge).toBeGreaterThan(0);
  });
});
