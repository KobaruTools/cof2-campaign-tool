'use client';

import type { ReactElement, ReactNode } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Divider from '@mui/material/Divider';
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import type { Abilities } from '@/lib/engine';
import type { FormAttackView } from '@/lib/character/formAttack';
import { formAttackDice } from '@/lib/character/formAttack';
import { AppTooltip } from '@/components/AppTooltip';
import { ActionMarkerHex } from '@/components/FeatureMarkerHex';
import { DerivedStatIcon } from '@/components/DerivedStatIcon';
import { SourceRef } from '@/components/SourceRef';
import { CapabilityChip } from '@/components/sheet/FeatureRichText';
import { WeaponDamageExpr } from '@/components/sheet/WeaponDamageExpr';

/**
 * Badge de CADENCE de l'attaque conférée : hexagone(s) du/des type(s) d'action de l'attaque
 * (« (G) » = action gratuite) + la fréquence VERBATIM (« une fois par round »). Badge custom (pas de
 * Chip MUI), teinte neutre ; le tooltip porte la capacité source et la page. Ne rend rien si
 * l'attaque n'énonce ni type d'action ni cadence.
 */
function FormAttackRateBadge({ attack }: { attack: FormAttackView }) {
  if (attack.actionTypes.length === 0 && !attack.frequency) return null;
  const tooltip = (
    <Box sx={{ minWidth: 180 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
        {attack.name} — {attack.frequency ? `${attack.frequency}` : 'attaque conférée par la forme'}
      </Typography>
      <Box sx={{ mb: 0.5 }}>
        <CapabilityChip featureId={attack.featureId} label={null} />
      </Box>
      <SourceRef page={attack.page} term={attack.featureName} />
    </Box>
  );
  return (
    <AppTooltip title={tooltip}>
      <Box
        sx={(theme) => ({
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0.35,
          height: 28,
          px: 0.75,
          borderRadius: 1,
          cursor: 'help',
          lineHeight: 1,
          fontSize: '0.85rem',
          fontWeight: 600,
          whiteSpace: 'nowrap',
          color: theme.palette.text.secondary,
          bgcolor: alpha(theme.palette.common.white, 0.06),
          border: `1px solid ${alpha(theme.palette.common.white, 0.25)}`,
        })}
      >
        {attack.actionTypes.map((a) => (
          <ActionMarkerHex key={a} marker={a} size={18} />
        ))}
        {attack.frequency && <Box component="span">{attack.frequency}</Box>}
      </Box>
    </AppTooltip>
  );
}

export interface FormAttackCardProps {
  /** Attaque conférée par la forme active (moteur `formAttack`). */
  attack: FormAttackView;
  /** Valeur de touche employée par l'attaque (attaque au contact pour une morsure). */
  touch: number | null;
  /** La valeur de touche est-elle forcée (surcharge épinglée) ? */
  forced: boolean;
  /** Enrobe la touche pour ouvrir le détail du calcul à son survol (curseur « ? »). */
  wrapTouch: (child: ReactElement) => ReactNode;
  /** Caractéristiques effectives (résolution dynamique des DM). */
  abilities: Abilities;
}

/**
 * Carte d'une ATTAQUE CONFÉRÉE PAR UNE FORME (PER-74) — morsure de la forme hybride du lycanthrope
 * (p. 130). Même gabarit que les cartes d'attaque de la fiche : icône de l'attaque (celle du
 * `scope`), libellé, valeur de touche (avec son détail au survol) et DM (dé + caractéristique).
 *
 * Elle REMPLACE la carte « Attaque à distance » tant que la forme est active : sous cette forme le
 * personnage ne peut pas utiliser d'arme pour attaquer à distance, mais gagne cette attaque — le
 * libellé et son info-bulle le disent explicitement. Aucune bascule (contrairement à arme ⇄ mains
 * nues, PER-141) : ce n'est pas un choix du joueur mais l'état de sa forme.
 */
export function FormAttackCard({ attack, touch, forced, wrapTouch, abilities }: FormAttackCardProps) {
  const statId = attack.scope === 'melee' ? 'meleeAttack' : 'rangedAttack';
  const scopeLabel = attack.scope === 'melee' ? 'au contact' : 'à distance';
  const titleTooltip = (
    <Box sx={{ minWidth: 200 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
        {attack.name} — attaque {scopeLabel} conférée par la forme
      </Typography>
      <Box sx={{ mb: 0.5 }}>
        <CapabilityChip featureId={attack.featureId} label={null} />
      </Box>
      {attack.replacesRangedAttack && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
          Remplace l’attaque à distance : sous cette forme, le personnage ne peut pas utiliser d’arme
          pour attaquer à distance.
        </Typography>
      )}
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
        Touche = valeur d’attaque {scopeLabel} habituelle du personnage.
      </Typography>
      <SourceRef page={attack.page} term={attack.featureName} />
    </Box>
  );

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
          <DerivedStatIcon statId={statId} title size={40} />
          <Box sx={{ minWidth: 0, flexGrow: 1 }}>
            {/* Libellé : nom de l'attaque + forme qui la confère, avec le détail en info-bulle
                (source, remplacement de l'attaque à distance, origine de la touche). */}
            <AppTooltip title={titleTooltip}>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: 'block', lineHeight: 1.2, cursor: 'help', width: 'fit-content' }}
              >
                {attack.name} ({attack.featureName})
              </Typography>
            </AppTooltip>
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
              {/* Petit séparateur : la valeur de touche et le calcul des DM sont deux choses distinctes. */}
              <Divider orientation="vertical" flexItem sx={{ my: 0.5 }} />
              <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                <Typography variant="caption" color="text.secondary">
                  DM
                </Typography>
                <WeaponDamageExpr
                  dice={formAttackDice(attack)}
                  abilities={attack.damageAbilities}
                  charAbilities={abilities}
                />
              </Box>
            </Box>
          </Box>
        </Box>

        {/* Type d'action + cadence de l'attaque (« (G) une fois par round »). */}
        <Box sx={{ mt: 0.75, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
          <FormAttackRateBadge attack={attack} />
        </Box>
      </CardContent>
    </Card>
  );
}
