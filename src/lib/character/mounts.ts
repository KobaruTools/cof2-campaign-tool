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
 * Le personnage est-il EN SELLE sur cette monture POSSÉDÉE ? = `Character.mountedKey` pointe sur elle.
 * `mountedKey` étant une clé UNIQUE, l'exclusivité (une seule monture en selle) est structurelle.
 */
export function isMountMounted(character: Character, owned: OwnedMount): boolean {
  return character.mountedKey === owned.id;
}

/**
 * Ids des OPTIONS de choix dont provient la monture actuellement CHEVAUCHÉE (PER-74) — `[]` à pied.
 * Sert les capacités dont le livre nomme une monture PRÉCISE : chevalier dragon r4, p. 147, « lorsqu'il
 * […] chevauche son drake » — monter un cheval de guerre ne déclenche rien, seul le drake compte. Voir
 * `EffectActivation.autoActiveWhenRidingOptionIds`, alimente `EffectContext.ridingOptionIds`.
 *
 * `mountedKey` désigne la monture en selle : pour un compagnon de VOIE, c'est l'id de la capacité
 * porteuse (ex. `cavalier-r5`, cf. `CompanionEntry.key`) — on remonte donc aux options retenues via
 * `featureChoices`. Pour une monture POSSÉDÉE (catalogue, PER-216) la clé est un id d'instance : aucune
 * option de voie derrière, donc `[]` — ce qui est correct, une monture achetée à l'écurie n'est pas le
 * drake de l'ordre.
 */
export function ridingMountOptionIds(character: Character): string[] {
  const key = character.mountedKey;
  if (!key) return [];
  // Clé composite d'un compagnon multi-instances (`<featureId>#<instanceId>`) : seul le featureId
  // porte les choix. Aucune monture du livre n'est multi-instances, mais la clé reste générique.
  const hash = key.indexOf('#');
  const featureId = hash < 0 ? key : key.slice(0, hash);
  if (!character.featureIds.includes(featureId)) return [];
  const out: string[] = [];
  for (const sel of character.featureChoices[featureId] ?? []) {
    if (Array.isArray(sel)) out.push(...sel.filter((id): id is string => typeof id === 'string'));
    else if (typeof sel === 'string' && sel) out.push(sel);
  }
  return out;
}

/**
 * Malus d'Initiative subi par le CAVALIER du fait de la barde, à retrancher de l'Initiative calculée
 * de la fiche : bonus de DEF de la barde de la monture actuellement CHEVAUCHÉE (le malus au cheval,
 * lui, est permanent tant que la barde est portée — appliqué au bloc via `resolveMountCreature`).
 * `0` à pied, sur une monture de voie, ou sans barde. Une seule monture montée → pas de cumul.
 */
export function mountedInitiativePenalty(character: Character): number {
  const owned = character.mounts.find((m) => m.id === character.mountedKey);
  if (!owned) return 0;
  const barde = resolveBarde(owned, mountCatalogEntry(owned));
  return barde ? barde.defBonus : 0;
}
