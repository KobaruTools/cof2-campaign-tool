/**
 * Notes d'affichage de la voie de l'élémentaliste (PER-74, p. 157) — Métamorphose élémentaire (r8).
 * Deux bonus de branche restent hors des couches chiffrées du moteur (`damageReduction`,
 * `weapon-damage-bonus`, `active-form-ability-bonus`) parce qu'ils portent sur un TIERS (Feu : DM
 * subis par l'ADVERSAIRE, patron « Riposte ») ou sur des DM SORTANTS jamais simulés par la fiche
 * (Air : division par 2 des DM d'attaque physiques — même nature d'affichage informatif que la RD,
 * cf. `DamageReduction`). Fonctions PURES et testables, au patron de `flayerPath.ts`/`warmagePath.ts`.
 */
import { featureById } from '@/data';
import type { FeatureEffectNote } from '@/components/sheet/FeatureEffectBadge';
import { resolveFeatureElement } from '@/lib/character/dragonElement';
import { isEffectActive } from '@/lib/character/effects';
import type { Character } from '@/lib/character/types';

const R8 = 'prestige-elementaliste-r8';

/**
 * Élément énergétique résolu (id de rang 4 : `'fire' | 'cold' | 'lightning' | 'acid'`) de la forme
 * élémentaire ACTIVE, ou `null` si la voie n'est pas acquise, l'interrupteur « Forme élémentaire
 * active » est éteint, ou aucun élément de prédilection n'a été choisi au rang 4.
 */
function activeFormElement(character: Character): string | null {
  if (!character.featureIds.includes(R8)) return null;
  if (!isEffectActive(character, R8, 0)) return null;
  const feature = featureById.get(R8);
  if (!feature) return null;
  return resolveFeatureElement(character, feature)?.id ?? null;
}

/** Puce « riposte » (forme Feu) pour la carte Défense — `null` si non applicable. */
export interface ElementalistFireRetaliationBadge {
  die: '1d4°';
}

export function elementalistFireRetaliationBadge(character: Character): ElementalistFireRetaliationBadge | null {
  return activeFormElement(character) === 'fire' ? { die: '1d4°' } : null;
}

/** Note « DM ÷2 » de la forme Air, commune aux cartes d'attaque au contact ET à distance. */
function halvedDamageNote(): FeatureEffectNote {
  return {
    featureId: R8,
    icon: 'half-damage',
    label: 'DM ÷2',
    // SITUATIONNEL (ne joue que sous cette forme précise) → ambre, comme les autres badges
    // conditionnés à un interrupteur temporaire sur cette carte.
    color: 'warning',
    reminder:
      'Sous la forme Air, les DM des attaques physiques (contact et distance) sont divisés par deux — pas ceux des sorts.',
  };
}

export function elementalistMeleeAttackNotes(character: Character): FeatureEffectNote[] {
  return activeFormElement(character) === 'lightning' ? [halvedDamageNote()] : [];
}

export function elementalistRangedAttackNotes(character: Character): FeatureEffectNote[] {
  return activeFormElement(character) === 'lightning' ? [halvedDamageNote()] : [];
}
