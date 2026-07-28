'use client';

import { use, useCallback, useEffect, useRef, useState } from 'react';
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
import { ancestryById, classById, families, featureById, progression } from '@/data';
import { checkCompliance } from '@/lib/engine';
import type { AbilityId, StartingEquipmentChoiceOption } from '@/data/schema';
import type { CharacterStatus, DerivedStatId, EquipmentLine, Identity } from '@/lib/character/types';
import { isCustomItem } from '@/lib/character/types';
import { armorEncumbrancePenalty } from '@/lib/character/equipment';
import { defenseFromEquipment } from '@/components/wizard/helpers';
import { modifierDeltas } from '@/lib/character/ancestry';
import { armorRestrictionByLine } from '@/lib/character/armorRestrictions';
import { extraMasteredWeaponIds, masteredClassIds } from '@/lib/character/mastery';
import { twoWeaponCombatStatus } from '@/lib/character/twoWeaponCombat';
import { weaponAffinities } from '@/lib/character/weaponAffinity';
import { PriestVocationIdentityLine } from '@/components/sheet/PriestVocationBadge';
import { firearmsEffective } from '@/lib/character/firearms';
import { useIsPlayerSession } from '@/lib/supabase/useIsPlayerSession';
import { usePresenceHeartbeat } from '@/lib/player/usePresenceHeartbeat';
import { canUndoLastLevelUp, manualFeatureIds, undoLastLevelUp } from '@/lib/character/levelUp';
import { orphanSourceTerms } from '@/lib/character/orphanPoints';
import type { ModSources } from '@/lib/ui/derivedStatBreakdown';
import {
  abilityBonusDiceFromFeatures,
  abilityBonusDiceSources,
  abilityModSources,
  abilityModsFromFeatures,
  abilityTestBonusSources,
  abilityTestBonusByAbility,
  activeAbilityOverrideSources,
  activeFormAbilityBonusSources,
  activeConditionalTestDice,
  armorPenaltyDivisor,
  pruneEffectInputs,
  pruneEffectToggles,
  pruneUsageCounters,
  testBonusSources,
  universalTestBonus,
} from '@/lib/character/effects';
import { pruneFeatureChoices, setFeatureChoice } from '@/lib/character/choices';
import { pruneDepletion } from '@/lib/character/gauges';
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
import { ScrollToTopButton } from '@/components/ScrollToTopButton';
import { CharacterIdentityLine } from '@/components/sheet/CharacterIdentityLine';
import { AppTooltip } from '@/components/AppTooltip';
import { useToast } from '@/components/toast/ToastProvider';
import { DerivedStatsGrid } from '@/components/DerivedStatsGrid';
import { useCharacterGameState } from '@/components/sheet/useCharacterGameState';
import { HeaderIllustrations } from '@/components/HeaderIllustrations';
import { HomeBackground } from '@/components/HomeBackground';
import { CharacterSheetSkeleton } from '@/components/sheet/CharacterSheetSkeleton';
import { FirearmsAllowedProvider } from '@/components/ClassIcon';
import { TombstoneIcon } from '@/components/TombstoneIcon';
import { CampaignBadge } from '@/components/home/CampaignBadge';
import { PlayerBadge } from '@/components/home/PlayerBadge';
import { classColor } from '@/lib/ui/classColors';
import { SheetSection } from '@/components/sheet/SheetSection';
import { BlockEditButton } from '@/components/sheet/BlockEditButton';
import { AppAlert } from '@/components/AppAlert';
import { PlayerStatusPanel } from '@/components/sheet/PlayerStatusPanel';
import { CompanionsPanel } from '@/components/sheet/CompanionsPanel';
import { AddMountButton, OwnedMountsPanel } from '@/components/sheet/OwnedMountsPanel';
import { PurseField } from '@/components/sheet/PurseField';
import { CoinPouchDialog } from '@/components/sheet/CoinPouchDialog';
import { StartingChoiceDialog } from '@/components/sheet/StartingChoiceDialog';
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
import { IdentityFields } from '@/components/sheet/IdentityFields';
import { IdentityEditor } from '@/components/sheet/IdentityEditor';
import { ComplianceWarnings } from '@/components/sheet/ComplianceWarnings';
import { LevelUpDialog } from '@/components/sheet/LevelUpDialog';
import { LevelHistory } from '@/components/sheet/LevelHistory';
import { LevelUndoButton } from '@/components/sheet/LevelUndoButton';
import { useCharactersStore } from '@/stores/characters';
import { useCampaignsStore } from '@/stores/campaigns';
import { usePlayersStore } from '@/stores/players';

