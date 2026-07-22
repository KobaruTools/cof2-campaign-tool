/**
 * Compagnons du personnage (PER-233) — énumération et résolution des mini-fiches de
 * créature octroyées par les rangs de voie (monture, familier, écuyer, golem, loup,
 * invocation…). Module PUR (aucune dépendance UI) : source de vérité de « quels
 * compagnons ce personnage possède-t-il ? », consommée par la section « Compagnons »
 * de la fiche.
 *
 * Un compagnon est débloqué dès qu'un rang ACQUIS porte un `CreatureProfile` effectif
 * (directement, ou via l'option retenue — cf. `effectiveCreatureProfile`). La section
 * est ENTIÈREMENT dérivée des rangs de voie : aucun ajout/retrait manuel. Le seul état
 * persisté par compagnon est le manque de PV (`Character.companionDepletion`), suivi de
 * jeu au même titre que la barre de vie du personnage.
 */
import { featureById, progression } from '@/data';
import type { AbilityId, CreatureProfile, Feature } from '@/data/schema';
import type { Abilities } from '@/lib/engine';
import { getSelection } from './choices';
import { creatureBonusDiceForPath, disabledFeatureIds, isEffectActive } from './effects';
import { pruneDepletion } from './gauges';
import { parseRichText, resolveExpr } from '@/lib/ui/featureRichText';
import type { Character, Depletion } from './types';

/**
 * Profil de créature EFFECTIF d'une capacité (PER-140) : si la capacité porte un choix
 * `option` dont l'option retenue déclare son propre `creatureProfile` (ex. Monture
 * fantastique → la monture choisie), celui-ci PRIME ; sinon on retombe sur le
 * `creatureProfile` de la capacité. `undefined` = aucune créature à afficher (ex. choix
 * de monture pas encore fait, ou capacité sans profil).
 */
export function effectiveCreatureProfile(
  feature: Feature,
  character: Character | undefined,
): CreatureProfile | undefined {
  if (character) {
    const defs = feature.choices ?? [];
    for (let i = 0; i < defs.length; i += 1) {
      const def = defs[i];
      if (def.kind !== 'option') continue;
      const raw = getSelection(character, feature.id, i);
      const id = Array.isArray(raw) ? raw[0] : raw;
      const opt = id ? def.options.find((o) => o.id === id) : undefined;
      if (opt?.creatureProfile) return opt.creatureProfile;
    }
  }
  return feature.creatureProfile;
}

/**
 * La DÉFENSE ALTERNATIVE (`profile.defenseAlt`, ex. cavalier « en selle ») est-elle
 * active ? Résolu en amont par le maître : capacité source acquise ET interrupteur de
 * condition (index 0) actif. `false` sinon (DEF de base affichée).
 */
export function creatureDefenseAltActive(
  profile: CreatureProfile,
  character: Character | undefined,
): boolean {
  const alt = profile.defenseAlt;
  if (!alt || !character) return false;
  return character.featureIds.includes(alt.sourceFeatureId) && isEffectActive(character, alt.sourceFeatureId, 0);
}

/** Un compagnon débloqué, prêt à afficher. */
export interface CompanionEntry {
  /**
   * Clé de persistance de l'état de PV = `id` du rang de voie qui octroie le compagnon
   * (ex. `golem-r2`, `cavalier-r5`, `compagnon-animal-r4`). Un rang = un compagnon.
   */
  key: string;
  /** Rang de voie porteur du compagnon (celui retenu quand une voie en a plusieurs). */
  feature: Feature;
  /** Profil effectif (option retenue > profil de rang). */
  profile: CreatureProfile;
  /** Rang ATTEINT dans la voie hôte — résout le terme `rang` des stats de la créature. */
  pathRank: number;
  /** Caractéristiques bénéficiant d'un dé bonus (innés + octroyés par une option retenue). */
  bonusDieAbilities: Set<AbilityId>;
  /** La DEF alternative (« en selle ») est-elle active ? */
  defenseAltActive: boolean;
}

