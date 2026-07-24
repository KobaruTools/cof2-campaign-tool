// Slot `@viewer` (PER-60) : à la navigation douce vers TOUTE autre route (≥ 1 segment), le slot
// rend `null` pour FERMER l'overlay. Sans cette route attrape-tout, un slot parallèle garderait
// son dernier contenu actif visible en passant d'une page à l'autre. La route interceptée
// `(.)rules/[book]/[page]` est plus spécifique et gagne donc pour `/rules/...`.
export default function ViewerCatchAllClose() {
  return null;
}
