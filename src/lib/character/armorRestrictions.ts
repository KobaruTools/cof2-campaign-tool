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
import { equipmentById, featureById, priestGodById } from '@/data';
import type {
  Armor,
  ArmorAccessEffect,
  CharacterClass,
  Feature,
  RangedWeaponKind,
  Shield,
  ShieldAccess,
  UsageCounter,
  WieldRequirement,
} from '@/data/schema';
import { wornMeleeWeapon, wornRangedWeapon } from './equipment';
import { isFirearmItem } from './firearms';
import { twoWeaponCombatStatus } from './twoWeaponCombat';
import type { RulesContext } from '@/lib/engine';
import type { Character, EquipmentLine } from './types';
import { isCustomItem } from './types';
import { masteredClassIds } from './mastery';
import {
  borrowedFeatureChoices,
  borrowedFeatureIds,
  featureChoiceDefs,
  featureGrantsDefBonus,
  getOptionSelections,
} from './choices';

/**
 * PER-153 — capacité de rang 3 de la voie de l'humain (« Touche-à-tout », p. 57) qui fait EMPRUNTER
 * une capacité de rang 1 ou 2 de n'importe quel profil. Id de contenu persisté (slug français figé).
 */
const TOUCHE_A_TOUT_ID = 'humain-r3';

/**
 * PER-153 — ids des capacités EMPRUNTÉES via « Touche-à-tout » (humain-r3, p. 57) qui « doivent
 * respecter les limitations d'armure ». Verbatim p. 57 : « Si la capacité est de rang 2 ou accorde un
 * bonus de DEF, il doit respecter les limitations d'armure. » Un emprunt de rang 1 SANS bonus de DEF
 * en est donc EXEMPT (souplesse propre à Touche-à-tout). Les SORTS sont écartés : l'armure leur impose
 * un surcoût de mana d'incantation (PER-82, p. 178), pas l'interdiction binaire des capacités non-sorts
 * (p. 188). Ces ids sont ensuite traités comme des capacités NATIVES de leur PROFIL SOURCE par
 * `featureArmorRestrictionViolations` — p. 177 : « chaque capacité impose TOUJOURS les restrictions
 * d'armure qui correspondent au profil dont elle est issue ».
 */
export function armorLimitedBorrowedFeatureIds(character: Character): Set<string> {
  const result = new Set<string>();
  if (!character.featureIds.includes(TOUCHE_A_TOUT_ID)) return result;
  const defs = featureChoiceDefs(TOUCHE_A_TOUT_ID);
  const selections = character.featureChoices?.[TOUCHE_A_TOUT_ID] ?? [];
  selections.forEach((sel, i) => {
    if (defs[i]?.kind !== 'feature-from-path' || typeof sel !== 'string') return;
    const feature = featureById.get(sel);
    if (!feature || feature.isSpell) return; // sorts empruntés → surcoût de mana (PER-82)
    if (feature.rank === 2 || featureGrantsDefBonus(feature.id)) result.add(feature.id);
  });
  return result;
}

/**
 * PER-144 — capacité de rang 3 de la voie de l'elfe haut (« Talent pour la magie », p. 50) : le
 * joueur EMPRUNTE une capacité de magicien ou d'ensorceleur. Id de contenu persisté (slug figé).
 */
const TALENT_POUR_LA_MAGIE_ID = 'elfe-haut-r3';

/**
 * PER-144 — ids des capacités EMPRUNTÉES via « Talent pour la magie » (elfe-haut-r3, p. 50), tous rangs
 * confondus. Sert de base aux deux règles de la p. 50 :
 *  - rang 1 → « en armure sans pénalité » : AUCUN surcoût de mana d'incantation (PER-82) ;
 *  - rang 2 → « ne doit alors pas porter d'armure pour lancer le sort » : non lançable en armure.
 * Dans les deux cas, la notion de surcoût d'armure ne s'applique pas à ces emprunts (cf.
 * `spellArmorManaSurcharge`), l'affranchissement étant total. Ensemble vide si la capacité n'est pas
 * acquise. Ne dépend PAS de l'armure portée (contrairement à `magicTalentSpellsBlockedByArmor`).
 */
export function magicTalentBorrowedFeatureIds(character: Character): Set<string> {
  const result = new Set<string>();
  if (!character.featureIds.includes(TALENT_POUR_LA_MAGIE_ID)) return result;
  const defs = featureChoiceDefs(TALENT_POUR_LA_MAGIE_ID);
  const selections = character.featureChoices?.[TALENT_POUR_LA_MAGIE_ID] ?? [];
  selections.forEach((sel, i) => {
    if (defs[i]?.kind !== 'feature-from-path' || typeof sel !== 'string') return;
    if (featureById.has(sel)) result.add(sel);
  });
  return result;
}

/**
 * PER-144 — ids des SORTS empruntés via « Talent pour la magie » (elfe-haut-r3, p. 50) qui NE PEUVENT
 * PAS être lancés tant qu'une armure est portée. Verbatim p. 50 : un emprunt de rang 1 « peut utiliser
 * cette capacité en armure sans pénalité » ; « à la place, il peut choisir une capacité de rang 2, mais
 * ne doit alors pas porter d'armure pour lancer le sort ». Seul un emprunt de RANG 2 est donc concerné,
 * et UNIQUEMENT tant qu'une armure est portée (`isArmorWorn` : toute armure compte, objet personnalisé
 * inclus). Contrairement à PER-153, les SORTS ne sont PAS écartés — c'est justement le lancer du sort
 * emprunté qui est visé. Ce n'est PAS une désactivation (PER-83/86, dont les sorts sont de toute façon
 * exclus) : la capacité reste acquise ; le moteur SIGNALE seulement (avertissement non bloquant), l'elfe
 * PEUT lancer le sort en retirant son armure. Ensemble vide sans armure, sans la capacité, ou pour un
 * emprunt de rang 1.
 */
export function magicTalentSpellsBlockedByArmor(character: Character): Set<string> {
  const result = new Set<string>();
  if (!isArmorWorn(character.equipment)) return result;
  for (const id of magicTalentBorrowedFeatureIds(character)) {
    if (featureById.get(id)?.rank === 2) result.add(id);
  }
  return result;
}

