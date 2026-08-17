'use client';

/**
 * Écran de MJ (première itération) — route dédiée `/campaign/[cid]/gm-screen`,
 * **owner-only** (gating proxy : `/campaign/*` exige une session MJ). Accessible
 * uniquement depuis la vue campagne.
 *
 * Pour l'instant, l'écran se limite aux **aperçus** (`CharacterPreviewCard`) des
 * personnages de la campagne **réclamés par un joueur** (attribués : `playerId`
 * non nul). C'est la vue « coup d'œil » du MJ sur sa table : chaque carte est une
 * fiche de personnage SIMPLIFIÉE (portrait, identité, caractéristiques, micro-grille
 * des voies et statistiques dérivées compactes), chapeautée du nom du joueur qui
 * incarne le personnage. Depuis PER-258, **cliquer une carte ouvre le panneau latéral
 * de fiche** (`?sheet=<id>`) sans quitter l'écran ; le petit bouton dédié (ligne du
 * joueur) reste l'échappatoire vers la fiche complète, dans un onglet au besoin.
 *
 * Vocation à grandir (jets rapides, PV/mana en direct, notes de session…), d'où
 * une page dédiée plutôt qu'une modale.
 */
import { Suspense, use, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  pointerWithin,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { type Step } from 'react-joyride';
import AddIcon from '@mui/icons-material/Add';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import HandymanIcon from '@mui/icons-material/Handyman';
import HelpOutlineIcon from '@mui/icons-material/HelpOutlined';
import HistoryIcon from '@mui/icons-material/History';
import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined';
import PetsOutlinedIcon from '@mui/icons-material/PetsOutlined';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Collapse from '@mui/material/Collapse';
import Container from '@mui/material/Container';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import { type Theme } from '@mui/material/styles';
import { GuidedTour } from '@/components/tour/GuidedTour';
import { useGuidedTour } from '@/lib/tours/useGuidedTour';
import { CharacterPreviewCardSkeleton } from '@/components/CharacterPreviewCardSkeleton';
import { CollapsibleLabelButton } from '@/components/CollapsibleLabelButton';
import { GmScreenCard } from '@/components/campaign/GmScreenCard';
import { GmSheetDrawerHost } from '@/components/campaign/GmSheetDrawerHost';
import { GmScreenCreatureCard } from '@/components/campaign/GmScreenCreatureCard';
import { GmScreenCompanionCard } from '@/components/campaign/GmScreenCompanionCard';
import { AddCreatureDialog } from '@/components/campaign/AddCreatureDialog';
import { InitiativeTracker, type ReorderDragPreview } from '@/components/campaign/InitiativeTracker';
import { CombatStatusPalette, StatusChipVisual } from '@/components/campaign/CombatStatusPalette';
import { BuffRequestsControl } from '@/components/campaign/BuffRequestsControl';
import { GroupRestControl } from '@/components/campaign/GroupRestControl';
import { OpenTrackerWindowButton } from '@/components/campaign/OpenTrackerWindowButton';
import { ProjectionLinkControl } from '@/components/campaign/ProjectionLinkControl';
import { GmToolsDrawerHost, TOOLS_PARAM } from '@/components/campaign/GmToolsDrawerHost';
import {
  DEFAULT_GM_TOOL,
  TOOLS as GM_TOOLS_LIST,
  gmScreenToolsTabTourTarget,
  isGmToolId,
  type GmToolId,
} from '@/components/campaign/GmToolsDrawer';
import { GmReferenceDrawerHost, REFERENCE_PARAM } from '@/components/campaign/GmReferenceDrawerHost';
import { GmBestiaryDrawerHost, BESTIARY_PARAM } from '@/components/campaign/GmBestiaryDrawerHost';
import { GmHistoryDrawerHost, HISTORY_PARAM } from '@/components/campaign/GmHistoryDrawerHost';
import { HomeBackground } from '@/components/HomeBackground';
import { GmSessionHeaderIndicator } from '@/components/session/GmSessionHeaderIndicator';
import { SIDE_ACCENT, type CreatureSide } from '@/lib/ui/creature';
import { glassButtonSx } from '@/lib/ui/glassButtonSx';
import { usePersistedBoolean } from '@/lib/ui/usePersistedBoolean';
import { storageKeys } from '@/lib/storage/keys';
import { usePersistedState } from '@/lib/ui/usePersistedState';
import { customCreatureBlob } from '@/lib/session/customCreature';
import { useActiveSession } from '@/lib/session/useActiveSession';
import {
  isCampScopedStatus,
  type AnyStatusEffectId,
} from '@/lib/character/statusEffects';
import { groupBuffFeatureId, groupBuffIntensityFor } from '@/lib/character/groupBuffs';
import { GroupBuffDialog, type GroupBuffCandidate } from '@/components/campaign/GroupBuffDialog';
import type { BeneficialEffectId } from '@/data/schema';
import { useHeaderContent } from '@/stores/headerContent';
import { hrefFromIndex, useCharacterSlugIndex, useResolvedCampaign } from '@/lib/routing/slug';
import { useGmScreenCombat, type LabeledCreature } from './useGmScreenCombat';

/**
 * Gabarit de colonnes commun aux trois grilles (joueurs / alliés / adversaires) : 3
 * colonnes sur grand écran, palier tablette à 2, repli mobile à 1.
 */
/**
 * Hauteur de l'en-tête global (`AppHeader`, lui-même `position: sticky`) sous laquelle cale la barre
 * d'actions collée ci-dessous — même constante que celle redite par `ReferenceBrowser` pour empiler sa
 * propre barre collée sous ce même en-tête (pas de source commune, cf. son commentaire : la valeur est
 * stable mais appartient à un autre périmètre).
 */
const APP_HEADER_HEIGHT_SM_UP = 83;
const APP_HEADER_HEIGHT_XS = 75;

/**
 * Empilement de la barre d'actions collée : sous l'en-tête global (`AppBar`, 1100) et le panneau
 * latéral de fiche (`Drawer`, 1200), au-dessus du contenu de la page — même palier que la bande
 * d'initiative collée (`STICKY_Z_INDEX` d'`InitiativeTracker`/`SheetInitiativeBar`).
 */
const STICKY_ACTIONS_Z_INDEX = 900;

const GRID_SX = {
  display: 'grid',
  gridTemplateColumns: {
    xs: 'minmax(0, 1fr)',
    sm: 'repeat(2, minmax(0, 1fr))',
    lg: 'repeat(3, minmax(0, 1fr))',
  },
  gap: 2,
  alignItems: 'start',
} as const;

/**
 * Bloc de stats à passer à la carte d'une créature : `undefined` pour une créature du bestiaire
 * (la carte le charge elle-même par slug), bloc SYNTHÉTIQUE pour une créature créée à la main.
 * Le titre du bloc reprend le nom nu de l'instance — la numérotation des homonymes vit dans le
 * badge de la carte, comme pour une créature de livre.
 */
function creatureCardBlob(inst: LabeledCreature) {
  return inst.custom ? customCreatureBlob(inst.custom, inst.name) : undefined;
}

/**
 * Section repliable de la grille de combat (joueurs / alliés / adversaires). L'état
 * ouvert/fermé est persisté en local — c'est une préférence d'affichage du MJ, la même
 * quelle que soit la campagne, d'où une clé `localStorage` sans `cid`.
 *
 * Même affordance que les sections repliables des réglages de campagne : en-tête
 * cliquable à la souris comme au clavier, chevron rotatif. Le compteur reste visible
 * une fois replié, pour savoir ce qui est masqué sans avoir à rouvrir.
 */
function CollapsibleSection({
  label,
  color,
  storageKey,
  count,
  children,
}: {
  label: string;
  color?: string;
  storageKey: string;
  count: number;
  children: React.ReactNode;
}) {
  const [open, setOpen] = usePersistedBoolean(storageKey, true);
  const accent = color ?? 'text.secondary';
  return (
    <Box>
      <Box
        role="button"
        tabIndex={0}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setOpen(!open);
          }
        }}
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0.5,
          cursor: 'pointer',
          userSelect: 'none',
          color: accent,
          borderRadius: 1,
          '&:focus-visible': { outline: '2px solid currentColor', outlineOffset: 2 },
        }}
      >
        <ExpandMoreIcon
          fontSize="small"
          sx={{
            transition: 'transform 0.2s',
            transform: open ? 'rotate(0deg)' : 'rotate(-90deg)',
          }}
        />
        <Typography
          variant="subtitle2"
          component="span"
          sx={{
            fontWeight: 700,
            color: 'inherit',
            textTransform: 'uppercase',
            letterSpacing: 0.5,
          }}
        >
          {label}
        </Typography>
        <Typography variant="subtitle2" component="span" sx={{ color: 'text.secondary' }}>
          ({count})
        </Typography>
      </Box>
      <Collapse in={open} unmountOnExit>
        <Box sx={{ ...GRID_SX, mt: 1.5 }}>{children}</Box>
      </Collapse>
    </Box>
  );
}

