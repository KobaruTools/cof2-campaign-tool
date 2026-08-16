'use client';

import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import { alpha } from '@mui/material/styles';
import { AppTooltip } from '@/components/AppTooltip';

/** Un segment REMPLI d'une jauge (portion colorée de largeur proportionnelle au max). */
export interface GaugeSegment {
  /** Clé de rendu React. */
  key: string;
  /** Valeur (unités) de ce segment ; sa largeur = `value / max`. */
  value: number;
  /** Couleur CSS de remplissage. */
  color: string;
  /**
   * Remplissage EN DÉGRADÉ (`linear-gradient(...)`), prime sur `color` (PER-374 : jauge de PV
   * d'une forme active, teinte de la voie de prestige porteuse). Absent = remplissage plat (`color`).
   */
  background?: string;
  /** Libellé d'info-bulle du segment (ex. « PV actuels : 18 »). */
  label?: string;
}

export interface GaugeBarProps {
  /** Maximum de la jauge : la largeur totale de la barre représente `max` unités. */
  max: number;
  /**
   * Segments remplis, dans l'ordre d'affichage (gauche → droite). Leur somme peut
   * être inférieure au max (le reste apparaît en piste vide) ; un dépassement est
   * simplement écrêté par la largeur de la piste.
   */
  segments: GaugeSegment[];
  /** Hauteur de la barre en pixels. Défaut 24. */
  height?: number;
  /**
   * Coins gauches arrondis ? Défaut `true`. Passer `false` quand un cap (bouton) est
   * accolé à gauche : la barre devient alors carrée et sans bordure à gauche pour se
   * souder au cap sans double liseré.
   */
  roundedLeft?: boolean;
  /**
   * Contenu superposé À la barre (aligné à droite, centré verticalement), typiquement
   * le texte `courant / max`. Sans interaction (pointer-events désactivés).
   */
  overlay?: ReactNode;
  /**
   * Barre SOUDÉE : ni bordure ni coins arrondis, la piste occupe toute la boîte. Sert aux
   * bandeaux de jauges plaqués contre le bord d'une carte (écran de MJ), où c'est le
   * conteneur qui porte l'arrondi et l'écrêtage. Prime sur `roundedLeft`.
   */
  flush?: boolean;
}

/**
 * Barre de jauge réutilisable (PER-148) : une piste arrondie sur laquelle
 * s'empilent horizontalement des segments colorés de largeur proportionnelle au
 * `max`. Pensée pour toutes les jauges du bloc « État du personnage » — PV
 * (bicolore létal/temp), mana, ressources de capacité. Purement présentationnelle :
 * elle ne connaît ni la sémantique des segments ni les règles, seulement des
 * largeurs et des couleurs.
 */
export function GaugeBar({ max, segments, height = 24, roundedLeft = true, overlay, flush = false }: GaugeBarProps) {
  const safeMax = Math.max(0, max);
  const pct = (value: number) => (safeMax > 0 ? `${Math.max(0, Math.min(100, (value / safeMax) * 100))}%` : '0%');
  return (
    // Conteneur NON écrêté : porte l'overlay, qui peut déborder verticalement de la
    // barre (effet de style d'un gros chiffre). Seule la piste interne écrête le
    // remplissage à ses coins arrondis.
    <Box sx={{ position: 'relative', width: '100%', height }}>
      <Box
        sx={(theme) => ({
          display: 'flex',
          width: '100%',
          height: '100%',
          overflow: 'hidden',
          bgcolor: alpha(theme.palette.text.primary, 0.1),
          ...(flush
            ? { border: 'none', borderRadius: 0 }
            : {
                border: `1px solid ${alpha(theme.palette.text.primary, 0.15)}`,
                borderTopRightRadius: theme.shape.borderRadius,
                borderBottomRightRadius: theme.shape.borderRadius,
                borderTopLeftRadius: roundedLeft ? theme.shape.borderRadius : 0,
                borderBottomLeftRadius: roundedLeft ? theme.shape.borderRadius : 0,
                borderLeftWidth: roundedLeft ? 1 : 0,
              }),
        })}
      >
        {segments.map((seg) => {
          if (seg.value <= 0) return null;
          // Dégradé ANCRÉ à la largeur de la PISTE ENTIÈRE (pas celle, rétrécie, du segment) —
          // sans ça, un dégradé horizontal se recomprimerait entièrement (clair → sombre) dans la
          // largeur qui reste au fil des PV perdus, au lieu de rester une simple FENÊTRE sur un
          // dégradé fixe. `backgroundSize` étire le dégradé à `max/valeur` fois la largeur du
          // segment (= la largeur de la piste complète), ancré à son bord GAUCHE — valable pour le
          // PREMIER segment de la pile (ex. « PV actuels »), qui démarre au bord gauche de la piste.
          const gradientSizeSx = seg.background
            ? { backgroundSize: `${(safeMax / seg.value) * 100}% 100%`, backgroundPosition: 'left center' }
            : undefined;
          return (
            <AppTooltip key={seg.key} title={seg.label ?? ''} disableInteractive>
              <Box
                sx={{
                  width: pct(seg.value),
                  height: '100%',
                  ...(seg.background ? { background: seg.background } : { bgcolor: seg.color }),
                  ...gradientSizeSx,
                  transition: 'width 0.2s',
                }}
              />
            </AppTooltip>
          );
        })}
      </Box>
      {overlay != null && (
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            // Aligné vers le bas avec un léger retrait : le texte remonte et déborde
            // par le haut, laissant un petit padding sous les chiffres (plus joli).
            alignItems: 'flex-end',
            justifyContent: 'flex-end',
            px: 0.75,
            pb: '3px',
            pointerEvents: 'none',
          }}
        >
          {overlay}
        </Box>
      )}
    </Box>
  );
}

/**
 * Texte `courant / max` superposé à une barre de jauge (PER-149) : la valeur
 * COURANTE est nettement plus grande que le maximum (effet de style, elle peut
 * déborder de la barre), blanche avec ombre portée pour rester lisible sur tout
 * fond, chiffres tabulaires. À passer dans `GaugeBar.overlay`.
 */
export function GaugeValueLabel({ current, max }: { current: number; max: number }) {
  return (
    <Box
      component="span"
      sx={{
        display: 'inline-flex',
        alignItems: 'baseline',
        gap: '0.1em',
        color: '#fff',
        lineHeight: 1,
        fontVariantNumeric: 'tabular-nums',
        textShadow: '0 0 4px rgba(0, 0, 0, 1), 0 1px 3px rgba(0, 0, 0, 0.85)',
      }}
    >
      <Box component="span" sx={{ fontSize: '1.75rem', fontWeight: 800 }}>
        {current}
      </Box>
      <Box component="span" sx={{ fontSize: '1.125rem', fontWeight: 600, opacity: 0.9 }}>
        / {max}
      </Box>
    </Box>
  );
}
