'use client';

/**
 * Sélecteur de PORTEUR d'un cristal actif (PER-360, voie des cristaux p. 156) — « Il peut le porter
 * ou le confier à la personne de son choix ».
 *
 * Rendu sous la carte d'un cristal ACTIF, dans la modale d'activation : le mage choisit qui le
 * porte, lui-même par défaut. Le geste est LOCAL et immédiat (le bonus quitte sa fiche), puis
 * annoncé au MJ, seul auteur de l'état de combat, qui pose la puce sur le porteur — laquelle
 * redescend à toute la table (cf. `stores/crystalAssignment.ts`).
 *
 * Composant AUTONOME : il lit lui-même la campagne, ses personnages et la carte des attributions,
 * plutôt que de faire descendre quatre props à travers les cinq niveaux de `FeaturesByPath`. Il
 * n'est monté que pour un personnage RATTACHÉ à une campagne — sans table, il n'y a personne à qui
 * confier quoi que ce soit.
 */
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import { useCampaignCombatStore } from '@/stores/campaignCombat';
import { useCharactersStore } from '@/stores/characters';
import { useCrystalAssignmentStore } from '@/stores/crystalAssignment';
import { useIsPlayerSession } from '@/lib/supabase/useIsPlayerSession';
import type { Character } from '@/lib/character/types';

/** Valeur du choix « je le porte » — une chaîne, le `Select` MUI ne prenant pas `null` en valeur. */
const SELF = '';

export function CrystalAssignmentSelect({
  character,
  crystalId,
  disabled,
}: {
  /** Propriétaire du cristal (le mage de la voie). */
  character: Character;
  crystalId: string;
  disabled?: boolean;
}) {
  const characters = useCharactersStore((s) => s.characters);
  const assign = useCrystalAssignmentStore((s) => s.assign);
  // Un client ne reçoit pas ses propres broadcasts : le MJ, qui consulte lui-même la fiche du mage,
  // doit exécuter l'attribution au lieu de l'annoncer dans le vide (cf. `stores/crystalAssignment`).
  const { isPlayer } = useIsPlayerSession();
  const locallyAssignedTo = useCrystalAssignmentStore(
    (s) => s.byCharacter[character.id]?.[crystalId] ?? null,
  );
  // Porteur RÉEL, lu sur l'état de combat partagé : c'est lui qui fait foi et qui survit à un
  // rechargement de page (la carte locale, elle, ne sert qu'à répondre au clic sans attendre le MJ).
  const posedOn = useCampaignCombatStore((s) => {
    const statuses = character.campaignId
      ? s.byCampaign[character.campaignId]?.statuses
      : undefined;
    for (const [key, applied] of Object.entries(statuses ?? {})) {
      if (key !== character.id && applied.some((st) => st.id === crystalId)) return key;
    }
    return null;
  });

  const campaignId = character.campaignId;
  if (!campaignId) return null;

  const assignedTo = locallyAssignedTo ?? posedOn;

  // Camarades de table : les personnages de la MÊME campagne réclamés par un joueur, le mage exclu
  // (se confier un cristal à soi-même, c'est le porter — c'est le choix par défaut).
  const candidates = characters
    .filter((c) => c.campaignId === campaignId && c.playerId !== null && c.id !== character.id)
    .sort((a, b) => a.name.localeCompare(b.name, 'fr'));

  // Porteur devenu introuvable (personnage retiré de la campagne entre-temps) : on retombe sur
  // « je le porte » plutôt que d'afficher une valeur que la liste ne contient pas.
  const value = assignedTo && candidates.some((c) => c.id === assignedTo) ? assignedTo : SELF;

  return (
    <TextField
      select
      size="small"
      fullWidth
      data-glossary-shot="CrystalAssignmentSelect"
      label="Porté par"
      value={value}
      disabled={disabled || candidates.length === 0}
      onClick={(e) => e.stopPropagation()}
      onChange={(e) =>
        assign(campaignId, character.id, crystalId, e.target.value || null, !isPlayer)
      }
      helperText={
        candidates.length === 0
          ? 'Aucun autre personnage réclamé dans cette campagne.'
          : undefined
      }
      sx={{ mt: 0.5 }}
    >
      <MenuItem value={SELF}>Moi</MenuItem>
      {candidates.map((c) => (
        <MenuItem key={c.id} value={c.id}>
          {c.name}
        </MenuItem>
      ))}
    </TextField>
  );
}
