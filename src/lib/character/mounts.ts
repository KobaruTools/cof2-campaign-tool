/**
 * Montures & véhicules POSSÉDÉS (PER-216) — résolution des instances `Character.mounts` contre le
 * catalogue statique (`src/data/mounts.ts`). Module PUR (aucune dépendance UI) : source de vérité de
 * « quelles montures ce personnage possède-t-il, et avec quelles stats effectives ? », consommée par
 * la section « Compagnons » de la fiche.
 *
 * Une monture achetée n'a pas de voie porteuse (contrairement aux compagnons de `companions.ts`,
 * dérivés d'un rang de voie) : c'est une POSSESSION, ajoutée/retirée manuellement. Ses stats de combat
 * (quand elle en a) viennent d'un bloc `Creature` de catalogue, rendu tel quel par `BestiaryStatBlock`.
 */
import type { Creature, CreatureProfile } from '@/data/schema';
import { featureById } from '@/data';
import { bardeById, mountById, type BardeCatalogEntry, type MountCatalogEntry } from '@/data/mounts';
import { isEffectActive } from './effects';
import type { Character, Depletion, OwnedMount } from './types';

/** Entrée de catalogue d'une monture possédée (`undefined` si l'id de catalogue est inconnu). */
export function mountCatalogEntry(owned: OwnedMount): MountCatalogEntry | undefined {
  return mountById.get(owned.catalogId);
}

/**
 * Barde EFFECTIVEMENT portée : l'entrée de barde référencée, mais SEULEMENT si la monture est apte au
 * caparaçon (`canWearBarde`, cheval de guerre). `undefined` sinon (pas de barde, ou monture inapte).
 */
export function resolveBarde(owned: OwnedMount, entry: MountCatalogEntry | undefined): BardeCatalogEntry | undefined {
  if (!entry?.canWearBarde || !owned.bardeId) return undefined;
  return bardeById.get(owned.bardeId);
}

/**
 * Bloc de stats EFFECTIF d'une monture, barde appliquée : la barde ajoute son bonus à la DEF et
 * retranche le même montant à l'Initiative de la monture (règle p. 191/267). `undefined` si la
 * monture n'a pas de bloc de combat (bête de somme, véhicule). Le malus d'Init. du CAVALIER n'est
 * PAS traité ici (c'est un rappel affiché, non soustrait de l'Init. calculée du personnage — PER-216).
 */
export function resolveMountCreature(owned: OwnedMount, entry: MountCatalogEntry | undefined): Creature | undefined {
  const creature = entry?.creature;
  if (!creature) return undefined;
  const barde = resolveBarde(owned, entry);
  if (!barde) return creature;
  return {
    ...creature,
    defense: (creature.defense ?? 0) + barde.defBonus,
    initiative: (creature.initiative ?? 0) - barde.defBonus,
  };
}

/**
 * Adapte un `Creature` du bestiaire (stats FIXES numériques) en `CreatureProfile` (le modèle des
 * compagnons, à valeurs `richText`), afin de rendre une monture avec la MÊME carte compacte que les
 * autres compagnons (`CreatureStatBlock`). Les valeurs fixes deviennent des chaînes constantes (« 11 »)
 * — résolues telles quelles par `RichInline` (aucun terme `rang`/`niveau`, aucun dé évolutif). La
 * description du livre (ex. dé malus « en selle » du cheval de selle) passe en `note`.
 */
export function creatureToProfile(creature: Creature): CreatureProfile {
  const [attack, ...rest] = creature.attacks ?? [];
  return {
    name: creature.name,
    companionType: 'mount',
    size: creature.size,
    abilities: creature.abilities,
    bonusDieAbilities: creature.bonusDieAbilities,
    defense: creature.defense != null ? String(creature.defense) : undefined,
    hitPoints: creature.hitPoints != null ? String(creature.hitPoints) : undefined,
    initiative: creature.initiative != null ? String(creature.initiative) : undefined,
    attack: attack ? { label: attack.name, value: attack.bonus, damage: attack.damage } : undefined,
    extraAttacks: rest.length > 0 ? rest.map((a) => ({ label: a.name, damage: a.damage ?? '' })) : undefined,
    specialAbilities: creature.specialAbilities,
    note: creature.description,
  };
}

/** Nom affiché d'une monture : nom personnalisé du joueur, sinon nom de catalogue. */
export function mountDisplayName(owned: OwnedMount, entry: MountCatalogEntry | undefined): string {
  return owned.name?.trim() || entry?.name || 'Monture';
}

/**
 * PV MAXIMUM d'une monture (valeur fixe du bloc de stats). `null` si la monture n'a pas de PV (bête de
 * somme / véhicule) → pas de barre de vie. La barde ne modifie pas les PV.
 */
