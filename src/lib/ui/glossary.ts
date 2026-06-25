/**
 * Glossaire des acronymes des textes de règles CO2 — couche de PRÉSENTATION
 * (PER-69, retour propriétaire). SOURCE UNIQUE pour le rendu enrichi : chaque
 * acronyme reçoit une catégorie et un libellé français (info-bulle). Le parser
 * de texte (`featureRichText`) et le rendu (`FeatureRichText.tsx`) le consomment.
 *
 * Trois catégories (retour propriétaire) :
 *  - `ability` : une des 7 CARACTÉRISTIQUES → puce neutre (comme un renvoi `@CODE`) ;
 *  - `derived` : stat dérivée du personnage → puce mise en avant (couleur dédiée) ;
 *  - `jargon`  : terme de règle (ni carac ni stat du perso) → souligné pointillé.
 *
 * Les caractéristiques sont auto-reconnues EN PROSE (texte littéral) au même titre
 * que les autres termes. Le balisage `@CODE` reste utile/équivalent pour forcer une
 * puce (ex. renvoi d'une stat de CIBLE) ; il est traité par le parser, en amont, et
 * ne passe donc pas par le glossaire. Dans une FORMULE `[CHA]`, la carac est un
 * jeton calculé du parser, jamais du texte — aucun risque de double traitement.
 *
 * Termes relevés par balayage des 660 capacités (toutes familles). Ensemble fermé
 * et non ambigu (en majuscules dans les textes ; `Init`/`Init.` en casse mixte).
 */
import { ABILITY_IDS } from '@/data/schema';
import { ABILITY_NAMES } from './ability';

export type GlossaryCategory = 'ability' | 'derived' | 'jargon';

export interface GlossaryEntry {
  /** Libellé complet affiché en info-bulle (français). */
  label: string;
  category: GlossaryCategory;
}

/** Les 7 caractéristiques, libellées via la source unique `ABILITY_NAMES`. */
const ABILITY_ENTRIES = Object.fromEntries(
  ABILITY_IDS.map((id) => [id, { label: ABILITY_NAMES[id], category: 'ability' as const }]),
) as Record<string, GlossaryEntry>;

