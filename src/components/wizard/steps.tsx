'use client';

import { useState } from 'react';
import CheckroomOutlinedIcon from '@mui/icons-material/CheckroomOutlined';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import Accordion from '@mui/material/Accordion';
import AccordionDetails from '@mui/material/AccordionDetails';
import AccordionSummary from '@mui/material/AccordionSummary';
import Autocomplete from '@mui/material/Autocomplete';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Checkbox from '@mui/material/Checkbox';
import Collapse from '@mui/material/Collapse';
import Divider from '@mui/material/Divider';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormLabel from '@mui/material/FormLabel';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import Stack from '@mui/material/Stack';
import SvgIcon, { type SvgIconProps } from '@mui/material/SvgIcon';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';
import {
  featureById,
  equipment,
  equipmentById,
  families,
  ancestryById,
  classes,
  classById,
  pathById,
  priestGods,
} from '@/data';
import type { Armor, CharacterClass, Feature, Shield, Weapon } from '@/data/schema';
import { AppAlert } from '@/components/AppAlert';
import { IdentityForm } from '@/components/IdentityForm';
import {
  divineFeatureOfVocation,
  involvedClassIds,
  MAGE_PATH_ID,
  materializeDraft,
  PRIEST_CLASS_ID,
  type WizardDraft,
} from '@/lib/character/wizard';
import { borrowedFeatureIds, hasActionableChoice, setFeatureChoice } from '@/lib/character/choices';
import {
  classDisplayName,
  effectiveClassPathIds,
  reskinnedItemName,
} from '@/lib/character/classDisplay';
import { FeatureChoiceField } from '@/components/sheet/FeatureChoiceField';
import { FeatureText } from '@/components/sheet/FeatureRichText';
import { initialEquipment } from './helpers';
import { classColor } from '@/lib/ui/classColors';
import { AbilityBadgeList } from '@/components/AbilityBadge';
import { SourceRef } from '@/components/SourceRef';
import { ClassIcon } from '@/components/ClassIcon';
import { AncestryIcon } from '@/components/AncestryIcon';
import { DamageValue } from '@/components/DamageValue';
import { formatWeaponDamage } from '@/lib/character/weaponDamage';
import { isFirearmItem } from '@/lib/character/firearms';
import { FeatureLabel } from '@/components/FeatureLabel';
import type { StepProps } from './types';

/** Échelle des armures, triée par défense croissante — pour lister les armures
 * autorisées d'une classe (toutes celles ≤ la plus protectrice permise). */
const ARMORS: Armor[] = equipment
  .filter((it): it is Armor => it.category === 'armor')
  .sort((a, b) => a.def - b.def);

/** Boucliers, triés par défense croissante — pour lister ceux qu'un profil
 * débloque (petit seul, ou petit + grand). */
const SHIELDS: Shield[] = equipment
  .filter((it): it is Shield => it.category === 'shield')
  .sort((a, b) => a.def - b.def);

/**
 * Armes à poudre de l'arquebusier — noms pour le chip de restrictions (p. 185), et leurs
 * équivalents arbalète quand la poudre est interdite dans l'univers (p. 62 : pétoire → arbalète
 * de poing, mousquet → arbalète lourde). DATA-DRIVEN (PER-234) : dérivés du sous-type d'arme à
 * poudre (`isFirearmItem`) et du champ `equivalentCrossbowId`, plus aucune liste de noms en dur.
 */
const FIREARMS: Weapon[] = equipment.filter(isFirearmItem);
const FIREARM_SHORT_NAMES = FIREARMS.map((f) => f.name);
const CROSSBOW_EQUIVALENT_NAMES = FIREARMS.map(
  (f) => (f.equivalentCrossbowId ? equipmentById.get(f.equivalentCrossbowId)?.name : undefined) ?? f.name,
);

