/**
 * Actions de JEU de la fiche de personnage (PER-257) — interrupteurs d'effets, compteurs
 * d'usages, élixirs, objets consommés, équipement porté, points de vie (personnage,
 * compagnons, montures), invocations, repos et bourse.
 *
 * Ces actions vivaient jusqu'ici en fermetures dans `src/app/character/[id]/page.tsx`, donc
 * hors de portée des tests. Chacune est ici une fonction PURE
 * `(character, arguments) => Partial<Character>` : elle lit le personnage, renvoie le
 * CORRECTIF à appliquer, et ne connaît ni React, ni le store, ni l'URL. Le branchement sur
 * `upsert` relève du hook `useCharacterGameState`.
 *
 * Deux conventions valables pour tout le module :
 *
 *  - **Patch vide = ne rien écrire.** Un `{}` signifie « aucun changement » (garde-fou non
 *    satisfait : réserve d'élixir insuffisante, monture inconnue, capacité sans instances…).
 *    L'appelant NE DOIT PAS persister un patch vide : le store applique `updatedAt` et
 *    déclencherait une écriture cloud inutile. C'est ce que faisaient les `return;` de la page.
 *  - **Maxima dérivés en argument.** Les plafonds qui dépendent du moteur (`deriveStats` :
 *    PV, mana, chance, dés de récupération) sont FOURNIS par l'appelant, qui les a déjà
 *    calculés pour l'affichage — plutôt que recalculés ici. Les maxima dérivables du
 *    personnage seul (compagnons, montures) sont, eux, résolus dans ce module.
 *
 * Aucune règle n'est réécrite ici : c'est un déplacement de code à comportement identique.
 */
import { featureById } from '@/data';
import { parseCoinPouchName, type CoinPouchInfo } from './coinPouch';
import type {
  PoisonKind,
  StartingEquipmentChoiceOption,
  WeaponModificationLoadout,
} from '@/data/schema';
import type {
  Character,
  CustomItem,
  Depletion,
  EquipmentLine,
  LoadedAmmunitionKind,
  OwnedMount,
  PoisonApplication,
  Purse,
  WornState,
} from './types';
import { isPoisonableWeaponLine, poisonLoadoutFeature } from './poison';
import { isCustomItem } from './types';
import {
  conditionalEffectsOf,
  effectContext,
  resetUsageCounters,
  setEffectToggle,
  shortRestLockKey,
  usageCounterMaximum,
} from './effects';
import {
  applyDamage,
  healHp,
  pruneDepletion,
  resetHp,
  resetLuck,
  resetMana,
  restoreLuck,
  restoreMana,
  setRecoveryDiceMissing,
  spendLuck,
  spendMana,
} from './gauges';
import { longRest, shortRest } from './rest';
import { oneHandableWeaponFamilies, setWornAt } from './equipment';
import {
  hasItemCharges,
  refillItemCharges as refillCharges,
  restoreItemCharge as restoreCharge,
  spendItemCharge as spendCharge,
} from './itemCharges';
import {
  fireShot,
  loadShot,
  loadingContext,
  refillWeapon,
  setWeaponModification as setWeaponMod,
} from './weaponLoading';
import { elixirItemName, isElixirItemName } from './elixirs';
import {
  companionMountEnSelle,
  effectiveCreatureProfile,
  listCompanions,
  parseCompanionKey,
  resolveCompanionInstanceLimit,
  resolveCreatureMaxHp,
} from './companions';
import { enSelleLink, mountCatalogEntry, mountMaxHp } from './mounts';
import { startingChoiceOptionsFor } from './startingChoices';
import { newId } from './factory';

// ---------------------------------------------------------------------------
// Interrupteurs d'effets, compteurs d'usages, verrou de repos court
// ---------------------------------------------------------------------------

/**
 * PER-216 : mutateur central de l'état « en selle ». Clé UNIQUE (`mountedKey`) → exclusivité
 * structurelle (une seule monture montée). Synchronise l'interrupteur « en selle » du cavalier
 * (`enSelleLink`) = « une monture est montée » : mécanique GÉNÉRIQUE, n'importe quelle monture
 * (possédée ou de voie) garde Cavalier émérite actif. `null` = à pied.
 */
export function setMountedTarget(character: Character, key: string | null): Partial<Character> {
  const patch: Partial<Character> = { mountedKey: key ?? undefined };
  const link = enSelleLink(character);
  if (link) patch.effectToggles = setEffectToggle(character, link.featureId, link.index, key != null);
  return patch;
}

/**
 * Bascule d'un interrupteur d'effet conditionnel/temporaire (PER-67). Recalcul en direct : le
 * moteur n'inclut l'effet que lorsqu'il est actif.
 *
 * Trois effets de bord portés par le compteur d'usages de la capacité :
 *  - `consumeOnActivate` (défaut) : ACTIVER un état TEMPORAIRE à compteur le CONSOMME (PER-130) ;
 *  - `oncePerShortRest` : cette dépense pose le verrou « repos court requis » (PER-161) ;
 *  - `resetOnActivate` : le compteur de SUIVI repart à PLEIN (PER-150).
 */
