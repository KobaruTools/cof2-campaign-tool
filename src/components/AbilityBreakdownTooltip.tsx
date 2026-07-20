'use client';

import type { ReactElement } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { AbilityId, Ancestry } from '@/data/schema';
import type { AncestryChoice } from '@/lib/character/ancestry';
import type { BonusDieSource } from '@/lib/character/effects';
import { ABILITY_NAMES } from '@/lib/ui/ability';
import { abilityBreakdown, type AbilityFeatureTerm } from '@/lib/ui/abilityBreakdown';
import { AppTooltip } from '@/components/AppTooltip';
import { BreakdownContent } from '@/components/BreakdownContent';
import { CapabilityChip } from '@/components/sheet/FeatureRichText';

export interface AbilityBreakdownTooltipProps {
  abilityId: AbilityId;
  /** Valeurs de base saisies à la création (avant modificateurs de peuple). */
  baseAbilities: Record<AbilityId, number>;
  /** Peuple du personnage (apporte les modificateurs). */
  ancestry: Ancestry;
  /** Résolution des modificateurs de peuple (parallèle à `ancestry.abilityModifiers`). */
  ancestryChoices: AncestryChoice;
  /** Modificateurs permanents de capacités ciblant cette caractéristique (ex. « +1 — Endurer »). */
  featureTerms?: AbilityFeatureTerm[];
  /**
   * Capacité(s) accordant un DÉ BONUS permanent aux tests de cette caractéristique.
   * Rendues en note sous le détail, chacune en pastille de capacité (le badge « double
   * d20 » n'a plus sa propre bulle quand l'info-bulle enrobe tout le bloc).
   */
  bonusDieSources?: BonusDieSource[];
  /** Le chiffre (ou champ) survolé pour afficher le détail. */
  children: ReactElement;
}

/**
 * Enrobe le chiffre d'une caractéristique : au survol, détaille « valeur de
 * base + modificateur(s) de peuple + capacité(s) = total », avec la page source CO2.
 * Même langage visuel que le détail des statistiques dérivées
 * (`DerivedStatBreakdownTooltip`), déclenché directement par le chiffre.
 */
export function AbilityBreakdownTooltip({
  abilityId,
  baseAbilities,
  ancestry,
  ancestryChoices,
  featureTerms,
  bonusDieSources,
  children,
}: AbilityBreakdownTooltipProps) {
  const bd = abilityBreakdown(abilityId, baseAbilities, ancestry, ancestryChoices, featureTerms);
  // Page source rendue par `BreakdownContent` en haut à droite du titre (cohérent avec
  // les statistiques dérivées ; plus de puce en pied de bulle).
  const title = (
    <Box sx={{ py: 0.5 }}>
      <BreakdownContent title={ABILITY_NAMES[abilityId]} breakdown={bd} page={bd.page} />
      {bonusDieSources && bonusDieSources.length > 0 && (
        <Stack
          direction="row"
          spacing={0.5}
          sx={{ mt: 1, flexWrap: 'wrap', alignItems: 'center', rowGap: 0.5 }}
        >
          <Typography variant="caption" sx={{ color: 'secondary.main' }}>
            Dé bonus aux tests —
          </Typography>
          {bonusDieSources.map((s) => (
            <CapabilityChip key={s.featureId} featureId={s.featureId} label={s.name} />
          ))}
        </Stack>
      )}
    </Box>
  );
  return <AppTooltip title={title}>{children}</AppTooltip>;
}
