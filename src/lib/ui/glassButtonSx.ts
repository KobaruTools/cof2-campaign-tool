import { alpha, type Theme } from '@mui/material/styles';

/**
 * Style « verre teinté » des boutons secondaires posés sur fond illustré (écran de MJ,
 * navigation du wizard) : fond translucide + flou d'arrière-plan, teinté par la tonalité
 * MUI (`info` = bleu, `error` = rouge). Remplace le simple `outlined`/`text`, trop peu
 * lisible sur un fond illustré (`HomeBackground`). Extrait de l'écran de MJ (PER-405).
 */
export function glassButtonSx(theme: Theme, tone: 'info' | 'error') {
  return {
    color: theme.palette[tone].light,
    bgcolor: alpha(theme.palette[tone].main, 0.18),
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    border: `1px solid ${alpha(theme.palette[tone].main, 0.5)}`,
    '&:hover': {
      bgcolor: alpha(theme.palette[tone].main, 0.28),
      borderColor: theme.palette[tone].light,
    },
    '&.Mui-disabled': {
      color: alpha(theme.palette[tone].light, 0.38),
      borderColor: alpha(theme.palette[tone].main, 0.2),
      bgcolor: alpha(theme.palette[tone].main, 0.06),
    },
  } as const;
}
