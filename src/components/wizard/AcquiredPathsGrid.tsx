'use client';

/**
 * Grille colonne des capacités acquises, pour le récapitulatif du wizard (création, niveau 1).
 * Version LECTURE SEULE, ALLÉGÉE, du graphe de voies du wizard de montée de niveau
 * (`LevelUpPathsGrid`) : au niveau 1 il n'y a JAMAIS que 3 colonnes possibles (peuple/mage +
 * les 2 voies de profil choisies) — les 4 autres emplacements (profils 3-5, prestige) de
 * `pathColumns` sont donc toujours vides et ignorés, pas la peine de les réserver ni de
 * reproduire le survol « colonne étroite → élargie » qui n'a de sens que pour naviguer parmi
 * plus de colonnes que la place n'en montre. Colonnes toujours dépliées (en-tête + noms de
 * rang visibles d'emblée), rien à sélectionner ni acheter. Le clic sur un rang acquis affiche
 * sa carte en aperçu (`PathCard`), comme la preview de `LevelUpPathsGrid`.
 */
import { useState } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { featureById, pathById } from '@/data';
import type { Character } from '@/lib/character/types';
import { AncestryIcon } from '@/components/AncestryIcon';
import { ClassIcon } from '@/components/ClassIcon';
import { PathCard } from '@/components/PathCard';
import { DeclinedFeatureName } from '@/components/sheet/FeatureDeclension';
import { pathColumns, pathVisuals } from '@/lib/ui/pathColumns';

/** Nombre de colonnes affichées : peuple/mage + les 2 voies de profil du niveau 1. */
const LEVEL1_COLUMN_COUNT = 3;
/** Écart entre les cases (px). */
const CELL_GAP = 3;
/** Hauteur d'une case (px) — fixe, pas d'aspect-ratio proportionnel à la largeur. */
const CELL_HEIGHT = 40;

export interface AcquiredPathsGridProps {
  character: Character;
}

