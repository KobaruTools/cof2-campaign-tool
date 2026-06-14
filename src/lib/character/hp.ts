/**
 * Points de vigueur des profils hybrides — gains de PV « famille » par niveau.
 *
 * Pour un profil mono-famille, chaque montée de niveau apporte `hpPerLevel` de
 * la famille (avant CON). Pour un profil hybride (p. 177), si les capacités d'un
 * niveau proviennent de deux familles, le gain est la **moyenne** des PV des
 * deux familles, et les demi-PV sont arrondis **en alternance** (inférieur la
 * première fois, supérieur la suivante, et ainsi de suite). Une capacité de
 * voie de peuple compte pour la famille du profil principal ; on applique le
 * même défaut (sûr) aux capacités de voie du mage et de prestige, que le livre
 * ne traite pas explicitement pour les PV.
 *
 * La composition de chaque niveau est lue dans `levelUpHistory` (renseigné par
 * la création et le wizard de montée de niveau). Les niveaux absents de
 * l'historique retombent sur la famille du profil principal — d'où une
 * compatibilité parfaite avec les personnages mono-famille existants (le résultat
 * est identique à la formule fermée de `maxHp`).
 */
import type { FamilyId, Family } from '@/data/schema';
import type { HpLevelGain, RulesContext } from '@/lib/engine';
import { classPathFamily } from '@/lib/engine';
import type { Character } from './types';

/** Capacités acquises au niveau 1 (entrée d'historique de création). */
function level1FeatureIds(character: Character): string[] {
  return character.levelUpHistory.find((e) => e.level === 1)?.chosenFeatureIds ?? [];
}

/** Famille du profil principal du personnage (via son profil de création). */
function mainFamilyOf(character: Character, ctx: RulesContext): Family | undefined {
  const characterClass = ctx.classById.get(character.classId);
  return characterClass ? ctx.familyById.get(characterClass.familyId) : undefined;
}

/** Familles de profil concernées par les capacités acquises à un niveau donné. */
function levelFamilies(
  featureIds: string[],
  mainFamilyId: FamilyId,
  ctx: RulesContext,
): Set<FamilyId> {
  const families = new Set<FamilyId>();
  for (const id of featureIds) {
    const feature = ctx.featureById.get(id);
    if (!feature) continue;
    const path = ctx.pathById.get(feature.pathId);
    if (!path) continue;
    // Voie de peuple / mage / prestige → famille du profil principal (p. 177).
    families.add(path.type === 'class' ? classPathFamily(path, ctx) ?? mainFamilyId : mainFamilyId);
  }
  return families;
}

/**
 * Composition du gain de PV de chaque niveau (du 2 au niveau courant), dans
 * l'ordre — l'arrondi alterné des demi-PV en dépend. Pour chaque niveau : les
 * familles concernées et le gain « famille » (hors CON). Source de vérité du
 * calcul ; `familyHpGains` n'en extrait que les nombres. Vide au niveau 1.
 */
export function hpLevelGains(character: Character, ctx: RulesContext): HpLevelGain[] {
  const mainFamily = mainFamilyOf(character, ctx);
  if (!mainFamily) return [];

  // Capacités choisies par niveau (plusieurs entrées d'historique possibles).
  const idsByLevel = new Map<number, string[]>();
  for (const entry of character.levelUpHistory) {
    const list = idsByLevel.get(entry.level) ?? [];
    list.push(...entry.chosenFeatureIds);
    idsByLevel.set(entry.level, list);
  }

  const result: HpLevelGain[] = [];
  // Nombre de demi-PV déjà arrondis : pair → inférieur, impair → supérieur.
  let halfRoundings = 0;
  for (let level = 2; level <= character.level; level++) {
    const families = levelFamilies(idsByLevel.get(level) ?? [], mainFamily.id, ctx);
    if (families.size <= 1) {
      const only = families.size === 1 ? ctx.familyById.get([...families][0]) : undefined;
      const family = only ?? mainFamily;
      result.push({ level, familyIds: [family.id], familyGain: family.hpPerLevel });
      continue;
    }
    // Niveau mixte : moyenne des PV des familles concernées (au plus deux, vu le
    // budget de 2 points de capacité par niveau).
    const familyIds = [...families];
    const values = familyIds.map((f) => ctx.familyById.get(f)?.hpPerLevel ?? mainFamily.hpPerLevel);
    const average = values.reduce((sum, v) => sum + v, 0) / values.length;
    let familyGain: number;
    if (Number.isInteger(average)) {
      familyGain = average;
    } else {
      familyGain = halfRoundings % 2 === 0 ? Math.floor(average) : Math.ceil(average);
      halfRoundings++;
    }
    result.push({ level, familyIds, familyGain });
  }
  return result;
}

