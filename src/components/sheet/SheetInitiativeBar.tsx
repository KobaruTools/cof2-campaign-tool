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
import { useEffect, useRef, useState } from 'react';
import KeyboardDoubleArrowDownIcon from '@mui/icons-material/KeyboardDoubleArrowDown';
import KeyboardDoubleArrowUpIcon from '@mui/icons-material/KeyboardDoubleArrowUp';
import Box from '@mui/material/Box';
import Collapse from '@mui/material/Collapse';
import Fade from '@mui/material/Fade';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { CondensedOrderDots, InitiativeTracker } from '@/components/campaign/InitiativeTracker';
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

// `CondensedOrderDots` (puces de profil ultra condensées, avec pulsation « c'est MON tour ») vit
// désormais dans `InitiativeTracker.tsx`, PARTAGÉE avec le repli de l'écran de MJ (nouvelle
// demande) — importée plus haut, ne pas la redéfinir ici.

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
          page, qui ne porte aucune marge haute (cf. `AppFooter`). */}
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
