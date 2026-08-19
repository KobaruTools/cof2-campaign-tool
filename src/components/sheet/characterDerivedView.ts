/**
 * Vue « statistiques dérivées » d'un personnage — calcul PUR partagé (PER, écran
 * de MJ). Rassemble en un seul endroit la construction de l'entrée moteur
 * (`DerivedInput`) et des badges (immunités, réductions de dégâts, plages de
 * critique) telle qu'elle vivait, inline, dans la fiche de personnage. La fiche
 * ET l'écran de MJ passent désormais par ici : source unique, aucune dérive
 * possible entre les deux rendus.
 *
 * On n'y met QUE ce qui alimente `DerivedStatsGrid` (input + badges) plus les
 * deux sous-produits que la fiche réutilise ailleurs (`modFeatureIds` pour les
 * panneaux caractéristiques/tests, `effectContext` pour les mêmes). Le reste
 * (jauges, conformité, stats du maître) reste dans la fiche.
 */
import { classById, families, featureById } from '@/data';
import { deriveStats, type DerivedInput } from '@/lib/engine';
import { currentHp } from '@/lib/character/gauges';
import { isCustomItem, type Character, type EquipmentRef } from '@/lib/character/types';
import {
  activeDefenseOverride,
  activeInitiativeOverride,
  activeFeatureIdsForMods,
  activeRangedTargetMalusDieSources,
  aggregateImmunities,
  criticalRangeSources,
  defenseAbility,
  effectContext,
  finesseAttackForMode,
  type FinesseAttackView,
  manaCastingAbility,
  modsFromFeatures,
  rangedAttackElement,
  type RangedAttackElementView,
  rangedAttackMagicalSourceId,
  scalingDieTierBonus,
  stackedDamageReductions,
  type EffectContext,
} from '@/lib/character/effects';
import {
  grantedNoManaFeatureIds,
  borrowedNoManaFeatureIds,
  effectiveFeatureIdsForMods,
} from '@/lib/character/choices';
import { mergeMods, orphanMods } from '@/lib/character/orphanPoints';
import { crystalStatBonuses } from '@/lib/character/crystals';
import {
  derivedBonusSourcesFromEquipment,
  derivedBonusesFromEquipment,
  oneHandDamageOverride,
  oneHandingFeatureIds,
  verySmallWeaponDamageOverride,
} from '@/lib/character/equipment';
import { mountedInitiativePenalty } from '@/lib/character/mounts';
import { familyHpGains, hpLevelGains, level1FamilyHp, level1HybridFamilies } from '@/lib/character/hp';
import { rulesContext } from '@/lib/character/rulesContext';
import { effectiveItem } from '@/lib/character/items';
import { formatWeaponDamage } from '@/lib/character/weaponDamage';
import { loadingContext, weaponLoadingState } from '@/lib/character/weaponLoading';
import {
  weaponDamageBonuses,
  type AttackMode,
  type PermanentFlatBonus,
  type SituationalDamageBonus,
} from '@/lib/character/weaponDamageBonus';
import { weaponAttackBonuses } from '@/lib/character/attackBonus';
import {
  magicWeaponCriticalRanges,
  magicWeaponFlatDamage,
  magicWeaponSituationalDamage,
  weaponMagicBonus,
} from '@/lib/character/magicItemEffects';
import type { ModSources } from '@/lib/ui/derivedStatBreakdown';
import { unarmedStrike, type UnarmedStrikeView } from '@/lib/character/unarmedStrike';
import { meleeReplacingFormAttack, rangedReplacingFormAttack, type FormAttackView } from '@/lib/character/formAttack';
import type { AbilityId, ResistibleDamageType, Weapon } from '@/data/schema';
import { combineCriticalRanges, formatCriticalRange } from '@/lib/ui/criticalRange';
import { twoWeaponCombatStatus } from '@/lib/character/twoWeaponCombat';
import { weaponIconKindForWeapon, type WeaponIconKind } from '@/lib/ui/weaponKind';
import { formatDamageReduction } from '@/lib/ui/damageReduction';
import { defenseFromEquipment } from '@/components/wizard/helpers';
import type { DefenseBadgeData } from '@/components/sheet/DefenseBadge';
import type { FeatureEffectNote } from '@/components/sheet/FeatureEffectBadge';
import { demiOgreMeleeAttackNotes, demiOgreRangedAttackNotes } from '@/lib/character/demiOgrePath';
import { flayerMeleeAttackNotes, flayerRetaliationBadge } from '@/lib/character/flayerPath';
import { warmageHasDeflection, warmageMeleeAttackNotes } from '@/lib/character/warmagePath';
import {
  elementalistFireRetaliationBadge,
  elementalistMeleeAttackNotes,
  elementalistRangedAttackNotes,
} from '@/lib/character/elementalistPath';
import { frostRetaliationBadge } from '@/lib/character/frostPath';
import { immolationRetaliationBadge } from '@/lib/character/elementalFirePath';

const familyById = new Map(families.map((f) => [f.id, f]));

/** DM d'une arme équipée, pour l'affichage des cartes d'attaque (PER-141 contact, PER-115 distance). */
export interface WeaponDamageView {
  /**
   * Dé(s) de DM seuls, prêts pour `<DamageValue>` (ex. « 1d8 », « 2d6 », « 1d8+2 »). La ou les
   * caractéristiques ajoutées (`abilities`) sont rendues dynamiquement à côté, pas figées ici.
   */
  dice: string;
  /**
   * Caractéristique(s) ajoutée(s) aux DM, RÉSOLUES au rendu (best-of affiché comme les rangs de
   * voies). Contact : `['FOR']` de base (p. 183) + bonus permanents des capacités. Distance :
   * vide de base (aucune carac, p. 185) + bonus permanents (Archer émérite : `['PER']`).
   */
  abilities: AbilityId[];
  /**
   * Bonus PLATS permanents ajoutés aux DM par les capacités (ex. Spécialisation du maître d'armes,
   * +N selon l'arme portée — PER-226), AVEC leur source. Vide si aucun. Le TOTAL est rendu dans une
   * puce grise (contour tireté blanc, non liée à une carac) après les caracs ; l'info-bulle détaille
   * chaque source et sa contribution (breakdown), pour comprendre la somme quand plusieurs s'ajoutent.
   */
  flatBonuses: PermanentFlatBonus[];
  /** DM non létal (arme aux « DM temporaires possibles » : gourdin, bâton…). */
  nonLethal: boolean;
  /** Nom de l'arme (libellé + tooltip). */
  name: string;
  /**
   * Explication d'un dé de DM MODIFIÉ par une capacité (PER-284) : le Canon double
   * (`artilleur-r4`, p. 63) DOUBLE le dé de l'arme. Rendue en infobulle sur le dé — sans quoi
   * l'affichage passerait de 1d10 à 2d10 sans raison visible. Absent = dé du catalogue tel quel.
   */
  diceNote?: string;
  /**
   * PER-116 — sous-type d'icône de l'arme (épée, hache, arc…), pour REMPLACER le nom verbatim
   * affiché sur la carte d'attaque en combat à deux armes (une main = une icône, au survol le nom
   * complet). Cf. `weaponKind.ts` / `weaponKindIcons.ts` (icônes choisies pour l'inventaire).
   */
  weaponKind: WeaponIconKind;
  /**
   * PER-116 — informations FIGÉES de l'arme (indépendantes du personnage), pour l'info-bulle de son
   * icône : catégorie de prise, plage de critique INTRINSÈQUE (PER-225, ex. rapière 19-20), portée
   * (armes de jet), règles particulières verbatim. À DISTINGUER des badges déjà affichés sous la
   * carte (plage de critique EFFECTIVE, cumulée avec les capacités actives) : ici, ce sont les
   * propriétés propres à l'arme, comme dans sa fiche de catalogue.
   */
  weaponInfo: {
    category: string;
    criticalRange?: string;
    range?: string;
    properties?: string;
    sourcePage: number;
  };
}

