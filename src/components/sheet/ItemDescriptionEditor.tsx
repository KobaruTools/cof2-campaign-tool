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
import Popover from '@mui/material/Popover';
import TextField from '@mui/material/TextField';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import Button from '@mui/material/Button';
import FormatBoldIcon from '@mui/icons-material/FormatBold';
import FormatItalicIcon from '@mui/icons-material/FormatItalic';
import StrikethroughSIcon from '@mui/icons-material/StrikethroughS';
import FormatColorTextIcon from '@mui/icons-material/FormatColorText';
import FormatSizeIcon from '@mui/icons-material/FormatSize';
import CircleIcon from '@mui/icons-material/Circle';
import CasinoOutlinedIcon from '@mui/icons-material/CasinoOutlined';
import FitnessCenterOutlinedIcon from '@mui/icons-material/FitnessCenterOutlined';
import ReportProblemOutlinedIcon from '@mui/icons-material/ReportProblemOutlined';
import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined';
import { AppTooltip } from '@/components/AppTooltip';
import { ABILITY_IDS, STATUS_EFFECT_IDS, STATUS_EFFECTS, type AbilityId, type Die } from '@/data/schema';
import { ABILITY_NAMES } from '@/lib/ui/ability';
import { RICH_COLOR_NAMES, RICH_SIZE_NAMES, richColorSx, type RichColorName, type RichSizeName } from '@/lib/ui/featureRichText';
import { descriptionToDoc, docToDescription } from '@/lib/ui/richTextEditorSync';
import { AbilityCodeChip } from './FeatureRichText';
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

const DIE_FACES: Die[] = ['d4', 'd6', 'd8', 'd10', 'd12', 'd20'];

/** Qualificatif de livre pour un renvoi de page (PER-398) — clés de `PAGE_REF_BOOK_QUALIFIERS`, `src/lib/ui/pageRefs.ts`. */
const PAGE_REF_BOOKS: { value: string; label: string }[] = [
  { value: '', label: 'Livre de base' },
  { value: 'compagnon', label: 'Compagnon' },
  { value: 'bestiaire', label: 'Bestiaire' },
];

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
 *
 * PER-398 — 4 boutons d'INSERTION assistée (pas de bascule ni d'état actif, contrairement aux
 * marques : un token mécanique est un nœud atomique posé au point d'insertion, jamais appliqué à
 * une sélection). Chacun pose un `mechToken` via la commande `insertMechToken` du node
 * (`richTextEditorExtensions.tsx`), qui se rend ensuite avec la même puce qu'en lecture.
 */
