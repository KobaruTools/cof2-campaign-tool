'use client';

/**
 * Panneau latéral de fiche de l'écran de MJ (PER-258) : une fiche de personnage
 * PARTIELLE, ouverte par-dessus l'écran de MJ pour répondre à un joueur sans quitter le
 * combat en cours (tracker, roster de créatures et position dans la page préservés).
 *
 * Premier `Drawer` du projet — variante `temporary` (voile, Échap, piège de focus),
 * ancré à droite, ≤ 1040 px pour retrouver le confort de lecture de la vraie fiche
 * (conteneur `md`), plein écran sous `sm`. Les `Dialog` ouverts DEPUIS le panneau
 * (capacité en vue colonnes, bourse, choix de départ) se placent au-dessus sans
 * bricolage : z-index modale 1300 > volet 1200.
 *
 * Périmètre d'écriture :
 *  - **états de jeu OUI** : interrupteurs, compteurs, élixirs, équiper/déséquiper, PV /
 *    mana / chance / dés de récupération, repos, compagnons, montures. C'est la même
 *    liberté que le tracker d'initiative, qui écrit déjà les PV des personnages.
 *  - **mode « Modifier » de l'INVENTAIRE oui** : un `BlockEditButton` sur ce seul bloc, pour
 *    que le MJ distribue butin, objets magiques et variantes sans quitter le combat — c'est
 *    le geste de table le plus fréquent, et naviguer sur la fiche du joueur pour ajouter une
 *    potion coûtait le contexte de l'écran de MJ (assouplissement du design d'origine, qui
 *    verrouillait TOUS les blocs).
 *  - **mode « Modifier » des autres blocs NON** : aucune caractéristique, surcharge ni
 *    capacité modifiable. Corriger une CONSTRUCTION reste l'affaire de la fiche complète.
 * Concrètement : un seul `BlockEditButton`, et les `onChange` d'édition hors inventaire
 * restent omis.
 *
 * Les blocs sont ceux de la fiche, DANS SON ORDRE, montés depuis les mêmes composants et
 * alimentés par les mêmes calculs (`useCharacterGameState` pour l'état de jeu,
 * `buildSheetDisplayView` pour les dérivations d'affichage) : aucune logique dupliquée.
 * Absents volontairement : identité, notes, historique des niveaux, conformité, montée de
 * niveau — accessibles via « Fiche complète ».
 */
import { useMemo, useState } from 'react';
import Link from 'next/link';
import CloseIcon from '@mui/icons-material/Close';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import { alpha, type Theme } from '@mui/material/styles';
import { ancestryById, classById } from '@/data';
import type { StartingEquipmentChoiceOption } from '@/data/schema';
import { isCustomItem, type Character, type EquipmentLine } from '@/lib/character/types';
import type { Campaign } from '@/lib/campaign/types';
import type { Player } from '@/lib/player/types';
import { armorRestrictionByLine } from '@/lib/character/armorRestrictions';
import { companionMountEnSelle, listCompanions } from '@/lib/character/companions';
import { firearmsEffective } from '@/lib/character/firearms';
import { extraMasteredWeaponIds, masteredClassIds } from '@/lib/character/mastery';
import { manualFeatureIds } from '@/lib/character/levelUp';
import { isMountMounted, listOwnedMounts } from '@/lib/character/mounts';
import { rulesContext } from '@/lib/character/rulesContext';
import { parseCoinPouchName } from '@/lib/character/coinPouch';
import { startingChoiceOptionsFor } from '@/lib/character/startingChoices';
import { twoWeaponCombatStatus } from '@/lib/character/twoWeaponCombat';
import { weaponAffinities } from '@/lib/character/weaponAffinity';
import { classColor, profileAccentGradient } from '@/lib/ui/classColors';
import { usePersistedBoolean } from '@/lib/ui/usePersistedBoolean';
import { AppTooltip } from '@/components/AppTooltip';
import { DerivedStatsGrid } from '@/components/DerivedStatsGrid';
import { FirearmsAllowedProvider } from '@/components/ClassIcon';
import { PlayerBadgeTooltip } from '@/components/campaign/PlayerBadgeTooltip';
import { AbilitiesGrid } from '@/components/sheet/AbilitiesGrid';
import { BlockEditButton } from '@/components/sheet/BlockEditButton';
import { CharacterIdentityLine } from '@/components/sheet/CharacterIdentityLine';
import { CoinPouchDialog } from '@/components/sheet/CoinPouchDialog';
import { CompanionsPanel } from '@/components/sheet/CompanionsPanel';
import { EquipmentList } from '@/components/sheet/EquipmentList';
import { weaponLineCriticalRange } from '@/components/sheet/weaponCriticalRange';
import { boundWeaponPathFor } from '@/lib/character/boundWeapon';
import {
  ConcentrationToggle,
  FeaturesByPath,
  FeaturesLayoutToggle,
  VerbatimToggle,
  type FeaturesLayout,
} from '@/components/sheet/FeaturesByPath';
import { ManeuversPanel } from '@/components/sheet/ManeuversPanel';
import { AddMountButton, OwnedMountsPanel } from '@/components/sheet/OwnedMountsPanel';
import { ActiveStatusPanel } from '@/components/sheet/ActiveStatusPanel';
import { PlayerStatusPanel } from '@/components/sheet/PlayerStatusPanel';
import { PurseField } from '@/components/sheet/PurseField';
import { SheetSection } from '@/components/sheet/SheetSection';
import { SourceRef } from '@/components/SourceRef';
import { StartingChoiceDialog } from '@/components/sheet/StartingChoiceDialog';
import { TestDomainsPanel } from '@/components/sheet/TestDomainsPanel';
import { buildSheetDisplayView } from '@/components/sheet/sheetDisplayView';
import { useCharacterGameState } from '@/components/sheet/useCharacterGameState';
import { statusSheetImpact, type AppliedStatus } from '@/lib/character/statusEffects';
import { mergeMods } from '@/lib/character/orphanPoints';
import { useCampaignCombatStore } from '@/stores/campaignCombat';

