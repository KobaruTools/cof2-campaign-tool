'use client';

import { useEffect, useState, type ReactNode } from 'react';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Toolbar from '@mui/material/Toolbar';
import { alpha, darken } from '@mui/material/styles';
import { AccountMenu } from '@/components/AccountMenu';
import { AppBreadcrumbs, type Crumb } from '@/components/AppBreadcrumbs';
import { AppHeaderBrand } from '@/components/AppHeaderBrand';
import { GmScreenIcon } from '@/components/GmScreenIcon';
import { HeaderNavButton } from '@/components/HeaderNavButton';
import { QuestIcon } from '@/components/QuestIcon';
import { RulesBookSplitButton } from '@/components/RulesBookSplitButton';
import { SectionIcon } from '@/components/SectionIcon';

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
   * Libellé AU REPOS du dernier maillon du fil (ex. « Fiche de personnage »), tant que
   * `subtitleVisible` est faux : « {campagne} / Fiche de personnage » en haut de page,
   * puis fondu croisé vers le libellé réel du maillon au défilement. Absent = le dernier
   * maillon est affiché tel quel en permanence (accueil, wizard, listes).
   */
  restingLabel?: ReactNode;
  /**
   * Sous-titre optionnel ajouté à la SUITE du fil d'Ariane (ex. « peuple · profil ·
   * niveau » de la fiche), séparé par une barre verticale — pas par un « / », qui le
   * ferait passer pour un niveau de navigation. Reste monté en permanence pour pouvoir
   * s'animer dans les deux sens ; sa visibilité est pilotée par `subtitleVisible`.
   */
  subtitle?: ReactNode;
  /**
   * Pilote la bascule repos → révélé au défilement : fondu croisé du dernier maillon
   * (`restingLabel` → libellé réel) puis apparition du `subtitle` (slide depuis le bas +
   * fondu). Animation inverse au retour. Sans effet si ni `restingLabel` ni `subtitle`.
   */
  subtitleVisible?: boolean;
  /**
   * Couleur d'accent (couleur de profil principal), utilisée pour teinter l'en-tête
   * de la fiche : dégradé partant de la droite (25 % d'opacité) vers la transparence,
   * bordure basse en variante plus foncée, et légère ombre portée. Absent = en-tête
   * neutre (accueil, wizard).
   */
  accentColor?: string;
  /**
   * Id de campagne dont l'utilisateur courant est le MJ (propriétaire). Présent → un
   * lien « Écran de MJ » apparaît dans le cluster de droite de l'étage 1 (entre
   * « Campagnes » et le menu compte), pointant vers `/campaign/{id}/gm-screen`. À passer
   * par les pages où l'on sait l'utilisateur MJ de la campagne du contexte : vue campagne
   * (owner-only) et fiche d'un personnage rattaché à une campagne qu'il possède. Absent =
   * pas de lien (joueur, ou hors contexte campagne).
   */
  gmScreenCampaignId?: string;
  /**
   * Voyant de session temps réel (PER-269), inséré dans le cluster droit de l'étage 1
   * ENTRE le livre des règles et le menu compte. Réservé aux pages où l'on sait résoudre
   * la campagne + l'identité de présence du spectateur (fiche de personnage) ; il s'auto-
   * efface hors session active. Absent ailleurs (le voyant vit alors dans la barre inline
   * de la page, ex. `/play`).
   */
  sessionIndicator?: ReactNode;
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
  restingLabel,
  subtitle,
  subtitleVisible = false,
  gmScreenCampaignId,
  sessionIndicator,
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
          icon={<SectionIcon name="companions" size={20} />}
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
          {gmScreenCampaignId && (
            <HeaderNavButton
              href={`/campaign/${gmScreenCampaignId}/gm-screen`}
              icon={<GmScreenIcon />}
              label="Écran de MJ"
              condensed={condensed}
            />
          )}
          <RulesBookSplitButton condensed={condensed} />
          {sessionIndicator}
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
    </AppBar>
  );
}
