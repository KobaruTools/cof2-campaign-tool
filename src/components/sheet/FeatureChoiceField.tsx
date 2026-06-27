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
import type { AbilityId, FeatureChoice, OptionFeatureChoice } from '@/data/schema';
import { lowestAbilities } from '@/lib/character/ancestry';
import { effectiveAbilities } from '@/lib/character/effects';
import type { Character, FeatureChoiceSelection } from '@/lib/character/types';
import {
  allowedAbilitiesForChoice,
  eligibleFeaturesForChoice,
  featureChoiceDefs,
  getOptionSelections,
  getSelection,
  isChoiceActionable,
  repeatableChoiceCount,
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
  selection: string | null,
  short = false,
): string | null {
  if (selection == null) return null;
  switch (choice.kind) {
    case 'ability':
      return ABILITY_NAMES[selection as keyof typeof ABILITY_NAMES] ?? selection;
    case 'option': {
      const option = choice.options.find((o) => o.id === selection);
      const label = option?.label ?? selection;
      // Forme courte : `shortLabel` explicite si défini (ex. « CON »/« AGI » de Peau de pierre),
      // sinon on coupe au premier complément entre parenthèses.
      return short ? (option?.shortLabel ?? label.replace(/\s*\(.*$/, '')) : label;
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
  selection: string | null,
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
  // Contrôles SIMPLES (ability / option simple / feature-from-path) : la sélection est
  // une chaîne|null. Un choix `option` répétable (géré plus bas) lit ses ids via
  // getOptionSelections — on neutralise donc un éventuel tableau ici.
  const single = typeof selection === 'string' ? selection : null;
  const missing = single == null;

  if (choice.kind === 'ability') {
    const allowed = allowedAbilitiesForChoice(choice);
    const lowest: AbilityId[] = choice.lowestHint ? lowestAbilities(effectiveAbilities(character)) : [];
    const deviates = lowest.length > 0 && !!single && !lowest.includes(single as AbilityId);
    const lowestNames = lowest.map((id) => ABILITY_NAMES[id]);
    const lowestLabel =
      lowestNames.length > 1
        ? `${lowestNames.slice(0, -1).join(', ')} et ${lowestNames[lowestNames.length - 1]}`
        : (lowestNames[0] ?? '');
    const lowestPhrase =
      lowest.length === 1
        ? 'votre caractéristique la plus faible'
        : lowest.length === 2
          ? 'vos deux caractéristiques les plus faibles'
          : 'vos caractéristiques les plus faibles';

    const field = (
      <TextField
        select
        size="small"
        fullWidth
        label={choice.prompt}
        value={single ?? ''}
        error={blocking && missing}
        helperText={
          blocking && missing
            ? 'Choix obligatoire'
            : lowest.length > 0
              ? `Plus faible${lowest.length > 1 ? 's' : ''} : ${lowestLabel}`
              : undefined
        }
        onChange={(e) => onChange(index, e.target.value || null)}
      >
        <MenuItem value="">
          <em>— Non choisi —</em>
        </MenuItem>
        {allowed.map((id) => (
          <MenuItem
            key={id}
            value={id}
            sx={lowest.length > 0
              ? lowest.includes(id)
                ? { fontWeight: 700 }
                : { opacity: 0.35 }
              : undefined}
          >
            {ABILITY_NAMES[id]} ({id})
          </MenuItem>
        ))}
      </TextField>
    );

    if (!choice.lowestHint) return field;
    return (
      <Box>
        {field}
        {deviates && single && (
          <Alert severity="warning" sx={{ mt: 1 }}>
            {ABILITY_NAMES[single as keyof typeof ABILITY_NAMES] ?? single} ne fait pas partie de{' '}
            {lowestPhrase}
            {lowestLabel ? ` (${lowestLabel})` : ''} : vous dérogez à la règle.
          </Alert>
        )}
      </Box>
    );
  }

  // Choix `option` RÉPÉTABLE : plusieurs options distinctes (Autocomplete multiple).
  // Le nombre conseillé dépend de la progression (une par voie au rang requis).
  if (choice.kind === 'option' && choice.repeat) {
    const ids = getOptionSelections(character, featureId, index);
    const allowed = repeatableChoiceCount(character, choice);
    const over = ids.length > allowed;
    const empty = ids.length === 0;
    const help = blocking && empty
      ? 'Choix obligatoire'
      : `${ids.length}/${allowed} retenue(s) — une par voie au rang ${choice.repeat.rank}`;
    return (
      <Autocomplete
        multiple
        disableCloseOnSelect
        size="small"
        options={choice.options.map((o) => o.id)}
        getOptionLabel={(id) => choice.options.find((o) => o.id === id)?.label ?? id}
        value={ids}
        isOptionEqualToValue={(opt, val) => opt === val}
        onChange={(_, value) => onChange(index, value)}
        renderInput={(params) => (
          <TextField
            {...params}
            label={choice.prompt}
            error={(blocking && empty) || over}
            helperText={over ? `${help} (au-delà du nombre conseillé)` : help}
          />
        )}
      />
    );
  }

  if (choice.kind === 'option') {
    return (
      <TextField
        select
        size="small"
        fullWidth
        label={choice.prompt}
        value={single ?? ''}
        error={blocking && missing}
        helperText={blocking && missing ? 'Choix obligatoire' : undefined}
        onChange={(e) => onChange(index, e.target.value || null)}
      >
        <MenuItem value="">
          <em>— Non choisi —</em>
        </MenuItem>
        {choice.options.map((opt) => {
          // Option verrouillée par le niveau (PER-140, ex. montures volantes au niveau 9) :
          // grisée tant que le personnage n'a pas le niveau requis.
          const locked = opt.minLevel != null && character.level < opt.minLevel;
          return (
            <MenuItem key={opt.id} value={opt.id} disabled={locked}>
              {opt.label}
              {locked ? ` — niveau ${opt.minLevel} requis` : ''}
            </MenuItem>
          );
        })}
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
      value={single}
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

/** Style compact partagé des chips de choix (vue colonne, blocs étroits). */
const COMPACT_CHIP_SX = {
  maxWidth: '100%',
  height: 18,
  '& .MuiChip-label': { px: 0.75, fontSize: '0.62rem', fontWeight: 700 },
} as const;

/**
 * Affichage (lecture seule) d'un choix `option` RÉPÉTABLE : un badge par option
 * retenue (nom court ; détail entre parenthèses à côté en vue liste) + un compteur
 * « retenues/autorisées ». « Choix à faire » si rien n'est encore retenu.
 */
function RepeatOptionDisplay({
  choice,
  character,
  featureId,
  index,
  compact,
}: {
  choice: OptionFeatureChoice;
  character: Character;
  featureId: string;
  index: number;
  compact: boolean;
}) {
  const ids = getOptionSelections(character, featureId, index);
  const allowed = repeatableChoiceCount(character, choice);
  const counter = `${ids.length}/${allowed}`;

  if (ids.length === 0) {
    const chip = (
      <Chip
        label="Choix à faire"
        size="small"
        color="warning"
        variant="outlined"
        sx={compact ? COMPACT_CHIP_SX : undefined}
      />
    );
    if (compact) return <Box>{chip}</Box>;
    return (
      <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
          {choice.prompt} ({counter}) :
        </Typography>
        {chip}
      </Stack>
    );
  }

  if (compact) {
    return (
      <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 0.5, alignItems: 'center' }}>
        {ids.map((id) => (
          <Chip
            key={id}
            label={choiceSelectionLabel(choice, id, true)}
            size="small"
            variant="outlined"
            color="primary"
            sx={COMPACT_CHIP_SX}
          />
        ))}
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
          {counter}
        </Typography>
      </Stack>
    );
  }

  return (
    <Box>
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
        {choice.prompt} ({counter}) :
      </Typography>
      <Stack spacing={0.25} sx={{ mt: 0.25 }}>
        {ids.map((id) => {
          const complement = choiceSelectionComplement(choice, id);
          return (
            <Stack key={id} direction="row" spacing={0.75} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
              <Chip
                label={choiceSelectionLabel(choice, id, true)}
                size="small"
                variant="outlined"
                color="primary"
              />
              {complement && (
                <Typography variant="caption" color="text.secondary">
                  {complement}
                </Typography>
              )}
            </Stack>
          );
        })}
      </Stack>
    </Box>
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
  // On ne propose un choix répétable qu'une fois un palier atteint (cf.
  // `isChoiceActionable`) : avant cela il n'y a rien à retenir, on masque le contrôle
  // (et sa puce « Choix à faire ») pour ne pas embrouiller l'utilisateur. On conserve
  // l'index d'origine, clé de `featureChoices` pour lire/écrire la sélection.
  const visible = defs
    .map((choice, index) => ({ choice, index }))
    .filter(({ choice }) => isChoiceActionable(character, choice));
  if (visible.length === 0) return null;

  if (mode === 'display') {
    return (
      <Stack spacing={0.5}>
        {visible.map(({ choice, index: i }) => {
          // Choix `option` RÉPÉTABLE : plusieurs badges (un par option retenue) + compteur.
          if (choice.kind === 'option' && choice.repeat) {
            return (
              <RepeatOptionDisplay
                key={i}
                choice={choice}
                character={character}
                featureId={featureId}
                index={i}
                compact={compact}
              />
            );
          }
          const raw = getSelection(character, featureId, i);
          // Hors choix répétable, la sélection est une chaîne simple ; on la normalise
          // pour les helpers (un éventuel tableau se réduit à sa première valeur).
          const selection = Array.isArray(raw) ? (raw[0] ?? null) : raw;
          // Le chip ne porte que le nom court d'une option (le complément entre
          // parenthèses est sorti à côté). Une capacité empruntée garde, elle, son
          // libellé complet « voie — rang — nom » en mode long (pas de complément).
          const shortInChip = compact || choice.kind === 'option';
          const label = choiceSelectionLabel(choice, selection, shortInChip);
          const complement = compact ? null : choiceSelectionComplement(choice, selection);
          const valueChip = label ? (
            <Chip
              label={label}
              size="small"
              variant="outlined"
              color="primary"
              sx={compact ? COMPACT_CHIP_SX : undefined}
            />
          ) : (
            <Chip
              label="Choix à faire"
              size="small"
              color="warning"
              variant="outlined"
              sx={compact ? COMPACT_CHIP_SX : undefined}
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
      {visible.map(({ choice, index: i }) => (
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
