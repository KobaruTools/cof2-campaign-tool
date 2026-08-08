/**
 * BUTIN DE COMBAT (extension PER-200/308) — génère en un clic un LOT de récompenses,
 * une par joueur, pour un combat qui vient de se terminer. Module PUR et testable
 * (aucune dépendance UI/réseau), aléa injecté comme `magicItemGenerator.ts`.
 *
 * Le livre déclare EXPLICITEMENT (p. 245) ne pas avoir de table unique de trésor : il n'y
 * a donc PAS non plus de table croisant le NC des créatures et le niveau des PJ pour du
 * butin (décision proprio 2026-08-08, après vérification qu'aucune table du genre n'est
 * extraite du PDF). Ce module reste fidèle à l'esprit du livre — niveau des PJ + cadre
 * de jeu (`recommendedMagicLevel`) — et ajoute PAR-DESSUS une répartition par tirage entre
 * plusieurs types de récompense (bourse de pièces / consommable / objet rare), à la place
 * du MJ qui choisirait manuellement une catégorie à chaque fois dans `MagicItemGeneratorDialog`.
 *
 * Barème des bourses de pièces par palier de niveau : AUCUNE table du livre n'en fournit
 * (confirmé ci-dessus) — c'est une RÈGLE MAISON, validée avec le propriétaire (2026-08-08),
 * éditable ci-dessous (`COIN_TABLE`) sans toucher au reste du module.
 */
import { coinPouchItemName, type CoinCurrency } from '@/lib/character/coinPouch';
import {
  generateMagicItem,
  type GameFrame,
  type GeneratedMagicItem,
  type MagicItemCategory,
  type RollDie,
} from '@/lib/character/magicItemGenerator';
import type { CustomItem, EquipmentLine } from '@/lib/character/types';

export type { GameFrame, GeneratedMagicItem, MagicItemCategory, RollDie };

/** Palier de niveau → bourse de pièces (RÈGLE MAISON, aucune table du livre, p. 245). */
export interface CoinBand {
  /** Dernier niveau couvert par ce palier (inclus). */
  maxLevel: number;
  /** Notation « NdM ». */
  dice: string;
  currency: CoinCurrency;
}

/** Paliers de 4 niveaux — 1 pp = 10 po (p. 181), progression x2 environ par palier. */
export const COIN_TABLE: readonly CoinBand[] = [
  { maxLevel: 4, dice: '2d6', currency: 'silver' },
  { maxLevel: 8, dice: '2d6', currency: 'gold' },
  { maxLevel: 12, dice: '4d6', currency: 'gold' },
  { maxLevel: 16, dice: '2d6', currency: 'platinum' },
  { maxLevel: 20, dice: '4d6', currency: 'platinum' },
];

/** Le palier de `COIN_TABLE` couvrant `level` (borné 1-20). */
export function coinBandForLevel(level: number): CoinBand {
  const lvl = Math.min(Math.max(Math.trunc(level), 1), 20);
  return COIN_TABLE.find((band) => lvl <= band.maxLevel) ?? COIN_TABLE[COIN_TABLE.length - 1];
}

/** Fabrique la ligne de bourse de pièces recommandée pour `level` (reconnue par `parseCoinPouchName`). */
export function coinPouchLineForLevel(level: number): CustomItem {
  const band = coinBandForLevel(level);
  return {
    custom: true,
    name: coinPouchItemName(band.dice, band.currency),
    quantity: 1,
    type: 'treasure',
  };
}

/** Catégories "consommable" du sous-lot commun (bourse OU l'une de ces deux). */
const CONSUMABLE_CATEGORIES: readonly MagicItemCategory[] = ['potion', 'scroll'];
/** Catégories du bucket "rare" (tout sauf bourse/potion/parchemin). */
const RARE_CATEGORIES: readonly MagicItemCategory[] = ['wand', 'weapon', 'defense', 'power'];

export type CombatLootRewardKind = 'coin' | 'magic';

/** Une récompense du lot : la ligne prête à mettre en réserve, + le détail si objet magique. */
export interface CombatLootReward {
  kind: CombatLootRewardKind;
  line: EquipmentLine;
  /** Présent seulement pour `kind: 'magic'` — détail « selon le livre » pour l'aperçu UI. */
  magic?: GeneratedMagicItem;
}

export interface CombatLootBatchRequest {
  /** Nombre de récompenses à générer (typiquement le nombre de joueurs du combat). */
  count: number;
  /** Niveau des PJ, pour le barème pièces ET la table de puissance magique (p. 244). */
  characterLevel: number;
  frame: GameFrame;
  /**
   * Part (0-1) de récompenses « communes » (bourse ou consommable) plutôt que « rares »
   * (arme/défense/baguette/objet de pouvoir). Défaut 0,8 (répartition 80/20 demandée).
   */
  commonRatio?: number;
  /**
   * Dans la part commune, part (0-1) de bourses de pièces plutôt que potion/parchemin.
   * Défaut 0,5 (sous-répartition réglable, décision proprio 2026-08-08).
   */
  coinRatio?: number;
  /**
   * Objets rares MINEURS par défaut (colonne niveau ÷ 2, p. 244) — plus prudent pour du
   * butin de combat courant qu'un trésor de fin de donjon (décision proprio 2026-08-08).
   */
  minorRare?: boolean;
}

const clamp01 = (n: number): number => Math.min(Math.max(n, 0), 1);

/**
 * GÉNÈRE un lot de `count` récompenses en déroulant, pour chacune : un jet pour choisir le
 * bucket commun/rare, puis un second jet pour choisir DANS le bucket obtenu. `roll` est
 * l'aléa injecté (un dN renvoyant `[1, sides]`, comme `magicItemGenerator.ts`) — déterministe
 * en test, basé sur `Math.random` côté UI.
 */
export function generateCombatLootBatch(req: CombatLootBatchRequest, roll: RollDie): CombatLootReward[] {
  const count = Math.max(0, Math.trunc(req.count));
  const commonRatio = clamp01(req.commonRatio ?? 0.8);
  const coinRatio = clamp01(req.coinRatio ?? 0.5);
  const rewards: CombatLootReward[] = [];

  for (let i = 0; i < count; i++) {
    const bucketRoll = roll(100);
    const isCommon = bucketRoll <= Math.round(commonRatio * 100);

    if (isCommon) {
      const subRoll = roll(100);
      if (subRoll <= Math.round(coinRatio * 100)) {
        rewards.push({ kind: 'coin', line: coinPouchLineForLevel(req.characterLevel) });
        continue;
      }
      const categoryRoll = roll(CONSUMABLE_CATEGORIES.length);
      const category = CONSUMABLE_CATEGORIES[categoryRoll - 1];
      const magic = generateMagicItem({ characterLevel: req.characterLevel, frame: req.frame, category }, roll);
      rewards.push({ kind: 'magic', line: magic.line, magic });
      continue;
    }

    const categoryRoll = roll(RARE_CATEGORIES.length);
    const category = RARE_CATEGORIES[categoryRoll - 1];
    const magic = generateMagicItem(
      { characterLevel: req.characterLevel, frame: req.frame, category, minor: req.minorRare ?? true },
      roll,
    );
    rewards.push({ kind: 'magic', line: magic.line, magic });
  }

  return rewards;
}
