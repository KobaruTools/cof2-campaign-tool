/**
 * Agrégation des effets structurés des capacités vers le sac de modificateurs
 * plats du moteur (`DerivedMods`) — couche de câblage data → moteur (PER-63,
 * étendue PER-67).
 *
 * Le moteur (`deriveStats`) reste pur : il ne connaît pas les capacités et se
 * contente de sommer un `mods` qu'on lui fournit. Ce module construit ce `mods`
 * à partir des `effects` des capacités acquises. C'est l'unique point
 * d'alimentation, consommé par la fiche et le récap du wizard.
 *
 * Trois sortes d'effets sont gérées :
 *  - bonus plat constant (`stat-bonus` à valeur numérique) — toujours appliqué ;
 *  - bonus SCALANT (`stat-bonus`/`conditional-stat-bonus` à `ScalingValue`) —
 *    résolu depuis le personnage (niveau, caractéristique, rang dans la voie) ;
 *  - bonus CONDITIONNEL / TEMPORAIRE (`conditional-stat-bonus`) — compté seulement
 *    si l'interrupteur manuel du personnage l'active (`Character.effectToggles`).
 *
 * Les deux derniers exigent un contexte (`EffectContext`). Sans contexte, seul le
 * cas plat constant est sommé (suffit aux appels « catalogue seul »).
 */
import { featureById, pathById } from '@/data';
import type {
  AbilityId,
  ConditionalStatBonusEffect,
  DerivedStatId,
  EffectValue,
  FeatureEffect,
} from '@/data/schema';
import { ABILITY_IDS } from '@/data/schema';
import type { DerivedMods } from '@/lib/engine';
import { effectiveFeatureIdsForMods } from './choices';
import type { Character, FeatureChoiceSelection } from './types';

/**
 * Contexte de résolution des effets : tout ce qui ne se déduit pas du seul
 * catalogue. `pathRanks` (rang max atteint par voie) est calculé en interne à
 * partir de la liste de capacités fournie ; on ne porte ici que le strictement
 * non dérivable.
 */
export interface EffectContext {
  /** Niveau du personnage — pour les valeurs scalantes `by: 'level'`. */
  level: number;
  /** Caractéristiques — pour les valeurs scalantes `scale: 'ability'`. */
  abilities: Record<AbilityId, number>;
  /**
   * Interrupteurs manuels (cf. `Character.effectToggles`) : `toggles[id][i]`
   * aligné sur `feature.effects[i]`. Absent → état par défaut de l'effet.
   */
  toggles: Record<string, boolean[]>;
  /**
   * Options retenues (cf. `Character.featureChoices`) : `featureChoices[id][i]`
   * aligné sur `feature.choices[i]`. Sert aux effets PILOTÉS PAR UN CHOIX, comme
   * l'échange de caractéristique pour les PV (`hpAbilitySwapSources`). Optionnel :
   * absent → aucun choix pris en compte (appels « catalogue seul »).
   */
  featureChoices?: Record<string, FeatureChoiceSelection[]>;
}

/**
 * Caractéristiques EFFECTIVES = valeur saisie (base + peuple) + modificateurs
 * PERMANENTS apportés par les capacités (`ability-bonus`, ex. Endurer/metal-r5 :
 * +1 CON). C'est la valeur réelle de la caractéristique du personnage (celle que
 * la fiche affiche comme « total »), donc celle qui doit alimenter les statistiques
 * dérivées (PV, dés de récupération, DEF, attaques…) et les effets scalants.
 *
 * Les capacités sont prises sur le même périmètre que les modificateurs dérivés
 * (`effectiveFeatureIdsForMods` : acquises + empruntées par choix), pour rester
 * cohérent avec l'inventaire affiché par `abilityModSources`.
 */
export function effectiveAbilities(character: Character): Record<AbilityId, number> {
  const mods = abilityModsFromFeatures(effectiveFeatureIdsForMods(character), character.featureChoices);
  const out: Record<AbilityId, number> = { ...character.abilities };
  for (const [ability, value] of Object.entries(mods) as [AbilityId, number][]) {
    out[ability] = (out[ability] ?? 0) + value;
  }
  return out;
}

