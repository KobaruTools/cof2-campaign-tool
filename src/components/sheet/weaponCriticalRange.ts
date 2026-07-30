/**
 * PLAGE DE CRITIQUE DE L'ARME EN MAIN, pour la LIGNE D'INVENTAIRE (PER-74, retour propriétaire sur
 * la voie des armes à deux mains p. 146).
 *
 * La plage effective était déjà affichée sous les cartes « Attaque au contact / à distance »
 * (PER-133/136/225) ; il manquait le rappel SUR L'ARME elle-même — là où le joueur regarde quand il
 * choisit avec quoi frapper. Ce module ne porte que la RÉSOLUTION (pure, testable) ; le rendu est
 * dans `WeaponCriticalRangeBadge.tsx`, qui réutilise la puce des cartes de stats.
 *
 * Sources cumulées (`criticalRangeSources` + `combineCriticalRanges`) : plage INTRINSÈQUE de l'arme
 * (rapière, vivelame 19-20, p. 183) ET capacités actives dont la condition d'arme est remplie
 * (« Critique destructeur » avec une arme tenue à deux mains, « Frappe chirurgicale » avec une arme
 * légère…). Aucun jet n'est simulé : c'est une donnée d'affichage, comme la RD.
 */
import { criticalRangeSources } from '@/lib/character/effects';
import { wornMeleeWeaponLine, wornRangedWeaponLine } from '@/lib/character/equipment';
import type { Character, EquipmentLine } from '@/lib/character/types';
import { combineCriticalRanges } from '@/lib/ui/criticalRange';

/** Plage de critique effective d'une ligne d'arme portée, avec ses contributeurs (info-bulle). */
export interface WeaponLineCriticalRange {
  /** Portée dont relève la ligne (arme en main au contact, ou à distance). */
  scope: 'melee' | 'ranged';
  /** Élargissement CUMULÉ résolu (1 → 19-20, 2 → 18-20 ; plancher 16 appliqué au formatage). */
  total: number;
  /** Sources contributrices : capacités actives et/ou l'arme elle-même. */
  sources: Array<{ name: string; value: number; featureId?: string }>;
}

/**
 * Plage de critique à afficher sur une LIGNE d'inventaire, ou `null` : arme rangée (la plage ne
 * concerne que l'arme réellement en main), ligne qui n'est pas l'arme retenue pour sa portée par les
 * résolveurs canoniques (`wornMeleeWeaponLine` / `wornRangedWeaponLine`, PER-76/77 — avec deux armes
 * en main la puce ne se duplique donc pas sur celle dont la carte d'attaque ne parle pas), ou aucune
 * source de critique élargi. Fonction PURE.
 */
export function weaponLineCriticalRange(
  character: Character,
  line: EquipmentLine,
): WeaponLineCriticalRange | null {
  if (!line.worn) return null;
  const equipment = character.equipment ?? [];
  // Portée dont relève CETTE ligne, par identité de ligne. Le contact est prioritaire (même règle
  // que la carte d'attaque) : une arme lançable tenue en main affiche sa plage de contact.
  const scope: 'melee' | 'ranged' | null =
    wornMeleeWeaponLine(equipment) === line
      ? 'melee'
      : wornRangedWeaponLine(equipment) === line
        ? 'ranged'
        : null;
  if (!scope) return null;
  const combined = combineCriticalRanges(criticalRangeSources(character), scope);
  if (!combined) return null;
  return {
    scope,
    total: combined.total,
    sources: combined.sources.map((s) => ({ name: s.name, value: s.value, featureId: s.featureId })),
  };
}
