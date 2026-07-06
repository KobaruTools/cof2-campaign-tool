import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Container from '@mui/material/Container';
import Divider from '@mui/material/Divider';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { HomeBackground } from '@/components/HomeBackground';
import { createServerSupabaseClient } from '@/lib/supabase/server';

/**
 * Espace JOUEUR (PER-191). Server Component scopé par la **session joueur**
 * (utilisateur anonyme portant `app_metadata.player_id`/`campaign_id`) : toutes
 * les requêtes ci-dessous sont filtrées par la RLS joueur (migration 0002), on
 * n'ajoute donc pas de `where` de tenancy côté code.
 *
 * On y arrive après consommation du lien magique (`/join/[secret]`). Le proxy
 * confine la session joueur à cet espace (+ `/character/*`). Contenu : nom de la
 * campagne + roster (lecture seule). Les **fiches** sont encore locales
 * (localStorage) : l'édition en ligne arrivera avec la persistance cloud des
 * personnages (PER-192) — d'ici là la section reste un jalon.
 */
export const metadata: Metadata = {
  title: 'Ma campagne — Éditeur de personnage CO2',
};

export default async function PlayPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Sécurité de surface : sans claim joueur, cette page n'a pas de sens (le proxy
  // renvoie normalement le MJ vers `/`). On garde le garde-fou local.
  const playerId = (user?.app_metadata as { player_id?: string } | undefined)?.player_id;
  if (!playerId) {
    redirect('/');
  }

  // RLS joueur : `campaigns` ne renvoie que SA campagne, `players` que son roster.
  const [{ data: campaigns }, { data: roster }] = await Promise.all([
    supabase.from('campaigns').select('id, name, description').limit(1),
    supabase.from('players').select('id, name').order('name', { ascending: true }),
  ]);
  const campaign = campaigns?.[0];

  return (
    <Box sx={{ position: 'relative', minHeight: '100%' }}>
      <HomeBackground />
      <Container maxWidth="sm" sx={{ py: { xs: 4, sm: 6 } }}>
        <Stack spacing={1} sx={{ mb: 3 }}>
          <Typography variant="overline" color="text.secondary">
            Espace joueur
          </Typography>
          <Typography variant="h4" component="h1">
            {campaign?.name ?? 'Ma campagne'}
          </Typography>
          {campaign?.description ? (
            <Typography variant="body2" color="text.secondary">
              {campaign.description}
            </Typography>
          ) : null}
        </Stack>

        <Paper
          elevation={0}
          sx={{
            p: { xs: 2.5, sm: 3 },
            mb: 3,
            bgcolor: 'rgba(20, 20, 23, 0.72)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: 3,
          }}
        >
          <Typography variant="h6" sx={{ mb: 1 }}>
            Le roster
          </Typography>
          <Divider sx={{ mb: 1 }} />
          <List dense disablePadding>
            {(roster ?? []).map((p) => (
              <ListItem key={p.id} disableGutters>
                <ListItemText primary={p.name} />
                {p.id === playerId ? (
                  <Chip size="small" label="toi" color="primary" variant="outlined" />
                ) : null}
              </ListItem>
            ))}
          </List>
        </Paper>

        <Paper
          elevation={0}
          sx={{
            p: { xs: 2.5, sm: 3 },
            bgcolor: 'rgba(20, 20, 23, 0.55)',
            border: '1px dashed rgba(255, 255, 255, 0.14)',
            borderRadius: 3,
          }}
        >
          <Typography variant="h6" sx={{ mb: 1 }}>
            Ta fiche
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Ton invitation est bien active : tu as rejoint la campagne. La création et
            l&apos;édition de ta fiche directement ici sont en cours de développement. En
            attendant, ton MJ prépare et conserve les personnages — dis-lui que tu es connecté.
          </Typography>
        </Paper>
      </Container>
    </Box>
  );
}
