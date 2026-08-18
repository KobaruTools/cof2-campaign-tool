'use client';

/**
 * Navigateur « Équipement » du Codex (PER-422, dernière sous-page de la milestone) — vue
 * EXHAUSTIVE/COMPARAISON (retour propriétaire), là où `ItemDialog` (création/édition de
 * personnage) ne montre qu'un objet à la fois : un tableau triable/filtrable par catégorie plutôt
 * qu'une grille de cartes (le patron des 4 sous-pages précédentes), les colonnes pertinentes
 * différant trop d'une catégorie à l'autre (DM/portée pour une arme, DEF/AGI max pour une armure,
 * prix/description pour du matériel).
 *
 * Onglets Armes / Armures / Boucliers / Matériel (retour propriétaire), chacun son propre tableau
 * de colonnes. Lit `equipment` (`@/data`, DÉJÀ fusionné avec un éventuel contenu payant via
 * `mergeEntries`, PER-321) plutôt que les tableaux `weapons`/`armors`/`shields`/`gear` bruts —
 * même registre que le reste de l'app, pour qu'une future extension payante y apparaisse sans
 * changement ici.
 *
 * Filtres armes (retour propriétaire) : type de DM (`damageType`, champ structuré PER-422 — voir
 * `Weapon.damageType` dans `schema.ts`) et catégorie de prise (`weaponCategory`). Recherche texte
 * par nom sur les 4 onglets, via `normalizeSearchText` (piège accents/ligatures FR déjà rencontré).
 */
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore';
import Box from '@mui/material/Box';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Select from '@mui/material/Select';
import type { SelectChangeEvent } from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Tabs from '@mui/material/Tabs';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { alpha, type Theme } from '@mui/material/styles';
import { equipment, equipmentById } from '@/data';
import type { Armor, DamageType, EquipmentItem, Gear, Shield, Weapon, WeaponCategory } from '@/data/schema';
import { progression } from '@/data/progression';
import { formatWeaponDamage } from '@/lib/character/weaponDamage';
import { catalogItemIconId } from '@/lib/ui/itemIcon';
import { normalizeSearchText } from '@/lib/ui/searchText';
import { DamageValue } from '@/components/DamageValue';
import { ItemIcon } from '@/components/ItemIcon';
import { PriceMention, PriceTag, priceToCopper } from '@/components/codex/PriceTag';
import { SourceRef } from '@/components/SourceRef';
import { GlossaryRichText } from '@/components/sheet/FeatureRichText';

const weapons = equipment.filter((e): e is Weapon => e.category === 'weapon');
const armors = equipment.filter((e): e is Armor => e.category === 'armor');
const shields = equipment.filter((e): e is Shield => e.category === 'shield');
const gear = equipment.filter((e): e is Gear => e.category === 'gear');

const DAMAGE_TYPE_LABELS: Record<DamageType, string> = {
  bludgeoning: 'Contondant',
  piercing: 'Perforant',
  slashing: 'Tranchant',
};

/** Mêmes libellés que `ItemDialog`/`characterDerivedView` (pas de 3e vocabulaire). */
const WEAPON_CATEGORY_LABELS: Record<WeaponCategory, string> = {
  light: 'Légère',
  oneHand: 'À une main',
  oneOrTwoHands: 'À une ou deux mains',
  twoHands: 'À deux mains',
};

/** Dernier niveau de la table de progression, pour résoudre un dé ÉVOLUTIF (couleuvrine, baliste)
 * à son maximum plutôt que de l'afficher figé au d4° de base — cohérent avec un catalogue qui
 * montre la puissance atteignable de l'arme, pas seulement son état « niveau 1 ». */
const MAX_LEVEL = progression.maxLevel;

type SortDir = 'asc' | 'desc';
interface SortState<K extends string> {
  key: K;
  dir: SortDir;
}

