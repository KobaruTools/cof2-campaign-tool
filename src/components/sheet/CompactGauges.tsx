'use client';

/**
 * Bandeau de jauges CONDENSÉES en lecture seule : PV, mana et points de chance réduits à
 * trois barres très fines empilées, soudées entre elles. Volontairement dépouillé — ni
 * icône, ni chiffre, ni contrôle, ni info-bulle interactive : le seul but est le coup
 * d'œil, savoir d'un regard qui est entamé sur les cartes de l'écran de MJ (où le
 * contenu doit rester transparent aux clics pour que la carte entière ouvre le panneau
 * de fiche).
 *
 * PLAQUÉ contre le bord SUPÉRIEUR de la carte, HORS DU FLUX (l'appelant le positionne en
 * absolu) : c'est ce qui règle le décalage entre cartes. Un personnage sans sort n'a pas
 * de piste de mana, donc un bandeau plus court — mais comme il ne participe pas au flux,
 * la réserve de hauteur en haut de la carte reste fixe et les blocs qui suivent
 * (aperçu, statistiques dérivées) sont alignés d'une carte à l'autre.
 *
 * Les jauges pilotables (avec chiffres, ±1, dégâts/soin) restent `HpGauge` et `GaugeRow`
 * dans le bloc « État du personnage ». Ici on ne réutilise que la barre présentationnelle
 * (`GaugeBar`, en variante soudée) et les calculs purs de `gauges.ts` : mêmes valeurs
 * courantes que la fiche, aucune dérive.
 *
 * Une jauge sans réserve n'est pas affichée : pas de mana sans sort connu
 * (`manaMax === null`), pas de chance à `luckMax` nul.
 */
import Stack from '@mui/material/Stack';
import { currentHp, currentLuck, currentMana } from '@/lib/character/gauges';
import type { Depletion } from '@/lib/character/types';
import { GaugeBar, type GaugeSegment } from './GaugeBar';

/** Hauteur d'une piste du bandeau, en pixels. */
export const COMPACT_GAUGE_HEIGHT = 5;
/** Filet sombre entre deux pistes (le fond de la carte se voit à travers). */
const COMPACT_GAUGE_ROW_GAP = 1;
/**
 * Hauteur TOTALE réservée par le bandeau (3 pistes + les 2 filets), à réserver en haut
 * de la carte porteuse pour que le contenu ne passe jamais dessous — quel que soit le
 * nombre de pistes réellement rendues.
 */
export const COMPACT_GAUGES_STRIP_HEIGHT = 3 * COMPACT_GAUGE_HEIGHT + 2 * COMPACT_GAUGE_ROW_GAP;

export interface CompactGaugesProps {
  /** Dépletion transitoire du personnage (manque de PV / mana / chance). */
  depletion: Depletion;
  /** PV maximum (surcharge manuelle déjà appliquée par l'appelant). */
  maxHp: number;
  /** Réserve de mana maximale, ou `null` si le personnage ne connaît aucun sort. */
  manaMax: number | null;
  /** Réserve de points de chance maximale (0 → pas de piste). */
  luckMax: number;
}

export function CompactGauges({ depletion, maxHp, manaMax, luckMax }: CompactGaugesProps) {
  // PV : même tri-segment que la jauge complète (PV actuels / DM temporaires / DM létaux),
  // donc piste pleine à neuf et lecture identique à la fiche.
  const lethal = Math.max(0, depletion.hp?.lethal ?? 0);
  const temp = Math.max(0, depletion.hp?.temp ?? 0);
  const hpSegments: GaugeSegment[] = [
    { key: 'current', value: currentHp(maxHp, depletion), color: 'success.main' },
    { key: 'temp', value: temp, color: 'warning.main' },
    { key: 'lethal', value: lethal, color: 'error.main' },
  ];

  return (
    <Stack sx={{ rowGap: `${COMPACT_GAUGE_ROW_GAP}px` }}>
      {maxHp > 0 && <GaugeBar max={maxHp} segments={hpSegments} height={COMPACT_GAUGE_HEIGHT} flush />}
      {manaMax !== null && manaMax > 0 && (
        <GaugeBar
          max={manaMax}
          segments={[{ key: 'mana', value: currentMana(manaMax, depletion), color: 'info.main' }]}
          height={COMPACT_GAUGE_HEIGHT}
          flush
        />
      )}
      {luckMax > 0 && (
        <GaugeBar
          max={luckMax}
          segments={[{ key: 'luck', value: currentLuck(luckMax, depletion), color: 'secondary.main' }]}
          height={COMPACT_GAUGE_HEIGHT}
          flush
        />
      )}
    </Stack>
  );
}
