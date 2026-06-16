import { describe, expect, it } from 'vitest';
import { families } from '@/data/families';
import { progression } from '@/data/progression';
import type { Family } from '@/data/schema';
import { modsFromFeatures } from '@/lib/character/effects';
import {
  meleeAttack,
  rangedAttack,
  magicAttack,
  baseAttack,
  defense,
  deriveStats,
  initiative,
  recoveryDiceCount,
  scalingDie,
  luckPoints,
  manaPoints,
  spellManaCost,
  canConcentrate,
  concentratedSpellManaCost,
  maxHp,
  type Abilities,
} from './derived';
import { featureById } from '@/data';

const family = (id: string): Family => {
  const f = families.find((x) => x.id === id);
  if (!f) throw new Error(`famille introuvable: ${id}`);
  return f;
};

const aventuriers = family('adventurers');
const combattants = family('fighters');
const mages = family('mages');
const mystiques = family('mystics');

describe('points de vigueur', () => {
  it('niveau 1 = 2 × baseHp + CON', () => {
    expect(maxHp(1, mages, 1)).toBe(7); // Ionas : 2×3 + 1
    expect(maxHp(1, combattants, 2)).toBe(12); // Lhagva (formule) : 2×5 + 2
    expect(maxHp(1, aventuriers, 0)).toBe(8);
    expect(maxHp(1, mystiques, 0)).toBe(8);
  });

  it('ajoute hpPerLevel + CON à chaque niveau au-delà du 1er', () => {
    // Lhagva combattante CON +2 : niveau 2 = 12 + (5 + 2) = 19 (p. 39)
    expect(maxHp(2, combattants, 2)).toBe(19);
    expect(maxHp(3, combattants, 2)).toBe(26);
  });

  it('applique le modificateur plat', () => {
    expect(maxHp(1, combattants, 2, { maxHp: 3 })).toBe(15);
  });
});

describe('dés de récupération', () => {
  it('nombre = 2 + CON + bonus de famille', () => {
    expect(recoveryDiceCount(2, combattants)).toBe(4); // Lhagva 4d10
    expect(recoveryDiceCount(1, mages)).toBe(3); // Ionas 3d6
    expect(recoveryDiceCount(0, mystiques)).toBe(3); // mystiques +1
  });

  it('plancher à 0 (cas CON très négative, p. 30)', () => {
    expect(recoveryDiceCount(-2, combattants)).toBe(0);
    expect(recoveryDiceCount(-5, aventuriers)).toBe(0);
  });

  it('type de dé selon la famille', () => {
    expect(combattants.recoveryDie).toBe('d10');
    expect(mages.recoveryDie).toBe('d6');
    expect(aventuriers.recoveryDie).toBe('d8');
    expect(mystiques.recoveryDie).toBe('d8');
  });
});

describe('dés évolutifs (d4°)', () => {
  it('suit la table p. 43 par paliers', () => {
    expect(scalingDie(1, progression)).toBe('d4');
    expect(scalingDie(5, progression)).toBe('d4');
    expect(scalingDie(6, progression)).toBe('d6');
    expect(scalingDie(8, progression)).toBe('d6');
    expect(scalingDie(9, progression)).toBe('d8');
    expect(scalingDie(12, progression)).toBe('d10');
    expect(scalingDie(15, progression)).toBe('d12');
  });

  it('reste sur le dernier palier au-delà (15+)', () => {
    expect(scalingDie(20, progression)).toBe('d12');
  });
});

describe('points de chance', () => {
  it('= 2 + CHA + bonus de famille', () => {
    expect(luckPoints(4, mages)).toBe(6); // Ionas : 2 + 4
    expect(luckPoints(-1, combattants)).toBe(1); // Lhagva avant Diversité
    expect(luckPoints(0, aventuriers)).toBe(3); // aventuriers +1
  });

  it('le bonus de capacité (ex. Diversité +1 PC) passe par mods', () => {
    expect(luckPoints(-1, combattants, { luckPoints: 1 })).toBe(2); // Lhagva
  });

  it('plancher à 0', () => {
    expect(luckPoints(-5, combattants)).toBe(0);
  });
});

describe('points de mana', () => {
  it('= VOL + nombre de sorts, si au moins un sort', () => {
    expect(manaPoints(2, 3)).toBe(5); // Ionas : VOL 2 + 3 sorts
  });

  it('null si aucun sort connu', () => {
    expect(manaPoints(3, 0)).toBeNull();
  });
});

