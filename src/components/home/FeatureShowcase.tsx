'use client';

/**
 * Section « Ce que fait l'outil » de la vitrine : quatre cartes, chacune portant une
 * **démonstration manipulable** plutôt qu'un paragraphe.
 *
 * Trois régimes cohabitent, et la distinction compte en maintenance :
 *
 *  - « En pleine partie » utilise les **vrais** composants de l'application, `HpGauge` et
 *    la `GaugeRow` de mana, branchés sur un état local. C'est possible parce qu'ils sont
 *    découpés proprement (dépletion + max + callbacks, aucun `Character` requis) : ce que le
 *    visiteur manipule ici est exactement ce qu'il manipulera sur sa fiche.
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
import HotelIcon from '@mui/icons-material/Hotel';
import TimerIcon from '@mui/icons-material/Timer';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';
import { AppTooltip } from '@/components/AppTooltip';
import { DerivedStatIcon } from '@/components/DerivedStatIcon';
import { GmScreenIcon } from '@/components/GmScreenIcon';
import { SectionIcon } from '@/components/SectionIcon';
import { StatusEffectIcon } from '@/components/StatusEffectIcon';
import { GaugeRow } from '@/components/sheet/GaugeRow';
import { HpGauge } from '@/components/sheet/HpGauge';
import { RecoveryDicePips } from '@/components/sheet/RecoveryDicePips';
import { STATUS_EFFECTS, type Die, type StatusEffectId } from '@/data/schema';
import {
  applyDamage,
  currentMana,
  currentRecoveryDice,
  healHp,
  resetHp,
  resetMana,
  restoreMana,
  restoreRecoveryDice,
  setRecoveryDiceMissing,
  spendMana,
  spendRecoveryDice,
} from '@/lib/character/gauges';
import type { Depletion } from '@/lib/character/types';
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

// ─── Démo 3 : en pleine partie (VRAIS composants) ─────────────────────────────

/** PV maximum du personnage fictif de la démo. */
const DEMO_MAX_HP = 24;
/** Réserve de mana du même personnage (un lanceur de sorts de bas niveau). */
const DEMO_MAX_MANA = 12;
/** Sa réserve de dés de récupération, et le dé associé à son profil. */
const DEMO_RECOVERY_DICE_MAX = 3;
const DEMO_RECOVERY_DIE: Die = 'd6';
/** Faces du dé ci-dessus, dérivées de son code (même lecture que `sheetActions`). */
const DEMO_RECOVERY_DIE_FACES = Number.parseInt(DEMO_RECOVERY_DIE.slice(1), 10);
/** Son niveau : il entre dans le soin d'un repos (½ niveau, p. 221-222). */
const DEMO_LEVEL = 3;

/**
 * Régénère les dégâts TEMPORAIRES en conservant les létaux : tout repos commence par là
 * (les DM temporaires se récupèrent à 1/min, p. 220). Reproduit le `clearTemp` privé de
 * `lib/character/rest` — la démo ne peut pas appeler `shortRest`/`longRest`, qui exigent un
 * `Character` complet et entraîneraient tout le moteur (effets, élixirs, armes, charges)
 * dans le bundle de la page d'accueil.
 */
function demoClearTemp(depletion: Depletion): Depletion {
  if (!depletion.hp) return depletion;
  return { ...depletion, hp: { lethal: Math.max(0, depletion.hp.lethal), temp: 0 } };
}

/**
 * Les **vraies** jauges de la fiche — `HpGauge` (PV létaux / temporaires) et la `GaugeRow`
 * de mana — plus la **vraie** matrice de dés de récupération, branchées sur une dépletion
 * locale que font évoluer les **vrais** réducteurs de `lib/character/gauges`. Seule la
 * persistance est remplacée par un `useState`.
 *
 * Les deux bandes sont volontairement réduites au même gabarit (`hideDetails` +
 * `controlsBelow`) : barre pleine largeur, boutons ±1 / remise à plein sur leur propre ligne,
 * pas de formulaire détaillé. La carte n'a pas la place de le déplier, et un chevron qui ne
 * promet rien de tenable vaut moins que pas de chevron. Sur la fiche, les deux jauges gardent
 * leur formulaire (montant + Dégâts/Soin, montant + Dépenser/Récupérer).
 *
 * Les deux repos appliquent les règles du livre (p. 221-222), à une entorse près, assumée :
 * le dé de récupération est lancé **par le programme**. Sur la fiche, il est SAISI par le
 * joueur — les dés se lancent en vrai à la table (décision de conception du projet) — mais
 * une vitrine ne peut pas demander à un visiteur de lancer un dé physique. Les effets qui
 * n'ont pas de sens ici (capacités « par combat » ou « par jour », élixirs, rechargement des
 * armes : la démo n'a ni capacité, ni compteur, ni équipement) sont simplement absents.
 */
