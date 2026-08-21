'use client';

import type { ReactNode } from 'react';
import HotelIcon from '@mui/icons-material/Hotel';
import TimerIcon from '@mui/icons-material/Timer';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';
import { pathById } from '@/data';
import type { Depletion } from '@/lib/character/types';
import type { Die } from '@/data/schema';
import type { ActiveTransformationHp } from '@/lib/character/companions';
import type { CapacityResourceGauge, RestRecoveryHealBonus } from '@/lib/character/effects';
import { currentLuck, currentMana, currentRecoveryDice } from '@/lib/character/gauges';
import { classColor, prestigeCategoryColor } from '@/lib/ui/classColors';
import { prestigeMetalGradient } from '@/lib/ui/prestigeStyle';
import { AppTooltip } from '@/components/AppTooltip';
import { ClassIcon } from '@/components/ClassIcon';
import { DerivedStatIcon } from '@/components/DerivedStatIcon';
import { DieIcon } from '@/components/DieIcon';
import { GaugeRow } from './GaugeRow';
import { storageKeys } from '@/lib/storage/keys';
import { HpGauge, type DamageKind } from './HpGauge';
import { LongRestDialog } from './LongRestDialog';
import { RecoveryDicePips } from './RecoveryDicePips';
import { ShortRestDialog } from './ShortRestDialog';
import { ViolencePointsBar } from './ViolencePointsBar';
import { WeldedBarPinButton, WELDED_BUTTON_HEIGHT as REST_BUTTON_HEIGHT } from './WeldedBarPinButton';

/** Teinte des réserves ACCUMULATEUR (points de violence, PER-325) : orange proche du rouge berserker. */
const ACCUMULATOR_COLOR = '#e2571e';

/** Les deux boutons de repos, seuls épinglables individuellement à la barre condensée. */
export type RestBarItemId = 'shortRest' | 'longRest';

/**
 * Icône de profil dans un cercle blanc (même présentation cerclée que les icônes de
 * stats dérivées), pour identifier une jauge de ressource de capacité par son profil.
 */
function CircledClassIcon({ classId }: { classId: string }) {
  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 28,
        height: 28,
        borderRadius: '50%',
        border: '2px solid #fff',
      }}
    >
      <ClassIcon classId={classId} size={16} color="#fff" />
    </Box>
  );
}

