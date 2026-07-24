'use client';

import { useState } from 'react';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Collapse from '@mui/material/Collapse';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';
import type { Depletion } from '@/lib/character/types';
import { currentHp, hpHealthState, type HealthState } from '@/lib/character/gauges';
import { AppTooltip } from '@/components/AppTooltip';
import { SourceRef } from '@/components/SourceRef';
import { DerivedStatIcon } from '@/components/DerivedStatIcon';
import { GaugeBar, GaugeValueLabel, type GaugeSegment } from './GaugeBar';
import { GaugeExpandToggle } from './GaugeExpandToggle';
import { GaugeIconCap } from './GaugeIconCap';
import { usePersistentBoolean } from './usePersistentBoolean';

/** Nature des dégâts saisis dans les contrôles de PV. */
export type DamageKind = 'lethal' | 'temp';

/**
 * Métadonnées d'affichage des états de santé préjudiciables (p. 219-220), verbatim
 * du livre de base + page source (convention projet : verbatim de règle en
 * info-bulle). `normal` n'a pas de badge.
 */
const HEALTH_STATE_META: Record<
  Exclude<HealthState, 'normal'>,
  { label: string; palette: 'warning' | 'error' | 'secondary'; rule: string; sourcePage: number | string }
> = {
  weakened: {
    label: 'Affaibli',
    palette: 'warning',
    rule:
      'Un personnage ou une créature à 1 PV subit l’état préjudiciable affaibli. ' +
      'L’état affaibli disparaît dès que les PV repassent au-dessus de 1.',
    sourcePage: 220,
  },
  down: {
    label: 'À terre / mourant',
    palette: 'error',
    rule:
      'Quand un PJ tombe à 0 PV, il tombe au sol, inconscient, et perd 1 dé de récupération (DR). ' +
      'Lorsqu’un PJ est à 0 PV, il ne peut plus agir, et s’il ne bénéficie pas d’un sort de soins, ' +
      'd’une potion ou de premiers soins dans l’heure qui suit, il meurt.',
    sourcePage: 220,
  },
  stunned: {
    label: 'Assommé',
    palette: 'secondary',
    rule:
      'Lorsque les DM temporaires dépassent le nombre de PV restants et que le dernier coup a infligé ' +
      'des DM temporaires, la créature est assommée (inconsciente). Une créature élimine 1 DM ' +
      'temporaire subi par minute.',
    sourcePage: '219-220',
  },
};

/**
 * Badge d'état de santé custom (≠ Chip MUI, convention projet) : pastille colorée
 * avec le libellé, l'info-bulle portant le verbatim de règle + la page source.
 */
