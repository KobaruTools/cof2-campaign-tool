import { describe, expect, it } from 'vitest';
import { SITUATIONAL_EFFECT_IDS, STATUS_EFFECTS, STATUS_EFFECT_IDS } from '@/data/schema';
import {
  clampIntensity,
  clampStatusRounds,
  effectiveStatuses,
  hpAutoStatuses,
  isStackingStatus,
  isStatusExpired,
  resolveStatusModifiers,
  statusEntry,
  statusMaxIntensity,
  statusRemainingRounds,
  statusSheetImpact,
  untilRoundFor,
  HP_WEAKENED_REASON,
  STATUS_DURATION_MAX,
} from './statusEffects';

describe('catalogues — cohérence des modificateurs (PER-277)', () => {
  it('conserve le verbatim inchangé (part comportementale)', () => {
    expect(STATUS_EFFECTS.weakened.effect).toBe('Dé malus à tous les tests.');
    expect(STATUS_EFFECTS.blinded.effect).toContain('-10 en attaque à distance');
  });

  it('les 10 états du glossaire sont BINAIRES (aucun cumul)', () => {
    for (const id of STATUS_EFFECT_IDS) {
      expect(isStackingStatus(id)).toBe(false);
      expect(statusMaxIntensity(id)).toBe(1);
    }
  });

  it('marque Aveuglé : -5 (Init/DEF/contact/magie), -10 à distance', () => {
    expect(STATUS_EFFECTS.blinded.modifiers?.derived).toEqual({
      initiative: -5,
      def: -5,
      meleeAttack: -5,
      magicAttack: -5,
      rangedAttack: -10,
    });
  });

  it('Affaibli = dé malus à tous les tests, sans modificateur dérivé', () => {
    expect(STATUS_EFFECTS.weakened.modifiers).toEqual({ allTestsMalusDie: true });
  });

  it('Immobilisé = dé malus aux tests d’attaque seulement', () => {
    expect(STATUS_EFFECTS.immobilized.modifiers).toEqual({ attackTestsMalusDie: true });
  });

  it('les états purement comportementaux n’ont aucune part chiffrée', () => {
    for (const id of ['winded', 'crippled', 'paralyzed', 'slowed'] as const) {
      expect(STATUS_EFFECTS[id].modifiers).toBeUndefined();
    }
  });

  it('Attaque invalidante = cumulatif -1/palier, plafond 3', () => {
    const entry = SITUATIONAL_EFFECT_IDS.map((id) => id)[0];
    expect(entry).toBe('invalidating-attack');
    expect(statusEntry('invalidating-attack')?.modifiers).toEqual({
      allTestsFlat: -1,
      damageDealt: -1,
    });
    expect(isStackingStatus('invalidating-attack')).toBe(true);
    expect(statusMaxIntensity('invalidating-attack')).toBe(3);
  });
});

describe('clampIntensity', () => {
  it('borne un état binaire à 1', () => {
    expect(clampIntensity('blinded', 5)).toBe(1);
    expect(clampIntensity('blinded', 0)).toBe(1);
  });

  it('borne un état cumulatif dans [1, plafond]', () => {
    expect(clampIntensity('invalidating-attack', 0)).toBe(1);
    expect(clampIntensity('invalidating-attack', 2)).toBe(2);
    expect(clampIntensity('invalidating-attack', 9)).toBe(3);
  });

  it('tronque les valeurs non entières et neutralise NaN', () => {
    expect(clampIntensity('invalidating-attack', 2.9)).toBe(2);
    expect(clampIntensity('invalidating-attack', Number.NaN)).toBe(1);
  });
});

