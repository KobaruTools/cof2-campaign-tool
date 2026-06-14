'use client';

import Box from '@mui/material/Box';
import Tooltip from '@mui/material/Tooltip';
import type { ActionType, Feature } from '@/data/schema';
import { spellManaCost } from '@/lib/engine';

/** Libellés français des types d'action notés après le nom des capacités (p. 227). */
export const ACTION_TYPE_LABELS: Record<ActionType, string> = {
  A: 'Attaque',
  L: 'Limitée',
  G: 'Gratuite',
  M: 'Mouvement',
};

export interface FeatureLabelProps {
  feature: Feature;
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
export function FeatureLabel({ feature }: FeatureLabelProps) {
  const manaCost = spellManaCost(feature);
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
      {feature.actionTypes.map((a) => (
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
      ))}
      {manaCost !== null && (
        <>
          {' '}
          <Tooltip title={manaCostExplanation(feature, manaCost)} arrow>
            <Box
              component="span"
              sx={{ fontWeight: 700, color: 'info.main', cursor: 'default', whiteSpace: 'nowrap' }}
            >
              {manaCost} PM
            </Box>
          </Tooltip>
        </>
      )}
    </Box>
  );
}

/**
 * Texte d'infobulle du coût en mana : précise s'il suit la règle du rang
 * (p. 228) ou s'il s'agit d'une dérogation verbatim du sort (champ `manaCost`).
 * Rappelle que les réductions dynamiques (Concentration, armure…) ne sont pas
 * comptées dans ce coût de base.
 */
function manaCostExplanation(feature: Feature, cost: number): string {
  const base =
    feature.manaCost === undefined
      ? `Coût de base : ${cost} PM (= rang ${feature.rank} du sort, p. 228).`
      : `Coût de base : ${cost} PM — dérogation au coût standard (rang ${feature.rank}).`;
  return `${base} Hors réductions dynamiques (Concentration, etc.) et surcoût d'armure.`;
}
