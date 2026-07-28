'use client';

/**
 * État de JEU d'un personnage (PER-257) : branche les actions PURES de
 * `src/lib/character/sheetActions.ts` sur le store, et expose la vue dérivée + les maxima dont
 * ces actions ont besoin. C'est le seul point de câblage entre la logique de jeu et React.
 *
 * Contrat, hérité des conventions de `sheetActions` :
 *  - **patch vide = aucune écriture** : une action dont le garde-fou n'est pas satisfait renvoie
 *    `{}` ; le persister appliquerait un `updatedAt` et déclencherait une écriture cloud inutile ;
 *  - **lecture seule** (session joueur consultant la fiche d'un colistier, PER-196) : toute
 *    écriture est neutralisée en amont, la RLS la refuserait de toute façon ;
 *  - les **maxima dérivés** (PV, mana, chance, dés de récupération) sont résolus ici une fois,
 *    puis injectés dans les actions qui en dépendent.
 *
 * Le hook renvoie `null` quand le personnage n'est pas (encore) chargé, pour rester appelable
 * INCONDITIONNELLEMENT en tête de composant, avant les retours anticipés de la fiche.
 *
 * Ce qui n'est PAS ici : les setters du mode « Modifier » (caractéristiques, identité, capacités,
 * surcharges, statut, attribution) — ils restent dans la fiche, avec `update`.
 */
import * as actions from '@/lib/character/sheetActions';
import type { UseItemIntent } from '@/lib/character/sheetActions';
import { capacityResourceGauges, type CapacityResourceGauge } from '@/lib/character/effects';
import type { Character, Purse, WornState } from '@/lib/character/types';
import type { StartingEquipmentChoiceOption } from '@/data/schema';
import { deriveStats, type DerivedStats } from '@/lib/engine';
import { useCharactersStore } from '@/stores/characters';
import { buildCharacterDerivedView, type CharacterDerivedView } from './characterDerivedView';

export interface CharacterGameState {
  /**
   * Sauvegarde permissive : chaque modification persiste immédiatement (le store applique
   * `updatedAt`). Aucun écart aux règles n'est empêché (PER-45). Sert aussi aux setters d'édition
   * restés dans la fiche. Sans effet en lecture seule, ou si le correctif est vide.
   */
  update: (patch: Partial<Character>) => void;
  /** Vue dérivée partagée avec l'écran de MJ (entrée moteur + badges) — cf. `buildCharacterDerivedView`. */
  derived: CharacterDerivedView;
  /**
   * Stats dérivées finales du MAÎTRE (modificateurs inclus), avec surcharges manuelles pour les
   * stats recopiées par les profils de créature (Init., attaque magique). `undefined` si le profil
   * est incomplet (pas d'entrée moteur).
   */
  masterDerived: DerivedStats | undefined;
  /** PV max EFFECTIFS (surcharge manuelle ?? dérivé) ; `undefined` si profil incomplet. */
  maxHp: number | undefined;
  /** Réserve de mana EFFECTIVE ; `null` = aucun sort connu, donc pas de jauge (PER-149). */
  manaMax: number | null;
  /** Points de chance max EFFECTIFS (PER-155). */
  luckMax: number;
  /** Dés de récupération max EFFECTIFS et type de dé du personnage (PER-151). */
  recoveryDiceMax: number;
  recoveryDie: DerivedStats['recoveryDie'];
  /** Ressources de capacité (rage, sept vies…) surfacées en jauges (PER-150). */
  capacityGauges: CapacityResourceGauge[];
  /** Doses d'élixir qu'un repos long ferait perdre (voie des élixirs, p. 98) — avertissement. */
  elixirDosesToLose: number;

  // --- Interrupteurs, compteurs, verrous, élixirs -------------------------------------------
  setEffectToggleValue: (featureId: string, index: number, active: boolean) => void;
  setEffectInputValue: (featureId: string, value: string) => void;
  setUsageCounterValue: (counterKey: string, value: number, max: number) => void;
  liftShortRestLock: (featureId: string) => void;
  createElixir: (counterKey: string, cost: number, max: number, elixirName: string) => void;

