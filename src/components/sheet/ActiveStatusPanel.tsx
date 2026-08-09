'use client';

/**
 * Rappel visuel des ÉTATS DE COMBAT appliqués au personnage (PER-281, tranche 5 de PER-276), sur sa
 * fiche. Le MJ est seul à les appliquer (RLS `campaign_combat`) ; le joueur voit et subit. N'apparaît
 * QUE quand une session est active et qu'au moins un état est posé — les effets chiffrés
 * (DEF/Init./attaques) sont, eux, déjà repliés dans les stats dérivées de la fiche.
 *
 * Réutilise la puce d'état de l'écran de MJ (`StatusChipVisual`, badge custom teinté + effet VERBATIM
 * en info-bulle avec renvoi de page) pour un langage visuel identique des deux côtés de la table.
 *
 * RIEN AUTOUR DES PUCES (PER-358) : ni cadre, ni titre, ni intensité « ×N ». Le cadre répétait ce que
 * les puces disent déjà, et l'intensité d'un buff de groupe compte les CIBLES du sort, pas ce que le
 * personnage encaisse — un « ×3 » sur Argument de taille ne veut rien dire pour le joueur qui le lit
 * sur sa propre fiche. Reste ce qui le concerne lui : quels effets le touchent, et pour combien de
 * tours (PER-305).
 *
 * Un buff de groupe (et lui seul) porte une CROIX : le joueur l'écarte de sa propre fiche, librement,
 * sans en référer au MJ (`onWaiveBuff`). Il ne peut pas en faire autant d'un état SUBI — se déclarer
 * non aveuglé n'est pas un choix de joueur. Le geste est SANS RETOUR côté fiche : le joueur qui se
 * ravise demande au MJ de reposer l'effet, comme pour tout le reste de l'état de combat.
 */
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { ClearStatusButton, StatusChipVisual } from '@/components/campaign/CombatStatusPalette';
import { statusLabel } from '@/lib/ui/statusPalette';
import {
  isBeneficialStatus,
  statusRemainingRounds,
  type AppliedStatus,
} from '@/lib/character/statusEffects';
import type { BeneficialEffectId } from '@/data/schema';

export interface ActiveStatusPanelProps {
  /** États appliqués au personnage (déjà résolus depuis le store de combat de la session). */
  statuses: AppliedStatus[];
  /**
   * Le joueur écarte ce buff de SA fiche (PER-358). Absent = aucune croix : c'est le cas sur la fiche
   * vue par le MJ ou par un tiers, où le renoncement ne serait le choix de personne.
   */
  onWaiveBuff?: (id: BeneficialEffectId) => void;
  /**
   * Manche courante du combat en cours (« Tour N » de l'écran de MJ), dont se déduisent les tours
   * restants des états à durée (PER-305). Le joueur voit ainsi combien de temps il subit encore
   * l'état, exactement comme le MJ — mais sans pouvoir y toucher.
   */
  roundNumber: number;
}

export function ActiveStatusPanel({ statuses, onWaiveBuff, roundNumber }: ActiveStatusPanelProps) {
  // Rien à afficher hors session ni sans état posé (l'appelant ne passe la liste qu'en session).
  if (statuses.length === 0) return null;

  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        {statuses.map((s) => {
          const remaining = statusRemainingRounds(s, roundNumber);
          // Croix de renoncement : sur les seuls buffs, et seulement sur SA fiche. Soudée à la puce
          // (coins carrés à la jonction), exactement comme sur la palette du MJ.
          const waivable = onWaiveBuff !== undefined && isBeneficialStatus(s.id);
          return (
            <Stack key={s.id} direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
              {waivable ? (
                <Box sx={{ display: 'flex' }}>
                  <StatusChipVisual id={s.id} squareRight castBy={s.castBy} />
                  <ClearStatusButton
                    label={`Écarter ${statusLabel(s.id)} de ta fiche (pour toi seul)`}
                    onClear={() => onWaiveBuff(s.id as BeneficialEffectId)}
                  />
                </Box>
              ) : (
                <StatusChipVisual id={s.id} castBy={s.castBy} />
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
  );
}
