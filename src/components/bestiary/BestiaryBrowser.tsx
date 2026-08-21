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
import { useEffect, useMemo, useRef, useState, type Ref } from "react";
import NextLink from "next/link";
import { useSearchParams } from "next/navigation";
import CategoryIcon from "@mui/icons-material/Category";
import LaunchIcon from "@mui/icons-material/Launch";
import ClearIcon from "@mui/icons-material/Clear";
import PetsOutlinedIcon from "@mui/icons-material/PetsOutlined";
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
  ANIMAL_FORM_CATEGORIES,
  CREATURE_CATEGORIES,
  CREATURE_NATURES,
  CREATURE_SIZES,
  type AnimalFormCategory,
  type CreatureCategory,
  type CreatureNature,
  type CreatureSize,
} from "@/data/schema";
import type { CreatureListItem } from "@/lib/bestiary";
import {
  ANIMAL_FORM_CATEGORY_LABELS,
  CREATURE_CATEGORY_LABELS,
  CREATURE_NATURE_LABELS,
  CREATURE_SIZE_LABELS,
  creatureNcLabel,
  formatNc,
} from "@/lib/ui/creature";
import { BOOKS, DEFAULT_BOOK_ID } from "@/lib/ui/books";
import { bestiaryCreatureHref } from "@/lib/ui/creatureLinks";
import { creatureLinkAccess } from "@/lib/ui/lockedContentAccess";
import { usePersistedState } from "@/lib/ui/usePersistedState";
import { useBestiaryStore } from "@/stores/bestiary";
import { AppAlert } from "@/components/AppAlert";
import { CreatureBlobView } from "./CreatureBlobView";

/** Boutique de l'éditeur (Black Book Éditions) — page d'accueil (fiche produit à préciser plus tard). */
const BBE_STORE_URL = "https://www.black-book-editions.fr/";

/** Normalise pour une recherche insensible aux accents et à la casse. */
const norm = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/**
 * Libellé court d'une source pour l'infobulle des boutons « livre » : retire le
 * préfixe de collection (« Chroniques Oubliées Fantasy 2 — ») et un éventuel suffixe
 * entre parenthèses, pour ne garder que l'essentiel (« Livre de base », « Le Bestiaire »).
 */
const cleanSourceName = (name: string): string =>
  name
    .replace(/^Chroniques Oubliées Fantasy 2\s*[—–-]\s*/i, "")
    .replace(/\s*\([^)]*\)\s*$/, "")
    .trim() || name;

/** Icône du livre de base (celle du header « Livre des règles »), pour le bouton source. */
const RulesBookIcon = BOOKS[DEFAULT_BOOK_ID].Icon;

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

export interface BestiaryBrowserProps {
  /**
   * `'page'` (défaut) : la variante pleine page de `/bestiary` — sélection pilotée par l'URL
   * PARTAGEABLE (`?c=<slug>`), lignes de la liste en vraies ancres.
   * `'drawer'` : la variante intégrée dans un tiroir (écran de MJ) — sélection LOCALE (jamais
   * d'écriture sur l'URL de la campagne), lignes en simples boutons.
   */
  variant?: "page" | "drawer";
  /**
   * Variante `'drawer'` seulement : hauteur en pixels de l'en-tête collé du tiroir, sous lequel
   * la sidebar (tri + liste) se cale au lieu de se caler sous l'en-tête global de la page.
   */
  stickyTop?: number;
}

/**
 * Étage 1 : charge la liste légère du bestiaire (store cache mémoire) et arbitre les
 * états de chargement/erreur/vide avant de monter la vue de filtrage. La vue n'est
 * rendue qu'une fois une liste NON VIDE disponible (elle suppose des bornes de NC
 * calculables) ; l'orchestration async reste ici, la vue reste synchrone.
 */
