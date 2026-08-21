'use client';

/**
 * Annoncer au MJ un effet de groupe, côté JOUEUR (PER-358) — le bouton posé dans « État du
 * personnage », sous le rappel des effets en cours.
 *
 * À la table, c'est le barde qui décide de chanter, pas le MJ. Mais la sécurité de la base fait du MJ
 * l'**auteur unique** de l'état de combat : un joueur ne peut pas poser un bonus sur ses camarades, et
 * l'arbitrage du propriétaire est de ne pas élargir ces droits. Ce bouton n'écrit donc rien — il
 * ANNONCE. Le MJ voit la demande sur son écran, l'adopte (sa fenêtre de pose habituelle s'ouvre,
 * pré-remplie au nom du lanceur) ou la refuse, auquel cas le demandeur — et lui seul — en est averti.
 *
 * N'apparaît que si le personnage confère au moins un effet de groupe (`groupBuffsOf`) et qu'une
 * session est en cours : hors session le canal est fermé, personne ne recevrait l'annonce.
 *
 * Une fois l'effet posé, l'annonce s'efface d'elle-même : l'état est arrivé sur la fiche, il répond
 * mieux qu'un accusé de réception. C'est une dérivation, pas un effet — rien à remettre à zéro.
 */
import { useState } from 'react';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { AppAlert } from '@/components/AppAlert';
import { SourceRef } from '@/components/SourceRef';
import { groupBuffsOf } from '@/lib/character/groupBuffs';
import { statusEntry } from '@/lib/character/statusEffects';
import { statusLabel } from '@/lib/ui/statusPalette';
import { useBuffRequestStore } from '@/stores/buffRequest';
import type { BeneficialEffectId } from '@/data/schema';

export interface BuffRequestControlProps {
  /** Campagne du personnage — porte la session et la demande. */
  campaignId: string;
  /** Personnage au nom duquel l'annonce est faite (le MJ s'en sert comme LANCEUR présumé). */
  characterId: string;
  /** Nom du personnage : c'est lui qui nommera la demande chez le MJ (« Aria lance… »). */
  characterName: string;
  /** Capacités acquises — elles seules disent quels effets de groupe ce personnage confère. */
  featureIds: readonly string[];
  /** États DÉJÀ posés sur ce personnage : un effet déjà en place a répondu à l'annonce. */
  appliedStatusIds: readonly string[];
  /** Une session de table est-elle en cours ? Hors session, rien ne s'affiche. */
  sessionActive: boolean;
}

export function BuffRequestControl({
  campaignId,
  characterId,
  characterName,
  featureIds,
  appliedStatusIds,
  sessionActive,
}: BuffRequestControlProps) {
  const [open, setOpen] = useState(false);
  const mine = useBuffRequestStore((s) => s.myRequestByCampaign[campaignId] ?? null);
  const requestBuff = useBuffRequestStore((s) => s.requestBuff);
  const dismissMyRequest = useBuffRequestStore((s) => s.dismissMyRequest);

  const carriers = groupBuffsOf(featureIds);
  // Hors session, ou sans aucun effet de groupe à annoncer : il n'y a rien à demander.
  if (!sessionActive || carriers.length === 0) return null;

  const declined = mine?.status === 'declined';
  // L'effet demandé est arrivé sur la fiche : le MJ a posé, l'annonce n'a plus d'objet.
  const fulfilled =
    mine !== null && mine.status === 'sent' && appliedStatusIds.includes(mine.request.buffId);
  const pending = mine !== null && !declined && !fulfilled;
  // Le refus s'impose de lui-même : le joueur doit savoir qu'il a été entendu, même s'il avait
  // refermé la fenêtre. Le fermer range la demande, ce qui referme la fenêtre par la même occasion.
  const dialogOpen = open || declined;

  const close = () => {
    setOpen(false);
    if (declined) dismissMyRequest(campaignId);
  };

  const announce = (buffId: BeneficialEffectId) => {
    requestBuff(campaignId, buffId, characterName, characterId);
    setOpen(false);
  };

  const buffButtons = (
    <Stack spacing={1}>
      {carriers.map((carrier) => {
        const entry = statusEntry(carrier.buffId);
        return (
          <Stack key={carrier.buffId} spacing={0.25}>
            <Button
              variant="contained"
              color="success"
              startIcon={<AutoAwesomeIcon />}
              onClick={() => announce(carrier.buffId)}
            >
              {statusLabel(carrier.buffId)}
            </Button>
            {/* Verbatim du livre + renvoi de page : jamais de règle affichée sans sa source. */}
            {entry && (
              <Typography variant="caption" color="text.secondary">
                {entry.effect} <SourceRef page={entry.sourcePage} term={statusLabel(carrier.buffId)} />
              </Typography>
            )}
          </Stack>
        );
      })}
    </Stack>
  );

  return (
    <>
      <Button
        size="small"
        variant="outlined"
        color={declined ? 'warning' : 'success'}
        startIcon={<AutoAwesomeIcon />}
        onClick={() => setOpen(true)}
        data-glossary-shot="BuffRequestControl"
      >
        {declined ? 'Effet refusé' : pending ? 'Annonce envoyée' : 'Annoncer un effet au groupe'}
      </Button>

      <Dialog open={dialogOpen} onClose={close} maxWidth="xs" fullWidth>
        <DialogTitle>{declined ? 'Effet non posé' : 'Annoncer un effet au groupe'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 0.5 }}>
            {declined ? (
              <>
                <AppAlert severity="warning">
                  Le MJ n’a pas posé cet effet : la scène ne s’y prête pas, ou tes alliés sont hors de
                  portée. Rien n’a changé sur ta fiche.
                </AppAlert>
                <Typography variant="caption" color="text.secondary">
                  Tu peux annoncer de nouveau :
                </Typography>
                {buffButtons}
              </>
            ) : pending ? (
              <>
                <Typography variant="body2" color="text.secondary">
                  Ton annonce est partie au MJ. C’est lui qui pose l’effet : il choisit qui, dans le
                  camp, est à portée. Dès qu’il l’a fait, l’effet apparaît ici même, au-dessus de ta
                  barre de vie.
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Tu peux encore changer d’effet annoncé :
                </Typography>
                {buffButtons}
              </>
            ) : (
              <>
                <Typography variant="body2" color="text.secondary">
                  Tu annonces ce que tu lances ; le MJ le pose sur le camp. Ce n’est pas une
                  formalité : lui seul sait qui est à portée de voix, et c’est lui qui tient les états
                  de combat de la table.
                </Typography>
                {buffButtons}
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
