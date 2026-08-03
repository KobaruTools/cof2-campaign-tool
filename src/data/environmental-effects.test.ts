import { describe, expect, it } from 'vitest';
import {
  ENVIRONMENTAL_EFFECT_IDS,
  ENVIRONMENTAL_EFFECTS,
  ENVIRONMENTAL_EFFECT_LABELS,
  SITUATIONAL_EFFECT_IDS,
  STATUS_EFFECT_IDS,
} from './schema';
import {
  isStackingStatus,
  resolveStatusModifiers,
  statusEntry,
  statusSheetImpact,
} from '@/lib/character/statusEffects';

// Catalogue des ÉTATS D'ENVIRONNEMENT (famille (c) de la taxonomie PER-288) : conditions de la scène
// posées par le MJ sur un combattant, suivies comme un état (« Combat aquatique », p. 215).
describe('ENVIRONMENTAL_EFFECTS (catalogue)', () => {
  it('chaque id a un libellé + un effet verbatim + une page source valide', () => {
    for (const id of ENVIRONMENTAL_EFFECT_IDS) {
      const entry = ENVIRONMENTAL_EFFECTS[id];
      expect(entry, id).toBeDefined();
      expect(entry.label.trim().length, `${id}.label`).toBeGreaterThan(0);
      expect(entry.effect.trim().length, `${id}.effect`).toBeGreaterThan(0);
      expect(entry.sourcePage, `${id}.sourcePage`).toBeGreaterThan(0);
    }
  });

  it('ENVIRONMENTAL_EFFECT_LABELS est dérivé du catalogue', () => {
    for (const id of ENVIRONMENTAL_EFFECT_IDS) {
      expect(ENVIRONMENTAL_EFFECT_LABELS[id]).toBe(ENVIRONMENTAL_EFFECTS[id].label);
    }
  });

  // Les trois espaces d'ids doivent rester DISJOINTS : `statusEntry` retrouve le catalogue à partir
  // du seul id (chaînage `??`), donc une collision ferait taire silencieusement une entrée.
  it('les ids d’environnement ne collisionnent avec aucun autre catalogue', () => {
    const others = new Set<string>([...STATUS_EFFECT_IDS, ...SITUATIONAL_EFFECT_IDS]);
    for (const id of ENVIRONMENTAL_EFFECT_IDS) expect(others.has(id), id).toBe(false);
  });

  it('« Combat aquatique » (p. 215) : -5 en DEF + dé malus en attaque, non cumulatif', () => {
    const entry = ENVIRONMENTAL_EFFECTS['aquatic-combat'];
    expect(entry.label).toBe('Combat aquatique');
    expect(entry.sourcePage).toBe(215);
    // Verbatim du livre : la division du déplacement reste COMPORTEMENTALE (non chiffrée).
    expect(entry.effect).toContain('divisent leurs déplacements par deux');
    expect(entry.modifiers).toEqual({ derived: { def: -5 }, attackTestsMalusDie: true });
    expect(entry.stacking).toBeUndefined();
    expect(isStackingStatus('aquatic-combat')).toBe(false);
  });

  it('statusEntry retrouve une entrée d’environnement depuis son seul id', () => {
    expect(statusEntry('aquatic-combat')?.label).toBe('Combat aquatique');
  });

  it('resolveStatusModifiers (écran de MJ) : -5 en DEF + dé malus d’attaque seul', () => {
    const r = resolveStatusModifiers([{ id: 'aquatic-combat' }]);
    expect(r.derived).toEqual({ def: -5 });
    expect(r.attackTestsMalusDie).toBe(true);
    expect(r.allTestsMalusDie).toBe(false);
    expect(r.allTestsFlat).toBe(0);
    expect(r.damageDealt).toBe(0);
  });

  it('statusSheetImpact (fiche joueur) : DEF -5 ventilée, dé malus limité aux attaques', () => {
    const r = statusSheetImpact([{ id: 'aquatic-combat' }]);
    expect(r.mods).toEqual({ def: -5 });
    expect(r.modSources.def).toEqual([{ label: 'État : Combat aquatique', value: -5 }]);
    expect(r.attackTestsMalusDie).toEqual(['Combat aquatique']);
    expect(r.allTestsMalusDie).toEqual([]);
  });

  // Cumul avec un état du glossaire : les DEF s'additionnent, le dé malus d'attaque reste un drapeau.
  it('se cumule avec un état du glossaire (Renversé) : DEF -10, dé malus conservé', () => {
    const r = resolveStatusModifiers([{ id: 'aquatic-combat' }, { id: 'prone' }]);
    expect(r.derived.def).toBe(-10);
    expect(r.attackTestsMalusDie).toBe(true);
  });
});
