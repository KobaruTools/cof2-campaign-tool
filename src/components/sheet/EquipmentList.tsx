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
import type { CustomItem, EquipmentLine } from '@/lib/character/types';
import { isCustomItem } from '@/lib/character/types';
import { creatableElixirItemNames, elixirFeatureIdByItemName } from '@/lib/character/elixirs';
import { equipmentLabel } from '@/components/wizard/helpers';
import { DamageValue } from '@/components/DamageValue';
import { CapabilityChip } from '@/components/sheet/FeatureRichText';

/**
 * Résolution NOM D'OBJET → capacité mise en avant (puce) pour les doses d'élixir (voie des élixirs).
 * Dérivée des données (statique) → calculée une seule fois au chargement du module.
 */
const ELIXIR_FEATURE_BY_ITEM = elixirFeatureIdByItemName();

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
  /**
   * Consommer un objet (bouton « Utiliser », PER-158) : décrémente la quantité de la ligne `i`, et
   * SUPPRIME la ligne quand elle tombe à 0. C'est un ÉTAT DE JEU (consommer un élixir, une potion…),
   * donc disponible HORS mode édition — indépendant de `onChange`. Absent → pas de bouton « Utiliser ».
   */
  onUse?: (index: number) => void;
}

/** Liste de l'équipement possédé, en lecture ou en édition. */
export function EquipmentList({ equipment, onChange, onUse }: EquipmentListProps) {
  const setLine = (i: number, line: EquipmentLine) =>
    onChange?.(equipment.map((l, j) => (j === i ? line : l)));
  const remove = (i: number) => onChange?.(equipment.filter((_, j) => j !== i));
  const addCatalog = (itemId: string) => onChange?.([...equipment, { itemId, quantity: 1 }]);
  const addCustom = () =>
    onChange?.([...equipment, { custom: true, name: 'Nouvel objet', quantity: 1 }]);
  // Ajout d'un élixir préparé (objet custom) depuis la liste des élixirs préparables : incrémente la
  // dose si elle existe déjà (même nom), sinon crée la ligne — miroir du bouton « Créer l'élixir ».
  const addElixir = (itemName: string) => {
    const idx = equipment.findIndex((l) => isCustomItem(l) && l.name === itemName);
    if (idx >= 0) {
      const line = equipment[idx] as CustomItem;
      onChange?.(equipment.map((l, j) => (j === idx ? { ...line, quantity: line.quantity + 1 } : l)));
    } else {
      onChange?.([...equipment, { custom: true, name: itemName, quantity: 1 }]);
    }
  };

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
          // Dose d'élixir (objet custom nommé par `elixirItemName`) : on met en avant la CAPACITÉ
          // reproduite via une puce (sort choisi pour un mineur/majeur, sinon capacité du forgesort).
          const elixirFeatureId = custom ? ELIXIR_FEATURE_BY_ITEM.get(line.name) : undefined;
          const detail = elixirFeatureId ? null : custom ? line.details : item ? itemDetail(item) : null;
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
                ) : elixirFeatureId ? (
                  // Nom d'élixir : « Élixir — » suivi de la puce de la capacité reproduite (couleurs +
                  // icône du profil source, cf. CapabilityChip). Fond clair pour rester lisible sur le
                  // thème sombre, comme les puces des cartes de capacité.
                  <Typography
                    variant="body2"
                    component="span"
                    sx={{ fontWeight: 500, display: 'inline-flex', alignItems: 'center' }}
                  >
                    Élixir —
                    <CapabilityChip
                      featureId={elixirFeatureId}
                      label={null}
                      sx={{ bgcolor: 'rgba(255, 255, 255, 0.85)' }}
                    />
                  </Typography>
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
                  <Typography
                    variant="body1"
                    color="text.secondary"
                    sx={{ fontWeight: 700, fontSize: '1.1rem', flexShrink: 0 }}
                  >
                    ×{line.quantity}
                  </Typography>
                )
              )}
              {/* « Utiliser » : consomme une unité (état de jeu, dispo hors édition), à DROITE du
                  nombre. Décrémente, puis supprime la ligne à 0 (géré par l'appelant). */}
              {onUse && (
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => onUse(i)}
                  sx={{ flexShrink: 0 }}
                >
                  Utiliser
                </Button>
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

      {/* Ajout direct d'un élixir préparé (forgesort) : toute recette/tout sort reproductible par la
          voie des élixirs (p. 98). Sélection ⇒ dose ajoutée à l'inventaire (empilée si déjà présente),
          en miroir du bouton « Créer l'élixir » des cartes de capacité. */}
      {onChange && (
        <Autocomplete
          sx={{ minWidth: 240 }}
          options={creatableElixirItemNames()}
          renderInput={(params) => (
            <TextField {...params} label="Ajouter un élixir préparé" size="small" />
          )}
          onChange={(_, value) => {
            if (value) addElixir(value);
          }}
          value={null}
          blurOnSelect
          clearOnBlur
        />
      )}
    </Stack>
  );
}
