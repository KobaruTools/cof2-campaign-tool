'use client';

import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import RemoveIcon from '@mui/icons-material/Remove';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import ScienceOutlinedIcon from '@mui/icons-material/ScienceOutlined';
import EditIcon from '@mui/icons-material/Edit';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import PushPinIcon from '@mui/icons-material/PushPin';
import SelfImprovementIcon from '@mui/icons-material/SelfImprovement';
import ViewColumnIcon from '@mui/icons-material/ViewColumn';
import ViewStreamIcon from '@mui/icons-material/ViewStream';
import Accordion from '@mui/material/Accordion';
import AccordionDetails from '@mui/material/AccordionDetails';
import AccordionSummary from '@mui/material/AccordionSummary';
import Autocomplete from '@mui/material/Autocomplete';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Chip from '@mui/material/Chip';
import Collapse from '@mui/material/Collapse';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import FormControlLabel from '@mui/material/FormControlLabel';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import { alpha, lighten, type Theme } from '@mui/material/styles';
import { useState, type ReactNode } from 'react';
import { features as featureCatalog, featureById, pathById, classById, priestGodById, testDomainById } from '@/data';
import type { AbilityId, AbilitySubstitution, ActionType, CreatureProfile, Feature, Path, ResistibleDamageType, UsageCounter } from '@/data/schema';
import { FINESSE_ATTACK_MODES, STATUS_EFFECT_LABELS } from '@/data/schema';
import type { Abilities, DerivedStats } from '@/lib/engine';
import type { Character, FeatureChoiceSelection } from '@/lib/character/types';
import {
  featureChoiceDefs,
  getSelection,
  hasActionableChoice,
  hasIncompleteCustomSkill,
  borrowedNoManaFeatureIds,
} from '@/lib/character/choices';
import { animalFormCategories } from '@/lib/character/animalForms';
import {
  activeCrystalIds,
  crystalOverCapWarning,
  knownCrystals,
  maxActiveCrystals,
} from '@/lib/character/crystals';
import { crystalLabel, type Crystal } from '@/data/crystals';
import {
  creatureDefenseAltActive,
  displayCreatureProfile,
  resolveCompanionInstanceLimit,
} from '@/lib/character/companions';
import {
  borrowedPowerIntegrityKey,
  borrowedPowerUsedKey,
  inflictedStateKey,
  conditionalEffectsOf,
  creatureBonusDiceForPath,
  disabledFeatureReasons,
  escalatingManaSurcharge,
  fabulousCapacityTarget,
  resolveFamiliarGrantedPower,
  scalingDieTierBonus,
  familiarLearnedSpellId,
  familiarLearnedSpellUsageMax,
  familiarPowerUsedKey,
  FAMILIAR_LEARNED_SPELL_HOST,
  isSpellcaster,
  demiElfeFeyBloodUsageMax,
  DEMI_ELFE_FEY_BLOOD_HOST,
  DEMI_ELFE_FEY_BLOOD_USAGE_KEY,
  shortRestLockKey,
  usageCounterMaximum,
  isUsageCounterHidden,
  type DisabledFeatureReason,
  type TestDomainBonus,
  type DominatedTestSource,
} from '@/lib/character/effects';
import { featureIdsFromHistory } from '@/lib/character/levelUp';
import { spellArmorManaSurcharge } from '@/lib/character/manaSurcharge';
import { rulesContext } from '@/lib/character/rulesContext';
import { combatRitualDiscount } from '@/lib/character/warmagePath';
import { archmageStaffSpellGranted } from '@/lib/character/archmagePath';
import { useContentVersion } from '@/lib/content/useContentVersion';
// Restriction FINE d'usage d'armure par capacité d'origine (PER-86) : rendu VISUEL (rang
// désaturé + infobulle/notice), pas un avertissement de conformité.
import {
  featureArmorRestrictionViolations,
  featureArmorRestrictionMessage,
  magicTalentSpellsBlockedByArmor,
  magicTalentArmorBlockMessage,
  borrowedArmorUsageCounters as computeBorrowedArmorUsageCounters,
  pathArmorDisabledReasons,
  shieldDisabledFeatureIds,
  shieldRequiredMessage,
  rangedWeaponDisabledFeatureIds,
  rangedWeaponRequiredMessage,
  dualWieldDisabledFeatureIds,
  dualWieldRequiredMessage,
  wieldDisabledReasons,
} from '@/lib/character/armorRestrictions';
import {
  ANCESTRY_MARKER_COLOR,
  MAGE_PATH_COLOR,
  PRESTIGE_PATH_COLOR,
  classColor,
  prestigeCategoryColor,
} from '@/lib/ui/classColors';
import { prestigeStaticBorderSx } from '@/lib/ui/prestigeStyle';
import { AppAlert } from '@/components/AppAlert';
import { AppTooltip } from '@/components/AppTooltip';
import { PoisonWeaponLoadoutField } from '@/components/sheet/PoisonWeaponLoadoutField';
import { WeaponModificationField } from '@/components/sheet/WeaponModificationField';
import { SourceRef, PageRefText } from '@/components/SourceRef';
import { DamageTypeIcon } from '@/components/DamageTypeIcon';
import { DefenseBadge } from '@/components/sheet/DefenseBadge';
import { FeatureLabel } from '@/components/FeatureLabel';
import { FeatureMarkerHexes } from '@/components/FeatureMarkerHex';
import { SpellManaBadge } from '@/components/SpellManaBadge';
import { ClassIcon } from '@/components/ClassIcon';
import { AncestryIcon } from '@/components/AncestryIcon';
import { FeatureText, CapabilityChip, FeatureVerbatimContext } from '@/components/sheet/FeatureRichText';
import {
  DeclinedFeatureName,
  FeatureDeclensionContext,
  useFeatureNameDecliner,
} from '@/components/sheet/FeatureDeclension';
import { CreatureStatBlock } from '@/components/sheet/CreatureStatBlock';
import { FamiliarGrantedPowerNote, FamiliarPowerCompactCard } from '@/components/sheet/FamiliarGrantedPowerNote';
import { FeatureChoiceField, ChoiceValueBadge, ChoiceTodoBadge } from '@/components/sheet/FeatureChoiceField';
import { FeaturePathAutocomplete } from '@/components/sheet/FeaturePathAutocomplete';
import { FeatureEffectToggles } from '@/components/sheet/FeatureEffectToggles';
import { ABILITY_NAMES } from '@/lib/ui/ability';
import { crossOutAfterSx } from '@/lib/ui/crossOut';

/**
 * Couleur du badge « WIP » (PER-72) : jaune franc, VOLONTAIREMENT distinct de l'orange « warning »
 * du système (réservé aux « choix à faire »), pour ne pas confondre les deux codes couleur. Appliqué
 * en `sx` (le thème MUI n'a pas de teinte jaune dédiée) sur un Chip outlined sans prop `color`.
 */
const WIP_CHIP_SX = { color: '#ffeb3b', borderColor: '#ffeb3b' } as const;

/**
 * Deux barres diagonales en croix « capacité désactivée par l'armure » (PER-86) : légères,
 * ~1px d'épaisseur, semi-transparentes, dérivées de la couleur de texte courante (donc adaptées
 * au thème clair/sombre). Dessinées en `::after` (pointer-events:none, sous les badges positionnés)
 * sur le bloc restreint — le conteneur doit être `position: relative`.
 *
 * La recette du dégradé (et son feutrage anti-crénelage) vit dans `@/lib/ui/crossOut`, partagée avec
 * les autres « blocs barrés » de l'app (carte de créature vaincue du tracker projeté).
 */
const ARMOR_RESTRICTED_BARS_SX = crossOutAfterSx();

/**
 * Ordre d'affichage des voies par type, de gauche à droite sur la fiche :
 * la voie du peuple (ou du mage, qui la remplace) à gauche, les voies de
 * profil au milieu, la voie de prestige tout à droite.
 */
const PATH_TYPE_ORDER: Record<Path['type'], number> = {
  ancestry: 0,
  mage: 0,
  class: 1,
  prestige: 2,
};

/**
 * Colonnes des voies ORDINAIRES : la voie de peuple (ou du mage, qui la remplace)
 * + 5 voies de profil (p. 42). La voie de PRESTIGE n'en fait PAS partie : elle
 * occupe une 7ᵉ colonne DÉDIÉE et réservée, à part (cf. `PRESTIGE_COLUMN`), qu'on
 * ne peut remplir qu'avec UNE seule voie de prestige. Ne pas confondre les deux :
 * le prestige était compté à tort comme l'une des 6, ce qui interdisait d'avoir à
 * la fois 5 voies de profil et une voie de prestige (incident corrigé le 2026-07-24).
 */
const PROFILE_COLUMN_COUNT = 6;

/**
 * Indice (1-based) de la colonne réservée à l'unique voie de prestige : juste après
 * les 6 colonnes de voies ordinaires. TOUJOURS affichée, même vide (emplacement réservé).
 */
const PRESTIGE_COLUMN = PROFILE_COLUMN_COUNT + 1;

/** Nombre de rangs (lignes de capacités) par voie. */
const PATH_RANK_COUNT = 5;

export interface FeatureGroup {
  path: Path | undefined;
  pathId: string;
  features: Feature[];
}

/**
 * Regroupe les capacités d'un personnage par voie, triées par rang croissant.
 * Les groupes sont ordonnés par type de voie (voie de peuple à gauche, voies de
 * profil au milieu, voie de prestige à droite) puis, à l'intérieur d'un même
 * type, dans l'**ordre d'acquisition** (première capacité acquise de la voie),
 * et non par ordre alphabétique. Les ids inconnus sont ignorés ici (signalés par
 * les avertissements de conformité, PER-47).
 */
export function groupFeaturesByPath(
  featureIds: string[],
  /**
   * Relocalisation d'affichage : `featureId → pathId d'accueil`. Sert au prêtre
   * spécialiste, dont la capacité divine (d'un autre profil) occupe le slot d'une
   * voie de prêtre — on l'affiche sous cette voie d'accueil, pas sous sa voie d'origine.
   */
  pathOverride?: Map<string, string>,
): FeatureGroup[] {
  const byPath = new Map<string, Feature[]>();
  const acquisitionOrder: string[] = [];
  for (const id of featureIds) {
    const feature = featureById.get(id);
    if (!feature) continue;
    const pathId = pathOverride?.get(id) ?? feature.pathId;
    if (!byPath.has(pathId)) acquisitionOrder.push(pathId);
    const list = byPath.get(pathId) ?? [];
    list.push(feature);
    byPath.set(pathId, list);
  }
  const acquisitionIndex = new Map(acquisitionOrder.map((pathId, i) => [pathId, i]));
  const groups: FeatureGroup[] = [...byPath.entries()].map(([pathId, features]) => ({
    pathId,
    path: pathById.get(pathId),
    features: features.slice().sort((a, b) => a.rank - b.rank),
  }));
  groups.sort((a, b) => {
    const ta = a.path ? PATH_TYPE_ORDER[a.path.type] : 99;
    const tb = b.path ? PATH_TYPE_ORDER[b.path.type] : 99;
    if (ta !== tb) return ta - tb;
    return (acquisitionIndex.get(a.pathId) ?? 0) - (acquisitionIndex.get(b.pathId) ?? 0);
  });
  return groups;
}

/** Remplacement de slot par une capacité divine (prêtre spécialiste, p. 122). */
interface SlotReplacement {
  /** Capacité divine acquise (id), affichée à la place de la native du slot. */
  featureId: string;
  /** Voie de prêtre d'accueil (sous laquelle la divine est relocalisée). */
  hostPathId: string;
  /** Couleur de la voie d'ORIGINE de la divine (signale « ça vient d'ailleurs »). */
  originColor: string;
  /** Nom du dieu (info-bulle / badge). */
  godName?: string;
  /** Capacité native du slot, remplacée par la divine (rappel grisé d'accessibilité). */
  replacedFeature?: Feature;
}

/**
 * Si le personnage est prêtre spécialiste et que sa capacité divine est acquise,
 * décrit le remplacement de slot à afficher : la divine occupe le rang N de sa voie
 * d'accueil, à la place de la native (p. 122). `null` sinon.
 */
function divineSlotReplacement(
  character: Character | undefined,
  featureIds: string[],
): SlotReplacement | null {
  const v = character?.priestVocation;
  if (v?.mode !== 'specialist' || !v.hostPathId) return null;
  const god = priestGodById.get(v.godId);
  const divine = god ? featureById.get(god.divineFeatureId) : undefined;
  if (!divine || !featureIds.includes(divine.id)) return null; // pas (encore) acquise
  const originPath = pathById.get(divine.pathId);
  const originColor = originPath?.type === 'class' ? classColor(originPath.classIds[0]) : 'text.primary';
  return {
    featureId: divine.id,
    hostPathId: v.hostPathId,
    originColor,
    godName: god?.name,
    replacedFeature: featureById.get(`${v.hostPathId}-r${divine.rank}`),
  };
}

/** Voie d'une capacité pour un en-tête : nom, profil rattaché (icône, couleur, nom). */
function pathTitleInfo(feature: Feature): {
  classId?: string;
  pathName: string;
  color?: string;
  className?: string;
} {
  const path = pathById.get(feature.pathId);
  const classId = path?.type === 'class' ? path.classIds[0] : undefined;
  return {
    classId,
    pathName: path?.name ?? feature.pathId,
    color: classId ? classColor(classId) : undefined,
    className: classId ? classById.get(classId)?.name : undefined,
  };
}

/**
 * En-tête « icône de profil + nom de la voie (couleur du profil) + (profil) » d'une
 * capacité, d'après SA voie réelle (`feature.pathId`). Pour une capacité divine, c'est
 * sa voie d'ORIGINE (d'où vient le rang) — pas la voie d'accueil sous laquelle on
 * l'affiche. Réutilisé par le titre de la modale, l'en-tête de liste et le rappel de
 * remplacement.
 */
function ReplacedSlotHeader({ feature }: { feature: Feature }) {
  const { classId, pathName, color, className } = pathTitleInfo(feature);
  return (
    <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
      {classId && <ClassIcon classId={classId} size={18} sx={{ color: color ?? undefined, flexShrink: 0 }} />}
      <Typography component="span" variant="subtitle2" sx={{ fontWeight: 700, color: color ?? 'text.primary' }}>
        {pathName}
      </Typography>
      {className && (
        <Typography component="span" variant="caption" color="text.secondary">
          ({className})
        </Typography>
      )}
    </Stack>
  );
}

/**
 * Titre de voie d'une capacité dans la modale / l'en-tête de liste. Cas normal : la voie
 * du GROUPE (fallbacks). Cas capacité divine (remplacement) : sa voie d'ORIGINE (le rang
 * vient d'un autre profil), avec son icône, sa couleur et son profil — `feature.pathId`.
 */
function FeaturePathTitle({
  feature,
  isReplacement,
  fallbackClassId,
  fallbackAncestryId,
  fallbackPathName,
  fallbackColor,
}: {
  feature: Feature;
  isReplacement: boolean;
  fallbackClassId?: string;
  fallbackAncestryId?: string;
  fallbackPathName: string;
  fallbackColor?: string;
}) {
  const origin = isReplacement ? pathTitleInfo(feature) : null;
  const classId = origin?.classId ?? fallbackClassId;
  const pathName = origin?.pathName ?? fallbackPathName;
  const color = origin?.color ?? fallbackColor;
  // Voie de peuple : pas d'icône de profil, mais l'icône neutre de peuple (comme
  // l'en-tête de groupe), afin que la modale/l'accordéon de détail la rappellent.
  const ancestryId = !classId ? fallbackAncestryId : undefined;
  return (
    <>
      {classId && <ClassIcon classId={classId} size={18} sx={{ color: color ?? undefined, flexShrink: 0 }} />}
      {ancestryId && (
        <AncestryIcon ancestryId={ancestryId} size={18} sx={{ color: 'text.secondary', flexShrink: 0 }} />
      )}
      <Typography component="span" variant="body2" sx={{ fontWeight: 700, color: color ?? 'text.primary' }}>
        {pathName}
      </Typography>
      {origin?.className && (
        <Typography component="span" variant="caption" color="text.secondary">
          ({origin.className})
        </Typography>
      )}
    </>
  );
}

/**
 * Rappel (accessibilité) de la capacité NATIVE remplacée par une capacité divine
 * (p. 122) : rendue grisée + désaturée + semi-transparente pour signaler qu'elle est
 * INACTIVE. `showHeader` affiche en tête la voie d'accueil (icône profil + nom coloré +
 * profil) ; en vue liste le titre vit déjà dans le résumé dépliant, on le masque alors.
 */
function ReplacedSlotBlock({
  feature,
  abilities,
  level,
  showHeader = true,
}: {
  feature: Feature;
  abilities?: Abilities;
  level?: number;
  showHeader?: boolean;
}) {
  return (
    <Box
      sx={{
        p: 1,
        border: 1,
        borderStyle: 'dashed',
        borderColor: 'divider',
        borderRadius: 1,
        opacity: 0.6,
        filter: 'grayscale(0.4)',
      }}
    >
      {showHeader && (
        <Box sx={{ mb: 0.5 }}>
          <ReplacedSlotHeader feature={feature} />
        </Box>
      )}
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.25 }}>
        Remplacée par la capacité divine — rang {feature.rank}
      </Typography>
      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
        <FeatureLabel feature={feature} />
      </Typography>
      <Box sx={{ mt: 0.25 }}>
        <FeatureText feature={feature} abilities={abilities} level={level} pathRank={feature.rank} />
      </Box>
    </Box>
  );
}

/**
 * Capacité EMPRUNTÉE par un choix `feature-from-path` résolu (PER-120). Ex. Combattant
 * aguerri (mercenaire-r3) : l'arquebusier prend une capacité de rang 1 d'une autre voie.
 * Renvoie la capacité choisie (depuis `Character.featureChoices`), ou `undefined` si le
 * choix n'est pas (encore) fait. Première (et unique) entrée `feature-from-path` de la capacité.
 */
function borrowedFeatureOf(character: Character | undefined, feature: Feature): Feature | undefined {
  return borrowedFeaturesOf(character, feature)[0];
}

/**
 * Remplacement des types d'action de la carte NATIVE d'une capacité quand un grant fixe
 * (`grantedFeature.freeActionIfOwned`, PER-323) s'applique : si le personnage possède DÉJÀ cette
 * capacité nativement et qu'une autre capacité acquise l'octroierait (cambion « Enfant des ténèbres »),
 * il n'y a pas d'octroi (doublon) mais le sort natif se lance en action gratuite (G). `undefined` sinon.
 */
function nativeFreeActionOverride(character: Character | undefined, feature: Feature): ActionType[] | undefined {
  if (!character || !character.featureIds.includes(feature.id)) return undefined;
  for (const hostId of character.featureIds) {
    for (const grant of featureById.get(hostId)?.grantedFeatures ?? []) {
      if (grant.featureId === feature.id && grant.freeActionIfOwned?.length) return grant.freeActionIfOwned;
    }
  }
  return undefined;
}

/** Octroi fixe (`grantedFeatures`, PER-323) de la capacité hôte `host` ayant produit la carte octroyée `borrowedId`. */
function grantForBorrowed(host: Feature, borrowedId: string) {
  return host.grantedFeatures?.find((g) => g.featureId === borrowedId);
}

/** Notice « sans coût en mana » d'un sort octroyé `noMana` (cambion « La belle et la bête », PER-323). */
const CAMBION_NO_MANA_NOTE = (
  <>Sort octroyé : utilisé sans dépenser de mana et sans limitation d’armure (<SourceRef page={10} />).</>
);

/**
 * Notice de « Sang féerique » (demi-elfe r4, sort emprunté `noManaCost`, PER-324, p. 10). Le sort est
 * connu mais ne rapporte JAMAIS de PM au réservoir. Le mode d'incantation dépend du personnage :
 * - NON-lanceur : aucun coût en PM ; il n'a que les incantations gratuites, plafonnées par le compteur
 *   quotidien ci-dessous (3× rang 1 / 2× rang 2 / 1× rang 3).
 * - lanceur : mêmes incantations gratuites, et il peut EN PLUS lancer le sort en dépensant des PM
 *   (coût = rang du sort) s'il respecte la limitation d'armure.
 */
function demiElfeFeyBloodNote(spellcaster: boolean): ReactNode {
  return spellcaster ? (
    <>
      Sang féerique : ce sort ne rapporte pas de PM au réservoir. Tu peux le lancer gratuitement dans la
      limite du compteur quotidien ci-dessous et, en tant que lanceur de sorts, EN PLUS en dépensant des
      PM (coût égal au rang du sort) si tu respectes la limitation d’armure (<SourceRef page={10} />).
    </>
  ) : (
    <>
      Sang féerique : tu n’es pas lanceur de sorts, ce sort n’a aucun coût en PM. Tu le lances par des
      incantations gratuites, dans la limite du compteur quotidien ci-dessous, et en armure sans pénalité
      (<SourceRef page={10} />).
    </>
  );
}

/**
 * TOUTES les capacités EMPRUNTÉES par les choix `feature-from-path` résolus d'une capacité (PER-74,
 * Bâton magique de l'archimage r5 : DEUX choix sur la MÊME capacité, chacun donnant sa propre carte
 * d'emprunt, empilées dans l'ordre des choix). Généralise `borrowedFeatureOf` (qui ne renvoyait que
 * la PREMIÈRE, hypothèse valable pour toutes les autres capacités empruntantes du jeu, qui n'en ont
 * qu'une).
 */
function borrowedFeaturesOf(character: Character | undefined, feature: Feature): Feature[] {
  if (!character) return [];
  const out: Feature[] = [];
  // Grants FIXES (PER-323, cambion « Enfant des ténèbres », « La belle et la bête ») : chaque capacité
  // octroyée est rendue comme un emprunt, SAUF si le personnage la possède déjà nativement (pas de
  // doublon — la carte native passe en (G)) ou si son palier `minLevel` (Aspect du démon, niv. 10)
  // n'est pas atteint.
  for (const grant of feature.grantedFeatures ?? []) {
    if (grant.minLevel != null && character.level < grant.minLevel) continue;
    if (character.featureIds.includes(grant.featureId)) continue;
    const g = featureById.get(grant.featureId);
    if (g) out.push(g);
  }
  const defs = feature.choices;
  const sels = character.featureChoices?.[feature.id];
  if (defs && sels) {
    for (let i = 0; i < defs.length; i++) {
      if (defs[i].kind !== 'feature-from-path') continue;
      const sel = sels[i];
      if (typeof sel !== 'string') continue;
      const f = featureById.get(sel);
      if (f) out.push(f);
    }
  }
  return out;
}

/**
 * Code court de la caractéristique retenue par un choix `ability` d'une capacité (ex.
 * « CON » pour Formation d'élite, noblesse-r5), ou `undefined` si le choix n'est pas (encore)
 * fait. Sert à afficher une puce COMPACTE (code seul, nom complet en infobulle) là où le bloc
 * est trop étroit pour le libellé entier — le sélecteur de choix garde, lui, le nom complet.
 * Première (et unique) entrée `ability` de la capacité.
 */
function abilityChoiceCode(character: Character | undefined, feature: Feature): AbilityId | undefined {
  if (!character) return undefined;
  const defs = feature.choices;
  if (!defs) return undefined;
  for (let i = 0; i < defs.length; i++) {
    if (defs[i].kind === 'ability') {
      const sel = getSelection(character, feature.id, i);
      if (typeof sel === 'string') return sel as AbilityId;
    }
  }
  return undefined;
}

/**
 * Carte d'une capacité EMPRUNTÉE (PER-120), affichée SOUS le texte de la capacité hôte —
 * contrairement au « slot divin » du prêtre, elle ne REMPLACE rien : l'effet de base de
 * l'hôte (ex. le +1 DEF de Combattant aguerri) reste actif, et les effets de la capacité
 * empruntée s'appliquent aussi. Bordée et titrée à la couleur de la VOIE SOURCE (comme le
 * slot divin), avec un en-tête « Capacité empruntée — <voie> (<profil>) ».
 */
