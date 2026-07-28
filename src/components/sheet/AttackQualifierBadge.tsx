'use client';

import type { ReactNode } from 'react';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import type { RangedAttackElementView } from '@/lib/character/effects';
import { AppTooltip } from '@/components/AppTooltip';
import { DamageTypeIcon } from '@/components/DamageTypeIcon';
import { DamageValue } from '@/components/DamageValue';
import { PageRefText } from '@/components/SourceRef';
import { CapabilityChip } from '@/components/sheet/FeatureRichText';
import { DAMAGE_TYPE_LABEL } from '@/lib/ui/damageTypeLabels';

export type AttackBadgeColor = 'info' | 'warning' | 'error' | 'secondary' | 'success';

/**
 * Badge compact CUSTOM (≠ Chip MUI) d'un qualificatif d'attaque, au même gabarit que `DefenseBadge` :
 * icône + libellé court, l'explication (verbatim + source) passant en info-bulle. Partagé par la vue
 * mains nues (`UnarmedStrikeBadges`, PER-141) et l'attaque à distance (`RangedAttackCard`, PER-74)
 * pour un rendu strictement identique des qualificatifs communs (« Magique »…).
 */
export function AttackQualifierBadge({
  color,
  icon,
  label,
  tooltip,
}: {
  color: AttackBadgeColor;
  icon: ReactNode;
  label: ReactNode;
  tooltip: ReactNode;
}) {
  return (
    <AppTooltip title={tooltip}>
      <Box
        sx={(theme) => ({
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0.5,
          height: 28,
          px: 1,
          borderRadius: 1,
          cursor: 'help',
          lineHeight: 1,
          fontSize: '0.85rem',
          fontWeight: 700,
          whiteSpace: 'nowrap',
          color: theme.palette[color].main,
          bgcolor: alpha(theme.palette[color].main, 0.12),
          border: `1px solid ${alpha(theme.palette[color].main, 0.45)}`,
        })}
      >
        {icon}
        <Box component="span">{label}</Box>
      </Box>
    </AppTooltip>
  );
}

/** Info-bulle « breakdown » : verbatim (avec réfs de page cliquables) + puce de la capacité source. */
export function attackBadgeTooltip(verbatim: string, featureId?: string) {
  return (
    <Box sx={{ minWidth: 180 }}>
      <Typography variant="body2" sx={{ mb: featureId ? 0.75 : 0 }}>
        <PageRefText>{verbatim}</PageRefText>
      </Typography>
      {featureId && <CapabilityChip featureId={featureId} label={null} />}
    </Box>
  );
}

/**
 * Badge « Magique » commun (icône `AutoAwesome`, teinte `secondary`) : les attaques du mode considéré
 * sont considérées comme magiques. Le `verbatim` et la capacité source (`featureId`) alimentent
 * l'info-bulle. Partagé mains nues (Mains d'énergie) / distance (Flèche magique).
 */
export function MagicalAttackBadge({ verbatim, featureId }: { verbatim: string; featureId?: string }) {
  return (
    <AttackQualifierBadge
      color="secondary"
      icon={<AutoAwesomeIcon sx={{ fontSize: 18 }} />}
      label="Magique"
      tooltip={attackBadgeTooltip(verbatim, featureId)}
    />
  );
}

/**
 * Badge d'ÉLÉMENT de DM ajouté à l'attaque à distance (Flèche élémentaire de l'archer arcanique,
 * PER-74) : DÉ de bonus rendu en ICÔNE (`DamageValue`, ex. `+d12°` — dé RÉSOLU au niveau, comme la
 * puce du dé de bonus de la Rage du barbare) PUIS l'icône du type de DM + le libellé (« +d12° Feu »).
 * Teinte `warning`. Info-bulle COURTE (description brève sourcée) + puce de la capacité source.
 */
export function ElementalAttackBadge({ view }: { view: RangedAttackElementView }) {
  const label = DAMAGE_TYPE_LABEL[view.element] ?? view.element;
  const tooltip = (
    <Box sx={{ minWidth: 180 }}>
      <Typography variant="body2" sx={{ mb: 0.75 }}>
        <PageRefText>
          Bonus de DM élémentaire au choix, une fois par combat — non cumulable avec un autre bonus
          magique élémentaire (p. 137).
        </PageRefText>
      </Typography>
      <CapabilityChip featureId={view.featureId} label={null} />
    </Box>
  );
  return (
    <AttackQualifierBadge
      color="warning"
      icon={
        // « +d12° » : le dé de bonus (résolu au niveau) d'abord, forcé en couleur de texte pour rester
        // lisible sur le fond ambre (l'icône `DieIcon` hérite de `currentColor`).
        view.bonusDie ? (
          <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center' }}>
            +<DamageValue damage={view.bonusDie} size={16} sx={{ color: 'text.primary' }} />
          </Box>
        ) : (
          <DamageTypeIcon type={view.element} size={18} />
        )
      }
      label={
        // Quand le dé occupe la place de l'icône, l'icône d'élément passe DEVANT le libellé (« Feu »).
        view.bonusDie ? (
          <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.35 }}>
            <DamageTypeIcon type={view.element} size={18} />
            {label}
          </Box>
        ) : (
          label
        )
      }
      tooltip={tooltip}
    />
  );
}
