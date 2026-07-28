/**
 * TRAITS DÉFENSIFS d'une créature → badges du cadre Défense (PER-260).
 *
 * Le bloc de bestiaire noyait ces protections dans le texte verbatim des capacités (« divise par
 * deux les DM contondants », « immunisé au sommeil et à la paralysie »…) : elles ne sautaient pas
 * aux yeux du MJ en pleine partie. On les remonte donc en BADGES, avec le MÊME composant que la
 * carte Défense d'une fiche de personnage (`DefenseBadge`) → cohérence visuelle immédiate.
 *
 * Fonction PURE (données → vue) : le texte verbatim reste affiché tel quel à côté, le badge ne
 * fait que le représenter. Ordre des badges calqué sur la fiche : immunités d'ÉTAT, puis immunités
 * de TYPE DE DÉGÂT, puis réductions (plates et divisions).
 */
import { IMMUNITY_LABELS, type Creature, type DamageReduction, type ResistibleDamageType } from '@/data/schema';
import { formatDamageReduction } from '@/lib/ui/damageReduction';
import type { DefenseBadgeData } from '@/components/sheet/DefenseBadge';

/**
 * Tournure verbatim de l'immunité à un type de dégât (« Immunité au feu »…). Le badge ne montre
 * que l'icône du type ; ce libellé alimente son infobulle. On suit la terminologie du livre
 * (« électricité », pas « foudre ») pour les types élémentaires.
 */
const IMMUNITY_PHRASE: Partial<Record<ResistibleDamageType, string>> = {
  physical: 'aux DM physiques',
  'non-magical': 'aux DM non magiques',
  magical: 'à la magie',
  fire: 'au feu',
  cold: 'au froid',
  lightning: "à l'électricité",
  acid: "à l'acide",
  poison: 'au poison',
  disease: 'à la maladie',
  bludgeoning: 'aux DM contondants',
  piercing: 'aux DM perforants',
  slashing: 'aux DM tranchants',
};

/** Titre d'infobulle d'un badge d'immunité de type de dégât. */
export function damageImmunityTitle(type: ResistibleDamageType): string {
  return `Immunité ${IMMUNITY_PHRASE[type] ?? `aux DM (${type})`}`;
}

/** Normalise le champ (entrée seule ou tableau) en liste. */
function asList(dr: Creature['damageReduction']): DamageReduction[] {
  if (!dr) return [];
  return Array.isArray(dr) ? dr : [dr];
}

/**
 * Une entrée d'immunité de type de dégât produit UN badge par type couvert (« immunisé au feu ET
 * au froid » = deux icônes, comme sur la fiche) ; sans portée, un seul badge « tous DM ».
 */
function immunityBadges(dr: DamageReduction): DefenseBadgeData[] {
  const scopes = dr.scopes ?? [];
  if (scopes.length === 0)
    return [
      {
        key: 'imm-all',
        variant: 'immunity',
        text: 'tous DM',
        title: formatDamageReduction({ kind: 'immunity' }).short,
        sources: withNote(formatDamageReduction({ kind: 'immunity' }).long, dr),
      },
    ];
  return scopes.map((scope) => ({
    key: `imm-${scope}`,
    variant: 'immunity' as const,
    scope,
    title: damageImmunityTitle(scope),
    sources: withNote(damageImmunityTitle(scope), dr),
  }));
}

/**
 * Lignes de « sources » de l'info-bulle : l'explication de la protection, puis la PRÉCISION
 * éventuelle (exception ou condition, `DamageReduction.note`) — un badge ne doit jamais laisser
 * croire à une protection plus large qu'elle ne l'est.
 */
function withNote(explanation: string, dr: DamageReduction): { name: string }[] {
  return dr.note ? [{ name: explanation }, { name: dr.note }] : [{ name: explanation }];
}

