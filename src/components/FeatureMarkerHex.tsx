'use client';

import EmergencyIcon from '@mui/icons-material/Emergency';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import { darken, type SxProps, type Theme } from '@mui/material/styles';
import type { ReactNode } from 'react';
import type { Feature } from '@/data/schema';
import { ACTION_TYPE_LABELS } from '@/components/FeatureLabel';

/**
 * Hexagone régulier à sommets plats (pointe à gauche/droite) tracé par
 * `clip-path` : ratio hauteur/largeur = √3/2 ≈ 0.866. La forme est figée par les
 * dimensions explicites de la boîte → un hexagone PARFAIT, jamais déformé par son
 * contenu (toujours une seule lettre ou l'icône d'astérisque, centrée en absolu).
 */
const HEX_CLIP = 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)';
const HEX_RATIO = Math.sqrt(3) / 2;

/** Un hexagone coloré au contenu blanc centré (lettre de type d'action ou icône). */
function Hex({
  fill,
  size,
  label,
  children,
}: {
  fill: string;
  size: number;
  label: string;
  children: ReactNode;
}) {
  return (
    <Tooltip title={label} arrow>
      <Box
        role="img"
        aria-label={label}
        sx={{ position: 'relative', width: size, height: size * HEX_RATIO, flexShrink: 0 }}
      >
        <Box
          aria-hidden
          sx={{
            position: 'absolute',
            inset: 0,
            clipPath: HEX_CLIP,
            bgcolor: fill,
            filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.35))',
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'common.white',
            fontWeight: 800,
            fontSize: size * 0.5,
            lineHeight: 1,
            // Le centrage géométrique laisse le glyphe visuellement un peu haut
            // (la boîte de ligne réserve de la place pour les jambages) : léger
            // décalage vers le bas pour recentrer l'œil.
            transform: 'translateY(8%)',
            textShadow: '0 1px 2px rgba(0,0,0,0.7)',
            pointerEvents: 'none',
          }}
        >
          {children}
        </Box>
      </Box>
    </Tooltip>
  );
}

export interface FeatureMarkerHexesProps {
  feature: Feature;
  /**
   * Couleur de remplissage (chaîne CSS) — typiquement la teinte du profil dont
   * la voie est issue. Reprend EXACTEMENT le traitement de la goutte de mana
   * (`SpellManaBadge`) : teinte assombrie, ou bleu mana du thème par défaut.
   */
  color?: string;
  /** Largeur d'un hexagone en pixels. Défaut 20. */
  size?: number;
  sx?: SxProps<Theme>;
}

/**
 * Marqueurs hexagonaux d'une capacité (vue colonne) : un hexagone à l'astérisque
 * pour un sort (icône `Emergency` de MUI, parfaitement centrable, là où le `*`
 * textuel ne l'était pas), puis un hexagone par type d'action (A/L/G/M, p. 227).
 * Remplace les marqueurs textuels du `FeatureLabel`. Ne rend rien si la capacité
 * n'a ni la qualité de sort ni de type d'action.
 */
export function FeatureMarkerHexes({ feature, color, size = 20, sx }: FeatureMarkerHexesProps) {
  if (!feature.isSpell && feature.actionTypes.length === 0) return null;
  const fill = color ? darken(color, 0.25) : 'info.main';
  return (
    <Stack direction="row" spacing={0.25} sx={sx}>
      {feature.isSpell && (
        <Hex fill={fill} size={size} label="Sort">
          <EmergencyIcon sx={{ fontSize: size * 0.6, color: 'inherit' }} />
        </Hex>
      )}
      {feature.actionTypes.map((a) => (
        <Hex key={a} fill={fill} size={size} label={ACTION_TYPE_LABELS[a]}>
          {a}
        </Hex>
      ))}
    </Stack>
  );
}
