'use client';

import { useState } from 'react';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Autocomplete from '@mui/material/Autocomplete';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { equipment as equipmentCatalog, equipmentById } from '@/data';
import {
  WEAPON_CATEGORIES,
  type DamageDie,
  type EquipmentItem,
  type WeaponCategory,
  type WeaponDamage,
} from '@/data/schema';
import type { EquipmentLine, EquipmentRef, ItemType } from '@/lib/character/types';
import { isCustomItem } from '@/lib/character/types';
import {
  ITEM_TYPE_ORDER,
  effectiveItem,
  snapshotOverrides,
  type MechanicalCategory,
} from '@/lib/character/items';
import { ItemTypeIcon } from '@/components/ItemTypeIcon';
import { DieIcon } from '@/components/DieIcon';

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
          sx={{ width: 120 }}
          slotProps={{ htmlInput: { min: 1 } }}
        />
        <TextField
          select
          size="small"
          label="Dé"
          value={value.die}
          onChange={(e) => set('die', e.target.value as DamageDie)}
          sx={{ width: 110 }}
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
          sx={{ width: 110 }}
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

/** État de formulaire mutualisé (les champs sans rapport avec le type sont ignorés). */
interface FormState {
  name: string;
  description: string;
  damage: DamageDraft;
  twoHandedDamage: DamageDraft;
  range: string;
  weaponCategory: WeaponCategory;
  def: string;
  maxAgi: string; // vide = pas de plafond (null)
  magicDef: string; // bonus de DEF magique, tout type d'objet (PER-85 généralisé)
}

const EMPTY_FORM: FormState = {
  name: '',
  description: '',
  damage: { ...EMPTY_DAMAGE },
  twoHandedDamage: { ...EMPTY_DAMAGE },
  range: '',
  weaponCategory: 'oneHand',
  def: '',
  maxAgi: '',
  magicDef: '',
};

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
      magicDef: line.magicDef ? String(line.magicDef) : '',
    };
  }
  const item = effectiveItem(line);
  const base = { ...EMPTY_FORM, name: item?.name ?? line.itemId };
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
        quantity,
        ...(worn ? { worn } : {}),
        overrides,
        ...(magic > 0 ? { magicDef: magic } : {}),
      };
      onConfirm(line);
    } else {
      onConfirm({
        custom: true,
        name: trimmedName,
        quantity,
        ...(worn ? { worn } : {}),
        type,
        details: form.description.trim() || undefined,
        ...(magic > 0 ? { magicDef: magic } : {}),
      });
    }
  };

  const baseOptions = mechanical
    ? equipmentCatalog.filter((e) => e.category === type)
    : [];
  const selectedBase = baseId ? equipmentById.get(baseId) : undefined;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
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

              {/* Bonus de DEF MAGIQUE (PER-85 généralisé) : disponible sur TOUT type d'objet
                  (armure, mais aussi bottes/cape/anneau enchantés). Se cumule dans la DEF
                  totale quand l'objet est porté, hors surcoût de mana des sorts en armure. */}
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
