/**
 * Note d'affichage de la voie du gel (PER-74, p. 158) — Présence glaciale (r7). Le DM subi par un
 * ADVERSAIRE qui touche le personnage au contact ou l'attaque avec des armes naturelles reste hors
 * des couches chiffrées du moteur (patron « Riposte », cf. flayerPath.ts/elementalistPath.ts) :
 * SITUATIONNEL, ne joue que tant que l'interrupteur « Présence glaciale active » (index 0) est allumé.
 */
import { isEffectActive } from '@/lib/character/effects';
import type { Character } from '@/lib/character/types';

const R7 = 'prestige-gel-r7';

export interface FrostRetaliationBadge {
  die: '1d4°';
}

export function frostRetaliationBadge(character: Character): FrostRetaliationBadge | null {
  if (!character.featureIds.includes(R7)) return null;
  return isEffectActive(character, R7, 0) ? { die: '1d4°' } : null;
}
