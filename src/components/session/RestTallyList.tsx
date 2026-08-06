'use client';

/**
 * Relevé des réponses à un repos de groupe (PER-312) — **le même écran des deux côtés**.
 *
 * Le MJ le regarde pour savoir s'il peut donner le top ; le joueur qui a répondu le regarde en
 * attendant ce top. C'est délibérément le même composant : le joueur doit voir exactement ce que
 * voit le MJ, sinon il ne sait pas pourquoi ça traîne (et c'est la table entière qui redemande
 * « alors, on se repose ou pas ? »). Le relevé se lit donc entièrement dans l'instantané diffusé —
 * un joueur ne connaît pas la table autrement, sa fiche ne lui montre que son propre personnage.
 *
 * Les libellés changent avec le statut : tant que la proposition est ouverte, une réponse est une
 * INTENTION (« Prêt à récupérer ») ; une fois le top donné, c'est un fait accompli (« A récupéré »).
 */
import type { ReactNode } from 'react';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutlined';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { RestParticipant, RestProposal } from '@/lib/session/restProposal';

/** Ce qu'affiche une ligne, selon la réponse et l'avancement de la proposition. */
type RowOutcome = 'accepted' | 'declined' | 'pending';

const OUTCOME_LABEL: Record<RestProposal['status'], Record<RowOutcome, string>> = {
  open: {
    accepted: 'Prêt à récupérer',
    declined: 'Laisse passer',
    pending: 'Sans réponse',
  },
  applied: {
    accepted: 'A récupéré',
    declined: 'A laissé passer',
    pending: 'N’a pas répondu',
  },
};

const OUTCOME_VISUAL: Record<RowOutcome, { icon: ReactNode; color: string }> = {
  accepted: { icon: <CheckCircleIcon fontSize="small" />, color: 'success.main' },
  declined: { icon: <RemoveCircleOutlineIcon fontSize="small" />, color: 'text.secondary' },
  pending: { icon: <HourglassEmptyIcon fontSize="small" />, color: 'warning.main' },
};

export interface RestTallyListProps {
  proposal: RestProposal;
  /** Personnage de CE client, mis en avant dans la liste (côté joueur uniquement). */
  ownCharacterId?: string;
}

/** Ligne du relevé : un personnage et ce qu'il a décidé. */
function TallyRow({
  participant,
  outcome,
  status,
  own,
}: {
  participant: RestParticipant;
  outcome: RowOutcome;
  status: RestProposal['status'];
  own: boolean;
}) {
  const visual = OUTCOME_VISUAL[outcome];
  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', color: visual.color }}>
      {visual.icon}
      <Typography
        variant="body2"
        sx={{ color: 'text.primary', flexGrow: 1, fontWeight: own ? 600 : 400 }}
      >
        {participant.name}
        {(participant.playerName || own) && (
          <Typography component="span" variant="body2" color="text.secondary">
            {' '}
            ({own ? 'toi' : participant.playerName})
          </Typography>
        )}
      </Typography>
      <Typography variant="body2" sx={{ color: visual.color }}>
        {OUTCOME_LABEL[status][outcome]}
      </Typography>
    </Stack>
  );
}

export function RestTallyList({ proposal, ownCharacterId }: RestTallyListProps) {
  if (proposal.participants.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        Aucun personnage réclamé à relever.
      </Typography>
    );
  }
  return (
    <Stack spacing={0.75}>
      {proposal.participants.map((p) => (
        <TallyRow
          key={p.characterId}
          participant={p}
          outcome={proposal.responses[p.characterId]?.outcome ?? 'pending'}
          status={proposal.status}
          own={p.characterId === ownCharacterId}
        />
      ))}
    </Stack>
  );
}