export const GLOSSARY: Record<string, GlossaryEntry> = {
  // --- Caractéristiques (puce neutre) ---
  ...ABILITY_ENTRIES,
  // --- Stats dérivées (puce dédiée) ---
  DEF: { label: 'Défense', category: 'derived' },
  PV: { label: 'Points de vigueur', category: 'derived' },
  PM: { label: 'Points de mana', category: 'derived' },
  PC: { label: 'Points de chance', category: 'derived' },
  DR: { label: 'Dés de récupération', category: 'derived' },
  Init: { label: 'Initiative', category: 'derived' },
  // Le mot complet « Initiative » (en plus de l'acronyme « Init ») → même puce dérivée
  // (PER-121, retour propriétaire). `\bInit\b` ne capte PAS « Initiative » (pas de
  // frontière après « Init »), donc les deux clés coexistent sans conflit.
  Initiative: { label: 'Initiative', category: 'derived' },
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

// ---------------------------------------------------------------------------
// Termes de JEU (locutions) — auto-détectés, sans balisage (retour propriétaire)
// ---------------------------------------------------------------------------

/**
 * Notions de règle exprimées en LOCUTIONS (pas des acronymes), reconnues
 * automatiquement dans le texte littéral comme le glossaire :
 *  - `action` : une ACTION DE JET (« test », « test opposé ») → mise en GRAS ;
 *  - `attack` : un JET D'ATTAQUE, qui EST une stat dérivée du moteur
 *    (`magicAttack`/`rangedAttack`/`meleeAttack`) → même puce que les autres stats
 *    dérivées (teinte ambre `derived`), avec info-bulle ;
 *  - `rule` : une NOTION DE RÈGLE nommée en locution (« attaque sournoise »,
 *    « surpris », « dans le dos ») → même rendu que le jargon acronyme (souligné
 *    pointillé + info-bulle, cf. `GlossaryMark`). Étend le glossaire aux concepts
 *    récurrents qui ne sont ni acronyme, ni carac/stat, ni action de jet (PER-71).
 *
 * Insensible à la casse (un « Test » en début de phrase compte), contrairement aux
 * acronymes. La casse d'origine est conservée à l'affichage. Le livre emploie deux
 * formes pour le contact (« au contact » / « de contact ») : les deux sont captées.
 */
export type GameTermCategory = 'action' | 'attack' | 'rule';

export interface GameTermEntry {
  /** Libellé affiché en info-bulle (français). Vide pour `action` (gras sans bulle). */
  label: string;
  category: GameTermCategory;
}

export const GAME_TERMS: Record<string, GameTermEntry> = {
  // --- Jets d'attaque (puce de stat dérivée, ambre) ---
  'attaque magique': { label: 'Attaque magique', category: 'attack' },
  'attaque à distance': { label: 'Attaque à distance', category: 'attack' },
  'attaque au contact': { label: 'Attaque au contact', category: 'attack' },
  'attaque de contact': { label: 'Attaque au contact', category: 'attack' },
  // --- Action de jet (gras, sans info-bulle) ---
  'test opposé': { label: '', category: 'action' },
  'tests opposés': { label: '', category: 'action' },
  test: { label: '', category: 'action' },
  tests: { label: '', category: 'action' },
  // --- Notions de règle en locution (souligné pointillé + info-bulle, PER-71) ---
  // Vocabulaire récurrent de l'attaque sournoise du voleur (assassin-r2/r3/r5,
  // aventurier-r2/r5, deplacement-r3, spadassin-r5…). Défini ICI une seule fois.
  'attaque sournoise': {
    label:
      "Attaque sournoise : contre une cible surprise ou attaquée dans le dos, le voleur inflige des dés de DM supplémentaires avec une arme légère (voie de l'assassin, p. 74).",
    category: 'rule',
  },
  surpris: {
    label:
      "Surpris : adversaire pris au dépourvu (qui n'a pas encore agi ou ne perçoit pas la menace) — condition d'une attaque sournoise.",
    category: 'rule',
  },
  'dans le dos': {
    label:
      "Attaquer dans le dos : quand le voleur attaque la même créature qu'un allié à son contact, il est considéré l'attaquer dans le dos — sauf si elle peut se placer dos à un obstacle infranchissable (p. 74).",
    category: 'rule',
  },
  'tourne le dos': {
    label:
      "Attaquer dans le dos : quand le voleur attaque la même créature qu'un allié à son contact, il est considéré l'attaquer dans le dos — sauf si elle peut se placer dos à un obstacle infranchissable (p. 74).",
    category: 'rule',
  },
  // Ajout PER-114 (rôdeur, Chasseur émérite) : la catégorie « insectes » des ennemis jurés inclut
  // tous les arthropodes. Remplace la note de bas « * arthropodes inclus » par une info-bulle
  // auto-détectée, partout où le mot apparaît (ex. aussi l'option d'animaux du druide).
  insectes: {
    label: 'Insectes : la catégorie inclut tous les arthropodes (araignées, scorpions, etc.).',
    category: 'rule',
  },
};

/** Un fragment de texte : texte brut, ou locution de jeu reconnue. */
export type GameTermPiece =
  | { kind: 'text'; value: string }
  | { kind: 'game'; term: string; entry: GameTermEntry };

// Locutions triées de la PLUS LONGUE à la plus courte pour que « test opposé » prime
// sur « test » et « attaque magique » sur un éventuel « attaque ». Bornes Unicode
// (`\p{L}\p{N}`, drapeau `u`) car les locutions contiennent des accents (« opposé »,
// « à ») que `\b` (ASCII) ne délimite pas correctement. Insensible à la casse (`i`).
const GAME_TERM_KEYS = Object.keys(GAME_TERMS).sort((a, b) => b.length - a.length);
const GAME_TERMS_RE = new RegExp(
  `(?<![\\p{L}\\p{N}])(?:${GAME_TERM_KEYS.join('|')})(?![\\p{L}\\p{N}])`,
  'giu',
);

/**
 * Découpe une chaîne en alternant texte brut et locutions de jeu reconnues. Les
 * morceaux de texte restants sont destinés à repasser ensuite par `splitGlossary`
 * (acronymes) côté rendu. Pur (sans React), testable isolément.
 */
export function splitGameTerms(text: string): GameTermPiece[] {
  const pieces: GameTermPiece[] = [];
  let last = 0;
  GAME_TERMS_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  const pushText = (v: string) => {
    if (v) pieces.push({ kind: 'text', value: v });
  };
  while ((m = GAME_TERMS_RE.exec(text)) !== null) {
    const raw = m[0];
    const entry = GAME_TERMS[raw.toLowerCase()];
    if (!entry) continue; // garde-fou (ne devrait pas arriver)
    pushText(text.slice(last, m.index));
    pieces.push({ kind: 'game', term: raw, entry });
    last = GAME_TERMS_RE.lastIndex;
  }
  pushText(text.slice(last));
  return pieces;
}
