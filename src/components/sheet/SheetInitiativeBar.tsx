'use client';

/**
 * Bande d'initiative « publique » (vue projection) attachée au bas de la fiche de personnage,
 * collée à l'écran comme celle de l'écran de MJ (`position: sticky`, PER-301) mais avec un
 * bouton de repli en un simple bandeau (titre + flèche) — la fiche n'a pas la place pour la
 * garder grande ouverte en permanence, contrairement à l'écran de MJ (qui n'a que le mode
 * compact pour ça). Le repli, PERSISTÉ (`localStorage`), remplace tout le corps de la bande par
 * ce seul bandeau, cliquable pour la redéplier.
 *
 * PLEINE LARGEUR, volontairement montée HORS du `Container maxWidth="md"` de la fiche (comme la
 * bande de l'écran de MJ, hors de SON `Container` habituel) : bordée par le viewport plutôt que
 * par la colonne centrale de la fiche, elle se distingue visuellement du contenu qu'elle surplombe
 * et gagne la largeur nécessaire pour aligner plus de combattants sans défiler.
 *
 * Lit le combat de la campagne du personnage via le hook PARTAGÉ de l'écran de MJ
 * (`useGmScreenCombat`, rôle `'reader'` — jamais auteur), qui pioche dans le même store
 * `campaignCombat` déjà alimenté en direct par le canal de session ouvert par
 * `SessionHeaderIndicator` (PER-269, point de montage UNIQUE de la fiche) : aucun second
 * abonnement Realtime n'est ouvert ici, seulement une lecture zustand.
 *
 * Masquée quand le roster de combat est vide : la bande serait sinon posée sur CHAQUE fiche
 * même hors combat, ce qui n'a de sens que sur l'écran de MJ (qui pilote activement le combat)
 * et non sur la fiche d'un joueur qui ne fait que la consulter entre deux combats.
 *
 * CONDENSÉ REPLIÉ : une puce de couleur par combattant (cf. `CondensedOrderDots`) s'ajoute au
 * bandeau replié dès que le combat a COMMENCÉ (`currentTurnKey !== null`), pour lire d'un coup
 * d'œil qui joue sans dérouler la bande. `currentTurnKey` ne vaut `null` qu'avant le tout premier
 * tour — le bouton ⟳ « recommencer le décompte » de l'écran de MJ le remet à `null` plutôt que de
 * resélectionner le premier combattant, précisément pour que ce signal reste fiable.
 */
import { forwardRef, useEffect, useRef, useState } from 'react';
import KeyboardDoubleArrowDownIcon from '@mui/icons-material/KeyboardDoubleArrowDown';
import KeyboardDoubleArrowUpIcon from '@mui/icons-material/KeyboardDoubleArrowUp';
import PersonOutlineIcon from '@mui/icons-material/PersonOutlined';
import Box from '@mui/material/Box';
import Collapse from '@mui/material/Collapse';
import Fade from '@mui/material/Fade';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import { ClassIcon } from '@/components/ClassIcon';
import { InitiativeTracker, type InitiativeRow } from '@/components/campaign/InitiativeTracker';
import { useGmScreenCombat } from '@/app/campaign/[cid]/gm-screen/useGmScreenCombat';
import { usePersistedBoolean } from '@/lib/ui/usePersistedBoolean';

/** Le tour se pilote depuis l'écran de MJ : la fiche ne le modifie jamais. */
const noop = () => {};

/** Clé `localStorage` du repli de la bande — préférence d'affichage LOCALE, comme les autres réglages du tracker. */
const COLLAPSED_STORAGE_KEY = 'sheet-initiative-bar-collapsed';

/**
 * Empilement sous les modales/menus/tiroir latéral de la fiche (`Modal` MUI, 1300) et la barre
 * de nav globale (`AppBar`, 1100), au-dessus des sections de la fiche — même palier que
 * `STICKY_Z_INDEX` de l'écran de MJ.
 */
