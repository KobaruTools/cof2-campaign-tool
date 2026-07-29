/**
 * Barrel de la couche « Session de table synchronisée » (milestone PER-259) : modèle
 * de données + accès cloud du CYCLE DE VIE (démarrer/terminer, gate, fermeture
 * paresseuse, battement — PER-264), et la PRÉSENCE (payload + journal — PER-265). Les
 * hooks React (`useActiveSession`, `useSessionChannel`) restent hors barrel (importés
 * directement par leurs consommateurs).
 */
export * from './types';
export * from './repo';
export * from './presence';
export * from './participantsRepo';
export * from './combatState';
export * from './combatRepo';
