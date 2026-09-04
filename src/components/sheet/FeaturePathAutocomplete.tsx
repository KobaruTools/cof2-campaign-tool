'use client';

/**
 * Sélecteur unifié de capacité GROUPÉE PAR VOIE (PER-177). Autocomplete dont les
 * en-têtes de groupe portent la COULEUR et l'ICÔNE du profil (teinte pleine) OU de la
 * catégorie de prestige (icône étoile + dégradé « métal précieux », `prestigeStyle.ts`,
 * PER-486), pour une lecture immédiate. Point de passage unique de tous les « select » qui
 * listent des capacités par voie : emprunt d'une capacité (`feature-from-path`, p. 41),
 * remplacement du changement d'orientation (p. 43), choix d'une capacité à oublier,
 * ajout manuel d'une capacité sur la fiche…
 *
 * Le libellé long (« Voie — Rang N — Nom ») sert à l'affichage de la valeur retenue et
 * au filtrage texte ; les items de la liste n'affichent que « Rang N — Nom » (la voie
 * étant déjà portée par l'en-tête de groupe coloré) + les hexagones de marqueurs de la
 * capacité (sort *, types d'action A/L/G/M), teintés à la couleur du profil.
 *
 * Deux modes de groupement (`groupMode`) :
 *  - `'path'` (défaut) : un groupe par VOIE (comportement d'origine, utilisé par la montée
 *    de niveau) — groupes toujours dépliés.
 *  - `'profile'` : MÉTA-groupes par PROFIL (une classe = un groupe ; toutes les voies de
 *    peuple regroupées sous « Peuples » ; toutes les voies de prestige sous « Voies de
 *    prestige » ; les voies de mage sous « Voies de mage »). Les groupes vides ne sont
 *    pas indexés (dérivés des options réelles). En mode profil, les groupes sont
 *    REPLIABLES et REPLIÉS par défaut (la liste complète du catalogue est gigantesque) —
 *    l'option montre alors aussi le nom de sa voie. Une recherche texte déplie tout.
 */
import { Fragment, useMemo, useState, type ReactNode } from 'react';
import Autocomplete from '@mui/material/Autocomplete';
import Box from '@mui/material/Box';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import type { SxProps, Theme } from '@mui/material/styles';
import { classById, featureById, pathById } from '@/data';
import type { PrestigeCategory } from '@/data/schema';
import { ANCESTRY_MARKER_COLOR, MAGE_PATH_COLOR, classColor, prestigeCategoryColor } from '@/lib/ui/classColors';
import { codexPathHref } from '@/lib/ui/codex';
import { prestigeGemStops, prestigeMetalGradient } from '@/lib/ui/prestigeStyle';
import { normalizeSearchText } from '@/lib/ui/searchText';
import { AncestryIcon } from '@/components/AncestryIcon';
import { ClassIcon } from '@/components/ClassIcon';
import { PRESTIGE_CATEGORY_LABELS } from '@/components/codex/CodexPathBrowser';
import { FeatureMarkerHexes } from '@/components/FeatureMarkerHex';
import { SourceRef } from '@/components/SourceRef';

/** Mode de groupement de la liste : par voie (défaut) ou par profil (méta-groupes repliables). */
export type FeatureGroupMode = 'path' | 'profile';

/**
 * Nom + habillage (icône/couleur) d'une voie : profil (classId → teinte pleine), prestige (icône
 * étoile en dégradé « métal précieux », teinté par catégorie — même patron que `AvailablePathGroup`
 * du wizard de montée de niveau/`FeaturesByPath`) ou neutre (peuple/mage, sans icône ni couleur ici).
 */
function pathProfile(
  pathId: string,
): { name: string; classId?: string; color?: string; prestigeCategory?: PrestigeCategory } {
  const path = pathById.get(pathId);
  if (!path) return { name: pathId };
  if (path.type === 'class') {
    const classId = path.classIds[0];
    return { name: path.name, classId, color: classColor(classId) };
  }
  if (path.type === 'prestige') {
    return { name: path.name, color: prestigeCategoryColor(path.category), prestigeCategory: path.category };
  }
  return { name: path.name };
}

/** Teinte de dégradé « métal précieux » d'une catégorie de prestige — `undefined` pour les
 *  génériques (repli sur l'or tuné par défaut de `prestigeGemStops`/`prestigeMetalGradient`). */
