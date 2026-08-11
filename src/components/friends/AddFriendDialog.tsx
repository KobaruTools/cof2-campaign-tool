'use client';

/**
 * Modale « Ajouter un ami » (PER-402) : les 3 façons de retrouver un compte
 * (cadrage validé) — recherche exact-match par handle OU email, et lien
 * d'invitation à usage unique. Remplace l'ancienne page `/friends` pour cette
 * partie ; la liste elle-même vit dans `FriendsDrawer`.
 */
import { useState } from 'react';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import PersonSearchIcon from '@mui/icons-material/PersonSearch';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import ListItem from '@mui/material/ListItem';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import ListItemText from '@mui/material/ListItemText';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useToast } from '@/components/toast/ToastProvider';
import {
  createFriendInviteLink,
  findProfileByEmail,
  findProfileByHandle,
  listMyInviteLinks,
  sendFriendRequest,
  type FriendInviteLink,
} from '@/lib/friends/repo';
import type { FriendProfile } from '@/lib/friends/types';

function profileLabel(profile: FriendProfile): string {
  return profile.displayName ?? profile.handle ?? 'Compte';
}

export function AddFriendDialog({
  open,
  onClose,
  onSent,
}: {
  open: boolean;
  onClose: () => void;
  /** Appelé après l'envoi réussi d'une demande, pour rafraîchir la liste du tiroir. */
  onSent: () => void;
}) {
  const { showToast } = useToast();

  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<FriendProfile | null | undefined>(undefined);
  const [sending, setSending] = useState(false);

  const [inviteLink, setInviteLink] = useState<FriendInviteLink | null | undefined>(undefined);
  const [creatingInvite, setCreatingInvite] = useState(false);

  async function ensureInviteLoaded() {
    if (inviteLink !== undefined) return;
    const links = await listMyInviteLinks();
    setInviteLink(links.find((l) => !l.usedAt) ?? null);
  }

  async function runSearch() {
    const q = query.trim();
    if (!q) return;
    setSearching(true);
    setSearchResult(undefined);
    try {
      const found = q.includes('@') ? await findProfileByEmail(q) : await findProfileByHandle(q);
      setSearchResult(found);
    } catch {
      showToast('Recherche impossible. Réessaie.', 'error');
      setSearchResult(null);
    } finally {
      setSearching(false);
    }
  }

  async function requestFriend(profile: FriendProfile) {
    setSending(true);
    try {
      await sendFriendRequest(profile.id);
      showToast('Demande envoyée.');
      setSearchResult(null);
      setQuery('');
      onSent();
    } catch {
      showToast("Impossible d'envoyer la demande.", 'error');
    } finally {
      setSending(false);
    }
  }

  async function generateInvite() {
    setCreatingInvite(true);
    try {
      setInviteLink(await createFriendInviteLink());
    } catch {
      showToast('Impossible de générer le lien.', 'error');
    } finally {
      setCreatingInvite(false);
    }
  }

  async function copyInvite() {
    if (!inviteLink) return;
    const url = `${window.location.origin}/?invite=${inviteLink.token}`;
    await navigator.clipboard.writeText(url);
    showToast('Lien copié.');
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      slotProps={{ transition: { onEnter: () => void ensureInviteLoaded() } }}
    >
      <DialogTitle>Ajouter un ami</DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} sx={{ mt: 0.5 }}>
          <Stack spacing={1.5}>
            <Typography variant="subtitle2">Rechercher un compte</Typography>
            <Stack direction="row" spacing={1.5}>
              <TextField
                label="Handle ou email"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void runSearch();
                }}
                fullWidth
                size="small"
                autoFocus
              />
              <Button
                variant="outlined"
                startIcon={<PersonSearchIcon />}
                onClick={() => void runSearch()}
                disabled={searching || !query.trim()}
                sx={{ flexShrink: 0 }}
              >
                Chercher
              </Button>
            </Stack>
            {searchResult === null && (
              <Typography variant="body2" color="text.secondary">
                Aucun compte ne correspond.
              </Typography>
            )}
            {searchResult && (
              <ListItem
                disableGutters
                secondaryAction={
                  <Button
                    size="small"
                    variant="contained"
                    disabled={sending}
                    onClick={() => void requestFriend(searchResult)}
                  >
                    Envoyer une demande
                  </Button>
                }
              >
                <ListItemAvatar>
                  <Avatar>{profileLabel(searchResult).charAt(0).toUpperCase()}</Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={profileLabel(searchResult)}
                  secondary={searchResult.handle ? `@${searchResult.handle}` : undefined}
                />
              </ListItem>
            )}
          </Stack>

          <Divider />

          <Stack spacing={1.5}>
            <Typography variant="subtitle2">Lien d’invitation</Typography>
            <Typography variant="body2" color="text.secondary">
              Partage ce lien : l’ouvrir crée directement une amitié, sans recherche.
            </Typography>
            {inviteLink ? (
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <TextField
                  value={`${window.location.origin}/?invite=${inviteLink.token}`}
                  size="small"
                  fullWidth
                  slotProps={{ input: { readOnly: true } }}
                />
                <IconButton onClick={() => void copyInvite()} aria-label="Copier le lien">
                  <ContentCopyIcon fontSize="small" />
                </IconButton>
              </Stack>
            ) : (
              <Button
                variant="outlined"
                onClick={() => void generateInvite()}
                disabled={creatingInvite || inviteLink === undefined}
                sx={{ alignSelf: 'flex-start' }}
              >
                Générer un lien
              </Button>
            )}
          </Stack>
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
