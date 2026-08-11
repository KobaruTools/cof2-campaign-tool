/**
 * Accès aux références croisées (`CapabilityChip`, `CreatureLink`, PER-396) : décide si
 * la cible d'une référence est ACCESSIBLE au rôle courant (contenu de base, ou contenu
 * payant débloqué déjà fusionné/chargé) avant de laisser un renderer afficher son nom.
 * Extrait de la logique « source accessible » de `BestiaryBrowser.tsx` (créature absente
 * de la liste RLS-filtrée → non accessible) et généralisé aux capacités (absentes du
 * catalogue tant que le contenu payant qui les porte n'est pas fusionné). Dans les deux
 * cas, le principe est le même : ne JAMAIS faire confiance au libellé fourni par l'auteur
 * de la référence quand la cible n'est pas résolue — il pourrait divulguer le nom d'une
 * capacité/créature verrouillée.
 */
import { featureById } from '@/data';
import type { CreatureListItem } from '@/lib/bestiary';

/** Une capacité référencée par id est accessible si elle est dans le catalogue courant
 * (contenu de base toujours présent ; contenu payant seulement une fois fusionné,
 * cf. `loadPaidContent` — absent tant que le compte courant n'y est pas entitlé). */
export function isCapabilityAccessible(featureId: string): boolean {
  return featureById.get(featureId) !== undefined;
}

/**
 * Accessibilité d'une créature référencée par slug, à partir de la liste légère du store
 * bestiaire (`useBestiaryStore`, RLS-filtrée — une source payante non débloquée n'y
 * apparaît jamais). `list` vaut `null` avant le premier chargement : état `'loading'`
 * distinct de `'locked'`, pour ne jamais afficher à tort « verrouillé » sur une créature
 * accessible pendant le court instant où la liste n'est pas encore arrivée.
 */
export function creatureLinkAccess(
  list: CreatureListItem[] | null,
  slug: string,
): 'loading' | 'locked' | 'accessible' {
  if (list === null) return 'loading';
  return list.some((c) => c.id === slug) ? 'accessible' : 'locked';
}
