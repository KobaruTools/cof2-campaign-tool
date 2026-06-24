'use client';

import type { ReactNode } from 'react';
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { deriveStats, type DerivedInput } from '@/lib/engine';
import type { EffectContext } from '@/lib/character/effects';
import type { DerivedStatId as OverrideKey } from '@/lib/character/types';
import { DERIVED_STAT_NAMES, type DerivedStatId } from '@/lib/ui/derivedStats';
import type { ModSources } from '@/lib/ui/derivedStatBreakdown';
import { DerivedStatIcon } from '@/components/DerivedStatIcon';
import { DerivedStatHint } from '@/components/DerivedStatHint';
import { DieIcon } from '@/components/DieIcon';

/**
 * Pont entre l'id d'affichage (UI) et la clé de surcharge du modèle (moteur).
 * Les deux espaces de noms diffèrent volontairement : `defense`/`recoveryDice`
 * côté UI, `def`/`recoveryDiceCount` côté moteur. La surcharge des dés de
 * récupération ne porte que sur le **nombre** (le type de dé reste calculé).
 */
const OVERRIDE_KEY: Record<DerivedStatId, OverrideKey> = {
  maxHp: 'maxHp',
  defense: 'def',
  initiative: 'initiative',
  luckPoints: 'luckPoints',
  recoveryDice: 'recoveryDiceCount',
  manaPoints: 'manaPoints',
  meleeAttack: 'meleeAttack',
  rangedAttack: 'rangedAttack',
  magicAttack: 'magicAttack',
};

export interface DerivedStatsGridProps {
  /** Entrées du moteur — sert au calcul des stats et au détail des infobulles. */
  input: DerivedInput;
  /**
   * Capacités acquises : transmis aux infobulles pour détailler quelle capacité
   * apporte quel bonus sous « Capacités / divers ». Absent → pas de sous-liste.
   */
  featureIds?: string[];
  /**
   * Contexte d'effets (PER-67) : transmis aux infobulles pour résoudre les
   * valeurs scalantes et n'inclure que les effets conditionnels actifs dans le
   * détail « Capacités / divers ». Absent → seuls les bonus plats constants.
   */
  effectContext?: EffectContext;
  /**
   * Sources additionnelles (hors capacités) à détailler sous « Capacités / divers »
   * — ex. points de capacité orphelins convertis (p. 40). Transmis aux infobulles.
   */
  extraModSources?: ModSources;
  /**
   * Tailles de colonne MUI Grid. Par défaut : une carte par ligne sur mobile
   * (les contrôles d'édition tiennent à l'aise), deux sur tablette, trois sur
   * desktop.
   */
  size?: Record<string, number>;
  /** Surcharges manuelles actives (clé présente = valeur forcée). PER-48. */
  overrides?: Partial<Record<OverrideKey, number>>;
  /**
   * Édition des surcharges : si fourni, chaque stat propose de forcer sa valeur
   * ou de revenir au calcul. `null` en valeur = retour au calcul automatique.
   */
  onOverride?: (key: OverrideKey, value: number | null) => void;
}

interface StatLine {
  id: DerivedStatId;
  /** Valeur calculée par le moteur (null = stat non applicable, ex. mana sans sort). */
  computed: number | null;
  /** Élément accolé après la valeur (ex. dé de récupération). */
  suffix?: ReactNode;
}

/**
 * Grille des statistiques dérivées d'un personnage, sous forme de cartes
 * (icône cerclée + libellé + valeur + infobulle « i » détaillant le calcul avec
 * la page source CO2). Composant d'affichage commun : le récapitulatif du
 * wizard et la fiche de personnage passent tous deux par ici pour un rendu
 * uniforme. Les valeurs viennent du moteur (`deriveStats`) à partir de `input`,
 * sauf surcharge manuelle (`overrides`), signalée « forcée » (PER-48).
 */
export function DerivedStatsGrid({
  input,
  featureIds,
  effectContext,
  extraModSources,
  size = { xs: 12, sm: 6, md: 4 },
  overrides,
  onOverride,
}: DerivedStatsGridProps) {
  const stats = deriveStats(input);

  const statLines: StatLine[] = [
    { id: 'maxHp', computed: stats.maxHp },
    { id: 'defense', computed: stats.defense },
    { id: 'initiative', computed: stats.initiative },
    { id: 'luckPoints', computed: stats.luckPoints },
    {
      id: 'recoveryDice',
      computed: stats.recoveryDiceCount,
      suffix: <DieIcon die={stats.recoveryDie} size={28} />,
    },
    { id: 'manaPoints', computed: stats.manaPoints },
    { id: 'meleeAttack', computed: stats.meleeAttack },
    { id: 'rangedAttack', computed: stats.rangedAttack },
    { id: 'magicAttack', computed: stats.magicAttack },
  ];

  return (
    <Grid container spacing={1}>
      {statLines.map(({ id, computed, suffix }) => {
        const key = OVERRIDE_KEY[id];
        const forced = overrides ? key in overrides : false;
        const overrideValue = forced ? (overrides![key] ?? 0) : null;
        const display = forced ? overrideValue : computed;

        return (
          <Grid key={id} size={size}>
            <Card variant="outlined" sx={{ height: '100%' }}>
              <CardContent
                sx={{
                  py: 1,
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  '&:last-child': { pb: 1 },
                }}
              >
                <DerivedStatIcon statId={id} title size={40} />
                <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: 'block', lineHeight: 1.2 }}
                  >
                    {DERIVED_STAT_NAMES[id]}
                  </Typography>

                  {onOverride ? (
                    <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', mt: 0.25 }}>
                      <TextField
                        type="number"
                        size="small"
                        value={display ?? 0}
                        disabled={!forced}
                        onChange={(e) => onOverride(key, Number(e.target.value) || 0)}
                        slotProps={{
                          htmlInput: {
                            style: { textAlign: 'center', fontWeight: 700, padding: '4px 6px' },
                          },
                        }}
                        sx={{ width: 68 }}
                      />
                      {suffix}
                      <Tooltip
                        title={forced ? 'Revenir au calcul automatique' : 'Forcer cette valeur'}
                        arrow
                      >
                        <IconButton
                          size="small"
                          color={forced ? 'warning' : 'default'}
                          onClick={() => onOverride(key, forced ? null : (computed ?? 0))}
                        >
                          {forced ? (
                            <RestartAltIcon fontSize="small" />
                          ) : (
                            <PushPinOutlinedIcon fontSize="small" />
                          )}
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  ) : (
                    <Typography
                      variant="h5"
                      sx={{
                        fontWeight: 600,
                        color: forced ? 'warning.main' : undefined,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 0.75,
                      }}
                    >
                      {display === null ? '—' : display}
                      {suffix}
                      {forced && (
                        <Tooltip title="Valeur forcée (calcul automatique remplacé)" arrow>
                          <PushPinOutlinedIcon sx={{ fontSize: 16 }} color="warning" />
                        </Tooltip>
                      )}
                    </Typography>
                  )}
                </Box>
                <DerivedStatHint
                  statId={id}
                  input={input}
                  featureIds={featureIds}
                  effectContext={effectContext}
                  extraModSources={extraModSources}
                  sx={{ alignSelf: 'flex-start' }}
                />
              </CardContent>
            </Card>
          </Grid>
        );
      })}
    </Grid>
  );
}