/**
 * Construit le contexte d'effets d'un personnage. Les caractéristiques exposées
 * sont EFFECTIVES (cf. `effectiveAbilities`) : les valeurs scalantes (« PV += FOR »)
 * et l'échange de carac des PV (`hpAbilitySwapSources`) s'appuient sur la vraie
 * caractéristique, modificateurs permanents de capacités inclus.
 */
export function effectContext(character: Character): EffectContext {
  return {
    level: character.level,
    abilities: effectiveAbilities(character),
    toggles: character.effectToggles,
    featureChoices: character.featureChoices,
  };
}

/**
 * Rang le plus élevé atteint dans chaque voie (pathId → rang), d'après les
 * capacités fournies — pour les valeurs scalantes `by: 'path-rank'` (« passe à
 * +2 au rang 5 de la voie »). Les ids inconnus sont ignorés.
 */
export function pathRanksFromFeatures(featureIds: string[]): Record<string, number> {
  const ranks: Record<string, number> = {};
  for (const id of featureIds) {
    const feature = featureById.get(id);
    if (!feature) continue;
    ranks[feature.pathId] = Math.max(ranks[feature.pathId] ?? 0, feature.rank);
  }
  return ranks;
}

/**
 * Résout une `EffectValue` en nombre. Une valeur scalante a besoin du contexte
 * (et du rang atteint dans la voie hôte) ; sans contexte, seule une constante est
 * résoluble → `null` pour signaler « non résoluble ici ».
 */
function resolveValue(
  value: EffectValue,
  pathId: string,
  pathRanks: Record<string, number>,
  ctx?: EffectContext,
): number | null {
  if (typeof value === 'number') return value;
  if (!ctx) return null;
  switch (value.scale) {
    case 'ability':
      return ctx.abilities[value.ability] * (value.factor ?? 1);
    case 'level':
      return ctx.level * (value.factor ?? 1);
    case 'stepped': {
      // Palier de plus haut seuil atteint (0 sous le premier).
      const ref = value.by === 'level' ? ctx.level : (pathRanks[pathId] ?? 0);
      let resolved = 0;
      for (const step of value.steps) {
        if (ref >= step.min) resolved = step.value;
      }
      return resolved;
    }
    case 'milestone-count': {
      // Paliers de FAMILLE (cross-voie) : `per` par voie de profil (des `classIds`,
      // + la voie du mage si `includeMagePath`) ayant atteint `rank`.
      let count = 0;
      for (const [pid, maxRank] of Object.entries(pathRanks)) {
        if (maxRank < value.rank) continue;
        const path = pathById.get(pid);
        if (!path) continue;
        if (path.type === 'class' && path.classIds.some((c) => value.classIds.includes(c))) count++;
        else if (path.type === 'mage' && value.includeMagePath) count++;
      }
      return count * value.per;
    }
    case 'sum': {
      // Somme des composantes (base plate + palier in-voie + paliers de famille).
      let total = 0;
      for (const part of value.parts) {
        const v = resolveValue(part, pathId, pathRanks, ctx);
        if (v === null) return null;
        total += v;
      }
      return total;
    }
  }
}

/**
 * Un effet conditionnel est-il actif ? L'interrupteur manuel du personnage prime ;
 * à défaut, on retombe sur l'état par défaut déclaré (`activeByDefault`).
 */
function isConditionalActive(
  effect: ConditionalStatBonusEffect,
  featureId: string,
  index: number,
  ctx?: EffectContext,
): boolean {
  const toggled = ctx?.toggles[featureId]?.[index];
  return toggled ?? effect.activation.activeByDefault ?? false;
}

/**
 * Contributions d'un effet au `mods` : une par (stat, valeur) résoluble. Vide si
 * l'effet ne compte pas (conditionnel inactif) ; un bonus non résoluble (sans
 * contexte) est simplement omis. Un effet conditionnel porte PLUSIEURS bonus
 * pilotés par un seul interrupteur (ex. Familier : +2 Init. et +2 DEF).
 */
