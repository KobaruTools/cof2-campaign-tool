'use client';

import type { ReactNode } from 'react';
import PushPinIcon from '@mui/icons-material/PushPin';
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { deriveStats, type DerivedInput } from '@/lib/engine';
import type { AbilityOverrideSource, EffectContext, RangedAttackElementView } from '@/lib/character/effects';
import type { DerivedStatId as OverrideKey } from '@/lib/character/types';
import type { FormAttackView } from '@/lib/character/formAttack';
import type { UnarmedStrikeView } from '@/lib/character/unarmedStrike';
import { DERIVED_STAT_NAMES, type DerivedStatId } from '@/lib/ui/derivedStats';
import type { ModSources } from '@/lib/ui/derivedStatBreakdown';
import { AppTooltip } from '@/components/AppTooltip';
import { DerivedStatIcon } from '@/components/DerivedStatIcon';
import { DerivedStatBreakdownTooltip } from '@/components/DerivedStatBreakdownTooltip';
import { BreakdownContent } from '@/components/BreakdownContent';
import { BonusDieBadge } from '@/components/BonusDieBadge';
import { MalusDieBadge } from '@/components/MalusDieBadge';
import { DieIcon } from '@/components/DieIcon';
import { SignedNumberField } from '@/components/SignedNumberField';
import { DefenseBadge, type DefenseBadgeData } from '@/components/sheet/DefenseBadge';
import { FormAttackCard } from '@/components/sheet/FormAttackCard';
import { MeleeAttackCard, type AttackBonusDie } from '@/components/sheet/MeleeAttackCard';
import type { FeatureEffectNote } from '@/components/sheet/FeatureEffectBadge';
import { RangedAttackCard } from '@/components/sheet/RangedAttackCard';
import type { MeleeWeaponDamageView, WeaponDamageView } from '@/components/sheet/characterDerivedView';
import type { SituationalDamageBonus } from '@/lib/character/weaponDamageBonus';

/**
 * Pont entre l'id d'affichage (UI) et la clé de surcharge du modèle (moteur).
 * Les deux espaces de noms diffèrent volontairement : `defense`/`recoveryDice`
 * côté UI, `def`/`recoveryDiceCount` côté moteur. La surcharge des dés de
 * récupération ne porte que sur le **nombre** (le type de dé reste calculé).
 */
export const OVERRIDE_KEY: Record<DerivedStatId, OverrideKey> = {
  maxHp: 'maxHp',
  defense: 'def',
  initiative: 'initiative',
  luckPoints: 'luckPoints',
  recoveryDice: 'recoveryDiceCount',
  manaPoints: 'manaPoints',
  meleeAttack: 'meleeAttack',
  rangedAttack: 'rangedAttack',
  magicAttack: 'magicAttack',
};

/**
 * Lignes d'ATTAQUE (contact, distance, magique) : sur mobile elles restent en pleine
 * largeur (une seule colonne) — les cartes de contact/distance sont riches (DM, badges,
 * bascule arme ⇄ mains nues) et l'attaque magique leur est accolée par cohérence. Toutes
 * les AUTRES stats passent en grille compacte à 2 colonnes (PER-230, suite responsive).
 */
const FULL_WIDTH_ON_MOBILE = new Set<DerivedStatId>(['meleeAttack', 'rangedAttack', 'magicAttack']);

/**
 * Sous-ensemble éligible au PIN individuel « barre condensée » (`StickySheetStatusBar`) — les seules
 * stats que ce condensé sait afficher (défense/init/contact/distance/magie). Les autres blocs (PV,
 * mana, chance, dés de récup) vivent déjà dans le groupe « État du personnage » de la barre, en bloc
 * entier plutôt qu'individuellement : pas de pin ici pour eux.
 */
const BAR_PINNABLE_STAT_IDS = new Set<DerivedStatId>([
  'defense',
  'initiative',
  'meleeAttack',
  'rangedAttack',
  'magicAttack',
]);

