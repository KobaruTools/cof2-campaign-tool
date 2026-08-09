/**
 * OBJETS MAGIQUES — CÂBLAGE MOTEUR (PER-307).
 *
 * Module PUR (aucune dépendance à React/zustand) qui TRADUIT les données d'enchantement d'une ligne
 * d'équipement (`magicBonus` + `magicProperties`, posées par PER-306) vers les FORMES que le moteur de
 * dérivation consomme DÉJÀ — plutôt que de dupliquer un canal par propriété :
 *  - `magicBonus` d'une ARME → +N à la touche (mode de l'arme) et bonus PLAT permanent aux DM ;
 *  - Affûtée (`sharp`) → élargissement de plage critique + rider situationnel « +1d4° aux critiques » ;
 *  - Fléau (`bane`) / Élément (`elemental`) → riders de DM SITUATIONNELS (`SituationalDamageBonus`) ;
 *  - Parade (`parry`) / Résistance à la magie (`magic-resistance`) → bonus de DEF magique (`magicDef`) ;
 *  - Défense (`defense`) / Résistance [substance] (`resistance`) / Protection (`protection`) → RD
 *    (`DamageReduction`, agrégée avec les capacités par `stackedDamageReductions`) ;
 *  - Ombre (`shadow`) / Natation (`swimming`) → bonus de MAGIE aux tests d'un domaine (`testBonuses`) ;
 *  - Action libre (`free-action`) → immunités d'état (ralenti/immobilisé/paralysé) ;
 *  - Mobile (`mobile`) → réduction du malus d'armure (p. 188).
 *
 * Les effets ne comptent que lorsque l'objet est PORTÉ / EN MAIN : ce module lit `line`, ce sont les
 * appelants (agrégations d'équipement) qui filtrent sur `line.worn` / l'arme réellement maniée.
 *
 * CONTRAINTE d'architecture : ce module n'importe JAMAIS `equipment.ts` (qui, lui, l'importe pour les
 * tests et le malus d'armure) — pas de cycle. Les libellés d'objet source sont fournis par l'appelant.
 *
 * Une propriété DOUBLÉE (`doubled`, p. 251/254) double son EFFET numérique (comme son niveau de magie) ;
 * le cas de la Protection (division) fait exception (voir `magicDamageReductions`).
 */
import { progression } from '@/data';
import type { DamageReduction, ImmunityId } from '@/data/schema';
import { scalingDie } from '@/lib/engine';
import type { CriticalRangeSource } from './effects';
import { magicPropertyLabel } from './magicItem';
import type { EquipmentLine, MagicProperty } from './types';
import type { AttackMode, PermanentFlatBonus, SituationalDamageBonus } from './weaponDamageBonus';

/** Page source du chapitre « Objets magiques » pour les propriétés d'ARME (verbatim en infobulle). */
const WEAPON_PROPERTY_PAGE = 251;

/**
 * `featureId` sentinelle des contributions portées par un OBJET (et non une capacité) : les formes
 * moteur réutilisées (`SituationalDamageBonus`, `PermanentFlatBonus`) exigent un `featureId`, mais un
 * objet n'appartient à aucune voie — cette valeur ne résout aucune capacité, donc aucune puce de voie.
 */
export const MAGIC_ITEM_FEATURE_ID = 'magic-item';

/** Coefficient d'effet d'une propriété : ×2 si doublée (p. 251/254), ×1 sinon. */
function factor(prop: MagicProperty): number {
  return prop.doubled ? 2 : 1;
}

/** Propriétés d'un objet, jamais nulles (ligne absente / non enchantée → []). */
function propertiesOf(line: EquipmentLine | null | undefined): MagicProperty[] {
  return line?.magicProperties ?? [];
}

// ---------------------------------------------------------------------------
// ARME — bonus magique +N (touche + DM)
// ---------------------------------------------------------------------------

/**
 * Bonus magique +N d'une ARME (`magicBonus`, p. 251) : « bonus en attaque ET aux dommages ». Renvoie
 * le nombre brut (0 si absent) — c'est le MÊME +N qui alimente la touche du mode de l'arme et un bonus
 * plat aux DM (voir `magicWeaponFlatDamage`). Le `magicBonus` est un +N direct, PAS une propriété : il
 * n'est jamais « doublé ».
 */
export function weaponMagicBonus(line: EquipmentLine | null | undefined): number {
  return line?.magicBonus ?? 0;
}

/**
 * Le +N magique d'une arme rendu en bonus PLAT permanent aux DM (`PermanentFlatBonus`), à concaténer aux
 * bonus plats des capacités dans l'expression de DM de l'arme portée. `null` si l'arme n'a pas de bonus.
 * `name` = libellé de l'objet source (fourni par l'appelant, qui seul connaît le nom d'affichage).
 */