describe('compteur de tours (PER-305)', () => {
  it('sans compteur, aucun tour restant à afficher (durée indéterminée)', () => {
    expect(statusRemainingRounds({ id: 'dazed' }, 5)).toBeUndefined();
    expect(isStatusExpired({ id: 'dazed' }, 5)).toBe(false);
  });

  it('compte la manche courante comme un tour restant, et décroît avec les manches', () => {
    // « Étourdi pendant 3 tours » posé à la manche 5 = manches 5, 6, 7 couvertes.
    const applied = { id: 'dazed' as const, untilRound: 7 };
    expect(statusRemainingRounds(applied, 5)).toBe(3);
    expect(statusRemainingRounds(applied, 6)).toBe(2);
    expect(statusRemainingRounds(applied, 7)).toBe(1);
    expect(statusRemainingRounds(applied, 8)).toBe(0);
  });

  it('reculer d’une manche remet le compteur juste (rien n’est décrémenté en dur)', () => {
    const applied = { id: 'dazed' as const, untilRound: 7 };
    expect(statusRemainingRounds(applied, 7)).toBe(1);
    expect(statusRemainingRounds(applied, 6)).toBe(2); // « Tour précédent » (PER-299)
  });

  it('un compteur dépassé reste à 0 (jamais négatif) et se signale expiré', () => {
    const applied = { id: 'dazed' as const, untilRound: 3 };
    expect(statusRemainingRounds(applied, 12)).toBe(0);
    expect(isStatusExpired(applied, 12)).toBe(true);
    expect(isStatusExpired(applied, 3)).toBe(false);
  });

  it('ignore un untilRound non fini (blob relu de travers)', () => {
    expect(statusRemainingRounds({ id: 'dazed', untilRound: Number.NaN }, 5)).toBeUndefined();
  });

  it('borne une durée à [1, plafond]', () => {
    expect(clampStatusRounds(0)).toBe(1);
    expect(clampStatusRounds(-4)).toBe(1);
    expect(clampStatusRounds(2.9)).toBe(2);
    expect(clampStatusRounds(999)).toBe(STATUS_DURATION_MAX);
    expect(clampStatusRounds(Number.NaN)).toBe(1);
  });

  it('untilRoundFor est la réciproque des tours restants', () => {
    expect(untilRoundFor(5, 3)).toBe(7);
    expect(untilRoundFor(5, 1)).toBe(5);
    for (const [round, remaining] of [
      [1, 1],
      [4, 2],
      [12, 9],
    ] as const) {
      expect(statusRemainingRounds({ id: 'dazed', untilRound: untilRoundFor(round, remaining) }, round)).toBe(
        remaining,
      );
    }
  });
});

describe('resolveStatusModifiers', () => {
  it('sans état = tout à zéro', () => {
    expect(resolveStatusModifiers([])).toEqual({
      derived: {},
      allTestsMalusDie: false,
      attackTestsMalusDie: false,
      allTestsFlat: 0,
      damageDealt: 0,
      testDomains: {},
    });
  });

  it('un état binaire injecte ses modificateurs dérivés tels quels', () => {
    const r = resolveStatusModifiers([{ id: 'blinded' }]);
    expect(r.derived).toEqual({
      initiative: -5,
      def: -5,
      meleeAttack: -5,
      magicAttack: -5,
      rangedAttack: -10,
    });
    expect(r.allTestsMalusDie).toBe(false);
  });

  it('somme les modificateurs dérivés de plusieurs états sur la même stat', () => {
    // Étourdi (DEF -5) + Renversé (DEF -5, attaques -5) → DEF -10.
    const r = resolveStatusModifiers([{ id: 'dazed' }, { id: 'prone' }]);
    expect(r.derived.def).toBe(-10);
    expect(r.derived.meleeAttack).toBe(-5);
  });

  it('agrège les drapeaux de dé malus (OU logique)', () => {
    const r = resolveStatusModifiers([{ id: 'weakened' }, { id: 'immobilized' }]);
    expect(r.allTestsMalusDie).toBe(true);
    expect(r.attackTestsMalusDie).toBe(true);
    expect(r.derived).toEqual({});
  });

  it('multiplie les malus plats cumulatifs par l’intensité (clampée)', () => {
    const r = resolveStatusModifiers([{ id: 'invalidating-attack', intensity: 3 }]);
    expect(r.allTestsFlat).toBe(-3);
    expect(r.damageDealt).toBe(-3);
  });

  it('clampe l’intensité au plafond du catalogue', () => {
    const r = resolveStatusModifiers([{ id: 'invalidating-attack', intensity: 10 }]);
    expect(r.allTestsFlat).toBe(-3);
  });

  it('intensité par défaut = 1 pour un cumulatif non précisé', () => {
    const r = resolveStatusModifiers([{ id: 'invalidating-attack' }]);
    expect(r.allTestsFlat).toBe(-1);
    expect(r.damageDealt).toBe(-1);
  });

  it('ignore une intensité fournie sur un état binaire', () => {
    const r = resolveStatusModifiers([{ id: 'dazed', intensity: 4 }]);
    expect(r.derived.def).toBe(-5);
  });

  it('n’expose pas les stats dérivées dont le total est nul', () => {
    const r = resolveStatusModifiers([{ id: 'winded' }]);
    expect(r.derived).toEqual({});
  });

  it('le compteur de tours ne pèse sur aucun chiffre (PER-305)', () => {
    // Un état expiré depuis longtemps chiffre EXACTEMENT comme un état sans compteur : le décompte
    // est un pense-bête de MJ, le retrait reste à sa main.
    expect(resolveStatusModifiers([{ id: 'dazed', untilRound: 1 }])).toEqual(
      resolveStatusModifiers([{ id: 'dazed' }]),
    );
  });
});

