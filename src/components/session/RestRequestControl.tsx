'use client';

/**
 * Demander une pause à la table, côté JOUEUR (PER-313) — le bouton posé dans le bloc « État du
 * personnage », à côté des repos ordinaires.
 *
 * À la table, ce n'est pas toujours le MJ qui demande la pause : le plus souvent c'est un joueur qui
 * dit « on souffle ? ». Ce qu'émet ce bouton n'est pourtant PAS une proposition — c'est une
 * **demande**, qui monte au seul MJ. Lui l'adopte (une vraie proposition s'ouvre alors chez tout le
 * monde, au nom du demandeur, et ce composant s'efface au profit de `RestProposalDialog`) ou la
 * refuse, auquel cas le demandeur — et lui seul — en est averti. Le MJ reste ainsi arbitre de la
 * scène sans qu'aucun veto n'ait à exister : « refuser », c'est ne pas adopter.
 *
 * Le bouton n'existe qu'en session : hors session le canal est fermé, personne ne recevrait la
 * demande. Un personnage joué en solo ne le voit donc jamais.
 */
import { useState } from 'react';
import GroupsIcon from '@mui/icons-material/Groups';
import HotelIcon from '@mui/icons-material/Hotel';
import TimerIcon from '@mui/icons-material/Timer';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { AppAlert } from '@/components/AppAlert';
import { SourceRef } from '@/components/SourceRef';
import {
  REST_KIND_DURATION,
  REST_KIND_WITH_ARTICLE,
  type RestKind,
} from '@/lib/session/restProposal';
import { useRestProposalStore } from '@/stores/restProposal';

export interface RestRequestControlProps {
  /** Campagne du personnage — porte la session et la demande. */
  campaignId: string;
  /** Personnage au nom duquel la demande est faite. */
  characterId: string;
  /** Nom du personnage : c'est lui qui nommera la proposition (« Aria propose… »). */
  characterName: string;
  /** Une session de table est-elle en cours ? Hors session, rien ne s'affiche. */
  sessionActive: boolean;
}

export function RestRequestControl({
  campaignId,
  characterId,
  characterName,
  sessionActive,
}: RestRequestControlProps) {
  const [open, setOpen] = useState(false);
  const proposal = useRestProposalStore((s) => s.byCampaign[campaignId] ?? null);
  const mine = useRestProposalStore((s) => s.myRequestByCampaign[campaignId] ?? null);
  const requestRest = useRestProposalStore((s) => s.requestRest);
  const dismissMyRequest = useRestProposalStore((s) => s.dismissMyRequest);

  // Hors session, ou pendant qu'une pause est déjà sur la table (`RestProposalDialog` prend alors
  // le relais) : il n'y a rien à demander.
  if (!sessionActive || proposal) return null;

  const declined = mine?.status === 'declined';
  // Le refus s'impose de lui-même : le joueur doit savoir qu'il a été entendu, même s'il avait
  // refermé la fenêtre. Le fermer range la demande, ce qui referme la fenêtre par la même occasion.
  const dialogOpen = open || declined;

  const close = () => {
    setOpen(false);
    if (declined) dismissMyRequest(campaignId);
  };

  const ask = (kind: RestKind) => {
    requestRest(campaignId, kind, characterName, characterId);
    setOpen(false);
  };

  const kindButtons = (
    <Stack spacing={1}>
      <Button variant="contained" startIcon={<TimerIcon />} onClick={() => ask('short')}>
        Récupération rapide ({REST_KIND_DURATION.short})
      </Button>
      <Button variant="contained" startIcon={<HotelIcon />} onClick={() => ask('long')}>
        Repos long ({REST_KIND_DURATION.long})
      </Button>
    </Stack>
  );

  return (
    <>
      <Button
        size="small"
        variant="outlined"
        color={declined ? 'warning' : 'primary'}
        startIcon={<GroupsIcon />}
        onClick={() => setOpen(true)}
      >
        {declined ? 'Demande refusée' : mine ? 'Demande envoyée' : 'Proposer une pause'}
      </Button>

      <Dialog open={dialogOpen} onClose={close} maxWidth="xs" fullWidth>
        <DialogTitle>
          {declined ? 'Pas de pause pour l’instant' : 'Proposer une pause à la table'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 0.5 }}>
            {declined ? (
              <>
                <AppAlert severity="warning">
                  Le MJ a refusé la pause : la scène ne s’y prête pas. Rien n’a changé sur ta fiche.
                </AppAlert>
                <Typography variant="body2" color="text.secondary">
                  Tu peux redemander plus tard, quand la situation se sera calmée.
                </Typography>
                {kindButtons}
              </>
            ) : mine ? (
              <>
                <Typography variant="body2" color="text.secondary">
                  Ta demande {REST_KIND_WITH_ARTICLE[mine.request.kind]} est partie au MJ. S’il
                  l’accepte, la proposition s’ouvrira chez toute la table et tu décideras alors, comme
                  les autres, si tu dépenses tes dés de récupération.
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Tu peux encore changer la nature du repos demandé :
                </Typography>
                {kindButtons}
              </>
            ) : (
              <>
                <Typography variant="body2" color="text.secondary">
                  Le temps est collectif : si le groupe s’arrête, la pause passe pour tout le monde{' '}
                  <SourceRef page={221} />. C’est donc au MJ de dire si la scène le permet — ta
                  demande lui est adressée, et lui seul la voit.
                </Typography>
                {kindButtons}
              </>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={close}>Fermer</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
