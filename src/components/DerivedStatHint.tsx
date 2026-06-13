'use client';

import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import type { SxProps, Theme } from '@mui/material/styles';
import type { DerivedInput } from '@/lib/engine';
import { DERIVED_STAT_NAMES, type DerivedStatId } from '@/lib/ui/derivedStats';
import { derivedStatBreakdown } from '@/lib/ui/derivedStatBreakdown';
import { InfoHint } from '@/components/InfoHint';

export interface DerivedStatHintProps {
  statId: DerivedStatId;
  /** Mêmes entrées que `deriveStats` — sert à recalculer le détail. */
  input: DerivedInput;
  sx?: SxProps<Theme>;
}

const signed = (v: number) => (v >= 0 ? `+${v}` : `${v}`);

/**
 * Icône « i » à poser à côté d'une statistique dérivée : au survol, détaille
 * d'où vient le total (terme par terme), avec la page source CO2.
 */
export function DerivedStatHint({ statId, input, sx }: DerivedStatHintProps) {
  const bd = derivedStatBreakdown(statId, input);
  const content = (
    <Box sx={{ minWidth: 180 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
        {DERIVED_STAT_NAMES[statId]}
      </Typography>
      {bd.terms.map((t, i) => (
        <Box
          key={i}
          sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, fontVariantNumeric: 'tabular-nums' }}
        >
          <span>{t.label}</span>
          <span style={{ fontWeight: 600 }}>{signed(t.value)}</span>
        </Box>
      ))}
      {bd.total !== null && bd.terms.length > 0 && (
        <>
          <Divider sx={{ my: 0.5 }} />
          <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, fontWeight: 700 }}>
            <span>Total</span>
            <span>{bd.total}</span>
          </Box>
        </>
      )}
      {bd.note && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
          {bd.note}
        </Typography>
      )}
    </Box>
  );
  return (
    <InfoHint page={bd.page} sx={sx}>
      {content}
    </InfoHint>
  );
}
