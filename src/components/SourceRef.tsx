'use client';

import Typography from '@mui/material/Typography';
import type { SxProps, Theme } from '@mui/material/styles';

/** Titre du livre de base — source unique des règles CO2. */
export const RULEBOOK_NAME = 'Chroniques Oubliées Fantasy';

export interface SourceRefProps {
  /** Numéro de page dans le livre (cf. `sourcePage` des données). */
  page?: number;
  /** Section ou titre de paragraphe, affiché avant la page (ex. « Touche finale »). */
  section?: string;
  /** Style additionnel fusionné par-dessus la légende. */
  sx?: SxProps<Theme>;
}

/**
 * Citation de source standardisée : affiche « Chroniques Oubliées Fantasy — [section, ]p. N »
 * en légende discrète. À utiliser partout où l'on renvoie le joueur au livre
 * (infobulles, texte de règle verbatim, cartes de capacité…).
 */
export function SourceRef({ page, section, sx }: SourceRefProps) {
  const ref = [section, page != null ? `p. ${page}` : null].filter(Boolean).join(', ');
  return (
    <Typography variant="caption" sx={{ color: 'text.secondary', ...sx }}>
      {RULEBOOK_NAME}
      {ref && ` — ${ref}`}
    </Typography>
  );
}
