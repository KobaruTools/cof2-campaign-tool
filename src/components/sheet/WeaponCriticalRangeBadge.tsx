/**
 * PUCE de plage de critique sur la LIGNE D'INVENTAIRE de l'arme tenue en main (PER-74). La
 * RÉSOLUTION (quelle plage, quelles sources) vit dans `weaponCriticalRange.ts` — ici, le seul rendu.
 *
 * On réutilise TEL QUEL le badge des cartes de statistiques (`DefenseBadge` variante `critical`,
 * violet, croix de visée) pour que la puce de l'inventaire et celle de la carte d'attaque parlent le
 * même langage visuel, info-bulle en « breakdown » comprise (chaque contributeur : l'arme et/ou les
 * capacités actives).
 */
import { DefenseBadge } from '@/components/sheet/DefenseBadge';
import type { WeaponLineCriticalRange } from '@/components/sheet/weaponCriticalRange';
import { formatCriticalRange } from '@/lib/ui/criticalRange';

/**
 * `fullWidth` désactivé : on est dans une ligne de texte, pas dans une cellule de grille à largeur
 * égale. La plage COMPLÈTE est conservée (contrairement à la variante compacte de l'écran de MJ, qui
 * n'en garde que la borne basse) — l'inventaire n'a pas de contrainte de largeur.
 */
export function WeaponCriticalRangeBadge({ info }: { info: WeaponLineCriticalRange }) {
  const f = formatCriticalRange(info.scope, info.total);
  return (
    <DefenseBadge
      variant="critical"
      text={f.short}
      title={`Critique ${f.short}`}
      sources={info.sources.map((s) => ({ name: s.name, value: `+${s.value}`, featureId: s.featureId }))}
      fullWidth={false}
    />
  );
}
