import { describe, expect, it } from 'vitest';
import {
  BENEFICIAL_EFFECT_IDS,
  BENEFICIAL_EFFECTS,
  BENEFICIAL_EFFECT_LABELS,
  ENVIRONMENTAL_EFFECT_IDS,
  SITUATIONAL_EFFECT_IDS,
  STATUS_EFFECT_IDS,
} from './schema';
import { featureById } from './index';
import {
  isStackingStatus,
  resolveStatusModifiers,
  statusEntry,
  statusMaxIntensity,
  statusSheetImpact,
} from '@/lib/character/statusEffects';

// Catalogue des BUFFS DE GROUPE (PER-104) : quatrième famille, la seule BÉNÉFIQUE — un effet que le
// porteur confère à « ses alliés et lui » (Chant des héros p. 67, Bénédiction p. 124).
describe('BENEFICIAL_EFFECTS (catalogue)', () => {
  it('chaque id a un libellé + un effet verbatim + une page source valide', () => {
    for (const id of BENEFICIAL_EFFECT_IDS) {
      const entry = BENEFICIAL_EFFECTS[id];
      expect(entry, id).toBeDefined();
      expect(entry.label.trim().length, `${id}.label`).toBeGreaterThan(0);
      expect(entry.effect.trim().length, `${id}.effect`).toBeGreaterThan(0);
      expect(entry.sourcePage, `${id}.sourcePage`).toBeGreaterThan(0);
    }
  });

  it('BENEFICIAL_EFFECT_LABELS est dérivé du catalogue', () => {
    for (const id of BENEFICIAL_EFFECT_IDS) {
      expect(BENEFICIAL_EFFECT_LABELS[id]).toBe(BENEFICIAL_EFFECTS[id].label);
    }
  });

  // Les QUATRE espaces d'ids doivent rester DISJOINTS : `statusEntry` retrouve le catalogue à partir
  // du seul id (chaînage `??`), donc une collision ferait taire silencieusement une entrée.
  it('les ids bénéfiques ne collisionnent avec aucun autre catalogue', () => {
    const others = new Set<string>([
      ...STATUS_EFFECT_IDS,
      ...SITUATIONAL_EFFECT_IDS,
      ...ENVIRONMENTAL_EFFECT_IDS,
    ]);
    for (const id of BENEFICIAL_EFFECT_IDS) expect(others.has(id), id).toBe(false);
  });

  it('tout buff de groupe porte bien `scope: group`', () => {
    for (const id of BENEFICIAL_EFFECT_IDS) expect(BENEFICIAL_EFFECTS[id].scope, id).toBe('group');
  });

  it('« Chant des héros » (p. 67) : +1 à tous les tests, palier +2 au rang 5', () => {
    const entry = BENEFICIAL_EFFECTS['heroes-song'];
    expect(entry.label).toBe('Chant des héros');
    expect(entry.sourcePage).toBe(67);
    // Verbatim du BARDE : « à tous leurs tests », sans la restriction du prêtre.
    expect(entry.effect).toContain('un bonus de +1 à tous leurs tests pendant un nombre de minutes');
    expect(entry.effect).toContain('Le bonus passe à +2 au rang 5.');
    expect(entry.modifiers).toEqual({ allTestsFlat: 1 });
    expect(entry.stacking).toEqual({ max: 2 });
    expect(isStackingStatus('heroes-song')).toBe(true);
    expect(statusMaxIntensity('heroes-song')).toBe(2);
  });

  it('« Bénédiction » (p. 124) : même chiffrage, verbatim DISTINCT du barde', () => {
    const entry = BENEFICIAL_EFFECTS.blessing;
    expect(entry.label).toBe('Bénédiction');
    expect(entry.sourcePage).toBe(124);
    // Verbatim du PRÊTRE : « tests de caractéristique et d'attaque ». Jamais fusionné avec le barde.
    expect(entry.effect).toContain("tests de caractéristique et d'attaque");
    expect(entry.effect).not.toBe(BENEFICIAL_EFFECTS['heroes-song'].effect);
    expect(entry.modifiers).toEqual({ allTestsFlat: 1 });
    expect(entry.stacking).toEqual({ max: 2 });
  });

  it('statusEntry retrouve un buff de groupe depuis son seul id', () => {
    expect(statusEntry('heroes-song')?.label).toBe('Chant des héros');
    expect(statusEntry('blessing')?.label).toBe('Bénédiction');
  });

  it('resolveStatusModifiers (écran de MJ) : +1 au rang 1, +2 à l’intensité 2', () => {
    expect(resolveStatusModifiers([{ id: 'heroes-song' }]).allTestsFlat).toBe(1);
    expect(resolveStatusModifiers([{ id: 'heroes-song', intensity: 2 }]).allTestsFlat).toBe(2);
    // Plafonné à 2 paliers : une intensité 3 relue de travers ne donne pas +3.
    expect(resolveStatusModifiers([{ id: 'blessing', intensity: 3 }]).allTestsFlat).toBe(2);
  });

  // Le buff ANNULE le malus, sans traitement particulier : les deux passent par `allTestsFlat`.
  it('se compense avec un malus plat (Attaque invalidante ×1)', () => {
    const r = resolveStatusModifiers([{ id: 'heroes-song' }, { id: 'invalidating-attack' }]);
    expect(r.allTestsFlat).toBe(0);
    expect(r.damageDealt).toBe(-1);
  });
});

