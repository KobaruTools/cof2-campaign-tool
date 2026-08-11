'use client';

import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';
import { ABILITY_IDS, type AbilityId } from '@/data/schema';
import type { Depletion } from '@/lib/character/types';
import { currentHp, currentLuck, currentMana, hpHealthState } from '@/lib/character/gauges';
import type { DerivedStatId } from '@/lib/ui/derivedStats';
import { abilityTotalColor } from '@/lib/ui/abilityColors';
import { AbilityIcon } from '@/components/AbilityIcon';
import { DerivedStatIcon } from '@/components/DerivedStatIcon';
import { GaugeBar } from './GaugeBar';

/** Hauteur RÉVÉLÉE de la barre (animation `max-height`, cf. plus bas). */
const BAR_HEIGHT = 48;

/** Même rembourrage horizontal que les gouttières de l'`AppBar`/du sous-header (`AppHeader`). */
const GUTTER_PX = { xs: 2, sm: 3 };

export interface StickySheetStatusBarProps {
  /**
   * Révèle les caractéristiques (AGI/CON/FOR…) — une fois la section « Caractéristiques »
   * elle-même sortie de vue (`useScrolledPastBlock`, cf. la fiche), pas dès le premier défilement.
   */
  showAbilities: boolean;
  /** Caractéristiques EFFECTIVES (mods de peuple/capacités déjà fondus), comme `AbilitiesGrid`. */
  abilities: Record<AbilityId, number>;
  /**
   * Révèle le condensé Défense/Initiative/touches — une fois la section « Statistiques dérivées »
   * elle-même sortie de vue (`useScrolledPastBlock`, cf. la fiche), pas dès le premier défilement.
   */
  showDerivedStats: boolean;
  /**
   * Révèle les mini-jauges PV/mana/chance — une fois la section « État du personnage » elle-même
   * sortie de vue (`useScrolledPastBlock`, cf. la fiche), pas dès le premier défilement.
   */
  showStatusGauges: boolean;
  /** PV maximum EFFECTIF (surcharge manuelle incluse), comme `PlayerStatusPanel`. */
  maxHp: number;
  /** Dépletion transitoire courante du personnage. */
  depletion: Depletion;
  /** Réserve de mana maximale, ou `null` si le personnage ne connaît aucun sort (PER-149). */
  manaMax: number | null;
  /** Réserve de points de chance maximale (universelle, PER-155). */
  luckMax: number;
  /** Défense EFFECTIVE (surcharge manuelle incluse), `null` si profil incomplet. */
  defense: number | null;
  /** Initiative EFFECTIVE (surcharge manuelle incluse), `null` si profil incomplet. */
  initiative: number | null;
  /** Touche au contact EFFECTIVE (surcharge manuelle incluse), `null` si profil incomplet. */
  meleeAttack: number | null;
  /** Touche à distance EFFECTIVE (surcharge manuelle incluse), `null` si profil incomplet. */
  rangedAttack: number | null;
}

/** Mini-jauge condensée : icône cerclée + barre fine + `courant/max`, sans les contrôles de `GaugeRow`. */
function MiniGauge({ icon, current, max, color }: { icon: ReactNode; current: number; max: number; color: string }) {
  return (
    <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', flexShrink: 0 }}>
      {icon}
      <Box sx={{ width: 40 }}>
        <GaugeBar max={Math.max(1, max)} segments={[{ key: 'current', value: current, color }]} height={6} />
      </Box>
      <Typography
        variant="caption"
        sx={{ fontVariantNumeric: 'tabular-nums', color: 'text.secondary', whiteSpace: 'nowrap' }}
      >
        {current}/{max}
      </Typography>
    </Stack>
  );
}

/** Puce condensée d'une stat dérivée simple (Défense, Initiative, touche…) : icône + valeur brute. */
function StatChip({ statId, value }: { statId: DerivedStatId; value: number | null }) {
  if (value === null) return null;
  return (
    <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', flexShrink: 0 }}>
      <DerivedStatIcon statId={statId} title size={22} />
      <Typography variant="body2" sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </Typography>
    </Stack>
  );
}

/**
 * Puce condensée d'une caractéristique : icône + valeur signée, colorée selon le même système que
 * `AbilitiesGrid` (`abilityTotalColor` — saturation de la teinte d'identité de la carac, grise à
 * ≤0, pleine à ≥+5), pour rester cohérente avec la grille « Caractéristiques » qu'elle condense.
 */
