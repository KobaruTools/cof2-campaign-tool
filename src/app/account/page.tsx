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
import type { User, UserIdentity } from '@supabase/supabase-js';
import DeleteOutlineIcon from '@mui/icons-material/Delete';
import EmailIcon from '@mui/icons-material/Email';
import LinkOffIcon from '@mui/icons-material/LinkOff';
import LogoutIcon from '@mui/icons-material/Logout';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
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
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Paper from '@mui/material/Paper';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { AccountUnlockSection } from '@/components/account/AccountUnlockSection';
import { useToast } from '@/components/toast/ToastProvider';
import { BackgroundMotionToggle } from '@/components/BackgroundMotionToggle';
import { PatchnotesNotificationsToggle } from '@/components/PatchnotesNotificationsToggle';
import { storageKeys } from '@/lib/storage/keys';
import { describeStorageKey, isProtectedStorageKey } from '@/lib/storage/keyDescriptions';
import { listLegacyKeyPairs } from '@/lib/storage/migrateLegacyKeys';
import { HomeBackground } from '@/components/HomeBackground';
import { ProviderIcon } from '@/components/icons/ProviderIcons';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import { OAUTH_PROVIDERS } from '@/lib/auth/providers';
import { useHeaderContent } from '@/stores/headerContent';
import { fetchMyProfile, setMyHandle } from '@/lib/friends/repo';
import { TOUR_REGISTRY, type TourId } from '@/lib/tours/registry';
import { useToursStore } from '@/stores/tours';
import { deleteAccount } from './actions';

const IS_CONFIGURED = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
);

/** Liste de debug (PER-412) : outil de développement, jamais affichée en prod. */
const IS_DEV = process.env.NODE_ENV !== 'production';

/** Lit toutes les clés `localStorage` présentes, triées, avec leur description. */
function readStorageEntries(): Array<{ key: string; description: string }> {
  if (typeof window === 'undefined') return [];
  const entries: Array<{ key: string; description: string }> = [];
  for (let i = 0; i < window.localStorage.length; i += 1) {
    const key = window.localStorage.key(i);
    if (key !== null) entries.push({ key, description: describeStorageKey(key) });
  }
  return entries.sort((a, b) => a.key.localeCompare(b.key));
}

type LegacyPair = { oldKey: string; newKey: string; safe: boolean };

/**
 * Paires ancienne/nouvelle clé présentes, avec leur statut de sécurité :
 * `safe` = la nouvelle clé existe déjà (migration confirmée pour CETTE
 * paire) → l'ancienne peut être supprimée sans perte. Sinon on la laisse en
 * place (mode privé, quota localStorage, ou copie jamais tentée).
 */
function readLegacyPairs(): LegacyPair[] {
  if (typeof window === 'undefined') return [];
  return listLegacyKeyPairs().map(({ oldKey, newKey }) => ({
    oldKey,
    newKey,
    safe: window.localStorage.getItem(newKey) !== null,
  }));
}

/** Libellé du mot à retaper pour confirmer la suppression (confirmation forte). */
const DELETE_CONFIRM_WORD = 'SUPPRIMER';

/** Fond « verre dépoli » d'une carte de section (partagé avec son squelette). */
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
  if (provider === 'email') return 'Lien magique (email)';
  return provider;
}

/** Sous-titre d'une identité : l'email rattaché s'il est connu. */
function identitySubtitle(identity: UserIdentity): string | undefined {
  const email = (identity.identity_data as { email?: unknown } | undefined)?.email;
  return typeof email === 'string' ? email : undefined;
}

