'use client';

import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import { deriveStats, type DerivedInput } from '@/lib/engine';
import { DERIVED_STAT_NAMES, type DerivedStatId } from '@/lib/ui/derivedStats';
import { DerivedStatIcon } from '@/components/DerivedStatIcon';
import { DerivedStatHint } from '@/components/DerivedStatHint';
import { DieIcon } from '@/components/DieIcon';

export interface DerivedStatsGridProps {
  /** Entrées du moteur — sert au calcul des stats et au détail des infobulles. */
  input: DerivedInput;
  /** Tailles de colonne MUI Grid, par défaut deux puis trois par ligne. */
  size?: Record<string, number>;
}

/**
 * Grille des statistiques dérivées d'un personnage, sous forme de cartes
 * (icône cerclée + libellé + valeur + infobulle « i » détaillant le calcul avec
 * la page source CO2). Composant d'affichage commun : le récapitulatif du
 * wizard et la fiche de personnage passent tous deux par ici pour un rendu
 * uniforme. Les valeurs viennent du moteur (`deriveStats`) à partir de `input`.
 */
export function DerivedStatsGrid({ input, size = { xs: 6, sm: 4 } }: DerivedStatsGridProps) {
  const stats = deriveStats(input);

  const statLines: Array<{ id: DerivedStatId; value: ReactNode }> = [
    { id: 'maxHp', value: stats.maxHp },
    { id: 'defense', value: stats.defense },
    { id: 'initiative', value: stats.initiative },
    { id: 'luckPoints', value: stats.luckPoints },
    {
      id: 'recoveryDice',
      value: (
        <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}>
          {stats.recoveryDiceCount}
          <DieIcon die={stats.recoveryDie} size={28} />
        </Box>
      ),
    },
    { id: 'manaPoints', value: stats.manaPoints ?? '—' },
    { id: 'meleeAttack', value: stats.meleeAttack },
    { id: 'rangedAttack', value: stats.rangedAttack },
    { id: 'magicAttack', value: stats.magicAttack },
  ];

  return (
    <Grid container spacing={1}>
      {statLines.map(({ id, value }) => (
        <Grid key={id} size={size}>
          <Card variant="outlined" sx={{ height: '100%' }}>
            <CardContent
              sx={{
                py: 1,
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                '&:last-child': { pb: 1 },
              }}
            >
              <DerivedStatIcon statId={id} title size={40} />
              <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.2 }}>
                  {DERIVED_STAT_NAMES[id]}
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 600 }}>
                  {value}
                </Typography>
              </Box>
              <DerivedStatHint statId={id} input={input} sx={{ alignSelf: 'flex-start' }} />
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
}