const STICKY_Z_INDEX = 900;

/**
 * Pleine largeur : pas de marge/bordure latérales (contrairement à la carte flottante d'une
 * première version), juste un filet supérieur qui court d'un bord à l'autre du viewport — le
 * même parti que la bande collée de l'écran de MJ. Le rembourrage horizontal du CONTENU
 * (en-tête + tracker) reprend celui du `Container` de la fiche pour rester aligné avec elle.
 *
 * Pas de `pt` ici (contrairement à une première version) : tout le rembourrage vertical du
 * bandeau d'en-tête vient de LUI SEUL (`py` symétrique) pour que le texte et la flèche restent
 * centrés une fois le bloc replié — un `pt` porté par ce conteneur aurait déséquilibré l'unique
 * ligne visible en repli (plus d'air en haut qu'en bas).
 */
const STICKY_SX = {
  position: 'sticky',
  bottom: 0,
  zIndex: STICKY_Z_INDEX,
  width: '100%',
  px: { xs: 2, sm: 4 },
  bgcolor: 'rgba(16, 16, 19, 0.88)',
  backdropFilter: 'blur(14px)',
  WebkitBackdropFilter: 'blur(14px)',
  borderTop: '1px solid rgba(255, 255, 255, 0.12)',
  boxShadow: '0 -8px 24px rgba(0, 0, 0, 0.5)',
} as const;

/**
 * Largeur (droite) réservée au bouton flottant « Haut de page » (`ScrollToTopButton`, `Fab`
 * medium 56px ancré `right: 24`) quand il partage le coin bas-droit du viewport avec ce bandeau —
 * assez pour que la flèche de repli ne s'empile pas dessous.
 */
const SCROLL_TOP_BUTTON_CLEARANCE = '88px';

/**
 * Marge (px) sous laquelle on considère que le bandeau a fini de défiler jusqu'à sa position NON
 * collée (fin réelle de page, juste au-dessus du pied de page) — cf. `useUnstuckFromViewportBottom`.
 */
const UNSTUCK_THRESHOLD_PX = 10;

/**
 * Le bandeau est en `position: sticky; bottom: 0` : tant qu'il reste collé au bas du viewport, son
 * bord bas touche exactement `window.innerHeight`. Une fois qu'on a défilé jusqu'à la vraie fin de
 * page (le pied de page apparaît), il se décolle et son bord bas remonte — c'est PILE le moment où
 * il n'est plus dans la zone du bouton flottant « Haut de page » (fixe, lui, au bas du viewport), et
 * où la flèche de repli peut donc revenir à sa position normale sans risquer de s'empiler dessous.
 */
function useUnstuckFromViewportBottom(ref: { current: HTMLElement | null }, active: boolean) {
  const [unstuck, setUnstuck] = useState(false);
  useEffect(() => {
    // Rien à mesurer/écouter tant que le bouton flottant n'est pas affiché : `unstuck` reste alors
    // sans effet, l'appelant ne le combine qu'avec `active` (`scrollTopButtonVisible`).
    if (!active) return;
    const measure = () => {
      const el = ref.current;
      if (!el) return;
      setUnstuck(el.getBoundingClientRect().bottom < window.innerHeight - UNSTUCK_THRESHOLD_PX);
    };
    measure();
    window.addEventListener('scroll', measure, { passive: true });
    window.addEventListener('resize', measure);
    return () => {
      window.removeEventListener('scroll', measure);
      window.removeEventListener('resize', measure);
    };
  }, [ref, active]);
  return unstuck;
}

/** Côté (px) d'une puce, normale puis mise en évidence pour le combattant actif. */
const DOT_SIZE = 20;
const ACTIVE_DOT_SIZE = 28;

/**
 * Couleur neutre de repli (créatures, ET personnage sans profil résolu) : contour BLANC quel que
 * soit le camp (allié ou adverse) — les créatures n'ont pas de couleur de « profil » à reprendre,
 * contrairement aux personnages joueurs (cf. `ringColorFor`).
 */
