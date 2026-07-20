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
  CriticalRange,
  DamageReduction,
  DerivedStatId,
  EffectValue,
  Feature,
  FeatureEffect,
  ImmunityId,
  ResistibleDamageType,
  UsageCounter,
  UsageResetTrigger,
} from '@/data/schema';
import { ABILITY_IDS, IMMUNITY_LABELS, RESISTIBLE_DAMAGE_TYPES } from '@/data/schema';
import type { DerivedMods } from '@/lib/engine';
import { borrowedHostPathByFeatureId, effectiveFeatureIdsForMods, getOptionSelections } from './choices';
import { armorDisabledFeatureIds, isArmorWorn, shieldDisabledFeatureIds } from './armorRestrictions';
import { wornMeleeWeapon } from './equipment';
import { rulesContext } from './rulesContext';
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
  /**
   * Mapping `id de capacité EMPRUNTÉE → pathId de la VOIE A` qui l'a fait emprunter (cf.
   * `borrowedHostPathByFeatureId`). Sert à résoudre le `rang`/les paliers `by: 'path-rank'` d'une
   * capacité empruntée contre la voie A (encadré « Appel à une autre capacité ») et non contre sa
   * voie d'origine, que le personnage ne possède pas. Absent → chaque capacité utilise sa propre voie.
   */
  borrowedHostPaths?: Map<string, string>;
  /**
   * Une armure est-elle RÉELLEMENT portée par le personnage (slot `armor`) ? Sert aux
   * effets `armor-def-bonus` résolus AUTOMATIQUEMENT depuis l'équipement (Armure de vent,
   * PER-132) — sans interrupteur manuel. Absent → traité comme « aucune armure portée »
   * (les appels « catalogue seul » n'ont pas d'équipement ; `effectContext` le renseigne).
   */
  armorWorn?: boolean;
}

/**
 * Ids des capacités qui ALIMENTENT effectivement les stats dérivées et les caractéristiques :
 * capacités acquises + empruntées (`effectiveFeatureIdsForMods`) MOINS celles DÉSACTIVÉES par le
 * port d'armure (PER-83, cf. `armorDisabledFeatureIds`). C'est la SOURCE UNIQUE de capacités « qui
 * comptent » consommée par la fiche (`buildCharacterDerivedView`) et le récap du wizard : une
 * capacité gênée par l'armure portée ne contribue plus à aucun total (bonus de DEF/Init/PV,
 * modificateur de caractéristique, test, immunité…) tant que l'armure est portée ; la retirer la
 * réactive. Le RENDU « désactivée » (rang désaturé + infobulle) est déjà porté par PER-86 dans
 * `FeaturesByPath` — ici on n'assure que le RETRAIT effectif dans les calculs.
 */
