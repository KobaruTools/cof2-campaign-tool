import type { Metadata } from 'next';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { HomeBackground } from '@/components/HomeBackground';

/**
 * Page d'information des invitations joueur (PER-191). Route **publique**. On y
 * arrive quand la consommation du lien (`/join/[secret]`, route handler) échoue :
 * `?status=invalid` (secret inconnu/révoqué) ou `?status=error` (incident). Un
 * lien valide, lui, ne passe jamais ici : il redirige directement vers `/play`.
 * Les messages restent génériques (aucune fuite sur l'existence d'un secret).
 */
export const metadata: Metadata = {
  title: 'Invitation — Éditeur de personnage CO2',
};

export default async function JoinInfoPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;

  const { severity, message } =
    status === 'invalid'
      ? {
          severity: 'error' as const,
          message:
            "Ce lien d'invitation est invalide ou a été révoqué. Demande un nouveau lien à ton MJ.",
        }
      : status === 'error'
        ? {
            severity: 'error' as const,
            message:
              "Une erreur est survenue à l'ouverture de ta session. Réessaie, ou demande un nouveau lien à ton MJ.",
          }
        : {
            severity: 'info' as const,
            message:
              "Ouvre le lien d'invitation que ton MJ t'a partagé pour rejoindre ta campagne.",
          };

  return (
    <Box sx={{ position: 'relative', minHeight: '100%' }}>
      <HomeBackground />
      <Container maxWidth="xs" sx={{ py: { xs: 6, sm: 10 } }}>
        <Paper
          elevation={0}
          sx={{
            p: { xs: 3, sm: 4 },
            bgcolor: 'rgba(20, 20, 23, 0.72)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: 3,
          }}
        >
          <Stack spacing={1} sx={{ mb: 3, textAlign: 'center' }}>
            <Typography variant="h5" component="h1">
              Invitation
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Éditeur de personnages Chroniques Oubliées Fantasy 2e édition
            </Typography>
          </Stack>

          <Alert severity={severity} sx={{ mb: 3 }}>
            {message}
          </Alert>

          <Button variant="outlined" size="large" fullWidth href="/login">
            Aller à la connexion
          </Button>
        </Paper>
      </Container>
    </Box>
  );
}
