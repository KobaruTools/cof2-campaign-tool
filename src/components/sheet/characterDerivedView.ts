/**
 * Vue « statistiques dérivées » d'un personnage — calcul PUR partagé (PER, écran
 * de MJ). Rassemble en un seul endroit la construction de l'entrée moteur
 * (`DerivedInput`) et des badges (immunités, réductions de dégâts, plages de
 * critique) telle qu'elle vivait, inline, dans la fiche de personnage. La fiche
 * ET l'écran de MJ passent désormais par ici : source unique, aucune dérive
 * possible entre les deux rendus.
 *
 * On n'y met QUE ce qui alimente `DerivedStatsGrid` (input + badges) plus les
 * deux sous-produits que la fiche réutilise ailleurs (`modFeatureIds` pour les
 * panneaux caractéristiques/tests, `effectContext` pour les mêmes). Le reste
 * (jauges, conformité, stats du maître) reste dans la fiche.
 */
import { classById, families, featureById } from '@/data';
import type { DerivedInput } from '@/lib/engine';
import type { Character } from '@/lib/character/types';
import {
  activeFeatureIdsForMods,
  aggregateImmunities,
  criticalRangeSources,
  effectContext,
  isEffectActive,
  manaCastingAbility,
  modsFromFeatures,
  stackedDamageReductions,
  type EffectContext,
} from '@/lib/character/effects';
import { mergeMods, orphanMods } from '@/lib/character/orphanPoints';
import { familyHpGains, hpLevelGains, level1FamilyHp, level1HybridFamilies } from '@/lib/character/hp';
import { rulesContext } from '@/lib/character/rulesContext';
import { combineCriticalRanges, formatCriticalRange } from '@/lib/ui/criticalRange';
import { formatDamageReduction } from '@/lib/ui/damageReduction';
import { defenseFromEquipment } from '@/components/wizard/helpers';
import type { DefenseBadgeData } from '@/components/sheet/DefenseBadge';

const familyById = new Map(families.map((f) => [f.id, f]));

export interface CharacterDerivedView {
  /** Capacités acquises + empruntées (base des mods) — réutilisé par les autres panneaux de la fiche. */
  modFeatureIds: string[];
  /** Contexte d'effets (valeurs scalantes + interrupteurs actifs) — réutilisé par la fiche. */
  effectContext: EffectContext;
  /** Entrée moteur pour `deriveStats`. `null` si profil incomplet (famille introuvable). */
  derivedInput: DerivedInput | null;
  /** Puces de la carte Défense : immunités (vert) d'abord, puis réductions de dégâts (bleu). */
  defenseBadges: DefenseBadgeData[];
  /** Puces de plage de critique ACTIVE au contact. */
  meleeCriticalRanges: DefenseBadgeData[];
  /** Puces de plage de critique ACTIVE à distance. */
  rangedCriticalRanges: DefenseBadgeData[];
}

/**
 * Construit la vue des statistiques dérivées d'un personnage (entrée moteur +
 * badges), à l'identique de la fiche. Fonction pure : aucun effet, aucune
 * dépendance à React.
 */