/**
 * Liste les compagnons débloqués du personnage, prêts pour la section « Compagnons ».
 *
 * Règles :
 *  - candidats = rangs ACQUIS, non désactivés (`disabledFeatureIds` couvre les
 *    remplacements `replacesFeatures` comme loup → Mâle alpha, et les exclusions par
 *    interrupteur), porteurs d'un `CreatureProfile` effectif ;
 *  - UN SEUL compagnon par VOIE : on retient le rang le plus élevé porteur d'un profil.
 *    Une voie de compagnon décrit une seule créature qui « monte en gamme » avec les
 *    rangs — ex. chevalier : Monture fantastique (cavalier-r5) supplante la Fidèle
 *    monture (cavalier-r1) ; forgesort : Golem (golem-r2), amélioré par golem-r5 qui ne
 *    porte pas de profil séparé. (Aucune voie du livre n'octroie deux créatures
 *    simultanées ; ce repli d'affichage évite d'empiler la version de base et sa
 *    version améliorée sans toucher aux données ni au rendu de « Voies & capacités ».)
 *
 * Ordre = ordre d'acquisition (premier rang porteur rencontré par voie).
 */
export function listCompanions(character: Character): CompanionEntry[] {
  const disabled = disabledFeatureIds(character);
  // Rang ATTEINT par voie (le plus haut rang acquis), pour résoudre le terme `rang`.
  const maxRankByPath = new Map<string, number>();
  for (const id of character.featureIds) {
    const f = featureById.get(id);
    if (!f) continue;
    maxRankByPath.set(f.pathId, Math.max(maxRankByPath.get(f.pathId) ?? 0, f.rank));
  }
  // Un compagnon par voie : on garde le rang porteur de profil le plus élevé, dans
  // l'ordre d'acquisition (Map = ordre de première insertion par voie).
  const byPath = new Map<string, CompanionEntry>();
  for (const id of character.featureIds) {
    if (disabled.has(id)) continue;
    const feature = featureById.get(id);
    if (!feature) continue;
    const profile = effectiveCreatureProfile(feature, character);
    if (!profile) continue;
    const prev = byPath.get(feature.pathId);
    if (prev && prev.feature.rank >= feature.rank) continue;
    byPath.set(feature.pathId, {
      key: feature.id,
      feature,
      profile,
      pathRank: maxRankByPath.get(feature.pathId) ?? feature.rank,
      bonusDieAbilities: creatureBonusDiceForPath(feature.pathId, character),
      defenseAltActive: creatureDefenseAltActive(profile, character),
    });
  }
  return [...byPath.values()];
}

/**
 * Résout les PV MAXIMUM d'une créature depuis la chaîne richText `CreatureProfile.hitPoints`
 * (ex. `[=niveau × 5]`, `[=10 + niveau × 4]`) contre les caractéristiques du maître, son
 * niveau et le rang de voie atteint — comme `CreatureStatBlock` le fait pour l'affichage.
 * Somme les segments déterministes (formule/quantité). `null` si non résoluble en nombre
 * (segment contenant un dé, ou aucune expression) → la barre retombe alors sur l'affichage
 * textuel du profil.
 */
export function resolveCreatureMaxHp(
  profile: CreatureProfile,
  abilities: Abilities,
  level: number,
  rank: number,
): number | null {
  const segments = parseRichText(profile.hitPoints);
  let total = 0;
  let found = false;
  for (const segment of segments) {
    if (segment.kind === 'quantity' || segment.kind === 'expr' || segment.kind === 'term') {
      const resolved = resolveExpr(segment.terms, abilities, level, progression, rank);
      if (resolved.total == null) return null; // dé présent → pas de max numérique
      total += resolved.total;
      found = true;
    }
  }
  return found ? Math.max(0, total) : null;
}

/**
 * Élague la dépletion de PV des compagnons : retire les entrées dont le compagnon n'est
 * plus débloqué (respec / baisse de niveau / changement de rang qui change la clé), et
 * normalise chaque manque restant (`pruneDepletion`). À appeler comme les autres `prune`
 * d'état transitoire lors des mutations structurelles (édition des capacités). Fonction pure.
 */
export function pruneCompanionDepletion(
  companionDepletion: Record<string, Depletion>,
  character: Character,
): Record<string, Depletion> {
  const liveKeys = new Set(listCompanions(character).map((c) => c.key));
  const next: Record<string, Depletion> = {};
  for (const [key, dep] of Object.entries(companionDepletion)) {
    if (!liveKeys.has(key)) continue;
    const pruned = pruneDepletion(dep);
    if (Object.keys(pruned).length > 0) next[key] = pruned;
  }
  return next;
}
