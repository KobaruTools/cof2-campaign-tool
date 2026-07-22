'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import { alpha, darken } from '@mui/material/styles';
import { AppTooltip } from '@/components/AppTooltip';

interface AppHeaderProps {
  /** Titre affiché (rendu en `<h1>`). */
  title: ReactNode;
  /**
   * Destination du bouton retour (flèche à gauche). Rend le bouton en vraie ancre
   * `<a href>` : Ctrl/⌘+Clic et clic-molette ouvrent la destination dans un
   * nouvel onglet. À privilégier sur `onBack` pour une simple navigation.
   */
  backHref?: string;
  /**
   * Callback impératif du bouton retour, pour les cas sans URL fixe. Ignoré si
   * `backHref` est fourni. Absent (avec `backHref` absent) = pas de bouton retour.
   */
  onBack?: () => void;
  /**
   * Libellé de la destination du bouton retour (ex. « Retour à {campagne} »).
   * Sert d'infobulle au survol et d'`aria-label`, quand le retour n'est pas
   * toujours l'accueil (PER-184). Absent = pas d'infobulle, `aria-label` neutre.
   */
  backLabel?: string;
  /** Contenu optionnel aligné à droite (boutons d'action). */
  action?: ReactNode;
  /**
   * Titre affiché AU REPOS, tant que le sous-titre est masqué (ex. « Fiche de
   * personnage »). Quand `subtitleVisible` passe à `true`, il cède la place à `title`
   * par un fondu croisé (le titre « change » vers le nom), puis le `subtitle` s'anime.
   * Absent = `title` est toujours affiché tel quel (accueil, wizard).
   */
  restingTitle?: ReactNode;
  /**
   * Sous-titre optionnel révélé à droite du titre (ex. « peuple · profil · niveau »
   * de la fiche). Reste monté en permanence pour pouvoir s'animer dans les deux sens ;
   * sa visibilité est pilotée par `subtitleVisible`.
   */
  subtitle?: ReactNode;
  /**
   * Pilote la bascule repos → révélé : fondu croisé du titre (`restingTitle` → `title`)
   * puis, avec un léger décalage, apparition du `subtitle` (slide depuis le bas +
   * fondu). Animation inverse au retour. Sans effet visible si ni `restingTitle` ni
   * `subtitle` ne sont fournis.
   */
  subtitleVisible?: boolean;
  /**
   * Couleur d'accent (couleur de profil principal), utilisée pour teinter l'en-tête
   * de la fiche : dégradé partant de la droite (25 % d'opacité) vers la transparence,
   * bordure basse en variante plus foncée, et légère ombre portée. Absent = en-tête
   * neutre (accueil, wizard).
   */
  accentColor?: string;
}

/**
 * En-tête d'application partagé : barre collée en haut de page (`position: sticky`),
 * avec un bouton retour optionnel, un titre, et des actions optionnelles à droite.
 * Modèle unique — calqué sur l'en-tête de la fiche de personnage — pour l'accueil,
 * le wizard de création et la fiche. Reste visible au défilement.
 */
