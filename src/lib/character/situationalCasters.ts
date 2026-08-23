/**
 * LANCEUR D'UN EFFET SITUATIONNEL À DURÉE CALCULÉE (PER-446) — part PURE : quel personnage réclamé
 * confère `effectId`, pour lire sa caractéristique de `durationFrom` (ex. Nuée de criquets, « 5 + CHA »).
 *
 * Pendant de `groupBuffFeatureId` (`groupBuffs.ts`), mais côté effets SITUATIONNELS
 * (`Feature.situationalEffectIds`) plutôt que buffs de groupe (`Feature.groupBuffIds`) : catalogues et
 * chemins de pose distincts (dépôt direct sur la VICTIME, pas de liste de bénéficiaires), d'où un
 * module à part plutôt qu'une extension de `groupBuffs.ts`.
 *
 * Aucune UI, aucun store — capacités acquises en entrée, données en sortie.
 */
import { featureById } from '@/data/index';
import type { AbilityId, SituationalEffectId } from '@/data/schema';
import { effectiveFeatureIdsForMods } from './choices';
import type { Character } from './types';

/** Un lanceur candidat pour la fenêtre de pose : de quoi l'afficher et lire sa caractéristique. */
export interface SituationalEffectCaster {
  id: string;
  name: string;
  abilities: Record<AbilityId, number>;
}

/**
 * Cache de la table inverse « effet situationnel → capacité porteuse ». Reconstruit dès que le
 * registre de capacités change de taille (contenu payant fusionné après le premier rendu) — même
 * garde que `groupBuffFeatureId`.
 */
let carrierFeatureByEffect: { size: number; map: Map<string, string> } | null = null;

/**
 * Capacité qui CONFÈRE `effectId`, indépendamment de tout personnage (`'locust-swarm'` →
 * `'prestige-vermines-r5'`). `undefined` si aucune capacité ne le confère.
 */
function situationalEffectFeatureId(effectId: SituationalEffectId): string | undefined {
  if (carrierFeatureByEffect?.size !== featureById.size) {
    const map = new Map<string, string>();
    for (const [featureId, feature] of featureById) {
      for (const id of feature.situationalEffectIds ?? []) if (!map.has(id)) map.set(id, featureId);
    }
    carrierFeatureByEffect = { size: featureById.size, map };
  }
  return carrierFeatureByEffect.map.get(effectId);
}

/**
 * Personnages réclamés qui possèdent la capacité conférant `effectId` (capacité EMPRUNTÉE comprise,
 * même garde que `unlockedGroupBuffIds`/`unlockedSituationalEffectIds`) — les candidats proposés par
 * la fenêtre de pose « qui a lancé ? ». Vide si personne à la table ne la porte (créature, PNJ) : la
 * fenêtre dédiée ne s'ouvre alors pas, l'effet se pose comme avant PER-446.
 */
export function situationalEffectCasters(
  characters: readonly Character[],
  effectId: SituationalEffectId,
): SituationalEffectCaster[] {
  const featureId = situationalEffectFeatureId(effectId);
  if (!featureId) return [];
  return characters
    .filter((c) => effectiveFeatureIdsForMods(c).includes(featureId))
    .map((c) => ({ id: c.id, name: c.name, abilities: c.abilities }));
}
