/**
 * PER-363 — transport de l'assignation d'un passager (Monture fantôme, voie de l'invocation
 * majeure, p. 158).
 *
 * Même patron que l'attribution d'un cristal (PER-360) : le joueur NOTIFIE (rien à arbitrer), et le
 * client du MJ — seul auteur de `campaign_combat` — pose l'état sur le passager désigné. En plus
 * simple : un seul état possible (pas de variantes), et rien à propager côté mage (aucun bonus).
 */
import { describe, expect, it } from 'vitest';
import { MOUNT_PASSENGER_STATUS_IDS } from '@/data/mountPassengerStatuses';
import {
  applyMountPassengerAssignment,
  applyMountPassengerRelease,
  reviveMountPassengerAssignment,
  reviveMountPassengerRelease,
  setMountPassengerAssignment,
  type MountPassengerAssignment,
  type MountPassengerAssignmentMap,
} from './mountPassengerAssignment';
import { EMPTY_COMBAT_STATE, type GmCombatState } from './combatState';

const PASSENGER_STATUS = MOUNT_PASSENGER_STATUS_IDS[0];
const MAGE = 'mage-1';
const ALLY = 'guerrier-1';
const OTHER = 'voleuse-1';

function assignment(over: Partial<MountPassengerAssignment> = {}): MountPassengerAssignment {
  return { sourceCharacterId: MAGE, targetKey: ALLY, ...over };
}

describe("PER-363 — relecture d'une assignation reçue du canal", () => {
  it('accepte une assignation complète', () => {
    expect(reviveMountPassengerAssignment({ sourceCharacterId: MAGE, targetKey: ALLY })).toEqual({
      sourceCharacterId: MAGE,
      targetKey: ALLY,
    });
  });

  it("ignore un `castBy` reçu : la source est résolue par le MJ, jamais annoncée par l'émetteur", () => {
    expect(
      reviveMountPassengerAssignment({ sourceCharacterId: MAGE, targetKey: ALLY, castBy: 'Un autre joueur' }),
    ).not.toHaveProperty('castBy');
  });

  it('accepte un retrait (aucun passager désigné) et normalise la clé vide en `null`', () => {
    expect(reviveMountPassengerAssignment({ sourceCharacterId: MAGE, targetKey: null })).toEqual({
      sourceCharacterId: MAGE,
      targetKey: null,
    });
    expect(reviveMountPassengerAssignment({ sourceCharacterId: MAGE, targetKey: '' })?.targetKey).toBeNull();
  });

  it('refuse une charge utile illisible ou sans source', () => {
    expect(reviveMountPassengerAssignment(null)).toBeNull();
    expect(reviveMountPassengerAssignment('n’importe quoi')).toBeNull();
    expect(reviveMountPassengerAssignment({ targetKey: ALLY })).toBeNull();
    expect(reviveMountPassengerAssignment(assignment({ sourceCharacterId: '' }))).toBeNull();
  });
});

describe("PER-363 — ce que le client du MJ applique à l'état de combat", () => {
  it("pose l'état sur le passager désigné, avec le nom du JOUEUR qui l'assigne", () => {
    const next = applyMountPassengerAssignment(EMPTY_COMBAT_STATE, assignment(), 'Mirielle');
    expect(next.statuses[ALLY]).toEqual([{ id: PASSENGER_STATUS, castBy: 'Mirielle' }]);
  });

  it('sans joueur identifié, aucune mention de source', () => {
    const next = applyMountPassengerAssignment(EMPTY_COMBAT_STATE, assignment());
    expect(next.statuses[ALLY]).toEqual([{ id: PASSENGER_STATUS }]);
  });

  it("ne pose AUCUNE durée", () => {
    const next = applyMountPassengerAssignment(EMPTY_COMBAT_STATE, assignment());
    expect(next.statuses[ALLY][0].untilRound).toBeUndefined();
    expect(next.statuses[ALLY][0].intensity).toBeUndefined();
  });

  it("réassigner le déplace : un seul passager à la fois", () => {
    const posed = applyMountPassengerAssignment(EMPTY_COMBAT_STATE, assignment());
    const moved = applyMountPassengerAssignment(posed, assignment({ targetKey: OTHER }));
    expect(moved.statuses[ALLY]).toBeUndefined();
    expect(moved.statuses[OTHER]).toEqual([{ id: PASSENGER_STATUS }]);
  });

  it('retirer le passager (`targetKey` null) le retire de la table', () => {
    const posed = applyMountPassengerAssignment(EMPTY_COMBAT_STATE, assignment());
    const taken = applyMountPassengerAssignment(posed, assignment({ targetKey: null }));
    expect(taken.statuses[ALLY]).toBeUndefined();
  });

  it('laisse intacts les autres états du passager', () => {
    const state: GmCombatState = {
      ...EMPTY_COMBAT_STATE,
      statuses: { [ALLY]: [{ id: 'blinded' }] },
    };
    const next = applyMountPassengerAssignment(state, assignment());
    expect(next.statuses[ALLY]).toEqual([{ id: 'blinded' }, { id: PASSENGER_STATUS }]);
  });

  it('rejouer le MÊME message ne change rien (idempotent, même référence)', () => {
    const posed = applyMountPassengerAssignment(EMPTY_COMBAT_STATE, assignment());
    expect(applyMountPassengerAssignment(posed, assignment())).toBe(posed);
    expect(applyMountPassengerAssignment(EMPTY_COMBAT_STATE, assignment({ targetKey: null }))).toBe(
      EMPTY_COMBAT_STATE,
    );
  });
});

describe('PER-363 — le passager descend de lui-même', () => {
  it('relit un « je descends », refuse une charge utile sans passager', () => {
    expect(reviveMountPassengerRelease({ holderKey: ALLY })).toEqual({ holderKey: ALLY });
    expect(reviveMountPassengerRelease(null)).toBeNull();
    expect(reviveMountPassengerRelease({})).toBeNull();
    expect(reviveMountPassengerRelease({ holderKey: '' })).toBeNull();
  });

  it("retire l'état de la table sans toucher aux autres états du passager", () => {
    const state: GmCombatState = {
      ...EMPTY_COMBAT_STATE,
      statuses: { [ALLY]: [{ id: 'blinded' }, { id: PASSENGER_STATUS, castBy: 'Mirielle' }] },
    };
    const next = applyMountPassengerRelease(state);
    expect(next.statuses[ALLY]).toEqual([{ id: 'blinded' }]);
  });

  it('descendre alors que personne ne monte ne change rien (même référence)', () => {
    expect(applyMountPassengerRelease(EMPTY_COMBAT_STATE)).toBe(EMPTY_COMBAT_STATE);
  });
});

describe('PER-363 — carte locale des assignations du mage', () => {
  const map: MountPassengerAssignmentMap = { [MAGE]: ALLY };

  it('assigner, réassigner, retirer', () => {
    expect(setMountPassengerAssignment({}, MAGE, ALLY)).toEqual({ [MAGE]: ALLY });
    expect(setMountPassengerAssignment(map, MAGE, OTHER)).toEqual({ [MAGE]: OTHER });
    expect(setMountPassengerAssignment(map, MAGE, null)).toEqual({});
  });

  it('sans changement, même référence', () => {
    expect(setMountPassengerAssignment(map, MAGE, ALLY)).toBe(map);
    expect(setMountPassengerAssignment(map, 'autre-mage', null)).toBe(map);
  });
});
