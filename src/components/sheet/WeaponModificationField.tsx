'use client';

/**
 * Section « armes bricolées » (PER-284) — rendue sous la capacité qui porte
 * `Feature.weaponModification` : Arme à répétition (`artilleur-r2`, p. 62 — « L'arquebusier modifie
 * jusqu'à DEUX armes de son choix pour les doter de chargeurs ») et Canon double (`artilleur-r4`,
 * p. 63 — « ses armes à poudre », sans plafond annoncé).
 *
 * C'est au JOUEUR de désigner les armes : une case à cocher par arme éligible de l'inventaire, avec
 * le compteur « retenues / plafond ». Au plafond, les armes non retenues sont désactivées (le livre
 * dit « jusqu'à deux », on ne laisse pas en cocher une troisième) — et cocher une arme met aussitôt
 * à jour son nombre de coups (la capacité d'un chargeur remplace celle du canon).
 *
 * Même patron que `PoisonWeaponLoadoutField` : composant AUTONOME (aucune dépendance vers
 * FeaturesByPath), mutations pures de `sheetActions.ts`, patch remonté au parent via `onUpdate`.
 */
import Box from '@mui/material/Box';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { AppTooltip } from '@/components/AppTooltip';
import { useFirearmsAllowed } from '@/components/ClassIcon';
import type { WeaponModificationLoadout } from '@/data/schema';
import type { Character } from '@/lib/character/types';
import { setWeaponModification } from '@/lib/character/sheetActions';
import {
  hasWeaponModification,
  isModifiableWeapon,
  loadingContext,
  modifiedWeaponCount,
  weaponLoadingState,
} from '@/lib/character/weaponLoading';
import { effectiveItem } from '@/lib/character/items';

export function WeaponModificationField({
  spec,
  character,
  onUpdate,
}: {
  spec: WeaponModificationLoadout;
  character: Character;
  /** Applique un patch (issu d'une mutation `sheetActions`). Absent → lecture seule. */
  onUpdate?: (patch: Partial<Character>) => void;
}) {
  const editable = !!onUpdate;
  const firearmsAllowed = useFirearmsAllowed();
  const ctx = loadingContext(character);
  const selected = modifiedWeaponCount(character.equipment, spec.modification);
  const atMax = spec.maxWeapons !== undefined && selected >= spec.maxWeapons;

  // Armes éligibles de l'inventaire, avec leur index de ligne (les mutations passent par l'index).
  const candidates = character.equipment.flatMap((line, index) => {
    if (!isModifiableWeapon(line, spec, firearmsAllowed)) return [];
    const on = hasWeaponModification(line, spec.modification);
    const state = weaponLoadingState(line, ctx);
    return [
      {
        index,
        on,
        name: effectiveItem(line)?.name ?? line.itemId,
        capacity: state?.capacity ?? 1,
      },
    ];
  });

  return (
    <Box data-glossary-shot="WeaponModificationField">
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}
      >
        {spec.label} ({selected}
        {spec.maxWeapons !== undefined ? `/${spec.maxWeapons}` : ''})
      </Typography>

      {candidates.length === 0 ? (
        <Typography variant="caption" color="text.secondary">
          {spec.scope === 'firearm'
            ? firearmsAllowed === false
              ? 'Aucune arbalète dans l’inventaire.'
              : 'Aucune arme à poudre dans l’inventaire.'
            : 'Aucune arme à recharger dans l’inventaire (arbalète ou arme à poudre).'}
        </Typography>
      ) : (
        <Stack sx={{ gap: 0 }}>
          {candidates.map(({ index, on, name, capacity }) => {
            // Au plafond, on ne peut plus qu'en DÉCOCHER une.
            const disabled = !editable || (!on && atMax);
            return (
              <AppTooltip
                key={index}
                title={
                  disabled && !on && atMax
                    ? `Plafond atteint (${spec.maxWeapons}) — décochez une arme pour en bricoler une autre`
                    : on
                      ? `${capacity} coup${capacity > 1 ? 's' : ''} sur cette arme`
                      : 'Bricoler cette arme'
                }
              >
                <FormControlLabel
                  sx={{ ml: 0, my: 0 }}
                  control={
                    <Checkbox
                      size="small"
                      checked={on}
                      disabled={disabled}
                      onChange={(e) => {
                        const patch = setWeaponModification(
                          character,
                          index,
                          spec,
                          e.target.checked,
                          firearmsAllowed,
                        );
                        if (onUpdate && Object.keys(patch).length > 0) onUpdate(patch);
                      }}
                      sx={{ py: 0.25 }}
                    />
                  }
                  label={
                    <Typography variant="body2" component="span">
                      {name}
                      {on && (
                        <Typography
                          variant="caption"
                          component="span"
                          color="text.secondary"
                          sx={{ ml: 0.5, fontVariantNumeric: 'tabular-nums' }}
                        >
                          — {capacity} coup{capacity > 1 ? 's' : ''}
                        </Typography>
                      )}
                    </Typography>
                  }
                />
              </AppTooltip>
            );
          })}
        </Stack>
      )}
    </Box>
  );
}
