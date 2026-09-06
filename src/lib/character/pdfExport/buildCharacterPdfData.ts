/**
 * Couche de données RÉUTILISABLE pour l'export PDF (PER-201) : assemble, à partir d'un
 * `Character`, un snapshot PLAT et agnostique du rendu (aucune dépendance à
 * `@react-pdf/renderer`, aucun JSX) — pensé pour être consommé par PLUSIEURS formats
 * (« Campaign Editor » ici, PDF officiel BBE remplissable via `pdf-lib` pour PER-202,
 * étude PER-203), sans dupliquer le moteur de calcul.
 *
 * Ne recalcule AUCUNE règle : consomme les mêmes vues déjà partagées par la fiche et
 * l'écran de MJ (`buildCharacterDerivedView`, `deriveStats`, `groupFeaturesByPath`).
 *
 * Périmètre volontairement ALIGNÉ sur la trame papier de référence (2 pages, voir
 * PER-201) plutôt que sur l'exhaustivité des badges de la fiche app (réductions de
 * dégâts, plages de critique, immunités situationnelles…) : ces nuances n'ont de toute
 * façon pas de case sur une feuille de perso imprimée. Simplification delibérée v1,
 * documentée ticket par ticket si un besoin d'exhaustivité émerge.
 */
import { ancestryById, classById, features } from '@/data';
import type { AbilityId, Path } from '@/data/schema';
import { ABILITY_IDS } from '@/data/schema';
import { deriveStats } from '@/lib/engine';
import { ABILITY_NAMES } from '@/lib/ui/ability';
import { groupFeaturesByPath, type FeatureGroup } from '@/lib/character/pathGrouping';
import { buildCharacterDerivedView, type WeaponDamageView } from '@/components/sheet/characterDerivedView';
import { effectiveItem } from '@/lib/character/items';
import { isCustomItem, type Character } from '@/lib/character/types';
import { fileSlug } from '@/lib/character/summary';
import { richTextToPdfRuns, type PdfTextRun } from './richTextToPdfRuns';

export interface PdfAbilityLine {
  id: AbilityId;
  label: string;
  value: number;
}

export interface PdfWeaponLine {
  name: string;
  /** DM sous forme lisible (dés + caractéristique(s) + bonus plats), déjà résolus. */
  damage: string;
}

export interface PdfPathRank {
  rank: number;
  name: string;
  runs: PdfTextRun[];
}

/**
 * Emplacement de la voie sur la trame BBE (PER-202) : peuple (page 1, colonne unique),
 * profil (page 2, cases « Voie 1 » à « Voie 5 ») ou prestige (page 2, case dédiée). Dérivé
 * de `Path['type']` (`ancestry`/`mage` → `'people'`, `class` → `'class'`, `prestige` →
 * `'prestige'`) — même logique de regroupement que `PATH_TYPE_ORDER` dans `pathGrouping.ts`.
 * Champ additif, ignoré par le format Campaign Editor.
 */
export type PdfPathSlot = 'people' | 'class' | 'prestige';

export interface PdfPathGroup {
  title: string;
  slot: PdfPathSlot;
  ranks: PdfPathRank[];
  /**
   * Les 5 numéros de rang RÉELS de la voie, tels que définis au catalogue (PAS forcément
   * 1-5 : les voies de prestige numérotent leurs rangs 4 à 8 — p. 128, « accessible à
   * partir du niveau 5 » — et au moins une exception les numérote 3 à 7). Dérivé de
   * TOUTES les capacités du catalogue portant ce `pathId` (pas seulement celles acquises
   * par le personnage), pour que la grille BBE affiche les bonnes étiquettes de rang même
   * si le personnage n'a pas encore acquis les premiers rangs de la voie.
   */
  rankLabels: number[];
}

function pathSlot(type: Path['type'] | undefined): PdfPathSlot {
  if (type === 'prestige') return 'prestige';
  if (type === 'ancestry' || type === 'mage') return 'people';
  return 'class';
}

/** Les numéros de rang du catalogue pour une voie donnée, triés croissants (cf. `PdfPathGroup.rankLabels`). */
function catalogRankLabels(pathId: string): number[] {
  const ranks = new Set(features.filter((f) => f.pathId === pathId).map((f) => f.rank));
  return [...ranks].sort((a, b) => a - b);
}