export function magicWeaponFlatDamage(
  line: EquipmentLine | null | undefined,
  name: string,
): PermanentFlatBonus | null {
  const value = weaponMagicBonus(line);
  if (!value) return null;
  return { featureId: MAGIC_ITEM_FEATURE_ID, name, sourcePage: WEAPON_PROPERTY_PAGE, value };
}

// ---------------------------------------------------------------------------
// ARME — riders de DM situationnels (Fléau, Élément, Affûtée « aux critiques »)
// ---------------------------------------------------------------------------

/** Face concrète d'un dé évolutif « +1d4° » au niveau du personnage (table p. 43). `tierBonus`
 * (PER-324, défaut 0) décale le cran du dé évolutif ; 0 = comportement identique. */
function evolvingD4(count: number, level: number, tierBonus = 0): NonNullable<SituationalDamageBonus['dice']> {
  return { count, die: scalingDie(level, progression, tierBonus), evolving: true };
}

/**
 * Riders de DM SITUATIONNELS d'une arme magique portée, au niveau `level` du personnage :
 *  - Fléau des [catégorie] → +1d4° « contre les [catégorie] » ;
 *  - [Élément/substance] → +1d4° de la substance (libellé = son nom) ;
 *  - Affûtée → +1d4° « aux attaques critiques » (le +1 de plage critique passe par `magicWeaponCriticalRanges`).
 * Une propriété doublée porte 2d4° (le NOMBRE de dés double). `name` = libellé de l'objet source.
 */
