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
import type { RulesContext } from '@/lib/engine';
import { classPathFamily } from '@/lib/engine';
import type { Character } from './types';

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
 * Composante « famille » du gain de PV (hors CON) pour chaque niveau du 2 au
 * niveau courant, dans l'ordre — l'arrondi alterné des demi-PV en dépend.
 * Renvoie un tableau de longueur `level - 1` (vide au niveau 1).
 */
export function familyHpGains(character: Character, ctx: RulesContext): number[] {
  const mainFamily = mainFamilyOf(character, ctx);
  if (!mainFamily) return [];

  // Capacités choisies par niveau (plusieurs entrées d'historique possibles).
  const idsByLevel = new Map<number, string[]>();
  for (const entry of character.levelUpHistory) {
    const list = idsByLevel.get(entry.level) ?? [];
    list.push(...entry.chosenFeatureIds);
    idsByLevel.set(entry.level, list);
  }

  const gains: number[] = [];
  // Nombre de demi-PV déjà arrondis : pair → inférieur, impair → supérieur.
  let halfRoundings = 0;
  for (let level = 2; level <= character.level; level++) {
    const families = levelFamilies(idsByLevel.get(level) ?? [], mainFamily.id, ctx);
    if (families.size <= 1) {
      const only = families.size === 1 ? ctx.familyById.get([...families][0]) : undefined;
      gains.push((only ?? mainFamily).hpPerLevel);
      continue;
    }
    // Niveau mixte : moyenne des PV des familles concernées (au plus deux, vu le
    // budget de 2 points de capacité par niveau).
    const values = [...families].map((f) => ctx.familyById.get(f)?.hpPerLevel ?? mainFamily.hpPerLevel);
    const average = values.reduce((sum, v) => sum + v, 0) / values.length;
    if (Number.isInteger(average)) {
      gains.push(average);
    } else {
      gains.push(halfRoundings % 2 === 0 ? Math.floor(average) : Math.ceil(average));
      halfRoundings++;
    }
  }
  return gains;
}
