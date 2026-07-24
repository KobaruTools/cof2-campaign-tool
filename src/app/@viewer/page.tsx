// Slot `@viewer` (PER-60) : à la navigation douce vers l'accueil (`/`), le slot doit rendre
// `null` pour FERMER l'overlay (sinon un slot parallèle conserve son dernier contenu actif).
export default function ViewerRootClose() {
  return null;
}