function BorrowedFeatureBlock({
  feature,
  abilities,
  level,
  hostPathRank,
  concentration = false,
  dominatedTestBonuses = [],
  footer,
  armorRestricted = false,
  armorRestrictedMessage = null,
  noMana = false,
  noManaNote,
  actionTypesOverride,
  suppressTextMarker,
}: {
  feature: Feature;
  /**
   * Sous-chaîne verbatim (PER-323) : quand présente, la QUEUE du texte à partir de cette sous-chaîne est
   * rendue BARRÉE (bonus de compétence d'un sort octroyé + supprimé, ex. Ténèbres du cambion). Absent = rien.
   */
  suppressTextMarker?: string;
  abilities?: Abilities;
  level?: number;
  /**
   * Rang ATTEINT dans la VOIE A (la voie hôte qui a fait emprunter cette capacité). Encadré « Appel
   * à une autre capacité » : le terme `rang` d'une capacité empruntée se résout sur la voie A, pas
   * sur son rang d'origine. Ex. bouclier-r1 emprunté via la voie de peuple à 5/5 → `[rang + 2]` = 7.
   */
  hostPathRank?: number;
  /**
   * Concentration accrue active (état de jeu, p. 228) : propagée aux marqueurs et à la goutte de PM
   * de la capacité empruntée, exactement comme une capacité native — un sort emprunté lancé en (A)
   * passe en (L) et voit son coût réduit de 2 PM.
   */
  concentration?: boolean;
  /**
   * Bonus de test de cette capacité empruntée qui sont DOMINÉS (ne se cumulent pas, p. 203) : rendus
   * barrés + la capacité qui les domine (PER-73). Vide = rien à signaler.
   */
  dominatedTestBonuses?: { domain: string; value: number; dominatedBy: DominatedTestSource['dominatedBy'] }[];
  /**
   * Contenu rendu en pied de carte — sert à surfacer les CHOIX propres de la capacité empruntée
   * (ex. la catégorie d'animaux de « Langage des animaux ») : l'emprunt étant une vraie capacité
   * acquise, ses choix se règlent comme ceux d'une capacité native. Le rendu (affichage vs éditeur)
   * est décidé par l'appelant, qui possède `character`/`onChoiceChange`. Absent = rien.
   */
  footer?: ReactNode;
  /**
   * PER-153 — la capacité empruntée est INTERDITE par l'armure portée (« Touche-à-tout » : un emprunt
   * de rang 2 ou qui accorde un bonus de DEF doit respecter les limitations d'armure de son profil
   * source, p. 57/177/188). Quand vrai, la carte est désaturée + barrée comme une capacité native
   * gênée (PER-86) et `armorRestrictedMessage` s'affiche en notice sourcée.
   */
  armorRestricted?: boolean;
  /** Message français sourcé (p. 177) de l'interdiction d'armure, affiché en notice. `null` = aucun. */
  armorRestrictedMessage?: string | null;
  /**
   * PER-74 — le sort emprunté est APPRIS via le rang 5 de la voie du familier : utilisé SANS coût en
   * mana (arbitrage proprio), plafonné par un compteur quotidien affiché à part. Masque la goutte de PM
   * et la notice « coût en PM au rang habituel ». Défaut `false` (emprunt ordinaire = mana natif).
   */
  noMana?: boolean;
  /**
   * Texte de la notice affichée quand `noMana` est vrai (remplace la mention par défaut, écrite pour
   * le sort appris du familier). PER-74, Bâton magique (archimage r5) : notice dédiée au bâton.
   * Absent avec `noMana` vrai → repli sur la notice du familier (comportement historique inchangé).
   */
  noManaNote?: ReactNode;
  /**
   * PER-74 — type(s) d'action affiché(s) à la place de `feature.actionTypes` natifs (Bâton magique,
   * archimage r5 : le sort emprunté se lance normalement en (A), mais via le bâton c'est une action
   * de MOUVEMENT — `['M']`). Ne modifie que l'AFFICHAGE des hexagones de cette carte ; la capacité
   * empruntée garde ses propres `actionTypes` partout ailleurs (sa voie d'origine, une autre carte).
   * Absent = types natifs inchangés.
   */
  actionTypesOverride?: ActionType[];
}) {
  const path = pathById.get(feature.pathId);
  const classId = path?.type === 'class' ? path.classIds[0] : undefined;
  const color = classId ? classColor(classId) : undefined;
  const pathName = path?.name ?? feature.pathId;
  const className = classId ? classById.get(classId)?.name : undefined;
  return (
    <>
      {/* Notice d'interdiction d'armure (PER-153) rendue AU-DESSUS de la carte, en pleine couleur —
          la carte, elle, est désaturée. Même patron que les capacités natives gênées (PER-86). */}
      {armorRestricted && armorRestrictedMessage ? (
        <AppAlert severity="warning" sx={{ mb: 1 }}>
          {/* « (p. 177) » cité en source (PER-207). */}
          <PageRefText>{armorRestrictedMessage}</PageRefText>
        </AppAlert>
      ) : null}
      {/* Rappel de la PARTICULARITÉ de la voie source (`borrowedNote`) : quand une capacité est
          empruntée, le titre de sa voie d'origine — et donc l'infobulle `note` rendue à côté —
          n'apparaît pas. La règle qui suit la capacité (ex. envoûteur : immunité 24 h) serait
          perdue ; on la re-surface ici, au-dessus de la carte. */}
      {path?.borrowedNote ? (
        <AppAlert severity="info" title={`Rappel — ${pathName}`} sx={{ mb: 1 }}>
          {/* Parse tout « (p. N) » éventuel en source cliquable. */}
          <PageRefText>{path.borrowedNote}</PageRefText>
        </AppAlert>
      ) : null}
      {/* Carte teintée/bordée à la couleur de la VOIE SOURCE, façon « slot divin » du prêtre —
          mais SANS remplacement : elle se superpose, l'hôte reste actif (PER-120). */}
      <Box
        sx={{
          p: 1,
          // Cadre discret (1px) comme les autres cartes ; la couleur de bordure/teinte rappelle
          // simplement la voie source, sans surcharger visuellement (retour propriétaire).
          border: 1,
          borderColor: color ?? 'divider',
          borderRadius: 1,
          bgcolor: color ? alpha(color, 0.06) : (theme) => alpha(theme.palette.text.primary, 0.04),
          // Interdite par l'armure (PER-153) : désaturée + croix diagonale, comme une capacité native
          // gênée (PER-86). `position: relative` pour ancrer les barres du pseudo-élément.
          ...(armorRestricted ? { position: 'relative', filter: 'grayscale(0.75)', opacity: 0.72, ...ARMOR_RESTRICTED_BARS_SX } : {}),
        }}
      >
      <Typography variant="caption" sx={{ color: color ?? 'text.secondary', fontWeight: 700, display: 'block', mb: 0.25 }}>
        <Box component="span" sx={{ mr: 0.5 }}>✦</Box>
        Capacité empruntée — {pathName}
        {className && classId ? (
          // Profil source entre parenthèses, suivi de son icône (teintée de la couleur du profil
          // via le fill par défaut de ClassIcon), pour le repérer d'un coup d'œil.
          <Box component="span" sx={{ whiteSpace: 'nowrap' }}>
            {' ('}
            {className}
            <ClassIcon classId={classId} size={13} sx={{ ml: 0.4, verticalAlign: 'text-bottom' }} />
            {')'}
          </Box>
        ) : (
          ''
        )}
      </Typography>
      {/* Ligne « nom + marqueurs d'action + coût en PM » : une capacité empruntée porte EXACTEMENT
          les mêmes marqueurs qu'une capacité native. Le nom est rendu nu (les marqueurs
          textuels de `FeatureLabel` feraient doublon avec les hexagones). */}
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', rowGap: 0.5 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
          <DeclinedFeatureName feature={feature} />
        </Typography>
        {/* Hexagones : * (sort), A/L/G/M (types d'action). Les types conditionnels au rang
            (`actionTypesFromRank`) se résolvent sur la VOIE A (rang hôte, p. 41). */}
        <FeatureMarkerHexes
          feature={actionTypesOverride ? { ...feature, actionTypes: actionTypesOverride } : feature}
          color={color}
          concentration={concentration}
          pathRank={hostPathRank ?? feature.rank}
        />
        {/* Goutte de coût en PM : « toujours calculé à partir du rang HABITUEL du sort » (p. 41) —
            c.-à-d. le rang d'origine du sort emprunté, pas le rang atteint dans la voie A. Ne rend
            rien pour une capacité empruntée qui n'est pas un sort. Masquée pour un sort APPRIS au rang 5
            du familier (`noMana`, PER-74) : conféré sans coût en mana. */}
        {!noMana && (
          <SpellManaBadge feature={feature} concentration={concentration} color={color} size={26} tooltipEnterDelay={1000} />
        )}
      </Stack>
      <Box sx={{ mt: 0.25 }}>
        {/* `rang` résolu sur la VOIE A (rang hôte), pas sur le rang d'origine de la capacité empruntée. */}
        {suppressTextMarker && feature.text.includes(suppressTextMarker) ? (
          (() => {
            // Octroi avec bonus de compétence SUPPRIMÉ (PER-323) : on coupe le texte au marqueur, on rend
            // la TÊTE enrichie (durée, etc.) et la QUEUE (la phrase du bonus) barrée + estompée.
            const cut = (s: string): [string, string] => {
              const i = s.indexOf(suppressTextMarker);
              return i < 0 ? [s, ''] : [s.slice(0, i).trimEnd(), s.slice(i)];
            };
            const [headText, tailText] = cut(feature.text);
            const headFeature: Feature = {
              ...feature,
              text: headText,
              richText: feature.richText ? cut(feature.richText)[0] : undefined,
            };
            return (
              <>
                <FeatureText feature={headFeature} abilities={abilities} level={level} pathRank={hostPathRank ?? feature.rank} />
                <Typography
                  variant="body2"
                  component="div"
                  sx={{ mt: 0.5, color: 'text.disabled', textDecoration: 'line-through' }}
                >
                  {tailText}
                </Typography>
              </>
            );
          })()
        ) : (
          <FeatureText feature={feature} abilities={abilities} level={level} pathRank={hostPathRank ?? feature.rank} />
        )}
      </Box>
      {/* Rappel des règles propres à un SORT emprunté (encadré « Appel à une autre capacité », p. 41) :
          coût en PM au rang habituel du sort, caractéristique de magie du profil d'origine (déjà reflétée
          par les formules ci-dessus, qui citent la carac d'origine), et +1 PM gagné au réservoir. */}
      {feature.isSpell && !noMana && (
        <Typography
          variant="caption"
          component="div"
          sx={{ mt: 0.75, fontStyle: 'italic', color: (theme) => alpha(theme.palette.text.secondary, 0.85) }}
        >
          Sort emprunté : coût en PM égal au rang habituel du sort ; lancé avec la caractéristique de
          magie de son profil d’origine ; il rapporte +1 PM au réservoir (<SourceRef page={41} />).
        </Typography>
      )}
      {/* PER-74 : sort APPRIS au rang 5 du familier — conféré sans coût en mana, plafonné par le
          compteur quotidien affiché sous ce bloc. */}
      {feature.isSpell && noMana && (
        <Typography
          variant="caption"
          component="div"
          sx={{ mt: 0.75, fontStyle: 'italic', color: (theme) => alpha(theme.palette.text.secondary, 0.85) }}
        >
          {noManaNote ?? (
            <>
              Sort appris du familier : utilisé sans coût en mana, dans la limite du compteur quotidien
              ci-dessous (<SourceRef page={133} />).
            </>
          )}
        </Typography>
      )}
      {/* Bonus de test DOMINÉ (ne se cumule pas, p. 203) : barré + la capacité qui le domine, pour
          que le joueur voie qu'il est pris en compte mais sans effet ici (PER-73). */}
      {dominatedTestBonuses.map((dom) => {
        const label = testDomainById.get(dom.domain)?.label ?? dom.domain;
        const signedVal = dom.value >= 0 ? `+${dom.value}` : `${dom.value}`;
        return (
          <Typography
            key={dom.domain}
            variant="caption"
            component="div"
            sx={{ mt: 0.5, color: 'text.secondary', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 0.5 }}
          >
            <Box component="span" sx={{ textDecoration: 'line-through' }}>
              {label} {signedVal}
            </Box>
            <Box component="span" sx={{ fontStyle: 'italic' }}>— ne se cumule pas avec</Box>
            <CapabilityChip featureId={dom.dominatedBy.featureId} label={null} />
          </Typography>
        );
      })}
      {footer}
      </Box>
    </>
  );
}

/**
 * Sort CITÉ à titre INDICATIF par une capacité (Élixirs mineurs/majeurs, p. 98) : la recette
 * REPRODUIT l'effet du sort d'une autre voie sans que ce dernier soit acquis ni actif sur le
 * personnage — contrairement à une capacité EMPRUNTÉE (`BorrowedFeatureBlock`), qui, elle, est
 * une vraie capacité acquise. Rendu en accordéon REPLIÉ par défaut : l'en-tête reprend la puce
 * du sort (couleurs + icône du profil source, cf. `CapabilityChip`), le détail montre son texte
 * enrichi résolu sur les carac/stats du personnage. Purement documentaire : aucun marqueur
 * d'action, aucun coût en PM, aucune règle d'emprunt (le sort n'est pas lancé « en tant que tel »).
 * `rang` résolu au rang d'ORIGINE du sort (la recette reproduit la version de base).
 */
/**
 * Contexte de PRODUCTION d'élixir pour les sorts reproduits (r4/r5) : la capacité HÔTE (qui porte
 * la réserve partagée) + le personnage + le callback de création. Fourni quand la capacité offre
 * un pool éditable (`poolInPathHeader` + `onCreateElixir`) ; alors chaque bloc de sort reproduit
 * gagne un bouton « Créer cet élixir » nommant la dose d'après CE sort (on ne peut pas deviner
 * lequel des sorts est produit — d'où un bouton par sort, retour propriétaire). Absent → blocs
 * purement documentaires.
 */
interface ElixirCreation {
  hostFeature: Feature;
  character: Character;
  onCreate: (counterKey: string, cost: number, max: number, elixirName: string) => void;
}

/**
 * Cadre commun des blocs d'INFORMATION qui listent un sort en puce de capacité (sorts reproduits,
 * élixirs préparables, pouvoirs empruntés d'un artefact) : conteneur encadré discret qui les détache
 * du texte courant et unifie leur présentation (PER-163, retour d'UX).
 */
const REFERENCED_SPELL_BLOCK_SX = {
  border: 1,
  borderColor: 'divider',
  borderRadius: 1,
  px: 1.25,
  py: 0.75,
  // Fond ASSOMBRI (voile noir) plutôt qu'éclairci, pour détacher le bloc du fond de carte avec un
  // meilleur contraste (retour d'UX PER-163).
  bgcolor: (theme: Theme) => alpha(theme.palette.common.black, 0.2),
};

function ReferencedFeatureAccordion({
  feature,
  abilities,
  level,
  creation,
  abilitySubstitutions,
}: {
  feature: Feature;
  abilities?: Abilities;
  level?: number;
  creation?: ElixirCreation;
  /** Substitutions de carac contextuelles (PER-163, ex. forgesort → INT) transmises à `FeatureText`. */
  abilitySubstitutions?: AbilitySubstitution[];
}) {
  const [expanded, setExpanded] = useState(false);
  // Collapse MANUEL (pas d'Accordion MUI) : le résumé porte à la fois le chevron de dépliage ET le
  // bouton « Créer cet élixir ». Un `AccordionSummary` est un `<button>` — y imbriquer le bouton de
  // création donnerait un bouton dans un bouton (HTML invalide). Ici la zone repliable est un simple
  // IconButton, le bouton de création vit à côté, sans imbrication.
  return (
    <Box sx={REFERENCED_SPELL_BLOCK_SX}>
      {/* Pas de `spacing` (il pose un margin-left sur chaque enfant qui écraserait le `ml: auto` du
          bouton « Créer cet élixir ») : l'espacement passe par `gap`. */}
      <Stack direction="row" sx={{ alignItems: 'center', gap: 0.5 }}>
        <IconButton
          size="small"
          aria-label={expanded ? 'Replier le sort' : 'Déplier le sort'}
          aria-expanded={expanded}
          onClick={() => setExpanded((v) => !v)}
          sx={{ p: 0.25 }}
        >
          <ExpandMoreIcon
            sx={{ fontSize: 20, transition: 'transform 0.2s', transform: expanded ? 'rotate(180deg)' : 'none' }}
          />
        </IconButton>
        {/* `label` nul → la puce affiche le nom de la capacité, décliné le cas échéant (PER-74). */}
        <CapabilityChip featureId={feature.id} label={null} />
        {creation && (
          // Bouton de production nommant la dose d'après CE sort ; poussé à droite du chip. Le
          // décompte de la réserve reste rappelé par la barre de l'en-tête de voie (showRemaining off).
          <Box sx={{ ml: 'auto' }}>
            <CreateElixirButton
              feature={creation.hostFeature}
              character={creation.character}
              onCreate={creation.onCreate}
              elixirName={feature.name}
              buttonLabel="Créer cet élixir"
              showRemaining={false}
            />
          </Box>
        )}
      </Stack>
      <Collapse in={expanded} unmountOnExit>
        <Box sx={{ pl: 3.5, pt: 0.25 }}>
          <FeatureText
            feature={feature}
            abilities={abilities}
            level={level}
            pathRank={feature.rank}
            dense
            abilitySubstitutions={abilitySubstitutions}
          />
        </Box>
      </Collapse>
    </Box>
  );
}

/**
 * Liste des sorts cités à titre indicatif par une capacité (`Feature.referencedFeatures`),
 * chacun déplié à la demande (`ReferencedFeatureAccordion`). Rendu sous la description de la
 * capacité hôte, précédé d'une légende discrète. `null` si la capacité ne cite rien (ou si
 * aucune cible ne résout — sécurité, les ids sont validés par `validate-data`). Quand `creation`
 * est fourni (Élixirs mineurs/majeurs), chaque bloc porte un bouton « Créer cet élixir ».
 */
function ReferencedFeaturesBlock({
  ids,
  abilities,
  level,
  creation,
  abilitySubstitutions,
}: {
  ids: string[];
  abilities?: Abilities;
  level?: number;
  creation?: ElixirCreation;
  /** Substitutions de carac contextuelles (PER-163, ex. forgesort → INT) propagées à chaque sort. */
  abilitySubstitutions?: AbilitySubstitution[];
}) {
  const feats = ids.map((id) => featureById.get(id)).filter((f): f is Feature => !!f);
  if (feats.length === 0) return null;
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
        {creation ? 'Élixirs préparables (choisir la recette à produire)' : 'Détail des sorts reproduits (à titre indicatif)'}
      </Typography>
      <Stack spacing={0.75}>
        {feats.map((f) => (
          <ReferencedFeatureAccordion
            key={f.id}
            feature={f}
            abilities={abilities}
            level={level}
            creation={creation}
            abilitySubstitutions={abilitySubstitutions}
          />
        ))}
      </Stack>
    </Box>
  );
}

/**
 * Une ligne de pouvoir EMPRUNTÉ par un artefact (PER-163, Artefact étrange / artefacts-r5). Le sort
 * `spellId` porte un DOUBLE cycle d'état de jeu propre, suivi dans `Character.usageCounters` (convention
 * « absence = plein ») :
 *  - USAGE quotidien (1×/jour, rechargé au repos long) : « Utiliser » consomme l'usage du jour ;
 *  - PANNE (1-2 au d6) : « Briser » grise le pouvoir jusqu'à réparation à une récupération rapide
 *    (« Réparer », ou tout repos court/long).
 * Un pouvoir cassé ne peut être utilisé (« Utiliser » désactivé). La ligne reprend le dépliage de détail
 * des sorts reproduits (puce de capacité + texte enrichi en accordéon).
 */
function BorrowedPowerRow({
  hostId,
  spellId,
  character,
  abilities,
  level,
  onSet,
  abilitySubstitutions,
}: {
  hostId: string;
  spellId: string;
  character: Character;
  abilities?: Abilities;
  level?: number;
  onSet?: (counterKey: string, value: number, max: number) => void;
  /** Substitutions de carac contextuelles (PER-163, ex. Forme éthérée CHA→INT) pour le détail du sort. */
  abilitySubstitutions?: AbilitySubstitution[];
}) {
  const [expanded, setExpanded] = useState(false);
  // PER-324 — décalage de cran du dé évolutif (r3) porté par le personnage, alimentant `FeatureText`.
  const scalingTierBonus = scalingDieTierBonus(character);
  const spell = featureById.get(spellId);
  if (!spell) return null;
  const usedKey = borrowedPowerUsedKey(hostId, spellId);
  const integrityKey = borrowedPowerIntegrityKey(hostId, spellId);
  const used = (character.usageCounters?.[usedKey] ?? 1) <= 0;
  const broken = (character.usageCounters?.[integrityKey] ?? 1) <= 0;
  return (
    <Box sx={{ ...REFERENCED_SPELL_BLOCK_SX, opacity: broken ? 0.72 : 1 }}>
      {/* Pas de `spacing` (il pose un margin-left sur chaque enfant qui écraserait le `ml: auto` de
          la boîte de droite) : l'espacement passe par `gap`. */}
      <Stack direction="row" sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 0.5 }}>
        <IconButton
          size="small"
          aria-label={expanded ? 'Replier le sort' : 'Déplier le sort'}
          aria-expanded={expanded}
          onClick={() => setExpanded((v) => !v)}
          sx={{ p: 0.25 }}
        >
          <ExpandMoreIcon
            sx={{ fontSize: 20, transition: 'transform 0.2s', transform: expanded ? 'rotate(180deg)' : 'none' }}
          />
        </IconButton>
        <CapabilityChip featureId={spell.id} label={spell.name} />
        {/* Tout ce qui suit la puce est poussé à DROITE (chip d'état + boutons) ; seuls le chevron de
            dépliage et la puce de capacité restent à gauche (retour d'UX PER-163). */}
        <Box sx={{ ml: 'auto', display: 'flex', gap: 0.5, alignItems: 'center', flexWrap: 'wrap' }}>
          {broken ? (
            <Chip
              icon={<WarningAmberOutlinedIcon />}
              label="Cassé"
              size="small"
              color="error"
              variant="outlined"
            />
          ) : used ? (
            <Chip label="Utilisé aujourd’hui" size="small" variant="outlined" />
          ) : null}
          {onSet && (
            <>
              {/* USAGE quotidien : « Utiliser » consomme l'usage du jour ; une fois utilisé, un bouton
                  de restauration permet d'annuler (le repos long recharge de toute façon). */}
              {used ? (
                <AppTooltip title="Marquer comme non utilisé (rendre l’usage du jour)">
                  <span>
                    <IconButton
                      size="small"
                      aria-label="Rendre l’usage du jour"
                      onClick={() => onSet(usedKey, 1, 1)}
                    >
                      <RestartAltIcon fontSize="small" />
                    </IconButton>
                  </span>
                </AppTooltip>
              ) : (
                <AppTooltip
                  title={broken ? 'Pouvoir cassé — réparez l’artefact d’abord' : 'Utiliser ce pouvoir (1×/jour)'}
                >
                  <span>
                    <Button
                      size="small"
                      variant="outlined"
                      disabled={broken}
                      onClick={() => onSet(usedKey, 0, 1)}
                    >
                      Utiliser
                    </Button>
                  </span>
                </AppTooltip>
              )}
              {/* PANNE : « Briser » (1-2 au d6) casse le pouvoir jusqu'à réparation ; « Réparer » le
                  remet en état (équivalent d'une récupération rapide, qui répare aussi automatiquement). */}
              {broken ? (
                <AppTooltip title="Réparé lors d’une récupération rapide (repos court)">
                  <Button
                    size="small"
                    variant="outlined"
                    color="success"
                    onClick={() => onSet(integrityKey, 1, 1)}
                  >
                    Réparer
                  </Button>
                </AppTooltip>
              ) : (
                <AppTooltip title="Panne (1-2 au d6) : casse ce pouvoir jusqu’à une récupération rapide">
                  <Button
                    size="small"
                    variant="outlined"
                    color="error"
                    onClick={() => onSet(integrityKey, 0, 1)}
                  >
                    Briser
                  </Button>
                </AppTooltip>
              )}
            </>
          )}
        </Box>
      </Stack>
      <Collapse in={expanded} unmountOnExit>
        <Box sx={{ pl: 3.5, pt: 0.25 }}>
          <FeatureText
            feature={spell}
            abilities={abilities}
            level={level}
            pathRank={spell.rank}
            dense
            abilitySubstitutions={abilitySubstitutions}
            scalingTierBonus={scalingTierBonus}
          />
        </Box>
      </Collapse>
    </Box>
  );
}

/**
 * Bloc des pouvoirs EMPRUNTÉS d'un artefact (PER-163). Une ligne `BorrowedPowerRow` par sort de
 * `feature.borrowedPowers`, précédée d'une légende rappelant les deux règles (1×/jour + panne). `null`
 * si la capacité n'emprunte aucun pouvoir (ou si aucune cible ne résout — sécurité, ids validés par
 * `validate-data`).
 */
function BorrowedPowersField({
  feature,
  character,
  abilities,
  level,
  onSet,
}: {
  feature: Feature;
  character: Character;
  abilities?: Abilities;
  level?: number;
  onSet?: (counterKey: string, value: number, max: number) => void;
}) {
  const ids = feature.borrowedPowers;
  if (!ids || ids.length === 0) return null;
  if (ids.every((id) => !featureById.get(id))) return null;
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
        Pouvoirs de l’artefact — chacun 1×/jour ; en cas de panne (1-2 au d6), « Briser » jusqu’à une
        récupération rapide
      </Typography>
      <Stack spacing={0.75}>
        {ids.map((id) => (
          <BorrowedPowerRow
            key={id}
            hostId={feature.id}
            spellId={id}
            character={character}
            abilities={abilities}
            level={level}
            onSet={onSet}
            abilitySubstitutions={feature.reproducedAbilitySubstitutions}
          />
        ))}
      </Stack>
    </Box>
  );
}

/**
 * Bloc des ÉTATS PRÉJUDICIABLES infligeables par une capacité (Botte secrète, spadassin-r5, p. 77,
 * PER-206). Un bouton-bascule par état de `feature.inflictableStates.stateIds`, chacun infligeable UNE
 * SEULE fois par combat : cliquer marque l'état « infligé ce combat » (suivi dans
 * `Character.usageCounters` sous `inflictedStateKey`, convention « absence = disponible ») ; recliquer
 * le rend disponible. Les marqueurs se réinitialisent au repos court (récupération rapide). `null` si
 * la capacité n'inflige aucun état suivi.
 */
function InflictableStatesField({
  feature,
  character,
  onSet,
}: {
  feature: Feature;
  character: Character;
  onSet?: (counterKey: string, value: number, max: number) => void;
}) {
  const spec = feature.inflictableStates;
  if (!spec || spec.stateIds.length === 0) return null;
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
        {spec.label ?? 'États infligés ce combat'} — chacun une seule fois par combat
      </Typography>
      <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 0.5 }}>
        {spec.stateIds.map((stateId) => {
          const key = inflictedStateKey(feature.id, stateId);
          // Convention « absence = disponible » : clé absente (ou > 0) ⇒ pas encore infligé.
          const inflicted = (character.usageCounters?.[key] ?? 1) <= 0;
          return (
            <AppTooltip
              key={stateId}
              title={
                inflicted
                  ? 'Déjà infligé ce combat — cliquer pour rendre disponible'
                  : 'Marquer comme infligé ce combat'
              }
            >
              <span>
                <ToggleButton
                  value={stateId}
                  selected={inflicted}
                  size="small"
                  disabled={!onSet}
                  // Infliger = poser le marqueur (valeur 0) ; annuler = le retirer (valeur ≥ max ⇒ clé
                  // supprimée par le setter, retour à « disponible »).
                  onChange={onSet ? () => onSet(key, inflicted ? 1 : 0, 1) : undefined}
                  sx={{ textTransform: 'none', py: 0.25, px: 1 }}
                >
                  {STATUS_EFFECT_LABELS[stateId]}
                </ToggleButton>
              </span>
            </AppTooltip>
          );
        })}
      </Stack>
    </Box>
  );
}

/**
 * Champ « Ajouter une capacité » (édition en place) : le sélecteur unifié groupé, précédé d'une
 * bascule « Grouper par profil ». Le catalogue complet étant gigantesque, le groupement par profil
 * (méta-groupes repliés par défaut) est ACTIVÉ par défaut pour la lisibilité ; la bascule permet de
 * revenir à un groupement par voie (déplié). État local et transitoire (comme les autres préférences
 * d'affichage de la section).
 */
function AddFeatureField({ options, onAdd }: { options: string[]; onAdd: (id: string) => void }) {
  const [byProfile, setByProfile] = useState(true);
  return (
    <Box>
      <Stack direction="row" sx={{ justifyContent: 'flex-end', mb: 0.5 }}>
        <FormControlLabel
          control={
            <Switch size="small" checked={byProfile} onChange={(e) => setByProfile(e.target.checked)} />
          }
          label={
            <Typography variant="caption" color="text.secondary">
              Grouper par profil
            </Typography>
          }
          sx={{ mr: 0 }}
        />
      </Stack>
      <FeaturePathAutocomplete
        options={options}
        value={null}
        onChange={(id) => {
          if (id) onAdd(id);
        }}
        label="Ajouter une capacité"
        groupMode={byProfile ? 'profile' : 'path'}
        clearOnSelect
      />
    </Box>
  );
}

