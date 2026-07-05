/**
 * Barrel de la couche « Campagne » (PER-179) : entités, fabrique et gardes FK.
 * Module pur (aucun store) — consommé par le store `campaigns`, la migration des
 * personnages et l'UI.
 */
export * from './types';
export * from './factory';
export * from './guards';
