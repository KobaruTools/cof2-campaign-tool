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
import Typography from '@mui/material/Typography';
import { deriveStats, type DerivedInput } from '@/lib/engine';
import type { EffectContext } from '@/lib/character/effects';
import type { DerivedStatId as OverrideKey } from '@/lib/character/types';
import type { UnarmedStrikeView } from '@/lib/character/unarmedStrike';
import { DERIVED_STAT_NAMES, type DerivedStatId } from '@/lib/ui/derivedStats';
import type { ModSources } from '@/lib/ui/derivedStatBreakdown';
import { AppTooltip } from '@/components/AppTooltip';
import { DerivedStatIcon } from '@/components/DerivedStatIcon';
import { DerivedStatHint } from '@/components/DerivedStatHint';
import { DieIcon } from '@/components/DieIcon';
import { SignedNumberField } from '@/components/SignedNumberField';
import { DefenseBadge, type DefenseBadgeData } from '@/components/sheet/DefenseBadge';
import { MeleeAttackCard } from '@/components/sheet/MeleeAttackCard';
import type { MeleeWeaponDamageView } from '@/components/sheet/characterDerivedView';

/**
 * Pont entre l'id d'affichage (UI) et la clé de surcharge du modèle (moteur).
 * Les deux espaces de noms diffèrent volontairement : `defense`/`recoveryDice`
 * côté UI, `def`/`recoveryDiceCount` côté moteur. La surcharge des dés de
 * récupération ne porte que sur le **nombre** (le type de dé reste calculé).
 */
export const OVERRIDE_KEY: Record<DerivedStatId, OverrideKey> = {
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
  /**
   * Puces de la carte Défense (PER-137) : immunités (vert, en premier) puis réductions de dégâts
   * (bleu), rendues en blocs custom (cf. `DefenseBadge`). Absent = aucune (ex. récap du wizard).
   */
  defenseBadges?: DefenseBadgeData[];
  /**
   * Badges de plage de critique ACTIVE au CONTACT, sous la carte « Attaque au contact » (PER-133).
   * Mêmes blocs custom que la Défense (cf. `DefenseBadge`). Absent = aucun (ex. récap du wizard).
   */
  meleeCriticalRanges?: DefenseBadgeData[];
  /** Badges de plage de critique ACTIVE À DISTANCE, sous la carte « Attaque à distance » (PER-133). */
  rangedCriticalRanges?: DefenseBadgeData[];
  /**
   * PER-141 — attaque à MAINS NUES. Présent → la carte « Attaque au contact » propose une bascule
   * arme ⇄ mains nues (état d'UI local non persisté). Absent (récap du wizard, écran de MJ) → aucune
   * bascule, comportement inchangé.
   */
  unarmedStrike?: UnarmedStrikeView;
  /** PER-141 — DM de l'arme de contact équipée, pour la vue « arme » de la bascule. Null = aucune arme portée. */
  meleeWeaponDamage?: MeleeWeaponDamageView | null;
  /** PER-141 — plage de critique au contact À MAINS NUES (Morsure du serpent), pour la vue mains nues. */
  unarmedCriticalRanges?: DefenseBadgeData[];
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
  defenseBadges,
  meleeCriticalRanges,
  rangedCriticalRanges,
  unarmedStrike,
  meleeWeaponDamage,
  unarmedCriticalRanges,
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
        // Badges du bas de carte selon la stat : immunités/RD pour la Défense, plage de critique
        // pour les attaques de contact / à distance (PER-133/137).
        const badges =
          id === 'defense'
            ? defenseBadges
            : id === 'meleeAttack'
              ? meleeCriticalRanges
              : id === 'rangedAttack'
                ? rangedCriticalRanges
                : undefined;

        // PER-141 — carte « Attaque au contact » avec bascule arme ⇄ mains nues : double cadre
        // superposé qui s'échangent avec animation. Réservée à la vue (pas en mode édition des
        // surcharges, où l'on garde la carte simple). Ailleurs → carte générique ci-dessous.
        if (id === 'meleeAttack' && unarmedStrike && !onOverride) {
          return (
            <Grid key={id} size={size}>
              <MeleeAttackCard
                touch={display}
                forced={forced}
                statHint={
                  <DerivedStatHint
                    statId={id}
                    input={input}
                    featureIds={featureIds}
                    effectContext={effectContext}
                    extraModSources={extraModSources}
                    className="derived-stat-hint"
                    enterDelay={200}
                  />
                }
                abilities={input.abilities}
                level={input.level}
                unarmed={unarmedStrike}
                meleeWeaponDamage={meleeWeaponDamage ?? null}
                weaponCriticalRanges={meleeCriticalRanges ?? []}
                unarmedCriticalRanges={unarmedCriticalRanges ?? []}
              />
            </Grid>
          );
        }

        return (
          <Grid key={id} size={size}>
            <Card
              variant="outlined"
              sx={{
                height: '100%',
                transition: 'border-color 120ms ease',
                // L'icône « i » du détail reste masquée et n'apparaît qu'au survol
                // (ou focus clavier) de la carte. Bordure très légèrement éclaircie au survol.
                '& .derived-stat-hint': { opacity: 0, transition: 'opacity 120ms ease' },
                '&:hover, &:focus-within': {
                  borderColor: 'rgba(255, 255, 255, 0.2)',
                  '& .derived-stat-hint': { opacity: 1 },
                },
              }}
            >
              <CardContent
                sx={{
                  py: 1,
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  '&:last-child': { pb: 1 },
                }}
              >
                {/* Ligne du haut : icône + libellé + valeur + bouton info, alignée EN HAUT du bloc. */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, width: '100%' }}>
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
                        <SignedNumberField
                          size="small"
                          value={display ?? 0}
                          disabled={!forced}
                          onChange={(v) => onOverride(key, v)}
                          slotProps={{
                            htmlInput: {
                              style: { textAlign: 'center', fontWeight: 700, padding: '4px 6px' },
                            },
                          }}
                          sx={{ width: 56, flexGrow: 0 }}
                        />
                        {suffix}
                        <AppTooltip
                          title={forced ? 'Revenir au calcul automatique' : 'Forcer cette valeur'}
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
                        </AppTooltip>
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
                          <AppTooltip title="Valeur forcée (calcul automatique remplacé)">
                            <PushPinOutlinedIcon sx={{ fontSize: 16 }} color="warning" />
                          </AppTooltip>
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
                    className="derived-stat-hint"
                    enterDelay={200}
                    sx={{ alignSelf: 'flex-start' }}
                  />
                </Box>

                {/* Badges alignés EN BAS du bloc (mt: auto). Les IMMUNITÉS ont leur PROPRE grille,
                    placée AVANT celle des réductions / plages de critique. Grilles à 3 colonnes
                    ÉGALES pour une empreinte uniforme. */}
                {badges && badges.length > 0 && (
                  <Box sx={{ mt: 'auto', pt: 0.75, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    {(['immunity', 'other'] as const).map((group) => {
                      const items = badges.filter((b) =>
                        group === 'immunity' ? b.variant === 'immunity' : b.variant !== 'immunity',
                      );
                      if (items.length === 0) return null;
                      return (
                        <Box
                          key={group}
                          sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 0.5 }}
                        >
                          {items.map(({ key, ...rest }) => (
                            <DefenseBadge key={key} {...rest} />
                          ))}
                        </Box>
                      );
                    })}
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        );
      })}
    </Grid>
  );
}
