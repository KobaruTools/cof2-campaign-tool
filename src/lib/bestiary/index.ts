/**
 * Barrel de la couche « Bestiaire » cloud (PER-241, cache PER-244) : modèle de la
 * liste légère + repository Supabase (lecture deux étages) + cache persistant
 * IndexedDB. Consommé par le store `bestiary` et l'UI (`BestiaryBrowser`).
 */
export * from './types';
export * from './repo';
export * from './cache';
