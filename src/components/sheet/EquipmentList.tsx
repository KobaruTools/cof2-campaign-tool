'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import AddIcon from '@mui/icons-material/Add';
import AltRouteIcon from '@mui/icons-material/AltRoute';
import AutoAwesomeOutlinedIcon from '@mui/icons-material/AutoAwesomeOutlined';
import CategoryOutlinedIcon from '@mui/icons-material/CategoryOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import GpsFixedOutlinedIcon from '@mui/icons-material/GpsFixedOutlined';
import KeyboardDoubleArrowRightIcon from '@mui/icons-material/KeyboardDoubleArrowRight';
import LooksTwoOutlinedIcon from '@mui/icons-material/LooksTwoOutlined';
import NoMeetingRoomOutlinedIcon from '@mui/icons-material/NoMeetingRoomOutlined';
import ReportProblemOutlinedIcon from '@mui/icons-material/ReportProblemOutlined';
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
import type { CharacterClass, EquipmentItem, PrestigeCategory, WeaponFamily } from '@/data/schema';
import type {
  EquipmentLine,
  ItemType,
  LoadedAmmunitionKind,
  WornState,
} from '@/lib/character/types';
import type { LoadingContext, WeaponLoadingState } from '@/lib/character/weaponLoading';
import type { GrantedItem } from '@/lib/character/grantedEquipment';
import { weaponLoadingState } from '@/lib/character/weaponLoading';
import { MAX_CHARGE_DOTS, itemChargeState, type ItemChargeState } from '@/lib/character/itemCharges';
import { isCustomItem } from '@/lib/character/types';
import {
  effectiveItem,
  groupEquipmentByType,
  lineAllowsQuantity,
  reorderEquipment,
} from '@/lib/character/items';
import { usePersistedBoolean } from '@/lib/ui/usePersistedBoolean';
import { usePersistedStringSet } from '@/lib/ui/usePersistedStringSet';
import { storageKeys } from '@/lib/storage/keys';
import { isFirearmItemId } from '@/lib/character/firearms';
import { elixirFeatureIdByItemName } from '@/lib/character/elixirs';
import { parseCoinPouchName } from '@/lib/character/coinPouch';
import { isConsumable } from '@/lib/character/consumables';
import { isStartingChoiceLine } from '@/lib/character/startingChoices';
import { equipmentLabel } from '@/components/wizard/helpers';
import type { Abilities } from '@/lib/engine';
import { AbilityValueChip } from '@/components/sheet/FeatureRichText';
import { AppAlert } from '@/components/AppAlert';
import { AppTooltip } from '@/components/AppTooltip';
import { ItemTypeIcon } from '@/components/ItemTypeIcon';
import { ItemIcon } from '@/components/ItemIcon';
import { itemIconId } from '@/lib/ui/itemIcon';
import {
  itemTypeColor,
  itemTypeHeaderBorder,
  itemTypeSectionGradient,
} from '@/lib/ui/itemTypeColors';
import { ItemDialog, ITEM_TYPE_LABELS } from '@/components/sheet/ItemDialog';
import {
  MagicDefBadge,
  MagicWeaponBonusBadge,
  MagicPropertyBadges,
  AbilityBonusBadges,
  DerivedBonusBadges,
  TestBonusBadges,
} from '@/components/sheet/MagicItemBadges';
import { GiveItemButton } from '@/components/sheet/GiveItemButton';
import { WeaponCriticalRangeBadge } from '@/components/sheet/WeaponCriticalRangeBadge';
import { BoundWeaponBadge } from '@/components/sheet/BoundWeaponBadge';
import type { WeaponLineCriticalRange } from '@/components/sheet/weaponCriticalRange';
import { EquipmentCatalogAutocomplete } from '@/components/sheet/EquipmentCatalogAutocomplete';
import { WeldedBarPinButton, WELDED_BUTTON_HEIGHT } from '@/components/sheet/WeldedBarPinButton';
import { PageRefText, SourceRef } from '@/components/SourceRef';
import { DamageValue } from '@/components/DamageValue';
import { formatWeaponDamage } from '@/lib/character/weaponDamage';
import { CapabilityChip, GlossaryRichText, GlossaryText } from '@/components/sheet/FeatureRichText';
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
function itemDetail(item: EquipmentItem, level?: number, abilities?: Abilities): ReactNode {
  switch (item.category) {
    case 'weapon':
      return (
        <>
          <GlossaryText>DM</GlossaryText>{' '}
          <DamageValue damage={formatWeaponDamage(item.damage, level)} />
          {item.twoHandedDamage && (
            <>
              /<DamageValue damage={formatWeaponDamage(item.twoHandedDamage, level)} />
            </>
          )}
          {/* Carac ajoutée par l'ARME (PER-286, couleuvrine « [5d4° + INT] », p. 63) : rendue comme
              sur la carte d'attaque — puce de VALEUR courante, pas un simple libellé. */}
          {item.damageAbility && abilities && (
            <>
              {' + '}
              <AbilityValueChip ability={item.damageAbility} value={abilities[item.damageAbility]} />
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

/**
 * Munitions chargées d'une arme à recharger (PER-284) — arbalète ou arme à poudre : UNE PASTILLE PAR
 * COUP, dans l'ordre de tir (la première part la prochaine), sur le patron des pastilles d'usages
 * « une fois par jour » d'un rang. Pastille BLANCHE = munition normale, JAUNE = grenaille (Tir de
 * grenaille, p. 63), CREUSE = emplacement vide à recharger. Le joueur est donc libre du mélange
 * (« deux grenailles puis des balles normales ») et le voit d'un coup d'œil.
 *
 * Au-delà de 12 coups, on retombe sur le seul décompte (des pastilles innombrables ne renseignent
 * plus). Bloc CUSTOM (convention projet : pas de `Chip` MUI), verbatim du livre en infobulle.
 */
function WeaponLoadingDots({ state }: { state: WeaponLoadingState }) {
  const { loaded, capacity, empty, shots, nextShot, reloadAction, refillCost } = state;
  const grapeshotCount = shots.filter((s) => s === 'grapeshot').length;
  return (
    <AppTooltip
      title={
        <PageRefText>
          {[
            `${loaded} coup${loaded > 1 ? 's' : ''} prêt${loaded > 1 ? 's' : ''} sur ${capacity}.`,
            nextShot
              ? `Prochain tir : ${nextShot === 'grapeshot' ? 'GRENAILLE' : 'munition normale'}.`
              : 'Arme déchargée : elle doit être rechargée avant de tirer.',
            state.shotsPerFire > 1
              ? 'Canon double : un tir consomme 2 projectiles (p. 63).'
              : null,
            refillCost
              ? `Faire le plein : ${refillCost.count} action${refillCost.count > 1 ? 's' : ''} ${
                  reloadAction === 'M' ? 'de mouvement (M)' : 'limitée(s) (L)'
                } (p. 185).`
              : null,
            grapeshotCount > 0
              ? 'Grenaille : au tir (L), un seul test d’attaque contre toutes les cibles dans un cône de 10 m de long et 5 m de large ; celles dont il atteint la DEF subissent la moitié des DM habituels (p. 63).'
              : null,
            'Il n’est pas possible de recharger une arbalète ou une arme à poudre si vous avez un adversaire actif (par opposition à incapable d’agir) à votre contact (p. 187).',
          ]
            .filter(Boolean)
            .join(' ')}
        </PageRefText>
      }
    >
      <Box
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0.5,
          flexWrap: 'wrap',
          cursor: 'help',
        }}
      >
        <GpsFixedOutlinedIcon
          sx={{ fontSize: 14, color: empty ? 'text.disabled' : 'text.secondary' }}
        />
        {capacity <= 12 &&
          Array.from({ length: capacity }).map((_, i) => {
            const shot = shots[i];
            return (
              <Box
                key={i}
                sx={(theme) => ({
                  width: 9,
                  height: 9,
                  borderRadius: '50%',
                  border: 1,
                  borderColor:
                    shot === 'grapeshot'
                      ? theme.palette.warning.main
                      : shot
                        ? alpha(theme.palette.text.primary, 0.55)
                        : alpha(theme.palette.text.disabled, 0.6),
                  bgcolor:
                    shot === 'grapeshot'
                      ? theme.palette.warning.main
                      : shot
                        ? theme.palette.common.white
                        : 'transparent',
                })}
              />
            );
          })}
        <Typography
          variant="caption"
          sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: 'text.secondary' }}
        >
          {loaded}/{capacity}
        </Typography>
      </Box>
    </AppTooltip>
  );
}

/**
 * Charges d'un objet (PER-294) — baguette, sceptre, talisman : UNE PASTILLE PAR CHARGE, sur le
 * patron exact des munitions d'une arme (`WeaponLoadingDots`) et des usages « une fois par jour »
 * d'un rang. Pastille PLEINE = charge disponible, CREUSE = charge dépensée, suivies du décompte
 * « N/M ». Au-delà de `MAX_CHARGE_DOTS`, le décompte seul.
 *
 * Une seule couleur, contrairement aux munitions : toutes les charges sont identiques, il n'y a
 * aucune « nature » à distinguer (pas d'équivalent de la grenaille). L'infobulle rappelle la
 * politique de rechargement de CET objet — c'est la seule information non lisible sur les pastilles.
 * Bloc CUSTOM (convention projet : pas de `Chip` MUI).
 */
function ItemChargeDots({ state }: { state: ItemChargeState }) {
  const { max, remaining, empty, onShortRest, onLongRest } = state;
  const recharge = onShortRest
    ? onLongRest
      ? 'Se recharge à plein au repos court comme au repos long.'
      : 'Se recharge à plein au repos court (et donc au repos long).'
    : onLongRest
      ? 'Se recharge à plein au repos long.'
      : 'Ne se recharge qu’à la main : aucun repos ne le remplit.';
  return (
    <AppTooltip
      title={
        <>
          {`${remaining} charge${remaining > 1 ? 's' : ''} disponible${
            remaining > 1 ? 's' : ''
          } sur ${max}. `}
          {empty ? 'Objet épuisé : il doit être rechargé avant d’être utilisé. ' : ''}
          {recharge}
        </>
      }
    >
      <Box
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0.5,
          flexWrap: 'wrap',
          cursor: 'help',
        }}
      >
        <AutoAwesomeOutlinedIcon
          sx={{ fontSize: 14, color: empty ? 'text.disabled' : 'secondary.main' }}
        />
        {max <= MAX_CHARGE_DOTS &&
          Array.from({ length: max }).map((_, i) => {
            // Les charges disponibles sont en TÊTE : les pastilles se vident par la droite, comme
            // les usages d'un rang — on lit « il m'en reste deux » sans compter les creuses.
            const available = i < remaining;
            return (
              <Box
                key={i}
                sx={(theme) => ({
                  width: 9,
                  height: 9,
                  borderRadius: '50%',
                  border: 1,
                  borderColor: available
                    ? theme.palette.secondary.main
                    : alpha(theme.palette.text.disabled, 0.6),
                  bgcolor: available ? theme.palette.secondary.main : 'transparent',
                })}
              />
            );
          })}
        <Typography
          variant="caption"
          sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: 'text.secondary' }}
        >
          {remaining}/{max}
        </Typography>
      </Box>
    </AppTooltip>
  );
}