// États DÉDUITS des PV (p. 220) : « Un personnage ou une créature à 1 PV subit l'état préjudiciable
// affaibli. L'état affaibli disparaît dès que les PV repassent au-dessus de 1. »
describe('hpAutoStatuses', () => {
  it('déduit affaibli à exactement 1 PV', () => {
    expect(hpAutoStatuses(10, { hp: { lethal: 9, temp: 0 } })).toEqual([
      { id: 'weakened', origin: 'auto', autoReason: HP_WEAKENED_REASON },
    ]);
    // Manque mixte (létal + temporaire) qui laisse 1 PV : même conclusion.
    expect(hpAutoStatuses(10, { hp: { lethal: 4, temp: 5 } })).toHaveLength(1);
  });

  it('rien au-dessus de 1 PV (l’état s’efface dès que les PV remontent)', () => {
    expect(hpAutoStatuses(10, {})).toEqual([]);
    expect(hpAutoStatuses(10, { hp: { lethal: 8, temp: 0 } })).toEqual([]);
  });

  it('rien à 0 PV : « à terre » et « assommé » ne sont pas des états du glossaire', () => {
    expect(hpAutoStatuses(10, { hp: { lethal: 10, temp: 0 } })).toEqual([]);
    expect(hpAutoStatuses(10, { hp: { lethal: 0, temp: 10 } })).toEqual([]);
  });

  it('rien quand les PV max sont inconnus (bloc de créature non chargé)', () => {
    expect(hpAutoStatuses(0, {})).toEqual([]);
    expect(hpAutoStatuses(0, { hp: { lethal: 5, temp: 0 } })).toEqual([]);
  });
});

describe('effectiveStatuses', () => {
  it('marque la provenance de chaque état', () => {
    const merged = effectiveStatuses([{ id: 'blinded' }], hpAutoStatuses(10, { hp: { lethal: 9, temp: 0 } }));
    expect(merged).toEqual([
      { id: 'blinded', origin: 'manual' },
      { id: 'weakened', origin: 'auto', autoReason: HP_WEAKENED_REASON },
    ]);
  });

  it('l’état POSÉ l’emporte sur le même état déduit (aucun doublon d’id)', () => {
    const merged = effectiveStatuses(
      [{ id: 'weakened' }],
      hpAutoStatuses(10, { hp: { lethal: 9, temp: 0 } }),
    );
    expect(merged).toEqual([{ id: 'weakened', origin: 'manual' }]);
  });

  it('conserve l’intensité des états cumulatifs posés', () => {
    expect(effectiveStatuses([{ id: 'invalidating-attack', intensity: 2 }], [])).toEqual([
      { id: 'invalidating-attack', intensity: 2, origin: 'manual' },
    ]);
  });

  // Le sac de modificateurs se calcule sur la liste EFFECTIVE : un état déduit compte donc dans les
  // stats ajustées du tracker (ici, le dé malus à tous les tests de l'état affaibli).
  it('un état déduit compte dans les modificateurs résolus', () => {
    const merged = effectiveStatuses([], hpAutoStatuses(10, { hp: { lethal: 9, temp: 0 } }));
    expect(resolveStatusModifiers(merged).allTestsMalusDie).toBe(true);
  });
});

