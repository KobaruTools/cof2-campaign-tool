/**
 * Découpe d'un texte de capacité en segments « corps » / « note » (PER-70).
 *
 * Une NOTE est une ligne qui débute — en début de texte ou juste après un saut de
 * ligne — par « Note : » (avec ou sans espace avant le deux-points) et court
 * jusqu'à la fin de sa ligne. Le saut de ligne qui précède reste dans le corps
 * (préservé par le rendu `white-space: pre-line`). Sert au rendu (`FeatureText`) à
 * afficher les notes (renvois, précisions hors règle principale) légèrement plus
 * petites et plus grises, sans rompre le fil de lecture.
 */
export interface TextChunk {
  kind: 'body' | 'note';
  value: string;
}

const NOTE_RE = /(^|\n)(Note ?:[^\n]*)/g;

export function splitNotes(text: string): TextChunk[] {
  const out: TextChunk[] = [];
  let last = 0;
  NOTE_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = NOTE_RE.exec(text))) {
    const noteStart = m.index + m[1].length; // après l'éventuel '\n' capturé (m[1])
    if (noteStart > last) out.push({ kind: 'body', value: text.slice(last, noteStart) });
    out.push({ kind: 'note', value: m[2] });
    last = noteStart + m[2].length;
  }
  if (last < text.length) out.push({ kind: 'body', value: text.slice(last) });
  return out;
}
