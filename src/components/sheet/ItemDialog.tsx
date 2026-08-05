'use client';

import { useState, type ReactNode } from 'react';
import AddIcon from '@mui/icons-material/Add';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
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
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import type { Theme } from '@mui/material/styles';
import { equipment as equipmentCatalog, equipmentById, testDomainById } from '@/data';
import {
  ABILITY_IDS,
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
import { AbilityCodeChip } from '@/components/sheet/FeatureRichText';
import { DerivedStatIcon } from '@/components/DerivedStatIcon';
import { ItemTypeIcon } from '@/components/ItemTypeIcon';
import { ItemIconPicker } from '@/components/sheet/ItemIconPicker';
import { defaultItemIconId } from '@/lib/ui/itemIcon';
import type { ItemIconId } from '@/data/item-icons';
import { DieIcon } from '@/components/DieIcon';
import { SignedNumberField } from '@/components/SignedNumberField';

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

/** `weapon`/`armor`/`shield` sont mécaniques (variante d'une base du livre). */
function isMechanicalType(type: ItemType): type is MechanicalCategory {
  return type === 'weapon' || type === 'armor' || type === 'shield';
}

/** Dés de DM proposés à la saisie (PER-217) — `d3` inclus (rendu en texte, sans icône). */
const DAMAGE_DICE: DamageDie[] = ['d3', 'd4', 'd6', 'd8', 'd10', 'd12', 'd20'];

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
 * `<DieIcon>`, `d3` en texte) + modificateur plat + case « DM temporaires » (non létal).
 * Remplace l'ancienne formule tapée à la main.
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
                {d === 'd3' ? null : <DieIcon die={d} size={18} noTooltip />}
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
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
        {firstFree === undefined
          ? fullMessage
          : 'Score positif (bonus) ou négatif (malus), pris en compte quand l’objet est équipé.'}
      </Typography>
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

              {/* Élément / Résistance : substance concernée. */}
              {(row.kind === 'elemental' || row.kind === 'resistance') && (
                <TextField
                  select
                  size="small"
                  label="Substance"
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
};

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

export interface ItemDialogProps {
  open: boolean;
  onClose: () => void;
  /** Ligne éditée (mode ÉDITION) ou absente (mode CRÉATION). Remonter via `key`. */
  initial?: EquipmentLine;
  /** Valide : produit la ligne résultante (création → à ajouter ; édition → remplace). */
  onConfirm: (line: EquipmentLine) => void;
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
export function ItemDialog({ open, onClose, initial, onConfirm }: ItemDialogProps) {
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
  const [form, setForm] = useState<FormState>(initial ? formFromLine(initial) : EMPTY_FORM);

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
    }
  };

  // Sélection d'une base du livre : pré-remplit tous les champs de stats.
  const chooseBase = (id: string | null) => {
    setBaseId(id);
    const base = id ? equipmentById.get(id) : undefined;
    setForm(base ? formFromBase(base) : EMPTY_FORM);
  };

  // Retour au choix du type (création uniquement) : réinitialise base + formulaire, comme
  // un bouton « précédent » sur un écran unique (le type choisi masque la rangée de boutons).
  const resetType = () => {
    setType(null);
    setBaseId(null);
    setForm(EMPTY_FORM);
  };

  const mechanical = type !== null && isMechanicalType(type);
  const trimmedName = form.name.trim();
  const valid = type !== null && trimmedName.length > 0 && (!mechanical || baseId !== null);

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
      onConfirm(line);
    } else {
      onConfirm({
        custom: true,
        name: trimmedName,
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
      });
    }
  };

  const baseOptions = mechanical
    ? equipmentCatalog.filter((e) => e.category === type)
    : [];
  const selectedBase = baseId ? equipmentById.get(baseId) : undefined;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth fullScreen={fullScreen}>
      <DialogTitle>{editing ? 'Modifier l’objet' : 'Ajouter un objet'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 0.5 }}>
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
              <Typography variant="body2" color="text.secondary">
                Base&nbsp;: {selectedBase?.name ?? baseId}
              </Typography>
            ) : (
              <Autocomplete
                options={baseOptions}
                getOptionLabel={(o) => o.name}
                value={selectedBase ?? null}
                onChange={(_, v) => chooseBase(v ? v.id : null)}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label={`Objet du livre (base ${ITEM_TYPE_LABELS[type].toLowerCase()})`}
                    size="small"
                    required
                  />
                )}
                blurOnSelect
              />
            ))}

          {/* 3+. Champs de saisie : dès qu'un type cosmétique est choisi, ou qu'une base
              mécanique est sélectionnée. */}
          {type !== null && (!mechanical || baseId !== null) && (
            <>
              <SectionDivider label="Identité" />
              <TextField
                autoFocus
                size="small"
                label="Nom de l’objet"
                value={form.name}
                onChange={(e) => setField('name', e.target.value)}
                required
                fullWidth
              />
              <TextField
                size="small"
                label="Description"
                placeholder="Origine, propriétés, notes libres…"
                value={form.description}
                onChange={(e) => setField('description', e.target.value)}
                multiline
                minRows={2}
                fullWidth
              />
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

              {/* Stats reprises du livre (arme / armure / bouclier), pré-remplies depuis la base
                  et surchargeables : c'est ce qui fait de la ligne une VARIANTE. Aucune pour un
                  objet libre, d'où le séparateur conditionné à la famille mécanique. */}
              {mechanical && <SectionDivider label="Caractéristiques" />}

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

              {/* Stat de bouclier : DEF seule. Rangée AVEC les autres caractéristiques du livre —
                  elle était jusqu'ici tout en bas du formulaire, séparée des stats d'arme et
                  d'armure par les quatre blocs d'enchantement, ce qui n'avait aucune raison d'être. */}
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

              {/* Enchantement : tout ce qui relève de l'EXEMPLAIRE possédé et non du livre — DEF
                  magique, apports de caracs / de stats dérivées / aux tests. Chacun a son propre
                  intitulé, d'où des séparateurs sans titre entre eux. */}
              <SectionDivider label="Enchantement" />

              {/* Bonus magique +N d'ARME (PER-306, p. 251) : « un bonus en attaque et aux
                  dommages ». Réservé aux armes — pour un objet défensif, c'est la DEF magique
                  ci-dessous qui porte le +N. Les effets sont câblés au ticket suivant (PER-307). */}
              {type === 'weapon' && (
                <SignedNumberField
                  size="small"
                  label="Bonus magique (+N)"
                  value={Math.max(0, Math.floor(Number(form.magicBonus) || 0))}
                  onChange={(v) => setField('magicBonus', v > 0 ? String(v) : '')}
                  containerSx={{ maxWidth: 200 }}
                />
              )}

              {/* Bonus de DEF MAGIQUE (PER-85 généralisé) : disponible sur TOUT type d'objet
                  (armure, mais aussi bottes/cape/anneau enchantés). Se cumule dans la DEF
                  totale quand l'objet est porté, hors surcoût de mana des sorts en armure. Pour
                  un objet magique de défense, c'est aussi ce +N qui compte dans le niveau de
                  magie (p. 253). */}
              <TextField
                type="number"
                size="small"
                label="DEF magique"
                placeholder="0"
                helperText="bonus magique cumulable si l’objet est équipé (hors surcoût de mana)"
                value={form.magicDef}
                onChange={(e) => setField('magicDef', e.target.value)}
                sx={{ maxWidth: 320 }}
              />

              {/* Propriétés spéciales (PER-306, p. 251-254) : famille ARME pour une arme,
                  famille DÉFENSE pour tout le reste (armure, bouclier, mais aussi accessoires
                  enchantés — cape de protection, anneau…). Effets câblés en PER-307. */}
              <MagicPropertyRows
                kinds={type === 'weapon' ? MAGIC_WEAPON_PROPERTY_KINDS : MAGIC_DEFENSE_PROPERTY_KINDS}
                title="Propriétés magiques spéciales"
                addLabel="Ajouter une propriété"
                rows={form.magicProperties}
                onChange={(rows) => setField('magicProperties', rows)}
              />

              {/* Récapitulatif EN DIRECT du niveau de magie et de la valeur estimée (p. 244 :
                  valeur = niveau² × 200 po). N'apparaît qu'une fois l'objet réellement enchanté. */}
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

              <SectionDivider />

              {/* Bonus/malus de CARACTÉRISTIQUES (PER-272), par lignes : même famille que la DEF
                  magique (propriété de l'instance enchantée, pas du catalogue), donc disponible
                  sur TOUT type d'objet. Ne comptent que si l'objet est équipé. */}
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

              <SectionDivider />

              {/* Bonus/malus de STATISTIQUES DÉRIVÉES (PER-273), par lignes : même mécanique que
                  ci-dessus, appliquée directement à la stat (PV, initiative, chance…) au lieu de
                  la caractéristique. La DÉFENSE n'y figure pas volontairement (cf.
                  `ItemDerivedStatId`) : trop de règles se calculent depuis les valeurs d'armure,
                  et la « DEF magique » ci-dessus reste le seul canal d'enchantement défensif. */}
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

              <SectionDivider />

              {/* Bonus/malus aux TESTS (PER-275), par lignes : une cible = soit une caractéristique
                  (tous ses tests), soit un domaine de compétence. Sélecteur cherchable, la liste
                  des domaines étant longue. C'est un BONUS DE MAGIE : il se cumule aux bonus de
                  compétence des voies (p. 203) mais pas à un autre bonus de magie sur le même
                  test — deux objets sur la même cible ne s'additionnent pas, le meilleur gagne. */}
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
                  // d'affichage d'une caractéristique dans l'app (`AbilityCodeChip`) : dans une
                  // liste d'une centaine de domaines, c'est ce qui rend la carac gouvernante
                  // repérable d'un coup d'œil. Un domaine multi-carac en porte une par carac.
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

              <SectionDivider label="Charges" />

              {/* CHARGES (PER-294) : baguette, sceptre, talisman… Même famille que les bonus
                  ci-dessus — propriété de l'exemplaire possédé, disponible sur TOUT type d'objet.
                  Les deux cases de rechargement sont indépendantes et cumulables ; aucune cochée =
                  rechargement à la main uniquement. Elles n'apparaissent qu'une fois un nombre de
                  charges saisi, pour ne pas encombrer le formulaire de la quasi-totalité des objets
                  qui n'en ont pas. RÈGLE MAISON : aucun objet à charges dans le livre de base. */}
              <Box>
                <TextField
                  type="number"
                  size="small"
                  label="Nombre de charges"
                  placeholder="0"
                  helperText="vide = objet sans charges (utilisations illimitées)"
                  value={form.chargesMax}
                  onChange={(e) => setField('chargesMax', e.target.value)}
                  sx={{ maxWidth: 320 }}
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
                    <Typography variant="caption" color="text.secondary">
                      {form.chargesOnShortRest
                        ? 'Un repos long recharge aussi ce qui se recharge au repos court.'
                        : form.chargesOnLongRest
                          ? 'Le repos court ne rechargera pas cet objet.'
                          : 'Aucune case cochée : l’objet ne se recharge qu’avec le bouton « Recharger ».'}
                    </Typography>
                  </Stack>
                )}
              </Box>

            </>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Annuler</Button>
        <Button variant="contained" disabled={!valid} onClick={confirm}>
          {editing ? 'Enregistrer' : 'Ajouter'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
