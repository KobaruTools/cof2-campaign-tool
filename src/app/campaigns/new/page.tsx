'use client';

/**
 * Assistant de création de campagne (PER-198) — remplace l'ancien dialogue « nom +
 * notes » puis redirection vers les réglages. Calqué sur le wizard de personnage
 * (`src/app/create/page.tsx`) : même langage visuel (Stepper, carte en verre
 * dépoli, boutons Précédent/Suivant, récapitulatif final) et **même mécanique de
 * brouillon** (`useCampaignDraftStore`, persisté) : interrompre la création la
 * conserve, `/campaigns` propose de la reprendre.
 *
 * Quatre étapes : Identité (nom + notes) → Règles de table (mutualisées avec la
 * page de réglages via `CampaignRulesFields`) → Joueurs (ajout des noms) →
 * Récapitulatif. Le brouillon est **purement local** : RIEN n'est écrit au cloud
 * avant le dernier clic (« Créer la campagne »). Pour afficher les **liens
 * magiques** dès le récapitulatif, les `joinSecret` sont pré-générés côté client à
 * l'ajout d'un joueur ; la création finale insère la campagne (règles posées) puis
 * les joueurs avec ces secrets, efface le brouillon et mène à la campagne.
 *
 * L'**édition** d'une campagne existante reste du ressort de la page de réglages
 * (roue crantée) — cet assistant ne sert qu'à la création.
 */
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AddIcon from '@mui/icons-material/Add';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Container from '@mui/material/Container';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import Paper from '@mui/material/Paper';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import Stepper from '@mui/material/Stepper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { AppAlert } from '@/components/AppAlert';
import { useToast } from '@/components/toast/ToastProvider';
import { AppHeader } from '@/components/AppHeader';
import { AppTooltip } from '@/components/AppTooltip';
import { CampaignRulesFields } from '@/components/campaign/CampaignRulesFields';
import { HomeBackground } from '@/components/HomeBackground';
import { insertPlayer } from '@/lib/player/repo';
import { joinLinkUrl } from '@/lib/player/types';
import { useCampaignsStore } from '@/stores/campaigns';
import { useCampaignDraftStore } from '@/stores/campaignDraft';

const STEP_LABELS = ['Identité', 'Règles de table', 'Joueurs', 'Récapitulatif'] as const;

/** Carte en verre dépoli, alignée sur le wizard de personnage et l'accueil. */
const glassPaper = {
  p: { xs: 2, sm: 3 },
  mb: 3,
  bgcolor: 'rgba(30, 30, 34, 0.62)',
  backdropFilter: 'blur(6px)',
  WebkitBackdropFilter: 'blur(6px)',
  borderColor: 'rgba(255, 255, 255, 0.10)',
} as const;

