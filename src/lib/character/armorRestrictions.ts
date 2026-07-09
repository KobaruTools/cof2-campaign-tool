/**
 * Restrictions de port d'armure/bouclier par profil (PER-80) — module pur.
 *
 * Chaque profil (`CharacterClass`) fixe une armure maximale (`maxArmorId`, `null`
 * = aucune armure) et un accès au bouclier (`shieldAccess`). Un personnage qui
 * MAÎTRISE plusieurs profils (profil principal, ≥ 2 rangs dans un autre profil,
 * hybride niveau 1 — cf. `mastery.ts`) peut porter jusqu'à la MEILLEURE armure et
 * le MEILLEUR bouclier autorisés parmi les profils qu'il maîtrise :
 *
 * > « Le personnage maîtrise toutes les armes et armures des deux profils dont
 * >   sont issues ses voies. » — p. 180
 *
 * La restriction FINE par capacité d'origine (une capacité de druide exige au plus
 * le cuir simple pour être UTILISÉE, même si le barbare peut porter du cuir
 * renforcé — p. 177/178) relève de PER-86 : ce module ne traite que le plafond de
 * PORT commun à tous les personnages (« base », p. 188).
 *
 * Le moteur SIGNALE l'excès (avertissement non bloquant, fiche + récap wizard) ;
 * il ne retire rien de force (la fiche reste permissive). Cf. `checkCompliance`.
 */
import { equipmentById } from '@/data';
import type { CharacterClass, ShieldAccess } from '@/data/schema';
import type { RulesContext } from '@/lib/engine';
import type { Character, EquipmentLine } from './types';
import { isCustomItem } from './types';
import { masteredClassIds } from './mastery';

/**
 * DEF de l'armure la plus lourde autorisée par un profil : la `def` de son
 * `maxArmorId`, ou 0 si le profil n'autorise AUCUNE armure (`maxArmorId === null`
 * → seul « aucune armure » (DEF 0) est permis, p. 188).
 */
export function classMaxArmorDef(cls: CharacterClass): number {
  if (cls.maxArmorId === null) return 0;
  const armor = equipmentById.get(cls.maxArmorId);
  return armor?.category === 'armor' ? armor.def : 0;
}

/**
 * Ordre de permissivité de l'accès au bouclier (`ShieldAccess`) : `none` < `small`
 * (petit bouclier seul) < `all` (petit et grand). Un petit bouclier (DEF +1) exige
 * `small`, un grand bouclier (DEF +2) exige `all` (p. 188, p. 62).
 */
const SHIELD_ACCESS_RANK: Record<ShieldAccess, number> = { none: 0, small: 1, all: 2 };

/** Rang d'accès exigé pour porter un bouclier donné (petit → `small`, grand → `all`). */
function shieldRequiredRank(shieldDef: number): number {
  return shieldDef >= 2 ? SHIELD_ACCESS_RANK.all : SHIELD_ACCESS_RANK.small;
}

/** Écart de port d'armure/bouclier à signaler (avertissement non bloquant). */
export interface ArmorRestrictionViolation {
  kind: 'armor-too-heavy' | 'shield-not-allowed';
  /** Message français prêt à afficher, sourcé (p. 188). */
  message: string;
}

/** Première armure du CATALOGUE effectivement portée (au plus une compte, p. 188). */
function wornCatalogArmor(equipment: EquipmentLine[]) {
  for (const line of equipment) {
    if (line.worn?.slot !== 'armor' || isCustomItem(line)) continue;
    const item = equipmentById.get(line.itemId);
    if (item?.category === 'armor') return item;
  }
  return null;
}

/** Premier bouclier du CATALOGUE effectivement porté (au plus un compte, p. 188). */
function wornCatalogShield(equipment: EquipmentLine[]) {
  for (const line of equipment) {
    if (line.worn?.slot !== 'shield' || isCustomItem(line)) continue;
    const item = equipmentById.get(line.itemId);
    if (item?.category === 'shield') return item;
  }
  return null;
}

/**
 * Écarts de port d'armure/bouclier du personnage (plafond de port par profil,
 * PER-80). Ne considère que l'équipement du CATALOGUE porté (les objets
 * personnalisés n'ont pas de stats connues, comme pour le calcul de défense).
 */
export function armorRestrictionViolations(
  character: Character,
  ctx: RulesContext,
): ArmorRestrictionViolation[] {
  const violations: ArmorRestrictionViolation[] = [];
  const mastered = masteredClassIds(character, ctx);

  // Plafonds de port = meilleure armure et meilleur accès bouclier autorisés parmi
  // les profils maîtrisés (le mono-profil retombe sur son seul profil principal).
  let allowedDef = 0;
  let allowedShieldRank = 0;
  for (const id of mastered) {
    const cls = ctx.classById.get(id);
    if (!cls) continue;
    allowedDef = Math.max(allowedDef, classMaxArmorDef(cls));
    allowedShieldRank = Math.max(allowedShieldRank, SHIELD_ACCESS_RANK[cls.shieldAccess]);
  }

  const armor = wornCatalogArmor(character.equipment);
  if (armor && armor.def > allowedDef) {
    violations.push({
      kind: 'armor-too-heavy',
      message:
        allowedDef === 0
          ? `Votre profil ne permet aucune armure : ${armor.name} (DEF +${armor.def}) est portée (p. 188).`
          : `Armure trop lourde pour votre profil : ${armor.name} (DEF +${armor.def}) dépasse le maximum autorisé (p. 188).`,
    });
  }

  const shield = wornCatalogShield(character.equipment);
  if (shield && shieldRequiredRank(shield.def) > allowedShieldRank) {
    violations.push({
      kind: 'shield-not-allowed',
      message:
        allowedShieldRank === SHIELD_ACCESS_RANK.none
          ? `Votre profil ne permet pas de porter de bouclier : ${shield.name} porté (p. 188).`
          : `Votre profil ne permet qu'un petit bouclier : ${shield.name} (DEF +${shield.def}) dépasse cet accès (p. 188).`,
    });
  }

  return violations;
}
