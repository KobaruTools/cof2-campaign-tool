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
import { useEffect } from 'react';

import * as actions from '@/lib/character/sheetActions';
import type { UseItemIntent } from '@/lib/character/sheetActions';
import { containsGameStateKey } from '@/lib/character/gameState';
import {
  capacityResourceGauges,
  isEffectActive,
  restRecoveryDieHealBonuses,
  type CapacityResourceGauge,
  type RestRecoveryHealBonus,
} from '@/lib/character/effects';
import { withSupersededBuffTogglesOff } from '@/lib/character/groupBuffs';
import {
  crystalsHeldByOthers,
  toggleCrystalActive,
  withAssignedCrystalsOff,
  withReceivedCrystals,
} from '@/lib/character/crystals';
import {
  HAWK_HUNTER_CUSTOM_CREATURE,
  HAWK_HUNTER_FEATURE_ID,
  HAWK_HUNTER_TOGGLE_INDEX,
} from '@/lib/character/majorSummoningPath';
import type { Character, LoadedAmmunitionKind, Purse, WornState } from '@/lib/character/types';
import { loadingContext, type LoadingContext } from '@/lib/character/weaponLoading';
import type { StartingEquipmentChoiceOption } from '@/data/schema';
import { deriveStats, type DerivedStats } from '@/lib/engine';
import { addCustomCreatures } from '@/lib/session/combatState';
import { useCampaignCombatStore } from '@/stores/campaignCombat';
import { useCharactersStore } from '@/stores/characters';
import { useCrystalAssignmentStore } from '@/stores/crystalAssignment';
import { useMountPassengerAssignmentStore } from '@/stores/mountPassengerAssignment';
import { useIsPlayerSession } from '@/lib/supabase/useIsPlayerSession';
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
   * Personnage tel que les CALCULS le voient (PER-314) : identique à celui passé au hook, sauf en
   * séance où les interrupteurs supplantés par un buff de groupe posé par le MJ sont éteints. À
   * utiliser pour toute dérivation d'affichage supplémentaire (`buildSheetDisplayView`), JAMAIS pour
   * écrire — les écritures visent le personnage réel, dont les interrupteurs gardent leur valeur.
   */
  derivedCharacter: Character;
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
  /** (Dés)active un cristal APPRIS (voie des cristaux, PER-74, p. 156) — état de jeu, hors mode édition. */
  setActiveCrystal: (crystalId: string, active: boolean) => void;
  /**
   * Le personnage REND un cristal qu'on lui avait confié (PER-360) : la puce quitte sa fiche et le
   * cristal retourne, éteint, chez le mage qui l'a fabriqué. Sans effet en lecture seule.
   */
  releaseCrystal: (crystalId: string) => void;
  /**
   * Le personnage DESCEND d'une monture invoquée où il montait en passager (PER-363, retour de
   * recette). Rien à écrire sur sa propre fiche (aucun champ ne l'y liait) : tout passe par l'état de
   * combat, dont le MJ est l'auteur unique. Sans effet en lecture seule.
   */
  releaseMountPassenger: () => void;

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
  /**
   * Gestes de chargement d'une arme (PER-284) : tirer un coup, en recharger un (`kind` déclare la
   * grenaille, annoncée au chargement, p. 63), ou faire le plein d'un chargeur / second canon.
   * État de jeu → disponibles hors mode « Modifier », synchronisés en session comme le porté.
   */
  fireWeaponShot: (index: number) => void;
  loadWeaponShot: (index: number, kind?: LoadedAmmunitionKind) => void;
  refillWeaponShots: (index: number, kind?: LoadedAmmunitionKind) => void;
  /** Contexte de chargement (capacité d'un chargeur pour CE personnage), pour l'affichage. */
  weaponLoading: LoadingContext;
  /**
   * Gestes de charge d'un objet (PER-294) : dépenser une charge, en rendre une, faire le plein.
   * Même nature que les gestes de chargement d'arme — état de jeu, donc hors mode « Modifier » et
   * synchronisés en session. Un objet à charges épuisé n'est JAMAIS retiré de l'inventaire.
   */
  spendItemCharge: (index: number) => void;
  restoreItemCharge: (index: number) => void;
  refillItemCharges: (index: number) => void;
  /** Ajoute un objet OCTROYÉ par une capacité et absent de l'inventaire (PER-286). */
  addGrantedEquipment: (itemId: string) => void;
  /**
   * Don d'un objet à un AUTRE personnage de la campagne, sans validation du MJ (PER-388).
   * `index`/`quantity` désignent la ligne du DONNEUR ; `receiverId` le destinataire. Async : lève
   * en cas d'échec (objet porté, quantité invalide, RPC refusée) — l'appelant affiche l'erreur.
   * No-op en lecture seule.
   */
  giveItem: (index: number, quantity: number, receiverId: string) => Promise<void>;

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
  /** `extraHeal` = soin bonus par DR (Survie « en milieu naturel », dés déjà lancés+sommés) ; 0 par défaut. */
  doShortRest: (recoveryDieRoll: number | null, extraHeal?: number) => void;
  doLongRest: (heal: boolean, extraHeal?: number) => void;
  /**
   * Bonus de soin par DR ACTIFS (interrupteur ON) que la modale de repos doit proposer à saisir
   * (Survie native ou empruntée). Vide → repos standard sans bonus.
   */
  recoveryHealBonuses: RestRecoveryHealBonus[];

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
 *
 * `sessionStatusIds` = les états que le MJ a posés sur ce personnage pendant une session ACTIVE
 * (l'appelant tient déjà cette liste, cf. `appliedStatuses` de la fiche ; le hook ne lit pas la
 * session lui-même pour ne pas doubler le poll de `useActiveSession`). Ils SUPPLANTENT les
 * interrupteurs de fiche des buffs de groupe correspondants (PER-314), sans quoi le porteur
 * compterait son propre bonus deux fois.
 */
