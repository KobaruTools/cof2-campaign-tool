'use client';

import { useRef, useState, type ReactNode } from 'react';
import AddIcon from '@mui/icons-material/Add';
import AltRouteIcon from '@mui/icons-material/AltRoute';
import CategoryOutlinedIcon from '@mui/icons-material/CategoryOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import NoMeetingRoomOutlinedIcon from '@mui/icons-material/NoMeetingRoomOutlined';
import ViewColumnIcon from '@mui/icons-material/ViewColumn';
import ViewStreamIcon from '@mui/icons-material/ViewStream';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { restrictToParentElement, restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { equipment as equipmentCatalog } from '@/data';
import type { CharacterClass, EquipmentItem } from '@/data/schema';
import type { EquipmentLine, ItemType, WornState } from '@/lib/character/types';
import { isCustomItem } from '@/lib/character/types';
import { effectiveItem, groupEquipmentByType, itemType, reorderEquipment } from '@/lib/character/items';
import { usePersistedBoolean } from '@/lib/ui/usePersistedBoolean';
import { isFirearmItemId } from '@/lib/character/firearms';
import { elixirFeatureIdByItemName } from '@/lib/character/elixirs';
import { isConsumable } from '@/lib/character/consumables';
import { isStartingChoiceLine } from '@/lib/character/startingChoices';
import { COIN_POUCH_ITEM_NAME } from '@/data/progression';
import { equipmentLabel } from '@/components/wizard/helpers';
import { AppTooltip } from '@/components/AppTooltip';
import { ItemTypeIcon } from '@/components/ItemTypeIcon';
import { ItemDialog, ITEM_TYPE_LABELS } from '@/components/sheet/ItemDialog';
import { EquipmentCatalogAutocomplete } from '@/components/sheet/EquipmentCatalogAutocomplete';
import { PageRefText } from '@/components/SourceRef';
import { DamageValue } from '@/components/DamageValue';
import { formatWeaponDamage } from '@/lib/character/weaponDamage';
import { CapabilityChip, GlossaryText } from '@/components/sheet/FeatureRichText';
import {
  ArmorRestrictionBadge,
  EquipConflictsAlert,
  TwoWeaponPenaltyBadge,
  WeaponAffinityBadge,
  WeaponMasteryBadge,
  WornBadge,
  WornControls,
} from '@/components/sheet/WornEquipmentControls';
import type { ArmorRestrictionViolation } from '@/lib/character/armorRestrictions';
import type { WeaponAffinity } from '@/lib/character/weaponAffinity';
import type { TwoWeaponCombatStatus } from '@/lib/character/twoWeaponCombat';

/**
 * Résolution NOM D'OBJET → capacité mise en avant (puce) pour les doses d'élixir (voie des élixirs).
 * Dérivée des données (statique) → calculée une seule fois au chargement du module.
 */
const ELIXIR_FEATURE_BY_ITEM = elixirFeatureIdByItemName();

/**
 * Détail concis d'un objet du catalogue (DM des armes, DEF des protections). Le texte
 * passe par `GlossaryText` (PER-85) pour que « DM » (jargon) et « DEF » (stat dérivée)
 * reçoivent la même mise en avant qu'ailleurs. La DEF affichée est la DEF MONDAINE
 * (catalogue) ; le bonus magique éventuel est rendu à part (`MagicDefBadge`).
 */
function itemDetail(item: EquipmentItem): ReactNode {
  switch (item.category) {
    case 'weapon':
      return (
        <>
          <GlossaryText>DM</GlossaryText> <DamageValue damage={formatWeaponDamage(item.damage)} />
          {item.twoHandedDamage && (
            <>
              /<DamageValue damage={formatWeaponDamage(item.twoHandedDamage)} />
            </>
          )}
          {item.range && ` · portée ${item.range}`}
        </>
      );
    case 'armor':
    case 'shield':
      return <GlossaryText>{`DEF +${item.def}`}</GlossaryText>;
    case 'gear':
      // La description libre du matériel n'est plus affichée en ligne : elle passe par
      // le survol du titre + la bascule œil (comme la description d'un objet custom).
      return null;
  }
}

/**
 * Badge du bonus de DEF MAGIQUE d'une armure enchantée (PER-85, retour propriétaire) :
 * pastille custom (≠ Chip MUI, cf. conventions) en teinte SECONDAIRE, distincte de la
 * DEF mondaine (« DEF +5 ») avec laquelle elle ne doit pas se confondre. Info-bulle
 * rappelant qu'elle s'ajoute à la DEF totale mais reste hors du surcoût de mana (p. 178).
 */
function MagicDefBadge({ value }: { value: number }) {
  return (
    <AppTooltip
      title={
        <PageRefText>
          Bonus magique de l’équipement : s’ajoute à la DEF totale (cumulable avec les autres
          objets équipés), hors surcoût de mana des sorts en armure (p. 178).
        </PageRefText>
      }
    >
      <Box
        component="span"
        sx={(theme) => ({
          display: 'inline-block',
          verticalAlign: 'baseline',
          ml: 0.75,
          px: 0.6,
          borderRadius: 0.75,
          fontWeight: 700,
          fontSize: '0.72rem',
          lineHeight: 1.4,
          whiteSpace: 'nowrap',
          cursor: 'help',
          color: theme.palette.secondary.main,
          bgcolor: alpha(theme.palette.secondary.main, 0.12),
          border: `1px solid ${alpha(theme.palette.secondary.main, 0.45)}`,
        })}
      >
        +{value} magique
      </Box>
    </AppTooltip>
  );
}

/**
 * Panneau d'avertissement (PER-185, retour propriétaire PER-93) posé sur une ligne d'arme
 * à poudre (pétoire, mousquet — cf. `isFirearmItem`) quand la poudre est INDISPONIBLE
 * (autorisation effective des armes à feu à `false` : règle campagne « pas d'arme à feu »
 * ou choix du joueur). La ligne est grisée mais JAMAIS retirée : le MJ garde la liberté de
 * la conserver pour un effet de style. Pastille custom en tonalité « warning » (≠ Chip MUI).
 */
function FirearmUnavailableBadge() {
  return (
    <Box sx={{ mt: 0.5 }}>
      <AppTooltip
        title={
          <PageRefText>
            La poudre n’existe pas dans cette campagne : cette arme à feu ne peut pas être utilisée.
            Conservée par choix (effet de style) ; le MJ peut l’activer via les réglages de campagne (p. 185).
          </PageRefText>
        }
      >
        <Box
          component="span"
          sx={(theme) => ({
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.5,
            px: 0.75,
            height: 22,
            borderRadius: 1,
            fontSize: '0.72rem',
            fontWeight: 700,
            whiteSpace: 'nowrap',
            cursor: 'help',
            color: theme.palette.warning.main,
            bgcolor: alpha(theme.palette.warning.main, 0.12),
            border: `1px solid ${alpha(theme.palette.warning.main, 0.45)}`,
          })}
        >
          <NoMeetingRoomOutlinedIcon sx={{ fontSize: 14 }} />
          Poudre indisponible dans cette campagne
        </Box>
      </AppTooltip>
    </Box>
  );
}

/** Ligne « Bourse de 2d6 pa » du sac de départ (résolue par `CoinPouchDialog`). */
function isCoinPouchLine(line: EquipmentLine): boolean {
  return isCustomItem(line) && line.name === COIN_POUCH_ITEM_NAME;
}

/**
 * Puce « Choisir » (PER-220) : pastille custom (≠ Chip MUI) posée sur une ligne
 * placeholder « à résoudre » (choix « X ou Y » d'un profil, ou Bourse de départ) pour
 * signaler qu'elle n'est qu'INDICATIVE et inciter le joueur à la remplacer par le vrai
 * objet via « Utiliser ». Purement visuelle (non interactive) ; l'action reste le bouton
 * « Utiliser » adjacent. Tonalité « primary » pour attirer l'œil.
 */
function ChoiceBadge() {
  return (
    <AppTooltip title="Objet à choisir : cette ligne n’est qu’un rappel du livre. Utilisez « Utiliser » pour obtenir le vrai objet.">
      <Box
        component="span"
        sx={(theme) => ({
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0.5,
          px: 0.75,
          height: 28,
          borderRadius: 1,
          fontSize: '0.72rem',
          fontWeight: 700,
          whiteSpace: 'nowrap',
          cursor: 'help',
          flexShrink: 0,
          color: theme.palette.primary.main,
          bgcolor: alpha(theme.palette.primary.main, 0.12),
          border: `1px solid ${alpha(theme.palette.primary.main, 0.45)}`,
        })}
      >
        <AltRouteIcon sx={{ fontSize: 14 }} />
        Choisir
      </Box>
    </AppTooltip>
  );
}

/**
 * Bascule d'affichage de l'inventaire (PER-221) : « Par catégorie » (regroupement
 * visuel par type d'objet) ou « À plat » (liste dans l'ordre stocké). Calquée sur
 * `FeaturesLayoutToggle` des Voies (`ToggleButtonGroup` à 2 boutons). L'état est une
 * préférence UI GLOBALE persistée (localStorage), gérée par l'appelant.
 */
function InventoryLayoutToggle({
  grouped,
  onChange,
}: {
  grouped: boolean;
  onChange: (grouped: boolean) => void;
}) {
  return (
    <ToggleButtonGroup
      value={grouped ? 'grouped' : 'flat'}
      exclusive
      size="small"
      onChange={(_, next) => {
        if (next) onChange(next === 'grouped');
      }}
    >
      <ToggleButton value="grouped" aria-label="Organiser par catégorie">
        <AppTooltip title="Organiser par catégorie">
          <CategoryOutlinedIcon fontSize="small" />
        </AppTooltip>
      </ToggleButton>
      <ToggleButton value="flat" aria-label="Liste à plat">
        <AppTooltip title="Liste à plat">
          <FormatListBulletedIcon fontSize="small" />
        </AppTooltip>
      </ToggleButton>
    </ToggleButtonGroup>
  );
}

/**
 * Bascule d'affichage liste / colonnes de l'inventaire (PER-223) : « Liste » (une ligne
 * par objet, rendu historique) ou « Colonnes » (grille de cartes compactes). Calquée sur
 * `FeaturesLayoutToggle` des Voies (`ToggleButtonGroup` à 2 boutons, mêmes icônes
 * `ViewStreamIcon` / `ViewColumnIcon`). Orthogonale au regroupement par catégorie
 * (`InventoryLayoutToggle`) : les deux bascules cohabitent dans l'en-tête. L'état est une
 * préférence UI GLOBALE persistée (localStorage), gérée par l'appelant.
 */
function InventoryViewToggle({
  cards,
  onChange,
}: {
  cards: boolean;
  onChange: (cards: boolean) => void;
}) {
  return (
    <ToggleButtonGroup
      value={cards ? 'cards' : 'list'}
      exclusive
      size="small"
      onChange={(_, next) => {
        if (next) onChange(next === 'cards');
      }}
    >
      <ToggleButton value="list" aria-label="Affichage en liste">
        <AppTooltip title="Affichage en liste">
          <ViewStreamIcon fontSize="small" />
        </AppTooltip>
      </ToggleButton>
      <ToggleButton value="cards" aria-label="Affichage en colonnes">
        <AppTooltip title="Affichage en colonnes">
          <ViewColumnIcon fontSize="small" />
        </AppTooltip>
      </ToggleButton>
    </ToggleButtonGroup>
  );
}

/**
 * Grille responsive de cartes d'inventaire (PER-223, mode « colonnes ») : autant de
 * colonnes que la largeur le permet, chaque carte occupant au minimum 260px (retour
 * propriétaire). `alignItems` par défaut (`stretch`) → les cartes d'une même rangée
 * s'alignent en hauteur ; combiné au pied poussé en bas dans la carte, le rendu reste
 * régulier même quand les contenus diffèrent.
 */
function CardGrid({ children }: { children: ReactNode }) {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
        gap: 1.5,
      }}
    >
      {children}
    </Box>
  );
}

