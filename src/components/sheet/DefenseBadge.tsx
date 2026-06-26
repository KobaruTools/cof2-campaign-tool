'use client';

import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import ShieldIcon from '@mui/icons-material/Shield';
import GpsFixedIcon from '@mui/icons-material/GpsFixed';
import { alpha } from '@mui/material/styles';
import type { ResistibleDamageType } from '@/data/schema';
import { DamageTypeIcon } from '@/components/DamageTypeIcon';

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
  /** Texte court accolé : valeur de RD (« /2 », « 5 »), plage de critique (« 19-20 »), état (« Peur »). */
  text?: string;
  /** Titre du tooltip : libellé court de l'effet (ex. « RD Froid ÷2 », « Immunité au feu », « Critique 18-20 »). */
  title: string;
  /** Explication (règle) affichée sous le titre. */
  description: string;
  /** Capacité(s) qui accordent l'effet — listées en breakdown « Source », comme les stats dérivées (PER-137). */
  sources: string[];
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
export function DefenseBadge({ variant, scope, text, title, description, sources }: Omit<DefenseBadgeData, 'key'>) {
  const paletteKey = PALETTE[variant];
  // Tooltip en « breakdown » au style des statistiques dérivées : titre de l'effet, explication, puis
  // la/les capacité(s) source(s) en sous-détail gris (PER-137).
  const tooltip = (
    <Box sx={{ minWidth: 180 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
        {title}
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
        {description}
      </Typography>
      {sources.length > 0 && (
        <>
          <Divider sx={{ my: 0.5 }} />
          <Box sx={{ fontSize: '0.8em', color: 'text.secondary' }}>
            {sources.length > 1 ? 'Sources : ' : 'Source : '}
            {sources.join(', ')}
          </Box>
        </>
      )}
    </Box>
  );
  return (
    <Tooltip title={tooltip} arrow>
      <Box
        sx={(theme) => ({
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 0.5,
          width: '100%',
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
        {variant === 'immunity' && <ShieldIcon sx={{ fontSize: 18 }} />}
        {variant === 'critical' && <GpsFixedIcon sx={{ fontSize: 18 }} />}
        {scope && <DamageTypeIcon type={scope} size={18} />}
        {!scope && variant === 'reduction' && <Box component="span">RD</Box>}
        {text && <Box component="span">{text}</Box>}
      </Box>
    </Tooltip>
  );
}
