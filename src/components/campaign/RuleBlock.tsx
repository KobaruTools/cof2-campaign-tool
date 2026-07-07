/**
 * Bloc d'affichage d'une **règle de table** : titre, description, renvoi au livre
 * et contrôle éditable (interrupteur, champ…). Composant de présentation partagé
 * (PER-198) entre la page de réglages (`/campaign/[cid]/settings`) et l'assistant
 * de création de campagne (`/campaigns/new`), pour que les deux surfaces montrent
 * exactement la même chose.
 */
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { SourceRef } from '@/components/SourceRef';

export interface RuleBlockProps {
  title: string;
  description: React.ReactNode;
  /** Page du livre à citer sous la description (cf. `SourceRef`). */
  page?: number | string;
  /** Section/titre de paragraphe à citer avant la page. */
  section?: string;
  /** Contrôle éditable de la règle (interrupteur, champ…). */
  control: React.ReactNode;
}

export function RuleBlock({ title, description, page, section, control }: RuleBlockProps) {
  const hasSource = page != null || section != null;
  return (
    <Box
      sx={{
        p: 2,
        borderRadius: 1.5,
        border: '1px solid rgba(255, 255, 255, 0.08)',
        bgcolor: 'rgba(255, 255, 255, 0.03)',
      }}
    >
      <Stack
        direction="row"
        spacing={2}
        sx={{ alignItems: 'flex-start', justifyContent: 'space-between' }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            {title}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {description}
            {hasSource && (
              <>
                {' '}
                <SourceRef page={page} section={section} />
              </>
            )}
          </Typography>
        </Box>
        <Box sx={{ flexShrink: 0, pt: 0.25 }}>{control}</Box>
      </Stack>
    </Box>
  );
}