/**
 * En-tête d'un groupe de type d'objet (PER-221) : icône du type + libellé FR + décompte,
 * posé au-dessus des lignes du groupe en mode « Par catégorie ». Bloc custom (≠ Chip MUI,
 * cf. conventions), en tonalité secondaire discrète pour ne pas voler la vedette aux lignes.
 */
function GroupHeader({ type, count }: { type: ItemType; count: number }) {
  return (
    <Box
      sx={(theme) => ({
        display: 'flex',
        alignItems: 'center',
        gap: 0.75,
        pt: 0.5,
        pb: 0.25,
        color: theme.palette.text.secondary,
        borderBottom: `2px solid ${theme.palette.divider}`,
      })}
    >
      <ItemTypeIcon type={type} size={18} />
      <Typography variant="overline" sx={{ fontWeight: 700, lineHeight: 1.6 }}>
        {ITEM_TYPE_LABELS[type]}
      </Typography>
      <Box component="span" sx={{ ml: 'auto', fontSize: '0.75rem', fontWeight: 600, opacity: 0.7 }}>
        {count}
      </Box>
    </Box>
  );
}

export interface EquipmentListProps {
  equipment: EquipmentLine[];
  /** Édition en place : si fourni, ajout / suppression / quantité / objet libre. */
  onChange?: (equipment: EquipmentLine[]) => void;
  /**
   * Consommer un objet (bouton « Utiliser », PER-158) : décrémente la quantité de la ligne `i`, et
   * SUPPRIME la ligne quand elle tombe à 0. C'est un ÉTAT DE JEU (consommer un élixir, une potion…),
   * donc disponible HORS mode édition — indépendant de `onChange`. Absent → pas de bouton « Utiliser ».
   */
  onUse?: (index: number) => void;
  /**
   * Équiper / déséquiper une ligne (PER-77) : pose ou retire l'état de port
   * (`WornState`) de la ligne `i`. C'est un ÉTAT DE JEU (on change d'arme, on lève le
   * bouclier), donc disponible HORS mode édition — indépendant de `onChange`. Absent →
   * pas de contrôle d'équipement (les objets portés sont alors montrés par un badge).
   */
  onWear?: (index: number, worn: WornState | undefined) => void;
  /**
   * Profil du personnage : applique les reskins d'objet du profil aux noms affichés
   * (PER-181, ex. druide `baton-ferre` → « Bâton noueux »). Absent → nom du catalogue.
   */
  characterClass?: CharacterClass;
  /**
   * Profils maîtrisés par le personnage (`masteredClassIds`, PER-79) : sert à poser
   * l'indicateur « arme non maîtrisée → dé malus » sur les armes tenues en main.
   * Absent → aucun indicateur de maîtrise.
   */
  masteredIds?: Set<string>;
  /** Autorisation EFFECTIVE des armes à feu (PER-185), pour l'indicateur de maîtrise. */
  firearmsAllowed?: boolean;
  /**
   * Armes maîtrisées PAR EXCEPTION à une arme précise (`extraMasteredWeaponIds`) : arme sacrée du
   * prêtre spécialiste (PER-96) et octroi de maîtrise de peuple (nain « Haches et marteaux », PER-154).
   * Suppriment l'indicateur de dé malus sur ces armes. Absent → aucune exception.
   */
  extraMasteredWeaponIds?: ReadonlySet<string>;
  /**
   * Résolveur d'affinités d'arme (PER-218) : pour l'id d'objet d'une ligne, ce qui
   * rend l'arme SPÉCIALE pour ce personnage (arme sacrée du prêtre spécialiste, et à
   * terme prédilection/armes de peuple). Rend un badge positif par affinité. Absent →
   * aucun badge d'affinité. Fourni par l'appelant lié au personnage (`weaponAffinities`).
   */
  resolveWeaponAffinities?: (itemId: string) => WeaponAffinity[];
  /**
   * Statut de combat à deux armes du personnage (`twoWeaponCombatStatus`, PER-116) :
   * pose sur chaque arme tenue en main l'indicateur « Deux armes · dé malus » (p. 215),
   * ou « sans dé malus » quand l'exemption Combattant héroïque joue (p. 73). Absent →
   * aucun indicateur de combat à deux armes.
   */
  twoWeaponStatus?: TwoWeaponCombatStatus;
  /**
   * Résolveur d'écart de port armure/bouclier (PER-80) : pour une ligne d'inventaire, rend la
   * violation de plafond de port qui la concerne (armure trop lourde, bouclier interdit), ou
   * `null`. Pose sur la ligne fautive un badge « warning » (pendant du badge « Non maîtrisée »
   * des armes), en plus de l'avertissement agrégé en tête de fiche. Absent → aucun badge. Fourni
   * par l'appelant lié au personnage (`armorRestrictionByLine`).
   */
  resolveArmorRestriction?: (line: EquipmentLine) => ArmorRestrictionViolation | null;
}

