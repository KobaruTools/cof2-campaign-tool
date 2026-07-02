'use client';

import { useState } from 'react';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import type { Depletion } from '@/lib/character/types';
import { currentHp, hpHealthState, type HealthState } from '@/lib/character/gauges';
import { DerivedStatIcon } from '@/components/DerivedStatIcon';
import { GaugeBar, type GaugeSegment } from './GaugeBar';

/** Nature des dégâts saisis dans les contrôles de PV. */
type DamageKind = 'lethal' | 'temp';

/**
 * Métadonnées d'affichage des états de santé préjudiciables (p. 219-220), verbatim
 * du livre de base + page source (convention projet : verbatim de règle en
 * info-bulle). `normal` n'a pas de badge.
 */
const HEALTH_STATE_META: Record<
  Exclude<HealthState, 'normal'>,
  { label: string; palette: 'warning' | 'error' | 'secondary'; rule: string; source: string }
> = {
  weakened: {
    label: 'Affaibli',
    palette: 'warning',
    rule:
      'Un personnage ou une créature à 1 PV subit l’état préjudiciable affaibli. ' +
      'L’état affaibli disparaît dès que les PV repassent au-dessus de 1.',
    source: 'p. 220',
  },
  down: {
    label: 'À terre / mourant',
    palette: 'error',
    rule:
      'Quand un PJ tombe à 0 PV, il tombe au sol, inconscient, et perd 1 dé de récupération (DR). ' +
      'Lorsqu’un PJ est à 0 PV, il ne peut plus agir, et s’il ne bénéficie pas d’un sort de soins, ' +
      'd’une potion ou de premiers soins dans l’heure qui suit, il meurt.',
    source: 'p. 220',
  },
  stunned: {
    label: 'Assommé',
    palette: 'secondary',
    rule:
      'Lorsque les DM temporaires dépassent le nombre de PV restants et que le dernier coup a infligé ' +
      'des DM temporaires, la créature est assommée (inconsciente). Une créature élimine 1 DM ' +
      'temporaire subi par minute.',
    source: 'p. 219-220',
  },
};

/**
 * Badge d'état de santé custom (≠ Chip MUI, convention projet) : pastille colorée
 * avec le libellé, l'info-bulle portant le verbatim de règle + la page source.
 */
