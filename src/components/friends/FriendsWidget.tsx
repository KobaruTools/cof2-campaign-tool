'use client';

/**
 * Point d'entrée « Amis » de l'en-tête (PER-402) : icône avec badge (demandes
 * reçues en attente) → tiroir Steam-style (`FriendsDrawer`) + modale d'ajout
 * (`AddFriendDialog`). Monté une seule fois dans `AppHeader`, gated par
 * `enabled` (propriétaire uniquement — un joueur invité n'a pas de compte).
 *
 * Possède aussi le heartbeat de présence (`useFriendPresenceHeartbeat`) et la
 * consommation d'un lien d'invitation reçu (`?invite=<token>`, n'importe quelle
 * page) : c'est le seul composant « Amis » monté globalement.
 */
import { useCallback, useEffect, useState } from 'react';
import GroupsIcon from '@mui/icons-material/Groups';
import Badge from '@mui/material/Badge';
import IconButton from '@mui/material/IconButton';
import { AppTooltip } from '@/components/AppTooltip';
import { useToast } from '@/components/toast/ToastProvider';
import {
  deleteFriendRequest,
  listFriendRequests,
  redeemFriendInvite,
  respondToFriendRequest,
} from '@/lib/friends/repo';
import { useFriendPresenceHeartbeat } from '@/lib/friends/useFriendPresenceHeartbeat';
import type { FriendRequest } from '@/lib/friends/types';
import { AddFriendDialog } from './AddFriendDialog';
import { FriendsDrawer } from './FriendsDrawer';

export function FriendsWidget({ enabled }: { enabled: boolean }) {
  const { showToast } = useToast();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  useFriendPresenceHeartbeat(enabled);

  const reload = useCallback(async () => {
    try {
      setRequests(await listFriendRequests());
    } catch {
      // Best-effort : le tiroir garde son dernier état connu plutôt que de casser l'en-tête.
    }
  }, []);

  // Consommation d'un lien d'invitation reçu, puis chargement initial. Une seule
  // fois au montage — `enabled` ne varie pas en pratique après résolution du rôle.
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    void (async () => {
      const token = new URLSearchParams(window.location.search).get('invite');
      if (token) {
        try {
          await redeemFriendInvite(token);
          showToast('Invitation acceptée : vous êtes maintenant amis.');
        } catch {
          showToast("Ce lien d'invitation est invalide ou déjà utilisé.", 'error');
        }
        const url = new URL(window.location.href);
        url.searchParams.delete('invite');
        window.history.replaceState(null, '', url.pathname + url.search);
      }
      await reload();
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  if (!enabled) return null;

  async function respond(request: FriendRequest, status: 'accepted' | 'declined') {
    setBusyId(request.id);
    try {
      await respondToFriendRequest(request.id, status);
      await reload();
    } catch {
      showToast('Action impossible.', 'error');
    } finally {
      setBusyId(null);
    }
  }

  async function remove(request: FriendRequest) {
    setBusyId(request.id);
    try {
      await deleteFriendRequest(request.id);
      await reload();
    } catch {
      showToast('Action impossible.', 'error');
    } finally {
      setBusyId(null);
    }
  }

  const incomingCount = requests.filter((r) => r.status === 'pending' && !r.isOutgoing).length;

  return (
    <>
      <AppTooltip title="Amis">
        <IconButton color="inherit" onClick={() => setDrawerOpen(true)} aria-label="Amis">
          <Badge badgeContent={incomingCount} color="error" overlap="circular">
            <GroupsIcon />
          </Badge>
        </IconButton>
      </AppTooltip>

      <FriendsDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onOpenAdd={() => setAddOpen(true)}
        requests={requests}
        loading={loading}
        busyId={busyId}
        onRespond={respond}
        onRemove={remove}
      />

      <AddFriendDialog open={addOpen} onClose={() => setAddOpen(false)} onSent={reload} />
    </>
  );
}