/** Icône épée (MUI n'en fournit pas) — tracé Material Design Icons « sword ». */
function SwordIcon(props: SvgIconProps) {
  return (
    <SvgIcon {...props}>
      <path d="M6.92,5H5L14,14L15,13.06M19.96,19.12L19.12,19.96C18.73,20.35 18.1,20.35 17.71,19.96L14.59,16.84L11.91,19.5L10.5,18.09L11.92,16.67L3,7.75V3H7.75L16.67,11.92L18.09,10.5L19.5,11.91L16.83,14.58L19.95,17.7C20.35,18.1 20.35,18.73 19.96,19.12Z" />
    </SvgIcon>
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
 * protections autorisées (≤ la plus protectrice permise) et le bouclier liste
 * ceux débloqués (petit seul, ou petit + grand) ; les deux sont des données
 * structurées (blocs avec code couleur). Les armes ne le sont pas (texte nuancé
 * par profil), gardées en dessous.
 */
function ClassRestrictions({
  characterClass,
  firearmsAllowed,
  campaignAllowsFirearms,
  onFirearmsAllowedChange,
}: {
  characterClass: CharacterClass;
  /** Autorisation EFFECTIVE des armes à feu (règle campagne ∧ choix brouillon). */
  firearmsAllowed: boolean;
  /** La campagne autorise-t-elle la poudre ? Gate le toggle (PER-185). */
  campaignAllowsFirearms: boolean;
  onFirearmsAllowedChange: (value: boolean) => void;
}) {
  const theme = useTheme();

  const maxArmor = characterClass.maxArmorId ? equipmentById.get(characterClass.maxArmorId) : null;
  const maxDef = maxArmor && maxArmor.category === 'armor' ? maxArmor.def : null;
  const allowedArmors = maxDef != null ? ARMORS.filter((a) => a.def <= maxDef) : [];

  // `all` débloque tous les boucliers, `small` le petit seul (le moins
  // protecteur, en tête de SHIELDS trié par DEF), `none` aucun — p. 188.
  const allowedShields =
    characterClass.shieldAccess === 'all'
      ? SHIELDS
      : characterClass.shieldAccess === 'small'
        ? SHIELDS.slice(0, 1)
        : [];

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
              {reskinnedItemName(characterClass, w.id, w.name)} (DM{' '}
              <DamageValue damage={formatWeaponDamage(w.damage)} size={16} />
              {w.twoHandedDamage && (
                <>
                  /<DamageValue damage={formatWeaponDamage(w.twoHandedDamage)} size={16} />
                </>
              )}
              )
            </Box>
          }
        />,
      );
    }
  }
  if (characterClass.powderAllowed) {
    if (firearmsAllowed) {
      weaponBlocks.push(
        <RestrictionBlock
          key="powder"
          label={`Armes à feu (${FIREARM_SHORT_NAMES.join(' ou ')})`}
          color={theme.palette.warning.main}
        />,
      );
    } else {
      // Armes à feu interdites dans l'univers → l'arquebusier combat à l'arbalète (p. 62).
      weaponBlocks.push(
        <RestrictionBlock key="crossbow" label={CROSSBOW_EQUIVALENT_NAMES.join(' ou ')} />,
      );
    }
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
          {allowedShields.length > 0 ? (
            allowedShields.map((s) => (
              <RestrictionBlock key={s.id} label={`${s.name} (DEF +${s.def})`} />
            ))
          ) : (
            <RestrictionBlock label="Interdit" color={theme.palette.error.main} />
          )}
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

      {/* PER-185 : le joueur ne peut choisir Arquebusier/Arbalétrier QUE si la
          campagne autorise la poudre. On garde toujours le toggle affiché (grisé
          quand la campagne interdit la poudre) pour la cohérence graphique entre
          les deux cas, dans un cadre rappelant la règle de page pour chaque mode. */}
      {characterClass.powderAllowed && (
        <Box
          sx={{
            mt: 1.5,
            p: 1.25,
            border: '1px solid',
            borderColor: 'rgba(255, 255, 255, 0.12)',
            borderRadius: 1,
            bgcolor: 'rgba(255, 255, 255, 0.03)',
          }}
        >
          <FormControlLabel
            sx={{ m: 0 }}
            control={
              <Switch
                size="small"
                checked={firearmsAllowed}
                disabled={!campaignAllowsFirearms}
                onChange={(e) => onFirearmsAllowedChange(e.target.checked)}
              />
            }
            label={<Typography variant="body2">Armes à feu autorisées</Typography>}
          />
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
            {!campaignAllowsFirearms
              ? 'Armes à feu interdites dans cette campagne : ce profil combat à l’arbalète (« Arbalétrier », p. 62).'
              : firearmsAllowed
                ? 'Ce profil manie les armes à feu (« Arquebusier », p. 62).'
                : 'Armes à feu désactivées : ce profil combat à l’arbalète (« Arbalétrier », p. 62).'}
          </Typography>
        </Box>
      )}
    </Box>
  );
}

