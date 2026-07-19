/**
 * Formatage des dégâts d'arme structurés (PER-217) — module pur.
 *
 * `WeaponDamage` (modèle structuré, cf. `src/data/schema.ts`) est la donnée de
 * saisie/raisonnement ; l'AFFICHAGE reste une chaîne, produite ici puis rendue par
 * `<DamageValue>` (composant commun aux armes, créatures et sorts). On garde donc la
 * couture à l'affichage : les armes formatent leur `WeaponDamage → string` au point
 * d'appel, sans toucher au composant partagé (cf. ADR 0002).
 */
import type { WeaponDamage } from '@/data/schema';

/**
 * Rend un `WeaponDamage` dans la notation du livre (« 1d6 », « 2d6 », « 1d8+2 »,
 * « (1d4) »). Le nombre de dés est toujours écrit (même 1) — `<DamageValue>` décide
 * ensuite de masquer le « 1 » devant une icône. Le modificateur nul est omis ; un
 * DM non létal est entouré de parenthèses, modificateur compris.
 */
export function formatWeaponDamage(damage: WeaponDamage): string {
  let text = `${damage.count}${damage.die}`;
  if (damage.modifier) text += damage.modifier > 0 ? `+${damage.modifier}` : `${damage.modifier}`;
  return damage.nonLethal ? `(${text})` : text;
}
