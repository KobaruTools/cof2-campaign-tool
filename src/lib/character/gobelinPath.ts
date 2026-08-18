/**
 * PER-331 — Voie du gobelin (peuple payant du Compagnon, p. 23), effets NON exprimables en stat
 * dérivée. Ici : la note situationnelle « Kafouiller » (rang 3), rendue en badge AMBRE sous les cartes
 * d'attaque au contact ET à distance (patron `demiOgrePath`). Le reste de la voie (init/discrétion,
 * bonus d'attaque en tir groupé, monture worg, +1 AGI/PER) passe par des primitives génériques
 * dans `private/companion-content.ts`.
 */
import type { FeatureEffectNote } from '@/components/sheet/FeatureEffectBadge';
import { wornRangedWeapon } from '@/lib/character/equipment';
import type { Character } from '@/lib/character/types';

const R3 = 'gobelin-r3';

/**
 * Note « Kafouiller » : dé bonus + 1d4° DM contre une cible RENVERSÉE. Commune aux cartes de contact et
 * à distance (le livre autorise les deux) ; SITUATIONNELLE (déclencheur = cible à terre) → ambre.
 */
function kafouillerNote(): FeatureEffectNote {
  return {
    featureId: R3,
    icon: 'bonus-die',
    label: 'Kafouiller (cible renversée)',
    // Contact ARME comme mains nues, et distance (aucun `weaponOnly`).
    color: 'warning',
    reminder: 'Contre une créature renversée : dé bonus en attaque et +{1d4°} DM.',
    sourcePage: 23,
  };
}

/** Carte « Attaque au contact » (arme équipée OU mains nues) : note dès le rang 3 acquis. `[]` sinon. */
export function gobelinKafouillerMeleeNotes(character: Character): FeatureEffectNote[] {
  return character.featureIds.includes(R3) ? [kafouillerNote()] : [];
}

/**
 * Carte « Attaque à distance » : note affichée seulement si le rang 3 est acquis ET qu'une arme à
 * distance est réellement portée (la carte à distance n'existe pas sinon). `[]` sinon.
 */
export function gobelinKafouillerRangedNotes(character: Character): FeatureEffectNote[] {
  if (!character.featureIds.includes(R3)) return [];
  return wornRangedWeapon(character.equipment ?? []) ? [kafouillerNote()] : [];
}
