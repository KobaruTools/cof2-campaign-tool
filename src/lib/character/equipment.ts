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
import { equipmentById, testDomains } from '@/data';
import type { AbilityId, Weapon } from '@/data/schema';
import { ABILITY_IDS } from '@/data/schema';
import type {
  EquipmentLine,
  EquipmentRef,
  ItemDerivedStatId,
  ItemTestTarget,
  WornState,
} from './types';
import { ITEM_DERIVED_STAT_IDS, isCustomItem } from './types';
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
 * Ligne de l'arme de CONTACT effectivement TENUE EN MAIN — résolveur CANONIQUE de
 * « l'arme au contact courante » : main principale prioritaire, sinon main secondaire
 * (combat à deux armes). `null` si aucune arme de contact n'est portée (le personnage
 * combat alors à mains nues). Les objets libres (`CustomItem`) sont ignorés (pas d'item
 * de catalogue). Point d'entrée UNIQUE pour éviter des résolveurs concurrents de l'arme
 * active : DM de la carte « Attaque au contact » (PER-141) ET plage de critique
 * intrinsèque de l'arme (PER-225) doivent se baser sur la MÊME arme.
 */
export function wornMeleeWeaponLine(equipment: EquipmentLine[]): EquipmentRef | null {
  const meleeRefs = equipment.filter((line): line is EquipmentRef => {
    if (isCustomItem(line)) return false;
    const item = effectiveItem(line);
    return item?.category === 'weapon' && item.melee;
  });
  return (
    meleeRefs.find((l) => l.worn?.slot === 'mainHand') ??
    meleeRefs.find((l) => l.worn?.slot === 'offHand') ??
    null
  );
}

/**
 * Arme de contact EFFECTIVE tenue en main (surcharges de variante appliquées, PER-211),
 * ou `null` à mains nues. Raccourci sur `wornMeleeWeaponLine` pour les appelants qui n'ont
 * besoin que de l'item (plage de critique intrinsèque, PER-225) et pas de la prise.
 */
export function wornMeleeWeapon(equipment: EquipmentLine[]): Weapon | null {
  const line = wornMeleeWeaponLine(equipment);
  if (!line) return null;
  const item = effectiveItem(line);
  return item?.category === 'weapon' ? item : null;
}

/**
 * Ligne de l'arme À DISTANCE effectivement TENUE EN MAIN — pendant à distance de
 * `wornMeleeWeaponLine` : main principale prioritaire, sinon main secondaire. `null` si
 * aucune arme à distance n'est portée. Les objets libres (`CustomItem`) sont ignorés. Sert
 * à évaluer les capacités conditionnées à l'arme à distance portée (plage de critique à
 * distance PER-136/236 : Science du critique de l'arquebusier, Archer émérite de l'elfe).
 * NB : une arme lançable (dague, épieu…) est à la fois de contact et à distance ; elle peut
 * donc être retenue ici comme là — son `rangedKind: 'thrown'` la distingue des arcs/arbalètes.
 */
export function wornRangedWeaponLine(equipment: EquipmentLine[]): EquipmentRef | null {
  const rangedRefs = equipment.filter((line): line is EquipmentRef => {
    if (isCustomItem(line)) return false;
    const item = effectiveItem(line);
    return item?.category === 'weapon' && item.ranged;
  });
  return (
    rangedRefs.find((l) => l.worn?.slot === 'mainHand') ??
    rangedRefs.find((l) => l.worn?.slot === 'offHand') ??
    null
  );
}

/**
 * Arme à distance EFFECTIVE tenue en main (surcharges de variante appliquées, PER-211), ou
 * `null` si aucune n'est portée. Raccourci sur `wornRangedWeaponLine` pour les appelants qui
 * n'ont besoin que de l'item (plage de critique à distance, PER-236).
 */
export function wornRangedWeapon(equipment: EquipmentLine[]): Weapon | null {
  const line = wornRangedWeaponLine(equipment);
  if (!line) return null;
  const item = effectiveItem(line);
  return item?.category === 'weapon' ? item : null;
}