export interface DerivedStatsGridProps {
  /** Entrées du moteur — sert au calcul des stats et au détail des infobulles. */
  input: DerivedInput;
  /**
   * Capacités acquises : transmis aux infobulles pour détailler quelle capacité
   * apporte quel bonus sous « Capacités / divers ». Absent → pas de sous-liste.
   */
  featureIds?: string[];
  /**
   * Contexte d'effets (PER-67) : transmis aux infobulles pour résoudre les
   * valeurs scalantes et n'inclure que les effets conditionnels actifs dans le
   * détail « Capacités / divers ». Absent → seuls les bonus plats constants.
   */
  effectContext?: EffectContext;
  /**
   * Sources additionnelles (hors capacités) à détailler sous « Capacités / divers »
   * — ex. points de capacité orphelins convertis (p. 40). Transmis aux infobulles.
   */
  extraModSources?: ModSources;
  /**
   * Tailles de colonne MUI Grid des cartes SIMPLES. Par défaut : deux par ligne sur
   * mobile (grille compacte), deux sur tablette, trois sur desktop. Les lignes d'attaque
   * (cf. `FULL_WIDTH_ON_MOBILE`) et le mode édition forcent la pleine largeur sur mobile.
   */
  size?: Record<string, number>;
  /** Surcharges manuelles actives (clé présente = valeur forcée). PER-48. */
  overrides?: Partial<Record<OverrideKey, number>>;
  /**
   * Édition des surcharges : si fourni, chaque stat propose de forcer sa valeur
   * ou de revenir au calcul. `null` en valeur = retour au calcul automatique.
   */
  onOverride?: (key: OverrideKey, value: number | null) => void;
  /**
   * Puces de la carte Défense (PER-137) : immunités (vert, en premier) puis réductions de dégâts
   * (bleu), rendues en blocs custom (cf. `DefenseBadge`). Absent = aucune (ex. récap du wizard).
   */
  defenseBadges?: DefenseBadgeData[];
  /**
   * Badges de plage de critique ACTIVE au CONTACT, sous la carte « Attaque au contact » (PER-133).
   * Mêmes blocs custom que la Défense (cf. `DefenseBadge`). Absent = aucun (ex. récap du wizard).
   */
  meleeCriticalRanges?: DefenseBadgeData[];
  /** Badges de plage de critique ACTIVE À DISTANCE, sous la carte « Attaque à distance » (PER-133). */
  rangedCriticalRanges?: DefenseBadgeData[];
  /**
   * PER-141 — attaque à MAINS NUES. Présent → la carte « Attaque au contact » propose une bascule
   * arme ⇄ mains nues (état d'UI local non persisté). Absent (récap du wizard, écran de MJ) → aucune
   * bascule, comportement inchangé.
   */
  unarmedStrike?: UnarmedStrikeView;
  /** PER-141 — DM de l'arme de contact équipée, pour la vue « arme » de la bascule. Null = aucune arme portée. */
  meleeWeaponDamage?: MeleeWeaponDamageView | null;
  /**
   * PER-116 — DM de l'arme de la MAIN SECONDAIRE. Non nul → la carte « Attaque au contact » affiche
   * DEUX lignes touche | DM (une par main). Absent / `null` (une seule arme, récap du wizard, écran
   * de MJ) → affichage à une ligne, inchangé.
   */
  offHandMeleeWeaponDamage?: MeleeWeaponDamageView | null;
  /** PER-116 — plage de critique de l'arme de la MAIN SECONDAIRE, affichée seulement si elle diffère. */
  offHandCriticalRanges?: DefenseBadgeData[];
  /** PER-116 — écart de touche de la main secondaire (non nul si la finesse substitue la touche). */
  offHandTouchDelta?: number;
  /** PER-453 — écart de touche à mains nues (non nul si Poings de fer substitue AGI, plus avantageuse). */
  unarmedTouchDelta?: number;
  /** PER-453 — explication de l'écart de touche à mains nues, en info-bulle. `null`/absent = aucun écart. */
  unarmedTouchNote?: string | null;
  /** PER-116 — dé malus imposé par le combat à deux armes (p. 215), sur chacune des deux lignes. */
  twoWeaponPenaltyDie?: boolean;
  /**
   * PER-116 — clic sur l'icône d'une arme (combat à deux armes) : fait défiler la fiche jusqu'à SA
   * ligne d'inventaire (et déplie la section Inventaire si repliée). Absent = icônes non cliquables
   * (récap du wizard, écran de MJ).
   */
  onScrollToWeapon?: (slot: 'mainHand' | 'offHand') => void;
  /** PER-141 — plage de critique au contact À MAINS NUES (Morsure du serpent), pour la vue mains nues. */
  unarmedCriticalRanges?: DefenseBadgeData[];
  /**
   * PER-115 — DM de l'arme à DISTANCE équipée. Présent (même `null`) → la carte « Attaque à distance »
   * affiche le DM / « Aucune arme ». Absent (récap du wizard, écran de MJ) → carte générique inchangée.
   */
  rangedWeaponDamage?: WeaponDamageView | null;
  /** PER-115 — bonus de DM situationnels au contact, en badges sous la carte « Attaque au contact ». */
  meleeSituationalDamage?: SituationalDamageBonus[];
  /** PER-116/307 — bonus de DM situationnels de la MAIN SECONDAIRE (combat à deux armes). */
  offHandMeleeSituationalDamage?: SituationalDamageBonus[];
  /** PER-115 — bonus de DM situationnels à distance, en badges sous la carte « Attaque à distance ». */
  rangedSituationalDamage?: SituationalDamageBonus[];
  /**
   * PER-74 — id de la capacité ACTIVE rendant l'attaque à distance MAGIQUE (Flèche magique de l'archer
   * arcanique), ou `null`. Affiche un badge « Magique » sous la carte « Attaque à distance ».
   */
  rangedAttackMagicalSourceId?: string | null;
  /**
   * PER-74 — élément de DM ajouté aux attaques à distance (Flèche élémentaire de l'archer arcanique),
   * choisi « à la table », ou `null`. Affiche une puce d'élément sous la carte « Attaque à distance ».
   */
  rangedAttackElement?: RangedAttackElementView | null;
  /**
   * PER-74 — attaque conférée par une FORME active qui REMPLACE l'attaque à distance (morsure de la
   * forme hybride du lycanthrope : sous cette forme, aucune arme à distance ne peut être utilisée).
   * Présent → la carte « Attaque à distance » cède la place à la carte de cette attaque. Absent /
   * `null` (forme inactive, récap du wizard, écran de MJ) → carte à distance inchangée.
   */
  rangedReplacingFormAttack?: FormAttackView | null;
  /**
   * PER-374 — attaque conférée par une FORME active qui REMPLACE l'attaque au contact (Frappe des
   * formes élémentaires : la bascule arme ⇄ mains nues, PER-141, cède la place à une attaque unique
   * fixe). Symétrique de `rangedReplacingFormAttack`. Absent / `null` → carte au contact inchangée.
   */
  meleeReplacingFormAttack?: FormAttackView | null;
  /**
   * PER-374 — DEF imposée par une FORME active (nombre fixe imprimé, ex. Forme élémentaire d'air
   * « Défense 25 ») indépendamment de la formule habituelle. `null` = aucune surcharge, DEF recalculée
   * normalement. Priorité la plus BASSE : une surcharge manuelle (`overrides.def`) l'emporte toujours.
   */
  activeDefenseOverride?: number | null;
  /**
   * Retour propriétaire 2026-08-19 — Initiative imposée par une FORME active (Forme animale :
   * Initiative IMPRIMÉE de la créature choisie), symétrique de `activeDefenseOverride`. `null` =
   * aucune surcharge, Initiative recalculée normalement. Priorité la plus BASSE : une surcharge
   * manuelle (`overrides.initiative`) l'emporte toujours.
   */
  activeInitiativeOverride?: number | null;
  /**
   * Source (capacité + page) de `activeDefenseOverride` — retour propriétaire 2026-08-19 : REMPLACE
   * le breakdown normal (formule 10+AGI+équipement) par un détail cohérent quand la surcharge de
   * forme s'applique, au lieu de continuer à montrer une formule qui ne s'applique plus. `null`/absent
   * → breakdown normal (`DerivedStatBreakdownTooltip`) inchangé.
   */
  activeDefenseOverrideSource?: AbilityOverrideSource | null;
  /** Source de `activeInitiativeOverride`, même usage que `activeDefenseOverrideSource`. */
  activeInitiativeOverrideSource?: AbilityOverrideSource | null;
  /**
   * PER-74 — dé bonus à TOUTES les attaques (contact/distance/magie), auto tant que PV < niveau
   * (flibustier r8 « Pas de quartier »). Affiche un badge double-d20 sur les cartes d'attaque. Vide
   * ou absent = aucun.
   */
  attackBonusDie?: AttackBonusDie[];
  /**
   * PER-74 — dé bonus de l'ARME LIÉE (r4 « Fidèle »), restreint au MODE de l'arme liée en main :
   * il s'ajoute au dé bonus général (`attackBonusDie`) sur la SEULE carte concernée.
   */
  boundWeaponAttackDie?: { name: string; scope: 'melee' | 'ranged' } | null;
  /**
   * PER-281 — libellés des états de combat imposant un DÉ MALUS aux tests d'attaque (Affaibli à tous
   * les tests, Immobilisé aux seules attaques). Affiche un badge « double-d20 barré » rouge sur les
   * trois cartes d'attaque. Vide ou absent = aucun (hors session, ou aucun état de ce type).
   */
  attackMalusDie?: string[];
  /**
   * PER-74 — notes d'effet de capacité (voie de l'écorcheur : saignement, blessures affreuses,
   * impitoyable), en badge sous la carte « Attaque au contact ». Vide ou absent = aucune.
   */
  meleeAttackNotes?: FeatureEffectNote[];
  /**
   * PER-74 — notes d'effet de capacité (Métamorphose élémentaire, élémentaliste r8, forme Air : DM ÷2),
   * en badge sous la carte « Attaque à distance ». Vide ou absent = aucune.
   */
  rangedAttackNotes?: FeatureEffectNote[];
  /**
   * Épingle de bloc individuelle (retour propriétaire) vers la barre condensée (`StickySheetStatusBar`) :
   * n'a de sens que pour les 5 stats du groupe « Statistiques dérivées » de la barre (défense/init/
   * contact/distance/magie, cf. `BAR_PINNABLE_STAT_IDS`) — les autres blocs (PV, mana, chance, dés de
   * récup) n'affichent jamais ce contrôle. Présent seulement sur la fiche réelle (absent du récap du
   * wizard et de l'écran de MJ, où le pin de bloc n'a pas de sens).
   */
  onToggleBarPin?: (id: DerivedStatId) => void;
  /** Ensemble courant des stats épinglées à la barre condensée — sert à colorer l'icône du pin. */
  barPinnedIds?: ReadonlySet<DerivedStatId>;
  /**
   * Section « Statistiques dérivées » elle-même épinglée à la barre condensée (`PinSectionButton`) :
   * les pins individuels de bloc n'apparaissent QUE si elle l'est — sans ça, épingler un bloc n'aurait
   * aucun effet visible.
   */
  barSectionPinned?: boolean;
}

