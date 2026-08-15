'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import LoginIcon from '@mui/icons-material/Login';
import MenuIcon from '@mui/icons-material/Menu';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Toolbar from '@mui/material/Toolbar';
import { alpha, darken } from '@mui/material/styles';
import { AccountMenu } from '@/components/AccountMenu';
import { AppBreadcrumbs } from '@/components/AppBreadcrumbs';
import { AppHeaderBrand } from '@/components/AppHeaderBrand';
import { AppHeaderNavDrawer } from '@/components/AppHeaderNavDrawer';
import { FriendsWidget } from '@/components/friends/FriendsWidget';
import { GmScreenIcon } from '@/components/GmScreenIcon';
import { HeaderNavButton } from '@/components/HeaderNavButton';
import { QuestIcon } from '@/components/QuestIcon';
import { RulesBookSplitButton } from '@/components/RulesBookSplitButton';
import { SectionIcon } from '@/components/SectionIcon';
import { HEADER_BURGER_BREAKPOINT } from '@/lib/ui/headerBreakpoints';
import { HEADER_EXTRA_ROW_SLOT_ID } from '@/lib/ui/useHeaderExtraRowSlot';
import { useAppSession } from '@/lib/supabase/useAppSession';
import { useHeaderContentStore } from '@/stores/headerContent';

/**
 * Barre de navigation globale de l'application (PER-239), montée UNE SEULE FOIS par
 * `layout.tsx` — jamais démontée en navigant. Collée en haut de page (`position: sticky`),
 * en verre dépoli, avec trois zones constantes :
 *   • gauche : logo de marque → accueil + liens de contenu (Bestiaire, Aide-mémoire) ;
 *   • centre : fil d'Ariane, page courante en `<h1>`, + sous-titre optionnel révélé au
 *     défilement (ligne d'identité de la fiche) ;
 *   • droite : action spécifique à la page, puis le cluster propre au rôle et le
 *     menu compte.
 * Reste visible au défilement.
 *
 * Le contenu propre à la page courante (fil d'Ariane, action, couleur d'accent, etc.) ne
 * peut pas transiter par des props — `layout.tsx` n'en reçoit aucune des pages enfants
 * (limite Next App Router). Il est lu depuis `useHeaderContentStore`, alimenté par chaque
 * page via `useHeaderContent()` (voir `src/stores/headerContent.ts`).
 *
 * **Navigation selon le rôle** de la session. Vitrine, atelier de personnage et contenu
 * de règles étant publics, l'écart entre les rôles s'est réduit à ce qui suppose
 * vraiment un compte :
 *   • visiteur sans session : contenu + « Mes personnages » (ses fiches locales) + un
 *     bouton « Se connecter » ;
 *   • joueur : contenu + « Ma campagne » (sa liste de fiches vit là, pas dans
 *     `/characters`) + menu de session joueur ;
 *   • propriétaire : contenu + « Mes personnages », « Campagnes », [Écran de MJ],
 *     menu compte ;
 *   • projection : rien — le composant se cache lui-même (`return null`) puisqu'il est
 *     désormais toujours monté par le layout.
 * Le périmètre réel est porté par le proxy (`decideRouteAccess`) : ici on ne fait que
 * ne pas proposer de portes fermées.
 */
