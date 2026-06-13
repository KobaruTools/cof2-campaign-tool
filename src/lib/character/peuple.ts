/**
 * Modificateurs de caractéristiques apportés par le peuple (création, p. 26-28).
 *
 * Un peuple a un ou deux modificateurs ; chacun cible une caractéristique fixe
 * (`caracs` de longueur 1) ou laisse le choix entre plusieurs (ex. demi-elfe
 * « +1 PER ou CHA »). L'humain a un modificateur « +1 à une des deux plus
 * faibles » encodé avec les 7 caractéristiques admissibles : le choix est libre
 * dans le modèle, l'UI conseille les plus faibles.
 */
import type { CaracId, Peuple } from '@/data/schema';
import { CARAC_IDS } from '@/data/schema';

/**
 * Choix résolus pour chaque modificateur du peuple, dans le même ordre que
 * `peuple.modificateurs`. Pour un modificateur fixe, la valeur est imposée
 * (= son unique carac). `null` = choix non encore fait.
 */
export type PeupleChoix = (CaracId | null)[];

/** Initialise les choix : caracs fixes pré-remplies, choix multiples à null. */
export function choixInitiaux(peuple: Peuple): PeupleChoix {
  return peuple.modificateurs.map((mod) => (mod.caracs.length === 1 ? mod.caracs[0] : null));
}

/** Tous les choix multiples sont-ils résolus ? */
export function choixComplets(peuple: Peuple, choix: PeupleChoix): boolean {
  return peuple.modificateurs.every((mod, i) => {
    if (mod.caracs.length === 1) return true;
    const c = choix[i];
    return c !== null && c !== undefined && mod.caracs.includes(c);
  });
}

/**
 * Deltas par caractéristique résultant des modificateurs de peuple résolus.
 * Les choix non résolus sont ignorés (delta 0) — la validation se fait via
 * `choixComplets`.
 */
export function deltasModificateurs(peuple: Peuple, choix: PeupleChoix): Record<CaracId, number> {
  const deltas = CARAC_IDS.reduce(
    (acc, id) => {
      acc[id] = 0;
      return acc;
    },
    {} as Record<CaracId, number>,
  );
  peuple.modificateurs.forEach((mod, i) => {
    const cible = mod.caracs.length === 1 ? mod.caracs[0] : choix[i];
    if (cible) deltas[cible] += mod.valeur;
  });
  return deltas;
}

/** Applique les modificateurs de peuple à des valeurs de base. */
export function appliquerModificateurs(
  base: Record<CaracId, number>,
  peuple: Peuple,
  choix: PeupleChoix,
): Record<CaracId, number> {
  const deltas = deltasModificateurs(peuple, choix);
  return CARAC_IDS.reduce(
    (acc, id) => {
      acc[id] = base[id] + deltas[id];
      return acc;
    },
    {} as Record<CaracId, number>,
  );
}

/**
 * Les deux caractéristiques les plus faibles d'un jeu de valeurs (pour
 * conseiller le bonus de l'humain). Retourne les ids triés par valeur
 * croissante puis ordre canonique.
 */
export function deuxPlusFaibles(base: Record<CaracId, number>): CaracId[] {
  return [...CARAC_IDS].sort((a, b) => base[a] - base[b]).slice(0, 2);
}
