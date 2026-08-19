import { describe, expect, it } from 'vitest';
import { COIN_POUCH_ITEM_NAME, featureById } from '@/data';
import { createBlankCharacter } from './factory';
import type { Character, EquipmentLine } from './types';
import { elixirItemName } from './elixirs';
import { companionInstanceKey } from './companions';
import { shortRestLockKey } from './effects';
import {
  addMount,
  applyLongRest,
  applyShortRest,
  companionMaxHp,
  consumeEquipmentLine,
  createElixir,
  damageCharacterHp,
  damageCompanion,
  damageMount,
  elixirDosesToLose,
  fireWeaponShot,
  healCharacterHp,
  healCompanion,
  healMount,
  liftShortRestLock,
  loadWeaponShot,
  openCoinPouch,
  openPotion,
  ownedMountMaxHp,
  refillItemChargesAction,
  refillWeaponShots,
  removeCompanionInstance,
  removeMount,
  resetCharacterHp,
  resetCharacterLuck,
  resetCharacterMana,
  resetCompanionHp,
  restoreItemChargeAction,
  resetMountHp,
  resolveStartingChoice,
  restoreCharacterLuck,
  restoreCharacterMana,
  setAvailableRecoveryDice,
  setCompanionDepletion,
  setDemiElfeAncestryPath,
  setEffectInput,
  setEquipmentWorn,
  setMountBarde,
  setMountHp,
  setMountMounted,
  setMountedTarget,
  setPurse,
  setUsageCounter,
  setWeaponModification,
  spendCharacterLuck,
  spendCharacterMana,
  spendItemChargeAction,
  summonCompanionInstance,
  toggleEffect,
  updateMount,
  useEquipmentItem,
} from './sheetActions';

/** Personnage de test : fabrique réelle + surcharges ciblées (niveau 5 par défaut). */
function char(over: Partial<Character> = {}): Character {
  return { ...createBlankCharacter({ now: '2026-01-01T00:00:00.000Z' }), level: 5, ...over };
}

// ---------------------------------------------------------------------------
// Interrupteurs d'effets
// ---------------------------------------------------------------------------

describe('toggleEffect — interrupteurs d’effets conditionnels', () => {
  it('bascule un interrupteur simple sans toucher aux compteurs', () => {
    // magie-elementaire-r5 (Armure de pierre) : `consumeOnActivate: false` → l'EXTINCTION ne
    // consomme ni ne recharge rien (seule l'activation recharge, cf. resetOnActivate plus bas).
    const c = char({ classId: 'magicien', featureIds: ['magie-elementaire-r5'] });
    const patch = toggleEffect(c, 'magie-elementaire-r5', 0, false);
    expect(patch.effectToggles?.['magie-elementaire-r5']).toEqual([false]);
    expect(patch.usageCounters).toBeUndefined();
  });

  it('activer un état TEMPORAIRE à compteur le CONSOMME (Rage du berserk, PER-130)', () => {
    // rage-r3 : max = 1 (base) + une par capacité de rang 4 de barbare (aucune ici). Clé partagée « rage ».
    const c = char({ classId: 'barbare', featureIds: ['rage-r3'] });
    const patch = toggleEffect(c, 'rage-r3', 0, true);
    expect(patch.effectToggles?.['rage-r3']).toEqual([true]);
    expect(patch.usageCounters).toEqual({ rage: 0 });
  });

  it('ne descend JAMAIS sous 0 : réserve déjà vide → le compteur reste à 0', () => {
    const c = char({ classId: 'barbare', featureIds: ['rage-r3'], usageCounters: { rage: 0 } });
    expect(toggleEffect(c, 'rage-r3', 0, true).usageCounters).toEqual({ rage: 0 });
  });

  it('déployer la Cape d’ombre CONSOMME la charge quotidienne (ombres r7, PER-74)', () => {
    // prestige-ombres-r7 : activation `temporary` + usageCounter 1×/jour → activer dépense 1 charge.
    const c = char({ classId: 'voleur', featureIds: ['prestige-ombres-r7'] });
    const patch = toggleEffect(c, 'prestige-ombres-r7', 0, true);
    expect(patch.effectToggles?.['prestige-ombres-r7']).toEqual([true]);
    expect(patch.usageCounters).toEqual({ 'prestige-ombres-r7': 0 });
    // Éteindre ne rembourse pas.
    const off = toggleEffect({ ...c, usageCounters: { 'prestige-ombres-r7': 0 } }, 'prestige-ombres-r7', 0, false);
    expect(off.usageCounters).toBeUndefined();
  });

  it('éteindre ne rembourse pas l’usage consommé', () => {
    const c = char({ classId: 'barbare', featureIds: ['rage-r3'], usageCounters: { rage: 0 } });
    const patch = toggleEffect(c, 'rage-r3', 0, false);
    expect(patch.usageCounters).toBeUndefined(); // compteur non touché
    expect(patch.effectToggles?.['rage-r3']).toEqual([false]);
  });

  it('activer pose le verrou « repos court requis » quand la capacité l’exige (Sanctuaire, PER-161)', () => {
    // priere-r2 (Sanctuaire) : max 1, `oncePerShortRest` → la dépense à l'activation verrouille.
    const c = char({ classId: 'pretre', featureIds: ['priere-r2'] });
    const patch = toggleEffect(c, 'priere-r2', 0, true);
    expect(patch.usageCounters).toEqual({
      'priere-r2': 0,
      [shortRestLockKey('priere-r2')]: 1,
    });
  });

  it('ne pose PAS le verrou si rien n’a été consommé (réserve déjà vide)', () => {
    const c = char({ classId: 'pretre', featureIds: ['priere-r2'], usageCounters: { 'priere-r2': 0 } });
    const patch = toggleEffect(c, 'priere-r2', 0, true);
    expect(patch.usageCounters).toEqual({ 'priere-r2': 0 });
    expect(patch.usageCounters?.[shortRestLockKey('priere-r2')]).toBeUndefined();
  });

  it('activer un compteur de SUIVI `resetOnActivate` le remet à PLEIN (Armure de pierre, PER-150)', () => {
    // magie-elementaire-r5 : absorption = niveau × 3 (15 au niveau 5), rechargée au (re)lancement.
    const c = char({
      classId: 'magicien',
      featureIds: ['magie-elementaire-r5'],
      usageCounters: { 'magie-elementaire-r5': 4 },
    });
    const patch = toggleEffect(c, 'magie-elementaire-r5', 0, true);
    // Clé retirée = compteur plein (invariant du modèle).
    expect(patch.usageCounters).toEqual({});
    expect(patch.effectToggles?.['magie-elementaire-r5']).toEqual([true]);
  });
});

