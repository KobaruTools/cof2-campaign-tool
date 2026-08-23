'use client';

/**
 * Carte compacte d'une capacité, pour la grille exhaustive du Codex (PER-445, « Capacités ») —
 * reprend le style des cartes de la section « Voies & capacités » de la fiche personnage (vue
 * colonne, `PathBlock` dans `FeaturesByPath.tsx`) : bordure + fond teintés de la couleur d'origine,
 * hexagones de marqueur d'action à cheval sur le bord haut, anneau « métal précieux » statique pour
 * une capacité de voie de PRESTIGE (`prestigeStaticBorderSx`, sans l'animation du titre de voie —
 * trop coûteuse répétée sur une grille de centaines de cartes). SANS personnage : ni interrupteur,
 * ni compteur d'usage, ni choix — juste l'identité de la capacité, cliquable pour son détail complet
 * (`CodexAbilityDialog`).
 */
import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha, lighten } from '@mui/material/styles';
import type { Feature } from '@/data/schema';
import { FeatureMarkerHexes } from '@/components/FeatureMarkerHex';
import { RankBadge } from '@/components/RankBadge';
import { prestigeMetalGradient, prestigeStaticBorderSx } from '@/lib/ui/prestigeStyle';

export function CodexAbilityCard({
  feature,
  pathName,
  pathIcon,
  color,
  prestige,
  onClick,
}: {
  feature: Feature;
  pathName: string;
  pathIcon: ReactNode;
  /** Teinte d'origine (peuple/mage/profil/famille de prestige) — mêmes fonctions que la fiche. */
  color: string;
  prestige: boolean;
  onClick: () => void;
}) {
  return (
    <Box
      onClick={onClick}
      data-glossary-shot="CodexAbilityCard"
      sx={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        gap: 0.5,
        px: 1,
        pt: 2,
        pb: 1,
        minHeight: 84,
        borderRadius: 1.5,
        cursor: 'pointer',
        border: prestige ? 0 : 1,
        borderColor: alpha(color, 0.45),
        bgcolor: prestige ? undefined : alpha(color, 0.07),
        backgroundImage: prestige
          ? `linear-gradient(45deg, ${alpha(lighten(color, 0.55), 0.2)} 0%, ${alpha('#d0d0d0', 0.08)} 85%)`
          : undefined,
        transition: 'background-color .15s ease, transform .15s ease',
        '&:hover': { transform: 'translateY(-1px)', bgcolor: prestige ? undefined : alpha(color, 0.16) },
        // `radius` par défaut ('inherit') : l'anneau reprend le `borderRadius` RÉEL de cette boîte
        // (1.5 → 12px) — un rayon fixe en pixels désynchronise l'anneau de l'arrondi de la carte
        // (retour propriétaire, coins de l'anneau visiblement plus carrés que ceux de la carte).
        ...(prestige ? prestigeStaticBorderSx(1.5, 'inherit', color) : {}),
      }}
    >
      <FeatureMarkerHexes
        feature={feature}
        color={prestige ? undefined : color}
        size={18}
        sx={{ position: 'absolute', top: 0, left: 8, transform: 'translateY(-50%)', zIndex: 1 }}
      />
      <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8125rem', wordBreak: 'break-word' }}>
        {feature.name}
      </Typography>
      {/* Voie d'origine + rang sur la même ligne, en bas de carte (retour propriétaire) : le nom de
          la voie porte la teinte/dégradé de sa couleur d'origine, en gras — même traitement que le
          titre de voie de la fiche (`titleTextGradient`/`titleColor`, `FeaturesByPath.tsx`). */}
      <Stack
        direction="row"
        spacing={0.75}
        sx={{ alignItems: 'center', justifyContent: 'space-between', mt: 'auto', pt: 0.75 }}
      >
        <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', minWidth: 0 }}>
          {pathIcon}
          <Typography
            variant="caption"
            noWrap
            sx={
              prestige
                ? {
                    fontWeight: 700,
                    backgroundImage: prestigeMetalGradient(color, '90deg'),
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    color: 'transparent',
                  }
                : { fontWeight: 700, color }
            }
          >
            {pathName}
          </Typography>
        </Stack>
        <RankBadge rank={feature.rank} color={color} prestige={prestige} />
      </Stack>
    </Box>
  );
}
