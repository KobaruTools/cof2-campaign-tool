'use client';

/**
 * Sélection des choix portés par une capacité (PER-68), s'appuyant sur le
 * modèle/persistance de PER-66 (`Feature.choices` ↔ `Character.featureChoices`).
 *
 * Un même composant sert le wizard (mode BLOQUANT : seuls les choix légaux,
 * obligatoire) et la fiche (mode PERMISSIF : modifiable en place, vidable, simple
 * avertissement si rien n'est choisi). Le mode `display` n'affiche que le choix
 * retenu, en lecture seule, sous la description (modale / bloc déployé).
 *
 * Les trois natures (`ability` / `feature-from-path` / `option`) sont rendues
 * avec le contrôle adapté : Select court pour une caractéristique, Autocomplete
 * pour la longue liste des capacités empruntables (un rang d'une autre voie), et
 * Select/Radio pour une liste d'options énumérées.
 */
import Alert from '@mui/material/Alert';
import Autocomplete from '@mui/material/Autocomplete';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { featureById, pathById } from '@/data';
import type { FeatureChoice } from '@/data/schema';
import type { Character, FeatureChoiceSelection } from '@/lib/character/types';
import {
  allowedAbilitiesForChoice,
  eligibleFeaturesForChoice,
  featureChoiceDefs,
  getSelection,
} from '@/lib/character/choices';
import { ABILITY_NAMES } from '@/lib/ui/ability';

/**
 * Libellé lisible d'une sélection retenue, selon la nature du choix.
 * `short` produit une forme COMPACTE pour les espaces étroits (chip en vue
 * colonne) : on retire le complément entre parenthèses d'une option (« Nomade
 * (orientation…) » → « Nomade ») et on réduit une capacité empruntée à son seul
 * nom. La forme longue (par défaut) garde le complément, pour la modale / la
 * vue liste.
 */
export function choiceSelectionLabel(
  choice: FeatureChoice,
  selection: FeatureChoiceSelection,
  short = false,
): string | null {
  if (selection == null) return null;
  switch (choice.kind) {
    case 'ability':
      return ABILITY_NAMES[selection as keyof typeof ABILITY_NAMES] ?? selection;
    case 'option': {
      const label = choice.options.find((o) => o.id === selection)?.label ?? selection;
      // Forme courte : on coupe au premier complément entre parenthèses.
      return short ? label.replace(/\s*\(.*$/, '') : label;
    }
    case 'feature-from-path': {
      const feature = featureById.get(selection);
      if (!feature) return selection;
      if (short) return feature.name;
      const pathName = pathById.get(feature.pathId)?.name ?? feature.pathId;
      return `${pathName} — Rang ${feature.rank} — ${feature.name}`;
    }
  }
}

/**
 * Complément d'une sélection à afficher À CÔTÉ du nom court (texte secondaire) :
 * le détail entre parenthèses d'une option (« Nomade (orientation…) » →
 * « orientation… »). `null` pour les autres natures (ou sans parenthèses).
 */
export function choiceSelectionComplement(
  choice: FeatureChoice,
  selection: FeatureChoiceSelection,
): string | null {
  if (selection == null || choice.kind !== 'option') return null;
  const label = choice.options.find((o) => o.id === selection)?.label;
  const match = label?.match(/\(([^)]*)\)/);
  return match ? match[1] : null;
}

