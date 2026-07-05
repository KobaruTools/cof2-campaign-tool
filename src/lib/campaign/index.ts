/**
 * Barrel de la couche « Campagne » (PER-190) : entités et accès données cloud.
 * Module consommé par le store `campaigns` et l'UI. La logique métier est
 * désormais portée par la base (RLS + FK) ; ce dossier n'expose plus que le
 * modèle de données et le repository Supabase.
 */
export * from './types';
export * from './repo';
