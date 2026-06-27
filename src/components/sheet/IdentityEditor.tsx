'use client';

import { IdentityForm } from '@/components/IdentityForm';
import type { Ancestry } from '@/data/schema';
import type { Identity } from '@/lib/character/types';

export interface IdentityEditorProps {
  name: string;
  identity: Identity;
  /** Peuple du personnage : alimente placeholders, infobulles et avertissements. */
  ancestry?: Ancestry;
  onName: (name: string) => void;
  onIdentity: (patch: Partial<Identity>) => void;
}

/**
 * Édition en place des champs d'identité de la fiche (PER-45). S'appuie sur le
 * formulaire partagé `IdentityForm` (commun au wizard de création), sans le
 * générateur de nom (réservé à la création) ni l'édition du niveau (gérée par la
 * montée de niveau, pas à la main ici). Permissif : aucune valeur n'est bornée.
 */
export function IdentityEditor({ name, identity, ancestry, onName, onIdentity }: IdentityEditorProps) {
  return (
    <IdentityForm
      name={name}
      identity={identity}
      ancestry={ancestry}
      onName={onName}
      onIdentity={onIdentity}
    />
  );
}
