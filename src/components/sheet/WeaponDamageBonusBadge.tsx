'use client';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import BoltIcon from '@mui/icons-material/Bolt';
import { alpha } from '@mui/material/styles';
import type { SituationalDamageBonus } from '@/lib/character/weaponDamageBonus';
import { AppTooltip } from '@/components/AppTooltip';
import { CapabilityChip } from '@/components/sheet/FeatureRichText';

/** Libellé court du bonus (« +AGI », « +1d4° »), selon carac ou dé(s). */
function bonusLabel(b: SituationalDamageBonus): string {
  if (b.ability) return `+${b.ability}`;
  if (b.dice) return `+${b.dice.count}${b.dice.die}${b.dice.evolving ? '°' : ''}`;
  return '+DM';
}

/**
 * Badge d'un bonus de DM SITUATIONNEL (PER-115) — Attaque éclair (+AGI), Chasseur émérite (+1d4°)…
 * Custom (pas de Chip MUI), teinte ambre « conditionnel », icône d'éclair. Le tooltip porte la
 * capacité source (puce de voie) et la condition en toutes lettres. Distinct des DM PERMANENTS,
 * qui sont agrégés à l'expression de DM de l'arme, pas rendus en badge.
 */
export function WeaponDamageBonusBadge({ bonus }: { bonus: SituationalDamageBonus }) {
  const tooltip = (
    <Box sx={{ minWidth: 160 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
        Bonus de DM situationnel : {bonusLabel(bonus)}
      </Typography>
      <Box sx={{ mb: bonus.conditionLabel ? 0.5 : 0 }}>
        <CapabilityChip featureId={bonus.featureId} label={null} />
      </Box>
      {bonus.conditionLabel && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
          {bonus.conditionLabel}
        </Typography>
      )}
    </Box>
  );
  return (
    <AppTooltip title={tooltip}>
      <Box
        sx={(theme) => ({
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 0.35,
          height: 28,
          px: 1,
          borderRadius: 1,
          cursor: 'help',
          lineHeight: 1,
          fontSize: '0.85rem',
          fontWeight: 700,
          whiteSpace: 'nowrap',
          color: theme.palette.warning.main,
          bgcolor: alpha(theme.palette.warning.main, 0.12),
          border: `1px solid ${alpha(theme.palette.warning.main, 0.45)}`,
        })}
      >
        <BoltIcon sx={{ fontSize: 18 }} />
        <Box component="span">{bonusLabel(bonus)}</Box>
      </Box>
    </AppTooltip>
  );
}
