'use client';

/**
 * Interrupteurs manuels des effets conditionnels / temporaires d'une capacité
 * (PER-67), s'appuyant sur le modèle/persistance `Feature.effects` ↔
 * `Character.effectToggles`. Pendant de `FeatureChoiceField`.
 *
 * Ce sont des ÉTATS DE JEU transitoires (« je suis en rage », « une arme dans
 * chaque main ») : on peut les basculer à tout moment, y compris hors mode
 * édition. Le moteur ne compte l'effet que lorsqu'il est actif. C'est, dans la
 * lignée des surcharges (`overrides`, PER-48), une déviation manuelle réversible.
 *
 * Deux rendus :
 *  - normal (`compact` faux) : un interrupteur étiqueté « −2 DEF — pendant la
 *    rage berserk » (valeur résolue + déclencheur) ;
 *  - compact (vue colonne) : l'interrupteur seul, le libellé complet en infobulle.
 */
import Button from '@mui/material/Button';
import Casino from '@mui/icons-material/Casino';
import FormControlLabel from '@mui/material/FormControlLabel';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import Typography from '@mui/material/Typography';
import { AppTooltip } from '@/components/AppTooltip';
import type { ConditionalStatBonusEffect } from '@/data/schema';
import { featureById, testDomainById } from '@/data';
import { declineForFeature } from '@/lib/character/dragonElement';
import { characterRecoveryDiceMax } from '@/lib/character/hp';
import { currentRecoveryDice } from '@/lib/character/gauges';
import { rulesContext } from '@/lib/character/rulesContext';
import type { Character } from '@/lib/character/types';
import {
  conditionalEffectsOf,
  conditionalEffectBonuses,
  conditionalAbilityTestBonus,
  conditionalOptionGateMet,
  isEffectActive,
  isTemporaryActivationShortRestLocked,
  usageCounterMaximum,
} from '@/lib/character/effects';
import { isBuffToggleSuperseded } from '@/lib/character/groupBuffs';
// Libellés courts des stats dérivées (« +1 DEF ») — source unique partagée avec les badges
// d'apport d'objet (PER-273).
import { DERIVED_MOD_SHORT_NAMES as STAT_SHORT } from '@/lib/ui/derivedStats';

/** Valeur signée à la française (− U+2212 pour le négatif), ex. « +1 », « −2 ». */
const signed = (n: number): string => (n >= 0 ? `+${n}` : `−${Math.abs(n)}`);

/**
 * Libellé d'un effet conditionnel : « −2 DEF — pendant la rage berserk », ou
 * « +2 Init., +2 DEF — familier en vue » (plusieurs bonus sous un seul
 * interrupteur). Les valeurs sont RÉSOLUES pour le personnage (paliers, etc.).
 * Sans bonus (marqueur d'état pur, ex. « Démon invoqué »), seul le déclencheur
 * s'affiche.
 */
function effectLabel(
  character: Character,
  featureId: string,
  index: number,
  effect: ConditionalStatBonusEffect,
): string {
  const bonuses = conditionalEffectBonuses(character, featureId, index) ?? [];
  const parts = bonuses.map((b) => `${signed(b.value)} ${STAT_SHORT[b.stat]}`);
  // Facette « tous les tests de carac » (ex. Bénédiction), sous le même interrupteur.
  const testBonus = conditionalAbilityTestBonus(character, featureId, index);
  if (testBonus !== null && testBonus !== 0) parts.push(`${signed(testBonus)} tests de carac`);
  // Facette « bonus de compétence sur des domaines » (ex. en milieu naturel, PER-117).
  if (effect.testBonusDomains?.length) {
    const labels = effect.testBonusDomains.map((d) => testDomainById.get(d)?.label ?? d).join(', ');
    parts.push(`tests : ${labels}`);
  }
  // Facette « dé bonus sur des domaines de test » (ex. Travail d'équipe, PER-108).
  if (effect.testDieDomains?.length) {
    const labels = effect.testDieDomains.map((d) => testDomainById.get(d)?.label ?? d).join(', ');
    parts.push(`dé bonus : ${labels}`);
  }
  const joined = parts.join(', ');
  // PER-74 — déclinaison du déclencheur selon l'élément draconique (« épée %swordAdj% » → « épée
  // électrifiée »), pour que l'interrupteur du panneau d'états dise la même chose que la carte du rang.
  const feature = featureById.get(featureId);
  const trigger = feature
    ? declineForFeature(character, feature, effect.activation.label)
    : effect.activation.label;
  return joined ? `${joined} — ${trigger}` : trigger;
}

