/**
 * Légalité des choix et conformité aux règles — module pur (PRD §5.4, §5.5).
 *
 * Deux usages :
 *  - `canAcquireFeature` : utilisé par le **wizard bloquant** — ne propose
 *    qu'un choix légal (rang dans l'ordre, niveau requis, accès prestige,
 *    plafond de voies).
 *  - `checkCompliance` : utilisé par la **fiche permissive** — liste les
 *    écarts aux règles sous forme d'avertissements NON bloquants.
 *
 * Règles : `creation-progression.md` §11-13 (p. 39-42) et `progression.ts`.
 *
 * Le budget de points de capacité (`featurePointBudget`) distingue le gratuit de
 * l'acheté grâce à l'entrée d'historique de niveau 1 (les capacités de départ y
 * sont journalisées) ; il ne signale que la **sur-dépense** — les points non
 * dépensés sont légaux (point orphelin, p. 40). Si l'historique de niveau 1 est
 * absent (sauvegarde ancienne), on s'abstient pour éviter tout faux positif.
 */
import { ABILITY_MAX, ABILITY_MIN } from '@/data/schema';
import type {
  Feature,
  AbilityId,
  Family,
  FamilyId,
  CharacterClass,
  ProgressionRules,
  Path,
} from '@/data/schema';
import type { Character } from '@/lib/character/types';
import { isCustomItem } from '@/lib/character/types';
import { priestDivineFeatureId, priestDivineSlot, type DivineSlot } from '@/lib/character/choices';
import { effectiveClassPathIds, firearmsInactivePathIds } from '@/lib/character/classDisplay';
// Détection LÉGÈRE (PER-185) des objets « à poudre » du catalogue — source unique
// partagée avec la maîtrise des armes (PER-79). Cf. `FIREARM_ITEM_IDS`.
import { FIREARM_ITEM_IDS } from '@/lib/character/firearms';

/**
 * Voie EFFECTIVE d'une capacité pour la PROGRESSION : la capacité divine d'un prêtre
 * spécialiste (p. 122) compte pour sa voie d'ACCUEIL (le slot qu'elle occupe), et non
 * pour sa voie d'origine ; toute autre capacité garde sa voie native.
 */
function effectivePathId(slot: DivineSlot | null, featureId: string, nativePathId: string): string {
  return slot && featureId === slot.featureId ? slot.hostPathId : nativePathId;
}

/** Données de règles injectées (testable avec des fixtures). */
export interface RulesContext {
  featureById: Map<string, Feature>;
  pathById: Map<string, Path>;
  classById: Map<string, CharacterClass>;
  familyById: Map<FamilyId, Family>;
  progression: ProgressionRules;
}

export interface LegalityResult {
  legal: boolean;
  reasons: string[];
}

export type WarningCode =
  | 'MISSING_RANK'
  | 'RANK_LEVEL_TOO_LOW'
  | 'ABILITY_OUT_OF_RANGE'
  | 'TOO_MANY_PATHS'
  | 'MULTIPLE_PRESTIGE'
  | 'PRESTIGE_LEVEL_TOO_LOW'
  | 'HYBRID_PROFILE'
  | 'FEATURE_POINTS_OVERSPENT'
  | 'FIREARMS_DISABLED_PATH'
  | 'FIREARMS_DISABLED_ITEM'
  | 'UNKNOWN_FEATURE';

export interface Warning {
  code: WarningCode;
  message: string;
  featureId?: string;
  pathId?: string;
  /**
   * 'warning' (défaut) = écart aux règles ; 'info' = simple information sur un
   * choix pourtant légal (ex. profil hybride), à présenter différemment.
   */
  severity?: 'warning' | 'info';
}

/** Plafond de voies hors voie de peuple (p. 42 : « six voies, plus la voie de peuple »). */
export const MAX_NON_ANCESTRY_PATHS = 6;

/** Voie de l'expert (p. 129) : interdite aux profils hybrides multi-familles. */
export const EXPERT_PATH_ID = 'prestige-expert';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Coût d'une capacité en points (rang 1-2 → 1, rang 3+ → 2 — p. 39). */
export function featureCost(feature: Feature, progression: ProgressionRules): number {
  return progression.costPerRank[feature.rank] ?? (feature.rank <= 2 ? 1 : 2);
}

