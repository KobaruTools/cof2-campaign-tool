'use client';

import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import Box from '@mui/material/Box';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import type { SxProps, Theme } from '@mui/material/styles';
import { SourceRef } from '@/components/SourceRef';

export interface InfoHintProps {
  /** Corps de l'infobulle : conseil ou texte de règle (chaîne ou nœud React). */
  children: React.ReactNode;
  /** Numéro de page citée en source (cf. `SourceRef`). */
  page?: number;
  /** Section ou titre de paragraphe cité en source (cf. `SourceRef`). */
  section?: string;
  /** Taille de l'icône « i ». Par défaut `small`. */
  fontSize?: 'inherit' | 'small' | 'medium' | 'large';
  /** Style additionnel fusionné par-dessus le style de l'icône. */
  sx?: SxProps<Theme>;
}

/**
 * Icône « i » informative : affiche au survol un texte d'aide (conseil de jeu,
 * extrait de règle…), avec une citation de source optionnelle. Réutilisable
 * partout où une explication doit rester discrète et accessible à la demande.
 */
export function InfoHint({ children, page, section, fontSize = 'small', sx }: InfoHintProps) {
  const hasSource = page != null || section != null;
  const title = (
    <Box sx={{ py: 0.5 }}>
      <Typography variant="body2" sx={{ mb: hasSource ? 1 : 0 }}>
        {children}
      </Typography>
      {hasSource && <SourceRef page={page} section={section} />}
    </Box>
  );
  return (
    <Tooltip title={title} arrow>
      <InfoOutlinedIcon
        fontSize={fontSize}
        sx={{ color: 'text.secondary', cursor: 'help', ...sx }}
      />
    </Tooltip>
  );
}