export function toggleEffect(
  character: Character,
  featureId: string,
  index: number,
  active: boolean,
): Partial<Character> {
  // PER-216 : l'interrupteur « en selle » du cavalier n'est pas piloté en direct — c'est un état
  // DÉRIVÉ de la monture chevauchée. Le basculer depuis la carte de voie = monter/démonter la
  // monture de VOIE (délégué à `setMountedTarget`, qui resync l'interrupteur et garde l'exclusivité).
  const enSelle = enSelleLink(character);
  if (enSelle && enSelle.featureId === featureId && enSelle.index === index) {
    const voieMount = listCompanions(character).find((e) => companionMountEnSelle(character, e) !== null);
    return setMountedTarget(character, active ? voieMount?.key ?? null : null);
  }
  const nextToggles = setEffectToggle(character, featureId, index, active);
  const patch: Partial<Character> = { effectToggles: nextToggles };
  // PER-130 : ACTIVER un état TEMPORAIRE doté d'un compteur d'usages le CONSOMME (ex. Rage / Furie
  // du berserk) — équivaut à un clic « − » de `cost`, clampé à [0, max] (jamais sous 0). Pas de
  // remboursement à l'extinction (comme le « − »). Les autres interrupteurs ne touchent pas le compteur.
  const feature = featureById.get(featureId);
  const effect = feature?.effects?.[index];
  const counter = feature?.usageCounter;
  if (
    active &&
    feature &&
    counter &&
    counter.consumeOnActivate !== false &&
    effect?.kind === 'conditional-stat-bonus' &&
    effect.activation.kind === 'temporary'
  ) {
    const key = counter.sharedKey ?? feature.id;
    const max = usageCounterMaximum(counter, character, feature);
    const cost = counter.cost ?? 1;
    const remaining = Math.max(0, Math.min(max, character.usageCounters?.[key] ?? max));
    const nextVal = Math.max(0, remaining - cost);
    const nextCounters = { ...character.usageCounters };
    if (nextVal >= max) delete nextCounters[key];
    else nextCounters[key] = nextVal;
    // PER-161 : si le compteur est verrouillé « 1 dépense par repos court » (`oncePerShortRest`,
    // ex. Sanctuaire), activer l'interrupteur pose le verrou (miroir du « − » de `setUsageCounter`)
    // — la réactivation reste bloquée jusqu'au prochain repos court, indépendamment du reste.
    if (counter.oncePerShortRest && nextVal < remaining) nextCounters[shortRestLockKey(key)] = 1;
    patch.usageCounters = nextCounters;
  }
  // PER-150 : ACTIVER un effet temporaire doté d'un compteur de SUIVI `resetOnActivate` le remet à
  // PLEIN (absorption d'Armure de pierre rechargée au relancement du sort). Absence de clé = plein.
  // NB : ce bloc REMPLACE le patch de consommation ci-dessus quand les deux s'appliquent. Aucune
  // capacité ne cumule aujourd'hui `consumeOnActivate` et `resetOnActivate` (Armure de pierre, seul
  // porteur de `resetOnActivate`, déclare `consumeOnActivate: false`) — comportement d'origine conservé.
  if (
    active &&
    feature &&
    counter?.resetOnActivate &&
    effect?.kind === 'conditional-stat-bonus' &&
    effect.activation.kind === 'temporary'
  ) {
    const key = counter.sharedKey ?? feature.id;
    const nextCounters = { ...character.usageCounters };
    delete nextCounters[key];
    patch.usageCounters = nextCounters;
  }
  return patch;
}

/**
 * Saisie libre d'état de jeu corrélée à une capacité (PER-70, ex. animal de Forme animale).
 * Une chaîne vide supprime la clé (pas de note fantôme).
 */
export function setEffectInput(
  character: Character,
  featureId: string,
  value: string,
): Partial<Character> {
  const next = { ...character.effectInputs };
  if (value.trim() === '') delete next[featureId];
  else next[featureId] = value;
  return { effectInputs: next };
}

/**
 * Décompte d'une capacité à usages limités (PER-70, ex. Les sept vies du chat). Borné à
 * `[0, max]` ; au maximum, on supprime la clé (= compteur plein par défaut). La CLÉ peut être
 * une `sharedKey` (réserve partagée, PER-119) et non un id de capacité → le max effectif
 * (constant ou scalant) est calculé par l'appelant et fourni ici, plutôt que relu via l'id.
 */
export function setUsageCounter(
  character: Character,
  counterKey: string,
  value: number,
  max: number,
): Partial<Character> {
  // PER-162 : compteur CROISSANT (surcoût mana, ex. Foudres divines) — sémantique inverse : pas de
  // plafond, baseline = 0 (clé absente), aucun verrou. `counterKey` = id de la capacité.
  const escalating = featureById.get(counterKey)?.escalatingManaCost;
  if (escalating) {
    const raised = Math.max(0, value);
    const nextEsc = { ...character.usageCounters };
    if (raised <= 0) delete nextEsc[counterKey];
    else nextEsc[counterKey] = raised;
    return { usageCounters: nextEsc };
  }
  const clamped = Math.max(0, Math.min(max, value));
  const next = { ...character.usageCounters };
  if (clamped >= max) delete next[counterKey];
  else next[counterKey] = clamped;
  const patch: Partial<Character> = { usageCounters: next };
  // PER-150 : un compteur de SUIVI `endsEffectAtZero` qui tombe à 0 COUPE l'interrupteur des effets
  // de la capacité porteuse (Armure de pierre prend fin dès son plafond d'absorption atteint). La
  // clé du compteur vaut alors l'id de la capacité (compteur propre, non partagé).
  const feature = featureById.get(counterKey);
  if (clamped <= 0 && feature?.usageCounter?.endsEffectAtZero) {
    let toggles = character.effectToggles;
    for (const { index } of conditionalEffectsOf(counterKey)) {
      toggles = setEffectToggle({ ...character, effectToggles: toggles }, counterKey, index, false);
    }
    patch.effectToggles = toggles;
  }
  // PER-160 : DÉPENSE (valeur en baisse) d'un compteur `oncePerShortRest` → pose le verrou « repos
  // court requis avant un nouvel usage » (levé par tout repos court/long). Incrément/reset : rien.
  if (feature?.usageCounter?.oncePerShortRest) {
    const prev = character.usageCounters?.[counterKey] ?? max;
    if (clamped < prev) next[shortRestLockKey(counterKey)] = 1;
  }
  return patch;
}

