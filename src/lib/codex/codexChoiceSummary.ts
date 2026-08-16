/**
 * Résumé EXHAUSTIF d'un choix de capacité (PER-418), pour le Codex — consultation HORS
 * personnage. La résolution normale d'un choix (`src/lib/character/choices.ts`) prend un
 * `Character` en premier argument : rangs atteints, capacités déjà possédées, ascendance ou
 * familier retenus… Sans personnage, on ne peut pas TOUT résoudre — ce module distingue ce qui
 * est réellement STATIQUE (énumérable d'office) de ce qui dépend du personnage (signalé par une
 * note honnête, jamais par une fausse liste).
 *
 * `kind: 'feature-from-path'` réimplémente la partie statique de `featuresInChoiceDomain`
 * (`choices.ts`) — `allowedRanks`/`classIds`/`pathIds`/`familyScope` LITTÉRAL/
 * `includePrestigePaths`/`spellsOnly`/`excludeDefBonus`/`featureIds` — sans dupliquer les
 * fonctions qui prennent un `Character` (`featureOffersBorrow`, `featureGrantsDefBonus` sont
 * réutilisées telles quelles, déjà pures). Les 3 axes réellement relatifs au personnage
 * (`familyScope: 'same-family'`, `familiarSpellProfile`, `restrictByDemiElfeAncestry`) ne sont
 * PAS approximés : ils renvoient une note de repli.
 */
import { classes, featureById, paths, testDomains } from '@/data';
import type {
  AbilityFeatureChoice,
  Feature,
  FeatureChoice,
  OptionFeatureChoice,
  Path,
  PathFeatureChoice,
  TestDomainFeatureChoice,
} from '@/data/schema';
import { ABILITY_IDS } from '@/data/schema';
import { ABILITY_NAMES } from '@/lib/ui/ability';
import { featureGrantsDefBonus, featureOffersBorrow } from '@/lib/character/choices';

/** Capacité empruntable listée pour un choix `feature-from-path`, avec sa voie source (lien Codex). */
export interface CodexBorrowableFeature {
  feature: Feature;
  path: Path;
}

const pathById = new Map<string, Path>(paths.map((p) => [p.id, p]));
/** Position de chaque profil dans `classes` (PER-419 retours) — déjà groupé par famille dans
 * l'ordre du livre (aventurier, combattant, mage, mystique — cf. `src/data/index.ts`). */
const classOrderIndex = new Map<string, number>(classes.map((c, i) => [c.id, i]));

export interface CodexChoiceSummary {
  kind: FeatureChoice['kind'];
  prompt: string;
  note?: string;
  /** Libellés énumérés (options, caractéristiques admissibles, domaines de test…). */
  items?: string[];
  /** Capacités empruntables (uniquement `feature-from-path`), une par voie source. */
  borrowable?: CodexBorrowableFeature[];
  /** Explique pourquoi le domaine n'est PAS (ou pas entièrement) énuméré ici. */
  unresolvedNote?: string;
}

function abilityChoiceItems(choice: AbilityFeatureChoice): string[] {
  const ids = choice.allowed ?? ABILITY_IDS;
  return ids.map((id) => ABILITY_NAMES[id]);
}

function optionChoiceItems(choice: OptionFeatureChoice): string[] {
  return choice.options.map((o) => o.label);
}

function testDomainItems(includeCombat: boolean | undefined): string[] {
  return testDomains.filter((d) => includeCombat || !d.combat).map((d) => d.label);
}

/**
 * Rang « livre » d'une voie de profil (PER-419 retours) : position de son premier profil dans
 * `classes`, déjà groupé par famille dans l'ordre du livre (aventurier, combattant, mage,
 * mystique — cf. `src/data/index.ts`). Voies de prestige/peuple/mage (sans profil) en repli à la
 * fin, départagées par id.
 */
function pathBookOrder(pathId: string): number {
  const path = pathById.get(pathId);
  if (path?.type === 'class') {
    for (const classId of path.classIds) {
      const index = classOrderIndex.get(classId);
      if (index !== undefined) return index;
    }
  }
  return Number.MAX_SAFE_INTEGER;
}

function byBookOrder(a: Feature, b: Feature): number {
  return pathBookOrder(a.pathId) - pathBookOrder(b.pathId) || a.pathId.localeCompare(b.pathId) || a.rank - b.rank;
}

/**
 * Partie STATIQUE de `featuresInChoiceDomain` (`choices.ts:415`) — même filtre, sans les axes
 * qui exigent un `Character` (ceux-là sont traités en amont, dans `summarizeCodexChoice`).
 */