/** Disposition des voies : empilées (« Lignes ») ou en grille (« Tableau »). */
export type FeaturesLayout = 'rows' | 'columns';

export interface FeaturesByPathProps {
  featureIds: string[];
  /** Profil du personnage : sert à teinter les voies de profil. */
  classId: string;
  /** Disposition d'affichage (contrôlée par le parent). */
  layout: FeaturesLayout;
  /**
   * Concentration accrue active (état de jeu, p. 228) : affiche pour les sorts
   * éligibles (lancés en (A)) leur coût réduit de 2 PM et leur passage en (L).
   */
  concentration?: boolean;
  /**
   * Caractéristiques et niveau du personnage : permettent le rendu ENRICHI des
   * rangs (dés, dé évolutif au niveau courant, formules calculées — PER-64).
   * Absents → on retombe sur le texte verbatim de chaque capacité.
   */
  abilities?: Abilities;
  level?: number;
  /**
   * Stats dérivées du MAÎTRE — pour les mini-fiches de compagnons dont l'Init./attaque
   * recopient le total du personnage (golem, familier, démon…). Absent → libellé de repli.
   */
  masterDerived?: DerivedStats;
  /** Édition en place : si fourni, suppression et ajout de capacités. */
  onChange?: (featureIds: string[]) => void;
  /**
   * Capacités ajoutées manuellement sur la fiche (hors wizard) : affichées avec
   * une épingle pour garder une trace de la saisie manuelle (PER-53).
   */
  manualFeatureIds?: Set<string>;
  /**
   * Personnage complet : requis pour afficher et résoudre les choix portés par
   * les capacités (PER-66/68 — domaine des capacités empruntables, sélection
   * retenue). Absent → les choix ne sont pas affichés.
   */
  character?: Character;
  /**
   * Édition d'un choix porté par une capacité (fiche permissive). Si fourni
   * (avec `character`), les choix deviennent modifiables en place ; sinon ils
   * sont affichés en lecture seule sous la description.
   */
  onChoiceChange?: (featureId: string, index: number, value: FeatureChoiceSelection) => void;
  /**
   * Passe le bloc « Voies » en mode édition (allume le crayon des capacités). Permet, en cliquant
   * la puce d'un choix affichée HORS édition, de basculer automatiquement en édition PUIS d'ouvrir
   * la modale du choix (les choix de construction sont trop importants pour n'être accessibles
   * qu'après un détour par le crayon). Absent (ou fiche en lecture seule stricte) → la puce n'ouvre
   * l'éditeur que si l'on est déjà en édition.
   */
  onEnableFeatureEditing?: () => void;
  /**
   * Bascule d'un interrupteur d'effet conditionnel (PER-67). État de jeu
   * transitoire, activable à tout moment (même hors mode édition). Absent (sans
   * `character`) → interrupteurs désactivés.
   */
  onToggleEffect?: (featureId: string, index: number, active: boolean) => void;
  /**
   * États posés par le MJ en session ACTIVE (PER-314) : un buff de groupe qui s'y trouve grise
   * l'interrupteur de fiche du porteur (« appliqué par la séance »), déjà exclu du calcul en amont.
   */
  sessionStatusIds?: readonly string[];
  /**
   * Saisie libre d'état de jeu corrélée à une capacité (PER-70 — ex. l'animal pris
   * par « Forme animale »). État transitoire, modifiable même hors édition. Absent
   * → la saisie est affichée en lecture seule (ou masquée si vide).
   */
  onSetEffectInput?: (featureId: string, value: string) => void;
  /**
   * Met à jour le décompte d'une capacité à usages limités (PER-70 — ex. « Les sept
   * vies du chat »). État de jeu, modifiable hors édition. Absent → compteur en
   * lecture seule.
   */
  onSetUsageCounter?: (counterKey: string, value: number, max: number) => void;
  /** (Dés)active un cristal APPRIS (voie des cristaux, PER-74, p. 156). État de jeu, hors édition. */
  onToggleCrystalActive?: (crystalId: string, active: boolean) => void;
  /**
   * Lève le verrou « repos court requis » d'une capacité (PER-160/161) SANS forcer un vrai repos :
   * applique l'effet d'un repos court À CETTE SEULE capacité (lève le verrou `oncePerShortRest` et
   * recharge ce qu'un repos court rechargerait). Rendu par un cadenas ouvert quand la capacité est
   * bloquée — pour ne jamais OBLIGER à cliquer « Repos court ». Absent → cadenas masqué (lecture seule).
   */
  onLiftShortRestLock?: (featureId: string) => void;
  /**
   * Produit un élixir (forgesort, p. 98) : consomme la réserve partagée d'un cran (`cost`) ET
   * matérialise une dose dans l'équipement (objet custom). `elixirName` nomme la dose créée — le
   * nom de la capacité pour les rangs 1-3 (une seule recette), le nom du sort choisi pour les
   * Élixirs mineurs/majeurs (r4/r5). Absent → boutons de création masqués (lecture seule).
   */
  onCreateElixir?: (counterKey: string, cost: number, max: number, elixirName: string) => void;
  /**
   * Invoque un nouvel exemplaire d'un compagnon MULTI-INSTANCES (zombie, PER-235) : crée une
   * instance à PV pleins, dans la limite du profil (`CreatureProfile.instances.limit`). Rendu par
   * le badge bleu « Invoquer » sur la carte du rang porteur. Absent → badge en lecture seule (pas
   * de création). État de jeu, modifiable hors édition.
   */
  onSummonCompanionInstance?: (featureId: string) => void;
  /** Applique un patch d'état de jeu « poison appliqué aux armes » (maître des poisons, PER-74). */
  onPoisonUpdate?: (patch: Partial<Character>) => void;
  /** Applique un patch « armes bricolées » (chargeur / second canon, PER-284). */
  onWeaponModificationUpdate?: (patch: Partial<Character>) => void;
  /**
   * Bonus de compétence par domaine (cf. `testBonusSources`) — utilisé pour signaler, sur une
   * capacité EMPRUNTÉE, que son bonus de test est DOMINÉ (ne se cumule pas), affiché barré + la
   * capacité qui le domine (PER-73). Absent → aucun signalement.
   */
  testBonuses?: TestDomainBonus[];
  /**
   * Affiche le texte d'ORIGINE verbatim (`Feature.text`) plutôt que le rendu enrichi
   * (PER-88). Défaut `false` → rendu enrichi. Propagé à tous les `FeatureText` de la
   * section via `FeatureVerbatimContext`.
   */
  verbatim?: boolean;
}

/**
 * Épingle : capacité ajoutée manuellement sur la fiche, hors wizard (PER-53).
 * `inline` la place dans le flux (vue lignes, à côté du rang) plutôt qu'en
 * absolu dans un coin de la carte (vue colonnes). En absolu, elle est ancrée en
 * HAUT à DROITE, pivotée vers ce coin et superposée à la goutte de coût en mana
 * qui occupe le même coin (`SpellManaBadge`, PER-65) — l'épingle passe au-dessus.
 */
function ManualPin({ inline = false }: { inline?: boolean }) {
  return (
    <AppTooltip title="Ajoutée manuellement sur la fiche (hors wizard)">
      <PushPinIcon
        color="warning"
        sx={{
          fontSize: 16,
          ...(inline
            ? { flexShrink: 0 }
            : {
                position: 'absolute',
                // Centrée verticalement, collée au bord droit ; pivotée à 45°.
                // zIndex 2 : passe AU-DESSUS de la goutte de mana (zIndex 1).
                top: '50%',
                right: -5,
                transform: 'translateY(-50%) rotate(45deg)',
                zIndex: 2,
              }),
        }}
      />
    </AppTooltip>
  );
}

/**
 * Renvoi cliquable vers la page du livre où figure ce rang de voie (PER-246), rendu discret et
 * aligné à GAUCHE sous la description. `Feature.sourcePage` est toujours renseigné (schéma), donc
 * pas de garde. Ouvre le visualiseur PDF à la page citée via `SourceRef` (livre de base par défaut).
 */
function FeatureSourcePage({ feature }: { feature: Feature }) {
  return (
    <Box sx={{ mt: 1 }}>
      {/* Le nom de la capacité sert de terme à cibler/surligner dans le visualiseur (PER-59/61). */}
      <SourceRef page={feature.sourcePage} term={feature.name} />
    </Box>
  );
}

/** Bascule lignes / tableau, à placer dans l'en-tête de la section. */
export function FeaturesLayoutToggle({
  value,
  onChange,
}: {
  value: FeaturesLayout;
  onChange: (value: FeaturesLayout) => void;
}) {
  return (
    <ToggleButtonGroup
      value={value}
      exclusive
      size="small"
      onChange={(_, next) => {
        if (next) onChange(next);
      }}
    >
      <ToggleButton value="rows" aria-label="Affichage en lignes">
        <AppTooltip title="Affichage en lignes">
          <ViewStreamIcon fontSize="small" />
        </AppTooltip>
      </ToggleButton>
      <ToggleButton value="columns" aria-label="Affichage en colonnes">
        <AppTooltip title="Affichage en colonnes">
          <ViewColumnIcon fontSize="small" />
        </AppTooltip>
      </ToggleButton>
    </ToggleButtonGroup>
  );
}

/**
 * Interrupteur « Concentration accrue » (p. 228), à placer dans l'en-tête de la
 * section à côté de la bascule d'affichage. État de jeu transitoire : quand il
 * est actif, les sorts lancés en action d'attaque (A) affichent leur coût réduit
 * de 2 PM (plancher 0) et passent en action limitée (L). Sans effet sur les sorts
 * déjà en (L), (M) ou (G), qui ne peuvent pas en bénéficier.
 */
export function ConcentrationToggle({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <ToggleButton
      value="concentration"
      selected={value}
      size="small"
      aria-label="Concentration accrue"
      aria-pressed={value}
      onChange={() => onChange(!value)}
      sx={
        // Actif : halo bleu mana diffus, rappel visuel des marqueurs de concentration
        // (goutte de PM réduite, hexagone (L)).
        value
          ? { boxShadow: (theme) => `0 0 6px ${theme.palette.info.main}`, color: 'info.main' }
          : undefined
      }
    >
      <AppTooltip
        title="Concentration accrue : les sorts en (A) coûtent 2 PM de moins (plancher 0) et deviennent une action limitée (L)"
        page={228}
      >
        <SelfImprovementIcon fontSize="small" />
      </AppTooltip>
    </ToggleButton>
  );
}

/**
 * Interrupteur « Texte d'origine » (PER-88), à placer dans l'en-tête de la section à
 * côté de la bascule d'affichage. OFF (défaut) → rendu ENRICHI des capacités (dés en
 * icônes, dé évolutif au niveau courant, encadrés de formule — PER-64) ; ON → texte
 * d'origine VERBATIM (`Feature.text`), sans enrichissement, pour consulter la règle
 * officielle telle qu'elle figure dans le livre. S'applique à toute la section (via
 * `FeatureVerbatimContext`), en vue lignes comme en vue colonnes.
 */
export function VerbatimToggle({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <ToggleButton
      value="verbatim"
      selected={value}
      size="small"
      aria-label="Texte d'origine"
      aria-pressed={value}
      onChange={() => onChange(!value)}
      sx={value ? { color: 'text.primary' } : undefined}
    >
      <AppTooltip
        title={
          value
            ? "Texte d'origine affiché — cliquez pour revenir au rendu enrichi (dés, formules calculées)"
            : "Afficher le texte d'origine (verbatim du livre), sans enrichissement"
        }
      >
        <MenuBookOutlinedIcon fontSize="small" />
      </AppTooltip>
    </ToggleButton>
  );
}

/**
 * Capacité de peuple de rang 1 conservée par un mage, affichée à l'intérieur du
 * bloc de rang 1 de la voie du mage (« Capacité de peuple + occultisme », p. 60).
 */
function RetainedAncestryCapacity({
  feature,
  pathName,
  abilities,
  level,
}: {
  feature: Feature;
  pathName?: string;
  abilities?: Abilities;
  level?: number;
}) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
        Capacité de peuple conservée{pathName ? ` — ${pathName}` : ''}
      </Typography>
      <Typography variant="subtitle2" sx={{ fontWeight: 600, mt: 0.25 }}>
        <FeatureLabel feature={feature} />
      </Typography>
      <Box sx={{ mt: 0.25 }}>
        {/* Capacité de peuple isolée : sa voie se réduit à son rang 1 conservé. */}
        <FeatureText feature={feature} abilities={abilities} level={level} pathRank={feature.rank} />
      </Box>
    </Box>
  );
}

/**
 * Forme animale (animaux-r5) : liste, sous la description, les catégories d'animaux
 * en lesquelles le druide peut se métamorphoser — dérivées des choix de « Langage des
 * animaux » (animaux-r1), hors animaux fantastiques. Rendu discret (légende), aligné
 * sur le style des notes.
 */

function AnimalFormsNote({ character }: { character: Character }) {
  const forms = animalFormCategories(character);
  if (!forms) return null;
  return (
    <Typography
      variant="caption"
      component="div"
      sx={{ mt: 1, fontStyle: 'italic', color: (theme) => alpha(theme.palette.text.secondary, 0.85) }}
    >
      Formes accessibles (selon Langage des animaux) : {forms.join(', ')}.
    </Typography>
  );
}

/**
 * Sélecteur LIBRE de l'animal pris par « Forme animale » (animaux-r5), corrélé à
 * l'interrupteur de transformation (état de jeu, `Character.effectInputs`, PER-70).
 * Contrairement aux choix de capacité (énumérés, liés à la progression), il est en
 * saisie libre : un Autocomplete `freeSolo` proposant les catégories accessibles
 * (dérivées de Langage des animaux) tout en autorisant un animal précis au clavier.
 * En lecture seule (sans `onSetInput`), affiche la valeur saisie si elle existe.
 */
function AnimalFormSelector({
  character,
  onSetInput,
}: {
  character: Character;
  onSetInput?: (featureId: string, value: string) => void;
}) {
  const value = character.effectInputs?.['animaux-r5'] ?? '';
  if (!onSetInput) {
    return value ? (
      <Typography variant="caption" component="div" sx={{ mt: 1, fontWeight: 600 }}>
        Forme prise : {value}
      </Typography>
    ) : null;
  }
  return (
    <Box sx={{ mt: 1 }}>
      <Autocomplete
        freeSolo
        options={animalFormCategories(character) ?? []}
        value={value}
        onInputChange={(_, next) => onSetInput('animaux-r5', next)}
        renderInput={(params) => (
          <TextField
            {...params}
            label="Forme prise"
            placeholder="catégorie ou animal précis (ex. loup)"
            size="small"
          />
        )}
        sx={{ maxWidth: 320 }}
      />
      <Typography
        variant="caption"
        component="div"
        sx={{ mt: 0.5, fontStyle: 'italic', color: (theme) => alpha(theme.palette.text.secondary, 0.85) }}
      >
        Caractéristiques de l’animal arbitrées par le MJ ; ajustez-les via les surcharges
        manuelles si besoin.
      </Typography>
    </Box>
  );
}

/** Libellés français courts des types de dégât proposés à un choix de résistance. */
const ELEMENT_CHOICE_LABEL: Partial<Record<ResistibleDamageType, string>> = {
  fire: 'Feu',
  cold: 'Froid',
  lightning: 'Foudre',
  acid: 'Acide',
  poison: 'Poison',
  disease: 'Maladie',
};

/** Types proposés au choix de résistance d'une capacité (1ère entrée `damageReduction` à `scopeChoice`), ou null. */
function damageReductionScopeChoice(feature: Feature): ResistibleDamageType[] | null {
  const dr = feature.damageReduction;
  if (!dr) return null;
  const list = Array.isArray(dr) ? dr : [dr];
  return list.find((d) => d.scopeChoice?.length)?.scopeChoice ?? null;
}

/**
 * Configuration du sélecteur d'ÉLÉMENT « à la table » d'une capacité (PER-137/PER-74) : les mêmes
 * ToggleButtons servent deux effets stockés dans `effectInputs` — l'élément RÉSISTÉ d'une RD à
 * `scopeChoice` (Maîtrise des éléments) et l'élément AJOUTÉ aux flèches (`ranged-attack-elemental`,
 * Flèche élémentaire de l'archer arcanique). Renvoie les options + les libellés adaptés, ou null.
 */
function elementalSelectorConfig(
  feature: Feature,
): { options: ResistibleDamageType[]; editLabel: string; readLabel: string } | null {
  const resisted = damageReductionScopeChoice(feature);
  if (resisted) {
    return { options: resisted, editLabel: 'Élément résisté (à choisir à la table)', readLabel: 'Élément résisté' };
  }
  const elemental = feature.effects?.find((e) => e.kind === 'ranged-attack-elemental');
  if (elemental?.kind === 'ranged-attack-elemental') {
    return {
      options: elemental.choices,
      editLabel: 'Élément des flèches (à choisir à la table)',
      readLabel: 'Élément des flèches',
    };
  }
  // PER-74 — aura élémentaire imprégnée dans l'ARME LIÉE (voie de l'arme liée r7, p. 147). Même
  // sélecteur « à la table » : le livre fige l'élément dans la fiction, l'arbitrage propriétaire le
  // laisse échangeable (à la DIFFÉRENCE de la couleur permanente du sang-dragon).
  const aura = feature.effects?.find((e) => e.kind === 'weapon-aura-elemental');
  if (aura?.kind === 'weapon-aura-elemental') {
    return {
      options: aura.choices,
      editLabel: 'Élément de l’aura (à choisir à la table)',
      readLabel: 'Élément de l’aura',
    };
  }
  return null;
}

/**
 * Sélecteur d'ÉLÉMENT « à la table » (RD résistée — Maîtrise des éléments, PER-137 — OU élément
 * ajouté aux flèches — Flèche élémentaire, PER-74). État de jeu (stocké dans
 * `Character.effectInputs[featureId]`, éditable HORS mode édition, comme les interrupteurs). Le
 * sélecteur tient lieu d'activation : « Aucun » = inactif, un élément = actif (échangeable). En
 * lecture seule, affiche l'élément retenu.
 */