function sortIcon<K extends string>(sort: SortState<K> | null, key: K) {
  if (sort?.key !== key) return <UnfoldMoreIcon fontSize="small" sx={{ opacity: 0.4 }} />;
  return sort.dir === 'asc' ? (
    <ArrowUpwardIcon fontSize="small" />
  ) : (
    <ArrowDownwardIcon fontSize="small" />
  );
}

function SortableHeader<K extends string>({
  label,
  sortKey,
  sort,
  onPick,
  align = 'left',
}: {
  label: string;
  sortKey: K;
  sort: SortState<K> | null;
  onPick: (key: K) => void;
  align?: 'left' | 'right' | 'center';
}) {
  return (
    <TableCell align={align} sortDirection={sort?.key === sortKey ? sort.dir : false}>
      <Box
        component="span"
        onClick={() => onPick(sortKey)}
        sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, cursor: 'pointer', userSelect: 'none' }}
      >
        {label}
        {sortIcon(sort, sortKey)}
      </Box>
    </TableCell>
  );
}

function useSort<K extends string>(defaultKey: K) {
  const [sort, setSort] = useState<SortState<K>>({ key: defaultKey, dir: 'asc' });
  const pick = (key: K) =>
    setSort((prev) => (prev.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }));
  return { sort, pick };
}

const tableSx = {
  borderRadius: 2,
  border: '1px solid rgba(255, 255, 255, 0.10)',
  bgcolor: 'rgba(0, 0, 0, 0.35)',
  overflowX: 'auto',
} as const;

/** Panneau plein-cadre de la page (retour propriétaire) — même idiome « verre noir » que les
 * cartes des autres sous-pages du Codex (`rowSx` de `CodexMountsBrowser`/`CodexFamiliarsBrowser`),
 * étendu à TOUTE la section plutôt qu'à chaque carte : fond noir légèrement opaque + flou de
 * l'illustration de fond derrière. */
const panelSx = {
  borderRadius: 2,
  border: '1px solid rgba(255, 255, 255, 0.10)',
  bgcolor: 'rgba(0, 0, 0, 0.35)',
  backdropFilter: 'blur(6px)',
  WebkitBackdropFilter: 'blur(6px)',
  p: { xs: 2, sm: 3 },
} as const;

/** Ligne sur deux légèrement plus sombre (retour propriétaire), pour mieux distinguer les lignes
 * d'un tableau dense — overlay noir additionnel au-dessus du fond déjà translucide du tableau. */
const zebraSx = (index: number) => (index % 2 === 1 ? { bgcolor: 'rgba(0, 0, 0, 0.18)' } : undefined);

/** Ligne ciblée par le bouton codex d'un objet (`?id=<equipmentId>`, cf. `equipmentCodexHref`) —
 * même liseré que le surlignage des autres sous-pages du Codex (`CodexGodsBrowser`…), en `outline`
 * plutôt qu'en bordure : ne décale pas les colonnes voisines dans une grille de tableau dense. */
const highlightRowSx = (theme: Theme) => ({
  outline: `2px solid ${alpha(theme.palette.primary.main, 0.6)}`,
  outlineOffset: -2,
});

const ALL = '__all__';

/** Nom de l'objet précédé de SON icône d'inventaire (MÊME vocabulaire que la fiche personnage,
 * `ItemIcon`/`catalogItemIconId`) — les 4 onglets partagent ce rendu de cellule. */
function NameCell({ item, sx }: { item: EquipmentItem; sx?: object }) {
  return (
    <TableCell sx={{ fontWeight: 600, ...sx }}>
      <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
        <ItemIcon id={catalogItemIconId(item)} size={18} />
        {item.name}
      </Box>
    </TableCell>
  );
}

/** Mention de prix « à la volée » dans une prose (« 40 pa », « 5-50 pa » — prix à fourchette, cf.
 * l'en-tête de `equipment.ts`). Capture le MONTANT tel qu'écrit (fourchette possible) + l'unité. */
const CURRENCY_MENTION_RE = /(\d+(?:[-–]\d+)?)\s*(pa|po|pc)\b/g;

