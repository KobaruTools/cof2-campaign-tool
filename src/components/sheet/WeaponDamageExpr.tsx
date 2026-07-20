'use client';

import { Fragment } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import type { AbilityId } from '@/data/schema';
import type { Abilities } from '@/lib/engine';
import type { PermanentFlatBonus } from '@/lib/character/weaponDamageBonus';
import { DamageValue } from '@/components/DamageValue';
import { AppTooltip } from '@/components/AppTooltip';
import { AbilityValueChip, CapabilityChip } from '@/components/sheet/FeatureRichText';

/**
 * Puce d'un BONUS PLAT aux DM (PER-226), NON lié à une caractéristique. Même gabarit que la puce de
 * carac (`AbilityValueChip` : contour tireté, coins arrondis) pour la cohérence visuelle avec le
 * « + FOR », mais ACHROMATIQUE : fond gris translucide + contour tireté BLANC — signe qu'aucune carac
 * n'est en jeu. Affiche le TOTAL de tous les bonus plats ; l'info-bulle en détaille les sources
 * (chaque capacité + sa contribution), pour comprendre la somme dès que plusieurs bonus s'ajoutent.
 */
function FlatDamageBonusChip({ sources }: { sources: PermanentFlatBonus[] }) {
  const total = sources.reduce((sum, b) => sum + b.value, 0);
  const tooltip = (
    <Box sx={{ minWidth: 180 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.75 }}>
        Bonus aux DM : +{total}
      </Typography>
      {sources.map((s) => (
        <Box
          key={s.featureId}
          sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, mt: 0.25 }}
        >
          <CapabilityChip featureId={s.featureId} label={null} />
          <Typography variant="body2" sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>
            +{s.value}
          </Typography>
        </Box>
      ))}
    </Box>
  );
  return (
    <AppTooltip title={tooltip}>
      <Box
        component="span"
        sx={(theme) => ({
          display: 'inline-block',
          verticalAlign: 'baseline',
          px: 0.6,
          mx: 0.2,
          borderRadius: 0.75,
          fontWeight: 700,
          fontSize: '0.95em',
          letterSpacing: 0.3,
          lineHeight: 1.4,
          cursor: 'help',
          color: theme.palette.common.white,
          bgcolor: alpha(theme.palette.common.white, 0.1),
          border: 1,
          borderStyle: 'dashed',
          borderColor: alpha(theme.palette.common.white, 0.55),
        })}
      >
        {total}
      </Box>
    </AppTooltip>
  );
}

/**
 * Expression de DM d'arme (PER-141/PER-115), partagée par les cartes Attaque au contact et à
 * distance : le(s) dé(s) via `<DamageValue>` (qui gère `d3`, le `°` évolutif et le nombre de dés),
 * PUIS la ou les caractéristiques ajoutées, affichées par leur VALEUR courante dans une puce aux
 * couleurs de la carac + contour tireté (`AbilityValueChip`, norme PER-224) : compact là où l'espace
 * manque, plutôt qu'un « FOR (3) » verbeux. Plusieurs caracs (best-of, ex. FOR/AGI) → chips séparées
 * par « / ». Une liste VIDE (arme à distance de base, p. 185) n'affiche que le dé. Les bonus PLATS
 * permanents (Spécialisation du maître d'armes, PER-226) sont SOMMÉS dans une puce grise à contour
 * tireté blanc (`FlatDamageBonusChip`), non liée à une carac ; l'info-bulle en détaille les sources.
 */
export function WeaponDamageExpr({
  dice,
  abilities,
  flatBonuses = [],
  charAbilities,
}: {
  dice: string;
  abilities: AbilityId[];
  /** Bonus PLATS permanents (avec source) ajoutés aux DM (ex. Spécialisation, PER-226). Vide = rien. */
  flatBonuses?: PermanentFlatBonus[];
  charAbilities: Abilities;
}) {
  const flatTotal = flatBonuses.reduce((sum, b) => sum + b.value, 0);
  return (
    <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.25, flexWrap: 'wrap' }}>
      <DamageValue damage={dice} size={22} />
      {abilities.length > 0 && (
        <>
          <Typography component="span" variant="body2" sx={{ fontWeight: 600 }}>
            +
          </Typography>
          {abilities.map((ability, i) => (
            <Fragment key={ability}>
              {i > 0 && (
                <Typography component="span" variant="body2" color="text.secondary">
                  /
                </Typography>
              )}
              <AbilityValueChip ability={ability} value={charAbilities[ability]} />
            </Fragment>
          ))}
        </>
      )}
      {flatTotal > 0 && (
        <>
          <Typography component="span" variant="body2" sx={{ fontWeight: 600 }}>
            +
          </Typography>
          <FlatDamageBonusChip sources={flatBonuses} />
        </>
      )}
    </Box>
  );
}

/** Indicateur court « Aucune arme » (aucune arme du mode considéré n'est en main). */
export function NoWeaponHint() {
  return (
    <Typography variant="body2" sx={{ color: 'text.disabled' }}>
      Aucune arme
    </Typography>
  );
}