/**
 * Capacités obtenues **gratuitement** à la création (niveau 1) : les 2 voies de
 * profil de départ, le rang 1 de la voie de peuple et — pour les mages — le rang
 * 1 de la voie du mage et le bonus de rang 2 (creation-progression.md §5, §11).
 * Elles ne sont pas payées avec des points de capacité.
 *
 * Source fiable : l'entrée d'historique de niveau 1, que `materializeDraft`
 * renseigne avec exactement ces capacités. On restreint aux capacités encore
 * possédées. `known` est faux si cette entrée est absente (personnage construit à
 * la main / sauvegarde antérieure à l'historique) : on ne peut alors pas
 * distinguer le gratuit de l'acheté, et l'appelant s'abstient d'avertir.
 */
export function freeFeatureIds(character: Character): { ids: Set<string>; known: boolean } {
  const level1 = character.levelUpHistory.find((entry) => entry.level === 1);
  if (!level1) return { ids: new Set(), known: false };
  const owned = new Set(character.featureIds);
  return { ids: new Set(level1.chosenFeatureIds.filter((id) => owned.has(id))), known: true };
}

export interface FeaturePointBudget {
  /** Points de capacité disponibles sur la carrière : 2 par niveau au-delà du niveau 1. */
  available: number;
  /** Points effectivement dépensés (coût des capacités achetées, gratuites exclues). */
  spent: number;
  /** Vrai si le gratuit est identifiable (entrée d'historique de niveau 1 présente). */
  known: boolean;
}

/**
 * Bilan des points de capacité du personnage : ce qu'il peut dépenser selon son
 * niveau vs ce qu'il a réellement dépensé (capacités achetées, gratuites
 * déduites). À la création (niveau 1) aucun point n'est dépensable : les
 * capacités de départ sont gratuites (§5, §9).
 */
export function featurePointBudget(character: Character, ctx: RulesContext): FeaturePointBudget {
  const available = ctx.progression.featurePointsPerLevel * Math.max(0, character.level - 1);
  const { ids: free, known } = freeFeatureIds(character);
  let spent = 0;
  for (const id of character.featureIds) {
    if (free.has(id)) continue;
    const feature = ctx.featureById.get(id);
    if (feature) spent += featureCost(feature, ctx.progression);
  }
  return { available, spent, known };
}

function characterFamily(character: Character, ctx: RulesContext): Family | undefined {
  const characterClass = ctx.classById.get(character.classId);
  if (!characterClass) return undefined;
  return ctx.familyById.get(characterClass.familyId);
}

/**
 * Niveau minimum requis pour acquérir une capacité d'un rang donné.
 * Exception mage (p. 39) : un personnage de la famille des mages peut obtenir
 * une capacité de rang 2 dès le niveau 1 (le « 2* » de la table) ; cette
 * exception ne s'étend pas au rang 3.
 */
export function minLevelForRank(
  rank: number,
  family: Family | undefined,
  progression: ProgressionRules,
): number {
  if (rank === 2 && family?.id === 'mages') return 1;
  return progression.minLevelPerRank[rank] ?? 1;
}

/**
 * Rang le plus bas d'une voie (1 pour les voies de profil/peuple, 4 pour la
 * plupart des voies de prestige, 3 pour la voie du familier fantastique, p. 132
 * — anomalie assumée du livre). Sert à la fois à l'ordre des rangs et au niveau
 * d'accès des voies de prestige.
 */
export function lowestRank(path: Path, ctx: RulesContext): number {
  let min = Infinity;
  for (const id of path.featureIds) {
    const feature = ctx.featureById.get(id);
    if (feature && feature.rank < min) min = feature.rank;
  }
  return Number.isFinite(min) ? min : 1;
}

/** Rangs effectivement possédés dans une voie, triés croissant (la capacité divine
 *  compte pour sa voie d'ACCUEIL, p. 122). */
export function ownedRanks(character: Character, pathId: string, ctx: RulesContext): number[] {
  const slot = priestDivineSlot(character);
  const ranks: number[] = [];
  for (const id of character.featureIds) {
    const feature = ctx.featureById.get(id);
    if (!feature) continue;
    if (effectivePathId(slot, id, feature.pathId) === pathId) ranks.push(feature.rank);
  }
  return ranks.sort((a, b) => a - b);
}

