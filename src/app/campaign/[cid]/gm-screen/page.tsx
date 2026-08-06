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
import { Suspense, use, useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  pointerWithin,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import AddIcon from '@mui/icons-material/Add';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import HandymanIcon from '@mui/icons-material/Handyman';
import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined';
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
import Paper from '@mui/material/Paper';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha, type Theme } from '@mui/material/styles';
import { AppHeader } from '@/components/AppHeader';
import { CharacterPreviewCardSkeleton } from '@/components/CharacterPreviewCardSkeleton';
import { GmScreenCard } from '@/components/campaign/GmScreenCard';
import { GmSheetDrawerHost } from '@/components/campaign/GmSheetDrawerHost';
import { GmScreenCreatureCard } from '@/components/campaign/GmScreenCreatureCard';
import { AddCreatureDialog } from '@/components/campaign/AddCreatureDialog';
import { InitiativeTracker } from '@/components/campaign/InitiativeTracker';
import { CombatStatusPalette, StatusChipVisual } from '@/components/campaign/CombatStatusPalette';
import { GroupRestControl } from '@/components/campaign/GroupRestControl';
import { OpenTrackerWindowButton } from '@/components/campaign/OpenTrackerWindowButton';
import { ProjectionLinkControl } from '@/components/campaign/ProjectionLinkControl';
import { GmToolsDrawerHost, TOOLS_PARAM } from '@/components/campaign/GmToolsDrawerHost';
import { DEFAULT_GM_TOOL } from '@/components/campaign/GmToolsDrawer';
import { GmReferenceDrawerHost, REFERENCE_PARAM } from '@/components/campaign/GmReferenceDrawerHost';
import { HomeBackground } from '@/components/HomeBackground';
import { GmSessionHeaderIndicator } from '@/components/session/GmSessionHeaderIndicator';
import { SIDE_ACCENT, type CreatureSide } from '@/lib/ui/creature';
import { usePersistedBoolean } from '@/lib/ui/usePersistedBoolean';
import { customCreatureBlob } from '@/lib/session/customCreature';
import { useActiveSession } from '@/lib/session/useActiveSession';
import {
  isGroupScopedStatus,
  type AnyStatusEffectId,
} from '@/lib/character/statusEffects';
import { groupBuffIntensityFor } from '@/lib/character/groupBuffs';
import { GroupBuffDialog, type GroupBuffCandidate } from '@/components/campaign/GroupBuffDialog';
import type { BeneficialEffectId } from '@/data/schema';
import { useGmScreenCombat, type LabeledCreature } from './useGmScreenCombat';

/**
 * Gabarit de colonnes commun aux trois grilles (joueurs / alliés / adversaires) : 3
 * colonnes sur grand écran, palier tablette à 2, repli mobile à 1.
 */
/**
 * Style « verre teinté » des boutons d'action de l'écran de MJ (Outils du MJ, Ajouter une
 * créature, Réinitialiser le combat) : fond translucide + flou d'arrière-plan, teinté par
 * la tonalité MUI (`info` = bleu, `error` = rouge). Remplace le simple `outlined`/`text`,
 * trop peu lisible sur le fond illustré de la page (`HomeBackground`).
 */
function glassButtonSx(theme: Theme, tone: 'info' | 'error') {
  return {
    color: theme.palette[tone].light,
    bgcolor: alpha(theme.palette[tone].main, 0.18),
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    border: `1px solid ${alpha(theme.palette[tone].main, 0.5)}`,
    '&:hover': {
      bgcolor: alpha(theme.palette[tone].main, 0.28),
      borderColor: theme.palette[tone].light,
    },
  } as const;
}

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