const NEUTRAL_RING = 'rgba(255, 255, 255, 0.92)';

/**
 * Couleur du contour d'une puce : celle du PROFIL pour un personnage joueur (`row.profileColor`,
 * la même teinte que sa carte dans la bande dépliée), BLANCHE pour une créature — alliée ou
 * adverse, cf. demande explicite : les créatures n'ont pas de profil à représenter par une couleur.
 */
function ringColorFor(row: InitiativeRow): string {
  return row.isCreature ? NEUTRAL_RING : row.profileColor;
}

/**
 * Anneau en `border` plutôt qu'en `box-shadow` (une première version) : à cette taille, le halo
 * d'un `box-shadow` rognait sur les coins de l'anneau côté rendu (cercle un peu « carré ») — la
 * bordure, elle, suit exactement le `border-radius` de la puce.
 */
function ringSx(color: string, isActive: boolean) {
  return { border: `1.5px solid ${alpha(color, isActive ? 0.95 : 0.55)}` };
}

/**
 * Pulsation du combattant actif quand c'est SON PERSONNAGE (`isMine`) — même idiome que
 * `pulseSx` de `SessionConnectionBadge` (anneau qui s'étend puis s'efface, désactivé si
 * `prefers-reduced-motion`), portée plus loin (halo plus large, opacité de départ plus haute) :
 * le joueur doit repérer d'un coup d'œil que c'est SON tour, pas seulement qu'un tour est en
 * cours — le halo blanc reste blanc quel que soit le profil (demande explicite), pour trancher
 * sur n'importe quelle couleur de contour. PAS de « pop » d'échelle (retiré : le grandissement de
 * la puce active est un changement d'état simple, cf. `SIZE_TRANSITION`, pas une pulsation).
 */
const PULSE_SX = {
  animation: 'sheetInitiativePulse 1.3s ease-out infinite',
  '@keyframes sheetInitiativePulse': {
    '0%': { boxShadow: '0 0 0 0 rgba(255, 255, 255, 0.85)' },
    '70%': { boxShadow: '0 0 0 11px rgba(255, 255, 255, 0)' },
    '100%': { boxShadow: '0 0 0 0 rgba(255, 255, 255, 0)' },
  },
  '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
} as const;

/**
 * Transition simple (pas une animation en boucle) sur le changement de taille/contour quand un
 * combattant devient actif ou cesse de l'être : la valeur cible reste un changement D'ÉTAT franc
 * (20 → 28 px), seule la TRANSITION vers cette valeur est adoucie.
 */
const SIZE_TRANSITION = 'transform 0.2s ease, border-color 0.2s ease';

/** Facteur d'agrandissement du combattant ACTIF, dérivé des deux tailles ci-dessus. */
const ACTIVE_SCALE = ACTIVE_DOT_SIZE / DOT_SIZE;

/**
 * Représentation ULTRA CONDENSÉE de l'ordre d'initiative pour le bandeau replié : l'ICÔNE DE
 * PROFIL de chaque combattant (`ClassIcon`, la même glyphe que le reste de la fiche — pas son
 * portrait illustré, pas une puce de couleur abstraite), dans l'ordre d'initiative. Le combattant
 * ACTIF est agrandi et son contour renforcé ; si c'est en plus SON PROPRE personnage
 * (`characterId`), l'anneau PULSE (toujours blanc) pour que le joueur remarque que c'est SON tour
 * sans avoir à dérouler la bande. Sans profil (créature, ou bloc non chargé), repli sur un avatar
 * générique. Nom complet en info-bulle native.
 *
 * AGRANDISSEMENT SANS DÉCALAGE EN X : chaque puce vit dans un conteneur RÉSERVANT toujours la
 * taille MAX (`ACTIVE_DOT_SIZE`, `flexShrink: 0`) — la largeur de la bande ne bouge donc jamais
 * quand un combattant devient actif/cesse de l'être. La puce elle-même reste à taille FIXE
 * (`DOT_SIZE`) et se grossit par `transform: scale(...)` en `position: absolute`, centrée sur son
 * conteneur : `transform` est peint PAR-DESSUS la mise en page sans jamais la modifier, donc ni la
 * puce elle-même ni ses voisines ne se décalent horizontalement pendant la transition.
 */
