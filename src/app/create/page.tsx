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
import { featuresWithUnmadeChoices } from '@/lib/character/choices';
import { materializeDraft, pathsStepComplete, type WizardDraft } from '@/lib/character/wizard';
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
  /** Résumé des choix faits, affiché en petit sous le libellé de l'étape. */
  summary?: (d: WizardDraft) => string | null;
}

const STEPS: StepDef[] = [
  {
    label: 'Peuple',
    Component: AncestryStep,
    valid: (d) => {
      const p = ancestryById.get(d.ancestryId);
      return !!p && d.ancestryPathId !== null;
    },
    summary: (d) => ancestryById.get(d.ancestryId)?.name ?? null,
  },
  {
    label: 'Profil',
    Component: ClassStep,
    valid: (d) => classById.has(d.classId),
    summary: (d) => classById.get(d.classId)?.name ?? null,
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
    // Voies choisies + tous les choix portés par les capacités de rang 1
    // résolus (wizard bloquant — les choix sont proposés dans cette étape).
    valid: (d) => {
      if (!pathsStepComplete(d)) return false;
      const a = ancestryById.get(d.ancestryId);
      return !!a && featuresWithUnmadeChoices(materializeDraft(d, a, d.createdAt)).length === 0;
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

  // Choix de niveau 1 portés par les capacités (PER-66/68) : la création reste
  // bloquée tant qu'ils ne sont pas tous résolus (doctrine wizard, bloquant).
  const summaryAncestry = ancestryById.get(draft.ancestryId);
  const previewForChoices = summaryAncestry
    ? materializeDraft(draft, summaryAncestry, draft.createdAt)
    : null;
  const pendingChoices = previewForChoices ? featuresWithUnmadeChoices(previewForChoices) : [];
  const canCreate = pendingChoices.length === 0;

  const finish = () => {
    const ancestry = ancestryById.get(draft.ancestryId);
    if (!ancestry) return;
    const character = materializeDraft(draft, ancestry, new Date().toISOString());
    upsert(character);
    clear();
    // `created=1` : la fiche affiche une confirmation de création puis nettoie
    // l'URL (voir la page de fiche). Donne un retour clair en fin de wizard.
    router.push(`/character/${character.id}?created=1`);
  };

  return (
    <>
      <title>Création de personnage — Éditeur de personnage CO2</title>
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
          {STEPS.map((s) => {
            const choice = s.summary?.(draft) ?? null;
            return (
              <Step key={s.label}>
                <StepLabel
                  optional={
                    choice ? (
                      <Typography variant="caption" color="text.secondary">
                        ({choice})
                      </Typography>
                    ) : undefined
                  }
                >
                  {s.label}
                </StepLabel>
              </Step>
            );
          })}
        </Stepper>

        <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, mb: 3 }}>
          <StepComponent draft={draft} patch={patch} />
        </Paper>

        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Button disabled={step === 0} onClick={() => setStep(step - 1)}>
            Précédent
          </Button>
          {isLast ? (
            <Button variant="contained" onClick={finish} disabled={!canCreate}>
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
