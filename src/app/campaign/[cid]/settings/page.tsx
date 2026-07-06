'use client';

/**
 * Réglages d'une campagne (PER-183) — route dédiée `/campaign/[cid]/settings`,
 * **owner-only** (gating proxy : `/campaign/*` exige une session MJ). On a choisi
 * une page plutôt qu'une modale car la configuration a vocation à grandir (règles
 * de table successives, cf. milestone « Campagnes »).
 *
 * Regroupe sur une seule page, en sections : le **nom** et les **notes** du MJ, et
 * les **règles de table** (`CampaignRules`). L'édition est locale (état de
 * formulaire) et n'est propagée au cloud qu'au clic explicite sur « Enregistrer »
 * (état modifié/enregistré) — écriture simple, sans verrou optimiste (table
 * `campaigns` mono-propriétaire, cf. `updateCampaign`).
 *
 * ⚠️ L'interrupteur « Armes à feu autorisées » **persiste** `rules.firearmsAllowed`
 * mais rien ne le lit encore (le wizard et la fiche utilisent aujourd'hui un
 * `character.firearmsAllowed` par personnage) : son effet de bout en bout relève de
 * PER-185. Ici, la DoD est « persisté et rechargé correctement ».
 */
import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SaveIcon from '@mui/icons-material/Save';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Container from '@mui/material/Container';
import FormControlLabel from '@mui/material/FormControlLabel';
import Paper from '@mui/material/Paper';
import Snackbar from '@mui/material/Snackbar';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { AppAlert } from '@/components/AppAlert';
import { AccountMenu } from '@/components/AccountMenu';
import { AppHeader } from '@/components/AppHeader';
import { AppTooltip } from '@/components/AppTooltip';
import { HomeBackground } from '@/components/HomeBackground';
import type { CampaignRules } from '@/lib/campaign';
import { useCampaignsStore } from '@/stores/campaigns';

/** Verre dépoli commun aux cartes de réglages (aligné sur les autres pages). */
const glassPaper = {
  p: { xs: 2.5, sm: 3 },
  bgcolor: 'rgba(30, 30, 34, 0.62)',
  backdropFilter: 'blur(6px)',
  WebkitBackdropFilter: 'blur(6px)',
  borderColor: 'rgba(255, 255, 255, 0.10)',
} as const;