/**
 * Rangs possédés dans une voie d'après la voie NATIVE des capacités (sans tenir
 * compte du remap de la capacité divine vers sa voie d'accueil). Sert au « skip de
 * rang » : une divine issue de la voie d'origine (ex. `survie-r2`) y est bien
 * détenue, et le perso ne peut pas la reprendre (p. 40, « pas deux fois la même
 * capacité ») ; ce rang doit donc compter comme prérequis satisfait pour continuer
 * la voie d'origine (rangs supérieurs), sans qu'on ait à le racheter.
 */
export function nativeOwnedRanks(character: Character, pathId: string, ctx: RulesContext): number[] {
  const ranks: number[] = [];
  for (const id of character.featureIds) {
    const feature = ctx.featureById.get(id);
    if (feature && feature.pathId === pathId) ranks.push(feature.rank);
  }
  return ranks.sort((a, b) => a - b);
}

/**
 * Rangs « sautés » dans une voie : possédés nativement mais comptés ailleurs (la
 * capacité divine, logée dans sa voie d'accueil). Pour ces rangs, on tient le
 * prérequis pour satisfait alors que la capacité native n'est pas (re)prise — d'où
 * un trou « légal » dans l'ordre des rangs. Vide pour les voies sans divine.
 */
export function skippedRanks(character: Character, pathId: string, ctx: RulesContext): number[] {
  const effective = new Set(ownedRanks(character, pathId, ctx));
  return nativeOwnedRanks(character, pathId, ctx).filter((r) => !effective.has(r));
}

/** Voies (hors voie de peuple/voie du mage) actuellement entamées. */
function nonAncestryPaths(character: Character, ctx: RulesContext): Set<string> {
  const slot = priestDivineSlot(character);
  const paths = new Set<string>();
  for (const id of character.featureIds) {
    const feature = ctx.featureById.get(id);
    if (!feature) continue;
    // Voie d'accueil pour la capacité divine (pas sa voie d'origine).
    const path = ctx.pathById.get(effectivePathId(slot, id, feature.pathId));
    if (!path) continue;
    if (path.type === 'class' || path.type === 'prestige') paths.add(path.id);
  }
  return paths;
}

/** Voies de prestige actuellement entamées. */
function startedPrestigePaths(character: Character, ctx: RulesContext): Set<string> {
  const paths = new Set<string>();
  for (const id of character.featureIds) {
    const feature = ctx.featureById.get(id);
    const path = feature && ctx.pathById.get(feature.pathId);
    if (path && path.type === 'prestige') paths.add(path.id);
  }
  return paths;
}

/** Famille du profil d'une voie de profil (via son premier profil rattaché). */
export function classPathFamily(path: Path, ctx: RulesContext): FamilyId | undefined {
  if (path.type !== 'class') return undefined;
  const classId = path.classIds[0];
  return classId ? ctx.classById.get(classId)?.familyId : undefined;
}

/**
 * Familles de profil dans lesquelles le personnage a au moins une capacité de
 * voie de profil (les voies de peuple/mage/prestige ne comptent pas). Sert à
 * détecter l'hybridation (capacités de ≥ 2 familles, p. 176).
 */
export function classFamiliesWithFeatures(character: Character, ctx: RulesContext): Set<FamilyId> {
  const families = new Set<FamilyId>();
  // La capacité divine d'un prêtre spécialiste vient d'un autre profil mais ne fait
  // PAS de lui un hybride (p. 122) : on l'exclut de la détection des familles.
  const divineId = priestDivineFeatureId(character);
  for (const id of character.featureIds) {
    if (id === divineId) continue;
    const feature = ctx.featureById.get(id);
    if (!feature) continue;
    const path = ctx.pathById.get(feature.pathId);
    if (!path) continue;
    const family = classPathFamily(path, ctx);
    if (family) families.add(family);
  }
  return families;
}

/** Profil hybride : capacités issues d'au moins deux familles de profils (p. 176). */
export function isHybrid(character: Character, ctx: RulesContext): boolean {
  return classFamiliesWithFeatures(character, ctx).size >= 2;
}

