'use client';

import { useState, type ReactNode } from 'react';
import AddIcon from '@mui/icons-material/Add';
import AltRouteIcon from '@mui/icons-material/AltRoute';
import CategoryOutlinedIcon from '@mui/icons-material/CategoryOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import NoMeetingRoomOutlinedIcon from '@mui/icons-material/NoMeetingRoomOutlined';
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
  EquipConflictsAlert,
  TwoWeaponPenaltyBadge,
  WeaponAffinityBadge,
  WeaponMasteryBadge,
  WornBadge,
  WornControls,
} from '@/components/sheet/WornEquipmentControls';
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
      style={{ transform: CSS.Transform.toString(transform), transition }}
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
  const handleReorder = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    // `id` = index d'origine (chaîne). Réécrit l'ordre du tableau et remonte via `onChange`.
    onChange?.(reorderEquipment(equipment, Number(active.id), Number(over.id)));
  };

  if (equipment.length === 0 && !onChange) {
    return (
      <Typography variant="body2" color="text.secondary">
        Aucun équipement.
      </Typography>
    );
  }

  // Rendu d'UNE ligne d'inventaire, indexée par sa position d'ORIGINE `i` dans
  // `equipment` (les mutations setLine/remove/onWear/onUse passent par cet index).
  // Réutilisé tel quel par l'affichage à plat ET par l'affichage groupé (PER-221) :
  // le regroupement étant purement visuel, l'index d'origine reste la clé stable.
  const renderLine = (line: EquipmentLine, i: number) => {
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
          {elixirFeatureId ? (
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
                // Ligne d'arme à feu indisponible : titre + détail grisés (PER-185).
                ...(firearmUnavailable && { opacity: 0.5 }),
              }}
            >
              {/* Icône du type d'objet (PER-213), teinte neutre, à gauche du nom. */}
              <ItemTypeIcon type={lineType} sx={{ color: 'text.secondary' }} />
              {/* Titre de l'objet. S'il porte une description libre, il devient survolable
                  (tooltip) — la description reste masquée par défaut. */}
              {description ? (
                <AppTooltip title={<GlossaryText>{description}</GlossaryText>} maxWidth={360}>
                  <Typography
                    variant="body2"
                    component="span"
                    sx={{ fontWeight: 500, cursor: 'help' }}
                  >
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
              {/* Crayon (mode édition, PER-214) : ouvre la modale d'édition. Présent sur
                  les objets custom ET sur toute arme/armure/bouclier (ref catalogue ou
                  variante) — sur une ref simple, la 1re modification écrit `overrides` et
                  elle devient une variante. Absent du matériel/consommable du catalogue. */}
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
          )}
          {/* Description ÉPINGLÉE sous le titre (œil ouvert). */}
          {description && descPinned && (
            <Typography
              variant="caption"
              color="text.secondary"
              component="div"
              sx={{ mt: 0.25, whiteSpace: 'pre-line' }}
            >
              <GlossaryText>{description}</GlossaryText>
            </Typography>
          )}
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
        </Box>
        {/* Le bonus de DEF MAGIQUE de l'armure (PER-85) se saisit désormais dans la
            modale d'édition (crayon), plus en ligne (retour recette PER-214). */}
        {onChange ? (
          <TextField
            type="number"
            size="small"
            label="Qté"
            value={line.quantity}
            onChange={(e) =>
              setLine(i, { ...line, quantity: Math.max(1, Number(e.target.value) || 1) })
            }
            sx={{ width: 80 }}
          />
        ) : (
          line.quantity > 1 && (
            <Typography
              variant="body1"
              color="text.secondary"
              sx={{ fontWeight: 700, fontSize: '1.1rem', flexShrink: 0 }}
            >
              ×{line.quantity}
            </Typography>
          )
        )}
        {/* Puce « Choisir » (PER-220), à côté du bouton « Utiliser » : rappelle qu'une ligne
            placeholder (choix « X ou Y » d'un profil, ou Bourse de départ) est INDICATIVE et
            à résoudre. Purement visuelle. */}
        {onUse && (isStartingChoiceLine(line) || isCoinPouchLine(line)) && <ChoiceBadge />}
        {/* « Utiliser » : à DROITE du nombre (état de jeu, dispo hors édition). Selon la ligne,
            l'appelant (`onUse`) route vers :
             - un CHOIX de départ à résoudre (`startingChoice`, PER-220) → modale de choix ;
             - la Bourse de départ → modale de saisie des pa (CoinPouchDialog) ;
             - un consommable (potion, parchemin, dose d'élixir) → décrément/suppression.
            Jamais sur le matériel durable ordinaire. */}
        {onUse && (isConsumable(line) || isStartingChoiceLine(line)) && (
          <Button
            size="small"
            variant="outlined"
            onClick={() => onUse(i)}
            sx={{ flexShrink: 0 }}
          >
            Utiliser
          </Button>
        )}
        {onChange && (
          <IconButton size="small" color="error" onClick={() => remove(i)}>
            <DeleteOutlineIcon fontSize="small" />
          </IconButton>
        )}
      </Stack>
    );
  };

  return (
    <Stack spacing={onChange ? 1.5 : 0}>
      {/* Conflits de port DURS (bouclier + arme à 2 mains, >1 armure/bouclier) — non bloquant (PER-77). */}
      <EquipConflictsAlert equipment={equipment} />
      {/* Bascule d'affichage (PER-221) : « Par catégorie » / « À plat », préférence UI
          globale persistée. Affichée dès qu'il y a au moins une ligne d'inventaire. */}
      {equipment.length > 0 && (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <InventoryLayoutToggle grouped={grouped} onChange={setGrouped} />
        </Box>
      )}
      {grouped && equipment.length > 0 ? (
        // Affichage GROUPÉ (PER-221) : un bloc par type d'objet présent, en-tête + lignes.
        // `groupEquipmentByType` conserve l'index d'origine de chaque ligne pour les mutations.
        <Stack spacing={1.5}>
          {groupEquipmentByType(equipment).map((group) => (
            <Box key={group.type}>
              <GroupHeader type={group.type} count={group.entries.length} />
              <Stack divider={<Divider />}>
                {group.entries.map((e) => renderLine(e.line, e.index))}
              </Stack>
            </Box>
          ))}
        </Stack>
      ) : canReorder ? (
        // Affichage À PLAT, RÉORDONNABLE (PER-222) : chaque ligne devient triable par
        // glisser-déposer (poignée à gauche). Le glisser est borné à l'axe vertical et au
        // conteneur ; l'ordre n'est réécrit qu'au drop (`handleReorder`).
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          modifiers={[restrictToVerticalAxis, restrictToParentElement]}
          onDragEnd={handleReorder}
        >
          <SortableContext
            items={equipment.map((_, i) => String(i))}
            strategy={verticalListSortingStrategy}
          >
            <Stack divider={<Divider />}>
              {equipment.map((line, i) => (
                <SortableEquipmentRow key={i} id={String(i)}>
                  {renderLine(line, i)}
                </SortableEquipmentRow>
              ))}
            </Stack>
          </SortableContext>
        </DndContext>
      ) : (
        // Affichage À PLAT : ordre stocké, comme avant PER-221.
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
