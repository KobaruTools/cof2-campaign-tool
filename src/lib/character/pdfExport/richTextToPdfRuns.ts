/**
 * Pont entre la grammaire de texte enrichi des capacités (`parseRichText`,
 * `src/lib/ui/featureRichText.ts`) et un PDF (`@react-pdf/renderer`, PER-201).
 *
 * `FeatureRichText.tsx` rend cette même grammaire en DOM (puces colorées, icônes de dé,
 * info-bulles) — inutile sur papier. Ici on RÉSOUT la même grammaire (aucune règle
 * réinterprétée : mêmes fonctions pures `parseRichText`/`resolveExpr`/`dieAtRank`) vers du
 * texte plat, avec seulement le gras conservé (seule marque qui survit à l'impression).
 * Les couleurs/tailles (PER-395) sont volontairement aplaties en texte simple : sans
 * incidence sur le sens de la règle, seulement sur l'emphase visuelle.
 */
import { featureById } from '@/data';
import { STATUS_EFFECTS } from '@/data/schema';
import { dieAtRank, parseRichText, resolveExpr, type ExprTerm } from '@/lib/ui/featureRichText';
import type { Abilities } from '@/lib/engine';
import { progression } from '@/data';

/** Segment de texte prêt pour un `<Text>` `@react-pdf/renderer` : gras optionnel, jamais imbriqué. */
export interface PdfTextRun {
  text: string;
  bold?: true;
}

/** Contexte de résolution des formules/dés d'un rang de voie (mêmes entrées que `resolveExpr`). */
export interface RichTextPdfContext {
  abilities: Abilities;
  level: number;
  /** Rang ATTEINT dans la voie hôte du texte résolu (paliers de dé, `[#rang]`…). */
  rank: number;
}

const signedConnector = (i: number, sign: 1 | -1) =>
  i > 0 ? ` ${sign === -1 ? '−' : '+'} ` : sign === -1 ? '− ' : '';

/** Rend `terms` en texte plat : total signé si déterministe, sinon le détail « symbole (valeur) ». */
function formatTerms(terms: ExprTerm[], ctx: RichTextPdfContext): string {
  const resolved = resolveExpr(terms, ctx.abilities, ctx.level, progression, ctx.rank);
  if (!resolved.hasDie && resolved.parts.length > 1) {
    return `${resolved.total}`;
  }
  return resolved.parts
    .map((p, i) => {
      // Un dé n'a pas de valeur À AFFICHER (il est lancé à la table, `value` vaut `null`) :
      // seul son symbole compte (« 1d4° »), comme `FormulaWithDie` (FeatureRichText.tsx).
      const body = p.kind === 'number' || p.kind === 'die' ? p.symbol : `${p.symbol} (${p.value ?? 0})`;
      return signedConnector(i, p.sign) + body;
    })
    .join('');
}

/**
 * Résout un texte enrichi (`Feature.richText` ou `.text`) en une suite de runs plats, pour un
 * rang de voie et un personnage donnés. Fonction pure, testable : aucune dépendance React/PDF.
 */
export function richTextToPdfRuns(richText: string, ctx: RichTextPdfContext): PdfTextRun[] {
  const runs: PdfTextRun[] = [];
  const push = (text: string, bold?: true) => {
    if (!text) return;
    runs.push(bold ? { text, bold } : { text });
  };
  for (const seg of parseRichText(richText)) {
    switch (seg.kind) {
      case 'text':
        push(seg.value);
        break;
      case 'bold':
        push(seg.value, true);
        break;
      case 'italic':
      case 'strike':
        // Emphase visuelle seulement (PER-395) : aplatie en texte simple à l'impression.
        push(seg.value);
        break;
      case 'color':
      case 'size':
        push(seg.value);
        break;
      case 'die': {
        const { count, die, evolving } = dieAtRank(seg.token, ctx.rank);
        push(`${count > 1 ? count : ''}${die}${evolving ? '°' : ''}`);
        break;
      }
      case 'abilityRef':
        push(seg.ability);
        break;
      case 'statusRef':
        push(STATUS_EFFECTS[seg.stateId].label);
        break;
      case 'capabilityRef':
        push(seg.label ?? featureById.get(seg.featureId)?.name ?? seg.featureId);
        break;
      case 'expr':
      case 'quantity':
      case 'term':
        push(formatTerms(seg.terms, ctx));
        break;
    }
  }
  return runs;
}
