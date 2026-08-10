/**
 * PRÉSENTATION des états de combat — part PURE (aucune dépendance React/MUI), partagée par la palette
 * de l'écran de MJ (`CombatStatusPalette`), les cartes du Combat Tracker, la projection et le rappel
 * de la fiche joueur. Extraite du composant pour être testable sans DOM.
 *
 * Quatre catalogues cohabitent (taxonomie PER-288, étendue par PER-104) et se distinguent ici par leur
 * GROUPE et leur TEINTE : états préjudiciables du glossaire (p. 214-215), effets situationnels de voie,
 * états d'environnement (conditions de la scène, ex. « Combat aquatique » p. 215) et buffs de groupe
 * (Chant des héros p. 67, Bénédiction p. 124) — les seuls BÉNÉFIQUES, d'où leur teinte verte.
 */
import {
  BENEFICIAL_EFFECT_IDS,
  BENEFICIAL_EFFECT_LABELS,
  ENVIRONMENTAL_EFFECT_IDS,
  ENVIRONMENTAL_EFFECT_LABELS,
  SITUATIONAL_EFFECT_LABELS,
  STATUS_EFFECT_IDS,
  STATUS_EFFECT_LABELS,
  type BeneficialEffectId,
  type EnvironmentalEffectId,
  type SituationalEffectId,
  type StatusEffectId,
} from '@/data/schema';
import { CRYSTAL_STATUS_IDS, CRYSTAL_STATUSES } from '@/data/crystalStatuses';
import type { AnyStatusEffectId, StatusOrigin } from '@/lib/character/statusEffects';

/** Un groupe de la palette (titre + ids d'états). */
export interface StatusGroup {
  title: string;
  ids: readonly AnyStatusEffectId[];
  /**
   * FAMILLE du groupe, en clair : ce que le rendu doit tester quand il traite une famille à part
   * (la croix de levée collective sur les buffs de groupe). Comparer le `title` français marcherait,
   * mais casserait au premier libellé retouché.
   */
  family: StatusFamily;
}

/** Les quatre familles de la palette (cf. taxonomie PER-288, étendue par PER-104). */
export type StatusFamily = 'harmful' | 'situational' | 'environment' | 'group-buff';

/**
 * Construit les groupes affichés. Les états préjudiciables du glossaire et les états d'environnement
 * sont TOUJOURS proposés (listes fermées universelles, aucun déblocage) ; les effets situationnels et
 * les buffs de groupe ne sont proposés que si au moins une capacité débloquée de la table les confère
 * — `situationalIds` et `groupBuffIds` en sont les sous-ensembles filtrés par l'appelant (via
 * `character.featureIds` → `situationalEffectIds` / `groupBuffIds`). Groupe omis quand rien n'est
 * débloqué (rien à poser). Les buffs de groupe ferment la palette : c'est la seule famille bénéfique,
 * et la seule dont la pose s'adresse à plusieurs combattants (PER-104).
 */
export function buildStatusGroups(
  situationalIds: readonly SituationalEffectId[],
  groupBuffIds: readonly BeneficialEffectId[] = [],
): StatusGroup[] {
  const groups: StatusGroup[] = [
    { title: 'États préjudiciables', ids: STATUS_EFFECT_IDS, family: 'harmful' },
  ];
  if (situationalIds.length > 0)
    groups.push({ title: 'Effets situationnels', ids: situationalIds, family: 'situational' });
  groups.push({ title: 'Environnement', ids: ENVIRONMENTAL_EFFECT_IDS, family: 'environment' });
  if (groupBuffIds.length > 0)
    groups.push({ title: 'Buffs de groupe', ids: groupBuffIds, family: 'group-buff' });
  return groups;
}

/** Ensemble des ids d'états d'environnement (teinte bleue + narrowing d'icône). */
const ENVIRONMENTAL_EFFECT_ID_SET: ReadonlySet<string> = new Set(ENVIRONMENTAL_EFFECT_IDS);