function ElementResistanceSelector({
  feature,
  character,
  onSetInput,
}: {
  feature: Feature;
  character: Character;
  onSetInput?: (featureId: string, value: string) => void;
}) {
  const config = elementalSelectorConfig(feature);
  if (!config) return null;
  const { options, editLabel, readLabel } = config;
  const value = character.effectInputs?.[feature.id] ?? '';
  if (!onSetInput) {
    return value ? (
      <Typography variant="caption" component="div" sx={{ mt: 1, fontWeight: 600 }}>
        {readLabel} : {ELEMENT_CHOICE_LABEL[value as ResistibleDamageType] ?? value}
      </Typography>
    ) : null;
  }
  return (
    <Box sx={{ mt: 1 }} onClick={(e) => e.stopPropagation()}>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, fontWeight: 600 }}>
        {editLabel}
      </Typography>
      <ToggleButtonGroup
        exclusive
        size="small"
        value={value}
        onChange={(_, next: string | null) => onSetInput(feature.id, next ?? '')}
        sx={{ flexWrap: 'wrap' }}
      >
        <ToggleButton value="" sx={{ textTransform: 'none' }}>
          Aucun
        </ToggleButton>
        {options.map((el) => (
          <ToggleButton key={el} value={el} sx={{ textTransform: 'none', gap: 0.5 }}>
            <DamageTypeIcon type={el} size={18} />
            {ELEMENT_CHOICE_LABEL[el] ?? el}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
    </Box>
  );
}

/**
 * Panneau d'ACTIVATION des cristaux (voie des cristaux, PER-74, p. 156), rendu une seule fois
 * dans l'en-tête de la voie (comme la réserve partagée d'élixirs) — pas par rang, puisque
 * l'activation porte sur TOUS les cristaux APPRIS (choix figés des rangs 4-8), quel que soit le
 * rang qui les a enseignés. Cristaux appris mais NON activés : boutons visibles mais éteints
 * (aucun effet ne compte tant qu'ils ne sont pas activés, cf. `activeKnownCrystals`). Dépassement
 * de la limite (rang atteint) : avertissement non bloquant (fiche permissive), jamais de blocage.
 */
function CrystalActivationPanel({
  character,
  onToggle,
}: {
  character: Character;
  onToggle?: (crystalId: string, active: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const known = knownCrystals(character);
  if (known.length === 0) return null;
  const active = new Set(activeCrystalIds(character));
  const max = maxActiveCrystals(character);
  const warning = crystalOverCapWarning(character);
  return (
    <Box sx={{ mt: 1 }} onClick={(e) => e.stopPropagation()}>
      {active.size > 0 ? (
        <ChoiceValueBadge label={`Cristaux (${active.size}/${max})`} onClick={() => setOpen(true)} />
      ) : (
        <ChoiceTodoBadge label="Cristaux" onClick={() => setOpen(true)} />
      )}
      <Dialog open={open} onClose={() => setOpen(false)} onClick={(e) => e.stopPropagation()} maxWidth="sm" fullWidth>
        <DialogTitle>
          Cristaux actifs ({active.size}/{max})
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1 }}>
            {known.map((crystal) => (
              <CrystalCard
                key={crystal.id}
                crystal={crystal}
                checked={active.has(crystal.id)}
                disabled={!onToggle}
                onToggle={() => onToggle?.(crystal.id, !active.has(crystal.id))}
              />
            ))}
          </Box>
          {warning && (
            <AppAlert severity="warning" sx={{ mt: 1 }}>
              {warning}
            </AppAlert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Fermer</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

/**
 * Carte d'un cristal, dans la modale d'activation. Reprend le style des cartes de voie/rang
 * à cocher du wizard de création (`PathCard` de `wizard/steps.tsx`) : bordure colorée + fond
 * teinté quand cochée, sinon contour neutre — plutôt que d'en importer une copie couplée aux
 * profils/capacités, on réplique ici le même habillage pour un contenu propre au cristal
 * (couleur/forme + bonus, `effectText` du catalogue).
 */
function CrystalCard({
  crystal,
  checked,
  disabled,
  onToggle,
}: {
  crystal: Crystal;
  checked: boolean;
  disabled?: boolean;
  onToggle: () => void;
}) {
  const color = prestigeCategoryColor('mage');
  return (
    <Box
      onClick={() => {
        if (!disabled) onToggle();
      }}
      sx={{
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
      <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', p: 0.5 }}>
        <Checkbox
          checked={checked}
          disabled={disabled}
          size="small"
          onClick={(e) => e.stopPropagation()}
          onChange={onToggle}
          sx={{ p: 0.5, color, '&.Mui-checked': { color } }}
        />
        <Typography
          variant="subtitle2"
          sx={{ fontWeight: 700, color: checked ? color : 'text.primary', lineHeight: 1.2 }}
        >
          {crystalLabel(crystal)}
        </Typography>
      </Stack>
      <Box sx={{ px: 1, pb: 1 }}>
        <Typography variant="caption" color="text.secondary">
          {crystal.effectText}
        </Typography>
      </Box>
    </Box>
  );
}

/**
 * Effet `finesse-attack` porté par une capacité (Vive attaque du duelliste r4, PER-74), ou `null`.
 */
function finesseAttackEffect(feature: Feature) {
  const e = feature.effects?.find((x) => x.kind === 'finesse-attack');
  return e?.kind === 'finesse-attack' ? e : null;
}

/**
 * Sélecteur d'ATTAQUE EN FINESSE « à la table » (Vive attaque du duelliste r4, PER-74). État de jeu
 * échangeable (stocké dans `Character.effectInputs[featureId]`, éditable HORS mode édition) : la
 * substitution FOR→AGI s'applique SOIT à la touche (`'attack'`) SOIT aux DM (`'damage'`), jamais aux
 * deux (verbatim p. 140). « Aucun » = inactif. Comme le sélecteur d'élément, le choix tient lieu
 * d'activation. Rendu effectif seulement si une arme éligible est en main (le résolveur moteur gate ;
 * ici le sélecteur reste visible pour permettre le réglage même arme rangée).
 */
function FinesseAttackSelector({
  feature,
  character,
  onSetInput,
}: {
  feature: Feature;
  character: Character;
  onSetInput?: (featureId: string, value: string) => void;
}) {
  const effect = finesseAttackEffect(feature);
  if (!effect) return null;
  // Substitution AUTOMATIQUE (Précision du barde, Attaque en finesse du voleur) : aucun arbitrage à
  // rendre — la fiche l'applique d'elle-même et la carte « Attaque au contact » en porte déjà la
  // trace (carac AGI + puce de la capacité dans le détail). Pas de sélecteur.
  if (effect.automatic) return null;
  const modes = effect.modes ?? FINESSE_ATTACK_MODES;
  const value = character.effectInputs?.[feature.id] ?? '';
  const labelFor = (mode: string) =>
    mode === 'attack'
      ? `${effect.ability} en attaque`
      : mode === 'damage'
        ? `${effect.ability} aux DM`
        : 'Aucun';
  if (!onSetInput) {
    return value ? (
      <Typography variant="caption" component="div" sx={{ mt: 1, fontWeight: 600 }}>
        {feature.name} : {labelFor(value)}
      </Typography>
    ) : null;
  }
  return (
    <Box sx={{ mt: 1 }} onClick={(e) => e.stopPropagation()}>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, fontWeight: 600 }}>
        {feature.name} : {effect.ability} au lieu de {effect.replaces} (à choisir à la table)
      </Typography>
      <ToggleButtonGroup
        exclusive
        size="small"
        value={value}
        onChange={(_, next: string | null) => onSetInput(feature.id, next ?? '')}
        sx={{ flexWrap: 'wrap' }}
      >
        <ToggleButton value="" sx={{ textTransform: 'none' }}>
          Aucun
        </ToggleButton>
        {modes.map((mode) => (
          <ToggleButton key={mode} value={mode} sx={{ textTransform: 'none' }}>
            {labelFor(mode)}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
    </Box>
  );
}

/**
 * Clé d'état d'un compteur (PER-119) : la clé PARTAGÉE `sharedKey` si la capacité puise dans
 * une réserve commune (ex. charges explosives), sinon l'id de la capacité (compteur propre).
 */
function usageCounterKey(counter: UsageCounter, feature: Feature): string {
  return counter.sharedKey ?? feature.id;
}

/**
 * Compteur d'usages limités d'une capacité (PER-70 — ex. « Les sept vies du chat »,
 * 6 usages). État de jeu : décompte courant = `usageCounters[clé]`, à défaut le
 * maximum (compteur plein). Le maximum peut être constant ou scalant (rang de voie,
 * PER-119) ; la clé peut être partagée entre capacités d'une même voie (réserve
 * commune, PER-119). Boutons −/+ bornés à [0, max] + un bouton de réinitialisation
 * (remet à plein) ; à 0, badge « épuisé ». En lecture seule (sans `onSet`), valeur seule.
 */
function UsageCounterRow({
  counter,
  feature,
  character,
  onSet,
  onLiftShortRestLock,
}: {
  counter: UsageCounter;
  feature: Feature;
  character: Character;
  onSet?: (counterKey: string, value: number, max: number) => void;
  onLiftShortRestLock?: (featureId: string) => void;
}) {
  const max = usageCounterMaximum(counter, character, feature);
  const key = usageCounterKey(counter, feature);
  // Compteur d'ACCUMULATION (PER-74, Botte mortelle) : « absence = 0 », part de 0 et monte ; sinon
  // DÉCOMPTE classique « absence = plein » (= max).
  const countUp = !!counter.countUp;
  const remaining = Math.max(0, Math.min(max, character.usageCounters?.[key] ?? (countUp ? 0 : max)));
  // Coût d'un usage de CETTE capacité (PER-130) : le pas de décrément/incrément. La Furie du berserk
  // consomme 2 points de rage et n'est utilisable que s'il en reste au moins 2.
  const cost = counter.cost ?? 1;
  const label = counter.label ?? (countUp ? 'Points accumulés' : 'Usages restants');
  const exhausted = !countUp && remaining <= 0;
  // Verrou « une dépense par récupération rapide » (PER-160) : une fois un point dépensé, le décrément
  // est bloqué (avec une note) jusqu'au prochain repos court — indépendamment du total restant.
  const locked = !!counter.oncePerShortRest && (character.usageCounters?.[shortRestLockKey(key)] ?? 0) > 0;
  return (
    <Stack sx={{ mt: 1 }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {label}
          {cost > 1 && (
            <Typography component="span" variant="caption" color="text.secondary">
              {' '}
              (coûte {cost})
            </Typography>
          )}{' '}
          :
        </Typography>
        {onSet && (
          <IconButton
            size="small"
            aria-label={cost > 1 ? `Consommer ${cost}` : 'Décrémenter'}
            disabled={remaining < cost || locked}
            onClick={() => onSet(key, remaining - cost, max)}
          >
            <RemoveIcon fontSize="small" />
          </IconButton>
        )}
        <Typography
          variant="body2"
          sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums', minWidth: 36, textAlign: 'center' }}
        >
          {countUp ? remaining : `${remaining} / ${max}`}
        </Typography>
        {onSet && (
          <IconButton
            size="small"
            aria-label="Incrémenter"
            disabled={remaining >= max}
            onClick={() => onSet(key, Math.min(max, remaining + cost), max)}
          >
            <AddIcon fontSize="small" />
          </IconButton>
        )}
        {onSet && (
          <AppTooltip title={countUp ? 'Réinitialiser à 0' : 'Réinitialiser au maximum'}>
            <span>
              <IconButton
                size="small"
                aria-label="Réinitialiser"
                disabled={countUp ? remaining <= 0 : remaining >= max}
                onClick={() => onSet(key, countUp ? 0 : max, max)}
              >
                <RestartAltIcon fontSize="small" />
              </IconButton>
            </span>
          </AppTooltip>
        )}
        {exhausted && <Chip label="épuisé" size="small" color="error" variant="outlined" />}
      </Stack>
      {locked && (
        <Stack direction="row" spacing={0.5} sx={{ mt: 0.25, alignItems: 'center', flexWrap: 'wrap' }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
            Une récupération rapide (repos court) est nécessaire avant un nouvel usage.
          </Typography>
          {onLiftShortRestLock && (
            <AppTooltip
              title={
                <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'flex-start' }}>
                  <WarningAmberOutlinedIcon fontSize="small" sx={{ mt: '1px', color: 'warning.light' }} />
                  <Box>
                    <Box component="span" sx={{ fontWeight: 700, display: 'block' }}>
                      Hors règles standard
                    </Box>
                    Débloque cette capacité sans passer par un repos court. Réservé aux joueurs qui
                    tiennent toute leur fiche dans l’application ; normalement, c’est une récupération
                    rapide (repos court) qui lève ce verrou.
                  </Box>
                </Box>
              }
              maxWidth={280}
            >
              {/* Révélé seulement au survol du bloc / de la modale (classe `lift-lock-reveal` ciblée par
                  le conteneur) : masqué par défaut pour ne pas suggérer que c'est la méthode normale. */}
              <IconButton
                className="lift-lock-reveal"
                size="small"
                aria-label="Débloquer sans repos court (hors règles standard)"
                color="warning"
                onClick={() => onLiftShortRestLock(feature.id)}
                sx={{
                  opacity: 0,
                  transition: 'opacity 0.15s ease',
                  '&:focus-visible': { opacity: 1 },
                  // Appareils tactiles (pas de survol) : toujours visible, sinon inatteignable.
                  '@media (hover: none)': { opacity: 1 },
                }}
              >
                <LockOpenIcon fontSize="small" />
              </IconButton>
            </AppTooltip>
          )}
        </Stack>
      )}
    </Stack>
  );
}

/** Compteur d'usages d'une capacité (PER-70) — rend la ligne −/+ du compteur principal. */
function UsageCounterField({
  feature,
  character,
  onSet,
  onLiftShortRestLock,
  counterOverride,
}: {
  feature: Feature;
  character: Character;
  onSet?: (counterKey: string, value: number, max: number) => void;
  onLiftShortRestLock?: (featureId: string) => void;
  /** Compteur synthétique injecté (PER-146), prioritaire sur `feature.usageCounter`. Cf. `CompactUsageIndicator`. */
  counterOverride?: UsageCounter;
}) {
  const counter = counterOverride ?? feature.usageCounter;
  if (!counter) return null;
  return (
    <UsageCounterRow
      counter={counter}
      feature={feature}
      character={character}
      onSet={onSet}
      onLiftShortRestLock={onLiftShortRestLock}
    />
  );
}

/**
 * Surcoût en mana CROISSANT (PER-162, ex. Foudres divines / foi-r5) : le sort coûte +`step` PM par
 * lancement jusqu'au repos court. Rend le surcoût courant, un bouton « Lancer (+PM) » qui l'incrémente
 * et une remise à zéro. Modèle ISOLÉ des compteurs « usages restants » (sémantique inverse) mais
 * réutilise le même handler `onSet` (branché sur `setUsageCounterValue`, qui détecte l'escalade).
 */
function EscalatingManaCostRow({
  feature,
  character,
  onSet,
}: {
  feature: Feature;
  character: Character;
  onSet?: (counterKey: string, value: number, max: number) => void;
}) {
  const esc = feature.escalatingManaCost;
  if (!esc) return null;
  const step = esc.step ?? 1;
  const casts = Math.max(0, character.usageCounters?.[feature.id] ?? 0);
  const surcharge = escalatingManaSurcharge(character, feature);
  return (
    <Stack sx={{ mt: 1 }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          Surcoût en mana :
        </Typography>
        <Typography
          variant="body2"
          sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums', minWidth: 44, textAlign: 'center' }}
        >
          +{surcharge} PM
        </Typography>
        {onSet && (
          <Button
            size="small"
            variant="outlined"
            startIcon={<AddIcon fontSize="small" />}
            onClick={() => onSet(feature.id, casts + 1, 0)}
          >
            Lancer (+{step} PM)
          </Button>
        )}
        {onSet && (
          <AppTooltip title="Remettre le surcoût à 0">
            <span>
              <IconButton
                size="small"
                aria-label="Remettre le surcoût à 0"
                disabled={casts <= 0}
                onClick={() => onSet(feature.id, 0, 0)}
              >
                <RestartAltIcon fontSize="small" />
              </IconButton>
            </span>
          </AppTooltip>
        )}
      </Stack>
      <Typography variant="caption" color="text.secondary" sx={{ mt: 0.25, fontStyle: 'italic' }}>
        +{step} PM par lancement ; remis à 0 à la récupération rapide (repos court).
      </Typography>
    </Stack>
  );
}

/**
 * Indicateur COMPACT d'un compteur d'usages (vue colonne) : une rangée de pastilles
 * — pleines pour les usages restants, creuses pour les usages consommés — avec le
 * décompte « N/max » et une info-bulle. Lecture seule (l'édition −/+ se fait dans la
 * modale de détail). Au-delà de ~8 usages, on retombe sur un simple « N/max » pour
 * ne pas surcharger le petit bloc.
 */
function CompactUsageIndicator({
  feature,
  character,
  counterOverride,
}: {
  feature: Feature;
  character: Character;
  /**
   * Compteur SYNTHÉTIQUE injecté à l'affichage (PER-146) — non déclaré sur la `Feature` : le sort
   * emprunté du gnome (« Don étrange ») n'a de compteur 1/jour que tant qu'une armure est portée.
   * Prioritaire sur `feature.usageCounter`. Absent → compteur natif de la capacité.
   */
  counterOverride?: UsageCounter;
}) {
  const counter = counterOverride ?? feature.usageCounter;
  if (!counter) return null;
  const max = usageCounterMaximum(counter, character, feature);
  const key = usageCounterKey(counter, feature);
  // Compteur d'ACCUMULATION (PER-74, Botte mortelle) : « absence = 0 », on affiche le NOMBRE nu (pas de
  // pastilles ni de « /max » : compter jusqu'à un plafond n'aurait aucun sens pour des points gagnés).
  if (counter.countUp) {
    const current = Math.max(0, Math.min(max, character.usageCounters?.[key] ?? 0));
    const label = counter.label ?? 'Points accumulés';
    return (
      <Typography variant="caption" sx={{ mt: 0.5, display: 'block', fontWeight: 700, color: 'text.secondary' }}>
        {label} : {current}
      </Typography>
    );
  }
  const remaining = Math.max(0, Math.min(max, character.usageCounters?.[key] ?? max));
  const label = counter.label ?? 'Usages restants';
  return (
    <AppTooltip title={`${label} : ${remaining} / ${max}`}>
      <Box
        sx={{
          mt: 0.5,
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
          flexWrap: 'wrap',
        }}
      >
        {max <= 8 &&
          Array.from({ length: max }).map((_, i) => (
            <Box
              key={i}
              sx={{
                width: 9,
                height: 9,
                borderRadius: '50%',
                border: 1,
                borderColor: (theme) =>
                  i < remaining ? theme.palette.success.main : alpha(theme.palette.text.disabled, 0.6),
                bgcolor: (theme) =>
                  i < remaining ? theme.palette.success.main : 'transparent',
              }}
            />
          ))}
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
 * Indicateur COMPACT des états préjudiciables encore disponibles (vue colonne, Botte secrète, PER-206) :
 * une pastille par état — pleine s'il est encore infligeable ce combat, creuse s'il est déjà infligé —
 * avec le décompte « N/total » et une info-bulle. Lecture seule (les boutons-bascule vivent dans la
 * modale de détail). Miroir de `CompactUsageIndicator` pour un `usageCounter`.
 */
function CompactInflictedStatesIndicator({
  feature,
  character,
}: {
  feature: Feature;
  character: Character;
}) {
  const spec = feature.inflictableStates;
  if (!spec || spec.stateIds.length === 0) return null;
  const total = spec.stateIds.length;
  const available = spec.stateIds.filter(
    (stateId) => (character.usageCounters?.[inflictedStateKey(feature.id, stateId)] ?? 1) > 0,
  ).length;
  return (
    <AppTooltip title={`${spec.label ?? 'États infligés ce combat'} : ${available} / ${total} encore disponibles`}>
      <Box sx={{ mt: 0.5, width: '100%', display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
        {Array.from({ length: total }).map((_, i) => (
          <Box
            key={i}
            sx={{
              width: 9,
              height: 9,
              borderRadius: '50%',
              border: 1,
              borderColor: (theme) =>
                i < available ? theme.palette.success.main : alpha(theme.palette.text.disabled, 0.6),
              bgcolor: (theme) => (i < available ? theme.palette.success.main : 'transparent'),
            }}
          />
        ))}
        <Typography
          variant="caption"
          sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: 'text.secondary' }}
        >
          {available}/{total}
        </Typography>
      </Box>
    </AppTooltip>
  );
}

/** Réserve partagée d'une voie, prête à afficher en barre d'en-tête (pool d'élixirs). */
interface PathResourcePoolState {
  key: string;
  current: number;
  max: number;
  label: string;
  cost: number;
}

/**
 * Réserve partagée (`poolInPathHeader`) d'une voie : la PREMIÈRE capacité du groupe dont le
 * compteur la demande porte la déclaration ; toutes partagent la même `sharedKey`, donc une
 * seule réserve par voie. `null` si la voie n'en a pas (ou hors contexte personnage).
 */
function pathResourcePool(
  features: Feature[],
  character: Character | undefined,
): PathResourcePoolState | null {
  if (!character) return null;
  const carrier = features.find((f) => f.usageCounter?.poolInPathHeader);
  if (!carrier) return null;
  const counter = carrier.usageCounter!;
  const key = usageCounterKey(counter, carrier);
  const max = usageCounterMaximum(counter, character, carrier);
  const current = Math.max(0, Math.min(max, character.usageCounters?.[key] ?? max));
  return { key, current, max, label: counter.label ?? 'Réserve', cost: counter.cost ?? 1 };
}

/**
 * Barre COMPACTE d'une réserve partagée, rendue sous l'en-tête d'une voie (pool d'élixirs, p. 98) :
 * une piste fine remplie au prorata + le décompte « restant/max » à droite. Le forgesort prépare
 * toujours 100 % de ses doses → cette réserve se suit ici (au niveau de la voie), pas en jauge
 * d'état ni par carte. Une petite réinitialisation apparaît quand la réserve est entamée (en
 * attendant le bouton « Nouvelle journée ») ; masquée en lecture seule (`onReset` absent).
 */
function PathResourcePoolBar({
  pool,
  color,
  onReset,
}: {
  pool: PathResourcePoolState;
  color?: string;
  onReset?: () => void;
}) {
  const { current, max, label } = pool;
  const ratio = max > 0 ? current / max : 0;
  return (
    <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', mt: 0.5 }}>
      <AppTooltip title={`${label} : ${current} / ${max}`}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexGrow: 1, minWidth: 0, cursor: 'help' }}>
          <Box
            sx={{
              flexGrow: 1,
              height: 6,
              borderRadius: 3,
              overflow: 'hidden',
              bgcolor: (theme) => alpha(color ?? theme.palette.text.primary, 0.15),
            }}
          >
            <Box
              sx={{
                width: `${ratio * 100}%`,
                height: '100%',
                borderRadius: 3,
                bgcolor: (theme) => color ?? theme.palette.info.main,
                transition: 'width 0.2s',
              }}
            />
          </Box>
          <Typography
            variant="caption"
            sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: 'text.secondary', flexShrink: 0 }}
          >
            {current}/{max}
          </Typography>
        </Box>
      </AppTooltip>
      {onReset && current < max && (
        <AppTooltip title="Refaire le plein d'élixirs (réserve du jour)">
          <IconButton size="small" aria-label="Refaire le plein d'élixirs" onClick={onReset} sx={{ p: 0.25 }}>
            <RestartAltIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </AppTooltip>
      )}
    </Stack>
  );
}

/**
 * Bouton « Créer l'élixir » (forgesort, p. 98) : produit une dose en consommant la réserve
 * partagée d'un cran (`cost`, porté par la capacité HÔTE `feature`) ET en matérialisant l'élixir
 * dans l'équipement (via `onCreate`). `elixirName` nomme la dose : nom de la capacité pour les
 * rangs 1-3 (recette unique), nom du SORT choisi pour les Élixirs mineurs/majeurs (r4/r5, où le
 * bouton vit dans chaque bloc de sort reproduit). `showRemaining` rappelle « réserve : N/max » à
 * côté (utile en modale ; masqué dans les accordéons compacts). Désactivé si la réserve est
 * insuffisante. Lecture seule (`onCreate` absent) → rien.
 */
function CreateElixirButton({
  feature,
  character,
  onCreate,
  elixirName,
  buttonLabel = 'Créer l’élixir',
  showRemaining = true,
}: {
  feature: Feature;
  character: Character;
  onCreate?: (counterKey: string, cost: number, max: number, elixirName: string) => void;
  elixirName?: string;
  buttonLabel?: string;
  showRemaining?: boolean;
}) {
  const counter = feature.usageCounter;
  if (!counter || !onCreate) return null;
  const max = usageCounterMaximum(counter, character, feature);
  const key = usageCounterKey(counter, feature);
  const remaining = Math.max(0, Math.min(max, character.usageCounters?.[key] ?? max));
  const cost = counter.cost ?? 1;
  const label = counter.label ?? 'Réserve';
  const name = elixirName ?? feature.name;
  const enough = remaining >= cost;
  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', rowGap: 0.5 }}>
      <Button
        size="small"
        variant="outlined"
        startIcon={<ScienceOutlinedIcon />}
        disabled={!enough}
        // stopPropagation : le bouton peut vivre dans le résumé cliquable d'un accordéon (r4/r5) —
        // le clic « Créer » ne doit pas déplier/replier le bloc du sort.
        onClick={(e) => {
          e.stopPropagation();
          onCreate(key, cost, max, name);
        }}
      >
        {buttonLabel}
        {cost > 1 ? ` (−${cost})` : ''}
      </Button>
      {showRemaining && (
        <Typography variant="caption" color="text.secondary" sx={{ fontVariantNumeric: 'tabular-nums' }}>
          {label} : {remaining}/{max}
          {!enough && (remaining <= 0 ? ' — réserve épuisée' : ' — réserve insuffisante')}
        </Typography>
      )}
    </Stack>
  );
}

/**
 * Nombre de voies d'un profil (type 'class', `classIds` inclut `classId`) où le
 * personnage a atteint au moins `rank`. Pilote les scalings cross-voie : Transe de
 * guérison (meditation-r2, moine au rang 4) et Récupération majeure (soins-r3, prêtre
 * au rang 5) sur le nombre de dés ; Marteau de la foi (guerre-sainte-r4, prêtre au
 * rang 4) sur un bonus plat de DM. `excludePathId` retire une voie du compte, pour
 * les règles « dans une AUTRE voie » (Marteau exclut sa propre voie).
 */
function countClassPathsAtRank(
  character: Character,
  classId: string,
  rank: number,
  excludePathId?: string,
): number {
  const pathMaxRank = new Map<string, number>();
  for (const id of character.featureIds) {
    const f = featureById.get(id);
    if (!f || f.pathId === excludePathId) continue;
    const p = pathById.get(f.pathId);
    if (!p || p.type !== 'class' || !p.classIds.includes(classId)) continue;
    pathMaxRank.set(f.pathId, Math.max(pathMaxRank.get(f.pathId) ?? 0, f.rank));
  }
  return [...pathMaxRank.values()].filter((r) => r >= rank).length;
}

/**
 * Contrôle d'invocation d'un compagnon MULTI-INSTANCES (zombie, PER-235), rendu sous la mini-fiche
 * de créature de la carte du rang. Badge CUSTOM bleu « Invoquer » (convention projet : pas de `Chip`
 * MUI) + compteur « instances / limite ». Le badge est désactivé quand la limite est atteinte (ou en
 * lecture seule, sans `onSummon`). Chaque clic crée un exemplaire (un bloc de compagnon apparaît dans
 * la section « Compagnons » avec sa propre barre de vie). `null` si le profil n'est pas multi-instances.
 */
function SummonInstanceBadge({
  feature,
  profile,
  character,
  onSummon,
}: {
  feature: Feature;
  profile: CreatureProfile;
  character: Character;
  onSummon?: (featureId: string) => void;
}) {
  if (!profile.instances) return null;
  const count = character.companionInstances?.[feature.id]?.length ?? 0;
  const limit = resolveCompanionInstanceLimit(profile, character);
  const atLimit = count >= limit;
  const disabled = !onSummon || atLimit;
  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mt: 1, flexWrap: 'wrap', rowGap: 0.5 }}>
      <AppTooltip
        title={
          atLimit
            ? `Limite atteinte (${limit}) — un zombie doit tomber avant d'en invoquer un autre`
            : 'Invoquer un nouvel exemplaire (PV suivis à part)'
        }
      >
        <Box
          component="button"
          type="button"
          disabled={disabled}
          onClick={(e) => {
            e.stopPropagation();
            onSummon?.(feature.id);
          }}
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.4,
            px: 1,
            py: 0.4,
            borderRadius: 1,
            border: 1,
            borderColor: 'info.main',
            color: 'info.main',
            bgcolor: (t) => alpha(t.palette.info.main, 0.12),
            fontWeight: 700,
            fontSize: '0.8rem',
            lineHeight: 1.2,
            cursor: disabled ? 'default' : 'pointer',
            opacity: disabled ? 0.45 : 1,
            transition: 'background-color 0.15s',
            '&:hover': disabled ? undefined : { bgcolor: (t) => alpha(t.palette.info.main, 0.22) },
          }}
        >
          <AddIcon sx={{ fontSize: 16 }} />
          Invoquer
        </Box>
      </AppTooltip>
      <Typography variant="caption" color="text.secondary" sx={{ fontVariantNumeric: 'tabular-nums' }}>
        {count} / {limit}
      </Typography>
    </Stack>
  );
}

/** Une voie et ses capacités acquises, chaque capacité dépliable (texte complet). */
function PathBlock({
  group,
  classId,
  onRemove,
  manualFeatureIds,
  abilities,
  level,
  masterDerived,
  compact = false,
  gridColumn,
  retainedFeature,
  retainedPathName,
  character,
  onChoiceChange,
  onEnableFeatureEditing,
  onToggleEffect,
  sessionStatusIds,
  onSetEffectInput,
  onSetUsageCounter,
  onLiftShortRestLock,
  onCreateElixir,
  onToggleCrystalActive,
  onSummonCompanionInstance,
  onPoisonUpdate,
  onWeaponModificationUpdate,
  disabledIds,
  disabledReasons,
  armorRestrictedReasons,
  borrowedArmorUsageCounters,
  replacements,
  concentration = false,
  fabulousTarget,
  testBonuses,
}: {
  group: FeatureGroup;
  classId: string;
  onRemove?: (featureId: string) => void;
  /** Capacités ajoutées manuellement (épingle). */
  manualFeatureIds?: Set<string>;
  /** Contexte du personnage pour le rendu enrichi (PER-64). */
  abilities?: Abilities;
  level?: number;
  /** Stats dérivées du maître (mini-fiches de compagnons : Init./attaque recopiées). */
  masterDerived?: DerivedStats;
  /** Vue colonne : masque le rang de chaque capacité, le résume dans l'en-tête. */
  compact?: boolean;
  /** Vue colonne : index de colonne (1-based) dans la grille subgrid. */
  gridColumn?: number;
  /** Voie du mage : capacité de peuple de rang 1 conservée, fusionnée au rang 1. */
  retainedFeature?: Feature;
  /** Nom de la voie de peuple dont la capacité de rang 1 est conservée. */
  retainedPathName?: string;
  /** Personnage : nécessaire pour afficher/résoudre les choix (PER-66/68). */
  character?: Character;
  /** Édition d'un choix porté par une capacité (fiche permissive). */
  onChoiceChange?: (featureId: string, index: number, value: FeatureChoiceSelection) => void;
  /** Passe le bloc « Voies » en édition (clic sur une puce de choix hors édition → édition + modale). */
  onEnableFeatureEditing?: () => void;
  /** Bascule d'un interrupteur d'effet conditionnel (fiche permissive, PER-67). */
  onToggleEffect?: (featureId: string, index: number, active: boolean) => void;
  /** États posés par le MJ en séance : grisent l'interrupteur du buff correspondant (PER-314). */
  sessionStatusIds?: readonly string[];
  /** Saisie libre corrélée à une capacité (animal de Forme animale, PER-70). */
  onSetEffectInput?: (featureId: string, value: string) => void;
  /** Décompte d'une capacité à usages limités (Les sept vies du chat, PER-70). */
  onSetUsageCounter?: (counterKey: string, value: number, max: number) => void;
  /** (Dés)active un cristal APPRIS (voie des cristaux, PER-74, p. 156). État de jeu, hors édition. */
  onToggleCrystalActive?: (crystalId: string, active: boolean) => void;
  /** Lève le verrou « repos court requis » d'une capacité sans forcer un repos (PER-160/161). */
  onLiftShortRestLock?: (featureId: string) => void;
  /** Produit un élixir : consomme la réserve + matérialise la dose dans l'équipement (forgesort). */
  onCreateElixir?: (counterKey: string, cost: number, max: number, elixirName: string) => void;
  /** Invoque un exemplaire d'un compagnon multi-instances (zombie, PER-235) — badge bleu « Invoquer ». */
  onSummonCompanionInstance?: (featureId: string) => void;
  /** Applique un patch d'état de jeu « poison appliqué aux armes » (maître des poisons, PER-74). */
  onPoisonUpdate?: (patch: Partial<Character>) => void;
  /** Applique un patch « armes bricolées » (chargeur / second canon, PER-284). */
  onWeaponModificationUpdate?: (patch: Partial<Character>) => void;
  /**
   * Capacités désactivées par exclusion mutuelle (un interrupteur actif les grise) :
   * rendues semi-transparentes + grisées, interrupteur non-interactif, détail conservé.
   */
  disabledIds?: Set<string>;
  /** Raison du grisage par capacité (message « pourquoi désactivé » : exclusion / remplacement). */
  disabledReasons?: Map<string, DisabledFeatureReason>;
  /**
   * Capacités dont l'USAGE est gêné par l'armure portée (restriction fine par profil d'origine,
   * PER-86), indexées par id → message d'avertissement. Rendu : rang DÉSATURÉ + légèrement
   * transparent + infobulle (vue colonne) / notice dans le bloc déplié (vue liste). À DISTINGUER
   * du grisage d'exclusion mutuelle (`disabledIds`) : ici AUCUN interrupteur n'est coupé, la
   * capacité reste pleinement interactive — c'est un simple signal visuel « inutilisable en armure ».
   */
  armorRestrictedReasons?: Map<string, string>;
  /**
   * PER-146 — compteurs d'usage SYNTHÉTIQUES à afficher sur la carte d'une capacité HÔTE quand une
   * armure est portée, indexés par id de la capacité hôte. Aujourd'hui : « Don étrange » du gnome
   * (gnome-r1 → 1 usage/jour sur son sort d'ensorceleur emprunté, p. 53). Ces compteurs ne sont PAS
   * déclarés sur la `Feature` (ils dépendent du port effectif d'armure) : ils sont injectés au rendu
   * du compteur (compact + modale + liste). Absent / sans entrée → aucun compteur synthétique.
   */
  borrowedArmorUsageCounters?: Map<string, UsageCounter>;
  /**
   * Capacités occupant un slot par REMPLACEMENT (capacité divine du prêtre spécialiste,
   * p. 122) : rendues avec un cadre fantôme du slot natif + bordure couleur d'origine
   * + badge. Indexé par id de la capacité remplaçante.
   */
  replacements?: Map<string, SlotReplacement>;
  /** Concentration accrue active (p. 228) : coût réduit + (A)→(L) pour les sorts éligibles. */
  concentration?: boolean;
  /**
   * PER-74 — cible de la Capacité fabuleuse (spécialiste r5) résolue au top-level (`fabulousCapacityTarget`).
   * Quand la capacité rendue est cette cible : `promote` → son marqueur (L) devient (A) ; `concentrate`
   * → le sort (A) affiche le coût réduit de concentration (−2 PM) EN PERMANENCE, sans passer en (L).
   */
  fabulousTarget?: { featureId: string; mode: 'promote' | 'concentrate' } | null;
  /** Bonus de compétence par domaine — pour signaler une capacité empruntée dont le bonus est dominé (PER-73). */
  testBonuses?: TestDomainBonus[];
}) {
  const { path, features } = group;
  // PER-324 — décalage de cran du dé évolutif (r3) porté par le personnage, alimentant `FeatureText`
  // (0 = aucun décalage / hors personnage).
  const scalingTierBonus = character ? scalingDieTierBonus(character) : 0;
  // PER-74 — props de marqueurs/mana à injecter pour la capacité cible de la Capacité fabuleuse (r5).
  // `promote` : le (L) devient (A) (halo). `concentrate` : le sort (A) garde son marqueur mais son coût
  // est réduit de 2 PM EN PERMANENCE (concentration forcée sur la goutte, JAMAIS sur les marqueurs —
  // sinon le sort passerait en (L), ce que r5 interdit précisément). Cumulable avec l'état global.
  const fabulousFor = (feature: Feature) => {
    const hit = fabulousTarget?.featureId === feature.id ? fabulousTarget : null;
    return {
      promoteToAttack: hit?.mode === 'promote',
      // Marqueurs : concentration globale seulement (jamais forcée par r5 — le sort r5 reste en (A)).
      markerConcentration: concentration,
      // Goutte de PM : concentration globale OU concentration permanente conférée par r5.
      manaConcentration: concentration || hit?.mode === 'concentrate',
    };
  };
  // Rang ATTEINT dans la voie = plus haut rang acquis parmi ses capacités. Sert à
  // résoudre le terme « rang » des textes enrichis (« son rang » = rang de la voie
  // courante, dynamique), partagé par toutes les capacités du bloc.
  const pathRank = features.reduce((max, f) => Math.max(max, f.rank), 0);
  // Réserve partagée « à préparation systématique » de la voie (pool d'élixirs, p. 98) : affichée en
  // barre sous l'en-tête + bouton « Créer l'élixir » par carte, au lieu d'une jauge d'état / d'un
  // compteur par carte. `null` pour les voies sans réserve de ce type.
  const pool = pathResourcePool(features, character);
  // Contexte de production d'élixir d'une capacité à pool (r1-r5) : fourni quand le callback existe.
  // Sert au(x) bouton(s) « Créer l'élixir » — un seul (rangs 1-3, recette unique) ou un par sort
  // reproduit (r4/r5, où il faut préciser QUELLE recette est produite).
  const elixirCreation = (feature: Feature): ElixirCreation | undefined =>
    feature.usageCounter?.poolInPathHeader && onCreateElixir && character
      ? { hostFeature: feature, character, onCreate: onCreateElixir }
      : undefined;
  // Bonus de test d'une capacité (typiquement EMPRUNTÉE) qui sont DOMINÉS (ne se cumulent pas, p. 203) :
  // pour les afficher barrés sur sa carte avec la capacité qui les domine (PER-73). Vide si aucun.
  const dominatedTestBonusesFor = (
    featureId: string,
  ): { domain: string; value: number; dominatedBy: DominatedTestSource['dominatedBy'] }[] =>
    (testBonuses ?? []).flatMap((b) =>
      (b.dominated ?? [])
        .filter((d) => d.source.featureId === featureId)
        .map((d) => ({ domain: b.domain, value: d.source.value, dominatedBy: d.dominatedBy })),
    );
  // Nom DÉCLINÉ par élément draconique (PER-74). Récupéré ici, une seule fois : les titres de cartes
  // sont rendus dans un `.map` sur les capacités, où un hook par capacité serait illégal.
  const declinedName = useFeatureNameDecliner();
  // Scalings CROSS-VOIE sur le nombre de dés : on passe le COMPTE de voies du profil
  // au rang seuil comme « rang » à la formule, ce qui pilote ses paliers `|C@R` (le
  // terme `rang` n'est pas utilisé dans ces richText). Cf. `countClassPathsAtRank`.
  //  - Transe de guérison (meditation-r2) : +1d4° par voie de moine au rang 4 ;
  //  - Récupération majeure (soins-r3)    : +1d4° par voie de prêtre au rang 5 ;
  //  - Attaque sournoise (assassin-r2)    : +1d4° par voie de voleur au rang 4 (la voie
  //    hôte comprise — le texte dit « une voie de voleur », sans exclusion).
  const crossPathDieCount = (feature: Feature): number | undefined => {
    if (!character) return undefined;
    if (feature.id === 'meditation-r2') return countClassPathsAtRank(character, 'moine', 4);
    if (feature.id === 'soins-r3') return countClassPathsAtRank(character, 'pretre', 5);
    if (feature.id === 'assassin-r2') return countClassPathsAtRank(character, 'voleur', 4);
    return undefined;
  };
  const effectiveRank = (feature: Feature) => crossPathDieCount(feature) ?? pathRank;
  // Bonus PLAT cross-voie injecté au terme `paliers` d'une formule : Marteau de la
  // foi (guerre-sainte-r4) gagne +1 DM par AUTRE voie de prêtre au rang 4 (sa propre
  // voie exclue). Le terme est omis de l'encadré quand le compte est 0.
  const milestoneBonusFor = (feature: Feature): number | undefined => {
    if (!character) return undefined;
    // Marteau de la foi (guerre-sainte-r4) : +1 DM par AUTRE voie de prêtre au rang 4 (voie hôte exclue).
    if (feature.id === 'guerre-sainte-r4') return countClassPathsAtRank(character, 'pretre', 4, feature.pathId);
    // Arme à répétition (artilleur-r2, PER-118) : +1 projectile au chargeur par voie d'arquebusier au rang 3
    // (voie hôte COMPRISE — le texte ne l'exclut pas), injecté au terme `paliers` de la quantité du chargeur.
    if (feature.id === 'artilleur-r2') return countClassPathsAtRank(character, 'arquebusier', 3);
    // Morsure de la forge (metal-r1, PER-92) : +1 DM de feu par voie de forgesort au rang 4
    // (voie hôte COMPRISE — le texte ne l'exclut pas), injecté au terme `paliers` du DM de feu.
    if (feature.id === 'metal-r1') return countClassPathsAtRank(character, 'forgesort', 4);
    // Projectile de mana (magie-des-arcanes-r1, PER-92) : +1 DM par voie de magicien au rang 4
    // (voie hôte comprise), PLAFONNÉ à la valeur d'INT. Le plafond est replié ici dans la valeur
    // injectée (min(compte, INT)) ; la phrase de montée l'exprime via le token carac [INT].
    if (feature.id === 'magie-des-arcanes-r1')
      return abilities
        ? Math.min(countClassPathsAtRank(character, 'magicien', 4), abilities.INT)
        : undefined;
    return undefined;
  };
  // Profil dont la voie est issue : le profil principal si la voie lui appartient
  // (cas courant), sinon le profil d'origine de la voie (hybridation). Sert à la
  // teinte ET à l'icône, pour distinguer les voies hybrides du profil principal.
  const ownerClassId =
    path?.type === 'class'
      ? path.classIds.includes(classId)
        ? classId
        : path.classIds[0]
      : null;
  // Voie du mage (`type: 'mage'`) : identité dédiée (indigo arcane + icône de chapeau), PER-73.
  const isMagePath = path?.type === 'mage';
  const isPrestigePath = path?.type === 'prestige';
  const color = ownerClassId ? classColor(ownerClassId) : isMagePath ? MAGE_PATH_COLOR : null;
  // Teinte de la FAMILLE de prestige (PER-74) : vert/rouge/bleu/violet par famille. `undefined` pour
  // les GÉNÉRIQUES → on retombe sur l'habillage OR historique exactement tuné par le proprio (liseré
  // `#fff2c2→#968f74`, reflet `#f5e7a0`, étoile neutre), qu'on ne modifie pas.
  const prestigeTint =
    path?.type === 'prestige' && path.category !== 'generic'
      ? prestigeCategoryColor(path.category)
      : undefined;
  // PER-74 — habillage « précieux » des cartes de rang de prestige : anneau en dégradé STATIQUE
  // (sans animation — trop lourde par carte en vue liste) + fond ASSOMBRI (reste lisible sous le texte
  // clair du thème sombre) avec un très léger reflet TEINTÉ de la famille. `null` pour les autres voies.
  const prestigeCardSx = isPrestigePath
    ? {
        ...prestigeStaticBorderSx(1, 'inherit', prestigeTint),
        border: 0,
        // Fond en dégradé SUIVANT l'angle de la bordure (45°) : reflet PEU opaque en BAS À GAUCHE, vers
        // un gris clair TRÈS peu opaque en HAUT À DROITE (retour proprio). Faible opacité → le fond
        // sombre de la fiche transparaît, la carte reste lisible. Teinté de la famille, or par défaut.
        background: `linear-gradient(45deg, ${alpha(prestigeTint ? lighten(prestigeTint, 0.55) : '#f5e7a0', 0.2)} 0%, ${alpha('#d0d0d0', 0.08)} 85%)`,
      }
    : null;
  // Voie de peuple : pas de teinte de profil, mais une icône neutre pour rappeler que c'est une voie
  // au même titre que les autres. La voie du mage réutilise le jeu d'icônes de peuple (clé `mage`,
  // elle occupe l'emplacement peuple) ; la voie de PRESTIGE, faute d'icône de peuple/profil, reçoit
  // une étoile générique neutre (clé `prestige` du même jeu d'icônes, PER-74).
  const ancestryId = path?.type === 'ancestry' ? path.id : null;
  const iconAncestryId = ancestryId ?? (isMagePath ? 'mage' : isPrestigePath ? 'prestige' : null);
  // Couleur des hexagones de marqueur d'action (A/L/G/M) : profil pour une voie de profil ; GRIS
  // FONCÉ neutre pour une voie de PEUPLE (sans quoi le bleu mana par défaut évoquerait un profil de
  // mage) ; indigo arcane pour la voie du mage ; bleu mana par défaut conservé pour le prestige
  // (`markerColor` absent → `info.main` dans `FeatureMarkerHexes`).
  const markerColor = color ?? (ancestryId ? ANCESTRY_MARKER_COLOR : undefined);
  // Progression dans la voie : capacités acquises sur le total de la voie.
  const total = path?.featureIds.length;
  // Vue colonne : la capacité ouverte dans la modale de détail (null = fermée).
  const [openFeature, setOpenFeature] = useState<Feature | null>(null);
  // Vue colonne : capacité dont on édite le choix dans une modale dédiée (le bloc
  // est trop petit pour héberger un sélecteur — la puce du choix l'ouvre, PER-68).
  const [choiceEditFeature, setChoiceEditFeature] = useState<Feature | null>(null);

  // Édition d'un choix POSSIBLE ⟺ on peut déjà écrire (`onChoiceChange`, mode édition actif) OU on
  // peut demander l'activation de l'édition (`onEnableFeatureEditing`, fiche du propriétaire hors
  // édition). Faux uniquement en lecture seule stricte (fiche d'autrui).
  const canEditChoices = !!onChoiceChange || !!onEnableFeatureEditing;
  // Ouvre la modale d'édition d'un choix depuis sa puce. Si l'on n'est pas encore en édition, on
  // bascule d'abord le bloc « Voies » en édition (React batche les deux setState : la modale s'ouvre
  // avec l'éditeur déjà actif). Les choix de construction sont trop importants pour n'être joignables
  // qu'après un détour par le crayon.
  const requestChoiceEdit = (feature: Feature) => {
    onEnableFeatureEditing?.();
    setChoiceEditFeature(feature);
  };

  // Choix portés par une capacité (PER-66/68), en LECTURE SEULE : affichés sous
  // la description (modale / bloc déployé) et en compact dans le bloc colonne.
  // L'édition passe toujours par un sélecteur dédié (accordéon en vue liste,
  // modale crayon en vue colonne), jamais inline dans le petit bloc.
  const renderChoiceDisplay = (
    feature: Feature,
    opts: { compact?: boolean; onEdit?: () => void } = {},
  ) => {
    if (!character || featureChoiceDefs(feature.id).length === 0) return null;
    return (
      <FeatureChoiceField
        character={character}
        featureId={feature.id}
        mode="display"
        compact={opts.compact}
        onEditRequest={opts.onEdit}
        // La valeur DÉJÀ retenue n'est cliquable qu'en mode édition (`onChoiceChange`) ; la
        // puce « Choisir », elle, reste joignable hors édition (cf. `opts.onEdit`).
        editing={!!onChoiceChange}
      />
    );
  };

  /** Sélecteur éditable des choix (mode édition uniquement). */
  const renderChoiceEditor = (feature: Feature) =>
    character && onChoiceChange ? (
      <FeatureChoiceField
        character={character}
        featureId={feature.id}
        mode="edit"
        onChange={onChoiceChange}
      />
    ) : null;

  /** Vrai si la capacité porte un choix résoluble MAINTENANT (pour les affordances
   *  d'UI) : on masque le crayon/accordéon tant qu'aucun choix n'est actionnable
   *  (ex. choix répétable sans palier atteint), pour ne pas ouvrir un éditeur vide. */
  const hasChoices = (feature: Feature) =>
    !!character && hasActionableChoice(character, feature.id);

  /** Vrai si la capacité porte un effet conditionnel/temporaire (PER-67). */
  const hasEffectToggles = (feature: Feature) =>
    !!character && conditionalEffectsOf(feature.id).length > 0;

  /** Vrai si la capacité est désactivée par exclusion mutuelle (grisage + interrupteur figé). */
  const isDisabled = (feature: Feature) => disabledIds?.has(feature.id) ?? false;

  /** Style « capacité désactivée » : semi-transparente + grisée (le clic reste). */
  const disabledSx = (feature: Feature) =>
    isDisabled(feature) ? { opacity: 0.5, filter: 'grayscale(1)' } : null;

  /**
   * Message « pourquoi cette capacité est grisée » (affiché dans la modale et le bloc
   * dépliable). Remplacement : la capacité est définitivement supplantée. Exclusion :
   * désactivée tant qu'une autre est active. `null` si la capacité n'est pas grisée.
   */
  const disabledMessage = (feature: Feature): string | null => {
    const reason = disabledReasons?.get(feature.id);
    if (!reason) return null;
    if (reason.kind === 'replaced') return `Remplacée par ${reason.byFeatureName} : cette capacité n'est plus disponible.`;
    // PER-74 — transformation active (Métamorphose de l'ours) : ce n'est pas une exclusion mutuelle
    // entre DEUX capacités, mais la perte d'accès aux capacités de profil pendant la forme.
    if (reason.kind === 'transformed') {
      return `Désactivée tant que ${reason.byFeatureName} est active : le personnage ne peut plus utiliser ses capacités de profil.`;
    }
    return `Désactivée tant que ${reason.byFeatureName} est active (ne se cumulent pas).`;
  };

  /** Bandeau d'explication du grisage, en tête du détail (modale / bloc dépliable). */
  const renderDisabledNotice = (feature: Feature) => {
    const message = disabledMessage(feature);
    if (!message) return null;
    return (
      <AppAlert severity="info" sx={{ mb: 1.5 }}>
        {message}
      </AppAlert>
    );
  };

  /** Vrai si l'usage de la capacité est gêné par l'armure portée (restriction fine, PER-86). */
  const isArmorRestricted = (feature: Feature) => armorRestrictedReasons?.has(feature.id) ?? false;

  /**
   * PER-146 — compteur d'usage SYNTHÉTIQUE (1/jour) à afficher sur la carte de la capacité HÔTE (indexé
   * par son id) quand une armure est portée : le sort emprunté du gnome (« Don étrange ») n'est limité
   * que sous armure. `undefined` = aucun compteur synthétique (pas de gnome-r1, pas d'armure, ou pas
   * d'emprunt retenu). Cf. `borrowedArmorUsageCounters` (armorRestrictions.ts).
   */
  const synthArmorUsageCounter = (feature: Feature): UsageCounter | undefined =>
    borrowedArmorUsageCounters?.get(feature.id);

  /**
   * PER-74 — compteur d'usage SYNTHÉTIQUE du SORT APPRIS au rang 5 de la voie du familier (« il peut
   * utiliser ce sort 2×/jour si rang 1, 1×/jour si rang 2 », p. 133). Porté par la capacité hôte (R5),
   * clé dédiée `familiarPowerUsedKey(R5)`, rechargé au repos long. `undefined` si ce n'est pas le R5 ou
   * si aucun sort n'a encore été appris (max indéterminé). Le sort s'utilise SANS coût en mana (décision
   * proprio 2026-07-25) : le compteur EST la contrainte.
   */
  const synthLearnedSpellCounter = (feature: Feature): UsageCounter | undefined => {
    if (feature.id !== FAMILIAR_LEARNED_SPELL_HOST || !character) return undefined;
    const max = familiarLearnedSpellUsageMax(character);
    if (max === undefined) return undefined;
    return {
      max,
      sharedKey: familiarPowerUsedKey(FAMILIAR_LEARNED_SPELL_HOST),
      resetOn: 'day',
      label: 'Usages restants (par jour)',
    };
  };

  /**
   * PER-324 — compteur d'usage SYNTHÉTIQUE des INCANTATIONS GRATUITES du sort de « Sang féerique »
   * (demi-elfe r4, « 3×/jour si rang 1, 2× si rang 2, 1× si rang 3 », p. 10). Porté par la capacité
   * hôte (r4), clé dédiée `DEMI_ELFE_FEY_BLOOD_USAGE_KEY`, rechargé au repos long. `undefined` si ce
   * n'est pas le r4 ou si aucun sort n'a encore été choisi. Ce compteur vaut pour TOUS (lanceur ou
   * non) : c'est la limite des lancers gratuits. Un lanceur peut EN PLUS dépenser des PM (hors compteur).
   */
  const synthFeyBloodCounter = (feature: Feature): UsageCounter | undefined => {
    if (feature.id !== DEMI_ELFE_FEY_BLOOD_HOST || !character) return undefined;
    const max = demiElfeFeyBloodUsageMax(character);
    if (max === undefined) return undefined;
    return {
      max,
      sharedKey: DEMI_ELFE_FEY_BLOOD_USAGE_KEY,
      resetOn: 'day',
      label: 'Incantations gratuites (par jour)',
    };
  };

  /** Message « inutilisable avec l'armure portée » de la capacité (`null` si non gênée). */
  const armorRestrictedMessage = (feature: Feature): string | null =>
    armorRestrictedReasons?.get(feature.id) ?? null;

  /**
   * Style « capacité inutilisable avec l'armure portée » (PER-86) : rang DÉSATURÉ (~75 %) et
   * légèrement transparent. Distinct du grisage d'exclusion mutuelle (`disabledSx`, opacity .5 /
   * grayscale 1) : ici on n'éteint AUCUN interrupteur, on signale seulement.
   */
  const armorRestrictedSx = (feature: Feature) =>
    isArmorRestricted(feature) ? { filter: 'grayscale(0.75)', opacity: 0.72 } : null;

  /** Notice d'avertissement d'armure, en tête du détail (modale / bloc dépliable, vue liste). */
  const renderArmorRestrictedNotice = (feature: Feature) => {
    const message = armorRestrictedMessage(feature);
    if (!message) return null;
    return (
      <AppAlert severity="warning" sx={{ mb: 1.5 }}>
        {/* « (p. 177) » cité en source (PER-207). */}
        <PageRefText>{message}</PageRefText>
      </AppAlert>
    );
  };

  /**
   * Interrupteurs des effets conditionnels (PER-67). Toujours basculables (état de
   * jeu transitoire, même hors mode édition). `compact` rend l'interrupteur seul
   * (vue colonne), le libellé complet passant en infobulle. Désactivés (non
   * interactifs) si la capacité est exclue par une autre active.
   */
  const renderEffectToggles = (feature: Feature, opts: { compact?: boolean } = {}) => {
    if (!character || conditionalEffectsOf(feature.id).length === 0) return null;
    return (
      <FeatureEffectToggles
        character={character}
        featureId={feature.id}
        compact={opts.compact}
        onToggle={onToggleEffect}
        disabled={isDisabled(feature)}
        sessionStatusIds={sessionStatusIds}
      />
    );
  };

  // Infobulle de voie (généralisée à TOUTES les voies) : icône « i » discrète, systématique dès
  // qu'on connaît la voie — plus seulement celles portant un `note` (encadré/condition/exemple
  // verbatim du livre, ex. voie du bouclier « doit manier un bouclier »). Le corps affiche ce
  // `note` quand la voie en porte un ; le pied renvoie TOUJOURS, lui, vers la page de règles de
  // la voie (`sourcePage`, champ obligatoire de `PathBase`) pour l'atteindre directement. `ml`
  // ajuste l'espacement selon le placement (à côté du titre en vue liste, sous le compteur en
  // vue colonne — PER-74).
  const noteInfo = (ml = 0) =>
    path ? (
      <AppTooltip
        title={
          <Box sx={{ maxWidth: 320 }}>
            {path.note && <Box sx={{ whiteSpace: 'pre-line', mb: 0.75 }}>{path.note}</Box>}
            <SourceRef page={path.sourcePage} />
          </Box>
        }
      >
        <InfoOutlinedIcon sx={{ fontSize: 16, color: 'text.secondary', cursor: 'help', flexShrink: 0, ml }} />
      </AppTooltip>
    ) : null;

  const header = (
    <Box
      sx={{
        mb: compact ? 0 : 1,
        pl: compact ? 1 : 1.5,
        borderLeft: 3,
        borderColor: color ?? 'divider',
      }}
    >
    <Stack
      direction="row"
      spacing={0.5}
      sx={{ alignItems: compact ? 'flex-start' : 'center' }}
    >
      <Typography
        variant={compact ? 'body2' : 'subtitle1'}
        sx={{
          fontWeight: 600,
          color: color ?? 'text.primary',
          minWidth: 0,
          lineHeight: 1.2,
          wordBreak: 'break-word',
          // Vue colonne : titre de voie réduit de 2px (body2 0.875rem → 0.75rem) pour tenir la
          // largeur maintenant que la colonne de prestige occupe une 7e colonne (PER-74).
          ...(compact && { fontSize: '0.75rem' }),
        }}
      >
        {path?.name ?? group.pathId}
      </Typography>
      {/* Vue liste : le « i » d'infobulle reste à côté du titre (place suffisante). En vue colonne il
          descend sous le compteur (voir le Stack ci-dessous) pour dégager le titre condensé (PER-74). */}
      {!compact && noteInfo(0.25)}
      {compact ? (
        // Vue colonne : icône de profil, compteur de rangs, puis le « i » d'infobulle EN DESSOUS —
        // ça libère le titre (très condensé sur 7 colonnes). Uniforme pour toutes les voies connues.
        <Stack spacing={0.25} sx={{ ml: 'auto', flexShrink: 0, alignItems: 'flex-end' }}>
          {ownerClassId ? (
            <ClassIcon classId={ownerClassId} size={18} />
          ) : (
            iconAncestryId && (
              <AncestryIcon
                ancestryId={iconAncestryId}
                size={18}
                sx={{ color: isMagePath ? MAGE_PATH_COLOR : (prestigeTint ?? 'text.secondary') }}
              />
            )
          )}
          {total != null && (
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
              {features.length}/{total}
            </Typography>
          )}
          {noteInfo()}
        </Stack>
      ) : (
        // Vue liste : icône de profil (ou de peuple) juste à droite du titre.
        ownerClassId ? (
          <ClassIcon classId={ownerClassId} size={18} sx={{ ml: 0.5 }} />
        ) : (
          iconAncestryId && (
            <AncestryIcon
              ancestryId={iconAncestryId}
              size={18}
              sx={{ ml: 0.5, color: isMagePath ? MAGE_PATH_COLOR : (prestigeTint ?? 'text.secondary') }}
            />
          )
        )
      )}
    </Stack>
      {/* Réserve partagée (pool d'élixirs, p. 98) : petite barre sous le titre de la voie, avec le
          décompte « restant/max » à droite. Rendue uniquement pour les voies qui en portent une. */}
      {pool && (
        <PathResourcePoolBar
          pool={pool}
          color={color ?? undefined}
          onReset={
            onSetUsageCounter ? () => onSetUsageCounter(pool.key, pool.max, pool.max) : undefined
          }
        />
      )}
      {/* PER-74 : activation des cristaux appris (voie des cristaux, p. 156) — état de jeu, une
          seule fois par voie (pas par rang), cf. `CrystalActivationPanel`. */}
      {path?.id === 'prestige-cristaux' && character && (
        <CrystalActivationPanel character={character} onToggle={onToggleCrystalActive} />
      )}
    </Box>
  );

  // Vue colonne : la colonne est une subgrid → toutes les colonnes partagent
  // les mêmes lignes (en-tête + rangs). En-têtes et blocs s'alignent donc
  // automatiquement, même si un titre tient sur trois lignes ou plus.
  if (compact) {
    const ghostCount = total != null ? Math.max(0, total - features.length) : 0;
    return (
      <Box
        sx={{
          gridColumn,
          gridRow: `1 / span ${PATH_RANK_COUNT + 1}`,
          display: 'grid',
          gridTemplateRows: 'subgrid',
        }}
      >
        {header}
        {features.map((feature) => {
          // Capacité divine occupant ce slot par remplacement (prêtre spécialiste, p. 122).
          const repl = replacements?.get(feature.id);
          // Capacité EMPRUNTÉE par un choix `feature-from-path` (Combattant aguerri, PER-120) :
          // teinte la carte à la couleur de sa voie source, façon slot divin — mais SANS remplacer
          // (l'hôte n'est ni grisé ni désactivé). Exclu si la carte est déjà un slot divin (repl).
          const borrowed = !repl ? borrowedFeatureOf(character, feature) : undefined;
          // PER-74 : Bâton magique (archimage r5) porte DEUX choix `feature-from-path` — une fois le
          // PREMIER résolu, la puce « Choisir » de l'hôte disparaissait (condition historique
          // `!borrowed`), rendant le 2e choix injoignable hors modale (PIÈGE VÉCU en recette). On ne
          // change ce comportement QUE pour les hôtes à PLUSIEURS emprunts (`> 1`) — inchangé pour
          // le cas standard à un seul emprunt (ex. Formation d'élite, noblesse-r5, qui mélange un
          // emprunt ET un choix `ability` distinct : masquer trop tôt cacherait CE 2e choix, sans
          // rapport avec les emprunts).
          const borrowSlotCount = (feature.choices ?? []).filter((c) => c.kind === 'feature-from-path').length;
          const hasMultipleBorrowSlots = !repl && borrowSlotCount > 1;
          // PER-74 — Bâton magique (archimage r5) : une fois les DEUX emprunts résolus, les cartes de
          // sorts empilées (ci-dessous) disent déjà tout — la puce « Choisir » (résolue, donc réduite à
          // un simple badge bleu redondant) n'a plus rien à apporter à cet endroit et fait double emploi
          // (retour recette proprio). On ne la masque QUE quand PLUS RIEN n'est actionnable ; tant qu'un
          // slot reste à choisir, elle reste affichée pour que ce 2e choix reste joignable (cf. ci-dessus).
          const allBorrowSlotsResolved =
            hasMultipleBorrowSlots && (!repl ? borrowedFeaturesOf(character, feature).length : 0) >= borrowSlotCount;
          const borrowedPath = borrowed ? pathById.get(borrowed.pathId) : undefined;
          const borrowedClassId = borrowedPath?.type === 'class' ? borrowedPath.classIds[0] : undefined;
          const borrowedColor = borrowedClassId ? classColor(borrowedClassId) : undefined;
          // PER-74 — Bâton magique (archimage r5) : le 2e choix `feature-from-path` de l'hôte, s'il est
          // résolu, s'empile EN DESSOUS de la carte de devant ci-dessus (`cardInner`) — MÊME design,
          // juste une 2e carte, au lieu d'être invisible en vue colonne (retour recette proprio).
          const borrowedExtra = !repl ? borrowedFeaturesOf(character, feature).slice(1) : [];
          // PER-74 — sort conféré par le bâton magique : lancé en (M) sans coût en mana, comme dans le
          // détail (`BorrowedFeatureBlock`). N'affecte que l'AFFICHAGE de cette carte de devant.
          const staffGrantedPrimary = !!character && !!borrowed && archmageStaffSpellGranted(character, borrowed);
          // PER-74 : rang de la voie du familier fantastique (R4/R7) portant un pouvoir affichable en
          // carte — soit une capacité de profil CONFÉRÉE (`featureId`), soit un pouvoir PROPRE au familier
          // (`original`, ex. Toile/Poison de l'araignée) → carte « stackée » façon capacité empruntée
          // (le pouvoir en devant, le rang « Pouvoir mineur/supérieur » derrière). Clic → modale (openFeature).
          const familiarPower = character ? resolveFamiliarGrantedPower(feature.id, character.featureChoices) : null;
          if (!repl && !borrowed && character && (familiarPower?.featureId || familiarPower?.original)) {
            return (
              <FamiliarPowerCompactCard
                key={feature.id}
                host={feature}
                character={character}
                concentration={concentration}
                onOpen={() => setOpenFeature(feature)}
              />
            );
          }
          // PER-153 : la restriction d'armure porte sur la capacité EMPRUNTÉE (ex. « Peau de fer »),
          // pas sur l'hôte « Touche-à-tout » — qui n'est jamais gêné et dont les autres effets restent
          // actifs. Le style « désaturé + barré » ne frappe donc que la carte de devant (`cardInner`),
          // laissant la bande de l'hôte intacte. Pour une carte non-emprunt, on retombe sur `feature`.
          const armorRestrictedFeature = borrowed ?? feature;
          const cardInner = (
          // Ligne cliquable : le détail s'ouvre dans une modale.
          <Box
            key={feature.id}
            onClick={() => setOpenFeature(feature)}
            sx={{
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              justifyContent: 'flex-start',
              // Emprunt (carte de devant) : remplit toute la hauteur du conteneur (flex column)
              // pour que la zone cliquable soit aussi grande que possible. Ignoré en grille (carte
              // directe), où la carte s'étire déjà sur la hauteur de ligne du subgrid.
              flexGrow: 1,
              // Padding horizontal resserré (6px au lieu de 8px) pour gagner de la largeur de contenu
              // par colonne en vue colonne (option 4, PER-74).
              px: 0.75,
              // Le haut est dégagé pour laisser voir les hexagones, qui chevauchent
              // la bordure supérieure (coins : marqueurs en haut gauche, goutte de
              // mana en haut droite, suppression et épingle en bas).
              pt: 1.75,
              pb: 0.75,
              // Bordure FINE (1px) comme les cartes normales du profil — emprunt et slot divin ne
              // doivent pas être « trop prononcés » ; seule la couleur de bordure rappelle l'origine.
              border: 1,
              borderColor: repl
                ? repl.originColor
                : borrowed && borrowedColor
                  ? borrowedColor
                  : 'divider',
              borderRadius: 1,
              cursor: 'pointer',
              // Cadre « fantôme » du slot natif remplacé : un bloc décalé derrière la carte
              // de la capacité divine (le slot d'origine de la voie d'accueil, p. 122). PAS pour
              // un emprunt (PER-120) : rien n'est remplacé, donc pas de slot fantôme derrière.
              boxShadow: repl
                ? (theme) => `5px 5px 0 0 ${alpha(theme.palette.text.primary, 0.18)}`
                : undefined,
              bgcolor: repl
                ? alpha(repl.originColor, 0.1)
                : borrowed && borrowedColor
                  ? alpha(borrowedColor, 0.1)
                  : color
                    ? alpha(color, 0.06)
                    : (theme) => alpha(theme.palette.text.primary, 0.04),
              // Carte de devant d'un emprunt (PER-120) : fond OPAQUE (teinte source sur paper)
              // pour qu'elle masque la case décalée derrière — sinon la couleur de l'hôte
              // transparaîtrait à travers la carte de la capacité empruntée.
              ...(borrowed && borrowedColor
                ? {
                    backgroundColor: 'background.paper',
                    backgroundImage: `linear-gradient(${alpha(borrowedColor, 0.06)}, ${alpha(borrowedColor, 0.06)})`,
                  }
                : {}),
              // Fondu doux du fond au survol (retour d'UX) plutôt qu'un changement sec. Le délai
              // (.2s) porté par l'état de BASE ne joue qu'à la SORTIE du survol : l'opacité met un
              // court instant à revenir. À l'ENTRÉE, la transition de `:hover` (sans délai) prend le
              // relais, donc le fondu démarre immédiatement.
              transition: 'background-color .15s ease .2s',
              '&:hover': {
                bgcolor: color ? alpha(color, 0.14) : 'action.hover',
                transition: 'background-color .15s ease',
              },
              ...(onRemove
                ? {
                    '& .feature-remove': { opacity: 0, transition: 'opacity .15s' },
                    '&:hover .feature-remove, &:focus-within .feature-remove': { opacity: 1 },
                  }
                : {}),
              // Désactivée par exclusion mutuelle : grisée + transparente, mais le
              // clic d'ouverture du détail reste actif.
              ...(disabledSx(feature) ?? {}),
              // Inutilisable avec l'armure portée (PER-86/153) : désaturée + croix diagonale, l'interrupteur
              // reste actif. Sur une carte d'emprunt, c'est la capacité EMPRUNTÉE qui est jugée (pas l'hôte).
              ...(armorRestrictedSx(armorRestrictedFeature) ?? {}),
              ...(isArmorRestricted(armorRestrictedFeature) ? ARMOR_RESTRICTED_BARS_SX : {}),
              // PER-74 — carte de rang de prestige : anneau dégradé + fond sombre (override en dernier).
              // Pas sur une carte d'emprunt/slot divin (elles gardent la teinte de leur voie source).
              ...(!repl && !borrowed ? (prestigeCardSx ?? {}) : {}),
            }}
          >
            {/* Marqueurs hexagonaux centrés sur la ligne du haut du bloc. Sur une carte d'emprunt
                ils décrivent la capacité EMPRUNTÉE (l'hôte, ex. Talent pour la magie, n'a
                ni astérisque ni type d'action) — teintés de la couleur de la voie source. */}
            <FeatureMarkerHexes
              feature={
                staffGrantedPrimary && borrowed
                  ? { ...borrowed, actionTypes: ['M'] as ActionType[] }
                  : ((): Feature => {
                      const base = borrowed ?? feature;
                      const ov = nativeFreeActionOverride(character, base);
                      return ov ? { ...base, actionTypes: ov } : base;
                    })()
              }
              color={borrowed ? (borrowedColor ?? markerColor) : markerColor}
              concentration={concentration}
              // PER-74 — Capacité fabuleuse : la cible (L) native (jamais un emprunt) affiche (A).
              promoteToAttack={!borrowed && fabulousFor(feature).promoteToAttack}
              pathRank={pathRank}
              sx={{ position: 'absolute', top: 0, left: 6, transform: 'translateY(-50%)', zIndex: 1 }}
            />
            {/* Goutte de coût en PM : celle du sort EMPRUNTÉ le cas échéant (coût = son rang habituel, p. 41).
                Masquée pour un sort CONFÉRÉ sans coût en mana (sort appris du familier r5, sort du bâton
                magique de l'archimage r5, PER-74) — même condition que le détail (`BorrowedFeatureBlock`). */}
            {!(
              borrowed &&
              (feature.id === FAMILIAR_LEARNED_SPELL_HOST ||
                staffGrantedPrimary ||
                // PER-324 : « Sang féerique » — pas de goutte de PM sur la carte compacte (incantations
                // gratuites plafonnées par le compteur ; un lanceur dépense des PM, détaillé dans la modale).
                feature.id === DEMI_ELFE_FEY_BLOOD_HOST)
            ) && (
              <SpellManaBadge
                feature={borrowed ?? feature}
                // PER-74 — Capacité fabuleuse : sort (A) cible → concentration permanente (−2 PM) sur la goutte.
                concentration={borrowed ? concentration : fabulousFor(feature).manaConcentration}
                surcharge={character ? escalatingManaSurcharge(character, borrowed ?? feature) : 0}
                armorSurcharge={character ? spellArmorManaSurcharge(character, rulesContext, borrowed ?? feature) : null}
                discount={character ? combatRitualDiscount(character, borrowed ?? feature) : 0}
                color={(borrowed ? borrowedColor : color) ?? undefined}
                tooltipEnterDelay={1000}
                sx={{ position: 'absolute', top: -8, right: -8, zIndex: 1 }}
              />
            )}
            {manualFeatureIds?.has(feature.id) && <ManualPin />}
            <Typography
              variant="body2"
              // Vue colonne : nom de capacité réduit de 1px (0.875rem → 0.8125rem) pour la lisibilité
              // sur 7 colonnes (PER-74). Reste 1px au-dessus du titre de voie (0.75rem).
              sx={{ fontWeight: 600, fontSize: '0.8125rem', width: '100%', textAlign: 'left', wordBreak: 'break-word' }}
            >
              {repl && (
                <AppTooltip
                  title={`Capacité divine de ${repl.godName ?? '—'}${
                    repl.replacedFeature ? ` — remplace ${repl.replacedFeature.name}` : ''
                  }`}
                >
                  <Box
                    component="span"
                    sx={{ color: repl.originColor, fontWeight: 700, mr: 0.5, cursor: 'help' }}
                  >
                    ✦
                  </Box>
                </AppTooltip>
              )}
              {/* Emprunt (PER-120) : la carte de devant porte le VRAI nom de la capacité empruntée
                  (« Vivacité »), écrit normalement ; le nom de l'hôte est dans la case décalée derrière. */}
              {borrowed ? declinedName(borrowed) : declinedName(feature)}
            </Typography>
            {/* Badge WIP (PER-72) : capacité dont une partie de l'effet dépend d'un ticket extérieur
                non terminé (ex. pagne-r2 → PER-131). Suivi de relecture, pas une règle. */}
            {feature.wip && (
              <AppTooltip title={feature.wip}>
                <Chip
                  label="WIP"
                  size="small"
                  variant="outlined"
                  sx={{
                    ...WIP_CHIP_SX,
                    mt: 0.5,
                    height: 18,
                    cursor: 'help',
                    '& .MuiChip-label': { px: 0.75, fontSize: '0.6rem', fontWeight: 700 },
                  }}
                />
              </AppTooltip>
            )}
            {/* Interrupteurs des effets conditionnels, compacts (état de jeu, libellé
                en infobulle) ; le détail cliquable héberge la version étiquetée. */}
            {hasEffectToggles(feature) && (
              <Box sx={{ mt: 0.5, width: '100%' }}>{renderEffectToggles(feature, { compact: true })}</Box>
            )}
            {/* Interrupteur(s) d'effet conditionnel de la capacité EMPRUNTÉE (PER-324, ex. Survie « en
                milieu naturel ») en mode COLONNE : même exposition compacte que l'hôte — sans quoi on ne
                pourrait pas activer l'effet (dont le bonus de soin par DR au repos) sans ouvrir la modale. */}
            {borrowed && hasEffectToggles(borrowed) && (
              <Box sx={{ mt: 0.5, width: '100%' }}>{renderEffectToggles(borrowed, { compact: true })}</Box>
            )}
            {/* Rappel compact de l'élément résisté choisi (Maîtrise des éléments, PER-137) : badge bleu
                « Feu/Froid… » pour ne pas oublier que l'effet est actif (le sélecteur est dans la modale). */}
            {(() => {
              const el = damageReductionScopeChoice(feature) && character?.effectInputs?.[feature.id];
              if (!el) return null;
              const label = ELEMENT_CHOICE_LABEL[el as ResistibleDamageType] ?? el;
              return (
                <Box sx={{ mt: 0.5 }} onClick={(e) => e.stopPropagation()}>
                  <DefenseBadge
                    variant="reduction"
                    scope={el as ResistibleDamageType}
                    text={label}
                    title={`${declinedName(feature)} : ${label}`}
                    sources={[{ name: declinedName(feature) }]}
                    fullWidth={false}
                  />
                </Box>
              );
            })()}
            {/* Indicateur compact du compteur d'usages (lecture seule ; édition en
                modale). Ex. Les sept vies du chat : pastilles « N/6 ». Masqué pour une réserve
                de type pool (élixirs) : elle est suivie dans la barre de l'en-tête de voie. */}
            {feature.usageCounter &&
              !feature.usageCounter.poolInPathHeader &&
              character &&
              // PER-74 : compteur MASQUÉ si une capacité possédée lève toute limite (Ombre mouvante r6 →
              // usage illimité quand le personnage connaît Disparition).
              !isUsageCounterHidden(feature.usageCounter, character.featureIds) && (
                <CompactUsageIndicator feature={feature} character={character} />
              )}
            {/* PER-146 : compteur synthétique « 1 usage/jour en armure » du sort emprunté du gnome
                (« Don étrange »), affiché sur la carte de l'emprunt (feature = capacité empruntée) tant
                qu'une armure est portée. Le coût en PM reste dû (goutte de mana affichée par ailleurs). */}
            {borrowed && character && synthArmorUsageCounter(feature) && (
              <CompactUsageIndicator
                feature={borrowed}
                character={character}
                counterOverride={synthArmorUsageCounter(feature)}
              />
            )}
            {/* PER-324 : incantations gratuites de « Sang féerique » (3/2/1 par jour selon le rang du
                sort), en pastilles compactes sur la carte de l'emprunt en mode COLONNE — édition dans la
                modale. Vaut pour lanceur comme non-lanceur (limite des lancers gratuits). */}
            {borrowed && character && synthFeyBloodCounter(feature) && (
              <CompactUsageIndicator
                feature={borrowed}
                character={character}
                counterOverride={synthFeyBloodCounter(feature)}
              />
            )}
            {feature.inflictableStates && character && (
              <CompactInflictedStatesIndicator feature={feature} character={character} />
            )}
            {/* Choix porté par la capacité, poussé en bas du bloc : la puce du choix
                (« Choisir » orange qui pulse tant que rien n'est retenu, sinon la valeur)
                est elle-même CLIQUABLE et ouvre la modale d'édition (PER-68) — plus de
                crayon accolé qui déformait la carte. Masqué pour un emprunt (PER-120) :
                la carte de la capacité empruntée affiche déjà le choix retenu. Pour un hôte à
                PLUSIEURS emprunts (PER-74, Bâton magique), affiché tant qu'un slot reste à
                choisir (2e « Choisir » joignable), puis masqué une fois TOUT résolu — les
                cartes de sorts empilées ci-dessous le disent déjà, la puce bleue ferait
                doublon (retour recette proprio). */}
            {hasChoices(feature) && (!borrowed || (hasMultipleBorrowSlots && !allBorrowSlotsResolved)) && (
              <Box
                sx={{
                  mt: 'auto',
                  pt: 0.75,
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                  // Réserve la place du bouton de suppression (coin bas droite).
                  pr: onRemove ? 2.5 : 0,
                }}
                // PAS de stopPropagation ici : chaque puce CLIQUABLE arrête déjà l'événement
                // elle-même. Sinon cette bande deviendrait une zone morte quand la puce est en
                // lecture seule (valeur retenue hors édition) — un clic doit alors ouvrir le
                // détail de la capacité, comme partout ailleurs sur la carte.
              >
                {renderChoiceDisplay(feature, {
                  compact: true,
                  onEdit: canEditChoices ? () => requestChoiceEdit(feature) : undefined,
                })}
              </Box>
            )}
            {/* Choix PROPRE de la capacité empruntée (ex. catégorie d'animaux de Langage des
                animaux, débloquée par un rang 4 de druide) : la carte compacte de l'hôte étant
                teintée à la voie source, on y remonte le choix de l'emprunt (puce « Choix à faire »
                tant que rien n'est retenu) — sinon il n'apparaîtrait qu'en modale (PER-73). */}
            {borrowed && hasChoices(borrowed) && (
              <Box
                sx={{
                  mt: 'auto',
                  pt: 0.75,
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                  pr: onRemove ? 2.5 : 0,
                }}
                // Cf. ci-dessus : la puce arrête elle-même le clic quand elle est cliquable.
              >
                {renderChoiceDisplay(borrowed, {
                  compact: true,
                  onEdit: canEditChoices ? () => requestChoiceEdit(borrowed) : undefined,
                })}
              </Box>
            )}
            {onRemove && (
              <AppTooltip title="Retirer la capacité">
                <IconButton
                  className="feature-remove"
                  size="small"
                  color="error"
                  sx={{ position: 'absolute', bottom: 1, right: 1, p: 0.25, zIndex: 1 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(feature.id);
                  }}
                >
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              </AppTooltip>
            )}
          </Box>
          );
          // Emprunt (PER-120) : on reprend la « case décalée » du slot divin, mais la boîte qui
          // dépasse derrière prend le contour + le fond de la VOIE HÔTE (celle qui reçoit l'emprunt)
          // et porte le nom de l'hôte (« Combattant aguerri ») — la carte de devant montrant la
          // capacité empruntée (« Vivacité »). Rien n'est grisé : l'hôte reste pleinement actif.
          // Caractéristique retenue par le second choix de l'hôte (ex. CON de Formation d'élite) :
          // affichée en puce COMPACTE (code seul) sous le nom de l'hôte, dans SON cadre (la case
          // décalée). Le sélecteur de choix garde, lui, le nom complet (« Constitution »).
          const abilityCode = abilityChoiceCode(character, feature);
          const rendered = borrowed ? (
            // Conteneur en colonne : carte de devant (`cardInner`, capacité empruntée) PUIS bande de
            // l'hôte, toutes deux EN FLUX → leur hauteur est comptée dans le bloc (et donc dans la ligne
            // du subgrid), ce qui évite que le nom de l'hôte (qui peut tenir sur deux lignes, ex.
            // « Talent pour la violence ») soit tronqué ou masqué (PER-73 — auparavant la bande était en
            // position absolue, hors flux). Le cadre décalé bas-droite reste un décor absolu DERRIÈRE.
            // TOUT le bloc ouvre le détail au clic — une seule capacité « qui en contient une autre ».
            <Box
              key={feature.id}
              onClick={() => setOpenFeature(feature)}
              sx={{
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                cursor: 'pointer',
              }}
            >
              {/* Cadre décalé décoratif (offset bas-droite) DERRIÈRE le contenu — purement visuel. */}
              <Box
                aria-hidden
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: -5,
                  bottom: 0,
                  borderRadius: 1,
                  border: 1,
                  borderColor: 'divider',
                  bgcolor: color ? alpha(color, 0.06) : (theme) => alpha(theme.palette.text.primary, 0.04),
                  zIndex: 0,
                }}
              />
              {/* Carte(s) de devant (capacité(s) empruntée(s)), au-dessus du cadre. PER-74 : Bâton
                  magique (archimage r5) porte DEUX choix sur le MÊME hôte → la 2e capacité empruntée
                  s'empile EN DESSOUS de la première (`cardInner`), dans le MÊME style de carte —
                  n'affecte que ce cas ; ailleurs `borrowedExtra` est vide et rien ne change. */}
              <Box sx={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', flexGrow: 1, gap: 0.5 }}>
                {cardInner}
                {borrowedExtra.map((item, i) => {
                  const itemPath = pathById.get(item.pathId);
                  const itemClassId = itemPath?.type === 'class' ? itemPath.classIds[0] : undefined;
                  const itemColor = itemClassId ? classColor(itemClassId) : undefined;
                  const itemStaffGranted = !!character && archmageStaffSpellGranted(character, item);
                  const itemNoMana = feature.id === FAMILIAR_LEARNED_SPELL_HOST || itemStaffGranted;
                  return (
                    <Box
                      key={`${i}-${item.id}`}
                      sx={{
                        position: 'relative',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-start',
                        pt: 1.75,
                        pb: 0.75,
                        px: 0.75,
                        border: 1,
                        borderColor: itemColor ?? 'divider',
                        borderRadius: 1,
                        backgroundColor: 'background.paper',
                        backgroundImage: itemColor
                          ? `linear-gradient(${alpha(itemColor, 0.06)}, ${alpha(itemColor, 0.06)})`
                          : undefined,
                        ...(isArmorRestricted(item)
                          ? { filter: 'grayscale(0.75)', opacity: 0.72, ...ARMOR_RESTRICTED_BARS_SX }
                          : {}),
                      }}
                    >
                      <FeatureMarkerHexes
                        feature={
                          itemStaffGranted
                            ? { ...item, actionTypes: ['M'] as ActionType[] }
                            : ((): Feature => {
                                const ov = nativeFreeActionOverride(character, item);
                                return ov ? { ...item, actionTypes: ov } : item;
                              })()
                        }
                        color={itemColor}
                        concentration={concentration}
                        pathRank={pathRank}
                        sx={{ position: 'absolute', top: 0, left: 6, transform: 'translateY(-50%)', zIndex: 1 }}
                      />
                      {!itemNoMana && (
                        <SpellManaBadge
                          feature={item}
                          concentration={concentration}
                          surcharge={character ? escalatingManaSurcharge(character, item) : 0}
                          armorSurcharge={character ? spellArmorManaSurcharge(character, rulesContext, item) : null}
                          discount={character ? combatRitualDiscount(character, item) : 0}
                          color={itemColor ?? undefined}
                          tooltipEnterDelay={1000}
                          sx={{ position: 'absolute', top: -8, right: -8, zIndex: 1 }}
                        />
                      )}
                      <Typography
                        variant="body2"
                        sx={{ fontWeight: 600, fontSize: '0.8125rem', width: '100%', textAlign: 'left', wordBreak: 'break-word' }}
                      >
                        {declinedName(item)}
                      </Typography>
                      {hasChoices(item) && (
                        <Box sx={{ mt: 0.5, width: '100%', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          {renderChoiceDisplay(item, {
                            compact: true,
                            onEdit: canEditChoices ? () => requestChoiceEdit(item) : undefined,
                          })}
                        </Box>
                      )}
                    </Box>
                  );
                })}
              </Box>
              {/* Bande de l'hôte EN FLUX, alignée bas-droite sur le cadre décalé : son nom (et la
                  carac retenue éventuelle) restent toujours entièrement visibles. */}
              <Box
                sx={{
                  position: 'relative',
                  zIndex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  flexWrap: 'wrap',
                  gap: 0.5,
                  px: 1,
                  pt: 0.25,
                  pb: 0.25,
                }}
              >
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: 600,
                    lineHeight: 1.2,
                    textAlign: 'right',
                    color: 'text.primary',
                    wordBreak: 'break-word',
                  }}
                >
                  {declinedName(feature)}
                </Typography>
                {/* Carac retenue : badge de choix standard (bleu primaire), code court « CON »
                    pour gagner de la place ; nom complet (« Constitution ») en infobulle. */}
                {abilityCode && (
                  <ChoiceValueBadge label={abilityCode} compact title={ABILITY_NAMES[abilityCode]} />
                )}
              </Box>
            </Box>
          ) : (
            cardInner
          );
          // Restriction d'armure (PER-86/153) : infobulle d'avertissement au survol du bloc (vue colonne).
          // La carte est déjà désaturée par `armorRestrictedSx` ; le tooltip porte le détail sourcé. Pour un
          // emprunt, c'est la capacité EMPRUNTÉE qui est jugée (l'hôte « Touche-à-tout » n'est pas gêné).
          return isArmorRestricted(armorRestrictedFeature) ? (
            <AppTooltip
              key={feature.id}
              enterDelay={400}
              title={<PageRefText>{armorRestrictedMessage(armorRestrictedFeature) ?? ''}</PageRefText>}
            >
              {rendered}
            </AppTooltip>
          ) : (
            rendered
          );
        })}
        {Array.from({ length: ghostCount }).map((_, i) => (
          <GhostBlock key={`ghost-${i}`} />
        ))}

        <Dialog
          open={openFeature != null}
          onClose={() => setOpenFeature(null)}
          maxWidth="sm"
          fullWidth
        >
          {openFeature && (
            <>
              <DialogTitle sx={{ pr: 6 }}>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                  <FeaturePathTitle
                    feature={openFeature}
                    isReplacement={!!replacements?.has(openFeature.id)}
                    fallbackClassId={ownerClassId ?? undefined}
                    fallbackAncestryId={ancestryId ?? undefined}
                    fallbackPathName={path?.name ?? group.pathId}
                    fallbackColor={color ?? undefined}
                  />
                  <Chip
                    label={`Rang ${openFeature.rank}`}
                    size="small"
                    variant="outlined"
                    sx={{ fontWeight: 600 }}
                  />
                  <Box component="span" sx={{ fontWeight: 600 }}>
                    <FeatureLabel
                      feature={openFeature}
                      concentration={concentration}
                      promoteToAttack={fabulousFor(openFeature).promoteToAttack}
                      pathRank={pathRank}
                    />
                  </Box>
                  {openFeature.wip && (
                    <AppTooltip title={openFeature.wip}>
                      <Chip
                        label="WIP"
                        size="small"
                        variant="outlined"
                        sx={{ ...WIP_CHIP_SX, fontWeight: 700, cursor: 'help' }}
                      />
                    </AppTooltip>
                  )}
                </Stack>
                <IconButton
                  aria-label="Fermer"
                  onClick={() => setOpenFeature(null)}
                  sx={{ position: 'absolute', right: 8, top: 8 }}
                >
                  <CloseIcon />
                </IconButton>
              </DialogTitle>
              <DialogContent
                dividers
                // PER-165 : le cadenas « débloquer sans repos » n'apparaît qu'au survol de la modale.
                sx={{ '&:hover .lift-lock-reveal, &:focus-within .lift-lock-reveal': { opacity: 1 } }}
              >
                {renderDisabledNotice(openFeature)}
                {renderArmorRestrictedNotice(openFeature)}
                {retainedFeature && openFeature.rank === 1 && (
                  <>
                    <RetainedAncestryCapacity
                      feature={retainedFeature}
                      pathName={retainedPathName}
                      abilities={abilities}
                      level={level}
                    />
                    <Divider sx={{ my: 1.5 }} />
                  </>
                )}
                <FeatureText feature={openFeature} abilities={abilities} level={level} pathRank={effectiveRank(openFeature)} milestoneBonus={milestoneBonusFor(openFeature)} scalingTierBonus={scalingTierBonus} />
                <FeatureSourcePage feature={openFeature} />
                {openFeature.referencedFeatures && openFeature.referencedFeatures.length > 0 && (
                  <>
                    <Divider sx={{ my: 1.5 }} />
                    <ReferencedFeaturesBlock
                      ids={openFeature.referencedFeatures}
                      abilities={abilities}
                      level={level}
                      creation={elixirCreation(openFeature)}
                      abilitySubstitutions={openFeature.reproducedAbilitySubstitutions}
                    />
                  </>
                )}
                {/* PER-163 : pouvoirs empruntés cassables (Artefact étrange) — usage 1×/jour + panne. */}
                {openFeature.borrowedPowers && openFeature.borrowedPowers.length > 0 && character && (
                  <>
                    <Divider sx={{ my: 1.5 }} />
                    <BorrowedPowersField
                      feature={openFeature}
                      character={character}
                      abilities={abilities}
                      level={level}
                      onSet={onSetUsageCounter}
                    />
                  </>
                )}
                {/* PER-206 : états préjudiciables infligeables (Botte secrète) — un bouton par état, 1×/combat. */}
                {openFeature.inflictableStates && character && (
                  <>
                    <Divider sx={{ my: 1.5 }} />
                    <InflictableStatesField
                      feature={openFeature}
                      character={character}
                      onSet={onSetUsageCounter}
                    />
                  </>
                )}
                {/* PER-74 : gestion de poison appliqué aux armes (maître des poisons, r5). */}
                {openFeature.poisonWeaponLoadout && character && (
                  <>
                    <Divider sx={{ my: 1.5 }} />
                    <PoisonWeaponLoadoutField character={character} onUpdate={onPoisonUpdate} />
                  </>
                )}
                {/* PER-284 : armes bricolées par la capacité (chargeur, second canon) — au choix du joueur. */}
                {openFeature.weaponModification && character && (
                  <>
                    <Divider sx={{ my: 1.5 }} />
                    <WeaponModificationField
                      spec={openFeature.weaponModification}
                      character={character}
                      onUpdate={onWeaponModificationUpdate}
                    />
                  </>
                )}
                {replacements?.get(openFeature.id)?.replacedFeature && (
                  <>
                    <Divider sx={{ my: 1.5 }} />
                    <ReplacedSlotBlock
                      feature={replacements.get(openFeature.id)!.replacedFeature!}
                      abilities={abilities}
                      level={level}
                    />
                  </>
                )}
                {openFeature.id === 'animaux-r5' && character && (
                  <AnimalFormsNote character={character} />
                )}
                {/* PER-74 : pouvoir conféré par le familier CHOISI (rangs 4/5/7 ; null sinon / sans familier). */}
                {openFeature.pathId === 'prestige-familier-fantastique' && character && (
                  <FamiliarGrantedPowerNote
                    feature={openFeature}
                    character={character}
                    abilities={abilities}
                    level={level}
                    onSetUsageCounter={onSetUsageCounter}
                  />
                )}
                {(() => {
                  const profile = displayCreatureProfile(openFeature, character);
                  return profile && abilities && level != null ? (
                    <Box sx={{ mt: 1.5 }}>
                      <CreatureStatBlock
                        profile={profile}
                        abilities={abilities}
                        level={level}
                        rank={pathRank}
                        masterDerived={masterDerived}
                        bonusDieAbilities={
                          character ? creatureBonusDiceForPath(openFeature.pathId, character) : undefined
                        }
                        defenseAltActive={creatureDefenseAltActive(profile, character)}
                      />
                      {character && (
                        <SummonInstanceBadge
                          feature={openFeature}
                          profile={profile}
                          character={character}
                          onSummon={onSummonCompanionInstance}
                        />
                      )}
                    </Box>
                  ) : null;
                })()}
                {hasChoices(openFeature) && (
                  <>
                    <Divider sx={{ my: 1.5 }} />
                    {/* La puce « Choisir » est cliquable même hors édition : elle ferme le détail
                        et ouvre la modale du choix (en basculant en édition si besoin) — sans elle,
                        un choix non fait n'était joignable qu'après un détour par le crayon. */}
                    {renderChoiceDisplay(openFeature, {
                      onEdit: canEditChoices
                        ? () => {
                            setOpenFeature(null);
                            requestChoiceEdit(openFeature);
                          }
                        : undefined,
                    })}
                    {onChoiceChange && (
                      <Button
                        size="small"
                        startIcon={<EditIcon fontSize="small" />}
                        sx={{ mt: 1 }}
                        onClick={() => {
                          setOpenFeature(null);
                          setChoiceEditFeature(openFeature);
                        }}
                      >
                        Modifier le choix
                      </Button>
                    )}
                  </>
                )}
                {(() => {
                  // PER-120 : capacité(s) EMPRUNTÉE(s) (Combattant aguerri) rendue(s) SOUS le
                  // texte/choix, sans remplacer la carte (l'effet de base de l'hôte reste appliqué).
                  // PER-74 : Bâton magique (archimage r5) porte DEUX choix → deux cartes EMPILÉES.
                  const borrowedList = borrowedFeaturesOf(character, openFeature);
                  // Sorts empruntés `noManaCost` (demi-elfe « Sang féerique », PER-324) : connus sans +1 PM.
                  const noManaBorrowed = character ? borrowedNoManaFeatureIds(character) : new Set<string>();
                  return borrowedList.length ? (
                    <Stack spacing={1.5} sx={{ mt: 1.5 }}>
                      {borrowedList.map((borrowed, i) => {
                        const staffGranted = !!character && archmageStaffSpellGranted(character, borrowed);
                        const grant = grantForBorrowed(openFeature, borrowed.id);
                        const borrowedNoMana = noManaBorrowed.has(borrowed.id);
                        return (
                          <BorrowedFeatureBlock
                            key={`${i}-${borrowed.id}`}
                            feature={borrowed}
                            abilities={abilities}
                            level={level}
                            hostPathRank={pathRank}
                            concentration={concentration}
                            dominatedTestBonuses={dominatedTestBonusesFor(borrowed.id)}
                            armorRestricted={isArmorRestricted(borrowed)}
                            armorRestrictedMessage={armorRestrictedMessage(borrowed)}
                            noMana={openFeature.id === FAMILIAR_LEARNED_SPELL_HOST || staffGranted || !!grant?.noMana || borrowedNoMana}
                            noManaNote={
                              staffGranted ? (
                                <>
                                  Sort lié au bâton magique : lancé au prix d’une action de mouvement, sans
                                  coût en mana (<SourceRef page={154} />).
                                </>
                              ) : grant?.noMana ? (
                                CAMBION_NO_MANA_NOTE
                              ) : borrowedNoMana ? (
                                demiElfeFeyBloodNote(!!character && isSpellcaster(character))
                              ) : undefined
                            }
                            actionTypesOverride={staffGranted ? (['M'] as ActionType[]) : undefined}
                            suppressTextMarker={
                              grant?.suppressTestBonus ? grant.suppressTextMarker : undefined
                            }
                            footer={
                              <>
                                {/* Toggle(s) d'effet conditionnel de l'emprunt (PER-324, ex. Survie « en milieu
                                    naturel ») — même exposition que la carte native. Rien si aucun. */}
                                {renderEffectToggles(borrowed)}
                                {hasChoices(borrowed) ? (
                                  <>
                                    <Divider sx={{ my: 1 }} />
                                    {renderChoiceDisplay(borrowed, {
                                      onEdit: canEditChoices
                                        ? () => {
                                            setOpenFeature(null);
                                            requestChoiceEdit(borrowed);
                                          }
                                        : undefined,
                                    })}
                                    {onChoiceChange && (
                                      <Button
                                        size="small"
                                        startIcon={<EditIcon fontSize="small" />}
                                        sx={{ mt: 1 }}
                                        onClick={() => {
                                          setOpenFeature(null);
                                          setChoiceEditFeature(borrowed);
                                        }}
                                      >
                                        Modifier le choix
                                      </Button>
                                    )}
                                  </>
                                ) : null}
                              </>
                            }
                          />
                        );
                      })}
                    </Stack>
                  ) : null;
                })()}
                {/* PER-146 : compteur « 1 usage/jour en armure » du sort emprunté du gnome
                    (« Don étrange »), éditable ici (±1) tant qu'une armure est portée. Rendu sous le
                    bloc de l'emprunt, contre la capacité empruntée (nom + clé partagée dédiée). */}
                {(() => {
                  const synth = synthArmorUsageCounter(openFeature);
                  const borrowed = character ? borrowedFeatureOf(character, openFeature) : undefined;
                  return synth && borrowed && character ? (
                    <>
                      <Divider sx={{ my: 1.5 }} />
                      <UsageCounterField
                        feature={borrowed}
                        character={character}
                        onSet={onSetUsageCounter}
                        counterOverride={synth}
                      />
                    </>
                  ) : null;
                })()}
                {/* PER-74 : compteur QUOTIDIEN du sort appris au rang 5 du familier (2×/1× selon le rang
                    du sort), sous le bloc de l'emprunt — sans coût en mana. */}
                {(() => {
                  const learned = synthLearnedSpellCounter(openFeature);
                  return learned && character ? (
                    <>
                      <Divider sx={{ my: 1.5 }} />
                      <UsageCounterField
                        feature={openFeature}
                        character={character}
                        onSet={onSetUsageCounter}
                        counterOverride={learned}
                      />
                    </>
                  ) : null;
                })()}
                {/* PER-324 : incantations gratuites de « Sang féerique » (3/2/1 par jour selon le rang du
                    sort), éditables ici (±1). Rendues contre la capacité EMPRUNTÉE (nom + clé dédiée). */}
                {(() => {
                  const synth = synthFeyBloodCounter(openFeature);
                  const borrowed = character ? borrowedFeatureOf(character, openFeature) : undefined;
                  return synth && borrowed && character ? (
                    <>
                      <Divider sx={{ my: 1.5 }} />
                      <UsageCounterField
                        feature={borrowed}
                        character={character}
                        onSet={onSetUsageCounter}
                        counterOverride={synth}
                      />
                    </>
                  ) : null;
                })()}
                {hasEffectToggles(openFeature) && (
                  <>
                    <Divider sx={{ my: 1.5 }} />
                    {renderEffectToggles(openFeature)}
                    {openFeature.id === 'animaux-r5' && character && (
                      <AnimalFormSelector character={character} onSetInput={onSetEffectInput} />
                    )}
                  </>
                )}
                {elementalSelectorConfig(openFeature) && character && (
                  <>
                    <Divider sx={{ my: 1.5 }} />
                    <ElementResistanceSelector
                      feature={openFeature}
                      character={character}
                      onSetInput={onSetEffectInput}
                    />
                  </>
                )}
                {finesseAttackEffect(openFeature) && character && (
                  <>
                    <Divider sx={{ my: 1.5 }} />
                    <FinesseAttackSelector
                      feature={openFeature}
                      character={character}
                      onSetInput={onSetEffectInput}
                    />
                  </>
                )}
                {openFeature.usageCounter &&
                  character &&
                  // r4/r5 (pool + sorts reproduits) : les boutons « Créer cet élixir » vivent DANS
                  // les blocs de sorts ci-dessus (on y précise la recette) → pas de bouton unique ici.
                  !(openFeature.usageCounter.poolInPathHeader && openFeature.referencedFeatures?.length) &&
                  // PER-74 : masqué si une capacité possédée lève toute limite (usage illimité).
                  !isUsageCounterHidden(openFeature.usageCounter, character.featureIds) && (
                    <>
                      <Divider sx={{ my: 1.5 }} />
                      {openFeature.usageCounter.poolInPathHeader ? (
                        // Rangs 1-3 (recette unique) : bouton de production nommé d'après la capacité,
                        // qui décompte la réserve (barre de l'en-tête) et matérialise la dose.
                        <CreateElixirButton
                          feature={openFeature}
                          character={character}
                          onCreate={onCreateElixir}
                        />
                      ) : (
                        <UsageCounterField
                          feature={openFeature}
                          character={character}
                          onSet={onSetUsageCounter}
                          onLiftShortRestLock={onLiftShortRestLock}
                        />
                      )}
                    </>
                  )}
                {/* PER-162 : surcoût mana croissant (Foudres divines) — bloc dédié, indépendant des
                    compteurs d'usages (foi-r5 n'en porte pas). */}
                {openFeature.escalatingManaCost && character && (
                  <>
                    <Divider sx={{ my: 1.5 }} />
                    <EscalatingManaCostRow
                      feature={openFeature}
                      character={character}
                      onSet={onSetUsageCounter}
                    />
                  </>
                )}
              </DialogContent>
            </>
          )}
        </Dialog>

        {/* Modale d'édition du choix (vue colonne) : ouverte par le crayon, le
            bloc étant trop petit pour héberger le sélecteur (PER-68). */}
        <Dialog
          open={choiceEditFeature != null}
          onClose={() => setChoiceEditFeature(null)}
          maxWidth="xs"
          fullWidth
        >
          {choiceEditFeature && (
            <>
              <DialogTitle sx={{ pr: 6 }}>
                <Box component="span" sx={{ fontWeight: 600 }}>
                  <FeatureLabel feature={choiceEditFeature} />
                </Box>
                <IconButton
                  aria-label="Fermer"
                  onClick={() => setChoiceEditFeature(null)}
                  sx={{ position: 'absolute', right: 8, top: 8 }}
                >
                  <CloseIcon />
                </IconButton>
              </DialogTitle>
              <DialogContent dividers>{renderChoiceEditor(choiceEditFeature)}</DialogContent>
              <DialogActions>
                {/* Un gagne-pain « Libre » (custom-skill) engagé doit être complété : « Terminer »
                    grisé tant que le nom ou l'un des domaines manque (le « X » reste une échappatoire). */}
                <Button
                  onClick={() => setChoiceEditFeature(null)}
                  disabled={!!character && hasIncompleteCustomSkill(character, choiceEditFeature.id)}
                >
                  Terminer
                </Button>
              </DialogActions>
            </>
          )}
        </Dialog>
      </Box>
    );
  }

  // Vue lignes : en-tête + accordéons dépliables (texte complet affiché en place).
  return (
    <Box>
      {header}
      <Stack spacing={0.5}>
        {features.map((feature) => {
          // Capacité divine occupant ce slot par remplacement (prêtre spécialiste, p. 122).
          const repl = replacements?.get(feature.id);
          return (
          <Accordion
            key={feature.id}
            disableGutters
            elevation={0}
            sx={{
              border: repl ? 2 : 1,
              borderColor: repl ? repl.originColor : 'divider',
              // Cadre « fantôme » du slot natif remplacé : bloc décalé derrière (p. 122).
              boxShadow: repl
                ? (theme) => `5px 5px 0 0 ${alpha(theme.palette.text.primary, 0.18)}`
                : undefined,
              bgcolor: repl ? alpha(repl.originColor, 0.1) : color ? alpha(color, 0.06) : (theme) => alpha(theme.palette.text.primary, 0.04),
              '&::before': { display: 'none' },
              // PER-165 : le cadenas « débloquer sans repos » n'apparaît qu'au survol de la carte.
              '&:hover .lift-lock-reveal, &:focus-within .lift-lock-reveal': { opacity: 1 },
              // Désactivée par exclusion mutuelle : grisée + transparente, mais
              // toujours dépliable (détail conservé).
              ...(disabledSx(feature) ?? {}),
              // Inutilisable avec l'armure portée (PER-86) : désaturée, dépliable (notice dans le détail).
              ...(armorRestrictedSx(feature) ?? {}),
              // PER-74 — carte de rang de prestige : anneau dégradé (remplace le ::before masqué de MUI)
              // + fond sombre. En dernier pour primer sur bordure/fond de base. Pas pour un slot divin.
              ...(!repl ? (prestigeCardSx ?? {}) : {}),
            }}
          >
            <AccordionSummary
              expandIcon={<ExpandMoreIcon />}
              // Inutilisable avec l'armure portée (PER-86) : croix diagonale sur la barre du rang
              // (la désaturation est portée par l'Accordion ; la notice est dans le détail déplié).
              sx={isArmorRestricted(feature) ? { position: 'relative', ...ARMOR_RESTRICTED_BARS_SX } : undefined}
            >
              <Stack
                direction="row"
                spacing={1}
                sx={{ alignItems: 'center', flexWrap: 'wrap', flexGrow: 1 }}
              >
                <FeaturePathTitle
                  feature={feature}
                  isReplacement={!!repl}
                  fallbackClassId={ownerClassId ?? undefined}
                  fallbackAncestryId={ancestryId ?? undefined}
                  fallbackPathName={path?.name ?? group.pathId}
                  fallbackColor={color ?? undefined}
                />
                <Chip
                  label={`Rang ${feature.rank}`}
                  size="small"
                  variant="outlined"
                  sx={{ fontWeight: 600 }}
                />
                {feature.wip && (
                  <AppTooltip title={feature.wip}>
                    <Chip
                      label="WIP"
                      size="small"
                      variant="outlined"
                      sx={{ ...WIP_CHIP_SX, fontWeight: 700, cursor: 'help' }}
                    />
                  </AppTooltip>
                )}
                {manualFeatureIds?.has(feature.id) && <ManualPin inline />}
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  {repl && (
                    <AppTooltip
                      title={`Capacité divine de ${repl.godName ?? '—'}${
                        repl.replacedFeature ? ` — remplace ${repl.replacedFeature.name}` : ''
                      }`}
                    >
                      <Box
                        component="span"
                        sx={{ color: repl.originColor, fontWeight: 700, mr: 0.5, cursor: 'help' }}
                      >
                        ✦
                      </Box>
                    </AppTooltip>
                  )}
                  <FeatureLabel
                    feature={feature}
                    concentration={concentration}
                    promoteToAttack={fabulousFor(feature).promoteToAttack}
                    pathRank={pathRank}
                  />
                </Typography>
              </Stack>
              <SpellManaBadge
                feature={feature}
                concentration={fabulousFor(feature).manaConcentration}
                surcharge={character ? escalatingManaSurcharge(character, feature) : 0}
                armorSurcharge={character ? spellArmorManaSurcharge(character, rulesContext, feature) : null}
                discount={character ? combatRitualDiscount(character, feature) : 0}
                color={color ?? undefined}
                tooltipEnterDelay={1000}
                sx={{ alignSelf: 'center', mr: 1 }}
              />
              {onRemove && (
                <AppTooltip title="Retirer la capacité">
                  <IconButton
                    size="small"
                    color="error"
                    component="span"
                    sx={{ mr: 1 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemove(feature.id);
                    }}
                  >
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </AppTooltip>
              )}
            </AccordionSummary>
            <AccordionDetails>
              {renderDisabledNotice(feature)}
              {renderArmorRestrictedNotice(feature)}
              {retainedFeature && feature.rank === 1 && (
                <>
                  <RetainedAncestryCapacity
                    feature={retainedFeature}
                    pathName={retainedPathName}
                    abilities={abilities}
                    level={level}
                  />
                  <Divider sx={{ my: 1.5 }} />
                </>
              )}
              <FeatureText feature={feature} abilities={abilities} level={level} pathRank={effectiveRank(feature)} milestoneBonus={milestoneBonusFor(feature)} scalingTierBonus={scalingTierBonus} />
              <FeatureSourcePage feature={feature} />
              {feature.referencedFeatures && feature.referencedFeatures.length > 0 && (
                <>
                  <Divider sx={{ my: 1.5 }} />
                  <ReferencedFeaturesBlock
                    ids={feature.referencedFeatures}
                    abilities={abilities}
                    level={level}
                    creation={elixirCreation(feature)}
                    abilitySubstitutions={feature.reproducedAbilitySubstitutions}
                  />
                </>
              )}
              {/* PER-163 : pouvoirs empruntés cassables (Artefact étrange) — usage 1×/jour + panne. */}
              {feature.borrowedPowers && feature.borrowedPowers.length > 0 && character && (
                <>
                  <Divider sx={{ my: 1.5 }} />
                  <BorrowedPowersField
                    feature={feature}
                    character={character}
                    abilities={abilities}
                    level={level}
                    onSet={onSetUsageCounter}
                  />
                </>
              )}
              {/* PER-206 : états préjudiciables infligeables (Botte secrète) — un bouton par état, 1×/combat. */}
              {feature.inflictableStates && character && (
                <>
                  <Divider sx={{ my: 1.5 }} />
                  <InflictableStatesField feature={feature} character={character} onSet={onSetUsageCounter} />
                </>
              )}
              {/* PER-74 : gestion de poison appliqué aux armes (maître des poisons, r5). */}
              {feature.poisonWeaponLoadout && character && (
                <>
                  <Divider sx={{ my: 1.5 }} />
                  <PoisonWeaponLoadoutField character={character} onUpdate={onPoisonUpdate} />
                </>
              )}
              {/* PER-284 : armes bricolées par la capacité (chargeur, second canon) — au choix du joueur. */}
              {feature.weaponModification && character && (
                <>
                  <Divider sx={{ my: 1.5 }} />
                  <WeaponModificationField
                    spec={feature.weaponModification}
                    character={character}
                    onUpdate={onWeaponModificationUpdate}
                  />
                </>
              )}
              {feature.id === 'animaux-r5' && character && <AnimalFormsNote character={character} />}
              {/* PER-74 : pouvoir conféré par le familier CHOISI (rangs 4/5/7 ; null sinon / sans familier). */}
              {feature.pathId === 'prestige-familier-fantastique' && character && (
                <FamiliarGrantedPowerNote
                  feature={feature}
                  character={character}
                  abilities={abilities}
                  level={level}
                  onSetUsageCounter={onSetUsageCounter}
                />
              )}
              {(() => {
                const profile = displayCreatureProfile(feature, character);
                return profile && abilities && level != null ? (
                  <Box sx={{ mt: 1.5 }}>
                    <CreatureStatBlock
                      profile={profile}
                      abilities={abilities}
                      level={level}
                      rank={pathRank}
                      masterDerived={masterDerived}
                      bonusDieAbilities={
                        character ? creatureBonusDiceForPath(feature.pathId, character) : undefined
                      }
                      defenseAltActive={creatureDefenseAltActive(profile, character)}
                    />
                    {character && (
                      <SummonInstanceBadge
                        feature={feature}
                        profile={profile}
                        character={character}
                        onSummon={onSummonCompanionInstance}
                      />
                    )}
                  </Box>
                ) : null;
              })()}
              {hasChoices(feature) && (
                <>
                  <Divider sx={{ my: 1.5 }} />
                  {/* Vue liste : le sélecteur s'affiche EN PLACE en mode édition. Hors édition, la
                      puce « Choisir » bascule le bloc « Voies » en édition — le sélecteur apparaît
                      alors à l'endroit même de la puce (aucune modale dans cette vue). */}
                  {onChoiceChange
                    ? renderChoiceEditor(feature)
                    : renderChoiceDisplay(feature, { onEdit: onEnableFeatureEditing })}
                </>
              )}
              {(() => {
                // PER-120 : capacité(s) EMPRUNTÉE(s) (Combattant aguerri) rendue(s) SOUS le
                // texte/choix, sans remplacer la carte (l'effet de base de l'hôte reste appliqué).
                // PER-74 : Bâton magique (archimage r5) porte DEUX choix → deux cartes EMPILÉES.
                const borrowedList = borrowedFeaturesOf(character, feature);
                const noManaBorrowed = character ? borrowedNoManaFeatureIds(character) : new Set<string>();
                return borrowedList.length ? (
                  <Stack spacing={1.5} sx={{ mt: 1.5 }}>
                    {borrowedList.map((borrowed, i) => {
                      const staffGranted = !!character && archmageStaffSpellGranted(character, borrowed);
                      const grant = grantForBorrowed(feature, borrowed.id);
                      const borrowedNoMana = noManaBorrowed.has(borrowed.id);
                      return (
                        <BorrowedFeatureBlock
                          key={`${i}-${borrowed.id}`}
                          feature={borrowed}
                          abilities={abilities}
                          level={level}
                          hostPathRank={pathRank}
                          concentration={concentration}
                          dominatedTestBonuses={dominatedTestBonusesFor(borrowed.id)}
                          armorRestricted={isArmorRestricted(borrowed)}
                          armorRestrictedMessage={armorRestrictedMessage(borrowed)}
                          noMana={feature.id === FAMILIAR_LEARNED_SPELL_HOST || staffGranted || !!grant?.noMana || borrowedNoMana}
                          noManaNote={
                            staffGranted ? (
                              <>
                                Sort lié au bâton magique : lancé au prix d’une action de mouvement, sans
                                coût en mana (<SourceRef page={154} />).
                              </>
                            ) : grant?.noMana ? (
                              CAMBION_NO_MANA_NOTE
                            ) : borrowedNoMana ? (
                              demiElfeFeyBloodNote(!!character && isSpellcaster(character))
                            ) : undefined
                          }
                          actionTypesOverride={staffGranted ? (['M'] as ActionType[]) : undefined}
                          suppressTextMarker={
                            grant?.suppressTestBonus ? grant.suppressTextMarker : undefined
                          }
                          footer={
                            <>
                              {/* Interrupteurs d'effets conditionnels de la capacité EMPRUNTÉE (PER-324) : une
                                  capacité empruntée porteuse d'un effet à interrupteur (ex. Survie « en milieu
                                  naturel ») doit exposer le MÊME toggle que sa version native — sinon on ne peut
                                  pas activer son effet (dont le bonus de soin par DR au repos). Rien si aucun. */}
                              {renderEffectToggles(borrowed)}
                              {hasChoices(borrowed) ? (
                                <>
                                  <Divider sx={{ my: 1 }} />
                                  {onChoiceChange
                                    ? renderChoiceEditor(borrowed)
                                    : renderChoiceDisplay(borrowed, { onEdit: onEnableFeatureEditing })}
                                </>
                              ) : null}
                            </>
                          }
                        />
                      );
                    })}
                  </Stack>
                ) : null;
              })()}
              {/* PER-146 : compteur « 1 usage/jour en armure » du sort emprunté du gnome (« Don étrange »),
                  éditable en vue liste sous le bloc de l'emprunt, tant qu'une armure est portée. */}
              {(() => {
                const synth = synthArmorUsageCounter(feature);
                const borrowed = character ? borrowedFeatureOf(character, feature) : undefined;
                return synth && borrowed && character ? (
                  <>
                    <Divider sx={{ my: 1.5 }} />
                    <UsageCounterField
                      feature={borrowed}
                      character={character}
                      onSet={onSetUsageCounter}
                      counterOverride={synth}
                    />
                  </>
                ) : null;
              })()}
              {/* PER-74 : compteur QUOTIDIEN du sort appris au rang 5 du familier (2×/1× selon le rang du
                  sort), en vue liste sous le bloc de l'emprunt — sans coût en mana. */}
              {(() => {
                const learned = synthLearnedSpellCounter(feature);
                return learned && character ? (
                  <>
                    <Divider sx={{ my: 1.5 }} />
                    <UsageCounterField
                      feature={feature}
                      character={character}
                      onSet={onSetUsageCounter}
                      counterOverride={learned}
                    />
                  </>
                ) : null;
              })()}
              {/* PER-324 : incantations gratuites de « Sang féerique » (3/2/1 par jour selon le rang du
                  sort), en vue liste sous le bloc de l'emprunt — contre la capacité empruntée. */}
              {(() => {
                const synth = synthFeyBloodCounter(feature);
                const borrowed = character ? borrowedFeatureOf(character, feature) : undefined;
                return synth && borrowed && character ? (
                  <>
                    <Divider sx={{ my: 1.5 }} />
                    <UsageCounterField
                      feature={borrowed}
                      character={character}
                      onSet={onSetUsageCounter}
                      counterOverride={synth}
                    />
                  </>
                ) : null;
              })()}
              {hasEffectToggles(feature) && (
                <>
                  <Divider sx={{ my: 1.5 }} />
                  {renderEffectToggles(feature)}
                  {feature.id === 'animaux-r5' && character && (
                    <AnimalFormSelector character={character} onSetInput={onSetEffectInput} />
                  )}
                </>
              )}
              {elementalSelectorConfig(feature) && character && (
                <>
                  <Divider sx={{ my: 1.5 }} />
                  <ElementResistanceSelector feature={feature} character={character} onSetInput={onSetEffectInput} />
                </>
              )}
              {finesseAttackEffect(feature) && character && (
                <>
                  <Divider sx={{ my: 1.5 }} />
                  <FinesseAttackSelector feature={feature} character={character} onSetInput={onSetEffectInput} />
                </>
              )}
              {feature.usageCounter &&
                character &&
                // r4/r5 (pool + sorts reproduits) : les boutons « Créer cet élixir » vivent dans les
                // blocs de sorts reproduits ci-dessus → pas de bouton unique ici.
                !(feature.usageCounter.poolInPathHeader && feature.referencedFeatures?.length) &&
                // PER-74 : masqué si une capacité possédée lève toute limite (usage illimité).
                !isUsageCounterHidden(feature.usageCounter, character.featureIds) && (
                  <>
                    <Divider sx={{ my: 1.5 }} />
                    {feature.usageCounter.poolInPathHeader ? (
                      // Rangs 1-3 (recette unique) : bouton de production nommé d'après la capacité,
                      // qui décompte la réserve (barre de l'en-tête) et matérialise la dose.
                      <CreateElixirButton feature={feature} character={character} onCreate={onCreateElixir} />
                    ) : (
                      <UsageCounterField
                        feature={feature}
                        character={character}
                        onSet={onSetUsageCounter}
                        onLiftShortRestLock={onLiftShortRestLock}
                      />
                    )}
                  </>
                )}
              {/* PER-162 : surcoût mana croissant (Foudres divines) — bloc dédié, indépendant des compteurs. */}
              {feature.escalatingManaCost && character && (
                <>
                  <Divider sx={{ my: 1.5 }} />
                  <EscalatingManaCostRow feature={feature} character={character} onSet={onSetUsageCounter} />
                </>
              )}
              {repl?.replacedFeature && (
                <Accordion
                  disableGutters
                  elevation={0}
                  sx={{ mt: 1.5, bgcolor: 'transparent', border: 0, '&::before': { display: 'none' } }}
                >
                  <AccordionSummary
                    expandIcon={<ExpandMoreIcon />}
                    sx={{ minHeight: 0, px: 0, '& .MuiAccordionSummary-content': { my: 0.5 } }}
                  >
                    <ReplacedSlotHeader feature={repl.replacedFeature} />
                  </AccordionSummary>
                  <AccordionDetails sx={{ px: 0, pt: 0 }}>
                    <ReplacedSlotBlock
                      feature={repl.replacedFeature}
                      abilities={abilities}
                      level={level}
                      showHeader={false}
                    />
                  </AccordionDetails>
                </Accordion>
              )}
            </AccordionDetails>
          </Accordion>
          );
        })}
      </Stack>
    </Box>
  );
}

