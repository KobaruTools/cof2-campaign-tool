'use client';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import FormControl from '@mui/material/FormControl';
import Grid from '@mui/material/Grid';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { ancestryById, classById } from '@/data';
import type { AbilityId } from '@/data/schema';
import { ABILITY_IDS } from '@/data/schema';
import { modifierDeltas, lowestAbilities } from '@/lib/character/ancestry';
import { distributeValueSet, valueSets } from './helpers';
import { abilityTotalColor, ancestryModifierColor } from '@/lib/ui/abilityColors';
import { ABILITY_NAMES } from '@/lib/ui/ability';
import { AbilityIcon } from '@/components/AbilityIcon';
import { AppAlert } from '@/components/AppAlert';
import { SignedNumberField } from '@/components/SignedNumberField';
import { SourceRef } from '@/components/SourceRef';
import type { StepProps } from './types';

function abilityTotalLabel(total: number): string {
  const clamped = Math.max(-3, Math.min(5, total));
  const labels: Record<number, string> = {
    [-3]: 'Catastrophique',
    [-2]: 'Très faible',
    [-1]: 'Faible',
    [0]: 'Moyen',
    [1]: 'Supérieur',
    [2]: 'Bon',
    [3]: 'Très bon',
    [4]: 'Excellent',
    [5]: 'Extraordinaire',
  };
  return labels[clamped];
}

export function AbilitiesStep({ draft, patch }: StepProps) {
  const ancestry = ancestryById.get(draft.ancestryId);
  const characterClass = classById.get(draft.classId);
  if (!ancestry) return <AppAlert severity="warning">Choisissez d’abord un peuple.</AppAlert>;

  const deltas = modifierDeltas(ancestry, draft.ancestryChoices);
  const lowest = lowestAbilities(draft.baseAbilities);

  const applyValueSet = (values: number[]) => {
    patch({ baseAbilities: distributeValueSet(values, characterClass?.recommendedAbilities ?? []) });
  };

  const setBase = (id: AbilityId, value: number) => {
    patch({ baseAbilities: { ...draft.baseAbilities, [id]: value } });
  };

  const setChoice = (index: number, ability: AbilityId) => {
    const next = [...draft.ancestryChoices];
    next[index] = ability;
    patch({ ancestryChoices: next });
  };

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Reportez les valeurs déterminées à la table (saisie libre). Les séries du livre sont
          proposées comme point de départ.
        </Typography>
        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
          {valueSets.map((s) => (
            <Button key={s.id} size="small" variant="outlined" onClick={() => applyValueSet(s.values)}>
              {s.name} ({s.values.join(', ')})
            </Button>
          ))}
        </Stack>
      </Box>

      {/* Résolution des modificateurs de peuple à choix */}
      {ancestry.abilityModifiers.some((m) => m.abilities.length > 1) && (
        <Card variant="outlined">
          <CardContent>
            <Typography variant="subtitle2" gutterBottom>
              Modificateurs de {ancestry.name}
            </Typography>
            <Stack spacing={2}>
              {ancestry.abilityModifiers.map((mod, i) => {
                if (mod.abilities.length === 1) return null;
                // Cas humain : « +1 à une des deux plus faibles » (encodé avec les
                // 7 caracs). Le choix reste libre dans le modèle ; l'UI conseille
                // les plus faibles et alerte si une autre carac est retenue.
                const isLowestMod = mod.abilities.length === ABILITY_IDS.length;
                const chosen = draft.ancestryChoices[i];
                const names = lowest.map((id) => ABILITY_NAMES[id]);
                // « A, B et C » — énumération lisible (≥ 2 caracs éligibles).
                const lowestNames =
                  names.length > 1
                    ? `${names.slice(0, -1).join(', ')} et ${names[names.length - 1]}`
                    : names[0];
                // « deux » seulement sans égalité ; sinon plusieurs caracs sont à
                // égalité sur la valeur la plus faible (toutes éligibles).
                const lowestPhrase =
                  lowest.length === 2
                    ? 'vos deux caractéristiques les plus faibles'
                    : 'vos caractéristiques les plus faibles';
                const deviates = isLowestMod && !!chosen && !lowest.includes(chosen);
                return (
                  <Box key={i}>
                    <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 260 } }}>
                      <InputLabel>{`${mod.value > 0 ? '+' : ''}${mod.value} à`}</InputLabel>
                      <Select
                        label={`${mod.value > 0 ? '+' : ''}${mod.value} à`}
                        value={draft.ancestryChoices[i] ?? ''}
                        onChange={(e) => setChoice(i, e.target.value as AbilityId)}
                      >
                        {(isLowestMod ? ABILITY_IDS : mod.abilities).map((c) => (
                          <MenuItem
                            key={c}
                            value={c}
                            sx={isLowestMod
                              ? lowest.includes(c)
                                ? { fontWeight: 700 }
                                : { opacity: 0.35 }
                              : undefined}
                          >
                            {ABILITY_NAMES[c]}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    {isLowestMod && (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ display: 'block', mt: 0.5 }}
                      >
                        Règle de l’humain <SourceRef page={57} /> : ce +1 doit porter sur l’une de{' '}
                        {lowestPhrase}
                        {lowestNames ? ` (${lowestNames})` : ''}.
                      </Typography>
                    )}
                    {deviates && chosen && (
                      <AppAlert severity="warning" sx={{ mt: 1 }}>
                        {ABILITY_NAMES[chosen]} ne fait pas partie de {lowestPhrase}
                        {lowestNames ? ` (${lowestNames})` : ''} : vous dérogez à la règle de
                        l’humain.
                      </AppAlert>
                    )}
                  </Box>
                );
              })}
            </Stack>
          </CardContent>
        </Card>
      )}

      <Grid container spacing={2}>
        <Grid size={12}>
          <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
            <Box sx={{ width: 24, flexShrink: 0 }} />
            <Typography variant="overline" color="text.secondary" sx={{ flex: 1, maxWidth: 160 }}>
              Jet de dés
            </Typography>
            <Typography variant="overline" color="text.secondary" sx={{ flex: 1, maxWidth: 160 }}>
              Total
            </Typography>
          </Stack>
        </Grid>
        {ABILITY_IDS.map((id) => {
          const total = draft.baseAbilities[id] + deltas[id];
          const color = abilityTotalColor(total, id);
          return (
            <Grid key={id} size={12}>
              <Stack direction="row" spacing={2} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                <AbilityIcon ability={id} title size={24} sx={{ flexShrink: 0 }} />
                <SignedNumberField
                  label={id}
                  size="small"
                  value={draft.baseAbilities[id]}
                  onChange={(v) => setBase(id, v)}
                  containerSx={{ flex: 1, maxWidth: 160 }}
                />
                <TextField
                  label={abilityTotalLabel(total)}
                  size="small"
                  disabled
                  value={`${total > 0 ? '+' : ''}${total}`}
                  sx={{
                    flex: 1,
                    maxWidth: 160,
                    '& .MuiInputBase-input.Mui-disabled': {
                      WebkitTextFillColor: color,
                      fontWeight: 600,
                    },
                    '& .MuiInputLabel-root.Mui-disabled': {
                      color,
                    },
                  }}
                />
                {deltas[id] !== 0 && (
                  <Typography variant="caption" sx={{ color: ancestryModifierColor(deltas[id]) }}>
                    {ancestry.name} {deltas[id] > 0 ? '+' : ''}
                    {deltas[id]}
                  </Typography>
                )}
              </Stack>
            </Grid>
          );
        })}
      </Grid>
    </Stack>
  );
}