/**
 * Ligne d'inventaire RÉORDONNABLE (PER-222) : enrobe le rendu d'une ligne d'une poignée
 * de préhension `DragIndicator` à gauche. Le glisser ne démarre QUE depuis la poignée
 * (`setActivatorNodeRef` + `listeners` portés par elle seule) — les boutons/tooltips de
 * la ligne restent cliquables. `id` = index d'origine (chaîne) : stable pendant tout un
 * glisser (le tableau n'est réécrit qu'au drop), c'est l'identité déjà utilisée en clé.
 */
function SortableEquipmentRow({ id, children }: { id: string; children: ReactNode }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id });
  return (
    <Box
      ref={setNodeRef}
      // `Translate` (translation seule) et NON `Transform` : avec `verticalListSortingStrategy`,
      // @dnd-kit ajoute un scaleX/scaleY au transform quand les lignes ont des hauteurs
      // différentes, ce qui étirerait/compresserait verticalement le texte de la ligne glissée.
      style={{ transform: CSS.Translate.toString(transform), transition }}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 0.5,
        // Ligne en cours de glissement : passe au-dessus + légèrement estompée.
        ...(isDragging && { position: 'relative', zIndex: 1, opacity: 0.85 }),
      }}
    >
      <AppTooltip title="Glisser pour réordonner">
        <IconButton
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          size="small"
          aria-label="Réordonner cet objet"
          sx={{
            flexShrink: 0,
            color: 'text.secondary',
            cursor: 'grab',
            // Indispensable en tactile : empêche le scroll de la page de capturer le geste.
            touchAction: 'none',
            '&:active': { cursor: 'grabbing' },
          }}
        >
          <DragIndicatorIcon fontSize="small" />
        </IconButton>
      </AppTooltip>
      <Box sx={{ flexGrow: 1, minWidth: 0 }}>{children}</Box>
    </Box>
  );
}

