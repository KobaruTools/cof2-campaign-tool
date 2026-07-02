import Box from '@mui/material/Box';
import Tooltip from '@mui/material/Tooltip';
import { darken, type SxProps, type Theme } from '@mui/material/styles';
import type { Feature } from '@/data/schema';
import { canConcentrate, concentratedSpellManaCost, spellManaCost } from '@/lib/engine';
import { DERIVED_STAT_ICON_PATHS } from '@/lib/ui/derivedStatIcons';

/** Tracé SVG de la goutte des points de mana (réutilisé de la grille de stats). */
const MANA_DROP_PATH = DERIVED_STAT_ICON_PATHS.manaPoints;

/**
 * Texte d'infobulle du coût en mana : précise s'il suit la règle du rang
 * (p. 228) ou s'il s'agit d'une dérogation verbatim du sort (champ `manaCost`),
 * puis rappelle, AVEC LEURS PAGES, les deux règles qui modifient ce coût à
 * l'usage et ne sont pas comptées ici : la Concentration et le surcoût d'armure.
 */
function manaCostExplanation(feature: Feature, cost: number): string {
  const base =
    feature.manaCost === undefined
      ? `Coût de base : ${cost} PM (= rang ${feature.rank} du sort, p. 228).`
      : `Coût de base : ${cost} PM — dérogation au coût standard (rang ${feature.rank}).`;
  return (
    `${base}\n\nNon compté ici (modifie le coût à l'usage) :\n` +
    `• Concentration : sort en (A) → −2 PM, devient (L) (p. 228).\n` +
    `• Armure : un mage en armure paie +PM = bonus de DEF de l'armure (p. 178).`
  );
}

/**
 * Infobulle du coût quand la Concentration accrue est active (p. 228) : rappelle
 * le coût de base, la réduction de 2 PM (plancher 0) et le passage en (L).
 */
function concentrationCostExplanation(baseCost: number, reducedCost: number): string {
  return (
    `Coût en concentration : ${reducedCost} PM (= ${baseCost} − 2, plancher 0, p. 228).\n\n` +
    `Le sort est lancé en se concentrant plus longtemps : il devient une action limitée (L).`
  );
}

export interface SpellManaBadgeProps {
  feature: Feature;
  /**
   * Concentration accrue active (état de jeu, p. 228) : pour un sort éligible
   * (lancé en (A)), affiche le coût réduit de 2 PM (plancher 0) au lieu du coût
   * de base, avec un repère visuel et une infobulle dédiée. Sans effet sur les
   * sorts non éligibles (cf. `canConcentrate`).
   */
  concentration?: boolean;
  /** Diamètre de la goutte en pixels. Défaut 30. */
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
export function SpellManaBadge({ feature, concentration = false, size = 30, color, sx }: SpellManaBadgeProps) {
  const baseCost = spellManaCost(feature);
  if (baseCost === null) return null;
  // Concentration active ET sort éligible (lancé en (A)) : on affiche le coût
  // réduit. Sinon la pastille montre le coût de base inchangé.
  const concentrated = concentration && canConcentrate(feature);
  const cost = concentrated ? (concentratedSpellManaCost(feature) ?? baseCost) : baseCost;
  return (
    <Tooltip
      title={concentrated ? concentrationCostExplanation(baseCost, cost) : manaCostExplanation(feature, cost)}
      arrow
      slotProps={{ tooltip: { sx: { whiteSpace: 'pre-line', maxWidth: 300 } } }}
    >
      <Box
        role="img"
        aria-label={
          concentrated
            ? `Coût en concentration : ${cost} points de mana`
            : `Coût : ${cost} points de mana`
        }
        sx={{ position: 'relative', width: size, height: size, flexShrink: 0, lineHeight: 0, ...sx }}
      >
        <Box
          component="svg"
          viewBox="0 0 512 512"
          aria-hidden
          sx={{
            width: '100%',
            height: '100%',
            // Teinte du profil assombrie (utilitaire MUI `darken`) pour contraster
            // avec le chiffre blanc ; repli sur le bleu mana du thème sinon. Le repli
            // passe par un callback thème (couleur CONCRÈTE) et non par la chaîne
            // 'info.main' : sur un SVG, `fill` ne résout pas la clé de palette MUI et
            // la goutte retombait au noir (voie du mage / prestige, sans couleur de profil).
            fill: color ? darken(color, 0.25) : (theme) => theme.palette.info.main,
            // Concentration : halo bleu mana épousant la goutte pour signaler le
            // coût réduit ; ombre portée simple sinon.
            filter: concentrated
              ? (theme) =>
                  `drop-shadow(0 1px 1px rgba(0,0,0,0.35)) drop-shadow(0 0 4px ${theme.palette.info.main})`
              : 'drop-shadow(0 1px 1px rgba(0,0,0,0.35))',
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
            fontWeight: 800,
            fontSize: size * 0.55,
            lineHeight: 1,
            // Ombre portée du chiffre : détache le blanc de la goutte teintée.
            textShadow: '0 1px 2px rgba(0,0,0,0.7)',
            pointerEvents: 'none',
          }}
        >
          {cost}
        </Box>
      </Box>
    </Tooltip>
  );
}