export function ClassStep({ draft, patch, campaignAllowsFirearms }: StepProps) {
  const characterClass = classById.get(draft.classId);
  // Absent = « Non attribué » → pas de contrainte de campagne (fallback historique).
  const campaignAllows = campaignAllowsFirearms ?? true;
  // Autorisation EFFECTIVE des armes à feu (règle campagne ∧ choix brouillon, PER-185) :
  // pilote le nom affiché du profil (Arquebusier ↔ Arbalétrier) et le bloc « armes ».
  const firearmsAllowed = campaignAllows && (draft.firearmsAllowed ?? true);

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
                                <span>{classDisplayName(p, firearmsAllowed)}</span>
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

      {characterClass && <Divider />}

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
                {classDisplayName(characterClass, firearmsAllowed)}
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
            <ClassRestrictions
              characterClass={characterClass}
              firearmsAllowed={firearmsAllowed}
              campaignAllowsFirearms={campaignAllows}
              onFirearmsAllowedChange={(value) => patch({ firearmsAllowed: value })}
            />
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
              Choix obligatoire <SourceRef page={122} />. Le généraliste suit les règles de base ; le
              spécialiste se voue à un seul dieu, maîtrise son arme sacrée et reçoit une capacité
              divine d’un autre profil.
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
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>Arme sacrée :</strong> {sacredWeapons || god.sacredWeaponIds.join(', ')}
              </Typography>
              <Typography variant="body2" sx={{ mb: 0.5 }}>
                <strong>Capacité divine :</strong>
              </Typography>
              {/* Carte (affichage seul) de la capacité divine, avec son texte verbatim,
                  pour aider à choisir le dieu — la capacité vient d'un AUTRE profil. */}
              {divineFeature ? (
                <PathCard
                  key={divineFeature.id}
                  name={divinePath?.name ?? divineFeature.pathId}
                  color={divineClass ? classColor(divineClass.id) : undefined}
                  classId={divineClass?.id}
                  checked
                  selectable={false}
                  defaultExpanded
                  feature={divineFeature}
                  rankLabel={`Rang ${divineFeature.rank} — capacité divine${
                    divineClass ? ` (${divineClass.name})` : ''
                  }`}
                />
              ) : (
                <Typography variant="body2">{god.divineFeatureId}</Typography>
              )}
            </Box>
          )}
        </Stack>
      </CardContent>
    </Card>
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

/** Capacité d'une voie à un rang donné (les `featureIds` sont ordonnés par rang). */
function pathFeatureAtRank(pathId: string, rank: number): Feature | undefined {
  const path = pathById.get(pathId);
  if (!path) return undefined;
  for (const fid of path.featureIds) {
    const f = featureById.get(fid);
    if (f?.rank === rank) return f;
  }
  return undefined;
}

/**
 * Carte sélectionnable d'une voie/option (étape « Voies & capacités » et options de
 * mage). Inspirée des cartes de la vue colonne de la fiche : en-tête « nom + icône
 * de profil », corps avec la capacité concernée et son texte verbatim. Contour
 * gris/neutre quand non sélectionnée, couleur de la voie quand sélectionnée.
 * `control` choisit l'indicateur : case à cocher pour les voies (multi-sélection),
 * bouton radio pour les choix exclusifs des options de mage.
 */
