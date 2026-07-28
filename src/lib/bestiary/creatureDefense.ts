/**
 * HÉRITAGE des traits défensifs d'une VARIANTE de créature (PER-260).
 *
 * Le livre écrit « possède toutes les capacités de X plus les suivantes » : une variante
 * (`baseCreatureId`) hérite donc des protections de sa base — le vampire ancien garde la
 * « Résistance impie » (RD 10) du vampire, le zombie humain la ÷2 du gabarit zombie. Les
 * capacités héritées sont déjà RÉAFFICHÉES côté rendu ; ce transformateur fait la même chose
 * pour les champs STRUCTURÉS qui alimentent les badges du cadre Défense.
 *
 * Même patron que `withIllustrations` (repli sur la base) : la variante qui définit SES PROPRES
 * traits garde les siens (le vampirien a sa « Résistances » RD 5, il n'hérite pas du RD 10).
 */
import type { Creature } from '@/data/schema';

/**
 * Complète chaque variante sans traits défensifs propres par ceux de sa créature de base.
 * Fonction pure : renvoie une nouvelle liste (les entrées inchangées sont réutilisées telles quelles).
 */
export function withInheritedDefense(list: Creature[]): Creature[] {
  const byId = new Map(list.map((c) => [c.id, c]));
  return list.map((c) => {
    if (!c.baseCreatureId) return c;
    if (c.damageReduction || c.statusImmunities) return c;
    const base = byId.get(c.baseCreatureId);
    if (!base?.damageReduction && !base?.statusImmunities) return c;
    return {
      ...c,
      ...(base.damageReduction ? { damageReduction: base.damageReduction } : {}),
      ...(base.statusImmunities ? { statusImmunities: base.statusImmunities } : {}),
    };
  });
}
