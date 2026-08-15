'use client';

/**
 * Drawer historique des parties DE CE PERSONNAGE, ouvert depuis le bouton icône de la section
 * « Notes » de la fiche (PER-415). Câblage seulement à ce stade : le contenu réel (liste des
 * parties auxquelles le joueur du personnage a participé + notes de session par entrée) est
 * un ticket séparé (PER-416, `SessionHistoryList` étendu) — ce composant ne pose que la
 * mécanique ouverture/fermeture pour que PER-416 vienne remplir le corps.
 */
import CloseIcon from '@mui/icons-material/Close';
import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

export function CharacterSessionHistoryDrawer({
  open,
  onClose,
  characterName,
}: {
  open: boolean;
  onClose: () => void;
  characterName: string;
}) {
  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      slotProps={{
        paper: {
          sx: {
            width: { xs: '100vw', sm: 'min(480px, 100vw)' },
            maxWidth: '100vw',
          },
        },
      }}
    >
      <Box sx={{ p: { xs: 2, sm: 3 } }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" component="h2" sx={{ flexGrow: 1 }}>
            Historique — {characterName}
          </Typography>
          <IconButton size="small" onClick={onClose} aria-label="Fermer l'historique">
            <CloseIcon />
          </IconButton>
        </Stack>
        <Typography variant="body2" color="text.secondary">
          Bientôt : les parties auxquelles ce personnage a participé, avec la note de session
          associée à chacune.
        </Typography>
      </Box>
    </Drawer>
  );
}
