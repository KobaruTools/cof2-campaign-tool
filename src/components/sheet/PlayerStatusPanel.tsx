'use client';

import { useState, type ReactNode } from 'react';
import HotelIcon from '@mui/icons-material/Hotel';
import TimerIcon from '@mui/icons-material/Timer';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import { useTheme } from '@mui/material/styles';
import type { Depletion } from '@/lib/character/types';
import type { Die } from '@/data/schema';
import type { CapacityResourceGauge, RestRecoveryHealBonus } from '@/lib/character/effects';
import { currentLuck, currentMana, currentRecoveryDice } from '@/lib/character/gauges';
import { classColor } from '@/lib/ui/classColors';
import { AppTooltip } from '@/components/AppTooltip';
import { ClassIcon } from '@/components/ClassIcon';
import { DerivedStatIcon } from '@/components/DerivedStatIcon';
import { DieIcon } from '@/components/DieIcon';
import { GaugeRow } from './GaugeRow';
import { HpGauge, type DamageKind } from './HpGauge';
import { LongRestDialog } from './LongRestDialog';
import { RecoveryDicePips } from './RecoveryDicePips';
import { ShortRestDialog } from './ShortRestDialog';

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
}: PlayerStatusPanelProps) {
  const theme = useTheme();
  const [shortRestOpen, setShortRestOpen] = useState(false);
  const [longRestOpen, setLongRestOpen] = useState(false);
  // Couleurs CONCRÈTES (résolues) pour les caps assombris : mana en bleu.
  const manaColor = theme.palette.info.main;
  // Chance en violet (secondary) : distinct du vert PV, du bleu mana et de l'ambre des capacités.
  const luckColor = theme.palette.secondary.main;

  const lethal = Math.max(0, depletion.hp?.lethal ?? 0);

  return (
    <Stack spacing={1.25}>
      {/* Barre de vie interactive (PV actuels / temp / létaux + état préjudiciable),
          composant partagé avec les compagnons (PER-233). */}
      <HpGauge
        depletion={depletion}
        maxHp={maxHp}
        onDamage={onDamage}
        onHeal={onHeal}
        onReset={onResetHp}
        persistKey="hp"
      />

      {/* Jauge de mana — seulement pour un lanceur de sorts (manaMax non nul), PER-149. */}
      {manaMax !== null && (
        <GaugeRow
          label="Points de mana"
          icon={<DerivedStatIcon statId="manaPoints" size={28} color="#fff" />}
          fillColor="info.main"
          capColor={manaColor}
          persistKey="gauge-expanded:mana"
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
        const color = g.classId ? classColor(g.classId) : theme.palette.warning.main;
        return (
          <GaugeRow
            key={g.key}
            label={g.label}
            barLabel={g.classId ? undefined : g.label}
            icon={g.classId ? <CircledClassIcon classId={g.classId} /> : undefined}
            fillColor={color}
            capColor={color}
            persistKey={`gauge-expanded:usage:${g.key}`}
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
        persistKey="gauge-expanded:luck"
        current={currentLuck(luckMax, depletion)}
        max={luckMax}
        spendLabel="Dépenser"
        restoreLabel="Récupérer"
        onSpend={onSpendLuck}
        onRestore={onRestoreLuck}
        onReset={onResetLuck}
      />

      {/* Repos (PER-151) : récupération selon les règles CO2 ; matrice des DR à droite. */}
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', rowGap: 1, pt: 0.5 }}>
        <AppTooltip
          title="Récupération rapide (30 min) : régénère les dégâts temporaires, réinitialise les capacités « par combat », et permet de consommer un dé de récupération pour se soigner de [dé + ½ niveau] PV."
          page={221}
        >
          <Button size="small" variant="outlined" startIcon={<TimerIcon />} onClick={() => setShortRestOpen(true)}>
            Repos court
          </Button>
        </AppTooltip>
        <AppTooltip
          title="Récupération complète (8 h, 1/jour) : mana plein, +1 dé de récupération, dégâts temporaires régénérés, capacités quotidiennes réinitialisées."
          page="221-222, 229"
        >
          <Button size="small" variant="outlined" startIcon={<HotelIcon />} onClick={() => setLongRestOpen(true)}>
            Repos long
          </Button>
        </AppTooltip>
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
                chaque DR dépensé au repos soigne en plus. Chaque bonus a sa puce ; vide = rien. */}
            {recoveryHealBonuses.map((b) => (
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
        onClose={() => setShortRestOpen(false)}
        recoveryDiceCurrent={currentRecoveryDice(recoveryDiceMax, depletion)}
        recoveryDie={recoveryDie}
        level={level}
        healBonuses={recoveryHealBonuses}
        onConfirm={(recoveryDieRoll, extraHeal) => {
          onShortRest(recoveryDieRoll, extraHeal);
          setShortRestOpen(false);
        }}
      />

      <LongRestDialog
        open={longRestOpen}
        onClose={() => setLongRestOpen(false)}
        recoveryDie={recoveryDie}
        recoveryDiceMax={recoveryDiceMax}
        level={level}
        lethalDamage={lethal}
        elixirDosesToLose={elixirDosesToLose}
        healBonuses={recoveryHealBonuses}
        onConfirm={(heal, extraHeal) => {
          onLongRest(heal, extraHeal);
          setLongRestOpen(false);
        }}
      />
    </Stack>
  );
}
