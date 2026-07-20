'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Container from '@mui/material/Container';
import Paper from '@mui/material/Paper';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import Stepper from '@mui/material/Stepper';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import type { Theme } from '@mui/material/styles';
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
import { useCampaignsStore } from '@/stores/campaigns';
import { useWizardStore } from '@/stores/wizard';
import { firearmsEffective } from '@/lib/character/firearms';
import { AppAlert } from '@/components/AppAlert';
import { AppHeader } from '@/components/AppHeader';
import { ClassStep, PathsStep, IdentityStep } from '@/components/wizard/steps';
import { AncestryStep } from '@/components/wizard/AncestryStep';
import { AbilitiesStep } from '@/components/wizard/AbilitiesStep';
import { EquipmentStep } from '@/components/wizard/EquipmentStep';
import { SummaryStep } from '@/components/wizard/SummaryStep';
import type { StepProps } from '@/components/wizard/types';
import { HomeBackground } from '@/components/HomeBackground';
import { FirearmsAllowedProvider } from '@/components/ClassIcon';

interface StepDef {
  label: string;
  Component: (props: StepProps) => React.ReactNode;
  // `firearmsAllowed` = autorisation EFFECTIVE des armes à feu (règle campagne ∧
  // choix du brouillon, PER-185) : la validation des voies doit correspondre à ce
  // que l'étape affiche (arbalétrier en campagne « poudre interdite »).
  valid: (d: WizardDraft, firearmsAllowed: boolean) => boolean;
  /** Résumé des choix faits, affiché en petit sous le libellé de l'étape. */
  summary?: (d: WizardDraft) => string | null;
  /**
   * Ce qu'il reste à faire pour pouvoir passer à l'étape suivante (affiché au-dessus
   * des boutons quand l'étape n'est pas encore valide). `null` = rien à signaler.
   */
  hint?: (d: WizardDraft, firearmsAllowed: boolean) => string | null;
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
    valid: (d, firearmsAllowed) => {
      if (!pathsStepComplete(d, firearmsAllowed) || !divineHostComplete(d)) return false;
      const a = ancestryById.get(d.ancestryId);
      return !!a && featuresWithUnmadeChoices(materializeDraft(d, a, d.createdAt)).length === 0;
    },
    hint: (d, firearmsAllowed) => {
      if (!pathsStepComplete(d, firearmsAllowed)) {
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
  const commitNewCharacter = useCharactersStore((s) => s.commitNewCharacter);
  const campaigns = useCampaignsStore((s) => s.campaigns);
  const loadCampaigns = useCampaignsStore((s) => s.load);
  // Commit de fin de wizard : écriture cloud en cours / échec (le brouillon est
  // conservé tant que le commit n'a pas abouti — jamais d'inachevé en base).
  const [committing, setCommitting] = useState(false);
  const [commitError, setCommitError] = useState<string | null>(null);
  // Redirection vers la fiche après création réussie : le brouillon vient d'être
  // vidé (clear) mais la navigation n'est pas encore effective. Sans ce verrou,
  // l'effet de démarrage ci-dessous recréerait aussitôt un brouillon vierge et
  // ferait clignoter l'étape « Peuple » le temps que `router.push` aboutisse.
  const [redirecting, setRedirecting] = useState(false);
  // Indicateur d'étapes compact sur mobile (PER-231) : le Stepper « alternativeLabel »
  // horizontal écrase ses libellés sur 320-360px. Sous « sm », on le remplace par des
  // pastilles numérotées (sans libellé) + une ligne « Étape X / Y — <nom> ». Hook placé
  // en tête (avant les retours anticipés d'hydratation) pour respecter les règles de hooks.
  const compactStepper = useMediaQuery((theme: Theme) => theme.breakpoints.down('sm'));

  // Démarre un brouillon si aucun n'est en cours (après hydratation). La campagne
  // de rattachement est optionnelle (PER-180) : passée en query `?campaign=cid`
  // quand la création est lancée depuis une vue campagne, sinon « Non attribué ».
  // Lecture directe de l'URL (pas de useSearchParams) pour éviter une frontière
  // Suspense au prerendu. Un brouillon déjà en cours est repris tel quel.
  useEffect(() => {
    if (!hasHydrated || draft || redirecting) return;
    const params = new URLSearchParams(window.location.search);
    const campaign = params.get('campaign');
    // Joueur pré-attribué (PER-184, raccourci de recréation depuis un perso mort) :
    // n'a de sens que dans une campagne, donc ignoré si `campaign` est absent.
    const player = campaign ? params.get('player') : null;
    start(campaign, player);
  }, [hasHydrated, draft, start, redirecting]);

  // La règle « armes à feu » de la campagne (PER-185) gate le toggle du wizard et
  // l'autorisation effective : il faut donc que la liste des campagnes soit chargée.
  useEffect(() => {
    loadCampaigns();
  }, [loadCampaigns]);

  // Pendant la redirection post-création, le brouillon est déjà vidé : on affiche
  // un écran d'attente plutôt que l'étape « Peuple » recréée à la volée.
  if (redirecting) {
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
        <Typography color="text.secondary">Création du personnage…</Typography>
      </Box>
    );
  }

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

  // Campagne de rattachement du brouillon (PER-180/185). La règle « armes à feu »
  // de la campagne détermine la disponibilité de l'option au wizard ; « Non
  // attribué » (ou liste pas encore chargée) → fallback historique `true`.
  const draftCampaign = draft.campaignId ? campaigns.find((c) => c.id === draft.campaignId) : undefined;
  const campaignAllowsFirearms = draftCampaign ? draftCampaign.rules.firearmsAllowed : true;
  // Autorisation EFFECTIVE des armes à feu du brouillon : pilote les icônes de
  // profil (Arquebusier ↔ Arbalétrier) via le provider ET la validation des voies
  // (l'arbalétrier doit pouvoir valider la voie du maître des arbalètes, PER-185).
  const firearmsAllowed = firearmsEffective(
    { firearmsAllowed: draft.firearmsAllowed ?? true },
    draftCampaign,
  );

  const canNext = current.valid(draft, firearmsAllowed);

  // Choix de niveau 1 portés par les capacités (PER-66/68) : la création reste
  // bloquée tant qu'ils ne sont pas tous résolus (doctrine wizard, bloquant).
  const summaryAncestry = ancestryById.get(draft.ancestryId);
  const previewForChoices = summaryAncestry
    ? materializeDraft(draft, summaryAncestry, draft.createdAt)
    : null;
  const pendingChoices = previewForChoices ? featuresWithUnmadeChoices(previewForChoices) : [];
  const canCreate = pendingChoices.length === 0;

  // Barre de navigation Précédent/Suivant, dupliquée en haut (sous le Stepper) et
  // en bas de l'étape pour éviter d'avoir à faire défiler sur les longues étapes.
  const navButtons = (
    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
      <Button disabled={step === 0} onClick={() => setStep(step - 1)}>
        Précédent
      </Button>
      {isLast ? (
        <Button variant="contained" onClick={() => void finish()} disabled={!canCreate || committing}>
          {committing ? 'Enregistrement…' : 'Créer le personnage'}
        </Button>
      ) : (
        <Button variant="contained" disabled={!canNext} onClick={() => setStep(step + 1)}>
          Suivant
        </Button>
      )}
    </Box>
  );

  const finish = async () => {
    const ancestry = ancestryById.get(draft.ancestryId);
    if (!ancestry) return;
    const materialized = materializeDraft(draft, ancestry, new Date().toISOString());
    // PER-185 : le snapshot `firearmsAllowed` stocké = choix EFFECTIF à la création.
    // Si la campagne interdit la poudre, le personnage naît « Arbalétrier » (false),
    // même s'il est réattribué plus tard. Sans campagne, on garde le choix du joueur.
    const character = {
      ...materialized,
      firearmsAllowed: firearmsEffective(materialized, draftCampaign),
    };
    // Commit en fin de wizard (PER-192) : le personnage naît directement en cloud
    // (`campaign_id` porté par le brouillon, `player_id` vide). En cas d'échec, on
    // conserve le brouillon pour permettre une nouvelle tentative.
    setCommitting(true);
    setCommitError(null);
    try {
      await commitNewCharacter(character);
    } catch (e) {
      setCommitError(e instanceof Error ? e.message : String(e));
      setCommitting(false);
      return;
    }
    // Verrouille l'affichage sur l'écran d'attente AVANT de vider le brouillon :
    // empêche l'effet de démarrage de recréer une étape « Peuple » transitoire.
    setRedirecting(true);
    clear();
    // `created=1` : la fiche affiche une confirmation de création puis nettoie
    // l'URL (voir la page de fiche). La fiche est indépendante de la campagne
    // (PER-180) ; la FK campagne du personnage est portée par le brouillon.
    router.push(`/character/${character.id}?created=1`);
  };

  return (
    // Les icônes de profil du wizard (sélection, hybridation, récap) suivent le
    // réglage « armes à feu » du brouillon : dès qu'il est décoché, l'arquebusier
    // s'affiche en « Arbalétrier » (arbalète) partout — cf. FirearmsAllowedProvider.
    <FirearmsAllowedProvider value={firearmsAllowed}>
      <title>Création de personnage — Éditeur de personnage CO2</title>
      {/* Même illustration de fond que l'accueil : la couverture scindée en deux
          moitiés encadrant le contenu (fixe, parallaxe + léger suivi de la souris). */}
      <HomeBackground />
      <AppHeader
        title="Nouveau personnage"
        backHref={draft.campaignId ? `/campaign/${draft.campaignId}` : '/'}
      />

      <Container maxWidth="md" sx={{ py: 4 }}>
        {compactStepper ? (
          <Box sx={{ mb: 3 }}>
            {/* Pastilles numérotées seules (sans libellé) : tiennent sur écran étroit. */}
            <Stepper activeStep={step}>
              {STEPS.map((s) => (
                <Step key={s.label}>
                  <StepLabel />
                </Step>
              ))}
            </Stepper>
            <Typography variant="subtitle2" align="center" sx={{ mt: 1.5 }}>
              Étape {step + 1} / {STEPS.length} — {current.label}
            </Typography>
            {current.summary?.(draft) && (
              <Typography variant="caption" color="text.secondary" align="center" sx={{ display: 'block' }}>
                ({current.summary(draft)})
              </Typography>
            )}
          </Box>
        ) : (
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
        )}

        <Box sx={{ mb: 3 }}>{navButtons}</Box>

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
          <StepComponent draft={draft} patch={patch} campaignAllowsFirearms={campaignAllowsFirearms} />
        </Paper>

        {/* Feedback : ce qu'il reste à faire avant de pouvoir passer à la suite. */}
        {!isLast && !canNext && (
          <AppAlert severity="info" sx={{ mb: 2 }}>
            {current.hint?.(draft, firearmsAllowed) ??
              'Complète les choix obligatoires de cette étape pour continuer.'}
          </AppAlert>
        )}

        {/* Échec du commit cloud : le brouillon est conservé, on peut réessayer. */}
        {commitError && (
          <AppAlert severity="error" sx={{ mb: 2 }}>
            Enregistrement impossible : {commitError}
          </AppAlert>
        )}

        {navButtons}
      </Container>
    </FirearmsAllowedProvider>
  );
}