// Câblage DONNÉES → capacités : c'est `Feature.groupBuffIds` qui débloque la puce dans la palette.
describe('groupBuffIds (capacités porteuses)', () => {
  it('Chant des héros est déclaré sur musicien-r1 (p. 67)', () => {
    expect(featureById.get('musicien-r1')?.groupBuffIds).toEqual(['heroes-song']);
  });

  it('Bénédiction est déclarée sur priere-r1 (p. 124)', () => {
    expect(featureById.get('priere-r1')?.groupBuffIds).toEqual(['blessing']);
  });

  it('tout `groupBuffIds` déclaré pointe vers une entrée du catalogue', () => {
    const known = new Set<string>(BENEFICIAL_EFFECT_IDS);
    for (const feature of featureById.values()) {
      for (const id of feature.groupBuffIds ?? []) {
        expect(known.has(id), `${feature.id} → ${id}`).toBe(true);
      }
    }
  });
});

// VENTILATION vers la fiche (PER-104, lot 2) : un « +1 à tous les tests » doit se voir à la fois sur
// les tests de CARACTÉRISTIQUE (canal `abilityTestBonus`, rendu par `TestDomainsPanel`) et sur les
// trois jets d'ATTAQUE — jusqu'ici `allTestsFlat` ne retombait que sur les attaques.
describe('statusSheetImpact — buff de groupe sur la fiche', () => {
  // Un buff se ventile sous son PROPRE nom (« Chant des héros +1 »), sans le préfixe « État : »
  // réservé aux effets subis : ce n'est pas un état préjudiciable.
  it('Chant des héros +1 : les trois attaques ET les tests de carac', () => {
    const r = statusSheetImpact([{ id: 'heroes-song' }]);
    expect(r.mods).toEqual({ meleeAttack: 1, rangedAttack: 1, magicAttack: 1 });
    expect(r.modSources.meleeAttack).toEqual([{ label: 'Chant des héros', value: 1 }]);
    expect(r.abilityTestSources).toEqual([
      { id: 'heroes-song', label: 'Chant des héros', value: 1 },
    ]);
    expect(r.allTestsFlat).toBe(1);
  });

  it('au rang 5 (intensité 2), le palier vaut +2 partout', () => {
    const r = statusSheetImpact([{ id: 'blessing', intensity: 2 }]);
    expect(r.mods).toEqual({ meleeAttack: 2, rangedAttack: 2, magicAttack: 2 });
    expect(r.abilityTestSources).toEqual([{ id: 'blessing', label: 'Bénédiction', value: 2 }]);
  });

  // Un MALUS plat se ventile désormais AUSSI vers les tests de carac (il manquait) : « -1 à tous les
  // tests » de l'Attaque invalidante ne frappait que les attaques.
  it('un malus plat se ventile lui aussi vers les tests de carac', () => {
    const r = statusSheetImpact([{ id: 'invalidating-attack', intensity: 2 }]);
    expect(r.abilityTestSources).toEqual([
      { id: 'invalidating-attack', label: 'État : Attaque invalidante', value: -2 },
    ]);
    expect(r.mods.meleeAttack).toBe(-2);
  });

  it('buff et malus se compensent, chacun gardant sa ligne dans le détail « i »', () => {
    const r = statusSheetImpact([{ id: 'heroes-song' }, { id: 'invalidating-attack' }]);
    expect(r.abilityTestSources).toEqual([
      { id: 'heroes-song', label: 'Chant des héros', value: 1 },
      { id: 'invalidating-attack', label: 'État : Attaque invalidante', value: -1 },
    ]);
    // Total nul → la stat n'apparaît plus dans `mods` (on n'expose que les totaux non nuls).
    expect(r.mods.meleeAttack).toBeUndefined();
    expect(r.allTestsFlat).toBe(0);
  });

  it('un état sans malus plat ne produit aucune ventilation de test de carac', () => {
    expect(statusSheetImpact([{ id: 'prone' }]).abilityTestSources).toEqual([]);
  });
});