describe('coût de base en mana d’un sort (p. 228)', () => {
  it('= rang du sort par défaut', () => {
    expect(spellManaCost({ isSpell: true, rank: 1 })).toBe(1);
    expect(spellManaCost({ isSpell: true, rank: 2 })).toBe(2);
    // Désintégration, rang 5 → 5 PM (exemple « 5 – 2 – 1 » du livre, p. 103).
    expect(spellManaCost({ isSpell: true, rank: 5 })).toBe(5);
  });

  it('utilise la dérogation explicite quand elle est présente', () => {
    // Rune de garde : rang 5 mais « coûte seulement 3 PM ».
    expect(spellManaCost({ isSpell: true, rank: 5, manaCost: 3 })).toBe(3);
    // Sort gratuit.
    expect(spellManaCost({ isSpell: true, rank: 3, manaCost: 0 })).toBe(0);
  });

  it('null pour une capacité qui n’est pas un sort', () => {
    expect(spellManaCost({ isSpell: false, rank: 2 })).toBeNull();
    expect(spellManaCost({ isSpell: false, rank: 5, manaCost: 3 })).toBeNull();
  });

  it('preuve sur les données réelles : coût = rang', () => {
    const desintegration = featureById.get('magie-des-arcanes-r5');
    const projectile = featureById.get('magie-des-arcanes-r1');
    const runeDeGarde = featureById.get('runes-r5');
    expect(desintegration && spellManaCost(desintegration)).toBe(5);
    expect(projectile && spellManaCost(projectile)).toBe(1);
    // Rune de garde : coût de base = rang 5. Le « 3 PM » du texte est le rang − 2
    // dû à la Concentration automatique (réduction dynamique, hors coût de base).
    expect(runeDeGarde && spellManaCost(runeDeGarde)).toBe(5);
  });
});

describe('Concentration accrue (p. 228)', () => {
  it('canConcentrate : tout sort proposant un mode (A)', () => {
    expect(canConcentrate({ isSpell: true, actionTypes: ['A'] })).toBe(true);
    // Sorts purement (L)/(M)/(G) : « ne peuvent pas bénéficier de la concentration ».
    expect(canConcentrate({ isSpell: true, actionTypes: ['L'] })).toBe(false);
    expect(canConcentrate({ isSpell: true, actionTypes: ['M'] })).toBe(false);
    expect(canConcentrate({ isSpell: true, actionTypes: ['G'] })).toBe(false);
    // Sort à double mode incluant (A) (Arme élémentaire, Invisibilité, Peur) : le
    // joueur peut se concentrer s'il lance en (A).
    expect(canConcentrate({ isSpell: true, actionTypes: ['A', 'L'] })).toBe(true);
    // Capacité qui n'est pas un sort.
    expect(canConcentrate({ isSpell: false, actionTypes: ['A'] })).toBe(false);
  });

  it('concentratedSpellManaCost : −2 PM, plancher 0', () => {
    // Rang 5 → 3 (cf. Rune de garde, rang 5 − 2 = 3 PM).
    expect(concentratedSpellManaCost({ isSpell: true, rank: 5, actionTypes: ['A'] })).toBe(3);
    // Sorts de rang 1 et 2 : réduits à 0 PM (plancher, p. 228).
    expect(concentratedSpellManaCost({ isSpell: true, rank: 2, actionTypes: ['A'] })).toBe(0);
    expect(concentratedSpellManaCost({ isSpell: true, rank: 1, actionTypes: ['A'] })).toBe(0);
  });

  it('concentratedSpellManaCost : coût de base inchangé si non éligible', () => {
    // Sort en (L) : pas de réduction, coût = rang.
    expect(concentratedSpellManaCost({ isSpell: true, rank: 4, actionTypes: ['L'] })).toBe(4);
    // Non-sort : null comme spellManaCost.
    expect(concentratedSpellManaCost({ isSpell: false, rank: 3, actionTypes: ['A'] })).toBeNull();
  });

  it('preuve sur les données réelles : sorts à double mode (A)|(L)', () => {
    // Peur (rang 4, « (A) ou (L) ») : éligible via son mode (A), coût 4 − 2 = 2.
    const peur = featureById.get('mort-r4');
    expect(peur && canConcentrate(peur)).toBe(true);
    expect(peur && concentratedSpellManaCost(peur)).toBe(2);
  });
});

describe('initiative', () => {
  it('= 10 + PER', () => {
    expect(initiative(0)).toBe(10);
    expect(initiative(1)).toBe(11);
  });

  it('ajoute les modificateurs de capacités', () => {
    expect(initiative(1, { initiative: 3 })).toBe(14); // Lhagva + Réflexes éclair
    expect(initiative(0, { initiative: 1 })).toBe(11); // Ionas + Murmure dans le vent
  });
});