/**
 * Le personnage peut-il ouvrir une voie hors de son profil principal (devenir
 * hybride) ? Oui tant qu'au moins une des cinq voies du profil principal n'a
 * reçu aucune capacité — la « règle de la voie vierge » (p. 176). Continuer une
 * voie hybride déjà entamée reste toujours possible (vérifié en amont).
 */
export function canStartHybridPath(
  character: Character,
  ctx: RulesContext,
  firearmsAllowed: boolean = character.firearmsAllowed,
): boolean {
  const characterClass = ctx.classById.get(character.classId);
  if (!characterClass) return false;
  return effectiveClassPathIds(characterClass, firearmsAllowed).some(
    (pathId) => ownedRanks(character, pathId, ctx).length === 0,
  );
}

// ---------------------------------------------------------------------------
// Légalité d'acquisition (wizard bloquant)
// ---------------------------------------------------------------------------

/**
 * Détermine si le personnage peut acquérir la capacité donnée, à son niveau
 * actuel. Retourne toutes les raisons d'illégalité (vide si légal).
 */
export function canAcquireFeature(
  character: Character,
  featureId: string,
  ctx: RulesContext,
  // Autorisation EFFECTIVE des armes à feu (règle campagne ∧ choix perso, PER-185).
  // Défaut = snapshot du personnage (comportement historique sans campagne).
  firearmsAllowed: boolean = character.firearmsAllowed,
): LegalityResult {
  const reasons: string[] = [];
  const feature = ctx.featureById.get(featureId);
  if (!feature) return { legal: false, reasons: [`Capacité inconnue : ${featureId}`] };

  if (character.featureIds.includes(featureId)) {
    reasons.push('Capacité déjà acquise.');
  }

  const path = ctx.pathById.get(feature.pathId);
  if (!path) {
    return { legal: false, reasons: [`Voie inconnue : ${feature.pathId}`] };
  }
  const characterClass = ctx.classById.get(character.classId);
  const family = characterFamily(character, ctx);

  // Accès à la voie selon son type (p. 39-40, 176) :
  //  - voie de profil principal : les 5 voies du profil du personnage (on en
  //    choisit 2 à la création, les autres s'ouvrent ensuite) ;
  //  - voie de profil HORS profil principal : ouverte tant qu'au moins une des
  //    5 voies du profil principal est vierge (profil hybride, p. 176) ; une
  //    voie hybride déjà entamée se poursuit librement ;
  //  - voie de peuple / voie du mage : seulement la voie de peuple retenue
  //    (`ancestryPathId`) — pas les autres voies du peuple ni d'un autre peuple ;
  //  - voie de prestige : ouverte à tous (conditions de niveau/unicité ci-dessous).
  // (Le mécanisme « Appel à une autre capacité », p. 40, qui permet de piocher
  // ponctuellement dans une autre voie, est textuel et géré à la main sur la
  // fiche permissive — il n'entre pas dans les choix proposés par le wizard.)
  if (path.type === 'class') {
    // Variante « Arbalétrier » (p. 62) : la voie des explosifs et la voie du maître des arbalètes
    // sont mutuellement exclusives selon `firearmsAllowed`. La variante INACTIVE dans le cadre de jeu
    // courant n'existe pas — elle n'est acquérable ni comme voie principale ni comme voie hybride,
    // quel que soit le profil du personnage (le réglage est propre au personnage). On teste contre le
    // profil PROPRIÉTAIRE de la voie (arquebusier) pour couvrir aussi un accès hybride.
    const owningClass = ctx.classById.get(path.classIds[0]);
    if (owningClass && firearmsInactivePathIds(owningClass, firearmsAllowed).includes(path.id)) {
      reasons.push(
        firearmsAllowed === false
          ? `« ${path.name} » n'est pas disponible : les armes à feu sont interdites dans cet univers (variante « Arbalétrier », p. 62).`
          : `« ${path.name} » n'est disponible que lorsque les armes à feu sont interdites (variante « Arbalétrier », p. 62).`,
      );
    }
    const isMainProfilePath =
      characterClass != null &&
      effectiveClassPathIds(characterClass, firearmsAllowed).includes(path.id);
    if (!isMainProfilePath) {
      const alreadyStarted = ownedRanks(character, path.id, ctx).length > 0;
      if (!alreadyStarted && !canStartHybridPath(character, ctx, firearmsAllowed)) {
        reasons.push(
          `« ${path.name} » appartient à un autre profil : profil hybride impossible, les cinq voies de votre profil principal sont déjà entamées (p. 176).`,
        );
      }
    }
  } else if (path.type === 'ancestry' || path.type === 'mage') {
    if (character.ancestryPathId !== path.id) {
      reasons.push(`« ${path.name} » n'est pas votre voie de peuple.`);
    }
  }

  // Voie de l'expert : interdite si le personnage a déjà des capacités d'une
  // autre famille que celle de son profil principal (p. 129).
  if (path.id === EXPERT_PATH_ID && characterClass) {
    const otherFamilies = [...classFamiliesWithFeatures(character, ctx)].filter(
      (f) => f !== characterClass.familyId,
    );
    if (otherFamilies.length > 0) {
      reasons.push(
        "La voie de l'expert n'est pas accessible aux profils hybrides ayant des voies d'une autre famille que le profil principal (p. 129).",
      );
    }
  }

  // Ordre des rangs : tous les rangs inférieurs de la voie doivent être acquis
  // (à partir du rang le plus bas réel de la voie). Un rang détenu via la capacité
  // divine (logée dans sa voie d'accueil mais native de cette voie) compte comme
  // satisfait — « skip de rang » : on poursuit la voie d'origine sans racheter ce
  // rang, qu'on ne peut de toute façon pas reprendre (p. 40, p. 122).
  const ranks = ownedRanks(character, path.id, ctx);
  const native = nativeOwnedRanks(character, path.id, ctx);
  for (let r = lowestRank(path, ctx); r < feature.rank; r++) {
    if (!ranks.includes(r) && !native.includes(r)) {
      reasons.push(`Rang ${r} de « ${path.name} » non acquis (rangs dans l'ordre).`);
    }
  }

  // Slot déjà occupé : le rang de cette voie est déjà pris (ex. la capacité divine
  // d'un prêtre spécialiste occupe le slot — p. 122 — donc la capacité native de ce
  // rang n'est plus acquérable). Sans objet pour les voies linéaires standards.
  if (!character.featureIds.includes(featureId) && ranks.includes(feature.rank)) {
    reasons.push(`Le rang ${feature.rank} de « ${path.name} » est déjà occupé.`);
  }

  // Niveau requis par le rang.
  const requiredLevel = minLevelForRank(feature.rank, family, ctx.progression);
  if (character.level < requiredLevel) {
    reasons.push(`Niveau ${requiredLevel} requis pour un rang ${feature.rank} (niveau actuel ${character.level}).`);
  }

  // Règles spécifiques aux voies de prestige (p. 42, 128).
  if (path.type === 'prestige') {
    // Niveau d'accès = niveau requis par le rang le plus bas de la voie : rang 4
    // → niveau 5 (cas général), familier fantastique rang 3 → niveau 3 (p. 132).
    const accessLevel = minLevelForRank(lowestRank(path, ctx), family, ctx.progression);
    if (character.level < accessLevel) {
      reasons.push(`Voie de prestige accessible au niveau ${accessLevel}.`);
    }
    const startedPrestige = startedPrestigePaths(character, ctx);
    if (startedPrestige.size > 0 && !startedPrestige.has(path.id)) {
      reasons.push('Une seule voie de prestige est autorisée sur toute la carrière.');
    }
  }

  // Plafond de voies (si l'on ouvre une nouvelle voie hors peuple).
  if (path.type === 'class' || path.type === 'prestige') {
    const paths = nonAncestryPaths(character, ctx);
    if (!paths.has(path.id) && paths.size >= MAX_NON_ANCESTRY_PATHS) {
      reasons.push(`Plafond de ${MAX_NON_ANCESTRY_PATHS} voies (hors voie de peuple) atteint.`);
    }
  }

  return { legal: reasons.length === 0, reasons };
}

