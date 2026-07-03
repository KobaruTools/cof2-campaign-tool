'use client';

import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import type { StatBreakdown } from '@/lib/ui/derivedStatBreakdown';
import { CapabilityChip } from '@/components/sheet/FeatureRichText';

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
          {/* Terme porté par une capacité (ex. « Colosse » → Voie du demi-orc) : rendu
              DIRECTEMENT en puce de voie (couleur + icône + nom), l'origine « Voie du X, rang N »
              passant en infobulle — plus de ligne texte dédoublée par une puce dessous. Le bonus
              chiffré reste en bout de ligne. Sinon (terme non lié à une capacité), libellé texte. */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 2,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {t.featureId ? <CapabilityChip featureId={t.featureId} label={null} /> : <span>{t.label}</span>}
            <Box component="span" sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>
              {signed(t.value)}
            </Box>
          </Box>
          {/* Sous-détail (ex. inventaire des capacités composant « Capacités / divers ») :
              plus petit, en retrait et en gris. MÊME format unifié — puce de voie (couleur + icône
              + nom) quand une capacité porte le terme, sinon texte simple (ex. « Point orphelin »).
              Le marqueur « (conditionnel) » suit la puce pour les effets à interrupteur. */}
          {t.subTerms?.map((s, j) => (
            <Box key={j} sx={{ pl: 1.5 }}>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 2,
                  fontVariantNumeric: 'tabular-nums',
                  color: 'text.secondary',
                  fontSize: '0.8em',
                }}
              >
                <Box
                  component="span"
                  sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}
                >
                  {s.featureId ? <CapabilityChip featureId={s.featureId} label={null} /> : s.label}
                  {s.conditional && <em style={{ marginLeft: 4 }}>(conditionnel)</em>}
                </Box>
                <span style={{ whiteSpace: 'nowrap' }}>{signed(s.value)}</span>
              </Box>
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
