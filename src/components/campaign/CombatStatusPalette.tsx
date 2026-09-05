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
 * distingue les familles (rouge = état subi générique du glossaire, ORANGE = effet situationnel
 * nommé d'une capacité de voie précise (PER-74) — jamais une règle commune à tout le monde —, bleu =
 * condition d'environnement, vert = buff de groupe, cf. `statusTone`).
 *
 * Sur les lignes ORANGE et VERTE, chaque effet RÉELLEMENT POSÉ porte en plus, collée à sa droite, une
 * CROIX de levée (`onClearSituational` / `onClearGroupBuff`) qui le retire d'un clic de TOUS les
 * combattants : pratique dès qu'au moins un porteur l'affiche, pas besoin de rouvrir chaque carte pour
 * nettoyer une malédiction ou un buff qui a couru sur plusieurs combattants.
 *
 * Le drop applique l'état via les mutations de la tranche 2 (`applyStatus`) — le câblage
 * `@dnd-kit` (DndContext, capteurs, `onDragEnd`) vit dans la page MJ, qui enveloppe cette palette
 * ET le tracker. Repli au clic (tactile/accessibilité) : le menu à cocher des cartes réutilise
 * les mêmes helpers PURS (`buildStatusGroups`, `statusLabel`, `statusIconId`, `statusTone`), qui
 * vivent dans `@/lib/ui/statusPalette` — ce fichier ne porte que le rendu.
 */
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import CloseIcon from '@mui/icons-material/Close';
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
  type StatusGroup,
  type StatusTone,
} from '@/lib/ui/statusPalette';
import { AppTooltip } from '@/components/AppTooltip';
import { StatusEffectIcon } from '@/components/StatusEffectIcon';
import { SourceRef } from '@/components/SourceRef';
import { GlossaryText } from '@/components/sheet/FeatureRichText';

/** Préfixe des ids `@dnd-kit` des puces de la palette (distinct des clés de combattant droppables). */
export const STATUS_DRAG_PREFIX = 'status:';

/** Hauteur d'une puce, partagée par la croix de levée collective pour qu'elles s'alignent au pixel. */
const CHIP_HEIGHT = 26;
/** Rayon des coins d'une puce, en pixels : l'équivalent de `borderRadius: 1` du thème. */
const CHIP_RADIUS = 4;

/**
 * Délai (ms) avant apparition de l'info-bulle d'une puce de la palette, au survol — même mécanique et
 * même valeur que la micro-fiche de `CharacterList` (`AppTooltip.enterDelay`). Le fond « chargement »
 * de la puce (`StatusHoverLoadingFill`) anime sur cette même durée pour rendre l'attente visible
 * (ramené ici depuis les carrés-icônes du tracker en PER-361 : le MJ regarde les puces de la palette
 * pour choisir un état à poser, pas les badges déjà posés sur les cartes de combattants).
 */
const STATUS_TOOLTIP_ENTER_DELAY = 1000;

/**
 * Fond « chargement » d'une puce de la palette : transparent au repos, se remplit de GAUCHE À DROITE
 * pendant `STATUS_TOOLTIP_ENTER_DELAY` au survol pour rendre visible l'attente avant que l'info-bulle
 * de l'effet (verbatim + source) ne surgisse — sans ce repère, le délai pouvait passer pour une bulle
 * qui ne s'ouvre pas. Posé en tout premier enfant de la puce (sous l'icône et le libellé, qui peignent
 * par-dessus dans l'ordre du DOM) ; la règle `:hover` qui le déclenche vit sur la puce elle-même.
 */
