'use client';

/**
 * Page de **gestion de compte** (PER-194) — 3ᵉ pilier de la milestone « Fondations ».
 * Version minimale mais complète : nom d'affichage, identités liées (lier/délier),
 * déconnexion, et suppression de compte en cascade avec confirmation forte.
 *
 * Réservée au propriétaire connecté : le gating du proxy (PER-189/191) renvoie les
 * visiteurs non authentifiés vers `/login` et les sessions joueur vers `/play`.
 *
 * ⚠️ La **liaison d'un nouveau provider** (`linkIdentity`) exige l'option
 * « Manual linking » activée dans le projet Supabase — sinon l'appel échoue. La
 * liaison **automatique** par email vérifié (PER-188) reste, elle, toujours active.
 */
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { User, UserIdentity } from '@supabase/supabase-js';
import EmailIcon from '@mui/icons-material/Email';
import LinkOffIcon from '@mui/icons-material/LinkOff';
import LogoutIcon from '@mui/icons-material/Logout';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Container from '@mui/material/Container';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Paper from '@mui/material/Paper';
import Snackbar from '@mui/material/Snackbar';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { AppHeader } from '@/components/AppHeader';
import { HomeBackground } from '@/components/HomeBackground';
import { ProviderIcon } from '@/components/icons/ProviderIcons';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import { OAUTH_PROVIDERS } from '@/lib/auth/providers';
import { deleteAccount } from './actions';

const IS_CONFIGURED = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
);

/** Libellé du mot à retaper pour confirmer la suppression (confirmation forte). */
const DELETE_CONFIRM_WORD = 'SUPPRIMER';

/** Libellé lisible d'un provider d'identité (français / marque). */
function providerLabel(provider: string): string {
  const known = OAUTH_PROVIDERS.find((p) => p.id === provider);
  if (known) return known.label;
  if (provider === 'email') return 'Lien magique (email)';
  return provider;
}

/** Sous-titre d'une identité : l'email rattaché s'il est connu. */
function identitySubtitle(identity: UserIdentity): string | undefined {
  const email = (identity.identity_data as { email?: unknown } | undefined)?.email;
  return typeof email === 'string' ? email : undefined;
}

