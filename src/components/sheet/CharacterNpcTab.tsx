'use client';

/**
 * Corps de l'onglet « PNJ » de la fiche personnage (PER-439) — liste, en LECTURE
 * SEULE, des PNJ que le MJ a marqués « rencontré »/« mort » dans son écran de MJ
 * (`NpcPanel.tsx`, dont ce composant reprend le langage visuel de carte/recherche/
 * tri, en plus simple : pas d'édition, pas de catégories, pas de glisser-déposer —
 * un joueur ne gère jamais les PNJ). PUREMENT présentationnel : reçoit `npcs` déjà
 * chargés par `usePlayerNpcs` (appelé UNE SEULE FOIS par `page.tsx`, qui s'en sert
 * aussi pour décider si l'onglet « PNJ » doit même être proposé — pas de fetch ici,
 * pour ne pas dupliquer l'appel réseau).
 */
import { useMemo, useState } from 'react';
import Diversity3Icon from '@mui/icons-material/Diversity3';
import SearchIcon from '@mui/icons-material/Search';
import SortByAlphaIcon from '@mui/icons-material/SortByAlpha';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import InputAdornment from '@mui/material/InputAdornment';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import { ancestryById } from '@/data';
import { filterPlayerNpcsByQuery, sortPlayerNpcsByDisposition, sortPlayerNpcsByName } from '@/lib/campaign/npc';
import { NPC_DISPOSITION_ACCENT, NPC_DISPOSITION_LABELS, NPC_STATUS_LABELS, type PlayerNpc } from '@/lib/campaign/types';
import { useCroppedImageSrc } from '@/lib/image/useCroppedImageSrc';
import { useNpcPortraitCropRect, useNpcPortraitSrc } from '@/lib/storage/useNpcPortraitSrc';

type SortMode = 'name' | 'disposition';

/** Même langage visuel que `NpcCard` du tiroir MJ, sans poignée de glisser ni actions. */
function PlayerNpcCard({ npc }: { npc: PlayerNpc }) {
  const portraitSrc = useNpcPortraitSrc(npc.id);
  const portraitCropRect = useNpcPortraitCropRect(npc.id);
  const croppedPortraitSrc = useCroppedImageSrc(portraitSrc ?? undefined, portraitCropRect);
  const displayedPortraitSrc = croppedPortraitSrc ?? portraitSrc ?? undefined;

  return (
    <Box
      sx={{
        display: 'flex',
        gap: 1,
        p: 1,
        border: 1,
        borderColor: 'divider',
        borderLeft: `4px solid ${NPC_DISPOSITION_ACCENT[npc.disposition]}`,
        borderRadius: 1,
      }}
    >
      {displayedPortraitSrc && (
        <Box
          component="img"
          src={displayedPortraitSrc}
          alt=""
          aria-hidden
          sx={{
            width: 56,
            alignSelf: 'stretch',
            flexShrink: 0,
            borderRadius: 1,
            objectFit: 'cover',
            objectPosition: 'top',
          }}
        />
      )}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, flexGrow: 1, minWidth: 0 }}>
        <Typography sx={{ fontWeight: 600 }} noWrap>
          {npc.name}
        </Typography>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
          <Box
            component="span"
            sx={{
              fontSize: '0.7rem',
              fontWeight: 600,
              px: 0.75,
              py: 0.125,
              borderRadius: 0.5,
              color: NPC_DISPOSITION_ACCENT[npc.disposition],
              border: `1px solid ${alpha(NPC_DISPOSITION_ACCENT[npc.disposition], 0.5)}`,
            }}
          >
            {NPC_DISPOSITION_LABELS[npc.disposition]}
          </Box>
          <Typography variant="caption" color="text.secondary">
            {NPC_STATUS_LABELS[npc.status]}
          </Typography>
        </Stack>
        {(npc.role || npc.ancestryId || npc.location) && (
          <Typography variant="body2" color="text.secondary">
            {[npc.role, npc.ancestryId ? ancestryById.get(npc.ancestryId)?.name : null, npc.location]
              .filter(Boolean)
              .join(' · ')}
          </Typography>
        )}
        {npc.description && (
          <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
            {npc.description}
          </Typography>
        )}
      </Box>
    </Box>
  );
}

export function CharacterNpcTab({
  npcs,
  loading,
  error,
}: {
  npcs: PlayerNpc[];
  loading: boolean;
  error: string | null;
}) {
  const [search, setSearch] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('name');

  const visibleNpcs = useMemo(() => {
    const filtered = filterPlayerNpcsByQuery(npcs, search);
    return sortMode === 'disposition' ? sortPlayerNpcsByDisposition(filtered) : sortPlayerNpcsByName(filtered);
  }, [npcs, search, sortMode]);

  if (loading) {
    return (
      <Box
        sx={{ display: 'flex', justifyContent: 'center', py: 2 }}
        data-glossary-shot="CharacterNpcTab"
      >
        <CircularProgress size={24} />
      </Box>
    );
  }

  if (error) {
    return (
      <Typography variant="body2" color="error" data-glossary-shot="CharacterNpcTab">
        Chargement des PNJ impossible : {error}
      </Typography>
    );
  }

  return (
    <Stack spacing={1.5} data-glossary-shot="CharacterNpcTab">
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', rowGap: 1 }}>
        <TextField
          size="small"
          placeholder="Rechercher un PNJ (nom, description)…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ flexGrow: 1, minWidth: 200 }}
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
        <ToggleButtonGroup
          value={sortMode}
          exclusive
          size="small"
          onChange={(_, value) => {
            if (value) setSortMode(value);
          }}
        >
          <ToggleButton value="name" aria-label="Nom (alphabétique)">
            <Tooltip title="Nom (alphabétique)">
              <SortByAlphaIcon fontSize="small" />
            </Tooltip>
          </ToggleButton>
          <ToggleButton value="disposition" aria-label="Disposition (allié, neutre, ennemi)">
            <Tooltip title="Disposition (allié, neutre, ennemi)">
              <Diversity3Icon fontSize="small" />
            </Tooltip>
          </ToggleButton>
        </ToggleButtonGroup>
      </Stack>

      {npcs.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          Aucun PNJ rencontré pour l’instant.
        </Typography>
      ) : visibleNpcs.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          Aucun PNJ ne correspond à « {search.trim()} ».
        </Typography>
      ) : (
        <Stack spacing={0.75}>
          {visibleNpcs.map((npc) => (
            <PlayerNpcCard key={npc.id} npc={npc} />
          ))}
        </Stack>
      )}
    </Stack>
  );
}
