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
import { alpha } from '@mui/material/styles';
import { testDomains } from '@/data';
import type { AbilityId } from '@/data/schema';
import { ABILITY_IDS } from '@/data/schema';
import {
  COMPETENCE_CATEGORY_LABEL,
  type AbilityTestBonusSource,
  type TestDomainBonus,
  type UniversalTestBonus,
} from '@/lib/character/effects';
import { ABILITY_NAMES } from '@/lib/ui/ability';
import { AbilityIcon } from '@/components/AbilityIcon';
import { BonusDieBadge } from '@/components/BonusDieBadge';
import { DieIcon } from '@/components/DieIcon';
import { SheetSection } from '@/components/sheet/SheetSection';

export interface TestDomainsPanelProps {
  /** Bonus de compétence par domaine (cf. `testBonusSources`) — seuls les domaines avec
   *  un bonus y figurent ; les autres sont affichés à +0 depuis le catalogue. */
  bonuses: TestDomainBonus[];
  /**
   * Caractéristiques EFFECTIVES du personnage (saisie + modificateurs permanents). Servent
   * à RANGER chaque domaine sous sa carac gouvernante la plus élevée (multi-carac), à
   * l'option « inclure la carac », et à la ligne « test de [CARAC] » de chaque en-tête.
   */
  abilities: Record<AbilityId, number>;
  /**
   * Bonus ACTIFS à TOUS les tests de caractéristique (ex. Bénédiction, via son
   * interrupteur) — appliqués à la ligne « test de [CARAC] » de chaque en-tête (et,
   * quand « inclure la carac » est coché, aux tests de domaine). Vide = aucun buff actif.
   */
  abilityTestBonus?: AbilityTestBonusSource[];
  /**
   * Bonus CHIFFRÉS à UNE caractéristique précise (ex. Tatouages, PER-125), regroupés par carac.
   * Ajoutés à la ligne « test de [CARAC] » de la carac visée (et, quand « inclure la carac » est
   * coché, à ses domaines). Distinct de `abilityTestBonus` (buff uniforme à toutes les caracs).
   */
  perAbilityTestBonus?: Partial<Record<AbilityId, AbilityTestBonusSource[]>>;
  /**
   * Caractéristiques bénéficiant d'un DÉ BONUS permanent (badge double-d20), avec la/les
   * capacité(s) source(s) — affiché à droite de la ligne « test de [CARAC] ».
   */
  bonusDice?: Partial<Record<AbilityId, string[]>>;
  /**
   * Bonus de compétence UNIVERSEL en PLANCHER (ex. Éclectique, PER-102) : s'applique à
   * TOUS les tests de domaine sans autre bonus de profil/prestige. Les domaines déjà
   * bonifiés l'incluent dans leur total ; cette valeur sert la ligne récap « tous les
   * autres tests : +N ». Absent = pas de plancher universel.
   */
  universalBonus?: UniversalTestBonus | null;
  /**
   * Domaines bénéficiant d'un DÉ BONUS CONDITIONNEL actuellement actif (badge double-d20),
   * map domaine → capacité(s) source(s) — ex. Travail d'équipe (rôdeur) quand son interrupteur
   * « loup au contact » est actif (PER-108). Absent / vide = aucun.
   */
  testDice?: Map<string, string[]>;
}

/** Modificateur signé (« +3 », « +0 », « −2 »). */
const signed = (n: number): string => (n >= 0 ? `+${n}` : `−${Math.abs(n)}`);

/**
 * Encadré « Compétences & tests » : les 7 caractéristiques, chacune avec sa ligne
 * **« test de [CARAC] »** (icône d20 + modificateur de la carac, buff temporaire inclus —
 * ex. Bénédiction), et **regroupant ses domaines** avec leur **bonus de compétence plat**
 * (PER-89). Un domaine multi-carac est rangé sous sa carac la plus élevée chez le personnage
 * (égalité → première carac déclarée au catalogue, stable). Deux options de vue (en haut à
 * droite) : inclure la meilleure carac dans le chiffre des domaines, et masquer les domaines
 * à 0. Au survol : provenance (capacité par catégorie de source, p. 203) et plafond +15.
 * Lecture seule (les interrupteurs des buffs vivent sur les cartes de capacité).
 */