function effectContributions(
  effect: FeatureEffect,
  featureId: string,
  pathId: string,
  index: number,
  pathRanks: Record<string, number>,
  ctx?: EffectContext,
): Array<{ stat: DerivedStatId; value: number }> {
  if (effect.kind === 'conditional-stat-bonus') {
    if (!isConditionalActive(effect, featureId, index, ctx)) return [];
    const out: Array<{ stat: DerivedStatId; value: number }> = [];
    for (const b of effect.bonuses) {
      const v = resolveValue(b.value, pathId, pathRanks, ctx);
      if (v !== null) out.push({ stat: b.stat, value: v });
    }
    return out;
  }
  // Les genres ciblant une CARACTÉRISTIQUE (`ability-bonus`, `ability-bonus-die`) ne
  // contribuent pas au sac de stats DÉRIVÉES — ils sont agrégés à part (cf. plus bas).
  if (effect.kind !== 'stat-bonus') return [];
  const value = resolveValue(effect.value, pathId, pathRanks, ctx);
  return value === null ? [] : [{ stat: effect.stat, value }];
}

/**
 * Somme les bonus des capacités acquises en un `DerivedMods`. Les ids inconnus et
 * les capacités sans `effects` sont ignorés. N'interprète jamais le `text`.
 *
 * Sans `ctx` : seuls les bonus PLATS CONSTANTS comptent (les valeurs scalantes et
 * les effets conditionnels sont ignorés — ils exigent le contexte du personnage).
 * Avec `ctx` : les valeurs scalantes sont résolues et les effets conditionnels
 * actifs (interrupteur ou défaut) sont inclus.
 */
export function modsFromFeatures(featureIds: string[], ctx?: EffectContext): DerivedMods {
  const mods: DerivedMods = {};
  const pathRanks = pathRanksFromFeatures(featureIds);
  for (const id of featureIds) {
    const feature = featureById.get(id);
    if (!feature?.effects) continue;
    feature.effects.forEach((effect, i) => {
      for (const c of effectContributions(effect, id, feature.pathId, i, pathRanks, ctx)) {
        mods[c.stat] = (mods[c.stat] ?? 0) + c.value;
      }
    });
  }
  // Échange de caractéristique pour les PV piloté par un choix (ex. Grosse tête) :
  // s'agrège au modificateur `maxHp` au même titre qu'un bonus de capacité.
  for (const s of hpAbilitySwapSources(featureIds, ctx)) {
    mods.maxHp = (mods.maxHp ?? 0) + s.value;
  }
  return mods;
}

/**
 * Échange de caractéristique pour les PV octroyé par une OPTION retenue (champ
 * `hpFromAbility`). La règle (ex. Grosse tête, golem-r1, p. 100) remplace la
 * contribution de CON d'UN niveau par celle d'une autre caractéristique. Comme la
 * CON s'applique uniformément et rétroactivement à chaque niveau (cf. `maxHp`),
 * l'effet net est CONSTANT quel que soit le niveau de la prise : `+(carac − CON)`,
 * appliqué une seule fois — d'où l'absence d'historique du niveau de prise.
 *
 * Lit les options retenues (`ctx.featureChoices`, aligné par position sur
 * `Feature.choices`). Sans `ctx` (catalogue seul) ou sans choix : aucune source
 * (la valeur dépend des caractéristiques courantes et du choix du joueur). Un
 * échange net nul (carac = CON) est omis pour ne pas afficher de terme « +0 ».
 */
export function hpAbilitySwapSources(
  featureIds: string[],
  ctx?: EffectContext,
): FeatureModSource[] {
  if (!ctx?.featureChoices) return [];
  const out: FeatureModSource[] = [];
  for (const id of featureIds) {
    const feature = featureById.get(id);
    if (!feature?.choices) continue;
    const selections = ctx.featureChoices[id] ?? [];
    feature.choices.forEach((choice, i) => {
      if (choice.kind !== 'option') return;
      const sel = selections[i];
      const chosenIds = Array.isArray(sel) ? sel : sel ? [sel] : [];
      for (const opt of choice.options) {
        if (!opt.hpFromAbility || !chosenIds.includes(opt.id)) continue;
        const delta = ctx.abilities[opt.hpFromAbility] - ctx.abilities.CON;
        if (delta !== 0) out.push({ featureId: id, name: feature.name, value: delta });
      }
    });
  }
  return out;
}

