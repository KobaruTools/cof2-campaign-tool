'use client';

import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { classById } from '@/data';
import { setWornAt } from '@/lib/character/equipment';
import { baseAncestrySize } from '@/lib/character/size';
import { isCustomItem, type WornState } from '@/lib/character/types';
import { parseCoinPouchName } from '@/lib/character/coinPouch';
import { isStartingChoiceLine } from '@/lib/character/startingChoices';
import { EquipmentList } from '@/components/sheet/EquipmentList';
import { AppAlert } from '@/components/AppAlert';
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

  // PER-451 : la « Bourse de 2d6 pa » et les choix « X ou Y » du profil (ex. lot du
  // barbare, p. 79) arrivent comme des lignes PLACEHOLDER (objet libre) — sans bouton
  // « Utiliser » ici (le wizard ne le câble pas, cf. docstring), elles ne se distinguent
  // en rien d'un objet normal : une joueuse a cru que sa bourse saisie à la table (2d6 pa)
  // était perdue une fois la création terminée, alors qu'il fallait la reporter elle-même
  // via cette ligne, sur la fiche. On avertit donc explicitement ici, avant que la
  // création ne se termine.
  const hasStartingCoinPouch = draft.equipment.some(
    (line) => isCustomItem(line) && parseCoinPouchName(line.name) !== null,
  );
  const startingChoiceLines = draft.equipment.filter(isStartingChoiceLine);

  return (
    <Stack spacing={3} data-glossary-shot="EquipmentStep">
      <Typography variant="body2" color="text.secondary">
        Équipement de départ du profil + sac d’aventurier. Ajustez librement, puis
        indiquez ce que le personnage porte (armure, bouclier, arme en main).
      </Typography>

      {hasStartingCoinPouch && (
        <AppAlert severity="info">
          La « Bourse de 2d6 pa » n’est qu’un rappel du livre : le résultat du jet
          n’est PAS ajouté automatiquement à la bourse de la fiche. Une fois le
          personnage créé, ouvrez cette ligne (bouton « Utiliser ») pour saisir
          vous-même le nombre de pièces obtenu.
        </AppAlert>
      )}

      {startingChoiceLines.length > 0 && (
        <AppAlert severity="info">
          {startingChoiceLines.length === 1
            ? 'La ligne suivante rappelle un choix du profil : '
            : 'Les lignes suivantes rappellent un choix du profil : '}
          {startingChoiceLines.map((line) => (isCustomItem(line) ? line.name : '')).join(' · ')}.
          Ce ne sont pas encore de vrais objets : une fois le personnage créé, ouvrez
          chaque ligne (bouton « Utiliser ») pour choisir l’objet réel à ajouter à
          l’inventaire.
        </AppAlert>
      )}

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