/**
 * Clés de mémorisation du repli PROPRES au panneau : replier une section ici ne doit pas
 * replier la même section sur la vraie fiche (préférences indépendantes).
 */
const PERSIST_PREFIX = 'gm-sheet:';

/**
 * Liste d'états vide partagée : un sélecteur zustand doit renvoyer une référence STABLE quand il n'y
 * a rien (l'égalité par défaut est `Object.is` — un `[]` neuf à chaque rendu rendrait en boucle).
 */
const EMPTY_STATUSES: AppliedStatus[] = [];

export interface GmSheetDrawerProps {
  /** Personnage consulté, ou `undefined` s'il n'est pas encore chargé (→ squelette). */
  character: Character | undefined;
  /** Campagne courante — sert l'autorisation EFFECTIVE des armes à feu (PER-185). */
  campaign: Campaign | undefined;
  /** Joueur qui incarne le personnage (badge enrichi de l'en-tête), ou `null`. */
  player: Player | null;
  /** Le panneau est-il ouvert ? */
  open: boolean;
  /** Fermeture demandée (croix, Échap, clic dans le voile). */
  onClose: () => void;
}

export function GmSheetDrawer({
  character,
  campaign,
  player,
  open,
  onClose,
}: GmSheetDrawerProps) {
  // États de combat posés sur CE personnage (PER-358) : le tiroir ne les recevait pas, il ne
  // montrait donc ni badge ni buff là où la vraie fiche du joueur les affiche — recetter depuis ici
  // donnait un faux négatif. Ils sont lus dans le store de combat, alimenté en direct par le canal
  // (le MJ en est l'auteur) ; pas de garde « session active » comme sur la fiche du joueur : ce
  // tiroir EST la vue du MJ, qui voit son tracker qu'une session soit ouverte ou non.
  const combatStatuses = useCampaignCombatStore((s) =>
    campaign && character ? s.byCampaign[campaign.id]?.statuses[character.id] : undefined,
  );
  const appliedStatuses = combatStatuses ?? EMPTY_STATUSES;
  // Ids seuls, pour la neutralisation de l'interrupteur de fiche d'un buff posé en séance (PER-314).
  // Mémoïsé : `useCharacterGameState` le prend en entrée de calcul, un tableau neuf à chaque rendu
  // le relancerait pour rien.
  const sessionStatusIds = useMemo(() => appliedStatuses.map((s) => s.id), [appliedStatuses]);
  // Manche courante : les compteurs de tours des états (PER-305) s'en déduisent. 1 par défaut.
  const roundNumber = useCampaignCombatStore((s) =>
    campaign ? (s.byCampaign[campaign.id]?.roundNumber ?? 1) : 1,
  );
  // État de JEU (PER-257) : le panneau consomme le hook de la fiche tel quel. `null` tant
  // que le personnage n'est pas chargé — d'où l'appel inconditionnel, avant tout branchement.
  const game = useCharacterGameState(character, { sessionStatusIds });
  // Modales ouvertes DEPUIS le panneau : « Utiliser » un objet renvoie une intention, c'est
  // l'appelant qui ouvre la bonne modale (même câblage que la fiche).
  // État local des modales de repos (`PlayerStatusPanel` les prend désormais en CONTRÔLÉ, pour que la
  // barre condensée de la vraie fiche puisse aussi les ouvrir — ce panneau MJ n'a pas de barre
  // condensée, donc son propre état suffit).
  const [shortRestOpen, setShortRestOpen] = useState(false);
  const [longRestOpen, setLongRestOpen] = useState(false);
  const [coinPouchIndex, setCoinPouchIndex] = useState<number | null>(null);
  const [choiceIndex, setChoiceIndex] = useState<number | null>(null);
  // Voies en « lignes » sur écran étroit (PER-229) : en colonnes, la grille défile
  // horizontalement, très inconfortable au doigt. Le panneau étant plein écran sous `sm`,
  // on suit la largeur de la fenêtre, comme la fiche.
  const isNarrowViewport = useMediaQuery((theme: Theme) => theme.breakpoints.down('md'));
  const [layoutChoice, setLayoutChoice] = useState<FeaturesLayout | null>(null);
  const layout = layoutChoice ?? (isNarrowViewport ? 'rows' : 'columns');
  const [verbatim, setVerbatim] = useState(false);
  const [concentration, setConcentration] = useState(false);
  // Vues à onglets (PER-296) : mêmes idiomes que la fiche complète, cf. `sheetDisplayView`
  // et son commentaire d'en-tête — état transitoire (non persisté), hoisté ici comme
  // `layoutChoice`/`verbatim`/`concentration` pour survivre à un remontage du contenu
  // (personnage passant d'indéfini à chargé pendant que le panneau reste ouvert).
  const [statsView, setStatsView] = useState<'derived' | 'tests'>('derived');
  const [voiesView, setVoiesView] = useState<'features' | 'maneuvers'>('features');

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      slotProps={{
        paper: {
          sx: {
            // Confort de lecture de la vraie fiche (conteneur `md` ≈ 900 px) sans dépasser
            // l'écran ; plein écran sous `sm`. Une SEULE zone de défilement : celle-ci.
            width: { xs: '100vw', sm: 'min(1040px, 100vw)' },
            maxWidth: '100vw',
            overflowY: 'auto',
            backgroundImage: 'none',
          },
        },
      }}
    >
      {character && game ? (
        <GmSheetDrawerContent
          character={character}
          campaign={campaign}
          player={player}
          game={game}
          appliedStatuses={appliedStatuses}
          roundNumber={roundNumber}
          onClose={onClose}
          layout={layout}
          onLayoutChange={setLayoutChoice}
          verbatim={verbatim}
          onVerbatimChange={setVerbatim}
          concentration={concentration}
          onConcentrationChange={setConcentration}
          statsView={statsView}
          onStatsViewChange={setStatsView}
          voiesView={voiesView}
          onVoiesViewChange={setVoiesView}
          coinPouchIndex={coinPouchIndex}
          onCoinPouchIndexChange={setCoinPouchIndex}
          choiceIndex={choiceIndex}
          onChoiceIndexChange={setChoiceIndex}
          shortRestOpen={shortRestOpen}
          onShortRestOpenChange={setShortRestOpen}
          longRestOpen={longRestOpen}
          onLongRestOpenChange={setLongRestOpen}
        />
      ) : (
        <GmSheetDrawerSkeleton onClose={onClose} />
      )}
    </Drawer>
  );
}