/**
 * Nombre de mains occupées par une ligne PORTÉE (0 si rangée) :
 *  - armure : 0 (ne prend pas de main) ;
 *  - bouclier : 1 (occupe physiquement la main secondaire, p. 188) ;
 *  - arme en main : 2 si tenue à deux mains (voir `wornWeaponIsTwoHanded`), sinon 1 ;
 *  - accessoire : 0 (bottes/cape/anneau…, n'occupe aucune main).
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
    case 'accessory':
      // Bottes/cape/anneau… n'occupent aucune main (support d'un bonus magique).
      return 0;
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
export type EquipConflictKind =
  | 'multiple-armor'
  | 'multiple-shield'
  | 'hands-overbooked'
  | 'quiver-with-backpack';

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
  let quiverWorn = false;
  let backpackWorn = false;
  for (const line of equipment) {
    if (!line.worn) continue;
    if (line.worn.slot === 'armor') armorCount += 1;
    else if (line.worn.slot === 'shield') shieldCount += 1;
    handsUsed += handsUsedByLine(line);
    if (!isCustomItem(line)) {
      if (line.itemId === 'carquois-de-20-fleches') quiverWorn = true;
      else if (line.itemId === 'sac-a-dos') backpackWorn = true;
    }
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
  if (quiverWorn && backpackWorn) {
    conflicts.push({
      kind: 'quiver-with-backpack',
      message:
        'Un carquois et un sac à dos portés en même temps se gênent dans le dos : difficile de dégainer les flèches rapidement.',
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
export function armorEncumbrancePenalty(equipment: EquipmentLine[], divisor = 1): number {
  for (const line of equipment) {
    if (isCustomItem(line) || line.worn?.slot !== 'armor') continue;
    const item = effectiveItem(line);
    if (item?.category !== 'armor') continue;
    const penalty = Math.max(0, item.def - (line.magicDef ?? 0));
    // Diviseur (PER-236, Armure sur mesure `guerre-r1`, p. 84) : le chevalier « n'ajoute que la
    // moitié de sa DEF » aux tests que l'armure pénalise → malus divisé, arrondi à l'inférieur
    // (favorable au joueur, arrondi CO2 par défaut). Diviseur 1 (défaut) = malus inchangé.
    return divisor > 1 ? Math.floor(penalty / divisor) : penalty;
  }
  return 0;
}

/**
 * Ids (catalogue `armors`) des armures LOURDES au sens des capacités (« plaque ou plaque
 * complète », p. 84) : `armure-de-plaques` (DEF +6) et `plaque-complete` (DEF +7). Notion
 * de RÈGLE (« armure lourde »), distincte du plafond de PORT (PER-80) et du malus (PER-209).
 */
export const HEAVY_ARMOR_IDS: readonly string[] = ['armure-de-plaques', 'plaque-complete'];

/**
 * Une armure LOURDE (plaque / plaque complète) est-elle RÉELLEMENT portée (slot `armor`) ?
 * Détection sur l'itemId de BASE — une variante enchantée d'une plaque reste une plaque ;
 * une armure légère surchargée à DEF +6 n'en est PAS une. Sert au bonus de DEF « en armure
 * lourde » d'Armure sur mesure (`guerre-r1`, PER-236). Objets personnalisés ignorés.
 */
export function isHeavyArmorWorn(equipment: EquipmentLine[] = []): boolean {
  for (const line of equipment) {
    if (isCustomItem(line) || line.worn?.slot !== 'armor') continue;
    return HEAVY_ARMOR_IDS.includes(line.itemId);
  }
  return false;
}

/**
 * Objet PORTÉ à l'origine d'un apport (de caractéristique, PER-272, ou de statistique
 * dérivée, PER-273), pour le détail affiché au joueur (« Bottes de vivacité +1 »). Pas de
 * `featureId` : la source est un objet, pas une capacité — le détail le rend donc en
 * libellé texte, sans puce de voie.
 */
export interface AbilityBonusItemSource {
  /** Nom de l'objet tel qu'affiché dans l'inventaire (français). */
  name: string;
  /** Apport signé (positif = bonus, négatif = malus). */
  value: number;
}

/**
 * Nom d'affichage d'une ligne d'inventaire pour le détail d'une caractéristique. Reprend
 * la logique de `equipmentLabel` MOINS les reskins de profil (PER-181), volontairement :
 * ce module reste pur (aucune dépendance vers les composants) et un objet porteur d'un
 * apport de carac est en pratique une variante nommée explicitement par le joueur — son
 * `overrides.name`, capté par `effectiveItem`, prime de toute façon sur tout reskin.
 */
function lineDisplayName(line: EquipmentLine): string {
  if (isCustomItem(line)) return line.name;
  return effectiveItem(line)?.name ?? line.itemId;
}

