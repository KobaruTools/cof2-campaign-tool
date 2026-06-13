'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Container from '@mui/material/Container';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import Stepper from '@mui/material/Stepper';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import { peupleParId, profilParId } from '@/data';
import { choixComplets } from '@/lib/character/peuple';
import { materializeDraft, type WizardDraft } from '@/lib/character/wizard';
import { useCharactersStore } from '@/stores/characters';
import { useWizardStore } from '@/stores/wizard';
import {
  CaracsStep,
  EquipementStep,
  IdentiteStep,
  PeupleStep,
  ProfilStep,
  RecapStep,
  VoiesStep,
  type StepProps,
} from '@/components/wizard/steps';

interface StepDef {
  label: string;
  Component: (props: StepProps) => React.ReactNode;
  valid: (d: WizardDraft) => boolean;
}

const STEPS: StepDef[] = [
  {
    label: 'Peuple',
    Component: PeupleStep,
    valid: (d) => {
      const p = peupleParId.get(d.peupleId);
      return !!p && d.voieDePeupleId !== null;
    },
  },
  {
    label: 'Profil',
    Component: ProfilStep,
    valid: (d) => profilParId.has(d.profilId),
  },
  {
    label: 'Caractéristiques',
    Component: CaracsStep,
    valid: (d) => {
      const p = peupleParId.get(d.peupleId);
      return !!p && choixComplets(p, d.peupleChoix);
    },
  },
  {
    label: 'Voies & capacités',
    Component: VoiesStep,
    valid: (d) => {
      if (d.voiesChoisies.length !== 2) return false;
      const profil = profilParId.get(d.profilId);
      if (profil?.familleId === 'mages') return d.mageBonus !== null;
      return true;
    },
  },
  { label: 'Équipement', Component: EquipementStep, valid: () => true },
  {
    label: 'Identité',
    Component: IdentiteStep,
    valid: (d) => d.name.trim().length > 0,
  },
  { label: 'Récapitulatif', Component: RecapStep, valid: () => true },
];

export default function CreerPage() {
  const router = useRouter();
  const hasHydrated = useWizardStore((s) => s.hasHydrated);
  const draft = useWizardStore((s) => s.draft);
  const start = useWizardStore((s) => s.start);
  const patch = useWizardStore((s) => s.patch);
  const setStep = useWizardStore((s) => s.setStep);
  const clear = useWizardStore((s) => s.clear);
  const upsert = useCharactersStore((s) => s.upsert);

  // Démarre un brouillon si aucun n'est en cours (après hydratation).
  useEffect(() => {
    if (hasHydrated && !draft) start();
  }, [hasHydrated, draft, start]);

  if (!hasHydrated || !draft) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  const step = Math.min(draft.step, STEPS.length - 1);
  const current = STEPS[step];
  const StepComponent = current.Component;
  const isLast = step === STEPS.length - 1;
  const canNext = current.valid(draft);

  const finish = () => {
    const peuple = peupleParId.get(draft.peupleId);
    if (!peuple) return;
    const character = materializeDraft(draft, peuple, new Date().toISOString());
    upsert(character);
    clear();
    router.push(`/personnage/${character.id}`);
  };

  return (
    <>
      <AppBar position="static">
        <Toolbar>
          <IconButton edge="start" color="inherit" onClick={() => router.push('/')} sx={{ mr: 1 }}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" component="h1" sx={{ flexGrow: 1 }}>
            Nouveau personnage
          </Typography>
        </Toolbar>
      </AppBar>

      <Container maxWidth="md" sx={{ py: 4 }}>
        <Stepper activeStep={step} alternativeLabel sx={{ mb: 4 }}>
          {STEPS.map((s) => (
            <Step key={s.label}>
              <StepLabel>{s.label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, mb: 3 }}>
          <StepComponent draft={draft} patch={patch} />
        </Paper>

        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Button disabled={step === 0} onClick={() => setStep(step - 1)}>
            Précédent
          </Button>
          {isLast ? (
            <Button variant="contained" onClick={finish}>
              Créer le personnage
            </Button>
          ) : (
            <Button
              variant="contained"
              disabled={!canNext}
              onClick={() => setStep(step + 1)}
            >
              Suivant
            </Button>
          )}
        </Box>
      </Container>
    </>
  );
}
