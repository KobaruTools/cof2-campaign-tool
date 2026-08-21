import { DOMAIN_ICON_BY_GOD_ID, godOrigin } from '@/lib/ui/godTheme';
import { GOD_DOMAIN_ICON_PATHS } from '@/lib/ui/godDomainIcons';
import { AncestryIcon } from '@/components/AncestryIcon';
import { ClassIcon } from '@/components/ClassIcon';
import { DieIcon } from '@/components/DieIcon';
import { GodDomainIcon } from '@/components/GodDomainIcon';
import { ItemIcon } from '@/components/ItemIcon';

/**
 * Icône d'identité d'un dieu (`PriestGod.id`) — priorité au thème du DOMAINE plutôt qu'à sa
 * voie, pour casser la répétition (3 sources dans l'ordre : `item-icons.ts` local, puis
 * `godDomainIcons.ts` game-icons.net, puis le cas spécial Aurilla/dé), repli final sur l'icône
 * du profil/de la voie du mage d'origine de sa capacité divine (`godOrigin`). Extrait de
 * `CodexGodsBrowser` (PER-420) pour être réutilisé par `PriestVocationBadge`.
 */
export function GodIcon({ godId, color, size = 26 }: { godId: string; color: string; size?: number }) {
  const localIconId = DOMAIN_ICON_BY_GOD_ID[godId];
  if (localIconId)
    return (
      <span data-glossary-shot="GodIcon">
        <ItemIcon id={localIconId} size={size} color={color} />
      </span>
    );
  if (GOD_DOMAIN_ICON_PATHS[godId])
    return (
      <span data-glossary-shot="GodIcon">
        <GodDomainIcon godId={godId} size={size} color={color} />
      </span>
    );
  // Aurilla, déesse de la chance et des aventuriers : aucun thème « dé » assez littéral dans
  // item-icons.ts/game-icons.net à ce jour — on réutilise directement notre propre jeu d'icônes
  // de dés (`DieIcon`, déjà vendored) plutôt que d'en aller chercher un nouveau pour un seul cas.
  if (godId === 'aurilla')
    return (
      <span data-glossary-shot="GodIcon">
        <DieIcon die="d20" size={size} color={color} noTooltip />
      </span>
    );
  const origin = godOrigin(godId);
  if (origin?.kind === 'class' && origin.classId)
    return (
      <span data-glossary-shot="GodIcon">
        <ClassIcon classId={origin.classId} size={size} color={color} />
      </span>
    );
  if (origin?.kind === 'mage')
    return (
      <span data-glossary-shot="GodIcon">
        <AncestryIcon ancestryId="mage" size={size} color={color} />
      </span>
    );
  return null;
}
