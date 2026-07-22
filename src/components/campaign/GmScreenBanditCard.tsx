'use client';

/**
 * Carte « bandit de base » du combat tracker de l'écran de MJ (construction à
 * l'arrache pour une session de table, cf. PER-236). Réutilise la MÊME coque que
 * {@link GmScreenCard} (Paper vitré sombre, coins arrondis) pour rester cohérente
 * avec les cartes des personnages joueurs, mais teintée de rouge pour marquer un
 * adversaire, et rend le profil de créature via {@link CreatureStatBlock}.
 *
 * Le profil est FIGÉ (bandit de base, livre de base p. 263) : ses stats sont des
 * valeurs littérales (aucun renvoi au maître), on passe donc des caractéristiques
 * neutres à `CreatureStatBlock` — elles ne servent qu'à résoudre d'éventuels
 * tokens richText, absents ici.
 */
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import { alpha } from '@mui/material/styles';
import { AppTooltip } from '@/components/AppTooltip';
import { CreatureStatBlock } from '@/components/sheet/CreatureStatBlock';
import type { CreatureProfile } from '@/data/schema';
import type { Abilities } from '@/lib/engine';

/** Caractéristiques neutres : le profil du bandit n'utilise que des littéraux. */
const NEUTRAL_ABILITIES: Abilities = { AGI: 0, CON: 0, FOR: 0, PER: 0, CHA: 0, INT: 0, VOL: 0 };

/**
 * Bandit de base (livre de base CO2, p. 263) — NC 1/2. AGI notée « * » = dé bonus
 * inné. Arc + Embuscade rangés en `note` (le rendu d'attaque secondaire de
 * `CreatureStatBlock` renvoie au maître, hors sujet pour un PNJ autonome).
 */
export const BANDIT_BASE_PROFILE: CreatureProfile = {
  name: 'Bandit de base',
  type: 'Créature humanoïde · NC 1/2',
  abilities: { AGI: 1, CON: 1, FOR: 1, PER: 0, CHA: 0, INT: 0, VOL: -1 },
  bonusDieAbilities: ['AGI'],
  defense: '12',
  hitPoints: '9',
  initiative: '10',
  attack: { label: 'Épée longue', value: '+2', damage: '1d8+1' },
  note:
    'Arc (30 m) +2 · DM 1d6. Embuscade : au 1ᵉʳ round, si l’environnement permet de se dissimuler, la cible fait un test de PER difficulté 16 ou est surprise. (p. 263)',
};

export interface GmScreenBanditCardProps {
  /** Libellé du badge (ex. « Bandit 1 ») pour distinguer plusieurs instances. */
  label: string;
  /** Retire ce bandit du combat tracker. */
  onRemove: () => void;
}

export function GmScreenBanditCard({ label, onRemove }: GmScreenBanditCardProps) {
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
        <CreatureStatBlock profile={BANDIT_BASE_PROFILE} abilities={NEUTRAL_ABILITIES} level={1} rank={1} />
      </Stack>
    </Paper>
  );
}
