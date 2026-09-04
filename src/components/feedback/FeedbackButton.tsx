'use client';

/**
 * Icône d'en-tête ouvrant le dialogue de retour utilisateur (PER-465). Montée
 * dans `AppHeaderShell`, réservée aux sessions connectées (owner/player) — voir
 * la garde côté appelant.
 */
import { useState } from 'react';
import FeedbackOutlinedIcon from '@mui/icons-material/FeedbackOutlined';
import IconButton from '@mui/material/IconButton';
import { AppTooltip } from '@/components/AppTooltip';
import { FeedbackDialog } from '@/components/feedback/FeedbackDialog';

export function FeedbackButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <AppTooltip title="Signaler un bug ou proposer une idée">
        <IconButton color="inherit" onClick={() => setOpen(true)} aria-label="Donner un retour">
          <FeedbackOutlinedIcon sx={{ fontSize: 20 }} />
        </IconButton>
      </AppTooltip>
      <FeedbackDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}
