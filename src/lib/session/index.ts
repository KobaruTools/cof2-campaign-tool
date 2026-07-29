/**
 * Barrel de la couche « Session de table synchronisée » (PER-264, milestone PER-259) :
 * modèle de données et accès cloud du CYCLE DE VIE de session (démarrer/terminer, gate,
 * fermeture paresseuse, battement). La synchro temps réel des données viendra aux
 * tickets suivants (PER-265+) et s'appuiera sur ce gate.
 */
export * from './types';
export * from './repo';
