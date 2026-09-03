/**
 * Combat à mains nues (PER-141) — module PUR. Décrit l'« arme » mains nues d'un
 * personnage pour la carte « Attaque au contact » (bascule arme ⇄ mains nues).
 *
 * Le cas commun est figé par le livre : `1d3 + FOR` contondants, DM temporaires /
 * non létaux (arme `mains-nues`, p. 183 ; DM temporaires p. 219). Trois sources
 * modifient les mains nues et sont agrégées ici comme un bloc d'arme :
 * - MOINE (voies de moine, p. 119-121) : DM létaux au choix (trait de profil),
 *   Poings de fer (dé qui monte par rang, FOR→AGI aux DM ET aux tests d'attaque, PER-453),
 *   Mains d'énergie (attaques magiques, FOR→VOL aux DM), Griffes du tigre (1 au dé → max,
 *   choix du type de DM), Morsure du serpent (plage de critique +1 au contact) ;
 * - ARQUEBUSIER — Pilier de bar (p. 64) : `1d4°` non létal, sans caractéristique ;
 * - COLOSSE — Stature de géant (voie de prestige, p. 149) : `1d6` fixe au lieu de `1d3`.
 *
 * On AFFICHE (dé, carac, létalité, plage de critique) : aucun jet n'est résolu.
 * La TOUCHE n'est PAS recalculée ICI (identique à l'attaque au contact, base + FOR, cf.
 * `meleeAttack`) : `touchAbilities` ne fait que SIGNALER une substitution best-of possible
 * (Poings de fer) ; c'est `characterDerivedView.ts` qui la résout en écart de touche
 * (`unarmedTouchDelta`), la fiche connaissant seule la caractéristique de base résolue.
 */
import { classById, equipmentById, featureById } from '@/data';
import type { AbilityId, WeaponDamage } from '@/data/schema';
import type { Character } from '@/lib/character/types';
import { activeFeatureIdsForMods, isEffectActive, pathRanksFromFeatures } from '@/lib/character/effects';
import type { PermanentFlatBonus } from '@/lib/character/weaponDamageBonus';

/** Capacité contribuant au combat à mains nues (tooltip verbatim + source). */
export interface UnarmedStrikeSource {
  featureId: string;
  name: string;
}

/**
 * DM bonus SITUATIONNEL ajouté aux attaques à mains nues par une capacité (PER-322,
 * ex. âme forgée « Choc électrique » : +1d4° d'électricité une fois par round). Générique
 * et data-driven : toute capacité portant un effet `weapon-damage-bonus` dont la condition
 * cible la famille d'arme `unarmed` est agrégée ici. Le module « arme portée »
 * (`weaponDamageBonuses`) les ignore justement (la condition de famille n'est jamais
 * satisfaite sans arme en main) — c'est donc ici qu'ils s'affichent.
 */
export interface UnarmedBonusDamage {
  featureId: string;
  name: string;
  /** Expression courte du bonus, ex. « +1d4° », « +2 » ou « +FOR ». */
  amount: string;
  /** Condition situationnelle en toutes lettres (ex. « électricité, une fois par round »). */
  label?: string;
}

