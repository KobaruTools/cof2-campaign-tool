'use client';

import Box from '@mui/material/Box';
import { alpha } from '@mui/material/styles';
import type { SxProps, Theme } from '@mui/material/styles';
import { BOOKS, DEFAULT_BOOK_ID, type BookId } from '@/lib/ui/books';

export interface SourceRefProps {
  /**
   * Page dans le livre (cf. `sourcePage` des données). Un nombre dans le cas courant ;
   * une chaîne pour une PLAGE de pages (ex. `'219-220'`, règle qui s'étale sur deux pages).
   */
  page?: number | string;
  /** Section ou titre de paragraphe, affiché avant la page (ex. « Touche finale »). */
  section?: string;
  /** Livre source (défaut : livre des règles). Identifie l'icône et le nom en infobulle. */
  book?: BookId;
  /** Style additionnel fusionné par-dessus le badge. */
  sx?: SxProps<Theme>;
}

/**
 * Citation de source standardisée sous forme de badge compact : icône du livre + « [section, ]p. N ».
 * Le nom du livre passe en infobulle native (`title`) — `SourceRef` s'affichant à l'intérieur des
 * infobulles MUI de l'app, on évite ainsi d'imbriquer un `Tooltip` MUI dans un autre. À utiliser
 * partout où l'on renvoie le joueur au livre (infobulles, texte de règle verbatim, cartes de capacité…).
 */
export function SourceRef({ page, section, book = DEFAULT_BOOK_ID, sx }: SourceRefProps) {
  const meta = BOOKS[book];
  const { Icon } = meta;
  const label = [section, page != null ? `p. ${page}` : null].filter(Boolean).join(', ');
  return (
    <Box
      component="span"
      title={meta.name}
      sx={[
        (theme) => ({
          display: 'inline-flex',
          alignItems: 'center',
          // Aligne le milieu du badge sur le milieu de la ligne de texte : sans ça, un
          // `inline-flex` se cale sur la LIGNE DE BASE et paraît remonté au milieu d'une phrase.
          verticalAlign: 'middle',
          gap: 0.5,
          px: 0.75,
          py: 0.25,
          borderRadius: 1,
          cursor: 'help',
          lineHeight: 1,
          fontSize: '0.75rem',
          fontVariantNumeric: 'tabular-nums',
          color: 'text.secondary',
          bgcolor: alpha(theme.palette.text.primary, 0.06),
          border: `1px solid ${alpha(theme.palette.text.primary, 0.12)}`,
        }),
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      <Icon sx={{ fontSize: 14 }} />
      {label && <Box component="span">{label}</Box>}
    </Box>
  );
}
