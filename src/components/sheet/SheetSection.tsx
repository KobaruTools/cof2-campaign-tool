import type { ReactNode } from 'react';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

export interface SheetSectionProps {
  /** Titre de la section (h2). */
  title: string;
  /** Élément optionnel aligné à droite du titre (bouton, badge…). */
  action?: ReactNode;
  children: ReactNode;
}

/**
 * Cadre titré commun aux sections de la fiche de personnage (identité,
 * caractéristiques, stats, voies, équipement). Centralise l'espacement et la
 * ligne de titre pour un rendu uniforme.
 */
export function SheetSection({ title, action, children }: SheetSectionProps) {
  return (
    <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 } }}>
      <Stack
        direction="row"
        spacing={1}
        sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 2 }}
      >
        <Typography variant="h6" component="h2">
          {title}
        </Typography>
        {action}
      </Stack>
      {children}
    </Paper>
  );
}
