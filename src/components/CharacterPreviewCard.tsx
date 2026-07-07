'use client';

/**
 * Micro-fiche récapitulative d'un personnage (portrait + identité + les 7
 * caractéristiques en badges compacts). Composant purement présentatif, partagé
 * par la modale d'import (`ImportCharacterDialog`, confirmation d'import) et par
 * l'infobulle de survol des lignes du listing (`CharacterList`) — cette dernière
 * sert notamment à révéler un nom tronqué en entier.
 */
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { ClassIcon } from '@/components/ClassIcon';
import { ABILITY_IDS } from '@/data/schema';
import type { Character } from '@/lib/character/types';
import { summarize } from '@/lib/character/summary';
import { ABILITY_NAMES } from '@/lib/ui/ability';
import { classColor } from '@/lib/ui/classColors';

export interface CharacterPreviewCardProps {
  character: Character;
}

export function CharacterPreviewCard({ character }: CharacterPreviewCardProps) {
  const summary = summarize(character);
  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
        <Box
          component="img"
          src={`/classes/${summary.classId}${character.portraitVariant === 'alt' ? '-2' : ''}.webp`}
          alt=""
          aria-hidden
          sx={{
            width: 72,
            height: 72,
            borderRadius: 2,
            objectFit: 'cover',
            objectPosition: 'top',
            flexShrink: 0,
            border: '1px solid rgba(255, 255, 255, 0.12)',
            bgcolor: 'rgba(255, 255, 255, 0.04)',
          }}
        />
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
            {summary.name}
          </Typography>
          <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', mt: 0.25 }}>
            <ClassIcon classId={summary.classId} firearmsAllowed={summary.firearmsAllowed} size={18} />
            <Typography variant="body2" color="text.secondary">
              <Box component="span" sx={{ color: classColor(summary.classId), fontWeight: 600 }}>
                {summary.characterClass}
              </Box>{' '}
              · niveau {summary.level}
            </Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary">
            {summary.ancestry}
          </Typography>
        </Box>
      </Stack>

      {/* Les 7 caractéristiques, en badges compacts (pas de Chip MUI). */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: 0.75,
        }}
      >
        {ABILITY_IDS.map((id) => {
          const value = character.abilities[id] ?? 0;
          return (
            <Box
              key={id}
              title={ABILITY_NAMES[id]}
              sx={{
                borderRadius: 1,
                border: '1px solid rgba(255, 255, 255, 0.12)',
                bgcolor: 'rgba(255, 255, 255, 0.04)',
                py: 0.5,
                textAlign: 'center',
              }}
            >
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.2 }}>
                {id}
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
                {value >= 0 ? `+${value}` : value}
              </Typography>
            </Box>
          );
        })}
      </Box>
    </Stack>
  );
}
