'use client';

import Box from '@mui/material/Box';
import Tooltip from '@mui/material/Tooltip';
import type { ActionType, Feature } from '@/data/schema';
import { canConcentrate } from '@/lib/engine';

/** Libellés français des types d'action notés après le nom des capacités (p. 227). */
export const ACTION_TYPE_LABELS: Record<ActionType, string> = {
  A: 'Attaque',
  L: 'Limitée',
  G: 'Gratuite',
  M: 'Mouvement',
};

export interface FeatureLabelProps {
  feature: Feature;
  /**
   * Concentration accrue active (état de jeu, p. 228) : un sort lancé en (A) est
   * affiché comme une action limitée (L) — la concentration le transforme. Sans
   * effet sur les capacités non éligibles (cf. `canConcentrate`).
   */
  concentration?: boolean;
}

/**
 * Nom d'une capacité suivi de ses marqueurs verbatim du livre, source UNIQUE
 * réutilisée partout (fiche, récapitulatif du wizard, montée de niveau…) :
 *  - `*` pour un sort (p. 227), en accent, infobulle « Sort » ;
 *  - `(A/L/G/M)` pour le ou les types d'action, infobulle explicative.
 *
 * Rendu inline (`<span>`) : le composant hérite de la typographie du parent ;
 * c'est l'appelant qui choisit la taille/graisse via un `<Typography>` englobant.
 */
export function FeatureLabel({ feature, concentration = false }: FeatureLabelProps) {
  const concentrated = concentration && canConcentrate(feature);
  return (
    <Box component="span">
      {feature.name}
      {feature.isSpell && (
        <Tooltip title="Sort" arrow>
          <Box component="span" sx={{ fontWeight: 700, color: 'info.main', cursor: 'default' }}>
            *
          </Box>
        </Tooltip>
      )}
      {feature.actionTypes.map((a) =>
        // Concentration : le (A) devient (L), affiché en accent avec une infobulle
        // dédiée pour signaler la transformation (p. 228).
        concentrated && a === 'A' ? (
          <Box component="span" key={a}>
            {' '}
            <Tooltip title="Concentration : lancé en action limitée (L) au lieu de (A) (p. 228)" arrow>
              <Box component="span" sx={{ fontWeight: 700, color: 'info.main', cursor: 'default' }}>
                (L)
              </Box>
            </Tooltip>
          </Box>
        ) : (
          <Box component="span" key={a}>
            {' '}
            <Tooltip title={ACTION_TYPE_LABELS[a]} arrow>
              <Box
                component="span"
                sx={{ fontWeight: 700, color: 'text.secondary', cursor: 'default' }}
              >
                ({a})
              </Box>
            </Tooltip>
          </Box>
        ),
      )}
    </Box>
  );
}