/** Un contrôle de sélection pour UN choix d'une capacité. */
function ChoiceControl({
  character,
  featureId,
  choice,
  index,
  blocking,
  onChange,
}: {
  character: Character;
  featureId: string;
  choice: FeatureChoice;
  index: number;
  /** Wizard : obligatoire, signale l'absence de choix par une erreur. */
  blocking: boolean;
  onChange: (index: number, value: FeatureChoiceSelection) => void;
}) {
  const selection = getSelection(character, featureId, index);
  const missing = selection == null;

  if (choice.kind === 'ability') {
    const allowed = allowedAbilitiesForChoice(choice);
    return (
      <TextField
        select
        size="small"
        fullWidth
        label={choice.prompt}
        value={selection ?? ''}
        error={blocking && missing}
        helperText={blocking && missing ? 'Choix obligatoire' : undefined}
        onChange={(e) => onChange(index, e.target.value || null)}
      >
        <MenuItem value="">
          <em>— Non choisi —</em>
        </MenuItem>
        {allowed.map((id) => (
          <MenuItem key={id} value={id}>
            {ABILITY_NAMES[id]} ({id})
          </MenuItem>
        ))}
      </TextField>
    );
  }

  if (choice.kind === 'option') {
    return (
      <TextField
        select
        size="small"
        fullWidth
        label={choice.prompt}
        value={selection ?? ''}
        error={blocking && missing}
        helperText={blocking && missing ? 'Choix obligatoire' : undefined}
        onChange={(e) => onChange(index, e.target.value || null)}
      >
        <MenuItem value="">
          <em>— Non choisi —</em>
        </MenuItem>
        {choice.options.map((opt) => (
          <MenuItem key={opt.id} value={opt.id}>
            {opt.label}
          </MenuItem>
        ))}
      </TextField>
    );
  }

  // feature-from-path : longue liste de capacités empruntables (Autocomplete).
  const eligible = eligibleFeaturesForChoice(character, featureId, choice);
  const optionLabel = (id: string): string => {
    const feature = featureById.get(id);
    if (!feature) return id;
    const pathName = pathById.get(feature.pathId)?.name ?? feature.pathId;
    return `${pathName} — Rang ${feature.rank} — ${feature.name}${feature.isSpell ? '*' : ''}`;
  };
  return (
    <Autocomplete
      size="small"
      options={eligible.map((f) => f.id)}
      groupBy={(id) => pathById.get(featureById.get(id)?.pathId ?? '')?.name ?? ''}
      getOptionLabel={(id) => optionLabel(id)}
      value={selection}
      isOptionEqualToValue={(opt, val) => opt === val}
      onChange={(_, value) => onChange(index, value ?? null)}
      renderInput={(params) => (
        <TextField
          {...params}
          label={choice.prompt}
          error={blocking && missing}
          helperText={blocking && missing ? 'Choix obligatoire' : undefined}
        />
      )}
    />
  );
}

export interface FeatureChoiceFieldProps {
  character: Character;
  featureId: string;
  /**
   * `edit` : sélection éditable (fiche permissive / wizard) ; `display` :
   * lecture seule (sous la description). Défaut `display`.
   */
  mode?: 'edit' | 'display';
  /** Wizard : rend les choix obligatoires (erreur si non faits). */
  blocking?: boolean;
  /**
   * Affichage compact (mode `display` uniquement) : omet l'invite, ne montre que
   * la valeur retenue (ou « Choix à faire »). Pour les blocs étroits (vue colonne).
   */
  compact?: boolean;
  /** Requis en mode `edit`. Persiste le i-ème choix de la capacité. */
  onChange?: (featureId: string, index: number, value: FeatureChoiceSelection) => void;
}

/**
 * Rend tous les choix d'une capacité. En mode `display`, n'affiche rien si la
 * capacité ne porte aucun choix (le composant peut être posé sans condition).
 */
export function FeatureChoiceField({
  character,
  featureId,
  mode = 'display',
  blocking = false,
  compact = false,
  onChange,
}: FeatureChoiceFieldProps) {
  const defs = featureChoiceDefs(featureId);
  if (defs.length === 0) return null;

  if (mode === 'display') {
    return (
      <Stack spacing={0.5}>
        {defs.map((choice, i) => {
          const selection = getSelection(character, featureId, i);
          // Le chip ne porte que le nom court d'une option (le complément entre
          // parenthèses est sorti à côté). Une capacité empruntée garde, elle, son
          // libellé complet « voie — rang — nom » en mode long (pas de complément).
          const shortInChip = compact || choice.kind === 'option';
          const label = choiceSelectionLabel(choice, selection, shortInChip);
          const complement = compact ? null : choiceSelectionComplement(choice, selection);
          const compactChipSx = {
            maxWidth: '100%',
            height: 18,
            '& .MuiChip-label': { px: 0.75, fontSize: '0.62rem', fontWeight: 700 },
          };
          const valueChip = label ? (
            <Chip
              label={label}
              size="small"
              variant="outlined"
              color="primary"
              sx={compact ? compactChipSx : undefined}
            />
          ) : (
            <Chip
              label="Choix à faire"
              size="small"
              color="warning"
              variant="outlined"
              sx={compact ? compactChipSx : undefined}
            />
          );
          if (compact) return <Box key={i}>{valueChip}</Box>;
          return (
            <Stack key={i} direction="row" spacing={0.75} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                {choice.prompt} :
              </Typography>
              {valueChip}
              {complement && (
                <Typography variant="caption" color="text.secondary">
                  {complement}
                </Typography>
              )}
            </Stack>
          );
        })}
      </Stack>
    );
  }

  return (
    <Stack spacing={1.5}>
      {defs.map((choice, i) => (
        <ChoiceControl
          key={i}
          character={character}
          featureId={featureId}
          choice={choice}
          index={i}
          blocking={blocking}
          onChange={(index, value) => onChange?.(featureId, index, value)}
        />
      ))}
      {!blocking && (
        <Alert severity="info" sx={{ py: 0 }}>
          Choix modifiable librement (fiche permissive).
        </Alert>
      )}
    </Stack>
  );
}
