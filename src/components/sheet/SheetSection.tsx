'use client';

import { useEffect, useState, type ReactNode } from 'react';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import Collapse from '@mui/material/Collapse';
import Fade from '@mui/material/Fade';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha, type SxProps, type Theme } from '@mui/material/styles';
import { SectionIcon } from '@/components/SectionIcon';
import type { SectionIconName } from '@/lib/ui/sectionIcons';

export interface SheetSectionProps {
  /** Titre de la section (h2). */
  title: string;
  /** Icône optionnelle affichée à gauche du titre (game-icons.net, cf. `<SectionIcon>`). */
  icon?: SectionIconName;
  /**
   * Élément optionnel aligné à droite du titre (bouton, badge…). Peut être une fonction
   * recevant l'état replié courant, pour masquer l'action quand la section est repliée
   * (utile pour des toggles qui n'ont pas de sens sans le contenu visible).
   */
  action?: ReactNode | ((collapsed: boolean) => ReactNode);
  /** Styles supplémentaires fusionnés sur le cadre Paper. */
  sx?: SxProps<Theme>;
  /** Si vrai, le titre devient cliquable (chevron) pour replier/déplier le contenu. */
  collapsible?: boolean;
  /** État initial replié (n'a d'effet que si `collapsible`). */
  defaultCollapsed?: boolean;
  /**
   * Clé de persistance de l'état replié/déplié dans `localStorage` (n'a d'effet que si
   * `collapsible`). Le choix de l'utilisateur survit alors au rechargement, écrasant
   * `defaultCollapsed`.
   */
  persistKey?: string;
  children: ReactNode;
}

const storageKey = (key: string) => `sheet-section-collapsed:${key}`;

/**
 * Cadre titré commun aux sections de la fiche de personnage (identité,
 * caractéristiques, stats, voies, équipement). Centralise l'espacement et la
 * ligne de titre pour un rendu uniforme. Optionnellement repliable (`collapsible`).
 */