/** Squelette affiché tant que les personnages ne sont pas chargés (lien direct `?sheet=`). */
function GmSheetDrawerSkeleton({ onClose }: { onClose: () => void }) {
  return (
    <Box sx={{ p: { xs: 2, sm: 3 } }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 3 }}>
        <Skeleton animation="wave" variant="rounded" width={96} height={24} />
        <Box sx={{ flexGrow: 1 }} />
        <IconButton size="small" onClick={onClose} aria-label="Fermer le panneau">
          <CloseIcon />
        </IconButton>
      </Stack>
      <Stack spacing={2} aria-hidden>
        <Skeleton animation="wave" variant="text" width="40%" height={48} />
        <Skeleton animation="wave" variant="rounded" height={120} />
        <Skeleton animation="wave" variant="rounded" height={200} />
        <Skeleton animation="wave" variant="rounded" height={160} />
      </Stack>
    </Box>
  );
}

interface GmSheetDrawerContentProps {
  character: Character;
  campaign: Campaign | undefined;
  player: Player | null;
  game: NonNullable<ReturnType<typeof useCharacterGameState>>;
  /** États de combat posés sur ce personnage (PER-358) — vides si le tracker n'en porte aucun. */
  appliedStatuses: AppliedStatus[];
  /** Manche courante du combat, dont se déduisent les tours restants des états (PER-305). */
  roundNumber: number;
  onClose: () => void;
  layout: FeaturesLayout;
  onLayoutChange: (layout: FeaturesLayout) => void;
  verbatim: boolean;
  onVerbatimChange: (value: boolean) => void;
  concentration: boolean;
  onConcentrationChange: (value: boolean) => void;
  statsView: 'derived' | 'tests';
  onStatsViewChange: (view: 'derived' | 'tests') => void;
  voiesView: 'features' | 'maneuvers';
  onVoiesViewChange: (view: 'features' | 'maneuvers') => void;
  coinPouchIndex: number | null;
  onCoinPouchIndexChange: (index: number | null) => void;
  choiceIndex: number | null;
  onChoiceIndexChange: (index: number | null) => void;
  shortRestOpen: boolean;
  onShortRestOpenChange: (open: boolean) => void;
  longRestOpen: boolean;
  onLongRestOpenChange: (open: boolean) => void;
}