export interface PlayerStatusPanelProps {
  /** Dépletion transitoire courante du personnage. */
  depletion: Depletion;
  /** PV maximum (stat dérivée, lecture seule ici). */
  maxHp: number;
  /** Inflige `amount` dégâts de la nature `kind`. */
  onDamage: (amount: number, kind: DamageKind) => void;
  /** Soigne `amount` PV (létaux d'abord, puis temporaires). */
  onHeal: (amount: number) => void;
  /** Remet les PV à plein. */
  onResetHp: () => void;
  /**
   * Forme active du personnage à PV PROPRES (PER-374, formes élémentaires), ou `null` si aucune.
   * Présent → la barre de PV du personnage se GRISE (RAW : ses PV sont gelés tant que la forme est
   * active) et une SECONDE jauge apparaît pour les PV de la forme, alimentée par
   * `transformationDepletion`/`onTransformationDamage`/`onTransformationHeal`/`onTransformationReset`.
   */
  activeTransformation?: ActiveTransformationHp | null;
  /** Dépletion transitoire des PV de la forme active (`Character.transformationDepletion[key]`). */
  transformationDepletion?: Depletion;
  /** Inflige `amount` dégâts à la forme active. */
  onTransformationDamage?: (amount: number, kind: DamageKind) => void;
  /** Soigne `amount` PV de la forme active. */
  onTransformationHeal?: (amount: number) => void;
  /** Remet les PV de la forme active à plein. */
  onTransformationReset?: () => void;
  /**
   * Réserve de mana maximale (stat dérivée `manaPoints`), ou `null` si le personnage
   * ne connaît aucun sort — dans ce cas la jauge de mana n'est pas affichée (PER-149).
   */
  manaMax: number | null;
  /** Dépense `amount` points de mana. */
  onSpendMana: (amount: number) => void;
  /** Récupère `amount` points de mana. */
  onRestoreMana: (amount: number) => void;
  /** Remet le mana à plein. */
  onResetMana: () => void;
  /** Réserve de points de chance maximale (stat dérivée `luckPoints`), affichée pour tous (PER-155). */
  luckMax: number;
  /** Dépense `amount` points de chance. */
  onSpendLuck: (amount: number) => void;
  /** Récupère `amount` points de chance. */
  onRestoreLuck: (amount: number) => void;
  /** Remet les points de chance à plein. */
  onResetLuck: () => void;
  /**
   * Ressources de capacité à réserve limitée (rage, sept vies…), lues depuis les mêmes
   * `usageCounters` que `FeaturesByPath` (PER-150). Vide → aucune jauge de ce type.
   */
  capacityGauges: CapacityResourceGauge[];
  /** Fixe le décompte RESTANT d'une ressource de capacité (clé, valeur, max). */
  onSetUsageCounter: (key: string, value: number, max: number) => void;
  /** Réserve de dés de récupération (stat dérivée `recoveryDiceCount`) ; 0 → pas de matrice DR (PER-151). */
  recoveryDiceMax: number;
  /** Type du dé de récupération du profil (ex. `d8`), affiché à droite de la matrice. */
  recoveryDie: Die;
  /** Niveau du personnage (pour le ½ niveau ajouté au soin d'un DR). */
  level: number;
  /** Fixe le nombre de DR DISPONIBLES (matrice de blocs). */
  onSetRecoveryDiceCurrent: (value: number) => void;
  /**
   * Repos court (récupération rapide). `recoveryDieRoll` = résultat du dé saisi pour
   * dépenser un DR (soin), ou `null` pour un repos sans soin. `extraHeal` = soin bonus par DR
   * (Survie « en milieu naturel »), déjà sommé ; 0 par défaut.
   */
  onShortRest: (recoveryDieRoll: number | null, extraHeal?: number) => void;
  /**
   * Repos long (récupération complète). `heal = true` → dépenser le DR gagné pour un soin
   * à la valeur max du dé (p. 222). `extraHeal` = soin bonus par DR, déjà sommé ; 0 par défaut.
   */
  onLongRest: (heal: boolean, extraHeal?: number) => void;
  /**
   * Bonus de soin par DR ACTIFS à proposer dans les modales de repos (Survie native/empruntée).
   * Vide/absent → repos standard sans saisie supplémentaire.
   */
  recoveryHealBonuses?: RestRecoveryHealBonus[];
  /** Doses d'élixir (forgesort) qui seront perdues par un repos long (avertissement, p. 98). */
  elixirDosesToLose?: number;
  /**
   * Emplacement libre sur la rangée des repos, à droite des deux boutons (PER-313) : la fiche y
   * pose « Proposer une pause » quand le personnage est joué en session. Laissé en `ReactNode`
   * plutôt qu'en propriétés dédiées — ce bloc n'a pas à connaître le canal de session.
   */
  restSlot?: ReactNode;
  /**
   * Ouverture des modales de repos, CONTRÔLÉE par la fiche (au lieu d'un état interne) : la barre
   * condensée (`StickySheetStatusBar`) porte désormais ses propres boutons de repos (icônes carrées)
   * qui doivent ouvrir CES MÊMES modales — deux points d'entrée, un seul état, possédé par la fiche.
   */
  shortRestOpen: boolean;
  onShortRestOpenChange: (open: boolean) => void;
  longRestOpen: boolean;
  onLongRestOpenChange: (open: boolean) => void;
  /**
   * PIN individuel (retour propriétaire) des boutons de repos vers la barre condensée — n'apparaît
   * QUE si la section « État du personnage » y est elle-même épinglée (`barSectionPinned`). Absent
   * (récap du wizard, écran de MJ) → aucun pin affiché, comportement inchangé.
   */
  onToggleBarPin?: (id: RestBarItemId) => void;
  /** Ensemble courant des boutons de repos épinglés à la barre condensée — colore l'icône du pin. */
  barPinnedIds?: ReadonlySet<RestBarItemId>;
  barSectionPinned?: boolean;
}

/**
 * Bloc « État du personnage » — barre de vie (PER-148).
 *
 * Affiche les PV COURANTS sur leur maximum, une barre bicolore (PV actuels + dégâts
 * temporaires + dégâts létaux) et l'éventuel état préjudiciable (affaibli / à terre /
 * assommé). Les contrôles infligent des dégâts (létaux ou temporaires), soignent,
 * ajustent au ±1 et remettent à plein. Tout est un ÉTAT DE JEU transitoire : actif
 * hors du mode « Modifier », comme les interrupteurs d'effets et compteurs d'usages.
 * Le maximum reste piloté ailleurs (« Statistiques dérivées ») : ce bloc ne touche
 * que le courant.
 */
