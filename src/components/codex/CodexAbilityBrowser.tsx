'use client';

/**
 * Grille exhaustive de TOUTES les capacités de TOUTES les voies (PER-445, « Capacités ») —
 * complément de `CodexPathBrowser` (une voie à la fois, lecture « narrative ») pour la recherche
 * transversale : filtrer par voie d'origine, rang, type d'action et sort sur l'ensemble du livre en
 * une seule vue. Cartes au style de la fiche personnage (`CodexAbilityCard`, cf. son commentaire).
 *
 * GATING : identique à `CodexPathBrowser` — `paths`/`featureById` sont des registres FUSIONNÉS EN
 * PLACE par le contenu payant, une voie du Compagnon non entitlée n'y est jamais chargée. Seule la
 * RÉACTIVITÉ est à gérer (`useContentVersion`, cf. `CodexPathBrowser`).
 */
import { useEffect, useMemo, useState, type ReactElement, type ReactNode } from 'react';
import NextLink from 'next/link';
import { useSearchParams } from 'next/navigation';
import CategoryIcon from '@mui/icons-material/Category';
import CloseIcon from '@mui/icons-material/Close';
import FormatListNumberedIcon from '@mui/icons-material/FormatListNumbered';
import SearchIcon from '@mui/icons-material/Search';
import SortByAlphaIcon from '@mui/icons-material/SortByAlpha';
import Autocomplete from '@mui/material/Autocomplete';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import Slider from '@mui/material/Slider';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { classById, families, featureById, pathById, paths } from '@/data';
import { PRESTIGE_CATEGORIES } from '@/data/schema';
import type { ActionType, Feature, Path } from '@/data/schema';
import { useContentVersion } from '@/lib/content/useContentVersion';
import { codexPathHref } from '@/lib/ui/codex';
import { normalizeSearchText } from '@/lib/ui/searchText';
import { ANCESTRY_COLOR, MAGE_PATH_COLOR, classColor, prestigeCategoryColor } from '@/lib/ui/classColors';
import { prestigeMetalGradient } from '@/lib/ui/prestigeStyle';
import { AncestryIcon } from '@/components/AncestryIcon';
import { ClassIcon } from '@/components/ClassIcon';
import { RankBadge } from '@/components/RankBadge';
import { PageRefText } from '@/components/SourceRef';
import { ActionMarkerHex, FeatureMarkerHexes } from '@/components/FeatureMarkerHex';
import { PathFeatureCard } from '@/components/sheet/PathFeatureCard';
import { CodexFeatureChoices } from '@/components/codex/CodexChoiceSummary';
import { CodexAbilityCard } from '@/components/codex/CodexAbilityCard';
import { PRESTIGE_CATEGORY_LABELS } from '@/components/codex/CodexPathBrowser';

interface AbilityEntry {
  feature: Feature;
  path: Path;
}

const MARKER_OPTIONS: (ActionType | 'spell')[] = ['spell', 'A', 'L', 'G', 'M'];

/** Mode de tri de la grille (même logique que le tri du bestiaire, `BestiaryBrowser.tsx`) :
 * - `alpha` : ordre alphabétique du nom de capacité (défaut) ;
 * - `category` : ordre du livre (peuple → profils par famille → prestige, `comparePathsByCategory`),
 *   puis par rang à l'intérieur d'une même voie ;
 * - `rank` : rang croissant, toutes voies confondues. */
type SortMode = 'alpha' | 'category' | 'rank';

const SORT_MODES: { value: SortMode; label: string; icon: ReactElement }[] = [
  { value: 'category', label: 'Par catégorie (ordre du livre)', icon: <CategoryIcon fontSize="small" /> },
  { value: 'rank', label: 'Par rang', icon: <FormatListNumberedIcon fontSize="small" /> },
  { value: 'alpha', label: 'Alphabétique', icon: <SortByAlphaIcon fontSize="small" /> },
];

const isSortMode = (v: unknown): v is SortMode => v === 'alpha' || v === 'category' || v === 'rank';

/** Même « panneau verre » que les autres sous-pages du Codex (`CodexPathBrowser`,
 * `CodexEquipmentBrowser`…) — fond noir semi-transparent flouté, pour détacher filtres + grille du
 * fond de la page (retour propriétaire : sans lui, le fond bleedait trop derrière les filtres). */
