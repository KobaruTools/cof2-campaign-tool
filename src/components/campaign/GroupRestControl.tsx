'use client';

/**
 * Repos de groupe côté MJ (PER-312) — bouton de la barre d'actions de l'écran de MJ + fenêtre de
 * pilotage de la proposition en cours.
 *
 * Le principe mécanisé ici : **le temps est collectif, le bénéfice est individuel**. Le MJ propose
 * une récupération rapide (30 min, p. 221) ou un repos long (8 h, p. 221-222) à toute la table ;
 * chaque joueur annonce ensuite, depuis SA fiche, s'il compte dépenser ses dés de récupération et
 * son mana ou s'il laisse simplement passer le temps.
 *
 * La proposition se joue **en deux temps**, et c'est essentiel : tant que le MJ n'a pas validé,
 * personne ne s'est reposé. Il voit le relevé se remplir, puis tranche — « Valider la pause »
 * applique la récupération sur toutes les fiches d'un coup, « Annuler » la fait disparaître sans que
 * quiconque ait bougé. Une proposition n'expire jamais toute seule (le MJ garde la main, comme sur
 * les durées d'effets).
 *
 * La table convoquée, ce sont les joueurs **connectés** à la session (PER-313) : un camarade sur
 * fiche papier ou app fermée n'est pas appelé, il resterait sinon éternellement « n'a pas répondu ».
 * Elle est figée à l'ouverture — quelqu'un qui se déconnecte ensuite reste au relevé, sans bloquer.
 *
 * En validant, le MJ peut **purger les états de combat** du tracker : le groupe a soufflé une
 * demi-heure ou dormi une nuit, ses états de durée n'ont plus lieu d'être. Coché par défaut, mais
 * jamais automatique — le MJ peut vouloir conserver un poison ou une malédiction qui survit à la nuit.
 *
 * La pause peut aussi venir d'un JOUEUR (PER-313) : sa **demande** atterrit ici, et nulle part
 * ailleurs. Le MJ l'adopte — la proposition s'ouvre alors chez toute la table au nom du demandeur,
 * et la suite est identique — ou il la refuse, la scène étant à lui. Le MJ reste donc auteur unique
 * du relevé quelle que soit l'origine de la pause, et c'est toujours lui qui donne le top.
 *
 * Rien n'est persisté (cf. `stores/restProposal`) : ce qui compte durablement, ce sont les repos
 * réellement appliqués, écrits sur la fiche de chaque joueur.
 */
import { useState } from 'react';
import HotelIcon from '@mui/icons-material/Hotel';
import TimerIcon from '@mui/icons-material/Timer';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControlLabel from '@mui/material/FormControlLabel';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha, type SxProps, type Theme } from '@mui/material/styles';
import { AppAlert } from '@/components/AppAlert';
import { AppTooltip } from '@/components/AppTooltip';
import { SourceRef } from '@/components/SourceRef';
import { RestTallyList } from '@/components/session/RestTallyList';
import { attentionPulseSx } from '@/lib/ui/attentionPulse';
import { clearAllStatuses } from '@/lib/session/combatState';
import {
  connectedRestParticipants,
  REST_KIND_DURATION,
  REST_KIND_LABEL,
  restProposalAnsweredCount,
  restProposalTally,
  restRequestHeadline,
  type RestCandidate,
  type RestKind,
  type RestRequest,
} from '@/lib/session/restProposal';
import { useCampaignCombatStore } from '@/stores/campaignCombat';
import { useRestProposalStore } from '@/stores/restProposal';
import {
  EMPTY_PRESENCE,
  presentPlayerIds,
  useSessionPresenceStore,
} from '@/stores/sessionPresence';

/**
 * File vide partagée : un sélecteur zustand doit renvoyer une référence STABLE quand il n'y a rien
 * (l'égalité par défaut est `Object.is` — un `[]` neuf à chaque rendu rendrait en boucle).
 */
const EMPTY_REQUESTS: RestRequest[] = [];

