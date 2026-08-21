'use client';

/**
 * ARBITRAGE des annonces d'effet de groupe des joueurs, côté MJ (PER-358) — bouton de la barre
 * d'actions de l'écran de MJ, visible seulement quand une annonce attend.
 *
 * Le barde annonce depuis sa fiche (« je lance Chant des héros ») ; il ne peut pas poser l'état
 * lui-même — la RLS `campaign_combat` fait du MJ l'auteur unique, et l'arbitrage du propriétaire est
 * de ne pas élargir ces droits (PER-313 avait tranché pareil pour la pause). Le MJ **adopte** :
 * la fenêtre de pose habituelle (`GroupBuffDialog`) s'ouvre alors, pré-remplie comme si la puce avait
 * été déposée sur le lanceur — camp, palier et cibles restent son affaire, lui seul sait qui est à
 * portée de voix. Ou il **refuse**, et le seul demandeur en est averti.
 *
 * Le bouton n'existe pas tant qu'aucune annonce n'attend : une barre d'actions déjà chargée n'a pas
 * besoin d'un bouton inerte de plus.
 */
import { useState } from 'react';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha, type SxProps, type Theme } from '@mui/material/styles';
import { SourceRef } from '@/components/SourceRef';
import { buffRequestHeadline, type BuffRequest } from '@/lib/session/buffRequest';
import { statusEntry } from '@/lib/character/statusEffects';
import { statusLabel } from '@/lib/ui/statusPalette';
import { attentionPulseSx } from '@/lib/ui/attentionPulse';
import { useBuffRequestStore } from '@/stores/buffRequest';

/**
 * File vide partagée : un sélecteur zustand doit renvoyer une référence STABLE quand il n'y a rien
 * (l'égalité par défaut est `Object.is` — un `[]` neuf à chaque rendu rendrait en boucle).
 */
const EMPTY_REQUESTS: BuffRequest[] = [];

export interface BuffRequestsControlProps {
  campaignId: string;
  /**
   * Adoption : l'appelant ouvre sa fenêtre de pose sur ce lanceur et ce buff. C'est lui qui tient le
   * tracker (camps, palier, cibles) — ce composant ne fait qu'arbitrer la file.
   */
  onAdopt: (request: BuffRequest) => void;
  /** Style du bouton, pour l'aligner sur la barre d'actions de l'écran de MJ. */
  buttonSx?: SxProps<Theme>;
}

export function BuffRequestsControl({ campaignId, onAdopt, buttonSx }: BuffRequestsControlProps) {
  const [open, setOpen] = useState(false);
  const requests = useBuffRequestStore((s) => s.requestsByCampaign[campaignId] ?? EMPTY_REQUESTS);
  const adoptRequest = useBuffRequestStore((s) => s.adoptRequest);
  const declineRequest = useBuffRequestStore((s) => s.declineRequest);

  // Rien à arbitrer : pas de bouton. La fenêtre se referme d'elle-même quand la dernière annonce
  // est traitée (le composant disparaît avec sa file).
  if (requests.length === 0) return null;

  const adopt = (requestId: string) => {
    const request = adoptRequest(campaignId, requestId);
    setOpen(false);
    if (request) onAdopt(request);
  };

  return (
    <>
      <Button
        data-glossary-shot="BuffRequestsControl"
        variant="outlined"
        size="small"
        startIcon={<AutoAwesomeIcon />}
        onClick={() => setOpen(true)}
        // Teinte d'attente SUPERPOSÉE au style du contexte (bouton « verre » sur fond illustré) :
        // `buttonSx` fixe déjà couleur, fond et bordure et l'emporterait sur une simple prop `color`.
        // Le halo bat tant que l'annonce n'est pas arbitrée : ce bouton SURGIT dans une barre déjà
        // chargée, et un joueur attend au bout.
        sx={[
          ...(Array.isArray(buttonSx) ? buttonSx : [buttonSx]),
          (theme: Theme) => attentionPulseSx(theme, 'success'),
        ]}
      >
        {requests.length === 1 ? '1 effet annoncé' : `${requests.length} effets annoncés`}
      </Button>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Effets annoncés par les joueurs</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 0.5 }}>
            <Stack spacing={1}>
              {requests.map((request) => {
                const entry = statusEntry(request.buffId);
                return (
                  <Box
                    key={request.id}
                    sx={(theme) => ({
                      p: 1,
                      borderRadius: 1,
                      border: 1,
                      borderColor: alpha(theme.palette.success.main, 0.5),
                      // Teinte très diluée : une annonce attire l'œil sans crier.
                      bgcolor: alpha(theme.palette.success.main, 0.08),
                    })}
                  >
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {buffRequestHeadline(request)}
                    </Typography>
                    {/* Verbatim du livre + renvoi de page : le MJ tranche sur la règle, pas sur un nom. */}
                    {entry && (
                      <Typography variant="caption" color="text.secondary" component="p">
                        {entry.effect}{' '}
                        <SourceRef page={entry.sourcePage} term={statusLabel(request.buffId)} />
                      </Typography>
                    )}
                    <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                      <Button size="small" variant="contained" onClick={() => adopt(request.id)}>
                        Adopter
                      </Button>
                      <Button
                        size="small"
                        color="inherit"
                        onClick={() => declineRequest(campaignId, request.id)}
                      >
                        Refuser
                      </Button>
                    </Stack>
                  </Box>
                );
              })}
            </Stack>
            <Typography variant="caption" color="text.secondary">
              Adopter ouvre la fenêtre de pose habituelle, au nom du lanceur : vous choisissez qui est
              à portée et pour combien de tours. Refuser n’avertit que lui.
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Fermer</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
