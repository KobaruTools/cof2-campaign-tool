'use client';

/**
 * Menu « compte » de l'en-tête propriétaire (PER-194) : icône à droite dans
 * `AppHeader` ouvrant un menu déroulant « Réglages du compte » + « Déconnexion ».
 * Comble l'absence de bouton de déconnexion constatée depuis PER-190.
 *
 * **Auto-gating** : ne s'affiche que pour une session **propriétaire** réelle —
 * rien si Supabase n'est pas configuré (mode 100 % local), rien sans session, et
 * rien pour une session **joueur** (utilisateur anonyme scopé, PER-191) qui n'a pas
 * de compte à gérer. Sûr à monter sur n'importe quelle page (il se tait tout seul).
 */
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import LogoutIcon from '@mui/icons-material/Logout';
import SettingsIcon from '@mui/icons-material/Settings';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';
import { AppTooltip } from '@/components/AppTooltip';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import { displayNameOf } from '@/lib/auth/displayName';

const IS_CONFIGURED = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
);

/** Déconnexion : réutilise la route POST `/auth/signout` puis recharge vers `/login`. */
async function signOut(): Promise<void> {
  await fetch('/auth/signout', { method: 'POST' });
  window.location.href = '/login';
}

export function AccountMenu() {
  const router = useRouter();
  const [label, setLabel] = useState<string | null>(null);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  // Charge l'utilisateur courant (asynchrone → pas de setState synchrone en effet).
  // `label` reste null (menu masqué) sans session ou pour une session joueur.
  //
  // On lit `getSession()` (session en cache local, AUCUN réseau) et non `getUser()`
  // (qui revalide toujours via GoTrue → un aller-retour /auth/v1/user par page). Ici
  // on ne fait qu'afficher un nom et distinguer propriétaire vs joueur : la revalidation
  // serveur n'apporte rien, et toute opération réellement protégée reste vérifiée côté
  // serveur. Économise un appel réseau à chaque navigation.
  useEffect(() => {
    if (!IS_CONFIGURED) return;
    let cancelled = false;
    const supabase = createBrowserSupabaseClient();
    void supabase.auth.getSession().then(({ data: { session } }) => {
      const user = session?.user;
      if (cancelled || !user) return;
      const isPlayer = Boolean(
        (user.app_metadata as { player_id?: string } | undefined)?.player_id,
      );
      if (isPlayer) return;
      setLabel(displayNameOf(user));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!IS_CONFIGURED || label === null) return null;

  const close = () => setAnchorEl(null);

  return (
    <>
      <AppTooltip title="Compte">
        <IconButton color="inherit" onClick={(e) => setAnchorEl(e.currentTarget)} aria-label="Compte">
          <AccountCircleIcon />
        </IconButton>
      </AppTooltip>
      <Menu anchorEl={anchorEl} open={anchorEl !== null} onClose={close}>
        <Typography variant="caption" color="text.secondary" sx={{ px: 2, py: 0.5, display: 'block' }}>
          {label}
        </Typography>
        <Divider />
        <MenuItem
          onClick={() => {
            close();
            router.push('/account');
          }}
        >
          <ListItemIcon>
            <SettingsIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Réglages du compte</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => {
            close();
            void signOut();
          }}
        >
          <ListItemIcon>
            <LogoutIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Déconnexion</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
}
