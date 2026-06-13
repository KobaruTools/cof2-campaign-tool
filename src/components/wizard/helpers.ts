/**
 * Aides du wizard de création (calculs UI purs).
 */
import { equipementParId, progression } from '@/data';
import { series as seriesData } from '@/data/series';
import type { CaracId, Profil } from '@/data/schema';
import { CARAC_IDS } from '@/data/schema';
import type { EquipementLigne } from '@/lib/character/types';
import type { DefenseEquipement } from '@/lib/engine';
import { isCustomItem } from '@/lib/character/types';

export const series = seriesData;

/**
 * Répartit les 7 valeurs d'une série sur les caractéristiques : les plus
 * fortes d'abord sur les caractéristiques conseillées du profil, le reste sur
 * les autres dans l'ordre canonique.
 */
export function repartirSerie(valeurs: number[], conseillees: CaracId[]): Record<CaracId, number> {
  const tri = [...valeurs].sort((a, b) => b - a);
  const ordre: CaracId[] = [
    ...conseillees.filter((c, i) => conseillees.indexOf(c) === i),
    ...CARAC_IDS.filter((c) => !conseillees.includes(c)),
  ];
  const out = {} as Record<CaracId, number>;
  ordre.forEach((id, i) => {
    out[id] = tri[i] ?? 0;
  });
  return out;
}

/** Équipement de départ d'un profil + sac d'aventurier, en lignes du modèle. */
export function equipementInitial(profil: Profil): EquipementLigne[] {
  const lignes: EquipementLigne[] = [];
  for (const ref of [...profil.equipementDepart, ...progression.sacAventurier]) {
    if (ref.itemId) {
      lignes.push({ itemId: ref.itemId, quantite: ref.quantite });
    } else {
      lignes.push({ custom: true, nom: ref.libelle, quantite: ref.quantite });
    }
  }
  return lignes;
}

/** Libellé d'affichage d'une ligne d'équipement. */
export function libelleEquipement(ligne: EquipementLigne): string {
  if (isCustomItem(ligne)) return ligne.nom;
  return equipementParId.get(ligne.itemId)?.nom ?? ligne.itemId;
}

/** Contribution de l'équipement porté à la défense (armures + boucliers). */
export function defenseDepuisEquipement(equipment: EquipementLigne[]): DefenseEquipement {
  let bonusDef = 0;
  let agiMax: number | null = null;
  for (const ligne of equipment) {
    if (isCustomItem(ligne)) continue;
    const item = equipementParId.get(ligne.itemId);
    if (!item) continue;
    if (item.categorie === 'armure') {
      bonusDef += item.def;
      if (item.agiMax !== null) agiMax = agiMax === null ? item.agiMax : Math.min(agiMax, item.agiMax);
    } else if (item.categorie === 'bouclier') {
      bonusDef += item.def;
    }
  }
  return { bonusDef, agiMax };
}
