'use client';

import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import type { AbilityId } from '@/data/schema';
import { ABILITY_IDS } from '@/data/schema';
import { abilityTotalColor } from '@/lib/ui/abilityColors';
import { ABILITY_NAMES } from '@/lib/ui/ability';
import { AbilityIcon } from '@/components/AbilityIcon';

export interface AbilitiesGridProps {
  /** Les 7 valeurs finales du personnage (modificateurs de peuple déjà inclus). */
  abilities: Record<AbilityId, number>;
  /**
   * Édition en place : si fourni, chaque caractéristique devient un champ
   * numérique. Sinon, affichage en lecture seule. La fiche est permissive — la
   * saisie n'est jamais bornée (avertissements gérés ailleurs).
   */
  onChange?: (id: AbilityId, value: number) => void;
}

/**
 * Les 7 caractéristiques de la fiche, en lecture ou en édition. Reprend le
 * langage visuel du récapitulatif du wizard (icône + code + valeur colorée).
 */
export function AbilitiesGrid({ abilities, onChange }: AbilitiesGridProps) {
  return (
    <Grid container spacing={1}>
      {ABILITY_IDS.map((id) => {
        const value = abilities[id];
        const color = abilityTotalColor(value);
        return (
          <Grid key={id} size={{ xs: 6, sm: 12 / 7 }}>
            <Box
              title={ABILITY_NAMES[id]}
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 0.5,
                px: 0.5,
                py: 1,
              }}
            >
              <AbilityIcon ability={id} title size={32} sx={{ color: 'text.secondary' }} />
              <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 'bold' }}>
                {id}
              </Typography>
              {onChange ? (
                <TextField
                  type="number"
                  size="small"
                  value={value}
                  onChange={(e) => onChange(id, Number(e.target.value) || 0)}
                  slotProps={{ htmlInput: { style: { textAlign: 'center', fontWeight: 700, color } } }}
                  sx={{ width: 72 }}
                />
              ) : (
                <Typography variant="h6" sx={{ fontWeight: 'bold', color }}>
                  {value > 0 ? '+' : ''}
                  {value}
                </Typography>
              )}
            </Box>
          </Grid>
        );
      })}
    </Grid>
  );
}
