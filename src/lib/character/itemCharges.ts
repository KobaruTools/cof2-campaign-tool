/**
 * OBJETS À CHARGES (PER-294) — module pur, sans aucune dépendance au catalogue ni à l'UI.
 *
 * Généralisation LIBRE du chargement des armes (`weaponLoading.ts`) à n'importe quel objet de
 * l'inventaire : une baguette de cinq charges, un sceptre à trois utilisations par jour, un
 * talisman qu'on épuise puis qui se recharge d'une nuit. On dépense avec « Utiliser », on remplit
 * avec « Recharger », et le repos peut faire le plein tout seul selon le réglage de l'objet.
 *
 * RÈGLE MAISON ASSUMÉE, sans page source : le livre de base ne décrit aucun objet à charges — il
 * n'a pas de catalogue d'objets magiques (les seuls objets à doses de l'application, les élixirs
 * du forgesort, sont des LIGNES d'inventaire matérialisées, cf. `elixirs.ts`, pas des charges).
 * Ce module ne modélise donc aucune règle CO2 : c'est un support de saisie pour ce que le meneur
 * de jeu invente à sa table.
 *
 * Trois écarts volontaires au modèle des munitions, qui justifient un module séparé plutôt qu'une
 * extension de `weaponLoading.ts` :
 *  - les charges sont toutes IDENTIQUES (aucune nature à annoncer, cf. `LoadedAmmunitionKind`) ;
 *  - la capacité est SAISIE sur l'objet, pas dérivée du catalogue et des capacités du personnage
 *    (`weaponCapacity`) — d'où l'absence de tout contexte de personnage ici ;
 *  - le rechargement au repos est RÉGLABLE par objet, là où une arme repart toujours à plein.
 *
 * Conventions reprises telles quelles du chargement des armes :
 *  - **ABSENT = PLEIN** (`chargesSpent` non écrit) : un objet au repos ne traîne aucune donnée ;
 *  - **normalisation au point de lecture** (`itemChargeState`), seul endroit qui tolère une forme
 *    inattendue — l'inventaire peut venir d'un `localStorage` écrit par une version antérieure,
 *    d'un import JSON ou d'un cloud partagé, et la fiche est permissive ;
 *  - les réducteurs renvoient la **MÊME référence** quand il n'y a rien à faire, ce qui vaut
 *    « aucune écriture » par contrat pour l'appelant (cf. `sheetActions`).
 */
import type { EquipmentLine, ItemCharges } from './types';

/**
 * Au-delà de ce nombre de charges, l'affichage retombe sur le seul décompte « N/M » : des
 * pastilles innombrables ne renseignent plus (même seuil que les munitions d'une arme).
 */
export const MAX_CHARGE_DOTS = 12;

/** État de charges d'un objet — tout ce dont l'affichage et les gestes ont besoin. */
export interface ItemChargeState {
  /** Charges de l'objet plein (entier ≥ 1). */
  max: number;
  /** Charges dépensées, bornées à `max`. */
  spent: number;
  /** Charges encore disponibles (`max - spent`). */
  remaining: number;
  /** L'objet est-il plein (rien à recharger) ? */
  full: boolean;
  /** L'objet est-il épuisé (plus rien à dépenser) ? */
  empty: boolean;
  /** L'objet se remet-il à plein au repos COURT ? */
  onShortRest: boolean;
  /** L'objet se remet-il à plein au repos LONG ? */
  onLongRest: boolean;
}

/**
 * Nombre de charges de l'objet plein, ou `null` si la ligne n'a pas de charges du tout. Point de
 * lecture UNIQUE du maximum : tolère un champ absent, un maximum nul, négatif, fractionnaire ou
 * non numérique (tous traités comme « pas de charges »), plutôt que de casser le rendu de la fiche.
 */
function normalizeMax(charges: ItemCharges | undefined): number | null {
  const max = charges?.max;
  if (typeof max !== 'number' || !Number.isFinite(max)) return null;
  const floored = Math.floor(max);
  return floored >= 1 ? floored : null;
}

/**
 * État de charges d'une ligne d'inventaire, ou `null` si elle n'a pas de charges (le cas de la
 * quasi-totalité de l'inventaire). Fonctionne indifféremment sur une référence au catalogue et sur
 * un objet libre : les charges sont une propriété d'INSTANCE, portée par les deux.
 *
 * Les charges dépensées sont bornées à `max`, ce qui rend inoffensive une BAISSE du maximum sur un
 * objet à moitié vide (une baguette 5/8 ramenée à 3 charges se lit 0/3, pas -2/3) — sans rien
 * réécrire : la donnée en trop est simplement ignorée, comme les munitions en excès d'un chargeur
 * retiré (`normalizeShots`).
 */
