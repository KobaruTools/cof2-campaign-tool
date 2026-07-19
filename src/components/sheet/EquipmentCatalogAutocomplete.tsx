'use client';

/**
 * Sélecteur « Ajouter un objet du catalogue » GROUPÉ PAR TYPE D'OBJET.
 *
 * Reprend la mise en forme du sélecteur de rang de voie (`FeaturePathAutocomplete`) :
 * un `Autocomplete` MUI dont les en-têtes de groupe sont stickys et portent l'icône du
 * type (PER-213) + son libellé, pour une lecture immédiate d'un catalogue autrement plat
 * et long. Les objets sont classés par type (arme → armure → bouclier → consommable →
 * matériel → trésor → divers) puis par nom.
 *
 * Composant de PRÉSENTATION pure : il ne connaît que le catalogue et remonte l'`id`
 * choisi (comme l'ancien `<Autocomplete>` brut qu'il remplace).
 */
import { useMemo, type ReactNode } from 'react';
import Autocomplete from '@mui/material/Autocomplete';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import type { SxProps, Theme } from '@mui/material/styles';
import type { EquipmentItem } from '@/data/schema';
import type { ItemType } from '@/lib/character/types';
import { ITEM_TYPE_ORDER, itemType } from '@/lib/character/items';
import { formatWeaponDamage } from '@/lib/character/weaponDamage';
import { ItemTypeIcon } from '@/components/ItemTypeIcon';
import { ITEM_TYPE_LABELS } from '@/components/sheet/ItemDialog';

/** Rang d'affichage de chaque type (ordre canonique partagé `ITEM_TYPE_ORDER`). */
const TYPE_RANK: Record<ItemType, number> = ITEM_TYPE_ORDER.reduce(
  (acc, t, i) => ({ ...acc, [t]: i }),
  {} as Record<ItemType, number>,
);

/** Type d'un objet du CATALOGUE (dérivé de sa catégorie via `itemType`, sans surcharge). */
function catalogItemType(item: EquipmentItem): ItemType {
  return itemType({ itemId: item.id, quantity: 1 });
}

/** Détail concis d'un objet du catalogue affiché en secondaire dans l'option (DM / DEF). */
function itemHint(item: EquipmentItem): string | null {
  switch (item.category) {
    case 'weapon':
      return item.twoHandedDamage
        ? `DM ${formatWeaponDamage(item.damage)}/${formatWeaponDamage(item.twoHandedDamage)}`
        : `DM ${formatWeaponDamage(item.damage)}`;
    case 'armor':
    case 'shield':
      return `DEF +${item.def}`;
    case 'gear':
      return null;
  }
}

export interface EquipmentCatalogAutocompleteProps {
  /** Catalogue proposé à l'ajout (souvent la constante `equipment`). */
  options: EquipmentItem[];
  /** Notifie l'`id` de l'objet choisi (le champ se vide ensuite). */
  onSelect: (itemId: string) => void;
  label?: string;
  sx?: SxProps<Theme>;
}

export function EquipmentCatalogAutocomplete({
  options,
  onSelect,
  label = 'Ajouter un objet du catalogue',
  sx,
}: EquipmentCatalogAutocompleteProps) {
  // Tri → groupes contigus (exigence de `groupBy` côté MUI) : par type, puis par nom.
  const sorted = useMemo(() => {
    return [...options].sort((a, b) => {
      const ra = TYPE_RANK[catalogItemType(a)];
      const rb = TYPE_RANK[catalogItemType(b)];
      return ra - rb || a.name.localeCompare(b.name);
    });
  }, [options]);

  // Décompte par type (rappelé dans l'en-tête de groupe).
  const counts = useMemo(() => {
    const m = new Map<ItemType, number>();
    for (const item of sorted) {
      const t = catalogItemType(item);
      m.set(t, (m.get(t) ?? 0) + 1);
    }
    return m;
  }, [sorted]);

  return (
    <Autocomplete
      size="small"
      sx={sx}
      options={sorted}
      value={null}
      blurOnSelect
      clearOnBlur
      getOptionLabel={(o) => o.name}
      isOptionEqualToValue={(opt, val) => opt.id === val.id}
      groupBy={(o) => catalogItemType(o)}
      onChange={(_, value) => {
        if (value) onSelect(value.id);
      }}
      renderGroup={(params) => {
        const type = params.group as ItemType;
        const count = counts.get(type);
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
                // devient illisible. Le léger reste de translucidité + le blur donnent un
                // effet verre dépoli tout en gardant les options du dessous nettes.
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
              <ItemTypeIcon type={type} size={18} />
              <span>{ITEM_TYPE_LABELS[type]}</span>
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
        const hint = itemHint(item);
        return (
          <Box
            component="li"
            key={key}
            {...optionProps}
            sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}
          >
            <Typography variant="body2" sx={{ whiteSpace: 'normal', flex: '1 1 auto' }}>
              {item.name as ReactNode}
              {hint ? (
                <Box component="span" sx={{ color: 'text.secondary', ml: 0.75 }}>
                  {hint}
                </Box>
              ) : null}
            </Typography>
          </Box>
        );
      }}
      renderInput={(params) => <TextField {...params} label={label} size="small" />}
    />
  );
}