/**
 * Message français prêt à afficher (notice) pour un sort emprunté de rang 2 non lançable en armure
 * (« Talent pour la magie », PER-144, p. 50). « (p. 50) » y est en parenthèse AUTONOME → parsé par
 * `PageRefText`/`SourceRef` côté UI.
 */
export function magicTalentArmorBlockMessage(): string {
  return "Sort emprunté de rang 2 : ne peut pas être lancé tant qu'une armure est portée — retirez votre armure pour le lancer (p. 50).";
}

/**
 * PER-333 — capacité de rang 3 de la voie de la fée (« Poudre de fée », p. 27) : le joueur EMPRUNTE une
 * capacité de rang 1 ou 2 de magicien/ensorceleur. Id de contenu persisté (slug figé).
 */
const POUDRE_DE_FEE_ID = 'lutin-fee-r3';

/**
 * PER-333 — id de la capacité EMPRUNTÉE via « Poudre de fée » (lutin-fee-r3, p. 27), ou `null` si la
 * capacité n'est pas acquise ou si aucun emprunt n'est encore retenu. Miroir de `donEtrangeBorrowedFeatureId`
 * (choix unique, indexé) : la voie de la fée n'offre qu'un unique emprunt.
 */
export function poudreDeFeeBorrowedFeatureId(character: Character): string | null {
  if (!character.featureIds.includes(POUDRE_DE_FEE_ID)) return null;
  const defs = featureChoiceDefs(POUDRE_DE_FEE_ID);
  const selections = character.featureChoices?.[POUDRE_DE_FEE_ID] ?? [];
  for (let i = 0; i < defs.length; i++) {
    if (defs[i]?.kind !== 'feature-from-path') continue;
    const sel = selections[i];
    if (typeof sel === 'string' && featureById.has(sel)) return sel;
  }
  return null;
}

/**
 * PER-333 — ids des SORTS empruntés via « Poudre de fée » (lutin-fee-r3, p. 27) qui NE PEUVENT PAS être
 * lancés tant qu'une armure est portée. Verbatim p. 27 : un emprunt de rang 1 se lance « quelle que soit
 * l'armure portée » ; « à la place, il peut choisir une capacité de rang 2, mais ne doit alors pas porter
 * d'armure pour lancer le sort ». Seul un emprunt de RANG 2 est donc concerné, et UNIQUEMENT tant qu'une
 * armure est portée — même mécanique que `magicTalentSpellsBlockedByArmor` (elfe haut, PER-144, p. 50).
 * Avertissement non bloquant (fiche permissive) : la capacité reste acquise, la fée peut lancer le sort en
 * retirant son armure. Ensemble vide sans armure, sans la capacité, ou pour un emprunt de rang 1.
 */
export function poudreDeFeeSpellBlockedByArmor(character: Character): Set<string> {
  const result = new Set<string>();
  if (!isArmorWorn(character.equipment)) return result;
  const id = poudreDeFeeBorrowedFeatureId(character);
  if (id !== null && featureById.get(id)?.rank === 2) result.add(id);
  return result;
}

/**
 * Message français prêt à afficher (notice) pour un sort emprunté de rang 2 via « Poudre de fée » non
 * lançable en armure (PER-333, p. 27). « (p. 27) » en parenthèse AUTONOME → parsé par
 * `PageRefText`/`SourceRef` côté UI.
 */
export function poudreDeFeeArmorBlockMessage(): string {
  return "Sort emprunté de rang 2 : ne peut pas être lancé tant qu'une armure est portée — retirez votre armure pour le lancer (p. 27).";
}

/**
 * PER-146 — capacité de rang 1 de la voie du gnome (« Don étrange », p. 53) : le gnome EMPRUNTE une
 * capacité de rang 1 d'ensorceleur. Id de contenu persisté (slug figé).
 */
export const DON_ETRANGE_ID = 'gnome-r1';

/**
 * PER-146 — clé d'état PARTAGÉE (`sharedKey`) sous laquelle est stocké, dans `Character.usageCounters`,
 * le décompte « 1 usage/jour en armure » du sort emprunté via « Don étrange » (p. 53). Clé DÉDIÉE (et
 * non l'id du sort emprunté) : le décompte du jour survit à un changement de sort emprunté et ne peut
 * pas entrer en collision avec un compteur natif du même sort. Suivi journalier (`resetOn: 'day'`).
 */
export const DON_ETRANGE_ARMOR_USAGE_KEY = 'gnome-don-etrange-armor';

/**
 * PER-146 — id de la capacité de rang 1 d'ensorceleur EMPRUNTÉE via « Don étrange » (gnome-r1, p. 53),
 * ou `null` si « Don étrange » n'est pas acquise ou si aucun emprunt n'est encore retenu. Miroir scopé
 * de `magicTalentBorrowedFeatureIds` : la voie du gnome n'offre qu'un unique emprunt (choix d'index 0).
 */
export function donEtrangeBorrowedFeatureId(character: Character): string | null {
  if (!character.featureIds.includes(DON_ETRANGE_ID)) return null;
  const defs = featureChoiceDefs(DON_ETRANGE_ID);
  const selections = character.featureChoices?.[DON_ETRANGE_ID] ?? [];
  for (let i = 0; i < defs.length; i++) {
    if (defs[i]?.kind !== 'feature-from-path') continue;
    const sel = selections[i];
    if (typeof sel === 'string' && featureById.has(sel)) return sel;
  }
  return null;
}

/**
 * PER-146 — compteur d'usage SYNTHÉTIQUE (1 charge/jour) à afficher sur le sort d'ensorceleur emprunté
 * via « Don étrange » (gnome-r1, p. 53) UNIQUEMENT tant qu'une armure est portée. Verbatim p. 53 :
 * « S'il porte une armure, il ne peut pas utiliser ce sort plus d'une fois par jour (il doit payer le
 * coût en PM de façon normale) ». La limite s'AJOUTE au coût en PM (elle ne le remplace pas) — d'où un
 * simple compteur d'usages, la goutte de mana restant affichée par ailleurs. Suivi PAR CARTE, à faible
 * cadence (`hideFromStatusPanel: true` : pas une réserve tactique du tableau de bord). `null` sans
 * armure, sans la capacité, ou sans emprunt retenu → aucun compteur (comportement normal du sort).
 */
