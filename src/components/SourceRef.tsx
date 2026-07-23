'use client';

import { Fragment } from 'react';
import Box from '@mui/material/Box';
import { alpha } from '@mui/material/styles';
import type { SxProps, Theme } from '@mui/material/styles';
import { BOOKS, DEFAULT_BOOK_ID, type BookId } from '@/lib/ui/books';
import { splitPageRefs } from '@/lib/ui/pageRefs';
import { usePdfViewerStore } from '@/stores/pdfViewer';

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
 *
 * Le badge est **cliquable** : il ouvre le visualiseur PDF intégré sur le livre, à la page citée
 * (PER-240). Comme `PageRefText` transforme tout « (p. N) » en `SourceRef`, ce seul point rend
 * cliquables tous les renvois de page de l'app. Pour une PLAGE (« 219-220 »), on saute à la
 * première page. Sans page, on ouvre simplement le livre au début.
 */
export function SourceRef({ page, section, book = DEFAULT_BOOK_ID, sx }: SourceRefProps) {
  const openAt = usePdfViewerStore((s) => s.openAt);
  const meta = BOOKS[book];
  const { Icon } = meta;
  const label = [section, page != null ? `p. ${page}` : null].filter(Boolean).join(', ');
  const targetPage = page != null ? Number.parseInt(String(page), 10) : NaN;

  const open = (e: React.SyntheticEvent) => {
    // Empêche l'ouverture du visualiseur d'activer un conteneur cliquable englobant
    // (ligne de liste, résumé d'accordéon, carte de capacité…).
    e.stopPropagation();
    openAt(book, Number.isFinite(targetPage) ? targetPage : 1);
  };

  return (
    // `span[role=button]` plutôt qu'un vrai `<button>` : `SourceRef` s'affiche parfois À
    // L'INTÉRIEUR d'éléments interactifs (résumé d'accordéon, ligne de liste) et un bouton
    // imbriqué dans un bouton est du HTML invalide (erreur d'hydratation).
    <Box
      component="span"
      role="button"
      tabIndex={0}
      title={`${meta.name} — ouvrir dans le visualiseur`}
      onClick={open}
      onKeyDown={(e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          open(e);
        }
      }}
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
          cursor: 'pointer',
          lineHeight: 1,
          fontSize: '0.75rem',
          fontVariantNumeric: 'tabular-nums',
          color: 'text.secondary',
          bgcolor: alpha(theme.palette.text.primary, 0.06),
          border: `1px solid ${alpha(theme.palette.text.primary, 0.12)}`,
          transition: theme.transitions.create(['background-color', 'border-color', 'color']),
          '&:hover': {
            color: 'text.primary',
            bgcolor: alpha(theme.palette.primary.main, 0.12),
            borderColor: alpha(theme.palette.primary.main, 0.4),
          },
        }),
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      <Icon sx={{ fontSize: 14 }} />
      {label && <Box component="span">{label}</Box>}
    </Box>
  );
}

/**
 * Rend un texte en remplaçant chaque référence de page parenthésée (« (p. 188) »)
 * par la puce de source `SourceRef` (icône du livre + « p. N ») — notion GLOBALE :
 * partout où une chaîne de règle cite sa page (avertissements, notes de calcul…),
 * on renvoie le joueur au livre d'un badge cohérent plutôt que d'un texte brut.
 * Le reste du texte est rendu tel quel. Voir `splitPageRefs`.
 */
export function PageRefText({ children, book }: { children: string; book?: BookId }) {
  return (
    <>
      {splitPageRefs(children).map((seg, i) =>
        seg.kind === 'text' ? (
          <Fragment key={i}>{seg.value}</Fragment>
        ) : (
          <SourceRef key={i} page={seg.page} book={book} sx={{ mx: 0.25 }} />
        ),
      )}
    </>
  );
}
