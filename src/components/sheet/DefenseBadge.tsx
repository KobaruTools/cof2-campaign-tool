'use client';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import ShieldIcon from '@mui/icons-material/Shield';
import GpsFixedIcon from '@mui/icons-material/GpsFixed';
import { alpha } from '@mui/material/styles';
import type { ImmunityId, ResistibleDamageType } from '@/data/schema';
import { AppTooltip } from '@/components/AppTooltip';
import { DamageTypeIcon } from '@/components/DamageTypeIcon';
import { StatusEffectIcon } from '@/components/StatusEffectIcon';
import { CapabilityChip } from '@/components/sheet/FeatureRichText';

/** Variante d'un badge de stat dérivée (couleur + icône de tête). */
export type DefenseBadgeVariant = 'immunity' | 'reduction' | 'critical';

/**
 * Donnée d'un BADGE de carte de statistique dérivée (PER-137) : IMMUNITÉ (vert, bouclier),
 * RÉDUCTION de dégâts (bleu) ou plage de CRITIQUE (violet, croix de visée). `scope` → icône du
 * type de dégât (flamme, flocon…) ; `text` → libellé court accolé (valeur « /2 », « 5 », plage
 * « 19-20 », ou libellé d'état « Peur »). Le `tooltip` porte l'explication complète.
 */
export interface DefenseBadgeData {
  key: string;
  variant: DefenseBadgeVariant;
  /** Type de dégât (→ icône). Absent : immunité d'état, RD sur tous les DM (« RD »), ou critique. */
  scope?: ResistibleDamageType;
  /**
   * Immunité d'ÉTAT (→ icône dédiée : terreur, ondes psychiques, escargot…), à la place du bouclier
   * générique. Le libellé texte étant souvent tronqué dans les cellules à largeur fixe, l'icône porte
   * l'identification (le `title`/tooltip donne le nom complet). Exclusif avec `scope`.
   */
  statusEffect?: ImmunityId;
  /** Texte court accolé : valeur de RD (« /2 », « 5 »), plage de critique (« 19-20 »), état (« Peur »). */
  text?: string;
  /** Titre du tooltip : libellé court de l'effet (ex. « RD 5 », « Immunité au feu », « Critique 18-20 »). */
  title: string;
  /**
   * Capacité(s) qui accordent l'effet, en BREAKDOWN (comme les stats dérivées) : nom + contribution
   * éventuelle (ex. RD cumulée « Fils du roc : 3 », « Peau d'acier : 3 ») + `featureId` d'origine,
   * affiché en puce de voie (`CapabilityChip` : voie en couleur + icône + rang) pour situer chaque
   * source d'un coup d'œil. PER-137.
   */
  sources: { name: string; value?: string; featureId?: string }[];
}

/** Couleur de palette MUI par variante. */
const PALETTE: Record<DefenseBadgeVariant, 'success' | 'info' | 'secondary'> = {
  immunity: 'success',
  reduction: 'info',
  critical: 'secondary',
};

/**
 * Badge compact custom (≠ Chip MUI) affiché sous une carte de statistique dérivée. Contenu réduit
 * au maximum (icône + valeur courte) ; le tooltip prend le relais pour l'explication. Sa largeur est
 * pilotée par la grille parente (cellule à largeur égale) pour une empreinte UNIFORME. Vert =
 * immunité (bouclier), bleu = réduction de dégâts, violet = plage de critique (croix de visée).
 */
export function DefenseBadge({
  variant,
  scope,
  statusEffect,
  text,
  title,
  sources,
  fullWidth = true,
}: Omit<DefenseBadgeData, 'key'> & { fullWidth?: boolean }) {
  const paletteKey = PALETTE[variant];
  // Tooltip en « breakdown » au style des statistiques dérivées : titre de l'effet, puis la/les
  // capacité(s) source(s) en sous-détail gris (nom + contribution si cumul). PER-137.
  const tooltip = (
    <Box sx={{ minWidth: 160 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
        {title}
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.25 }}>
        {sources.length > 1 ? 'Sources' : 'Source'}
      </Typography>
      {/* Chaque source rendue en puce de voie (couleur + icône + nom), l'origine « Voie du X, rang N »
          passant en infobulle ; la contribution chiffrée éventuelle (cumul RD) reste en bout de ligne.
          Sans `featureId` (source non liée à une capacité), on retombe sur le nom en texte. PER-137. */}
      {sources.map((s, i) => (
        <Box
          key={i}
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 2,
            fontSize: '0.85em',
            fontVariantNumeric: 'tabular-nums',
            mb: i < sources.length - 1 ? 0.5 : 0,
          }}
        >
          {s.featureId ? <CapabilityChip featureId={s.featureId} label={null} /> : <span>{s.name}</span>}
          {s.value && <span style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{s.value}</span>}
        </Box>
      ))}
    </Box>
  );
  return (
    <AppTooltip title={tooltip}>
      <Box
        sx={(theme) => ({
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 0.5,
          width: fullWidth ? '100%' : 'auto',
          minWidth: 0,
          height: 28,
          px: 1,
          borderRadius: 1,
          cursor: 'help',
          lineHeight: 1,
          fontSize: '0.85rem',
          fontWeight: 700,
          whiteSpace: 'nowrap',
          color: theme.palette[paletteKey].main,
          bgcolor: alpha(theme.palette[paletteKey].main, 0.12),
          border: `1px solid ${alpha(theme.palette[paletteKey].main, 0.45)}`,
        })}
      >
        {/* Immunité d'ÉTAT : icône dédiée (game-icons) à la place du bouclier générique — le libellé
            texte étant souvent tronqué, l'icône porte l'identification, le tooltip donne le nom complet. */}
        {statusEffect && <StatusEffectIcon effect={statusEffect} size={18} />}
        {/* Bouclier générique conservé pour les immunités SANS icône dédiée (ex. « tous DM »). */}
        {variant === 'immunity' && !scope && !statusEffect && <ShieldIcon sx={{ fontSize: 18 }} />}
        {variant === 'critical' && <GpsFixedIcon sx={{ fontSize: 18 }} />}
        {scope && <DamageTypeIcon type={scope} size={18} />}
        {!scope && variant === 'reduction' && <Box component="span">RD</Box>}
        {text && <Box component="span">{text}</Box>}
      </Box>
    </AppTooltip>
  );
}
