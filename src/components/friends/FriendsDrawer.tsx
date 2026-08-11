'use client';

/**
 * Tiroir « Amis » (PER-402), inspiré de la liste d'amis Steam : ancré à droite,
 * groupes « En ligne » / « Hors ligne » (pastille de statut sur l'avatar), et les
 * demandes reçues épinglées en haut. Remplace l'ancienne page `/friends`.
 */
import AddIcon from '@mui/icons-material/Add';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import PersonRemoveIcon from '@mui/icons-material/PersonRemove';
import Avatar from '@mui/material/Avatar';
import Badge from '@mui/material/Badge';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import ListItemText from '@mui/material/ListItemText';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { AppTooltip } from '@/components/AppTooltip';
import { friendPresenceLabel, isFriendOnline } from '@/lib/friends/presenceLabel';
import type { FriendRequest } from '@/lib/friends/types';

const DRAWER_WIDTH = 340;

function profileLabel(other: FriendRequest['other']): string {
  return other.displayName ?? other.handle ?? 'Compte';
}

/** Ligne d'ami, avec pastille de statut Steam-style sur l'avatar. */
function FriendRow({
  request,
  online,
  busy,
  onRemove,
}: {
  request: FriendRequest;
  online: boolean;
  busy: boolean;
  onRemove: () => void;
}) {
  return (
    <ListItem
      disableGutters
      sx={{ px: 2, '&:hover .friend-remove': { opacity: 1 } }}
      secondaryAction={
        <IconButton
          size="small"
          className="friend-remove"
          disabled={busy}
          onClick={onRemove}
          aria-label="Retirer"
          sx={{ opacity: 0, transition: 'opacity 0.15s' }}
        >
          <PersonRemoveIcon fontSize="small" />
        </IconButton>
      }
    >
      <ListItemAvatar>
        <Badge
          overlap="circular"
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          variant="dot"
          sx={{
            '& .MuiBadge-badge': {
              bgcolor: online ? '#57cbde' : 'grey.600',
              boxShadow: '0 0 0 2px rgba(20,20,23,0.85)',
            },
          }}
        >
          <Avatar sx={{ width: 36, height: 36 }}>
            {profileLabel(request.other).charAt(0).toUpperCase()}
          </Avatar>
        </Badge>
      </ListItemAvatar>
      <ListItemText
        primary={profileLabel(request.other)}
        secondary={friendPresenceLabel(request.other.lastSeenAt)}
        slotProps={{ secondary: { sx: { color: online ? '#57cbde' : 'text.secondary' } } }}
      />
    </ListItem>
  );
}

