/**
 * ARME LIÉE (PER-74 — voie de l'arme liée, p. 147) : « Le personnage choisit une arme et se lie
 * avec l'objet par un rituel informel ». Tout ce que la voie accorde ne vaut QUE pour cette arme :
 * il faut donc un résolveur unique, pur, qui dise quelle LIGNE d'inventaire porte le lien.
 *
 * Le lien est un choix de CONSTRUCTION (`OwnedWeaponFeatureChoice`, puce orange) dont le domaine
 * n'est pas un catalogue figé mais l'inventaire du personnage — voir `boundWeaponSelectionValue`
 * pour la valeur persistée.
 */
import type { EquipmentItem, PrestigeCategory } from '@/data/schema';
import { featureById, pathById } from '@/data';
import type { Character, EquipmentLine } from './types';
import { isCustomItem } from './types';
import { effectiveItem } from './items';
import { wornMeleeWeaponLine, wornRangedWeaponLine } from './equipment';

/** Préfixe de la valeur persistée pour un objet LIBRE (hors catalogue), identifié par son nom. */
const CUSTOM_PREFIX = 'custom:';

/** Item EFFECTIF d'une ligne (surcharges de variante comprises), ou `undefined` hors catalogue. */
function lineItem(line: EquipmentLine): EquipmentItem | undefined {
  return isCustomItem(line) ? undefined : effectiveItem(line);
}

/** La ligne est-elle une ARME (catalogue ou variante) ? Les objets libres sont exclus. */
function isWeaponLine(line: EquipmentLine): boolean {
  return lineItem(line)?.category === 'weapon';
}

/** Nom affiché d'une ligne d'inventaire (nom de la variante le cas échéant). */
export function boundWeaponLabel(line: EquipmentLine): string {
  return isCustomItem(line) ? line.name : (lineItem(line)?.name ?? line.itemId);
}

/**
 * Valeur PERSISTÉE pour désigner une ligne : son `itemId` (ou `custom:<nom>` pour un objet libre).
 *
 * On s'en tient VOLONTAIREMENT à l'identifiant d'objet plutôt qu'à une référence de ligne
 * (`instanceId`) : la valeur reste lisible partout (le libellé se résout depuis le catalogue, sans
 * avoir à passer le personnage aux fonctions d'affichage) et aucune mutation de l'inventaire n'est
 * nécessaire à la sélection. Conséquence assumée : deux exemplaires de la MÊME arme ne sont pas
 * distingués — le lien porte sur le premier des deux. Sans effet de jeu (stats identiques), sauf si
 * l'un des deux est une variante enchantée : dans ce cas, lier l'arme voulue suppose de ne garder
 * qu'un exemplaire de cet `itemId` dans l'inventaire.
 */
export function boundWeaponSelectionValue(line: EquipmentLine): string {
  if (isCustomItem(line)) return `${CUSTOM_PREFIX}${line.name}`;
  return line.itemId;
}

/** Une option du sélecteur d'arme liée. */
export interface OwnedWeaponOption {
  /** Valeur persistée dans `featureChoices`. */
  value: string;
  /** Libellé affiché (nom de l'arme). */
  label: string;
  /** La ligne correspondante, pour l'appelant qui veut son état de port. */
  line: EquipmentLine;
}

/**
 * ARMES POSSÉDÉES proposables au lien, dans l'ordre de l'inventaire. Domaine du choix
 * `owned-weapon`. Les doublons de valeur (deux exemplaires du même `itemId`) sont FUSIONNÉS : ils
 * désigneraient la même ligne au résolveur, autant ne proposer qu'une entrée.
 */
export function ownedWeaponsForChoice(character: Character): OwnedWeaponOption[] {
  const seen = new Set<string>();
  const out: OwnedWeaponOption[] = [];
  for (const line of character.equipment ?? []) {
    if (!isWeaponLine(line)) continue;
    const value = boundWeaponSelectionValue(line);
    if (seen.has(value)) continue;
    seen.add(value);
    out.push({ value, label: boundWeaponLabel(line), line });
  }
  return out;
}

/**
 * Capacité ACQUISE portant le choix d'arme liée, et l'index de ce choix — `null` si le personnage
 * n'a aucune capacité de ce genre. Résolu depuis les données (aucun id en dur) : la première
 * capacité acquise dont un choix est de nature `owned-weapon`.
 */
export function boundWeaponChoiceHost(character: Character): { featureId: string; choiceIndex: number } | null {
  for (const id of character.featureIds) {
    const choices = featureById.get(id)?.choices;
    if (!choices) continue;
    const choiceIndex = choices.findIndex((c) => c.kind === 'owned-weapon');
    if (choiceIndex >= 0) return { featureId: id, choiceIndex };
  }
  return null;
}

/**
 * LIGNE d'inventaire de l'arme liée, ou `null` (aucune capacité porteuse, aucun choix fait, ou
 * arme retirée de l'inventaire depuis). Correspondance par `itemId` — première ligne trouvée — ou
 * par nom pour un objet libre (cf. `boundWeaponSelectionValue`).
 */