/**
 * Segmente une prose entre mentions de PRIX (`CURRENCY_MENTION_RE`) et texte courant, ce dernier
 * passant par `GlossaryRichText` — le chokepoint qui parse déjà DÉS (`{1d6}`), renvois de page
 * (« (p. N) ») et glossaire (`DEF`, `AGI`…). Descriptions du Codex Équipement (PER-422) : plus de
 * texte verbatim brut, tout ce qui a un rendu établi ailleurs dans l'app le reçoit ici aussi.
 */
function GearDescriptionText({ value }: { value: string }) {
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let i = 0;
  for (const m of value.matchAll(CURRENCY_MENTION_RE)) {
    const index = m.index ?? 0;
    if (index > lastIndex) {
      nodes.push(<GlossaryRichText key={i++}>{value.slice(lastIndex, index)}</GlossaryRichText>);
    }
    nodes.push(<PriceMention key={i++} amountText={m[1]} unit={m[2]} />);
    lastIndex = index + m[0].length;
  }
  if (lastIndex < value.length) {
    nodes.push(<GlossaryRichText key={i++}>{value.slice(lastIndex)}</GlossaryRichText>);
  }
  return <>{nodes}</>;
}

// ---------------------------------------------------------------------------
// Onglet Armes
// ---------------------------------------------------------------------------

type WeaponSortKey = 'name' | 'damage' | 'price';

