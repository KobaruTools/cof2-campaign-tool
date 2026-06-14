import Box from '@mui/material/Box';
import Tooltip from '@mui/material/Tooltip';
import type { SxProps, Theme } from '@mui/material/styles';
import type { Feature } from '@/data/schema';
import { spellManaCost } from '@/lib/engine';
import { DERIVED_STAT_ICON_PATHS } from '@/lib/ui/derivedStatIcons';

/** Tracé SVG de la goutte des points de mana (réutilisé de la grille de stats). */
const MANA_DROP_PATH = DERIVED_STAT_ICON_PATHS.manaPoints;

/**
 * Texte d'infobulle du coût en mana : précise s'il suit la règle du rang
 * (p. 228) ou s'il s'agit d'une dérogation verbatim du sort (champ `manaCost`).
 * Rappelle que les réductions dynamiques (Concentration, armure…) ne sont pas
 * comptées dans ce coût de base.
 */
function manaCostExplanation(feature: Feature, cost: number): string {
  const base =
    feature.manaCost === undefined
      ? `Coût de base : ${cost} PM (= rang ${feature.rank} du sort, p. 228).`
      : `Coût de base : ${cost} PM — dérogation au coût standard (rang ${feature.rank}).`;
  return `${base} Hors réductions dynamiques (Concentration, etc.) et surcoût d'armure.`;
}

export interface SpellManaBadgeProps {
  feature: Feature;
  /** Diamètre de la goutte en pixels. Défaut 28. */
  size?: number;
  /**
   * Couleur de remplissage de la goutte (chaîne CSS) — typiquement la teinte du
   * profil dont la voie du sort est issue. Défaut : `info.main` (bleu mana),
   * utilisé quand la voie n'a pas de couleur de profil (voie du mage, prestige…).
   */
  color?: string;
  sx?: SxProps<Theme>;
}

/**
 * Pastille « coût de base en mana » d'un sort : la goutte des PM (même icône que
 * la statistique dérivée `manaPoints`) avec le coût inscrit dans sa partie
 * bombée. Le coût se dérive du rang (règle p. 228) ou de la dérogation du sort
 * (cf. `spellManaCost`, PER-65). Ne rend rien pour une capacité qui n'est pas un
 * sort (pas de coût de mana).
 */
export function SpellManaBadge({ feature, size = 28, color, sx }: SpellManaBadgeProps) {
  const cost = spellManaCost(feature);
  if (cost === null) return null;
  return (
    <Tooltip title={manaCostExplanation(feature, cost)} arrow>
      <Box
        role="img"
        aria-label={`Coût : ${cost} points de mana`}
        sx={{ position: 'relative', width: size, height: size, flexShrink: 0, lineHeight: 0, ...sx }}
      >
        <Box
          component="svg"
          viewBox="0 0 512 512"
          aria-hidden
          sx={{
            width: '100%',
            height: '100%',
            fill: color ?? 'info.main',
            filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.35))',
          }}
          dangerouslySetInnerHTML={{ __html: MANA_DROP_PATH }}
        />
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            // La goutte est large vers le bas : on descend le chiffre pour le
            // centrer dans le bulbe plutôt qu'au milieu géométrique.
            transform: 'translateY(16%)',
            color: 'common.white',
            fontWeight: 700,
            fontSize: size * 0.46,
            lineHeight: 1,
            pointerEvents: 'none',
          }}
        >
          {cost}
        </Box>
      </Box>
    </Tooltip>
  );
}
