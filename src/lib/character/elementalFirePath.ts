/**
 * Note d'affichage de la voie élémentaire du feu (PER-371, p. 167) — Immolation (r7). Les DM subis
 * par un ADVERSAIRE qui blesse le personnage au contact restent hors des couches chiffrées du moteur
 * (patron « Riposte », cf. flayerPath.ts/frostPath.ts/elementalistPath.ts) : SITUATIONNEL, actif tant
 * que l'interrupteur « Immolation active » (r7, index 0) est allumé — OU en permanence tant que la
 * Forme élémentaire de feu (r8, index 0) est active, qui « profite en permanence des effets
 * d'Immolation » (RAW).
 */
import { isEffectActive } from '@/lib/character/effects';
import type { Character } from '@/lib/character/types';

const R7 = 'prestige-elementaire-du-feu-r7';
const R8 = 'prestige-elementaire-du-feu-r8';

export interface ImmolationRetaliationBadge {
  die: '1d4°';
}

export function immolationRetaliationBadge(character: Character): ImmolationRetaliationBadge | null {
  const immolationActive = character.featureIds.includes(R7) && isEffectActive(character, R7, 0);
  const formActive = character.featureIds.includes(R8) && isEffectActive(character, R8, 0);
  return immolationActive || formActive ? { die: '1d4°' } : null;
}
