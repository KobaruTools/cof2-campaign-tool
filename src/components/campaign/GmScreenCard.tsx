'use client';

/**
 * Carte de l'écran de MJ : une **fiche de personnage condensée** — plus qu'un
 * aperçu, moins qu'une fiche complète. Assemble, dans un `Paper`, le nom du joueur
 * qui incarne le personnage + un petit bouton d'ouverture de la fiche complète,
 * l'aperçu (`CharacterPreviewCard`, caractéristiques colorées fort/faible) et la
 * grille compacte des statistiques dérivées (`CompactDerivedStats`, avec puces
 * immunités / RD / critiques).
 *
 * Depuis PER-258, **la carte entière est cliquable** et ouvre le panneau latéral de
 * fiche (`panelHref`) — cela renverse le choix d'origine (« la carte elle-même n'est
 * pas cliquable »), qui obligeait à viser le petit bouton d'ouverture. Elle reste une
 * VRAIE ancre, en superposition plutôt qu'en `Paper` cliquable : une ancre ne peut pas
 * en contenir une autre, et le bouton « fiche complète » en est une. Le contenu est
 * donc transparent aux clics (`pointerEvents: none`), sauf les zones réellement
 * interactives (ligne du joueur, statistiques dérivées et leurs infobulles), qui les
 * réactivent — d'où deux zones où le clic n'ouvre pas le panneau, en échange des
 * infobulles préservées.
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
import { profileAccentGradient } from '@/lib/ui/classColors';
import type { Character } from '@/lib/character/types';

export interface GmScreenCardProps {
  character: Character;
  /** Nom du joueur qui incarne le personnage (badge), ou `null` si aucun. */
  playerName: string | null;
  /** Destination de la fiche complète (bouton dédié, rendu en vraie ancre). */
  href: string;
  /** Destination du panneau latéral de fiche — ancre couvrant toute la carte (PER-258). */
  panelHref: string;
}

export function GmScreenCard({ character, playerName, href, panelHref }: GmScreenCardProps) {
  // Vue dérivée partagée avec la fiche (mêmes stats + puces). `null` si profil
  // incomplet : on n'affiche alors que l'aperçu.
  const view = buildCharacterDerivedView(character);
  return (
    <Paper
      sx={{
        position: 'relative',
        p: 2,
        bgcolor: 'rgba(20, 20, 23, 0.72)',
        // Léger dégradé teinté au profil (bas droite → haut gauche), posé sur toute la
        // carte condensée. L'aperçu interne est donc rendu SANS sa propre teinte
        // (`tinted={false}`) pour ne pas doubler le dégradé.
        backgroundImage: profileAccentGradient(character.classId, 'to top left'),
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: 3,
        // Liseré éclairci au survol de la carte : signale qu'elle est cliquable.
        '&:hover': { borderColor: 'rgba(255, 255, 255, 0.22)' },
      }}
    >
      {/* Ancre de la carte entière, DERRIÈRE le contenu (qui est transparent aux clics) :
          le survol comme le clic la traversent, donc curseur « main » sur toute la carte
          et Ctrl/⌘+Clic ou clic-molette ouvrent l'écran de MJ déjà déplié. */}
      <Box
        component={Link}
        href={panelHref}
        scroll={false}
        aria-label={`Consulter la fiche de ${character.name || 'ce personnage'} dans le panneau`}
        sx={{ position: 'absolute', inset: 0, zIndex: 0, borderRadius: 'inherit' }}
      />
      <Stack spacing={1.5} sx={{ position: 'relative', zIndex: 1, pointerEvents: 'none' }}>
        {/* Ligne du joueur : badge à gauche, petit bouton d'ouverture poussé à droite. */}
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', pointerEvents: 'auto' }}>
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <PlayerBadge name={playerName} />
          </Box>
          <AppTooltip title="Ouvrir la fiche complète">
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
        <CharacterPreviewCard character={character} tinted={false} />
        {view.derivedInput && (
          // Infobulles des stats et des puces (immunités / RD / critiques) : on réactive
          // les événements de pointeur sur ce seul bloc pour ne pas les perdre.
          <Box sx={{ pointerEvents: 'auto' }}>
            <CompactDerivedStats
              input={view.derivedInput}
              overrides={character.overrides}
              defenseBadges={view.defenseBadges}
              meleeCriticalRanges={view.meleeCriticalRanges}
              rangedCriticalRanges={view.rangedCriticalRanges}
            />
          </Box>
        )}
      </Stack>
    </Paper>
  );
}
