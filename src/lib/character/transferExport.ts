'use client';

/**
 * Orchestration de l'EXPORT d'un personnage en fichier JSON (PER-182) : résout le
 * contexte des clés étrangères (libellés campagne/joueur), enveloppe le blob via
 * `buildExportFile`, puis déclenche le téléchargement navigateur.
 *
 * Séparé de `transfer.ts` (pur, testable) parce qu'il touche les stores (campagnes /
 * joueurs), le repo joueurs (fetch ponctuel) et le DOM (téléchargement). Partagé par
 * les deux points d'export (accueil et page campagne).
 */
import { fetchPlayers } from '@/lib/player/repo';
import { useCampaignsStore } from '@/stores/campaigns';
import { usePlayersStore } from '@/stores/players';
import { fileSlug } from './summary';
import { buildExportFile, type TransferContext, type TransferRef } from './transfer';
import type { Character } from './types';

/**
 * Résout le libellé du joueur d'une campagne : d'abord depuis le roster déjà en
 * cache (store `players`), sinon via un fetch ponctuel (l'export est une action
 * rare). En dernier recours, on conserve tout de même l'`id` (nom vide) : le
 * rattachement direct à l'import se fait par id, le nom n'étant qu'un affichage.
 */
async function resolvePlayerRef(campaignId: string, playerId: string): Promise<TransferRef> {
  const cached = usePlayersStore.getState();
  if (cached.campaignId === campaignId) {
    const match = cached.players.find((p) => p.id === playerId);
    if (match) return { id: match.id, name: match.name };
  }
  try {
    const players = await fetchPlayers(campaignId);
    const match = players.find((p) => p.id === playerId);
    if (match) return { id: match.id, name: match.name };
  } catch {
    // Ignoré : on retombe sur l'id seul (rattachement direct possible sans le nom).
  }
  return { id: playerId, name: '' };
}

/**
 * Contexte FK d'un personnage, prêt à être embarqué dans le fichier d'export. La
 * campagne se lit dans le store (déjà chargé sur les pages d'export) ; le joueur
 * demande éventuellement un fetch (cf. `resolvePlayerRef`).
 */
export async function resolveTransferContext(character: Character): Promise<TransferContext> {
  const { campaignId, playerId } = character;
  let campaign: TransferRef | null = null;
  if (campaignId) {
    const found = useCampaignsStore.getState().getById(campaignId);
    campaign = found ? { id: found.id, name: found.name } : { id: campaignId, name: '' };
  }
  const player = campaignId && playerId ? await resolvePlayerRef(campaignId, playerId) : null;
  return { campaign, player };
}

/** Résout le contexte, enveloppe le personnage et déclenche le téléchargement JSON. */
export async function downloadCharacterExport(character: Character): Promise<void> {
  const context = await resolveTransferContext(character);
  const file = buildExportFile(character, context);
  const blob = new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${fileSlug(character.name)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
