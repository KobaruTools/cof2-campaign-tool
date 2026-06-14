'use client';

import type { ReactNode } from 'react';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import Autocomplete from '@mui/material/Autocomplete';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { equipment as equipmentCatalog, equipmentById } from '@/data';
import type { EquipmentItem } from '@/data/schema';
import type { EquipmentLine } from '@/lib/character/types';
import { isCustomItem } from '@/lib/character/types';
import { equipmentLabel } from '@/components/wizard/helpers';
import { DamageValue } from '@/components/DamageValue';

/** Détail concis d'un objet du catalogue (DM des armes, DEF des protections). */
function itemDetail(item: EquipmentItem): ReactNode {
  switch (item.category) {
    case 'weapon':
      return (
        <>
          DM <DamageValue damage={item.damage} />
          {item.twoHandedDamage && (
            <>
              /<DamageValue damage={item.twoHandedDamage} />
            </>
          )}
          {item.range && ` · portée ${item.range}`}
        </>
      );
    case 'armor':
    case 'shield':
      return `DEF +${item.def}`;
    case 'gear':
      return item.description ?? null;
  }
}

export interface EquipmentListProps {
  equipment: EquipmentLine[];
  /** Édition en place : si fourni, ajout / suppression / quantité / objet libre. */
  onChange?: (equipment: EquipmentLine[]) => void;
}

/** Liste de l'équipement possédé, en lecture ou en édition. */
export function EquipmentList({ equipment, onChange }: EquipmentListProps) {
  const setLine = (i: number, line: EquipmentLine) =>
    onChange?.(equipment.map((l, j) => (j === i ? line : l)));
  const remove = (i: number) => onChange?.(equipment.filter((_, j) => j !== i));
  const addCatalog = (itemId: string) => onChange?.([...equipment, { itemId, quantity: 1 }]);
  const addCustom = () =>
    onChange?.([...equipment, { custom: true, name: 'Nouvel objet', quantity: 1 }]);

  if (equipment.length === 0 && !onChange) {
    return (
      <Typography variant="body2" color="text.secondary">
        Aucun équipement.
      </Typography>
    );
  }

  return (
    <Stack spacing={onChange ? 1.5 : 0}>
      <Stack divider={<Divider />}>
        {equipment.map((line, i) => {
          const custom = isCustomItem(line);
          const item = custom ? null : equipmentById.get(line.itemId);
          const detail = custom ? line.details : item ? itemDetail(item) : null;
          return (
            <Stack key={i} direction="row" spacing={1} sx={{ alignItems: 'center', py: 0.75 }}>
              <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                {onChange && custom ? (
                  <TextField
                    variant="standard"
                    placeholder="Nom de l’objet"
                    value={line.name}
                    onChange={(e) => setLine(i, { ...line, name: e.target.value })}
                    fullWidth
                  />
                ) : (
                  <>
                    <Typography variant="body2" component="span" sx={{ fontWeight: 500 }}>
                      {equipmentLabel(line)}
                    </Typography>
                    {detail && (
                      <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                        {detail}
                      </Typography>
                    )}
                  </>
                )}
              </Box>
              {onChange ? (
                <TextField
                  type="number"
                  size="small"
                  label="Qté"
                  value={line.quantity}
                  onChange={(e) =>
                    setLine(i, { ...line, quantity: Math.max(1, Number(e.target.value) || 1) })
                  }
                  sx={{ width: 80 }}
                />
              ) : (
                line.quantity > 1 && (
                  <Typography variant="body2" color="text.secondary">
                    ×{line.quantity}
                  </Typography>
                )
              )}
              {onChange && (
                <IconButton size="small" color="error" onClick={() => remove(i)}>
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              )}
            </Stack>
          );
        })}
        {equipment.length === 0 && onChange && (
          <Typography variant="body2" color="text.secondary" sx={{ py: 0.75 }}>
            Aucun équipement.
          </Typography>
        )}
      </Stack>

      {onChange && (
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
          <Autocomplete
            sx={{ flexGrow: 1, minWidth: 240 }}
            options={equipmentCatalog}
            getOptionLabel={(o) => o.name}
            renderInput={(params) => (
              <TextField {...params} label="Ajouter un objet du catalogue" size="small" />
            )}
            onChange={(_, value) => {
              if (value) addCatalog(value.id);
            }}
            value={null}
            blurOnSelect
            clearOnBlur
          />
          <Button startIcon={<AddIcon />} onClick={addCustom} size="small">
            Objet libre
          </Button>
        </Stack>
      )}
    </Stack>
  );
}
