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
import { featureById, progression } from '@/data';
import type {
  AbilityId,
  DamageDie,
  ScalingValue,
  Weapon,
  WeaponDamageBonusEffect,
  WeaponDamageCondition,
  WeaponDamageFlatFromChoice,
} from '@/data/schema';
import { scalingDie } from '@/lib/engine';
import {
  activeFeatureIdsForMods,
  effectContext,
  isEffectActive,
  pathRanksFromFeatures,
  resolveValue,
  type EffectContext,
} from '@/lib/character/effects';
import {
  getOptionSelections,
  splitRepeatableSelections,
  weaponFamiliesMatchChoice,
} from '@/lib/character/choices';
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

/** Bonus PLAT PERMANENT (entier) retenu (agrégé au DM de l'arme portée, ex. +2 de Spécialisation). */
export interface PermanentFlatBonus extends WeaponDamageBonusSource {
  value: number;
}

/** Bonus SITUATIONNEL (carac ou dé(s)) rendu en badge distinct. */
export interface SituationalDamageBonus extends WeaponDamageBonusSource {
  /** Caractéristique ajoutée (exclusif avec `dice`). */
  ability?: AbilityId;
  /**
   * Dé(s) ajoutés (exclusif avec `ability`). `die` est la face CONCRÈTE à afficher : pour un dé
   * ÉVOLUTIF (`evolving`), déjà résolue au niveau du personnage (`scalingDie`, p. 43) — le marqueur
   * `°` ne sert plus qu'à signaler qu'elle grandira. `count` n'évolue pas (seule la face monte).
   */
  dice?: { count: number; die: DamageDie; evolving?: boolean };
  /** Condition en toutes lettres (ex. « contre les animaux »). */
  conditionLabel?: string;
}

export interface WeaponDamageBonusResult {
  /** Caracs permanentes à AJOUTER à l'expression de DM (ordre stable = ordre des capacités). */
  addedAbilities: PermanentAbilityBonus[];
  /** Bonus PLATS permanents (entiers) à AJOUTER à l'expression de DM (ex. +2 Spécialisation). */
  addedFlat: PermanentFlatBonus[];
  /** Bonus situationnels à afficher en badges. */
  situational: SituationalDamageBonus[];
}

/**
 * L'arme portée satisfait-elle la contrainte de TYPE d'une condition d'arme (sous-type à distance,
 * catégorie de contact, ou familles de prédilection choisies) ? Une contrainte sur une main VIDE
 * (pas d'arme, ou arme du mauvais mode) n'est jamais satisfaite. Sans contrainte, toute arme (voire
 * aucune) convient. Partagé par les bonus de DM (`weaponDamageBonuses`) et d'attaque (`attackBonus`).
 */
export function weaponConditionMet(
  cond: WeaponDamageCondition,
  weapon: Weapon | null,
  character: Character,
): boolean {
  // Un `attackMode` exige une arme du bon mode en main : un supplément de DM d'arme n'a rien à
  // agrémenter sans arme (PER-139, « suit l'arme de contact effectivement maniée »). Les conditions
  // de sous-type/famille ci-dessous l'imposaient déjà indirectement ; ici on couvre le mode SEUL.
  if (cond.attackMode === 'melee' && !weapon?.melee) return false;
  if (cond.attackMode === 'ranged' && !weapon?.ranged) return false;
  if (cond.rangedKinds && cond.rangedKinds.length > 0) {
    if (!weapon || !weapon.ranged || !weapon.rangedKind) return false;
    if (!cond.rangedKinds.includes(weapon.rangedKind)) return false;
  }
  if (cond.weaponCategories && cond.weaponCategories.length > 0) {
    if (!weapon || !weapon.melee) return false;
    if (!cond.weaponCategories.includes(weapon.weaponCategory)) return false;
  }
  if (cond.weaponFamiliesFromChoice) {
    if (!weapon) return false;
    if (!weaponFamiliesMatchChoice(character, weapon.weaponFamilies, cond.weaponFamiliesFromChoice.choiceFeatureId))
      return false;
  }
  if (cond.weaponFamilies && cond.weaponFamilies.length > 0) {
    // Familles EN DUR (octroi fixe de peuple, PER-154) : l'arme doit partager au moins une famille.
    if (!weapon?.weaponFamilies?.length) return false;
    if (!cond.weaponFamilies.some((f) => weapon.weaponFamilies!.includes(f))) return false;
  }
  return true;
}