/**
 * Apports de l'équipement PORTÉ lus dans un champ d'apports de la ligne d'inventaire
 * (`abilityBonuses` pour les caractéristiques, PER-272 ; `derivedBonuses` pour les stats
 * dérivées, PER-273 ; `testBonuses` pour les tests, PER-275), regroupés par clé avec l'objet
 * source de chaque apport.
 *
 * Périmètre commun, calqué sur celui de `magicDef` (`defenseFromEquipment`) :
 *  - seuls les objets marqués `worn` comptent — un objet rangé dans le sac n'apporte rien ;
 *  - N'IMPORTE QUEL emplacement porte l'apport (armure, arme en main, mais surtout
 *    `accessory` : anneau, cape, bottes…), objets LIBRES compris ;
 *  - un apport de 0 est ignoré (n'apparaît pas dans le détail).
 *
 * La règle de CUMUL, elle, appartient au consommateur et pas à ce collecteur : les caracs et
 * les stats dérivées se somment (`sumBonusSources`), les bonus aux tests NON (bonus de magie,
 * on retient le meilleur — cf. `resolveTestBonus`). D'où un détail PAR SOURCE dans tous les
 * cas, la réduction restant optionnelle.
 */
function bonusSourcesFromEquipment<K extends string>(
  equipment: EquipmentLine[],
  field: 'abilityBonuses' | 'derivedBonuses' | 'testBonuses',
  allowed?: readonly K[],
): Partial<Record<K, AbilityBonusItemSource[]>> {
  const out: Partial<Record<K, AbilityBonusItemSource[]>> = {};
  for (const line of equipment) {
    const bonuses = line[field];
    if (!line.worn || !bonuses) continue;
    const name = lineDisplayName(line);
    for (const [key, value] of Object.entries(bonuses) as [K, number][]) {
      if (!value) continue;
      // Clé hors liste blanche → ignorée en silence. Sert de garde-fou aux DONNÉES : un
      // fichier importé (ou un personnage d'avant la décision de conception) peut porter une
      // clé qu'on n'accepte plus, sans que l'apport prenne effet. Cf. `ItemDerivedStatId`,
      // qui exclut la Défense.
      if (allowed && !allowed.includes(key)) continue;
      (out[key] ??= []).push({ name, value });
    }
  }
  return out;
}

/** Somme des apports par clé — la réduction d'un détail par source en sac de totaux. */
function sumBonusSources<K extends string>(
  sources: Partial<Record<K, AbilityBonusItemSource[]>>,
): Partial<Record<K, number>> {
  // Accumulation sur un `Record<string, number>` (et non `Partial<Record<K, number>>`) :
  // écrire dans un type indexé par un PARAMÈTRE de type dérouterait l'inférence.
  const out: Record<string, number> = {};
  for (const [key, list] of Object.entries(sources) as [string, AbilityBonusItemSource[]][]) {
    out[key] = list.reduce((sum, s) => sum + s.value, 0);
  }
  return out as Partial<Record<K, number>>;
}

/**
 * Apports de CARACTÉRISTIQUES de l'équipement PORTÉ (PER-272), par caractéristique, avec
 * l'objet source de chaque apport. Périmètre : cf. `bonusSourcesFromEquipment`.
 *
 * Fonction pure, réutilisable telle quelle par l'écran de MJ.
 */
export function abilityBonusSourcesFromEquipment(
  equipment: EquipmentLine[] = [],
): Partial<Record<AbilityId, AbilityBonusItemSource[]>> {
  return bonusSourcesFromEquipment<AbilityId>(equipment, 'abilityBonuses');
}

/**
 * Apports de caractéristiques de l'équipement porté SOMMÉS par caractéristique (PER-272) —
 * ce que consomme `effectiveAbilities`. Même périmètre que
 * `abilityBonusSourcesFromEquipment`, dont ce raccourci est la réduction.
 */
export function abilityBonusesFromEquipment(
  equipment: EquipmentLine[] = [],
): Partial<Record<AbilityId, number>> {
  return sumBonusSources(abilityBonusSourcesFromEquipment(equipment));
}

/**
 * Apports de STATISTIQUES DÉRIVÉES de l'équipement PORTÉ (PER-273), par stat, avec l'objet
 * source de chaque apport — le détail rendu dans l'infobulle « i » de la stat. Périmètre
 * identique à celui des caracs (cf. `bonusSourcesFromEquipment`), à une restriction près :
 * la **Défense** n'est pas modifiable par un objet (cf. `ItemDerivedStatId`) et une clé
 * `def` traînant dans les données est donc ignorée ici — la DEF magique (`magicDef`) reste
 * le seul canal d'enchantement défensif.
 *
 * Fonction pure, réutilisable telle quelle par l'écran de MJ.
 */
