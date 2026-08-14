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
import { useState } from 'react';
import AddIcon from '@mui/icons-material/Add';
import Box from '@mui/material/Box';
import Popover from '@mui/material/Popover';
import Typography from '@mui/material/Typography';
import { AppTooltip } from '@/components/AppTooltip';
import { progression } from '@/data';
import type { Feature } from '@/data/schema';
import { featureCost } from '@/lib/engine';
import type { Character } from '@/lib/character/types';
import { FeaturePathAutocomplete } from '@/components/sheet/FeaturePathAutocomplete';
import { PATH_COLUMN_COUNT, PATH_RANK_COUNT, pathColumns } from '@/lib/ui/pathColumns';

/** Écart entre les cases (px). */
const CELL_GAP = 3;
/** Colonnes de profil : ni peuple/mage (0), ni prestige (dernière). */
const isClassSlot = (columnIndex: number) => columnIndex >= 1 && columnIndex <= PATH_COLUMN_COUNT - 2;

/** Infobulle d'une case : nom de la voie, rang, capacité, et éventuellement un hint d'achat. */
function cellTooltip(
  pathName: string | undefined,
  rank: number,
  featureName: string | undefined,
  hint: string | undefined,
) {
  if (!pathName) return null;
  return (
    <Box sx={{ maxWidth: 260 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
        {pathName}
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
        Rang {rank}
        {featureName ? ` · ${featureName}` : ''}
      </Typography>
      {hint && (
        <Typography variant="caption" sx={{ display: 'block', mt: 0.5 }}>
          {hint}
        </Typography>
      )}
    </Box>
  );
}

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
  /** Achète le rang suivant d'une voie entamée, ou le rang 1 d'une voie nouvellement choisie. */
  onSelect: (featureId: string) => void;
}

export function LevelUpPathsGrid({
  character,
  available,
  remaining,
  locked,
  newPathOptions,
  onSelect,
}: LevelUpPathsGridProps) {
  const columns = pathColumns(character);
  const availableIds = new Set(available.map((f) => f.id));
  const [pickerAnchor, setPickerAnchor] = useState<HTMLElement | null>(null);
  const canPickNewPath = !locked && newPathOptions.length > 0;

  return (
    <Box
      sx={{
        display: 'flex',
        gap: `${CELL_GAP}px`,
        width: '100%',
      }}
    >
      {Array.from({ length: PATH_COLUMN_COUNT }, (_, columnIndex) => {
        const column = columns[columnIndex];
        return (
          <Box
            key={columnIndex}
            sx={{
              flex: '1 1 0',
              minWidth: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: `${CELL_GAP}px`,
            }}
          >
            {Array.from({ length: PATH_RANK_COUNT }, (_, rowIndex) => {
              const filled = !!column && rowIndex < column.rankColors.length;
              const color = column?.rankColors[rowIndex];
              const feature = column?.features[rowIndex];
              const rank = feature?.rank ?? rowIndex + 1;
              // Prochain rang ouvrable de la voie : la case juste après les rangs acquis.
              const isNextOpen = !!column && rowIndex === column.rankColors.length && !!feature;
              const acquirable = isNextOpen && !!feature && availableIds.has(feature.id) && !locked;
              const cost = feature ? featureCost(feature, progression) : 0;
              const affordable = acquirable && cost <= remaining;
              // Case du haut d'une colonne de profil VIDE : déclenche le popover de choix
              // de voie plutôt qu'un achat direct (plusieurs candidates possibles).
              const isNewPathSlot = !column && rowIndex === 0 && isClassSlot(columnIndex);
              const hint = isNextOpen
                ? locked
                  ? 'Capacité divine à choisir d’abord (priorité absolue)'
                  : acquirable
                    ? affordable
                      ? `Cliquer pour choisir — ${cost} point${cost > 1 ? 's' : ''}`
                      : `Coût ${cost} point${cost > 1 ? 's' : ''} — il vous reste ${remaining}`
                    : undefined
                : undefined;
              const tooltip = isNewPathSlot
                ? canPickNewPath
                  ? 'Choisir une nouvelle voie de profil'
                  : null
                : cellTooltip(column?.name, rank, feature?.name, hint);
              return (
                <AppTooltip key={rowIndex} title={tooltip}>
                  <Box
                    onClick={
                      affordable
                        ? () => onSelect(feature!.id)
                        : isNewPathSlot && canPickNewPath
                          ? (e) => setPickerAnchor(e.currentTarget)
                          : undefined
                    }
                    sx={{
                      width: '100%',
                      aspectRatio: '3 / 2',
                      borderRadius: '2px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: filled && color ? color : 'rgba(255, 255, 255, 0.05)',
                      // Pas de `alpha()` sur la couleur : une voie de prestige porte un
                      // DÉGRADÉ (`linear-gradient(...)`), qu'`alpha()` ne sait pas parser.
                      border: filled && color ? 'none' : '1px solid rgba(255, 255, 255, 0.12)',
                      ...((affordable || (isNewPathSlot && canPickNewPath)) && {
                        border: '1px dashed rgba(255, 255, 255, 0.5)',
                        '&:hover': { background: 'rgba(255, 255, 255, 0.16)' },
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
                    {isNewPathSlot && canPickNewPath && (
                      <AddIcon sx={{ fontSize: 14, color: 'rgba(255, 255, 255, 0.5)' }} />
                    )}
                  </Box>
                </AppTooltip>
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
            value={null}
            onChange={(id) => {
              if (id) onSelect(id);
              setPickerAnchor(null);
            }}
            label="Nouvelle voie de profil"
          />
        </Box>
      </Popover>
    </Box>
  );
}
