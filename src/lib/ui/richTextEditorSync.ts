/**
 * PER-397 — pont PUR entre la syntaxe texte posée par PER-395 (`**gras**`, `*italique*`,
 * `~~barré~~`, `{{color:nom}}…{{/color}}`, `{{size:nom}}…{{/size}}`) et le document Tiptap
 * (`JSONContent`) branché sur `CustomItem.description`. Aucun HTML n'est jamais produit ni lu
 * ici — uniquement le JSON de document ProseMirror/Tiptap, en mémoire.
 *
 * Modèle de document : une suite de BLOCS DE TÊTE, chacun étant soit un paragraphe de texte
 * courant, soit une liste (`bulletList`/`orderedList`/`taskList`). Chaque ligne source (`\n`) est
 * classée par `classifyLine` ci-dessous ; des lignes consécutives de MÊME nature forment un seul
 * bloc. Round-trip garanti :
 * - dans un bloc paragraphe, chaque `\n` interne redevient un `hardBreak` (comme avant les
 *   listes) — `whiteSpace: pre-line` au rendu ne distingue pas paragraphe et retour à la ligne ;
 * - une ligne vide entre deux blocs n'est jamais perdue : elle est classée `none` comme le
 *   paragraphe voisin auquel elle s'accroche (avant une liste : elle rejoint le paragraphe
 *   PRÉCÉDENT ; après une liste : le paragraphe SUIVANT), donc conservée comme `hardBreak` vide
 *   dans CE paragraphe. Les blocs sont ensuite rejoints par un simple `\n` (jamais `\n\n`) : la
 *   ligne vide absorbée fournit déjà le second saut.
 *
 * Listes (`- item`, `1. item`, `- [ ] item`/`- [x] item`) DÉLIBÉRÉMENT PLATES (pas
 * d'imbrication — cf. `TaskItem.configure({ nested: false })`, `richTextEditorExtensions.tsx`).
 * Deux simplifications ASSUMÉES (l'éditeur ne produit jamais ces cas, seul du texte tapé à la
 * main hors éditeur pourrait les perdre) :
 * - la numérotation d'une liste numérotée n'est PAS préservée item par item : seul le numéro du
 *   PREMIER item est retenu (`orderedList.attrs.start`), les suivants renumérotés séquentiellement
 *   à la sérialisation ;
 * - l'espacement entre le marqueur (`-`, `1.`, `[ ]`) et le texte n'est pas préservé au delà d'un
 *   simple espace.
 *
 * Les 5 marques MVP sont MUTUELLEMENT EXCLUSIVES sur un même passage (imposé par le schéma
 * Tiptap, `richTextEditorExtensions.ts`) : la grammaire PER-395 ne les imbrique jamais (une
 * marque commencée avant une autre et refermée après n'est pas reconnue par `splitMarkdownMarks`,
 * cf. sa note de robustesse) — chaque nœud `text` ne porte donc jamais plus d'une marque, ce qui
 * rend la sérialisation ci-dessous triviale (pas de gestion d'imbrication à inventer).
 */
import type { JSONContent } from '@tiptap/core';
import { splitMarkdownMarks, splitMechanicalTokens, type RichColorName, type RichSizeName } from './featureRichText';

/** Nom de marque Tiptap pour chaque famille (les 3 premières sont les marques `@tiptap/extension-*` étendues). */
type MarkType = 'bold' | 'italic' | 'strike' | 'richColor' | 'richSize';

type ListKind = 'bullet' | 'ordered' | 'task';

/** Une ligne source classée (marqueur de liste détecté, ou `none` = texte courant). */
interface ClassifiedLine {
  kind: ListKind | 'none';
  /** Ligne d'origine, verbatim — utilisée seulement pour `kind: 'none'`. */
  raw: string;
  /** Texte APRÈS le marqueur — utilisé seulement pour un `kind` de liste. */
  itemText?: string;
  /** Numéro d'origine de l'item (`kind: 'ordered'` seulement). */
  num?: number;
  /** Coché (`kind: 'task'` seulement). */
  checked?: boolean;
}

// Testée EN PREMIER : `- [ ] texte` / `- [x] texte` matcherait aussi `TASK_RE`… et `BULLET_RE`
// (moins spécifique) si on l'essayait avant.
const TASK_RE = /^-\s+\[([ xX])\]\s+(.*)$/;
const BULLET_RE = /^-\s+(.*)$/;
const ORDERED_RE = /^(\d+)\.\s+(.*)$/;

function classifyLine(line: string): ClassifiedLine {
  const task = TASK_RE.exec(line);
  if (task) return { kind: 'task', raw: line, itemText: task[2], checked: task[1].toLowerCase() === 'x' };
  const bullet = BULLET_RE.exec(line);
  if (bullet) return { kind: 'bullet', raw: line, itemText: bullet[1] };
  const ordered = ORDERED_RE.exec(line);
  if (ordered) return { kind: 'ordered', raw: line, itemText: ordered[2], num: Number(ordered[1]) };
  return { kind: 'none', raw: line };
}

