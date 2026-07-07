'use client';

import Box from '@mui/material/Box';

export interface PlayerBadgeProps {
  /** Nom du joueur qui incarne le personnage, ou `null` si aucun n'est attribué. */
  name: string | null;
}

/**
 * Badge du joueur d'un personnage (PER-184). Bloc custom (pas de `Chip` MUI, règle
 * projet), en parité visuelle avec {@link CampaignBadge} qu'il jouxte sur la fiche :
 * nom du joueur en pastille discrète (teinte verte pour le distinguer de la campagne,
 * bleue), ou « Aucun joueur » en style atténué quand personne n'est attribué.
 *
 * Non cliquable : c'est un fil de contexte informatif (le MJ voit qui incarne le
 * personnage) ; la réattribution se fait via le sélecteur en mode édition.
 */
export function PlayerBadge({ name }: PlayerBadgeProps) {
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
        borderColor: assigned ? 'rgba(129, 199, 132, 0.35)' : 'rgba(255, 255, 255, 0.12)',
        bgcolor: assigned ? 'rgba(129, 199, 132, 0.10)' : 'transparent',
        color: assigned ? 'text.primary' : 'text.secondary',
        fontStyle: assigned ? 'normal' : 'italic',
      }}
    >
      {assigned ? name : 'Aucun joueur'}
    </Box>
  );
}
