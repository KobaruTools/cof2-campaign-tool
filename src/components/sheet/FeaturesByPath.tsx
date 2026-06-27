'use client';

import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import RemoveIcon from '@mui/icons-material/Remove';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import EditIcon from '@mui/icons-material/Edit';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import PushPinIcon from '@mui/icons-material/PushPin';
import SelfImprovementIcon from '@mui/icons-material/SelfImprovement';
import ViewColumnIcon from '@mui/icons-material/ViewColumn';
import ViewStreamIcon from '@mui/icons-material/ViewStream';
import Accordion from '@mui/material/Accordion';
import Alert from '@mui/material/Alert';
import AccordionDetails from '@mui/material/AccordionDetails';
import AccordionSummary from '@mui/material/AccordionSummary';
import Autocomplete from '@mui/material/Autocomplete';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import { useState } from 'react';
import { features as featureCatalog, featureById, pathById, classById, priestGodById } from '@/data';
import type { Feature, Path, ResistibleDamageType, UsageCounter } from '@/data/schema';
import type { Abilities, DerivedStats } from '@/lib/engine';
import type { Character, FeatureChoiceSelection } from '@/lib/character/types';
import { featureChoiceDefs, hasActionableChoice, hasUnmadeChoice } from '@/lib/character/choices';
import { animalFormCategories } from '@/lib/character/animalForms';
import {
  conditionalEffectsOf,
  creatureBonusDiceForPath,
  disabledFeatureReasons,
  usageCounterMaximum,
  type DisabledFeatureReason,
} from '@/lib/character/effects';
import { classColor } from '@/lib/ui/classColors';
import { DamageTypeIcon } from '@/components/DamageTypeIcon';
import { DefenseBadge } from '@/components/sheet/DefenseBadge';
import { FeatureLabel } from '@/components/FeatureLabel';
import { FeatureMarkerHexes } from '@/components/FeatureMarkerHex';
import { SpellManaBadge } from '@/components/SpellManaBadge';
import { ClassIcon } from '@/components/ClassIcon';
import { FeatureText } from '@/components/sheet/FeatureRichText';
import { CreatureStatBlock } from '@/components/sheet/CreatureStatBlock';
import { FeatureChoiceField } from '@/components/sheet/FeatureChoiceField';
import { FeatureEffectToggles } from '@/components/sheet/FeatureEffectToggles';

/**
 * Couleur du badge « WIP » (PER-72) : jaune franc, VOLONTAIREMENT distinct de l'orange « warning »
 * du système (réservé aux « choix à faire »), pour ne pas confondre les deux codes couleur. Appliqué
 * en `sx` (le thème MUI n'a pas de teinte jaune dédiée) sur un Chip outlined sans prop `color`.
 */
const WIP_CHIP_SX = { color: '#ffeb3b', borderColor: '#ffeb3b' } as const;

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

