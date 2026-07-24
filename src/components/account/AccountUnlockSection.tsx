'use client';

/**
 * Section « Débloquer du contenu » des réglages de compte (PER-243).
 *
 * Capacité SENSIBLE (raisons légales) : réservée aux comptes HABILITÉS (allowlist
 * `redeem_allowlist`, migration 0009). Le composant s'AUTO-GÈRE — il interroge
 * `canRedeemSource()` au montage et ne rend RIEN si le compte n'est pas habilité.
 * Ce masquage n'est qu'un confort d'UI : la vraie barrière est la RPC
 * `redeem_source_code`, qui refuse côté serveur tout compte hors allowlist.
 *
 * Deux blocs :
 *   1. Saisie d'un code → pose un entitlement pour ce compte (le contenu débloqué
 *      apparaît au prochain passage dans `/bestiary`).
 *   2. Liste des contenus déjà débloqués, avec retrait individuel (utile pour rejouer
 *      des tests). Le retrait ne re-ferme QUE l'accès du compte courant (RLS 0010).
 */
import { useCallback, useEffect, useState } from 'react';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import {
  canRedeemSource,
  listUnlockedSources,
  redeemSourceCode,
  removeSourceEntitlement,
  type UnlockedSource,
} from '@/lib/bestiary';
import { AppAlert } from '@/components/AppAlert';

/** Fond « verre dépoli » d'une carte de section (aligné sur AccountPage). */
const SECTION_SX = {
  p: 2.5,
  bgcolor: 'rgba(20, 20, 23, 0.72)',
  backdropFilter: 'blur(10px)',
  WebkitBackdropFilter: 'blur(10px)',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  borderRadius: 2,
} as const;

/** État du dernier essai de déblocage (rendu inline). */
type Feedback =
  | { kind: 'success'; sourceName: string }
  | { kind: 'invalid' }
  | { kind: 'error' };

export function AccountUnlockSection() {
  const [allowed, setAllowed] = useState(false);
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [unlocked, setUnlocked] = useState<UnlockedSource[]>([]);
  const [removing, setRemoving] = useState<string | null>(null);

  // Recharge la liste des contenus débloqués (best-effort : une erreur laisse la
  // liste inchangée, le déblocage/retrait restant l'action principale).
  const refreshUnlocked = useCallback(async () => {
    try {
      setUnlocked(await listUnlockedSources());
    } catch {
      /* silencieux : la liste n'est qu'un état secondaire */
    }
  }, []);

  // Habilitation : décidée côté base (allowlist). Fail-safe → section cachée si non
  // habilité ou en cas d'erreur (`canRedeemSource` renvoie false). Charge la liste
  // seulement une fois l'habilitation confirmée.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const ok = await canRedeemSource();
      if (cancelled) return;
      setAllowed(ok);
      if (ok) void refreshUnlocked();
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshUnlocked]);

  const submit = async () => {
    const trimmed = code.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    setFeedback(null);
    try {
      const result = await redeemSourceCode(trimmed);
      if (result.ok) {
        setFeedback({ kind: 'success', sourceName: result.sourceName });
        setCode('');
        void refreshUnlocked();
      } else {
        setFeedback({ kind: 'invalid' });
      }
    } catch {
      setFeedback({ kind: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (sourceId: string) => {
    if (removing) return;
    setRemoving(sourceId);
    try {
      await removeSourceEntitlement(sourceId);
      setUnlocked((prev) => prev.filter((s) => s.sourceId !== sourceId));
    } catch {
      setFeedback({ kind: 'error' });
    } finally {
      setRemoving(null);
    }
  };

  // Compte non habilité : la section n'existe pas (aucun teaser).
  if (!allowed) return null;

  return (
    <Paper elevation={0} sx={SECTION_SX}>
      <Typography variant="subtitle1" sx={{ mb: 1.5 }}>
        Débloquer du contenu
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Saisis le code d&apos;une source payante. Une fois validé, son contenu
        apparaît dans le bestiaire pour ton compte.
      </Typography>

      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'flex-start' }}>
        <TextField
          label="Code de déblocage"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              void submit();
            }
          }}
          fullWidth
          size="small"
          disabled={submitting}
        />
        <Button
          variant="contained"
          startIcon={<LockOpenIcon />}
          onClick={() => void submit()}
          disabled={submitting || code.trim() === ''}
          sx={{ mt: 0.5, flexShrink: 0 }}
        >
          Débloquer
        </Button>
      </Stack>

      {feedback?.kind === 'success' && (
        <AppAlert severity="success" sx={{ mt: 2 }}>
          « {feedback.sourceName} » a été débloqué. Son contenu est disponible dans
          le bestiaire.
        </AppAlert>
      )}
      {feedback?.kind === 'invalid' && (
        <AppAlert severity="error" sx={{ mt: 2 }}>
          Ce code est invalide. Vérifie la saisie et réessaie.
        </AppAlert>
      )}
      {feedback?.kind === 'error' && (
        <AppAlert severity="error" sx={{ mt: 2 }}>
          L&apos;opération a échoué. Réessaie dans un instant.
        </AppAlert>
      )}

      <Divider sx={{ my: 2 }} />

      <Typography variant="subtitle2" sx={{ mb: 1 }}>
        Contenu débloqué
      </Typography>
      {unlocked.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          Aucun contenu débloqué pour l&apos;instant.
        </Typography>
      ) : (
        <List dense disablePadding>
          {unlocked.map((s) => (
            <ListItem
              key={s.sourceId}
              disableGutters
              secondaryAction={
                <Tooltip title="Retirer l'accès">
                  <span>
                    <IconButton
                      edge="end"
                      size="small"
                      color="inherit"
                      aria-label={`Retirer l'accès à ${s.name}`}
                      disabled={removing === s.sourceId}
                      onClick={() => void remove(s.sourceId)}
                    >
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
              }
            >
              <ListItemText primary={s.name} secondary={s.slug} />
            </ListItem>
          ))}
        </List>
      )}
    </Paper>
  );
}
