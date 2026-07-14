/**
 * Maîtrise des armes et armures (PER-79) — module pur (injection du contexte de
 * règles, testable sans dépendance à l'UI).
 *
 * Règles CO2 (chap. « Profils hybrides », voir `docs/extraction/hybrides.md` §6) :
 *  - le PROFIL PRINCIPAL est toujours maîtrisé (sa fiche liste ses « Armes & armures
 *    maîtrisées ») ;
 *  - un AUTRE profil devient maîtrisé dès que le personnage acquiert ≥ 2 rangs dans
 *    une de ses voies (« on dit alors qu'il les maîtrise », p. 177) ;
 *  - un profil hybride CRÉÉ AU NIVEAU 1 maîtrise d'office les armes et armures de
 *    SES DEUX profils, dès le rang 1 dans chaque voie (p. 180).
 *
 * Utiliser une arme sans la maîtriser impose un DÉ MALUS en attaque (p. 177). Le
 * moteur ne résout pas les jets (les dés sont lancés à la vraie table) : il se borne
 * à SIGNALER la non-maîtrise. L'indicateur consultatif est posé par l'UI sur l'arme
 * en main (cf. `WeaponMasteryBadge` / `WeaponMasteryAlert`).
 */
import type { CharacterClass, Weapon } from '@/data/schema';
import type { RulesContext } from '@/lib/engine';
import { ownedRanks } from '@/lib/engine';
import type { Character } from './types';
import { isFirearmItemId } from './firearms';

/** Seuil de rangs pour maîtriser un AUTRE profil (« au moins deux rangs », p. 177). */
export const MASTERY_RANK_THRESHOLD = 2;

/**
 * Familles d'armes interchangeables pour la maîtrise : maîtriser une variante les
 * maîtrise TOUTES. Le bâton ferré n'est qu'un bâton renforcé — même type d'arme,
 * seuls les DM changent (p. 184 : « tous les personnages qui savent manier le bâton
 * ferré savent aussi manier le bâton »). C'est aussi ce qui rend cohérent l'accès du
 * magicien/sorcier/forgesort, qui ne listent que « bâton » mais reçoivent un bâton
 * ferré en équipement de départ (p. 102). Le « bâton noueux » du druide est un reskin
 * du bâton ferré (même id `baton-ferre`), donc déjà couvert.
 */
const WEAPON_FAMILIES: readonly ReadonlySet<string>[] = [new Set(['baton', 'baton-ferre'])];

/** Ids de la même famille que `weaponId` (l'arme elle-même si elle n'appartient à aucune). */
function weaponFamilyIds(weaponId: string): readonly string[] {
  const family = WEAPON_FAMILIES.find((ids) => ids.has(weaponId));
  return family ? [...family] : [weaponId];
}

/**
 * Ensemble des profils (ids de `CharacterClass`) dont le personnage maîtrise armes
 * ET armures. Toujours au moins le profil principal ; plus tout profil atteint par
 * la règle des ≥ 2 rangs (p. 177) ou par la création hybride de niveau 1 (p. 180).
 */
export function masteredClassIds(character: Character, ctx: RulesContext): Set<string> {
  const ids = new Set<string>();

  // Profil principal : toujours maîtrisé.
  if (character.classId) ids.add(character.classId);

  // ≥ 2 rangs dans une voie de profil → armes ET armures de ce profil (p. 177).
  const classPathIds = new Set<string>();
  for (const featureId of character.featureIds) {
    const feature = ctx.featureById.get(featureId);
    if (!feature) continue;
    const path = ctx.pathById.get(feature.pathId);
    if (path?.type === 'class') classPathIds.add(path.id);
  }
  for (const pathId of classPathIds) {
    if (ownedRanks(character, pathId, ctx).length >= MASTERY_RANK_THRESHOLD) {
      const path = ctx.pathById.get(pathId);
      if (path?.type === 'class') path.classIds.forEach((id) => ids.add(id));
    }
  }

  // Hybride créé au niveau 1 : maîtrise d'office les DEUX profils dont sont issues
  // ses voies de départ, dès le rang 1 (p. 180). On lit les voies de profil de
  // l'entrée d'historique de niveau 1 (matérialisée par le wizard) : pour un profil
  // standard elles sont toutes du profil principal (déjà présent, no-op) ; pour un
  // hybride de niveau 1 elles couvrent le second profil, maîtrisé sans attendre le
  // second rang. Sans entrée de niveau 1 (sauvegarde ancienne / perso bricolé), on
  // s'en tient au profil principal + règle des ≥ 2 rangs.
  const level1 = character.levelUpHistory.find((entry) => entry.level === 1);
  if (level1) {
    for (const featureId of level1.chosenFeatureIds) {
      const feature = ctx.featureById.get(featureId);
      if (!feature) continue;
      const path = ctx.pathById.get(feature.pathId);
      if (path?.type === 'class') path.classIds.forEach((id) => ids.add(id));
    }
  }

  return ids;
}

/** Un profil donné maîtrise-t-il cette arme ? Interprète ses accès (`WeaponAccess`). */
function classMastersWeapon(weapon: Weapon, cls: CharacterClass, firearmsAllowed: boolean): boolean {
  // Arme explicitement listée comme maîtrisée par le profil (ex. magicien : dague, bâton),
  // ou une variante de la même famille (bâton ⇄ bâton ferré, cf. WEAPON_FAMILIES).
  if (weaponFamilyIds(weapon.id).some((id) => cls.allowedWeaponIds.includes(id))) return true;
  // Arme retirée d'un accès global (ex. barbare exclut les arbalètes de son accès « toutes »).
  if (cls.excludedWeaponIds?.includes(weapon.id)) return false;

  // Armes à poudre : seul un profil poudrier (arquebusier) les maîtrise, et
  // uniquement quand les armes à feu sont EFFECTIVEMENT autorisées. Poudre interdite →
  // l'objet dual EST l'arbalète correspondante : on retombe sur l'accès à distance
  // normal ci-dessous (p. 185, p. 62).
  if (firearmsAllowed && isFirearmItemId(weapon.id)) return cls.powderAllowed === true;

  // Accès aux armes de contact.
  if (weapon.melee) {
    if (cls.meleeAccess === 'all') return true;
    // « à une main » couvre légère / à une main / une ou deux mains, mais pas les
    // armes intrinsèquement à deux mains.
    if (cls.meleeAccess === 'oneHanded' && weapon.weaponCategory !== 'twoHands') return true;
  }

  // Accès aux armes à distance (hors poudre, traitée ci-dessus).
  if (weapon.ranged && cls.rangedAccess === 'all') return true;

  return false;
}

/**
 * L'arme est-elle maîtrisée par le personnage, c.-à-d. par AU MOINS un des profils
 * qu'il maîtrise (`masteredClassIds`) ? `firearmsAllowed` = autorisation EFFECTIVE
 * des armes à feu (règle campagne ∧ choix perso, PER-185).
 */
export function isWeaponMastered(
  weapon: Weapon,
  masteredIds: Set<string>,
  ctx: RulesContext,
  firearmsAllowed: boolean,
): boolean {
  for (const id of masteredIds) {
    const cls = ctx.classById.get(id);
    if (cls && classMastersWeapon(weapon, cls, firearmsAllowed)) return true;
  }
  return false;
}
