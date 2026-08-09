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
import { AppAlert } from '@/components/AppAlert';
import { DieIcon } from '@/components/DieIcon';
import { SourceRef } from '@/components/SourceRef';

export interface ShortRestDialogProps {
  open: boolean;
  onClose: () => void;
  /** Dés de récupération disponibles. */
  recoveryDiceCurrent: number;
  /** Type du dé de récupération du profil (d6/d8/d10). */
  recoveryDie: Die;
  /** Niveau du personnage (pour le ½ niveau ajouté au soin). */
  level: number;
  /**
   * Bonus de soin par DR ACTIFS (Survie « en milieu naturel », native ou empruntée) : un dé
   * supplémentaire par bonus, lancé à la table et saisi ici, ajouté au soin de la dépense de DR.
   * Vide → repos standard sans saisie supplémentaire.
   */
  healBonuses?: RestRecoveryHealBonus[];
  /**
   * Applique le repos court. `recoveryDieRoll` = résultat du dé lancé à la table pour
   * dépenser un DR (soin `dé + ½ niveau`), ou `null` pour un repos sans soin. `extraHeal` =
   * total des dés de bonus saisis (Survie…), déjà sommé ; 0 si aucun.
   */
  onConfirm: (recoveryDieRoll: number | null, extraHeal: number) => void;
}

/** Nombre de faces d'un dé (`'d8'` → 8). */
function dieFaces(die: Die): number {
  return Number.parseInt(die.slice(1), 10) || 0;
}

/**
 * Modale de repos court = récupération rapide (PER-151, p. 221). Rappelle les effets
 * automatiques (dégâts temporaires régénérés, capacités « par combat » réinitialisées)
 * et permet de dépenser UN dé de récupération pour soigner `[dé + ½ niveau]` PV — le
 * résultat du dé étant SAISI par le joueur (les dés se lancent à la vraie table).
 */
export function ShortRestDialog({
  open,
  onClose,
  recoveryDiceCurrent,
  recoveryDie,
  level,
  healBonuses = [],
  onConfirm,
}: ShortRestDialogProps) {
  const [roll, setRoll] = useState('');
  // Saisie des dés de bonus (Survie…), une par capacité source, indexée par `featureId`.
  const [bonusRolls, setBonusRolls] = useState<Record<string, string>>({});
  const halfLevel = Math.floor(level / 2);
  const faces = dieFaces(recoveryDie);
  const parsedRoll = Math.max(0, Math.round(Number.parseInt(roll, 10) || 0));
  const canHeal = recoveryDiceCurrent > 0;
  const rollValid = canHeal && parsedRoll >= 1 && parsedRoll <= faces;
  // Somme des dés de bonus VALIDES (dans 1..faces du dé de bonus) ; une saisie vide/hors plage compte 0
  // — le bonus reste facultatif et ne bloque jamais le soin de base.
  const bonusHeal = healBonuses.reduce((sum, b) => {
    const bf = dieFaces(b.die);
    const v = Math.max(0, Math.round(Number.parseInt(bonusRolls[b.featureId] ?? '', 10) || 0));
    return sum + (v >= 1 && v <= bf ? v : 0);
  }, 0);
  const healTotal = parsedRoll + halfLevel + bonusHeal;

  const close = () => {
    setRoll('');
    setBonusRolls({});
    onClose();
  };
  const confirm = (recoveryDieRoll: number | null) => {
    // Le bonus ne s'applique QUE si un DR est réellement dépensé (soin) : repos sans soin → extraHeal 0.
    const extra = recoveryDieRoll != null ? bonusHeal : 0;
    setRoll('');
    setBonusRolls({});
    onConfirm(recoveryDieRoll, extra);
  };

  return (
    <Dialog open={open} onClose={close} maxWidth="xs" fullWidth>
      <DialogTitle>Repos court</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 0.5 }}>
          <Typography variant="body2" color="text.secondary">
            Récupération rapide (30 min) : les dégâts temporaires sont régénérés et les capacités
            « une fois par combat » sont réinitialisées.
          </Typography>

          {canHeal ? (
            <Box>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1 }}>
                <DieIcon die={recoveryDie} size={22} />
                <Typography variant="body2">
                  Dépenser <strong>1 dé de récupération</strong> ({recoveryDiceCurrent} restant
                  {recoveryDiceCurrent > 1 ? 's' : ''}) → soin de <strong>{recoveryDie} + {halfLevel}</strong> PV.
                </Typography>
              </Stack>
              <TextField
                autoFocus
                type="number"
                size="small"
                label={`Résultat du ${recoveryDie} lancé`}
                value={roll}
                onChange={(e) => setRoll(e.target.value)}
                slotProps={{ htmlInput: { min: 1, max: faces } }}
                helperText={
                  parsedRoll >= 1
                    ? rollValid
                      ? `Soin appliqué : ${parsedRoll} + ${halfLevel}${bonusHeal ? ` + ${bonusHeal}` : ''} = ${healTotal} PV (−1 DR)`
                      : `Le résultat doit être compris entre 1 et ${faces}.`
                    : `Saisissez le résultat du dé (1 à ${faces}).`
                }
                error={parsedRoll >= 1 && !rollValid}
                fullWidth
              />
              {healBonuses.map((b) => {
                const bf = dieFaces(b.die);
                const raw = bonusRolls[b.featureId] ?? '';
                const v = Math.max(0, Math.round(Number.parseInt(raw, 10) || 0));
                const invalid = raw !== '' && (v < 1 || v > bf);
                return (
                  <Box key={b.featureId} sx={{ mt: 1.5 }}>
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
            </Box>
          ) : (
            <AppAlert severity="info">
              Aucun dé de récupération disponible : seul un repos long permet de restaurer des PV{' '}
              <SourceRef page={221} />.
            </AppAlert>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={close}>Annuler</Button>
        <Button onClick={() => confirm(null)}>Repos sans soin</Button>
        {canHeal && (
          <Button variant="contained" disabled={!rollValid} onClick={() => confirm(parsedRoll)}>
            Soigner
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