const panelSx = {
  borderRadius: 2,
  border: '1px solid rgba(255, 255, 255, 0.10)',
  bgcolor: 'rgba(0, 0, 0, 0.35)',
  backdropFilter: 'blur(6px)',
  WebkitBackdropFilter: 'blur(6px)',
  p: { xs: 2, sm: 3 },
} as const;

/** Teinte d'origine d'une voie — mêmes fonctions que la fiche (`FeaturesByPath`/`PathBlock`). */
function pathColor(path: Path): string {
  switch (path.type) {
    case 'ancestry':
      return ANCESTRY_COLOR;
    case 'mage':
      return MAGE_PATH_COLOR;
    case 'class':
      return classColor(path.classIds[0]);
    case 'prestige':
      return prestigeCategoryColor(path.category);
  }
}

function pathIconNode(path: Path, size: number): ReactNode {
  const color = pathColor(path);
  if (path.type === 'ancestry') return <AncestryIcon ancestryId={path.ancestryIds[0]} size={size} color={color} />;
  if (path.type === 'mage') return <AncestryIcon ancestryId="mage" size={size} color={color} />;
  if (path.type === 'class') return <ClassIcon classId={path.classIds[0]} size={size} color={color} />;
  return <AncestryIcon ancestryId="prestige" size={size} color={color} />;
}

/** Rang de tri du sélecteur de voies, calé sur la structure du livre (retour propriétaire) : Peuple
 * (voie du mage incluse — elle REMPLACE la voie de peuple, p. 60), puis les 4 familles de profil dans
 * l'ordre du livre (p. 23), puis le prestige dans le MÊME ordre de famille avec les génériques en
 * premier (`PRESTIGE_CATEGORIES`, déjà dans cet ordre — table récapitulative p. 128). */
function pathCategoryRank(path: Path): number {
  if (path.type === 'ancestry' || path.type === 'mage') return 0;
  if (path.type === 'class') {
    const familyId = classById.get(path.classIds[0])?.familyId;
    const familyIndex = families.findIndex((f) => f.id === familyId);
    return 1 + (familyIndex === -1 ? 0 : familyIndex);
  }
  return 1 + families.length + PRESTIGE_CATEGORIES.indexOf(path.category);
}

/** Libellé de regroupement du sélecteur de voies — mêmes buckets que `pathCategoryRank`. */
function pathGroupLabel(path: Path): string {
  if (path.type === 'ancestry' || path.type === 'mage') return 'Peuple';
  if (path.type === 'class') {
    const familyId = classById.get(path.classIds[0])?.familyId;
    return families.find((f) => f.id === familyId)?.name ?? 'Profil';
  }
  return `Prestige · ${PRESTIGE_CATEGORY_LABELS[path.category]}`;
}

/** Comparateur de voies dans l'ordre du livre : rang de catégorie (`pathCategoryRank`), puis — dans
 * un bucket de profil — par profil (alphabétique), puis par voie. Source unique, réutilisée par le
 * sélecteur de voies ET le tri « Par catégorie » de la grille. */
function comparePathsByCategory(a: Path, b: Path): number {
  const ra = pathCategoryRank(a);
  const rb = pathCategoryRank(b);
  if (ra !== rb) return ra - rb;
  if (a.type === 'class' && b.type === 'class') {
    const classA = classById.get(a.classIds[0])?.name ?? '';
    const classB = classById.get(b.classIds[0])?.name ?? '';
    if (classA !== classB) return classA.localeCompare(classB, 'fr');
  }
  return a.name.localeCompare(b.name, 'fr');
}

/** Comparateur « Par catégorie » de la grille : ordre du livre (`comparePathsByCategory`), puis par
 * rang à l'intérieur d'une même voie, puis par nom en dernier recours. */
function compareEntriesByCategory(a: AbilityEntry, b: AbilityEntry): number {
  if (a.path.id !== b.path.id) return comparePathsByCategory(a.path, b.path);
  if (a.feature.rank !== b.feature.rank) return a.feature.rank - b.feature.rank;
  return a.feature.name.localeCompare(b.feature.name, 'fr');
}

/** Teinte/dégradé du NOM de voie affiché (sélecteur + carte) — même traitement que le titre de voie
 * de la fiche (`FeaturePathTitle`, `FeaturesByPath.tsx`) : dégradé « métal précieux » pour le
 * prestige, teinte pleine sinon. */
function pathNameSx(path: Path) {
  const color = pathColor(path);
  if (path.type === 'prestige') {
    return {
      fontWeight: 700,
      backgroundImage: prestigeMetalGradient(color, '90deg'),
      backgroundClip: 'text',
      WebkitBackgroundClip: 'text',
      color: 'transparent',
    } as const;
  }
  return { fontWeight: 700, color } as const;
}

