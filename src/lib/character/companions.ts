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
import { featureById, pathById, progression } from '@/data';
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

/**
 * Un compagnon est-il PRÉSENT (donc à afficher) ? Un compagnon d'INVOCATION — un sort que
 * le joueur lance à la table (démon, arbre animé…) — se reconnaît à un effet d'activation
 * TEMPORAIRE (`conditional-stat-bonus` dont `activation.kind === 'temporary'`, ex.
 * « Démon invoqué ») : il ne doit apparaître que quand cette invocation est ACTIVE. À
 * DISTINGUER des compagnons PERMANENTS (loup, golem, monture, écuyer, familier du druide/
 * magicien) : ceux-ci existent en continu — leur éventuel interrupteur est une simple
 * CONDITION (« familier en vue », « en selle ») qui module un bonus, pas leur présence.
 *
 * Renvoie `true` si le compagnon est visible : soit ce n'est pas une invocation (aucun
 * interrupteur temporaire), soit au moins une invocation est active. `isSpell` ne suffit
 * pas à trancher (le familier du magicien est un sort mais permanent) ; c'est bien la
 * nature TEMPORAIRE de l'activation qui marque une invocation.
 */
function companionPresent(feature: Feature, character: Character): boolean {
  const effects = feature.effects ?? [];
  let isSummon = false;
  for (let i = 0; i < effects.length; i += 1) {
    const effect = effects[i];
    if (effect.kind === 'conditional-stat-bonus' && effect.activation?.kind === 'temporary') {
      isSummon = true;
      if (isEffectActive(character, feature.id, i)) return true;
    }
  }
  return !isSummon;
}

/** Séparateur de la clé composite d'une instance de compagnon (`<featureId>#<instanceId>`). */
export const COMPANION_INSTANCE_SEP = '#';

/** Clé de PV (barre de vie / `companionDepletion`) d'une instance de compagnon multi-instances. */
export function companionInstanceKey(featureId: string, instanceId: string): string {
  return `${featureId}${COMPANION_INSTANCE_SEP}${instanceId}`;
}

/**
 * Décompose une clé de compagnon : `{ featureId, instanceId }` pour une instance
 * (`outre-tombe-r3#<id>`), `{ featureId, instanceId: undefined }` pour un compagnon à instance
 * unique (`golem-r2`). Utilisé par les setters de PV (page personnage) pour router vers
 * `companionInstances` (zombies) ou `companionDepletion` (compagnons classiques).
 */
export function parseCompanionKey(key: string): { featureId: string; instanceId?: string } {
  const i = key.indexOf(COMPANION_INSTANCE_SEP);
  return i < 0 ? { featureId: key } : { featureId: key.slice(0, i), instanceId: key.slice(i + 1) };
}