function prestigeTintOf(category: PrestigeCategory): string | undefined {
  return category !== 'generic' ? prestigeCategoryColor(category) : undefined;
}

/**
 * Clé de CATÉGORIE d'une voie — regroupement à DEUX niveaux (catégorie sticky englobant
 * plusieurs voies, mode `'path'` + `pathOrder`, PER-486) : profil (classe) pour une voie de
 * classe, catégorie de prestige pour une voie de prestige. Repli sur le `pathId` lui-même pour
 * toute autre voie (peuple/mage) — pas de catégorie à afficher, chaque voie reste son propre
 * groupe (cf. `categoryDisplayFromKey`, qui renvoie `undefined` pour ce cas).
 */
function categoryKeyOf(pathId: string): string {
  const path = pathById.get(pathId);
  if (path?.type === 'class') return `class:${path.classIds[0]}`;
  if (path?.type === 'prestige') return `prestige:${path.category}`;
  return pathId;
}

/** Habillage de l'en-tête STICKY d'une catégorie (icône/couleur/dégradé), à partir de la clé
 *  renvoyée par `categoryKeyOf` — `undefined` si la clé n'est pas une vraie catégorie (repli
 *  `pathId`, ex. voie de peuple/mage mêlée à un `pathOrder` catégorisé). */
function categoryDisplayFromKey(key: string): {
  label: string;
  color: string;
  classId?: string;
  prestigeCategory?: PrestigeCategory;
  textGradient?: string;
  barGradient?: string;
} | undefined {
  if (key.startsWith('class:')) {
    const classId = key.slice('class:'.length);
    return { label: classById.get(classId)?.name ?? classId, color: classColor(classId), classId };
  }
  if (key.startsWith('prestige:')) {
    const category = key.slice('prestige:'.length) as PrestigeCategory;
    const tint = prestigeTintOf(category);
    return {
      label: PRESTIGE_CATEGORY_LABELS[category],
      color: prestigeCategoryColor(category),
      prestigeCategory: category,
      textGradient: prestigeMetalGradient(tint),
      barGradient: prestigeMetalGradient(tint, '180deg'),
    };
  }
  return undefined;
}

/** `sx` du texte en dégradé « métal précieux » (`background-clip: text`) — `undefined` = texte
 *  en couleur PLEINE (posée séparément par l'appelant), pas de dégradé à appliquer. */
function gradientTextSx(gradient: string | undefined) {
  return gradient
    ? {
        backgroundImage: gradient,
        WebkitBackgroundClip: 'text' as const,
        backgroundClip: 'text' as const,
        color: 'transparent',
        WebkitTextFillColor: 'transparent',
      }
    : undefined;
}

/**
 * Couleur de teinte d'une voie pour les hexagones de marqueurs (reprend la couleur du
 * profil pour une voie de classe ; teinte dédiée pour mage/peuple ; neutre — `undefined`,
 * repli bleu mana de `FeatureMarkerHexes` — pour une voie de prestige ou inconnue).
 */
function optionColor(pathId: string): string | undefined {
  const path = pathById.get(pathId);
  if (!path) return undefined;
  if (path.type === 'class') return classColor(path.classIds[0]);
  if (path.type === 'mage') return MAGE_PATH_COLOR;
  if (path.type === 'ancestry') return ANCESTRY_MARKER_COLOR;
  return undefined;
}

/** Méta-groupe « par profil » d'une voie : profil (classe), mage, peuples ou prestige. */
interface MetaGroup {
  key: string;
  name: string;
  classId?: string;
  color?: string;
  /** Ordre d'affichage : classes (0) → mage (1) → peuples (2) → prestige (3) → autres (9). */
  order: number;
}

function metaGroupOf(pathId: string): MetaGroup {
  const path = pathById.get(pathId);
  if (!path) return { key: 'other', name: 'Autres', order: 9 };
  if (path.type === 'class') {
    const classId = path.classIds[0];
    return {
      key: `class:${classId}`,
      name: classById.get(classId)?.name ?? classId,
      classId,
      color: classColor(classId),
      order: 0,
    };
  }
  if (path.type === 'mage') return { key: 'mage', name: 'Voies de mage', color: MAGE_PATH_COLOR, order: 1 };
  if (path.type === 'ancestry') return { key: 'ancestry', name: 'Peuples', color: ANCESTRY_MARKER_COLOR, order: 2 };
  return { key: 'prestige', name: 'Voies de prestige', order: 3 };
}

