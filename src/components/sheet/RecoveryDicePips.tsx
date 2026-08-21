'use client';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import type { Die } from '@/data/schema';
import { AppTooltip } from '@/components/AppTooltip';
import { DieIcon } from '@/components/DieIcon';

export interface RecoveryDicePipsProps {
  /** Nombre total de dés de récupération de la réserve. */
  max: number;
  /** Dés encore disponibles (déjà borné par l'appelant). */
  current: number;
  /** Dé de récupération du profil (dynamique), affiché à droite de la matrice. */
  die: Die;
  /** Règle la réserve à `value` dés disponibles. */
  onSet: (value: number) => void;
}

/**
 * Réserve de dés de récupération en MATRICE de petits blocs (PER-151), 5 par ligne :
 * plein (vert) = DR disponible, contour vide = DR dépensé. Cliquer un bloc règle la
 * réserve à sa position (cliquer le dernier plein le dépense). Le dé de récupération
 * du profil (dynamique) est affiché à droite.
 *
 * Extrait de `PlayerStatusPanel` pour être partagé avec la démo de la vitrine : la
 * réserve de DR s'y lit à l'identique de la fiche.
 */
export function RecoveryDicePips({ max, current, die, onSet }: RecoveryDicePipsProps) {
  return (
    <Stack direction="row" spacing={1} data-glossary-shot="RecoveryDicePips" sx={{ alignItems: 'center' }}>
      <AppTooltip title={`Dés de récupération : ${current} / ${max}`}>
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            // Largeur max = 5 blocs de 14px + 4 espaces de 3px → retour à la ligne après 5.
            // Le contenu est aligné à DROITE : la dernière ligne (incomplète) reste collée au dé.
            maxWidth: '82px',
            gap: '3px',
            justifyContent: 'flex-end',
          }}
        >
          {Array.from({ length: max }, (_, i) => {
            const filled = i < current;
            const pos = i + 1;
            return (
              <Box
                key={i}
                component="button"
                type="button"
                aria-label={filled ? `Dépenser un dé de récupération (${pos})` : `Regagner un dé de récupération (${pos})`}
                onClick={() => onSet(pos === current ? pos - 1 : pos)}
                sx={(theme) => ({
                  width: 14,
                  height: 14,
                  p: 0,
                  cursor: 'pointer',
                  borderRadius: '3px',
                  border: `1px solid ${theme.palette.success.main}`,
                  bgcolor: filled ? theme.palette.success.main : 'transparent',
                  transition: 'background-color 0.1s',
                  '&:hover': { borderColor: theme.palette.success.dark },
                })}
              />
            );
          })}
        </Box>
      </AppTooltip>
      <DieIcon die={die} size={22} />
    </Stack>
  );
}
