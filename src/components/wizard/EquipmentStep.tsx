'use client';

import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import Autocomplete from '@mui/material/Autocomplete';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { classById, equipment } from '@/data';
import { equipmentLabel } from './helpers';
import type { StepProps } from './types';

export function EquipmentStep({ draft, patch }: StepProps) {
  const characterClass = draft.classId ? classById.get(draft.classId) : undefined;
  const remove = (index: number) => {
    patch({ equipment: draft.equipment.filter((_, i) => i !== index) });
  };
  const add = (itemId: string) => {
    patch({ equipment: [...draft.equipment, { itemId, quantity: 1 }] });
  };

  return (
    <Stack spacing={2}>
      <Typography variant="body2" color="text.secondary">
        Équipement de départ du profil + sac d’aventurier. Ajustez librement.
      </Typography>

      <Stack divider={<Divider />}>
        {draft.equipment.map((line, i) => (
          <Stack key={i} direction="row" sx={{ alignItems: 'center', py: 0.5 }}>
            <Typography sx={{ flexGrow: 1 }}>
              {equipmentLabel(line, characterClass)}
              {line.quantity > 1 ? ` ×${line.quantity}` : ''}
            </Typography>
            <IconButton size="small" color="error" onClick={() => remove(i)}>
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          </Stack>
        ))}
        {draft.equipment.length === 0 && (
          <Typography variant="body2" color="text.secondary">
            Aucun équipement.
          </Typography>
        )}
      </Stack>

      <Autocomplete
        options={equipment}
        getOptionLabel={(o) => o.name}
        renderInput={(params) => <TextField {...params} label="Ajouter un objet du catalogue" />}
        onChange={(_, value) => {
          if (value) add(value.id);
        }}
        value={null}
        blurOnSelect
        clearOnBlur
      />
    </Stack>
  );
}
