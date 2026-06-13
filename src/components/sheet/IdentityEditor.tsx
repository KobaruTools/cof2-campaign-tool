'use client';

import Grid from '@mui/material/Grid';
import InputAdornment from '@mui/material/InputAdornment';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import type { Identity, Sex } from '@/lib/character/types';

/** Ne conserve que les chiffres et la virgule décimale (âge, taille, poids). */
function digitsOnly(value: string): string {
  return value.replace(/[^0-9,]/g, '');
}

export interface IdentityEditorProps {
  name: string;
  level: number;
  identity: Identity;
  onName: (name: string) => void;
  onLevel: (level: number) => void;
  onIdentity: (patch: Partial<Identity>) => void;
}

/**
 * Édition en place des champs d'identité (PER-45). Permissif : aucune valeur
 * n'est bornée hormis le niveau (plancher 1, cohérence du moteur).
 */
export function IdentityEditor({
  name,
  level,
  identity,
  onName,
  onLevel,
  onIdentity,
}: IdentityEditorProps) {
  return (
    <Grid container spacing={2}>
      <Grid size={{ xs: 12, sm: 8 }}>
        <TextField label="Nom" value={name} onChange={(e) => onName(e.target.value)} fullWidth />
      </Grid>
      <Grid size={{ xs: 12, sm: 4 }}>
        <TextField
          label="Niveau"
          type="number"
          value={level}
          onChange={(e) => onLevel(Math.max(1, Number(e.target.value) || 1))}
          fullWidth
        />
      </Grid>
      <Grid size={{ xs: 6, sm: 3 }}>
        <TextField
          select
          label="Sexe"
          value={identity.sex ?? ''}
          onChange={(e) => onIdentity({ sex: (e.target.value || undefined) as Sex | undefined })}
          fullWidth
        >
          <MenuItem value="">—</MenuItem>
          <MenuItem value="male">Homme</MenuItem>
          <MenuItem value="female">Femme</MenuItem>
        </TextField>
      </Grid>
      <Grid size={{ xs: 6, sm: 3 }}>
        <TextField
          label="Âge"
          value={identity.age ?? ''}
          onChange={(e) => onIdentity({ age: digitsOnly(e.target.value) })}
          fullWidth
        />
      </Grid>
      <Grid size={{ xs: 6, sm: 3 }}>
        <TextField
          label="Taille"
          value={identity.height ?? ''}
          onChange={(e) => onIdentity({ height: digitsOnly(e.target.value) })}
          fullWidth
          slotProps={{ input: { endAdornment: <InputAdornment position="end">m</InputAdornment> } }}
        />
      </Grid>
      <Grid size={{ xs: 6, sm: 3 }}>
        <TextField
          label="Poids"
          value={identity.weight ?? ''}
          onChange={(e) => onIdentity({ weight: digitsOnly(e.target.value) })}
          fullWidth
          slotProps={{ input: { endAdornment: <InputAdornment position="end">kg</InputAdornment> } }}
        />
      </Grid>
      <Grid size={12}>
        <TextField
          label="Description"
          multiline
          minRows={4}
          value={identity.description ?? ''}
          onChange={(e) => onIdentity({ description: e.target.value })}
          fullWidth
        />
      </Grid>
    </Grid>
  );
}