/**
 * Carte d'inventaire RÉORDONNABLE en grille (PER-223) : équivalent « colonnes » de
 * `SortableEquipmentRow`. Le tri s'étend à la grille 2D (`rectSortingStrategy` côté
 * `SortableContext`) — décision propriétaire, au-delà de la v1. La poignée de préhension
 * (`DragIndicator`) est FOURNIE à la carte via le render-prop `children(dragHandle)` : elle
 * se loge dans l'en-tête de la carte, à gauche du nom, et seule elle démarre le glisser
 * (`setActivatorNodeRef` + `listeners`) — les boutons de la carte restent cliquables.
 * `CSS.Translate` (translation seule, pas `Transform`) évite la déformation du contenu quand
 * @dnd-kit ajouterait un scale sur des cartes de hauteurs différentes.
 */
function SortableEquipmentCard({
  id,
  children,
}: {
  id: string;
  children: (dragHandle: ReactNode) => ReactNode;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id });
  const dragHandle = (
    <AppTooltip title="Glisser pour réordonner">
      <IconButton
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        size="small"
        aria-label="Réordonner cet objet"
        sx={{
          flexShrink: 0,
          p: 0.25,
          color: 'text.secondary',
          cursor: 'grab',
          // Indispensable en tactile : empêche le scroll de la page de capturer le geste.
          touchAction: 'none',
          '&:active': { cursor: 'grabbing' },
        }}
      >
        <DragIndicatorIcon fontSize="small" />
      </IconButton>
    </AppTooltip>
  );
  return (
    <Box
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      // Carte en cours de glissement : passe au-dessus + légèrement estompée.
      sx={{ ...(isDragging && { position: 'relative', zIndex: 1, opacity: 0.85 }) }}
    >
      {children(dragHandle)}
    </Box>
  );
}

