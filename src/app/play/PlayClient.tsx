'use client';

/**
 * Espace joueur — partie CLIENT (PER-196). Le shell serveur (`page.tsx`) a déjà
 * validé la session joueur et lu ses claims ; il nous passe `playerId` +
 * `campaignId`. On monte ici le store persos (cloud-first) pour offrir les trois
 * gestes du joueur :
 *  - **Mes fiches** : les personnages attribués à lui (`playerId === moi`),
 *    éditables en ligne (la fiche `/character/[id]` sauvegarde en cloud) ;
 *  - **À réclamer** : les pré-tirés NON attribués de sa campagne
 *    (`playerId === null`), qu'il peut s'attribuer (`claim`, migration 0004) ;
 *  - **Créer** : le wizard `/create`, pré-câblé sur sa campagne + lui-même.
 *
 * Sous session joueur, `load()` (RLS `characters_player_read_roster`) ramène TOUT
 * le roster de la campagne : on filtre donc localement par attribution. Les fiches
 * d'autres joueurs (ni miennes, ni réclamables) ne sont pas listées ici.
 */
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import AddIcon from '@mui/icons-material/Add';
import DownloadIcon from '@mui/icons-material/Download';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useToast } from '@/components/toast/ToastProvider';
import { CharacterPreviewCard } from '@/components/CharacterPreviewCard';
import {
  CharacterList,
  type CharacterListAction,
} from '@/components/character-list/CharacterList';
import { CharacterStatusMarker } from '@/components/character-list/CharacterStatusMarker';
import { ClassIcon } from '@/components/ClassIcon';
import type { CharacterSummary } from '@/lib/character/summary';
import { summarize } from '@/lib/character/summary';
import { downloadCharacterExport } from '@/lib/character/transferExport';
import { classColor } from '@/lib/ui/classColors';
import { useCharactersStore } from '@/stores/characters';

/**
 * Une ligne « À réclamer » : identité du personnage (cliquable → aperçu de la
 * fiche en lecture) + bouton **Réclamer** proéminent (l'action primaire du
 * joueur, PER-196 — pas cachée dans un menu). Le clic sur l'identité ouvre la
 * fiche ; le bouton s'occupe de l'attribution.
 */
function ClaimableRow({
  row,
  onPreview,
  onClaim,
}: {
  row: CharacterSummary;
  onPreview: () => void;
  onClaim: () => void;
}) {
  return (
    <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', py: 1.25 }}>
      <Box
        role="button"
        tabIndex={0}
        onClick={onPreview}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onPreview();
          }
        }}
        sx={{ minWidth: 0, flex: 1, cursor: 'pointer' }}
      >
        <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', minWidth: 0 }}>
          <CharacterStatusMarker status={row.status} />
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }} noWrap>
            {row.name}
          </Typography>
        </Stack>
        <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', minWidth: 0 }}>
          <ClassIcon classId={row.classId} firearmsAllowed={row.firearmsAllowed} size={16} />
          <Typography variant="body2" noWrap>
            <Box component="span" sx={{ color: classColor(row.classId), fontWeight: 600 }}>
              {row.characterClass}
            </Box>
            <Box component="span" sx={{ color: 'text.secondary' }}>
              {' '}
              · {row.ancestry} · {row.level}
            </Box>
          </Typography>
        </Stack>
      </Box>
      <Button
        variant="contained"
        size="small"
        startIcon={<PersonAddIcon />}
        onClick={onClaim}
        sx={{ flexShrink: 0 }}
      >
        Réclamer
      </Button>
    </Stack>
  );
}

interface PlayClientProps {
  playerId: string;
  campaignId: string;
}

const sectionSx = {
  p: { xs: 2.5, sm: 3 },
  mb: 3,
  bgcolor: 'rgba(20, 20, 23, 0.72)',
  backdropFilter: 'blur(10px)',
  WebkitBackdropFilter: 'blur(10px)',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  borderRadius: 3,
} as const;

