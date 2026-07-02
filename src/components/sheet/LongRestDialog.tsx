'use client';

import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { Die } from '@/data/schema';
import { DieIcon } from '@/components/DieIcon';

export interface LongRestDialogProps {
  open: boolean;
  onClose: () => void;
  /** Type du dé de récupération du profil (d6/d8/d10). */
  recoveryDie: Die;
  /** Réserve maximale de DR (0 → pas de soin possible). */
  recoveryDiceMax: number;
  /** Niveau du personnage (pour le ½ niveau ajouté au soin). */
  level: number;
  /** Dégâts létaux courants (le soin n'est proposé que s'il y a de quoi soigner). */
  lethalDamage: number;
  /**
   * Applique le repos long. `heal = true` → dépenser le DR gagné pour un soin à la valeur
   * MAX du dé (p. 222) ; `false` → repos sans soin (garde le +1 DR).
   */
  onConfirm: (heal: boolean) => void;
}

/** Nombre de faces d'un dé (`'d8'` → 8). */
function dieFaces(die: Die): number {
  return Number.parseInt(die.slice(1), 10) || 0;
}

/**
 * Modale de repos long = récupération complète (PER-151, p. 221-222, 229). Rappelle les
 * effets (dégâts temporaires régénérés, mana plein, +1 dé de récupération, capacités
 * quotidiennes réinitialisées) et permet, si le personnage est blessé, de **dépenser le DR
 * gagné** pour un soin égal à la **valeur MAX du dé + ½ niveau** (automatique, sans lancer).
 */
export function LongRestDialog({
  open,
  onClose,
  recoveryDie,
  recoveryDiceMax,
  level,
  lethalDamage,
  onConfirm,
}: LongRestDialogProps) {
  const halfLevel = Math.floor(level / 2);
  const healAmount = dieFaces(recoveryDie) + halfLevel;
  const canHeal = recoveryDiceMax > 0 && lethalDamage > 0;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Repos long</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 0.5 }}>
          <Typography variant="body2" color="text.secondary">
            Récupération complète (8 h, une fois par jour) : les dégâts temporaires sont régénérés,
            le mana est entièrement restauré, le personnage gagne <strong>+1 dé de récupération</strong>,
            et les capacités « une fois par jour » sont réinitialisées.
          </Typography>

          {canHeal && (
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <DieIcon die={recoveryDie} size={22} />
              <Typography variant="body2">
                Tu peux dépenser le dé gagné pour te soigner à la <strong>valeur maximale</strong> :{' '}
                {recoveryDie} max + {halfLevel} = <strong>{healAmount} PV</strong> (−1 DR).
              </Typography>
            </Stack>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Annuler</Button>
        <Button onClick={() => onConfirm(false)}>{canHeal ? 'Repos sans soin' : 'Repos long'}</Button>
        {canHeal && (
          <Button variant="contained" onClick={() => onConfirm(true)}>
            Repos + soin ({healAmount} PV)
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

// Réexport de l'utilitaire de faces (utilisé aussi par la page pour l'appel à longRest).
export { dieFaces };