function WeaponsTab({ highlightId }: { highlightId?: string }) {
  const [search, setSearch] = useState('');
  const [damageTypeFilter, setDamageTypeFilter] = useState<string>(ALL);
  const [categoryFilter, setCategoryFilter] = useState<string>(ALL);
  const { sort, pick } = useSort<WeaponSortKey>('name');

  const rows = useMemo(() => {
    const needle = normalizeSearchText(search);
    let list = weapons.filter((w) => {
      if (needle && !normalizeSearchText(w.name).includes(needle)) return false;
      if (damageTypeFilter !== ALL && w.damageType !== damageTypeFilter) return false;
      if (categoryFilter !== ALL && w.weaponCategory !== categoryFilter) return false;
      return true;
    });
    list = [...list].sort((a, b) => {
      let cmp = 0;
      if (sort.key === 'name') cmp = a.name.localeCompare(b.name, 'fr');
      else if (sort.key === 'price') cmp = priceToCopper(a.price) - priceToCopper(b.price);
      else cmp = maxWeaponDamageValue(a) - maxWeaponDamageValue(b);
      return sort.dir === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [search, damageTypeFilter, categoryFilter, sort]);

  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
        <TextField
          size="small"
          label="Rechercher une arme"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ minWidth: 220 }}
        />
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel id="weapon-damage-type-label">Type de DM</InputLabel>
          <Select
            labelId="weapon-damage-type-label"
            label="Type de DM"
            value={damageTypeFilter}
            onChange={(e: SelectChangeEvent) => setDamageTypeFilter(e.target.value)}
          >
            <MenuItem value={ALL}>Tous</MenuItem>
            {(Object.keys(DAMAGE_TYPE_LABELS) as DamageType[]).map((dt) => (
              <MenuItem key={dt} value={dt}>
                {DAMAGE_TYPE_LABELS[dt]}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel id="weapon-category-label">Catégorie de prise</InputLabel>
          <Select
            labelId="weapon-category-label"
            label="Catégorie de prise"
            value={categoryFilter}
            onChange={(e: SelectChangeEvent) => setCategoryFilter(e.target.value)}
          >
            <MenuItem value={ALL}>Toutes</MenuItem>
            {(Object.keys(WEAPON_CATEGORY_LABELS) as WeaponCategory[]).map((c) => (
              <MenuItem key={c} value={c}>
                {WEAPON_CATEGORY_LABELS[c]}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack>
      <TableContainer component={Paper} sx={tableSx}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <SortableHeader label="Nom" sortKey="name" sort={sort} onPick={pick} />
              <TableCell>Catégorie</TableCell>
              <SortableHeader label="DM" sortKey="damage" sort={sort} onPick={pick} />
              <TableCell>Type de DM</TableCell>
              <TableCell>Portée</TableCell>
              <SortableHeader label="Prix" sortKey="price" sort={sort} onPick={pick} align="right" />
              <TableCell align="right">Page</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((w, i) => (
              <TableRow
                key={w.id}
                id={`codex-equip-${w.id}`}
                hover
                sx={(theme) => ({ ...zebraSx(i), ...(w.id === highlightId ? highlightRowSx(theme) : null) })}
              >
                <NameCell item={w} />
                <TableCell>{WEAPON_CATEGORY_LABELS[w.weaponCategory]}</TableCell>
                <TableCell>
                  <DamageValue damage={formatWeaponDamage(w.damage, MAX_LEVEL)} size={16} />
                  {w.twoHandedDamage && (
                    <>
                      {' / '}
                      <DamageValue damage={formatWeaponDamage(w.twoHandedDamage, MAX_LEVEL)} size={16} />
                    </>
                  )}
                </TableCell>
                <TableCell>{DAMAGE_TYPE_LABELS[w.damageType]}</TableCell>
                <TableCell>{w.range ?? '—'}</TableCell>
                <TableCell align="right">
                  <Box sx={{ display: 'inline-flex' }}>
                    <PriceTag price={w.price} />
                  </Box>
                </TableCell>
                <TableCell align="right">
                  <SourceRef page={w.sourcePage} term={w.name} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Stack>
  );
}

/** Valeur MAX de DM (dé de base résolu à son maximum, dé à deux mains retenu s'il est meilleur) —
 * sert uniquement au TRI de la colonne DM, pas à l'affichage (qui reste `<DamageValue>`). */
function maxWeaponDamageValue(w: Weapon): number {
  const dieMax = (die: string) => Number.parseInt(die.slice(1), 10);
  const value = (d: Weapon['damage']) => d.count * dieMax(d.die) + (d.modifier ?? 0);
  return Math.max(value(w.damage), w.twoHandedDamage ? value(w.twoHandedDamage) : 0);
}

// ---------------------------------------------------------------------------
// Onglet Armures
// ---------------------------------------------------------------------------

type ArmorSortKey = 'name' | 'def' | 'maxAgi' | 'price';

function ArmorsTab({ highlightId }: { highlightId?: string }) {
  const [search, setSearch] = useState('');
  const { sort, pick } = useSort<ArmorSortKey>('def');

  const rows = useMemo(() => {
    const needle = normalizeSearchText(search);
    let list = armors.filter((a) => !needle || normalizeSearchText(a.name).includes(needle));
    list = [...list].sort((a, b) => {
      let cmp = 0;
      if (sort.key === 'name') cmp = a.name.localeCompare(b.name, 'fr');
      else if (sort.key === 'def') cmp = a.def - b.def;
      else if (sort.key === 'maxAgi') cmp = (a.maxAgi ?? Infinity) - (b.maxAgi ?? Infinity);
      else cmp = priceToCopper(a.price) - priceToCopper(b.price);
      return sort.dir === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [search, sort]);

  return (
    <Stack spacing={2}>
      <TextField
        size="small"
        label="Rechercher une armure"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        sx={{ minWidth: 220, alignSelf: 'flex-start' }}
      />
      <TableContainer component={Paper} sx={tableSx}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <SortableHeader label="Nom" sortKey="name" sort={sort} onPick={pick} />
              <SortableHeader label="DEF" sortKey="def" sort={sort} onPick={pick} align="right" />
              <SortableHeader label="AGI max" sortKey="maxAgi" sort={sort} onPick={pick} align="right" />
              <SortableHeader label="Prix" sortKey="price" sort={sort} onPick={pick} align="right" />
              <TableCell align="right">Page</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((a, i) => (
              <TableRow
                key={a.id}
                id={`codex-equip-${a.id}`}
                hover
                sx={(theme) => ({ ...zebraSx(i), ...(a.id === highlightId ? highlightRowSx(theme) : null) })}
              >
                <NameCell item={a} />
                <TableCell align="right">+{a.def}</TableCell>
                <TableCell align="right">{a.maxAgi ?? '—'}</TableCell>
                <TableCell align="right">
                  <Box sx={{ display: 'inline-flex' }}>
                    <PriceTag price={a.price} />
                  </Box>
                </TableCell>
                <TableCell align="right">
                  <SourceRef page={a.sourcePage} term={a.name} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Stack>
  );
}

// ---------------------------------------------------------------------------
// Onglet Boucliers
// ---------------------------------------------------------------------------

type ShieldSortKey = 'name' | 'def' | 'price';

function ShieldsTab({ highlightId }: { highlightId?: string }) {
  const { sort, pick } = useSort<ShieldSortKey>('def');

  const rows = useMemo(() => {
    return [...shields].sort((a, b) => {
      let cmp = 0;
      if (sort.key === 'name') cmp = a.name.localeCompare(b.name, 'fr');
      else if (sort.key === 'def') cmp = a.def - b.def;
      else cmp = priceToCopper(a.price) - priceToCopper(b.price);
      return sort.dir === 'asc' ? cmp : -cmp;
    });
  }, [sort]);

  return (
    <TableContainer component={Paper} sx={tableSx}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <SortableHeader label="Nom" sortKey="name" sort={sort} onPick={pick} />
            <SortableHeader label="DEF" sortKey="def" sort={sort} onPick={pick} align="right" />
            <SortableHeader label="Prix" sortKey="price" sort={sort} onPick={pick} align="right" />
            <TableCell align="right">Page</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((s, i) => (
            <TableRow
              key={s.id}
              id={`codex-equip-${s.id}`}
              hover
              sx={(theme) => ({ ...zebraSx(i), ...(s.id === highlightId ? highlightRowSx(theme) : null) })}
            >
              <NameCell item={s} />
              <TableCell align="right">+{s.def}</TableCell>
              <TableCell align="right">
                <Box sx={{ display: 'inline-flex' }}>
                  <PriceTag price={s.price} />
                </Box>
              </TableCell>
              <TableCell align="right">
                <SourceRef page={s.sourcePage} term={s.name} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

// ---------------------------------------------------------------------------
// Onglet Matériel
// ---------------------------------------------------------------------------

type GearSortKey = 'name' | 'price';

function GearTab({ highlightId }: { highlightId?: string }) {
  const [search, setSearch] = useState('');
  const { sort, pick } = useSort<GearSortKey>('name');

  const rows = useMemo(() => {
    const needle = normalizeSearchText(search);
    let list = gear.filter((g) => !needle || normalizeSearchText(g.name).includes(needle));
    list = [...list].sort((a, b) => {
      const cmp = sort.key === 'name' ? a.name.localeCompare(b.name, 'fr') : priceToCopper(a.price) - priceToCopper(b.price);
      return sort.dir === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [search, sort]);

  return (
    <Stack spacing={2}>
      <TextField
        size="small"
        label="Rechercher du matériel"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        sx={{ minWidth: 220, alignSelf: 'flex-start' }}
      />
      <TableContainer component={Paper} sx={tableSx}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <SortableHeader label="Nom" sortKey="name" sort={sort} onPick={pick} />
              <TableCell>Description</TableCell>
              <SortableHeader label="Prix" sortKey="price" sort={sort} onPick={pick} align="right" />
              <TableCell align="right">Page</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((g, i) => (
              <TableRow
                key={g.id}
                id={`codex-equip-${g.id}`}
                hover
                sx={(theme) => ({ ...zebraSx(i), ...(g.id === highlightId ? highlightRowSx(theme) : null) })}
              >
                <NameCell item={g} sx={{ whiteSpace: 'nowrap' }} />
                <TableCell sx={{ color: 'text.secondary', maxWidth: 480 }}>
                  {g.description ? <GearDescriptionText value={g.description} /> : '—'}
                </TableCell>
                <TableCell align="right">
                  <Box sx={{ display: 'inline-flex' }}>
                    <PriceTag price={g.price} />
                  </Box>
                </TableCell>
                <TableCell align="right">
                  <SourceRef page={g.sourcePage} term={g.name} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Stack>
  );
}

// ---------------------------------------------------------------------------

const TABS = ['weapons', 'armors', 'shields', 'gear'] as const;
type TabKey = (typeof TABS)[number];
const TAB_LABELS: Record<TabKey, string> = {
  weapons: 'Armes',
  armors: 'Armures',
  shields: 'Boucliers',
  gear: 'Matériel',
};

/** Onglet portant la catégorie d'un objet — pour ouvrir automatiquement le bon onglet quand
 * `?id=<equipmentId>` cible un objet précis (bouton codex, cf. `equipmentCodexHref`). */
const TAB_OF_CATEGORY: Record<EquipmentItem['category'], TabKey> = {
  weapon: 'weapons',
  armor: 'armors',
  shield: 'shields',
  gear: 'gear',
};

export function CodexEquipmentBrowser() {
  // Ciblage direct d'un OBJET précis (suite bouton codex, `?id=<equipmentId>`, cf.
  // `equipmentCodexHref` — branché par `EquipmentList`/`ItemDialog`) : ouvre l'onglet de sa
  // catégorie, surligne sa ligne (`highlightRowSx`) et y défile — même compensation de l'`AppBar`
  // sticky que les autres sous-pages du Codex (`CodexPathBrowser`…).
  const requestedId = useSearchParams().get('id');
  const requestedItem = requestedId ? equipmentById.get(requestedId) : undefined;

  const [tab, setTab] = useState<TabKey>(() => (requestedItem ? TAB_OF_CATEGORY[requestedItem.category] : 'weapons'));
  // Resynchronisé seulement quand `requestedId` CHANGE (nouveau clic sur un bouton codex), pas à
  // chaque rendu — sinon cliquer un autre onglet à la main y ramènerait aussitôt (patron
  // `CodexPathBrowser`, « adjusting state when a prop changes »).
  const [lastRequestedId, setLastRequestedId] = useState(requestedId);
  if (requestedId !== lastRequestedId) {
    setLastRequestedId(requestedId);
    if (requestedItem) setTab(TAB_OF_CATEGORY[requestedItem.category]);
  }

  useEffect(() => {
    if (!requestedId) return;
    const el = document.getElementById(`codex-equip-${requestedId}`);
    if (!el) return;
    const headerHeight = document.getElementById('app-header')?.getBoundingClientRect().height ?? 0;
    const top = el.getBoundingClientRect().top + window.scrollY - headerHeight - 12;
    window.scrollTo({ top, behavior: 'smooth' });
  }, [requestedId, tab]);

  return (
    <Box sx={panelSx}>
      <Typography variant="h4" component="h1" sx={{ fontWeight: 700, mb: 1 }}>
        Équipement
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Armes, armures, boucliers et matériel du livre de base — vue exhaustive, hors personnage.
      </Typography>
      <Tabs value={tab} onChange={(_, v: TabKey) => setTab(v)} sx={{ mb: 2 }}>
        {TABS.map((t) => (
          <Tab key={t} value={t} label={TAB_LABELS[t]} />
        ))}
      </Tabs>
      {tab === 'weapons' && <WeaponsTab highlightId={requestedId ?? undefined} />}
      {tab === 'armors' && <ArmorsTab highlightId={requestedId ?? undefined} />}
      {tab === 'shields' && <ShieldsTab highlightId={requestedId ?? undefined} />}
      {tab === 'gear' && <GearTab highlightId={requestedId ?? undefined} />}
    </Box>
  );
}