export function AppHeader({
  title,
  backHref,
  onBack,
  backLabel,
  action,
  accentColor,
  restingTitle,
  subtitle,
  subtitleVisible = false,
}: AppHeaderProps) {
  // Quand un titre de repos existe, le groupe « nom + sous-titre » n'est visible qu'une
  // fois l'en-tête dépassé ; sinon (accueil, wizard) le titre est affiché en permanence.
  const hasRestingTitle = restingTitle != null;
  const revealed = !hasRestingTitle || subtitleVisible;
  return (
    <AppBar
      position="sticky"
      // Verre dépoli, plus sombre que les sections de la fiche : gris quasi-noir à
      // peine transparent + le même flou d'arrière-plan (blur 10px) que les sections
      // (cf. SheetSection), pour laisser transparaître l'illustration au défilement.
      //
      // Avec `accentColor` (couleur de profil sur la fiche) : dégradé teinté partant
      // de la DROITE (25 % d'opacité) vers la transparence à gauche, posé PAR-DESSUS
      // le verre dépoli ; bordure basse en variante plus foncée de la couleur ; et
      // une légère ombre portée sous toute la longueur, elle aussi teintée.
      sx={{
        bgcolor: 'rgba(20, 20, 23, 0.85)',
        backgroundImage: accentColor
          ? `linear-gradient(to left, ${alpha(accentColor, 0.25)}, transparent)`
          : 'none',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        boxShadow: accentColor ? `0 4px 16px ${alpha(accentColor, 0.2)}` : 'none',
        borderBottom: accentColor
          ? `1px solid ${darken(accentColor, 0.4)}`
          : '1px solid rgba(255, 255, 255, 0.08)',
      }}
    >
      <Toolbar>
        {(backHref || onBack) && (
          <AppTooltip title={backLabel ?? ''}>
            {/* `backHref` → ancre (Ctrl/⌘+Clic → nouvel onglet) ; sinon `onBack`
                → bouton impératif. Une ancre ne prenant pas `onClick` de retour,
                on rend deux variantes plutôt qu'un spread de props. */}
            {backHref ? (
              <IconButton
                edge="start"
                color="inherit"
                component={Link}
                href={backHref}
                aria-label={backLabel ?? 'Retour'}
                sx={{ mr: 1 }}
              >
                <ArrowBackIcon />
              </IconButton>
            ) : (
              <IconButton
                edge="start"
                color="inherit"
                onClick={onBack}
                aria-label={backLabel ?? 'Retour'}
                sx={{ mr: 1 }}
              >
                <ArrowBackIcon />
              </IconButton>
            )}
          </AppTooltip>
        )}
        {/* Zone de titre. Le groupe occupe l'espace libre (`flexGrow: 1`) et sert
            d'ancre (`relative`) au titre de repos superposé. Deux couches se croisent
            en fondu selon `revealed` :
              • couche « repos » (`restingTitle`, ex. « Fiche de personnage »), en
                surimpression absolue — hors flux, elle n'influence pas la largeur ;
              • groupe « révélé » (`title` = nom + `subtitle`), dans le flux normal :
                c'est lui qui dimensionne et tronque (PER-228 : `noWrap` + `minWidth: 0`).
            Le sous-titre entre APRÈS le nom (léger `transition-delay`) : slide depuis le
            bas + fondu, sans aucun mouvement horizontal. `mr` réserve un filet d'espace
            avant les actions. */}
        <Box
          sx={{
            position: 'relative',
            flexGrow: 1,
            minWidth: 0,
            display: 'flex',
            alignItems: 'center',
            mr: action ? 1 : 0,
          }}
        >
          {hasRestingTitle && (
            <Box
              aria-hidden={revealed}
              sx={(theme) => ({
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                pointerEvents: revealed ? 'none' : 'auto',
                opacity: revealed ? 0 : 1,
                transform: revealed ? 'translateY(-0.4rem)' : 'translateY(0)',
                transition: theme.transitions.create(['opacity', 'transform'], {
                  duration: theme.transitions.duration.standard,
                  easing: theme.transitions.easing.easeOut,
                }),
              })}
            >
              <Typography variant="h6" noWrap sx={{ minWidth: 0 }}>
                {restingTitle}
              </Typography>
            </Box>
          )}
          <Box
            aria-hidden={hasRestingTitle && !revealed}
            sx={(theme) => ({
              display: 'flex',
              alignItems: 'center',
              minWidth: 0,
              flexGrow: 1,
              opacity: revealed ? 1 : 0,
              transform: revealed ? 'translateY(0)' : 'translateY(0.4rem)',
              transition: theme.transitions.create(['opacity', 'transform'], {
                duration: theme.transitions.duration.standard,
                easing: theme.transitions.easing.easeOut,
              }),
            })}
          >
            <Typography variant="h6" component="h1" noWrap sx={{ minWidth: 0, flexShrink: 1 }}>
              {title}
            </Typography>
            {/* Sous-titre : slide depuis le bas + fondu, décalé après le nom (le
                `transition-delay` ne s'applique qu'à l'entrée ; à la sortie il repart
                aussitôt). Barre verticale entre le nom et la ligne d'identité — le « · »
                reste réservé aux séparations internes (peuple · profil · niveau). */}
            {subtitle && (
              <Box
                aria-hidden={!subtitleVisible}
                sx={(theme) => ({
                  display: 'flex',
                  alignItems: 'center',
                  flexShrink: 0,
                  whiteSpace: 'nowrap',
                  color: 'text.secondary',
                  opacity: subtitleVisible ? 1 : 0,
                  transform: subtitleVisible ? 'translateY(0)' : 'translateY(0.5rem)',
                  ml: 1,
                  transition: theme.transitions.create(['opacity', 'transform'], {
                    duration: theme.transitions.duration.standard,
                    easing: theme.transitions.easing.easeOut,
                  }),
                  transitionDelay: subtitleVisible ? '120ms' : '0ms',
                })}
              >
                <Box
                  component="span"
                  aria-hidden="true"
                  sx={{ alignSelf: 'center', width: '1px', height: 20, mr: 1, bgcolor: 'divider' }}
                />
                {subtitle}
              </Box>
            )}
          </Box>
        </Box>
        {action && <Box sx={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>{action}</Box>}
      </Toolbar>
    </AppBar>
  );
}
