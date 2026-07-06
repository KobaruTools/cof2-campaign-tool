'use client';

/**
 * Écran de connexion (PER-188). Inscription OUVERTE, sans mot de passe :
 * - OAuth Google / Discord (liaison auto par email vérifié côté Supabase) ;
 * - magic-link email en repli (sans tiers).
 * Un indice `localStorage` met en avant la dernière méthode utilisée (non-autoritatif).
 *
 * Le gating des routes (rediriger un visiteur non authentifié vers ici) est livré
 * en PER-189 ; cette page ne fait que déclencher les flux d'authentification.
 */
import { useEffect, useMemo, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Container from '@mui/material/Container';
import Divider from '@mui/material/Divider';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { HomeBackground } from '@/components/HomeBackground';
import { ProviderIcon } from '@/components/icons/ProviderIcons';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import { OAUTH_PROVIDERS, type OAuthProviderId } from '@/lib/auth/providers';
import {
  readLastAuthMethod,
  rememberLastAuthMethod,
  type LastAuthMethod,
} from '@/lib/auth/lastMethod';

const IS_CONFIGURED = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
);

type Busy = { kind: 'idle' } | { kind: 'oauth'; provider: OAuthProviderId } | { kind: 'magic' };

export default function LoginPage() {
  const [lastMethod, setLastMethod] = useState<LastAuthMethod | null>(null);
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState<Busy>({ kind: 'idle' });
  const [error, setError] = useState<string | null>(null);
  const [magicSent, setMagicSent] = useState(false);
  // Destination post-connexion transmise par le gating du proxy (PER-189).
  const [nextPath, setNextPath] = useState('/');

  // Indice « dernière méthode » + erreur éventuelle renvoyée par le callback +
  // destination `next`, lus côté client uniquement (évite un besoin de Suspense
  // pour useSearchParams). Ces valeurs (localStorage, URL) ne sont PAS connues au
  // rendu serveur : on les pose **après montage** pour ne pas provoquer de décalage
  // d'hydratation — d'où le setState en effet, ici volontaire.
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    setLastMethod(readLastAuthMethod());
    const params = new URLSearchParams(window.location.search);
    if (params.get('error')) {
      setError('La connexion a échoué. Réessaie ou choisis une autre méthode.');
    }
    // `next` doit rester un chemin interne (pas d'open redirect).
    const requested = params.get('next');
    if (requested && requested.startsWith('/')) {
      setNextPath(requested);
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  // Callback commun OAuth/magic-link, portant la destination post-connexion.
  const callbackUrl = useMemo(
    () =>
      typeof window === 'undefined'
        ? ''
        : `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
    [nextPath],
  );

  async function signInWithProvider(provider: OAuthProviderId) {
    setError(null);
    setBusy({ kind: 'oauth', provider });
    try {
      const supabase = createBrowserSupabaseClient();
      rememberLastAuthMethod(provider);
      const { error: err } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: callbackUrl },
      });
      if (err) throw err;
      // Succès : le navigateur part chez le provider (pas de retour ici).
    } catch {
      setError("Impossible de démarrer la connexion. Réessaie dans un instant.");
      setBusy({ kind: 'idle' });
    }
  }

  async function sendMagicLink(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy({ kind: 'magic' });
    try {
      const supabase = createBrowserSupabaseClient();
      const { error: err } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { emailRedirectTo: callbackUrl },
      });
      if (err) throw err;
      rememberLastAuthMethod('magic-link');
      setMagicSent(true);
    } catch {
      setError("L'envoi du lien a échoué. Vérifie l'adresse et réessaie.");
    } finally {
      setBusy({ kind: 'idle' });
    }
  }

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
              Connexion
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Éditeur de personnages Chroniques Oubliées Fantasy 2e édition
            </Typography>
          </Stack>

          {!IS_CONFIGURED && (
            <Alert severity="info" sx={{ mb: 3 }}>
              L’authentification n’est pas encore configurée sur ce serveur (projet
              Supabase à provisionner).
            </Alert>
          )}

          {error && (
            <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {magicSent ? (
            <Alert severity="success">
              Un lien de connexion vient d’être envoyé à <strong>{email.trim()}</strong>.
              Ouvre-le sur cet appareil pour te connecter.
            </Alert>
          ) : (
            <>
              <Stack spacing={1.5}>
                {OAUTH_PROVIDERS.map((p) => {
                  const isBusy = busy.kind === 'oauth' && busy.provider === p.id;
                  const isLast = lastMethod === p.id;
                  return (
                    <Box key={p.id}>
                      <Button
                        fullWidth
                        variant="outlined"
                        size="large"
                        disabled={!IS_CONFIGURED || busy.kind !== 'idle'}
                        onClick={() => signInWithProvider(p.id)}
                        startIcon={
                          isBusy ? (
                            <CircularProgress size={18} color="inherit" />
                          ) : (
                            <ProviderIcon id={p.id} sx={{ color: '#fff', fontSize: 20 }} />
                          )
                        }
                        sx={{
                          justifyContent: 'flex-start',
                          // Fond transparent, bordure à la couleur de marque du provider.
                          bgcolor: 'transparent',
                          color: 'text.primary',
                          borderColor: p.brand,
                          '&:hover': { borderColor: p.brand, bgcolor: `${p.brand}1f` },
                          // Coins bas carrés quand le bandeau « dernière fois » est collé dessous.
                          ...(isLast
                            ? { borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }
                            : {}),
                        }}
                      >
                        {p.label}
                      </Button>
                      {isLast && (
                        // Mini-bandeau collé sous le bouton (coins bas arrondis), pour ne pas
                        // encombrer le bouton horizontalement.
                        <Box
                          sx={{
                            bgcolor: p.brand,
                            color: '#fff',
                            textAlign: 'center',
                            py: 0.25,
                            // Même rayon que le bouton, uniquement en bas (coins collés en haut).
                            borderBottomLeftRadius: (theme) => theme.shape.borderRadius,
                            borderBottomRightRadius: (theme) => theme.shape.borderRadius,
                          }}
                        >
                          <Typography component="span" variant="caption" sx={{ fontWeight: 700 }}>
                            Utilisé à la dernière connexion
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  );
                })}
              </Stack>

              <Divider sx={{ my: 3 }}>ou</Divider>

              <Box component="form" onSubmit={sendMagicLink}>
                <Stack spacing={1.5}>
                  <TextField
                    type="email"
                    label="Adresse email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    fullWidth
                    disabled={!IS_CONFIGURED || busy.kind !== 'idle'}
                    autoComplete="email"
                    helperText={
                      lastMethod === 'magic-link'
                        ? 'Dernière méthode utilisée : lien magique.'
                        : undefined
                    }
                  />
                  <Button
                    type="submit"
                    variant={lastMethod === 'magic-link' ? 'contained' : 'outlined'}
                    size="large"
                    disabled={!IS_CONFIGURED || busy.kind !== 'idle' || email.trim() === ''}
                    startIcon={
                      busy.kind === 'magic' ? <CircularProgress size={18} color="inherit" /> : undefined
                    }
                  >
                    Recevoir un lien de connexion
                  </Button>
                </Stack>
              </Box>
            </>
          )}
        </Paper>
      </Container>
    </Box>
  );
}
