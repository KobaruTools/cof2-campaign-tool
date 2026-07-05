'use client';

import CasinoOutlinedIcon from '@mui/icons-material/CasinoOutlined';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { AppAlert } from '@/components/AppAlert';
import { AppTooltip } from '@/components/AppTooltip';
import { InfoHint } from '@/components/InfoHint';
import type { Ancestry, AncestryNames } from '@/data/schema';
import { pickName } from '@/lib/character/names';
import {
  formatHeightRangeCm,
  parseHeightRangeCm,
} from '@/lib/character/height';
import { identityWarnings } from '@/lib/character/identityWarnings';
import type { Identity, Sex } from '@/lib/character/types';

/** Ne conserve que les chiffres et la virgule décimale (âge, taille, poids). */
function digitsOnly(value: string): string {
  return value.replace(/[^0-9,]/g, '');
}

/**
 * Contenu de l'infobulle du champ Nom : conseils « Noms typiques » du peuple
 * choisi, suivis des listes proposées par le livre (par sexe + noms de famille).
 */
function NameHintContent({ names }: { names: AncestryNames }) {
  const lists: Array<[string, string[]]> = [
    ['Masculins', names.male],
    ['Féminins', names.female],
    ['Noms de famille', names.surnames ?? []],
  ];
  return (
    <>
      {names.note}
      {lists
        .filter(([, items]) => items.length > 0)
        .map(([label, items]) => (
          <Typography key={label} variant="body2" sx={{ mt: 1 }}>
            <strong>{label} :</strong> {items.join(', ')}
          </Typography>
        ))}
    </>
  );
}

export interface IdentityFormProps {
  name: string;
  identity: Identity;
  /** Peuple résolu : alimente placeholders, infobulles, générateur et avertissement. */
  ancestry?: Ancestry;
  onName: (name: string) => void;
  /** Reçoit uniquement les champs modifiés (fusion à la charge de l'appelant). */
  onIdentity: (patch: Partial<Identity>) => void;
  /** Affiche le générateur de nom (dé) + l'aide aux noms — wizard uniquement. */
  showNameGenerator?: boolean;
}

/**
 * Formulaire d'identité partagé par le wizard de création (`IdentityStep`) et
 * l'édition de la fiche (`IdentityEditor`). Seul le générateur de nom (dé +
 * aide) diffère, piloté par `showNameGenerator`. Les repères du peuple
 * (placeholders, infobulles d'âge, fourchette de taille) sont affichés dès que
 * `ancestry` est fourni, dans les deux contextes.
 */
export function IdentityForm({
  name,
  identity,
  ancestry,
  onName,
  onIdentity,
  showNameGenerator = false,
}: IdentityFormProps) {
  const physical = ancestry?.physical;
  // Le générateur a besoin du sexe pour choisir la bonne liste de noms.
  const sexChosen = identity.sex != null;
  // Fourchette de taille (en cm) pour le placeholder du champ Taille.
  const heightRange = parseHeightRangeCm(physical?.height);
  // Avertissements d'immersion non bloquants (taille/âge/poids hors repères).
  const warnings = identityWarnings(identity, ancestry);

  return (
    <Stack spacing={2}>
      <TextField
        label="Nom"
        required
        value={name}
        onChange={(e) => onName(e.target.value)}
        fullWidth
        slotProps={{
          input: {
            endAdornment:
              showNameGenerator && ancestry ? (
                <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                  <AppTooltip title={sexChosen ? 'Générer un nom' : 'Choisissez d’abord le sexe'}>
                    <span>
                      <IconButton
                        size="small"
                        aria-label="Générer un nom"
                        disabled={!sexChosen}
                        onClick={() => {
                          const generated = pickName(ancestry, identity.sex);
                          if (generated) onName(generated);
                        }}
                      >
                        <CasinoOutlinedIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </AppTooltip>
                  <InfoHint page={ancestry.names.sourcePage}>
                    <NameHintContent names={ancestry.names} />
                  </InfoHint>
                </Stack>
              ) : undefined,
          },
        }}
      />
      <Grid container spacing={2}>
        <Grid size={{ xs: 6, sm: 3 }}>
          <TextField
            select
            label="Genre"
            value={identity.sex ?? ''}
            onChange={(e) => onIdentity({ sex: (e.target.value || undefined) as Sex | undefined })}
            fullWidth
          >
            <MenuItem value="">—</MenuItem>
            <MenuItem value="male">Homme</MenuItem>
            <MenuItem value="female">Femme</MenuItem>
          </TextField>
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <TextField
            label="Âge"
            value={identity.age ?? ''}
            onChange={(e) => onIdentity({ age: digitsOnly(e.target.value) })}
            placeholder={physical?.startingAge}
            fullWidth
            slotProps={
              physical
                ? {
                    input: {
                      endAdornment: (
                        <InfoHint page={ancestry?.sourcePage}>
                          <>
                            Âge de départ conseillé : <strong>{physical.startingAge}</strong>.
                            <br />
                            Espérance de vie : <strong>{physical.lifeExpectancy}</strong>.
                          </>
                        </InfoHint>
                      ),
                    },
                  }
                : undefined
            }
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <TextField
            label="Taille"
            value={identity.height ?? ''}
            onChange={(e) => onIdentity({ height: digitsOnly(e.target.value) })}
            placeholder={heightRange ? formatHeightRangeCm(heightRange) : physical?.height}
            fullWidth
            slotProps={{
              input: {
                endAdornment: <InputAdornment position="end">cm</InputAdornment>,
              },
            }}
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <TextField
            label="Poids"
            value={identity.weight ?? ''}
            onChange={(e) => onIdentity({ weight: digitsOnly(e.target.value) })}
            placeholder={physical?.weight}
            fullWidth
            slotProps={{
              input: {
                endAdornment: <InputAdornment position="end">kg</InputAdornment>,
              },
            }}
          />
        </Grid>
        {warnings.length > 0 && (
          <Grid size={12}>
            <AppAlert
              severity="warning"
              title={
                warnings.length === 1
                  ? 'Hors du cadre du livre'
                  : `${warnings.length} valeurs hors du cadre du livre`
              }
            >
              <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
                {warnings.map((w) => (
                  <Typography key={w} component="li" variant="body2">
                    {w}
                  </Typography>
                ))}
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                Rien ne l’interdit — à garder en tête pour l’immersion.
              </Typography>
            </AppAlert>
          </Grid>
        )}
      </Grid>
      <TextField
        label="Description"
        multiline
        minRows={6}
        placeholder="Décrivez votre héros : allure, caractère, passé, ce qui le pousse à l'aventure…"
        value={identity.description ?? ''}
        onChange={(e) => onIdentity({ description: e.target.value })}
        fullWidth
      />
    </Stack>
  );
}
