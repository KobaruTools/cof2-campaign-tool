'use client';

import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import type { ImmunitySource } from '@/lib/character/effects';
import { SheetSection } from '@/components/sheet/SheetSection';

export interface ImmunitiesPanelProps {
  /** Immunités agrégées des capacités acquises (cf. `aggregateImmunities`). */
  immunities: ImmunitySource[];
}

/**
 * Encadré « Immunités » (PER-103) : liste les états/effets auxquels le personnage est
 * immunisé, agrégés depuis ses capacités (ex. Liberté d'action du barde). Chaque puce
 * indique au survol la/les capacité(s) qui accordent l'immunité. Rendu uniquement s'il
 * y a au moins une immunité.
 */
export function ImmunitiesPanel({ immunities }: ImmunitiesPanelProps) {
  if (immunities.length === 0) return null;
  return (
    <SheetSection title="Immunités" collapsible defaultCollapsed persistKey="immunities">
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
        États et effets auxquels le personnage est immunisé (accordés par ses capacités).
      </Typography>
      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
        {immunities.map((imm) => (
          <Tooltip
            key={imm.id}
            arrow
            title={`Accordé par : ${imm.sources.join(', ')}`}
          >
            <Stack
              direction="row"
              spacing={0.75}
              sx={{
                alignItems: 'center',
                px: 1,
                py: 0.5,
                borderRadius: 1,
                cursor: 'help',
                bgcolor: (theme) => alpha(theme.palette.success.main, 0.12),
                border: 1,
                borderColor: (theme) => alpha(theme.palette.success.main, 0.4),
              }}
            >
              <Typography component="span" aria-hidden sx={{ fontSize: '1rem', lineHeight: 1 }}>
                🛡
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {imm.label}
              </Typography>
            </Stack>
          </Tooltip>
        ))}
      </Stack>
    </SheetSection>
  );
}
