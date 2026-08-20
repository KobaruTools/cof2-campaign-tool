'use client';

/**
 * Graphe des voies du personnage, affiché sous le bloc titre du wizard de montée
 * de niveau. Reprend le langage visuel de la démo « Montée de niveau » de la
 * vitrine (`LevelUpGridDemo`, carrés pleins, dégradé « métal précieux » pour la
 * voie de prestige, rang 1 en haut) — mais sur les VRAIES voies du personnage
 * (`pathColumns`, partagé avec `PathsMiniGrid` de `CharacterPreviewCard`) plutôt
 * que sur un personnage tiré au sort. S'anime donc EN DIRECT à mesure que le
 * joueur choisit ses capacités du niveau (le composant reçoit `working`, le
 * personnage « de travail » du wizard).
 *
 * Pleine largeur du wizard (≠ mini-grille compacte de `CharacterPreviewCard`) :
 * base volontairement simple pour l'instant (demande proprio), appelée à
 * recevoir d'autres fonctionnalités par la suite.
 *
 * Achat direct depuis la grille : la case VIDE qui suit immédiatement les cases
 * déjà remplies d'une voie ENTAMÉE (colonne existante = au moins un rang acquis)
 * est cliquable si sa capacité est acquérable ce niveau — même légalité que la
 * liste d'`AvailablePathGroup` (`available`, coût ≤ points restants, hors verrou
 * de la capacité divine). Les rangs plus loin dans la voie (au-delà du prochain)
 * restent inertes : ils ne sont légaux qu'une fois le rang intermédiaire acquis.
 *
 * Colonne de profil VIDE (aucune voie entamée) : la case du haut ouvre un popover
 * (`FeaturePathAutocomplete`, même sélecteur que le changement d'orientation) pour
 * CHOISIR quelle voie de profil démarrer — plusieurs candidates peuvent se
 * disputer une même case vide (jusqu'à 5 voies de profil, PER-186), d'où le choix
 * explicite plutôt qu'un achat à l'aveugle. `newPathOptions` porte les rangs 1 des
 * voies pas encore entamées (calculé par l'appelant, mêmes catégories que la liste
 * à plat du wizard — profil principal + profils déjà engagés, hors hybridation
 * masquée). Une fois choisie, la voie occupe la prochaine colonne libre (l'
 * emplacement n'est pas figé à l'avance, cf. `pathColumns`).
 */
import { useEffect, useRef, useState } from 'react';
import AddIcon from '@mui/icons-material/Add';
import LockIcon from '@mui/icons-material/Lock';
import TouchAppIcon from '@mui/icons-material/TouchApp';
import Box from '@mui/material/Box';
import GlobalStyles from '@mui/material/GlobalStyles';
import Popover from '@mui/material/Popover';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { featureById, pathById, progression } from '@/data';
import type { Feature } from '@/data/schema';
import { canAcquireFeature, featureCost } from '@/lib/engine';
import { borrowedFeaturesOf } from '@/lib/character/choices';
import { rulesContext } from '@/lib/character/rulesContext';
import type { Character } from '@/lib/character/types';
import { AncestryIcon } from '@/components/AncestryIcon';
import { AppTooltip } from '@/components/AppTooltip';
import { ClassIcon } from '@/components/ClassIcon';
import { PathCard } from '@/components/PathCard';
import { DeclinedFeatureName } from '@/components/sheet/FeatureDeclension';
import { FeaturePathAutocomplete } from '@/components/sheet/FeaturePathAutocomplete';
import { prestigeCategoryColor } from '@/lib/ui/classColors';
import { PATH_COLUMN_COUNT, PATH_RANK_COUNT, pathColumns, pathVisuals } from '@/lib/ui/pathColumns';

/** Écart entre les cases (px). */
const CELL_GAP = 3;
/**
 * Hauteur de l'en-tête (nom de voie) — réservée FIXE, même hors hover : sur 2 lignes
 * (`WebkitLineClamp`) plutôt qu'une seule tronquée, pour montrer les noms longs en
 * entier sans jamais faire bouger la grille en changeant de colonne survolée.
 */
const HEADER_HEIGHT = 34;
/** Colonnes de profil : ni peuple/mage (0), ni prestige (dernière). */
const isClassSlot = (columnIndex: number) => columnIndex >= 1 && columnIndex <= PATH_COLUMN_COUNT - 2;

/**
 * Apparition de l'en-tête de colonne au hover : la barre se déplie du bas vers le haut
 * (`scaleY`, origine `bottom`), icône + titre suivent en fondu + glissement depuis la
 * droite (`GlobalStyles` — injecté globalement, un `@keyframes` n'est pas exprimable
 * dans un `sx`, même patron que `LevelUpDialog`).
 */
