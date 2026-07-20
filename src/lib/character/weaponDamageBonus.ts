/**
 * Agrégation des bonus de DM d'ARME accordés par les capacités (PER-115).
 *
 * La règle de base — au contact on ajoute la FOR, à distance aucune carac (p. 185) — n'est PAS
 * ici : elle vit dans la résolution de l'arme portée (`characterDerivedView`). Ce module ne
 * rassemble QUE les SUPPLÉMENTS des capacités (`weapon-damage-bonus`), filtrés selon le mode
 * d'attaque et l'arme réellement en main, et les répartit en deux natures :
 *  - PERMANENTS (caracs) → agrégés à l'expression de DM (ex. arc en main : « 1d8 + PER ») ;
 *  - SITUATIONNELS → rendus en badge distinct sous la carte d'attaque.
 *
 * Fonction PURE : aucune dépendance à React, aucun jet (on affiche, on ne résout pas le combat).
 */
import { featureById } from '@/data';
import type { AbilityId, DamageDie, Weapon, WeaponDamageBonusEffect } from '@/data/schema';
import { activeFeatureIdsForMods } from '@/lib/character/effects';
import { getOptionSelections } from '@/lib/character/choices';
import type { Character } from '@/lib/character/types';

/** Mode d'attaque considéré. */
export type AttackMode = 'melee' | 'ranged';

/** Source d'un bonus (capacité d'origine), pour le breakdown / tooltip. */
export interface WeaponDamageBonusSource {
  featureId: string;
  name: string;
  sourcePage?: number;
}

/** Bonus de carac PERMANENT retenu (agrégé au DM de l'arme portée). */
export interface PermanentAbilityBonus extends WeaponDamageBonusSource {
  ability: AbilityId;
}

/** Bonus SITUATIONNEL (carac ou dé(s)) rendu en badge distinct. */
export interface SituationalDamageBonus extends WeaponDamageBonusSource {
  /** Caractéristique ajoutée (exclusif avec `dice`). */
  ability?: AbilityId;
  /** Dé(s) ajoutés (exclusif avec `ability`). */
  dice?: { count: number; die: DamageDie; evolving?: boolean };
  /** Condition en toutes lettres (ex. « contre les animaux »). */
  conditionLabel?: string;
}

export interface WeaponDamageBonusResult {
  /** Caracs permanentes à AJOUTER à l'expression de DM (ordre stable = ordre des capacités). */
  addedAbilities: PermanentAbilityBonus[];
  /** Bonus situationnels à afficher en badges. */
  situational: SituationalDamageBonus[];
}

/**
 * L'arme portée satisfait-elle la contrainte de TYPE de la condition (sous-type à distance /
 * catégorie de contact) ? Une contrainte de type sur une main VIDE (pas d'arme, ou arme du mauvais
 * mode) n'est jamais satisfaite. Sans contrainte de type, toute arme (voire aucune) convient.
 */
function weaponMatchesType(cond: WeaponDamageBonusEffect['condition'], weapon: Weapon | null): boolean {
  if (cond.rangedKinds && cond.rangedKinds.length > 0) {
    if (!weapon || !weapon.ranged || !weapon.rangedKind) return false;
    if (!cond.rangedKinds.includes(weapon.rangedKind)) return false;
  }
  if (cond.weaponCategories && cond.weaponCategories.length > 0) {
    if (!weapon || !weapon.melee) return false;
    if (!cond.weaponCategories.includes(weapon.weaponCategory)) return false;
  }
  return true;
}

/**
 * Libellé de condition, complété dynamiquement (PER-115) des LIBELLÉS des options retenues d'un
 * choix `option` de la capacité (`condition.appendChoiceLabels`) — ex. les ennemis jurés choisis de
 * Chasseur émérite. Sans ce champ (ou sans choix retenu), on renvoie `label` tel quel.
 */
function resolveConditionLabel(
  character: Character,
  featureId: string,
  condition: WeaponDamageBonusEffect['condition'],
): string | undefined {
  const base = condition.label;
  if (condition.appendChoiceLabels === undefined) return base;
  const choice = featureById.get(featureId)?.choices?.[condition.appendChoiceLabels];
  if (choice?.kind !== 'option') return base;
  const labelById = new Map(choice.options.map((o) => [o.id, o.label]));
  const chosen = getOptionSelections(character, featureId, condition.appendChoiceLabels)
    .map((id) => labelById.get(id))
    .filter((l): l is string => !!l);
  if (chosen.length === 0) return base;
  const suffix = chosen.join(', ');
  return base ? `${base}, ${suffix}` : suffix;
}

/**
 * Bonus de DM des capacités actives, pour un `mode` d'attaque et l'arme (`weapon`) en main dans ce
 * mode (`null` = aucune arme de ce mode / mains nues). Voir en-tête de module.
 */
export function weaponDamageBonuses(
  character: Character,
  mode: AttackMode,
  weapon: Weapon | null,
): WeaponDamageBonusResult {
  const addedAbilities: PermanentAbilityBonus[] = [];
  const situational: SituationalDamageBonus[] = [];

  for (const featureId of activeFeatureIdsForMods(character)) {
    const feature = featureById.get(featureId);
    if (!feature?.effects) continue;
    for (const effect of feature.effects) {
      if (effect.kind !== 'weapon-damage-bonus') continue;
      const { condition } = effect;
      // Filtre de mode : une condition qui exige l'autre mode est écartée.
      if (condition.attackMode && condition.attackMode !== mode) continue;

      const source: WeaponDamageBonusSource = {
        featureId,
        name: feature.name,
        sourcePage: feature.sourcePage,
      };

      if (effect.situational) {
        // Situationnel : le badge est informatif. On respecte tout de même une contrainte de TYPE
        // d'arme si elle est déclarée (rare), pour ne pas proposer un bonus « à l'arc » sans arc.
        if (!weaponMatchesType(condition, weapon)) continue;
        situational.push({
          ...source,
          ability: effect.ability,
          dice: effect.dice,
          conditionLabel: resolveConditionLabel(character, featureId, condition),
        });
      } else {
        // Permanent : n'est agrégé au DM que si une arme satisfait la condition de type.
        if (!weaponMatchesType(condition, weapon)) continue;
        if (effect.ability) addedAbilities.push({ ...source, ability: effect.ability });
      }
    }
  }

  return { addedAbilities, situational };
}
