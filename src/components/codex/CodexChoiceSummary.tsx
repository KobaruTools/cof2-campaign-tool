'use client';

/**
 * Résumé EXHAUSTIF d'un choix de capacité, affiché sous la carte de rang du Codex (PER-418) —
 * il n'y a pas de personnage pour résoudre un choix, donc on énumère ce qui est statique
 * (`summarizeCodexChoice`) plutôt que de proposer un sélecteur inerte. Les capacités
 * empruntables (`feature-from-path`) sont des liens CLIQUABLES vers leur voie d'origine dans
 * le Codex — contrairement à la fiche personnage, où `BorrowedFeatureBlock` n'affiche que le
 * `borrowedNote` en texte statique (pas de personnage réel à qui proposer la navigation).
 */
import NextLink from 'next/link';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import type { Feature, FeatureChoice, Path } from '@/data/schema';
import { summarizeCodexChoice } from '@/lib/codex/codexChoiceSummary';
import { codexPathHref } from '@/lib/ui/codex';
import { ANCESTRY_MARKER_COLOR, classColor } from '@/lib/ui/classColors';
import { ClassIcon } from '@/components/ClassIcon';
import { useFeatureNameDecliner } from '@/components/sheet/FeatureDeclension';

/** Couleur du profil d'une voie empruntable (PER-419 retours) : `classColor` de son premier
 * profil pour une voie de profil (le seul cas produit par `staticFeaturesForChoiceDomain`),
 * repli neutre sinon (défensif, pas censé arriver). */
function borrowablePathColor(path: Path): string {
  return path.type === 'class' ? classColor(path.classIds[0]) : ANCESTRY_MARKER_COLOR;
}

const boxSx = {
  mt: 1.5,
  p: 1.5,
  borderRadius: 1.5,
  border: '1px solid rgba(255, 255, 255, 0.12)',
  bgcolor: 'rgba(255, 255, 255, 0.03)',
} as const;

function CodexChoiceBlock({ hostFeature, choice }: { hostFeature: Feature; choice: FeatureChoice }) {
  const summary = summarizeCodexChoice(hostFeature.id, choice);
  // Nom décliné (PER-454) : une capacité empruntable listée ici peut elle-même porter des tokens
  // de déclinaison (ex. voie de l'élémentaliste) — repli imprimé, comme le reste du Codex.
  const declineFeatureName = useFeatureNameDecliner();
  return (
    <Box sx={boxSx}>
      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
        {summary.prompt}
      </Typography>
      {summary.note ? (
        <Typography variant="caption" color="text.secondary" component="div" sx={{ mb: 0.5 }}>
          {summary.note}
        </Typography>
      ) : null}

      {summary.items ? (
        <Stack direction="row" sx={{ mt: 0.75, flexWrap: 'wrap', gap: 0.75 }}>
          {summary.items.map((label) => (
            <Chip key={label} label={label} size="small" variant="outlined" />
          ))}
        </Stack>
      ) : null}

      {summary.borrowable ? (
        summary.borrowable.length > 0 ? (
          <Box
            sx={{
              mt: 1,
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
              gap: 1,
            }}
          >
            {summary.borrowable.map(({ feature, path }) => {
              const color = borrowablePathColor(path);
              return (
                <Box
                  key={feature.id}
                  component={NextLink}
                  href={codexPathHref(path.id)}
                  sx={{
                    display: 'block',
                    minWidth: 0,
                    textDecoration: 'none',
                    color: 'inherit',
                    p: 1,
                    borderRadius: 1,
                    border: `1px solid ${alpha(color, 0.5)}`,
                    '&:hover': { bgcolor: alpha(color, 0.12) },
                  }}
                >
                  <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                    <Box
                      component="span"
                      sx={{
                        px: 0.75,
                        py: 0.1,
                        borderRadius: 0.75,
                        border: `1px solid ${color}`,
                        bgcolor: alpha(color, 0.14),
                        color,
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        lineHeight: 1.6,
                        flexShrink: 0,
                      }}
                    >
                      Rang {feature.rank}
                    </Box>
                    {path.type === 'class' && <ClassIcon classId={path.classIds[0]} size={16} color={color} />}
                    <Typography variant="caption" sx={{ color, fontWeight: 600 }}>
                      {path.name}
                    </Typography>
                  </Stack>
                  <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.5 }}>
                    {declineFeatureName(feature)}
                  </Typography>
                </Box>
              );
            })}
          </Box>
        ) : (
          <Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 0.5 }}>
            Aucune capacité éligible dans le contenu chargé.
          </Typography>
        )
      ) : null}

      {summary.unresolvedNote ? (
        <Typography
          variant="caption"
          color="text.secondary"
          component="div"
          sx={{ mt: 0.5, fontStyle: 'italic' }}
        >
          {summary.unresolvedNote}
        </Typography>
      ) : null}
    </Box>
  );
}

/** Résume TOUS les choix d'une capacité (rien rendu si `feature.choices` est absent/vide). */
export function CodexFeatureChoices({ feature }: { feature: Feature }) {
  if (!feature.choices?.length) return null;
  return (
    <>
      {feature.choices.map((choice, i) => (
        <CodexChoiceBlock key={i} hostFeature={feature} choice={choice} />
      ))}
    </>
  );
}
