'use client';

/**
 * PER-397 — extensions Tiptap de l'éditeur MVP branché sur `CustomItem.description`.
 * Réduit délibérément à ce que la syntaxe texte (PER-395) sait exprimer : gras/italique/barré
 * (marques `@tiptap/extension-*` étendues) + couleur/taille (marques maison `richColor`/
 * `richSize`) + un unique paragraphe DE TEXTE COURANT (voir `SingleParagraph` plus bas, nuancé
 * ci-dessous pour les listes). Le reste de `StarterKit` (titres, citations, liens, blocs de
 * code…) reste désactivé : la grammaire PER-395/399 n'a pas de syntaxe pour ça, l'activer
 * laisserait l'éditeur produire un document que la sérialisation (`richTextEditorSync.ts`) ne
 * saurait pas rendre fidèlement.
 *
 * PER-398 — étend le schéma d'un node ATOMIQUE `mechToken` (dé, formule/quantité/terme, `@carac`,
 * statut, référence de capacité/renvoi de page) : voir `MechToken` plus bas.
 *
 * (listes) — listes à puce/numérotées (`StarterKit`) + case à cocher (`TaskList`/`TaskItem`,
 * packages séparés) réactivées : `richTextEditorSync.ts` sait maintenant sérialiser un doc à
 * PLUSIEURS blocs de tête (paragraphe(s) + liste(s)), plus seulement un paragraphe unique.
 */
import { mergeAttributes, Extension, Mark, Node } from '@tiptap/core';
import { NodeViewWrapper, ReactNodeViewRenderer, type ReactNodeViewProps } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TiptapBold from '@tiptap/extension-bold';
import TiptapItalic from '@tiptap/extension-italic';
import TiptapStrike from '@tiptap/extension-strike';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Box from '@mui/material/Box';
import {
  RICH_COLOR_NAMES,
  RICH_SIZE_NAMES,
  richColorCssVar,
  richSizeSx,
  type RichColorName,
  type RichSizeName,
} from '@/lib/ui/featureRichText';
import { MechTokenRun } from './FeatureRichText';

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
    mechToken: {
      /** Insère un token mécanique (`raw` = texte source canonique, ex. `{1d4}`, `@FOR`, `[!immobilized]`). */
      insertMechToken: (raw: string) => ReturnType;
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
 * Rendu React d'un `mechToken` (PER-398) : la MÊME puce/icône que la lecture sans contexte de
 * personnage (`MechTokenRun`, `FeatureRichText.tsx`) — source unique, jamais un second rendu qui
 * pourrait diverger de l'aperçu de lecture. Léger cadre en pointillé quand le node est SÉLECTIONNÉ
 * (clic dessus, ou navigation clavier) : seul repère visuel possible pour un atome sans contenu
 * éditable, sinon indiscernable d'un simple affichage.
 */
function MechTokenView({ node, selected }: ReactNodeViewProps) {
  return (
    <NodeViewWrapper as="span" style={{ display: 'inline-flex', verticalAlign: 'middle' }}>
      <Box
        component="span"
        sx={{
          borderRadius: 0.5,
          outline: selected ? '2px solid' : 'none',
          outlineColor: 'primary.main',
          outlineOffset: '1px',
        }}
      >
        <MechTokenRun raw={node.attrs.raw as string} />
      </Box>
    </NodeViewWrapper>
  );
}

/**
 * Node ATOMIQUE (PER-398) portant un token de la grammaire mécanique (dé, formule/quantité/terme,
 * `@carac`, statut, référence de capacité/renvoi de page) — `raw` est le texte source EXACT
 * (`splitMechanicalTokens`, `richTextEditorSync.ts`), jamais recalculé ni réinterprété ici : ce
 * node est une simple BOÎTE opaque pour la sérialisation, le rendu passant par `MechTokenRun`
 * (source unique, partagée avec la lecture). JAMAIS de marque (gras/couleur/etc.) sur ce node :
 * la grammaire ne les imbrique jamais (une marque ne traverse pas un token, cf. note de tête de
 * `featureRichText.ts`) — inutile de déclarer `marks` dans le schéma.
 */
const MechToken = Node.create({
  name: 'mechToken',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,
  addAttributes() {
    return {
      raw: {
        default: '',
        parseHTML: (el: HTMLElement) => el.getAttribute('data-mech-raw'),
        renderHTML: (attrs: { raw: string }) => ({ 'data-mech-raw': attrs.raw }),
      },
    };
  },
  parseHTML() {
    return [{ tag: 'span[data-mech-raw]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes)];
  },
  addNodeView() {
    return ReactNodeViewRenderer(MechTokenView);
  },
  addCommands() {
    return {
      insertMechToken:
        (raw: string) =>
        ({ commands }: { commands: { insertContent: (content: Record<string, unknown>) => boolean } }) =>
          commands.insertContent({ type: this.name, attrs: { raw } }),
    };
  },
});

/**
 * Hors liste, `Enter` ET `Shift+Enter` insèrent tous les deux un `hardBreak` au lieu de scinder
 * un nouveau paragraphe (cf. tête de `richTextEditorSync.ts`) — la grammaire PER-395 ne distingue
 * pas les deux (un `\n` est un `\n`, `whiteSpace: pre-line` au rendu), et un second paragraphe ne
 * se sérialiserait pas de façon exacte au nombre de sauts de ligne d'origine.
 *
 * DANS un élément de liste (à puce/numérotée/case à cocher), on laisse au contraire le
 * comportement PAR DÉFAUT de `ListItem`/`TaskItem` (nouvel élément, ou sortie de liste sur un
 * élément vide) — sinon `Enter` n'y produirait jamais de nouvel item, juste un `hardBreak` dans
 * le même item.
 */
const SingleParagraph = Extension.create({
  name: 'singleParagraph',
  addKeyboardShortcuts() {
    const insertBreak = () => {
      if (this.editor.isActive('listItem') || this.editor.isActive('taskItem')) return false;
      return this.editor.commands.setHardBreak();
    };
    return { Enter: insertBreak, 'Shift-Enter': insertBreak };
  },
});

/** Extensions complètes de l'éditeur de description (`ItemDescriptionEditor.tsx`). */
export const RICH_TEXT_EDITOR_EXTENSIONS = [
  StarterKit.configure({
    // Ces désactivations reflètent le PÉRIMÈTRE MVP (5 marques inline) : aucune syntaxe PER-395
    // pour un titre/une citation/du code/un lien/une règle horizontale. Les listes (bulletList/
    // orderedList/listItem/listKeymap) restent, elles, ACTIVÉES par défaut — cf. `- item`/`1. item`
    // dans `richTextEditorSync.ts`.
    blockquote: false,
    code: false,
    codeBlock: false,
    gapcursor: false,
    heading: false,
    horizontalRule: false,
    link: false,
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
  MechToken,
  // `nested: false` : notre grammaire texte (`- item`, `1. item`, `- [ ] item`) est PLATE, sans
  // indentation — pas de sous-liste à round-tripper.
  TaskList,
  TaskItem.configure({ nested: false }),
  SingleParagraph,
];
