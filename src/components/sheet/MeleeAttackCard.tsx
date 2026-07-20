'use client';

import { useState, type ReactNode } from 'react';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import FrontHandIcon from '@mui/icons-material/FrontHand';
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import type { AbilityId } from '@/data/schema';
import type { Abilities } from '@/lib/engine';
import type { UnarmedStrikeView } from '@/lib/character/unarmedStrike';
import { AppTooltip } from '@/components/AppTooltip';
import { DamageValue } from '@/components/DamageValue';
import { DerivedStatIcon } from '@/components/DerivedStatIcon';
import { DefenseBadge, type DefenseBadgeData } from '@/components/sheet/DefenseBadge';
import { RichInline } from '@/components/sheet/FeatureRichText';
import { UnarmedStrikeBadges } from '@/components/sheet/UnarmedStrikeBadges';
import type { MeleeWeaponDamageView } from '@/components/sheet/characterDerivedView';

type MeleeMode = 'weapon' | 'unarmed';

/**
 * DM affichés en réutilisant le rendu des rangs de voies (`RichInline`) : le(s) dé(s) via
 * `<DamageValue>` (qui gère `d3`, le `°` évolutif et le nombre de dés), puis la ou les
 * caractéristiques ajoutées, RÉSOLUES dynamiquement à leur valeur — meilleure de plusieurs
 * (FOR/AGI/VOL) le cas échéant, comme dans le texte des capacités. Pas de « + FOR » figé.
 */
function DamageExpr({
  dice,
  abilities,
  charAbilities,
  level,
}: {
  dice: string;
  abilities: AbilityId[];
  charAbilities: Abilities;
  level: number;
}) {
  return (
    <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.25, flexWrap: 'wrap' }}>
      <DamageValue damage={dice} size={22} />
      {abilities.length > 0 && (
        <RichInline text={`+ [${abilities.join('/')}]`} abilities={charAbilities} level={level} rank={0} />
      )}
    </Box>
  );
}

