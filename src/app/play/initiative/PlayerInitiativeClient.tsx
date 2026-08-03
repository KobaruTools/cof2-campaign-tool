'use client';

/**
 * Écran DISTANT de l'ordre d'initiative pour les JOUEURS (PER-293) — pendant du tracker
 * projeté du MJ (`/campaign/[cid]/gm-screen/tracker`, PER-248), mais servi côté joueur sous
 * `/play/initiative` pour hériter des autorisations joueur (proxy `updateSession`) SANS
 * élargir le gating. Le MJ partage le lien `<origine>/play/initiative` à sa table ; chaque
 * joueur (session anonyme du lien magique) y voit l'ordre d'initiative de SA campagne se
 * mettre à jour EN DIRECT.
 *
 * Même vue de PROJECTION en LECTURE SEULE que la fenêtre du MJ : portrait + nom + initiative,
 * PV et NC masqués, créatures camouflées (`visible:false`) filtrées. Aucune commande d'écriture
 * n'est câblée (le joueur ne peut de toute façon rien écrire — RLS 0012).
 *
 * CLIENT DE SESSION : rejoint le canal Realtime `session:<cid>` comme un appareil de la table,
 * avec l'identité `kind: 'projection'` (un écran, pas une personne → exclu de la présence et du
 * journal) et SANS battement (`heartbeat: false` → il ne maintient pas la session en vie). Il
 * reflète en direct le combat diffusé par le MJ (`combat-state`) et les PV des persos
 * (`game-state`). Hors session : aucun socket ; on affiche le dernier état de combat persisté
 * (`campaign_combat`, lisible par les membres) sous une bannière « hors session ».
 *
 * Créatures de bestiaire PAYANT : leur bloc n'est pas lisible par une session anonyme
 * (entitlement fail-safe, migration 0007). Pour cette v1, elles n'apparaissent donc pas chez
 * le joueur (les persos et les créatures du bestiaire de base, eux, s'affichent). La diffusion
 * de leur affichage par le MJ est une suite prévue (PER-293).
 */
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import { InitiativeTracker } from '@/components/campaign/InitiativeTracker';
import { useActiveSession } from '@/lib/session/useActiveSession';
import { useSessionChannel, type SessionIdentity } from '@/lib/session/useSessionChannel';
import { useGmScreenCombat } from '@/app/campaign/[cid]/gm-screen/useGmScreenCombat';

/** L'ordre se pilote depuis l'écran de MJ : le joueur ne le modifie jamais. */
const noop = () => {};

/**
 * Identité de cet écran sur le canal : une projection, pas une personne. `kind: 'projection'`
 * l'exclut de la présence affichée et du journal des participants (comme la fenêtre du MJ).
 */
const PLAYER_PROJECTION_IDENTITY: SessionIdentity = {
  kind: 'projection',
  playerId: null,
  name: 'Projection joueur',
};

export function PlayerInitiativeClient({ cid }: { cid: string }) {
  const { charactersHydrated, campaignsLoading, initiativeRows, currentTurnKey } =
    useGmScreenCombat(cid, 'reader');

  // Client de session (lecture seule) : rejoint le canal pour recevoir le combat en direct,
  // sans battement (un écran ne maintient pas la session vivante). Hors session → pas de canal.
  const { session, isActive } = useActiveSession(cid, { heartbeat: false });
  useSessionChannel(cid, session, PLAYER_PROJECTION_IDENTITY);

  const loading = !charactersHydrated || campaignsLoading;

  return (
    <Stack spacing={2}>
      <Stack
        direction="row"
        spacing={1.5}
        sx={{ alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', rowGap: 1 }}
      >
        <Typography variant="h6" component="h1">
          {"Ordre d'initiative"}
        </Typography>
        {/* État de la synchro : « En direct » pendant une session, sinon dernier état connu. */}
        {isActive ? (
          <Chip
            size="small"
            color="success"
            icon={<FiberManualRecordIcon sx={{ fontSize: 12 }} />}
            label="En direct"
          />
        ) : (
          <Chip size="small" variant="outlined" label="Hors session" />
        )}
      </Stack>

      {!isActive && (
        <Typography variant="body2" color="text.secondary">
          Aucune session en cours. L&apos;ordre ci-dessous est le dernier état connu ; il se mettra
          à jour en direct dès que ton MJ lancera la partie.
        </Typography>
      )}

      {loading ? (
        <Typography color="text.secondary" sx={{ fontStyle: 'italic' }}>
          Chargement du combat…
        </Typography>
      ) : (
        <Box>
          <InitiativeTracker
            rows={initiativeRows}
            currentTurnKey={currentTurnKey}
            onCurrentTurnKeyChange={noop}
            projection
          />
        </Box>
      )}
    </Stack>
  );
}