export function donEtrangeArmorUsageCounter(character: Character): UsageCounter | null {
  if (!isArmorWorn(character.equipment)) return null;
  if (!donEtrangeBorrowedFeatureId(character)) return null;
  return {
    max: 1,
    resetOn: 'day',
    hideFromStatusPanel: true,
    sharedKey: DON_ETRANGE_ARMOR_USAGE_KEY,
    label: 'Usage en armure',
  };
}

/**
 * PER-146 — compteurs d'usage SYNTHÉTIQUES (non déclarés sur la `Feature`) à injecter sur la carte
 * d'une capacité HÔTE quand une armure est portée : id de la capacité hôte → compteur. Aujourd'hui
 * seule « Don étrange » du gnome (gnome-r1 → compteur 1/jour, p. 53) est concernée, mais la forme en
 * table permet d'en ajouter d'autres sans retoucher le rendu. Vide sans armure / capacité / emprunt.
 */
export function borrowedArmorUsageCounters(character: Character): Map<string, UsageCounter> {
  const map = new Map<string, UsageCounter>();
  const donEtrange = donEtrangeArmorUsageCounter(character);
  if (donEtrange) map.set(DON_ETRANGE_ID, donEtrange);
  return map;
}

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
 * Effets `armor-access` EFFECTIFS d'un personnage, avec leur capacité porteuse. Deux origines,
 * traitées de façon UNIFORME par tous les lecteurs (plafond de port PER-80/82, relèvement d'usage
 * par voie d'origine PER-86) :
 *  - effets posés INCONDITIONNELLEMENT sur `Feature.effects` (barbare Tour de force, chevalier
 *    Autorité naturelle — PER-81) ;
 *  - effets portés par une OPTION de choix RETENUE (`FeatureChoiceOption.armorAccess`, PER-236) :
 *    l'accès n'est débloqué que si le joueur a effectivement retenu l'option (ex. Guerrier « Armure
 *    lourde », resistance-r3 : l'option « plaque » débloque l'accès, l'option « +1 DEF » non).
 * La possession/la sélection suffit (on ne double pas la vérification de maîtrise : investir dans la
 * voie porteuse la garantit déjà). Ordre : effets de capacité puis effets d'option.
 */
function* armorAccessEffects(
  character: Character,
): Iterable<{ feature: Feature; effect: ArmorAccessEffect }> {
  for (const id of character.featureIds) {
    const feature = featureById.get(id);
    if (!feature) continue;
    for (const effect of feature.effects ?? []) {
      if (effect.kind === 'armor-access') yield { feature, effect };
    }
    // Accès d'armure débloqué par une OPTION de choix retenue (PER-236).
    const choices = feature.choices ?? [];
    for (let i = 0; i < choices.length; i++) {
      const choice = choices[i];
      if (choice.kind !== 'option') continue;
      for (const optId of getOptionSelections(character, id, i)) {
        const option = choice.options.find((o) => o.id === optId);
        if (option?.armorAccess) yield { feature, effect: option.armorAccess };
      }
    }
  }
}

/**
 * DEF plafond débloquée par les effets `armor-access` EFFECTIFS (PER-81/236) : certaines capacités
 * (ou options retenues) relèvent l'armure maximale au-delà du plafond du profil (barbare Tour de
 * force → chemise de mailles, Briseur d'os → cotte de mailles ; chevalier Autorité naturelle →
 * plaque complète ; guerrier Armure lourde option « plaque » → armure de plaques, p. 178/86/90). On
 * retient la MEILLEURE armure débloquée (`maxArmorId` du catalogue) ; 0 si aucun accès n'est actif.
 */
function armorAccessDef(character: Character): number {
  let def = 0;
  for (const { effect } of armorAccessEffects(character)) {
    const armor = equipmentById.get(effect.maxArmorId);
    if (armor?.category === 'armor') def = Math.max(def, armor.def);
  }
  return def;
}

/**
 * Plafond d'armure exprimé à la fois en DEF mondaine et par l'id d'armure du catalogue
 * qui le fixe (`null` = aucune armure autorisée).
 */
interface ArmorCeiling {
  def: number;
  armorId: string | null;
}

/** Plafond correspondant à un `maxArmorId` de catalogue (`null` ou inconnu → aucune armure). */
function armorCeilingOf(armorId: string | null): ArmorCeiling {
  if (armorId === null) return { def: 0, armorId: null };
  const armor = equipmentById.get(armorId);
  return armor?.category === 'armor' ? { def: armor.def, armorId } : { def: 0, armorId: null };
}

/**
 * Relèvements d'accès d'ARMURE d'USAGE par profil (`classId`) débloqués par les capacités
 * ACQUISES, pour la restriction FINE par capacité d'origine (PER-86) :
 *  - un effet `armor-access` (PER-81) relève l'armure d'usage de SON profil d'origine — le
 *    livre l'énonce en ces termes (« utiliser toutes les capacités des voies de barbare […]
 *    avec une chemise de mailles », Tour de force, p. 79) ;
 *  - un `hybridClassRaises` relève d'un cran l'armure d'usage d'AUTRES voies de combattant
 *    pour un hybride de combattant (note d'Autorité naturelle, p. 86).
 * On retient la MEILLEURE armure débloquée par profil. Ce relèvement est propre à l'USAGE des
 * capacités ; le plafond de PORT global (PER-80/81) l'ignore.
 */
function usageArmorAccessByClass(character: Character, ctx: RulesContext): Map<string, ArmorCeiling> {
  const byClass = new Map<string, ArmorCeiling>();
  const raise = (classId: string, ceiling: ArmorCeiling) => {
    const prev = byClass.get(classId);
    if (!prev || ceiling.def > prev.def) byClass.set(classId, ceiling);
  };
  for (const { feature, effect } of armorAccessEffects(character)) {
    const path = ctx.pathById.get(feature.pathId);
    // Relèvement du ou des profils d'origine de la capacité porteuse.
    if (path?.type === 'class') {
      const ceiling = armorCeilingOf(effect.maxArmorId);
      for (const classId of path.classIds) raise(classId, ceiling);
    }
    // Relèvements CROISÉS explicites (hybride de combattant, p. 86/90).
    for (const hr of effect.hybridClassRaises ?? []) raise(hr.classId, armorCeilingOf(hr.maxArmorId));
  }
  return byClass;
}

/**
 * Écart d'USAGE d'une capacité non-sort dû à l'armure portée (restriction FINE par profil
 * d'origine, PER-86). À DISTINGUER de `ArmorRestrictionViolation` (plafond de PORT global,
 * PER-80) : ici c'est l'usage d'UNE capacité qui est gêné par une armure que le personnage
 * a pourtant le droit de porter (cas des hybrides — p. 177, p. 180).
 */
export interface FeatureArmorRestrictionViolation {
  /** Id de la capacité gênée. */
  featureId: string;
  /** Nom affiché de la capacité. */
  featureName: string;
  /** Profil d'origine retenu (le plus permissif si la voie est partagée). */
  classId: string;
  /** Nom du profil d'origine (affiché). */
  className: string;
  /** DEF mondaine max autorisée pour utiliser cette capacité (0 = aucune armure). */
  allowedDef: number;
  /** Nom de l'armure au plafond d'usage (`null` = aucune armure autorisée). */
  allowedArmorName: string | null;
  /** DEF mondaine de l'armure effectivement portée. */
  wornDef: number;
}

/**
 * PER-143 — capacités EMPRUNTÉES (choix `feature-from-path`) soumises à la règle de BASE des
 * limitations d'armure (encadré « Appel à une autre capacité », p. 41 : « ce sont les limitations
 * d'armure qui correspondent à la capacité de la voie B qui s'appliquent »). Renvoie les ids empruntés
 * de TOUTES les voies A qui empruntent (demi-orc « Talent pour la violence », elfe sylvain « Enfant de
 * la forêt », chevalier « Formation d'élite », expert de prestige…), traités ensuite comme des
 * capacités NATIVES de leur PROFIL D'ORIGINE par `featureArmorRestrictionViolations`.
 *
 * EXCLUT « Touche-à-tout » (humain-r3) : son emprunt suit une souplesse PROPRE (un rang 1 sans bonus de
 * DEF est exempté, p. 57), gérée à part par `armorLimitedBorrowedFeatureIds` (PER-153) — sans quoi la
 * règle de base ré-attraperait des emprunts que Touche-à-tout affranchit. Les SORTS ne sont pas filtrés
 * ici (l'appelant les écarte via `isSpell` : leur surcoût de mana en armure relève de PER-82).
 */
function generallyArmorLimitedBorrowedFeatureIds(character: Character): Set<string> {
  const result = new Set<string>();
  for (const [borrowedId, { hostFeatureId }] of borrowedFeatureChoices(character)) {
    if (hostFeatureId === TOUCHE_A_TOUT_ID) continue;
    result.add(borrowedId);
  }
  return result;
}

/**
 * PER-143 — plafonds d'armure d'usage RELEVÉS par une EXCEPTION de la voie A
 * (`PathFeatureChoice.borrowArmorMax`) pour les capacités empruntées (encadré p. 41 : « Lorsqu'il
 * existe des exceptions, elles sont indiquées dans le texte de la capacité de la voie A »). Map
 * `id emprunté → ArmorCeiling`. Aujourd'hui : Enfant de la forêt (elfe sylvain, p. 52) → cuir renforcé.
 * Le plafond effectif retenu par `featureArmorRestrictionViolations` est le MAX de ce plafond et de
 * celui du profil d'origine. Vide si aucune exception n'est déclarée.
 */
function borrowedArmorExceptionCeilings(character: Character): Map<string, ArmorCeiling> {
  const map = new Map<string, ArmorCeiling>();
  for (const [borrowedId, { choice }] of borrowedFeatureChoices(character)) {
    if (choice.borrowArmorMax === undefined) continue;
    map.set(borrowedId, armorCeilingOf(choice.borrowArmorMax));
  }
  return map;
}

/**
 * Restrictions d'USAGE d'armure par capacité d'origine (PER-86, p. 177/178/180) : chaque
 * capacité NON-SORT impose l'armure maximale de SON profil d'origine, indépendamment du profil
 * principal. Renvoie une entrée par capacité acquise dont l'armure portée (DEF MONDAINE, hors
 * bonus magique — la restriction porte sur le TYPE d'armure) dépasse ce plafond d'usage.
 *
 * Portée :
 *  - capacités NATIVES acquises + capacités EMPRUNTÉES (choix `feature-from-path`, PER-143) : une
 *    capacité empruntée suit les limitations d'armure de son PROFIL D'ORIGINE (voie B), exactement
 *    comme une capacité native (encadré « Appel à une autre capacité », p. 41). Les exceptions de la
 *    voie A (ex. Enfant de la forêt → cuir renforcé, p. 52) RELÈVENT ce plafond
 *    (`borrowedArmorExceptionCeilings`). « Touche-à-tout » (humain-r3) garde sa souplesse propre
 *    (PER-153, `armorLimitedBorrowedFeatureIds`) ;
 *  - SORTS exclus (leur surcoût de mana en armure relève de PER-82) ;
 *  - seules les capacités de VOIE DE PROFIL portent une restriction d'origine (les voies de
 *    peuple, du mage et de prestige n'en fixent pas ici) ;
 *  - passifs ET actifs sont signalés (décision propriétaire — lecture littérale, cf. PER-75) ;
 *    le RETRAIT effectif du bonus (désactivation) relève de PER-83, pas de ce module.
 * Le moteur SIGNALE seulement ; le rendu est VISUEL (rang désaturé + infobulle/notice dans
 * `FeaturesByPath`, via `featureArmorRestrictionMessage`), pas un avertissement de conformité.
 */
export function featureArmorRestrictionViolations(
  character: Character,
  ctx: RulesContext,
): FeatureArmorRestrictionViolation[] {
  const wornDef = wornArmorWorldlyDef(character.equipment);
  if (wornDef === 0) return []; // aucune armure (mondaine) portée → rien à signaler
  const accessByClass = usageArmorAccessByClass(character, ctx);
  const violations: FeatureArmorRestrictionViolation[] = [];

  // Capacités NATIVES acquises + capacités EMPRUNTÉES : la règle de base (PER-143) traite tout emprunt
  // comme natif de son PROFIL SOURCE (p. 41), sauf « Touche-à-tout » (humain-r3) dont la souplesse
  // propre (rang 1 sans bonus de DEF exempté, p. 57) est portée par `armorLimitedBorrowedFeatureIds`
  // (PER-153). Dédoublonné (le domaine d'emprunt exclut déjà les capacités déjà possédées).
  const featureIds = new Set([
    ...character.featureIds,
    ...generallyArmorLimitedBorrowedFeatureIds(character), // règle de base (PER-143), hors Touche-à-tout
    ...armorLimitedBorrowedFeatureIds(character), // Touche-à-tout, souplesse propre (PER-153)
  ]);
  const exceptionCeilings = borrowedArmorExceptionCeilings(character); // exceptions de la voie A (PER-143)
  // PER-401 — capacité DIVINE du prêtre spécialiste (p. 122) : contrairement à un emprunt
  // (« Appel à une autre capacité », p. 41), le livre en fait une capacité NATIVE du prêtre qui
  // remplace un rang de sa propre voie — elle ne porte donc PAS le plafond d'armure de son
  // profil DONNEUR (ex. Poings de fer/moine = aucune armure). Le prêtre reste soumis à SON
  // plafond de port global (PER-80, `wornArmorAllowedDef`), inchangé par ce module.
  const divineFeatureId =
    character.priestVocation?.mode === 'specialist'
      ? priestGodById.get(character.priestVocation.godId)?.divineFeatureId
      : undefined;

  for (const id of featureIds) {
    if (id === divineFeatureId) continue;
    const feature = featureById.get(id);
    if (!feature || feature.isSpell) continue; // sorts → PER-82
    const path = ctx.pathById.get(feature.pathId);
    if (path?.type !== 'class') continue; // seules les voies de profil fixent une restriction d'origine

    // Plafond d'usage = profil le plus PERMISSIF de la voie (base du profil, relevée par les
    // capacités `armor-access` / relèvements hybrides acquis).
    let best: { classId: string; ceiling: ArmorCeiling } | null = null;
    for (const classId of path.classIds) {
      const cls = ctx.classById.get(classId);
      if (!cls) continue;
      let ceiling = armorCeilingOf(cls.maxArmorId);
      const access = accessByClass.get(classId);
      if (access && access.def > ceiling.def) ceiling = access;
      if (!best || ceiling.def > best.ceiling.def) best = { classId, ceiling };
    }
    // PER-143 — exception d'armure de la voie A : relève le plafond d'usage de l'emprunt (Enfant de la
    // forêt → cuir renforcé, p. 52), au-delà du plafond natif du profil d'origine.
    const exception = exceptionCeilings.get(id);
    if (best && exception && exception.def > best.ceiling.def) best = { classId: best.classId, ceiling: exception };
    if (!best || wornDef <= best.ceiling.def) continue; // armure d'usage respectée

    const cls = ctx.classById.get(best.classId)!;
    violations.push({
      featureId: id,
      featureName: feature.name,
      classId: best.classId,
      className: cls.name,
      allowedDef: best.ceiling.def,
      allowedArmorName: best.ceiling.armorId
        ? (equipmentById.get(best.ceiling.armorId)?.name ?? null)
        : null,
      wornDef,
    });
  }

  return violations;
}

/**
 * Message français prêt à afficher (infobulle / notice) pour une restriction d'usage
 * (PER-86), sourcé p. 177. « (p. 177) » y est en parenthèse AUTONOME → parsé par
 * `PageRefText`/`SourceRef` côté UI.
 */
export function featureArmorRestrictionMessage(v: FeatureArmorRestrictionViolation): string {
  const cap = v.allowedArmorName ? `${v.allowedArmorName} maximum` : 'aucune armure autorisée';
  return `Capacité de « ${v.className} » inutilisable avec l'armure portée (${cap}) : retirez votre armure pour en profiter (p. 177).`;
}

/**
 * PER-83 — ids des capacités DÉSACTIVÉES par le port d'armure : exactement celles que
 * `featureArmorRestrictionViolations` (PER-86) signale comme inutilisables parce que l'armure
 * portée dépasse la restriction d'armure de leur PROFIL D'ORIGINE (moine → aucune armure, voleur
 * → cuir maximum, etc. — p. 177). Décision propriétaire A, lecture LITTÉRALE de la p. 188
 * (« si vous utilisez une armure trop lourde, toutes les capacités restreintes à une armure plus
 * légère vous seront interdites », passifs INCLUS — cf. `docs/extraction/armures.md` §3) : tant que
 * l'armure trop lourde est portée, ces capacités ne contribuent plus à AUCUN calcul (leurs bonus
 * de DEF/Init/PV, modificateurs de caractéristique, tests… sont retirés). Réversible : retirer
 * l'armure les réactive.
 *
 * Où PER-86 s'arrête et où PER-83 prend le relais : PER-86 SIGNALE (rang désaturé + infobulle dans
 * `FeaturesByPath`) mais laissait les bonus appliqués ; PER-83 les RETIRE effectivement du moteur,
 * en excluant ces ids de la liste des capacités actives (cf. `activeFeatureIdsForMods`). Les SORTS
 * sont exclus (leur surcoût de mana en armure relève de PER-82), comme dans le module PER-86.
 * Le garde-fou « aucune armure portée → aucun retrait » évite tout coût sur le cas le plus courant.
 */
export function armorDisabledFeatureIds(character: Character, ctx: RulesContext): Set<string> {
  if (!character.equipment?.length) return new Set();
  return new Set(featureArmorRestrictionViolations(character, ctx).map((v) => v.featureId));
}

/**
 * Un bouclier est-il RÉELLEMENT manié (slot `shield`) ? Compte TOUT bouclier porté, objet
 * personnalisé inclus (la règle « manier un bouclier », p. 87, ne dépend que de la présence
 * d'un bouclier en main, pas de ses stats). Sans-safe. Miroir de `isArmorWorn` (PER-132).
 */
export function isShieldWorn(equipment: EquipmentLine[] = []): boolean {
  return equipment.some((line) => line.worn?.slot === 'shield');
}

/**
 * PER-142 — ids des capacités DÉSACTIVÉES faute de manier un bouclier : toutes les capacités
 * acquises d'une voie marquée `requiresShield` (Voie du bouclier du guerrier, p. 87) quand AUCUN
 * bouclier n'est porté. Exactement comme `armorDisabledFeatureIds` (PER-83) : ces ids sont exclus
 * de la liste des capacités actives (`activeFeatureIdsForMods`) — leurs bonus (le +1/+2 DEF de
 * Défense au bouclier) et leur RD (retrait de DM des attaques de zone) ne comptent plus tant
 * qu'aucun bouclier n'est manié. Réversible : équiper un bouclier les réactive AUTOMATIQUEMENT,
 * sans interrupteur manuel. Le rendu « désactivée » (rang désaturé + notice) est porté par la
 * fiche sur le même patron que PER-86 (cf. `shieldRequiredMessage`).
 */
export function shieldDisabledFeatureIds(character: Character, ctx: RulesContext): Set<string> {
  if (isShieldWorn(character.equipment)) return new Set();
  const disabled = new Set<string>();
  // Capacités acquises ET EMPRUNTÉES (PER-74, touche à tout : une capacité empruntée d'une voie
  // `requiresShield` — ex. « Protéger un allié » — garde sa condition d'origine ; elle est barrée
  // et sans effet tant qu'aucun bouclier n'est manié, exactement comme dans sa voie native).
  for (const id of [...character.featureIds, ...borrowedFeatureIds(character)]) {
    const feature = featureById.get(id);
    if (!feature) continue;
    if (ctx.pathById.get(feature.pathId)?.requiresShield) disabled.add(id);
  }
  return disabled;
}

/**
 * Message français prêt à afficher (infobulle / notice) pour une capacité désactivée faute de
 * bouclier (PER-142), sourcé p. 87. « (p. 87) » y est en parenthèse AUTONOME → parsé par
 * `PageRefText`/`SourceRef` côté UI.
 */
export function shieldRequiredMessage(): string {
  return "Capacité inutilisable sans bouclier : équipez un bouclier pour en profiter (p. 87).";
}

/**
 * PER-74 — l'arme À DISTANCE réellement en main appartient-elle à un des sous-types requis ?
 * S'appuie sur `wornRangedWeapon` (main principale prioritaire, PER-76/77) et son `rangedKind`.
 * Une arme lançable (`thrown`) ou une fronde ne satisfait PAS `['bow', 'crossbow']` : seule
 * l'arme du sous-type exact compte.
 */
export function wornRangedWeaponMatchesKinds(
  equipment: EquipmentLine[] = [],
  kinds: RangedWeaponKind[],
): boolean {
  const kind = wornRangedWeapon(equipment)?.rangedKind;
  return kind !== undefined && kinds.includes(kind);
}

/**
 * PER-74 — ids des capacités DÉSACTIVÉES faute de manier l'arme à distance requise par leur voie :
 * toutes les capacités acquises d'une voie marquée `requiresRangedKinds` (Voie de l'archer arcanique,
 * p. 137) quand AUCUNE arme à distance d'un des sous-types requis n'est portée. Miroir à distance de
 * `shieldDisabledFeatureIds` (PER-142) : ces ids sont exclus des capacités actives
 * (`activeFeatureIdsForMods`) — leurs effets (le caractère magique de l'attaque à distance conféré par
 * « Flèche magique ») ne comptent plus tant que l'arc/l'arbalète n'est pas en main. Réversible :
 * équiper une telle arme les réactive AUTOMATIQUEMENT. Le rendu « désactivée » (rang désaturé + notice)
 * est porté par la fiche sur le même patron que PER-142 (cf. `rangedWeaponRequiredMessage`).
 */
export function rangedWeaponDisabledFeatureIds(character: Character, ctx: RulesContext): Set<string> {
  const disabled = new Set<string>();
  // Capacités acquises ET EMPRUNTÉES (PER-74, touche à tout) : un emprunt d'une voie
  // `requiresRangedKinds` garde sa condition d'arme à distance en main.
  for (const id of [...character.featureIds, ...borrowedFeatureIds(character)]) {
    const feature = featureById.get(id);
    if (!feature) continue;
    const kinds = ctx.pathById.get(feature.pathId)?.requiresRangedKinds;
    if (!kinds?.length) continue;
    if (!wornRangedWeaponMatchesKinds(character.equipment, kinds)) disabled.add(id);
  }
  return disabled;
}

/**
 * PER-74 — message français prêt à afficher (infobulle / notice) pour une capacité désactivée faute
 * d'arme à distance adéquate (Voie de l'archer arcanique, p. 137). « (p. 137) » y est en parenthèse
 * AUTONOME → parsé par `PageRefText`/`SourceRef` côté UI.
 */
export function rangedWeaponRequiredMessage(): string {
  return "Capacité inutilisable sans arc ni arbalète en main : équipez-en un pour en profiter (p. 137).";
}

/**
 * PER-74 — ids des capacités DÉSACTIVÉES faute de manier UNE ARME DANS CHAQUE MAIN : capacités
 * acquises ET EMPRUNTÉES d'une voie marquée `requiresDualWield` (Voie du combat à deux armes, p. 73)
 * quand le personnage ne tient PAS deux armes (une par main), À L'EXCLUSION de celles listées dans
 * `dualWieldExemptFeatureIds` (ex. « Combattant héroïque », boost passif). Miroir de
 * `shieldDisabledFeatureIds` (PER-142) : ces ids sont exclus des capacités actives
 * (`activeFeatureIdsForMods`) — leurs effets (le +1/+2 DEF de Parade croisée, etc.) ne comptent plus
 * tant que deux armes ne sont pas maniées. Réversible : tenir une arme dans chaque main les réactive
 * AUTOMATIQUEMENT. La détection réutilise `twoWeaponCombatStatus` (arme du catalogue par main, PER-116).
 */
export function dualWieldDisabledFeatureIds(character: Character, ctx: RulesContext): Set<string> {
  if (twoWeaponCombatStatus(character).dualWielding) return new Set();
  const disabled = new Set<string>();
  for (const id of [...character.featureIds, ...borrowedFeatureIds(character)]) {
    const feature = featureById.get(id);
    if (!feature) continue;
    const path = ctx.pathById.get(feature.pathId);
    if (path?.requiresDualWield && !path.dualWieldExemptFeatureIds?.includes(id)) disabled.add(id);
  }
  return disabled;
}

/**
 * PER-74 — message français prêt à afficher (infobulle / notice) pour une capacité désactivée faute
 * de manier une arme dans chaque main (Voie du combat à deux armes, p. 73). « (p. 73) » y est en
 * parenthèse AUTONOME → parsé par `PageRefText`/`SourceRef` côté UI.
 */
export function dualWieldRequiredMessage(): string {
  return "Capacité inutilisable sans une arme dans chaque main : équipez deux armes à une main pour en profiter (p. 73).";
}

/**
 * PER-74 — ids des capacités DÉSACTIVÉES parce que l'armure portée dépasse un plafond propre, quand
 * la DEF MONDAINE de l'armure portée dépasse celle du plafond. Deux granularités, LA CAPACITÉ étant
 * prioritaire (plus spécifique) :
 *  - `Feature.maxArmorId` : plafond d'UN SEUL RANG (Métamorphose, voie de l'ours p. 152 : « ne doit
 *    pas porter d'armure plus lourde que le cuir renforcé pour utiliser CETTE capacité » — les autres
 *    rangs de la même voie restent utilisables) ;
 *  - `Path.maxArmorId` : plafond de TOUTE LA VOIE (Voie du danseur de guerre, p. 150 : « Pour pouvoir
 *    utiliser les capacités de cette voie, le personnage ne doit pas porter d'armure plus encombrante
 *    qu'une chemise de mailles. »).
 * Couvre aussi les capacités EMPRUNTÉES. Miroir de `shieldDisabledFeatureIds` (PER-142) : ces ids
 * sont exclus des capacités actives (`activeFeatureIdsForMods`) — le +1/+2 en DEF et le +5 aux tests
 * des Pirouettes ne comptent plus tant que l'armure est trop lourde. Réversible : alléger ou retirer
 * l'armure les réactive AUTOMATIQUEMENT.
 *
 * À DISTINGUER de `featureArmorRestrictionViolations`/`armorDisabledFeatureIds` (PER-83/86), qui
 * appliquent le plafond du PROFIL D'ORIGINE d'une capacité : une voie de prestige n'a pas de profil
 * d'origine (`path.type !== 'class'`), donc ces modules ne la voient pas. Le bonus magique de
 * l'armure est ignoré (`wornArmorWorldlyDef`), la restriction portant sur le TYPE d'armure.
 */
export function pathArmorDisabledFeatureIds(character: Character, ctx: RulesContext): Set<string> {
  const disabled = new Set<string>();
  const wornDef = wornArmorWorldlyDef(character.equipment ?? []);
  if (wornDef === 0) return disabled; // aucune armure (mondaine) portée → rien à désactiver
  for (const id of [...character.featureIds, ...borrowedFeatureIds(character)]) {
    const feature = featureById.get(id);
    if (!feature) continue;
    const maxArmorId = feature.maxArmorId ?? ctx.pathById.get(feature.pathId)?.maxArmorId;
    if (maxArmorId === undefined) continue;
    if (wornDef > armorCeilingOf(maxArmorId).def) disabled.add(id);
  }
  return disabled;
}

/**
 * PER-74 — message français prêt à afficher (infobulle / notice) pour une capacité désactivée par une
 * armure plus lourde que son plafond (celui du RANG ou celui de LA VOIE, cf. `pathArmorDisabledFeatureIds`).
 * `scope` distingue le libellé (« cette capacité » / « cette voie »). La page est passée par l'appelant
 * et rendue en parenthèse AUTONOME → parsée par `PageRefText`/`SourceRef` côté UI.
 */
export function pathArmorRequiredMessage(
  maxArmorName: string,
  sourcePage: number,
  scope: 'feature' | 'path' = 'path',
): string {
  const subject = scope === 'feature' ? 'cette capacité' : 'cette voie';
  return `Capacité inutilisable avec l'armure portée : ${subject} n'admet pas plus encombrant qu'une ${maxArmorName.toLocaleLowerCase('fr')} — allégez votre armure pour en profiter (p. ${sourcePage}).`;
}

/**
 * PER-74 — raisons de désactivation par plafond d'armure (`Feature.maxArmorId` ou `Path.maxArmorId`,
 * la capacité étant prioritaire) → Map id de capacité → message prêt à afficher. Pendant « rendu » de
 * `pathArmorDisabledFeatureIds`, sur le patron de `wieldDisabledReasons` : la fiche grise le rang et
 * affiche la notice. Vide si aucune capacité n'est concernée.
 */
export function pathArmorDisabledReasons(character: Character, ctx: RulesContext): Map<string, string> {
  const map = new Map<string, string>();
  for (const id of pathArmorDisabledFeatureIds(character, ctx)) {
    const feature = featureById.get(id)!;
    if (feature.maxArmorId !== undefined) {
      const armorName = equipmentById.get(feature.maxArmorId)?.name ?? '';
      map.set(id, pathArmorRequiredMessage(armorName, feature.sourcePage, 'feature'));
      continue;
    }
    const path = ctx.pathById.get(feature.pathId)!;
    const armorName = equipmentById.get(path.maxArmorId!)?.name ?? '';
    map.set(id, pathArmorRequiredMessage(armorName, path.sourcePage, 'path'));
  }
  return map;
}

/**
 * PER-74 — la CONDITION D'ARME EN MAIN d'une capacité du flibustier (`Feature.wieldRequirement`) est-elle
 * remplie par l'équipement porté ? `'firearm'` : au moins une arme à poudre en main ; `'firearm-and-melee'` :
 * une arme à poudre EN MAIN (via `wornRangedWeapon`) ET une arme de contact en main (via `wornMeleeWeapon`)
 * — les deux occupant des mains distinctes. S'appuie sur les mêmes helpers d'arme portée que le reste du
 * module (main principale prioritaire, PER-76/77).
 */
export function wieldRequirementMet(equipment: EquipmentLine[] = [], req: WieldRequirement): boolean {
  const firearmInHand = isFirearmItem(wornRangedWeapon(equipment));
  if (req === 'firearm') return firearmInHand;
  // 'firearm-and-melee' : arme à poudre + arme de contact, une par main.
  return firearmInHand && wornMeleeWeapon(equipment) !== null;
}

/**
 * PER-74 — message français prêt à afficher (notice / infobulle) pour une capacité du flibustier NON
 * JOUABLE faute de la bonne arme en main. « (p. 141) » / « (p. 142) » en parenthèse AUTONOME → parsé
 * par `PageRefText`/`SourceRef` côté UI.
 */
export function wieldRequirementMessage(req: WieldRequirement): string {
  return req === 'firearm'
    ? "Capacité inutilisable sans arme à poudre en main : équipez-en une pour frapper de la crosse (p. 141)."
    : "Capacité inutilisable sans une arme à poudre dans une main ET une arme de contact dans l'autre (p. 142).";
}

/**
 * PER-74 — capacités GRISÉES (visuellement NON JOUABLES) faute de l'arme en main requise par leur
 * `wieldRequirement` (flibustier « Coup de crosse » / « Sabre au poing », p. 141-142) → Map id → message.
 * DÉSACTIVATION PUREMENT VISUELLE (patron `armorRestrictedReasons` : le rang est désaturé + notice, mais la
 * capacité reste acquise et interactive) — à DISTINGUER de `shieldDisabledFeatureIds` / `rangedWeaponDisabledFeatureIds`
 * qui RETIRENT en plus les effets via `activeFeatureIdsForMods` : ici les capacités n'ont aucun effet à retirer,
 * et l'acquis permanent (maîtrise des armes à poudre) doit rester valide (arbitrage proprio). Vide si tout est jouable.
 */
export function wieldDisabledReasons(character: Character): Map<string, string> {
  const map = new Map<string, string>();
  for (const id of character.featureIds) {
    const req = featureById.get(id)?.wieldRequirement;
    if (!req) continue;
    if (!wieldRequirementMet(character.equipment, req)) map.set(id, wieldRequirementMessage(req));
  }
  return map;
}

/** Écart de port d'armure/bouclier à signaler (avertissement non bloquant). */
export interface ArmorRestrictionViolation {
  kind: 'armor-too-heavy' | 'shield-not-allowed';
  /** Message français prêt à afficher, sourcé (p. 188). */
  message: string;
}

/**
 * Première ARMURE du CATALOGUE effectivement portée (au plus une compte, p. 188), avec sa
 * LIGNE d'inventaire — pour poser un badge sur la ligne exacte (rendu par ligne, PER-80).
 */
function wornCatalogArmorEntry(equipment: EquipmentLine[]): { line: EquipmentLine; item: Armor } | null {
  for (const line of equipment) {
    if (line.worn?.slot !== 'armor' || isCustomItem(line)) continue;
    const item = equipmentById.get(line.itemId);
    if (item?.category === 'armor') return { line, item };
  }
  return null;
}

/** Première armure du CATALOGUE effectivement portée (au plus une compte, p. 188). */
function wornCatalogArmor(equipment: EquipmentLine[]): Armor | null {
  return wornCatalogArmorEntry(equipment)?.item ?? null;
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
 * Une armure est-elle RÉELLEMENT portée (slot `armor`) ? À DISTINGUER de
 * `wornArmorWorldlyDef` (> 0) : ici on compte TOUTE armure portée, y compris une
 * armure personnalisée aux stats inconnues (DEF mondaine 0) — la règle « porte-t-il
 * une armure ? » (Armure de vent, PER-132, p. 81) ne dépend pas de la DEF de
 * l'armure, seulement de sa présence. Sans-safe (équipement absent → faux).
 */
export function isArmorWorn(equipment: EquipmentLine[] = []): boolean {
  return equipment.some((line) => line.worn?.slot === 'armor');
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

/**
 * Premier BOUCLIER du CATALOGUE effectivement porté (au plus un compte, p. 188), avec sa
 * LIGNE d'inventaire — pour poser un badge sur la ligne exacte (rendu par ligne, PER-80).
 */
function wornCatalogShieldEntry(equipment: EquipmentLine[]): { line: EquipmentLine; item: Shield } | null {
  for (const line of equipment) {
    if (line.worn?.slot !== 'shield' || isCustomItem(line)) continue;
    const item = equipmentById.get(line.itemId);
    if (item?.category === 'shield') return { line, item };
  }
  return null;
}

/** Premier bouclier du CATALOGUE effectivement porté (au plus un compte, p. 188). */
function wornCatalogShield(equipment: EquipmentLine[]): Shield | null {
  return wornCatalogShieldEntry(equipment)?.item ?? null;
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

/**
 * Écart de port d'armure/bouclier RATTACHÉ à sa ligne d'inventaire exacte (PER-80, rendu par
 * ligne) : Map identité de ligne → violation. Sert à poser un badge sur la ligne fautive de
 * l'inventaire (pendant du badge « Non maîtrisée · dé malus » des armes, PER-79), en plus de
 * l'avertissement agrégé en tête de fiche. Réutilise `armorRestrictionViolations` (même règle,
 * même message, même plafond) et n'affecte que la PREMIÈRE armure/bouclier du catalogue porté
 * (celle qui compte, p. 188). Vide si aucun écart.
 */
export function armorRestrictionByLine(
  character: Character,
  ctx: RulesContext,
): Map<EquipmentLine, ArmorRestrictionViolation> {
  const map = new Map<EquipmentLine, ArmorRestrictionViolation>();
  for (const violation of armorRestrictionViolations(character, ctx)) {
    const entry =
      violation.kind === 'armor-too-heavy'
        ? wornCatalogArmorEntry(character.equipment)
        : wornCatalogShieldEntry(character.equipment);
    if (entry) map.set(entry.line, violation);
  }
  return map;
}
