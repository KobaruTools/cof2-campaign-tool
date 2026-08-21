'use client';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import PanToolIcon from '@mui/icons-material/PanTool';
import { featureById, pathById } from '@/data';
import type { Character } from '@/lib/character/types';
import { featureIdsFromHistory } from '@/lib/character/levelUp';
import { ORPHAN_REWARD_LABEL } from '@/lib/character/orphanPoints';
import { SourceRef } from '@/components/SourceRef';
import { ClassIcon } from '@/components/ClassIcon';
import { AncestryIcon } from '@/components/AncestryIcon';
import { FeatureMarkerHexes } from '@/components/FeatureMarkerHex';
import { DeclinedFeatureName } from '@/components/sheet/FeatureDeclension';
import {
  classColor,
  prestigeCategoryColor,
  MAGE_PATH_COLOR,
  ANCESTRY_COLOR,
  ANCESTRY_MARKER_COLOR,
} from '@/lib/ui/classColors';
import { prestigeMetalGradient, prestigeGemStops } from '@/lib/ui/prestigeStyle';
import { RankBadge } from '@/components/RankBadge';

export interface LevelHistoryProps {
  character: Character;
}

/**
 * Badge custom (≠ Chip MUI, cf. `RankBadge`) : signale un changement fait à la main sur la
 * fiche permissive (édition libre des voies & capacités, hors wizard) — teinte warning pour
 * rester cohérent avec `ManualPin` (`FeaturesByPath`), qui marque le même genre d'écart.
 */
function ManualChangeBadge() {
  return (
    <Box
      sx={(theme) => ({
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.4,
        height: 22,
        px: 0.9,
        borderRadius: 1,
        flexShrink: 0,
        lineHeight: 1,
        fontSize: '0.72rem',
        fontWeight: 700,
        whiteSpace: 'nowrap',
        color: theme.palette.warning.main,
        bgcolor: alpha(theme.palette.warning.main, 0.12),
        border: `1px solid ${alpha(theme.palette.warning.main, 0.45)}`,
      })}
    >
      <PanToolIcon sx={{ fontSize: 13 }} />
      Changement manuel
    </Box>
  );
}

/**
 * Badge custom (≠ Chip MUI, cf. `RankBadge`) : signale un point de capacité orphelin converti
 * en bonus permanent (p. 40) — même teinte warning que `ManualChangeBadge`, sans icône (rien
 * d'équivalent au geste manuel qu'il marquerait).
 */
function OrphanPointBadge() {
  return (
    <Box
      sx={(theme) => ({
        display: 'inline-flex',
        alignItems: 'center',
        height: 22,
        px: 0.9,
        borderRadius: 1,
        flexShrink: 0,
        lineHeight: 1,
        fontSize: '0.72rem',
        fontWeight: 700,
        whiteSpace: 'nowrap',
        color: theme.palette.warning.main,
        bgcolor: alpha(theme.palette.warning.main, 0.12),
        border: `1px solid ${alpha(theme.palette.warning.main, 0.45)}`,
      })}
    >
      Point orphelin
    </Box>
  );
}

/**
 * Une capacité de l'historique : badge de rang + icône de profil (couleur/dégradé) + nom de voie
 * (même teinte) + nom de capacité, marqueurs `*`/(A)/(L)/(M)/(G) en hexagones (PER-74, même recette
 * que `FeaturesByPath` : couleur de profil, dégradé métal du prestige selon sa famille, indigo
 * arcane pour la voie du mage, taupe neutre pour une voie de peuple). Id brut si capacité inconnue.
 */
function HistoryFeature({ featureId }: { featureId: string }) {
  const feature = featureById.get(featureId);
  if (!feature) {
    return (
      <Typography variant="body2" color="text.secondary">
        {featureId}
      </Typography>
    );
  }
  const path = pathById.get(feature.pathId);
  const pathName = path?.name ?? feature.pathId;
  const classId = path?.type === 'class' ? path.classIds[0] : undefined;
  const isMagePath = path?.type === 'mage';
  const isPrestigePath = path?.type === 'prestige';
  const ancestryId = path?.type === 'ancestry' ? path.id : undefined;
  const color = classId
    ? classColor(classId)
    : isMagePath
      ? MAGE_PATH_COLOR
      : path?.type === 'prestige'
        ? prestigeCategoryColor(path.category)
        : ancestryId
          ? ANCESTRY_COLOR
          : undefined;
  const iconAncestryId = ancestryId ?? (isMagePath ? 'mage' : isPrestigePath ? 'prestige' : undefined);
  const markerColor = color ?? (ancestryId ? ANCESTRY_MARKER_COLOR : undefined);
  const nameGradient = isPrestigePath ? prestigeMetalGradient(color) : undefined;
  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', rowGap: 0.5 }}>
      <RankBadge rank={feature.rank} color={color} prestige={isPrestigePath} />
      {classId && <ClassIcon classId={classId} size={16} sx={{ color }} />}
      {iconAncestryId && (
        <AncestryIcon
          ancestryId={iconAncestryId}
          size={16}
          gradientStops={isPrestigePath ? prestigeGemStops(color) : undefined}
          sx={{ color: isMagePath ? MAGE_PATH_COLOR : 'text.secondary' }}
        />
      )}
      <Typography
        variant="body2"
        component="div"
        sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 0.5 }}
      >
        <Box
          component="span"
          sx={
            nameGradient
              ? {
                  fontWeight: 700,
                  backgroundImage: nameGradient,
                  WebkitBackgroundClip: 'text',
                  backgroundClip: 'text',
                  color: 'transparent',
                  WebkitTextFillColor: 'transparent',
                }
              : { fontWeight: 700, color: color ?? 'text.secondary' }
          }
        >
          {pathName}
        </Box>
        <Box component="span" sx={{ color: 'text.secondary' }}>
          —
        </Box>
        <DeclinedFeatureName feature={feature} />
        <FeatureMarkerHexes feature={feature} color={markerColor} pathRank={feature.rank} size={16} />
      </Typography>
    </Stack>
  );
}