  // --- Objets & équipement porté -----------------------------------------------------------
  /**
   * Clic « Utiliser » sur une ligne : consomme directement quand c'est possible, et renvoie
   * l'INTENTION pour que la fiche ouvre la modale requise (bourse de départ, choix « X ou Y »).
   */
  applyItemUse: (index: number) => UseItemIntent;
  openCoinPouch: (index: number, silver: number) => void;
  resolveStartingChoice: (index: number, option: StartingEquipmentChoiceOption) => void;
  setWorn: (index: number, worn: WornState | undefined) => void;
  setPurse: (purse: Purse) => void;

  // --- Jauges du personnage & repos --------------------------------------------------------
  setHpDamage: (amount: number, kind: 'lethal' | 'temp') => void;
  setHpHeal: (amount: number) => void;
  setHpReset: () => void;
  setManaSpend: (amount: number) => void;
  setManaRestore: (amount: number) => void;
  setManaReset: () => void;
  setLuckSpend: (amount: number) => void;
  setLuckRestore: (amount: number) => void;
  setLuckReset: () => void;
  setDrCurrent: (value: number) => void;
  doShortRest: (recoveryDieRoll: number | null) => void;
  doLongRest: (heal: boolean) => void;

  // --- Compagnons (PER-233 / PER-235) ------------------------------------------------------
  setCompanionDamage: (key: string, amount: number, kind: 'lethal' | 'temp') => void;
  setCompanionHeal: (key: string, amount: number) => void;
  setCompanionReset: (key: string) => void;
  summonCompanionInstance: (featureId: string) => void;
  deleteCompanionInstance: (key: string) => void;

  // --- Montures & véhicules possédés (PER-216) ---------------------------------------------
  addMount: (catalogId: string) => void;
  removeMount: (id: string) => void;
  setMountBarde: (id: string, bardeId: string | undefined) => void;
  setMountDamage: (id: string, amount: number, kind: 'lethal' | 'temp') => void;
  setMountHeal: (id: string, amount: number) => void;
  setMountReset: (id: string) => void;
  setMountMounted: (id: string, on: boolean) => void;
  /** Mutateur central « en selle » : clé unique, donc exclusivité structurelle. `null` = à pied. */
  setMountedTarget: (key: string | null) => void;
}

/**
 * Câble l'état de jeu du personnage `character` sur le store. `readOnly` neutralise toute
 * écriture. Renvoie `null` tant que le personnage n'est pas chargé.
 */
