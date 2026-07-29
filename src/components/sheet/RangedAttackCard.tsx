'use client';

import type { ReactElement, ReactNode } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Divider from '@mui/material/Divider';
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined';
import Typography from '@mui/material/Typography';
import type { Abilities } from '@/lib/engine';
import type { SituationalDamageBonus } from '@/lib/character/weaponDamageBonus';
import { AppTooltip } from '@/components/AppTooltip';
import { BonusDieBadge } from '@/components/BonusDieBadge';
import { DerivedStatIcon } from '@/components/DerivedStatIcon';
import type { AttackBonusDie } from '@/components/sheet/MeleeAttackCard';
import { DefenseBadge, type DefenseBadgeData } from '@/components/sheet/DefenseBadge';
import { WeaponDamageExpr, NoWeaponHint } from '@/components/sheet/WeaponDamageExpr';
import { WeaponDamageBonusBadge } from '@/components/sheet/WeaponDamageBonusBadge';
import { ElementalAttackBadge, MagicalAttackBadge } from '@/components/sheet/AttackQualifierBadge';
import type { WeaponDamageView } from '@/components/sheet/characterDerivedView';
import type { RangedAttackElementView } from '@/lib/character/effects';

export interface RangedAttackCardProps {
  /** Valeur de touche à distance (base + AGI, éventuellement forcée). */
  touch: number | null;
  /** La valeur de touche est-elle forcée (surcharge épinglée) ? */
  forced: boolean;
  /** Enrobe la touche pour ouvrir le détail du calcul à son survol (curseur « ? »). */
  wrapTouch: (child: ReactElement) => ReactNode;
  /** Caractéristiques effectives (résolution dynamique des DM). */
  abilities: Abilities;
  /** DM de l'arme à distance équipée. `null` = aucune arme à distance en main. */
  rangedWeaponDamage: WeaponDamageView | null;
  /** Badges de plage de critique à distance. */
  criticalRanges: DefenseBadgeData[];
  /** Bonus de DM situationnels à distance (Chasseur émérite +1d4°…), en badges. */
  situationalBonuses: SituationalDamageBonus[];
  /**
   * Id de la capacité ACTIVE rendant l'attaque à distance MAGIQUE (Flèche magique de l'archer
   * arcanique, PER-74), ou `null`. Affiche un badge « Magique » (comme Mains d'énergie du moine).
   */
  magicalSourceId?: string | null;
  /**
   * Élément de DM ajouté aux attaques à distance (Flèche élémentaire de l'archer arcanique, PER-74),
   * choisi « à la table », ou `null`. Affiche une puce d'élément (Feu/Froid/…) avec le dé de bonus.
   */
  elemental?: RangedAttackElementView | null;
  /** PER-74 — dé bonus à toutes les attaques (flibustier r8, PV bas), en badge double-d20. */
  attackBonusDie?: AttackBonusDie[];
}

/**
 * Carte « Attaque à distance » (PER-115) : affiche la valeur de touche, le DM de l'arme à distance
 * portée (dé seul, aucune carac de base — p. 185 — plus les bonus permanents des capacités, ex.
 * Archer émérite +PER), un indicateur « Aucune arme » si rien n'est en main, les plages de critique
 * et les bonus de DM situationnels. Sans bascule (contrairement au contact : pas de « tir à mains
 * nues »). Réutilise `WeaponDamageExpr` / les badges de la carte de contact.
 */
export function RangedAttackCard({
  touch,
  forced,
  wrapTouch,
  abilities,
  rangedWeaponDamage,
  criticalRanges,
  situationalBonuses,
  magicalSourceId,
  elemental,
  attackBonusDie = [],
}: RangedAttackCardProps) {
  return (
    <Card
      variant="outlined"
      sx={{
        position: 'relative',
        height: '100%',
        transition: 'border-color 120ms ease',
        '&:hover, &:focus-within': {
          borderColor: 'rgba(255, 255, 255, 0.2)',
        },
      }}
    >
      <CardContent sx={{ py: 1, height: '100%', display: 'flex', flexDirection: 'column', '&:last-child': { pb: 1 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, width: '100%' }}>
          <DerivedStatIcon statId="rangedAttack" title size={40} />
          <Box sx={{ minWidth: 0, flexGrow: 1 }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.2 }}>
              Attaque à distance
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
              {/* La touche porte le détail du calcul au survol (curseur « ? »), via `wrapTouch`. */}
              {wrapTouch(
                <Typography
                  variant="h5"
                  sx={{
                    fontWeight: 600,
                    color: forced ? 'warning.main' : undefined,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 0.5,
                    cursor: 'help',
                  }}
                >
                  {touch === null ? '—' : touch}
                  {forced && (
                    <AppTooltip title="Valeur forcée (calcul automatique remplacé)">
                      <PushPinOutlinedIcon sx={{ fontSize: 16 }} color="warning" />
                    </AppTooltip>
                  )}
                </Typography>,
              )}
              {/* Dé bonus à toutes les attaques (flibustier r8 « Pas de quartier », PV bas). */}
              {attackBonusDie.length > 0 && (
                <BonusDieBadge
                  ability="attaque"
                  size={18}
                  tooltipTitle={`Dé bonus à cette attaque — ${attackBonusDie.map((s) => s.name).join(', ')}`}
                />
              )}
              {/* Petit séparateur : la valeur de touche et le calcul des DM sont deux choses distinctes. */}
              <Divider orientation="vertical" flexItem sx={{ my: 0.5 }} />
              {/* DM accolés au chiffre d'attaque. */}
              <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                <Typography variant="caption" color="text.secondary">
                  DM
                </Typography>
                {rangedWeaponDamage ? (
                  <WeaponDamageExpr
                    dice={rangedWeaponDamage.dice}
                    abilities={rangedWeaponDamage.abilities}
                    flatBonuses={rangedWeaponDamage.flatBonuses}
                    charAbilities={abilities}
                  />
                ) : (
                  <NoWeaponHint />
                )}
              </Box>
            </Box>
          </Box>
        </Box>

        {/* Plage de critique à distance. */}
        {criticalRanges.length > 0 && (
          <Box sx={{ mt: 0.75, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {criticalRanges.map(({ key, ...rest }) => (
              <DefenseBadge key={key} {...rest} fullWidth={false} />
            ))}
          </Box>
        )}

        {/* Bonus de DM situationnels à distance. */}
        {situationalBonuses.length > 0 && (
          <Box sx={{ mt: 0.75, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {situationalBonuses.map((b) => (
              <WeaponDamageBonusBadge key={b.featureId} bonus={b} />
            ))}
          </Box>
        )}

        {/* Qualificatifs (Magique / élément choisi, PER-74) — même gabarit que la vue mains nues. */}
        {(magicalSourceId || elemental) && (
          <Box sx={{ mt: 0.75, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {magicalSourceId && (
              <MagicalAttackBadge
                verbatim="Les DM des flèches (ou carreaux) sont considérés comme magiques (p. 137)."
                featureId={magicalSourceId}
              />
            )}
            {elemental && <ElementalAttackBadge view={elemental} />}
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
