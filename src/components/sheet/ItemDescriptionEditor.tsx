'use client';

import { useEffect, useMemo, useState } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import { Placeholder } from '@tiptap/extensions';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Divider from '@mui/material/Divider';
import FormatBoldIcon from '@mui/icons-material/FormatBold';
import FormatItalicIcon from '@mui/icons-material/FormatItalic';
import StrikethroughSIcon from '@mui/icons-material/StrikethroughS';
import FormatColorTextIcon from '@mui/icons-material/FormatColorText';
import FormatSizeIcon from '@mui/icons-material/FormatSize';
import CircleIcon from '@mui/icons-material/Circle';
import { AppTooltip } from '@/components/AppTooltip';
import { RICH_COLOR_NAMES, RICH_SIZE_NAMES, richColorSx, type RichColorName, type RichSizeName } from '@/lib/ui/featureRichText';
import { descriptionToDoc, docToDescription } from '@/lib/ui/richTextEditorSync';
import { RICH_TEXT_EDITOR_EXTENSIONS } from './richTextEditorExtensions';

const COLOR_LABELS: Record<RichColorName, string> = {
  rouge: 'Rouge',
  vert: 'Vert',
  bleu: 'Bleu',
  ambre: 'Ambre',
  violet: 'Violet',
};

const SIZE_LABELS: Record<RichSizeName, string> = {
  petit: 'Petit',
  grand: 'Grand',
};

function ToolbarToggle({
  title,
  active,
  onClick,
  children,
}: {
  title: string;
  active: boolean;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  children: React.ReactNode;
}) {
  return (
    <AppTooltip title={title}>
      <IconButton
        size="small"
        onClick={onClick}
        sx={{
          color: active ? 'primary.main' : 'text.secondary',
          bgcolor: active ? (theme) => `${theme.palette.primary.main}1f` : 'transparent',
        }}
      >
        {children}
      </IconButton>
    </AppTooltip>
  );
}

/**
 * Barre d'outils PER-397 : gras/italique/barré (bascule simple) + couleur/taille (menu de
 * choix, ré-appliquer la valeur déjà active désactive la marque). Les 5 marques sont
 * MUTUELLEMENT EXCLUSIVES par construction du schéma (`richTextEditorExtensions.ts`) — aucune
 * logique de « je désactive les autres avant » n'est nécessaire ici, ProseMirror s'en charge.
 */
function EditorToolbar({ editor }: { editor: import('@tiptap/core').Editor }) {
  const [colorAnchor, setColorAnchor] = useState<HTMLElement | null>(null);
  const [sizeAnchor, setSizeAnchor] = useState<HTMLElement | null>(null);
  const activeColor = RICH_COLOR_NAMES.find((n) => editor.isActive('richColor', { name: n }));
  const activeSize = RICH_SIZE_NAMES.find((n) => editor.isActive('richSize', { name: n }));

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25, mb: 0.5, flexWrap: 'wrap' }}>
      <ToolbarToggle title="Gras" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}>
        <FormatBoldIcon fontSize="small" />
      </ToolbarToggle>
      <ToolbarToggle title="Italique" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}>
        <FormatItalicIcon fontSize="small" />
      </ToolbarToggle>
      <ToolbarToggle title="Barré" active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()}>
        <StrikethroughSIcon fontSize="small" />
      </ToolbarToggle>
      <Divider orientation="vertical" flexItem sx={{ mx: 0.25, my: 0.5 }} />
      <ToolbarToggle title="Couleur" active={!!activeColor} onClick={(e) => setColorAnchor(e.currentTarget)}>
        <FormatColorTextIcon fontSize="small" sx={activeColor ? { color: richColorSx(activeColor) } : undefined} />
      </ToolbarToggle>
      <ToolbarToggle title="Taille" active={!!activeSize} onClick={(e) => setSizeAnchor(e.currentTarget)}>
        <FormatSizeIcon fontSize="small" />
      </ToolbarToggle>

      <Menu anchorEl={colorAnchor} open={!!colorAnchor} onClose={() => setColorAnchor(null)}>
        {RICH_COLOR_NAMES.map((name) => (
          <MenuItem
            key={name}
            selected={activeColor === name}
            onClick={() => {
              editor
                .chain()
                .focus()
                [activeColor === name ? 'unsetRichColor' : 'setRichColor'](name)
                .run();
              setColorAnchor(null);
            }}
          >
            <ListItemIcon>
              <CircleIcon fontSize="small" sx={{ color: richColorSx(name) }} />
            </ListItemIcon>
            <ListItemText>{COLOR_LABELS[name]}</ListItemText>
          </MenuItem>
        ))}
      </Menu>

      <Menu anchorEl={sizeAnchor} open={!!sizeAnchor} onClose={() => setSizeAnchor(null)}>
        {RICH_SIZE_NAMES.map((name) => (
          <MenuItem
            key={name}
            selected={activeSize === name}
            onClick={() => {
              editor
                .chain()
                .focus()
                [activeSize === name ? 'unsetRichSize' : 'setRichSize'](name)
                .run();
              setSizeAnchor(null);
            }}
          >
            <ListItemText sx={{ fontSize: name === 'petit' ? '0.85em' : '1.3em' }}>{SIZE_LABELS[name]}</ListItemText>
          </MenuItem>
        ))}
      </Menu>
    </Box>
  );
}

