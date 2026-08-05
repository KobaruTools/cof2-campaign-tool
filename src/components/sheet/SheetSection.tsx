'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
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

/** Un onglet du bandeau d'entête d'une section (cf. `SheetSectionProps.tabs`). */
export interface SectionTab {
  /** Valeur stable identifiant l'onglet (comparée à `activeTab`). */
  value: string;
  /** Libellé affiché (au gabarit du titre de section). */
  label: ReactNode;
  /** Icône propre à l'onglet (game-icons, `<SectionIcon>`), au même rôle que l'icône de titre. */
  icon?: SectionIconName;
}

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
  /**
   * PER-116 — signal de DÉPLIAGE FORCÉ depuis l'extérieur (« aller à l'arme » de la carte
   * d'attaque → section Inventaire). Toute valeur DIFFÉRENTE de la précédente déplie la section si
   * elle était repliée (`onExpanded` est alors appelé une fois l'animation terminée) ; si elle
   * était déjà dépliée, `onExpanded` est appelé aussitôt (rien à animer). N'a d'effet que si
   * `collapsible`. Un simple compteur incrémenté par l'appelant convient (une valeur identique
   * répétée ne redéclenche rien).
   */
  expandSignal?: number;
  /** PER-116 — appelé une fois le contenu de la section GARANTI visible après `expandSignal`. */
  onExpanded?: () => void;
  /**
   * Onglets COLLÉS EN HAUT du bloc (bandeau pleine largeur, onglets répartis également, intégrés aux
   * border-radius du cadre). Générique : à toute section qui veut faire alterner son contenu entre
   * plusieurs vues (ex. « Mes capacités » / « Manœuvres »). Le bandeau ne s'affiche que si au moins un
   * onglet est fourni ; c'est l'appelant qui pilote la vue active (`activeTab`) et rend le contenu
   * correspondant dans `children`. Sans `tabs`, la section se comporte comme avant (aucun bandeau).
   */
  tabs?: SectionTab[];
  /** Valeur de l'onglet actif (n'a d'effet qu'avec `tabs`). */
  activeTab?: string;
  /** Notifie le changement d'onglet (n'a d'effet qu'avec `tabs`). */
  onTabChange?: (value: string) => void;
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
  expandSignal,
  onExpanded,
  tabs,
  activeTab,
  onTabChange,
  children,
}: SheetSectionProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const isCollapsed = collapsible && collapsed;
  const resolvedAction = typeof action === 'function' ? action(isCollapsed) : action;
  const hasTabs = tabs != null && tabs.length > 0;

  // PER-116 — dépliage forcé (`expandSignal`) : un ref (et non un state) pour ne réagir QU'AU
  // CHANGEMENT du signal, jamais à une variation de `collapsed` par ailleurs (un simple clic de
  // l'utilisateur ne doit pas rejouer `onExpanded`). `pendingExpand` mémorise qu'ON a demandé ce
  // dépliage précis, pour que le callback de fin d'animation du `Collapse` (déclenché aussi par un
  // dépliage manuel) ne notifie QUE la demande programmatique.
  const prevExpandSignal = useRef(expandSignal);
  const pendingExpand = useRef(false);
  useEffect(() => {
    if (expandSignal === undefined || expandSignal === prevExpandSignal.current) return;
    prevExpandSignal.current = expandSignal;
    if (collapsed) {
      pendingExpand.current = true;
      setCollapsed(false);
      if (persistKey && typeof window !== 'undefined') {
        window.localStorage.setItem(storageKey(persistKey), 'false');
      }
    } else {
      onExpanded?.();
    }
  }, [expandSignal, collapsed, persistKey, onExpanded]);

  // Persistance optionnelle : on relit le choix sauvegardé APRÈS le montage (et non à
  // l'initialisation) pour ne pas désynchroniser le rendu serveur/client. Écrase `defaultCollapsed`.
  useEffect(() => {
    if (!collapsible || !persistKey || typeof window === 'undefined') return;
    const saved = window.localStorage.getItem(storageKey(persistKey));
    // Synchronisation d'un système externe (localStorage) vers l'état React, volontairement APRÈS le
    // montage (cf. commentaire ci-dessus) : le `setState` dans l'effet est ici l'usage recommandé.
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
      {hasTabs ? (
        // ONGLETS EN ENTÊTE (affordance « dossier ») : ils REMPLACENT le titre. Le bandeau est collé
        // au bord haut du bloc (on casse le padding du Paper) et son liseré bas court sur toute la
        // largeur ; chaque onglet porte SON icône + SON libellé (gabarit de titre h6), ancrés à gauche.
        // L'onglet actif chevauche le liseré (`mb: -1px`) et se rattache ainsi au corps (accent primary
        // en tête + fond léger) ; l'inactif reste en retrait. L'action (toggles/crayon/source) à droite.
        <Box
          sx={(theme) => ({
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            gap: 1,
            mt: { xs: -2, sm: -3 },
            mx: { xs: -2, sm: -3 },
            mb: { xs: 2, sm: 3 },
            px: { xs: 2, sm: 3 },
            borderBottom: `1px solid ${theme.palette.divider}`,
          })}
        >
          <Stack direction="row" spacing={0.5} role="tablist" sx={{ alignItems: 'flex-end', minWidth: 0 }}>
            {tabs.map((tab, i) => {
              const active = tab.value === activeTab;
              return (
                <ButtonBase
                  key={tab.value}
                  role="tab"
                  aria-selected={active}
                  onClick={(e) => {
                    e.stopPropagation();
                    onTabChange?.(tab.value);
                  }}
                  sx={(theme) => ({
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.75,
                    px: 1.5,
                    py: 1,
                    mb: '-1px',
                    // Seul repère de l'onglet actif : un soulignement bleu (primary) en bas, aligné sur
                    // le liseré du bandeau (grâce à `mb: -1px`). Pas de fond ni de bordures latérales.
                    borderBottom: `2px solid ${active ? theme.palette.primary.main : 'transparent'}`,
                    color: active ? theme.palette.text.primary : theme.palette.text.secondary,
                    transition: theme.transitions.create(['color', 'background-color', 'border-color']),
                    // Le seul fond est celui du survol.
                    '&:hover': {
                      color: theme.palette.text.primary,
                      bgcolor: alpha(theme.palette.text.primary, 0.05),
                    },
                  })}
                >
                  {tab.icon && (
                    <SectionIcon name={tab.icon} size={20} sx={{ color: 'inherit', flexShrink: 0 }} />
                  )}
                  <Typography
                    variant="h6"
                    component={i === 0 ? 'h2' : 'span'}
                    noWrap
                    sx={{ fontWeight: active ? 700 : 600, color: 'inherit' }}
                  >
                    {tab.label}
                  </Typography>
                </ButtonBase>
              );
            })}
          </Stack>
          {resolvedAction && (
            // `alignSelf: center` : l'action reste centrée verticalement dans le bandeau, malgré le
            // `alignItems: flex-end` du parent (qui, lui, fait reposer les onglets sur le liseré bas).
            <Stack direction="row" onClick={(e) => e.stopPropagation()} sx={{ alignItems: 'center', alignSelf: 'center' }}>
              {resolvedAction}
            </Stack>
          )}
        </Box>
      ) : (
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
      )}
      {collapsible ? (
        // L'espacement titre→contenu (`pt: 2`) est à l'intérieur du Collapse : il se replie
        // avec le contenu (animation fluide), plus de saut de marge instantané.
        <Collapse
          in={!collapsed}
          onEntered={() => {
            if (!pendingExpand.current) return;
            pendingExpand.current = false;
            onExpanded?.();
          }}
        >
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