/** Badge d'une réduction plate (« RD 5 ») ou par division (« RD ÷2 »), typée ou non. */
function reductionBadge(dr: DamageReduction, index: number): DefenseBadgeData {
  const value = typeof dr.value === 'number' ? dr.value : undefined;
  const label = formatDamageReduction(dr);
  return {
    key: `rd-${index}-${dr.kind}-${(dr.scopes ?? ['all']).join('-')}`,
    variant: 'reduction',
    // Une RD typée sur PLUSIEURS types garde l'icône générique « RD » (les portées sont dans le
    // titre) : on ne peut afficher qu'une icône par badge.
    scope: dr.scopes?.length === 1 ? dr.scopes[0] : undefined,
    text: dr.kind === 'divide' ? `/${value ?? 2}` : `${value ?? '?'}`,
    title: label.short,
    sources: withNote(label.long, dr),
  };
}

/**
 * Sépare la note de PV en une éventuelle RÉDUCTION DE DÉGÂTS en tête (« RD 5 », « RD3 ») et le
 * RESTE verbatim (rare : les formes de PV du nécrocrâne). `rd` = valeur numérique seule (« 5 ») ;
 * `note` = ce qui reste (sinon absent).
 */
export function splitHitPointsNote(note?: string): { rd?: string; note?: string } {
  if (!note) return {};
  const m = note.match(/^RD\s*(\d+)\s*;?\s*(.*)$/i);
  if (!m) return { note };
  const rest = m[2].trim();
  return { rd: m[1], note: rest || undefined };
}

/**
 * Badge de la RD IMPRIMÉE AVEC LES PV (« PV 90 (RD 3) »). Elle reste une protection comme les
 * autres : sa place est le cadre DÉFENSE, pas la cellule des points de vigueur (décision proprio,
 * 2026-07-28). La source rappelle d'où vient le chiffre.
 */
function printedRdBadge(rd: string): DefenseBadgeData {
  return {
    key: `rd-pv-${rd}`,
    variant: 'reduction',
    text: rd,
    title: `RD ${rd}`,
    sources: [
      { name: `Réduit de ${rd} les DM subis.` },
      { name: 'Valeur imprimée avec les points de vigueur.' },
    ],
  };
}

/**
 * Badges du cadre Défense d'une créature : immunités d'état, immunités de type de dégât, puis
 * réductions — RD imprimée avec les PV d'abord (la protection « de base »), puis celles décrites
 * par les capacités. Liste vide si la créature n'a aucun trait défensif.
 */
export function creatureDefenseBadges(creature: Creature): DefenseBadgeData[] {
  const statusBadges: DefenseBadgeData[] = (creature.statusImmunities ?? []).map((id) => ({
    key: `imm-${id}`,
    variant: 'immunity',
    statusEffect: id,
    title: `Immunité : ${IMMUNITY_LABELS[id]}`,
    sources: [{ name: `Immunisé à l'état « ${IMMUNITY_LABELS[id]} ».` }],
  }));
  const entries = asList(creature.damageReduction);
  const damageImmunities = entries.filter((dr) => dr.kind === 'immunity').flatMap(immunityBadges);
  const reductions = entries
    .map((dr, i) => ({ dr, i }))
    .filter(({ dr }) => dr.kind !== 'immunity')
    .map(({ dr, i }) => reductionBadge(dr, i));
  // RD imprimée avec les PV : rendue ici, SAUF si une capacité en donne la version précise (même
  // valeur, portée nommée) — sinon la même protection s'afficherait deux fois.
  const { rd } = splitHitPointsNote(creature.hitPointsNote);
  const printed = rd && !defenseCoversPrintedRd(creature, rd) ? [printedRdBadge(rd)] : [];
  return [...statusBadges, ...damageImmunities, ...printed, ...reductions];
}

/**
 * La RD imprimée avec les PV (« PV 15 (RD 5) ») est-elle DÉJÀ portée, en plus précis, par une
 * entrée de `damageReduction` ? Le livre imprime souvent un raccourci à côté des PV que la capacité
 * détaille ensuite (démonet : « RD 5 » imprimée, « RD 5 sur les armes non magiques » en capacité) :
 * on ne garde alors que la version PRÉCISE (PER-260).
 */
export function defenseCoversPrintedRd(creature: Creature, printedRd: string): boolean {
  const value = Number(printedRd);
  if (!Number.isFinite(value)) return false;
  return asList(creature.damageReduction).some((dr) => dr.kind === 'flat' && dr.value === value);
}