export function SheetSection({
  title,
  icon,
  action,
  sx,
  collapsible = false,
  defaultCollapsed = false,
  persistKey,
  children,
}: SheetSectionProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const isCollapsed = collapsible && collapsed;
  const resolvedAction = typeof action === 'function' ? action(isCollapsed) : action;

  // Persistance optionnelle : on relit le choix sauvegardé APRÈS le montage (et non à
  // l'initialisation) pour ne pas désynchroniser le rendu serveur/client. Écrase `defaultCollapsed`.
  useEffect(() => {
    if (!collapsible || !persistKey || typeof window === 'undefined') return;
    const saved = window.localStorage.getItem(storageKey(persistKey));
    if (saved === 'true' || saved === 'false') setCollapsed(saved === 'true');
  }, [collapsible, persistKey]);

  const toggle = () => {
    setCollapsed((c) => {
      const next = !c;
      if (persistKey && typeof window !== 'undefined') {
        window.localStorage.setItem(storageKey(persistKey), String(next));
      }
      return next;
    });
  };

  return (
    <Paper
      variant="outlined"
      // Replié : un clic n'importe où dans le bloc le rouvre (meilleure UX). Déplié : seul le
      // bouton en bas peut le replier (pas de clic sur le corps, qui contient du contenu interactif).
      onClick={isCollapsed ? toggle : undefined}
      sx={[
        (theme) => ({
          p: { xs: 2, sm: 3 },
          cursor: isCollapsed ? 'pointer' : undefined,
          // Verre dépoli commun à toutes les sections : même teinte de fond
          // semi-transparente + flou de l'illustration de couverture en arrière-plan
          // (même idiome que les infobulles, cf. `theme.ts`). Fond uniforme d'une
          // section à l'autre pour un rendu homogène.
          bgcolor: alpha(theme.palette.background.paper, 0.72),
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          // Retour visuel d'interaction : le bouton du bas s'assombrit quand on survole la zone
          // qui pilote le pliage — le TITRE en mode déplié (il replie), le BLOC ENTIER en mode
          // replié (il rouvre). On cible le calque `::before` du bouton (`.section-toggle`) ;
          // l'entrée est immédiate (transition sans délai), la sortie reste différée (délai de
          // l'état de base du `::before`).
          ...(collapsible
            ? {
                [isCollapsed
                  ? '&:hover .section-toggle::before'
                  : '& .section-header:hover ~ .section-toggle::before']: {
                  opacity: 1,
                  transition: 'opacity 0.15s ease',
                },
              }
            : {}),
        }),
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      <Stack
        className="section-header"
        direction="row"
        spacing={1}
        // Comportement caché mais cohérent : cliquer le titre replie la section quand elle est
        // dépliée. (Repliée, c'est le Paper entier qui la rouvre — cf. son onClick — donc rien ici.)
        onClick={collapsible && !isCollapsed ? toggle : undefined}
        sx={{
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: collapsible && !isCollapsed ? 'pointer' : undefined,
          userSelect: collapsible ? 'none' : undefined,
          // Pas de marge conditionnelle ici : l'espace titre→contenu vit DANS le Collapse
          // (cf. `pt` ci-dessous) pour s'animer avec le contenu au lieu de sauter au clic.
        }}
      >
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', minWidth: 0 }}>
          {icon && <SectionIcon name={icon} size={22} sx={{ color: 'text.secondary' }} />}
          <Typography variant="h6" component="h2" noWrap>
            {title}
          </Typography>
        </Stack>
        {resolvedAction && (
          // Fondu d'entrée : l'action (crayon d'édition…) apparaît en opacity 0→100% à l'ouverture
          // de la section. `appear` rejoue à chaque remontage (l'action est démontée quand repliée).
          // stopPropagation : un clic sur l'action ne doit pas replier/rouvrir la section.
          <Fade in appear>
            <Stack direction="row" onClick={(e) => e.stopPropagation()}>
              {resolvedAction}
            </Stack>
          </Fade>
        )}
      </Stack>
      {collapsible ? (
        // L'espacement titre→contenu (`pt: 2`) est à l'intérieur du Collapse : il se replie
        // avec le contenu (animation fluide), plus de saut de marge instantané.
        <Collapse in={!collapsed}>
          <Box sx={{ pt: 2 }}>{children}</Box>
        </Collapse>
      ) : (
        <Box sx={{ pt: 2 }}>{children}</Box>
      )}
      {collapsible && (
        // Style alternatif à l'essai : bande intégrée en bas de section, pleine largeur,
        // flèche centrée. On casse le padding du Paper (marges négatives) pour aller bord à
        // bord et affleurer le bas ; dégradé du gris vers le transparent en direction du haut
        // pour se fondre dans le bloc.
        <ButtonBase
          className="section-toggle"
          // stopPropagation : quand la section est repliée, le corps du bloc porte déjà un
          // onClick qui rouvre ; sans ça, un clic sur la bande replierait puis rouvrirait.
          onClick={(e) => {
            e.stopPropagation();
            toggle();
          }}
          aria-label={isCollapsed ? 'Déplier' : 'Replier'}
          sx={(theme) => ({
            position: 'relative',
            overflow: 'hidden',
            display: 'flex',
            justifyContent: 'center',
            // Les <button> ne s'étirent pas avec width:auto : on force la largeur pleine bande
            // (100% du contenu + le padding cassé de chaque côté). Padding xs=16px, sm=24px.
            width: { xs: 'calc(100% + 32px)', sm: 'calc(100% + 48px)' },
            // Marge figée (pas de dépendance à l'état replié) : elle ne saute plus au clic ;
            // c'est le Collapse au-dessus qui anime toute la variation de hauteur.
            mt: 2,
            mx: { xs: -2, sm: -3 },
            mb: { xs: -2, sm: -3 },
            py: 1.25,
            color: theme.palette.text.secondary,
            borderBottomLeftRadius: theme.shape.borderRadius,
            borderBottomRightRadius: theme.shape.borderRadius,
            // Base : léger dégradé gris → transparent vers le haut (toujours visible).
            background: `linear-gradient(to top, ${alpha(theme.palette.text.primary, 0.06)}, transparent)`,
            // Sur-couche d'assombrissement au survol, fondue via l'OPACITÉ d'un calque : les
            // dégradés ne s'interpolent pas en CSS, il faut animer l'opacité. Transition « hover
            // out » différée comme les cartes de capacités (cf. FeaturesByPath) : le délai de
            // l'état de base ne joue qu'à la SORTIE du survol ; à l'ENTRÉE, la règle `:hover`
            // (sans délai) prend le relais → l'assombrissement démarre immédiatement.
            '&::before': {
              content: '""',
              position: 'absolute',
              inset: 0,
              background: `linear-gradient(to top, ${alpha(theme.palette.text.primary, 0.08)}, transparent)`,
              opacity: 0,
              transition: 'opacity 0.15s ease 0.2s',
              pointerEvents: 'none',
            },
            '&:hover::before': { opacity: 1, transition: 'opacity 0.15s ease' },
          })}
        >
          <ExpandMoreIcon
            fontSize="small"
            // Repliée : flèche vers le bas (défaut) = « déplier ». Dépliée : retournée à 180° =
            // flèche vers le haut = « replier ». `position/zIndex` : au-dessus du calque `::before`.
            sx={{
              position: 'relative',
              zIndex: 1,
              transform: isCollapsed ? 'none' : 'rotate(180deg)',
              transition: 'transform 0.2s',
            }}
          />
        </ButtonBase>
      )}
    </Paper>
  );
}