/**
 * PER-160/161 : lever le verrou « repos court requis » d'UNE capacité sans forcer un vrai repos —
 * pour ne jamais OBLIGER le joueur à cliquer « Repos court » (usage app-first). Applique EXACTEMENT
 * l'effet d'un repos court, mais restreint à cette seule capacité (mêmes déclencheurs que
 * `shortRest` : lève le verrou `oncePerShortRest` et recharge ce qu'un repos court rechargerait —
 * ex. la charge de Sanctuaire ; la réserve /jour de Transe reste inchangée, comme lors d'un vrai
 * repos court).
 */
export function liftShortRestLock(character: Character, featureId: string): Partial<Character> {
  return {
    usageCounters: resetUsageCounters(
      character.usageCounters,
      [featureId],
      new Set(['short-rest', 'combat']),
      character.featureChoices,
    ),
  };
}

// ---------------------------------------------------------------------------
// Élixirs (voie des élixirs, p. 98)
// ---------------------------------------------------------------------------

/**
 * Créer un élixir (forgesort, p. 98) : consomme la réserve partagée d'un cran (`cost`) ET
 * matérialise la dose dans l'équipement (objet custom, quantité incrémentée si déjà présent).
 * Les deux mutations partent dans UN seul patch, pour ne pas s'écraser l'une l'autre.
 * Matérialisation minimale (le transfert à un autre personnage relève de PER-158).
 *
 * Réserve insuffisante → patch VIDE (aucune écriture).
 */
export function createElixir(
  character: Character,
  args: { counterKey: string; cost: number; max: number; elixirName: string },
): Partial<Character> {
  const { counterKey, cost, max, elixirName } = args;
  const remaining = Math.max(0, Math.min(max, character.usageCounters?.[counterKey] ?? max));
  if (remaining < cost) return {};
  const usageCounters = { ...character.usageCounters };
  const nextValue = remaining - cost;
  if (nextValue >= max) delete usageCounters[counterKey];
  else usageCounters[counterKey] = nextValue;
  const itemName = elixirItemName(elixirName);
  const equipment = [...character.equipment];
  const idx = equipment.findIndex((line) => isCustomItem(line) && line.name === itemName);
  if (idx >= 0) {
    const line = equipment[idx] as CustomItem;
    equipment[idx] = { ...line, quantity: line.quantity + 1 };
  } else {
    equipment.push({
      custom: true,
      name: itemName,
      quantity: 1,
      details: 'Élixir préparé (voie des élixirs, p. 98).',
    });
  }
  return { usageCounters, equipment };
}

/**
 * Doses d'élixir en inventaire, perdues par un repos long (voie des élixirs, p. 98 : « Les élixirs
 * qui ne sont pas utilisés le jour même sont perdus ») — alimente l'avertissement du bouton de repos.
 */
export function elixirDosesToLose(character: Character): number {
  return character.equipment.reduce(
    (n, line) => (isCustomItem(line) && isElixirItemName(line.name) ? n + line.quantity : n),
    0,
  );
}

// ---------------------------------------------------------------------------
// Objets & équipement porté
// ---------------------------------------------------------------------------

/** Consomme une unité de la ligne `index` : décrémente la quantité, retire la ligne à 0. */
export function consumeEquipmentLine(character: Character, index: number): EquipmentLine[] {
  const line = character.equipment[index];
  if (!line) return character.equipment;
  return line.quantity <= 1
    ? character.equipment.filter((_, j) => j !== index)
    : character.equipment.map((l, j) => (j === index ? { ...l, quantity: l.quantity - 1 } : l));
}

/**
 * Ce que « Utiliser » doit déclencher sur la ligne `index` (PER-158). Deux objets du sac de départ
 * ne se consomment pas directement mais ouvrent une modale de saisie — d'où cette INTENTION plutôt
 * qu'un patch : la décision est pure et testable, l'ouverture de la modale reste à l'UI.
 *
 *  - `starting-choice` : choix d'équipement de départ à résoudre (PER-220) ;
 *  - `coin-pouch` : bourse de pièces (p. 31, généralisée PER-200 — « Bourse de NdM
 *    {pp|po|pa|pc} », cf. `parseCoinPouchName`) : le montant tiré s'ajoute à la monnaie
 *    concernée (PER-152) ;
 *  - `consume` : consommation directe, avec son patch prêt à appliquer ;
 *  - `none` : ligne inexistante, rien à faire.
 */
