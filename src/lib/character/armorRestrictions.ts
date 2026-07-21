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
import { featureChoiceDefs, featureGrantsDefBonus } from './choices';

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
  for (const id of character.featureIds) {
    const feature = featureById.get(id);
    if (!feature?.effects) continue;
    const path = ctx.pathById.get(feature.pathId);
    for (const effect of feature.effects) {
      if (effect.kind !== 'armor-access') continue;
      // Relèvement du ou des profils d'origine de la capacité porteuse.
      if (path?.type === 'class') {
        const ceiling = armorCeilingOf(effect.maxArmorId);
        for (const classId of path.classIds) raise(classId, ceiling);
      }
      // Relèvements CROISÉS explicites (hybride de combattant, p. 86).
      for (const hr of effect.hybridClassRaises ?? []) raise(hr.classId, armorCeilingOf(hr.maxArmorId));
    }
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
 * Restrictions d'USAGE d'armure par capacité d'origine (PER-86, p. 177/178/180) : chaque
 * capacité NON-SORT impose l'armure maximale de SON profil d'origine, indépendamment du profil
 * principal. Renvoie une entrée par capacité acquise dont l'armure portée (DEF MONDAINE, hors
 * bonus magique — la restriction porte sur le TYPE d'armure) dépasse ce plafond d'usage.
 *
 * Portée :
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

  // Capacités NATIVES acquises + emprunts « Touche-à-tout » qualifiants (PER-153) : ces derniers
  // suivent les limitations d'armure de leur PROFIL SOURCE, exactement comme une capacité native
  // (p. 177). Dédoublonné (le domaine d'emprunt exclut déjà les capacités déjà possédées).
  const featureIds = new Set([...character.featureIds, ...armorLimitedBorrowedFeatureIds(character)]);

  for (const id of featureIds) {
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
  for (const id of character.featureIds) {
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