export function TestDomainsPanel({ bonuses, abilities, abilityTestBonus, perAbilityTestBonus, bonusDice, universalBonus, testDice }: TestDomainsPanelProps) {
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
    // Un domaine reste visible s'il porte un bonus chiffré OU un dé bonus conditionnel actif.
    .filter(({ d, bonus }) => !hideZero || (bonus?.total ?? 0) !== 0 || (testDice?.has(d.id) ?? false));

  // Buff actif uniforme sur TOUS les tests de carac (ex. Bénédiction : +1, +2 au rang 5).
  const buffSources = abilityTestBonus ?? [];
  const testBuff = buffSources.reduce((sum, s) => sum + s.value, 0);

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
        Test de carac (d20 + carac) par caractéristique, et bonus de compétence des domaines
        (cumul par domaine, plafond +15 — p. 203).
      </Typography>
      <Stack spacing={2.5}>
        {ABILITY_IDS.map((ability) => {
          const group = lines
            .filter((l) => l.best === ability)
            .sort((a, b) => a.d.label.localeCompare(b.d.label, 'fr'));

          const abilityMod = abilities[ability] ?? 0;
          // Bonus CHIFFRÉS propres à CETTE carac (ex. Tatouages, PER-125).
          const perCaracSources = perAbilityTestBonus?.[ability] ?? [];
          const perCaracBonus = perCaracSources.reduce((sum, s) => sum + s.value, 0);
          const caracTest = abilityMod + testBuff + perCaracBonus;
          const caracBuffed = testBuff !== 0 || perCaracBonus !== 0;
          const dice = bonusDice?.[ability] ?? [];

          // Détail de la ligne « test de [CARAC] » : carac de base + chaque buff actif + bonus propres.
          const testBreakdown = (
            <Box sx={{ py: 0.5 }}>
              <Typography variant="caption" sx={{ display: 'block', fontWeight: 700 }}>
                Test de {ABILITY_NAMES[ability]} : d20 {signed(caracTest)}
              </Typography>
              <Typography variant="caption" sx={{ display: 'block' }}>
                Caractéristique {ability} : {signed(abilityMod)}
              </Typography>
              {buffSources.map((s) => (
                <Typography key={s.featureId} variant="caption" sx={{ display: 'block' }}>
                  {s.name} : {signed(s.value)}
                </Typography>
              ))}
              {perCaracSources.map((s) => (
                <Typography key={s.featureId} variant="caption" sx={{ display: 'block' }}>
                  {s.name} : {signed(s.value)}
                </Typography>
              ))}
            </Box>
          );

          return (
            <Box key={ability}>
              <Stack
                direction="row"
                spacing={1}
                sx={{
                  alignItems: 'center',
                  mb: 1,
                  px: 1,
                  py: 0.5,
                  borderRadius: 1,
                  bgcolor: 'action.hover',
                }}
              >
                <AbilityIcon ability={ability} size={24} sx={{ color: 'text.secondary' }} />
                <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 700 }}>
                  {ABILITY_NAMES[ability]} ({ability})
                </Typography>
                <Tooltip title={testBreakdown} arrow>
                  <Stack
                    direction="row"
                    spacing={0.5}
                    sx={{
                      alignItems: 'center',
                      cursor: 'help',
                      color: caracBuffed ? 'secondary.main' : 'text.secondary',
                    }}
                  >
                    <DieIcon die="d20" size={18} noTooltip />
                    <Typography variant="subtitle2" color="inherit" sx={{ fontWeight: 700 }}>
                      {signed(caracTest)}
                    </Typography>
                  </Stack>
                </Tooltip>
                {dice.length > 0 && <BonusDieBadge ability={ability} sources={dice} size={16} />}
              </Stack>
              {group.length > 0 && (
                <Grid container spacing={1}>
                  {group.map(({ d, bonus, best }) => {
                    const flat = bonus?.total ?? 0;
                    const has = (bonus?.sources.length ?? 0) > 0;
                    const die = testDice?.get(d.id);
                    const abilityValue = abilities[best] ?? 0;
                    // « Inclure la carac » ajoute la meilleure carac, le buff actif uniforme ET le
                    // bonus propre à cette carac (tatouage…) — un test de domaine est aussi un test de
                    // carac. `best === ability` ici (le domaine est rangé sous sa meilleure carac).
                    const display = includeAbility ? flat + abilityValue + testBuff + perCaracBonus : flat;
                    const multiAbility = d.abilities.length > 1;

                    const breakdown =
                      has || includeAbility || d.description ? (
                        <Box sx={{ py: 0.5 }}>
                          {d.description && (
                            <Typography
                              variant="caption"
                              sx={{ display: 'block', fontStyle: 'italic', mb: has || includeAbility ? 0.5 : 0 }}
                            >
                              {d.description}
                            </Typography>
                          )}
                          {includeAbility && (
                            <Typography variant="caption" sx={{ display: 'block', fontWeight: 700 }}>
                              {best} (meilleure carac) : {signed(abilityValue)}
                            </Typography>
                          )}
                          {includeAbility &&
                            buffSources.map((s) => (
                              <Typography key={s.featureId} variant="caption" sx={{ display: 'block' }}>
                                {s.name} : {signed(s.value)}
                              </Typography>
                            ))}
                          {includeAbility &&
                            perCaracSources.map((s) => (
                              <Typography key={s.featureId} variant="caption" sx={{ display: 'block' }}>
                                {s.name} : {signed(s.value)}
                              </Typography>
                            ))}
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
                          // Fond plus discret que celui des en-têtes de carac (`action.hover`),
                          // pour mieux démarquer les blocs : moitié de l'opacité de survol.
                          bgcolor: has
                            ? (theme) =>
                                alpha(theme.palette.text.primary, theme.palette.action.hoverOpacity / 2)
                            : undefined,
                          cursor: breakdown ? 'help' : undefined,
                        }}
                      >
                        <Box sx={{ minWidth: 0 }}>
                          <Typography variant="body2" color={has || die ? undefined : 'text.disabled'} noWrap>
                            {d.label}
                          </Typography>
                          {multiAbility && (
                            <Typography variant="caption" color="text.secondary">
                              {d.abilities.map((a) => (a === best ? `[${a}]` : a)).join(' / ')}
                            </Typography>
                          )}
                        </Box>
                        <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                          {die && <BonusDieBadge ability={d.label} sources={die} size={14} />}
                          <Typography
                            variant="subtitle1"
                            sx={{ fontWeight: has ? 700 : 400 }}
                            color={has || die || (includeAbility && display !== 0) ? undefined : 'text.disabled'}
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
              )}
            </Box>
          );
        })}
      </Stack>
      {universalBonus && (
        <Tooltip
          arrow
          title={
            <Box sx={{ py: 0.5 }}>
              <Typography variant="caption" sx={{ display: 'block' }}>
                {universalBonus.name} : bonus de compétence universel appliqué à tout test
                sans bonus de voie de profil ou de prestige (se cumule avec le bonus de peuple).
              </Typography>
            </Box>
          }
        >
          <Box
            sx={{
              mt: 2,
              px: 1,
              py: 0.75,
              borderRadius: 1,
              cursor: 'help',
              borderTop: (theme) => `1px dashed ${alpha(theme.palette.text.secondary, 0.4)}`,
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              gap: 1,
            }}
          >
            <Typography variant="body2" color="text.secondary">
              Tous les autres tests <Typography component="span" variant="caption">({universalBonus.name})</Typography>
            </Typography>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              {signed(universalBonus.value)}
            </Typography>
          </Box>
        </Tooltip>
      )}
    </SheetSection>
  );
}
