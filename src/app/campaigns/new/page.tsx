'use client';

/**
 * Assistant de création de campagne (PER-198) — remplace l'ancien dialogue « nom +
 * notes » puis redirection vers les réglages. Calqué sur le wizard de personnage
 * (`src/app/create/page.tsx`) : même langage visuel (Stepper, carte en verre
 * dépoli, boutons Précédent/Suivant, récapitulatif final), pour offrir au MJ une
 * création guidée qui aboutit à une campagne **prête à l'emploi**, règles déjà
 * posées.
 *
 * Trois étapes : Identité (nom + notes) → Règles de table (mutualisées avec la page
 * de réglages via `CampaignRulesFields`) → Récapitulatif. La campagne n'est écrite
 * au cloud qu'au dernier clic (« Créer la campagne ») ; on atterrit ensuite sur sa
 * vue. L'**édition** d'une campagne existante reste du ressort de la page de
 * réglages (roue crantée) — cet assistant ne sert qu'à la création.
 *
 * État local éphémère (pas de brouillon persisté comme le wizard de personnage) :
 * la création de campagne est courte et sans reprise différée.
 */
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Paper from '@mui/material/Paper';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import Stepper from '@mui/material/Stepper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { AppAlert } from '@/components/AppAlert';
import { AppHeader } from '@/components/AppHeader';
import { CampaignRulesFields } from '@/components/campaign/CampaignRulesFields';
import { HomeBackground } from '@/components/HomeBackground';
import { DEFAULT_CAMPAIGN_RULES, type CampaignRules } from '@/lib/campaign';
import { useCampaignsStore } from '@/stores/campaigns';

const STEP_LABELS = ['Identité', 'Règles de table', 'Récapitulatif'] as const;

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
  const create = useCampaignsStore((s) => s.create);

  // Détermine l'état du service (configuré ? disponible ?) : la création écrit au
  // cloud, inutile de proposer l'assistant si Supabase n'est pas configuré.
  useEffect(() => {
    void load();
  }, [load]);

  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [rules, setRules] = useState<CampaignRules>(DEFAULT_CAMPAIGN_RULES);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isLast = step === STEP_LABELS.length - 1;
  // Seule l'étape Identité est bloquante : un nom est requis pour créer.
  const nameValid = name.trim().length > 0;
  const canNext = step === 0 ? nameValid : true;

  const handleCreate = async () => {
    setBusy(true);
    setError(null);
    try {
      const campaign = await create(name, description, rules);
      // Campagne prête à l'emploi (règles déjà posées) : on atterrit sur sa vue,
      // pas sur les réglages (l'ancienne redirection est supprimée).
      router.push(`/campaign/${campaign.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
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

            {navButtons}
          </>
        )}
      </Container>
    </>
  );
}