function StatusHoverLoadingFill({ tone }: { tone: StatusTone }) {
  return (
    <Box
      className="status-loading-fill"
      aria-hidden
      sx={(theme) => ({
        position: 'absolute',
        inset: 0,
        width: 0,
        borderRadius: 'inherit',
        bgcolor: alpha(theme.palette[tone].main, 0.35),
        transition: 'width 150ms ease-out',
        pointerEvents: 'none',
      })}
    />
  );
}

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
  castBy,
}: {
  id: AnyStatusEffectId;
  autoReason?: AutoStatusReason;
  /** Tours restants du compteur de durée. Absent = aucun compteur posé (durée indéterminée). */
  remainingRounds?: number;
  /**
   * Nom du JOUEUR qui a lancé cet effet, figé à la pose (`AppliedStatus.castBy`). Jamais le nom de
   * son personnage : à la table on dit « c'est Mirielle qui chante ». Absent pour un état SUBI, que
   * le MJ pose au nom du monde.
   */
  castBy?: string;
}) {
  const entry = statusEntry(id);
  return (
    <Box sx={{ maxWidth: 260 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: castBy ? 0 : 0.5 }}>
        {statusLabel(id)}
      </Typography>
      {castBy && (
        // Mention discrète, sous le titre : qui l'a lancé, pas un second titre.
        <Typography
          variant="caption"
          sx={{ display: 'block', mb: 0.5, fontStyle: 'italic', color: 'text.disabled' }}
        >
          Lancé par {castBy}
        </Typography>
      )}
      {entry?.effect && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
          <GlossaryText>{entry.effect}</GlossaryText>
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
            État automatique — « <GlossaryText>{autoReason.text}</GlossaryText> »
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
  squareRight = false,
  castBy,
}: {
  id: AnyStatusEffectId;
  withTooltip?: boolean;
  dragging?: boolean;
  /** Auteur de la pose, repris en info-bulle (cf. `StatusEffectTooltip`). */
  castBy?: string;
  /**
   * Coins DROITS carrés : la puce est soudée à ce qui la suit (la croix de levée collective). Elle
   * cesse d'être un badge isolé pour devenir la première moitié d'un bloc.
   */
  squareRight?: boolean;
}) {
  const iconId = statusIconId(id);
  const tone = statusTone(id);
  const chip = (
    <Box
      sx={(theme) => ({
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.5,
        px: 1,
        height: CHIP_HEIGHT,
        borderRadius: squareRight ? `${CHIP_RADIUS}px 0 0 ${CHIP_RADIUS}px` : 1,
        overflow: 'hidden',
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
        // Le remplissage (`StatusHoverLoadingFill`) revient à zéro vite au départ du survol, mais ne
        // monte à 100 % que sur `STATUS_TOOLTIP_ENTER_DELAY` — la même durée que l'info-bulle qu'il
        // annonce.
        '&:hover .status-loading-fill': {
          width: '100%',
          transitionDuration: `${STATUS_TOOLTIP_ENTER_DELAY}ms`,
          transitionTimingFunction: 'linear',
        },
      })}
    >
      {withTooltip && <StatusHoverLoadingFill tone={tone} />}
      {iconId && <StatusEffectIcon effect={iconId} size={15} />}
      <Box component="span">{statusLabel(id)}</Box>
    </Box>
  );
  if (!withTooltip) return chip;
  return (
    <AppTooltip
      title={<StatusEffectTooltip id={id} castBy={castBy} />}
      enterDelay={STATUS_TOOLTIP_ENTER_DELAY}
    >
      {chip}
    </AppTooltip>
  );
}

/** Une puce glissable de la palette (source `@dnd-kit`). */
function DraggableStatusChip({
  id,
  squareRight = false,
}: {
  id: AnyStatusEffectId;
  /** Puce soudée à la croix qui la suit : coins droits carrés (cf. `StatusChipVisual`). */
  squareRight?: boolean;
}) {
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
      <StatusChipVisual id={id} withTooltip={!isDragging} squareRight={squareRight} />
    </Box>
  );
}

/**
 * Croix de LEVÉE d'un effet, soudée à la droite de SA puce. Elle ne lève que l'effet auquel elle est
 * accolée — une croix unique en bout de ligne se lisait comme appartenant à la dernière puce (celle
 * qui la précède), et emportait pourtant tous les effets posés : deux mensonges d'un coup.
 *
 * Partagée avec la fiche du joueur (`ActiveStatusPanel`), d'où le libellé confié à l'appelant : le MJ
 * lève sur tous les combattants, le joueur seulement sur lui-même. `tone` reprend la teinte de la
 * puce qu'elle prolonge (vert pour un buff de groupe, orange pour un effet situationnel, PER-74) —
 * elle reste `'success'` par défaut pour les appels existants côté fiche joueur (buff/cristal/monture,
 * tous bénéfiques).
 *
 * Pas de confirmation : reposer un effet coûte un glisser (la fenêtre garde palier et camp
 * pré-remplis), alors qu'une modale à chaque fin de combat coûte un clic à chaque fois. L'infobulle
 * nomme ce qui va être levé, pour que le geste ne soit jamais une surprise.
 */
export function ClearStatusButton({
  label,
  onClear,
  tone = 'success',
}: {
  label: string;
  onClear: () => void;
  tone?: StatusTone;
}) {
  return (
    <AppTooltip title={label}>
      <IconButton
        size="small"
        aria-label={label}
        onClick={onClear}
        sx={(theme) => ({
          // Soudée à la dernière puce : même hauteur, coins GAUCHES carrés, et un `-1px` de marge qui
          // superpose les deux bordures en un seul trait — sinon la jonction montrerait un liséré de
          // 2 px et le bloc se relirait comme deux éléments voisins.
          width: CHIP_HEIGHT,
          height: CHIP_HEIGHT,
          ml: '-1px',
          borderRadius: `0 ${CHIP_RADIUS}px ${CHIP_RADIUS}px 0`,
          color: theme.palette[tone].light,
          border: `1px solid ${alpha(theme.palette[tone].main, 0.45)}`,
          bgcolor: alpha(theme.palette[tone].main, 0.14),
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
          '&:hover': { bgcolor: alpha(theme.palette[tone].main, 0.28) },
        })}
      >
        <CloseIcon sx={{ fontSize: 16 }} />
      </IconButton>
    </AppTooltip>
  );
}