export default function CampaignCreatePage() {
  const router = useRouter();
  const status = useCampaignsStore((s) => s.status);
  const loadCampaigns = useCampaignsStore((s) => s.load);
  const createCampaign = useCampaignsStore((s) => s.create);

  const hasHydrated = useCampaignDraftStore((s) => s.hasHydrated);
  const draft = useCampaignDraftStore((s) => s.draft);
  const start = useCampaignDraftStore((s) => s.start);
  const patch = useCampaignDraftStore((s) => s.patch);
  const setStep = useCampaignDraftStore((s) => s.setStep);
  const addPlayer = useCampaignDraftStore((s) => s.addPlayer);
  const removePlayer = useCampaignDraftStore((s) => s.removePlayer);
  const regeneratePlayer = useCampaignDraftStore((s) => s.regeneratePlayer);
  const clear = useCampaignDraftStore((s) => s.clear);

  const { showToast } = useToast();

  // Origine lue à l'init (client) pour construire les URLs de liens magiques.
  const [origin] = useState(() => (typeof window !== 'undefined' ? window.location.origin : ''));
  const [newPlayerName, setNewPlayerName] = useState('');
  const [committing, setCommitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Après création réussie : le brouillon est vidé mais la navigation n'est pas
  // encore effective — on verrouille l'écran d'attente pour éviter que l'effet de
  // démarrage ne recrée aussitôt un brouillon vierge (cf. wizard de personnage).
  const [redirecting, setRedirecting] = useState(false);

  // État du service cloud (la création écrit au cloud).
  useEffect(() => {
    void loadCampaigns();
  }, [loadCampaigns]);

  // Démarre un brouillon si aucun n'est en cours (après hydratation). Un brouillon
  // déjà présent est repris tel quel (reprise depuis l'alerte `/campaigns`).
  useEffect(() => {
    if (!hasHydrated || draft || redirecting) return;
    start();
  }, [hasHydrated, draft, start, redirecting]);

  const handleCreate = async () => {
    if (!draft) return;
    setCommitting(true);
    setError(null);
    // 1) La campagne, avec ses règles déjà posées.
    let campaign;
    try {
      campaign = await createCampaign(draft.name, draft.description, draft.rules);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setCommitting(false);
      return;
    }
    // 2) Les joueurs, avec leurs secrets pré-générés (mêmes liens que le récap). La
    // campagne existe déjà : un échec joueur n'annule pas la création (non bloquant,
    // le MJ finit depuis la campagne) et ne relance jamais la création de campagne.
    const failed: string[] = [];
    for (const p of draft.players) {
      try {
        await insertPlayer(campaign.id, p.name, p.joinSecret);
      } catch {
        failed.push(p.name);
      }
    }
    if (failed.length > 0) {
      showToast(
        `Joueur(s) non créé(s) : ${failed.join(', ')}. Tu pourras les ajouter depuis la campagne.`,
        'error',
      );
    }
    // Verrouille l'écran d'attente AVANT de vider le brouillon (cf. redirecting).
    setRedirecting(true);
    clear();
    router.push(`/campaign/${campaign.id}`);
  };

  const handleCopy = async (secret: string) => {
    try {
      await navigator.clipboard.writeText(joinLinkUrl(origin, secret));
      showToast('Lien copié.', 'success');
    } catch {
      showToast('Impossible de copier le lien.', 'error');
    }
  };

  const addFromField = () => {
    const n = newPlayerName.trim();
    if (!n) return;
    addPlayer(n);
    setNewPlayerName('');
  };

  // Écran d'attente pendant la redirection post-création (brouillon déjà vidé).
  if (redirecting || committing) {
    return (
      <Box
        sx={{
          position: 'fixed',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 2,
        }}
      >
        <CircularProgress />
        <Typography color="text.secondary">Création de la campagne…</Typography>
      </Box>
    );
  }

  const unconfigured = status === 'unconfigured';

  const step = draft ? Math.min(draft.step, STEP_LABELS.length - 1) : 0;
  const isLast = step === STEP_LABELS.length - 1;
  const nameValid = (draft?.name.trim().length ?? 0) > 0;
  const canNext = step === 0 ? nameValid : true;

  const navButtons = (
    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
      <Button disabled={step === 0} onClick={() => setStep(step - 1)}>
        Précédent
      </Button>
      {isLast ? (
        <Button variant="contained" onClick={() => void handleCreate()} disabled={!nameValid}>
          Créer la campagne
        </Button>
      ) : (
        <Button variant="contained" disabled={!canNext} onClick={() => setStep(step + 1)}>
          Suivant
        </Button>
      )}
    </Box>
  );

  return (
    <>
      <title>Nouvelle campagne — Éditeur de personnage CO2</title>
      <HomeBackground />
      <AppHeader title="Nouvelle campagne" backHref="/campaigns" />

      <Container maxWidth="md" sx={{ py: 4 }}>
        {unconfigured ? (
          <Paper variant="outlined" sx={{ ...glassPaper, p: 6, textAlign: 'center' }}>
            <Typography variant="h6" sx={{ mb: 1 }}>
              Campagnes indisponibles
            </Typography>
            <Typography color="text.secondary">
              Les campagnes sont hébergées en ligne. Le service n’est pas configuré sur cette
              installation ; l’édition de personnages reste disponible en local.
            </Typography>
          </Paper>
        ) : !hasHydrated || !draft ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <Stepper activeStep={step} alternativeLabel sx={{ mb: 4 }}>
              {STEP_LABELS.map((label) => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>

            <Box sx={{ mb: 3 }}>{navButtons}</Box>

            <Paper variant="outlined" sx={glassPaper}>
              {step === 0 && (
                <Stack spacing={2}>
                  <Typography variant="h6">Identité de la campagne</Typography>
                  <TextField
                    autoFocus
                    label="Nom de la campagne"
                    fullWidth
                    value={draft.name}
                    onChange={(e) => patch({ name: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey && nameValid) setStep(1);
                    }}
                  />
                  <TextField
                    label="Notes du MJ (optionnel)"
                    fullWidth
                    multiline
                    minRows={3}
                    value={draft.description}
                    onChange={(e) => patch({ description: e.target.value })}
                  />
                </Stack>
              )}

              {step === 1 && (
                <Stack spacing={2}>
                  <Typography variant="h6">Règles de table</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Décisions d’univers qui s’appliquent aux personnages de la campagne. Vous
                    pourrez les modifier à tout moment depuis les réglages.
                  </Typography>
                  <CampaignRulesFields rules={draft.rules} onChange={(rules) => patch({ rules })} />
                </Stack>
              )}

              {step === 2 && (
                <Stack spacing={2}>
                  <Typography variant="h6">Joueurs</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Ajoute les joueurs de ta table. Leurs liens d’invitation apparaîtront au
                    récapitulatif et seront créés avec la campagne. Étape facultative — tu peux
                    aussi ajouter des joueurs plus tard depuis les réglages.
                  </Typography>
                  <Stack direction="row" spacing={1}>
                    <TextField
                      size="small"
                      fullWidth
                      label="Nom du joueur"
                      value={newPlayerName}
                      onChange={(e) => setNewPlayerName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') addFromField();
                      }}
                    />
                    <Button
                      variant="contained"
                      startIcon={<AddIcon />}
                      onClick={addFromField}
                      disabled={newPlayerName.trim() === ''}
                    >
                      Ajouter
                    </Button>
                  </Stack>
                  {draft.players.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                      Aucun joueur pour l’instant.
                    </Typography>
                  ) : (
                    <Stack spacing={1}>
                      {draft.players.map((player, i) => (
                        <Stack
                          key={player.joinSecret}
                          direction="row"
                          spacing={1}
                          sx={{
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            p: 1,
                            pl: 1.5,
                            borderRadius: 1.5,
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            bgcolor: 'rgba(0, 0, 0, 0.20)',
                          }}
                        >
                          <Typography variant="body1" sx={{ minWidth: 0 }}>
                            {player.name}
                          </Typography>
                          <AppTooltip title="Retirer">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => removePlayer(i)}
                            >
                              <DeleteOutlineIcon fontSize="small" />
                            </IconButton>
                          </AppTooltip>
                        </Stack>
                      ))}
                    </Stack>
                  )}
                </Stack>
              )}

              {step === 3 && (
                <Stack spacing={2}>
                  <Typography variant="h6">Récapitulatif</Typography>
                  <Box>
                    <Typography variant="overline" color="text.secondary">
                      Nom
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>
                      {draft.name.trim() || 'Nouvelle campagne'}
                    </Typography>
                  </Box>
                  {draft.description.trim() && (
                    <Box>
                      <Typography variant="overline" color="text.secondary">
                        Notes du MJ
                      </Typography>
                      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                        {draft.description.trim()}
                      </Typography>
                    </Box>
                  )}
                  <Box>
                    <Typography variant="overline" color="text.secondary">
                      Règles de table
                    </Typography>
                    <Typography variant="body2">
                      Armes à feu {draft.rules.firearmsAllowed ? 'autorisées' : 'interdites'}.
                    </Typography>
                  </Box>

                  <Box>
                    <Typography variant="overline" color="text.secondary">
                      Joueurs & liens d’invitation
                    </Typography>
                    {draft.players.length === 0 ? (
                      <Typography variant="body2" color="text.secondary">
                        Aucun joueur — tu pourras en ajouter depuis les réglages.
                      </Typography>
                    ) : (
                      <>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                          Chaque joueur reçoit un lien magique unique : en l’ouvrant, il rejoint la
                          campagne sans créer de compte et pourra éditer sa fiche. Garde ces liens
                          privés — tu peux en régénérer un ici s’il te semble compromis.
                        </Typography>
                        <Stack spacing={1}>
                          {draft.players.map((player, i) => (
                            <Stack
                              key={player.joinSecret}
                              direction={{ xs: 'column', sm: 'row' }}
                              spacing={1}
                              sx={{ alignItems: { sm: 'center' } }}
                            >
                              <Typography
                                variant="subtitle1"
                                sx={{ fontWeight: 600, minWidth: { sm: 120 }, flexShrink: 0 }}
                              >
                                {player.name}
                              </Typography>
                              <TextField
                                size="small"
                                fullWidth
                                label="Lien magique"
                                value={joinLinkUrl(origin, player.joinSecret)}
                                slotProps={{
                                  input: {
                                    readOnly: true,
                                    endAdornment: (
                                      <InputAdornment position="end">
                                        <AppTooltip title="Copier le lien">
                                          <IconButton
                                            size="small"
                                            edge="end"
                                            onClick={() => void handleCopy(player.joinSecret)}
                                          >
                                            <ContentCopyIcon fontSize="small" />
                                          </IconButton>
                                        </AppTooltip>
                                        <AppTooltip title="Régénérer le lien">
                                          <IconButton
                                            size="small"
                                            edge="end"
                                            onClick={() => regeneratePlayer(i)}
                                          >
                                            <AutorenewIcon fontSize="small" />
                                          </IconButton>
                                        </AppTooltip>
                                      </InputAdornment>
                                    ),
                                  },
                                }}
                              />
                            </Stack>
                          ))}
                        </Stack>
                      </>
                    )}
                  </Box>
                </Stack>
              )}
            </Paper>

            {/* Étape Identité incomplète : rappel de l'action attendue. */}
            {!canNext && (
              <AppAlert severity="info" sx={{ mb: 2 }}>
                Donne un nom à ta campagne pour continuer.
              </AppAlert>
            )}

            {error && (
              <AppAlert severity="error" sx={{ mb: 2 }}>
                Création impossible : {error}
              </AppAlert>
            )}

            {navButtons}
          </>
        )}
      </Container>
    </>
  );
}
