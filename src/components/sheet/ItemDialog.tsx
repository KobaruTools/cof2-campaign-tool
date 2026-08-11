'use client';

import { useState, type ReactNode } from 'react';
import AddIcon from '@mui/icons-material/Add';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CloseIcon from '@mui/icons-material/Close';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import Accordion from '@mui/material/Accordion';
import AccordionDetails from '@mui/material/AccordionDetails';
import AccordionSummary from '@mui/material/AccordionSummary';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Dialog from '@mui/material/Dialog';
import Divider from '@mui/material/Divider';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Autocomplete from '@mui/material/Autocomplete';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import { ItemDescriptionEditor } from './ItemDescriptionEditor';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import { alpha } from '@mui/material/styles';
import type { Theme } from '@mui/material/styles';
import { equipment as equipmentCatalog, equipmentById, testDomainById } from '@/data';
import {
  ABILITY_IDS,
  DAMAGE_DICE,
  WEAPON_CATEGORIES,
  type AbilityId,
  type DamageDie,
  type EquipmentItem,
  type ResistibleDamageType,
  type WeaponCategory,
  type WeaponDamage,
} from '@/data/schema';
import type {
  EquipmentLine,
  EquipmentRef,
  ItemCharges,
  ItemDerivedStatId,
  ItemTestTarget,
  ItemType,
  MagicProperty,
  MagicPropertyKind,
} from '@/lib/character/types';
import { ITEM_DERIVED_STAT_IDS, isCustomItem } from '@/lib/character/types';
import {
  potionDefaultName,
  RESTORABLE_RESOURCE_KINDS,
  RESTORABLE_RESOURCE_LABEL,
  type RestorableResourceKind,
} from '@/lib/character/restorableResources';
import {
  MAGIC_DEFENSE_PROPERTY_KINDS,
  MAGIC_PROPERTY_RULES,
  MAGIC_WEAPON_PROPERTY_KINDS,
  magicItemValue,
  magicLevel,
  normalizeMagicProperty,
  propertyMagicLevel,
} from '@/lib/character/magicItem';
import { DAMAGE_TYPE_LABEL } from '@/lib/ui/damageTypeLabels';
import {
  ITEM_TYPE_ORDER,
  effectiveItem,
  isThrownWeapon,
  snapshotOverrides,
  type MechanicalCategory,
} from '@/lib/character/items';
import { ITEM_TEST_TARGET_IDS } from '@/lib/character/equipment';
import { ABILITY_NAMES } from '@/lib/ui/ability';
import { DERIVED_MOD_DISPLAY_ID, DERIVED_MOD_NAMES } from '@/lib/ui/derivedStats';
import { AbilityIcon } from '@/components/AbilityIcon';
import { AbilityCodeChip, GlossaryText } from '@/components/sheet/FeatureRichText';
import { DerivedStatIcon } from '@/components/DerivedStatIcon';
import { ItemTypeIcon } from '@/components/ItemTypeIcon';
import { ItemIcon } from '@/components/ItemIcon';
import { ItemIconPicker } from '@/components/sheet/ItemIconPicker';
import { defaultItemIconId, itemIconId } from '@/lib/ui/itemIcon';
import { itemTypeColor } from '@/lib/ui/itemTypeColors';
import type { ItemIconId } from '@/data/item-icons';
import { DieIcon } from '@/components/DieIcon';
import { SignedNumberField } from '@/components/SignedNumberField';
import { DamageValue } from '@/components/DamageValue';
import { formatWeaponDamage } from '@/lib/character/weaponDamage';
import {
  MagicDefBadge,
  MagicWeaponBonusBadge,
  MagicPropertyBadges,
  AbilityBonusBadges,
  DerivedBonusBadges,
  TestBonusBadges,
} from '@/components/sheet/MagicItemBadges';
import SportsMartialArtsIcon from '@mui/icons-material/SportsMartialArts';
import GpsFixedIcon from '@mui/icons-material/GpsFixed';

/** Libellés FR des 7 types d'objet (le CODE reste en anglais, cf. CLAUDE.md). */
export const ITEM_TYPE_LABELS: Record<ItemType, string> = {
  weapon: 'Arme',
  armor: 'Armure',
  shield: 'Bouclier',
  consumable: 'Consommable',
  gear: 'Équipement',
  treasure: 'Trésor',
  misc: 'Divers',
};

/** Ordre d'affichage des types dans le sélecteur (ordre canonique partagé). */
const TYPE_ORDER = ITEM_TYPE_ORDER;

/** Types de la famille cosmétique (objet libre, sans base du livre). */
const COSMETIC_TYPES: ItemType[] = ['consumable', 'gear', 'treasure', 'misc'];

/** Libellés FR des catégories d'arme (p. 184). */
const WEAPON_CATEGORY_LABELS: Record<WeaponCategory, string> = {
  light: 'Légère',
  oneHand: 'À une main',
  oneOrTwoHands: 'À une ou deux mains',
  twoHands: 'À deux mains',
};

/**
 * Regroupement affiché de la base ARME du livre : contact vs distance (p. 183/185). Une arme
 * lançable (dague, épieu, lance…) est mécaniquement les deux (`melee` ET `ranged`) ; le catalogue
 * la classe côté contact (voir `data/equipment.ts`, armes de contact déclarées avant les armes à
 * distance), donc ce regroupement suit `melee` en priorité — les groupes restent CONTIGUS dans
 * `baseOptions`, exigence de `groupBy` côté MUI (pas de tri supplémentaire nécessaire).
 */
type WeaponBaseGroup = 'melee' | 'ranged';
const WEAPON_BASE_GROUP_LABEL: Record<WeaponBaseGroup, string> = {
  melee: 'Armes de contact',
  ranged: 'Armes à distance',
};
function weaponBaseGroup(item: EquipmentItem): WeaponBaseGroup {
  return item.category === 'weapon' && item.melee ? 'melee' : 'ranged';
}

/** `weapon`/`armor`/`shield` sont mécaniques (variante d'une base du livre). */
function isMechanicalType(type: ItemType): type is MechanicalCategory {
  return type === 'weapon' || type === 'armor' || type === 'shield';
}

/** Valeur sentinelle du sélecteur de dé Custom pour le dé évolutif — distincte de tout `DamageDie`. */
const EVOLVING_DIE_OPTION = 'evolving';

/** Mode d'effet Fléau/Élément : Simple (livre, +1d4°) · Double (+2d4°) · Custom (dé(s) au choix). */
type MagicDiceMode = 'simple' | 'double' | 'custom';

/** Mode actuel d'une ligne Fléau/Élément, dérivé de ses champs (`customDice` prime sur `doubled`). */
function magicDiceMode(prop: MagicProperty): MagicDiceMode {
  if (prop.customDice) return 'custom';
  return prop.doubled ? 'double' : 'simple';
}

/**
 * Brouillon de saisie d'un `WeaponDamage` (PER-217) : nombre et modificateur sont
 * édités en CHAÎNE (champs numériques permissifs), le dé en énuméré, le non-létal en
 * booléen. Converti en `WeaponDamage` à la validation (`draftToDamage`).
 */
interface DamageDraft {
  count: string;
  die: DamageDie;
  modifier: string; // vide ou '0' = pas de modificateur
  nonLethal: boolean;
}

const EMPTY_DAMAGE: DamageDraft = { count: '1', die: 'd6', modifier: '', nonLethal: false };

/** Brouillon depuis un `WeaponDamage` du catalogue/d'une variante (pré-remplissage). */
function damageToDraft(damage: WeaponDamage | undefined): DamageDraft {
  if (!damage) return { ...EMPTY_DAMAGE };
  return {
    count: String(damage.count),
    die: damage.die,
    modifier: damage.modifier ? String(damage.modifier) : '',
    nonLethal: damage.nonLethal ?? false,
  };
}

/** `WeaponDamage` figé depuis un brouillon (nombre ≥ 1, modificateur/non-létal optionnels). */
function draftToDamage(draft: DamageDraft): WeaponDamage {
  const count = Math.max(1, Math.trunc(Number(draft.count) || 1));
  const modifier = Math.trunc(Number(draft.modifier) || 0);
  const result: WeaponDamage = { count, die: draft.die };
  if (modifier) result.modifier = modifier;
  if (draft.nonLethal) result.nonLethal = true;
  return result;
}

/**
 * Saisie guidée d'un `WeaponDamage` (PER-217) : nombre de dés + sélecteur de dé (icône
 * `<DieIcon>`) + modificateur plat + case « DM temporaires » (non létal). Remplace
 * l'ancienne formule tapée à la main.
 */
function WeaponDamageFields({
  label,
  value,
  onChange,
}: {
  label: string;
  value: DamageDraft;
  onChange: (draft: DamageDraft) => void;
}) {
  const set = <K extends keyof DamageDraft>(key: K, v: DamageDraft[K]) =>
    onChange({ ...value, [key]: v });
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
        {label}
      </Typography>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', rowGap: 1 }}>
        <TextField
          type="number"
          size="small"
          label="Nombre de dés"
          value={value.count}
          onChange={(e) => set('count', e.target.value)}
          // Champs fluides (PER-231) : ils se partagent la largeur de la ligne et
          // rétrécissent proprement dans une modale plein cadre mobile, au lieu d'une
          // largeur fixe qui débordait. `flexWrap` (Stack parent) gère le repli.
          sx={{ flex: '1 1 110px', minWidth: 100 }}
          slotProps={{ htmlInput: { min: 1 } }}
        />
        <TextField
          select
          size="small"
          label="Dé"
          value={value.die}
          onChange={(e) => set('die', e.target.value as DamageDie)}
          sx={{ flex: '1 1 96px', minWidth: 92 }}
        >
          {DAMAGE_DICE.map((d) => (
            <MenuItem key={d} value={d}>
              <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                <DieIcon die={d} size={18} noTooltip />
                {d}
              </Box>
            </MenuItem>
          ))}
        </TextField>
        <TextField
          type="number"
          size="small"
          label="Bonus plat"
          placeholder="0"
          value={value.modifier}
          onChange={(e) => set('modifier', e.target.value)}
          sx={{ flex: '1 1 110px', minWidth: 100 }}
        />
        <FormControlLabel
          control={
            <Checkbox
              size="small"
              checked={value.nonLethal}
              onChange={(e) => set('nonLethal', e.target.checked)}
            />
          }
          label="DM temporaires"
        />
      </Stack>
    </Box>
  );
}

