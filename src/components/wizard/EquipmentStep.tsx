'use client';

import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { classById } from '@/data';
import { setWornAt } from '@/lib/character/equipment';
import { baseAncestrySize } from '@/lib/character/size';
import type { WornState } from '@/lib/character/types';
import { EquipmentList } from '@/components/sheet/EquipmentList';
import type { StepProps } from './types';

/**
 * Étape « Équipement » du wizard de création (PER-215) : mince adaptateur autour du
 * composant d'inventaire de la fiche (`EquipmentList`). On ne réimplémente plus la
 * liste — le wizard hérite ainsi automatiquement des objets custom, des variantes,
 * des icônes de type, de la bascule œil et du crayon d'édition (modale unifiée PER-214).
 *
 * Spécificités du wizard câblées ici :
 * - `onChange` / `onWear` remontent au brouillon via `patch` (le port passe par
 *   `setWornAt` pour libérer la main occupée, comme sur la fiche) ;
 * - PAS de `onUse` : consommer un objet est un état de JEU, hors création ;
 * - `characterClass` applique les reskins de profil aux noms (PER-181).
 */
export function EquipmentStep({ draft, patch, campaignAllowsFirearms }: StepProps) {
  const characterClass = draft.classId ? classById.get(draft.classId) : undefined;
  // Autorisation EFFECTIVE des armes à feu (PER-185) : règle campagne ∧ choix du joueur.
  // Sert au grisage des lignes d'armes à poudre indisponibles dans l'inventaire.
  const firearmsAllowed = (campaignAllowsFirearms ?? true) && (draft.firearmsAllowed ?? true);
  // PER-330 : un peuple de taille petite équipe une arme 1d8–1d10 à deux mains par défaut (le port
  // renvoie alors le bouclier / la seconde arme au sac). Pas de Poigne de fer à la création → familles vides.
  const smallSize = baseAncestrySize(draft.ancestryId) === 'petite';
  const setWorn = (index: number, worn: WornState | undefined) =>
    patch({ equipment: setWornAt(draft.equipment, index, worn, [], smallSize) });

  return (
    <Stack spacing={3} data-glossary-shot="EquipmentStep">
      <Typography variant="body2" color="text.secondary">
        Équipement de départ du profil + sac d’aventurier. Ajustez librement, puis
        indiquez ce que le personnage porte (armure, bouclier, arme en main).
      </Typography>

      <EquipmentList
        equipment={draft.equipment}
        ancestryId={draft.ancestryId}
        characterClass={characterClass}
        firearmsAllowed={firearmsAllowed}
        onChange={(equipment) => patch({ equipment })}
        onWear={setWorn}
      />
    </Stack>
  );
}