function PathCard({
  name,
  color = '#90a4ae',
  classId,
  ancestryId,
  checked,
  disabled = false,
  feature,
  rankLabel = 'Rang 1 — acquis gratuitement',
  note,
  control = 'checkbox',
  selectable = true,
  defaultExpanded = false,
  onToggle,
}: {
  name: string;
  color?: string;
  classId?: string;
  /** Voie de peuple : id pour l'icône neutre (à défaut de `classId`/teinte de profil). */
  ancestryId?: string;
  checked: boolean;
  disabled?: boolean;
  feature?: Feature;
  /** Libellé au-dessus de la capacité (ex. « Rang 1 — acquis gratuitement »). */
  rankLabel?: string;
  /** Précision en italique sous le libellé de rang (ex. règle de remplacement). */
  note?: React.ReactNode;
  control?: 'checkbox' | 'radio';
  /**
   * Carte sélectionnable (défaut) : indicateur visible, le clic (dé)sélectionne.
   * `false` → affichage seul (pas d'indicateur) : le clic plie/déplie le détail,
   * utile pour présenter une capacité figée (ex. capacité divine du prêtre).
   */
  selectable?: boolean;
  /** Détail déplié dès le montage (ex. pour aider à décider). */
  defaultExpanded?: boolean;
  onToggle?: () => void;
}) {
  const ControlComp = control === 'radio' ? Radio : Checkbox;
  // Détail repliable (texte verbatim de la capacité), replié par défaut — pas de
  // persistance, c'est uniquement un confort de lecture dans le créateur (PER).
  const [expanded, setExpanded] = useState(defaultExpanded);
  return (
    <Box
      onClick={() => {
        if (disabled) return;
        if (selectable) onToggle?.();
        else setExpanded((v) => !v);
      }}
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        border: 2,
        borderColor: checked ? color : 'divider',
        borderRadius: 1,
        bgcolor: checked ? alpha(color, 0.06) : 'transparent',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'border-color .15s, background-color .15s',
        '&:hover': disabled
          ? undefined
          : {
              borderColor: checked ? color : alpha(color, 0.5),
              bgcolor: checked ? alpha(color, 0.1) : alpha(color, 0.03),
            },
      }}
    >
      {/* En-tête : indicateur + nom (coloré quand sélectionné) + icône de profil + chevron. */}
      <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', p: 1 }}>
        {selectable && (
          <ControlComp
            checked={checked}
            disabled={disabled}
            size="small"
            onClick={(e) => e.stopPropagation()}
            onChange={() => onToggle?.()}
            sx={{ p: 0.5, color, '&.Mui-checked': { color } }}
          />
        )}
        <Typography
          variant="subtitle2"
          sx={{
            fontWeight: 700,
            color: checked ? color : 'text.primary',
            flexGrow: 1,
            lineHeight: 1.2,
            wordBreak: 'break-word',
          }}
        >
          {name}
        </Typography>
        {classId ? (
          <ClassIcon classId={classId} size={20} sx={{ color, flexShrink: 0 }} />
        ) : (
          ancestryId && (
            <AncestryIcon ancestryId={ancestryId} size={20} sx={{ color: 'text.secondary', flexShrink: 0 }} />
          )
        )}
        {/* Chevron de repli (indépendant de la sélection) : ouvre/ferme le détail. */}
        <IconButton
          size="small"
          aria-label={expanded ? 'Replier le détail' : 'Déplier le détail'}
          aria-expanded={expanded}
          onClick={(e) => {
            e.stopPropagation();
            setExpanded((v) => !v);
          }}
          sx={{ flexShrink: 0 }}
        >
          <ExpandMoreIcon
            fontSize="small"
            sx={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }}
          />
        </IconButton>
      </Stack>

      {/* Corps repliable : capacité concernée + son texte verbatim. */}
      <Collapse in={expanded} unmountOnExit>
        <Box sx={{ p: 1, borderTop: 1, borderColor: 'divider' }} onClick={(e) => e.stopPropagation()}>
          {feature ? (
            <>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: 'block', mb: note ? 0 : 0.25 }}
              >
                {rankLabel}
              </Typography>
              {note && (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: 'block', mb: 0.25, fontStyle: 'italic' }}
                >
                  {note}
                </Typography>
              )}
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                <FeatureLabel feature={feature} />
              </Typography>
              <FeatureText feature={feature} />
              {/* Renvoi cliquable vers la page du rang dans le livre (PER-246). Le nom de la
                  capacité sert de terme à cibler/surligner dans le visualiseur (PER-59/61). */}
              <Box sx={{ mt: 1 }}>
                <SourceRef page={feature.sourcePage} term={feature.name} />
              </Box>
            </>
          ) : (
            <Typography variant="caption" color="text.secondary">
              Capacité indisponible.
            </Typography>
          )}
        </Box>
      </Collapse>
    </Box>
  );
}