// ---------------------------------------------------------------------------
// Conformité (fiche permissive)
// ---------------------------------------------------------------------------

/**
 * Liste les écarts aux règles du personnage courant (avertissements non
 * bloquants). N'empêche jamais la sauvegarde — c'est l'UI qui les affiche.
 *
 * `firearmsAllowed` = autorisation EFFECTIVE des armes à feu (règle campagne ∧
 * choix perso, PER-185) ; défaut = snapshot du personnage (sans campagne).
 */
export function checkCompliance(
  character: Character,
  ctx: RulesContext,
  firearmsAllowed: boolean = character.firearmsAllowed,
): Warning[] {
  const warnings: Warning[] = [];
  const family = characterFamily(character, ctx);

  // Caractéristiques hors de la plage du livre (informatif).
  (Object.keys(character.abilities) as AbilityId[]).forEach((id) => {
    const v = character.abilities[id];
    if (v < ABILITY_MIN || v > ABILITY_MAX) {
      warnings.push({
        code: 'ABILITY_OUT_OF_RANGE',
        message: `${id} = ${v} hors de la plage du livre (${ABILITY_MIN} à ${ABILITY_MAX}).`,
      });
    }
  });

  // Regroupe les capacités possédées par voie. La capacité divine d'un prêtre
  // spécialiste est logée dans sa voie d'ACCUEIL (p. 122) : on la compte là, pas
  // dans sa voie d'origine — sinon faux « rang manquant » (trou au rang d'accueil
  // côté accueil, rang inférieur absent côté origine).
  const slot = priestDivineSlot(character);
  const ranksByPath = new Map<string, number[]>();
  const pushRank = (pathId: string, rank: number) => {
    const list = ranksByPath.get(pathId) ?? [];
    list.push(rank);
    ranksByPath.set(pathId, list);
  };
  for (const id of character.featureIds) {
    const feature = ctx.featureById.get(id);
    if (!feature) {
      warnings.push({ code: 'UNKNOWN_FEATURE', message: `Capacité inconnue : ${id}.`, featureId: id });
      continue;
    }
    pushRank(effectivePathId(slot, id, feature.pathId), feature.rank);
  }
  // Skip de rang : si la voie d'ORIGINE de la divine est par ailleurs développée
  // (capacités natives), le rang détenu via la divine comble le trou de ce rang.
  if (slot) {
    const originPathId = ctx.featureById.get(slot.featureId)?.pathId;
    if (originPathId && ranksByPath.has(originPathId)) pushRank(originPathId, slot.rank);
  }

  // Par voie : rangs manquants (trous) + niveau requis dépassé.
  for (const [pathId, ranks] of ranksByPath) {
    const path = ctx.pathById.get(pathId);
    if (!path) continue;
    const min = path.type === 'prestige' ? 4 : 1;
    const max = Math.max(...ranks);
    for (let r = min; r < max; r++) {
      if (!ranks.includes(r)) {
        warnings.push({
          code: 'MISSING_RANK',
          message: `« ${path.name} » : rang ${r} manquant alors que le rang ${max} est acquis (pas de voie à trous).`,
          pathId,
        });
      }
    }
    for (const r of ranks) {
      const requiredLevel = minLevelForRank(r, family, ctx.progression);
      if (character.level < requiredLevel) {
        warnings.push({
          code: 'RANK_LEVEL_TOO_LOW',
          message: `« ${path.name} » rang ${r} : niveau ${requiredLevel} requis (niveau actuel ${character.level}).`,
          pathId,
        });
      }
    }
  }

  // Profil hybride : capacités issues de plusieurs familles (p. 176-180).
  // Informatif — rappelle au joueur les règles spécifiques (PV, armes/armures,
  // voie de l'expert) qui ne sont pas toutes automatisées.
  const families = classFamiliesWithFeatures(character, ctx);
  if (families.size >= 2) {
    const names = [...families].map((f) => ctx.familyById.get(f)?.name ?? f).join(', ');
    warnings.push({
      code: 'HYBRID_PROFILE',
      severity: 'info',
      message: `Profil hybride : capacités de ${families.size} familles de profils (${names}). Pensez aux règles spécifiques (PV des niveaux mixtes, armes/armures, voie de l'expert — p. 176-180).`,
    });
  }

  // Plafond de voies.
  const nonAncestry = nonAncestryPaths(character, ctx);
  if (nonAncestry.size > MAX_NON_ANCESTRY_PATHS) {
    warnings.push({
      code: 'TOO_MANY_PATHS',
      message: `${nonAncestry.size} voies entamées (hors voie de peuple) ; le maximum est ${MAX_NON_ANCESTRY_PATHS}.`,
    });
  }

  // Voies de prestige : unicité et niveau d'accès.
  const prestige = startedPrestigePaths(character, ctx);
  if (prestige.size > 1) {
    warnings.push({
      code: 'MULTIPLE_PRESTIGE',
      message: `${prestige.size} voies de prestige entamées ; une seule est autorisée.`,
    });
  }
  for (const pathId of prestige) {
    const path = ctx.pathById.get(pathId);
    if (!path) continue;
    // Niveau d'accès propre à la voie (rang le plus bas) — cohérent avec
    // `canAcquireFeature` : familier fantastique accessible au niveau 3.
    const accessLevel = minLevelForRank(lowestRank(path, ctx), family, ctx.progression);
    if (character.level < accessLevel) {
      warnings.push({
        code: 'PRESTIGE_LEVEL_TOO_LOW',
        message: `« ${path.name} » : voie de prestige entamée avant le niveau ${accessLevel}.`,
        pathId,
      });
    }
  }

  // Budget de points de capacité (PER-53) : on ne signale que la **sur-dépense**.
  // Les points non dépensés sont parfaitement légaux (point orphelin → chance /
  // PV / dé de récupération, p. 40), donc pas d'avertissement de sous-dépense.
  // On reste muet si le gratuit n'est pas identifiable (pas d'entrée niveau 1).
  const budget = featurePointBudget(character, ctx);
  if (budget.known && budget.spent > budget.available) {
    warnings.push({
      code: 'FEATURE_POINTS_OVERSPENT',
      message: `Points de capacité dépassés : ${budget.spent} dépensé${budget.spent > 1 ? 's' : ''} pour ${budget.available} disponible${budget.available > 1 ? 's' : ''} (2 points par niveau au-delà du niveau 1, hors capacités gratuites de la création).`,
    });
  }

  // Variante « Arbalétrier » (p. 62) : voie désactivée par le réglage des armes à feu mais déjà
  // entamée. Cas typique : un arquebusier construit avec la voie des explosifs, puis basculé « armes
  // à feu interdites » — ses capacités d'explosifs deviennent hors cadre. La fiche étant permissive,
  // on ne retire rien : simple avertissement invitant à basculer vers la voie de remplacement.
  const firearmsDisabledPaths = new Set<string>();
  for (const id of character.featureIds) {
    const feature = ctx.featureById.get(id);
    if (!feature) continue;
    const path = ctx.pathById.get(feature.pathId);
    if (!path || path.type !== 'class') continue;
    const owningClass = ctx.classById.get(path.classIds[0]);
    if (owningClass && firearmsInactivePathIds(owningClass, firearmsAllowed).includes(path.id)) {
      firearmsDisabledPaths.add(path.id);
    }
  }
  for (const pathId of firearmsDisabledPaths) {
    const path = ctx.pathById.get(pathId)!;
    warnings.push({
      code: 'FIREARMS_DISABLED_PATH',
      message: `« ${path.name} » n'est pas disponible dans ce cadre de jeu (${firearmsAllowed === false ? 'armes à feu interdites' : 'armes à feu autorisées'}, variante « Arbalétrier », p. 62). Envisagez de basculer vers la voie de remplacement.`,
      pathId,
    });
  }

  // Arme à poudre équipée alors que les armes à feu sont interdites (PER-185,
  // détection légère — cf. `FIREARM_ITEM_IDS`). Objet dual devenu arbalète : on
  // signale la ligne à vérifier sans rien retirer (fiche permissive).
  if (firearmsAllowed === false) {
    const hasFirearmItem = character.equipment.some(
      (line) => !isCustomItem(line) && FIREARM_ITEM_IDS.has(line.itemId),
    );
    if (hasFirearmItem) {
      warnings.push({
        code: 'FIREARMS_DISABLED_ITEM',
        message:
          'Une arme à poudre équipée n\'est pas disponible dans ce cadre de jeu (armes à feu interdites, p. 62) : elle compte désormais comme l\'arbalète correspondante. Vérifiez la ligne d\'équipement.',
        severity: 'warning',
      });
    }
  }

  return warnings;
}
