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
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';
import type { Depletion } from '@/lib/character/types';
import type { CapacityResourceGauge } from '@/lib/character/effects';
import { currentHp, currentMana, hpHealthState, type HealthState } from '@/lib/character/gauges';
import { classColor } from '@/lib/ui/classColors';
import { ClassIcon } from '@/components/ClassIcon';
import { DerivedStatIcon } from '@/components/DerivedStatIcon';
import { GaugeBar, GaugeValueLabel, type GaugeSegment } from './GaugeBar';
import { GaugeExpandToggle } from './GaugeExpandToggle';
import { GaugeIconCap } from './GaugeIconCap';
import { GaugeRow } from './GaugeRow';
import { usePersistentBoolean } from './usePersistentBoolean';

/**
 * Icône de profil dans un cercle blanc (même présentation cerclée que les icônes de
 * stats dérivées), pour identifier une jauge de ressource de capacité par son profil.
 */
function CircledClassIcon({ classId }: { classId: string }) {
  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 28,
        height: 28,
        borderRadius: '50%',
        border: '2px solid #fff',
      }}
    >
      <ClassIcon classId={classId} size={16} color="#fff" />
    </Box>
  );
}

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
  /**
   * Réserve de mana maximale (stat dérivée `manaPoints`), ou `null` si le personnage
   * ne connaît aucun sort — dans ce cas la jauge de mana n'est pas affichée (PER-149).
   */
  manaMax: number | null;
  /** Dépense `amount` points de mana. */
  onSpendMana: (amount: number) => void;
  /** Récupère `amount` points de mana. */
  onRestoreMana: (amount: number) => void;
  /** Remet le mana à plein. */
  onResetMana: () => void;
  /**
   * Ressources de capacité à réserve limitée (rage, sept vies…), lues depuis les mêmes
   * `usageCounters` que `FeaturesByPath` (PER-150). Vide → aucune jauge de ce type.
   */
  capacityGauges: CapacityResourceGauge[];
  /** Fixe le décompte RESTANT d'une ressource de capacité (clé, valeur, max). */
  onSetUsageCounter: (key: string, value: number, max: number) => void;
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
export function PlayerStatusPanel({
  depletion,
  maxHp,
  onDamage,
  onHeal,
  onResetHp,
  manaMax,
  onSpendMana,
  onRestoreMana,
  onResetMana,
  capacityGauges,
  onSetUsageCounter,
}: PlayerStatusPanelProps) {
  const theme = useTheme();
  // Couleurs CONCRÈTES (résolues) pour les caps assombris : PV en vert, mana en bleu.
  const hpColor = theme.palette.success.main;
  const manaColor = theme.palette.info.main;
  const [amount, setAmount] = useState('1');
  const [kind, setKind] = useState<DamageKind>('lethal');
  const [expanded, toggleExpanded] = usePersistentBoolean('gauge-expanded:hp', false);

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
      <Stack spacing={1.25}>
      {/* Cap d'expansion + icône cœur (libellé en tooltip) + barre (courant/max intégré +
          badge d'état) + ajustement fin (±1, reset) accolés à sa droite. */}
      <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
        <Stack direction="row" spacing={0} sx={{ alignItems: 'center', flexGrow: 1, minWidth: 0 }}>
          <GaugeExpandToggle expanded={expanded} onToggle={toggleExpanded} color={hpColor} />
          <GaugeIconCap color={hpColor} label="Points de vie">
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

      {/* Contrôles détaillés : montant + nature (létal/temp) + Dégâts / Soin. Repliés par défaut. */}
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

      {/* Jauge de mana — seulement pour un lanceur de sorts (manaMax non nul), PER-149. */}
      {manaMax !== null && (
        <GaugeRow
          label="Points de mana"
          icon={<DerivedStatIcon statId="manaPoints" size={28} color="#fff" />}
          fillColor="info.main"
          capColor={manaColor}
          persistKey="gauge-expanded:mana"
          current={currentMana(manaMax, depletion)}
          max={manaMax}
          spendLabel="Dépenser"
          restoreLabel="Récupérer"
          onSpend={onSpendMana}
          onRestore={onRestoreMana}
          onReset={onResetMana}
        />
      )}

      {/* Ressources de capacité (rage, charges explosives…) — même source que FeaturesByPath, PER-150.
          Couleur du profil porteur (barbare rouge, arquebusier orange…) + icône du profil cerclée ;
          repli sur l'ambre + libellé dans la barre si le profil n'est pas identifiable. */}
      {capacityGauges.map((g) => {
        const color = g.classId ? classColor(g.classId) : theme.palette.warning.main;
        return (
          <GaugeRow
            key={g.key}
            label={g.label}
            barLabel={g.classId ? undefined : g.label}
            icon={g.classId ? <CircledClassIcon classId={g.classId} /> : undefined}
            fillColor={color}
            capColor={color}
            persistKey={`gauge-expanded:usage:${g.key}`}
            current={g.current}
            max={g.max}
            spendLabel="Consommer"
            restoreLabel="Restaurer"
            onSpend={(n) => onSetUsageCounter(g.key, g.current - n, g.max)}
            onRestore={(n) => onSetUsageCounter(g.key, g.current + n, g.max)}
            onReset={() => onSetUsageCounter(g.key, g.max, g.max)}
          />
        );
      })}
    </Stack>
  );
}
