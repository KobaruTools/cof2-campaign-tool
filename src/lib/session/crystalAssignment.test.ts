/**
 * PER-360 — transport de l'attribution d'un cristal (voie des cristaux, p. 156).
 *
 * Le joueur NOTIFIE (rien à arbitrer : la règle autorise l'attribution « à n'importe quelle
 * distance »), et le client du MJ — seul auteur de `campaign_combat` — pose l'état sur le porteur.
 * Mêmes garanties que le renoncement à un buff (PER-358) : charge utile relue défensivement,
 * applicateur PUR et idempotent.
 */
import { describe, expect, it } from 'vitest';
import {
  applyCrystalAssignment,
  applyCrystalRelease,
  reviveCrystalAssignment,
  reviveCrystalRelease,
  setCrystalAssignment,
  type CrystalAssignment,
  type CrystalAssignmentMap,
} from './crystalAssignment';
import { EMPTY_COMBAT_STATE, type GmCombatState } from './combatState';

const CRYSTAL = 'cristal-bleu-nuit';
const MAGE = 'mage-1';
const ALLY = 'guerrier-1';
const OTHER = 'voleuse-1';

function assignment(over: Partial<CrystalAssignment> = {}): CrystalAssignment {
  return { sourceCharacterId: MAGE, crystalId: CRYSTAL, targetKey: ALLY, ...over };
}

describe('PER-360 — relecture d\'une attribution reçue du canal', () => {
  it('accepte une attribution complète', () => {
    expect(
      reviveCrystalAssignment({ sourceCharacterId: MAGE, crystalId: CRYSTAL, targetKey: ALLY }),
    ).toEqual({ sourceCharacterId: MAGE, crystalId: CRYSTAL, targetKey: ALLY });
  });

  it('ignore un `castBy` reçu : la source est résolue par le MJ, jamais annoncée par l\'émetteur', () => {
    expect(
      reviveCrystalAssignment({
        sourceCharacterId: MAGE,
        crystalId: CRYSTAL,
        targetKey: ALLY,
        castBy: 'Un autre joueur',
      }),
    ).not.toHaveProperty('castBy');
  });

  it('accepte une REPRISE (aucun porteur désigné) et normalise la clé vide en `null`', () => {
    expect(reviveCrystalAssignment({ sourceCharacterId: MAGE, crystalId: CRYSTAL, targetKey: null }))
      .toEqual({ sourceCharacterId: MAGE, crystalId: CRYSTAL, targetKey: null });
    expect(
      reviveCrystalAssignment({ sourceCharacterId: MAGE, crystalId: CRYSTAL, targetKey: '' })
        ?.targetKey,
    ).toBeNull();
  });

  it('refuse une charge utile illisible, sans source, ou portant un cristal inconnu', () => {
    expect(reviveCrystalAssignment(null)).toBeNull();
    expect(reviveCrystalAssignment('bleu nuit')).toBeNull();
    expect(reviveCrystalAssignment({ crystalId: CRYSTAL, targetKey: ALLY })).toBeNull();
    expect(reviveCrystalAssignment(assignment({ sourceCharacterId: '' }))).toBeNull();
    expect(
      reviveCrystalAssignment({ sourceCharacterId: MAGE, crystalId: 'heroes-song', targetKey: ALLY }),
    ).toBeNull();
    expect(
      reviveCrystalAssignment({ sourceCharacterId: MAGE, crystalId: 'cristal-du-futur', targetKey: ALLY }),
    ).toBeNull();
  });
});

