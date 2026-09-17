'use client';

/**
 * Gestion des campagnes (PER-190) — CRUD cloud (MJ = propriétaire, RLS
 * `owner_id`). Accessible depuis l'en-tête de l'accueil (`/`, liste plate des
 * personnages, pivot PER-180). On peut créer, ouvrir les **réglages** (roue crantée
 * → nom + notes + règles de table) et supprimer une campagne. Une campagne
 * fraîchement créée mène directement à ses réglages. La suppression est **en
 * cascade côté joueurs** et **détache** les
 * personnages (ils repassent « Non attribué », pivot PER-180) — jamais de
 * destruction de personnage —, sous **confirmation forte** (retaper le nom).
 *
 * Les campagnes vivent dans Supabase : ce composant s'appuie sur le store
 * `campaigns` (cache d'une source cloud) et affiche les états de chargement,
 * d'erreur et « cloud non configuré ».
 *
 * Depuis PER-538/498, un compte peut être MJ de certaines campagnes ET membre
 * (joueur) d'une autre — le store ramène désormais les deux (RLS
 * `campaigns_player_read`). La liste distingue donc « Vos campagnes » (MJ, avec
 * réglages/suppression) de « Campagnes où vous jouez » (badge, lecture seule).
 */
import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { hrefFromIndex, useCampaignSlugIndex } from '@/lib/routing/slug';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import PersonIcon from '@mui/icons-material/Person';
import SettingsIcon from '@mui/icons-material/Settings';
import SupervisorAccountIcon from '@mui/icons-material/SupervisorAccount';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Collapse from '@mui/material/Collapse';
import Container from '@mui/material/Container';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { GlossaryRichText } from '@/components/sheet/FeatureRichText';
import { AppAlert } from '@/components/AppAlert';
import { useToast } from '@/components/toast/ToastProvider';
import { AppTooltip } from '@/components/AppTooltip';
import { CampaignListSkeleton } from '@/components/campaign/CampaignListSkeleton';
import { HomeBackground } from '@/components/HomeBackground';
import type { Campaign } from '@/lib/campaign';
import { storageKeys } from '@/lib/storage/keys';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import { usePersistedBoolean } from '@/lib/ui/usePersistedBoolean';
import { useCampaignsStore } from '@/stores/campaigns';
import { useCampaignDraftStore } from '@/stores/campaignDraft';
import { useCharactersStore } from '@/stores/characters';
import { useWizardStore } from '@/stores/wizard';
import { useHeaderContent } from '@/stores/headerContent';