/** Contribution d'une capacité précise à un modificateur de stat dérivée. */
export interface FeatureModSource {
  featureId: string;
  /** Nom de la capacité (français), pour le détail affiché au joueur. */
  name: string;
  value: number;
  /** Effet conditionnel / temporaire (vs bonus permanent) ? Pour le détail UI. */
  conditional?: boolean;
}

/**
 * Détaille, par stat dérivée, QUELLES capacités apportent le modificateur (et
 * combien). Même balayage que `modsFromFeatures` (et mêmes règles de contexte) —
 * sert à afficher l'inventaire sous la ligne « Capacités / divers » du détail.
 */
export function featureModSources(
  featureIds: string[],
  ctx?: EffectContext,
): Partial<Record<DerivedStatId, FeatureModSource[]>> {
  const sources: Partial<Record<DerivedStatId, FeatureModSource[]>> = {};
  const pathRanks = pathRanksFromFeatures(featureIds);
  for (const id of featureIds) {
    const feature = featureById.get(id);
    if (!feature?.effects) continue;
    feature.effects.forEach((effect, i) => {
      for (const c of effectContributions(effect, id, feature.pathId, i, pathRanks, ctx)) {
        (sources[c.stat] ??= []).push({
          featureId: id,
          name: feature.name,
          value: c.value,
          conditional: effect.kind === 'conditional-stat-bonus',
        });
      }
    });
  }
  // Même source que `modsFromFeatures` pour l'échange de carac des PV : détaillé
  // sous « Capacités / divers » des PV (le total de la ligne vient de `mods.maxHp`).
  for (const s of hpAbilitySwapSources(featureIds, ctx)) {
    (sources.maxHp ??= []).push(s);
  }
  return sources;
}

// ---------------------------------------------------------------------------
// Interrupteurs des effets conditionnels (PER-67) — lecture / écriture
// ---------------------------------------------------------------------------

/** Un effet conditionnel d'une capacité, avec sa position dans `Feature.effects`. */
export interface ConditionalEffectEntry {
  index: number;
  effect: ConditionalStatBonusEffect;
}

/**
 * Effets conditionnels / temporaires portés par une capacité (vide si aucune /
 * id inconnu), avec leur index d'origine dans `Feature.effects` — clé
 * d'alignement avec `Character.effectToggles`.
 */
export function conditionalEffectsOf(featureId: string): ConditionalEffectEntry[] {
  const effects = featureById.get(featureId)?.effects ?? [];
  const entries: ConditionalEffectEntry[] = [];
  effects.forEach((effect, index) => {
    if (effect.kind === 'conditional-stat-bonus') entries.push({ index, effect });
  });
  return entries;
}

/** Un bonus d'effet conditionnel, résolu à sa valeur courante pour l'affichage. */
export interface ResolvedConditionalBonus {
  stat: DerivedStatId;
  value: number;
}

/**
 * Bonus COURANTS (résolus) d'un effet conditionnel d'une capacité pour ce
 * personnage — pour l'affichage de l'interrupteur (ex. « −2 DEF », « +2 Init., +2
 * DEF »). Résout les valeurs scalantes (caractéristique, niveau, rang, paliers de
 * famille). `null` si l'index ne pointe pas un effet conditionnel connu.
 */
export function conditionalEffectBonuses(
  character: Character,
  featureId: string,
  index: number,
): ResolvedConditionalBonus[] | null {
  const feature = featureById.get(featureId);
  const effect = feature?.effects?.[index];
  if (!feature || !effect || effect.kind !== 'conditional-stat-bonus') return null;
  const pathRanks = pathRanksFromFeatures(character.featureIds);
  const ctx = effectContext(character);
  return effect.bonuses.map((b) => ({
    stat: b.stat,
    value: resolveValue(b.value, feature.pathId, pathRanks, ctx) ?? 0,
  }));
}

