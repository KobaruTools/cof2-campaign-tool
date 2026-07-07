'use client';

/**
 * Assistant de création de campagne (PER-198) — remplace l'ancien dialogue « nom +
 * notes » puis redirection vers les réglages. Calqué sur le wizard de personnage
 * (`src/app/create/page.tsx`) : même langage visuel (Stepper, carte en verre
 * dépoli, boutons Précédent/Suivant, récapitulatif final), pour offrir au MJ une
 * création guidée qui aboutit à une campagne **prête à l'emploi**, règles posées et
 * joueurs invités.
 *
 * Quatre étapes : Identité (nom + notes) → Règles de table (mutualisées avec la
 * page de réglages via `CampaignRulesFields`) → Joueurs (saisie des NOMS en local)
 * → Récapitulatif. Rien n'est écrit au cloud avant le dernier clic (« Créer la
 * campagne ») : la campagne PUIS les joueurs sont alors créés en base — c'est à ce
 * moment que naissent les **liens magiques** (`join_secret` généré côté serveur).
 * Le récapitulatif se transforme alors en écran final qui affiche chaque lien
 * (copier / régénérer) avec une courte explication ; « Aller à la campagne » y mène.
 *
 * L'**édition** d'une campagne existante reste du ressort de la page de réglages
 * (roue crantée) — cet assistant ne sert qu'à la création. État local éphémère (pas
 * de brouillon persisté comme le wizard de personnage) : création courte, sans
 * reprise différée.
 */
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AddIcon from '@mui/icons-material/Add';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import Paper from '@mui/material/Paper';
import Snackbar from '@mui/material/Snackbar';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import Stepper from '@mui/material/Stepper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { AppAlert } from '@/components/AppAlert';
import { AppHeader } from '@/components/AppHeader';
import { AppTooltip } from '@/components/AppTooltip';
import { CampaignRulesFields } from '@/components/campaign/CampaignRulesFields';
import { HomeBackground } from '@/components/HomeBackground';
import { DEFAULT_CAMPAIGN_RULES, type Campaign, type CampaignRules } from '@/lib/campaign';
import { joinLinkUrl } from '@/lib/player/types';
import { useCampaignsStore } from '@/stores/campaigns';
import { usePlayersStore } from '@/stores/players';

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
  const load = useCampaignsStore((s) => s.load);
  const createCampaign = useCampaignsStore((s) => s.create);

  // Store joueurs : peuplé au moment de la création (une fois la campagne en base),
  // puis lu pour afficher les liens magiques générés dans le récapitulatif final.
  const loadPlayers = usePlayersStore((s) => s.load);
  const createPlayer = usePlayersStore((s) => s.create);
  const regeneratePlayer = usePlayersStore((s) => s.regenerate);
  const createdPlayers = usePlayersStore((s) => s.players);

  // Détermine l'état du service (configuré ? disponible ?) : la création écrit au
  // cloud, inutile de proposer l'assistant si Supabase n'est pas configuré.
  useEffect(() => {
    void load();
  }, [load]);

  // Origine lue à l'init (client) pour construire les URLs de liens magiques.
  const [origin] = useState(() => (typeof window !== 'undefined' ? window.location.origin : ''));

  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [rules, setRules] = useState<CampaignRules>(DEFAULT_CAMPAIGN_RULES);
  // Noms des joueurs saisis en local (les liens ne naissent qu'à la création).
  const [playerNames, setPlayerNames] = useState<string[]>([]);
  const [newPlayerName, setNewPlayerName] = useState('');

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Erreur non bloquante : campagne créée mais un/des joueur(s) en échec.
  const [playerError, setPlayerError] = useState<string | null>(null);
  // Campagne créée : bascule le récapitulatif en écran final (liens magiques).
  const [created, setCreated] = useState<Campaign | null>(null);
  const [busyPlayerId, setBusyPlayerId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const isLast = step === STEP_LABELS.length - 1;
  // Seule l'étape Identité est bloquante : un nom est requis pour créer.
  const nameValid = name.trim().length > 0;
  const canNext = step === 0 ? nameValid : true;

  const addPlayerName = () => {
    const n = newPlayerName.trim();
    if (!n) return;
    setPlayerNames((names) => [...names, n]);
    setNewPlayerName('');
  };

  const handleCreate = async () => {
    setBusy(true);
    setError(null);
    setPlayerError(null);
    // 1) La campagne (avec ses règles déjà posées).
    let campaign: Campaign;
    try {
      campaign = await createCampaign(name, description, rules);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
      return;
    }
    // 2) Les joueurs (génèrent leur lien magique en base). La campagne existe déjà :
    // un échec ici n'annule pas la création — on le signale et on laisse le MJ
    // finir depuis la campagne (pas de nouvelle tentative de création de campagne).
    try {
      await loadPlayers(campaign.id);
      for (const n of playerNames) {
        await createPlayer(n);
      }
    } catch (e) {
      setPlayerError(
        `Certains joueurs n'ont pas pu être créés (${e instanceof Error ? e.message : String(e)}). ` +
          'Tu pourras les ajouter depuis la campagne.',
      );
    }
    setCreated(campaign);
    setBusy(false);
  };

  const handleCopy = async (secret: string) => {
    try {
      await navigator.clipboard.writeText(joinLinkUrl(origin, secret));
      setToast('Lien copié.');
    } catch {
      setToast('Impossible de copier le lien.');
    }
  };

  const handleRegenerate = async (id: string) => {
    setBusyPlayerId(id);
    try {
      await regeneratePlayer(id);
      setToast("Lien régénéré. L'ancien lien ne fonctionne plus.");
    } catch {
      setToast('Échec de la régénération du lien.');
    } finally {
      setBusyPlayerId(null);
    }
  };

  const navButtons = (
    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
      <Button disabled={step === 0 || busy} onClick={() => setStep(step - 1)}>
        Précédent
      </Button>
      {isLast ? (
        <Button variant="contained" onClick={() => void handleCreate()} disabled={busy}>
          {busy ? 'Création…' : 'Créer la campagne'}
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
      <AppHeader title="Nouvelle campagne" onBack={() => router.push('/campaigns')} />

      <Container maxWidth="md" sx={{ py: 4 }}>
        {status === 'unconfigured' ? (
          <Paper variant="outlined" sx={{ ...glassPaper, p: 6, textAlign: 'center' }}>
            <Typography variant="h6" sx={{ mb: 1 }}>
              Campagnes indisponibles
            </Typography>
            <Typography color="text.secondary">
              Les campagnes sont hébergées en ligne. Le service n’est pas configuré sur cette
              installation ; l’édition de personnages reste disponible en local.
            </Typography>
          </Paper>
        ) : (
          <>
            <Stepper activeStep={step} alternativeLabel sx={{ mb: 4 }}>
              {STEP_LABELS.map((label) => (
                <Step key={label} completed={created !== null && label !== 'Récapitulatif'}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>

            {/* Barre de nav en haut, masquée une fois la campagne créée (écran final). */}
            {!created && <Box sx={{ mb: 3 }}>{navButtons}</Box>}

            <Paper variant="outlined" sx={glassPaper}>
              {step === 0 && (
                <Stack spacing={2}>
                  <Typography variant="h6">Identité de la campagne</Typography>
                  <TextField
                    autoFocus
                    label="Nom de la campagne"
                    fullWidth
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey && nameValid) setStep(1);
                    }}
                  />
                  <TextField
                    label="Notes du MJ (optionnel)"
                    fullWidth
                    multiline
                    minRows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
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
                  <CampaignRulesFields rules={rules} onChange={setRules} />
                </Stack>
              )}

              {step === 2 && (
                <Stack spacing={2}>
                  <Typography variant="h6">Joueurs</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Ajoute les joueurs de ta table. Leurs liens d’invitation seront générés à la
                    création de la campagne (dernière étape) ; tu pourras ensuite les copier et
                    les partager. Étape facultative — tu peux aussi ajouter des joueurs plus tard
                    depuis les réglages.
                  </Typography>
                  <Stack direction="row" spacing={1}>
                    <TextField
                      size="small"
                      fullWidth
                      label="Nom du joueur"
                      value={newPlayerName}
                      onChange={(e) => setNewPlayerName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') addPlayerName();
                      }}
                    />
                    <Button
                      variant="contained"
                      startIcon={<AddIcon />}
                      onClick={addPlayerName}
                      disabled={newPlayerName.trim() === ''}
                    >
                      Ajouter
                    </Button>
                  </Stack>
                  {playerNames.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                      Aucun joueur pour l’instant.
                    </Typography>
                  ) : (
                    <Stack spacing={1}>
                      {playerNames.map((n, i) => (
                        <Stack
                          key={`${n}-${i}`}
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
                            {n}
                          </Typography>
                          <AppTooltip title="Retirer">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() =>
                                setPlayerNames((names) => names.filter((_, j) => j !== i))
                              }
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

              {step === 3 && !created && (
                <Stack spacing={2}>
                  <Typography variant="h6">Récapitulatif</Typography>
                  <Box>
                    <Typography variant="overline" color="text.secondary">
                      Nom
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>
                      {name.trim() || 'Nouvelle campagne'}
                    </Typography>
                  </Box>
                  {description.trim() && (
                    <Box>
                      <Typography variant="overline" color="text.secondary">
                        Notes du MJ
                      </Typography>
                      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                        {description.trim()}
                      </Typography>
                    </Box>
                  )}
                  <Box>
                    <Typography variant="overline" color="text.secondary">
                      Règles de table
                    </Typography>
                    <Typography variant="body2">
                      Armes à feu {rules.firearmsAllowed ? 'autorisées' : 'interdites'}.
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="overline" color="text.secondary">
                      Joueurs
                    </Typography>
                    {playerNames.length === 0 ? (
                      <Typography variant="body2" color="text.secondary">
                        Aucun joueur — tu pourras en ajouter depuis les réglages.
                      </Typography>
                    ) : (
                      <Typography variant="body2">{playerNames.join(', ')}</Typography>
                    )}
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    À la création, chaque joueur reçoit un lien magique d’invitation ; ils
                    s’afficheront ici juste après.
                  </Typography>
                </Stack>
              )}

              {/* Écran final : campagne créée, liens magiques générés. */}
              {created && (
                <Stack spacing={2}>
                  <Typography variant="h6">Campagne créée</Typography>
                  <Typography variant="body2" color="text.secondary">
                    « {created.name} » est prête. Chaque joueur reçoit un lien magique unique : en
                    l’ouvrant, il rejoint la campagne sans créer de compte et pourra éditer sa
                    fiche. Garde ces liens privés — tu peux en régénérer un s’il fuite (l’ancien
                    cesse alors de fonctionner).
                  </Typography>
                  {playerError && <AppAlert severity="warning">{playerError}</AppAlert>}
                  {createdPlayers.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                      Aucun joueur pour l’instant. Tu pourras en ajouter depuis les réglages de la
                      campagne.
                    </Typography>
                  ) : (
                    <Stack spacing={1}>
                      {createdPlayers.map((player) => (
                        <Stack
                          key={player.id}
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
                                    <AppTooltip title="Régénérer (coupe l'ancien lien)">
                                      <IconButton
                                        size="small"
                                        edge="end"
                                        disabled={busyPlayerId === player.id}
                                        onClick={() => void handleRegenerate(player.id)}
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
                  )}
                </Stack>
              )}
            </Paper>

            {/* Étape Identité incomplète : rappel de l'action attendue. */}
            {!isLast && !canNext && (
              <AppAlert severity="info" sx={{ mb: 2 }}>
                Donne un nom à ta campagne pour continuer.
              </AppAlert>
            )}

            {error && (
              <AppAlert severity="error" sx={{ mb: 2 }}>
                Création impossible : {error}
              </AppAlert>
            )}

            {created ? (
              <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button variant="contained" onClick={() => router.push(`/campaign/${created.id}`)}>
                  Aller à la campagne
                </Button>
              </Box>
            ) : (
              navButtons
            )}
          </>
        )}
      </Container>

      <Snackbar
        open={toast !== null}
        autoHideDuration={4000}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {toast ? (
          <AppAlert severity="success" variant="filled" onClose={() => setToast(null)} sx={{ width: '100%' }}>
            {toast}
          </AppAlert>
        ) : undefined}
      </Snackbar>
    </>
  );
}
