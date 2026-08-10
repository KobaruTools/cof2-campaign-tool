/**
 * Cristaux ATTRIBUÉS à un autre personnage (PER-360) — 5e catalogue d'états de combat, à côté du
 * glossaire, des situationnels, des effets d'environnement et des buffs de groupe.
 *
 * La règle l'autorise explicitement (voie des cristaux, p. 156, rang 4) : « Le personnage apprend à
 * créer le cristal de son choix. **Il peut le porter ou le confier à la personne de son choix.** »
 * Et la note de voie ajoute qu'il « peut activer ou désactiver un cristal qu'il a fabriqué à
 * n'importe quelle distance par une action limitée » — l'attribution ne demande donc aucun
 * arbitrage de portée, seulement de savoir qui porte quoi.
 *
 * Un cristal confié voyage comme un ÉTAT DE COMBAT : il se pose sur la carte du porteur, sa fiche
 * l'affiche en puce avec le verbatim et le nom du JOUEUR qui l'a attribué (`AppliedStatus.castBy`),
 * et le MJ peut le lever comme n'importe quel effet bénéfique. L'id de l'état EST l'id du cristal
 * (`cristal-bleu-nuit`…) : les espaces d'ids restent disjoints, et rien n'a à être traduit d'un
 * catalogue à l'autre.
 *
 * CES ENTRÉES NE PORTENT AUCUN `modifiers`, ET C'EST VOLONTAIRE. Les chiffres d'un cristal vivent
 * déjà dans `src/data/crystals.ts` (source unique) et sont appliqués par le canal des cristaux
 * (`crystalAbilityBonuses` / `crystalStatBonuses`, alimentés côté cible par
 * `Character.receivedCrystalIds`). Les recopier ici en `StatusModifiers` les compterait DEUX fois —
 * et ne saurait de toute façon pas exprimer un bonus de CARACTÉRISTIQUE, que ce canal-là ne connaît
 * pas (6 des 14 cristaux en donnent un). L'état ne sert donc qu'à DIRE qui porte quoi ; le moteur,
 * lui, lit le cristal.
 *
 * Les 14 entrées sont GÉNÉRÉES depuis `CRYSTALS` : le catalogue des états ne peut pas diverger de
 * celui des cristaux.
 *
 * Source : CBHS_06_Chroniques_Oubliees_2_web_v2.pdf, p. 156.
 */
import { CRYSTALS, crystalLabel, type Crystal } from './crystals';
import type { StatusEffectEntry } from './schema';

/** Page du livre où la voie des cristaux (et sa table) est décrite. */
const CRYSTAL_SOURCE_PAGE = 156;

/**
 * Verbatim de la règle d'attribution (rang 4, p. 156), rappelé en info-bulle sous l'effet du
 * cristal : sans lui, la puce ne dirait pas d'où vient le droit de confier le cristal.
 */
export const CRYSTAL_ENTRUST_RULE =
  'Il peut le porter ou le confier à la personne de son choix. ' +
  'Le personnage peut activer ou désactiver un cristal qu’il a fabriqué à n’importe quelle ' +
  'distance par une action limitée.';

/** Entrée de catalogue d'un cristal confié : « Cristal Bleu nuit (Rhombe) » + son effet verbatim. */
function crystalStatusEntry(crystal: Crystal): StatusEffectEntry {
  return {
    label: `Cristal ${crystalLabel(crystal)}`,
    effect: `${crystal.effectText}. ${CRYSTAL_ENTRUST_RULE}`,
    sourcePage: CRYSTAL_SOURCE_PAGE,
  };
}

/**
 * Ids des états « cristal confié » — identiques aux ids de cristaux, l'espace d'ids étant disjoint
 * de ceux des quatre autres catalogues.
 *
 * Énumérés À LA MAIN, et c'est le seul endroit où quoi que ce soit des cristaux l'est : un
 * `CRYSTALS.map()` rendrait un `string[]`, ce qui dissoudrait l'union littérale des ids d'état
 * (`AnyStatusEffectId`) en un `string` où plus aucune faute de frappe ne serait rattrapée. La
 * correspondance avec le catalogue des cristaux est donc VÉRIFIÉE PAR TEST (égalité d'ensembles),
 * et le contenu des entrées, lui, reste généré depuis `CRYSTALS`.
 */
export const CRYSTAL_STATUS_IDS = [
  'cristal-blanc-laiteux',
  'cristal-bleu-incandescent',
  'cristal-bleu-nuit',
  'cristal-bleu-pale',
  'cristal-irise',
  'cristal-noir-fume',
  'cristal-orange',
  'cristal-violet',
  'cristal-rose-laiteux',
  'cristal-rouge-sang',
  'cristal-rouge-et-bleu',
  'cristal-rose-vif',
  'cristal-translucide',
  'cristal-vert-pale',
] as const;
export type CrystalStatusId = (typeof CRYSTAL_STATUS_IDS)[number];

/** Catalogue des 14 cristaux confiables, keyé par id de cristal. */
export const CRYSTAL_STATUSES: Record<CrystalStatusId, StatusEffectEntry> = Object.fromEntries(
  CRYSTALS.map((c) => [c.id, crystalStatusEntry(c)]),
) as Record<CrystalStatusId, StatusEffectEntry>;

const CRYSTAL_STATUS_ID_SET: ReadonlySet<string> = new Set(CRYSTAL_STATUS_IDS);

/** L'id désigne-t-il un cristal confié ? (donnée réseau non fiable comprise) */
export function isCrystalStatusId(value: unknown): value is CrystalStatusId {
  return typeof value === 'string' && CRYSTAL_STATUS_ID_SET.has(value);
}
