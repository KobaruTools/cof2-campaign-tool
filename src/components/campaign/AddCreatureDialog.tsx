'use client';

/**
 * Modale « Ajouter une créature » du combat tracker de l'écran de MJ (PER-247).
 * Sélection d'une créature du bestiaire via un sélecteur groupé par catégorie
 * (`CreatureCatalogAutocomplete`), APERÇU de son bloc de stats complet (identique au
 * bestiaire, `BestiaryStatBlock` via `CreatureBlobView`), puis validation pour
 * l'« invoquer » dans le combat.
 *
 * Lecture via le store `bestiary` (liste légère, cache PER-244) : aucune source codée
 * en dur, le contenu entitlé remontera tout seul le jour de PER-242.
 */
import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useBestiaryStore } from '@/stores/bestiary';
import { AppAlert } from '@/components/AppAlert';
import { CreatureBlobView } from '@/components/bestiary/CreatureBlobView';
import { CreatureCatalogAutocomplete } from './CreatureCatalogAutocomplete';

export interface AddCreatureDialogProps {
  open: boolean;
  onClose: () => void;
  /** Ajoute une instance de la créature `slug` au combat. */
  onAdd: (slug: string) => void;
}

export function AddCreatureDialog({ open, onClose, onAdd }: AddCreatureDialogProps) {
  const list = useBestiaryStore((s) => s.list);
  const status = useBestiaryStore((s) => s.status);
  const loadList = useBestiaryStore((s) => s.loadList);
  const [selected, setSelected] = useState<string | null>(null);

  // Charge la liste à l'ouverture (idempotent côté store).
  useEffect(() => {
    if (open) void loadList();
  }, [open, loadList]);

  // Ferme la modale en repartant d'un aperçu vierge (sélection remise à zéro à la
  // fermeture plutôt que dans un effet à l'ouverture, cf. `set-state-in-effect`).
  const handleClose = () => {
    setSelected(null);
    onClose();
  };

  const handleAdd = () => {
    if (!selected) return;
    onAdd(selected);
    handleClose();
  };

  const loading = !list || status === 'idle' || status === 'loading';

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="md">
      <DialogTitle>Ajouter une créature</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          {status === 'error' ? (
            <AppAlert
              severity="error"
              title="Chargement du bestiaire impossible"
              action={
                <Button color="inherit" size="small" onClick={() => loadList({ force: true })}>
                  Réessayer
                </Button>
              }
            >
              Une erreur est survenue en chargeant les créatures.
            </AppAlert>
          ) : status === 'unconfigured' ? (
            <AppAlert severity="info" title="Bestiaire indisponible">
              Le bestiaire est servi depuis la base de données, qui n&apos;est pas configurée dans
              cet environnement.
            </AppAlert>
          ) : loading ? (
            <Skeleton variant="rounded" height={40} />
          ) : (
            <CreatureCatalogAutocomplete
              options={list}
              value={selected}
              onSelect={setSelected}
            />
          )}

          {/* Aperçu du bloc de stats « à invoquer », ou invite tant qu'aucune sélection. */}
          {selected ? (
            <CreatureBlobView slug={selected} hideNotes />
          ) : (
            <Box
              sx={{
                p: 3,
                textAlign: 'center',
                borderRadius: 1,
                border: '1px dashed',
                borderColor: 'divider',
              }}
            >
              <Typography color="text.secondary">
                Sélectionnez une créature pour afficher son bloc de stats.
              </Typography>
            </Box>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Annuler</Button>
        <Button variant="contained" onClick={handleAdd} disabled={!selected}>
          Ajouter au combat
        </Button>
      </DialogActions>
    </Dialog>
  );
}
