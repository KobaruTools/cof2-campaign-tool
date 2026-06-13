'use client';

import { useState } from 'react';
import CasinoOutlinedIcon from '@mui/icons-material/CasinoOutlined';
import CheckroomOutlinedIcon from '@mui/icons-material/CheckroomOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import Accordion from '@mui/material/Accordion';
import AccordionDetails from '@mui/material/AccordionDetails';
import AccordionSummary from '@mui/material/AccordionSummary';
import Alert from '@mui/material/Alert';
import Autocomplete from '@mui/material/Autocomplete';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardMedia from '@mui/material/CardMedia';
import Checkbox from '@mui/material/Checkbox';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormLabel from '@mui/material/FormLabel';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import SvgIcon, { type SvgIconProps } from '@mui/material/SvgIcon';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';
import {
  featureById,
  equipment,
  equipmentById,
  families,
  ancestryById,
  ancestries,
  classes,
  classById,
  progression,
  pathById,
} from '@/data';
import type { AbilityId, AbilityModifier, AncestryNames, Armor, CharacterClass, Weapon } from '@/data/schema';
import { ABILITY_IDS } from '@/data/schema';
import { deriveStats, checkCompliance, type RulesContext } from '@/lib/engine';
import type { Sex } from '@/lib/character/types';
import {
  initialChoices,
  modifierDeltas,
  twoLowest,
} from '@/lib/character/ancestry';
import {
  finalAbilities,
  level1FeatureIds,
  materializeDraft,
  type WizardDraft,
} from '@/lib/character/wizard';
import { pickName } from '@/lib/character/names';
import {
  defenseFromEquipment,
  initialEquipment,
  equipmentLabel,
  distributeValueSet,
  valueSets,
} from './helpers';
import { abilityTotalColor, ancestryModifierColor } from '@/lib/ui/abilityColors';
import { classColor } from '@/lib/ui/classColors';
import { ABILITY_ICONS, ABILITY_NAMES } from '@/lib/ui/ability';
import { AbilityBadge, AbilityBadgeList } from '@/components/AbilityBadge';
import { ClassIcon } from '@/components/ClassIcon';
import { InfoHint } from '@/components/InfoHint';

const familyById = new Map(families.map((f) => [f.id, f]));

/** Échelle des armures, triée par défense croissante — pour lister les armures
 * autorisées d'une classe (toutes celles ≤ la plus protectrice permise). */
const ARMORS: Armor[] = equipment
  .filter((it): it is Armor => it.category === 'armor')
  .sort((a, b) => a.def - b.def);

/** Armes à poudre — p.185 (aucun drapeau structuré ; ids connus du catalogue). */
const POWDER_WEAPON_IDS = ['petoire', 'mousquet'];

/** DM affichés d'une arme (ex. « 1d6 » ou « 1d6/1d10 » à une/deux mains). */
function weaponDamage(w: Weapon): string {
  return w.twoHandedDamage ? `${w.damage}/${w.twoHandedDamage}` : w.damage;
}

/** Icône épée (MUI n'en fournit pas) — tracé Material Design Icons « sword ». */
function SwordIcon(props: SvgIconProps) {
  return (
    <SvgIcon {...props}>
      <path d="M6.92,5H5L14,14L15,13.06M19.96,19.12L19.12,19.96C18.73,20.35 18.1,20.35 17.71,19.96L14.59,16.84L11.91,19.5L10.5,18.09L11.92,16.67L3,7.75V3H7.75L16.67,11.92L18.09,10.5L19.5,11.91L16.83,14.58L19.95,17.7C20.35,18.1 20.35,18.73 19.96,19.12Z" />
    </SvgIcon>
  );
}

/**
 * Découpe la description d'un peuple à la section « Interpréter un … » : le
 * texte avant reste affiché, la section et son corps partent dans un accordéon.
 */
function splitDescription(desc: string): {
  intro: string;
  interpretationTitle: string | null;
  interpretationBody: string;
} {
  const idx = desc.search(/^Interpréter /m);
  if (idx === -1) return { intro: desc.trim(), interpretationTitle: null, interpretationBody: '' };
  const rest = desc.slice(idx);
  const nl = rest.indexOf('\n');
  return {
    intro: desc.slice(0, idx).trim(),
    interpretationTitle: (nl === -1 ? rest : rest.slice(0, nl)).trim(),
    interpretationBody: nl === -1 ? '' : rest.slice(nl).trim(),
  };
}

/**
 * Affichage inline d'un modificateur de peuple : la valeur signée puis les
 * caractéristiques concernées sous forme de badges (ex. « +1 [PER] ou [CHA] »).
 * Cas humain (les 7 caracs listées) : « +1 à une de vos deux plus faibles ».
 */
