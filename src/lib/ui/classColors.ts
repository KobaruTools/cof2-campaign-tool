import { alpha, decomposeColor, recomposeColor } from '@mui/material/styles';

/**
 * Couleurs d'accentuation par profil — préoccupation purement UI (aucune règle
 * CO2), donc en dehors des données sourcées du PDF. Les teintes sont regroupées
 * par famille (verts = aventuriers, rouges/oranges = combattants, bleus = mages,
 * violets/roses = mystiques) tout en restant distinctes profil par profil, pour
 * que chaque classe se repère d'un coup d'œil sans casser le regroupement.
 *
 * Choisies pour rester lisibles sur fond sombre (thème par défaut).
 */
export const CLASS_COLORS: Record<string, string> = {
  // Aventuriers
  arquebusier: '#fb8c00', // orange
  barde: '#ec407a', // rose
  rodeur: '#1b5e20', // vert foncé
  voleur: '#b08d57', // bronze / cuir
  // Combattants
  barbare: '#e53935', // rouge vif
  chevalier: '#607d8b', // gris/bleu
  guerrier: '#8d3b2e', // rouge foncé / marron
  // Mages
  ensorceleur: '#42a5f5',
  forgesort: '#26c6da',
  magicien: '#ba68c8', // rose/violet
  sorcier: '#7e57c2',
  // Mystiques
  druide: '#66bb6a', // vert
  moine: '#00bfa5', // vert/bleu (teal)
  pretre: '#ffb300', // jaune/orangé
};

/** Couleur d'un profil, avec repli neutre si l'id est inconnu. */
export function classColor(classId: string): string {
  return CLASS_COLORS[classId] ?? '#90a4ae';
}

/**
 * Désature une couleur en la rapprochant de son niveau de gris perçu (luminance),
 * d'une fraction `amount` (0 = inchangé, 1 = gris pur). Sert à adoucir une teinte
 * de profil pour qu'elle soit « moins flashy » sans changer sa clarté. Purement UI.
 */
export function desaturateColor(color: string, amount: number): string {
  const [r, g, b] = decomposeColor(color).values;
  const gray = 0.299 * r + 0.587 * g + 0.114 * b;
  const mix = (c: number) => Math.round(gray + (c - gray) * (1 - amount));
  return recomposeColor({ type: 'rgb', values: [mix(r), mix(g), mix(b)] });
}

/**
 * Léger dégradé d'accentuation teinté à la couleur d'un profil, un peu désaturée
 * (« moins flashy », retour propriétaire) et posée en `backgroundImage` par-dessus le
 * fond d'un bloc : part de `direction` (teinte discrète) vers la transparence. Source
 * UNIQUE de la recette (désaturation + opacité), partagée par les lignes de liste
 * (`to left`) et les blocs résumé de personnage (`to top left`). Repli neutre si l'id
 * est inconnu (via `classColor`).
 */
export function profileAccentGradient(classId: string, direction = 'to left'): string {
  const tint = desaturateColor(classColor(classId), 0.45);
  return `linear-gradient(${direction}, ${alpha(tint, 0.18)}, transparent)`;
}

/**
 * Teinte d'accentuation des VOIES DE PEUPLE (catégorie distincte des profils,
 * aucune règle CO2 — purement UI). Une seule teinte commune (taupe chaud), pour
 * que les puces de voie de peuple (`CapabilityChip`) se distinguent des profils
 * tout en restant cohérentes entre elles.
 */
export const ANCESTRY_COLOR = '#a1887f';

/**
 * Teinte de la VOIE DU MAGE (type `mage`), qui remplace la voie de peuple pour la
 * famille des mages (p.60). Indigo arcane dédié, distinct des profils et de la
 * teinte commune de peuple, pour signaler son caractère occulte. Purement UI.
 */
export const MAGE_PATH_COLOR = '#5c6bc0';

/**
 * Teinte de la VOIE DE PRESTIGE (type `prestige`), 7ᵉ voie possible d'un personnage
 * (accessible à partir du niveau 5, une seule, capacités de rangs 4 à 8 — chap. 8).
 * Or ancien dédié, distinct des profils, de la voie de peuple et de la voie du mage,
 * pour signaler son statut à part. Purement UI.
 */
export const PRESTIGE_PATH_COLOR = '#d4af37';

/**
 * Gris foncé NEUTRE des hexagones de marqueur d'action (A/L/G/M) d'une voie de PEUPLE : sans
 * couleur de profil, le marqueur retombait sur le bleu mana par défaut (`info.main`), qui évoque à
 * tort un profil de mage. Le composant l'assombrit (darken 0.25) → ~#525252, contraste large avec le
 * texte blanc. (La voie du mage / de prestige conserve le bleu mana par défaut.)
 */
export const ANCESTRY_MARKER_COLOR = '#6e6e6e';
