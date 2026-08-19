'use client';

import { useState } from 'react';
import type { Feature, UsageCounter } from '@/data/schema';
import type { Abilities } from '@/lib/engine';
import type { Character, FeatureChoiceSelection } from '@/lib/character/types';
import { hasActionableChoice, hasUnmadeChoice } from '@/lib/character/choices';
import {
  scalingDieTierBonus,
  familiarLearnedSpellUsageMax,
  familiarPowerUsedKey,
  FAMILIAR_LEARNED_SPELL_HOST,
  demiElfeFeyBloodUsageMax,
  DEMI_ELFE_FEY_BLOOD_HOST,
  DEMI_ELFE_FEY_BLOOD_USAGE_KEY,
  armureSacreeMinorPowerUsageMax,
  ARMURE_SACREE_MINOR_POWER_HOST,
  ARMURE_SACREE_MINOR_POWER_USAGE_KEY,
  armureSacreeMajorPowerUsageMax,
  ARMURE_SACREE_MAJOR_POWER_HOST,
  ARMURE_SACREE_MAJOR_POWER_USAGE_KEY,
  conditionalEffectsOf,
  type DisabledFeatureReason,
  type TestDomainBonus,
  type DominatedTestSource,
} from '@/lib/character/effects';
import { AppAlert } from '@/components/AppAlert';
import { PageRefText } from '@/components/SourceRef';
// Import circulaire volontaire (fonctions pures, appelées seulement à l'exécution du hook — jamais
// à l'évaluation du module) : `pathResourcePool`/`countClassPathsAtRank` restent définies dans
// FeaturesByPath.tsx, qui importe ce hook. Sûr en ESM (déclarations `function`, hoistées).
import { pathResourcePool, countClassPathsAtRank, type ElixirCreation } from './FeaturesByPath';

interface UsePathFeatureStateParams {
  character?: Character;
  features: Feature[];
  abilities?: Abilities;
  testBonuses?: TestDomainBonus[];
  /**
   * PER-74 — cible de la Capacité fabuleuse (spécialiste r5) résolue au top-level (`fabulousCapacityTarget`).
   * Quand la capacité rendue est cette cible : `promote` → son marqueur (L) devient (A) ; `concentrate`
   * → le sort (A) affiche le coût réduit de concentration (−2 PM) EN PERMANENCE, sans passer en (L).
   */
  fabulousTarget?: { featureId: string; mode: 'promote' | 'concentrate' } | null;
  /** Concentration accrue active (p. 228) : coût réduit + (A)→(L) pour les sorts éligibles. */
  concentration?: boolean;
  /** Produit un élixir : consomme la réserve + matérialise la dose dans l'équipement (forgesort). */
  onCreateElixir?: (counterKey: string, cost: number, max: number, elixirName: string) => void;
  /** Édition d'un choix porté par une capacité (fiche permissive). */
  onChoiceChange?: (featureId: string, index: number, value: FeatureChoiceSelection) => void;
  /** Passe le bloc « Voies » en édition (clic sur une puce de choix hors édition → édition + modale). */
  onEnableFeatureEditing?: () => void;
  /**
   * Capacités désactivées par exclusion mutuelle (un interrupteur actif les grise) :
   * rendues semi-transparentes + grisées, interrupteur non-interactif, détail conservé.
   */
  disabledIds?: Set<string>;
  /** Raison du grisage par capacité (message « pourquoi désactivé » : exclusion / remplacement). */
  disabledReasons?: Map<string, DisabledFeatureReason>;
  /**
   * Capacités dont l'USAGE est gêné par l'armure portée (restriction fine par profil d'origine,
   * PER-86), indexées par id → message d'avertissement.
   */
  armorRestrictedReasons?: Map<string, string>;
  /**
   * PER-146 — compteurs d'usage SYNTHÉTIQUES à afficher sur la carte d'une capacité HÔTE quand une
   * armure est portée, indexés par id de la capacité hôte.
   */
  borrowedArmorUsageCounters?: Map<string, UsageCounter>;
}

