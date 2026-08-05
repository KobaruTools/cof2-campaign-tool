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
import { Suspense, use, useState } from 'react';
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
import { AppHeader } from '@/components/AppHeader';
import { CharacterPreviewCardSkeleton } from '@/components/CharacterPreviewCardSkeleton';
import { GmScreenCard } from '@/components/campaign/GmScreenCard';
import { GmSheetDrawerHost } from '@/components/campaign/GmSheetDrawerHost';
import { GmSessionControl } from '@/components/campaign/GmSessionControl';
import { GmScreenCreatureCard } from '@/components/campaign/GmScreenCreatureCard';
import { AddCreatureDialog } from '@/components/campaign/AddCreatureDialog';
import { InitiativeTracker } from '@/components/campaign/InitiativeTracker';
import { CombatStatusPalette, StatusChipVisual } from '@/components/campaign/CombatStatusPalette';
import { OpenTrackerWindowButton } from '@/components/campaign/OpenTrackerWindowButton';
import { ProjectionLinkControl } from '@/components/campaign/ProjectionLinkControl';
import { HomeBackground } from '@/components/HomeBackground';
import { SIDE_ACCENT } from '@/lib/ui/creature';
import { usePersistedBoolean } from '@/lib/ui/usePersistedBoolean';
import { customCreatureBlob } from '@/lib/session/customCreature';
import type { AnyStatusEffectId } from '@/lib/character/statusEffects';
import { useGmScreenCombat, type LabeledCreature } from './useGmScreenCombat';

/**
 * Gabarit de colonnes commun aux trois grilles (joueurs / alliés / adversaires) : 3
 * colonnes sur grand écran, palier tablette à 2, repli mobile à 1.
 */
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
    playerNameById,
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
    applyStatus,
    removeStatus,
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
  // Réinitialisation du combat (PER-283) : action destructive → confirmation avant purge.
  const [resetOpen, setResetOpen] = useState(false);
  // Rien à réinitialiser tant qu'aucun combattant n'est en piste (bouton masqué).
  const hasCombatants = claimed.length > 0 || labeledCreatures.length > 0;

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
    if (statusId && typeof combatantKey === 'string') applyStatus(combatantKey, statusId);
  };

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
      />

      {/* Volontairement HORS du `Container` habituel du site : l'écran de MJ occupe
          toute la largeur pour afficher un maximum de cartes de front. Padding
          symétrique (gauche/droite = haut/bas) pour laisser respirer les bords. */}
      <Box sx={{ p: { xs: 2, sm: 4 } }}>
        {/* Cycle de vie de la session synchronisée (PER-264) : démarrer/terminer + état
            « session en cours ». C'est le gate du temps réel (PER-265+ s'y accrocheront). */}
        <GmSessionControl campaignId={cid} />
        {/* Combat tracker (PER-236, PER-247) : barre d'ajout de créatures, laissée sur toutes les campagnes. */}
        <Stack
          direction="row"
          spacing={1}
          sx={{ mb: 2, alignItems: 'center', flexWrap: 'wrap', rowGap: 1 }}
        >
          <Typography variant="subtitle1" sx={{ fontWeight: 700, flexGrow: 1 }}>
            Combat en cours
          </Typography>
          {hasCombatants && (
            <Button
              variant="text"
              size="small"
              color="error"
              startIcon={<RestartAltIcon />}
              onClick={() => setResetOpen(true)}
            >
              Réinitialiser le combat
            </Button>
          )}
          <Button
            variant="outlined"
            size="small"
            startIcon={<AddIcon />}
            onClick={openAddCreature}
          >
            Ajouter une créature
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
                    playerName={
                      character.playerId ? playerNameById.get(character.playerId) ?? null : null
                    }
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
              onApply: applyStatus,
              onRemove: removeStatus,
              onAdjust: adjustStatus,
              onAdjustDuration: adjustStatusDuration,
            }}
            statusPalette={<CombatStatusPalette situationalIds={situationalEffectIds} />}
            stickyBottom
          />
          {/* Surcouche : la puce « réelle » suit le curseur pendant le glissement (l'originale s'estompe). */}
          <DragOverlay>
            {activeStatus ? <StatusChipVisual id={activeStatus} withTooltip={false} dragging /> : null}
          </DragOverlay>
        </DndContext>
      </Box>

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
          playerNameById={playerNameById}
        />
      </Suspense>
    </>
  );
}
