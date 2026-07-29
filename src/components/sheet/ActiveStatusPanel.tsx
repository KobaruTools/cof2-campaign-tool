'use client';

/**
 * Rappel visuel des ÉTATS DE COMBAT appliqués au personnage (PER-281, tranche 5 de PER-276), en
 * LECTURE SEULE sur sa fiche. Le MJ est seul à appliquer/retirer (RLS `campaign_combat`) ; le joueur
 * voit et subit. N'apparaît QUE quand une session est active et qu'au moins un état est posé — les
 * effets chiffrés (DEF/Init./attaques) sont, eux, déjà repliés dans les stats dérivées de la fiche.
 *
 * Réutilise la puce d'état de l'écran de MJ (`StatusChipVisual`, badge custom rouge + effet VERBATIM
 * en info-bulle avec renvoi de page) pour un langage visuel identique des deux côtés de la table. Les
 * états cumulatifs affichent leur intensité (« ×N »).
 */
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import { StatusChipVisual } from '@/components/campaign/CombatStatusPalette';
import { isStackingStatus, type AppliedStatus } from '@/lib/character/statusEffects';

export interface ActiveStatusPanelProps {
  /** États appliqués au personnage (déjà résolus depuis le store de combat de la session). */
  statuses: AppliedStatus[];
}

export function ActiveStatusPanel({ statuses }: ActiveStatusPanelProps) {
  // Rien à afficher hors session ou sans état posé (l'appelant ne passe la liste qu'en session).
  if (statuses.length === 0) return null;

  return (
    <Box
      sx={(theme) => ({
        px: 1.5,
        py: 1.25,
        borderRadius: 1,
        border: `1px solid ${alpha(theme.palette.error.main, 0.35)}`,
        bgcolor: alpha(theme.palette.error.main, 0.06),
      })}
    >
      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.25 }}>
        États de combat en cours
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
        Appliqués par le MJ pendant la session — lecture seule. Le malus chiffré est déjà répercuté
        sur vos stats et vos attaques.
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        {statuses.map((s) => {
          const intensity = s.intensity ?? 1;
          const stacked = isStackingStatus(s.id) && intensity > 1;
          return (
            <Stack key={s.id} direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
              <StatusChipVisual id={s.id} />
              {stacked && (
                <Typography
                  variant="caption"
                  sx={{ fontWeight: 700, color: 'error.light' }}
                >
                  ×{intensity}
                </Typography>
              )}
            </Stack>
          );
        })}
      </Box>
    </Box>
  );
}
