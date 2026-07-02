'use client';

import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import type { StatBreakdown } from '@/lib/ui/derivedStatBreakdown';
import { CapabilityChip } from '@/components/sheet/FeatureRichText';
import { featureOrigin } from '@/lib/ui/featureOrigin';

export interface BreakdownContentProps {
  /** Titre affiché en tête (nom de la stat ou de la caractéristique). */
  title: string;
  /** Détail à présenter : termes additifs, total et note éventuelle. */
  breakdown: StatBreakdown;
}

const signed = (v: number) => (v >= 0 ? `+${v}` : `${v}`);

/**
 * Corps d'infobulle de détail commun aux statistiques dérivées et aux
 * caractéristiques : titre, termes additifs signés, total, puis note libre. Ne
 * porte pas la citation de source (laissée à l'appelant : `InfoHint` l'ajoute,
 * un tooltip sur le chiffre la place sous le contenu).
 */
export function BreakdownContent({ title, breakdown }: BreakdownContentProps) {
  return (
    <Box sx={{ minWidth: 180 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
        {title}
      </Typography>
      {breakdown.terms.map((t, i) => (
        <Box key={i}>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: 2,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            <span>{t.label}</span>
            <span style={{ fontWeight: 600 }}>{signed(t.value)}</span>
          </Box>
          {/* Provenance du terme : puce de voie (couleur + icône + rang) quand le terme est
              porté par une capacité (ex. « Colosse » → Voie du demi-orc), PER-73. Sur fond de
              tooltip sombre → `onDark` (blanc teinté de la couleur de voie + ombre). Texte agrandi. */}
          {t.featureId && (() => {
            const origin = featureOrigin(t.featureId);
            return origin ? (
              <Box sx={{ mt: 0.25, mb: 0.25, fontSize: '0.8em' }}>
                <CapabilityChip
                  featureId={t.featureId}
                  label={`${origin.pathName} · rang ${origin.rank}`}
                  onDark
                  sx={{ fontSize: 'calc(0.95em + 2px)' }}
                />
              </Box>
            ) : null;
          })()}
          {/* Sous-détail (ex. inventaire des capacités composant « Capacités /
              divers ») : plus petit, en retrait et en gris. */}
          {t.subTerms?.map((s, j) => (
            <Box
              key={j}
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 2,
                pl: 1.5,
                fontVariantNumeric: 'tabular-nums',
                color: 'text.secondary',
                fontSize: '0.8em',
              }}
            >
              <span>{s.label}</span>
              <span>{signed(s.value)}</span>
            </Box>
          ))}
        </Box>
      ))}
      {breakdown.total !== null && breakdown.terms.length > 1 && (
        <>
          <Divider sx={{ my: 0.5 }} />
          <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, fontWeight: 700 }}>
            <span>Total</span>
            <span>{breakdown.total}</span>
          </Box>
        </>
      )}
      {breakdown.note && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
          {breakdown.note}
        </Typography>
      )}
    </Box>
  );
}