function HealthStateBadge({ state }: { state: Exclude<HealthState, 'normal'> }) {
  const meta = HEALTH_STATE_META[state];
  const tooltip = (
    <Box sx={{ maxWidth: 280 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
        {meta.label}
      </Typography>
      <Typography variant="caption" sx={{ display: 'block', fontStyle: 'italic', mb: 0.5 }}>
        « {meta.rule} »
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {meta.source}
      </Typography>
    </Box>
  );
  return (
    <Tooltip title={tooltip} arrow>
      <Box
        sx={(theme) => ({
          display: 'inline-flex',
          alignItems: 'center',
          height: 24,
          px: 1,
          borderRadius: 1,
          cursor: 'help',
          fontSize: '0.8rem',
          fontWeight: 700,
          whiteSpace: 'nowrap',
          color: theme.palette[meta.palette].main,
          bgcolor: alpha(theme.palette[meta.palette].main, 0.12),
          border: `1px solid ${alpha(theme.palette[meta.palette].main, 0.45)}`,
        })}
      >
        {meta.label}
      </Box>
    </Tooltip>
  );
}

export interface PlayerStatusPanelProps {
  /** Dépletion transitoire courante du personnage. */
  depletion: Depletion;
  /** PV maximum (stat dérivée, lecture seule ici). */
  maxHp: number;
  /** Inflige `amount` dégâts de la nature `kind`. */
  onDamage: (amount: number, kind: DamageKind) => void;
  /** Soigne `amount` PV (létaux d'abord, puis temporaires). */
  onHeal: (amount: number) => void;
  /** Remet les PV à plein. */
  onResetHp: () => void;
}

/**
 * Bloc « État du personnage » — barre de vie (PER-148).
 *
 * Affiche les PV COURANTS sur leur maximum, une barre bicolore (PV actuels + dégâts
 * temporaires + dégâts létaux) et l'éventuel état préjudiciable (affaibli / à terre /
 * assommé). Les contrôles infligent des dégâts (létaux ou temporaires), soignent,
 * ajustent au ±1 et remettent à plein. Tout est un ÉTAT DE JEU transitoire : actif
 * hors du mode « Modifier », comme les interrupteurs d'effets et compteurs d'usages.
 * Le maximum reste piloté ailleurs (« Statistiques dérivées ») : ce bloc ne touche
 * que le courant.
 */
export function PlayerStatusPanel({ depletion, maxHp, onDamage, onHeal, onResetHp }: PlayerStatusPanelProps) {
  const [amount, setAmount] = useState('1');
  const [kind, setKind] = useState<DamageKind>('lethal');

  const current = currentHp(maxHp, depletion);
  const lethal = Math.max(0, depletion.hp?.lethal ?? 0);
  const temp = Math.max(0, depletion.hp?.temp ?? 0);
  const state = hpHealthState(maxHp, depletion);
  const hasDamage = lethal > 0 || temp > 0;

  const parsedAmount = Math.max(0, Math.round(Number.parseInt(amount, 10) || 0));

  // Barre : PV actuels (vert), puis dégâts temporaires (ambre, récupérés à 1/min),
  // puis dégâts létaux (rouge). La somme des trois vaut le max → barre pleine à neuf.
  const segments: GaugeSegment[] = [
    { key: 'current', value: current, color: 'success.main', label: `PV actuels : ${current}` },
    { key: 'temp', value: temp, color: 'warning.main', label: `Dégâts temporaires : ${temp}` },
    { key: 'lethal', value: lethal, color: 'error.main', label: `Dégâts létaux : ${lethal}` },
  ];

  const applyDamage = () => {
    if (parsedAmount > 0) onDamage(parsedAmount, kind);
  };
  const applyHeal = () => {
    if (parsedAmount > 0) onHeal(parsedAmount);
  };

  return (
    <Stack spacing={1.25}>
      {/* En-tête : icône cœur + libellé + courant/max + badge d'état. */}
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
        <DerivedStatIcon statId="maxHp" size={26} color="var(--mui-palette-error-main)" />
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          Points de vie
        </Typography>
        <Box sx={{ flexGrow: 1 }} />
        {state !== 'normal' && <HealthStateBadge state={state} />}
        <Typography variant="h6" sx={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}>
          {current}
          <Typography component="span" variant="body2" color="text.secondary">
            {' '}
            / {maxHp}
          </Typography>
        </Typography>
      </Stack>

      <GaugeBar max={maxHp} segments={segments} />

      {/* Contrôles : montant + nature (létal/temp) + Dégâts / Soin + steppers ±1 + reset. */}
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', rowGap: 1 }}>
        <TextField
          type="number"
          size="small"
          label="Montant"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          slotProps={{ htmlInput: { min: 0, style: { width: 64 } } }}
        />
        <ToggleButtonGroup
          size="small"
          exclusive
          value={kind}
          onChange={(_, next: DamageKind | null) => next && setKind(next)}
          aria-label="Nature des dégâts"
        >
          <ToggleButton value="lethal">Létal</ToggleButton>
          <ToggleButton value="temp">Temp.</ToggleButton>
        </ToggleButtonGroup>
        <Button variant="outlined" color="error" onClick={applyDamage} disabled={parsedAmount <= 0}>
          Dégâts
        </Button>
        <Button variant="outlined" color="success" onClick={applyHeal} disabled={parsedAmount <= 0}>
          Soin
        </Button>

        <Box sx={{ flexGrow: 1 }} />

        <Tooltip title="Infliger 1 dégât létal" arrow>
          <span>
            <IconButton size="small" aria-label="Retirer 1 PV" onClick={() => onDamage(1, 'lethal')}>
              <RemoveIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="Soigner 1 PV" arrow>
          <span>
            <IconButton
              size="small"
              aria-label="Rendre 1 PV"
              disabled={!hasDamage}
              onClick={() => onHeal(1)}
            >
              <AddIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="Remettre les PV à plein (outil manuel, hors règles de repos)" arrow>
          <span>
            <IconButton size="small" aria-label="Remettre les PV à plein" disabled={!hasDamage} onClick={onResetHp}>
              <RestartAltIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      </Stack>
    </Stack>
  );
}
