'use client';

import * as React from 'react';
import Backdrop from '@mui/material/Backdrop';
import Box from '@mui/material/Box';
import Portal from '@mui/material/Portal';
import Tooltip from '@mui/material/Tooltip';
import type { TooltipProps } from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import { SourceRef } from '@/components/SourceRef';

/** Délai (ms) au-delà duquel MUI referme seul l'infobulle tactile ; on le désactive de fait (voir plus bas) pour la laisser épinglée jusqu'au tap en dehors. */
const TOUCH_LEAVE_DELAY_MS = 24 * 60 * 60 * 1000;

export interface AppTooltipProps extends Omit<TooltipProps, 'title'> {
  /**
   * Contenu de l'infobulle : texte simple ou nœud React. Une valeur vide
   * (`''`/`null`) désactive l'affichage, comme le `Tooltip` MUI (utile pour les
   * infobulles conditionnelles n'apparaissant que dans un état bloqué).
   */
  title: React.ReactNode;
  /** Page du livre à citer en source sous le contenu (cf. `SourceRef`) ; nombre ou plage (« 219-220 »). */
  page?: number | string;
  /** Section/titre de paragraphe à citer en source (cf. `SourceRef`). */
  section?: string;
  /** Lien Codex du bouton accolé à la puce de source (cf. `SourceRef.codexHref`). */
  codexHref?: string;
  /** Largeur maximale de la bulle (px ou valeur CSS). Défaut : laissé à MUI. */
  maxWidth?: number | string;
  /** Conserve les retours à la ligne du contenu (`white-space: pre-line`). */
  preLine?: boolean;
  /**
   * Délai (ms) avant apparition au survol. Appliqué aussi à `enterNextDelay` pour rester
   * constant même juste après une autre bulle. Défaut : comportement MUI (bulle quasi immédiate).
   * Utile pour une info secondaire toujours identique qu'on ne veut pas voir surgir à chaque survol.
   */
  enterDelay?: number;
}

/**
 * Infobulle unique de l'application. Habille le `Tooltip` MUI (dont le look —
 * fond noir translucide, flou, bordure, ombre — et la flèche sont définis une
 * seule fois dans le thème) et absorbe le motif récurrent « contenu + citation
 * de source ». Point d'entrée unique : préférer ce composant à `@mui/material/
 * Tooltip` partout dans l'app.
 *
 * Sur pointeur tactile (`pointer: coarse`), la bulle déclenchée par l'appui
 * long de MUI reste épinglée à l'écran (fond assombri) au lieu de disparaître
 * peu après le relâchement du doigt ; un tap sur le fond assombri la referme.
 * Comportement au survol/clic inchangé sur pointeur fin (souris/trackpad).
 */
export function AppTooltip({
  title,
  page,
  section,
  codexHref,
  maxWidth,
  preLine,
  enterDelay,
  slotProps,
  children,
  ...rest
}: AppTooltipProps) {
  // `noSsr` : sans lui, MUI rend `false` au premier client render (aligné SSR)
  // puis bascule après montage — ce qui fait passer `open` d'`undefined` à une
  // valeur définie en cours de vie du `Tooltip`, déclenchant l'avertissement
  // MUI "changing uncontrolled ... to controlled" en masse à chaque montage
  // sur mobile (ex. remount des lignes pendant un glisser-déposer).
  const isTouch = useMediaQuery('(pointer: coarse)', { noSsr: true });
  const [touchOpen, setTouchOpen] = React.useState(false);
  // Le `touchend` de l'appui long qui ouvre la bulle cible encore l'élément
  // d'origine (capturé au `touchstart`, avant que le fond assombri n'existe) :
  // le clic issu de ce même geste doit être avalé une fois pour ne pas
  // déclencher l'action du bouton sous-jacent. Le timeout est un filet de
  // sécurité si ce clic ne survient jamais (le drapeau ne doit pas fuiter sur
  // un futur tap réel une fois la bulle refermée).
  const suppressNextClickRef = React.useRef(false);
  const handleTouchOpen = () => {
    suppressNextClickRef.current = true;
    setTouchOpen(true);
    window.setTimeout(() => {
      suppressNextClickRef.current = false;
    }, 600);
  };

  const hasSource = page != null || section != null;

  const content = hasSource ? (
    <Box sx={{ py: 0.5 }}>
      <Typography variant="body2" component="div" sx={{ mb: 1 }}>
        {title}
      </Typography>
      <SourceRef page={page} section={section} codexHref={codexHref} />
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
  const callerPopper = slotProps?.popper as { onClick?: (event: React.MouseEvent) => void } | undefined;

  // Un clic n'importe où dans la bulle (texte, `SourceRef`, marge de
  // remplissage) doit rester sans effet sur le reste de l'appli : bloqué ici
  // pour de bon, il n'a plus à remonter jusqu'à un éventuel bouton ancêtre.
  // Nécessaire car la bulle est portée hors du DOM du déclencheur : React fait
  // encore bubbler l'évènement le long de l'arbre React (pas du DOM) jusqu'à
  // cet ancêtre, qui pourrait s'activer par erreur — sans ce blocage, ni les
  // clics dans la bulle ni ceux sur le fond assombri n'en seraient exemptés.
  const mergedSlotProps: TooltipProps['slotProps'] = {
    ...slotProps,
    ...(Object.keys(tooltipSx).length > 0
      ? {
          tooltip: {
            ...callerTooltip,
            sx: [tooltipSx, callerTooltip?.sx].filter(Boolean) as never,
          },
        }
      : {}),
    popper: {
      ...callerPopper,
      onClick: (event: React.MouseEvent) => {
        event.stopPropagation();
        callerPopper?.onClick?.(event);
      },
    } as never,
  };

  // Le `Tooltip` MUI ne rend pas son propre nœud DOM (il se pose sur son enfant direct) :
  // le marqueur de capture (PER-443) est donc posé sur cet enfant, cloné une fois ici, plutôt
  // que sur le `Tooltip` lui-même.
  const childElement = children as React.ReactElement<Record<string, unknown>>;
  const taggedChildren = React.cloneElement(childElement, {
    'data-glossary-shot': childElement.props['data-glossary-shot'] ?? 'AppTooltip',
  });
  const childWithClickCapture = taggedChildren as React.ReactElement<{
    onClickCapture?: (event: React.MouseEvent) => void;
  }>;
  const touchTrigger = isTouch
    ? React.cloneElement(childWithClickCapture, {
        onClickCapture: (event: React.MouseEvent) => {
          if (suppressNextClickRef.current) {
            suppressNextClickRef.current = false;
            event.preventDefault();
            event.stopPropagation();
            return;
          }
          childWithClickCapture.props.onClickCapture?.(event);
        },
      })
    : taggedChildren;

  return (
    <>
      <Tooltip
        title={content}
        slotProps={mergedSlotProps}
        {...(enterDelay != null ? { enterDelay, enterNextDelay: enterDelay } : {})}
        {...rest}
        {...(isTouch
          ? {
              open: touchOpen,
              onOpen: handleTouchOpen,
              onClose: () => setTouchOpen(false),
              leaveTouchDelay: TOUCH_LEAVE_DELAY_MS,
            }
          : {})}
      >
        {touchTrigger}
      </Tooltip>
      {isTouch && (
        <Portal>
          <Backdrop
            open={touchOpen}
            onClick={(event) => {
              event.stopPropagation();
              setTouchOpen(false);
            }}
            sx={(theme) => ({
              zIndex: theme.zIndex.tooltip - 1,
              backgroundColor: 'rgba(0, 0, 0, 0.6)',
            })}
          />
        </Portal>
      )}
    </>
  );
}