/** L'interrupteur du i-ème effet d'une capacité est-il actif pour ce personnage ? */
export function isEffectActive(character: Character, featureId: string, index: number): boolean {
  const effects = featureById.get(featureId)?.effects;
  const effect = effects?.[index];
  if (!effect || effect.kind !== 'conditional-stat-bonus') return false;
  const toggled = character.effectToggles[featureId]?.[index];
  return toggled ?? effect.activation.activeByDefault ?? false;
}

/**
 * Fixe l'interrupteur du i-ème effet d'une capacité à `active` DANS un dictionnaire
 * d'interrupteurs (le tableau est complété par des `false` jusqu'à l'index visé).
 * Fonction pure : renvoie une nouvelle copie, n'en mute aucune. Brique partagée par
 * `setEffectToggle` (depuis un personnage) et la cascade d'exclusion.
 */
function setToggleIn(
  toggles: Record<string, boolean[]>,
  featureId: string,
  index: number,
  active: boolean,
): Record<string, boolean[]> {
  const next = { ...toggles };
  const current = next[featureId] ? next[featureId].slice() : [];
  while (current.length <= index) current.push(false);
  current[index] = active;
  next[featureId] = current;
  return next;
}

/**
 * Renvoie une copie de `effectToggles` avec l'interrupteur du i-ème effet d'une
 * capacité fixé à `active`. Le tableau est complété par des `false` si besoin
 * pour atteindre l'index visé. Fonction pure (ne mute pas le personnage).
 *
 * Applique l'EXCLUSION MUTUELLE : ACTIVER un interrupteur qui déclare
 * `disablesFeatures` éteint au passage TOUS les interrupteurs des capacités qu'il
 * désactive (sécurité redondante — l'UI empêche déjà de les rallumer ; la situation
 * « les deux actifs » ne devrait jamais survenir).
 */
export function setEffectToggle(
  character: Character,
  featureId: string,
  index: number,
  active: boolean,
): Record<string, boolean[]> {
  let next = setToggleIn(character.effectToggles, featureId, index, active);
  if (!active) return next;
  const effect = featureById.get(featureId)?.effects?.[index];
  if (effect?.kind !== 'conditional-stat-bonus' || !effect.disablesFeatures) return next;
  for (const targetId of effect.disablesFeatures) {
    const targetEffects = featureById.get(targetId)?.effects ?? [];
    targetEffects.forEach((te, ti) => {
      if (te.kind === 'conditional-stat-bonus') next = setToggleIn(next, targetId, ti, false);
    });
  }
  return next;
}

/**
 * Capacités actuellement DÉSACTIVÉES par l'exclusion mutuelle : ids des capacités
 * qu'un interrupteur ACTIF d'une capacité ACQUISE déclare dans `disablesFeatures`
 * (« ne se cumule pas avec X », « incompatible avec X »). L'UI grise ces capacités
 * et rend leur interrupteur non-interactif (le détail reste consultable). Une cible
 * peut être désactivée par plusieurs sources → union.
 */
export function disabledFeatureIds(character: Character): Set<string> {
  const disabled = new Set<string>();
  for (const id of character.featureIds) {
    const effects = featureById.get(id)?.effects;
    if (!effects) continue;
    effects.forEach((effect, index) => {
      if (effect.kind !== 'conditional-stat-bonus' || !effect.disablesFeatures) return;
      if (!isEffectActive(character, id, index)) return;
      for (const targetId of effect.disablesFeatures) disabled.add(targetId);
    });
  }
  return disabled;
}

/**
 * Élague les interrupteurs orphelins : retire les entrées dont la capacité n'est
 * plus acquise. À appeler quand on retire une capacité. Fonction pure.
 */
export function pruneEffectToggles(
  effectToggles: Record<string, boolean[]>,
  featureIds: string[],
): Record<string, boolean[]> {
  const owned = new Set(featureIds);
  const next: Record<string, boolean[]> = {};
  for (const [id, toggles] of Object.entries(effectToggles)) {
    if (owned.has(id)) next[id] = toggles;
  }
  return next;
}

/**
 * Élague les saisies libres (`effectInputs`, PER-70) dont la capacité n'est plus
 * acquise — mêmes raisons que `pruneEffectToggles` (pas de note fantôme).
 */
