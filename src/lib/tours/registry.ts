/**
 * Registre central des tours guidés (PER-423) : clé + nom lisible + version, consommé tel
 * quel par la future page de reset par tour (PER-424) — ajouter un tour ici suffit, jamais
 * coder sa liste en dur ailleurs (compte, écrans MJ/fiche…).
 */
export interface TourDefinition {
  /** Clé de stockage stable (persistée dans `useToursStore`, voir `src/stores/tours.ts`). */
  key: string;
  /** Nom lisible (français), affiché sur la future page de reset. */
  label: string;
  /** Incrémenter relance le tour pour tout le monde, même vu/passé — pas de migration. */
  version: number;
}

export const TOUR_REGISTRY = {
  itemDialog: {
    key: 'item-dialog',
    label: 'Création d’objet personnalisé',
    version: 1,
  },
} as const satisfies Record<string, TourDefinition>;

export type TourId = keyof typeof TOUR_REGISTRY;

/** Liste programmatique de tous les tours (consommée par PER-424). */
export const TOUR_LIST: TourDefinition[] = Object.values(TOUR_REGISTRY);
