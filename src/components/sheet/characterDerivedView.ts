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
import { isCustomItem, type Character, type EquipmentRef } from '@/lib/character/types';
import {
  activeFeatureIdsForMods,
  aggregateImmunities,
  criticalRangeSources,
  defenseAbility,
  effectContext,
  manaCastingAbility,
  modsFromFeatures,
  stackedDamageReductions,
  type EffectContext,
} from '@/lib/character/effects';
import { mergeMods, orphanMods } from '@/lib/character/orphanPoints';
import { familyHpGains, hpLevelGains, level1FamilyHp, level1HybridFamilies } from '@/lib/character/hp';
import { rulesContext } from '@/lib/character/rulesContext';
import { effectiveItem } from '@/lib/character/items';
import { formatWeaponDamage } from '@/lib/character/weaponDamage';
import {
  weaponDamageBonuses,
  type AttackMode,
  type PermanentFlatBonus,
  type SituationalDamageBonus,
} from '@/lib/character/weaponDamageBonus';
import { weaponAttackBonuses } from '@/lib/character/attackBonus';
import type { ModSources } from '@/lib/ui/derivedStatBreakdown';
import { unarmedStrike, type UnarmedStrikeView } from '@/lib/character/unarmedStrike';
import type { AbilityId, Weapon } from '@/data/schema';
import { combineCriticalRanges, formatCriticalRange } from '@/lib/ui/criticalRange';
import { formatDamageReduction } from '@/lib/ui/damageReduction';
import { defenseFromEquipment } from '@/components/wizard/helpers';
import type { DefenseBadgeData } from '@/components/sheet/DefenseBadge';

const familyById = new Map(families.map((f) => [f.id, f]));

/** DM d'une arme équipée, pour l'affichage des cartes d'attaque (PER-141 contact, PER-115 distance). */
export interface WeaponDamageView {
  /**
   * Dé(s) de DM seuls, prêts pour `<DamageValue>` (ex. « 1d8 », « 2d6 », « 1d8+2 »). La ou les
   * caractéristiques ajoutées (`abilities`) sont rendues dynamiquement à côté, pas figées ici.
   */
  dice: string;
  /**
   * Caractéristique(s) ajoutée(s) aux DM, RÉSOLUES au rendu (best-of affiché comme les rangs de
   * voies). Contact : `['FOR']` de base (p. 183) + bonus permanents des capacités. Distance :
   * vide de base (aucune carac, p. 185) + bonus permanents (Archer émérite : `['PER']`).
   */
  abilities: AbilityId[];
  /**
   * Bonus PLATS permanents ajoutés aux DM par les capacités (ex. Spécialisation du maître d'armes,
   * +N selon l'arme portée — PER-226), AVEC leur source. Vide si aucun. Le TOTAL est rendu dans une
   * puce grise (contour tireté blanc, non liée à une carac) après les caracs ; l'info-bulle détaille
   * chaque source et sa contribution (breakdown), pour comprendre la somme quand plusieurs s'ajoutent.
   */
  flatBonuses: PermanentFlatBonus[];
  /** DM non létal (arme aux « DM temporaires possibles » : gourdin, bâton…). */
  nonLethal: boolean;
  /** Nom de l'arme (libellé + tooltip). */
  name: string;
}

/** Ancien nom conservé pour la carte de contact (PER-141). */
export type MeleeWeaponDamageView = WeaponDamageView;

/**
 * Arme tenue en main pour un `mode` d'attaque donné (main principale prioritaire, sinon
 * secondaire pour le combat à deux armes). `null` si aucune arme de ce mode n'est portée. Les
 * objets libres (`CustomItem`) n'ont pas de DM structuré et sont ignorés.
 */
function wornWeaponForMode(character: Character, mode: AttackMode): { item: Weapon; line: EquipmentRef } | null {
  const refs = character.equipment.filter((line): line is EquipmentRef => {
    if (isCustomItem(line)) return false;
    const item = effectiveItem(line);
    if (item?.category !== 'weapon') return false;
    return mode === 'melee' ? item.melee : item.ranged;
  });
  const line = refs.find((l) => l.worn?.slot === 'mainHand') ?? refs.find((l) => l.worn?.slot === 'offHand');
  if (!line) return null;
  const item = effectiveItem(line);
  if (!item || item.category !== 'weapon') return null;
  return { item, line };
}