export default function GmScreenPage({ params }: { params: Promise<{ cid: string }> }) {
  const { cid } = use(params);

  // Combat en cours — logique partagée avec la fenêtre « présentation » (PER-248) :
  // état persisté par campagne (roster de créatures + PV + tour courant) et dérivation
  // des lignes du tracker. Le bouton « + Ajouter une créature » est laissé sur TOUTES
  // les campagnes (temporaire, cf. PER-236) : par défaut aucune créature.
  const {
    charactersHydrated,
    campaignsLoading,
    campaign,
    claimed,
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
  } = useGmScreenCombat(cid, 'gm');
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

  // FENÊTRE DE POSE d'un buff de groupe (PER-104) : `carrierKey` est le combattant sur lequel la puce
  // a été déposée (ou dont le menu a été ouvert) — il donne le CAMP à proposer et le PALIER par défaut.
  const [groupBuffPose, setGroupBuffPose] = useState<{
    buffId: BeneficialEffectId;
    carrierKey: string;
  } | null>(null);
  const openGroupBuff = useCallback((carrierKey: string, buffId: BeneficialEffectId) => {
    setGroupBuffPose({ buffId, carrierKey });
  }, []);

  // Glisser-déposer des états (PER-279) : les puces de la palette (`useDraggable`, id préfixé) sont
  // déposées sur les colonnes du tracker (`useDroppable`, id = clé de combattant). Le capteur pointeur
  // couvre souris + tactile (l'écran de MJ peut être sur tablette) ; une distance d'activation évite de
  // déclencher un glisser sur un simple clic. `activeStatus` alimente la surcouche qui suit le curseur.
  const [activeStatus, setActiveStatus] = useState<AnyStatusEffectId | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );
  const onDragStart = (event: DragStartEvent) => {
    const id = event.active.data.current?.statusId as AnyStatusEffectId | undefined;
    setActiveStatus(id ?? null);
  };
  const onDragEnd = (event: DragEndEvent) => {
    setActiveStatus(null);
    const statusId = event.active.data.current?.statusId as AnyStatusEffectId | undefined;
    const combatantKey = event.over?.id;
    if (!statusId || typeof combatantKey !== 'string') return;
    // Un BUFF DE GROUPE (PER-104) ne se pose pas sur la seule carte visée : sa règle vise « ses alliés
    // et lui ». Le dépôt désigne le PORTEUR (camp + palier pré-rempli) et ouvre la fenêtre de pose.
    if (isGroupScopedStatus(statusId)) openGroupBuff(combatantKey, statusId as BeneficialEffectId);
    else applyStatus(combatantKey, statusId);
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
  // Palier pré-rempli : lu sur le RANG du porteur dans sa voie (+2 dès le rang 5). Une créature
  // alliée ou un personnage qui ne porte pas la capacité retombe sur +1, ajustable à la main.
  const groupBuffIntensity = groupBuffPose
    ? groupBuffIntensityFor(
        claimed.find((c) => c.id === groupBuffPose.carrierKey)?.featureIds ?? [],
        groupBuffPose.buffId,
      )
    : 1;
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
      <AppHeader
        breadcrumbs={[
          { label: campaign.name, href: `/campaign/${cid}` },
          { label: 'Écran de MJ' },
        ]}
        // Cycle de vie de la session synchronisée (PER-264), compacté dans l'en-tête
        // (comme le voyant de la fiche, PER-269) : démarrer/terminer + état « session
        // en cours ». C'est le gate du temps réel (PER-265+ s'y accrochent).
        sessionIndicator={<GmSessionHeaderIndicator campaignId={cid} />}
      />

      {/* Volontairement HORS du `Container` habituel du site : l'écran de MJ occupe
          toute la largeur pour afficher un maximum de cartes de front. Padding
          symétrique (gauche/droite = haut/bas) pour laisser respirer les bords — SAUF en bas
          (`pb: 0`), où la bande d'initiative sticky-bottom vient coller directement contre le
          pied de page (voir `FLUSH_FOOTER_ROUTES` dans `AppFooter`, qui annule sa marge sur
          cette route en retour). */}
      <Box sx={{ p: { xs: 2, sm: 4 }, pb: 0 }}>
        {/* Barre d'actions (PER-236, PER-247), laissée sur toutes les campagnes : ajout de
            créature, réinitialisation du combat et accès aux Outils du MJ, toutes sur une
            même ligne. Style verre teinté : bleu pour les actions principales, rouge pour
            l'action destructive, plus lisible sur le fond illustré que le simple
            `outlined`/`text` d'origine. */}
        <Stack direction="row" spacing={1} sx={{ mb: 2, width: '100%', flexWrap: 'wrap', rowGap: 1 }}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<AddIcon />}
            onClick={openAddCreature}
            sx={(theme) => glassButtonSx(theme, 'info')}
          >
            Ajouter une créature
          </Button>
          {hasCombatants && (
            <Button
              variant="outlined"
              size="small"
              startIcon={<RestartAltIcon />}
              onClick={() => setResetOpen(true)}
              sx={(theme) => glassButtonSx(theme, 'error')}
            >
              Réinitialiser le combat
            </Button>
          )}
          {/* Repos de groupe (PER-312) : propose une récupération à toute la table sur le canal
              de session, et tient le relevé des réponses. Inerte hors session. */}
          <GroupRestControl
            campaignId={cid}
            tableCharacters={restTableCharacters}
            sessionActive={sessionActive}
            buttonSx={(theme) => glassButtonSx(theme, 'info')}
          />
          {/* Espaceur : consomme toute la largeur restante pour pousser « Outils du MJ » à
              l'extrême droite. Un simple `ml: 'auto'` sur le bouton perd face à la marge que
              `Stack`/`spacing` applique déjà entre ses enfants (même spécificité CSS, la règle
              de `Stack` gagne). */}
          <Box sx={{ flexGrow: 1 }} />
          {/* Aide-mémoire : ouvre le tiroir latéral intégrant le référentiel de règles (`/reference`)
              sans quitter l'écran de MJ. Vraie ancre (`?reference=1`) → Ctrl/⌘+Clic ouvre dans un
              nouvel onglet, le bouton Retour ferme le tiroir. */}
          <Button
            variant="outlined"
            size="small"
            startIcon={<MenuBookOutlinedIcon />}
            component={Link}
            href={`/campaign/${cid}/gm-screen?${REFERENCE_PARAM}=1`}
            scroll={false}
            sx={(theme) => glassButtonSx(theme, 'info')}
          >
            Aide-mémoire
          </Button>
          {/* Outils du MJ (PER-199, PER-200) : ouvre le tiroir latéral à onglets (rumeurs de
              taverne, butin, et d'autres outils à venir). Vraie ancre (`?tools=`) → Ctrl/⌘+Clic
              ouvre dans un nouvel onglet, le bouton Retour ferme le tiroir. */}
          <Button
            variant="outlined"
            size="small"
            startIcon={<HandymanIcon />}
            component={Link}
            href={`/campaign/${cid}/gm-screen?${TOOLS_PARAM}=${DEFAULT_GM_TOOL}`}
            scroll={false}
            sx={(theme) => glassButtonSx(theme, 'info')}
          >
            Outils du MJ
          </Button>
        </Stack>
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
                storageKey="gm-screen-players-open"
                count={claimed.length}
              >
                {claimed.map((character) => (
                  <GmScreenCard
                    key={character.id}
                    character={character}
                    player={character.playerId ? playerById.get(character.playerId) ?? null : null}
                    href={`/character/${character.id}`}
                    panelHref={`/campaign/${cid}/gm-screen?sheet=${character.id}`}
                  />
                ))}
              </CollapsibleSection>
            )}
            {allies.length > 0 && (
              <CollapsibleSection
                label="Alliés"
                color={SIDE_ACCENT.ally}
                storageKey="gm-screen-allies-open"
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
                storageKey="gm-screen-enemies-open"
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
          onDragEnd={onDragEnd}
          onDragCancel={() => setActiveStatus(null)}
        >
          <InitiativeTracker
            rows={initiativeRows}
            currentTurnKey={currentTurnKey}
            onCurrentTurnKeyChange={setCurrentTurnKey}
            roundNumber={roundNumber}
            onRoundNumberChange={setRoundNumber}
            onRestartRounds={restartRounds}
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
            statusPalette={
              <CombatStatusPalette
                situationalIds={situationalEffectIds}
                groupBuffIds={groupBuffIds}
                posedGroupBuffIds={posedGroupBuffIds}
                onClearGroupBuffs={() => removeStatusesEverywhere(posedGroupBuffIds)}
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
        <GmToolsDrawerHost campaign={campaign} />
      </Suspense>

      {/* Tiroir « Aide-mémoire », piloté par `?reference=1`. Même contrainte de frontière `Suspense`
          (lecture des paramètres d'URL) que les autres tiroirs de l'écran de MJ. */}
      <Suspense>
        <GmReferenceDrawerHost />
      </Suspense>
    </>
  );
}
