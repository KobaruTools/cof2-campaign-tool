'use client';

/**
 * Gestion du LIEN DE PROJECTION (PER-271, côté MJ) — bouton de l'écran de MJ, à côté de
 * « Ouvrir dans une nouvelle fenêtre » (`OpenTrackerWindowButton`). Ouvre une modale où le
 * MJ génère / copie / régénère / révoque le lien partageable `<origine>/project/<secret>`.
 *
 * Le lien ouvre une session d'OBSERVATEUR en lecture seule (aucune connexion MJ ni joueur
 * requise sur l'appareil cible) : idéal pour une TV ou un second ordinateur affichant
 * l'ordre d'initiative. Régénérer/révoquer coupe les écrans déjà ouverts (révocation forte,
 * Server Actions). Un seul lien réutilisable par campagne.
 *
 * État local au composant (pas de store global : ce lien n'est lu qu'ici, contrairement au
 * roster de joueurs). Lecture/création via le repo navigateur (RLS propriétaire) ; la
 * régénération et la révocation passent par les Server Actions privilégiées.
 */
import { useEffect, useState } from 'react';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import ConnectedTvIcon from '@mui/icons-material/ConnectedTv';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { AppAlert } from '@/components/AppAlert';
import { AppTooltip } from '@/components/AppTooltip';
import { CollapsibleLabelButton } from '@/components/CollapsibleLabelButton';
import { useToast } from '@/components/toast/ToastProvider';
import { regenerateProjectionLink, revokeProjectionLink } from '@/lib/projection/actions';
import { createProjectionLink, fetchProjectionLink } from '@/lib/projection/repo';
import { projectionLinkUrl, type ProjectionLink } from '@/lib/projection/types';

export function ProjectionLinkControl({ campaignId }: { campaignId: string }) {
  const [open, setOpen] = useState(false);
  const [link, setLink] = useState<ProjectionLink | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmRegenerate, setConfirmRegenerate] = useState(false);
  const [confirmRevoke, setConfirmRevoke] = useState(false);

  const [origin] = useState(() =>
    typeof window !== 'undefined' ? window.location.origin : '',
  );

  const { showToast } = useToast();
  const notify = (message: string, severity: 'success' | 'error' = 'success') =>
    showToast(message, severity);

  // Chargement paresseux : on ne lit le lien qu'à la PREMIÈRE ouverture de la modale.
  useEffect(() => {
    if (!open || loaded) return;
    let active = true;
    void fetchProjectionLink(campaignId)
      .then((result) => {
        if (active) {
          setLink(result);
          setLoaded(true);
        }
      })
      .catch(() => {
        if (active) {
          notify('Impossible de charger le lien de projection.', 'error');
          setLoaded(true);
        }
      });
    return () => {
      active = false;
    };
    // `notify`/`loaded` volontairement hors deps : on ne recharge qu'au (re)passage à `open`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, campaignId]);

  const handleGenerate = async () => {
    setBusy(true);
    try {
      setLink(await createProjectionLink(campaignId));
      notify('Lien de projection généré.');
    } catch {
      notify('Échec de la génération du lien.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleCopy = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(projectionLinkUrl(origin, link.secret));
      notify('Lien copié.');
    } catch {
      notify('Impossible de copier le lien.', 'error');
    }
  };

  const handleRegenerate = async () => {
    setConfirmRegenerate(false);
    setBusy(true);
    try {
      const { secret } = await regenerateProjectionLink(campaignId);
      setLink((prev) => (prev ? { ...prev, secret } : prev));
      notify("Lien régénéré. L'ancien lien ne fonctionne plus.");
    } catch {
      notify('Échec de la régénération du lien.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleRevoke = async () => {
    setConfirmRevoke(false);
    setBusy(true);
    try {
      await revokeProjectionLink(campaignId);
      setLink(null);
      notify('Lien de projection révoqué.');
    } catch {
      notify('Échec de la révocation du lien.', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box sx={{ display: 'contents' }} data-glossary-shot="ProjectionLinkControl">
      {/* Libellé replié sur la seule icône sous `xl` : à deux boutons à libellé long, l'en-tête du
          tracker passait à la ligne (cf. `CollapsibleLabelButton`). */}
      <CollapsibleLabelButton
        variant="outlined"
        size="small"
        icon={<ConnectedTvIcon />}
        label="Lien de projection"
        onClick={() => setOpen(true)}
      />

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Lien de projection</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Partage ce lien vers une TV ou un second ordinateur : il affiche l&apos;ordre
            d&apos;initiative en direct, en lecture seule, sans aucune connexion. À garder
            privé — régénère-le s&apos;il a fuité.
          </DialogContentText>

          {!loaded ? (
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', py: 1 }}>
              <CircularProgress size={18} />
              <Typography variant="body2" color="text.secondary">
                Chargement…
              </Typography>
            </Stack>
          ) : link ? (
            <TextField
              size="small"
              fullWidth
              label="Lien de projection"
              value={projectionLinkUrl(origin, link.secret)}
              slotProps={{
                input: {
                  readOnly: true,
                  endAdornment: (
                    <InputAdornment position="end">
                      {busy ? <CircularProgress size={18} sx={{ mr: 1 }} /> : null}
                      <AppTooltip title="Copier le lien">
                        <span style={{ display: 'inline-flex' }}>
                          <IconButton size="small" edge="end" disabled={busy} onClick={() => void handleCopy()}>
                            <ContentCopyIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </AppTooltip>
                      <AppTooltip title="Régénérer (coupe l'ancien lien et les écrans ouverts)">
                        <span style={{ display: 'inline-flex' }}>
                          <IconButton
                            size="small"
                            edge="end"
                            disabled={busy}
                            onClick={() => setConfirmRegenerate(true)}
                          >
                            <AutorenewIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </AppTooltip>
                      <AppTooltip title="Révoquer (supprime le lien)">
                        <span style={{ display: 'inline-flex' }}>
                          <IconButton
                            size="small"
                            edge="end"
                            color="error"
                            disabled={busy}
                            onClick={() => setConfirmRevoke(true)}
                          >
                            <DeleteOutlineIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </AppTooltip>
                    </InputAdornment>
                  ),
                },
              }}
            />
          ) : (
            <Box>
              <AppAlert severity="info" sx={{ mb: 2 }}>
                Aucun lien de projection pour cette campagne.
              </AppAlert>
              <Button
                variant="contained"
                startIcon={<ConnectedTvIcon />}
                onClick={() => void handleGenerate()}
                disabled={busy}
              >
                Générer le lien
              </Button>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Fermer</Button>
        </DialogActions>
      </Dialog>

      {/* Régénérer */}
      <Dialog open={confirmRegenerate} onClose={() => setConfirmRegenerate(false)}>
        <DialogTitle>Régénérer le lien ?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Un nouveau lien sera généré. L&apos;ancien cessera de fonctionner et les écrans de
            projection déjà ouverts seront déconnectés. Utile si le lien a fuité.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmRegenerate(false)}>Annuler</Button>
          <Button onClick={() => void handleRegenerate()}>Régénérer</Button>
        </DialogActions>
      </Dialog>

      {/* Révoquer */}
      <Dialog open={confirmRevoke} onClose={() => setConfirmRevoke(false)}>
        <DialogTitle>Révoquer le lien ?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Le lien sera supprimé et les écrans de projection ouverts seront déconnectés. Tu
            pourras en générer un nouveau à tout moment.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmRevoke(false)}>Annuler</Button>
          <Button color="error" onClick={() => void handleRevoke()}>
            Révoquer
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
