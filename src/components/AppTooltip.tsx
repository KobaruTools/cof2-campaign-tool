'use client';

import Box from '@mui/material/Box';
import Tooltip from '@mui/material/Tooltip';
import type { TooltipProps } from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { SourceRef } from '@/components/SourceRef';

export interface AppTooltipProps extends Omit<TooltipProps, 'title'> {
  /**
   * Contenu de l'infobulle : texte simple ou nœud React. Une valeur vide
   * (`''`/`null`) désactive l'affichage, comme le `Tooltip` MUI (utile pour les
   * infobulles conditionnelles n'apparaissant que dans un état bloqué).
   */
  title: React.ReactNode;
  /** Page du livre à citer en source sous le contenu (cf. `SourceRef`). */
  page?: number;
  /** Section/titre de paragraphe à citer en source (cf. `SourceRef`). */
  section?: string;
  /** Largeur maximale de la bulle (px ou valeur CSS). Défaut : laissé à MUI. */
  maxWidth?: number | string;
  /** Conserve les retours à la ligne du contenu (`white-space: pre-line`). */
  preLine?: boolean;
}

/**
 * Infobulle unique de l'application. Habille le `Tooltip` MUI (dont le look —
 * fond noir translucide, flou, bordure, ombre — et la flèche sont définis une
 * seule fois dans le thème) et absorbe le motif récurrent « contenu + citation
 * de source ». Point d'entrée unique : préférer ce composant à `@mui/material/
 * Tooltip` partout dans l'app.
 */
export function AppTooltip({
  title,
  page,
  section,
  maxWidth,
  preLine,
  slotProps,
  children,
  ...rest
}: AppTooltipProps) {
  const hasSource = page != null || section != null;

  const content = hasSource ? (
    <Box sx={{ py: 0.5 }}>
      <Typography variant="body2" component="div" sx={{ mb: 1 }}>
        {title}
      </Typography>
      <SourceRef page={page} section={section} />
    </Box>
  ) : (
    title
  );

  // Fusionne maxWidth/preLine dans le style de la bulle sans écraser un
  // slotProps.tooltip éventuellement fourni par l'appelant (son sx passe en
  // dernier dans le tableau pour rester prioritaire).
  const tooltipSx: Record<string, unknown> = {};
  if (maxWidth != null) tooltipSx.maxWidth = maxWidth;
  if (preLine) tooltipSx.whiteSpace = 'pre-line';

  const callerTooltip = slotProps?.tooltip as { sx?: unknown } | undefined;
  const mergedSlotProps: TooltipProps['slotProps'] =
    Object.keys(tooltipSx).length > 0
      ? {
          ...slotProps,
          tooltip: {
            ...callerTooltip,
            sx: [tooltipSx, callerTooltip?.sx].filter(Boolean) as never,
          },
        }
      : slotProps;

  return (
    <Tooltip title={content} slotProps={mergedSlotProps} {...rest}>
      {children}
    </Tooltip>
  );
}