export function activeFeatureIdsForMods(character: Character): string[] {
  const ids = effectiveFeatureIdsForMods(character);
  // Capacités désactivées par le port d'armure (PER-83) OU par l'absence de bouclier
  // (PER-142, Voie du bouclier) : dans les deux cas leurs bonus ne comptent plus.
  const disabled = armorDisabledFeatureIds(character, rulesContext);
  for (const id of shieldDisabledFeatureIds(character, rulesContext)) disabled.add(id);
  return disabled.size ? ids.filter((id) => !disabled.has(id)) : ids;
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
  const mods = abilityModsFromFeatures(activeFeatureIdsForMods(character), character.featureChoices);
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
    borrowedHostPaths: borrowedHostPathByFeatureId(character),
    armorWorn: isArmorWorn(character.equipment),
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
 * Maximum EFFECTIF d'un compteur d'usages : constante `max`, rang ATTEINT dans la voie hôte
 * (`maxByPathRank`, PER-119), ou `base` + nombre de capacités ACQUISES de rang `rank` dans une voie
 * de profil des `classIds` (`maxByRankCount`, PER-130 — ex. réserve de rage = 1 + une par capacité de
 * rang 4 de barbare). SOURCE UNIQUE, partagée par la fiche (FeaturesByPath) et la consommation au
 * toggle (page personnage).
 */
export function usageCounterMaximum(
  counter: UsageCounter,
  character: Character,
  feature: Feature,
): number {
  if (counter.maxByPathRank) return pathRanksFromFeatures(character.featureIds)[feature.pathId] ?? 0;
  if (counter.maxByPathRankSteps) {
    // Palier de plus haut `minRank` atteint dans la voie hôte (0 sous le premier palier). PER-159.
    const reached = pathRanksFromFeatures(character.featureIds)[feature.pathId] ?? 0;
    let resolved = 0;
    for (const step of counter.maxByPathRankSteps) if (reached >= step.minRank) resolved = step.max;
    return resolved;
  }
  if (counter.maxByLevel !== undefined) return character.level * counter.maxByLevel;
  if (counter.maxByRankCount) {
    const { classIds, rank, base, addPathRank, excludeHostPath } = counter.maxByRankCount;
    let count = 0;
    for (const id of character.featureIds) {
      const f = featureById.get(id);
      if (!f || f.rank !== rank) continue;
      // PER-73 : « dans une AUTRE voie » → on exclut la voie hôte du comptage.
      if (excludeHostPath && f.pathId === feature.pathId) continue;
      const p = pathById.get(f.pathId);
      if (p?.type === 'class' && p.classIds.some((c) => classIds.includes(c))) count++;
    }
    // PER-73 : terme « une fois par rang acquis dans la voie » → on ajoute le rang de la voie hôte.
    const pathRankTerm = addPathRank ? pathRanksFromFeatures(character.featureIds)[feature.pathId] ?? 0 : 0;
    return base + count + pathRankTerm;
  }
  return counter.max ?? 0;
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
  // Bonus de DEF conditionné à l'armure RÉELLEMENT portée (PER-132) — résolu automatiquement
  // depuis `ctx.armorWorn`, sans interrupteur manuel. Non résoluble sans contexte (catalogue seul).
  if (effect.kind === 'armor-def-bonus') {
    if (!ctx) return [];
    const branch = ctx.armorWorn ? effect.whenArmored : effect.whenUnarmored;
    const v = resolveValue(branch, pathId, pathRanks, ctx);
    return v === null ? [] : [{ stat: 'def', value: v }];
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
    // Capacité empruntée : son `rang`/ses paliers `by: 'path-rank'` se résolvent contre la VOIE A
    // (encadré « Appel à une autre capacité »), pas contre sa voie d'origine absente du personnage.
    const rankPathId = ctx?.borrowedHostPaths?.get(id) ?? feature.pathId;
    feature.effects.forEach((effect, i) => {
      for (const c of effectContributions(effect, id, rankPathId, i, pathRanks, ctx)) {
        mods[c.stat] = (mods[c.stat] ?? 0) + c.value;
      }
    });
  }
  // Échange de caractéristique pour les PV piloté par un choix (ex. Grosse tête) :
  // s'agrège au modificateur `maxHp` au même titre qu'un bonus de capacité.
  for (const s of hpAbilitySwapSources(featureIds, ctx)) {
    mods.maxHp = (mods.maxHp ?? 0) + s.value;
  }
  // Bonus de stats dérivées pilotés par une OPTION retenue (ex. Éclaireur : +1 DR / −1 PC).
  for (const { stat, source } of optionStatBonusSources(featureIds, ctx)) {
    mods[stat] = (mods[stat] ?? 0) + source.value;
  }
  return mods;
}

/**
 * Bonus de stats DÉRIVÉES octroyés par les OPTIONS retenues (champ
 * `FeatureChoiceOption.statBonuses`, PER-111). Ex. Éclaireur (traqueur-r1) : option « +1 DR au
 * lieu du +1 PC de famille » → `recoveryDiceCount +1`, `luckPoints −1`. Lit les options retenues
 * (`ctx.featureChoices`, aligné par position sur `Feature.choices`) ; gère le choix simple (id
 * unique) comme le répétable (tableau d'ids). Sans `ctx`/sans choix : rien. Résout les valeurs
 * scalantes ; une contribution nulle est omise (pas de terme « +0 » parasite).
 */
export function optionStatBonusSources(
  featureIds: string[],
  ctx?: EffectContext,
): Array<{ stat: DerivedStatId; source: FeatureModSource }> {
  if (!ctx?.featureChoices) return [];
  const out: Array<{ stat: DerivedStatId; source: FeatureModSource }> = [];
  const pathRanks = pathRanksFromFeatures(featureIds);
  for (const id of featureIds) {
    const feature = featureById.get(id);
    if (!feature?.choices) continue;
    const selections = ctx.featureChoices[id] ?? [];
    feature.choices.forEach((choice, i) => {
      if (choice.kind !== 'option') return;
      const sel = selections[i];
      const chosenIds = Array.isArray(sel) ? sel : typeof sel === 'string' ? [sel] : [];
      for (const optId of chosenIds) {
        const option = choice.options.find((o) => o.id === optId);
        if (!option?.statBonuses) continue;
        for (const b of option.statBonuses) {
          const value = resolveValue(b.value, feature.pathId, pathRanks, ctx);
          if (value !== null && value !== 0) {
            out.push({ stat: b.stat, source: { featureId: id, name: feature.name, value } });
          }
        }
      }
    });
  }
  return out;
}

/**
 * Caractéristique servant de base au calcul de la DEF (PER-131). Par défaut l'AGI (p. 31) ;
 * une OPTION retenue peut la remplacer via son champ `defAbility` (ex. Peau de pierre du
 * barbare, pagne-r2 : option « con-for-def » → CON au lieu de l'AGI, p. 80). On renvoie la
 * caractéristique de substitution du premier choix qui en déclare une, sinon l'AGI. Le plafond
 * d'armure s'applique ensuite à la caractéristique retenue (côté `defense`). Sans `ctx`/sans
 * choix (catalogue seul), on retombe sur l'AGI. Lit les options retenues (`ctx.featureChoices`,
 * aligné par position sur `Feature.choices`) ; gère le choix simple comme le répétable.
 */
export function defenseAbility(featureIds: string[], ctx?: EffectContext): AbilityId {
  if (!ctx?.featureChoices) return 'AGI';
  for (const id of featureIds) {
    const feature = featureById.get(id);
    if (!feature?.choices) continue;
    const selections = ctx.featureChoices[id] ?? [];
    for (let i = 0; i < feature.choices.length; i++) {
      const choice = feature.choices[i];
      if (choice.kind !== 'option') continue;
      const sel = selections[i];
      const chosenIds = Array.isArray(sel) ? sel : typeof sel === 'string' ? [sel] : [];
      for (const optId of chosenIds) {
        const option = choice.options.find((o) => o.id === optId);
        if (option?.defAbility) return option.defAbility;
      }
    }
  }
  return 'AGI';
}

/**
 * Caractéristique servant de BASE au calcul des PM. Par défaut la VOL ; une capacité
 * `mana-ability-override` (ex. Charisme héroïque : « CHA au lieu de la VOL ») permet
 * d'utiliser une autre caractéristique si elle est STRICTEMENT plus avantageuse (choix
 * systématique du joueur). On renvoie la carac retenue et, si elle remplace la VOL, le
 * nom de la capacité source (pour le détail des PM). La réserve se calcule alors sur
 * cette carac (et non par un bonus ajouté à la VOL) — d'où un détail « Charisme (CHA) »
 * au lieu de « Volonté + bonus ».
 */
export function manaCastingAbility(
  featureIds: string[],
  abilities: Record<AbilityId, number>,
): { ability: AbilityId; source?: string } {
  let best: AbilityId = 'VOL';
  let source: string | undefined;
  for (const id of featureIds) {
    const feature = featureById.get(id);
    if (!feature?.effects) continue;
    for (const e of feature.effects) {
      if (e.kind !== 'mana-ability-override') continue;
      if (abilities[e.ability] > abilities[best]) {
        best = e.ability;
        source = feature.name;
      }
    }
  }
  return best === 'VOL' ? { ability: 'VOL' } : { ability: best, source };
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
  // Bonus de stats dérivées pilotés par une option retenue (ex. Éclaireur : +1 DR / −1 PC).
  for (const { stat, source } of optionStatBonusSources(featureIds, ctx)) {
    (sources[stat] ??= []).push(source);
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

/**
 * Domaines de test bénéficiant d'un DÉ BONUS CONDITIONNEL actuellement ACTIF (champ
 * `ConditionalStatBonusEffect.testDieDomains`, PER-108). Ex. Travail d'équipe (rôdeur,
 * compagnon-animal-r2) : tant que l'interrupteur « le loup au contact » est actif, les tests
 * pour pister et de vigilance gagnent un dé bonus. Renvoie une map domaine → nom(s) de
 * capacité(s) source(s), pour le badge double-d20 de l'encadré « Compétences & tests ».
 */
export function activeConditionalTestDice(character: Character): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (const id of character.featureIds) {
    const feature = featureById.get(id);
    if (!feature?.effects) continue;
    feature.effects.forEach((effect, i) => {
      if (effect.kind !== 'conditional-stat-bonus' || !effect.testDieDomains?.length) return;
      if (!isEffectActive(character, id, i)) return;
      for (const d of effect.testDieDomains) {
        const arr = out.get(d) ?? [];
        arr.push(feature.name);
        out.set(d, arr);
      }
    });
  }
  return out;
}

/** Une capacité qui ajoute un bonus à TOUS les tests de caractéristique (conditionnel). */
export interface AbilityTestBonusSource {
  featureId: string;
  /** Nom de la capacité (français), pour le détail affiché. */
  name: string;
  value: number;
}

/**
 * Bonus COURANTS à TOUS les tests de caractéristique (PER-89), apportés par les
 * effets `conditional-stat-bonus` ACTIFS qui portent un `abilityTestBonus` (ex.
 * Bénédiction, prêtre, priere-r1). Le bonus s'applique uniformément aux 7
 * caractéristiques : il ne modifie PAS leur valeur (donc ni PV, ni DEF, ni les
 * formules), seulement le jet « d20 + carac » d'un test. Sans `ctx`, les effets
 * conditionnels et les valeurs scalantes sont ignorés (appels « catalogue seul »).
 */
export function abilityTestBonusSources(
  featureIds: string[],
  ctx?: EffectContext,
): AbilityTestBonusSource[] {
  const pathRanks = pathRanksFromFeatures(featureIds);
  const out: AbilityTestBonusSource[] = [];
  for (const id of featureIds) {
    const feature = featureById.get(id);
    if (!feature?.effects) continue;
    feature.effects.forEach((effect, i) => {
      if (effect.kind !== 'conditional-stat-bonus' || effect.abilityTestBonus === undefined) return;
      if (!isConditionalActive(effect, id, i, ctx)) return;
      const v = resolveValue(effect.abilityTestBonus, feature.pathId, pathRanks, ctx);
      if (v !== null && v !== 0) out.push({ featureId: id, name: feature.name, value: v });
    });
  }
  return out;
}

/**
 * Bonus CHIFFRÉS aux tests d'UNE caractéristique précise (PER-125), octroyés par les OPTIONS
 * retenues (`FeatureChoiceOption.abilityTestBonus`, ex. Tatouages/barbare pagne-r3 : Taureau →
 * +3 aux tests de FOR), regroupés par caractéristique cible. À DISTINGUER de
 * `abilityTestBonusSources` (buff UNIFORME à TOUTES les caracs, ex. Bénédiction) : ici le bonus
 * vise UNE carac. Lit les options retenues (`ctx.featureChoices`, aligné par position) ; gère le
 * choix simple comme le répétable. Sans `ctx`/sans choix : rien.
 */
export function abilityTestBonusByAbility(
  featureIds: string[],
  ctx?: EffectContext,
): Partial<Record<AbilityId, AbilityTestBonusSource[]>> {
  const out: Partial<Record<AbilityId, AbilityTestBonusSource[]>> = {};
  const pathRanks = pathRanksFromFeatures(featureIds);
  for (const id of featureIds) {
    const feature = featureById.get(id);
    if (!feature) continue;
    // (a) Options retenues (Tatouages, PER-125) — nécessite les choix du personnage.
    if (ctx?.featureChoices && feature.choices) {
      const selections = ctx.featureChoices[id] ?? [];
      feature.choices.forEach((choice, i) => {
        if (choice.kind !== 'option') return;
        const sel = selections[i];
        const chosenIds = Array.isArray(sel) ? sel : typeof sel === 'string' ? [sel] : [];
        for (const optId of chosenIds) {
          const option = choice.options.find((o) => o.id === optId);
          if (!option?.abilityTestBonus || option.abilityTestBonus.value === 0) continue;
          const { ability, value } = option.abilityTestBonus;
          (out[ability] ??= []).push({ featureId: id, name: feature.name, value });
        }
      });
    }
    // (b) Bonus CONDITIONNEL à UNE carac, piloté par un interrupteur actif (PER-137) — ex. Prescience
    // (divination-r5) : « +10 à tous les tests de PER » tant que la vision est active.
    feature.effects?.forEach((effect, i) => {
      if (effect.kind !== 'conditional-stat-bonus' || !effect.abilityTestBonusFor) return;
      if (!isConditionalActive(effect, id, i, ctx)) return;
      const v = resolveValue(effect.abilityTestBonusFor.value, feature.pathId, pathRanks, ctx);
      if (v !== null && v !== 0)
        (out[effect.abilityTestBonusFor.ability] ??= []).push({ featureId: id, name: feature.name, value: v });
    });
  }
  return out;
}

/**
 * Bonus aux tests de carac (résolu) d'un effet conditionnel d'une capacité, pour
 * le libellé de son interrupteur (ex. « +1 tests de carac »). `null` si l'index ne
 * pointe pas un effet conditionnel connu ou si l'effet ne touche pas les tests de
 * carac.
 */
export function conditionalAbilityTestBonus(
  character: Character,
  featureId: string,
  index: number,
): number | null {
  const feature = featureById.get(featureId);
  const effect = feature?.effects?.[index];
  if (!feature || effect?.kind !== 'conditional-stat-bonus' || effect.abilityTestBonus === undefined)
    return null;
  const pathRanks = pathRanksFromFeatures(character.featureIds);
  return resolveValue(effect.abilityTestBonus, feature.pathId, pathRanks, effectContext(character));
}

/** L'interrupteur du i-ème effet d'une capacité est-il actif pour ce personnage ? */
export function isEffectActive(character: Character, featureId: string, index: number): boolean {
  const effects = featureById.get(featureId)?.effects;
  const effect = effects?.[index];
  if (!effect || effect.kind !== 'conditional-stat-bonus') return false;
  const toggled = character.effectToggles[featureId]?.[index];
  return toggled ?? effect.activation.activeByDefault ?? false;
}

/** Au moins un des effets conditionnels de la capacité est-il actif (interrupteur ON) ? */
export function hasActiveConditionalEffect(character: Character, featureId: string): boolean {
  return conditionalEffectsOf(featureId).some(({ index }) => isEffectActive(character, featureId, index));
}

/**
 * PER-161 — éteint tous les interrupteurs d'effets TEMPORAIRES actifs (états de durée / combat :
 * Sanctuaire, Rage, Armure de pierre…), en préservant les effets CONDITIONNELS (`activation.kind:
 * 'condition'`, ex. « une arme dans chaque main ») qui décrivent une situation, pas une durée. Appelé
 * par tout repos (court/long), qui met fin aux états transitoires. Fonction pure : renvoie une copie.
 */
export function clearTemporaryEffectToggles(character: Character): Record<string, boolean[]> {
  const toggles = character.effectToggles ?? {};
  const next: Record<string, boolean[]> = { ...toggles };
  for (const featureId of character.featureIds) {
    const effects = featureById.get(featureId)?.effects;
    if (!effects) continue;
    effects.forEach((effect, index) => {
      if (effect.kind !== 'conditional-stat-bonus' || effect.activation.kind !== 'temporary') return;
      const active = toggles[featureId]?.[index] ?? effect.activation.activeByDefault ?? false;
      if (!active) return;
      const arr = [...(next[featureId] ?? [])];
      while (arr.length <= index) arr.push(false);
      arr[index] = false;
      next[featureId] = arr;
    });
  }
  return next;
}

/**
 * PER-164 — purge les saisies libres (`effectInputs`) ORPHELINES qu'un repos laisserait derrière lui.
 * Quand un repos éteint l'interrupteur d'un effet TEMPORAIRE actif (via `clearTemporaryEffectToggles`),
 * la saisie libre corrélée à la MÊME capacité (ex. l'animal de Forme animale / `animaux-r5`) doit être
 * effacée aussi — sinon on retrouve au réveil l'ancien animal alors que l'effet n'est plus actif. Ne
 * touche QUE les capacités dont un interrupteur temporaire était effectivement actif ; les saisies
 * d'effets SITUATIONNELS sans interrupteur temporaire (ex. élément résisté de Maîtrise des éléments — le
 * sélecteur tient lieu d'activation, non éteint par un repos) sont PRÉSERVÉES. Même critère « temporaire
 * & actif » que `clearTemporaryEffectToggles`, pour rester en phase. Fonction pure : renvoie une copie.
 */
export function clearTemporaryEffectInputs(character: Character): Record<string, string> {
  const inputs = character.effectInputs ?? {};
  const toggles = character.effectToggles ?? {};
  const next: Record<string, string> = { ...inputs };
  for (const featureId of character.featureIds) {
    if (next[featureId] === undefined) continue;
    const effects = featureById.get(featureId)?.effects;
    if (!effects) continue;
    const hadActiveTemporary = effects.some((effect, index) => {
      if (effect.kind !== 'conditional-stat-bonus' || effect.activation.kind !== 'temporary') return false;
      return toggles[featureId]?.[index] ?? effect.activation.activeByDefault ?? false;
    });
    if (hadActiveTemporary) delete next[featureId];
  }
  return next;
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
  const ownEffects = featureById.get(featureId)?.effects ?? [];
  if (!active) {
    // Cascade de DÉSACTIVATION intra-capacité, À SENS UNIQUE (PER-109) : éteindre cet effet éteint
    // aussi ceux qui en dépendent (`deactivatesWithEffectIndex`). Ex. Parade croisée : couper
    // « une arme dans chaque main » coupe « bonus doublé », pas l'inverse.
    ownEffects.forEach((e, ei) => {
      if (e.kind === 'conditional-stat-bonus' && e.deactivatesWithEffectIndex === index) {
        next = setToggleIn(next, featureId, ei, false);
      }
    });
    return next;
  }
  const effect = ownEffects[index];
  if (effect?.kind !== 'conditional-stat-bonus') return next;
  // ACTIVER éteint les interrupteurs des capacités exclues. Deux familles, MÊME cascade d'extinction :
  //  - `disablesFeatures` : exclusion mutuelle AVEC désactivation/grisage (cf. disabledFeatureReasons) ;
  //  - `mutuallyExclusiveWith` (PER-130) : simple basculement ON/OFF, SANS désactiver (Rage ↔ Furie).
  const turnOffTargets = [...(effect.disablesFeatures ?? []), ...(effect.mutuallyExclusiveWith ?? [])];
  for (const targetId of turnOffTargets) {
    const targetEffects = featureById.get(targetId)?.effects ?? [];
    targetEffects.forEach((te, ti) => {
      if (te.kind === 'conditional-stat-bonus') next = setToggleIn(next, targetId, ti, false);
    });
  }
  return next;
}

/**
 * Pourquoi une capacité est grisée. `excluded` : exclusion mutuelle conditionnelle —
 * un interrupteur ACTIF d'une autre capacité la désactive (« ne se cumule pas avec X »).
 * `replaced` : remplacement INCONDITIONNEL — une capacité acquise la supplante dès
 * l'acquisition (Grand félin remplace Panthère). `byFeatureId`/`byFeatureName` : la
 * capacité source (pour le message d'UI).
 */
export interface DisabledFeatureReason {
  byFeatureId: string;
  byFeatureName: string;
  kind: 'excluded' | 'replaced';
}

/**
 * Capacités actuellement grisées, avec LA RAISON (source + nature) — pour le grisage
 * et le message d'UI. Deux origines :
 *  - EXCLUSION MUTUELLE (`disablesFeatures`) : un interrupteur ACTIF d'une capacité
 *    acquise désactive la cible (« ne se cumule pas avec X »).
 *  - REMPLACEMENT (`replacesFeatures`) : une capacité acquise en supplante une autre
 *    dès l'acquisition, sans interrupteur (Grand félin/fauve-r4 → Panthère/fauve-r2).
 * Le remplacement prime sur l'exclusion pour le message (cause structurelle, pas un
 * état transitoire). Une cible peut être visée par plusieurs sources → première gagne.
 */
export function disabledFeatureReasons(character: Character): Map<string, DisabledFeatureReason> {
  const reasons = new Map<string, DisabledFeatureReason>();
  // 1) Exclusions par interrupteur actif.
  for (const id of character.featureIds) {
    const feature = featureById.get(id);
    feature?.effects?.forEach((effect, index) => {
      if (effect.kind !== 'conditional-stat-bonus' || !effect.disablesFeatures) return;
      if (!isEffectActive(character, id, index)) return;
      for (const targetId of effect.disablesFeatures) {
        if (!reasons.has(targetId)) {
          reasons.set(targetId, { byFeatureId: id, byFeatureName: feature?.name ?? id, kind: 'excluded' });
        }
      }
    });
  }
  // 2) Remplacements inconditionnels (priment sur l'exclusion) : la cible doit être acquise.
  const owned = new Set(character.featureIds);
  for (const id of character.featureIds) {
    const feature = featureById.get(id);
    if (!feature?.replacesFeatures) continue;
    for (const targetId of feature.replacesFeatures) {
      if (!owned.has(targetId)) continue;
      reasons.set(targetId, { byFeatureId: id, byFeatureName: feature.name, kind: 'replaced' });
    }
  }
  return reasons;
}

/**
 * Capacités actuellement DÉSACTIVÉES (grisées) : exclusion mutuelle par interrupteur
 * actif OU remplacement inconditionnel. L'UI grise ces capacités et rend leur
 * interrupteur non-interactif (le détail reste consultable). Cf. `disabledFeatureReasons`
 * pour la raison affichable.
 */
export function disabledFeatureIds(character: Character): Set<string> {
  return new Set(disabledFeatureReasons(character).keys());
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
 * Clé d'état du VERROU « une dépense par récupération rapide » (PER-160) d'un compteur, dérivée de
 * sa clé de compteur. Une valeur > 0 sous cette clé signifie « verrouillé jusqu'au prochain repos court ».
 */
export function shortRestLockKey(counterKey: string): string {
  return `${counterKey}::sr-lock`;
}

/**
 * PER-163 — clé d'état de l'USAGE QUOTIDIEN d'un pouvoir emprunté (Artefact étrange). Portée par la
 * capacité HÔTE (`artefacts-r5`) et le sort emprunté (`spellId`). Convention « absence = plein » : la
 * clé absente signifie « disponible aujourd'hui » ; une valeur 0 signifie « déjà utilisé ». Rechargée
 * au repos long (`resetOn: 'day'`).
 */
export function borrowedPowerUsedKey(hostId: string, spellId: string): string {
  return `${hostId}::borrowed::${spellId}::used`;
}

/**
 * PER-163 — clé d'état d'INTÉGRITÉ d'un pouvoir emprunté (Artefact étrange). Convention « absence =
 * plein » : la clé absente signifie « intact » ; une valeur 0 signifie « cassé » (panne 1-2 au d6).
 * Réparée à la récupération rapide (`'short-rest'`, donc aussi au repos long). Distincte de l'usage
 * quotidien : un pouvoir peut être cassé sans avoir consommé son usage, et inversement.
 */
export function borrowedPowerIntegrityKey(hostId: string, spellId: string): string {
  return `${hostId}::borrowed::${spellId}::integrity`;
}

/**
 * PER-206 — clé d'état d'un ÉTAT PRÉJUDICIABLE déjà infligé (Botte secrète, spadassin-r5). Portée par
 * la capacité HÔTE et l'id de l'état (`STATUS_EFFECT_IDS`). Convention « absence = disponible » : clé
 * absente ⇒ état non encore infligé ce combat ; valeur 0 ⇒ déjà infligé. Réinitialisée selon
 * `inflictableStates.resetOn` (défaut `'combat'`, donc à toute récupération rapide / repos long).
 */
export function inflictedStateKey(hostId: string, stateId: string): string {
  return `${hostId}::state::${stateId}`;
}

/**
 * PER-161 — la RÉACTIVATION de l'interrupteur du i-ème effet TEMPORAIRE d'une capacité est-elle
 * verrouillée jusqu'au prochain repos court ? Vrai quand l'effet est un `conditional-stat-bonus`
 * temporaire dont le compteur porteur a `oncePerShortRest` ET dont le verrou de repos court est posé
 * (ex. Sanctuaire / priere-r2 : lancer le sort le rend inattaquable puis interdit de le relancer avant
 * une récupération rapide). L'UI grise alors l'interrupteur POUR L'ACTIVATION uniquement — l'éteindre
 * (fin du sort) reste toujours possible. Sans effet sur les états sans verrou (ex. Rage : pas de
 * `oncePerShortRest` → interrupteur toujours (ré)activable).
 */
export function isTemporaryActivationShortRestLocked(
  character: Character,
  featureId: string,
  index: number,
): boolean {
  const feature = featureById.get(featureId);
  const effect = feature?.effects?.[index];
  if (effect?.kind !== 'conditional-stat-bonus' || effect.activation.kind !== 'temporary') return false;
  const counter = feature?.usageCounter;
  if (!counter?.oncePerShortRest) return false;
  const key = counter.sharedKey ?? featureId;
  return (character.usageCounters?.[shortRestLockKey(key)] ?? 0) > 0;
}

/**
 * PER-162 — surcoût en mana CROISSANT courant d'un sort (en PM) : `lancements × step`, où le nombre
 * de lancements depuis le dernier reset est lu dans `usageCounters` sous l'id de la capacité (absence
 * ⇒ 0). Retourne 0 si la capacité ne porte pas d'`escalatingManaCost`. À ajouter par-dessus le coût
 * de base (`spellManaCost`) pour obtenir le coût effectif affiché.
 */
export function escalatingManaSurcharge(character: Character, feature: Feature): number {
  const esc = feature.escalatingManaCost;
  if (!esc) return 0;
  const casts = Math.max(0, character.usageCounters?.[feature.id] ?? 0);
  return casts * (esc.step ?? 1);
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
  // Clés VALIDES : pour chaque capacité possédée portant un compteur, sa clé d'état —
  // `sharedKey` si réserve partagée (PER-119), sinon l'id de la capacité. On conserve aussi
  // les clés = id possédé (rétrocompat des compteurs propres sans champ `sharedKey`).
  const validKeys = new Set<string>(owned);
  for (const id of featureIds) {
    const counter = featureById.get(id)?.usageCounter;
    if (!counter) continue;
    const key = counter.sharedKey ?? id;
    validKeys.add(key);
    // Verrou « 1 dépense par repos court » (PER-160) : sa clé d'état dérivée est aussi valide.
    if (counter.oncePerShortRest) validKeys.add(shortRestLockKey(key));
  }
  // PER-163 : pouvoirs empruntés (Artefact étrange) — leurs clés d'état dérivées (usage + intégrité)
  // sont valides tant que la capacité HÔTE est possédée (indépendamment d'un `usageCounter`).
  for (const id of featureIds) {
    for (const spellId of featureById.get(id)?.borrowedPowers ?? []) {
      validKeys.add(borrowedPowerUsedKey(id, spellId));
      validKeys.add(borrowedPowerIntegrityKey(id, spellId));
    }
    // PER-206 : états préjudiciables infligeables (Botte secrète) — un marqueur par état, valide tant
    // que la capacité HÔTE est possédée.
    for (const stateId of featureById.get(id)?.inflictableStates?.stateIds ?? []) {
      validKeys.add(inflictedStateKey(id, stateId));
    }
  }
  // PER-162 : le surcoût croissant stocke ses lancements sous l'id de la capacité — déjà couvert par
  // `owned`, donc rien à ajouter ici (mentionné pour mémoire ; la clé survit à l'élagage).
  const next: Record<string, number> = {};
  for (const [key, value] of Object.entries(usageCounters)) {
    if (validKeys.has(key)) next[key] = value;
  }
  return next;
}

/** Libellé générique par défaut d'un compteur d'usages — non identifiant pour une jauge. */
const GENERIC_USAGE_LABEL = 'Usages restants';

/** Une ressource de capacité à réserve limitée, prête à afficher en jauge (PER-150). */
export interface CapacityResourceGauge {
  /** Clé dans `usageCounters` (partagée si réserve cross-voie). */
  key: string;
  /** Libellé identifiant la ressource (label du compteur, ou nom de la capacité). */
  label: string;
  /** Usages RESTANTS courants (borné à [0, max]). */
  current: number;
  /** Maximum effectif (constant ou scalant). */
  max: number;
  /**
   * Profil dont relève la voie porteuse de la ressource (rage → barbare, charges
   * explosives → arquebusier). Sert à colorer la jauge et à choisir l'icône de
   * profil. `undefined` si la voie n'est pas une voie de profil.
   */
  classId?: string;
}

/**
 * Ressources de capacité à réserve limitée du personnage (rage, sept vies du chat,
 * charges explosives…), agrégées pour affichage en jauges dans le bloc « État du
 * personnage » (PER-150).
 *
 * SOURCE UNIQUE : lit directement `usageCounters` (le même état que `FeaturesByPath`
 * et que la consommation au toggle). Les capacités partageant une `sharedKey` (réserve
 * cross-voie, ex. rage — PER-130) sont fusionnées en UNE seule jauge ; on retient le
 * `max` le plus élevé et un libellé de compteur explicite. Aucune donnée dupliquée :
 * le bloc et `FeaturesByPath` COEXISTENT sur la même source (régler ici = régler
 * partout). Ordre d'apparition = ordre des capacités acquises.
 */
export function capacityResourceGauges(character: Character): CapacityResourceGauge[] {
  const byKey = new Map<string, { label: string; max: number; classId?: string }>();
  const order: string[] = [];
  for (const id of character.featureIds) {
    const feature = featureById.get(id);
    const counter = feature?.usageCounter;
    if (!feature || !counter) continue;
    // Usages quotidiens à faible cadence (PER-73) : suivis sur la carte de capacité, pas en jauge d'état.
    // Réserve « à préparation systématique » (pool d'élixirs) : suivie dans l'en-tête de voie, pas ici.
    if (counter.hideFromStatusPanel || counter.poolInPathHeader) continue;
    // Compteur de suivi d'un effet temporaire (Absorption d'Armure de pierre) : jauge affichée
    // seulement tant que l'interrupteur de la capacité est actif (PER-150).
    if (counter.visibleWhenEffectActive && !hasActiveConditionalEffect(character, feature.id)) continue;
    const key = counter.sharedKey ?? feature.id;
    const max = usageCounterMaximum(counter, character, feature);
    // Libellé identifiant : le label du compteur sauf s'il est générique, auquel cas le nom
    // de la capacité (plus parlant qu'« Usages restants » pour une jauge).
    const label =
      !counter.label || counter.label === GENERIC_USAGE_LABEL ? feature.name : counter.label;
    // Profil porteur de la voie (pour la couleur/icône de la jauge).
    const path = pathById.get(feature.pathId);
    const classId = path?.type === 'class' ? path.classIds[0] : undefined;
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, { label, max, classId });
      order.push(key);
    } else {
      existing.max = Math.max(existing.max, max);
      if (counter.label && counter.label !== GENERIC_USAGE_LABEL) existing.label = counter.label;
      if (!existing.classId && classId) existing.classId = classId;
    }
  }
  return order.map((key) => {
    const { label, max, classId } = byKey.get(key)!;
    const current = Math.max(0, Math.min(max, character.usageCounters?.[key] ?? max));
    return { key, label, current, max, classId };
  });
}

/**
 * Réinitialise (remet à plein) les compteurs d'usages dont le `resetOn` figure dans
 * `triggers` — pour les boutons de repos (PER-151). Un compteur sans `resetOn` vaut
 * `'day'` par défaut (cas le plus courant) ; `'manual'` n'est jamais réinitialisé par
 * un repos. Remettre à plein = retirer la clé (absence ⇒ compteur au max). Ne touche
 * pas aux clés inconnues (compteurs d'une capacité non possédée : préservés).
 */
export function resetUsageCounters(
  usageCounters: Record<string, number>,
  featureIds: string[],
  triggers: Set<UsageResetTrigger>,
): Record<string, number> {
  const toReset = new Set<string>();
  for (const id of featureIds) {
    const feature = featureById.get(id);
    const counter = feature?.usageCounter;
    if (counter) {
      const key = counter.sharedKey ?? id;
      if (triggers.has(counter.resetOn ?? 'day')) toReset.add(key);
      // Verrou « 1 dépense par repos court » (PER-160) : levé par tout repos court (donc aussi long).
      if (counter.oncePerShortRest && triggers.has('short-rest')) toReset.add(shortRestLockKey(key));
    }
    // PER-162 : surcoût mana croissant — retomber à 0 = retirer la clé (id de la capacité), comme un
    // compteur classique (ici « à plein » signifie « à 0 », baseline du modèle croissant).
    if (feature?.escalatingManaCost && triggers.has(feature.escalatingManaCost.resetOn)) toReset.add(id);
    // PER-163 : pouvoirs empruntés (Artefact étrange) — l'USAGE quotidien se recharge au repos long
    // (`'day'`), l'INTÉGRITÉ (réparation) à la récupération rapide (`'short-rest'`, donc aussi au repos
    // long). « À plein » = clé retirée (disponible / intact), même convention que les compteurs.
    for (const spellId of feature?.borrowedPowers ?? []) {
      if (triggers.has('day')) toReset.add(borrowedPowerUsedKey(id, spellId));
      if (triggers.has('short-rest')) toReset.add(borrowedPowerIntegrityKey(id, spellId));
    }
    // PER-206 : marqueurs d'états infligés (Botte secrète) — réinitialisés selon `resetOn` (défaut
    // 'combat', donc à toute récupération rapide / repos long). « À plein » = clé retirée (disponible).
    const states = feature?.inflictableStates;
    if (states && triggers.has(states.resetOn ?? 'combat')) {
      for (const stateId of states.stateIds) toReset.add(inflictedStateKey(id, stateId));
    }
  }
  const next: Record<string, number> = {};
  for (const [key, value] of Object.entries(usageCounters)) {
    if (!toReset.has(key)) next[key] = value;
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

/** Capacité source d'un dé bonus permanent (pour le détail affiché au joueur). */
export interface BonusDieSource {
  featureId: string;
  /** Nom de la capacité (français). */
  name: string;
}

/**
 * Caractéristiques bénéficiant d'un DÉ BONUS permanent (genre `ability-bonus-die`),
 * chacune avec la/les capacité(s) source(s) — `featureId` + nom, pour rendre une
 * pastille de capacité dans le détail. Le dé bonus ne s'empile pas : une carac présente
 * ici en bénéficie (peu importe le nombre de sources), mais on garde la liste des sources.
 */
export function abilityBonusDiceSources(
  featureIds: string[],
  featureChoices?: Record<string, FeatureChoiceSelection[]>,
): Partial<Record<AbilityId, BonusDieSource[]>> {
  const dice: Partial<Record<AbilityId, BonusDieSource[]>> = {};
  for (const id of featureIds) {
    const feature = featureById.get(id);
    if (!feature?.effects) continue;
    for (const e of feature.effects) {
      if (e.kind === 'ability-bonus-die') {
        (dice[e.ability] ??= []).push({ featureId: id, name: feature.name });
      } else if (e.kind === 'ability-bonus-die-from-choice' && featureChoices) {
        // Dé bonus dont la carac est lue depuis le choix retenu, éventuellement restreint
        // (ex. Combattant héroïque : dé bonus seulement si AGI est choisie, pas FOR).
        const chosen = featureChoices[id]?.[e.choiceIndex];
        if (
          typeof chosen === 'string' &&
          (ABILITY_IDS as readonly string[]).includes(chosen) &&
          (!e.onlyIfAbility || e.onlyIfAbility.includes(chosen as AbilityId))
        ) {
          (dice[chosen as AbilityId] ??= []).push({ featureId: id, name: feature.name });
        }
      }
    }
  }
  return dice;
}

/**
 * Variante « noms seuls » de {@link abilityBonusDiceSources}, pour l'info-bulle de
 * l'icône double-d20 (badges) qui n'affiche que du texte.
 */
export function abilityBonusDiceFromFeatures(
  featureIds: string[],
  featureChoices?: Record<string, FeatureChoiceSelection[]>,
): Partial<Record<AbilityId, string[]>> {
  const detailed = abilityBonusDiceSources(featureIds, featureChoices);
  const dice: Partial<Record<AbilityId, string[]>> = {};
  for (const ability of Object.keys(detailed) as AbilityId[]) {
    dice[ability] = detailed[ability]!.map((s) => s.name);
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
/**
 * Contribution à un domaine qui NE compte PAS dans le total (PER-73) : battue par une autre source
 * de la même catégorie (règle du livre « max par catégorie », p. 203 — deux bonus de profil ne se
 * cumulent pas). Conservée pour l'affichage (barrée + « ne se cumule pas avec … ») afin que le
 * joueur voie qu'elle est prise en compte mais dominée. Cas typique : une capacité EMPRUNTÉE dont
 * le bonus est égalé/dépassé par une vraie capacité de voie de profil.
 */
export interface DominatedTestSource {
  /** La contribution dominée (capacité + valeur résolue). */
  source: TestDomainSource;
  /** La source RETENUE qui la domine (même catégorie, valeur ≥). */
  dominatedBy: TestDomainSource;
}

export interface TestDomainBonus {
  /** Id du domaine (cf. `src/data/test-domains.ts`). */
  domain: string;
  /** Total après cumul (max par catégorie, sommés) et plafond +15. */
  total: number;
  /** Le total brut dépassait-il le plafond +15 ? */
  capped: boolean;
  /** Contribution retenue par catégorie (le max de chacune), pour le détail. */
  sources: TestDomainSource[];
  /** Contributions DOMINÉES (non comptées car battues dans leur catégorie), pour l'affichage barré. */
  dominated?: DominatedTestSource[];
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
    // Capacité empruntée (« Appel à une autre capacité ») : le rang qui pilote la valeur du bonus
    // (formule 2 + rang) est celui de la VOIE A qui l'a fait emprunter, pas sa voie d'origine. La
    // CATÉGORIE de cumul, elle, reste celle de la voie d'origine de la capacité (profil → ne se
    // cumule donc pas avec les autres bonus de profil ; max par catégorie, p. 203).
    const rankPathId = ctx?.borrowedHostPaths?.get(id) ?? feature.pathId;
    const pathRank = pathRanks[rankPathId] ?? feature.rank;
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

    // (a bis) bonus de compétence CONDITIONNEL (PER-117) : domaines portés par un
    // conditional-stat-bonus ACTIF (ex. « en milieu naturel » : Survie, Éclaireur). Même valeur
    // déduite de la catégorie (fallback) qu'un test-bonus statique ; comptés seulement si le
    // toggle est actif (ctx requis ; sans ctx, aucun toggle → ignorés).
    (feature.effects ?? []).forEach((effect, i) => {
      if (effect.kind !== 'conditional-stat-bonus' || !effect.testBonusDomains?.length) return;
      if (!isConditionalActive(effect, id, i, ctx)) return;
      for (const domain of effect.testBonusDomains)
        out.push({ domain, featureId: id, name: feature.name, category, value: fallback });
    });

    // (b) domaines octroyés par une OPTION retenue (ex. humain-r1 : origine → 2 domaines).
    const selections = ctx?.featureChoices?.[id] ?? [];
    (feature.choices ?? []).forEach((choice, i) => {
      // (b.1) option preset : domaines portés par l'option retenue.
      if (choice.kind === 'option') {
        const sel = selections[i];
        const chosenIds = Array.isArray(sel) ? sel : sel ? [sel] : [];
        for (const opt of choice.options) {
          if (!opt.testBonusDomains || !chosenIds.includes(opt.id)) continue;
          for (const domain of opt.testBonusDomains)
            out.push({ domain, featureId: id, name: feature.name, category, value: fallback });
        }
        return;
      }
      // (b.2) gagne-pain LIBRE (`custom-skill`, PER-73, ex. humain-r1 « Libre ») : les domaines
      // saisis (persistés en `[nom, ...domaines]`) reçoivent le même bonus de catégorie que ceux
      // d'une option preset. Le nom est décoratif → ignoré ici.
      if (choice.kind === 'custom-skill') {
        // Choix conditionnel à une option sœur (« Libre ») : on n'applique les domaines que si
        // l'option gouvernante est effectivement retenue (sinon la saisie est masquée/obsolète).
        if (choice.visibleIfOption) {
          const gov = selections[choice.visibleIfOption.choiceIndex];
          const govIds = Array.isArray(gov) ? gov : gov ? [gov] : [];
          if (!govIds.includes(choice.visibleIfOption.optionId)) return;
        }
        const sel = selections[i];
        const domains = Array.isArray(sel)
          ? sel.slice(1).filter((d): d is string => typeof d === 'string' && d.length > 0)
          : [];
        for (const domain of domains)
          out.push({ domain, featureId: id, name: feature.name, category, value: fallback });
      }
    });
  }
  return out;
}

/** Bonus de compétence UNIVERSEL appliqué en plancher (Éclectique) — cf. `universalTestBonus`. */
export interface UniversalTestBonus {
  featureId: string;
  /** Nom de la capacité (français), pour le détail affiché. */
  name: string;
  /** Valeur du plancher (nombre de voies au rang seuil, plancher 1). */
  value: number;
}

/**
 * Nombre de voies de PROFIL du profil `classId` dont le rang atteint est ≥ `rank`
 * (cross-voie, voie hôte comprise). Sert aux bonus de famille (ex. Éclectique : +1 par
 * voie de barde au rang 4).
 */
function countClassVoiesAtRank(featureIds: string[], classId: string, rank: number): number {
  const pathRanks = pathRanksFromFeatures(featureIds);
  let count = 0;
  for (const [pathId, maxRank] of Object.entries(pathRanks)) {
    const path = pathById.get(pathId);
    if (path?.type === 'class' && path.classIds.includes(classId) && maxRank >= rank) count++;
  }
  return count;
}

/**
 * Bonus de compétence UNIVERSEL (effet `universal-test-bonus`, ex. Éclectique) du
 * personnage, s'il en porte un. Valeur = 1 (bonus de base) + nombre de voies du profil
 * au rang seuil (« +1 chaque fois qu'il atteint le rang 4 dans une voie de barde »).
 * `null` si aucune capacité ne l'accorde. On ne gère qu'une source à la fois (aucun cas
 * de cumul de deux bonus universels au catalogue).
 */
export function universalTestBonus(featureIds: string[]): UniversalTestBonus | null {
  for (const id of featureIds) {
    const feature = featureById.get(id);
    if (!feature?.effects) continue;
    for (const e of feature.effects) {
      if (e.kind !== 'universal-test-bonus') continue;
      const count = countClassVoiesAtRank(featureIds, e.scaleByPathsAtRank.classId, e.scaleByPathsAtRank.rank);
      return { featureId: id, name: feature.name, value: 1 + count };
    }
  }
  return null;
}

/**
 * Bonus de compétence PAR DOMAINE pour un personnage, AVEC détail de provenance —
 * applique la règle du livre (p. 203) : par domaine, MAX par catégorie de source, maxima
 * ADDITIONNÉS, total plafonné à +15. Un domaine sans contribution n'apparaît pas. Sur le
 * modèle de `featureModSources`. Sans `ctx`, les bonus pilotés par option et les valeurs
 * scalantes sont ignorés (suffit aux appels « catalogue seul »).
 *
 * Le bonus UNIVERSEL (Éclectique, PER-102) NE SE CUMULE PAS avec les bonus de profil/
 * prestige (il PRIME au MAX : si Éclectique > le bonus de voie/prestige, c'est lui qui
 * s'applique), mais il SE CUMULE avec le bonus de PEUPLE. Donc, par domaine :
 * total = peuple + max(Éclectique, profil + prestige). Les domaines SANS aucune
 * contribution ne sont pas matérialisés ici — ils relèvent de la ligne « tous les autres
 * tests : +N » (cf. `universalTestBonus`, rendue à part).
 */
export function testBonusSources(featureIds: string[], ctx?: EffectContext): TestDomainBonus[] {
  const byDomain = new Map<string, RawTestContribution[]>();
  for (const c of rawTestContributions(featureIds, ctx)) {
    const list = byDomain.get(c.domain);
    if (list) list.push(c);
    else byDomain.set(c.domain, [c]);
  }
  // Subsomption ciblée (PER-73) : « érudition occulte » est une spécialisation d'« érudition ».
  // SEUL cas traité : voie de peuple elfe haut (`erudition`, peuple) + voie du mage (`occult-lore`,
  // peuple). La règle « pas de cumul d'une source identique » (p.203) veut que deux bonus de PEUPLE
  // ne s'additionnent pas sur un même test → max, et non somme. On replie donc les contributions
  // `erudition` de catégorie PEUPLE dans le seau `occult-lore`, UNIQUEMENT si ce seau porte déjà une
  // contribution de peuple (mage-r1). Sans cette garde, on toucherait les cas profil/prestige (ex.
  // elfe haut sorcier) qui sont hors périmètre. Le seau `erudition` reste intact (l'érudition
  // GÉNÉRALE conserve son +3 : le bonus occulte ne remonte pas vers le parent).
  const occultBucket = byDomain.get('occult-lore');
  const eruditionBucket = byDomain.get('erudition');
  if (occultBucket && eruditionBucket && occultBucket.some((c) => c.category === 'ancestry')) {
    for (const c of eruditionBucket)
      if (c.category === 'ancestry') occultBucket.push({ ...c, domain: 'occult-lore' });
  }
  const floor = universalTestBonus(featureIds);
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
    const ancestryW = winnerByCat.get('ancestry');
    const classW = winnerByCat.get('class');
    const prestigeW = winnerByCat.get('prestige');
    // Peuple : se cumule toujours (exception du livre). Non-peuple : profil + prestige
    // se cumulent entre eux, mais Éclectique NE se cumule PAS — il prend le MAX face à eux.
    const otherNonAncestry = (classW?.value ?? 0) + (prestigeW?.value ?? 0);
    const sources: TestDomainSource[] = [];
    if (ancestryW) sources.push(ancestryW);
    let nonAncestry: number;
    if (floor && floor.value > otherNonAncestry) {
      // Éclectique l'emporte (strictement plus élevé) → il remplace les bonus de profil/prestige.
      sources.push({ featureId: floor.featureId, name: floor.name, category: 'class', value: floor.value });
      nonAncestry = floor.value;
    } else {
      if (classW) sources.push(classW);
      if (prestigeW) sources.push(prestigeW);
      nonAncestry = otherNonAncestry;
    }
    const rawTotal = (ancestryW?.value ?? 0) + nonAncestry;
    // Contributions DOMINÉES (PER-73) : celles qui n'ont pas été retenues (battues dans leur
    // catégorie, ou catégorie remplacée par Éclectique). Conservées pour l'affichage barré, avec la
    // source qui les domine (même catégorie si retenue, sinon la source de profil retenue — Éclectique).
    const keptByCat = new Map<CompetenceCategory, TestDomainSource>(sources.map((s) => [s.category, s]));
    const keptIds = new Set(sources.map((s) => s.featureId));
    const dominated: DominatedTestSource[] = [];
    for (const c of contribs) {
      if (keptIds.has(c.featureId)) continue;
      const dominatedBy = keptByCat.get(c.category) ?? keptByCat.get('class');
      if (!dominatedBy) continue;
      dominated.push({
        source: { featureId: c.featureId, name: c.name, category: c.category, value: c.value },
        dominatedBy,
      });
    }
    result.push({
      domain,
      total: Math.min(rawTotal, COMPETENCE_BONUS_CAP),
      capped: rawTotal > COMPETENCE_BONUS_CAP,
      sources,
      ...(dominated.length ? { dominated } : {}),
    });
  }
  return result;
}

// ---------------------------------------------------------------------------
// Immunités (PER-103)
// ---------------------------------------------------------------------------

/** Une immunité agrégée pour le personnage, avec ses capacités sources. */
export interface ImmunitySource {
  id: ImmunityId;
  /** Libellé français (cf. `IMMUNITY_LABELS`). */
  label: string;
  /** Capacités qui l'accordent (id + nom), pour le détail au survol et la voie d'origine. */
  sources: { featureId: string; name: string }[];
}

/**
 * Immunités accordées par les capacités acquises (effet `immunity`), dédupliquées par
 * id et accompagnées de leurs capacités sources. Ordre stable suivant `IMMUNITY_LABELS`.
 */
export function aggregateImmunities(featureIds: string[]): ImmunitySource[] {
  // Map immId → (featureId → nom) : dédup par capacité source (l'id, pas le nom).
  const byId = new Map<ImmunityId, Map<string, string>>();
  for (const id of featureIds) {
    const feature = featureById.get(id);
    if (!feature?.effects) continue;
    for (const e of feature.effects) {
      if (e.kind !== 'immunity') continue;
      for (const imm of e.immunities) {
        const map = byId.get(imm) ?? new Map<string, string>();
        map.set(feature.id, feature.name);
        byId.set(imm, map);
      }
    }
  }
  return (Object.keys(IMMUNITY_LABELS) as ImmunityId[])
    .filter((immId) => byId.has(immId))
    .map((immId) => ({
      id: immId,
      label: IMMUNITY_LABELS[immId],
      sources: [...byId.get(immId)!].map(([featureId, name]) => ({ featureId, name })),
    }));
}

/** Une réduction de dégâts ACTIVE octroyée par une capacité, avec sa capacité source (PER-126). */
export interface DamageReductionSource {
  featureId: string;
  /** Nom de la capacité (français). */
  name: string;
  reduction: DamageReduction;
}

/**
 * Réductions de dégâts (RD) ACTIVES du personnage (PER-126), pour l'affichage à côté de la Défense.
 * Une RD est retenue si sa capacité est PASSIVE (aucun effet conditionnel → toujours active, ex. Peau
 * d'acier), ou si la capacité porte un effet conditionnel ACTIF (ex. Armure de pierre / Déphasage, dont
 * la RD suit l'interrupteur). La RD reste « non lue par le moteur » pour les calculs ; il s'agit d'un
 * affichage informatif. La valeur scalante éventuelle est résolue par l'UI (toutes constantes à ce jour).
 */
export function damageReductionSources(character: Character): DamageReductionSource[] {
  const pathRanks = pathRanksFromFeatures(character.featureIds);
  const ctx = effectContext(character);
  const out: DamageReductionSource[] = [];
  // Capacité de Voie du bouclier sans bouclier manié (PER-142) : sa RD (retrait de DM des attaques
  // de zone, Défense au bouclier) ne compte plus tant qu'aucun bouclier n'est porté. Cet agrégateur
  // lit `character` directement (hors `activeFeatureIdsForMods`), d'où le filtrage explicite ici.
  const shieldDisabled = shieldDisabledFeatureIds(character, rulesContext);
  // Capacités acquises ET empruntées : une capacité empruntée fonctionne comme une capacité normale,
  // sa RD comprise (PER-73). Son rang se résout sur la VOIE A (cf. `borrowedHostPaths`).
  for (const id of effectiveFeatureIdsForMods(character)) {
    if (shieldDisabled.has(id)) continue;
    const feature = featureById.get(id);
    if (!feature?.damageReduction) continue;
    const rankPathId = ctx.borrowedHostPaths?.get(id) ?? feature.pathId;
    const conditionalIndexes = (feature.effects ?? [])
      .map((e, i) => (e.kind === 'conditional-stat-bonus' ? i : -1))
      .filter((i) => i >= 0);
    // Capacité passive (aucun effet conditionnel) → RD permanente. Sinon, RD affichée seulement si
    // l'un de ses interrupteurs conditionnels est actif.
    const active =
      conditionalIndexes.length === 0 || conditionalIndexes.some((i) => isEffectActive(character, id, i));
    if (!active) continue;
    // Une capacité peut porter PLUSIEURS entrées de RD (tableau, PER-137).
    const entries = Array.isArray(feature.damageReduction) ? feature.damageReduction : [feature.damageReduction];
    const rank = pathRanks[rankPathId] ?? 0;
    for (const dr of entries) {
      // Gating par RANG de voie (ex. Invulnérable : ÷2 poison/maladie ≤ r4, immunité ≥ r5).
      if (dr.minPathRank !== undefined && rank < dr.minPathRank) continue;
      if (dr.maxPathRank !== undefined && rank > dr.maxPathRank) continue;
      // SCOPE choisi à la table (ex. Maîtrise des éléments) : la RD n'est comptée que si un élément
      // valide est sélectionné (`effectInputs[id]`, hors mode édition) ; ce choix devient le scope.
      let scopes = dr.scopes;
      if (dr.scopeChoice) {
        const chosen = character.effectInputs?.[id];
        if (!chosen || !(dr.scopeChoice as string[]).includes(chosen)) continue;
        scopes = [chosen as (typeof dr.scopeChoice)[number]];
      } else if (dr.scopeFromChoice !== undefined) {
        // SCOPE dérivé d'un CHOIX PERMANENT de construction (ex. Ascendance draconique, PER-138) : la
        // portée est l'énergie retenue au choix `option` d'index `scopeFromChoice` (`featureChoices`).
        // RD comptée seulement si le choix est fait et valide.
        const chosen = getOptionSelections(character, id, dr.scopeFromChoice)[0];
        if (!chosen || !(RESISTIBLE_DAMAGE_TYPES as readonly string[]).includes(chosen)) continue;
        scopes = [chosen as ResistibleDamageType];
      }
      // Résolution de la valeur scalante (ex. Fils du roc 2 → 3 au niveau 10 ; Résistance au feu 5 → 10
      // au rang 7) pour l'affichage. Une constante est rendue telle quelle ; le plafond d'absorption
      // éventuel reste verbatim (non affiché dans la puce).
      const value =
        dr.value === undefined ? undefined : (resolveValue(dr.value, rankPathId, pathRanks, ctx) ?? dr.value);
      out.push({ featureId: id, name: feature.name, reduction: { ...dr, value, scopes } });
    }
  }
  return out;
}

/** Une réduction de dégâts AGRÉGÉE par (type, portée), avec ses capacités sources (PER-137). */
export interface StackedDamageReduction {
  kind: DamageReduction['kind'];
  /** Type de dégât couvert ; absent = tous les DM. */
  scope?: ResistibleDamageType;
  /**
   * Valeur agrégée : SOMME des réductions plates de même portée (`flat` — le livre : « cumulable avec
   * d'autres sources de réduction comme la peau d'acier ») ; diviseur (`divide`) ; absent (`immunity`).
   */
  total?: number;
  /** Capacités qui contribuent (id + nom + valeur individuelle) pour le breakdown et la voie d'origine. */
  sources: { featureId: string; name: string; value?: number }[];
}

/**
 * Réductions de dégâts ACTIVES du personnage, AGRÉGÉES pour l'affichage (PER-137) : les RD PLATES de
 * MÊME portée s'ADDITIONNENT en une seule entrée (ex. Fils du roc + Peau d'acier → RD 6), avec le
 * détail des sources. Division et immunité ne s'additionnent pas (regroupées par portée, et par valeur
 * pour la division, afin de fusionner les sources identiques sans cumuler les diviseurs). Une RD sur
 * plusieurs types est éclatée en une entrée PAR type. Source unique pour les badges de la carte Défense.
 */
export function stackedDamageReductions(character: Character): StackedDamageReduction[] {
  const entries = damageReductionSources(character).flatMap((s) => {
    const scopes = s.reduction.scopes ?? [];
    const perScope: (ResistibleDamageType | undefined)[] = scopes.length ? scopes : [undefined];
    return perScope.map((scope) => ({
      featureId: s.featureId,
      name: s.name,
      kind: s.reduction.kind,
      scope,
      value: typeof s.reduction.value === 'number' ? s.reduction.value : undefined,
    }));
  });
  const groups = new Map<string, typeof entries>();
  for (const e of entries) {
    const key = e.kind === 'flat' ? `flat|${e.scope ?? ''}` : `${e.kind}|${e.scope ?? ''}|${e.value ?? ''}`;
    const arr = groups.get(key);
    if (arr) arr.push(e);
    else groups.set(key, [e]);
  }
  const out: StackedDamageReduction[] = [];
  for (const list of groups.values()) {
    const { kind, scope } = list[0];
    if (kind === 'flat') {
      out.push({
        kind,
        scope,
        total: list.reduce((acc, e) => acc + (e.value ?? 0), 0),
        sources: list.map((e) => ({ featureId: e.featureId, name: e.name, value: e.value })),
      });
    } else if (kind === 'divide') {
      out.push({ kind, scope, total: list[0].value, sources: list.map((e) => ({ featureId: e.featureId, name: e.name })) });
    } else {
      out.push({ kind, scope, sources: list.map((e) => ({ featureId: e.featureId, name: e.name })) });
    }
  }
  return out;
}

/** Une plage de critique ACTIVE octroyée par une capacité OU une arme équipée, valeur résolue (PER-133/225). */
export interface CriticalRangeSource {
  /**
   * Capacité d'origine, si la source EST une capacité. ABSENT quand la source est l'arme
   * elle-même (plage intrinsèque de la rapière / vivelame, PER-225) : le badge retombe alors
   * sur le `name` en texte simple, faute de puce de voie.
   */
  featureId?: string;
  /** Nom de la capacité ou de l'arme (français). */
  name: string;
  /** Portée concernée (cf. `CriticalRange`). */
  scope: CriticalRange['scope'];
  /** Élargissement RÉSOLU (points retranchés à 20) : 1 → 19-20, 2 → 18-20. */
  value: number;
}

/**
 * Plages de critique élargies ACTIVES du personnage (PER-133), pour l'affichage sous les cartes
 * Attaque au contact / à distance. Même logique d'activation que `damageReductionSources` : une
 * capacité PASSIVE (aucun effet conditionnel) accorde une plage PERMANENTE (Briseur d'os, Écuyer,
 * Tir précis) ; une capacité dont l'élargissement est conditionné à l'arme porte un effet
 * conditionnel (marqueur d'état) et n'est retenue que si son interrupteur est ACTIF (Science du
 * critique, Morsure du serpent, Frappe chirurgicale — câblage automatique différé à PER-76). La
 * valeur scalante éventuelle (Tir précis : 1 puis 2 au rang 5) est résolue ici. Donnée informative,
 * non lue par le moteur (aucun jet simulé).
 */
export function criticalRangeSources(character: Character): CriticalRangeSource[] {
  const pathRanks = pathRanksFromFeatures(character.featureIds);
  const ctx = effectContext(character);
  const out: CriticalRangeSource[] = [];
  // Capacités acquises ET empruntées : une capacité empruntée fonctionne comme une capacité normale,
  // sa plage de critique comprise (PER-73). Son rang se résout sur la VOIE A (cf. `borrowedHostPaths`).
  for (const id of effectiveFeatureIdsForMods(character)) {
    const feature = featureById.get(id);
    if (!feature?.criticalRange) continue;
    const conditionalIndexes = (feature.effects ?? [])
      .map((e, i) => (e.kind === 'conditional-stat-bonus' ? i : -1))
      .filter((i) => i >= 0);
    const active =
      conditionalIndexes.length === 0 || conditionalIndexes.some((i) => isEffectActive(character, id, i));
    if (!active) continue;
    const rankPathId = ctx.borrowedHostPaths?.get(id) ?? feature.pathId;
    const value = resolveValue(feature.criticalRange.value, rankPathId, pathRanks, ctx);
    if (value === null || value <= 0) continue;
    out.push({ featureId: id, name: feature.name, scope: feature.criticalRange.scope, value });
  }
  // Plage de critique INTRINSÈQUE de l'arme de contact tenue en main (PER-225) — rapière,
  // vivelame (19-20, p. 183). Source d'affichage SUPPLÉMENTAIRE, cumulée avec les capacités
  // par `combineCriticalRanges`. N'apparaît que si l'arme concernée est réellement portée en
  // main (résolveur canonique `wornMeleeWeapon`, PER-76/77) : déséquiper l'arme retire la puce.
  // Sur une arme, `value` est un littéral fixe (pas de rang → pas de valeur scalante).
  const weapon = wornMeleeWeapon(character.equipment ?? []);
  const weaponCrit = weapon?.criticalRange;
  if (weaponCrit && typeof weaponCrit.value === 'number' && weaponCrit.value > 0) {
    out.push({ name: weapon!.name, scope: weaponCrit.scope, value: weaponCrit.value });
  }
  return out;
}
