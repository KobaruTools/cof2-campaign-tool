'use client';

/**
 * Bloc recherche + compteur + tri mobile, collé en haut du tableau (fond noir
 * translucide + flou, arrondi seulement en haut). Mutualisé entre l'accueil
 * (`/characters`) et la vue campagne (`/campaign/[cid]`) pour éviter la
 * duplication du même bloc visuel (PER-436 follow-up).
 */
import SearchIcon from '@mui/icons-material/Search';
import Box from '@mui/material/Box';
import InputAdornment from '@mui/material/InputAdornment';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { SortControl } from './SortControl';
import type { SortKey, SortState } from './sort';

export interface CharacterListSearchBarProps {
  query: string;
  onQueryChange: (value: string) => void;
  placeholder: string;
  /** Nombre de personnages après filtrage, affiché à droite de la recherche. */
  count: number;
  sort: SortState;
  keys: SortKey[];
  onPickSort: (key: SortKey) => void;
  onToggleDir: () => void;
  /** Masque le champ de recherche (liste jugée trop courte pour valoir la peine). Défaut : true. */
  showSearch?: boolean;
}

export function CharacterListSearchBar({
  query,
  onQueryChange,
  placeholder,
  count,
  sort,
  keys,
  onPickSort,
  onToggleDir,
  showSearch = true,
}: CharacterListSearchBarProps) {
  return (
    <Box
      sx={{
        p: 1.5,
        bgcolor: 'rgba(0, 0, 0, 0.45)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        border: '1px solid rgba(255, 255, 255, 0.10)',
        borderRadius: 2,
        borderBottomLeftRadius: { md: 0 },
        borderBottomRightRadius: { md: 0 },
        borderBottom: { md: 'none' },
        mb: { xs: 2, md: 0 },
      }}
    >
      <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
        {showSearch && (
          <TextField
            fullWidth
            size="small"
            placeholder={placeholder}
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              },
            }}
          />
        )}
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ flexShrink: 0, whiteSpace: 'nowrap', ml: showSearch ? 0 : 'auto' }}
        >
          {count} personnage{count > 1 ? 's' : ''}
        </Typography>
      </Stack>
      <SortControl sort={sort} keys={keys} onPickSort={onPickSort} onToggleDir={onToggleDir} sx={{ mt: 1 }} />
    </Box>
  );
}
