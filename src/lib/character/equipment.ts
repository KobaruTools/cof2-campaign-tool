/**
 * Équipement porté (PER-76) — logique de sélection des objets équipés par défaut.
 *
 * Le modèle distingue désormais un objet **porté** (`EquipmentLine.worn`) d'un objet
 * simplement **rangé**. Deux points d'entrée doivent produire un personnage déjà
 * armé/protégé comme avant PER-76, sans intervention de l'utilisateur :
 *  - la **migration** v16→v17 (les personnages existants gardent leur défense) ;
 *  - l'**équipement de départ** du wizard (une création part équipée).
 *
 * Cette logique commune vit ici pour rester unique (source de vérité de « quoi
 * équiper d'office »). L'UI d'équipement/déséquipement manuel relève de PER-77.
 */
import { equipmentById } from '@/data';
import type { EquipmentLine, WornState } from './types';
import { isCustomItem } from './types';

/**
 * Auto-équipe, sur une copie de la liste, la **meilleure armure**, le **meilleur
 * bouclier** (plus haut bonus de DEF, à égalité le premier trouvé) et la **première
 * arme** du catalogue présents dans l'inventaire — mais seulement si RIEN n'est
 * encore porté (idempotent : une liste déjà équipée est renvoyée telle quelle).
 *
 * Choisir la meilleure armure/bouclier plutôt que la première rencontrée préserve
 * au mieux la défense d'un personnage qui aurait empilé plusieurs armures dans son
 * sac (l'ancien calcul, bogué, cumulait tous les bonus — voir `defenseFromEquipment`).
 * Dans le cas courant (une seule armure, un seul bouclier), le résultat est
 * simplement « l'armure et le bouclier présents ».
 *
 * Les objets personnalisés (hors catalogue) ne sont jamais auto-équipés : leur
 * catégorie/stats ne sont pas connues.
 */
export function autoEquipStartingGear(lines: EquipmentLine[]): EquipmentLine[] {
  if (lines.some((line) => line.worn)) return lines;

  let bestArmorIdx = -1;
  let bestArmorDef = -Infinity;
  let bestShieldIdx = -1;
  let bestShieldDef = -Infinity;
  let firstWeaponIdx = -1;

  lines.forEach((line, i) => {
    if (isCustomItem(line)) return;
    const item = equipmentById.get(line.itemId);
    if (!item) return;
    if (item.category === 'armor') {
      if (item.def > bestArmorDef) {
        bestArmorDef = item.def;
        bestArmorIdx = i;
      }
    } else if (item.category === 'shield') {
      if (item.def > bestShieldDef) {
        bestShieldDef = item.def;
        bestShieldIdx = i;
      }
    } else if (item.category === 'weapon' && firstWeaponIdx < 0) {
      firstWeaponIdx = i;
    }
  });

  if (bestArmorIdx < 0 && bestShieldIdx < 0 && firstWeaponIdx < 0) return lines;

  const next = lines.map((line) => ({ ...line }));
  if (bestArmorIdx >= 0) next[bestArmorIdx].worn = { slot: 'armor' };
  if (bestShieldIdx >= 0) next[bestShieldIdx].worn = { slot: 'shield' };
  if (firstWeaponIdx >= 0) {
    const weaponLine = next[firstWeaponIdx];
    const item = !isCustomItem(weaponLine) ? equipmentById.get(weaponLine.itemId) : undefined;
    const worn: WornState = { slot: 'mainHand' };
    // Une arme « à une ou deux mains » part tenue à une main (la main secondaire
    // reste libre) ; le choix de la prise sera modifiable via l'UI (PER-77).
    if (item?.category === 'weapon' && item.weaponCategory === 'oneOrTwoHands') {
      worn.grip = 'oneHand';
    }
    weaponLine.worn = worn;
  }
  return next;
}