export interface UnarmedStrikeView {
  /** Dé(s) de DM de base, résolu(s) au rang courant. `nonLethal` reflète la létalité. */
  damage: WeaponDamage;
  /** Dé évolutif « ° » (p. 43) — Pilier de bar. Rendu « 1d4° ». */
  evolving: boolean;
  /**
   * Caractéristique(s) ajoutable(s) aux DM (best-of si plusieurs, comme la notation
   * `FOR/AGI` du livre). Vide = aucune (Pilier de bar).
   */
  damageAbilities: AbilityId[];
  /**
   * Caractéristique(s) utilisable(s) pour le TEST D'ATTAQUE à mains nues (best-of si plusieurs).
   * `['FOR']` dans le cas commun. Poings de fer (p. 121, PER-453) l'étend à `['FOR', 'AGI']` — le
   * moine « peut remplacer sa FOR par son AGI pour ses tests d'attaque au contact » : modélisé en
   * best-of automatique, comme `damageAbilities`, pas en choix manuel à la table.
   */
  touchAbilities: AbilityId[];
  /**
   * Non létal (défaut, p. 219), AU CHOIX (moine) ou LÉTAL forcé (félis « Armes naturelles », Le
   * Compagnon p. 19 : DM létaux avec les armes naturelles). Un moine garde TOUJOURS le choix
   * d'infliger des DM létaux ou non à mains nues (« lorsqu'il le souhaite », p. 119) — y compris
   * avec Poings de fer (« il peut, s'il le souhaite… »), donc jamais forcé létal.
   */
  lethality: 'non-lethal' | 'choice' | 'lethal';
  /** Attaques considérées comme magiques (Mains d'énergie, p. 119). */
  magical: boolean;
  /** « 1 au dé remplacé par le résultat maximal » (Griffes du tigre, p. 119). */
  minRollBecomesMax: boolean;
  /** Le moine peut choisir tranchant/perforant au lieu de contondant (Griffes du tigre). */
  damageTypeChoice: boolean;
  /** Élargissement de la plage de critique au contact, actif à mains nues (Morsure du serpent). */
  criticalRangeBonus: number;
  /** DM bonus situationnels à mains nues, octroyés par des capacités (voir `UnarmedBonusDamage`). */
  bonusDamage: UnarmedBonusDamage[];
  /**
   * Bonus PLATS permanents (entiers) à AJOUTER à l'expression de DM à mains nues (ex. demi-ogre
   * « Réaction violente » +2, PER-325). Rendus comme pour l'arme portée — un « +2 » blanc dans la
   * formule via `WeaponDamageExpr.flatBonuses` — et non plus en badge distinct (aucune raison de
   * traiter mains nues et arme différemment). Les bonus en DÉ restent, eux, des badges situationnels.
   */
  flatBonuses: PermanentFlatBonus[];
  /** Capacités modifiant le combat à mains nues (pour le rendu verbatim + source). */
  sources: UnarmedStrikeSource[];
}

/** Expression courte d'un bonus de DM d'arme (dé, caractéristique ou plat) pour un badge. */
function formatBonusAmount(effect: {
  dice?: { count: number; die: string; evolving?: boolean };
  ability?: string;
  flat?: unknown;
}): string {
  if (effect.dice) return `+${effect.dice.count}${effect.dice.die}${effect.dice.evolving ? '°' : ''}`;
  if (effect.ability) return `+${effect.ability}`;
  if (typeof effect.flat === 'number') return effect.flat >= 0 ? `+${effect.flat}` : `${effect.flat}`;
  return '';
}

/** DM de base de la table des armes (p. 183) : `1d3` contondant. */
const BASE_DAMAGE: WeaponDamage = (() => {
  const item = equipmentById.get('mains-nues');
  const dmg = item && item.category === 'weapon' ? item.damage : undefined;
  return dmg ? { count: dmg.count, die: dmg.die } : { count: 1, die: 'd3' };
})();

/**
 * Dé de Poings de fer selon le rang atteint dans la voie du poing (p. 121) :
 * 1d6 (r1), 1d8 (r2), 1d10 (r3), 1d12 (r4), 2d6 (r5+).
 */
const IRON_FIST_DIE_BY_RANK: Record<number, WeaponDamage> = {
  1: { count: 1, die: 'd6' },
  2: { count: 1, die: 'd8' },
  3: { count: 1, die: 'd10' },
  4: { count: 1, die: 'd12' },
  5: { count: 2, die: 'd6' },
};

/** Ajoute une caractéristique à la liste des DM en préservant l'ordre et l'unicité. */
function addAbility(abilities: AbilityId[], ability: AbilityId): AbilityId[] {
  return abilities.includes(ability) ? abilities : [...abilities, ability];
}

/** Nom affiché d'une capacité (pour la liste des sources). */
function addSource(sources: UnarmedStrikeSource[], featureId: string): UnarmedStrikeSource[] {
  const name = featureById.get(featureId)?.name;
  if (!name || sources.some((s) => s.featureId === featureId)) return sources;
  return [...sources, { featureId, name }];
}

/**
 * Décrit l'attaque à mains nues d'un personnage : dé(s) de DM, caractéristique(s),
 * létalité, caractère magique, plage de critique et capacités contributrices.
 */
