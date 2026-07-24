'use client';

/**
 * Carte d'une créature ajoutée au combat tracker de l'écran de MJ (PER-247, remplace
 * l'ancienne `GmScreenBanditCard` spécifique au bandit). Réutilise la MÊME coque que
 * {@link GmScreenCard} (Paper vitré sombre, coins arrondis) pour rester cohérente avec
 * les cartes des personnages joueurs, mais teintée de rouge pour marquer un adversaire,
 * et rend le bloc de stats de la créature TEL QU'IL APPARAÎT DANS LE BESTIAIRE
 * (`BestiaryStatBlock` via `CreatureBlobView`, blob chargé à la demande).
 */
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import { alpha } from '@mui/material/styles';
import { AppTooltip } from '@/components/AppTooltip';
import { CreatureBlobView } from '@/components/bestiary/CreatureBlobView';

export interface GmScreenCreatureCardProps {
  /** Slug de la créature du bestiaire à afficher (`Creature.id`). */
  slug: string;
  /** Libellé du badge (ex. « Gobelin 2 ») pour distinguer plusieurs instances. */
  label: string;
  /** Retire cette instance du combat tracker. */
  onRemove: () => void;
}

export function GmScreenCreatureCard({ slug, label, onRemove }: GmScreenCreatureCardProps) {
  return (
    <Paper
      sx={{
        p: 2,
        bgcolor: 'rgba(20, 20, 23, 0.72)',
        // Teinte rouge discrète (bas droite → haut gauche) : marque un adversaire,
        // en parité de facture avec le dégradé de profil des cartes joueurs.
        backgroundImage: `linear-gradient(to top left, ${alpha('#e57373', 0.16)}, transparent)`,
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        border: '1px solid rgba(229, 115, 115, 0.28)',
        borderRadius: 3,
      }}
    >
      <Stack spacing={1.5}>
        {/* Ligne d'en-tête : badge « adversaire » à gauche, retrait poussé à droite —
            calquée sur la ligne joueur de `GmScreenCard`. */}
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Box
              component="span"
              sx={{
                display: 'inline-block',
                px: 1,
                py: 0.25,
                borderRadius: 1,
                fontSize: '0.8125rem',
                lineHeight: 1.4,
                border: '1px solid rgba(229, 115, 115, 0.35)',
                bgcolor: 'rgba(229, 115, 115, 0.12)',
                color: 'text.primary',
              }}
            >
              {label} · PNJ
            </Box>
          </Box>
          <AppTooltip title="Retirer du combat">
            <IconButton size="small" onClick={onRemove} aria-label={`Retirer ${label}`}>
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          </AppTooltip>
        </Stack>
        <CreatureBlobView slug={slug} hideNotes dense collapsibleAbilities />
      </Stack>
    </Paper>
  );
}
