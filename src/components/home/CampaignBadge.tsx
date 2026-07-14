'use client';

import Link from 'next/link';
import Box from '@mui/material/Box';

export interface CampaignBadgeProps {
  /** Nom de la campagne de rattachement, ou `null` pour « Non attribué ». */
  name: string | null;
  /**
   * Id de la campagne de rattachement. Fourni → le badge devient un lien vers la
   * vue campagne (`/campaign/[cid]`, route MJ). Absent → badge non cliquable.
   */
  campaignId?: string | null;
}

/**
 * Badge de campagne d'un personnage (PER-180). Bloc custom (pas de `Chip` MUI,
 * règle projet) : nom de la campagne en pastille discrète, ou « Non attribué »
 * en style atténué quand le personnage n'appartient à aucune campagne.
 *
 * Quand `campaignId` est fourni et une campagne est attribuée, le badge devient
 * cliquable et navigue vers `/campaign/[cid]`. C'est une commodité MJ : la vue
 * campagne est une route propriétaire, et le proxy confine de toute façon les
 * sessions joueur hors de l'accueil (jamais rendu pour eux).
 */
export function CampaignBadge({ name, campaignId }: CampaignBadgeProps) {
  const assigned = name != null;
  const clickable = assigned && campaignId != null;

  const badgeSx = {
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
    textDecoration: 'none',
    fontStyle: assigned ? 'normal' : 'italic',
    ...(clickable && {
      cursor: 'pointer',
      transition: 'background-color 120ms, border-color 120ms',
      '&:hover': {
        bgcolor: 'rgba(144, 202, 249, 0.20)',
        borderColor: 'rgba(144, 202, 249, 0.55)',
      },
      '&:focus-visible': {
        outline: '2px solid',
        outlineColor: 'rgba(144, 202, 249, 0.7)',
        outlineOffset: 2,
      },
    }),
  } as const;

  // Cliquable → vraie ancre (`Link`) : Ctrl/⌘+Clic et clic-molette ouvrent la
  // campagne dans un nouvel onglet. `stopPropagation` empêche la carte mobile
  // parente d'ouvrir la fiche du personnage au clic sur le badge.
  if (clickable) {
    return (
      <Box
        component={Link}
        href={`/campaign/${campaignId}`}
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
        sx={badgeSx}
      >
        {name}
      </Box>
    );
  }

  return (
    <Box component="span" sx={badgeSx}>
      {assigned ? name : 'Non attribué'}
    </Box>
  );
}
