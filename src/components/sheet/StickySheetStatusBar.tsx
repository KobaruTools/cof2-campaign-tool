'use client';

import { Fragment, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import Badge from '@mui/material/Badge';
import Box from '@mui/material/Box';
import Collapse from '@mui/material/Collapse';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Popover from '@mui/material/Popover';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';
import { ABILITY_IDS, type AbilityId } from '@/data/schema';
import type { Depletion } from '@/lib/character/types';
import { currentHp, currentLuck, currentMana, hpHealthState } from '@/lib/character/gauges';
import type { DerivedStatId } from '@/lib/ui/derivedStats';
import { abilityTotalColor } from '@/lib/ui/abilityColors';
import { AbilityIcon } from '@/components/AbilityIcon';
import { AppTooltip } from '@/components/AppTooltip';
import { DerivedStatIcon } from '@/components/DerivedStatIcon';
import { GaugeBar } from './GaugeBar';

/** Hauteur d'une seule ligne de la barre (un groupe peut en faire moins, jamais plus). */
const ROW_HEIGHT = 36;

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
  /** Clic sur le groupe Caractéristiques : défile jusqu'à sa section source sur la fiche. */
  onJumpToAbilities: () => void;
  /**
   * Révèle le condensé Défense/Initiative/touches — piloté par le PIN de la section
   * « Statistiques dérivées » (`PinSectionButton`, cf. la fiche), pas par le défilement.
   */
  showDerivedStats: boolean;
  /** Clic sur le groupe Défense/Initiative/touches : défile jusqu'à sa section source. */
  onJumpToDerivedStats: () => void;
  /**
   * Révèle les mini-jauges PV/mana/chance — piloté par le PIN de la section « État du
   * personnage » (`PinSectionButton`, cf. la fiche), pas par le défilement.
   */
  showStatusGauges: boolean;
  /** Clic sur le groupe PV/mana/chance : défile jusqu'à sa section source. */
  onJumpToStatusGauges: () => void;
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
 *
 * `onClick` (retour propriétaire) : présent sur les groupes de CONTENU (caracs/stats/jauges), absent
 * sur les séparateurs — un clic ramène à la section source sur la fiche (cf. `scrollToSection`).
 */
function RevealGroup({ show, onClick, children }: { show: boolean; onClick?: () => void; children: ReactNode }) {
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
  const content = (
    <Stack
      direction="row"
      spacing={1.5}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      sx={{
        alignItems: 'center',
        // `stretch` (au lieu d'hériter du `center` du Stack parent) : ce groupe occupe alors toute
        // la hauteur de la barre, ce qui donne aux séparateurs verticaux (`Divider flexItem`, qui
        // s'étirent à la hauteur de LEUR PROPRE parent flex) une hauteur réelle à remplir — sans ça,
        // un `Divider` seul dans ce groupe se retrouverait haut de quelques pixels à peine.
        alignSelf: 'stretch',
        flexShrink: 0,
        minHeight: ROW_HEIGHT,
        opacity: entered ? 1 : 0,
        transform: entered ? 'translateY(0)' : 'translateY(-6px)',
        transition: `opacity ${GROUP_TRANSITION_MS}ms ease, transform ${GROUP_TRANSITION_MS}ms ease, background-color 0.15s ease`,
        ...(onClick && {
          cursor: 'pointer',
          outline: 'none',
          // Rembourrage horizontal PROPRE À CE GROUPE (pas au `Stack` parent, qui n'en porte
          // aucun — cf. plus bas) : les séparateurs, eux, restent nus (juste leur trait de 1px,
          // sans rembourrage à eux) pour ne pas laisser de bande morte non cliquable entre le fond
          // de survol et le trait voisin (retour propriétaire : le rembourrage doit vivre DANS le
          // bloc de contenu, pas sur le séparateur). Doublé par rapport à sa valeur d'origine pour
          // retrouver, à lui seul, le même espace visuel total autour du trait qu'avant — le
          // séparateur n'y contribuant plus du tout. Le fond de survol colore cette boîte de
          // rembourrage en entier et touche donc directement le trait du séparateur.
          px: 1.5,
          '&:hover, &:focus-visible': { bgcolor: 'rgba(255, 255, 255, 0.08)' },
        }),
      }}
    >
      {children}
    </Stack>
  );
  return onClick ? <AppTooltip title="Aller à la section">{content}</AppTooltip> : content;
}

/** Couleur commune des traits séparateurs verticaux entre deux groupes (barre condensée + mesure). */
const SEPARATOR_COLOR = 'rgba(255, 255, 255, 0.12)';

/** Largeur du trait séparateur (utilisée dans le calcul de largeur, pas seulement l'affichage). */
const DIVIDER_WIDTH = 1;

/** Largeur réservée au bouton « débordement » (icône + badge) quand tous les groupes ne tiennent pas. */
const OVERFLOW_BUTTON_WIDTH = 40;

/**
 * Mesure la largeur NATURELLE de chaque groupe épinglé (un jumeau hors flux par groupe, cf.
 * `setMeasureRef`) et la largeur DISPONIBLE du conteneur réel (`containerRef`), via
 * `ResizeObserver` — réagit aussi bien à un redimensionnement de fenêtre qu'à un changement du jeu
 * de groupes épinglés. Sert à décider, groupe par groupe dans l'ordre, combien tiennent sur la
 * ligne avant de devoir basculer le reste dans le menu de débordement (cf. `StickySheetStatusBar`).
 */
function useGroupWidths(keys: string[]) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const measureRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [containerWidth, setContainerWidth] = useState(0);
  const [widths, setWidths] = useState<Record<string, number>>({});

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const check = () => setContainerWidth(container.clientWidth);
    check();
    const observer = new ResizeObserver(check);
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    const observer = new ResizeObserver((entries) => {
      setWidths((prev) => {
        const next = { ...prev };
        for (const entry of entries) {
          const key = (entry.target as HTMLElement).dataset.groupKey;
          if (key) next[key] = entry.target.getBoundingClientRect().width;
        }
        return next;
      });
    });
    for (const key of keys) {
      const el = measureRefs.current[key];
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keys.join('|')]);

  const setMeasureRef = (key: string) => (el: HTMLDivElement | null) => {
    measureRefs.current[key] = el;
  };

  return { containerRef, setMeasureRef, containerWidth, widths };
}