export type UseItemIntent =
  | { kind: 'starting-choice'; index: number }
  | { kind: 'coin-pouch'; index: number; info: CoinPouchInfo }
  | { kind: 'consume'; patch: Partial<Character> }
  | { kind: 'none' };

/** Résout l'intention d'un clic « Utiliser » sur la ligne `index` (cf. `UseItemIntent`). */
export function useEquipmentItem(character: Character, index: number): UseItemIntent {
  const line = character.equipment[index];
  if (!line) return { kind: 'none' };
  // Choix d'équipement de départ à résoudre (PER-220) : ouvre la modale de choix.
  if (startingChoiceOptionsFor(line)) return { kind: 'starting-choice', index };
  const pouchInfo = isCustomItem(line) ? parseCoinPouchName(line.name) : null;
  if (pouchInfo) return { kind: 'coin-pouch', index, info: pouchInfo };
  // Objet à CHARGES (PER-294) : « Utiliser » dépense une CHARGE et ne retire jamais la ligne — un
  // objet rechargeable ne disparaît pas quand on l'épuise. Prime sur la consommation, pour qu'une
  // fiole typée « consommable » mais dotée de charges se comporte comme la baguette qu'elle est.
  if (hasItemCharges(line)) return { kind: 'consume', patch: spendItemChargeAction(character, index) };
  return { kind: 'consume', patch: { equipment: consumeEquipmentLine(character, index) } };
}

/**
 * Validation de la modale de bourse (p. 31, généralisée PER-200) : ajoute `amount` à la
 * monnaie de la bourse (déterminée par son NOM, cf. `parseCoinPouchName`) et consomme la
 * dose, en UNE écriture. Retombe sur l'argent (comportement d'origine) si le nom n'est,
 * contre toute attente, plus reconnu au moment de la validation.
 */
export function openCoinPouch(
  character: Character,
  index: number,
  amount: number,
): Partial<Character> {
  const line = character.equipment[index];
  const currency = (isCustomItem(line) ? parseCoinPouchName(line.name)?.currency : null) ?? 'silver';
  return {
    equipment: consumeEquipmentLine(character, index),
    purse: { ...character.purse, [currency]: character.purse[currency] + amount },
  };
}

/**
 * Validation d'un choix d'équipement de départ (PER-220) : remplace la ligne placeholder par le(s)
 * vrai(s) objet(s) du catalogue de l'option retenue (un LOT en produit plusieurs).
 */
export function resolveStartingChoice(
  character: Character,
  index: number,
  option: StartingEquipmentChoiceOption,
): Partial<Character> {
  const chosen = option.items.map((it) => ({ itemId: it.itemId, quantity: it.quantity }));
  return {
    equipment: [
      ...character.equipment.slice(0, index),
      ...chosen,
      ...character.equipment.slice(index + 1),
    ],
  };
}

/**
 * Équiper / déséquiper une ligne (PER-77) : état de jeu (on change d'arme, on lève le bouclier),
 * donc disponible hors mode « Modifier ». Le port ne réajuste pas les autres lignes ; les conflits
 * durs sont SIGNALÉS (non bloquant), pas empêchés.
 */
export function setEquipmentWorn(
  character: Character,
  index: number,
  worn: WornState | undefined,
): Partial<Character> {
  // PER-74 : les familles d'armes maniables à une main (Poigne de fer du colosse) évitent de renvoyer
  // le bouclier au sac quand l'arme à deux mains est posée à UNE main.
  return {
    equipment: setWornAt(
      character.equipment,
      index,
      worn,
      oneHandableWeaponFamilies(character.featureIds),
    ),
  };
}

/** Bourse (PER-152) : argent possédé, état de jeu transitoire (non touché par un repos). */
export function setPurse(purse: Purse): Partial<Character> {
  return { purse };
}

// ---------------------------------------------------------------------------
// Chargement des armes (arbalètes et armes à poudre, p. 185/187, PER-284)
// ---------------------------------------------------------------------------

/**
 * Trois gestes de chargement, tous ÉTAT DE JEU (on tire, on recharge — cela arrive en pleine
 * partie, hors mode « Modifier ») : ils ne touchent que `equipment`, clé d'état de jeu synchronisée
 * en session (PER-266), donc le compteur suit en direct sur l'écran du MJ et la projection.
 *
 * Les réducteurs purs renvoient la MÊME référence quand il n'y a rien à faire (arme vide qu'on
 * essaie de tirer, arme pleine qu'on essaie de recharger) : on rend alors un patch VIDE, qui vaut
 * « aucune écriture » par contrat.
 */
export function fireWeaponShot(character: Character, index: number): Partial<Character> {
  const equipment = fireShot(character.equipment, index, loadingContext(character));
  return equipment === character.equipment ? {} : { equipment };
}

/** Recharge UN coup ; `kind` déclare la munition (grenaille annoncée au chargement, p. 63). */
export function loadWeaponShot(
  character: Character,
  index: number,
  kind?: LoadedAmmunitionKind,
): Partial<Character> {
  const equipment = loadShot(character.equipment, index, loadingContext(character), kind);
  return equipment === character.equipment ? {} : { equipment };
}

