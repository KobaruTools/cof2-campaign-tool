'use client';

/**
 * Palette d'états de combat de l'écran de MJ (PER-279, tranche 3 de la milestone PER-276).
 *
 * Quatre LIGNES de PUCES à glisser vers les cartes du tracker (collées, sans sous-titre — la teinte
 * suffit à distinguer les familles) : les **états préjudiciables** du
 * glossaire (`STATUS_EFFECT_IDS`, catalogue fermé p. 214-215), les **effets situationnels**
 * (`SITUATIONAL_EFFECT_IDS`, catalogue ouvert, ex. « Attaque invalidante »), les **états
 * d'environnement** (`ENVIRONMENTAL_EFFECT_IDS`, ex. « Combat aquatique », p. 215) et les **buffs de
 * groupe** (`BENEFICIAL_EFFECT_IDS`, PER-104 : Chant des héros, Bénédiction). Chaque puce est un
 * BADGE custom (jamais un `Chip` MUI, cf. préférence UI) : icône game-icons quand elle existe +
 * libellé FR, avec l'effet VERBATIM du catalogue en infobulle (renvoi de page cliquable). La TEINTE
 * distingue les familles (rouge = état subi, bleu = condition d'environnement, vert = buff de groupe,
 * cf. `statusTone`).
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
import type { BeneficialEffectId, SituationalEffectId } from '@/data/schema';
import {
  statusEntry,
  type AnyStatusEffectId,
  type AutoStatusReason,
} from '@/lib/character/statusEffects';
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

/**
 * Infobulle « breakdown » d'un état : nom + effet verbatim + renvoi de page cliquable. `autoReason`
 * (état DÉDUIT, ex. affaibli à 1 PV) ajoute la règle qui le provoque, avec sa propre page source :
 * le MJ voit alors POURQUOI cet état est là — et qu'il n'est pas de son fait, donc non retirable.
 * `remainingRounds` (PER-305) écrit en clair ce que la pastille du badge abrège (« 3t ») ; c'est un
 * pense-bête de MJ, pas une règle du livre — donc sans renvoi de page.
 */
export function StatusEffectTooltip({
  id,
  autoReason,
  remainingRounds,
}: {
  id: AnyStatusEffectId;
  autoReason?: AutoStatusReason;
  /** Tours restants du compteur de durée. Absent = aucun compteur posé (durée indéterminée). */
  remainingRounds?: number;
}) {
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
      {remainingRounds !== undefined && (
        <Typography
          variant="caption"
          sx={{ display: 'block', mt: 0.75, fontWeight: 700, color: remainingRounds === 0 ? 'warning.light' : 'text.primary' }}
        >
          {remainingRounds === 0
            ? 'Durée écoulée — à retirer'
            : `Encore ${remainingRounds} tour${remainingRounds > 1 ? 's' : ''}`}
        </Typography>
      )}
      {autoReason && (
        <Box sx={{ mt: 0.75 }}>
          <Typography variant="caption" sx={{ display: 'block', fontStyle: 'italic', color: 'warning.light' }}>
            État automatique — « {autoReason.text} »
          </Typography>
          <SourceRef page={autoReason.sourcePage} />
        </Box>
      )}
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
 * carte de combattant. `situationalIds` et `groupBuffIds` = effets débloqués par les capacités de la
 * table (le groupe correspondant disparaît s'il est vide).
 */
export function CombatStatusPalette({
  situationalIds,
  groupBuffIds = [],
}: {
  situationalIds: readonly SituationalEffectId[];
  /** Buffs de groupe débloqués par la table (PER-104). Vide/absent = ligne verte masquée. */
  groupBuffIds?: readonly BeneficialEffectId[];
}) {
  return (
    // Aucun sous-titre de groupe, et les lignes COLLÉES (même gouttière verticale qu'entre deux puces
    // d'une même ligne) : la TEINTE porte déjà la famille (rouge = état subi, bleu = environnement),
    // les libellés « Effets situationnels » / « Environnement » ne faisaient que voler de la hauteur à
    // une palette logée dans le tracker, juste au-dessus de la bande d'initiative. Chaque groupe garde
    // en revanche sa propre ligne : c'est ce qui rend les familles lisibles sans les nommer.
    <Stack spacing={1}>
      {buildStatusGroups(situationalIds, groupBuffIds).map((group) => (
        <Box key={group.title} sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {group.ids.map((id) => (
            <DraggableStatusChip key={id} id={id} />
          ))}
        </Box>
      ))}
    </Stack>
  );
}