/**
 * Version CONDENSÉE de « Caractéristiques » + « Statistiques dérivées » + « État du personnage »,
 * rattachée à l'en-tête global (`AppHeader.extraRow`, SANS wrapper propre — ni fond, ni bordure, ni
 * ombre : elle hérite du verre dépoli de l'`AppBar`) pour garder ces valeurs sous les yeux sans
 * devoir remonter en haut de la fiche — utile en combat, où elles sont consultées en continu.
 *
 * Le conteneur EXTÉRIEUR pilote une animation de hauteur pour une apparition/disparition fluide de
 * la barre elle-même (via `Collapse`) — c'est aussi lui qui porte le filet séparateur avec l'étage
 * du dessus, visible seulement quand un groupe l'est. CHAQUE groupe (retour propriétaire) s'anime en
 * plus INDIVIDUELLEMENT via `RevealGroup` : son texte arrive d'en haut en s'éclaircissant, et repart
 * à l'envers en disparaissant.
 *
 * La barre reste TOUJOURS sur une seule ligne (retour propriétaire, essai en remplacement du retour
 * à la ligne : moins agréable visuellement dès que beaucoup de groupes sont épinglés en même temps
 * sur un écran étroit — cf. `useGroupWidths`). Quand les groupes épinglés ne tiennent pas tous, les
 * derniers (dans l'ordre caracs → stats → jauges) basculent dans un menu de débordement (icône « ⋯ »
 * + badge de compte, motif classique de barre d'outils) plutôt que de forcer un passage à la ligne —
 * la hauteur de la barre ne bouge jamais, quel que soit le nombre de groupes épinglés à la fois.
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
  onJumpToAbilities,
  showDerivedStats,
  onJumpToDerivedStats,
  showStatusGauges,
  onJumpToStatusGauges,
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

  const [overflowAnchor, setOverflowAnchor] = useState<HTMLElement | null>(null);

  // Trois groupes de contenu, décrits une seule fois : réutilisés à l'identique par le rendu réel
  // (animé, cf. `RevealGroup`), par le jumeau de mesure hors flux (cf. `useGroupWidths`) et par le
  // menu de débordement (cf. plus bas).
  const groups = [
    {
      key: 'abilities',
      label: 'Caractéristiques',
      show: showAbilities,
      onClick: onJumpToAbilities,
      node: (
        <>
          {ABILITY_IDS.map((id) => (
            <AbilityChip key={id} ability={id} value={abilities[id]} />
          ))}
        </>
      ),
    },
    {
      key: 'derived',
      label: 'Statistiques dérivées',
      show: showDerivedStats,
      onClick: onJumpToDerivedStats,
      node: (
        <>
          <StatChip statId="defense" value={defense} />
          <StatChip statId="initiative" value={initiative} />
          <StatChip statId="meleeAttack" value={meleeAttack} />
          <StatChip statId="rangedAttack" value={rangedAttack} />
        </>
      ),
    },
    {
      key: 'gauges',
      label: 'État du personnage',
      show: showStatusGauges,
      onClick: onJumpToStatusGauges,
      node: (
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
      ),
    },
  ];
  // Seuls les groupes ÉPINGLÉS comptent pour le calcul de largeur/débordement — un groupe non
  // épinglé n'occupe aucune place, qu'il tienne ou non.
  const pinnedGroups = groups.filter((g) => g.show);
  const pinnedKeys = pinnedGroups.map((g) => g.key);
  const { containerRef, setMeasureRef, containerWidth, widths } = useGroupWidths(pinnedKeys);

  // Remplit la ligne dans l'ordre (caracs → stats → jauges) tant que la largeur NATURELLE cumulée
  // (mesurée par `useGroupWidths`) tient dans la largeur disponible — le reste bascule dans le menu
  // de débordement. `containerWidth === 0` (avant la toute première mesure) : tout est provisoirement
  // considéré visible plutôt que de faire clignoter le menu au montage.
  let visibleKeys = pinnedKeys;
  let overflowGroups: typeof pinnedGroups = [];
  const totalNaturalWidth = pinnedGroups.reduce(
    (sum, g, i) => sum + (widths[g.key] ?? 0) + (i > 0 ? DIVIDER_WIDTH : 0),
    0,
  );
  if (containerWidth > 0 && totalNaturalWidth > containerWidth) {
    const budget = containerWidth - OVERFLOW_BUTTON_WIDTH;
    let used = 0;
    let cut = 0;
    while (cut < pinnedGroups.length) {
      const w = (widths[pinnedGroups[cut].key] ?? 0) + (cut > 0 ? DIVIDER_WIDTH : 0);
      if (used + w > budget) break;
      used += w;
      cut += 1;
    }
    visibleKeys = pinnedKeys.slice(0, cut);
    overflowGroups = pinnedGroups.slice(cut);
  }
  const isVisible = (key: string) => visibleKeys.includes(key);

  return (
    <Collapse in={visible} timeout={200}>
      <Box
        sx={{
          borderTop: `1px solid ${visible ? 'rgba(255, 255, 255, 0.18)' : 'transparent'}`,
          transition: 'border-color 0.15s ease',
        }}
      >
        {/* Jumeaux de mesure hors flux (jamais peints : `visibility: hidden` + hauteur nulle chez
            leur parent commun) — un par groupe épinglé, chacun `inline-flex` indépendant (pas des
            items d'un même conteneur `nowrap`, qui pourraient se rétrécir les uns les autres) pour
            donner sa largeur NATURELLE propre, comparée par `useGroupWidths` à la largeur
            disponible pour décider combien de groupes tiennent avant le menu de débordement. */}
        <Box sx={{ height: 0, overflow: 'hidden' }} aria-hidden>
          {pinnedGroups.map((g) => (
            <Box key={g.key} data-group-key={g.key} ref={setMeasureRef(g.key)} sx={{ display: 'inline-flex' }}>
              <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', px: 1.5 }}>
                {g.node}
              </Stack>
            </Box>
          ))}
        </Box>

        <Stack ref={containerRef} direction="row" sx={{ alignItems: 'center', flexWrap: 'nowrap', overflow: 'hidden' }}>
          <RevealGroup show={showAbilities && isVisible('abilities')} onClick={onJumpToAbilities}>
            {groups[0].node}
          </RevealGroup>
          <RevealGroup show={showAbilities && isVisible('abilities') && (showDerivedStats || showStatusGauges) && (isVisible('derived') || isVisible('gauges'))}>
            <Divider orientation="vertical" flexItem sx={{ borderColor: SEPARATOR_COLOR }} />
          </RevealGroup>
          <RevealGroup show={showDerivedStats && isVisible('derived')} onClick={onJumpToDerivedStats}>
            {groups[1].node}
          </RevealGroup>
          <RevealGroup show={showDerivedStats && isVisible('derived') && showStatusGauges && isVisible('gauges')}>
            <Divider orientation="vertical" flexItem sx={{ borderColor: SEPARATOR_COLOR }} />
          </RevealGroup>
          <RevealGroup show={showStatusGauges && isVisible('gauges')} onClick={onJumpToStatusGauges}>
            {groups[2].node}
          </RevealGroup>

          {overflowGroups.length > 0 && (
            <IconButton
              size="small"
              onClick={(e) => setOverflowAnchor(e.currentTarget)}
              aria-label={`${overflowGroups.length} groupe(s) supplémentaire(s)`}
              sx={{ ml: 'auto', flexShrink: 0 }}
            >
              <Badge badgeContent={overflowGroups.length} color="primary">
                <MoreHorizIcon fontSize="small" />
              </Badge>
            </IconButton>
          )}
        </Stack>

        <Popover
          open={overflowGroups.length > 0 && Boolean(overflowAnchor)}
          anchorEl={overflowAnchor}
          onClose={() => setOverflowAnchor(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        >
          <Stack sx={{ p: 1.5, gap: 1.5, minWidth: 220 }}>
            {overflowGroups.map((g) => (
              <Box
                key={g.key}
                onClick={() => {
                  g.onClick();
                  setOverflowAnchor(null);
                }}
                sx={{ cursor: 'pointer', borderRadius: 1, p: 0.5, '&:hover': { bgcolor: 'action.hover' } }}
              >
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                  {g.label}
                </Typography>
                <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                  {g.node}
                </Stack>
              </Box>
            ))}
          </Stack>
        </Popover>
      </Box>
    </Collapse>
  );
}
