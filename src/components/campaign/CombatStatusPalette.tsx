'use client';

/**
 * Palette d'états de combat de l'écran de MJ (PER-279, tranche 3 de la milestone PER-276).
 *
 * Trois groupes de PUCES à glisser vers les cartes du tracker : les **états préjudiciables** du
 * glossaire (`STATUS_EFFECT_IDS`, catalogue fermé p. 214-215), les **effets situationnels**
 * (`SITUATIONAL_EFFECT_IDS`, catalogue ouvert, ex. « Attaque invalidante ») et les **états
 * d'environnement** (`ENVIRONMENTAL_EFFECT_IDS`, ex. « Combat aquatique », p. 215). Chaque puce est un
 * BADGE custom (jamais un `Chip` MUI, cf. préférence UI) : icône game-icons quand elle existe +
 * libellé FR, avec l'effet VERBATIM du catalogue en infobulle (renvoi de page cliquable). La TEINTE
 * distingue les familles (rouge = état subi, bleu = condition d'environnement, cf. `statusTone`).
 *
 * Le drop applique l'état via les mutations de la tranche 2 (`applyStatus`) — le câblage
 * `@dnd-kit` (DndContext, capteurs, `onDragEnd`) vit dans la page MJ, qui enveloppe cette palette
 * ET le tracker. Repli au clic (tactile/accessibilité) : le menu à cocher des cartes réutilise
 * les mêmes helpers PURS (`buildStatusGroups`, `statusLabel`, `statusIconId`, `statusTone`), qui
 * vivent dans `@/lib/ui/statusPalette` — ce fichier ne porte que le rendu.
 */
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import { useDraggable } from '@dnd-kit/core';
import type { SituationalEffectId } from '@/data/schema';
import { statusEntry, type AnyStatusEffectId } from '@/lib/character/statusEffects';
import {
  buildStatusGroups,
  statusIconId,
  statusLabel,
  statusTone,
} from '@/lib/ui/statusPalette';
import { AppTooltip } from '@/components/AppTooltip';
import { StatusEffectIcon } from '@/components/StatusEffectIcon';
import { SourceRef } from '@/components/SourceRef';

/** Préfixe des ids `@dnd-kit` des puces de la palette (distinct des clés de combattant droppables). */
export const STATUS_DRAG_PREFIX = 'status:';

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
  const tone = statusTone(id);
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
        color: theme.palette[tone].light,
        bgcolor: alpha(theme.palette[tone].main, 0.14),
        // Flou d'arrière-plan (comme les carrés-icônes du tracker/projection) : garde la puce lisible
        // par-dessus l'illustration de fond de l'écran de MJ.
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        border: `1px solid ${alpha(theme.palette[tone].main, 0.45)}`,
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
          boxShadow: `0 0 0 2px ${theme.palette[statusTone(id)].main}`,
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
              universel et implicite. Les groupes suivants (« Effets situationnels », « Environnement »)
              en gardent un — ils forment chacun leur propre ligne de puces. */}
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