// ---------------------------------------------------------------------------
// État « en selle » (dérivé de la monture chevauchée)
// ---------------------------------------------------------------------------

describe('setMountedTarget / setMountMounted — exclusivité « en selle » (PER-216)', () => {
  /** Chevalier avec Fidèle monture (compagnon de voie) + Cavalier émérite (interrupteur « en selle »). */
  const knight = (over: Partial<Character> = {}) =>
    char({ classId: 'chevalier', featureIds: ['cavalier-r1', 'cavalier-r2'], ...over });

  it('monter une monture POSSÉDÉE démonte la monture de voie et garde l’interrupteur actif', () => {
    const c = knight({
      mounts: [{ id: 'm1', catalogId: 'cheval-de-selle', hp: {} }],
      mountedKey: 'cavalier-r1',
      effectToggles: { 'cavalier-r2': [true] },
    });
    const patch = setMountMounted(c, 'm1', true);
    // Clé UNIQUE → l'ancienne monture est démontée par construction.
    expect(patch.mountedKey).toBe('m1');
    expect(patch.effectToggles?.['cavalier-r2']).toEqual([true]);
  });

  it('descendre repasse à pied et éteint l’interrupteur du cavalier', () => {
    const c = knight({
      mounts: [{ id: 'm1', catalogId: 'cheval-de-selle', hp: {} }],
      mountedKey: 'm1',
      effectToggles: { 'cavalier-r2': [true] },
    });
    const patch = setMountMounted(c, 'm1', false);
    expect(patch.mountedKey).toBeUndefined();
    expect(patch.effectToggles?.['cavalier-r2']).toEqual([false]);
  });

  it('sans capacité « en selle », seul `mountedKey` bouge', () => {
    const c = char({ mounts: [{ id: 'm1', catalogId: 'cheval-de-selle', hp: {} }] });
    const patch = setMountedTarget(c, 'm1');
    expect(patch.mountedKey).toBe('m1');
    expect(patch.effectToggles).toBeUndefined();
  });

  it('basculer l’interrupteur « en selle » depuis la carte de voie monte/démonte la monture de VOIE', () => {
    const c = knight();
    // Activer = monter la monture de voie (sa clé = l'id du rang porteur).
    const on = toggleEffect(c, 'cavalier-r2', 0, true);
    expect(on.mountedKey).toBe('cavalier-r1');
    expect(on.effectToggles?.['cavalier-r2']).toEqual([true]);
    // Désactiver = repasser à pied.
    const off = toggleEffect({ ...c, mountedKey: 'cavalier-r1' }, 'cavalier-r2', 0, false);
    expect(off.mountedKey).toBeUndefined();
    expect(off.effectToggles?.['cavalier-r2']).toEqual([false]);
  });
});

// ---------------------------------------------------------------------------
// Saisies libres & compteurs d'usages
// ---------------------------------------------------------------------------

describe('setEffectInput', () => {
  it('enregistre la saisie libre corrélée à une capacité', () => {
    expect(setEffectInput(char(), 'animaux-r5', 'Ours brun').effectInputs).toEqual({
      'animaux-r5': 'Ours brun',
    });
  });

  it('une saisie vide (ou blanche) supprime la clé — pas de note fantôme', () => {
    const c = char({ effectInputs: { 'animaux-r5': 'Ours brun' } });
    expect(setEffectInput(c, 'animaux-r5', '   ').effectInputs).toEqual({});
  });

  it('dénormalise le snapshot de DEF/Initiative de la forme choisie (retour propriétaire 2026-08-19)', () => {
    const patch = setEffectInput(char(), 'animaux-r5', 'Ours brun', { AGI: 2, CON: 5, FOR: 6 }, { defense: 16, initiative: 8 });
    expect(patch.transformationAbilities).toEqual({ 'animaux-r5': { AGI: 2, CON: 5, FOR: 6 } });
    expect(patch.transformationDerivedStats).toEqual({ 'animaux-r5': { defense: 16, initiative: 8 } });
  });

  it('une saisie vide purge aussi le snapshot de DEF/Initiative — pas de forme fantôme', () => {
    const c = char({
      effectInputs: { 'animaux-r5': 'Ours brun' },
      transformationAbilities: { 'animaux-r5': { AGI: 2, CON: 5, FOR: 6 } },
      transformationDerivedStats: { 'animaux-r5': { defense: 16, initiative: 8 } },
    });
    const patch = setEffectInput(c, 'animaux-r5', '');
    expect(patch.transformationAbilities).toEqual({});
    expect(patch.transformationDerivedStats).toEqual({});
  });
});

describe('setUsageCounter', () => {
  it('borne à [0, max] et retire la clé au maximum', () => {
    const c = char({ classId: 'barbare', featureIds: ['rage-r3'], usageCounters: { rage: 1 } });
    expect(setUsageCounter(c, 'rage', -3, 3).usageCounters).toEqual({ rage: 0 });
    expect(setUsageCounter(c, 'rage', 9, 3).usageCounters).toEqual({}); // ≥ max ⇒ clé retirée
  });

  it('un compteur de SUIVI tombé à 0 ÉTEINT les interrupteurs de sa capacité (PER-150)', () => {
    // magie-elementaire-r5 : `endsEffectAtZero` — Armure de pierre prend fin à l'épuisement de l'absorption.
    const c = char({
      classId: 'magicien',
      featureIds: ['magie-elementaire-r5'],
      effectToggles: { 'magie-elementaire-r5': [true] },
      usageCounters: { 'magie-elementaire-r5': 2 },
    });
    const patch = setUsageCounter(c, 'magie-elementaire-r5', 0, 15);
    expect(patch.usageCounters).toEqual({ 'magie-elementaire-r5': 0 });
    expect(patch.effectToggles?.['magie-elementaire-r5']).toEqual([false]);
  });

  it('ne coupe pas les interrupteurs d’une capacité sans `endsEffectAtZero`', () => {
    const c = char({
      classId: 'barbare',
      featureIds: ['rage-r3'],
      effectToggles: { 'rage-r3': [true] },
    });
    expect(setUsageCounter(c, 'rage', 0, 1).effectToggles).toBeUndefined();
  });

  it('une DÉPENSE sur un compteur `oncePerShortRest` pose le verrou (PER-160)', () => {
    const c = char({ classId: 'pretre', featureIds: ['priere-r2'] });
    const patch = setUsageCounter(c, 'priere-r2', 0, 1);
    expect(patch.usageCounters).toEqual({ 'priere-r2': 0, [shortRestLockKey('priere-r2')]: 1 });
  });

  it('un compteur `oncePerShortRest` qui REMONTE ne pose pas le verrou', () => {
    const c = char({ classId: 'pretre', featureIds: ['priere-r2'], usageCounters: { 'priere-r2': 0 } });
    expect(setUsageCounter(c, 'priere-r2', 1, 1).usageCounters).toEqual({});
  });

  it('compteur CROISSANT (surcoût mana) : pas de plafond, baseline 0 (PER-162)', () => {
    // foi-r5 (Foudres divines) : `escalatingManaCost` — sémantique inverse, 0 = clé absente.
    const c = char({ classId: 'pretre', featureIds: ['foi-r5'] });
    expect(setUsageCounter(c, 'foi-r5', 3, 0).usageCounters).toEqual({ 'foi-r5': 3 });
    expect(setUsageCounter(c, 'foi-r5', 99, 0).usageCounters).toEqual({ 'foi-r5': 99 });
    expect(setUsageCounter({ ...c, usageCounters: { 'foi-r5': 2 } }, 'foi-r5', 0, 0).usageCounters).toEqual(
      {},
    );
  });
});