/** Reconstruit l'info d'un méta-groupe depuis sa clé (fournie à `renderGroup` par MUI). */
function metaGroupFromKey(key: string): MetaGroup {
  if (key.startsWith('class:')) {
    const classId = key.slice('class:'.length);
    return { key, name: classById.get(classId)?.name ?? classId, classId, color: classColor(classId), order: 0 };
  }
  if (key === 'mage') return { key, name: 'Voies de mage', color: MAGE_PATH_COLOR, order: 1 };
  if (key === 'ancestry') return { key, name: 'Peuples', color: ANCESTRY_MARKER_COLOR, order: 2 };
  if (key === 'prestige') return { key, name: 'Voies de prestige', order: 3 };
  return { key, name: 'Autres', order: 9 };
}

/** Libellé long d'une capacité : « Voie — Rang N — Nom(*) » (le `*` marque un sort). */
export function featurePathLabel(id: string): string {
  const f = featureById.get(id);
  if (!f) return id;
  const name = pathById.get(f.pathId)?.name ?? f.pathId;
  return `${name} — Rang ${f.rank} — ${f.name}${f.isSpell ? '*' : ''}`;
}

/**
 * Texte comparable d'une option pour la recherche : libellé complet (voie, rang, nom)
 * + nom du PROFIL (ex. « Prêtre ») quand la voie appartient à une classe — le joueur
 * doit pouvoir taper le nom d'un profil et retrouver ses voies, pas seulement le nom
 * exact de la voie. Recherche large, insensible aux accents (`normalizeSearchText`).
 */
function searchTextFor(id: string): string {
  const feature = featureById.get(id);
  const path = feature ? pathById.get(feature.pathId) : undefined;
  const profileName = path?.type === 'class' ? classById.get(path.classIds[0])?.name : undefined;
  return normalizeSearchText([featurePathLabel(id), profileName].filter(Boolean).join(' '));
}

export interface FeaturePathAutocompleteProps {
  /** Ids de capacités ; le composant les regroupe et les trie par voie (ou profil) puis rang. */
  options: string[];
  /** Id retenu (`null` = aucun). */
  value: string | null;
  /** Notifie la sélection (`null` si effacée). */
  onChange: (id: string | null) => void;
  label: string;
  /**
   * Groupement : par voie (`'path'`, défaut) ou par profil (`'profile'` — méta-groupes
   * repliables/repliés par défaut). Voir la doc du composant.
   */
  groupMode?: FeatureGroupMode;
  /** Ids grisés (non sélectionnables), ex. capacités « emprunteuses » (poupées russes, p. 41). */
  disabledIds?: ReadonlySet<string>;
  /**
   * Ordre explicite des GROUPES en mode `'path'` (ids de voie, priorité décroissante) —
   * ex. profil principal → profils déjà engagés → profils hybrides pas encore engagés
   * par ordre de famille (PER-186), plutôt que l'alphabétique brut sur l'id de voie.
   * Une voie absente de la liste passe en dernier. Ignoré en mode `'profile'`.
   */
  pathOrder?: string[];
  /** Suffixe explicatif accolé au libellé d'une option (ex. raison du grisage). */
  optionSuffix?: (id: string) => string | undefined;
  error?: boolean;
  helperText?: ReactNode;
  disabled?: boolean;
  /**
   * Input « déclencheur » (ex. « Oublier une capacité ») : referme la liste après un
   * choix. La valeur restant pilotée par le parent (souvent `null`), l'input se vide.
   */
  clearOnSelect?: boolean;
  sx?: SxProps<Theme>;
}