export function AppHeaderShell() {
  const session = useAppSession();
  const {
    breadcrumbs,
    action,
    accentColor,
    restingLabel,
    subtitle,
    subtitleVisible = false,
    gmScreenCampaignId,
    sessionIndicator,
    sessionRole,
  } = useHeaderContentStore((s) => s.content);
  const effectiveRole = sessionRole ?? session.role;
  // Tant que la session n'est pas résolue, `useAppSession` répond `owner` (cas
  // dominant) : la nav ne clignote pas, et un visiteur anonyme voit les liens gatés
  // disparaître dès la résolution (lecture locale, quasi immédiate).
  const isPlayer = effectiveRole === 'player';
  const isAnonymous = effectiveRole === 'anonymous';
  const isProjection = effectiveRole === 'projection';
  // Contenu de règles (DRS libre) : ouvert à tous, visiteur sans compte compris.
  const showContentLinks = !isProjection;
  // Atelier de personnage : ouvert à tous, visiteur sans compte compris (l'app est
  // locale d'abord). Masqué au joueur invité, dont la liste de fiches vit dans `/play`.
  const showCharacterLink = !isProjection && !isPlayer;
  // Campagnes et écran de MJ : propriétaire seulement.
  const showOwnerLinks = !isAnonymous && !isProjection && !isPlayer;
  // Le sous-header n'apparaît que s'il y a quelque chose à y montrer : rien sur
  // l'accueil (pas de fil, pas d'action), présent partout ailleurs. Le sous-titre de
  // la fiche y est monté en permanence (pour pouvoir s'animer), donc sa seule présence
  // suffit aussi à afficher le bandeau — de même que l'`action` de page (« Modifier »).
  const hasSubHeader = (breadcrumbs?.length ?? 0) > 0 || Boolean(subtitle) || Boolean(action);
  // Padding horizontal aligné sur les gouttières de la `Toolbar` MUI (16 px / 24 px),
  // pour que le fil d'Ariane s'aligne verticalement avec le logo au-dessus.
  const gutterPx = { xs: 2, sm: 3 };

  // Bascule burger : sous `HEADER_BURGER_BREAKPOINT`, plus assez de place pour la
  // rangée de boutons même en icône seule (cf. `HeaderNavButton`) — un bouton burger la
  // remplace, ouvrant `AppHeaderNavDrawer` avec les mêmes liens en lignes pleine
  // largeur. Piloté par la LARGEUR, sans dépendance au scroll : l'en-tête ne change
  // plus jamais d'apparence au défilement.
  const [isBurger, setIsBurger] = useState(false);
  const [burgerOpen, setBurgerOpen] = useState(false);
  useEffect(() => {
    const onResize = () => {
      const next = window.innerWidth < HEADER_BURGER_BREAKPOINT;
      setIsBurger(next);
      // Repasser au-dessus du seuil (redimensionnement, rotation) referme le tiroir : la
      // rangée de boutons reprend sa place, il ne doit pas rester un tiroir ouvert orphelin.
      if (!next) setBurgerOpen(false);
    };
    onResize();
    window.addEventListener('resize', onResize, { passive: true });
    return () => window.removeEventListener('resize', onResize);
  }, []);
  // Rien à montrer dans la nav en projection : pas de bouton burger creux.
  const hasNavContent = showContentLinks || showCharacterLink || showOwnerLinks || isPlayer;

  // Vue projection (spectateur, `/project`) : dépouillée, pas d'en-tête. Auparavant obtenu par
  // OMISSION (la page ne montait jamais `<AppHeader>`) ; comme le composant est désormais
  // TOUJOURS monté par `layout.tsx`, il doit se cacher lui-même. Après tous les hooks
  // ci-dessus : leur nombre/ordre ne doit jamais dépendre du rôle.
  if (isProjection) return null;

  return (
    <AppBar
      // Ancre DOM stable : sert à mesurer sa hauteur RENDUE (variable — 3ᵉ étage optionnel) au clic
      // sur un élément de la barre condensée de la fiche, pour caler le défilement sous elle plutôt
      // que sous son bord haut (cf. `scrollToSection` de la page personnage).
      id="app-header"
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
      {/* Étage 1 — nav globale PURE : logo de marque (→ vitrine) + liens de contenu à
          gauche ; cluster propre au rôle et menu compte à droite. Ni fil d'Ariane ni
          action de page ici : tous deux vivent dans le sous-header en dessous. */}
      <Toolbar sx={{ minHeight: { xs: 44, sm: 48 } }}>
        <AppHeaderBrand />
        {!isBurger && showContentLinks && (
          <>
            <HeaderNavButton
              href="/bestiary"
              icon={<SectionIcon name="companions" size={20} />}
              label="Bestiaire"
            />
            <HeaderNavButton
              href="/reference"
              icon={<SectionIcon name="notes" size={20} />}
              label="Aide-mémoire"
            />
          </>
        )}

        {/* Espace flexible qui pousse le cluster droit tout à droite. */}
        <Box sx={{ flexGrow: 1 }} />

        <Stack direction="row" spacing={0.5} sx={{ flexShrink: 0, alignItems: 'center' }}>
          {/* Sous le seuil burger, la rangée ci-dessous disparaît au profit du bouton
              burger tout en bas : mêmes liens, listés dans `AppHeaderNavDrawer`. */}
          {!isBurger && (
            <>
              {/* Le joueur n'a qu'UNE campagne (celle de son invitation) : on l'y mène
                  directement, au lieu d'une liste qui lui serait fermée. */}
              {isPlayer && (
                <HeaderNavButton
                  href="/play"
                  icon={<QuestIcon />}
                  label="Ma campagne"
                />
              )}
              {showCharacterLink && (
                <HeaderNavButton
                  href="/characters"
                  icon={<SectionIcon name="identity" size={20} />}
                  label="Mes personnages"
                />
              )}
              {showOwnerLinks && (
                <>
                  <HeaderNavButton
                    href="/campaigns"
                    icon={<QuestIcon />}
                    label="Campagnes"
                  />
                  {gmScreenCampaignId && (
                    <HeaderNavButton
                      href={`/campaign/${gmScreenCampaignId}/gm-screen`}
                      icon={<GmScreenIcon />}
                      label="Écran de MJ"
                    />
                  )}
                </>
              )}
              {showContentLinks && <RulesBookSplitButton />}
            </>
          )}
          {sessionIndicator}
          <FriendsWidget enabled={showOwnerLinks} />
          <AccountMenu sessionRole={sessionRole} />
          {/* Visiteur sans session : seul appel à l'action de l'en-tête. Libellé
              TOUJOURS visible (contrairement aux boutons de nav qui se replient) —
              c'est la porte d'entrée du site. */}
          {isAnonymous && (
            <Button
              color="inherit"
              variant="outlined"
              size="medium"
              component={Link}
              href="/login"
              startIcon={<LoginIcon sx={{ fontSize: 20 }} />}
              sx={{ flexShrink: 0, whiteSpace: 'nowrap', borderColor: 'rgba(255, 255, 255, 0.3)' }}
            >
              Se connecter
            </Button>
          )}
          {isBurger && hasNavContent && (
            <IconButton
              color="inherit"
              onClick={() => setBurgerOpen(true)}
              aria-label="Ouvrir le menu"
            >
              <MenuIcon />
            </IconButton>
          )}
        </Stack>
      </Toolbar>

      <AppHeaderNavDrawer
        open={burgerOpen}
        onClose={() => setBurgerOpen(false)}
        showContentLinks={showContentLinks}
        showCharacterLink={showCharacterLink}
        showOwnerLinks={showOwnerLinks}
        isPlayer={isPlayer}
        gmScreenCampaignId={gmScreenCampaignId}
      />

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
            minHeight: { xs: 30, sm: 34 },
            px: gutterPx,
            bgcolor: 'rgba(255, 255, 255, 0.03)',
            // Même teinte que le séparateur logo / nav (bordure droite du bouton Accueil).
            borderTop: '1px solid rgba(255, 255, 255, 0.18)',
          }}
        >
          <AppBreadcrumbs
            crumbs={breadcrumbs ?? []}
            restingLabel={restingLabel}
            trailing={subtitle}
            revealed={restingLabel == null && subtitle == null ? true : subtitleVisible}
          />

          {/* Espace flexible : pousse l'`action` de page tout à droite du sous-header. */}
          <Box sx={{ flexGrow: 1 }} />
          {action && (
            <Box sx={{ flexShrink: 0, display: 'flex', alignItems: 'center', ml: 1 }}>
              {action}
            </Box>
          )}
        </Box>
      )}

      {/* Étage 3 — SANS wrapper propre (ni fond, ni bordure, ni ombre) : le contenu hérite tel
          quel du verre dépoli de l'`AppBar` ci-dessus. Sa révélation progressive et son filet
          séparateur sont portés par le contenu lui-même (cf. `StickySheetStatusBar`).
          TOUJOURS rendue (même vide, donc de hauteur nulle) : ancre stable pour le portail
          `useHeaderExtraRowSlot` de la fiche personnage — sa dérivation dépend de données
          disponibles seulement après ses propres retours anticipés, trop tard pour un Hook
          comme `useHeaderContent` (voir ce hook pour le détail). */}
      <Box id={HEADER_EXTRA_ROW_SLOT_ID} />
    </AppBar>
  );
}