const PATH_GRID_ANIMATIONS = `
  @keyframes pathHeaderBarGrowY {
    from { transform: scaleY(0); }
    to { transform: scaleY(1); }
  }
  @keyframes pathHeaderFadeInRight {
    from { opacity: 0; transform: translateX(8px); }
    to { opacity: 1; transform: translateX(0); }
  }
  @keyframes pathLongPressFill {
    from { transform: scaleX(0); }
    to { transform: scaleX(1); }
  }
  @keyframes pathInteractiveCtaPulse {
    /* 2 arrêts seulement (pas de palier à 50 %) : la boucle repart TOUJOURS de l'intérieur
       vers l'extérieur, jamais un aller-retour (rebond) — le saut au redémarrage (100 % →
       0 %, instantané) n'est pas perceptible car opacity y est déjà nulle. */
    0% { box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.45); }
    100% { box-shadow: 0 0 0 5px rgba(255, 255, 255, 0); }
  }
  @keyframes pathTutorialFinger {
    /* Centrage EXACT (horizontal ET vertical) via translate(-50%, -50%) — géré ici, jamais
       par un décalage en px/% deviné sur la taille de l'icône ou du rang ciblé (l'icône
       (44px) est de toute façon plus grande que la case : centrée, elle déborde déjà des
       deux côtés SANS décalage supplémentaire, quel que soit le rang démontré). calc()
       ajoute juste le petit mouvement de « pression » (translateY) par-dessus le -50 %. */
    0% { opacity: 0; transform: translate(-50%, calc(-50% - 6px)) scale(1); }
    10% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
    28% { opacity: 1; transform: translate(-50%, calc(-50% + 2px)) scale(0.88); }
    40% { opacity: 1; transform: translate(-50%, calc(-50% + 2px)) scale(0.88); }
    55% { opacity: 0; transform: translate(-50%, calc(-50% - 6px)) scale(1); }
    100% { opacity: 0; transform: translate(-50%, calc(-50% - 6px)) scale(1); }
  }
  @keyframes pathTutorialBarFill {
    0%, 10% { transform: scaleX(0); opacity: 1; }
    28%, 40% { transform: scaleX(1); opacity: 1; }
    55%, 100% { transform: scaleX(1); opacity: 0; }
  }
`;

/** Durée de l'appui long (tactile) pour sélectionner une case affordable, en ms. */
const LONG_PRESS_MS = 500;
/** Déplacement (px) au-delà duquel un appui tactile est traité comme un scroll, pas une tenue. */
const LONG_PRESS_MOVE_CANCEL_PX = 10;
/** Durée d'un cycle de la démo « doigt » (appui long) — boucle jusqu'à ce que le joueur le fasse lui-même. */
const TUTORIAL_LOOP_MS = 2600;
/** Clé localStorage : une fois l'appui long réussi une fois, la démo ne revient plus jamais. */
const LONG_PRESS_TUTORIAL_KEY = 'sheet:levelup-longpress-tutorial-seen';

export interface LevelUpPathsGridProps {
  character: Character;
  /** Capacités acquérables ce niveau (mêmes règles que la liste des voies disponibles). */
  available: Feature[];
  /** Points de capacité restants ce niveau — détermine si le prochain rang est abordable. */
  remaining: number;
  /** Verrou global (capacité divine prioritaire non résolue, p. 122) : rien n'est cliquable. */
  locked: boolean;
  /** Rangs 1 des voies de profil pas encore entamées — candidates du popover « nouvelle voie ». */
  newPathOptions: string[];
  /** Ordre de priorité (ids de voie) du popover — profil principal → engagés → hybrides par famille. */
  newPathOrder: string[];
  /** Autorisation EFFECTIVE des armes à feu (règle campagne ∧ choix perso, PER-185) — même valeur que celle qui a produit `available`, pour que le motif du cadenas reste cohérent avec la légalité réelle. */
  firearmsAllowed: boolean;
  /** Achète le rang suivant d'une voie entamée, ou le rang 1 d'une voie nouvellement choisie. */
  onSelect: (featureId: string) => void;
}