function AncestryModifier({ mod }: { mod: AbilityModifier }) {
  const theme = useTheme();
  const bonus = mod.value > 0;
  const sign = bonus ? '+' : '';
  const tint = bonus ? theme.palette.success.main : theme.palette.error.main;
  const isLowest = mod.abilities.length === ABILITY_IDS.length;
  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
      <Chip
        label={`${sign}${mod.value}`}
        color={bonus ? 'success' : 'error'}
        variant="outlined"
        size="small"
        sx={{ minWidth: 48, fontWeight: 700, '& .MuiChip-label': { px: 0 } }}
      />
      {isLowest ? (
        <Typography variant="body2" color="text.secondary">
          à une de vos deux plus faibles caractéristiques (au choix)
        </Typography>
      ) : (
        mod.abilities.map((c, j) => (
          <Box
            component="span"
            key={c}
            sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}
          >
            {j > 0 && (
              <Typography component="span" variant="body2" color="text.secondary">
                ou
              </Typography>
            )}
            <AbilityBadge ability={c} color={tint} />
          </Box>
        ))
      )}
    </Stack>
  );
}

export interface StepProps {
  draft: WizardDraft;
  patch: (partial: Partial<WizardDraft>) => void;
}

// ---------------------------------------------------------------------------
// Étape 1 — Peuple
// ---------------------------------------------------------------------------

export function AncestryStep({ draft, patch }: StepProps) {
  const ancestry = ancestryById.get(draft.ancestryId);
  const desc = ancestry ? splitDescription(ancestry.description) : null;

  const chooseAncestry = (id: string) => {
    const p = ancestryById.get(id);
    if (!p) return;
    patch({
      ancestryId: id,
      ancestryChoices: initialChoices(p),
      ancestryPathId: p.ancestryPathIds.length === 1 ? p.ancestryPathIds[0] : null,
    });
  };

  return (
    <Stack spacing={3}>
      <FormControl>
        <FormLabel>Peuple</FormLabel>
        <RadioGroup value={draft.ancestryId} onChange={(e) => chooseAncestry(e.target.value)}>
          <Grid container spacing={1}>
            {ancestries.map((p) => (
              <Grid key={p.id} size={{ xs: 12, sm: 6 }}>
                <FormControlLabel value={p.id} control={<Radio />} label={p.name} />
              </Grid>
            ))}
          </Grid>
        </RadioGroup>
      </FormControl>

      {ancestry && (
        <Card variant="outlined" sx={{ position: 'relative' }}>
          <CardMedia
            component="img"
            image={`/ancestries/${ancestry.id}.webp`}
            alt={`Illustration du peuple ${ancestry.name}`}
            sx={{ maxHeight: 320, objectFit: 'cover', objectPosition: 'center' }}
          />
          {/* Filigrane « homme de vitruve » du peuple, décalé hors du coin bas-droite */}
          <Box
            component="img"
            src={`/ancestries/${ancestry.id}-vitruve.webp`}
            alt=""
            aria-hidden
            sx={{
              position: 'absolute',
              bottom: -24,
              right: -24,
              width: { xs: 160, sm: 220 },
              opacity: 0.75,
              pointerEvents: 'none',
              userSelect: 'none',
              zIndex: 0,
            }}
          />
          <CardContent
            sx={{
              position: 'relative',
              zIndex: 1,
              '&:last-child': { pb: { xs: 15, sm: 21 } },
            }}
          >
            <Typography variant="subtitle1" gutterBottom>
              {ancestry.name}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2, whiteSpace: 'pre-line' }}>
              {desc?.intro}
            </Typography>

            {desc?.interpretationTitle && (
              <Accordion
                disableGutters
                elevation={0}
                sx={{ mb: 2, border: 1, borderColor: 'divider', '&::before': { display: 'none' } }}
              >
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="subtitle2">{desc.interpretationTitle}</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ whiteSpace: 'pre-line' }}
                  >
                    {desc.interpretationBody}
                  </Typography>
                </AccordionDetails>
              </Accordion>
            )}

            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Modificateurs de caractéristiques
              </Typography>
              <Stack spacing={1}>
                {ancestry.abilityModifiers.map((mod, i) => (
                  <AncestryModifier key={i} mod={mod} />
                ))}
              </Stack>
            </Box>

            {ancestry.ancestryPathIds.length > 1 && (
              <FormControl sx={{ mt: 1, minWidth: 260 }} size="small">
                <InputLabel>Voie de peuple</InputLabel>
                <Select
                  label="Voie de peuple"
                  value={draft.ancestryPathId ?? ''}
                  onChange={(e) => patch({ ancestryPathId: e.target.value })}
                >
                  {ancestry.ancestryPathIds.map((vid) => (
                    <MenuItem key={vid} value={vid}>
                      {pathById.get(vid)?.name ?? vid}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
          </CardContent>
        </Card>
      )}
    </Stack>
  );
}

// ---------------------------------------------------------------------------
// Étape 2 — Profil
// ---------------------------------------------------------------------------

/**
 * Bloc carré (même langage visuel que `AbilityBadge`) pour un repère de
 * restriction : icône + libellé, bordure et fond teintés par `color`.
 */
function RestrictionBlock({
  icon,
  label,
  color,
}: {
  icon?: React.ReactNode;
  label: string;
  color?: string;
}) {
  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.5,
        px: 1,
        py: 0.5,
        borderRadius: 1,
        border: 1,
        borderColor: color ?? 'divider',
        bgcolor: color ? `color-mix(in srgb, ${color} 18%, transparent)` : 'action.hover',
        color: color ?? 'text.primary',
        fontSize: '0.78rem',
        fontWeight: 600,
        lineHeight: 1.4,
        '& svg': { fontSize: '1.05rem' },
      }}
    >
      {icon}
      {label}
    </Box>
  );
}