export function unarmedStrike(character: Character): UnarmedStrikeView {
  const acquired = new Set(activeFeatureIdsForMods(character));
  const has = (id: string) => acquired.has(id);
  const pathRanks = pathRanksFromFeatures([...acquired]);

  const monkPaths = classById.get('moine')?.pathIds ?? [];
  const isMonk = [...acquired].some((id) => {
    const path = featureById.get(id)?.pathId;
    return path !== undefined && monkPaths.includes(path);
  });

  let damage: WeaponDamage = { ...BASE_DAMAGE };
  let evolving = false;
  let damageAbilities: AbilityId[] = ['FOR'];
  let touchAbilities: AbilityId[] = ['FOR'];
  let lethality: UnarmedStrikeView['lethality'] = 'non-lethal';
  let magical = false;
  let minRollBecomesMax = false;
  let damageTypeChoice = false;
  let criticalRangeBonus = 0;
  let sources: UnarmedStrikeSource[] = [];

  // Arquebusier — Pilier de bar (p. 64) : remplace la mains nues par 1d4° non létal, sans carac.
  if (has('mercenaire-r1')) {
    damage = { count: 1, die: 'd4' };
    evolving = true;
    damageAbilities = [];
    lethality = 'non-lethal';
    sources = addSource(sources, 'mercenaire-r1');
  }

  // FÉLIS — Armes naturelles (voie du félis r2, Le Compagnon p. 19, PER-329) : le félis attaque avec
  // ses griffes/crocs, remplaçant les mains nues par [1d4 + FOR] DM LÉTAUX. Sur une action limitée, il
  // peut substituer l'AGI à la FOR (attaque ET DM) → best-of `['FOR', 'AGI']` aux DM (patron Poings de
  // fer, l'économie d'action n'étant pas modélisée ; l'échange en TOUCHE reste verbatim). Placé AVANT
  // le moine/colosse/poing : un félis moine garde le dé (≥) et la létalité AU CHOIX de la voie du poing.
  if (has('felis-r2')) {
    damage = { count: 1, die: 'd4' };
    evolving = false;
    damageAbilities = ['FOR', 'AGI'];
    lethality = 'lethal';
    sources = addSource(sources, 'felis-r2');
  }

  // KOBOLD — Ruse kobold (voie du kobold r1, Le Compagnon p. 25, PER-332) : le kobold peut remplacer une
  // attaque à mains nues par une morsure qui inflige [1d4 + FOR] DM LÉTAUX. Contrairement au félis, un seul
  // dé fixe (non évolutif) et la FOR seule (pas de substitution d'AGI). Placé APRÈS félis-r2 et AVANT le
  // moine/colosse/poing (mêmes règles de préséance : un kobold moine garde le dé ≥ et la létalité AU CHOIX).
  if (has('kobold-r1')) {
    damage = { count: 1, die: 'd4' };
    evolving = false;
    damageAbilities = ['FOR'];
    lethality = 'lethal';
    sources = addSource(sources, 'kobold-r1');
  }

  // Trait de profil du moine (p. 119) : DM létaux AU CHOIX à mains nues — le moine maîtrise sa force
  // et décide toujours si le coup est létal ou non (jamais forcé).
  if (isMonk) lethality = 'choice';

  // COLOSSE — Stature de géant (voie de prestige du colosse, r4, p. 149, PER-74) : « il inflige 1d6 DM
  // à mains nues ». Simple surcharge du dé de la table des armes (1d3 → 1d6) : la FOR reste ajoutée aux
  // DM, et la létalité reste celle du livre (non létal p. 219 — le colosse n'a pas le contrôle du moine).
  // Le dé est FIXE (aucun « ° »), il ne monte pas avec le niveau. Placé AVANT Poings de fer : un colosse
  // qui serait aussi moine garde le dé du moine, toujours supérieur ou égal (1d6 dès le rang 1, p. 121).
  if (has('prestige-colosse-r4')) {
    damage = { count: 1, die: 'd6' };
    evolving = false;
    damageAbilities = addAbility(damageAbilities, 'FOR');
    sources = addSource(sources, 'prestige-colosse-r4');
  }

  // Poings de fer (p. 121) : dé qui monte avec le rang de la voie du poing ; FOR→AGI possible (best-of,
  // choix de table validé sur `poing-r1`). La létalité reste AU CHOIX (« il peut, s'il le souhaite… »).
  // Le livre étend explicitement la substitution AUX TESTS D'ATTAQUE (« remplacer sa FOR par son AGI
  // pour ses tests d'attaque au contact », PER-453) — modélisée en best-of automatique comme les DM.
  if (has('poing-r1')) {
    const rank = Math.min(5, Math.max(1, pathRanks['poing'] ?? 1));
    damage = { ...IRON_FIST_DIE_BY_RANK[rank] };
    evolving = false;
    damageAbilities = ['FOR', 'AGI'];
    touchAbilities = ['FOR', 'AGI'];
    sources = addSource(sources, 'poing-r1');
  }

  // Mains d'énergie (p. 119) : attaques magiques + FOR→VOL possible aux DM.
  if (has('energie-vitale-r1')) {
    magical = true;
    damageAbilities = addAbility(damageAbilities, 'VOL');
    sources = addSource(sources, 'energie-vitale-r1');
  }

  // Griffes du tigre (p. 119) : 1 au dé → max ; choix tranchant/perforant.
  if (has('maitrise-r2')) {
    minRollBecomesMax = true;
    damageTypeChoice = true;
    sources = addSource(sources, 'maitrise-r2');
  }

  // Morsure du serpent (p. 119) : plage de critique au contact +1 à mains nues. La capacité déclare
  // sa condition d'arme de façon structurée (`criticalRange.weaponCondition.kind === 'unarmed'`,
  // PER-136) — c'est la source unique de la plage à mains nues (la vue « arme »,
  // `criticalRangeSources`, l'ignore justement). La valeur est un littéral (1) sur toutes les
  // capacités concernées du catalogue ; une valeur scalante nécessiterait le contexte d'effets.
  for (const id of acquired) {
    const feature = featureById.get(id);
    const crit = feature?.criticalRange;
    if (!crit || crit.scope !== 'melee') continue;
    if (crit.weaponCondition?.kind !== 'unarmed') continue;
    if (typeof crit.value === 'number') criticalRangeBonus += crit.value;
    sources = addSource(sources, id);
  }

  // DM bonus situationnels à mains nues (PER-322) : tout effet `weapon-damage-bonus` dont la
  // condition cible la famille d'arme `unarmed`. Générique — la capacité les déclare en données,
  // ce module ne code aucun id en dur (contenu payant compris).
  const bonusDamage: UnarmedBonusDamage[] = [];
  const flatBonuses: PermanentFlatBonus[] = [];
  for (const id of acquired) {
    const feature = featureById.get(id);
    if (!feature?.effects) continue;
    for (const effect of feature.effects) {
      if (effect.kind !== 'weapon-damage-bonus') continue;
      if (!effect.condition.weaponFamilies?.includes('unarmed')) continue;
      // Bonus piloté par un INTERRUPTEUR (PER-325, demi-ogre « Réaction violente ») : n'apparaît que
      // tant que l'effet conditionnel référencé est ACTIF (comme pour l'arme portée, cf.
      // `weaponDamageBonuses`). Absent = bonus non conditionné (cas historique, âme forgée « Choc
      // électrique »). `requiresActiveEffectIndex` cible l'effet conditionnel de la MÊME capacité.
      if (
        effect.requiresActiveEffectIndex != null &&
        !isEffectActive(character, id, effect.requiresActiveEffectIndex)
      )
        continue;
      // Bonus PLAT permanent (entier) → agrégé à la formule de DM (« +2 » blanc), comme l'arme portée
      // (`weaponDamageBonuses.addedFlat`). Les bonus en dé, ou situationnels, restent des badges.
      if (typeof effect.flat === 'number' && !effect.situational) {
        if (effect.flat > 0) {
          flatBonuses.push({ featureId: id, name: feature.name, sourcePage: feature.sourcePage, value: effect.flat });
        }
        continue;
      }
      const amount = formatBonusAmount(effect);
      if (!amount) continue;
      bonusDamage.push({ featureId: id, name: feature.name, amount, label: effect.condition.label });
    }
  }

  damage = { ...damage, nonLethal: lethality === 'non-lethal' };

  return {
    damage,
    evolving,
    damageAbilities,
    touchAbilities,
    lethality,
    magical,
    minRollBecomesMax,
    damageTypeChoice,
    criticalRangeBonus,
    bonusDamage,
    flatBonuses,
    sources,
  };
}

/**
 * Chaîne de DM mains nues pour `<DamageValue>` : dé(s) (+ marqueur ° évolutif) suivis
 * de la ou des caractéristiques (« 1d6 + FOR/AGI »). Le caractère non létal n'est PAS
 * rendu en parenthèses ici : il est signalé par un badge dédié sur la carte.
 */
export function formatUnarmedDamage(view: UnarmedStrikeView): string {
  let text = `${view.damage.count}${view.damage.die}`;
  if (view.evolving) text += '°';
  if (view.damage.modifier) text += view.damage.modifier > 0 ? `+${view.damage.modifier}` : `${view.damage.modifier}`;
  if (view.damageAbilities.length > 0) text += ` + ${view.damageAbilities.join('/')}`;
  return text;
}
