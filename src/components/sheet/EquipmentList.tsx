'use client';

import { useState, type ReactNode } from 'react';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import Autocomplete from '@mui/material/Autocomplete';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import { equipment as equipmentCatalog } from '@/data';
import type { CharacterClass, EquipmentItem } from '@/data/schema';
import type { EquipmentLine, EquipmentRef, WornState } from '@/lib/character/types';
import { isCustomItem } from '@/lib/character/types';
import { effectiveItem } from '@/lib/character/items';
import { elixirFeatureIdByItemName } from '@/lib/character/elixirs';
import { isConsumable } from '@/lib/character/consumables';
import { equipmentLabel } from '@/components/wizard/helpers';
import { AppTooltip } from '@/components/AppTooltip';
import { CustomItemDialog } from '@/components/sheet/CustomItemDialog';
import { PageRefText } from '@/components/SourceRef';
import { DamageValue } from '@/components/DamageValue';
import { CapabilityChip, GlossaryText } from '@/components/sheet/FeatureRichText';
import {
  EquipConflictsAlert,
  WeaponMasteryBadge,
  WornBadge,
  WornControls,
} from '@/components/sheet/WornEquipmentControls';

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
          <GlossaryText>DM</GlossaryText> <DamageValue damage={item.damage} />
          {item.twoHandedDamage && (
            <>
              /<DamageValue damage={item.twoHandedDamage} />
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
          Bonus magique de l’armure : s’ajoute à la DEF totale, hors surcoût de mana des sorts en
          armure (p. 178).
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
}: EquipmentListProps) {
  // Modale objet personnalisé : `null` = fermée, `'new'` = création, un index = réécriture
  // de la ligne custom correspondante (bouton crayon).
  const [customEdit, setCustomEdit] = useState<'new' | number | null>(null);
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
  const addCustom = (name: string, details: string | undefined) =>
    onChange?.([...equipment, { custom: true, name, quantity: 1, details }]);
  // Réécriture nom/description d'une ligne custom (conserve quantité et état de port).
  const updateCustom = (i: number, name: string, details: string | undefined) => {
    const line = equipment[i];
    if (line && isCustomItem(line)) setLine(i, { ...line, name, details });
  };

  if (equipment.length === 0 && !onChange) {
    return (
      <Typography variant="body2" color="text.secondary">
        Aucun équipement.
      </Typography>
    );
  }

  return (
    <Stack spacing={onChange ? 1.5 : 0}>
      {/* Conflits de port DURS (bouclier + arme à 2 mains, >1 armure/bouclier) — non bloquant (PER-77). */}
      <EquipConflictsAlert equipment={equipment} />
      <Stack divider={<Divider />}>
        {equipment.map((line, i) => {
          const custom = isCustomItem(line);
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
              : item?.category === 'gear'
                ? item.description
                : undefined;
          const descPinned = pinnedDesc.has(i);
          // Bonus de DEF magique de l'armure enchantée (PER-85) : rendu à part de la DEF
          // mondaine, pour ne pas les confondre visuellement (retour propriétaire).
          const magicDef = !custom && item?.category === 'armor' ? (line as EquipmentRef).magicDef : undefined;
          // Objet équipable (a un emplacement de port) : armure, bouclier ou arme du catalogue.
          const equippable =
            !!item && (item.category === 'armor' || item.category === 'shield' || item.category === 'weapon');
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
                    Élixir —
                    <CapabilityChip featureId={elixirFeatureId} label={null} />
                  </Typography>
                ) : (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
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
                    {/* Crayon (mode édition, objets custom) : ouvre la modale de réécriture. */}
                    {onChange && custom && (
                      <AppTooltip title="Modifier l’objet">
                        <IconButton
                          size="small"
                          onClick={() => setCustomEdit(i)}
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
                {equippable && onWear && (
                  <Box sx={{ mt: 0.5 }}>
                    <WornControls line={line} onWear={(w) => onWear(i, w)} />
                  </Box>
                )}
                {equippable && !onWear && line.worn && (
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
                  />
                )}
              </Box>
              {/* Bonus de DEF MAGIQUE d'une armure enchantée (PER-85) : saisi en mode
                  édition, propriété de l'instance (survit au déséquipement). Réservé à
                  l'armure (boucliers/armes hors périmètre). Ne compte dans la DEF que
                  lorsque l'armure est portée (cf. defenseFromEquipment). */}
              {onChange && !custom && item?.category === 'armor' && (
                <TextField
                  type="number"
                  size="small"
                  label="DEF magique"
                  value={(line as EquipmentRef).magicDef ?? 0}
                  onChange={(e) => {
                    const n = Math.max(0, Number(e.target.value) || 0);
                    setLine(i, { ...(line as EquipmentRef), magicDef: n || undefined });
                  }}
                  sx={{ width: 110 }}
                />
              )}
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
              {/* « Utiliser » : consomme une unité (état de jeu, dispo hors édition), à DROITE du
                  nombre. Décrémente, puis supprime la ligne à 0 (géré par l'appelant). Réservé aux
                  consommables (potions, parchemins, doses d'élixir) — jamais le matériel durable. */}
              {onUse && isConsumable(line) && (
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
        })}
        {equipment.length === 0 && onChange && (
          <Typography variant="body2" color="text.secondary" sx={{ py: 0.75 }}>
            Aucun équipement.
          </Typography>
        )}
      </Stack>

      {onChange && (
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
          <Autocomplete
            sx={{ flexGrow: 1, minWidth: 240 }}
            options={equipmentCatalog}
            getOptionLabel={(o) => o.name}
            renderInput={(params) => (
              <TextField {...params} label="Ajouter un objet du catalogue" size="small" />
            )}
            onChange={(_, value) => {
              if (value) addCatalog(value.id);
            }}
            value={null}
            blurOnSelect
            clearOnBlur
          />
          <Button startIcon={<AddIcon />} onClick={() => setCustomEdit('new')} size="small">
            Objet personnalisé
          </Button>
        </Stack>
      )}

      {onChange &&
        customEdit !== null &&
        (() => {
          // Ligne éditée (mode réécriture) ou undefined (mode création). `key` remonte la
          // modale à chaque ouverture → les valeurs initiales servent d'état initial.
          const editing = customEdit !== 'new' ? equipment[customEdit] : undefined;
          const editingCustom = editing && isCustomItem(editing) ? editing : undefined;
          return (
            <CustomItemDialog
              key={customEdit}
              open
              onClose={() => setCustomEdit(null)}
              initialName={editingCustom?.name ?? ''}
              initialDetails={editingCustom?.details ?? ''}
              onConfirm={(name, details) => {
                if (customEdit === 'new') addCustom(name, details);
                else updateCustom(customEdit, name, details);
                setCustomEdit(null);
              }}
            />
          );
        })()}
    </Stack>
  );
}