/* --------------------------------------------------------------------------- *
 * PER-359 — bonus limités à des DOMAINES de test, et DM infligés en POSITIF.
 * --------------------------------------------------------------------------- */

describe('PER-359 — bonus par domaine', () => {
  it('Sans peur ne bonifie QUE le domaine visé, jamais tous les tests', () => {
    const r = resolveStatusModifiers([{ id: 'fearless-rally', intensity: 3 }]);
    expect(r.testDomains).toEqual({ 'fear-resistance': 3 });
    // Le canal « tous les tests » reste intact : c'est toute la différence avec le Chant des héros.
    expect(r.allTestsFlat).toBe(0);
    expect(r.derived).toEqual({});
  });

  it('les trois domaines d’Argument de taille reçoivent la même valeur', () => {
    const r = resolveStatusModifiers([{ id: 'towering-argument', intensity: 2 }]);
    expect(r.testDomains).toEqual({ negotiation: 2, persuasion: 2, intimidation: 2 });
  });

  it('deux états visant le même domaine s’y additionnent', () => {
    const r = resolveStatusModifiers([
      { id: 'fearless-rally', intensity: 2 },
      { id: 'fearless-rally', intensity: 1 },
    ]);
    expect(r.testDomains['fear-resistance']).toBe(3);
  });

  it('l’Aura du chef de guerre porte un bonus de DM POSITIF, et +1 en DEF', () => {
    const r = resolveStatusModifiers([{ id: 'warlord-aura' }]);
    expect(r.damageDealt).toBe(1);
    expect(r.derived).toEqual({ def: 1 });
    // Au niveau 16 le palier double les deux canaux d'un coup.
    const r16 = resolveStatusModifiers([{ id: 'warlord-aura', intensity: 2 }]);
    expect(r16.damageDealt).toBe(2);
    expect(r16.derived).toEqual({ def: 2 });
  });

  it('un bonus de DM positif se compense avec le malus d’une attaque invalidante', () => {
    const r = resolveStatusModifiers([{ id: 'warlord-aura' }, { id: 'invalidating-attack' }]);
    expect(r.damageDealt).toBe(0);
  });

  it('Protéger un allié : +2 en DEF, valeur fixe non cumulable', () => {
    expect(resolveStatusModifiers([{ id: 'shield-ally' }]).derived).toEqual({ def: 2 });
    // Sans `stacking`, une intensité relue de travers reste ramenée à 1 palier.
    expect(resolveStatusModifiers([{ id: 'shield-ally', intensity: 5 }]).derived).toEqual({ def: 2 });
  });
});

describe('PER-359 — ventilation par domaine sur la fiche', () => {
  it('chaque domaine visé porte sa ligne de détail, avec qui l’a lancé', () => {
    const r = statusSheetImpact([
      { id: 'fearless-rally', intensity: 3, castBy: 'Mirielle' },
    ]);
    expect(r.testDomainSources).toEqual({
      'fear-resistance': [
        { id: 'fearless-rally', label: 'Sans peur', value: 3, castBy: 'Mirielle' },
      ],
    });
    // Un buff garde son propre nom : pas de préfixe « État : », réservé aux effets subis.
    expect(r.abilityTestSources).toEqual([]);
    expect(r.allTestsFlat).toBe(0);
  });

  it('sans lanceur identifié, la ligne existe sans mention de source', () => {
    const r = statusSheetImpact([{ id: 'towering-argument', intensity: 2 }]);
    expect(r.testDomainSources.negotiation).toEqual([
      { id: 'towering-argument', label: 'Argument de taille', value: 2 },
    ]);
    expect(r.testDomainSources.negotiation[0]).not.toHaveProperty('castBy');
  });

  it('l’état sans bonus de domaine ne crée aucune entrée', () => {
    expect(statusSheetImpact([{ id: 'heroes-song' }]).testDomainSources).toEqual({});
  });
});