/**
 * Historique des montées de niveau (PER-50) : ce qui a été choisi niveau par
 * niveau (« qu’ai-je pris au niveau 4 ? »), avec annulation du dernier niveau.
 */
export function LevelHistory({ character }: LevelHistoryProps) {
  const entries = [...character.levelUpHistory].sort((a, b) => a.level - b.level);
  // Capacités choisies par l'historique mais absentes de la fiche : retrait manuel rétroactif
  // (fiche modifiée à la main hors wizard) — contrairement à un ajout, le niveau d'origine
  // reste connu ici (celui de l'entrée qui l'a choisie), donc détectable SANS journalisation
  // dédiée, y compris pour les fiches modifiées avant l'existence de ce marqueur visuel.
  const canonicalIds = featureIdsFromHistory(character);
  const manuallyRemovedIds = canonicalIds
    ? new Set(canonicalIds.filter((id) => !character.featureIds.includes(id)))
    : new Set<string>();

  if (entries.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" data-glossary-shot="LevelHistory">
        Aucune montée de niveau enregistrée.
      </Typography>
    );
  }

  return (
    <Stack spacing={2} data-glossary-shot="LevelHistory">
      {entries.map((entry) => (
        <Box key={entry.level}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
            Niveau {entry.level}
            {entry.level === 1 && (
              <Typography component="span" variant="caption" color="text.secondary">
                {' '}
                (création)
              </Typography>
            )}
          </Typography>
          {entry.chosenFeatureIds.length === 0 &&
          !entry.orphanRewards?.length &&
          !entry.forgottenFeatureIds?.length &&
          !entry.manualAddedFeatureIds?.length &&
          entry.rolledHp === undefined ? (
            <Typography variant="body2" color="text.secondary">
              Aucune capacité acquise à ce niveau.
            </Typography>
          ) : (
            <Stack spacing={0.5} sx={{ pl: 1.5, borderLeft: 3, borderColor: 'divider' }}>
              {entry.chosenFeatureIds.map((id) =>
                manuallyRemovedIds.has(id) ? (
                  <Stack key={id} direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                    <ManualChangeBadge />
                    <Box sx={{ textDecoration: 'line-through', color: 'text.secondary' }}>
                      <HistoryFeature featureId={id} />
                    </Box>
                  </Stack>
                ) : (
                  <HistoryFeature key={id} featureId={id} />
                ),
              )}
              {/* Capacité(s) ajoutée(s) à la main à CE niveau (édition libre, hors wizard). */}
              {entry.manualAddedFeatureIds?.map((id) => (
                <Stack key={`manual-${id}`} direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                  <ManualChangeBadge />
                  <HistoryFeature featureId={id} />
                </Stack>
              ))}
              {/* Capacité(s) oubliée(s) ce niveau via le changement d'orientation (p. 43) :
                  tracées pour expliciter la reconversion (et rendre l'undo transparent). */}
              {entry.forgottenFeatureIds?.map((id) => (
                <Stack
                  key={`forgotten-${id}`}
                  direction="row"
                  spacing={1}
                  sx={{ alignItems: 'center' }}
                >
                  <Chip label="Oubliée" size="small" color="secondary" variant="outlined" />
                  <Box sx={{ textDecoration: 'line-through', color: 'text.secondary' }}>
                    <HistoryFeature featureId={id} />
                  </Box>
                  <SourceRef page={43} />
                </Stack>
              ))}
              {/* Dé de vie lancé ce niveau (règle maison PER-87) : le jet saisi a remplacé
                  les PV fixes de la famille (la CON s'ajoute par-dessus). */}
              {entry.rolledHp !== undefined && (
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                  <Chip label="Dé de vie" size="small" color="secondary" variant="outlined" />
                  <Typography variant="body2" color="text.secondary">
                    Jet de {entry.rolledHp} PV (règle maison)
                  </Typography>
                </Stack>
              )}
              {/* Point(s) de capacité orphelin(s) convertis ce niveau (p. 40) : tracés ici
                  pour que le bonus permanent soit explicite (et l'undo, transparent). */}
              {entry.orphanRewards?.map((reward, i) => (
                <Stack key={`orphan-${i}`} direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                  <OrphanPointBadge />
                  <Typography variant="body2" color="text.secondary">
                    {ORPHAN_REWARD_LABEL[reward]} <SourceRef page={40} />
                  </Typography>
                </Stack>
              ))}
            </Stack>
          )}
        </Box>
      ))}
    </Stack>
  );
}