export default function AccountPage() {
  useHeaderContent({ breadcrumbs: [{ label: 'Réglages du compte' }] });

  // Initial : chargement uniquement si Supabase est configuré (sinon rien à charger,
  // et pas de setState synchrone en effet — cf. react-hooks/set-state-in-effect).
  const [loading, setLoading] = useState(IS_CONFIGURED);
  const [user, setUser] = useState<User | null>(null);
  const [identities, setIdentities] = useState<UserIdentity[]>([]);
  const [displayName, setDisplayName] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [handle, setHandle] = useState('');
  const [savingHandle, setSavingHandle] = useState(false);
  const [busyProvider, setBusyProvider] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [storageEntries, setStorageEntries] = useState<Array<{ key: string; description: string }>>([]);
  const [legacyPairs, setLegacyPairs] = useState<LegacyPair[]>([]);
  const [cleanupOpen, setCleanupOpen] = useState(false);

  const { showToast } = useToast();
  const notify = (message: string, severity: 'success' | 'error' = 'success') =>
    showToast(message, severity);

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
    void fetchMyProfile().then((profile) => {
      if (!cancelled) setHandle(profile?.handle ?? '');
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Liste de debug (PER-412) : lue une fois au montage, pas de suivi live.
  useEffect(() => {
    if (!IS_DEV) return;
    void Promise.resolve().then(() => setStorageEntries(readStorageEntries()));
  }, []);

  // Anciennes clés (nomenclature pré-migration) encore présentes : lu au montage,
  // affiché pour tout le monde (pas réservé au dev — utile à un joueur normal).
  useEffect(() => {
    void Promise.resolve().then(() => setLegacyPairs(readLegacyPairs()));
  }, []);

  function deleteStorageEntry(key: string) {
    localStorage.removeItem(key);
    setStorageEntries((prev) => prev.filter((entry) => entry.key !== key));
    setLegacyPairs((prev) => prev.filter((pair) => pair.oldKey !== key));
  }

  function confirmResetLocalConfig() {
    for (const { key } of readStorageEntries()) {
      if (!isProtectedStorageKey(key)) localStorage.removeItem(key);
    }
    setResetOpen(false);
    window.location.reload();
  }

  // Ne supprime QUE les anciennes clés dont la nouvelle existe déjà (re-vérifié
  // ici, pas seulement depuis l'état affiché, pour éviter toute course avec un
  // autre onglet). Une paire sans nouvelle clé confirmée n'est jamais touchée.
  function confirmCleanupLegacy() {
    const fresh = readLegacyPairs();
    const safeKeys = new Set(fresh.filter((p) => p.safe).map((p) => p.oldKey));
    for (const key of safeKeys) localStorage.removeItem(key);
    setLegacyPairs(fresh.filter((p) => !p.safe));
    setStorageEntries((prev) => prev.filter((entry) => !safeKeys.has(entry.key)));
    setCleanupOpen(false);
    notify(`${safeKeys.size} ancienne(s) clé(s) nettoyée(s).`);
  }

  async function saveHandle() {
    setSavingHandle(true);
    try {
      await setMyHandle(handle);
      notify('Handle enregistré.');
    } catch (err) {
      const message = (err as { message?: string })?.message ?? '';
      if (message.includes('friend_handle_taken')) notify('Ce handle est déjà pris.', 'error');
      else if (message.includes('friend_handle_invalid_format')) {
        notify('Handle invalide : 3 à 24 caractères, minuscules/chiffres/underscore.', 'error');
      } else notify("Impossible d'enregistrer le handle.", 'error');
    } finally {
      setSavingHandle(false);
    }
  }

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
      localStorage.removeItem(storageKeys.store.characters);
      localStorage.removeItem(storageKeys.store.wizardDraft);
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
      <title>Réglages du compte — Éditeur de personnage CO2</title>
      <HomeBackground />

      <Container maxWidth="sm" sx={{ py: 4 }}>
        {!IS_CONFIGURED ? (
          <Alert severity="info">
            L’authentification n’est pas configurée sur ce serveur : aucun compte à gérer.
          </Alert>
        ) : loading ? (
          <Stack spacing={3} aria-hidden>
            {/* Nom d'affichage : titre + champ + bouton Enregistrer. */}
            <Paper elevation={0} sx={SECTION_SX}>
              <Skeleton animation="wave" variant="text" width={140} sx={{ fontSize: '1rem', mb: 1.5 }} />
              <Stack direction="row" spacing={1.5} sx={{ alignItems: 'flex-start' }}>
                <Skeleton animation="wave" variant="rounded" height={40} sx={{ flex: 1, borderRadius: 1 }} />
                <Skeleton
                  animation="wave"
                  variant="rounded"
                  width={110}
                  height={36}
                  sx={{ mt: 0.5, flexShrink: 0, borderRadius: 1 }}
                />
              </Stack>
            </Paper>
            {/* Affichage. */}
            <Paper elevation={0} sx={SECTION_SX}>
              <Skeleton animation="wave" variant="text" width={90} sx={{ fontSize: '1rem', mb: 1.5 }} />
              <Skeleton animation="wave" variant="rounded" width={220} height={38} sx={{ borderRadius: 1 }} />
            </Paper>
            {/* Identités liées : titre + deux lignes d'identité. */}
            <Paper elevation={0} sx={SECTION_SX}>
              <Skeleton animation="wave" variant="text" width={130} sx={{ fontSize: '1rem', mb: 1.5 }} />
              <Stack spacing={1.5}>
                {Array.from({ length: 2 }, (_, i) => (
                  <Stack key={i} direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                    <Skeleton animation="wave" variant="circular" width={24} height={24} sx={{ flexShrink: 0 }} />
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Skeleton animation="wave" variant="text" width="40%" />
                      <Skeleton animation="wave" variant="text" width="60%" sx={{ fontSize: '0.75rem' }} />
                    </Box>
                    <Skeleton animation="wave" variant="rounded" width={64} height={30} sx={{ flexShrink: 0, borderRadius: 1 }} />
                  </Stack>
                ))}
              </Stack>
            </Paper>
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

            {/* Handle public (PER-402) : sert à ce que les amis te retrouvent par
                recherche exact-match, cf. le tiroir « Amis » de l'en-tête. */}
            <Section title="Handle public">
              <Stack direction="row" spacing={1.5} sx={{ alignItems: 'flex-start' }}>
                <TextField
                  label="Handle"
                  value={handle}
                  onChange={(e) => setHandle(e.target.value)}
                  fullWidth
                  size="small"
                  helperText="3 à 24 caractères : minuscules, chiffres, underscore. Utilisé par tes amis pour te retrouver."
                />
                <Button
                  variant="contained"
                  onClick={() => void saveHandle()}
                  disabled={savingHandle}
                  sx={{ mt: 0.5, flexShrink: 0 }}
                >
                  Enregistrer
                </Button>
              </Stack>
            </Section>

            {/* Affichage (réglage par appareil, localStorage — même contrôle que le
                pied de page global). */}
            <Section title="Affichage">
              <BackgroundMotionToggle />
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                Réglage propre à cet appareil. Le suivi de la souris reste coupé si ton
                système demande de réduire les animations.
              </Typography>
            </Section>

            {/* Notifications (PER-494) : pilote le toast de nouveautés (`PatchnotesNotifier`)
                dans les deux sens — reflète le choix fait dans sa modale de premier close,
                et peut l'écraser sans jamais repasser par elle. Réglage par appareil. */}
            <Section title="Notifications">
              <PatchnotesNotificationsToggle />
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                Réglage propre à cet appareil. Coupe le toast qui signale les nouvelles mises
                à jour du site.
              </Typography>
            </Section>

            {/* Données stockées sur cet appareil (PER-412) : réinitialisation globale
                des réglages/préférences locaux (jamais les personnages ni le compte),
                + liste de debug (dev uniquement, jamais affichée en prod). */}
            <Section title="Données stockées sur cet appareil">
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                Réinitialise les réglages d’affichage et de confort propres à cet
                appareil (repli des sections, tri, densité…). Tes personnages et les
                données de ton compte ne sont pas concernés.
              </Typography>
              <Button
                variant="outlined"
                color="warning"
                startIcon={<RestartAltIcon />}
                onClick={() => setResetOpen(true)}
              >
                Réinitialiser toutes les configurations de cet appareil
              </Button>

              {legacyPairs.length > 0 && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    {legacyPairs.filter((p) => p.safe).length} ancienne(s) clé(s) (nomenclature
                    pré-migration) peuvent être nettoyées sans risque — leur équivalent existe déjà.
                    {legacyPairs.some((p) => !p.safe) && (
                      <>
                        {' '}
                        {legacyPairs.filter((p) => !p.safe).length} autre(s) n’ont pas encore de
                        version migrée et sont laissées en place par sécurité.
                      </>
                    )}
                  </Typography>
                  <Button
                    variant="outlined"
                    color="inherit"
                    startIcon={<DeleteOutlineIcon />}
                    disabled={!legacyPairs.some((p) => p.safe)}
                    onClick={() => setCleanupOpen(true)}
                  >
                    Nettoyer les anciennes configurations
                  </Button>
                </>
              )}

              {IS_DEV && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                    Debug (dev uniquement) — {storageEntries.length} clé(s) localStorage sur cet appareil.
                  </Typography>
                  <List dense disablePadding sx={{ maxHeight: 320, overflowY: 'auto' }}>
                    {storageEntries.map(({ key, description }) => (
                      <ListItem
                        key={key}
                        disableGutters
                        secondaryAction={
                          <Tooltip title="Supprimer cette clé">
                            <IconButton
                              size="small"
                              edge="end"
                              onClick={() => deleteStorageEntry(key)}
                            >
                              <DeleteOutlineIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        }
                      >
                        <ListItemText
                          primary={key}
                          secondary={description}
                          slotProps={{
                            primary: { variant: 'body2', sx: { fontFamily: 'monospace' } },
                            secondary: { variant: 'caption' },
                          }}
                        />
                      </ListItem>
                    ))}
                  </List>
                </>
              )}
            </Section>

            {/* Tutoriels (PER-424) : un tour peut être relancé indépendamment des
                autres — liste générée depuis le registre central (jamais codée en
                dur ici), voir src/lib/tours/registry.ts. */}
            <TourResetSection notify={notify} />

            {/* Débloquer du contenu (PER-243) — auto-gaté : ne s'affiche que pour un
                compte habilité (allowlist), sinon le composant ne rend rien. */}
            <AccountUnlockSection />

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

      {/* Confirmation : réinitialisation des réglages locaux (irréversible). */}
      <Dialog open={resetOpen} onClose={() => setResetOpen(false)}>
        <DialogTitle>Réinitialiser les réglages de cet appareil ?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Tous les réglages d’affichage et de confort propres à cet appareil
            reviendront à leur valeur par défaut. Cette action est
            <strong> irréversible</strong>. Tes personnages et les données de ton
            compte ne sont pas touchés.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResetOpen(false)} color="inherit">
            Annuler
          </Button>
          <Button color="warning" variant="contained" onClick={confirmResetLocalConfig}>
            Réinitialiser
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirmation : nettoyage des anciennes clés déjà migrées. */}
      <Dialog open={cleanupOpen} onClose={() => setCleanupOpen(false)}>
        <DialogTitle>Nettoyer les anciennes configurations ?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Supprime uniquement les clés au format historique dont l’équivalent au
            nouveau format existe déjà sur cet appareil ({legacyPairs.filter((p) => p.safe).length}{' '}
            clé(s)). Celles sans équivalent confirmé ne sont pas touchées.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCleanupOpen(false)} color="inherit">
            Annuler
          </Button>
          <Button color="primary" variant="contained" onClick={confirmCleanupLegacy}>
            Nettoyer
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

