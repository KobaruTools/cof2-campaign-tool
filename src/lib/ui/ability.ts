import type { AbilityId } from '@/data/schema';

/**
 * Libellés français complets des caractéristiques, indexés par id court.
 * Source unique réutilisée par l'UI (badges, libellés, tooltips).
 *
 * Les icônes sont gérées séparément : markup SVG game-icons.net dans
 * `abilityIcons.ts` (FICHIER GÉNÉRÉ), affiché via le composant `<AbilityIcon>`.
 */
export const ABILITY_NAMES: Record<AbilityId, string> = {
  AGI: 'Agilité',
  CON: 'Constitution',
  FOR: 'Force',
  PER: 'Perception',
  CHA: 'Charisme',
  INT: 'Intelligence',
  VOL: 'Volonté',
};

/**
 * Teinte propre à chaque caractéristique dans le rendu enrichi (PER-224) : la puce d'une
 * caractéristique (`RefChip tone="ability"`) est colorée (fond + bordure + texte) selon ce
 * mapping, et son contour est TIRETÉ pour la distinguer de toutes les autres puces (plein).
 *
 * Préoccupation purement UI, AUCUNE règle CO2 — comme les couleurs de profil dans `classColors.ts`.
 * Palette désaturée (~40 %) faisant écho aux teintes déjà employées par le parse (le tireté
 * tranche « carac vs non-carac », donc frôler une teinte occupée est sans ambiguïté), mais les 7
 * restent distinctes ENTRE ELLES (tour du cercle chromatique) : c'est la condition à préserver,
 * le tireté ne réglant pas « carac A vs carac B ». Mapping carac↔teinte ajustable.
 */
export const ABILITY_COLORS: Record<AbilityId, string> = {
  FOR: '#c8746a', // brique — écho du rouge (état)
  CON: '#cda45a', // ocre — écho de l'orange (stat dérivée)
  AGI: '#9bb15a', // olive — écho du vert (rang/niveau)
  INT: '#5aa8a0', // teal — creux libre
  PER: '#6fa0cf', // bleu ardoise — écho du bleu (quantité)
  VOL: '#8a8fd0', // indigo — écho du bleu clair (formule)
  CHA: '#bd7fb2', // mauve — écho du magenta (formule à dé)
};
