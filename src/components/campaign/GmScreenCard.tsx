'use client';

/**
 * Carte de l'écran de MJ : une **fiche de personnage condensée** — plus qu'un
 * aperçu, moins qu'une fiche complète. Assemble, dans un `Paper` statique (ce
 * n'est pas un bouton), le nom du joueur qui incarne le personnage + un petit
 * bouton d'ouverture de la fiche complète, l'aperçu (`CharacterPreviewCard`,
 * caractéristiques colorées fort/faible) et la grille compacte des statistiques
 * dérivées (`CompactDerivedStats`, avec puces immunités / RD / critiques).
 *
 * La vue dérivée (entrée moteur + badges) est calculée ici via le helper partagé
 * avec la fiche (`buildCharacterDerivedView`) : mêmes valeurs, aucune dérive.
 */
import Link from 'next/link';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import { AppTooltip } from '@/components/AppTooltip';
import { CharacterPreviewCard } from '@/components/CharacterPreviewCard';
import { CompactDerivedStats } from '@/components/sheet/CompactDerivedStats';
import { buildCharacterDerivedView } from '@/components/sheet/characterDerivedView';
import { PlayerBadge } from '@/components/home/PlayerBadge';
import type { Character } from '@/lib/character/types';

export interface GmScreenCardProps {
  character: Character;
  /** Nom du joueur qui incarne le personnage (badge), ou `null` si aucun. */
  playerName: string | null;
  /** Destination de la fiche complète (bouton dédié, rendu en vraie ancre). */
  href: string;
}

export function GmScreenCard({ character, playerName, href }: GmScreenCardProps) {
  // Vue dérivée partagée avec la fiche (mêmes stats + puces). `null` si profil
  // incomplet : on n'affiche alors que l'aperçu.
  const view = buildCharacterDerivedView(character);
  return (
    <Paper
      sx={{
        p: 2,
        bgcolor: 'rgba(20, 20, 23, 0.72)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: 3,
      }}
    >
      <Stack spacing={1.5}>
        {/* Ligne du joueur : badge à gauche, petit bouton d'ouverture poussé à droite. */}
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <PlayerBadge name={playerName} />
          </Box>
          <AppTooltip title="Ouvrir la fiche">
            <IconButton
              size="small"
              component={Link}
              href={href}
              aria-label={`Ouvrir la fiche de ${character.name || 'ce personnage'}`}
            >
              <OpenInNewIcon fontSize="small" />
            </IconButton>
          </AppTooltip>
        </Stack>
        <CharacterPreviewCard character={character} />
        {view.derivedInput && (
          <CompactDerivedStats
            input={view.derivedInput}
            overrides={character.overrides}
            defenseBadges={view.defenseBadges}
            meleeCriticalRanges={view.meleeCriticalRanges}
            rangedCriticalRanges={view.rangedCriticalRanges}
          />
        )}
      </Stack>
    </Paper>
  );
}
