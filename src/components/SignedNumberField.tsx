'use client';

import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import type { TextFieldProps } from '@mui/material/TextField';
import type { SxProps, Theme } from '@mui/material/styles';

export interface SignedNumberFieldProps
  extends Omit<TextFieldProps, 'value' | 'onChange' | 'type'> {
  value: number;
  /** Appelé avec la nouvelle valeur (déjà bornée si `min`/`max` sont fournis). */
  onChange: (value: number) => void;
  /** Bornes optionnelles. Absentes = saisie libre (fiche permissive). */
  min?: number;
  max?: number;
  /** Pas des boutons − / + (défaut 1). */
  step?: number;
  /** Styles du conteneur (rangée boutons + champ), pour le placer dans la mise en page. */
  containerSx?: SxProps<Theme>;
}

/**
 * Champ numérique signé avec boutons − / + de part et d'autre. Les claviers
 * mobiles (`type="number"`) n'exposent pas de signe moins : les boutons rendent
 * les valeurs négatives atteignables sur tout appareil, sans clavier. Le champ
 * central reste saisissable au clavier sur desktop.
 *
 * Sans `min`/`max`, la saisie n'est pas bornée (la fiche est permissive — les
 * avertissements sont gérés ailleurs) ; les boutons décrémentent/incrémentent
 * librement.
 */
export function SignedNumberField({
  value,
  onChange,
  min,
  max,
  step = 1,
  disabled,
  sx,
  containerSx,
  ...textFieldProps
}: SignedNumberFieldProps) {
  const clamp = (n: number): number => {
    let x = n;
    if (min != null) x = Math.max(min, x);
    if (max != null) x = Math.min(max, x);
    return x;
  };

  const commit = (n: number) => onChange(clamp(n));

  return (
    <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', ...containerSx }}>
      <IconButton
        size="small"
        aria-label="Diminuer"
        disabled={disabled || (min != null && value <= min)}
        onClick={() => commit(value - step)}
      >
        <RemoveIcon fontSize="small" />
      </IconButton>
      <TextField
        type="number"
        disabled={disabled}
        value={value}
        onChange={(e) => commit(Number(e.target.value) || 0)}
        sx={{ flexGrow: 1, minWidth: 0, ...sx }}
        {...textFieldProps}
      />
      <IconButton
        size="small"
        aria-label="Augmenter"
        disabled={disabled || (max != null && value >= max)}
        onClick={() => commit(value + step)}
      >
        <AddIcon fontSize="small" />
      </IconButton>
    </Stack>
  );
}