export function LevelUpPathsGrid({
  character,
  available,
  remaining,
  locked,
  newPathOptions,
  newPathOrder,
  firearmsAllowed,
  onSelect,
}: LevelUpPathsGridProps) {
  const columns = pathColumns(character);
  // Une seule colonne vide ouvre le popover « nouvelle voie » à la fois — la plus à
  // gauche — pour ne pas éparpiller le bouton « + » sur plusieurs colonnes de profil
  // vides simultanément. Sans objet pour la voie de PRESTIGE (dernière colonne, hors
  // `isClassSlot`) : ses propres règles d'éligibilité vivent ailleurs (liste avancée),
  // pas dans `newPathOptions`/ce popover.
  const firstEmptyClassSlot = columns.findIndex((c, i) => !c && isClassSlot(i));
  const availableIds = new Set(available.map((f) => f.id));
  const [pickerAnchor, setPickerAnchor] = useState<HTMLElement | null>(null);
  // BUG corrigé : le rang 1 d'une nouvelle voie (p. 39, coûte toujours 1 point) n'était
  // jamais confronté à `remaining` — le popover restait ouvrable (et le choix accepté)
  // même à 0 point restant, d'où un dépassement de budget silencieux.
  const canPickNewPath = !locked && remaining > 0 && newPathOptions.length > 0;
  const [hoveredColumn, setHoveredColumn] = useState<number | null>(null);
  // Aperçu déployé (mobile) : clic sur une case (acquise ou non) — réutilise `PathCard`
  // en lecture seule (`selectable={false}`, pas de case à cocher). La case reste le SEUL
  // moyen de sélectionner ; l'aperçu ne fait qu'informer. `color`/`gradient` capturent le
  // rendu EXACT de la case cliquée (celui de `rankColors`, qui tient compte d'un éventuel
  // emprunt de capacité — PER-120 — donc potentiellement différent de la teinte générique
  // de la voie) ; `filled` distingue un rang déjà acquis (couleur figée à respecter tel
  // quel) d'un rang pas encore acquis (aucune entrée dans `rankColors`, repli sur la teinte
  // générique de la voie, prestige compris, au rendu).
  const [preview, setPreview] = useState<
    { featureId: string; filled: boolean; color?: string; gradient: boolean } | null
  >(null);
  // Appui long tactile (case affordable) : seul geste qui sélectionne au toucher, la souris
  // continue de sélectionner au simple clic (le survol distingue déjà regarder/valider).
  // `pointerTypeRef` mémorise le type du dernier pointeur pour que l'`onClick` (souris)
  // s'efface quand la séquence vient du tactile (déjà traitée par les gestionnaires pointer).
  const pointerTypeRef = useRef<'mouse' | 'touch' | 'pen'>('mouse');
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressStartRef = useRef<{ x: number; y: number } | null>(null);
  const longPressFiredRef = useRef(false);
  const [pressedCell, setPressedCell] = useState<{ column: number; row: number } | null>(null);
  const clearLongPress = () => {
    if (longPressTimerRef.current != null) clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = null;
    longPressStartRef.current = null;
    setPressedCell(null);
  };
  // Démo « doigt » de l'appui long tactile : tant que le joueur ne l'a jamais fait
  // lui-même (flag localStorage), un doigt se pose en boucle sur la 1ère case
  // sélectionnable et se remplit comme un vrai appui — seul indice que le geste existe.
  // Lu après montage (pas au premier rendu serveur) pour éviter tout flash d'hydratation.
  const [isCoarsePointer, setIsCoarsePointer] = useState(false);
  const [tutorialSeen, setTutorialSeen] = useState(true);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    // Synchronisation ponctuelle depuis des systèmes externes (matchMedia/localStorage)
    // après le montage, pour ne pas décaler le rendu SSR/CSR — pas une boucle de rendu
    // (même patron que `usePersistentBoolean`).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsCoarsePointer(window.matchMedia('(pointer: coarse)').matches);
    setTutorialSeen(window.localStorage.getItem(LONG_PRESS_TUTORIAL_KEY) != null);
  }, []);
  const markTutorialSeen = () => {
    if (typeof window !== 'undefined') window.localStorage.setItem(LONG_PRESS_TUTORIAL_KEY, '1');
    setTutorialSeen(true);
  };
  // Toutes les cases réellement cliquables ce niveau, colonne par colonne (au plus une
  // par colonne — le prochain rang affordable, ou la case « + nouvelle voie » pour
  // `firstEmptyClassSlot`) : la démo tourne entre elles plutôt que de figer toujours la
  // même — même ordre gauche→droite que l'achat direct.
  const interactiveCells = (() => {
    const cells: { column: number; row: number }[] = [];
    for (let c = 0; c < PATH_COLUMN_COUNT; c += 1) {
      const column = columns[c];
      if (column) {
        const rowIndex = column.rankColors.length;
        const feature = column.features[rowIndex];
        if (feature && availableIds.has(feature.id) && !locked && featureCost(feature, progression) <= remaining) {
          cells.push({ column: c, row: rowIndex });
        }
      } else if (canPickNewPath && c === firstEmptyClassSlot) {
        cells.push({ column: c, row: 0 });
      }
    }
    return cells;
  })();
  // Index (rotatif) de la case démontrée dans `interactiveCells` — avance tout seul en
  // boucle, un cran par cycle de démo (`TUTORIAL_LOOP_MS`), tant que la démo est due.
  const [demoCellIndex, setDemoCellIndex] = useState(0);
  useEffect(() => {
    if (!isCoarsePointer || tutorialSeen) return;
    const id = setInterval(() => setDemoCellIndex((i) => i + 1), TUTORIAL_LOOP_MS);
    return () => clearInterval(id);
  }, [isCoarsePointer, tutorialSeen]);
  const demoTargetCell =
    interactiveCells.length > 0 ? interactiveCells[demoCellIndex % interactiveCells.length] : null;
  // Reste affiché même colonne ouverte (tap qui étend) — seul le flag persisté (appui
  // long déjà réussi une fois) l'arrête pour de bon. Coupé UNIQUEMENT le temps d'un vrai
  // appui en cours sur cette case précise (sinon la barre réelle et celle de la démo se
  // superposent visuellement sur la même case).
  const showDemoTutorial =
    isCoarsePointer &&
    !tutorialSeen &&
    !!demoTargetCell &&
    !(pressedCell && pressedCell.column === demoTargetCell.column && pressedCell.row === demoTargetCell.row);
  // Hauteur de case FIGÉE (calculée sur la largeur totale de la grille, pas sur celle,
  // variable, de la colonne survolée) : le hover ne doit élargir que la largeur, jamais
  // la hauteur — un `aspectRatio` sur la case aurait fait grandir les deux de concert.
  const gridRef = useRef<HTMLDivElement>(null);
  const [cellHeight, setCellHeight] = useState<number | null>(null);
  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;
    const measure = () => {
      const totalGap = CELL_GAP * (PATH_COLUMN_COUNT - 1);
      const columnWidth = (el.clientWidth - totalGap) / PATH_COLUMN_COUNT;
      setCellHeight((columnWidth * 2) / 3);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <Box sx={{ width: '100%' }}>
      <GlobalStyles styles={PATH_GRID_ANIMATIONS} />
      <Box
        ref={gridRef}
        sx={{
          display: 'flex',
          gap: `${CELL_GAP}px`,
          width: '100%',
        }}
      >
      {Array.from({ length: PATH_COLUMN_COUNT }, (_, columnIndex) => {
        const column = columns[columnIndex];
        const isHovered = hoveredColumn === columnIndex;
        // Habillage du nom de voie en en-tête : même langage que le titre de voie de la
        // liste avancée (`AvailablePathGroup` / groupe « Capacités sélectionnées » plus
        // haut dans ce fichier) — barre verticale à gauche + icône de profil/peuple/
        // prestige, teinte de famille (or pour les voies de prestige génériques).
        const { color: titleColor, classId, ancestryId } = pathVisuals(column?.path, character.classId);
        // Colonne vide qui ne peut RIEN recevoir ce niveau (ni la « + nouvelle voie » —
        // réservée à `firstEmptyClassSlot` — ni la voie de prestige, jamais choisissable
        // depuis cette grille) : ni expansion au survol/tap, ni pulse, atténuée en permanence
        // (opacité) — même règle et même style des deux côtés (souris ET tactile), rien à y
        // faire ne doit pas attirer l'œil pour rien.
        const isReceivableEmptyColumn = !column && columnIndex === firstEmptyClassSlot && canPickNewPath;
        const isInertColumn = !column && !isReceivableEmptyColumn;
        return (
          <Box
            key={columnIndex}
            onMouseEnter={() => {
              // Certains navigateurs/émulateurs tactiles synthétisent un `mouseenter` après le
              // 1er tap — sans ce garde-fou, une colonne vide inerte s'ouvrirait quand même via
              // ce `mouseenter` fantôme, en contournant le blocage posé côté `onPointerUp`.
              if (isInertColumn) return;
              setHoveredColumn(columnIndex);
            }}
            onMouseLeave={() => {
              // Popover « nouvelle voie » ouvert sur cette colonne (seule à pouvoir l'ouvrir,
              // `firstEmptyClassSlot`) : ne PAS réduire la colonne pendant que le joueur
              // choisit dans le popover, sinon la souris qui va vers le popover (hors de la
              // grille) referme la colonne sous ses pieds.
              if (pickerAnchor && columnIndex === firstEmptyClassSlot) return;
              setHoveredColumn(null);
            }}
            sx={{
              position: 'relative',
              flex: isHovered ? '2.5 1 0' : '1 1 0',
              minWidth: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: `${CELL_GAP}px`,
              transition: 'flex 200ms ease, opacity 200ms ease',
              zIndex: isHovered ? 1 : 0,
              opacity: isInertColumn ? 0.45 : 1,
            }}
          >
            <Box sx={{ position: 'relative', height: HEADER_HEIGHT, overflow: 'hidden' }}>
              {isHovered && column && (
                <Box
                  sx={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: '3px',
                    background: titleColor ?? 'divider',
                    transformOrigin: 'bottom',
                    animation: 'pathHeaderBarGrowY 200ms ease-out both',
                    '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
                  }}
                />
              )}
              {isHovered && column && (
                <Stack
                  direction="row"
                  spacing={0.5}
                  sx={{
                    height: '100%',
                    alignItems: 'flex-start',
                    pl: 0.75,
                    pt: '1px',
                    animation: 'pathHeaderFadeInRight 220ms ease-out 60ms both',
                    '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
                  }}
                >
                  {classId && (
                    <ClassIcon classId={classId} size={16} sx={{ color: titleColor ?? undefined, flexShrink: 0 }} />
                  )}
                  {!classId && ancestryId && (
                    <AncestryIcon ancestryId={ancestryId} size={16} sx={{ color: titleColor ?? 'text.secondary', flexShrink: 0 }} />
                  )}
                  <Typography
                    variant="caption"
                    sx={{
                      fontWeight: 600,
                      fontSize: 13,
                      lineHeight: 1.2,
                      color: titleColor ?? 'text.primary',
                      // Nom complet sur 2 lignes plutôt que tronqué (1 ligne) — hauteur bornée par
                      // `HEADER_HEIGHT` (fixe, cf. plus haut) pour ne jamais faire bouger la grille.
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'normal',
                    }}
                  >
                    {column.name}
                  </Typography>
                </Stack>
              )}
            </Box>
            {Array.from({ length: PATH_RANK_COUNT }, (_, rowIndex) => {
              const filled = !!column && rowIndex < column.rankColors.length;
              const color = column?.rankColors[rowIndex];
              const feature = column?.features[rowIndex];
              // Prochain rang ouvrable de la voie : la case juste après les rangs acquis.
              const isNextOpen = !!column && rowIndex === column.rankColors.length && !!feature;
              const acquirable = isNextOpen && !!feature && availableIds.has(feature.id) && !locked;
              const cost = feature ? featureCost(feature, progression) : 0;
              const affordable = acquirable && cost <= remaining;
              // Prochain rang illégal (pas seulement à court de points, cf. `affordable`
              // ci-dessus) — ex. rang trop élevé pour le niveau courant (p. 39), voie de
              // prestige pas encore accessible (p. 42) ou seconde voie de prestige (une
              // seule sur la carrière). Calculé seulement pour la case « prochain rang »
              // (une par colonne max) : jamais pour un rang déjà acquis ou hors de portée.
              const blockedReasons =
                isNextOpen && feature && !availableIds.has(feature.id)
                  ? canAcquireFeature(character, feature.id, rulesContext, firearmsAllowed).reasons
                  : [];
              // Page source du motif : table « Rang / Niveau requis » (p. 39) en général,
              // ou table dédiée « Voies de prestige – niveau requis » (p. 42, confirmée p. 128)
              // quand le rang bloqué appartient lui-même à une voie de prestige.
              const blockedReasonsPage = column?.path?.type === 'prestige' ? '42, 128' : 39;
              // Case du haut d'une colonne de profil VIDE : déclenche le popover de choix
              // de voie plutôt qu'un achat direct (plusieurs candidates possibles).
              const isNewPathSlot = !column && rowIndex === 0 && columnIndex === firstEmptyClassSlot;
              // Une voie de prestige remplit la case d'un DÉGRADÉ (`linear-gradient(...)`) plutôt
              // qu'une teinte plate — `alpha()` ne sait pas le parser, donc le liseré comme
              // l'atténuation de la teinte passent par une détection de préfixe plutôt qu'un helper
              // de couleur commun.
              const isGradientFill = filled && !!color && color.startsWith('linear-gradient');
              // Case réellement cliquable ce niveau (achat direct OU « + nouvelle voie ») —
              // seule cible du pulse d'incitation ci-dessous.
              const isInteractiveCta = affordable || (isNewPathSlot && canPickNewPath);
              return (
                <Box
                  key={rowIndex}
                  onClick={(e) => {
                    // Séquence tactile : déjà traitée par les gestionnaires pointer ci-dessous
                    // (sélection à l'appui long, jamais au clic synthétique qui suit le tap).
                    if (pointerTypeRef.current === 'touch') return;
                    // Mobile (pas de hover) : le 1er tap dans la colonne l'étend seulement — il
                    // faut un 2ᵉ tap, sur la case déjà visible en grand, pour sélectionner. Sur
                    // desktop la souris a déjà survolé (donc étendu) avant le clic, donc invisible.
                    if (!isHovered) {
                      setHoveredColumn(columnIndex);
                      return;
                    }
                    if (feature) setPreview({ featureId: feature.id, filled, color, gradient: isGradientFill });
                    if (affordable) {
                      markTutorialSeen();
                      onSelect(feature!.id);
                    } else if (isNewPathSlot && canPickNewPath) setPickerAnchor(e.currentTarget);
                  }}
                  onPointerDown={(e) => {
                    pointerTypeRef.current = e.pointerType as 'mouse' | 'touch' | 'pen';
                    if (e.pointerType !== 'touch') return;
                    // Appelé ICI (pointerdown), pas juste sur `contextmenu` : c'est ce
                    // `preventDefault` qui, selon le spec Pointer Events, supprime le menu
                    // contextuel natif déclenché par le navigateur après un appui tenu — le
                    // seul `onContextMenu` ne suffit pas à l'empêcher.
                    e.preventDefault();
                    longPressFiredRef.current = false;
                    longPressStartRef.current = { x: e.clientX, y: e.clientY };
                    const target = e.currentTarget;
                    if (affordable) {
                      setPressedCell({ column: columnIndex, row: rowIndex });
                      longPressTimerRef.current = setTimeout(() => {
                        longPressFiredRef.current = true;
                        setPressedCell(null);
                        markTutorialSeen();
                        onSelect(feature!.id);
                      }, LONG_PRESS_MS);
                    } else if (isNewPathSlot && canPickNewPath) {
                      // Même geste que l'achat d'un rang : la case « + nouvelle voie » ouvre le
                      // popover à l'appui long au tactile aussi, pas au tap court (cohérence du
                      // seul geste qui « valide » sur ce périphérique).
                      setPressedCell({ column: columnIndex, row: rowIndex });
                      longPressTimerRef.current = setTimeout(() => {
                        longPressFiredRef.current = true;
                        setPressedCell(null);
                        markTutorialSeen();
                        setPickerAnchor(target);
                      }, LONG_PRESS_MS);
                    }
                  }}
                  onPointerMove={(e) => {
                    if (e.pointerType !== 'touch' || !longPressStartRef.current) return;
                    const dx = e.clientX - longPressStartRef.current.x;
                    const dy = e.clientY - longPressStartRef.current.y;
                    if (Math.hypot(dx, dy) > LONG_PRESS_MOVE_CANCEL_PX) clearLongPress();
                  }}
                  onPointerUp={(e) => {
                    if (e.pointerType !== 'touch') return;
                    const fired = longPressFiredRef.current;
                    clearLongPress();
                    if (fired) return;
                    // Tap court (relâché avant la fin de l'appui long) : étend la colonne (si pas
                    // déjà fait ET qu'il y a quelque chose à y voir/faire — `isInertColumn`, même
                    // règle que le survol souris) et affiche l'aperçu — ne sélectionne/n'ouvre
                    // JAMAIS le popover au tactile (réservé à l'appui long, cf. `onPointerDown`).
                    if (!isHovered && !isInertColumn) setHoveredColumn(columnIndex);
                    if (feature) setPreview({ featureId: feature.id, filled, color, gradient: isGradientFill });
                  }}
                  onPointerCancel={clearLongPress}
                  onContextMenu={(e) => e.preventDefault()}
                  sx={{
                    position: 'relative',
                    overflow: 'hidden',
                    width: '100%',
                    height: cellHeight ? `${cellHeight}px` : undefined,
                    aspectRatio: cellHeight ? undefined : '3 / 2',
                    borderRadius: '2px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    touchAction: 'manipulation',
                    WebkitTouchCallout: 'none',
                    userSelect: 'none',
                    background: filled && color ? undefined : 'rgba(255, 255, 255, 0.05)',
                    border: filled && color ? 'none' : '1px solid rgba(255, 255, 255, 0.12)',
                    ...(filled &&
                      color &&
                      (isGradientFill
                        ? {
                            // Liseré en dégradé (technique mask-composite, respecte le border-radius —
                            // cf. `prestigeStaticBorderSx`) : reprend TEL QUEL le dégradé du remplissage,
                            // pour rester en phase avec la teinte de la case (famille ou or générique).
                            '&::before': {
                              content: '""',
                              position: 'absolute',
                              inset: 0,
                              borderRadius: '2px',
                              padding: '1px',
                              background: color,
                              WebkitMask: 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
                              WebkitMaskComposite: 'xor',
                              maskComposite: 'exclude',
                              pointerEvents: 'none',
                            },
                          }
                        : { border: `1px solid ${color}` })),
                    // Tap mobile sans colonne étendue : ni le flash de survol (`:hover` collant sur
                    // tactile) ni le halo bleu par défaut du navigateur (`-webkit-tap-highlight-
                    // color`) — le 1er tap ne fait qu'étendre, il ne doit pas se donner l'air d'agir.
                    WebkitTapHighlightColor: 'transparent',
                    ...(isInteractiveCta && {
                      border: '1px dashed rgba(255, 255, 255, 0.5)',
                      ...(isHovered && { '&:hover': { background: 'rgba(255, 255, 255, 0.16)' } }),
                      // Pulse d'incitation : même gating que la démo « doigt » (`tutorialSeen`,
                      // flag localStorage `LONG_PRESS_TUTORIAL_KEY`) — une fois qu'un joueur a
                      // choisi au moins un rang (souris ou tactile, `markTutorialSeen` posé sur
                      // les 3 chemins de sélection), plus besoin d'attirer l'œil, il a compris.
                      ...(!tutorialSeen && {
                        animation: 'pathInteractiveCtaPulse 2000ms ease-out infinite',
                        '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
                      }),
                    }),
                    cursor: isInteractiveCta ? 'pointer' : column ? 'help' : 'default',
                    transition: 'background 150ms',
                  }}
                >
                  {filled && color && (
                    // Remplissage de la case atténué de 25 % (meilleure lisibilité du texte/liseré
                    // au hover) — calque séparé plutôt qu'`alpha()` sur `color` pour rester valable
                    // aussi bien sur une teinte plate que sur le dégradé de prestige.
                    <Box sx={{ position: 'absolute', inset: 0, background: color, opacity: 0.5625 }} />
                  )}
                  {pressedCell?.column === columnIndex && pressedCell?.row === rowIndex && (
                    // Feedback de remplissage progressif de l'appui long — seul indice que le geste
                    // existe (sinon non découvrable) : barre qui se remplit de gauche à droite sur
                    // la durée exacte de `LONG_PRESS_MS`, annulée (démontée) si le doigt bouge/relâche.
                    <Box
                      sx={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        bottom: 0,
                        width: '100%',
                        transformOrigin: 'left',
                        background: 'rgba(255, 255, 255, 0.35)',
                        animation: `pathLongPressFill ${LONG_PRESS_MS}ms linear forwards`,
                        pointerEvents: 'none',
                        '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
                      }}
                    />
                  )}
                  {blockedReasons.length > 0 && (
                    // Cadenas du prochain rang illégal (niveau/voie de prestige, cf.
                    // `blockedReasons`) — toujours visible (même colonne réduite), au survol
                    // l'infobulle cite le motif exact renvoyé par `canAcquireFeature`.
                    <AppTooltip title={blockedReasons.join(' ')} page={blockedReasonsPage} enterDelay={150}>
                      <Box
                        sx={{
                          position: 'absolute',
                          top: 2,
                          right: 2,
                          zIndex: 2,
                          display: 'flex',
                          color: 'rgba(255, 255, 255, 0.55)',
                          cursor: 'help',
                        }}
                      >
                        <LockIcon sx={{ fontSize: 16 }} />
                      </Box>
                    </AppTooltip>
                  )}
                  {isNewPathSlot && canPickNewPath && (
                    <AddIcon sx={{ position: 'relative', zIndex: 1, fontSize: 14, color: 'rgba(255, 255, 255, 0.5)' }} />
                  )}
                  {isNewPathSlot && canPickNewPath && (
                    <Typography
                      noWrap
                      variant="caption"
                      sx={{
                        position: 'relative',
                        zIndex: 1,
                        fontSize: 12,
                        color: 'rgba(255, 255, 255, 0.5)',
                        pl: isHovered ? 0.5 : 0,
                        // `maxWidth: 0` hors hover plutôt que la seule opacité : le texte invisible
                        // gardait sinon sa largeur pleine (ligne, pas de `noWrap` sur l'espace occupé),
                        // ce qui décalait le « + » hors du centre de la case dès qu'il était monté.
                        maxWidth: isHovered ? 160 : 0,
                        overflow: 'hidden',
                        // Même stagger fondu + glissement que le nom de rang ci-dessous (case
                        // unique, delai nul) — cohérence de l'apparition/disparition au hover.
                        opacity: isHovered ? 1 : 0,
                        transform: isHovered ? 'translateX(0)' : 'translateX(6px)',
                        transition: 'opacity 160ms ease, transform 160ms ease, max-width 160ms ease, padding-left 160ms ease',
                        '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
                      }}
                    >
                      Ajouter une voie
                    </Typography>
                  )}
                  {feature && (
                    <Typography
                      variant="caption"
                      sx={{
                        position: 'relative',
                        zIndex: 1,
                        fontWeight: 700,
                        fontSize: 12,
                        lineHeight: 1.15,
                        color: '#fff',
                        // Retour à la ligne (2 lignes max) plutôt que tronqué sur une seule — la
                        // hauteur de la case est FIGÉE (`cellHeight`, mesurée sur la largeur totale
                        // de la grille), donc ce wrap ne la fait jamais bouger.
                        whiteSpace: 'normal',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        // Rang ni acquis (`filled`) ni réellement sélectionnable ce niveau
                        // (`affordable` — légal ET coût couvert par les points restants) : nom
                        // à moitié effacé, pour ne pas concurrencer les rangs qui comptent.
                        opacity: isHovered ? (filled || affordable ? 1 : 0.5) : 0,
                        // Stagger rapide (fondu + glissement depuis la droite) par rang, dans les
                        // deux sens : entrée au survol ET sortie (délai identique) plutôt qu'un
                        // montage/démontage conditionnel, qui n'aurait animé que l'apparition.
                        transform: isHovered ? 'translateX(0)' : 'translateX(6px)',
                        transition: `opacity 160ms ease ${rowIndex * 70}ms, transform 160ms ease ${rowIndex * 70}ms`,
                        '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
                        textShadow: '0 1px 2px rgba(0, 0, 0, 0.6)',
                        width: '100%',
                        px: 0.75,
                        textAlign: 'left',
                        pointerEvents: 'none',
                      }}
                    >
                      {feature.name}
                    </Typography>
                  )}
                </Box>
              );
            })}
            {showDemoTutorial && demoTargetCell?.column === columnIndex && cellHeight != null && (
              // Rendu au niveau COLONNE (jamais dans la case, `overflow: hidden`) : seule la
              // barre de remplissage reste bornée à la case, le doigt peut la déborder pour
              // ressembler à un vrai doigt qui appuie dessus plutôt qu'une icône encastrée.
              <Box
                sx={{
                  position: 'absolute',
                  left: 0,
                  width: '100%',
                  top: HEADER_HEIGHT + CELL_GAP + demoTargetCell.row * (cellHeight + CELL_GAP),
                  height: cellHeight,
                  pointerEvents: 'none',
                  zIndex: 3,
                }}
              >
                <Box sx={{ position: 'absolute', inset: 0, overflow: 'hidden', borderRadius: '2px' }}>
                  <Box
                    sx={{
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      bottom: 0,
                      width: '100%',
                      transformOrigin: 'left',
                      background: 'rgba(255, 255, 255, 0.35)',
                      animation: `pathTutorialBarFill ${TUTORIAL_LOOP_MS}ms ease-in-out infinite`,
                      '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
                    }}
                  />
                </Box>
                {/* Doigt qui appuie — centré sur la case, déborde des deux côtés (icône plus
                    grande que la case, jamais un décalage arbitraire) pour rester visible et
                    juste même sur une case minuscule, quel que soit le rang démontré ; seul
                    indice que le geste « maintenir » existe. */}
                <TouchAppIcon
                  sx={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    // Repli SANS animation (ci-dessous) : `transform` reste posé ici (jamais dans
                    // le bloc reduced-motion, qui ne coupe QUE `animation`) — sinon le doigt perd
                    // son centrage `translate(-50%, -50%)` dès que l'animation est coupée.
                    transform: 'translate(-50%, -50%) scale(1)',
                    opacity: 1,
                    fontSize: 44,
                    color: '#fff',
                    filter: 'drop-shadow(0 1px 3px rgba(0, 0, 0, 0.7))',
                    animation: `pathTutorialFinger ${TUTORIAL_LOOP_MS}ms ease-in-out infinite`,
                    '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
                  }}
                />
              </Box>
            )}
          </Box>
        );
      })}
      </Box>

      {preview &&
        (() => {
          const feature = featureById.get(preview.featureId);
          const path = feature ? pathById.get(feature.pathId) : undefined;
          if (!feature) return null;
          const visuals = pathVisuals(path, character.classId);
          // Rang déjà acquis : couleur EXACTE de la case (celle de `rankColors`, qui prend en
          // compte un éventuel emprunt de capacité) — jamais la teinte générique de la voie,
          // qui se tromperait sur un rang emprunté. Rang pas encore acquis : aucune couleur de
          // case n'existe, repli sur la teinte générique (dégradé prestige compris).
          const isPrestigeCard = preview.filled ? preview.gradient : visuals.isPrestige;
          const cardColor = preview.filled ? (preview.gradient ? undefined : preview.color) : visuals.color;
          // Teinte de la bande titre (voie) : catégorie de prestige (comme le groupe « Capacités
          // sélectionnées » de `LevelUpDialog`), sinon la même couleur que le cadre de la carte.
          const bannerColor =
            path?.type === 'prestige' ? prestigeCategoryColor(path.category) : cardColor;
          const cost = featureCost(feature, progression);
          return (
            <Box sx={{ width: '100%', mt: 1 }}>
              {/* Bandeau de voie, même patron que l'en-tête de groupe « Capacités
                  sélectionnées » (`LevelUpDialog`) — liseré gauche + icône + nom coloré. */}
              <Stack
                direction="row"
                spacing={0.75}
                sx={{ alignItems: 'center', borderLeft: 3, borderColor: bannerColor ?? 'divider', pl: 1.5, mb: 0.75 }}
              >
                {visuals.classId ? (
                  <ClassIcon classId={visuals.classId} size={18} sx={{ color: bannerColor ?? undefined, flexShrink: 0 }} />
                ) : (
                  visuals.ancestryId && (
                    <AncestryIcon ancestryId={visuals.ancestryId} size={18} sx={{ color: 'text.secondary', flexShrink: 0 }} />
                  )
                )}
                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: bannerColor ?? 'text.primary' }}>
                  {path?.name ?? feature.pathId}
                </Typography>
              </Stack>
              <PathCard
                name={<DeclinedFeatureName feature={feature} />}
                term={feature.name}
                color={cardColor}
                classId={visuals.classId}
                ancestryId={visuals.ancestryId}
                prestige={isPrestigeCard}
                prestigeTint={isPrestigeCard ? visuals.prestigeTint : undefined}
                checked
                selectable={false}
                defaultExpanded
                repeatFeatureName={false}
                rankLabel={`Rang ${feature.rank} — ${cost} point${cost > 1 ? 's' : ''}`}
                sourcePage={path?.sourcePage}
                feature={feature}
                abilities={character.abilities}
                level={character.level}
              />
              {/* Capacité(s) EMPRUNTÉE(s) par un choix `feature-from-path` déjà résolu (PER-120,
                  ex. Combattant aguerri) ou un octroi fixe (PER-323, cambion) — une carte de plus
                  par emprunt, sous la carte de la voie hôte, même patron de bandeau. Sans effet
                  sur un rang pas encore acquis (le choix n'existe pas encore). */}
              {borrowedFeaturesOf(character, feature).map((borrowed) => {
                const borrowedPath = pathById.get(borrowed.pathId);
                const borrowedVisuals = pathVisuals(borrowedPath, character.classId);
                const borrowedBannerColor =
                  borrowedPath?.type === 'prestige'
                    ? prestigeCategoryColor(borrowedPath.category)
                    : borrowedVisuals.color;
                return (
                  <Box key={borrowed.id} sx={{ width: '100%', mt: 1 }}>
                    <Stack
                      direction="row"
                      spacing={0.75}
                      sx={{ alignItems: 'center', borderLeft: 3, borderColor: borrowedBannerColor ?? 'divider', pl: 1.5, mb: 0.75 }}
                    >
                      {borrowedVisuals.classId ? (
                        <ClassIcon
                          classId={borrowedVisuals.classId}
                          size={18}
                          sx={{ color: borrowedBannerColor ?? undefined, flexShrink: 0 }}
                        />
                      ) : (
                        borrowedVisuals.ancestryId && (
                          <AncestryIcon
                            ancestryId={borrowedVisuals.ancestryId}
                            size={18}
                            sx={{ color: 'text.secondary', flexShrink: 0 }}
                          />
                        )
                      )}
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, color: borrowedBannerColor ?? 'text.primary' }}>
                        Capacité empruntée — {borrowedPath?.name ?? borrowed.pathId}
                      </Typography>
                    </Stack>
                    <PathCard
                      name={<DeclinedFeatureName feature={borrowed} />}
                      term={borrowed.name}
                      color={borrowedVisuals.color}
                      classId={borrowedVisuals.classId}
                      ancestryId={borrowedVisuals.ancestryId}
                      prestige={borrowedVisuals.isPrestige}
                      prestigeTint={borrowedVisuals.isPrestige ? borrowedVisuals.prestigeTint : undefined}
                      checked
                      selectable={false}
                      defaultExpanded
                      repeatFeatureName={false}
                      rankLabel={`Rang ${borrowed.rank} de « ${borrowedPath?.name ?? borrowed.pathId} »`}
                      sourcePage={borrowedPath?.sourcePage}
                      feature={borrowed}
                      abilities={character.abilities}
                      level={character.level}
                    />
                  </Box>
                );
              })}
            </Box>
          );
        })()}

      <Popover
        open={!!pickerAnchor}
        anchorEl={pickerAnchor}
        onClose={() => setPickerAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Box sx={{ p: 1.5, width: 320 }}>
          <FeaturePathAutocomplete
            options={newPathOptions}
            pathOrder={newPathOrder}
            value={null}
            onChange={(id) => {
              // Filet de sécurité : le popover ne s'ouvre normalement plus à 0 point restant
              // (`canPickNewPath`), mais il peut rester ouvert d'un rendu précédent pendant
              // qu'un autre clic vient d'épuiser `remaining` — recontrôlé ici avant d'ajouter.
              const feature = id ? featureById.get(id) : undefined;
              if (feature && featureCost(feature, progression) <= remaining) {
                markTutorialSeen();
                onSelect(id!);
              }
              setPickerAnchor(null);
            }}
            label="Nouvelle voie de profil"
          />
        </Box>
      </Popover>
    </Box>
  );
}
