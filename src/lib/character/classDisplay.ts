/**
 * Nom d'affichage d'un profil selon l'autorisation des armes à feu.
 *
 * L'arquebusier privé de poudre (armes à feu interdites dans l'univers, p. 62)
 * combat à l'arbalète et prend le nom d'« Arbalétrier » (`nameWithoutFirearms`).
 * Le nom du profil doit donc suivre le réglage `Character.firearmsAllowed`
 * partout où il est présenté comme LIBELLÉ (liste, wizard, en-tête de fiche) — la
 * prose verbatim des capacités, elle, n'est pas altérée.
 */
import type { CharacterClass } from '@/data/schema';
import { classById } from '@/data';
import type { Character } from './types';

/**
 * Libellé du profil `cls` compte tenu de l'autorisation des armes à feu. On ne
 * bascule sur le nom alternatif que si les armes à feu sont EXPLICITEMENT
 * interdites (`false`) et que le profil déclare un `nameWithoutFirearms` ;
 * `true`/absence de valeur → nom standard.
 */
export function classDisplayName(cls: CharacterClass, firearmsAllowed: boolean): string {
  return firearmsAllowed === false && cls.nameWithoutFirearms ? cls.nameWithoutFirearms : cls.name;
}

/**
 * Libellé du profil d'un personnage (résout l'id + applique l'autorisation des
 * armes à feu). `firearmsAllowed` = valeur EFFECTIVE (règle campagne ∧ choix
 * perso, PER-185) ; défaut = snapshot du personnage (sans campagne).
 */
export function characterClassName(
  character: Character,
  fallback = '—',
  firearmsAllowed: boolean = character.firearmsAllowed,
): string {
  const cls = classById.get(character.classId);
  return cls ? classDisplayName(cls, firearmsAllowed) : fallback;
}

/**
 * Voies EFFECTIVES du profil `cls` compte tenu de l'autorisation des armes à feu.
 *
 * Miroir de `classDisplayName` côté voies : l'arquebusier privé de poudre
 * (« Arbalétrier », p. 62) voit la voie des explosifs remplacée par la voie du
 * maître des arbalètes (`pathIdsWithoutFirearms`). On ne bascule que si les armes
 * à feu sont EXPLICITEMENT interdites (`false`) et que le profil déclare un jeu de
 * voies alternatif ; `true`/absence → `pathIds` standard.
 *
 * À utiliser partout où compte la DISPONIBILITÉ des voies du profil principal
 * (sélection au wizard, montée de niveau, contrôle de légalité/conformité), afin
 * qu'un arbalétrier se voie proposer le maître des arbalètes et non les explosifs.
 */
export function effectiveClassPathIds(cls: CharacterClass, firearmsAllowed: boolean): string[] {
  return firearmsAllowed === false && cls.pathIdsWithoutFirearms
    ? cls.pathIdsWithoutFirearms
    : cls.pathIds;
}

/**
 * Voies du profil `cls` DÉSACTIVÉES par le réglage courant des armes à feu : celles
 * qui appartiennent au profil dans l'AUTRE mode mais pas dans le mode actif. Pour
 * l'arquebusier : `explosifs` quand les armes à feu sont interdites, et
 * `maitre-des-arbaletes` quand elles sont autorisées (les deux voies sont des
 * variantes mutuellement exclusives, encadré « Poudre ou pas poudre ? », p. 62).
 * Vide si le profil ne déclare pas de variante (`pathIdsWithoutFirearms` absent).
 *
 * Sert à INTERDIRE l'acquisition de la variante inactive : elle n'existe pas dans
 * ce cadre de jeu, donc ni voie principale ni voie hybride ne doit y donner accès.
 */
export function firearmsInactivePathIds(cls: CharacterClass, firearmsAllowed: boolean): string[] {
  if (!cls.pathIdsWithoutFirearms) return [];
  const active = new Set(effectiveClassPathIds(cls, firearmsAllowed));
  const all = new Set([...cls.pathIds, ...cls.pathIdsWithoutFirearms]);
  return [...all].filter((id) => !active.has(id));
}

/**
 * Nom d'AFFICHAGE de l'objet `itemId` compte tenu des reskins du profil `cls`
 * (PER-181). Second déclencheur de la primitive de substitution : un trait de classe
 * PERMANENT (indépendant des campagnes), en miroir de `classDisplayName` /
 * `effectiveClassPathIds` (règle « armes à feu »). Ex. druide : `baton-ferre` →
 * « Bâton noueux ». Purement cosmétique — les stats de l'objet sont inchangées.
 * `cls` absent ou aucun reskin déclaré pour `itemId` → renvoie `fallback` (le nom
 * du catalogue).
 */
export function reskinnedItemName(
  cls: CharacterClass | null | undefined,
  itemId: string,
  fallback: string,
): string {
  return cls?.equipmentReskins?.find((r) => r.itemId === itemId)?.name ?? fallback;
}