describe('défense', () => {
  it('= 10 + AGI + bonus équipement', () => {
    expect(defense(1, { defBonus: 0, maxAgi: null })).toBe(11);
    expect(defense(1, { defBonus: 4, maxAgi: null })).toBe(15);
  });

  it("plafonne l'AGI selon l'armure (p. 188)", () => {
    // cotte de mailles : AGI max +3 ; un perso AGI +5 ne compte que +3
    expect(defense(5, { defBonus: 5, maxAgi: 3 })).toBe(18);
    // sous le plafond : AGI inchangée
    expect(defense(2, { defBonus: 5, maxAgi: 3 })).toBe(17);
  });

  it('ajoute les modificateurs de capacités', () => {
    expect(defense(1, { defBonus: 0, maxAgi: null }, { def: 1 })).toBe(12); // Ionas + Murmure
  });
});

describe("valeurs d'attaque", () => {
  it('base = niveau plafonné à 10', () => {
    expect(baseAttack(1)).toBe(1);
    expect(baseAttack(10)).toBe(10);
    expect(baseAttack(13)).toBe(10);
  });

  it('contact/distance/magique = base + carac (niveau 1)', () => {
    // Lhagva : FOR +3, AGI +1, VOL +1
    expect(meleeAttack(1, 3)).toBe(4);
    expect(rangedAttack(1, 1)).toBe(2);
    expect(magicAttack(1, 1)).toBe(2);
    // Ionas : FOR -2, AGI +1, VOL +2
    expect(meleeAttack(1, -2)).toBe(-1);
    expect(rangedAttack(1, 1)).toBe(2);
    expect(magicAttack(1, 2)).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// Cas en or : fiches d'exemple du livre (p. 37), capacités tracées incluses.
// ---------------------------------------------------------------------------

describe('cas en or — Ionas, ensorceleur niveau 1 (elfe haut)', () => {
  const abilities: Abilities = { AGI: 1, CON: 1, FOR: -2, PER: 0, CHA: 4, INT: 0, VOL: 2 };
  // « Murmures dans le vent » (air rang 1) : +1 Init et +1 DEF (p. 93). Bonus
  // agrégé depuis les `effects` de la capacité, sans injection manuelle (PER-63).
  const stats = deriveStats({
    abilities,
    level: 1,
    family: mages,
    defenseEquipment: { defBonus: 0, maxAgi: null }, // bâton ferré, pas d'armure
    spellCount: 3, // Murmures dans le vent, Choc, Serviteur invisible
    mods: modsFromFeatures(['air-r1']),
  });

  it('reproduit exactement la fiche', () => {
    expect(stats.maxHp).toBe(7);
    expect(stats.recoveryDiceCount).toBe(3);
    expect(stats.recoveryDie).toBe('d6');
    expect(stats.luckPoints).toBe(6);
    expect(stats.manaPoints).toBe(5);
    expect(stats.initiative).toBe(11);
    expect(stats.defense).toBe(12);
    expect(stats.meleeAttack).toBe(-1);
    expect(stats.rangedAttack).toBe(2);
    expect(stats.magicAttack).toBe(3);
  });
});

describe('cas en or — Lhagva, barbare niveau 1 (humaine)', () => {
  const abilities: Abilities = { AGI: 1, CON: 2, FOR: 3, PER: 1, CHA: -1, INT: 0, VOL: 1 };
  // Réflexes éclair (pourfendeur r1) : +3 Init, +1 DEF. Diversité (humain r1) : +1 PC.
  // Équipement : armure de cuir (+2) + grand bouclier (+2). Bonus agrégés depuis
  // les `effects` des capacités, sans injection manuelle (PER-63).
  const stats = deriveStats({
    abilities,
    level: 1,
    family: combattants,
    defenseEquipment: { defBonus: 4, maxAgi: null },
    spellCount: 0,
    mods: modsFromFeatures(['pourfendeur-r1', 'humain-r1']),
  });

  it('reproduit la fiche pour les stats régies par les formules', () => {
    expect(stats.recoveryDiceCount).toBe(4);
    expect(stats.recoveryDie).toBe('d10');
    expect(stats.luckPoints).toBe(2);
    expect(stats.initiative).toBe(14);
    expect(stats.defense).toBe(16);
    expect(stats.meleeAttack).toBe(4);
    expect(stats.rangedAttack).toBe(2);
    expect(stats.magicAttack).toBe(2);
    expect(stats.manaPoints).toBeNull();
  });

  it('PV : la formule donne 12 (la fiche p. 37 affiche 15 — incohérence du livre, p. 39 confirme 12)', () => {
    expect(stats.maxHp).toBe(12);
  });
});
