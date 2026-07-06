'use client';

/**
 * Modale de téléversement d'un personnage LOCAL vers le cloud (PER-193). Déclenchée
 * par ligne depuis l'accueil pour un perso encore en staging (hérité, anonyme ou
 * importé). Un choix par personnage : campagne cible (parmi les campagnes possédées
 * ou « Non attribué ») ; le joueur est différé (`playerId` remis à `null`,
 * attribution ultérieure). Le téléversement **promeut** le perso en cloud sans rien
 * supprimer en local (transition sans perte, cf. `useCharactersStore.uploadToCloud`).
 *
 * L'état du formulaire (campagne choisie, en cours, erreur) vit dans un composant
 * interne `UploadForm` **remonté par `key={character.id}`** : il s'initialise depuis
 * les props via l'initialiseur `useState`, sans effet de synchro (évite la règle
 * lint `react-hooks/set-state-in-effect`).
 */
import { useState } from 'react';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { AppAlert } from '@/components/AppAlert';
import type { Character } from '@/lib/character/types';
import { useCampaignsStore } from '@/stores/campaigns';
import { useCharactersStore } from '@/stores/characters';

/** Valeur du menu « Non attribué » (correspond à `campaignId` null). */
const UNASSIGNED = '';

export interface UploadCharacterDialogProps {
  /** Personnage local à téléverser, ou `null` (modale fermée). */
  character: Character | null;
  onClose: () => void;
  /** Notifié après un téléversement réussi (pour le toast de la page). */
  onUploaded?: (character: Character) => void;
}

export function UploadCharacterDialog({
  character,
  onClose,
  onUploaded,
}: UploadCharacterDialogProps) {
  return (
    <Dialog open={character !== null} onClose={onClose} fullWidth maxWidth="xs">
      {character && (
        <UploadForm
          key={character.id}
          character={character}
          onClose={onClose}
          onUploaded={onUploaded}
        />
      )}
    </Dialog>
  );
}

function UploadForm({
  character,
  onClose,
  onUploaded,
}: {
  character: Character;
  onClose: () => void;
  onUploaded?: (character: Character) => void;
}) {
  const campaigns = useCampaignsStore((s) => s.campaigns);
  const uploadToCloud = useCharactersStore((s) => s.uploadToCloud);

  // Pré-sélection : la campagne actuelle du perso si elle existe encore parmi les
  // campagnes possédées, sinon « Non attribué ». Calculée une fois au montage.
  const [campaignId, setCampaignId] = useState<string>(() => {
    const current = character.campaignId;
    return current != null && campaigns.some((c) => c.id === current) ? current : UNASSIGNED;
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = async () => {
    setBusy(true);
    setError(null);
    try {
      await uploadToCloud(character.id, campaignId === UNASSIGNED ? null : campaignId);
      onUploaded?.(character);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Téléversement impossible.');
      setBusy(false);
    }
  };

  return (
    <>
      <DialogTitle>Téléverser vers le cloud</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 0.5 }}>
          <DialogContentText>
            « {character.name || 'Sans nom'} » sera enregistré dans le cloud et synchronisé sur
            tous vos appareils. Rien n’est supprimé en local tant que le téléversement n’a pas
            réussi.
          </DialogContentText>
          <TextField
            select
            label="Campagne"
            value={campaignId}
            onChange={(e) => setCampaignId(e.target.value)}
            disabled={busy}
            fullWidth
          >
            <MenuItem value={UNASSIGNED}>
              <em>Non attribué</em>
            </MenuItem>
            {campaigns.map((c) => (
              <MenuItem key={c.id} value={c.id}>
                {c.name}
              </MenuItem>
            ))}
          </TextField>
          <Typography variant="caption" color="text.secondary">
            Le joueur pourra être attribué plus tard depuis la campagne.
          </Typography>
          {error && <AppAlert severity="error">{error}</AppAlert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy}>
          Annuler
        </Button>
        <Button
          variant="contained"
          startIcon={<CloudUploadIcon />}
          onClick={handleUpload}
          disabled={busy}
        >
          {busy ? 'Téléversement…' : 'Téléverser'}
        </Button>
      </DialogActions>
    </>
  );
}
