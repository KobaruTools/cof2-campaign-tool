/**
 * Voie des saisons (prestige mystique, p. 173, PER-379) : choix de saison (RP, `Character.season`)
 * + mécanisation de la règle de la voie elle-même (pas d'un rang précis — le `note` du chemin) :
 * « Au printemps, il semble plus jeune que son âge d'un nombre d'années égal à deux fois le rang
 * atteint dans la voie (pour un humain) et en hiver c'est l'inverse. » Été/automne : aucun effet
 * (RAW silencieux sur ces deux saisons). « Pour un humain » est un qualificatif EXPLICITE du livre :
 * le calcul ne s'applique qu'à l'ancêtrie humaine, faute de formule pour les autres peuples.
 */
import { pathRanksFromFeatures } from '@/lib/character/effects';
import type { Character, Season } from '@/lib/character/types';
import type { StatBreakdown } from '@/lib/ui/derivedStatBreakdown';

const SEASONS_PATH_ID = 'prestige-saisons';
const YEARS_PER_RANK = 2;

export const SEASON_LABELS: Record<Season, string> = {
  spring: 'Printemps',
  summer: 'Été',
  autumn: 'Automne',
  winter: 'Hiver',
};

/** Patch pur choisissant/effaçant la saison — à appliquer via `update()` (cf. `toggleCrystalActive`). */
export function setSeason(character: Character, season: Season | null): Partial<Character> {
  return { season: season ?? undefined };
}

/** Âge de base saisi par le joueur (entier tête de chaîne, ex. « 34 » ou « 34 ans »), `null` sinon. */
function parseAgeYears(age: string | undefined): number | null {
  if (!age) return null;
  const m = /^\s*(\d+)/.exec(age);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : null;
}

/**
 * Détail de l'âge APPARENT ajusté par la voie des saisons : `null` si la règle ne s'applique pas
 * (peuple ≠ humain, voie non acquise, âge non saisi/non numérique, ou saison été/automne/non
 * choisie — aucun delta RAW). Le delta vaut `2 × rang ATTEINT` (numéro brut 4-8, pas le compte de
 * rangs) — printemps le SOUSTRAIT (paraît plus jeune), hiver l'AJOUTE (paraît plus vieux). Plancher
 * à 0 an à l'affichage (un âge apparent négatif n'a pas de sens), sans jamais bloquer la saisie.
 */
export function buildSeasonalAgeBreakdown(
  age: string | undefined,
  ancestryId: string,
  featureIds: string[],
  season: Season | undefined,
): StatBreakdown | null {
  if (ancestryId !== 'humain') return null;
  if (season !== 'spring' && season !== 'winter') return null;
  const rank = pathRanksFromFeatures(featureIds)[SEASONS_PATH_ID] ?? 0;
  if (rank <= 0) return null;
  const base = parseAgeYears(age);
  if (base === null) return null;

  const delta = rank * YEARS_PER_RANK;
  const signedDelta = season === 'spring' ? -delta : delta;
  const total = Math.max(0, base + signedDelta);
  const featureId = `${SEASONS_PATH_ID}-r${rank}`;

  return {
    terms: [
      { label: 'Âge', value: base },
      {
        label: `Voie des saisons (${SEASON_LABELS[season].toLowerCase()})`,
        value: signedDelta,
        featureId,
      },
    ],
    total,
    note: `Semble ${season === 'spring' ? 'plus jeune' : 'plus vieux'} de ${delta} ans (2 × rang ${rank} atteint dans la voie, pour un humain, p. 173).`,
    page: 173,
  };
}
