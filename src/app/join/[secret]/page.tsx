import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { HomeBackground } from '@/components/HomeBackground';
import { redeemJoinSecret } from '@/lib/auth/joinLink';

/**
 * Landing du lien magique joueur (PER-189). Route **publique** (exclue du gating
 * du proxy, cf. `updateSession`) : un joueur invité arrive ici sans compte
 * propriétaire. L'échange « secret → session joueur scopée » est **délégué** à
 * `redeemJoinSecret` (mécanique livrée en PER-191). Cette page ne fait que router
 * le résultat : redirection vers la fiche du joueur si le secret est valide, ou
 * message clair (en français, sans fuite d'info) sinon.
 */
export const metadata: Metadata = {
  title: 'Invitation — Éditeur de personnage CO2',
};

export default async function JoinPage({
  params,
}: {
  params: Promise<{ secret: string }>;
}) {
  const { secret } = await params;
  const result = await redeemJoinSecret(secret);

  // Secret valide : on rejoint directement la fiche du joueur dans la campagne.
  if (result.status === 'ok') {
    redirect(`/character/${result.characterId}`);
  }

  // Message générique : on ne révèle jamais si un secret existe ou a été révoqué.
  const message =
    result.status === 'invalid'
      ? "Ce lien d'invitation est invalide ou a été révoqué. Demande un nouveau lien à ton MJ."
      : "Les invitations par lien magique ne sont pas encore activées. Reviens bientôt, ou demande à ton MJ.";

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

          <Alert severity={result.status === 'invalid' ? 'error' : 'info'} sx={{ mb: 3 }}>
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
