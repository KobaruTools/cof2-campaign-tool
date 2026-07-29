'use client';

/**
 * Fenêtre « présentation » du tracker d'initiative (PER-248) — route dédiée
 * `/campaign/[cid]/gm-screen/tracker`, **owner-only** (gating proxy `/campaign/*`
 * hérité : même origine, même session que la fenêtre principale). Ouverte via
 * `window.open` depuis l'écran de MJ pour être affichée sur un SECOND écran pendant
 * une partie.
 *
 * Vue de PROJECTION destinée à être affichée pour les joueurs : elle ne montre que
 * portrait + initiative + identité, dans un mode `projection` qui masque tout ce qui est
 * réservé au MJ ou superflu — barres de PV (joueurs ET créatures), NC des créatures,
 * en-tête et bouton « Tour suivant » — et masque les créatures camouflées (`visible:false`).
 *
 * CLIENT DE SESSION (PER-268) — elle rejoint le canal Realtime `session:<cid>` comme
 * n'importe quel appareil de joueur, au lieu de dépendre de l'événement `storage` du même
 * navigateur (retiré). Tout se pilote depuis l'écran de MJ ; cette fenêtre ne fait que
 * refléter, EN DIRECT pendant une session active :
 *  - l'état du combat (créatures, PV, tour courant, visibilité) via le broadcast `combat-state`
 *    du MJ (auteur unique) → store `campaignCombat` (d'où le tour courant SYNCHRONISÉ et la mise
 *    en évidence du combattant actif) ;
 *  - les PV des personnages via le broadcast `game-state` (MJ ET joueurs, cross-device) →
 *    store `characters`, plus une lecture autoritative (`load({force})`) à l'abonnement.
 * Elle est en LECTURE SEULE (aucune commande d'écriture câblée) et rejoint avec l'identité
 * `kind: 'projection'` : EXCLUE de la liste des connectés ET du journal des participants
 * (c'est un écran, pas une personne), et sans battement (`heartbeat: false`) → elle ne
 * maintient pas la session en vie (la session peut mourir « vide »).
 *
 * Hors session : aucun socket. L'état affiché est celui chargé au montage
 * (`useGmScreenCombat` charge persos + combat), rafraîchi au (re)chargement.
 *
 * Fond sombre uni (pas l'illustration `HomeBackground`, calibrée en `vh` et dégradée
 * sur les formats larges/courts de cette fenêtre) : la fenêtre est panoramique
 * (pleine largeur d'écran, hauteur réduite) pour aligner les combattants sur une rangée.
 *
 * Lecture de l'état APRÈS montage (client-only, pas de rendu serveur de l'état local) —
 * même contrat que la page complète.
 */
import { use } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { InitiativeTracker } from '@/components/campaign/InitiativeTracker';
import { useActiveSession } from '@/lib/session/useActiveSession';
import { useSessionChannel, type SessionIdentity } from '@/lib/session/useSessionChannel';
import { useGmScreenCombat } from '../useGmScreenCombat';

/** Le tour se pilote depuis l'écran de MJ : la projection ne le modifie jamais. */
const noop = () => {};

/**
 * Identité de la fenêtre projetée sur le canal : un écran, pas une personne. Le marqueur
 * `kind: 'projection'` l'exclut de la présence affichée et du journal des participants.
 */
const PROJECTION_IDENTITY: SessionIdentity = {
  kind: 'projection',
  playerId: null,
  name: 'Projection',
};

export default function GmTrackerWindowPage({ params }: { params: Promise<{ cid: string }> }) {
  const { cid } = use(params);
  const { charactersHydrated, campaignsLoading, campaign, initiativeRows, currentTurnKey } =
    useGmScreenCombat(cid, 'reader');

  // Client de session (PER-268) : rejoint le canal Realtime pour recevoir en direct le combat
  // et les PV des persos, comme un appareil de joueur. `heartbeat: false` — la projection est
  // un écran, elle ne maintient pas la session en vie. Lecture seule (aucune émission de delta).
  const { session } = useActiveSession(cid, { heartbeat: false });
  useSessionChannel(cid, session, PROJECTION_IDENTITY);

  const loading = !charactersHydrated || campaignsLoading;

  return (
    <>
      {/* `<title>` (onglet du navigateur uniquement, non rendu dans la vue) : sert à
          identifier la fenêtre. La vue elle-même est volontairement DÉPOUILLÉE — pas de
          fond décoratif, pas de titre visible, pas de footer (masqué via AppFooter). */}
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
