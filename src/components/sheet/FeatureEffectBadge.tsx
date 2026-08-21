'use client';

import type { ReactNode } from 'react';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import CallSplitIcon from '@mui/icons-material/CallSplit';
import OpacityIcon from '@mui/icons-material/Opacity';
import PersonalInjuryIcon from '@mui/icons-material/PersonalInjury';
import RemoveModeratorIcon from '@mui/icons-material/RemoveModerator';
import WhatshotIcon from '@mui/icons-material/Whatshot';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { featureById } from '@/data';
import type { Abilities } from '@/lib/engine';
import { SourceRef } from '@/components/SourceRef';
import { AttackQualifierBadge, type AttackBadgeColor } from '@/components/sheet/AttackQualifierBadge';
import { CapabilityChip, RichInline } from '@/components/sheet/FeatureRichText';
import { featureCodexHref } from '@/lib/ui/codex';

/** Clé d'icône d'un effet de capacité (résolue ici, pour garder la couche de données SANS JSX). */
export type FeatureEffectIcon =
  | 'bleeding'
  | 'grievous-wounds'
  | 'merciless'
  | 'arcane-strike'
  | 'half-damage'
  | 'ignore-rd';

const ICONS: Record<FeatureEffectIcon, ReactNode> = {
  bleeding: <OpacityIcon sx={{ fontSize: 18 }} />,
  'grievous-wounds': <PersonalInjuryIcon sx={{ fontSize: 18 }} />,
  merciless: <WhatshotIcon sx={{ fontSize: 18 }} />,
  'arcane-strike': <AutoAwesomeIcon sx={{ fontSize: 18 }} />,
  // Métamorphose élémentaire, forme Air (élémentaliste r8, PER-74) : DM physiques divisés par 2.
  'half-damage': <CallSplitIcon sx={{ fontSize: 18 }} />,
  // Ignore la RD des créatures de grande taille (demi-ogre r4, PER-325) : bouclier barré = RD levée.
  'ignore-rd': <RemoveModeratorIcon sx={{ fontSize: 18 }} />,
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
  /**
   * Page de RÈGLE référencée dans l'info-bulle (badge `SourceRef` cliquable, livre de base par défaut).
   * Ex. la RD des créatures de grande taille (p. 206) pour le demi-ogre r4. Absent = aucun renvoi.
   */
  sourcePage?: number;
  /**
   * Teinte du badge, au même logiciel de couleurs que le reste de la fiche (retour propriétaire) :
   * `'info'` (bleu) pour un effet PERMANENT — même famille que « Combat à deux armes »/« Cape
   * d'ombre », un rappel de règle qui ne modifie AUCUNE stat du porteur ; `'warning'` (ambre) pour un
   * effet SITUATIONNEL (conditionné à un déclencheur précis, ex. Impitoyable ne joue que sur un
   * raté), même logique que l'immunité situationnelle de `DefenseBadge`. Le ROUGE reste réservé au dé
   * malus interne (`MalusDieBadge`, en dur) — jamais une teinte de badge autonome sur cette carte.
   */
  color: AttackBadgeColor;
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
}: {
  note: FeatureEffectNote;
  abilities: Abilities;
  level: number;
}) {
  const sourceFeature = featureById.get(note.featureId);
  return (
    <span style={{ display: 'inline-flex' }} data-glossary-shot="FeatureEffectBadge">
      <AttackQualifierBadge
        color={note.color}
        icon={ICONS[note.icon]}
        label={note.label}
        tooltip={
          <Box sx={{ minWidth: 180, maxWidth: 260 }}>
            <Typography variant="body2" sx={{ mb: 0.75 }}>
              <RichInline text={note.reminder} abilities={abilities} level={level} rank={0} />
            </Typography>
            {note.sourcePage != null && (
              <Box sx={{ mb: 0.75 }}>
                <SourceRef
                  page={note.sourcePage}
                  codexHref={sourceFeature ? featureCodexHref(sourceFeature) : undefined}
                />
              </Box>
            )}
            <CapabilityChip featureId={note.featureId} label={null} />
          </Box>
        }
      />
    </span>
  );
}
