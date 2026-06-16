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
import FormControlLabel from '@mui/material/FormControlLabel';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import type { ConditionalStatBonusEffect, DerivedStatId } from '@/data/schema';
import type { Character } from '@/lib/character/types';
import { conditionalEffectsOf, conditionalEffectBonuses, isEffectActive } from '@/lib/character/effects';

/** Libellés courts (français) des stats dérivées, indexés par clé moteur. */
const STAT_SHORT: Record<DerivedStatId, string> = {
  maxHp: 'PV',
  def: 'DEF',
  initiative: 'Init.',
  luckPoints: 'PC',
  manaPoints: 'PM',
  recoveryDiceCount: 'DR',
  meleeAttack: 'Att. contact',
  rangedAttack: 'Att. distance',
  magicAttack: 'Att. magique',
};

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
  const parts = bonuses.map((b) => `${signed(b.value)} ${STAT_SHORT[b.stat]}`).join(', ');
  return parts ? `${parts} — ${effect.activation.label}` : effect.activation.label;
}

export interface FeatureEffectTogglesProps {
  character: Character;
  featureId: string;
  /** Vue colonne : interrupteur seul (libellé en infobulle). */
  compact?: boolean;
  /** Bascule le i-ème effet de la capacité ; absent → interrupteurs désactivés. */
  onToggle?: (featureId: string, index: number, active: boolean) => void;
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
}: FeatureEffectTogglesProps) {
  const entries = conditionalEffectsOf(featureId);
  if (entries.length === 0) return null;

  if (compact) {
    // Vue colonne : interrupteur seul. `stopPropagation` pour ne pas ouvrir la
    // modale de détail de la carte en basculant l'état.
    return (
      <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap' }} onClick={(e) => e.stopPropagation()}>
        {entries.map(({ index, effect }) => (
          <Tooltip key={index} title={effectLabel(character, featureId, index, effect)} arrow>
            <Switch
              size="small"
              checked={isEffectActive(character, featureId, index)}
              disabled={!onToggle}
              onChange={(e) => onToggle?.(featureId, index, e.target.checked)}
            />
          </Tooltip>
        ))}
      </Stack>
    );
  }

  return (
    <Stack spacing={0.5}>
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
              disabled={!onToggle}
              onChange={(e) => onToggle?.(featureId, index, e.target.checked)}
            />
          }
          label={<Typography variant="body2">{effectLabel(character, featureId, index, effect)}</Typography>}
        />
      ))}
    </Stack>
  );
}
