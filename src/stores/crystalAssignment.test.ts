/**
 * PER-360 — ce que le client du MJ EXÉCUTE, attribution comme abandon (voie des cristaux, p. 156).
 *
 * Ces deux fonctions sont le seul chemin d'exécution : le MJ les appelle directement quand c'est lui
 * qui agit (un client ne reçoit pas ses propres broadcasts), et le récepteur du canal les appelle
 * pour un geste venu d'un joueur. Les tester, c'est tester les deux côtés d'un coup.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { migrateCharacter } from '@/lib/engine/migrations';

// Le roster de joueurs n'est là que pour nommer l'auteur de l'attribution ; son store tire des
// actions serveur (`server-only`), impossibles à charger ici. On le remplace par la seule table dont
// ces fonctions ont besoin.
vi.mock('./players', () => ({
  usePlayersStore: {
    getState: () => ({ players: [{ id: 'joueur-1', campaignId: 'campagne-1', name: 'Joueur — Orvène' }] }),
  },
}));

import { useCampaignCombatStore } from './campaignCombat';
import { useCharactersStore } from './characters';
import {
  executeCrystalAssignment,
  executeCrystalRelease,
  extinguishReleasedCrystal,
  useCrystalAssignmentStore,
} from './crystalAssignment';
import type { Character } from '@/lib/character/types';

const CAMPAIGN = 'campagne-1';
const PLAYER = 'joueur-1';

function loadFixture(name: string): Character {
  const raw = JSON.parse(
    readFileSync(join(process.cwd(), 'examples/characters', `${name}.json`), 'utf8'),
  );
  return migrateCharacter(raw);
}

const baseMage = loadFixture('recette-per74-cristaux');
const baseAlly = loadFixture('recette-per104-allie-guerrier');

let mage: Character;
let ally: Character;

beforeEach(() => {
  mage = { ...baseMage, id: 'mage-1', campaignId: CAMPAIGN, playerId: PLAYER };
  ally = { ...baseAlly, id: 'guerrier-1', campaignId: CAMPAIGN, playerId: 'joueur-2' };
  useCharactersStore.setState({ characters: [mage, ally] });
  useCampaignCombatStore.setState({ byCampaign: {}, hydrated: {} });
  useCrystalAssignmentStore.setState({ byCharacter: {} });
});

describe('PER-360 — le MJ exécute une attribution', () => {
  it('pose le cristal sur le porteur, au nom du JOUEUR qui le confie', () => {
    executeCrystalAssignment(CAMPAIGN, {
      sourceCharacterId: 'mage-1',
      crystalId: 'cristal-bleu-nuit',
      targetKey: 'guerrier-1',
    });
    expect(useCampaignCombatStore.getState().byCampaign[CAMPAIGN]?.statuses['guerrier-1']).toEqual([
      { id: 'cristal-bleu-nuit', castBy: 'Joueur — Orvène' },
    ]);
  });
});

describe('PER-360 — le MJ exécute un abandon', () => {
  beforeEach(() => {
    executeCrystalAssignment(CAMPAIGN, {
      sourceCharacterId: 'mage-1',
      crystalId: 'cristal-bleu-nuit',
      targetKey: 'guerrier-1',
    });
  });

  it('lève la puce du porteur ET éteint le cristal chez son propriétaire', () => {
    executeCrystalRelease(CAMPAIGN, { crystalId: 'cristal-bleu-nuit', holderKey: 'guerrier-1' });
    const combat = useCampaignCombatStore.getState().byCampaign[CAMPAIGN];
    expect(combat?.statuses['guerrier-1']).toBeUndefined();
    // Récupéré mais PAS rééquipé : le rallumer coûte une action limitée (p. 156).
    const owner = useCharactersStore.getState().characters.find((c) => c.id === 'mage-1');
    expect(owner?.activeCrystalIds).not.toContain('cristal-bleu-nuit');
    // Les autres cristaux du mage ne bougent pas.
    expect(owner?.activeCrystalIds).toContain('cristal-rose-laiteux');
  });

  it('le mage éteint son cristal lui-même, sans toucher à l\'état de combat (client JOUEUR)', () => {
    // Client d'un joueur : il n'a chargé que sa fiche et ne peut pas écrire `campaign_combat`.
    useCharactersStore.setState({ characters: [mage] });
    extinguishReleasedCrystal({ crystalId: 'cristal-bleu-nuit', holderKey: 'guerrier-1' });
    const owner = useCharactersStore.getState().characters.find((c) => c.id === 'mage-1');
    expect(owner?.activeCrystalIds).not.toContain('cristal-bleu-nuit');
    // La puce reste posée : la lever appartient au MJ, auteur unique de l'état de combat.
    expect(useCampaignCombatStore.getState().byCampaign[CAMPAIGN]?.statuses['guerrier-1']).toEqual([
      { id: 'cristal-bleu-nuit', castBy: 'Joueur — Orvène' },
    ]);
  });

  it('un client qui ne connaît pas le mage ne touche à rien', () => {
    useCharactersStore.setState({ characters: [ally] });
    expect(() =>
      extinguishReleasedCrystal({ crystalId: 'cristal-bleu-nuit', holderKey: 'guerrier-1' }),
    ).not.toThrow();
  });

  it('sans propriétaire identifiable, la puce est quand même levée', () => {
    useCharactersStore.setState({ characters: [ally] });
    executeCrystalRelease(CAMPAIGN, { crystalId: 'cristal-bleu-nuit', holderKey: 'guerrier-1' });
    expect(
      useCampaignCombatStore.getState().byCampaign[CAMPAIGN]?.statuses['guerrier-1'],
    ).toBeUndefined();
  });
});