/**
 * Chip « Canon double » (PER-284) : signale que CETTE arme a été bricolée d'un second canon
 * (`artilleur-r4`, p. 63), à droite de ses munitions. Purement informative — l'infobulle rappelle
 * comment l'effet fonctionne, verbatim, avec le renvoi au livre. Bloc CUSTOM (convention projet :
 * pas de `Chip` MUI).
 */
function DoubleBarrelChip() {
  return (
    <AppTooltip
      title={
        <>
          <PageRefText>
            Second canon bricolé par l’arquebusier : le dé de DM de l’arme est DOUBLÉ (mais pas les
            dés bonus ni les bonus), et le critique triple le dé au lieu de le quadrupler. Chaque
            canon se recharge individuellement et un tir consomme 2 projectiles. La double détente
            permet de ne décharger qu’un seul canon à la fois — aux dommages normaux, alors.
          </PageRefText>{' '}
          <SourceRef page={63} section="Canon double" term="Canon double" />
        </>
      }
    >
      <Box
        component="span"
        sx={(theme) => ({
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0.25,
          px: 0.75,
          height: 22,
          borderRadius: 1,
          fontSize: '0.72rem',
          fontWeight: 700,
          whiteSpace: 'nowrap',
          cursor: 'help',
          color: theme.palette.info.main,
          bgcolor: alpha(theme.palette.info.main, 0.12),
          border: `1px solid ${alpha(theme.palette.info.main, 0.45)}`,
        })}
      >
        <LooksTwoOutlinedIcon sx={{ fontSize: 15 }} />
        Canon double
      </Box>
    </AppTooltip>
  );
}

