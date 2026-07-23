'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Toolbar from '@mui/material/Toolbar';
import { alpha, darken } from '@mui/material/styles';
import { AccountMenu } from '@/components/AccountMenu';
import { AppBreadcrumbs, type Crumb } from '@/components/AppBreadcrumbs';
import { AppHeaderBrand } from '@/components/AppHeaderBrand';
import { QuestIcon } from '@/components/QuestIcon';

interface AppHeaderProps {
  /**
   * Fil d'Ariane de la page (PER-239) : chaîne parent → page courante, SANS maillon
   * « Accueil » (couvert par le logo). Le dernier maillon est rendu en `<h1>`. Absent
   * ou vide = pas de fil (accueil) : la zone centrale reste vide.
   */
  breadcrumbs?: Crumb[];
  /**
   * Contenu optionnel SPÉCIFIQUE à la page, aligné à droite AVANT le cluster global
   * « Campagnes + compte » (ex. bouton « Modifier / Terminer » de la fiche). Les liens
   * globaux (Bestiaire, Campagnes, menu compte) sont désormais injectés en dur par
   * l'en-tête et n'ont plus à être passés ici.
   */
  action?: ReactNode;
  /**
   * Sous-titre optionnel révélé à droite du fil d'Ariane (ex. « peuple · profil ·
   * niveau » de la fiche). Reste monté en permanence pour pouvoir s'animer dans les
   * deux sens ; sa visibilité est pilotée par `subtitleVisible`.
   */
  subtitle?: ReactNode;
  /**
   * Pilote la révélation du `subtitle` au défilement : slide depuis le bas + fondu
   * (animation inverse au retour). Sans effet visible si `subtitle` est absent.
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
 * Style partagé des boutons de navigation globaux (Bestiaire, Campagnes). Le libellé
 * est masqué sous `sm` (icône seule, pour ne pas manger la place du fil d'Ariane sur
 * écran étroit), affiché dès `sm` (PER-228). Au défilement (`condensed`), le libellé se
 * replie AUSSI sur grand écran et le bouton se resserre — le tout en transition douce
 * (max-width + opacité animées, jamais `display: none` qui ne s'anime pas).
 */
function HeaderNavButton({
  href,
  icon,
  label,
  condensed,
}: {
  href: string;
  icon: ReactNode;
  label: string;
  condensed: boolean;
}) {
  return (
    <Button
      color="inherit"
      startIcon={icon}
      component={Link}
      href={href}
      sx={(theme) => ({
        minWidth: 0,
        px: condensed ? 0.75 : { xs: 1, sm: 2 },
        py: condensed ? 0.25 : 0.5,
        flexShrink: 0,
        // On inclut `background-color` : sinon cette transition sur mesure écraserait la
        // transition par défaut de MUI et le voile blanc de survol apparaîtrait d'un coup.
        transition: theme.transitions.create(['padding', 'background-color'], {
          duration: theme.transitions.duration.short,
        }),
        '& .MuiButton-startIcon': {
          mr: { xs: 0, sm: condensed ? 0 : 0.5 },
          transition: theme.transitions.create('margin', {
            duration: theme.transitions.duration.short,
          }),
        },
      })}
    >
      <Box
        component="span"
        sx={(theme) => ({
          display: 'inline-block',
          overflow: 'hidden',
          whiteSpace: 'nowrap',
          maxWidth: { xs: 0, sm: condensed ? 0 : '12ch' },
          opacity: { xs: 0, sm: condensed ? 0 : 1 },
          transition: theme.transitions.create(['max-width', 'opacity'], {
            duration: theme.transitions.duration.short,
          }),
        })}
      >
        {label}
      </Box>
    </Button>
  );
}

/**
 * Barre de navigation globale de l'application (PER-239). Collée en haut de page
 * (`position: sticky`), en verre dépoli, présente sur toutes les pages avec trois
 * zones constantes :
 *   • gauche : logo de marque → accueil + lien Bestiaire ;
 *   • centre : fil d'Ariane (`breadcrumbs`), page courante en `<h1>`, + sous-titre
 *     optionnel révélé au défilement (ligne d'identité de la fiche) ;
 *   • droite : `action` spécifique à la page, puis lien Campagnes + menu compte.
 * Reste visible au défilement.
 */
export function AppHeader({
  breadcrumbs,
  action,
  accentColor,
  subtitle,
  subtitleVisible = false,
}: AppHeaderProps) {
  // Le sous-header n'apparaît que s'il y a quelque chose à y montrer : rien sur
  // l'accueil (pas de fil, pas d'action), présent partout ailleurs. Le sous-titre de
  // la fiche y est monté en permanence (pour pouvoir s'animer), donc sa seule présence
  // suffit aussi à afficher le bandeau — de même que l'`action` de page (« Modifier »).
  const hasSubHeader = (breadcrumbs?.length ?? 0) > 0 || Boolean(subtitle) || Boolean(action);
  // Padding horizontal aligné sur les gouttières de la `Toolbar` MUI (16 px / 24 px),
  // pour que le fil d'Ariane s'aligne verticalement avec le logo au-dessus.
  const gutterPx = { xs: 2, sm: 3 };

  // Condensation au défilement : dès qu'on scrolle un peu, l'étage 1 se resserre
  // (hauteur + padding réduits, libellés des boutons repliés, icônes rétrécies) pour
  // dégager de la place, surtout sur mobile. Hystérésis (16 px pour condenser, 4 px
  // pour rétablir) afin d'éviter tout clignotement autour du seuil. Écouteur passif.
  const [condensed, setCondensed] = useState(false);
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setCondensed((prev) => (prev ? y > 4 : y > 16));
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

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
      // une légère ombre portée sous toute la longueur, elle aussi teintée. La barre
      // est structurée en DEUX étages empilés (nav globale + sous-header du fil
      // d'Ariane), tous deux collés ensemble en haut de page.
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
      {/* Étage 1 — nav globale PURE : logo de marque (→ accueil) + Bestiaire à gauche ;
          Campagnes + menu compte à droite. Ni fil d'Ariane ni action de page ici : tous
          deux vivent dans le sous-header en dessous. */}
      <Toolbar
        sx={(theme) => ({
          // Hauteur resserrée au défilement (le padding vertical de la barre EST sa
          // min-height ici), en transition douce.
          minHeight: condensed ? { xs: 44, sm: 48 } : { xs: 56, sm: 64 },
          transition: theme.transitions.create('min-height', {
            duration: theme.transitions.duration.short,
          }),
        })}
      >
        <AppHeaderBrand condensed={condensed} />
        <HeaderNavButton
          href="/bestiary"
          icon={<MenuBookIcon />}
          label="Bestiaire"
          condensed={condensed}
        />

        {/* Espace flexible qui pousse le cluster droit tout à droite. */}
        <Box sx={{ flexGrow: 1 }} />

        <Stack direction="row" spacing={0.5} sx={{ flexShrink: 0, alignItems: 'center' }}>
          <HeaderNavButton
            href="/campaigns"
            icon={<QuestIcon />}
            label="Campagnes"
            condensed={condensed}
          />
          <AccountMenu />
        </Stack>
      </Toolbar>

      {/* Étage 2 — sous-header LÉGER : bande fine, fond très peu contrasté (voile clair
          par-dessus le verre), séparée de l'étage 1 par un filet. Contient à GAUCHE le
          fil d'Ariane (page courante en `<h1>`) et, sur la fiche, la ligne d'identité
          révélée au défilement ; à DROITE l'`action` de page (« Modifier / Terminer »),
          qui ne concerne que la fiche. Masqué sur l'accueil. */}
      {hasSubHeader && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            minHeight: { xs: 36, sm: 40 },
            px: gutterPx,
            bgcolor: 'rgba(255, 255, 255, 0.03)',
            borderTop: '1px solid rgba(255, 255, 255, 0.06)',
          }}
        >
          <AppBreadcrumbs crumbs={breadcrumbs ?? []} />
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
              {/* Barre verticale entre le nom (dernier maillon) et la ligne d'identité —
                  le « · » reste réservé aux séparations internes (peuple · profil · niveau). */}
              <Box
                component="span"
                aria-hidden="true"
                sx={{ alignSelf: 'center', width: '1px', height: 16, mr: 1, bgcolor: 'divider' }}
              />
              {subtitle}
            </Box>
          )}

          {/* Espace flexible : pousse l'`action` de page tout à droite du sous-header. */}
          <Box sx={{ flexGrow: 1 }} />
          {action && (
            <Box sx={{ flexShrink: 0, display: 'flex', alignItems: 'center', ml: 1 }}>
              {action}
            </Box>
          )}
        </Box>
      )}
    </AppBar>
  );
}
