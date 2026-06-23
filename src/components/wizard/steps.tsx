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
  pathById,
  priestGods,
} from '@/data';
import type { AbilityId, AbilityModifier, AncestryNames, Armor, CharacterClass } from '@/data/schema';
import { ABILITY_IDS } from '@/data/schema';
import { checkCompliance } from '@/lib/engine';
import { rulesContext } from '@/lib/character/rulesContext';
import type { Sex } from '@/lib/character/types';
import {
  initialChoices,
  modifierDeltas,
  lowestAbilities,
} from '@/lib/character/ancestry';
import {
  finalAbilities,
  involvedClassIds,
  level1FeatureIds,
  materializeDraft,
  PRIEST_CLASS_ID,
  type WizardDraft,
} from '@/lib/character/wizard';
import { level1FamilyHp, level1HybridFamilies } from '@/lib/character/hp';
import { effectContext, effectiveAbilities, modsFromFeatures } from '@/lib/character/effects';
import {
  effectiveFeatureIdsForMods,
  featureChoiceDefs,
  setFeatureChoice,
} from '@/lib/character/choices';
import { FeatureChoiceField } from '@/components/sheet/FeatureChoiceField';
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
import { ABILITY_NAMES } from '@/lib/ui/ability';
import { AbilityBadge, AbilityBadgeList } from '@/components/AbilityBadge';
import { AbilityBreakdownTooltip } from '@/components/AbilityBreakdownTooltip';
import { AbilityIcon } from '@/components/AbilityIcon';
import { ClassIcon } from '@/components/ClassIcon';
import { DamageValue } from '@/components/DamageValue';
import { DerivedStatsGrid } from '@/components/DerivedStatsGrid';
import { FeatureLabel } from '@/components/FeatureLabel';
import { InfoHint } from '@/components/InfoHint';

const familyById = new Map(families.map((f) => [f.id, f]));

/** Échelle des armures, triée par défense croissante — pour lister les armures
 * autorisées d'une classe (toutes celles ≤ la plus protectrice permise). */
const ARMORS: Armor[] = equipment
  .filter((it): it is Armor => it.category === 'armor')
  .sort((a, b) => a.def - b.def);

/** Armes à poudre — p.185 (aucun drapeau structuré ; ids connus du catalogue). */
const POWDER_WEAPON_IDS = ['petoire', 'mousquet'];

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
              <FormControl sx={{ mt: 1, minWidth: { xs: '100%', sm: 260 } }} size="small">
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
  label: React.ReactNode;
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
      weaponBlocks.push(
        <RestrictionBlock
          key={id}
          label={
            <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.25 }}>
              {w.name} (DM <DamageValue damage={w.damage} size={16} />
              {w.twoHandedDamage && (
                <>
                  /<DamageValue damage={w.twoHandedDamage} size={16} />
                </>
              )}
              )
            </Box>
          }
        />,
      );
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
      // La vocation ne concerne que le prêtre : on la réinitialise à chaque changement.
      priestVocation: null,
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
          sx={{
            position: 'relative',
            overflow: 'hidden',
            borderLeft: 5,
            borderLeftColor: classColor(characterClass.id),
          }}
        >
          {/* Illustration du profil, centrée verticalement et débordant légèrement à droite */}
          <Box
            component="img"
            src={`/classes/${characterClass.id}.webp`}
            alt={`Illustration du profil ${characterClass.name}`}
            sx={{
              position: 'absolute',
              top: '50%',
              right: -16,
              transform: 'translateY(-50%)',
              height: '110%',
              objectFit: 'contain',
              objectPosition: 'center',
              opacity: 0.3,
              pointerEvents: 'none',
              userSelect: 'none',
              zIndex: 0,
            }}
          />
          <CardContent sx={{ position: 'relative', zIndex: 1 }}>
            <Stack
              direction="row"
              spacing={1}
              sx={{ alignItems: 'center', mb: 0.5, pr: { xs: 13, sm: 17 } }}
            >
              <ClassIcon classId={characterClass.id} size={28} />
              <Typography variant="subtitle1" sx={{ color: classColor(characterClass.id) }}>
                {characterClass.name}
              </Typography>
            </Stack>
            <Box sx={{ mb: 1.5, pr: { xs: 13, sm: 17 } }}>
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

      {draft.classId === PRIEST_CLASS_ID && <PriestVocationPanel draft={draft} patch={patch} />}
    </Stack>
  );
}