/**
 * Ajoute à l'inventaire un objet OCTROYÉ par une capacité et manquant (PER-286 — couleuvrine du
 * rang 5 de l'artilleur, ou baliste sans poudre). Déclenché par le rappel de l'inventaire, pas
 * automatiquement : la fiche est permissive, un objet retiré volontairement ne revient pas tout seul.
 *
 * Patch vide si l'objet est déjà possédé (une ligne du bon `itemId` suffit).
 */
export function addGrantedEquipment(character: Character, itemId: string): Partial<Character> {
  const owned = character.equipment.some((line) => !isCustomItem(line) && line.itemId === itemId);
  if (owned) return {};
  return { equipment: [...character.equipment, { itemId, quantity: 1 }] };
}

/**
 * POSE ou RETIRE une modification d'arme octroyée par une capacité (chargeur de l'Arme à répétition,
 * second canon du Canon double, PER-284). C'est le JOUEUR qui désigne les armes bricolées : le livre
 * dit « jusqu'à deux armes de son CHOIX » (p. 62), et `spec.maxWeapons` borne la sélection.
 *
 * Patch vide (« aucune écriture ») si la ligne est inéligible, déjà dans l'état voulu, ou si le
 * plafond est atteint.
 */
export function setWeaponModification(
  character: Character,
  index: number,
  spec: WeaponModificationLoadout,
  on: boolean,
): Partial<Character> {
  const equipment = setWeaponMod(character.equipment, index, spec, on);
  return equipment === character.equipment ? {} : { equipment };
}

/** Fait le PLEIN de l'arme (chargeur, second canon) — « une action limitée par projectile » (p. 62). */
export function refillWeaponShots(
  character: Character,
  index: number,
  kind?: LoadedAmmunitionKind,
): Partial<Character> {
  const { equipment } = refillWeapon(character.equipment, index, loadingContext(character), kind);
  return equipment === character.equipment ? {} : { equipment };
}

// ---------------------------------------------------------------------------
// Objets à charges (baguettes, sceptres, talismans — PER-294)
// ---------------------------------------------------------------------------

/**
 * Trois gestes de charge, tous ÉTAT DE JEU comme ceux du chargement des armes : ils ne touchent que
 * `equipment`, clé d'état de jeu synchronisée en session (PER-266), donc le compteur de charges suit
 * en direct sur l'écran du MJ et la projection. Même contrat de no-op : un réducteur qui rend la
 * MÊME référence donne un patch VIDE, qui vaut « aucune écriture ».
 *
 * À la différence d'un consommable (`useEquipmentItem`), épuiser un objet à charges ne le retire
 * JAMAIS de l'inventaire : il attend d'être rechargé.
 */
export function spendItemChargeAction(character: Character, index: number): Partial<Character> {
  const equipment = spendCharge(character.equipment, index);
  return equipment === character.equipment ? {} : { equipment };
}

/** Rend UNE charge à l'objet (geste manuel, toujours disponible quel que soit le réglage de repos). */
export function restoreItemChargeAction(character: Character, index: number): Partial<Character> {
  const equipment = restoreCharge(character.equipment, index);
  return equipment === character.equipment ? {} : { equipment };
}

/** Fait le PLEIN des charges de l'objet d'un seul geste. */
export function refillItemChargesAction(character: Character, index: number): Partial<Character> {
  const equipment = refillCharges(character.equipment, index);
  return equipment === character.equipment ? {} : { equipment };
}

// ---------------------------------------------------------------------------
// Poison appliqué aux armes (voie du maître des poisons, p. 143, PER-74)
// ---------------------------------------------------------------------------

/**
 * Enduit de poison l'arme de l'inventaire à `index` (voie du maître des poisons, p. 143, PER-74). État
 * de jeu (hors mode « Modifier »). Assigne un `instanceId` STABLE à la ligne si elle n'en a pas, puis
 * ajoute une charge `{ instanceId, kind, spent: false }`. Sans effet (patch vide) si la ligne n'est pas
 * une arme enduisable, si elle est DÉJÀ enduite, ou si le plafond `maxWeapons` est atteint. L'`equipment`
 * n'est renvoyé que si un `instanceId` a réellement été assigné (sinon patch purement état de jeu).
 */
export function applyPoisonToWeapon(
  character: Character,
  index: number,
  kind: PoisonKind,
): Partial<Character> {
  const loadout = poisonLoadoutFeature(character)?.loadout;
  if (!loadout) return {};
  const line = character.equipment[index];
  if (!line || !isPoisonableWeaponLine(line)) return {};
  if (line.instanceId && character.poisonedWeapons.some((p) => p.instanceId === line.instanceId)) {
    return {}; // déjà enduite
  }
  if (character.poisonedWeapons.length >= loadout.maxWeapons) return {};

  const instanceId = line.instanceId ?? newId();
  const patch: Partial<Character> = {
    poisonedWeapons: [...character.poisonedWeapons, { instanceId, kind, spent: false }],
  };
  if (!line.instanceId) {
    patch.equipment = character.equipment.map((l, i) => (i === index ? { ...line, instanceId } : l));
  }
  return patch;
}

/** Change la nature du poison d'une arme enduite (r6 : rapide ⇄ affaiblissant, échangeable librement). */
export function setPoisonKind(
  character: Character,
  instanceId: string,
  kind: PoisonKind,
): Partial<Character> {
  return {
    poisonedWeapons: character.poisonedWeapons.map((p) =>
      p.instanceId === instanceId ? { ...p, kind } : p,
    ),
  };
}

