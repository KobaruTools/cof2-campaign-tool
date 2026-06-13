/**
 * Détail (« breakdown ») de chaque statistique dérivée pour l'affichage : liste
 * des termes additifs avec leur valeur signée, afin de montrer au joueur d'où
 * vient chaque total. Pur UI, mais les formules reflètent fidèlement le moteur
 * (`src/lib/engine/derived.ts`) — toute évolution des maths doit être répercutée
 * ici. Les pages citées renvoient au livre de base CO2.
 */
import type { DerivedInput } from '@/lib/engine';
import { MAX_ATTACK_LEVEL } from '@/lib/engine';
import type { DerivedStatId } from './derivedStats';

/** Un terme du détail : libellé français + valeur (signée à l'affichage). */
export interface BreakdownTerm {
  label: string;
  value: number;
}

export interface StatBreakdown {
  /** Termes additifs ; leur somme vaut `total`. */
  terms: BreakdownTerm[];
  /** Total (= valeur affichée). `null` quand la stat ne s'applique pas. */
  total: number | null;
  /** Précision libre (type de dé, cas particulier…). */
  note?: string;
  /** Page source dans le livre de base CO2. */
  page: number;
}

const sum = (terms: BreakdownTerm[]) => terms.reduce((acc, t) => acc + t.value, 0);

/**
 * Construit le détail d'une statistique dérivée à partir des mêmes entrées que
 * `deriveStats`. Les modificateurs plats (`mods`) ne sont inclus que s'ils sont
 * non nuls, pour ne pas afficher de ligne « +0 ».
 */
export function derivedStatBreakdown(statId: DerivedStatId, input: DerivedInput): StatBreakdown {
  const { abilities, level, family, defenseEquipment, spellCount } = input;
  const mods = input.mods ?? {};
  const mod = (label: string, value: number | undefined): BreakdownTerm[] =>
    value ? [{ label, value }] : [];
  const baseAttack = Math.min(level, MAX_ATTACK_LEVEL);

  switch (statId) {
    case 'maxHp': {
      const terms: BreakdownTerm[] = [
        { label: `Famille de profil (2 × ${family.baseHp} PV de base)`, value: 2 * family.baseHp },
        { label: 'Constitution (CON)', value: abilities.CON },
      ];
      if (level > 1) {
        terms.push({
          label: `Niveaux 2 à ${level} ((${family.hpPerLevel} + CON ${abilities.CON}) × ${level - 1})`,
          value: (family.hpPerLevel + abilities.CON) * (level - 1),
        });
      }
      terms.push(...mod('Capacités / divers', mods.maxHp));
      return { terms, total: sum(terms), page: 30 };
    }
    case 'defense': {
      const cappedAgi =
        defenseEquipment.maxAgi === null
          ? abilities.AGI
          : Math.min(abilities.AGI, defenseEquipment.maxAgi);
      const terms: BreakdownTerm[] = [
        { label: 'Base', value: 10 },
        { label: 'Agilité (AGI)', value: cappedAgi },
        ...mod('Armure / bouclier', defenseEquipment.defBonus),
        ...mod('Capacités / divers', mods.def),
      ];
      const note =
        defenseEquipment.maxAgi !== null && abilities.AGI > defenseEquipment.maxAgi
          ? `AGI plafonnée à ${defenseEquipment.maxAgi} par l'armure portée (p. 188).`
          : undefined;
      return { terms, total: sum(terms), note, page: 31 };
    }
    case 'initiative': {
      const terms: BreakdownTerm[] = [
        { label: 'Base', value: 10 },
        { label: 'Perception (PER)', value: abilities.PER },
        ...mod('Capacités / divers', mods.initiative),
      ];
      return { terms, total: sum(terms), page: 31 };
    }
    case 'luckPoints': {
      const terms: BreakdownTerm[] = [
        { label: 'Base', value: 2 },
        { label: 'Charisme (CHA)', value: abilities.CHA },
        ...mod('Bonus de famille', family.bonusLuckPointsOnCreation),
        ...mod('Capacités / divers', mods.luckPoints),
      ];
      return { terms, total: Math.max(0, sum(terms)), page: 30 };
    }
    case 'recoveryDice': {
      const terms: BreakdownTerm[] = [
        { label: 'Base', value: 2 },
        { label: 'Constitution (CON)', value: abilities.CON },
        ...mod('Bonus de famille', family.bonusRecoveryDiceOnCreation),
        ...mod('Capacités / divers', mods.recoveryDiceCount),
      ];
      return {
        terms,
        total: Math.max(0, sum(terms)),
        note: `Type de dé déterminé par la famille de profil : ${family.recoveryDie}.`,
        page: 30,
      };
    }
    case 'manaPoints': {
      if (spellCount <= 0) {
        return { terms: [], total: null, note: 'Aucun sort connu → pas de réserve de mana.', page: 31 };
      }
      const terms: BreakdownTerm[] = [
        { label: 'Volonté (VOL)', value: abilities.VOL },
        { label: 'Sorts connus', value: spellCount },
        ...mod('Capacités / divers', mods.manaPoints),
      ];
      return { terms, total: Math.max(0, sum(terms)), page: 31 };
    }
    case 'meleeAttack': {
      const terms: BreakdownTerm[] = [
        { label: `Niveau (max ${MAX_ATTACK_LEVEL})`, value: baseAttack },
        { label: 'Force (FOR)', value: abilities.FOR },
        ...mod('Capacités / divers', mods.meleeAttack),
      ];
      return { terms, total: sum(terms), page: 32 };
    }
    case 'rangedAttack': {
      const terms: BreakdownTerm[] = [
        { label: `Niveau (max ${MAX_ATTACK_LEVEL})`, value: baseAttack },
        { label: 'Agilité (AGI)', value: abilities.AGI },
        ...mod('Capacités / divers', mods.rangedAttack),
      ];
      return { terms, total: sum(terms), page: 32 };
    }
    case 'magicAttack': {
      const terms: BreakdownTerm[] = [
        { label: `Niveau (max ${MAX_ATTACK_LEVEL})`, value: baseAttack },
        { label: 'Volonté (VOL)', value: abilities.VOL },
        ...mod('Capacités / divers', mods.magicAttack),
      ];
      return { terms, total: sum(terms), page: 32 };
    }
  }
}
