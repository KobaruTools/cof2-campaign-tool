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
import type { Feature, FeatureChoice } from '@/data/schema';
import { summarizeCodexChoice } from '@/lib/codex/codexChoiceSummary';
import { codexPathHref } from '@/lib/ui/codex';
import { PageRefText } from '@/components/SourceRef';

const boxSx = {
  mt: 1.5,
  p: 1.5,
  borderRadius: 1.5,
  border: '1px solid rgba(255, 255, 255, 0.12)',
  bgcolor: 'rgba(255, 255, 255, 0.03)',
} as const;

function CodexChoiceBlock({ hostFeature, choice }: { hostFeature: Feature; choice: FeatureChoice }) {
  const summary = summarizeCodexChoice(hostFeature.id, choice);
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
          <Stack spacing={1} sx={{ mt: 1 }}>
            {summary.borrowable.map(({ feature, path }) => (
              <Box
                key={feature.id}
                component={NextLink}
                href={codexPathHref(path.id)}
                sx={(theme) => ({
                  display: 'block',
                  textDecoration: 'none',
                  color: 'inherit',
                  p: 1,
                  borderRadius: 1,
                  border: `1px solid ${alpha(theme.palette.info.main, 0.25)}`,
                  '&:hover': { bgcolor: alpha(theme.palette.info.main, 0.08) },
                })}
              >
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {feature.name}{' '}
                  <Typography component="span" variant="caption" color="text.secondary">
                    — {path.name} (rang {feature.rank})
                  </Typography>
                </Typography>
                {path.borrowedNote ? (
                  <Typography variant="caption" color="text.secondary" component="div">
                    <PageRefText>{path.borrowedNote}</PageRefText>
                  </Typography>
                ) : null}
              </Box>
            ))}
          </Stack>
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
