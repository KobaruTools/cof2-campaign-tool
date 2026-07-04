'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import Alert from '@mui/material/Alert';
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
import { ancestryById, classById, priestGods } from '@/data';
import { choicesComplete } from '@/lib/character/ancestry';
import { featuresWithUnmadeChoices } from '@/lib/character/choices';
import {
  divineHostComplete,
  materializeDraft,
  pathsStepComplete,
  priestVocationComplete,
  type WizardDraft,
} from '@/lib/character/wizard';
import { useCharactersStore } from '@/stores/characters';
import { useWizardStore } from '@/stores/wizard';
import { ClassStep, PathsStep, IdentityStep } from '@/components/wizard/steps';
import { AncestryStep } from '@/components/wizard/AncestryStep';
import { AbilitiesStep } from '@/components/wizard/AbilitiesStep';
import { EquipmentStep } from '@/components/wizard/EquipmentStep';
import { SummaryStep } from '@/components/wizard/SummaryStep';
import type { StepProps } from '@/components/wizard/types';
import { HomeBackground } from '@/components/home/HomeBackground';

interface StepDef {
  label: string;
  Component: (props: StepProps) => React.ReactNode;
  valid: (d: WizardDraft) => boolean;
  /** Résumé des choix faits, affiché en petit sous le libellé de l'étape. */
  summary?: (d: WizardDraft) => string | null;
  /**
   * Ce qu'il reste à faire pour pouvoir passer à l'étape suivante (affiché au-dessus
   * des boutons quand l'étape n'est pas encore valide). `null` = rien à signaler.
   */
  hint?: (d: WizardDraft) => string | null;
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
    hint: (d) =>
      !ancestryById.has(d.ancestryId)
        ? 'Choisis un peuple pour continuer.'
        : d.ancestryPathId === null
          ? 'Choisis la voie de peuple pour continuer.'
          : null,
  },
  {
    label: 'Profil',
    Component: ClassStep,
    // Prêtre : la vocation généraliste/spécialiste (+ dieu) doit être résolue (p. 122).
    valid: (d) => classById.has(d.classId) && priestVocationComplete(d),
    summary: (d) => {
      const className = classById.get(d.classId)?.name;
      if (!className) return null;
      const v = d.priestVocation;
      if (!v) return className;
      const suffix =
        v.mode === 'generalist'
          ? 'généraliste'
          : `spécialiste${v.godId ? ` — ${priestGods.find((g) => g.id === v.godId)?.name ?? ''}` : ''}`;
      return `${className} (${suffix})`;
    },
    hint: (d) => {
      if (!classById.has(d.classId)) return 'Choisis un profil pour continuer.';
      if (!priestVocationComplete(d)) {
        return d.priestVocation
          ? 'Choisis un dieu pour continuer.'
          : 'Choisis la vocation du prêtre (généraliste ou spécialiste) pour continuer.';
      }
      return null;
    },
  },
  {
    label: 'Caractéristiques',
    Component: AbilitiesStep,
    valid: (d) => {
      const p = ancestryById.get(d.ancestryId);
      return !!p && choicesComplete(p, d.ancestryChoices);
    },
    hint: (d) => {
      const p = ancestryById.get(d.ancestryId);
      return p && !choicesComplete(p, d.ancestryChoices)
        ? 'Attribue les modificateurs de caractéristiques « au choix » de ton peuple pour continuer.'
        : null;
    },
  },
  {
    label: 'Voies & capacités',
    Component: PathsStep,
    // Voies choisies + tous les choix portés par les capacités de rang 1
    // résolus (wizard bloquant — les choix sont proposés dans cette étape).
    valid: (d) => {
      if (!pathsStepComplete(d) || !divineHostComplete(d)) return false;
      const a = ancestryById.get(d.ancestryId);
      return !!a && featuresWithUnmadeChoices(materializeDraft(d, a, d.createdAt)).length === 0;
    },
    hint: (d) => {
      if (!pathsStepComplete(d)) {
        const characterClass = classById.get(d.classId);
        if (characterClass?.familyId === 'mages' && d.chosenPaths.length === 2 && d.mageBonus === null)
          return 'Désigne la capacité de rang 2 supplémentaire (mage) pour continuer.';
        return 'Choisis deux voies pour continuer.';
      }
      if (!divineHostComplete(d))
        return 'Choisis la voie dont le rang 1 est remplacé par la capacité divine pour continuer.';
      const a = ancestryById.get(d.ancestryId);
      if (a && featuresWithUnmadeChoices(materializeDraft(d, a, d.createdAt)).length > 0)
        return 'Résous tous les choix des capacités de rang 1 pour continuer.';
      return null;
    },
  },
  { label: 'Équipement', Component: EquipmentStep, valid: () => true },
  {
    label: 'Identité',
    Component: IdentityStep,
    valid: (d) => d.name.trim().length > 0,
    hint: (d) => (d.name.trim().length === 0 ? 'Donne un nom à ton personnage pour continuer.' : null),
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
      {/* Même illustration de fond que l'accueil : la couverture scindée en deux
          moitiés encadrant le contenu (fixe, parallaxe + léger suivi de la souris). */}
      <HomeBackground />
      <AppBar
        position="static"
        // Translucide + flou, comme l'accueil : laisse deviner l'illustration de fond
        // sans nuire à la lisibilité du titre.
        sx={{
          bgcolor: 'rgba(18, 18, 18, 0.55)',
          backgroundImage: 'none',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          boxShadow: 'none',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        }}
      >
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

        <Paper
          variant="outlined"
          // Translucide + léger flou, comme les cartes de l'accueil : laisse
          // transparaître l'illustration de fond sans nuire à la lisibilité de l'étape.
          sx={{
            p: { xs: 2, sm: 3 },
            mb: 3,
            bgcolor: 'rgba(30, 30, 34, 0.62)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            borderColor: 'rgba(255, 255, 255, 0.10)',
          }}
        >
          <StepComponent draft={draft} patch={patch} />
        </Paper>

        {/* Feedback : ce qu'il reste à faire avant de pouvoir passer à la suite. */}
        {!isLast && !canNext && (
          <Alert severity="info" sx={{ mb: 2 }}>
            {current.hint?.(draft) ?? 'Complète les choix obligatoires de cette étape pour continuer.'}
          </Alert>
        )}

        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Button disabled={step === 0} onClick={() => setStep(step - 1)}>
            Précédent
          </Button>
          {isLast ? (
            <Button variant="contained" onClick={finish} disabled={!canCreate}>
              Créer le personnage
            </Button>
          ) : (
            <Button variant="contained" disabled={!canNext} onClick={() => setStep(step + 1)}>
              Suivant
            </Button>
          )}
        </Box>
      </Container>
    </>
  );
}