/**
 * Étapes du tour guidé de l'écran MJ (PER-425) : navigation générale entre les tiroirs
 * principaux (bestiaire, aide-mémoire, historique, outils du MJ, fiche de personnage) et
 * le tracker d'initiative, plus les deux actions courantes de la barre (ajout de
 * créature, repos de groupe) — jamais le détail du contenu de chaque tiroir, hors
 * périmètre du ticket (voir aussi PER-426 pour la fiche personnage elle-même).
 *
 * Chaque cible ciblée ici est soit TOUJOURS présente dans le DOM une fois l'écran prêt
 * (boutons de la barre d'actions, tracker — jamais conditionnés au contenu de la
 * campagne), soit son étape est explicitement omise quand rien ne le justifie (`showPlayersStep`
 * — inutile d'expliquer un clic sur une carte de joueur qu'aucune campagne clairsemée
 * n'affiche). Ne JAMAIS cibler un élément qui disparaît selon un état éphémère (ex. bouton
 * « Réinitialiser le combat », visible seulement si des combattants sont en piste, ou
 * `BuffRequestsControl`, absent tant qu'aucune annonce de joueur n'attend) : le tour
 * casserait au premier passage sans ce contenu précis.
 */
/** Cible de l'étape « Fiches de personnage » — partagée avec `handleTourStepBefore` ci-dessous,
 * qui ramène la page tout en haut à cette étape (la première carte est juste sous la barre
 * d'actions collée : sans ce recentrage, `scrollToFirstStep` de react-joyride ne remonte que
 * jusqu'à ce qu'elle dépasse le bord — la carte reste coincée sous la barre). */
const GM_SCREEN_PLAYERS_STEP_TARGET = '[data-tour="gm-screen-players"]';

/** Cible de l'étape « Ordre d'initiative » — partagée avec `handleTourStepBefore`, qui force le
 * dépli du tracker s'il est réduit (`InitiativeTracker.forceExpandedForTour`) : le texte de
 * l'étape décrit les colonnes, invisibles en repli condensé. */
const GM_SCREEN_TRACKER_STEP_TARGET = '[data-tour="gm-screen-tracker"]';

/** Description de chaque onglet du tiroir « Outils du MJ », pour son étape dédiée du tour
 * (PER-425ter) — une étape par onglet, cf. `buildGmScreenTourSteps`. */
const GM_TOOL_TOUR_CONTENT: Record<GmToolId, string> = {
  rumors:
    'Une réserve de rumeurs propre à la campagne : piochez-en une au hasard pour improviser une scène, sans jamais retomber sur la même.',
  loot:
    'Une réserve de butin propre à la campagne : piochez un objet au hasard et attribuez-le d’un clic à l’inventaire d’un personnage.',
  npc:
    'Vos PNJ de campagne, regroupés en catégories repliables, triables et cherchables.',
  notes:
    'Des notes libres écrites pendant la partie en cours — toujours privées, MJ seul.',
};

/** Attend qu'un sélecteur apparaisse dans le DOM (poll par frame), pour le `before` de la
 * première étape d'onglet — cf. son commentaire : le tiroir vient de s'ouvrir (via `router`, donc
 * pas immédiat) et son premier `Tab` n'existe pas encore au moment de l'appel. */
function waitForElement(selector: string, timeoutMs = 4000): Promise<void> {
  return new Promise((resolve) => {
    const start = Date.now();
    const tick = () => {
      if (document.querySelector(selector) || Date.now() - start > timeoutMs) {
        resolve();
        return;
      }
      window.requestAnimationFrame(tick);
    };
    tick();
  });
}

function buildGmScreenTourSteps({
  showPlayersStep,
  openFirstToolsTab,
}: {
  showPlayersStep: boolean;
  /**
   * Ouvre le tiroir « Outils du MJ » sur son PREMIER onglet et attend que le `Tab` correspondant
   * existe réellement dans le DOM (PER-425ter) : posé en `before` (promesse NATIVEMENT attendue
   * par react-joyride, cf. le commentaire de `GuidedTour.onStepBefore`), pas en `onStepBefore` —
   * le tiroir est démonté quand fermé (`Drawer` sans `keepMounted`), donc son contenu n'existe
   * PAS encore quand cette étape se présente ; `onStepBefore` ne se déclenche qu'une fois la
   * cible déjà trouvée, ce qui ne serait jamais arrivé (constaté en recette : la résolution de
   * cible de react-joyride échoue avant même d'appeler `onStepBefore`, et la séquence tout
   * entière avortait). Les onglets SUIVANTS n'ont pas ce problème : une fois le tiroir ouvert,
   * ses 4 `Tab` existent tous en permanence (seul le PANNEAU actif change) — leur bascule reste
   * donc sur `handleTourStepBefore` (fire-and-forget), comme la fermeture en quittant la séquence.
   */
  openFirstToolsTab: () => Promise<void>;
}): Step[] {
  const steps: Step[] = [
    {
      target: '[data-tour="gm-screen-add-creature"]',
      title: 'Ajouter une créature',
      content:
        'Ajoute une créature du bestiaire, ou créée à la main, au combat en cours — alliée ou adverse, visible ou masquée aux joueurs.',
      placement: 'auto',
    },
    {
      target: '[data-tour="gm-screen-group-rest"]',
      title: 'Repos de groupe',
      content:
        'Propose une récupération rapide ou un repos long à toute la table. Chaque joueur répond depuis sa fiche : vous voyez le relevé se remplir, puis validez pour appliquer la récupération d’un coup. Nécessite une session de table en cours.',
      placement: 'auto',
    },
    {
      target: '[data-tour="gm-screen-bestiary"]',
      title: 'Bestiaire',
      content:
        'Ouvre le bestiaire dans un tiroir latéral, sans quitter l’écran de MJ : pratique pour consulter une créature en cours de combat.',
      placement: 'auto',
    },
    {
      target: '[data-tour="gm-screen-reference"]',
      title: 'Aide-mémoire',
      content:
        'Ouvre le référentiel de règles dans un tiroir latéral, pour vérifier une règle sans quitter l’écran.',
      placement: 'auto',
    },
    {
      target: '[data-tour="gm-screen-history"]',
      title: 'Historique des parties',
      content:
        'Ouvre l’historique des sessions closes de cette campagne dans un tiroir latéral — utile pour retrouver ce qui s’est passé lors d’une précédente séance.',
      placement: 'auto',
    },
    {
      target: '[data-tour="gm-screen-tools"]',
      title: 'Outils du MJ',
      content: 'Ouvre un tiroir à onglets rassemblant vos outils de session : rumeurs, butin, PNJ, notes de session.',
      placement: 'auto',
    },
    // Une étape par onglet (PER-425ter) : `handleTourStepBefore` ouvre le tiroir sur celui de la
    // PREMIÈRE de ces étapes et bascule d'onglet à chacune des suivantes — jamais ici, ce fichier ne
    // décrit QUE la séquence, pas l'ouverture (cf. le commentaire de `handleTourStepBefore`).
    ...GM_TOOLS_LIST.map((tool, index) => ({
      target: gmScreenToolsTabTourTarget(tool.id),
      title: tool.label,
      content: GM_TOOL_TOUR_CONTENT[tool.id],
      placement: 'auto' as const,
      ...(index === 0 ? { before: openFirstToolsTab } : {}),
    })),
  ];
  if (showPlayersStep) {
    steps.push({
      target: GM_SCREEN_PLAYERS_STEP_TARGET,
      title: 'Fiches de personnage',
      content:
        'Cliquez sur la carte d’un joueur pour ouvrir sa fiche complète dans un panneau latéral, sans quitter cet écran.',
      placement: 'auto',
      // `handleTourStepBefore` remonte la page tout en haut pour cette étape ; sans `skipScroll`,
      // react-joyride recalcule ENSUITE son propre scroll (aligner le spotlight), qui écrase notre
      // position et redescend la page jusqu'à la carte — l'exact défilement qu'on veut éviter.
      skipScroll: true,
    });
  }
  steps.push({
    target: GM_SCREEN_TRACKER_STEP_TARGET,
    title: 'Ordre d’initiative',
    content:
      'Le tracker liste tous les combattants classés par initiative : personnages, compagnons et créatures. Tour courant, manche et états de combat se pilotent ici.',
    placement: 'auto',
  });
  return steps;
}

