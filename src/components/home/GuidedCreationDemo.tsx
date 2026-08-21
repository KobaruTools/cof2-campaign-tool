'use client';

/**
 * Démo « Création guidée » de la vitrine : la frise des sept étapes de l'assistant, et pour
 * chacune une capture de son panneau.
 *
 * RÉGIME PARTICULIER — mi-capture, mi-composant. La frise est du VRAI DOM (libellés issus
 * du wizard, nets, cliquables) ; seul le panneau est une image. C'est délibéré : à 273 px,
 * une frise photographiée serait illisible, et un panneau reconstruit en maquette serait un
 * mensonge de plus à maintenir. Les images sont produites par
 * `scripts/home-shots-wizard.ts` — donc jamais périmées en silence.
 *
 * Elle remplace une capture UNIQUE qui montrait l'assistant au repos (huit boutons radio
 * vides, un bouton « Précédent » grisé, la frise coupée en plein mot). Le défaut n'était pas
 * d'être une image : c'était de photographier un formulaire auquel personne n'avait touché.
 *
 * L'AVANCE EST AUTOMATIQUE, parce qu'une carte de page d'accueil doit se montrer sans qu'on
 * la sollicite. Trois garde-fous : elle s'arrête au survol et au focus clavier (on ne lit pas
 * une chose qui bouge), elle ne démarre pas du tout si le visiteur a demandé moins
 * d'animations, et les pastilles restent cliquables — auquel cas le défilement s'arrête pour
 * de bon, la main a été prise.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import { alpha } from '@mui/material/styles';
import { AppTooltip } from '@/components/AppTooltip';

/**
 * Les sept étapes : le libellé affiché dans l'assistant, et la capture de son panneau.
 * L'ordre est celui de `STEPS` dans `src/app/create/page.tsx` ; les fichiers sont produits
 * par `WIZARD_FRAMES` dans `scripts/home-shots-wizard.ts`, dont les slugs correspondent.
 */
const STEPS = [
  { label: 'Peuple', src: '/home/wizard-1-peuple.webp', alt: 'Le choix du peuple, « Nain » sélectionné.' },
  { label: 'Profil', src: '/home/wizard-2-profil.webp', alt: 'Le choix du profil, « Barbare » sélectionné.' },
  {
    label: 'Caractéristiques',
    src: '/home/wizard-3-caracs.webp',
    alt: 'Les caractéristiques, avec les modificateurs du peuple nain appliqués en marge.',
  },
  {
    label: 'Voies & capacités',
    src: '/home/wizard-4-voies.webp',
    alt: 'Les voies du barbare, « Voie de la brute » retenue.',
  },
  {
    label: 'Équipement',
    src: '/home/wizard-5-equipement.webp',
    alt: 'L’équipement de départ, javelot en main principale.',
  },
  { label: 'Identité', src: '/home/wizard-6-identite.webp', alt: 'L’identité du personnage : genre, âge, taille, poids.' },
  {
    label: 'Récapitulatif',
    src: '/home/wizard-7-recapitulatif.webp',
    alt: 'Le récapitulatif : caractéristiques, statistiques dérivées et capacités acquises.',
  },
] as const;

/** Durée d'affichage d'une étape (ms) avant de passer à la suivante. */
const STEP_DURATION = 2600;

/**
 * Hauteur de la fenêtre d'image (px). En quatre colonnes, la carte fait 273 px et son
 * rembourrage en mange 2 × 20 : la fenêtre fait donc 233 × 180, et c'est sur ce rapport que
 * `scripts/home-shots-wizard.ts` cadre ses captures — les deux doivent bouger ensemble.
 */
const FRAME_HEIGHT = 180;