/**
 * Composante « famille » du gain de PV (hors CON) pour chaque niveau du 2 au
 * niveau courant, dans l'ordre. Vue numérique de `hpLevelGains`, consommée par
 * le moteur (`maxHp`). Renvoie un tableau de longueur `level - 1` (vide au niveau 1).
 */
export function familyHpGains(character: Character, ctx: RulesContext): number[] {
  return hpLevelGains(character, ctx).map((g) => g.familyGain);
}

/**
 * Composante « famille » des PV de base (niveau 1), pour `maxHp`.
 *
 * Profil standard : `2 × baseHp` de la famille du profil principal (formule du
 * livre, p. 30). Profil hybride construit à la création (p. 180) : le
 * personnage « ajoute les PV de chacun des deux profils dont sont issues ses
 * capacités », soit la somme des `baseHp` des familles des **deux voies de
 * profil** choisies au niveau 1 (exemple du livre : barbare 5 + druide 4 = 9).
 *
 * La détection se fait sur les voies de profil (`type === 'class'`) acquises au
 * niveau 1 : voie de peuple et voie du mage ne comptent pas pour cette base.
 * Tant qu'on ne distingue pas deux voies de profil au niveau 1 (personnages
 * mono-profil, historique absent ou partiel), on retombe sur `2 × baseHp` —
 * d'où une compatibilité parfaite avec les personnages standards existants (le
 * cas standard a bien deux voies de la même famille, dont la somme vaut déjà
 * `2 × baseHp`).
 */
/** Famille de chaque voie de profil distincte acquise au niveau 1, dans l'ordre. */
function level1ClassPathFamilies(character: Character, ctx: RulesContext): FamilyId[] {
  const familyByPath = new Map<string, FamilyId>();
  for (const id of level1FeatureIds(character)) {
    const feature = ctx.featureById.get(id);
    if (!feature) continue;
    const path = ctx.pathById.get(feature.pathId);
    if (!path || path.type !== 'class') continue;
    const family = classPathFamily(path, ctx);
    if (family) familyByPath.set(path.id, family);
  }
  return [...familyByPath.values()];
}

export function level1FamilyHp(character: Character, ctx: RulesContext): number {
  const mainFamily = mainFamilyOf(character, ctx);
  if (!mainFamily) return 0;

  const families = level1ClassPathFamilies(character, ctx);
  // Moins de deux voies de profil identifiées → profil standard (2 × baseHp).
  if (families.length < 2) return 2 * mainFamily.baseHp;

  return families.reduce(
    (total, family) => total + (ctx.familyById.get(family)?.baseHp ?? mainFamily.baseHp),
    0,
  );
}

/**
 * Familles des voies de profil du niveau 1, **uniquement en cas d'hybridation**
 * (au moins deux familles distinctes), pour détailler le calcul des PV de base
 * dans l'infobulle. Profil standard (familles identiques ou non identifiées) →
 * tableau vide : le détail retombe sur la ligne « 2 × PV de base » habituelle.
 */
export function level1HybridFamilies(character: Character, ctx: RulesContext): FamilyId[] {
  const families = level1ClassPathFamilies(character, ctx);
  return new Set(families).size >= 2 ? families : [];
}