function EditorToolbar({ editor }: { editor: import('@tiptap/core').Editor }) {
  const [colorAnchor, setColorAnchor] = useState<HTMLElement | null>(null);
  const [sizeAnchor, setSizeAnchor] = useState<HTMLElement | null>(null);
  const [dieAnchor, setDieAnchor] = useState<HTMLElement | null>(null);
  const [dieCount, setDieCount] = useState(1);
  const [dieFaces, setDieFaces] = useState<Die>('d6');
  const [dieEvolving, setDieEvolving] = useState(false);
  const [abilityAnchor, setAbilityAnchor] = useState<HTMLElement | null>(null);
  const [abilityCode, setAbilityCode] = useState<AbilityId>(ABILITY_IDS[0]);
  const [abilityMod, setAbilityMod] = useState('');
  const [statusAnchor, setStatusAnchor] = useState<HTMLElement | null>(null);
  const [pageAnchor, setPageAnchor] = useState<HTMLElement | null>(null);
  const [pageNum, setPageNum] = useState('');
  const [pageBook, setPageBook] = useState('');
  const activeColor = RICH_COLOR_NAMES.find((n) => editor.isActive('richColor', { name: n }));
  const activeSize = RICH_SIZE_NAMES.find((n) => editor.isActive('richSize', { name: n }));

  const insertToken = (raw: string) => editor.chain().focus().insertMechToken(raw).run();

  const insertDie = () => {
    const countPart = dieCount > 1 ? String(dieCount) : '';
    insertToken(`{${countPart}${dieFaces}${dieEvolving ? '°' : ''}}`);
    setDieAnchor(null);
    setDieCount(1);
    setDieEvolving(false);
  };

  const insertAbility = () => {
    const mod = Number(abilityMod);
    if (!abilityMod.trim() || Number.isNaN(mod) || mod === 0) insertToken(`@${abilityCode}`);
    else insertToken(`[${abilityCode} ${mod >= 0 ? '+' : '-'} ${Math.abs(mod)}]`);
    setAbilityAnchor(null);
    setAbilityMod('');
  };

  const insertPage = () => {
    const n = Math.trunc(Number(pageNum));
    if (!pageNum.trim() || Number.isNaN(n) || n <= 0) return;
    insertToken(`(p. ${n}${pageBook ? `, ${pageBook}` : ''})`);
    setPageAnchor(null);
    setPageNum('');
    setPageBook('');
  };

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
      <Divider orientation="vertical" flexItem sx={{ mx: 0.25, my: 0.5 }} />
      <ToolbarToggle title="Insérer un dé" active={false} onClick={(e) => setDieAnchor(e.currentTarget)}>
        <CasinoOutlinedIcon fontSize="small" />
      </ToolbarToggle>
      <ToolbarToggle title="Insérer une caractéristique" active={false} onClick={(e) => setAbilityAnchor(e.currentTarget)}>
        <FitnessCenterOutlinedIcon fontSize="small" />
      </ToolbarToggle>
      <ToolbarToggle title="Insérer un statut préjudiciable" active={false} onClick={(e) => setStatusAnchor(e.currentTarget)}>
        <ReportProblemOutlinedIcon fontSize="small" />
      </ToolbarToggle>
      <ToolbarToggle title="Insérer un renvoi de page" active={false} onClick={(e) => setPageAnchor(e.currentTarget)}>
        <MenuBookOutlinedIcon fontSize="small" />
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

      <Popover anchorEl={dieAnchor} open={!!dieAnchor} onClose={() => setDieAnchor(null)}>
        <Box sx={{ p: 1.5, display: 'flex', flexDirection: 'column', gap: 1.25, width: 220 }}>
          <TextField
            label="Nombre de dés"
            type="number"
            size="small"
            value={dieCount}
            onChange={(e) => setDieCount(Math.max(1, Math.min(20, Math.trunc(Number(e.target.value)) || 1)))}
            slotProps={{ htmlInput: { min: 1, max: 20 } }}
          />
          <TextField select label="Faces" size="small" value={dieFaces} onChange={(e) => setDieFaces(e.target.value as Die)}>
            {DIE_FACES.map((f) => (
              <MenuItem key={f} value={f}>
                {f}
              </MenuItem>
            ))}
          </TextField>
          <FormControlLabel
            control={<Checkbox size="small" checked={dieEvolving} onChange={(e) => setDieEvolving(e.target.checked)} />}
            label="Dé évolutif (°)"
          />
          <Button variant="contained" size="small" onClick={insertDie}>
            Insérer
          </Button>
        </Box>
      </Popover>

      <Popover anchorEl={abilityAnchor} open={!!abilityAnchor} onClose={() => setAbilityAnchor(null)}>
        <Box sx={{ p: 1.5, display: 'flex', flexDirection: 'column', gap: 1.25, width: 240 }}>
          <TextField
            select
            label="Caractéristique"
            size="small"
            value={abilityCode}
            onChange={(e) => setAbilityCode(e.target.value as AbilityId)}
          >
            {ABILITY_IDS.map((id) => (
              <MenuItem key={id} value={id}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  <AbilityCodeChip ability={id} noTooltip />
                  {ABILITY_NAMES[id]}
                </Box>
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="Modificateur (optionnel)"
            type="number"
            size="small"
            value={abilityMod}
            onChange={(e) => setAbilityMod(e.target.value)}
            placeholder="ex. 1 ou -2"
          />
          <Button variant="contained" size="small" onClick={insertAbility}>
            Insérer
          </Button>
        </Box>
      </Popover>

      <Menu anchorEl={statusAnchor} open={!!statusAnchor} onClose={() => setStatusAnchor(null)}>
        {STATUS_EFFECT_IDS.map((id) => (
          <MenuItem
            key={id}
            onClick={() => {
              insertToken(`[!${id}]`);
              setStatusAnchor(null);
            }}
          >
            <ListItemText>{STATUS_EFFECTS[id].label}</ListItemText>
          </MenuItem>
        ))}
      </Menu>

      <Popover anchorEl={pageAnchor} open={!!pageAnchor} onClose={() => setPageAnchor(null)}>
        <Box sx={{ p: 1.5, display: 'flex', flexDirection: 'column', gap: 1.25, width: 220 }}>
          <TextField
            label="Page"
            type="number"
            size="small"
            value={pageNum}
            onChange={(e) => setPageNum(e.target.value)}
            slotProps={{ htmlInput: { min: 1 } }}
            autoFocus
          />
          <TextField select label="Livre" size="small" value={pageBook} onChange={(e) => setPageBook(e.target.value)}>
            {PAGE_REF_BOOKS.map((b) => (
              <MenuItem key={b.value} value={b.value}>
                {b.label}
              </MenuItem>
            ))}
          </TextField>
          <Button variant="contained" size="small" onClick={insertPage} disabled={!pageNum.trim()}>
            Insérer
          </Button>
        </Box>
      </Popover>
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