export interface FeatureEffectTogglesProps {
  character: Character;
  featureId: string;
  /** Vue colonne : interrupteur seul (libellé en infobulle). */
  compact?: boolean;
  /** Bascule le i-ème effet de la capacité ; absent → interrupteurs désactivés. */
  onToggle?: (featureId: string, index: number, active: boolean) => void;
  /**
   * PER-329 — dépense 1 dé de récupération et active la forme (bouton « Dépenser 1 DR » d'une
   * transformation qui déclare `transformationRecoveryDieButton`). Absent → bouton non rendu.
   */
  onSpendRecoveryDie?: (featureId: string) => void;
  /**
   * Capacité actuellement désactivée par exclusion mutuelle (un autre interrupteur
   * actif la grise) : les interrupteurs sont rendus NON-INTERACTIFS. Indépendant de
   * `onToggle` (le détail de la capacité reste, lui, consultable).
   */
  disabled?: boolean;
  /**
   * États posés par le MJ sur ce personnage pendant une session ACTIVE (PER-314). Un buff de groupe
   * qui s'y trouve SUPPLANTE l'interrupteur de fiche du porteur : grisé, annoté « appliqué par la
   * séance », et déjà exclu du calcul en amont (`withSupersededBuffTogglesOff`). Vide hors séance,
   * où l'interrupteur reprend la main — c'est alors le seul canal du bonus.
   */
  sessionStatusIds?: readonly string[];
}

/**
 * Rend les interrupteurs des effets conditionnels d'une capacité. N'affiche rien
 * si la capacité n'en porte aucun (peut être posé sans condition).
 */
