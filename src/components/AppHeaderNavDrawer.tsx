'use client';

/**
 * Menu burger de l'en-tête (sous `HEADER_BURGER_BREAKPOINT`, cf. `AppHeader`) : tiroir
 * standard ancré à droite listant, en lignes pleine largeur, les mêmes liens que la
 * rangée de boutons de nav qu'il remplace (Bestiaire, Aide-mémoire, Mes personnages/Ma
 * campagne/Campagnes/Écran de MJ, Livre des règles). Chaque clic ferme le tiroir en plus
 * de naviguer (vraies ancres `Link`, pas de navigation manuelle).
 *
 * Ne porte AUCUNE logique de rôle : reçoit les mêmes booléens déjà calculés par
 * `AppHeader` (`showContentLinks`, `showCharacterLink`, `showOwnerLinks`, `isPlayer`),
 * pour rester la seule source de vérité sur qui voit quoi.
 */
import Divider from '@mui/material/Divider';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Link from 'next/link';
import CloseIcon from '@mui/icons-material/Close';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import { CodexDrawerItems } from '@/components/CodexDrawerItems';
import { GmScreenIcon } from '@/components/GmScreenIcon';
import { QuestIcon } from '@/components/QuestIcon';
import { RulesBookDrawerItems } from '@/components/RulesBookDrawerItems';
import { SectionIcon } from '@/components/SectionIcon';

export interface AppHeaderNavDrawerProps {
  open: boolean;
  onClose: () => void;
  showContentLinks: boolean;
  showCharacterLink: boolean;
  showOwnerLinks: boolean;
  isPlayer: boolean;
  gmScreenCampaignId?: string;
}

export function AppHeaderNavDrawer({
  open,
  onClose,
  showContentLinks,
  showCharacterLink,
  showOwnerLinks,
  isPlayer,
  gmScreenCampaignId,
}: AppHeaderNavDrawerProps) {
  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      slotProps={{
        paper: {
          sx: { width: { xs: '100vw', sm: 'min(320px, 100vw)' }, maxWidth: '100vw' },
        },
      }}
    >
      <Stack
        direction="row"
        spacing={1}
        sx={(theme) => ({
          alignItems: 'center',
          px: 2,
          py: 1.5,
          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.6)}`,
        })}
      >
        <Typography variant="h6" component="h2" sx={{ fontWeight: 'bold', flexGrow: 1 }}>
          Menu
        </Typography>
        <IconButton onClick={onClose} aria-label="Fermer le menu">
          <CloseIcon />
        </IconButton>
      </Stack>

      <List sx={{ width: '100%', py: 0 }}>
        {isPlayer && (
          <ListItemButton component={Link} href="/play" onClick={onClose}>
            <ListItemIcon>
              <QuestIcon />
            </ListItemIcon>
            <ListItemText>Ma campagne</ListItemText>
          </ListItemButton>
        )}
        {showCharacterLink && (
          <ListItemButton component={Link} href="/characters" onClick={onClose}>
            <ListItemIcon>
              <SectionIcon name="identity" size={24} />
            </ListItemIcon>
            <ListItemText>Mes personnages</ListItemText>
          </ListItemButton>
        )}
        {showOwnerLinks && (
          <>
            <ListItemButton component={Link} href="/campaigns" onClick={onClose}>
              <ListItemIcon>
                <QuestIcon />
              </ListItemIcon>
              <ListItemText>Campagnes</ListItemText>
            </ListItemButton>
            {gmScreenCampaignId && (
              <ListItemButton
                component={Link}
                href={`/campaign/${gmScreenCampaignId}/gm-screen`}
                onClick={onClose}
              >
                <ListItemIcon>
                  <GmScreenIcon />
                </ListItemIcon>
                <ListItemText>Écran de MJ</ListItemText>
              </ListItemButton>
            )}
          </>
        )}

        {showContentLinks && (
          <>
            <Divider sx={{ my: 0.5 }} />
            <ListItemButton component={Link} href="/bestiary" onClick={onClose}>
              <ListItemIcon>
                <SectionIcon name="companions" size={24} />
              </ListItemIcon>
              <ListItemText>Bestiaire</ListItemText>
            </ListItemButton>
            <ListItemButton component={Link} href="/reference" onClick={onClose}>
              <ListItemIcon>
                <SectionIcon name="notes" size={24} />
              </ListItemIcon>
              <ListItemText>Aide-mémoire</ListItemText>
            </ListItemButton>
            <CodexDrawerItems onNavigate={onClose} />
            <Divider sx={{ my: 0.5 }} />
            <RulesBookDrawerItems onNavigate={onClose} />
          </>
        )}
      </List>
    </Drawer>
  );
}
