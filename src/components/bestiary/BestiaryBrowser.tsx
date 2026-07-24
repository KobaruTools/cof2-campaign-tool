"use client";

/**
 * Navigateur du bestiaire (PER-237, migré en lecture DB par PER-241) : consultation
 * en LECTURE SEULE des créatures du contenu GRATUIT. Disposition maître-détail —
 * liste filtrable (groupée par catégorie, variantes imbriquées sous leur base via
 * `baseCreatureId`) à gauche, bloc de stats complet à droite. Recherche par nom +
 * filtres catégorie / taille / nature / plage de NC.
 *
 * Lecture en DEUX ÉTAGES (store `bestiary`, cache mémoire session) :
 *   1. `BestiaryBrowser` (ci-dessous) charge la LISTE LÉGÈRE (colonnes projetées) et
 *      gère les états de chargement/erreur/vide ;
 *   2. `BestiaryBrowserView` porte tout le filtrage/tri sur cette liste légère, et
 *      délègue le rendu du détail à `CreatureDetail`, qui charge le BLOB complet de
 *      la seule créature sélectionnée à la demande. `BestiaryStatBlock` est inchangé.
 * Aucune écriture : on lit le store, on n'altère ni donnée ni moteur.
 */
import { useEffect, useMemo, useState } from "react";
import CategoryIcon from "@mui/icons-material/Category";
import ClearIcon from "@mui/icons-material/Clear";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import SearchIcon from "@mui/icons-material/Search";
import SortByAlphaIcon from "@mui/icons-material/SortByAlpha";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import FormControl from "@mui/material/FormControl";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import OutlinedInput from "@mui/material/OutlinedInput";
import Select from "@mui/material/Select";
import Skeleton from "@mui/material/Skeleton";
import Slider from "@mui/material/Slider";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { alpha } from "@mui/material/styles";
import {
  CREATURE_CATEGORIES,
  CREATURE_NATURES,
  CREATURE_SIZES,
  type CreatureCategory,
  type CreatureNature,
  type CreatureSize,
} from "@/data/schema";
import type { CreatureListItem } from "@/lib/bestiary";
import {
  CREATURE_CATEGORY_LABELS,
  CREATURE_NATURE_LABELS,
  CREATURE_SIZE_LABELS,
  creatureNcLabel,
  formatNc,
} from "@/lib/ui/creature";
import { usePersistedState } from "@/lib/ui/usePersistedState";
import { useBestiaryStore } from "@/stores/bestiary";
import { AppAlert } from "@/components/AppAlert";
import { BestiaryStatBlock } from "./BestiaryStatBlock";

/** Normalise pour une recherche insensible aux accents et à la casse. */
const norm = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Famille = créature de base + ses variantes (`baseCreatureId`). Une créature autonome est une base sans variante. */
interface Family {
  base: CreatureListItem;
  variants: CreatureListItem[];
}

/**
 * Mode de tri de la liste :
 * - `category` : ordre du livre, groupé par catégorie, variantes imbriquées sous leur base ;
 * - `alpha` : liste plate de toutes les créatures visibles, par ordre alphabétique ;
 * - `nc` : liste plate triée par NC croissant (le gabarit sans NC en fin).
 */
type SortMode = "category" | "alpha" | "nc";

/** Modes de tri, dans l'ordre d'affichage, avec leur icône et leur libellé (tooltip). */
const SORT_MODES: { value: SortMode; label: string; icon: React.ReactElement }[] =
  [
    {
      value: "category",
      label: "Par catégorie",
      icon: <CategoryIcon fontSize="small" />,
    },
    {
      value: "alpha",
      label: "Alphabétique",
      icon: <SortByAlphaIcon fontSize="small" />,
    },
    {
      value: "nc",
      label: "Par NC croissant",
      icon: <TrendingUpIcon fontSize="small" />,
    },
  ];

const isSortMode = (v: unknown): v is SortMode =>
  v === "category" || v === "alpha" || v === "nc";

/**
 * Étage 1 : charge la liste légère du bestiaire (store cache mémoire) et arbitre les
 * états de chargement/erreur/vide avant de monter la vue de filtrage. La vue n'est
 * rendue qu'une fois une liste NON VIDE disponible (elle suppose des bornes de NC
 * calculables) ; l'orchestration async reste ici, la vue reste synchrone.
 */