/** Emplacement de capacité non acquise : bloc fantôme en pointillés (vue colonne). */
function GhostBlock() {
  return (
    <Box
      aria-hidden
      sx={{
        minHeight: 56,
        border: 1,
        borderStyle: 'dashed',
        borderColor: (theme) => alpha(theme.palette.text.primary, 0.22),
        borderRadius: 1,
      }}
    />
  );
}

/** Colonne fantôme : voie potentielle non encore choisie (vue colonne). */
function GhostColumn({ gridColumn }: { gridColumn: number }) {
  return (
    <Box
      aria-hidden
      sx={{
        gridColumn,
        gridRow: `1 / span ${PATH_RANK_COUNT + 1}`,
        display: 'grid',
        gridTemplateRows: 'subgrid',
        opacity: 0.6,
      }}
    >
      {/* En-tête vide : occupe la ligne d'en-tête partagée, sans titre. */}
      <Box />
      {Array.from({ length: PATH_RANK_COUNT }).map((_, i) => (
        <GhostBlock key={i} />
      ))}
    </Box>
  );
}

/**
 * Colonne de PRESTIGE réservée mais VIDE (aucune voie de prestige choisie). Contrairement
 * à `GhostColumn`, elle porte un en-tête libellé « Voie de prestige » pour signaler que cet
 * emplacement est réservé à l'unique voie de prestige, à part des 6 voies ordinaires (rendue
 * estompée, `opacity: 0.6`).
 */
