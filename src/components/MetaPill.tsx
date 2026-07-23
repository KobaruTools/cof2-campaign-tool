'use client';

/**
 * Pastille « méta » partagée (PER-175) — petit tag arrondi neutre servant à afficher une
 * métadonnée de créature (NC, taille, nature). Extrait du bloc de stats du bestiaire pour être
 * réutilisé par la mini-fiche de compagnon (`CreatureStatBlock` / section « Compagnons »), afin
 * que les deux partagent le même « système de tag ». Optionnellement un `label` en gras devant
 * la valeur (ex. « NC 3 »).
 */
import Box from '@mui/material/Box';
import { alpha } from '@mui/material/styles';
import type { ReactNode } from 'react';

export function MetaPill({ label, children }: { label?: string; children: ReactNode }) {
  return (
    <Box
      component="span"
      sx={(theme) => ({
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.5,
        px: 0.75,
        py: 0.25,
        borderRadius: 1,
        lineHeight: 1,
        fontSize: '0.75rem',
        fontVariantNumeric: 'tabular-nums',
        whiteSpace: 'nowrap',
        color: 'text.secondary',
        bgcolor: alpha(theme.palette.text.primary, 0.06),
        border: `1px solid ${alpha(theme.palette.text.primary, 0.12)}`,
      })}
    >
      {label && (
        <Box component="span" sx={{ fontWeight: 700, color: 'text.primary', letterSpacing: 0.3 }}>
          {label}
        </Box>
      )}
      {children}
    </Box>
  );
}
