'use client';

/**
 * Sélecteur « Ajouter une créature du bestiaire » GROUPÉ PAR CATÉGORIE (PER-247).
 *
 * Calqué sur `EquipmentCatalogAutocomplete` (et, comme lui, sur `FeaturePathAutocomplete`) :
 * un `Autocomplete` MUI dont les en-têtes de groupe sont stickys et portent l'icône de
 * catégorie + son libellé + le décompte, pour une lecture immédiate d'un catalogue
 * autrement plat et long. Les créatures sont classées par catégorie (ordre du livre)
 * puis par ordre d'impression (`sortOrder`), ce qui conserve l'imbrication
 * base → variantes du bestiaire ; les variantes sont légèrement indentées.
 *
 * S'appuie sur la LISTE LÉGÈRE de la couche de lecture (`CreatureListItem`), sans jamais
 * coder en dur la source gratuite : le jour où une source payante devient accessible
 * (PER-242), ses créatures apparaissent ici sans retoucher ce composant.
 *
 * Composant de PRÉSENTATION pure : il ne connaît que la liste et remonte le `slug`
 * choisi ; la valeur est CONTRÔLÉE par l'appelant (pour garder l'aperçu affiché).
 */
import { useMemo, type ReactNode } from 'react';
import CategoryIcon from '@mui/icons-material/Category';
import Autocomplete from '@mui/material/Autocomplete';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import type { SxProps, Theme } from '@mui/material/styles';
import { CREATURE_CATEGORIES, type CreatureCategory } from '@/data/schema';
import type { CreatureListItem } from '@/lib/bestiary';
import { CREATURE_CATEGORY_LABELS, creatureNcLabel } from '@/lib/ui/creature';

/** Rang d'affichage de chaque catégorie (ordre canonique du livre `CREATURE_CATEGORIES`). */
const CATEGORY_RANK: Record<CreatureCategory, number> = CREATURE_CATEGORIES.reduce(
  (acc, c, i) => ({ ...acc, [c]: i }),
  {} as Record<CreatureCategory, number>,
);

export interface CreatureCatalogAutocompleteProps {
  /** Liste légère des créatures accessibles (déjà filtrée par la RLS côté lecture). */
  options: CreatureListItem[];
  /** Slug de la créature sélectionnée (`null` = aucune). */
  value: string | null;
  /** Notifie le `slug` choisi (`null` si effacé). */
  onSelect: (slug: string | null) => void;
  label?: string;
  sx?: SxProps<Theme>;
}

export function CreatureCatalogAutocomplete({
  options,
  value,
  onSelect,
  label = 'Choisir une créature',
  sx,
}: CreatureCatalogAutocompleteProps) {
  // Tri → groupes contigus (exigence de `groupBy` côté MUI) : par catégorie, puis par
  // ordre d'impression (les variantes suivent immédiatement leur base).
  const sorted = useMemo(() => {
    return [...options].sort((a, b) => {
      const ra = CATEGORY_RANK[a.category] ?? 99;
      const rb = CATEGORY_RANK[b.category] ?? 99;
      return ra - rb || a.sortOrder - b.sortOrder;
    });
  }, [options]);

  // Décompte par catégorie (rappelé dans l'en-tête de groupe).
  const counts = useMemo(() => {
    const m = new Map<CreatureCategory, number>();
    for (const item of sorted) m.set(item.category, (m.get(item.category) ?? 0) + 1);
    return m;
  }, [sorted]);

  const selectedItem = useMemo(
    () => (value ? sorted.find((o) => o.id === value) ?? null : null),
    [sorted, value],
  );

  return (
    <Autocomplete
      size="small"
      sx={sx}
      options={sorted}
      value={selectedItem}
      openOnFocus
      getOptionLabel={(o) => o.name}
      isOptionEqualToValue={(opt, val) => opt.id === val.id}
      groupBy={(o) => o.category}
      onChange={(_, item) => onSelect(item ? item.id : null)}
      renderGroup={(params) => {
        const category = params.group as CreatureCategory;
        const count = counts.get(category);
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
                // Fond OPAQUE (papier du menu à forte opacité) + flou d'arrière-plan : sans
                // ça, l'en-tête sticky laisse voir les options qui défilent derrière et
                // devient illisible.
                backgroundColor: alpha(theme.palette.background.paper, 0.92),
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                borderLeft: `3px solid ${theme.palette.divider}`,
                borderBottom: `1px solid ${theme.palette.divider}`,
                color: theme.palette.text.secondary,
                fontWeight: 700,
                fontSize: '0.75rem',
              })}
            >
              <CategoryIcon sx={{ fontSize: 18 }} />
              <span>{CREATURE_CATEGORY_LABELS[category] ?? category}</span>
              {count != null ? (
                <Box component="span" sx={{ ml: 'auto', opacity: 0.7, fontWeight: 600 }}>
                  {count}
                </Box>
              ) : null}
            </Box>
            <ul style={{ padding: 0, margin: 0 }}>{params.children}</ul>
          </li>
        );
      }}
      renderOption={(props, item) => {
        const { key, ...optionProps } = props as typeof props & { key?: string };
        const nc = creatureNcLabel(item);
        const isVariant = !!item.baseCreatureId;
        return (
          <Box
            component="li"
            key={key}
            {...optionProps}
            sx={{ display: 'flex', alignItems: 'center', gap: 0.75, pl: isVariant ? 3 : undefined }}
          >
            <Typography
              variant="body2"
              sx={{ whiteSpace: 'normal', flex: '1 1 auto', fontWeight: isVariant ? 400 : 600 }}
            >
              {item.name as ReactNode}
            </Typography>
            {nc ? (
              <Box
                component="span"
                sx={{ color: 'text.secondary', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}
              >
                NC {nc}
              </Box>
            ) : null}
          </Box>
        );
      }}
      renderInput={(params) => <TextField {...params} label={label} size="small" />}
    />
  );
}
