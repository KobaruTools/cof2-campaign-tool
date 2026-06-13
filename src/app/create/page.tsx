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
import { ancestryById, classById } from '@/data';
import { choicesComplete } from '@/lib/character/ancestry';
import { materializeDraft, type WizardDraft } from '@/lib/character/wizard';
import { useCharactersStore } from '@/stores/characters';
import { useWizardStore } from '@/stores/wizard';
import {
  AbilitiesStep,
  EquipmentStep,
  IdentityStep,
  AncestryStep,
  ClassStep,
  SummaryStep,
  PathsStep,
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
    Component: AncestryStep,
    valid: (d) => {
      const p = ancestryById.get(d.ancestryId);
      return !!p && d.ancestryPathId !== null;
    },
  },
  {
    label: 'Profil',
    Component: ClassStep,
    valid: (d) => classById.has(d.classId),
  },
  {
    label: 'Caractéristiques',
    Component: AbilitiesStep,
    valid: (d) => {
      const p = ancestryById.get(d.ancestryId);
      return !!p && choicesComplete(p, d.ancestryChoices);
    },
  },
  {
    label: 'Voies & capacités',
    Component: PathsStep,
    valid: (d) => {
      if (d.chosenPaths.length !== 2) return false;
      const characterClass = classById.get(d.classId);
      if (characterClass?.familyId === 'mages') return d.mageBonus !== null;
      return true;
    },
  },
  { label: 'Équipement', Component: EquipmentStep, valid: () => true },
  {
    label: 'Identité',
    Component: IdentityStep,
    valid: (d) => d.name.trim().length > 0,
  },
  { label: 'Récapitulatif', Component: SummaryStep, valid: () => true },
];

export default function CreatePage() {
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
    const ancestry = ancestryById.get(draft.ancestryId);
    if (!ancestry) return;
    const character = materializeDraft(draft, ancestry, new Date().toISOString());
    upsert(character);
    clear();
    router.push(`/character/${character.id}`);
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