/** Ancien nom conservé pour la carte de contact (PER-141). */
export type MeleeWeaponDamageView = WeaponDamageView;

/** PER-116 — libellés FR des catégories de prise d'arme (p. 184), pour l'info-bulle de l'icône. */
const WEAPON_CATEGORY_LABELS_FR: Record<Weapon['weaponCategory'], string> = {
  light: 'légère',
  oneHand: 'à une main',
  oneOrTwoHands: 'à une ou deux mains',
  twoHands: 'à deux mains',
};

/**
 * Arme tenue en main pour un `mode` d'attaque donné. Sans `slot`, comportement historique : main
 * principale prioritaire, sinon secondaire. Avec `slot`, l'arme de CETTE main exactement (PER-116 :
 * le combat à deux armes attaque avec les DEUX, il faut donc pouvoir viser chaque main). `null` si
 * aucune arme de ce mode n'y est portée. Les objets libres (`CustomItem`) n'ont pas de DM structuré
 * et sont ignorés.
 */
function wornWeaponForMode(
  character: Character,
  mode: AttackMode,
  slot?: 'mainHand' | 'offHand',
): { item: Weapon; line: EquipmentRef } | null {
  const refs = character.equipment.filter((line): line is EquipmentRef => {
    if (isCustomItem(line)) return false;
    const item = effectiveItem(line);
    if (item?.category !== 'weapon') return false;
    return mode === 'melee' ? item.melee : item.ranged;
  });
  const line = slot
    ? refs.find((l) => l.worn?.slot === slot)
    : (refs.find((l) => l.worn?.slot === 'mainHand') ?? refs.find((l) => l.worn?.slot === 'offHand'));
  if (!line) return null;
  const item = effectiveItem(line);
  if (!item || item.category !== 'weapon') return null;
  return { item, line };
}

/**
 * DM de l'arme portée pour un `mode`, prêt pour l'affichage. Le(s) dé(s) seul(s) + les caracs
 * ajoutées (base + bonus permanents des capacités, PER-115). `null` si aucune arme de ce mode
 * n'est portée. Prise à deux mains : DM à deux mains si l'arme en propose (contact, p. 184).
 */
function wornWeaponDamage(
  character: Character,
  mode: AttackMode,
  slot?: 'mainHand' | 'offHand',
): WeaponDamageView | null {
  const worn = wornWeaponForMode(character, mode, slot);
  if (!worn) return null;
  const { item, line } = worn;
  // PER-324 — décalage de cran du dé évolutif porté par le personnage, appliqué à la résolution
  // des dés de DM d'arme au niveau (défaut 0 = aucun décalage).
  const tierBonus = scalingDieTierBonus(character);
  const grippedDamage =
    mode === 'melee' && line.worn?.grip === 'twoHands' && item.twoHandedDamage ? item.twoHandedDamage : item.damage;
  // PER-325 — une arme à deux mains tenue À UNE MAIN par un demi-ogre voit son dé RÉDUIT (trait « Taille
  // grande » : épées → 1d12), tant que la voie r4 (« Toujours plus lourd ») ne lève pas la réduction. Ne
  // remplace que le DÉ (count/die) ; on garde `modifier`/`nonLethal`/`evolving` de l'arme. Contact seul.
  const oneHandOverride = mode === 'melee' ? oneHandDamageOverride(line, oneHandingFeatureIds(character)) : null;
  // PER-333 — créature TRÈS PETITE (lutin) : le dé d'arme est plafonné à 1d4 (tenue à une main) ou
  // 1d6 (tenue à deux mains), au contact comme à distance, sauf sous forme humaine (Fée révérée).
  // Priorité sur le dé natif ET sur la réduction demi-ogre. Ne remplace que le DÉ (count/die) ; on
  // conserve `modifier`/`nonLethal`/`evolving` de l'arme.
  const verySmallOverride = verySmallWeaponDamageOverride(character, line);
  const dieOverride = verySmallOverride ?? oneHandOverride;
  const baseDamage = dieOverride
    ? { ...grippedDamage, count: dieOverride.count, die: dieOverride.die }
    : grippedDamage;
  // CANON DOUBLE (artilleur-r4, p. 63, PER-284) : « Il double le dé de DM de l'arme (mais pas les dés
  // bonus ni les bonus) » → on double le NOMBRE de dés (1d10 → 2d10), jamais le modificateur.
  // Le doublement suppose de tirer les DEUX canons : avec un seul coup chargé (`underfed`), le livre
  // n'autorise qu'un tir à un canon, « aux dommages normaux » → dé du catalogue. Une arme vide garde
  // l'affichage doublé (elle EST un canon double ; les pastilles disent déjà qu'elle est déchargée).
  const loading = weaponLoadingState(line, loadingContext(character));
  const doubledDie = !!loading?.doubleBarrel && !loading.underfed;
  const dmg = doubledDie ? { ...baseDamage, count: baseDamage.count * 2 } : baseDamage;
  // Parenthèses de non-létalité gérées par un badge dédié, pas par le formateur ici. Le NIVEAU
  // résout les dés évolutifs (« 5d4° » → « 5d8° » au niveau 9, table p. 43) — cf. PER-286.
  const dice = formatWeaponDamage({ ...dmg, nonLethal: false }, character.level, tierBonus);
  // Carac de base : FOR au contact (p. 183), aucune à distance (p. 185). Les capacités ajoutent
  // leurs bonus PERMANENTS par-dessus (Archer émérite : +PER à l'arc).
  const baseAbilities: AbilityId[] = mode === 'melee' ? ['FOR'] : [];
  // Carac ajoutée par l'ARME elle-même (PER-286) : dérogation à « aucune carac à distance » (p. 185),
  // portée par la couleuvrine et sa baliste (« [5d4° + INT] », p. 63). S'ajoute avant les bonus de
  // capacités, et se rend comme eux (puce de valeur sur la carte d'attaque).
  if (item.damageAbility) baseAbilities.push(item.damageAbility);
  // Attaque en finesse (Vive attaque du duelliste r4, PER-74) : au contact, SI le mode « DM » est retenu
  // « à la table » avec une arme éligible en main, la carac de base des DM devient AGI AU LIEU de FOR
  // (substitution, pas cumul — verbatim p. 140). Les bonus permanents restent ajoutés par-dessus.
  // Réservée à la MAIN PRINCIPALE (PER-116) : « Dans le cas d'une arme à une main, il ne peut
  // bénéficier de ce bonus que sur sa main principale » (danseur de guerre r4, p. 150 ; même clause
  // chez le duelliste p. 140). La ligne de la main secondaire garde donc sa FOR.
  if (mode === 'melee' && line.worn?.slot !== 'offHand') {
    const finesse = finesseAttackForMode(character, 'damage');
    if (finesse) baseAbilities[0] = finesse.ability;
  }
  const bonuses = weaponDamageBonuses(character, mode, item);
  const added = bonuses.addedAbilities.map((b) => b.ability);
  // +N magique de l'arme (p. 251, PER-307) : bonus PLAT permanent aux DM, ajouté aux bonus des
  // capacités. Le +N n'est PAS baké dans `damage.modifier` du catalogue — il vit sur la ligne
  // (`magicBonus`), d'où l'absence de double comptage.
  const magicFlat = magicWeaponFlatDamage(line, item.name);
  const flatBonuses: PermanentFlatBonus[] = magicFlat ? [...bonuses.addedFlat, magicFlat] : bonuses.addedFlat;
  // PER-116 — infos FIGÉES de l'arme (indépendantes du personnage), pour l'info-bulle de l'icône qui
  // remplace son nom verbatim sur la carte. Plage de critique INTRINSÈQUE (PER-225) uniquement — la
  // plage EFFECTIVE (cumulée avec les capacités actives) est déjà affichée en badge sous la carte.
  const weaponInfo = {
    category: WEAPON_CATEGORY_LABELS_FR[item.weaponCategory],
    // Sur une arme, la valeur est un LITTÉRAL fixe (pas de rang → pas de valeur scalante, cf.
    // `criticalRangeSources`) : le garde `typeof === 'number'` élimine la forme scalante du type
    // générique `EffectValue`, partagé avec les capacités.
    ...(item.criticalRange && typeof item.criticalRange.value === 'number'
      ? { criticalRange: formatCriticalRange(item.criticalRange.scope, item.criticalRange.value).short }
      : {}),
    ...(item.range ? { range: item.range } : {}),
    ...(item.properties ? { properties: item.properties } : {}),
    sourcePage: item.sourcePage,
  };
  return {
    dice,
    abilities: [...baseAbilities, ...added],
    flatBonuses,
    nonLethal: !!dmg.nonLethal,
    name: item.name,
    weaponKind: weaponIconKindForWeapon(item),
    weaponInfo,
    ...(doubledDie
      ? {
          diceNote: `Dé de DM DOUBLÉ par Canon double : ${formatWeaponDamage(
            { ...baseDamage, nonLethal: false },
            character.level,
            tierBonus,
          )} → ${dice} (les dés bonus et les bonus, eux, ne sont pas doublés). Un tir consomme 2 projectiles ; avec un seul coup chargé, le dé revient à la normale (p. 63).`,
        }
      : {}),
  };
}

