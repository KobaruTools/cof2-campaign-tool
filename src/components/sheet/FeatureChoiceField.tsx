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
import type { MouseEvent, ReactNode } from 'react';
import Autocomplete from '@mui/material/Autocomplete';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import { equipmentById, featureById, pathById, testDomains, testDomainById } from '@/data';
import { ABILITY_IDS } from '@/data/schema';
import type { AbilityId, FeatureChoice, OptionFeatureChoice } from '@/data/schema';
import { highestAbilities, lowestAbilities } from '@/lib/character/ancestry';
import { effectiveAbilities, pathRanksFromFeatures, testDomainSourceFeatureIds } from '@/lib/character/effects';
import { CapabilityChip } from '@/components/sheet/FeatureRichText';
import { creatureLinkAccess } from '@/lib/ui/lockedContentAccess';
import { useBestiaryStore } from '@/stores/bestiary';
import { PageRefText } from '@/components/SourceRef';
import type { Character, FeatureChoiceSelection } from '@/lib/character/types';
import {
  allowedAbilitiesForChoice,
  eligibleFeaturesForChoice,
  expertPathReuseWarning,
  featureChoiceDefs,
  getOptionSelections,
  getSelection,
  getCustomSkillSelection,
  hasRepeatableOption,
  ineligibleBorrowersForChoice,
  isChoiceActionable,
  knownFeaturesForChoice,
  repeatableChoiceCount,
  splitRepeatableSelections,
  unmadeChoiceIndexes,
} from '@/lib/character/choices';
import { ABILITY_NAMES } from '@/lib/ui/ability';
import { AppAlert } from '@/components/AppAlert';
import { AppTooltip } from '@/components/AppTooltip';
import { SourceRef } from '@/components/SourceRef';
import { featureCodexHref } from '@/lib/ui/codex';
import { FeaturePathAutocomplete } from '@/components/sheet/FeaturePathAutocomplete';
import { ownedWeaponsForChoice } from '@/lib/character/boundWeapon';

/**
 * Libellé lisible d'une sélection retenue, selon la nature du choix.
 * `short` produit une forme COMPACTE pour les espaces étroits (chip en vue
 * colonne) : on retire le complément entre parenthèses d'une option (« Nomade
 * (orientation…) » → « Nomade ») et on réduit une capacité empruntée à son seul
 * nom. La forme longue (par défaut) garde le complément, pour la modale / la
 * vue liste.
 */
/**
 * Choix `option` dont TOUTES les options sont acquises d'office au rang de voie atteint
 * (PER-74, Héros célèbre r6 : « À partir du rang 8, vous êtes à la fois le héros du peuple ET
 * celui du royaume »). Vrai quand la capacité porte `allOptionsAtPathRank` et que le personnage
 * a atteint ce rang dans la VOIE de la capacité. Purement narratif → ne pilote qu'un affichage.
 */