/** Valeur retardée de `delayMs` — la recherche texte (chaque frappe) et le double slider de rang
 * (chaque pixel glissé) recalculent sinon `filteredEntries` sur les 665+ capacités à chaque micro-
 * changement, ce qui rend la grille saccadée pendant la saisie/le glissement (retour propriétaire).
 * Le CONTRÔLE reste instantané (`search`/`rankRange` bruts pilotent le champ et les poignées) ; seul
 * le FILTRAGE de la grille attend que l'utilisateur s'arrête un instant. */
function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}

export function CodexAbilityBrowser() {
  // Réactivité au contenu payant (même raison que `CodexPathBrowser`) : un lot payant arrivant
  // après le premier rendu doit apparaître sans rechargement manuel.
  const contentVersion = useContentVersion();

  const pathOptions = useMemo(
    () => [...paths].sort(comparePathsByCategory),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [contentVersion],
  );

  const entries = useMemo<AbilityEntry[]>(() => {
    const list: AbilityEntry[] = [];
    for (const path of paths) {
      for (const featureId of path.featureIds) {
        const feature = featureById.get(featureId);
        if (feature) list.push({ feature, path });
      }
    }
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentVersion]);

  const availableRanks = useMemo(
    () => Array.from(new Set(entries.map((e) => e.feature.rank))).sort((a, b) => a - b),
    [entries],
  );

  const rankMin = availableRanks[0] ?? 1;
  const rankMax = availableRanks[availableRanks.length - 1] ?? 8;
  const rankMarks = useMemo(() => availableRanks.map((v) => ({ value: v })), [availableRanks]);

  const [search, setSearch] = useState('');
  const [selectedPaths, setSelectedPaths] = useState<Path[]>([]);
  // Filtre par PLAGE (double slider), même patron que le NC du bestiaire (`BestiaryBrowser.tsx`) —
  // pas des chips par rang : la plage se lit d'un coup d'œil, un rang isolé se sélectionne en
  // resserrant les deux poignées sur la même valeur. `rankRange` pilote l'AFFICHAGE des poignées
  // (continu pendant le glissement) ; `committedRankRange`, mis à jour seulement au RELÂCHEMENT
  // (`onChangeCommitted`), pilote le filtrage — retour propriétaire : sur 665+ capacités, filtrer à
  // chaque pixel glissé (pas juste à chaque frappe texte) restait saccadé.
  const [rankRange, setRankRange] = useState<[number, number]>([rankMin, rankMax]);
  const [committedRankRange, setCommittedRankRange] = useState<[number, number]>([rankMin, rankMax]);
  const [selectedMarkers, setSelectedMarkers] = useState<Set<ActionType | 'spell'>>(new Set());
  const [sortMode, setSortMode] = useState<SortMode>('alpha');
  // « Par catégorie » n'a plus de sens en recherche texte (résultats piochés dans tout le livre, pas
  // un sous-ensemble par voie) : masqué du groupe de boutons tant qu'une recherche est active, sans
  // perdre la préférence — elle revient d'elle-même si la recherche est vidée.
  const searchActive = search.trim() !== '';
  const effectiveSortMode: SortMode = searchActive && sortMode === 'category' ? 'alpha' : sortMode;

  const toggleMarker = (marker: ActionType | 'spell') =>
    setSelectedMarkers((prev) => {
      const next = new Set(prev);
      if (next.has(marker)) next.delete(marker);
      else next.add(marker);
      return next;
    });

  const hasActiveFilters =
    search.trim() !== '' ||
    selectedPaths.length > 0 ||
    committedRankRange[0] !== rankMin ||
    committedRankRange[1] !== rankMax ||
    selectedMarkers.size > 0;
  const resetFilters = () => {
    setSearch('');
    setSelectedPaths([]);
    setRankRange([rankMin, rankMax]);
    setCommittedRankRange([rankMin, rankMax]);
    setSelectedMarkers(new Set());
  };

  // Recherche texte : débattue (voir `useDebouncedValue`) — pas de « relâchement » possible pour de
  // la saisie clavier. Le champ reste branché sur `search` brut ; seul CE calcul, coûteux sur 665+
  // capacités, patiente 250 ms après la dernière frappe.
  const debouncedSearch = useDebouncedValue(search, 250);

  const filteredEntries = useMemo(() => {
    const query = normalizeSearchText(debouncedSearch.trim());
    const selectedPathIds = new Set(selectedPaths.map((p) => p.id));
    return entries
      .filter(({ feature, path }) => {
        if (selectedPathIds.size > 0 && !selectedPathIds.has(path.id)) return false;
        if (feature.rank < committedRankRange[0] || feature.rank > committedRankRange[1]) return false;
        if (selectedMarkers.size > 0) {
          const markers = new Set<ActionType | 'spell'>(feature.actionTypes);
          if (feature.isSpell) markers.add('spell');
          let matches = false;
          for (const m of selectedMarkers) {
            if (markers.has(m)) {
              matches = true;
              break;
            }
          }
          if (!matches) return false;
        }
        if (query && !normalizeSearchText(`${feature.name} ${feature.text}`).includes(query)) return false;
        return true;
      })
      .sort((a, b) => {
        if (effectiveSortMode === 'category') return compareEntriesByCategory(a, b);
        if (effectiveSortMode === 'rank') {
          if (a.feature.rank !== b.feature.rank) return a.feature.rank - b.feature.rank;
          return a.feature.name.localeCompare(b.feature.name, 'fr');
        }
        return a.feature.name.localeCompare(b.feature.name, 'fr');
      });
  }, [entries, selectedPaths, committedRankRange, selectedMarkers, debouncedSearch, effectiveSortMode]);

  // Ciblage direct d'une capacité précise (`?id=<featureId>`, même convention que le reste du Codex,
  // cf. `codexPathHref`/`equipmentCodexHref`) : ouvre directement son détail. Résolu via
  // `featureById`/`pathById` (pas `entries`) : ajusté PENDANT le rendu quand `requestedId` CHANGE
  // (même patron que `CodexPathBrowser`/`CodexEquipmentBrowser`, « adjusting state when a prop
  // changes »), pas dans un effet — un `setState` synchrone en effet déclenche un rendu en cascade.
  const requestedId = useSearchParams().get('id');
  const resolveRequested = (id: string | null): AbilityEntry | null => {
    if (!id) return null;
    const feature = featureById.get(id);
    const path = feature ? pathById.get(feature.pathId) : undefined;
    return feature && path ? { feature, path } : null;
  };
  const [openEntry, setOpenEntry] = useState<AbilityEntry | null>(() => resolveRequested(requestedId));
  const [lastRequestedId, setLastRequestedId] = useState(requestedId);
  if (requestedId !== lastRequestedId) {
    setLastRequestedId(requestedId);
    const found = resolveRequested(requestedId);
    if (found) setOpenEntry(found);
  }

  return (
    <Box>
      <Box sx={panelSx}>
        <Stack spacing={1.5} sx={{ mb: 3 }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <TextField
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher une capacité…"
              size="small"
              fullWidth
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" />
                    </InputAdornment>
                  ),
                },
              }}
            />
            <Autocomplete
              multiple
              size="small"
              sx={{ minWidth: { sm: 320 } }}
              options={pathOptions}
              groupBy={pathGroupLabel}
              getOptionLabel={(p) => p.name}
              isOptionEqualToValue={(a, b) => a.id === b.id}
              value={selectedPaths}
              onChange={(_, value) => setSelectedPaths(value)}
              limitTags={2}
              renderInput={(params) => <TextField {...params} placeholder="Filtrer par voie…" />}
              renderOption={(optionProps, option) => {
                const { key, ...rest } = optionProps as typeof optionProps & { key?: string };
                return (
                  <Box component="li" key={option.id} {...rest} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {pathIconNode(option, 18)}
                    <Typography variant="body2" noWrap sx={pathNameSx(option)}>
                      {option.name}
                    </Typography>
                  </Box>
                );
              }}
            />
            <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', flexShrink: 0 }}>
              <Typography variant="caption" color="text.secondary" sx={{ mr: 0.5 }}>
                Trier :
              </Typography>
              <ToggleButtonGroup
                exclusive
                size="small"
                value={effectiveSortMode}
                onChange={(_, v) => isSortMode(v) && setSortMode(v)}
              >
                {SORT_MODES.filter((m) => m.value !== 'category' || !searchActive).map((m) => (
                  <ToggleButton key={m.value} value={m.value} aria-label={m.label}>
                    <Tooltip title={m.label}>{m.icon}</Tooltip>
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
            </Stack>
          </Stack>
          <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap', alignItems: 'center', rowGap: 1 }}>
            <Box sx={{ minWidth: 200, px: 1, flexGrow: 1, maxWidth: 320 }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                Rang : {rankRange[0]} – {rankRange[1]}
              </Typography>
              <Slider
                size="small"
                value={rankRange}
                min={rankMin}
                max={rankMax}
                step={null}
                marks={rankMarks}
                onChange={(_, v) => setRankRange(v as [number, number])}
                onChangeCommitted={(_, v) => setCommittedRankRange(v as [number, number])}
                valueLabelDisplay="auto"
              />
            </Box>
            <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
              <Typography variant="caption" color="text.secondary" sx={{ mr: 0.5 }}>
                Action :
              </Typography>
              {MARKER_OPTIONS.map((marker) => {
                const active = selectedMarkers.has(marker);
                return (
                  <Box
                    key={marker}
                    onClick={() => toggleMarker(marker)}
                    sx={{
                      cursor: 'pointer',
                      borderRadius: '4px',
                      opacity: selectedMarkers.size === 0 || active ? 1 : 0.35,
                      boxShadow: active ? (theme) => `0 0 0 2px ${theme.palette.info.main}` : 'none',
                      transition: 'opacity .15s ease, box-shadow .15s ease',
                    }}
                  >
                    <ActionMarkerHex marker={marker} size={24} />
                  </Box>
                );
              })}
            </Stack>
            {hasActiveFilters && (
              <Button size="small" onClick={resetFilters}>
                Réinitialiser
              </Button>
            )}
          </Stack>
          <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'right' }}>
            {filteredEntries.length} capacité{filteredEntries.length !== 1 ? 's' : ''}
          </Typography>
        </Stack>

        {filteredEntries.length === 0 ? (
          <Typography color="text.secondary">Aucune capacité ne correspond à ces filtres.</Typography>
        ) : (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: 1.5,
            }}
          >
            {filteredEntries.map(({ feature, path }) => (
              <CodexAbilityCard
                key={feature.id}
                feature={feature}
                pathName={path.name}
                pathIcon={pathIconNode(path, 14)}
                color={pathColor(path)}
                prestige={path.type === 'prestige'}
                onClick={() => setOpenEntry({ feature, path })}
              />
            ))}
          </Box>
        )}
      </Box>

      <Dialog open={!!openEntry} onClose={() => setOpenEntry(null)} maxWidth="sm" fullWidth>
        {openEntry && (
          <>
            {/* Même patron que la modale de détail « Voies & capacités » en vue colonne
                (`FeaturesByPath.tsx`, `FeaturePathTitle`) : ligne 1 = icône + nom de voie (teinté,
                cliquable) + rang ; ligne 2 = nom de la capacité + ses marqueurs. Deux `Stack` row
                séparés (pas un seul `Stack` avec retour à la ligne) : le même patron évite qu'un
                enfant « saut de ligne » hérite quand même du `spacing` du parent. */}
            <DialogTitle sx={{ pr: 6 }}>
              <Stack spacing={0.5}>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                  <Box
                    component={NextLink}
                    href={codexPathHref(openEntry.path.id, openEntry.feature.id)}
                    sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75, textDecoration: 'none' }}
                  >
                    {pathIconNode(openEntry.path, 18)}
                    <Typography component="span" variant="body2" sx={pathNameSx(openEntry.path)}>
                      {openEntry.path.name}
                    </Typography>
                  </Box>
                  <RankBadge
                    rank={openEntry.feature.rank}
                    color={pathColor(openEntry.path)}
                    prestige={openEntry.path.type === 'prestige'}
                  />
                </Stack>
                <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                  <Typography component="span" variant="h6" sx={{ fontWeight: 700 }}>
                    {openEntry.feature.name}
                  </Typography>
                  <FeatureMarkerHexes
                    feature={openEntry.feature}
                    color={openEntry.path.type === 'prestige' ? undefined : pathColor(openEntry.path)}
                    size={24}
                  />
                </Stack>
              </Stack>
              <IconButton onClick={() => setOpenEntry(null)} sx={{ position: 'absolute', top: 8, right: 8 }}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </DialogTitle>
            <DialogContent dividers>
              {openEntry.path.type === 'prestige' && openEntry.path.prerequisites && (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                  <strong>Prérequis :</strong> <PageRefText>{openEntry.path.prerequisites}</PageRefText>
                </Typography>
              )}
              <PathFeatureCard feature={openEntry.feature} />
              <CodexFeatureChoices feature={openEntry.feature} />
            </DialogContent>
          </>
        )}
      </Dialog>
    </Box>
  );
}