/** Un personnage de la table, tel qu'il apparaît dans le relevé des réponses. */
export interface GroupRestTableCharacter {
  id: string;
  name: string;
  /** Nom du joueur qui l'incarne (le relevé dit qui n'a pas encore répondu). */
  playerName?: string;
  /** Id du joueur qui l'incarne — c'est SA présence sur le canal qui décide de la convocation. */
  playerId?: string;
}

export interface GroupRestControlProps {
  campaignId: string;
  /** Personnages réclamés par un joueur — parmi eux, les connectés seront convoqués au relevé. */
  tableCharacters: GroupRestTableCharacter[];
  /**
   * Une session de table est-elle en cours ? Hors session le canal est fermé : personne ne
   * recevrait la proposition, le bouton reste donc inerte.
   */
  sessionActive: boolean;
  /** Style du bouton, pour l'aligner sur la barre d'actions de l'écran de MJ. */
  buttonSx?: SxProps<Theme>;
}

export function GroupRestControl({
  campaignId,
  tableCharacters,
  sessionActive,
  buttonSx,
}: GroupRestControlProps) {
  const [open, setOpen] = useState(false);
  const [purgeStatuses, setPurgeStatuses] = useState(true);
  const proposal = useRestProposalStore((s) => s.byCampaign[campaignId] ?? null);
  const propose = useRestProposalStore((s) => s.propose);
  const applyProposal = useRestProposalStore((s) => s.applyProposal);
  const closeProposal = useRestProposalStore((s) => s.closeProposal);
  // Demandes de joueurs en attente d'arbitrage (PER-313) — visibles du seul MJ.
  const requests = useRestProposalStore((s) => s.requestsByCampaign[campaignId] ?? EMPTY_REQUESTS);
  const adoptRequest = useRestProposalStore((s) => s.adoptRequest);
  const declineRequest = useRestProposalStore((s) => s.declineRequest);
  // Qui est effectivement connecté au canal (PER-313) : seuls ces joueurs sont convoqués au relevé.
  const present = useSessionPresenceStore((s) => s.byCampaign[campaignId] ?? EMPTY_PRESENCE);
  const applyLocalCombat = useCampaignCombatStore((s) => s.applyLocalCombat);
  // Y a-t-il seulement des états à purger ? Sans état posé, la case n'aurait rien à proposer.
  const hasStatuses = useCampaignCombatStore(
    (s) => Object.keys(s.byCampaign[campaignId]?.statuses ?? {}).length > 0,
  );

  const answered = proposal ? restProposalAnsweredCount(proposal) : 0;
  const tally = proposal ? restProposalTally(proposal) : null;

  /**
   * Table convoquée au relevé. C'est le MJ qui la fournit, y compris quand la pause vient d'un
   * joueur : le client d'un joueur ne connaît que son propre personnage (PER-313).
   *
   * Seuls les personnages dont le joueur est CONNECTÉ sont convoqués : à la table, un camarade sur
   * fiche papier n'a rien à faire dans un relevé qu'il ne remplira jamais. La liste est figée à
   * l'ouverture de la proposition — une déconnexion ultérieure ne retire personne du relevé.
   */
  const candidates: RestCandidate[] = tableCharacters.map((c) => ({
    characterId: c.id,
    name: c.name,
    ...(c.playerName ? { playerName: c.playerName } : {}),
    ...(c.playerId ? { playerId: c.playerId } : {}),
  }));
  const participants = connectedRestParticipants(candidates, presentPlayerIds(present));

  const startProposal = (kind: RestKind) => {
    propose(campaignId, kind, 'Le MJ', participants);
    setPurgeStatuses(true);
  };

  /** Adoption d'une demande de joueur : la proposition s'ouvre à son nom (PER-313). */
  const adopt = (requestId: string) => {
    adoptRequest(campaignId, requestId, participants);
    setPurgeStatuses(true);
  };

  /** Top de départ : chaque fiche applique la récupération qu'elle avait préparée. */
  const validate = () => {
    if (purgeStatuses && hasStatuses) applyLocalCombat(campaignId, clearAllStatuses);
    applyProposal(campaignId);
  };

  /** Annulation avant le top, ou rangement après : dans les deux cas la proposition disparaît. */
  const dismissProposal = () => {
    closeProposal(campaignId);
    setOpen(false);
  };

  // Des joueurs demandent une pause et rien n'est encore ouvert : le bouton passe en ambre et
  // annonce le compte. Aucune fenêtre ne s'ouvre d'autorité — le MJ est peut-être en plein combat.
  const pendingRequests = proposal === null ? requests.length : 0;

  const button = (
    <Button
      variant="outlined"
      size="small"
      startIcon={<HotelIcon />}
      onClick={() => setOpen(true)}
      disabled={!sessionActive}
      // Teinte d'attente SUPERPOSÉE au style du contexte : sur l'écran de MJ, `buttonSx` fixe déjà
      // couleur, fond et bordure (bouton « verre » sur fond illustré) et l'emporterait sur une
      // simple prop `color`. Cette couche passe après, et fonctionne aussi sans `buttonSx`.
      // Le halo BAT tant que la demande n'est pas arbitrée : ce bouton est toujours là, seule sa
      // teinte changeait — un MJ en plein combat pouvait ne jamais voir qu'un joueur attendait.
      sx={[
        ...(Array.isArray(buttonSx) ? buttonSx : [buttonSx]),
        ...(pendingRequests > 0 ? [(theme: Theme) => attentionPulseSx(theme, 'warning')] : []),
      ]}
    >
      Repos de groupe
      {proposal && proposal.status === 'open' && ` (${answered}/${proposal.participants.length})`}
      {pendingRequests > 0 &&
        ` (${pendingRequests} demande${pendingRequests > 1 ? 's' : ''})`}
    </Button>
  );

  return (
    <>
      {sessionActive ? (
        button
      ) : (
        // `AppTooltip` sur un bouton désactivé : le `span` intercepte le survol à sa place.
        <AppTooltip title="Démarrez une session de table pour proposer un repos à toute la table">
          <span>{button}</span>
        </AppTooltip>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>
          {proposal === null
            ? 'Proposer un repos à la table'
            : `${REST_KIND_LABEL[proposal.kind].replace(/^./, (c) => c.toUpperCase())}${
                proposal.status === 'applied' ? ' — appliquée' : ' en cours'
              }`}
        </DialogTitle>
        <DialogContent>
          {proposal === null ? (
            <Stack spacing={2} sx={{ mt: 0.5 }}>
              {/* Demandes de joueurs (PER-313) : les adopter ouvre la proposition à leur nom, les
                  refuser n'avertit qu'eux. La scène reste au MJ. */}
              {requests.length > 0 && (
                <Stack spacing={1}>
                  {requests.map((request) => (
                    <Box
                      key={request.id}
                      sx={(theme) => ({
                        p: 1,
                        borderRadius: 1,
                        border: 1,
                        borderColor: alpha(theme.palette.warning.main, 0.5),
                        // Teinte très diluée : une demande attire l'œil sans crier.
                        bgcolor: alpha(theme.palette.warning.main, 0.08),
                      })}
                    >
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {restRequestHeadline(request)}
                      </Typography>
                      <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                        <Button size="small" variant="contained" onClick={() => adopt(request.id)}>
                          Adopter
                        </Button>
                        <Button
                          size="small"
                          color="inherit"
                          onClick={() => declineRequest(campaignId, request.id)}
                        >
                          Refuser
                        </Button>
                      </Stack>
                    </Box>
                  ))}
                  <Typography variant="caption" color="text.secondary">
                    Adopter ouvre la pause chez toute la table, au nom du demandeur — vous gardez le
                    top de validation. Refuser n’avertit que lui.
                  </Typography>
                </Stack>
              )}
              <Typography variant="body2" color="text.secondary">
                Le temps est collectif : si le groupe s’arrête, la pause passe pour tout le monde.
                Chaque joueur décide ensuite, depuis sa fiche, s’il dépense ses dés de récupération
                et son mana ou s’il laisse simplement passer le temps <SourceRef page={221} />.
              </Typography>
              {/* Seuls les joueurs connectés sont convoqués : les autres (fiche papier, app fermée)
                  ne rempliraient jamais le relevé. Avertissement NON bloquant — le MJ peut ouvrir la
                  pause quand même, la présence peut n'être qu'en cours de synchronisation. */}
              {tableCharacters.length === 0 ? (
                <AppAlert severity="info">
                  Aucun personnage de cette campagne n’est réclamé par un joueur : personne ne
                  recevra la proposition.
                </AppAlert>
              ) : participants.length === 0 ? (
                <AppAlert severity="warning">
                  Aucun joueur n’est connecté à la session : personne ne recevra la proposition.
                </AppAlert>
              ) : (
                <Typography variant="caption" color="text.secondary">
                  {participants.length === 1
                    ? '1 joueur connecté sera convoqué'
                    : `${participants.length} joueurs connectés seront convoqués`}
                  {participants.length < tableCharacters.length &&
                    ` (${tableCharacters.length - participants.length} hors ligne, ignoré${
                      tableCharacters.length - participants.length > 1 ? 's' : ''
                    })`}
                  .
                </Typography>
              )}
              <Stack spacing={1}>
                <Button
                  variant="contained"
                  startIcon={<TimerIcon />}
                  onClick={() => startProposal('short')}
                >
                  Récupération rapide ({REST_KIND_DURATION.short})
                </Button>
                <Button
                  variant="contained"
                  startIcon={<HotelIcon />}
                  onClick={() => startProposal('long')}
                >
                  Repos long ({REST_KIND_DURATION.long})
                </Button>
              </Stack>
            </Stack>
          ) : proposal.status === 'applied' ? (
            <Stack spacing={2} sx={{ mt: 0.5 }}>
              <Typography variant="body2" color="text.secondary">
                Les récupérations ont été appliquées sur les fiches concernées.
              </Typography>
              <RestTallyList proposal={proposal} />
            </Stack>
          ) : (
            <Stack spacing={2} sx={{ mt: 0.5 }}>
              <Typography variant="body2" color="text.secondary">
                Chaque joueur annonce son intention depuis sa fiche. <strong>Rien n’est encore
                appliqué</strong> : les récupérations partent toutes ensemble quand vous validez, et
                annuler ne laisse personne reposé.
              </Typography>
              <RestTallyList proposal={proposal} />
              {tally && tally.pending.length > 0 && (
                <Typography variant="caption" color="text.secondary">
                  {tally.pending.length === 1
                    ? '1 personnage n’a pas répondu'
                    : `${tally.pending.length} personnages n’ont pas répondu`}{' '}
                  — un joueur qui s’est déconnecté depuis ne bloque rien, vous pouvez valider sans
                  lui.
                </Typography>
              )}
              {hasStatuses && (
                <Box>
                  <FormControlLabel
                    control={
                      <Checkbox
                        size="small"
                        checked={purgeStatuses}
                        onChange={(e) => setPurgeStatuses(e.target.checked)}
                      />
                    }
                    label="Purger les états de combat en validant"
                  />
                  <Typography variant="caption" color="text.secondary" component="p">
                    Les badges posés sur les combattants du tracker sont retirés. Décochez pour
                    conserver un état qui survit à la pause.
                  </Typography>
                </Box>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          {proposal === null && <Button onClick={() => setOpen(false)}>Fermer</Button>}
          {proposal?.status === 'open' && (
            <>
              <Button onClick={() => setOpen(false)}>Réduire</Button>
              <Button color="error" onClick={dismissProposal}>
                Annuler la pause
              </Button>
              <Button variant="contained" onClick={validate}>
                Valider la pause
              </Button>
            </>
          )}
          {proposal?.status === 'applied' && (
            <Button variant="contained" onClick={dismissProposal}>
              Terminer
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </>
  );
}
