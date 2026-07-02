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
 * Puce de PROVENANCE d'un terme porté par une capacité : voie en couleur + icône + rang
 * (`CapabilityChip` au format « Voie du X · rang N »). Format UNIQUE des tooltips de breakdown
 * (caractéristiques, stats dérivées, Défense/RD) : le nom de la capacité reste en TEXTE sur la
 * ligne, cette puce dessous situe l'origine. Renvoie `null` si l'id est inconnu ; une voie sans
 * identité visuelle (prestige) retombe silencieusement sur le texte brut via `CapabilityChip`.
 */
function OriginChip({ featureId }: { featureId: string }) {
  const origin = featureOrigin(featureId);
  if (!origin) return null;
  return (
    <Box sx={{ mt: 0.25, mb: 0.25, fontSize: '0.8em' }}>
      {/* Texte +2px car la puce est petite ici. */}
      <CapabilityChip
        featureId={featureId}
        label={`${origin.pathName} · rang ${origin.rank}`}
        sx={{ fontSize: 'calc(0.95em + 2px)' }}
      />
    </Box>
  );
}

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
          {/* Provenance du terme parent porté par une capacité (ex. « Colosse » → Voie du
              demi-orc), PER-73 : puce de voie au format unifié « Voie du X · rang N ». */}
          {t.featureId && <OriginChip featureId={t.featureId} />}
          {/* Sous-détail (ex. inventaire des capacités composant « Capacités / divers ») :
              plus petit, en retrait et en gris. MÊME format que les termes parents — nom en
              texte sur la ligne + puce de provenance (`OriginChip`) dessous quand une
              capacité le porte ; sinon texte simple (ex. « Point orphelin »). Le marqueur
              « (conditionnel) » suit le nom pour les effets à interrupteur. */}
          {t.subTerms?.map((s, j) => (
            <Box key={j} sx={{ pl: 1.5 }}>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 2,
                  fontVariantNumeric: 'tabular-nums',
                  color: 'text.secondary',
                  fontSize: '0.8em',
                }}
              >
                <span>
                  {s.label}
                  {s.conditional && <em style={{ marginLeft: 4 }}>(conditionnel)</em>}
                </span>
                <span>{signed(s.value)}</span>
              </Box>
              {s.featureId && <OriginChip featureId={s.featureId} />}
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