export interface CampaignEditorPdfData {
  fileName: string;
  identity: {
    name: string;
    playerName: string | null;
    level: number;
    ancestryName: string;
    className: string;
    description: string | null;
  };
  abilities: PdfAbilityLine[];
  derived: {
    initiative: number;
    defense: number;
    maxHp: number;
    luckPoints: number;
    recoveryDiceCount: number;
    recoveryDie: string;
    manaPoints: number | null;
  };
  attacks: {
    melee: { attack: number; weapon: PdfWeaponLine | null };
    ranged: { attack: number; weapon: PdfWeaponLine | null };
    magic: { attack: number };
  };
  equipment: string[];
  paths: PdfPathGroup[];
}

/**
 * DM d'une arme portée, mis en forme pour l'impression : dés + code(s) de caractéristique
 * ajoutée(s) (ex. « 1d8 + FOR »). Les bonus plats permanents (`flatBonuses`) et la valeur
 * numérique de la caractéristique ne sont volontairement pas re-fondus ici (approximation
 * v1 — cf. note de tête du fichier) : le joueur reporte sa valeur de carac depuis la grille
 * juste au-dessus, comme sur la trame papier de référence.
 */
function formatWeaponLine(view: WeaponDamageView): PdfWeaponLine {
  return { name: view.name, damage: view.abilities.length ? `${view.dice} + ${view.abilities.join('/')}` : view.dice };
}

/** Une ligne d'équipement affichable (nom + quantité), toutes catégories confondues. */
function equipmentLineLabel(line: Character['equipment'][number]): string {
  if (isCustomItem(line)) return line.quantity > 1 ? `${line.name} ×${line.quantity}` : line.name;
  const item = effectiveItem(line);
  const name = item?.name ?? line.itemId;
  return line.quantity > 1 ? `${name} ×${line.quantity}` : name;
}

/** Titre affiché d'un groupe de voie (nom de la voie ; repli sur son id si catalogue introuvable). */
function pathGroupTitle(group: FeatureGroup): string {
  return group.path?.name ?? group.pathId;
}

/**
 * Assemble le snapshot d'export PDF d'un personnage. Fonction PURE, testable : aucune
 * dépendance à React ni au DOM. `playerName` est résolu par l'appelant (mêmes contraintes
 * que `resolveTransferContext`, `transferExport.ts` : store campagne/joueur, hors du pur).
 */
export function buildCharacterPdfData(character: Character, playerName: string | null = null): CampaignEditorPdfData {
  const ancestry = ancestryById.get(character.ancestryId);
  const characterClass = classById.get(character.classId);
  const derivedView = buildCharacterDerivedView(character);
  const stats = derivedView.derivedInput ? deriveStats(derivedView.derivedInput) : null;

  const groups = groupFeaturesByPath(character.featureIds);
  const paths: PdfPathGroup[] = groups.map((group) => ({
    title: pathGroupTitle(group),
    slot: pathSlot(group.path?.type),
    rankLabels: group.path ? catalogRankLabels(group.pathId) : [1, 2, 3, 4, 5],
    ranks: group.features.map((feature) => ({
      rank: feature.rank,
      name: feature.name,
      runs: richTextToPdfRuns(feature.richText ?? feature.text, {
        abilities: character.abilities,
        level: character.level,
        rank: feature.rank,
      }),
    })),
  }));

  return {
    fileName: `${fileSlug(character.name)}.pdf`,
    identity: {
      name: character.name || 'Sans nom',
      playerName,
      level: character.level,
      ancestryName: ancestry?.name ?? character.ancestryId,
      className: characterClass?.name ?? character.classId,
      description: character.identity.description?.trim() || null,
    },
    abilities: ABILITY_IDS.map((id) => ({ id, label: ABILITY_NAMES[id], value: character.abilities[id] })),
    derived: {
      initiative: stats?.initiative ?? 0,
      defense: stats?.defense ?? 0,
      maxHp: stats?.maxHp ?? 0,
      luckPoints: stats?.luckPoints ?? 0,
      recoveryDiceCount: stats?.recoveryDiceCount ?? 0,
      recoveryDie: stats?.recoveryDie ?? 'd6',
      manaPoints: stats?.manaPoints ?? null,
    },
    attacks: {
      melee: {
        attack: stats?.meleeAttack ?? 0,
        weapon: derivedView.meleeWeaponDamage ? formatWeaponLine(derivedView.meleeWeaponDamage) : null,
      },
      ranged: {
        attack: stats?.rangedAttack ?? 0,
        weapon: derivedView.rangedWeaponDamage ? formatWeaponLine(derivedView.rangedWeaponDamage) : null,
      },
      magic: { attack: stats?.magicAttack ?? 0 },
    },
    equipment: character.equipment.map(equipmentLineLabel),
    paths,
  };
}
