'use client';

import type { ReactElement } from 'react';
import Box from '@mui/material/Box';
import type { AbilityId, Ancestry } from '@/data/schema';
import type { AncestryChoice } from '@/lib/character/ancestry';
import { ABILITY_NAMES } from '@/lib/ui/ability';
import { abilityBreakdown, type AbilityFeatureTerm } from '@/lib/ui/abilityBreakdown';
import { AppTooltip } from '@/components/AppTooltip';
import { BreakdownContent } from '@/components/BreakdownContent';
import { SourceRef } from '@/components/SourceRef';

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
  /** Le chiffre (ou champ) survolé pour afficher le détail. */
  children: ReactElement;
}

/**
 * Enrobe le chiffre d'une caractéristique : au survol, détaille « valeur de
 * base + modificateur(s) de peuple + capacité(s) = total », avec la page source CO2.
 * Même langage visuel que le détail des statistiques dérivées (`DerivedStatHint`),
 * mais déclenché directement par le chiffre plutôt que par une icône « i ».
 */
export function AbilityBreakdownTooltip({
  abilityId,
  baseAbilities,
  ancestry,
  ancestryChoices,
  featureTerms,
  children,
}: AbilityBreakdownTooltipProps) {
  const bd = abilityBreakdown(abilityId, baseAbilities, ancestry, ancestryChoices, featureTerms);
  const title = (
    <Box sx={{ py: 0.5 }}>
      <BreakdownContent title={ABILITY_NAMES[abilityId]} breakdown={bd} />
      <SourceRef page={bd.page} sx={{ display: 'block', mt: 1 }} />
    </Box>
  );
  return <AppTooltip title={title}>{children}</AppTooltip>;
}