export function PathsStep({ draft, patch, campaignAllowsFirearms }: StepProps) {
  const characterClass = classById.get(draft.classId);
  if (!characterClass) return <AppAlert severity="warning">Choisissez d’abord un profil.</AppAlert>;
  // Autorisation EFFECTIVE des armes à feu (règle campagne ∧ choix brouillon, PER-185) :
  // l'arbalétrier se voit proposer le maître des arbalètes à la place des explosifs.
  // Absent = « Non attribué » → pas de contrainte de campagne (fallback historique).
  const firearmsAllowed = (campaignAllowsFirearms ?? true) && (draft.firearmsAllowed ?? true);
  const isMage = characterClass.familyId === 'mages';
  const ancestry = ancestryById.get(draft.ancestryId);
  const hybrid = draft.hybrid ?? false;

  // Choix portés par les capacités de rang 1 effectivement acquises (voie de
  // peuple + voies choisies) — proposés ici, dès la sélection des voies (PER-68).
  // `materializeDraft` fournit le personnage de travail pour résoudre les
  // domaines et lire/écrire les choix retenus (`draft.featureChoices`).
  const choicePreview = ancestry ? materializeDraft(draft, ancestry, draft.createdAt) : null;
  // Capacités natives ET empruntées (`feature-from-path`) : un emprunt porte ses propres choix
  // (cf. `featuresWithUnmadeChoices`), qui doivent être proposés ici dès qu'ils sont actionnables
  // pour que la barrière de création ne bloque jamais sans éditeur correspondant.
  const level1WithChoices = choicePreview
    ? [...new Set([...choicePreview.featureIds, ...borrowedFeatureIds(choicePreview)])].filter((id) =>
        hasActionableChoice(choicePreview, id),
      )
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
    // Si la voie d'accueil de la capacité divine n'est plus choisie, on la réinitialise.
    const v = draft.priestVocation;
    const priestVocation =
      v?.mode === 'specialist' && v.hostPathId && !next.includes(v.hostPathId)
        ? { ...v, hostPathId: undefined }
        : v;
    patch({ chosenPaths: next, mageBonus, priestVocation });
  };

  const setHybrid = (on: boolean) => {
    if (on) {
      patch({ hybrid: true });
      return;
    }
    // Repli standard : ne conserver que les voies du profil principal (voies EFFECTIVES : un
    // arbalétrier a le maître des arbalètes à la place des explosifs).
    const mainPathIds = effectiveClassPathIds(characterClass, firearmsAllowed);
    const kept = draft.chosenPaths.filter((p) => mainPathIds.includes(p));
    const mageBonus =
      draft.mageBonus?.type === 'class-rank2' && !kept.includes(draft.mageBonus.pathId)
        ? null
        : draft.mageBonus;
    patch({ hybrid: false, chosenPaths: kept, mageBonus });
  };

  // Grille de cartes cochables (2 par ligne) pour les voies d'un profil donné.
  // `color`/`classId` teintent les cartes à la couleur du profil concerné.
  const pathChecklist = (pathIds: string[], color: string, classId: string) => (
    <Grid container spacing={1.5}>
      {pathIds.map((vid) => {
        const path = pathById.get(vid);
        const checked = draft.chosenPaths.includes(vid);
        const disabled = !checked && draft.chosenPaths.length >= 2;
        return (
          <Grid key={vid} size={12}>
            <PathCard
              name={path?.name ?? vid}
              color={color}
              classId={classId}
              checked={checked}
              disabled={disabled}
              feature={pathFeatureAtRank(vid, 1)}
              onToggle={() => togglePath(vid)}
            />
          </Grid>
        );
      })}
    </Grid>
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
              Profil hybride : voies d’autres profils dès la création (accord du MJ,{' '}
              <SourceRef page="179-180" />)
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
        {pathChecklist(
          effectiveClassPathIds(characterClass, firearmsAllowed),
          classColor(characterClass.id),
          characterClass.id,
        )}

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
                    <AccordionDetails>{pathChecklist(pathIds, color, c.id)}</AccordionDetails>
                  </Accordion>
                );
              })}
            </Stack>

            {involved.length > 0 && (
              <FormControl sx={{ mt: 2 }}>
                <FormLabel>
                  Profil principal (parmi les profils des voies choisies, <SourceRef page={180} />)
                </FormLabel>
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

            {/* Emplacement de la voie de peuple : choix exclusif entre la voie de peuple
                et la voie du mage (qui la remplace). Cartes radio montrant le rang 1. */}
            <FormControl sx={{ mb: 2, width: '100%' }}>
              <FormLabel sx={{ mb: 1 }}>Emplacement de la voie de peuple</FormLabel>
              <Grid container spacing={1.5}>
                <Grid size={12}>
                  <PathCard
                    name={`Voie de peuple${ancestry ? ` (${ancestry.name})` : ''}`}
                    ancestryId={draft.ancestryPathId ?? undefined}
                    checked={!draft.magePathSlot}
                    feature={
                      draft.ancestryPathId ? pathFeatureAtRank(draft.ancestryPathId, 1) : undefined
                    }
                    rankLabel="Rang 1 — voie de peuple"
                    control="radio"
                    onToggle={() => {
                      const mageBonus =
                        draft.mageBonus?.type === 'mage-rank2' ? null : draft.mageBonus;
                      patch({ magePathSlot: false, mageBonus });
                    }}
                  />
                </Grid>
                <Grid size={12}>
                  <PathCard
                    name="Voie du mage"
                    color={classColor(characterClass.id)}
                    classId={characterClass.id}
                    checked={draft.magePathSlot}
                    feature={pathFeatureAtRank(MAGE_PATH_ID, 1)}
                    rankLabel="Rang 1 — remplace la voie de peuple"
                    note={<>Le rang 1 de la voie de peuple reste acquis <SourceRef page={60} />.</>}
                    control="radio"
                    onToggle={() => patch({ magePathSlot: true })}
                  />
                </Grid>
              </Grid>
            </FormControl>

            {/* Capacité de rang 2 supplémentaire : choix exclusif parmi les rangs 2 des
                voies de mage choisies (+ rang 2 de la voie du mage si elle occupe le slot). */}
            <FormControl sx={{ width: '100%' }}>
              <FormLabel sx={{ mb: 1 }}>Capacité de rang 2 supplémentaire</FormLabel>
              {mageRank2Paths.length === 0 && !draft.magePathSlot ? (
                <Typography variant="body2" color="text.secondary">
                  Choisissez d’abord au moins une voie de la famille des mages ci-dessus.
                </Typography>
              ) : (
                <Grid container spacing={1.5}>
                  {mageRank2Paths.map((vid) => {
                    const path = pathById.get(vid);
                    const ownerClassId =
                      path?.type === 'class'
                        ? path.classIds.includes(characterClass.id)
                          ? characterClass.id
                          : path.classIds[0]
                        : characterClass.id;
                    return (
                      <Grid key={vid} size={12}>
                        <PathCard
                          name={path?.name ?? vid}
                          color={classColor(ownerClassId)}
                          classId={ownerClassId}
                          checked={
                            draft.mageBonus?.type === 'class-rank2' &&
                            draft.mageBonus.pathId === vid
                          }
                          feature={pathFeatureAtRank(vid, 2)}
                          rankLabel="Rang 2 — capacité supplémentaire"
                          control="radio"
                          onToggle={() => patch({ mageBonus: { type: 'class-rank2', pathId: vid } })}
                        />
                      </Grid>
                    );
                  })}
                  {draft.magePathSlot && (
                    <Grid size={12}>
                      <PathCard
                        name="Voie du mage"
                        color={classColor(characterClass.id)}
                        classId={characterClass.id}
                        checked={draft.mageBonus?.type === 'mage-rank2'}
                        feature={pathFeatureAtRank(MAGE_PATH_ID, 2)}
                        rankLabel="Rang 2 — capacité supplémentaire"
                        control="radio"
                        onToggle={() => patch({ mageBonus: { type: 'mage-rank2' } })}
                      />
                    </Grid>
                  )}
                </Grid>
              )}
            </FormControl>
          </CardContent>
        </Card>
      )}

      {/* Prêtre spécialiste : la capacité divine (p. 122) remplace une capacité du
          même rang d'une voie choisie. Rang 1 → choix de la voie d'accueil ICI (à la
          création) ; rang 2+ → simple note (acquise à la montée de niveau). */}
      {(() => {
        const v = draft.priestVocation;
        const divine = divineFeatureOfVocation(v);
        if (v?.mode !== 'specialist' || !divine) return null;
        const god = priestGods.find((g) => g.id === v.godId);
        if (divine.rank !== 1) {
          return (
            <AppAlert severity="info">
              Capacité divine « {divine.name} » ({god?.name}, rang {divine.rank}) : à acquérir en
              priorité au rang {divine.rank} lors d’une montée de niveau — elle remplacera alors le
              rang {divine.rank} d’une de vos voies de prêtre.
            </AppAlert>
          );
        }
        if (draft.chosenPaths.length !== 2) return null;
        return (
          <Card variant="outlined" sx={{ borderLeft: 5, borderLeftColor: classColor(PRIEST_CLASS_ID) }}>
            <CardContent>
              <FormControl>
                <FormLabel>Capacité divine — voie d’accueil</FormLabel>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                  « {divine.name} » (capacité divine de {god?.name}, rang 1) remplace le rang 1 de
                  l’une de vos 2 voies <SourceRef page={122} />.
                </Typography>
                <RadioGroup
                  value={v.hostPathId && draft.chosenPaths.includes(v.hostPathId) ? v.hostPathId : ''}
                  onChange={(e) => patch({ priestVocation: { ...v, hostPathId: e.target.value } })}
                >
                  {draft.chosenPaths.map((pid) => (
                    <FormControlLabel
                      key={pid}
                      value={pid}
                      control={<Radio />}
                      label={`Remplace le rang 1 de ${pathById.get(pid)?.name ?? pid}`}
                    />
                  ))}
                </RadioGroup>
              </FormControl>
            </CardContent>
          </Card>
        );
      })()}

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
// Étape 6 — Identité
// ---------------------------------------------------------------------------

export function IdentityStep({ draft, patch }: StepProps) {
  const ancestry = ancestryById.get(draft.ancestryId);
  return (
    <IdentityForm
      name={draft.name}
      identity={draft.identity}
      ancestry={ancestry}
      showNameGenerator
      onName={(name) => patch({ name })}
      onIdentity={(identityPatch) => patch({ identity: { ...draft.identity, ...identityPatch } })}
    />
  );
}