/** Marque une charge de poison comme dépensée (première attaque portée) ou ré-enduite (`spent`). */
export function setPoisonSpent(
  character: Character,
  instanceId: string,
  spent: boolean,
): Partial<Character> {
  return {
    poisonedWeapons: character.poisonedWeapons.map((p) =>
      p.instanceId === instanceId ? { ...p, spent } : p,
    ),
  };
}

/** Retire le poison d'une arme (l'`instanceId` reste sur la ligne d'équipement — inoffensif). */
export function removePoisonFromWeapon(character: Character, instanceId: string): Partial<Character> {
  return {
    poisonedWeapons: character.poisonedWeapons.filter((p) => p.instanceId !== instanceId),
  };
}

// ---------------------------------------------------------------------------
// Jauges du personnage : PV, mana, chance, dés de récupération
// ---------------------------------------------------------------------------

/**
 * Jauge de PV (PER-148) : dépletion transitoire (manque létal/temp), état de jeu modifiable HORS
 * mode « Modifier » (comme les compteurs d'usages). Le max reste piloté par « Statistiques
 * dérivées » ; ces actions ne touchent que le courant.
 *
 * `maxHp` = max EFFECTIF (surcharge manuelle ?? dérivé), fourni par l'appelant : le manque y est
 * plafonné, si bien qu'on ne descend jamais sous 0 PV et que le manque ne s'accumule pas au-delà
 * (sinon les « − » à vide exigeraient autant de soins pour remonter).
 */
export function damageCharacterHp(
  character: Character,
  amount: number,
  kind: 'lethal' | 'temp',
  maxHp?: number,
): Partial<Character> {
  return { depletion: applyDamage(character.depletion, amount, kind, maxHp) };
}

export function healCharacterHp(character: Character, amount: number): Partial<Character> {
  return { depletion: healHp(character.depletion, amount) };
}

export function resetCharacterHp(character: Character): Partial<Character> {
  return { depletion: resetHp(character.depletion) };
}

/**
 * Réserve de mana EFFECTIVE (PER-149) : `max` = surcharge manuelle ?? valeur dérivée, fourni par
 * l'appelant (un personnage sans sort n'a pas de jauge de mana → `max` valant 0).
 */
export function spendCharacterMana(
  character: Character,
  amount: number,
  max: number,
): Partial<Character> {
  return { depletion: spendMana(character.depletion, amount, max) };
}

export function restoreCharacterMana(
  character: Character,
  amount: number,
  max: number,
): Partial<Character> {
  return { depletion: restoreMana(character.depletion, amount, max) };
}

export function resetCharacterMana(character: Character): Partial<Character> {
  return { depletion: resetMana(character.depletion) };
}

/** Points de chance (PER-155) : `max` = max EFFECTIF (surcharge ?? dérivé). Universel. */
export function spendCharacterLuck(
  character: Character,
  amount: number,
  max: number,
): Partial<Character> {
  return { depletion: spendLuck(character.depletion, amount, max) };
}

export function restoreCharacterLuck(
  character: Character,
  amount: number,
  max: number,
): Partial<Character> {
  return { depletion: restoreLuck(character.depletion, amount, max) };
}

export function resetCharacterLuck(character: Character): Partial<Character> {
  return { depletion: resetLuck(character.depletion) };
}

/**
 * Dés de récupération (PER-151) : on fixe le nombre de DR DISPONIBLES (le manque = max − dispo),
 * `max` étant le max EFFECTIF (surcharge ?? dérivé) fourni par l'appelant.
 */
export function setAvailableRecoveryDice(
  character: Character,
  value: number,
  max: number,
): Partial<Character> {
  return { depletion: setRecoveryDiceMissing(character.depletion, max - value, max) };
}

// ---------------------------------------------------------------------------
// Repos (PER-151)
// ---------------------------------------------------------------------------

/**
 * Repos court : applique la récupération réglementaire. `recoveryDieRoll` = résultat du dé SAISI
 * pour dépenser 1 DR et soigner (les dés se lancent à la vraie table) ; `null` = repos sans soin.
 */
export function applyShortRest(
  character: Character,
  recoveryDieRoll: number | null,
  recoveryDiceMax: number,
  extraHeal = 0,
): Partial<Character> {
  return shortRest(
    character,
    recoveryDieRoll != null ? { dieRoll: recoveryDieRoll, recoveryDiceMax, extraHeal } : undefined,
  );
}

/**
 * Repos long : `heal` → dépenser le DR gagné pour un soin à la valeur MAX du dé (p. 222).
 * `recoveryDie` est le type de dé de récupération du personnage (`'d6'`, `'d8'`…), dont on tire
 * le nombre de faces.
 */
export function applyLongRest(
  character: Character,
  heal: boolean,
  recoveryDie: string,
  extraHeal = 0,
): Partial<Character> {
  return longRest(
    character,
    heal ? { dieFaces: Number.parseInt(recoveryDie.slice(1), 10) || 0, extraHeal } : undefined,
  );
}

// ---------------------------------------------------------------------------
// Demi-elfe — voie de peuple « version Le Compagnon » (PER-324, édition rétroactive)
// ---------------------------------------------------------------------------