export interface CharacterDerivedView {
  /** Capacités acquises + empruntées (base des mods) — réutilisé par les autres panneaux de la fiche. */
  modFeatureIds: string[];
  /** Contexte d'effets (valeurs scalantes + interrupteurs actifs) — réutilisé par la fiche. */
  effectContext: EffectContext;
  /** Entrée moteur pour `deriveStats`. `null` si profil incomplet (famille introuvable). */
  derivedInput: DerivedInput | null;
  /** Puces de la carte Défense : immunités (vert) d'abord, puis réductions de dégâts (bleu). */
  defenseBadges: DefenseBadgeData[];
  /** Puces de plage de critique ACTIVE au contact. */
  meleeCriticalRanges: DefenseBadgeData[];
  /** Puces de plage de critique ACTIVE à distance. */
  rangedCriticalRanges: DefenseBadgeData[];
  /** PER-141 — attaque à mains nues (dé, carac, létalité, magie, critique). Alimente la bascule de la carte Attaque au contact. */
  unarmed: UnarmedStrikeView;
  /** PER-141 — DM de l'arme de CONTACT équipée (vue « arme » de la bascule). `null` = aucune arme de contact portée. */
  meleeWeaponDamage: WeaponDamageView | null;
  /**
   * PER-116 — DM de l'arme de contact de la MAIN SECONDAIRE, `null` hors combat à deux armes. Quand
   * il est renseigné, la carte « Attaque au contact » affiche DEUX lignes touche | DM (une par main),
   * chacune préfixée du nom de son arme. La finesse (AGI↔FOR) n'y est jamais appliquée : elle est
   * réservée à la main principale (p. 140/150).
   */
  offHandMeleeWeaponDamage: WeaponDamageView | null;
  /**
   * PER-116 — plage de critique de l'arme de la MAIN SECONDAIRE (vide hors combat à deux armes, ou
   * si l'arme n'élargit rien). À n'afficher que si elle DIFFÈRE de celle de la main principale : une
   * rapière 19-20 et une dague 20 ne peuvent pas partager un badge unique.
   */
  offHandCriticalRanges: DefenseBadgeData[];
  /**
   * PER-116 — CORRECTION à appliquer à la valeur de touche pour la ligne de la MAIN SECONDAIRE
   * (0 = même touche que la main principale, cas courant). Le livre n'impose aucune pénalité chiffrée
   * au combat à deux armes — seulement un dé malus. La SEULE cause d'écart est l'attaque en finesse
   * portant sur la TOUCHE (`finesse-attack` mode « attaque ») : réservée à la main principale
   * (p. 140/150), la main secondaire garde sa caractéristique d'origine, d'où un écart de
   * `FOR − AGI`. Toujours 0 hors combat à deux armes.
   */
  offHandTouchDelta: number;
  /**
   * PER-116 — le combat à deux armes impose-t-il un dé MALUS aux attaques (p. 215) ? Faux hors combat
   * à deux armes ET quand l'exemption « Combattant héroïque » joue (même arme dans les deux mains,
   * option FOR, p. 73). Rendu en badge sur CHACUNE des deux lignes de la carte : le livre pénalise
   * « chacune des deux attaques ».
   */
  twoWeaponPenaltyDie: boolean;
  /** PER-141 — plage de critique au contact À MAINS NUES (Morsure du serpent), pour la vue mains nues de la bascule. */
  unarmedCriticalRanges: DefenseBadgeData[];
  /** PER-115 — DM de l'arme à DISTANCE équipée (carte Attaque à distance). `null` = aucune arme à distance portée. */
  rangedWeaponDamage: WeaponDamageView | null;
  /** PER-115 — bonus de DM SITUATIONNELS au contact (Attaque éclair, Chasseur émérite…), en badges. */
  meleeSituationalDamage: SituationalDamageBonus[];
  /** PER-116/307 — bonus de DM situationnels de la MAIN SECONDAIRE (combat à deux armes), pour SA
   *  arme. Affichés sous sa ligne d'attaque. `[]` hors combat à deux armes. */
  offHandMeleeSituationalDamage: SituationalDamageBonus[];
  /**
   * PER-74 — notes d'effet de capacité (DoT, pénalité de guérison…) subis par un TIERS, affichées en
   * badge sous la carte « Attaque au contact » (voie de l'écorcheur : saignement, blessures
   * affreuses, impitoyable). Purement informatif, jamais un modificateur chiffré. Vide = aucune.
   */
  meleeAttackNotes: FeatureEffectNote[];
  /**
   * PER-74 — notes d'effet de capacité affichées en badge sous la carte « Attaque à distance »
   * (Métamorphose élémentaire, élémentaliste r8, forme Air : DM ÷2). Purement informatif, jamais
   * un modificateur chiffré. Vide = aucune.
   */
  rangedAttackNotes: FeatureEffectNote[];
  /** PER-115 — bonus de DM SITUATIONNELS à distance (Chasseur émérite…), en badges. */
  rangedSituationalDamage: SituationalDamageBonus[];
  /**
   * PER-74 — id de la capacité ACTIVE rendant l'attaque à distance MAGIQUE (Flèche magique de l'archer
   * arcanique), ou `null`. Gaté par l'arme requise (arc/arbalète en main) via `activeFeatureIdsForMods`
   * → non `null` seulement quand le badge « Magique » doit s'afficher sur la carte d'attaque à distance.
   */
  rangedAttackMagicalSourceId: string | null;
  /**
   * PER-74 — élément de DM AJOUTÉ aux attaques à distance (Flèche élémentaire de l'archer arcanique),
   * choisi « à la table » (`effectInputs`), ou `null`. Gaté par l'arme requise en main → non `null`
   * seulement quand la puce d'élément doit s'afficher sur la carte d'attaque à distance.
   */
  rangedAttackElement: RangedAttackElementView | null;
  /**
   * PER-74 — attaque conférée par une FORME active qui CONFISQUE l'attaque à distance (morsure de la
   * forme hybride du lycanthrope, p. 130 : sous cette forme, aucune arme à distance n'est utilisable).
   * `null` = aucune forme de ce genre active → la carte « Attaque à distance » reste affichée.
   */
  rangedReplacingFormAttack: FormAttackView | null;
  /**
   * PER-374 — attaque conférée par une FORME active qui CONFISQUE l'attaque au contact (Frappe des
   * formes élémentaires, p. 166-170 : la bascule arme ⇄ mains nues, PER-141, disparaît au profit d'une
   * attaque unique fixe). Symétrique de `rangedReplacingFormAttack`. `null` = aucune forme de ce
   * genre active → la carte « Attaque au contact » (avec sa bascule) reste affichée normalement.
   */
  meleeReplacingFormAttack: FormAttackView | null;
  /**
   * PER-374 — DEF imposée par une transformation active (nombre fixe imprimé, ex. Forme élémentaire
   * d'air « Défense 25 »), indépendante de la formule habituelle. `null` = DEF recalculée normalement.
   */
  activeDefenseOverride: number | null;
  /**
   * Retour propriétaire 2026-08-19 — Initiative imposée par une transformation active (Forme
   * animale : Initiative IMPRIMÉE de la créature choisie), symétrique de `activeDefenseOverride`.
   * `null` = Initiative recalculée normalement.
   */
  activeInitiativeOverride: number | null;
  /**
   * PER-226 — sous-termes de breakdown des bonus à la touche conditionnés à l'arme portée (maître
   * d'armes : +1 au contact / à distance avec une arme de prédilection). Le TOTAL est déjà FONDU dans
   * `derivedInput.mods` (donc dans le score affiché) — ceci ne sert qu'à l'attribution dans l'infobulle
   * « i » de la touche (aucun badge : interface légère, décision propriétaire).
   */
  attackBonusModSources: ModSources;
  /**
   * PER-273 — sous-termes de breakdown des apports de stats dérivées des OBJETS PORTÉS
   * (anneau de protection, amulette de vitalité…). Le TOTAL est déjà FONDU dans
   * `derivedInput.mods` (donc dans le score affiché) ; ceci ne sert qu'à l'attribution dans
   * l'infobulle « i » de la stat, en libellé texte (la source est un objet, pas une capacité).
   */
  itemDerivedModSources: ModSources;
}

