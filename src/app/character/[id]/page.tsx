'use client';

import { use, useEffect, useState } from 'react';
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
import { ancestryById, classById, COIN_POUCH_ITEM_NAME, families, featureById, progression } from '@/data';
import { checkCompliance, deriveStats } from '@/lib/engine';
import type { AbilityId } from '@/data/schema';
import type { Character, CharacterStatus, CustomItem, DerivedStatId, EquipmentLine, Identity, WornState } from '@/lib/character/types';
import { isCustomItem } from '@/lib/character/types';
import { setWornAt } from '@/lib/character/equipment';
import { elixirItemName, isElixirItemName } from '@/lib/character/elixirs';
import { modifierDeltas } from '@/lib/character/ancestry';
import { classDisplayName } from '@/lib/character/classDisplay';
import { masteredClassIds } from '@/lib/character/mastery';
import { firearmsEffective } from '@/lib/character/firearms';
import { useIsPlayerSession } from '@/lib/supabase/useIsPlayerSession';
import { usePresenceHeartbeat } from '@/lib/player/usePresenceHeartbeat';
import { canUndoLastLevelUp, manualFeatureIds, undoLastLevelUp } from '@/lib/character/levelUp';
import { orphanSourceTerms } from '@/lib/character/orphanPoints';
import {
  abilityBonusDiceFromFeatures,
  abilityBonusDiceSources,
  abilityModSources,
  abilityModsFromFeatures,
  abilityTestBonusSources,
  abilityTestBonusByAbility,
  activeConditionalTestDice,
  capacityResourceGauges,
  conditionalEffectsOf,
  pruneEffectInputs,
  pruneEffectToggles,
  pruneUsageCounters,
  resetUsageCounters,
  setEffectToggle,
  shortRestLockKey,
  usageCounterMaximum,
  testBonusSources,
  universalTestBonus,
} from '@/lib/character/effects';
import { pruneFeatureChoices, setFeatureChoice } from '@/lib/character/choices';
import {
  applyDamage,
  healHp,
  pruneDepletion,
  resetHp,
  resetLuck,
  resetMana,
  restoreLuck,
  restoreMana,
  setRecoveryDiceMissing,
  spendLuck,
  spendMana,
} from '@/lib/character/gauges';
import { longRest, shortRest } from '@/lib/character/rest';
import type { FeatureChoiceSelection } from '@/lib/character/types';
import { rulesContext } from '@/lib/character/rulesContext';
import { AppHeader } from '@/components/AppHeader';
import { AppTooltip } from '@/components/AppTooltip';
import { useToast } from '@/components/toast/ToastProvider';
import { DerivedStatsGrid } from '@/components/DerivedStatsGrid';
import { buildCharacterDerivedView } from '@/components/sheet/characterDerivedView';
import { HeaderIllustrations } from '@/components/HeaderIllustrations';
import { HomeBackground } from '@/components/HomeBackground';
import { CharacterSheetSkeleton } from '@/components/sheet/CharacterSheetSkeleton';
import { ClassIcon, FirearmsAllowedProvider } from '@/components/ClassIcon';
import { TombstoneIcon } from '@/components/TombstoneIcon';
import { CampaignBadge } from '@/components/home/CampaignBadge';
import { PlayerBadge } from '@/components/home/PlayerBadge';
import { classColor } from '@/lib/ui/classColors';
import { SheetSection } from '@/components/sheet/SheetSection';
import { BlockEditButton } from '@/components/sheet/BlockEditButton';
import { AppAlert } from '@/components/AppAlert';
import { PlayerStatusPanel } from '@/components/sheet/PlayerStatusPanel';
import { PurseField } from '@/components/sheet/PurseField';
import { CoinPouchDialog } from '@/components/sheet/CoinPouchDialog';
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
  const [voiesLayout, setVoiesLayout] = useState<FeaturesLayout>('columns');
  // Texte d'origine (PER-88) : OFF (défaut) → rendu enrichi des capacités ; ON →
  // verbatim du livre. Préférence d'affichage transitoire, comme la disposition des voies.
  const [featuresVerbatim, setFeaturesVerbatim] = useState(false);
  // Concentration accrue (p. 228) : état de jeu transitoire (non persisté), comme
  // l'affichage des voies. Quand actif, les sorts en (A) montrent leur coût réduit.
  const [concentration, setConcentration] = useState(false);
  const { showToast } = useToast();
  // Index de la ligne « Bourse de 2d6 pa » dont l'ouverture est en cours (modale) ; null = fermée.
  const [coinPouchIndex, setCoinPouchIndex] = useState<number | null>(null);
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

  if (!character) {
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

  // Lecture seule (PER-196) : session joueur consultant une fiche qui n'est pas la
  // sienne. La RLS refuserait toute écriture (update 0 ligne → conflit silencieux),
  // donc on neutralise l'édition en amont — `update` devient un no-op et les
  // affordances d'édition (Modifier, crayons, montée de niveau, recréation) sont
  // masquées plus bas.
  const readOnly = isPlayer && character.playerId !== sessionPlayerId;

  // Sauvegarde permissive : chaque modification persiste immédiatement (le store
  // applique `updatedAt`). La fiche n'empêche aucun écart aux règles (PER-45).
  // En lecture seule, aucune écriture (garde-fou : évite les rejets RLS silencieux).
  const update = (patch: Partial<Character>) => {
    if (readOnly) return;
    upsert({ ...character, ...patch });
  };
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
  // Retour contextuel (PER-184) : la navigation vers une fiche passe surtout par
  // la campagne. On y renvoie donc quand le perso y est rattaché, sinon vers
  // l'accueil. Choix piloté par la DONNÉE (pas l'historique) : robuste sur lien
  // direct / rechargement. Le libellé nomme la destination (infobulle + a11y).
  const backTarget = character.campaignId
    ? {
        href: `/campaign/${character.campaignId}`,
        label: `Retour à ${currentCampaign?.name ?? 'la campagne'}`,
      }
    : { href: '/', label: 'Retour à l’accueil' };

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
  // Équiper / déséquiper une ligne (PER-77) : état de jeu (on change d'arme, on lève le
  // bouclier), donc disponible hors mode « Modifier ». Le port ne réajuste pas les autres
  // lignes ; les conflits durs sont SIGNALÉS (non bloquant), pas empêchés.
  const setWorn = (i: number, worn: WornState | undefined) =>
    update({ equipment: setWornAt(character.equipment, i, worn) });
  // L'édition des capacités élague les choix orphelins (capacité retirée → ses
  // choix persistés sont supprimés), pour ne pas conserver de choix fantôme.
  const setFeatureIds = (featureIds: string[]) =>
    update({
      featureIds,
      featureChoices: pruneFeatureChoices(character.featureChoices, featureIds),
      effectToggles: pruneEffectToggles(character.effectToggles, featureIds),
      effectInputs: pruneEffectInputs(character.effectInputs, featureIds),
      usageCounters: pruneUsageCounters(character.usageCounters, featureIds),
      depletion: pruneDepletion(character.depletion),
    });
  // Résolution rétroactive d'un choix porté par une capacité (PER-66/68). La
  // fiche est permissive : on persiste sans bloquer (recalcul en direct).
  const setChoice = (featureId: string, index: number, value: FeatureChoiceSelection) =>
    update({ featureChoices: setFeatureChoice(character, featureId, index, value) });
  // Bascule d'un interrupteur d'effet conditionnel/temporaire (PER-67). Recalcul
  // en direct : le moteur n'inclut l'effet que lorsqu'il est actif.
  const setEffectToggleValue = (featureId: string, index: number, active: boolean) => {
    const nextToggles = setEffectToggle(character, featureId, index, active);
    const patch: Partial<typeof character> = { effectToggles: nextToggles };
    // PER-130 : ACTIVER un état TEMPORAIRE doté d'un compteur d'usages le CONSOMME (ex. Rage / Furie
    // du berserk) — équivaut à un clic « − » de `cost`, clampé à [0, max] (jamais sous 0). Pas de
    // remboursement à l'extinction (comme le « − »). Les autres interrupteurs ne touchent pas le compteur.
    const feature = featureById.get(featureId);
    const effect = feature?.effects?.[index];
    const counter = feature?.usageCounter;
    if (
      active &&
      feature &&
      counter &&
      counter.consumeOnActivate !== false &&
      effect?.kind === 'conditional-stat-bonus' &&
      effect.activation.kind === 'temporary'
    ) {
      const key = counter.sharedKey ?? feature.id;
      const max = usageCounterMaximum(counter, character, feature);
      const cost = counter.cost ?? 1;
      const remaining = Math.max(0, Math.min(max, character.usageCounters?.[key] ?? max));
      const nextVal = Math.max(0, remaining - cost);
      const nextCounters = { ...character.usageCounters };
      if (nextVal >= max) delete nextCounters[key];
      else nextCounters[key] = nextVal;
      // PER-161 : si le compteur est verrouillé « 1 dépense par repos court » (`oncePerShortRest`,
      // ex. Sanctuaire), activer l'interrupteur pose le verrou (miroir du « − » de setUsageCounterValue)
      // — la réactivation reste bloquée jusqu'au prochain repos court, indépendamment du reste.
      if (counter.oncePerShortRest && nextVal < remaining) nextCounters[shortRestLockKey(key)] = 1;
      patch.usageCounters = nextCounters;
    }
    // PER-150 : ACTIVER un effet temporaire doté d'un compteur de SUIVI `resetOnActivate` le remet à
    // PLEIN (absorption d'Armure de pierre rechargée au relancement du sort). Absence de clé = plein.
    if (
      active &&
      feature &&
      counter?.resetOnActivate &&
      effect?.kind === 'conditional-stat-bonus' &&
      effect.activation.kind === 'temporary'
    ) {
      const key = counter.sharedKey ?? feature.id;
      const nextCounters = { ...character.usageCounters };
      delete nextCounters[key];
      patch.usageCounters = nextCounters;
    }
    update(patch);
  };
  // Saisie libre d'état de jeu corrélée à une capacité (PER-70, ex. animal de Forme
  // animale). Une chaîne vide supprime la clé (pas de note fantôme).
  const setEffectInputValue = (featureId: string, value: string) => {
    const next = { ...character.effectInputs };
    if (value.trim() === '') delete next[featureId];
    else next[featureId] = value;
    update({ effectInputs: next });
  };
  // Décompte d'une capacité à usages limités (PER-70, ex. Les sept vies du chat).
  // Borné à [0, max] ; au maximum, on supprime la clé (= compteur plein par défaut). La CLÉ peut
  // être une `sharedKey` (réserve partagée, PER-119) et non un id de capacité → le max effectif
  // (constant ou scalant) est calculé par le composant et fourni ici, plutôt que relu via l'id.
  const setUsageCounterValue = (counterKey: string, value: number, max: number) => {
    // PER-162 : compteur CROISSANT (surcoût mana, ex. Foudres divines) — sémantique inverse : pas de
    // plafond, baseline = 0 (clé absente), aucun verrou. `counterKey` = id de la capacité.
    const escalating = featureById.get(counterKey)?.escalatingManaCost;
    if (escalating) {
      const raised = Math.max(0, value);
      const nextEsc = { ...character.usageCounters };
      if (raised <= 0) delete nextEsc[counterKey];
      else nextEsc[counterKey] = raised;
      update({ usageCounters: nextEsc });
      return;
    }
    const clamped = Math.max(0, Math.min(max, value));
    const next = { ...character.usageCounters };
    if (clamped >= max) delete next[counterKey];
    else next[counterKey] = clamped;
    const patch: Partial<typeof character> = { usageCounters: next };
    // PER-150 : un compteur de SUIVI `endsEffectAtZero` qui tombe à 0 COUPE l'interrupteur des effets
    // de la capacité porteuse (Armure de pierre prend fin dès son plafond d'absorption atteint). La
    // clé du compteur vaut alors l'id de la capacité (compteur propre, non partagé).
    const feature = featureById.get(counterKey);
    if (clamped <= 0 && feature?.usageCounter?.endsEffectAtZero) {
      let toggles = character.effectToggles;
      for (const { index } of conditionalEffectsOf(counterKey)) {
        toggles = setEffectToggle({ ...character, effectToggles: toggles }, counterKey, index, false);
      }
      patch.effectToggles = toggles;
    }
    // PER-160 : DÉPENSE (valeur en baisse) d'un compteur `oncePerShortRest` → pose le verrou « repos
    // court requis avant un nouvel usage » (levé par tout repos court/long). Incrément/reset : rien.
    if (feature?.usageCounter?.oncePerShortRest) {
      const prev = character.usageCounters?.[counterKey] ?? max;
      if (clamped < prev) next[shortRestLockKey(counterKey)] = 1;
    }
    update(patch);
  };
  // PER-160/161 : lever le verrou « repos court requis » d'UNE capacité sans forcer un vrai repos —
  // pour ne jamais OBLIGER le joueur à cliquer « Repos court » (usage app-first). Applique EXACTEMENT
  // l'effet d'un repos court, mais restreint à cette seule capacité (mêmes déclencheurs que shortRest :
  // lève le verrou `oncePerShortRest` et recharge ce qu'un repos court rechargerait — ex. la charge de
  // Sanctuaire ; la réserve /jour de Transe reste inchangée, comme lors d'un vrai repos court).
  const liftShortRestLock = (featureId: string) =>
    update({
      usageCounters: resetUsageCounters(character.usageCounters, [featureId], new Set(['short-rest', 'combat'])),
    });
  // Créer un élixir (forgesort, p. 98) : consomme la réserve partagée d'un cran (`cost`) ET
  // matérialise la dose dans l'équipement (objet custom, quantité incrémentée si déjà présent).
  // Les deux mutations partent dans UNE seule mise à jour, pour ne pas s'écraser l'une l'autre.
  // Matérialisation minimale (le transfert à un autre personnage relève de PER-158).
  const createElixir = (counterKey: string, cost: number, max: number, elixirName: string) => {
    const remaining = Math.max(0, Math.min(max, character.usageCounters?.[counterKey] ?? max));
    if (remaining < cost) return;
    const usageCounters = { ...character.usageCounters };
    const nextValue = remaining - cost;
    if (nextValue >= max) delete usageCounters[counterKey];
    else usageCounters[counterKey] = nextValue;
    const itemName = elixirItemName(elixirName);
    const equipment = [...character.equipment];
    const idx = equipment.findIndex((line) => isCustomItem(line) && line.name === itemName);
    if (idx >= 0) {
      const line = equipment[idx] as CustomItem;
      equipment[idx] = { ...line, quantity: line.quantity + 1 };
    } else {
      equipment.push({ custom: true, name: itemName, quantity: 1, details: 'Élixir préparé (voie des élixirs, p. 98).' });
    }
    update({ usageCounters, equipment });
  };
  // Consomme une unité de la ligne `i` : décrémente la quantité, retire la ligne à 0.
  const consumeEquipmentLine = (i: number): EquipmentLine[] => {
    const line = character.equipment[i];
    if (!line) return character.equipment;
    return line.quantity <= 1
      ? character.equipment.filter((_, j) => j !== i)
      : character.equipment.map((l, j) => (j === i ? { ...l, quantity: l.quantity - 1 } : l));
  };
  // Utiliser un objet (PER-158) : consommer une unité est un état de jeu (hors édition).
  // Cas particulier de la « Bourse de 2d6 pa » (p. 31) : au lieu de simplement la consommer,
  // on ouvre une modale pour saisir les pa tirés, qui s'ajoutent à la fortune (PER-152).
  const useEquipmentItem = (i: number) => {
    const line = character.equipment[i];
    if (!line) return;
    if (isCustomItem(line) && line.name === COIN_POUCH_ITEM_NAME) {
      setCoinPouchIndex(i);
      return;
    }
    update({ equipment: consumeEquipmentLine(i) });
  };
  // Validation de la modale de bourse : ajoute `silver` pa à la fortune et consomme la dose.
  const confirmCoinPouch = (silver: number) => {
    if (coinPouchIndex === null) return;
    update({
      equipment: consumeEquipmentLine(coinPouchIndex),
      purse: { ...character.purse, silver: character.purse.silver + silver },
    });
    setCoinPouchIndex(null);
  };
  // Jauge de PV (PER-148) : dépletion transitoire (manque létal/temp), état de jeu
  // modifiable HORS mode « Modifier » (comme les compteurs d'usages). Le max reste
  // piloté par « Statistiques dérivées » ; ces setters ne touchent que le courant.
  // Le manque de PV est plafonné au max EFFECTIF (surcharge ?? dérivé) : on ne descend
  // jamais sous 0 PV, et le manque ne s'accumule pas au-delà (sinon les « - » à vide
  // exigeraient autant de soins pour remonter). `masterDerived` est en portée à l'appel.
  const setHpDamage = (amount: number, kind: 'lethal' | 'temp') =>
    update({
      depletion: applyDamage(
        character.depletion,
        amount,
        kind,
        character.overrides.maxHp ?? masterDerived?.maxHp,
      ),
    });
  const setHpHeal = (amount: number) => update({ depletion: healHp(character.depletion, amount) });
  const setHpReset = () => update({ depletion: resetHp(character.depletion) });
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

  // Statistiques dérivées : entrée moteur + badges (immunités / RD / plages de critique),
  // calculés par le helper partagé avec l'écran de MJ (source unique — cf.
  // `buildCharacterDerivedView`, qui portait auparavant ce calcul inline dans la fiche).
  const {
    modFeatureIds,
    effectContext: effectCtx,
    derivedInput,
    defenseBadges,
    meleeCriticalRanges,
    rangedCriticalRanges,
  } = buildCharacterDerivedView(character);
  // Modificateurs permanents de caractéristiques et dés bonus apportés par les
  // capacités (mécanique core) — appliqués PAR-DESSUS la valeur saisie des caracs.
  const abilityMods = abilityModsFromFeatures(modFeatureIds, character.featureChoices);
  const abilityModSrc = abilityModSources(modFeatureIds, character.featureChoices);
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

  // Le personnage dispose-t-il d'une réserve de mana ? Uniquement s'il connaît au
  // moins un sort (cf. `manaPoints`, qui retourne null sinon). Sert à n'afficher la
  // Concentration accrue (p. 228) que pour les lanceurs de sorts : sans sort, le
  // toggle ne change rien.
  const hasSpells = modFeatureIds.some((fid) => featureById.get(fid)?.isSpell);

  // Stats dérivées finales du MAÎTRE (mods inclus), avec surcharges manuelles pour les
  // stats recopiées par les profils de créature (Init., attaque). Sert aux mini-fiches
  // de compagnons (golem, familier, démon…), dont l'Init/attaque = celle du maître.
  const masterDerived = derivedInput
    ? (() => {
        const s = deriveStats(derivedInput);
        const ov = character.overrides;
        return { ...s, initiative: ov.initiative ?? s.initiative, magicAttack: ov.magicAttack ?? s.magicAttack };
      })()
    : undefined;

  // Réserve de mana EFFECTIVE (PER-149) : surcharge manuelle si présente, sinon la
  // valeur dérivée (`null` = aucun sort → pas de jauge de mana). Ces setters bornent
  // le manque au max courant, comme le compteur d'usages.
  const manaMax = masterDerived ? character.overrides.manaPoints ?? masterDerived.manaPoints : null;
  const setManaSpend = (amount: number) =>
    update({ depletion: spendMana(character.depletion, amount, manaMax ?? 0) });
  const setManaRestore = (amount: number) =>
    update({ depletion: restoreMana(character.depletion, amount, manaMax ?? 0) });
  const setManaReset = () => update({ depletion: resetMana(character.depletion) });
  // Points de chance (PER-155) : max EFFECTIF (surcharge ?? dérivé). Universel (pas de condition).
  const luckMax = masterDerived ? character.overrides.luckPoints ?? masterDerived.luckPoints : 0;
  const setLuckSpend = (amount: number) =>
    update({ depletion: spendLuck(character.depletion, amount, luckMax) });
  const setLuckRestore = (amount: number) =>
    update({ depletion: restoreLuck(character.depletion, amount, luckMax) });
  const setLuckReset = () => update({ depletion: resetLuck(character.depletion) });
  // Dés de récupération (PER-151) : max EFFECTIF (surcharge ?? dérivé) et type de dé pour la jauge.
  const recoveryDiceMax = masterDerived
    ? character.overrides.recoveryDiceCount ?? masterDerived.recoveryDiceCount
    : 0;
  const recoveryDie = masterDerived?.recoveryDie ?? 'd6';
  // Matrice de DR (PER-151) : on fixe le nombre de DR DISPONIBLES (le manque = max − dispo).
  const setDrCurrent = (value: number) =>
    update({ depletion: setRecoveryDiceMissing(character.depletion, recoveryDiceMax - value, recoveryDiceMax) });
  // Repos (PER-151) : applique la récupération réglementaire (patch depletion + usageCounters).
  // Repos court : `recoveryDieRoll` = résultat du dé saisi pour dépenser 1 DR et soigner ; null sinon.
  const doShortRest = (recoveryDieRoll: number | null) =>
    update(
      shortRest(
        character,
        recoveryDieRoll != null ? { dieRoll: recoveryDieRoll, recoveryDiceMax } : undefined,
      ),
    );
  // Repos long : `heal` → dépenser le DR gagné pour un soin à la valeur MAX du dé (p. 222).
  const doLongRest = (heal: boolean) =>
    update(longRest(character, heal ? { dieFaces: Number.parseInt(recoveryDie.slice(1), 10) || 0 } : undefined));
  // Bourse (PER-152) : argent possédé, état de jeu transitoire (non touché par un repos).
  const setPurse = (purse: Character['purse']) => update({ purse });
  // Doses d'élixir en inventaire, perdues par un repos long (voie des élixirs, p. 98) — pour l'avertissement.
  const elixirDosesToLose = character.equipment.reduce(
    (n, line) => (isCustomItem(line) && isElixirItemName(line.name) ? n + line.quantity : n),
    0,
  );
  // Ressources de capacité (rage, sept vies…) surfacées en jauges (PER-150) : lues depuis les
  // MÊMES `usageCounters` que FeaturesByPath (source unique). L'écriture passe par le setter existant.
  const capacityGauges = capacityResourceGauges(character);

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
        title={character.name || 'Sans nom'}
        backHref={backTarget.href}
        backLabel={backTarget.label}
        action={
          readOnly ? undefined : (
            <Button
              color="inherit"
              startIcon={allEditing ? <DoneIcon /> : <EditIcon />}
              onClick={toggleAllEditing}
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
                <Typography variant="h4" component="h2" sx={{ fontWeight: 'bold' }}>
                  {character.name || 'Sans nom'}
                </Typography>
              )}
            </Stack>
            <Stack
              direction="row"
              spacing={0.75}
              sx={{
                alignItems: 'center',
                color: 'text.secondary',
                flexWrap: 'wrap',
                position: 'relative',
                zIndex: 1,
              }}
            >
              <Typography variant="body1" component="span">
                {ancestry?.name ?? 'Peuple à définir'} ·
              </Typography>
              {characterClass && <ClassIcon classId={characterClass.id} size={20} />}
              <Typography
                variant="body1"
                component="span"
                sx={{
                  color: characterClass ? classColor(characterClass.id) : 'text.secondary',
                  fontWeight: 600,
                }}
              >
                {characterClass
                  ? classDisplayName(characterClass, firearmsAllowed)
                  : 'Profil à définir'}
              </Typography>
              <Typography variant="body1" component="span">
                · niveau {character.level}
              </Typography>
            </Stack>

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
                extraModSources={orphanSourceTerms(character)}
                overrides={character.overrides}
                onOverride={editingBlocks.derived ? setOverride : undefined}
                defenseBadges={defenseBadges}
                meleeCriticalRanges={meleeCriticalRanges}
                rangedCriticalRanges={rangedCriticalRanges}
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

          <SheetSection
            title="Voies & capacités"
            icon="paths"
            action={
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                {hasSpells && (
                  <ConcentrationToggle value={concentration} onChange={setConcentration} />
                )}
                <VerbatimToggle value={featuresVerbatim} onChange={setFeaturesVerbatim} />
                <FeaturesLayoutToggle value={voiesLayout} onChange={setVoiesLayout} />
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
              onUse={useEquipmentItem}
              // Équiper/déséquiper (PER-77) : état de jeu, hors mode édition ; masqué en lecture seule
              // (le porté reste montré par un badge). Voir `setWorn`.
              onWear={readOnly ? undefined : setWorn}
              // Reskins d'objet du profil (PER-181) : druide `baton-ferre` → « Bâton noueux ».
              characterClass={characterClass}
              // Indicateur « arme non maîtrisée → dé malus » (PER-79) sur les armes en main.
              masteredIds={masteredClassIds(character, rulesContext)}
              firearmsAllowed={firearmsAllowed}
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
