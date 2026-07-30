'use client';

/**
 * Palette d'états de combat de l'écran de MJ (PER-279, tranche 3 de la milestone PER-276).
 *
 * Deux groupes de PUCES à glisser vers les cartes du tracker : les **états préjudiciables** du
 * glossaire (`STATUS_EFFECT_IDS`, catalogue fermé p. 214-215) et les **effets situationnels**
 * (`SITUATIONAL_EFFECT_IDS`, catalogue ouvert, ex. « Attaque invalidante »). Chaque puce est un
 * BADGE custom (jamais un `Chip` MUI, cf. préférence UI) : icône game-icons quand elle existe +
 * libellé FR, avec l'effet VERBATIM du catalogue en infobulle (renvoi de page cliquable).
 *
 * Le drop applique l'état via les mutations de la tranche 2 (`applyStatus`) — le câblage
 * `@dnd-kit` (DndContext, capteurs, `onDragEnd`) vit dans la page MJ, qui enveloppe cette palette
 * ET le tracker. Repli au clic (tactile/accessibilité) : le menu à cocher des cartes réutilise
 * les mêmes helpers (`STATUS_GROUPS`, `statusLabel`, `statusIconId`).
 */
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import { useDraggable } from '@dnd-kit/core';
import {
  SITUATIONAL_EFFECT_LABELS,
  STATUS_EFFECT_IDS,
  STATUS_EFFECT_LABELS,
  type SituationalEffectId,
  type StatusEffectId,
} from '@/data/schema';
import { statusEntry, type AnyStatusEffectId } from '@/lib/character/statusEffects';
import { AppTooltip } from '@/components/AppTooltip';
import { StatusEffectIcon } from '@/components/StatusEffectIcon';
import { SourceRef } from '@/components/SourceRef';

/** Préfixe des ids `@dnd-kit` des puces de la palette (distinct des clés de combattant droppables). */
export const STATUS_DRAG_PREFIX = 'status:';

/** Un groupe de la palette (titre + ids d'états). */
export interface StatusGroup {
  title: string;
  ids: readonly AnyStatusEffectId[];
}

/**
 * Construit les groupes affichés. Les états préjudiciables du glossaire sont TOUJOURS proposés
 * (liste fermée universelle) ; les effets situationnels ne sont proposés que si au moins une
 * capacité débloquée de la table les confère — `situationalIds` en est le sous-ensemble filtré
 * par l'appelant (via `character.featureIds` → `situationalEffectIds`). Groupe situationnel omis
 * quand aucun effet n'est débloqué (rien à poser).
 */
export function buildStatusGroups(situationalIds: readonly SituationalEffectId[]): StatusGroup[] {
  const groups: StatusGroup[] = [{ title: 'États préjudiciables', ids: STATUS_EFFECT_IDS }];
  if (situationalIds.length > 0) groups.push({ title: 'Effets situationnels', ids: situationalIds });
  return groups;
}

/** Ensemble des ids d'états du glossaire (pour narrower l'id vers une icône). */
const STATUS_EFFECT_ID_SET: ReadonlySet<string> = new Set(STATUS_EFFECT_IDS);

/** Libellé français d'un état, qu'il soit du glossaire ou situationnel (espaces d'ids disjoints). */
export function statusLabel(id: AnyStatusEffectId): string {
  return (
    (STATUS_EFFECT_LABELS as Record<string, string>)[id] ??
    (SITUATIONAL_EFFECT_LABELS as Record<string, string>)[id] ??
    id
  );
}

/**
 * Id d'icône (game-icons) d'un état, ou `null` si aucune icône ne lui correspond. Seuls les états
 * du glossaire (`StatusEffectId`) ont une icône dédiée ; les effets situationnels n'en ont pas (le
 * libellé porte alors seul l'identification).
 */
export function statusIconId(id: AnyStatusEffectId): StatusEffectId | null {
  return STATUS_EFFECT_ID_SET.has(id) ? (id as StatusEffectId) : null;
}

