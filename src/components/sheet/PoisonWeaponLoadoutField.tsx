'use client';

/**
 * Section « Poisons appliqués » (voie du maître des poisons, r5, p. 143, PER-74) — rendue sous la
 * capacité qui porte `Feature.poisonWeaponLoadout`. Permet d'ENDUIRE jusqu'à `maxWeapons` armes de
 * l'inventaire, de choisir la nature du poison (rapide, ou affaiblissant une fois le rang 6 acquis),
 * de DÉPENSER une charge (première attaque portée) ou de la ré-enduire, et de retirer le poison.
 *
 * État de jeu transitoire (hors mode « Modifier ») : toute la logique passe par les mutations pures de
 * `sheetActions.ts`, dont le patch est remonté au parent via `onUpdate`. Composant AUTONOME (aucune
 * dépendance vers FeaturesByPath) pour garder ce dernier — champ de mines — à surface minimale.
 */
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import { AppTooltip } from '@/components/AppTooltip';
import { POISON_KIND_LABELS, type PoisonKind } from '@/data/schema';
import type { Character } from '@/lib/character/types';
import {
  applyPoisonToWeapon,
  removePoisonFromWeapon,
  setPoisonKind,
  setPoisonSpent,
} from '@/lib/character/sheetActions';
import {
  isPoisonableWeaponLine,
  poisonedWeaponsView,
  poisonLoadoutFeature,
  weakeningUnlocked,
  weaponLineName,
} from '@/lib/character/poison';

export function PoisonWeaponLoadoutField({
  character,
  onUpdate,
}: {
  character: Character;
  /** Applique un patch d'état de jeu (issu d'une mutation `sheetActions`). Absent → lecture seule. */
  onUpdate?: (patch: Partial<Character>) => void;
}) {
  const loadout = poisonLoadoutFeature(character)?.loadout;
  if (!loadout) return null;

  const applied = poisonedWeaponsView(character);
  const canWeaken = weakeningUnlocked(character);
  const editable = !!onUpdate;

  // Armes de l'inventaire enduisables et pas encore enduites (avec leur index de ligne).
  const poisonedIds = new Set(applied.map((v) => v.application.instanceId));
  const addable: { index: number; name: string }[] = [];
  character.equipment.forEach((line, index) => {
    if (!isPoisonableWeaponLine(line)) return;
    if (line.instanceId && poisonedIds.has(line.instanceId)) return;
    addable.push({ index, name: weaponLineName(line) });
  });

  const apply = (patch: Partial<Character>) => {
    if (onUpdate && Object.keys(patch).length > 0) onUpdate(patch);
  };

  return (
    <Box>
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
        Poisons appliqués ({applied.length}/{loadout.maxWeapons})
        {canWeaken ? ' — rapide ou affaiblissant' : ' — poison rapide'}
      </Typography>

      <Stack sx={{ gap: 0.75 }}>
        {applied.map(({ application, name }) => {
          const { instanceId, kind, spent } = application;
          return (
            <Stack
              key={instanceId}
              direction="row"
              sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 0.5 }}
            >
              <Typography variant="body2" sx={{ fontWeight: 600, minWidth: 96 }}>
                {name}
              </Typography>

              {canWeaken ? (
                <ToggleButtonGroup
                  size="small"
                  exclusive
                  value={kind}
                  disabled={!editable}
                  onChange={(_, next: PoisonKind | null) => {
                    if (next && next !== kind) apply(setPoisonKind(character, instanceId, next));
                  }}
                >
                  <ToggleButton value="quick" sx={{ textTransform: 'none', py: 0.1, px: 0.75 }}>
                    Rapide
                  </ToggleButton>
                  <ToggleButton value="weakening" sx={{ textTransform: 'none', py: 0.1, px: 0.75 }}>
                    Affaiblissant
                  </ToggleButton>
                </ToggleButtonGroup>
              ) : (
                <Typography variant="caption" color="text.secondary">
                  {POISON_KIND_LABELS[kind]}
                </Typography>
              )}

              <AppTooltip
                title={
                  spent
                    ? 'Charge dépensée ce combat — cliquer pour ré-enduire'
                    : 'Marquer la charge comme dépensée (première attaque portée)'
                }
              >
                <span>
                  <Button
                    size="small"
                    variant={spent ? 'text' : 'outlined'}
                    color={spent ? 'inherit' : 'success'}
                    disabled={!editable}
                    onClick={() => apply(setPoisonSpent(character, instanceId, !spent))}
                    sx={{ textTransform: 'none', py: 0.1 }}
                  >
                    {spent ? 'Dépensé — ré-enduire' : 'Dépenser'}
                  </Button>
                </span>
              </AppTooltip>

              <AppTooltip title="Retirer le poison de cette arme">
                <span>
                  <IconButton
                    size="small"
                    disabled={!editable}
                    onClick={() => apply(removePoisonFromWeapon(character, instanceId))}
                  >
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </span>
              </AppTooltip>
            </Stack>
          );
        })}

        {applied.length === 0 && (
          <Typography variant="caption" color="text.secondary">
            Aucune arme enduite.
          </Typography>
        )}

        {editable && applied.length < loadout.maxWeapons && addable.length > 0 && (
          <TextField
            select
            size="small"
            label="Enduire une arme"
            value=""
            onChange={(e) => {
              const index = Number(e.target.value);
              if (Number.isInteger(index)) apply(applyPoisonToWeapon(character, index, 'quick'));
            }}
            sx={{ maxWidth: 260, mt: 0.5 }}
          >
            {addable.map(({ index, name }) => (
              <MenuItem key={index} value={index}>
                {name}
              </MenuItem>
            ))}
          </TextField>
        )}
      </Stack>
    </Box>
  );
}
