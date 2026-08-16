'use client';

/**
 * Contenu de l'onglet « PNJ » du tiroir d'outils du MJ (PER-428, socle) : liste
 * minimale — nom seul, création, suppression.
 *
 * Données persistées dans la table DÉDIÉE `campaign_npcs` (RLS propriétaire,
 * migration 0029) — PAS le blob `Campaign` comme les autres onglets (rumeurs,
 * butin) : chaque mutation passe par `repo.ts` (`fetchNpcs`/`insertNpc`/
 * `deleteNpc`), jamais par `useCampaignsStore().update`. L'état local n'est
 * synchronisé qu'à la réponse serveur (pas d'id généré côté client, la base
 * s'en charge) via les réducteurs purs de `npc.ts`.
 *
 * Les champs riches (description, `gm_notes`, disposition, statut, stats…)
 * arrivent en PER-429/431 ; ce composant ne porte que le strict socle.
 */
import { useEffect, useState } from 'react';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { useToast } from '@/components/toast/ToastProvider';
import { addNpc, removeNpc, sortNpcsByName } from '@/lib/campaign/npc';
import { deleteNpc, fetchNpcs, insertNpc } from '@/lib/campaign/repo';
import type { Npc } from '@/lib/campaign/types';

export function NpcPanel({ campaignId }: { campaignId: string }) {
  const { showToast } = useToast();
  const [npcs, setNpcs] = useState<Npc[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchNpcs(campaignId)
      .then((fetched) => {
        if (!cancelled) setNpcs(fetched);
      })
      .catch((e) => {
        if (!cancelled) {
          showToast(
            `Chargement des PNJ impossible : ${e instanceof Error ? e.message : String(e)}`,
            'error',
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId]);

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) return;
    setBusy(true);
    try {
      const created = await insertNpc(campaignId, name);
      setNpcs((prev) => sortNpcsByName(addNpc(prev, created)));
      setNewName('');
    } catch (e) {
      showToast(`Création impossible : ${e instanceof Error ? e.message : String(e)}`, 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (id: string) => {
    setBusy(true);
    try {
      await deleteNpc(id);
      setNpcs((prev) => removeNpc(prev, id));
      showToast('PNJ supprimé.', 'success');
    } catch (e) {
      showToast(`Suppression impossible : ${e instanceof Error ? e.message : String(e)}`, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start' }}>
        <TextField
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              void handleCreate();
            }
          }}
          size="small"
          fullWidth
          placeholder="Nom du PNJ (ex. « Gorak le forgeron »)"
        />
        <Button
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={handleCreate}
          disabled={busy || !newName.trim()}
          sx={{ flexShrink: 0 }}
        >
          Créer
        </Button>
      </Stack>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
          <CircularProgress size={24} />
        </Box>
      ) : npcs.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          Aucun PNJ pour l’instant. Créez-en un ci-dessus pour le retrouver ici.
        </Typography>
      ) : (
        <Stack spacing={1}>
          {npcs.map((npc) => (
            <Box key={npc.id} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography sx={{ flexGrow: 1 }}>{npc.name}</Typography>
              <Tooltip title="Supprimer">
                <span>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => handleDelete(npc.id)}
                    disabled={busy}
                  >
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
            </Box>
          ))}
        </Stack>
      )}
    </Stack>
  );
}
