/**
 * Attaques naturelles conférées par une FORME (PER-74) — module PUR. Décrit les attaques que le
 * personnage obtient tant qu'une forme est active (morsure de la forme hybride du lycanthrope,
 * p. 130), pour les cartes d'attaque de la fiche.
 *
 * Le contrat est le même que pour la RD et la plage de critique : on AFFICHE (dé, carac, type
 * d'action, cadence), aucun jet n'est résolu. La TOUCHE n'est pas recalculée ici — l'attaque suit
 * la valeur d'attaque de son `scope` (au contact : « sa valeur d'attaque au contact habituelle »),
 * fournie par la grille de statistiques dérivées.
 *
 * Le gating est un ÉTAT DE JEU : l'attaque n'existe que si l'interrupteur de forme désigné par
 * `FormAttack.requiresActiveEffect` est ACTIF (cf. `isEffectActive`) — donc rien hors forme.
 */
import { featureById } from '@/data';
import type { AbilityId, ActionType, FormAttack, WeaponDamage } from '@/data/schema';
import type { Character } from '@/lib/character/types';
import { activeFeatureIdsForMods, isEffectActive } from '@/lib/character/effects';

/** Attaque de forme ACTIVE, prête à l'affichage (capacité d'origine incluse pour la source). */
export interface FormAttackView {
  /** Capacité qui confère l'attaque (lycanthrope r4). */
  featureId: string;
  /** Nom de la capacité (« Forme hybride ») — source affichée. */
  featureName: string;
  /** Page source de la capacité. */
  page: number;
  /** Nom de l'attaque (« Morsure »). */
  name: string;
  damage: WeaponDamage;
  evolving: boolean;
  damageAbilities: AbilityId[];
  scope: FormAttack['scope'];
  actionTypes: ActionType[];
  frequency?: string;
  replacesRangedAttack: boolean;
  replacesMeleeAttack: boolean;
}

/**
 * Attaques de forme actuellement actives sur le personnage. Ne retient que les capacités ACQUISES
 * (et non neutralisées, cf. `activeFeatureIdsForMods`) dont l'interrupteur de forme est allumé.
 * Vide = le personnage n'est sous aucune forme conférant une attaque.
 */
export function activeFormAttacks(character: Character): FormAttackView[] {
  const out: FormAttackView[] = [];
  for (const id of activeFeatureIdsForMods(character)) {
    const feature = featureById.get(id);
    const attack = feature?.formAttack;
    if (!feature || !attack) continue;
    const gate = attack.requiresActiveEffect;
    if (!isEffectActive(character, gate.featureId, gate.index)) continue;
    out.push({
      featureId: feature.id,
      featureName: feature.name,
      page: feature.sourcePage,
      name: attack.name,
      damage: attack.damage,
      evolving: attack.evolving ?? false,
      damageAbilities: attack.damageAbilities,
      scope: attack.scope,
      actionTypes: attack.actionTypes,
      frequency: attack.frequency,
      replacesRangedAttack: attack.replacesRangedAttack ?? false,
      replacesMeleeAttack: attack.replacesMeleeAttack ?? false,
    });
  }
  return out;
}

/**
 * Attaque de forme qui REMPLACE la carte « Attaque à distance » de la fiche (la forme interdit le
 * tir). `null` = aucune → la carte à distance reste affichée normalement. S'il y en avait plusieurs
 * (formes mutuellement exclusives : impossible en pratique), la première l'emporte.
 */
export function rangedReplacingFormAttack(character: Character): FormAttackView | null {
  return activeFormAttacks(character).find((a) => a.replacesRangedAttack) ?? null;
}

/**
 * Attaque de forme qui REMPLACE la carte « Attaque au contact » de la fiche (PER-374, formes
 * élémentaires : confisque la bascule arme ⇄ mains nues au profit d'une attaque unique). `null` =
 * aucune → la carte au contact reste affichée normalement. Symétrique de `rangedReplacingFormAttack`.
 */
export function meleeReplacingFormAttack(character: Character): FormAttackView | null {
  return activeFormAttacks(character).find((a) => a.replacesMeleeAttack) ?? null;
}

/**
 * Chaîne de dé(s) de l'attaque pour `<DamageValue>` / `WeaponDamageExpr` : « 1d4° », « 2d6+1 ».
 * Les caractéristiques ajoutées ne sont PAS incluses (rendues en puces par la carte).
 */
export function formAttackDice(view: FormAttackView): string {
  let text = `${view.damage.count}${view.damage.die}`;
  if (view.evolving) text += '°';
  if (view.damage.modifier) text += view.damage.modifier > 0 ? `+${view.damage.modifier}` : `${view.damage.modifier}`;
  return text;
}