export function buildCharacterDerivedView(character: Character): CharacterDerivedView {
  const characterClass = classById.get(character.classId);
  const family = characterClass ? familyById.get(characterClass.familyId) : undefined;

  // Capacités acquises + capacités empruntées par choix, MOINS celles désactivées par
  // le port d'armure (PER-83) : base de l'agrégation des bonus plats et du détail des
  // stats dérivées (PER-66). Une capacité gênée par l'armure ne compte plus nulle part.
  const modFeatureIds = activeFeatureIdsForMods(character);
  // Contexte d'effets (PER-67) : résout les valeurs scalantes et n'inclut que les
  // effets conditionnels dont l'interrupteur est actif.
  const effectCtx = effectContext(character);

  // Puces de la carte Défense (PER-137) : IMMUNITÉS (vert) d'abord, puis RÉDUCTIONS de dégâts (bleu).
  // Le cumul des RD plates de même portée (Fils du roc + Peau d'acier → RD 6) est fait côté moteur par
  // `stackedDamageReductions` ; ici on ne fait que mettre en badges (titre + breakdown des sources).
  const reductionBadges: DefenseBadgeData[] = [];
  const damageImmunityBadges: DefenseBadgeData[] = [];
  for (const r of stackedDamageReductions(character)) {
    const scopes = r.scope ? [r.scope] : undefined;
    if (r.kind === 'immunity') {
      damageImmunityBadges.push({
        key: `imm-${r.scope ?? 'all'}`,
        variant: 'immunity',
        scope: r.scope,
        text: r.scope ? undefined : 'tous DM',
        title: formatDamageReduction({ kind: 'immunity', scopes }).short,
        sources: r.sources.map((s) => ({ name: s.name, featureId: s.featureId })),
      });
    } else {
      const v = r.total ?? 0;
      reductionBadges.push({
        key: `rd-${r.kind}-${r.scope ?? 'all'}-${v}`,
        variant: 'reduction',
        scope: r.scope,
        text: r.kind === 'divide' ? `/${v}` : `${v}`,
        title: formatDamageReduction({ kind: r.kind, value: v, scopes }).short,
        // Breakdown : on n'affiche la valeur par source que si plusieurs sources cumulent.
        sources: r.sources.map((s) => ({
          name: s.name,
          value: r.sources.length > 1 && s.value !== undefined ? `${s.value}` : undefined,
          featureId: s.featureId,
        })),
      });
    }
  }
  // Immunités d'ÉTAT (peur, charme, ralenti, immobilisé) — PER-103, fusionnées comme puces vertes dans
  // la carte Défense. Icône d'état dédiée ; le nom complet reste dans le tooltip via `title`.
  const statusImmunityBadges: DefenseBadgeData[] = aggregateImmunities(modFeatureIds).map((imm) => ({
    key: `imm-${imm.id}`,
    variant: 'immunity',
    statusEffect: imm.id,
    title: `Immunité : ${imm.label}`,
    sources: imm.sources.map((s) => ({ name: s.name, featureId: s.featureId })),
  }));
  // Ordre voulu : immunités d'abord, réductions ensuite.
  const defenseBadges: DefenseBadgeData[] = [
    ...statusImmunityBadges,
    ...damageImmunityBadges,
    ...reductionBadges,
  ];

  // Plages de critique élargies ACTIVES (ex. Briseur d'os 19-20) — badges custom (variante 'critical')
  // sous les cartes Attaque au contact / à distance selon leur portée (PER-133). Les élargissements
  // d'une même portée se CUMULENT (PER-73) : on agrège en UN seul badge par portée.
  const critRanges = criticalRangeSources(character);
  const critBadgeForScope = (scope: 'melee' | 'ranged'): DefenseBadgeData[] => {
    const combined = combineCriticalRanges(critRanges, scope);
    if (!combined) return [];
    const f = formatCriticalRange(scope, combined.total);
    return [
      {
        key: `crit-${scope}`,
        variant: 'critical',
        text: f.short,
        title: `Critique ${f.short}`,
        sources: combined.sources.map((s) => ({ name: s.name, value: `+${s.value}`, featureId: s.featureId })),
      },
    ];
  };
  const meleeCriticalRanges = critBadgeForScope('melee');
  const rangedCriticalRanges = critBadgeForScope('ranged');

  // Carac de base des PM : VOL, ou substitution (Charisme héroïque → CHA, PER-101).
  const manaCast = manaCastingAbility(modFeatureIds, effectCtx.abilities);
  // Dentelles et rapière (seduction-r2, PER-71) : tant que l'interrupteur « aucune armure » est actif,
  // la DEF d'armure/bouclier est ignorée (la rapière+CHA la remplace).
  const dentellesActive =
    character.featureIds.includes('seduction-r2') && isEffectActive(character, 'seduction-r2', 0);
  const defenseEquip = dentellesActive
    ? { defBonus: 0, maxAgi: null }
    : defenseFromEquipment(character.equipment);

  const derivedInput: DerivedInput | null = family
    ? {
        // Caractéristiques EFFECTIVES (saisie + modificateurs permanents de capacités).
        abilities: effectCtx.abilities,
        level: character.level,
        family,
        defenseEquipment: defenseEquip,
        // Sorts connus = acquis ET EMPRUNTÉS (encadré « Appel à une autre capacité », p. 60). PER-73.
        spellCount: modFeatureIds.filter((fid) => featureById.get(fid)?.isSpell).length,
        manaAbility: manaCast.ability,
        // Bonus des capacités acquises (PER-63) + empruntées par choix (PER-66), fusionnés avec les
        // points de capacité orphelins convertis (p. 40).
        mods: mergeMods(modsFromFeatures(modFeatureIds, effectCtx), orphanMods(character)),
        // PV des niveaux mixtes d'un profil hybride (p. 177) ; identique au mono-famille sinon.
        hpFamilyGains: familyHpGains(character, rulesContext),
        // PV de base d'un profil hybride créé au niveau 1 (somme des deux familles, p. 180).
        hpLevel1Family: level1FamilyHp(character, rulesContext),
        // Détail par famille pour l'infobulle (vide hors hybridation).
        hpLevel1Families: level1HybridFamilies(character, rulesContext),
        // Détail du gain de PV niveau par niveau, pour l'infobulle.
        hpLevelGains: hpLevelGains(character, rulesContext),
      }
    : null;

  return {
    modFeatureIds,
    effectContext: effectCtx,
    derivedInput,
    defenseBadges,
    meleeCriticalRanges,
    rangedCriticalRanges,
  };
}