/**
 * DM de l'arme portée pour un `mode`, prêt pour l'affichage. Le(s) dé(s) seul(s) + les caracs
 * ajoutées (base + bonus permanents des capacités, PER-115). `null` si aucune arme de ce mode
 * n'est portée. Prise à deux mains : DM à deux mains si l'arme en propose (contact, p. 184).
 */
function wornWeaponDamage(character: Character, mode: AttackMode): WeaponDamageView | null {
  const worn = wornWeaponForMode(character, mode);
  if (!worn) return null;
  const { item, line } = worn;
  const dmg =
    mode === 'melee' && line.worn?.grip === 'twoHands' && item.twoHandedDamage ? item.twoHandedDamage : item.damage;
  // Parenthèses de non-létalité gérées par un badge dédié, pas par le formateur ici.
  const dice = formatWeaponDamage({ ...dmg, nonLethal: false });
  // Carac de base : FOR au contact (p. 183), aucune à distance (p. 185). Les capacités ajoutent
  // leurs bonus PERMANENTS par-dessus (Archer émérite : +PER à l'arc).
  const baseAbilities: AbilityId[] = mode === 'melee' ? ['FOR'] : [];
  const bonuses = weaponDamageBonuses(character, mode, item);
  const added = bonuses.addedAbilities.map((b) => b.ability);
  return {
    dice,
    abilities: [...baseAbilities, ...added],
    flatBonuses: bonuses.addedFlat,
    nonLethal: !!dmg.nonLethal,
    name: item.name,
  };
}

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
  /** PER-141 — attaque à mains nues (dé, carac, létalité, magie, critique). Alimente la bascule de la carte Attaque au contact. */
  unarmed: UnarmedStrikeView;
  /** PER-141 — DM de l'arme de CONTACT équipée (vue « arme » de la bascule). `null` = aucune arme de contact portée. */
  meleeWeaponDamage: WeaponDamageView | null;
  /** PER-141 — plage de critique au contact À MAINS NUES (Morsure du serpent), pour la vue mains nues de la bascule. */
  unarmedCriticalRanges: DefenseBadgeData[];
  /** PER-115 — DM de l'arme à DISTANCE équipée (carte Attaque à distance). `null` = aucune arme à distance portée. */
  rangedWeaponDamage: WeaponDamageView | null;
  /** PER-115 — bonus de DM SITUATIONNELS au contact (Attaque éclair, Chasseur émérite…), en badges. */
  meleeSituationalDamage: SituationalDamageBonus[];
  /** PER-115 — bonus de DM SITUATIONNELS à distance (Chasseur émérite…), en badges. */
  rangedSituationalDamage: SituationalDamageBonus[];
  /**
   * PER-226 — sous-termes de breakdown des bonus à la touche conditionnés à l'arme portée (maître
   * d'armes : +1 au contact / à distance avec une arme de prédilection). Le TOTAL est déjà FONDU dans
   * `derivedInput.mods` (donc dans le score affiché) — ceci ne sert qu'à l'attribution dans l'infobulle
   * « i » de la touche (aucun badge : interface légère, décision propriétaire).
   */
  attackBonusModSources: ModSources;
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

  // Attaque à mains nues (PER-141) + DM de l'arme de contact équipée, pour la bascule
  // de la carte « Attaque au contact ».
  const unarmed = unarmedStrike(character);
  const meleeWeaponDamage = wornWeaponDamage(character, 'melee');
  // DM de l'arme à distance équipée + bonus situationnels des deux modes (PER-115).
  const rangedWeaponDamage = wornWeaponDamage(character, 'ranged');
  const meleeWorn = wornWeaponForMode(character, 'melee')?.item ?? null;
  const rangedWorn = wornWeaponForMode(character, 'ranged')?.item ?? null;
  const meleeSituationalDamage = weaponDamageBonuses(character, 'melee', meleeWorn).situational;
  const rangedSituationalDamage = weaponDamageBonuses(character, 'ranged', rangedWorn).situational;
  // Bonus à la touche conditionnés à l'arme portée (PER-226) : maître d'armes +1 au contact avec une
  // arme de prédilection, +1 à distance avec une arme de jet de prédilection. Le total est FONDU dans
  // les mods (score) plus bas ; on garde le détail des sources pour l'infobulle de la touche.
  const meleeAttackBonus = weaponAttackBonuses(character, 'melee', meleeWorn);
  const rangedAttackBonus = weaponAttackBonuses(character, 'ranged', rangedWorn);
  const attackBonusModSources: ModSources = {};
  if (meleeAttackBonus.sources.length)
    attackBonusModSources.meleeAttack = meleeAttackBonus.sources.map((s) => ({
      label: s.name,
      value: s.value,
      featureId: s.featureId,
    }));
  if (rangedAttackBonus.sources.length)
    attackBonusModSources.rangedAttack = rangedAttackBonus.sources.map((s) => ({
      label: s.name,
      value: s.value,
      featureId: s.featureId,
    }));
  // Plage de critique au contact ACTIVE à mains nues (Morsure du serpent) : construite depuis
  // la vue mains nues (indépendante de l'interrupteur manuel de la vue « arme »).
  const unarmedCriticalRanges: DefenseBadgeData[] =
    unarmed.criticalRangeBonus > 0
      ? [
          {
            key: 'crit-melee-unarmed',
            variant: 'critical',
            text: formatCriticalRange('melee', unarmed.criticalRangeBonus).short,
            title: `Critique ${formatCriticalRange('melee', unarmed.criticalRangeBonus).short}`,
            sources: unarmed.sources
              .filter((s) => featureById.get(s.featureId)?.criticalRange?.scope === 'melee')
              .map((s) => ({ name: s.name, featureId: s.featureId })),
          },
        ]
      : [];

  // Carac de base des PM : VOL, ou substitution (Charisme héroïque → CHA, PER-101).
  const manaCast = manaCastingAbility(modFeatureIds, effectCtx.abilities);
  // DEF d'équipement : uniquement le PORTÉ (PER-76). Dentelles et rapière (seduction-r2) n'annule
  // plus l'équipement (PER-106) : sans armure, l'armure vaut 0 DEF naturellement, tandis que le
  // bouclier et la DEF magique se cumulent avec son bonus `armor-def-bonus` (min(CHA, rang)).
  const defenseEquip = defenseFromEquipment(character.equipment);

  // Caractéristique de DEF : AGI par défaut, ou substitution retenue par une capacité
  // (Peau de pierre du barbare : CON, PER-131). Le plafond d'armure s'appliquera à elle.
  const defAbility = defenseAbility(modFeatureIds, effectCtx);

  const derivedInput: DerivedInput | null = family
    ? {
        // Caractéristiques EFFECTIVES (saisie + modificateurs permanents de capacités).
        abilities: effectCtx.abilities,
        level: character.level,
        family,
        defenseEquipment: defenseEquip,
        defAbility,
        // Sorts connus = acquis ET EMPRUNTÉS (encadré « Appel à une autre capacité », p. 60). PER-73.
        spellCount: modFeatureIds.filter((fid) => featureById.get(fid)?.isSpell).length,
        manaAbility: manaCast.ability,
        // Bonus des capacités acquises (PER-63) + empruntées par choix (PER-66), fusionnés avec les
        // points de capacité orphelins convertis (p. 40) ET les bonus à la touche conditionnés à
        // l'arme portée (maître d'armes, PER-226) — fondus dans le score, détaillés dans l'infobulle.
        mods: mergeMods(modsFromFeatures(modFeatureIds, effectCtx), orphanMods(character), {
          meleeAttack: meleeAttackBonus.total,
          rangedAttack: rangedAttackBonus.total,
        }),
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
    unarmed,
    meleeWeaponDamage,
    unarmedCriticalRanges,
    rangedWeaponDamage,
    meleeSituationalDamage,
    rangedSituationalDamage,
    attackBonusModSources,
  };
}