function allOptionsUnlocked(character: Character, featureId: string, choice: FeatureChoice): boolean {
  if (choice.kind !== 'option' || choice.allOptionsAtPathRank == null) return false;
  const pathId = featureById.get(featureId)?.pathId;
  if (!pathId) return false;
  return (pathRanksFromFeatures(character.featureIds)[pathId] ?? 0) >= choice.allOptionsAtPathRank;
}

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
    case 'feature-from-path':
    case 'known-feature': {
      const feature = featureById.get(selection);
      if (!feature) return selection;
      if (short) return feature.name;
      const pathName = pathById.get(feature.pathId)?.name ?? feature.pathId;
      return `${pathName} — Rang ${feature.rank} — ${feature.name}`;
    }
    case 'test-domain':
      // Sélection = id d'un domaine de test (compétence) ; on affiche son libellé français.
      return testDomainById.get(selection)?.label ?? selection;
    case 'owned-weapon': {
      // Sélection = `itemId` d'une arme possédée, ou `custom:<nom>` pour un objet libre (PER-74,
      // arme liée). On affiche le nom du catalogue, à défaut la valeur brute.
      if (selection.startsWith('custom:')) return selection.slice('custom:'.length);
      const item = equipmentById.get(selection);
      return item?.category === 'weapon' ? item.name : selection;
    }
    case 'custom-skill':
      // La sélection normalisée d'un `custom-skill` est son NOM (1er élément) ; l'affichage
      // détaillé (nom + domaines) est traité par un rendu dédié en mode `display`.
      return selection;
    case 'free-text':
      // Texte libre narratif (PER-175) : la sélection EST le texte saisi.
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
  // Liste bestiaire (RLS-filtrée) pour les options gatées par un contenu payant du Bestiaire
  // (`requiresBestiaryCreatureSlug`, PER-439) — un seul hook, peu importe si CE choix en a besoin.
  const bestiaryList = useBestiaryStore((s) => s.list);
  // Contrôles SIMPLES (ability / option simple / feature-from-path) : la sélection est
  // une chaîne|null. Un choix `option` répétable (géré plus bas) lit ses ids via
  // getOptionSelections — on neutralise donc un éventuel tableau ici.
  const single = typeof selection === 'string' ? selection : null;
  const missing = single == null;

  if (choice.kind === 'ability') {
    const allowed = allowedAbilitiesForChoice(choice);
    // Indices « plus faible » (lowestHint) OU « plus haute » (highestHint, PER-74 r6) : mêmes
    // mécaniques de pré-signalement (gras) + avertissement de dérogation, sur l'extrémité opposée.
    const hinted: AbilityId[] = choice.lowestHint
      ? lowestAbilities(effectiveAbilities(character))
      : choice.highestHint
        ? highestAbilities(effectiveAbilities(character))
        : [];
    const isHint = choice.lowestHint || choice.highestHint;
    const deviates = hinted.length > 0 && !!single && !hinted.includes(single as AbilityId);
    const hintedNames = hinted.map((id) => ABILITY_NAMES[id]);
    const hintedLabel =
      hintedNames.length > 1
        ? `${hintedNames.slice(0, -1).join(', ')} et ${hintedNames[hintedNames.length - 1]}`
        : (hintedNames[0] ?? '');
    const extreme = choice.highestHint ? 'haute' : 'faible';
    const hintedPhrase =
      hinted.length === 1
        ? `votre caractéristique la plus ${extreme}`
        : hinted.length === 2 && choice.lowestHint
          ? 'vos deux caractéristiques les plus faibles'
          : `vos caractéristiques les plus ${extreme}s`;

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
            : hinted.length > 0
              ? `Plus ${extreme}${hinted.length > 1 ? 's' : ''} : ${hintedLabel}`
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
            sx={hinted.length > 0
              ? hinted.includes(id)
                ? { fontWeight: 700 }
                : { opacity: 0.35 }
              : undefined}
          >
            {ABILITY_NAMES[id]} ({id})
          </MenuItem>
        ))}
      </TextField>
    );

    if (!isHint) return field;
    return (
      <Box>
        {field}
        {deviates && single && (
          <AppAlert severity="warning" sx={{ mt: 1 }}>
            {ABILITY_NAMES[single as keyof typeof ABILITY_NAMES] ?? single} ne fait pas partie de{' '}
            {hintedPhrase}
            {hintedLabel ? ` (${hintedLabel})` : ''} : vous dérogez à la règle.
          </AppAlert>
        )}
      </Box>
    );
  }

  // Choix `option` RÉPÉTABLE avec une option `repeatable` (ex. Spécialisation, maitre-d-armes-r3) :
  // catégories distinctes (multisélection) + compteur ± pour l'option répétable (« +1 DM »). Chaque
  // unité (catégorie ou instance répétable) consomme le budget partagé `repeat`.
  if (choice.kind === 'option' && choice.repeat?.by === 'paths-at-rank' && hasRepeatableOption(choice)) {
    const repeat = choice.repeat;
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
    const base = repeat.base ?? 0;
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
                    ? `${used}/${budget} retenue(s) — au-delà du budget (base + 1 par voie au rang ${repeat.rank})`
                    : `${used}/${budget} retenue(s) — catégorie de base + 1 par voie au rang ${repeat.rank} ; budget restant : ${Math.max(0, remaining)}`
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
    const repeatHint =
      choice.repeat.by === 'path-rank'
        ? `une par rang atteint (dès le rang ${choice.repeat.fromRank})`
        : `une par voie au rang ${choice.repeat.rank}`;
    const help = blocking && empty
      ? 'Choix obligatoire'
      : `${ids.length}/${allowed} retenue(s) — ${repeatHint}`;
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
    // Toutes les options acquises d'office au rang de voie atteint (Héros célèbre r6 au rang 8) :
    // le choix n'est plus dû (pas d'erreur), on rappelle que les deux milieux sont acquis. Le
    // sélecteur reste éditable comme trace de la décision prise au rang d'obtention.
    const bothUnlocked = allOptionsUnlocked(character, featureId, choice);
    return (
      <Box>
        <TextField
          select
          size="small"
          fullWidth
          label={choice.prompt}
          value={single ?? ''}
          error={blocking && missing && !bothUnlocked}
          helperText={blocking && missing && !bothUnlocked ? 'Choix obligatoire' : undefined}
          onChange={(e) => onChange(index, e.target.value || null)}
        >
          <MenuItem value="">
            <em>— Non choisi —</em>
          </MenuItem>
          {choice.options.map((opt) => {
            // Option verrouillée par le niveau (PER-140, ex. montures volantes au niveau 9) :
            // grisée tant que le personnage n'a pas le niveau requis.
            const levelLocked = opt.minLevel != null && character.level < opt.minLevel;
            // Option verrouillée par un contenu payant (PER-439, ex. Carnifurax/Pestif/Karcaillou,
            // familiers fantastiques supplémentaires du Bestiaire) : grisée tant que la créature
            // référencée n'apparaît pas dans la liste bestiaire du compte (RLS, `creatureLinkAccess`).
            const paidLocked =
              !!opt.requiresBestiaryCreatureSlug &&
              creatureLinkAccess(bestiaryList, opt.requiresBestiaryCreatureSlug) !== 'accessible';
            const locked = levelLocked || paidLocked;
            const lockedSuffix = levelLocked
              ? ` — niveau ${opt.minLevel} requis`
              : paidLocked
                ? ' — Bestiaire (contenu payant) requis'
                : '';
            return (
              <MenuItem key={opt.id} value={opt.id} disabled={locked}>
                {opt.label}
                {lockedSuffix}
              </MenuItem>
            );
          })}
        </TextField>
        {/* Précision sur la PORTÉE du choix (`FeatureChoiceBase.note`) : ce qu'il engage au-delà de
            son libellé — ex. la couleur du drake, qui décline toute la voie du chevalier dragon. */}
        {choice.note && (
          <AppAlert severity="info" sx={{ mt: 1, py: 0 }}>
            <PageRefText>{choice.note}</PageRefText>
          </AppAlert>
        )}
        {bothUnlocked && (
          <AppAlert severity="info" sx={{ mt: 1, py: 0 }}>
            Au rang {choice.allOptionsAtPathRank}, toutes les options sont acquises :{' '}
            {choice.options.map((o) => o.label).join(' et ')}.
          </AppAlert>
        )}
      </Box>
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

  // free-text : saisie libre purement narrative (PER-175, ex. type d'animal d'un familier
  // fantastique). Optionnel (aucune erreur si vide) ; l'avertissement `note` (décision RP à
  // convenir avec le MJ) s'affiche sous le champ.
  if (choice.kind === 'free-text') {
    return (
      <Box>
        <TextField
          size="small"
          fullWidth
          label={choice.prompt}
          placeholder={choice.placeholder}
          value={single ?? ''}
          onChange={(e) => onChange(index, e.target.value.length ? e.target.value : null)}
        />
        {choice.note && (
          <AppAlert severity="info" sx={{ mt: 1, py: 0 }}>
            <PageRefText>{choice.note}</PageRefText>
          </AppAlert>
        )}
      </Box>
    );
  }

  // test-domain : choisir une COMPÉTENCE dans le catalogue exhaustif (PER-74, Expertise r4, +5).
  // Descriptif (le +5 n'est pas calculé). Liste groupée par caractéristique gouvernante, comme le
  // gagne-pain libre (`custom-skill`) ; domaines de combat exclus sauf `includeCombat`.
  if (choice.kind === 'test-domain') {
    const domainGroupLabel = (id: string) =>
      (testDomainById.get(id)?.abilities ?? []).map((a) => ABILITY_NAMES[a]).join(' / ') || 'Autres';
    const domainIds = testDomains
      .filter((d) => choice.includeCombat || !d.combat)
      .map((d) => d.id)
      .sort((x, y) => {
        const dx = testDomainById.get(x)!;
        const dy = testDomainById.get(y)!;
        const byAbility = ABILITY_IDS.indexOf(dx.abilities[0]) - ABILITY_IDS.indexOf(dy.abilities[0]);
        if (byAbility !== 0) return byAbility;
        const byGroup = domainGroupLabel(x).localeCompare(domainGroupLabel(y));
        return byGroup !== 0 ? byGroup : dx.label.localeCompare(dy.label);
      });
    // Compétences « acquises par une capacité » (périmètre légal du +5) : les AUTRES restent
    // proposées mais GRISÉES et déclenchent un avertissement si retenues (fiche permissive). Pour
    // chaque compétence disponible, une puce au NOM de la capacité source (CapabilityChip) à droite.
    const sourcesByDomain = testDomainSourceFeatureIds(character);
    const offScope = !!single && !sourcesByDomain.has(single);
    return (
      <Box>
        <Autocomplete
          size="small"
          options={domainIds}
          groupBy={(id) => domainGroupLabel(id)}
          getOptionLabel={(id) => testDomainById.get(id)?.label ?? id}
          value={single}
          isOptionEqualToValue={(opt, val) => opt === val}
          onChange={(_, value) => onChange(index, value ?? null)}
          renderOption={(props, id) => {
            const sourceId = sourcesByDomain.get(id)?.[0];
            return (
              <li {...props} style={{ ...props.style, opacity: sourceId ? 1 : 0.45 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, width: '100%' }}>
                  <Box component="span">{testDomainById.get(id)?.label ?? id}</Box>
                  {sourceId && <CapabilityChip featureId={sourceId} label={null} />}
                </Box>
              </li>
            );
          }}
          renderInput={(params) => (
            <TextField
              {...params}
              label={choice.prompt}
              error={blocking && missing}
              helperText={
                blocking && missing
                  ? 'Choix obligatoire'
                  : 'Compétences grisées = non acquises par une capacité. Le +5 s’applique à la table.'
              }
            />
          )}
        />
        {offScope && (
          <AppAlert severity="warning" sx={{ mt: 1 }}>
            {testDomainById.get(single)?.label ?? single} n’est pas identifiée comme acquise par une
            capacité : vous dérogez à la règle (« +5 sur une compétence acquise par une capacité »,{' '}
            <SourceRef page={129} />).
          </AppAlert>
        )}
      </Box>
    );
  }

  // known-feature : DÉSIGNE une capacité DÉJÀ POSSÉDÉE (PER-74, voie du spécialiste) — pointeur
  // descriptif, sans mécaniser la modification (verbatim). Même contrôle groupé par voie que
  // l'emprunt, mais alimenté par `knownFeaturesForChoice` (capacités acquises actionnables).
  if (choice.kind === 'known-feature') {
    const known = knownFeaturesForChoice(character, featureId, choice);
    return (
      <FeaturePathAutocomplete
        label={choice.prompt}
        options={known.map((f) => f.id)}
        value={single}
        onChange={(id) => onChange(index, id)}
        error={blocking && missing}
        helperText={
          blocking && missing
            ? 'Choix obligatoire'
            : 'La modification s’applique à la table (non calculée sur la fiche).'
        }
      />
    );
  }

  // owned-weapon : l'ARME LIÉE (PER-74, voie de l'arme liée p. 147). Le domaine n'est pas un
  // catalogue mais l'INVENTAIRE du personnage — d'où un simple Select des armes possédées. Une
  // puce signale ensuite l'arme retenue sur sa ligne d'inventaire.
  if (choice.kind === 'owned-weapon') {
    const owned = ownedWeaponsForChoice(character);
    return (
      <TextField
        select
        size="small"
        fullWidth
        label={choice.prompt}
        value={owned.some((o) => o.value === single) ? single : ''}
        onChange={(e) => onChange(index, e.target.value || null)}
        error={blocking && missing}
        helperText={
          owned.length === 0
            ? 'Aucune arme dans l’équipement : ajoutez-en une pour pouvoir vous y lier.'
            : blocking && missing
              ? 'Choix obligatoire'
              : 'Seule cette arme bénéficie des capacités de la voie.'
        }
      >
        <MenuItem value="">
          <em>Aucune</em>
        </MenuItem>
        {owned.map((o) => (
          <MenuItem key={o.value} value={o.value}>
            {o.label}
          </MenuItem>
        ))}
      </TextField>
    );
  }

  // feature-from-path : longue liste de capacités empruntables, groupée par voie
  // (couleur + icône de profil) via le composant unifié `FeaturePathAutocomplete`.
  // Règle des poupées russes (p. 41) : les capacités elles-mêmes « emprunteuses »
  // (qui permettent de choisir à leur tour une capacité) ne sont pas empruntables
  // — un seul niveau d'emprunt, pas de chaînage. On les laisse VISIBLES mais
  // GRISÉES (non sélectionnables), avec l'explication, plutôt que de les masquer.
  const eligible = eligibleFeaturesForChoice(character, featureId, choice);
  const blocked = ineligibleBorrowersForChoice(character, featureId, choice);
  const blockedIds = new Set(blocked.map((f) => f.id));
  const options = [...eligible, ...blocked].map((f) => f.id);
  // `choice.includeOwned` (archimage r5) : les capacités DÉJÀ possédées entrent aussi dans le domaine —
  // suffixe pour ne pas laisser croire à un doublon (on retrouve le sort d'une voie déjà acquise).
  const ownedIds = choice.includeOwned ? new Set(character.featureIds) : null;
  // Avertissement NON BLOQUANT de la voie de l'expert (p. 129) : la capacité retenue vient d'une
  // voie déjà utilisée par un autre rang expert (règle « une voie différente par capacité »).
  const reusedPathName = expertPathReuseWarning(character, featureId, single);
  // Domaine étendu à plusieurs profils (`familyScope`/plusieurs `classIds`, ex. archimage r5 « famille
  // des mages ») : retour proprio (2026-08-10) — un groupement PAR VOIE mélange alphabétiquement les
  // voies de profils différents (ex. Voie de l'air d'ensorceleur puis Voie des artefacts de forgesort),
  // illisible sur une liste aussi longue. Méta-groupement PAR PROFIL (replié par défaut, même patron
  // que `AddFeatureField`, catalogue gigantesque) dès que le domaine touche ≥ 2 profils.
  const spansMultipleProfiles =
    new Set(
      [...eligible, ...blocked].map((f) => {
        const path = pathById.get(f.pathId);
        return path?.type === 'class' ? path.classIds[0] : f.pathId;
      }),
    ).size > 1;
  return (
    <Box>
      <FeaturePathAutocomplete
        label={choice.prompt}
        options={options}
        value={single}
        onChange={(id) => onChange(index, id)}
        groupMode={spansMultipleProfiles ? 'profile' : 'path'}
        disabledIds={blockedIds}
        optionSuffix={(id) =>
          blockedIds.has(id)
            ? ' — emprunte déjà une capacité (non cumulable)'
            : ownedIds?.has(id)
              ? ' — déjà connu'
              : undefined
        }
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
      {reusedPathName && (
        <AppAlert severity="warning" sx={{ mt: 1 }}>
          La voie « {reusedPathName} » est déjà utilisée par un autre rang de la voie de l’expert :
          chaque capacité choisie doit provenir d’une voie différente de la même famille (
          <SourceRef page={129} />).
        </AppAlert>
      )}
    </Box>
  );
}

/**
 * Badge « valeur retenue » (custom, ≠ `Chip` MUI — convention projet, cf. `DefenseBadge`
 * et `ChoiceTodoBadge`) : bleu primaire, pendant du badge orange « Choisir ».
 *
 * Raison d'être : un `Chip` MUI garde son libellé sur UNE ligne (`nowrap` + ellipse), ce
 * qui déformait les blocs étroits de la vue colonne dès qu'un choix était long (« Cheval
 * de guerre lourd », capacité empruntée « voie — rang — nom »…). Ici le libellé revient à
 * la ligne (`whiteSpace: normal`) et peut casser un mot interminable — `overflowWrap:
 * anywhere` (et non `break-word`) car lui seul compte dans la largeur *min-content* : la
 * largeur minimale du badge tombe à un caractère, donc il ne peut JAMAIS élargir son bloc.
 * Hauteur libre (`minHeight`) pour laisser le badge grandir sur deux lignes ou plus.
 */
export function ChoiceValueBadge({
  label,
  compact = false,
  onClick,
  title,
}: {
  label: ReactNode;
  /** Vue colonne / blocs étroits : typo et gabarit resserrés. */
  compact?: boolean;
  /** Rend le badge cliquable (ouvre l'éditeur du choix). */
  onClick?: () => void;
  /** Infobulle facultative (ex. nom complet d'une caractéristique abrégée, ou texte + `SourceRef`). */
  title?: ReactNode;
}) {
  const interactive = !!onClick;
  const badge = (
    <Box
      component={interactive ? 'button' : 'span'}
      {...(interactive ? { type: 'button' as const } : {})}
      onClick={
        interactive
          ? (e: MouseEvent) => {
              e.stopPropagation();
              onClick();
            }
          : undefined
      }
      sx={(theme) => ({
        display: 'inline-flex',
        alignItems: 'center',
        textAlign: 'left',
        minWidth: 0,
        maxWidth: '100%',
        minHeight: compact ? 18 : 24,
        px: compact ? 0.75 : 1,
        py: compact ? '1px' : '2px',
        m: 0,
        borderRadius: 1,
        fontFamily: 'inherit',
        fontSize: compact ? '0.62rem' : '0.72rem',
        fontWeight: 700,
        lineHeight: 1.3,
        letterSpacing: '0.02em',
        whiteSpace: 'normal',
        overflowWrap: 'anywhere',
        color: theme.palette.primary.main,
        bgcolor: alpha(theme.palette.primary.main, 0.12),
        border: `1px solid ${alpha(theme.palette.primary.main, 0.5)}`,
        cursor: interactive ? 'pointer' : 'default',
        transition: 'background-color 120ms, border-color 120ms',
        ...(interactive && {
          '&:hover': {
            bgcolor: alpha(theme.palette.primary.main, 0.22),
            borderColor: theme.palette.primary.main,
          },
        }),
      })}
    >
      {label}
    </Box>
  );
  return title ? <AppTooltip title={title}>{badge}</AppTooltip> : badge;
}

/**
 * Badge « choix non résolu » (custom, ≠ Chip MUI, dans l'esprit de `DefenseBadge`) :
 * orange, mot unique « Choisir », avec un léger halo qui pulse toutes les 2 s pour
 * attirer l'œil sur la décision à prendre. Quand `onClick` est fourni il devient
 * cliquable et ouvre directement l'éditeur du choix — il remplace ainsi l'ancien
 * crayon accolé qui alourdissait/déformait la carte compacte (PER-68).
 */
export function ChoiceTodoBadge({
  compact = false,
  onClick,
  label = 'Choisir',
}: {
  compact?: boolean;
  onClick?: () => void;
  /** Libellé du badge (défaut « Choisir » — cas d'usage hors choix de rang, ex. activation de cristaux). */
  label?: string;
}) {
  const interactive = !!onClick;
  return (
    <AppTooltip title={interactive ? 'Choix à faire — cliquer pour choisir' : 'Choix à faire'}>
      <Box
        component={interactive ? 'button' : 'span'}
        {...(interactive ? { type: 'button' as const } : {})}
        onClick={
          interactive
            ? (e: MouseEvent) => {
                e.stopPropagation();
                onClick();
              }
            : undefined
        }
        sx={(theme) => ({
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: compact ? 18 : 24,
          px: compact ? 0.75 : 1,
          m: 0,
          borderRadius: 1,
          fontFamily: 'inherit',
          fontSize: compact ? '0.62rem' : '0.72rem',
          fontWeight: 700,
          lineHeight: 1,
          letterSpacing: '0.02em',
          whiteSpace: 'nowrap',
          color: theme.palette.warning.main,
          bgcolor: alpha(theme.palette.warning.main, 0.12),
          border: `1px solid ${alpha(theme.palette.warning.main, 0.5)}`,
          cursor: interactive ? 'pointer' : 'default',
          transition: 'background-color 120ms, border-color 120ms',
          transformOrigin: 'center',
          // Halo qui pulse (toutes les 2 s) : anneau orange assez marqué qui s'étend puis
          // s'estompe, accompagné d'un léger battement d'échelle pour bien capter l'œil.
          animation: 'choiceTodoPulse 2s ease-in-out infinite',
          '@keyframes choiceTodoPulse': {
            '0%': { boxShadow: `0 0 0 0 ${alpha(theme.palette.warning.main, 0.55)}`, transform: 'scale(1)' },
            '55%': { boxShadow: `0 0 0 8px ${alpha(theme.palette.warning.main, 0)}`, transform: 'scale(1.06)' },
            '100%': { boxShadow: `0 0 0 0 ${alpha(theme.palette.warning.main, 0)}`, transform: 'scale(1)' },
          },
          // Respecte la préférence système « animations réduites ».
          '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
          ...(interactive && {
            '&:hover': {
              bgcolor: alpha(theme.palette.warning.main, 0.22),
              borderColor: theme.palette.warning.main,
            },
          }),
        })}
      >
        {label}
      </Box>
    </AppTooltip>
  );
}

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
  onEdit,
  onEditValue,
}: {
  choice: OptionFeatureChoice;
  character: Character;
  featureId: string;
  index: number;
  compact: boolean;
  /** Rend la puce « Choisir » cliquable → ouvre l'éditeur du choix (même hors édition). */
  onEdit?: () => void;
  /** Rend les badges de VALEUR cliquables → mode édition uniquement (cf. `editing`). */
  onEditValue?: () => void;
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

  // Rappel visuel (retour propriétaire 2026-08-19) : les MAMMIFÈRES sont communiqués ET
  // transformables (Forme animale) d'office au rang 1 (RAW p. 114), jamais une option de CE choix
  // (qui ne porte que sur la catégorie SUPPLÉMENTAIRE du rang 4) — d'où l'absence déroutante d'un
  // « Mammifères » à côté d'« Oiseaux ». Puce non interactive (pas d'`onClick`, cf. `ChoiceValueBadge`)
  // en TÊTE de liste, hors du compteur qui ne porte que sur les catégories réellement choisies.
  // Uniquement sur `animaux-r1` (Langage des animaux) : la voie de prestige du changeforme
  // (`prestige-changeforme-r5`) n'accorde PAS ce bonus gratuit à un personnage sans druide natif
  // (`animalForms.ts`, `knownAnimalFormCategoryIds`).
  const languageFeature = featureId === 'animaux-r1' ? featureById.get('animaux-r1') : undefined;
  const innateMammals = languageFeature ? (
    <ChoiceValueBadge
      key="mammals-innate"
      label="Mammifères"
      compact={compact}
      title={
        <>
          Communication et Forme animale offertes d'office au rang 1 — pas un choix.{' '}
          <SourceRef page={languageFeature.sourcePage} term={languageFeature.name} codexHref={featureCodexHref(languageFeature)} />
        </>
      }
    />
  ) : null;

  if (entries.length === 0) {
    const badge = <ChoiceTodoBadge compact={compact} onClick={onEdit} />;
    if (compact)
      return (
        <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 0.5, alignItems: 'center' }}>
          {innateMammals}
          {badge}
        </Stack>
      );
    return (
      <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
          {choice.prompt} ({counter}) :
        </Typography>
        {innateMammals}
        {badge}
      </Stack>
    );
  }

  if (compact) {
    return (
      <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 0.5, alignItems: 'center' }}>
        {innateMammals}
        {entries.map((e) => (
          <ChoiceValueBadge key={e.key} label={e.label} compact onClick={onEditValue} />
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
        {innateMammals && (
          <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
            {innateMammals}
          </Stack>
        )}
        {entries.map((e) => (
          <Stack key={e.key} direction="row" spacing={0.75} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
            <ChoiceValueBadge label={e.label} onClick={onEditValue} />
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
  /**
   * Mode `display` uniquement : ouvre l'éditeur du choix. Remplace le crayon accolé sur
   * la carte compacte (PER-68). Absent : puces en lecture seule.
   *
   * La puce orange « Choisir » l'appelle TOUJOURS (même hors mode édition : un choix de
   * construction non fait doit rester joignable d'un clic — l'appelant se charge de
   * basculer en édition si besoin). Le badge bleu de la valeur retenue, lui, n'est
   * cliquable qu'en mode édition (`editing`) : hors édition la fiche se consulte.
   */
  onEditRequest?: () => void;
  /**
   * Mode édition actif : rend AUSSI les badges de valeur retenue cliquables (avec
   * `onEditRequest`). Défaut : faux — seule la puce « Choisir » réagit.
   */
  editing?: boolean;
  /**
   * Mode `display` uniquement : ne rend QUE les choix encore « à faire » (`unmadeChoiceIndexes`),
   * masque les choix déjà résolus (PER-74, Bâton magique, retour proprio 2026-08-10). Sert la
   * « bande de l'hôte » d'une carte d'emprunt à PLUSIEURS choix : le 1er choix résolu (« Malédiction »)
   * est déjà affiché par la carte de devant empruntée — inutile de le répéter ici, seule la puce
   * « Choisir » d'un 2e slot pas encore fait doit apparaître, sous le nom de l'HÔTE. Défaut : faux
   * (tous les choix actionnables sont rendus, comportement historique).
   */
  onlyUnmade?: boolean;
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
  onEditRequest,
  editing = false,
  onlyUnmade = false,
}: FeatureChoiceFieldProps) {
  const defs = featureChoiceDefs(featureId);
  if (defs.length === 0) return null;
  // Édition d'une valeur DÉJÀ retenue : réservée au mode édition (la puce « Choisir »,
  // elle, reste cliquable en toute circonstance).
  const onEditValue = editing ? onEditRequest : undefined;
  // On ne propose un choix répétable qu'une fois un palier atteint (cf.
  // `isChoiceActionable`) : avant cela il n'y a rien à retenir, on masque le contrôle
  // (et sa puce « Choix à faire ») pour ne pas embrouiller l'utilisateur. On conserve
  // l'index d'origine, clé de `featureChoices` pour lire/écrire la sélection.
  const unmade = onlyUnmade ? new Set(unmadeChoiceIndexes(character, featureId)) : null;
  const visible = defs
    .map((choice, index) => ({ choice, index }))
    .filter(({ choice, index }) => isChoiceActionable(character, featureId, choice) && (!unmade || unmade.has(index)));
  if (visible.length === 0) return null;

  if (mode === 'display') {
    return (
      <Stack spacing={0.5} data-glossary-shot="FeatureChoiceField">
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
                onEdit={onEditRequest}
                onEditValue={onEditValue}
              />
            );
          }
          // Choix `custom-skill` (PER-73) : nom du gagne-pain + domaines +3 retenus.
          if (choice.kind === 'custom-skill') {
            const { name, domains } = getCustomSkillSelection(character, featureId, i);
            const complete = name.trim().length > 0 && domains.length >= choice.domainCount;
            const domLabels = domains.map((d) => testDomainById.get(d)?.label ?? d).join(', ');
            const chip = complete ? (
              <ChoiceValueBadge label={name} compact={compact} onClick={onEditValue} />
            ) : (
              <ChoiceTodoBadge compact={compact} onClick={onEditRequest} />
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
          // Choix `free-text` (PER-175) : purement narratif et optionnel. On montre la valeur
          // saisie en chip (cliquable pour éditer) ; RIEN si vide (pas de badge « Choisir »).
          if (choice.kind === 'free-text') {
            const rawText = getSelection(character, featureId, i);
            const text = typeof rawText === 'string' ? rawText : null;
            if (!text) return null;
            const chip = <ChoiceValueBadge label={text} compact={compact} onClick={onEditValue} />;
            if (compact) return <Box key={i}>{chip}</Box>;
            return (
              <Stack key={i} direction="row" spacing={0.75} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                  {choice.prompt} :
                </Typography>
                {chip}
              </Stack>
            );
          }
          // Option entièrement débloquée par le rang de voie (ex. Héros célèbre au rang 8) : on
          // affiche TOUTES les options comme acquises, quelle que soit la sélection stockée.
          if (choice.kind === 'option' && allOptionsUnlocked(character, featureId, choice)) {
            const chips = choice.options.map((o) => (
              <ChoiceValueBadge
                key={o.id}
                label={choiceSelectionLabel(choice, o.id, true) ?? o.label}
                compact={compact}
                onClick={onEditValue}
              />
            ));
            if (compact)
              return (
                <Box key={i} sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                  {chips}
                </Box>
              );
            return (
              <Stack key={i} direction="row" spacing={0.75} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                  {choice.prompt} :
                </Typography>
                {chips}
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
          // Le NOM de la capacité porte déjà le choix (`nameFromChosenOption`, ex. drakonide-r4) : la
          // puce de valeur ferait doublon → masquée une fois le choix fait. La puce « Choisir » (choix
          // non encore retenu, `label` absent) reste, elle, affichée.
          if (choice.kind === 'option' && choice.nameFromChosenOption && label) return null;
          const complement = compact ? null : choiceSelectionComplement(choice, selection);
          const valueChip = label ? (
            <ChoiceValueBadge label={label} compact={compact} onClick={onEditValue} />
          ) : (
            <ChoiceTodoBadge compact={compact} onClick={onEditRequest} />
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
    <Stack spacing={1.5} data-glossary-shot="FeatureChoiceField">
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
