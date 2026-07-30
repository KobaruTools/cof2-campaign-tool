/**
 * Formatage des dégâts d'arme structurés (PER-217) — module pur.
 *
 * `WeaponDamage` (modèle structuré, cf. `src/data/schema.ts`) est la donnée de
 * saisie/raisonnement ; l'AFFICHAGE reste une chaîne, produite ici puis rendue par
 * `<DamageValue>` (composant commun aux armes, créatures et sorts). On garde donc la
 * couture à l'affichage : les armes formatent leur `WeaponDamage → string` au point
 * d'appel, sans toucher au composant partagé (cf. ADR 0002).
 */
import { progression } from '@/data/progression';
import { scalingDie } from '@/lib/engine/derived';
import type { WeaponDamage } from '@/data/schema';

/**
 * Rend un `WeaponDamage` dans la notation du livre (« 1d6 », « 2d6 », « 1d8+2 »,
 * « (1d4) »). Le nombre de dés est toujours écrit (même 1) — `<DamageValue>` décide
 * ensuite de masquer le « 1 » devant une icône. Le modificateur nul est omis ; un
 * DM non létal est entouré de parenthèses, modificateur compris.
 *
 * `level` RÉSOUT les dés ÉVOLUTIFS (« ° », table p. 43) : un « 5d4° » s'affiche « 5d8° » au
 * niveau 9 — c'est la convention du projet (cf. `scalingDie` : « le dé affiché n'est jamais d4°
 * mais le dé concret atteint au niveau ; le marqueur ° signale seulement qu'il évoluera »), déjà
 * appliquée aux dés bonus des capacités (`resolveSimpleBonusDie`). Sans `level` — catalogue
 * consulté hors personnage —, le dé de base est rendu tel quel, marqueur compris.
 */
export function formatWeaponDamage(damage: WeaponDamage, level?: number): string {
  const die = damage.evolving && level != null ? scalingDie(level, progression) : damage.die;
  let text = `${damage.count}${die}${damage.evolving ? '°' : ''}`;
  if (damage.modifier) text += damage.modifier > 0 ? `+${damage.modifier}` : `${damage.modifier}`;
  return damage.nonLethal ? `(${text})` : text;
}
