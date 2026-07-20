'use client';

/**
 * Grille COMPACTE des statistiques dérivées (écran de MJ). Dérivée de
 * `DerivedStatsGrid`, mais réduite au strict résumé : icône + chiffre + puces
 * éventuelles (immunités, RD, plages de critique). Pas de libellé, pas de
 * breakdown (« i »), pas d'édition — le but est le coup d'œil le plus
 * représentatif, entre l'aperçu et la fiche complète.
 *
 * Les blocs sont petits et rangés à 3 par ligne (structure proche de la fiche :
 * icône à gauche, chiffre à droite). Les valeurs viennent du moteur
 * (`deriveStats`) ; une surcharge manuelle (PER-48) prime et s'affiche en teinte
 * « forcée » (comme la fiche). Une stat non applicable (ex. mana sans sort) est
 * affichée « — » comme sur la fiche, pour conserver la même grille de lecture.
 */
import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { deriveStats, type DerivedInput } from '@/lib/engine';
import type { DerivedStatId as OverrideKey } from '@/lib/character/types';
import { DERIVED_STAT_NAMES, type DerivedStatId } from '@/lib/ui/derivedStats';
import { AppTooltip } from '@/components/AppTooltip';
import { DerivedStatIcon } from '@/components/DerivedStatIcon';
import { DieIcon } from '@/components/DieIcon';
import { OVERRIDE_KEY } from '@/components/DerivedStatsGrid';
import { DefenseBadge, type DefenseBadgeData } from '@/components/sheet/DefenseBadge';

export interface CompactDerivedStatsProps {
  /** Entrées du moteur (cf. `buildCharacterDerivedView`). */
  input: DerivedInput;
  /** Surcharges manuelles actives (clé présente = valeur forcée). PER-48. */
  overrides?: Partial<Record<OverrideKey, number>>;
  /** Puces de la carte Défense (immunités puis réductions de dégâts). */
  defenseBadges?: DefenseBadgeData[];
  /** Puces de plage de critique au contact. */
  meleeCriticalRanges?: DefenseBadgeData[];
  /** Puces de plage de critique à distance. */
  rangedCriticalRanges?: DefenseBadgeData[];
}

interface StatLine {
  id: DerivedStatId;
  computed: number | null;
  suffix?: ReactNode;
}

export function CompactDerivedStats({
  input,
  overrides,
  defenseBadges,
  meleeCriticalRanges,
  rangedCriticalRanges,
}: CompactDerivedStatsProps) {
  const stats = deriveStats(input);

  const statLines: StatLine[] = [
    { id: 'maxHp', computed: stats.maxHp },
    { id: 'defense', computed: stats.defense },
    { id: 'initiative', computed: stats.initiative },
    { id: 'luckPoints', computed: stats.luckPoints },
    {
      id: 'recoveryDice',
      computed: stats.recoveryDiceCount,
      suffix: <DieIcon die={stats.recoveryDie} size={18} noTooltip />,
    },
    { id: 'manaPoints', computed: stats.manaPoints },
    { id: 'meleeAttack', computed: stats.meleeAttack },
    { id: 'rangedAttack', computed: stats.rangedAttack },
    { id: 'magicAttack', computed: stats.magicAttack },
  ];

  return (
    <Box
      sx={{
        display: 'grid',
        // 3 blocs par ligne (structure « de base » proche de la fiche) ; blocs alignés
        // en haut (une stat avec puces est plus haute, elle ne doit pas étirer les autres).
        gridTemplateColumns: 'repeat(3, 1fr)',
        alignItems: 'start',
        gap: 0.75,
      }}
    >
      {statLines.map(({ id, computed, suffix }) => {
        const key = OVERRIDE_KEY[id];
        const forced = overrides ? key in overrides : false;
        const display = forced ? (overrides![key] ?? 0) : computed;
        const badges =
          id === 'defense'
            ? defenseBadges
            : id === 'meleeAttack'
              ? meleeCriticalRanges
              : id === 'rangedAttack'
                ? rangedCriticalRanges
                : undefined;
        return (
          <Box
            key={id}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              px: 0.75,
              py: 0.75,
              borderRadius: 1,
              border: '1px solid rgba(255, 255, 255, 0.10)',
              bgcolor: 'rgba(255, 255, 255, 0.04)',
            }}
          >
            {/* Icône + chiffre ANCRÉS à gauche (le chiffre collé à l'icône, plus le dé de récup.
                éventuel) ; les puces sont poussées à DROITE (`ml: auto`) sur la place ainsi libérée.
                Infobulle du nom limitée au couple icône/chiffre : les puces portent déjà leur propre
                infobulle (breakdown), on évite ainsi deux infobulles rivales. Une stat non applicable
                (ex. mana d'un non-lanceur) s'affiche « — » comme sur la fiche. */}
            <AppTooltip title={DERIVED_STAT_NAMES[id]}>
              <Stack direction="row" spacing={0.4} sx={{ alignItems: 'center', flexShrink: 0 }}>
                <DerivedStatIcon statId={id} size={26} color="rgba(255, 255, 255, 0.75)" />
                <Typography
                  variant="subtitle1"
                  sx={{ fontWeight: 700, lineHeight: 1, color: forced ? 'warning.main' : undefined }}
                >
                  {display === null ? '—' : display}
                </Typography>
                {suffix}
              </Stack>
            </AppTooltip>
            {badges && badges.length > 0 && (
                <Box
                  sx={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    justifyContent: 'flex-end',
                    gap: 0.4,
                    ml: 'auto',
                    minWidth: 0,
                  }}
                >
                  {badges.map(({ key: badgeKey, ...rest }) => (
                    <DefenseBadge key={badgeKey} {...rest} fullWidth={false} compact />
                  ))}
                </Box>
              )}
          </Box>
        );
      })}
    </Box>
  );
}