/**
 * Domaines de test à DÉ BONUS (`test-die`) qui méritent un RAPPEL SITUATIONNEL dans la carte
 * « Défense » : puce ambre (icône du type résisté + double d20). Le dé bonus « chiffré » reste porté
 * par la ligne du domaine dans « Compétences & tests » ; cette puce n'en est que le rappel défensif
 * (retour propriétaire, elfe pâle r2 « Résistance au poison »). Seuls les domaines mappés à un TYPE
 * DE DÉGÂT (donc une icône dédiée) y figurent ; les autres (ex. « Résister à la peur ») n'ont pas
 * d'icône et restent uniquement sur la ligne de test.
 */
const SITUATIONAL_TEST_DIE_BADGE: Record<string, { scope: ResistibleDamageType; title: string }> = {
  'poison-resistance': { scope: 'poison', title: 'Dé bonus pour résister aux poisons' },
};

/**
 * Construit la vue des statistiques dérivées d'un personnage (entrée moteur +
 * badges), à l'identique de la fiche. Fonction pure : aucun effet, aucune
 * dépendance à React.
 */
export function buildCharacterDerivedView(character: Character): CharacterDerivedView {
  const characterClass = classById.get(character.classId);
  const family = characterClass ? familyById.get(characterClass.familyId) : undefined;

  // Capacités acquises + capacités empruntées par choix, MOINS celles désactivées par
  // le port d'armure (PER-83) : base de l'agrégation des bonus plats et du détail des
  // stats dérivées (PER-66). Une capacité gênée par l'armure ne compte plus nulle part.
  const modFeatureIds = activeFeatureIdsForMods(character);
  // PER-328 — Capacités CONNUES (acquises + empruntées + octroyées), SANS retirer les désactivées : le
  // réservoir de PM d'un sort vient du fait de le CONNAÎTRE, pas de pouvoir le lancer maintenant. Une
  // capacité désactivée (interrupteur « pas en plein soleil », gêne d'armure, exclusion mutuelle…) reste
  // inutilisable pour ses AUTRES effets (d'où `modFeatureIds` ailleurs), mais conserve son +1 PM.
  const knownFeatureIds = effectiveFeatureIdsForMods(character);
  // Sorts sans +1 PM : octrois fixes `noMana` (cambion « La belle et la bête », PER-323) ∪ sorts
  // empruntés par un choix `feature-from-path` marqué `noManaCost` (demi-elfe « Sang féerique », PER-324).
  // Exclus du compte des sorts connus, même si aussi possédés par la voie d'origine (ex. voie du démon).
  const noManaFeatureIds = new Set([
    ...grantedNoManaFeatureIds(character),
    ...borrowedNoManaFeatureIds(character),
  ]);
  // Contexte d'effets (PER-67) : résout les valeurs scalantes et n'inclut que les
  // effets conditionnels dont l'interrupteur est actif.
  const effectCtx = effectContext(character);

  // Puces de la carte Défense (PER-137) : IMMUNITÉS (vert) d'abord, puis RÉDUCTIONS de dégâts (bleu).
  // Le cumul des RD plates de même portée (Fils du roc + Peau d'acier → RD 6) est fait côté moteur par
  // `stackedDamageReductions` ; ici on ne fait que mettre en badges (titre + breakdown des sources).
  const reductionBadges: DefenseBadgeData[] = [];
  const damageImmunityBadges: DefenseBadgeData[] = [];
  for (const r of stackedDamageReductions(character)) {
    const scopes = r.scope ? [r.scope] : undefined;
    if (r.kind === 'immunity') {
      // Protection SITUATIONNELLE (PER-74) : elle ne joue que contre un type d'agresseur nommé
      // (« … provoqués par les morts-vivants, les démons ou les animaux corrompus »). Badge ambre à
      // tête de démon, et la condition en tête d'info-bulle — le bouclier vert de l'immunité
      // permanente laisserait croire à une protection générale.
      const situational = r.againstAggressors !== undefined;
      damageImmunityBadges.push({
        key: `imm-${r.scope ?? 'all'}${situational ? `-vs-${r.againstAggressors}` : ''}`,
        variant: situational ? 'situational-immunity' : 'immunity',
        scope: r.scope,
        text: r.scope ? undefined : 'tous DM',
        title: situational
          ? `${formatDamageReduction({ kind: 'immunity', scopes }).short} (situationnelle)`
          : formatDamageReduction({ kind: 'immunity', scopes }).short,
        note: r.againstAggressors,
        sources: r.sources.map((s) => ({ name: s.name, featureId: s.featureId })),
      });
    } else {
      const v = r.total ?? 0;
      // RD CONDITIONNÉE au TYPE d'attaque reçue (Protection : ÷2 sur les critiques/sournoises, p. 253,
      // PER-307) : la condition entre dans le titre et la note pour que la puce ne se lise pas comme une
      // réduction générale, et dans la clé pour ne pas fusionner avec une RD permanente de même valeur.
      const condition = r.againstAggressors;
      reductionBadges.push({
        key: `rd-${r.kind}-${r.scope ?? 'all'}-${v}${condition ? `-vs-${condition}` : ''}`,
        variant: 'reduction',
        scope: r.scope,
        text: r.kind === 'divide' ? `/${v}` : `${v}`,
        title: condition
          ? `${formatDamageReduction({ kind: r.kind, value: v, scopes }).short} (${condition})`
          : formatDamageReduction({ kind: r.kind, value: v, scopes }).short,
        note: condition,
        // Breakdown : on n'affiche la valeur par source que si plusieurs sources cumulent.
        sources: r.sources.map((s) => ({
          name: s.name,
          value: r.sources.length > 1 && s.value !== undefined ? `${s.value}` : undefined,
          featureId: s.featureId,
        })),
      });
    }
  }
  // Immunités d'ÉTAT (peur, charme, ralenti, immobilisé) — PER-103, fusionnées comme puces vertes dans
  // la carte Défense. Icône d'état dédiée ; le nom complet reste dans le tooltip via `title`.
  const statusImmunityBadges: DefenseBadgeData[] = aggregateImmunities(modFeatureIds, character.equipment).map((imm) => ({
    key: `imm-${imm.id}`,
    variant: 'immunity',
    statusEffect: imm.id,
    title: `Immunité : ${imm.label}`,
    sources: imm.sources.map((s) => ({ name: s.name, featureId: s.featureId })),
  }));
  // Dé MALUS imposé aux attaques à distance ciblant le personnage (Cape d'ombre r7, PER-74) — effet
  // DÉFENSIF situationnel piloté par l'interrupteur « Cape d'ombre déployée » : rendu en badge ambre
  // (œil barré) sous la carte Défense uniquement quand l'interrupteur est actif. Aucune valeur numérique.
  const rangedMalusBadges: DefenseBadgeData[] = activeRangedTargetMalusDieSources(character).map((s) => ({
    key: `ranged-malus-${s.featureId}`,
    variant: 'ranged-malus',
    // Pas de texte : l'arc (attaque à distance) + le dé malus rouge suffisent ; l'infobulle explicite.
    title: 'Attaques à distance qui vous ciblent : dé malus (2d20, l’adversaire garde le pire)',
    sources: [{ name: s.name, featureId: s.featureId }],
  }));
  // PER-74 — Armure à pointes (écorcheur r5, p. 150) : un ADVERSAIRE qui attaque au contact avec des
  // armes naturelles (mains nues, griffes, crocs) et touche Défense ≥ 10 subit des DM en retour. Ce
  // n'est PAS une réduction/immunité (le personnage n'encaisse rien) mais un rappel visuel — badge
  // BLEU dédié (`retaliation`), au même gabarit que les autres puces de Défense (retour propriétaire
  // 2026-08-05 : bleu, pas rouge — aucun effet chiffré sur la fiche du porteur).
  const retaliation = flayerRetaliationBadge(modFeatureIds);
  const retaliationBadges: DefenseBadgeData[] = retaliation
    ? [
        {
          key: 'retaliation-flayer-r5',
          variant: 'retaliation',
          text: retaliation.die,
          // Dé PARSÉ (résolu au niveau si évolutif) là où l'hôte sait le rendre ; `text` reste le
          // repli littéral des hôtes compacts (écran de MJ) qui n'ont pas le porteur sous la main.
          dice: `{${retaliation.die}}`,
          diceTierBonus: scalingDieTierBonus(character),
          title: 'Armure à pointes — riposte',
          note: "Contre une attaque au contact à mains nues/griffes/crocs touchant Défense 10+, l'attaquant subit ces DM.",
          sources: [{ name: 'Armure à pointes', featureId: 'prestige-ecorcheur-r5' }],
        },
      ]
    : [];
  // PER-74 — Métamorphose élémentaire, forme Feu (élémentaliste r8, p. 157) : même patron « Riposte »
  // que l'Armure à pointes, mais SITUATIONNEL (ne joue que tant que la forme Feu est active) → variante
  // dédiée `elemental-retaliation` (ambre, cf. `DefenseBadge`), avec l'icône du type de dégât.
  const elementalRetaliation = elementalistFireRetaliationBadge(character);
  const elementalRetaliationBadges: DefenseBadgeData[] = elementalRetaliation
    ? [
        {
          key: 'retaliation-elementalist-r8',
          variant: 'elemental-retaliation' as const,
          scope: 'fire' as const,
          text: elementalRetaliation.die,
          dice: `{${elementalRetaliation.die}}`,
          diceTierBonus: scalingDieTierBonus(character),
          title: 'Métamorphose élémentaire (Feu) — riposte',
          note: "Sous la forme Feu, une créature qui l'attaque avec des armes naturelles subit ces DM à chaque attaque réussie.",
          sources: [{ name: 'Métamorphose élémentaire', featureId: 'prestige-elementaliste-r8' }],
        },
      ]
    : [];
  // PER-74 — Présence glaciale (gel r7, p. 158) : même patron « Riposte » SITUATIONNEL que la forme
  // Feu de l'élémentaliste (`elemental-retaliation`, ambre), mais sans type de DM précisé par le
  // livre (« subissent 1d4° DM », pas « DM de froid ») → PAS de `scope` (aucune icône élémentaire).
  const frostRetaliation = frostRetaliationBadge(character);
  const frostRetaliationBadges: DefenseBadgeData[] = frostRetaliation
    ? [
        {
          key: 'retaliation-frost-r7',
          variant: 'elemental-retaliation' as const,
          text: frostRetaliation.die,
          dice: `{${frostRetaliation.die}}`,
          diceTierBonus: scalingDieTierBonus(character),
          title: 'Présence glaciale — riposte',
          note: "Tant que Présence glaciale est active, une créature qui vous touche au contact ou avec des armes naturelles subit ces DM.",
          sources: [{ name: 'Présence glaciale', featureId: 'prestige-gel-r7' }],
        },
      ]
    : [];
  // PER-371 — Immolation (voie élémentaire du feu r7, p. 167) : même patron « Riposte » SITUATIONNEL
  // que la forme Feu de l'élémentaliste (`elemental-retaliation`, ambre, icône du type de dégât) —
  // actif via l'interrupteur « Immolation active » OU la Forme élémentaire de feu (r8), qui en profite
  // en permanence (RAW).
  const fireVoieRetaliation = immolationRetaliationBadge(character);
  const fireVoieRetaliationBadges: DefenseBadgeData[] = fireVoieRetaliation
    ? [
        {
          key: 'retaliation-elementaire-feu-r7',
          variant: 'elemental-retaliation' as const,
          scope: 'fire' as const,
          text: fireVoieRetaliation.die,
          dice: `{${fireVoieRetaliation.die}}`,
          diceTierBonus: scalingDieTierBonus(character),
          title: 'Immolation — riposte',
          note: "Tant qu'Immolation (ou la Forme élémentaire de feu) est active, un attaquant qui le blesse avec une arme subit ces DM de feu (2d4° avec une arme naturelle).",
          sources: [{ name: 'Immolation', featureId: 'prestige-elementaire-du-feu-r7' }],
        },
      ]
    : [];
  // PER-74 — Déflexion arcanique (guerrier-mage r6, p. 151) : badge de rappel AMBRE (réaction
  // ponctuelle payée en PM, à la discrétion du joueur) — aucune valeur numérique fixe (le combattant
  // choisit +2 DEF pour 1 PM par attaque, +5 pour 3 PM à partir du rang 9).
  const deflectionBadges: DefenseBadgeData[] = warmageHasDeflection(modFeatureIds)
    ? [
        {
          key: 'arcane-deflection-warmage-r6',
          variant: 'arcane-deflection',
          title: 'Déflexion arcanique',
          note: 'Réaction annoncée après le jet adverse : 1 PM → +2 DEF contre cette attaque (+5 pour 3 PM à partir du rang 9), plusieurs fois par round.',
          sources: [{ name: 'Déflexion arcanique', featureId: 'prestige-guerrier-mage-r6' }],
        },
      ]
    : [];
  // Dé bonus SITUATIONNEL aux tests d'une résistance TYPÉE (elfe pâle r2 « Résistance au poison ») :
  // puce ambre (icône du type résisté + double d20) DANS la carte Défense (retour propriétaire — plutôt
  // que sur la carte de la capacité). Pilotée par la map `SITUATIONAL_TEST_DIE_BADGE` depuis les effets
  // `test-die` des capacités acquises. Le dé bonus « chiffré » reste porté par la ligne du domaine.
  const situationalTestDieBadges: DefenseBadgeData[] = modFeatureIds.flatMap((id) => {
    const feature = featureById.get(id);
    if (!feature?.effects) return [];
    return feature.effects.flatMap((e) =>
      e.kind === 'test-die'
        ? e.domains.flatMap((domain) => {
            const spec = SITUATIONAL_TEST_DIE_BADGE[domain];
            return spec
              ? [
                  {
                    key: `std-${id}-${domain}`,
                    variant: 'situational-test-die' as const,
                    scope: spec.scope,
                    title: spec.title,
                    sources: [{ name: feature.name, featureId: id }],
                  },
                ]
              : [];
          })
        : [],
    );
  });
  // PER-330 — Parano (frouïn, `frouin-r3`, Le Compagnon p. 21) : « il ne subit que la moitié des DM des
  // attaques sournoises (ou autres bonus de DM dus à la surprise) ». Aucune primitive de RD conditionnée
  // à la surprise (le moteur ne simule aucun jet ni la notion d'attaque sournoise) : rappel AMBRE
  // situationnel (`situational-immunity`) sur la carte Défense, la règle exacte restant au verbatim.
  const frouinParanoBadges: DefenseBadgeData[] = modFeatureIds.includes('frouin-r3')
    ? [
        {
          key: 'situational-frouin-r3',
          variant: 'situational-immunity' as const,
          text: 'sournoise ÷2',
          title: 'Parano — attaques sournoises',
          note: 'Ne subit que la moitié des DM des attaques sournoises (ou autres bonus de DM dus à la surprise).',
          sources: [{ name: 'Parano', featureId: 'frouin-r3' }],
        },
      ]
    : [];
  // Ordre voulu : immunités d'abord, réductions, puis effets défensifs situationnels (dé malus, riposte).
  const defenseBadges: DefenseBadgeData[] = [
    ...statusImmunityBadges,
    ...damageImmunityBadges,
    ...reductionBadges,
    ...rangedMalusBadges,
    ...retaliationBadges,
    ...elementalRetaliationBadges,
    ...frostRetaliationBadges,
    ...fireVoieRetaliationBadges,
    ...deflectionBadges,
    ...situationalTestDieBadges,
    ...frouinParanoBadges,
  ];

  // Plages de critique élargies ACTIVES (ex. Briseur d'os 19-20) — badges custom (variante 'critical')
  // sous les cartes Attaque au contact / à distance selon leur portée (PER-133). Les élargissements
  // d'une même portée se CUMULENT (PER-73) : on agrège en UN seul badge par portée. Les propriétés
  // Affûtée des armes magiques en main (+1 de plage, p. 251, PER-307) sont ajoutées comme des sources
  // ordinaires — même cumul par portée que les capacités et la plage intrinsèque de l'arme.
  const critRanges = [
    ...criticalRangeSources(character),
    ...magicWeaponCriticalRanges(wornWeaponForMode(character, 'melee')?.line ?? null, 'melee'),
    ...magicWeaponCriticalRanges(wornWeaponForMode(character, 'ranged')?.line ?? null, 'ranged'),
  ];
  const critBadgeForScope = (scope: 'melee' | 'ranged'): DefenseBadgeData[] => {
    const combined = combineCriticalRanges(critRanges, scope);
    if (!combined) return [];
    const f = formatCriticalRange(scope, combined.total);
    return [
      {
        key: `crit-${scope}`,
        variant: 'critical',
        text: f.short,
        title: `Critique ${f.short}`,
        sources: combined.sources.map((s) => ({ name: s.name, value: `+${s.value}`, featureId: s.featureId })),
      },
    ];
  };
  const meleeCriticalRanges = critBadgeForScope('melee');
  const rangedCriticalRanges = critBadgeForScope('ranged');

  // PER-116 — COMBAT À DEUX ARMES : quand une arme est tenue dans CHAQUE main, la carte d'attaque au
  // contact affiche une ligne par main. La main secondaire a ses propres DM (arme différente) et sa
  // propre plage de critique, qu'il faut recalculer en imposant SON arme au résolveur.
  const twoWeaponCombat = twoWeaponCombatStatus(character);
  const offHandMelee = twoWeaponCombat.dualWielding ? wornWeaponForMode(character, 'melee', 'offHand') : null;
  const offHandCriticalRanges: DefenseBadgeData[] = (() => {
    if (!offHandMelee) return [];
    const combined = combineCriticalRanges(
      [
        ...criticalRangeSources(character, { meleeWeapon: offHandMelee.item }),
        ...magicWeaponCriticalRanges(offHandMelee.line, 'melee'),
      ],
      'melee',
    );
    if (!combined) return [];
    const f = formatCriticalRange('melee', combined.total);
    return [
      {
        key: 'crit-melee-offhand',
        variant: 'critical',
        text: f.short,
        title: `Critique ${f.short} — ${offHandMelee.item.name} (main secondaire)`,
        sources: combined.sources.map((s) => ({ name: s.name, value: `+${s.value}`, featureId: s.featureId })),
      },
    ];
  })();

  // Attaque à mains nues (PER-141) + DM de l'arme de contact équipée, pour la bascule
  // de la carte « Attaque au contact ».
  const unarmed = unarmedStrike(character);
  const meleeWeaponDamage = wornWeaponDamage(character, 'melee');
  // PER-116 — DM de la main SECONDAIRE (`null` hors combat à deux armes) : recalculés pour SON arme,
  // donc avec ses propres dés, ses bonus permanents applicables et sa FOR (la finesse est réservée à
  // la main principale).
  const offHandMeleeWeaponDamage = offHandMelee ? wornWeaponDamage(character, 'melee', 'offHand') : null;
  // PER-116 — écart de TOUCHE de la main secondaire. La touche de la fiche est calculée avec la carac
  // substituée par la finesse (`derivedInput.meleeAttackAbility`) ; comme la substitution ne vaut que
  // pour la main principale, la ligne secondaire doit revenir à la carac d'origine — d'où un écart
  // (FOR − AGI), négatif quand la substitution est avantageuse. 0 dès que la finesse ne porte pas sur
  // la touche, ou hors combat à deux armes.
  const touchFinesse = offHandMelee ? finesseAttackForMode(character, 'attack') : null;
  const offHandTouchDelta = touchFinesse
    ? (effectCtx.abilities[touchFinesse.replaces] ?? 0) - (effectCtx.abilities[touchFinesse.ability] ?? 0)
    : 0;
  // DM de l'arme à distance équipée + bonus situationnels des deux modes (PER-115).
  const rangedWeaponDamage = wornWeaponDamage(character, 'ranged');
  const meleeWornResolved = wornWeaponForMode(character, 'melee');
  const rangedWornResolved = wornWeaponForMode(character, 'ranged');
  const meleeWorn = meleeWornResolved?.item ?? null;
  const rangedWorn = rangedWornResolved?.item ?? null;
  // Ligne de l'arme en main (porte l'enchantement) — pour le +N magique et les propriétés (PER-307).
  const meleeWornLine = meleeWornResolved?.line ?? null;
  const rangedWornLine = rangedWornResolved?.line ?? null;
  // +N magique de l'arme à la TOUCHE (p. 251) : fondu dans les mods d'attaque du mode de l'arme, comme
  // les bonus conditionnés à l'arme des capacités. L'arme à distance n'affecte que la touche à distance.
  const meleeMagicAttack = weaponMagicBonus(meleeWornLine);
  const rangedMagicAttack = weaponMagicBonus(rangedWornLine);
  // Les bonus de DM SITUATIONNELS sont calculés PLUS BAS (après `derivedInput`), car certains sont
  // gatés par les PV (flibustier r8 « Pas de quartier ») et exigent le `maxHp` — qui vient de
  // `deriveStats(derivedInput)`.
  // Caractère MAGIQUE de l'attaque à distance (Flèche magique, PER-74) — non nul seulement si la voie
  // de l'archer arcanique est active (arc/arbalète en main), d'où le badge « Magique » sur la carte.
  const rangedAttackMagical = rangedAttackMagicalSourceId(character);
  // Élément de DM ajouté aux attaques à distance (Flèche élémentaire, PER-74) — choisi « à la table »,
  // gaté par l'arme requise en main : puce d'élément sur la carte d'attaque à distance.
  const rangedAttackEl = rangedAttackElement(character);
  // Attaque conférée par une FORME active qui interdit le tir (PER-74) : sous forme hybride, le
  // lycanthrope perd l'usage des armes à distance mais gagne une morsure au contact → la carte
  // « Attaque à distance » de la fiche est remplacée par celle de la morsure tant que la forme est ON.
  const formAttackReplacingRanged = rangedReplacingFormAttack(character);
  // Attaque conférée par une FORME active qui confisque la bascule arme ⇄ mains nues (PER-374, formes
  // élémentaires) : sous forme élémentaire, la carte « Attaque au contact » est remplacée par la
  // Frappe fixe de la créature (touche = attaque magique du personnage) tant que la forme est ON.
  const formAttackReplacingMelee = meleeReplacingFormAttack(character);
  // DEF imposée par une transformation active (PER-374, formes élémentaires) — voir `activeDefenseOverride`.
  const defenseOverride = activeDefenseOverride(character);
  // Initiative imposée par une transformation active (retour propriétaire 2026-08-19, Forme animale).
  const initiativeOverride = activeInitiativeOverride(character);
  // Bonus à la touche conditionnés à l'arme portée (PER-226) : maître d'armes +1 au contact avec une
  // arme de prédilection, +1 à distance avec une arme de jet de prédilection. Le total est FONDU dans
  // les mods (score) plus bas ; on garde le détail des sources pour l'infobulle de la touche.
  const meleeAttackBonus = weaponAttackBonuses(character, 'melee', meleeWorn);
  const rangedAttackBonus = weaponAttackBonuses(character, 'ranged', rangedWorn);
  // Apports de stats dérivées des OBJETS PORTÉS (PER-273) : anneau +1 DEF, amulette +5 PV…
  // Ils alimentent le MÊME sac de modificateurs que les capacités (fondus dans le score
  // plus bas) ; on garde ici le détail par objet pour l'attribution dans l'infobulle « i ».
  const itemDerivedBonuses = derivedBonusesFromEquipment(character.equipment);
  const itemDerivedModSources: ModSources = {};
  for (const [stat, sources] of Object.entries(derivedBonusSourcesFromEquipment(character.equipment))) {
    itemDerivedModSources[stat as keyof ModSources] = sources.map((s) => ({
      label: s.name,
      value: s.value,
    }));
  }
  const attackBonusModSources: ModSources = {};
  // Détail de la touche : bonus conditionnés à l'arme (capacités) PUIS le +N magique de l'arme (PER-307).
  const meleeAttackSources = [
    ...meleeAttackBonus.sources.map((s) => ({ label: s.name, value: s.value, featureId: s.featureId })),
    ...(meleeMagicAttack ? [{ label: `${meleeWorn?.name ?? 'Arme'} (bonus magique)`, value: meleeMagicAttack }] : []),
  ];
  const rangedAttackSources = [
    ...rangedAttackBonus.sources.map((s) => ({ label: s.name, value: s.value, featureId: s.featureId })),
    ...(rangedMagicAttack ? [{ label: `${rangedWorn?.name ?? 'Arme'} (bonus magique)`, value: rangedMagicAttack }] : []),
  ];
  if (meleeAttackSources.length) attackBonusModSources.meleeAttack = meleeAttackSources;
  if (rangedAttackSources.length) attackBonusModSources.rangedAttack = rangedAttackSources;
  // Attaque en finesse portant sur la TOUCHE (PER-74) : avec une arme éligible en main, la touche au
  // contact se calcule sur l'AGI AU LIEU de la FOR (SUBSTITUTION de carac, pas cumul — même patron que la
  // DEF sur la CON de Peau de pierre). Le breakdown affiche alors « Agilité (AGI) » à la place de
  // « Force (FOR) ». Source : soit le mode « attaque » retenu à la table (Vive attaque du duelliste r4),
  // soit une substitution AUTOMATIQUE (Précision du barde p. 66, Attaque en finesse du voleur p. 77 :
  // touche seulement, donc appliquée dès qu'elle est avantageuse). Le mode « DM » n'y touche pas (il
  // modifie la carac de base des DM de l'arme via `wornWeaponDamage`).
  const finesse: FinesseAttackView | null = finesseAttackForMode(character, 'attack');
  const meleeAttackAbility: AbilityId = finesse ? finesse.ability : 'FOR';
  const meleeAttackAbilitySourceId = finesse?.featureId;
  // Plage de critique au contact ACTIVE à mains nues (Morsure du serpent) : construite depuis
  // la vue mains nues (indépendante de l'interrupteur manuel de la vue « arme »).
  const unarmedCriticalRanges: DefenseBadgeData[] =
    unarmed.criticalRangeBonus > 0
      ? [
          {
            key: 'crit-melee-unarmed',
            variant: 'critical',
            text: formatCriticalRange('melee', unarmed.criticalRangeBonus).short,
            title: `Critique ${formatCriticalRange('melee', unarmed.criticalRangeBonus).short}`,
            sources: unarmed.sources
              .filter((s) => featureById.get(s.featureId)?.criticalRange?.scope === 'melee')
              .map((s) => ({ name: s.name, featureId: s.featureId })),
          },
        ]
      : [];

  // Carac de base des PM : VOL, ou substitution (Charisme héroïque → CHA, PER-101).
  const manaCast = manaCastingAbility(modFeatureIds, effectCtx.abilities);
  // DEF d'équipement : uniquement le PORTÉ (PER-76). Dentelles et rapière (seduction-r2) n'annule
  // plus l'équipement (PER-106) : sans armure, l'armure vaut 0 DEF naturellement, tandis que le
  // bouclier et la DEF magique se cumulent avec son bonus `armor-def-bonus` (min(CHA, rang)).
  const defenseEquip = defenseFromEquipment(character.equipment);

  // Caractéristique de DEF : AGI par défaut, ou substitution retenue par une capacité
  // (Peau de pierre du barbare : CON, PER-131). Le plafond d'armure s'appliquera à elle.
  const defAbility = defenseAbility(modFeatureIds, effectCtx);

  const derivedInput: DerivedInput | null = family
    ? {
        // Caractéristiques EFFECTIVES (saisie + modificateurs permanents de capacités).
        abilities: effectCtx.abilities,
        level: character.level,
        family,
        defenseEquipment: defenseEquip,
        defAbility,
        // Carac de la touche au contact : FOR, ou AGI si l'attaque en finesse « attaque » est active (r4).
        meleeAttackAbility,
        meleeAttackAbilitySourceId,
        // Sorts connus = acquis ET EMPRUNTÉS (encadré « Appel à une autre capacité », p. 60). PER-73.
        // Un sort octroyé `noMana` (cambion « La belle et la bête », PER-323) NE donne PAS le +1 PM.
        // PER-328 — compté sur les sorts CONNUS (`knownFeatureIds`), pas sur les actifs : un sort
        // désactivé (soleil, armure, exclusion) reste connu et alimente donc toujours le réservoir de PM.
        spellCount: knownFeatureIds.filter(
          (fid) => featureById.get(fid)?.isSpell && !noManaFeatureIds.has(fid),
        ).length,
        manaAbility: manaCast.ability,
        // Bonus des capacités acquises (PER-63) + empruntées par choix (PER-66), fusionnés avec les
        // points de capacité orphelins convertis (p. 40), les apports de stats dérivées des OBJETS
        // PORTÉS (PER-273) ET les bonus à la touche conditionnés à l'arme portée (maître d'armes,
        // PER-226) — tous fondus dans le score, détaillés dans l'infobulle.
        mods: mergeMods(
          modsFromFeatures(modFeatureIds, effectCtx),
          orphanMods(character),
          itemDerivedBonuses,
          // Cristaux ACTIFS de la voie des cristaux (PER-74, p. 156) : Init./DEF/attaque, tant qu'activés.
          crystalStatBonuses(character),
          {
            meleeAttack: meleeAttackBonus.total + meleeMagicAttack,
            rangedAttack: rangedAttackBonus.total + rangedMagicAttack,
            // Malus d'Initiative au CAVALIER d'une monture bardée « en selle » (PER-216) : négatif,
            // fondu dans le score d'Initiative comme les autres modificateurs de capacités.
            initiative: -mountedInitiativePenalty(character),
          },
        ),
        // PV des niveaux mixtes d'un profil hybride (p. 177) ; identique au mono-famille sinon.
        hpFamilyGains: familyHpGains(character, rulesContext),
        // PV de base d'un profil hybride créé au niveau 1 (somme des deux familles, p. 180).
        hpLevel1Family: level1FamilyHp(character, rulesContext),
        // Détail par famille pour l'infobulle (vide hors hybridation).
        hpLevel1Families: level1HybridFamilies(character, rulesContext),
        // Détail du gain de PV niveau par niveau, pour l'infobulle.
        hpLevelGains: hpLevelGains(character, rulesContext),
      }
    : null;

  // Bonus de DM situationnels (PER-115) — calculés ICI car certains dépendent du `maxHp` (gate « PV bas »
  // du flibustier r8, PER-74). `maxHp` vient de `deriveStats(derivedInput)` (undefined si profil incomplet
  // → les bonus `requiresLowHp` restent inactifs, comportement sûr).
  const maxHp = derivedInput ? deriveStats(derivedInput).maxHp : undefined;
  // PER-324 — décalage de cran du dé évolutif porté par le personnage, appliqué aux riders +1d4°
  // des armes magiques (défaut 0 = aucun décalage).
  const tierBonus = scalingDieTierBonus(character);
  // Aux riders des capacités s'ajoutent ceux des propriétés de l'arme magique en main (Fléau, Élément,
  // Affûtée « aux critiques » ; +1d4°, p. 251, PER-307), résolus au niveau du personnage.
  const meleeSituationalDamage = [
    ...weaponDamageBonuses(character, 'melee', meleeWorn, maxHp).situational,
    ...magicWeaponSituationalDamage(meleeWornLine, meleeWorn?.name ?? '', character.level, tierBonus),
  ];
  const rangedSituationalDamage = [
    ...weaponDamageBonuses(character, 'ranged', rangedWorn, maxHp).situational,
    ...magicWeaponSituationalDamage(rangedWornLine, rangedWorn?.name ?? '', character.level, tierBonus),
  ];
  // PER-116/307 — bonus situationnels de la MAIN SECONDAIRE (combat à deux armes) : calculés pour SON
  // arme (donc filtrés par SA condition + ses propriétés magiques), pour être affichés SOUS sa ligne et
  // non confondus avec ceux de l'arme principale. Vide hors combat à deux armes.
  const offHandMeleeSituationalDamage = offHandMelee
    ? [
        ...weaponDamageBonuses(character, 'melee', offHandMelee.item, maxHp).situational,
        ...magicWeaponSituationalDamage(offHandMelee.line, offHandMelee.item.name, character.level, tierBonus),
      ]
    : [];
  const meleeAttackNotes = [
    ...flayerMeleeAttackNotes(modFeatureIds),
    ...warmageMeleeAttackNotes(modFeatureIds),
    ...elementalistMeleeAttackNotes(character),
    ...demiOgreMeleeAttackNotes(character),
  ];
  const rangedAttackNotes = [
    ...elementalistRangedAttackNotes(character),
    ...demiOgreRangedAttackNotes(character),
  ];

  return {
    modFeatureIds,
    effectContext: effectCtx,
    derivedInput,
    defenseBadges,
    meleeCriticalRanges,
    rangedCriticalRanges,
    unarmed,
    meleeWeaponDamage,
    offHandMeleeWeaponDamage,
    offHandCriticalRanges,
    offHandTouchDelta,
    twoWeaponPenaltyDie: twoWeaponCombat.penaltyDie,
    unarmedCriticalRanges,
    rangedWeaponDamage,
    meleeSituationalDamage,
    offHandMeleeSituationalDamage,
    rangedSituationalDamage,
    meleeAttackNotes,
    rangedAttackNotes,
    rangedAttackMagicalSourceId: rangedAttackMagical,
    rangedAttackElement: rangedAttackEl,
    rangedReplacingFormAttack: formAttackReplacingRanged,
    meleeReplacingFormAttack: formAttackReplacingMelee,
    activeDefenseOverride: defenseOverride,
    activeInitiativeOverride: initiativeOverride,
    attackBonusModSources,
    itemDerivedModSources,
  };
}
