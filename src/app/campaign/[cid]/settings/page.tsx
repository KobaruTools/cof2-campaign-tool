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
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SaveIcon from '@mui/icons-material/Save';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Collapse from '@mui/material/Collapse';
import Container from '@mui/material/Container';
import Paper from '@mui/material/Paper';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { AppAlert } from '@/components/AppAlert';
import { useToast } from '@/components/toast/ToastProvider';
import { AccountMenu } from '@/components/AccountMenu';
import { AppHeader } from '@/components/AppHeader';
import { CampaignRulesFields } from '@/components/campaign/CampaignRulesFields';
import { PlayersSection } from '@/components/campaign/PlayersSection';
import { HomeBackground } from '@/components/HomeBackground';
import { DEFAULT_CAMPAIGN_RULES, type CampaignRules } from '@/lib/campaign';
import { usePersistedBoolean } from '@/lib/ui/usePersistedBoolean';
import { useCampaignsStore } from '@/stores/campaigns';

/** Verre dépoli commun aux cartes de réglages (aligné sur les autres pages). */
const glassPaper = {
  p: { xs: 2.5, sm: 3 },
  bgcolor: 'rgba(30, 30, 34, 0.62)',
  backdropFilter: 'blur(6px)',
  WebkitBackdropFilter: 'blur(6px)',
  borderColor: 'rgba(255, 255, 255, 0.10)',
} as const;

/**
 * Badge « Bientôt » (fonctionnalité à venir). Bloc custom volontaire — la règle
 * projet bannit les `Chip` MUI au profit de badges maison.
 */
function ComingSoonBadge() {
  return (
    <Box
      component="span"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        px: 1,
        py: 0.25,
        borderRadius: 1,
        fontSize: '0.7rem',
        fontWeight: 700,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        lineHeight: 1.4,
        color: '#ffd54f',
        border: '1px solid rgba(255, 213, 79, 0.5)',
        bgcolor: 'rgba(255, 213, 79, 0.12)',
      }}
    >
      Bientôt
    </Box>
  );
}

/**
 * Section de réglages repliable dont l'état (ouvert/fermé) est persisté en local.
 * Même affordance que la section « Archivés » (accueil et vue campagne) : chevron
 * rotatif + en-tête cliquable au clavier comme à la souris.
 */
function CollapsibleSection({
  title,
  storageKey,
  defaultOpen = true,
  children,
}: {
  title: string;
  /** Clé `localStorage` de l'état replié/déplié (préférence d'UI, non liée à la campagne). */
  storageKey: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = usePersistedBoolean(storageKey, defaultOpen);
  return (
    <Paper variant="outlined" sx={glassPaper}>
      <Box
        role="button"
        tabIndex={0}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setOpen(!open);
          }
        }}
        sx={{ display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer', userSelect: 'none' }}
      >
        <ExpandMoreIcon
          sx={{
            transition: 'transform 0.2s',
            transform: open ? 'rotate(0deg)' : 'rotate(-90deg)',
          }}
        />
        <Typography variant="h6">{title}</Typography>
      </Box>
      <Collapse in={open} unmountOnExit>
        <Box sx={{ mt: 2 }}>{children}</Box>
      </Collapse>
    </Paper>
  );
}

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
    rules: CampaignRules;
  }
  const [form, setForm] = useState<Form | null>(null);
  const [busy, setBusy] = useState(false);
  const { showToast } = useToast();

  // Initialise le formulaire dès que la campagne est disponible (une seule fois).
  useEffect(() => {
    if (campaign && !form) {
      // Synchronisation ponctuelle d'un état externe (la campagne chargée) vers le
      // formulaire local, gardée par `form === null` : pas une boucle de rendu.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setForm({
        name: campaign.name,
        description: campaign.description ?? '',
        rules: campaign.rules,
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
      form.rules.firearmsAllowed !== campaign.rules.firearmsAllowed ||
      form.rules.hitDieOnLevelUp !== campaign.rules.hitDieOnLevelUp);

  const handleSave = async () => {
    if (!campaign || !form) return;
    setBusy(true);
    try {
      await update(campaign.id, {
        name: form.name,
        description: form.description,
        rules: form.rules,
      });
      showToast('Réglages enregistrés.', 'success');
    } catch (e) {
      showToast(
        `Enregistrement impossible : ${e instanceof Error ? e.message : String(e)}`,
        'error',
      );
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
          <Stack spacing={3} aria-hidden>
            {/* Section « Campagne » : titre + champ nom + champ notes (multiligne). */}
            <Paper variant="outlined" sx={glassPaper}>
              <Skeleton animation="wave" variant="text" width={120} sx={{ fontSize: '1.25rem', mb: 2 }} />
              <Stack spacing={2}>
                <Skeleton animation="wave" variant="rounded" height={56} sx={{ borderRadius: 1 }} />
                <Skeleton animation="wave" variant="rounded" height={100} sx={{ borderRadius: 1 }} />
              </Stack>
            </Paper>
            {/* Placeholder PDF + sections repliables (titres seuls). */}
            <Paper variant="outlined" sx={glassPaper}>
              <Skeleton animation="wave" variant="text" width={220} sx={{ fontSize: '1.25rem' }} />
            </Paper>
            <Paper variant="outlined" sx={glassPaper}>
              <Skeleton animation="wave" variant="text" width={100} sx={{ fontSize: '1.25rem' }} />
            </Paper>
            <Paper variant="outlined" sx={glassPaper}>
              <Skeleton animation="wave" variant="text" width={150} sx={{ fontSize: '1.25rem' }} />
            </Paper>
          </Stack>
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

            {/* Placeholder : téléversement de PDF de campagne (à concevoir). Bordure
                pointillée + badge « Bientôt » pour signaler un aspect non encore traité. */}
            <Paper variant="outlined" sx={{ ...glassPaper, borderStyle: 'dashed' }}>
              <Stack
                direction="row"
                spacing={1.5}
                sx={{ alignItems: 'center', mb: 1, flexWrap: 'wrap', rowGap: 1 }}
              >
                <UploadFileIcon sx={{ color: 'text.disabled' }} />
                <Typography variant="h6">Documents de campagne (PDF)</Typography>
                <ComingSoonBadge />
              </Stack>
              <Typography variant="body2" color="text.secondary">
                Téléversez les PDF propres à votre campagne — règles maison, aides de jeu,
                cartes, écran du MJ — pour les garder à portée de main. Cet aspect des
                campagnes reste à concevoir et arrivera dans une prochaine version.
              </Typography>
            </Paper>

            {/* Section : joueurs (3ᵉ position, après le placeholder PDF). Déplacée depuis
                la vue campagne. Repliable, état persisté ; contenu « bare » car l'en-tête
                et le repli sont fournis ici par `CollapsibleSection`. */}
            <CollapsibleSection title="Joueurs" storageKey="campaign-settings-players-open">
              <PlayersSection campaignId={cid} bare />
            </CollapsibleSection>

            {/* Section : règles de table (repliable, état persisté). Éditeur sur-mesure ;
                chaque règle occupe son propre bloc — titre, description et renvoi au livre. */}
            <CollapsibleSection title="Règles de table" storageKey="campaign-settings-rules-open">
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Décisions d’univers qui s’appliquent aux personnages de la campagne.
              </Typography>
              <CampaignRulesFields
                rules={form?.rules ?? DEFAULT_CAMPAIGN_RULES}
                onChange={(rules) => setForm((f) => (f ? { ...f, rules } : f))}
              />
            </CollapsibleSection>

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
    </>
  );
}