export function HealthStateBadge({ state }: { state: Exclude<HealthState, 'normal'> }) {
  const meta = HEALTH_STATE_META[state];
  const tooltip = (
    <Box sx={{ maxWidth: 280 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
        {meta.label}
      </Typography>
      <Typography variant="caption" sx={{ display: 'block', fontStyle: 'italic', mb: 0.5 }}>
        « {meta.rule} »
      </Typography>
      <SourceRef page={meta.sourcePage} />
    </Box>
  );
  return (
    <AppTooltip title={tooltip}>
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
    </AppTooltip>
  );
}

export interface HpGaugeProps {
  /** Dépletion transitoire dont on lit `.hp` (manque létal + temporaire). */
  depletion: Depletion;
  /** PV maximum (lecture seule ici : ce bloc ne touche que le courant). */
  maxHp: number;
  /** Inflige `amount` dégâts de la nature `kind`. */
  onDamage: (amount: number, kind: DamageKind) => void;
  /** Soigne `amount` PV (létaux d'abord, puis temporaires). */
  onHeal: (amount: number) => void;
  /** Remet les PV à plein. */
  onReset: () => void;
  /** Clé `localStorage` de l'état déplié/replié du formulaire dégâts/soin (unique par jauge). */
  persistKey: string;
  /** Libellé de l'icône cœur (info-bulle du cap). Défaut « Points de vie ». */
  iconLabel?: string;
  /**
   * Place les boutons rapides (−1 / +1 / remise à plein) sur une ligne DÉDIÉE sous la barre,
   * plutôt qu'à sa droite (défaut). Sert aux dispositions étroites (colonnes du tracker
   * d'initiative de l'écran de MJ, PER-236) où la barre a besoin de toute la largeur.
   */
  controlsBelow?: boolean;
  /**
   * Affichage NON interactif (PER-248) : masque tous les contrôles (ajustement ±1,
   * remise à plein, dépliage, formulaire dégâts/soin) — seule la barre et l'éventuel
   * badge d'état sont rendus. Sert à la fenêtre « présentation » du tracker de l'écran
   * de MJ (second écran en miroir, où les PV se modifient depuis la fenêtre principale).
   */
  readOnly?: boolean;
}

/**
 * Barre de vie INTERACTIVE réutilisable (PER-148, généralisée PER-233) : PV courants
 * sur leur maximum, barre tri-segment (PV actuels + dégâts temporaires + dégâts létaux)
 * et éventuel état préjudiciable (affaibli / à terre / assommé). Les contrôles infligent
 * des dégâts (létaux ou temporaires), soignent, ajustent au ±1 et remettent à plein.
 *
 * ÉTAT DE JEU transitoire : les contrôles sont toujours actifs (hors mode « Modifier »).
 * Le maximum est piloté ailleurs. Sert à la fois au personnage (`PlayerStatusPanel`) et à
 * chaque compagnon (`CompanionCard`), pour un comportement de suivi de PV identique.
 */
export function HpGauge({ depletion, maxHp, onDamage, onHeal, onReset, persistKey, iconLabel = 'Points de vie', controlsBelow = false, readOnly = false }: HpGaugeProps) {
  const theme = useTheme();
  const hpColor = theme.palette.success.main;
  const [amount, setAmount] = useState('1');
  const [kind, setKind] = useState<DamageKind>('lethal');
  const [expanded, toggleExpanded] = usePersistentBoolean(`gauge-expanded:${persistKey}`, false);

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

  // Boutons rapides (−1 / +1 / remise à plein) : rendus soit à droite de la barre (défaut),
  // soit sur une ligne dédiée en dessous (`controlsBelow`, colonnes étroites du tracker MJ).
  const quickControls = (
    <>
      <AppTooltip title="Infliger 1 dégât létal">
        <span>
          <IconButton size="small" aria-label="Retirer 1 PV" onClick={() => onDamage(1, 'lethal')}>
            <RemoveIcon fontSize="small" />
          </IconButton>
        </span>
      </AppTooltip>
      <AppTooltip title="Soigner 1 PV">
        <span>
          <IconButton size="small" aria-label="Rendre 1 PV" disabled={!hasDamage} onClick={() => onHeal(1)}>
            <AddIcon fontSize="small" />
          </IconButton>
        </span>
      </AppTooltip>
      <AppTooltip title="Remettre les PV à plein (outil manuel, hors règles de repos)">
        <span>
          <IconButton size="small" aria-label="Remettre les PV à plein" disabled={!hasDamage} onClick={onReset}>
            <RestartAltIcon fontSize="small" />
          </IconButton>
        </span>
      </AppTooltip>
    </>
  );

  return (
    <Stack spacing={1.25}>
      {/* Cap d'expansion + icône cœur (libellé en tooltip) + barre (courant/max intégré +
          badge d'état) + ajustement fin (±1, reset) accolés à sa droite (ou en dessous). */}
      <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
        <Stack direction="row" spacing={0} sx={{ alignItems: 'center', flexGrow: 1, minWidth: 0 }}>
          {!readOnly && <GaugeExpandToggle expanded={expanded} onToggle={toggleExpanded} color={hpColor} />}
          <GaugeIconCap color={hpColor} label={iconLabel}>
            <DerivedStatIcon statId="maxHp" size={28} color="#fff" />
          </GaugeIconCap>
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <GaugeBar
              max={maxHp}
              segments={segments}
              roundedLeft={false}
              overlay={<GaugeValueLabel current={current} max={maxHp} />}
            />
          </Box>
        </Stack>
        {state !== 'normal' && <HealthStateBadge state={state} />}
        {!controlsBelow && !readOnly && quickControls}
      </Stack>

      {/* Boutons rapides sur leur propre ligne (disposition étroite) — alignés à droite. */}
      {controlsBelow && !readOnly && (
        <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', justifyContent: 'flex-end' }}>
          {quickControls}
        </Stack>
      )}

      {/* Contrôles détaillés : montant + nature (létal/temp) + Dégâts / Soin. Repliés par défaut. */}
      <Collapse in={expanded && !readOnly} unmountOnExit>
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
        </Stack>
      </Collapse>
    </Stack>
  );
}
