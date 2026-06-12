import { describe, expect, it } from 'vitest';
import { familles } from '@/data/familles';
import type { Famille } from '@/data/schema';
import {
  attaqueContact,
  attaqueDistance,
  attaqueMagique,
  baseAttaque,
  defense,
  deriveStats,
  initiative,
  nbDesRecuperation,
  pointsChance,
  pointsMana,
  pvMax,
  type Caracs,
} from './derived';

const famille = (id: string): Famille => {
  const f = familles.find((x) => x.id === id);
  if (!f) throw new Error(`famille introuvable: ${id}`);
  return f;
};

const aventuriers = famille('aventuriers');
const combattants = famille('combattants');
const mages = famille('mages');
const mystiques = famille('mystiques');

describe('points de vigueur', () => {
  it('niveau 1 = 2 × pvBase + CON', () => {
    expect(pvMax(1, mages, 1)).toBe(7); // Ionas : 2×3 + 1
    expect(pvMax(1, combattants, 2)).toBe(12); // Lhagva (formule) : 2×5 + 2
    expect(pvMax(1, aventuriers, 0)).toBe(8);
    expect(pvMax(1, mystiques, 0)).toBe(8);
  });

  it('ajoute pvParNiveau + CON à chaque niveau au-delà du 1er', () => {
    // Lhagva combattante CON +2 : niveau 2 = 12 + (5 + 2) = 19 (p. 39)
    expect(pvMax(2, combattants, 2)).toBe(19);
    expect(pvMax(3, combattants, 2)).toBe(26);
  });

  it('applique le modificateur plat', () => {
    expect(pvMax(1, combattants, 2, { pvMax: 3 })).toBe(15);
  });
});

describe('dés de récupération', () => {
  it('nombre = 2 + CON + bonus de famille', () => {
    expect(nbDesRecuperation(2, combattants)).toBe(4); // Lhagva 4d10
    expect(nbDesRecuperation(1, mages)).toBe(3); // Ionas 3d6
    expect(nbDesRecuperation(0, mystiques)).toBe(3); // mystiques +1
  });

  it('plancher à 0 (cas CON très négative, p. 30)', () => {
    expect(nbDesRecuperation(-2, combattants)).toBe(0);
    expect(nbDesRecuperation(-5, aventuriers)).toBe(0);
  });

  it('type de dé selon la famille', () => {
    expect(combattants.deRecuperation).toBe('d10');
    expect(mages.deRecuperation).toBe('d6');
    expect(aventuriers.deRecuperation).toBe('d8');
    expect(mystiques.deRecuperation).toBe('d8');
  });
});

describe('points de chance', () => {
  it('= 2 + CHA + bonus de famille', () => {
    expect(pointsChance(4, mages)).toBe(6); // Ionas : 2 + 4
    expect(pointsChance(-1, combattants)).toBe(1); // Lhagva avant Diversité
    expect(pointsChance(0, aventuriers)).toBe(3); // aventuriers +1
  });

  it('le bonus de capacité (ex. Diversité +1 PC) passe par mods', () => {
    expect(pointsChance(-1, combattants, { pointsChance: 1 })).toBe(2); // Lhagva
  });

  it('plancher à 0', () => {
    expect(pointsChance(-5, combattants)).toBe(0);
  });
});

describe('points de mana', () => {
  it('= VOL + nombre de sorts, si au moins un sort', () => {
    expect(pointsMana(2, 3)).toBe(5); // Ionas : VOL 2 + 3 sorts
  });

  it('null si aucun sort connu', () => {
    expect(pointsMana(3, 0)).toBeNull();
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
    expect(defense(1, { bonusDef: 0, agiMax: null })).toBe(11);
    expect(defense(1, { bonusDef: 4, agiMax: null })).toBe(15);
  });

  it("plafonne l'AGI selon l'armure (p. 188)", () => {
    // cotte de mailles : AGI max +3 ; un perso AGI +5 ne compte que +3
    expect(defense(5, { bonusDef: 5, agiMax: 3 })).toBe(18);
    // sous le plafond : AGI inchangée
    expect(defense(2, { bonusDef: 5, agiMax: 3 })).toBe(17);
  });

  it('ajoute les modificateurs de capacités', () => {
    expect(defense(1, { bonusDef: 0, agiMax: null }, { def: 1 })).toBe(12); // Ionas + Murmure
  });
});