/**
 * UNE ligne de la palette : ses puces glissables et, sur les lignes ORANGE et VERTE, la croix de
 * levée de CHAQUE effet effectivement posé. Puce et croix sont rendues dans un conteneur sans
 * gouttière : elles ne forment plus qu'un bloc (coins carrés à la jonction, bordures superposées).
 */
function PaletteRow({
  group,
  clear,
}: {
  group: StatusGroup;
  /**
   * Effets posés levables, le geste de levée — par id, une croix ne lève QUE son propre effet — et la
   * teinte de la croix (celle de la ligne : orange situationnel ou vert buff de groupe).
   */
  clear?: { ids: readonly AnyStatusEffectId[]; onClear: (id: AnyStatusEffectId) => void; tone: StatusTone };
}) {
  const clearable = new Set<string>(clear?.ids ?? []);
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
      {group.ids.map((id) =>
        clear && clearable.has(id) ? (
          <Box key={id} sx={{ display: 'flex' }}>
            <DraggableStatusChip id={id} squareRight />
            <ClearStatusButton
              label={`Lever ${statusLabel(id)} sur tous les combattants`}
              onClear={() => clear.onClear(id)}
              tone={clear.tone}
            />
          </Box>
        ) : (
          <DraggableStatusChip key={id} id={id} />
        ),
      )}
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
  posedSituationalIds = [],
  onClearSituational,
  groupBuffIds = [],
  posedGroupBuffIds = [],
  onClearGroupBuff,
}: {
  situationalIds: readonly SituationalEffectId[];
  /**
   * Effets situationnels actuellement POSÉS sur au moins un combattant (PER-74) : chacun reçoit sa
   * croix de levée orange, sur SA puce. Vide = rien à lever, aucune croix.
   */
  posedSituationalIds?: readonly SituationalEffectId[];
  /**
   * Lève CET effet situationnel (et lui seul) sur tous les combattants, en une écriture. Absent = pas
   * de croix (palette en lecture, ou écran qui ne sait pas écrire l'état de combat).
   */
  onClearSituational?: (id: SituationalEffectId) => void;
  /** Buffs de groupe débloqués par la table (PER-104). Vide/absent = ligne verte masquée. */
  groupBuffIds?: readonly BeneficialEffectId[];
  /**
   * Buffs de groupe actuellement POSÉS sur au moins un combattant : chacun reçoit sa croix de levée,
   * sur SA puce. Vide = rien à lever, aucune croix.
   */
  posedGroupBuffIds?: readonly BeneficialEffectId[];
  /**
   * Lève CE buff (et lui seul) sur tous les combattants, en une écriture. Absent = pas de croix
   * (palette en lecture, ou écran qui ne sait pas écrire l'état de combat).
   */
  onClearGroupBuff?: (id: BeneficialEffectId) => void;
}) {
  return (
    // Aucun sous-titre de groupe, et les lignes COLLÉES (même gouttière verticale qu'entre deux puces
    // d'une même ligne) : la TEINTE porte déjà la famille (rouge = état subi, orange = effet
    // situationnel, bleu = environnement), les libellés « Effets situationnels » / « Environnement »
    // ne faisaient que voler de la hauteur à une palette logée dans le tracker, juste au-dessus de la
    // bande d'initiative. Chaque groupe garde en revanche sa propre ligne : c'est ce qui rend les
    // familles lisibles sans les nommer.
    <Stack spacing={1} data-glossary-shot="CombatStatusPalette">
      {buildStatusGroups(situationalIds, groupBuffIds).map((group) => (
        <PaletteRow
          key={group.title}
          group={group}
          // Levée collective sur les lignes ORANGE et VERTE : un effet situationnel (malédiction,
          // nuée…) ou un buff de groupe peut courir sur plusieurs cartes, le lever une par une est une
          // corvée — et repasser par la fenêtre de pose suppose de se souvenir de qui le portait. Une
          // croix PAR effet posé : deux effets peuvent courir en même temps, lever l'un ne doit pas
          // emporter l'autre.
          clear={
            group.family === 'situational' && onClearSituational && posedSituationalIds.length > 0
              ? { ids: posedSituationalIds, onClear: onClearSituational as (id: AnyStatusEffectId) => void, tone: 'situational' }
              : group.family === 'group-buff' && onClearGroupBuff && posedGroupBuffIds.length > 0
                ? { ids: posedGroupBuffIds, onClear: onClearGroupBuff as (id: AnyStatusEffectId) => void, tone: 'success' }
                : undefined
          }
        />
      ))}
    </Stack>
  );
}