export default function CampaignSettingsPage({ params }: { params: Promise<{ cid: string }> }) {
  const { cid } = use(params);
  const router = useRouter();
  const status = useCampaignsStore((s) => s.status);
  const load = useCampaignsStore((s) => s.load);
  const update = useCampaignsStore((s) => s.update);
  const campaign = useCampaignsStore((s) => s.campaigns.find((c) => c.id === cid));

  // Charge les campagnes possédées au montage : la campagne courante est résolue
  // depuis ce cache cloud (RLS `owner_id`).
  useEffect(() => {
    void load();
  }, [load]);

  // État de formulaire local — l'édition n'est propagée au cloud qu'à l'enregistrement.
  // `null` = pas encore initialisé depuis la campagne chargée (évite d'écraser la
  // saisie à chaque recharge du cache).
  interface Form {
    name: string;
    description: string;
    firearmsAllowed: boolean;
  }
  const [form, setForm] = useState<Form | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ message: string; severity: 'success' | 'error' } | null>(
    null,
  );

  // Initialise le formulaire dès que la campagne est disponible (une seule fois).
  useEffect(() => {
    if (campaign && !form) {
      // Synchronisation ponctuelle d'un état externe (la campagne chargée) vers le
      // formulaire local, gardée par `form === null` : pas une boucle de rendu.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setForm({
        name: campaign.name,
        description: campaign.description ?? '',
        firearmsAllowed: campaign.rules.firearmsAllowed,
      });
    }
  }, [campaign, form]);

  // Formulaire modifié par rapport à la campagne enregistrée ? Pilote le bouton
  // « Enregistrer » (désactivé si rien n'a changé) et le libellé d'état.
  const dirty =
    form !== null &&
    campaign !== undefined &&
    (form.name.trim() !== campaign.name ||
      (form.description.trim() || null) !== (campaign.description ?? null) ||
      form.firearmsAllowed !== campaign.rules.firearmsAllowed);

  const handleSave = async () => {
    if (!campaign || !form) return;
    setBusy(true);
    try {
      const rules: CampaignRules = { firearmsAllowed: form.firearmsAllowed };
      await update(campaign.id, { name: form.name, description: form.description, rules });
      setToast({ message: 'Réglages enregistrés.', severity: 'success' });
    } catch (e) {
      setToast({
        message: `Enregistrement impossible : ${e instanceof Error ? e.message : String(e)}`,
        severity: 'error',
      });
    } finally {
      setBusy(false);
    }
  };

  const loading = status === 'idle' || status === 'loading';

  return (
    <>
      <title>Réglages de la campagne — Éditeur de personnage CO2</title>
      <HomeBackground />
      <AppHeader
        title="Réglages de la campagne"
        onBack={() => router.push(`/campaign/${cid}`)}
        action={<AccountMenu />}
      />

      <Container maxWidth="md" sx={{ py: 4 }}>
        {status === 'unconfigured' ? (
          <Paper variant="outlined" sx={{ ...glassPaper, p: 6, textAlign: 'center' }}>
            <Typography variant="h6" sx={{ mb: 1 }}>
              Campagnes indisponibles
            </Typography>
            <Typography color="text.secondary">
              Les campagnes sont hébergées en ligne. Le service n’est pas configuré sur cette
              installation.
            </Typography>
          </Paper>
        ) : loading && !campaign ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : !campaign ? (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography variant="h6" gutterBottom>
              Campagne introuvable
            </Typography>
            <Button startIcon={<ArrowBackIcon />} onClick={() => router.push('/campaigns')}>
              Retour aux campagnes
            </Button>
          </Box>
        ) : (
          <Stack spacing={3}>
            {status === 'error' && (
              <AppAlert severity="error">
                Une erreur est survenue lors du dernier échange avec le serveur.
              </AppAlert>
            )}

            {/* Section : identité de la campagne (nom + notes du MJ). */}
            <Paper variant="outlined" sx={glassPaper}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Campagne
              </Typography>
              <Stack spacing={2}>
                <TextField
                  label="Nom de la campagne"
                  fullWidth
                  value={form?.name ?? ''}
                  onChange={(e) => setForm((f) => (f ? { ...f, name: e.target.value } : f))}
                />
                <TextField
                  label="Notes du MJ (optionnel)"
                  fullWidth
                  multiline
                  minRows={3}
                  value={form?.description ?? ''}
                  onChange={(e) =>
                    setForm((f) => (f ? { ...f, description: e.target.value } : f))
                  }
                />
              </Stack>
            </Paper>

            {/* Section : règles de table (éditeur sur-mesure, pas de moteur générique). */}
            <Paper variant="outlined" sx={glassPaper}>
              <Typography variant="h6" sx={{ mb: 0.5 }}>
                Règles de table
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Décisions d’univers qui s’appliquent aux personnages de la campagne.
              </Typography>
              <AppTooltip
                title="Univers sans poudre : l’arquebusier combat à l’arbalète et devient « arbalétrier »."
                page={62}
              >
                <FormControlLabel
                  control={
                    <Switch
                      checked={form?.firearmsAllowed ?? true}
                      onChange={(e) =>
                        setForm((f) => (f ? { ...f, firearmsAllowed: e.target.checked } : f))
                      }
                    />
                  }
                  label="Armes à feu autorisées"
                />
              </AppTooltip>
            </Paper>

            {/* Barre d'action : enregistrement explicite + état modifié/enregistré. */}
            <Stack
              direction="row"
              spacing={2}
              sx={{ alignItems: 'center', justifyContent: 'flex-end' }}
            >
              <Typography variant="body2" color="text.secondary">
                {dirty ? 'Modifications non enregistrées' : 'À jour'}
              </Typography>
              <Button
                variant="contained"
                startIcon={<SaveIcon />}
                disabled={!dirty || busy}
                onClick={() => void handleSave()}
              >
                Enregistrer
              </Button>
            </Stack>
          </Stack>
        )}
      </Container>

      <Snackbar
        open={toast !== null}
        autoHideDuration={5000}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {toast ? (
          <AppAlert
            severity={toast.severity}
            variant="filled"
            onClose={() => setToast(null)}
            sx={{ width: '100%' }}
          >
            {toast.message}
          </AppAlert>
        ) : undefined}
      </Snackbar>
    </>
  );
}