export function derivedBonusSourcesFromEquipment(
  equipment: EquipmentLine[] = [],
): Partial<Record<ItemDerivedStatId, AbilityBonusItemSource[]>> {
  return bonusSourcesFromEquipment<ItemDerivedStatId>(
    equipment,
    'derivedBonuses',
    ITEM_DERIVED_STAT_IDS,
  );
}

/**
 * Apports de stats dérivées de l'équipement porté SOMMÉS par stat (PER-273) — un sac de
 * `DerivedMods` prêt à être fusionné (`mergeMods`) avec ceux des capacités et des points
 * orphelins : les objets ALIMENTENT la couche de modificateurs du moteur, ils ne la
 * doublent pas. Réduction de `derivedBonusSourcesFromEquipment`, dont il reprend la
 * restriction (aucun apport possible à la Défense).
 */
export function derivedBonusesFromEquipment(
  equipment: EquipmentLine[] = [],
): Partial<Record<ItemDerivedStatId, number>> {
  return sumBonusSources(derivedBonusSourcesFromEquipment(equipment));
}

/** Apports aux tests des objets portés, démêlés par portée — cf. `testBonusSourcesFromEquipment`. */
export interface ItemTestBonusSources {
  /** Apports visant TOUS les tests d'une caractéristique, par caractéristique. */
  byAbility: Partial<Record<AbilityId, AbilityBonusItemSource[]>>;
  /** Apports visant un domaine de compétence précis, par domaine. */
  byDomain: Partial<Record<string, AbilityBonusItemSource[]>>;
}

/**
 * Cibles acceptées d'un bonus aux tests d'objet (PER-275), dans l'ordre canonique : les 7
 * caractéristiques d'abord (« +2 à TOUS les tests de FOR »), puis tous les domaines de
 * compétence du catalogue (« +5 en Discrétion »). Sert à la fois de liste au sélecteur de la
 * modale d'objet et de LISTE BLANCHE à l'agrégation — une cible inconnue (fichier importé,
 * domaine retiré du catalogue) est ignorée en silence, comme pour les stats dérivées.
 */
export const ITEM_TEST_TARGET_IDS: readonly ItemTestTarget[] = [
  ...ABILITY_IDS,
  ...testDomains.map((d) => d.id),
];

/**
 * Apports aux TESTS de l'équipement PORTÉ (PER-275), démêlés par PORTÉE de la cible — les
 * deux portées n'obéissent pas aux mêmes règles d'affichage ni au même arbitrage :
 *  - `byAbility` : cible une caractéristique, donc TOUS ses tests (le test de carac nu comme
 *    chacun des domaines qu'elle gouverne). Même forme que le tatouage du barbare (p. 80) ;
 *  - `byDomain` : cible un domaine de compétence précis, donc lui seul.
 *
 * Aucune somme ici (contrairement aux caracs et aux stats dérivées) : ce sont des bonus de
 * magie, arbitrés au MAX par `resolveTestBonus`, qui a besoin du détail par objet pour
 * afficher les sources écartées. Périmètre : cf. `bonusSourcesFromEquipment`.
 *
 * Fonction pure, réutilisable telle quelle par l'écran de MJ.
 */
export function testBonusSourcesFromEquipment(
  equipment: EquipmentLine[] = [],
): ItemTestBonusSources {
  const all = bonusSourcesFromEquipment<ItemTestTarget>(
    equipment,
    'testBonuses',
    ITEM_TEST_TARGET_IDS,
  );
  const byAbility: Partial<Record<AbilityId, AbilityBonusItemSource[]>> = {};
  const byDomain: Partial<Record<string, AbilityBonusItemSource[]>> = {};
  for (const [target, sources] of Object.entries(all) as [string, AbilityBonusItemSource[]][]) {
    // Les deux espaces d'ids sont disjoints (caracs en majuscules) : l'appartenance à
    // `ABILITY_IDS` suffit à démêler la portée. Cf. `ItemTestTarget`.
    if ((ABILITY_IDS as readonly string[]).includes(target)) byAbility[target as AbilityId] = sources;
    else byDomain[target] = sources;
  }
  return { byAbility, byDomain };
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
