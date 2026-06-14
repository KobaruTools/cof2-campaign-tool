/**
 * Agrégation des effets structurés des capacités vers le sac de modificateurs
 * plats du moteur (`DerivedMods`) — couche de câblage data → moteur (PER-63).
 *
 * Le moteur (`deriveStats`) reste pur : il ne connaît pas les capacités et se
 * contente de sommer un `mods` qu'on lui fournit. Ce module construit ce `mods`
 * à partir des `effects` (genre `stat-bonus`) des capacités acquises. C'est
 * l'unique point d'alimentation, consommé par la fiche et le récap du wizard.
 */
import { featureById } from '@/data';
import type { DerivedStatId } from '@/data/schema';
import type { DerivedMods } from '@/lib/engine';

/**
 * Somme les bonus plats inconditionnels (`StatBonusEffect`) des capacités
 * acquises en un `DerivedMods`. Les ids inconnus et les capacités sans `effects`
 * sont ignorés. N'interprète jamais le `text` : seuls les `effects` structurés
 * comptent (les effets conditionnels / temporaires / scalants n'en font pas
 * partie et ne sont donc pas agrégés ici).
 */
export function modsFromFeatures(featureIds: string[]): DerivedMods {
  const mods: DerivedMods = {};
  for (const id of featureIds) {
    const effects = featureById.get(id)?.effects;
    if (!effects) continue;
    for (const effect of effects) {
      if (effect.kind === 'stat-bonus') {
        mods[effect.stat] = (mods[effect.stat] ?? 0) + effect.value;
      }
    }
  }
  return mods;
}

/** Contribution d'une capacité précise à un modificateur de stat dérivée. */
export interface FeatureModSource {
  featureId: string;
  /** Nom de la capacité (français), pour le détail affiché au joueur. */
  name: string;
  value: number;
}

/**
 * Détaille, par stat dérivée, QUELLES capacités apportent le modificateur (et
 * combien). Même balayage que `modsFromFeatures`, mais en conservant l'origine —
 * sert à afficher l'inventaire sous la ligne « Capacités / divers » du détail.
 */
export function featureModSources(
  featureIds: string[],
): Partial<Record<DerivedStatId, FeatureModSource[]>> {
  const sources: Partial<Record<DerivedStatId, FeatureModSource[]>> = {};
  for (const id of featureIds) {
    const feature = featureById.get(id);
    if (!feature?.effects) continue;
    for (const effect of feature.effects) {
      if (effect.kind === 'stat-bonus') {
        (sources[effect.stat] ??= []).push({
          featureId: id,
          name: feature.name,
          value: effect.value,
        });
      }
    }
  }
  return sources;
}
