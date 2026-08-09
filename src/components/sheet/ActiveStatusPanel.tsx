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
 *
 * PER-358 déplace le panneau dans la section « État du personnage », au-dessus de la barre de vie :
 * le joueur vérifie qu'un effet est actif là où il regarde ses PV. Le CHIFFRE, lui, n'est pas répété
 * ici — il est déjà mécanisé partout où il compte (stats dérivées, cartes d'attaque, tests), et
 * l'effet verbatim reste en infobulle de la puce.
 *
 * Un buff de groupe (et lui seul) porte une CROIX : le joueur l'écarte de sa propre fiche, librement,
 * sans en référer au MJ (`onWaiveBuff`). Il ne peut pas en faire autant d'un état SUBI — se déclarer
 * non aveuglé n'est pas un choix de joueur.
 */
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import { ClearStatusButton, StatusChipVisual } from '@/components/campaign/CombatStatusPalette';
import { statusLabel, statusTone } from '@/lib/ui/statusPalette';
import {
  isBeneficialStatus,
  isStackingStatus,
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
  /** Buffs écartés, à proposer de reprendre — un renoncement ne doit pas être un cul-de-sac. */
  waivedBuffIds?: readonly BeneficialEffectId[];
  /** Le joueur se ravise : ce buff reprend effet. Requis dès que `waivedBuffIds` n'est pas vide. */
  onRestoreBuff?: (id: BeneficialEffectId) => void;
  /**
   * Manche courante du combat en cours (« Tour N » de l'écran de MJ), dont se déduisent les tours
   * restants des états à durée (PER-305). Le joueur voit ainsi combien de temps il subit encore
   * l'état, exactement comme le MJ — mais sans pouvoir y toucher.
   */
  roundNumber: number;
}

export function ActiveStatusPanel({
  statuses,
  onWaiveBuff,
  waivedBuffIds = [],
  onRestoreBuff,
  roundNumber,
}: ActiveStatusPanelProps) {
  // Rien à afficher hors session, sans état posé et sans buff écarté à reprendre (l'appelant ne
  // passe la liste qu'en session).
  if (statuses.length === 0 && waivedBuffIds.length === 0) return null;

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
        Appliqués par le MJ pendant la session. L’effet chiffré est déjà répercuté sur vos stats, vos
        attaques et vos tests de caractéristique.
        {onWaiveBuff && ' La croix d’un effet bénéfique l’écarte de votre fiche, pour vous seul.'}
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        {statuses.map((s) => {
          const intensity = s.intensity ?? 1;
          const stacked = isStackingStatus(s.id) && intensity > 1;
          const remaining = statusRemainingRounds(s, roundNumber);
          // Croix de renoncement : sur les seuls buffs, et seulement sur SA fiche. Soudée à la puce
          // (coins carrés à la jonction), exactement comme sur la palette du MJ.
          const waivable = onWaiveBuff !== undefined && isBeneficialStatus(s.id);
          return (
            <Stack key={s.id} direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
              {waivable ? (
                <Box sx={{ display: 'flex' }}>
                  <StatusChipVisual id={s.id} squareRight />
                  <ClearStatusButton
                    label={`Écarter ${statusLabel(s.id)} de ta fiche (pour toi seul)`}
                    onClear={() => onWaiveBuff(s.id as BeneficialEffectId)}
                  />
                </Box>
              ) : (
                <StatusChipVisual id={s.id} />
              )}
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

      {/* Buffs ÉCARTÉS (PER-358) : le renoncement doit pouvoir se défaire — sans cette ligne, un
          clic malheureux ne se rattrape qu’en attendant que le MJ relève puis repose l’effet. */}
      {waivedBuffIds.length > 0 && onRestoreBuff && (
        <Box sx={{ mt: 1.25, pt: 1, borderTop: 1, borderColor: 'divider' }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
            Écarté de votre fiche — le reste du groupe en bénéficie toujours.
          </Typography>
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
            {waivedBuffIds.map((id) => (
              <Button
                key={id}
                size="small"
                variant="outlined"
                color="success"
                onClick={() => onRestoreBuff(id)}
              >
                Reprendre {statusLabel(id)}
              </Button>
            ))}
          </Stack>
        </Box>
      )}
    </Box>
  );
}
