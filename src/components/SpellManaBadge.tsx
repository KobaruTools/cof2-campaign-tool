import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import { darken, type SxProps, type Theme } from '@mui/material/styles';
import { AppTooltip } from '@/components/AppTooltip';
import { SourceRef } from '@/components/SourceRef';
import type { Feature } from '@/data/schema';
import type { SpellArmorSurcharge } from '@/lib/character/manaSurcharge';
import { canConcentrate, concentratedSpellManaCost, spellManaCost } from '@/lib/engine';
import { DERIVED_STAT_ICON_PATHS } from '@/lib/ui/derivedStatIcons';

/** Tracé SVG de la goutte des points de mana (réutilisé de la grille de stats). */
const MANA_DROP_PATH = DERIVED_STAT_ICON_PATHS.manaPoints;

/** Une ligne d'infobulle : texte + chip de source « livre » optionnelle en fin de ligne. */
function TooltipLine({ children, page }: { children: ReactNode; page?: number | string }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap', columnGap: 0.5 }}>
      <span>{children}</span>
      {page != null && <SourceRef page={page} />}
    </Box>
  );
}

/**
 * Infobulle du coût en mana : précise s'il suit la règle du rang (chip p. 228) ou s'il s'agit
 * d'une dérogation verbatim du sort (champ `manaCost`), puis rappelle la Concentration (p. 228),
 * seule règle qui modifie ce coût à l'usage sans être comptée ici. Le surcoût d'armure (PER-82),
 * lui, EST compté quand il s'applique : il est détaillé à part par le composant (cf. `armorSurcharge`).
 */
function manaCostExplanation(feature: Feature, cost: number): ReactNode {
  return (
    <Box>
      {feature.manaCost === undefined ? (
        <TooltipLine page={228}>Coût de base : {cost} PM (= rang {feature.rank} du sort)</TooltipLine>
      ) : (
        <TooltipLine>Coût de base : {cost} PM — dérogation au coût standard (rang {feature.rank}).</TooltipLine>
      )}
      <Box sx={{ mt: 1 }}>Non compté ici (modifie le coût à l’usage) :</Box>
      <TooltipLine page={228}>• Concentration : sort en (A) → −2 PM, devient (L)</TooltipLine>
    </Box>
  );
}

/**
 * Infobulle du coût quand la Concentration accrue est active (chip p. 228) : rappelle le coût de
 * base, la réduction de 2 PM (plancher 0) et le passage en (L).
 */