/**
 * Avertissement « canon double sous-alimenté » (PER-284) : il ne reste qu'un coup alors que l'effet
 * en consomme deux (p. 63). NON bloquant — le livre autorise « de décharger un seul canon à la
 * fois » —, mais le dé de DM doublé, lui, ne s'applique pas : c'est ce que le badge annonce.
 * Bloc CUSTOM (convention projet : pas de `Chip` MUI), verbatim en infobulle.
 */
function DoubleBarrelUnderfedBadge() {
  return (
    <Box sx={{ mt: 0.5 }}>
      <AppTooltip
        title={
          <PageRefText>
            Un canon double consomme 2 projectiles : avec un seul coup chargé, le dé de DM doublé ne
            s’applique pas. Le tir reste possible — « il reste possible de décharger un seul canon à
            la fois » —, mais aux dommages normaux de l’arme (p. 63).
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
          <ReportProblemOutlinedIcon sx={{ fontSize: 14 }} />
          Canon double : 1 coup sur 2 — DM non doublés
        </Box>
      </AppTooltip>
    </Box>
  );
}

/**
 * Ligne « Bourse de NdM {monnaie} » (résolue par `CoinPouchDialog`) — bourse de départ
 * (p. 31) OU bourse générique créée depuis les Outils du MJ (extension PER-200).
 */
function isCoinPouchLine(line: EquipmentLine): boolean {
  return isCustomItem(line) && parseCoinPouchName(line.name) !== null;
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
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 0.75,
        pt: 0.5,
        pb: 0.25,
        color: itemTypeColor(type),
        borderBottom: itemTypeHeaderBorder(type),
      }}
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
   * Contexte de chargement des armes (PER-284) : présent → badge « coups prêts » sur chaque arbalète
   * et arme à poudre (cf. `WeaponLoadingBadge`). Absent → aucun suivi affiché (wizard).
   */
  weaponLoading?: LoadingContext;
  /**
   * Objets octroyés par une capacité mais ABSENTS de l'inventaire (PER-286, cf.
   * `missingGrantedItems`) : rappelés en tête de liste avec un bouton d'ajout. Absent/vide = rien
   * à signaler.
   */
  grantedMissing?: GrantedItem[];
  /** Ajoute à l'inventaire un objet octroyé (bouton du rappel ci-dessus). Absent → pas de bouton. */
  onAddGranted?: (itemId: string) => void;
  /**
   * Don d'un objet à un AUTRE joueur de la campagne, sans validation du MJ (PER-388). `campaignId`
   * + `characterId` (le DONNEUR, pour l'exclure du choix de destinataire) + `onGiveItem` doivent
   * être fournis ENSEMBLE pour que le bouton « Donner » apparaisse — UNIQUEMENT en mode ÉDITION
   * (`onChange` présent, comme « Supprimer »), pour ne pas encombrer l'inventaire le reste du temps
   * (retour propriétaire). Absent (hors campagne, wizard, lecture seule) → aucun bouton.
   */
  giveContext?: {
    campaignId: string;
    characterId: string;
    onGiveItem: (index: number, quantity: number, receiverId: string) => Promise<void>;
  };
  /**
   * Niveau du personnage (PER-286) : RÉSOUT les dés évolutifs des armes à l'affichage (« 5d4° » →
   * « 5d8° » au niveau 9, table p. 43). Absent (catalogue hors personnage, wizard) → dé de base.
   */
  level?: number;
  /**
   * Caractéristiques effectives (PER-286) : rendent la puce de valeur de la carac ajoutée par une
   * arme (« + INT » de la couleuvrine). Absentes → la carac n'est pas affichée en ligne.
   */
  abilities?: Abilities;
  /**
   * Tirer un coup (PER-284) : décrémente le compteur de l'arme `i`. ÉTAT DE JEU, donc disponible
   * HORS mode édition — comme « Utiliser » et l'équipement porté. Absent → pas de bouton.
   */
  onFireShot?: (index: number) => void;
  /** Recharger UN coup ; `kind` déclare la munition employée (grenaille, annoncée au chargement, p. 63). */
  onLoadShot?: (index: number, kind?: LoadedAmmunitionKind) => void;
  /** Faire le PLEIN de l'arme `i` (coût total annoncé par l'infobulle du badge). */
  onRefillShots?: (index: number, kind?: LoadedAmmunitionKind) => void;
  /**
   * Le personnage sait-il charger de la GRENAILLE (Tir de grenaille, `explosifs-r1`, p. 63) ?
   * Vrai → un bouton « Grenaille » double le rechargement. Absent/faux → munition normale seule.
   */
  canLoadGrapeshot?: boolean;
  /**
   * Dépenser une charge de l'objet `i` (PER-294) : ÉTAT DE JEU, donc disponible HORS mode édition,
   * comme les gestes de chargement d'arme. Absent → pas de bouton « Utiliser » de charge (wizard).
   */
  onSpendCharge?: (index: number) => void;
  /** Rendre UNE charge à l'objet `i` (geste manuel, toujours disponible). */
  onRestoreCharge?: (index: number) => void;
  /** Faire le PLEIN des charges de l'objet `i` (moitié droite du bouton « Recharger »). */
  onRefillCharges?: (index: number) => void;
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
   * PER-74 — familles d'armes à DEUX MAINS que le personnage sait manier à UNE MAIN (Poigne de fer du
   * colosse, r7, p. 149 ; résolu par `oneHandableWeaponFamilies`). Ouvre les boutons de prise sur ces
   * armes et lève le conflit « les deux mains sont déjà prises » quand elles sont tenues à une main.
   * Absent → comportement du livre (une arme à deux mains occupe les deux mains).
   */
  oneHandableFamilies?: readonly WeaponFamily[];
  /**
   * Résolveur d'écart de port armure/bouclier (PER-80) : pour une ligne d'inventaire, rend la
   * violation de plafond de port qui la concerne (armure trop lourde, bouclier interdit), ou
   * `null`. Pose sur la ligne fautive un badge « warning » (pendant du badge « Non maîtrisée »
   * des armes), en plus de l'avertissement agrégé en tête de fiche. Absent → aucun badge. Fourni
   * par l'appelant lié au personnage (`armorRestrictionByLine`).
   */
  resolveArmorRestriction?: (line: EquipmentLine) => ArmorRestrictionViolation | null;
  /**
   * Résolveur de PLAGE DE CRITIQUE (PER-74) : pour une ligne d'inventaire, rend la plage effective
   * de l'arme TENUE EN MAIN (plage intrinsèque de l'arme + capacités actives cumulées), ou `null`.
   * Pose sur la ligne la même puce violette « 19-20 » que les cartes d'attaque. Absent → aucune puce
   * (wizard). Fourni par l'appelant lié au personnage (`weaponLineCriticalRange`).
   */
  resolveCriticalRange?: (line: EquipmentLine) => WeaponLineCriticalRange | null;
  /**
   * Résolveur d'ARME LIÉE (PER-74, voie de l'arme liée) : pour une ligne d'inventaire, rend la voie
   * de prestige qui s'y est liée (nom + catégorie, pour la couleur de la puce), ou `null`. Pose la
   * puce « Arme liée » sur la seule arme concernée. Absent → aucune puce (wizard).
   */
  resolveBoundWeapon?: (line: EquipmentLine) => { pathName: string; category: PrestigeCategory | undefined } | null;
  /**
   * Identifiant du personnage : clé de persistance (localStorage) de la bascule œil
   * « description épinglée » (par objet, cf. `pinKeyFor`). Absent (wizard, catalogue hors
   * personnage) → la bascule reste locale à la session, non persistée.
   */
  characterId?: string;
  /**
   * Ouvre la modale « Objet personnalisé » depuis L'EXTÉRIEUR (bouton carré de la barre condensée,
   * `StickySheetStatusBar`) : toute INCRÉMENTATION (comme `equipmentJumpNonce` de la fiche) rouvre la
   * modale de création — même mécanisme nonce, `itemEdit` reste sinon un état interne. Absent/inchangé
   * → aucun effet.
   */
  openCustomItemSignal?: number;
  /**
   * PIN individuel (retour propriétaire) du bouton « Objet personnalisé » vers la barre condensée —
   * même recette que les boutons de repos (`WeldedBarPinButton`) : n'apparaît QUE si la section
   * Inventaire y est elle-même épinglée (`barSectionPinned`). Absent (récap du wizard, écran de MJ)
   * → aucun pin affiché.
   */
  onToggleBarPin?: () => void;
  barPinned?: boolean;
  barSectionPinned?: boolean;
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
  weaponLoading,
  grantedMissing,
  onAddGranted,
  giveContext,
  level,
  abilities,
  onFireShot,
  onLoadShot,
  onRefillShots,
  canLoadGrapeshot = false,
  onSpendCharge,
  onRestoreCharge,
  onRefillCharges,
  onWear,
  characterClass,
  masteredIds,
  firearmsAllowed = true,
  extraMasteredWeaponIds,
  resolveWeaponAffinities,
  twoWeaponStatus,
  oneHandableFamilies,
  resolveArmorRestriction,
  resolveCriticalRange,
  resolveBoundWeapon,
  characterId,
  openCustomItemSignal,
  onToggleBarPin,
  barPinned = false,
  barSectionPinned = false,
}: EquipmentListProps) {
  // Modale d'objet (PER-214) : `null` = fermée, `'new'` = création, un index = édition de
  // la ligne correspondante (bouton crayon, objet custom OU arme/armure/bouclier).
  const [itemEdit, setItemEdit] = useState<'new' | number | null>(null);
  // Ouverture externe (bouton carré de la barre condensée) : même mécanisme nonce que
  // `equipmentJumpNonce` de la fiche — un `ref` (pas un state) pour ne réagir QU'AU CHANGEMENT,
  // jamais à la valeur elle-même (sinon la modale se rouvrirait à chaque rendu).
  const prevOpenCustomItemSignal = useRef(openCustomItemSignal);
  useEffect(() => {
    if (openCustomItemSignal === undefined || openCustomItemSignal === prevOpenCustomItemSignal.current) return;
    prevOpenCustomItemSignal.current = openCustomItemSignal;
    setItemEdit('new');
  }, [openCustomItemSignal]);
  // Garde anti-clic fantôme (retour propriétaire, retour bug rapporté) : le bouton « Objet
  // personnalisé » (+ son pin) n'existe PAS avant l'édition et APPARAÎT à l'instant même où
  // `onChange` devient défini — un clic qui atterrirait là dans l'instant qui suit l'activation
  // du mode édition est ignoré, au cas où un second geste (double-clic sur le crayon, tap
  // fantôme d'un pavé tactile) tomberait sur ce bouton flambant neuf avant que l'œil ne l'ait vu
  // apparaître.
  const editModeEnteredAt = useRef(0);
  const editable = !!onChange;
  useEffect(() => {
    if (editable) editModeEnteredAt.current = Date.now();
  }, [editable]);
  const justEnteredEditMode = () => Date.now() - editModeEnteredAt.current < 300;
  // Descriptions ÉPINGLÉES sous le titre (bascule œil) : persistées par PERSONNAGE
  // (clé stable par objet, pas par index — fragile au réordonnancement/suppression).
  // Sans `characterId` (wizard, catalogue hors personnage) : reste local à la session.
  const [pinnedDesc, togglePinnedKey] = usePersistedStringSet(
    characterId ? storageKeys.inventory.pinnedDesc(characterId) : null,
  );
  const pinKeyFor = (line: EquipmentLine): string =>
    isCustomItem(line) ? `custom:${line.name}` : `ref:${line.instanceId ?? line.itemId}`;
  const togglePinned = (line: EquipmentLine) => togglePinnedKey(pinKeyFor(line));

  const setLine = (i: number, line: EquipmentLine) =>
    onChange?.(equipment.map((l, j) => (j === i ? line : l)));
  const remove = (i: number) => onChange?.(equipment.filter((_, j) => j !== i));
  const addCatalog = (itemId: string) => onChange?.([...equipment, { itemId, quantity: 1 }]);
  const addLine = (line: EquipmentLine) => onChange?.([...equipment, line]);

  // Bascule « Organiser par catégorie » (PER-221) : préférence UI GLOBALE persistée
  // (localStorage), groupé par défaut. Le regroupement est purement VISUEL.
  const [grouped, setGrouped] = usePersistedBoolean(storageKeys.inventory.grouped, true);
  // Bascule d'affichage liste / colonnes (PER-223) : préférence UI GLOBALE persistée
  // (localStorage), orthogonale au regroupement. Défaut « liste » (rendu historique) —
  // le mode cartes est un opt-in. `true` = cartes, `false` = liste.
  const [cards, setCards] = usePersistedBoolean(storageKeys.inventory.cards, false);

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
    // Icône affichée à gauche du nom, la plus précise disponible : choix explicite du joueur,
    // sinon sous-catégorie du catalogue (corde, grappin…), sinon sous-type d'arme dérivé,
    // sinon icône du type. Cf. `itemIconId`.
    const lineIcon = itemIconId(line);
    // Résolveur de variante (PER-211) : l'objet effectif porte les surcharges
    // d'instance (nom via `equipmentLabel`, DM/DEF/plafond AGI via `itemDetail`).
    const item = custom ? null : effectiveItem(line);
    // Dose d'élixir (objet custom nommé par `elixirItemName`) : on met en avant la CAPACITÉ
    // reproduite via une puce (sort choisi pour un mineur/majeur, sinon capacité du forgesort).
    const elixirFeatureId = custom ? ELIXIR_FEATURE_BY_ITEM.get(line.name) : undefined;
    // Détail STRUCTURÉ (DM des armes, DEF des protections) : toujours affiché en ligne.
    const structuredDetail =
      elixirFeatureId || custom || !item ? null : itemDetail(item, level, abilities);
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
    const descPinned = pinnedDesc.has(pinKeyFor(line));
    // Bonus de DEF magique de l'objet enchanté (PER-85 généralisé) : porté par n'importe
    // quel objet (armure, mais aussi accessoire enchanté) et rendu à part de la DEF
    // mondaine, pour ne pas les confondre visuellement (retour propriétaire).
    const magicDef = line.magicDef;
    // Bonus/malus de caractéristiques de l'objet enchanté (PER-272), badgés à côté du nom :
    // ils ne comptent que si l'objet est équipé, comme la DEF magique.
    const abilityBonuses = line.abilityBonuses;
    // Bonus/malus de stats dérivées de l'objet enchanté (PER-273), badgés à côté du nom :
    // même condition de port que les apports de caracs.
    const derivedBonuses = line.derivedBonuses;
    // Bonus/malus aux tests de l'objet enchanté (PER-275), badgés à côté du nom : même condition
    // de port, mais règle de cumul propre (bonus de magie, non cumulable entre objets).
    const testBonuses = line.testBonuses;
    // Bonus magique +N d'une ARME (PER-307) : +N en attaque et aux DM, badgé à côté du nom.
    const magicBonus = line.magicBonus;
    // Propriétés d'un objet magique (PER-307) : Affûtée, Fléau, Élément, Parade, Défense, Résistance…
    const magicProperties = line.magicProperties;
    // Plage de critique EFFECTIVE de l'arme tenue en main (PER-74) : `null` hors arme en main, ou
    // quand rien n'élargit la plage. Résolue par l'appelant (dépend du personnage entier).
    const criticalRange = resolveCriticalRange?.(line) ?? null;
    // Arme liée de la voie de prestige (PER-74) : `null` sur toutes les autres lignes.
    const boundWeapon = resolveBoundWeapon?.(line) ?? null;
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
    //    compris — PER-85), qui doit pouvoir être porté pour compter ;
    //  - tout objet portant un apport de CARACTÉRISTIQUES (PER-272), de STATISTIQUES
    //    DÉRIVÉES (PER-273) ou aux TESTS (PER-275), pour la même raison (des bottes de
    //    vivacité n'ont d'effet qu'aux pieds, un anneau de protection qu'au doigt).
    // Le reste du matériel (corde, ration…) et les placeholders de choix ne sont plus
    // « équipables » : fini le bouton « Équiper » inutile sur chaque ligne.
    const wearable =
      (!!item &&
        (item.category === 'weapon' ||
          item.category === 'armor' ||
          item.category === 'shield' ||
          (item.category === 'gear' && !!item.equipSlot))) ||
      !!line.magicDef ||
      !!line.abilityBonuses ||
      !!line.derivedBonuses ||
      !!line.testBonuses ||
      !!line.magicBonus ||
      !!line.magicProperties?.length;
    // Arme à poudre INDISPONIBLE (PER-185, retour PER-93) : autorisation effective des armes
    // à feu à `false` (campagne « pas d'arme à feu » ou choix du joueur). La ligne est grisée
    // et avertie, mais conservée — le MJ garde la liberté de la garder pour le style.
    // L'identité « arme à feu » se lit sur l'id de BASE (une variante n'y change rien).
    const firearmUnavailable = !custom && !firearmsAllowed && isFirearmItemId(line.itemId);
    // État de chargement (PER-284) : `null` sur tout ce que le livre ne fait pas recharger
    // (arcs, frondes, armes de jet, armes de contact, objets libres) → aucun badge, aucun geste.
    const loadingState = weaponLoading ? weaponLoadingState(line, weaponLoading) : null;
    // Charges de l'objet (PER-294) : `null` sur tout objet sans charges, c'est-à-dire la
    // quasi-totalité de l'inventaire → aucune pastille, aucun geste. Indépendant du port : une
    // baguette rangée dans un sac se déclenche très bien (≠ « Tirer », qui exige l'arme en main).
    const chargeState = itemChargeState(line);
    // TIRER suppose l'arme EN MAIN — « Changer d'arme demande une action de mouvement (M) » (p. 187).
    // RECHARGER, à l'inverse, reste disponible sur une arme rangée : c'est tout l'objet de la tactique
    // « charger des armes à poudre à l'avance » (p. 187), où l'on prépare les armes qu'on ne tient pas.
    const weaponInHand = line.worn?.slot === 'mainHand' || line.worn?.slot === 'offHand';
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
        <ItemIcon id={lineIcon} sx={{ color: 'text.secondary' }} />
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
        <ItemIcon id={lineIcon} sx={{ color: 'text.secondary' }} />
        {/* Titre de l'objet. S'il porte une description libre, il devient survolable
            (tooltip) — la description reste masquée par défaut. */}
        {description ? (
          <AppTooltip
            title={
              <Box sx={{ whiteSpace: 'pre-line' }}>
                <GlossaryRichText>{description}</GlossaryRichText>
              </Box>
            }
            maxWidth={360}
          >
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
        {magicBonus ? <MagicWeaponBonusBadge value={magicBonus} /> : null}
        {magicProperties?.length ? <MagicPropertyBadges properties={magicProperties} /> : null}
        {abilityBonuses ? <AbilityBonusBadges bonuses={abilityBonuses} /> : null}
        {derivedBonuses ? <DerivedBonusBadges bonuses={derivedBonuses} /> : null}
        {testBonuses ? <TestBonusBadges bonuses={testBonuses} /> : null}
        {/* Plage de critique effective de l'arme EN MAIN (PER-74) : puce violette « 19-20 »,
            identique à celle des cartes d'attaque, cumulant l'arme et les capacités actives. */}
        {criticalRange ? <WeaponCriticalRangeBadge info={criticalRange} /> : null}
        {/* Puce « Arme liée » (PER-74) : l'arme unique que la voie de l'arme liée concerne. */}
        {boundWeapon ? (
          <BoundWeaponBadge category={boundWeapon.category} pathName={boundWeapon.pathName} />
        ) : null}
        {/* Bascule œil : épingle la description sous le titre (état d'affichage local). */}
        {description && (
          <AppTooltip title={descPinned ? 'Masquer la description' : 'Afficher la description'}>
            <IconButton
              size="small"
              onClick={() => togglePinned(line)}
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
          <GlossaryRichText>{description}</GlossaryRichText>
        </Typography>
      ) : null;

    // Badges d'état : port (contrôles/badge), maîtrise, combat à deux armes, affinité, arme à feu.
    const stateBadges = (
      <>
        {/* État de port (PER-77) : contrôles équiper/déséquiper si disponibles (état de jeu,
            hors mode édition), sinon un simple badge « équipé » en lecture. */}
        {wearable && onWear && (
          <Box sx={{ mt: 0.5 }}>
            <WornControls
              line={line}
              onWear={(w) => onWear(i, w)}
              oneHandableFamilies={oneHandableFamilies}
            />
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
        {/* Munitions chargées (PER-284) : arbalètes et armes à poudre uniquement, suivies des
            modifications de l'arme (second canon) qui expliquent ce que les pastilles montrent. */}
        {loadingState && (
          <Box
            sx={{ mt: 0.5, display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap', rowGap: 0.5 }}
          >
            <WeaponLoadingDots state={loadingState} />
            {loadingState.doubleBarrel && <DoubleBarrelChip />}
          </Box>
        )}
        {/* Charges de l'objet (PER-294) : baguettes, sceptres, talismans — une pastille par charge. */}
        {chargeState && (
          <Box sx={{ mt: 0.5, display: 'flex', alignItems: 'center' }}>
            <ItemChargeDots state={chargeState} />
          </Box>
        )}
        {/* Canon double avec un seul coup chargé : effet inopérant (PER-284, p. 63). */}
        {loadingState?.underfed && <DoubleBarrelUnderfedBadge />}
        {/* Avertissement (PER-185) : arme à poudre grisée quand la poudre est indisponible. */}
        {firearmUnavailable && <FirearmUnavailableBadge />}
      </>
    );

    // Contrôle de quantité : champ éditable (édition) ou « ×N » (lecture, masqué si N=1). Le
    // bonus de DEF MAGIQUE (PER-85) se saisit dans la modale (crayon), plus en ligne (PER-214).
    // ABSENT sur les armes (PER-284) : une arme = une case, sauf les armes de jet que le livre
    // compte par paquets (cf. `lineAllowsQuantity`).
    const quantityControl = !lineAllowsQuantity(line) ? null : onChange ? (
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
    // ÉCARTÉ sur un objet à CHARGES (PER-294) : c'est le « Utiliser » du bloc de charges qui prend
    // la main — sinon une fiole typée « consommable » dotée de charges afficherait deux boutons
    // identiques (`useEquipmentItem` route déjà les deux vers la dépense d'une charge).
    const useButton =
      onUse && !chargeState && (isConsumable(line) || isStartingChoiceLine(line)) ? (
        <Button size="small" variant="outlined" onClick={() => onUse(i)} sx={{ flexShrink: 0 }}>
          Utiliser
        </Button>
      ) : null;
    // Gestes de chargement (PER-284) — ÉTAT DE JEU, donc hors mode édition, comme « Utiliser ».
    // DEUX GROUPES séparés par un trait vertical, parce que ce ne sont pas des actions de même
    // nature : « Tirer » DÉPENSE (le prochain coup de la file) — d'où le ROUGE —, tandis que
    // « Recharger » / « Grenaille » / « Plein » REMPLISSENT. « Grenaille » annonce le mélange au
    // chargement, comme l'exige le livre (p. 63) ; « Plein » n'a de sens qu'au-delà d'un coup.
    // Un rechargement = un BOUTON DOUBLE : le corps ajoute UN coup, la moitié droite (icône
    // « ⏩ ») fait le PLEIN de la même munition. Les deux moitiés sont soudées — coins arrondis
    // seulement à l'extérieur, bordures mitoyennes superposées (`ml: '-1px'`) — pour lire comme un
    // seul contrôle à deux crans. La moitié « plein » n'a de sens qu'au-delà d'un coup : sur une
    // arme d'un seul coup, recharger EST faire le plein, le bouton reste donc simple.
    const reloadSplitButton = (
      kind: LoadedAmmunitionKind,
      label: string,
      color: 'primary' | 'warning',
    ) => {
      if (!loadingState || !onLoadShot) return null;
      const refill = loadingState.refillCost;
      const split = !!onRefillShots && loadingState.capacity > 1;
      return (
        <Box sx={{ display: 'inline-flex', flexShrink: 0 }}>
          {/* `span` intercalaire : un bouton désactivé n'émet aucun événement, l'infobulle
              n'aurait rien à écouter (avertissement MUI). Le wrapper reste `inline-flex`
              pour ne rien changer à la mise en page du bouton double. */}
          <AppTooltip title={`Recharger un coup (${label.toLowerCase()})`}>
            <span style={{ display: 'inline-flex' }}>
              <Button
                size="small"
                variant="outlined"
                color={color}
                disabled={loadingState.full}
                onClick={() => onLoadShot(i, kind)}
                sx={split ? { borderTopRightRadius: 0, borderBottomRightRadius: 0 } : undefined}
              >
                {label}
              </Button>
            </span>
          </AppTooltip>
          {split && (
            <AppTooltip
              title={
                refill
                  ? `Faire le plein (${label.toLowerCase()}) — ${refill.count} action${
                      refill.count > 1 ? 's' : ''
                    } ${refill.action === 'M' ? 'de mouvement (M)' : 'limitée(s) (L)'}`
                  : 'Arme déjà pleine'
              }
            >
              <span style={{ display: 'inline-flex' }}>
                <Button
                  size="small"
                  variant="outlined"
                  color={color}
                  disabled={loadingState.full}
                  onClick={() => onRefillShots!(i, kind)}
                  aria-label={`Faire le plein (${label.toLowerCase()})`}
                  sx={{
                    borderTopLeftRadius: 0,
                    borderBottomLeftRadius: 0,
                    // Bordures mitoyennes superposées ; au survol, la moitié active passe devant
                    // pour que sa bordure ne paraisse pas rognée par la voisine.
                    ml: '-1px',
                    position: 'relative',
                    '&:hover': { zIndex: 1 },
                    minWidth: 0,
                    px: 0.5,
                  }}
                >
                  <KeyboardDoubleArrowRightIcon sx={{ fontSize: 18 }} />
                </Button>
              </span>
            </AppTooltip>
          )}
        </Box>
      );
    };
    const reloadButtons = loadingState ? (
      <>
        {reloadSplitButton('normal', 'Recharger', 'primary')}
        {canLoadGrapeshot && loadingState.firearm && reloadSplitButton('grapeshot', 'Grenaille', 'warning')}
      </>
    ) : null;
    const fireButton =
      loadingState && onFireShot ? (
        <AppTooltip
          title={
            !weaponInHand
              ? 'Arme rangée : il faut l’avoir en main pour tirer — « Changer d’arme demande une action de mouvement (M) » (p. 187). Elle reste rechargeable, c’est même tout l’objet de la préparation à l’avance.'
              : [
                  loadingState.nextShot === 'grapeshot'
                    ? 'Tirer la GRENAILLE en tête de file'
                    : 'Tirer le prochain coup chargé',
                  loadingState.shotsPerFire > 1
                    ? loadingState.underfed
                      ? '— dépense le dernier coup, sans le dé de DM doublé (p. 63)'
                      : `— dépense ${loadingState.shotsPerFire} coups (canon double, p. 63)`
                    : '(dépense un coup)',
                ].join(' ')
          }
        >
          {/* `span` intercalé : un bouton DÉSACTIVÉ ne reçoit aucun événement de survol, l'info-bulle
              ne s'afficherait pas — or c'est justement là qu'elle explique le grisage. */}
          <span style={{ display: 'inline-flex', flexShrink: 0 }}>
            <Button
              size="small"
              variant="outlined"
              color="error"
              disabled={loadingState.empty || !weaponInHand}
              onClick={() => onFireShot(i)}
              sx={{ flexShrink: 0 }}
            >
              Tirer
            </Button>
          </span>
        </AppTooltip>
      ) : null;
    const loadingButtons =
      fireButton || reloadButtons ? (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
          {fireButton}
          {fireButton && reloadButtons && (
            <Divider orientation="vertical" flexItem sx={{ mx: 0.25, my: 0.25 }} />
          )}
          {reloadButtons}
        </Box>
      ) : null;
    // Gestes de charge (PER-294) — ÉTAT DE JEU, hors mode édition, calqués sur les gestes de
    // chargement d'arme ci-dessus, dont ils reprennent la grammaire : « Utiliser » DÉPENSE (d'où le
    // ROUGE), isolé à gauche d'un trait vertical, puis « Recharger » REMPLIT en bouton DOUBLE dont
    // la moitié droite (« ⏩ ») fait le plein. La moitié « plein » n'a de sens qu'au-delà d'une
    // charge : sur un objet à charge unique, recharger EST faire le plein.
    //
    // Le rechargement manuel reste proposé même sur un objet réglé « au repos » — le réglage est un
    // confort, pas une interdiction (le meneur de jeu peut toujours rendre une charge en cours de
    // partie). Aucune condition de port, contrairement à « Tirer » : une baguette rangée s'utilise.
    const chargeButtons = (() => {
      if (!chargeState) return null;
      const splitRefill = !!onRefillCharges && chargeState.max > 1;
      const spend = onSpendCharge ? (
        <AppTooltip
          title={
            chargeState.empty
              ? 'Objet épuisé : plus aucune charge à dépenser.'
              : 'Dépenser une charge (l’objet reste dans l’inventaire, même épuisé)'
          }
        >
          {/* `span` intercalé : un bouton DÉSACTIVÉ ne reçoit aucun événement de survol, l'infobulle
              ne s'afficherait pas — or c'est justement là qu'elle explique le grisage. */}
          <span style={{ display: 'inline-flex', flexShrink: 0 }}>
            <Button
              size="small"
              variant="outlined"
              color="error"
              disabled={chargeState.empty}
              onClick={() => onSpendCharge(i)}
              sx={{ flexShrink: 0 }}
            >
              Utiliser
            </Button>
          </span>
        </AppTooltip>
      ) : null;
      const restore = onRestoreCharge ? (
        <Box sx={{ display: 'inline-flex', flexShrink: 0 }}>
          <AppTooltip title="Rendre une charge">
            <span style={{ display: 'inline-flex' }}>
              <Button
                size="small"
                variant="outlined"
                disabled={chargeState.full}
                onClick={() => onRestoreCharge(i)}
                sx={splitRefill ? { borderTopRightRadius: 0, borderBottomRightRadius: 0 } : undefined}
              >
                Recharger
              </Button>
            </span>
          </AppTooltip>
          {splitRefill && (
            <AppTooltip title={chargeState.full ? 'Objet déjà plein' : 'Faire le plein des charges'}>
              <span style={{ display: 'inline-flex' }}>
                <Button
                  size="small"
                  variant="outlined"
                  disabled={chargeState.full}
                  onClick={() => onRefillCharges!(i)}
                  aria-label="Faire le plein des charges"
                  sx={{
                    borderTopLeftRadius: 0,
                    borderBottomLeftRadius: 0,
                    // Bordures mitoyennes superposées ; au survol, la moitié active passe devant.
                    ml: '-1px',
                    position: 'relative',
                    '&:hover': { zIndex: 1 },
                    minWidth: 0,
                    px: 0.5,
                  }}
                >
                  <KeyboardDoubleArrowRightIcon sx={{ fontSize: 18 }} />
                </Button>
              </span>
            </AppTooltip>
          )}
        </Box>
      ) : null;
      if (!spend && !restore) return null;
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
          {spend}
          {spend && restore && (
            <Divider orientation="vertical" flexItem sx={{ mx: 0.25, my: 0.25 }} />
          )}
          {restore}
        </Box>
      );
    })();
    const deleteButton = onChange ? (
      <IconButton size="small" color="error" onClick={() => remove(i)}>
        <DeleteOutlineIcon fontSize="small" />
      </IconButton>
    ) : null;
    // Don à un autre joueur (PER-388) : réservé au mode ÉDITION (`onChange`, comme « Supprimer »)
    // pour ne pas encombrer l'inventaire d'un bouton de plus le reste du temps (retour propriétaire) ;
    // masqué aussi hors campagne / en lecture seule (câblage `giveContext`).
    const giveButton = giveContext && onChange ? (
      <GiveItemButton
        campaignId={giveContext.campaignId}
        ownCharacterId={giveContext.characterId}
        line={line}
        index={i}
        onGive={giveContext.onGiveItem}
      />
    ) : null;

    // === Carte verticale compacte (PER-223, mode colonnes) ===
    if (asCard) {
      // En-tête (poignée de tri éventuelle + titre), corps (description épinglée + badges),
      // pied (quantité + Choisir/Utiliser/Supprimer). Un espaceur pousse le pied en bas pour
      // que les cartes d'une même rangée s'alignent (`height: 100%` + grille en `stretch`).
      const hasFooter = !!(
        quantityControl ||
        choiceBadge ||
        loadingButtons ||
        chargeButtons ||
        useButton ||
        giveButton ||
        deleteButton
      );
      return (
        <Box
          key={i}
          // PER-116 — ancre DOM pour « aller à l'arme » depuis la carte d'attaque au contact (icône
          // cliquable en combat à deux armes) : une seule ligne peut occuper `mainHand`/`offHand`.
          id={weaponInHand ? `equipment-line-${line.worn!.slot}` : undefined}
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
                  {loadingButtons}
                  {chargeButtons}
                  {useButton}
                  {giveButton}
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
        // PER-116 — même ancre DOM que la carte (mode colonnes), pour la vue liste par défaut.
        id={weaponInHand ? `equipment-line-${line.worn!.slot}` : undefined}
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
        {loadingButtons}
        {chargeButtons}
        {useButton}
        {giveButton}
        {deleteButton}
      </Stack>
    );
  };

  return (
    <Stack spacing={onChange ? 1.5 : 0}>
      {/* Conflits de port DURS (bouclier + arme à 2 mains, >1 armure/bouclier) — non bloquant (PER-77). */}
      <EquipConflictsAlert equipment={equipment} oneHandableFamilies={oneHandableFamilies} />
      {/* PER-286 : une capacité octroie un objet absent de l'inventaire (couleuvrine du rang 5 de
          l'artilleur acquis avant la règle, ou objet supprimé). On PROPOSE, on ne réimpose pas. */}
      {grantedMissing && grantedMissing.length > 0 && onAddGranted && (
        <AppAlert severity="info" title="Objet octroyé par une capacité">
          <Stack sx={{ gap: 0.75, alignItems: 'flex-start' }}>
            {grantedMissing.map((granted) => (
              <Stack
                key={granted.itemId}
                direction="row"
                sx={{ alignItems: 'center', gap: 1, flexWrap: 'wrap' }}
              >
                <Typography variant="body2">
                  <strong>{granted.name}</strong> — octroyée par une capacité acquise, absente de
                  l’inventaire.
                </Typography>
                <Button size="small" variant="outlined" onClick={() => onAddGranted(granted.itemId)}>
                  Ajouter
                </Button>
              </Stack>
            ))}
          </Stack>
        </AppAlert>
      )}
      {/* Bascules d'affichage, préférences UI globales persistées et ORTHOGONALES : liste /
          colonnes (PER-223) et regroupement par catégorie (PER-221). Affichées dès qu'il y a
          au moins un objet d'inventaire. */}
      {equipment.length > 0 && (
        // `mb` explicite plutôt que de compter sur le `spacing` du Stack parent (nul en lecture
        // seule, cf. ci-dessus) : l'espace vers les catégories/lignes ci-dessous doit rester visible
        // dans TOUS les cas, au même gabarit qu'au-dessus de ces boutons (`Divider` `my: 1.5` du bloc
        // appelant). En édition le `spacing` du Stack fournit déjà ce même espace (`onChange` vrai) :
        // pas de `mb` ici, sous peine de le CUMULER avec le `gap` du Stack et doubler l'écart.
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mb: onChange ? 0 : 1.5 }}>
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
            // Section teintée à la couleur de sa catégorie : dégradé partant de l'en-tête vers la
            // transparence (cf. `itemTypeSectionGradient`), pour que l'œil sépare les catégories
            // sans avoir à lire les libellés.
            <Box
              key={group.type}
              sx={{
                px: 1,
                pb: 0.5,
                borderRadius: 1,
                backgroundImage: itemTypeSectionGradient(group.type),
              }}
            >
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
          <Box sx={{ display: 'flex' }}>
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={() => {
                if (justEnteredEditMode()) return;
                setItemEdit('new');
              }}
              size="small"
              sx={
                barSectionPinned && onToggleBarPin
                  ? { height: WELDED_BUTTON_HEIGHT, borderTopRightRadius: 0, borderBottomRightRadius: 0 }
                  : { height: WELDED_BUTTON_HEIGHT }
              }
            >
              Objet personnalisé
            </Button>
            {barSectionPinned && onToggleBarPin && (
              <WeldedBarPinButton
                pinned={barPinned}
                onToggle={() => {
                  if (justEnteredEditMode()) return;
                  onToggleBarPin();
                }}
                label="Objet personnalisé"
              />
            )}
          </Box>
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
