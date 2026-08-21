'use client';

import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import { alpha, darken } from '@mui/material/styles';
import { AppTooltip } from '@/components/AppTooltip';
import { OGRE_ICON_PATH } from '@/lib/ui/violenceIcon';
import { GaugeIconCap } from './GaugeIconCap';

/**
 * Barre de réserve ACCUMULATEUR (PER-325, « points de violence » du demi-ogre, p. 12). Reprend le
 * CADRE d'une `GaugeRow` (cap d'icône coloré + boutons rapides −/+/reset + un seul chiffre, sans
 * chevron « détails »), MAIS garde son remplissage en BLOCS de points (retour propriétaire) : chaque
 * point est un bloc coloré ; avec N points la piste est divisée en N blocs. À 0, piste entièrement
 * grisée (aucun bloc). Un accumulateur n'a pas de plafond : on n'affiche qu'UN chiffre (le total).
 * Toujours visible tant que la capacité est acquise (seul endroit, avec le bouton de la modale, qui
 * ajoute/retire un point). Faute de chevron « détails » à gauche, un cap coloré INERTE (même teinte
 * assombrie, coins gauches arrondis) occupe ces 20 px : la zone colorée a alors la MÊME largeur et le
 * MÊME alignement (icône incluse) que les autres barres — cohérence graphique demandée par le proprio.
 */
export interface ViolencePointsBarProps {
  /** Nombre de points courant (≥ 0). */
  value: number;
  /** Change la valeur (bornée à ≥ 0 par le composant). */
  onChange: (next: number) => void;
  /** Libellé de la réserve, affiché en info-bulle au survol de l'icône (comme les autres barres). */
  label: string;
  /** Teinte des blocs et du cap (orange proche du rouge de la rage berserker). */
  color: string;
}

/** Hauteur de barre = celle des `GaugeRow`. */
const BAR_HEIGHT = 24;
/** Largeur du chevron « détails » des autres barres (`GaugeExpandToggle`), reproduite en cap inerte. */
const CHEVRON_WIDTH = 20;

/** Icône « tête d'ogre » cerclée en blanc (même gabarit que `<DerivedStatIcon>`), pour le cap. */
function OgreIcon({ size = 28 }: { size?: number }) {
  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        width: size,
        height: size,
        borderRadius: '50%',
        border: '2px solid #fff',
        color: '#fff',
      }}
    >
      <Box
        component="svg"
        viewBox="0 0 512 512"
        sx={{ width: '58%', height: '58%', fill: 'currentColor' }}
        dangerouslySetInnerHTML={{ __html: OGRE_ICON_PATH }}
      />
    </Box>
  );
}

export function ViolencePointsBar({ value, onChange, label, color }: ViolencePointsBarProps) {
  const points = Math.max(0, Math.floor(value));
  // À 0 : une seule case (piste vide grisée) ; sinon un bloc par point.
  const segments = Math.max(points, 1);

  // Boutons rapides : mêmes icônes/tailles/espacement que `GaugeRow` (−1 / +1 / remise à zéro).
  const quickControls = (
    <>
      <AppTooltip title="Retirer un point">
        <span>
          <IconButton size="small" aria-label="Retirer un point" disabled={points <= 0} onClick={() => onChange(points - 1)}>
            <RemoveIcon fontSize="small" />
          </IconButton>
        </span>
      </AppTooltip>
      <AppTooltip title="Ajouter un point">
        <span>
          <IconButton size="small" aria-label="Ajouter un point" onClick={() => onChange(points + 1)}>
            <AddIcon fontSize="small" />
          </IconButton>
        </span>
      </AppTooltip>
      <AppTooltip title="Remettre à zéro">
        <span>
          <IconButton size="small" aria-label="Remettre à zéro" disabled={points <= 0} onClick={() => onChange(0)}>
            <RestartAltIcon fontSize="small" />
          </IconButton>
        </span>
      </AppTooltip>
    </>
  );

  return (
    <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }} data-glossary-shot="ViolencePointsBar">
      <Stack direction="row" spacing={0} sx={{ alignItems: 'center', flexGrow: 1, minWidth: 0 }}>
        {/* Cap gauche INERTE à la place du chevron des autres barres : même teinte assombrie + coins
            gauches arrondis, pour que la zone colorée démarre au même x et ait la même largeur. */}
        <Box
          aria-hidden
          sx={(theme) => ({
            flexShrink: 0,
            width: CHEVRON_WIDTH,
            height: BAR_HEIGHT,
            bgcolor: darken(color, 0.35),
            borderTopLeftRadius: theme.shape.borderRadius,
            borderBottomLeftRadius: theme.shape.borderRadius,
          })}
        />
        {/* Cap d'icône carré (les coins gauches sont portés par le cap inerte ci-dessus). */}
        <GaugeIconCap color={color} label={label} height={BAR_HEIGHT}>
          <OgreIcon />
        </GaugeIconCap>
        <Box sx={{ position: 'relative', flexGrow: 1, minWidth: 0, height: BAR_HEIGHT }}>
          {/* Piste soudée au cap (bord gauche carré, sans bordure) + blocs de points. */}
          <Box
            sx={(theme) => ({
              display: 'flex',
              gap: 0.5,
              width: '100%',
              height: '100%',
              p: '2px',
              boxSizing: 'border-box',
              overflow: 'hidden',
              bgcolor: alpha(theme.palette.text.primary, 0.1),
              border: `1px solid ${alpha(theme.palette.text.primary, 0.15)}`,
              borderLeftWidth: 0,
              borderTopRightRadius: theme.shape.borderRadius,
              borderBottomRightRadius: theme.shape.borderRadius,
              // À 0 point : piste désaturée (grisée), aucun bloc coloré.
              filter: points === 0 ? 'grayscale(1)' : 'none',
            })}
          >
            {Array.from({ length: segments }).map((_, i) => (
              <Box
                key={i}
                sx={{
                  flex: 1,
                  borderRadius: 0.5,
                  bgcolor: i < points ? color : 'transparent',
                  boxShadow: i < points ? `0 0 3px ${alpha(color, 0.7)}` : 'none',
                  transition: 'background-color 120ms ease',
                }}
              />
            ))}
          </Box>
          {/* UN seul chiffre (pas de « courant / max »), même gabarit que le nombre d'une GaugeValueLabel. */}
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'flex-end',
              px: 0.75,
              pb: '3px',
              pointerEvents: 'none',
            }}
          >
            <Box
              component="span"
              role="meter"
              aria-valuenow={points}
              aria-label={`${label} : ${points}`}
              sx={{
                fontSize: '1.75rem',
                fontWeight: 800,
                lineHeight: 1,
                color: '#fff',
                fontVariantNumeric: 'tabular-nums',
                textShadow: '0 0 4px rgba(0, 0, 0, 1), 0 1px 3px rgba(0, 0, 0, 0.85)',
              }}
            >
              {points}
            </Box>
          </Box>
        </Box>
      </Stack>
      {quickControls}
    </Stack>
  );
}