describe("valeurs d'attaque", () => {
  it('base = niveau plafonné à 10', () => {
    expect(baseAttaque(1)).toBe(1);
    expect(baseAttaque(10)).toBe(10);
    expect(baseAttaque(13)).toBe(10);
  });

  it('contact/distance/magique = base + carac (niveau 1)', () => {
    // Lhagva : FOR +3, AGI +1, VOL +1
    expect(attaqueContact(1, 3)).toBe(4);
    expect(attaqueDistance(1, 1)).toBe(2);
    expect(attaqueMagique(1, 1)).toBe(2);
    // Ionas : FOR -2, AGI +1, VOL +2
    expect(attaqueContact(1, -2)).toBe(-1);
    expect(attaqueDistance(1, 1)).toBe(2);
    expect(attaqueMagique(1, 2)).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// Cas en or : fiches d'exemple du livre (p. 37), capacités tracées incluses.
// ---------------------------------------------------------------------------

describe('cas en or — Ionas, ensorceleur niveau 1 (elfe haut)', () => {
  const caracs: Caracs = { AGI: 1, CON: 1, FOR: -2, PER: 0, CHA: 4, INT: 0, VOL: 2 };
  // « Murmure dans le vent » (air rang 1) : +1 Init et +1 DEF (p. 93).
  const stats = deriveStats({
    caracs,
    niveau: 1,
    famille: mages,
    defenseEquipement: { bonusDef: 0, agiMax: null }, // bâton ferré, pas d'armure
    nbSorts: 3, // Murmure dans le vent, Choc, Serviteur invisible
    mods: { initiative: 1, def: 1 },
  });

  it('reproduit exactement la fiche', () => {
    expect(stats.pvMax).toBe(7);
    expect(stats.nbDesRecuperation).toBe(3);
    expect(stats.deRecuperation).toBe('d6');
    expect(stats.pointsChance).toBe(6);
    expect(stats.pointsMana).toBe(5);
    expect(stats.initiative).toBe(11);
    expect(stats.defense).toBe(12);
    expect(stats.attaqueContact).toBe(-1);
    expect(stats.attaqueDistance).toBe(2);
    expect(stats.attaqueMagique).toBe(3);
  });
});

describe('cas en or — Lhagva, barbare niveau 1 (humaine)', () => {
  const caracs: Caracs = { AGI: 1, CON: 2, FOR: 3, PER: 1, CHA: -1, INT: 0, VOL: 1 };
  // Réflexes éclair (pourfendeur r1) : +3 Init, +1 DEF. Diversité (humain r1) : +1 PC.
  // Équipement : armure de cuir (+2) + grand bouclier (+2).
  const stats = deriveStats({
    caracs,
    niveau: 1,
    famille: combattants,
    defenseEquipement: { bonusDef: 4, agiMax: null },
    nbSorts: 0,
    mods: { initiative: 3, def: 1, pointsChance: 1 },
  });

  it('reproduit la fiche pour les stats régies par les formules', () => {
    expect(stats.nbDesRecuperation).toBe(4);
    expect(stats.deRecuperation).toBe('d10');
    expect(stats.pointsChance).toBe(2);
    expect(stats.initiative).toBe(14);
    expect(stats.defense).toBe(16);
    expect(stats.attaqueContact).toBe(4);
    expect(stats.attaqueDistance).toBe(2);
    expect(stats.attaqueMagique).toBe(2);
    expect(stats.pointsMana).toBeNull();
  });

  it('PV : la formule donne 12 (la fiche p. 37 affiche 15 — incohérence du livre, p. 39 confirme 12)', () => {
    expect(stats.pvMax).toBe(12);
  });
});