export function itemChargeState(line: EquipmentLine): ItemChargeState | null {
  const max = normalizeMax(line.charges);
  if (max === null) return null;
  const raw = line.chargesSpent;
  const spent =
    typeof raw === 'number' && Number.isFinite(raw)
      ? Math.min(Math.max(0, Math.floor(raw)), max)
      : 0;
  return {
    max,
    spent,
    remaining: max - spent,
    full: spent === 0,
    empty: spent >= max,
    onShortRest: line.charges?.onShortRest === true,
    onLongRest: line.charges?.onLongRest === true,
  };
}

/** La ligne porte-t-elle des charges ? (Raccourci de lecture pour l'affichage et les garde-fous.) */
export function hasItemCharges(line: EquipmentLine): boolean {
  return normalizeMax(line.charges) !== null;
}

/**
 * Écrit les charges dépensées en gardant la représentation CANONIQUE : un objet PLEIN s'écrit par
 * l'ABSENCE du champ, pour qu'un personnage au repos ne traîne aucune donnée de charge (et qu'un
 * export de fiche reste lisible). Toute autre valeur est écrite telle quelle.
 */
function withSpent(line: EquipmentLine, spent: number): EquipmentLine {
  const next: EquipmentLine = { ...line };
  if (spent <= 0) delete next.chargesSpent;
  else next.chargesSpent = spent;
  return next;
}

/** Remplace la ligne `index` par `line`. */
function replaceLine(
  equipment: EquipmentLine[],
  index: number,
  line: EquipmentLine,
): EquipmentLine[] {
  const next = [...equipment];
  next[index] = line;
  return next;
}

/**
 * UTILISER : dépense UNE charge. Renvoie l'équipement inchangé (même référence) si la ligne n'a pas
 * de charges ou est déjà épuisée — un objet à charges n'est JAMAIS supprimé quand il s'épuise,
 * contrairement à un consommable (`useEquipmentItem`) : il attend d'être rechargé.
 */
export function spendItemCharge(equipment: EquipmentLine[], index: number): EquipmentLine[] {
  const line = equipment[index];
  if (!line) return equipment;
  const state = itemChargeState(line);
  if (!state || state.empty) return equipment;
  return replaceLine(equipment, index, withSpent(line, state.spent + 1));
}

/**
 * RECHARGER : rend UNE charge. Renvoie l'équipement inchangé si la ligne n'a pas de charges ou est
 * déjà pleine. Toujours disponible, quelle que soit la politique de rechargement automatique : le
 * réglage « au repos » est un CONFORT, il ne retire pas le geste manuel.
 */
export function restoreItemCharge(equipment: EquipmentLine[], index: number): EquipmentLine[] {
  const line = equipment[index];
  if (!line) return equipment;
  const state = itemChargeState(line);
  if (!state || state.full) return equipment;
  return replaceLine(equipment, index, withSpent(line, state.spent - 1));
}

/** FAIRE LE PLEIN : rend toutes les charges d'un coup. Inchangé si l'objet est déjà plein. */
export function refillItemCharges(equipment: EquipmentLine[], index: number): EquipmentLine[] {
  const line = equipment[index];
  if (!line) return equipment;
  const state = itemChargeState(line);
  if (!state || state.full) return equipment;
  return replaceLine(equipment, index, withSpent(line, 0));
}

/** Nature du repos qui déclenche un rechargement automatique. */
export type RestKind = 'short' | 'long';

/**
 * Cet objet se recharge-t-il à CE repos ? Un objet marqué « au repos court » repart aussi à plein au
 * repos LONG : une nuit complète fait au moins ce qu'une pause de trente minutes fait. L'inverse est
 * faux — c'est tout l'intérêt de deux réglages distincts.
 */
function rechargesOnRest(state: ItemChargeState, rest: RestKind): boolean {
  return rest === 'short' ? state.onShortRest : state.onShortRest || state.onLongRest;
}

/**
 * Remet à plein tous les objets que CE repos recharge (`rest.ts`, appliqué aux deux repos). Les
 * objets sans réglage ne bougent pas : ils ne se rechargent qu'à la main, ce qui est le sens même de
 * l'option « manuellement uniquement ».
 *
 * Renvoie la MÊME référence si aucun objet n'était à recharger, pour que le patch de repos ne se
 * « mixe » pas inutilement avec de l'équipement (cf. PER-266) — même contrat que `reloadAllToFull`.
 */
export function rechargeItemsOnRest(
  equipment: EquipmentLine[],
  rest: RestKind,
): EquipmentLine[] {
  const needsWork = (line: EquipmentLine) => {
    const state = itemChargeState(line);
    return state !== null && state.spent > 0 && rechargesOnRest(state, rest);
  };
  if (!equipment.some(needsWork)) return equipment;
  return equipment.map((line) => (needsWork(line) ? withSpent(line, 0) : line));
}