export function boundWeaponLine(character: Character): EquipmentLine | null {
  const host = boundWeaponChoiceHost(character);
  if (!host) return null;
  const selected = character.featureChoices?.[host.featureId]?.[host.choiceIndex];
  if (typeof selected !== 'string' || !selected) return null;
  const lines = (character.equipment ?? []).filter(isWeaponLine);
  if (selected.startsWith(CUSTOM_PREFIX)) {
    const name = selected.slice(CUSTOM_PREFIX.length);
    return lines.find((line) => isCustomItem(line) && line.name === name) ?? null;
  }
  return lines.find((line) => !isCustomItem(line) && line.itemId === selected) ?? null;
}

/** CETTE ligne est-elle l'arme liée ? (pose de la puce sur la bonne ligne d'inventaire). */
export function isBoundWeaponLine(character: Character, line: EquipmentLine): boolean {
  return boundWeaponLine(character) === line;
}

/**
 * VOIE qui s'est liée à CETTE ligne d'inventaire (nom + catégorie de prestige, pour la couleur de
 * la puce), ou `null` si la ligne n'est pas l'arme liée. Alimente la prop `resolveBoundWeapon`
 * d'`EquipmentList` : la puce « Arme liée » s'affiche donc aux couleurs de la voie qui l'accorde
 * (rouge pour un combattant).
 */
export function boundWeaponPathFor(
  character: Character,
  line: EquipmentLine,
): { pathName: string; category: PrestigeCategory | undefined } | null {
  if (!isBoundWeaponLine(character, line)) return null;
  const host = boundWeaponChoiceHost(character);
  const path = host ? pathById.get(featureById.get(host.featureId)?.pathId ?? '') : undefined;
  if (!path) return null;
  return {
    pathName: path.name,
    category: path.type === 'prestige' ? path.category : undefined,
  };
}

/**
 * L'arme liée est-elle TENUE EN MAIN, et sur quel MODE d'attaque compte-t-elle ? `'melee'` si elle
 * est l'arme de contact en main, `'ranged'` si elle est l'arme à distance en main, `null` si elle
 * n'est pas en main (ou si aucune arme n'est liée). Le contact prime pour une arme lançable tenue
 * en main, comme partout ailleurs (`wornMeleeWeaponLine` d'abord).
 */
export function boundWeaponWieldedScope(character: Character): 'melee' | 'ranged' | null {
  const bound = boundWeaponLine(character);
  if (!bound?.worn) return null;
  const equipment = character.equipment ?? [];
  if (wornMeleeWeaponLine(equipment) === bound) return 'melee';
  if (wornRangedWeaponLine(equipment) === bound) return 'ranged';
  return null;
}

/** Dé bonus en attaque conféré par l'arme liée, prêt pour la carte d'attaque du mode concerné. */
export interface BoundWeaponAttackDie {
  /** Capacité source (« Fidèle »), pour l'info-bulle du badge. */
  name: string;
  /** Mode d'attaque concerné, déduit de l'arme liée réellement en main. */
  scope: 'melee' | 'ranged';
}

/**
 * DÉ BONUS en attaque de l'arme liée (effet `bound-weapon-attack-die`, r4 « Fidèle ») — présent
 * SEULEMENT si l'arme liée est en main ET que la charge de la capacité n'est pas dépensée
 * (convention « absence = plein » des compteurs d'usage). Renvoie `null` sinon : le badge disparaît
 * de la carte d'attaque dès que le joueur décrémente le compteur, et revient à la recharge.
 *
 * Volontairement autonome (ne dépend pas de `effects.ts`) : la lecture du compteur se réduit ici à
 * la convention de stockage, sans avoir besoin du contexte d'effets.
 */
export function boundWeaponAttackDie(character: Character): BoundWeaponAttackDie | null {
  const scope = boundWeaponWieldedScope(character);
  if (!scope) return null;
  for (const id of character.featureIds) {
    const feature = featureById.get(id);
    if (!feature?.effects?.some((e) => e.kind === 'bound-weapon-attack-die')) continue;
    const counter = feature.usageCounter;
    if (counter) {
      const key = counter.sharedKey ?? feature.id;
      const max = typeof counter.max === 'number' ? counter.max : 1;
      const current = character.usageCounters?.[key] ?? max;
      if (current <= 0) continue;
    }
    return { name: feature.name, scope };
  }
  return null;
}

/**
 * ÉLÉMENT de l'aura imprégnée dans l'arme liée (effet `weapon-aura-elemental`, r7), choisi À LA
 * TABLE (`effectInputs`) — `null` si aucune capacité porteuse ou aucun élément retenu. Comme les
 * autres sélecteurs « à la table », l'absence de valeur vaut « aucune aura active ».
 */
export function boundWeaponAuraElement(character: Character): { featureId: string; element: string } | null {
  for (const id of character.featureIds) {
    const feature = featureById.get(id);
    const effect = feature?.effects?.find((e) => e.kind === 'weapon-aura-elemental');
    if (!effect || effect.kind !== 'weapon-aura-elemental') continue;
    const element = character.effectInputs?.[id];
    if (!element || !effect.choices.includes(element as (typeof effect.choices)[number])) continue;
    return { featureId: id, element };
  }
  return null;
}
