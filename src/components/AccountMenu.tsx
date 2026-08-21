'use client';

/**
 * Menu « compte » de l'en-tête (PER-194) : icône à droite dans `AppHeader` ouvrant
 * un menu déroulant. Son contenu dépend du **rôle** de la session :
 *
 *  - **propriétaire** : nom d'affichage, « Réglages du compte », « Déconnexion » ;
 *  - **joueur** (invité par le lien de son MJ, PER-191) : rappel « Session joueur »,
 *    raccourci vers son espace, et « Créer un compte » — le joueur n'avait jusqu'ici
 *    aucun moyen de sortir de sa session invitée pour se créer un vrai compte.
 *  - **visiteur sans session** / **projection** : rien (la vitrine porte son propre
 *    bouton « Se connecter », et une TV n'a pas de compte).
 *
 * **Auto-gating** : le composant se tait tout seul, il est donc sûr à monter sur
 * n'importe quelle page. Rien non plus si Supabase n'est pas configuré (mode 100 %
 * local, aucun compte à gérer).
 */
import { useState } from 'react';
import Link from 'next/link';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import LogoutIcon from '@mui/icons-material/Logout';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import SettingsIcon from '@mui/icons-material/Settings';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';
import { AppTooltip } from '@/components/AppTooltip';
import { QuestIcon } from '@/components/QuestIcon';
import type { SessionRole } from '@/lib/auth/sessionRole';
import { useAppSession } from '@/lib/supabase/useAppSession';

const IS_CONFIGURED = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
);

/** Déconnexion : réutilise la route POST `/auth/signout` puis recharge vers `to`. */
async function signOutTo(to: string): Promise<void> {
  await fetch('/auth/signout', { method: 'POST' });
  window.location.href = to;
}

export function AccountMenu({
  sessionRole,
}: {
  /**
   * Rôle déjà résolu par la page appelante (rendu serveur de la vitrine, claims
   * validés de `/play`) : évite le clignotement du menu au montage. Absent =
   * résolu côté client.
   */
  sessionRole?: SessionRole;
}) {
  const session = useAppSession();
  const effectiveRole = sessionRole ?? session.role;
  const resolved = sessionRole !== undefined || session.resolved;
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  // Dialogue de confirmation avant de quitter une session joueur pour se créer un
  // compte (le lien du MJ reste réutilisable, mais autant le dire).
  const [signUpOpen, setSignUpOpen] = useState(false);

  // Rien à afficher : mode local, session non encore résolue, visiteur sans session
  // ou écran de projection.
  if (!IS_CONFIGURED || !resolved) return null;
  if (effectiveRole === 'anonymous' || effectiveRole === 'projection') return null;

  const isPlayer = effectiveRole === 'player';
  const close = () => setAnchorEl(null);

  return (
    <>
      <AppTooltip title={isPlayer ? 'Session joueur' : 'Compte'}>
        <IconButton
          color="inherit"
          onClick={(e) => setAnchorEl(e.currentTarget)}
          aria-label={isPlayer ? 'Session joueur' : 'Compte'}
          data-glossary-shot="AccountMenu"
          sx={(theme) => ({
            // Voile blanc de survol en fondu doux (aligné sur les boutons nav de l'en-tête).
            transition: theme.transitions.create('background-color', {
              duration: theme.transitions.duration.short,
            }),
          })}
        >
          <AccountCircleIcon />
        </IconButton>
      </AppTooltip>

      <Menu anchorEl={anchorEl} open={anchorEl !== null} onClose={close}>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ px: 2, py: 0.5, display: 'block' }}
        >
          {isPlayer ? 'Session joueur (invitation du MJ)' : session.displayName ?? 'Compte'}
        </Typography>
        <Divider />

        {isPlayer ? (
          <>
            <MenuItem component={Link} href="/play" onClick={close}>
              <ListItemIcon>
                <QuestIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Ma campagne</ListItemText>
            </MenuItem>
            <MenuItem
              onClick={() => {
                close();
                setSignUpOpen(true);
              }}
            >
              <ListItemIcon>
                <PersonAddIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Créer un compte</ListItemText>
            </MenuItem>
          </>
        ) : (
          <>
            <MenuItem component={Link} href="/account" onClick={close}>
              <ListItemIcon>
                <SettingsIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Réglages du compte</ListItemText>
            </MenuItem>
            <MenuItem
              onClick={() => {
                close();
                void signOutTo('/login');
              }}
            >
              <ListItemIcon>
                <LogoutIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Déconnexion</ListItemText>
            </MenuItem>
          </>
        )}
      </Menu>

      {/* Joueur → compte réel. On ferme d'ABORD la session invitée : sans ça, la
          connexion depuis une session anonyme lierait l'identité à l'utilisateur
          anonyme, qui garderait son claim `player_id` et resterait confiné à
          l'espace joueur. */}
      <Dialog open={signUpOpen} onClose={() => setSignUpOpen(false)}>
        <DialogTitle>Créer un compte ?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Tu vas quitter la session de campagne ouverte par le lien de ton MJ pour créer ton
            propre compte. Les personnages que tu as créés restent rattachés à la campagne, et
            le lien de ton MJ reste valable : tu peux le rouvrir à tout moment pour revenir.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSignUpOpen(false)}>Annuler</Button>
          <Button variant="contained" onClick={() => void signOutTo('/login')}>
            Continuer
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
