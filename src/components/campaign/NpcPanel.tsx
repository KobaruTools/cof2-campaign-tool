'use client';

/**
 * Contenu de l'onglet « PNJ » du tiroir d'outils du MJ (PER-428 socle + PER-429
 * fiche complète) : liste de cartes (badge de disposition + sous-titre de rôle),
 * création/édition via `NpcFormDialog`, suppression par ligne.
 *
 * Données persistées dans la table DÉDIÉE `campaign_npcs` (RLS propriétaire,
 * migrations 0029/0030) — PAS le blob `Campaign` comme les autres onglets
 * (rumeurs, butin) : chaque mutation passe par `repo.ts` (`fetchNpcs`/
 * `insertNpc`/`updateNpc`/`deleteNpc`), jamais par `useCampaignsStore().update`.
 * L'état local n'est synchronisé qu'à la réponse serveur via les réducteurs
 * purs de `npc.ts`.
 */
import { useEffect, useState } from 'react';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import { useToast } from '@/components/toast/ToastProvider';
import { addNpc, removeNpc, replaceNpc, sortNpcsByName } from '@/lib/campaign/npc';
import { deleteNpc, fetchNpcs, insertNpc, updateNpc, type NpcInput } from '@/lib/campaign/repo';
import { NPC_DISPOSITION_ACCENT, NPC_DISPOSITION_LABELS, NPC_STATUS_LABELS, type Npc } from '@/lib/campaign/types';
import { useCharactersStore } from '@/stores/characters';
import { NpcFormDialog } from './NpcFormDialog';

export function NpcPanel({ campaignId }: { campaignId: string }) {
  const { showToast } = useToast();
  const characters = useCharactersStore((s) => s.characters);
  const campaignCharacters = characters.filter((c) => c.campaignId === campaignId);

  const [npcs, setNpcs] = useState<Npc[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [dialogTarget, setDialogTarget] = useState<'create' | Npc | null>(null);

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

  const handleCreate = async (input: NpcInput) => {
    const created = await insertNpc(campaignId, input);
    setNpcs((prev) => sortNpcsByName(addNpc(prev, created)));
  };

  const handleUpdate = async (npc: Npc, input: NpcInput) => {
    const updated = await updateNpc(npc.id, input);
    setNpcs((prev) => sortNpcsByName(replaceNpc(prev, updated)));
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
      <Button
        variant="outlined"
        startIcon={<AddIcon />}
        onClick={() => setDialogTarget('create')}
        sx={{ alignSelf: 'flex-start' }}
      >
        Nouveau PNJ
      </Button>

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
            <Box
              key={npc.id}
              sx={(theme) => ({
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                p: 1,
                borderRadius: 1,
                border: `1px solid ${alpha(theme.palette.divider, 0.6)}`,
                borderLeft: `4px solid ${NPC_DISPOSITION_ACCENT[npc.disposition]}`,
              })}
            >
              <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                  <Typography sx={{ fontWeight: 600 }}>{npc.name}</Typography>
                  <Box
                    component="span"
                    sx={{
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      px: 0.75,
                      py: 0.125,
                      borderRadius: 0.5,
                      color: NPC_DISPOSITION_ACCENT[npc.disposition],
                      border: `1px solid ${alpha(NPC_DISPOSITION_ACCENT[npc.disposition], 0.5)}`,
                    }}
                  >
                    {NPC_DISPOSITION_LABELS[npc.disposition]}
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    {NPC_STATUS_LABELS[npc.status]}
                  </Typography>
                </Stack>
                {npc.role && (
                  <Typography variant="body2" color="text.secondary" noWrap>
                    {npc.role}
                  </Typography>
                )}
              </Box>
              <Tooltip title="Modifier">
                <span>
                  <IconButton size="small" onClick={() => setDialogTarget(npc)} disabled={busy}>
                    <EditOutlinedIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
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

      {dialogTarget !== null && (
        <NpcFormDialog
          open
          onClose={() => setDialogTarget(null)}
          npc={dialogTarget === 'create' ? undefined : dialogTarget}
          campaignCharacters={campaignCharacters}
          onSubmit={async (input) => {
            try {
              if (dialogTarget === 'create') {
                await handleCreate(input);
                showToast('PNJ créé.', 'success');
              } else {
                await handleUpdate(dialogTarget, input);
                showToast('PNJ enregistré.', 'success');
              }
            } catch (e) {
              showToast(
                `Enregistrement impossible : ${e instanceof Error ? e.message : String(e)}`,
                'error',
              );
              throw e;
            }
          }}
        />
      )}
    </Stack>
  );
}