/**
 * Ligne de saisie d'un apport d'objet enchanté : UNE clé (caractéristique, PER-272, ou
 * statistique dérivée, PER-273) + un score signé. Le tableau de lignes est la forme
 * d'ÉDITION (ordre d'ajout conservé) ; il est réduit en objet clé → valeur à la validation,
 * ce qui interdit structurellement les doublons de clé.
 */
interface BonusRow<Id extends string> {
  key: Id;
  value: number;
}

/** Lignes d'édition depuis les apports persistés, dans l'ordre canonique des clés. */
function rowsFromBonuses<Id extends string>(
  ids: readonly Id[],
  bonuses: Partial<Record<Id, number>> | undefined,
): BonusRow<Id>[] {
  if (!bonuses) return [];
  return ids.filter((id) => bonuses[id]).map((id) => ({ key: id, value: bonuses[id]! }));
}

/**
 * Apports persistés depuis les lignes d'édition : les lignes à 0 sont ABANDONNÉES (une clé
 * sans effet n'a rien à faire dans les données), et le résultat est `undefined` s'il ne reste
 * rien — le champ n'est alors simplement pas écrit sur la ligne d'inventaire.
 */
function bonusesFromRows<Id extends string>(
  rows: BonusRow<Id>[],
): Partial<Record<Id, number>> | undefined {
  const out: Partial<Record<Id, number>> = {};
  for (const row of rows) {
    if (!row.value) continue;
    out[row.key] = row.value;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

/**
 * Saisie des bonus/malus d'un objet enchanté, par LIGNES : une ligne = une clé + un score
 * signé. Coquille commune aux apports de CARACTÉRISTIQUES (PER-272) et de STATISTIQUES
 * DÉRIVÉES (PER-273), dont l'ergonomie est volontairement identique. On peut ajouter autant
 * de lignes qu'il reste de clés libres ; une clé déjà prise disparaît des sélecteurs des
 * autres lignes, donc jamais deux lignes pour la même. Disponible sur TOUT type d'objet
 * (comme la DEF magique) : anneau, cape, bottes ou arme enchantée.
 */
function BonusRows<Id extends string>({
  ids,
  title,
  selectLabel,
  fullMessage,
  renderOption,
  optionLabel,
  groupOf,
  searchable = false,
  rows,
  onChange,
}: {
  /** Clés proposées, dans l'ordre canonique. */
  ids: readonly Id[];
  /** Intitulé de la section (français). */
  title: string;
  /** Libellé du sélecteur de clé (français). */
  selectLabel: string;
  /** Message affiché quand toutes les clés sont déjà prises. */
  fullMessage: string;
  /** Rendu d'une option du sélecteur (icône + libellé). */
  renderOption: (id: Id) => ReactNode;
  /**
   * Libellé TEXTE d'une clé, pour la saisie au clavier du sélecteur cherchable. Requis avec
   * `searchable` (le rendu riche ne se filtre pas), inutile sinon.
   */
  optionLabel?: (id: Id) => string;
  /**
   * Groupe d'appartenance d'une clé, rendu en intertitre dans le sélecteur (les clés doivent
   * être fournies groupées dans `ids`). Absent = liste plate.
   */
  groupOf?: (id: Id) => string;
  /**
   * Sélecteur CHERCHABLE au clavier plutôt que simple menu déroulant. Réservé aux listes
   * longues — les cibles de test (PER-275) mêlent les 7 caracs et plus de cent domaines de
   * compétence, où faire défiler un menu n'est pas praticable.
   */
  searchable?: boolean;
  rows: BonusRow<Id>[];
  onChange: (rows: BonusRow<Id>[]) => void;
}) {
  const used = new Set(rows.map((r) => r.key));
  const firstFree = ids.find((id) => !used.has(id));
  const setRow = (index: number, next: Partial<BonusRow<Id>>) =>
    onChange(rows.map((r, i) => (i === index ? { ...r, ...next } : r)));
  /** Clés proposées à UNE ligne : les libres, plus la sienne (sinon le champ paraîtrait vide). */
  const optionsFor = (key: Id): Id[] => ids.filter((id) => id === key || !used.has(id));
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.75 }}>
        {title}
      </Typography>
      <Stack spacing={1}>
        {rows.map((row, i) => (
          <Stack
            key={row.key}
            direction="row"
            spacing={1}
            sx={{ alignItems: 'center', flexWrap: 'wrap', rowGap: 1 }}
          >
            {searchable ? (
              <Autocomplete
                size="small"
                options={optionsFor(row.key)}
                value={row.key}
                onChange={(_, id) => id && setRow(i, { key: id })}
                disableClearable
                groupBy={groupOf}
                getOptionLabel={(id) => optionLabel?.(id) ?? id}
                renderOption={({ key, ...props }, id) => (
                  <Box
                    component="li"
                    key={key}
                    {...props}
                    sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}
                  >
                    {renderOption(id)}
                  </Box>
                )}
                renderInput={(params) => <TextField {...params} label={selectLabel} />}
                sx={{ flex: '1 1 240px', minWidth: 180 }}
              />
            ) : (
              <TextField
                select
                size="small"
                label={selectLabel}
                value={row.key}
                onChange={(e) => setRow(i, { key: e.target.value as Id })}
                sx={{ flex: '1 1 190px', minWidth: 150 }}
              >
                {optionsFor(row.key).map((id) => (
                  <MenuItem key={id} value={id}>
                    <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}>
                      {renderOption(id)}
                    </Box>
                  </MenuItem>
                ))}
              </TextField>
            )}
            {/* Score SIGNÉ : les boutons − / + rendent le malus atteignable sans clavier
                (les claviers mobiles `type=number` n'exposent pas le signe moins). */}
            <SignedNumberField
              size="small"
              label="Score"
              value={row.value}
              onChange={(v) => setRow(i, { value: v })}
              containerSx={{ flex: '0 0 auto' }}
              sx={{ width: 88 }}
            />
            <IconButton
              size="small"
              aria-label="Retirer cette ligne"
              onClick={() => onChange(rows.filter((_, j) => j !== i))}
            >
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          </Stack>
        ))}
      </Stack>
      <Button
        size="small"
        startIcon={<AddIcon />}
        disabled={firstFree === undefined}
        onClick={() => firstFree && onChange([...rows, { key: firstFree, value: 1 }])}
        sx={{ textTransform: 'none', mt: rows.length ? 1 : 0 }}
      >
        Ajouter une ligne
      </Button>
      {firstFree === undefined && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
          {fullMessage}
        </Typography>
      )}
    </Box>
  );
}

/** Substances (éléments) proposées pour Élément / Résistance (p. 251/253). */
const MAGIC_SUBSTANCES: ResistibleDamageType[] = ['fire', 'cold', 'lightning', 'acid', 'poison'];

/** Exemples de catégories de Fléau (p. 251, LISTE OUVERTE) — suggestions, saisie libre. */
const BANE_CATEGORY_SUGGESTIONS = [
  'morts-vivants',
  'dragons',
  'géants',
  'goblinoïdes',
  'démons',
  'animaux',
  'lycanthropes',
  'élémentaires',
  'lanceurs de sorts',
];

/**
 * Éditeur des PROPRIÉTÉS SPÉCIALES d'un objet magique (PER-306), par lignes. `kinds` restreint
 * les propriétés proposées à une famille (armes p. 251-252 ou défense p. 253-254). Chaque ligne
 * affiche des champs contextuels selon la propriété (catégorie de Fléau, substance, points de
 * Résistance, bonus de Parade, niveau de Défense), une case « Doublée » (p. 251/254), et un rappel
 * du niveau de magie apporté avec le texte de règle verbatim en infobulle. Contrairement aux
 * `BonusRows`, une même propriété peut se répéter (deux éléments, deux Fléaux…).
 */
