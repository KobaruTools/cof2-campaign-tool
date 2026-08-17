/**
 * AURAS DE PRÉSENCE DE GROUPE (PER-438) — part PURE : quels personnages réclamés confèrent quelle
 * aura passive du catalogue `BENEFICIAL_EFFECTS` (buff comme malus), par simple présence à la
 * table — jamais posée à la main par le MJ, contrairement aux buffs de groupe (`groupBuffs.ts`).
 *
 * Symétrique du canal cristal confié (PER-360, `crystals.ts`, `crystalsHeldByOthers`) côté
 * contrainte RLS : la fiche d'un joueur ne peut pas lire les autres personnages de la table pour
 * savoir « qui d'autre est présent » — seul l'écran de MJ voit tout le monde. Ce module calcule
 * donc les PORTEURS (`passiveAuraCarrierIds`), que l'écran de MJ persiste dans l'état de combat
 * partagé (`GmCombatState.partyAuraCarrierIds`, canal RLS-safe qui diffuse déjà aux joueurs) ; la
 * fiche du joueur relit cette liste et applique elle-même l'exclusion du porteur
 * (`passiveAuraStatusesFor`), puisqu'elle connaît son propre personnage.
 *
 * Aucune UI, aucun store — capacités acquises en entrée, données en sortie.
 */
import { featureById } from '@/data/index';
import type { BeneficialEffectId } from '@/data/schema';
import { effectiveFeatureIdsForMods } from './choices';
import { statusEntry, statusExcludesCarrier, type EffectiveStatus } from './statusEffects';
import type { Character } from './types';

/**
 * Ids de personnages PORTEURS de chaque aura passive, parmi les personnages fournis (typiquement
 * les personnages RÉCLAMÉS d'une campagne). Un personnage est porteur d'une aura dès que l'une de
 * ses capacités EFFECTIVES (`effectiveFeatureIdsForMods` — capacités natives ET empruntées, même
 * filet que `unlockedGroupBuffIds`) déclare `passiveAuraIds`. Entrées vides omises.
 */
export function passiveAuraCarrierIds(
  characters: readonly Character[],
): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const character of characters) {
    const seen = new Set<string>();
    for (const featureId of effectiveFeatureIdsForMods(character)) {
      const feature = featureById.get(featureId);
      for (const auraId of feature?.passiveAuraIds ?? []) {
        if (seen.has(auraId)) continue;
        seen.add(auraId);
        (out[auraId] ??= []).push(character.id);
      }
    }
  }
  return out;
}

/**
 * Auras EFFECTIVES pour `characterId`, d'après la carte des porteurs (typiquement diffusée par
 * l'écran de MJ, `GmCombatState.partyAuraCarrierIds`). Une aura compte pour `characterId` dès
 * qu'elle a au moins un porteur et que `characterId` n'est pas le SEUL porteur exclu par le
 * catalogue (`excludesCarrier` — même règle que l'offre manuelle de `GroupBuffDialog`, généralisée
 * à un mécanisme auto-dérivé) : `!excludesCarrier || un porteur autre que characterId`.
 *
 * Forme `origin: 'auto'` (comme `hpAutoStatuses`) : jamais posée, jamais retirable à la main.
 */
export function passiveAuraStatusesFor(
  characterId: string,
  carrierIds: Readonly<Record<string, readonly string[]>>,
): EffectiveStatus[] {
  const out: EffectiveStatus[] = [];
  for (const [auraId, carriers] of Object.entries(carrierIds)) {
    if (carriers.length === 0) continue;
    const excludesCarrier = statusExcludesCarrier(auraId as BeneficialEffectId);
    if (excludesCarrier && !carriers.some((id) => id !== characterId)) continue;
    const entry = statusEntry(auraId as BeneficialEffectId);
    if (!entry) continue;
    out.push({
      id: auraId as BeneficialEffectId,
      origin: 'auto',
      autoReason: { text: entry.effect, sourcePage: entry.sourcePage },
    });
  }
  return out;
}

/**
 * Cache de la table inverse « aura → capacité porteuse » (même patron que `groupBuffFeatureId`,
 * `groupBuffs.ts`). Reconstruit dès que le registre de capacités change de taille : le contenu
 * payant est fusionné dans `featureById` après le premier rendu.
 */
let carrierFeatureByAura: { size: number; map: Map<string, string> } | null = null;

/**
 * Capacité qui CONFÈRE `auraId` (scan `feature.passiveAuraIds`), indépendamment de tout
 * personnage — sert à nommer la source sur la fiche du buffé (breakdown des tests), qui ne
 * possède pas cette capacité elle-même. `undefined` pour tout id qui n'est pas une aura passive.
 */
export function passiveAuraFeatureId(auraId: string): string | undefined {
  if (carrierFeatureByAura?.size !== featureById.size) {
    const map = new Map<string, string>();
    for (const [featureId, feature] of featureById) {
      for (const id of feature.passiveAuraIds ?? []) if (!map.has(id)) map.set(id, featureId);
    }
    carrierFeatureByAura = { size: featureById.size, map };
  }
  return carrierFeatureByAura.map.get(auraId);
}

/**
 * Vrai si `id` désigne une AURA PASSIVE (portée par au moins une capacité via `passiveAuraIds`),
 * et non un buff de groupe posé à la main. Sert à exclure ces ids du renoncement joueur
 * (`ActiveStatusPanel`, PER-358) : une aura passive est un état SUBI, jamais un choix du lanceur
 * que le buffé pourrait décliner — contrairement à un vrai buff de groupe, elle n'a d'ailleurs
 * aucun interrupteur nulle part (même esprit que le rang 4 du frouïn, « trop situationnel »).
 */
export function isPassiveAuraId(id: string): boolean {
  if (carrierFeatureByAura?.size !== featureById.size) passiveAuraFeatureId(id);
  return carrierFeatureByAura?.map.has(id) ?? false;
}
