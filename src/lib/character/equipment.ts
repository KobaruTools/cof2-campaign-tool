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
import { effectiveItem } from './items';

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

/**
 * Une arme PORTÉE occupe-t-elle les deux mains ? Vrai si elle est intrinsèquement à
 * deux mains (`weaponCategory: 'twoHands'`) ou si le joueur a choisi la prise à deux
 * mains d'une arme `oneOrTwoHands` (`worn.grip === 'twoHands'`). Faux pour les armes
 * à une main / légères et pour toute arme rangée. Les objets personnalisés (hors
 * catalogue) suivent leur seule prise déclarée, faute de catégorie connue.
 */
export function wornWeaponIsTwoHanded(line: EquipmentLine): boolean {
  if (!line.worn) return false;
  if (isCustomItem(line)) return line.worn.grip === 'twoHands';
  // Catégorie d'arme EFFECTIVE (surcharge de variante prise en compte, PER-211).
  const item = effectiveItem(line);
  if (item?.category !== 'weapon') return false;
  if (item.weaponCategory === 'twoHands') return true;
  if (item.weaponCategory === 'oneOrTwoHands') return line.worn.grip === 'twoHands';
  return false;
}

/**
 * Nombre de mains occupées par une ligne PORTÉE (0 si rangée) :
 *  - armure : 0 (ne prend pas de main) ;
 *  - bouclier : 1 (occupe physiquement la main secondaire, p. 188) ;
 *  - arme en main : 2 si tenue à deux mains (voir `wornWeaponIsTwoHanded`), sinon 1.
 */
function handsUsedByLine(line: EquipmentLine): number {
  const worn = line.worn;
  if (!worn) return 0;
  switch (worn.slot) {
    case 'armor':
      return 0;
    case 'shield':
      return 1;
    case 'mainHand':
      return wornWeaponIsTwoHanded(line) ? 2 : 1;
    case 'offHand':
      return 1;
  }
}

/**
 * Nature d'un conflit de port DUR (PER-77), à signaler sur la fiche permissive
 * (avertissement non bloquant) et dans le wizard :
 *  - `multiple-armor` : plus d'une armure portée (une seule compte, p. 188) ;
 *  - `multiple-shield` : plus d'un bouclier porté ;
 *  - `hands-overbooked` : plus de deux mains occupées (ex. bouclier + arme à deux
 *    mains, ou arme à deux mains + seconde arme). Le combat à deux armes (deux
 *    armes à une main = 2 mains) reste LÉGAL et n'est pas un conflit (décision
 *    propriétaire 2026-06-14).
 */
export type EquipConflictKind = 'multiple-armor' | 'multiple-shield' | 'hands-overbooked';

export interface EquipConflict {
  kind: EquipConflictKind;
  /** Message français prêt à afficher (avertissement non bloquant). */
  message: string;
}

/**
 * Détecte les conflits de port DURS d'une liste d'équipement (PER-77). Ne considère
 * que les objets marqués `worn` (le sac n'entre jamais en conflit). Ne PRÉVIENT rien
 * (la fiche reste permissive) : renvoie la liste des incohérences à signaler.
 */
export function equipConflicts(equipment: EquipmentLine[]): EquipConflict[] {
  const conflicts: EquipConflict[] = [];
  let armorCount = 0;
  let shieldCount = 0;
  let handsUsed = 0;
  for (const line of equipment) {
    if (!line.worn) continue;
    if (line.worn.slot === 'armor') armorCount += 1;
    else if (line.worn.slot === 'shield') shieldCount += 1;
    handsUsed += handsUsedByLine(line);
  }
  if (armorCount > 1) {
    conflicts.push({
      kind: 'multiple-armor',
      message: 'Plusieurs armures portées en même temps : une seule protège (p. 188).',
    });
  }
  if (shieldCount > 1) {
    conflicts.push({
      kind: 'multiple-shield',
      message: 'Plusieurs boucliers portés en même temps : un seul protège.',
    });
  }
  if (handsUsed > 2) {
    conflicts.push({
      kind: 'hands-overbooked',
      message:
        'Les deux mains sont déjà prises : une arme à deux mains ne peut pas être tenue avec un bouclier ou une autre arme.',
    });
  }
  return conflicts;
}

