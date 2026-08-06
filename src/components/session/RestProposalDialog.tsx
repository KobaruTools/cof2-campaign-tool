'use client';

/**
 * Repos de groupe côté JOUEUR (PER-312) — la fenêtre qui s'ouvre sur la fiche quand le MJ propose
 * une récupération à toute la table.
 *
 * Le temps, lui, est déjà passé : la question posée au joueur n'est pas « acceptes-tu la pause ? »
 * mais « dépenses-tu tes dés de récupération et ton mana ? ». D'où deux issues seulement, et aucune
 * façon de bloquer la table.
 *
 * **Rien n'est appliqué à la réponse.** Le joueur PRÉPARE sa récupération (mêmes modales que sur sa
 * fiche : `ShortRestDialog` / `LongRestDialog`, mêmes règles, mêmes saisies — le résultat du dé se
 * lance à la vraie table), puis il patiente devant le relevé de la table, exactement celui que voit
 * le MJ. Le soin ne touche la fiche qu'au top du MJ. Sans ce palier, annuler une pause en cours de
 * route laissait les premiers à répondre soignés et les autres non — un état de table incohérent.
 *
 * À ne monter que pour le joueur qui incarne réellement le personnage : le MJ, lui, pilote la
 * proposition depuis son écran (`GroupRestControl`), et sa vue d'une fiche n'a pas à être interrompue.
 */
import { useEffect, useRef, useState } from 'react';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { Die } from '@/data/schema';
import { AppAlert } from '@/components/AppAlert';
import { SourceRef } from '@/components/SourceRef';
import { LongRestDialog } from '@/components/sheet/LongRestDialog';
import { ShortRestDialog } from '@/components/sheet/ShortRestDialog';
import { RestTallyList } from '@/components/session/RestTallyList';
import {
  REST_KIND_DURATION,
  REST_KIND_LABEL,
  restProposalHeadline,
} from '@/lib/session/restProposal';
import { useRestProposalStore } from '@/stores/restProposal';

/**
 * Récupération préparée mais PAS ENCORE appliquée : les saisies du joueur mises de côté en attendant
 * le top du MJ. Purement locale, jamais diffusée — la table n'a pas à savoir combien tu as fait à
 * ton dé, seulement que tu comptes le dépenser.
 */
type PreparedRest =
  | { kind: 'short'; recoveryDieRoll: number | null }
  | { kind: 'long'; heal: boolean };

export interface RestProposalDialogProps {
  /** Campagne du personnage — porte la proposition en cours. */
  campaignId: string;
  /** Personnage pour lequel ce client répond. */
  characterId: string;
  /** Type du dé de récupération du profil (d6/d8/d10). */
  recoveryDie: Die;
  /** Réserve maximale de dés de récupération. */
  recoveryDiceMax: number;
  /** Dés de récupération encore disponibles. */
  recoveryDiceCurrent: number;
  level: number;
  /** Dégâts létaux courants (le soin de repos long n'est proposé que s'il y a de quoi soigner). */
  lethalDamage: number;
  /** Doses d'élixir qu'un repos long ferait perdre (p. 98). */
  elixirDosesToLose?: number;
  /** Applique la récupération rapide (résultat du dé saisi, ou `null` pour un repos sans soin). */
  onShortRest: (recoveryDieRoll: number | null) => void;
  /** Applique le repos long (`heal` = dépenser le DR gagné pour un soin à la valeur max). */
  onLongRest: (heal: boolean) => void;
}