/**
 * Ensemble des ids BÉNÉFIQUES (teinte verte) : buffs de groupe posés par le MJ (PER-104) et cristaux
 * confiés par un joueur (PER-360). Les cristaux ne figurent dans AUCUN groupe de la palette — ils ne
 * se posent pas depuis l'écran de MJ, ils arrivent de la fiche de leur propriétaire — mais une fois
 * posés, ils s'affichent partout comme les autres bienfaits.
 */
const BENEFICIAL_EFFECT_ID_SET: ReadonlySet<string> = new Set<string>([
  ...BENEFICIAL_EFFECT_IDS,
  ...CRYSTAL_STATUS_IDS,
]);

/** Ensemble des ids d'états du glossaire (pour narrower l'id vers une icône). */
const STATUS_EFFECT_ID_SET: ReadonlySet<string> = new Set(STATUS_EFFECT_IDS);

/**
 * Libellé français d'un état, qu'il soit du glossaire, situationnel, d'environnement, bénéfique ou
 * cristal confié (les cinq espaces d'ids sont disjoints). Un cristal garde sa couleur ET sa forme
 * (« Cristal Bleu nuit (Rhombe) ») : c'est ce qui le désigne à la table, où deux cristaux peuvent
 * partager une couleur proche.
 */
export function statusLabel(id: AnyStatusEffectId): string {
  return (
    (STATUS_EFFECT_LABELS as Record<string, string>)[id] ??
    (SITUATIONAL_EFFECT_LABELS as Record<string, string>)[id] ??
    (ENVIRONMENTAL_EFFECT_LABELS as Record<string, string>)[id] ??
    (BENEFICIAL_EFFECT_LABELS as Record<string, string>)[id] ??
    (CRYSTAL_STATUSES as Record<string, { label: string }>)[id]?.label ??
    id
  );
}

/**
 * TEINTE d'un état : la clé de palette MUI qui porte son rendu partout (puce de palette, carré-icône
 * du tracker et de la projection, rappel sur la fiche). `'error'` (rouge) par défaut — un état SUBI ;
 * `'info'` (bleu) pour un état d'ENVIRONNEMENT, qui n'est pas infligé mais imposé par la scène et se
 * pose indistinctement sur les alliés comme sur les adversaires ; `'success'` (vert) pour un BUFF DE
 * GROUPE (PER-104), seule famille bénéfique — le bleu étant déjà pris par l'environnement ;
 * `'warning'` (jaune) pour un état DÉDUIT automatiquement de l'état du combattant (cf.
 * `originStatusTone`).
 */
export type StatusTone = 'error' | 'info' | 'success' | 'warning';

export function statusTone(id: AnyStatusEffectId): StatusTone {
  if (BENEFICIAL_EFFECT_ID_SET.has(id)) return 'success';
  return ENVIRONMENTAL_EFFECT_ID_SET.has(id) ? 'info' : 'error';
}

/**
 * Teinte d'un état EFFECTIF, provenance comprise : un état DÉDUIT (des PV, p. 220) passe en JAUNE,
 * pour se distinguer d'un coup d'œil des états posés à la main par le MJ (rouges) — il n'est ni
 * posé ni retirable, il suit la situation. Un état posé garde la teinte de son id.
 */
export function originStatusTone(id: AnyStatusEffectId, origin: StatusOrigin): StatusTone {
  return origin === 'auto' ? 'warning' : statusTone(id);
}

/**
 * Id d'icône (game-icons) d'un état, ou `null` si aucune icône ne lui correspond. Les états du
 * glossaire (`StatusEffectId`) et d'environnement (`EnvironmentalEffectId`) en ont une ; les effets
 * situationnels n'en ont pas (le libellé porte alors seul l'identification).
 */
export function statusIconId(id: AnyStatusEffectId): StatusEffectId | EnvironmentalEffectId | null {
  if (STATUS_EFFECT_ID_SET.has(id)) return id as StatusEffectId;
  if (ENVIRONMENTAL_EFFECT_ID_SET.has(id)) return id as EnvironmentalEffectId;
  return null;
}
