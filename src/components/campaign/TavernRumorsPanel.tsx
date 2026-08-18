'use client';

/**
 * Contenu du tiroir « Rumeurs de taverne » de l'écran de MJ (PER-199).
 *
 * Le MJ pré-écrit une réserve de rumeurs (accroches libres) PROPRE à la campagne,
 * puis en PIOCHE UNE AU HASARD en jeu (typiquement à l'entrée d'une taverne). Le
 * tirage évite les rumeurs déjà servies (non-redoublement) et marque la tirée
 * « servie » ; une fois la réserve épuisée, le MJ la réinitialise.
 *
 * Données PERSISTÉES sur la campagne (`Campaign.rumors`, colonne jsonb, RLS
 * propriétaire) : chaque mutation passe par `useCampaignsStore().update`. La
 * logique de tirage/épuisement vit dans le module PUR `@/lib/campaign/rumors` ;
 * ce composant n'en est que l'habillage (état de saisie + rumeur tirée éphémère).
 *
 * Ce composant est le CORPS du tiroir : il ne porte pas son propre conteneur ni
 * sa fermeture — `GmRumorsDrawer` fournit l'ossature (en-tête, croix).
 */
import { useState } from 'react';
import AddIcon from '@mui/icons-material/Add';
import CasinoIcon from '@mui/icons-material/Casino';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import EditIcon from '@mui/icons-material/Edit';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { useToast } from '@/components/toast/ToastProvider';
import type { Campaign, TavernRumor } from '@/lib/campaign';
import {
  drawRumor,
  isExhausted,
  isReserveEmpty,
  remainingCount,
  resetRumors,
} from '@/lib/campaign/rumors';
import { useCampaignsStore } from '@/stores/campaigns';

/** Génère un identifiant stable pour une nouvelle rumeur (clé de tirage + `key` React). */
function newRumorId(): string {
  // `crypto.randomUUID` est dispo dans tous les navigateurs cibles (contexte client).
  return crypto.randomUUID();
}

