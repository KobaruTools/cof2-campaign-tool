/**
 * PER-363 — ce que le client du MJ EXÉCUTE, assignation comme retrait (Monture fantôme, p. 158).
 *
 * Même patron que `crystalAssignment.test.ts` (PER-360), en plus simple : rien à écrire sur la
 * fiche du mage (aucun bonus ne quitte/rejoint personne), tout passe par l'état de combat partagé.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createBlankCharacter } from '@/lib/character/factory';

vi.mock('./players', () => ({
  usePlayersStore: {
    getState: () => ({ players: [{ id: 'joueur-1', campaignId: 'campagne-1', name: 'Joueur — Orvène' }] }),
  },
}));

import { useCampaignCombatStore } from './campaignCombat';
import { useCharactersStore } from './characters';
import {
  executeMountPassengerAssignment,
  executeMountPassengerRelease,
  useMountPassengerAssignmentStore,
} from './mountPassengerAssignment';
import type { Character } from '@/lib/character/types';

const CAMPAIGN = 'campagne-1';
const PLAYER = 'joueur-1';
const NOW = '2026-01-01T00:00:00.000Z';

let mage: Character;
let ally: Character;

beforeEach(() => {
  mage = { ...createBlankCharacter({ now: NOW }), id: 'mage-1', campaignId: CAMPAIGN, playerId: PLAYER };
  ally = { ...createBlankCharacter({ now: NOW }), id: 'guerrier-1', campaignId: CAMPAIGN, playerId: 'joueur-2' };
  useCharactersStore.setState({ characters: [mage, ally] });
  useCampaignCombatStore.setState({ byCampaign: {}, hydrated: {} });
  useMountPassengerAssignmentStore.setState({ byMage: {} });
});

describe('PER-363 — le MJ exécute une assignation', () => {
  it('pose l’état sur le passager, au nom du JOUEUR qui le désigne', () => {
    executeMountPassengerAssignment(CAMPAIGN, { sourceCharacterId: 'mage-1', targetKey: 'guerrier-1' });
    expect(useCampaignCombatStore.getState().byCampaign[CAMPAIGN]?.statuses['guerrier-1']).toEqual([
      { id: 'monture-fantome-passager', castBy: 'Joueur — Orvène' },
    ]);
  });
});

describe('PER-363 — le MJ exécute un retrait', () => {
  beforeEach(() => {
    executeMountPassengerAssignment(CAMPAIGN, { sourceCharacterId: 'mage-1', targetKey: 'guerrier-1' });
  });

  it('lève l’état du passager (retour de recette) sans toucher à la fiche de personne', () => {
    executeMountPassengerRelease(CAMPAIGN, { holderKey: 'guerrier-1' });
    const combat = useCampaignCombatStore.getState().byCampaign[CAMPAIGN];
    expect(combat?.statuses['guerrier-1']).toBeUndefined();
    // Rien n'a été écrit sur la fiche du mage ni de l'allié : ce n'est pas un cristal.
    const characters = useCharactersStore.getState().characters;
    expect(characters.find((c) => c.id === 'mage-1')).toEqual(mage);
    expect(characters.find((c) => c.id === 'guerrier-1')).toEqual(ally);
  });
});