/** Un compagnon débloqué, prêt à afficher. */
export interface CompanionEntry {
  /**
   * Clé de persistance de l'état de PV. Compagnon à instance unique = `id` du rang de voie qui
   * l'octroie (ex. `golem-r2`, `cavalier-r5`, `compagnon-animal-r4`). Compagnon multi-instances
   * (zombie) = clé composite `<featureId>#<instanceId>` (cf. `companionInstanceKey`).
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
  /**
   * Id d'instance, UNIQUEMENT pour un compagnon multi-instances (zombie) — absent pour les
   * compagnons classiques. Sa présence signale que ce bloc est une instance supprimable.
   */
  instanceId?: string;
  /** Position (0-based) de l'instance dans la liste, pour la numéroter (« Zombie 1, 2… »). */
  instanceIndex?: number;
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
  const byPath = new Map<string, { feature: Feature; profile: CreatureProfile }>();
  for (const id of character.featureIds) {
    if (disabled.has(id)) continue;
    const feature = featureById.get(id);
    if (!feature) continue;
    const profile = effectiveCreatureProfile(feature, character);
    if (!profile) continue;
    // Invocation à instance UNIQUE (démon, arbre animé, familier/serviteur invoqués…) : masquée
    // tant que son marqueur d'invocation n'est pas actif. Les compagnons multi-instances (zombie)
    // ont leur propre gating (présence = au moins une instance créée) — le marqueur ne s'applique
    // pas. Les compagnons permanents (loup, golem, monture, écuyer) passent toujours.
    if (!profile.instances && !companionPresent(feature, character)) continue;
    const prev = byPath.get(feature.pathId);
    if (prev && prev.feature.rank >= feature.rank) continue;
    byPath.set(feature.pathId, { feature, profile });
  }
  // Développe chaque voie retenue en entrées d'affichage : une seule pour un compagnon classique,
  // N pour un compagnon multi-instances (une par instance vivante de `companionInstances`).
  const out: CompanionEntry[] = [];
  for (const { feature, profile } of byPath.values()) {
    const pathRank = maxRankByPath.get(feature.pathId) ?? feature.rank;
    const bonusDieAbilities = creatureBonusDiceForPath(feature.pathId, character);
    const defenseAltActive = creatureDefenseAltActive(profile, character);
    if (profile.instances) {
      const ids = character.companionInstances?.[feature.id] ?? [];
      ids.forEach((instanceId, instanceIndex) => {
        out.push({
          key: companionInstanceKey(feature.id, instanceId),
          feature,
          profile,
          pathRank,
          bonusDieAbilities,
          defenseAltActive,
          instanceId,
          instanceIndex,
        });
      });
    } else {
      out.push({ key: feature.id, feature, profile, pathRank, bonusDieAbilities, defenseAltActive });
    }
  }
  return out;
}

/**
 * Limite d'instances simultanées d'un compagnon multi-instances (PER-235). Pour le zombie
 * (outre-tombe-r3, p. 109) : 1 + une par voie de sorcier au rang 5 — comptage cross-voie
 * identique à `MilestoneCountScalingValue` (la voie hôte comptée incluse, cf. « chaque fois qu'il
 * atteint le rang 5 dans une voie de sorcier »). `0` si le profil n'est pas multi-instances.
 */
export function resolveCompanionInstanceLimit(profile: CreatureProfile, character: Character): number {
  const spec = profile.instances?.limit;
  if (!spec) return 0;
  const maxRankByPath = new Map<string, number>();
  for (const id of character.featureIds) {
    const f = featureById.get(id);
    if (!f) continue;
    maxRankByPath.set(f.pathId, Math.max(maxRankByPath.get(f.pathId) ?? 0, f.rank));
  }
  let count = 0;
  for (const [pid, maxRank] of maxRankByPath) {
    if (maxRank < spec.rank) continue;
    const path = pathById.get(pid);
    if (path?.type === 'class' && path.classIds.some((c) => spec.classIds.includes(c))) count += 1;
  }
  return spec.base + count;
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
  // Créature SANS PV (Serviteur invisible, p. 96 — « ne peut pas être combattu ») : aucune barre.
  if (profile.hitPoints == null) return null;
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

/**
 * Élague les instances de compagnons multi-instances (`companionInstances`, PER-235) : retire les
 * listes dont la capacité n'est plus acquise ou n'octroie plus un profil multi-instances (respec /
 * baisse de niveau), et normalise chaque liste (ids vides / doublons retirés, ordre préservé). À
 * appeler AVANT `pruneCompanionDepletion` lors des mutations structurelles : les PV d'instance
 * (clés composites) sont ensuite purgés en cohérence, car `listCompanions` ne produit plus les
 * clés des instances disparues. Fonction pure.
 */
export function pruneCompanionInstances(
  companionInstances: Record<string, string[]>,
  character: Character,
): Record<string, string[]> {
  const owned = new Set(character.featureIds);
  const next: Record<string, string[]> = {};
  for (const [featureId, ids] of Object.entries(companionInstances)) {
    if (!owned.has(featureId)) continue;
    const feature = featureById.get(featureId);
    const profile = feature ? effectiveCreatureProfile(feature, character) : undefined;
    if (!profile?.instances) continue;
    const clean = ids.filter((id, i) => !!id && ids.indexOf(id) === i);
    if (clean.length > 0) next[featureId] = clean;
  }
  return next;
}
