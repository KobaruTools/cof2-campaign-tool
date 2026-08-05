'use client';

import type { ReactNode } from 'react';
import OpacityIcon from '@mui/icons-material/Opacity';
import PersonalInjuryIcon from '@mui/icons-material/PersonalInjury';
import WhatshotIcon from '@mui/icons-material/Whatshot';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { AttackQualifierBadge, type AttackBadgeColor } from '@/components/sheet/AttackQualifierBadge';
import { CapabilityChip, GlossaryText } from '@/components/sheet/FeatureRichText';

/** Clé d'icône d'un effet de capacité (résolue ici, pour garder la couche de données SANS JSX). */
export type FeatureEffectIcon = 'bleeding' | 'grievous-wounds' | 'merciless';

const ICONS: Record<FeatureEffectIcon, ReactNode> = {
  bleeding: <OpacityIcon sx={{ fontSize: 18 }} />,
  'grievous-wounds': <PersonalInjuryIcon sx={{ fontSize: 18 }} />,
  merciless: <WhatshotIcon sx={{ fontSize: 18 }} />,
};

/**
 * Note d'effet porté par une capacité (DoT, riposte, pénalité de guérison…) — un DM ou un malus subi
 * par un TIERS (adversaire) ou portant sur SON état, jamais un modificateur chiffré sur la fiche du
 * porteur. Affichée en badge custom sur une carte d'attaque, avec un rappel MINIMAL en info-bulle
 * (une phrase) + une puce vers la capacité source (cf. `CapabilityChip`).
 */
export interface FeatureEffectNote {
  featureId: string;
  icon: FeatureEffectIcon;
  label: string;
  /** Rappel COURT (une phrase), balisé richText si besoin (dés…) — pas le verbatim complet. */
  reminder: string;
  /** N'affiché qu'en mode ARME (mode mains nues exclu). Absent/`false` = les deux modes. */
  weaponOnly?: boolean;
}

/** Badge custom (≠ Chip MUI) d'un effet de capacité, au gabarit `AttackQualifierBadge`. */
export function FeatureEffectBadge({
  note,
  color = 'error',
}: {
  note: FeatureEffectNote;
  color?: AttackBadgeColor;
}) {
  return (
    <AttackQualifierBadge
      color={color}
      icon={ICONS[note.icon]}
      label={note.label}
      tooltip={
        <Box sx={{ minWidth: 180, maxWidth: 260 }}>
          <Typography variant="body2" sx={{ mb: 0.75 }}>
            <GlossaryText>{note.reminder}</GlossaryText>
          </Typography>
          <CapabilityChip featureId={note.featureId} label={null} />
        </Box>
      }
    />
  );
}
