'use client';

/**
 * Variante « tiroir » de `CodexSplitButton` (menu burger de l'en-tête, sous
 * `HEADER_BURGER_BREAKPOINT`) — même patron que `RulesBookDrawerItems` : dans un tiroir,
 * chaque sous-page est une ligne pleine largeur sous l'entrée « Codex ».
 */
import Link from 'next/link';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import { CodexSubpageIcon } from '@/components/codex/CodexSubpageIcon';
import { ItemIcon } from '@/components/ItemIcon';
import { CODEX_SUBPAGES } from '@/lib/ui/codex';

export function CodexDrawerItems({ onNavigate }: { onNavigate: () => void }) {
  return (
    <>
      <ListItemButton component={Link} href="/codex" onClick={onNavigate}>
        <ListItemIcon>
          <ItemIcon id="spellbook" size={24} />
        </ListItemIcon>
        <ListItemText>Codex</ListItemText>
      </ListItemButton>
      {CODEX_SUBPAGES.map((entry) => (
        <ListItemButton
          key={entry.href}
          component={Link}
          href={entry.href}
          onClick={onNavigate}
          sx={{ pl: 3 }}
        >
          <ListItemIcon>
            <CodexSubpageIcon label={entry.label} size={20} />
          </ListItemIcon>
          <ListItemText>{entry.label}</ListItemText>
        </ListItemButton>
      ))}
    </>
  );
}