export function useCharacterGameState(
  character: Character | undefined,
  options: { readOnly?: boolean } = {},
): CharacterGameState | null {
  const upsert = useCharactersStore((s) => s.upsert);
  if (!character) return null;
  // Copie `const` : conserve le narrowing de `character` dans les fermetures ci-dessous.
  const target: Character = character;
  const readOnly = options.readOnly ?? false;

  const update = (patch: Partial<Character>) => {
    if (readOnly) return;
    // Garde-fou du contrat de `sheetActions` : un correctif vide signifie « ne rien écrire ».
    if (Object.keys(patch).length === 0) return;
    upsert({ ...target, ...patch });
  };
  /** Branche une action pure sur le store : `character` en 1er argument, patch persisté. */
  const bind =
    <A extends unknown[]>(action: (c: Character, ...args: A) => Partial<Character>) =>
    (...args: A) =>
      update(action(target, ...args));

  const derived = buildCharacterDerivedView(target);
  // Stats finales du maître : surcharges manuelles pour les stats recopiées par les profils de
  // créature (Init., attaque magique), comme les mini-fiches de compagnons les attendent.
  const masterDerived = derived.derivedInput
    ? (() => {
        const s = deriveStats(derived.derivedInput);
        const ov = target.overrides;
        return { ...s, initiative: ov.initiative ?? s.initiative, magicAttack: ov.magicAttack ?? s.magicAttack };
      })()
    : undefined;
  const maxHp = target.overrides.maxHp ?? masterDerived?.maxHp;
  const manaMax = masterDerived ? target.overrides.manaPoints ?? masterDerived.manaPoints : null;
  const luckMax = masterDerived ? target.overrides.luckPoints ?? masterDerived.luckPoints : 0;
  const recoveryDiceMax = masterDerived
    ? target.overrides.recoveryDiceCount ?? masterDerived.recoveryDiceCount
    : 0;
  const recoveryDie = masterDerived?.recoveryDie ?? 'd6';

  return {
    update,
    derived,
    masterDerived,
    maxHp,
    manaMax,
    luckMax,
    recoveryDiceMax,
    recoveryDie,
    capacityGauges: capacityResourceGauges(target),
    elixirDosesToLose: actions.elixirDosesToLose(target),

    setEffectToggleValue: bind(actions.toggleEffect),
    setEffectInputValue: bind(actions.setEffectInput),
    setUsageCounterValue: bind(actions.setUsageCounter),
    liftShortRestLock: bind(actions.liftShortRestLock),
    createElixir: (counterKey, cost, max, elixirName) =>
      update(actions.createElixir(target, { counterKey, cost, max, elixirName })),

    applyItemUse: (index) => {
      const intent = actions.useEquipmentItem(target, index);
      if (intent.kind === 'consume') update(intent.patch);
      return intent;
    },
    openCoinPouch: bind(actions.openCoinPouch),
    resolveStartingChoice: bind(actions.resolveStartingChoice),
    setWorn: bind(actions.setEquipmentWorn),
    setPurse: (purse) => update(actions.setPurse(purse)),

    setHpDamage: (amount, kind) => update(actions.damageCharacterHp(target, amount, kind, maxHp)),
    setHpHeal: bind(actions.healCharacterHp),
    setHpReset: bind(actions.resetCharacterHp),
    // Un personnage sans sort n'a pas de jauge de mana (`manaMax` nul) : max effectif 0.
    setManaSpend: (amount) => update(actions.spendCharacterMana(target, amount, manaMax ?? 0)),
    setManaRestore: (amount) => update(actions.restoreCharacterMana(target, amount, manaMax ?? 0)),
    setManaReset: bind(actions.resetCharacterMana),
    setLuckSpend: (amount) => update(actions.spendCharacterLuck(target, amount, luckMax)),
    setLuckRestore: (amount) => update(actions.restoreCharacterLuck(target, amount, luckMax)),
    setLuckReset: bind(actions.resetCharacterLuck),
    setDrCurrent: (value) => update(actions.setAvailableRecoveryDice(target, value, recoveryDiceMax)),
    doShortRest: (recoveryDieRoll) =>
      update(actions.applyShortRest(target, recoveryDieRoll, recoveryDiceMax)),
    doLongRest: (heal) => update(actions.applyLongRest(target, heal, recoveryDie)),

    setCompanionDamage: bind(actions.damageCompanion),
    setCompanionHeal: bind(actions.healCompanion),
    setCompanionReset: bind(actions.resetCompanionHp),
    summonCompanionInstance: (featureId) => update(actions.summonCompanionInstance(target, featureId)),
    deleteCompanionInstance: bind(actions.removeCompanionInstance),

    addMount: (catalogId) => update(actions.addMount(target, catalogId)),
    removeMount: bind(actions.removeMount),
    setMountBarde: bind(actions.setMountBarde),
    setMountDamage: bind(actions.damageMount),
    setMountHeal: bind(actions.healMount),
    setMountReset: bind(actions.resetMountHp),
    setMountMounted: bind(actions.setMountMounted),
    setMountedTarget: bind(actions.setMountedTarget),
  };
}
