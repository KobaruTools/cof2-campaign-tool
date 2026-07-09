'use client';

import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import Autocomplete from '@mui/material/Autocomplete';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import { classById, equipment, equipmentById } from '@/data';
import { setWornAt } from '@/lib/character/equipment';
import { isCustomItem } from '@/lib/character/types';
import type { WornState } from '@/lib/character/types';
import { EquipConflictsAlert, WornControls } from '@/components/sheet/WornEquipmentControls';
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
  const setWorn = (index: number, worn: WornState | undefined) => {
    patch({ equipment: setWornAt(draft.equipment, index, worn) });
  };

  return (
    <Stack spacing={2}>
      <Typography variant="body2" color="text.secondary">
        Équipement de départ du profil + sac d’aventurier. Ajustez librement, puis
        indiquez ce que le personnage porte (armure, bouclier, arme en main).
      </Typography>

      {/* Conflits de port DURS (bouclier + arme à 2 mains, >1 armure/bouclier) — non bloquant (PER-77). */}
      <EquipConflictsAlert equipment={draft.equipment} />

      <Stack divider={<Divider />}>
        {draft.equipment.map((line, i) => {
          const item = isCustomItem(line) ? null : equipmentById.get(line.itemId);
          const equippable =
            !!item && (item.category === 'armor' || item.category === 'shield' || item.category === 'weapon');
          return (
            <Stack
              key={i}
              direction="row"
              sx={{
                alignItems: 'center',
                py: 0.5,
                ...(line.worn && {
                  px: 1,
                  borderRadius: 1,
                  bgcolor: (theme) => alpha(theme.palette.success.main, 0.06),
                }),
              }}
            >
              <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                <Typography>
                  {equipmentLabel(line, characterClass)}
                  {line.quantity > 1 ? ` ×${line.quantity}` : ''}
                </Typography>
                {equippable && (
                  <Box sx={{ mt: 0.5 }}>
                    <WornControls line={line} onWear={(w) => setWorn(i, w)} />
                  </Box>
                )}
              </Box>
              <IconButton size="small" color="error" onClick={() => remove(i)}>
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            </Stack>
          );
        })}
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
