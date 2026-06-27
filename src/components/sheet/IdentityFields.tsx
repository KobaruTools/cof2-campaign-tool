'use client';

import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import type { Identity } from '@/lib/character/types';

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
}

/** Champs d'identité libres en lecture seule (sexe, âge, taille, poids, description). */
export function IdentityFields({ identity }: IdentityFieldsProps) {
  return (
    <Grid container spacing={2}>
      <Grid size={{ xs: 6, sm: 3 }}>
        <Field label="Genre" value={identity.sex ? SEX_LABELS[identity.sex] : undefined} />
      </Grid>
      <Grid size={{ xs: 6, sm: 3 }}>
        <Field label="Âge" value={identity.age} />
      </Grid>
      <Grid size={{ xs: 6, sm: 3 }}>
        <Field label="Taille" value={identity.height} unit=" cm" />
      </Grid>
      <Grid size={{ xs: 6, sm: 3 }}>
        <Field label="Poids" value={identity.weight} unit=" kg" />
      </Grid>
      <Grid size={12}>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
          Description
        </Typography>
        <Typography
          variant="body2"
          color={identity.description ? 'text.primary' : 'text.disabled'}
          sx={{ whiteSpace: 'pre-line' }}
        >
          {identity.description || '—'}
        </Typography>
      </Grid>
    </Grid>
  );
}
