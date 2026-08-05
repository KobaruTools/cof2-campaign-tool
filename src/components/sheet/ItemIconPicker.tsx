'use client';

import { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Popover from '@mui/material/Popover';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import type { ItemIconId } from '@/data/item-icons';
import { ITEM_ICON_PICKER_GROUPS, itemIconLabel } from '@/lib/ui/itemIcon';
import { ItemIcon } from '@/components/ItemIcon';
import { AppTooltip } from '@/components/AppTooltip';

export interface ItemIconPickerProps {
  /** Icône retenue, ou `null` quand l'objet suit son icône par défaut. */
  value: ItemIconId | null;
  /** Icône par défaut de l'objet (sous-catégorie du livre, ou icône de son type). */
  defaultIcon: ItemIconId;
  /** Remonte le choix ; `null` = revenir au défaut (aucune icône écrite sur la ligne). */
  onChange: (icon: ItemIconId | null) => void;
}

/**
 * Sélecteur d'ICÔNE d'un objet : montre l'icône courante et ouvre une grille groupée par
 * thème (armes, protections, matériel, trésors…) où le joueur choisit celle qu'il veut.
 *
 * L'icône par défaut est celle que la cascade donnerait sans choix explicite — la
 * sous-catégorie de l'objet du livre quand il y en a une (corde, grappin, cotte de mailles…),
 * sinon l'icône de sa catégorie. Elle est pré-sélectionnée et rappelée dans le bouton
 * « Par défaut », qui efface le choix.
 */
export function ItemIconPicker({ value, defaultIcon, onChange }: ItemIconPickerProps) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const current = value ?? defaultIcon;

  const pick = (id: ItemIconId) => {
    // Choisir explicitement le défaut revient à ne rien choisir : on n'écrit pas de champ.
    onChange(id === defaultIcon ? null : id);
    setAnchor(null);
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
      <Typography variant="caption" color="text.secondary">
        Icône
      </Typography>
      <Button
        size="small"
        variant="outlined"
        onClick={(e) => setAnchor(e.currentTarget)}
        startIcon={<ItemIcon id={current} size={18} />}
        sx={{ textTransform: 'none' }}
      >
        {itemIconLabel(current)}
      </Button>
      {value !== null && (
        <Button size="small" onClick={() => onChange(null)} sx={{ textTransform: 'none' }}>
          Par défaut ({itemIconLabel(defaultIcon)})
        </Button>
      )}
      <Popover
        open={anchor !== null}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        slotProps={{ paper: { sx: { maxWidth: 360, maxHeight: 420, p: 1.5 } } }}
      >
        {ITEM_ICON_PICKER_GROUPS.map((group) => (
          <Box key={group.label} sx={{ mb: 1.5, '&:last-of-type': { mb: 0 } }}>
            <Typography
              variant="overline"
              color="text.secondary"
              sx={{ display: 'block', lineHeight: 1.8, fontWeight: 700 }}
            >
              {group.label}
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {group.ids.map((id) => (
                <AppTooltip key={id} title={itemIconLabel(id)}>
                  <Box
                    component="button"
                    type="button"
                    onClick={() => pick(id)}
                    aria-label={itemIconLabel(id)}
                    aria-pressed={id === current}
                    sx={(theme) => ({
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 34,
                      height: 34,
                      p: 0,
                      cursor: 'pointer',
                      borderRadius: 1,
                      border: `1px solid ${id === current ? theme.palette.primary.main : theme.palette.divider}`,
                      backgroundColor:
                        id === current ? alpha(theme.palette.primary.main, 0.18) : 'transparent',
                      color: id === current ? theme.palette.primary.main : theme.palette.text.secondary,
                      '&:hover': { backgroundColor: alpha(theme.palette.primary.main, 0.1) },
                    })}
                  >
                    <ItemIcon id={id} size={20} />
                  </Box>
                </AppTooltip>
              ))}
            </Box>
          </Box>
        ))}
      </Popover>
    </Box>
  );
}
