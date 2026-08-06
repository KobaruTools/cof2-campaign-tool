'use client';

/**
 * Section « Ce que fait l'outil » de la vitrine : quatre cartes, chacune portant une
 * **démonstration manipulable** plutôt qu'un paragraphe.
 *
 * Trois régimes cohabitent, et la distinction compte en maintenance :
 *
 *  - « En pleine partie » utilise le **vrai** composant de l'application, `HpGauge`,
 *    branché sur un état local. C'est possible parce qu'il est découpé proprement
 *    (`depletion` + `maxHp` + callbacks, aucun `Character` requis) : ce que le visiteur
 *    manipule ici est exactement ce qu'il manipulera sur sa fiche.
 *  - « Création guidée » montre une **capture** de l'assistant, régénérée par
 *    `scripts/generate-home-shots.ts` — donc jamais périmée en silence.
 *  - « Montée de niveau » et « Écran de meneur » sont des **maquettes** propres à cette
 *    page, mais alimentées par les VRAIES données (voies, couleurs de profil, catalogue
 *    des états). Rebrancher le vrai tracker d'initiative entraînerait l'état de campagne,
 *    le Realtime, `@dnd-kit` et la résolution des états dans une page d'accueil :
 *    disproportionné. Elles n'énoncent donc aucun barème — elles illustrent un geste.
 *
 * Aucune de ces démos ne persiste quoi que ce soit : tout vit dans un `useState` qui
 * meurt avec la page.
 */
import { useState, type ReactNode } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import { AppTooltip } from '@/components/AppTooltip';
import { GmScreenIcon } from '@/components/GmScreenIcon';
import { SectionIcon } from '@/components/SectionIcon';
import { StatusEffectIcon } from '@/components/StatusEffectIcon';
import { HpGauge } from '@/components/sheet/HpGauge';
import { STATUS_EFFECTS, type StatusEffectId } from '@/data/schema';
import type { HpDepletion } from '@/lib/character/types';
import type { SectionIconName } from '@/lib/ui/sectionIcons';

/**
 * Hauteur réservée à la démo dans chaque carte (px). Sans réserve commune, la carte la
 * plus haute imposait sa taille aux autres, qui se retrouvaient avec un vide sous leur
 * démo — les quatre démos n'ont pas la même hauteur naturelle. En réservant la même
 * place partout, elles s'alignent et les cartes se terminent ensemble.
 */
const DEMO_SLOT_HEIGHT = 246;

/** Verre dépoli des cartes, aligné sur le reste de la vitrine. */
const GLASS = {
  bgcolor: 'rgba(20, 20, 23, 0.72)',
  backdropFilter: 'blur(10px)',
  WebkitBackdropFilter: 'blur(10px)',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  borderRadius: 3,
} as const;

/**
 * Carte de capacité : un liseré coloré en tête, l'icône dans un médaillon teinté de la
 * même couleur, le texte, puis la démo qui occupe le bas de la carte. L'accent donne
 * aux quatre cartes une identité immédiate — c'est ce qui manquait le plus à la grille
 * de paragraphes qu'elles remplacent.
 */
function FeatureCard({
  icon,
  title,
  accent,
  children,
  demo,
}: {
  icon: ReactNode;
  title: string;
  accent: string;
  children: ReactNode;
  demo: ReactNode;
}) {
  return (
    <Paper
      elevation={0}
      sx={{
        ...GLASS,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        transition: 'border-color 140ms, transform 140ms',
        '&:hover': { borderColor: alpha(accent, 0.4), transform: 'translateY(-2px)' },
      }}
    >
      {/* Liseré d'accent, pleine largeur en tête de carte. */}
      <Box sx={{ height: 3, bgcolor: accent, opacity: 0.85 }} />
      <Stack spacing={1.5} sx={{ p: 2.5, flexGrow: 1 }}>
        <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
          <Box
            sx={{
              display: 'grid',
              placeItems: 'center',
              width: 38,
              height: 38,
              borderRadius: '50%',
              bgcolor: alpha(accent, 0.16),
              border: `1px solid ${alpha(accent, 0.35)}`,
              color: accent,
              flexShrink: 0,
            }}
          >
            {icon}
          </Box>
          <Typography variant="subtitle1" component="h3" sx={{ fontWeight: 700 }}>
            {title}
          </Typography>
        </Stack>
        <Typography variant="body2" color="text.secondary">
          {children}
        </Typography>
        {/* La démo est repoussée en bas, sur une réserve de hauteur commune : les quatre
            cartes s'alignent malgré des textes et des démos de tailles différentes. */}
        <Box
          sx={{
            mt: 'auto',
            pt: 1,
            minHeight: DEMO_SLOT_HEIGHT,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
          }}
        >
          {demo}
        </Box>
      </Stack>
    </Paper>
  );
}

// ─── Démo 1 : création guidée ────────────────────────────────────────────────

