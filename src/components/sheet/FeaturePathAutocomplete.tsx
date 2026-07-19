'use client';

/**
 * Sélecteur unifié de capacité GROUPÉE PAR VOIE (PER-177). Autocomplete dont les
 * en-têtes de groupe portent la COULEUR et l'ICÔNE du profil de la voie, pour une
 * lecture immédiate. Point de passage unique de tous les « select » qui listent des
 * capacités par voie de profil : emprunt d'une capacité (`feature-from-path`, p. 41),
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
import { useMemo, useState, type ReactNode } from 'react';
import Autocomplete from '@mui/material/Autocomplete';
import Box from '@mui/material/Box';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import type { SxProps, Theme } from '@mui/material/styles';
import { classById, featureById, pathById } from '@/data';
import { ANCESTRY_MARKER_COLOR, MAGE_PATH_COLOR, classColor } from '@/lib/ui/classColors';
import { ClassIcon } from '@/components/ClassIcon';
import { FeatureMarkerHexes } from '@/components/FeatureMarkerHex';

/** Mode de groupement de la liste : par voie (défaut) ou par profil (méta-groupes repliables). */
export type FeatureGroupMode = 'path' | 'profile';

/** Nom + profil (classId → couleur/icône) d'une voie ; couleur absente hors voie de profil. */
function pathProfile(pathId: string): { name: string; classId?: string; color?: string } {
  const path = pathById.get(pathId);
  if (!path) return { name: pathId };
  if (path.type === 'class') {
    const classId = path.classIds[0];
    return { name: path.name, classId, color: classColor(classId) };
  }
  return { name: path.name };
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
  optionSuffix,
  error,
  helperText,
  disabled,
  clearOnSelect = false,
  sx,
}: FeaturePathAutocompleteProps) {
  const byProfile = groupMode === 'profile';
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
        return (fa?.pathId ?? '').localeCompare(fb?.pathId ?? '') || (fa?.rank ?? 0) - (fb?.rank ?? 0);
      });
    }
    return arr;
  }, [options, byProfile]);

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

  return (
    <Autocomplete
      size="small"
      fullWidth
      sx={sx}
      disabled={disabled}
      options={sorted}
      value={value}
      blurOnSelect={clearOnSelect}
      onInputChange={(_, v) => setQuery(v)}
      groupBy={(id) =>
        byProfile
          ? metaGroupOf(featureById.get(id)?.pathId ?? '').key
          : featureById.get(id)?.pathId ?? ''
      }
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
        const { name, classId, color } = pathProfile(params.group);
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
                // Fond OPAQUE (papier + teinte de profil) + flou d'arrière-plan, comme la
                // branche « par profil » : lisibilité de l'en-tête sticky au défilement.
                backgroundColor: alpha(theme.palette.background.paper, 0.92),
                backgroundImage: `linear-gradient(0deg, ${
                  color ? alpha(color, 0.18) : theme.palette.action.hover
                }, ${color ? alpha(color, 0.18) : theme.palette.action.hover})`,
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                borderLeft: `3px solid ${color ?? theme.palette.divider}`,
                borderBottom: `1px solid ${theme.palette.divider}`,
                color: color ?? theme.palette.text.secondary,
                fontWeight: 700,
                fontSize: '0.75rem',
              })}
            >
              {classId ? <ClassIcon classId={classId} size={18} color={color} /> : null}
              <span>{name}</span>
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
        return (
          <Box
            component="li"
            key={key}
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
        );
      }}
      renderInput={(params) => (
        <TextField {...params} label={label} error={error} helperText={helperText} />
      )}
    />
  );
}
