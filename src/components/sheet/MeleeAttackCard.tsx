'use client';

import { useState, type ReactNode } from 'react';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import FrontHandIcon from '@mui/icons-material/FrontHand';
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import type { Abilities } from '@/lib/engine';
import type { UnarmedStrikeView } from '@/lib/character/unarmedStrike';
import { DERIVED_STAT_ICON_PATHS } from '@/lib/ui/derivedStatIcons';
import { AppTooltip } from '@/components/AppTooltip';
import { DerivedStatIcon } from '@/components/DerivedStatIcon';
import { DefenseBadge, type DefenseBadgeData } from '@/components/sheet/DefenseBadge';
import { UnarmedStrikeBadges } from '@/components/sheet/UnarmedStrikeBadges';
import { WeaponDamageExpr, NoWeaponHint } from '@/components/sheet/WeaponDamageExpr';
import { WeaponDamageBonusBadge } from '@/components/sheet/WeaponDamageBonusBadge';
import type { MeleeWeaponDamageView } from '@/components/sheet/characterDerivedView';
import type { SituationalDamageBonus } from '@/lib/character/weaponDamageBonus';

type MeleeMode = 'weapon' | 'unarmed';

/** Contenu d'un cadre (arme ou mains nues) : titre, valeur de touche, DM, badges. */
function Face({
  mode,
  touch,
  forced,
  abilities,
  unarmed,
  meleeWeaponDamage,
  weaponCriticalRanges,
  unarmedCriticalRanges,
  situationalBonuses,
}: {
  mode: MeleeMode;
  touch: number | null;
  forced: boolean;
  abilities: Abilities;
  unarmed: UnarmedStrikeView;
  meleeWeaponDamage: MeleeWeaponDamageView | null;
  weaponCriticalRanges: DefenseBadgeData[];
  unarmedCriticalRanges: DefenseBadgeData[];
  situationalBonuses: SituationalDamageBonus[];
}) {
  const title = mode === 'weapon' ? 'Attaque au contact (arme)' : 'Attaque au contact (mains)';
  const unarmedDice = `${unarmed.damage.count}${unarmed.damage.die}${unarmed.evolving ? '°' : ''}`;
  const criticalRanges = mode === 'weapon' ? weaponCriticalRanges : unarmedCriticalRanges;
  // Chips d'indication supplémentaires (létalité, magie, 1=max, type) — mode mains nues uniquement
  // (il y a toujours au moins la létalité). Le séparateur ne s'affiche que si ces chips existent.
  const hasExtraChips = mode === 'unarmed';

  return (
    <CardContent
      sx={{ py: 1, height: '100%', display: 'flex', flexDirection: 'column', '&:last-child': { pb: 1 } }}
    >
      {/* En-tête : icône + titre + valeur de touche ET DM sur la même ligne (gagne une ligne). */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, width: '100%' }}>
        <DerivedStatIcon statId="meleeAttack" title size={40} />
        <Box sx={{ minWidth: 0, flexGrow: 1 }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.2 }}>
            {title}
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
            {/* DM accolés au chiffre d'attaque : dé + caractéristique(s) résolue(s) dynamiquement. */}
            <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
              <Typography variant="caption" color="text.secondary">
                DM
              </Typography>
              {mode === 'weapon' ? (
                meleeWeaponDamage ? (
                  <WeaponDamageExpr
                    dice={meleeWeaponDamage.dice}
                    abilities={meleeWeaponDamage.abilities}
                    flat={meleeWeaponDamage.flat}
                    charAbilities={abilities}
                  />
                ) : (
                  <NoWeaponHint />
                )
              ) : (
                <WeaponDamageExpr
                  dice={unarmedDice}
                  abilities={unarmed.damageAbilities}
                  charAbilities={abilities}
                />
              )}
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Plage de critique. */}
      {criticalRanges.length > 0 && (
        <Box sx={{ mt: 0.75, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
          {criticalRanges.map(({ key, ...rest }) => (
            <DefenseBadge key={key} {...rest} fullWidth={false} />
          ))}
        </Box>
      )}

      {/* Séparateur entre critique et chips supplémentaires — uniquement si les DEUX existent. */}
      {criticalRanges.length > 0 && hasExtraChips && <Divider sx={{ my: 0.75 }} />}

      {/* Chips d'indication mains nues (létalité, magie, 1=max, type). */}
      {hasExtraChips && (
        <Box sx={{ mt: criticalRanges.length > 0 ? 0 : 0.75 }}>
          <UnarmedStrikeBadges view={unarmed} />
        </Box>
      )}

      {/* Bonus de DM SITUATIONNELS au contact (Attaque éclair +AGI, Chasseur émérite +1d4°…) — PER-115.
          Communs aux deux modes (contact armé / mains nues) : une attaque au contact rapide, un ennemi
          désigné… s'appliquent quelle que soit l'arme. */}
      {situationalBonuses.length > 0 && (
        <Box sx={{ mt: 0.75, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
          {situationalBonuses.map((b) => (
            <WeaponDamageBonusBadge key={b.featureId} bonus={b} />
          ))}
        </Box>
      )}
    </CardContent>
  );
}

export interface MeleeAttackCardProps {
  /** Valeur de touche (base + FOR, éventuellement forcée) — identique dans les deux modes. */
  touch: number | null;
  /** La valeur de touche est-elle forcée (surcharge épinglée) ? */
  forced: boolean;
  /** Icône « i » de détail du calcul de la touche (rendue en haut à droite, au survol). */
  statHint: ReactNode;
  /** Caractéristiques effectives du personnage (résolution dynamique des DM). */
  abilities: Abilities;
  /** Vue « mains nues » (moteur `unarmedStrike`). */
  unarmed: UnarmedStrikeView;
  /** DM de l'arme de contact équipée (mode « arme »). `null` = aucune arme portée. */
  meleeWeaponDamage: MeleeWeaponDamageView | null;
  /** Badges de plage de critique de l'ARME (mode « arme »). */
  weaponCriticalRanges: DefenseBadgeData[];
  /** Badges de plage de critique À MAINS NUES (mode mains nues). */
  unarmedCriticalRanges: DefenseBadgeData[];
  /** PER-115 — bonus de DM SITUATIONNELS au contact (Attaque éclair, Chasseur émérite…), en badges. */
  situationalBonuses: SituationalDamageBonus[];
}

/**
 * Carte « Attaque au contact » avec bascule arme ⇄ mains nues (PER-141) : DEUX cadres superposés
 * (arme / mains nues) qui s'ÉCHANGENT leur place avec une animation quand on clique sur le bouton
 * rond en haut à gauche (paume au repos → flèches circulaires au survol). État d'UI LOCAL non
 * persisté (cf. autres états de jeu hors mode édition). Par défaut on montre l'arme équipée, ou
 * directement les mains nues si aucune arme de contact n'est portée.
 */
/** Icône d'épée (même dessin que la carte Attaque au contact), pour l'état « arme » du bouton. */
function SwordGlyph() {
  return (
    <Box
      component="svg"
      viewBox="0 0 512 512"
      sx={{ width: 18, height: 18, fill: 'currentColor' }}
      dangerouslySetInnerHTML={{ __html: DERIVED_STAT_ICON_PATHS.meleeAttack }}
    />
  );
}

export function MeleeAttackCard({
  touch,
  forced,
  statHint,
  abilities,
  unarmed,
  meleeWeaponDamage,
  weaponCriticalRanges,
  unarmedCriticalRanges,
  situationalBonuses,
}: MeleeAttackCardProps) {
  const [mode, setMode] = useState<MeleeMode>(meleeWeaponDamage ? 'weapon' : 'unarmed');
  const swap = () => setMode((m) => (m === 'weapon' ? 'unarmed' : 'weapon'));

  const faceProps = {
    touch,
    forced,
    abilities,
    unarmed,
    meleeWeaponDamage,
    weaponCriticalRanges,
    unarmedCriticalRanges,
    situationalBonuses,
  };

  // Chaque cadre est en position ABSOLUE : il ne contribue PAS à la hauteur de la pile. C'est un
  // « sizer » invisible (le cadre ACTIF, rendu en flux mais masqué) qui donne sa hauteur au bloc →
  // la hauteur SUIT le cadre actif (et non le plus grand des deux), et le cadre arrière décalé
  // vient « en plus » sans agrandir le cadre actif.
  const layerSx = (layer: MeleeMode) => {
    const front = layer === mode;
    return {
      position: 'absolute',
      inset: 0,
      transition: 'transform 260ms ease, opacity 260ms ease, filter 260ms ease',
      transform: front ? 'none' : 'translate(9px, 11px) scale(0.97)',
      // Le cadre arrière est nettement flouté : on ne devine plus que sa silhouette derrière
      // le cadre actif (au lieu d'éléments nets tronqués, peu lisibles).
      filter: front ? 'none' : 'blur(4px)',
      opacity: front ? 1 : 0.45,
      zIndex: front ? 2 : 1,
      pointerEvents: front ? 'auto' : 'none',
    } as const;
  };

  return (
    <Box
      sx={{
        position: 'relative',
        // Comme les cartes génériques : s'étire à la hauteur de la ligne de grille (toutes les cartes
        // de stats dérivées à la même hauteur). Le sizer donne la hauteur MINIMALE (cadre actif).
        height: '100%',
        // Le cadre arrière décalé dépasse hors du bloc (aucune marge réservée).
        overflow: 'visible',
        // L'icône « i » de détail n'apparaît qu'au survol de la carte (comme les autres cartes).
        '& .derived-stat-hint': { opacity: 0, transition: 'opacity 120ms ease' },
        '&:hover .derived-stat-hint': { opacity: 1 },
      }}
    >
      {/* Bouton d'échange, en haut à gauche : icône de l'état COURANT (épée = arme / main = mains nues),
          remplacée par des flèches circulaires qui tournent au survol. */}
      <AppTooltip title={mode === 'weapon' ? 'Voir l’attaque à mains nues' : 'Voir l’attaque avec l’arme'}>
        <IconButton
          size="small"
          onClick={swap}
          aria-label="Échanger arme / mains nues"
          sx={{
            position: 'absolute',
            top: 2,
            left: 2,
            zIndex: 3,
            bgcolor: 'background.paper',
            border: 1,
            borderColor: 'divider',
            '&:hover': { bgcolor: 'background.paper' },
            '&:hover .mn-rest': { opacity: 0 },
            '&:hover .mn-swap': { opacity: 1, transform: 'rotate(180deg)' },
          }}
        >
          <Box sx={{ position: 'relative', width: 20, height: 20, display: 'inline-flex' }}>
            <Box
              className="mn-rest"
              sx={{
                position: 'absolute',
                inset: 0,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'opacity 180ms ease',
              }}
            >
              {mode === 'weapon' ? <SwordGlyph /> : <FrontHandIcon sx={{ fontSize: 20 }} />}
            </Box>
            <AutorenewIcon
              className="mn-swap"
              sx={{
                position: 'absolute',
                inset: 0,
                fontSize: 20,
                opacity: 0,
                transition: 'opacity 180ms ease, transform 400ms ease',
              }}
            />
          </Box>
        </IconButton>
      </AppTooltip>

      {/* Détail du calcul de la touche, en haut à droite (partagé par les deux cadres). */}
      <Box sx={{ position: 'absolute', top: 6, right: 18, zIndex: 3 }}>{statHint}</Box>

      {/* Pile de cadres. Le SIZER (cadre actif, masqué) impose la hauteur MINIMALE ; les deux cadres
          réels sont superposés en absolu et s'échangent avec animation. `height: 100%` pour que les
          cadres (inset: 0) remplissent la carte quand la ligne de grille l'étire au-delà du sizer. */}
      <Box sx={{ position: 'relative', height: '100%' }}>
        <Card variant="outlined" aria-hidden sx={{ visibility: 'hidden' }}>
          <Face mode={mode} {...faceProps} />
        </Card>
        {(['weapon', 'unarmed'] as const).map((layer) => (
          <Card key={layer} variant="outlined" aria-hidden={layer !== mode} sx={layerSx(layer)}>
            <Face mode={layer} {...faceProps} />
          </Card>
        ))}
      </Box>
    </Box>
  );
}
