'use client';

import type { ReactNode } from 'react';
import OpacityIcon from '@mui/icons-material/Opacity';
import PersonalInjuryIcon from '@mui/icons-material/PersonalInjury';
import WhatshotIcon from '@mui/icons-material/Whatshot';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import type { Abilities } from '@/lib/engine';
import { AttackQualifierBadge, type AttackBadgeColor } from '@/components/sheet/AttackQualifierBadge';
import { CapabilityChip, RichInline } from '@/components/sheet/FeatureRichText';

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

/**
 * Badge custom (≠ Chip MUI) d'un effet de capacité, au gabarit `AttackQualifierBadge`. Le rappel
 * passe par `RichInline` (et non `GlossaryText`, qui ignore les tokens `{1d4°}` — un dé y resterait
 * affiché en littéral) : seul moteur qui résout dés/formules contre le personnage. `rank` n'a aucune
 * incidence sur les rappels actuels (aucun terme `[#rang]`) : une constante suffit.
 */
export function FeatureEffectBadge({
  note,
  abilities,
  level,
  color = 'error',
}: {
  note: FeatureEffectNote;
  abilities: Abilities;
  level: number;
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
            <RichInline text={note.reminder} abilities={abilities} level={level} rank={0} />
          </Typography>
          <CapabilityChip featureId={note.featureId} label={null} />
        </Box>
      }
    />
  );
}