describe('liftShortRestLock', () => {
  it('lève le verrou d’UNE capacité et recharge ce qu’un repos court rechargerait', () => {
    const c = char({
      classId: 'pretre',
      featureIds: ['priere-r2', 'foi-r5'],
      usageCounters: {
        'priere-r2': 0,
        [shortRestLockKey('priere-r2')]: 1,
        'foi-r5': 4, // surcoût mana d'une AUTRE capacité : non touché
      },
    });
    // priere-r2 : `resetOn: 'short-rest'` → la charge revient ET le verrou saute.
    expect(liftShortRestLock(c, 'priere-r2').usageCounters).toEqual({ 'foi-r5': 4 });
  });

  it('ne touche pas les compteurs d’une autre capacité', () => {
    const c = char({
      classId: 'barbare',
      featureIds: ['rage-r3', 'priere-r2'],
      usageCounters: { rage: 0, 'priere-r2': 0 },
    });
    // La réserve de rage est journalière : un repos court ne la recharge pas.
    expect(liftShortRestLock(c, 'priere-r2').usageCounters).toEqual({ rage: 0 });
  });
});

// ---------------------------------------------------------------------------
// Élixirs (voie des élixirs, p. 98)
// ---------------------------------------------------------------------------

describe('createElixir', () => {
  /** Forgesort avec la voie des élixirs : réserve partagée `elixirs-doses`. */
  const alchemist = (over: Partial<Character> = {}) =>
    char({ classId: 'forgesort', featureIds: ['elixirs-r1'], ...over });

  it('décompte la réserve ET matérialise la dose dans la MÊME écriture', () => {
    const c = alchemist({ usageCounters: { 'elixirs-doses': 3 } });
    const patch = createElixir(c, {
      counterKey: 'elixirs-doses',
      cost: 1,
      max: 3,
      elixirName: 'Fortifiant',
    });
    // Les deux champs sont présents ensemble : aucun n'écrase l'autre.
    expect(patch.usageCounters).toEqual({ 'elixirs-doses': 2 });
    expect(patch.equipment).toEqual([
      {
        custom: true,
        name: elixirItemName('Fortifiant'),
        quantity: 1,
        details: 'Élixir préparé (voie des élixirs, p. 98).',
      },
    ]);
  });

  it('incrémente la quantité d’une dose déjà en inventaire (pas de doublon de ligne)', () => {
    const dose: EquipmentLine = { custom: true, name: elixirItemName('Fortifiant'), quantity: 2 };
    const c = alchemist({ equipment: [dose], usageCounters: { 'elixirs-doses': 2 } });
    const patch = createElixir(c, {
      counterKey: 'elixirs-doses',
      cost: 1,
      max: 3,
      elixirName: 'Fortifiant',
    });
    expect(patch.equipment).toHaveLength(1);
    expect(patch.equipment?.[0]).toMatchObject({ quantity: 3 });
  });

  it('réserve insuffisante → patch VIDE (aucune écriture)', () => {
    const c = alchemist({ usageCounters: { 'elixirs-doses': 0 } });
    expect(
      createElixir(c, { counterKey: 'elixirs-doses', cost: 1, max: 3, elixirName: 'Fortifiant' }),
    ).toEqual({});
  });

  it('réserve pleine (clé absente) : la première dose consomme depuis le max', () => {
    const c = alchemist();
    const patch = createElixir(c, {
      counterKey: 'elixirs-doses',
      cost: 1,
      max: 3,
      elixirName: 'Fortifiant',
    });
    expect(patch.usageCounters).toEqual({ 'elixirs-doses': 2 });
  });
});

