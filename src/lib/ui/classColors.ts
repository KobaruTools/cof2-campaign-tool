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