/**
 * Corps du panneau, monté seulement quand le personnage est chargé : en-tête collé +
 * les sept blocs de la fiche, dans son ordre. Séparé du `Drawer` pour que les calculs
 * dérivés ne tournent pas à vide (panneau fermé) ni pendant le squelette.
 */
function GmSheetDrawerContent({
  character,
  campaign,
  player,
  game,
  appliedStatuses,
  roundNumber,
  onClose,
  layout,
  onLayoutChange,
  verbatim,
  onVerbatimChange,
  concentration,
  onConcentrationChange,
  statsView,
  onStatsViewChange,
  voiesView,
  onVoiesViewChange,
  coinPouchIndex,
  onCoinPouchIndexChange,
  choiceIndex,
  onChoiceIndexChange,
  shortRestOpen,
  onShortRestOpenChange,
  longRestOpen,
  onLongRestOpenChange,
}: GmSheetDrawerContentProps) {
  const characterClass = classById.get(character.classId);
  const ancestry = ancestryById.get(character.ancestryId);
  // Autorisation EFFECTIVE des armes à feu (règle campagne ∧ choix perso, PER-185) : sans
  // ce fournisseur, les icônes de profil de l'arquebusier seraient fausses (arbalétrier).
  const firearmsAllowed = firearmsEffective(character, campaign);
  // Toggles d'affichage de « Compétences & tests » (`TestDomainsPanel`) : mêmes clés que la
  // fiche complète, donc la préférence est PARTAGÉE entre les deux vues (mêmes onglets).
  const [testsIncludeAbility, setTestsIncludeAbility] = usePersistedBoolean(
    'test-domains:include-ability',
    false,
  );
  const [testsHideZero, setTestsHideZero] = usePersistedBoolean('test-domains:hide-zero', true);

  const {
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
      offHandMeleeSituationalDamage,
      rangedSituationalDamage,
      rangedAttackMagicalSourceId,
      rangedAttackElement,
      rangedReplacingFormAttack,
    },
    masterDerived,
    manaMax,
    luckMax,
    recoveryDiceMax,
    recoveryDie,
    capacityGauges,
    elixirDosesToLose,
  } = game;
  // Part CHIFFRÉE des états posés (PER-358) : mêmes calculs que la fiche du joueur, pour que le
  // tiroir n'affiche pas d'autres chiffres que les siens. `null` sans état.
  const statusImpact = appliedStatuses.length > 0 ? statusSheetImpact(appliedStatuses) : null;
  // Dérivations d'AFFICHAGE (modificateurs de caracs, dés bonus, domaines de test, malus
  // d'armure, sources de l'infobulle « i ») — mêmes calculs que la fiche, module partagé.
  const display = buildSheetDisplayView(
    character,
    game.derived,
    masterDerived ? (character.overrides.maxHp ?? masterDerived.maxHp) : undefined,
    statusImpact ?? undefined,
  );
  // Entrée moteur AJUSTÉE par les états : deltas fondus dans `mods` pour que DEF/Init./attaques
  // reflètent le malus, le détail « i » les attribuant à « État : … ». Les jauges restent sur
  // `masterDerived` NON ajusté — un état de combat ne change pas les maxima.
  const adjustedDerivedInput = derivedInput
    ? statusImpact
      ? { ...derivedInput, mods: mergeMods(derivedInput.mods ?? {}, statusImpact.mods) }
      : derivedInput
    : null;
  // Dé malus aux tests d'attaque, tous états confondus → badge sur les trois cartes d'attaque.
  const attackMalusDie = statusImpact
    ? [...statusImpact.allTestsMalusDie, ...statusImpact.attackTestsMalusDie]
    : [];

  // « Utiliser » un objet : l'action de jeu consomme quand elle peut, et renvoie une
  // INTENTION pour les deux lignes du sac de départ qui exigent une saisie.
  const handleUseItem = (index: number) => {
    const intent = game.applyItemUse(index);
    if (intent.kind === 'starting-choice') onChoiceIndexChange(intent.index);
    else if (intent.kind === 'coin-pouch') onCoinPouchIndexChange(intent.index);
  };
  const confirmCoinPouch = (silver: number) => {
    if (coinPouchIndex === null) return;
    game.openCoinPouch(coinPouchIndex, silver);
    onCoinPouchIndexChange(null);
  };
  const confirmStartingChoice = (option: StartingEquipmentChoiceOption) => {
    if (choiceIndex === null) return;
    game.resolveStartingChoice(choiceIndex, option);
    onChoiceIndexChange(null);
  };

  const companions = listCompanions(character);
  const ownedMounts = listOwnedMounts(character.mounts);

  // Édition de l'inventaire : état LOCAL au corps du panneau, donc remis à zéro à chaque
  // fermeture (le `Drawer` temporaire démonte ses enfants). Rouvrir une fiche repart toujours
  // en consultation — on n'hérite jamais d'un crayon laissé ouvert sur un autre personnage.
  const [editingEquipment, setEditingEquipment] = useState(false);
  const setEquipment = (equipment: EquipmentLine[]) => game.update({ equipment });

  return (
    <FirearmsAllowedProvider value={firearmsAllowed}>
      {/* En-tête collé : reste visible pendant le défilement du panneau. Teinté à la
          couleur du profil, comme l'en-tête de la fiche. */}
      <Box
        sx={(theme) => ({
          position: 'sticky',
          top: 0,
          zIndex: 2,
          px: { xs: 2, sm: 3 },
          py: 1.5,
          bgcolor: alpha(theme.palette.background.paper, 0.94),
          backgroundImage: profileAccentGradient(character.classId, 'to left'),
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.6)}`,
        })}
      >
        <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start' }}>
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <PlayerBadgeTooltip player={player} />
            <Typography
              variant="h6"
              component="h2"
              sx={{
                fontWeight: 'bold',
                overflowWrap: 'anywhere',
                color: characterClass ? classColor(characterClass.id) : undefined,
                mt: 0.5,
              }}
            >
              {character.name || 'Sans nom'}
            </Typography>
            <CharacterIdentityLine
              dense
              ancestryName={ancestry?.name}
              characterClass={characterClass}
              firearmsAllowed={firearmsAllowed}
              priestVocation={character.priestVocation}
              level={character.level}
              sx={{ flexWrap: 'wrap' }}
            />
          </Box>
          {/* Échappatoire vers la fiche COMPLÈTE (identité, notes, historique, édition) :
              vraie ancre, donc Ctrl/⌘+Clic ouvre dans un nouvel onglet. */}
          <Button
            size="small"
            variant="outlined"
            startIcon={<OpenInNewIcon fontSize="small" />}
            component={Link}
            href={`/character/${character.id}`}
            sx={{ flexShrink: 0 }}
          >
            Fiche complète
          </Button>
          <AppTooltip title="Fermer">
            <IconButton size="small" onClick={onClose} aria-label="Fermer le panneau">
              <CloseIcon />
            </IconButton>
          </AppTooltip>
        </Stack>
      </Box>

      <Box sx={{ px: { xs: 2, sm: 3 }, py: 3 }}>
        <Stack spacing={3}>
          {/* REPLI (PER-358), comme sur la fiche : sans stats dérivées, il n'y a pas de section
              « État du personnage » — les états s'afficheraient nulle part. */}
          {!masterDerived && appliedStatuses.length > 0 && (
            <ActiveStatusPanel
              statuses={appliedStatuses}
              roundNumber={roundNumber}
              // Rendre un cristal confié (PER-360) : le seul geste de ce panneau ouvert au MJ, et
              // le même qu'il a sur la bande d'initiative — le cristal repart éteint chez son mage.
              onReleaseCrystal={(crystalId) => game.releaseCrystal(crystalId)}
            />
          )}

          <SheetSection title="Caractéristiques" icon="abilities">
            <AbilitiesGrid
              abilities={character.abilities}
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
          </SheetSection>

          {/* Onglets « Statistiques dérivées » / « Compétences & tests » (PER-296), même idiome
              que la fiche complète (cf. `sheetDisplayView` et son commentaire d'en-tête) : pas de
              crayon d'édition ici, ce bloc n'est pas modifiable depuis le panneau MJ. */}
          <SheetSection
            title="Statistiques dérivées"
            icon="derived"
            tabs={[
              { value: 'derived', label: 'Statistiques dérivées', shortLabel: 'Statistiques', icon: 'derived' },
              { value: 'tests', label: 'Compétences & tests', shortLabel: 'Tests', icon: 'tests' },
            ]}
            activeTab={statsView}
            onTabChange={(v) => onStatsViewChange(v as 'derived' | 'tests')}
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
                defenseBadges={defenseBadges}
                meleeCriticalRanges={meleeCriticalRanges}
                rangedCriticalRanges={rangedCriticalRanges}
                unarmedStrike={unarmed}
                meleeWeaponDamage={meleeWeaponDamage}
                unarmedCriticalRanges={unarmedCriticalRanges}
                rangedWeaponDamage={rangedWeaponDamage}
                meleeSituationalDamage={meleeSituationalDamage}
                offHandMeleeSituationalDamage={offHandMeleeSituationalDamage}
                rangedSituationalDamage={rangedSituationalDamage}
                rangedAttackMagicalSourceId={rangedAttackMagicalSourceId}
                rangedAttackElement={rangedAttackElement}
                rangedReplacingFormAttack={rangedReplacingFormAttack}
                attackBonusDie={display.attackBonusDieSources}
                boundWeaponAttackDie={display.boundWeaponAttackDie}
                attackMalusDie={attackMalusDie}
              />
            ) : (
              <Typography variant="body2" color="text.secondary">
                Profil incomplet : statistiques dérivées indisponibles.
              </Typography>
            )}
          </SheetSection>

          {masterDerived && (
            <SheetSection title="État du personnage" icon="status">
              {/* Mêmes états, même place que sur la fiche du joueur (PER-358) : au-dessus de la
                  barre de vie. Le MJ voit donc ce que son joueur voit — sans la croix de
                  renoncement, qui n'appartient qu'au joueur (il a la sienne, sur la palette). */}
              {appliedStatuses.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <ActiveStatusPanel
              statuses={appliedStatuses}
              roundNumber={roundNumber}
              // Rendre un cristal confié (PER-360) : le seul geste de ce panneau ouvert au MJ, et
              // le même qu'il a sur la bande d'initiative — le cristal repart éteint chez son mage.
              onReleaseCrystal={(crystalId) => game.releaseCrystal(crystalId)}
            />
                </Box>
              )}
              <PlayerStatusPanel
                depletion={character.depletion}
                maxHp={character.overrides.maxHp ?? masterDerived.maxHp}
                onDamage={game.setHpDamage}
                onHeal={game.setHpHeal}
                onResetHp={game.setHpReset}
                manaMax={manaMax}
                onSpendMana={game.setManaSpend}
                onRestoreMana={game.setManaRestore}
                onResetMana={game.setManaReset}
                luckMax={luckMax}
                onSpendLuck={game.setLuckSpend}
                onRestoreLuck={game.setLuckRestore}
                onResetLuck={game.setLuckReset}
                capacityGauges={capacityGauges}
                onSetUsageCounter={game.setUsageCounterValue}
                recoveryDiceMax={recoveryDiceMax}
                recoveryDie={recoveryDie}
                level={character.level}
                onSetRecoveryDiceCurrent={game.setDrCurrent}
                onShortRest={game.doShortRest}
                onLongRest={game.doLongRest}
                recoveryHealBonuses={game.recoveryHealBonuses}
                elixirDosesToLose={elixirDosesToLose}
                shortRestOpen={shortRestOpen}
                onShortRestOpenChange={onShortRestOpenChange}
                longRestOpen={longRestOpen}
                onLongRestOpenChange={onLongRestOpenChange}
              />
            </SheetSection>
          )}

          {masterDerived && (companions.length > 0 || ownedMounts.length > 0) && (
            <SheetSection
              title="Compagnons"
              icon="companions"
              action={<AddMountButton onAdd={game.addMount} />}
            >
              <Stack spacing={1.5}>
                {companions.length > 0 && (
                  <CompanionsPanel
                    companions={companions}
                    abilities={effectCtx.abilities}
                    level={character.level}
                    masterDerived={masterDerived}
                    companionDepletion={character.companionDepletion}
                    onDamage={game.setCompanionDamage}
                    onHeal={game.setCompanionHeal}
                    onReset={game.setCompanionReset}
                    onDelete={game.deleteCompanionInstance}
                    enSelleFor={(entry) => companionMountEnSelle(character, entry)}
                    onSetMounted={(entry, on) => game.setMountedTarget(on ? entry.key : null)}
                  />
                )}
                {ownedMounts.length > 0 && (
                  <OwnedMountsPanel
                    mounts={ownedMounts}
                    // Les montures possédées restent PILOTABLES (PV, barde, en selle) : ce
                    // sont des états de jeu. Seule la construction est verrouillée ici.
                    readOnly={false}
                    abilities={effectCtx.abilities}
                    level={character.level}
                    masterDerived={masterDerived}
                    isMounted={(id) => {
                      const m = character.mounts.find((x) => x.id === id);
                      return m ? isMountMounted(character, m) : false;
                    }}
                    onSetMounted={game.setMountMounted}
                    onRemove={game.removeMount}
                    onSetBarde={game.setMountBarde}
                    onDamage={game.setMountDamage}
                    onHeal={game.setMountHeal}
                    onReset={game.setMountReset}
                  />
                )}
              </Stack>
            </SheetSection>
          )}

          <SheetSection
            title="Voies & capacités"
            icon="paths"
            tabs={[
              { value: 'features', label: 'Voies & capacités', shortLabel: 'Voies', icon: 'paths' },
              { value: 'maneuvers', label: 'Manœuvres', icon: 'maneuvers' },
            ]}
            activeTab={voiesView}
            onTabChange={(v) => onVoiesViewChange(v as 'features' | 'maneuvers')}
            action={
              voiesView === 'maneuvers' ? (
                <SourceRef page="217-218" term="Les manœuvres" />
              ) : (
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                  {display.hasSpells && (
                    <ConcentrationToggle value={concentration} onChange={onConcentrationChange} />
                  )}
                  <VerbatimToggle value={verbatim} onChange={onVerbatimChange} />
                  <FeaturesLayoutToggle value={layout} onChange={onLayoutChange} />
                </Stack>
              )
            }
          >
            {voiesView === 'maneuvers' ? (
              <ManeuversPanel abilities={effectCtx.abilities} level={character.level} />
            ) : (
            <FeaturesByPath
              featureIds={character.featureIds}
              classId={character.classId}
              layout={layout}
              verbatim={verbatim}
              concentration={concentration}
              abilities={effectCtx.abilities}
              level={character.level}
              character={character}
              // Épingle « choisie à la main » sur les capacités hors progression automatique :
              // marqueur d'affichage, indépendant du mode édition — on le conserve.
              manualFeatureIds={manualFeatureIds(character)}
              // Interrupteurs, saisies corrélées, compteurs, cadenas de repos, élixirs,
              // invocations : états de JEU, donc ouverts au MJ depuis le panneau. En
              // revanche pas de `onChange` ni de `onChoiceChange` : les choix figés et la
              // composition des voies relèvent de la construction, pas du jeu.
              onToggleEffect={game.setEffectToggleValue}
              onSetEffectInput={game.setEffectInputValue}
              onSetUsageCounter={game.setUsageCounterValue}
              onLiftShortRestLock={game.liftShortRestLock}
              onCreateElixir={game.createElixir}
              onSummonCompanionInstance={game.summonCompanionInstance}
              onInvokeHawkHunter={game.invokeHawkHunter}
              onPoisonUpdate={game.update}
              // PER-284 : armes bricolées (chargeur / second canon) désignées par le joueur.
              onWeaponModificationUpdate={game.update}
              masterDerived={masterDerived}
              testBonuses={display.testBonuses}
            />
            )}
          </SheetSection>

          <SheetSection
            title="Inventaire"
            icon="inventory"
            collapsible
            defaultCollapsed
            persistKey={`${PERSIST_PREFIX}equipment`}
            action={(collapsed) =>
              collapsed ? null : (
                <BlockEditButton
                  editing={editingEquipment}
                  onToggle={() => setEditingEquipment((v) => !v)}
                  label="inventaire"
                />
              )
            }
          >
            {/* Bourse : montants éditables hors mode « Modifier » (état de jeu) ; les flèches
                de conversion entre unités ne s'affichent qu'en édition du bloc. */}
            <PurseField
              purse={character.purse}
              onChange={game.setPurse}
              editing={editingEquipment}
            />
            <Divider sx={{ my: 1.5 }} />
            <EquipmentList
              equipment={character.equipment}
              characterId={character.id}
              // SEUL `onChange` d'édition ouvert dans le panneau (ajout, variante, quantité,
              // suppression, réordonnancement) : distribuer du butin sans quitter l'écran de MJ.
              onChange={editingEquipment ? setEquipment : undefined}
              onUse={handleUseItem}
              onWear={game.setWorn}
              // Chargement des armes (PER-284) : le MJ voit le compteur de coups prêts et peut
              // tirer/recharger pour le joueur (même statut d'état de jeu que les PV et le porté).
              weaponLoading={game.weaponLoading}
              // PER-286 : dés évolutifs résolus au niveau + carac ajoutée par l'arme (couleuvrine).
              level={character.level}
              abilities={effectCtx.abilities}
              onFireShot={game.fireWeaponShot}
              onLoadShot={game.loadWeaponShot}
              onRefillShots={game.refillWeaponShots}
              canLoadGrapeshot={character.featureIds.includes('explosifs-r1')}
              // Objets à charges (PER-294) : le MJ dépense / rend / fait le plein pour le joueur,
              // même statut d'état de jeu que le chargement des armes ci-dessus.
              onSpendCharge={game.spendItemCharge}
              onRestoreCharge={game.restoreItemCharge}
              onRefillCharges={game.refillItemCharges}
              characterClass={characterClass}
              masteredIds={masteredClassIds(character, rulesContext)}
              firearmsAllowed={firearmsAllowed}
              extraMasteredWeaponIds={extraMasteredWeaponIds(character, firearmsAllowed)}
              resolveWeaponAffinities={(itemId) => weaponAffinities(character, itemId)}
              twoWeaponStatus={twoWeaponCombatStatus(character)}
              resolveArmorRestriction={(line) =>
                armorRestrictionByLine(character, rulesContext).get(line) ?? null
              }
              // Plage de critique de l'arme en main (PER-74), comme sur la fiche du joueur.
              resolveCriticalRange={(line) => weaponLineCriticalRange(character, line)}
              // Puce « Arme liée » (PER-74), comme sur la fiche du joueur.
              resolveBoundWeapon={(line) => boundWeaponPathFor(character, line)}
            />
          </SheetSection>
        </Stack>
      </Box>

      <CoinPouchDialog
        open={coinPouchIndex !== null}
        info={(() => {
          const line = coinPouchIndex !== null ? character.equipment[coinPouchIndex] : undefined;
          return line && isCustomItem(line) ? parseCoinPouchName(line.name) : null;
        })()}
        onClose={() => onCoinPouchIndexChange(null)}
        onConfirm={confirmCoinPouch}
      />

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
              onClose={() => onChoiceIndexChange(null)}
              onConfirm={confirmStartingChoice}
            />
          );
        })()}
    </FirearmsAllowedProvider>
  );
}
