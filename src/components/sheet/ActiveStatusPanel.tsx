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
 * PER-358 y ajoute le DELTA AGRÉGÉ (« Défense −5 », « Attaques +1 ») et déplace le panneau dans la
 * section « État du personnage », au-dessus de la barre de vie : le joueur vérifie qu'un effet est
 * actif ET ce qu'il change au même endroit qu'il regarde ses PV, sans recouper trois blocs. Le
 * chiffre est lu tel quel dans `StatusSheetImpact` — jamais recalculé —, donc il ne peut pas diverger
 * de la ventilation par source du détail « i ».
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
  statusImpactSummary,
  statusRemainingRounds,
  type AppliedStatus,
  type StatusSheetImpact,
} from '@/lib/character/statusEffects';
import { testDomainById } from '@/data/test-domains';

export interface ActiveStatusPanelProps {
  /** États appliqués au personnage (déjà résolus depuis le store de combat de la session). */
  statuses: AppliedStatus[];
  /**
   * Part CHIFFRÉE de ces mêmes états (PER-358), telle que la fiche l'a déjà calculée pour ses stats
   * dérivées. Absente, le panneau s'en tient aux badges — c'était son seul contenu avant PER-358.
   */
  impact?: StatusSheetImpact | null;
  /**
   * Manche courante du combat en cours (« Tour N » de l'écran de MJ), dont se déduisent les tours
   * restants des états à durée (PER-305). Le joueur voit ainsi combien de temps il subit encore
   * l'état, exactement comme le MJ — mais sans pouvoir y toucher.
   */
  roundNumber: number;
}

export function ActiveStatusPanel({ statuses, impact, roundNumber }: ActiveStatusPanelProps) {
  // Rien à afficher hors session ou sans état posé (l'appelant ne passe la liste qu'en session).
  if (statuses.length === 0) return null;

  // Delta agrégé (PER-358). Un état purement comportemental (« aucune action ») ne produit aucune
  // ligne : le bloc entier disparaît alors, plutôt que d'afficher un cadre vide sous les badges.
  const summary = impact ? statusImpactSummary(impact, (id) => testDomainById.get(id)?.label ?? id) : null;
  const hasSummary = summary !== null && (summary.lines.length > 0 || summary.dice.length > 0);

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

      {/* DELTA AGRÉGÉ (PER-358) : ce que ces états changent, chiffré. Vert pour ce qui aide, rouge
          pour ce qui handicape — la couleur suit le SIGNE, pas la nature de l'état (un buff peut
          coexister avec un malus dans le même panneau). */}
      {hasSummary && (
        <Box sx={{ mt: 1.25, pt: 1, borderTop: 1, borderColor: 'divider' }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
            Effet chiffré, tout compris
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
            {summary.lines.map((line) => (
              <Box
                key={line.label}
                sx={(theme) => {
                  const tone = line.value > 0 ? theme.palette.success : theme.palette.error;
                  return {
                    px: 0.75,
                    py: 0.25,
                    borderRadius: 0.75,
                    border: `1px solid ${alpha(tone.main, 0.45)}`,
                    bgcolor: alpha(tone.main, 0.1),
                    display: 'flex',
                    alignItems: 'baseline',
                    gap: 0.5,
                  };
                }}
              >
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  {line.label}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{ fontWeight: 700, color: line.value > 0 ? 'success.light' : 'error.light' }}
                >
                  {line.value > 0 ? `+${line.value}` : `−${Math.abs(line.value)}`}
                </Typography>
              </Box>
            ))}
            {/* Un dé malus ne s'additionne à rien (« lance 2d20, garde le PIRE ») : il se dit, il ne
                se chiffre pas — d'où sa propre puce, à côté des deltas. */}
            {summary.dice.map((die) => (
              <Box
                key={`${die.scope}:${die.label}`}
                sx={(theme) => ({
                  px: 0.75,
                  py: 0.25,
                  borderRadius: 0.75,
                  border: `1px solid ${alpha(theme.palette.error.main, 0.45)}`,
                  bgcolor: alpha(theme.palette.error.main, 0.1),
                })}
              >
                <Typography variant="caption" sx={{ fontWeight: 700, color: 'error.light' }}>
                  Dé malus
                </Typography>
                <Typography component="span" variant="caption" sx={{ color: 'text.secondary' }}>
                  {die.scope === 'all' ? ' à tous les tests' : ' aux attaques'} ({die.label})
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
      )}
    </Box>
  );
}
