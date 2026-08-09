'use client';

import { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import type { Die } from '@/data/schema';
import type { RestRecoveryHealBonus } from '@/lib/character/effects';
import { DieIcon } from '@/components/DieIcon';
import { SourceRef } from '@/components/SourceRef';

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
   * Nombre de doses d'élixir (forgesort) qui seront PERDUES par ce repos long (voie des élixirs,
   * p. 98 : « Les élixirs qui ne sont pas utilisés le jour même sont perdus »). 0 → pas d'avertissement.
   */
  elixirDosesToLose?: number;
  /**
   * Bonus de soin par DR ACTIFS (Survie « en milieu naturel », native ou empruntée) : un dé
   * supplémentaire par bonus, lancé à la table et saisi ici, ajouté au soin quand on dépense le DR gagné.
   */
  healBonuses?: RestRecoveryHealBonus[];
  /**
   * Applique le repos long. `heal = true` → dépenser le DR gagné pour un soin à la valeur
   * MAX du dé (p. 222) ; `false` → repos sans soin (garde le +1 DR). `extraHeal` = total des
   * dés de bonus saisis (Survie…), ajouté au soin ; 0 si aucun ou repos sans soin.
   */
  onConfirm: (heal: boolean, extraHeal: number) => void;
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
  elixirDosesToLose = 0,
  healBonuses = [],
  onConfirm,
}: LongRestDialogProps) {
  const [bonusRolls, setBonusRolls] = useState<Record<string, string>>({});
  const halfLevel = Math.floor(level / 2);
  const healAmount = dieFaces(recoveryDie) + halfLevel;
  const canHeal = recoveryDiceMax > 0 && lethalDamage > 0;
  // Somme des dés de bonus VALIDES (Survie…), facultatifs — une saisie vide/hors plage compte 0.
  const bonusHeal = healBonuses.reduce((sum, b) => {
    const bf = dieFaces(b.die);
    const v = Math.max(0, Math.round(Number.parseInt(bonusRolls[b.featureId] ?? '', 10) || 0));
    return sum + (v >= 1 && v <= bf ? v : 0);
  }, 0);
  const close = () => {
    setBonusRolls({});
    onClose();
  };
  const confirm = (heal: boolean) => {
    // Le bonus ne s'ajoute que si on dépense réellement le DR pour un soin.
    const extra = heal ? bonusHeal : 0;
    setBonusRolls({});
    onConfirm(heal, extra);
  };

  return (
    <Dialog open={open} onClose={close} maxWidth="xs" fullWidth>
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
                {recoveryDie} max + {halfLevel}
                {bonusHeal ? ` + ${bonusHeal}` : ''} = <strong>{healAmount + bonusHeal} PV</strong> (−1 DR).
              </Typography>
            </Stack>
          )}

          {canHeal &&
            healBonuses.map((b) => {
              const bf = dieFaces(b.die);
              const raw = bonusRolls[b.featureId] ?? '';
              const v = Math.max(0, Math.round(Number.parseInt(raw, 10) || 0));
              const invalid = raw !== '' && (v < 1 || v > bf);
              return (
                <Box key={b.featureId}>
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 0.5 }}>
                    <DieIcon die={b.die} size={20} />
                    <Typography variant="body2">
                      Soin supplémentaire — <strong>{b.name}</strong>
                      {b.conditionLabel ? ` (${b.conditionLabel})` : ''} : +{b.count > 1 ? b.count : ''}
                      {b.die}{b.evolving ? '°' : ''} PV{' '}
                      {b.sourcePage != null && <SourceRef page={b.sourcePage} />}
                    </Typography>
                  </Stack>
                  <TextField
                    type="number"
                    size="small"
                    label={`Résultat du ${b.die}${b.evolving ? '°' : ''} lancé`}
                    value={raw}
                    onChange={(e) => setBonusRolls((prev) => ({ ...prev, [b.featureId]: e.target.value }))}
                    slotProps={{ htmlInput: { min: 1, max: bf } }}
                    helperText={invalid ? `Le résultat doit être compris entre 1 et ${bf}.` : `Facultatif — 1 à ${bf}.`}
                    error={invalid}
                    fullWidth
                  />
                </Box>
              );
            })}

          {elixirDosesToLose > 0 && (
            <Typography variant="body2" color="warning.main">
              {elixirDosesToLose === 1
                ? '1 élixir préparé sera perdu'
                : `${elixirDosesToLose} élixirs préparés seront perdus`}{' '}
              (les élixirs non utilisés le jour même sont perdus, <SourceRef page={98} />).
            </Typography>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={close}>Annuler</Button>
        <Button onClick={() => confirm(false)}>{canHeal ? 'Repos sans soin' : 'Repos long'}</Button>
        {canHeal && (
          <Button variant="contained" onClick={() => confirm(true)}>
            Repos + soin ({healAmount + bonusHeal} PV)
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

// Réexport de l'utilitaire de faces (utilisé aussi par la page pour l'appel à longRest).
export { dieFaces };