function staticFeaturesForChoiceDomain(hostFeatureId: string, choice: PathFeatureChoice): Feature[] {
  const allowedRanks = new Set(choice.allowedRanks);

  if (choice.featureIds) {
    return choice.featureIds
      .map((id) => featureById.get(id))
      .filter((f): f is Feature => !!f && f.id !== hostFeatureId)
      .sort(byBookOrder);
  }

  const classPathIds = new Set<string>();
  for (const path of paths) {
    if (path.type !== 'class') continue;
    if (choice.pathIds && !choice.pathIds.includes(path.id)) continue;
    if (choice.classIds && !path.classIds.some((c) => choice.classIds!.includes(c))) continue;
    if (choice.familyScope && choice.familyScope !== 'same-family') {
      const familyClasses = new Set(
        classes.filter((c) => c.familyId === choice.familyScope).map((c) => c.id),
      );
      if (!path.classIds.some((c) => familyClasses.has(c))) continue;
    }
    classPathIds.add(path.id);
  }

  const hostPathId = featureById.get(hostFeatureId)?.pathId;
  if (choice.includePrestigePaths) {
    for (const path of paths) {
      if (path.type === 'prestige' && path.id !== hostPathId) classPathIds.add(path.id);
    }
  }

  return [...featureById.values()]
    .filter(
      (f) =>
        f.id !== hostFeatureId &&
        f.pathId !== hostPathId &&
        allowedRanks.has(f.rank) &&
        classPathIds.has(f.pathId) &&
        !(choice.spellsOnly && !f.isSpell) &&
        !(choice.excludeDefBonus && featureGrantsDefBonus(f.id)),
    )
    .sort(byBookOrder);
}

function pathFeatureChoiceSummary(
  hostFeatureId: string,
  choice: PathFeatureChoice,
): Pick<CodexChoiceSummary, 'borrowable' | 'unresolvedNote'> {
  // Axes réellement relatifs au personnage : pas d'approximation, une note honnête.
  if (choice.familyScope === 'same-family') {
    return { unresolvedNote: 'Domaine dépendant du profil du personnage — non résolvable hors fiche.' };
  }
  if (choice.familiarSpellProfile) {
    return {
      unresolvedNote: 'Domaine dépendant du familier fantastique retenu — non résolvable hors fiche.',
    };
  }
  if (choice.restrictByDemiElfeAncestry) {
    return {
      unresolvedNote: "Domaine dépendant de l'ascendance elfe retenue — non résolvable hors fiche.",
    };
  }
  // Règle des poupées russes (p. 41) : une capacité empruntable ne peut pas elle-même emprunter.
  const domain = staticFeaturesForChoiceDomain(hostFeatureId, choice).filter(
    (f) => !featureOffersBorrow(f.id),
  );
  const borrowable = domain
    .map((feature) => {
      const path = pathById.get(feature.pathId);
      return path ? { feature, path } : null;
    })
    .filter((entry): entry is CodexBorrowableFeature => entry !== null);
  return { borrowable };
}

/** Résume un choix de capacité pour l'affichage exhaustif du Codex (aucun `Character`). */
export function summarizeCodexChoice(hostFeatureId: string, choice: FeatureChoice): CodexChoiceSummary {
  const base = { kind: choice.kind, prompt: choice.prompt, note: choice.note };
  switch (choice.kind) {
    case 'ability':
      return { ...base, items: abilityChoiceItems(choice) };
    case 'option':
      return { ...base, items: optionChoiceItems(choice) };
    case 'test-domain':
      return { ...base, items: testDomainItems((choice as TestDomainFeatureChoice).includeCombat) };
    case 'custom-skill':
      return {
        ...base,
        items: testDomainItems(false),
        unresolvedNote: `Nom libre (« ${choice.namePrompt} ») à convenir avec le MJ ; ${choice.domainCount} domaine(s) à choisir parmi ceux listés.`,
      };
    case 'feature-from-path':
      return { ...base, ...pathFeatureChoiceSummary(hostFeatureId, choice) };
    case 'known-feature':
      return {
        ...base,
        unresolvedNote: 'Domaine dépendant des capacités déjà possédées par le personnage — non résolvable hors fiche.',
      };
    case 'owned-weapon':
      return {
        ...base,
        unresolvedNote: "Domaine dépendant de l'inventaire du personnage — non résolvable hors fiche.",
      };
    case 'free-text':
      return { ...base, unresolvedNote: 'Réponse libre, sans effet mécanique — à convenir avec le MJ.' };
    default: {
      const exhaustive: never = choice;
      return exhaustive;
    }
  }
}
