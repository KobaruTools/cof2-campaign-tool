/**
 * PULSATION D'APPEL (PER-358) : le halo qui bat autour d'un bouton apparu de lui-même, parce qu'un
 * joueur attend une réponse — une demande de pause (PER-313) ou un effet de groupe annoncé.
 *
 * L'écran de MJ est chargé (tracker, palette, cartes, barre d'actions) et ces boutons SURGISSENT au
 * milieu des autres : sans mouvement, ils passent pour un bouton de plus et la demande reste en plan.
 * Le halo bat sur la bordure et l'ombre seulement — jamais sur la taille ni la position, qui feraient
 * sauter la barre d'actions à chaque cycle.
 *
 * Respecte `prefers-reduced-motion` : l'animation s'arrête, la teinte franche du repos reste — la
 * visibilité ne dépend donc pas du mouvement, il ne fait que l'accélérer.
 */
import { alpha, type Theme } from '@mui/material/styles';

/** Tonalités admises : celles des boutons d'attente de l'écran de MJ. */
export type AttentionTone = 'warning' | 'success' | 'info';

/**
 * Style à SUPERPOSER au style de contexte d'un bouton (après lui dans le tableau `sx`, pour passer
 * après la teinte « verre » de l'écran de MJ, qui fixe déjà couleur, fond et bordure).
 *
 * Le nom de l'animation porte la tonalité : deux boutons voisins de tonalités différentes auraient
 * sinon partagé le même `@keyframes`, et le dernier monté aurait imposé sa couleur aux deux.
 */
export function attentionPulseSx(theme: Theme, tone: AttentionTone) {
  const name = `attention-pulse-${tone}`;
  const main = theme.palette[tone].main;
  return {
    color: theme.palette[tone].light,
    bgcolor: alpha(main, 0.22),
    borderColor: alpha(main, 0.6),
    '&:hover': { bgcolor: alpha(main, 0.32), borderColor: theme.palette[tone].light },
    [`@keyframes ${name}`]: {
      '0%, 100%': { boxShadow: `0 0 0 0 ${alpha(main, 0.55)}` },
      '50%': { boxShadow: `0 0 0 6px ${alpha(main, 0)}` },
    },
    animation: `${name} 1.8s ease-in-out infinite`,
    '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
  };
}
