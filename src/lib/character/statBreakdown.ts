/**
 * Ventilation d'une statistique dérivée par SOURCE (PER-256) : pour une valeur qui résulte de
 * plusieurs contributions (valeur de base + bonus de rang + bonus propagés par une capacité du
 * maître), expose la LISTE des contributions et leur origine, au lieu du seul total. Purement de
 * la dérivation (aucun React) — la donnée de provenance existe déjà côté moteur (décomposition de
 * l'expression de base via `resolveExpr`, et bonus de créature déjà résolus au gather, PER-94) ;
 * ce module ne fait que la RASSEMBLER pour l'affichage (info-bulle « Source(s) », cf. `DefenseBadge`).
 *
 * v1 = DÉFENSE des créatures uniquement (le seul cas où PER-94 crée un écart visible : golem
 * « Runes de défense » +2/+3/+4, loup « Tactiques de meute » +1, options de Golem supérieur). Le
 * type reste GÉNÉRIQUE pour s'étendre ensuite aux autres stats sans refonte.
 */
import { progression } from '@/data';
import type { Abilities } from '@/lib/engine';
import { parseRichText, resolveExpr } from '@/lib/ui/featureRichText';

/** Une contribution à une statistique : d'où elle vient et combien elle apporte (déjà signée). */
export interface StatContribution {
  /**
   * Libellé de la contribution : « Base » / « Rang » / nom d'une caractéristique pour les termes de
   * la valeur de base ; nom de la capacité source pour un bonus propagé (repli texte si pas de puce).
   */
  label: string;
  /** Montant numérique déjà SIGNÉ de cette contribution (un malus est négatif). */
  value: number;
  /**
   * Capacité SOURCE d'un bonus propagé (PER-94), rendue en puce de voie (`CapabilityChip`) dans
   * l'info-bulle — comme le breakdown des stats du personnage (`DefenseBadge`, PER-137). Absent pour
   * les termes de la valeur de base (« Base », « Rang »…), rendus en simple texte.
   */
  featureId?: string;
}

/** Ventilation complète d'une statistique : total + détail des contributions, dans l'ordre d'affichage. */
export interface StatBreakdown {
  total: number;
  contributions: StatContribution[];
}

/** Un bonus de DÉFENSE propagé à une créature (PER-94), déjà résolu en nombre, avec sa capacité source. */
export interface CreatureDefenseUpgrade {
  /** Capacité (ou voie hôte d'une option) qui octroie le bonus → puce de voie dans l'info-bulle. */
  featureId: string;
  /** Nom affiché de la source (nom de la capacité, ou libellé de l'option retenue) — repli texte. */
  name: string;
  /** Montant de DEF apporté (positif). */
  value: number;
}

/**
 * Construit la ventilation de la DÉFENSE d'une créature (PER-256) : décompose l'expression de DEF de
 * BASE (`[10 + rang]`, `[18]`…) en ses termes (« Base 10 », « Rang +2 ») via le moteur richText, puis
 * ajoute les bonus propagés par le maître (`upgrades`, ex. « Runes de défense +3 »). `null` si la DEF
 * n'est pas décomposable en un total déterministe (absente, ou contenant un dé) — l'appelant retombe
 * alors sur le rendu numérique habituel.
 *
 * `abilities`/`level`/`rank` = contexte de résolution des termes de base (identique au rendu de la
 * mini-fiche : caractéristiques du maître, niveau, rang atteint dans la voie hôte).
 */
export function buildDefenseBreakdown(
  baseDefense: string | undefined,
  upgrades: CreatureDefenseUpgrade[],
  abilities: Abilities,
  level: number,
  rank: number,
): StatBreakdown | null {
  if (!baseDefense) return null;
  // Premier segment « formule » de l'expression de base : la DEF est une valeur unique (`[...]`).
  const segment = parseRichText(baseDefense).find(
    (s) => s.kind === 'expr' || s.kind === 'quantity' || s.kind === 'term',
  );
  if (!segment || !('terms' in segment)) return null;
  const resolved = resolveExpr(segment.terms, abilities, level, progression, rank);
  // Un dé dans la DEF (rarissime) → pas de total unique à ventiler : on laisse le rendu par défaut.
  if (resolved.total == null) return null;

  const contributions: StatContribution[] = [];
  let baseNumberSeen = false;
  for (const part of resolved.parts) {
    // Le PREMIER terme numérique nu d'une DEF est sa valeur de BASE (« 10 »), les rares suivants
    // restent des « Bonus ». Les autres termes gardent leur libellé moteur (« Rang », nom de carac).
    let label = part.label;
    if (part.kind === 'number' && !baseNumberSeen) {
      label = 'Base';
      baseNumberSeen = true;
    }
    contributions.push({ label, value: part.sign * (part.value ?? 0) });
  }

  let total = resolved.total;
  for (const u of upgrades) {
    contributions.push({ label: u.name, value: u.value, featureId: u.featureId });
    total += u.value;
  }
  return { total, contributions };
}
