'use client';

import { Fragment } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import type { AbilityId } from '@/data/schema';
import type { Abilities } from '@/lib/engine';
import { DamageValue } from '@/components/DamageValue';
import { AbilityValueChip } from '@/components/sheet/FeatureRichText';

/**
 * Expression de DM d'arme (PER-141/PER-115), partagée par les cartes Attaque au contact et à
 * distance : le(s) dé(s) via `<DamageValue>` (qui gère `d3`, le `°` évolutif et le nombre de dés),
 * PUIS la ou les caractéristiques ajoutées, affichées par leur VALEUR courante dans une puce aux
 * couleurs de la carac + contour tireté (`AbilityValueChip`, norme PER-224) : compact là où l'espace
 * manque, plutôt qu'un « FOR (3) » verbeux. Plusieurs caracs (best-of, ex. FOR/AGI) → chips séparées
 * par « / ». Une liste VIDE (arme à distance de base, p. 185) n'affiche que le dé. Un bonus PLAT
 * permanent (Spécialisation du maître d'armes, PER-226) est rendu « + N » à la suite.
 */
export function WeaponDamageExpr({
  dice,
  abilities,
  flat = 0,
  charAbilities,
}: {
  dice: string;
  abilities: AbilityId[];
  /** Bonus PLAT permanent ajouté aux DM (ex. Spécialisation du maître d'armes, PER-226). 0 = rien. */
  flat?: number;
  charAbilities: Abilities;
}) {
  return (
    <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.25, flexWrap: 'wrap' }}>
      <DamageValue damage={dice} size={22} />
      {abilities.length > 0 && (
        <>
          <Typography component="span" variant="body2" sx={{ fontWeight: 600 }}>
            +
          </Typography>
          {abilities.map((ability, i) => (
            <Fragment key={ability}>
              {i > 0 && (
                <Typography component="span" variant="body2" color="text.secondary">
                  /
                </Typography>
              )}
              <AbilityValueChip ability={ability} value={charAbilities[ability]} />
            </Fragment>
          ))}
        </>
      )}
      {flat > 0 && (
        <Typography component="span" variant="body2" sx={{ fontWeight: 600 }}>
          + {flat}
        </Typography>
      )}
    </Box>
  );
}

/** Indicateur court « Aucune arme » (aucune arme du mode considéré n'est en main). */
export function NoWeaponHint() {
  return (
    <Typography variant="body2" sx={{ color: 'text.disabled' }}>
      Aucune arme
    </Typography>
  );
}
