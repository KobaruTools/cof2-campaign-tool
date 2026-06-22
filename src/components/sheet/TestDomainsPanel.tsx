'use client';

import { useState } from 'react';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import FormControlLabel from '@mui/material/FormControlLabel';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { testDomains } from '@/data';
import type { AbilityId } from '@/data/schema';
import { ABILITY_IDS } from '@/data/schema';
import { COMPETENCE_CATEGORY_LABEL, type TestDomainBonus } from '@/lib/character/effects';
import { ABILITY_NAMES } from '@/lib/ui/ability';
import { AbilityIcon } from '@/components/AbilityIcon';
import { SheetSection } from '@/components/sheet/SheetSection';

export interface TestDomainsPanelProps {
  /** Bonus de compétence par domaine (cf. `testBonusSources`) — seuls les domaines avec
   *  un bonus y figurent ; les autres sont affichés à +0 depuis le catalogue. */
  bonuses: TestDomainBonus[];
  /**
   * Caractéristiques EFFECTIVES du personnage (saisie + modificateurs permanents). Servent
   * à RANGER chaque domaine sous sa carac gouvernante la plus élevée (multi-carac), et à
   * l'option « inclure la carac » (la meilleure carac s'ajoute alors au bonus de compétence).
   */
  abilities: Record<AbilityId, number>;
}

/** Modificateur signé (« +3 », « +0 », « −2 »). */
const signed = (n: number): string => (n >= 0 ? `+${n}` : String(n));

/**
 * Encadré « Compétences & tests » : tous les domaines du catalogue, **regroupés par
 * caractéristique gouvernante** (icône + nom), chacun avec son **bonus de capacité plat**
 * (PER-89). Un domaine multi-carac est rangé sous sa carac la plus élevée chez le personnage
 * (égalité → première carac déclarée au catalogue, stable). Deux options de vue (en haut à
 * droite) : inclure la meilleure carac dans le chiffre, et masquer les domaines à 0. Au
 * survol : provenance (capacité par catégorie de source, p. 203) et plafond +15. Lecture seule.
 */
export function TestDomainsPanel({ bonuses, abilities }: TestDomainsPanelProps) {
  const [includeAbility, setIncludeAbility] = useState(false);
  // Coché par défaut : on n'affiche d'emblée que les domaines effectivement bonifiés
  // (les centaines de domaines à 0 sont masqués tant que l'utilisateur ne les demande pas).
  const [hideZero, setHideZero] = useState(true);

  const byDomain = new Map(bonuses.map((b) => [b.domain, b]));
  // Meilleure carac gouvernante du domaine pour ce personnage (max de ses valeurs ;
  // égalité → première déclarée, car `>` strict conserve le `best` antérieur).
  const bestAbility = (abs: AbilityId[]): AbilityId =>
    abs.reduce((best, a) => ((abilities[a] ?? 0) > (abilities[best] ?? 0) ? a : best));

  const lines = testDomains
    .map((d) => ({ d, bonus: byDomain.get(d.id), best: bestAbility(d.abilities) }))
    .filter(({ bonus }) => !hideZero || (bonus?.total ?? 0) !== 0);

  const hasAny = lines.length > 0;

  const toggles = (
    <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
      <FormControlLabel
        control={
          <Switch size="small" checked={includeAbility} onChange={(e) => setIncludeAbility(e.target.checked)} />
        }
        label={<Typography variant="caption">Inclure la carac</Typography>}
        sx={{ mr: 0 }}
      />
      <FormControlLabel
        control={<Switch size="small" checked={hideZero} onChange={(e) => setHideZero(e.target.checked)} />}
        label={<Typography variant="caption">Masquer les domaines sans bonus</Typography>}
        sx={{ mr: 0 }}
      />
    </Stack>
  );

  return (
    <SheetSection title="Compétences & tests" collapsible defaultCollapsed persistKey="test-domains" action={toggles}>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
        Bonus de compétence apportés par les capacités (cumul par domaine, plafond +15 — p. 203).
      </Typography>
      {!hasAny ? (
        <Typography variant="body2" color="text.secondary">
          Aucun bonus de compétence.
        </Typography>
      ) : (
        <Stack spacing={2.5}>
          {ABILITY_IDS.map((ability) => {
            const group = lines
              .filter((l) => l.best === ability)
              .sort((a, b) => a.d.label.localeCompare(b.d.label, 'fr'));
            if (group.length === 0) return null;
            return (
              <Box key={ability}>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1 }}>
                  <AbilityIcon ability={ability} size={24} sx={{ color: 'text.secondary' }} />
                  <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 700 }}>
                    {ABILITY_NAMES[ability]} ({ability})
                  </Typography>
                </Stack>
                <Grid container spacing={1}>
                  {group.map(({ d, bonus, best }) => {
                    const flat = bonus?.total ?? 0;
                    const has = (bonus?.sources.length ?? 0) > 0;
                    const abilityValue = abilities[best] ?? 0;
                    const display = includeAbility ? flat + abilityValue : flat;
                    const multiAbility = d.abilities.length > 1;

                    const breakdown =
                      has || includeAbility ? (
                        <Box sx={{ py: 0.5 }}>
                          {includeAbility && (
                            <Typography variant="caption" sx={{ display: 'block', fontWeight: 700 }}>
                              {best} (meilleure carac) : {signed(abilityValue)}
                            </Typography>
                          )}
                          {bonus?.sources.map((s) => (
                            <Typography key={s.featureId} variant="caption" sx={{ display: 'block' }}>
                              {COMPETENCE_CATEGORY_LABEL[s.category]} — {s.name} : {signed(s.value)}
                            </Typography>
                          ))}
                          {bonus?.capped && (
                            <Typography variant="caption" sx={{ display: 'block', fontStyle: 'italic' }}>
                              Bonus de compétence plafonné à +15 (p. 203).
                            </Typography>
                          )}
                        </Box>
                      ) : null;

                    const row = (
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'baseline',
                          justifyContent: 'space-between',
                          gap: 1,
                          px: 1,
                          py: 0.5,
                          borderRadius: 1,
                          bgcolor: has ? 'action.hover' : undefined,
                          cursor: breakdown ? 'help' : undefined,
                        }}
                      >
                        <Box sx={{ minWidth: 0 }}>
                          <Typography variant="body2" color={has ? undefined : 'text.disabled'} noWrap>
                            {d.label}
                          </Typography>
                          {multiAbility && (
                            <Typography variant="caption" color="text.secondary">
                              {d.abilities.map((a) => (a === best ? `[${a}]` : a)).join(' / ')}
                            </Typography>
                          )}
                        </Box>
                        <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                          <Typography
                            variant="subtitle1"
                            sx={{ fontWeight: has ? 700 : 400 }}
                            color={has || (includeAbility && display !== 0) ? undefined : 'text.disabled'}
                          >
                            {signed(display)}
                          </Typography>
                          {bonus?.capped && <Chip label="+15" size="small" color="warning" variant="outlined" />}
                        </Stack>
                      </Box>
                    );

                    return (
                      <Grid key={d.id} size={{ xs: 6, sm: 4 }}>
                        {breakdown ? (
                          <Tooltip title={breakdown} arrow>
                            {row}
                          </Tooltip>
                        ) : (
                          row
                        )}
                      </Grid>
                    );
                  })}
                </Grid>
              </Box>
            );
          })}
        </Stack>
      )}
    </SheetSection>
  );
}