/**
 * Éditeur Tiptap MVP (PER-397) branché sur `CustomItem.description`. Contrôlé par `value`
 * SEULEMENT à l'initialisation (`content` de `useEditor` n'est jamais réinjecté après montage,
 * pattern standard des éditeurs riches — sinon chaque frappe replace le curseur en tête) :
 * les frappes suivantes remontent via `onChange`, jamais l'inverse. `immediatelyRender: false`
 * (recommandation Tiptap sous Next.js/SSR) → l'éditeur n'existe qu'après montage client, d'où
 * le repli affiché tant que `editor` est `null`.
 */
export function ItemDescriptionEditor({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (text: string) => void;
  placeholder?: string;
}) {
  const initialDoc = useMemo(() => descriptionToDoc(value), []); // eslint-disable-line react-hooks/exhaustive-deps
  const extensions = useMemo(
    () => [...RICH_TEXT_EDITOR_EXTENSIONS, Placeholder.configure({ placeholder: placeholder ?? '' })],
    [placeholder],
  );
  const editor = useEditor(
    {
      extensions,
      content: initialDoc,
      immediatelyRender: false,
      onUpdate: ({ editor }) => onChange(docToDescription(editor.getJSON())),
    },
    [extensions],
  );

  // Démontage propre : Tiptap recommande de détruire l'instance explicitement plutôt que de
  // compter sur le garbage collector (fuite de plugins ProseMirror sinon).
  useEffect(() => () => editor?.destroy(), [editor]);

  return (
    <Box
      sx={{
        border: 1,
        borderColor: 'divider',
        borderRadius: 1,
        p: 1,
        '&:focus-within': { borderColor: 'primary.main' },
      }}
    >
      {editor && <EditorToolbar editor={editor} />}
      <Box
        sx={{
          minHeight: 56,
          fontSize: '0.9375rem', // aligné sur MUI `body2`, taille de référence des 5 marques (`em`)
          '& .ProseMirror': { outline: 'none' },
          '& .ProseMirror p': { margin: 0 },
          '& .ProseMirror.ProseMirror-focused': { outline: 'none' },
          '& .ProseMirror p.is-empty::before': {
            content: 'attr(data-placeholder)',
            color: 'text.disabled',
            pointerEvents: 'none',
            float: 'left',
            height: 0,
          },
        }}
      >
        <EditorContent editor={editor} />
      </Box>
    </Box>
  );
}
