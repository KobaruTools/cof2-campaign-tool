'use client';

import EmergencyIcon from '@mui/icons-material/Emergency';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import { darken, type SxProps, type Theme } from '@mui/material/styles';
import type { ReactNode } from 'react';
import type { ActionType, Feature } from '@/data/schema';
import { canConcentrate } from '@/lib/engine';
import { pathById } from '@/data';
import { prestigeCategoryColor } from '@/lib/ui/classColors';
import { prestigeMetalGradient } from '@/lib/ui/prestigeStyle';
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
/** Facteur d'agrandissement mobile (`xs`) de TOUS les hexagones de marqueur d'action de l'app —
 * retour propriétaire (plus lisible au doigt). Source UNIQUE (`Hex`), pas de réglage par appelant. */
const MOBILE_HEX_SCALE = 1.3;

/** Un hexagone coloré au contenu blanc centré (lettre de type d'action ou icône). */
function Hex({
  fill,
  gradient,
  size,
  label,
  page,
  glow = false,
  glyphOffsetY = '4%',
  children,
}: {
  fill: string;
  /**
   * Dégradé « métal précieux » de la voie de prestige porteuse (PER-… retour propriétaire
   * 2026-08-17), remplace `fill` (couleur PLEINE) quand posé — mêmes arrêts que le liseré/titre de
   * la voie (`prestigeMetalGradient`), pas de teinte séparée à inventer. `undefined` = capacité de
   * profil/peuple, remplissage plein comme avant.
   */
  gradient?: string;
  size: number;
  label: string;
  /** Page source citée en chip « livre » sous le label du tooltip (cf. `SourceRef`). */
  page?: number | string;
  /** Halo bleu mana autour de l'hexagone : signale une transformation de concentration. */
  glow?: boolean;
  /**
   * Décalage vertical du glyphe centré (valeur CSS `translateY`). Défaut `4%` (léger recentrage vers
   * le bas pour l'œil). Les hexagones inline dans la prose (`ActionMarkerHex`) le remontent (le glyphe
   * y paraît trop bas à cette taille).
   */
  glyphOffsetY?: string;
  children: ReactNode;
}) {
  return (
    <AppTooltip title={label} page={page}>
      <Box
        role="img"
        aria-label={label}
        sx={{
          position: 'relative',
          width: { xs: size * MOBILE_HEX_SCALE, sm: size },
          height: { xs: size * MOBILE_HEX_SCALE * HEX_RATIO, sm: size * HEX_RATIO },
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
            ...(gradient ? { background: gradient } : { bgcolor: fill }),
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
            fontSize: { xs: size * MOBILE_HEX_SCALE * 0.5, sm: size * 0.5 },
            lineHeight: 1,
            // Le centrage géométrique laisse le glyphe visuellement un peu haut
            // (la boîte de ligne réserve de la place pour les jambages) : léger
            // décalage vertical pour recentrer l'œil (ajustable par `glyphOffsetY`).
            transform: `translateY(${glyphOffsetY})`,
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

/**
 * Hexagone d'action UNIQUE, rendu INLINE dans la prose (PER-74) : un marqueur `(*)`/`(A)`/`(L)`/
 * `(M)`/`(G)` cité dans un texte de règle est converti en hexagone au même style que les marqueurs
 * de capacité (`FeatureMarkerHexes`), pour l'uniformité. Teinte neutre (bleu mana `info.main`), faute
 * de contexte de voie dans la prose. Aligné verticalement au milieu de la ligne de texte.
 */
export function ActionMarkerHex({
  marker,
  size = 21,
}: {
  marker: ActionType | 'spell';
  size?: number;
}) {
  const label = marker === 'spell' ? 'Sort' : ACTION_TYPE_LABELS[marker];
  return (
    <Box
      component="span"
      sx={{ display: 'inline-flex', verticalAlign: 'text-bottom', mx: '1.5px' }}
    >
      {/* Glyphe légèrement remonté (`glyphOffsetY`) : centrage optique à cette taille inline (retour
          proprio). Lettre agrandie (0.6 au lieu du 0.5 par défaut de `Hex`). */}
      <Hex fill="info.main" size={size} label={label} glyphOffsetY="3.5%">
        {marker === 'spell' ? (
          <EmergencyIcon
            sx={{ fontSize: { xs: size * MOBILE_HEX_SCALE * 0.62, sm: size * 0.62 }, color: 'inherit' }}
          />
        ) : (
          <Box component="span" sx={{ fontSize: { xs: size * MOBILE_HEX_SCALE * 0.6, sm: size * 0.6 }, lineHeight: 1 }}>
            {marker}
          </Box>
        )}
      </Hex>
    </Box>
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
   * Capacité fabuleuse (spécialiste r5, p. 129) en mode « promotion » : la capacité choisie, marquée
   * (L), voit son marqueur (L) devenir (A) (« il lui suffit désormais d'une action d'attaque »). Les
   * hexagones (A) issus de cette promotion portent un halo bleu mana et une info-bulle dédiée.
   * `concentration` et `promoteToAttack` ne sont jamais actifs ensemble (modes distincts de r5).
   */
  promoteToAttack?: boolean;
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
  promoteToAttack = false,
  pathRank,
  sx,
}: FeatureMarkerHexesProps) {
  // Types d'action conditionnels au rang atteint dans la voie (PER-72), ex. Parer un coup → (G) au rang 5.
  const fromRank = feature.actionTypesFromRank;
  const extraActionTypes =
    fromRank && pathRank != null && pathRank >= fromRank.rank ? fromRank.actionTypes : [];
  if (!feature.isSpell && feature.actionTypes.length === 0 && extraActionTypes.length === 0) return null;
  const fill = color ? darken(color, 0.25) : 'info.main';
  // Voie de PRESTIGE (retour propriétaire 2026-08-17) : les hexagones de marqueur reprennent le
  // dégradé « métal précieux » de la voie, teinté par famille, comme le titre/le liseré de carte —
  // dérivé directement de `feature.pathId` (source unique), aucun appelant n'a besoin de le savoir.
  const markerPath = pathById.get(feature.pathId);
  const isPrestigePath = markerPath?.type === 'prestige';
  const prestigeTint =
    isPrestigePath && markerPath.category !== 'generic' ? prestigeCategoryColor(markerPath.category) : undefined;
  const gradient = isPrestigePath ? prestigeMetalGradient(prestigeTint, '135deg') : undefined;
  // Concentration active ET sort éligible (lancé en (A) seulement) : son hexagone
  // d'action (A) devient (L), avec halo (p. 228).
  const concentrated = concentration && canConcentrate(feature);
  // Capacité fabuleuse (r5) « promotion » : le (L) devient (A). On remplace les (L) par (A) et on
  // dédoublonne (au cas où la capacité a déjà un (A)) ; le vrai « était (L) » est repéré ci-dessous
  // pour le halo et l'info-bulle.
  const alreadyHadAttack = feature.actionTypes.includes('A');
  const displayActionTypes = promoteToAttack
    ? Array.from(new Set(feature.actionTypes.map((a) => (a === 'L' ? 'A' : a))))
    : feature.actionTypes;
  return (
    <Stack direction="row" spacing={0.25} sx={sx}>
      {feature.isSpell && (
        <Hex fill={fill} gradient={gradient} size={size} label="Sort">
          <EmergencyIcon sx={{ fontSize: { xs: size * MOBILE_HEX_SCALE * 0.6, sm: size * 0.6 }, color: 'inherit' }} />
        </Hex>
      )}
      {displayActionTypes.map((a) => {
        // (A) issu d'une promotion Capacité fabuleuse (n'était pas déjà (A)) : halo + info-bulle.
        const promoted = promoteToAttack && a === 'A' && !alreadyHadAttack;
        if (concentrated && a === 'A') {
          return (
            <Hex
              key={a}
              fill={fill}
              gradient={gradient}
              size={size}
              glow
              label="Concentration : action limitée (L) au lieu de (A)"
              page={228}
            >
              L
            </Hex>
          );
        }
        return (
          <Hex
            key={a}
            fill={fill}
            gradient={gradient}
            size={size}
            glow={promoted}
            label={
              promoted
                ? 'Capacité fabuleuse : action limitée (L) sublimée en attaque (A)'
                : ACTION_TYPE_LABELS[a]
            }
            page={promoted ? 129 : undefined}
          >
            {a}
          </Hex>
        );
      })}
      {extraActionTypes.map((a) => (
        <Hex
          key={`fromRank-${a}`}
          fill={fill}
          gradient={gradient}
          size={size}
          label={`${ACTION_TYPE_LABELS[a]} — à partir du rang ${fromRank!.rank} de la voie`}
        >
          {a}
        </Hex>
      ))}
    </Stack>
  );
}
