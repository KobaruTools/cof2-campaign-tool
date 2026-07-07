'use client';

/**
 * Modale de rattachement d'un personnage EXISTANT mais « Non attribué »
 * (`campaignId === null`) à la campagne courante.
 *
 * À la différence de l'import JSON (qui fait naître un personnage depuis un
 * fichier), on adopte ici un personnage déjà présent dans l'app : on liste les
 * persos sans campagne et on les affecte à `campaignId` via `upsert` (qui, pour
 * un perso cloud, déclenche le flush débouché sous verrou optimiste). Le joueur
 * est laissé à `null` (attribution différée, PER-184).
 *
 * Rattachement possible à la volée sur plusieurs persos : une ligne rattachée
 * quitte la liste (le filtre `campaignId === null` la recalcule), la modale
 * reste ouverte tant que l'utilisateur n'a pas fini.
 */
import { useMemo } from 'react';
import AddIcon from '@mui/icons-material/Add';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { ClassIcon } from '@/components/ClassIcon';
import type { Character } from '@/lib/character/types';
import { summarize } from '@/lib/character/summary';
import { classColor } from '@/lib/ui/classColors';
import { useCharactersStore } from '@/stores/characters';

export interface AttachCharacterDialogProps {
  open: boolean;
  /** Campagne cible : les personnages choisis y sont rattachés (FK `campaignId`). */
  campaignId: string;
  onClose: () => void;
  /** Notifié après chaque rattachement réussi (pour le toast de la page). */
  onAttached?: (character: Character) => void;
}

export function AttachCharacterDialog({
  open,
  campaignId,
  onClose,
  onAttached,
}: AttachCharacterDialogProps) {
  const characters = useCharactersStore((s) => s.characters);
  const upsert = useCharactersStore((s) => s.upsert);

  // Personnages « Non attribué » (sans campagne), triés par nom pour la sélection.
  const unassigned = useMemo(
    () =>
      characters
        .filter((c) => c.campaignId === null)
        .sort((a, b) => (a.name || 'Sans nom').localeCompare(b.name || 'Sans nom', 'fr')),
    [characters],
  );

  const handleAttach = (character: Character) => {
    // Rattachement : on n'attribue PAS de joueur (différé, PER-184). `upsert`
    // horodate et flushe vers le cloud si le perso est cloud.
    upsert({ ...character, campaignId, playerId: null });
    onAttached?.(character);
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Rattacher un personnage</DialogTitle>
      <DialogContent>
        {unassigned.length === 0 ? (
          <Typography color="text.secondary" sx={{ py: 2 }}>
            Aucun personnage non attribué à rattacher. Les personnages déjà dans une campagne
            n&apos;apparaissent pas ici.
          </Typography>
        ) : (
          <Stack spacing={1} sx={{ py: 0.5 }}>
            {unassigned.map((c) => {
              const summary = summarize(c);
              return (
                <Box
                  key={c.id}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    p: 1,
                    borderRadius: 1,
                    border: '1px solid rgba(255, 255, 255, 0.10)',
                    bgcolor: 'rgba(255, 255, 255, 0.03)',
                  }}
                >
                  <ClassIcon
                    classId={summary.classId}
                    firearmsAllowed={summary.firearmsAllowed}
                    size={22}
                  />
                  <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                    <Typography sx={{ fontWeight: 600, lineHeight: 1.2 }} noWrap>
                      {summary.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" noWrap>
                      <Box component="span" sx={{ color: classColor(summary.classId), fontWeight: 600 }}>
                        {summary.characterClass}
                      </Box>{' '}
                      · niveau {summary.level} · {summary.ancestry}
                    </Typography>
                  </Box>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<AddIcon />}
                    onClick={() => handleAttach(c)}
                    sx={{ flexShrink: 0 }}
                  >
                    Rattacher
                  </Button>
                </Box>
              );
            })}
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Fermer</Button>
      </DialogActions>
    </Dialog>
  );
}
