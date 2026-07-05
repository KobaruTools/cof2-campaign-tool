'use client';

import type { SxProps, Theme } from '@mui/material/styles';
import type { DerivedInput } from '@/lib/engine';
import { featureModSources, type EffectContext } from '@/lib/character/effects';
import { DERIVED_STAT_NAMES, type DerivedStatId } from '@/lib/ui/derivedStats';
import { derivedStatBreakdown, type ModSources } from '@/lib/ui/derivedStatBreakdown';
import { BreakdownContent } from '@/components/BreakdownContent';
import { InfoHint } from '@/components/InfoHint';

export interface DerivedStatHintProps {
  statId: DerivedStatId;
  /** Mêmes entrées que `deriveStats` — sert à recalculer le détail. */
  input: DerivedInput;
  /**
   * Capacités acquises : sert à détailler, sous « Capacités / divers », quelle
   * capacité apporte quel bonus. Absent → pas de sous-liste.
   */
  featureIds?: string[];
  /**
   * Contexte d'effets (PER-67) : résout les valeurs scalantes et filtre les
   * effets conditionnels inactifs du détail. Absent → bonus plats constants seuls.
   */
  effectContext?: EffectContext;
  /**
   * Sources additionnelles (hors capacités) à fusionner dans le détail « Capacités /
   * divers » de chaque stat — ex. points de capacité orphelins convertis (p. 40).
   */
  extraModSources?: ModSources;
  /** Classe CSS posée sur l'icône « i » — permet au parent de la révéler au survol du bloc. */
  className?: string;
  /** Délai (ms) avant apparition de l'infobulle au survol (cf. `AppTooltip.enterDelay`). */
  enterDelay?: number;
  sx?: SxProps<Theme>;
}

/**
 * Icône « i » à poser à côté d'une statistique dérivée : au survol, détaille
 * d'où vient le total (terme par terme), avec la page source CO2.
 */
export function DerivedStatHint({
  statId,
  input,
  featureIds,
  effectContext,
  extraModSources,
  className,
  enterDelay,
  sx,
}: DerivedStatHintProps) {
  // Inventaire des capacités contribuant à chaque modificateur, mis en forme de
  // sous-termes : libellé = nom nu de la capacité + `featureId` → l'UI rend la puce
  // de voie complète (`CapabilityChip` : couleur + icône) au lieu du nom brut ; le
  // drapeau `conditional` ajoute un marqueur « (conditionnel) » pour les effets à interrupteur.
  const modSources: ModSources = {};
  if (featureIds) {
    for (const [key, list] of Object.entries(featureModSources(featureIds, effectContext))) {
      modSources[key as keyof ModSources] = list.map((s) => ({
        label: s.name,
        value: s.value,
        featureId: s.featureId,
        conditional: s.conditional,
      }));
    }
  }
  // Sources additionnelles (points orphelins…) ajoutées aux sous-termes existants.
  if (extraModSources) {
    for (const [key, list] of Object.entries(extraModSources)) {
      const k = key as keyof ModSources;
      modSources[k] = [...(modSources[k] ?? []), ...(list ?? [])];
    }
  }
  const bd = derivedStatBreakdown(statId, input, modSources);
  return (
    <InfoHint page={bd.page} className={className} enterDelay={enterDelay} sx={sx}>
      <BreakdownContent title={DERIVED_STAT_NAMES[statId]} breakdown={bd} />
    </InfoHint>
  );
}