export function TavernRumorsPanel({ campaign }: { campaign: Campaign }) {
  const update = useCampaignsStore((s) => s.update);
  const { showToast } = useToast();
  const rumors = campaign.rumors;

  // Rumeur tirée à l'instant — état ÉPHÉMÈRE (non persisté) : le tirage la met en
  // avant pour que le MJ la lise, indépendamment de la liste de gestion.
  const [drawn, setDrawn] = useState<TavernRumor | null>(null);
  // Saisie d'une nouvelle rumeur.
  const [newText, setNewText] = useState('');
  // Édition en place d'une rumeur existante (`null` = aucune).
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  // Verrou pendant l'écriture réseau (évite les tirages concurrents).
  const [busy, setBusy] = useState(false);

  const total = rumors.length;
  const remaining = remainingCount(rumors);
  const empty = isReserveEmpty(rumors);
  const exhausted = isExhausted(rumors);

  /** Persiste une nouvelle réserve ; remonte l'erreur éventuelle en toast. */
  const persist = async (next: TavernRumor[]): Promise<boolean> => {
    setBusy(true);
    try {
      await update(campaign.id, { rumors: next });
      return true;
    } catch (e) {
      showToast(
        `Enregistrement impossible : ${e instanceof Error ? e.message : String(e)}`,
        'error',
      );
      return false;
    } finally {
      setBusy(false);
    }
  };

  const handleDraw = async () => {
    const result = drawRumor(rumors, (n) => Math.floor(Math.random() * n));
    if (!result) return; // garde-fou : le bouton est désactivé quand rien n'est piochable
    setDrawn(result.rumor);
    await persist(result.rumors);
  };

  const handleReset = async () => {
    setDrawn(null);
    const ok = await persist(resetRumors(rumors));
    if (ok) showToast('Réserve de rumeurs réinitialisée.', 'success');
  };

  const handleAdd = async () => {
    const text = newText.trim();
    if (!text) return;
    const next: TavernRumor[] = [...rumors, { id: newRumorId(), text, served: false }];
    const ok = await persist(next);
    if (ok) setNewText('');
  };

  const handleRemove = async (id: string) => {
    if (drawn?.id === id) setDrawn(null);
    const ok = await persist(rumors.filter((r) => r.id !== id));
    if (ok) showToast('Rumeur supprimée.', 'success');
  };

  const startEdit = (r: TavernRumor) => {
    setEditingId(r.id);
    setEditText(r.text);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditText('');
  };

  const saveEdit = async () => {
    const text = editText.trim();
    if (!editingId || !text) return;
    const ok = await persist(rumors.map((r) => (r.id === editingId ? { ...r, text } : r)));
    if (ok) cancelEdit();
  };

  return (
    <Stack spacing={2}>
      {/* Bloc de tirage : bouton principal + compteur + réinitialisation à épuisement. */}
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', rowGap: 1 }}>
        <Button
          variant="contained"
          color="warning"
          startIcon={<CasinoIcon />}
          onClick={handleDraw}
          disabled={busy || remaining === 0}
        >
          Piocher une rumeur
        </Button>
        {exhausted && (
          <Button
            variant="outlined"
            startIcon={<RestartAltIcon />}
            onClick={handleReset}
            disabled={busy}
          >
            Réinitialiser la réserve
          </Button>
        )}
        <Box sx={{ flexGrow: 1 }} />
        {total > 0 && (
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            <Box component="span" sx={{ fontWeight: 700, color: remaining === 0 ? 'text.disabled' : 'warning.light' }}>
              {remaining}
            </Box>{' '}
            / {total} piochable{total > 1 ? 's' : ''}
          </Typography>
        )}
      </Stack>

      {/* Rumeur tirée, mise en avant. */}
      {drawn && (
        <Paper
          variant="outlined"
          sx={{ p: 2, bgcolor: 'rgba(255, 193, 7, 0.08)', borderColor: 'warning.dark', borderRadius: 2 }}
        >
          <Typography
            variant="overline"
            sx={{ color: 'warning.light', letterSpacing: 1, display: 'block', mb: 0.5 }}
          >
            Rumeur tirée
          </Typography>
          <Typography sx={{ fontStyle: 'italic' }}>«&nbsp;{drawn.text}&nbsp;»</Typography>
        </Paper>
      )}

      {/* États de la réserve. */}
      {empty && (
        <Typography variant="body2" color="text.secondary">
          Aucune rumeur pour l’instant. Ajoutez des accroches ci-dessous pour pouvoir en piocher
          une au hasard en jeu.
        </Typography>
      )}
      {exhausted && (
        <Typography variant="body2" color="text.secondary">
          Toutes les rumeurs ont été servies. Réinitialisez la réserve pour les rendre à nouveau
          piochables, ou ajoutez-en de nouvelles.
        </Typography>
      )}

      <Divider />

      {/* Réserve : liste éditable + ajout. */}
      <Typography
        variant="subtitle2"
        sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: 'text.secondary' }}
      >
        Réserve
      </Typography>
      <Stack spacing={1}>
        {rumors.map((r) => {
          const editing = editingId === r.id;
          return (
            <Box
              key={r.id}
              sx={{ display: 'flex', alignItems: editing ? 'flex-start' : 'center', gap: 1 }}
            >
              {editing ? (
                <>
                  <TextField
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        void saveEdit();
                      }
                      if (e.key === 'Escape') cancelEdit();
                    }}
                    size="small"
                    fullWidth
                    multiline
                    autoFocus
                  />
                  <Tooltip title="Enregistrer">
                    <span>
                      <IconButton
                        size="small"
                        color="success"
                        onClick={saveEdit}
                        disabled={busy || !editText.trim()}
                      >
                        <CheckIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Tooltip title="Annuler">
                    <IconButton size="small" onClick={cancelEdit}>
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </>
              ) : (
                <>
                  <Typography
                    sx={{
                      flexGrow: 1,
                      color: r.served ? 'text.disabled' : 'text.primary',
                      textDecoration: r.served ? 'line-through' : 'none',
                    }}
                  >
                    {r.text}
                  </Typography>
                  {r.served && (
                    <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                      servie
                    </Typography>
                  )}
                  <Tooltip title="Modifier">
                    <span>
                      <IconButton size="small" onClick={() => startEdit(r)} disabled={busy}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Tooltip title="Supprimer">
                    <span>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleRemove(r.id)}
                        disabled={busy}
                      >
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                </>
              )}
            </Box>
          );
        })}

        {/* Ajout d'une rumeur. */}
        <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start', mt: 0.5 }}>
          <TextField
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void handleAdd();
              }
            }}
            size="small"
            fullWidth
            multiline
            placeholder="Nouvelle rumeur (ex. « On raconte qu’un dragon rôde au nord »)"
          />
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={handleAdd}
            disabled={busy || !newText.trim()}
            sx={{ flexShrink: 0 }}
          >
            Ajouter
          </Button>
        </Stack>
      </Stack>
    </Stack>
  );
}
