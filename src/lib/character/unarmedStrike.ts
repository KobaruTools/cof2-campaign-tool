/**
 * Combat à mains nues (PER-141) — module PUR. Décrit l'« arme » mains nues d'un
 * personnage pour la carte « Attaque au contact » (bascule arme ⇄ mains nues).
 *
 * Le cas commun est figé par le livre : `1d3 + FOR` contondants, DM temporaires /
 * non létaux (arme `mains-nues`, p. 183 ; DM temporaires p. 219). Deux profils
 * modifient leur mains nues et sont agrégés ici comme un bloc d'arme :
 * - MOINE (voies de moine, p. 119-121) : DM létaux au choix (trait de profil),
 *   Poings de fer (dé qui monte par rang, FOR→AGI aux DM), Mains d'énergie
 *   (attaques magiques, FOR→VOL aux DM), Griffes du tigre (1 au dé → max, choix du
 *   type de DM), Morsure du serpent (plage de critique +1 au contact) ;
 * - ARQUEBUSIER — Pilier de bar (p. 64) : `1d4°` non létal, sans caractéristique.
 *
 * On AFFICHE (dé, carac, létalité, plage de critique) : aucun jet n'est résolu.
 * La TOUCHE n'est pas recalculée ici (identique à l'attaque au contact, base + FOR,
 * cf. `meleeAttack`) ; seule la partie DM / létalité / critique est décrite.
 */
import { classById, equipmentById, featureById } from '@/data';
import type { AbilityId, WeaponDamage } from '@/data/schema';
import type { Character } from '@/lib/character/types';
import { activeFeatureIdsForMods, pathRanksFromFeatures } from '@/lib/character/effects';

/** Capacité contribuant au combat à mains nues (tooltip verbatim + source). */
export interface UnarmedStrikeSource {
  featureId: string;
  name: string;
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
   * Non létal (défaut, p. 219) ou AU CHOIX (moine). Un moine garde TOUJOURS le choix d'infliger
   * des DM létaux ou non à mains nues (« lorsqu'il le souhaite », p. 119) — y compris avec Poings
   * de fer (« il peut, s'il le souhaite… »), donc jamais forcé létal.
   */
  lethality: 'non-lethal' | 'choice';
  /** Attaques considérées comme magiques (Mains d'énergie, p. 119). */
  magical: boolean;
  /** « 1 au dé remplacé par le résultat maximal » (Griffes du tigre, p. 119). */
  minRollBecomesMax: boolean;
  /** Le moine peut choisir tranchant/perforant au lieu de contondant (Griffes du tigre). */
  damageTypeChoice: boolean;
  /** Élargissement de la plage de critique au contact, actif à mains nues (Morsure du serpent). */
  criticalRangeBonus: number;
  /** Capacités modifiant le combat à mains nues (pour le rendu verbatim + source). */
  sources: UnarmedStrikeSource[];
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

  // Trait de profil du moine (p. 119) : DM létaux AU CHOIX à mains nues — le moine maîtrise sa force
  // et décide toujours si le coup est létal ou non (jamais forcé).
  if (isMonk) lethality = 'choice';

  // Poings de fer (p. 121) : dé qui monte avec le rang de la voie du poing ; FOR→AGI possible (best-of,
  // choix de table validé sur `poing-r1`). La létalité reste AU CHOIX (« il peut, s'il le souhaite… »).
  if (has('poing-r1')) {
    const rank = Math.min(5, Math.max(1, pathRanks['poing'] ?? 1));
    damage = { ...IRON_FIST_DIE_BY_RANK[rank] };
    evolving = false;
    damageAbilities = ['FOR', 'AGI'];
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

  // Morsure du serpent (p. 119) : plage de critique au contact +1 à mains nues.
  // La valeur est un littéral (1) sur toutes les capacités concernées du catalogue ;
  // une valeur scalante nécessiterait le contexte d'effets (aucune aujourd'hui).
  for (const id of acquired) {
    const feature = featureById.get(id);
    const crit = feature?.criticalRange;
    if (!crit || crit.scope !== 'melee') continue;
    const isBareHanded = (feature.effects ?? []).some(
      (e) => e.kind === 'conditional-stat-bonus' && /mains.?nues/i.test(e.activation.label ?? ''),
    );
    if (!isBareHanded) continue;
    if (typeof crit.value === 'number') criticalRangeBonus += crit.value;
    sources = addSource(sources, id);
  }

  damage = { ...damage, nonLethal: lethality === 'non-lethal' };

  return {
    damage,
    evolving,
    damageAbilities,
    lethality,
    magical,
    minRollBecomesMax,
    damageTypeChoice,
    criticalRangeBonus,
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
