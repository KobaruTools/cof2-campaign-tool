'use client';

/**
 * Bouton « Codex » de l'en-tête, en **bouton scindé** (split-button), même patron que
 * `RulesBookSplitButton` — corps = ancre vers `/codex` (vue d'ensemble), chevron accolé
 * ouvrant un menu vers les sous-pages fonctionnelles (`CODEX_SUBPAGES`).
 *
 * Contrairement au split-button « Livre des règles », la liste est STATIQUE (livre de
 * base uniquement, aucun contenu payant) : le chevron est donc TOUJOURS affiché, pas de
 * fetch d'entitlements, pas de repli sur un bouton simple.
 */
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import { CodexSubpageIcon } from '@/components/codex/CodexSubpageIcon';
import { HeaderNavButton } from '@/components/HeaderNavButton';
import { ItemIcon } from '@/components/ItemIcon';
import { CODEX_SUBPAGES } from '@/lib/ui/codex';

/** Délai avant fermeture au survol : laisse le temps de traverser le vide chevron → menu. */
const HOVER_CLOSE_DELAY_MS = 120;

export function CodexSplitButton() {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  // Le menu a-t-il été ouvert par une action explicite (clic/clavier) plutôt que par
  // survol ? Détermine l'autofocus (voir `RulesBookSplitButton`, même patron).
  const [openedByIntent, setOpenedByIntent] = useState(false);
  const [hoverCapable, setHoverCapable] = useState(false);
  const chevronRef = useRef<HTMLButtonElement | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const open = anchorEl !== null;

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(hover: hover)');
    const update = () => setHoverCapable(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  const cancelClose = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };
  const scheduleClose = () => {
    cancelClose();
    closeTimer.current = setTimeout(() => setAnchorEl(null), HOVER_CLOSE_DELAY_MS);
  };
  useEffect(() => cancelClose, []);

  return (
    <Box sx={{ display: 'inline-flex', alignItems: 'center' }}>
      <HeaderNavButton href="/codex" icon={<ItemIcon id="spellbook" size={20} />} label="Codex" />
      <Button
        ref={chevronRef}
        color="inherit"
        aria-label="Sous-pages du Codex"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => {
          cancelClose();
          setOpenedByIntent(true);
          setAnchorEl((prev) => (prev ? null : chevronRef.current));
        }}
        onMouseEnter={
          hoverCapable
            ? () => {
                cancelClose();
                setOpenedByIntent(false);
                setAnchorEl(chevronRef.current);
              }
            : undefined
        }
        onMouseLeave={hoverCapable ? scheduleClose : undefined}
        sx={{
          minWidth: 0,
          px: 0.25,
          py: 0.5,
          ml: -0.5,
        }}
      >
        <KeyboardArrowDownIcon
          sx={(theme) => ({
            fontSize: 20,
            transform: open ? 'rotate(180deg)' : 'none',
            transition: theme.transitions.create('transform', {
              duration: theme.transitions.duration.short,
            }),
          })}
        />
      </Button>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        disableScrollLock
        disableAutoFocusItem={!openedByIntent}
        sx={hoverCapable ? { pointerEvents: 'none' } : undefined}
        slotProps={{
          paper: hoverCapable
            ? {
                onMouseEnter: cancelClose,
                onMouseLeave: scheduleClose,
                sx: { pointerEvents: 'auto' },
              }
            : undefined,
          list: { 'aria-label': 'Sous-pages du Codex' },
        }}
      >
        {CODEX_SUBPAGES.map((entry) => (
          <MenuItem
            key={entry.href}
            component={Link}
            href={entry.href}
            onClick={() => setAnchorEl(null)}
          >
            <ListItemIcon>
              <CodexSubpageIcon label={entry.label} size={18} />
            </ListItemIcon>
            <ListItemText>{entry.label}</ListItemText>
          </MenuItem>
        ))}
      </Menu>
    </Box>
  );
}
