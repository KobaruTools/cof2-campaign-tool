'use client';

/**
 * Navigateur du bestiaire (PER-237) : consultation en LECTURE SEULE des 85 créatures
 * du livre de base. Disposition maître-détail — liste filtrable (groupée par catégorie,
 * variantes imbriquées sous leur base via `baseCreatureId`) à gauche, bloc de stats
 * complet à droite. Recherche par nom + filtres catégorie / taille / nature / plage de NC.
 * Aucune écriture : on lit `creatures` / `creatureById`, on n'altère ni donnée ni moteur.
 */
import { useMemo, useState } from 'react';
import SearchIcon from '@mui/icons-material/Search';
import Box from '@mui/material/Box';
import FormControl from '@mui/material/FormControl';
import InputAdornment from '@mui/material/InputAdornment';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import OutlinedInput from '@mui/material/OutlinedInput';
import Select from '@mui/material/Select';
import Slider from '@mui/material/Slider';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import { creatures } from '@/data';
import {
  CREATURE_CATEGORIES,
  CREATURE_NATURES,
  CREATURE_SIZES,
  type Creature,
  type CreatureCategory,
  type CreatureNature,
  type CreatureSize,
} from '@/data/schema';
import {
  CREATURE_CATEGORY_LABELS,
  CREATURE_NATURE_LABELS,
  CREATURE_SIZE_LABELS,
  creatureNcLabel,
} from '@/lib/ui/creature';
import { BestiaryStatBlock } from './BestiaryStatBlock';

/** Normalise pour une recherche insensible aux accents et à la casse. */
const norm = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

/** Famille = créature de base + ses variantes (`baseCreatureId`). Une créature autonome est une base sans variante. */
interface Family {
  base: Creature;
  variants: Creature[];
}

