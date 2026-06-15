/**
 * Glossaire des acronymes des textes de règles CO2 — couche de PRÉSENTATION
 * (PER-69, retour propriétaire). SOURCE UNIQUE pour le rendu enrichi : chaque
 * acronyme reçoit une catégorie et un libellé français (info-bulle). Le parser
 * de texte (`featureRichText`) et le rendu (`FeatureRichText.tsx`) le consomment.
 *
 * Les 7 CARACTÉRISTIQUES n'y figurent PAS : elles restent balisées `@CODE` dans
 * `richText` (cf. `featureRichText`) pour distinguer un CALCUL (`[CHA]`) d'un
 * simple RENVOI (`@FOR`). Le glossaire ne couvre que les termes auto-reconnus
 * dans le texte (aucun balisage), car ils ne sont jamais ambigus ni calculés.
 *
 * Deux catégories (retour propriétaire) :
 *  - `derived` : stat dérivée du personnage → puce mise en avant (couleur dédiée) ;
 *  - `jargon`  : terme de règle (ni carac ni stat du perso) → souligné pointillé.
 *
 * Termes relevés par balayage des 660 capacités (toutes familles). Ensemble fermé
 * et non ambigu (en majuscules dans les textes ; `Init`/`Init.` en casse mixte).
 */
export type GlossaryCategory = 'derived' | 'jargon';

export interface GlossaryEntry {
  /** Libellé complet affiché en info-bulle (français). */
  label: string;
  category: GlossaryCategory;
}

export const GLOSSARY: Record<string, GlossaryEntry> = {
  // --- Stats dérivées (puce dédiée) ---
  DEF: { label: 'Défense', category: 'derived' },
  PV: { label: 'Points de vie', category: 'derived' },
  PM: { label: 'Points de mana', category: 'derived' },
  PC: { label: 'Points de chance', category: 'derived' },
  DR: { label: 'Dés de récupération', category: 'derived' },
  Init: { label: 'Initiative', category: 'derived' },
  // --- Jargon (souligné pointillé) ---
  NC: { label: 'Niveau de créature', category: 'jargon' },
  RD: { label: 'Réduction de dégâts', category: 'jargon' },
  DM: { label: 'Dégâts', category: 'jargon' },
  MJ: { label: 'Meneur de jeu', category: 'jargon' },
  PJ: { label: 'Personnage-joueur', category: 'jargon' },
  PNJ: { label: 'Personnage non-joueur', category: 'jargon' },
};

/** Un fragment de texte découpé : texte brut, ou terme du glossaire reconnu. */
export type GlossaryPiece =
  | { kind: 'text'; value: string }
  | { kind: 'term'; term: string; entry: GlossaryEntry };

// `Init` peut être suivi d'un point (« Init. ») — capté et conservé à l'affichage,
// sans avaler la ponctuation des autres termes (« un bonus de DEF. » garde son point).
// Tri des autres clés du plus long au plus court (PNJ avant PJ). Casse SENSIBLE :
// « def » en minuscules dans une phrase n'est pas un acronyme.
const PLAIN_KEYS = Object.keys(GLOSSARY)
  .filter((k) => k !== 'Init')
  .sort((a, b) => b.length - a.length);
const GLOSSARY_RE = new RegExp(`\\bInit\\b\\.?|\\b(?:${PLAIN_KEYS.join('|')})\\b`, 'g');

/**
 * Découpe une chaîne en alternant texte brut et termes du glossaire reconnus.
 * Les termes inconnus restent du texte. Pur (sans React), testable isolément.
 */
export function splitGlossary(text: string): GlossaryPiece[] {
  const pieces: GlossaryPiece[] = [];
  let last = 0;
  GLOSSARY_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  const pushText = (v: string) => {
    if (v) pieces.push({ kind: 'text', value: v });
  };
  while ((m = GLOSSARY_RE.exec(text)) !== null) {
    const raw = m[0];
    const key = raw.replace(/\.$/, ''); // « Init. » → « Init »
    const entry = GLOSSARY[key];
    if (!entry) continue; // garde-fou (ne devrait pas arriver)
    pushText(text.slice(last, m.index));
    pieces.push({ kind: 'term', term: raw, entry });
    last = GLOSSARY_RE.lastIndex;
  }
  pushText(text.slice(last));
  return pieces;
}
