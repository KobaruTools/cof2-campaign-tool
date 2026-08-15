'use client';

import Chip from '@mui/material/Chip';
import type { Feature } from '@/data/schema';
import { AppTooltip } from '@/components/AppTooltip';
import { FeatureText, type FeatureTextProps } from '@/components/sheet/FeatureRichText';
// Import circulaire volontaire (fonction pure, appelée seulement à l'exécution du rendu — jamais à
// l'évaluation du module) : `FeatureSourcePage` reste définie dans FeaturesByPath.tsx, qui importe ce
// composant. Sûr en ESM (déclaration `function`, hoistée). Cf. `usePathFeatureState.tsx`.
import { FeatureSourcePage } from './FeaturesByPath';

/**
 * Couleur du badge « WIP » (PER-72) : jaune franc, VOLONTAIREMENT distinct de l'orange « warning »
 * du système, pour ne pas confondre les deux codes couleur.
 */
const WIP_CHIP_SX = { color: '#ffeb3b', borderColor: '#ffeb3b' } as const;

/**
 * Badge « WIP » d'une capacité (PER-72) : capacité dont une partie de l'effet dépend d'un ticket
 * extérieur non terminé. Rendu identique dans la carte compacte (vue colonne), l'accordéon (vue
 * liste) et la modale de détail — `compact` applique juste la taille réduite de la vue colonne.
 */
export function WipChip({ feature, compact = false }: { feature: Feature; compact?: boolean }) {
  if (!feature.wip) return null;
  return (
    <AppTooltip title={feature.wip}>
      <Chip
        label="WIP"
        size="small"
        variant="outlined"
        sx={
          compact
            ? {
                ...WIP_CHIP_SX,
                mt: 0.5,
                height: 18,
                cursor: 'help',
                '& .MuiChip-label': { px: 0.75, fontSize: '0.6rem', fontWeight: 700 },
              }
            : { ...WIP_CHIP_SX, fontWeight: 700, cursor: 'help' }
        }
      />
    </AppTooltip>
  );
}

export interface PathFeatureCardProps extends FeatureTextProps {
  feature: Feature;
}

/**
 * Rendu PUR du corps d'une capacité à un rang (PER-417) : le texte (`FeatureText`, enrichi si
 * `abilities`/`level` sont fournis, verbatim sinon) suivi de sa référence de page source. Ne dépend
 * PAS de `Character` — tous les props hérités de `FeatureTextProps` sont optionnels (seul `feature`
 * est requis), ce qui permet de le réutiliser hors fiche personnage (PER-418, Codex des voies).
 * `PathBlock` s'en sert en interne pour l'accordéon (vue liste) et la modale de détail, sans
 * changer leur rendu visuel.
 */
export function PathFeatureCard(props: PathFeatureCardProps) {
  return (
    <>
      <FeatureText {...props} />
      <FeatureSourcePage feature={props.feature} />
    </>
  );
}