export function pruneEffectInputs(
  effectInputs: Record<string, string>,
  featureIds: string[],
): Record<string, string> {
  const owned = new Set(featureIds);
  const next: Record<string, string> = {};
  for (const [id, value] of Object.entries(effectInputs)) {
    if (owned.has(id)) next[id] = value;
  }
  return next;
}

/**
 * Élague les compteurs d'usages (`usageCounters`, PER-70) dont la capacité n'est
 * plus acquise — mêmes raisons que `pruneEffectToggles` (pas de décompte fantôme).
 */
export function pruneUsageCounters(
  usageCounters: Record<string, number>,
  featureIds: string[],
): Record<string, number> {
  const owned = new Set(featureIds);
  const next: Record<string, number> = {};
  for (const [id, value] of Object.entries(usageCounters)) {
    if (owned.has(id)) next[id] = value;
  }
  return next;
}

// ---------------------------------------------------------------------------
// Caractéristiques : modificateurs permanents et dés bonus (genres `ability-*`)
// ---------------------------------------------------------------------------

/** Une capacité qui apporte un modificateur permanent à une caractéristique. */
export interface AbilityModSource {
  featureId: string;
  /** Nom de la capacité (français), pour le détail affiché au joueur. */
  name: string;
  value: number;
}

/**
 * Modificateurs PERMANENTS de caractéristiques apportés par les capacités acquises.
 * Gère deux genres :
 *  - `ability-bonus` : cible fixe (ex. « +1 CON » d'Endurer) ;
 *  - `ability-bonus-from-choice` : cible lue depuis `featureChoices[id][choiceIndex]`
 *    (ex. Projection mentale : « +1 à la carac la plus faible »).
 * Ids inconnus ignorés.
 */
export function abilityModsFromFeatures(
  featureIds: string[],
  featureChoices?: Record<string, FeatureChoiceSelection[]>,
): Partial<Record<AbilityId, number>> {
  const mods: Partial<Record<AbilityId, number>> = {};
  for (const id of featureIds) {
    const feature = featureById.get(id);
    if (!feature?.effects) continue;
    for (const e of feature.effects) {
      if (e.kind === 'ability-bonus') {
        mods[e.ability] = (mods[e.ability] ?? 0) + e.value;
      } else if (e.kind === 'ability-bonus-from-choice' && featureChoices) {
        const chosen = featureChoices[id]?.[e.choiceIndex];
        if (typeof chosen === 'string' && (ABILITY_IDS as readonly string[]).includes(chosen)) {
          mods[chosen as AbilityId] = (mods[chosen as AbilityId] ?? 0) + e.value;
        }
      }
    }
  }
  return mods;
}

/** Détaille, par caractéristique, QUELLES capacités apportent le modificateur. */
export function abilityModSources(
  featureIds: string[],
  featureChoices?: Record<string, FeatureChoiceSelection[]>,
): Partial<Record<AbilityId, AbilityModSource[]>> {
  const sources: Partial<Record<AbilityId, AbilityModSource[]>> = {};
  for (const id of featureIds) {
    const feature = featureById.get(id);
    if (!feature?.effects) continue;
    for (const e of feature.effects) {
      if (e.kind === 'ability-bonus') {
        (sources[e.ability] ??= []).push({ featureId: id, name: feature.name, value: e.value });
      } else if (e.kind === 'ability-bonus-from-choice' && featureChoices) {
        const chosen = featureChoices[id]?.[e.choiceIndex];
        if (typeof chosen === 'string' && (ABILITY_IDS as readonly string[]).includes(chosen)) {
          (sources[chosen as AbilityId] ??= []).push({ featureId: id, name: feature.name, value: e.value });
        }
      }
    }
  }
  return sources;
}

/**
 * Caractéristiques bénéficiant d'un DÉ BONUS permanent (genre `ability-bonus-die`),
 * chacune avec le(s) nom(s) de capacité(s) source(s) — pour l'info-bulle de l'icône
 * double-d20. Le dé bonus ne s'empile pas : une carac présente ici en bénéficie (peu
 * importe le nombre de sources), mais on garde la liste pour l'attribuer à l'affichage.
 */