describe('elixirDosesToLose', () => {
  it('compte les doses en inventaire (quantités incluses), ignore le reste', () => {
    const c = char({
      equipment: [
        { custom: true, name: elixirItemName('Fortifiant'), quantity: 2 },
        { custom: true, name: elixirItemName('Feu grégeois'), quantity: 1 },
        { custom: true, name: 'Cape de voyage', quantity: 1 },
        { itemId: 'epee-longue', quantity: 1 },
      ],
    });
    expect(elixirDosesToLose(c)).toBe(3);
  });

  it('aucune dose → 0', () => {
    expect(elixirDosesToLose(char())).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Objets, équipement porté, bourse
// ---------------------------------------------------------------------------

describe('consumeEquipmentLine', () => {
  it('décrémente la quantité', () => {
    const c = char({ equipment: [{ itemId: 'potion-de-soins', quantity: 3 }] });
    expect(consumeEquipmentLine(c, 0)).toEqual([{ itemId: 'potion-de-soins', quantity: 2 }]);
  });

  it('retire la ligne à la dernière unité', () => {
    const c = char({
      equipment: [
        { itemId: 'potion-de-soins', quantity: 1 },
        { itemId: 'epee-longue', quantity: 1 },
      ],
    });
    expect(consumeEquipmentLine(c, 0)).toEqual([{ itemId: 'epee-longue', quantity: 1 }]);
  });

  it('index inconnu → équipement inchangé', () => {
    const c = char({ equipment: [{ itemId: 'epee-longue', quantity: 1 }] });
    expect(consumeEquipmentLine(c, 7)).toBe(c.equipment);
  });
});

describe('useEquipmentItem — intention d’un clic « Utiliser »', () => {
  it('consomme directement un consommable ordinaire', () => {
    const c = char({ equipment: [{ itemId: 'potion-de-soins', quantity: 2 }] });
    const intent = useEquipmentItem(c, 0);
    expect(intent).toEqual({
      kind: 'consume',
      patch: { equipment: [{ itemId: 'potion-de-soins', quantity: 1 }] },
    });
  });

  it('un choix d’équipement de départ demande la modale de choix (PER-220)', () => {
    const c = char({
      equipment: [{ custom: true, name: 'Dague ou hachette de lancer', quantity: 1 }],
    });
    expect(useEquipmentItem(c, 0)).toEqual({ kind: 'starting-choice', index: 0 });
  });

  it('la « Bourse de 2d6 pa » demande la modale de saisie des pa (p. 31)', () => {
    const c = char({ equipment: [{ custom: true, name: COIN_POUCH_ITEM_NAME, quantity: 1 }] });
    expect(useEquipmentItem(c, 0)).toEqual({
      kind: 'coin-pouch',
      index: 0,
      info: { currency: 'silver', abbrev: 'pa', label: 'pièces d’argent (pa)', dice: '2d6' },
    });
  });

  // Généralisation PER-200 (Outils du MJ) : n'importe quelle bourse « Bourse de NdM {monnaie} ».
  it('une bourse d’or créée depuis les Outils du MJ demande aussi la modale de saisie', () => {
    const c = char({ equipment: [{ custom: true, name: 'Bourse de 3d6 po', quantity: 1 }] });
    expect(useEquipmentItem(c, 0)).toEqual({
      kind: 'coin-pouch',
      index: 0,
      info: { currency: 'gold', abbrev: 'po', label: 'pièces d’or (po)', dice: '3d6' },
    });
  });

  it('ligne inexistante → aucune action', () => {
    expect(useEquipmentItem(char(), 3)).toEqual({ kind: 'none' });
  });

  // PER-XXX : potion custom qui restaure de l'énergie (PV/PM/chance/DR/rage) — reconnue par la
  // propriété STRUCTURÉE `potion`, pas par le nom (contrairement à la bourse).
  it('une potion custom demande la modale de saisie du dé', () => {
    const c = char({
      equipment: [
        { custom: true, name: 'Fiole de Grondin', quantity: 1, type: 'consumable', potion: { resource: 'mana', die: 'd6' } },
      ],
    });
    expect(useEquipmentItem(c, 0)).toEqual({
      kind: 'potion',
      index: 0,
      resource: 'mana',
      die: 'd6',
      count: 1,
    });
  });

  it('une potion custom à plusieurs dés (« 2d6 ») propage le compte', () => {
    const c = char({
      equipment: [
        {
          custom: true,
          name: 'Fiole double',
          quantity: 1,
          type: 'consumable',
          potion: { resource: 'hp', die: 'd6', count: 2 },
        },
      ],
    });
    expect(useEquipmentItem(c, 0)).toEqual({ kind: 'potion', index: 0, resource: 'hp', die: 'd6', count: 2 });
  });

  // Dé ÉVOLUTIF « d4° » (table p. 43) : `die` n'est qu'un placeholder, propagé tel quel — c'est
  // `PotionDialog` qui résout la face réelle au niveau du personnage.
  it('une potion à dé évolutif propage `evolving`', () => {
    const c = char({
      equipment: [
        {
          custom: true,
          name: 'Fiole évolutive',
          quantity: 1,
          type: 'consumable',
          potion: { resource: 'hp', die: 'd4', evolving: true },
        },
      ],
    });
    expect(useEquipmentItem(c, 0)).toEqual({
      kind: 'potion',
      index: 0,
      resource: 'hp',
      die: 'd4',
      count: 1,
      evolving: true,
    });
  });

  // Bonus plat (« 1d6+4 »), sur le modèle du bonus plat de `WeaponDamage`.
  it('une potion à bonus plat propage `modifier`', () => {
    const c = char({
      equipment: [
        {
          custom: true,
          name: 'Fiole dopée',
          quantity: 1,
          type: 'consumable',
          potion: { resource: 'mana', die: 'd6', modifier: 4 },
        },
      ],
    });
    expect(useEquipmentItem(c, 0)).toEqual({
      kind: 'potion',
      index: 0,
      resource: 'mana',
      die: 'd6',
      count: 1,
      modifier: 4,
    });
  });

  // PER-294 : un objet à charges ne se consomme pas, il se DÉPENSE — la ligne survit à l'épuisement.
  it('un objet à CHARGES dépense une charge au lieu de consommer la ligne', () => {
    const c = char({
      equipment: [{ itemId: 'potion-de-soins', quantity: 2, charges: { max: 3 } }],
    });
    expect(useEquipmentItem(c, 0)).toEqual({
      kind: 'consume',
      patch: {
        equipment: [{ itemId: 'potion-de-soins', quantity: 2, charges: { max: 3 }, chargesSpent: 1 }],
      },
    });
  });

  it('un objet à charges ÉPUISÉ ne produit aucune écriture (et n’est pas retiré)', () => {
    const c = char({
      equipment: [{ itemId: 'potion-de-soins', quantity: 1, charges: { max: 2 }, chargesSpent: 2 }],
    });
    expect(useEquipmentItem(c, 0)).toEqual({ kind: 'consume', patch: {} });
  });
});

describe('gestes de charge d’un objet (PER-294)', () => {
  const wandChar = (chargesSpent?: number) =>
    char({
      equipment: [
        {
          custom: true,
          name: 'Baguette de foudre',
          quantity: 1,
          charges: { max: 4 },
          ...(chargesSpent !== undefined ? { chargesSpent } : {}),
        },
      ],
    });

  it('« Utiliser » dépense une charge', () => {
    expect(spendItemChargeAction(wandChar(), 0).equipment?.[0]).toHaveProperty('chargesSpent', 1);
  });

  it('« Recharger » en rend une, « Plein » les rend toutes', () => {
    expect(restoreItemChargeAction(wandChar(3), 0).equipment?.[0]).toHaveProperty('chargesSpent', 2);
    expect(refillItemChargesAction(wandChar(3), 0).equipment?.[0]).not.toHaveProperty('chargesSpent');
  });

  it('patch VIDE quand il n’y a rien à faire (contrat « aucune écriture »)', () => {
    expect(spendItemChargeAction(wandChar(4), 0)).toEqual({});
    expect(restoreItemChargeAction(wandChar(), 0)).toEqual({});
    expect(refillItemChargesAction(wandChar(), 0)).toEqual({});
    // Objet sans charges, et index hors bornes.
    const plain = char({ equipment: [{ itemId: 'epee-longue', quantity: 1 }] });
    expect(spendItemChargeAction(plain, 0)).toEqual({});
    expect(spendItemChargeAction(wandChar(), 9)).toEqual({});
  });
});

describe('openCoinPouch', () => {
  it('ajoute les pa tirés à la fortune ET consomme la bourse en une écriture', () => {
    const c = char({
      equipment: [{ custom: true, name: COIN_POUCH_ITEM_NAME, quantity: 1 }],
      purse: { gold: 1, silver: 4, copper: 0, platinum: 0 },
    });
    const patch = openCoinPouch(c, 0, 7);
    expect(patch.equipment).toEqual([]);
    expect(patch.purse).toEqual({ gold: 1, silver: 11, copper: 0, platinum: 0 });
  });

  it('une bourse d’or crédite l’or, pas l’argent (généralisation PER-200)', () => {
    const c = char({
      equipment: [{ custom: true, name: 'Bourse de 3d6 po', quantity: 1 }],
      purse: { gold: 1, silver: 4, copper: 0, platinum: 0 },
    });
    const patch = openCoinPouch(c, 0, 9);
    expect(patch.equipment).toEqual([]);
    expect(patch.purse).toEqual({ gold: 10, silver: 4, copper: 0, platinum: 0 });
  });
});

describe('openPotion', () => {
  const potionChar = (resource: 'hp' | 'mana' | 'luck' | 'recoveryDice' | 'rage', over: Partial<Character> = {}) =>
    char({
      equipment: [{ custom: true, name: 'Potion', quantity: 1, type: 'consumable', potion: { resource, die: 'd6' } }],
      ...over,
    });

  it('PV : soigne (létaux d’abord) et consomme la dose en une écriture', () => {
    const c = potionChar('hp', { depletion: { hp: { lethal: 4, temp: 0 } } });
    const patch = openPotion(c, 0, 3, 10);
    expect(patch.equipment).toEqual([]);
    expect(patch.depletion).toEqual({ hp: { lethal: 1, temp: 0 } });
  });

  it('PM : restaure le mana, borné au max EFFECTIF fourni par l’appelant', () => {
    const c = potionChar('mana', { depletion: { mana: 5 } });
    const patch = openPotion(c, 0, 8, 10);
    expect(patch.equipment).toEqual([]);
    expect(patch.depletion).toEqual({}); // 5 - 8 clampé à 0 → clé retirée (plein)
  });

  it('Chance : restaure les points de chance', () => {
    const c = potionChar('luck', { depletion: { luck: 3 } });
    expect(openPotion(c, 0, 2, 5).depletion).toEqual({ luck: 1 });
  });

  it('Dés de récupération : restaure la réserve de DR', () => {
    const c = potionChar('recoveryDice', { depletion: { recoveryDice: 2 } });
    expect(openPotion(c, 0, 1, 3).depletion).toEqual({ recoveryDice: 1 });
  });

  // Rage (PER-130) : réserve à clé PARTAGÉE (`sharedKey: 'rage'`), pas une jauge de `Depletion`.
  it('Rage : restaure la réserve partagée `usageCounters.rage`', () => {
    const c = potionChar('rage', {
      classId: 'barbare',
      featureIds: ['rage-r3'],
      usageCounters: { rage: 0 },
    });
    const patch = openPotion(c, 0, 1, 1);
    expect(patch.equipment).toEqual([]);
    expect(patch.usageCounters).not.toHaveProperty('rage'); // remonté au max (1) → clé retirée
  });
});

describe('resolveStartingChoice', () => {
  it('remplace la ligne de choix par l’objet retenu', () => {
    const c = char({
      equipment: [
        { itemId: 'epee-longue', quantity: 1 },
        { custom: true, name: 'Dague ou hachette de lancer', quantity: 1 },
        { itemId: 'corde', quantity: 1 },
      ],
    });
    const patch = resolveStartingChoice(c, 1, {
      label: 'Dague',
      items: [{ itemId: 'dague', quantity: 1 }],
    });
    expect(patch.equipment).toEqual([
      { itemId: 'epee-longue', quantity: 1 },
      { itemId: 'dague', quantity: 1 },
      { itemId: 'corde', quantity: 1 },
    ]);
  });

  it('un LOT produit plusieurs lignes à la place de la ligne de choix', () => {
    const c = char({ equipment: [{ custom: true, name: 'Arme ou lot', quantity: 1 }] });
    const patch = resolveStartingChoice(c, 0, {
      label: 'Épée longue et grand bouclier',
      items: [
        { itemId: 'epee-longue', quantity: 1 },
        { itemId: 'grand-bouclier', quantity: 1 },
      ],
    });
    expect(patch.equipment).toEqual([
      { itemId: 'epee-longue', quantity: 1 },
      { itemId: 'grand-bouclier', quantity: 1 },
    ]);
  });
});

describe('setEquipmentWorn', () => {
  it('équipe une ligne (état de jeu, hors mode « Modifier »)', () => {
    const c = char({ equipment: [{ itemId: 'epee-longue', quantity: 1 }] });
    const patch = setEquipmentWorn(c, 0, { slot: 'mainHand' });
    expect(patch.equipment?.[0]).toMatchObject({ itemId: 'epee-longue', worn: { slot: 'mainHand' } });
  });

  it('déséquipe une ligne', () => {
    const c = char({ equipment: [{ itemId: 'epee-longue', quantity: 1, worn: { slot: 'mainHand' } }] });
    // `setWornAt` remet l'état de port à `undefined` (clé présente, valeur absente — elle
    // disparaît à la sérialisation JSON du personnage).
    expect(setEquipmentWorn(c, 0, undefined).equipment?.[0].worn).toBeUndefined();
  });
});

describe('gestes de chargement des armes (PER-284)', () => {
  /** Arquebusier d'INT 3 avec la voie de l'artilleur au rang 3 → chargeur de 6 coups (p. 62). */
  const gunner = (equipment: EquipmentLine[]): Character => {
    const base = char({ featureIds: ['artilleur-r1', 'artilleur-r2', 'artilleur-r3'], equipment });
    return { ...base, abilities: { ...base.abilities, INT: 3 } };
  };

  it('tirer retire un coup et n’écrit QUE l’équipement (clé d’état de jeu)', () => {
    const patch = fireWeaponShot(gunner([{ itemId: 'petoire', quantity: 1 }]), 0);
    expect(Object.keys(patch)).toEqual(['equipment']);
    expect(patch.equipment?.[0]).toMatchObject({ itemId: 'petoire', loaded: [] });
  });

  it('tirer une arme vide ne renvoie RIEN (patch vide = aucune écriture)', () => {
    expect(fireWeaponShot(gunner([{ itemId: 'petoire', quantity: 1, loaded: [] }]), 0)).toEqual({});
  });

  it('tirer sur une arme qui ne se recharge pas ne renvoie rien', () => {
    expect(fireWeaponShot(gunner([{ itemId: 'arc-long', quantity: 1 }]), 0)).toEqual({});
  });

  it('recharger remet un coup ; le plein s’écrit par l’absence de `loaded`', () => {
    const patch = loadWeaponShot(gunner([{ itemId: 'petoire', quantity: 1, loaded: [] }]), 0);
    expect(patch.equipment?.[0]).toEqual({ itemId: 'petoire', quantity: 1 });
  });

  it('recharger une arme pleine ne renvoie rien', () => {
    expect(loadWeaponShot(gunner([{ itemId: 'petoire', quantity: 1 }]), 0)).toEqual({});
  });

  it('recharger à la grenaille l’annonce sur l’arme (explosifs-r1, p. 63)', () => {
    const patch = loadWeaponShot(
      gunner([{ itemId: 'petoire', quantity: 1, magazine: true, loaded: [] }]),
      0,
      'grapeshot',
    );
    expect(patch.equipment?.[0]).toMatchObject({ loaded: ['grapeshot'] });
  });

  it('faire le plein remplit le chargeur d’un geste (capacité 2 + INT 3 + 1 palier = 6)', () => {
    const patch = refillWeaponShots(
      gunner([{ itemId: 'petoire', quantity: 1, magazine: true, loaded: ['normal'] }]),
      0,
    );
    expect(patch.equipment?.[0]).toEqual({ itemId: 'petoire', quantity: 1, magazine: true });
  });

  it('faire le plein d’une arme pleine ne renvoie rien', () => {
    expect(refillWeaponShots(gunner([{ itemId: 'petoire', quantity: 1 }]), 0)).toEqual({});
  });

  it('désigner une arme à doter d’un chargeur n’écrit QUE l’équipement (artilleur-r2, p. 62)', () => {
    const spec = featureById.get('artilleur-r2')!.weaponModification!;
    const c = gunner([{ itemId: 'petoire', quantity: 1 }]);
    const patch = setWeaponModification(c, 0, spec, true);
    expect(Object.keys(patch)).toEqual(['equipment']);
    expect(patch.equipment?.[0]).toMatchObject({ itemId: 'petoire', magazine: true });
  });

  it('refuse au-delà du plafond du livre (deux armes) → patch vide', () => {
    const spec = featureById.get('artilleur-r2')!.weaponModification!;
    const c = gunner([
      { itemId: 'petoire', quantity: 1, magazine: true },
      { itemId: 'petoire', quantity: 1, magazine: true },
      { itemId: 'mousquet', quantity: 1 },
    ]);
    expect(setWeaponModification(c, 2, spec, true)).toEqual({});
  });
});

describe('setPurse', () => {
  it('remplace la bourse', () => {
    const purse = { gold: 3, silver: 2, copper: 1, platinum: 0 };
    expect(setPurse(purse)).toEqual({ purse });
  });
});

// ---------------------------------------------------------------------------
// Jauges du personnage
// ---------------------------------------------------------------------------

describe('jauges du personnage — PV, mana, chance, dés de récupération', () => {
  it('applique des dégâts létaux, plafonnés au max EFFECTIF fourni', () => {
    const c = char();
    expect(damageCharacterHp(c, 4, 'lethal', 20).depletion).toEqual({ hp: { lethal: 4, temp: 0 } });
    // Manque plafonné : on ne comptabilise pas les PV perdus sous 0 (p. 220).
    expect(damageCharacterHp(c, 99, 'lethal', 20).depletion).toEqual({ hp: { lethal: 20, temp: 0 } });
  });

  it('soigne d’abord le létal, puis le temporaire', () => {
    const c = char({ depletion: { hp: { lethal: 3, temp: 2 } } });
    expect(healCharacterHp(c, 4).depletion).toEqual({ hp: { lethal: 0, temp: 1 } });
  });

  it('remet les PV à plein en conservant les autres jauges', () => {
    const c = char({ depletion: { hp: { lethal: 3, temp: 0 }, mana: 2 } });
    expect(resetCharacterHp(c).depletion).toEqual({ mana: 2 });
  });

  it('dépense / récupère / remet à plein le mana, borné au max', () => {
    const c = char();
    expect(spendCharacterMana(c, 3, 10).depletion).toEqual({ mana: 3 });
    expect(spendCharacterMana(c, 99, 10).depletion).toEqual({ mana: 10 });
    const spent = char({ depletion: { mana: 6 } });
    expect(restoreCharacterMana(spent, 2, 10).depletion).toEqual({ mana: 4 });
    expect(resetCharacterMana(spent).depletion).toEqual({});
  });

  it('dépense / récupère / remet à plein les points de chance', () => {
    const c = char();
    expect(spendCharacterLuck(c, 1, 3).depletion).toEqual({ luck: 1 });
    const spent = char({ depletion: { luck: 3 } });
    expect(restoreCharacterLuck(spent, 1, 3).depletion).toEqual({ luck: 2 });
    expect(resetCharacterLuck(spent).depletion).toEqual({});
  });

  it('fixe les DR DISPONIBLES (le manque = max − disponibles)', () => {
    const c = char();
    expect(setAvailableRecoveryDice(c, 2, 5).depletion).toEqual({ recoveryDice: 3 });
    // Réserve pleine → clé retirée.
    expect(setAvailableRecoveryDice(c, 5, 5).depletion).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// Repos
// ---------------------------------------------------------------------------

describe('applyShortRest / applyLongRest', () => {
  it('repos court sans dé saisi : régénère le temporaire, garde le létal et les DR', () => {
    const c = char({ depletion: { hp: { lethal: 5, temp: 3 }, recoveryDice: 2 } });
    expect(applyShortRest(c, null, 5).depletion).toEqual({ hp: { lethal: 5, temp: 0 }, recoveryDice: 2 });
  });

  it('repos court avec dé saisi : dépense 1 DR et soigne [dé + ½ niveau]', () => {
    const c = char({ level: 6, depletion: { hp: { lethal: 10, temp: 0 }, recoveryDice: 1 } });
    // Dé 4 + ½ niveau (3) = 7 PV soignés ; un DR de plus dépensé.
    expect(applyShortRest(c, 4, 5).depletion).toEqual({ hp: { lethal: 3, temp: 0 }, recoveryDice: 2 });
  });

  it('repos long : rend le mana, recharge les compteurs du jour et PURGE les doses d’élixir (p. 98)', () => {
    const c = char({
      classId: 'forgesort',
      featureIds: ['elixirs-r1'],
      usageCounters: { 'elixirs-doses': 0 },
      depletion: { hp: { lethal: 4, temp: 2 }, mana: 5 },
      equipment: [
        { custom: true, name: elixirItemName('Fortifiant'), quantity: 2 },
        { itemId: 'epee-longue', quantity: 1 },
      ],
    });
    const patch = applyLongRest(c, false, 'd6');
    // Réserve d'élixirs rechargée (clé retirée = plein), mana plein, temporaire régénéré.
    expect(patch.usageCounters).toEqual({});
    expect(patch.depletion?.mana).toBeUndefined();
    expect(patch.depletion?.hp).toEqual({ lethal: 4, temp: 0 });
    // Les doses non consommées le jour même sont perdues ; le reste de l'inventaire est intact.
    expect(patch.equipment).toEqual([{ itemId: 'epee-longue', quantity: 1 }]);
  });

  it('repos long avec soin : la valeur MAX du dé + ½ niveau, dé de récupération lu depuis son libellé', () => {
    const c = char({ level: 4, depletion: { hp: { lethal: 15, temp: 0 } } });
    // d10 → 10 + ½ niveau (2) = 12 PV soignés.
    expect(applyLongRest(c, true, 'd10').depletion?.hp).toEqual({ lethal: 3, temp: 0 });
  });
});

// ---------------------------------------------------------------------------
// Compagnons
// ---------------------------------------------------------------------------

describe('compagnons — PV et instances', () => {
  /** Sorcier avec Animation des morts (zombies, multi-instances). PV du zombie = 10 + niveau. */
  const necromancer = (over: Partial<Character> = {}) =>
    char({
      classId: 'sorcier',
      featureIds: ['outre-tombe-r1', 'outre-tombe-r2', 'outre-tombe-r3'],
      ...over,
    });

  it('companionMaxHp résout les PV max du profil (zombie : 10 + niveau)', () => {
    const instanceKey = companionInstanceKey('outre-tombe-r3', 'z1');
    const c = necromancer({ companionInstances: { 'outre-tombe-r3': ['z1'] } });
    expect(companionMaxHp(c, instanceKey)).toBe(15); // niveau 5
  });

  it('companionMaxHp → undefined pour une clé inconnue', () => {
    expect(companionMaxHp(necromancer(), 'inconnu')).toBeUndefined();
  });

  it('setCompanionDepletion retire l’entrée redevenue pleine', () => {
    const c = necromancer({ companionDepletion: { 'outre-tombe-r3': { hp: { lethal: 3, temp: 0 } } } });
    expect(setCompanionDepletion(c, 'outre-tombe-r3', {}).companionDepletion).toEqual({});
  });

  it('une INVOCATION réduite à 0 PV est supprimée ET ses PV sont purgés (p. 109)', () => {
    const key = companionInstanceKey('outre-tombe-r3', 'z1');
    const c = necromancer({
      companionInstances: { 'outre-tombe-r3': ['z1', 'z2'] },
      companionDepletion: { [key]: { hp: { lethal: 10, temp: 0 } } },
    });
    // 15 PV max, 10 déjà subis → 5 de plus le réduisent à 0 : il tombe en poussière.
    const patch = damageCompanion(c, key, 5, 'lethal');
    expect(patch.companionInstances).toEqual({ 'outre-tombe-r3': ['z2'] });
    expect(patch.companionDepletion?.[key]).toBeUndefined();
  });

  it('une invocation encore debout garde simplement ses PV entamés', () => {
    const key = companionInstanceKey('outre-tombe-r3', 'z1');
    const c = necromancer({ companionInstances: { 'outre-tombe-r3': ['z1'] } });
    const patch = damageCompanion(c, key, 4, 'lethal');
    expect(patch.companionInstances).toBeUndefined();
    expect(patch.companionDepletion?.[key]).toEqual({ hp: { lethal: 4, temp: 0 } });
  });

  it('un compagnon CLASSIQUE tombé à 0 PV reste affiché (à terre, non supprimé)', () => {
    // Golem (forgesort) : compagnon simple, pas d'auto-suppression.
    const c = char({ classId: 'forgesort', featureIds: ['golem-r1', 'golem-r2'] });
    const max = companionMaxHp(c, 'golem-r2');
    expect(max).toBeGreaterThan(0);
    const patch = damageCompanion(c, 'golem-r2', max!, 'lethal');
    expect(patch.companionInstances).toBeUndefined();
    expect(patch.companionDepletion?.['golem-r2']).toEqual({ hp: { lethal: max, temp: 0 } });
  });

  it('soigne et remet à plein les PV d’un compagnon', () => {
    const c = char({
      classId: 'forgesort',
      featureIds: ['golem-r1', 'golem-r2'],
      companionDepletion: { 'golem-r2': { hp: { lethal: 6, temp: 0 } } },
    });
    expect(healCompanion(c, 'golem-r2', 2).companionDepletion?.['golem-r2']).toEqual({
      hp: { lethal: 4, temp: 0 },
    });
    expect(resetCompanionHp(c, 'golem-r2').companionDepletion).toEqual({});
  });

  it('summonCompanionInstance ajoute une instance dans la limite du profil', () => {
    const c = necromancer();
    // Limite = 1 (aucune voie de sorcier au rang 5) → première invocation acceptée…
    expect(summonCompanionInstance(c, 'outre-tombe-r3', 'z1').companionInstances).toEqual({
      'outre-tombe-r3': ['z1'],
    });
    // …la suivante est refusée (patch VIDE).
    const full = necromancer({ companionInstances: { 'outre-tombe-r3': ['z1'] } });
    expect(summonCompanionInstance(full, 'outre-tombe-r3', 'z2')).toEqual({});
  });

  it('summonCompanionInstance refuse une capacité non multi-instances', () => {
    const c = char({ classId: 'forgesort', featureIds: ['golem-r1', 'golem-r2'] });
    expect(summonCompanionInstance(c, 'golem-r2', 'x1')).toEqual({});
  });

  it('removeCompanionInstance retire l’id et purge ses PV ; la dernière instance vide la clé', () => {
    const key = companionInstanceKey('outre-tombe-r3', 'z1');
    const c = necromancer({
      companionInstances: { 'outre-tombe-r3': ['z1'] },
      companionDepletion: { [key]: { hp: { lethal: 2, temp: 0 } } },
    });
    const patch = removeCompanionInstance(c, key);
    expect(patch.companionInstances).toEqual({});
    expect(patch.companionDepletion).toEqual({});
  });

  it('removeCompanionInstance ignore une clé non composite (compagnon classique)', () => {
    expect(removeCompanionInstance(necromancer(), 'outre-tombe-r3')).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// Montures possédées
// ---------------------------------------------------------------------------

describe('montures possédées (PER-216)', () => {
  const withMount = (over: Partial<Character> = {}) =>
    char({ mounts: [{ id: 'm1', catalogId: 'cheval-de-guerre', hp: {} }], ...over });

  it('addMount ajoute une monture de catalogue (id injectable)', () => {
    expect(addMount(char(), 'cheval-de-selle', 'm9').mounts).toEqual([
      { id: 'm9', catalogId: 'cheval-de-selle', hp: {} },
    ]);
  });

  it('removeMount retire la monture visée', () => {
    expect(removeMount(withMount(), 'm1').mounts).toEqual([]);
  });

  it('updateMount applique un correctif ciblé (nom personnalisé)', () => {
    expect(updateMount(withMount(), 'm1', { name: 'Bucéphale' }).mounts?.[0]).toMatchObject({
      id: 'm1',
      name: 'Bucéphale',
    });
  });

  it('setMountBarde pose puis RETIRE la clé (pas de `bardeId: undefined` résiduel)', () => {
    const equipped = setMountBarde(withMount(), 'm1', 'caparacon-de-mailles').mounts?.[0];
    expect(equipped).toMatchObject({ bardeId: 'caparacon-de-mailles' });
    const stripped = setMountBarde(
      withMount({ mounts: [{ id: 'm1', catalogId: 'cheval-de-guerre', hp: {}, bardeId: 'caparacon-de-mailles' }] }),
      'm1',
      undefined,
    ).mounts?.[0];
    expect(stripped).not.toHaveProperty('bardeId');
  });

  it('setMountBarde sur une monture inconnue → patch VIDE', () => {
    expect(setMountBarde(withMount(), 'inconnue', 'barde-de-plaque')).toEqual({});
  });

  it('ownedMountMaxHp lit les PV fixes du catalogue', () => {
    expect(ownedMountMaxHp(withMount(), 'm1')).toBeGreaterThan(0);
    expect(ownedMountMaxHp(withMount(), 'inconnue')).toBeUndefined();
  });

  it('PV : dégâts plafonnés au max, soin, remise à plein — stockés INLINE sur la monture', () => {
    const c = withMount();
    const max = ownedMountMaxHp(c, 'm1')!;
    expect(damageMount(c, 'm1', 3, 'lethal').mounts?.[0].hp).toEqual({ hp: { lethal: 3, temp: 0 } });
    expect(damageMount(c, 'm1', 999, 'lethal').mounts?.[0].hp).toEqual({ hp: { lethal: max, temp: 0 } });
    const hurt = withMount({ mounts: [{ id: 'm1', catalogId: 'cheval-de-guerre', hp: { hp: { lethal: 5, temp: 0 } } }] });
    expect(healMount(hurt, 'm1', 2).mounts?.[0].hp).toEqual({ hp: { lethal: 3, temp: 0 } });
    expect(resetMountHp(hurt, 'm1').mounts?.[0].hp).toEqual({});
  });

  it('setMountHp normalise la dépletion reçue', () => {
    expect(setMountHp(withMount(), 'm1', { hp: { lethal: 0, temp: 0 } }).mounts?.[0].hp).toEqual({});
  });

  it('les PV d’une monture inconnue ne produisent aucune écriture', () => {
    expect(damageMount(withMount(), 'inconnue', 3, 'lethal')).toEqual({});
    expect(healMount(withMount(), 'inconnue', 3)).toEqual({});
    expect(resetMountHp(withMount(), 'inconnue')).toEqual({});
  });
});

describe('setDemiElfeAncestryPath (PER-324) — édition rétroactive de la voie de peuple', () => {
  // Demi-elfe de niveau 3 sur une voie CULTURELLE (elfe-haut, ranks 1-3), avec un choix sur le rang 1.
  const cultural = (): Character => ({
    ...createBlankCharacter({ now: '2026-01-01T00:00:00.000Z' }),
    ancestryId: 'demi-elfe',
    ancestryPathId: 'elfe-haut',
    level: 3,
    featureIds: ['elfe-haut-r1', 'elfe-haut-r2', 'elfe-haut-r3', 'combat-r1'],
    featureChoices: { 'elfe-haut-r1': ['x'], 'combat-r1': ['y'] },
    levelUpHistory: [
      { level: 1, chosenFeatureIds: ['elfe-haut-r1', 'combat-r1'] },
      { level: 2, chosenFeatureIds: ['elfe-haut-r2'] },
      { level: 3, chosenFeatureIds: ['elfe-haut-r3'] },
    ],
  });

  it('bascule sur la Voie du demi-elfe : remappe les capacités de voie de peuple, purge leurs choix, fixe l’ascendance', () => {
    const patch = setDemiElfeAncestryPath(cultural(), 'demi-elfe', 'elfe-sylvain');
    expect(patch.ancestryPathId).toBe('demi-elfe');
    expect(patch.demiElfeElfAncestry).toBe('elfe-sylvain');
    // Rangs de voie de peuple remappés (même numéro), capacité HORS voie de peuple intacte.
    expect(patch.featureIds).toEqual(['demi-elfe-r1', 'demi-elfe-r2', 'demi-elfe-r3', 'combat-r1']);
    // Choix de l'ANCIENNE voie de peuple purgé ; les autres choix conservés.
    expect(patch.featureChoices).toEqual({ 'combat-r1': ['y'] });
    // Historique de montée de niveau remappé lui aussi.
    expect(patch.levelUpHistory?.[0].chosenFeatureIds).toEqual(['demi-elfe-r1', 'combat-r1']);
    expect(patch.levelUpHistory?.[2].chosenFeatureIds).toEqual(['demi-elfe-r3']);
  });

  it('revient à une voie culturelle : efface l’ascendance elfe (champ sans objet hors voie Compagnon)', () => {
    const onCompanion: Character = {
      ...cultural(),
      ancestryPathId: 'demi-elfe',
      demiElfeElfAncestry: 'elfe-haut',
      featureIds: ['demi-elfe-r1', 'demi-elfe-r2', 'demi-elfe-r3'],
      featureChoices: { 'demi-elfe-r1': ['city-dweller'] },
      levelUpHistory: [{ level: 1, chosenFeatureIds: ['demi-elfe-r1'] }],
    };
    const patch = setDemiElfeAncestryPath(onCompanion, 'humain');
    expect(patch.ancestryPathId).toBe('humain');
    expect(patch.demiElfeElfAncestry).toBeUndefined();
    expect(patch.featureIds).toEqual(['humain-r1', 'humain-r2', 'humain-r3']);
    expect(patch.featureChoices).toEqual({});
  });

  it('ne renvoie aucun patch quand voie et ascendance sont déjà les valeurs demandées', () => {
    const onCompanion: Character = {
      ...cultural(),
      ancestryPathId: 'demi-elfe',
      demiElfeElfAncestry: 'elfe-sylvain',
    };
    expect(setDemiElfeAncestryPath(onCompanion, 'demi-elfe', 'elfe-sylvain')).toEqual({});
  });
});