/**
 * Calcul de désactivation/restriction d'une voie (PER-417) : regroupe les helpers de `PathBlock` qui
 * ferment sur le `Character` et les props de grisage/restriction, sans rendre eux-mêmes la carte de
 * capacité. Extrait pour permettre à `PathFeatureCard` (rendu pur, sans `Character`) de rester
 * indépendant de ce calcul — `PathBlock` continue de l'utiliser exactement comme avant (mêmes noms,
 * mêmes signatures), rien ne change dans son JSX.
 */
export function usePathFeatureState({
  character,
  features,
  abilities,
  testBonuses,
  fabulousTarget,
  concentration = false,
  onCreateElixir,
  onChoiceChange,
  onEnableFeatureEditing,
  disabledIds,
  disabledReasons,
  armorRestrictedReasons,
  borrowedArmorUsageCounters,
}: UsePathFeatureStateParams) {
  // PER-324 — décalage de cran du dé évolutif porté par le personnage, alimentant `FeatureText`
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
      markerConcentration: concentration,
      manaConcentration: concentration || hit?.mode === 'concentrate',
    };
  };
  // Rang ATTEINT dans la voie (usage interne à `effectiveRank` seulement — `PathBlock` conserve son
  // propre `pathRank`, référencé directement par son JSX).
  const pathRank = features.reduce((max, f) => Math.max(max, f.rank), 0);
  // Réserve partagée « à préparation systématique » de la voie (pool d'élixirs, p. 98).
  const pool = pathResourcePool(features, character);
  // Contexte de production d'élixir d'une capacité à pool (r1-r5) : fourni quand le callback existe.
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
    // (voie hôte comprise), PLAFONNÉ à la valeur d'INT.
    if (feature.id === 'magie-des-arcanes-r1')
      return abilities
        ? Math.min(countClassPathsAtRank(character, 'magicien', 4), abilities.INT)
        : undefined;
    return undefined;
  };

  // Vue colonne : capacité dont on édite le choix dans une modale dédiée (le bloc
  // est trop petit pour héberger un sélecteur — la puce du choix l'ouvre, PER-68).
  const [choiceEditFeature, setChoiceEditFeature] = useState<Feature | null>(null);

  // Édition d'un choix POSSIBLE ⟺ on peut déjà écrire (`onChoiceChange`, mode édition actif) OU on
  // peut demander l'activation de l'édition (`onEnableFeatureEditing`, fiche du propriétaire hors
  // édition). Faux uniquement en lecture seule stricte (fiche d'autrui).
  const canEditChoices = !!onChoiceChange || !!onEnableFeatureEditing;
  // Ouvre la modale d'édition d'un choix depuis sa puce. Si l'on n'est pas encore en édition, on
  // bascule d'abord le bloc « Voies » en édition (React batche les deux setState : la modale s'ouvre
  // avec l'éditeur déjà actif).
  const requestChoiceEdit = (feature: Feature) => {
    onEnableFeatureEditing?.();
    setChoiceEditFeature(feature);
  };

  /** Vrai si la capacité porte un choix résoluble MAINTENANT (pour les affordances
   *  d'UI) : on masque le crayon/accordéon tant qu'aucun choix n'est actionnable
   *  (ex. choix répétable sans palier atteint), pour ne pas ouvrir un éditeur vide. */
  const hasChoices = (feature: Feature) =>
    !!character && hasActionableChoice(character, feature.id);

  /**
   * Vrai si la capacité porte un effet conditionnel/temporaire (PER-67).
   *
   * PER-375/PER-435 (retour propriétaire 2026-08-19, corrige une inversion) : `prestige-changeforme-r5`
   * porte un second toggle « totalement lié » à `animaux-r5` (même clé `activeWhenInputSet`) — MASQUÉ
   * ici quand le personnage possède `animaux-r5` NATIVEMENT (druide) : le toggle vit alors sur la
   * carte native « Forme animale » (sous « Voie des animaux »), pas de doublon ici. À l'inverse, quand
   * `animaux-r5` n'est qu'OCTROYÉE par cette voie (le personnage n'est pas druide, ex. prêtre +
   * changeforme), cette carte EST la carte d'origine : le toggle DOIT s'afficher ici (sinon plus aucune
   * carte ne le porte). La carte « empruntée » d'`animaux-r5` que ce même rang affiche juste à côté
   * (`borrowedFeatureOf`) n'affiche, elle, JAMAIS ce toggle (cf. `suppressAnimalForm`,
   * `renderEffectToggles` dans `FeaturesByPath.tsx`) — un seul endroit, la carte d'origine.
   */
  const hasEffectToggles = (feature: Feature) => {
    if (!character) return false;
    if (feature.id === 'prestige-changeforme-r5' && character.featureIds.includes('animaux-r5')) {
      return false;
    }
    return conditionalEffectsOf(feature.id).length > 0;
  };

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
    // PER-328 — message DÉDIÉ (emprunt désactivé « en plein soleil ») quand le générique ne convient pas.
    if (reason.note) return reason.note;
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
   * par son id) quand une armure est portée.
   */
  const synthArmorUsageCounter = (feature: Feature): UsageCounter | undefined =>
    borrowedArmorUsageCounters?.get(feature.id);

  /**
   * PER-74 — compteur d'usage SYNTHÉTIQUE du SORT APPRIS au rang 5 de la voie du familier (« il peut
   * utiliser ce sort 2×/jour si rang 1, 1×/jour si rang 2 », p. 133).
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
   * (demi-elfe r4, « 3×/jour si rang 1, 2× si rang 2, 1× si rang 3 », p. 10).
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

  /**
   * PER-370 — compteur d'usage SYNTHÉTIQUE du sort associé à l'armure sacrée au rang 5 « Pouvoir
   * unique » (« il peut utiliser ce sort 4/3/2/1 fois par combat selon le rang choisi », p. 166).
   */
  const synthArmorMinorPowerCounter = (feature: Feature): UsageCounter | undefined => {
    if (feature.id !== ARMURE_SACREE_MINOR_POWER_HOST || !character) return undefined;
    const max = armureSacreeMinorPowerUsageMax(character);
    if (max === undefined) return undefined;
    return {
      max,
      sharedKey: ARMURE_SACREE_MINOR_POWER_USAGE_KEY,
      resetOn: 'combat',
      label: 'Usages restants (par combat)',
    };
  };

  /**
   * PER-370 — compteur d'usage SYNTHÉTIQUE du sort associé à l'armure sacrée au rang 7 « Pouvoir
   * puissant » (« il peut utiliser ce sort 3/2/1 fois par jour selon le rang choisi », p. 166). Même
   * patron que le r5 mais pool QUOTIDIEN.
   */
  const synthArmorMajorPowerCounter = (feature: Feature): UsageCounter | undefined => {
    if (feature.id !== ARMURE_SACREE_MAJOR_POWER_HOST || !character) return undefined;
    const max = armureSacreeMajorPowerUsageMax(character);
    if (max === undefined) return undefined;
    return {
      max,
      sharedKey: ARMURE_SACREE_MAJOR_POWER_USAGE_KEY,
      resetOn: 'day',
      label: 'Usages restants (par jour)',
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

  return {
    scalingTierBonus,
    fabulousFor,
    pool,
    elixirCreation,
    dominatedTestBonusesFor,
    crossPathDieCount,
    effectiveRank,
    milestoneBonusFor,
    choiceEditFeature,
    setChoiceEditFeature,
    canEditChoices,
    requestChoiceEdit,
    hasChoices,
    hasEffectToggles,
    isDisabled,
    disabledSx,
    disabledMessage,
    renderDisabledNotice,
    isArmorRestricted,
    synthArmorUsageCounter,
    synthLearnedSpellCounter,
    synthFeyBloodCounter,
    synthArmorMinorPowerCounter,
    synthArmorMajorPowerCounter,
    armorRestrictedMessage,
    armorRestrictedSx,
    renderArmorRestrictedNotice,
  };
}
