'use client';

/**
 * Replie le corps d'une capacité de voie quand il est vraiment très long (PER-419 retours, ex.
 * « Origine ou gagne-pain personnalisé », liste des voies du rang 3 touche-à-tout) : replié par
 * défaut, laisse voir un aperçu des premières lignes plutôt que de tout masquer (contrairement au
 * chevron plein-repli de `PathCard`).
 *
 * Sous `LARGE_CONTENT_THRESHOLD`, AUCUN wrapper de taille (pas de `Collapse`, pas de hauteur
 * minimum) : `children`/`extra` sont rendus dans un `Box` nu, à leur taille naturelle (retour
 * PER-419, répété à plusieurs reprises : les petits blocs ne doivent JAMAIS être contraints — le
 * `Collapse` de MUI n'intervient QUE dans la branche « bloc confirmé très long » ci-dessous).
 *
 * `extra` (les choix, `CodexFeatureChoices`) reste un slot séparé du texte verbatim (`children`) :
 * replié, il est masqué entièrement plutôt que coupé à mi-hauteur — un bloc de choix à moitié
 * visible ressemblait à du vide.
 *
 * Le bouton n'est pas rendu ici : `header` est un render-prop qui reçoit l'état
 * (`overflows`/`expanded`/`onToggle`) pour que l'appelant le place sur SA propre ligne d'en-tête
 * (« Afficher plus » sur la même ligne que le nom de rang). Cette ligne est collée (`sticky`) sous
 * l'en-tête de l'app UNIQUEMENT une fois dépliée.
 */
import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import Box from '@mui/material/Box';
import useMediaQuery from '@mui/material/useMediaQuery';
import type { Theme } from '@mui/material/styles';

/** Au-delà de cette hauteur réelle COMBINÉE (texte + choix), le bloc est jugé « très long ». */
const LARGE_CONTENT_THRESHOLD = 420;
const PREVIEW_HEIGHT = 220;

export interface CollapsibleFeatureToggle {
  overflows: boolean;
  expanded: boolean;
  onToggle: () => void;
}

function useAppHeaderHeight(): number {
  // Même hauteur d'en-tête que `ReferenceBrowser` (patron déjà établi pour coller sous l'en-tête
  // global de l'app plutôt que de le recalculer par mesure DOM).
  const smUp = useMediaQuery((t: Theme) => t.breakpoints.up('sm'));
  return smUp ? 83 : 75;
}

export function CollapsibleFeatureBody({
  header,
  extra,
  children,
}: {
  header: (toggle: CollapsibleFeatureToggle) => ReactNode;
  /** Contenu annexe (choix) : masqué entièrement replié, jamais coupé à mi-hauteur. */
  extra?: ReactNode;
  children: ReactNode;
}) {
  const measureRef = useRef<HTMLDivElement | null>(null);
  const [overflows, setOverflows] = useState(false);
  const appHeaderHeight = useAppHeaderHeight();

  useLayoutEffect(() => {
    const el = measureRef.current;
    if (el && el.scrollHeight > LARGE_CONTENT_THRESHOLD) setOverflows(true);
  }, []);

  // Tant qu'on ne sait pas (ou que le contenu tient) : AUCUNE contrainte, rendu direct dans un
  // Box nu. `measureRef` reste posé ici pour la mesure — s'il s'avère trop grand, le re-rendu
  // suivant bascule sur la branche repliable ci-dessous.
  if (!overflows) {
    return (
      <Box>
        {header({ overflows: false, expanded: false, onToggle: () => {} })}
        <Box ref={measureRef}>
          {children}
          {extra}
        </Box>
      </Box>
    );
  }

  return (
    <CollapsedFeatureBody header={header} extra={extra} appHeaderHeight={appHeaderHeight}>
      {children}
    </CollapsedFeatureBody>
  );
}

/** Branche « confirmé très long » : seule celle-ci utilise `Collapse`. */
function CollapsedFeatureBody({
  header,
  extra,
  appHeaderHeight,
  children,
}: {
  header: (toggle: CollapsibleFeatureToggle) => ReactNode;
  extra?: ReactNode;
  appHeaderHeight: number;
  children: ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Box>
      <Box
        sx={{
          position: expanded ? 'sticky' : 'static',
          top: appHeaderHeight + 8,
          zIndex: 2,
          bgcolor: expanded ? 'background.paper' : 'transparent',
        }}
      >
        {header({ overflows: true, expanded, onToggle: () => setExpanded((v) => !v) })}
      </Box>
      <Box sx={{ position: 'relative' }}>
        <Box sx={{ maxHeight: expanded ? 'none' : PREVIEW_HEIGHT, overflow: 'hidden' }}>{children}</Box>
        {!expanded && (
          <Box
            sx={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: 40,
              background: 'linear-gradient(to bottom, transparent, rgba(0, 0, 0, 0.55))',
              pointerEvents: 'none',
            }}
          />
        )}
      </Box>
      {expanded && extra}
    </Box>
  );
}
