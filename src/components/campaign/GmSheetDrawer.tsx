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
 * Périmètre d'écriture (verrouillé au design) :
 *  - **états de jeu OUI** : interrupteurs, compteurs, élixirs, équiper/déséquiper, PV /
 *    mana / chance / dés de récupération, repos, compagnons, montures. C'est la même
 *    liberté que le tracker d'initiative, qui écrit déjà les PV des personnages.
 *  - **mode « Modifier » NON** : aucun crayon, aucune caractéristique, surcharge, capacité
 *    ni objet modifiable. Pour corriger une construction, le MJ ouvre la fiche complète.
 * Concrètement : aucun `BlockEditButton`, et tous les `onChange` d'édition sont omis.
 *
 * Les blocs sont ceux de la fiche, DANS SON ORDRE, montés depuis les mêmes composants et
 * alimentés par les mêmes calculs (`useCharacterGameState` pour l'état de jeu,
 * `buildSheetDisplayView` pour les dérivations d'affichage) : aucune logique dupliquée.
 * Absents volontairement : identité, notes, historique des niveaux, conformité, montée de
 * niveau — accessibles via « Fiche complète ».
 */
import { useState } from 'react';
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
import { isCustomItem, type Character } from '@/lib/character/types';
import type { Campaign } from '@/lib/campaign/types';
import { armorRestrictionByLine } from '@/lib/character/armorRestrictions';
import { companionMountEnSelle, listCompanions } from '@/lib/character/companions';
import { firearmsEffective } from '@/lib/character/firearms';
import { extraMasteredWeaponIds, masteredClassIds } from '@/lib/character/mastery';
import { manualFeatureIds } from '@/lib/character/levelUp';
import { isMountMounted, listOwnedMounts } from '@/lib/character/mounts';
import { rulesContext } from '@/lib/character/rulesContext';
import { startingChoiceOptionsFor } from '@/lib/character/startingChoices';
import { twoWeaponCombatStatus } from '@/lib/character/twoWeaponCombat';
import { weaponAffinities } from '@/lib/character/weaponAffinity';
import { classColor, profileAccentGradient } from '@/lib/ui/classColors';
import { AppTooltip } from '@/components/AppTooltip';
import { DerivedStatsGrid } from '@/components/DerivedStatsGrid';
import { FirearmsAllowedProvider } from '@/components/ClassIcon';
import { PlayerBadge } from '@/components/home/PlayerBadge';
import { AbilitiesGrid } from '@/components/sheet/AbilitiesGrid';
import { CharacterIdentityLine } from '@/components/sheet/CharacterIdentityLine';
import { CoinPouchDialog } from '@/components/sheet/CoinPouchDialog';
import { CompanionsPanel } from '@/components/sheet/CompanionsPanel';
import { EquipmentList } from '@/components/sheet/EquipmentList';
import {
  ConcentrationToggle,
  FeaturesByPath,
  FeaturesLayoutToggle,
  VerbatimToggle,
  type FeaturesLayout,
} from '@/components/sheet/FeaturesByPath';
import { AddMountButton, OwnedMountsPanel } from '@/components/sheet/OwnedMountsPanel';
import { PlayerStatusPanel } from '@/components/sheet/PlayerStatusPanel';
import { PurseField } from '@/components/sheet/PurseField';
import { SheetSection } from '@/components/sheet/SheetSection';
import { StartingChoiceDialog } from '@/components/sheet/StartingChoiceDialog';
import { TestDomainsPanel } from '@/components/sheet/TestDomainsPanel';
import { buildSheetDisplayView } from '@/components/sheet/sheetDisplayView';
import { useCharacterGameState } from '@/components/sheet/useCharacterGameState';

/**
 * Clés de mémorisation du repli PROPRES au panneau : replier une section ici ne doit pas
 * replier la même section sur la vraie fiche (préférences indépendantes).
 */
const PERSIST_PREFIX = 'gm-sheet:';

export interface GmSheetDrawerProps {
  /** Personnage consulté, ou `undefined` s'il n'est pas encore chargé (→ squelette). */
  character: Character | undefined;
  /** Campagne courante — sert l'autorisation EFFECTIVE des armes à feu (PER-185). */
  campaign: Campaign | undefined;
  /** Nom du joueur qui incarne le personnage (badge de l'en-tête), ou `null`. */
  playerName: string | null;
  /** Le panneau est-il ouvert ? */
  open: boolean;
  /** Fermeture demandée (croix, Échap, clic dans le voile). */
  onClose: () => void;
}

export function GmSheetDrawer({
  character,
  campaign,
  playerName,
  open,
  onClose,
}: GmSheetDrawerProps) {
  // État de JEU (PER-257) : le panneau consomme le hook de la fiche tel quel. `null` tant
  // que le personnage n'est pas chargé — d'où l'appel inconditionnel, avant tout branchement.
  const game = useCharacterGameState(character);
  // Modales ouvertes DEPUIS le panneau : « Utiliser » un objet renvoie une intention, c'est
  // l'appelant qui ouvre la bonne modale (même câblage que la fiche).
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
          playerName={playerName}
          game={game}
          onClose={onClose}
          layout={layout}
          onLayoutChange={setLayoutChoice}
          verbatim={verbatim}
          onVerbatimChange={setVerbatim}
          concentration={concentration}
          onConcentrationChange={setConcentration}
          coinPouchIndex={coinPouchIndex}
          onCoinPouchIndexChange={setCoinPouchIndex}
          choiceIndex={choiceIndex}
          onChoiceIndexChange={setChoiceIndex}
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
  playerName: string | null;
  game: NonNullable<ReturnType<typeof useCharacterGameState>>;
  onClose: () => void;
  layout: FeaturesLayout;
  onLayoutChange: (layout: FeaturesLayout) => void;
  verbatim: boolean;
  onVerbatimChange: (value: boolean) => void;
  concentration: boolean;
  onConcentrationChange: (value: boolean) => void;
  coinPouchIndex: number | null;
  onCoinPouchIndexChange: (index: number | null) => void;
  choiceIndex: number | null;
  onChoiceIndexChange: (index: number | null) => void;
}

/**
 * Corps du panneau, monté seulement quand le personnage est chargé : en-tête collé +
 * les sept blocs de la fiche, dans son ordre. Séparé du `Drawer` pour que les calculs
 * dérivés ne tournent pas à vide (panneau fermé) ni pendant le squelette.
 */
function GmSheetDrawerContent({
  character,
  campaign,
  playerName,
  game,
  onClose,
  layout,
  onLayoutChange,
  verbatim,
  onVerbatimChange,
  concentration,
  onConcentrationChange,
  coinPouchIndex,
  onCoinPouchIndexChange,
  choiceIndex,
  onChoiceIndexChange,
}: GmSheetDrawerContentProps) {
  const characterClass = classById.get(character.classId);
  const ancestry = ancestryById.get(character.ancestryId);
  // Autorisation EFFECTIVE des armes à feu (règle campagne ∧ choix perso, PER-185) : sans
  // ce fournisseur, les icônes de profil de l'arquebusier seraient fausses (arbalétrier).
  const firearmsAllowed = firearmsEffective(character, campaign);

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
  // Dérivations d'AFFICHAGE (modificateurs de caracs, dés bonus, domaines de test, malus
  // d'armure, sources de l'infobulle « i ») — mêmes calculs que la fiche, module partagé.
  const display = buildSheetDisplayView(
    character,
    game.derived,
    masterDerived ? (character.overrides.maxHp ?? masterDerived.maxHp) : undefined,
  );

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
            <PlayerBadge name={playerName} />
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
              bonusDieSources={display.bonusDieSourcesDetailed}
            />
          </SheetSection>

          <SheetSection title="Statistiques dérivées" icon="derived">
            {derivedInput ? (
              <DerivedStatsGrid
                input={derivedInput}
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
                rangedSituationalDamage={rangedSituationalDamage}
                rangedAttackMagicalSourceId={rangedAttackMagicalSourceId}
                rangedAttackElement={rangedAttackElement}
                rangedReplacingFormAttack={rangedReplacingFormAttack}
              />
            ) : (
              <Typography variant="body2" color="text.secondary">
                Profil incomplet : statistiques dérivées indisponibles.
              </Typography>
            )}
          </SheetSection>

          <TestDomainsPanel
            persistKey={`${PERSIST_PREFIX}test-domains`}
            bonuses={display.testBonuses}
            abilities={effectCtx.abilities}
            abilityTestBonus={display.abilityTestBonus}
            perAbilityTestBonus={display.perAbilityTestBonus}
            magicTestBonuses={display.magicTestBonuses}
            bonusDice={display.bonusDieSources}
            universalBonus={display.universalBonus}
            testDice={display.testDice}
            armorPenalty={display.armorPenalty}
            armorMaxAgi={display.armorMaxAgi}
          />

          {masterDerived && (
            <SheetSection title="État du personnage" icon="status">
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
                elixirDosesToLose={elixirDosesToLose}
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
            action={
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                {display.hasSpells && (
                  <ConcentrationToggle value={concentration} onChange={onConcentrationChange} />
                )}
                <VerbatimToggle value={verbatim} onChange={onVerbatimChange} />
                <FeaturesLayoutToggle value={layout} onChange={onLayoutChange} />
              </Stack>
            }
          >
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
              masterDerived={masterDerived}
              testBonuses={display.testBonuses}
            />
          </SheetSection>

          <SheetSection
            title="Inventaire"
            icon="inventory"
            collapsible
            defaultCollapsed
            persistKey={`${PERSIST_PREFIX}equipment`}
          >
            {/* Bourse : montants éditables hors mode « Modifier » (état de jeu) ; les flèches
                de conversion entre unités ne s'affichent qu'en édition, absente ici. */}
            <PurseField purse={character.purse} onChange={game.setPurse} editing={false} />
            <Divider sx={{ my: 1.5 }} />
            <EquipmentList
              equipment={character.equipment}
              onUse={handleUseItem}
              onWear={game.setWorn}
              characterClass={characterClass}
              masteredIds={masteredClassIds(character, rulesContext)}
              firearmsAllowed={firearmsAllowed}
              extraMasteredWeaponIds={extraMasteredWeaponIds(character)}
              resolveWeaponAffinities={(itemId) => weaponAffinities(character, itemId)}
              twoWeaponStatus={twoWeaponCombatStatus(character)}
              resolveArmorRestriction={(line) =>
                armorRestrictionByLine(character, rulesContext).get(line) ?? null
              }
            />
          </SheetSection>
        </Stack>
      </Box>

      <CoinPouchDialog
        open={coinPouchIndex !== null}
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