export function RestProposalDialog({
  campaignId,
  characterId,
  recoveryDie,
  recoveryDiceMax,
  recoveryDiceCurrent,
  level,
  lethalDamage,
  elixirDosesToLose = 0,
  onShortRest,
  onLongRest,
}: RestProposalDialogProps) {
  const proposal = useRestProposalStore((s) => s.byCampaign[campaignId] ?? null);
  const respond = useRestProposalStore((s) => s.respond);
  // La modale de repos ordinaire est-elle ouverte par-dessus l'annonce ?
  const [preparing, setPreparing] = useState(false);
  // Fenêtre écartée, repérée par proposition ET par phase : réduire la salle d'attente ne doit pas
  // escamoter le récapitulatif qui arrive au top du MJ. Une nouvelle proposition la ramène aussi.
  const [dismissedKey, setDismissedKey] = useState<string | null>(null);
  /**
   * Récupération préparée, en attente du top. Gardée dans une REF et non dans un état : le rendu
   * n'en dépend pas (c'est la réponse diffusée qui pilote l'affichage), et l'effet d'application
   * doit pouvoir la consommer de façon atomique — le StrictMode de développement rejoue les effets,
   * sans ce verrou le soin serait appliqué deux fois.
   */
  const preparedRef = useRef<PreparedRest | null>(null);
  /** Proposition dont le top a déjà été traité par ce client. */
  const appliedIdRef = useRef<string | null>(null);

  const status = proposal?.status ?? null;
  const proposalId = proposal?.id ?? null;

  // Proposition annulée, clôturée ou remplacée : la récupération préparée pour la précédente est
  // caduque et part avec elle — personne ne s'est reposé, c'est ce que garantit le palier.
  useEffect(() => {
    preparedRef.current = null;
  }, [proposalId]);

  // Top du MJ : on applique enfin la récupération préparée. Une seule fois par proposition, même si
  // l'instantané « appliquée » est rediffusé (arrivée en cours, reconnexion, StrictMode).
  useEffect(() => {
    if (status !== 'applied' || !proposalId) return;
    if (appliedIdRef.current === proposalId) return;
    appliedIdRef.current = proposalId;
    const toApply = preparedRef.current;
    preparedRef.current = null;
    if (!toApply) return;
    if (toApply.kind === 'short') onShortRest(toApply.recoveryDieRoll);
    else onLongRest(toApply.heal);
  }, [status, proposalId, onShortRest, onLongRest]);

  if (!proposal) return null;

  const myOutcome = proposal.responses[characterId]?.outcome;
  const dismissKey = `${proposal.id}:${proposal.status}`;
  const dismissed = dismissKey === dismissedKey;
  const dismiss = () => setDismissedKey(dismissKey);

  const decline = () => {
    preparedRef.current = null;
    setPreparing(false);
    respond(campaignId, characterId, 'declined');
  };

  const prepare = (rest: PreparedRest) => {
    preparedRef.current = rest;
    setPreparing(false);
    respond(campaignId, characterId, 'accepted');
  };

  /**
   * Les modales de repos ORDINAIRES de la fiche, réutilisées telles quelles pour la préparation :
   * le repos de groupe ne réinvente aucune règle, il synchronise seulement l'instant. Montées quel
   * que soit l'écran affiché — le joueur peut revenir sur sa récupération tant que le top n'est pas
   * donné.
   */
  const preparationDialog =
    proposal.kind === 'short' ? (
      <ShortRestDialog
        open={preparing}
        onClose={() => setPreparing(false)}
        recoveryDiceCurrent={recoveryDiceCurrent}
        recoveryDie={recoveryDie}
        level={level}
        onConfirm={(recoveryDieRoll) => prepare({ kind: 'short', recoveryDieRoll })}
      />
    ) : (
      <LongRestDialog
        open={preparing}
        onClose={() => setPreparing(false)}
        recoveryDie={recoveryDie}
        recoveryDiceMax={recoveryDiceMax}
        level={level}
        lethalDamage={lethalDamage}
        elixirDosesToLose={elixirDosesToLose}
        onConfirm={(heal) => prepare({ kind: 'long', heal })}
      />
    );

  // ── Le top est donné : court récapitulatif, pour que le joueur sache ce qui vient de lui arriver.
  if (proposal.status === 'applied') {
    // Jamais répondu (fenêtre écartée, joueur absent) : rien ne s'est appliqué, rien à dire.
    if (!myOutcome) return null;
    return (
      <Dialog open={!dismissed} onClose={() => dismiss()} maxWidth="xs" fullWidth>
        <DialogTitle>
          {REST_KIND_LABEL[proposal.kind].replace(/^./, (c) => c.toUpperCase())} — c’est fait
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 0.5 }}>
            <Typography variant="body2" color="text.secondary">
              {myOutcome === 'accepted'
                ? 'Le MJ a validé la pause : ta récupération vient d’être appliquée sur ta fiche.'
                : 'Le MJ a validé la pause. Tu as laissé passer : rien n’a changé sur ta fiche.'}
            </Typography>
            <RestTallyList proposal={proposal} ownCharacterId={characterId} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="contained" onClick={() => dismiss()}>
            Fermer
          </Button>
        </DialogActions>
      </Dialog>
    );
  }

  // ── Réponse donnée : salle d'attente, avec le relevé que voit le MJ.
  if (myOutcome) {
    return (
      <>
        <Dialog
          open={!preparing && !dismissed}
          onClose={() => dismiss()}
          maxWidth="xs"
          fullWidth
        >
          <DialogTitle>En attente de la table</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 0.5 }}>
              <Typography variant="body2" color="text.secondary">
                {myOutcome === 'accepted'
                  ? 'Ta récupération est prête : elle s’appliquera quand le MJ validera la pause. Rien n’a encore changé sur ta fiche.'
                  : 'Tu laisses passer la pause : rien ne s’appliquera sur ta fiche.'}
              </Typography>
              <RestTallyList proposal={proposal} ownCharacterId={characterId} />
              <Typography variant="caption" color="text.secondary">
                Le MJ peut encore annuler : dans ce cas personne ne se sera reposé.
              </Typography>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => dismiss()}>Réduire</Button>
            {myOutcome === 'accepted' ? (
              <>
                <Button onClick={decline}>Laisser passer</Button>
                <Button onClick={() => setPreparing(true)}>Modifier</Button>
              </>
            ) : (
              <Button variant="contained" onClick={() => setPreparing(true)}>
                Finalement, je récupère
              </Button>
            )}
          </DialogActions>
        </Dialog>
        {preparationDialog}
      </>
    );
  }

  // ── Avant toute réponse : l'annonce.
  return (
    <>
      <Dialog
        open={!preparing && !dismissed}
        onClose={() => dismiss()}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>{restProposalHeadline(proposal)}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 0.5 }}>
            <Typography variant="body2" color="text.secondary">
              Le groupe s’arrête {REST_KIND_DURATION[proposal.kind]} : le temps passe pour tout le
              monde <SourceRef page={221} />. À toi de décider si tu en profites pour récupérer, ou
              si tu laisses simplement passer la pause.
            </Typography>
            <AppAlert severity="info">
              Ta réponse n’applique rien tout de suite : la table se met d’accord, puis le MJ valide.
            </AppAlert>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => dismiss()}>Plus tard</Button>
          <Button onClick={decline}>Laisser passer</Button>
          <Button variant="contained" onClick={() => setPreparing(true)}>
            Récupérer
          </Button>
        </DialogActions>
      </Dialog>
      {preparationDialog}
    </>
  );
}