export function FeaturePathAutocomplete({
  options,
  value,
  onChange,
  label,
  groupMode = 'path',
  disabledIds,
  pathOrder,
  optionSuffix,
  error,
  helperText,
  disabled,
  clearOnSelect = false,
  sx,
}: FeaturePathAutocompleteProps) {
  const byProfile = groupMode === 'profile';
  const pathIndex = useMemo(() => {
    if (!pathOrder) return null;
    return new Map(pathOrder.map((id, i) => [id, i]));
  }, [pathOrder]);
  // Méta-groupes repliés par défaut (ensemble des groupes DÉPLIÉS, vide au départ) et suivi
  // de la saisie : une recherche texte déplie tout (sinon les correspondances resteraient cachées).
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(() => new Set());
  const [query, setQuery] = useState('');
  const filtering = query.trim() !== '';

  // Tri → groupes contigus (exigence de `groupBy` côté MUI). Par voie : pathId puis rang.
  // Par profil : ordre de méta-groupe, puis nom de méta-groupe, puis voie, puis rang.
  const sorted = useMemo(() => {
    const arr = [...options];
    if (byProfile) {
      arr.sort((a, b) => {
        const fa = featureById.get(a);
        const fb = featureById.get(b);
        const ma = metaGroupOf(fa?.pathId ?? '');
        const mb = metaGroupOf(fb?.pathId ?? '');
        if (ma.order !== mb.order) return ma.order - mb.order;
        if (ma.key !== mb.key) return ma.name.localeCompare(mb.name);
        const pa = fa?.pathId ?? '';
        const pb = fb?.pathId ?? '';
        if (pa !== pb) return (pathById.get(pa)?.name ?? pa).localeCompare(pathById.get(pb)?.name ?? pb);
        return (fa?.rank ?? 0) - (fb?.rank ?? 0);
      });
    } else {
      arr.sort((a, b) => {
        const fa = featureById.get(a);
        const fb = featureById.get(b);
        const pa = fa?.pathId ?? '';
        const pb = fb?.pathId ?? '';
        if (pathIndex) {
          const ia = pathIndex.get(pa) ?? Number.MAX_SAFE_INTEGER;
          const ib = pathIndex.get(pb) ?? Number.MAX_SAFE_INTEGER;
          if (ia !== ib) return ia - ib;
        }
        return pa.localeCompare(pb) || (fa?.rank ?? 0) - (fb?.rank ?? 0);
      });
    }
    return arr;
  }, [options, byProfile, pathIndex]);

  // Décompte par méta-groupe (rappelé dans l'en-tête replié), calculé sur le catalogue COMPLET.
  const groupCounts = useMemo(() => {
    if (!byProfile) return null;
    const m = new Map<string, number>();
    for (const id of sorted) {
      const key = metaGroupOf(featureById.get(id)?.pathId ?? '').key;
      m.set(key, (m.get(key) ?? 0) + 1);
    }
    return m;
  }, [sorted, byProfile]);

  const toggleGroup = (key: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  // Ids d'option qui ouvrent une NOUVELLE voie (mode `'path'` + `pathOrder`, PER-486) : sert à
  // insérer le sous-en-tête de voie (icône/couleur/dégradé) juste avant le premier rang de
  // chaque voie, À L'INTÉRIEUR du groupe CATÉGORIE (qui, lui, reste sticky sur toute la hauteur
  // du groupe — bug corrigé : un en-tête de voie sticky logé dans le `<li>` d'une seule voie ne
  // pouvait rester épinglé que le temps de CETTE voie, pas de toute la catégorie qui l'englobe).
  // Calculé en un passage PUR sur `sorted` (jamais par mutation d'une variable partagée entre
  // appels de `renderOption` — interdit par la règle d'immutabilité du compilateur React).
  const voieHeaderIds = useMemo(() => {
    if (!pathOrder) return null;
    const ids = new Set<string>();
    let lastPathId: string | undefined;
    for (const id of sorted) {
      const pathId = featureById.get(id)?.pathId ?? '';
      if (pathId !== lastPathId) ids.add(id);
      lastPathId = pathId;
    }
    return ids;
  }, [sorted, pathOrder]);

  return (
    <Autocomplete
      size="small"
      fullWidth
      sx={sx}
      disabled={disabled}
      data-glossary-shot="FeaturePathAutocomplete"
      options={sorted}
      value={value}
      blurOnSelect={clearOnSelect}
      onInputChange={(_, v) => setQuery(v)}
      filterOptions={(opts, state) => {
        const q = normalizeSearchText(state.inputValue.trim());
        return q ? opts.filter((id) => searchTextFor(id).includes(q)) : opts;
      }}
      groupBy={(id) => {
        if (byProfile) return metaGroupOf(featureById.get(id)?.pathId ?? '').key;
        const pathId = featureById.get(id)?.pathId ?? '';
        // Groupe par CATÉGORIE (une seule voie par rang possible ici, cf. doc composant) quand
        // `pathOrder` est fourni : le `<li>` de groupe englobe alors TOUTES les voies de la
        // catégorie (plusieurs rangs 1 contigus), pas une seule — condition du fix sticky.
        return pathOrder ? categoryKeyOf(pathId) : pathId;
      }}
      getOptionLabel={(id) => {
        const base = featurePathLabel(id);
        const suffix = optionSuffix?.(id);
        return suffix ? `${base}${suffix}` : base;
      }}
      getOptionDisabled={(id) => !!disabledIds?.has(id)}
      isOptionEqualToValue={(opt, val) => opt === val}
      onChange={(_, v) => onChange(v ?? null)}
      renderGroup={(params) => {
        if (byProfile) {
          const meta = metaGroupFromKey(params.group);
          const open = filtering || expanded.has(params.group);
          const count = groupCounts?.get(params.group);
          return (
            <li key={params.key}>
              <Box
                role="button"
                tabIndex={-1}
                aria-expanded={open}
                // preventDefault au mousedown : garde le focus dans l'input (sinon le popup se
                // fermerait avant le clic). Le clic (re)plie le groupe.
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => toggleGroup(params.group)}
                sx={(theme) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.75,
                  px: 1.25,
                  py: 0.5,
                  cursor: 'pointer',
                  position: 'sticky',
                  top: -8,
                  zIndex: 1,
                  // Fond OPAQUE (papier + teinte de profil en surimpression) + flou
                  // d'arrière-plan : l'en-tête sticky laissait sinon transparaître les options
                  // qui défilent derrière et devenait illisible. Verre dépoli, teinte préservée.
                  backgroundColor: alpha(theme.palette.background.paper, 0.92),
                  backgroundImage: `linear-gradient(0deg, ${
                    meta.color ? alpha(meta.color, 0.18) : theme.palette.action.hover
                  }, ${meta.color ? alpha(meta.color, 0.18) : theme.palette.action.hover})`,
                  backdropFilter: 'blur(8px)',
                  WebkitBackdropFilter: 'blur(8px)',
                  borderLeft: `3px solid ${meta.color ?? theme.palette.divider}`,
                  borderBottom: `1px solid ${theme.palette.divider}`,
                  color: meta.color ?? theme.palette.text.secondary,
                  fontWeight: 700,
                  fontSize: '0.75rem',
                  '&:hover': {
                    backgroundImage: `linear-gradient(0deg, ${
                      meta.color ? alpha(meta.color, 0.3) : theme.palette.action.selected
                    }, ${meta.color ? alpha(meta.color, 0.3) : theme.palette.action.selected})`,
                  },
                })}
              >
                <ExpandMoreIcon
                  sx={{
                    fontSize: 18,
                    transition: 'transform 0.15s',
                    transform: open ? 'none' : 'rotate(-90deg)',
                  }}
                />
                {meta.classId ? <ClassIcon classId={meta.classId} size={18} color={meta.color} /> : null}
                <span>{meta.name}</span>
                {count != null ? (
                  <Box component="span" sx={{ ml: 'auto', opacity: 0.7, fontWeight: 600 }}>
                    {count}
                  </Box>
                ) : null}
              </Box>
              {open ? <ul style={{ padding: 0, margin: 0 }}>{params.children}</ul> : null}
            </li>
          );
        }
        // Groupement par CATÉGORIE (`pathOrder` fourni, ex. popover « nouvelle voie », PER-486) :
        // le `<li>` de groupe englobe TOUTES les voies de la catégorie (`categoryKeyOf`/`groupBy`
        // ci-dessus), donc son en-tête STICKY reste épinglé sur toute leur hauteur — pas juste
        // celle d'une seule voie (bug corrigé : un en-tête sticky logé dans le `<li>` d'une seule
        // voie ne pouvait rester accroché que le temps de défiler CETTE voie). Les sous-en-têtes
        // par voie (icône/couleur/dégradé + `SourceRef`) sont rendus PAR `renderOption`, juste
        // avant le premier rang de chaque voie — cf. `voieHeaderIds`.
        if (pathOrder) {
          const cat = categoryDisplayFromKey(params.group);
          if (!cat) {
            // Repli défensif : clé hors catégorie (voie de peuple/mage mêlée à un `pathOrder`
            // catégorisé — pas un cas réel actuel) — pas d'en-tête à afficher.
            return (
              <li key={params.key}>
                <ul style={{ padding: 0, margin: 0 }}>{params.children}</ul>
              </li>
            );
          }
          return (
            <li key={params.key}>
              <Box
                sx={(theme) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.75,
                  px: 1.25,
                  py: 0.5,
                  position: 'sticky',
                  top: -8,
                  zIndex: 1,
                  backgroundColor: alpha(theme.palette.background.paper, 0.92),
                  backgroundImage: `linear-gradient(0deg, ${alpha(cat.color, 0.18)}, ${alpha(cat.color, 0.18)})`,
                  backdropFilter: 'blur(8px)',
                  WebkitBackdropFilter: 'blur(8px)',
                  // Largeur/style TOUJOURS posés (nécessaire à `borderImage`, qui n'a besoin que de
                  // la couleur remplacée) — un `borderLeft: 'none'` sous dégradé annulerait la
                  // largeur et l'anneau ne se peindrait pas.
                  borderLeft: `3px solid ${cat.barGradient ? 'transparent' : cat.color}`,
                  ...(cat.barGradient && { borderImage: `${cat.barGradient} 1` }),
                  borderBottom: `1px solid ${theme.palette.divider}`,
                  color: cat.color,
                  fontWeight: 700,
                  fontSize: '0.75rem',
                })}
              >
                {cat.classId ? (
                  <ClassIcon classId={cat.classId} size={18} color={cat.color} />
                ) : (
                  <AncestryIcon
                    ancestryId="prestige"
                    size={18}
                    gradientStops={prestigeGemStops(cat.prestigeCategory !== 'generic' ? cat.color : undefined)}
                  />
                )}
                <Box component="span" sx={gradientTextSx(cat.textGradient)}>
                  {cat.label}
                </Box>
              </Box>
              <ul style={{ padding: 0, margin: 0 }}>{params.children}</ul>
            </li>
          );
        }
        // Pas de `pathOrder` (usages historiques : changement d'orientation, emprunt de
        // capacité…) : comportement d'origine, chaque VOIE est son propre groupe sticky.
        const { name, classId, color, prestigeCategory } = pathProfile(params.group);
        const sourcePage = pathById.get(params.group)?.sourcePage;
        const isPrestige = !!prestigeCategory;
        // Dégradé « métal précieux » (icône étoile + texte + barre) pour une voie de PRESTIGE —
        // même patron que `AvailablePathGroup` (montée de niveau) / `FeaturesByPath` (fiche) :
        // harmonisation demandée (retour proprio PER-486), les voies de prestige n'avaient ici
        // ni icône, ni couleur, contrairement aux voies de profil.
        const gradientTint = isPrestige ? prestigeTintOf(prestigeCategory) : undefined;
        const textGradient = isPrestige ? prestigeMetalGradient(gradientTint) : undefined;
        const barGradient = isPrestige ? prestigeMetalGradient(gradientTint, '180deg') : undefined;
        return (
          <li key={params.key}>
            <Box
              sx={(theme) => ({
                display: 'flex',
                alignItems: 'center',
                gap: 0.75,
                px: 1.25,
                py: 0.5,
                position: 'sticky',
                top: -8,
                zIndex: 1,
                backgroundColor: alpha(theme.palette.background.paper, 0.92),
                backgroundImage: `linear-gradient(0deg, ${
                  color ? alpha(color, 0.18) : theme.palette.action.hover
                }, ${color ? alpha(color, 0.18) : theme.palette.action.hover})`,
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                borderLeft: `3px solid ${barGradient ? 'transparent' : (color ?? theme.palette.divider)}`,
                ...(barGradient && { borderImage: `${barGradient} 1` }),
                borderBottom: `1px solid ${theme.palette.divider}`,
                fontWeight: 700,
                fontSize: '0.75rem',
                ...(textGradient ? undefined : { color: color ?? theme.palette.text.secondary }),
              })}
            >
              {classId ? (
                <ClassIcon classId={classId} size={18} color={color} />
              ) : isPrestige ? (
                <AncestryIcon ancestryId="prestige" size={18} gradientStops={prestigeGemStops(gradientTint)} />
              ) : null}
              <Box component="span" sx={gradientTextSx(textGradient)}>
                {name}
              </Box>
              {/* Citation de la voie, à DROITE de la barre — mousedown neutralisé pour ne
                  pas voler le focus de l'input (même précaution que `toggleGroup`). `codexHref`
                  collé au sourceRef comme partout ailleurs sur le site (ex. `FeaturesByPath`) —
                  manquait ici, la liste ne proposait aucun accès direct au Codex de la voie. */}
              <Box sx={{ ml: 'auto', flexShrink: 0 }} onMouseDown={(e) => e.preventDefault()}>
                <SourceRef page={sourcePage} term={name} codexHref={codexPathHref(params.group)} />
              </Box>
            </Box>
            <ul style={{ padding: 0, margin: 0 }}>{params.children}</ul>
          </li>
        );
      }}
      renderOption={(props, id) => {
        const { key, ...optionProps } = props as typeof props & { key?: string };
        const f = featureById.get(id);
        const grayed = !!disabledIds?.has(id);
        const suffix = optionSuffix?.(id);
        // En mode profil, le groupe est le PROFIL : on rappelle la voie dans l'option (sinon
        // « Rang 1 — … » serait ambigu entre les voies d'un même profil).
        const pathName = byProfile ? pathById.get(f?.pathId ?? '')?.name : undefined;
        // Sous-en-tête de VOIE (icône/couleur/dégradé + `SourceRef`), inséré juste avant le
        // premier rang de chaque nouvelle voie À L'INTÉRIEUR d'un groupe CATÉGORIE (`pathOrder`
        // fourni, PER-486) — c'est la catégorie qui reste sticky, la voie redevient un simple
        // sous-en-tête statique indenté. `voieHeaderIds` (précalculé en un passage pur) évite de
        // muter une variable partagée entre appels de `renderOption`.
        const voiePathId = f?.pathId ?? '';
        const voie = voieHeaderIds?.has(id) ? pathProfile(voiePathId) : null;
        const voieIsPrestige = !!voie?.prestigeCategory;
        const voieTint = voie?.prestigeCategory ? prestigeTintOf(voie.prestigeCategory) : undefined;
        const voieTextGradient = voieIsPrestige ? prestigeMetalGradient(voieTint) : undefined;
        const voieBarGradient = voieIsPrestige ? prestigeMetalGradient(voieTint, '180deg') : undefined;
        return (
          <Fragment key={key}>
            {voie && (
              <Box
                component="li"
                role="presentation"
                sx={(theme) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.75,
                  px: 1.25,
                  py: 0.5,
                  pl: 2.5,
                  borderLeft: `3px solid ${voieBarGradient ? 'transparent' : (voie.color ?? theme.palette.divider)}`,
                  ...(voieBarGradient && { borderImage: `${voieBarGradient} 1` }),
                  fontWeight: 700,
                  fontSize: '0.75rem',
                  ...(voieTextGradient ? undefined : { color: voie.color ?? theme.palette.text.secondary }),
                })}
              >
                {voie.classId ? (
                  <ClassIcon classId={voie.classId} size={16} color={voie.color} />
                ) : voieIsPrestige ? (
                  <AncestryIcon ancestryId="prestige" size={16} gradientStops={prestigeGemStops(voieTint)} />
                ) : null}
                <Box component="span" sx={gradientTextSx(voieTextGradient)}>
                  {voie.name}
                </Box>
                <Box sx={{ ml: 'auto', flexShrink: 0 }} onMouseDown={(e) => e.preventDefault()}>
                  <SourceRef
                    page={pathById.get(voiePathId)?.sourcePage}
                    term={voie.name}
                    codexHref={codexPathHref(voiePathId)}
                  />
                </Box>
              </Box>
            )}
            <Box
              component="li"
              {...optionProps}
              sx={{ opacity: grayed ? 0.55 : 1, display: 'flex', alignItems: 'center', gap: 0.75 }}
            >
              <Typography variant="body2" sx={{ whiteSpace: 'normal', flex: '1 1 auto' }}>
                {pathName ? (
                  <Box component="span" sx={{ color: 'text.secondary', mr: 0.5 }}>
                    {pathName} ·
                  </Box>
                ) : null}
                <Box component="span" sx={{ color: 'text.secondary', mr: 0.5 }}>
                  Rang {f?.rank} —
                </Box>
                {f?.name}
                {suffix ? (
                  <Box component="span" sx={{ color: 'text.secondary' }}>
                    {suffix}
                  </Box>
                ) : null}
              </Typography>
              {/* Hexagones de marqueurs (sort *, types d'action) teintés à la couleur du profil —
                  remplace l'ancien `*` textuel, plus lisible. */}
              {f ? (
                <FeatureMarkerHexes feature={f} color={optionColor(f.pathId)} size={16} sx={{ flexShrink: 0 }} />
              ) : null}
            </Box>
          </Fragment>
        );
      }}
      renderInput={(params) => (
        <TextField {...params} label={label} error={error} helperText={helperText} />
      )}
    />
  );
}