describe('PER-360 — ce que le client du MJ applique à l\'état de combat', () => {
  it('pose le cristal sur le porteur désigné, avec le nom du JOUEUR qui l\'attribue', () => {
    const next = applyCrystalAssignment(EMPTY_COMBAT_STATE, assignment(), 'Mirielle');
    expect(next.statuses[ALLY]).toEqual([{ id: CRYSTAL, castBy: 'Mirielle' }]);
  });

  it('sans joueur identifié, aucune mention de source (jamais le nom du personnage)', () => {
    const next = applyCrystalAssignment(EMPTY_COMBAT_STATE, assignment());
    expect(next.statuses[ALLY]).toEqual([{ id: CRYSTAL }]);
  });

  it('ne pose AUCUNE durée : un cristal tourne jusqu\'à ce qu\'on le désactive', () => {
    const next = applyCrystalAssignment(EMPTY_COMBAT_STATE, assignment());
    expect(next.statuses[ALLY][0].untilRound).toBeUndefined();
    expect(next.statuses[ALLY][0].intensity).toBeUndefined();
  });

  it('réattribuer le déplace : un cristal n\'est jamais à deux endroits à la fois', () => {
    const posed = applyCrystalAssignment(EMPTY_COMBAT_STATE, assignment());
    const moved = applyCrystalAssignment(posed, assignment({ targetKey: OTHER }));
    expect(moved.statuses[ALLY]).toBeUndefined();
    expect(moved.statuses[OTHER]).toEqual([{ id: CRYSTAL }]);
  });

  it('reprendre son cristal (`targetKey` null) le retire de la table', () => {
    const posed = applyCrystalAssignment(EMPTY_COMBAT_STATE, assignment());
    const taken = applyCrystalAssignment(posed, assignment({ targetKey: null }));
    expect(taken.statuses[ALLY]).toBeUndefined();
  });

  it('laisse intacts les autres états du porteur, et les autres cristaux', () => {
    const state: GmCombatState = {
      ...EMPTY_COMBAT_STATE,
      statuses: { [ALLY]: [{ id: 'blinded' }, { id: 'cristal-violet' }] },
    };
    const next = applyCrystalAssignment(state, assignment());
    expect(next.statuses[ALLY]).toEqual([
      { id: 'blinded' },
      { id: 'cristal-violet' },
      { id: CRYSTAL },
    ]);
  });

  it('rejouer le MÊME message ne change rien (idempotent, même référence)', () => {
    const posed = applyCrystalAssignment(EMPTY_COMBAT_STATE, assignment());
    expect(applyCrystalAssignment(posed, assignment())).toBe(posed);
    // Reprendre un cristal que personne ne porte est également sans effet.
    expect(
      applyCrystalAssignment(EMPTY_COMBAT_STATE, assignment({ targetKey: null })),
    ).toBe(EMPTY_COMBAT_STATE);
  });
});

describe('PER-360 — le porteur rend le cristal qu\'on lui a confié', () => {
  it('relit un abandon, refuse une charge utile sans porteur ou au cristal inconnu', () => {
    expect(reviveCrystalRelease({ crystalId: CRYSTAL, holderKey: ALLY })).toEqual({
      crystalId: CRYSTAL,
      holderKey: ALLY,
    });
    expect(reviveCrystalRelease(null)).toBeNull();
    expect(reviveCrystalRelease({ crystalId: CRYSTAL })).toBeNull();
    expect(reviveCrystalRelease({ crystalId: CRYSTAL, holderKey: '' })).toBeNull();
    expect(reviveCrystalRelease({ crystalId: 'heroes-song', holderKey: ALLY })).toBeNull();
  });

  it('retire le cristal de la table sans toucher aux autres états du porteur', () => {
    const state: GmCombatState = {
      ...EMPTY_COMBAT_STATE,
      statuses: { [ALLY]: [{ id: 'blinded' }, { id: CRYSTAL, castBy: 'Mirielle' }] },
    };
    const next = applyCrystalRelease(state, { crystalId: CRYSTAL, holderKey: ALLY });
    expect(next.statuses[ALLY]).toEqual([{ id: 'blinded' }]);
  });

  it('rendre un cristal que personne ne porte ne change rien (même référence)', () => {
    expect(
      applyCrystalRelease(EMPTY_COMBAT_STATE, { crystalId: CRYSTAL, holderKey: ALLY }),
    ).toBe(EMPTY_COMBAT_STATE);
  });
});

describe('PER-360 — carte locale des attributions du mage', () => {
  const map: CrystalAssignmentMap = { [CRYSTAL]: ALLY };

  it('confier, réattribuer, reprendre', () => {
    expect(setCrystalAssignment({}, CRYSTAL, ALLY)).toEqual({ [CRYSTAL]: ALLY });
    expect(setCrystalAssignment(map, CRYSTAL, OTHER)).toEqual({ [CRYSTAL]: OTHER });
    expect(setCrystalAssignment(map, CRYSTAL, null)).toEqual({});
  });

  it('sans changement, même référence (ni écriture de store ni rendu inutiles)', () => {
    expect(setCrystalAssignment(map, CRYSTAL, ALLY)).toBe(map);
    expect(setCrystalAssignment(map, 'cristal-violet', null)).toBe(map);
  });
});