export function FriendsDrawer({
  open,
  onClose,
  onOpenAdd,
  requests,
  loading,
  busyId,
  onRespond,
  onRemove,
}: {
  open: boolean;
  onClose: () => void;
  onOpenAdd: () => void;
  requests: FriendRequest[];
  loading: boolean;
  busyId: string | null;
  onRespond: (request: FriendRequest, status: 'accepted' | 'declined') => void;
  onRemove: (request: FriendRequest) => void;
}) {
  const incoming = requests.filter((r) => r.status === 'pending' && !r.isOutgoing);
  const outgoing = requests.filter((r) => r.status === 'pending' && r.isOutgoing);
  const accepted = requests.filter((r) => r.status === 'accepted');
  const online = accepted.filter((r) => isFriendOnline(r.other.lastSeenAt));
  const offline = accepted.filter((r) => !isFriendOnline(r.other.lastSeenAt));

  return (
    <Drawer anchor="right" open={open} onClose={onClose}>
      <Box
        sx={{
          width: DRAWER_WIDTH,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          bgcolor: 'rgba(20, 20, 23, 0.97)',
        }}
      >
        <Stack
          direction="row"
          sx={{ alignItems: 'center', px: 2, py: 1.5, borderBottom: '1px solid rgba(255,255,255,0.08)' }}
        >
          <Typography variant="subtitle1" sx={{ flexGrow: 1 }}>
            Amis
          </Typography>
          <AppTooltip title="Ajouter un ami">
            <IconButton size="small" onClick={onOpenAdd} aria-label="Ajouter un ami">
              <AddIcon fontSize="small" />
            </IconButton>
          </AppTooltip>
          <IconButton size="small" onClick={onClose} aria-label="Fermer">
            <CloseIcon fontSize="small" />
          </IconButton>
        </Stack>

        <Box sx={{ flex: 1, overflowY: 'auto' }}>
          {loading ? (
            <Stack sx={{ alignItems: 'center', py: 6 }}>
              <CircularProgress size={24} />
            </Stack>
          ) : requests.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ p: 2.5 }}>
              Aucun ami pour l’instant. Clique sur « + » pour en ajouter.
            </Typography>
          ) : (
            <>
              {incoming.length > 0 && (
                <>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ px: 2, pt: 1.5, display: 'block', textTransform: 'uppercase' }}
                  >
                    Demandes reçues — {incoming.length}
                  </Typography>
                  <List dense disablePadding>
                    {incoming.map((r) => (
                      <ListItem
                        key={r.id}
                        disableGutters
                        sx={{ px: 2, bgcolor: 'rgba(87, 203, 222, 0.08)' }}
                        secondaryAction={
                          <Stack direction="row" spacing={0.5}>
                            <IconButton
                              size="small"
                              color="success"
                              disabled={busyId === r.id}
                              onClick={() => onRespond(r, 'accepted')}
                              aria-label="Accepter"
                            >
                              <CheckIcon fontSize="small" />
                            </IconButton>
                            <IconButton
                              size="small"
                              color="error"
                              disabled={busyId === r.id}
                              onClick={() => onRespond(r, 'declined')}
                              aria-label="Refuser"
                            >
                              <CloseIcon fontSize="small" />
                            </IconButton>
                          </Stack>
                        }
                      >
                        <ListItemAvatar>
                          <Avatar sx={{ width: 36, height: 36 }}>
                            {profileLabel(r.other).charAt(0).toUpperCase()}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText primary={profileLabel(r.other)} />
                      </ListItem>
                    ))}
                  </List>
                  <Divider />
                </>
              )}

              {outgoing.length > 0 && (
                <>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ px: 2, pt: 1.5, display: 'block', textTransform: 'uppercase' }}
                  >
                    Demandes envoyées — {outgoing.length}
                  </Typography>
                  <List dense disablePadding>
                    {outgoing.map((r) => (
                      <ListItem
                        key={r.id}
                        disableGutters
                        sx={{ px: 2 }}
                        secondaryAction={
                          <Button
                            size="small"
                            color="inherit"
                            disabled={busyId === r.id}
                            onClick={() => onRemove(r)}
                          >
                            Annuler
                          </Button>
                        }
                      >
                        <ListItemAvatar>
                          <Avatar sx={{ width: 36, height: 36 }}>
                            {profileLabel(r.other).charAt(0).toUpperCase()}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText primary={profileLabel(r.other)} secondary="En attente" />
                      </ListItem>
                    ))}
                  </List>
                  <Divider />
                </>
              )}

              {online.length > 0 && (
                <>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ px: 2, pt: 1.5, display: 'block', textTransform: 'uppercase' }}
                  >
                    En ligne — {online.length}
                  </Typography>
                  <List dense disablePadding>
                    {online.map((r) => (
                      <FriendRow
                        key={r.id}
                        request={r}
                        online
                        busy={busyId === r.id}
                        onRemove={() => onRemove(r)}
                      />
                    ))}
                  </List>
                </>
              )}

              {offline.length > 0 && (
                <>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ px: 2, pt: 1.5, display: 'block', textTransform: 'uppercase' }}
                  >
                    Hors ligne — {offline.length}
                  </Typography>
                  <List dense disablePadding>
                    {offline.map((r) => (
                      <FriendRow
                        key={r.id}
                        request={r}
                        online={false}
                        busy={busyId === r.id}
                        onRemove={() => onRemove(r)}
                      />
                    ))}
                  </List>
                </>
              )}
            </>
          )}
        </Box>
      </Box>
    </Drawer>
  );
}