/** Liste de l'équipement possédé, en lecture ou en édition. */
export function EquipmentList({
  equipment,
  onChange,
  onUse,
  onWear,
  characterClass,
  masteredIds,
  firearmsAllowed = true,
  extraMasteredWeaponIds,
  resolveWeaponAffinities,
  twoWeaponStatus,
  resolveArmorRestriction,
}: EquipmentListProps) {
  // Modale d'objet (PER-214) : `null` = fermée, `'new'` = création, un index = édition de
  // la ligne correspondante (bouton crayon, objet custom OU arme/armure/bouclier).
  const [itemEdit, setItemEdit] = useState<'new' | number | null>(null);
  // Descriptions ÉPINGLÉES sous le titre (bascule œil, PER-*). État d'affichage LOCAL,
  // volontairement non persisté : par défaut la description n'apparaît qu'au survol (tooltip).
  const [pinnedDesc, setPinnedDesc] = useState<Set<number>>(new Set());
  const togglePinned = (i: number) =>
    setPinnedDesc((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  const setLine = (i: number, line: EquipmentLine) =>
    onChange?.(equipment.map((l, j) => (j === i ? line : l)));
  const remove = (i: number) => onChange?.(equipment.filter((_, j) => j !== i));
  const addCatalog = (itemId: string) => onChange?.([...equipment, { itemId, quantity: 1 }]);
  const addLine = (line: EquipmentLine) => onChange?.([...equipment, line]);

  // Bascule « Organiser par catégorie » (PER-221) : préférence UI GLOBALE persistée
  // (localStorage), groupé par défaut. Le regroupement est purement VISUEL.
  const [grouped, setGrouped] = usePersistedBoolean('cof2-inventory-grouped', true);
  // Bascule d'affichage liste / colonnes (PER-223) : préférence UI GLOBALE persistée
  // (localStorage), orthogonale au regroupement. Défaut « liste » (rendu historique) —
  // le mode cartes est un opt-in. `true` = cartes, `false` = liste.
  const [cards, setCards] = usePersistedBoolean('cof2-inventory-cards', false);

  // Réordonnancement manuel (PER-222) : disponible en mode ÉDITION (`onChange`), à plat
  // uniquement (regroupement désactivé), et seulement s'il y a au moins deux lignes.
  const canReorder = !!onChange && !grouped && equipment.length > 1;
  // PointerSensor couvre souris + tactile + stylet ; une distance d'activation évite qu'un
  // simple clic sur la poignée ne déclenche un glisser. KeyboardSensor rend le tri accessible
  // au clavier (flèches haut/bas après Espace/Entrée sur la poignée).
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  // Identité STABLE par ligne pour @dnd-kit et pour la `key` React : un id qui SUIT l'objet-ligne
  // à travers un réordonnancement. `reorderEquipment` préserve les références d'objet, donc la
  // WeakMap reste valide après le drop. Un id fondé sur l'index changerait de cible au réordre :
  // @dnd-kit perdrait la trace de l'élément glissé et rejouerait une animation « retour à
  // l'origine puis re-déplacement », et React recréerait les nœuds au lieu de les déplacer.
  // WeakMap : aucune fuite, l'id d'une ligne supprimée disparaît avec elle.
  const lineIdsRef = useRef<{ map: WeakMap<object, string>; seq: number }>({
    map: new WeakMap(),
    seq: 0,
  });
  const lineId = (line: EquipmentLine): string => {
    const store = lineIdsRef.current;
    let id = store.map.get(line);
    if (!id) {
      id = `eq-${store.seq++}`;
      store.map.set(line, id);
    }
    return id;
  };
  const handleReorder = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    // `id` = identité stable de ligne : on retrouve les index courants pour réécrire l'ordre.
    const from = equipment.findIndex((l) => lineId(l) === active.id);
    const to = equipment.findIndex((l) => lineId(l) === over.id);
    if (from === -1 || to === -1) return;
    onChange?.(reorderEquipment(equipment, from, to));
  };
  // Ids stables alignés sur `equipment`, calculés UNE fois par rendu (consommés tels quels
  // par @dnd-kit et la `key` React). Le cache `lineId` (WeakMap) est un pur mémo — l'id d'un
  // objet-ligne est déterministe et immuable —, sa lecture en rendu est donc bénigne.
  // eslint-disable-next-line react-hooks/refs
  const rowIds = canReorder ? equipment.map(lineId) : [];

  if (equipment.length === 0 && !onChange) {
    return (
      <Typography variant="body2" color="text.secondary">
        Aucun équipement.
      </Typography>
    );
  }

  // Rendu d'UN objet d'inventaire, indexé par sa position d'ORIGINE `i` dans
  // `equipment` (les mutations setLine/remove/onWear/onUse passent par cet index).
  // Réutilisé par l'affichage à plat ET groupé (PER-221), en LIGNE (`variant: 'row'`,
  // défaut) ou en CARTE (`variant: 'card'`, mode colonnes PER-223) : le contenu (titre,
  // badges, actions) est construit une fois puis agencé selon le variant, pour ne pas
  // dupliquer la logique. En carte, `dragHandle` (fourni par `SortableEquipmentCard`) se
  // loge dans l'en-tête pour le tri en grille.
  const renderLine = (
    line: EquipmentLine,
    i: number,
    opts?: { variant?: 'row' | 'card'; dragHandle?: ReactNode },
  ) => {
    const asCard = opts?.variant === 'card';
    const custom = isCustomItem(line);
    // Type d'objet (PER-213) : sert à l'icône affichée à gauche du nom.
    const lineType = itemType(line);
    // Résolveur de variante (PER-211) : l'objet effectif porte les surcharges
    // d'instance (nom via `equipmentLabel`, DM/DEF/plafond AGI via `itemDetail`).
    const item = custom ? null : effectiveItem(line);
    // Dose d'élixir (objet custom nommé par `elixirItemName`) : on met en avant la CAPACITÉ
    // reproduite via une puce (sort choisi pour un mineur/majeur, sinon capacité du forgesort).
    const elixirFeatureId = custom ? ELIXIR_FEATURE_BY_ITEM.get(line.name) : undefined;
    // Détail STRUCTURÉ (DM des armes, DEF des protections) : toujours affiché en ligne.
    const structuredDetail = elixirFeatureId || custom || !item ? null : itemDetail(item);
    // Description LIBRE (notes du matériel du catalogue ou d'un objet custom) : masquée par
    // défaut, révélée au survol du titre (tooltip) et épinglable sous le titre via l'œil.
    const description = elixirFeatureId
      ? undefined
      : custom
        ? line.details
        : // Variante mécanique (PER-214) : sa description vit dans `overrides.description`
          // (hors catalogue) ; à défaut, description du matériel du catalogue.
          line.overrides?.description ??
          (item?.category === 'gear' ? item.description : undefined);
    const descPinned = pinnedDesc.has(i);
    // Bonus de DEF magique de l'objet enchanté (PER-85 généralisé) : porté par n'importe
    // quel objet (armure, mais aussi accessoire enchanté) et rendu à part de la DEF
    // mondaine, pour ne pas les confondre visuellement (retour propriétaire).
    const magicDef = line.magicDef;
    // Objet équipable dans un emplacement DÉDIÉ (armure, bouclier, main) : ouvre aussi le
    // crayon d'édition « variante mécanique ».
    const equippable =
      !!item && (item.category === 'armor' || item.category === 'shield' || item.category === 'weapon');
    // Objet ÉQUIPABLE (PER-220, resserré) : seul ce qui a vraiment vocation à être porté
    // expose un contrôle d'équipement —
    //  - arme / armure / bouclier (emplacement dédié) ;
    //  - matériel du catalogue explicitement équipable (`equipSlot` : torche, grimoire,
    //    instrument, sac à dos, carquois…) ;
    //  - tout objet portant un bonus de DEF MAGIQUE (anneau/cape enchantés, objet libre
    //    compris — PER-85), qui doit pouvoir être porté pour compter.
    // Le reste du matériel (corde, ration…) et les placeholders de choix ne sont plus
    // « équipables » : fini le bouton « Équiper » inutile sur chaque ligne.
    const wearable =
      (!!item &&
        (item.category === 'weapon' ||
          item.category === 'armor' ||
          item.category === 'shield' ||
          (item.category === 'gear' && !!item.equipSlot))) ||
      !!line.magicDef;
    // Arme à poudre INDISPONIBLE (PER-185, retour PER-93) : autorisation effective des armes
    // à feu à `false` (campagne « pas d'arme à feu » ou choix du joueur). La ligne est grisée
    // et avertie, mais conservée — le MJ garde la liberté de la garder pour le style.
    // L'identité « arme à feu » se lit sur l'id de BASE (une variante n'y change rien).
    const firearmUnavailable = !custom && !firearmsAllowed && isFirearmItemId(line.itemId);
    // === Pièces de contenu PARTAGÉES entre la ligne (row) et la carte (card) ===

    // Titre : nom d'élixir (puce de capacité) OU icône de type + nom (+ détail structuré,
    // badge DEF magique, bascule œil, crayon d'édition).
    const titleContent = elixirFeatureId ? (
      // Nom d'élixir : « Élixir — » suivi de la puce de la capacité reproduite (couleurs +
      // icône du profil source, cf. CapabilityChip — style unique lisible sur tout fond).
      <Typography
        variant="body2"
        component="span"
        sx={{ fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 0.5 }}
      >
        <ItemTypeIcon type={lineType} sx={{ color: 'text.secondary' }} />
        Élixir —
        <CapabilityChip featureId={elixirFeatureId} label={null} />
      </Typography>
    ) : (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
          flexWrap: 'wrap',
          // Arme à feu indisponible : titre + détail grisés (PER-185).
          ...(firearmUnavailable && { opacity: 0.5 }),
        }}
      >
        {/* Icône du type d'objet (PER-213), teinte neutre, à gauche du nom. */}
        <ItemTypeIcon type={lineType} sx={{ color: 'text.secondary' }} />
        {/* Titre de l'objet. S'il porte une description libre, il devient survolable
            (tooltip) — la description reste masquée par défaut. */}
        {description ? (
          <AppTooltip title={<GlossaryText>{description}</GlossaryText>} maxWidth={360}>
            <Typography variant="body2" component="span" sx={{ fontWeight: 500, cursor: 'help' }}>
              {equipmentLabel(line, characterClass)}
            </Typography>
          </AppTooltip>
        ) : (
          <Typography variant="body2" component="span" sx={{ fontWeight: 500 }}>
            {equipmentLabel(line, characterClass)}
          </Typography>
        )}
        {structuredDetail && (
          <Typography variant="caption" color="text.secondary" component="span">
            {structuredDetail}
          </Typography>
        )}
        {magicDef ? <MagicDefBadge value={magicDef} /> : null}
        {/* Bascule œil : épingle la description sous le titre (état d'affichage local). */}
        {description && (
          <AppTooltip title={descPinned ? 'Masquer la description' : 'Afficher la description'}>
            <IconButton
              size="small"
              onClick={() => togglePinned(i)}
              sx={{ p: 0.25 }}
              aria-label={descPinned ? 'Masquer la description' : 'Afficher la description'}
            >
              {descPinned ? (
                <VisibilityIcon fontSize="inherit" />
              ) : (
                <VisibilityOffOutlinedIcon fontSize="inherit" />
              )}
            </IconButton>
          </AppTooltip>
        )}
        {/* Crayon (mode édition, PER-214) : ouvre la modale d'édition. Présent sur les objets
            custom ET sur toute arme/armure/bouclier (ref catalogue ou variante) — sur une ref
            simple, la 1re modification écrit `overrides` et elle devient une variante. Absent
            du matériel/consommable du catalogue. */}
        {onChange && (custom || equippable) && (
          <AppTooltip title="Modifier l’objet">
            <IconButton
              size="small"
              onClick={() => setItemEdit(i)}
              sx={{ p: 0.25 }}
              aria-label="Modifier l’objet"
            >
              <EditOutlinedIcon fontSize="inherit" />
            </IconButton>
          </AppTooltip>
        )}
      </Box>
    );

    // Description ÉPINGLÉE sous le titre (œil ouvert).
    const pinnedDescription =
      description && descPinned ? (
        <Typography
          variant="caption"
          color="text.secondary"
          component="div"
          sx={{ mt: 0.25, whiteSpace: 'pre-line' }}
        >
          <GlossaryText>{description}</GlossaryText>
        </Typography>
      ) : null;

    // Badges d'état : port (contrôles/badge), maîtrise, combat à deux armes, affinité, arme à feu.
    const stateBadges = (
      <>
        {/* État de port (PER-77) : contrôles équiper/déséquiper si disponibles (état de jeu,
            hors mode édition), sinon un simple badge « équipé » en lecture. */}
        {wearable && onWear && (
          <Box sx={{ mt: 0.5 }}>
            <WornControls line={line} onWear={(w) => onWear(i, w)} />
          </Box>
        )}
        {wearable && !onWear && line.worn && (
          <Box sx={{ mt: 0.5 }}>
            <WornBadge worn={line.worn} />
          </Box>
        )}
        {/* Indicateur consultatif (PER-80) : armure trop lourde / bouclier interdit pour le
            profil → badge sur la ligne équipée fautive (pendant du badge « Non maîtrisée »). */}
        {resolveArmorRestriction && <ArmorRestrictionBadge violation={resolveArmorRestriction(line)} />}
        {/* Indicateur consultatif (PER-79) : arme en main non maîtrisée → dé malus. */}
        {masteredIds && (
          <WeaponMasteryBadge
            line={line}
            masteredIds={masteredIds}
            firearmsAllowed={firearmsAllowed}
            extraMasteredWeaponIds={extraMasteredWeaponIds}
          />
        )}
        {/* Indicateur consultatif (PER-116) : arme tenue en main → dé malus du combat
            à deux armes (p. 215), sauf exemption Combattant héroïque (p. 73). */}
        {twoWeaponStatus && <TwoWeaponPenaltyBadge line={line} status={twoWeaponStatus} />}
        {/* Affinité d'arme (PER-218) : badge POSITIF si l'arme est spéciale pour le perso
            (arme sacrée du prêtre spécialiste). S'affiche sur l'objet du catalogue, porté ou non. */}
        {resolveWeaponAffinities && !custom && item?.category === 'weapon' && (
          <WeaponAffinityBadge affinities={resolveWeaponAffinities(line.itemId)} />
        )}
        {/* Avertissement (PER-185) : arme à poudre grisée quand la poudre est indisponible. */}
        {firearmUnavailable && <FirearmUnavailableBadge />}
      </>
    );

    // Contrôle de quantité : champ éditable (édition) ou « ×N » (lecture, masqué si N=1). Le
    // bonus de DEF MAGIQUE (PER-85) se saisit dans la modale (crayon), plus en ligne (PER-214).
    const quantityControl = onChange ? (
      <TextField
        type="number"
        size="small"
        label="Qté"
        value={line.quantity}
        onChange={(e) => setLine(i, { ...line, quantity: Math.max(1, Number(e.target.value) || 1) })}
        sx={{ width: 80 }}
      />
    ) : line.quantity > 1 ? (
      <Typography
        variant="body1"
        color="text.secondary"
        sx={{ fontWeight: 700, fontSize: '1.1rem', flexShrink: 0 }}
      >
        ×{line.quantity}
      </Typography>
    ) : null;

    // Puce « Choisir » (PER-220) : rappelle qu'une ligne placeholder (choix « X ou Y » d'un
    // profil, ou Bourse de départ) est INDICATIVE et à résoudre. Purement visuelle.
    const choiceBadge =
      onUse && (isStartingChoiceLine(line) || isCoinPouchLine(line)) ? <ChoiceBadge /> : null;
    // « Utiliser » (état de jeu, dispo hors édition) : route (via `onUse`) vers un choix de
    // départ (PER-220), la Bourse de départ, ou un consommable (décrément/suppression).
    const useButton =
      onUse && (isConsumable(line) || isStartingChoiceLine(line)) ? (
        <Button size="small" variant="outlined" onClick={() => onUse(i)} sx={{ flexShrink: 0 }}>
          Utiliser
        </Button>
      ) : null;
    const deleteButton = onChange ? (
      <IconButton size="small" color="error" onClick={() => remove(i)}>
        <DeleteOutlineIcon fontSize="small" />
      </IconButton>
    ) : null;

    // === Carte verticale compacte (PER-223, mode colonnes) ===
    if (asCard) {
      // En-tête (poignée de tri éventuelle + titre), corps (description épinglée + badges),
      // pied (quantité + Choisir/Utiliser/Supprimer). Un espaceur pousse le pied en bas pour
      // que les cartes d'une même rangée s'alignent (`height: 100%` + grille en `stretch`).
      const hasFooter = !!(quantityControl || choiceBadge || useButton || deleteButton);
      return (
        <Box
          key={i}
          sx={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            p: 1,
            border: 1,
            borderColor: 'divider',
            borderRadius: 1,
            // Carte PORTÉE : léger fond teinté, comme la ligne (PER-77).
            ...(line.worn && { bgcolor: (theme) => alpha(theme.palette.success.main, 0.06) }),
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5 }}>
            {opts?.dragHandle}
            <Box sx={{ flexGrow: 1, minWidth: 0 }}>{titleContent}</Box>
          </Box>
          {pinnedDescription}
          {stateBadges}
          {/* Espaceur : pousse le pied de carte en bas (hauteur régulière entre cartes). */}
          <Box sx={{ flexGrow: 1 }} />
          {hasFooter && (
            <>
              <Divider sx={{ mt: 0.75 }} />
              <Stack
                direction="row"
                spacing={0.5}
                sx={{ alignItems: 'center', mt: 0.75, flexWrap: 'wrap', rowGap: 0.5 }}
              >
                {quantityControl}
                <Box
                  sx={{
                    ml: 'auto',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                    flexWrap: 'wrap',
                    justifyContent: 'flex-end',
                  }}
                >
                  {choiceBadge}
                  {useButton}
                  {deleteButton}
                </Box>
              </Stack>
            </>
          )}
        </Box>
      );
    }

    // === Ligne horizontale (variant « row ») — rendu historique inchangé ===
    return (
      <Stack
        key={i}
        direction="row"
        spacing={1}
        sx={{
          alignItems: 'center',
          py: 0.75,
          // Ligne PORTÉE : léger fond teinté pour distinguer d'un coup d'œil (PER-77).
          ...(line.worn && {
            px: 1,
            borderRadius: 1,
            bgcolor: (theme) => alpha(theme.palette.success.main, 0.06),
          }),
        }}
      >
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          {titleContent}
          {pinnedDescription}
          {stateBadges}
        </Box>
        {quantityControl}
        {choiceBadge}
        {useButton}
        {deleteButton}
      </Stack>
    );
  };

  return (
    <Stack spacing={onChange ? 1.5 : 0}>
      {/* Conflits de port DURS (bouclier + arme à 2 mains, >1 armure/bouclier) — non bloquant (PER-77). */}
      <EquipConflictsAlert equipment={equipment} />
      {/* Bascules d'affichage, préférences UI globales persistées et ORTHOGONALES : liste /
          colonnes (PER-223) et regroupement par catégorie (PER-221). Affichées dès qu'il y a
          au moins un objet d'inventaire. */}
      {equipment.length > 0 && (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
          <InventoryViewToggle cards={cards} onChange={setCards} />
          <InventoryLayoutToggle grouped={grouped} onChange={setGrouped} />
        </Box>
      )}
      {grouped && equipment.length > 0 ? (
        // Affichage GROUPÉ (PER-221) : un bloc par type d'objet présent, en-tête + lignes/cartes
        // (PER-223). `groupEquipmentByType` conserve l'index d'origine de chaque objet pour les
        // mutations. Le tri par glisser-déposer est désactivé en groupé (réordonner entre
        // catégories serait ambigu), quel que soit le layout.
        <Stack spacing={1.5}>
          {groupEquipmentByType(equipment).map((group) => (
            <Box key={group.type}>
              <GroupHeader type={group.type} count={group.entries.length} />
              {cards ? (
                <Box sx={{ mt: 1 }}>
                  <CardGrid>
                    {group.entries.map((e) => renderLine(e.line, e.index, { variant: 'card' }))}
                  </CardGrid>
                </Box>
              ) : (
                <Stack divider={<Divider />}>
                  {group.entries.map((e) => renderLine(e.line, e.index))}
                </Stack>
              )}
            </Box>
          ))}
        </Stack>
      ) : canReorder ? (
        // Affichage À PLAT, RÉORDONNABLE (PER-222/223) : chaque objet devient triable par
        // glisser-déposer. En LISTE, tri vertical (poignée à gauche, axe borné à la verticale) ;
        // en CARTES, tri en grille 2D (`rectSortingStrategy`, poignée dans l'en-tête). L'ordre
        // n'est réécrit qu'au drop (`handleReorder`, via `reorderEquipment`).
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          modifiers={
            cards ? [restrictToParentElement] : [restrictToVerticalAxis, restrictToParentElement]
          }
          onDragEnd={handleReorder}
        >
          <SortableContext
            items={rowIds}
            strategy={cards ? rectSortingStrategy : verticalListSortingStrategy}
          >
            {cards ? (
              <CardGrid>
                {equipment.map((line, i) => (
                  <SortableEquipmentCard key={rowIds[i]} id={rowIds[i]}>
                    {(dragHandle) => renderLine(line, i, { variant: 'card', dragHandle })}
                  </SortableEquipmentCard>
                ))}
              </CardGrid>
            ) : (
              <Stack divider={<Divider />}>
                {equipment.map((line, i) => (
                  <SortableEquipmentRow key={rowIds[i]} id={rowIds[i]}>
                    {renderLine(line, i)}
                  </SortableEquipmentRow>
                ))}
              </Stack>
            )}
          </SortableContext>
        </DndContext>
      ) : cards && equipment.length > 0 ? (
        // Affichage À PLAT en CARTES (PER-223), non réordonnable (lecture seule, ou < 2 objets).
        <CardGrid>{equipment.map((line, i) => renderLine(line, i, { variant: 'card' }))}</CardGrid>
      ) : (
        // Affichage À PLAT en LIGNES : ordre stocké, comme avant PER-221.
        <Stack divider={<Divider />}>
          {equipment.map((line, i) => renderLine(line, i))}
          {equipment.length === 0 && onChange && (
            <Typography variant="body2" color="text.secondary" sx={{ py: 0.75 }}>
              Aucun équipement.
            </Typography>
          )}
        </Stack>
      )}

      {onChange && (
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Sélecteur du catalogue GROUPÉ PAR TYPE d'objet (en-têtes icône + libellé),
              même mise en forme que le sélecteur de rang de voie (FeaturePathAutocomplete). */}
          <EquipmentCatalogAutocomplete
            options={equipmentCatalog}
            onSelect={addCatalog}
            sx={{ flexGrow: 1, minWidth: 240 }}
          />
          <Button startIcon={<AddIcon />} onClick={() => setItemEdit('new')} size="small">
            Objet personnalisé
          </Button>
        </Stack>
      )}

      {onChange &&
        itemEdit !== null &&
        (() => {
          // Ligne éditée (mode édition) ou undefined (mode création). `key` remonte la
          // modale à chaque ouverture → les valeurs initiales servent d'état initial.
          const editing = itemEdit !== 'new' ? equipment[itemEdit] : undefined;
          return (
            <ItemDialog
              key={itemEdit}
              open
              onClose={() => setItemEdit(null)}
              initial={editing}
              onConfirm={(line) => {
                if (itemEdit === 'new') addLine(line);
                else setLine(itemEdit, line);
                setItemEdit(null);
              }}
            />
          );
        })()}
    </Stack>
  );
}