/** Contenu d'un cadre (arme ou mains nues) : titre, valeur de touche, DM, badges. */
function Face({
  mode,
  touch,
  forced,
  abilities,
  level,
  unarmed,
  meleeWeaponDamage,
  weaponCriticalRanges,
  unarmedCriticalRanges,
}: {
  mode: MeleeMode;
  touch: number | null;
  forced: boolean;
  abilities: Abilities;
  level: number;
  unarmed: UnarmedStrikeView;
  meleeWeaponDamage: MeleeWeaponDamageView | null;
  weaponCriticalRanges: DefenseBadgeData[];
  unarmedCriticalRanges: DefenseBadgeData[];
}) {
  const title = mode === 'weapon' ? 'Attaque au contact (arme)' : 'Attaque au contact (mains)';
  const unarmedDice = `${unarmed.damage.count}${unarmed.damage.die}${unarmed.evolving ? '°' : ''}`;
  const criticalRanges = mode === 'weapon' ? weaponCriticalRanges : unarmedCriticalRanges;

  return (
    <CardContent
      sx={{ py: 1, height: '100%', display: 'flex', flexDirection: 'column', '&:last-child': { pb: 1 } }}
    >
      {/* En-tête : icône + titre + valeur de touche (identique dans les deux modes, non recalculée). */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, width: '100%' }}>
        <DerivedStatIcon statId="meleeAttack" title size={40} />
        <Box sx={{ minWidth: 0, flexGrow: 1 }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.2 }}>
            {title}
          </Typography>
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
            {touch === null ? '—' : touch}
            {forced && (
              <AppTooltip title="Valeur forcée (calcul automatique remplacé)">
                <PushPinOutlinedIcon sx={{ fontSize: 16 }} color="warning" />
              </AppTooltip>
            )}
          </Typography>
        </Box>
      </Box>

      {/* Plage de critique AU-DESSUS du calcul des DM (retour proprio). */}
      {criticalRanges.length > 0 && (
        <Box sx={{ mt: 0.5, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
          {criticalRanges.map(({ key, ...rest }) => (
            <DefenseBadge key={key} {...rest} fullWidth={false} />
          ))}
        </Box>
      )}

      {/* Ligne de DM : dé + caractéristique(s) résolue(s) dynamiquement (aucun jet). */}
      <Box sx={{ mt: 0.5, display: 'flex', alignItems: 'center', gap: 0.75, minHeight: 28 }}>
        <Typography variant="caption" color="text.secondary">
          DM
        </Typography>
        {mode === 'weapon' ? (
          meleeWeaponDamage ? (
            <DamageExpr dice={meleeWeaponDamage.dice} abilities={['FOR']} charAbilities={abilities} level={level} />
          ) : (
            <Typography variant="body2" sx={{ color: 'text.disabled' }}>
              Aucune arme de contact équipée
            </Typography>
          )
        ) : (
          <DamageExpr
            dice={unarmedDice}
            abilities={unarmed.damageAbilities}
            charAbilities={abilities}
            level={level}
          />
        )}
      </Box>

      {/* Qualificatifs mains nues (létalité, magie, 1=max, type) en bas — mode mains nues seulement. */}
      {mode === 'unarmed' && (
        <Box sx={{ mt: 'auto', pt: 0.75 }}>
          <UnarmedStrikeBadges view={unarmed} />
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
  level: number;
  /** Vue « mains nues » (moteur `unarmedStrike`). */
  unarmed: UnarmedStrikeView;
  /** DM de l'arme de contact équipée (mode « arme »). `null` = aucune arme portée. */
  meleeWeaponDamage: MeleeWeaponDamageView | null;
  /** Badges de plage de critique de l'ARME (mode « arme »). */
  weaponCriticalRanges: DefenseBadgeData[];
  /** Badges de plage de critique À MAINS NUES (mode mains nues). */
  unarmedCriticalRanges: DefenseBadgeData[];
}

/**
 * Carte « Attaque au contact » avec bascule arme ⇄ mains nues (PER-141) : DEUX cadres superposés
 * (arme / mains nues) qui s'ÉCHANGENT leur place avec une animation quand on clique sur le bouton
 * rond en haut à gauche (paume au repos → flèches circulaires au survol). État d'UI LOCAL non
 * persisté (cf. autres états de jeu hors mode édition). Par défaut on montre l'arme équipée, ou
 * directement les mains nues si aucune arme de contact n'est portée.
 */
export function MeleeAttackCard({
  touch,
  forced,
  statHint,
  abilities,
  level,
  unarmed,
  meleeWeaponDamage,
  weaponCriticalRanges,
  unarmedCriticalRanges,
}: MeleeAttackCardProps) {
  const [mode, setMode] = useState<MeleeMode>(meleeWeaponDamage ? 'weapon' : 'unarmed');
  const swap = () => setMode((m) => (m === 'weapon' ? 'unarmed' : 'weapon'));

  // Style d'un cadre selon qu'il est AU-DESSUS (actif) ou DERRIÈRE (inactif). Le cadre arrière est
  // décalé par un simple `transform` : il DÉPASSE visuellement (« en plus ») sans peser sur la
  // hauteur de la pile — le cadre actif garde donc la même hauteur que les cartes voisines (Attaque
  // à distance / magique), imposée par la ligne de la grille via `height: 100%`.
  const layerSx = (layer: MeleeMode) => {
    const front = layer === mode;
    return {
      gridArea: '1 / 1',
      height: '100%',
      transition: 'transform 260ms ease, opacity 260ms ease, box-shadow 260ms ease',
      transform: front ? 'none' : 'translate(9px, 11px) scale(0.97)',
      opacity: front ? 1 : 0.5,
      zIndex: front ? 2 : 1,
      pointerEvents: front ? 'auto' : 'none',
    } as const;
  };

  return (
    <Box
      sx={{
        position: 'relative',
        height: '100%',
        // Le cadre arrière décalé dépasse en dehors du bloc (aucune marge réservée) : il vient « en
        // plus » sans agrandir le cadre actif.
        overflow: 'visible',
        // L'icône « i » de détail n'apparaît qu'au survol de la carte (comme les autres cartes).
        '& .derived-stat-hint': { opacity: 0, transition: 'opacity 120ms ease' },
        '&:hover .derived-stat-hint': { opacity: 1 },
      }}
    >
      {/* Bouton d'échange, en haut à gauche : paume (repos) → flèches circulaires qui tournent (survol). */}
      <AppTooltip title="Échanger arme / mains nues">
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
          <Box sx={{ position: 'relative', width: 20, height: 20 }}>
            <FrontHandIcon
              className="mn-rest"
              sx={{ position: 'absolute', inset: 0, fontSize: 20, transition: 'opacity 180ms ease' }}
            />
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

      {/* Pile de cadres : les deux occupent la même cellule de grille ; `height: 100%` aligne la
          hauteur du cadre actif sur celle des cartes voisines de la ligne. */}
      <Box sx={{ display: 'grid', height: '100%' }}>
        {(['weapon', 'unarmed'] as const).map((layer) => (
          <Card key={layer} variant="outlined" sx={layerSx(layer)}>
            <Face
              mode={layer}
              touch={touch}
              forced={forced}
              abilities={abilities}
              level={level}
              unarmed={unarmed}
              meleeWeaponDamage={meleeWeaponDamage}
              weaponCriticalRanges={weaponCriticalRanges}
              unarmedCriticalRanges={unarmedCriticalRanges}
            />
          </Card>
        ))}
      </Box>
    </Box>
  );
}