function InPlayDemo() {
  const theme = useTheme();
  const [depletion, setDepletion] = useState<Depletion>({ hp: { lethal: 7, temp: 3 }, mana: 5 });
  const recoveryDice = currentRecoveryDice(DEMO_RECOVERY_DICE_MAX, depletion);
  const halfLevel = Math.floor(DEMO_LEVEL / 2);

  /**
   * Repos court (p. 221) : dégâts temporaires régénérés, et un dé de récupération dépensé
   * pour soigner `dé + ½ niveau` PV. Sans DR disponible, aucun soin — le repos se réduit alors
   * aux dégâts temporaires, et c'est justement l'attrition du système qu'il faut donner à voir :
   * le bouton reste donc actif, il ne rend simplement plus de PV.
   */
  const shortRest = () => {
    const roll = 1 + Math.floor(Math.random() * DEMO_RECOVERY_DIE_FACES);
    setDepletion((d) => {
      const rested = demoClearTemp(d);
      if (currentRecoveryDice(DEMO_RECOVERY_DICE_MAX, d) <= 0) return rested;
      return spendRecoveryDice(healHp(rested, roll + halfLevel), 1, DEMO_RECOVERY_DICE_MAX);
    });
  };

  /**
   * Repos long (p. 221-222, 229) : mana entièrement restauré, dégâts temporaires régénérés
   * et **+1 dé de récupération** — le système d'attrition ne rend ni tous les PV ni tous les DR.
   *
   * Réserve déjà pleine : le DR gagné ne peut pas s'y ajouter, il est donc immédiatement dépensé
   * pour soigner, et « le nombre de PV récupérés est automatiquement égal à la valeur maximale du
   * dé » (p. 222) — c'est le MÊME dé, donc la réserve reste inchangée. Le livre laisse ce choix au
   * joueur à chaque repos long ; la démo le fait à sa place, dans le seul cas où l'autre option ne
   * donnerait rien.
   */
  const longRest = () => {
    setDepletion((d) => {
      const rested = resetMana(demoClearTemp(d));
      return currentRecoveryDice(DEMO_RECOVERY_DICE_MAX, d) >= DEMO_RECOVERY_DICE_MAX
        ? healHp(rested, DEMO_RECOVERY_DIE_FACES + halfLevel)
        : restoreRecoveryDice(rested, 1, DEMO_RECOVERY_DICE_MAX);
    });
  };

  return (
    <Stack spacing={1.25}>
      <HpGauge
        depletion={depletion}
        maxHp={DEMO_MAX_HP}
        persistKey="home-demo"
        controlsBelow
        hideDetails
        onDamage={(amount, kind) => setDepletion((d) => applyDamage(d, amount, kind, DEMO_MAX_HP))}
        onHeal={(amount) => setDepletion((d) => healHp(d, amount))}
        onReset={() => setDepletion(resetHp)}
      />
      <GaugeRow
        label="Points de mana"
        icon={<DerivedStatIcon statId="manaPoints" size={28} color="#fff" />}
        fillColor="info.main"
        capColor={theme.palette.info.main}
        persistKey="gauge-expanded:home-demo-mana"
        controlsBelow
        hideDetails
        current={currentMana(DEMO_MAX_MANA, depletion)}
        max={DEMO_MAX_MANA}
        spendLabel="Dépenser"
        restoreLabel="Récupérer"
        onSpend={(amount) => setDepletion((d) => spendMana(d, amount, DEMO_MAX_MANA))}
        onRestore={(amount) => setDepletion((d) => restoreMana(d, amount, DEMO_MAX_MANA))}
        onReset={() => setDepletion(resetMana)}
      />

      {/* Les deux repos sur UNE ligne (chacun la moitié de la largeur : côte à côte, ils
          n'entrent pas à leur largeur naturelle dans une carte de 250 px), la réserve de dés
          de récupération sur la ligne suivante, alignée à droite comme les boutons des jauges. */}
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
        <AppTooltip
          title="Récupération rapide (30 min) : régénère les dégâts temporaires et consomme un dé de récupération pour se soigner de [dé + ½ niveau] PV."
          page={221}
        >
          <Button
            size="small"
            variant="outlined"
            startIcon={<TimerIcon />}
            onClick={shortRest}
            sx={{ flex: 1, minWidth: 0, whiteSpace: 'nowrap' }}
          >
            Repos court
          </Button>
        </AppTooltip>
        <AppTooltip
          title="Récupération complète (8 h, 1/jour) : mana plein, dégâts temporaires régénérés, et +1 dé de récupération — ou, réserve déjà pleine, ce dé est dépensé sur-le-champ pour soigner sa valeur maximale."
          page="221-222, 229"
        >
          <Button
            size="small"
            variant="outlined"
            startIcon={<HotelIcon />}
            onClick={longRest}
            sx={{ flex: 1, minWidth: 0, whiteSpace: 'nowrap' }}
          >
            Repos long
          </Button>
        </AppTooltip>
      </Stack>
      <Stack direction="row" sx={{ justifyContent: 'flex-end' }}>
        <RecoveryDicePips
          max={DEMO_RECOVERY_DICE_MAX}
          current={recoveryDice}
          die={DEMO_RECOVERY_DIE}
          onSet={(value) =>
            setDepletion((d) => setRecoveryDiceMissing(d, DEMO_RECOVERY_DICE_MAX - value, DEMO_RECOVERY_DICE_MAX))
          }
        />
      </Stack>
    </Stack>
  );
}

