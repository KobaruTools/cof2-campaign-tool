/**
 * Poids affiché ajusté par la Voie du colosse (p. 149) : « il augmente son poids d'au moins
 * 10 kg par rang atteint dans la voie, tout en muscle. » Pur fluff — aucune des capacités de
 * la voie (`prestige-colosse-r4` à `r8`) ne le mécanise dans ses `effects[]`. Calculé ici
 * uniquement pour L'AFFICHAGE en lecture de la fiche (jamais en mode édition, où le champ
 * Poids reste la saisie brute du joueur).
 */
import { pathRankCountsFromFeatures, pathRanksFromFeatures } from '@/lib/character/effects';
import type { StatBreakdown } from '@/lib/ui/derivedStatBreakdown';

const COLOSSUS_PATH_ID = 'prestige-colosse';
const KG_PER_RANK = 10;

/** Poids de base saisi par le joueur (virgule décimale acceptée), `null` si non numérique. */
function parseWeightKg(weight: string | undefined): number | null {
  if (!weight) return null;
  const n = Number(weight.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

/** Nombre formaté à la française (virgule décimale), sans décimale inutile (ex. « 112,5 »). */
export function formatWeightKg(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1).replace('.', ',');
}

/**
 * Détail du poids ajusté par la Voie du colosse : poids de base + 10 kg par rang ACQUIS dans
 * la voie (1 à 5 rangs, `prestige-colosse-r4`…`r8` → +10 à +50 kg). `null` si le personnage
 * n'a pas la voie, ou si le poids saisi n'est pas une valeur numérique (rien à ventiler).
 */
export function buildColossusWeightBreakdown(
  weight: string | undefined,
  featureIds: string[],
): StatBreakdown | null {
  const ranksAcquired = pathRankCountsFromFeatures(featureIds)[COLOSSUS_PATH_ID] ?? 0;
  if (ranksAcquired <= 0) return null;
  const base = parseWeightKg(weight);
  if (base === null) return null;

  // Puce de voie de l'infobulle : la capacité du rang le plus haut réellement acquis
  // (numéro BRUT 4-8), distinct du COMPTE de rangs (1-5) qui pilote le montant du bonus.
  const maxRank = pathRanksFromFeatures(featureIds)[COLOSSUS_PATH_ID] ?? 0;
  const bonus = ranksAcquired * KG_PER_RANK;

  return {
    terms: [
      { label: 'Poids de base', value: base },
      { label: 'Voie du colosse', value: bonus, featureId: `${COLOSSUS_PATH_ID}-r${maxRank}` },
    ],
    total: base + bonus,
    note: `+${KG_PER_RANK} kg par rang atteint dans la voie, tout en muscle (${ranksAcquired}/5 rangs acquis, p. 149).`,
    page: 149,
  };
}
