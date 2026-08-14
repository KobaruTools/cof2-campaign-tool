'use client';

import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import HeightIcon from '@mui/icons-material/Height';
import { AppTooltip } from '@/components/AppTooltip';
import { BreakdownContent } from '@/components/BreakdownContent';
import { PageRefText } from '@/components/SourceRef';
import { AttackQualifierBadge } from '@/components/sheet/AttackQualifierBadge';
import { CapabilityChip, GlossaryRichText } from '@/components/sheet/FeatureRichText';
import { buildColossusWeightBreakdown, formatWeightKg } from '@/lib/character/colossusWeight';
import { characterSizeCategory } from '@/lib/character/size';
import type { Identity } from '@/lib/character/types';
import { CREATURE_SIZE_LABELS } from '@/lib/ui/creature';

const SEX_LABELS: Record<string, string> = { male: 'Homme', female: 'Femme' };

/** Une paire libellé / valeur, valeur grisée si vide. */
function Field({ label, value, unit }: { label: string; value?: string; unit?: string }) {
  const filled = value != null && value !== '';
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 500 }} color={filled ? 'text.primary' : 'text.disabled'}>
        {filled ? `${value}${unit ?? ''}` : '—'}
      </Typography>
    </Box>
  );
}

export interface IdentityFieldsProps {
  identity: Identity;
  /** Peuple du personnage — détermine la taille de base (petite pour le halfelin, moyenne sinon). */
  ancestryId: string;
  /** Capacités acquises — dérive le rang atteint dans la Voie du colosse (poids et taille ajustés). */
  featureIds: string[];
}

/** Champs d'identité libres en lecture seule (sexe, âge, taille, poids, description). */
export function IdentityFields({ identity, ancestryId, featureIds }: IdentityFieldsProps) {
  // Voie du colosse (p. 149) : « +10 kg par rang atteint dans la voie, tout en muscle » — pur
  // fluff, affiché uniquement ici (jamais en édition, où le champ reste la saisie du joueur).
  const weightBreakdown = buildColossusWeightBreakdown(identity.weight, featureIds);
  // Catégorie de taille (table p. 260) : affichée que la taille en cm soit renseignée ou non, elle
  // ne dépend que du peuple + Stature de géant (arbitrage propriétaire, cf. `size.ts`).
  const boostedByColossus = featureIds.includes('prestige-colosse-r4');
  const sizeCategory = characterSizeCategory(ancestryId, featureIds);
  const sizeTooltip = (
    <Box sx={{ minWidth: 180 }}>
      <Typography variant="body2" sx={{ mb: boostedByColossus ? 0.75 : 0 }}>
        <PageRefText>
          {boostedByColossus
            ? "Catégorie de taille augmentée d'un cran par Stature de géant : « considéré comme faisant une taille de plus que sa taille réelle » (p. 149)."
            : 'Catégorie de taille du personnage (table p. 260).'}
        </PageRefText>
      </Typography>
      {boostedByColossus && <CapabilityChip featureId="prestige-colosse-r4" label={null} />}
    </Box>
  );
  return (
    <Grid container spacing={2}>
      <Grid size={{ xs: 6, sm: 3 }}>
        <Field label="Genre" value={identity.sex ? SEX_LABELS[identity.sex] : undefined} />
      </Grid>
      <Grid size={{ xs: 6, sm: 3 }}>
        <Field label="Âge" value={identity.age} />
      </Grid>
      <Grid size={{ xs: 6, sm: 3 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, alignItems: 'flex-start' }}>
          <Field label="Taille" value={identity.height} unit=" cm" />
          <AttackQualifierBadge
            color="info"
            icon={<HeightIcon sx={{ fontSize: 18 }} />}
            label={CREATURE_SIZE_LABELS[sizeCategory]}
            tooltip={sizeTooltip}
          />
        </Box>
      </Grid>
      <Grid size={{ xs: 6, sm: 3 }}>
        {weightBreakdown ? (
          <AppTooltip title={<BreakdownContent title="Poids" breakdown={weightBreakdown} />}>
            <Box sx={{ cursor: 'help', width: 'fit-content' }}>
              <Field label="Poids" value={formatWeightKg(weightBreakdown.total ?? 0)} unit=" kg" />
            </Box>
          </AppTooltip>
        ) : (
          <Field label="Poids" value={identity.weight} unit=" kg" />
        )}
      </Grid>
      <Grid size={12}>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
          Description
        </Typography>
        <Typography
          variant="body2"
          component="div"
          color={identity.description ? 'text.primary' : 'text.disabled'}
          sx={{ whiteSpace: 'pre-line' }}
        >
          {identity.description ? <GlossaryRichText>{identity.description}</GlossaryRichText> : '—'}
        </Typography>
      </Grid>
    </Grid>
  );
}