export default function AccountPage() {
  const router = useRouter();

  // Initial : chargement uniquement si Supabase est configuré (sinon rien à charger,
  // et pas de setState synchrone en effet — cf. react-hooks/set-state-in-effect).
  const [loading, setLoading] = useState(IS_CONFIGURED);
  const [user, setUser] = useState<User | null>(null);
  const [identities, setIdentities] = useState<UserIdentity[]>([]);
  const [displayName, setDisplayName] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [busyProvider, setBusyProvider] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; severity: 'success' | 'error' } | null>(
    null,
  );

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleting, setDeleting] = useState(false);

  const notify = (message: string, severity: 'success' | 'error' = 'success') =>
    setToast({ message, severity });

  // Charge l'utilisateur + ses identités (asynchrone → pas de setState synchrone en effet).
  useEffect(() => {
    if (!IS_CONFIGURED) return;
    let cancelled = false;
    const supabase = createBrowserSupabaseClient();
    void (async () => {
      const [{ data: userData }, { data: idData }] = await Promise.all([
        supabase.auth.getUser(),
        supabase.auth.getUserIdentities(),
      ]);
      if (cancelled) return;
      setUser(userData.user);
      setIdentities(idData?.identities ?? []);
      const raw = (userData.user?.user_metadata as { display_name?: unknown } | undefined)
        ?.display_name;
      setDisplayName(typeof raw === 'string' ? raw : '');
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function saveDisplayName() {
    setSavingName(true);
    try {
      const supabase = createBrowserSupabaseClient();
      const { error } = await supabase.auth.updateUser({
        data: { display_name: displayName.trim() },
      });
      if (error) throw error;
      notify("Nom d'affichage enregistré.");
    } catch {
      notify("Impossible d'enregistrer le nom. Réessaie.", 'error');
    } finally {
      setSavingName(false);
    }
  }

  async function linkProvider(provider: 'google' | 'discord') {
    setBusyProvider(provider);
    try {
      const supabase = createBrowserSupabaseClient();
      const meta = OAUTH_PROVIDERS.find((p) => p.id === provider);
      const { error } = await supabase.auth.linkIdentity({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=/account`,
          // Discord : prompt=none, cohérent avec l'écran de connexion.
          ...(meta?.authQueryParams ? { queryParams: meta.authQueryParams } : {}),
        },
      });
      if (error) throw error;
      // Succès : le navigateur part vers le provider (pas de retour ici).
    } catch {
      notify(
        'La liaison a échoué. La liaison manuelle doit être activée côté serveur.',
        'error',
      );
      setBusyProvider(null);
    }
  }

  async function unlinkProvider(identity: UserIdentity) {
    setBusyProvider(identity.identity_id);
    try {
      const supabase = createBrowserSupabaseClient();
      const { error } = await supabase.auth.unlinkIdentity(identity);
      if (error) throw error;
      setIdentities((prev) => prev.filter((i) => i.identity_id !== identity.identity_id));
      notify('Identité déliée.');
    } catch {
      notify('Impossible de délier cette identité.', 'error');
    } finally {
      setBusyProvider(null);
    }
  }

  async function signOut() {
    await fetch('/auth/signout', { method: 'POST' });
    window.location.href = '/login';
  }

  async function confirmDelete() {
    setDeleting(true);
    try {
      await deleteAccount();
      // Compte parti : on purge le cache localStorage (persos en staging + brouillon
      // wizard) pour ne laisser aucun blob cloud périmé, puis on repart à zéro.
      localStorage.removeItem('cof2-characters');
      localStorage.removeItem('cof2-wizard-draft');
      window.location.href = '/login';
    } catch {
      notify('La suppression a échoué. Réessaie.', 'error');
      setDeleting(false);
    }
  }

  const linkedProviders = new Set(identities.map((i) => i.provider));
  const canUnlink = identities.length > 1;

  return (
    <Box sx={{ position: 'relative', minHeight: '100%' }}>
      <HomeBackground />
      <AppHeader title="Réglages du compte" onBack={() => router.push('/')} />

      <Container maxWidth="sm" sx={{ py: 4 }}>
        {!IS_CONFIGURED ? (
          <Alert severity="info">
            L’authentification n’est pas configurée sur ce serveur : aucun compte à gérer.
          </Alert>
        ) : loading ? (
          <Stack sx={{ alignItems: 'center', py: 6 }}>
            <CircularProgress />
          </Stack>
        ) : !user ? (
          <Alert severity="warning">Aucune session active.</Alert>
        ) : (
          <Stack spacing={3}>
            {/* Nom d'affichage */}
            <Section title="Nom d'affichage">
              <Stack direction="row" spacing={1.5} sx={{ alignItems: 'flex-start' }}>
                <TextField
                  label="Nom d'affichage"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  fullWidth
                  size="small"
                  helperText="Ton nom en tant que MJ."
                />
                <Button
                  variant="contained"
                  onClick={() => void saveDisplayName()}
                  disabled={savingName}
                  sx={{ mt: 0.5, flexShrink: 0 }}
                >
                  Enregistrer
                </Button>
              </Stack>
            </Section>

            {/* Identités liées */}
            <Section title="Identités liées">
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                {user.email ?? 'Compte sans email'}
              </Typography>
              <List dense disablePadding>
                {identities.map((identity) => (
                  <ListItem
                    key={identity.identity_id}
                    disableGutters
                    secondaryAction={
                      <Button
                        size="small"
                        color="inherit"
                        startIcon={<LinkOffIcon fontSize="small" />}
                        disabled={!canUnlink || busyProvider === identity.identity_id}
                        onClick={() => void unlinkProvider(identity)}
                      >
                        Délier
                      </Button>
                    }
                  >
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      {identity.provider === 'google' || identity.provider === 'discord' ? (
                        <ProviderIcon
                          id={identity.provider}
                          sx={{ color: '#fff', fontSize: 20 }}
                        />
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
              {!canUnlink && (
                <Typography variant="caption" color="text.secondary">
                  Au moins une identité doit rester liée.
                </Typography>
              )}
              <Divider sx={{ my: 1.5 }} />
              <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
                {OAUTH_PROVIDERS.filter((p) => !linkedProviders.has(p.id)).map((p) => (
                  <Button
                    key={p.id}
                    size="small"
                    variant="outlined"
                    startIcon={<ProviderIcon id={p.id} sx={{ color: '#fff', fontSize: 18 }} />}
                    disabled={busyProvider !== null}
                    onClick={() => void linkProvider(p.id)}
                  >
                    Lier {p.label}
                  </Button>
                ))}
              </Stack>
            </Section>

            {/* Déconnexion */}
            <Section title="Session">
              <Button
                variant="outlined"
                color="inherit"
                startIcon={<LogoutIcon />}
                onClick={() => void signOut()}
              >
                Déconnexion
              </Button>
            </Section>

            {/* Zone dangereuse */}
            <Paper
              elevation={0}
              sx={{
                p: 2.5,
                bgcolor: 'rgba(40, 20, 20, 0.6)',
                border: '1px solid',
                borderColor: 'error.dark',
                borderRadius: 2,
              }}
            >
              <Typography variant="subtitle1" color="error.light" sx={{ mb: 0.5 }}>
                Supprimer le compte
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Efface définitivement le compte et, en cascade, toutes tes campagnes,
                leurs joueurs et leurs personnages. Irréversible.
              </Typography>
              <Button color="error" variant="contained" onClick={() => setDeleteOpen(true)}>
                Supprimer mon compte
              </Button>
            </Paper>
          </Stack>
        )}
      </Container>

      {/* Confirmation forte : retaper le mot-clé */}
      <Dialog open={deleteOpen} onClose={() => (deleting ? undefined : setDeleteOpen(false))}>
        <DialogTitle>Supprimer définitivement le compte ?</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Cette action est <strong>irréversible</strong>. Toutes tes campagnes, leurs joueurs
            et leurs personnages seront supprimés. Tape <strong>{DELETE_CONFIRM_WORD}</strong> pour
            confirmer.
          </DialogContentText>
          <TextField
            autoFocus
            fullWidth
            value={deleteConfirm}
            onChange={(e) => setDeleteConfirm(e.target.value)}
            placeholder={DELETE_CONFIRM_WORD}
            disabled={deleting}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteOpen(false)} disabled={deleting} color="inherit">
            Annuler
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => void confirmDelete()}
            disabled={deleting || deleteConfirm !== DELETE_CONFIRM_WORD}
            startIcon={deleting ? <CircularProgress size={18} color="inherit" /> : undefined}
          >
            Supprimer définitivement
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={toast !== null}
        autoHideDuration={4000}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {toast ? (
          <Alert severity={toast.severity} onClose={() => setToast(null)} variant="filled">
            {toast.message}
          </Alert>
        ) : undefined}
      </Snackbar>
    </Box>
  );
}

/** Bloc de section « verre dépoli » cohérent avec le reste de l'app. */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 2.5,
        bgcolor: 'rgba(20, 20, 23, 0.72)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: 2,
      }}
    >
      <Typography variant="subtitle1" sx={{ mb: 1.5 }}>
        {title}
      </Typography>
      {children}
    </Paper>
  );
}
