'use client';

/**
 * Liaison d'identité — partie CLIENT (PER-501). La session joueur est un
 * utilisateur ANONYME Supabase portant `app_metadata.player_id`/`campaign_id`
 * (voir `joinLink.ts`) ; ces claims sont posés sur `auth.users.id` et **survivent**
 * à la liaison d'une identité (email ou OAuth) sur ce même utilisateur — c'est le
 * mécanisme documenté par Supabase pour convertir un utilisateur anonyme en
 * utilisateur permanent (`linkIdentity` pour Google/Discord, `updateUser({ email })`
 * pour l'email). `roleOfUser` (cf. `sessionRole.ts`) ne lit QUE `player_id`, jamais
 * `is_anonymous` : le joueur reste donc bien un « joueur » après liaison, juste
 * capable de rouvrir la même identité depuis un autre appareil.
 *
 * Différence volontaire avec `/login` : `closePlayerSessionIfAny` y déconnecte une
 * session joueur AVANT de démarrer une connexion (pour ne pas contaminer un compte
 * MJ) — ici c'est l'inverse recherché : lier SUR la session joueur courante, sans
 * jamais s'en déconnecter.
 */
import { useEffect, useState } from 'react';
import type { UserIdentity } from '@supabase/supabase-js';
import EmailIcon from '@mui/icons-material/Email';
import DevicesIcon from '@mui/icons-material/Devices';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Paper from '@mui/material/Paper';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { ProviderIcon } from '@/components/icons/ProviderIcons';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import { OAUTH_PROVIDERS, type OAuthProviderId } from '@/lib/auth/providers';

const SECTION_SX = {
  p: 2.5,
  bgcolor: 'rgba(20, 20, 23, 0.72)',
  backdropFilter: 'blur(10px)',
  WebkitBackdropFilter: 'blur(10px)',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  borderRadius: 2,
} as const;

/** Libellé lisible d'un provider d'identité (français / marque). */
function providerLabel(provider: string): string {
  const known = OAUTH_PROVIDERS.find((p) => p.id === provider);
  if (known) return known.label;
  if (provider === 'email') return 'Email';
  return provider;
}

function identitySubtitle(identity: UserIdentity): string | undefined {
  const email = (identity.identity_data as { email?: unknown } | undefined)?.email;
  return typeof email === 'string' ? email : undefined;
}

type Busy = { kind: 'idle' } | { kind: 'oauth'; provider: OAuthProviderId } | { kind: 'email' };

export function PlayerAccountLinking() {
  const [loading, setLoading] = useState(true);
  const [identities, setIdentities] = useState<UserIdentity[]>([]);
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState<Busy>({ kind: 'idle' });
  const [error, setError] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const supabase = createBrowserSupabaseClient();
    void supabase.auth.getUserIdentities().then(({ data }) => {
      if (cancelled) return;
      setIdentities(data?.identities ?? []);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const linkedProviders = new Set(identities.map((i) => i.provider));
  const callbackUrl =
    typeof window === 'undefined'
      ? ''
      : `${window.location.origin}/auth/callback?next=/play/account`;

  async function linkProvider(provider: OAuthProviderId) {
    setError(null);
    setBusy({ kind: 'oauth', provider });
    try {
      const supabase = createBrowserSupabaseClient();
      const meta = OAUTH_PROVIDERS.find((p) => p.id === provider);
      const { error: err } = await supabase.auth.linkIdentity({
        provider,
        options: {
          redirectTo: callbackUrl,
          ...(meta?.authQueryParams ? { queryParams: meta.authQueryParams } : {}),
        },
      });
      if (err) throw err;
      // Succès : le navigateur part chez le provider (pas de retour ici).
    } catch {
      setError('La liaison a échoué. Réessaie dans un instant.');
      setBusy({ kind: 'idle' });
    }
  }

  async function linkEmail(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy({ kind: 'email' });
    try {
      const supabase = createBrowserSupabaseClient();
      const { error: err } = await supabase.auth.updateUser(
        { email: email.trim() },
        { emailRedirectTo: callbackUrl },
      );
      if (err) throw err;
      setEmailSent(true);
    } catch {
      setError("L'envoi du lien a échoué. Vérifie l'adresse et réessaie.");
    } finally {
      setBusy({ kind: 'idle' });
    }
  }

  return (
    <Stack spacing={3}>
      <Stack spacing={1}>
        <Typography variant="h5" component="h1">
          Lier mon identité
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Optionnel : lie un email ou un compte Google/Discord pour retrouver tes
          campagnes et tes personnages en te reconnectant depuis un autre appareil,
          sans dépendre du lien magique de ton MJ. Si tu ne lies rien, tout continue
          de fonctionner comme aujourd’hui.
        </Typography>
      </Stack>

      {error && (
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Paper elevation={0} sx={SECTION_SX}>
        <Typography variant="subtitle1" sx={{ mb: 1.5 }}>
          Identités liées
        </Typography>
        {loading ? (
          <Stack spacing={1.5}>
            <Skeleton animation="wave" variant="rounded" height={40} />
          </Stack>
        ) : identities.length === 0 ? (
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', color: 'text.secondary' }}>
            <DevicesIcon fontSize="small" />
            <Typography variant="body2">Aucune identité liée pour l’instant.</Typography>
          </Stack>
        ) : (
          <List dense disablePadding>
            {identities.map((identity) => (
              <ListItem key={identity.identity_id} disableGutters>
                <ListItemIcon sx={{ minWidth: 36 }}>
                  {identity.provider === 'google' || identity.provider === 'discord' ? (
                    <ProviderIcon id={identity.provider} sx={{ color: '#fff', fontSize: 20 }} />
                  ) : (
                    <EmailIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                  )}
                </ListItemIcon>
                <ListItemText
                  primary={providerLabel(identity.provider)}
                  secondary={identitySubtitle(identity)}
                />
              </ListItem>
            ))}
          </List>
        )}
      </Paper>

      <Paper elevation={0} sx={SECTION_SX}>
        <Typography variant="subtitle1" sx={{ mb: 1.5 }}>
          Lier un compte
        </Typography>
        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', mb: 2 }}>
          {OAUTH_PROVIDERS.filter((p) => !linkedProviders.has(p.id)).map((p) => (
            <Button
              key={p.id}
              size="small"
              variant="outlined"
              startIcon={<ProviderIcon id={p.id} sx={{ color: '#fff', fontSize: 18 }} />}
              disabled={busy.kind !== 'idle'}
              onClick={() => void linkProvider(p.id)}
            >
              Lier {p.label}
            </Button>
          ))}
        </Stack>

        <Divider sx={{ mb: 2 }} />

        {emailSent ? (
          <Alert severity="success">
            Un lien de confirmation a été envoyé à {email.trim()}. Ouvre-le pour
            finaliser la liaison.
          </Alert>
        ) : (
          <Box component="form" onSubmit={(e) => void linkEmail(e)}>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'flex-start' }}>
              <TextField
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                fullWidth
                size="small"
                required
                disabled={busy.kind !== 'idle'}
              />
              <Button
                type="submit"
                variant="contained"
                disabled={busy.kind !== 'idle' || !email.trim()}
                sx={{ mt: 0.5, flexShrink: 0 }}
              >
                Envoyer
              </Button>
            </Stack>
          </Box>
        )}
      </Paper>
    </Stack>
  );
}