/**
 * Change la VOIE DE PEUPLE d'un demi-elfe APRÈS création (le wizard ne permet pas de la modifier),
 * via la modale dédiée de la section Identité. Bascule entre les voies culturelles du livre de base
 * (`humain`/`elfe-haut`/`elfe-sylvain`) et la « Voie du demi-elfe » optionnelle (`demi-elfe`, Le Compagnon).
 *
 * Remappe les capacités de voie de peuple ACQUISES (`<voie>-rN` → `<nouvelle voie>-rN`, même rang), dans
 * `featureIds` ET dans l'historique de montée de niveau, et PURGE les choix (`featureChoices`) attachés
 * aux rangs de l'ancienne voie (ils ne se transposent pas d'une voie à l'autre — à re-régler ensuite).
 * `elfAncestry` n'est conservé que pour la voie `demi-elfe` (détermine « Sang féerique », rang 4) ; il est
 * effacé pour une voie culturelle. Patch vide si rien ne change.
 */
export function setDemiElfeAncestryPath(
  character: Character,
  newPathId: string,
  elfAncestry?: 'elfe-haut' | 'elfe-sylvain',
): Partial<Character> {
  const oldPathId = character.ancestryPathId;
  const nextElf = newPathId === 'demi-elfe' ? (elfAncestry ?? 'elfe-haut') : undefined;
  if (oldPathId === newPathId && character.demiElfeElfAncestry === nextElf) return {};

  const remapId = (id: string): string => {
    if (!oldPathId) return id;
    const m = new RegExp(`^${oldPathId}-r(\\d+)$`).exec(id);
    return m ? `${newPathId}-r${m[1]}` : id;
  };
  const featureIds = character.featureIds.map(remapId);
  const levelUpHistory = character.levelUpHistory.map((entry) => ({
    ...entry,
    chosenFeatureIds: entry.chosenFeatureIds.map(remapId),
  }));
  // Purge les choix des rangs de l'ANCIENNE voie de peuple (non transposables).
  const featureChoices = { ...character.featureChoices };
  if (oldPathId) {
    const oldRankRe = new RegExp(`^${oldPathId}-r\\d+$`);
    for (const key of Object.keys(featureChoices)) if (oldRankRe.test(key)) delete featureChoices[key];
  }
  return {
    ancestryPathId: newPathId,
    demiElfeElfAncestry: nextElf,
    featureIds,
    featureChoices,
    levelUpHistory,
  };
}

// ---------------------------------------------------------------------------
// Compagnons (PER-233 / PER-235)
// ---------------------------------------------------------------------------

/**
 * PV MAXIMUM d'un compagnon, résolus depuis son `CreatureProfile` (caractéristiques effectives du
 * maître, niveau, rang de voie). `undefined` si la clé ne désigne aucun compagnon vivant, ou si le
 * profil ne déclare pas de PV.
 */
export function companionMaxHp(character: Character, key: string): number | undefined {
  const entry = listCompanions(character).find((c) => c.key === key);
  if (!entry) return undefined;
  const abilities = effectContext(character).abilities;
  return resolveCreatureMaxHp(entry.profile, abilities, character.level, entry.pathRank) ?? undefined;
}

/**
 * PV des COMPAGNONS (PER-233) : même mécanique que la barre du joueur, indexée par la clé du
 * compagnon (id du rang porteur, ou clé composite d'instance). Une entrée redevenue pleine est
 * retirée (clé absente = compagnon à PV pleins).
 */
export function setCompanionDepletion(
  character: Character,
  key: string,
  next: Depletion,
): Partial<Character> {
  const companionDepletion = { ...character.companionDepletion };
  const pruned = pruneDepletion(next);
  if (Object.keys(pruned).length === 0) delete companionDepletion[key];
  else companionDepletion[key] = pruned;
  return { companionDepletion };
}

/**
 * Dégâts sur un compagnon. Le manque est plafonné au max EFFECTIF de la créature.
 *
 * Zombie réduit à 0 PV → « tombe en poussière » (p. 109) : l'instance est auto-supprimée et libère
 * un emplacement (PER-235). Ne concerne que les compagnons multi-instances (clé composite) ; les
 * compagnons classiques restent affichés à 0 PV (à terre / assommé).
 */
export function damageCompanion(
  character: Character,
  key: string,
  amount: number,
  kind: 'lethal' | 'temp',
): Partial<Character> {
  const max = companionMaxHp(character, key);
  const next = applyDamage(character.companionDepletion[key] ?? {}, amount, kind, max);
  const { instanceId } = parseCompanionKey(key);
  if (instanceId !== undefined && max !== undefined) {
    const current = max - (next.hp?.lethal ?? 0) - (next.hp?.temp ?? 0);
    if (current <= 0) return removeCompanionInstance(character, key);
  }
  return setCompanionDepletion(character, key, next);
}

export function healCompanion(
  character: Character,
  key: string,
  amount: number,
): Partial<Character> {
  return setCompanionDepletion(character, key, healHp(character.companionDepletion[key] ?? {}, amount));
}

export function resetCompanionHp(character: Character, key: string): Partial<Character> {
  return setCompanionDepletion(character, key, resetHp(character.companionDepletion[key] ?? {}));
}