export function mountMaxHp(entry: MountCatalogEntry | undefined): number | null {
  return entry?.creature?.hitPoints ?? null;
}

/** Une monture résolue, prête à afficher (instance + catalogue + stats effectives). */
export interface ResolvedMount {
  /** Instance possédée (id, PV, barde retenue…). */
  owned: OwnedMount;
  /** Entrée de catalogue (nom, prix, note). `undefined` si l'id de catalogue est inconnu. */
  entry: MountCatalogEntry | undefined;
  /** Nom affiché (personnalisé ou catalogue). */
  displayName: string;
  /** Bloc de stats effectif (barde appliquée), ou `undefined` (sans stats de combat). */
  creature: Creature | undefined;
  /** Le même bloc adapté en `CreatureProfile`, pour le rendu compact « compagnon ». `undefined` = sans stats. */
  profile: CreatureProfile | undefined;
  /** Barde effectivement portée, ou `undefined`. */
  barde: BardeCatalogEntry | undefined;
  /** PV max (fixe), ou `null` (sans barre de vie). */
  maxHp: number | null;
}

/** Résout toutes les montures possédées du personnage, dans l'ordre de la liste. */
export function listOwnedMounts(mounts: OwnedMount[]): ResolvedMount[] {
  return mounts.map((owned) => {
    const entry = mountCatalogEntry(owned);
    const creature = resolveMountCreature(owned, entry);
    return {
      owned,
      entry,
      displayName: mountDisplayName(owned, entry),
      creature,
      profile: creature ? creatureToProfile(creature) : undefined,
      barde: resolveBarde(owned, entry),
      maxHp: mountMaxHp(entry),
    };
  });
}

/** Manque de PV d'une monture par id d'instance (`{}` = PV pleins). */
export function mountDepletion(owned: OwnedMount): Depletion {
  return owned.hp ?? {};
}

/**
 * Interrupteur « EN SELLE » d'une capacité de voie du personnage, s'il en possède une (chevalier :
 * Cavalier émérite `cavalier-r2`, effet `conditional-stat-bonus` d'activation « en selle »). Quand il
 * existe, cet interrupteur est la SOURCE DE VÉRITÉ unique de l'état « en selle » — la carte de voie ET
 * le toggle de la monture le pilotent, restant ainsi parfaitement synchronisés. On renvoie
 * `{ featureId, index }` du premier effet trouvé, ou `undefined` (personnage non cavalier → chaque
 * monture porte son propre état `OwnedMount.mounted`).
 */
export function enSelleLink(character: Character): { featureId: string; index: number } | undefined {
  for (const id of character.featureIds) {
    const feature = featureById.get(id);
    const effects = feature?.effects;
    if (!effects) continue;
    for (let i = 0; i < effects.length; i += 1) {
      const effect = effects[i];
      if (
        effect.kind === 'conditional-stat-bonus' &&
        effect.activation?.kind === 'condition' &&
        effect.activation.label === 'en selle'
      ) {
        return { featureId: id, index: i };
      }
    }
  }
  return undefined;
}

/**
 * L'état « en selle » d'une capacité de voie (`enSelleLink`) est-il actif ? `false` si le personnage
 * n'a pas de telle capacité. Sert d'état PARTAGÉ : montures possédées, monture de voie (compagnon) et
 * carte de voie lisent/écrivent le même interrupteur.
 */
export function isEnSelleActive(character: Character): boolean {
  const link = enSelleLink(character);
  return link ? isEffectActive(character, link.featureId, link.index) : false;
}

/**
 * Le personnage est-il EN SELLE sur cette monture ? Si une capacité « en selle » de voie existe
 * (`enSelleLink`), son interrupteur fait foi (état partagé) ; sinon on lit l'état propre à la monture
 * (`OwnedMount.mounted`).
 */
export function isMountMounted(character: Character, owned: OwnedMount): boolean {
  const link = enSelleLink(character);
  if (link) return isEffectActive(character, link.featureId, link.index);
  return owned.mounted === true;
}

/**
 * Malus d'Initiative subi par le CAVALIER du fait des bardes, à retrancher de l'Initiative calculée
 * de la fiche : somme des bonus de DEF des bardes portées par les montures sur lesquelles le
 * personnage est actuellement EN SELLE (le malus au cheval, lui, est permanent tant que la barde est
 * portée — appliqué au bloc de la monture, cf. `resolveMountCreature`). `0` à pied ou sans barde.
 */
export function mountedInitiativePenalty(character: Character): number {
  let penalty = 0;
  for (const owned of character.mounts) {
    const entry = mountCatalogEntry(owned);
    const barde = resolveBarde(owned, entry);
    if (barde && isMountMounted(character, owned)) penalty += barde.defBonus;
  }
  return penalty;
}
