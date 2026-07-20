/**
 * Affinités d'arme (PER-218) — module pur, point d'entrée GÉNÉRIQUE de ce qui rend
 * une arme SPÉCIALE pour un personnage donné : maîtrise par exception/octroi, bonus
 * de catégorie… On regroupe ici toutes ces notions pour les rendre visibles d'un
 * même geste dans l'UI (badge positif sur la ligne d'inventaire, pendant du badge
 * « Non maîtrisée · dé malus »).
 *
 * Source livrée : l'arme sacrée du prêtre spécialiste (PER-96). Le résolveur est
 * conçu pour accueillir ensuite, SANS réécriture, les autres sources déjà repérées
 * dans les données (marquées WIP) :
 *  - la catégorie de PRÉDILECTION du guerrier (épées, haches…), bonus câblé PER-136/115 ;
 *  - les ARMES DE PEUPLE octroyant une maîtrise « quel que soit le profil » (hache /
 *    marteau du nain — PER-154 ; arc de l'elfe sylvain).
 * Seule la PRÉSENTATION est du ressort de ce module ; le calcul des bonus et le
 * câblage des octrois de maîtrise restent à leurs tickets respectifs.
 */
import { priestGodById } from '@/data';
import type { Character } from './types';
import { ancestryWeaponMasteryIds, sacredWeaponMasteryIds } from './mastery';

/** Nature d'une affinité (fermée, extensible à mesure que les sources sont branchées). */
export type WeaponAffinityKind = 'sacred-weapon' | 'ancestry-weapon';

/** Ce qui rend une arme spéciale pour un personnage (une par source qui s'applique). */
export interface WeaponAffinity {
  kind: WeaponAffinityKind;
  /** Libellé court du badge (ex. « Arme sacrée · maîtrisée »). */
  label: string;
  /**
   * Texte d'info-bulle : règle verbatim suivie de sa référence « (p. N) ». Rendu via
   * `PageRefText`, qui transforme la référence en puce de source (renvoi au livre).
   */
  tooltip: string;
}

/**
 * Affinités d'arme du personnage pour l'objet du catalogue `itemId` (0..n). Pur.
 * Sources :
 *  - arme sacrée d'un prêtre spécialiste (PER-96), variantes « au choix » et familles d'armes incluses,
 *    via `sacredWeaponMasteryIds` ;
 *  - octroi de maîtrise de PEUPLE (PER-154) : le nain « Haches et marteaux » maîtrise haches et marteau
 *    de guerre quel que soit son profil, via `ancestryWeaponMasteryIds`.
 */
export function weaponAffinities(character: Character, itemId: string): WeaponAffinity[] {
  const affinities: WeaponAffinity[] = [];

  const vocation = character.priestVocation;
  if (vocation?.mode === 'specialist' && sacredWeaponMasteryIds(character).has(itemId)) {
    const god = priestGodById.get(vocation.godId);
    affinities.push({
      kind: 'sacred-weapon',
      label: 'Arme sacrée · maîtrisée',
      tooltip:
        `Arme sacrée${god ? ` de ${god.name}` : ''} : un prêtre spécialiste la maîtrise, même ` +
        `tranchante ou perçante, par exception à la restriction d’armes du prêtre (p. 122).`,
    });
  }

  // Arme de peuple (PER-154). Aujourd'hui seul le nain octroie une telle maîtrise ; l'appartenance à
  // l'ensemble implique donc « Haches et marteaux » (nain-r2). L'elfe sylvain (arc) viendra s'y ajouter.
  if (ancestryWeaponMasteryIds(character).has(itemId)) {
    affinities.push({
      kind: 'ancestry-weapon',
      label: 'Arme de peuple · maîtrisée',
      tooltip:
        'Le nain sait utiliser les haches et les marteaux de guerre, quel que soit son profil (p. 59).',
    });
  }

  return affinities;
}
