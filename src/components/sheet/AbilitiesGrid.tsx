'use client';

import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import type { AbilityId, Ancestry } from '@/data/schema';
import { ABILITY_IDS } from '@/data/schema';
import type { AncestryChoice } from '@/lib/character/ancestry';
import { abilityTotalColor } from '@/lib/ui/abilityColors';
import { ABILITY_NAMES } from '@/lib/ui/ability';
import { AbilityIcon } from '@/components/AbilityIcon';
import { AbilityBreakdownTooltip } from '@/components/AbilityBreakdownTooltip';

export interface AbilitiesGridProps {
  /** Les 7 valeurs finales du personnage (modificateurs de peuple déjà inclus). */
  abilities: Record<AbilityId, number>;
  /**
   * Édition en place : si fourni, chaque caractéristique devient un champ
   * numérique. Sinon, affichage en lecture seule. La fiche est permissive — la
   * saisie n'est jamais bornée (avertissements gérés ailleurs).
   */
  onChange?: (id: AbilityId, value: number) => void;
  /**
   * Détail « base + peuple = total » au survol du chiffre. Fourni ensemble :
   * valeurs de base, peuple et résolution de ses modificateurs. Absent (peuple
   * inconnu) → pas d'infobulle.
   */
  baseAbilities?: Record<AbilityId, number>;
  ancestry?: Ancestry;
  ancestryChoices?: AncestryChoice;
}

/**
 * Les 7 caractéristiques de la fiche, en lecture ou en édition. Reprend le
 * langage visuel du récapitulatif du wizard (icône + code + valeur colorée).
 * Au survol du chiffre, une infobulle détaille « base + peuple = total » quand
 * le peuple est fourni.
 */
export function AbilitiesGrid({
  abilities,
  onChange,
  baseAbilities,
  ancestry,
  ancestryChoices,
}: AbilitiesGridProps) {
  const canExplain = baseAbilities != null && ancestry != null && ancestryChoices != null;
  return (
    <Grid container spacing={1}>
      {ABILITY_IDS.map((id) => {
        const value = abilities[id];
        const color = abilityTotalColor(value);
        const field = onChange ? (
          <TextField
            type="number"
            size="small"
            value={value}
            onChange={(e) => onChange(id, Number(e.target.value) || 0)}
            slotProps={{ htmlInput: { style: { textAlign: 'center', fontWeight: 700, color } } }}
            sx={{ width: 72 }}
          />
        ) : (
          <Typography variant="h6" sx={{ fontWeight: 'bold', color, cursor: 'help' }}>
            {value > 0 ? '+' : ''}
            {value}
          </Typography>
        );
        return (
          <Grid key={id} size={{ xs: 6, sm: 12 / 7 }}>
            <Box
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
              <Typography
                variant="subtitle2"
                color="text.secondary"
                title={ABILITY_NAMES[id]}
                sx={{ fontWeight: 'bold' }}
              >
                {id}
              </Typography>
              {canExplain ? (
                <AbilityBreakdownTooltip
                  abilityId={id}
                  baseAbilities={baseAbilities}
                  ancestry={ancestry}
                  ancestryChoices={ancestryChoices}
                >
                  {field}
                </AbilityBreakdownTooltip>
              ) : (
                field
              )}
            </Box>
          </Grid>
        );
      })}
    </Grid>
  );
}
