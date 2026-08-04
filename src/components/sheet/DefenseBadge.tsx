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
import { MalusDieBadge } from '@/components/MalusDieBadge';
import { DERIVED_STAT_ICON_PATHS } from '@/lib/ui/derivedStatIcons';
import { DEFENSE_BADGE_ICON_PATHS } from '@/lib/ui/defenseBadgeIcons';

/** Variante d'un badge de stat dérivée (couleur + icône de tête). */
export type DefenseBadgeVariant =
  | 'immunity'
  | 'situational-immunity'
  | 'reduction'
  | 'critical'
  | 'ranged-malus';

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
   * PRÉCISION affichée sous le titre du tooltip, avant les sources (PER-74) : la condition ou
   * l'exception que l'icône et le titre ne suffisent pas à porter — typiquement le type d'AGRESSEUR
   * d'une immunité situationnelle (« Seulement si provoqués par les morts-vivants… »). Absent = rien.
   */
  note?: string;
  /**
   * Capacité(s) qui accordent l'effet, en BREAKDOWN (comme les stats dérivées) : nom + contribution
   * éventuelle (ex. RD cumulée « Fils du roc : 3 », « Peau d'acier : 3 ») + `featureId` d'origine,
   * affiché en puce de voie (`CapabilityChip` : voie en couleur + icône + rang) pour situer chaque
   * source d'un coup d'œil. PER-137.
   */
  sources: { name: string; value?: string; featureId?: string }[];
}

/** Couleur de palette MUI par variante. */
const PALETTE: Record<DefenseBadgeVariant, 'success' | 'info' | 'secondary' | 'warning'> = {
  immunity: 'success',
  // Immunité SITUATIONNELLE (PER-74) : AMBRE et non vert. Le vert de l'immunité permanente dirait
  // « tu ne crains rien » ; ici la protection ne joue que contre un type d'agresseur nommé, et la
  // teinte d'avertissement invite à lire l'info-bulle plutôt qu'à compter dessus par défaut.
  'situational-immunity': 'warning',
  reduction: 'info',
  critical: 'secondary',
  // Dé malus imposé aux tirs adverses (Cape d'ombre) : c'est un AVANTAGE pour le joueur (plus dur à
  // toucher) → chip BLEUE (comme les réductions). Seuls les DÉS malus, à l'intérieur, restent rouges.
  'ranged-malus': 'info',
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
  note,
  sources,
  fullWidth = true,
  compact = false,
}: Omit<DefenseBadgeData, 'key'> & { fullWidth?: boolean; compact?: boolean }) {
  const paletteKey = PALETTE[variant];
  // Métriques réduites de la variante COMPACTE (écran de MJ) : puce plus petite pour tenir à
  // droite du chiffre sans l'écraser. Sinon, métriques standard de la fiche.
  const iconSize = compact ? 14 : 18;
  // En compact, une plage de critique (« 19-20 ») est réduite à sa seule borne basse (« 19 ») :
  // le « -20 » est toujours implicite (le critique va jusqu'à 20). Le tooltip garde la plage complète.
  const displayText = compact && variant === 'critical' && text ? text.split('-')[0] : text;
  // Tooltip en « breakdown » au style des statistiques dérivées : titre de l'effet, puis la/les
  // capacité(s) source(s) en sous-détail gris (nom + contribution si cumul). PER-137.
  const tooltip = (
    <Box sx={{ minWidth: 160 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
        {title}
      </Typography>
      {/* Condition / exception de la protection (PER-74) : le type d'agresseur d'une immunité
          situationnelle, en tête d'info-bulle — c'est l'information qui empêche de prendre le badge
          pour une protection générale, elle passe donc AVANT les sources. */}
      {note && (
        <Typography variant="caption" sx={{ display: 'block', mb: 0.75, fontStyle: 'italic' }}>
          {note}
        </Typography>
      )}
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
          gap: compact ? 0.35 : 0.5,
          width: fullWidth ? '100%' : 'auto',
          minWidth: 0,
          height: compact ? 20 : 28,
          px: compact ? 0.6 : 1,
          borderRadius: 1,
          cursor: 'help',
          lineHeight: 1,
          fontSize: compact ? '0.72rem' : '0.85rem',
          fontWeight: 700,
          whiteSpace: 'nowrap',
          color: theme.palette[paletteKey].main,
          bgcolor: alpha(theme.palette[paletteKey].main, 0.12),
          border: `1px solid ${alpha(theme.palette[paletteKey].main, 0.45)}`,
        })}
      >
        {/* Immunité d'ÉTAT : icône dédiée (game-icons) à la place du bouclier générique — le libellé
            texte étant souvent tronqué, l'icône porte l'identification, le tooltip donne le nom complet. */}
        {statusEffect && <StatusEffectIcon effect={statusEffect} size={iconSize} />}
        {/* Bouclier générique conservé pour les immunités SANS icône dédiée (ex. « tous DM »). */}
        {variant === 'immunity' && !scope && !statusEffect && <ShieldIcon sx={{ fontSize: iconSize }} />}
        {/* Immunité SITUATIONNELLE (PER-74) : tête de démon EN TÊTE du badge, devant l'icône du type
            de dégât — c'est la nature de l'agresseur qui conditionne tout, elle doit se voir d'abord. */}
        {variant === 'situational-immunity' && (
          <Box
            component="svg"
            viewBox="0 0 512 512"
            aria-hidden
            sx={{ width: iconSize, height: iconSize, fill: 'currentColor', flexShrink: 0 }}
            dangerouslySetInnerHTML={{ __html: DEFENSE_BADGE_ICON_PATHS['situational-immunity'] }}
          />
        )}
        {variant === 'critical' && <GpsFixedIcon sx={{ fontSize: iconSize }} />}
        {/* Dé malus aux tirs adverses (Cape d'ombre) : ARC (attaque à distance, en BLEU comme la chip)
            + dé malus (double d20 dont un barré, en ROUGE via MalusDieBadge). Pas de texte. */}
        {variant === 'ranged-malus' && (
          <>
            <Box
              component="svg"
              viewBox="0 0 512 512"
              aria-hidden
              sx={{ width: iconSize, height: iconSize, fill: 'currentColor', flexShrink: 0 }}
              dangerouslySetInnerHTML={{ __html: DERIVED_STAT_ICON_PATHS.rangedAttack }}
            />
            <MalusDieBadge size={iconSize} noTooltip />
          </>
        )}
        {scope && <DamageTypeIcon type={scope} size={iconSize} />}
        {!scope && variant === 'reduction' && <Box component="span">RD</Box>}
        {displayText && <Box component="span">{displayText}</Box>}
      </Box>
    </AppTooltip>
  );
}