export default function CampaignsPage() {
  useHeaderContent({ breadcrumbs: [{ label: 'Campagnes' }] });
  const status = useCampaignsStore((s) => s.status);
  const error = useCampaignsStore((s) => s.error);
  const campaigns = useCampaignsStore((s) => s.campaigns);
  const campaignSlugIndex = useCampaignSlugIndex();
  const load = useCampaignsStore((s) => s.load);
  const remove = useCampaignsStore((s) => s.remove);
  const characters = useCharactersStore((s) => s.characters);
  const draft = useWizardStore((s) => s.draft);
  const clearDraft = useWizardStore((s) => s.clear);
  // Brouillon de création de campagne (PER-198) : alerte de reprise, propre à cette page.
  const campaignDraft = useCampaignDraftStore((s) => s.draft);
  const clearCampaignDraft = useCampaignDraftStore((s) => s.clear);

  const [toDelete, setToDelete] = useState<Campaign | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  // Id du compte courant (PER-538/498) : distingue, dans la liste ci-dessous, les
  // campagnes possédées (MJ) de celles où on n'est que membre (joueur) —
  // `fetchCampaigns` ramène désormais les deux (RLS `campaigns_player_read`).
  const [userId, setUserId] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    const supabase = createBrowserSupabaseClient();
    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (!cancelled) setUserId(session?.user.id ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  // Sections repliables (MJ / joueur) — ouvertes par défaut, état persisté en local
  // comme les autres sections repliables de l'app (archivés, réglages…).
  const [ownedOpen, setOwnedOpen] = usePersistedBoolean(storageKeys.campaigns.ownedOpen, true);
  const [memberOpen, setMemberOpen] = usePersistedBoolean(storageKeys.campaigns.memberOpen, true);
  const { showToast } = useToast();
  const notify = (message: string, severity: 'success' | 'error' = 'success') =>
    showToast(message, severity);

  // Charge les campagnes possédées au montage (idempotent).
  useEffect(() => {
    void load();
  }, [load]);

  // Décompte des personnages LOCAUX par campagne (FK `campaignId`), pour l'affichage
  // et l'avertissement de détachement à la suppression.
  const characterCount = (campaignId: string) =>
    characters.filter((c) => c.campaignId === campaignId).length;

  const confirmDelete = async () => {
    if (!toDelete) return;
    const name = toDelete.name;
    setBusy(true);
    try {
      await remove(toDelete.id);
      notify(`Campagne « ${name} » supprimée.`);
      setToDelete(null);
      setDeleteConfirm('');
    } catch (e) {
      notify(`Suppression impossible : ${e instanceof Error ? e.message : String(e)}`, 'error');
    } finally {
      setBusy(false);
    }
  };

  // Brouillon de wizard en cours (PER-180) : ne le proposer à la reprise que si sa
  // campagne existe encore (elle a pu être supprimée).
  const draftCampaign = draft ? campaigns.find((c) => c.id === draft.campaignId) : undefined;

  const sorted = [...campaigns].sort((a, b) => a.name.localeCompare(b.name));
  // MJ = propriétaire (`owner_id`) ; sinon simple membre (joueur) d'une campagne
  // possédée par quelqu'un d'autre. Tant que `userId` n'est pas résolu, on traite
  // tout comme possédé (hypothèse dominante, cf. `useAppSession`) pour ne pas
  // faire disparaître les icônes réglages/suppression le temps d'un aller-retour.
  const ownedCampaigns = sorted.filter((c) => userId == null || c.ownerId === userId);
  const memberCampaigns = sorted.filter((c) => userId != null && c.ownerId !== userId);

  // En-tête de section repliable (MJ/joueur) — même patron que la section « Archivés »
  // de la vue campagne (`/campaign/[cid]`) : icône de rôle + libellé cliquable, chevron
  // qui pivote, jamais démonté (juste replié) pour ne pas perdre le scroll.
  const renderSectionHeader = (
    icon: ReactNode,
    label: string,
    open: boolean,
    setOpen: (value: boolean) => void,
  ) => (
    <Box
      role="button"
      tabIndex={0}
      onClick={() => setOpen(!open)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setOpen(!open);
        }
      }}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        cursor: 'pointer',
        userSelect: 'none',
      }}
    >
      <ExpandMoreIcon
        fontSize="small"
        sx={{ transition: 'transform 0.2s', transform: open ? 'rotate(0deg)' : 'rotate(-90deg)' }}
      />
      {icon}
      <Typography variant="overline" color="text.secondary">
        {label}
      </Typography>
    </Box>
  );

  // `isOwner` bascule les actions MJ (réglages, suppression) contre un badge « Joueur » :
  // sur une campagne dont on n'est que membre, on n'a ni les droits d'écriture RLS, ni la
  // légitimité MJ pour les proposer.
  const renderCampaignCard = (campaign: Campaign, isOwner: boolean) => {
    const count = characterCount(campaign.id);
    return (
      <Paper
        key={campaign.id}
        variant="outlined"
        sx={{
          p: 2,
          bgcolor: 'rgba(30, 30, 34, 0.62)',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
          borderColor: 'rgba(255, 255, 255, 0.10)',
          // Fondu doux du fond au survol (inspiré des rangs de voie de la fiche et
          // des listes de personnages) : le délai (.2s) porté par l'état de BASE ne
          // joue qu'à la SORTIE — le fond met un court instant à revenir. À l'ENTRÉE,
          // la transition de `:hover` (sans délai) prend le relais, donc le fondu
          // démarre immédiatement.
          transition: 'background-color .15s ease .2s',
          '&:hover': {
            bgcolor: 'rgba(44, 44, 50, 0.72)',
            transition: 'background-color .15s ease',
          },
        }}
      >
        <Stack
          direction="row"
          spacing={1}
          sx={{ alignItems: 'flex-start', justifyContent: 'space-between' }}
        >
          <Box
            component={Link}
            href={isOwner ? hrefFromIndex('/campaign', campaignSlugIndex, campaign.id) : '/play'}
            sx={{
              minWidth: 0,
              cursor: 'pointer',
              flexGrow: 1,
              color: 'inherit',
              textDecoration: 'none',
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
              {campaign.name}
            </Typography>
            {campaign.description && (
              <Typography variant="body2" component="div" color="text.secondary" sx={{ mt: 0.25, whiteSpace: 'pre-line' }}>
                <GlossaryRichText>{campaign.description}</GlossaryRichText>
              </Typography>
            )}
            <Stack
              direction="row"
              spacing={0.5}
              sx={{ alignItems: 'center', color: 'text.secondary', mt: 0.75 }}
            >
              <PersonIcon fontSize="small" />
              <Typography variant="body2">
                {count} personnage{count > 1 ? 's' : ''}
              </Typography>
            </Stack>
          </Box>
          {isOwner && (
            <Stack direction="row" sx={{ flexShrink: 0 }}>
              <AppTooltip title="Réglages">
                <IconButton component={Link} href={`${hrefFromIndex('/campaign', campaignSlugIndex, campaign.id)}/settings`}>
                  <SettingsIcon fontSize="small" />
                </IconButton>
              </AppTooltip>
              <AppTooltip title="Supprimer">
                <IconButton
                  color="error"
                  onClick={() => {
                    setToDelete(campaign);
                    setDeleteConfirm('');
                  }}
                >
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              </AppTooltip>
            </Stack>
          )}
        </Stack>
      </Paper>
    );
  };

  return (
    <>
      <title>Campagnes — Éditeur de personnage CO2</title>
      <HomeBackground />

      <Container maxWidth="md" sx={{ py: 4 }}>
        <Stack direction="row" spacing={2} sx={{ mb: 3, flexWrap: 'wrap' }}>
          {/* Désactivé → simple bouton inerte ; sinon vraie ancre (une ancre ne
              peut pas être « disabled », on rend donc deux variantes). */}
          {status === 'unconfigured' ? (
            <Button variant="contained" startIcon={<AddIcon />} disabled>
              Nouvelle campagne
            </Button>
          ) : (
            <Button variant="contained" startIcon={<AddIcon />} component={Link} href="/campaigns/new">
              Nouvelle campagne
            </Button>
          )}
        </Stack>

        {campaignDraft && (
          <AppAlert
            severity="info"
            sx={{ mb: 3 }}
            action={
              <>
                <Button color="inherit" size="small" component={Link} href="/campaigns/new">
                  Reprendre
                </Button>
                <Button color="inherit" size="small" onClick={() => clearCampaignDraft()}>
                  Abandonner
                </Button>
              </>
            }
          >
            Une création de campagne est en cours
            {campaignDraft.name.trim() ? ` : « ${campaignDraft.name.trim()} »` : ''}.
          </AppAlert>
        )}

        {draft && draftCampaign && (
          <AppAlert
            severity="info"
            sx={{ mb: 3 }}
            action={
              <>
                <Button
                  color="inherit"
                  size="small"
                  component={Link}
                  href={`/create?campaign=${draftCampaign.id}`}
                >
                  Reprendre
                </Button>
                <Button color="inherit" size="small" onClick={() => clearDraft()}>
                  Abandonner
                </Button>
              </>
            }
          >
            Un brouillon de création est en cours dans « {draftCampaign.name} ».
          </AppAlert>
        )}

        {status === 'error' && (
          <AppAlert
            severity="error"
            sx={{ mb: 3 }}
            action={
              <Button color="inherit" size="small" onClick={() => void load({ force: true })}>
                Réessayer
              </Button>
            }
          >
            Impossible de charger les campagnes{error ? ` : ${error}` : '.'}
          </AppAlert>
        )}

        {status === 'unconfigured' ? (
          <Paper
            variant="outlined"
            sx={{
              p: { xs: 3, sm: 6 },
              textAlign: 'center',
              bgcolor: 'rgba(30, 30, 34, 0.55)',
              backdropFilter: 'blur(6px)',
              WebkitBackdropFilter: 'blur(6px)',
              borderColor: 'rgba(255, 255, 255, 0.10)',
            }}
          >
            <Typography variant="h6" sx={{ mb: 1 }}>
              Campagnes indisponibles
            </Typography>
            <Typography color="text.secondary">
              Les campagnes sont hébergées en ligne. Le service n’est pas configuré sur cette
              installation ; l’édition de personnages reste disponible en local.
            </Typography>
          </Paper>
        ) : status === 'loading' || status === 'idle' ? (
          <CampaignListSkeleton rows={3} />
        ) : sorted.length === 0 ? (
          <Paper
            variant="outlined"
            sx={{
              p: { xs: 3, sm: 6 },
              textAlign: 'center',
              bgcolor: 'rgba(30, 30, 34, 0.55)',
              backdropFilter: 'blur(6px)',
              WebkitBackdropFilter: 'blur(6px)',
              borderColor: 'rgba(255, 255, 255, 0.10)',
            }}
          >
            <Typography variant="h6" sx={{ mb: 1 }}>
              Ouvrez votre première campagne
            </Typography>
            <Typography color="text.secondary">
              Une campagne regroupe vos joueurs, leurs personnages et vos règles de table.
            </Typography>
          </Paper>
        ) : (
          <Stack spacing={2}>
            <Stack spacing={1.5}>
              {memberCampaigns.length > 0 &&
                renderSectionHeader(
                  <SupervisorAccountIcon fontSize="small" />,
                  'Vos campagnes (MJ)',
                  ownedOpen,
                  setOwnedOpen,
                )}
              <Collapse in={memberCampaigns.length === 0 || ownedOpen} unmountOnExit>
                <Stack spacing={1.5}>
                  {ownedCampaigns.map((campaign) => renderCampaignCard(campaign, true))}
                </Stack>
              </Collapse>
            </Stack>
            {memberCampaigns.length > 0 && (
              <Stack spacing={1.5}>
                {renderSectionHeader(
                  <PersonIcon fontSize="small" />,
                  'Campagnes où vous jouez',
                  memberOpen,
                  setMemberOpen,
                )}
                <Collapse in={memberOpen} unmountOnExit>
                  <Stack spacing={1.5}>
                    {memberCampaigns.map((campaign) => renderCampaignCard(campaign, false))}
                  </Stack>
                </Collapse>
              </Stack>
            )}
          </Stack>
        )}
      </Container>

      {/* Suppression — confirmation forte (retaper le nom) */}
      <Dialog
        open={toDelete !== null}
        onClose={() => {
          setToDelete(null);
          setDeleteConfirm('');
        }}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Supprimer la campagne ?</DialogTitle>
        <DialogContent>
          <DialogContentText component="div" sx={{ mb: 2 }}>
            « {toDelete?.name} » sera définitivement supprimée, ainsi que ses joueurs et leurs
            liens magiques (cascade). Ses{' '}
            <strong>
              {toDelete ? characterCount(toDelete.id) : 0} personnage
              {toDelete && characterCount(toDelete.id) > 1 ? 's' : ''}
            </strong>{' '}
            ne sont <strong>pas supprimés</strong> : ils sont détachés et repassent « Non
            attribué ». Cette action est <strong>irréversible</strong>.
          </DialogContentText>
          <DialogContentText sx={{ mb: 1 }}>
            Pour confirmer, retapez le nom de la campagne :
          </DialogContentText>
          <TextField
            autoFocus
            fullWidth
            size="small"
            placeholder={toDelete?.name}
            value={deleteConfirm}
            onChange={(e) => setDeleteConfirm(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setToDelete(null);
              setDeleteConfirm('');
            }}
          >
            Annuler
          </Button>
          <Button
            color="error"
            variant="contained"
            disabled={busy || deleteConfirm.trim() !== toDelete?.name}
            onClick={() => void confirmDelete()}
          >
            Supprimer définitivement
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
