'use client';

/**
 * Rappel PERMANENT, côté Écran MJ (PER-210), du **malus d'armure** (« malus d'encombrement »,
 * p. 188) d'un personnage qui porte une armure gênante. C'est un aide-mémoire d'APPLICATION
 * pour le MJ — pas un état préjudiciable subi automatiquement : à la table, les tests sont
 * résolus à la main, et ce malus s'ajoute à la DIFFICULTÉ des tests concernés. On garde donc
 * la teinte AMBRE d'avertissement (comme le malus sur la fiche), PAS la pastille rouge des états.
 *
 * La VALEUR n'est jamais recalculée ici : elle vient de `armorEncumbrancePenalty` (la même
 * fonction que la fiche joueur, diviseur d'Armure sur mesure compris) — voir `GmScreenCard`.
 * Ne s'affiche que si le malus effectif est > 0 : retirer l'armure ou ramener le malus à 0
 * (armure magique qui l'absorbe) fait disparaître le rappel.
 */
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import { AppTooltip } from '@/components/AppTooltip';
import { ItemTypeIcon } from '@/components/ItemTypeIcon';
import { SourceRef } from '@/components/SourceRef';
import { GlossaryText } from '@/components/sheet/FeatureRichText';

export interface ArmorPenaltyReminderProps {
  /** Malus d'armure EFFECTIF (déjà réduit par le bonus magique et divisé le cas échéant). */
  penalty: number;
  /** Nom de l'armure PORTÉE qui l'impose (ex. « Cotte de mailles »), ou `null` si inconnu. */
  armorLabel: string | null;
}

export function ArmorPenaltyReminder({ penalty, armorLabel }: ArmorPenaltyReminderProps) {
  // Aucune armure gênante : rien à rappeler (le rappel disparaît dès que le malus retombe à 0).
  if (penalty <= 0) return null;

  const tooltip = (
    <Box sx={{ minWidth: 200, maxWidth: 300 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5, display: 'flex', alignItems: 'center', gap: 0.75 }}>
        <Box component="span">Malus d’armure</Box>
        <SourceRef page={188} />
      </Typography>
      {armorLabel && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.75 }}>
          Armure portée : {armorLabel}
        </Typography>
      )}
      {/* Portée d'application, en clair pour le MJ : AGI d'office, CON à son choix. */}
      <Typography variant="caption" sx={{ display: 'block', mb: 0.75 }}>
        S’ajoute <strong>obligatoirement</strong> à la difficulté de tous les tests d’AGI, et{' '}
        <strong>optionnellement</strong> (au choix du MJ) à certains tests de survie (CON).
      </Typography>
      {/* Verbatim p. 188 — mis en forme (DEF/AGI/CON balisés) via le rendu partagé. */}
      <Typography
        variant="caption"
        component="div"
        sx={{ display: 'block', fontStyle: 'italic', color: 'text.secondary', pl: 1, borderLeft: '2px solid', borderColor: 'divider' }}
      >
        <GlossaryText>
          « Les armures infligent des malus d’encombrement aux tests d’AGI : ajoutez la valeur de DEF de
          l’armure à la difficulté de tous les tests d’AGI effectués par le personnage. Pour certains
          tests de survie (CON), vous pouvez aussi imposer ce malus. » Une armure magique n’augmente pas
          le malus : elle le réduit (minimum 0).
        </GlossaryText>
      </Typography>
    </Box>
  );

  return (
    <AppTooltip title={tooltip}>
      <Box
        sx={(theme) => ({
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0.6,
          alignSelf: 'flex-start',
          height: 24,
          px: 1,
          borderRadius: 1,
          cursor: 'help',
          lineHeight: 1,
          fontSize: '0.75rem',
          fontWeight: 700,
          whiteSpace: 'nowrap',
          color: theme.palette.warning.main,
          bgcolor: alpha(theme.palette.warning.main, 0.12),
          border: `1px solid ${alpha(theme.palette.warning.main, 0.45)}`,
        })}
        data-glossary-shot="ArmorPenaltyReminder"
      >
        <ItemTypeIcon type="armor" size={15} />
        <Box component="span">Malus d’armure −{penalty}</Box>
      </Box>
    </AppTooltip>
  );
}
