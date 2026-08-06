'use client';

/**
 * Rappel visuel des ÉTATS DE COMBAT appliqués au personnage (PER-281, tranche 5 de PER-276), en
 * LECTURE SEULE sur sa fiche. Le MJ est seul à appliquer/retirer (RLS `campaign_combat`) ; le joueur
 * voit et subit. N'apparaît QUE quand une session est active et qu'au moins un état est posé — les
 * effets chiffrés (DEF/Init./attaques) sont, eux, déjà repliés dans les stats dérivées de la fiche.
 *
 * Réutilise la puce d'état de l'écran de MJ (`StatusChipVisual`, badge custom teinté + effet VERBATIM
 * en info-bulle avec renvoi de page) pour un langage visuel identique des deux côtés de la table. Les
 * états cumulatifs affichent leur intensité (« ×N »).
 *
 * Depuis PER-104, le panneau peut aussi porter des BUFFS DE GROUPE (Chant des héros, Bénédiction) :
 * le cadre suit alors le contenu — vert tant qu'il n'y a que du bénéfique, rouge dès qu'un état subi
 * s'y trouve (le plus urgent gagne).
 */
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import { StatusChipVisual } from '@/components/campaign/CombatStatusPalette';
import { statusTone } from '@/lib/ui/statusPalette';
import {
  isBeneficialStatus,
  isStackingStatus,
  statusRemainingRounds,
  type AppliedStatus,
} from '@/lib/character/statusEffects';

export interface ActiveStatusPanelProps {
  /** États appliqués au personnage (déjà résolus depuis le store de combat de la session). */
  statuses: AppliedStatus[];
  /**
   * Manche courante du combat en cours (« Tour N » de l'écran de MJ), dont se déduisent les tours
   * restants des états à durée (PER-305). Le joueur voit ainsi combien de temps il subit encore
   * l'état, exactement comme le MJ — mais sans pouvoir y toucher.
   */
  roundNumber: number;
}

export function ActiveStatusPanel({ statuses, roundNumber }: ActiveStatusPanelProps) {
  // Rien à afficher hors session ou sans état posé (l'appelant ne passe la liste qu'en session).
  if (statuses.length === 0) return null;

  // Cadre et titre suivent le contenu : que du bénéfique (PER-104) ⇒ vert et « Effets en cours » ;
  // dès qu'un état SUBI s'y trouve, on repasse au rouge — c'est lui qui doit sauter aux yeux.
  const onlyBeneficial = statuses.every((s) => isBeneficialStatus(s.id));
  const panelTone = onlyBeneficial ? 'success' : 'error';

  return (
    <Box
      sx={(theme) => ({
        px: 1.5,
        py: 1.25,
        borderRadius: 1,
        border: `1px solid ${alpha(theme.palette[panelTone].main, 0.35)}`,
        bgcolor: alpha(theme.palette[panelTone].main, 0.06),
      })}
    >
      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.25 }}>
        {onlyBeneficial ? 'Effets en cours' : 'États de combat en cours'}
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
        Appliqués par le MJ pendant la session — lecture seule. L’effet chiffré est déjà répercuté
        sur vos stats, vos attaques et vos tests de caractéristique.
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        {statuses.map((s) => {
          const intensity = s.intensity ?? 1;
          const stacked = isStackingStatus(s.id) && intensity > 1;
          const remaining = statusRemainingRounds(s, roundNumber);
          return (
            <Stack key={s.id} direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
              <StatusChipVisual id={s.id} />
              {stacked && (
                <Typography
                  variant="caption"
                  sx={{ fontWeight: 700, color: `${statusTone(s.id)}.light` }}
                >
                  ×{intensity}
                </Typography>
              )}
              {/* Compteur de tours posé par le MJ (PER-305) : à 0, la durée est écoulée mais l'état
                  reste actif tant que le MJ ne l'a pas retiré — on le dit, sans le faire disparaître. */}
              {remaining !== undefined && (
                <Typography
                  variant="caption"
                  sx={{ fontWeight: 700, color: remaining === 0 ? 'warning.light' : 'text.secondary' }}
                >
                  {remaining === 0 ? 'durée écoulée' : `${remaining} tour${remaining > 1 ? 's' : ''}`}
                </Typography>
              )}
            </Stack>
          );
        })}
      </Box>
    </Box>
  );
}
