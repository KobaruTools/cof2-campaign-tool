'use client';

/**
 * Mini-fiche d'une CRÉATURE/compagnon octroyé(e) par une capacité (golem, familier,
 * démon, zombie… et, à venir, compagnon animal du rôdeur / familier fantastique).
 * Affiche le `CreatureProfile` structuré (PER-69) : caractéristiques + stats dérivées,
 * en réutilisant le rendu enrichi (`RichInline`) pour les valeurs au format richText
 * (dés, formules, `rang`/`niveau`). Les renvois au maître (« Init. du forgesort »)
 * restent littéraux. Conçu pour être INSÉRÉ partout où une capacité porte un profil.
 */
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import type { ReactNode } from 'react';
import { ABILITY_IDS, type CreatureProfile } from '@/data/schema';
import type { Abilities } from '@/lib/engine';
import { ABILITY_NAMES } from '@/lib/ui/ability';
import { RichInline } from './FeatureRichText';

const signed = (n: number) => (n >= 0 ? `+${n}` : `−${Math.abs(n)}`);

/** Un libellé court + sa valeur (DEF, PV, Init., Attaque, DM). */
function StatItem({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
      <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>
        {label}
      </Typography>
      <Box component="span" sx={{ fontSize: '0.9rem' }}>
        {children}
      </Box>
    </Stack>
  );
}

export interface CreatureStatBlockProps {
  profile: CreatureProfile;
  /** Caractéristiques du personnage MAÎTRE — pour résoudre les valeurs richText. */
  abilities: Abilities;
  /** Niveau du personnage — pour `niveau` et les dés évolutifs. */
  level: number;
  /** Rang atteint dans la voie hôte — pour le terme `rang` des stats de la créature. */
  rank: number;
}

export function CreatureStatBlock({ profile, abilities, level, rank }: CreatureStatBlockProps) {
  const rich = (text: string) => <RichInline text={text} abilities={abilities} level={level} rank={rank} />;
  return (
    <Box
      sx={{
        border: 1,
        borderColor: 'divider',
        borderRadius: 1,
        p: 1.25,
        bgcolor: (t) => alpha(t.palette.text.primary, 0.025),
      }}
    >
      <Stack direction="row" spacing={1} sx={{ alignItems: 'baseline', flexWrap: 'wrap', mb: 0.75 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, letterSpacing: 0.5 }}>
          {profile.name.toUpperCase()}
        </Typography>
        {profile.type && (
          <Typography variant="caption" color="text.secondary">
            {profile.type}
          </Typography>
        )}
      </Stack>

      {/* Caractéristiques de la créature (valeurs fixes). */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: 0.5,
          mb: 0.75,
        }}
      >
        {ABILITY_IDS.map((id) => {
          const starred = profile.starred?.includes(id);
          return (
            <Tooltip key={id} title={`${ABILITY_NAMES[id]}${starred ? ' (dé bonus *)' : ''}`} arrow>
              <Box
                sx={{
                  textAlign: 'center',
                  borderRadius: 0.5,
                  py: 0.25,
                  cursor: 'help',
                  bgcolor: (t) => alpha(t.palette.text.primary, 0.05),
                }}
              >
                <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', lineHeight: 1.2 }}>
                  {id}
                </Typography>
                <Typography variant="caption" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                  {signed(profile.abilities[id])}
                  {starred ? '*' : ''}
                </Typography>
              </Box>
            </Tooltip>
          );
        })}
      </Box>

      {/* Stats dérivées + attaque. */}
      <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap', alignItems: 'center', rowGap: 0.5 }}>
        <StatItem label="DEF">{rich(profile.defense)}</StatItem>
        <StatItem label="PV">{rich(profile.hitPoints)}</StatItem>
        <StatItem label="Init.">{rich(profile.initiative)}</StatItem>
      </Stack>
      {profile.attack && (
        <Stack direction="row" spacing={2} sx={{ mt: 0.5, flexWrap: 'wrap', alignItems: 'center', rowGap: 0.5 }}>
          <StatItem label="Attaque">{rich(profile.attack.label)}</StatItem>
          <StatItem label="DM">{rich(profile.attack.damage)}</StatItem>
        </Stack>
      )}
      {profile.note && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, fontStyle: 'italic' }}>
          {profile.note}
        </Typography>
      )}
    </Box>
  );
}
