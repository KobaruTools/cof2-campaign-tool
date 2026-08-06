/**
 * Tests du générateur d'objets magiques (PER-308). L'aléa est injecté via un roller
 * SÉQUENTIEL déterministe : chaque appel `roll(sides)` renvoie la prochaine valeur de la
 * file, dans l'ordre EXACT où le générateur tire ses dés (documenté par catégorie).
 */
import { describe, expect, it } from 'vitest';
import {
  generateMagicItem,
  originAllowedForCategory,
  recommendedMagicLevel,
  rollOrigin,
  type GenerateRequest,
  type RollDie,
} from './magicItemGenerator';
import { magicLevel } from './magicItem';
import { isCustomItem, type EquipmentRef } from './types';

/** Roller déterministe : ignore `sides`, dépile les valeurs fournies dans l'ordre. */
function seq(...values: number[]): RollDie {
  let i = 0;
  return () => {
    if (i >= values.length) throw new Error(`seq épuisé après ${values.length} jets`);
    return values[i++];
  };
}

const req = (over: Partial<GenerateRequest>): GenerateRequest => ({
  characterLevel: 10,
  frame: 'classic',
  category: 'weapon',
  ...over,
});

describe('recommendedMagicLevel (table p. 244)', () => {
  it('lit la colonne du niveau du PJ selon le cadre', () => {
    expect(recommendedMagicLevel(7, 'classic')).toBe(2);
    expect(recommendedMagicLevel(20, 'classic')).toBe(6);
    expect(recommendedMagicLevel(20, 'high')).toBe(10);
    // « C » (consommable) et « 0 » (aucun) renvoient tous deux 0.
    expect(recommendedMagicLevel(1, 'high')).toBe(0);
    expect(recommendedMagicLevel(1, 'low')).toBe(0);
  });

  it('objet mineur = colonne du niveau ÷ 2', () => {
    // niveau 14 mineur → colonne 7 → classique = 2.
    expect(recommendedMagicLevel(14, 'classic', true)).toBe(2);
    // niveau 7 mineur → colonne 3 → classique = 1 (« une arme +1 », p. 245).
    expect(recommendedMagicLevel(7, 'classic', true)).toBe(1);
  });
});

describe('génération d’armes (p. 251-252)', () => {
  // Ordre des jets : type d6, arme d20, propriété? d6, [propriété d12].
  it('épée longue +3 affûtée (niveau 14 classique = 4)', () => {
    const g = generateMagicItem(
      req({ characterLevel: 14, category: 'weapon' }),
      seq(1 /* contact */, 8 /* épée longue */, 1 /* 1<4 → propriété */, 1 /* Affûtée */),
    );
    expect(isCustomItem(g.line)).toBe(false);
    const ref = g.line as EquipmentRef;
    expect(ref.itemId).toBe('epee-longue');
    expect(ref.magicBonus).toBe(3);
    expect(ref.magicProperties).toEqual([{ kind: 'sharp' }]);
    expect(g.magicLevel).toBe(4);
    expect(magicLevel(g.line)).toBe(4);
    expect(g.value).toBe(3200); // 4² × 200
    expect(g.summary).toContain('Épée longue');
  });

  it('sans propriété quand 1d6 ≥ niveau de magie → arme +N pure', () => {
    const g = generateMagicItem(
      req({ characterLevel: 20, frame: 'classic', category: 'weapon' }), // niveau de magie 6
      seq(4 /* distance */, 6 /* arc court */, 6 /* 6 < 6 faux → aucune propriété */),
    );
    const ref = g.line as EquipmentRef;
    expect(ref.itemId).toBe('arc-court');
    expect(ref.magicBonus).toBe(6);
    expect(ref.magicProperties).toBeUndefined();
    expect(g.magicLevel).toBe(6);
  });

  it('propriété « spéciale » (11-12) = deux propriétés, niveau de magie conservé', () => {
    const g = generateMagicItem(
      req({ characterLevel: 20, frame: 'high', category: 'weapon' }), // niveau de magie 10
      seq(
        1 /* contact */,
        8 /* épée longue */,
        1 /* 1<10 → propriété */,
        11 /* spécial → deux propriétés */,
        8 /* Feu (élément +2) */,
        9 /* Froid (élément +2) */,
      ),
    );
    const ref = g.line as EquipmentRef;
    expect(ref.magicProperties).toEqual([
      { kind: 'elemental', substance: 'fire' },
      { kind: 'elemental', substance: 'cold' },
    ]);
    // 2 éléments = 4 niveaux ; bonus = 10 − 4 = 6 ; total = 10.
    expect(ref.magicBonus).toBe(6);
    expect(g.magicLevel).toBe(10);
    expect(g.value).toBe(20000);
  });

  it('sceptre de magie (type d6 = 6) → objet libre à bonus magique', () => {
    const g = generateMagicItem(
      req({ characterLevel: 14, category: 'weapon' }), // niveau de magie 4
      seq(6 /* sceptre */),
    );
    expect(isCustomItem(g.line)).toBe(true);
    if (isCustomItem(g.line)) {
      expect(g.line.name).toBe('Sceptre de magie');
      expect(g.line.magicBonus).toBe(4);
    }
    expect(g.magicLevel).toBe(4);
  });

  it('« Autre arme » (d20 = 20) → objet libre enchanté', () => {
    const g = generateMagicItem(
      req({ characterLevel: 14, category: 'weapon' }),
      seq(1 /* contact */, 20 /* autre arme */, 6 /* pas de propriété */),
    );
    expect(isCustomItem(g.line)).toBe(true);
    if (isCustomItem(g.line)) expect(g.line.name).toBe('Autre arme');
  });
});