/**
 * Choix de vocation du prêtre (p. 122), affiché dans l'étape Profil quand le prêtre
 * est sélectionné. Généraliste (aucun effet) ou spécialiste d'un dieu du panthéon
 * (p. 126-127) — auquel cas un dieu doit être désigné (wizard bloquant). Montre, pour
 * le dieu retenu, son arme sacrée et sa capacité divine.
 */
function PriestVocationPanel({ draft, patch }: StepProps) {
  const vocation = draft.priestVocation ?? null;
  const mode = vocation?.mode ?? '';
  const godId = vocation?.mode === 'specialist' ? vocation.godId : '';
  const god = godId ? (priestGods.find((g) => g.id === godId) ?? null) : null;

  const setMode = (m: string) => {
    if (m === 'generalist') patch({ priestVocation: { mode: 'generalist' } });
    else if (m === 'specialist') patch({ priestVocation: { mode: 'specialist', godId } });
  };

  const divineFeature = god ? featureById.get(god.divineFeatureId) : undefined;
  const divinePath = divineFeature ? pathById.get(divineFeature.pathId) : undefined;
  // Profil d'origine de la capacité divine (toujours une voie de profil) — pour
  // afficher son icône et sa couleur (la capacité vient d'un AUTRE profil).
  const divineClass =
    divinePath?.type === 'class' ? classById.get(divinePath.classIds[0]) : undefined;
  const sacredWeapons = god
    ? god.sacredWeaponIds.map((id) => equipmentById.get(id)?.name).filter(Boolean).join(' ou ')
    : '';

  return (
    <Card variant="outlined" sx={{ borderLeft: 5, borderLeftColor: classColor(PRIEST_CLASS_ID) }}>
      <CardContent>
        <Stack spacing={2}>
          <FormControl>
            <FormLabel>Vocation du prêtre</FormLabel>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
              Choix obligatoire (p. 122). Le généraliste suit les règles de base ; le spécialiste se
              voue à un seul dieu, maîtrise son arme sacrée et reçoit une capacité divine d’un autre
              profil.
            </Typography>
            <RadioGroup value={mode} onChange={(e) => setMode(e.target.value)}>
              <FormControlLabel
                value="generalist"
                control={<Radio />}
                label="Généraliste — prie un panthéon (aucun effet mécanique, inspiration)"
              />
              <FormControlLabel
                value="specialist"
                control={<Radio />}
                label="Spécialiste — héraut d'un seul dieu"
              />
            </RadioGroup>
          </FormControl>

          {mode === 'specialist' && (
            <Autocomplete
              options={priestGods}
              value={god}
              onChange={(_, val) => patch({ priestVocation: { mode: 'specialist', godId: val?.id ?? '' } })}
              getOptionLabel={(g) => `${g.name} — ${g.domain}`}
              isOptionEqualToValue={(a, b) => a.id === b.id}
              renderInput={(params) => (
                <TextField {...params} label="Dieu" placeholder="Choisir un dieu…" />
              )}
            />
          )}

          {god && (
            <Box
              sx={{
                p: 1.5,
                borderRadius: 1,
                bgcolor: (theme) => alpha(theme.palette.text.primary, theme.palette.action.hoverOpacity),
              }}
            >
              <Typography variant="subtitle2">{god.name}</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                {god.domain} — symbole : {god.symbol}
              </Typography>
              <Typography variant="body2">
                <strong>Arme sacrée :</strong> {sacredWeapons || god.sacredWeaponIds.join(', ')}
              </Typography>
              <Typography
                variant="body2"
                component="div"
                sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}
              >
                <strong>Capacité divine :</strong>
                {divineFeature ? (
                  <>
                    <span>
                      {divineFeature.name} — {divinePath?.name ?? divineFeature.pathId}, rang{' '}
                      {divineFeature.rank}
                    </span>
                    {divineClass && (
                      <Box
                        component="span"
                        sx={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 0.5,
                          fontWeight: 700,
                          color: classColor(divineClass.id),
                        }}
                      >
                        <ClassIcon classId={divineClass.id} size={18} />({divineClass.name})
                      </Box>
                    )}
                  </>
                ) : (
                  god.divineFeatureId
                )}
              </Typography>
            </Box>
          )}
        </Stack>
      </CardContent>
    </Card>
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
  const lowest = lowestAbilities(draft.baseAbilities);

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
              {ancestry.abilityModifiers.map((mod, i) => {
                if (mod.abilities.length === 1) return null;
                // Cas humain : « +1 à une des deux plus faibles » (encodé avec les
                // 7 caracs). Le choix reste libre dans le modèle ; l'UI conseille
                // les plus faibles et alerte si une autre carac est retenue.
                const isLowestMod = mod.abilities.length === ABILITY_IDS.length;
                const chosen = draft.ancestryChoices[i];
                const names = lowest.map((id) => ABILITY_NAMES[id]);
                // « A, B et C » — énumération lisible (≥ 2 caracs éligibles).
                const lowestNames =
                  names.length > 1
                    ? `${names.slice(0, -1).join(', ')} et ${names[names.length - 1]}`
                    : names[0];
                // « deux » seulement sans égalité ; sinon plusieurs caracs sont à
                // égalité sur la valeur la plus faible (toutes éligibles).
                const lowestPhrase =
                  lowest.length === 2
                    ? 'vos deux caractéristiques les plus faibles'
                    : 'vos caractéristiques les plus faibles';
                const deviates = isLowestMod && !!chosen && !lowest.includes(chosen);
                return (
                  <Box key={i}>
                    <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 260 } }}>
                      <InputLabel>{`${mod.value > 0 ? '+' : ''}${mod.value} à`}</InputLabel>
                      <Select
                        label={`${mod.value > 0 ? '+' : ''}${mod.value} à`}
                        value={draft.ancestryChoices[i] ?? ''}
                        onChange={(e) => setChoice(i, e.target.value as AbilityId)}
                      >
                        {(isLowestMod ? ABILITY_IDS : mod.abilities).map((c) => (
                          <MenuItem
                            key={c}
                            value={c}
                            sx={isLowestMod
                              ? lowest.includes(c)
                                ? { fontWeight: 700 }
                                : { opacity: 0.35 }
                              : undefined}
                          >
                            {ABILITY_NAMES[c]}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    {isLowestMod && (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ display: 'block', mt: 0.5 }}
                      >
                        Règle de l’humain (p. 57) : ce +1 doit porter sur l’une de {lowestPhrase}
                        {lowestNames ? ` (${lowestNames})` : ''}.
                      </Typography>
                    )}
                    {deviates && chosen && (
                      <Alert severity="warning" sx={{ mt: 1 }}>
                        {ABILITY_NAMES[chosen]} ne fait pas partie de {lowestPhrase}
                        {lowestNames ? ` (${lowestNames})` : ''} : vous dérogez à la règle de
                        l’humain.
                      </Alert>
                    )}
                  </Box>
                );
              })}
            </Stack>
          </CardContent>
        </Card>
      )}

      <Grid container spacing={2}>
        <Grid size={12}>
          <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
            <Box sx={{ width: 24, flexShrink: 0 }} />
            <Typography variant="overline" color="text.secondary" sx={{ flex: 1, maxWidth: 160 }}>
              Jet de dés
            </Typography>
            <Typography variant="overline" color="text.secondary" sx={{ flex: 1, maxWidth: 160 }}>
              Total
            </Typography>
          </Stack>
        </Grid>
        {ABILITY_IDS.map((id) => {
          const total = draft.baseAbilities[id] + deltas[id];
          const color = abilityTotalColor(total);
          return (
            <Grid key={id} size={12}>
              <Stack direction="row" spacing={2} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                <AbilityIcon
                  ability={id}
                  title
                  size={24}
                  sx={{ color: 'text.secondary', flexShrink: 0 }}
                />
                <TextField
                  label={id}
                  type="number"
                  size="small"
                  value={draft.baseAbilities[id]}
                  onChange={(e) => setBase(id, Number(e.target.value) || 0)}
                  sx={{ flex: 1, maxWidth: 160 }}
                />
                <TextField
                  label={abilityTotalLabel(total)}
                  size="small"
                  disabled
                  value={`${total > 0 ? '+' : ''}${total}`}
                  sx={{
                    flex: 1,
                    maxWidth: 160,
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

/** Patch de changement de profil principal : équipement de départ et options de
 * mage réinitialisés (cohérent avec le choix de profil de l'étape 2). */
function mainProfilePatch(newClassId: string): Partial<WizardDraft> {
  const newClass = classById.get(newClassId);
  if (!newClass) return {};
  return {
    classId: newClassId,
    equipment: initialEquipment(newClass),
    magePathSlot: false,
    mageBonus: null,
  };
}

/** Famille du profil d'une voie de profil (via son premier profil rattaché). */
function pathFamilyId(pathId: string): string | undefined {
  const path = pathById.get(pathId);
  if (path?.type !== 'class') return undefined;
  return classById.get(path.classIds[0])?.familyId;
}

export function PathsStep({ draft, patch }: StepProps) {
  const characterClass = classById.get(draft.classId);
  if (!characterClass) return <Alert severity="warning">Choisissez d’abord un profil.</Alert>;
  const isMage = characterClass.familyId === 'mages';
  const ancestry = ancestryById.get(draft.ancestryId);
  const hybrid = draft.hybrid ?? false;

  // Choix portés par les capacités de rang 1 effectivement acquises (voie de
  // peuple + voies choisies) — proposés ici, dès la sélection des voies (PER-68).
  // `materializeDraft` fournit le personnage de travail pour résoudre les
  // domaines et lire/écrire les choix retenus (`draft.featureChoices`).
  const choicePreview = ancestry ? materializeDraft(draft, ancestry, draft.createdAt) : null;
  const level1WithChoices = choicePreview
    ? choicePreview.featureIds.filter((id) => featureChoiceDefs(id).length > 0)
    : [];

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
    // Hybride : si le profil principal n'est plus l'un des profils des voies
    // choisies, le rebascule sur le premier profil concerné (p. 180).
    if (hybrid) {
      const involved = involvedClassIds(next);
      if (involved.length > 0 && !involved.includes(draft.classId)) {
        patch({ chosenPaths: next, ...mainProfilePatch(involved[0]) });
        return;
      }
    }
    patch({ chosenPaths: next, mageBonus });
  };

  const setHybrid = (on: boolean) => {
    if (on) {
      patch({ hybrid: true });
      return;
    }
    // Repli standard : ne conserver que les voies du profil principal.
    const kept = draft.chosenPaths.filter((p) => characterClass.pathIds.includes(p));
    const mageBonus =
      draft.mageBonus?.type === 'class-rank2' && !kept.includes(draft.mageBonus.pathId)
        ? null
        : draft.mageBonus;
    patch({ hybrid: false, chosenPaths: kept, mageBonus });
  };

  // Liste de cases à cocher pour les voies d'un profil donné.
  const pathChecklist = (pathIds: string[]) => (
    <Stack>
      {pathIds.map((vid) => {
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
  );

  // Hybride : profils autres que le profil principal, avec leurs voies propres
  // (les voies partagées avec le profil principal sont retirées pour éviter les
  // doublons).
  const otherClasses = classes
    .filter((c) => c.id !== characterClass.id)
    .map((c) => ({ characterClass: c, pathIds: c.pathIds.filter((p) => !characterClass.pathIds.includes(p)) }))
    .filter((c) => c.pathIds.length > 0);

  // Profils dont sont issues les voies choisies (pour désigner le principal).
  const involved = involvedClassIds(draft.chosenPaths);
  // Voies choisies appartenant à la famille des mages (pour le bonus de rang 2,
  // « obligatoirement dans la voie de cette famille » — p. 180).
  const mageRank2Paths = draft.chosenPaths.filter((p) => pathFamilyId(p) === 'mages');

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

        <FormControlLabel
          sx={{ mb: 1 }}
          control={<Switch size="small" checked={hybrid} onChange={(e) => setHybrid(e.target.checked)} />}
          label={
            <Typography variant="body2" color="text.secondary">
              Profil hybride : voies d’autres profils dès la création (accord du MJ, p. 179-180)
            </Typography>
          }
        />

        {hybrid && (
          <Typography
            variant="subtitle2"
            sx={{ color: classColor(characterClass.id), mt: 1 }}
          >
            {characterClass.name} (profil principal)
          </Typography>
        )}
        {pathChecklist(characterClass.pathIds)}

        {hybrid && (
          <>
            <Typography variant="overline" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
              Voies d’autres profils
            </Typography>
            <Stack spacing={1}>
              {otherClasses.map(({ characterClass: c, pathIds }) => {
                const color = classColor(c.id);
                return (
                  <Accordion
                    key={c.id}
                    disableGutters
                    elevation={0}
                    sx={{
                      border: 1,
                      borderColor: 'divider',
                      borderLeft: 3,
                      borderLeftColor: color,
                      '&::before': { display: 'none' },
                    }}
                  >
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                        <ClassIcon classId={c.id} size={20} />
                        <Typography variant="subtitle2" sx={{ fontWeight: 600, color }}>
                          {c.name}
                        </Typography>
                      </Stack>
                    </AccordionSummary>
                    <AccordionDetails>{pathChecklist(pathIds)}</AccordionDetails>
                  </Accordion>
                );
              })}
            </Stack>

            {involved.length > 0 && (
              <FormControl sx={{ mt: 2 }}>
                <FormLabel>Profil principal (parmi les profils des voies choisies, p. 180)</FormLabel>
                <RadioGroup
                  value={involved.includes(draft.classId) ? draft.classId : ''}
                  onChange={(e) => patch(mainProfilePatch(e.target.value))}
                >
                  {involved.map((cid) => (
                    <FormControlLabel
                      key={cid}
                      value={cid}
                      control={<Radio />}
                      label={
                        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                          <ClassIcon classId={cid} size={18} />
                          <span>{classById.get(cid)?.name ?? cid}</span>
                        </Stack>
                      }
                    />
                  ))}
                </RadioGroup>
                <Typography variant="caption" color="text.secondary">
                  Détermine le dé de récupération et l’avantage de famille ; les PV du niveau 1
                  additionnent les PV des deux profils des voies choisies.
                </Typography>
              </FormControl>
            )}
          </>
        )}
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
                {mageRank2Paths.map((vid) => (
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

      {/* Choix portés par les capacités de rang 1 (PER-66/68) : proposés dès la
          sélection des voies. Obligatoires — la création reste bloquée tant
          qu'ils ne sont pas tous résolus (récapitulés à la dernière étape). */}
      {choicePreview && level1WithChoices.length > 0 && (
        <Card variant="outlined">
          <CardContent>
            <Typography variant="subtitle2" gutterBottom>
              Choix des capacités de rang 1
            </Typography>
            <Stack spacing={2}>
              {level1WithChoices.map((id) => {
                const feature = featureById.get(id);
                return (
                  <Box key={id}>
                    <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                      {feature ? <FeatureLabel feature={feature} /> : id}
                    </Typography>
                    <FeatureChoiceField
                      character={choicePreview}
                      featureId={id}
                      mode="edit"
                      blocking
                      onChange={(fid, index, value) =>
                        patch({ featureChoices: setFeatureChoice(choicePreview, fid, index, value) })
                      }
                    />
                  </Box>
                );
              })}
            </Stack>
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
      <Grid container spacing={2}>
        <Grid size={{ xs: 6, sm: 3 }}>
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
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
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
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
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
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
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
        </Grid>
      </Grid>
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

export function SummaryStep({ draft, patch }: StepProps) {
  const ancestry = ancestryById.get(draft.ancestryId);
  const characterClass = classById.get(draft.classId);
  const family = characterClass ? familyById.get(characterClass.familyId) : undefined;
  if (!ancestry || !characterClass || !family) {
    return <Alert severity="warning">Récapitulatif indisponible : étapes incomplètes.</Alert>;
  }

  const abilities = finalAbilities(draft, ancestry);
  const featureIds = level1FeatureIds(draft);
  const spellCount = featureIds.filter((id) => featureById.get(id)?.isSpell).length;
  const preview = materializeDraft(draft, ancestry, draft.createdAt);
  const derivedInput = {
    // Caractéristiques effectives (saisie + peuple + modificateurs permanents de
    // capacités du niveau 1) — cohérent avec la fiche. Cf. `effectiveAbilities`.
    abilities: effectiveAbilities(preview),
    level: 1,
    family,
    defenseEquipment: defenseFromEquipment(draft.equipment),
    spellCount,
    // Bonus des capacités du niveau 1 (PER-63) + capacités empruntées par un
    // choix « capacité d'une autre voie » (PER-66) ; `preview` porte déjà les
    // choix faits dans le wizard. Le contexte (PER-67) résout les valeurs
    // scalantes (ex. PV += FOR) ; aucun interrupteur n'est encore basculé.
    mods: modsFromFeatures(effectiveFeatureIdsForMods(preview), effectContext(preview)),
    // PV de base d'un profil hybride créé au niveau 1 (somme des deux familles,
    // p. 180) ; identique à 2 × baseHp pour un profil standard.
    hpLevel1Family: level1FamilyHp(preview, rulesContext),
    // Détail par famille pour l'infobulle (vide hors hybridation).
    hpLevel1Families: level1HybridFamilies(preview, rulesContext),
  };
  const warnings = checkCompliance(preview, rulesContext);

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4" component="h2" sx={{ fontWeight: 'bold' }}>
          {draft.name || 'Nouveau personnage'}
        </Typography>
        <Stack
          direction="row"
          spacing={0.75}
          sx={{ alignItems: 'center', color: 'text.secondary' }}
        >
          <Typography variant="body2" component="span">
            {ancestry.name} ·
          </Typography>
          <ClassIcon classId={characterClass.id} size={18} />
          <Typography
            variant="body2"
            component="span"
            sx={{ color: classColor(characterClass.id), fontWeight: 600 }}
          >
            {characterClass.name}
          </Typography>
          <Typography variant="body2" component="span">
            · niveau 1
          </Typography>
        </Stack>
      </Box>

      <Box>
        <Typography variant="subtitle2" gutterBottom>
          Caractéristiques
        </Typography>
        <Stack direction="row" spacing={1}>
          {ABILITY_IDS.map((id) => {
            const total = abilities[id];
            const color = abilityTotalColor(total);
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
                }}
              >
                <AbilityIcon ability={id} title size={32} sx={{ color: 'text.secondary' }} />
                <Typography variant="subtitle1" color="text.secondary" sx={{ fontWeight: 'bold' }}>
                  {id}
                </Typography>
                <AbilityBreakdownTooltip
                  abilityId={id}
                  baseAbilities={draft.baseAbilities}
                  ancestry={ancestry}
                  ancestryChoices={draft.ancestryChoices}
                >
                  <Typography variant="h6" sx={{ fontWeight: 'bold', color, cursor: 'help' }}>
                    {total > 0 ? '+' : ''}
                    {total}
                  </Typography>
                </AbilityBreakdownTooltip>
              </Box>
            );
          })}
        </Stack>
      </Box>

      <Box>
        <Typography variant="subtitle2" gutterBottom>
          Statistiques dérivées
        </Typography>
        <DerivedStatsGrid
          input={derivedInput}
          featureIds={effectiveFeatureIdsForMods(preview)}
          effectContext={effectContext(preview)}
        />
      </Box>

      <Box>
        <Typography variant="subtitle2" gutterBottom>
          Capacités acquises
        </Typography>
        <Grid container spacing={1}>
          {featureIds.map((id) => {
            const feature = featureById.get(id);
            const path = feature ? pathById.get(feature.pathId) : undefined;
            // Capacité liée à un profil = voie de classe → couleur/icône de SON
            // profil (pas du profil principal : en hybride, une voie peut venir
            // d'un autre profil). Voie de peuple / du mage : pas de profil →
            // bordure neutre.
            const featureClassId =
              path?.type === 'class'
                ? characterClass.pathIds.includes(path.id)
                  ? characterClass.id
                  : path.classIds[0]
                : null;
            const color = featureClassId ? classColor(featureClassId) : null;
            return (
              <Grid key={id} size={{ xs: 6, sm: 3 }}>
                <Box
                  sx={{
                    height: '100%',
                    px: 1.5,
                    py: 0.75,
                    borderRadius: 1,
                    border: '1px solid',
                    borderColor: color ?? 'divider',
                    bgcolor: color ? alpha(color, 0.15) : 'transparent',
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: 1,
                  }}
                >
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {feature ? <FeatureLabel feature={feature} /> : id}
                    </Typography>
                    {path && (
                      <Typography variant="caption" color="text.secondary">
                        {path.name}
                      </Typography>
                    )}
                  </Box>
                  {featureClassId && (
                    <ClassIcon
                      classId={featureClassId}
                      size={20}
                      color="#fff"
                      sx={{ mt: 0.25 }}
                    />
                  )}
                </Box>
              </Grid>
            );
          })}
        </Grid>
      </Box>

      {/* Choix portés par les capacités de niveau 1 (PER-66/68) — bloquant :
          le bouton « Créer » reste désactivé tant qu'ils ne sont pas résolus. */}
      {featureIds.some((id) => featureChoiceDefs(id).length > 0) && (
        <Box>
          <Typography variant="subtitle2" gutterBottom>
            Choix à faire
          </Typography>
          <Stack spacing={2}>
            {featureIds
              .filter((id) => featureChoiceDefs(id).length > 0)
              .map((id) => {
                const feature = featureById.get(id);
                return (
                  <Box key={id}>
                    <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                      {feature ? <FeatureLabel feature={feature} /> : id}
                    </Typography>
                    <FeatureChoiceField
                      character={preview}
                      featureId={id}
                      mode="edit"
                      blocking
                      onChange={(fid, index, value) =>
                        patch({ featureChoices: setFeatureChoice(preview, fid, index, value) })
                      }
                    />
                  </Box>
                );
              })}
          </Stack>
        </Box>
      )}

      {warnings.length > 0 && (
        <Alert severity="warning">
          {warnings.map((a) => a.message).join(' ')}
        </Alert>
      )}
    </Stack>
  );
}
