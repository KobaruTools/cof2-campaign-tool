'use client';

import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { TooltipRenderProps } from 'react-joyride';

/**
 * Bulle de tour custom (PER-423) : composants MUI (Paper/Typography/Button) plutôt que le
 * style par défaut de react-joyride, pour suivre le thème clair/sombre de l'app dès ce premier
 * tour (décision de cadrage, pas de « on refera plus tard »).
 */
export function TourTooltip({
  backProps,
  primaryProps,
  skipProps,
  index,
  step,
  tooltipProps,
}: TooltipRenderProps) {
  return (
    <Paper
      {...tooltipProps}
      elevation={24}
      sx={{
        p: 2,
        maxWidth: 360,
        borderRadius: 2,
        border: 1,
        borderColor: 'divider',
      }}
    >
      <Stack spacing={1.25}>
        {step.title && (
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            {step.title}
          </Typography>
        )}
        <Typography variant="body2" color="text.secondary">
          {step.content}
        </Typography>
        <Stack
          direction="row"
          spacing={1}
          sx={{ alignItems: 'center', justifyContent: 'space-between', pt: 0.5 }}
        >
          <Button size="small" color="inherit" {...skipProps} sx={{ textTransform: 'none' }} />
          <Stack direction="row" spacing={1}>
            {index > 0 && (
              <Button size="small" {...backProps} sx={{ textTransform: 'none' }} />
            )}
            <Button
              size="small"
              variant="contained"
              {...primaryProps}
              sx={{ textTransform: 'none' }}
            />
          </Stack>
        </Stack>
      </Stack>
    </Paper>
  );
}