interface StatLine {
  id: DerivedStatId;
  /** Valeur calculée par le moteur (null = stat non applicable, ex. mana sans sort). */
  computed: number | null;
  /** Élément accolé après la valeur (ex. dé de récupération). */
  suffix?: ReactNode;
}

/**
 * Grille des statistiques dérivées d'un personnage, sous forme de cartes
 * (icône cerclée + libellé + valeur + infobulle « i » détaillant le calcul avec
 * la page source CO2). Composant d'affichage commun : le récapitulatif du
 * wizard et la fiche de personnage passent tous deux par ici pour un rendu
 * uniforme. Les valeurs viennent du moteur (`deriveStats`) à partir de `input`,
 * sauf surcharge manuelle (`overrides`), signalée « forcée » (PER-48).
 */
export function DerivedStatsGrid({
  input,
  featureIds,
  effectContext,
  extraModSources,
  size = { xs: 6, sm: 6, md: 4 },
  overrides,
  onOverride,
  defenseBadges,
  meleeCriticalRanges,
  rangedCriticalRanges,
  unarmedStrike,
  meleeWeaponDamage,
  offHandMeleeWeaponDamage,
  offHandMeleeSituationalDamage,
  offHandCriticalRanges,
  offHandTouchDelta = 0,
  unarmedTouchDelta = 0,
  unarmedTouchNote = null,
  twoWeaponPenaltyDie = false,
  onScrollToWeapon,
  unarmedCriticalRanges,
  rangedWeaponDamage,
  meleeSituationalDamage,
  rangedSituationalDamage,
  rangedAttackMagicalSourceId,
  rangedAttackElement,
  rangedReplacingFormAttack,
  meleeReplacingFormAttack,
  activeDefenseOverride = null,
  activeDefenseOverrideSource = null,
  activeInitiativeOverride = null,
  activeInitiativeOverrideSource = null,
  attackBonusDie = [],
  boundWeaponAttackDie = null,
  attackMalusDie = [],
  meleeAttackNotes,
  rangedAttackNotes,
  onToggleBarPin,
  barPinnedIds,
  barSectionPinned = false,
}: DerivedStatsGridProps) {
  const stats = deriveStats(input);

  /**
   * Superpose le pin de bloc (haut-droit) au contenu d'une carte quand ce bloc est éligible
   * (`BAR_PINNABLE_STAT_IDS`), que la section est épinglée, et qu'un gestionnaire est fourni — sinon
   * renvoie le contenu tel quel (récap du wizard, écran de MJ, section non épinglée).
   */
  const withBarPin = (id: DerivedStatId, content: ReactNode): ReactNode => {
    if (!onToggleBarPin || !barSectionPinned || !BAR_PINNABLE_STAT_IDS.has(id)) return content;
    const pinned = barPinnedIds?.has(id) ?? false;
    return (
      <Box sx={{ position: 'relative', height: '100%' }}>
        {content}
        <AppTooltip title={pinned ? 'Retirer de la barre condensée' : 'Ajouter à la barre condensée'}>
          <IconButton
            size="small"
            onClick={() => onToggleBarPin(id)}
            aria-label={pinned ? `Retirer de la barre condensée : ${DERIVED_STAT_NAMES[id]}` : `Ajouter à la barre condensée : ${DERIVED_STAT_NAMES[id]}`}
            sx={{
              position: 'absolute',
              top: 2,
              right: 2,
              zIndex: 4,
              bgcolor: 'background.paper',
              border: 1,
              borderColor: 'divider',
              '&:hover': { bgcolor: 'background.paper' },
            }}
          >
            {pinned ? (
              <PushPinIcon sx={{ fontSize: 16 }} color="primary" />
            ) : (
              <PushPinOutlinedIcon sx={{ fontSize: 16 }} />
            )}
          </IconButton>
        </AppTooltip>
      </Box>
    );
  };

  /**
   * Dés bonus à afficher sur la carte d'attaque d'un MODE : les dés généraux (valables sur toutes
   * les attaques, ex. flibustier r8 à PV bas) + celui de l'ARME LIÉE s'il concerne ce mode (PER-74).
   */
  const attackDiceFor = (scope: 'melee' | 'ranged'): AttackBonusDie[] =>
    boundWeaponAttackDie?.scope === scope
      ? [...attackBonusDie, { name: boundWeaponAttackDie.name }]
      : attackBonusDie;

  const statLines: StatLine[] = [
    { id: 'maxHp', computed: stats.maxHp },
    { id: 'defense', computed: stats.defense },
    { id: 'initiative', computed: stats.initiative },
    { id: 'luckPoints', computed: stats.luckPoints },
    {
      id: 'recoveryDice',
      computed: stats.recoveryDiceCount,
      suffix: <DieIcon die={stats.recoveryDie} size={28} />,
    },
    { id: 'manaPoints', computed: stats.manaPoints },
    { id: 'meleeAttack', computed: stats.meleeAttack },
    { id: 'rangedAttack', computed: stats.rangedAttack },
    { id: 'magicAttack', computed: stats.magicAttack },
  ];

  return (
    <Grid container spacing={1} data-glossary-shot="DerivedStatsGrid">
      {statLines.map(({ id, computed, suffix }) => {
        const key = OVERRIDE_KEY[id];
        const manualForced = overrides ? key in overrides : false;
        // PER-374 — DEF imposée par une forme active (transformation) : priorité la plus BASSE, une
        // surcharge manuelle du joueur/MJ (`overrides.def`) l'emporte toujours si les deux sont posées.
        // Retour propriétaire 2026-08-19 — même patron pour l'Initiative (Forme animale).
        const formForced =
          (id === 'defense' && !manualForced && activeDefenseOverride !== null) ||
          (id === 'initiative' && !manualForced && activeInitiativeOverride !== null);
        const forced = manualForced || formForced;
        const formForcedValue = id === 'defense' ? activeDefenseOverride : activeInitiativeOverride;
        const overrideValue = manualForced ? (overrides![key] ?? 0) : formForced ? formForcedValue : null;
        const display = forced ? overrideValue : computed;
        // Source de la surcharge de FORME (capacité + page), pour remplacer le breakdown normal —
        // jamais pour une surcharge MANUELLE (`overrides`, saisie libre sans formule à expliquer).
        const formForcedSource = formForced
          ? id === 'defense'
            ? activeDefenseOverrideSource
            : activeInitiativeOverrideSource
          : null;
        // Vue compacte à 2 colonnes (mobile) réservée aux stats SIMPLES en lecture : titre
        // masqué et icône réduite pour gagner de la place. Les lignes d'attaque restent en
        // pleine largeur ; l'ÉDITION (champs + épingle) aussi, pour garder ses contrôles au large.
        const isAttack = FULL_WIDTH_ON_MOBILE.has(id);
        const compact = !onOverride && !isAttack;
        // Attaques : pleine largeur sur mobile ET petite tablette (xs + sm), multi-colonnes
        // seulement à partir de « md ». Édition hors attaque : pleine largeur mobile, 2 colonnes
        // dès « sm » (contrôles au large), comportement inchangé.
        const cardSize = isAttack
          ? { ...size, xs: 12, sm: 12 }
          : compact
            ? size
            : { ...size, xs: 12 };
        // Badges du bas de carte selon la stat : immunités/RD pour la Défense, plage de critique
        // pour les attaques de contact / à distance (PER-133/137).
        const badges =
          id === 'defense'
            ? defenseBadges
            : id === 'meleeAttack'
              ? meleeCriticalRanges
              : id === 'rangedAttack'
                ? rangedCriticalRanges
                : undefined;

        // Détail du calcul (breakdown + page source), désormais porté par le CHIFFRE de la
        // carte (survol = infobulle, curseur « ? ») plutôt que par une icône « i » dédiée.
        // Props communes réutilisées par les cartes d'attaque (enrobent leur touche) et par
        // la carte générique (enrobe le chiffre en lecture, le libellé en édition).
        const breakdownProps = {
          statId: id,
          input,
          featureIds,
          effectContext,
          extraModSources,
          enterDelay: 200,
        };

        // PER-374 — une FORME active peut CONFISQUER l'attaque au contact (bascule arme ⇄ mains nues,
        // PER-141) et la remplacer par une attaque unique et fixe (Frappe des formes élémentaires,
        // touche = attaque magique du personnage). Même patron que le remplacement de l'attaque à
        // distance ci-dessus : on relit la stat du `scope` de l'attaque (et sa surcharge éventuelle).
        if (id === 'meleeAttack' && meleeReplacingFormAttack && !onOverride) {
          const attackStatId =
            meleeReplacingFormAttack.scope === 'ranged'
              ? 'rangedAttack'
              : meleeReplacingFormAttack.scope === 'magic'
                ? 'magicAttack'
                : 'meleeAttack';
          const attackKey = OVERRIDE_KEY[attackStatId];
          const attackForced = overrides ? attackKey in overrides : false;
          const attackTouch = attackForced ? (overrides![attackKey] ?? 0) : stats[attackStatId];
          return (
            <Grid key={id} size={cardSize}>
              {withBarPin(
                id,
                <FormAttackCard
                  attack={meleeReplacingFormAttack}
                  touch={attackTouch}
                  forced={attackForced}
                  wrapTouch={(child) => (
                    <DerivedStatBreakdownTooltip {...breakdownProps} statId={attackStatId}>
                      {child}
                    </DerivedStatBreakdownTooltip>
                  )}
                  abilities={input.abilities}
                  attackMalusDie={attackMalusDie}
                />,
              )}
            </Grid>
          );
        }

        // PER-141 — carte « Attaque au contact » avec bascule arme ⇄ mains nues : double cadre
        // superposé qui s'échangent avec animation. Réservée à la vue (pas en mode édition des
        // surcharges, où l'on garde la carte simple). Ailleurs → carte générique ci-dessous.
        if (id === 'meleeAttack' && unarmedStrike && !onOverride) {
          return (
            <Grid key={id} size={cardSize}>
              {withBarPin(
                id,
                <MeleeAttackCard
                  touch={display}
                  forced={forced}
                  wrapTouch={(child) => (
                    <DerivedStatBreakdownTooltip {...breakdownProps}>{child}</DerivedStatBreakdownTooltip>
                  )}
                  abilities={input.abilities}
                  unarmed={unarmedStrike}
                  meleeWeaponDamage={meleeWeaponDamage ?? null}
                  offHandMeleeWeaponDamage={offHandMeleeWeaponDamage ?? null}
                  weaponCriticalRanges={meleeCriticalRanges ?? []}
                  offHandCriticalRanges={offHandCriticalRanges ?? []}
                  offHandTouchDelta={offHandTouchDelta}
                  unarmedTouchDelta={unarmedTouchDelta}
                  unarmedTouchNote={unarmedTouchNote}
                  twoWeaponPenaltyDie={twoWeaponPenaltyDie}
                  onScrollToWeapon={onScrollToWeapon}
                  unarmedCriticalRanges={unarmedCriticalRanges ?? []}
                  situationalBonuses={meleeSituationalDamage ?? []}
                  offHandSituationalBonuses={offHandMeleeSituationalDamage ?? []}
                  attackBonusDie={attackDiceFor('melee')}
                  attackMalusDie={attackMalusDie}
                  meleeAttackNotes={meleeAttackNotes ?? []}
                  level={input.level}
                />,
              )}
            </Grid>
          );
        }

        // PER-74 — une FORME active peut CONFISQUER l'attaque à distance et la remplacer par une
        // attaque naturelle (morsure de la forme hybride du lycanthrope). La touche affichée est celle
        // du `scope` de l'attaque (au contact pour une morsure), donc PAS la valeur de cette carte :
        // on relit la stat correspondante (et sa surcharge éventuelle) et son détail de calcul.
        if (id === 'rangedAttack' && rangedReplacingFormAttack && !onOverride) {
          const attackStatId = rangedReplacingFormAttack.scope === 'melee' ? 'meleeAttack' : 'rangedAttack';
          const attackKey = OVERRIDE_KEY[attackStatId];
          const attackForced = overrides ? attackKey in overrides : false;
          const attackTouch = attackForced ? (overrides![attackKey] ?? 0) : stats[attackStatId];
          return (
            <Grid key={id} size={cardSize}>
              {withBarPin(
                id,
                <FormAttackCard
                  attack={rangedReplacingFormAttack}
                  touch={attackTouch}
                  forced={attackForced}
                  wrapTouch={(child) => (
                    <DerivedStatBreakdownTooltip {...breakdownProps} statId={attackStatId}>
                      {child}
                    </DerivedStatBreakdownTooltip>
                  )}
                  abilities={input.abilities}
                  attackMalusDie={attackMalusDie}
                />,
              )}
            </Grid>
          );
        }

        // PER-115 — carte « Attaque à distance » : DM de l'arme à distance portée (+ bonus permanents),
        // « Aucune arme » à défaut, et bonus situationnels. Réservée à la vue (pas en mode édition des
        // surcharges). `rangedWeaponDamage` présent (même `null`) signale qu'on est sur la fiche.
        if (id === 'rangedAttack' && rangedWeaponDamage !== undefined && !onOverride) {
          return (
            <Grid key={id} size={cardSize}>
              {withBarPin(
                id,
                <RangedAttackCard
                  touch={display}
                  forced={forced}
                  wrapTouch={(child) => (
                    <DerivedStatBreakdownTooltip {...breakdownProps}>{child}</DerivedStatBreakdownTooltip>
                  )}
                  abilities={input.abilities}
                  rangedWeaponDamage={rangedWeaponDamage}
                  criticalRanges={rangedCriticalRanges ?? []}
                  situationalBonuses={rangedSituationalDamage ?? []}
                  magicalSourceId={rangedAttackMagicalSourceId}
                  elemental={rangedAttackElement}
                  attackBonusDie={attackDiceFor('ranged')}
                  attackMalusDie={attackMalusDie}
                  notes={rangedAttackNotes ?? []}
                  level={input.level}
                />,
              )}
            </Grid>
          );
        }

        return (
          <Grid key={id} size={cardSize}>
            {withBarPin(
              id,
              <Card
                variant="outlined"
                sx={{
                  height: '100%',
                  transition: 'border-color 120ms ease',
                  // Bordure très légèrement éclaircie au survol / focus clavier de la carte.
                  // Le détail du calcul est désormais accessible en survolant le chiffre (curseur « ? »).
                  '&:hover, &:focus-within': {
                    borderColor: 'rgba(255, 255, 255, 0.2)',
                  },
                }}
              >
                <CardContent
                  sx={{
                    py: 1,
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    '&:last-child': { pb: 1 },
                  }}
                >
                  {/* Ligne du haut : icône + libellé + valeur, alignée EN HAUT du bloc. Le détail du
                      calcul s'ouvre au survol du CHIFFRE (curseur « ? ») ; en édition, où le chiffre
                      devient un champ de saisie, il est porté par le LIBELLÉ à la place. */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: compact ? 1 : 1.5, sm: 1.5 }, width: '100%' }}>
                    {/* Icône réduite sur mobile dans la vue compacte (PER-230, suite) ; taille
                        pleine (40) sur tablette+ et pour les cartes pleine largeur / l'édition. */}
                    <DerivedStatIcon
                      statId={id}
                      title
                      size={40}
                      sx={compact ? { width: { xs: 32, sm: 40 }, height: { xs: 32, sm: 40 } } : undefined}
                    />
                    <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                      {onOverride ? (
                        <DerivedStatBreakdownTooltip {...breakdownProps}>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ display: 'inline-block', lineHeight: 1.2, cursor: 'help' }}
                          >
                            {DERIVED_STAT_NAMES[id]}
                          </Typography>
                        </DerivedStatBreakdownTooltip>
                      ) : (
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          // Titre masqué sur mobile dans la vue compacte (PER-230, suite) :
                          // l'icône + le chiffre suffisent à identifier la stat, le détail au survol
                          // porte le nom. Réaffiché dès « sm » et pour les cartes pleine largeur.
                          sx={{ display: compact ? { xs: 'none', sm: 'block' } : 'block', lineHeight: 1.2 }}
                        >
                          {DERIVED_STAT_NAMES[id]}
                        </Typography>
                      )}

                      {onOverride ? (
                        <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', mt: 0.25 }}>
                          <SignedNumberField
                            size="small"
                            value={display ?? 0}
                            disabled={!forced}
                            onChange={(v) => onOverride(key, v)}
                            slotProps={{
                              htmlInput: {
                                style: { textAlign: 'center', fontWeight: 700, padding: '4px 6px' },
                              },
                            }}
                            sx={{ width: 56, flexGrow: 0 }}
                          />
                          {suffix}
                          <AppTooltip
                            title={forced ? 'Revenir au calcul automatique' : 'Forcer cette valeur'}
                          >
                            <IconButton
                              size="small"
                              color={forced ? 'warning' : 'default'}
                              onClick={() => onOverride(key, forced ? null : (computed ?? 0))}
                            >
                              {forced ? (
                                <RestartAltIcon fontSize="small" />
                              ) : (
                                <PushPinOutlinedIcon fontSize="small" />
                              )}
                            </IconButton>
                          </AppTooltip>
                        </Stack>
                      ) : (
                        (() => {
                          const numberContent = (
                            <Typography
                              variant="h5"
                              sx={{
                                fontWeight: 600,
                                color: forced ? 'warning.main' : undefined,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 0.75,
                                cursor: 'help',
                                // Chiffre agrandi sur mobile — le libellé/l'icône/les badges autour gardent leur taille.
                                fontSize: { xs: '1.75rem', sm: 'inherit' },
                              }}
                            >
                              {display === null ? '—' : display}
                              {suffix}
                              {forced && (
                                <AppTooltip title="Valeur forcée (calcul automatique remplacé)">
                                  <PushPinOutlinedIcon sx={{ fontSize: 16 }} color="warning" />
                                </AppTooltip>
                              )}
                              {/* Dé bonus à toutes les attaques (flibustier r8, PV bas) — porté aussi par l'attaque MAGIQUE. */}
                              {id === 'magicAttack' && attackBonusDie.length > 0 && (
                                <BonusDieBadge
                                  ability="attaque magique"
                                  size={18}
                                  noTooltip
                                  tooltipTitle={`Dé bonus à cette attaque — ${attackBonusDie.map((s) => s.name).join(', ')}`}
                                />
                              )}
                              {/* Dé MALUS aux tests d'attaque (état de combat : Affaibli/Immobilisé, PER-281). */}
                              {id === 'magicAttack' && attackMalusDie.length > 0 && (
                                <MalusDieBadge label={`aux attaques (${attackMalusDie.join(', ')})`} size={18} noTooltip />
                              )}
                            </Typography>
                          );
                          // Retour propriétaire 2026-08-19 — une surcharge de FORME REMPLACE le breakdown normal
                          // (formule 10+AGI+équipement…) : celle-ci ne s'applique plus, la montrer serait faux.
                          // Même langage visuel que la surcharge de caractéristique (`AbilitiesGrid`).
                          if (formForcedSource) {
                            return (
                              <AppTooltip
                                title={
                                  <Box sx={{ py: 0.5 }}>
                                    <BreakdownContent
                                      title={DERIVED_STAT_NAMES[id]}
                                      breakdown={{
                                        total: formForcedSource.value,
                                        terms: [
                                          {
                                            label: formForcedSource.name,
                                            value: formForcedSource.value,
                                            featureId: formForcedSource.featureId,
                                          },
                                        ],
                                        note: `Valeur imposée par la transformation (${formForcedSource.name}).`,
                                        page: formForcedSource.page,
                                      }}
                                      page={formForcedSource.page}
                                    />
                                  </Box>
                                }
                              >
                                {numberContent}
                              </AppTooltip>
                            );
                          }
                          return (
                            <DerivedStatBreakdownTooltip {...breakdownProps}>{numberContent}</DerivedStatBreakdownTooltip>
                          );
                        })()
                      )}
                    </Box>
                  </Box>

                  {/* Badges alignés EN BAS du bloc (mt: auto). Les IMMUNITÉS ont leur PROPRE grille,
                      placée AVANT celle des réductions / plages de critique. Grilles à 3 colonnes
                      ÉGALES pour une empreinte uniforme. */}
                  {badges && badges.length > 0 && (
                    <Box sx={{ mt: 'auto', pt: 0.75, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                      {(['immunity', 'other'] as const).map((group) => {
                        const items = badges.filter((b) =>
                          group === 'immunity' ? b.variant === 'immunity' : b.variant !== 'immunity',
                        );
                        if (items.length === 0) return null;
                        return (
                          <Box
                            key={group}
                            sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 0.5 }}
                          >
                            {items.map(({ key, ...rest }) => (
                              // `abilities`/`level` : de quoi RÉSOUDRE un dé de badge (riposte) par le
                              // parser plutôt que de l'écrire en littéral (cf. `DefenseBadge.dice`).
                              <DefenseBadge
                                key={key}
                                {...rest}
                                abilities={input.abilities}
                                level={input.level}
                              />
                            ))}
                          </Box>
                        );
                      })}
                    </Box>
                  )}
                </CardContent>
              </Card>,
            )}
          </Grid>
        );
      })}
    </Grid>
  );
}