/** Infobulle « breakdown » d'un état : nom + effet verbatim + renvoi de page cliquable. */
export function StatusEffectTooltip({ id }: { id: AnyStatusEffectId }) {
  const entry = statusEntry(id);
  return (
    <Box sx={{ maxWidth: 260 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
        {statusLabel(id)}
      </Typography>
      {entry?.effect && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
          {entry.effect}
        </Typography>
      )}
      {entry?.sourcePage != null && <SourceRef page={entry.sourcePage} term={statusLabel(id)} />}
    </Box>
  );
}

/**
 * Rendu visuel d'une puce d'état (badge custom). Réutilisé tel quel par la surcouche de glisser
 * (`DragOverlay`). L'infobulle est optionnelle : on la retire pendant le glissement (survol
 * inopérant) et sur la surcouche.
 */
export function StatusChipVisual({
  id,
  withTooltip = true,
  dragging = false,
}: {
  id: AnyStatusEffectId;
  withTooltip?: boolean;
  dragging?: boolean;
}) {
  const iconId = statusIconId(id);
  const chip = (
    <Box
      sx={(theme) => ({
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.5,
        px: 1,
        height: 26,
        borderRadius: 1,
        lineHeight: 1,
        fontSize: '0.78rem',
        fontWeight: 600,
        whiteSpace: 'nowrap',
        color: theme.palette.error.light,
        bgcolor: alpha(theme.palette.error.main, 0.14),
        border: `1px solid ${alpha(theme.palette.error.main, 0.45)}`,
        // Ombre portée sur la surcouche de glisser pour la détacher du fond.
        boxShadow: dragging ? '0 4px 12px rgba(0, 0, 0, 0.5)' : 'none',
        userSelect: 'none',
      })}
    >
      {iconId && <StatusEffectIcon effect={iconId} size={15} />}
      <Box component="span">{statusLabel(id)}</Box>
    </Box>
  );
  if (!withTooltip) return chip;
  return <AppTooltip title={<StatusEffectTooltip id={id} />}>{chip}</AppTooltip>;
}

/** Une puce glissable de la palette (source `@dnd-kit`). */
function DraggableStatusChip({ id }: { id: AnyStatusEffectId }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `${STATUS_DRAG_PREFIX}${id}`,
    data: { statusId: id },
  });
  return (
    <Box
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      sx={{
        // `touch-action: none` : indispensable pour que le capteur pointeur intercepte le glisser
        // tactile (sinon le navigateur défile la page à la place). L'élément d'origine s'estompe
        // pendant le glissement (la puce « réelle » suit le curseur via `DragOverlay`).
        cursor: 'grab',
        touchAction: 'none',
        opacity: isDragging ? 0.4 : 1,
        // Neutralise le contour de focus par défaut du `role=button` d'@dnd-kit (on garde le nôtre).
        outline: 'none',
        '&:focus-visible > *': (theme) => ({
          boxShadow: `0 0 0 2px ${theme.palette.error.main}`,
        }),
      }}
    >
      <StatusChipVisual id={id} withTooltip={!isDragging} />
    </Box>
  );
}

/**
 * Palette complète : les groupes de puces glissables. Purement présentative — elle suppose un
 * `DndContext` ancêtre (fourni par la page MJ), qui relie le glisser d'une puce au drop sur une
 * carte de combattant. `situationalIds` = effets situationnels débloqués par la table (le groupe
 * disparaît s'il est vide).
 */
export function CombatStatusPalette({
  situationalIds,
}: {
  situationalIds: readonly SituationalEffectId[];
}) {
  return (
    <Stack spacing={1.5}>
      {buildStatusGroups(situationalIds).map((group, groupIndex) => (
        <Box key={group.title}>
          {/* Le groupe des états préjudiciables (toujours en tête) n'affiche PAS de titre : il est
              universel et implicite. Seul le groupe « Effets situationnels » (conditionnel) en garde un. */}
          {groupIndex > 0 && (
            <Typography
              variant="caption"
              sx={{
                display: 'block',
                mb: 0.75,
                fontWeight: 700,
                color: 'text.secondary',
                textTransform: 'uppercase',
                letterSpacing: 0.5,
              }}
            >
              {group.title}
            </Typography>
          )}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {group.ids.map((id) => (
              <DraggableStatusChip key={id} id={id} />
            ))}
          </Box>
        </Box>
      ))}
    </Stack>
  );
}
