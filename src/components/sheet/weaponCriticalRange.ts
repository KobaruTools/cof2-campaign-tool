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
import { effectiveItem } from '@/lib/character/items';
import { magicWeaponCriticalRanges } from '@/lib/character/magicItemEffects';
import { twoWeaponCombatStatus } from '@/lib/character/twoWeaponCombat';
import type { Character, EquipmentLine } from '@/lib/character/types';
import { isCustomItem } from '@/lib/character/types';
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

/** Assemble un `WeaponLineCriticalRange` à partir de sources déjà collectées, ou `null` si rien. */
function build(
  scope: 'melee' | 'ranged',
  sources: Parameters<typeof combineCriticalRanges>[0],
): WeaponLineCriticalRange | null {
  const combined = combineCriticalRanges(sources, scope);
  if (!combined) return null;
  return {
    scope,
    total: combined.total,
    sources: combined.sources.map((s) => ({ name: s.name, value: s.value, featureId: s.featureId })),
  };
}

/**
 * Plage de critique à afficher sur une LIGNE d'inventaire, ou `null` : arme rangée (la plage ne
 * concerne que l'arme réellement en main) ou aucune source de critique élargi. La ligne est reconnue
 * par IDENTITÉ contre les résolveurs canoniques (`wornMeleeWeaponLine` / `wornRangedWeaponLine`,
 * PER-76/77). En COMBAT À DEUX ARMES (PER-116), la MAIN SECONDAIRE affiche SA propre plage : son arme
 * est imposée au résolveur (`criticalRangeSources({ meleeWeapon })`), comme la 2ᵉ ligne de la carte
 * d'attaque — sinon la puce manquait sur la 2ᵉ arme (ex. variante « taille grande ») alors que la
 * carte l'affiche. Les plages magiques (Affûtée) sont cumulées comme sous les cartes. Fonction PURE.
 */
export function weaponLineCriticalRange(
  character: Character,
  line: EquipmentLine,
): WeaponLineCriticalRange | null {
  if (!line.worn) return null;
  const equipment = character.equipment ?? [];

  // Arme de CONTACT canonique en main (main principale prioritaire) : arme par défaut du résolveur.
  if (wornMeleeWeaponLine(equipment) === line) {
    return build('melee', [
      ...criticalRangeSources(character),
      ...magicWeaponCriticalRanges(line, 'melee'),
    ]);
  }

  // MAIN SECONDAIRE en combat à deux armes : impose SON arme au résolveur (plage propre, PER-116).
  if (
    twoWeaponCombatStatus(character).dualWielding &&
    line.worn.slot === 'offHand' &&
    !isCustomItem(line)
  ) {
    const item = effectiveItem(line);
    if (item?.category === 'weapon' && item.melee) {
      return build('melee', [
        ...criticalRangeSources(character, { meleeWeapon: item }),
        ...magicWeaponCriticalRanges(line, 'melee'),
      ]);
    }
  }

  // Arme à DISTANCE en main.
  if (wornRangedWeaponLine(equipment) === line) {
    return build('ranged', [
      ...criticalRangeSources(character),
      ...magicWeaponCriticalRanges(line, 'ranged'),
    ]);
  }

  return null;
}