/** Bloc de section « verre dépoli » cohérent avec le reste de l'app. */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Paper elevation={0} sx={SECTION_SX}>
      <Typography variant="subtitle1" sx={{ mb: 1.5 }}>
        {title}
      </Typography>
      {children}
    </Paper>
  );
}

/**
 * Section « Tutoriels » (PER-424) : un contrôle de réinitialisation par tour, pas
 * un bouton global — liste générée depuis `TOUR_REGISTRY` (registre central posé
 * par PER-423), jamais codée en dur ici. Réinitialiser efface juste le statut
 * vu/passé de CE tour ; il se relance automatiquement à la prochaine ouverture de
 * sa page, sans confirmation forte (action mineure, sans perte de données).
 *
 * Itère `Object.entries` plutôt que `TOUR_LIST` : seules les entrées du registre
 * exposent la clé `TourId` (ex. `itemDialog`) attendue par `resetTour`/
 * `completedVersions` — `TOUR_LIST` n'expose que la clé de stockage (`item-dialog`).
 */
function TourResetSection({ notify }: { notify: (message: string) => void }) {
  const completedVersions = useToursStore((s) => s.completedVersions);
  const hasHydrated = useToursStore((s) => s.hasHydrated);
  const resetTour = useToursStore((s) => s.resetTour);

  return (
    <Section title="Tutoriels">
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
        Réinitialise un tutoriel guidé pour qu’il se relance automatiquement à sa
        prochaine ouverture.
      </Typography>
      <List dense disablePadding>
        {(Object.entries(TOUR_REGISTRY) as [TourId, (typeof TOUR_REGISTRY)[TourId]][]).map(
          ([tourId, tour]) => {
            const seen = hasHydrated && completedVersions[tourId] === tour.version;
            return (
              <ListItem
                key={tourId}
                disableGutters
                secondaryAction={
                  <Button
                    size="small"
                    variant="outlined"
                    color="inherit"
                    startIcon={<RestartAltIcon fontSize="small" />}
                    disabled={!hasHydrated}
                    onClick={() => {
                      resetTour(tourId);
                      notify(`Tutoriel « ${tour.label} » réinitialisé.`);
                    }}
                  >
                    Réinitialiser
                  </Button>
                }
              >
                <ListItemText
                  primary={tour.label}
                  secondary={seen ? 'Déjà vu sur cet appareil' : 'Jamais vu sur cet appareil'}
                />
              </ListItem>
            );
          },
        )}
      </List>
    </Section>
  );
}