function MagicPropertyRows({
  kinds,
  title,
  addLabel,
  rows,
  onChange,
}: {
  kinds: readonly MagicPropertyKind[];
  title: string;
  addLabel: string;
  rows: MagicProperty[];
  onChange: (rows: MagicProperty[]) => void;
}) {
  const setRow = (index: number, next: Partial<MagicProperty>) =>
    onChange(rows.map((r, i) => (i === index ? { ...r, ...next } : r)));
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.75 }}>
        {title}
      </Typography>
      <Stack spacing={1}>
        {rows.map((row, i) => {
          const rule = MAGIC_PROPERTY_RULES[row.kind];
          const level = propertyMagicLevel(row);
          return (
            <Stack
              // Les propriétés ne sont ni réordonnables ni dédupliquées : la clé d'index suffit,
              // chaque ligne étant entièrement pilotée par `rows`.
              key={i}
              direction="row"
              spacing={1}
              sx={{ alignItems: 'center', flexWrap: 'wrap', rowGap: 1 }}
            >
              <TextField
                select
                size="small"
                label="Propriété"
                value={row.kind}
                onChange={(e) => setRow(i, { kind: e.target.value as MagicPropertyKind })}
                sx={{ flex: '1 1 180px', minWidth: 150 }}
              >
                {kinds.map((k) => (
                  <MenuItem key={k} value={k}>
                    {MAGIC_PROPERTY_RULES[k].name}
                  </MenuItem>
                ))}
              </TextField>

              {/* Fléau : catégorie de créatures (liste ouverte, saisie libre + suggestions). */}
              {row.kind === 'bane' && (
                <Autocomplete
                  freeSolo
                  size="small"
                  options={BANE_CATEGORY_SUGGESTIONS}
                  value={row.creatureCategory ?? ''}
                  onInputChange={(_, v) => setRow(i, { creatureCategory: v })}
                  sx={{ flex: '1 1 200px', minWidth: 160 }}
                  renderInput={(params) => (
                    <TextField {...params} label="Catégorie de créatures" placeholder="ex. démons" />
                  )}
                />
              )}

              {/* Élément / Résistance : substance (élément) concernée. */}
              {(row.kind === 'elemental' || row.kind === 'resistance') && (
                <TextField
                  select
                  size="small"
                  label="Élément"
                  value={row.substance ?? ''}
                  onChange={(e) =>
                    setRow(i, {
                      substance: (e.target.value || undefined) as ResistibleDamageType | undefined,
                    })
                  }
                  sx={{ flex: '1 1 130px', minWidth: 120 }}
                >
                  {MAGIC_SUBSTANCES.map((s) => (
                    <MenuItem key={s} value={s}>
                      {DAMAGE_TYPE_LABEL[s] ?? s}
                    </MenuItem>
                  ))}
                </TextField>
              )}

              {/* Fléau / Élément, mode Custom (RÈGLE MAISON) : nombre de dés + dé — le dé
                  évolutif (p. 43) est une entrée de la MÊME liste (« d4° », en tête), pas une
                  case séparée : un seul contrôle pilote la face. */}
              {(row.kind === 'bane' || row.kind === 'elemental') && row.customDice && (
                <>
                  <TextField
                    type="number"
                    size="small"
                    label="Nombre de dés"
                    value={String(row.customDice.count)}
                    onChange={(e) =>
                      setRow(i, {
                        customDice: {
                          ...row.customDice!,
                          count: Math.max(1, Math.floor(Number(e.target.value) || 1)),
                        },
                      })
                    }
                    sx={{ flex: '1 1 110px', minWidth: 100 }}
                    slotProps={{ htmlInput: { min: 1 } }}
                  />
                  <TextField
                    select
                    size="small"
                    label="Dé"
                    value={row.customDice.evolving ? EVOLVING_DIE_OPTION : row.customDice.die}
                    onChange={(e) => {
                      const v = e.target.value;
                      setRow(i, {
                        customDice:
                          v === EVOLVING_DIE_OPTION
                            ? { ...row.customDice!, die: 'd4', evolving: true }
                            : { ...row.customDice!, die: v as DamageDie, evolving: undefined },
                      });
                    }}
                    sx={{ flex: '1 1 110px', minWidth: 100 }}
                  >
                    <MenuItem value={EVOLVING_DIE_OPTION}>
                      <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                        <DieIcon die="d4" evolving size={18} noTooltip />
                        d4°
                      </Box>
                    </MenuItem>
                    {DAMAGE_DICE.map((d) => (
                      <MenuItem key={d} value={d}>
                        <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                          <DieIcon die={d} size={18} noTooltip />
                          {d}
                        </Box>
                      </MenuItem>
                    ))}
                  </TextField>
                </>
              )}

              {/* Résistance : X points retranchés. */}
              {row.kind === 'resistance' && (
                <TextField
                  type="number"
                  size="small"
                  label="Points (X)"
                  value={row.amount != null ? String(row.amount) : ''}
                  onChange={(e) =>
                    setRow(i, {
                      amount:
                        e.target.value === ''
                          ? undefined
                          : Math.max(0, Math.floor(Number(e.target.value) || 0)),
                    })
                  }
                  sx={{ width: 110 }}
                  slotProps={{ htmlInput: { min: 0 } }}
                />
              )}

              {/* Parade : bonus de DEF offert (= son niveau de magie). */}
              {row.kind === 'parry' && (
                <TextField
                  type="number"
                  size="small"
                  label="Bonus de DEF"
                  value={row.defBonus != null ? String(row.defBonus) : ''}
                  onChange={(e) =>
                    setRow(i, {
                      defBonus:
                        e.target.value === ''
                          ? undefined
                          : Math.max(0, Math.floor(Number(e.target.value) || 0)),
                    })
                  }
                  sx={{ width: 120 }}
                  slotProps={{ htmlInput: { min: 0 } }}
                />
              )}

              {/* Défense : simple (RD 2, +1) ou supérieure (RD 4, +2). */}
              {row.kind === 'defense' && (
                <TextField
                  select
                  size="small"
                  label="Niveau"
                  value={row.tier === 2 ? 2 : 1}
                  onChange={(e) => setRow(i, { tier: Number(e.target.value) === 2 ? 2 : 1 })}
                  sx={{ flex: '1 1 190px', minWidth: 160 }}
                >
                  <MenuItem value={1}>Défense (RD 2)</MenuItem>
                  <MenuItem value={2}>Défense supérieure (RD 4)</MenuItem>
                </TextField>
              )}

              {/* Fléau / Élément : Simple (livre, +1d4°) · Double (+2d4°) · Custom (dé(s) au
                  choix, RÈGLE MAISON) — un choix exclusif, pas deux cases indépendantes.
                  Les autres propriétés gardent la simple case « Doublée ». */}
              {row.kind === 'bane' || row.kind === 'elemental' ? (
                <ToggleButtonGroup
                  exclusive
                  size="small"
                  value={magicDiceMode(row)}
                  onChange={(_, mode: MagicDiceMode | null) => {
                    if (!mode) return;
                    if (mode === 'simple') setRow(i, { doubled: undefined, customDice: undefined });
                    else if (mode === 'double') setRow(i, { doubled: true, customDice: undefined });
                    else
                      setRow(i, {
                        doubled: undefined,
                        customDice: row.customDice ?? { count: 1, die: 'd4', evolving: true },
                      });
                  }}
                >
                  <ToggleButton value="simple" sx={{ textTransform: 'none', px: 1.25 }}>
                    Simple
                  </ToggleButton>
                  <ToggleButton value="double" sx={{ textTransform: 'none', px: 1.25 }}>
                    Double
                  </ToggleButton>
                  <ToggleButton value="custom" sx={{ textTransform: 'none', px: 1.25 }}>
                    Custom
                  </ToggleButton>
                </ToggleButtonGroup>
              ) : (
                <FormControlLabel
                  control={
                    <Checkbox
                      size="small"
                      checked={row.doubled === true}
                      onChange={(e) => setRow(i, { doubled: e.target.checked ? true : undefined })}
                    />
                  }
                  label="Doublée"
                />
              )}

              {/* Rappel du niveau de magie apporté + texte de règle verbatim en infobulle. */}
              <Tooltip title={rule.verbatim} disableInteractive>
                <Box
                  component="span"
                  sx={{ fontSize: '0.75rem', color: 'text.secondary', cursor: 'help', whiteSpace: 'nowrap' }}
                >
                  niv.&nbsp;+{level} (p.&nbsp;{rule.sourcePage})
                </Box>
              </Tooltip>

              <IconButton
                size="small"
                aria-label="Retirer cette propriété"
                onClick={() => onChange(rows.filter((_, j) => j !== i))}
              >
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            </Stack>
          );
        })}
      </Stack>
      <Button
        size="small"
        startIcon={<AddIcon />}
        onClick={() => onChange([...rows, { kind: kinds[0] }])}
        sx={{ textTransform: 'none', mt: rows.length ? 1 : 0 }}
      >
        {addLabel}
      </Button>
    </Box>
  );
}

/** État de formulaire mutualisé (les champs sans rapport avec le type sont ignorés). */
/**
 * Séparateur de section du formulaire d'objet : un trait horizontal, titré quand la section n'a
 * pas déjà son propre intitulé. Purement visuel — il découpe une modale qui enchaînait jusqu'à une
 * dizaine de champs sans rupture (identité, caractéristiques du livre, enchantement, charges).
 */
function SectionDivider({ label }: { label?: string }) {
  if (!label) return <Divider />;
  return (
    <Divider textAlign="left">
      <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: '0.08em' }}>
        {label}
      </Typography>
    </Divider>
  );
}

/**
 * Section repliable du formulaire d'objet (remplace `SectionDivider` pour les blocs assez longs
 * pour justifier de gagner de la place) : bordure fine + en-tête cliquable, dans le même langage
 * visuel que les accordéons de montée de niveau (`LevelUpDialog`). Non contrôlée (`defaultExpanded`)
 * pour un simple repli de confort (Identité, Caractéristiques) ; contrôlée (`expanded`/`onChange`)
 * quand l'état déplié/replié doit aussi dépendre des données (Enchantement, cf. `formHasEnchantment`).
 */
function FormAccordion({
  title,
  subtitle,
  defaultExpanded,
  expanded,
  onChange,
  children,
}: {
  title: string;
  subtitle?: ReactNode;
  defaultExpanded?: boolean;
  expanded?: boolean;
  onChange?: (expanded: boolean) => void;
  children: ReactNode;
}) {
  return (
    <Accordion
      disableGutters
      elevation={0}
      {...(onChange
        ? { expanded, onChange: (_: unknown, next: boolean) => onChange(next) }
        : { defaultExpanded })}
      sx={{
        bgcolor: 'transparent',
        border: 1,
        borderColor: 'divider',
        '&::before': { display: 'none' },
      }}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
          <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: '0.08em', fontWeight: 700 }}>
            {title}
          </Typography>
          {subtitle}
        </Stack>
      </AccordionSummary>
      <AccordionDetails>
        <Stack spacing={2}>{children}</Stack>
      </AccordionDetails>
    </Accordion>
  );
}