function concentrationCostExplanation(baseCost: number, reducedCost: number): ReactNode {
  return (
    <Box>
      <TooltipLine page={228}>
        Coût en concentration : {reducedCost} PM (= {baseCost} − 2, plancher 0)
      </TooltipLine>
      <Box sx={{ mt: 1 }}>
        Le sort est lancé en se concentrant plus longtemps : il devient une action limitée (L).
      </Box>
    </Box>
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
  /**
   * Surcoût en mana CROISSANT courant (PER-162), en PM, ajouté PAR-DESSUS le coût affiché (ex.
   * Foudres divines : +1 PM par lancement depuis le dernier repos court). > 0 → la goutte montre le
   * coût total et signale le surcoût (halo + infobulle). Défaut 0 (aucun surcoût). Calculé par
   * l'appelant (état de jeu, `escalatingManaSurcharge`) — le badge reste présentationnel.
   */
  surcharge?: number;
  /**
   * Surcoût de mana D'ARMURE (PER-82, p. 178), calculé par l'appelant via
   * `spellArmorManaSurcharge` pour ce sort et l'équipement porté. Distinct du
   * surcoût CROISSANT ci-dessus : il vient de l'armure portée (au-delà de l'armure
   * autorisée au profil d'origine du sort), pas de l'état de jeu. Quand son champ
   * `surcharge` est > 0, la goutte l'ajoute au coût affiché (halo d'alerte) et
   * l'infobulle le détaille (DEF portée − armure autorisée, source p. 178, plus un
   * avertissement si l'armure n'est pas maîtrisée). `null`/absent → aucun surcoût
   * d'armure (non-sort, voie de peuple/prestige, ou `character` indisponible).
   */
  armorSurcharge?: SpellArmorSurcharge | null;
  /** Diamètre de la goutte en pixels. Défaut 30. */
  size?: number;
  /**
   * Couleur de remplissage de la goutte (chaîne CSS) — typiquement la teinte du
   * profil dont la voie du sort est issue. Défaut : `info.main` (bleu mana),
   * utilisé quand la voie n'a pas de couleur de profil (voie du mage, prestige…).
   */
  color?: string;
  /**
   * Délai (ms) avant l'apparition de l'infobulle au survol de la goutte. L'info (règle du coût)
   * est toujours la même et la bulle est encombrante : on la temporise là où la goutte est dense
   * (voies & capacités). Sans valeur → apparition standard. Cf. `AppTooltip.enterDelay`.
   */
  tooltipEnterDelay?: number;
  sx?: SxProps<Theme>;
}

/**
 * Pastille « coût de base en mana » d'un sort : la goutte des PM (même icône que
 * la statistique dérivée `manaPoints`) avec le coût inscrit dans sa partie
 * bombée. Le coût se dérive du rang (règle p. 228) ou de la dérogation du sort
 * (cf. `spellManaCost`, PER-65). Ne rend rien pour une capacité qui n'est pas un
 * sort (pas de coût de mana).
 */
export function SpellManaBadge({ feature, concentration = false, surcharge = 0, armorSurcharge, size = 30, color, tooltipEnterDelay, sx }: SpellManaBadgeProps) {
  const baseCost = spellManaCost(feature);
  if (baseCost === null) return null;
  // Concentration active ET sort éligible (lancé en (A)) : on affiche le coût
  // réduit. Sinon la pastille montre le coût de base inchangé.
  const concentrated = concentration && canConcentrate(feature);
  const cost = concentrated ? (concentratedSpellManaCost(feature) ?? baseCost) : baseCost;
  // Deux surcoûts distincts s'ajoutent PAR-DESSUS le coût affiché : le surcoût CROISSANT
  // (PER-162, état de jeu) et le surcoût d'ARMURE (PER-82, équipement porté). Les deux
  // peuvent se cumuler avec la réduction de concentration.
  const escalating = Math.max(0, surcharge);
  const armorExtra = armorSurcharge && armorSurcharge.surcharge > 0 ? armorSurcharge.surcharge : 0;
  const inflated = escalating > 0 || armorExtra > 0;
  const displayCost = cost + escalating + armorExtra;
  const baseTooltip = concentrated
    ? concentrationCostExplanation(baseCost, cost)
    : manaCostExplanation(feature, cost);
  // Libellé accessible : liste les surcoûts qui gonflent le coût affiché.
  const extras: string[] = [];
  if (armorExtra > 0) extras.push(`+${armorExtra} de surcoût d’armure`);
  if (escalating > 0) extras.push(`+${escalating} de surcoût croissant`);
  const fullTooltip = inflated ? (
    <Box>
      {baseTooltip}
      {armorExtra > 0 && armorSurcharge && (
        <Box sx={{ mt: 1 }}>
          <TooltipLine page={178}>
            Surcoût d’armure : +{armorExtra} PM (DEF mondaine portée {armorSurcharge.wornArmorDef} − armure
            autorisée {armorSurcharge.allowanceDef ?? 0}, hors bonus magique)
          </TooltipLine>
          {armorSurcharge.blockedByMastery && (
            <TooltipLine page={178}>
              ⚠ Armure non maîtrisée : sans la maîtriser, ce sort ne peut normalement pas être lancé dans cette armure.
            </TooltipLine>
          )}
        </Box>
      )}
      {escalating > 0 && (
        <Box sx={{ mt: 1 }}>
          <TooltipLine page={123}>
            Surcoût actuel : +{escalating} PM (coût croissant, +1 PM par lancement, remis à 0 au repos court)
          </TooltipLine>
        </Box>
      )}
      <Box sx={{ mt: 0.5 }}>Coût total à payer maintenant : {displayCost} PM.</Box>
    </Box>
  ) : (
    baseTooltip
  );
  return (
    <AppTooltip title={fullTooltip} maxWidth={300} enterDelay={tooltipEnterDelay}>
      <Box
        role="img"
        aria-label={
          inflated
            ? `Coût actuel : ${displayCost} points de mana (dont ${extras.join(' et ')})`
            : concentrated
              ? `Coût en concentration : ${displayCost} points de mana`
              : `Coût : ${displayCost} points de mana`
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
            // Concentration : halo bleu mana ; coût GONFLÉ par un surcoût (croissant PER-162 ou
            // d'armure PER-82) : halo ambré d'alerte — prioritaire visuellement ; ombre portée
            // simple sinon.
            filter: inflated
              ? (theme) =>
                  `drop-shadow(0 1px 1px rgba(0,0,0,0.35)) drop-shadow(0 0 4px ${theme.palette.warning.main})`
              : concentrated
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
          {displayCost}
        </Box>
      </Box>
    </AppTooltip>
  );
}