const CondensedOrderDots = forwardRef<
  HTMLDivElement,
  {
    rows: InitiativeRow[];
    currentTurnKey: string | null;
    /** Personnage propriétaire de CETTE fiche : distingue « c'est un tour » de « c'est MON tour ». */
    characterId: string;
  }
  // `ref` + le reste des props (dont `style`) sont injectés par `Fade` — un composant custom placé
  // sous une transition MUI doit les relayer pour que le fondu s'applique réellement.
>(function CondensedOrderDots({ rows, currentTurnKey, characterId, ...other }, ref) {
  return (
    <Stack
      ref={ref}
      direction="row"
      spacing={0.75}
      sx={{ alignItems: 'center', overflow: 'hidden', minWidth: 0 }}
      {...other}
    >
      {rows.map((row) => {
        const isActive = row.key === currentTurnKey;
        const isMine = row.key === characterId;
        const commonSx = {
          position: 'absolute' as const,
          top: '50%',
          left: '50%',
          width: DOT_SIZE,
          height: DOT_SIZE,
          borderRadius: '50%',
          boxSizing: 'border-box' as const,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: SIZE_TRANSITION,
          transform: `translate(-50%, -50%) scale(${isActive ? ACTIVE_SCALE : 1})`,
          ...ringSx(ringColorFor(row), isActive),
          ...(isActive && isMine ? PULSE_SX : {}),
        };
        return (
          // Conteneur à taille FIXE (le max des deux états) : c'est LUI qui occupe une place dans
          // la bande, jamais la puce mise à l'échelle — la ligne ne respire donc jamais en largeur.
          <Box
            key={row.key}
            sx={{ position: 'relative', width: ACTIVE_DOT_SIZE, height: ACTIVE_DOT_SIZE, flexShrink: 0 }}
          >
            {row.classId ? (
              <Box title={row.name} sx={{ ...commonSx, bgcolor: alpha(row.profileColor, 0.16) }}>
                <ClassIcon classId={row.classId} size={Math.round(DOT_SIZE * 0.62)} />
              </Box>
            ) : (
              <Box
                title={row.name}
                sx={{
                  ...commonSx,
                  bgcolor: row.accentColor ?? row.profileColor,
                  color: 'rgba(255, 255, 255, 0.9)',
                }}
              >
                <PersonOutlineIcon sx={{ fontSize: DOT_SIZE * 0.62 }} />
              </Box>
            )}
          </Box>
        );
      })}
    </Stack>
  );
});

