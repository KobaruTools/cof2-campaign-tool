/**
 * Primitives de la voie du guerrier-mage (PER-74, p. 151), pures et testables. R7 (Magie de combat)
 * n'a pas de contrepartie ici : c'est un choix ponctuel à l'incantation (attaque gratuite au lieu de
 * réduire le coût) sans primitive existante pour « échanger un effet contre un autre » — verbatim
 * seul (arbitrage propriétaire).
 */
import { featureById } from '@/data';
import type { Feature } from '@/data/schema';
import type { FeatureEffectNote } from '@/components/sheet/FeatureEffectBadge';
import type { Character } from './types';

const PATH_ID = 'prestige-guerrier-mage';
const R4 = 'prestige-guerrier-mage-r4';
const R5 = 'prestige-guerrier-mage-r5';
const R6 = 'prestige-guerrier-mage-r6';
const R8 = 'prestige-guerrier-mage-r8';

/** Rang hôte du Rituel de combat (R5) — sert de clé à `character.featureChoices`. */
export const COMBAT_RITUAL_HOST = R5;

/** Rang le plus élevé atteint dans la voie du guerrier-mage (0 si absente). */
export function warmageRank(character: Character): number {
  let rank = 0;
  for (const id of character.featureIds) {
    const f = featureById.get(id);
    if (f?.pathId === PATH_ID) rank = Math.max(rank, f.rank);
  }
  return rank;
}

/**
 * Seuil de DEF d'armure (mondaine) exempté de surcoût de mana pour un sort de magie profane (R4
 * « Magie en armure », p. 151) : « rang − 2 » (cuir au rang 4, plaque au rang 8). `null` si R4 n'est
 * pas acquise. Consommé par `spellArmorManaSurcharge` (`manaSurcharge.ts`).
 */
export function warmageArmorWaiverThreshold(character: Character): number | null {
  const rank = warmageRank(character);
  return rank >= 4 ? rank - 2 : null;
}

/**
 * Réduction PERMANENTE de coût en mana (1 PM) du sort désigné au Rituel de combat (R5, p. 151) :
 * « parmi les sorts infligeant des DM que connaît le personnage, il en choisit un qui lui coûte
 * désormais 1 PM de moins ». Sélecteur `known-feature` (`spellsOnly: true`) sur R5 ; le sort choisi
 * peut être rendu N'IMPORTE OÙ sur la fiche (pas seulement dans la voie du guerrier-mage), d'où une
 * fonction prenant la capacité RENDUE en paramètre — comme `spellArmorManaSurcharge`.
 */
export function combatRitualDiscount(character: Character, feature: Feature): number {
  if (!feature.isSpell || !character.featureIds.includes(R5)) return 0;
  const sel = character.featureChoices?.[R5]?.[0];
  return typeof sel === 'string' && sel === feature.id ? 1 : 0;
}

/** Déflexion arcanique (R6, p. 151) acquise ? — badge de rappel sur la carte Défense. */
export function warmageHasDeflection(featureIds: string[]): boolean {
  return featureIds.includes(R6);
}

/** Notes affichées sur la carte « Attaque au contact » (R8, Frappe des arcanes, p. 151). */
export function warmageMeleeAttackNotes(featureIds: string[]): FeatureEffectNote[] {
  if (!featureIds.includes(R8)) return [];
  return [
    {
      featureId: R8,
      icon: 'arcane-strike',
      label: 'Frappe des arcanes',
      // SITUATIONNEL (réaction ponctuelle payée en PM, à la discrétion du joueur) → ambre, comme
      // Impitoyable (écorcheur r8) — le jaune invite à lire l'info-bulle plutôt qu'à compter dessus
      // par défaut. Ne modifie AUCUNE stat calculée (le joueur gère lui-même sa dépense de PM).
      color: 'warning',
      reminder: 'Dépense 1 PM pour obtenir un dé bonus et +{1d4°} DM sur cette attaque au contact.',
    },
  ];
}