const familyById = new Map(families.map((f) => [f.id, f]));

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
  // État de JEU du personnage (PER-257) : vue dérivée, maxima et actions de jeu (interrupteurs,
  // compteurs, PV, repos, compagnons, montures, inventaire) branchés sur le store par un hook
  // mince, adossé aux fonctions PURES de `lib/character/sheetActions`. `null` tant que le
  // personnage n'est pas chargé — d'où l'appel ici, avant les retours anticipés ci-dessous.
  const game = useCharacterGameState(character, { readOnly });

  // Charge le personnage depuis le cloud (RLS `owner_id`, PER-192) en cas d'accès
  // direct à l'URL, et les campagnes pour résoudre le libellé d'attribution.
  useEffect(() => {
    void loadCharacters();
    void loadCampaigns();
  }, [loadCharacters, loadCampaigns]);
  // Charge le roster de la campagne du personnage (quand il en a une), pour le
  // sélecteur/affichage du joueur. Se recharge si la campagne change.
  const characterCampaignId = character?.campaignId ?? null;
  useEffect(() => {
    if (characterCampaignId) void loadPlayers(characterCampaignId);
  }, [characterCampaignId, loadPlayers]);
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
  const { showToast } = useToast();
  // Index de la ligne « Bourse de 2d6 pa » dont l'ouverture est en cours (modale) ; null = fermée.
  const [coinPouchIndex, setCoinPouchIndex] = useState<number | null>(null);
  // Index de la ligne de CHOIX d'équipement de départ en cours de résolution (PER-220) ; null = fermée.
  const [choiceIndex, setChoiceIndex] = useState<number | null>(null);
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
      unarmedCriticalRanges,
      rangedWeaponDamage,
      meleeSituationalDamage,
      rangedSituationalDamage,
      rangedAttackMagicalSourceId,
      rangedAttackElement,
      rangedReplacingFormAttack: formAttackReplacingRanged,
      attackBonusModSources,
    },
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
    applyItemUse,
    openCoinPouch,
    resolveStartingChoice,
    setWorn,
    setPurse,
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

  // Détail « i » des stats dérivées : points de capacité orphelins convertis (p. 40) + bonus à la
  // touche conditionnés à l'arme portée (maître d'armes, PER-226), fusionnés par stat. Le TOTAL de
  // ces derniers est déjà FONDU dans le score (via `derivedInput.mods`) ; ici on n'ajoute que
  // l'attribution de la source dans l'infobulle (pas de badge).
  const derivedExtraModSources: ModSources = { ...orphanSourceTerms(character) };
  for (const [key, list] of Object.entries(attackBonusModSources)) {
    const k = key as keyof ModSources;
    derivedExtraModSources[k] = [...(derivedExtraModSources[k] ?? []), ...(list ?? [])];
  }
  // Modificateurs permanents de caractéristiques et dés bonus apportés par les
  // capacités (mécanique core) — appliqués PAR-DESSUS la valeur saisie des caracs.
  const abilityMods = abilityModsFromFeatures(modFeatureIds, character.featureChoices);
  const abilityModSrc = abilityModSources(modFeatureIds, character.featureChoices);
  // Surcharges de caractéristiques par une transformation ACTIVE (PER-74, ex. forme de loup) : imposent
  // une valeur absolue en lecture, cohérente avec les stats dérivées (toutes via `effectiveAbilities`).
  const abilityOverrideSrc = activeAbilityOverrideSources(character);
  // Bonus de carac EN DELTA conditionnés à une forme active (PER-74, ex. Forme puissante : +2 FOR sous
  // loup/hybride) — appliqués par-dessus l'override en lecture, cohérents avec `effectiveAbilities`.
  const abilityFormBonusSrc = activeFormAbilityBonusSources(character);
  const bonusDieSrc = abilityBonusDiceFromFeatures(modFeatureIds, character.featureChoices);
  // Variante détaillée (avec `featureId`) pour rendre les sources en pastilles de capacité
  // dans le détail d'une caractéristique (l'icône double-d20 n'affiche, elle, que les noms).
  const bonusDieSrcDetailed = abilityBonusDiceSources(modFeatureIds, character.featureChoices);
  // Bonus de compétence par domaine de test (PER-89) — règle de cumul du livre (p. 203).
  const testBonuses = testBonusSources(modFeatureIds, effectCtx);
  // Dés bonus CONDITIONNELS actifs sur des domaines (ex. Travail d'équipe, via son interrupteur).
  const testDice = activeConditionalTestDice(character);
  // Buffs ACTIFS à tous les tests de carac (ex. Bénédiction, via son interrupteur).
  const abilityTestBonus = abilityTestBonusSources(modFeatureIds, effectCtx);
  // Bonus aux tests d'UNE carac précise, par option retenue (ex. Tatouages, PER-125).
  const perAbilityTestBonus = abilityTestBonusByAbility(modFeatureIds, effectCtx);
  // Plancher de compétence universel (Éclectique, PER-102).
  const universalTest = universalTestBonus(modFeatureIds);
  // Malus d'armure (p. 188, PER-209) : DEF mondaine de l'armure portée − bonus magique,
  // plancher 0. Minore les tests d'AGI (application automatique) et rappelle le MJ sur les
  // tests de survie CON. Le plafond d'AGI de l'armure portée (PER-78) est appliqué AVANT le
  // malus sur la ligne « test de AGI » ; on lit ce plafond directement sur l'équipement
  // (indépendant de la dérogation de défense « Dentelles », seduction-r2).
  // Armure sur mesure (chevalier, guerre-r1, PER-236) peut diviser ce malus (ici de moitié).
  const armorPenalty = armorEncumbrancePenalty(character.equipment, armorPenaltyDivisor(modFeatureIds));
  const armorMaxAgi = defenseFromEquipment(character.equipment).maxAgi;

  // Le personnage dispose-t-il d'une réserve de mana ? Uniquement s'il connaît au
  // moins un sort (cf. `manaPoints`, qui retourne null sinon). Sert à n'afficher la
  // Concentration accrue (p. 228) que pour les lanceurs de sorts : sans sort, le
  // toggle ne change rien.
  const hasSpells = modFeatureIds.some((fid) => featureById.get(fid)?.isSpell);

  return (
    // Toutes les icônes de profil de la fiche (en-tête, voies, montée de niveau,
    // références d'emprunt…) suivent le réglage « armes à feu » du personnage :
    // l'arquebusier privé de poudre affiche une arbalète (« Arbalétrier », p. 62).
    <FirearmsAllowedProvider value={firearmsAllowed}>
      {/* Titre de l'onglet = nom du personnage. Rendu déclaratif (React 19 le
          hisse dans le <head>) plutôt que document.title dans un effet : sinon
          la métadonnée en streaming de Next réécrase le titre après hydratation
          (clignotement nom → titre de base). Réactif : suit l'édition du nom. */}
      <title>{`${character.name || 'Sans nom'} — Éditeur de personnage CO2`}</title>
      <AppHeader
        // Fil d'Ariane : rattaché à une campagne → « {campagne} / {nom} » (le parent
        // pointe vers la vue campagne) ; sinon le nom seul (page de premier niveau).
        // Le nom (dernier maillon) est TOUJOURS visible : l'ancien fondu croisé
        // « Fiche de personnage → nom » n'a plus lieu d'être (PER-239).
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
        // Sous-titre « peuple · profil · niveau » révélé une fois l'en-tête dépassé
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
              abilityMods={abilityMods}
              abilityModSources={abilityModSrc}
              abilityOverrides={abilityOverrideSrc}
              abilityFormBonuses={abilityFormBonusSrc}
              bonusDieSources={bonusDieSrcDetailed}
            />
          </SheetSection>

          <SheetSection
            title="Statistiques dérivées"
            icon="derived"
            action={(collapsed) =>
              collapsed || readOnly ? null : (
                <BlockEditButton
                  editing={editingBlocks.derived}
                  onToggle={() => toggleBlock('derived')}
                  label="statistiques dérivées"
                />
              )
            }
          >
            {derivedInput ? (
              <DerivedStatsGrid
                input={derivedInput}
                featureIds={modFeatureIds}
                effectContext={effectCtx}
                extraModSources={derivedExtraModSources}
                overrides={character.overrides}
                onOverride={editingBlocks.derived ? setOverride : undefined}
                defenseBadges={defenseBadges}
                meleeCriticalRanges={meleeCriticalRanges}
                rangedCriticalRanges={rangedCriticalRanges}
                unarmedStrike={unarmed}
                meleeWeaponDamage={meleeWeaponDamage}
                unarmedCriticalRanges={unarmedCriticalRanges}
                rangedWeaponDamage={rangedWeaponDamage}
                meleeSituationalDamage={meleeSituationalDamage}
                rangedSituationalDamage={rangedSituationalDamage}
                rangedAttackMagicalSourceId={rangedAttackMagicalSourceId}
                rangedAttackElement={rangedAttackElement}
                rangedReplacingFormAttack={formAttackReplacingRanged}
              />
            ) : (
              <Typography variant="body2" color="text.secondary">
                Profil incomplet : statistiques dérivées indisponibles.
              </Typography>
            )}
          </SheetSection>

          <TestDomainsPanel
            bonuses={testBonuses}
            abilities={effectCtx.abilities}
            abilityTestBonus={abilityTestBonus}
            perAbilityTestBonus={perAbilityTestBonus}
            bonusDice={bonusDieSrc}
            universalBonus={universalTest}
            testDice={testDice}
            armorPenalty={armorPenalty}
            armorMaxAgi={armorMaxAgi}
          />

          {masterDerived && (
            <SheetSection title="État du personnage" icon="status">
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
                elixirDosesToLose={elixirDosesToLose}
              />
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
              // La section apparaît dès qu'il y a un compagnon OU une monture ; le bouton « Ajouter
              // une monture » reste dispo même sans monture, pour pouvoir en acquérir (hors lecture seule).
              if (companions.length === 0 && ownedMounts.length === 0 && readOnly) return null;
              return (
                <SheetSection
                  title="Compagnons"
                  icon="companions"
                  action={readOnly ? undefined : <AddMountButton onAdd={addMount} />}
                >
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

          <SheetSection
            title="Voies & capacités"
            icon="paths"
            action={
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                {hasSpells && (
                  <ConcentrationToggle value={concentration} onChange={setConcentration} />
                )}
                <VerbatimToggle value={featuresVerbatim} onChange={setFeaturesVerbatim} />
                <FeaturesLayoutToggle value={voiesLayout} onChange={changeVoiesLayout} />
                {!readOnly && (
                  <BlockEditButton
                    editing={editingBlocks.features}
                    onToggle={() => toggleBlock('features')}
                    label="voies & capacités"
                  />
                )}
              </Stack>
            }
          >
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
              // Saisie libre corrélée (animal de Forme animale) : état de jeu, comme
              // les interrupteurs, donc modifiable hors édition.
              onSetEffectInput={setEffectInputValue}
              // Compteur d'usages limités (Les sept vies du chat) : état de jeu.
              onSetUsageCounter={setUsageCounterValue}
              // Débloquer sans repos (cadenas) : lève le verrou « repos court requis » d'une capacité.
              onLiftShortRestLock={liftShortRestLock}
              // Créer un élixir (forgesort) : décompte la réserve + ajoute la dose à l'équipement.
              onCreateElixir={createElixir}
              // Invoquer un zombie (badge bleu « Invoquer ») : crée une instance à PV propres, dans
              // la limite du profil — état de jeu, comme les interrupteurs/compteurs (PER-235).
              onSummonCompanionInstance={summonCompanionInstance}
              // Stats du maître : Init./attaque des compagnons recopient ce total.
              masterDerived={masterDerived}
              // Bonus de compétence par domaine : sert à signaler, sur une capacité EMPRUNTÉE, que son
              // bonus de test est DOMINÉ (ne se cumule pas) — barré + capacité qui le domine (PER-73).
              testBonuses={testBonuses}
            />
          </SheetSection>

          <SheetSection
            title="Inventaire"
            icon="inventory"
            collapsible
            defaultCollapsed
            persistKey="equipment"
            action={(collapsed) =>
              collapsed || readOnly ? null : (
                <BlockEditButton
                  editing={editingBlocks.equipment}
                  onToggle={() => toggleBlock('equipment')}
                  label="inventaire"
                />
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
              // Indicateur « armure trop lourde / bouclier interdit » (PER-80) par ligne équipée.
              resolveArmorRestriction={(line) => armorRestrictionByLine(character, rulesContext).get(line) ?? null}
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
              <IdentityEditor
                name={character.name}
                identity={character.identity}
                ancestry={ancestry}
                onName={(name) => update({ name })}
                onIdentity={setIdentity}
              />
            ) : (
              <IdentityFields identity={character.identity} />
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
    </FirearmsAllowedProvider>
  );
}
