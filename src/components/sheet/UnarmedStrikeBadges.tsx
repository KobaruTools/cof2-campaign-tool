'use client';

import type { ReactNode } from 'react';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import CasinoIcon from '@mui/icons-material/Casino';
import SportsMartialArtsIcon from '@mui/icons-material/SportsMartialArts';
import TuneIcon from '@mui/icons-material/Tune';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import { AppTooltip } from '@/components/AppTooltip';
import { PageRefText } from '@/components/SourceRef';
import { CapabilityChip } from '@/components/sheet/FeatureRichText';
import type { UnarmedStrikeView } from '@/lib/character/unarmedStrike';

type BadgeColor = 'info' | 'warning' | 'error' | 'secondary' | 'success';

/**
 * Badge compact CUSTOM (≠ Chip MUI) d'un qualificatif du combat à mains nues, au même
 * gabarit que `DefenseBadge` : icône + libellé court, l'explication (verbatim + source)
 * passant en info-bulle.
 */
function QualifierBadge({
  color,
  icon,
  label,
  tooltip,
}: {
  color: BadgeColor;
  icon: ReactNode;
  label: string;
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
function badgeTooltip(verbatim: string, featureId?: string) {
  return (
    <Box sx={{ minWidth: 180 }}>
      <Typography variant="body2" sx={{ mb: featureId ? 0.75 : 0 }}>
        <PageRefText>{verbatim}</PageRefText>
      </Typography>
      {featureId && <CapabilityChip featureId={featureId} label={null} />}
    </Box>
  );
}

/** Verbatim de la règle des DM temporaires (arme `mains-nues`, p. 183/219). */
const NON_LETHAL_RULE =
  'Dans le cas du combat à mains nues, les DM sont généralement temporaires (voir DM temporaires, p. 219).';
/** Verbatim du trait de profil du moine (p. 119). */
const MONK_LETHAL_CHOICE =
  'Tous les moines infligent des DM létaux avec les attaques à mains nues lorsqu’ils le souhaitent (p. 119).';

/**
 * Rangée de badges custom qualifiant l'attaque à MAINS NUES (PER-141) : létalité (non
 * létal / létal / au choix), attaques magiques, « 1 au dé → max », choix du type de DM, et
 * plage de critique (Morsure du serpent). Verbatim + source en info-bulle, jamais de `Chip`
 * MUI. Rendue sous la carte « Attaque au contact » quand la bascule est en mode mains nues.
 */
export function UnarmedStrikeBadges({ view }: { view: UnarmedStrikeView }) {
  /** Capacité source (si acquise) d'un qualificatif, pour la puce de voie et son verbatim. */
  const sourceOf = (featureId: string) =>
    view.sources.some((s) => s.featureId === featureId) ? featureId : undefined;
  const energyHands = sourceOf('energie-vitale-r1');
  const tigerClaws = sourceOf('maitrise-r2');

  // Létalité : un moine choisit toujours (jamais forcé) ; sinon non létal (DM temporaires, p. 219).
  const lethalityBadge =
    view.lethality === 'choice' ? (
      <QualifierBadge
        color="warning"
        icon={<SportsMartialArtsIcon sx={{ fontSize: 18 }} />}
        label="Létal au choix"
        tooltip={badgeTooltip(MONK_LETHAL_CHOICE)}
      />
    ) : (
      <QualifierBadge
        color="info"
        icon={<SportsMartialArtsIcon sx={{ fontSize: 18 }} />}
        label="Non létal"
        tooltip={badgeTooltip(NON_LETHAL_RULE)}
      />
    );

  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
      {lethalityBadge}
      {view.magical && (
        <QualifierBadge
          color="secondary"
          icon={<AutoAwesomeIcon sx={{ fontSize: 18 }} />}
          label="Magique"
          tooltip={badgeTooltip(
            'Attaques à mains nues toujours considérées comme magiques, même sans utiliser l’action Mains d’énergie.',
            energyHands,
          )}
        />
      )}
      {view.minRollBecomesMax && (
        <QualifierBadge
          color="success"
          icon={<CasinoIcon sx={{ fontSize: 18 }} />}
          label="1 = max"
          tooltip={badgeTooltip(
            'Un résultat de 1 au dé de DM à mains nues est remplacé par le résultat maximal du dé.',
            tigerClaws,
          )}
        />
      )}
      {view.damageTypeChoice && (
        <QualifierBadge
          color="success"
          icon={<TuneIcon sx={{ fontSize: 18 }} />}
          label="Tranch./perf."
          tooltip={badgeTooltip(
            'Le moine peut infliger des DM tranchants ou perforants à mains nues, au lieu de contondants.',
            tigerClaws,
          )}
        />
      )}
    </Box>
  );
}