/**
 * Malus d'armure (« malus d'encombrement », p. 188) imposé par l'armure PORTÉE :
 *
 *   `max(0, DEF mondaine de l'armure portée − bonus magique de l'armure)`
 *
 * Ce malus s'ajoute à la difficulté de **tous les tests d'AGI** (et, au choix du MJ,
 * de certains tests de survie CON — voir PER-209). Un bonus magique d'armure
 * (`EquipmentRef.magicDef`, PER-85) ne l'augmente jamais et le réduit (plancher 0) :
 * « une chemise de mailles (DEF +4) +3 impose seulement un malus de −1 » (p. 188).
 *
 * Périmètre, calqué sur `defenseFromEquipment` / `wornArmorWorldlyDef` :
 *  - seule la **première armure PORTÉE** du catalogue compte (au plus une, p. 188) ;
 *  - les **boucliers** n'ont pas de malus d'armure (colonne AGI max « — » p. 188) ;
 *  - la DEF retenue est la DEF **effective** (surcharges de variante appliquées, PER-211) ;
 *  - les objets personnalisés (stats inconnues) et l'inventaire rangé sont ignorés.
 *
 * Fonction pure réutilisable telle quelle par l'Écran MJ (PER-210).
 */
export function armorEncumbrancePenalty(equipment: EquipmentLine[]): number {
  for (const line of equipment) {
    if (isCustomItem(line) || line.worn?.slot !== 'armor') continue;
    const item = effectiveItem(line);
    if (item?.category !== 'armor') continue;
    return Math.max(0, item.def - (line.magicDef ?? 0));
  }
  return 0;
}

/** Effet combiné de l'armure portée sur la valeur d'AGI d'un test (PER-78 + PER-209). */
export interface AgiTestArmorAdjustment {
  /** AGI EFFECTIVE après le plafond d'armure (PER-78), buffs exclus. */
  cappedAgi: number;
  /** Le plafond d'armure abaisse-t-il l'AGI brute (`rawAgi > maxAgi`) ? */
  capped: boolean;
  /** Malus d'armure appliqué (≥ 0, PER-209). */
  penalty: number;
  /** AGI contribuant réellement au test : `cappedAgi − penalty` (buffs à ajouter par-dessus). */
  value: number;
}

/**
 * Compose, dans le BON ORDRE, l'effet de l'armure portée sur la composante AGI d'un test
 * (p. 188) : on applique D'ABORD le plafond d'AGI de l'armure (PER-78, `maxAgi` ; `null` =
 * aucun plafond), PUIS on retranche le malus d'armure (PER-209, déjà planché à 0 par
 * `armorEncumbrancePenalty`). L'ordre importe : plafonner après coup donnerait un résultat
 * différent pour une AGI supérieure au plafond. Les buffs/bonus propres à la carac s'ajoutent
 * PAR-DESSUS la `value` renvoyée. Fonction pure (aucun accès catalogue).
 */
export function agiTestArmorAdjustment(
  rawAgi: number,
  maxAgi: number | null,
  armorPenalty: number,
): AgiTestArmorAdjustment {
  const capped = maxAgi != null && rawAgi > maxAgi;
  const cappedAgi = capped ? maxAgi : rawAgi;
  const penalty = Math.max(0, armorPenalty);
  return { cappedAgi, capped, penalty, value: cappedAgi - penalty };
}

/**
 * Pose (ou retire, avec `undefined`) l'état de port d'UNE ligne, sur une copie de la
 * liste. Ne mute pas la source.
 *
 * Exclusivité des mains : une main ne tient qu'une seule arme. Poser une arme en main
 * principale (resp. secondaire) LIBÈRE toute AUTRE arme déjà dans cette même main —
 * on ne peut pas se retrouver avec deux armes dans la même main.
 *
 * Cas des DEUX MAINS (PER-219) : équiper une arme qui occupe les deux mains (arme
 * intrinsèquement à deux mains, ou arme « à une ou deux mains » posée avec la prise
 * `twoHands`) LIBÈRE en plus, d'office et en silence (retour au sac), toute arme en
 * main secondaire ET le bouclier porté — on ne peut physiquement pas les tenir avec.
 * C'est le seul conflit de mains RÉSOLU activement ici ; les autres incohérences
 * (plusieurs armures/boucliers, ou un bouclier posé APRÈS coup sur une arme à deux
 * mains) restent SIGNALÉES par `equipConflicts` sur la fiche permissive.
 */
export function setWornAt(
  equipment: EquipmentLine[],
  index: number,
  worn: WornState | undefined,
): EquipmentLine[] {
  const exclusiveHand =
    worn && (worn.slot === 'mainHand' || worn.slot === 'offHand') ? worn.slot : null;
  // Arme posée en main principale occupant les deux mains → libère l'autre main
  // (arme secondaire) et le bouclier. On teste la ligne visée dotée du nouvel état.
  const target = equipment[index];
  const freesOtherHand =
    worn?.slot === 'mainHand' &&
    target !== undefined &&
    wornWeaponIsTwoHanded({ ...target, worn });
  return equipment.map((line, i) => {
    if (i === index) return { ...line, worn };
    if (exclusiveHand && line.worn?.slot === exclusiveHand) return { ...line, worn: undefined };
    if (freesOtherHand && (line.worn?.slot === 'offHand' || line.worn?.slot === 'shield')) {
      return { ...line, worn: undefined };
    }
    return line;
  });
}
