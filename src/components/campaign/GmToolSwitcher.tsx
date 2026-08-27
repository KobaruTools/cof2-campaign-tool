'use client';

/**
 * Bascule directe d'un tiroir « Outils du MJ » à l'autre (PER-448, retour propriétaire) —
 * rendu dans l'en-tête de chaque tiroir (`GmDrawerHeader`), à côté de la croix. Sans lui,
 * changer d'outil demandait de fermer le tiroir courant, rouvrir le menu « Outils du MJ »
 * de la page, puis choisir une autre entrée.
 *
 * Même mécanique que le menu de la page (`page.tsx`, `GM_TOOLS_MENU`) : chaque entrée est
 * une VRAIE navigation (`router.replace`, pas juste un état local) qui REMPLACE tout le
 * paramètre d'URL — ouvrir un tiroir ferme donc automatiquement celui en cours, sans
 * coordination explicite entre les `*DrawerHost`. `scroll:false` : ne pas ramener la page
 * en haut, le tiroir reste ouvert par-dessus tout du long.
 */
import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import BuildOutlinedIcon from '@mui/icons-material/BuildOutlined';
import CheckIcon from '@mui/icons-material/Check';
import IconButton from '@mui/material/IconButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import { AppTooltip } from '@/components/AppTooltip';
import { GM_TOOLS_MENU } from './gmToolsMenu';

export interface GmToolSwitcherProps {
  /** Paramètre du tiroir COURANT (cf. `*_PARAM` de `gmToolsMenu.tsx`) — coché dans la liste. */
  currentParam: string;
}

export function GmToolSwitcher({ currentParam }: GmToolSwitcherProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);

  const goTo = (param: string) => {
    setAnchor(null);
    if (param === currentParam) return;
    router.replace(`${pathname}?${param}=1`, { scroll: false });
  };

  return (
    <>
      <AppTooltip title="Changer d'outil">
        <IconButton size="small" onClick={(e) => setAnchor(e.currentTarget)} aria-label="Changer d'outil">
          <BuildOutlinedIcon fontSize="small" />
        </IconButton>
      </AppTooltip>
      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        {GM_TOOLS_MENU.map((item) => (
          <MenuItem key={item.param} selected={item.param === currentParam} onClick={() => goTo(item.param)}>
            <ListItemIcon>{item.param === currentParam ? <CheckIcon fontSize="small" /> : item.icon}</ListItemIcon>
            <ListItemText>{item.label}</ListItemText>
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
