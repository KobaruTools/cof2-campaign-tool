import Inventory2Icon from '@mui/icons-material/Inventory2';
import { AppTooltip } from '@/components/AppTooltip';
import { TombstoneIcon } from '@/components/TombstoneIcon';
import type { CharacterStatus } from '@/lib/character/types';

/**
 * Marqueur discret du statut d'un personnage archivé (mort / retraité), accolé au
 * nom dans les listes (`CharacterList`). `active` ⇒ aucun marqueur. Partagé par la
 * vue campagne et l'accueil (PER-183) : pierre tombale pour un mort, boîte
 * d'archivage pour un retraité, chacun avec une infobulle.
 */
export function CharacterStatusMarker({ status }: { status: CharacterStatus }) {
  if (status === 'dead') {
    return (
      <AppTooltip title="Mort">
        <TombstoneIcon fontSize="small" sx={{ color: 'text.secondary', flexShrink: 0 }} />
      </AppTooltip>
    );
  }
  if (status === 'retired') {
    return (
      <AppTooltip title="Retraité">
        <Inventory2Icon fontSize="small" sx={{ color: 'text.secondary', flexShrink: 0 }} />
      </AppTooltip>
    );
  }
  return null;
}