/**
 * Ligne d'une grille de restrictions : libellé (icône + mot) dans une colonne
 * de largeur constante, valeur(s) dans la colonne suivante. Rend deux cellules
 * de grille (via fragment) pour que tous les libellés s'alignent.
 */
function RestrictionRow({
  icon,
  label,
  children,
  valueAlign = 'start',
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
  /** Alignement vertical de la cellule de droite : `start` (défaut) ou `center`. */
  valueAlign?: 'start' | 'center';
}) {
  return (
    <>
      <Stack direction="row" sx={{ alignItems: 'center', gap: 0.5, color: 'text.secondary', pt: '5px' }}>
        {icon}
        <Typography variant="body2">{label}</Typography>
      </Stack>
      <Stack
        direction="row"
        sx={{ alignSelf: valueAlign, alignItems: 'center', flexWrap: 'wrap', gap: 0.75 }}
      >
        {children}
      </Stack>
    </>
  );
}

/**
 * Repères visuels des restrictions d'un profil. L'armure liste toutes les
 * protections autorisées (≤ la plus protectrice permise) et le bouclier est un
 * oui/non ; les deux sont des données structurées (blocs avec code couleur).
 * Les armes ne le sont pas (texte nuancé par profil), gardées en dessous.
 */
function ClassRestrictions({ characterClass }: { characterClass: CharacterClass }) {
  const theme = useTheme();
  // TODO(campaign) : remonter ce réglage au scope de la campagne (les armes à
  // feu ne conviennent qu'à certains univers — p.185). Local au wizard pour
  // l'instant, activé par défaut pour la classe qui les maîtrise (arquebusier).
  const [includeFirearms, setIncludeFirearms] = useState(true);

  const maxArmor = characterClass.maxArmorId ? equipmentById.get(characterClass.maxArmorId) : null;
  const maxDef = maxArmor && maxArmor.category === 'armor' ? maxArmor.def : null;
  const allowedArmors = maxDef != null ? ARMORS.filter((a) => a.def <= maxDef) : [];

  const weaponBlocks: React.ReactNode[] = [];
  if (characterClass.meleeAccess === 'all') {
    weaponBlocks.push(<RestrictionBlock key="melee" label="Toutes les armes de contact" />);
  } else if (characterClass.meleeAccess === 'oneHanded') {
    weaponBlocks.push(<RestrictionBlock key="melee" label="Armes de contact à une main" />);
  }
  if (characterClass.rangedAccess === 'all') {
    weaponBlocks.push(<RestrictionBlock key="ranged" label="Toutes les armes à distance" />);
  }
  for (const id of characterClass.allowedWeaponIds) {
    const w = equipmentById.get(id);
    if (w && w.category === 'weapon') {
      weaponBlocks.push(<RestrictionBlock key={id} label={`${w.name} (DM ${weaponDamage(w)})`} />);
    }
  }
  if (characterClass.powderAllowed && includeFirearms) {
    const names = POWDER_WEAPON_IDS.map((id) => equipmentById.get(id)?.name ?? id).join(', ');
    weaponBlocks.push(
      <RestrictionBlock
        key="powder"
        label={`Armes à feu (${names})`}
        color={theme.palette.warning.main}
      />,
    );
  }
  if (weaponBlocks.length === 0) {
    weaponBlocks.push(
      <RestrictionBlock key="none" label="Aucune arme" color={theme.palette.error.main} />,
    );
  }

  return (
    <Box sx={{ mb: 1.5 }}>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
        Restrictions
      </Typography>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'auto 1fr',
          columnGap: 1.5,
          rowGap: 1,
          alignItems: 'start',
        }}
      >
        <RestrictionRow icon={<CheckroomOutlinedIcon fontSize="small" />} label="Armures">
          {allowedArmors.length > 0 ? (
            allowedArmors.map((a) => (
              <RestrictionBlock key={a.id} label={`${a.name} (DEF +${a.def})`} />
            ))
          ) : (
            <RestrictionBlock label="Aucune armure autorisée" color={theme.palette.error.main} />
          )}
        </RestrictionRow>

        <RestrictionRow icon={<ShieldOutlinedIcon fontSize="small" />} label="Bouclier">
          <RestrictionBlock
            label={characterClass.shieldAllowed ? 'Autorisé' : 'Interdit'}
            color={characterClass.shieldAllowed ? theme.palette.success.main : theme.palette.error.main}
          />
        </RestrictionRow>

        <RestrictionRow icon={<SwordIcon fontSize="small" />} label="Armes">
          {weaponBlocks}
        </RestrictionRow>

        {characterClass.weaponNotes && (
          <RestrictionRow
            icon={<MenuBookOutlinedIcon fontSize="small" />}
            label="Détail"
            valueAlign="center"
          >
            <Typography variant="caption" color="text.secondary">
              {characterClass.weaponNotes}
            </Typography>
          </RestrictionRow>
        )}
      </Box>

      {characterClass.powderAllowed && (
        <FormControlLabel
          sx={{ mt: 0.5 }}
          control={
            <Switch
              size="small"
              checked={includeFirearms}
              onChange={(e) => setIncludeFirearms(e.target.checked)}
            />
          }
          label={<Typography variant="body2">Armes à feu autorisées</Typography>}
        />
      )}
    </Box>
  );
}

