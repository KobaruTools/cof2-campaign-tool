'use client';

import Box from '@mui/material/Box';

export interface CampaignBadgeProps {
  /** Nom de la campagne de rattachement, ou `null` pour « Non attribué ». */
  name: string | null;
}

/**
 * Badge de campagne d'un personnage (PER-180). Bloc custom (pas de `Chip` MUI,
 * règle projet) : nom de la campagne en pastille discrète, ou « Non attribué »
 * en style atténué quand le personnage n'appartient à aucune campagne.
 */
export function CampaignBadge({ name }: CampaignBadgeProps) {
  const assigned = name != null;
  return (
    <Box
      component="span"
      sx={{
        display: 'inline-block',
        px: 1,
        py: 0.25,
        borderRadius: 1,
        fontSize: '0.8125rem',
        lineHeight: 1.4,
        border: '1px solid',
        borderColor: assigned ? 'rgba(144, 202, 249, 0.35)' : 'rgba(255, 255, 255, 0.12)',
        bgcolor: assigned ? 'rgba(144, 202, 249, 0.10)' : 'transparent',
        color: assigned ? 'text.primary' : 'text.secondary',
        fontStyle: assigned ? 'normal' : 'italic',
      }}
    >
      {assigned ? name : 'Non attribué'}
    </Box>
  );
}