function AbilityChip({ ability, value }: { ability: AbilityId; value: number }) {
  return (
    <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', flexShrink: 0 }}>
      <AbilityIcon ability={ability} title size={22} />
      <Typography
        variant="body2"
        sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: abilityTotalColor(value, ability) }}
      >
        {value >= 0 ? `+${value}` : value}
      </Typography>
    </Stack>
  );
}

/**
 * Version CONDENSÉE de « Caractéristiques » + « Statistiques dérivées » + « État du personnage »,
 * rattachée à l'en-tête global (`AppHeader.extraRow`, SANS wrapper propre — ni fond, ni bordure, ni
 * ombre : elle hérite du verre dépoli de l'`AppBar`) pour garder ces valeurs sous les yeux sans
 * devoir remonter en haut de la fiche — utile en combat, où elles sont consultées en continu.
 *
 * Toujours montée : `showAbilities`/`showDerivedStats`/`showStatusGauges` pilotent une animation de
 * hauteur (`max-height` 0 → {@link BAR_HEIGHT}) plutôt qu'un montage conditionnel, pour une
 * apparition/disparition fluide — c'est aussi elle qui porte le filet séparateur avec l'étage du
 * dessus, visible seulement quand un groupe l'est. Les TROIS groupes s'AJOUTENT INDÉPENDAMMENT, dans
 * l'ordre de la fiche (Caractéristiques, puis Statistiques dérivées, puis État du personnage) —
 * chacun une fois son PROPRE bloc source sorti de vue, jamais tous d'un coup au premier défilement.
 * Purement AFFICHAGE : lecture seule, aucune action (les contrôles de jeu restent dans « État du
 * personnage » plus bas).
 */
export function StickySheetStatusBar({
  showAbilities,
  abilities,
  showDerivedStats,
  showStatusGauges,
  maxHp,
  depletion,
  manaMax,
  luckMax,
  defense,
  initiative,
  meleeAttack,
  rangedAttack,
}: StickySheetStatusBarProps) {
  const theme = useTheme();
  const visible = showAbilities || showDerivedStats || showStatusGauges;

  const hpState = hpHealthState(maxHp, depletion);
  const hpColor =
    hpState === 'normal'
      ? theme.palette.success.main
      : hpState === 'weakened'
        ? theme.palette.warning.main
        : theme.palette.error.main;

  return (
    <Box
      sx={{
        overflow: 'hidden',
        maxHeight: visible ? BAR_HEIGHT : 0,
        opacity: visible ? 1 : 0,
        borderTop: `1px solid ${visible ? 'rgba(255, 255, 255, 0.18)' : 'transparent'}`,
        transition: 'max-height 0.2s ease, opacity 0.15s ease, border-color 0.15s ease',
      }}
    >
      <Stack
        direction="row"
        spacing={1.5}
        sx={{
          alignItems: 'center',
          height: BAR_HEIGHT - 1,
          px: GUTTER_PX,
          overflowX: 'auto',
        }}
      >
        {showAbilities && (
          <>
            {ABILITY_IDS.map((id) => (
              <AbilityChip key={id} ability={id} value={abilities[id]} />
            ))}
          </>
        )}
        {showAbilities && (showDerivedStats || showStatusGauges) && (
          <Divider orientation="vertical" flexItem sx={{ borderColor: 'rgba(255, 255, 255, 0.12)' }} />
        )}
        {showDerivedStats && (
          <>
            <StatChip statId="defense" value={defense} />
            <StatChip statId="initiative" value={initiative} />
            <StatChip statId="meleeAttack" value={meleeAttack} />
            <StatChip statId="rangedAttack" value={rangedAttack} />
          </>
        )}
        {showDerivedStats && showStatusGauges && (
          <Divider orientation="vertical" flexItem sx={{ borderColor: 'rgba(255, 255, 255, 0.12)' }} />
        )}
        {showStatusGauges && (
          <>
            <MiniGauge icon={<DerivedStatIcon statId="maxHp" size={22} />} current={currentHp(maxHp, depletion)} max={maxHp} color={hpColor} />
            {manaMax !== null && (
              <MiniGauge
                icon={<DerivedStatIcon statId="manaPoints" size={22} />}
                current={currentMana(manaMax, depletion)}
                max={manaMax}
                color={theme.palette.info.main}
              />
            )}
            <MiniGauge
              icon={<DerivedStatIcon statId="luckPoints" size={22} />}
              current={currentLuck(luckMax, depletion)}
              max={luckMax}
              color={theme.palette.secondary.main}
            />
          </>
        )}
      </Stack>
    </Box>
  );
}
