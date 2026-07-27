'use client';

import Box from '@mui/material/Box';
import { AppTooltip } from '@/components/AppTooltip';
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
  /**
   * Capacité fabuleuse (spécialiste r5, p. 129) « promotion » : la capacité choisie, marquée (L), voit
   * son marqueur (L) devenir (A) (« il lui suffit désormais d'une action d'attaque »). Rendu en accent
   * avec une info-bulle dédiée. Jamais actif en même temps que `concentration` (modes distincts de r5).
   */
  promoteToAttack?: boolean;
  /**
   * Rang ATTEINT dans la voie hôte (PER-72). Sert à afficher les types d'action
   * conditionnels (`feature.actionTypesFromRank`, ex. Parer un coup → (G) au rang 5).
   * Absent (wizard, historique…) → ces marqueurs conditionnels ne sont pas affichés.
   */
  pathRank?: number;
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
export function FeatureLabel({
  feature,
  concentration = false,
  promoteToAttack = false,
  pathRank,
}: FeatureLabelProps) {
  const concentrated = concentration && canConcentrate(feature);
  // Types d'action conditionnels au rang atteint dans la voie (PER-72) : affichés en plus
  // des `actionTypes` quand le rang est connu et atteint (ex. Parer un coup → (G) au rang 5).
  const fromRank = feature.actionTypesFromRank;
  const extraActionTypes =
    fromRank && pathRank != null && pathRank >= fromRank.rank ? fromRank.actionTypes : [];
  // Capacité fabuleuse (r5) « promotion » : (L) → (A), dédoublonné (au cas où (A) est déjà présent).
  const alreadyHadAttack = feature.actionTypes.includes('A');
  const displayActionTypes = promoteToAttack
    ? Array.from(new Set(feature.actionTypes.map((a) => (a === 'L' ? 'A' : a))))
    : feature.actionTypes;
  return (
    <Box component="span">
      {feature.name}
      {feature.isSpell && (
        <AppTooltip title="Sort">
          <Box component="span" sx={{ fontWeight: 700, color: 'info.main', cursor: 'default' }}>
            *
          </Box>
        </AppTooltip>
      )}
      {displayActionTypes.map((a) => {
        // (A) issu d'une promotion Capacité fabuleuse (n'était pas déjà (A)) : accent + info-bulle dédiée.
        const promoted = promoteToAttack && a === 'A' && !alreadyHadAttack;
        // Concentration : le (A) devient (L), affiché en accent avec une infobulle
        // dédiée pour signaler la transformation (p. 228).
        if (concentrated && a === 'A') {
          return (
            <Box component="span" key={a}>
              {' '}
              <AppTooltip title="Concentration : lancé en action limitée (L) au lieu de (A)" page={228}>
                <Box component="span" sx={{ fontWeight: 700, color: 'info.main', cursor: 'default' }}>
                  (L)
                </Box>
              </AppTooltip>
            </Box>
          );
        }
        return (
          <Box component="span" key={a}>
            {' '}
            <AppTooltip
              title={
                promoted
                  ? 'Capacité fabuleuse : action limitée (L) sublimée en attaque (A)'
                  : ACTION_TYPE_LABELS[a]
              }
              page={promoted ? 129 : undefined}
            >
              <Box
                component="span"
                sx={{ fontWeight: 700, color: promoted ? 'info.main' : 'text.secondary', cursor: 'default' }}
              >
                ({a})
              </Box>
            </AppTooltip>
          </Box>
        );
      })}
      {extraActionTypes.map((a) => (
        // Type d'action débloqué au rang (PER-72) : même rendu que les autres, l'infobulle
        // précisant la condition de rang dans la voie.
        <Box component="span" key={`fromRank-${a}`}>
          {' '}
          <AppTooltip title={`${ACTION_TYPE_LABELS[a]} — à partir du rang ${fromRank!.rank} de la voie`}>
            <Box
              component="span"
              sx={{ fontWeight: 700, color: 'text.secondary', cursor: 'default' }}
            >
              ({a})
            </Box>
          </AppTooltip>
        </Box>
      ))}
    </Box>
  );
}
