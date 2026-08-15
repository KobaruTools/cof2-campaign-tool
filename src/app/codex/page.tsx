'use client';

/**
 * Page d'INDEX du Codex (PER-418) — bibliothèque de règles consultable en LECTURE SEULE, SANS
 * personnage, publique (accessible sans connexion, comme `/reference`). Sur le modèle de
 * `src/app/reference/page.tsx` : ossature seule ici, le comportement vit dans un composant dédié.
 *
 * Sous-page fonctionnelle à ce jour : Voies. Les autres (objets magiques, dieux, familiers/
 * montures, équipement — PER-419→422) apparaissent en entrées désactivées « à venir », sans
 * route propre pour l'instant.
 */
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import NextLink from 'next/link';
import { HomeBackground } from '@/components/HomeBackground';
import { SectionIcon } from '@/components/SectionIcon';
import { useHeaderContent } from '@/stores/headerContent';

const ENTRIES: { label: string; href?: string }[] = [
  { label: 'Voies', href: '/codex/voies' },
  { label: 'Objets magiques' },
  { label: 'Dieux' },
  { label: 'Familiers & montures' },
  { label: 'Équipement' },
];

export default function CodexPage() {
  useHeaderContent({ breadcrumbs: [{ label: 'Codex' }] });
  return (
    <Box sx={{ position: 'relative', minHeight: '100%' }}>
      <title>Codex — Éditeur de personnage CO2</title>
      <HomeBackground />
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 700, mb: 1 }}>
          Codex
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          Le référentiel de règles CO2, consultable sans personnage.
        </Typography>
        <Stack spacing={1}>
          {ENTRIES.map((entry) => (
            <Box
              key={entry.label}
              component={entry.href ? NextLink : 'div'}
              href={entry.href}
              sx={(theme) => ({
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                p: 2,
                borderRadius: 2,
                border: '1px solid rgba(255, 255, 255, 0.10)',
                bgcolor: 'rgba(0, 0, 0, 0.35)',
                textDecoration: 'none',
                color: entry.href ? 'text.primary' : 'text.disabled',
                ...(entry.href
                  ? { '&:hover': { bgcolor: alpha(theme.palette.info.main, 0.08) } }
                  : { cursor: 'default' }),
              })}
            >
              <SectionIcon name="paths" size={22} />
              <Typography sx={{ fontWeight: 600 }}>{entry.label}</Typography>
              {!entry.href && (
                <Typography variant="caption" color="text.disabled" sx={{ ml: 'auto' }}>
                  À venir
                </Typography>
              )}
            </Box>
          ))}
        </Stack>
      </Container>
    </Box>
  );
}
