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
 * en-tête et bouton « Tour suivant ». Tout se pilote depuis l'écran de MJ ; cette fenêtre
 * ne fait que refléter, en direct :
 *  - l'état du combat (créatures, tour courant) via l'événement `storage` déjà écouté par
 *    `useGmCombatState` (partagé par `useGmScreenCombat`) — d'où le tour courant SYNCHRONISÉ
 *    depuis la fenêtre principale (mise en évidence du combattant actif) ;
 *  - les PV des personnages via une réhydratation du store des personnages sur le même
 *    événement `storage` (le middleware `persist` écrit la clé `cof2-characters` à chaque
 *    modification — cf. `useCharacterStoreSync`) : utile au calcul même si les PV ne sont
 *    plus affichés ici.
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
import { useGmScreenCombat } from '../useGmScreenCombat';
import { useCharacterStoreSync } from './useCharacterStoreSync';

/** Le tour se pilote depuis l'écran de MJ : la projection ne le modifie jamais. */
const noop = () => {};

export default function GmTrackerWindowPage({ params }: { params: Promise<{ cid: string }> }) {
  const { cid } = use(params);
  const { charactersHydrated, campaignsLoading, campaign, initiativeRows, currentTurnKey } =
    useGmScreenCombat(cid);

  // Réhydrate le store des personnages quand la fenêtre principale écrit leurs PV.
  useCharacterStoreSync();

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
