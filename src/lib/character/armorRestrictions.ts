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
import { equipmentById, featureById } from '@/data';
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

/**
 * DEF plafond débloquée par les capacités ACQUISES portant un effet `armor-access`
 * (PER-81) : certaines capacités relèvent l'armure maximale au-delà du plafond du
 * profil (barbare Tour de force → chemise de mailles, Briseur d'os → cotte de mailles ;
 * chevalier Autorité naturelle → plaque complète, p. 178/86). On retient la MEILLEURE
 * armure débloquée (`maxArmorId` du catalogue) ; 0 si aucune capacité de ce genre n'est
 * acquise. La possession de la capacité suffit (on ne double pas la vérification de
 * maîtrise : investir dans la voie porteuse la garantit déjà).
 */
function armorAccessDef(character: Character): number {
  let def = 0;
  for (const id of character.featureIds) {
    const feature = featureById.get(id);
    if (!feature?.effects) continue;
    for (const effect of feature.effects) {
      if (effect.kind !== 'armor-access') continue;
      const armor = equipmentById.get(effect.maxArmorId);
      if (armor?.category === 'armor') def = Math.max(def, armor.def);
    }
  }
  return def;
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

/**
 * DEF MONDAINE de l'armure du catalogue effectivement portée (0 si aucune, ou si
 * l'armure portée est un objet personnalisé aux stats inconnues). Le BONUS MAGIQUE
 * éventuel (porté par `EquipmentRef.magicDef`, PER-85) est EXCLU — le surcoût de
 * mana d'incantation (PER-82) et les plafonds de port ne comptent que la DEF
 * mondaine (p. 178, p. 188).
 */
export function wornArmorWorldlyDef(equipment: EquipmentLine[]): number {
  return wornCatalogArmor(equipment)?.def ?? 0;
}

/**
 * Plafond de PORT d'armure (DEF mondaine) du personnage : la meilleure armure
 * autorisée parmi les profils qu'il MAÎTRISE (`masteredClassIds`), relevée par les
 * capacités `armor-access` acquises (Tour de force, Autorité naturelle… — PER-81).
 * C'est aussi le seuil qui décide si le personnage MAÎTRISE l'armure qu'il porte
 * (armure portée ≤ ce plafond), condition du surcoût de mana d'incantation (PER-82,
 * p. 178). 0 = aucune armure autorisée.
 */
export function wornArmorAllowedDef(character: Character, ctx: RulesContext): number {
  let allowedDef = 0;
  for (const id of masteredClassIds(character, ctx)) {
    const cls = ctx.classById.get(id);
    if (cls) allowedDef = Math.max(allowedDef, classMaxArmorDef(cls));
  }
  return Math.max(allowedDef, armorAccessDef(character));
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

  // Plafond de port d'armure = meilleure armure autorisée parmi les profils
  // maîtrisés, relevée par les capacités `armor-access` (Tour de force… PER-81).
  const allowedDef = wornArmorAllowedDef(character, ctx);

  // Plafond d'accès au bouclier = meilleur accès parmi les profils maîtrisés
  // (le mono-profil retombe sur son seul profil principal).
  let allowedShieldRank = 0;
  for (const id of mastered) {
    const cls = ctx.classById.get(id);
    if (cls) allowedShieldRank = Math.max(allowedShieldRank, SHIELD_ACCESS_RANK[cls.shieldAccess]);
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
