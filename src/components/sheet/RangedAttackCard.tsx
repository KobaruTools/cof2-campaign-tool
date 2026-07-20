'use client';

import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Divider from '@mui/material/Divider';
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined';
import Typography from '@mui/material/Typography';
import type { Abilities } from '@/lib/engine';
import type { SituationalDamageBonus } from '@/lib/character/weaponDamageBonus';
import { AppTooltip } from '@/components/AppTooltip';
import { DerivedStatIcon } from '@/components/DerivedStatIcon';
import { DefenseBadge, type DefenseBadgeData } from '@/components/sheet/DefenseBadge';
import { WeaponDamageExpr, NoWeaponHint } from '@/components/sheet/WeaponDamageExpr';
import { WeaponDamageBonusBadge } from '@/components/sheet/WeaponDamageBonusBadge';
import type { WeaponDamageView } from '@/components/sheet/characterDerivedView';

export interface RangedAttackCardProps {
  /** Valeur de touche à distance (base + AGI, éventuellement forcée). */
  touch: number | null;
  /** La valeur de touche est-elle forcée (surcharge épinglée) ? */
  forced: boolean;
  /** Icône « i » de détail du calcul de la touche (rendue en haut à droite, au survol). */
  statHint: ReactNode;
  /** Caractéristiques effectives (résolution dynamique des DM). */
  abilities: Abilities;
  /** DM de l'arme à distance équipée. `null` = aucune arme à distance en main. */
  rangedWeaponDamage: WeaponDamageView | null;
  /** Badges de plage de critique à distance. */
  criticalRanges: DefenseBadgeData[];
  /** Bonus de DM situationnels à distance (Chasseur émérite +1d4°…), en badges. */
  situationalBonuses: SituationalDamageBonus[];
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
  statHint,
  abilities,
  rangedWeaponDamage,
  criticalRanges,
  situationalBonuses,
}: RangedAttackCardProps) {
  return (
    <Card
      variant="outlined"
      sx={{
        position: 'relative',
        height: '100%',
        transition: 'border-color 120ms ease',
        '& .derived-stat-hint': { opacity: 0, transition: 'opacity 120ms ease' },
        '&:hover, &:focus-within': {
          borderColor: 'rgba(255, 255, 255, 0.2)',
          '& .derived-stat-hint': { opacity: 1 },
        },
      }}
    >
      {/* Détail du calcul de la touche, en haut à droite, HORS FLUX (comme la carte de contact) :
          libère toute la largeur de l'en-tête pour que le DM reste sur la même ligne que la touche. */}
      <Box sx={{ position: 'absolute', top: 6, right: 18, zIndex: 3 }}>{statHint}</Box>
      <CardContent sx={{ py: 1, height: '100%', display: 'flex', flexDirection: 'column', '&:last-child': { pb: 1 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, width: '100%' }}>
          <DerivedStatIcon statId="rangedAttack" title size={40} />
          <Box sx={{ minWidth: 0, flexGrow: 1 }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.2 }}>
              Attaque à distance
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
              <Typography
                variant="h5"
                sx={{
                  fontWeight: 600,
                  color: forced ? 'warning.main' : undefined,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 0.5,
                }}
              >
                {touch === null ? '—' : touch}
                {forced && (
                  <AppTooltip title="Valeur forcée (calcul automatique remplacé)">
                    <PushPinOutlinedIcon sx={{ fontSize: 16 }} color="warning" />
                  </AppTooltip>
                )}
              </Typography>
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
                    flat={rangedWeaponDamage.flat}
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
      </CardContent>
    </Card>
  );
}
