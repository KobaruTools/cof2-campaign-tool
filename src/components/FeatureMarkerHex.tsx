'use client';

import EmergencyIcon from '@mui/icons-material/Emergency';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import { darken, type SxProps, type Theme } from '@mui/material/styles';
import type { ReactNode } from 'react';
import type { Feature } from '@/data/schema';
import { canConcentrate } from '@/lib/engine';
import { AppTooltip } from '@/components/AppTooltip';
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
  page,
  glow = false,
  children,
}: {
  fill: string;
  size: number;
  label: string;
  /** Page source citée en chip « livre » sous le label du tooltip (cf. `SourceRef`). */
  page?: number | string;
  /** Halo bleu mana autour de l'hexagone : signale une transformation de concentration. */
  glow?: boolean;
  children: ReactNode;
}) {
  return (
    <AppTooltip title={label} page={page}>
      <Box
        role="img"
        aria-label={label}
        sx={{
          position: 'relative',
          width: size,
          height: size * HEX_RATIO,
          flexShrink: 0,
          // Halo bleu mana diffus quand la concentration transforme le marqueur
          // (même effet que la goutte de PM réduite, SpellManaBadge). À PORTER ICI,
          // sur le conteneur SANS `clip-path` : appliqué sur l'hexagone découpé,
          // le `clip-path` rogne le `filter` (appliqué avant lui) et masque le halo.
          ...(glow
            ? { filter: (theme) => `drop-shadow(0 0 4px ${theme.palette.info.main})` }
            : {}),
        }}
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
            transform: 'translateY(4%)',
            textShadow: '0 1px 2px rgba(0,0,0,0.7)',
            pointerEvents: 'none',
          }}
        >
          {children}
        </Box>
      </Box>
    </AppTooltip>
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
  /**
   * Concentration accrue active (état de jeu, p. 228) : pour un sort éligible
   * (lancé en (A)), l'hexagone (A) devient (L) — la concentration transforme le
   * sort en action limitée — avec un halo bleu mana. Sans effet sinon.
   */
  concentration?: boolean;
  /**
   * Rang ATTEINT dans la voie hôte (PER-72) : affiche les types d'action conditionnels
   * (`feature.actionTypesFromRank`, ex. Parer un coup → hexagone (G) au rang 5). Absent →
   * ces marqueurs conditionnels ne sont pas affichés.
   */
  pathRank?: number;
  sx?: SxProps<Theme>;
}

/**
 * Marqueurs hexagonaux d'une capacité (vue colonne) : un hexagone à l'astérisque
 * pour un sort (icône `Emergency` de MUI, parfaitement centrable, là où le `*`
 * textuel ne l'était pas), puis un hexagone par type d'action (A/L/G/M, p. 227).
 * Remplace les marqueurs textuels du `FeatureLabel`. Ne rend rien si la capacité
 * n'a ni la qualité de sort ni de type d'action.
 */
export function FeatureMarkerHexes({
  feature,
  color,
  size = 20,
  concentration = false,
  pathRank,
  sx,
}: FeatureMarkerHexesProps) {
  // Types d'action conditionnels au rang atteint dans la voie (PER-72), ex. Parer un coup → (G) au rang 5.
  const fromRank = feature.actionTypesFromRank;
  const extraActionTypes =
    fromRank && pathRank != null && pathRank >= fromRank.rank ? fromRank.actionTypes : [];
  if (!feature.isSpell && feature.actionTypes.length === 0 && extraActionTypes.length === 0) return null;
  const fill = color ? darken(color, 0.25) : 'info.main';
  // Concentration active ET sort éligible (lancé en (A) seulement) : son hexagone
  // d'action (A) devient (L), avec halo (p. 228).
  const concentrated = concentration && canConcentrate(feature);
  return (
    <Stack direction="row" spacing={0.25} sx={sx}>
      {feature.isSpell && (
        <Hex fill={fill} size={size} label="Sort">
          <EmergencyIcon sx={{ fontSize: size * 0.6, color: 'inherit' }} />
        </Hex>
      )}
      {feature.actionTypes.map((a) =>
        concentrated && a === 'A' ? (
          <Hex
            key={a}
            fill={fill}
            size={size}
            glow
            label="Concentration : action limitée (L) au lieu de (A)"
            page={228}
          >
            L
          </Hex>
        ) : (
          <Hex key={a} fill={fill} size={size} label={ACTION_TYPE_LABELS[a]}>
            {a}
          </Hex>
        ),
      )}
      {extraActionTypes.map((a) => (
        <Hex
          key={`fromRank-${a}`}
          fill={fill}
          size={size}
          label={`${ACTION_TYPE_LABELS[a]} — à partir du rang ${fromRank!.rank} de la voie`}
        >
          {a}
        </Hex>
      ))}
    </Stack>
  );
}