export function abilityBonusDiceFromFeatures(
  featureIds: string[],
): Partial<Record<AbilityId, string[]>> {
  const dice: Partial<Record<AbilityId, string[]>> = {};
  for (const id of featureIds) {
    const feature = featureById.get(id);
    if (!feature?.effects) continue;
    for (const e of feature.effects) {
      if (e.kind === 'ability-bonus-die') (dice[e.ability] ??= []).push(feature.name);
    }
  }
  return dice;
}

/**
 * Dés bonus octroyés à la CRÉATURE d'une voie par les options retenues du personnage
 * (option `creatureAbilityBonusDie`, ex. Golem supérieur « Forme de félin » → AGI du
 * golem). Lit `character.featureChoices` aligné par POSITION sur `Feature.choices`,
 * pour les capacités de la voie `pathId`.
 */
export function creatureBonusDiceForPath(pathId: string, character: Character): Set<AbilityId> {
  const out = new Set<AbilityId>();
  for (const id of character.featureIds) {
    const feature = featureById.get(id);
    if (!feature || feature.pathId !== pathId || !feature.choices) continue;
    const selections = character.featureChoices[id] ?? [];
    feature.choices.forEach((choice, i) => {
      if (choice.kind !== 'option') return;
      const sel = selections[i];
      const chosenIds = Array.isArray(sel) ? sel : sel ? [sel] : [];
      for (const opt of choice.options) {
        if (opt.creatureAbilityBonusDie && chosenIds.includes(opt.id)) {
          out.add(opt.creatureAbilityBonusDie);
        }
      }
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Bonus de compétence aux domaines de test (PER-89)
// ---------------------------------------------------------------------------

/**
 * Catégorie de cumul d'un bonus de compétence (p. 203), déduite de la voie hôte :
 * profil (`class`), peuple (`ancestry` + voie du `mage`), prestige. Deux bonus de MÊME
 * catégorie ne se cumulent pas (on garde le plus fort) ; entre catégories ils
 * s'additionnent, le total étant plafonné à +15.
 */
export type CompetenceCategory = 'class' | 'ancestry' | 'prestige';

/** Plafond absolu du bonus de compétence sur un test (p. 203). */
export const COMPETENCE_BONUS_CAP = 15;

/** Libellé français d'une catégorie de source, pour le détail affiché. */
export const COMPETENCE_CATEGORY_LABEL: Record<CompetenceCategory, string> = {
  class: 'Voie de profil',
  ancestry: 'Voie de peuple',
  prestige: 'Voie de prestige',
};

/** Catégorie de cumul de la voie hôte d'une capacité (null si voie inconnue). */
function competenceCategoryOf(pathId: string): CompetenceCategory | null {
  const path = pathById.get(pathId);
  if (!path) return null;
  switch (path.type) {
    case 'class':
      return 'class';
    case 'prestige':
      return 'prestige';
    case 'ancestry':
    case 'mage':
      return 'ancestry';
  }
}

/**
 * Valeur par défaut d'un bonus de compétence selon la catégorie (p. 203), quand l'effet
 * n'en porte pas : peuple = +3 fixe ; profil / prestige évolutif = `2 + rang atteint dans
 * la voie`, plafonné au rang 5 (→ +7).
 */
function defaultCompetenceValue(category: CompetenceCategory, pathRank: number): number {
  return category === 'ancestry' ? 3 : 2 + Math.min(pathRank, 5);
}

/** Contribution retenue d'une capacité à un domaine (le max de sa catégorie). */
export interface TestDomainSource {
  featureId: string;
  /** Nom de la capacité (français), pour le détail affiché. */
  name: string;
  /** Catégorie de source (profil / peuple / prestige). */
  category: CompetenceCategory;
  value: number;
}

/** Bonus de compétence total d'un domaine pour un personnage, après cumul. */
export interface TestDomainBonus {
  /** Id du domaine (cf. `src/data/test-domains.ts`). */
  domain: string;
  /** Total après cumul (max par catégorie, sommés) et plafond +15. */
  total: number;
  /** Le total brut dépassait-il le plafond +15 ? */
  capped: boolean;
  /** Contribution retenue par catégorie (le max de chacune), pour le détail. */
  sources: TestDomainSource[];
}

/** Une contribution BRUTE (avant cumul) à un domaine. */
interface RawTestContribution extends TestDomainSource {
  domain: string;
}

/**
 * Récolte toutes les contributions BRUTES aux domaines de test : effets `test-bonus`
 * statiques ET domaines pilotés par une option retenue (`testBonusDomains`, ex.
 * `humain-r1`). La valeur suit l'effet (si présente, résolue dans le contexte) ou, à
 * défaut, la catégorie de la voie hôte. Sans `ctx`, les domaines pilotés par option et
 * les valeurs scalantes ne sont pas résolus.
 */
function rawTestContributions(featureIds: string[], ctx?: EffectContext): RawTestContribution[] {
  const pathRanks = pathRanksFromFeatures(featureIds);
  const out: RawTestContribution[] = [];
  for (const id of featureIds) {
    const feature = featureById.get(id);
    if (!feature) continue;
    const category = competenceCategoryOf(feature.pathId);
    if (!category) continue;
    const pathRank = pathRanks[feature.pathId] ?? feature.rank;
    const fallback = defaultCompetenceValue(category, pathRank);

    // (a) effets `test-bonus` statiques (barbare, chevalier, mages…).
    for (const effect of feature.effects ?? []) {
      if (effect.kind !== 'test-bonus') continue;
      const value =
        effect.value === undefined
          ? fallback
          : resolveValue(effect.value, feature.pathId, pathRanks, ctx);
      if (value === null) continue; // valeur scalante non résoluble sans contexte
      for (const domain of effect.domains)
        out.push({ domain, featureId: id, name: feature.name, category, value });
    }

    // (b) domaines octroyés par une OPTION retenue (ex. humain-r1 : origine → 2 domaines).
    const selections = ctx?.featureChoices?.[id] ?? [];
    (feature.choices ?? []).forEach((choice, i) => {
      if (choice.kind !== 'option') return;
      const sel = selections[i];
      const chosenIds = Array.isArray(sel) ? sel : sel ? [sel] : [];
      for (const opt of choice.options) {
        if (!opt.testBonusDomains || !chosenIds.includes(opt.id)) continue;
        for (const domain of opt.testBonusDomains)
          out.push({ domain, featureId: id, name: feature.name, category, value: fallback });
      }
    });
  }
  return out;
}

/**
 * Bonus de compétence PAR DOMAINE pour un personnage, AVEC détail de provenance —
 * applique la règle du livre (p. 203) : par domaine, MAX par catégorie de source, maxima
 * ADDITIONNÉS, total plafonné à +15. Un domaine sans contribution n'apparaît pas. Sur le
 * modèle de `featureModSources`. Sans `ctx`, les bonus pilotés par option et les valeurs
 * scalantes sont ignorés (suffit aux appels « catalogue seul »).
 */
export function testBonusSources(featureIds: string[], ctx?: EffectContext): TestDomainBonus[] {
  const byDomain = new Map<string, RawTestContribution[]>();
  for (const c of rawTestContributions(featureIds, ctx)) {
    const list = byDomain.get(c.domain);
    if (list) list.push(c);
    else byDomain.set(c.domain, [c]);
  }
  const result: TestDomainBonus[] = [];
  for (const [domain, contribs] of byDomain) {
    // Max par catégorie : deux bonus de même type ne se cumulent pas (p. 203).
    const winnerByCat = new Map<CompetenceCategory, TestDomainSource>();
    for (const c of contribs) {
      const cur = winnerByCat.get(c.category);
      if (!cur || c.value > cur.value)
        winnerByCat.set(c.category, {
          featureId: c.featureId,
          name: c.name,
          category: c.category,
          value: c.value,
        });
    }
    const sources = [...winnerByCat.values()];
    const rawTotal = sources.reduce((sum, s) => sum + s.value, 0);
    result.push({
      domain,
      total: Math.min(rawTotal, COMPETENCE_BONUS_CAP),
      capped: rawTotal > COMPETENCE_BONUS_CAP,
      sources,
    });
  }
  return result;
}