function PrestigeGhostColumn({ gridColumn }: { gridColumn: number }) {
  return (
    <Box
      sx={{
        gridColumn,
        gridRow: `1 / span ${PATH_RANK_COUNT + 1}`,
        display: 'grid',
        gridTemplateRows: 'subgrid',
        opacity: 0.6,
      }}
    >
      {/* En-tête : libellé de l'emplacement réservé (pas de voie encore choisie). */}
      <Box sx={{ display: 'flex', alignItems: 'flex-end', pb: 0.5 }}>
        <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 700, fontStyle: 'italic' }}>
          Voie de prestige
        </Typography>
      </Box>
      {Array.from({ length: PATH_RANK_COUNT }).map((_, i) => (
        <GhostBlock key={i} />
      ))}
    </Box>
  );
}

/** Toutes les voies acquises d'un personnage, regroupées et consultables / éditables. */
export function FeaturesByPath({
  featureIds,
  classId,
  layout,
  abilities,
  level,
  masterDerived,
  onChange,
  manualFeatureIds,
  character,
  onChoiceChange,
  onEnableFeatureEditing,
  onToggleEffect,
  sessionStatusIds,
  onSetEffectInput,
  onSetUsageCounter,
  onLiftShortRestLock,
  onCreateElixir,
  onToggleCrystalActive,
  onSummonCompanionInstance,
  onPoisonUpdate,
  onWeaponModificationUpdate,
  concentration = false,
  testBonuses,
  verbatim = false,
}: FeaturesByPathProps) {
  // Réactivité au contenu payant (PER-321) : les capacités/voies gatées sont fusionnées dans
  // les registres `@/data` APRÈS le montage (fetch entitlé asynchrone) et RE-fusionnées si un
  // Fast Refresh dev réinitialise ces registres. S'abonner à la version de contenu force un
  // nouveau rendu à chaque (re-)fusion, sinon la fiche resterait figée sur « Aucune capacité
  // acquise. » tant qu'un rendu naturel n'a pas lieu.
  useContentVersion();
  // Confirmation du bouton « Réinitialiser d'après les montées de niveau » (édition libre).
  const [resetOpen, setResetOpen] = useState(false);
  // Prêtre spécialiste : la capacité divine occupe le slot d'une voie de prêtre
  // (voie d'accueil). On la RELOCALISE sous cette voie (override) et on la rend avec
  // un cadre de remplacement (bordure couleur d'origine + badge + cadre fantôme).
  const divineReplacement = divineSlotReplacement(character, featureIds);
  const replacements = divineReplacement
    ? new Map<string, SlotReplacement>([[divineReplacement.featureId, divineReplacement]])
    : undefined;
  const groups = groupFeaturesByPath(
    featureIds,
    divineReplacement
      ? new Map([[divineReplacement.featureId, divineReplacement.hostPathId]])
      : undefined,
  );

  // Voie du mage : elle remplace la voie de peuple mais le personnage conserve
  // la capacité de rang 1 de son peuple (p. 60). On fusionne cette capacité dans
  // le bloc de rang 1 de la voie du mage et on masque la voie de peuple, devenue
  // une simple ligne isolée. On ne fusionne que si la voie de peuple se réduit
  // bien à son seul rang 1 (sinon on préserve l'affichage pour ne rien perdre).
  const mageGroup = groups.find((g) => g.path?.type === 'mage');
  const ancestryGroup = mageGroup ? groups.find((g) => g.path?.type === 'ancestry') : undefined;
  const retainedFeature =
    ancestryGroup && ancestryGroup.features.length === 1
      ? ancestryGroup.features.find((f) => f.rank === 1)
      : undefined;
  const retainedPathName = retainedFeature ? ancestryGroup?.path?.name : undefined;
  const displayGroups = retainedFeature
    ? groups.filter((g) => g !== ancestryGroup)
    : groups;

  // Capacités grisées (avec leur raison) : exclusion mutuelle par interrupteur actif
  // (Aspect du démon → Beauté de la succube ; Armure de pierre ↔ Déphasage) OU
  // remplacement inconditionnel (Grand félin → Panthère).
  const disabledReasons = character ? disabledFeatureReasons(character) : undefined;
  const disabled = disabledReasons ? new Set(disabledReasons.keys()) : undefined;

  // Capacités dont l'USAGE est gêné par l'armure portée (restriction fine par profil d'origine,
  // PER-86) OU désactivées faute de bouclier (Voie du bouclier, PER-142) : id → message
  // d'avertissement. Rendu visuellement par PathBlock (rang désaturé + infobulle/notice), et non
  // en avertissement de conformité (choix propriétaire). Même patron pour les deux causes.
  const armorRestrictedReasons = character
    ? new Map<string, string>([
        ...featureArmorRestrictionViolations(character, rulesContext).map(
          (v) => [v.featureId, featureArmorRestrictionMessage(v)] as const,
        ),
        ...[...shieldDisabledFeatureIds(character, rulesContext)].map(
          (id) => [id, shieldRequiredMessage()] as const,
        ),
        // PER-74 — capacités de la Voie de l'archer arcanique désactivées faute d'arc/arbalète en
        // main (p. 137). Même rendu (désaturé + notice) que la Voie du bouclier ci-dessus.
        ...[...rangedWeaponDisabledFeatureIds(character, rulesContext)].map(
          (id) => [id, rangedWeaponRequiredMessage()] as const,
        ),
        // PER-74 — capacités de la Voie du combat à deux armes désactivées sans une arme dans chaque
        // main (p. 73), Combattant héroïque excepté. Même rendu (désaturé + notice) que la Voie du bouclier.
        ...[...dualWieldDisabledFeatureIds(character, rulesContext)].map(
          (id) => [id, dualWieldRequiredMessage()] as const,
        ),
        // PER-74 — capacités d'une voie qui fixe SON PROPRE plafond d'armure (Voie du danseur de
        // guerre, p. 150), désactivées tant qu'une armure plus encombrante est portée. Même rendu
        // (désaturé + notice) que la Voie du bouclier ; le message porte l'armure plafond et la page.
        ...pathArmorDisabledReasons(character, rulesContext),
        // PER-74 — capacités du flibustier (Coup de crosse / Sabre au poing) non jouables faute de la
        // bonne arme en main (p. 141-142). Grisage VISUEL uniquement (la maîtrise des armes à poudre reste
        // valide) → même canal que la Voie du bouclier, jamais dans `activeFeatureIdsForMods`.
        ...wieldDisabledReasons(character),
        // PER-144 — sort emprunté de rang 2 via « Talent pour la magie » (elfe haut) non lançable
        // tant qu'une armure est portée (p. 50). Même rendu (désaturé + barré + notice) que PER-153,
        // sur retour propriétaire : ce n'est pas une désactivation d'effet mais l'elfe ne peut lancer
        // le sort qu'en retirant son armure.
        ...[...magicTalentSpellsBlockedByArmor(character)].map(
          (id) => [id, magicTalentArmorBlockMessage()] as const,
        ),
      ])
    : undefined;

  // PER-146 — compteurs d'usage SYNTHÉTIQUES injectés sur la carte d'une capacité hôte quand une armure
  // est portée (aujourd'hui : « Don étrange » du gnome → 1 usage/jour sur son sort d'ensorceleur
  // emprunté, p. 53). Indexés par id de la capacité hôte ; vide sans armure / capacité / emprunt.
  const borrowedArmorUsageCounters = character
    ? computeBorrowedArmorUsageCounters(character)
    : undefined;

  // PER-74 — Capacité fabuleuse (spécialiste r5) : capacité (L) sublimée en (A), ou sort (A) qui
  // bénéficie de la concentration (−2 PM permanent) sans passer en (L). Résolu une fois ici, appliqué
  // par PathBlock au rendu de la capacité cible DANS SA VOIE (marqueurs + coût de mana).
  const fabulousTarget = character ? fabulousCapacityTarget(character) : null;

  const owned = new Set(featureIds);
  // `FeaturePathAutocomplete` regroupe/trie lui-même par voie (en-têtes colorés par profil) :
  // on ne lui passe que les ids acquérables (non détenus).
  const addableIds = onChange
    ? featureCatalog.filter((f) => !owned.has(f.id)).map((f) => f.id)
    : [];

  const remove = (featureId: string) => onChange?.(featureIds.filter((id) => id !== featureId));
  const add = (featureId: string) => {
    if (!owned.has(featureId)) onChange?.([...featureIds, featureId]);
  };

  // Réinitialisation d'après les montées de niveau (PER-73, retour d'UX) : ensemble
  // CANONIQUE reconstruit en rejouant l'historique, et diff avec la fiche courante —
  // capacités à RESTITUER (supprimées à la main) et à RETIRER (ajoutées à la main).
  // Disponible uniquement en édition (`onChange`) et si l'historique existe.
  const canonicalIds = character && onChange ? featureIdsFromHistory(character) : null;
  const toRestore = canonicalIds ? canonicalIds.filter((id) => !owned.has(id)) : [];
  const toRemove = canonicalIds ? featureIds.filter((id) => !canonicalIds.includes(id)) : [];
  const resetDivergence = toRestore.length + toRemove.length > 0;
  const applyReset = () => {
    if (canonicalIds) onChange?.(canonicalIds);
    setResetOpen(false);
  };
  const featureName = (id: string) => featureById.get(id)?.name ?? id;

  // La voie de prestige occupe une COLONNE DÉDIÉE et réservée (la 7ᵉ), à part des 6 voies
  // ordinaires (peuple/mage + 5 profils). Les autres voies s'écoulent depuis la gauche (voie
  // de peuple en premier) ; la voie de prestige, elle, reste isolée dans sa colonne réservée.
  const prestige = displayGroups.filter((g) => g.path?.type === 'prestige');
  const others = displayGroups.filter((g) => g.path?.type !== 'prestige');
  // Colonnes fantômes des voies ORDINAIRES non encore choisies : de la première libre jusqu'à
  // la 6ᵉ colonne incluse (la voie de prestige n'entre PAS dans ce décompte).
  const ghostColumns: number[] = [];
  for (let c = others.length + 1; c <= PROFILE_COLUMN_COUNT; c++) {
    ghostColumns.push(c);
  }
  // Largeur de la zone de prestige : 1 colonne réservée dans le cas normal. On tolère >1 voie
  // de prestige (données incohérentes) sans casser la grille, en élargissant la zone réservée.
  const prestigeColSpan = Math.max(1, prestige.length);
  const totalColumnCount = PROFILE_COLUMN_COUNT + prestigeColSpan;

  return (
    // Déclinaison des capacités par élément draconique (PER-74) : le personnage est fourni une fois
    // ici, les points d'affichage (noms, `richText`, libellés d'interrupteurs) déclinent via les hooks.
    <FeatureDeclensionContext.Provider value={character ?? null}>
    <FeatureVerbatimContext.Provider value={verbatim}>
    <Stack spacing={2.5}>
      {displayGroups.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          Aucune capacité acquise.
        </Typography>
      ) : layout === 'columns' ? (
        <Box
          sx={{
            display: 'grid',
            // ≥ md : les 6 voies ordinaires + la colonne de prestige réservée se partagent la
            // largeur dispo (aucun débordement). < md : largeur minimale par colonne, défilement H.
            gridTemplateColumns: {
              xs: `repeat(${totalColumnCount}, minmax(160px, 1fr))`,
              md: `repeat(${totalColumnCount}, minmax(0, 1fr))`,
            },
            // Lignes partagées par toutes les colonnes (subgrid) : en-tête + rangs.
            // L'en-tête prend la hauteur du titre le plus haut, les rangs s'alignent.
            gridTemplateRows: `auto repeat(${PATH_RANK_COUNT}, minmax(56px, auto))`,
            // ≥ md : gap resserré (4px au lieu de 8px) pour rendre ~24px de largeur à la rangée de
            // 7 colonnes (option 4, PER-74). En < md (défilement H) on garde 8px, plus aéré.
            gap: { xs: 1, md: 0.5 },
            overflowX: { xs: 'auto', md: 'visible' },
            pb: { xs: 1, md: 0 },
          }}
        >
          {others.map((group, i) => (
            <PathBlock
              key={group.pathId}
              group={group}
              classId={classId}
              onRemove={onChange ? remove : undefined}
              manualFeatureIds={manualFeatureIds}
              abilities={abilities}
              level={level}
              masterDerived={masterDerived}
              compact
              gridColumn={i + 1}
              retainedFeature={group === mageGroup ? retainedFeature : undefined}
              retainedPathName={group === mageGroup ? retainedPathName : undefined}
              character={character}
              onChoiceChange={onChoiceChange}
              onEnableFeatureEditing={onEnableFeatureEditing}
              onToggleEffect={onToggleEffect}
              sessionStatusIds={sessionStatusIds}
              onSetEffectInput={onSetEffectInput}
              onSetUsageCounter={onSetUsageCounter}
              onLiftShortRestLock={onLiftShortRestLock}
              onCreateElixir={onCreateElixir}
              onToggleCrystalActive={onToggleCrystalActive}
              onSummonCompanionInstance={onSummonCompanionInstance}
              onPoisonUpdate={onPoisonUpdate}
              onWeaponModificationUpdate={onWeaponModificationUpdate}
              disabledIds={disabled}
              disabledReasons={disabledReasons}
              armorRestrictedReasons={armorRestrictedReasons}
              borrowedArmorUsageCounters={borrowedArmorUsageCounters}
              replacements={replacements}
              concentration={concentration}
              fabulousTarget={fabulousTarget}
              testBonuses={testBonuses}
            />
          ))}
          {ghostColumns.map((c) => (
            <GhostColumn key={`ghost-col-${c}`} gridColumn={c} />
          ))}
          {/* Colonne de prestige RÉSERVÉE mais vide : aucune voie de prestige choisie. Toujours
              affichée (emplacement réservé), avec son libellé « Voie de prestige » estompé. */}
          {prestige.length === 0 && <PrestigeGhostColumn gridColumn={PRESTIGE_COLUMN} />}
          {prestige.map((group, i) => (
            <PathBlock
              key={group.pathId}
              group={group}
              classId={classId}
              onRemove={onChange ? remove : undefined}
              manualFeatureIds={manualFeatureIds}
              abilities={abilities}
              level={level}
              masterDerived={masterDerived}
              compact
              gridColumn={PRESTIGE_COLUMN + i}
              character={character}
              onChoiceChange={onChoiceChange}
              onEnableFeatureEditing={onEnableFeatureEditing}
              onToggleEffect={onToggleEffect}
              sessionStatusIds={sessionStatusIds}
              onSetEffectInput={onSetEffectInput}
              onSetUsageCounter={onSetUsageCounter}
              onLiftShortRestLock={onLiftShortRestLock}
              onCreateElixir={onCreateElixir}
              onToggleCrystalActive={onToggleCrystalActive}
              onSummonCompanionInstance={onSummonCompanionInstance}
              onPoisonUpdate={onPoisonUpdate}
              onWeaponModificationUpdate={onWeaponModificationUpdate}
              disabledIds={disabled}
              disabledReasons={disabledReasons}
              armorRestrictedReasons={armorRestrictedReasons}
              borrowedArmorUsageCounters={borrowedArmorUsageCounters}
              replacements={replacements}
              concentration={concentration}
              fabulousTarget={fabulousTarget}
              testBonuses={testBonuses}
            />
          ))}
        </Box>
      ) : (
        <Stack spacing={2.5}>
          {displayGroups.map((group) => (
            <PathBlock
              key={group.pathId}
              group={group}
              classId={classId}
              onRemove={onChange ? remove : undefined}
              manualFeatureIds={manualFeatureIds}
              abilities={abilities}
              level={level}
              masterDerived={masterDerived}
              retainedFeature={group === mageGroup ? retainedFeature : undefined}
              retainedPathName={group === mageGroup ? retainedPathName : undefined}
              character={character}
              onChoiceChange={onChoiceChange}
              onEnableFeatureEditing={onEnableFeatureEditing}
              onToggleEffect={onToggleEffect}
              sessionStatusIds={sessionStatusIds}
              onSetEffectInput={onSetEffectInput}
              onSetUsageCounter={onSetUsageCounter}
              onLiftShortRestLock={onLiftShortRestLock}
              onCreateElixir={onCreateElixir}
              onToggleCrystalActive={onToggleCrystalActive}
              onSummonCompanionInstance={onSummonCompanionInstance}
              onPoisonUpdate={onPoisonUpdate}
              onWeaponModificationUpdate={onWeaponModificationUpdate}
              disabledIds={disabled}
              disabledReasons={disabledReasons}
              armorRestrictedReasons={armorRestrictedReasons}
              borrowedArmorUsageCounters={borrowedArmorUsageCounters}
              replacements={replacements}
              concentration={concentration}
              fabulousTarget={fabulousTarget}
              testBonuses={testBonuses}
            />
          ))}
        </Stack>
      )}

      {onChange && <AddFeatureField options={addableIds} onAdd={add} />}

      {/* Réinitialisation d'après les montées de niveau (bas-droite du bloc, en édition
          seulement). Restaure l'ensemble des capacités que la progression impose — utile
          pour récupérer une capacité supprimée par mégarde sur la fiche libre. Désactivé
          quand la fiche est déjà conforme à l'historique (rien à réinitialiser). */}
      {onChange && canonicalIds && (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <AppTooltip
            title={
              resetDivergence
                ? 'Rétablit exactement les capacités acquises à la création et aux montées de niveau (annule les ajouts/suppressions manuels de la fiche).'
                : 'Les capacités de la fiche correspondent déjà aux montées de niveau — rien à réinitialiser.'
            }
          >
            <span>
              <Button
                size="small"
                color="warning"
                variant="outlined"
                startIcon={<RestartAltIcon />}
                disabled={!resetDivergence}
                onClick={() => setResetOpen(true)}
              >
                Réinitialiser d’après les montées de niveau
              </Button>
            </span>
          </AppTooltip>
        </Box>
      )}

      <Dialog open={resetOpen} onClose={() => setResetOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <WarningAmberOutlinedIcon color="warning" />
          Réinitialiser les capacités ?
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" sx={{ mb: toRestore.length || toRemove.length ? 2 : 0 }}>
            Les capacités de la fiche vont être remplacées par celles issues de la création
            et des montées de niveau. Les modifications manuelles ci-dessous seront annulées.
          </Typography>
          {toRestore.length > 0 && (
            <Box sx={{ mb: toRemove.length ? 2 : 0 }}>
              <Typography
                variant="caption"
                color="success.main"
                sx={{ fontWeight: 700, display: 'block', mb: 0.5 }}
              >
                Restaurées ({toRestore.length}) — supprimées à la main :
              </Typography>
              <Stack component="ul" sx={{ m: 0, pl: 2.5 }} spacing={0.25}>
                {toRestore.map((id) => (
                  <Typography key={id} component="li" variant="body2">
                    {featureName(id)}
                  </Typography>
                ))}
              </Stack>
            </Box>
          )}
          {toRemove.length > 0 && (
            <Box>
              <Typography
                variant="caption"
                color="error.main"
                sx={{ fontWeight: 700, display: 'block', mb: 0.5 }}
              >
                Retirées ({toRemove.length}) — ajoutées à la main :
              </Typography>
              <Stack component="ul" sx={{ m: 0, pl: 2.5 }} spacing={0.25}>
                {toRemove.map((id) => (
                  <Typography key={id} component="li" variant="body2">
                    {featureName(id)}
                  </Typography>
                ))}
              </Stack>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResetOpen(false)}>Annuler</Button>
          <Button color="warning" variant="contained" onClick={applyReset}>
            Réinitialiser
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
    </FeatureVerbatimContext.Provider>
    </FeatureDeclensionContext.Provider>
  );
}
