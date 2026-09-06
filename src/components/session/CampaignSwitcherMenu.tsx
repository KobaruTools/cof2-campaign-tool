'use client';

/**
 * Sélecteur de campagne active dans le fil d'Ariane de `/play` (PER-500). Ne
 * monte QUE si l'Identité joueur porte 2+ campagnes (`page.tsx` bascule sinon
 * sur un simple libellé texte, cf. `listMemberCampaigns`) : un joueur mono-
 * campagne ne voit donc aucun changement d'UI.
 *
 * Bascule = navigation DURE après l'action serveur (pas de `router.refresh()`) :
 * `campaignId` irrigue plusieurs stores/canaux indépendants côté client
 * (personnages, joueurs, présence, temps réel) qu'il serait fragile de
 * réinitialiser un par un — un rechargement complet les repart tous proprement,
 * pour un geste rare.
 */
import { useState } from 'react';
import CheckIcon from '@mui/icons-material/Check';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import ListItemIcon from '@mui/material/ListItemIcon';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import { useToast } from '@/components/toast/ToastProvider';
import { switchActiveCampaign, type MemberCampaign } from '@/lib/auth/campaignSwitch';

interface CampaignSwitcherMenuProps {
  campaigns: MemberCampaign[];
  activeCampaignId: string;
}

/** Module-level : une navigation dure ne doit pas être analysée comme une mutation
 *  de valeur externe par le hook linter (cf. `AccountMenu.tsx`, même patron). */
async function switchAndReload(targetPlayerId: string): Promise<void> {
  await switchActiveCampaign(targetPlayerId);
  window.location.href = '/play';
}

export function CampaignSwitcherMenu({ campaigns, activeCampaignId }: CampaignSwitcherMenuProps) {
  const { showToast } = useToast();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [switching, setSwitching] = useState(false);

  const active = campaigns.find((c) => c.campaignId === activeCampaignId);

  const handleSelect = async (target: MemberCampaign) => {
    setAnchorEl(null);
    if (target.campaignId === activeCampaignId || switching) return;
    setSwitching(true);
    try {
      await switchAndReload(target.playerId);
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'La bascule de campagne a échoué.', 'error');
      setSwitching(false);
    }
  };

  return (
    <>
      <Box
        component="button"
        type="button"
        onClick={(e) => setAnchorEl(e.currentTarget)}
        disabled={switching}
        sx={{
          all: 'unset',
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
          cursor: switching ? 'default' : 'pointer',
          minWidth: 0,
          '&:hover': { color: switching ? undefined : 'text.primary' },
        }}
      >
        <Box component="span" sx={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {active?.campaignName ?? 'Ma campagne'}
        </Box>
        {switching ? (
          <CircularProgress size={14} color="inherit" sx={{ flexShrink: 0 }} />
        ) : (
          <ExpandMoreIcon fontSize="small" sx={{ flexShrink: 0 }} />
        )}
      </Box>
      <Menu anchorEl={anchorEl} open={anchorEl !== null} onClose={() => setAnchorEl(null)}>
        {campaigns.map((c) => (
          <MenuItem key={c.campaignId} onClick={() => void handleSelect(c)}>
            <ListItemIcon>
              {c.campaignId === activeCampaignId && <CheckIcon fontSize="small" />}
            </ListItemIcon>
            {c.campaignName}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