/** Nombre de colonnes affichées (6 voies maximum, cf. règles CO2). */
const PATH_COLUMN_COUNT = 6;

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
  fallbackPathName,
  fallbackColor,
}: {
  feature: Feature;
  isReplacement: boolean;
  fallbackClassId?: string;
  fallbackPathName: string;
  fallbackColor?: string;
}) {
  const origin = isReplacement ? pathTitleInfo(feature) : null;
  const classId = origin?.classId ?? fallbackClassId;
  const pathName = origin?.pathName ?? fallbackPathName;
  const color = origin?.color ?? fallbackColor;
  return (
    <>
      {classId && <ClassIcon classId={classId} size={18} sx={{ color: color ?? undefined, flexShrink: 0 }} />}
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
  if (!character) return undefined;
  const defs = feature.choices;
  if (!defs) return undefined;
  const sels = character.featureChoices?.[feature.id];
  if (!sels) return undefined;
  for (let i = 0; i < defs.length; i++) {
    if (defs[i].kind === 'feature-from-path') {
      const sel = sels[i];
      if (typeof sel === 'string') return featureById.get(sel);
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
}: {
  feature: Feature;
  abilities?: Abilities;
  level?: number;
}) {
  const path = pathById.get(feature.pathId);
  const classId = path?.type === 'class' ? path.classIds[0] : undefined;
  const color = classId ? classColor(classId) : undefined;
  const pathName = path?.name ?? feature.pathId;
  const className = classId ? classById.get(classId)?.name : undefined;
  return (
    // Carte teintée/bordée à la couleur de la VOIE SOURCE, façon « slot divin » du prêtre —
    // mais SANS remplacement : elle se superpose, l'hôte reste actif (PER-120).
    <Box
      sx={{
        p: 1,
        // Cadre discret (1px) comme les autres cartes ; la couleur de bordure/teinte rappelle
        // simplement la voie source, sans surcharger visuellement (retour propriétaire).
        border: 1,
        borderColor: color ?? 'divider',
        borderRadius: 1,
        bgcolor: color ? alpha(color, 0.06) : (theme) => alpha(theme.palette.text.primary, 0.04),
      }}
    >
      <Typography variant="caption" sx={{ color: color ?? 'text.secondary', fontWeight: 700, display: 'block', mb: 0.25 }}>
        <Box component="span" sx={{ mr: 0.5 }}>✦</Box>
        Capacité empruntée — {pathName}
        {className ? ` (${className})` : ''}
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

/** Libellé d'une capacité dans le sélecteur d'ajout : voie — rang — nom. */
function featureOptionLabel(feature: Feature): string {
  const pathName = pathById.get(feature.pathId)?.name ?? feature.pathId;
  return `${pathName} — Rang ${feature.rank} — ${feature.name}${feature.isSpell ? '*' : ''}`;
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
   * Bascule d'un interrupteur d'effet conditionnel (PER-67). État de jeu
   * transitoire, activable à tout moment (même hors mode édition). Absent (sans
   * `character`) → interrupteurs désactivés.
   */
  onToggleEffect?: (featureId: string, index: number, active: boolean) => void;
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
    <Tooltip title="Ajoutée manuellement sur la fiche (hors wizard)" arrow>
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
    </Tooltip>
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
        <Tooltip title="Affichage en lignes" arrow>
          <ViewStreamIcon fontSize="small" />
        </Tooltip>
      </ToggleButton>
      <ToggleButton value="columns" aria-label="Affichage en colonnes">
        <Tooltip title="Affichage en colonnes" arrow>
          <ViewColumnIcon fontSize="small" />
        </Tooltip>
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
      <Tooltip
        title="Concentration accrue : les sorts en (A) coûtent 2 PM de moins (plancher 0) et deviennent une action limitée (L) (p. 228)"
        arrow
      >
        <SelfImprovementIcon fontSize="small" />
      </Tooltip>
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
 * Sélecteur d'ÉLÉMENT RÉSISTÉ pour une RD à scope choisi (ex. Maîtrise des éléments, PER-137). État
 * de jeu « à la table » (stocké dans `Character.effectInputs[featureId]`, éditable HORS mode édition,
 * comme les interrupteurs). Le sélecteur tient lieu d'activation : « Aucun » = inactif (pas de RD),
 * un élément = sort actif sur cet élément (échangeable). En lecture seule, affiche l'élément retenu.
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
  const options = damageReductionScopeChoice(feature);
  if (!options) return null;
  const value = character.effectInputs?.[feature.id] ?? '';
  if (!onSetInput) {
    return value ? (
      <Typography variant="caption" component="div" sx={{ mt: 1, fontWeight: 600 }}>
        Élément résisté : {ELEMENT_CHOICE_LABEL[value as ResistibleDamageType] ?? value}
      </Typography>
    ) : null;
  }
  return (
    <Box sx={{ mt: 1 }} onClick={(e) => e.stopPropagation()}>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, fontWeight: 600 }}>
        Élément résisté (à choisir à la table)
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
function UsageCounterField({
  feature,
  character,
  onSet,
}: {
  feature: Feature;
  character: Character;
  onSet?: (counterKey: string, value: number, max: number) => void;
}) {
  const counter = feature.usageCounter;
  if (!counter) return null;
  const max = usageCounterMaximum(counter, character, feature);
  const key = usageCounterKey(counter, feature);
  const remaining = Math.max(0, Math.min(max, character.usageCounters?.[key] ?? max));
  // Coût d'un usage de CETTE capacité (PER-130) : le pas de décrément/incrément. La Furie du berserk
  // consomme 2 points de rage et n'est utilisable que s'il en reste au moins 2.
  const cost = counter.cost ?? 1;
  const label = counter.label ?? 'Usages restants';
  const exhausted = remaining <= 0;
  return (
    <Stack direction="row" spacing={1} sx={{ mt: 1, alignItems: 'center', flexWrap: 'wrap' }}>
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
          disabled={remaining < cost}
          onClick={() => onSet(key, remaining - cost, max)}
        >
          <RemoveIcon fontSize="small" />
        </IconButton>
      )}
      <Typography
        variant="body2"
        sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums', minWidth: 36, textAlign: 'center' }}
      >
        {remaining} / {max}
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
        <Tooltip title="Réinitialiser au maximum" arrow>
          <span>
            <IconButton
              size="small"
              aria-label="Réinitialiser"
              disabled={remaining >= max}
              onClick={() => onSet(key, max, max)}
            >
              <RestartAltIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      )}
      {exhausted && <Chip label="épuisé" size="small" color="error" variant="outlined" />}
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
function CompactUsageIndicator({ feature, character }: { feature: Feature; character: Character }) {
  const counter = feature.usageCounter;
  if (!counter) return null;
  const max = usageCounterMaximum(counter, character, feature);
  const key = usageCounterKey(counter, feature);
  const remaining = Math.max(0, Math.min(max, character.usageCounters?.[key] ?? max));
  const label = counter.label ?? 'Usages restants';
  return (
    <Tooltip title={`${label} : ${remaining} / ${max}`} arrow>
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
    </Tooltip>
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
  onToggleEffect,
  onSetEffectInput,
  onSetUsageCounter,
  disabledIds,
  disabledReasons,
  replacements,
  concentration = false,
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
  /** Bascule d'un interrupteur d'effet conditionnel (fiche permissive, PER-67). */
  onToggleEffect?: (featureId: string, index: number, active: boolean) => void;
  /** Saisie libre corrélée à une capacité (animal de Forme animale, PER-70). */
  onSetEffectInput?: (featureId: string, value: string) => void;
  /** Décompte d'une capacité à usages limités (Les sept vies du chat, PER-70). */
  onSetUsageCounter?: (counterKey: string, value: number, max: number) => void;
  /**
   * Capacités désactivées par exclusion mutuelle (un interrupteur actif les grise) :
   * rendues semi-transparentes + grisées, interrupteur non-interactif, détail conservé.
   */
  disabledIds?: Set<string>;
  /** Raison du grisage par capacité (message « pourquoi désactivé » : exclusion / remplacement). */
  disabledReasons?: Map<string, DisabledFeatureReason>;
  /**
   * Capacités occupant un slot par REMPLACEMENT (capacité divine du prêtre spécialiste,
   * p. 122) : rendues avec un cadre fantôme du slot natif + bordure couleur d'origine
   * + badge. Indexé par id de la capacité remplaçante.
   */
  replacements?: Map<string, SlotReplacement>;
  /** Concentration accrue active (p. 228) : coût réduit + (A)→(L) pour les sorts éligibles. */
  concentration?: boolean;
}) {
  const { path, features } = group;
  // Rang ATTEINT dans la voie = plus haut rang acquis parmi ses capacités. Sert à
  // résoudre le terme « rang » des textes enrichis (« son rang » = rang de la voie
  // courante, dynamique), partagé par toutes les capacités du bloc.
  const pathRank = features.reduce((max, f) => Math.max(max, f.rank), 0);
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
  const color = ownerClassId ? classColor(ownerClassId) : null;
  // Progression dans la voie : capacités acquises sur le total de la voie.
  const total = path?.featureIds.length;
  // Vue colonne : la capacité ouverte dans la modale de détail (null = fermée).
  const [openFeature, setOpenFeature] = useState<Feature | null>(null);
  // Vue colonne : capacité dont on édite le choix dans une modale dédiée (le bloc
  // est trop petit pour héberger un sélecteur — un bouton crayon l'ouvre, PER-68).
  const [choiceEditFeature, setChoiceEditFeature] = useState<Feature | null>(null);

  // Choix portés par une capacité (PER-66/68), en LECTURE SEULE : affichés sous
  // la description (modale / bloc déployé) et en compact dans le bloc colonne.
  // L'édition passe toujours par un sélecteur dédié (accordéon en vue liste,
  // modale crayon en vue colonne), jamais inline dans le petit bloc.
  const renderChoiceDisplay = (feature: Feature, opts: { compact?: boolean } = {}) => {
    if (!character || featureChoiceDefs(feature.id).length === 0) return null;
    return (
      <FeatureChoiceField
        character={character}
        featureId={feature.id}
        mode="display"
        compact={opts.compact}
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
    return reason.kind === 'replaced'
      ? `Remplacée par ${reason.byFeatureName} : cette capacité n'est plus disponible.`
      : `Désactivée tant que ${reason.byFeatureName} est active (ne se cumulent pas).`;
  };

  /** Bandeau d'explication du grisage, en tête du détail (modale / bloc dépliable). */
  const renderDisabledNotice = (feature: Feature) => {
    const message = disabledMessage(feature);
    if (!message) return null;
    return (
      <Alert severity="info" variant="outlined" sx={{ mb: 1.5 }}>
        {message}
      </Alert>
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
      />
    );
  };

  const header = (
    <Stack
      direction="row"
      spacing={0.5}
      sx={{
        alignItems: compact ? 'flex-start' : 'center',
        mb: compact ? 0 : 1,
        pl: compact ? 1 : 1.5,
        borderLeft: 3,
        borderColor: color ?? 'divider',
      }}
    >
      <Typography
        variant={compact ? 'body2' : 'subtitle1'}
        sx={{
          fontWeight: 600,
          color: color ?? 'text.primary',
          minWidth: 0,
          lineHeight: 1.2,
          wordBreak: 'break-word',
        }}
      >
        {path?.name ?? group.pathId}
      </Typography>
      {compact ? (
        // Vue colonne : icône de profil au-dessus du compteur de rangs.
        <Stack spacing={0.25} sx={{ ml: 'auto', flexShrink: 0, alignItems: 'flex-end' }}>
          {ownerClassId && <ClassIcon classId={ownerClassId} size={18} />}
          {total != null && (
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
              {features.length}/{total}
            </Typography>
          )}
        </Stack>
      ) : (
        // Vue liste : icône de profil juste à droite du titre.
        ownerClassId && <ClassIcon classId={ownerClassId} size={18} sx={{ ml: 0.5 }} />
      )}
    </Stack>
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
          const borrowedPath = borrowed ? pathById.get(borrowed.pathId) : undefined;
          const borrowedClassId = borrowedPath?.type === 'class' ? borrowedPath.classIds[0] : undefined;
          const borrowedColor = borrowedClassId ? classColor(borrowedClassId) : undefined;
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
              px: 1,
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
                    : 'transparent',
              // Carte de devant d'un emprunt (PER-120) : fond OPAQUE (teinte source sur paper)
              // pour qu'elle masque la case décalée derrière — sinon la couleur de l'hôte
              // transparaîtrait à travers la carte de la capacité empruntée.
              ...(borrowed && borrowedColor
                ? {
                    backgroundColor: 'background.paper',
                    backgroundImage: `linear-gradient(${alpha(borrowedColor, 0.06)}, ${alpha(borrowedColor, 0.06)})`,
                  }
                : {}),
              '&:hover': { bgcolor: color ? alpha(color, 0.14) : 'action.hover' },
              ...(onRemove
                ? {
                    '& .feature-remove': { opacity: 0, transition: 'opacity .15s' },
                    '&:hover .feature-remove, &:focus-within .feature-remove': { opacity: 1 },
                  }
                : {}),
              // Désactivée par exclusion mutuelle : grisée + transparente, mais le
              // clic d'ouverture du détail reste actif.
              ...(disabledSx(feature) ?? {}),
            }}
          >
            {/* Marqueurs hexagonaux centrés sur la ligne du haut du bloc. */}
            <FeatureMarkerHexes
              feature={feature}
              color={color ?? undefined}
              concentration={concentration}
              sx={{ position: 'absolute', top: 0, left: 6, transform: 'translateY(-50%)', zIndex: 1 }}
            />
            <SpellManaBadge
              feature={feature}
              concentration={concentration}
              color={color ?? undefined}
              sx={{ position: 'absolute', top: -8, right: -8, zIndex: 1 }}
            />
            {manualFeatureIds?.has(feature.id) && <ManualPin />}
            <Typography
              variant="body2"
              sx={{ fontWeight: 600, width: '100%', textAlign: 'left', wordBreak: 'break-word' }}
            >
              {repl && (
                <Tooltip
                  title={`Capacité divine de ${repl.godName ?? '—'}${
                    repl.replacedFeature ? ` — remplace ${repl.replacedFeature.name}` : ''
                  }`}
                  arrow
                >
                  <Box
                    component="span"
                    sx={{ color: repl.originColor, fontWeight: 700, mr: 0.5, cursor: 'help' }}
                  >
                    ✦
                  </Box>
                </Tooltip>
              )}
              {/* Emprunt (PER-120) : la carte de devant porte le VRAI nom de la capacité empruntée
                  (« Vivacité »), écrit normalement ; le nom de l'hôte est dans la case décalée derrière. */}
              {borrowed ? borrowed.name : feature.name}
            </Typography>
            {/* Badge WIP (PER-72) : capacité dont une partie de l'effet dépend d'un ticket extérieur
                non terminé (ex. pagne-r2 → PER-131). Suivi de relecture, pas une règle. */}
            {feature.wip && (
              <Tooltip title={feature.wip} arrow>
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
              </Tooltip>
            )}
            {/* Interrupteurs des effets conditionnels, compacts (état de jeu, libellé
                en infobulle) ; le détail cliquable héberge la version étiquetée. */}
            {hasEffectToggles(feature) && (
              <Box sx={{ mt: 0.5, width: '100%' }}>{renderEffectToggles(feature, { compact: true })}</Box>
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
                    title={`${feature.name} : ${label}`}
                    sources={[{ name: feature.name }]}
                    fullWidth={false}
                  />
                </Box>
              );
            })()}
            {/* Indicateur compact du compteur d'usages (lecture seule ; édition en
                modale). Ex. Les sept vies du chat : pastilles « N/6 ». */}
            {feature.usageCounter && character && (
              <CompactUsageIndicator feature={feature} character={character} />
            )}
            {/* Choix porté par la capacité, poussé en bas du bloc : valeur retenue
                (chip compact, lecture seule) + bouton crayon ouvrant la modale
                d'édition (second niveau d'édition — PER-68). Masqué pour un emprunt
                (PER-120) : la carte de la capacité empruntée affiche déjà le choix
                retenu → le tag serait redondant (édition possible via la modale). */}
            {hasChoices(feature) && !borrowed && (
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
                onClick={(e) => e.stopPropagation()}
              >
                {onChoiceChange && (
                  <Tooltip title="Modifier le choix" arrow>
                    <IconButton
                      size="small"
                      color={hasUnmadeChoice(character!, feature.id) ? 'warning' : 'primary'}
                      sx={{ p: 0.25, flexShrink: 0 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setChoiceEditFeature(feature);
                      }}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
                {renderChoiceDisplay(feature, { compact: true })}
              </Box>
            )}
            {onRemove && (
              <Tooltip title="Retirer la capacité" arrow>
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
              </Tooltip>
            )}
          </Box>
          );
          // Emprunt (PER-120) : on reprend la « case décalée » du slot divin, mais la boîte qui
          // dépasse derrière prend le contour + le fond de la VOIE HÔTE (celle qui reçoit l'emprunt)
          // et porte le nom de l'hôte (« Combattant aguerri ») — la carte de devant montrant la
          // capacité empruntée (« Vivacité »). Rien n'est grisé : l'hôte reste pleinement actif.
          return borrowed ? (
            <Box key={feature.id} sx={{ position: 'relative', pb: 2.5 }}>
              <Box
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: -5,
                  bottom: 0,
                  borderRadius: 1,
                  // Cadre discret, identique aux autres cartes du profil (1px `divider` + teinte
                  // 0.06 de la voie hôte) : la case décalée ne doit pas être plus marquée qu'elles.
                  border: 1,
                  borderColor: 'divider',
                  bgcolor: color ? alpha(color, 0.06) : 'transparent',
                  display: 'flex',
                  alignItems: 'flex-end',
                  // Titre de l'hôte collé à DROITE du bloc (dans la partie qui dépasse).
                  justifyContent: 'flex-end',
                }}
              >
                <Typography
                  variant="caption"
                  sx={{
                    px: 1,
                    // 2px d'espacement au-dessus et en dessous du titre dans la bande qui dépasse.
                    pt: 0.25,
                    pb: 0.25,
                    fontWeight: 600,
                    lineHeight: 1.2,
                    textAlign: 'right',
                    color: 'text.primary',
                    wordBreak: 'break-word',
                  }}
                >
                  {feature.name}
                </Typography>
              </Box>
              {cardInner}
            </Box>
          ) : (
            cardInner
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
                    <FeatureLabel feature={openFeature} concentration={concentration} />
                  </Box>
                  {openFeature.wip && (
                    <Tooltip title={openFeature.wip} arrow>
                      <Chip
                        label="WIP"
                        size="small"
                        variant="outlined"
                        sx={{ ...WIP_CHIP_SX, fontWeight: 700, cursor: 'help' }}
                      />
                    </Tooltip>
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
              <DialogContent dividers>
                {renderDisabledNotice(openFeature)}
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
                <FeatureText feature={openFeature} abilities={abilities} level={level} pathRank={effectiveRank(openFeature)} milestoneBonus={milestoneBonusFor(openFeature)} />
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
                {openFeature.creatureProfile && abilities && level != null && (
                  <Box sx={{ mt: 1.5 }}>
                    <CreatureStatBlock
                      profile={openFeature.creatureProfile}
                      abilities={abilities}
                      level={level}
                      rank={pathRank}
                      masterDerived={masterDerived}
                      bonusDieAbilities={
                        character ? creatureBonusDiceForPath(openFeature.pathId, character) : undefined
                      }
                    />
                  </Box>
                )}
                {hasChoices(openFeature) && (
                  <>
                    <Divider sx={{ my: 1.5 }} />
                    {renderChoiceDisplay(openFeature)}
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
                  // PER-120 : capacité empruntée (Combattant aguerri) rendue SOUS le texte/choix,
                  // sans remplacer la carte (l'effet de base de l'hôte reste appliqué).
                  const borrowed = borrowedFeatureOf(character, openFeature);
                  return borrowed ? (
                    <Box sx={{ mt: 1.5 }}>
                      <BorrowedFeatureBlock feature={borrowed} abilities={abilities} level={level} />
                    </Box>
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
                {damageReductionScopeChoice(openFeature) && character && (
                  <>
                    <Divider sx={{ my: 1.5 }} />
                    <ElementResistanceSelector
                      feature={openFeature}
                      character={character}
                      onSetInput={onSetEffectInput}
                    />
                  </>
                )}
                {openFeature.usageCounter && character && (
                  <>
                    <Divider sx={{ my: 1.5 }} />
                    <UsageCounterField
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
                <Button onClick={() => setChoiceEditFeature(null)}>Terminer</Button>
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
              bgcolor: repl ? alpha(repl.originColor, 0.1) : color ? alpha(color, 0.06) : 'transparent',
              '&::before': { display: 'none' },
              // Désactivée par exclusion mutuelle : grisée + transparente, mais
              // toujours dépliable (détail conservé).
              ...(disabledSx(feature) ?? {}),
            }}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Stack
                direction="row"
                spacing={1}
                sx={{ alignItems: 'center', flexWrap: 'wrap', flexGrow: 1 }}
              >
                <FeaturePathTitle
                  feature={feature}
                  isReplacement={!!repl}
                  fallbackClassId={ownerClassId ?? undefined}
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
                  <Tooltip title={feature.wip} arrow>
                    <Chip
                      label="WIP"
                      size="small"
                      variant="outlined"
                      sx={{ ...WIP_CHIP_SX, fontWeight: 700, cursor: 'help' }}
                    />
                  </Tooltip>
                )}
                {manualFeatureIds?.has(feature.id) && <ManualPin inline />}
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  {repl && (
                    <Tooltip
                      title={`Capacité divine de ${repl.godName ?? '—'}${
                        repl.replacedFeature ? ` — remplace ${repl.replacedFeature.name}` : ''
                      }`}
                      arrow
                    >
                      <Box
                        component="span"
                        sx={{ color: repl.originColor, fontWeight: 700, mr: 0.5, cursor: 'help' }}
                      >
                        ✦
                      </Box>
                    </Tooltip>
                  )}
                  <FeatureLabel feature={feature} concentration={concentration} />
                </Typography>
              </Stack>
              <SpellManaBadge
                feature={feature}
                concentration={concentration}
                color={color ?? undefined}
                sx={{ alignSelf: 'center', mr: 1 }}
              />
              {onRemove && (
                <Tooltip title="Retirer la capacité" arrow>
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
                </Tooltip>
              )}
            </AccordionSummary>
            <AccordionDetails>
              {renderDisabledNotice(feature)}
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
              <FeatureText feature={feature} abilities={abilities} level={level} pathRank={effectiveRank(feature)} milestoneBonus={milestoneBonusFor(feature)} />
              {feature.id === 'animaux-r5' && character && <AnimalFormsNote character={character} />}
              {feature.creatureProfile && abilities && level != null && (
                <Box sx={{ mt: 1.5 }}>
                  <CreatureStatBlock
                    profile={feature.creatureProfile}
                    abilities={abilities}
                    level={level}
                    rank={pathRank}
                    masterDerived={masterDerived}
                    bonusDieAbilities={
                      character ? creatureBonusDiceForPath(feature.pathId, character) : undefined
                    }
                  />
                </Box>
              )}
              {hasChoices(feature) && (
                <>
                  <Divider sx={{ my: 1.5 }} />
                  {onChoiceChange ? renderChoiceEditor(feature) : renderChoiceDisplay(feature)}
                </>
              )}
              {(() => {
                // PER-120 : capacité empruntée (Combattant aguerri) rendue SOUS le texte/choix,
                // sans remplacer la carte (l'effet de base de l'hôte reste appliqué).
                const borrowed = borrowedFeatureOf(character, feature);
                return borrowed ? (
                  <Box sx={{ mt: 1.5 }}>
                    <BorrowedFeatureBlock feature={borrowed} abilities={abilities} level={level} />
                  </Box>
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
              {damageReductionScopeChoice(feature) && character && (
                <>
                  <Divider sx={{ my: 1.5 }} />
                  <ElementResistanceSelector feature={feature} character={character} onSetInput={onSetEffectInput} />
                </>
              )}
              {feature.usageCounter && character && (
                <>
                  <Divider sx={{ my: 1.5 }} />
                  <UsageCounterField feature={feature} character={character} onSet={onSetUsageCounter} />
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
  onToggleEffect,
  onSetEffectInput,
  onSetUsageCounter,
  concentration = false,
}: FeaturesByPathProps) {
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

  const owned = new Set(featureIds);
  const addable = onChange
    ? featureCatalog
        .filter((f) => !owned.has(f.id))
        .sort((a, b) => featureOptionLabel(a).localeCompare(featureOptionLabel(b)))
    : [];

  const remove = (featureId: string) => onChange?.(featureIds.filter((id) => id !== featureId));
  const add = (featureId: string) => {
    if (!owned.has(featureId)) onChange?.([...featureIds, featureId]);
  };

  // La voie de prestige (souvent unique) est épinglée aux dernières colonnes ;
  // les autres voies s'écoulent depuis la gauche (voie du peuple en premier).
  const prestige = displayGroups.filter((g) => g.path?.type === 'prestige');
  const others = displayGroups.filter((g) => g.path?.type !== 'prestige');
  // Colonnes vides entre les voies de gauche et la voie de prestige : remplies
  // par des colonnes fantômes (emplacements de voies non encore choisies).
  const ghostColumns: number[] = [];
  for (let c = others.length + 1; c <= PATH_COLUMN_COUNT - prestige.length; c++) {
    ghostColumns.push(c);
  }

  return (
    <Stack spacing={2.5}>
      {displayGroups.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          Aucune capacité acquise.
        </Typography>
      ) : layout === 'columns' ? (
        <Box
          sx={{
            display: 'grid',
            // ≥ md : les 6 colonnes se partagent la largeur dispo (aucun débordement).
            // < md : largeur minimale par colonne, le bloc défile horizontalement.
            gridTemplateColumns: {
              xs: `repeat(${PATH_COLUMN_COUNT}, minmax(160px, 1fr))`,
              md: `repeat(${PATH_COLUMN_COUNT}, minmax(0, 1fr))`,
            },
            // Lignes partagées par toutes les colonnes (subgrid) : en-tête + rangs.
            // L'en-tête prend la hauteur du titre le plus haut, les rangs s'alignent.
            gridTemplateRows: `auto repeat(${PATH_RANK_COUNT}, minmax(56px, auto))`,
            gap: 1,
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
              onToggleEffect={onToggleEffect}
              onSetEffectInput={onSetEffectInput}
              onSetUsageCounter={onSetUsageCounter}
              disabledIds={disabled}
              disabledReasons={disabledReasons}
              replacements={replacements}
              concentration={concentration}
            />
          ))}
          {ghostColumns.map((c) => (
            <GhostColumn key={`ghost-col-${c}`} gridColumn={c} />
          ))}
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
              gridColumn={PATH_COLUMN_COUNT - prestige.length + 1 + i}
              character={character}
              onChoiceChange={onChoiceChange}
              onToggleEffect={onToggleEffect}
              onSetEffectInput={onSetEffectInput}
              onSetUsageCounter={onSetUsageCounter}
              disabledIds={disabled}
              disabledReasons={disabledReasons}
              replacements={replacements}
              concentration={concentration}
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
              onToggleEffect={onToggleEffect}
              onSetEffectInput={onSetEffectInput}
              onSetUsageCounter={onSetUsageCounter}
              disabledIds={disabled}
              disabledReasons={disabledReasons}
              replacements={replacements}
              concentration={concentration}
            />
          ))}
        </Stack>
      )}

      {onChange && (
        <Autocomplete
          options={addable}
          getOptionLabel={featureOptionLabel}
          renderInput={(params) => (
            <TextField {...params} label="Ajouter une capacité" size="small" />
          )}
          onChange={(_, value) => {
            if (value) add(value.id);
          }}
          value={null}
          blurOnSelect
          clearOnBlur
        />
      )}
    </Stack>
  );
}