export function BestiaryBrowser() {
  const list = useBestiaryStore((s) => s.list);
  const status = useBestiaryStore((s) => s.status);
  const loadList = useBestiaryStore((s) => s.loadList);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  if (status === "error") {
    return (
      <AppAlert
        severity="error"
        title="Chargement du bestiaire impossible"
        action={
          <Button color="inherit" size="small" onClick={() => loadList({ force: true })}>
            Réessayer
          </Button>
        }
      >
        Une erreur est survenue en chargeant les créatures.
      </AppAlert>
    );
  }

  if (status === "unconfigured") {
    return (
      <AppAlert severity="info" title="Bestiaire indisponible">
        Le bestiaire est servi depuis la base de données, qui n&apos;est pas
        configurée dans cet environnement.
      </AppAlert>
    );
  }

  if (!list || status === "idle" || status === "loading") {
    return <BestiaryLoadingSkeleton />;
  }

  if (list.length === 0) {
    return (
      <AppAlert severity="info">Aucune créature disponible pour le moment.</AppAlert>
    );
  }

  return <BestiaryBrowserView list={list} />;
}

/** Squelette de chargement de l'étage 1 (mime la disposition maître-détail). */
function BestiaryLoadingSkeleton() {
  return (
    <Stack spacing={2}>
      <Skeleton variant="rounded" height={112} />
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "300px 1fr" },
          gap: 2,
          alignItems: "start",
        }}
      >
        <Skeleton variant="rounded" height={420} />
        <Skeleton variant="rounded" height={420} />
      </Box>
    </Stack>
  );
}

/**
 * Étage 1 (détail) : charge à la demande le BLOB complet de la créature sélectionnée
 * et le rend via `BestiaryStatBlock`. Squelette pendant le chargement, alerte en cas
 * d'échec. Le blob est mis en cache par le store (une créature n'est chargée qu'une fois).
 */
function CreatureDetail({ slug }: { slug: string }) {
  const blob = useBestiaryStore((s) => (slug ? s.blobs[slug] : undefined));
  const blobStatus = useBestiaryStore((s) => (slug ? s.blobStatus[slug] : undefined));
  const loadBlob = useBestiaryStore((s) => s.loadBlob);

  useEffect(() => {
    if (slug) void loadBlob(slug);
  }, [slug, loadBlob]);

  if (!slug) {
    return (
      <Typography color="text.secondary" sx={{ p: 2 }}>
        Sélectionnez une créature.
      </Typography>
    );
  }
  if (blob) return <BestiaryStatBlock creature={blob} />;
  if (blobStatus === "error") {
    return (
      <AppAlert severity="error">
        Impossible de charger le détail de cette créature.
      </AppAlert>
    );
  }
  return (
    <Stack spacing={1.5} sx={{ p: 1 }}>
      <Skeleton variant="text" width="45%" height={40} />
      <Skeleton variant="rounded" height={72} />
      <Skeleton variant="rounded" height={180} />
      <Skeleton variant="rounded" height={120} />
    </Stack>
  );
}