export default function GmScreenPage({ params }: { params: Promise<{ cid: string }> }) {
  const { cid: cidParam } = use(params);
  // Résout le slug lisible (ou un lien historique) AVANT `useGmScreenCombat` — le VRAI id seul
  // alimente le canal temps réel/les stores en aval (cf. `slug.ts`) ; le reste du fichier continue
  // de lire `cid`, désormais toujours le vrai id une fois la campagne résolue.
  const { cid, href: campaignPath } = useResolvedCampaign(cidParam);
  const characterSlugIndex = useCharacterSlugIndex();
  const smUp = useMediaQuery((t: Theme) => t.breakpoints.up('sm'));
  const appHeaderHeight = smUp ? APP_HEADER_HEIGHT_SM_UP : APP_HEADER_HEIGHT_XS;
  // Fond + ombre de la barre d'actions collée : révélés seulement une fois RÉELLEMENT collée
  // (nouvel ajustement), pas dès le chargement de la page où elle est encore à sa place normale
  // dans le flux. Mesure DIRECTE de la position rendue (`getBoundingClientRect`), comme
  // `useUnstuckFromViewportBottom` de `SheetInitiativeBar` pour la bande collée en BAS — plus fiable
  // ici qu'une sentinelle + `IntersectionObserver` (rootMargin négatif) : `position: sticky` colle
  // l'élément à EXACTEMENT `top: appHeaderHeight`, donc comparer son `rect.top` mesuré à cette même
  // valeur dit directement s'il est encore à sa place naturelle ou déjà épinglé.
  const stickyActionsRef = useRef<HTMLDivElement>(null);
  const [actionsStuck, setActionsStuck] = useState(false);
  useEffect(() => {
    // Hystérésis (8px) : le seuil d'ENTRÉE dans le collé (`rect.top <= appHeaderHeight`) et celui de
    // SORTIE (`rect.top > appHeaderHeight + 8`) sont décalés, pas le même — sans cet écart, un
    // scroll qui oscille pile sur la frontière (molette imprécise, rebond tactile) fait clignoter
    // le fond au lieu de trancher une fois pour toutes.
    const HYSTERESIS_PX = 8;
    const measure = () => {
      const el = stickyActionsRef.current;
      if (!el) return;
      const top = el.getBoundingClientRect().top;
      setActionsStuck((prev) => (prev ? top <= appHeaderHeight + HYSTERESIS_PX : top <= appHeaderHeight));
    };
    measure();
    window.addEventListener('scroll', measure, { passive: true });
    window.addEventListener('resize', measure);
    return () => {
      window.removeEventListener('scroll', measure);
      window.removeEventListener('resize', measure);
    };
  }, [appHeaderHeight]);

  // Dernier onglet du tiroir « Outils du MJ » affiché — persisté (survit au rechargement)
  // ET remonté en direct par `GmToolsDrawerHost` à chaque changement d'onglet (survit aussi
  // à une simple fermeture/réouverture SANS rechargement, cf. `onActiveTabChange`). Sans ce
  // second point, ce bouton visait toujours `DEFAULT_GM_TOOL` après une fermeture.
  const [lastToolTab, setLastToolTab] = usePersistedState<GmToolId>(
    `gm-tools-last-tab:${cid}`,
    DEFAULT_GM_TOOL,
    (raw) => (isGmToolId(raw as string) ? (raw as GmToolId) : undefined),
  );

  // Combat en cours — logique partagée avec la fenêtre « présentation » (PER-248) :
  // état persisté par campagne (roster de créatures + PV + tour courant) et dérivation
  // des lignes du tracker. Le bouton « + Ajouter une créature » est laissé sur TOUTES
  // les campagnes (temporaire, cf. PER-236) : par défaut aucune créature.
  const {
    charactersHydrated,
    campaignsLoading,
    campaign,
    claimed,
    companionRoster,
    playerById,
    labeledCreatures,
    allies,
    enemies,
    initiativeRows,
    currentTurnKey,
    setCurrentTurnKey,
    roundNumber,
    setRoundNumber,
    addCreature,
    addCustomCreature,
    duplicateCreature,
    updateCreature,
    removeCreature,
    setCreatureVisibility,
    statuses,
    situationalEffectIds,
    posedSituationalIds,
    groupBuffIds,
    posedGroupBuffIds,
    applyStatus,
    removeStatus,
    applyStatusToMany,
    removeStatusFromMany,
    removeStatusesEverywhere,
    adjustStatus,
    adjustStatusDuration,
    resetCombat,
    restartRounds,
    actedKeys,
    setCombatantActed,
    manualOrder,
    pinnedOrderKeys,
    setManualPosition,
    toggleCombatantPin,
    resetCombatantOrder,
  } = useGmScreenCombat(cid, 'gm');

  // Tour guidé (PER-425) : les cibles (tiroirs + tracker) n'existent que sur l'écran final —
  // mêmes conditions que les deux `return` anticipés plus bas (chargement / campagne
  // introuvable). Désactivé sous mobile/tactile (`!smUp`), comme le tour pilote (PER-423).
  const router = useRouter();
  const pathname = usePathname();
  const tourReady = charactersHydrated && !campaignsLoading && !!campaign;
  const tour = useGuidedTour('gmScreen', { ready: tourReady, enabled: smUp });

  // Ouverture RÉELLE du tiroir « Outils du MJ » pendant SES étapes de tour (PER-425bis, étendu
  // PER-425ter à une étape par onglet) : react-joyride bloque par défaut le clic sur la cible
  // spotlightée (`spotlightClicks: false`), donc rien ne s'ouvrait jamais sans ça. La toute
  // PREMIÈRE étape d'onglet ouvre le tiroir sur cet onglet ; chacune des suivantes bascule
  // simplement l'onglet affiché (même mécanisme, `?tools=<id>`) ; la première étape qui n'est PAS
  // un onglet (fiches de personnage, ou directement le tracker si la campagne est clairsemée)
  // referme le tiroir. Le ref retient qu'on a ouvert NOUS-MÊMES (pas le MJ à la main avant de
  // lancer le tour), pour ne fermer que ce qu'on a ouvert en quittant la séquence d'onglets.
  const tourOpenedToolsRef = useRef(false);
  // `before` de la toute première étape d'onglet (cf. le commentaire de `buildGmScreenTourSteps`
  // sur `openFirstToolsTab`) : ouvre le tiroir puis ATTEND que son `Tab` existe, react-joyride
  // n'avançant vers l'étape qu'une fois cette promesse résolue.
  const openFirstToolsTab = useCallback(async () => {
    tourOpenedToolsRef.current = true;
    const firstTab = GM_TOOLS_LIST[0].id;
    router.replace(`${pathname}?${TOOLS_PARAM}=${firstTab}`, { scroll: false });
    await waitForElement(gmScreenToolsTabTourTarget(firstTab));
  }, [router, pathname]);
  // Dépli FORCÉ du tracker pendant son étape (PER-425ter), s'il était réduit — cf. le commentaire
  // de `InitiativeTracker.forceExpandedForTour`. Retombe à `false` dès qu'on quitte cette étape
  // (toute autre valeur de cible), donc y compris via « Précédent » ou la fin du tour.
  const [trackerForcedOpenForTour, setTrackerForcedOpenForTour] = useState(false);
  const handleTourStepBefore = useCallback(
    (step: Step) => {
      const target = typeof step.target === 'string' ? step.target : '';
      const isToolsTabStep = GM_TOOLS_LIST.some((tool) => gmScreenToolsTabTourTarget(tool.id) === target);
      if (isToolsTabStep) {
        const tab = GM_TOOLS_LIST.find((tool) => gmScreenToolsTabTourTarget(tool.id) === target)!.id;
        tourOpenedToolsRef.current = true;
        router.replace(`${pathname}?${TOOLS_PARAM}=${tab}`, { scroll: false });
      } else if (tourOpenedToolsRef.current) {
        tourOpenedToolsRef.current = false;
        router.replace(pathname, { scroll: false });
      }
      // Fiches de personnage (PER-425quater) : remonte tout en haut de l'écran — la première carte
      // suit immédiatement la barre d'actions collée, `scrollToFirstStep` seul ne recentrait pas
      // assez et la laissait coincée sous cette barre.
      if (target === GM_SCREEN_PLAYERS_STEP_TARGET) {
        window.scrollTo({ top: 0, behavior: 'auto' });
      }
      setTrackerForcedOpenForTour(target === GM_SCREEN_TRACKER_STEP_TARGET);
    },
    [router, pathname],
  );
  const handleTourEnd = useCallback(() => {
    if (tourOpenedToolsRef.current) {
      tourOpenedToolsRef.current = false;
      router.replace(pathname, { scroll: false });
    }
    setTrackerForcedOpenForTour(false);
    tour.onTourEnd();
  }, [router, pathname, tour]);

  // Tant que le nom de campagne n'est pas résolu, ou introuvable : pas de fil d'Ariane ni
  // de voyant de session (le sous-header reste masqué) — seul le chrome statique persiste.
  useHeaderContent(
    !charactersHydrated || campaignsLoading || !campaign
      ? {}
      : {
          breadcrumbs: [
            { label: campaign.name, href: campaignPath },
            { label: 'Écran de MJ' },
          ],
          // Cycle de vie de la session synchronisée (PER-264), compacté dans l'en-tête
          // (comme le voyant de la fiche, PER-269) : démarrer/terminer + état « session
          // en cours ». C'est le gate du temps réel (PER-265+ s'y accrochent).
          sessionIndicator: <GmSessionHeaderIndicator campaignId={cid} />,
          // Icône d'aide permanente (PER-425) : relance le tour guidé de navigation de l'écran
          // de MJ à tout moment, même déjà vu/passé. Dans le fil d'Ariane (action de page),
          // pas la barre d'actions collée — demande du propriétaire, pour ne pas la faire
          // défiler avec le reste des actions. Absente sous mobile/tactile (tour désactivé).
          action: tour.helpVisible && (
            <Tooltip title="Revoir le tutoriel" disableInteractive>
              <span>
                <IconButton
                  aria-label="Revoir le tutoriel"
                  onClick={tour.replay}
                  disabled={!tourReady}
                  size="small"
                >
                  <HelpOutlineIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          ),
        },
  );

  // Modale de créature, partagée entre l'ajout et l'édition : `creatureDialogOpen` pilote son
  // ouverture, `editingId` dit LAQUELLE on modifie (`null` = ajout d'une nouvelle créature).
  const [creatureDialogOpen, setCreatureDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  // Instance en cours d'édition, projetée dans la forme attendue par la modale. Le camp absent
  // vaut adversaire et la visibilité absente vaut « visible » — mêmes valeurs par défaut que
  // partout ailleurs sur le roster (migration douce des instances antérieures).
  const editingInstance = editingId ? labeledCreatures.find((inst) => inst.id === editingId) : undefined;
  const editingCreature = editingInstance
    ? {
        id: editingInstance.id,
        slug: editingInstance.slug,
        custom: editingInstance.custom,
        name: editingInstance.name,
        side: editingInstance.side ?? ('enemy' as const),
        visible: editingInstance.visible !== false,
      }
    : null;
  const openAddCreature = () => {
    setEditingId(null);
    setCreatureDialogOpen(true);
  };
  const openEditCreature = (instanceId: string) => {
    setEditingId(instanceId);
    setCreatureDialogOpen(true);
  };
  // Repos de groupe (PER-312) : la proposition part sur le canal de session, donc rien à proposer
  // hors session. Observateur SANS battement — le battement de l'écran de MJ est porté par le
  // `GmSessionHeaderIndicator` de l'en-tête (un seul par page), comme sur la fiche.
  const { isActive: sessionActive } = useActiveSession(cid);
  // Les personnages réclamés, avec le joueur qui les incarne (nom pour le relevé, id pour savoir
  // qui est connecté : seuls les joueurs présents sur le canal sont convoqués, cf. PER-313).
  const restTableCharacters = useMemo(
    () =>
      claimed.map((c) => ({
        id: c.id,
        name: c.name,
        playerName: c.playerId ? playerById.get(c.playerId)?.name : undefined,
        playerId: c.playerId ?? undefined,
      })),
    [claimed, playerById],
  );
  // Réinitialisation du combat (PER-283) : action destructive → confirmation avant purge.
  const [resetOpen, setResetOpen] = useState(false);
  // Rien à réinitialiser tant qu'aucun combattant n'est en piste (bouton masqué).
  const hasCombatants = claimed.length > 0 || labeledCreatures.length > 0;

  // FENÊTRE DE POSE d'un buff de groupe (PER-104) : `carrierKey` est le PORTEUR de la capacité qui
  // confère ce buff — pas forcément le combattant sur lequel la puce a été déposée (PER-361). Un
  // buff conféré par une capacité personnelle (Argument de taille du barbare, Chant des héros du
  // barde) a un lanceur FIXE, quelle que soit la carte visée par le dépôt : celui qui possède la
  // capacité. Il donne le CAMP à proposer et le PALIER par défaut.
  const [groupBuffPose, setGroupBuffPose] = useState<{
    buffId: BeneficialEffectId;
    carrierKey: string;
  } | null>(null);
  // Résout le VRAI porteur parmi les personnages réclamés (seuls porteurs possibles, cf. `groupBuffIntensity`
  // ci-dessous) : celui dont les capacités confèrent `buffId`. Repli sur la carte visée par le dépôt si
  // personne ne le porte (ne devrait pas arriver — la palette ne propose ce buff que si un porteur existe).
  const resolveGroupBuffCarrierKey = useCallback(
    (droppedKey: string, buffId: BeneficialEffectId): string => {
      const featureId = groupBuffFeatureId(buffId);
      const holder = featureId ? claimed.find((c) => c.featureIds.includes(featureId)) : undefined;
      return holder?.id ?? droppedKey;
    },
    [claimed],
  );
  const openGroupBuff = useCallback(
    (droppedKey: string, buffId: BeneficialEffectId) => {
      setGroupBuffPose({ buffId, carrierKey: resolveGroupBuffCarrierKey(droppedKey, buffId) });
    },
    [resolveGroupBuffCarrierKey],
  );

  // Glisser-déposer des états (PER-279) : les puces de la palette (`useDraggable`, id préfixé) sont
  // déposées sur les colonnes du tracker (`useDroppable`, id = clé de combattant). Le capteur pointeur
  // couvre souris + tactile (l'écran de MJ peut être sur tablette) ; une distance d'activation évite de
  // déclencher un glisser sur un simple clic. `activeStatus` alimente la surcouche qui suit le curseur.
  const [activeStatus, setActiveStatus] = useState<AnyStatusEffectId | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );
  // Aperçu EN DIRECT du glisser d'une poignée de réordonnancement (PER-436) : feedback visuel
  // (espace ouvert + barre lumineuse sur la carte survolée) demandé par le propriétaire — sans lui,
  // rien ne distinguait un glisser en cours de l'état au repos. Purement transitoire, jamais persisté.
  const [dragPreview, setDragPreview] = useState<ReorderDragPreview | null>(null);
  const onDragStart = (event: DragStartEvent) => {
    const id = event.active.data.current?.statusId as AnyStatusEffectId | undefined;
    setActiveStatus(id ?? null);
    const reorderKey = event.active.data.current?.reorderKey as string | undefined;
    setDragPreview(reorderKey ? { activeKey: reorderKey, overKey: null } : null);
  };
  const onDragOver = (event: DragOverEvent) => {
    const reorderKey = event.active.data.current?.reorderKey as string | undefined;
    if (!reorderKey) return;
    const overKey = event.over?.id;
    setDragPreview({
      activeKey: reorderKey,
      overKey: typeof overKey === 'string' && overKey !== reorderKey ? overKey : null,
    });
  };
  const onDragEnd = (event: DragEndEvent) => {
    setActiveStatus(null);
    setDragPreview(null);
    const statusId = event.active.data.current?.statusId as AnyStatusEffectId | undefined;
    if (statusId) {
      const combatantKey = event.over?.id;
      if (typeof combatantKey !== 'string') return;
      // Un buff visant le CAMP (PER-104, élargi PER-359) ne se pose pas sur la seule carte visée : sa
      // règle vise « ses alliés et lui », ou « un allié » qui n'est pas forcément celui-là. Le PORTEUR
      // (camp + palier pré-rempli) est le personnage dont la capacité confère ce buff (PER-361) — pas
      // forcément la carte visée par le dépôt, que `openGroupBuff` n'utilise qu'en repli.
      if (isCampScopedStatus(statusId)) openGroupBuff(combatantKey, statusId as BeneficialEffectId);
      else applyStatus(combatantKey, statusId);
      return;
    }
    // Réordonnancement libre (PER-436) : la poignée d'une carte glissée sur une AUTRE carte — déjà
    // zone de drop pour les puces d'état, réutilisée telle quelle — pose la carte visée comme
    // ANCRE (le combattant glissé est réinséré juste avant elle, cf. `applyManualOrder`).
    const reorderKey = event.active.data.current?.reorderKey as string | undefined;
    const beforeKey = event.over?.id;
    if (reorderKey && typeof beforeKey === 'string' && beforeKey !== reorderKey) {
      setManualPosition(reorderKey, beforeKey);
    }
  };

  // Camp du porteur : un personnage réclamé est toujours du côté des joueurs ; une créature suit son
  // propre camp (absent = adversaire, migration douce). Un MJ peut ainsi bénir une escouade adverse.
  const carrierSide: CreatureSide = groupBuffPose
    ? (labeledCreatures.find((inst) => inst.id === groupBuffPose.carrierKey)?.side ?? 'ally') ===
      'enemy'
      ? 'enemy'
      : 'ally'
    : 'ally';
  // Combattants proposés : le camp du porteur, dans l'ordre du tracker (personnages réclamés puis
  // créatures du camp). Côté adverse, il n'y a que des créatures.
  const groupBuffCandidates = useMemo<GroupBuffCandidate[]>(() => {
    if (!groupBuffPose) return [];
    const mark = (key: string, label: string): GroupBuffCandidate => ({
      key,
      label,
      ...(key === groupBuffPose.carrierKey ? { carrier: true } : {}),
    });
    const creatures = carrierSide === 'ally' ? allies : enemies;
    return [
      ...(carrierSide === 'ally' ? claimed.map((c) => mark(c.id, c.name)) : []),
      ...creatures.map((inst) => mark(inst.id, inst.label)),
    ];
  }, [groupBuffPose, carrierSide, claimed, allies, enemies]);
  // Palier pré-rempli : lu là où le CATALOGUE dit de le lire (PER-359) — rang du porteur dans sa
  // voie, niveau du personnage, ou l'une de ses caractéristiques. D'où le passage du porteur entier
  // et non de ses seules capacités. Une créature alliée ou un personnage qui ne porte pas la
  // capacité retombe sur +1.
  const groupBuffIntensity = (() => {
    if (!groupBuffPose) return 1;
    const carrier = claimed.find((c) => c.id === groupBuffPose.carrierKey);
    return groupBuffIntensityFor(carrier?.featureIds ?? [], groupBuffPose.buffId, {
      ...(carrier?.abilities ? { abilities: carrier.abilities } : {}),
      ...(carrier?.level !== undefined ? { level: carrier.level } : {}),
    });
  })();
  // AUTEUR de la pose, figé en clair au moment d'appliquer : la fiche du buffé ne pourrait pas résoudre
  // une clé de combattant (elle ne connaît ni les autres personnages de la table ni les joueurs).
  //
  // C'est le nom du JOUEUR, et RIEN D'AUTRE : ni son personnage, ni « Personnage (Joueur) ». La
  // capacité est déjà nommée par sa puce juste à côté, et à la table on dit « c'est Mirielle qui
  // chante ». Aucun repli sur le nom du personnage ni sur celui d'une créature porteuse : sans joueur
  // identifié, on préfère AUCUNE mention de source à une mention trompeuse.
  const groupBuffCastBy = useMemo(() => {
    if (!groupBuffPose) return undefined;
    const carrier = claimed.find((c) => c.id === groupBuffPose.carrierKey);
    return carrier?.playerId ? playerById.get(carrier.playerId)?.name : undefined;
  }, [groupBuffPose, claimed, playerById]);
  // Membres du camp qui portent DÉJÀ ce buff → active la levée collective (« Lever sur tout le camp »).
  const groupBuffPosedKeys = groupBuffPose
    ? groupBuffCandidates
        .map((c) => c.key)
        .filter((key) => (statuses[key] ?? []).some((s) => s.id === groupBuffPose.buffId))
    : [];

  if (!charactersHydrated || campaignsLoading) {
    // Nom de campagne pas encore résolu (donc pas d'en-tête) : on préfigure la
    // grille d'aperçus dans la même zone de contenu via des cartes fantômes.
    return (
      <>
        <HomeBackground />
        {/* Pleine largeur (hors container) avec padding symétrique — voir le rendu final. */}
        <Box sx={{ p: { xs: 2, sm: 4 } }}>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: 'minmax(0, 1fr)',
                sm: 'repeat(2, minmax(0, 1fr))',
                lg: 'repeat(3, minmax(0, 1fr))',
              },
              gap: 2,
              alignItems: 'start',
            }}
            aria-hidden
          >
            {Array.from({ length: 3 }, (_, i) => (
              <Paper
                key={i}
                sx={{
                  p: 2,
                  bgcolor: 'rgba(20, 20, 23, 0.72)',
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: 3,
                }}
              >
                <Stack spacing={1.5}>
                  {/* Badge joueur (pastille). */}
                  <Skeleton animation="wave" variant="rounded" width={96} height={24} />
                  <CharacterPreviewCardSkeleton />
                </Stack>
              </Paper>
            ))}
          </Box>
        </Box>
      </>
    );
  }

  if (!campaign) {
    return (
      <Container maxWidth="sm" sx={{ py: 8, textAlign: 'center' }}>
        <title>Campagne introuvable — Éditeur de personnage CO2</title>
        <Typography variant="h6" gutterBottom>
          Campagne introuvable
        </Typography>
        <Button startIcon={<ArrowBackIcon />} component={Link} href="/campaigns">
          Retour aux campagnes
        </Button>
      </Container>
    );
  }

  return (
    <>
      <title>{`Écran de MJ — ${campaign.name} — Éditeur de personnage CO2`}</title>
      <HomeBackground />

      {/* Volontairement HORS du `Container` habituel du site : l'écran de MJ occupe
          toute la largeur pour afficher un maximum de cartes de front. Padding
          symétrique (gauche/droite = haut/bas) pour laisser respirer les bords — SAUF en bas
          (`pb: 0`), où la bande d'initiative sticky-bottom vient coller directement contre le
          pied de page (voir `FLUSH_FOOTER_ROUTES` dans `AppFooter`, qui annule sa marge sur
          cette route en retour). */}
      <Box sx={{ px: { xs: 2, sm: 4 }, pt: { xs: 2, sm: 4 }, pb: 0 }}>
        {/* Barre d'actions (PER-236, PER-247), laissée sur toutes les campagnes : ajout de
            créature, réinitialisation du combat et accès aux Outils du MJ, toutes sur une
            même ligne. Style verre teinté : bleu pour les actions principales, rouge pour
            l'action destructive, plus lisible sur le fond illustré que le simple
            `outlined`/`text` d'origine.

            COLLÉE sous l'en-tête global pendant tout le défilement (nouvelle demande) : sur un
            écran de MJ chargé (trois grilles + bande d'initiative), ces actions restaient sinon
            hors champ dès qu'on descendait consulter une carte. Négative-margin + padding
            identiques annulent le padding du conteneur parent pour que le fond de la barre
            morde jusqu'aux bords du viewport, comme la bande d'initiative collée en bas.

            Fond/flou/bordure/ombre n'apparaissent qu'une fois COLLÉE (`actionsStuck`) — tant
            qu'elle est encore à sa place normale en haut de page, elle reste NUE. Portés par un
            CALQUE séparé (`position: absolute`, sous le contenu) dont on transitionne la seule
            OPACITÉ plutôt que `background-color`/`backdrop-filter`/`box-shadow` directement : ces
            propriétés s'animent mal ou pas du tout selon les navigateurs (le flou en particulier
            saute plutôt que de s'estomper), l'opacité, elle, fond toujours en douceur. */}
        <Box
          ref={stickyActionsRef}
          sx={{
            position: 'sticky',
            top: appHeaderHeight,
            zIndex: STICKY_ACTIONS_Z_INDEX,
            // Marge négative HAUTE en plus de l'horizontale : annule aussi le `pt` du conteneur
            // parent, pour que la barre soit COLLÉE à l'en-tête dès sa position normale (avant même
            // tout défilement) — sans cet écart initial, le passage en collé la faisait « sauter »
            // de sa place aérée vers l'en-tête, un mouvement plus étrange qu'un simple repli.
            mx: { xs: -2, sm: -4 },
            mt: { xs: -2, sm: -4 },
            px: { xs: 2, sm: 4 },
            py: 1,
            mb: 2,
          }}
        >
          <Box
            aria-hidden
            sx={{
              position: 'absolute',
              inset: 0,
              zIndex: 0,
              opacity: actionsStuck ? 1 : 0,
              transition: 'opacity 0.12s ease',
              bgcolor: 'rgba(16, 16, 19, 0.88)',
              backdropFilter: 'blur(14px)',
              WebkitBackdropFilter: 'blur(14px)',
              borderBottom: '1px solid rgba(255, 255, 255, 0.12)',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
            }}
          />
        <Stack
          direction="row"
          spacing={1}
          sx={{ position: 'relative', zIndex: 1, width: '100%', flexWrap: 'wrap', rowGap: 1 }}
        >
          <Button
            data-tour="gm-screen-add-creature"
            variant="outlined"
            size="small"
            startIcon={<AddIcon />}
            onClick={openAddCreature}
            sx={(theme) => glassButtonSx(theme, 'info')}
          >
            Ajouter une créature
          </Button>
          {/* Repos de groupe (PER-312) : propose une récupération à toute la table sur le canal
              de session, et tient le relevé des réponses. Inerte hors session. */}
          <GroupRestControl
            campaignId={cid}
            tableCharacters={restTableCharacters}
            sessionActive={sessionActive}
            buttonSx={(theme) => glassButtonSx(theme, 'info')}
            dataTour="gm-screen-group-rest"
          />
          {/* Effets de groupe annoncés par les joueurs (PER-358) : le barde annonce depuis sa fiche,
              le MJ pose. Adopter ouvre la fenêtre de pose habituelle au nom du lanceur — d'où le
              passage par `openGroupBuff`, qui résout le porteur exactement comme un dépôt de puce.
              Le bouton n'existe que si une annonce attend. */}
          <BuffRequestsControl
            campaignId={cid}
            onAdopt={(request) => openGroupBuff(request.characterId, request.buffId)}
            buttonSx={(theme) => glassButtonSx(theme, 'info')}
          />
          {/* Espaceur : consomme toute la largeur restante pour pousser « Outils du MJ » à
              l'extrême droite. Un simple `ml: 'auto'` sur le bouton perd face à la marge que
              `Stack`/`spacing` applique déjà entre ses enfants (même spécificité CSS, la règle
              de `Stack` gagne). */}
          <Box sx={{ flexGrow: 1 }} />
          {/* Bestiaire : ouvre le tiroir latéral intégrant le navigateur du bestiaire (`/bestiary`)
              sans quitter l'écran de MJ. Vraie ancre (`?bestiary=1`) → Ctrl/⌘+Clic ouvre dans un
              nouvel onglet, le bouton Retour ferme le tiroir. Même patron que le tiroir « Aide-mémoire ». */}
          <Button
            data-tour="gm-screen-bestiary"
            variant="outlined"
            size="small"
            startIcon={<PetsOutlinedIcon />}
            component={Link}
            href={`${campaignPath}/gm-screen?${BESTIARY_PARAM}=1`}
            scroll={false}
            sx={(theme) => glassButtonSx(theme, 'info')}
          >
            Bestiaire
          </Button>
          {/* Aide-mémoire : ouvre le tiroir latéral intégrant le référentiel de règles (`/reference`)
              sans quitter l'écran de MJ. Vraie ancre (`?reference=1`) → Ctrl/⌘+Clic ouvre dans un
              nouvel onglet, le bouton Retour ferme le tiroir. */}
          <Button
            data-tour="gm-screen-reference"
            variant="outlined"
            size="small"
            startIcon={<MenuBookOutlinedIcon />}
            component={Link}
            href={`${campaignPath}/gm-screen?${REFERENCE_PARAM}=1`}
            scroll={false}
            sx={(theme) => glassButtonSx(theme, 'info')}
          >
            Aide-mémoire
          </Button>
          {/* Historique des parties : ouvre le tiroir latéral intégrant l'historique des sessions
              closes (`SessionHistoryList`, PER-270/407) sans quitter l'écran de MJ. Vraie ancre
              (`?history=1`) → Ctrl/⌘+Clic ouvre dans un nouvel onglet, le bouton Retour ferme le
              tiroir. Même patron que les tiroirs Bestiaire/Aide-mémoire. */}
          <Button
            data-tour="gm-screen-history"
            variant="outlined"
            size="small"
            startIcon={<HistoryIcon />}
            component={Link}
            href={`${campaignPath}/gm-screen?${HISTORY_PARAM}=1`}
            scroll={false}
            sx={(theme) => glassButtonSx(theme, 'info')}
          >
            Historique
          </Button>
          {/* Outils du MJ (PER-199, PER-200) : ouvre le tiroir latéral à onglets (rumeurs de
              taverne, butin, et d'autres outils à venir). Vraie ancre (`?tools=`) → Ctrl/⌘+Clic
              ouvre dans un nouvel onglet, le bouton Retour ferme le tiroir. */}
          <Button
            data-tour="gm-screen-tools"
            variant="outlined"
            size="small"
            startIcon={<HandymanIcon />}
            component={Link}
            href={`${campaignPath}/gm-screen?${TOOLS_PARAM}=${lastToolTab}`}
            scroll={false}
            sx={(theme) => glassButtonSx(theme, 'info')}
          >
            Outils du MJ
          </Button>
        </Stack>
        </Box>
        {claimed.length === 0 && labeledCreatures.length === 0 ? (
          <Paper
            variant="outlined"
            sx={{
              p: { xs: 3, sm: 6 },
              textAlign: 'center',
              bgcolor: 'rgba(30, 30, 34, 0.55)',
              backdropFilter: 'blur(6px)',
              WebkitBackdropFilter: 'blur(6px)',
              borderColor: 'rgba(255, 255, 255, 0.10)',
            }}
          >
            <Typography variant="h6" sx={{ mb: 1 }}>
              Aucun personnage réclamé
            </Typography>
            <Typography color="text.secondary">
              Les aperçus des personnages que vos joueurs auront réclamés apparaîtront ici.
            </Typography>
          </Paper>
        ) : (
          // Trois grilles distinctes (PER-249) : joueurs, puis alliés (si présents), puis
          // adversaires (si présents). Chacune reprend le même gabarit de colonnes et se
          // replie indépendamment, l'état étant retenu d'une session à l'autre.
          <Stack spacing={{ xs: 3, sm: 4 }}>
            {claimed.length > 0 && (
              <CollapsibleSection
                label="Joueurs"
                storageKey={storageKeys.campaign.gmScreenPlayersOpen}
                count={claimed.length}
              >
                {claimed.map((character, index) => (
                  <GmScreenCard
                    key={character.id}
                    character={character}
                    player={character.playerId ? playerById.get(character.playerId) ?? null : null}
                    href={hrefFromIndex('/character', characterSlugIndex, character.id)}
                    panelHref={`${campaignPath}/gm-screen?sheet=${character.id}`}
                    // Cible du tour guidé (PER-425), posée sur la PREMIÈRE carte (jamais sur
                    // l'en-tête replié ni sur toute la grille) : le contenu de l'étape parle de
                    // « cliquer sur la carte d'un joueur », donc la mise en lumière doit tomber sur
                    // une vraie carte, pas sur le libellé de section au-dessus.
                    dataTour={index === 0 ? 'gm-screen-players' : undefined}
                  />
                ))}
              </CollapsibleSection>
            )}
            {companionRoster.length > 0 && (
              <CollapsibleSection
                label="Compagnons"
                storageKey={storageKeys.campaign.gmScreenCompanionsOpen}
                count={companionRoster.length}
              >
                {companionRoster.map((roster) => (
                  <GmScreenCompanionCard
                    key={roster.key}
                    ownerName={roster.character.name}
                    accentColor={roster.accentColor}
                    entry={roster.entry}
                    abilities={roster.abilities}
                    level={roster.character.level}
                    masterDerived={roster.masterDerived}
                    depletion={roster.depletion}
                    onDelete={roster.onDelete}
                    mounted={roster.mounted}
                    onSetMounted={roster.onSetMounted}
                  />
                ))}
              </CollapsibleSection>
            )}
            {allies.length > 0 && (
              <CollapsibleSection
                label="Alliés"
                color={SIDE_ACCENT.ally}
                storageKey={storageKeys.campaign.gmScreenAlliesOpen}
                count={allies.length}
              >
                {allies.map((inst) => (
                  <GmScreenCreatureCard
                    key={inst.id}
                    slug={inst.slug}
                    blob={creatureCardBlob(inst)}
                    label={inst.label}
                    side="ally"
                    visible={inst.visible !== false}
                    onToggleVisible={() => setCreatureVisibility(inst.id, inst.visible === false)}
                    onDuplicate={() => duplicateCreature(inst.id)}
                    onEdit={() => openEditCreature(inst.id)}
                    onRemove={() => removeCreature(inst.id)}
                  />
                ))}
              </CollapsibleSection>
            )}
            {enemies.length > 0 && (
              <CollapsibleSection
                label="Adversaires"
                color={SIDE_ACCENT.enemy}
                storageKey={storageKeys.campaign.gmScreenEnemiesOpen}
                count={enemies.length}
              >
                {enemies.map((inst) => (
                  <GmScreenCreatureCard
                    key={inst.id}
                    slug={inst.slug}
                    blob={creatureCardBlob(inst)}
                    label={inst.label}
                    side="enemy"
                    visible={inst.visible !== false}
                    onToggleVisible={() => setCreatureVisibility(inst.id, inst.visible === false)}
                    onDuplicate={() => duplicateCreature(inst.id)}
                    onEdit={() => openEditCreature(inst.id)}
                    onRemove={() => removeCreature(inst.id)}
                  />
                ))}
              </CollapsibleSection>
            )}
          </Stack>
        )}

        {/* Séparateur horizontal, puis tracker d'initiative (PER-236) : personnages
            reliés à un joueur + bandits, en colonnes classées par initiative. */}
        <Divider sx={{ my: { xs: 3, sm: 4 } }} />
        {/* États de combat (PER-279) : la palette de puces glissables ET le tracker (dont les colonnes
            sont zones de drop) partagent un même `DndContext`. `pointerWithin` cible la colonne SOUS le
            pointeur (plus juste que la superposition de rectangles pour des zones larges côte à côte).
            Depuis PER-301 la palette est RENDUE PAR le tracker (`statusPalette`), pour vivre dans la
            barre collée en bas d'écran : posée ici dans le flux, elle sortait de l'écran au premier
            défilement et le glisser-déposer perdait sa source. */}
        <DndContext
          sensors={sensors}
          collisionDetection={pointerWithin}
          // Auto-défilement de la PAGE pendant le glisser : COUPÉ (PER-301). Il est incompatible avec
          // une bande COLLANTE — `@dnd-kit` corrige la position des zones de drop du défilement écoulé,
          // en supposant qu'elles défilent avec la page ; les cartes d'une barre collée, elles, ne
          // bougent pas d'un pixel. La cible dérivait donc de tout le défilement déclenché en
          // approchant du bas de l'écran (~200 px mesurés) et le dépôt tombait à côté. Rien n'est perdu
          // à le couper : la barre est visible en permanence, il n'y a plus rien à faire venir à
          // l'écran, et la bande se parcourt à l'horizontale (chevrons, barre de défilement).
          autoScroll={{ enabled: false }}
          onDragStart={onDragStart}
          onDragOver={onDragOver}
          onDragEnd={onDragEnd}
          onDragCancel={() => {
            setActiveStatus(null);
            setDragPreview(null);
          }}
        >
          <InitiativeTracker
            dataTour="gm-screen-tracker"
            forceExpandedForTour={trackerForcedOpenForTour}
            rows={initiativeRows}
            currentTurnKey={currentTurnKey}
            onCurrentTurnKeyChange={setCurrentTurnKey}
            roundNumber={roundNumber}
            onRoundNumberChange={setRoundNumber}
            onRestartRounds={restartRounds}
            resetCombatAction={
              hasCombatants && (
                <CollapsibleLabelButton
                  variant="outlined"
                  size="small"
                  icon={<RestartAltIcon />}
                  label="Réinitialiser le combat"
                  onClick={() => setResetOpen(true)}
                  sx={(theme) => glassButtonSx(theme, 'error')}
                />
              )
            }
            headerAction={
              <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', rowGap: 1 }}>
                <OpenTrackerWindowButton cid={cid} />
                <ProjectionLinkControl campaignId={cid} />
              </Stack>
            }
            statusControls={{
              statusesByKey: statuses,
              situationalIds: situationalEffectIds,
              groupBuffIds,
              onApply: applyStatus,
              onRemove: removeStatus,
              onOpenGroupBuff: openGroupBuff,
              onAdjust: adjustStatus,
              onAdjustDuration: adjustStatusDuration,
            }}
            orderControls={{
              actedKeys,
              onSetActed: setCombatantActed,
              manualOrder,
              pinnedKeys: pinnedOrderKeys,
              onTogglePin: toggleCombatantPin,
              onResetOrder: resetCombatantOrder,
            }}
            dragPreview={dragPreview}
            statusPalette={
              <CombatStatusPalette
                situationalIds={situationalEffectIds}
                posedSituationalIds={posedSituationalIds}
                onClearSituational={(id) => removeStatusesEverywhere([id])}
                groupBuffIds={groupBuffIds}
                posedGroupBuffIds={posedGroupBuffIds}
                onClearGroupBuff={(id) => removeStatusesEverywhere([id])}
              />
            }
            stickyBottom
          />
          {/* Surcouche : la puce « réelle » suit le curseur pendant le glissement (l'originale s'estompe). */}
          <DragOverlay>
            {activeStatus ? <StatusChipVisual id={activeStatus} withTooltip={false} dragging /> : null}
          </DragOverlay>
        </DndContext>
      </Box>

      {/* Pose d'un buff de groupe (PER-104) : le camp du porteur, tous cochés par défaut, palier
          pré-rempli et durée libre. Un seul « Appliquer » ⇒ une seule écriture + une seule diffusion. */}
      <GroupBuffDialog
        open={groupBuffPose !== null}
        onClose={() => setGroupBuffPose(null)}
        buffId={groupBuffPose?.buffId ?? null}
        candidates={groupBuffCandidates}
        intensity={groupBuffIntensity}
        onApply={(keys, options) =>
          groupBuffPose &&
          applyStatusToMany(keys, groupBuffPose.buffId, {
            ...options,
            ...(groupBuffCastBy ? { castBy: groupBuffCastBy } : {}),
          })
        }
        posedKeys={groupBuffPosedKeys}
        onRemoveAll={(keys) => groupBuffPose && removeStatusFromMany(keys, groupBuffPose.buffId)}
      />

      {/* Modale d'ajout d'une créature au combat : du bestiaire (sélecteur + aperçu) ou
          créée à la main (bloc minimal saisi par le MJ). */}
      <AddCreatureDialog
        open={creatureDialogOpen}
        onClose={() => setCreatureDialogOpen(false)}
        // L'instance éditée n'est lâchée qu'une fois le fondu de fermeture terminé : la lâcher
        // dès `onClose` rebasculerait la modale en mode « ajout » sous les yeux du MJ.
        onExited={() => setEditingId(null)}
        onAdd={(slug, options) => addCreature(slug, options)}
        onAddCustom={(custom, options) => addCustomCreature(custom, options)}
        editing={editingCreature}
        onSave={(instanceId, patch) => updateCreature(instanceId, patch)}
      />

      {/* Réinitialisation du combat (PER-283) : purge les états, remet le tour courant à zéro
          et restaure les PV des créatures. Conserve le roster de créatures et ne touche PAS aux
          PV des joueurs (portés par leur fiche). Confirmation obligatoire (action destructive). */}
      <Dialog open={resetOpen} onClose={() => setResetOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Réinitialiser le combat ?</DialogTitle>
        <DialogContent>
          <DialogContentText component="div">
            Cette action va&nbsp;:
            <ul style={{ margin: '8px 0', paddingLeft: 20 }}>
              <li>retirer tous les états de tous les combattants&nbsp;;</li>
              <li>remettre le tour courant à zéro&nbsp;;</li>
              <li>restaurer les points de vie des créatures.</li>
            </ul>
            Les créatures restent en piste et les points de vie des personnages joueurs ne sont
            pas modifiés. Cette action est <strong>irréversible</strong>.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResetOpen(false)}>Annuler</Button>
          <Button
            color="error"
            variant="contained"
            startIcon={<RestartAltIcon />}
            onClick={() => {
              resetCombat();
              setResetOpen(false);
            }}
          >
            Réinitialiser
          </Button>
        </DialogActions>
      </Dialog>

      {/* Panneau latéral de fiche (PER-258), piloté par `?sheet=<id>`. La frontière
          Suspense est imposée par la lecture des paramètres d'URL (useSearchParams) et
          la cantonne à ce sous-arbre : l'état du combat en cours, qui vit au-dessus,
          n'est jamais remonté. Le panneau ne rappelle PAS `useGmScreenCombat` — il
          reçoit en props ce dont il a besoin, pour ne pas dupliquer cet état. */}
      <Suspense>
        <GmSheetDrawerHost
          characters={claimed}
          campaign={campaign}
          playerById={playerById}
        />
      </Suspense>

      {/* Tiroir « Outils du MJ » (PER-199), piloté par `?tools=`. Frontière `Suspense`
          imposée par la lecture des paramètres d'URL, comme le tiroir de fiche. */}
      <Suspense>
        <GmToolsDrawerHost campaign={campaign} onActiveTabChange={setLastToolTab} />
      </Suspense>

      {/* Tiroir « Aide-mémoire », piloté par `?reference=1`. Même contrainte de frontière `Suspense`
          (lecture des paramètres d'URL) que les autres tiroirs de l'écran de MJ. */}
      <Suspense>
        <GmReferenceDrawerHost />
      </Suspense>

      {/* Tiroir « Bestiaire », piloté par `?bestiary=1`. Même contrainte de frontière `Suspense`
          (lecture des paramètres d'URL) que les autres tiroirs de l'écran de MJ. */}
      <Suspense>
        <GmBestiaryDrawerHost />
      </Suspense>

      {/* Tiroir « Historique des parties », piloté par `?history=1`. Même contrainte de frontière
          `Suspense` (lecture des paramètres d'URL) que les autres tiroirs de l'écran de MJ. */}
      <Suspense>
        <GmHistoryDrawerHost campaignId={cid} />
      </Suspense>

      {/* Tour guidé de navigation (PER-425) : tiroirs principaux + tracker d'initiative. */}
      <GuidedTour
        run={tour.run}
        steps={buildGmScreenTourSteps({ showPlayersStep: claimed.length > 0, openFirstToolsTab })}
        onTourEnd={handleTourEnd}
        onStepBefore={handleTourStepBefore}
      />
    </>
  );
}