export function GuidedCreationDemo({ accent }: { accent: string }) {
  const [active, setActive] = useState(0);
  // Défilement interrompu POUR DE BON : le visiteur a cliqué une pastille, il pilote.
  const [taken, setTaken] = useState(false);
  // Interruption TEMPORAIRE : survol ou focus clavier. Reprend quand on s'éloigne.
  const [paused, setPaused] = useState(false);
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');

  // Les images des étapes suivantes ne sont pas dans le document tant qu'elles n'ont pas
  // leur tour : sans préchargement, chaque avance afficherait un cadre vide le temps du
  // téléchargement. On ne précharge qu'à la première avance — inutile de peser sur le
  // chargement initial de la page d'accueil pour une carte qui n'est peut-être pas vue.
  const preloaded = useRef(false);
  const preload = useCallback(() => {
    if (preloaded.current) return;
    preloaded.current = true;
    for (const step of STEPS.slice(1)) {
      const img = new Image();
      img.src = step.src;
    }
  }, []);

  useEffect(() => {
    if (reducedMotion || taken || paused) return;
    const id = window.setTimeout(() => {
      preload();
      setActive((i) => (i + 1) % STEPS.length);
    }, STEP_DURATION);
    return () => window.clearTimeout(id);
  }, [active, reducedMotion, taken, paused, preload]);

  const step = STEPS[active];

  return (
    <Stack
      spacing={1}
      data-glossary-shot="GuidedCreationDemo"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      {/* Frise : une pastille par étape, la courante en accent. Cliquer prend la main. */}
      <Stack direction="row" spacing={0.5} sx={{ justifyContent: 'space-between' }}>
        {STEPS.map((s, i) => {
          const isActive = i === active;
          return (
            <AppTooltip key={s.label} title={`${i + 1}. ${s.label}`}>
              <Box
                component="button"
                type="button"
                aria-label={`Étape ${i + 1} : ${s.label}`}
                aria-current={isActive ? 'step' : undefined}
                onClick={() => {
                  preload();
                  setTaken(true);
                  setActive(i);
                }}
                sx={{
                  flex: 1,
                  minWidth: 0,
                  height: 22,
                  p: 0,
                  fontSize: 11,
                  fontWeight: 700,
                  fontFamily: 'inherit',
                  cursor: 'pointer',
                  borderRadius: 0.75,
                  border: '1px solid',
                  borderColor: isActive ? accent : 'rgba(255, 255, 255, 0.14)',
                  bgcolor: isActive ? alpha(accent, 0.22) : 'rgba(255, 255, 255, 0.04)',
                  color: isActive ? accent : 'text.secondary',
                  transition: 'background-color 180ms, border-color 180ms, color 180ms',
                  '&:hover': { borderColor: alpha(accent, 0.6) },
                }}
              >
                {i + 1}
              </Box>
            </AppTooltip>
          );
        })}
      </Stack>

      <Typography variant="caption" sx={{ fontWeight: 600, color: accent }}>
        {step.label}
      </Typography>

      <Box
        sx={{
          height: FRAME_HEIGHT,
          borderRadius: 2,
          border: '1px solid rgba(255, 255, 255, 0.08)',
          overflow: 'hidden',
          bgcolor: 'rgba(0, 0, 0, 0.25)',
        }}
      >
        <Box
          component="img"
          // La clé force le remplacement du nœud à chaque étape : sans elle, le navigateur
          // garde l'image précédente peinte le temps de décoder la suivante, et l'on voit
          // le libellé changer avant la capture.
          key={step.src}
          src={step.src}
          alt={step.alt}
          // La première capture participe au rendu initial de la vitrine ; les suivantes
          // sont préchargées à la première avance (cf. `preload`).
          loading={active === 0 ? 'eager' : 'lazy'}
          decoding="async"
          sx={{
            display: 'block',
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'left top',
          }}
        />
      </Box>

      <Stack direction="row" sx={{ justifyContent: 'flex-end' }}>
        <Button size="small" variant="text" component={Link} href="/create">
          Créer un personnage
        </Button>
      </Stack>
    </Stack>
  );
}
