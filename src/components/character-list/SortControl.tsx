'use client';

/**
 * Contrôle de tri pour les listes de personnages sur mobile (les cartes n'ont
 * pas d'en-tête de colonne cliquable, contrairement au tableau desktop). Sur
 * l'accueil il vit dans le bloc de recherche ; sur la vue campagne, au-dessus
 * des sections. Le tri desktop passe, lui, par les en-têtes du tableau.
 */
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { AppTooltip } from '@/components/AppTooltip';
import { SORT_LABELS, type SortKey, type SortState } from './sort';

export interface SortControlProps {
  sort: SortState;
  /** Clés de tri proposées (ordre d'affichage). */
  keys: SortKey[];
  onPickSort: (key: SortKey) => void;
  onToggleDir: () => void;
  /** Masqué au-delà de `md` par défaut (le tableau desktop porte son propre tri). */
  sx?: object;
}

export function SortControl({ sort, keys, onPickSort, onToggleDir, sx }: SortControlProps) {
  return (
    <Stack
      direction="row"
      spacing={1}
      sx={{ display: { xs: 'flex', md: 'none' }, alignItems: 'center', ...sx }}
    >
      <Typography variant="body2" color="text.secondary">
        Trier :
      </Typography>
      <Select
        size="small"
        value={sort.key}
        onChange={(e) => onPickSort(e.target.value as SortKey)}
        sx={{ flex: 1 }}
      >
        {keys.map((key) => (
          <MenuItem key={key} value={key}>
            {SORT_LABELS[key]}
          </MenuItem>
        ))}
      </Select>
      <AppTooltip title={sort.dir === 'asc' ? 'Croissant' : 'Décroissant'}>
        <IconButton size="small" onClick={onToggleDir}>
          {sort.dir === 'asc' ? (
            <ArrowUpwardIcon fontSize="small" />
          ) : (
            <ArrowDownwardIcon fontSize="small" />
          )}
        </IconButton>
      </AppTooltip>
    </Stack>
  );
}