export function PlayerStatusPanel({
  depletion,
  maxHp,
  onDamage,
  onHeal,
  onResetHp,
  activeTransformation = null,
  transformationDepletion = {},
  onTransformationDamage,
  onTransformationHeal,
  onTransformationReset,
  manaMax,
  onSpendMana,
  onRestoreMana,
  onResetMana,
  luckMax,
  onSpendLuck,
  onRestoreLuck,
  onResetLuck,
  capacityGauges,
  onSetUsageCounter,
  recoveryDiceMax,
  recoveryDie,
  level,
  onSetRecoveryDiceCurrent,
  onShortRest,
  onLongRest,
  recoveryHealBonuses = [],
  elixirDosesToLose = 0,
  restSlot,
  shortRestOpen,
  onShortRestOpenChange,
  longRestOpen,
  onLongRestOpenChange,
  onToggleBarPin,
  barPinnedIds,
  barSectionPinned = false,
}: PlayerStatusPanelProps) {
  const theme = useTheme();
  // Couleurs CONCRÈTES (résolues) pour les caps assombris : mana en bleu.
  const manaColor = theme.palette.info.main;
  // Chance en violet (secondary) : distinct du vert PV, du bleu mana et de l'ambre des capacités.
  const luckColor = theme.palette.secondary.main;

  const lethal = Math.max(0, depletion.hp?.lethal ?? 0);
  // PER-374 — teinte de la jauge de PV d'une forme active = celle de sa voie de prestige porteuse
  // (patron `prestigeCategoryColor`/`CLASS_COLORS`, cf. `FeaturesByPath`), pas le vert générique.
  const transformationPath = activeTransformation ? pathById.get(activeTransformation.pathId) : undefined;
  const transformationColor = prestigeCategoryColor(
    transformationPath?.type === 'prestige' ? transformationPath.category : undefined,
  );

  return (
    <Stack spacing={1.25} data-glossary-shot="PlayerStatusPanel">
      {/* Jauge de PV DÉDIÉE à la forme active (PER-374, formes élémentaires), EN PREMIER (retour
          propriétaire) : PV propres, distincts de ceux du personnage (barre normale, gelée juste en
          dessous). Titre = nom de la capacité ; remplissage en DÉGRADÉ « métal précieux » de la
          voie de prestige porteuse (`prestigeMetalGradient`, patron des cartes de rang), SANS cadre
          (retour propriétaire — le liseré `prestigeStaticBorderSx` alourdissait la jauge).
          N'apparaît que si la forme active déclare des PV chiffrés. */}
      {activeTransformation && onTransformationDamage && onTransformationHeal && onTransformationReset && (
        <Box>
          <Typography
            variant="caption"
            sx={{ display: 'block', mb: 0.5, ml: 0.5, fontWeight: 700, color: transformationColor }}
          >
            {activeTransformation.featureName}
          </Typography>
          <HpGauge
            depletion={transformationDepletion}
            maxHp={activeTransformation.maxHp}
            onDamage={onTransformationDamage}
            onHeal={onTransformationHeal}
            onReset={onTransformationReset}
            persistKey={storageKeys.gauge.transformation(activeTransformation.featureId)}
            iconLabel={`Points de vie — ${activeTransformation.creatureName}`}
            color={transformationColor}
            gradient={prestigeMetalGradient(transformationColor, '270deg')}
          />
        </Box>
      )}

      {/* Barre de vie interactive (PV actuels / temp / létaux + état préjudiciable),
          composant partagé avec les compagnons (PER-233). GRISÉE tant qu'une forme à PV propres
          est active (PER-374, formes élémentaires) : ses PV sont GELÉS (RAW : « il reprend sa
          forme initiale avec les PV qu'il avait au moment de la transformation »), c'est la jauge
          de la forme ci-dessus qui reçoit les dégâts. */}
      <HpGauge
        depletion={depletion}
        maxHp={maxHp}
        onDamage={onDamage}
        onHeal={onHeal}
        onReset={onResetHp}
        persistKey={storageKeys.gauge.hp}
        disabled={activeTransformation !== null}
        disabledReason={activeTransformation ? `PV gelés — ${activeTransformation.featureName} active.` : undefined}
      />

      {/* Jauge de mana — seulement pour un lanceur de sorts (manaMax non nul), PER-149. */}
      {manaMax !== null && (
        <GaugeRow
          label="Points de mana"
          icon={<DerivedStatIcon statId="manaPoints" size={28} color="#fff" />}
          fillColor="info.main"
          capColor={manaColor}
          persistKey={storageKeys.gauge.mana}
          current={currentMana(manaMax, depletion)}
          max={manaMax}
          spendLabel="Dépenser"
          restoreLabel="Récupérer"
          onSpend={onSpendMana}
          onRestore={onRestoreMana}
          onReset={onResetMana}
        />
      )}

      {/* Ressources de capacité (rage, charges explosives…) — même source que FeaturesByPath, PER-150.
          Couleur du profil porteur (barbare rouge, arquebusier orange…) + icône du profil cerclée ;
          repli sur l'ambre + libellé dans la barre si le profil n'est pas identifiable. */}
      {capacityGauges.map((g) => {
        // Réserve ACCUMULATEUR (points de violence du demi-ogre, PER-325) : barre segmentée dédiée
        // (démarre vide, +1/−1, sans plafond), toujours visible pour pouvoir ajouter des points.
        if (g.accumulator) {
          return (
            <ViolencePointsBar
              key={g.key}
              label={g.label}
              value={g.current}
              color={ACCUMULATOR_COLOR}
              onChange={(n) => onSetUsageCounter(g.key, Math.max(0, n), Math.max(0, n))}
            />
          );
        }
        const color = g.classId ? classColor(g.classId) : theme.palette.warning.main;
        return (
          <GaugeRow
            key={g.key}
            label={g.label}
            barLabel={g.classId ? undefined : g.label}
            icon={g.classId ? <CircledClassIcon classId={g.classId} /> : undefined}
            fillColor={color}
            capColor={color}
            persistKey={storageKeys.gauge.usage(g.key)}
            current={g.current}
            max={g.max}
            spendLabel="Consommer"
            restoreLabel="Restaurer"
            onSpend={(n) => onSetUsageCounter(g.key, g.current - n, g.max)}
            onRestore={(n) => onSetUsageCounter(g.key, g.current + n, g.max)}
            onReset={() => onSetUsageCounter(g.key, g.max, g.max)}
          />
        );
      })}

      {/* Séparateur : la chance n'est pas une jauge de vitalité/énergie (PV, mana, ressources de
          capacité) mais une méta-ressource de méta-jeu — on l'isole visuellement du groupe ci-dessus. */}
      <Divider sx={{ my: 0.25 }} />

      {/* Jauge de points de chance (PER-155) — universelle (tous les personnages). Violet (secondary),
          icône trèfle de la stat dérivée `luckPoints`. Réserve dépensée manuellement (relance de dé…). */}
      <GaugeRow
        label="Points de chance"
        icon={<DerivedStatIcon statId="luckPoints" size={28} color="#fff" />}
        fillColor="secondary.main"
        capColor={luckColor}
        persistKey={storageKeys.gauge.luck}
        current={currentLuck(luckMax, depletion)}
        max={luckMax}
        spendLabel="Dépenser"
        restoreLabel="Récupérer"
        onSpend={onSpendLuck}
        onRestore={onRestoreLuck}
        onReset={onResetLuck}
      />

      {/* Repos (PER-151) : récupération selon les règles CO2 ; matrice des DR à droite. Le pin (retour
          propriétaire) n'apparaît que si la section elle-même est épinglée à la barre condensée —
          soudé au bouton (coins carrés à la jonction), même recette que `ClearStatusButton`. */}
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', rowGap: 1, pt: 0.5 }}>
        <Box sx={{ display: 'flex' }}>
          <AppTooltip
            title="Récupération rapide (30 min) : régénère les dégâts temporaires, réinitialise les capacités « par combat », et permet de consommer un dé de récupération pour se soigner de [dé + ½ niveau] PV."
            page={221}
          >
            <Button
              size="small"
              variant="outlined"
              startIcon={<TimerIcon />}
              onClick={() => onShortRestOpenChange(true)}
              sx={
                barSectionPinned && onToggleBarPin
                  ? { height: REST_BUTTON_HEIGHT, borderTopRightRadius: 0, borderBottomRightRadius: 0 }
                  : { height: REST_BUTTON_HEIGHT }
              }
            >
              Repos court
            </Button>
          </AppTooltip>
          {barSectionPinned && onToggleBarPin && (
            <WeldedBarPinButton
              pinned={barPinnedIds?.has('shortRest') ?? false}
              onToggle={() => onToggleBarPin('shortRest')}
              label="Repos court"
            />
          )}
        </Box>
        <Box sx={{ display: 'flex' }}>
          <AppTooltip
            title="Récupération complète (8 h, 1/jour) : mana plein, +1 dé de récupération, dégâts temporaires régénérés, capacités quotidiennes réinitialisées."
            page="221-222, 229"
          >
            <Button
              size="small"
              variant="outlined"
              startIcon={<HotelIcon />}
              onClick={() => onLongRestOpenChange(true)}
              sx={
                barSectionPinned && onToggleBarPin
                  ? { height: REST_BUTTON_HEIGHT, borderTopRightRadius: 0, borderBottomRightRadius: 0 }
                  : { height: REST_BUTTON_HEIGHT }
              }
            >
              Repos long
            </Button>
          </AppTooltip>
          {barSectionPinned && onToggleBarPin && (
            <WeldedBarPinButton
              pinned={barPinnedIds?.has('longRest') ?? false}
              onToggle={() => onToggleBarPin('longRest')}
              label="Repos long"
            />
          )}
        </Box>
        {/* Repos de GROUPE (PER-313) : demander une pause à toute la table. Rendu par la fiche,
            qui seule connaît la session — le bloc reste ignorant du canal. */}
        {restSlot}
        {recoveryDiceMax > 0 && (
          <>
            <Box sx={{ flexGrow: 1 }} />
            <RecoveryDicePips
              max={recoveryDiceMax}
              current={currentRecoveryDice(recoveryDiceMax, depletion)}
              die={recoveryDie}
              onSet={onSetRecoveryDiceCurrent}
            />
            {/* Bonus de soin par DR ACTIF (Survie « en milieu naturel », native ou empruntée, PER-324) :
                affiché « + <dé> » juste à droite du dé de récupération pour signaler visuellement que
                chaque DR dépensé au repos soigne en plus. Chaque bonus a sa puce ; vide = rien.
                Les bonus SANS dépense de DR (`requiresRecoveryDieSpend: false`, PER-378) ne sont pas
                repris ici — la puce parle explicitement de DR ; ils restent visibles dans la modale de
                repos court elle-même. */}
            {recoveryHealBonuses
              .filter((b) => b.requiresRecoveryDieSpend)
              .map((b) => (
              <AppTooltip
                key={b.featureId}
                title={`${b.name}${b.conditionLabel ? ` (${b.conditionLabel})` : ''} : +${b.count > 1 ? b.count : ''}${b.die}${b.evolving ? '°' : ''} PV par dé de récupération dépensé au repos`}
                page={b.sourcePage}
              >
                <Box
                  component="span"
                  sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.25, color: 'success.main', fontWeight: 700 }}
                >
                  +{b.count > 1 ? b.count : ''}
                  <DieIcon die={b.die} size={20} />
                  {b.evolving ? '°' : ''}
                </Box>
              </AppTooltip>
            ))}
          </>
        )}
      </Stack>

      <ShortRestDialog
        open={shortRestOpen}
        onClose={() => onShortRestOpenChange(false)}
        recoveryDiceCurrent={currentRecoveryDice(recoveryDiceMax, depletion)}
        recoveryDie={recoveryDie}
        level={level}
        healBonuses={recoveryHealBonuses}
        onConfirm={(recoveryDieRoll, extraHeal) => {
          onShortRest(recoveryDieRoll, extraHeal);
          onShortRestOpenChange(false);
        }}
      />

      <LongRestDialog
        open={longRestOpen}
        onClose={() => onLongRestOpenChange(false)}
        recoveryDie={recoveryDie}
        recoveryDiceMax={recoveryDiceMax}
        level={level}
        lethalDamage={lethal}
        elixirDosesToLose={elixirDosesToLose}
        healBonuses={recoveryHealBonuses}
        onConfirm={(heal, extraHeal) => {
          onLongRest(heal, extraHeal);
          onLongRestOpenChange(false);
        }}
      />
    </Stack>
  );
}
