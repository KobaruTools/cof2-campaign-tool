'use client';

import { useState, type ReactNode } from 'react';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Collapse from '@mui/material/Collapse';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import { GaugeBar, GaugeValueLabel, type GaugeSegment } from './GaugeBar';
import { GaugeExpandToggle, type GaugeAccent } from './GaugeExpandToggle';
import { GaugeIconCap } from './GaugeIconCap';
import { usePersistentBoolean } from './usePersistentBoolean';

export interface GaugeRowProps {
  /** Libellé de la jauge (ex. « Points de mana »). */
  label: string;
  /** Icône de tête (optionnelle), déjà dimensionnée/colorée par l'appelant. */
  icon?: ReactNode;
  /** Couleur CSS de remplissage de la portion pleine (ex. `info.main`). */
  fillColor: string;
  /** Palette de la jauge (pour le cap d'expansion : couleur de barre assombrie). */
  accent: GaugeAccent;
  /** Clé `localStorage` de l'état déplié/replié des options (préférence utilisateur). */
  persistKey: string;
  /** Valeur courante (déjà bornée par l'appelant). */
  current: number;
  /** Maximum de la jauge. */
  max: number;
  /** Libellé du bouton qui CONSOMME (ex. « Dépenser »). */
  spendLabel: string;
  /** Libellé du bouton qui RESTAURE (ex. « Récupérer »). */
  restoreLabel: string;
  /** Consomme `amount` unités. */
  onSpend: (amount: number) => void;
  /** Restaure `amount` unités. */
  onRestore: (amount: number) => void;
  /** Remet la jauge à plein. */
  onReset: () => void;
}

/**
 * Rangée de jauge SIMPLE réutilisable du bloc « État du personnage » (PER-149) :
 * en-tête (icône + libellé + `courant / max`), barre monochrome, et contrôles
 * consommer / restaurer + steppers ±1 + reset. Sert aux jauges sans décomposition
 * particulière — mana, et plus tard ressources de capacité (rage). Les PV, qui
 * distinguent létal/temp, gardent leur propre présentation (`PlayerStatusPanel`).
 *
 * État de jeu transitoire : les contrôles sont toujours actifs (hors mode « Modifier »).
 */
export function GaugeRow({
  label,
  icon,
  fillColor,
  accent,
  persistKey,
  current,
  max,
  spendLabel,
  restoreLabel,
  onSpend,
  onRestore,
  onReset,
}: GaugeRowProps) {
  const [amount, setAmount] = useState('1');
  const [expanded, toggleExpanded] = usePersistentBoolean(persistKey, false);
  const parsedAmount = Math.max(0, Math.round(Number.parseInt(amount, 10) || 0));
  const full = current >= max;
  const empty = current <= 0;

  const segments: GaugeSegment[] = [
    { key: 'current', value: current, color: fillColor, label: `${label} : ${current}` },
  ];

  return (
    <Stack spacing={1.25}>
      {/* Cap d'expansion + icône (libellé en tooltip) + barre (chiffres intégrés) +
          ajustement fin (±1, reset) accolés à sa droite. */}
      <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
        <Stack direction="row" spacing={0} sx={{ alignItems: 'center', flexGrow: 1, minWidth: 0 }}>
          <GaugeExpandToggle expanded={expanded} onToggle={toggleExpanded} accent={accent} />
          {icon && (
            <GaugeIconCap accent={accent} label={label}>
              {icon}
            </GaugeIconCap>
          )}
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <GaugeBar
              max={max}
              segments={segments}
              roundedLeft={false}
              overlay={<GaugeValueLabel current={current} max={max} />}
            />
          </Box>
        </Stack>
        <Tooltip title={`${spendLabel} 1`} arrow>
          <span>
            <IconButton size="small" aria-label={`${spendLabel} 1`} disabled={empty} onClick={() => onSpend(1)}>
              <RemoveIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title={`${restoreLabel} 1`} arrow>
          <span>
            <IconButton size="small" aria-label={`${restoreLabel} 1`} disabled={full} onClick={() => onRestore(1)}>
              <AddIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="Remettre à plein" arrow>
          <span>
            <IconButton size="small" aria-label="Remettre à plein" disabled={full} onClick={onReset}>
              <RestartAltIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      </Stack>

      <Collapse in={expanded} unmountOnExit>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', rowGap: 1 }}>
          <TextField
            type="number"
            size="small"
            label="Montant"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            slotProps={{ htmlInput: { min: 0, style: { width: 64 } } }}
          />
          <Button
            variant="outlined"
            color="warning"
            disabled={parsedAmount <= 0 || empty}
            onClick={() => parsedAmount > 0 && onSpend(parsedAmount)}
          >
            {spendLabel}
          </Button>
          <Button
            variant="outlined"
            color="success"
            disabled={parsedAmount <= 0 || full}
            onClick={() => parsedAmount > 0 && onRestore(parsedAmount)}
          >
            {restoreLabel}
          </Button>
        </Stack>
      </Collapse>
    </Stack>
  );
}
