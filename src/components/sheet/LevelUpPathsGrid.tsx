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
import Box from '@mui/material/Box';
import GlobalStyles from '@mui/material/GlobalStyles';
import Popover from '@mui/material/Popover';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { featureById, progression } from '@/data';
import type { Feature } from '@/data/schema';
import { featureCost } from '@/lib/engine';
import type { Character } from '@/lib/character/types';
import { AncestryIcon } from '@/components/AncestryIcon';
import { ClassIcon } from '@/components/ClassIcon';
import { FeaturePathAutocomplete } from '@/components/sheet/FeaturePathAutocomplete';
import { prestigeCategoryColor } from '@/lib/ui/classColors';
import { PATH_COLUMN_COUNT, PATH_RANK_COUNT, pathColor, pathColumns } from '@/lib/ui/pathColumns';

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
`;

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
    <Box
      ref={gridRef}
      sx={{
        display: 'flex',
        gap: `${CELL_GAP}px`,
        width: '100%',
      }}
    >
      <GlobalStyles styles={PATH_GRID_ANIMATIONS} />
      {Array.from({ length: PATH_COLUMN_COUNT }, (_, columnIndex) => {
        const column = columns[columnIndex];
        const isHovered = hoveredColumn === columnIndex;
        // Habillage du nom de voie en en-tête : même langage que le titre de voie de la
        // liste avancée (`AvailablePathGroup` / groupe « Capacités sélectionnées » plus
        // haut dans ce fichier) — barre verticale à gauche + icône de profil/peuple/
        // prestige, teinte de famille (or pour les voies de prestige génériques).
        const prestigePath = column?.path?.type === 'prestige' ? column.path : undefined;
        const titleColor = prestigePath
          ? prestigeCategoryColor(prestigePath.category)
          : column
            ? pathColor(column.path, character.classId)
            : undefined;
        // Icône de profil (classe) ou de peuple/mage/prestige — même repli que la liste
        // avancée : `classId` prioritaire, sinon `ancestryId` (avec clés hors-peuple
        // dédiées 'mage'/'prestige').
        const classId =
          column?.path?.type === 'class'
            ? column.path.classIds.includes(character.classId)
              ? character.classId
              : column.path.classIds[0]
            : undefined;
        const rawAncestryId = column?.path?.type === 'ancestry' ? column.path.id : undefined;
        const ancestryId =
          rawAncestryId ?? (prestigePath ? 'prestige' : column?.path?.type === 'mage' ? 'mage' : undefined);
        return (
          <Box
            key={columnIndex}
            onMouseEnter={() => setHoveredColumn(columnIndex)}
            onMouseLeave={() => setHoveredColumn(null)}
            sx={{
              flex: isHovered ? '2.5 1 0' : '1 1 0',
              minWidth: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: `${CELL_GAP}px`,
              transition: 'flex 200ms ease',
              zIndex: isHovered ? 1 : 0,
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
              // Case du haut d'une colonne de profil VIDE : déclenche le popover de choix
              // de voie plutôt qu'un achat direct (plusieurs candidates possibles).
              const isNewPathSlot = !column && rowIndex === 0 && columnIndex === firstEmptyClassSlot;
              // Une voie de prestige remplit la case d'un DÉGRADÉ (`linear-gradient(...)`) plutôt
              // qu'une teinte plate — `alpha()` ne sait pas le parser, donc le liseré comme
              // l'atténuation de la teinte passent par une détection de préfixe plutôt qu'un helper
              // de couleur commun.
              const isGradientFill = filled && !!color && color.startsWith('linear-gradient');
              return (
                <Box
                  key={rowIndex}
                  onClick={(e) => {
                    // Mobile (pas de hover) : le 1er tap dans la colonne l'étend seulement — il
                    // faut un 2ᵉ tap, sur la case déjà visible en grand, pour sélectionner. Sur
                    // desktop la souris a déjà survolé (donc étendu) avant le clic, donc invisible.
                    if (!isHovered) {
                      setHoveredColumn(columnIndex);
                      return;
                    }
                    if (affordable) onSelect(feature!.id);
                    else if (isNewPathSlot && canPickNewPath) setPickerAnchor(e.currentTarget);
                  }}
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
                    ...((affordable || (isNewPathSlot && canPickNewPath)) && {
                      border: '1px dashed rgba(255, 255, 255, 0.5)',
                      ...(isHovered && { '&:hover': { background: 'rgba(255, 255, 255, 0.16)' } }),
                    }),
                    cursor:
                      affordable || (isNewPathSlot && canPickNewPath)
                        ? 'pointer'
                        : column
                          ? 'help'
                          : 'default',
                    transition: 'background 150ms',
                  }}
                >
                  {filled && color && (
                    // Remplissage de la case atténué de 25 % (meilleure lisibilité du texte/liseré
                    // au hover) — calque séparé plutôt qu'`alpha()` sur `color` pour rester valable
                    // aussi bien sur une teinte plate que sur le dégradé de prestige.
                    <Box sx={{ position: 'absolute', inset: 0, background: color, opacity: 0.5625 }} />
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
                        pl: 0.5,
                        // Même stagger fondu + glissement que le nom de rang ci-dessous (case
                        // unique, delai nul) — cohérence de l'apparition/disparition au hover.
                        opacity: isHovered ? 1 : 0,
                        transform: isHovered ? 'translateX(0)' : 'translateX(6px)',
                        transition: 'opacity 160ms ease, transform 160ms ease',
                        '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
                      }}
                    >
                      Ajouter une voie
                    </Typography>
                  )}
                  {feature && (
                    <Typography
                      noWrap
                      variant="caption"
                      sx={{
                        position: 'relative',
                        zIndex: 1,
                        fontWeight: 700,
                        fontSize: 12,
                        color: '#fff',
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
          </Box>
        );
      })}

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
              if (feature && featureCost(feature, progression) <= remaining) onSelect(id!);
              setPickerAnchor(null);
            }}
            label="Nouvelle voie de profil"
          />
        </Box>
      </Popover>
    </Box>
  );
}