export function ClassStep({ draft, patch }: StepProps) {
  const characterClass = classById.get(draft.classId);

  const chooseClass = (id: string) => {
    const p = classById.get(id);
    if (!p) return;
    patch({
      classId: id,
      chosenPaths: [],
      magePathSlot: false,
      mageBonus: null,
      equipment: initialEquipment(p),
    });
  };

  return (
    <Stack spacing={3}>
      <FormControl>
        <FormLabel>Profil</FormLabel>
        <RadioGroup value={draft.classId} onChange={(e) => chooseClass(e.target.value)}>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {families.map((family) => {
              const familyClasses = classes.filter((p) => p.familyId === family.id);
              if (familyClasses.length === 0) return null;
              return (
                <Box key={family.id}>
                  <Typography
                    variant="subtitle2"
                    color="text.secondary"
                    sx={{ textTransform: 'uppercase', letterSpacing: 0.5, mb: 0.5 }}
                  >
                    {family.name}
                  </Typography>
                  <Divider sx={{ mb: 1 }} />
                  <Grid container spacing={1}>
                    {familyClasses.map((p) => {
                      const color = classColor(p.id);
                      return (
                        <Grid key={p.id} size={{ xs: 12, sm: 6, md: 4 }}>
                          <FormControlLabel
                            value={p.id}
                            sx={{
                              m: 0,
                              pl: 1,
                              borderLeft: 3,
                              borderColor: color,
                              borderRadius: 1,
                            }}
                            control={
                              <Radio
                                sx={{ color: color, '&.Mui-checked': { color: color } }}
                              />
                            }
                            label={
                              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                                <ClassIcon classId={p.id} size={22} />
                                <span>{p.name}</span>
                              </Stack>
                            }
                          />
                        </Grid>
                      );
                    })}
                  </Grid>
                </Box>
              );
            })}
          </Stack>
        </RadioGroup>
      </FormControl>

      {characterClass && (
        <Card
          variant="outlined"
          sx={{ borderLeft: 5, borderLeftColor: classColor(characterClass.id) }}
        >
          <CardContent>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 0.5 }}>
              <ClassIcon classId={characterClass.id} size={28} />
              <Typography variant="subtitle1" sx={{ color: classColor(characterClass.id) }}>
                {characterClass.name}
              </Typography>
            </Stack>
            <Box sx={{ mb: 1.5 }}>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: 'block', mb: 0.5 }}
              >
                Caractéristiques conseillées
              </Typography>
              <AbilityBadgeList abilities={characterClass.recommendedAbilities} />
            </Box>
            <ClassRestrictions characterClass={characterClass} />
          </CardContent>
        </Card>
      )}
    </Stack>
  );
}

// ---------------------------------------------------------------------------
// Étape 3 — Caractéristiques
// ---------------------------------------------------------------------------

/** Terme qualitatif associé à une valeur de caractéristique
 * (table « Échelle des valeurs de caractéristiques », p. 27). */
function abilityTotalLabel(total: number): string {
  const clamped = Math.max(-3, Math.min(5, total));
  const labels: Record<number, string> = {
    [-3]: 'Catastrophique',
    [-2]: 'Très faible',
    [-1]: 'Faible',
    [0]: 'Moyen',
    [1]: 'Supérieur',
    [2]: 'Bon',
    [3]: 'Très bon',
    [4]: 'Excellent',
    [5]: 'Extraordinaire',
  };
  return labels[clamped];
}