describe('génération d’objets défensifs (p. 253-254)', () => {
  // Ordre : armure d20, propriété? d6, [propriété d12].
  it('cotte de mailles +3 défense (niveau 14 classique = 4)', () => {
    const g = generateMagicItem(
      req({ characterLevel: 14, category: 'defense' }),
      seq(13 /* cotte de mailles */, 1 /* 1<4 propriété */, 2 /* Défense tier1 (+1) */),
    );
    const ref = g.line as EquipmentRef;
    expect(ref.itemId).toBe('cotte-de-mailles');
    expect(ref.magicDef).toBe(3);
    expect(ref.magicProperties).toEqual([{ kind: 'defense', tier: 1 }]);
    expect(g.magicLevel).toBe(4);
    expect(g.value).toBe(3200);
  });

  it('anneau de protection (d20 = 1) → objet libre à magicDef', () => {
    const g = generateMagicItem(
      req({ characterLevel: 14, category: 'defense' }),
      seq(1 /* anneau */, 6 /* pas de propriété */),
    );
    expect(isCustomItem(g.line)).toBe(true);
    if (isCustomItem(g.line)) {
      expect(g.line.name).toBe('Anneau de protection');
      expect(g.line.magicDef).toBe(4);
    }
  });

  it('résistance au feu porte une valeur X par défaut', () => {
    const g = generateMagicItem(
      req({ characterLevel: 14, category: 'defense' }),
      seq(6 /* cuir simple */, 1 /* propriété */, 7 /* Résistance feu */),
    );
    const ref = g.line as EquipmentRef;
    expect(ref.magicProperties).toEqual([{ kind: 'resistance', substance: 'fire', amount: 5 }]);
  });
});

describe('génération de potions (p. 248-249)', () => {
  it('potion de soins (type d6 = 1, d6 = 6) → Délivrance, niveau de magie 0', () => {
    const g = generateMagicItem(req({ category: 'potion' }), seq(1, 6));
    expect(isCustomItem(g.line)).toBe(true);
    if (isCustomItem(g.line)) expect(g.line.name).toBe('Potion : Délivrance (Prêtre)');
    expect(g.magicLevel).toBe(0);
    expect(g.value).toBe(0);
  });

  it('potion rare (type d6 = 6, d20 = 6) → Peau d’écorce', () => {
    const g = generateMagicItem(req({ category: 'potion' }), seq(6, 6));
    if (isCustomItem(g.line)) expect(g.line.name).toContain("Peau d’écorce");
  });
});

describe('génération de parchemins et baguettes (p. 249-250)', () => {
  it('parchemin (voie d20 = 16, rang d6 = 1, mineur) → foi rang 1, niveau 0', () => {
    const g = generateMagicItem(req({ category: 'scroll', minor: true }), seq(16, 1));
    if (isCustomItem(g.line)) {
      expect(g.line.name).toBe('Parchemin : Prêtre - Voie de la foi (rang 1)');
    }
    expect(g.magicLevel).toBe(0);
  });

  it('baguette ≥ 30 charges → niveau de magie = rang', () => {
    // voie d20=16, rang d6=6 (moyen → 5), charges 20 + 15 = 35 ≥ 30.
    const g = generateMagicItem(req({ category: 'wand', minor: false }), seq(16, 6, 20, 15));
    expect(g.magicLevel).toBe(5);
    expect(g.value).toBe(5000);
    if (isCustomItem(g.line)) expect(g.line.charges).toEqual({ max: 35 });
  });

  it('baguette < 30 charges → niveau de magie = rang ÷ 2 (arrondi inférieur)', () => {
    const g = generateMagicItem(req({ category: 'wand', minor: false }), seq(16, 6, 10, 10));
    expect(g.magicLevel).toBe(2); // floor(5 / 2)
    expect(g.value).toBe(800);
  });
});

describe('génération d’objets de pouvoir (p. 255)', () => {
  it('rang d8 = 8 → rang 5 ; profil d20 = 1 → Arquebusier', () => {
    const g = generateMagicItem(
      req({ characterLevel: 20, frame: 'high', category: 'power' }),
      seq(8, 1),
    );
    if (isCustomItem(g.line)) {
      expect(g.line.name).toBe('Objet de pouvoir : Arquebusier (rang 5)');
    }
    expect(g.magicLevel).toBe(5);
    expect(g.value).toBe(5000);
  });

  it('le rang est plafonné au niveau de magie recommandé', () => {
    // niveau 5 classique → recommandé 1 ; rang d8=8 (→5) plafonné à 1.
    const g = generateMagicItem(req({ characterLevel: 5, frame: 'classic', category: 'power' }), seq(8, 1));
    expect(g.magicLevel).toBe(1);
    expect(g.value).toBe(200);
  });
});