export function FeatureEffectToggles({
  character,
  featureId,
  compact = false,
  onToggle,
  onSpendRecoveryDie,
  disabled = false,
  sessionStatusIds = [],
}: FeatureEffectTogglesProps) {
  // Gating par option de choix (ex. drakonide r4) : un effet dont l'option requise n'est PAS retenue
  // (« Ailes » choisie alors que le buff appartient à « Fureur ») n'est pas proposé du tout — pas
  // d'interrupteur mort. `isEffectActive` le tient déjà pour inactif côté moteur.
  const entries = conditionalEffectsOf(featureId).filter(({ effect }) =>
    conditionalOptionGateMet(character, featureId, effect),
  );
  if (entries.length === 0) return null;

  // Dépendance à sens unique (PER-109) : un interrupteur qui dépend d'un autre
  // (`deactivatesWithEffectIndex`) est rendu NON-INTERACTIF tant que son prérequis est inactif
  // (ex. « bonus doublé » de Parade croisée tant que « une arme dans chaque main » est coupé).
  const prereqUnmet = (effect: ConditionalStatBonusEffect): boolean =>
    effect.deactivatesWithEffectIndex !== undefined &&
    !isEffectActive(character, featureId, effect.deactivatesWithEffectIndex);

  // Verrou « 1 usage par repos court » (PER-161, ex. Sanctuaire) : une fois lancé, l'interrupteur ne
  // peut plus être RÉACTIVÉ avant un repos court. On grise donc la RÉACTIVATION seule — l'éteindre
  // (fin du sort, action offensive) reste toujours possible tant qu'il est actif.
  const reactivationLocked = (index: number): boolean =>
    !isEffectActive(character, featureId, index) &&
    isTemporaryActivationShortRestLocked(character, featureId, index);

  // Buff de groupe posé par la séance (PER-314) : la séance GAGNE sur l'interrupteur du porteur, qui
  // ne compte plus dans le calcul. On le grise ici — l'éteindre ou le rallumer ne changerait rien
  // tant que le MJ maintient l'état, et le laisser cliquable ferait croire à un effet.
  const supersededBySession = (index: number): boolean =>
    isBuffToggleSuperseded(character.featureIds, sessionStatusIds, featureId, index);
  /** Libellé complet, suffixé de la raison du grisage quand la séance a pris le relais. */
  const label = (index: number, effect: ConditionalStatBonusEffect): string => {
    const base = effectLabel(character, featureId, index, effect);
    return supersededBySession(index) ? `${base} — appliqué par la séance` : base;
  };

  // PER-329 — bouton « Dépenser 1 DR » d'une transformation (panthère du félis) : débite un dé de
  // récupération et réactive la forme. Affiché SEULEMENT une fois l'usage gratuit du jour épuisé ET la
  // forme redevenue humaine (toggle OFF) — la 1re transformation/jour passe par l'interrupteur (gratuite).
  // Grisé à 0 DR (informe qu'aucune retransformation n'est possible). Rendu dans la MODALE seulement, pas
  // dans la carte de la vue colonne (`compact`).
  const drFeature = featureById.get(featureId);
  const drButton = drFeature?.transformationRecoveryDieButton;
  const drRemaining = drButton
    ? currentRecoveryDice(characterRecoveryDiceMax(character, rulesContext) ?? 0, character.depletion)
    : 0;
  const drFreeUseExhausted = (() => {
    if (!drButton) return false;
    const counter = drFeature?.usageCounter;
    if (!counter) return true; // pas de suivi d'usage gratuit → toujours payant
    const key = counter.sharedKey ?? featureId;
    const max = usageCounterMaximum(counter, character, drFeature);
    return Math.max(0, Math.min(max, character.usageCounters?.[key] ?? max)) <= 0;
  })();
  const showDrButton =
    !!drButton &&
    !!onSpendRecoveryDie &&
    drFreeUseExhausted &&
    !isEffectActive(character, featureId, drButton.effectIndex);
  const recoveryDieButton =
    showDrButton && onSpendRecoveryDie ? (
      <AppTooltip
        title={
          drRemaining > 0
            ? `Se transformer en dépensant 1 dé de récupération (${drRemaining} restant${drRemaining > 1 ? 's' : ''}). La 1re transformation du jour est gratuite via l'interrupteur ci-dessus.`
            : 'Aucun dé de récupération disponible.'
        }
      >
        <span>
          <Button
            size="small"
            variant="outlined"
            color="inherit"
            startIcon={<Casino sx={{ fontSize: 16 }} />}
            disabled={drRemaining <= 0}
            onClick={() => onSpendRecoveryDie(featureId)}
            sx={{ alignSelf: 'flex-start', textTransform: 'none' }}
          >
            Dépenser 1 DR ({drRemaining})
          </Button>
        </span>
      </AppTooltip>
    ) : null;

  if (compact) {
    // Vue colonne : interrupteur seul. `stopPropagation` pour ne pas ouvrir la
    // modale de détail de la carte en basculant l'état.
    return (
      <Stack
        direction="row"
        spacing={0.5}
        sx={{ flexWrap: 'wrap' }}
        onClick={(e) => e.stopPropagation()}
        data-glossary-shot="FeatureEffectToggles"
      >
        {entries.map(({ index, effect }) => (
          <AppTooltip key={index} title={label(index, effect)}>
            <Switch
              size="small"
              checked={isEffectActive(character, featureId, index)}
              disabled={
                !onToggle ||
                disabled ||
                prereqUnmet(effect) ||
                reactivationLocked(index) ||
                supersededBySession(index)
              }
              onChange={(e) => onToggle?.(featureId, index, e.target.checked)}
            />
          </AppTooltip>
        ))}
      </Stack>
    );
  }

  return (
    <Stack spacing={0.5} data-glossary-shot="FeatureEffectToggles">
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
        Effets conditionnels (à activer selon la situation)
      </Typography>
      {entries.map(({ index, effect }) => (
        <FormControlLabel
          key={index}
          control={
            <Switch
              size="small"
              checked={isEffectActive(character, featureId, index)}
              disabled={
                !onToggle ||
                disabled ||
                prereqUnmet(effect) ||
                reactivationLocked(index) ||
                supersededBySession(index)
              }
              onChange={(e) => onToggle?.(featureId, index, e.target.checked)}
            />
          }
          label={<Typography variant="body2">{label(index, effect)}</Typography>}
        />
      ))}
      {recoveryDieButton}
    </Stack>
  );
}