export function AbilitiesStep({ draft, patch }: StepProps) {
  const ancestry = ancestryById.get(draft.ancestryId);
  const characterClass = classById.get(draft.classId);
  if (!ancestry) return <Alert severity="warning">Choisissez d’abord un peuple.</Alert>;

  const deltas = modifierDeltas(ancestry, draft.ancestryChoices);
  const lowest = twoLowest(draft.baseAbilities);

  const applyValueSet = (values: number[]) => {
    patch({ baseAbilities: distributeValueSet(values, characterClass?.recommendedAbilities ?? []) });
  };

  const setBase = (id: AbilityId, value: number) => {
    patch({ baseAbilities: { ...draft.baseAbilities, [id]: value } });
  };

  const setChoice = (index: number, ability: AbilityId) => {
    const next = [...draft.ancestryChoices];
    next[index] = ability;
    patch({ ancestryChoices: next });
  };

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Reportez les valeurs déterminées à la table (saisie libre). Les séries du livre sont
          proposées comme point de départ.
        </Typography>
        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
          {valueSets.map((s) => (
            <Button key={s.id} size="small" variant="outlined" onClick={() => applyValueSet(s.values)}>
              {s.name} ({s.values.join(', ')})
            </Button>
          ))}
        </Stack>
      </Box>

      {/* Résolution des modificateurs de peuple à choix */}
      {ancestry.abilityModifiers.some((m) => m.abilities.length > 1) && (
        <Card variant="outlined">
          <CardContent>
            <Typography variant="subtitle2" gutterBottom>
              Modificateurs de {ancestry.name}
            </Typography>
            <Stack spacing={2}>
              {ancestry.abilityModifiers.map((mod, i) =>
                mod.abilities.length === 1 ? null : (
                  <FormControl key={i} size="small" sx={{ minWidth: 260 }}>
                    <InputLabel>{`${mod.value > 0 ? '+' : ''}${mod.value} à`}</InputLabel>
                    <Select
                      label={`${mod.value > 0 ? '+' : ''}${mod.value} à`}
                      value={draft.ancestryChoices[i] ?? ''}
                      onChange={(e) => setChoice(i, e.target.value as AbilityId)}
                    >
                      {(mod.abilities.length === ABILITY_IDS.length ? ABILITY_IDS : mod.abilities).map((c) => (
                        <MenuItem key={c} value={c}>
                          {ABILITY_NAMES[c]}
                          {mod.abilities.length === ABILITY_IDS.length && lowest.includes(c)
                            ? ' (faible)'
                            : ''}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                ),
              )}
            </Stack>
          </CardContent>
        </Card>
      )}

      <Grid container spacing={2}>
        <Grid size={12}>
          <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
            <Box sx={{ width: 24 }} />
            <Typography variant="overline" color="text.secondary" sx={{ width: 130 }}>
              Jet de dés
            </Typography>
            <Typography variant="overline" color="text.secondary" sx={{ width: 130 }}>
              Total
            </Typography>
          </Stack>
        </Grid>
        {ABILITY_IDS.map((id) => {
          const total = draft.baseAbilities[id] + deltas[id];
          const color = abilityTotalColor(total);
          const Icon = ABILITY_ICONS[id];
          return (
            <Grid key={id} size={12}>
              <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
                <Icon sx={{ color: 'text.secondary' }} />
                <TextField
                  label={id}
                  type="number"
                  size="small"
                  value={draft.baseAbilities[id]}
                  onChange={(e) => setBase(id, Number(e.target.value) || 0)}
                  sx={{ width: 130 }}
                />
                <TextField
                  label={abilityTotalLabel(total)}
                  size="small"
                  disabled
                  value={`${total > 0 ? '+' : ''}${total}`}
                  sx={{
                    width: 130,
                    '& .MuiInputBase-input.Mui-disabled': {
                      WebkitTextFillColor: color,
                      fontWeight: 600,
                    },
                    '& .MuiInputLabel-root.Mui-disabled': {
                      color,
                    },
                  }}
                />
                {deltas[id] !== 0 && (
                  <Typography variant="caption" sx={{ color: ancestryModifierColor(deltas[id]) }}>
                    {ancestry.name} {deltas[id] > 0 ? '+' : ''}
                    {deltas[id]}
                  </Typography>
                )}
              </Stack>
            </Grid>
          );
        })}
      </Grid>
    </Stack>
  );
}

// ---------------------------------------------------------------------------
// Étape 4 — Voies & capacités
// ---------------------------------------------------------------------------

export function PathsStep({ draft, patch }: StepProps) {
  const characterClass = classById.get(draft.classId);
  if (!characterClass) return <Alert severity="warning">Choisissez d’abord un profil.</Alert>;
  const isMage = characterClass.familyId === 'mages';
  const ancestry = ancestryById.get(draft.ancestryId);

  const togglePath = (pathId: string) => {
    const has = draft.chosenPaths.includes(pathId);
    let next: string[];
    if (has) next = draft.chosenPaths.filter((v) => v !== pathId);
    else if (draft.chosenPaths.length >= 2) return; // max 2
    else next = [...draft.chosenPaths, pathId];
    // si le bonus de mage ciblait une voie retirée, on le réinitialise
    const mageBonus =
      draft.mageBonus?.type === 'class-rank2' && !next.includes(draft.mageBonus.pathId)
        ? null
        : draft.mageBonus;
    patch({ chosenPaths: next, mageBonus });
  };

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="subtitle2" gutterBottom>
          Choisissez 2 voies de profil ({draft.chosenPaths.length}/2)
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Vous recevez gratuitement la capacité de rang 1 de chaque voie choisie, ainsi que le
          rang 1 de votre voie de peuple.
        </Typography>
        <Stack>
          {characterClass.pathIds.map((vid) => {
            const path = pathById.get(vid);
            const checked = draft.chosenPaths.includes(vid);
            const disabled = !checked && draft.chosenPaths.length >= 2;
            return (
              <FormControlLabel
                key={vid}
                control={
                  <Checkbox checked={checked} disabled={disabled} onChange={() => togglePath(vid)} />
                }
                label={path?.name ?? vid}
              />
            );
          })}
        </Stack>
      </Box>

      {isMage && (
        <Card variant="outlined">
          <CardContent>
            <Typography variant="subtitle2" gutterBottom>
              Options de mage (niveau 1)
            </Typography>

            <FormControl sx={{ mb: 2 }}>
              <FormLabel>Emplacement de la voie de peuple</FormLabel>
              <RadioGroup
                value={draft.magePathSlot ? 'mage' : 'peuple'}
                onChange={(e) => {
                  const slot = e.target.value === 'mage';
                  const mageBonus =
                    !slot && draft.mageBonus?.type === 'mage-rank2' ? null : draft.mageBonus;
                  patch({ magePathSlot: slot, mageBonus });
                }}
              >
                <FormControlLabel
                  value="peuple"
                  control={<Radio />}
                  label={`Voie de peuple${ancestry ? ` (${ancestry.name})` : ''}`}
                />
                <FormControlLabel
                  value="mage"
                  control={<Radio />}
                  label="Voie du mage (remplace la voie de peuple ; rang 1 de peuple conservé)"
                />
              </RadioGroup>
            </FormControl>

            <FormControl>
              <FormLabel>Capacité de rang 2 supplémentaire</FormLabel>
              <RadioGroup
                value={
                  draft.mageBonus?.type === 'mage-rank2'
                    ? 'mage'
                    : draft.mageBonus?.type === 'class-rank2'
                      ? draft.mageBonus.pathId
                      : ''
                }
                onChange={(e) => {
                  const v = e.target.value;
                  patch({
                    mageBonus:
                      v === 'mage' ? { type: 'mage-rank2' } : { type: 'class-rank2', pathId: v },
                  });
                }}
              >
                {draft.chosenPaths.map((vid) => (
                  <FormControlLabel
                    key={vid}
                    value={vid}
                    control={<Radio />}
                    label={`Rang 2 — ${pathById.get(vid)?.name ?? vid}`}
                  />
                ))}
                {draft.magePathSlot && (
                  <FormControlLabel
                    value="mage"
                    control={<Radio />}
                    label="Rang 2 — Voie du mage"
                  />
                )}
              </RadioGroup>
            </FormControl>
          </CardContent>
        </Card>
      )}
    </Stack>
  );
}

// ---------------------------------------------------------------------------
// Étape 5 — Équipement
// ---------------------------------------------------------------------------

export function EquipmentStep({ draft, patch }: StepProps) {
  const remove = (index: number) => {
    patch({ equipment: draft.equipment.filter((_, i) => i !== index) });
  };
  const add = (itemId: string) => {
    patch({ equipment: [...draft.equipment, { itemId, quantity: 1 }] });
  };

  return (
    <Stack spacing={2}>
      <Typography variant="body2" color="text.secondary">
        Équipement de départ du profil + sac d’aventurier. Ajustez librement.
      </Typography>

      <Stack divider={<Divider />}>
        {draft.equipment.map((line, i) => (
          <Stack key={i} direction="row" sx={{ alignItems: 'center', py: 0.5 }}>
            <Typography sx={{ flexGrow: 1 }}>
              {equipmentLabel(line)}
              {line.quantity > 1 ? ` ×${line.quantity}` : ''}
            </Typography>
            <IconButton size="small" color="error" onClick={() => remove(i)}>
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          </Stack>
        ))}
        {draft.equipment.length === 0 && (
          <Typography variant="body2" color="text.secondary">
            Aucun équipement.
          </Typography>
        )}
      </Stack>

      <Autocomplete
        options={equipment}
        getOptionLabel={(o) => o.name}
        renderInput={(params) => <TextField {...params} label="Ajouter un objet du catalogue" />}
        onChange={(_, value) => {
          if (value) add(value.id);
        }}
        value={null}
        blurOnSelect
        clearOnBlur
      />
    </Stack>
  );
}

// ---------------------------------------------------------------------------
// Étape 6 — Identité
// ---------------------------------------------------------------------------

/**
 * Contenu de l'infobulle du champ Nom : conseils « Noms typiques » du peuple
 * choisi, suivis des listes proposées par le livre (par sexe + noms de famille).
 */
function NameHintContent({ names }: { names: AncestryNames }) {
  const lists: Array<[string, string[]]> = [
    ['Masculins', names.male],
    ['Féminins', names.female],
    ['Noms de famille', names.surnames ?? []],
  ];
  return (
    <>
      {names.note}
      {lists
        .filter(([, items]) => items.length > 0)
        .map(([label, items]) => (
          <Typography key={label} variant="body2" sx={{ mt: 1 }}>
            <strong>{label} :</strong> {items.join(', ')}
          </Typography>
        ))}
    </>
  );
}

/** Ne conserve que les chiffres et la virgule décimale (âge, taille, poids). */
function digitsOnly(value: string): string {
  return value.replace(/[^0-9,]/g, '');
}

export function IdentityStep({ draft, patch }: StepProps) {
  const ancestry = ancestryById.get(draft.ancestryId);
  const physical = ancestry?.physical;
  // Le générateur a besoin du sexe pour choisir la bonne liste de noms.
  const sexChosen = draft.identity.sex != null;
  return (
    <Stack spacing={2}>
      <TextField
        label="Nom"
        required
        value={draft.name}
        onChange={(e) => patch({ name: e.target.value })}
        fullWidth
        slotProps={{
          input: {
            endAdornment: ancestry ? (
              <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                <Tooltip title={sexChosen ? 'Générer un nom' : 'Choisissez d’abord le sexe'} arrow>
                  <span>
                    <IconButton
                      size="small"
                      aria-label="Générer un nom"
                      disabled={!sexChosen}
                      onClick={() => {
                        const name = pickName(ancestry, draft.identity.sex);
                        if (name) patch({ name });
                      }}
                    >
                      <CasinoOutlinedIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
                <InfoHint page={ancestry.names.sourcePage}>
                  <NameHintContent names={ancestry.names} />
                </InfoHint>
              </Stack>
            ) : undefined,
          },
        }}
      />
      <Stack direction="row" spacing={2}>
        <TextField
          select
          label="Sexe"
          value={draft.identity.sex ?? ''}
          onChange={(e) =>
            patch({ identity: { ...draft.identity, sex: (e.target.value || undefined) as Sex | undefined } })
          }
          fullWidth
        >
          <MenuItem value="male">Homme</MenuItem>
          <MenuItem value="female">Femme</MenuItem>
        </TextField>
        <TextField
          label="Âge"
          value={draft.identity.age ?? ''}
          onChange={(e) => patch({ identity: { ...draft.identity, age: digitsOnly(e.target.value) } })}
          placeholder={physical?.startingAge}
          fullWidth
          slotProps={
            physical
              ? {
                  input: {
                    endAdornment: (
                      <InfoHint page={ancestry?.sourcePage}>
                        <>
                          Âge de départ conseillé : <strong>{physical.startingAge}</strong>.
                          <br />
                          Espérance de vie : <strong>{physical.lifeExpectancy}</strong>.
                        </>
                      </InfoHint>
                    ),
                  },
                }
              : undefined
          }
        />
        <TextField
          label="Taille"
          value={draft.identity.height ?? ''}
          onChange={(e) => patch({ identity: { ...draft.identity, height: digitsOnly(e.target.value) } })}
          placeholder={physical?.height}
          fullWidth
          slotProps={{
            input: {
              endAdornment: <InputAdornment position="end">m</InputAdornment>,
            },
          }}
        />
        <TextField
          label="Poids"
          value={draft.identity.weight ?? ''}
          onChange={(e) => patch({ identity: { ...draft.identity, weight: digitsOnly(e.target.value) } })}
          placeholder={physical?.weight}
          fullWidth
          slotProps={{
            input: {
              endAdornment: <InputAdornment position="end">kg</InputAdornment>,
            },
          }}
        />
      </Stack>
      <TextField
        label="Description"
        multiline
        minRows={6}
        placeholder="Décrivez votre héros : allure, caractère, passé, ce qui le pousse à l'aventure…"
        value={draft.identity.description ?? ''}
        onChange={(e) => patch({ identity: { ...draft.identity, description: e.target.value } })}
        fullWidth
      />
    </Stack>
  );
}

// ---------------------------------------------------------------------------
// Étape 7 — Récapitulatif
// ---------------------------------------------------------------------------

const rulesCtx: RulesContext = {
  featureById,
  pathById,
  classById,
  familyById,
  progression,
};

export function SummaryStep({ draft }: StepProps) {
  const ancestry = ancestryById.get(draft.ancestryId);
  const characterClass = classById.get(draft.classId);
  const family = characterClass ? familyById.get(characterClass.familyId) : undefined;
  if (!ancestry || !characterClass || !family) {
    return <Alert severity="warning">Récapitulatif indisponible : étapes incomplètes.</Alert>;
  }

  const abilities = finalAbilities(draft, ancestry);
  const featureIds = level1FeatureIds(draft);
  const spellCount = featureIds.filter((id) => featureById.get(id)?.isSpell).length;
  const stats = deriveStats({
    abilities,
    level: 1,
    family,
    defenseEquipment: defenseFromEquipment(draft.equipment),
    spellCount,
  });
  const preview = materializeDraft(draft, ancestry, draft.createdAt);
  const warnings = checkCompliance(preview, rulesCtx);

  const statLines: Array<[string, string | number]> = [
    ['Points de vigueur', stats.maxHp],
    ['Défense', stats.defense],
    ['Initiative', stats.initiative],
    ['Points de chance', stats.luckPoints],
    ['Dés de récupération', `${stats.recoveryDiceCount} ${stats.recoveryDie}`],
    ['Points de mana', stats.manaPoints ?? '—'],
    ['Attaque contact', stats.meleeAttack],
    ['Attaque distance', stats.rangedAttack],
    ['Attaque magique', stats.magicAttack],
  ];

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4" component="h2" sx={{ fontWeight: 'bold' }}>
          {draft.name || 'Nouveau personnage'}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {ancestry.name} · {characterClass.name} · niveau 1
        </Typography>
      </Box>

      <Box>
        <Typography variant="subtitle2" gutterBottom>
          Caractéristiques
        </Typography>
        <Stack direction="row" spacing={1}>
          {ABILITY_IDS.map((id) => {
            const total = abilities[id];
            const color = abilityTotalColor(total);
            const Icon = ABILITY_ICONS[id];
            return (
              <Box
                key={id}
                title={ABILITY_NAMES[id]}
                sx={{
                  flex: 1,
                  minWidth: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 0.25,
                  px: 0.5,
                  py: 1,
                  borderRadius: 1,
                  border: '1px solid',
                  borderColor: color,
                  bgcolor: alpha(color, 0.15),
                }}
              >
                <Icon fontSize="large" sx={{ color: 'text.secondary' }} />
                <Typography variant="subtitle1" color="text.secondary" sx={{ fontWeight: 'bold' }}>
                  {id}
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                  {total > 0 ? '+' : ''}
                  {total}
                </Typography>
              </Box>
            );
          })}
        </Stack>
      </Box>

      <Box>
        <Typography variant="subtitle2" gutterBottom>
          Statistiques dérivées
        </Typography>
        <Grid container spacing={1}>
          {statLines.map(([label, value]) => (
            <Grid key={label} size={{ xs: 6, sm: 4 }}>
              <Card variant="outlined">
                <CardContent sx={{ py: 1, textAlign: 'center' }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    {label}
                  </Typography>
                  <Typography variant="h6">{value}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
        <Typography variant="caption" color="text.secondary">
          (Les bonus apportés par les capacités ne sont pas encore appliqués automatiquement.)
        </Typography>
      </Box>

      <Box>
        <Typography variant="subtitle2" gutterBottom>
          Capacités acquises
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {featureIds.map((id) => {
            const feature = featureById.get(id);
            const path = feature ? pathById.get(feature.pathId) : undefined;
            // Capacité liée à un profil = voie de classe → couleur du profil.
            // Voie de peuple / du mage : pas de profil → bordure neutre.
            const color = path?.type === 'class' ? classColor(characterClass.id) : null;
            return (
              <Box
                key={id}
                sx={{
                  px: 1.5,
                  py: 0.75,
                  borderRadius: 1,
                  border: '1px solid',
                  borderColor: color ?? 'divider',
                  bgcolor: color ? alpha(color, 0.15) : 'transparent',
                }}
              >
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {feature?.name ?? id}
                </Typography>
                {path && (
                  <Typography variant="caption" color="text.secondary">
                    {path.name}
                  </Typography>
                )}
              </Box>
            );
          })}
        </Box>
      </Box>

      {warnings.length > 0 && (
        <Alert severity="warning">
          {warnings.map((a) => a.message).join(' ')}
        </Alert>
      )}
    </Stack>
  );
}
