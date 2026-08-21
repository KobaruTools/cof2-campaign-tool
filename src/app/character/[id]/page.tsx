'use client';

import { use, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type Step } from 'react-joyride';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DoneIcon from '@mui/icons-material/Done';
import EditIcon from '@mui/icons-material/Edit';
import HelpOutlineIcon from '@mui/icons-material/HelpOutlined';
import HistoryIcon from '@mui/icons-material/History';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import MonitorHeartIcon from '@mui/icons-material/MonitorHeart';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import UpgradeIcon from '@mui/icons-material/Upgrade';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Container from '@mui/material/Container';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import type { Theme } from '@mui/material/styles';
import { ancestryById, classById, families, pathById, progression } from '@/data';
import { checkCompliance, deriveStats } from '@/lib/engine';
import { ABILITY_IDS } from '@/data/schema';
import type {
  AbilityId,
  BeneficialEffectId,
  DamageDie,
  StartingEquipmentChoiceOption,
} from '@/data/schema';
import type {
  CharacterStatus,
  DerivedStatId,
  EquipmentLine,
  Identity,
  StaticPortraitVariant,
} from '@/lib/character/types';
import { isCustomItem } from '@/lib/character/types';
import type { DerivedStatId as UiDerivedStatId } from '@/lib/ui/derivedStats';
import { modifierDeltas } from '@/lib/character/ancestry';
import { armorRestrictionByLine } from '@/lib/character/armorRestrictions';
import { oneHandableWeaponFamiliesForCharacter } from '@/lib/character/equipment';
import { extraMasteredWeaponIds, masteredClassIds } from '@/lib/character/mastery';
import { twoWeaponCombatStatus } from '@/lib/character/twoWeaponCombat';
import { weaponAffinities } from '@/lib/character/weaponAffinity';
import { PriestVocationIdentityLine } from '@/components/sheet/PriestVocationBadge';
import { missingGrantedItems } from '@/lib/character/grantedEquipment';
import { firearmsEffective } from '@/lib/character/firearms';
import { useIsPlayerSession } from '@/lib/supabase/useIsPlayerSession';
import { useAppSession } from '@/lib/supabase/useAppSession';
import { usePresenceHeartbeat } from '@/lib/player/usePresenceHeartbeat';
import {
  canUndoLastLevelUp,
  manualFeatureIds,
  recordManualFeatureChange,
  undoLastLevelUp,
} from '@/lib/character/levelUp';
import {
  pruneEffectInputs,
  pruneEffectToggles,
  pruneUsageCounters,
} from '@/lib/character/effects';
import { pruneFeatureChoices, setFeatureChoice } from '@/lib/character/choices';
import { currentRecoveryDice, pruneDepletion } from '@/lib/character/gauges';
import {
  activeTransformationWithHp,
  companionMountEnSelle,
  listCompanions,
  pruneCompanionDepletion,
  pruneCompanionInstances,
  pruneTransformationDepletion,
  referencedBestiaryCreatureSlugs,
} from '@/lib/character/companions';
import { isMountMounted, listOwnedMounts } from '@/lib/character/mounts';
import type { FeatureChoiceSelection } from '@/lib/character/types';
import { rulesContext } from '@/lib/character/rulesContext';
import { GuidedTour } from '@/components/tour/GuidedTour';
import { useGuidedTour } from '@/lib/tours/useGuidedTour';
import { SessionHeaderIndicator } from '@/components/session/SessionHeaderIndicator';
import { useActiveSession } from '@/lib/session/useActiveSession';
import { useCampaignCombatStore } from '@/stores/campaignCombat';
import { statusSheetImpact } from '@/lib/character/statusEffects';
import { passiveAuraStatusesFor } from '@/lib/character/partyAuras';
import { mergeMods } from '@/lib/character/orphanPoints';
import { ActiveStatusPanel } from '@/components/sheet/ActiveStatusPanel';
import type { SessionIdentity } from '@/lib/session/useSessionChannel';
import { ScrollToTopButton } from '@/components/ScrollToTopButton';
import { CharacterIdentityLine } from '@/components/sheet/CharacterIdentityLine';
import { AppTooltip } from '@/components/AppTooltip';
import { PortraitVariantMenu } from '@/components/PortraitVariantMenu';
import {
  useCharacterPortraitSrc,
  useCharacterPortraitCropRect,
  invalidateCharacterPortraitCache,
} from '@/lib/storage/useCharacterPortraitSrc';
import { useCroppedImageSrc } from '@/lib/image/useCroppedImageSrc';
import {
  uploadCharacterPortrait,
  removeCharacterPortrait,
  PortraitValidationError,
  type PortraitCropRect,
} from '@/lib/storage/characterPortrait';
import { useToast } from '@/components/toast/ToastProvider';
import { DerivedStatsGrid } from '@/components/DerivedStatsGrid';
import { useCharacterGameState } from '@/components/sheet/useCharacterGameState';
import { buildSheetDisplayView } from '@/components/sheet/sheetDisplayView';
import { HeaderIllustrations, FALLBACK_FRAME_WIDTH } from '@/components/HeaderIllustrations';
import { HomeBackground } from '@/components/HomeBackground';
import { CharacterSheetSkeleton } from '@/components/sheet/CharacterSheetSkeleton';
import { FirearmsAllowedProvider } from '@/components/ClassIcon';
import { FeatureDeclensionContext } from '@/components/sheet/FeatureDeclension';
import { TombstoneIcon } from '@/components/TombstoneIcon';
import { CampaignBadge } from '@/components/home/CampaignBadge';
import { PlayerBadge } from '@/components/home/PlayerBadge';
import { classColor } from '@/lib/ui/classColors';
import { usePersistedBoolean } from '@/lib/ui/usePersistedBoolean';
import { storageKeys } from '@/lib/storage/keys';
import { usePersistedState } from '@/lib/ui/usePersistedState';
import { useHeaderExtraRowSlot } from '@/lib/ui/useHeaderExtraRowSlot';
import { SheetInitiativeBar } from '@/components/sheet/SheetInitiativeBar';
import { SheetSection } from '@/components/sheet/SheetSection';
import { CapabilityScrollProvider } from '@/components/sheet/capabilityScroll';
import { BlockEditButton } from '@/components/sheet/BlockEditButton';
import { CharacterSessionHistoryDrawer } from '@/components/sheet/CharacterSessionHistoryDrawer';
import { CharacterNpcTab } from '@/components/sheet/CharacterNpcTab';
import { CharacterSessionNotesEditor } from '@/components/sheet/CharacterSessionNotesEditor';
import { usePlayerNpcs } from '@/lib/campaign/usePlayerNpcs';
import { PinSectionButton } from '@/components/sheet/PinSectionButton';
import { AppAlert } from '@/components/AppAlert';
import { PlayerStatusPanel, type RestBarItemId } from '@/components/sheet/PlayerStatusPanel';
import { StickySheetStatusBar } from '@/components/sheet/StickySheetStatusBar';
import { RestProposalDialog } from '@/components/session/RestProposalDialog';
import { BuffRequestControl } from '@/components/session/BuffRequestControl';
import { RestRequestControl } from '@/components/session/RestRequestControl';
import { ManeuversPanel } from '@/components/sheet/ManeuversPanel';
import { SourceRef } from '@/components/SourceRef';
import { CompanionsPanel } from '@/components/sheet/CompanionsPanel';
import { MountPassengerSelect } from '@/components/sheet/MountPassengerSelect';
import { AddMountButton, OwnedMountsPanel } from '@/components/sheet/OwnedMountsPanel';
import { PurseField } from '@/components/sheet/PurseField';
import { CoinPouchDialog } from '@/components/sheet/CoinPouchDialog';
import { PotionDialog } from '@/components/sheet/PotionDialog';
import { StartingChoiceDialog } from '@/components/sheet/StartingChoiceDialog';
import { parseCoinPouchName } from '@/lib/character/coinPouch';
import type { RestorableResourceKind } from '@/lib/character/restorableResources';
import { startingChoiceOptionsFor } from '@/lib/character/startingChoices';
import { AbilitiesGrid } from '@/components/sheet/AbilitiesGrid';
import { TestDomainsPanel } from '@/components/sheet/TestDomainsPanel';
import {
  ConcentrationToggle,
  FeaturesByPath,
  FeaturesLayoutToggle,
  VerbatimToggle,
} from '@/components/sheet/FeaturesByPath';
import type { FeaturesLayout } from '@/components/sheet/FeaturesByPath';
import { EquipmentList } from '@/components/sheet/EquipmentList';
import { weaponLineCriticalRange } from '@/components/sheet/weaponCriticalRange';
import { boundWeaponPathFor } from '@/lib/character/boundWeapon';
import { IdentityFields } from '@/components/sheet/IdentityFields';
import { IdentityEditor } from '@/components/sheet/IdentityEditor';
import { RichTextEditor } from '@/components/sheet/RichTextEditor';
import { AbilityCodeChip, GlossaryRichText } from '@/components/sheet/FeatureRichText';
import { DemiElfeAncestryDialog } from '@/components/sheet/DemiElfeAncestryDialog';
import { AncestryChoicesDialog } from '@/components/sheet/AncestryChoicesDialog';
import { setDemiElfeAncestryPath } from '@/lib/character/sheetActions';
import { ComplianceWarnings } from '@/components/sheet/ComplianceWarnings';
import { usePaidContentLoading } from '@/lib/content/usePaidContentLoading';
import { LevelUpDialog } from '@/components/sheet/LevelUpDialog';
import { LevelHistory } from '@/components/sheet/LevelHistory';
import { LevelUndoButton } from '@/components/sheet/LevelUndoButton';
import { useCharactersStore } from '@/stores/characters';
import { useCampaignsStore } from '@/stores/campaigns';
import { usePlayersStore } from '@/stores/players';
import { useBuffOptOutStore } from '@/stores/buffOptOut';
import { useBestiaryStore } from '@/stores/bestiary';
import { useHeaderContent } from '@/stores/headerContent';
import { hrefFromIndex, useCampaignSlugIndex, useResolvedCharacter } from '@/lib/routing/slug';

const familyById = new Map(families.map((f) => [f.id, f]));

/**
 * Liste vide partagée des buffs écartés : un sélecteur zustand doit renvoyer une référence STABLE
 * quand il n'y a rien (l'égalité par défaut est `Object.is` — un `[]` neuf rendrait en boucle).
 */
const NO_WAIVED_BUFFS: BeneficialEffectId[] = [];

/**
 * Sous-ensemble de « Statistiques dérivées » que `StickySheetStatusBar` sait condenser (défense/init/
 * contact/distance/magie) — seules stats éligibles au PIN individuel de bloc (`DerivedStatsGrid`).
 */
const BAR_PINNABLE_UI_STAT_IDS: UiDerivedStatId[] = [
  'defense',
  'initiative',
  'meleeAttack',
  'rangedAttack',
  'magicAttack',
];

/**
 * Blocs de la fiche possédant un mode édition à scope propre (crayon dédié). Le
 * bouton « Modifier » du bandeau bascule tous ces blocs en une fois ; chaque crayon
 * n'agit que sur son bloc. « Compétences & tests » en est absent (lecture seule).
 */
const EDIT_BLOCKS = ['abilities', 'derived', 'features', 'equipment', 'identity', 'notes'] as const;
type EditBlock = (typeof EDIT_BLOCKS)[number];
const NO_EDIT: Record<EditBlock, boolean> = {
  abilities: false,
  derived: false,
  features: false,
  equipment: false,
  identity: false,
  notes: false,
};
/** Symétrique de `NO_EDIT` — tous les blocs en édition (PER-426, étape « Modifier la page »). */
const ALL_EDIT: Record<EditBlock, boolean> = {
  abilities: true,
  derived: true,
  features: true,
  equipment: true,
  identity: true,
  notes: true,
};