export function PlayClient({ playerId, campaignId }: PlayClientProps) {
  const router = useRouter();
  const hasHydrated = useCharactersStore((s) => s.hasHydrated);
  const status = useCharactersStore((s) => s.status);
  const characters = useCharactersStore((s) => s.characters);
  const loadCharacters = useCharactersStore((s) => s.load);
  const claim = useCharactersStore((s) => s.claim);

  const { showToast } = useToast();
  // Personnage dont la réclamation est en cours de confirmation (modale d'aperçu) ;
  // null = modale fermée. `claimBusy` couvre l'écriture cloud le temps du clic.
  const [claimTarget, setClaimTarget] = useState<CharacterSummary | null>(null);
  const [claimBusy, setClaimBusy] = useState(false);

  // Charge (et fusionne) le roster de la campagne via la RLS joueur.
  useEffect(() => {
    void loadCharacters();
  }, [loadCharacters]);

  // Mes fiches : attribuées à moi. Réclamables : non attribuées de ma campagne.
  const myRows = useMemo(
    () => characters.filter((c) => c.playerId === playerId).map(summarize),
    [characters, playerId],
  );
  const claimableRows = useMemo(
    () =>
      characters
        .filter((c) => c.playerId === null && c.campaignId === campaignId)
        .map(summarize),
    [characters, campaignId],
  );

  // Personnage complet à prévisualiser dans la modale (le blob, pas le résumé).
  const claimPreview = claimTarget
    ? characters.find((c) => c.id === claimTarget.id) ?? null
    : null;

  // Confirme la réclamation depuis la modale : écrit en base, notifie, referme.
  const confirmClaim = async () => {
    if (!claimTarget) return;
    setClaimBusy(true);
    try {
      await claim(claimTarget.id, playerId);
      showToast(`« ${claimTarget.name} » est désormais ta fiche.`, 'success');
      setClaimTarget(null);
    } catch (e) {
      // On garde la modale ouverte pour permettre un nouvel essai ; le toast informe.
      showToast(e instanceof Error ? e.message : 'La réclamation a échoué.', 'error');
    } finally {
      setClaimBusy(false);
    }
  };

  const handleExport = async (r: CharacterSummary) => {
    const character = useCharactersStore.getState().getById(r.id);
    if (!character) return;
    await downloadCharacterExport(character);
    showToast(`« ${r.name} » exporté en JSON.`);
  };

  const renderNameMarker = (r: CharacterSummary) => <CharacterStatusMarker status={r.status} />;

  const myActions: CharacterListAction[] = [
    {
      key: 'open',
      label: 'Ouvrir',
      icon: <OpenInNewIcon fontSize="small" />,
      onClick: (r) => router.push(`/character/${r.id}`),
    },
    {
      key: 'export',
      label: 'Exporter en JSON',
      icon: <DownloadIcon fontSize="small" />,
      onClick: (r) => void handleExport(r),
    },
  ];

  // Le premier chargement : on attend l'hydratation localStorage + la fin du fetch
  // cloud tant qu'on n'a encore rien à montrer.
  const loading =
    !hasHydrated || ((status === 'idle' || status === 'loading') && characters.length === 0);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <>
      <Paper elevation={0} sx={sectionSx}>
        <Stack
          direction="row"
          sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 1, gap: 2 }}
        >
          <Typography variant="h6">Mes fiches</Typography>
          <Button
            variant="contained"
            size="small"
            startIcon={<AddIcon />}
            onClick={() =>
              router.push(`/create?campaign=${campaignId}&player=${playerId}`)
            }
          >
            Créer une fiche
          </Button>
        </Stack>
        {myRows.length > 0 ? (
          <CharacterList
            rows={myRows}
            onOpen={(r) => router.push(`/character/${r.id}`)}
            actions={myActions}
            renderNameMarker={renderNameMarker}
          />
        ) : (
          <Typography variant="body2" color="text.secondary">
            Tu n&apos;as pas encore de fiche. Crée-en une, ou réclame un personnage préparé par
            ton MJ ci-dessous.
          </Typography>
        )}
      </Paper>

      {claimableRows.length > 0 && (
        <Paper elevation={0} sx={sectionSx}>
          <Typography variant="h6" sx={{ mb: 0.5 }}>
            À réclamer
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Des personnages préparés par ton MJ, pas encore attribués. Réclames-en un pour te
            l&apos;approprier — un aperçu s&apos;ouvre en cliquant sur son nom.
          </Typography>
          <Stack divider={<Divider flexItem />}>
            {claimableRows.map((r) => (
              <ClaimableRow
                key={r.id}
                row={r}
                onPreview={() => router.push(`/character/${r.id}`)}
                onClaim={() => setClaimTarget(r)}
              />
            ))}
          </Stack>
        </Paper>
      )}

      {/* Confirmation de réclamation : aperçu du personnage (micro-fiche) avant de
          se l'attribuer, pour éviter un clic par erreur (le geste est réversible
          seulement côté MJ). */}
      <Dialog
        open={claimTarget !== null}
        onClose={() => (claimBusy ? undefined : setClaimTarget(null))}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Réclamer ce personnage ?</DialogTitle>
        <DialogContent>
          {claimPreview ? <CharacterPreviewCard character={claimPreview} /> : null}
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Il te sera attribué et rejoindra « Mes fiches ». Seul ton MJ pourra ensuite le
            désattribuer.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setClaimTarget(null)} disabled={claimBusy}>
            Annuler
          </Button>
          <Button
            variant="contained"
            onClick={() => void confirmClaim()}
            disabled={claimBusy}
            startIcon={
              claimBusy ? <CircularProgress size={14} color="inherit" /> : <PersonAddIcon />
            }
          >
            Réclamer
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
