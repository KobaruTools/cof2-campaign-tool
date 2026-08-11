/**
 * PER-397 — extensions Tiptap de l'éditeur MVP branché sur `CustomItem.description`.
 * Réduit délibérément à ce que la syntaxe texte (PER-395) sait exprimer : gras/italique/barré
 * (marques `@tiptap/extension-*` étendues) + couleur/taille (marques maison `richColor`/
 * `richSize`) + un unique paragraphe (voir `SingleParagraph` plus bas). Tout le reste de
 * `StarterKit` (titres, listes, citations, liens, blocs de code…) est désactivé : la grammaire
 * PER-395 n'a pas de syntaxe pour ça, l'activer laisserait l'éditeur produire un document que
 * la sérialisation (`richTextEditorSync.ts`) ne saurait pas rendre fidèlement.
 */
import { mergeAttributes, Extension, Mark } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import TiptapBold from '@tiptap/extension-bold';
import TiptapItalic from '@tiptap/extension-italic';
import TiptapStrike from '@tiptap/extension-strike';
import {
  RICH_COLOR_NAMES,
  RICH_SIZE_NAMES,
  richColorCssVar,
  richSizeSx,
  type RichColorName,
  type RichSizeName,
} from '@/lib/ui/featureRichText';

/**
 * Groupe d'exclusion mutuelle des 5 marques MVP : la grammaire PER-395 est PLATE (une marque
 * commencée avant une autre et refermée après n'est pas re-parsée, cf. note de robustesse de
 * `splitMarkdownMarks`) — appliquer une marque du groupe sur un passage doit donc en retirer
 * toute autre déjà présente. Portée au niveau du SCHÉMA (`group`/`excludes`), pas seulement
 * dans la barre d'outils : ProseMirror l'applique alors quel que soit le chemin d'entrée
 * (bouton, raccourci clavier `Mod-b`, collage…), pas seulement les clics qu'on anticipe.
 */
const FORMAT_GROUP = 'cof2Format';

const Bold = TiptapBold.extend({ group: FORMAT_GROUP, excludes: FORMAT_GROUP });
const Italic = TiptapItalic.extend({ group: FORMAT_GROUP, excludes: FORMAT_GROUP });
const Strike = TiptapStrike.extend({ group: FORMAT_GROUP, excludes: FORMAT_GROUP });

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    richColor: {
      /** Applique `{{color:nom}}…{{/color}}` sur la sélection (remplace toute autre marque du groupe). */
      setRichColor: (name: RichColorName) => ReturnType;
      unsetRichColor: () => ReturnType;
    };
    richSize: {
      /** Applique `{{size:nom}}…{{/size}}` sur la sélection (remplace toute autre marque du groupe). */
      setRichSize: (name: RichSizeName) => ReturnType;
      unsetRichSize: () => ReturnType;
    };
  }
}

/** `{{color:nom}}…{{/color}}` (PER-395) — couleur en variable CSS du thème, jamais une valeur libre. */
const RichColor = Mark.create({
  name: 'richColor',
  group: FORMAT_GROUP,
  excludes: FORMAT_GROUP,
  addAttributes() {
    return {
      name: {
        default: RICH_COLOR_NAMES[0],
        parseHTML: (el: HTMLElement) => el.getAttribute('data-rich-color'),
        renderHTML: (attrs: { name: RichColorName }) => ({ 'data-rich-color': attrs.name }),
      },
    };
  },
  parseHTML() {
    return [{ tag: 'span[data-rich-color]' }];
  },
  renderHTML({ HTMLAttributes, mark }) {
    const name = mark.attrs.name as RichColorName;
    return ['span', mergeAttributes(HTMLAttributes, { style: `color:${richColorCssVar(name)}` }), 0];
  },
  addCommands() {
    return {
      setRichColor:
        (name: RichColorName) =>
        ({ commands }: { commands: { setMark: (type: string, attrs?: Record<string, unknown>) => boolean } }) =>
          commands.setMark(this.name, { name }),
      unsetRichColor:
        () =>
        ({ commands }: { commands: { unsetMark: (type: string) => boolean } }) =>
          commands.unsetMark(this.name),
    };
  },
});

/** `{{size:nom}}…{{/size}}` (PER-395) — taille en `em` relatif, même mapping que le rendu de lecture. */
const RichSize = Mark.create({
  name: 'richSize',
  group: FORMAT_GROUP,
  excludes: FORMAT_GROUP,
  addAttributes() {
    return {
      name: {
        default: RICH_SIZE_NAMES[0],
        parseHTML: (el: HTMLElement) => el.getAttribute('data-rich-size'),
        renderHTML: (attrs: { name: RichSizeName }) => ({ 'data-rich-size': attrs.name }),
      },
    };
  },
  parseHTML() {
    return [{ tag: 'span[data-rich-size]' }];
  },
  renderHTML({ HTMLAttributes, mark }) {
    const name = mark.attrs.name as RichSizeName;
    return ['span', mergeAttributes(HTMLAttributes, { style: `font-size:${richSizeSx(name)}` }), 0];
  },
  addCommands() {
    return {
      setRichSize:
        (name: RichSizeName) =>
        ({ commands }: { commands: { setMark: (type: string, attrs?: Record<string, unknown>) => boolean } }) =>
          commands.setMark(this.name, { name }),
      unsetRichSize:
        () =>
        ({ commands }: { commands: { unsetMark: (type: string) => boolean } }) =>
          commands.unsetMark(this.name),
    };
  },
});

/**
 * Document à un seul paragraphe (cf. note de tête `richTextEditorSync.ts`) : `Enter` ET
 * `Shift+Enter` insèrent tous les deux un `hardBreak` au lieu de scinder un nouveau paragraphe
 * — la grammaire PER-395 ne distingue pas les deux (un `\n` est un `\n`, `whiteSpace: pre-line`
 * au rendu), et un second paragraphe ne se sérialiserait pas de façon exacte au nombre de
 * sauts de ligne d'origine.
 */
const SingleParagraph = Extension.create({
  name: 'singleParagraph',
  addKeyboardShortcuts() {
    const insertBreak = () => this.editor.commands.setHardBreak();
    return { Enter: insertBreak, 'Shift-Enter': insertBreak };
  },
});

/** Extensions complètes de l'éditeur de description (`ItemDescriptionEditor.tsx`). */
export const RICH_TEXT_EDITOR_EXTENSIONS = [
  StarterKit.configure({
    // Ces désactivations reflètent le PÉRIMÈTRE MVP (5 marques inline) : aucune syntaxe PER-395
    // pour un titre/une liste/une citation/du code/un lien/une règle horizontale.
    blockquote: false,
    bulletList: false,
    code: false,
    codeBlock: false,
    gapcursor: false,
    heading: false,
    horizontalRule: false,
    link: false,
    listItem: false,
    listKeymap: false,
    orderedList: false,
    // Remplacées ci-dessous par les variantes étendues (groupe d'exclusion) : jamais les deux
    // en même temps dans le schéma, sous peine de collision de nom de marque.
    bold: false,
    italic: false,
    strike: false,
  }),
  Bold,
  Italic,
  Strike,
  RichColor,
  RichSize,
  SingleParagraph,
];