/**
 * Capture cadrée de l'assistant de création (frise d'étapes + premier panneau), produite
 * par `scripts/generate-home-shots.ts`. L'encart de carte est étroit : c'est un cadrage
 * SERRÉ, pas une page entière réduite — à 250 px de large, une page complète ne montre
 * plus rien. Le clic mène à l'assistant réel.
 */
function GuidedCreationDemo() {
  return (
    <Stack spacing={1}>
      <Box
        sx={{
          height: DEMO_SLOT_HEIGHT - 42,
          borderRadius: 2,
          border: '1px solid rgba(255, 255, 255, 0.08)',
          overflow: 'hidden',
        }}
      >
        <Box
          component="img"
          src="/home/wizard.webp"
          alt="Aperçu de l’assistant de création : la frise des sept étapes."
          loading="lazy"
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

// ─── Démo 2 : montée de niveau ───────────────────────────────────────────────

/**
 * Grille des voies, dans son propre module et chargée **sans rendu serveur** : elle tire
 * son personnage au sort, ce qui ne peut pas se faire pendant un rendu partagé
 * serveur/client sans provoquer une divergence d'hydratation (détaillé dans le module).
 *
 * Le substitut de chargement occupe exactement la réserve de la démo, pour que la carte
 * ne saute pas quand le module arrive.
 */
const LevelUpGridDemo = dynamic(
  () => import('@/components/home/LevelUpGridDemo').then((m) => m.LevelUpGridDemo),
  { ssr: false, loading: () => <Box sx={{ height: DEMO_SLOT_HEIGHT }} /> },
);

// ─── Démo 3 : en pleine partie (VRAI composant) ──────────────────────────────

/** PV maximum du personnage fictif de la démo. */
const DEMO_MAX_HP = 24;

/**
 * Le **vrai** `HpGauge` de la fiche, branché sur un état local. Les dégâts, les soins
 * et la remise à plein passent par les mêmes chemins qu'en jeu ; seule la persistance
 * est remplacée par un `useState`.
 */
function InPlayDemo() {
  const [hp, setHp] = useState<HpDepletion>({ lethal: 7, temp: 3 });

  return (
    <HpGauge
      depletion={{ hp }}
      maxHp={DEMO_MAX_HP}
      persistKey="home-demo"
      controlsBelow
      onDamage={(amount, kind) =>
        setHp((d) => ({
          lethal: kind === 'lethal' ? d.lethal + amount : d.lethal,
          temp: kind === 'temp' ? d.temp + amount : d.temp,
        }))
      }
      onHeal={(amount) =>
        setHp((d) => {
          // Les PV létaux se soignent d'abord, le reliquat retombe sur les temporaires
          // — même ordre que sur la fiche.
          const lethal = Math.max(0, d.lethal - amount);
          const rest = amount - (d.lethal - lethal);
          return { lethal, temp: Math.max(0, d.temp - rest) };
        })
      }
      onReset={() => setHp({ lethal: 0, temp: 0 })}
    />
  );
}

// ─── Démo 4 : écran de meneur ────────────────────────────────────────────────

/**
 * Combattants de la maquette d'initiative. Le camp fixe la teinte de la bordure, et
 * chacun porte des **états préjudiciables réels** (ids de `STATUS_EFFECT_IDS`) : c'est ce
 * qui donne à voir la vraie complexité d'un tour de jeu, où l'initiative n'est qu'une
 * ligne parmi les informations à suivre.
 */
const COMBATANTS = [
  { name: 'Ysoria', init: 18, side: 'ally', statuses: ['slowed'] },
  { name: 'Gobelin 1', init: 14, side: 'enemy', statuses: ['blinded', 'weakened'] },
  { name: 'Brutus', init: 11, side: 'ally', statuses: ['prone', 'winded'] },
  { name: 'Gobelin 2', init: 7, side: 'enemy', statuses: ['immobilized'] },
] as const satisfies readonly {
  name: string;
  init: number;
  side: 'ally' | 'enemy';
  statuses: readonly StatusEffectId[];
}[];

/**
 * Badge d'un état préjudiciable : l'icône de l'état, son verbatim de règle et sa page
 * source en info-bulle — convention du projet (bloc custom, pas de `Chip` MUI, verbatim
 * en info-bulle). Le libellé et le texte viennent du catalogue `STATUS_EFFECTS`, donc du
 * livre : rien n'est réécrit ici.
 */
function StatusBadge({ id }: { id: StatusEffectId }) {
  const entry = STATUS_EFFECTS[id];
  return (
    <AppTooltip
      title={
        <Box sx={{ maxWidth: 260 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            {entry.label}
          </Typography>
          <Typography variant="caption" sx={{ display: 'block', fontStyle: 'italic' }}>
            « {entry.effect} »
          </Typography>
          <Typography variant="caption" color="text.secondary">
            p. {entry.sourcePage}
          </Typography>
        </Box>
      }
    >
      <Box
        sx={{
          display: 'grid',
          placeItems: 'center',
          width: 18,
          height: 18,
          borderRadius: '50%',
          bgcolor: 'rgba(244, 67, 54, 0.16)',
          border: '1px solid rgba(244, 67, 54, 0.45)',
          color: 'error.light',
          flexShrink: 0,
        }}
      >
        <StatusEffectIcon effect={id} size={11} />
      </Box>
    </AppTooltip>
  );
}

/**
 * Maquette de la bande d'initiative : le combattant actif est mis en avant, « Tour
 * suivant » fait tourner l'ordre, et chaque ligne porte ses états. Reprend les codes de
 * l'écran de MJ (pastille d'initiative, teinte par camp, bordure blanche sur l'actif)
 * sans en importer l'état — le vrai tracker traînerait avec lui l'état de campagne, le
 * Realtime et `@dnd-kit`.
 */
function GmScreenDemo() {
  const [active, setActive] = useState(0);

  return (
    <Stack spacing={1}>
      <Stack spacing={0.5}>
        {COMBATANTS.map((c, i) => {
          const isActive = i === active;
          const sideColor = c.side === 'enemy' ? 'error.main' : 'success.main';
          return (
            <Stack
              key={c.name}
              direction="row"
              spacing={0.75}
              sx={{
                alignItems: 'center',
                px: 0.75,
                py: 0.5,
                borderRadius: 1,
                borderLeft: '3px solid',
                borderLeftColor: sideColor,
                bgcolor: isActive ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.03)',
                outline: isActive ? '1px solid rgba(255, 255, 255, 0.5)' : 'none',
                transition: 'background-color 180ms, outline-color 180ms',
              }}
            >
              <Box
                sx={{
                  minWidth: 24,
                  textAlign: 'center',
                  fontSize: 12,
                  fontWeight: 700,
                  borderRadius: 0.75,
                  bgcolor: 'rgba(255, 255, 255, 0.08)',
                  py: 0.25,
                  flexShrink: 0,
                }}
              >
                {c.init}
              </Box>
              <Typography
                variant="body2"
                noWrap
                sx={{
                  flexGrow: 1,
                  minWidth: 0,
                  fontWeight: isActive ? 700 : 400,
                  color: isActive ? 'text.primary' : 'text.secondary',
                }}
              >
                {c.name}
              </Typography>
              <Stack direction="row" spacing={0.375} sx={{ flexShrink: 0 }}>
                {c.statuses.map((id) => (
                  <StatusBadge key={id} id={id} />
                ))}
              </Stack>
            </Stack>
          );
        })}
      </Stack>
      <Stack direction="row" sx={{ justifyContent: 'flex-end' }}>
        <Button size="small" variant="text" onClick={() => setActive((a) => (a + 1) % COMBATANTS.length)}>
          Tour suivant
        </Button>
      </Stack>
    </Stack>
  );
}

// ─── Section ─────────────────────────────────────────────────────────────────

const sectionIcon = (name: SectionIconName) => <SectionIcon name={name} size={20} />;

export function FeatureShowcase() {
  // Accents empruntés à la palette du thème plutôt qu'à des valeurs en dur : les
  // quatre cartes restent cohérentes avec le reste de l'app.
  const accents = {
    creation: '#7aa2f7',
    levels: '#bb9af7',
    play: '#9ece6a',
    gm: '#e0af68',
  } as const;

  return (
    <Box
      sx={{
        display: 'grid',
        gap: { xs: 2, sm: 2.5 },
        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' },
      }}
    >
      <FeatureCard
        icon={sectionIcon('identity')}
        title="Création guidée"
        accent={accents.creation}
        demo={<GuidedCreationDemo />}
      >
        Un assistant qui applique les règles pas à pas : peuple, profil, caractéristiques,
        voies et équipement de départ.
      </FeatureCard>

      <FeatureCard
        icon={sectionIcon('levels')}
        title="Montée de niveau"
        accent={accents.levels}
        demo={<LevelUpGridDemo />}
      >
        Les rangs de voies s’ouvrent quand ils le doivent, les choix permanents sont
        mémorisés, et rien ne se choisit qui ne soit permis.
      </FeatureCard>

      <FeatureCard
        icon={sectionIcon('status')}
        title="En pleine partie"
        accent={accents.play}
        demo={<InPlayDemo />}
      >
        Jauges de points de vie, de mana et de rage, états, bourse et repos. Cette barre
        est celle de la fiche — essayez-la.
      </FeatureCard>

      <FeatureCard
        icon={<GmScreenIcon sx={{ fontSize: 20 }} />}
        title="Écran de meneur"
        accent={accents.gm}
        demo={<GmScreenDemo />}
      >
        Ordre d’initiative, créatures du bestiaire, états infligés, et projection sur un
        second écran pour la table.
      </FeatureCard>
    </Box>
  );
}