export function useCharacterGameState(
  character: Character | undefined,
  options: { readOnly?: boolean; sessionStatusIds?: readonly string[] } = {},
): CharacterGameState | null {
  const upsert = useCharactersStore((s) => s.upsert);
  const applyGameState = useCharactersStore((s) => s.applyGameState);
  const giveItemAction = useCharactersStore((s) => s.giveItem);
  // Cristaux que CE personnage a confiés à d'autres (PER-360) : ils sortent de son calcul, leur effet
  // jouant désormais sur le porteur. Carte locale (jamais persistée) : c'est la couche OPTIMISTE, qui
  // fait quitter le bonus de la fiche à l'instant du clic, sans attendre l'aller-retour par le MJ.
  const crystalAssignments = useCrystalAssignmentStore((s) =>
    character ? (s.byCharacter[character.id] ?? null) : null,
  );
  // …et l'ÉTAT PARTAGÉ, qui fait foi (leçon de PER-358) : un cristal posé sur un AUTRE combattant
  // n'est plus sur moi, même après un rechargement de page qui aurait vidé la carte locale. Sans
  // cela, le bonus recompterait chez son propriétaire ET chez son porteur.
  //
  // Le rapprochement se fait sur l'id du cristal, seule information que porte l'état posé : si deux
  // mages de la voie avaient le MÊME cristal actif et que l'un le confiait, l'autre le perdrait aussi
  // de son calcul. Cas d'école à une table où les voies de prestige ne se dupliquent pas.
  const campaignStatuses = useCampaignCombatStore((s) =>
    character?.campaignId ? s.byCampaign[character.campaignId]?.statuses : undefined,
  );
  // Ce client est-il celui du MJ ? Un client ne reçoit PAS ses propres broadcasts : si le MJ (qui
  // consulte volontiers la fiche d'un joueur) annonçait une attribution de cristal, personne ne
  // l'exécuterait. Il l'exécute donc lui-même — cf. `stores/crystalAssignment`.
  const { isPlayer } = useIsPlayerSession();
  const syncCrystalAssignments = useCrystalAssignmentStore((s) => s.syncActive);
  // Un cristal ÉTEINT n'a plus d'attribution : sans cette purge, le rallumer le renverrait aussitôt
  // à son ancien porteur (carte locale prioritaire sur l'état partagé). Couvre les deux extinctions
  // qui ne viennent pas d'un clic sur le sélecteur : le porteur qui rend le cristal (le patch arrive
  // du MJ par le canal) et la désactivation depuis la modale.
  const activeCrystalKey = (character?.activeCrystalIds ?? []).join('|');
  const characterId = character?.id;
  useEffect(() => {
    if (!characterId) return;
    syncCrystalAssignments(characterId, activeCrystalKey === '' ? [] : activeCrystalKey.split('|'));
  }, [characterId, activeCrystalKey, syncCrystalAssignments]);
  if (!character) return null;
  // Copie `const` : conserve le narrowing de `character` dans les fermetures ci-dessous.
  const target: Character = character;
  const readOnly = options.readOnly ?? false;

  const update = (patch: Partial<Character>) => {
    if (readOnly) return;
    // Garde-fou du contrat de `sheetActions` : un correctif vide signifie « ne rien écrire ».
    if (Object.keys(patch).length === 0) return;
    // Aiguillage PER-266 : dès que le patch touche une clé d'état de jeu (même mixte, ex. repos long
    // avec perte d'élixirs = depletion… + equipment, ou `createElixir` = usageCounters + equipment),
    // il passe par `applyGameState` — qui, EN SESSION, diffuse la part état de jeu en direct et
    // persiste le reste par le verrou ; hors session, retombe sur le flush verrouillé. Un patch de
    // construction PURE (nom, identité, caractéristiques…) garde `upsert`.
    if (containsGameStateKey(patch)) applyGameState(target, patch);
    else upsert({ ...target, ...patch });
  };
  /** Branche une action pure sur le store : `character` en 1er argument, patch persisté. */
  const bind =
    <A extends unknown[]>(action: (c: Character, ...args: A) => Partial<Character>) =>
    (...args: A) =>
      update(action(target, ...args));

  // Le CALCUL part du personnage vu par la séance (PER-314) : un buff de groupe posé par le MJ
  // éteint l'interrupteur de fiche qui porte le même bonus, pour ne le compter qu'une fois. Copie
  // locale et jamais persistée — `target` reste la cible de toutes les écritures ci-dessous, si bien
  // que l'interrupteur du joueur reprend la main dès la fin de la séance.
  //
  // S'y ajoutent les deux faces de l'attribution d'un cristal (PER-360, p. 156) : le mage perd de son
  // calcul les cristaux qu'il a CONFIÉS, et tout personnage gagne ceux qu'on lui a confiés — lus sur
  // les états de combat posés sur lui, l'état partagé faisant foi pour tout ce qui vient d'autrui.
  const derivedTarget = withReceivedCrystals(
    withAssignedCrystalsOff(
      withSupersededBuffTogglesOff(target, options.sessionStatusIds ?? []),
      crystalsHeldByOthers(campaignStatuses, target.id, crystalAssignments),
    ),
    options.sessionStatusIds ?? [],
  );
  const derived = buildCharacterDerivedView(derivedTarget);
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
    derivedCharacter: derivedTarget,
    masterDerived,
    maxHp,
    manaMax,
    luckMax,
    recoveryDiceMax,
    recoveryDie,
    capacityGauges: capacityResourceGauges(target),
    elixirDosesToLose: actions.elixirDosesToLose(target),

    // Chasseur ailé (PER-363, r7, p. 160) : cet interrupteur n'est PAS un toggle de compagnon (le
    // chasseur est un ADVERSAIRE, jamais affiché sur la fiche — `CreatureProfile.summonedEnemy`) :
    // l'activer AJOUTE la créature comme ENNEMIE dans l'écran de combat, réservé au MJ (la fiche
    // désactive déjà le contrôle pour un joueur, `FeaturesByPath.tsx` — `!isPlayer` ici n'est qu'une
    // garde de second rang, la RLS `campaign_combat` refuserait l'écriture de toute façon). Seule la
    // transition INACTIF → ACTIF déclenche l'ajout (réactiver un interrupteur déjà actif ne duplique
    // pas la créature) ; désactiver ne retire rien du combat — une fois engagée, la créature est gérée
    // comme n'importe quel adversaire depuis le tracker, plus depuis cet interrupteur.
    setEffectToggleValue: (featureId, index, active) => {
      if (
        featureId === HAWK_HUNTER_FEATURE_ID &&
        index === HAWK_HUNTER_TOGGLE_INDEX &&
        active &&
        !isPlayer &&
        target.campaignId &&
        !isEffectActive(target, featureId, index)
      ) {
        useCampaignCombatStore
          .getState()
          .applyLocalCombat(target.campaignId, (prev) =>
            addCustomCreatures(prev, HAWK_HUNTER_CUSTOM_CREATURE, { side: 'enemy', name: 'Chasseur ailé' }),
          );
      }
      update(actions.toggleEffect(target, featureId, index, active));
    },
    setEffectInputValue: bind(actions.setEffectInput),
    setUsageCounterValue: bind(actions.setUsageCounter),
    liftShortRestLock: bind(actions.liftShortRestLock),
    // Désactiver un cristal le reprend à son porteur (PER-360) : « activer ou désactiver un cristal »
    // éteint son effet où qu'il tourne (p. 156). L'annonce part AVANT l'écriture, pour que le MJ lève
    // la puce même si la persistance du personnage échoue.
    setActiveCrystal: (crystalId, active) => {
      if (!active && !readOnly) {
        useCrystalAssignmentStore
          .getState()
          .assign(target.campaignId, target.id, crystalId, null, !isPlayer);
      }
      update(toggleCrystalActive(target, crystalId, active));
    },
    // Le PORTEUR rend un cristal qu'on lui avait confié (PER-360) : il ne lui appartient pas, il
    // repart chez son propriétaire — éteint, la remise en service coûtant une action limitée (p. 156).
    // Rien à écrire ici : le cristal ne figure pas sur la fiche du porteur, seulement dans l'état de
    // combat, dont le MJ est l'auteur unique.
    releaseCrystal: (crystalId) => {
      if (readOnly) return;
      useCrystalAssignmentStore
        .getState()
        .release(target.campaignId, crystalId, target.id, !isPlayer);
    },
    // Le passager descend (PER-363) : rien à écrire sur sa fiche (aucun champ ne l'y liait), tout
    // passe par l'état de combat — même patron que `releaseCrystal`, en plus simple (pas d'extinction
    // à propager côté mage).
    releaseMountPassenger: () => {
      if (readOnly) return;
      useMountPassengerAssignmentStore
        .getState()
        .release(target.campaignId, target.id, !isPlayer);
    },
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
    fireWeaponShot: bind(actions.fireWeaponShot),
    loadWeaponShot: bind(actions.loadWeaponShot),
    refillWeaponShots: bind(actions.refillWeaponShots),
    weaponLoading: loadingContext(target),
    spendItemCharge: bind(actions.spendItemChargeAction),
    restoreItemCharge: bind(actions.restoreItemChargeAction),
    refillItemCharges: bind(actions.refillItemChargesAction),
    addGrantedEquipment: bind(actions.addGrantedEquipment),
    giveItem: (index, quantity, receiverId) => {
      if (readOnly) return Promise.resolve();
      return giveItemAction(target, index, quantity, receiverId);
    },

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
    doShortRest: (recoveryDieRoll, extraHeal = 0) =>
      update(actions.applyShortRest(target, recoveryDieRoll, recoveryDiceMax, extraHeal)),
    doLongRest: (heal, extraHeal = 0) => update(actions.applyLongRest(target, heal, recoveryDie, extraHeal)),
    recoveryHealBonuses: restRecoveryDieHealBonuses(target),

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
