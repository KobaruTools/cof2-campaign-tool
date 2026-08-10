'use client';

/**
 * Sélecteur de PASSAGER d'une monture invoquée (PER-363, voie de l'invocation majeure, Monture
 * fantôme r4, p. 158) — « peut le transporter (plus éventuellement un autre cavalier) ».
 *
 * Rendu sous la carte compagnon de la monture. Le mage choisit qui monte avec lui, personne par
 * défaut. Le geste est LOCAL et immédiat, puis annoncé au MJ, seul auteur de l'état de combat, qui
 * pose l'état sur le passager désigné — lequel redescend à toute la table (cf.
 * `stores/mountPassengerAssignment.ts`, même patron que `CrystalAssignmentSelect`, PER-360).
 *
 * Composant AUTONOME : il lit lui-même la campagne, ses personnages et la carte des assignations.
 * N'est monté que pour un personnage RATTACHÉ à une campagne — sans table, personne à qui proposer
 * une place.
 */
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import { useCampaignCombatStore } from '@/stores/campaignCombat';
import { useCharactersStore } from '@/stores/characters';
import { useMountPassengerAssignmentStore } from '@/stores/mountPassengerAssignment';
import { isMountPassengerStatus } from '@/lib/character/statusEffects';
import { useIsPlayerSession } from '@/lib/supabase/useIsPlayerSession';
import type { Character } from '@/lib/character/types';

/** Valeur du choix « personne ne monte » — une chaîne, le `Select` MUI ne prenant pas `null` en valeur. */
const NONE = '';

export function MountPassengerSelect({
  character,
  disabled,
}: {
  /** Personnage qui invoque la monture (le mage de la voie). */
  character: Character;
  disabled?: boolean;
}) {
  const characters = useCharactersStore((s) => s.characters);
  const assign = useMountPassengerAssignmentStore((s) => s.assign);
  // Un client ne reçoit pas ses propres broadcasts : le MJ, qui consulte lui-même la fiche du mage,
  // doit exécuter l'assignation au lieu de l'annoncer dans le vide.
  const { isPlayer } = useIsPlayerSession();
  const locallyAssignedTo = useMountPassengerAssignmentStore((s) => s.targetOf(character.id));
  // Passager RÉEL, lu sur l'état de combat partagé : c'est lui qui fait foi et qui survit à un
  // rechargement de page (la carte locale ne sert qu'à répondre au clic sans attendre le MJ).
  const posedOn = useCampaignCombatStore((s) => {
    const statuses = character.campaignId
      ? s.byCampaign[character.campaignId]?.statuses
      : undefined;
    for (const [key, applied] of Object.entries(statuses ?? {})) {
      if (applied.some((st) => isMountPassengerStatus(st.id))) return key;
    }
    return null;
  });

  const campaignId = character.campaignId;
  if (!campaignId) return null;

  const assignedTo = locallyAssignedTo ?? posedOn;

  // Camarades de table : les personnages de la MÊME campagne réclamés par un joueur, le mage exclu
  // (on ne se prend pas soi-même comme passager).
  const candidates = characters
    .filter((c) => c.campaignId === campaignId && c.playerId !== null && c.id !== character.id)
    .sort((a, b) => a.name.localeCompare(b.name, 'fr'));

  // Passager devenu introuvable (personnage retiré de la campagne entre-temps) : on retombe sur
  // « personne » plutôt que d'afficher une valeur que la liste ne contient pas.
  const value = assignedTo && candidates.some((c) => c.id === assignedTo) ? assignedTo : NONE;

  return (
    <TextField
      select
      size="small"
      fullWidth
      label="En selle avec"
      value={value}
      disabled={disabled || candidates.length === 0}
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => assign(campaignId, character.id, e.target.value || null, !isPlayer)}
      helperText={
        candidates.length === 0
          ? 'Aucun autre personnage réclamé dans cette campagne.'
          : undefined
      }
    >
      <MenuItem value={NONE}>Personne</MenuItem>
      {candidates.map((c) => (
        <MenuItem key={c.id} value={c.id}>
          {c.name}
        </MenuItem>
      ))}
    </TextField>
  );
}