export function BestiaryBrowser() {
  // NC numériques présents dans le bestiaire (le gabarit sans NC est exclu), triés — servent
  // aux bornes du curseur et à ses graduations (le curseur ne s'arrête que sur ces valeurs).
  const ncValues = useMemo(
    () =>
      [...new Set(creatures.map((c) => c.nc).filter((n): n is number => n != null))].sort(
        (a, b) => a - b,
      ),
    [],
  );
  const ncMin = ncValues[0];
  const ncMax = ncValues[ncValues.length - 1];
  const ncMarks = useMemo(() => ncValues.map((v) => ({ value: v })), [ncValues]);

  // Familles dans l'ordre du livre : base d'abord, variantes rattachées à leur base.
  const families = useMemo<Family[]>(() => {
    const byId = new Map<string, Family>();
    const order: Family[] = [];
    for (const c of creatures) {
      if (!c.baseCreatureId) {
        const family: Family = { base: c, variants: [] };
        byId.set(c.id, family);
        order.push(family);
      }
    }
    for (const c of creatures) {
      if (c.baseCreatureId) byId.get(c.baseCreatureId)?.variants.push(c);
    }
    return order;
  }, []);

  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<CreatureCategory | 'all'>('all');
  const [sizes, setSizes] = useState<CreatureSize[]>([]);
  const [natures, setNatures] = useState<CreatureNature[]>([]);
  const [ncRange, setNcRange] = useState<[number, number]>([ncMin, ncMax]);
  const [selectedId, setSelectedId] = useState<string>(creatures[0]?.id ?? '');

  // Prédicat de correspondance d'une créature aux filtres actifs.
  const matches = useMemo(() => {
    const q = norm(query.trim());
    const sizeSet = new Set(sizes);
    const natureSet = new Set(natures);
    const [lo, hi] = ncRange;
    const isFullNcRange = lo <= ncMin && hi >= ncMax;
    return (c: Creature): boolean => {
      if (q && !norm(c.name).includes(q)) return false;
      if (category !== 'all' && c.category !== category) return false;
      if (sizeSet.size > 0 && (!c.size || !sizeSet.has(c.size))) return false;
      if (natureSet.size > 0 && !(c.nature ?? []).some((n) => natureSet.has(n))) return false;
      // Le gabarit sans NC (ex. « Zombie ») reste visible tant qu'on n'a pas resserré la plage.
      if (c.nc == null) return isFullNcRange;
      return c.nc >= lo && c.nc <= hi;
    };
  }, [query, category, sizes, natures, ncRange, ncMin, ncMax]);

  // Familles visibles + variantes à montrer : si la base correspond, on déploie toute la
  // famille ; sinon on ne montre que les variantes qui correspondent (la base sert d'en-tête).
  const visibleFamilies = useMemo(() => {
    return families
      .map((f) => {
        const baseMatch = matches(f.base);
        const variants = baseMatch ? f.variants : f.variants.filter(matches);
        return { base: f.base, variants, visible: baseMatch || variants.length > 0 };
      })
      .filter((f) => f.visible);
  }, [families, matches]);

  // Ids visibles à plat, pour dériver la sélection effective.
  const visibleIds = useMemo(() => {
    const ids: string[] = [];
    for (const f of visibleFamilies) {
      ids.push(f.base.id);
      for (const v of f.variants) ids.push(v.id);
    }
    return ids;
  }, [visibleFamilies]);

  // Sélection EFFECTIVE dérivée au rendu (pas de correction via un effet) : la créature
  // choisie tant qu'elle reste visible, sinon la première de la liste filtrée.
  const effectiveId = visibleIds.includes(selectedId) ? selectedId : (visibleIds[0] ?? '');
  const selected = creatures.find((c) => c.id === effectiveId) ?? null;

  return (
    <Stack spacing={2}>
      {/* Barre de recherche + filtres. */}
      <Box
        sx={{
          p: 1.5,
          borderRadius: 2,
          bgcolor: 'rgba(0, 0, 0, 0.35)',
          border: '1px solid rgba(255, 255, 255, 0.10)',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
        }}
      >
        <TextField
          fullWidth
          size="small"
          placeholder="Rechercher une créature par nom"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
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

        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={2}
          sx={{ mt: 1.5, alignItems: { xs: 'stretch', md: 'center' }, flexWrap: 'wrap', rowGap: 1.5 }}
        >
          <ToggleButtonGroup
            exclusive
            size="small"
            value={category}
            onChange={(_, v: CreatureCategory | 'all' | null) => v != null && setCategory(v)}
            sx={{ flexWrap: 'wrap' }}
          >
            <ToggleButton value="all">Toutes</ToggleButton>
            {CREATURE_CATEGORIES.map((c) => (
              <ToggleButton key={c} value={c}>
                {CREATURE_CATEGORY_LABELS[c]}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>

          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel id="bestiary-size-label">Taille</InputLabel>
            <Select
              multiple
              labelId="bestiary-size-label"
              value={sizes}
              onChange={(e) => setSizes(e.target.value as CreatureSize[])}
              input={<OutlinedInput label="Taille" />}
              renderValue={(sel) =>
                sel.length === 0 ? 'Toutes' : sel.map((s) => CREATURE_SIZE_LABELS[s]).join(', ')
              }
            >
              {CREATURE_SIZES.map((s) => (
                <MenuItem key={s} value={s}>
                  {CREATURE_SIZE_LABELS[s]}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel id="bestiary-nature-label">Nature</InputLabel>
            <Select
              multiple
              labelId="bestiary-nature-label"
              value={natures}
              onChange={(e) => setNatures(e.target.value as CreatureNature[])}
              input={<OutlinedInput label="Nature" />}
              renderValue={(sel) =>
                sel.length === 0 ? 'Toutes' : sel.map((n) => CREATURE_NATURE_LABELS[n]).join(', ')
              }
            >
              {CREATURE_NATURES.map((n) => (
                <MenuItem key={n} value={n}>
                  {CREATURE_NATURE_LABELS[n]}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Box sx={{ minWidth: 200, px: 1, flexGrow: 1, maxWidth: 320 }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
              NC : {ncRange[0]} – {ncRange[1]}
            </Typography>
            <Slider
              size="small"
              value={ncRange}
              min={ncMin}
              max={ncMax}
              step={null}
              marks={ncMarks}
              onChange={(_, v) => setNcRange(v as [number, number])}
              valueLabelDisplay="auto"
              valueLabelFormat={(v) => (v === 0.5 ? '1/2' : String(v))}
            />
          </Box>
        </Stack>
      </Box>

      {/* Maître-détail : liste (gauche) + bloc de stats (droite). Empilé sous md. */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '300px 1fr' },
          gap: 2,
          alignItems: 'start',
        }}
      >
        {/* Liste groupée par catégorie ; variantes indentées sous leur base. */}
        <Box
          sx={{
            borderRadius: 2,
            overflow: 'hidden',
            border: '1px solid rgba(255, 255, 255, 0.10)',
            bgcolor: 'rgba(0, 0, 0, 0.35)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            // Sous md la liste peut être longue : on la borne et on la rend défilable
            // pour garder le détail atteignable ; en md+ elle colle au défilement.
            maxHeight: { xs: 360, md: 'calc(100vh - 220px)' },
            overflowY: 'auto',
            position: { md: 'sticky' },
            top: { md: 84 },
          }}
        >
          {visibleFamilies.length === 0 ? (
            <Typography color="text.secondary" sx={{ p: 2 }}>
              Aucune créature ne correspond à ces critères.
            </Typography>
          ) : (
            (() => {
              let lastCategory: CreatureCategory | null = null;
              const nodes: React.ReactNode[] = [];
              for (const family of visibleFamilies) {
                if (family.base.category !== lastCategory) {
                  lastCategory = family.base.category;
                  nodes.push(
                    <Typography
                      key={`cat-${lastCategory}`}
                      variant="overline"
                      sx={{
                        display: 'block',
                        px: 1.5,
                        pt: 1.25,
                        pb: 0.5,
                        color: 'text.secondary',
                        fontWeight: 700,
                        letterSpacing: 0.5,
                        position: 'sticky',
                        top: 0,
                        bgcolor: 'rgba(20, 20, 23, 0.95)',
                        zIndex: 1,
                      }}
                    >
                      {CREATURE_CATEGORY_LABELS[lastCategory]}
                    </Typography>,
                  );
                }
                nodes.push(
                  <CreatureRow
                    key={family.base.id}
                    creature={family.base}
                    selected={effectiveId === family.base.id}
                    onSelect={() => setSelectedId(family.base.id)}
                  />,
                );
                for (const v of family.variants) {
                  nodes.push(
                    <CreatureRow
                      key={v.id}
                      creature={v}
                      variant
                      selected={effectiveId === v.id}
                      onSelect={() => setSelectedId(v.id)}
                    />,
                  );
                }
              }
              return nodes;
            })()
          )}
        </Box>

        {/* Détail : bloc de stats de la créature sélectionnée. */}
        <Box sx={{ minWidth: 0 }}>
          {selected ? (
            <BestiaryStatBlock creature={selected} />
          ) : (
            <Typography color="text.secondary" sx={{ p: 2 }}>
              Sélectionnez une créature.
            </Typography>
          )}
        </Box>
      </Box>
    </Stack>
  );
}

/** Ligne cliquable de la liste : nom + NC, indentée pour une variante, surlignée si sélectionnée. */
function CreatureRow({
  creature,
  variant = false,
  selected,
  onSelect,
}: {
  creature: Creature;
  variant?: boolean;
  selected: boolean;
  onSelect: () => void;
}) {
  const nc = creatureNcLabel(creature);
  return (
    <Box
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        cursor: 'pointer',
        userSelect: 'none',
        pl: variant ? 3 : 1.5,
        pr: 1.5,
        py: 0.75,
        borderLeft: '3px solid',
        borderLeftColor: selected ? 'primary.main' : 'transparent',
        bgcolor: selected ? (t) => alpha(t.palette.primary.main, 0.16) : 'transparent',
        '&:hover': { bgcolor: (t) => alpha(t.palette.primary.main, selected ? 0.16 : 0.08) },
      }}
    >
      <Typography
        variant="body2"
        sx={{ flexGrow: 1, minWidth: 0, fontWeight: selected ? 700 : variant ? 400 : 600 }}
        noWrap
      >
        {creature.name}
      </Typography>
      {nc && (
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}
        >
          NC {nc}
        </Typography>
      )}
    </Box>
  );
}
