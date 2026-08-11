/**
 * PER-397 — pont PUR entre la syntaxe texte posée par PER-395 (`**gras**`, `*italique*`,
 * `~~barré~~`, `{{color:nom}}…{{/color}}`, `{{size:nom}}…{{/size}}`) et le document Tiptap
 * (`JSONContent`) branché sur `CustomItem.description`. Aucun HTML n'est jamais produit ni lu
 * ici — uniquement le JSON de document ProseMirror/Tiptap, en mémoire.
 *
 * Modèle de document DÉLIBÉRÉMENT plat : un seul paragraphe, les sauts de ligne devenant des
 * nœuds `hardBreak` (un par `\n` du texte source, `Enter` ET `Shift+Enter` produisent le même
 * nœud — cf. `richTextEditorExtensions.ts`). Le rendu de lecture actuel (`whiteSpace: pre-line`)
 * ne distingue de toute façon pas « paragraphe » de « retour à la ligne » : un texte à N `\n`
 * consécutifs redevient N `hardBreak` consécutifs, jamais regroupé par paire — round-trip exact
 * quel que soit le nombre de retours à la ligne d'origine.
 *
 * Les 5 marques MVP sont MUTUELLEMENT EXCLUSIVES sur un même passage (imposé par le schéma
 * Tiptap, `richTextEditorExtensions.ts`) : la grammaire PER-395 ne les imbrique jamais (une
 * marque commencée avant une autre et refermée après n'est pas reconnue par `splitMarkdownMarks`,
 * cf. sa note de robustesse) — chaque nœud `text` ne porte donc jamais plus d'une marque, ce qui
 * rend la sérialisation ci-dessous triviale (pas de gestion d'imbrication à inventer).
 */
import type { JSONContent } from '@tiptap/core';
import { splitMarkdownMarks, type RichColorName, type RichSizeName } from './featureRichText';

/** Nom de marque Tiptap pour chaque famille (les 3 premières sont les marques `@tiptap/extension-*` étendues). */
type MarkType = 'bold' | 'italic' | 'strike' | 'richColor' | 'richSize';

/**
 * Convertit le texte stocké (`CustomItem.description`) en document Tiptap initial. Chaîne
 * vide → paragraphe vide (Tiptap l'accepte sans `content`).
 */
export function descriptionToDoc(text: string): JSONContent {
  const lines = text.split('\n');
  const content: JSONContent[] = [];
  lines.forEach((line, i) => {
    if (i > 0) content.push({ type: 'hardBreak' });
    // `splitMarkdownMarks` n'émet jamais que ces 6 natures (texte + 5 marques) — les autres
    // membres de l'union `RichTextSegment` (dé/formule/référence…) viennent de `parseRichText`,
    // jamais de ce parseur-ci ; les branches ci-dessous couvrent donc tout cas réel.
    for (const seg of splitMarkdownMarks(line)) {
      if (seg.kind === 'text') {
        if (seg.value) content.push({ type: 'text', text: seg.value });
        continue;
      }
      // Une marque sur une plage VIDE (`**{{color:rouge}}...` mal formé donnant `value: ''`)
      // n'a rien à porter — ProseMirror interdit un nœud `text` de longueur nulle.
      if (seg.kind === 'bold' || seg.kind === 'italic' || seg.kind === 'strike') {
        if (seg.value) content.push({ type: 'text', text: seg.value, marks: [{ type: seg.kind }] });
        continue;
      }
      if (seg.kind === 'color' || seg.kind === 'size') {
        if (!seg.value) continue;
        const type: MarkType = seg.kind === 'color' ? 'richColor' : 'richSize';
        content.push({ type: 'text', text: seg.value, marks: [{ type, attrs: { name: seg.name } }] });
      }
    }
  });
  return { type: 'doc', content: [{ type: 'paragraph', ...(content.length ? { content } : {}) }] };
}

/** Rouvre la marque unique (au plus une, cf. note d'exclusivité ci-dessus) portée par un nœud `text`. */
function wrapMarked(text: string, markType: string, attrs: Record<string, unknown> | undefined): string {
  switch (markType) {
    case 'bold':
      return `**${text}**`;
    case 'italic':
      return `*${text}*`;
    case 'strike':
      return `~~${text}~~`;
    case 'richColor': {
      const name = attrs?.name as RichColorName;
      return `{{color:${name}}}${text}{{/color}}`;
    }
    case 'richSize': {
      const name = attrs?.name as RichSizeName;
      return `{{size:${name}}}${text}{{/size}}`;
    }
    default:
      return text;
  }
}

function inlineNodeToText(node: JSONContent): string {
  if (node.type === 'hardBreak') return '\n';
  if (node.type !== 'text') return '';
  const text = node.text ?? '';
  const mark = node.marks?.[0];
  return mark ? wrapMarked(text, mark.type, mark.attrs) : text;
}

/** Convertit un document Tiptap (`editor.getJSON()`) en texte à stocker dans `CustomItem.description`. */
export function docToDescription(doc: JSONContent): string {
  const paragraphs = doc.content ?? [];
  return paragraphs.map((p) => (p.content ?? []).map(inlineNodeToText).join('')).join('\n\n');
}
