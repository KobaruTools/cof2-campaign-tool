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

/** Une ligne de saisie « dé de bonus lancé à la table », partagée par les bonus conditionnels et automatiques. */
function BonusRollRow({
  bonus,
  raw,
  onChange,
}: {
  bonus: RestRecoveryHealBonus;
  raw: string;
  onChange: (value: string) => void;
}) {
  const bf = dieFaces(bonus.die);
  const v = Math.max(0, Math.round(Number.parseInt(raw, 10) || 0));
  const invalid = raw !== '' && (v < 1 || v > bf);
  return (
    <Box sx={{ mt: 1.5 }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 0.5 }}>
        <DieIcon die={bonus.die} size={20} />
        <Typography variant="body2">
          Soin supplémentaire — <strong>{bonus.name}</strong>
          {bonus.conditionLabel ? ` (${bonus.conditionLabel})` : ''} : +{bonus.count > 1 ? bonus.count : ''}
          {bonus.die}
          {bonus.evolving ? '°' : ''} PV{' '}
          {bonus.sourcePage != null && <SourceRef page={bonus.sourcePage} />}
        </Typography>
      </Stack>
      <TextField
        type="number"
        size="small"
        label={`Résultat du ${bonus.die}${bonus.evolving ? '°' : ''} lancé`}
        value={raw}
        onChange={(e) => onChange(e.target.value)}
        slotProps={{ htmlInput: { min: 1, max: bf } }}
        helperText={invalid ? `Le résultat doit être compris entre 1 et ${bf}.` : `Facultatif — 1 à ${bf}.`}
        error={invalid}
        fullWidth
      />
    </Box>
  );
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
  // Bonus liés à une DÉPENSE de DR (Survie « en milieu naturel ») vs bonus AUTOMATIQUES à chaque
  // récupération rapide, sans dépense (PER-378, maître de la nature r5 : `requiresRecoveryDieSpend: false`).
  const conditionalBonuses = healBonuses.filter((b) => b.requiresRecoveryDieSpend);
  const unconditionalBonuses = healBonuses.filter((b) => !b.requiresRecoveryDieSpend);
  // Somme des dés de bonus VALIDES (dans 1..faces du dé de bonus) ; une saisie vide/hors plage compte 0
  // — le bonus reste facultatif et ne bloque jamais le soin de base.
  const sumBonusRolls = (bonuses: RestRecoveryHealBonus[]) =>
    bonuses.reduce((sum, b) => {
      const bf = dieFaces(b.die);
      const v = Math.max(0, Math.round(Number.parseInt(bonusRolls[b.featureId] ?? '', 10) || 0));
      return sum + (v >= 1 && v <= bf ? v : 0);
    }, 0);
  const bonusHeal = sumBonusRolls(conditionalBonuses);
  const unconditionalHeal = sumBonusRolls(unconditionalBonuses);
  const healTotal = parsedRoll + halfLevel + bonusHeal + unconditionalHeal;

  const close = () => {
    setRoll('');
    setBonusRolls({});
    onClose();
  };
  const confirm = (recoveryDieRoll: number | null) => {
    // Le bonus lié à une dépense de DR ne s'applique QUE si un DR est réellement dépensé ; le bonus
    // automatique (`unconditionalHeal`) s'applique à CHAQUE récupération rapide, DR dépensé ou non.
    const extra = (recoveryDieRoll != null ? bonusHeal : 0) + unconditionalHeal;
    setRoll('');
    setBonusRolls({});
    onConfirm(recoveryDieRoll, extra);
  };

  return (
    <Dialog open={open} onClose={close} maxWidth="xs" fullWidth data-glossary-shot="ShortRestDialog">
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
                      ? `Soin appliqué : ${parsedRoll} + ${halfLevel}${bonusHeal ? ` + ${bonusHeal}` : ''}${unconditionalHeal ? ` + ${unconditionalHeal}` : ''} = ${healTotal} PV (−1 DR)`
                      : `Le résultat doit être compris entre 1 et ${faces}.`
                    : `Saisissez le résultat du dé (1 à ${faces}).`
                }
                error={parsedRoll >= 1 && !rollValid}
                fullWidth
              />
              {conditionalBonuses.map((b) => (
                <BonusRollRow
                  key={b.featureId}
                  bonus={b}
                  raw={bonusRolls[b.featureId] ?? ''}
                  onChange={(value) => setBonusRolls((prev) => ({ ...prev, [b.featureId]: value }))}
                />
              ))}
            </Box>
          ) : (
            <AppAlert severity="info">
              Aucun dé de récupération disponible : seul un repos long permet de restaurer des PV{' '}
              <SourceRef page={221} />.
            </AppAlert>
          )}
          {/* Bonus AUTOMATIQUE à chaque récupération rapide, sans dépense de DR (PER-378, maître de la
              nature r5) : reste proposé même sans DR disponible, et s'applique aussi en « repos sans soin ». */}
          {unconditionalBonuses.map((b) => (
            <BonusRollRow
              key={b.featureId}
              bonus={b}
              raw={bonusRolls[b.featureId] ?? ''}
              onChange={(value) => setBonusRolls((prev) => ({ ...prev, [b.featureId]: value }))}
            />
          ))}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={close}>Annuler</Button>
        <Button onClick={() => confirm(null)}>
          {unconditionalHeal ? `Repos (+${unconditionalHeal} PV)` : 'Repos sans soin'}
        </Button>
        {canHeal && (
          <Button variant="contained" disabled={!rollValid} onClick={() => confirm(parsedRoll)}>
            Soigner
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
