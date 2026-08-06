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
 * les durées d'effets) et un joueur absent ou déconnecté ne bloque rien.
 *
 * En validant, le MJ peut **purger les états de combat** du tracker : le groupe a soufflé une
 * demi-heure ou dormi une nuit, ses états de durée n'ont plus lieu d'être. Coché par défaut, mais
 * jamais automatique — le MJ peut vouloir conserver un poison ou une malédiction qui survit à la nuit.
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
import type { SxProps, Theme } from '@mui/material/styles';
import { AppAlert } from '@/components/AppAlert';
import { AppTooltip } from '@/components/AppTooltip';
import { SourceRef } from '@/components/SourceRef';
import { RestTallyList } from '@/components/session/RestTallyList';
import { clearAllStatuses } from '@/lib/session/combatState';
import {
  REST_KIND_DURATION,
  REST_KIND_LABEL,
  restProposalAnsweredCount,
  restProposalTally,
  type RestKind,
} from '@/lib/session/restProposal';
import { useCampaignCombatStore } from '@/stores/campaignCombat';
import { useRestProposalStore } from '@/stores/restProposal';

/** Un personnage de la table, tel qu'il apparaît dans le relevé des réponses. */
export interface GroupRestTableCharacter {
  id: string;
  name: string;
  /** Nom du joueur qui l'incarne (le relevé dit qui n'a pas encore répondu). */
  playerName?: string;
}

export interface GroupRestControlProps {
  campaignId: string;
  /** Personnages réclamés par un joueur — la table attendue au relevé. */
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
  const applyLocalCombat = useCampaignCombatStore((s) => s.applyLocalCombat);
  // Y a-t-il seulement des états à purger ? Sans état posé, la case n'aurait rien à proposer.
  const hasStatuses = useCampaignCombatStore(
    (s) => Object.keys(s.byCampaign[campaignId]?.statuses ?? {}).length > 0,
  );

  const answered = proposal ? restProposalAnsweredCount(proposal) : 0;
  const tally = proposal ? restProposalTally(proposal) : null;

  const startProposal = (kind: RestKind) => {
    propose(
      campaignId,
      kind,
      'Le MJ',
      tableCharacters.map((c) => ({
        characterId: c.id,
        name: c.name,
        ...(c.playerName ? { playerName: c.playerName } : {}),
      })),
    );
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

  const button = (
    <Button
      variant="outlined"
      size="small"
      startIcon={<HotelIcon />}
      onClick={() => setOpen(true)}
      disabled={!sessionActive}
      sx={buttonSx}
    >
      Repos de groupe
      {proposal && proposal.status === 'open' && ` (${answered}/${tableCharacters.length})`}
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
              <Typography variant="body2" color="text.secondary">
                Le temps est collectif : si le groupe s’arrête, la pause passe pour tout le monde.
                Chaque joueur décide ensuite, depuis sa fiche, s’il dépense ses dés de récupération
                et son mana ou s’il laisse simplement passer le temps <SourceRef page={221} />.
              </Typography>
              {tableCharacters.length === 0 && (
                <AppAlert severity="info">
                  Aucun personnage de cette campagne n’est réclamé par un joueur : personne ne
                  recevra la proposition.
                </AppAlert>
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
                  — un joueur absent ou déconnecté ne bloque rien, vous pouvez valider sans lui.
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
