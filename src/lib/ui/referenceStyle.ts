import { alpha, lighten } from '@mui/material/styles';
import { desaturateColor } from '@/lib/ui/classColors';

/**
 * TEINTES des sous-sections de l'AIDE-MÉMOIRE (PER-311) — préoccupation purement UI, aucune règle
 * CO2. Sur le patron exact de `ITEM_TYPE_COLORS` : un `Record<slug, teinte>`, la même désaturation
 * (`desaturateColor`) et la même recette de dégradé, pour que la page reste dans la tonalité du
 * reste de l'app.
 *
 * POURQUOI : jusqu'ici toutes les sous-sections d'un onglet portaient le même verre dépoli gris, ce
 * qui obligeait à LIRE les intertitres pour se repérer. L'écran de MJ de référence
 * (`public/pdf/gm-screen.pdf`) code au contraire chaque famille de règles par une couleur — c'est ce
 * qui rend un domaine embrassable d'un coup d'œil.
 *
 * AUCUN SYSTÈME PARALLÈLE (contrainte du ticket) : les onze teintes sont REPRISES des palettes déjà
 * en place — `ITEM_TYPE_COLORS` (rouge grenat, bleu acier, or, violet potion, vert olive, gris
 * ardoise, bronze), `CLASS_COLORS` (orange arquebusier, rouge sombre guerrier, vert druide) et
 * `PRESTIGE_CATEGORY_COLORS` (cuivre combattant). Le sens suit le PDF : chaud pour le combat, olive
 * pour les tests, violet pour la magie, vert pour les dangers du milieu, bronze pour le voyage.
 */
export const REFERENCE_SUBSECTION_COLORS: Record<string, string> = {
  // Combat — le registre chaud, sauf la table de modificateurs (des chiffres, froide comme au PDF).
  states: '#d05a4e', // rouge grenat — les états SUBIS (écho du rouge des états dans le tracker)
  maneuvers: '#d84315', // cuivre — la manœuvre offensive
  'attack-modifiers': '#5c8ec4', // bleu acier — une table de conditions chiffrées
  'special-actions': '#fb8c00', // orange — courir, nager, ramper, monter
  'tactical-options': '#e0b12a', // or — le choix tactique du joueur
  // Résolution
  tests: '#86a34a', // vert olive — la table des difficultés (olive au PDF)
  damage: '#9b5448', // rouge sombre — les blessures
  magic: '#a56ad0', // violet — la magie (violet au PDF)
  // Environnement
  environment: '#66bb6a', // vert — poisons, pièges, structures (vert au PDF)
  encumbrance: '#8b98a5', // gris ardoise — la charge, minérale et neutre
  travel: '#b08d57', // bronze / cuir — la route (orange au PDF, décalé pour rester unique)
};

/** Teinte neutre d'une sous-section inconnue (une extraction future peut en ajouter). */
const FALLBACK_COLOR = '#8b98a5';

/** Teinte d'une sous-section, avec repli neutre si le slug est inconnu. */
export function subsectionColor(subsection: string): string {
  return REFERENCE_SUBSECTION_COLORS[subsection] ?? FALLBACK_COLOR;
}

/**
 * Teinte de panneau, un peu désaturée — même recette que `itemTypeSectionGradient` /
 * `profileAccentGradient` (« moins flashy », retour propriétaire). Source unique du filet, du
 * dégradé et de la pastille de sommaire.
 */
function panelTint(subsection: string): string {
  return desaturateColor(subsectionColor(subsection), 0.3);
}

/** Filet sous le bandeau de titre d'un panneau de sous-section, dans sa teinte. */
export function subsectionHeaderBorder(subsection: string): string {
  return `2px solid ${alpha(panelTint(subsection), 0.55)}`;
}

/**
 * Fond d'un panneau de sous-section : dégradé qui part de la teinte du bandeau (en haut) vers la
 * transparence (en bas), posé en `backgroundImage` par-dessus le verre dépoli. L'extinction suit la
 * HAUTEUR du panneau — un bloc de trois règles et un bloc de dix-huit se lisent pareil.
 */
export function subsectionPanelGradient(subsection: string): string {
  const tint = panelTint(subsection);
  return `linear-gradient(to bottom, ${alpha(tint, 0.16)}, ${alpha(tint, 0)})`;
}

/**
 * Teinte du TEXTE porté par la couleur : titre du bandeau, et amorce en gras de chaque entrée
 * (« Sprinter (L) : », le point d'entrée visuel du PDF). Éclaircie pour rester lisible sur le fond
 * sombre — les teintes de palette sont calibrées pour des aplats, pas pour du texte.
 */
export function subsectionAccentText(subsection: string): string {
  return lighten(subsectionColor(subsection), 0.35);
}
