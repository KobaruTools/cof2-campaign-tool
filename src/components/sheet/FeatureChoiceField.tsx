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
import Autocomplete from '@mui/material/Autocomplete';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { featureById, pathById, testDomains, testDomainById } from '@/data';
import { ABILITY_IDS } from '@/data/schema';
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
  getCustomSkillSelection,
  hasRepeatableOption,
  ineligibleBorrowersForChoice,
  isChoiceActionable,
  repeatableChoiceCount,
  splitRepeatableSelections,
} from '@/lib/character/choices';
import { ABILITY_NAMES } from '@/lib/ui/ability';
import { AppAlert } from '@/components/AppAlert';
import { SourceRef } from '@/components/SourceRef';

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
    case 'custom-skill':
      // La sélection normalisée d'un `custom-skill` est son NOM (1er élément) ; l'affichage
      // détaillé (nom + domaines) est traité par un rendu dédié en mode `display`.
      return selection;
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
          <AppAlert severity="warning" sx={{ mt: 1 }}>
            {ABILITY_NAMES[single as keyof typeof ABILITY_NAMES] ?? single} ne fait pas partie de{' '}
            {lowestPhrase}
            {lowestLabel ? ` (${lowestLabel})` : ''} : vous dérogez à la règle.
          </AppAlert>
        )}
      </Box>
    );
  }

  // Choix `option` RÉPÉTABLE avec une option `repeatable` (ex. Spécialisation, maitre-d-armes-r3) :
  // catégories distinctes (multisélection) + compteur ± pour l'option répétable (« +1 DM »). Chaque
  // unité (catégorie ou instance répétable) consomme le budget partagé `repeat`.
  if (choice.kind === 'option' && choice.repeat && hasRepeatableOption(choice)) {
    const { distinct, repeatCounts, used } = splitRepeatableSelections(character, featureId, index);
    const budget = repeatableChoiceCount(character, choice);
    const remaining = budget - used;
    const distinctOptions = choice.options.filter((o) => !o.repeatable);
    const repeatableOptions = choice.options.filter((o) => o.repeatable);
    const empty = used === 0;
    const over = used > budget;
    // Picks de progression débloqués (ex. Spécialisation prise ET ≥1 voie au rang requis) ⟺
    // budget au-delà de la base. Tant que verrouillé, on n'expose QUE la catégorie de base :
    // ni stepper « +1 DM », ni jargon de jalon (cf. PER-72, choix consolidé sur Armes de prédilection).
    const base = choice.repeat!.base ?? 0;
    const repeatableUnlocked = budget > base;

    const rebuild = (nextDistinct: string[], nextCounts: Record<string, number>) => {
      const arr = [...nextDistinct];
      for (const o of repeatableOptions) {
        for (let k = 0; k < (nextCounts[o.id] ?? 0); k++) arr.push(o.id);
      }
      onChange(index, arr.length ? arr : null);
    };

    return (
      <Stack spacing={1}>
        <Autocomplete
          multiple
          disableCloseOnSelect
          size="small"
          options={distinctOptions.map((o) => o.id)}
          getOptionLabel={(id) => distinctOptions.find((o) => o.id === id)?.label ?? id}
          value={distinct}
          isOptionEqualToValue={(opt, val) => opt === val}
          onChange={(_, value) => rebuild(value, repeatCounts)}
          renderInput={(params) => (
            <TextField
              {...params}
              label={choice.prompt}
              error={(blocking && empty) || over}
              helperText={
                !repeatableUnlocked
                  ? blocking && empty
                    ? 'Choix obligatoire'
                    : 'Catégorie de prédilection de base'
                  : over
                    ? `${used}/${budget} retenue(s) — au-delà du budget (base + 1 par voie au rang ${choice.repeat!.rank})`
                    : `${used}/${budget} retenue(s) — catégorie de base + 1 par voie au rang ${choice.repeat!.rank} ; budget restant : ${Math.max(0, remaining)}`
              }
            />
          )}
        />
        {repeatableUnlocked &&
          repeatableOptions.map((o) => {
            const count = repeatCounts[o.id] ?? 0;
            return (
              <Stack key={o.id} direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <Typography variant="body2" sx={{ flexGrow: 1 }}>
                  {o.label}
                </Typography>
                <Button
                  size="small"
                  variant="outlined"
                  disabled={count <= 0}
                  onClick={() => rebuild(distinct, { ...repeatCounts, [o.id]: count - 1 })}
                  sx={{ minWidth: 32 }}
                >
                  −
                </Button>
                <Typography variant="body2" sx={{ minWidth: 24, textAlign: 'center', fontWeight: 700 }}>
                  ×{count}
                </Typography>
                <Button
                  size="small"
                  variant="outlined"
                  disabled={remaining <= 0}
                  onClick={() => rebuild(distinct, { ...repeatCounts, [o.id]: count + 1 })}
                  sx={{ minWidth: 32 }}
                >
                  +
                </Button>
              </Stack>
            );
          })}
      </Stack>
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

  // custom-skill : gagne-pain LIBRE (PER-73, ex. humain-r1 « Libre ») — un nom libre + `domainCount`
  // domaines de test au choix, HORS combat (`TestDomain.combat`) et mutuellement exclusifs (un domaine
  // retenu dans un slot est grisé dans les autres). Persisté en `[nom, ...domaines]`.
  if (choice.kind === 'custom-skill') {
    const { name, domains: chosen } = getCustomSkillSelection(character, featureId, index);
    // Vecteur positionnel de longueur `domainCount` ('' = slot vide), pour un rendu stable.
    const raw = getSelection(character, featureId, index);
    const arr = Array.isArray(raw) ? raw : [];
    const slots: string[] = [];
    for (let k = 0; k < choice.domainCount; k++) slots.push(typeof arr[k + 1] === 'string' ? arr[k + 1] : '');
    // Domaines proposés : tout le catalogue HORS combat, GROUPÉS par caractéristique gouvernante
    // (en-tête non-sélectionnable, comme le `groupBy` par voie des capacités empruntées). Le tri
    // par (ordre canonique de la 1re carac, libellé du groupe, libellé du domaine) garantit que les
    // domaines d'un même groupe restent consécutifs — sinon MUI répète l'en-tête.
    const domainGroupLabel = (id: string) =>
      (testDomainById.get(id)?.abilities ?? []).map((a) => ABILITY_NAMES[a]).join(' / ') || 'Autres';
    const nonCombatIds = testDomains
      .filter((d) => !d.combat)
      .map((d) => d.id)
      .sort((x, y) => {
        const dx = testDomainById.get(x)!;
        const dy = testDomainById.get(y)!;
        const byAbility = ABILITY_IDS.indexOf(dx.abilities[0]) - ABILITY_IDS.indexOf(dy.abilities[0]);
        if (byAbility !== 0) return byAbility;
        const byGroup = domainGroupLabel(x).localeCompare(domainGroupLabel(y));
        return byGroup !== 0 ? byGroup : dx.label.localeCompare(dy.label);
      });

    const commit = (nextName: string, nextSlots: string[]) => {
      const hasAny = nextName.trim().length > 0 || nextSlots.some((d) => d);
      onChange(index, hasAny ? [nextName, ...nextSlots] : null);
    };

    // Un custom-skill VISIBLE signifie que l'option gouvernante (« Libre ») est retenue : il est dès
    // lors TOUT-OU-RIEN et doit être complété — on signale donc les champs manquants même hors mode
    // `blocking` (fiche permissive comprise), contrairement aux autres choix laissés simplement « à faire ».
    const nameMissing = name.trim().length === 0;
    const domainsMissing = chosen.length < choice.domainCount;

    return (
      <Stack spacing={1}>
        <TextField
          size="small"
          fullWidth
          label={choice.namePrompt}
          value={name}
          error={nameMissing}
          helperText={
            nameMissing ? (
              'Nom obligatoire'
            ) : (
              <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
                Le bonus ne s’applique jamais à des tests de combat <SourceRef page={57} />.
              </Box>
            )
          }
          onChange={(e) => commit(e.target.value, slots)}
        />
        {slots.map((dom, k) => {
          // Domaines retenus dans les AUTRES slots : grisés ici (mutuellement exclusifs).
          const takenElsewhere = new Set(slots.filter((_, j) => j !== k).filter(Boolean));
          const slotMissing = !dom;
          return (
            <Autocomplete
              key={k}
              size="small"
              options={nonCombatIds}
              groupBy={(id) => domainGroupLabel(id)}
              getOptionLabel={(id) => testDomainById.get(id)?.label ?? id}
              getOptionDisabled={(id) => takenElsewhere.has(id)}
              value={dom || null}
              isOptionEqualToValue={(opt, val) => opt === val}
              onChange={(_, value) => {
                const next = [...slots];
                next[k] = value ?? '';
                commit(name, next);
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label={`Domaine amélioré ${k + 1} (+3)`}
                  error={slotMissing}
                  helperText={slotMissing ? 'Choix obligatoire' : undefined}
                />
              )}
            />
          );
        })}
        {!nameMissing && domainsMissing && (
          <AppAlert severity="warning" sx={{ py: 0 }}>
            Choisissez {choice.domainCount} domaines.
          </AppAlert>
        )}
      </Stack>
    );
  }

  // feature-from-path : longue liste de capacités empruntables (Autocomplete).
  // Règle des poupées russes (p. 41) : les capacités elles-mêmes « emprunteuses »
  // (qui permettent de choisir à leur tour une capacité) ne sont pas empruntables
  // — un seul niveau d'emprunt, pas de chaînage. On les laisse VISIBLES mais
  // GRISÉES (non sélectionnables), avec l'explication, plutôt que de les masquer.
  const eligible = eligibleFeaturesForChoice(character, featureId, choice);
  const blocked = ineligibleBorrowersForChoice(character, featureId, choice);
  const blockedIds = new Set(blocked.map((f) => f.id));
  const options = [...eligible, ...blocked]
    .sort((a, b) => a.pathId.localeCompare(b.pathId) || a.rank - b.rank)
    .map((f) => f.id);
  const optionLabel = (id: string): string => {
    const feature = featureById.get(id);
    if (!feature) return id;
    const pathName = pathById.get(feature.pathId)?.name ?? feature.pathId;
    const base = `${pathName} — Rang ${feature.rank} — ${feature.name}${feature.isSpell ? '*' : ''}`;
    // Suffixe explicatif sur les capacités écartées (poupées russes, p. 41).
    return blockedIds.has(id) ? `${base} — emprunte déjà une capacité (non cumulable)` : base;
  };
  return (
    <Autocomplete
      size="small"
      options={options}
      groupBy={(id) => pathById.get(featureById.get(id)?.pathId ?? '')?.name ?? ''}
      getOptionLabel={(id) => optionLabel(id)}
      getOptionDisabled={(id) => blockedIds.has(id)}
      value={single}
      isOptionEqualToValue={(opt, val) => opt === val}
      onChange={(_, value) => onChange(index, value ?? null)}
      renderInput={(params) => (
        <TextField
          {...params}
          label={choice.prompt}
          error={blocking && missing}
          helperText={
            blocking && missing
              ? 'Choix obligatoire'
              : blocked.length > 0 ? (
                  <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
                    Les capacités grisées empruntent elles-mêmes une capacité : non sélectionnables
                    (poupées russes, <SourceRef page={41} />).
                  </Box>
                ) : undefined
          }
        />
      )}
    />
  );
}

/** Style compact partagé des chips de choix (vue colonne, blocs étroits). */
export const COMPACT_CHIP_SX = {
  maxWidth: '100%',
  height: 18,
  '& .MuiChip-label': { px: 0.75, fontSize: '0.62rem', fontWeight: 700 },
} as const;

/**
 * Affichage (lecture seule) d'un choix `option` RÉPÉTABLE : un badge par option DISTINCTE
 * retenue (nom court ; détail entre parenthèses à côté en vue liste), plus un badge « label ×N »
 * par option `repeatable` (ex. « +1 DM ×4 », Spécialisation), + un compteur « consommé/budget ».
 * « Choix à faire » si rien n'est encore retenu.
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
  const { distinct, repeatCounts, used } = splitRepeatableSelections(character, featureId, index);
  const allowed = repeatableChoiceCount(character, choice);
  const counter = `${used}/${allowed}`;
  // Badges : options distinctes (avec complément éventuel) puis options répétables agrégées « ×N ».
  const entries: { key: string; label: string | null; complement: string | null }[] = [
    ...distinct.map((id) => ({
      key: id,
      label: choiceSelectionLabel(choice, id, true),
      complement: compact ? null : choiceSelectionComplement(choice, id),
    })),
    ...choice.options
      .filter((o) => o.repeatable && (repeatCounts[o.id] ?? 0) > 0)
      .map((o) => ({
        key: o.id,
        label: `${choiceSelectionLabel(choice, o.id, true)} ×${repeatCounts[o.id]}`,
        complement: null,
      })),
  ];

  if (entries.length === 0) {
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
        {entries.map((e) => (
          <Chip
            key={e.key}
            label={e.label}
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
        {entries.map((e) => (
          <Stack key={e.key} direction="row" spacing={0.75} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
            <Chip label={e.label} size="small" variant="outlined" color="primary" />
            {e.complement && (
              <Typography variant="caption" color="text.secondary">
                {e.complement}
              </Typography>
            )}
          </Stack>
        ))}
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
    .filter(({ choice }) => isChoiceActionable(character, featureId, choice));
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
          // Choix `custom-skill` (PER-73) : nom du gagne-pain + domaines +3 retenus.
          if (choice.kind === 'custom-skill') {
            const { name, domains } = getCustomSkillSelection(character, featureId, i);
            const complete = name.trim().length > 0 && domains.length >= choice.domainCount;
            const domLabels = domains.map((d) => testDomainById.get(d)?.label ?? d).join(', ');
            const chip = complete ? (
              <Chip
                label={name}
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
            if (compact) return <Box key={i}>{chip}</Box>;
            return (
              <Stack key={i} direction="row" spacing={0.75} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                  {choice.prompt} :
                </Typography>
                {chip}
                {complete && domLabels && (
                  <Typography variant="caption" color="text.secondary">
                    {domLabels}
                  </Typography>
                )}
              </Stack>
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
        <AppAlert severity="info" sx={{ py: 0 }}>
          Choix modifiable librement (fiche permissive).
        </AppAlert>
      )}
    </Stack>
  );
}