/**
 * Valeur numérique d'un bonus plat aux DM (`weapon-damage-bonus.flat`) : constante, valeur SCALANTE
 * (résolue contre la voie hôte — ex. Cavalier émérite +1/+2 au rang 5, PER-139), ou NOMBRE
 * d'instances retenues de l'option répétable visée (Spécialisation « +1 DM » ×N), plafonné. Une
 * valeur scalante non résoluble (contexte manquant) est traitée comme nulle.
 */
function resolveFlat(
  character: Character,
  flat: number | ScalingValue | WeaponDamageFlatFromChoice,
  pathId: string,
  pathRanks: Record<string, number>,
  ctx: EffectContext,
): number {
  if (typeof flat === 'number') return flat;
  if ('scale' in flat) return resolveValue(flat, pathId, pathRanks, ctx) ?? 0;
  const { repeatCounts } = splitRepeatableSelections(character, flat.featureId, flat.choiceIndex);
  const count = (flat.base ?? 0) + (repeatCounts[flat.optionId] ?? 0);
  return flat.max === undefined ? count : Math.min(count, flat.max);
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
 * Résout le dé d'un bonus situationnel pour l'AFFICHAGE : un dé évolutif (`°`, p. 43) prend la face
 * concrète atteinte au niveau du personnage (`scalingDie`), les autres sont rendus tels quels. On
 * garde `evolving` pour que le badge conserve le marqueur `°` (règle p. 43, cf. `DieIcon`).
 */
function resolveDisplayDice(
  dice: NonNullable<WeaponDamageBonusEffect['dice']>,
  level: number,
): NonNullable<SituationalDamageBonus['dice']> {
  return dice.evolving ? { ...dice, die: scalingDie(level, progression) } : dice;
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
  const addedFlat: PermanentFlatBonus[] = [];
  const situational: SituationalDamageBonus[] = [];

  const pathRanks = pathRanksFromFeatures(character.featureIds);
  const ctx = effectContext(character);

  for (const featureId of activeFeatureIdsForMods(character)) {
    const feature = featureById.get(featureId);
    if (!feature?.effects) continue;
    feature.effects.forEach((effect) => {
      if (effect.kind !== 'weapon-damage-bonus') return;
      const { condition } = effect;
      // Filtre de mode : une condition qui exige l'autre mode est écartée.
      if (condition.attackMode && condition.attackMode !== mode) return;
      // Interrupteur d'état requis (PER-139, « en selle ») : le bonus ne compte que si l'effet
      // conditionnel référencé de la même capacité est actif.
      if (
        effect.requiresActiveEffectIndex !== undefined &&
        !isEffectActive(character, featureId, effect.requiresActiveEffectIndex)
      )
        return;

      const source: WeaponDamageBonusSource = {
        featureId,
        name: feature.name,
        sourcePage: feature.sourcePage,
      };

      if (effect.situational) {
        // Situationnel : le badge est informatif. On respecte tout de même une contrainte de TYPE
        // d'arme si elle est déclarée (rare), pour ne pas proposer un bonus « à l'arc » sans arc.
        if (!weaponConditionMet(condition, weapon, character)) return;
        situational.push({
          ...source,
          ability: effect.ability,
          dice: effect.dice ? resolveDisplayDice(effect.dice, character.level) : undefined,
          conditionLabel: resolveConditionLabel(character, featureId, condition),
        });
      } else {
        // Permanent : n'est agrégé au DM que si une arme satisfait la condition de type.
        if (!weaponConditionMet(condition, weapon, character)) return;
        if (effect.ability) addedAbilities.push({ ...source, ability: effect.ability });
        if (effect.flat !== undefined) {
          const value = resolveFlat(character, effect.flat, feature.pathId, pathRanks, ctx);
          if (value > 0) addedFlat.push({ ...source, value });
        }
      }
    });
  }

  return { addedAbilities, addedFlat, situational };
}
