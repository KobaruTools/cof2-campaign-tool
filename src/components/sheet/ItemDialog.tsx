'use client';

import { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Autocomplete from '@mui/material/Autocomplete';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { equipment as equipmentCatalog, equipmentById } from '@/data';
import { WEAPON_CATEGORIES, type EquipmentItem, type WeaponCategory } from '@/data/schema';
import type { EquipmentLine, EquipmentRef, ItemType } from '@/lib/character/types';
import { isCustomItem } from '@/lib/character/types';
import {
  effectiveItem,
  snapshotOverrides,
  type MechanicalCategory,
} from '@/lib/character/items';
import { ItemTypeIcon } from '@/components/ItemTypeIcon';

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

/** Ordre d'affichage des types dans le sélecteur (mécaniques puis cosmétiques). */
const TYPE_ORDER: ItemType[] = ['weapon', 'armor', 'shield', 'consumable', 'gear', 'treasure', 'misc'];

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

/** État de formulaire mutualisé (les champs sans rapport avec le type sont ignorés). */
interface FormState {
  name: string;
  description: string;
  damage: string;
  twoHandedDamage: string;
  range: string;
  weaponCategory: WeaponCategory;
  def: string;
  maxAgi: string; // vide = pas de plafond (null)
  magicDef: string; // armure uniquement
}

const EMPTY_FORM: FormState = {
  name: '',
  description: '',
  damage: '',
  twoHandedDamage: '',
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
      f.damage = base.damage;
      f.twoHandedDamage = base.twoHandedDamage ?? '';
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
    return { ...EMPTY_FORM, name: line.name, description: line.details ?? '' };
  }
  const item = effectiveItem(line);
  const base = { ...EMPTY_FORM, name: item?.name ?? line.itemId };
  if (item) {
    switch (item.category) {
      case 'weapon':
        base.damage = item.damage;
        base.twoHandedDamage = item.twoHandedDamage ?? '';
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

  const mechanical = type !== null && isMechanicalType(type);
  const trimmedName = form.name.trim();
  const valid = type !== null && trimmedName.length > 0 && (!mechanical || baseId !== null);

  const confirm = () => {
    if (!valid || type === null) return;
    const quantity = initial?.quantity ?? 1;
    const worn = initial?.worn;
    if (mechanical && baseId) {
      const overrides = snapshotOverrides(type, {
        name: trimmedName,
        description: form.description,
        damage: form.damage,
        twoHandedDamage: form.twoHandedDamage,
        range: form.range,
        weaponCategory: form.weaponCategory,
        def: form.def.trim() === '' ? undefined : Number(form.def) || 0,
        maxAgi: type === 'armor' ? (form.maxAgi.trim() === '' ? null : Number(form.maxAgi) || 0) : undefined,
      });
      const magic = type === 'armor' ? Math.max(0, Number(form.magicDef) || 0) : 0;
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
                  <Stack direction="row" spacing={1}>
                    <TextField
                      size="small"
                      label="DM"
                      value={form.damage}
                      onChange={(e) => setField('damage', e.target.value)}
                      sx={{ flex: 1 }}
                    />
                    <TextField
                      select
                      size="small"
                      label="Catégorie"
                      value={form.weaponCategory}
                      onChange={(e) => setField('weaponCategory', e.target.value as WeaponCategory)}
                      sx={{ flex: 1 }}
                    >
                      {WEAPON_CATEGORIES.map((c) => (
                        <MenuItem key={c} value={c}>
                          {WEAPON_CATEGORY_LABELS[c]}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Stack>
                  <Stack direction="row" spacing={1}>
                    {form.weaponCategory === 'oneOrTwoHands' && (
                      <TextField
                        size="small"
                        label="DM à deux mains"
                        value={form.twoHandedDamage}
                        onChange={(e) => setField('twoHandedDamage', e.target.value)}
                        sx={{ flex: 1 }}
                      />
                    )}
                    <TextField
                      size="small"
                      label="Portée"
                      placeholder="ex. 20 m"
                      value={form.range}
                      onChange={(e) => setField('range', e.target.value)}
                      sx={{ flex: 1 }}
                    />
                  </Stack>
                </>
              )}

              {/* Stats d'armure : DEF + plafond AGI + bonus magique (PER-85, retour recette). */}
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
                  <TextField
                    type="number"
                    size="small"
                    label="DEF magique"
                    value={form.magicDef}
                    onChange={(e) => setField('magicDef', e.target.value)}
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