export function SheetInitiativeBar({
  campaignId,
  characterId,
  scrollTopButtonVisible = false,
}: {
  campaignId: string;
  /** Personnage propriétaire de cette fiche — distingue, dans le condensé replié, « c'est un tour » de « c'est MON tour » (pulsation). */
  characterId: string;
  /**
   * `ScrollToTopButton` est révélé par le même déclenchement de défilement que le sous-titre de
   * l'en-tête de la fiche (`scrolledPastHeader`) et partage le coin bas-droit du viewport avec ce
   * bandeau — quand il est affiché, la flèche de repli se décale à gauche pour ne pas s'empiler
   * dessous. Défaut à `false` (bandeau seul, flèche à l'extrême droite).
   */
  scrollTopButtonVisible?: boolean;
}) {
  const { charactersHydrated, campaignsLoading, initiativeRows, currentTurnKey, roundNumber } =
    useGmScreenCombat(campaignId, 'reader');
  const [collapsed, setCollapsed] = usePersistedBoolean(COLLAPSED_STORAGE_KEY, false);
  const barRef = useRef<HTMLDivElement | null>(null);
  // Ne pas décaler la flèche une fois le bandeau décollé du bas du viewport (fin de page) : le
  // bouton flottant reste fixe, lui, donc plus rien à esquiver à cet instant.
  const unstuck = useUnstuckFromViewportBottom(barRef, scrollTopButtonVisible);

  const loading = !charactersHydrated || campaignsLoading;
  if (loading || initiativeRows.length === 0) return null;

  const toggleLabel = collapsed ? "Déplier l'ordre d'initiative" : "Replier l'ordre d'initiative";
  const avoidScrollTopButton = scrollTopButtonVisible && !unstuck;
  // Condensé affiché UNIQUEMENT repli + combat COMMENCÉ (`currentTurnKey !== null`, cf. la
  // sémantique du bouton ⟳ de l'écran de MJ) : avant le premier tour, l'ordre n'a encore rien de
  // « courant » à mettre en évidence, la liste nue serait plus confuse qu'utile.
  const showCondensedOrder = collapsed && currentTurnKey !== null;
  // Calculée INCONDITIONNELLEMENT (pas seulement quand affichée) : le fondu de sortie a besoin des
  // dernières puces connues pendant sa transition, pas d'une liste déjà vidée.
  const visibleRows = initiativeRows.filter((r) => !r.hidden);

  return (
    <Box ref={barRef} sx={STICKY_SX}>
      {/* Bandeau ENTIÈREMENT cliquable (de « Ordre d'initiative » à l'extrême droite, au-delà même
          de la flèche) : un seul élément interactif, plus simple et plus généreux au clic/toucher
          qu'un bouton confiné à la seule icône. Pas d'effet de survol (`cursor: pointer` suffit à
          annoncer l'interactivité) ; le focus clavier garde un léger surlignage pour rester repérable. */}
      <Stack
        direction="row"
        role="button"
        tabIndex={0}
        onClick={() => setCollapsed(!collapsed)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setCollapsed(!collapsed);
          }
        }}
        aria-expanded={!collapsed}
        aria-label={toggleLabel}
        title={toggleLabel}
        sx={{
          alignItems: 'center',
          justifyContent: 'space-between',
          py: 0.75,
          cursor: 'pointer',
          outline: 'none',
          borderRadius: 1,
          '&:focus-visible': { bgcolor: 'rgba(255, 255, 255, 0.06)' },
        }}
      >
        <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', minWidth: 0, overflow: 'hidden' }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, flexShrink: 0 }}>
            Ordre d&apos;initiative
          </Typography>
          <Fade in={showCondensedOrder} unmountOnExit timeout={200}>
            <CondensedOrderDots rows={visibleRows} currentTurnKey={currentTurnKey} characterId={characterId} />
          </Fade>
        </Stack>
        <Box
          sx={{
            display: 'inline-flex',
            color: 'text.secondary',
            mr: avoidScrollTopButton ? SCROLL_TOP_BUTTON_CLEARANCE : 0,
            transition: 'margin-right 0.2s',
          }}
        >
          {collapsed ? (
            <KeyboardDoubleArrowUpIcon fontSize="small" />
          ) : (
            <KeyboardDoubleArrowDownIcon fontSize="small" />
          )}
        </Box>
      </Stack>
      {/* Pas de padding en bas (sous `Collapse`) : la bande colle directement contre le pied de
          page, dont la marge `mt` s'annule sur cette route (voir `FLUSH_FOOTER_ROUTES` dans
          `AppFooter`). */}
      <Collapse in={!collapsed} unmountOnExit>
        <InitiativeTracker
          rows={initiativeRows}
          currentTurnKey={currentTurnKey}
          onCurrentTurnKeyChange={noop}
          // Non affichée ici (en-tête masqué en projection) mais nécessaire : les compteurs de
          // tours des badges d'états (PER-305) s'en déduisent.
          roundNumber={roundNumber}
          projection
        />
      </Collapse>
    </Box>
  );
}