export function magicWeaponSituationalDamage(
  line: EquipmentLine | null | undefined,
  name: string,
  level: number,
  tierBonus = 0,
): SituationalDamageBonus[] {
  const out: SituationalDamageBonus[] = [];
  for (const prop of propertiesOf(line)) {
    const base = { featureId: MAGIC_ITEM_FEATURE_ID, name, sourcePage: WEAPON_PROPERTY_PAGE };
    if (prop.kind === 'bane') {
      const category = prop.creatureCategory?.trim();
      out.push({
        ...base,
        dice: evolvingD4(factor(prop), level, tierBonus),
        conditionLabel: category ? `contre les ${category}` : 'contre une catégorie de créature',
      });
    } else if (prop.kind === 'elemental') {
      out.push({
        ...base,
        dice: evolvingD4(factor(prop), level, tierBonus),
        conditionLabel: magicPropertyLabel(prop).toLowerCase(),
      });
    } else if (prop.kind === 'sharp') {
      out.push({
        ...base,
        dice: evolvingD4(factor(prop), level, tierBonus),
        conditionLabel: 'aux attaques critiques',
      });
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// ARME — plage critique (Affûtée)
// ---------------------------------------------------------------------------

/**
 * Élargissements de plage critique portés par les propriétés d'une arme (Affûtée : +1 point, p. 251),
 * pour la `scope` (mode) donnée de l'arme — mêmes `CriticalRangeSource` que les capacités et la plage
 * intrinsèque de l'arme, cumulés par `combineCriticalRanges`. Une Affûtée doublée élargit de 2.
 */
export function magicWeaponCriticalRanges(
  line: EquipmentLine | null | undefined,
  scope: AttackMode,
): CriticalRangeSource[] {
  const out: CriticalRangeSource[] = [];
  for (const prop of propertiesOf(line)) {
    if (prop.kind !== 'sharp') continue;
    out.push({ name: magicPropertyLabel(prop), scope, value: factor(prop) });
  }
  return out;
}

// ---------------------------------------------------------------------------
// DÉFENSE — bonus de DEF magique (Parade, Résistance à la magie)
// ---------------------------------------------------------------------------

/**
 * Bonus de DEF magique apporté par les PROPRIÉTÉS d'un objet porté, à cumuler au canal `magicDef` :
 *  - Parade (`parry`) : le bonus de DEF de l'arme (p. 251, = son niveau de magie) ;
 *  - Résistance à la magie (`magic-resistance`) : « +5 en DEF » (p. 253, lecture littérale ; l'alternative
 *    « ou aux tests pour résister à la magie » reste au choix du joueur, rappelée en infobulle).
 * Une propriété doublée double le bonus. Ne touche PAS au malus d'armure (canal `magicDef` de la LIGNE
 * d'armure uniquement, cf. `armorEncumbrancePenalty`) : une Parade portée par une arme n'allège aucune armure.
 */
export function magicPropertyDefBonus(line: EquipmentLine | null | undefined): number {
  let bonus = 0;
  for (const prop of propertiesOf(line)) {
    if (prop.kind === 'parry') bonus += (prop.defBonus ?? 0) * factor(prop);
    else if (prop.kind === 'magic-resistance') bonus += 5 * factor(prop);
  }
  return bonus;
}

// ---------------------------------------------------------------------------
// DÉFENSE — réductions de dégâts (Défense, Résistance [substance], Protection)
// ---------------------------------------------------------------------------

/** Verbatim court de la condition d'une Protection, pour le badge situationnel de la carte Défense. */
export const PROTECTION_CONDITION = 'coups critiques et attaques sournoises';

/**
 * Réductions de dégâts portées par les PROPRIÉTÉS d'un objet, en `DamageReduction` — la même forme que
 * les RD de capacités, pour être agrégées et cumulées par `stackedDamageReductions` :
 *  - Défense (RD 2) / Défense supérieure (RD 4) → `flat` sans portée (tous les DM), p. 253 ;
 *  - Résistance [substance] X → `flat` de valeur X sur la portée `substance`, p. 253 ;
 *  - Protection → `divide` par 2, restreinte aux coups critiques et attaques sournoises, p. 253.
 * Doublage : la valeur PLATE double (Défense doublée → RD 4) ; la division (Protection) n'a pas de
 * doublage sensé (÷2 conservé). Une Résistance sans substance/valeur saisie est ignorée.
 */
export function magicDamageReductions(line: EquipmentLine | null | undefined): DamageReduction[] {
  const out: DamageReduction[] = [];
  for (const prop of propertiesOf(line)) {
    if (prop.kind === 'defense') {
      out.push({ kind: 'flat', value: (prop.tier === 2 ? 4 : 2) * factor(prop) });
    } else if (prop.kind === 'resistance') {
      if (!prop.substance || !prop.amount) continue;
      out.push({ kind: 'flat', value: prop.amount * factor(prop), scopes: [prop.substance] });
    } else if (prop.kind === 'protection') {
      out.push({ kind: 'divide', value: 2, againstAggressors: PROTECTION_CONDITION });
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// DÉFENSE — immunités d'état (Action libre)
// ---------------------------------------------------------------------------

/** États dont Action libre rend insensible « par magie » (p. 253). */
const FREE_ACTION_IMMUNITIES: readonly ImmunityId[] = ['slowed', 'immobilized', 'paralyzed'];

/**
 * Immunités d'état accordées par les propriétés d'un objet (Action libre → ralenti/immobilisé/paralysé,
 * p. 253). Le +5 « pour résister aux contraintes PHYSIQUES » reste en infobulle (aucun domaine de test
 * dédié dans le catalogue). Liste dédupliquée dans l'ordre canonique.
 */
export function magicImmunities(line: EquipmentLine | null | undefined): ImmunityId[] {
  const hasFreeAction = propertiesOf(line).some((prop) => prop.kind === 'free-action');
  return hasFreeAction ? [...FREE_ACTION_IMMUNITIES] : [];
}

// ---------------------------------------------------------------------------
// TESTS — bonus de magie par domaine (Ombre, Natation)
// ---------------------------------------------------------------------------

/** Un apport de MAGIE aux tests d'un domaine, porté par une propriété d'objet. */
export interface MagicPropertyTestBonus {
  /** Id du domaine de compétence visé (`testDomains`). */
  domain: string;
  /** Points ajoutés (arbitrés au MAX entre sources de magie par `resolveTestBonus`). */
  value: number;
}

/** Propriété d'objet → domaine de test (bonus de +5, p. 253). */
const PROPERTY_TEST_DOMAIN: Partial<Record<MagicProperty['kind'], string>> = {
  shadow: 'stealth', // Ombre → Discrétion (AGI, p. 202)
  swimming: 'swimming', // Natation → Natation (CON, p. 202)
};

/**
 * Bonus de MAGIE aux tests apportés par les propriétés d'un objet porté (Ombre → Discrétion, Natation →
 * Natation ; +5, p. 253), par domaine. Une propriété doublée porte +10. Consommé via
 * `testBonusSourcesFromEquipment`, puis arbitré au MAX (non-cumul des bonus de magie, p. 203) par
 * `resolveTestBonus`.
 */
export function magicPropertyTestBonuses(
  line: EquipmentLine | null | undefined,
): MagicPropertyTestBonus[] {
  const out: MagicPropertyTestBonus[] = [];
  for (const prop of propertiesOf(line)) {
    const domain = PROPERTY_TEST_DOMAIN[prop.kind];
    if (domain) out.push({ domain, value: 5 * factor(prop) });
  }
  return out;
}

// ---------------------------------------------------------------------------
// MALUS D'ARMURE (Mobile)
// ---------------------------------------------------------------------------

/**
 * Réduction du malus d'armure (p. 188) apportée par la propriété Mobile d'une armure (« le malus
 * d'armure est réduit de 4 », p. 253). Une Mobile doublée réduit de 8. S'ajoute à la réduction déjà
 * apportée par le `magicDef` de l'armure (cf. `armorEncumbrancePenalty`).
 */
export function magicMobilePenaltyReduction(line: EquipmentLine | null | undefined): number {
  let reduction = 0;
  for (const prop of propertiesOf(line)) {
    if (prop.kind === 'mobile') reduction += 4 * factor(prop);
  }
  return reduction;
}
