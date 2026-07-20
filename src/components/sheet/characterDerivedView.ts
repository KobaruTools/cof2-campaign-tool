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
  isEffectActive,
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
import { unarmedStrike, type UnarmedStrikeView } from '@/lib/character/unarmedStrike';
import { combineCriticalRanges, formatCriticalRange } from '@/lib/ui/criticalRange';
import { formatDamageReduction } from '@/lib/ui/damageReduction';
import { defenseFromEquipment } from '@/components/wizard/helpers';
import type { DefenseBadgeData } from '@/components/sheet/DefenseBadge';

const familyById = new Map(families.map((f) => [f.id, f]));

/** DM d'une arme de CONTACT équipée, pour la vue « arme » de la bascule (PER-141). */
export interface MeleeWeaponDamageView {
  /**
   * Dé(s) de DM seuls, prêts pour `<DamageValue>` (ex. « 1d8 », « 2d6 », « 1d8+2 »). La
   * caractéristique (FOR) est ajoutée dynamiquement au rendu (via le rich-text, comme les
   * rangs de voies), pas figée dans cette chaîne.
   */
  dice: string;
  /** DM non létal (arme aux « DM temporaires possibles » : gourdin, bâton…). */
  nonLethal: boolean;
  /** Nom de l'arme (libellé + tooltip). */
  name: string;
}

/**
 * DM de l'arme de CONTACT tenue en main (main principale prioritaire, sinon secondaire),
 * pour la vue « arme » de la bascule arme ⇄ mains nues (PER-141). Renvoie le(s) dé(s) seuls ;
 * la FOR est ajoutée au rendu (règle de base des armes de contact) — la couche fine des
 * capacités qui modifient les DM d'arme reste PER-115. Retourne `null` si aucune arme de
 * contact n'est portée (le personnage se bat alors à mains nues). Les objets libres
 * (`CustomItem`) n'ont pas de DM structuré et sont ignorés.
 */
function wornMeleeWeaponDamage(character: Character): MeleeWeaponDamageView | null {
  const meleeRefs = character.equipment.filter(
    (line): line is EquipmentRef => {
      if (isCustomItem(line)) return false;
      const item = effectiveItem(line);
      return item?.category === 'weapon' && item.melee;
    },
  );
  // Main principale prioritaire, sinon main secondaire (combat à deux armes).
  const line = meleeRefs.find((l) => l.worn?.slot === 'mainHand') ?? meleeRefs.find((l) => l.worn?.slot === 'offHand');
  if (!line) return null;
  const item = effectiveItem(line);
  if (!item || item.category !== 'weapon') return null;
  // Prise à deux mains : DM à deux mains si l'arme en propose (p. 184).
  const dmg = line.worn?.grip === 'twoHands' && item.twoHandedDamage ? item.twoHandedDamage : item.damage;
  // Parenthèses de non-létalité gérées par un badge dédié, pas par le formateur ici.
  const dice = formatWeaponDamage({ ...dmg, nonLethal: false });
  return { dice, nonLethal: !!dmg.nonLethal, name: item.name };
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
  meleeWeaponDamage: MeleeWeaponDamageView | null;
  /** PER-141 — plage de critique au contact À MAINS NUES (Morsure du serpent), pour la vue mains nues de la bascule. */
  unarmedCriticalRanges: DefenseBadgeData[];
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
  const meleeWeaponDamage = wornMeleeWeaponDamage(character);
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
  // Dentelles et rapière (seduction-r2, PER-71) : tant que l'interrupteur « aucune armure » est actif,
  // la DEF d'armure/bouclier est ignorée (la rapière+CHA la remplace).
  const dentellesActive =
    character.featureIds.includes('seduction-r2') && isEffectActive(character, 'seduction-r2', 0);
  const defenseEquip = dentellesActive
    ? { defBonus: 0, maxAgi: null }
    : defenseFromEquipment(character.equipment);

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
    unarmed,
    meleeWeaponDamage,
    unarmedCriticalRanges,
  };
}
