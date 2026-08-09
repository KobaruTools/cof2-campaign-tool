'use client';

import { use, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DoneIcon from '@mui/icons-material/Done';
import EditIcon from '@mui/icons-material/Edit';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import MonitorHeartIcon from '@mui/icons-material/MonitorHeart';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import UpgradeIcon from '@mui/icons-material/Upgrade';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
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
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import type { Theme } from '@mui/material/styles';
import { ancestryById, classById, families, pathById, progression } from '@/data';
import { checkCompliance } from '@/lib/engine';
import type {
  AbilityId,
  BeneficialEffectId,
  StartingEquipmentChoiceOption,
} from '@/data/schema';
import type { CharacterStatus, DerivedStatId, EquipmentLine, Identity } from '@/lib/character/types';
import { isCustomItem } from '@/lib/character/types';
import { modifierDeltas } from '@/lib/character/ancestry';
import { armorRestrictionByLine } from '@/lib/character/armorRestrictions';
import { oneHandableWeaponFamilies } from '@/lib/character/equipment';
import { extraMasteredWeaponIds, masteredClassIds } from '@/lib/character/mastery';
import { twoWeaponCombatStatus } from '@/lib/character/twoWeaponCombat';
import { weaponAffinities } from '@/lib/character/weaponAffinity';
import { PriestVocationIdentityLine } from '@/components/sheet/PriestVocationBadge';
import { missingGrantedItems } from '@/lib/character/grantedEquipment';
import { firearmsEffective } from '@/lib/character/firearms';
import { useIsPlayerSession } from '@/lib/supabase/useIsPlayerSession';
import { usePresenceHeartbeat } from '@/lib/player/usePresenceHeartbeat';
import { canUndoLastLevelUp, manualFeatureIds, undoLastLevelUp } from '@/lib/character/levelUp';
import {
  pruneEffectInputs,
  pruneEffectToggles,
  pruneUsageCounters,
} from '@/lib/character/effects';
import { pruneFeatureChoices, setFeatureChoice } from '@/lib/character/choices';
import { currentRecoveryDice, pruneDepletion } from '@/lib/character/gauges';
import {
  companionMountEnSelle,
  listCompanions,
  pruneCompanionDepletion,
  pruneCompanionInstances,
} from '@/lib/character/companions';
import { isMountMounted, listOwnedMounts } from '@/lib/character/mounts';
import type { FeatureChoiceSelection } from '@/lib/character/types';
import { rulesContext } from '@/lib/character/rulesContext';
import { AppHeader } from '@/components/AppHeader';
import { SessionHeaderIndicator } from '@/components/session/SessionHeaderIndicator';
import { useActiveSession } from '@/lib/session/useActiveSession';
import { useCampaignCombatStore } from '@/stores/campaignCombat';
import { statusSheetImpact } from '@/lib/character/statusEffects';
import { mergeMods } from '@/lib/character/orphanPoints';
import { ActiveStatusPanel } from '@/components/sheet/ActiveStatusPanel';
import type { SessionIdentity } from '@/lib/session/useSessionChannel';
import { ScrollToTopButton } from '@/components/ScrollToTopButton';
import { CharacterIdentityLine } from '@/components/sheet/CharacterIdentityLine';
import { AppTooltip } from '@/components/AppTooltip';
import { useToast } from '@/components/toast/ToastProvider';
import { DerivedStatsGrid } from '@/components/DerivedStatsGrid';
import { useCharacterGameState } from '@/components/sheet/useCharacterGameState';
import { buildSheetDisplayView } from '@/components/sheet/sheetDisplayView';
import { HeaderIllustrations } from '@/components/HeaderIllustrations';
import { HomeBackground } from '@/components/HomeBackground';
import { CharacterSheetSkeleton } from '@/components/sheet/CharacterSheetSkeleton';
import { FirearmsAllowedProvider } from '@/components/ClassIcon';
import { FeatureDeclensionContext } from '@/components/sheet/FeatureDeclension';
import { TombstoneIcon } from '@/components/TombstoneIcon';
import { CampaignBadge } from '@/components/home/CampaignBadge';
import { PlayerBadge } from '@/components/home/PlayerBadge';
import { classColor } from '@/lib/ui/classColors';
import { usePersistedBoolean } from '@/lib/ui/usePersistedBoolean';
import { SheetInitiativeBar } from '@/components/sheet/SheetInitiativeBar';
import { SheetSection } from '@/components/sheet/SheetSection';
import { CapabilityScrollProvider } from '@/components/sheet/capabilityScroll';
import { BlockEditButton } from '@/components/sheet/BlockEditButton';
import { AppAlert } from '@/components/AppAlert';
import { PlayerStatusPanel } from '@/components/sheet/PlayerStatusPanel';
import { RestProposalDialog } from '@/components/session/RestProposalDialog';
import { BuffRequestControl } from '@/components/session/BuffRequestControl';
import { RestRequestControl } from '@/components/session/RestRequestControl';
import { ManeuversPanel } from '@/components/sheet/ManeuversPanel';
import { SourceRef } from '@/components/SourceRef';
import { CompanionsPanel } from '@/components/sheet/CompanionsPanel';
import { AddMountButton, OwnedMountsPanel } from '@/components/sheet/OwnedMountsPanel';
import { PurseField } from '@/components/sheet/PurseField';
import { CoinPouchDialog } from '@/components/sheet/CoinPouchDialog';
import { StartingChoiceDialog } from '@/components/sheet/StartingChoiceDialog';
import { parseCoinPouchName } from '@/lib/character/coinPouch';
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
import { DemiElfeAncestryDialog } from '@/components/sheet/DemiElfeAncestryDialog';
import { setDemiElfeAncestryPath } from '@/lib/character/sheetActions';
import { ComplianceWarnings } from '@/components/sheet/ComplianceWarnings';
import { LevelUpDialog } from '@/components/sheet/LevelUpDialog';
import { LevelHistory } from '@/components/sheet/LevelHistory';
import { LevelUndoButton } from '@/components/sheet/LevelUndoButton';
import { useCharactersStore } from '@/stores/characters';
import { useCampaignsStore } from '@/stores/campaigns';
import { usePlayersStore } from '@/stores/players';
import { useBuffOptOutStore } from '@/stores/buffOptOut';

const familyById = new Map(families.map((f) => [f.id, f]));

/**
 * Liste vide partagée des buffs écartés : un sélecteur zustand doit renvoyer une référence STABLE
 * quand il n'y a rien (l'égalité par défaut est `Object.is` — un `[]` neuf rendrait en boucle).
 */
const NO_WAIVED_BUFFS: BeneficialEffectId[] = [];

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

export default function CharacterSheetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const hasHydrated = useCharactersStore((s) => s.hasHydrated);
  const status = useCharactersStore((s) => s.status);
  const character = useCharactersStore((s) => s.characters.find((c) => c.id === id));
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
  const { isActive: sessionActive } = useActiveSession(characterCampaignId);
  const combatStatuses = useCampaignCombatStore((s) =>
    characterCampaignId ? s.byCampaign[characterCampaignId]?.statuses[id] : undefined,
  );
  // Hors session, la liste reste vide → aucune répercussion (les états sont propres au combat).
  const posedStatuses = sessionActive ? (combatStatuses ?? []) : [];
  // Buffs que CE joueur a écartés de sa fiche (PER-358) : un buff de groupe est posé d'un geste sur
  // tout un camp, chacun reste libre de s'en passer. Purement local — le MJ reste seul auteur de
  // l'état de combat, et les camarades n'en savent rien.
  const waivedBuffIds = useBuffOptOutStore((s) => s.idsByCharacter[id] ?? NO_WAIVED_BUFFS);
  const waiveBuff = useBuffOptOutStore((s) => s.waiveBuff);
  const syncWaivedBuffs = useBuffOptOutStore((s) => s.syncPosed);
  // Le renoncement ne survit pas à la levée de l'effet : si le MJ relance le Chant des héros, c'est
  // une nouvelle incantation, elle s'applique à tout le monde. Clé de chaîne plutôt que le tableau
  // (recréé à chaque rendu), pour ne réveiller la purge qu'aux VRAIS changements d'état posé.
  const posedStatusKey = posedStatuses.map((s) => s.id).join('|');
  useEffect(() => {
    syncWaivedBuffs(id, posedStatusKey === '' ? [] : posedStatusKey.split('|'));
  }, [id, posedStatusKey, syncWaivedBuffs]);
  const appliedStatuses =
    waivedBuffIds.length > 0
      ? posedStatuses.filter((s) => !waivedBuffIds.includes(s.id as BeneficialEffectId))
      : posedStatuses;
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
  // Disposition des voies : « colonnes » sur grand écran (défaut historique), mais
  // « lignes » par défaut sur mobile (PER-229) — en colonnes, le bloc central de la
  // fiche rend une grille large à défilement horizontal, très inconfortable au doigt.
  // On respecte un choix manuel : dès que l'utilisateur bascule, on ne réimpose plus
  // le défaut lié à la largeur d'écran (`layoutTouchedRef`).
  const isNarrowViewport = useMediaQuery((theme: Theme) => theme.breakpoints.down('md'));
  const [voiesLayout, setVoiesLayout] = useState<FeaturesLayout>('columns');
  const layoutTouchedRef = useRef(false);
  useEffect(() => {
    if (!layoutTouchedRef.current) setVoiesLayout(isNarrowViewport ? 'rows' : 'columns');
  }, [isNarrowViewport]);
  const changeVoiesLayout = useCallback((layout: FeaturesLayout) => {
    layoutTouchedRef.current = true;
    setVoiesLayout(layout);
  }, []);
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
  // Vue de la section « Statistiques dérivées », même idiome que « Voies & capacités »
  // ci-dessus : les stats dérivées (défaut) ou « Compétences & tests » (lecture seule).
  // Préférence d'affichage transitoire (non persistée) ; les toggles de la vue « tests »
  // (eux) restent persistés, comme avant l'introduction des onglets (cf. `TestDomainsPanel`).
  const [statsView, setStatsView] = useState<'derived' | 'tests'>('derived');
  const [testsIncludeAbility, setTestsIncludeAbility] = usePersistedBoolean(
    'test-domains:include-ability',
    false,
  );
  const [testsHideZero, setTestsHideZero] = usePersistedBoolean('test-domains:hide-zero', true);
  const { showToast } = useToast();
  // Index de la ligne « Bourse de 2d6 pa » dont l'ouverture est en cours (modale) ; null = fermée.
  const [coinPouchIndex, setCoinPouchIndex] = useState<number | null>(null);
  // Index de la ligne de CHOIX d'équipement de départ en cours de résolution (PER-220) ; null = fermée.
  const [choiceIndex, setChoiceIndex] = useState<number | null>(null);
  // Modale d'édition rétroactive de la voie de peuple du demi-elfe (PER-324) ; DOIT rester ici, en tête
  // avec les autres hooks, avant tout `return` anticipé (Rules of Hooks).
  const [demiElfeDialogOpen, setDemiElfeDialogOpen] = useState(false);
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
    deleteCompanionInstance,
    addMount,
    removeMount,
    setMountBarde,
    setMountDamage,
    setMountHeal,
    setMountReset,
    setMountMounted,
    setMountedTarget,
  } = game;
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
  };
  // Validation de la modale de bourse : ajoute `silver` pa à la fortune et consomme la dose.
  const confirmCoinPouch = (silver: number) => {
    if (coinPouchIndex === null) return;
    openCoinPouch(coinPouchIndex, silver);
    setCoinPouchIndex(null);
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

  // Rappel des états posés par le MJ (PER-281), remonté en tête d'« État du personnage » (PER-358),
  // au-dessus de la barre de vie. Cette section n'existe que si les stats dérivées sont calculables,
  // d'où ce bloc nommé, monté à la place historique pour un profil incomplet — les deux montages
  // sont exclusifs. Le joueur peut écarter un BUFF de sa seule fiche (croix), jamais un état subi.
  const sessionStatusBlock =
    appliedStatuses.length === 0 ? null : (
      <ActiveStatusPanel
        statuses={appliedStatuses}
        roundNumber={combatRoundNumber}
        onWaiveBuff={isPlayer && !readOnly ? (buffId) => waiveBuff(id, buffId) : undefined}
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
      <AppHeader
        // Fil d'Ariane : rattaché à une campagne → « {campagne} / {nom} » (le parent
        // pointe vers la vue campagne) ; sinon le nom seul (page de premier niveau).
        // Le fil se DÉPLIE au défilement : « {campagne} / Fiche de personnage » en haut
        // de page → « {campagne} / {nom} | {peuple · profil · niveau} » ensuite.
        breadcrumbs={
          character.campaignId
            ? [
                {
                  label: currentCampaign?.name ?? 'la campagne',
                  href: `/campaign/${character.campaignId}`,
                },
                { label: character.name || 'Sans nom' },
              ]
            : [{ label: character.name || 'Sans nom' }]
        }
        // Teinte l'en-tête à la couleur du profil principal (dégradé, bordure basse
        // foncée, ombre portée) — repli neutre tant que le profil n'est pas défini.
        accentColor={characterClass ? classColor(characterClass.id) : undefined}
        // Lien « Écran de MJ » si l'utilisateur est le MJ de la campagne du personnage :
        // `currentCampaign` n'est résolu que depuis le store des campagnes POSSÉDÉES
        // (RLS owner), donc défini ⟺ utilisateur propriétaire/MJ. Absent pour un joueur.
        gmScreenCampaignId={currentCampaign?.id}
        // Voyant de session compact (PER-269) dans l'en-tête, entre le livre des règles et
        // le menu compte : point 3 états (connecté / reconnexion… / hors ligne), détail des
        // connectés au survol. C'est LUI qui ouvre le canal + le battement sur la fiche
        // (plus la barre inline) : un seul point de montage. S'auto-efface hors session.
        sessionIndicator={
          <SessionHeaderIndicator campaignId={character.campaignId} identity={sessionIdentity} />
        }
        // Au repos (en haut de page), le dernier maillon annonce la nature de la page ; au
        // défilement il cède la place au nom du personnage (fondu croisé), puis la ligne
        // d'identité s'ajoute à la suite du fil.
        restingLabel="Fiche de personnage"
        // Ligne « peuple · profil · niveau » révélée une fois l'en-tête dépassé
        // (même mise en forme que dans l'en-tête de la fiche, composant partagé).
        subtitle={
          <CharacterIdentityLine
            dense
            ancestryName={ancestry?.name}
            characterClass={characterClass}
            firearmsAllowed={firearmsAllowed}
            priestVocation={character.priestVocation}
            level={character.level}
          />
        }
        subtitleVisible={scrolledPastHeader}
        action={
          readOnly ? undefined : (
            <Button
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
          )
        }
      />

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
              portraitVariant={character.portraitVariant}
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
                  // `overflowWrap: anywhere` (PER-228) : un nom d'un seul mot très long
                  // (sans espace où couper) ne déborde plus horizontalement sur mobile ;
                  // la taille du h4 est déjà réduite sur petit écran par responsiveFontSizes.
                  sx={{ fontWeight: 'bold', overflowWrap: 'anywhere' }}
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
                  <AppTooltip title="Changer l’illustration du profil">
                    <IconButton
                      size="small"
                      onClick={() =>
                        update({
                          portraitVariant:
                            character.portraitVariant === 'alt' ? 'default' : 'alt',
                        })
                      }
                    >
                      <SwapHorizIcon />
                    </IconButton>
                  </AppTooltip>
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

          <ComplianceWarnings warnings={warnings} />

          {/* REPLI (PER-358) : sans stats dérivées, pas de section « État du personnage » — les états
              du joueur s'afficheraient nulle part. Cf. `sessionStatusBlock`. */}
          {!masterDerived && sessionStatusBlock}

          <SheetSection
            title="Caractéristiques"
            icon="abilities"
            action={(collapsed) =>
              collapsed || readOnly ? null : (
                <BlockEditButton
                  editing={editingBlocks.abilities}
                  onToggle={() => toggleBlock('abilities')}
                  label="caractéristiques"
                />
              )
            }
          >
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
              bonusDieSources={display.bonusDieSourcesDetailed}
            />
          </SheetSection>

          {/* Section « Statistiques dérivées » avec un sélecteur de vue, même idiome que « Voies &
              capacités » (PER-296) : les stats dérivées (défaut) ou l'encadré « Compétences & tests »
              (lecture seule), qui vivait juste en dessous en tant que section à part. Le crayon
              d'édition ne s'affiche que sur la vue « Statistiques dérivées » ; les toggles d'affichage
              des domaines de la vue « tests » sont portés par le CONTENU (pas assez de place dans
              l'en-tête à côté du bandeau d'onglets), cf. `TestDomainsPanel`. */}
          <SheetSection
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
            pinnedAction={
              statsView === 'tests' || readOnly ? null : (
                <BlockEditButton
                  editing={editingBlocks.derived}
                  onToggle={() => toggleBlock('derived')}
                  label="statistiques dérivées"
                />
              )
            }
          >
            {statsView === 'tests' ? (
              <TestDomainsPanel
                bonuses={display.testBonuses}
                abilities={effectCtx.abilities}
                abilityTestBonus={display.abilityTestBonus}
                statusTestBonus={display.statusTestBonus}
                statusDomainBonus={display.statusDomainBonus}
                perAbilityTestBonus={display.perAbilityTestBonus}
                magicTestBonuses={display.magicTestBonuses}
                bonusDice={display.bonusDieSources}
                universalBonus={display.universalBonus}
                testDice={display.testDice}
                armorPenalty={display.armorPenalty}
                armorMaxAgi={display.armorMaxAgi}
                includeAbility={testsIncludeAbility}
                onIncludeAbilityChange={setTestsIncludeAbility}
                hideZero={testsHideZero}
                onHideZeroChange={setTestsHideZero}
              />
            ) : adjustedDerivedInput ? (
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
                attackBonusDie={display.attackBonusDieSources}
                boundWeaponAttackDie={display.boundWeaponAttackDie}
                attackMalusDie={attackMalusDie}
                meleeAttackNotes={meleeAttackNotes}
                rangedAttackNotes={rangedAttackNotes}
              />
            ) : (
              <Typography variant="body2" color="text.secondary">
                Profil incomplet : statistiques dérivées indisponibles.
              </Typography>
            )}
          </SheetSection>

          {masterDerived && (
            <SheetSection title="État du personnage" icon="status">
              {/* États de combat appliqués par le MJ en session (PER-281), AU-DESSUS de la barre de
                  vie (PER-358) : badges + effet verbatim + delta agrégé, en lecture seule, et
                  l'annonce d'un effet de groupe. Le chiffre est déjà répercuté sur les stats/attaques
                  plus haut — on le rappelle ici pour que le joueur n'ait pas à recouper trois blocs. */}
              {sessionStatusBlock && <Box sx={{ mb: 2 }}>{sessionStatusBlock}</Box>}
              <PlayerStatusPanel
                depletion={character.depletion}
                // Max EFFECTIF : surcharge manuelle de « Statistiques dérivées » si présente,
                // sinon la valeur calculée. Le bloc n'édite que le courant, jamais le max.
                maxHp={character.overrides.maxHp ?? masterDerived.maxHp}
                onDamage={setHpDamage}
                onHeal={setHpHeal}
                onResetHp={setHpReset}
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
              />
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
              const companions = listCompanions(character);
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
              <ManeuversPanel abilities={effectCtx.abilities} level={character.level} />
            ) : (
            <>
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
            title="Inventaire"
            icon="inventory"
            collapsible
            defaultCollapsed
            persistKey="equipment"
            // PER-116 — dépliage forcé depuis l'icône d'arme de la carte d'attaque (ci-dessous).
            expandSignal={equipmentJumpNonce}
            onExpanded={() => {
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
            // révèle qu'au SURVOL du bloc inventaire (ou au focus clavier, ou d'emblée sur tactile).
            sx={{
              '&:hover .add-mount-on-hover, &:focus-within .add-mount-on-hover': {
                opacity: 1,
                pointerEvents: 'auto',
              },
            }}
            action={(collapsed) =>
              collapsed || readOnly ? null : (
                <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
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
                  <BlockEditButton
                    editing={editingBlocks.equipment}
                    onToggle={() => toggleBlock('equipment')}
                    label="inventaire"
                  />
                </Stack>
              )
            }
          >
            {/* Bourse (PER-152) : argent possédé, état de jeu transitoire (montants éditables hors
                mode « Modifier », non affecté par un repos). Les flèches de conversion entre unités
                n'apparaissent qu'en mode édition du bloc. En tête du bloc inventaire. */}
            <PurseField purse={character.purse} onChange={setPurse} editing={editingBlocks.equipment} />
            <Divider sx={{ my: 1.5 }} />
            <EquipmentList
              equipment={character.equipment}
              onChange={editingBlocks.equipment ? setEquipment : undefined}
              // « Utiliser » : consommer une unité est un état de jeu → disponible hors mode édition.
              onUse={handleUseItem}
              // Chargement des armes (PER-284) : compteur de coups prêts sur les arbalètes et armes
              // à poudre, et gestes tirer / recharger / plein — état de jeu, hors mode édition, et
              // masqués en lecture seule (le compteur, lui, reste affiché).
              weaponLoading={weaponLoading}
              // PER-286 : rappel « objet octroyé par une capacité » (couleuvrine du rang 5), avec
              // son bouton d'ajout — masqué en lecture seule.
              grantedMissing={missingGrantedItems(character, firearmsAllowed)}
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
              extraMasteredWeaponIds={extraMasteredWeaponIds(character)}
              // Badge positif d'affinité d'arme (PER-218) : arme sacrée / arme de peuple « maîtrisée ».
              resolveWeaponAffinities={(itemId) => weaponAffinities(character, itemId)}
              // Indicateur « combat à deux armes → dé malus » (PER-116) par arme en main.
              twoWeaponStatus={twoWeaponCombatStatus(character)}
              // Poigne de fer du colosse (PER-74) : familles d'armes à deux mains maniables à une main
              // → boutons de prise sur ces armes, et bouclier compatible sans avertissement.
              oneHandableFamilies={oneHandableWeaponFamilies(character.featureIds)}
              // Indicateur « armure trop lourde / bouclier interdit » (PER-80) par ligne équipée.
              resolveArmorRestriction={(line) => armorRestrictionByLine(character, rulesContext).get(line) ?? null}
              // Plage de critique de l'arme en main (PER-74) : puce « 19-20 » sur la ligne, cumulant
              // la plage intrinsèque de l'arme et les capacités actives (Critique destructeur…).
              resolveCriticalRange={(line) => weaponLineCriticalRange(character, line)}
              // Puce « Arme liée » (PER-74) sur la seule arme que la voie de l'arme liée concerne.
              resolveBoundWeapon={(line) => boundWeaponPathFor(character, line)}
            />
          </SheetSection>

          <SheetSection
            title="Identité"
            icon="identity"
            collapsible
            defaultCollapsed
            persistKey="identity"
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
              </>
            ) : (
              <IdentityFields
                identity={character.identity}
                ancestryId={character.ancestryId}
                featureIds={character.featureIds}
              />
            )}
          </SheetSection>

          <SheetSection
            title="Notes"
            icon="notes"
            collapsible
            defaultCollapsed
            persistKey="notes"
            action={(collapsed) =>
              collapsed || readOnly ? null : (
                <BlockEditButton
                  editing={editingBlocks.notes}
                  onToggle={() => toggleBlock('notes')}
                  label="notes"
                />
              )
            }
          >
            {editingBlocks.notes ? (
              <TextField
                multiline
                minRows={3}
                fullWidth
                placeholder="Notes libres du joueur…"
                value={character.notes}
                onChange={(e) => update({ notes: e.target.value })}
              />
            ) : character.notes ? (
              <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
                {character.notes}
              </Typography>
            ) : (
              <Typography variant="body2" color="text.secondary">
                Aucune note.
              </Typography>
            )}
          </SheetSection>

          <SheetSection
            title="Historique des niveaux"
            icon="levels"
            collapsible
            defaultCollapsed
            persistKey="level-history"
            action={(collapsed) =>
              !collapsed && !readOnly && canUndoLastLevelUp(character) ? (
                <LevelUndoButton
                  level={character.level}
                  onUndo={() => upsert(undoLastLevelUp(character))}
                />
              ) : null
            }
          >
            <LevelHistory history={character.levelUpHistory} />
            {!readOnly && canUndoLastLevelUp(character) && (
              // Miroir du bouton de l'en-tête, ancré à droite en bas du bloc.
              <Stack direction="row" sx={{ justifyContent: 'flex-end', mt: 2 }}>
                <LevelUndoButton
                  level={character.level}
                  onUndo={() => upsert(undoLastLevelUp(character))}
                />
              </Stack>
            )}
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
      </CapabilityScrollProvider>
      </FeatureDeclensionContext.Provider>
    </FirearmsAllowedProvider>
  );
}