export function AcquiredPathsGrid({ character }: AcquiredPathsGridProps) {
  const columns = pathColumns(character).slice(0, LEVEL1_COLUMN_COUNT);
  // Nombre de rangs à afficher : le plus grand rang réellement acquis parmi les 3 colonnes
  // (normalement 1, ou 2 pour la voie du mage avec le bonus de rang 2 au niveau 1) — jamais
  // les 5 rangs pleins d'une voie complète, sans objet à la création.
  const rowCount = Math.max(1, ...columns.map((c) => c?.rankColors.length ?? 0));
  // Aperçu déployé au clic sur un rang acquis — réutilise `PathCard` en lecture seule
  // (`selectable={false}`), comme la preview de `LevelUpPathsGrid`. `color`/`gradient`
  // capturent le rendu EXACT du rang cliqué (celui de `rankColors`, qui tient compte d'un
  // éventuel emprunt de capacité, PER-120).
  const [preview, setPreview] = useState<{ featureId: string; color?: string; gradient: boolean } | null>(null);

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ display: 'flex', gap: `${CELL_GAP}px`, width: '100%' }}>
        {Array.from({ length: LEVEL1_COLUMN_COUNT }, (_, columnIndex) => {
          const column = columns[columnIndex];
          const { color: titleColor, classId, ancestryId } = pathVisuals(column?.path, character.classId);
          const isEmpty = !column;
          return (
            <Box
              key={columnIndex}
              sx={{
                flex: '1 1 0',
                minWidth: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: `${CELL_GAP}px`,
                opacity: isEmpty ? 0.35 : 1,
              }}
            >
              {/* En-tête toujours déplié (jamais réservé à un hover) : filet vertical + icône +
                  nom, dans la couleur de la voie. */}
              <Stack
                direction="row"
                spacing={0.5}
                sx={{
                  alignItems: 'center',
                  minHeight: 22,
                  pl: 0.75,
                  borderLeft: column ? '3px solid' : 'none',
                  borderColor: titleColor ?? 'divider',
                }}
              >
                {classId && (
                  <ClassIcon classId={classId} size={15} sx={{ color: titleColor ?? undefined, flexShrink: 0 }} />
                )}
                {!classId && ancestryId && (
                  <AncestryIcon ancestryId={ancestryId} size={15} sx={{ color: titleColor ?? 'text.secondary', flexShrink: 0 }} />
                )}
                {column && (
                  <Typography
                    noWrap
                    variant="caption"
                    sx={{ fontWeight: 600, fontSize: 12.5, lineHeight: 1.2, color: titleColor ?? 'text.primary' }}
                  >
                    {column.name}
                  </Typography>
                )}
              </Stack>
              {Array.from({ length: rowCount }, (_, rowIndex) => {
                const filled = !!column && rowIndex < column.rankColors.length;
                const color = column?.rankColors[rowIndex];
                const feature = filled ? column?.features[rowIndex] : undefined;
                // Une voie de prestige remplit la case d'un DÉGRADÉ (`linear-gradient(...)`) plutôt
                // qu'une teinte plate — même détection que `LevelUpPathsGrid` (sans objet ici, aucune
                // voie de prestige au niveau 1, mais gardé pour rester cohérent avec `rankColors`).
                const isGradientFill = filled && !!color && color.startsWith('linear-gradient');
                return (
                  <Box
                    key={rowIndex}
                    onClick={() => {
                      if (feature) setPreview({ featureId: feature.id, color, gradient: isGradientFill });
                    }}
                    sx={{
                      position: 'relative',
                      overflow: 'hidden',
                      width: '100%',
                      height: CELL_HEIGHT,
                      borderRadius: '2px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      userSelect: 'none',
                      background: filled && color ? undefined : 'rgba(255, 255, 255, 0.05)',
                      border: filled && color ? 'none' : '1px solid rgba(255, 255, 255, 0.12)',
                      ...(filled && color && !isGradientFill ? { border: `1px solid ${color}` } : {}),
                      cursor: feature ? 'pointer' : 'default',
                    }}
                  >
                    {filled && color && (
                      <Box sx={{ position: 'absolute', inset: 0, background: color, opacity: 0.5625 }} />
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
                          textShadow: '0 1px 2px rgba(0, 0, 0, 0.6)',
                          width: '100%',
                          px: 0.75,
                          textAlign: 'left',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
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
      </Box>

      {preview &&
        (() => {
          const feature = featureById.get(preview.featureId);
          const path = feature ? pathById.get(feature.pathId) : undefined;
          if (!feature) return null;
          const visuals = pathVisuals(path, character.classId);
          const cardColor = preview.gradient ? undefined : preview.color;
          return (
            <Box sx={{ width: '100%', mt: 1 }}>
              <Stack
                direction="row"
                spacing={0.75}
                sx={{ alignItems: 'center', borderLeft: 3, borderColor: cardColor ?? 'divider', pl: 1.5, mb: 0.75 }}
              >
                {visuals.classId ? (
                  <ClassIcon classId={visuals.classId} size={18} sx={{ color: cardColor ?? undefined, flexShrink: 0 }} />
                ) : (
                  visuals.ancestryId && (
                    <AncestryIcon ancestryId={visuals.ancestryId} size={18} sx={{ color: 'text.secondary', flexShrink: 0 }} />
                  )
                )}
                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: cardColor ?? 'text.primary' }}>
                  {path?.name ?? feature.pathId}
                </Typography>
              </Stack>
              <PathCard
                name={<DeclinedFeatureName feature={feature} />}
                term={feature.name}
                color={cardColor}
                classId={visuals.classId}
                ancestryId={visuals.ancestryId}
                checked
                selectable={false}
                defaultExpanded
                repeatFeatureName={false}
                // Coût/gratuité sans objet ici (toutes les capacités du niveau 1 le sont, p. 39) —
                // contrairement à la preview de `LevelUpPathsGrid`, où le coût éclaire un achat.
                rankLabel=""
                sourcePage={path?.sourcePage}
                feature={feature}
                abilities={character.abilities}
                level={character.level}
              />
            </Box>
          );
        })()}
    </Box>
  );
}