// ─── Démo 4 : écran de meneur ────────────────────────────────────────────────

/**
 * Combattants de la maquette d'initiative, dans l'ordre décroissant d'initiative. Le camp
 * fixe la teinte de la bordure, et chacun porte des **états préjudiciables réels** (ids de
 * `STATUS_EFFECT_IDS`) : c'est ce qui donne à voir la vraie complexité d'un tour de jeu, où
 * l'initiative n'est qu'une ligne parmi les informations à suivre.
 *
 * Trois partis pris, tous tirés du livre :
 *
 *  - les deux gobelins agissent à la **même** initiative. C'est ainsi qu'un groupe de
 *    créatures identiques se joue — l'attaque groupée « ne peut être utilisée que si toutes
 *    les créatures concernées possèdent le même profil et agissent à la même initiative
 *    (par exemple, un groupe de gobelins) » (p. 217) ;
 *  - les adversaires sont de vraies créatures du livre : gobelin, bandit et chef bandit
 *    (p. 263), ce dernier placé juste avant sa troupe puisqu'il donne « +1 en Init., en
 *    attaque et aux DM à tous les bandits à portée de vue » ;
 *  - « Lhagva » est le personnage des exemples du livre, comme dans l'aide-mémoire.
 *
 * La maquette n'énonce toujours aucun barème : ces valeurs d'initiative sont des jets de
 * table, pas des données de règle.
 */
const COMBATANTS = [
  { name: 'Ysoria', init: 18, side: 'ally', statuses: ['slowed'] },
  { name: 'Gobelin 1', init: 14, side: 'enemy', statuses: ['blinded', 'weakened'] },
  { name: 'Gobelin 2', init: 14, side: 'enemy', statuses: ['immobilized'] },
  { name: 'Chef bandit', init: 12, side: 'enemy', statuses: [] },
  { name: 'Brutus', init: 11, side: 'ally', statuses: ['prone', 'winded'] },
  { name: 'Lhagva', init: 9, side: 'ally', statuses: ['dazed'] },
  { name: 'Bandit', init: 6, side: 'enemy', statuses: ['surprised'] },
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
        Jauges de points de vie, de mana et de rage, états, bourse et repos. Ces barres sont
        celles de la fiche — essayez-les.
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
