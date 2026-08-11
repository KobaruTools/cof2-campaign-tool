'use client';

import { useEffect, useState, type ReactNode } from 'react';
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

/**
 * Durée (ms) de l'entrée/sortie animée d'un groupe (retour propriétaire) — reprise en `setTimeout`
 * ci-dessous, DOIT rester synchro avec la valeur écrite dans `transition` de `RevealGroup`.
 */
const GROUP_TRANSITION_MS = 200;

export interface StickySheetStatusBarProps {
  /**
   * Révèle les caractéristiques (AGI/CON/FOR…) — piloté par le PIN de la section
   * « Caractéristiques » (`PinSectionButton`, cf. la fiche), pas par le défilement.
   */
  showAbilities: boolean;
  /** Caractéristiques EFFECTIVES (mods de peuple/capacités déjà fondus), comme `AbilitiesGrid`. */
  abilities: Record<AbilityId, number>;
  /**
   * Révèle le condensé Défense/Initiative/touches — piloté par le PIN de la section
   * « Statistiques dérivées » (`PinSectionButton`, cf. la fiche), pas par le défilement.
   */
  showDerivedStats: boolean;
  /**
   * Révèle les mini-jauges PV/mana/chance — piloté par le PIN de la section « État du
   * personnage » (`PinSectionButton`, cf. la fiche), pas par le défilement.
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
 * Groupe qui s'anime à l'apparition ET à la disparition (retour propriétaire) : le texte arrive
 * d'EN HAUT en s'éclaircissant (`translateY` négatif → 0, opacité 0 → 1) et repart EXACTEMENT à
 * l'envers en disparaissant — même transition CSS jouée dans les deux sens, pas une paire
 * entrée/sortie distincte. React ne retire pas le DOM en douceur tout seul : on retarde le
 * démontage (`mounted`) du temps de la transition CSS (`GROUP_TRANSITION_MS`) au lieu de couper le
 * groupe net, et on ne bascule `entered` qu'à la frame SUIVANTE (`requestAnimationFrame`) pour que
 * le navigateur peigne d'abord l'état de départ avant de transitionner vers l'état d'arrivée.
 */
function RevealGroup({ show, children }: { show: boolean; children: ReactNode }) {
  const [mounted, setMounted] = useState(show);
  const [entered, setEntered] = useState(show);
  useEffect(() => {
    if (show) {
      setMounted(true);
      const frame = requestAnimationFrame(() => setEntered(true));
      return () => cancelAnimationFrame(frame);
    }
    setEntered(false);
    const timeout = setTimeout(() => setMounted(false), GROUP_TRANSITION_MS);
    return () => clearTimeout(timeout);
  }, [show]);

  if (!mounted) return null;
  return (
    <Stack
      direction="row"
      spacing={1.5}
      sx={{
        alignItems: 'center',
        // `stretch` (au lieu d'hériter du `center` du Stack parent) : ce groupe occupe alors toute
        // la hauteur de la barre, ce qui donne aux séparateurs verticaux (`Divider flexItem`, qui
        // s'étirent à la hauteur de LEUR PROPRE parent flex) une hauteur réelle à remplir — sans ça,
        // un `Divider` seul dans ce groupe se retrouverait haut de quelques pixels à peine.
        alignSelf: 'stretch',
        flexShrink: 0,
        opacity: entered ? 1 : 0,
        transform: entered ? 'translateY(0)' : 'translateY(-6px)',
        transition: `opacity ${GROUP_TRANSITION_MS}ms ease, transform ${GROUP_TRANSITION_MS}ms ease`,
      }}
    >
      {children}
    </Stack>
  );
}

/**
 * Version CONDENSÉE de « Caractéristiques » + « Statistiques dérivées » + « État du personnage »,
 * rattachée à l'en-tête global (`AppHeader.extraRow`, SANS wrapper propre — ni fond, ni bordure, ni
 * ombre : elle hérite du verre dépoli de l'`AppBar`) pour garder ces valeurs sous les yeux sans
 * devoir remonter en haut de la fiche — utile en combat, où elles sont consultées en continu.
 *
 * Le conteneur EXTÉRIEUR pilote une animation de hauteur (`max-height` 0 → {@link BAR_HEIGHT}),
 * pour une apparition/disparition fluide de la barre elle-même — c'est aussi lui qui porte le filet
 * séparateur avec l'étage du dessus, visible seulement quand un groupe l'est. CHAQUE groupe (retour
 * propriétaire) s'anime en plus INDIVIDUELLEMENT via `RevealGroup` : son texte arrive d'en haut en
 * s'éclaircissant, et repart à l'envers en disparaissant.
 *
 * Chaque groupe est un OPT-IN manuel (retour propriétaire) : `showAbilities`/`showDerivedStats`/
 * `showStatusGauges` reflètent le PIN de la section correspondante (`PinSectionButton`, à côté de
 * son crayon d'édition), pas une détection de défilement — épinglé, le groupe reste affiché ici EN
 * PERMANENCE (pas seulement une fois son bloc source scrollé) ; non épinglé, il n'apparaît jamais.
 * Sans AUCUN pin actif, la barre entière n'apparaît pas (`visible` ci-dessous). Purement AFFICHAGE :
 * lecture seule, aucune action (les contrôles de jeu restent dans « État du personnage » plus bas).
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
        <RevealGroup show={showAbilities}>
          {ABILITY_IDS.map((id) => (
            <AbilityChip key={id} ability={id} value={abilities[id]} />
          ))}
        </RevealGroup>
        <RevealGroup show={showAbilities && (showDerivedStats || showStatusGauges)}>
          <Divider orientation="vertical" flexItem sx={{ borderColor: 'rgba(255, 255, 255, 0.12)' }} />
        </RevealGroup>
        <RevealGroup show={showDerivedStats}>
          <StatChip statId="defense" value={defense} />
          <StatChip statId="initiative" value={initiative} />
          <StatChip statId="meleeAttack" value={meleeAttack} />
          <StatChip statId="rangedAttack" value={rangedAttack} />
        </RevealGroup>
        <RevealGroup show={showDerivedStats && showStatusGauges}>
          <Divider orientation="vertical" flexItem sx={{ borderColor: 'rgba(255, 255, 255, 0.12)' }} />
        </RevealGroup>
        <RevealGroup show={showStatusGauges}>
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
        </RevealGroup>
      </Stack>
    </Box>
  );
}