/** Regroupe des lignes classées consécutives de MÊME nature en un seul bloc. */
function groupLines(lines: string[]): ClassifiedLine[][] {
  const classified = lines.map(classifyLine);
  const blocks: ClassifiedLine[][] = [];
  for (const line of classified) {
    const current = blocks[blocks.length - 1];
    if (current && current[0].kind === line.kind) current.push(line);
    else blocks.push([line]);
  }
  return blocks;
}

/**
 * Convertit un morceau de texte SANS token mécanique (déjà isolé par `splitMechanicalTokens`,
 * PER-398) en nœuds `text` marqués, poussés dans `content`. `splitMarkdownMarks` n'émet jamais
 * que ces 6 natures (texte + 5 marques) — les branches ci-dessous couvrent donc tout cas réel.
 */
function pushMarkedText(content: JSONContent[], line: string): void {
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
}

/** Tokens mécaniques (PER-398) EN PREMIER, puis les 5 marques MVP sur ce qui reste — une ligne, sans `\n`. */
function buildInlineContent(line: string): JSONContent[] {
  const content: JSONContent[] = [];
  for (const chunk of splitMechanicalTokens(line)) {
    if (chunk.kind === 'token') content.push({ type: 'mechToken', attrs: { raw: chunk.raw } });
    else pushMarkedText(content, chunk.value);
  }
  return content;
}

/** Bloc paragraphe : les lignes `none` du groupe, jointes par des `hardBreak`. */
function buildParagraphBlock(lines: ClassifiedLine[]): JSONContent {
  const content: JSONContent[] = [];
  lines.forEach((line, i) => {
    if (i > 0) content.push({ type: 'hardBreak' });
    content.push(...buildInlineContent(line.raw));
  });
  return { type: 'paragraph', ...(content.length ? { content } : {}) };
}

function buildListItemParagraph(itemText: string): JSONContent {
  const content = buildInlineContent(itemText);
  return { type: 'paragraph', ...(content.length ? { content } : {}) };
}

function buildListBlock(lines: ClassifiedLine[]): JSONContent {
  const kind = lines[0].kind as ListKind;
  if (kind === 'bullet') {
    return { type: 'bulletList', content: lines.map((l) => ({ type: 'listItem', content: [buildListItemParagraph(l.itemText ?? '')] })) };
  }
  if (kind === 'ordered') {
    return {
      type: 'orderedList',
      attrs: { start: lines[0].num ?? 1 },
      content: lines.map((l) => ({ type: 'listItem', content: [buildListItemParagraph(l.itemText ?? '')] })),
    };
  }
  return {
    type: 'taskList',
    content: lines.map((l) => ({
      type: 'taskItem',
      attrs: { checked: !!l.checked },
      content: [buildListItemParagraph(l.itemText ?? '')],
    })),
  };
}

/**
 * Convertit le texte stocké (`CustomItem.description`) en document Tiptap initial. Chaîne
 * vide → paragraphe vide (Tiptap l'accepte sans `content`). Voir la note de tête pour le
 * découpage en blocs (paragraphe(s)/liste(s)).
 */
export function descriptionToDoc(text: string): JSONContent {
  const blocks = groupLines(text.split('\n'));
  return {
    type: 'doc',
    content: blocks.map((lines) => (lines[0].kind === 'none' ? buildParagraphBlock(lines) : buildListBlock(lines))),
  };
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
  // Token mécanique (PER-398) : `attrs.raw` porte le texte source exact posé par `descriptionToDoc`.
  if (node.type === 'mechToken') return (node.attrs?.raw as string | undefined) ?? '';
  if (node.type !== 'text') return '';
  const text = node.text ?? '';
  const mark = node.marks?.[0];
  return mark ? wrapMarked(text, mark.type, mark.attrs) : text;
}

function paragraphToText(paragraph: JSONContent | undefined): string {
  return (paragraph?.content ?? []).map(inlineNodeToText).join('');
}

/** Une ligne de liste = marqueur + texte du (seul) paragraphe porté par l'item. */
function listItemToLine(item: JSONContent, marker: string): string {
  return `${marker}${paragraphToText(item.content?.[0])}`;
}

function blockToText(block: JSONContent): string {
  if (block.type === 'bulletList') return (block.content ?? []).map((item) => listItemToLine(item, '- ')).join('\n');
  if (block.type === 'orderedList') {
    const start = (block.attrs?.start as number | undefined) ?? 1;
    return (block.content ?? []).map((item, i) => listItemToLine(item, `${start + i}. `)).join('\n');
  }
  if (block.type === 'taskList') {
    return (block.content ?? [])
      .map((item) => listItemToLine(item, `- [${item.attrs?.checked ? 'x' : ' '}] `))
      .join('\n');
  }
  // Paragraphe (ou type de bloc inconnu, jamais produit par `descriptionToDoc` — repli inoffensif).
  return paragraphToText(block);
}

/**
 * Convertit un document Tiptap (`editor.getJSON()`) en texte à stocker dans
 * `CustomItem.description`. Les blocs sont rejoints par un simple `\n` — pas `\n\n` — car une
 * ligne vide entre deux blocs a déjà été absorbée comme `hardBreak` dans le paragraphe voisin
 * (cf. note de tête).
 */
export function docToDescription(doc: JSONContent): string {
  return (doc.content ?? []).map(blockToText).join('\n');
}
