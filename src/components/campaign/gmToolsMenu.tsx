'use client';

/**
 * Source UNIQUE des « Outils du MJ » de l'écran de MJ (PER-448, retour propriétaire) —
 * extrait de `gm-screen/page.tsx` pour être partagé par DEUX consommateurs :
 *  - le bouton « Outils du MJ » de la barre d'actions (menu déroulant, `page.tsx`) ;
 *  - `GmToolSwitcher`, rendu dans l'en-tête de CHAQUE tiroir (`GmDrawerHeader`), pour
 *    sauter directement d'un tiroir à l'autre sans repasser par la page.
 *
 * Les `*_PARAM` (nom du paramètre d'URL qui ouvre chaque tiroir) vivent ICI, pas dans
 * chaque `*DrawerHost.tsx` comme avant l'extraction — sans quoi ce module devrait
 * importer les `*DrawerHost.tsx`, qui importent leur `*Drawer.tsx`, qui importerait CE
 * module pour son icône d'en-tête : un cycle. Chaque `*DrawerHost.tsx` RÉ-EXPORTE
 * maintenant son `*_PARAM` depuis ici (API externe inchangée pour `page.tsx`).
 */
import type { ReactElement } from 'react';
import DiamondIcon from '@mui/icons-material/Diamond';
import EditNoteIcon from '@mui/icons-material/EditNote';
import GroupsIcon from '@mui/icons-material/Groups';
import HistoryIcon from '@mui/icons-material/History';
import LocalBarIcon from '@mui/icons-material/LocalBar';
import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined';
import PetsOutlinedIcon from '@mui/icons-material/PetsOutlined';
import { SectionIcon } from '@/components/SectionIcon';

export const LOOT_PARAM = 'loot';
export const NPC_PARAM = 'npc';
export const ENCOUNTER_PRESETS_PARAM = 'combats';
export const RUMORS_PARAM = 'rumors';
export const NOTES_PARAM = 'notes';
export const HISTORY_PARAM = 'history';
export const REFERENCE_PARAM = 'reference';
export const BESTIARY_PARAM = 'bestiary';

export interface GmToolMenuItem {
  /** Nom du paramètre d'URL qui ouvre ce tiroir (booléen : `?<param>=1`). */
  param: string;
  /** Libellé affiché — menu ET en-tête de tiroir (même icône, même nom). */
  label: string;
  /** Icône — MÊME élément affiché dans le menu et dans l'en-tête du tiroir correspondant. */
  icon: ReactElement;
  dataTour: string;
  /** Un `Divider` suit cette entrée dans le menu (groupes thématiques). */
  separatorAfter?: boolean;
}

/** Entrées du menu « Outils du MJ », dans l'ordre d'affichage — groupées par nature
 * (contenu de table généré/tiré ; suivi de partie ; consultation pure). */
export const GM_TOOLS_MENU: GmToolMenuItem[] = [
  { param: LOOT_PARAM, label: 'Butin', icon: <DiamondIcon fontSize="small" />, dataTour: 'gm-screen-loot' },
  { param: NPC_PARAM, label: 'PNJ', icon: <GroupsIcon fontSize="small" />, dataTour: 'gm-screen-npc' },
  {
    param: ENCOUNTER_PRESETS_PARAM,
    label: 'Combats préparés',
    icon: <SectionIcon name="encounters" size={20} />,
    dataTour: 'gm-screen-encounter-presets',
  },
  {
    param: RUMORS_PARAM,
    label: 'Rumeurs de taverne',
    icon: <LocalBarIcon fontSize="small" />,
    dataTour: 'gm-screen-rumors',
    separatorAfter: true,
  },
  { param: NOTES_PARAM, label: 'Notes de session', icon: <EditNoteIcon fontSize="small" />, dataTour: 'gm-screen-notes' },
  {
    param: HISTORY_PARAM,
    label: 'Historique des parties',
    icon: <HistoryIcon fontSize="small" />,
    dataTour: 'gm-screen-history',
    separatorAfter: true,
  },
  {
    param: REFERENCE_PARAM,
    label: 'Aide-mémoire',
    icon: <MenuBookOutlinedIcon fontSize="small" />,
    dataTour: 'gm-screen-reference',
  },
  { param: BESTIARY_PARAM, label: 'Bestiaire', icon: <PetsOutlinedIcon fontSize="small" />, dataTour: 'gm-screen-bestiary' },
];
