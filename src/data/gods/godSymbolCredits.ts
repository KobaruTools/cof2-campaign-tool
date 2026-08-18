// Attribution des symboles divins fan-made (public/gods/*.png).
// Source : forum Black Book Éditions, topic "Symboles dieux et déesses" (COF2)
// https://black-book-editions.fr/forums.php?topic_id=24891
// Plusieurs dieux ont plus d'une version connue (Badiail + un autre joueur) ;
// sans accès au Google Drive HD partagé sur le fil, impossible de savoir laquelle
// des versions correspond au fichier PNG récupéré : marqué "à confirmer" ci-dessous.

export interface GodSymbolCredit {
  /** Nom de fichier dans public/gods/ */
  file: string;
  /** Divinité représentée */
  god: string;
  /** Auteur du symbole */
  author: string;
  /** Source de l'attribution */
  source: string;
  /** Note de confiance / ambiguïté */
  note?: string;
}

const FORUM_URL = 'https://black-book-editions.fr/forums.php?topic_id=24891';

export const GOD_SYMBOL_CREDITS: GodSymbolCredit[] = [
  { file: 'abalath nb.png', god: 'Abalath', author: 'Badiail', source: FORUM_URL },
  { file: 'ashran nb.png', god: 'Ashran', author: 'Badiail', source: FORUM_URL },
  { file: 'axender nb.png', god: 'Axender', author: 'Badiail', source: FORUM_URL },
  { file: 'delia nb.png', god: 'Delia', author: 'Badiail', source: FORUM_URL },
  { file: 'desdemone nb.png', god: 'Desdemone', author: 'Badiail', source: FORUM_URL },
  { file: 'gaelm nb.png', god: 'Gaelm', author: 'Badiail', source: FORUM_URL },
  { file: 'jeweln nb.png', god: 'Jeweln', author: 'Badiail', source: FORUM_URL },
  { file: 'livine nb.png', god: 'Livine', author: 'Badiail', source: FORUM_URL },
  {
    file: 'maedra nb.png',
    god: 'Maëdra',
    author: 'Badiail',
    source: FORUM_URL,
    note: "À confirmer : Badiail a produit des versions maléfique et neutre, Kyr a aussi produit une version neutre. Fichier unique récupéré, version non identifiable.",
  },
  { file: 'mephistere nb.png', god: 'Mephistère', author: 'Badiail', source: FORUM_URL },
  {
    file: 'miesserith nb.png',
    god: 'Miesserith',
    author: 'Badiail',
    source: FORUM_URL,
    note: "À confirmer : Badiail a produit des versions arcanique et divine, Okeran a aussi publié une version divine. Fichier unique récupéré, version non identifiable.",
  },
  { file: 'mirandia nb.png', god: 'Mirandia', author: 'Badiail', source: FORUM_URL },
  { file: 'orbis nb.png', god: 'Orbis', author: 'Badiail', source: FORUM_URL },
  {
    file: 'oumaros nb - dessiné par KYR.png',
    god: 'Oumaros',
    author: 'Kyr',
    source: FORUM_URL,
    note: 'Auteur confirmé par le nom de fichier lui-même.',
  },
  {
    file: 'selenne nb.png',
    god: 'Sélenne',
    author: 'Badiail',
    source: FORUM_URL,
    note: "À confirmer : Machime a aussi produit une version noir et blanc de ce symbole ; le fichier récupéré est en noir et blanc, donc pourrait être celui de Machime plutôt que celui de Badiail.",
  },
  { file: 'solar nb.png', god: 'Solar', author: 'Badiail', source: FORUM_URL },
];