export default function CharacterSheetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: idParam } = use(params);
  const router = useRouter();
  const hasHydrated = useCharactersStore((s) => s.hasHydrated);
  const status = useCharactersStore((s) => s.status);
  // Résout un slug lisible OU un lien historique (rétrocompatibilité, cf. `slug.ts`) ; le reste
  // du fichier continue de lire `id` — désormais le VRAI id une fois le personnage résolu.
  const { character, id } = useResolvedCharacter(idParam);
  const campaignSlugIndex = useCampaignSlugIndex();
  const upsert = useCharactersStore((s) => s.upsert);
  const loadCharacters = useCharactersStore((s) => s.load);
  // Campagnes disponibles pour l'attribution (PER-180) : le personnage peut être
  // rattaché à une campagne ou rester « Non attribué ».
  const campaigns = useCampaignsStore((s) => s.campaigns);
  const loadCampaigns = useCampaignsStore((s) => s.load);
  // Roster de joueurs de la campagne de rattachement (PER-184) : alimente le
  // sélecteur de réattribution et l'affichage du joueur. Le store ne cache qu'une
  // campagne à la fois — on ne fait donc confiance à `players` que si son
  // `playersCampaignId` correspond à la campagne du personnage courant.
  const players = usePlayersStore((s) => s.players);
  const playersCampaignId = usePlayersStore((s) => s.campaignId);
  const loadPlayers = usePlayersStore((s) => s.load);
  // Session joueur (PER-196). Usages : (1) COSMÉTIQUE — un joueur ne réattribue ni
  // sa campagne ni son joueur (le trigger gèle ces colonnes), on masque donc les
  // sélecteurs d'attribution ; (2) LECTURE SEULE — une fiche qui n'est PAS la sienne
  // (roster d'un colistier) est consultable (RLS `read_roster`) mais non éditable
  // (RLS refuse l'écriture) : on la présente en lecture seule (cf. `readOnly` plus bas).
  const { isPlayer, playerId: sessionPlayerId } = useIsPlayerSession();
  // Présence (PER-195) : une session joueur qui édite/consulte une fiche reste
  // « active » aux yeux du MJ (couvre les longues sessions passées hors de /play).
  usePresenceHeartbeat(isPlayer);
  // Lecture seule (PER-196) : session joueur consultant une fiche qui n'est pas la
  // sienne. La RLS refuserait toute écriture (update 0 ligne → conflit silencieux),
  // donc on neutralise l'édition en amont — les écritures deviennent des no-op et les
  // affordances d'édition (Modifier, crayons, montée de niveau, recréation) sont
  // masquées plus bas.
  const readOnly = character != null && isPlayer && character.playerId !== sessionPlayerId;
  // Campagne de rattachement : garde-fou de tout ce qui relève de la session (présence, états de
  // combat, roster). Déclarée AVANT l'état de jeu, dont le calcul dépend désormais des états posés.
  const characterCampaignId = character?.campaignId ?? null;
  // États de combat sur la fiche (PER-281) : le joueur voit ET subit, EN DIRECT pendant une session
  // active, les états que le MJ lui applique ; hors session, rien (états propres au combat).
  //  - `useActiveSession` (observateur, SANS battement — le battement/canal sont portés par le
  //    `SessionHeaderIndicator` de l'en-tête, un seul par page) sert de garde-fou « session active ».
  //  - Le store `campaignCombat` est alimenté en direct par le canal (broadcast `combat-state`) ; on
  //    le CHARGE aussi depuis la table autoritative à l'entrée en session, pour voir les états déjà
  //    posés avant qu'on rejoigne (le canal ne rediffuse qu'à la prochaine mutation du MJ).
  const { isActive: sessionActive, session: activeSession } = useActiveSession(characterCampaignId);
  const combatStatuses = useCampaignCombatStore((s) =>
    characterCampaignId ? s.byCampaign[characterCampaignId]?.statuses[id] : undefined,
  );
  // Hors session, la liste reste vide → aucune répercussion (les états sont propres au combat).
  const posedStatuses = sessionActive ? (combatStatuses ?? []) : [];
  // Porteurs d'aura passive de groupe (PER-438, `partyAuras.ts`) diffusés par le MJ dans le même
  // état de combat — la RLS empêche cette fiche de lire les autres personnages de la table pour
  // savoir « y a-t-il un frouïn dans le groupe ? », d'où ce canal déjà RLS-safe. Même garde de
  // session que `posedStatuses` : hors session, `campaign_combat` n'est pas chargé.
  const partyAuraCarrierIds = useCampaignCombatStore((s) =>
    characterCampaignId ? s.byCampaign[characterCampaignId]?.partyAuraCarrierIds : undefined,
  );
  const passiveAuraStatuses = sessionActive
    ? passiveAuraStatusesFor(id, partyAuraCarrierIds ?? {})
    : [];
  // Buffs que CE joueur a écartés de sa fiche (PER-358) : un buff de groupe est posé d'un geste sur
  // tout un camp, chacun reste libre de s'en passer. Purement local — le MJ reste seul auteur de
  // l'état de combat, et les camarades n'en savent rien.
  const waivedBuffIds = useBuffOptOutStore((s) => s.idsByCharacter[id] ?? NO_WAIVED_BUFFS);
  const waiveBuff = useBuffOptOutStore((s) => s.waiveBuff);
  const syncWaivedBuffs = useBuffOptOutStore((s) => s.syncPosed);
  // Roster/monture ouverts (PER-378, Amitié animale + Monture géante) : `listCompanions` a besoin du
  // blob COMPLET (abilities/attaques/PV) de chaque créature RÉELLEMENT choisie pour l'afficher dans la
  // section « Compagnons » — la liste légère (`useBestiaryStore().list`, filtrage/budget du picker)
  // suffit à FeaturesByPath.tsx mais pas ici. `referencedBestiaryCreatureSlugs` couvre les DEUX canaux
  // (`summonedCreatureIds` du roster ET `effectInputs` de la monture — un oubli du second faisait
  // disparaître la monture de la section, bug constaté 2026-08-21) ; on charge donc seulement ces
  // slugs (jamais tout le bestiaire).
  const summonedCreatureBlobs = useBestiaryStore((s) => s.blobs);
  const loadSummonedCreatureBlob = useBestiaryStore((s) => s.loadBlob);
  const summonedCreatureSlugs = character ? referencedBestiaryCreatureSlugs(character) : [];
  useEffect(() => {
    for (const slug of summonedCreatureSlugs) loadSummonedCreatureBlob(slug);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(summonedCreatureSlugs), loadSummonedCreatureBlob]);
  // Le renoncement ne survit pas à la levée de l'effet : si le MJ relance le Chant des héros, c'est
  // une nouvelle incantation, elle s'applique à tout le monde. Clé de chaîne plutôt que le tableau
  // (recréé à chaque rendu), pour ne réveiller la purge qu'aux VRAIS changements d'état posé.
  const posedStatusKey = posedStatuses.map((s) => s.id).join('|');
  useEffect(() => {
    syncWaivedBuffs(id, posedStatusKey === '' ? [] : posedStatusKey.split('|'));
  }, [id, posedStatusKey, syncWaivedBuffs]);
  const appliedStatuses = [
    ...(waivedBuffIds.length > 0
      ? posedStatuses.filter((s) => !waivedBuffIds.includes(s.id as BeneficialEffectId))
      : posedStatuses),
    // Auras passives de groupe (PER-438) : jamais posées, jamais écartables (aucun interrupteur,
    // cf. `ActiveStatusPanel`) — ajoutées APRÈS le filtre de renoncement, qui ne les concerne pas.
    ...passiveAuraStatuses,
  ];
  // Ids seuls, pour les consommateurs qui n'ont besoin que de SAVOIR ce qui est posé : la neutralisation
  // de l'interrupteur de fiche d'un buff de groupe posé en séance (PER-314), au calcul comme à l'écran.
  // Un buff écarté en est ABSENT — le porteur retrouve alors son propre interrupteur.
  const sessionStatusIds = appliedStatuses.map((s) => s.id);

  // État de JEU du personnage (PER-257) : vue dérivée, maxima et actions de jeu (interrupteurs,
  // compteurs, PV, repos, compagnons, montures, inventaire) branchés sur le store par un hook
  // mince, adossé aux fonctions PURES de `lib/character/sheetActions`. `null` tant que le
  // personnage n'est pas chargé — d'où l'appel ici, avant les retours anticipés ci-dessous.
  const game = useCharacterGameState(character, { readOnly, sessionStatusIds });

  // Charge le personnage depuis le cloud (RLS `owner_id`, PER-192) en cas d'accès
  // direct à l'URL, et les campagnes pour résoudre le libellé d'attribution.
  useEffect(() => {
    void loadCharacters();
    void loadCampaigns();
  }, [loadCharacters, loadCampaigns]);
  // Charge le roster de la campagne du personnage (quand il en a une), pour le
  // sélecteur/affichage du joueur. Se recharge si la campagne change.
  useEffect(() => {
    if (characterCampaignId) void loadPlayers(characterCampaignId);
  }, [characterCampaignId, loadPlayers]);
  // Identité de présence du SPECTATEUR sur le canal de session (PER-265) : le joueur
  // de la session (avec son nom de roster) ou le MJ. `null` hors campagne → pas de
  // canal. Sert à ce que le spectateur reste « connecté » tant qu'il consulte cette
  // fiche (pas seulement sur /play), et à afficher les présents ici aussi.
  const sessionIdentity = useMemo<SessionIdentity | null>(() => {
    if (!characterCampaignId) return null;
    if (isPlayer) {
      if (!sessionPlayerId) return null;
      const rosterName =
        playersCampaignId === characterCampaignId
          ? players.find((p) => p.id === sessionPlayerId)?.name
          : undefined;
      return { kind: 'player', playerId: sessionPlayerId, name: rosterName ?? 'Joueur' };
    }
    return { kind: 'gm', playerId: null, name: 'MJ' };
  }, [characterCampaignId, isPlayer, sessionPlayerId, playersCampaignId, players]);
  const loadCombat = useCampaignCombatStore((s) => s.load);
  // Manche courante du combat : les compteurs de tours des états (PER-305) s'en déduisent. 1 par
  // défaut (aucun combat chargé) — sans état posé, le panneau ne s'affiche de toute façon pas.
  const combatRoundNumber = useCampaignCombatStore((s) =>
    characterCampaignId ? (s.byCampaign[characterCampaignId]?.roundNumber ?? 1) : 1,
  );
  useEffect(() => {
    if (sessionActive && characterCampaignId) void loadCombat(characterCampaignId);
  }, [sessionActive, characterCampaignId, loadCombat]);
  // PER-116 — « aller à l'arme » : clic sur l'icône d'arme de la carte d'attaque au contact → déplie
  // la section Inventaire (si repliée) puis fait défiler jusqu'à la ligne exacte (main principale ou
  // secondaire). `equipmentJumpNonce` PILOTE `SheetSection.expandSignal` : toute incrémentation
  // redéclenche la séquence, `equipmentJumpSlot` (lu au moment du dépliage effectif) dit QUELLE ligne.
  const [equipmentJumpSlot, setEquipmentJumpSlot] = useState<'mainHand' | 'offHand' | null>(null);
  const [equipmentJumpNonce, setEquipmentJumpNonce] = useState(0);
  const scrollToEquipmentWeapon = (slot: 'mainHand' | 'offHand') => {
    setEquipmentJumpSlot(slot);
    setEquipmentJumpNonce((n) => n + 1);
  };
  // Tour guidé (PER-426) — deux étapes distinctes, deux sections repliées par défaut,
  // INDÉPENDANTES l'une de l'autre (deux compteurs séparés, même principe que
  // `equipmentJumpNonce` : toute incrémentation déplie SA section).
  const [notesJumpNonce, setNotesJumpNonce] = useState(0);
  const [historyJumpNonce, setHistoryJumpNonce] = useState(0);
  // Édition par bloc : chaque bloc a son propre scope, activable via son crayon.
  const [editingBlocks, setEditingBlocks] = useState<Record<EditBlock, boolean>>(NO_EDIT);
  const allEditing = EDIT_BLOCKS.every((k) => editingBlocks[k]);
  const toggleBlock = (block: EditBlock) =>
    setEditingBlocks((s) => ({ ...s, [block]: !s[block] }));
  // Bouton « Modifier » du bandeau : tout activé → tout désactivé, sinon tout activé.
  const toggleAllEditing = () =>
    setEditingBlocks((s) => {
      const next = !EDIT_BLOCKS.every((k) => s[k]);
      return { abilities: next, derived: next, features: next, equipment: next, identity: next, notes: next };
    });
  const [levelUpOpen, setLevelUpOpen] = useState(false);
  // Bloc « Notes » à onglets pendant une partie en cours (PER-415) : onglet actif + drawer
  // d'historique, ouvrable qu'il y ait ou non une session active (le bouton reste visible).
  const [notesTab, setNotesTab] = useState<'notes' | 'session' | 'npc'>('notes');
  // Onglet « PNJ » (PER-439) : chargé UNE fois ici (pas dans `CharacterNpcTab`) pour savoir,
  // avant même de rendre les onglets, s'il y a un PNJ à montrer — l'onglet n'est proposé QUE
  // si la liste n'est pas vide (retour propriétaire).
  const { npcs: playerNpcs, loading: playerNpcsLoading, error: playerNpcsError } = usePlayerNpcs(characterCampaignId);
  const hasPlayerNpcs = playerNpcs.length > 0;
  useEffect(() => {
    if (notesTab === 'npc' && !hasPlayerNpcs && !playerNpcsLoading) setNotesTab('notes');
  }, [notesTab, hasPlayerNpcs, playerNpcsLoading]);
  const [notesHistoryOpen, setNotesHistoryOpen] = useState(false);
  // Défilement au-delà de l'en-tête : quand la ligne d'identité passe sous la barre
  // d'application collée, on révèle cette même ligne en sous-titre du header et le
  // bouton « Haut de page ». Sentinelle = la ligne d'identité elle-même ; `rootMargin`
  // négatif en haut ≈ hauteur de la barre collée, pour déclencher pile quand la ligne
  // disparaît derrière elle (et non seulement en haut du viewport). Depuis PER-239 la
  // barre a DEUX étages (nav globale + sous-header du fil d'Ariane) : ≈ 104 px de haut,
  // d'où la marge relevée pour déclencher pile quand la ligne passe sous le sous-header.
  const identityLineRef = useRef<HTMLDivElement>(null);
  const [scrolledPastHeader, setScrolledPastHeader] = useState(false);
  useEffect(() => {
    const el = identityLineRef.current;
    if (el == null) return;
    const observer = new IntersectionObserver(
      ([entry]) => setScrolledPastHeader(!entry.isIntersecting),
      { rootMargin: '-104px 0px 0px 0px', threshold: 0 },
    );
    observer.observe(el);
    return () => observer.disconnect();
    // La ligne d'identité est toujours montée dès que la fiche est chargée ; on
    // (ré)attache l'observer quand la cible peut changer (chargement, id de perso).
  }, [character?.id]);
  // Épingles de la barre condensée collée à l'en-tête (`StickySheetStatusBar`, 3ᵉ étage
  // d'`AppHeader.extraRow`, retour propriétaire) : chaque section (Caractéristiques, Statistiques
  // dérivées, État du personnage) porte son propre `PinSectionButton`, à côté de son crayon
  // d'édition. Épinglée, elle reste condensée EN PERMANENCE dans la barre, quel que soit le
  // défilement ; non épinglée, elle n'y apparaît jamais (plus de détection de défilement
  // automatique — le déclencheur unique sur la ligne d'identité, puis les sentinelles de bas de
  // bloc, révélaient tout sans que le joueur ait pu choisir CE qu'il voulait garder sous les yeux).
  // Préférence GLOBALE persistée, comme `voiesLayout`/`featuresVerbatim` ci-dessous.
  const [pinAbilities, setPinAbilities] = usePersistedBoolean(storageKeys.sheet.pinAbilities, false);
  const [pinDerivedStats, setPinDerivedStats] = usePersistedBoolean(storageKeys.sheet.pinDerivedStats, false);
  const [pinStatusGauges, setPinStatusGauges] = usePersistedBoolean(storageKeys.sheet.pinStatusGauges, false);
  const [pinInventory, setPinInventory] = usePersistedBoolean(storageKeys.sheet.pinInventory, false);
  // Bourse dans le condensé Inventaire — PIN individuel (bloc « Bourse », `PurseField`), lui-même
  // sans effet si la section Inventaire n'est pas épinglée (`pinInventory` ci-dessus). Défaut FERMÉ
  // (« pin optionnel ») : l'utilisateur l'active s'il veut suivre sa bourse en permanence.
  const [pinInventoryPurse, setPinInventoryPurse] = usePersistedBoolean(storageKeys.sheet.pinInventoryPurse, false);
  // « Objet personnalisé » dans le condensé Inventaire — même principe que la bourse ci-dessus (pin
  // optionnel, défaut FERMÉ), mais soudé au bouton lui-même (`WeldedBarPinButton`, `EquipmentList`)
  // plutôt qu'à un en-tête. `customItemOpenNonce` PILOTE `EquipmentList.openCustomItemSignal` : même
  // mécanisme nonce qu'`equipmentJumpNonce` ci-dessous (une incrémentation rouvre la modale).
  const [pinInventoryCustomItem, setPinInventoryCustomItem] = usePersistedBoolean(
    storageKeys.sheet.pinInventoryCustomItem,
    false,
  );
  const [customItemOpenNonce, setCustomItemOpenNonce] = useState(0);
  // Sous-ensemble des 5 stats de « Statistiques dérivées » condensées dans la barre (défense/init/
  // contact/distance/magie) — PIN individuel de chaque bloc (`DerivedStatsGrid`), lui-même sans effet
  // si la section n'est pas épinglée (`pinDerivedStats` ci-dessus). Défaut statique (avant que
  // `game` soit connu) : les 5 stats. L'effet ci-dessous RETIRE l'attaque magique de ce défaut, une
  // seule fois, si le personnage n'a PAS de mana (0 PM/aucun sort → jamais utile) — mais seulement
  // tant que l'utilisateur n'a JAMAIS touché ce réglage (`localStorage` encore vide), pour ne pas
  // écraser un choix déjà fait.
  const [pinnedDerivedStatItems, setPinnedDerivedStatItems] = usePersistedState<UiDerivedStatId[]>(
    'sheet:pin-derived-stat-items',
    BAR_PINNABLE_UI_STAT_IDS,
    (raw) =>
      Array.isArray(raw)
        ? raw.filter((id): id is UiDerivedStatId => BAR_PINNABLE_UI_STAT_IDS.includes(id as UiDerivedStatId))
        : undefined,
  );
  const derivedPinDefaultSeededRef = useRef(false);
  useEffect(() => {
    if (derivedPinDefaultSeededRef.current || typeof window === 'undefined') return;
    if (window.localStorage.getItem('sheet:pin-derived-stat-items') != null) {
      derivedPinDefaultSeededRef.current = true;
      return;
    }
    // `game` peut encore être `null` pendant le chargement/l'hydratation : on attend qu'il soit
    // connu avant de statuer sur le mana, plutôt que de figer un défaut prématuré (l'effet se
    // réexécute à chaque render jusqu'à ce que `game` soit prêt).
    if (!game) return;
    derivedPinDefaultSeededRef.current = true;
    if (game.manaMax == null) {
      setPinnedDerivedStatItems(['defense', 'initiative', 'meleeAttack', 'rangedAttack']);
    }
  }, [game, setPinnedDerivedStatItems]);
  // Boutons de repos (court/long) épinglés à la barre condensée sous « État du personnage » — PIN
  // individuel soudé à chaque bouton sur la fiche (`RestBarPinButton`, `PlayerStatusPanel`), lui-même
  // sans effet si la section n'est pas épinglée (`pinStatusGauges`). Les deux par défaut : pas de
  // critère d'exclusion comme l'attaque magique (tout personnage se repose).
  const [pinnedRestItems, setPinnedRestItems] = usePersistedState<RestBarItemId[]>(
    'sheet:pin-rest-items',
    ['shortRest', 'longRest'],
    (raw) =>
      Array.isArray(raw)
        ? raw.filter((id): id is RestBarItemId => id === 'shortRest' || id === 'longRest')
        : undefined,
  );
  const pinnedRestItemIds = new Set(pinnedRestItems);
  const toggleRestItemPin = (id: RestBarItemId) => {
    setPinnedRestItems((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };
  // Ouverture des modales de repos (PER-151) : ÉLEVÉE ici (au lieu d'un état interne de
  // `PlayerStatusPanel`) pour que les boutons de repos condensés de la barre (`StickySheetStatusBar`)
  // puissent aussi les ouvrir — deux points d'entrée (bouton plein sur la fiche, icône dans la barre),
  // un seul état.
  const [shortRestOpen, setShortRestOpen] = useState(false);
  const [longRestOpen, setLongRestOpen] = useState(false);
  // Disposition des voies : « colonnes » sur grand écran (défaut historique), mais
  // « lignes » par défaut sur mobile (PER-229) — en colonnes, le bloc central de la
  // fiche rend une grille large à défilement horizontal, très inconfortable au doigt.
  // On respecte un choix manuel, PERSISTÉ (`sheet:voies-layout`) : dès que l'utilisateur
  // bascule, on ne réimpose plus le défaut lié à la largeur d'écran (`layoutTouchedRef`),
  // y compris après rechargement — sans quoi le remontage de la page effaçait la ref et
  // réimposait « lignes » sur mobile même si l'utilisateur avait choisi « colonnes ».
  const isNarrowViewport = useMediaQuery((theme: Theme) => theme.breakpoints.down('md'));
  const [voiesLayout, setVoiesLayout] = usePersistedState<FeaturesLayout>(
    'sheet:voies-layout',
    'columns',
    (raw) => (raw === 'rows' || raw === 'columns' ? raw : undefined),
  );
  const layoutTouchedRef = useRef(
    typeof window !== 'undefined' && window.localStorage.getItem('sheet:voies-layout') != null,
  );
  useEffect(() => {
    if (!layoutTouchedRef.current) setVoiesLayout(isNarrowViewport ? 'rows' : 'columns');
  }, [isNarrowViewport, setVoiesLayout]);
  const changeVoiesLayout = useCallback((layout: FeaturesLayout) => {
    layoutTouchedRef.current = true;
    setVoiesLayout(layout);
  }, [setVoiesLayout]);
  // Texte d'origine (PER-88) : OFF (défaut) → rendu enrichi des capacités ; ON →
  // verbatim du livre. Préférence d'affichage transitoire, comme la disposition des voies.
  const [featuresVerbatim, setFeaturesVerbatim] = useState(false);
  // Concentration accrue (p. 228) : état de jeu transitoire (non persisté), comme
  // l'affichage des voies. Quand actif, les sorts en (A) montrent leur coût réduit.
  const [concentration, setConcentration] = useState(false);
  // Vue de la section « Voies & capacités » (PER-296, proposition 2) : soit les capacités
  // du personnage (défaut), soit l'aide-mémoire des manœuvres de combat (lecture seule).
  // Préférence d'affichage transitoire (non persistée), comme la disposition des voies.
  const [voiesView, setVoiesView] = useState<'features' | 'maneuvers'>('features');
  // Clic sur une PUCE DE CAPACITÉ (`CapabilityChip`, n'importe où sur la fiche) : ramène la vue sur
  // « Voies & capacités » — bascule l'onglet loin de « Manœuvres » s'il y était, puis défile jusqu'à
  // la section (ancrée par `id`, cf. `CapabilityScrollProvider`). Section toujours montée (jamais
  // repliable) : nul besoin du mécanisme `expandSignal` de l'inventaire, un simple scrollIntoView suffit.
  const scrollToCapability = useCallback(() => {
    setVoiesView('features');
    document.getElementById('voies-capacites-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);
  // Clic sur un groupe de la barre condensée collée à l'en-tête (`StickySheetStatusBar`) : défile
  // jusqu'à la section qu'il condense. Contrairement à `scrollToCapability` ci-dessus, un simple
  // `scrollIntoView` ne suffit pas : l'en-tête a un 3ᵉ étage OPTIONNEL (cette même barre) qui varie sa
  // hauteur selon les pins actifs, donc `block: 'start'` caserait la section sous son bord haut,
  // PAS sous son bord bas réel — on mesure `#app-header` en direct (au clic, pas en continu — pas
  // besoin d'un `ResizeObserver` pour une action ponctuelle) et on vise nous-mêmes le bon `scrollTop`.
  const scrollToSection = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    const headerHeight = document.getElementById('app-header')?.getBoundingClientRect().height ?? 0;
    const top = el.getBoundingClientRect().top + window.scrollY - headerHeight - 12;
    window.scrollTo({ top, behavior: 'smooth' });
  }, []);
  // Vue de la section « Statistiques dérivées », même idiome que « Voies & capacités »
  // ci-dessus : les stats dérivées (défaut) ou « Compétences & tests » (lecture seule).
  // Préférence d'affichage transitoire (non persistée) ; les toggles de la vue « tests »
  // (eux) restent persistés, comme avant l'introduction des onglets (cf. `TestDomainsPanel`).
  const [statsView, setStatsView] = useState<'derived' | 'tests'>('derived');
  const [testsIncludeAbility, setTestsIncludeAbility] = usePersistedBoolean(
    storageKeys.testDomains.includeAbility,
    false,
  );
  const [testsHideZero, setTestsHideZero] = usePersistedBoolean(storageKeys.testDomains.hideZero, true);
  const { showToast } = useToast();
  // Index de la ligne « Bourse de 2d6 pa » dont l'ouverture est en cours (modale) ; null = fermée.
  const [coinPouchIndex, setCoinPouchIndex] = useState<number | null>(null);
  // Potion d'énergie custom en cours d'usage (PER-XXX) ; null = modale fermée.
  const [potionUse, setPotionUse] = useState<
    | {
        index: number;
        resource: RestorableResourceKind;
        die: DamageDie;
        count: number;
        evolving?: true;
        modifier?: number;
      }
    | null
  >(null);
  // Index de la ligne de CHOIX d'équipement de départ en cours de résolution (PER-220) ; null = fermée.
  const [choiceIndex, setChoiceIndex] = useState<number | null>(null);
  // Modale d'édition rétroactive de la voie de peuple du demi-elfe (PER-324) ; DOIT rester ici, en tête
  // avec les autres hooks, avant tout `return` anticipé (Rules of Hooks).
  const [demiElfeDialogOpen, setDemiElfeDialogOpen] = useState(false);
  const [ancestryChoicesDialogOpen, setAncestryChoicesDialogOpen] = useState(false);
  // Ancre du menu de statut (PER-183) ; null = fermé.
  const [statusAnchor, setStatusAnchor] = useState<HTMLElement | null>(null);
  // Statut d'archivage en attente de confirmation (mort/retiré) ; null = aucune. Le
  // passage en « actif » ne demande pas de confirmation (retour à l'état de jeu normal).
  const [pendingArchive, setPendingArchive] = useState<Exclude<CharacterStatus, 'active'> | null>(
    null,
  );

  // Confirmation « fin de wizard » : le wizard redirige avec `?created=1`. On
  // affiche un retour clair puis on nettoie l'URL pour ne pas le rejouer au
  // rechargement. Lecture directe de l'URL (pas de useSearchParams) pour éviter
  // d'imposer une frontière Suspense au prerendu.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('created') === '1') {
      // Lecture unique d'un paramètre d'URL côté client (impossible en
      // initialiseur d'état sans décalage d'hydratation SSR) : synchronisation
      // ponctuelle d'un système externe, pas une boucle de rendu.
      showToast('Personnage créé.', 'success');
      window.history.replaceState(null, '', window.location.pathname);
    }
    // showToast est stable (issu d'un contexte mémoïsé) ; effet à exécution unique.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Contenu payant « Le Compagnon » (PER-321) en cours de chargement — lu ICI, AVANT
  // les retours anticipés ci-dessous, car un Hook ne peut pas être appelé conditionnellement.
  const paidContentLoading = usePaidContentLoading();

  // Portrait de profil (PER-383) — mêmes précautions : Hooks lus ICI, avant les retours
  // anticipés, avec repli sûr tant que `character` n'est pas encore chargé.
  const classPortraitSrc = useCharacterPortraitSrc(
    character?.id ?? '',
    character?.portraitVariant ?? 'default',
    character?.classId ?? '',
  );
  // Zone de recadrage carrée du portrait personnalisé (PER-394) — `null` sans
  // portrait personnalisé, ou pour un portrait envoyé avant PER-394 (l'image
  // entière fait alors déjà foi, cf. `useCroppedImageSrc`).
  const portraitCropRect = useCharacterPortraitCropRect(
    character?.id ?? '',
    character?.portraitVariant ?? 'default',
  );
  // Recadrage appliqué aux vignettes carrées/rectangulaires (section Identité,
  // cadre d'en-tête à fond plein) — `undefined` sans `portraitCropRect` (illustration
  // standard, ou portrait personnalisé envoyé avant PER-394), on retombe alors sur
  // `classPortraitSrc` tel quel (déjà pertinent en `object-fit: cover`).
  const croppedClassPortraitSrc = useCroppedImageSrc(classPortraitSrc, portraitCropRect);
  const portraitCloudBacked = useCharactersStore((s) =>
    character ? character.id in s.cloudVersions : false,
  );
  // Image personnalisée : stockée en ligne, donc exige une session avec accès à la
  // DB (compte réel OU session joueur ouverte via un lien magique de MJ) — un
  // visiteur anonyme ne peut choisir qu'une des illustrations statiques. Si le
  // personnage n'est pas le sien, le mode édition lui-même est déjà inaccessible
  // (lecture seule) : pas de vérification de propriété supplémentaire ici.
  const session = useAppSession();
  const portraitUploadBlocked = session.resolved && session.role === 'anonymous';
  const [portraitBusy, setPortraitBusy] = useState(false);
  const [portraitError, setPortraitError] = useState<string | null>(null);

  // Tour guidé (PER-426) : les quatre cibles (caractéristiques, statistiques dérivées, voies &
  // capacités, équipement) n'existent que sur la fiche finale — même garde que les deux retours
  // anticipés ci-dessous (chargement / personnage introuvable). Désactivé sous mobile/tactile
  // (`isNarrowViewport`), comme les tours pilote et écran de MJ (PER-423/425).
  const tourReady = !!character && !!game;
  const tour = useGuidedTour('characterSheet', { ready: tourReady, enabled: !isNarrowViewport });
  // Étapes à onglet secondaire (Compétences & tests, Manœuvres) et Inventaire replié : la cible
  // n'existe/n'est visible qu'une fois un état contrôlé par la page basculé (onglet) ou une
  // section MUI `Collapse` dépliée (`visibility: hidden` tant que fermée). Chaque étape concernée
  // porte un hook natif `Step.before` (Promise), que `react-joyride` ATTEND nativement avant de se
  // positionner — l'étape n'est simplement pas encore affichée tant que la promesse ne résout pas
  // (aucun bouton cliquable pendant ce temps, donc aucun risque de double-clic pendant la
  // transition). PREMIER essai (abandonné) : un index de tour CONTRÔLÉ + une avancée différée
  // maison — fragile, un clic « Suivant » pendant que `react-joyride` scrollait encore vers
  // l'étape courante ne déclenchait jamais l'événement dont dépendait l'avancée, bloquant le tour
  // pour de bon (confirmé par une vraie run Playwright, pas un artefact de test). `pendingTourResolvers`
  // mémorise, PAR CLÉ ('stats' | 'voies' | 'equipment'), la fonction qui débloque le `before` en
  // attente ; les effets ci-dessous (déclenchés par le VRAI changement d'état, donc après commit)
  // et `onExpanded` de la section Inventaire (plus bas) l'appellent une fois la cible réellement prête.
  const pendingTourResolvers = useRef(
    new Map<'stats' | 'voies' | 'equipment' | 'notes' | 'history' | 'editing', () => void>(),
  );
  // Lues (jamais capturées par valeur) au moment où `Step.before` s'exécute, cf. `switchTab`
  // plus bas : `react-joyride` ne rafraîchit pas forcément son tableau `steps` interne rien
  // qu'au changement des fermetures (`before`) — son égalité ignore probablement les fonctions —
  // et pouvait donc rejouer une fermeture PÉRIMÉE capturée tôt (`statsView`/`voiesView` par
  // valeur), qui résolvait la promesse SANS que l'onglet ait réellement basculé (bug vécu sur le
  // retour en arrière : « Voies & capacités » sautée en repassant par « Manœuvres »). Un ref lu à
  // l'INVOCATION n'a pas ce problème, quel que soit le tableau `steps` que la lib utilise.
  const statsViewRef = useRef(statsView);
  const voiesViewRef = useRef(voiesView);
  useEffect(() => {
    statsViewRef.current = statsView;
    const resolve = pendingTourResolvers.current.get('stats');
    if (resolve) {
      pendingTourResolvers.current.delete('stats');
      resolve();
    }
  }, [statsView]);
  useEffect(() => {
    voiesViewRef.current = voiesView;
    const resolve = pendingTourResolvers.current.get('voies');
    if (resolve) {
      pendingTourResolvers.current.delete('voies');
      resolve();
    }
  }, [voiesView]);
  // Même idiome que `statsViewRef`/`voiesViewRef` ci-dessus, pour les étapes du tour qui basculent
  // le mode édition global (« Modifier la fiche », « Illustration », « Modifier un bloc »).
  const editingBlocksRef = useRef(editingBlocks);
  useEffect(() => {
    editingBlocksRef.current = editingBlocks;
    const resolve = pendingTourResolvers.current.get('editing');
    if (resolve) {
      pendingTourResolvers.current.delete('editing');
      resolve();
    }
  }, [editingBlocks]);
  // Nœud DOM du 3ᵉ étage de l'en-tête (`StickySheetStatusBar`, portée plus bas) : Hook, donc
  // ICI, avant les retours anticipés — la garde `masterDerived` ne s'applique qu'au CONTENU
  // du portail, jamais à cet appel.
  const headerExtraRowSlot = useHeaderExtraRowSlot();
  // Contenu du header (fil d'Ariane, accent, action « Modifier », voyant de session) : calculé
  // ICI à partir de doublons LÉGERS des dérivations post-garde ci-dessous (`characterClass`,
  // `ancestry`, `currentCampaign`, `firearmsAllowed` — de simples lectures de Map/tableau déjà
  // chargés, aucun recalcul de règles), car un Hook comme `useHeaderContent` doit s'appeler
  // AVANT tout retour anticipé, alors que `character`/`game` n'y sont pas encore garantis.
  const headerCharacterClass = character ? classById.get(character.classId) : undefined;
  const headerAncestry = character ? ancestryById.get(character.ancestryId) : undefined;
  const headerCurrentCampaign = character?.campaignId
    ? campaigns.find((c) => c.id === character.campaignId)
    : undefined;
  useHeaderContent(
    !character
      ? {}
      : {
          breadcrumbs: character.campaignId
            ? [
                {
                  label: headerCurrentCampaign?.name ?? 'la campagne',
                  href: hrefFromIndex('/campaign', campaignSlugIndex, character.campaignId),
                },
                { label: character.name || 'Sans nom' },
              ]
            : [{ label: character.name || 'Sans nom' }],
          // Teinte l'en-tête à la couleur du profil principal — repli neutre tant que le
          // profil n'est pas défini.
          accentColor: headerCharacterClass ? classColor(headerCharacterClass.id) : undefined,
          // Lien « Écran de MJ » si l'utilisateur est le MJ de la campagne du personnage :
          // `currentCampaign` n'est résolu que depuis le store des campagnes POSSÉDÉES (RLS
          // owner), donc défini ⟺ utilisateur propriétaire/MJ. Absent pour un joueur.
          gmScreenCampaignId: headerCurrentCampaign?.id,
          sessionIndicator: (
            <SessionHeaderIndicator campaignId={character.campaignId} identity={sessionIdentity} />
          ),
          restingLabel: 'Fiche de personnage',
          subtitle: (
            <CharacterIdentityLine
              dense
              ancestryName={headerAncestry?.name}
              characterClass={headerCharacterClass}
              firearmsAllowed={firearmsEffective(character, headerCurrentCampaign)}
              priestVocation={character.priestVocation}
              level={character.level}
            />
          ),
          subtitleVisible: scrolledPastHeader,
          // Icône de relance du tour guidé (PER-426) + bouton « Modifier »/« Terminer » : COMPOSÉS
          // dans un même `Stack` plutôt que l'un écrasant l'autre (retour propriétaire, PER-425) —
          // l'icône d'aide reste absente en lecture seule sous mobile/tactile (tour désactivé).
          action:
            tour.helpVisible || !readOnly ? (
              <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                {tour.helpVisible && (
                  <AppTooltip title="Revoir le tutoriel" disableInteractive>
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
                  </AppTooltip>
                )}
                {!readOnly && (
                  <Button
                    data-tour="character-sheet-modify-page"
                    color="inherit"
                    size="small"
                    startIcon={allEditing ? <DoneIcon /> : <EditIcon />}
                    onClick={toggleAllEditing}
                    // Compact : n'impose pas la hauteur du sous-header (sinon la hauteur de ce
                    // bouton devient le plancher et `minHeight` de la barre n'a plus d'effet).
                    sx={{ py: 0.25, minHeight: 0 }}
                  >
                    {allEditing ? 'Terminer' : 'Modifier'}
                  </Button>
                )}
              </Stack>
            ) : undefined,
        },
  );

  // Spinner tant que le staging local n'est pas relu, ou que le chargement cloud
  // est en cours sans avoir encore trouvé la fiche (évite un « introuvable » fugace
  // sur accès direct à l'URL avant que le cloud ait répondu).
  if (!hasHydrated || ((status === 'idle' || status === 'loading') && !character)) {
    return (
      <>
        <HomeBackground />
        <CharacterSheetSkeleton />
      </>
    );
  }

  // `game` accompagne `character` (le hook renvoie `null` pour lui seul) : la garde couvre les deux
  // pour que le reste du composant les manipule sans test de nullité.
  if (!character || !game) {
    return (
      <Container maxWidth="sm" sx={{ py: 8, textAlign: 'center' }}>
        <title>Personnage introuvable — Éditeur de personnage CO2</title>
        <Typography variant="h6" gutterBottom>
          Personnage introuvable
        </Typography>
        <Button startIcon={<ArrowBackIcon />} component={Link} href="/">
          Retour à l’accueil
        </Button>
      </Container>
    );
  }

  const characterClass = classById.get(character.classId);
  const family = characterClass ? familyById.get(characterClass.familyId) : undefined;
  const ancestry = ancestryById.get(character.ancestryId);

  const handleSelectStaticPortrait = (v: StaticPortraitVariant) => {
    if (character.portraitVariant === 'custom') {
      removeCharacterPortrait(character.id)
        .then(() => invalidateCharacterPortraitCache(character.id))
        .catch((e) => console.error('Retrait du portrait personnalisé échoué :', e));
    }
    setPortraitError(null);
    update({ portraitVariant: v });
  };

  const handleSelectPortraitFile = async (file: File, cropRect: PortraitCropRect) => {
    setPortraitError(null);
    setPortraitBusy(true);
    try {
      await uploadCharacterPortrait(character.id, file, cropRect);
      invalidateCharacterPortraitCache(character.id);
      update({ portraitVariant: 'custom' });
    } catch (e) {
      setPortraitError(
        e instanceof PortraitValidationError ? e.message : "Échec de l'envoi de l'image.",
      );
    } finally {
      setPortraitBusy(false);
    }
  };

  // État de jeu (PER-257) : tout ce qui suit vient du hook — `update` (sauvegarde permissive :
  // chaque modification persiste immédiatement, le store applique `updatedAt`, aucun écart aux
  // règles n'est empêché — PER-45), la vue dérivée partagée avec l'écran de MJ, les maxima
  // effectifs des jauges, et les actions de jeu. La fiche n'en garde que le CÂBLAGE : les
  // setters du mode « Modifier » ci-dessous et les modales (dont l'état React reste local).
  const {
    update,
    derived: {
      modFeatureIds,
      effectContext: effectCtx,
      derivedInput,
      defenseBadges,
      meleeCriticalRanges,
      rangedCriticalRanges,
      unarmed,
      meleeWeaponDamage,
      offHandMeleeWeaponDamage,
      offHandCriticalRanges,
      offHandTouchDelta,
      twoWeaponPenaltyDie,
      unarmedCriticalRanges,
      rangedWeaponDamage,
      meleeSituationalDamage,
      offHandMeleeSituationalDamage,
      rangedSituationalDamage,
      meleeAttackNotes,
      rangedAttackNotes,
      rangedAttackMagicalSourceId,
      rangedAttackElement,
      rangedReplacingFormAttack: formAttackReplacingRanged,
      meleeReplacingFormAttack: formAttackReplacingMelee,
      activeDefenseOverride: defenseOverride,
      activeDefenseOverrideSource: defenseOverrideSource,
      activeInitiativeOverride: initiativeOverride,
      activeInitiativeOverrideSource: initiativeOverrideSource,
    },
    derivedCharacter,
    masterDerived,
    manaMax,
    luckMax,
    recoveryDiceMax,
    recoveryDie,
    capacityGauges,
    elixirDosesToLose,
    setEffectToggleValue,
    setEffectInputValue,
    setUsageCounterValue,
    liftShortRestLock,
    createElixir,
    setActiveCrystal,
    applyItemUse,
    openCoinPouch,
    openPotion,
    resolveStartingChoice,
    setWorn,
    setPurse,
    fireWeaponShot,
    loadWeaponShot,
    refillWeaponShots,
    spendItemCharge,
    restoreItemCharge,
    refillItemCharges,
    weaponLoading,
    addGrantedEquipment,
    giveItem,
    setHpDamage,
    setHpHeal,
    setHpReset,
    setManaSpend,
    setManaRestore,
    setManaReset,
    setLuckSpend,
    setLuckRestore,
    setLuckReset,
    setDrCurrent,
    doShortRest,
    doLongRest,
    recoveryHealBonuses,
    setCompanionDamage,
    setCompanionHeal,
    setCompanionReset,
    summonCompanionInstance,
    summonOpenRosterCreature,
    deleteCompanionInstance,
    setTransformationDamage,
    setTransformationHeal,
    setTransformationReset,
    spendTransformationRecoveryDie,
    addMount,
    removeMount,
    setMountBarde,
    setMountDamage,
    setMountHeal,
    setMountReset,
    setMountMounted,
    setMountedTarget,
  } = game;
  // Bascule d'onglet (étapes du tour à onglet secondaire, cf. `tourSteps` plus bas) : résout
  // IMMÉDIATEMENT si déjà sur le bon onglet (un `setState` sur une valeur INCHANGÉE ne déclenche
  // aucun re-render, donc aucun effet à attendre — piège vécu), sinon mémorise le résolveur (clé
  // `stats`/`voies`, une des deux sections à onglets) et bascule ; l'effet correspondant de la
  // page (déclenché par le VRAI changement d'état) résout. `currentRef` (PAS la valeur captée par
  // le rendu qui a créé cette fermeture) : `react-joyride` ne rafraîchit pas forcément son
  // tableau `steps` interne au seul changement des fermetures `before` (son égalité ignore
  // probablement les fonctions) et pouvait rejouer une fermeture PÉRIMÉE — un ref, lui, est
  // toujours lu À L'INVOCATION, jamais périmé (bug vécu : retour en arrière sautant une étape).
  // Simple CONST (jamais appelée pendant le rendu, seulement plus tard par `react-joyride` via
  // `Step.before`) — contrairement à une fonction ELLE-MÊME appelée pendant le rendu, fermer sur
  // un ref ici ne déclenche pas la règle ESLint de ce dépôt qui interdit d'accéder à un ref
  // PENDANT le rendu (elle ne s'applique qu'aux accès qui se produisent AU MOMENT du rendu).
  const switchTab = <V extends string>(
    key: 'stats' | 'voies',
    currentRef: { current: V },
    target: V,
    setView: (v: V) => void,
  ): Promise<void> =>
    new Promise((resolve) => {
      if (currentRef.current === target) {
        resolve();
        return;
      }
      pendingTourResolvers.current.set(key, resolve);
      setView(target);
    });
  // Dépliage de l'Inventaire (repliée par défaut) : toujours incrémenté (compteur monotone, donc
  // TOUJOURS une valeur neuve) — que la section soit déjà ouverte ou non, `SheetSection` finit
  // toujours par rappeler `onExpanded` (immédiatement si déjà ouverte, après l'animation sinon),
  // qui résout la promesse (cf. son câblage sur la section « Inventaire » plus bas).
  const expandEquipment = (): Promise<void> =>
    new Promise((resolve) => {
      pendingTourResolvers.current.set('equipment', resolve);
      setEquipmentJumpNonce((n) => n + 1);
    });
  // Bascule le mode édition GLOBAL vers l'état voulu (étapes « Modifier la fiche »/« Illustration »/
  // « Modifier un bloc ») — même idiome que `switchTab` : résout IMMÉDIATEMENT si déjà dans l'état
  // voulu (piège vécu sur les onglets, cf. `switchTab`), sinon bascule et attend le VRAI commit
  // (l'effet sur `[editingBlocks]` plus haut) avant de résoudre. Nécessaire pour « Illustration »
  // en particulier : son menu (`PortraitVariantMenu`) n'est monté que si `editingBlocks.identity`
  // est vrai — y arriver directement (ex. Précédent depuis « Modifier un bloc », lecture seule)
  // doit attendre que le menu soit réellement monté avant que le tour ne s'y positionne.
  const ensureEditing = (target: boolean): Promise<void> =>
    new Promise((resolve) => {
      const current = EDIT_BLOCKS.every((k) => editingBlocksRef.current[k]);
      if (current === target) {
        resolve();
        return;
      }
      pendingTourResolvers.current.set('editing', resolve);
      setEditingBlocks(target ? ALL_EDIT : NO_EDIT);
    });
  // Défilement MANUEL vers la cible d'une étape (chaque étape porte `skipScroll: true`, cf.
  // `tourSteps` plus bas) — abandon complet du calcul de défilement de `react-joyride`
  // (`getScrollTo`), qui s'est révélé peu fiable sur cette page : mesures à l'appui (retours
  // manuels du propriétaire), deux cibles à la même position DOCUMENT (une paire d'onglets,
  // même emplacement puisque l'une remplace l'autre) obtenaient des `scrollY` finaux
  // incohérents, y compris une vraie RÉGRESSION du scroll sur Bourse→Inventaire (`scrollY` qui
  // recule au lieu d'avancer). `scrollIntoView({block:'center'})` est le même mécanisme déjà
  // éprouvé sur cette page pour l'icône d'arme (PER-116, « aller à l'arme ») — centrer plutôt que
  // caler en haut évite aussi d'avoir à connaître la hauteur de l'en-tête collé. Pas d'événement
  // de fin fiable multi-navigateurs pour un `scrollIntoView` fluide (pas d'événement `scrollend`
  // universel à cette version de navigateurs ciblée) : on SONDE `window.scrollY` à chaque frame
  // et on résout une fois qu'il n'a plus bougé pendant quelques frames d'affilée. Un délai FIXE
  // (essayé d'abord, ~450 ms) s'est révélé insuffisant pour une cible lointaine (ex. « Notes »,
  // ~4800px plus bas que « Inventaire ») : `react-joyride` positionnait alors sa bulle contre une
  // cible encore en plein défilement. Le filet de sécurité (`MAX_WAIT_MS`) évite un blocage si le
  // scroll ne se stabilise jamais (ex. cible déjà en place, `scrollIntoView` ne bouge rien).
  const scrollToTarget = (target: string): Promise<void> =>
    new Promise((resolve) => {
      document.querySelector(target)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const STABLE_FRAMES_NEEDED = 5;
      const MAX_WAIT_MS = 2000;
      const startedAt = Date.now();
      let lastY = window.scrollY;
      let stableFrames = 0;
      const check = () => {
        const y = window.scrollY;
        if (y === lastY) stableFrames += 1;
        else {
          stableFrames = 0;
          lastY = y;
        }
        if (stableFrames >= STABLE_FRAMES_NEEDED || Date.now() - startedAt > MAX_WAIT_MS) {
          resolve();
          return;
        }
        requestAnimationFrame(check);
      };
      requestAnimationFrame(check);
    });
  // Étapes du tour guidé (PER-426) : UN SEUL tour long couvrant les grandes zones de la page,
  // dans l'ordre où elles apparaissent à l'écran — pas de mini-tours par section (cadrage
  // explicite du ticket, l'utilisateur peut Passer à tout moment). Chaque cible vise le CONTENU
  // réel de sa section (grille de caractéristiques, panneau de stats, barre de vie…), jamais son
  // en-tête ni son bandeau d'onglets (retour propriétaire — le tour doit montrer CE QUE la
  // section fait, pas juste la nommer). « Statistiques dérivées » et « Voies & capacités » ont
  // chacune deux étapes (un onglet chacune), et l'Inventaire est replié par défaut : ces quatre
  // étapes portent un hook natif `Step.before` (Promise) qui bascule l'onglet/déplie la section
  // et n'ATTEND que la cible soit RÉELLEMENT prête avant de résoudre — `react-joyride` attend
  // nativement cette promesse (aucun bouton cliquable pendant ce temps, donc aucune course
  // possible avec un clic de l'utilisateur, contrairement à un index de tour contrôlé bricolé à
  // la main, essayé puis abandonné pour cette raison : un clic pendant que la lib scrollait
  // encore vers l'étape courante ne déclenchait jamais l'événement dont dépendait l'avancée,
  // bloquant le tour pour de bon — confirmé par une vraie run Playwright, pas un artefact de
  // test). « État du personnage » est absente si le profil est incomplet (`masterDerived` nul,
  // la section elle-même ne rend rien) : step conditionnelle, comme `showPlayersStep` de l'écran
  // de MJ (PER-425).
  const tourSteps: Step[] = [
    {
      target: '[data-tour="character-sheet-abilities"]',
      title: 'Caractéristiques',
      content: (
        <>
          Vos sept caractéristiques —{' '}
          {ABILITY_IDS.map((id, i) => (
            <span key={id}>
              <AbilityCodeChip ability={id} noTooltip />
              {i < ABILITY_IDS.length - 1 ? ' ' : ''}
            </span>
          ))}
          , quatre physiques (AGI, CON, FOR, PER) et trois mentales (CHA, INT, VOL) — déterminent
          la puissance globale de votre personnage : attaque et dégâts au contact, esquive,
          résistance, initiative, magie… Elles sont déjà saisies ici — les dés se lancent en vrai
          à la table, rien n’est tiré automatiquement.
        </>
      ),
      placement: 'bottom',
      skipScroll: true,
      before: () => scrollToTarget('[data-tour="character-sheet-abilities"]'),
    },
    {
      target: '[data-tour="character-sheet-derived"]',
      title: 'Statistiques dérivées',
      content:
        'Défense, initiative, attaques et jauges (PV, mana…) se calculent à partir de vos caractéristiques et capacités.',
      placement: 'bottom',
      skipScroll: true,
      before: () =>
        switchTab('stats', statsViewRef, 'derived', setStatsView).then(() =>
          scrollToTarget('[data-tour="character-sheet-derived"]'),
        ),
    },
    {
      target: '[data-tour="character-sheet-tests"]',
      title: 'Compétences & tests',
      content:
        'Le détail de vos bonus de test par domaine (bonus d’aptitude, dés supplémentaires, malus d’armure…) — le second onglet de « Statistiques dérivées ».',
      placement: 'bottom',
      skipScroll: true,
      before: () =>
        switchTab('stats', statsViewRef, 'tests', setStatsView).then(() =>
          scrollToTarget('[data-tour="character-sheet-tests"]'),
        ),
    },
    ...(masterDerived
      ? [
          {
            target: '[data-tour="character-sheet-status"]',
            title: 'État du personnage',
            content:
              'Votre barre de vie affiche les points de vie actuels et se met à jour selon vos capacités. En dessous, Repos court et Repos long appliquent votre récupération — dés de récupération, mana et chance inclus.',
            placement: 'bottom' as const,
            skipScroll: true,
            before: () => scrollToTarget('[data-tour="character-sheet-status"]'),
          },
        ]
      : []),
    {
      target: '[data-tour="character-sheet-features"]',
      title: 'Voies & capacités',
      content: 'Vos voies et capacités acquises, avec leurs règles et effets à activer directement depuis la fiche.',
      placement: 'bottom',
      skipScroll: true,
      before: () =>
        switchTab('voies', voiesViewRef, 'features', setVoiesView).then(() =>
          scrollToTarget('[data-tour="character-sheet-features"]'),
        ),
    },
    {
      target: '[data-tour="character-sheet-maneuvers"]',
      title: 'Manœuvres',
      content:
        'Un aide-mémoire des manœuvres de combat (feinte, bousculade, désarmement…), en lecture seule — le second onglet de « Voies & capacités ».',
      placement: 'bottom',
      skipScroll: true,
      before: () =>
        switchTab('voies', voiesViewRef, 'maneuvers', setVoiesView).then(() =>
          scrollToTarget('[data-tour="character-sheet-maneuvers"]'),
        ),
    },
    {
      target: '[data-tour="character-sheet-purse"]',
      title: 'Bourse',
      content: 'Vos pièces d’or, d’argent et de cuivre — modifiables directement ici, hors mode Modifier.',
      placement: 'bottom',
      skipScroll: true,
      before: () => expandEquipment().then(() => scrollToTarget('[data-tour="character-sheet-purse"]')),
    },
    {
      target: '[data-tour="character-sheet-inventory"]',
      title: 'Inventaire',
      content:
        'Vos armes, armures et objets portés ou transportés — équipez, utilisez ou donnez un objet directement depuis cette liste.',
      placement: 'bottom',
      skipScroll: true,
      before: () => expandEquipment().then(() => scrollToTarget('[data-tour="character-sheet-inventory"]')),
    },
    {
      target: '[data-tour="character-sheet-notes"]',
      title: 'Notes',
      content: 'Vos notes libres — et vos notes de session pendant une partie en cours.',
      placement: 'bottom',
      skipScroll: true,
      before: () =>
        new Promise<void>((resolve) => {
          pendingTourResolvers.current.set('notes', resolve);
          setNotesJumpNonce((n) => n + 1);
        }).then(() => scrollToTarget('[data-tour="character-sheet-notes"]')),
    },
    {
      target: '[data-tour="character-sheet-history"]',
      title: 'Historique des niveaux',
      content: 'L’historique retrace vos choix à chaque montée de niveau.',
      placement: 'bottom',
      skipScroll: true,
      before: () =>
        new Promise<void>((resolve) => {
          pendingTourResolvers.current.set('history', resolve);
          setHistoryJumpNonce((n) => n + 1);
        }).then(() => scrollToTarget('[data-tour="character-sheet-history"]')),
    },
    // Trois dernières étapes, PUREMENT informatives (cadrage propriétaire) : le mode édition de
    // la page dans son ensemble, le changement d'illustration (qui exige ce mode édition, gaté
    // par `editingBlocks.identity`), puis l'édition indépendante par bloc. La 1re et la 2e
    // laissent TOUT en édition (`ensureEditing(true)`, idempotent — pas de re-bascule inutile en
    // passant de l'une à l'autre) ; la 3e repasse TOUT en lecture avant de s'afficher, sans quoi
    // le message « chaque bloc s'édite indépendamment » n'aurait pas de sens en pleine édition
    // globale. Absentes en lecture seule (`readOnly`) : le bouton « Modifier », le menu
    // d'illustration et les crayons par bloc ne sont eux-mêmes jamais rendus pour une fiche qu'on
    // ne peut pas éditer — leur cible n'existe pas, ces trois étapes n'ont donc rien à montrer.
    ...(readOnly
      ? []
      : [
          {
            target: '[data-tour="character-sheet-modify-page"]',
            title: 'Modifier la fiche',
            content:
              'Ce bouton bascule toute la fiche en mode édition — caractéristiques, capacités, équipement, identité…',
            placement: 'bottom' as const,
            skipScroll: true,
            before: () =>
              ensureEditing(true).then(() => scrollToTarget('[data-tour="character-sheet-modify-page"]')),
          },
          {
            target: '[data-tour="character-sheet-illustration"]',
            title: 'Illustration',
            content:
              'En mode édition, cliquez sur le portrait pour changer l’illustration du personnage via ce menu.',
            placement: 'bottom' as const,
            skipScroll: true,
            before: () =>
              ensureEditing(true).then(() => scrollToTarget('[data-tour="character-sheet-illustration"]')),
          },
          {
            target: '[data-tour="character-sheet-modify-block"]',
            title: 'Modifier un seul bloc',
            content:
              'Chaque section de la fiche a aussi son propre crayon, comme celui-ci sur « Caractéristiques » — pratique pour ne modifier qu’un bloc sans passer toute la fiche en édition.',
            placement: 'bottom' as const,
            skipScroll: true,
            before: () =>
              ensureEditing(false).then(() => scrollToTarget('[data-tour="character-sheet-modify-block"]')),
          },
        ]),
  ];
  // Attribution de campagne (PER-180) : rattache le personnage à une campagne ou le
  // remet « Non attribué » (`null`). Le joueur étant local à la campagne, on le
  // réinitialise à chaque changement (l'attribution d'un joueur relève de PER-184).
  const setCampaign = (campaignId: string | null) => update({ campaignId, playerId: null });
  // Réattribution permissive du joueur (PER-184), local à la campagne : le MJ
  // change (ou vide) le joueur qui incarne le personnage. Écriture cloud + RLS
  // owner ; le trigger 0002 gèle `player_id` côté joueur (lui ne réattribue pas).
  const setPlayer = (playerId: string | null) => update({ playerId });
  // Campagne de rattachement résolue (undefined si « Non attribué » ou FK orpheline).
  const currentCampaign = character.campaignId
    ? campaigns.find((c) => c.id === character.campaignId)
    : undefined;
  // Roster de confiance : uniquement si le store a chargé la campagne courante
  // (sinon on éviterait d'afficher les joueurs d'une autre campagne).
  const roster = playersCampaignId === character.campaignId ? players : [];
  const currentPlayer = character.playerId
    ? roster.find((p) => p.id === character.playerId)
    : undefined;
  // Destination du raccourci de recréation (perso mort rattaché à une campagne,
  // cf. bouton plus bas) : même campagne + même joueur pré-remplis. Calculée ici
  // en amont pour rendre le bouton en vraie ancre (Ctrl/⌘+Clic → nouvel onglet).
  const recreateParams = new URLSearchParams();
  if (character.campaignId) recreateParams.set('campaign', character.campaignId);
  if (character.playerId) recreateParams.set('player', character.playerId);
  const recreateHref = `/create?${recreateParams.toString()}`;
  // Autorisation EFFECTIVE des armes à feu (règle campagne ∧ choix perso, PER-185).
  // Valeur unique lue partout où comptait `character.firearmsAllowed` : nom affiché,
  // conformité, level-up. Le snapshot `character.firearmsAllowed` reste figé (choix
  // de création) ; c'est la campagne qui filtre en aval, sans jamais muter le perso.
  const firearmsAllowed = firearmsEffective(character, currentCampaign);
  // Règle maison « dé de vie à la montée de niveau » (PER-87) : disponible seulement
  // si la campagne de rattachement l'active. « Non attribué » ⇒ règle inactive
  // (comportement historique : PV fixes). N'a d'effet que dans le wizard de montée.
  const hitDieOnLevelUp = currentCampaign?.rules.hitDieOnLevelUp ?? false;

  // Statut du personnage (PER-183) : modifiable par le MJ ET le joueur (la RLS
  // l'autorise ; la vue campagne, owner-only, ne suffit pas). `active` ↔
  // `dead`/`retired` réversible, mais l'archivage (acte narratif) est confirmé.
  const STATUS_LABEL: Record<CharacterStatus, string> = {
    active: 'Vivant',
    dead: 'Mort',
    retired: 'Retraité',
  };
  // Explication brève affichée au survol du marqueur de statut, à côté du nom.
  const STATUS_TOOLTIP: Record<Exclude<CharacterStatus, 'active'>, string> = {
    dead: 'Personnage mort. Statut réversible : repassez-le « Vivant » en mode édition.',
    retired: 'Personnage à la retraite. Statut réversible : repassez-le « Vivant » en mode édition.',
  };
  const statusIcon = (status: CharacterStatus) =>
    status === 'dead' ? (
      <TombstoneIcon fontSize="small" />
    ) : status === 'retired' ? (
      <Inventory2Icon fontSize="small" />
    ) : (
      <MonitorHeartIcon fontSize="small" />
    );
  // Sélection d'un statut dans le menu : « actif » s'applique directement ; un
  // archivage (mort/retiré) passe par une confirmation avant écriture.
  const selectStatus = (next: CharacterStatus) => {
    setStatusAnchor(null);
    if (next === character.status) return;
    if (next === 'active') update({ status: 'active' });
    else setPendingArchive(next);
  };
  // Édition d'une caractéristique finale : on réajuste la valeur de base pour
  // conserver l'invariant « base + modificateurs de peuple = total » (le détail
  // affiché reste exact). Le modificateur de peuple, lui, ne bouge pas.
  const setAbility = (abilityId: AbilityId, value: number) => {
    const delta = ancestry ? modifierDeltas(ancestry, character.ancestryChoices)[abilityId] : 0;
    update({
      abilities: { ...character.abilities, [abilityId]: value },
      baseAbilities: { ...character.baseAbilities, [abilityId]: value - delta },
    });
  };
  const setIdentity = (identityPatch: Partial<Identity>) =>
    update({ identity: { ...character.identity, ...identityPatch } });
  const setEquipment = (equipment: EquipmentLine[]) => update({ equipment });
  // L'édition des capacités élague les choix orphelins (capacité retirée → ses
  // choix persistés sont supprimés), pour ne pas conserver de choix fantôme.
  const setFeatureIds = (featureIds: string[]) => {
    // Purge d'ABORD les instances de compagnons multi-instances (zombies, PER-235) dont la
    // capacité a disparu, PUIS les PV : `pruneCompanionDepletion` énumère les compagnons via
    // `listCompanions`, qui dérive les clés composites des instances survivantes → les PV des
    // instances retirées sont ainsi purgés en cohérence.
    const companionInstances = pruneCompanionInstances(character.companionInstances, { ...character, featureIds });
    update({
      featureIds,
      levelUpHistory: recordManualFeatureChange(character, featureIds),
      featureChoices: pruneFeatureChoices(character.featureChoices, featureIds),
      effectToggles: pruneEffectToggles(character.effectToggles, featureIds),
      effectInputs: pruneEffectInputs(character.effectInputs, featureIds),
      usageCounters: pruneUsageCounters(character.usageCounters, featureIds),
      depletion: pruneDepletion(character.depletion),
      // Purge les PV des compagnons désormais disparus (rang non acquis après un respec /
      // une baisse de niveau) — cf. `pruneCompanionDepletion` (PER-233). L'objet mis à jour
      // n'est pas encore appliqué, mais l'énumération se base sur les nouveaux `featureIds`.
      companionDepletion: pruneCompanionDepletion(character.companionDepletion, {
        ...character,
        featureIds,
        companionInstances,
      }),
      companionInstances,
      // Purge les PV de la forme active si sa capacité vient d'être perdue (respec / baisse de
      // niveau) — cf. `pruneTransformationDepletion` (PER-374).
      transformationDepletion: pruneTransformationDepletion(character.transformationDepletion, {
        ...character,
        featureIds,
      }),
    });
  };
  // Résolution rétroactive d'un choix porté par une capacité (PER-66/68). La
  // fiche est permissive : on persiste sans bloquer (recalcul en direct).
  const setChoice = (featureId: string, index: number, value: FeatureChoiceSelection) =>
    update({ featureChoices: setFeatureChoice(character, featureId, index, value) });
  // Utiliser un objet (PER-158) : consommer une unité est un état de jeu (hors édition).
  // L'action de jeu renvoie une INTENTION — deux objets du sac de départ n'y sont pas consommés
  // mais ouvrent une modale de saisie : la « Bourse de 2d6 pa » (p. 31), dont les pa tirés
  // s'ajoutent à la fortune (PER-152), et un choix d'équipement « X ou Y » (PER-220).
  const handleUseItem = (index: number) => {
    const intent = applyItemUse(index);
    if (intent.kind === 'starting-choice') setChoiceIndex(intent.index);
    else if (intent.kind === 'coin-pouch') setCoinPouchIndex(intent.index);
    else if (intent.kind === 'potion')
      setPotionUse({
        index: intent.index,
        resource: intent.resource,
        die: intent.die,
        count: intent.count,
        ...(intent.evolving ? { evolving: true as const } : {}),
        ...(intent.modifier ? { modifier: intent.modifier } : {}),
      });
  };
  // Validation de la modale de bourse : ajoute `silver` pa à la fortune et consomme la dose.
  const confirmCoinPouch = (silver: number) => {
    if (coinPouchIndex === null) return;
    openCoinPouch(coinPouchIndex, silver);
    setCoinPouchIndex(null);
  };
  // Validation de la modale de potion (PER-XXX) : restaure `amount` sur la ressource visée et
  // consomme la dose.
  const confirmPotion = (amount: number) => {
    if (!potionUse) return;
    openPotion(potionUse.index, amount);
    setPotionUse(null);
  };
  // Validation d'un choix d'équipement de départ (PER-220) : remplace la ligne placeholder
  // par le(s) vrai(s) objet(s) du catalogue de l'option retenue (un LOT en produit plusieurs).
  const confirmStartingChoice = (option: StartingEquipmentChoiceOption) => {
    if (choiceIndex === null) return;
    resolveStartingChoice(choiceIndex, option);
    setChoiceIndex(null);
  };

  // Surcharge d'une stat dérivée (PER-48) : une valeur force le calcul, `null`
  // supprime la clé et rétablit le calcul automatique.
  const setOverride = (key: DerivedStatId, value: number | null) => {
    const next = { ...character.overrides };
    if (value === null) delete next[key];
    else next[key] = value;
    update({ overrides: next });
  };

  // Conformité aux règles : recalculée à chaque rendu (donc en direct pendant
  // l'édition). Non bloquante — simple aide affichée (PER-47).
  const warnings = checkCompliance(character, rulesContext, firearmsAllowed);
  // Contenu payant « Le Compagnon » (PER-321) encore en cours de fusion : le temps qu'il
  // arrive, un peuple/une voie/une capacité payante référencée par le personnage n'est pas
  // encore dans les registres — `checkCompliance` ci-dessus remonte alors de FAUX écarts
  // `UNKNOWN_FEATURE`. On les détecte pour afficher un loader neutre à la place (cf.
  // `ComplianceWarnings`) et pour squeletter la section « Voies & capacités » en dessous.
  const pendingPaidFeatures =
    paidContentLoading && warnings.some((w) => w.code === 'UNKNOWN_FEATURE');

  // Dérivations d'AFFICHAGE (PER-262) : tout ce que les blocs « Caractéristiques »,
  // « Statistiques dérivées » et « Compétences & tests » attendent en props — modificateurs
  // permanents de caractéristiques, dés bonus, bonus par domaine de test, malus d'armure,
  // sources de l'infobulle « i »… La fiche ne les calcule plus : elle les lit depuis le module
  // partagé avec le panneau latéral de l'écran de MJ (PER-258), qui porte le détail des règles.
  // Impact CHIFFRÉ résolu (pur) : deltas DEF/Init./attaques à fondre dans le calcul, ventilation
  // pour le détail « i », et drapeaux de dé malus / malus plats. `null` si aucun état actif.
  const statusImpact = appliedStatuses.length > 0 ? statusSheetImpact(appliedStatuses) : null;
  const display = buildSheetDisplayView(
    // Personnage vu par le CALCUL (PER-314) : mêmes interrupteurs neutralisés que ceux dont
    // `game.derived` découle, pour que la fiche ne montre pas un bonus que le moteur ne compte plus.
    derivedCharacter,
    game.derived,
    masterDerived ? (character.overrides.maxHp ?? masterDerived.maxHp) : undefined,
    statusImpact ?? undefined,
  );
  // Entrée moteur AJUSTÉE par les états : on FOND les deltas dans `mods` pour que DEF/Init./attaques
  // reflètent le malus, le détail « i » les attribuant à « État : … » (via `display.extraModSources`).
  // Les jauges (PV/mana) restent sur `masterDerived` NON ajusté : un état de combat ne change pas les
  // maxima. Reste `derivedInput` tel quel hors session ou sans état.
  const adjustedDerivedInput = derivedInput
    ? statusImpact
      ? { ...derivedInput, mods: mergeMods(derivedInput.mods ?? {}, statusImpact.mods) }
      : derivedInput
    : null;
  // Dé malus aux tests d'attaque, tous états confondus (Affaibli = tous les tests, Immobilisé =
  // attaques seules) → badge « double-d20 barré » sur les trois cartes d'attaque.
  const attackMalusDie = statusImpact
    ? [...statusImpact.allTestsMalusDie, ...statusImpact.attackTestsMalusDie]
    : [];

  // PER-374 — forme active à PV propres (formes élémentaires) : grise la barre de PV réelle et
  // fait apparaître une jauge dédiée, alimentée sous la clé du rang qui octroie la transformation.
  const activeTransformation = activeTransformationWithHp(character);

  // Valeurs EFFECTIVES (surcharge manuelle incluse) pour la barre condensée collée au défilement
  // (`StickySheetStatusBar`) : même logique que les cartes de « Statistiques dérivées », dupliquée
  // ici en miniature plutôt que remontée depuis `DerivedStatsGrid`, qui ne renvoie rien à l'appelant.
  const stickyDerived = adjustedDerivedInput ? deriveStats(adjustedDerivedInput) : null;
  // PER-374 : DEF imposée par une transformation active (`defenseOverride`) prime sur le calcul
  // normal, mais reste dominée par une surcharge manuelle du joueur/MJ — même ordre de priorité
  // que `DerivedStatsGrid` (cf. `formForced`).
  const stickyDefense = character.overrides.def ?? defenseOverride ?? stickyDerived?.defense ?? null;
  const stickyInitiative = character.overrides.initiative ?? stickyDerived?.initiative ?? null;
  const stickyMeleeAttack = character.overrides.meleeAttack ?? stickyDerived?.meleeAttack ?? null;
  const stickyRangedAttack = character.overrides.rangedAttack ?? stickyDerived?.rangedAttack ?? null;
  const stickyMagicAttack = character.overrides.magicAttack ?? stickyDerived?.magicAttack ?? null;
  const pinnedDerivedStatIds = new Set(pinnedDerivedStatItems);
  const toggleDerivedStatItemPin = (id: UiDerivedStatId) => {
    setPinnedDerivedStatItems((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  // Rappel des états posés par le MJ (PER-281), remonté en tête d'« État du personnage » (PER-358),
  // au-dessus de la barre de vie. Cette section n'existe que si les stats dérivées sont calculables,
  // d'où ce bloc nommé, monté à la place historique pour un profil incomplet — les deux montages
  // sont exclusifs. Le joueur peut écarter un BUFF de sa seule fiche (croix), jamais un état subi.
  const sessionStatusBlock =
    appliedStatuses.length === 0 ? null : (
      <ActiveStatusPanel
        statuses={appliedStatuses}
        roundNumber={combatRoundNumber}
        // Le renoncement part AUSSI au MJ, seul habilité à retirer l'état de la bande d'initiative
        // (RLS `campaign_combat`) : sans quoi la puce y resterait, ici comme sur son écran.
        onWaiveBuff={
          isPlayer && !readOnly ? (buffId) => waiveBuff(characterCampaignId, id, buffId) : undefined
        }
        // Rendre un cristal confié (PER-360) n'est pas réservé au joueur : le MJ, qui consulte la
        // fiche du porteur, peut le lui reprendre. Le cristal repart ÉTEINT chez son propriétaire.
        onReleaseCrystal={readOnly ? undefined : (crystalId) => game.releaseCrystal(crystalId)}
        onDismountPassenger={readOnly ? undefined : () => game.releaseMountPassenger()}
      />
    );

  return (
    // Toutes les icônes de profil de la fiche (en-tête, voies, montée de niveau,
    // références d'emprunt…) suivent le réglage « armes à feu » du personnage :
    // l'arquebusier privé de poudre affiche une arbalète (« Arbalétrier », p. 62).
    <FirearmsAllowedProvider value={firearmsAllowed}>
      {/* Déclinaison des capacités par élément draconique (PER-74) : fourni au niveau de la PAGE, et
          non de la seule section des voies, pour couvrir aussi la modale de montée de niveau et
          l'historique — c'est précisément là qu'on choisit « Résistance %toThe% » au rang 5. */}
      <FeatureDeclensionContext.Provider value={character}>
      <CapabilityScrollProvider onScroll={scrollToCapability}>
      {/* Titre de l'onglet = nom du personnage. Rendu déclaratif (React 19 le
          hisse dans le <head>) plutôt que document.title dans un effet : sinon
          la métadonnée en streaming de Next réécrase le titre après hydratation
          (clignotement nom → titre de base). Réactif : suit l'édition du nom. */}
      <title>{`${character.name || 'Sans nom'} — Éditeur de personnage CO2`}</title>
      {/* Barre condensée Caractéristiques/Statistiques dérivées/État du personnage (retour
          propriétaire) : PORTÉE (`createPortal`) dans le 3ᵉ étage de l'en-tête global, désormais
          monté par `layout.tsx` — voir `useHeaderExtraRowSlot` pour le pourquoi (dérivation trop
          tardive pour transiter par le Hook `useHeaderContent`). Hérite ainsi du verre dépoli de
          l'`AppBar` sans wrapper propre. Chaque groupe n'y apparaît que si SON `PinSectionButton`
          est actif (retour propriétaire). */}
      {headerExtraRowSlot &&
        masterDerived &&
        createPortal(
          <StickySheetStatusBar
            showAbilities={pinAbilities}
            abilities={effectCtx.abilities}
            onJumpToAbilities={() => scrollToSection('abilities-section')}
            showDerivedStats={pinDerivedStats}
            onJumpToDerivedStats={() => scrollToSection('derived-stats-section')}
            showStatusGauges={pinStatusGauges}
            onJumpToStatusGauges={() => scrollToSection('status-section')}
            showInventory={pinInventory}
            onJumpToInventory={() => scrollToSection('equipment-section')}
            inventoryItemCount={character.equipment.length}
            purse={character.purse}
            showPurse={pinInventoryPurse}
            showCustomItemButton={pinInventoryCustomItem}
            onOpenCustomItem={() => setCustomItemOpenNonce((n) => n + 1)}
            maxHp={character.overrides.maxHp ?? masterDerived.maxHp}
            depletion={character.depletion}
            manaMax={manaMax}
            luckMax={luckMax}
            recoveryDiceMax={recoveryDiceMax}
            recoveryDiceCurrent={currentRecoveryDice(recoveryDiceMax, character.depletion)}
            recoveryDie={recoveryDie}
            onOpenShortRest={() => setShortRestOpen(true)}
            onOpenLongRest={() => setLongRestOpen(true)}
            pinnedRestItems={pinnedRestItemIds}
            defense={stickyDefense}
            initiative={stickyInitiative}
            meleeAttack={stickyMeleeAttack}
            rangedAttack={stickyRangedAttack}
            magicAttack={stickyMagicAttack}
            pinnedDerivedStatIds={pinnedDerivedStatIds}
            testBonuses={display.testBonuses}
            abilityTestBonus={display.abilityTestBonus}
            statusTestBonus={display.statusTestBonus}
            perAbilityTestBonus={display.perAbilityTestBonus}
            magicTestBonuses={display.magicTestBonuses}
            bonusDice={display.bonusDieSources}
            armorPenalty={display.armorPenalty}
          />,
          headerExtraRowSlot,
        )}

      {/* Fond de couverture (variante footer) : illustration ancrée au BAS DE LA
          PAGE. Rendue en `position: absolute` (voir HomeBackground) calée sur la
          colonne relative pleine hauteur du layout racine, elle se colle au bas du
          document et passe DERRIÈRE le pied de page global (verre semi-transparent),
          qui la laisse transparaître floutée — sans recouvrir le haut de la page.
          Aucun wrapper `relative` ici : ce serait la fiche (le contenu) qui servirait
          d'ancre et l'illustration se calerait alors au bas du contenu, PAS derrière
          le footer. */}
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Stack spacing={3}>
          {/* Session synchronisée (PER-264/PER-265) : le voyant + la présence live vivent
              désormais dans l'en-tête (`SessionHeaderIndicator`, PER-269), qui porte aussi
              le canal et le battement de présence de la fiche. */}
          {/* Bandeau lecture seule (PER-196) : session joueur consultant la fiche
              d'un colistier. Consultable (RLS roster) mais non éditable. */}
          {readOnly && (
            <AppAlert severity="info">
              Fiche d&apos;un autre joueur — consultation en lecture seule.
            </AppAlert>
          )}
          {/* En-tête : nom + peuple · profil · niveau, encadré par les illustrations
              du peuple (gauche) et du profil (droite), en filigrane semi-transparent */}
          <Box sx={{ position: 'relative' }}>
            <HeaderIllustrations
              ancestryId={ancestry?.id}
              classId={characterClass?.id}
              classPortraitSrc={classPortraitSrc}
              portraitCropRect={portraitCropRect}
            />
            {/* Attribution de campagne (PER-180), placée au-dessus du nom comme un fil
                de contexte : hors édition, badge (cliquable vers la vue campagne) ; en
                mode « Modifier », liste déroulante au même emplacement pour une
                cohérence visuelle avec le badge. */}
            <Stack
              direction="row"
              spacing={0.75}
              sx={{
                alignItems: 'center',
                color: 'text.secondary',
                flexWrap: 'wrap',
                position: 'relative',
                zIndex: 1,
                mb: 0.5,
              }}
            >
              <Typography variant="body2" component="span">
                Campagne :
              </Typography>
              {editingBlocks.identity && !isPlayer ? (
                <TextField
                  select
                  size="small"
                  variant="standard"
                  value={currentCampaign?.id ?? ''}
                  onChange={(e) => setCampaign(e.target.value || null)}
                  // Affiche le libellé de l'option vide (« Non attribué ») dans
                  // l'input plutôt qu'un blanc quand aucune campagne n'est choisie.
                  slotProps={{ select: { displayEmpty: true } }}
                  sx={{ minWidth: 160 }}
                >
                  <MenuItem value="">Non attribué</MenuItem>
                  {campaigns.map((c) => (
                    <MenuItem key={c.id} value={c.id}>
                      {c.name}
                    </MenuItem>
                  ))}
                </TextField>
              ) : (
                <CampaignBadge
                  name={currentCampaign?.name ?? null}
                  campaignId={currentCampaign?.id ?? null}
                />
              )}
              {/* Joueur qui incarne le personnage (PER-184), local à la campagne :
                  segment affiché seulement si le personnage est rattaché à une
                  campagne. Sélecteur en mode édition (réattribution, remise à vide
                  possible), badge sinon. */}
              {character.campaignId && (
                <>
                  <Typography variant="body2" component="span">
                    Joueur :
                  </Typography>
                  {editingBlocks.identity && !isPlayer ? (
                    <TextField
                      select
                      size="small"
                      variant="standard"
                      value={character.playerId ?? ''}
                      onChange={(e) => setPlayer(e.target.value || null)}
                      // Affiche « Aucun joueur » dans l'input quand aucun joueur
                      // n'est choisi, plutôt qu'un blanc.
                      slotProps={{ select: { displayEmpty: true } }}
                      sx={{ minWidth: 140 }}
                    >
                      <MenuItem value="">Aucun joueur</MenuItem>
                      {roster.map((p) => (
                        <MenuItem key={p.id} value={p.id}>
                          {p.name}
                        </MenuItem>
                      ))}
                    </TextField>
                  ) : (
                    <PlayerBadge name={currentPlayer?.name ?? null} />
                  )}
                </>
              )}
            </Stack>
            {/* Nom, précédé du marqueur de statut quand le personnage est archivé
                (mort / retraité) — même taille que le nom, tooltip explicatif. */}
            <Stack
              direction="row"
              spacing={1}
              sx={{ alignItems: 'center', position: 'relative', zIndex: 1 }}
            >
              {character.status !== 'active' && (
                <AppTooltip title={STATUS_TOOLTIP[character.status]}>
                  <Box
                    component="span"
                    sx={{
                      display: 'inline-flex',
                      color: 'text.secondary',
                      fontSize: (theme) => theme.typography.h4.fontSize,
                    }}
                  >
                    {character.status === 'dead' ? (
                      <TombstoneIcon fontSize="inherit" />
                    ) : (
                      <Inventory2Icon fontSize="inherit" />
                    )}
                  </Box>
                </AppTooltip>
              )}
              {editingBlocks.identity ? (
                <TextField
                  value={character.name}
                  onChange={(e) => update({ name: e.target.value })}
                  placeholder="Sans nom"
                  variant="standard"
                  fullWidth
                  sx={{
                    // Le cadre/filigrane du portrait de profil occupe le coin haut-droit
                    // du bloc titre (`HeaderIllustrations`) — sans cette limite, le
                    // soulignement plein-largeur du champ passait dessous (PER-394 retours).
                    maxWidth: { md: `calc(100% - ${FALLBACK_FRAME_WIDTH + 16}px)` },
                    '& .MuiInputBase-input': {
                      fontSize: (theme) => theme.typography.h4.fontSize,
                      fontWeight: 'bold',
                    },
                  }}
                />
              ) : (
                <Typography
                  variant="h4"
                  component="h2"
                  sx={{
                    fontWeight: 'bold',
                    // `overflowWrap: anywhere` (PER-228) : un nom d'un seul mot très long
                    // (sans espace où couper) ne déborde plus horizontalement sur mobile ;
                    // la taille du h4 est déjà réduite sur petit écran par responsiveFontSizes.
                    overflowWrap: 'anywhere',
                    // Un nom assez long pour passer à la ligne ne doit pas se faufiler
                    // sous le cadre/filigrane du portrait de profil (PER-394 retours).
                    maxWidth: { md: `calc(100% - ${FALLBACK_FRAME_WIDTH + 16}px)` },
                  }}
                >
                  {character.name || 'Sans nom'}
                </Typography>
              )}
            </Stack>
            {/* Ligne d'identité « peuple · profil · niveau ». La ref sert de sentinelle
                au défilement : quand elle passe sous la barre d'application collée, on
                révèle la même ligne en sous-titre du header et le bouton « Haut de page ». */}
            <CharacterIdentityLine
              ref={identityLineRef}
              ancestryName={ancestry?.name}
              characterClass={characterClass}
              firearmsAllowed={firearmsAllowed}
              priestVocation={character.priestVocation}
              level={character.level}
              sx={{ flexWrap: 'wrap', position: 'relative', zIndex: 1 }}
            />

            {/* Montée de niveau (PER-49) : toujours accessible (sauf en lecture
                seule d'une fiche qui n'est pas la sienne). Le niveau max (20) est une
                borne d'UI souple — on désactive simplement le bouton. */}
            {!readOnly && (
              <Box sx={{ mt: 1.5, position: 'relative', zIndex: 1 }}>
                <AppTooltip
                  title={
                    character.level >= progression.maxLevel
                      ? `Niveau maximum (${progression.maxLevel}) atteint`
                      : ''
                  }
                >
                  <span>
                    <Button
                      variant="contained"
                      startIcon={<UpgradeIcon />}
                      disabled={character.level >= progression.maxLevel}
                      onClick={() => setLevelUpOpen(true)}
                    >
                      Monter au niveau suivant
                    </Button>
                  </span>
                </AppTooltip>
              </Box>
            )}

            {/* Raccourci de recréation (PER-184) : quand le personnage est mort et
                rattaché à une campagne, lance la création d'un nouveau personnage
                pré-rempli avec la même campagne et le même joueur (le défunt reste
                archivé, son historique préservé). */}
            {character.status === 'dead' && character.campaignId && !readOnly && (
              <Box sx={{ mt: 1, position: 'relative', zIndex: 1 }}>
                <Button
                  variant="outlined"
                  startIcon={<PersonAddIcon />}
                  component={Link}
                  href={recreateHref}
                >
                  {currentPlayer
                    ? `Créer un nouveau personnage pour ${currentPlayer.name}`
                    : 'Créer un nouveau personnage dans cette campagne'}
                </Button>
              </Box>
            )}

            {/* Cluster d'actions haut-droit, en mode édition : statut du personnage
                (PER-183) puis bascule de l'illustration de profil (standard / -2). */}
            {editingBlocks.identity && (
              <Stack
                direction="row"
                spacing={0.5}
                sx={{ position: 'absolute', top: 0, right: 0, zIndex: 2, alignItems: 'center' }}
              >
                <AppTooltip title={`Statut : ${STATUS_LABEL[character.status]}`}>
                  <IconButton size="small" onClick={(e) => setStatusAnchor(e.currentTarget)}>
                    {statusIcon(character.status)}
                  </IconButton>
                </AppTooltip>
                {characterClass && (
                  <Box component="span" data-tour="character-sheet-illustration">
                  <PortraitVariantMenu
                    variant={character.portraitVariant}
                    classId={character.classId}
                    busy={portraitBusy}
                    onSelectStatic={handleSelectStaticPortrait}
                    onSelectFile={(file, cropRect) => void handleSelectPortraitFile(file, cropRect)}
                    onValidationError={setPortraitError}
                    disabledCustom={!portraitCloudBacked || portraitUploadBlocked}
                    disabledCustomReason={
                      portraitUploadBlocked
                        ? 'Connecte-toi ou rejoins une campagne pour personnaliser cette illustration.'
                        : 'Disponible une fois le personnage synchronisé avec le cloud.'
                    }
                  />
                  </Box>
                )}
              </Stack>
            )}

            {/* Menu de statut : 3 valeurs fermées ; la valeur courante est cochée. */}
            <Menu
              anchorEl={statusAnchor}
              open={statusAnchor !== null}
              onClose={() => setStatusAnchor(null)}
            >
              {(['active', 'dead', 'retired'] as const).map((s) => (
                <MenuItem
                  key={s}
                  selected={character.status === s}
                  onClick={() => selectStatus(s)}
                >
                  <ListItemIcon>{statusIcon(s)}</ListItemIcon>
                  {STATUS_LABEL[s]}
                </MenuItem>
              ))}
            </Menu>

            {/* PER-185 : le choix « armes à feu » (Arquebusier ↔ Arbalétrier) est un
                snapshot VERROUILLÉ à la création — plus d'interrupteur ici. La
                disponibilité de la poudre relève désormais de la règle de campagne
                (réglages de campagne) ; l'effectif en découle (`firearmsAllowed`). */}

          </Box>

          {portraitError && (
            <AppAlert severity="error" onClose={() => setPortraitError(null)}>
              {portraitError}
            </AppAlert>
          )}

          {editingBlocks.identity && portraitUploadBlocked && (
            <AppAlert
              severity="warning"
              action={
                <Button
                  color="inherit"
                  size="small"
                  onClick={() => router.push(`/login?next=/character/${id}`)}
                >
                  Se connecter
                </Button>
              }
            >
              Une image personnalisée nécessite un compte ou une session ouverte via un lien de
              campagne (elle est stockée en ligne).
            </AppAlert>
          )}

          <ComplianceWarnings warnings={warnings} paidContentPending={paidContentLoading} />

          {/* REPLI (PER-358) : sans stats dérivées, pas de section « État du personnage » — les états
              du joueur s'afficheraient nulle part. Cf. `sessionStatusBlock`. */}
          {!masterDerived && sessionStatusBlock}

          <SheetSection
            id="abilities-section"
            title="Caractéristiques"
            icon="abilities"
            action={(collapsed) => (
              <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                {/* Épingle (retour propriétaire) : indépendante du mode édition, toujours
                    proposée — épingler une section ne suppose pas de la modifier. */}
                <PinSectionButton
                  pinned={pinAbilities}
                  onToggle={() => setPinAbilities(!pinAbilities)}
                  label="caractéristiques"
                />
                {!collapsed && !readOnly && (
                  <Box component="span" data-tour="character-sheet-modify-block">
                    <BlockEditButton
                      editing={editingBlocks.abilities}
                      onToggle={() => toggleBlock('abilities')}
                      label="caractéristiques"
                    />
                  </Box>
                )}
              </Stack>
            )}
          >
            {/* Cible du tour guidé (PER-426) posée ICI, sur la grille elle-même, et non sur
                l'en-tête (exception à la règle générale des autres sections, cf. `dataTour` de
                `SheetSection`) : la grille des 7 caractéristiques est compacte, jamais assez
                haute pour faire sortir la bulle de l'écran (contrairement à une grille de
                capacités ou un tableau d'inventaire) — le focus peut donc porter sur les valeurs
                elles-mêmes plutôt que sur le titre de la section. */}
            <Box data-tour="character-sheet-abilities">
              <AbilitiesGrid
                abilities={character.abilities}
                onChange={editingBlocks.abilities ? setAbility : undefined}
                baseAbilities={character.baseAbilities}
                ancestry={ancestry}
                ancestryChoices={character.ancestryChoices}
                abilityMods={display.abilityMods}
                abilityModSources={display.abilityModSources}
                abilityOverrides={display.abilityOverrides}
                abilityFormBonuses={display.abilityFormBonuses}
                abilityEquipmentBonuses={display.abilityEquipmentBonuses}
                abilityCrystalBonuses={display.abilityCrystalBonuses}
                bonusDieSources={display.bonusDieSourcesDetailed}
              />
            </Box>
          </SheetSection>

          {/* Section « Statistiques dérivées » avec un sélecteur de vue, même idiome que « Voies &
              capacités » (PER-296) : les stats dérivées (défaut) ou l'encadré « Compétences & tests »
              (lecture seule), qui vivait juste en dessous en tant que section à part. Le crayon
              d'édition ne s'affiche que sur la vue « Statistiques dérivées » ; les toggles d'affichage
              des domaines de la vue « tests » sont portés par le CONTENU (pas assez de place dans
              l'en-tête à côté du bandeau d'onglets), cf. `TestDomainsPanel`. */}
          <SheetSection
            id="derived-stats-section"
            title="Statistiques dérivées"
            icon="derived"
            tabs={[
              { value: 'derived', label: 'Statistiques dérivées', shortLabel: 'Statistiques', icon: 'derived' },
              { value: 'tests', label: 'Compétences & tests', shortLabel: 'Tests', icon: 'tests' },
            ]}
            activeTab={statsView}
            onTabChange={(v) => setStatsView(v as 'derived' | 'tests')}
            // Crayon d'édition en `pinnedAction` (≠ `action`), par cohérence avec toute section à
            // onglets (cf. « Voies & capacités ») : reste sur la ligne des onglets quelle que soit
            // la taille d'écran, plutôt que de basculer avec un éventuel futur bouton d'`action`.
            // L'épingle (retour propriétaire) y reste aussi sur les DEUX onglets : elle porte sur
            // les stats dérivées elles-mêmes (toujours calculées), pas sur la vue affichée.
            pinnedAction={
              <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                <PinSectionButton
                  pinned={pinDerivedStats}
                  onToggle={() => setPinDerivedStats(!pinDerivedStats)}
                  label="statistiques dérivées"
                />
                {statsView !== 'tests' && !readOnly && (
                  <BlockEditButton
                    editing={editingBlocks.derived}
                    onToggle={() => toggleBlock('derived')}
                    label="statistiques dérivées"
                  />
                )}
              </Stack>
            }
          >
            {statsView === 'tests' ? (
              <Box data-tour="character-sheet-tests">
                <TestDomainsPanel
                  bonuses={display.testBonuses}
                  abilities={effectCtx.abilities}
                  abilityTestBonus={display.abilityTestBonus}
                  statusTestBonus={display.statusTestBonus}
                  statusDomainBonus={display.statusDomainBonus}
                  perAbilityTestBonus={display.perAbilityTestBonus}
                  magicTestBonuses={display.magicTestBonuses}
                  // PER-378 : version DÉTAILLÉE (featureId + nom) pour que le badge rende chaque
                  // source en `CapabilityChip` cliquable dans son info-bulle, pas un nom brut.
                  bonusDice={display.bonusDieSourcesDetailed}
                  universalBonus={display.universalBonus}
                  testDice={display.testDice}
                  armorPenalty={display.armorPenalty}
                  armorMaxAgi={display.armorMaxAgi}
                  includeAbility={testsIncludeAbility}
                  onIncludeAbilityChange={setTestsIncludeAbility}
                  hideZero={testsHideZero}
                  onHideZeroChange={setTestsHideZero}
                />
              </Box>
            ) : adjustedDerivedInput ? (
              <Box data-tour="character-sheet-derived">
                <DerivedStatsGrid
                  input={adjustedDerivedInput}
                  featureIds={modFeatureIds}
                  effectContext={effectCtx}
                  extraModSources={display.extraModSources}
                  overrides={character.overrides}
                  onOverride={editingBlocks.derived ? setOverride : undefined}
                  defenseBadges={defenseBadges}
                  meleeCriticalRanges={meleeCriticalRanges}
                  rangedCriticalRanges={rangedCriticalRanges}
                  unarmedStrike={unarmed}
                  meleeWeaponDamage={meleeWeaponDamage}
                  offHandMeleeWeaponDamage={offHandMeleeWeaponDamage}
                  offHandCriticalRanges={offHandCriticalRanges}
                  offHandTouchDelta={offHandTouchDelta}
                  twoWeaponPenaltyDie={twoWeaponPenaltyDie}
                  onScrollToWeapon={scrollToEquipmentWeapon}
                  unarmedCriticalRanges={unarmedCriticalRanges}
                  rangedWeaponDamage={rangedWeaponDamage}
                  meleeSituationalDamage={meleeSituationalDamage}
                  offHandMeleeSituationalDamage={offHandMeleeSituationalDamage}
                  rangedSituationalDamage={rangedSituationalDamage}
                  rangedAttackMagicalSourceId={rangedAttackMagicalSourceId}
                  rangedAttackElement={rangedAttackElement}
                  rangedReplacingFormAttack={formAttackReplacingRanged}
                  meleeReplacingFormAttack={formAttackReplacingMelee}
                  activeDefenseOverride={defenseOverride}
                  activeDefenseOverrideSource={defenseOverrideSource}
                  activeInitiativeOverride={initiativeOverride}
                  activeInitiativeOverrideSource={initiativeOverrideSource}
                  attackBonusDie={display.attackBonusDieSources}
                  boundWeaponAttackDie={display.boundWeaponAttackDie}
                  attackMalusDie={attackMalusDie}
                  meleeAttackNotes={meleeAttackNotes}
                  rangedAttackNotes={rangedAttackNotes}
                  onToggleBarPin={toggleDerivedStatItemPin}
                  barPinnedIds={pinnedDerivedStatIds}
                  barSectionPinned={pinDerivedStats}
                />
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary">
                Profil incomplet : statistiques dérivées indisponibles.
              </Typography>
            )}
          </SheetSection>

          {masterDerived && (
            <SheetSection
              id="status-section"
              title="État du personnage"
              icon="status"
              // Pas de crayon d'édition ici (jauges = état de JEU, pas de mode « Modifier ») :
              // seule l'épingle (retour propriétaire) occupe cet emplacement.
              action={
                <PinSectionButton
                  pinned={pinStatusGauges}
                  onToggle={() => setPinStatusGauges(!pinStatusGauges)}
                  label="état du personnage"
                />
              }
            >
              {/* États de combat appliqués par le MJ en session (PER-281), AU-DESSUS de la barre de
                  vie (PER-358) : badges + effet verbatim + delta agrégé, en lecture seule, et
                  l'annonce d'un effet de groupe. Le chiffre est déjà répercuté sur les stats/attaques
                  plus haut — on le rappelle ici pour que le joueur n'ait pas à recouper trois blocs. */}
              {sessionStatusBlock && <Box sx={{ mb: 2 }}>{sessionStatusBlock}</Box>}
              <Box data-tour="character-sheet-status">
              <PlayerStatusPanel
                depletion={character.depletion}
                // Max EFFECTIF : surcharge manuelle de « Statistiques dérivées » si présente,
                // sinon la valeur calculée. Le bloc n'édite que le courant, jamais le max.
                maxHp={character.overrides.maxHp ?? masterDerived.maxHp}
                onDamage={setHpDamage}
                onHeal={setHpHeal}
                onResetHp={setHpReset}
                activeTransformation={activeTransformation}
                transformationDepletion={
                  activeTransformation ? (character.transformationDepletion[activeTransformation.featureId] ?? {}) : {}
                }
                onTransformationDamage={
                  activeTransformation
                    ? (amount, kind) => setTransformationDamage(activeTransformation.featureId, amount, kind)
                    : undefined
                }
                onTransformationHeal={
                  activeTransformation
                    ? (amount) => setTransformationHeal(activeTransformation.featureId, amount)
                    : undefined
                }
                onTransformationReset={
                  activeTransformation ? () => setTransformationReset(activeTransformation.featureId) : undefined
                }
                manaMax={manaMax}
                onSpendMana={setManaSpend}
                onRestoreMana={setManaRestore}
                onResetMana={setManaReset}
                luckMax={luckMax}
                onSpendLuck={setLuckSpend}
                onRestoreLuck={setLuckRestore}
                onResetLuck={setLuckReset}
                capacityGauges={capacityGauges}
                onSetUsageCounter={setUsageCounterValue}
                recoveryDiceMax={recoveryDiceMax}
                recoveryDie={recoveryDie}
                level={character.level}
                onSetRecoveryDiceCurrent={setDrCurrent}
                onShortRest={doShortRest}
                onLongRest={doLongRest}
                recoveryHealBonuses={recoveryHealBonuses}
                elixirDosesToLose={elixirDosesToLose}
                // Demander une pause à la table (PER-313) : posé sur la rangée des repos, là où le
                // joueur a déjà « Repos court » et « Repos long ». Ne s'affiche qu'en session, et
                // s'efface dès qu'une proposition est ouverte (`RestProposalDialog` prend le relais).
                restSlot={
                  isPlayer && !readOnly && characterCampaignId ? (
                    <RestRequestControl
                      campaignId={characterCampaignId}
                      characterId={character.id}
                      // Ce nom devient celui du proposant chez toute la table (« Aria propose… ») :
                      // un personnage encore anonyme se présente donc comme « Un joueur », pas
                      // comme le « Sans nom » affiché ailleurs sur la fiche.
                      characterName={character.name || 'Un joueur'}
                      sessionActive={sessionActive}
                    />
                  ) : undefined
                }
                shortRestOpen={shortRestOpen}
                onShortRestOpenChange={setShortRestOpen}
                longRestOpen={longRestOpen}
                onLongRestOpenChange={setLongRestOpen}
                onToggleBarPin={toggleRestItemPin}
                barPinnedIds={pinnedRestItemIds}
                barSectionPinned={pinStatusGauges}
              />
              </Box>
              {/* Repos de groupe (PER-312) : quand le MJ propose une récupération à toute la
                  table, l'annonce s'ouvre ici — sur la fiche, là où le joueur applique son repos.
                  Réservée au joueur qui incarne CE personnage : le MJ pilote la proposition depuis
                  son écran, et un joueur qui consulte la fiche d'un camarade n'a rien à décider. */}
              {isPlayer && !readOnly && characterCampaignId && (
                <RestProposalDialog
                  campaignId={characterCampaignId}
                  characterId={character.id}
                  recoveryDie={recoveryDie}
                  recoveryDiceMax={recoveryDiceMax}
                  recoveryDiceCurrent={currentRecoveryDice(recoveryDiceMax, character.depletion)}
                  level={character.level}
                  lethalDamage={character.depletion.hp?.lethal ?? 0}
                  elixirDosesToLose={elixirDosesToLose}
                  onShortRest={doShortRest}
                  onLongRest={doLongRest}
                />
              )}
            </SheetSection>
          )}

          {/* Section « Compagnons » (PER-233) : un bloc condensé par compagnon débloqué
              (monture, familier, écuyer, golem, loup, invocation…), avec barre de vie
              interactive. Entièrement dérivée des rangs de voie ; absente si aucun
              compagnon (pas de section vide). Requiert les stats du maître (Init./attaque
              recopiées, résolution des PV). */}
          {masterDerived &&
            (() => {
              const companions = listCompanions(character, Object.values(summonedCreatureBlobs));
              const ownedMounts = listOwnedMounts(character.mounts);
              // Section MASQUÉE tant qu'aucun compagnon ni monture n'est acquis (plus de section vide
              // juste pour héberger un bouton) : l'ajout de monture a migré dans l'en-tête de l'inventaire.
              if (companions.length === 0 && ownedMounts.length === 0) return null;
              return (
                <SheetSection title="Compagnons" icon="companions">
                  <Stack spacing={1.5}>
                    {companions.length > 0 && (
                      <CompanionsPanel
                        companions={companions}
                        abilities={effectCtx.abilities}
                        level={character.level}
                        masterDerived={masterDerived}
                        companionDepletion={character.companionDepletion}
                        onDamage={setCompanionDamage}
                        onHeal={setCompanionHeal}
                        onReset={setCompanionReset}
                        onDelete={deleteCompanionInstance}
                        // Toggle « En selle » sur une monture de voie (PER-216) : même interrupteur
                        // partagé que la carte de voie et les montures possédées. Masqué en lecture seule.
                        enSelleFor={readOnly ? undefined : (entry) => companionMountEnSelle(character, entry)}
                        onSetMounted={readOnly ? undefined : (entry, on) => setMountedTarget(on ? entry.key : null)}
                        // Sélecteur de passager (PER-363) : seule Monture fantôme le supporte à ce jour.
                        renderPassengerSelect={
                          readOnly
                            ? undefined
                            : (entry) =>
                                entry.key === 'prestige-invocation-majeure-r4' ? (
                                  <MountPassengerSelect character={character} />
                                ) : null
                        }
                      />
                    )}
                    {ownedMounts.length > 0 && (
                      <OwnedMountsPanel
                        mounts={ownedMounts}
                        readOnly={readOnly}
                        abilities={effectCtx.abilities}
                        level={character.level}
                        masterDerived={masterDerived}
                        isMounted={(id) => {
                          const m = character.mounts.find((x) => x.id === id);
                          return m ? isMountMounted(character, m) : false;
                        }}
                        onSetMounted={setMountMounted}
                        onRemove={removeMount}
                        onSetBarde={setMountBarde}
                        onDamage={setMountDamage}
                        onHeal={setMountHeal}
                        onReset={setMountReset}
                      />
                    )}
                  </Stack>
                </SheetSection>
              );
            })()}

          {/* Section « Voies & capacités » avec un sélecteur de vue (PER-296, proposition 2) :
              « Mes capacités » (défaut) OU l'aide-mémoire des « Manœuvres » de combat (lecture seule,
              p. 217-218). Les contrôles propres aux capacités (concentration, texte d'origine,
              disposition, crayon) ne s'affichent que sur la vue « Mes capacités » ; le renvoi de source
              des manœuvres prend leur place sur la vue « Manœuvres ». */}
          <SheetSection
            id="voies-capacites-section"
            title="Voies & capacités"
            icon="paths"
            tabs={[
              { value: 'features', label: 'Voies & capacités', shortLabel: 'Voies', icon: 'paths' },
              { value: 'maneuvers', label: 'Manœuvres', icon: 'maneuvers' },
            ]}
            activeTab={voiesView}
            onTabChange={(v) => setVoiesView(v as 'features' | 'maneuvers')}
            // Le crayon d'édition est ÉPINGLÉ (`pinnedAction`, jamais concerné par le retour à la
            // ligne des toggles ci-dessous en très petit écran, cf. `SheetSection`) : il doit rester
            // atteignable au même endroit quelle que soit la taille d'écran.
            pinnedAction={
              voiesView === 'features' && !readOnly ? (
                <BlockEditButton
                  editing={editingBlocks.features}
                  onToggle={() => toggleBlock('features')}
                  label="voies & capacités"
                />
              ) : null
            }
            action={
              voiesView === 'maneuvers' ? (
                <SourceRef page="217-218" term="Les manœuvres" />
              ) : (
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                  {display.hasSpells && (
                    <ConcentrationToggle value={concentration} onChange={setConcentration} />
                  )}
                  <VerbatimToggle value={featuresVerbatim} onChange={setFeaturesVerbatim} />
                  <FeaturesLayoutToggle value={voiesLayout} onChange={changeVoiesLayout} />
                </Stack>
              )
            }
          >
            {voiesView === 'maneuvers' ? (
              <Box data-tour="character-sheet-maneuvers">
                <ManeuversPanel abilities={effectCtx.abilities} level={character.level} />
              </Box>
            ) : (
            <>
            {pendingPaidFeatures ? (
              // Contenu payant pas encore fusionné (cf. `pendingPaidFeatures` ci-dessus) : on
              // squelette la section plutôt que de rendre des capacités/voies manquantes.
              <Stack spacing={1.5} aria-hidden>
                {Array.from({ length: 4 }, (_, i) => (
                  <Skeleton
                    key={i}
                    animation="wave"
                    variant="rounded"
                    height={56}
                    sx={{ borderRadius: 1 }}
                  />
                ))}
              </Stack>
            ) : (
            <Box data-tour="character-sheet-features">
            <FeaturesByPath
              featureIds={character.featureIds}
              classId={character.classId}
              layout={voiesLayout}
              verbatim={featuresVerbatim}
              concentration={concentration}
              // Caractéristiques EFFECTIVES (saisie + modificateurs permanents de
              // capacités, ex. gnome-r5 +1 CHA, Endurer +1 CON) : les formules richText
              // des cartes (portée « CHA × 100 m », durée « CHA minutes »…) doivent
              // refléter le total réel, comme les stats dérivées. Cf. `effectiveAbilities`.
              abilities={effectCtx.abilities}
              level={character.level}
              onChange={editingBlocks.features ? setFeatureIds : undefined}
              manualFeatureIds={manualFeatureIds(character)}
              character={character}
              onChoiceChange={editingBlocks.features ? setChoice : undefined}
              // Clic sur la puce d'un choix HORS édition (fiche du propriétaire) : bascule
              // le bloc « Voies » en édition et ouvre la modale du choix dans la foulée.
              // Absent en lecture seule stricte (fiche d'autrui) : pas d'édition possible.
              onEnableFeatureEditing={
                readOnly ? undefined : () => setEditingBlocks((s) => ({ ...s, features: true }))
              }
              // Les interrupteurs d'effets conditionnels sont des ÉTATS DE JEU
              // transitoires : activables à tout moment, y compris hors édition.
              onToggleEffect={setEffectToggleValue}
              onSpendRecoveryDie={spendTransformationRecoveryDie}
              // Buff de groupe posé en séance (PER-314) : grise l'interrupteur du porteur, dont le
              // bonus arrive désormais par l'état du MJ — sans quoi il compterait deux fois.
              sessionStatusIds={sessionStatusIds}
              // Saisie libre corrélée (animal de Forme animale) : état de jeu, comme
              // les interrupteurs, donc modifiable hors édition.
              onSetEffectInput={setEffectInputValue}
              // Activation d'un cristal appris (voie des cristaux, PER-74) : état de jeu, comme les
              // interrupteurs, donc modifiable hors édition.
              onToggleCrystalActive={setActiveCrystal}
              // Compteur d'usages limités (Les sept vies du chat) : état de jeu.
              onSetUsageCounter={setUsageCounterValue}
              // Débloquer sans repos (cadenas) : lève le verrou « repos court requis » d'une capacité.
              onLiftShortRestLock={liftShortRestLock}
              // Créer un élixir (forgesort) : décompte la réserve + ajoute la dose à l'équipement.
              onCreateElixir={createElixir}
              // Invoquer un zombie (badge bleu « Invoquer ») : crée une instance à PV propres, dans
              // la limite du profil — état de jeu, comme les interrupteurs/compteurs (PER-235).
              onSummonCompanionInstance={summonCompanionInstance}
              // Charmer un animal du bestiaire (Amitié animale, PER-378) : ajoute une instance liée à
              // un slug choisi dans le roster ouvert — état de jeu, comme l'invocation de zombie.
              onSummonOpenRosterCreature={summonOpenRosterCreature}
              onInvokeHawkHunter={game.invokeHawkHunter}
              // Poison appliqué aux armes (maître des poisons, PER-74) : état de jeu, patch appliqué via update.
              onPoisonUpdate={update}
              // PER-284 : armes bricolées (chargeur / second canon) désignées par le joueur.
              onWeaponModificationUpdate={update}
              // Stats du maître : Init./attaque des compagnons recopient ce total.
              masterDerived={masterDerived}
              // Bonus de compétence par domaine : sert à signaler, sur une capacité EMPRUNTÉE, que son
              // bonus de test est DOMINÉ (ne se cumule pas) — barré + capacité qui le domine (PER-73).
              testBonuses={display.testBonuses}
            />
            </Box>
            )}
            {/* Annonce d'un effet de groupe (PER-358), SOUS le tableau des voies : c'est là que le
                barde lit « Chant des héros », donc là qu'il pense à le lancer. Le composant ne rend
                rien hors session ni si aucun rang débloqué ne confère d'effet de groupe — le joueur
                ANNONCE, le MJ pose (la RLS en fait l'auteur unique de l'état de combat). */}
            {isPlayer && !readOnly && characterCampaignId && (
              <Box sx={{ mt: 2 }}>
                <BuffRequestControl
                  campaignId={characterCampaignId}
                  characterId={character.id}
                  // Ce nom nomme la demande chez le MJ : un personnage encore anonyme se présente
                  // comme « Un joueur », pas comme le « Sans nom » affiché ailleurs sur la fiche.
                  characterName={character.name || 'Un joueur'}
                  featureIds={character.featureIds}
                  appliedStatusIds={sessionStatusIds}
                  sessionActive={sessionActive}
                />
              </Box>
            )}
            </>
            )}
          </SheetSection>

          <SheetSection
            id="equipment-section"
            title="Inventaire"
            icon="inventory"
            collapsible
            defaultCollapsed
            persistKey={storageKeys.sheet.sectionCollapsed('equipment')}
            // PER-116 — dépliage forcé depuis l'icône d'arme de la carte d'attaque (ci-dessous).
            expandSignal={equipmentJumpNonce}
            onExpanded={() => {
              // Tour guidé (PER-426) : les étapes Bourse/Inventaire (`Step.before`, cf.
              // `buildCharacterSheetTourSteps`) attendent que la section soit RÉELLEMENT dépliée
              // (ou déjà ouverte) avant que `react-joyride` ne se positionne dessus — une section
              // repliée reste montée mais `visibility: hidden`, invisible pour la lib. `onExpanded`
              // est le seul signal FIABLE de ce moment (indépendant du cycle de vie de la lib).
              const resolveEquipment = pendingTourResolvers.current.get('equipment');
              if (resolveEquipment) {
                pendingTourResolvers.current.delete('equipment');
                // Même précaution que le `requestAnimationFrame` de dépliage juste en dessous
                // (« pas forcément encore PEINT dans ce frame ») : `onEntered` de MUI `Collapse`
                // signale la fin de la TRANSITION, pas forcément que le navigateur a fini de
                // peindre le nouveau layout — laisser passer un frame avant de résoudre (donc
                // avant que `react-joyride` ne mesure sa cible) réduit le petit décalage final
                // observé (bulle visée à une position pas tout à fait stabilisée).
                requestAnimationFrame(resolveEquipment);
              }
              if (!equipmentJumpSlot) return;
              // Le contenu est garanti visible (animation de dépliage terminée, ou déjà ouvert) mais
              // pas forcément encore PEINT dans ce frame → un `requestAnimationFrame` avant de mesurer
              // sa position, sinon `scrollIntoView` peut viser une position pas tout à fait à jour.
              requestAnimationFrame(() => {
                document
                  .getElementById(`equipment-line-${equipmentJumpSlot}`)
                  ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
              });
            }}
            // « Ajouter une monture » (PER-296) a migré ici, à gauche du crayon d'édition, et ne se
            // révèle QU'AU SURVOL du bloc inventaire (ou d'emblée sur tactile) — jamais en permanence,
            // quel que soit le PIN ou l'édition de la section. Retour propriétaire : `:focus-within`
            // le gardait révélé tant que N'IMPORTE QUEL bouton du bloc (le pin y compris) gardait le
            // focus après un clic, ce qui le laissait affiché en continu dès qu'on avait touché à
            // autre chose dans la section — retiré.
            sx={{
              '&:hover .add-mount-on-hover': {
                opacity: 1,
                pointerEvents: 'auto',
              },
            }}
            action={(collapsed) => (
              <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                {/* L'épingle (retour propriétaire) reste visible même replié — contrairement au reste
                    de la rangée, qui n'a de sens qu'inventaire déplié : épingler ne demande pas de
                    voir le contenu. */}
                {!collapsed && !readOnly && (
                  <Box
                    className="add-mount-on-hover"
                    sx={{
                      opacity: 0,
                      pointerEvents: 'none',
                      transition: 'opacity 0.15s ease',
                      // Sans survol possible (écran tactile), le bouton reste visible en permanence.
                      '@media (hover: none)': { opacity: 1, pointerEvents: 'auto' },
                    }}
                  >
                    <AddMountButton onAdd={addMount} />
                  </Box>
                )}
                <PinSectionButton
                  pinned={pinInventory}
                  onToggle={() => setPinInventory(!pinInventory)}
                  label="inventaire"
                />
                {!collapsed && !readOnly && (
                  <BlockEditButton
                    editing={editingBlocks.equipment}
                    onToggle={() => toggleBlock('equipment')}
                    label="inventaire"
                  />
                )}
              </Stack>
            )}
          >
            {/* Bourse (PER-152) : argent possédé, état de jeu transitoire (montants éditables hors
                mode « Modifier », non affecté par un repos). Les flèches de conversion entre unités
                n'apparaissent qu'en mode édition du bloc. En tête du bloc inventaire. Le pin de la
                bourse vers la barre condensée (retour propriétaire) n'apparaît que si la section
                Inventaire y est elle-même épinglée (`pinInventory`). */}
            <Box data-tour="character-sheet-purse">
            <PurseField
              purse={character.purse}
              onChange={setPurse}
              editing={editingBlocks.equipment}
              onToggleBarPin={() => setPinInventoryPurse(!pinInventoryPurse)}
              barPinned={pinInventoryPurse}
              barSectionPinned={pinInventory}
            />
            </Box>
            <Divider sx={{ my: 1.5 }} />
            <EquipmentList
              dataTour="character-sheet-inventory"
              equipment={character.equipment}
              onChange={editingBlocks.equipment ? setEquipment : undefined}
              characterId={character.id}
              // « Utiliser » : consommer une unité est un état de jeu → disponible hors mode édition.
              onUse={handleUseItem}
              // Chargement des armes (PER-284) : compteur de coups prêts sur les arbalètes et armes
              // à poudre, et gestes tirer / recharger / plein — état de jeu, hors mode édition, et
              // masqués en lecture seule (le compteur, lui, reste affiché).
              weaponLoading={weaponLoading}
              // PER-286 : rappel « objet octroyé par une capacité » (couleuvrine du rang 5), avec
              // son bouton d'ajout — masqué en lecture seule.
              grantedMissing={missingGrantedItems(character, firearmsAllowed)}
              // Don d'un objet à un autre joueur de la campagne (PER-388), sans validation du MJ.
              // Absent hors campagne / en lecture seule : rien à quoi donner, ou pas la main.
              giveContext={
                readOnly || !characterCampaignId
                  ? undefined
                  : {
                      campaignId: characterCampaignId,
                      characterId: character.id,
                      onGiveItem: giveItem,
                    }
              }
              // PER-286 : dés évolutifs résolus au niveau + carac ajoutée par l'arme (couleuvrine).
              level={character.level}
              abilities={effectCtx.abilities}
              onAddGranted={readOnly ? undefined : addGrantedEquipment}
              onFireShot={readOnly ? undefined : fireWeaponShot}
              onLoadShot={readOnly ? undefined : loadWeaponShot}
              onRefillShots={readOnly ? undefined : refillWeaponShots}
              // Tir de grenaille (explosifs-r1, p. 63) : le mélange s'annonce AU chargement.
              canLoadGrapeshot={character.featureIds.includes('explosifs-r1')}
              // Objets à charges (PER-294) : dépenser / rendre / faire le plein — même nature que
              // les gestes de chargement, donc masqués en lecture seule (les pastilles restent).
              onSpendCharge={readOnly ? undefined : spendItemCharge}
              onRestoreCharge={readOnly ? undefined : restoreItemCharge}
              onRefillCharges={readOnly ? undefined : refillItemCharges}
              // Équiper/déséquiper (PER-77) : état de jeu, hors mode édition ; masqué en lecture seule
              // (le porté reste montré par un badge). Voir `setWorn`.
              onWear={readOnly ? undefined : setWorn}
              // Reskins d'objet du profil (PER-181) : druide `baton-ferre` → « Bâton noueux ».
              characterClass={characterClass}
              // Indicateur « arme non maîtrisée → dé malus » (PER-79) sur les armes en main.
              masteredIds={masteredClassIds(character, rulesContext)}
              firearmsAllowed={firearmsAllowed}
              // Maîtrises par exception : arme sacrée du prêtre spécialiste (PER-96) + octroi de peuple nain (PER-154).
              extraMasteredWeaponIds={extraMasteredWeaponIds(character, firearmsAllowed)}
              // Badge positif d'affinité d'arme (PER-218) : arme sacrée / arme de peuple « maîtrisée ».
              resolveWeaponAffinities={(itemId) => weaponAffinities(character, itemId)}
              // Indicateur « combat à deux armes → dé malus » (PER-116) par arme en main.
              twoWeaponStatus={twoWeaponCombatStatus(character)}
              // Poigne de fer du colosse (PER-74) : familles d'armes à deux mains maniables à une main
              // → boutons de prise sur ces armes, et bouclier compatible sans avertissement.
              oneHandableFamilies={oneHandableWeaponFamiliesForCharacter(character)}
              // Indicateur « armure trop lourde / bouclier interdit » (PER-80) par ligne équipée.
              resolveArmorRestriction={(line) => armorRestrictionByLine(character, rulesContext).get(line) ?? null}
              // Plage de critique de l'arme en main (PER-74) : puce « 19-20 » sur la ligne, cumulant
              // la plage intrinsèque de l'arme et les capacités actives (Critique destructeur…).
              resolveCriticalRange={(line) => weaponLineCriticalRange(character, line)}
              // Puce « Arme liée » (PER-74) sur la seule arme que la voie de l'arme liée concerne.
              resolveBoundWeapon={(line) => boundWeaponPathFor(character, line)}
              // Ouverture externe (bouton carré de la barre condensée) + pin soudé au bouton.
              openCustomItemSignal={customItemOpenNonce}
              onToggleBarPin={() => setPinInventoryCustomItem(!pinInventoryCustomItem)}
              barPinned={pinInventoryCustomItem}
              barSectionPinned={pinInventory}
            />
          </SheetSection>

          <SheetSection
            title="Identité"
            icon="identity"
            collapsible
            defaultCollapsed
            persistKey={storageKeys.sheet.sectionCollapsed('identity')}
            action={(collapsed) =>
              collapsed || readOnly ? null : (
                <BlockEditButton
                  editing={editingBlocks.identity}
                  onToggle={() => toggleBlock('identity')}
                  label="identité"
                />
              )
            }
          >
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: 'flex-start' }}>
              {/* Vignette portrait (PER-394) : même recadrage carré que la carte/l'initiative,
                  affiché ici au format « identité » 200×300, à gauche du reste du bloc. */}
              <Paper
                variant="outlined"
                sx={{
                  width: 200,
                  height: 300,
                  flexShrink: 0,
                  overflow: 'hidden',
                  alignSelf: { xs: 'center', sm: 'flex-start' },
                }}
              >
                <Box
                  component="img"
                  src={croppedClassPortraitSrc ?? classPortraitSrc}
                  alt=""
                  aria-hidden
                  sx={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }}
                />
              </Paper>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                {/* Vocation RP du prêtre spécialiste (PER-218) : descriptif, au-dessus des champs libres. */}
                <PriestVocationIdentityLine vocation={character.priestVocation} />
                {editingBlocks.identity ? (
                  <>
                    <IdentityEditor
                      name={character.name}
                      identity={character.identity}
                      ancestry={ancestry}
                      onName={(name) => update({ name })}
                      onIdentity={setIdentity}
                    />
                    {/* Édition rétroactive de la voie de peuple du demi-elfe (PER-324) : l'assistant fige ce
                        choix, cette modale permet de basculer vers/depuis la « Voie du demi-elfe » (Le Compagnon)
                        et de fixer l'ascendance elfe. Réservée au peuple demi-elfe, contenu Compagnon chargé. */}
                    {character.ancestryId === 'demi-elfe' && pathById.has('demi-elfe') && (
                      <>
                        <Button size="small" variant="outlined" sx={{ mt: 1.5 }} onClick={() => setDemiElfeDialogOpen(true)}>
                          Voie de peuple du demi-elfe…
                        </Button>
                        <DemiElfeAncestryDialog
                          open={demiElfeDialogOpen}
                          onClose={() => setDemiElfeDialogOpen(false)}
                          currentPathId={character.ancestryPathId}
                          currentElfAncestry={character.demiElfeElfAncestry}
                          onApply={(newPathId, elfAncestry) =>
                            update(setDemiElfeAncestryPath(character, newPathId, elfAncestry))
                          }
                        />
                      </>
                    )}
                    {/* Choix d'identité du peuple type option (PER-401) — ex. type de souffle du
                        drakonide (PER-326) : posés à la création, réédités ici hors des rangs de voie. */}
                    {(ancestry?.identityChoiceFeatureIds?.length ?? 0) > 0 && (
                      <>
                        <Button size="small" variant="outlined" sx={{ mt: 1.5 }} onClick={() => setAncestryChoicesDialogOpen(true)}>
                          Choix du peuple…
                        </Button>
                        <AncestryChoicesDialog
                          open={ancestryChoicesDialogOpen}
                          onClose={() => setAncestryChoicesDialogOpen(false)}
                          character={character}
                          featureIds={ancestry?.identityChoiceFeatureIds ?? []}
                          onChange={setChoice}
                        />
                      </>
                    )}
                  </>
                ) : (
                  <IdentityFields
                    identity={character.identity}
                    ancestryId={character.ancestryId}
                    featureIds={character.featureIds}
                  />
                )}
              </Box>
            </Stack>
          </SheetSection>

          <SheetSection
            title="Notes"
            icon="notes"
            collapsible
            defaultCollapsed
            persistKey={storageKeys.sheet.sectionCollapsed('notes')}
            // Tour guidé (PER-426) : déplié de force par sa propre étape (`notesJumpNonce`).
            expandSignal={notesJumpNonce}
            onExpanded={() => {
              const resolve = pendingTourResolvers.current.get('notes');
              if (resolve) {
                pendingTourResolvers.current.delete('notes');
                requestAnimationFrame(resolve);
              }
            }}
            dataTour="character-sheet-notes"
            // Bandeau d'onglets en ENTÊTE (même langage que « Voies & capacités »/« Manœuvres »,
            // PER-439) — pas de campagne connue → pas d'onglets, la section retombe sur son
            // titre simple (« Notes »). L'onglet « PNJ », lui, ne s'ajoute que s'il y a au moins
            // un PNJ à montrer (`hasPlayerNpcs`, calculé plus haut).
            tabs={
              characterCampaignId
                ? [
                    { value: 'notes', label: 'Notes', icon: 'notes' },
                    { value: 'session', label: 'Notes de session', shortLabel: 'Session', icon: 'notes' },
                    ...(hasPlayerNpcs
                      ? [{ value: 'npc', label: 'PNJ', icon: 'npc' as const }]
                      : []),
                  ]
                : undefined
            }
            activeTab={characterCampaignId ? notesTab : undefined}
            onTabChange={(v) => setNotesTab(v as 'notes' | 'session' | 'npc')}
            action={(collapsed) => (
              <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                {/* Historique des parties de CE personnage (PER-415/416) : toujours proposé,
                    replié ou non, onglets ou non — indépendant du mode édition. */}
                <AppTooltip title="Historique des parties">
                  <IconButton
                    size="small"
                    onClick={() => setNotesHistoryOpen(true)}
                    aria-label="Historique des parties"
                  >
                    <HistoryIcon fontSize="small" />
                  </IconButton>
                </AppTooltip>
                {!collapsed && !readOnly && notesTab === 'notes' && (
                  <BlockEditButton
                    editing={editingBlocks.notes}
                    onToggle={() => toggleBlock('notes')}
                    label="notes"
                  />
                )}
              </Stack>
            )}
          >
            {(!characterCampaignId || notesTab === 'notes') ? (
              editingBlocks.notes ? (
                <RichTextEditor
                  value={character.notes}
                  onChange={(text) => update({ notes: text })}
                  placeholder="Notes libres du joueur…"
                />
              ) : character.notes ? (
                <Typography variant="body2" component="div" sx={{ whiteSpace: 'pre-line' }}>
                  <GlossaryRichText>{character.notes}</GlossaryRichText>
                </Typography>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Aucune note.
                </Typography>
              )
            ) : notesTab === 'session' ? (
              sessionActive && activeSession ? (
                <CharacterSessionNotesEditor
                  characterId={character.id}
                  sessionId={activeSession.id}
                  readOnly={readOnly}
                />
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Aucune partie en cours.
                </Typography>
              )
            ) : (
              <CharacterNpcTab npcs={playerNpcs} loading={playerNpcsLoading} error={playerNpcsError} />
            )}
          </SheetSection>

          <SheetSection
            title="Historique des niveaux"
            icon="levels"
            collapsible
            defaultCollapsed
            persistKey={storageKeys.sheet.sectionCollapsed('level-history')}
            // Tour guidé (PER-426) : déplié de force par sa propre étape (`historyJumpNonce`).
            expandSignal={historyJumpNonce}
            onExpanded={() => {
              const resolve = pendingTourResolvers.current.get('history');
              if (resolve) {
                pendingTourResolvers.current.delete('history');
                requestAnimationFrame(resolve);
              }
            }}
            action={(collapsed) =>
              !collapsed && !readOnly && canUndoLastLevelUp(character) ? (
                <LevelUndoButton
                  level={character.level}
                  onUndo={() => upsert(undoLastLevelUp(character))}
                />
              ) : null
            }
          >
            <Box data-tour="character-sheet-history">
            <LevelHistory character={character} />
            {!readOnly && canUndoLastLevelUp(character) && (
              // Miroir du bouton de l'en-tête, ancré à droite en bas du bloc.
              <Stack direction="row" sx={{ justifyContent: 'flex-end', mt: 2 }}>
                <LevelUndoButton
                  level={character.level}
                  onUndo={() => upsert(undoLastLevelUp(character))}
                />
              </Stack>
            )}
            </Box>
          </SheetSection>
        </Stack>
      </Container>

      {/* Ordre d'initiative de la campagne (version « publique »/projetée), collé juste au-dessus
          du pied de page — repliable en un simple bandeau. PLEINE LARGEUR, donc volontairement HORS
          du `Container` de la fiche (comme la bande équivalente de l'écran de MJ, PER-301). Masqué
          hors campagne ou combat vide. */}
      {character.campaignId && (
        <SheetInitiativeBar
          campaignId={character.campaignId}
          characterId={character.id}
          scrollTopButtonVisible={scrolledPastHeader}
        />
      )}

      <HomeBackground variant="footer" />

      {/* Bouton flottant « Haut de page », révélé par le même trigger que le sous-titre
          du header. Ancré bas-droite, SOUS la pile de toasts (cf. z-index). */}
      <ScrollToTopButton visible={scrolledPastHeader} />

      <CharacterSessionHistoryDrawer
        open={notesHistoryOpen}
        onClose={() => setNotesHistoryOpen(false)}
        characterName={character.name || 'Personnage'}
        characterId={character.id}
        campaignId={characterCampaignId}
        playerId={character.playerId}
        currentSessionId={sessionActive ? (activeSession?.id ?? null) : null}
        currentSessionStartedAt={sessionActive ? (activeSession?.startedAt ?? null) : null}
        readOnly={readOnly}
      />

      <LevelUpDialog
        open={levelUpOpen}
        character={character}
        family={family}
        firearmsAllowed={firearmsAllowed}
        hitDieOnLevelUp={hitDieOnLevelUp}
        onClose={() => setLevelUpOpen(false)}
        onConfirm={(updated) => {
          upsert(updated);
          setLevelUpOpen(false);
        }}
      />

      <CoinPouchDialog
        open={coinPouchIndex !== null}
        info={(() => {
          const line = coinPouchIndex !== null ? character.equipment[coinPouchIndex] : undefined;
          return line && isCustomItem(line) ? parseCoinPouchName(line.name) : null;
        })()}
        onClose={() => setCoinPouchIndex(null)}
        onConfirm={confirmCoinPouch}
      />

      <PotionDialog
        open={potionUse !== null}
        potion={
          potionUse
            ? {
                resource: potionUse.resource,
                die: potionUse.die,
                count: potionUse.count,
                ...(potionUse.evolving ? { evolving: true as const } : {}),
                ...(potionUse.modifier ? { modifier: potionUse.modifier } : {}),
              }
            : null
        }
        level={character.level}
        onClose={() => setPotionUse(null)}
        onConfirm={confirmPotion}
      />

      {/* Résolution d'un choix d'équipement de départ « X ou Y » (PER-220). */}
      {choiceIndex !== null &&
        (() => {
          const line = character.equipment[choiceIndex];
          const options = line ? startingChoiceOptionsFor(line) : undefined;
          if (!line || !isCustomItem(line) || !options) return null;
          return (
            <StartingChoiceDialog
              open
              label={line.name}
              options={options}
              firearmsEffective={firearmsAllowed}
              onClose={() => setChoiceIndex(null)}
              onConfirm={confirmStartingChoice}
            />
          );
        })()}

      {/* Confirmation d'archivage (PER-183) : passer un personnage en mort/retraité
          est un acte narratif volontaire. Réversible (on peut le repasser « Vivant »
          ensuite, sans confirmation) — la fiche permissive n'enferme jamais la donnée. */}
      <Dialog open={pendingArchive !== null} onClose={() => setPendingArchive(null)}>
        <DialogTitle>
          {pendingArchive === 'dead'
            ? 'Marquer ce personnage comme mort ?'
            : 'Mettre ce personnage à la retraite ?'}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {pendingArchive === 'dead'
              ? `« ${character.name || 'Sans nom'} » sera classé parmi les personnages archivés de sa campagne. Rien n’est supprimé et le statut reste réversible.`
              : `« ${character.name || 'Sans nom'} » sera rangé parmi les personnages archivés de sa campagne. Rien n’est supprimé et le statut reste réversible.`}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPendingArchive(null)}>Annuler</Button>
          <Button
            variant="contained"
            onClick={() => {
              if (pendingArchive) update({ status: pendingArchive });
              setPendingArchive(null);
            }}
          >
            {pendingArchive === 'dead' ? 'Marquer mort' : 'Mettre à la retraite'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Tour guidé de la fiche de personnage (PER-426) : caractéristiques, statistiques
          dérivées (+ compétences & tests), état du personnage, voies & capacités
          (+ manœuvres), bourse et inventaire. Les bascules d'onglet et le dépliage de
          l'Inventaire sont portés par `Step.before` de chaque étape concernée (cf.
          `buildCharacterSheetTourSteps`), pas par ce composant — `react-joyride` attend
          nativement cette promesse avant de se positionner. */}
      <GuidedTour run={tour.run} steps={tourSteps} onTourEnd={tour.onTourEnd} />
      </CapabilityScrollProvider>
      </FeatureDeclensionContext.Provider>
    </FirearmsAllowedProvider>
  );
}
