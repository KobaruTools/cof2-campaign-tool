/**
 * Barrel du moteur de calcul CO2 (module pur, PRD §5.5/§8).
 *
 * Regroupe :
 *  - `derived`   : statistiques dérivées (PV, DEF, init, attaques…) ;
 *  - `legalite`  : légalité des choix (wizard) et conformité (fiche) ;
 *  - `migrations`: migration de schéma et validation d'import.
 *
 * La fiche et le wizard consomment ce module — une seule source de vérité.
 */
export * from './derived';
export * from './legality';
export * from './migrations';