export function BestiaryBrowser({ variant = "page", stickyTop = 0 }: BestiaryBrowserProps = {}) {
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
        data-glossary-shot="BestiaryBrowser"
      >
        Une erreur est survenue en chargeant les créatures.
      </AppAlert>
    );
  }

  if (status === "unconfigured") {
    return (
      <AppAlert severity="info" title="Bestiaire indisponible" data-glossary-shot="BestiaryBrowser">
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
      <AppAlert severity="info" data-glossary-shot="BestiaryBrowser">
        Aucune créature disponible pour le moment.
      </AppAlert>
    );
  }

  return <BestiaryBrowserView list={list} variant={variant} stickyTop={stickyTop} />;
}

/** Squelette de chargement de l'étage 1 (mime la disposition maître-détail). */
function BestiaryLoadingSkeleton() {
  return (
    <Stack spacing={2} data-glossary-shot="BestiaryBrowser">
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
 * Étage 1 (détail) : rend la créature sélectionnée via `CreatureBlobView` (partagé avec
 * l'écran de MJ) — chargement du blob, cache, résolution de l'héritage des capacités et
 * squelette/erreur y sont mutualisés. Ici on ne gère que l'état « aucune sélection ».
 */
function CreatureDetail({
  slug,
  paidSource = false,
  sourceSlug,
}: {
  slug: string;
  paidSource?: boolean;
  /** Slug de la source de la créature → mappé vers le livre du renvoi (`SourceRef`). */
  sourceSlug?: string;
}) {
  if (!slug) {
    return (
      <Typography color="text.secondary" sx={{ p: 2 }}>
        Sélectionnez une créature.
      </Typography>
    );
  }
  // Chargement du blob + résolution de l'héritage des capacités : mutualisés dans
  // `CreatureBlobView` (partagé avec l'écran de MJ) → rendu identique partout.
  return <CreatureBlobView slug={slug} paidSource={paidSource} sourceSlug={sourceSlug} />;
}

/**
 * Panneau affiché quand l'URL cible une créature ABSENTE de la liste accessible : soit un
 * supplément payant non débloqué (masqué par la RLS — on ne connaît ni son nom ni sa
 * source), soit un slug inexistant. Message GÉNÉRIQUE (aucune fuite de contenu payant) :
 * on oriente vers le déblocage par code (compte) ou l'achat du livre chez l'éditeur.
 */
function UnavailableCreatureNotice() {
  return (
    <Box
      sx={{
        p: 3,
        borderRadius: 2,
        border: "1px solid rgba(255, 255, 255, 0.10)",
        bgcolor: "rgba(0, 0, 0, 0.35)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
      }}
    >
      <Stack spacing={2} sx={{ alignItems: "flex-start" }}>
        <PetsOutlinedIcon sx={{ fontSize: 40, color: "text.secondary" }} />
        <Typography variant="h6">Créature indisponible</Typography>
        <Typography color="text.secondary">
          Cette créature fait partie d&apos;un supplément payant (par exemple «&nbsp;Le
          Bestiaire&nbsp;» de Chroniques Oubliées Fantasy 2, Black Book Éditions) que vous
          n&apos;avez pas débloqué — ou le lien est erroné.
        </Typography>
        <Typography color="text.secondary">
          Si vous possédez le livre, débloquez-le dans votre compte à l&apos;aide de son code.
          Sinon, vous pouvez vous le procurer sur la boutique de l&apos;éditeur.
        </Typography>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ pt: 0.5 }}>
          <Button variant="contained" component={NextLink} href="/account">
            Débloquer dans mon compte
          </Button>
          <Button
            variant="outlined"
            color="inherit"
            component="a"
            href={BBE_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            endIcon={<LaunchIcon />}
          >
            Boutique Black Book Éditions
          </Button>
        </Stack>
        <Button variant="text" color="inherit" component={NextLink} href="/bestiary">
          ← Retour au bestiaire
        </Button>
      </Stack>
    </Box>
  );
}

/** Étage 1 bis : tout le filtrage/tri, sur la liste LÉGÈRE déjà chargée (non vide). */
function BestiaryBrowserView({
  list,
  variant = "page",
  stickyTop = 0,
}: {
  list: CreatureListItem[];
  variant?: "page" | "drawer";
  stickyTop?: number;
}) {
  // Variante intégrée (tiroir) : sélection LOCALE et sidebar calée sous l'en-tête du tiroir,
  // au lieu de l'en-tête global de la page — cf. `ReferenceBrowser`, même patron.
  const embedded = variant === "drawer";
  // Sources payantes débloquées : une créature dont le `sourceId` y figure vient d'un
  // supplément premium → marquée d'une tête de loup à côté de son NC (liste + détail).
  const paidSourceIds = useBestiaryStore((s) => s.paidSourceIds);
  const isPaidCreature = (c: CreatureListItem) => paidSourceIds.has(c.sourceId);

  // Sources accessibles (contenu gratuit + suppléments payants débloqués), avec leur
  // libellé : alimentent le groupe de boutons « livre source ». Trié contenu de base
  // d'abord, puis les payants, chacun par nom. Le groupe n'apparaît qu'à partir de
  // DEUX sources — donc, en pratique, dès qu'un supplément payant est débloqué.
  const sources = useBestiaryStore((s) => s.sources);
  const sortedSources = useMemo(
    () =>
      [...sources].sort(
        (a, b) =>
          Number(a.isPaid) - Number(b.isPaid) || a.name.localeCompare(b.name, "fr"),
      ),
    [sources],
  );
  const showSourceFilter = sortedSources.length > 1;
  const sourceIds = useMemo(() => new Set(sources.map((s) => s.id)), [sources]);
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
  // Filtre catégorie : MULTI-SÉLECTION complémentaire (facette OR), pas exclusif — cocher
  // « Animaux » PUIS « Humanoïdes » ajoute les deux catégories au lieu de remplacer le choix ;
  // tout décocher retombe sur « tous » (tableau vide). Même patron que taille/nature ci-dessous.
  const [categories, setCategories] = usePersistedState<CreatureCategory[]>(
    "bestiary:categories",
    [],
    (raw) =>
      Array.isArray(raw)
        ? (raw.filter((c) =>
            (CREATURE_CATEGORIES as readonly string[]).includes(c),
          ) as CreatureCategory[])
        : undefined,
  );
  // Sous-filtre taxonomique de « Animaux » (Mammifères/Poissons/…, cf. `animalFormCategory`) —
  // n'a de sens que si « Animaux » fait partie des catégories cochées ; masqué sinon.
  const [animalFormCategories, setAnimalFormCategories] = usePersistedState<
    AnimalFormCategory[]
  >(
    "bestiary:animal-form-categories",
    [],
    (raw) =>
      Array.isArray(raw)
        ? (raw.filter((c) =>
            (ANIMAL_FORM_CATEGORIES as readonly string[]).includes(c),
          ) as AnimalFormCategory[])
        : undefined,
  );
  // Filtre « livre source » : id de source ou `"all"`. Une valeur périmée (source
  // devenue inaccessible, ou groupe masqué faute d'une 2ᵉ source) est neutralisée
  // par `effectiveSource` plus bas — sans réécrire le localStorage.
  const [source, setSource] = usePersistedState<string>(
    "bestiary:source",
    "all",
    (raw) => (typeof raw === "string" ? raw : undefined),
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
  // Sélection : en pleine page elle est pilotée par l'URL (`?c=<slug>`) — un refresh ou un lien
  // partagé retombe sur la bonne fiche, lue via useSearchParams (réactif aux clics de ligne / de
  // lien croisé, qui sont de VRAIES ancres). En variante intégrée (tiroir) elle vit en état LOCAL :
  // le tiroir ne doit jamais réécrire l'URL de la campagne à chaque créature consultée.
  const searchParams = useSearchParams();
  const [localSlug, setLocalSlug] = useState("");
  const urlSlug = embedded ? localSlug : searchParams.get("c") ?? "";
  // La créature ciblée est-elle dans la liste ACCESSIBLE (gratuit + payant débloqué) ? Sinon
  // (slug d'un payant non débloqué — masqué par la RLS — ou slug inexistant) → panneau d'info.
  // N'a de sens qu'en pleine page : en tiroir la sélection ne vient jamais d'un lien profond.
  const urlCreature = urlSlug ? list.find((c) => c.id === urlSlug) : undefined;
  const urlUnavailable =
    !embedded && urlSlug !== "" && creatureLinkAccess(list, urlSlug) !== "accessible";

  // Filtre source EFFECTIF : le choix persisté n'est retenu que si le groupe est
  // affiché ET que la source existe toujours (entitlement conservé) ; sinon `"all"`.
  const effectiveSource =
    showSourceFilter && source !== "all" && sourceIds.has(source) ? source : "all";

  // Un filtre (hors tri) est-il actif ? Sert à (dés)activer le bouton de réinitialisation.
  const filtersActive =
    query !== "" ||
    effectiveSource !== "all" ||
    categories.length > 0 ||
    animalFormCategories.length > 0 ||
    sizes.length > 0 ||
    natures.length > 0 ||
    ncRange[0] !== ncMin ||
    ncRange[1] !== ncMax;

  // Réinitialise TOUS les filtres — pas le tri, conservé volontairement.
  const resetFilters = () => {
    setQuery("");
    setSource("all");
    setCategories([]);
    setAnimalFormCategories([]);
    setSizes([]);
    setNatures([]);
    setNcRange([ncMin, ncMax]);
  };

  // Prédicat de correspondance d'une créature aux filtres actifs.
  const matches = useMemo(() => {
    const q = norm(query.trim());
    const categorySet = new Set(categories);
    const animalFormCategorySet = new Set(animalFormCategories);
    const sizeSet = new Set(sizes);
    const natureSet = new Set(natures);
    const [lo, hi] = ncRange;
    const isFullNcRange = lo <= ncMin && hi >= ncMax;
    return (c: CreatureListItem): boolean => {
      if (q && !norm(c.name).includes(q)) return false;
      if (effectiveSource !== "all" && c.sourceId !== effectiveSource) return false;
      if (categorySet.size > 0 && !categorySet.has(c.category)) return false;
      // Sous-filtre taxonomique : n'agit que sur les créatures « Animaux » ET seulement
      // quand cette catégorie est cochée (sinon la rangée de chips reste masquée).
      if (
        categorySet.has("animaux") &&
        animalFormCategorySet.size > 0 &&
        c.category === "animaux" &&
        (!c.animalFormCategory || !animalFormCategorySet.has(c.animalFormCategory))
      )
        return false;
      if (sizeSet.size > 0 && (!c.size || !sizeSet.has(c.size))) return false;
      if (natureSet.size > 0 && !(c.nature ?? []).some((n) => natureSet.has(n)))
        return false;
      // Le gabarit sans NC (ex. « Zombie ») reste visible tant qu'on n'a pas resserré la plage.
      if (c.nc == null) return isFullNcRange;
      return c.nc >= lo && c.nc <= hi;
    };
  }, [
    query,
    effectiveSource,
    categories,
    animalFormCategories,
    sizes,
    natures,
    ncRange,
    ncMin,
    ncMax,
  ]);

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

  // Fiche à afficher, dérivée au rendu : la créature de l'URL si elle est accessible — même
  // filtrée hors de la liste, un lien profond doit la montrer — sinon la première visible
  // (défaut à l'arrivée sur /bestiary sans `?c=`). Sert aussi au surlignage de sa ligne.
  const detailId = urlCreature ? urlCreature.id : (visibleIds[0] ?? "");

  // Navigation d'une ligne de liste : vraie ancre `?c=…` en pleine page (Ctrl/⌘+Clic, partage) ;
  // en tiroir, un simple bouton qui bascule la sélection locale sans toucher à l'URL.
  const rowNav = (id: string): { href?: string; onClick?: () => void } =>
    embedded ? { onClick: () => setLocalSlug(id) } : { href: bestiaryCreatureHref(id) };

  // Sous quoi la sidebar (tri + liste) se cale : l'en-tête global en pleine page, l'en-tête du
  // TIROIR (`stickyTop`) en variante intégrée.
  const sidebarStickyTop = embedded ? stickyTop + 8 : 84;

  // Hauteur RÉELLE (mesurée, jamais devinée — cf. `ReferenceBrowser`/`stuckHeight`) de tout ce qui
  // se trouve AU-DESSUS de la liste dans le tiroir : la barre recherche+filtres, dont la hauteur
  // varie (le groupe « livre source », le retour à la ligne des filtres selon la largeur). Une
  // valeur en dur y calait mal dès que ces filtres changent de hauteur — la liste ET le détail
  // débordaient alors du tiroir, qui devait défiler en entier au lieu de rester à 100 % de la VH.
  const filterBarRef = useRef<HTMLDivElement>(null);
  const [filterBarHeight, setFilterBarHeight] = useState(0);
  useEffect(() => {
    const el = filterBarRef.current;
    if (!embedded || el == null) return;
    const observer = new ResizeObserver(() => setFilterBarHeight(el.offsetHeight));
    observer.observe(el);
    return () => observer.disconnect();
  }, [embedded]);

  const trierHeaderRef = useRef<HTMLDivElement>(null);
  const [trierHeaderHeight, setTrierHeaderHeight] = useState(0);
  useEffect(() => {
    const el = trierHeaderRef.current;
    if (!embedded || el == null) return;
    const observer = new ResizeObserver(() => setTrierHeaderHeight(el.offsetHeight));
    observer.observe(el);
    return () => observer.disconnect();
  }, [embedded]);

  // `stickyTop` (en-tête du tiroir) + son padding-top (16px) + la barre de filtres mesurée + le
  // gap du Stack racine (16px) + l'en-tête « Trier » mesuré + le gap de la sidebar (8px) + le
  // padding-bottom du tiroir (24px) : tout ce qui doit tenir en plus de la liste/du détail dans
  // les 100 % de la VH du tiroir. En pleine page, une estimation suffit (la page défile normalement).
  const listMaxHeight = embedded
    ? `calc(100vh - ${stickyTop + 16 + filterBarHeight + 16 + trierHeaderHeight + 8 + 24}px)`
    : "calc(100vh - 260px)";

  // Amène la ligne sélectionnée dans la vue de la sidebar quand la sélection change (clic de
  // lien croisé, refresh sur `?c=`, lien partagé) — on scrolle UNIQUEMENT le conteneur de la
  // liste, jamais la fenêtre. No-op si la ligne est filtrée hors de la liste (ref non montée).
  const listContainerRef = useRef<HTMLDivElement>(null);
  const selectedRowRef = useRef<HTMLAnchorElement>(null);
  useEffect(() => {
    const container = listContainerRef.current;
    const row = selectedRowRef.current;
    if (!container || !row) return;
    const cr = container.getBoundingClientRect();
    const rr = row.getBoundingClientRect();
    if (rr.top < cr.top) container.scrollTop += rr.top - cr.top - 8;
    else if (rr.bottom > cr.bottom) container.scrollTop += rr.bottom - cr.bottom + 8;
  }, [detailId]);

  return (
    <Stack spacing={2} data-glossary-shot="BestiaryBrowser">
      {/* Barre de recherche + filtres. */}
      <Box
        ref={filterBarRef}
        sx={{
          p: 1.5,
          borderRadius: 2,
          bgcolor: "rgba(0, 0, 0, 0.35)",
          border: "1px solid rgba(255, 255, 255, 0.10)",
          backdropFilter: "blur(6px)",
          WebkitBackdropFilter: "blur(6px)",
        }}
      >
        {/* Recherche + groupe « livre source » sur la même ligne (gain de place
            vertical). Le groupe n'apparaît qu'à partir de deux sources accessibles
            (donc dès qu'un supplément payant est débloqué) et se limite aux icônes :
            livre de base → icône du livre des règles ; Bestiaire → patte. Nom complet
            en infobulle. */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
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

          {showSourceFilter && (
            <ToggleButtonGroup
              exclusive
              size="small"
              value={effectiveSource}
              onChange={(_, v: string | null) => v != null && setSource(v)}
              sx={{ flexShrink: 0 }}
            >
              <ToggleButton value="all">Tous</ToggleButton>
              {sortedSources.map((s) => {
                const Icon = s.isPaid ? PetsOutlinedIcon : RulesBookIcon;
                const label = cleanSourceName(s.name);
                return (
                  <ToggleButton key={s.id} value={s.id} aria-label={label}>
                    <Tooltip title={label}>
                      <Icon sx={{ fontSize: 18 }} />
                    </Tooltip>
                  </ToggleButton>
                );
              })}
            </ToggleButtonGroup>
          )}
        </Box>

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
            size="small"
            value={categories}
            onChange={(_, v: CreatureCategory[]) => setCategories(v)}
            sx={{ flexWrap: "wrap" }}
          >
            {CREATURE_CATEGORIES.map((c) => (
              <ToggleButton key={c} value={c}>
                {CREATURE_CATEGORY_LABELS[c]}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>

          {/* Sous-filtre taxonomique de « Animaux » — n'apparaît que si cette catégorie est
              cochée ci-dessus ; même patron multi-sélection complémentaire. */}
          {categories.includes("animaux") && (
            <ToggleButtonGroup
              size="small"
              value={animalFormCategories}
              onChange={(_, v: AnimalFormCategory[]) => setAnimalFormCategories(v)}
              sx={{ flexWrap: "wrap" }}
            >
              {ANIMAL_FORM_CATEGORIES.map((c) => (
                <ToggleButton key={c} value={c}>
                  {ANIMAL_FORM_CATEGORY_LABELS[c]}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          )}

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
          sx={{ position: { md: "sticky" }, top: { md: sidebarStickyTop }, minWidth: 0 }}
        >
          {/* En-tête de la sidebar : choix du tri, en icônes condensées (tooltip au survol). */}
          <Box
            ref={trierHeaderRef}
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
            ref={listContainerRef}
            sx={{
              borderRadius: 2,
              overflow: "hidden",
              border: "1px solid rgba(255, 255, 255, 0.10)",
              bgcolor: "rgba(0, 0, 0, 0.35)",
              backdropFilter: "blur(6px)",
              WebkitBackdropFilter: "blur(6px)",
              // Sous md la liste peut être longue : on la borne et on la rend défilable
              // pour garder le détail atteignable ; en md+ elle colle au défilement.
              maxHeight: { xs: 360, md: listMaxHeight },
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
                  selected={detailId === c.id}
                  paid={isPaidCreature(c)}
                  {...rowNav(c.id)}
                  innerRef={detailId === c.id ? selectedRowRef : undefined}
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
                      selected={detailId === family.base.id}
                      paid={isPaidCreature(family.base)}
                      {...rowNav(family.base.id)}
                      innerRef={detailId === family.base.id ? selectedRowRef : undefined}
                    />,
                  );
                  for (const v of family.variants) {
                    nodes.push(
                      <CreatureRow
                        key={v.id}
                        creature={v}
                        variant
                        selected={detailId === v.id}
                        paid={isPaidCreature(v)}
                        {...rowNav(v.id)}
                        innerRef={detailId === v.id ? selectedRowRef : undefined}
                      />,
                    );
                  }
                }
                return nodes;
              })()
            )}
          </Box>
        </Stack>

        {/* Détail : soit le panneau « contenu payant » (lien profond vers une créature non
            accessible), soit le bloc de stats de la créature sélectionnée (blob à la demande).
            En tiroir, plafonné à la même hauteur que la liste + défilement propre : un bloc de
            stats long ne doit jamais grandir le tiroir au-delà de 100 % de la VH (sinon c'est le
            TIROIR ENTIER qui défile, liste comprise, alors que seule la fiche déborde). */}
        <Box
          sx={{
            minWidth: 0,
            ...(embedded && {
              maxHeight: { md: listMaxHeight },
              overflowY: { md: "auto" },
            }),
          }}
        >
          {urlUnavailable ? (
            <UnavailableCreatureNotice />
          ) : (
            <CreatureDetail
              slug={detailId}
              paidSource={list.some((c) => c.id === detailId && isPaidCreature(c))}
              // Slug de la source de la créature sélectionnée → mappé vers son livre pour rendre
              // le renvoi (« p. N ») cliquable vers le bon PDF (au lieu d'un livre codé en dur).
              sourceSlug={
                sources.find(
                  (s) => s.id === list.find((c) => c.id === detailId)?.sourceId,
                )?.slug
              }
            />
          )}
        </Box>
      </Box>
    </Stack>
  );
}

/**
 * Ligne de la liste : nom + NC, indentée pour une variante, surlignée si sélectionnée.
 * En pleine page, VRAIE ANCRE (`next/link`) vers `?c=<slug>` — la sélection vit dans l'URL
 * (refresh / partage OK) ; `scroll={false}` pour ne pas remonter la page (on reste en
 * maître-détail). En variante intégrée (tiroir), simple bouton qui bascule la sélection locale
 * (`href` absent, `onClick` renseigné) — cf. `rowNav` dans `BestiaryBrowserView`.
 */
function CreatureRow({
  creature,
  variant = false,
  selected,
  paid = false,
  href,
  onClick,
  innerRef,
}: {
  creature: CreatureListItem;
  variant?: boolean;
  selected: boolean;
  /** Créature d'un supplément payant → tête de loup à gauche du NC. */
  paid?: boolean;
  href?: string;
  onClick?: () => void;
  /** Ref vers la ligne, posée sur la SEULE ligne sélectionnée → défilement de la sidebar. */
  innerRef?: Ref<HTMLAnchorElement | HTMLButtonElement>;
}) {
  const nc = creatureNcLabel(creature);
  return (
    <Box
      ref={innerRef}
      {...(href
        ? { component: NextLink, href, scroll: false }
        : { component: "button" as const, type: "button" as const, onClick })}
      sx={{
        display: "flex",
        alignItems: "center",
        width: "100%",
        gap: 1,
        cursor: "pointer",
        userSelect: "none",
        color: "inherit",
        textDecoration: "none",
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
        // Réinitialisation quand la ligne est un <button> (variante intégrée, `href` absent).
        // Seuls les TROIS AUTRES côtés sont mis à plat : `borderLeft`/`borderLeftColor` restent
        // les nôtres (l'accent de sélection), qu'un `border: 0` shorthand écraserait aussi.
        ...(!href && {
          borderTop: 0,
          borderRight: 0,
          borderBottom: 0,
          outline: "none",
          appearance: "none",
          WebkitAppearance: "none",
          font: "inherit",
          textAlign: "left" as const,
        }),
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
      {/* Marqueur « payant » (tête de loup) à gauche du NC + libellé NC. */}
      {(paid || nc) && (
        <Box
          sx={{ display: "flex", alignItems: "center", gap: 0.5, flexShrink: 0 }}
        >
          {paid && (
            <Tooltip title="Supplément Bestiaire (contenu payant)">
              <Box
                component="span"
                aria-label="Contenu payant"
                sx={{ display: "inline-flex", color: "text.secondary" }}
              >
                <PetsOutlinedIcon sx={{ fontSize: 14 }} />
              </Box>
            </Tooltip>
          )}
          {nc && (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontVariantNumeric: "tabular-nums" }}
            >
              NC {nc}
            </Typography>
          )}
        </Box>
      )}
    </Box>
  );
}
