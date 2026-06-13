'use client';

import type { SxProps, Theme } from '@mui/material/styles';
import type { DerivedInput } from '@/lib/engine';
import { DERIVED_STAT_NAMES, type DerivedStatId } from '@/lib/ui/derivedStats';
import { derivedStatBreakdown } from '@/lib/ui/derivedStatBreakdown';
import { BreakdownContent } from '@/components/BreakdownContent';
import { InfoHint } from '@/components/InfoHint';

export interface DerivedStatHintProps {
  statId: DerivedStatId;
  /** Mêmes entrées que `deriveStats` — sert à recalculer le détail. */
  input: DerivedInput;
  sx?: SxProps<Theme>;
}

/**
 * Icône « i » à poser à côté d'une statistique dérivée : au survol, détaille
 * d'où vient le total (terme par terme), avec la page source CO2.
 */
export function DerivedStatHint({ statId, input, sx }: DerivedStatHintProps) {
  const bd = derivedStatBreakdown(statId, input);
  return (
    <InfoHint page={bd.page} sx={sx}>
      <BreakdownContent title={DERIVED_STAT_NAMES[statId]} breakdown={bd} />
    </InfoHint>
  );
}