describe('origine narrative (PER-309, table p. 247)', () => {
  it('rollOrigin lit les trois colonnes sur trois d10 indépendants', () => {
    // 8 → Les profondeurs / Époque du Roi-Sorcier / Dragons.
    const origin = rollOrigin(seq(8, 8, 8));
    expect(origin.provenance).toBe('Les profondeurs');
    expect(origin.epoch).toBe('Époque du Roi-Sorcier');
    expect(origin.people).toBe('Dragons');
    expect(origin.text).toContain('Les profondeurs');
    expect(origin.text).toContain('Dragons');
    expect(origin.text).toContain('p. 247');
    expect(origin.rolls.map((r) => r.label)).toEqual(['Provenance', 'Époque', 'Peuple']);
  });

  it('les consommables ne sont pas adaptés (p. 247, NB) ; baguette autorisée', () => {
    expect(originAllowedForCategory('potion')).toBe(false);
    expect(originAllowedForCategory('scroll')).toBe(false);
    expect(originAllowedForCategory('wand')).toBe(true);
    expect(originAllowedForCategory('weapon')).toBe(true);
    expect(originAllowedForCategory('defense')).toBe(true);
    expect(originAllowedForCategory('power')).toBe(true);
  });

  it('arme du catalogue : la légende va dans overrides.description', () => {
    // épée longue (niveau 14 classique) sans propriété, puis origine 4/5/8.
    const g = generateMagicItem(
      req({ characterLevel: 14, category: 'weapon', withOrigin: true }),
      seq(1 /* contact */, 8 /* épée longue */, 6 /* pas de propriété */, 4, 5, 8),
    );
    expect(isCustomItem(g.line)).toBe(false);
    const ref = g.line as EquipmentRef;
    expect(ref.itemId).toBe('epee-longue');
    expect(ref.magicBonus).toBe(4); // origine n'altère aucune stat de règle
    expect(ref.overrides?.description).toContain('Grand Nord');
    expect(ref.overrides?.description).toContain('Apogée d’Anathazerïn');
    expect(ref.overrides?.description).toContain('Dragons');
    expect(g.origin).toBeDefined();
    expect(g.origin?.provenance).toBe('Grand Nord');
    // Les trois d10 d'origine sont journalisés APRÈS les jets de l'objet.
    expect(g.rolls.slice(-3).map((r) => r.label)).toEqual(['Provenance', 'Époque', 'Peuple']);
  });

  it('objet libre : la légende va dans details', () => {
    // « Autre arme » (d20 = 20) → objet libre ; origine 2/2/2 → Nains.
    const g = generateMagicItem(
      req({ characterLevel: 14, category: 'weapon', withOrigin: true }),
      seq(1 /* contact */, 20 /* autre arme */, 6 /* pas de propriété */, 2, 2, 2),
    );
    expect(isCustomItem(g.line)).toBe(true);
    if (isCustomItem(g.line)) expect(g.line.details).toContain('Nains');
    expect(g.origin?.people).toBe('Nains');
  });

  it('baguette : origine autorisée, légende ajoutée aux details existants', () => {
    // baguette (voie 16, rang 6, charges 20+15) puis origine 1/1/1 → Locale/Post Monastir/Humains.
    const g = generateMagicItem(
      req({ category: 'wand', minor: false, withOrigin: true }),
      seq(16, 6, 20, 15, 1, 1, 1),
    );
    expect(isCustomItem(g.line)).toBe(true);
    if (isCustomItem(g.line)) {
      expect(g.line.details).toContain('charges'); // le détail d'origine baguette est conservé
      expect(g.line.details).toContain('Humains'); // et la légende d'origine ajoutée
    }
    expect(g.origin?.provenance).toBe('Locale');
  });

  it('potion : origine ignorée même si demandée (non adaptée, p. 247)', () => {
    const g = generateMagicItem(req({ category: 'potion', withOrigin: true }), seq(1, 6));
    expect(g.origin).toBeUndefined();
    if (isCustomItem(g.line)) expect(g.line.details ?? '').not.toContain('Origine');
  });

  it('parchemin : origine ignorée même si demandée', () => {
    const g = generateMagicItem(req({ category: 'scroll', minor: true, withOrigin: true }), seq(16, 1));
    expect(g.origin).toBeUndefined();
    if (isCustomItem(g.line)) expect(g.line.details ?? '').not.toContain('Origine');
  });

  it('sans withOrigin : aucune origine, aucun jet supplémentaire', () => {
    const g = generateMagicItem(
      req({ characterLevel: 14, category: 'weapon' }),
      seq(1, 8, 6), // strictement les jets de l'arme, la file est épuisée après
    );
    expect(g.origin).toBeUndefined();
  });
});