interface FormState {
  name: string;
  description: string;
  /**
   * Icône CHOISIE pour cet objet ; `null` = aucun choix, l'objet garde l'icône que la cascade
   * lui donne (sous-catégorie du livre, sous-type d'arme dérivé, ou icône du type). Cf.
   * `itemIconId` / `defaultItemIconId`.
   */
  icon: ItemIconId | null;
  damage: DamageDraft;
  twoHandedDamage: DamageDraft;
  range: string;
  weaponCategory: WeaponCategory;
  def: string;
  maxAgi: string; // vide = pas de plafond (null)
  magicDef: string; // bonus de DEF magique, tout type d'objet (PER-85 généralisé)
  /** Bonus magique +N d'une ARME (PER-306) : +N attaque/DM, câblé en PER-307. Vide/0 = aucun. */
  magicBonus: string;
  /** Propriétés spéciales d'objet magique (PER-306) : Affûtée, Fléau, Élément, Défense… */
  magicProperties: MagicProperty[];
  /** Apports de caractéristiques en lignes (PER-272), tout type d'objet. */
  abilityBonuses: BonusRow<AbilityId>[];
  /** Apports de statistiques dérivées en lignes (PER-273), tout type d'objet. */
  derivedBonuses: BonusRow<ItemDerivedStatId>[];
  /** Apports aux tests en lignes (PER-275), tout type d'objet — carac ou domaine. */
  testBonuses: BonusRow<ItemTestTarget>[];
  /** Nombre de charges de l'objet plein (PER-294) ; vide ou 0 = objet SANS charges. */
  chargesMax: string;
  /** L'objet se remet à plein au repos court / au repos long (réglages CUMULABLES). */
  chargesOnShortRest: boolean;
  chargesOnLongRest: boolean;
  /**
   * Potion d'énergie custom (PER-XXX, type `consumable` seulement) : à l'usage, restaure
   * `potionCount`d`potionDie` points de `potionResource`. `potionEnabled` pilote l'affichage des
   * champs (case à cocher) — non coché, l'objet reste un consommable ordinaire.
   */
  potionEnabled: boolean;
  potionResource: RestorableResourceKind;
  potionDie: DamageDie;
  /** Nombre de dés, saisi en chaîne (champ numérique permissif) ; `'1'` par défaut. */
  potionCount: string;
  /** Dé ÉVOLUTIF « d4° » (table p. 43) plutôt qu'une face fixe — `potionDie` devient un placeholder. */
  potionEvolving: boolean;
  /** Bonus plat (« 1d6+4 ») ; vide ou 0 = aucun bonus. */
  potionModifier: string;
}

const EMPTY_FORM: FormState = {
  name: '',
  description: '',
  icon: null,
  damage: { ...EMPTY_DAMAGE },
  twoHandedDamage: { ...EMPTY_DAMAGE },
  range: '',
  weaponCategory: 'oneHand',
  def: '',
  maxAgi: '',
  magicDef: '',
  magicBonus: '',
  magicProperties: [],
  abilityBonuses: [],
  derivedBonuses: [],
  testBonuses: [],
  chargesMax: '',
  chargesOnShortRest: false,
  chargesOnLongRest: false,
  potionEnabled: false,
  potionResource: 'hp',
  potionDie: 'd6',
  potionCount: '1',
  potionEvolving: false,
  potionModifier: '',
};

/** Le bloc Enchantement doit-il partir DÉPLIÉ ? Oui si l'objet édité porte déjà une des
 * propriétés qu'il regroupe (bonus magique, DEF magique, propriétés spéciales, apports de
 * caracs/stats dérivées/tests, charges). */
function formHasEnchantment(f: FormState): boolean {
  return (
    Boolean(Number(f.magicDef) || 0) ||
    Boolean(Number(f.magicBonus) || 0) ||
    f.magicProperties.length > 0 ||
    f.abilityBonuses.length > 0 ||
    f.derivedBonuses.length > 0 ||
    f.testBonuses.length > 0 ||
    Boolean(Number(f.chargesMax) || 0)
  );
}

/** Pré-remplit les trois champs de charges (PER-294) depuis la ligne éditée. */
function chargeFieldsFromLine(line: EquipmentLine): Pick<
  FormState,
  'chargesMax' | 'chargesOnShortRest' | 'chargesOnLongRest'
> {
  const charges = line.charges;
  return {
    chargesMax: charges?.max ? String(charges.max) : '',
    chargesOnShortRest: charges?.onShortRest === true,
    chargesOnLongRest: charges?.onLongRest === true,
  };
}

/** Pré-remplit le formulaire à partir d'un objet du livre (valeurs par défaut du catalogue). */
function formFromBase(base: EquipmentItem): FormState {
  const f: FormState = { ...EMPTY_FORM, name: base.name };
  switch (base.category) {
    case 'weapon':
      f.damage = damageToDraft(base.damage);
      f.twoHandedDamage = damageToDraft(base.twoHandedDamage);
      f.range = base.range ?? '';
      f.weaponCategory = base.weaponCategory;
      break;
    case 'armor':
      f.def = String(base.def);
      f.maxAgi = base.maxAgi === null ? '' : String(base.maxAgi);
      break;
    case 'shield':
      f.def = String(base.def);
      break;
  }
  return f;
}

/** Pré-remplit le formulaire à partir d'une ligne existante (mode édition). */
function formFromLine(line: EquipmentLine): FormState {
  if (isCustomItem(line)) {
    return {
      ...EMPTY_FORM,
      name: line.name,
      description: line.details ?? '',
      icon: line.icon ?? null,
      magicDef: line.magicDef ? String(line.magicDef) : '',
      magicBonus: line.magicBonus ? String(line.magicBonus) : '',
      magicProperties: line.magicProperties ? line.magicProperties.map((p) => ({ ...p })) : [],
      abilityBonuses: rowsFromBonuses(ABILITY_IDS, line.abilityBonuses),
      derivedBonuses: rowsFromBonuses(ITEM_DERIVED_STAT_IDS, line.derivedBonuses),
      testBonuses: rowsFromBonuses(ITEM_TEST_TARGET_IDS, line.testBonuses),
      ...chargeFieldsFromLine(line),
      potionEnabled: line.potion !== undefined,
      potionResource: line.potion?.resource ?? EMPTY_FORM.potionResource,
      potionDie: line.potion?.die ?? EMPTY_FORM.potionDie,
      potionCount: line.potion?.count ? String(line.potion.count) : EMPTY_FORM.potionCount,
      potionEvolving: line.potion?.evolving === true,
      potionModifier: line.potion?.modifier ? String(line.potion.modifier) : EMPTY_FORM.potionModifier,
    };
  }
  const item = effectiveItem(line);
  const base = { ...EMPTY_FORM, name: item?.name ?? line.itemId, icon: line.icon ?? null };
  if (item) {
    switch (item.category) {
      case 'weapon':
        base.damage = damageToDraft(item.damage);
        base.twoHandedDamage = damageToDraft(item.twoHandedDamage);
        base.range = item.range ?? '';
        base.weaponCategory = item.weaponCategory;
        break;
      case 'armor':
        base.def = String(item.def);
        base.maxAgi = item.maxAgi === null ? '' : String(item.maxAgi);
        break;
      case 'shield':
        base.def = String(item.def);
        break;
    }
  }
  // La description d'une variante mécanique vit dans `overrides.description` (hors
  // catalogue) ; celle d'une variante de matériel passe déjà par `effectiveItem`.
  base.description = line.overrides?.description ?? (item?.category === 'gear' ? item.description ?? '' : '');
  base.magicDef = line.magicDef ? String(line.magicDef) : '';
  base.magicBonus = line.magicBonus ? String(line.magicBonus) : '';
  base.magicProperties = line.magicProperties ? line.magicProperties.map((p) => ({ ...p })) : [];
  base.abilityBonuses = rowsFromBonuses(ABILITY_IDS, line.abilityBonuses);
  base.derivedBonuses = rowsFromBonuses(ITEM_DERIVED_STAT_IDS, line.derivedBonuses);
  base.testBonuses = rowsFromBonuses(ITEM_TEST_TARGET_IDS, line.testBonuses);
  Object.assign(base, chargeFieldsFromLine(line));
  return base;
}

/**
 * Aperçu EN DIRECT et COMPACT (une ligne, retombe en plusieurs si besoin) de l'objet en cours
 * de saisie : icône + nom + type + stat du livre (DM/DEF) + badges d'enchantement, dans le
 * même langage visuel que la ligne d'inventaire (`EquipmentList`, badges partagés via
 * `MagicItemBadges`). Le sticky vit sur le conteneur appelant (en-tête type + base + aperçu),
 * pas ici — cette carte reste un simple bloc de contenu.
 */
