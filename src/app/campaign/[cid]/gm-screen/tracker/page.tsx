'use client';

/**
 * Fenêtre « présentation » du tracker d'initiative (PER-248) — route dédiée
 * `/campaign/[cid]/gm-screen/tracker`, **owner-only** (gating proxy `/campaign/*`
 * hérité : même origine, même session que la fenêtre principale). Ouverte via
 * `window.open` depuis l'écran de MJ pour être affichée sur un SECOND écran pendant
 * une partie.
 *
 * Elle rend UNIQUEMENT le tracker d'initiative, avec les PV en LECTURE SEULE (ils se
 * modifient depuis la fenêtre principale) mais un bouton « Tour suivant » fonctionnel —
 * le tour courant est suivi LOCALEMENT à cette fenêtre (indépendant de la principale).
 * Elle reste synchronisée en direct pour le reste :
 *  - l'état du combat (créatures, PV créatures) via l'événement `storage` déjà écouté
 *    par `useGmCombatState` (partagé par `useGmScreenCombat`) ;
 *  - les PV des personnages via une réhydratation du store des personnages sur le même
 *    événement `storage` (le middleware `persist` écrit la clé `cof2-characters` à chaque
 *    modification dans la fenêtre principale — cf. `useCharacterStoreSync`).
 *
 * Fond sombre uni (pas l'illustration `HomeBackground`, calibrée en `vh` et dégradée
 * sur les formats larges/courts de cette fenêtre) : la fenêtre est panoramique
 * (pleine largeur d'écran, hauteur réduite) pour aligner les combattants sur une rangée.
 *
 * Lecture de l'état APRÈS montage (client-only, pas de rendu serveur de l'état local) —
 * même contrat que la page complète.
 */
import { use, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { InitiativeTracker } from '@/components/campaign/InitiativeTracker';
import { useGmScreenCombat } from '../useGmScreenCombat';
import { useCharacterStoreSync } from './useCharacterStoreSync';

export default function GmTrackerWindowPage({ params }: { params: Promise<{ cid: string }> }) {
  const { cid } = use(params);
  const { charactersHydrated, campaignsLoading, campaign, initiativeRows } =
    useGmScreenCombat(cid);

  // Réhydrate le store des personnages quand la fenêtre principale écrit leurs PV.
  useCharacterStoreSync();

  // Tour courant LOCAL à cette fenêtre (le proprio accepte qu'il diverge de la fenêtre
  // principale) : la fenêtre présentation est ainsi pleinement utilisable en autonomie.
  const [turnKey, setTurnKey] = useState<string | null>(null);

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
            currentTurnKey={turnKey}
            onCurrentTurnKeyChange={setTurnKey}
            readOnly
            hideTitle
          />
        )}
      </Box>
    </>
  );
}