/** Étage 1 bis : tout le filtrage/tri, sur la liste LÉGÈRE déjà chargée (non vide). */
function BestiaryBrowserView({ list }: { list: CreatureListItem[] }) {
  // NC numériques présents dans le bestiaire (le gabarit sans NC est exclu), triés — servent
  // aux bornes du curseur et à ses graduations (le curseur ne s'arrête que sur ces valeurs).
  const ncValues = useMemo(
    () =>
      [
        ...new Set(
          list.map((c) => c.nc).filter((n): n is number => n != null),
        ),
      ].sort((a, b) => a - b),
    [list],
  );
  const ncMin = ncValues[0];
  const ncMax = ncValues[ncValues.length - 1];
  const ncMarks = useMemo(
    () => ncValues.map((v) => ({ value: v })),
    [ncValues],
  );

  // Familles dans l'ordre du livre (la liste est déjà triée par `sort_order`) :
  // base d'abord, variantes rattachées à leur base.
  const families = useMemo<Family[]>(() => {
    const byId = new Map<string, Family>();
    const order: Family[] = [];
    for (const c of list) {
      if (!c.baseCreatureId) {
        const family: Family = { base: c, variants: [] };
        byId.set(c.id, family);
        order.push(family);
      }
    }
    for (const c of list) {
      if (c.baseCreatureId) byId.get(c.baseCreatureId)?.variants.push(c);
    }
    // Groupe RÉELLEMENT par catégorie (ordre canonique), en conservant l'ordre du
    // livre (`sort_order`) À L'INTÉRIEUR de chaque catégorie via un tri STABLE.
    // Indispensable dès que plusieurs sources coexistent : leurs `sort_order` se
    // chevauchent (chaque source repart de 0), donc la liste fusionnée peut
    // intercaler des catégories. Sans ce regroupement, les catégories deviennent
    // NON CONTIGUËS → en-têtes répétés ET clés React `cat-…` dupliquées, ce qui
    // laisse des nœuds orphelins (doublons) au changement de mode de tri.
    const rank = (c: CreatureCategory) => CREATURE_CATEGORIES.indexOf(c);
    order.sort((a, b) => rank(a.base.category) - rank(b.base.category));
    return order;
  }, [list]);

  // Filtres et tri persistés dans localStorage : le choix de l'utilisateur survit au
  // rechargement. Chaque `revive` valide la valeur relue (forme périmée / borne hors plage
  // retombent sur le défaut). La sélection courante reste éphémère (non persistée).
  const [query, setQuery] = usePersistedState<string>(
    "bestiary:query",
    "",
    (raw) => (typeof raw === "string" ? raw : undefined),
  );
  const [category, setCategory] = usePersistedState<CreatureCategory | "all">(
    "bestiary:category",
    "all",
    (raw) =>
      raw === "all" ||
      (CREATURE_CATEGORIES as readonly string[]).includes(raw as string)
        ? (raw as CreatureCategory | "all")
        : undefined,
  );
  const [sizes, setSizes] = usePersistedState<CreatureSize[]>(
    "bestiary:sizes",
    [],
    (raw) =>
      Array.isArray(raw)
        ? (raw.filter((s) =>
            (CREATURE_SIZES as readonly string[]).includes(s),
          ) as CreatureSize[])
        : undefined,
  );
  const [natures, setNatures] = usePersistedState<CreatureNature[]>(
    "bestiary:natures",
    [],
    (raw) =>
      Array.isArray(raw)
        ? (raw.filter((n) =>
            (CREATURE_NATURES as readonly string[]).includes(n),
          ) as CreatureNature[])
        : undefined,
  );
  const [ncRange, setNcRange] = usePersistedState<[number, number]>(
    "bestiary:nc-range",
    [ncMin, ncMax],
    (raw) => {
      if (!Array.isArray(raw) || raw.length !== 2) return undefined;
      const [lo, hi] = raw;
      if (typeof lo !== "number" || typeof hi !== "number") return undefined;
      const clamp = (v: number) => Math.min(Math.max(v, ncMin), ncMax);
      const a = clamp(lo);
      const b = clamp(hi);
      return [Math.min(a, b), Math.max(a, b)];
    },
  );
  const [sortMode, setSortMode] = usePersistedState<SortMode>(
    "bestiary:sort",
    "category",
    (raw) => (isSortMode(raw) ? raw : undefined),
  );
  const [selectedId, setSelectedId] = useState<string>(list[0]?.id ?? "");

  // Un filtre (hors tri) est-il actif ? Sert à (dés)activer le bouton de réinitialisation.
  const filtersActive =
    query !== "" ||
    category !== "all" ||
    sizes.length > 0 ||
    natures.length > 0 ||
    ncRange[0] !== ncMin ||
    ncRange[1] !== ncMax;

  // Réinitialise TOUS les filtres — pas le tri, conservé volontairement.
  const resetFilters = () => {
    setQuery("");
    setCategory("all");
    setSizes([]);
    setNatures([]);
    setNcRange([ncMin, ncMax]);
  };

  // Prédicat de correspondance d'une créature aux filtres actifs.
  const matches = useMemo(() => {
    const q = norm(query.trim());
    const sizeSet = new Set(sizes);
    const natureSet = new Set(natures);
    const [lo, hi] = ncRange;
    const isFullNcRange = lo <= ncMin && hi >= ncMax;
    return (c: CreatureListItem): boolean => {
      if (q && !norm(c.name).includes(q)) return false;
      if (category !== "all" && c.category !== category) return false;
      if (sizeSet.size > 0 && (!c.size || !sizeSet.has(c.size))) return false;
      if (natureSet.size > 0 && !(c.nature ?? []).some((n) => natureSet.has(n)))
        return false;
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
        return {
          base: f.base,
          variants,
          visible: baseMatch || variants.length > 0,
        };
      })
      .filter((f) => f.visible);
  }, [families, matches]);

  // Liste plate, triée, des créatures visibles — utilisée par les modes `alpha` et `nc`
  // (sans regroupement par catégorie ni imbrication de variante).
  const sortedFlat = useMemo(() => {
    const filtered = list.filter(matches);
    if (sortMode === "nc") {
      // NC croissant ; le gabarit sans NC (nc == null) tombe en fin ; départage par nom.
      return [...filtered].sort((a, b) => {
        const na = a.nc ?? Number.POSITIVE_INFINITY;
        const nb = b.nc ?? Number.POSITIVE_INFINITY;
        return na - nb || a.name.localeCompare(b.name, "fr");
      });
    }
    return [...filtered].sort((a, b) => a.name.localeCompare(b.name, "fr"));
  }, [list, matches, sortMode]);

  // Ids visibles à plat, dans l'ordre d'affichage du mode courant, pour dériver la sélection.
  const visibleIds = useMemo(() => {
    if (sortMode !== "category") return sortedFlat.map((c) => c.id);
    const ids: string[] = [];
    for (const f of visibleFamilies) {
      ids.push(f.base.id);
      for (const v of f.variants) ids.push(v.id);
    }
    return ids;
  }, [sortMode, sortedFlat, visibleFamilies]);

  // Sélection EFFECTIVE dérivée au rendu (pas de correction via un effet) : la créature
  // choisie tant qu'elle reste visible, sinon la première de la liste filtrée.
  const effectiveId = visibleIds.includes(selectedId)
    ? selectedId
    : (visibleIds[0] ?? "");

  return (
    <Stack spacing={2}>
      {/* Barre de recherche + filtres. */}
      <Box
        sx={{
          p: 1.5,
          borderRadius: 2,
          bgcolor: "rgba(0, 0, 0, 0.35)",
          border: "1px solid rgba(255, 255, 255, 0.10)",
          backdropFilter: "blur(6px)",
          WebkitBackdropFilter: "blur(6px)",
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
              // Croix d'effacement à droite quand la recherche est renseignée (motif usuel).
              endAdornment: query ? (
                <InputAdornment position="end">
                  <IconButton
                    size="small"
                    edge="end"
                    aria-label="Effacer la recherche"
                    onClick={() => setQuery("")}
                  >
                    <ClearIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ) : undefined,
            },
          }}
        />

        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={2}
          sx={{
            mt: 1.5,
            alignItems: { xs: "stretch", md: "center" },
            flexWrap: "wrap",
            rowGap: 1.5,
          }}
        >
          <ToggleButtonGroup
            exclusive
            size="small"
            value={category}
            onChange={(_, v: CreatureCategory | "all" | null) =>
              v != null && setCategory(v)
            }
            sx={{ flexWrap: "wrap" }}
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
                sel.length === 0
                  ? "Toutes"
                  : sel.map((s) => CREATURE_SIZE_LABELS[s]).join(", ")
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
                sel.length === 0
                  ? "Toutes"
                  : sel.map((n) => CREATURE_NATURE_LABELS[n]).join(", ")
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
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: "block" }}
            >
              NC : {formatNc(ncRange[0])} – {formatNc(ncRange[1])}
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
              valueLabelFormat={formatNc}
            />
          </Box>

          {/* Réinitialise les filtres (pas le tri). Poussé à droite ; désactivé si rien à effacer. */}
          <Button
            size="small"
            variant="text"
            color="inherit"
            startIcon={<RestartAltIcon />}
            onClick={resetFilters}
            disabled={!filtersActive}
            sx={{
              ml: { md: "auto" },
              flexShrink: 0,
              alignSelf: { xs: "flex-start", md: "center" },
            }}
          >
            Réinitialiser
          </Button>
        </Stack>
      </Box>

      {/* Maître-détail : liste (gauche) + bloc de stats (droite). Empilé sous md. */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "300px 1fr" },
          gap: 2,
          alignItems: "start",
        }}
      >
        {/* Colonne de gauche : en-tête (tri) rattaché à la sidebar + liste défilable. */}
        <Stack
          spacing={1}
          sx={{ position: { md: "sticky" }, top: { md: 84 }, minWidth: 0 }}
        >
          {/* En-tête de la sidebar : choix du tri, en icônes condensées (tooltip au survol). */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 1,
              px: 1.5,
              py: 0.75,
              borderRadius: 2,
              border: "1px solid rgba(255, 255, 255, 0.10)",
              bgcolor: "rgba(0, 0, 0, 0.35)",
              backdropFilter: "blur(6px)",
              WebkitBackdropFilter: "blur(6px)",
            }}
          >
            <Typography
              variant="overline"
              color="text.secondary"
              sx={{ fontWeight: 700, letterSpacing: 0.5 }}
            >
              Trier
            </Typography>
            <ToggleButtonGroup
              exclusive
              size="small"
              value={sortMode}
              onChange={(_, v) => isSortMode(v) && setSortMode(v)}
            >
              {SORT_MODES.map((m) => (
                <ToggleButton
                  key={m.value}
                  value={m.value}
                  aria-label={m.label}
                >
                  <Tooltip title={m.label}>{m.icon}</Tooltip>
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </Box>

          {/* Liste : groupée par catégorie (variantes indentées) ou plate (alpha / NC). */}
          <Box
            sx={{
              borderRadius: 2,
              overflow: "hidden",
              border: "1px solid rgba(255, 255, 255, 0.10)",
              bgcolor: "rgba(0, 0, 0, 0.35)",
              backdropFilter: "blur(6px)",
              WebkitBackdropFilter: "blur(6px)",
              // Sous md la liste peut être longue : on la borne et on la rend défilable
              // pour garder le détail atteignable ; en md+ elle colle au défilement.
              maxHeight: { xs: 360, md: "calc(100vh - 260px)" },
              overflowY: "auto",
            }}
          >
            {visibleIds.length === 0 ? (
              <Typography color="text.secondary" sx={{ p: 2 }}>
                Aucune créature ne correspond à ces critères.
              </Typography>
            ) : sortMode !== "category" ? (
              // Modes `alpha` / `nc` : liste plate, sans en-tête ni imbrication de variante.
              sortedFlat.map((c) => (
                <CreatureRow
                  key={c.id}
                  creature={c}
                  selected={effectiveId === c.id}
                  onSelect={() => setSelectedId(c.id)}
                />
              ))
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
                          display: "block",
                          px: 1.5,
                          pt: 1.25,
                          pb: 0.5,
                          color: "text.secondary",
                          fontWeight: 700,
                          letterSpacing: 0.5,
                          position: "sticky",
                          top: 0,
                          bgcolor: "rgba(20, 20, 23, 0.95)",
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
        </Stack>

        {/* Détail : bloc de stats de la créature sélectionnée (blob chargé à la demande). */}
        <Box sx={{ minWidth: 0 }}>
          <CreatureDetail slug={effectiveId} />
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
  creature: CreatureListItem;
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
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1,
        cursor: "pointer",
        userSelect: "none",
        pl: variant ? 3 : 1.5,
        pr: 1.5,
        py: 0.75,
        borderLeft: "3px solid",
        borderLeftColor: selected ? "primary.main" : "transparent",
        bgcolor: selected
          ? (t) => alpha(t.palette.primary.main, 0.16)
          : "transparent",
        "&:hover": {
          bgcolor: (t) => alpha(t.palette.primary.main, selected ? 0.16 : 0.08),
        },
      }}
    >
      <Typography
        variant="body2"
        sx={{
          flexGrow: 1,
          minWidth: 0,
          fontWeight: selected ? 700 : variant ? 400 : 600,
        }}
        noWrap
      >
        {creature.name}
      </Typography>
      {nc && (
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ fontVariantNumeric: "tabular-nums", flexShrink: 0 }}
        >
          NC {nc}
        </Typography>
      )}
    </Box>
  );
}