function ItemPreviewCard({
  type,
  mechanical,
  baseId,
  name,
  form,
}: {
  type: ItemType;
  mechanical: boolean;
  baseId: string | null;
  name: string;
  form: FormState;
}) {
  const iconId: ItemIconId =
    form.icon ?? (mechanical && baseId ? defaultItemIconId({ itemId: baseId, quantity: 1 }) : type);
  const magicDefNum = Math.max(0, Number(form.magicDef) || 0);
  const magicBonusNum = type === 'weapon' ? Math.max(0, Number(form.magicBonus) || 0) : 0;
  const magicProperties = form.magicProperties.map(normalizeMagicProperty);
  const level = magicLevel({ magicBonus: magicBonusNum, magicDef: magicDefNum, magicProperties });
  const abilityBonuses = bonusesFromRows(form.abilityBonuses);
  const derivedBonuses = bonusesFromRows(form.derivedBonuses);
  const testBonuses = bonusesFromRows(form.testBonuses);

  let statLine: ReactNode = null;
  if (type === 'weapon') {
    statLine = (
      <>
        <GlossaryText>DM</GlossaryText>{' '}
        <DamageValue damage={formatWeaponDamage(draftToDamage(form.damage))} />
        {form.weaponCategory === 'oneOrTwoHands' && (
          <>
            {' / '}
            <DamageValue damage={formatWeaponDamage(draftToDamage(form.twoHandedDamage))} />
          </>
        )}
        {form.range && ` · portée ${form.range}`}
      </>
    );
  } else if (type === 'armor' || type === 'shield') {
    statLine = <GlossaryText>{`DEF +${Number(form.def) || 0}`}</GlossaryText>;
  }

  return (
    <Stack spacing={0.35} sx={{ minWidth: 0, width: '100%' }}>
      <Stack direction="row" spacing={0.6} sx={{ alignItems: 'center' }}>
        <ItemIcon id={iconId} size={18} sx={{ color: itemTypeColor(type), flexShrink: 0 }} />
        <Typography variant="body2" sx={{ fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {name || 'Nouvel objet'}
        </Typography>
      </Stack>
      <Stack direction="row" spacing={0.6} sx={{ alignItems: 'center', flexWrap: 'wrap', rowGap: 0.35 }}>
        <Typography variant="caption" color="text.secondary">
          {ITEM_TYPE_LABELS[type]}
        </Typography>
        {statLine && (
          <Typography variant="caption" color="text.secondary" component="span">
            · {statLine}
          </Typography>
        )}
        {level > 0 && (
          <Typography variant="caption" sx={{ color: 'secondary.main', fontWeight: 700 }}>
            niv.&nbsp;+{level}
          </Typography>
        )}
      </Stack>
      {(magicDefNum > 0 ||
        magicBonusNum > 0 ||
        magicProperties.length > 0 ||
        abilityBonuses ||
        derivedBonuses ||
        testBonuses) && (
        <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', rowGap: 0.35 }}>
          {magicDefNum > 0 && <MagicDefBadge value={magicDefNum} />}
          {magicBonusNum > 0 && <MagicWeaponBonusBadge value={magicBonusNum} />}
          {magicProperties.length > 0 && <MagicPropertyBadges properties={magicProperties} />}
          {abilityBonuses && <AbilityBonusBadges bonuses={abilityBonuses} />}
          {derivedBonuses && <DerivedBonusBadges bonuses={derivedBonuses} />}
          {testBonuses && <TestBonusBadges bonuses={testBonuses} />}
        </Stack>
      )}
    </Stack>
  );
}

export interface ItemDialogProps {
  open: boolean;
  onClose: () => void;
  /** Ligne éditée (mode ÉDITION) ou absente (mode CRÉATION). Remonter via `key`. */
  initial?: EquipmentLine;
  /**
   * Valide : produit la ligne résultante (création → à ajouter ; édition → remplace). En
   * création avec `bulkCreate`, `count` porte le nombre d'EXEMPLAIRES demandés (≥ 1) — à
   * l'appelant de créer `count` entrées distinctes portant chacune cette même ligne (jamais
   * une seule ligne à `quantity: count` : ce sont des cartes séparées, attribuables/
   * dupliquables indépendamment). `count` est toujours `undefined` en édition.
   */
  onConfirm: (line: EquipmentLine, count?: number) => void;
  /**
   * Affiche un champ « Nombre d'exemplaires » en CRÉATION (Outils du MJ, PER-200) : préparer
   * plusieurs bourses ou objets identiques d'un coup plutôt que de rouvrir la modale N fois.
   * Absent/faux → comportement historique de la fiche (une seule ligne, jamais de champ).
   */
  bulkCreate?: boolean;
}

/**
 * Modale unifiée de création / édition d'objet (PER-214). Produit soit une **variante**
 * mécanique d'un objet du livre (`EquipmentRef` + `overrides` figées), soit un **objet
 * libre typé** (`CustomItem`), selon le type choisi.
 *
 * Parcours (création) : choix du type → si mécanique, choix d'une base du livre
 * (obligatoire, pré-remplit les stats) → nom / description / stats éditables. Cosmétique :
 * nom + description. En édition, le type/la base sont fixés (on customise CET objet) ;
 * on peut re-typer un objet cosmétique (icône + « Utiliser » du consommable).
 */
export function ItemDialog({ open, onClose, initial, onConfirm, bulkCreate = false }: ItemDialogProps) {
  // Plein écran sur mobile (PER-231) : formulaire de saisie d'objet, plus confortable
  // en plein cadre qu'en petite boîte centrée sur téléphone.
  const fullScreen = useMediaQuery((theme: Theme) => theme.breakpoints.down('sm'));
  const editing = initial !== undefined;
  // Type initial : dérivé de la ligne en édition, sinon `null` (écran de choix).
  const initialType: ItemType | null = !initial
    ? null
    : isCustomItem(initial)
      ? initial.type ?? 'misc'
      : (effectiveItem(initial)?.category as ItemType) ?? 'misc';
  // Base initiale : itemId d'une variante mécanique en édition.
  const initialBaseId = initial && !isCustomItem(initial) ? initial.itemId : null;

  const [type, setType] = useState<ItemType | null>(initialType);
  const [baseId, setBaseId] = useState<string | null>(initialBaseId);
  const initialForm = initial ? formFromLine(initial) : EMPTY_FORM;
  const [form, setForm] = useState<FormState>(initialForm);
  // Nombre d'exemplaires demandés (`bulkCreate`, création uniquement) — jamais lu en édition.
  const [count, setCount] = useState(1);
  // Accordéon Enchantement : PUREMENT d'affichage (contrairement à une case à cocher, le
  // replier ne doit pas effacer les valeurs saisies). Replié par défaut (la plupart des
  // objets ne sont pas magiques) — déplié d'entrée si l'objet édité porte déjà une trace
  // d'enchantement.
  const [enchantmentExpanded, setEnchantmentExpanded] = useState(() => formHasEnchantment(initialForm));

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  // Changement de type. Vers un type mécanique (nouvelle base à choisir) ou depuis un
  // type mécanique, on repart de zéro. Entre types cosmétiques, on conserve nom +
  // description (seuls l'icône et la consommabilité changent).
  const chooseType = (t: ItemType) => {
    const wasMechanical = type !== null && isMechanicalType(type);
    setType(t);
    if (isMechanicalType(t) || wasMechanical) {
      setBaseId(null);
      setForm(EMPTY_FORM);
      setEnchantmentExpanded(false);
    }
  };

  // Sélection d'une base du livre : pré-remplit tous les champs de stats.
  const chooseBase = (id: string | null) => {
    setBaseId(id);
    const base = id ? equipmentById.get(id) : undefined;
    setForm(base ? formFromBase(base) : EMPTY_FORM);
    setEnchantmentExpanded(false);
  };

  // Retour au choix du type (création uniquement) : réinitialise base + formulaire, comme
  // un bouton « précédent » sur un écran unique (le type choisi masque la rangée de boutons).
  const resetType = () => {
    setType(null);
    setBaseId(null);
    setForm(EMPTY_FORM);
    setEnchantmentExpanded(false);
  };

  const mechanical = type !== null && isMechanicalType(type);
  const trimmedName = form.name.trim();
  // Potion (PER-XXX) : nom par défaut dérivé de ses propriétés (« Potion de soin 1d4° ») quand le
  // joueur ne saisit rien — la fiole reste identifiable sans obliger à taper un nom.
  const potionActive = type === 'consumable' && form.potionEnabled;
  const potionCountNum = Math.max(1, Math.floor(Number(form.potionCount) || 1));
  const potionModifierNum = Math.trunc(Number(form.potionModifier) || 0);
  const potionDefaultNameValue = potionActive
    ? potionDefaultName({
        resource: form.potionResource,
        die: form.potionDie,
        ...(potionCountNum > 1 ? { count: potionCountNum } : {}),
        ...(form.potionEvolving ? { evolving: true as const } : {}),
        ...(potionModifierNum ? { modifier: potionModifierNum } : {}),
      })
    : '';
  const effectiveName = trimmedName || potionDefaultNameValue;
  const valid = type !== null && effectiveName.length > 0 && (!mechanical || baseId !== null);

  const confirm = () => {
    if (!valid || type === null) return;
    const quantity = initial?.quantity ?? 1;
    const worn = initial?.worn;
    // Bonus de DEF magique (PER-85 généralisé) : saisissable sur N'IMPORTE QUEL type
    // d'objet (armure de corps, mais aussi accessoire enchanté — bottes, cape…).
    const magic = Math.max(0, Number(form.magicDef) || 0);
    // Bonus magique +N d'ARME (PER-306, p. 251) : +N en attaque et aux DM (câblé en PER-307).
    // Réservé aux armes — un objet défensif porte son +N par `magicDef` ci-dessus. Écrit
    // seulement s'il est positif et que le type est une arme.
    const magicBonus = type === 'weapon' ? Math.max(0, Number(form.magicBonus) || 0) : 0;
    // Propriétés spéciales (PER-306, p. 251-254) : normalisées (paramètres orphelins retirés).
    // Le champ n'est écrit que s'il reste au moins une propriété.
    const normalizedProps = form.magicProperties.map(normalizeMagicProperty);
    const magicProperties = normalizedProps.length > 0 ? normalizedProps : undefined;
    // Apports de caractéristiques (PER-272) : mêmes règles pour une variante mécanique et pour
    // un objet libre — l'apport est une propriété de l'INSTANCE, pas du catalogue.
    const abilityBonuses = bonusesFromRows(form.abilityBonuses);
    // Apports de stats dérivées (PER-273) : même règle d'instance. La DÉFENSE en est exclue —
    // `magicDef` ci-dessus reste le seul canal d'enchantement défensif, parce qu'il réduit aussi
    // le malus d'armure (p. 188) et échappe au surcoût de mana (p. 178).
    const derivedBonuses = bonusesFromRows(form.derivedBonuses);
    // Apports aux tests (PER-275) : même règle d'instance, mais cumul PARTICULIER — c'est un
    // bonus de magie, non cumulable avec un autre bonus de magie sur le même test (p. 80).
    const testBonuses = bonusesFromRows(form.testBonuses);
    // Charges (PER-294) : propriété d'instance comme ci-dessus. Un maximum vide, nul ou négatif
    // signifie « objet sans charges » — le champ n'est alors pas écrit du tout, et l'état de charge
    // éventuellement présent disparaît avec lui (retirer les charges d'un objet le rend ordinaire).
    const chargesMax = Math.max(0, Math.floor(Number(form.chargesMax) || 0));
    const charges: ItemCharges | undefined =
      chargesMax > 0
        ? {
            max: chargesMax,
            ...(form.chargesOnShortRest ? { onShortRest: true as const } : {}),
            ...(form.chargesOnLongRest ? { onLongRest: true as const } : {}),
          }
        : undefined;
    // ÉTAT DE JEU et modifications d'INSTANCE que cette modale ne saisit PAS : ils doivent survivre
    // à une modification de l'objet. Sans ce report, enregistrer une baguette à moitié vide la
    // rendrait pleine, et rouvrir une pétoire bricolée lui retirerait son chargeur, son second canon
    // et ses munitions (défaut préexistant du chargement d'arme, corrigé ici au passage).
    // Les charges dépensées sont bornées au nouveau maximum, et abandonnées si les charges le sont.
    const previous = initial && !isCustomItem(initial) ? initial : undefined;
    const carriedRefState = {
      ...(previous?.instanceId ? { instanceId: previous.instanceId } : {}),
      ...(previous?.loaded !== undefined ? { loaded: previous.loaded } : {}),
      ...(previous?.magazine ? { magazine: previous.magazine } : {}),
      ...(previous?.doubleBarrel ? { doubleBarrel: previous.doubleBarrel } : {}),
    };
    const spent = Math.min(Math.max(0, Math.floor(initial?.chargesSpent ?? 0)), chargesMax);
    const carriedCharges = {
      ...(charges ? { charges } : {}),
      ...(charges && spent > 0 ? { chargesSpent: spent } : {}),
    };
    // Une arme = une case (PER-284) : une variante d'arme repart toujours à 1, sauf arme de jet
    // (que le livre compte par paquets). Garde-fou pour ne pas véhiculer un « ×N » hérité.
    const weaponQuantity = (id: string) => (isThrownWeapon(equipmentById.get(id)) ? quantity : 1);
    // `count` ne porte JAMAIS de sens en édition (une seule ligne existe déjà) — bornage ≥ 1
    // défensif même si le champ n'est affiché qu'en création (`bulkCreate && !editing`).
    const bulkCount = bulkCreate && !editing ? Math.max(1, Math.floor(count) || 1) : undefined;
    if (mechanical && baseId) {
      const overrides = snapshotOverrides(type, {
        name: trimmedName,
        description: form.description,
        damage: type === 'weapon' ? draftToDamage(form.damage) : undefined,
        // Le DM à deux mains n'a de sens que pour une arme « à une ou deux mains ».
        twoHandedDamage:
          type === 'weapon' && form.weaponCategory === 'oneOrTwoHands'
            ? draftToDamage(form.twoHandedDamage)
            : undefined,
        range: form.range,
        weaponCategory: form.weaponCategory,
        def: form.def.trim() === '' ? undefined : Number(form.def) || 0,
        maxAgi: type === 'armor' ? (form.maxAgi.trim() === '' ? null : Number(form.maxAgi) || 0) : undefined,
      });
      const line: EquipmentRef = {
        itemId: baseId,
        quantity: type === 'weapon' ? weaponQuantity(baseId) : quantity,
        ...(worn ? { worn } : {}),
        // Icône choisie : écrite SEULEMENT si elle diffère du défaut, pour qu'une ligne laissée
        // au réglage d'origine continue de suivre la donnée du livre si celle-ci évolue.
        ...(form.icon && form.icon !== defaultItemIconId({ itemId: baseId, quantity: 1 })
          ? { icon: form.icon }
          : {}),
        ...carriedRefState,
        overrides,
        ...(magic > 0 ? { magicDef: magic } : {}),
        ...(magicBonus > 0 ? { magicBonus } : {}),
        ...(magicProperties ? { magicProperties } : {}),
        ...(abilityBonuses ? { abilityBonuses } : {}),
        ...(derivedBonuses ? { derivedBonuses } : {}),
        ...(testBonuses ? { testBonuses } : {}),
        ...carriedCharges,
      };
      onConfirm(line, bulkCount);
    } else {
      // Potion d'énergie custom (PER-XXX) : réservée aux consommables, cochée dans le formulaire.
      // `count`/`modifier` ne sont écrits que s'ils s'écartent du défaut (1 dé, aucun bonus).
      const potion = potionActive
        ? {
            resource: form.potionResource,
            die: form.potionDie,
            ...(potionCountNum > 1 ? { count: potionCountNum } : {}),
            ...(form.potionEvolving ? { evolving: true as const } : {}),
            ...(potionModifierNum ? { modifier: potionModifierNum } : {}),
          }
        : undefined;
      onConfirm({
        custom: true,
        name: effectiveName,
        quantity,
        ...(worn ? { worn } : {}),
        type,
        // Idem : une icône égale à celle du type reste implicite (pas de champ écrit).
        ...(form.icon && form.icon !== type ? { icon: form.icon } : {}),
        details: form.description.trim() || undefined,
        ...(magic > 0 ? { magicDef: magic } : {}),
        ...(magicBonus > 0 ? { magicBonus } : {}),
        ...(magicProperties ? { magicProperties } : {}),
        ...(abilityBonuses ? { abilityBonuses } : {}),
        ...(derivedBonuses ? { derivedBonuses } : {}),
        ...(testBonuses ? { testBonuses } : {}),
        ...carriedCharges,
        ...(potion ? { potion } : {}),
      }, bulkCount);
    }
  };

  const baseOptions = mechanical
    ? equipmentCatalog.filter((e) => e.category === type)
    : [];
  const selectedBase = baseId ? equipmentById.get(baseId) : undefined;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      // Largeur FIXE (md) qu'Enchantement soit ouvert ou pas — sinon la modale change de
      // taille au dépli/repli, désagréable (retour propriétaire).
      maxWidth="md"
      fullWidth
      fullScreen={fullScreen}
    >
      <DialogTitle sx={{ position: 'relative', pr: 6 }}>
        {editing ? 'Modifier l’objet' : 'Ajouter un objet'}
        <IconButton
          aria-label="Fermer"
          onClick={onClose}
          size="small"
          sx={{ position: 'absolute', top: 8, right: 8 }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 0.5 }}>
          {/* En-tête STICKY (type + base du livre + aperçu) : reste visible pendant le
              défilement des sections Identité/Caractéristiques/Enchantement, qui peuvent
              devenir longues (retour propriétaire). AUCUN fond ici (retour propriétaire, même
              pas un voile teinté — `background.paper` en brut est plus SOMBRE que la surface
              réellement affichée par le Dialog, qui reçoit un overlay d'élévation MUI en thème
              sombre ; d'où le rectangle gris foncé visible malgré l'opacité réduite tentée
              précédemment). Seul le flou reste, pour garder lisible ce qui défile dessous.
              Seule la carte d'aperçu à droite porte un fond plein. */}
          <Box
            sx={{
              position: 'sticky',
              top: 0,
              zIndex: 3,
              pt: 0.5,
              pb: 1,
              mb: 0.5,
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              borderBottom: 1,
              borderColor: 'divider',
            }}
          >
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ alignItems: 'stretch' }}>
              <Stack spacing={1.5} sx={{ flex: '1 1 auto', minWidth: 0 }}>
              {/* 1. Choix du type. En édition mécanique, verrouillé (le type = la base). En
                  édition cosmétique, restreint aux types cosmétiques (re-typage autorisé). */}
              {editing && mechanical ? (
                <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  <ItemTypeIcon type={type} size={18} />
                  {ITEM_TYPE_LABELS[type]}
                </Typography>
              ) : !editing && type !== null ? (
                // Création, type déjà choisi : la rangée de boutons laisse place à un rappel du
                // type retenu + un retour « Changer de type » qui ramène au choix (écran unique).
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Button
                    size="small"
                    startIcon={<ArrowBackIcon />}
                    onClick={resetType}
                    sx={{ textTransform: 'none' }}
                  >
                    Changer de type
                  </Button>
                  <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <ItemTypeIcon type={type} size={18} />
                    {ITEM_TYPE_LABELS[type]}
                  </Typography>
                </Box>
              ) : (
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.75 }}>
                    Type d’objet
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                    {(editing ? COSMETIC_TYPES : TYPE_ORDER).map((t) => (
                      <Button
                        key={t}
                        size="small"
                        variant={type === t ? 'contained' : 'outlined'}
                        startIcon={<ItemTypeIcon type={t} />}
                        onClick={() => chooseType(t)}
                        sx={{ textTransform: 'none' }}
                      >
                        {ITEM_TYPE_LABELS[t]}
                      </Button>
                    ))}
                  </Box>
                </Box>
              )}

              {/* 2. Base du livre (mécanique, obligatoire). En édition, base verrouillée. */}
              {mechanical &&
                (editing ? (
                  <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    {baseId && <ItemIcon id={itemIconId({ itemId: baseId, quantity: 1 })} sx={{ color: 'text.secondary' }} />}
                    Base&nbsp;: {selectedBase?.name ?? baseId}
                  </Typography>
                ) : (
                  <Autocomplete
                    options={baseOptions}
                    getOptionLabel={(o) => o.name}
                    value={selectedBase ?? null}
                    onChange={(_, v) => chooseBase(v ? v.id : null)}
                    // Contact / distance uniquement pour les armes (p. 183/185) : les autres types
                    // (armure, bouclier) n'ont qu'une seule base pertinente, pas de sous-groupe.
                    groupBy={type === 'weapon' ? (o) => weaponBaseGroup(o) : undefined}
                    renderGroup={(params) => {
                      const group = params.group as WeaponBaseGroup;
                      return (
                        <li key={params.key}>
                          <Box
                            sx={(theme) => ({
                              display: 'flex',
                              alignItems: 'center',
                              gap: 0.75,
                              px: 1.25,
                              py: 0.5,
                              position: 'sticky',
                              top: -8,
                              zIndex: 1,
                              backgroundColor: alpha(theme.palette.background.paper, 0.92),
                              backdropFilter: 'blur(8px)',
                              WebkitBackdropFilter: 'blur(8px)',
                              borderLeft: `3px solid ${itemTypeColor('weapon')}`,
                              borderBottom: `1px solid ${theme.palette.divider}`,
                              color: itemTypeColor('weapon'),
                              fontWeight: 700,
                              fontSize: '0.75rem',
                            })}
                          >
                            {group === 'melee' ? (
                              <SportsMartialArtsIcon sx={{ fontSize: 18 }} />
                            ) : (
                              <GpsFixedIcon sx={{ fontSize: 18 }} />
                            )}
                            <span>{WEAPON_BASE_GROUP_LABEL[group]}</span>
                          </Box>
                          <ul style={{ padding: 0, margin: 0 }}>{params.children}</ul>
                        </li>
                      );
                    }}
                    renderOption={(props, o) => {
                      const { key, ...optionProps } = props as typeof props & { key?: string };
                      return (
                        <Box
                          component="li"
                          key={key}
                          {...optionProps}
                          sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}
                        >
                          <ItemIcon id={itemIconId({ itemId: o.id, quantity: 1 })} sx={{ color: 'text.secondary' }} />
                          <Typography variant="body2">{o.name}</Typography>
                        </Box>
                      );
                    }}
                    renderInput={({ slotProps, ...params }) => (
                      <TextField
                        {...params}
                        label={`Objet du livre (base ${ITEM_TYPE_LABELS[type].toLowerCase()})`}
                        size="small"
                        required
                        slotProps={{
                          ...slotProps,
                          input: {
                            ...slotProps.input,
                            // Icône de la base sélectionnée, pour la retrouver au coup d'œil
                            // (retour propriétaire) — même icône que dans le sélecteur déroulant.
                            startAdornment: selectedBase ? (
                              <ItemIcon
                                id={itemIconId({ itemId: selectedBase.id, quantity: 1 })}
                                sx={{ color: 'text.secondary', ml: 0.5 }}
                              />
                            ) : (
                              slotProps.input.startAdornment
                            ),
                          },
                        }}
                      />
                    )}
                    blurOnSelect
                  />
                ))}
              </Stack>

              {/* Aperçu compact de l'objet en cours (icône/nom/type/stat/niveau) : seul bloc à
                  porter un fond, à côté du type/de la base plutôt qu'en pleine largeur. */}
              {type !== null && (!mechanical || baseId !== null) && (
                <Box
                  sx={{
                    flex: { xs: '1 1 auto', sm: '0 0 260px' },
                    minWidth: 0,
                    bgcolor: 'background.paper',
                    borderRadius: 1,
                    border: 1,
                    borderColor: 'divider',
                    p: 1,
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <ItemPreviewCard
                    type={type}
                    mechanical={mechanical}
                    baseId={baseId}
                    name={effectiveName}
                    form={form}
                  />
                </Box>
              )}
            </Stack>
          </Box>

          {/* 3+. Champs de saisie : dès qu'un type cosmétique est choisi, ou qu'une base
              mécanique est sélectionnée. */}
          {type !== null && (!mechanical || baseId !== null) && (
            <>
              <FormAccordion title="Identité" defaultExpanded>
                <TextField
                  autoFocus
                  size="small"
                  label="Nom de l’objet"
                  // Potion (PER-XXX) : nom vide → suggestion dérivée des propriétés (« Potion de
                  // soin 1d4° »), affichée en `placeholder` et effectivement utilisée à la
                  // validation si le joueur ne tape rien — pas d'obligation de nommer la fiole.
                  placeholder={potionActive ? potionDefaultNameValue : undefined}
                  value={form.name}
                  onChange={(e) => setField('name', e.target.value)}
                  required={!potionActive}
                  fullWidth
                />
                {/* Éditeur riche Tiptap (PER-397) : gras/italique/barré/couleur/taille, sérialisés
                    en `string` simple (jamais de HTML) — voir `richTextEditorSync.ts`. */}
                <ItemDescriptionEditor
                  value={form.description}
                  onChange={(text) => setField('description', text)}
                  placeholder="Origine, propriétés, notes libres…"
                />
                {/* Nombre d'exemplaires (`bulkCreate`, Outils du MJ, extension PER-200) : crée
                    `count` CARTES DISTINCTES portant chacune cette ligne — jamais une seule ligne
                    à quantité N, pour rester attribuables/dupliquables indépendamment. */}
                {bulkCreate && !editing && (
                  <TextField
                    type="number"
                    size="small"
                    label="Nombre d’exemplaires"
                    value={count}
                    onChange={(e) => setCount(Math.max(1, Math.floor(Number(e.target.value)) || 1))}
                    slotProps={{ htmlInput: { min: 1, max: 50 } }}
                    helperText="Crée cette carte plusieurs fois d’un coup (ex. 5 bourses identiques)."
                    sx={{ maxWidth: 260 }}
                  />
                )}
                {/* Icône de l'objet : pré-réglée sur celle que l'inventaire lui donnerait
                    (sous-catégorie du livre pour une variante, icône du type pour un objet
                    libre), et librement changeable. */}
                <ItemIconPicker
                  value={form.icon}
                  defaultIcon={
                    mechanical && baseId ? defaultItemIconId({ itemId: baseId, quantity: 1 }) : type
                  }
                  onChange={(icon) => setField('icon', icon)}
                />
              </FormAccordion>

              {/* Potion d'énergie custom (PER-XXX) : réservée aux consommables — restaure 1dX
                  points d'une ressource du personnage (PV, PM, chance, DR, rage) à l'usage, sur
                  le modèle de la « Bourse de NdM pièces ». Remontée en priorité, juste après
                  l'identité : c'est le champ qui définit un consommable en tant que potion. */}
              {type === 'consumable' && (
                <>
                  <SectionDivider label="Potion" />
                  <FormControlLabel
                    control={
                      <Checkbox
                        size="small"
                        checked={form.potionEnabled}
                        onChange={(e) => setField('potionEnabled', e.target.checked)}
                      />
                    }
                    label="Cette potion restaure de l’énergie"
                  />
                  {form.potionEnabled && (
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', rowGap: 1 }}>
                      <TextField
                        select
                        size="small"
                        label="Énergie restaurée"
                        value={form.potionResource}
                        onChange={(e) => setField('potionResource', e.target.value as RestorableResourceKind)}
                        sx={{ flex: '1 1 200px', minWidth: 180 }}
                      >
                        {RESTORABLE_RESOURCE_KINDS.map((k) => (
                          <MenuItem key={k} value={k}>
                            {RESTORABLE_RESOURCE_LABEL[k]}
                          </MenuItem>
                        ))}
                      </TextField>
                      <TextField
                        type="number"
                        size="small"
                        label="Nombre de dés"
                        value={form.potionCount}
                        onChange={(e) => setField('potionCount', e.target.value)}
                        slotProps={{ htmlInput: { min: 1 } }}
                        sx={{ flex: '1 1 110px', minWidth: 100 }}
                      />
                      {/* Dé FIXE ou ÉVOLUTIF « d4° » (table p. 43, RÈGLE MAISON) — même sélecteur
                          que le Fléau/Élément custom des objets magiques (`EVOLVING_DIE_OPTION`
                          en tête de liste) : la face réelle d'un dé évolutif se résout au niveau
                          du personnage, à l'usage (`PotionDialog`), pas ici. */}
                      <TextField
                        select
                        size="small"
                        label="Dé"
                        value={form.potionEvolving ? EVOLVING_DIE_OPTION : form.potionDie}
                        onChange={(e) => {
                          const v = e.target.value;
                          if (v === EVOLVING_DIE_OPTION) {
                            setForm((f) => ({ ...f, potionEvolving: true, potionDie: 'd4' }));
                          } else {
                            setForm((f) => ({ ...f, potionEvolving: false, potionDie: v as DamageDie }));
                          }
                        }}
                        sx={{ flex: '1 1 96px', minWidth: 92 }}
                      >
                        <MenuItem value={EVOLVING_DIE_OPTION}>
                          <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                            <DieIcon die="d4" evolving size={18} noTooltip />
                            d4°
                          </Box>
                        </MenuItem>
                        {DAMAGE_DICE.map((d) => (
                          <MenuItem key={d} value={d}>
                            <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                              <DieIcon die={d} size={18} noTooltip />
                              {d}
                            </Box>
                          </MenuItem>
                        ))}
                      </TextField>
                      <TextField
                        type="number"
                        size="small"
                        label="Bonus plat"
                        placeholder="0"
                        value={form.potionModifier}
                        onChange={(e) => setField('potionModifier', e.target.value)}
                        sx={{ flex: '1 1 110px', minWidth: 100 }}
                      />
                      <Typography variant="caption" color="text.secondary" sx={{ flexBasis: '100%' }}>
                        À l’usage, le joueur lance {potionCountNum}
                        {form.potionEvolving ? 'd4°' : form.potionDie}
                        {potionModifierNum ? `${potionModifierNum > 0 ? '+' : ''}${potionModifierNum}` : ''} à la
                        table et saisit le résultat.
                        {form.potionEvolving &&
                          ' La face du dé évolutif est résolue automatiquement selon le niveau du personnage.'}
                        {trimmedName.length === 0 && ` Nom par défaut : « ${potionDefaultNameValue} ».`}
                      </Typography>
                    </Stack>
                  )}
                </>
              )}

              {/* Stats reprises du livre (arme / armure / bouclier), pré-remplies depuis la base
                  et surchargeables : c'est ce qui fait de la ligne une VARIANTE. Aucune pour un
                  objet libre, d'où l'accordéon conditionné à la famille mécanique. */}
              {mechanical && (
                <FormAccordion title="Caractéristiques" defaultExpanded>
                  {/* Stats d'arme. */}
                  {type === 'weapon' && (
                    <>
                      <TextField
                        select
                        size="small"
                        label="Catégorie"
                        value={form.weaponCategory}
                        onChange={(e) => setField('weaponCategory', e.target.value as WeaponCategory)}
                        fullWidth
                      >
                        {WEAPON_CATEGORIES.map((c) => (
                          <MenuItem key={c} value={c}>
                            {WEAPON_CATEGORY_LABELS[c]}
                          </MenuItem>
                        ))}
                      </TextField>
                      <WeaponDamageFields
                        label={form.weaponCategory === 'oneOrTwoHands' ? 'DM à une main' : 'Dégâts (DM)'}
                        value={form.damage}
                        onChange={(d) => setField('damage', d)}
                      />
                      {form.weaponCategory === 'oneOrTwoHands' && (
                        <WeaponDamageFields
                          label="DM à deux mains"
                          value={form.twoHandedDamage}
                          onChange={(d) => setField('twoHandedDamage', d)}
                        />
                      )}
                      <TextField
                        size="small"
                        label="Portée"
                        placeholder="ex. 20 m"
                        value={form.range}
                        onChange={(e) => setField('range', e.target.value)}
                        fullWidth
                      />
                    </>
                  )}

                  {/* Stats d'armure de corps : DEF mondaine + plafond AGI (catalogue). */}
                  {type === 'armor' && (
                    <Stack direction="row" spacing={1}>
                      <TextField
                        type="number"
                        size="small"
                        label="DEF"
                        value={form.def}
                        onChange={(e) => setField('def', e.target.value)}
                        sx={{ flex: 1 }}
                      />
                      <TextField
                        type="number"
                        size="small"
                        label="Plafond AGI"
                        placeholder="aucun"
                        helperText="vide = pas de plafond"
                        value={form.maxAgi}
                        onChange={(e) => setField('maxAgi', e.target.value)}
                        sx={{ flex: 1 }}
                      />
                    </Stack>
                  )}

                  {/* Stat de bouclier : DEF seule. */}
                  {type === 'shield' && (
                    <TextField
                      type="number"
                      size="small"
                      label="DEF"
                      value={form.def}
                      onChange={(e) => setField('def', e.target.value)}
                      sx={{ width: 140 }}
                    />
                  )}
                </FormAccordion>
              )}

              {/* Enchantement : tout ce qui relève de l'EXEMPLAIRE possédé et non du livre. Accordéon
                  CONTRÔLÉ (contrairement à Identité/Caractéristiques) : replié par défaut (la plupart
                  des objets ne sont pas magiques), mais déplié d'entrée si l'objet édité porte déjà
                  une de ces propriétés (`formHasEnchantment`) — et le repli ne les efface jamais. */}
              <FormAccordion
                title="Enchantement"
                expanded={enchantmentExpanded}
                onChange={setEnchantmentExpanded}
                subtitle={(() => {
                  const level = magicLevel({
                    magicBonus: type === 'weapon' ? Number(form.magicBonus) || 0 : 0,
                    magicDef: Number(form.magicDef) || 0,
                    magicProperties: form.magicProperties,
                  });
                  if (level <= 0) return null;
                  return (
                    <Typography variant="caption" sx={{ color: 'secondary.main', fontWeight: 700 }}>
                      niveau&nbsp;+{level}
                    </Typography>
                  );
                })()}
              >
                <Stack
                  direction="row"
                  spacing={1.5}
                  sx={{ alignItems: 'flex-start', flexWrap: 'wrap', rowGap: 1 }}
                >
                  {/* Bonus magique +N d'ARME (PER-306, p. 251) : « un bonus en attaque et aux
                      dommages ». Réservé aux armes — pour un objet défensif, c'est la DEF
                      magique ci-dessous qui porte le +N. */}
                  {type === 'weapon' && (
                    <SignedNumberField
                      size="small"
                      label="Bonus magique (+N)"
                      value={Math.max(0, Math.floor(Number(form.magicBonus) || 0))}
                      onChange={(v) => setField('magicBonus', v > 0 ? String(v) : '')}
                      containerSx={{ maxWidth: 200 }}
                    />
                  )}

                  {/* Bonus de DEF MAGIQUE (PER-85 généralisé) : disponible sur TOUT type
                      d'objet (armure, mais aussi bottes/cape/anneau enchantés). */}
                  <TextField
                    type="number"
                    size="small"
                    label="DEF magique"
                    placeholder="0"
                    helperText="hors surcoût de mana (p. 178)"
                    value={form.magicDef}
                    onChange={(e) => setField('magicDef', e.target.value)}
                    sx={{ maxWidth: 200 }}
                  />
                </Stack>

                {/* Récapitulatif EN DIRECT du niveau de magie et de la valeur estimée (p. 244 :
                    valeur = niveau² × 200 po). */}
                {(() => {
                  const level = magicLevel({
                    magicBonus: type === 'weapon' ? Number(form.magicBonus) || 0 : 0,
                    magicDef: Number(form.magicDef) || 0,
                    magicProperties: form.magicProperties,
                  });
                  if (level <= 0 && form.magicProperties.length === 0) return null;
                  return (
                    <Typography variant="body2" color="text.secondary">
                      Niveau de magie&nbsp;: <strong>{level}</strong>
                      {level > 0 && (
                        <>
                          {' '}
                          — valeur estimée ≈ {magicItemValue(level).toLocaleString('fr-FR')} po
                        </>
                      )}
                    </Typography>
                  );
                })()}

                {/* Deux colonnes sur écran large (repli en 1 colonne sous `sm`, mobile déjà
                    plein cadre) : gauche = propriétés spéciales, droite = apports d'instance
                    (caracs / stats dérivées / tests) + charges. */}
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                    gap: 2,
                    alignItems: 'start',
                  }}
                >
                  {/* Propriétés spéciales (PER-306, p. 251-254) : famille ARME pour une arme,
                      famille DÉFENSE pour tout le reste (armure, bouclier, mais aussi
                      accessoires enchantés — cape de protection, anneau…). */}
                  <MagicPropertyRows
                    kinds={type === 'weapon' ? MAGIC_WEAPON_PROPERTY_KINDS : MAGIC_DEFENSE_PROPERTY_KINDS}
                    title="Propriétés magiques spéciales"
                    addLabel="Ajouter une propriété"
                    rows={form.magicProperties}
                    onChange={(rows) => setField('magicProperties', rows)}
                  />

                  <Stack spacing={2} divider={<Divider />}>
                    {/* Bonus/malus de CARACTÉRISTIQUES (PER-272), par lignes. */}
                    <BonusRows
                      ids={ABILITY_IDS}
                      title="Bonus de caractéristiques"
                      selectLabel="Caractéristique"
                      fullMessage="Les 7 caractéristiques sont déjà couvertes."
                      renderOption={(id) => (
                        <>
                          <AbilityIcon ability={id} size={18} />
                          {id} — {ABILITY_NAMES[id]}
                        </>
                      )}
                      rows={form.abilityBonuses}
                      onChange={(rows) => setField('abilityBonuses', rows)}
                    />

                    {/* Bonus/malus de STATISTIQUES DÉRIVÉES (PER-273), par lignes. La DÉFENSE
                        n'y figure pas volontairement (cf. `ItemDerivedStatId`) : la « DEF
                        magique » ci-dessus reste le seul canal d'enchantement défensif. */}
                    <BonusRows
                      ids={ITEM_DERIVED_STAT_IDS}
                      title="Bonus de statistiques dérivées"
                      selectLabel="Statistique"
                      fullMessage="Toutes les statistiques modifiables sont déjà couvertes."
                      renderOption={(id) => (
                        <>
                          <DerivedStatIcon statId={DERIVED_MOD_DISPLAY_ID[id]} size={18} />
                          {DERIVED_MOD_NAMES[id]}
                        </>
                      )}
                      rows={form.derivedBonuses}
                      onChange={(rows) => setField('derivedBonuses', rows)}
                    />

                    {/* Bonus/malus aux TESTS (PER-275), par lignes : c'est un BONUS DE MAGIE, non
                        cumulable avec un autre bonus de magie sur le même test (p. 80) — deux
                        objets sur la même cible ne s'additionnent pas, le meilleur gagne. */}
                    <BonusRows
                      ids={ITEM_TEST_TARGET_IDS}
                      title="Bonus aux tests (bonus de magie)"
                      selectLabel="Caractéristique ou domaine"
                      fullMessage="Toutes les cibles possibles sont déjà couvertes."
                      searchable
                      groupOf={(id) =>
                        testDomainById.has(id) ? 'Domaines de compétence' : 'Caractéristiques (tous les tests)'
                      }
                      optionLabel={(id) => {
                        const domain = testDomainById.get(id);
                        return domain ? domain.label : `${id} — ${ABILITY_NAMES[id as AbilityId]}`;
                      }}
                      renderOption={(id) => {
                        const domain = testDomainById.get(id);
                        // Le code de la carac passe par la puce tiretée teintée qui est la NORME
                        // d'affichage d'une caractéristique dans l'app (`AbilityCodeChip`) : dans
                        // une liste d'une centaine de domaines, c'est ce qui rend la carac
                        // gouvernante repérable d'un coup d'œil. Un domaine multi-carac en porte
                        // une par carac.
                        return domain ? (
                          <>
                            <Box component="span">{domain.label}</Box>
                            {domain.abilities.map((a) => (
                              <AbilityCodeChip key={a} ability={a} noTooltip />
                            ))}
                          </>
                        ) : (
                          <>
                            <AbilityIcon ability={id as AbilityId} size={18} />
                            <AbilityCodeChip ability={id as AbilityId} noTooltip />
                            {ABILITY_NAMES[id as AbilityId]}
                          </>
                        );
                      }}
                      rows={form.testBonuses}
                      onChange={(rows) => setField('testBonuses', rows)}
                    />

                    {/* CHARGES (PER-294) : baguette, sceptre, talisman… Les deux cases de
                        rechargement sont indépendantes et cumulables ; aucune cochée =
                        rechargement à la main uniquement. RÈGLE MAISON : aucun objet à charges
                        dans le livre de base. */}
                    <Box>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ display: 'block', mb: 0.75 }}
                      >
                        Charges
                      </Typography>
                      <TextField
                        type="number"
                        size="small"
                        label="Nombre de charges"
                        placeholder="0"
                        helperText="vide = utilisations illimitées"
                        value={form.chargesMax}
                        onChange={(e) => setField('chargesMax', e.target.value)}
                        fullWidth
                      />
                      {(Number(form.chargesMax) || 0) > 0 && (
                        <Stack sx={{ mt: 0.5 }}>
                          <FormControlLabel
                            control={
                              <Checkbox
                                size="small"
                                checked={form.chargesOnShortRest}
                                onChange={(e) => setField('chargesOnShortRest', e.target.checked)}
                              />
                            }
                            label="Se recharge à plein au repos court"
                          />
                          <FormControlLabel
                            control={
                              <Checkbox
                                size="small"
                                checked={form.chargesOnLongRest}
                                onChange={(e) => setField('chargesOnLongRest', e.target.checked)}
                              />
                            }
                            label="Se recharge à plein au repos long"
                          />
                          {form.chargesOnShortRest && (
                            <Typography variant="caption" color="text.secondary">
                              Un repos long recharge aussi ce qui se recharge au repos court.
                            </Typography>
                          )}
                        </Stack>
                      )}
                    </Box>
                  </Stack>
                </Box>
              </FormAccordion>
            </>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Annuler</Button>
        <Button variant="contained" disabled={!valid} onClick={confirm}>
          {editing ? 'Enregistrer' : bulkCreate && count > 1 ? `Ajouter ${count} exemplaires` : 'Ajouter'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
