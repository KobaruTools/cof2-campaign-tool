'use client';

/**
 * Corps PARTAGÉ de la vue de projection du tracker d'initiative — source unique du rendu
 * « fenêtre projetée » (PER-248/PER-268) pour garantir un affichage RIGOUREUSEMENT
 * identique entre :
 *  - la fenêtre owner ouverte via `window.open` (`/campaign/[cid]/gm-screen/tracker`), et
 *  - le lien de projection partageable cross-machine (`/project`, PER-271).
 *
 * Vue DÉPOUILLÉE, destinée à être affichée pour les joueurs : portrait + initiative +
 * identité, plus un bandeau fin de jauges PV + mana sur les PERSONNAGES (PER-296), en mode
 * `projection` (qui masque la jauge de PV interactive, les PV et le NC des créatures,
 * l'en-tête et le bouton « Tour suivant », et les créatures camouflées `visible:false`).
 * Pas de fond décoratif, pas de titre visible, pas de footer (le pied de page global se
 * masque sur ces routes via `AppFooter`).
 *
 * CLIENT DE SESSION (PER-268) : rejoint le canal Realtime `session:<cid>` comme n'importe
 * quel appareil, avec l'identité `kind: 'projection'` (EXCLUE de la présence et du journal —
 * c'est un écran, pas une personne) et SANS battement (`heartbeat: false` → ne maintient pas
 * la session en vie). En LECTURE SEULE : reflète en direct le combat diffusé par le MJ
 * (`combat-state`, d'où le tour courant synchronisé) et les PV des persos (`game-state`),
 * plus une lecture autoritative (`load({force})`) à l'abonnement. Hors session : aucun socket,
 * on affiche le dernier état chargé au montage.
 */
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { InitiativeTracker } from '@/components/campaign/InitiativeTracker';
import { useActiveSession } from '@/lib/session/useActiveSession';
import { useSessionChannel, type SessionIdentity } from '@/lib/session/useSessionChannel';
import { useGmScreenCombat } from '@/app/campaign/[cid]/gm-screen/useGmScreenCombat';

/** Le tour se pilote depuis l'écran de MJ : la projection ne le modifie jamais. */
const noop = () => {};

/**
 * Identité de la projection sur le canal : un écran, pas une personne. Le marqueur
 * `kind: 'projection'` l'exclut de la présence affichée et du journal des participants.
 */
const PROJECTION_IDENTITY: SessionIdentity = {
  kind: 'projection',
  playerId: null,
  name: 'Projection',
};

export function ProjectionTrackerView({ cid }: { cid: string }) {
  const { charactersHydrated, campaignsLoading, campaign, initiativeRows, currentTurnKey } =
    useGmScreenCombat(cid, 'reader');

  // Client de session : rejoint le canal Realtime pour recevoir en direct le combat et les PV
  // des persos. `heartbeat: false` — un écran ne maintient pas la session en vie. Lecture seule.
  const { session } = useActiveSession(cid, { heartbeat: false });
  useSessionChannel(cid, session, PROJECTION_IDENTITY);

  const loading = !charactersHydrated || campaignsLoading;

  return (
    <>
      {/* `<title>` (onglet du navigateur uniquement, non rendu dans la vue) : identifie la
          fenêtre/onglet. La vue elle-même est volontairement DÉPOUILLÉE. */}
      <title>
        {campaign
          ? `Tracker — ${campaign.name} — Éditeur de personnage CO2`
          : 'Tracker de combat — Éditeur de personnage CO2'}
      </title>
      <Box sx={{ p: { xs: 1.5, sm: 2 } }}>
        {loading ? (
          <Typography color="text.secondary" sx={{ fontStyle: 'italic' }}>
            Chargement du combat…
          </Typography>
        ) : (
          <InitiativeTracker
            rows={initiativeRows}
            currentTurnKey={currentTurnKey}
            onCurrentTurnKeyChange={noop}
            projection
          />
        )}
      </Box>
    </>
  );
}