/**
 * Invocation d'un nouvel exemplaire d'un compagnon multi-instances (zombie, PER-235) : ajoute un id
 * d'instance frais dans la limite du profil (garde-fou redondant avec le badge désactivé). Capacité
 * non multi-instances ou limite atteinte → patch VIDE.
 *
 * `instanceId` est injectable pour rendre l'action déterministe en test ; en production, l'id frais
 * par défaut suffit.
 */
export function summonCompanionInstance(
  character: Character,
  featureId: string,
  instanceId: string = newId(),
): Partial<Character> {
  const feature = featureById.get(featureId);
  const profile = feature ? effectiveCreatureProfile(feature, character) : undefined;
  if (!profile?.instances) return {};
  const list = character.companionInstances[featureId] ?? [];
  if (list.length >= resolveCompanionInstanceLimit(profile, character)) return {};
  return {
    companionInstances: { ...character.companionInstances, [featureId]: [...list, instanceId] },
  };
}

/**
 * Suppression d'une instance (corbeille manuelle OU auto-suppression à 0 PV) : retire l'id de
 * `companionInstances` et purge ses PV (`companionDepletion`) sous la clé composite (PER-235).
 * Clé non composite (compagnon classique) → patch VIDE.
 */
export function removeCompanionInstance(character: Character, key: string): Partial<Character> {
  const { featureId, instanceId } = parseCompanionKey(key);
  if (instanceId === undefined) return {};
  const list = (character.companionInstances[featureId] ?? []).filter((id) => id !== instanceId);
  const companionInstances = { ...character.companionInstances };
  if (list.length > 0) companionInstances[featureId] = list;
  else delete companionInstances[featureId];
  const companionDepletion = { ...character.companionDepletion };
  delete companionDepletion[key];
  return { companionInstances, companionDepletion };
}

// ---------------------------------------------------------------------------
// Montures & véhicules possédés (PER-216)
// ---------------------------------------------------------------------------
// Possessions rattachées comme compagnons, hors inventaire. Ajout/retrait/barde disponibles hors
// mode édition (comme l'invocation d'instances) ; les PV vivent INLINE sur chaque `OwnedMount.hp`
// (état de jeu propre à la monture).

/** Applique un correctif à une monture possédée (identité par `id`). */
export function updateMount(
  character: Character,
  id: string,
  patch: Partial<OwnedMount>,
): Partial<Character> {
  return { mounts: character.mounts.map((m) => (m.id === id ? { ...m, ...patch } : m)) };
}

/** Ajoute une monture de catalogue. `id` est injectable pour rendre l'action déterministe en test. */
export function addMount(
  character: Character,
  catalogId: string,
  id: string = newId(),
): Partial<Character> {
  return { mounts: [...character.mounts, { id, catalogId, hp: {} }] };
}

export function removeMount(character: Character, id: string): Partial<Character> {
  return { mounts: character.mounts.filter((m) => m.id !== id) };
}

/**
 * Change (ou retire, `undefined`) la barde d'une monture : on omet la clé quand aucune barde n'est
 * portée pour garder le blob propre (une barde absente n'est pas `bardeId: undefined`). Monture
 * inconnue → patch VIDE.
 */
export function setMountBarde(
  character: Character,
  id: string,
  bardeId: string | undefined,
): Partial<Character> {
  const mount = character.mounts.find((m) => m.id === id);
  if (!mount) return {};
  const next: OwnedMount = { ...mount };
  if (bardeId) next.bardeId = bardeId;
  else delete next.bardeId;
  return { mounts: character.mounts.map((m) => (m.id === id ? next : m)) };
}

/** PV max d'une monture possédée (valeur fixe du catalogue). `undefined` = pas de barre de vie. */
export function ownedMountMaxHp(character: Character, id: string): number | undefined {
  const mount = character.mounts.find((m) => m.id === id);
  return mount ? mountMaxHp(mountCatalogEntry(mount)) ?? undefined : undefined;
}

/** PV : mêmes helpers que le personnage/compagnons, mais l'état est stocké inline sur la monture. */
export function setMountHp(character: Character, id: string, next: Depletion): Partial<Character> {
  return updateMount(character, id, { hp: pruneDepletion(next) });
}

export function damageMount(
  character: Character,
  id: string,
  amount: number,
  kind: 'lethal' | 'temp',
): Partial<Character> {
  const mount = character.mounts.find((m) => m.id === id);
  if (!mount) return {};
  return setMountHp(
    character,
    id,
    applyDamage(mount.hp ?? {}, amount, kind, ownedMountMaxHp(character, id)),
  );
}

export function healMount(character: Character, id: string, amount: number): Partial<Character> {
  const mount = character.mounts.find((m) => m.id === id);
  if (!mount) return {};
  return setMountHp(character, id, healHp(mount.hp ?? {}, amount));
}

export function resetMountHp(character: Character, id: string): Partial<Character> {
  const mount = character.mounts.find((m) => m.id === id);
  if (!mount) return {};
  return setMountHp(character, id, resetHp(mount.hp ?? {}));
}

/**
 * Bascule « en selle » d'une monture POSSÉDÉE (état de jeu) — délègue au mutateur exclusif : monter
 * `id` démonte automatiquement toute autre monture (possédée ou de voie), démonter `id` repasse à pied.
 */
export function setMountMounted(character: Character, id: string, on: boolean): Partial<Character> {
  return setMountedTarget(character, on ? id : null);
}
