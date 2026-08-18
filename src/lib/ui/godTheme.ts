import { lighten } from '@mui/material/styles';
import { featureById, pathById, priestGodById, priestGods } from '@/data';
import type { ItemIconId } from '@/data/item-icons';
import { MAGE_PATH_COLOR, classColor } from './classColors';

/**
 * Teinte + icône d'identité d'un dieu (PER-420 `CodexGodsBrowser`, réutilisé par
 * `PriestVocationBadge` pour la chip « Spécialiste ») — dérivées de la VOIE d'origine de sa
 * capacité divine plutôt que d'une couleur neutre répétée pour les 32 dieux. `kind` distingue
 * un profil (`classId` renseigné) de la voie du mage (`MAGE_PATH_COLOR`) du repli défensif
 * (aucun dieu du panthéon n'emprunte cette dernière branche à ce jour).
 */
export interface GodOrigin {
  pathId: string;
  pathName: string;
  /** Regroupement pour `shadeForIndex` : le PROFIL, pas la voie (`classColor()` est identique
   * pour toutes les voies d'un même profil, ex. Orbis/Tyriolth tous deux forgesort). */
  colorKey: string;
  baseColor: string;
  kind: 'class' | 'mage' | 'other';
  classId?: string;
}

/** Icône de DOMAINE (pas de voie) pour les dieux déjà couverts par notre bibliothèque
 * d'équipement locale (`item-icons.ts`) — prioritaire sur l'icône de voie pour casser la
 * répétition. Cf. `GOD_DOMAIN_ICON_PATHS` (`godDomainIcons.ts`) pour le reste. */
export const DOMAIN_ICON_BY_GOD_ID: Partial<Record<string, ItemIconId>> = {
  arwendee: 'bow', // déesse de la chasse et des archers
  basile: 'ration', // dieu de la gourmandise et de la nourriture
  gaeln: 'instrument', // dieu des arts et des artistes
  guardal: 'shield', // dieu de la loyauté et des gardiens
  hellion: 'lockpicks', // dieu des voleurs et du pillage
  jeweln: 'pick', // dieu des souterrains et des mineurs
  linnarre: 'octopus', // déesse de la mer et des marins
  mondovael: 'backpack', // dieu des nomades et du voyage
  morn: 'scythe', // dieu de la mort et du passage dans l'au-delà
  orbis: 'coins', // dieu du commerce et des marchands
};

function resolveGodOrigin(featurePathId: string): GodOrigin {
  const path = pathById.get(featurePathId);
  if (path?.type === 'class') {
    const classId = path.classIds[0];
    return {
      pathId: featurePathId,
      pathName: path.name,
      colorKey: classId,
      baseColor: classColor(classId),
      kind: 'class',
      classId,
    };
  }
  if (path?.type === 'mage') {
    return {
      pathId: featurePathId,
      pathName: path.name,
      colorKey: 'mage',
      baseColor: MAGE_PATH_COLOR,
      kind: 'mage',
    };
  }
  return {
    pathId: featurePathId,
    pathName: path?.name ?? featurePathId,
    colorKey: featurePathId,
    baseColor: '#9e9e9e',
    kind: 'other',
  };
}

/** Teinte distincte par dieu quand plusieurs partagent le même profil d'origine — index 0 :
 * couleur de base inchangée, les suivants s'éclaircissent progressivement (UNIQUEMENT plus
 * clair, retour propriétaire : sur fond noir une variante assombrie perd trop de contraste). */
export function shadeForIndex(base: string, index: number, count: number): string {
  if (count <= 1 || index === 0) return base;
  const maxShift = 0.5;
  return lighten(base, (index / (count - 1)) * maxShift);
}

const sortedGodIds = [...priestGods].sort((a, b) => a.name.localeCompare(b.name, 'fr')).map((g) => g.id);

const originByGodId = new Map<string, GodOrigin | undefined>();
const groupByColorKey = new Map<string, string[]>();
for (const godId of sortedGodIds) {
  const god = priestGodById.get(godId);
  const feature = god ? featureById.get(god.divineFeatureId) : undefined;
  const origin = feature ? resolveGodOrigin(feature.pathId) : undefined;
  originByGodId.set(godId, origin);
  if (origin) {
    const group = groupByColorKey.get(origin.colorKey) ?? [];
    group.push(godId);
    groupByColorKey.set(origin.colorKey, group);
  }
}

const colorByGodId = new Map<string, string>();
for (const group of groupByColorKey.values()) {
  group.forEach((godId, index) => {
    const origin = originByGodId.get(godId);
    if (origin) colorByGodId.set(godId, shadeForIndex(origin.baseColor, index, group.length));
  });
}

/** Voie/profil d'origine de la capacité divine d'un dieu (`undefined` si le dieu ou sa
 * capacité divine sont introuvables). */
export function godOrigin(godId: string): GodOrigin | undefined {
  return originByGodId.get(godId);
}

/** Teinte d'identité d'un dieu (repli `undefined` si le dieu/sa capacité divine sont
 * introuvables — l'appelant retombe alors sur une couleur neutre). */
export function godColor(godId: string): string | undefined {
  return colorByGodId.get(godId);
}
