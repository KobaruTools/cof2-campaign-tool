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
import Button from '@mui/material/Button';
import FormatBoldIcon from '@mui/icons-material/FormatBold';
import FormatItalicIcon from '@mui/icons-material/FormatItalic';
import StrikethroughSIcon from '@mui/icons-material/StrikethroughS';
import FormatColorTextIcon from '@mui/icons-material/FormatColorText';
import FormatSizeIcon from '@mui/icons-material/FormatSize';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import FormatListNumberedIcon from '@mui/icons-material/FormatListNumbered';
import ChecklistIcon from '@mui/icons-material/Checklist';
import CircleIcon from '@mui/icons-material/Circle';
import CasinoOutlinedIcon from '@mui/icons-material/CasinoOutlined';
import FitnessCenterOutlinedIcon from '@mui/icons-material/FitnessCenterOutlined';
import ReportProblemOutlinedIcon from '@mui/icons-material/ReportProblemOutlined';
import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined';
import LinkOutlinedIcon from '@mui/icons-material/LinkOutlined';
import PetsOutlinedIcon from '@mui/icons-material/PetsOutlined';
import CircularProgress from '@mui/material/CircularProgress';
import { AppTooltip } from '@/components/AppTooltip';
import { DieIcon } from '@/components/DieIcon';
import { features } from '@/data';
import { ABILITY_IDS, STATUS_EFFECT_IDS, STATUS_EFFECTS, type AbilityId, type Die } from '@/data/schema';
import { ABILITY_NAMES } from '@/lib/ui/ability';
import { useContentVersion } from '@/lib/content/useContentVersion';
import { RICH_COLOR_NAMES, RICH_SIZE_NAMES, richColorSx, type RichColorName, type RichSizeName } from '@/lib/ui/featureRichText';
import { pageRefQualifierForBook } from '@/lib/ui/pageRefs';
import { useUnlockedBooks } from '@/lib/ui/useUnlockedBooks';
import { descriptionToDoc, docToDescription } from '@/lib/ui/richTextEditorSync';
import { useBestiaryStore } from '@/stores/bestiary';
import { AbilityCodeChip } from './FeatureRichText';
import { FeaturePathAutocomplete } from './FeaturePathAutocomplete';
import { RICH_TEXT_EDITOR_EXTENSIONS } from './richTextEditorExtensions';
import { CreatureCatalogAutocomplete } from '@/components/campaign/CreatureCatalogAutocomplete';

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

/**
 * Valeur sentinelle du sélecteur de dé pour le dé ÉVOLUTIF « d4° » (table p. 43) — même
 * convention que `EVOLVING_DIE_OPTION` d'`ItemDialog.tsx` (Fléau/Élément custom, potions) :
 * une entrée de TÊTE DE LISTE plutôt qu'une case séparée, le dé évolutif étant toujours basé
 * sur `d4`.
 */
const EVOLVING_DIE_OPTION = 'evolving';

/** Qualificatif de livre pour un renvoi de page (PER-398) — mot-clé (`pageRefQualifierForBook`) + libellé. */
type PageRefBookOption = { value: string; label: string };
/** Toujours proposé, quel que soit le compte : `(p. N)` sans qualificatif = livre de base. */
const PAGE_REF_BASE_BOOK: PageRefBookOption = { value: '', label: 'Livre de base' };

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
  const [dieFace, setDieFace] = useState<Die | typeof EVOLVING_DIE_OPTION>('d6');
  const [abilityAnchor, setAbilityAnchor] = useState<HTMLElement | null>(null);
  const [abilityCode, setAbilityCode] = useState<AbilityId>(ABILITY_IDS[0]);
  const [abilityMod, setAbilityMod] = useState('');
  const [statusAnchor, setStatusAnchor] = useState<HTMLElement | null>(null);
  const [pageAnchor, setPageAnchor] = useState<HTMLElement | null>(null);
  const [pageNum, setPageNum] = useState('');
  const [pageBook, setPageBook] = useState('');
  const [capabilityAnchor, setCapabilityAnchor] = useState<HTMLElement | null>(null);
  const [creatureAnchor, setCreatureAnchor] = useState<HTMLElement | null>(null);
  const activeColor = RICH_COLOR_NAMES.find((n) => editor.isActive('richColor', { name: n }));
  const activeSize = RICH_SIZE_NAMES.find((n) => editor.isActive('richSize', { name: n }));

  // Abonnement à la version de contenu (PER-321) : `features` reflète le contenu payant déjà
  // fusionné (jamais celui non débloqué, cf. `isCapabilityAccessible`) — le picker n'a donc jamais
  // besoin de filtrer lui-même, mais doit se re-rendre si une fusion a lieu pendant l'édition.
  useContentVersion();
  const capabilityOptions = features.map((f) => f.id);
  const creatureList = useBestiaryStore((s) => s.list);
  const loadCreatureList = useBestiaryStore((s) => s.loadList);

  // Livres payants DÉBLOQUÉS par le compte courant (`useUnlockedBooks`, même source que le
  // bouton d'en-tête) : le livre de base est toujours proposé, mais « Compagnon »/« Bestiaire »
  // ne le sont QUE pour un compte qui les a débloqués — pas de teaser d'un livre non possédé
  // (même invariant que la gating de contenu payant, PER-321/396).
  const unlockedBooks = useUnlockedBooks();
  const pageRefBooks: PageRefBookOption[] = useMemo(
    () => [
      PAGE_REF_BASE_BOOK,
      ...unlockedBooks
        .map((b) => {
          const qualifier = pageRefQualifierForBook(b.id);
          return qualifier ? { value: qualifier, label: b.name } : null;
        })
        .filter((o): o is PageRefBookOption => o !== null),
    ],
    [unlockedBooks],
  );

  const insertToken = (raw: string) => editor.chain().focus().insertMechToken(raw).run();

  const insertDie = () => {
    const evolving = dieFace === EVOLVING_DIE_OPTION;
    const face: Die = evolving ? 'd4' : dieFace;
    const countPart = dieCount > 1 ? String(dieCount) : '';
    insertToken(`{${countPart}${face}${evolving ? '°' : ''}}`);
    setDieAnchor(null);
    setDieCount(1);
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

  // Picker de capacité (PER-399) : `[&feature-id]` (sans libellé — la puce affiche le nom
  // canonique de la capacité, décliné le cas échéant, cf. `CapabilityChip`).
  const insertCapability = (featureId: string | null) => {
    if (featureId) insertToken(`[&${featureId}]`);
    setCapabilityAnchor(null);
  };

  // Picker de créature (PER-399) : `[[creature:slug|libellé]]` — le libellé est TOUJOURS le nom
  // canonique de la créature choisie (la grammaire l'exige, `creatureLinks.ts`) ; `creatureList`
  // est déjà filtrée par la RLS (PER-396) donc jamais de nom d'une créature verrouillée à divulguer.
  const insertCreature = (slug: string | null) => {
    const name = slug ? creatureList?.find((c) => c.id === slug)?.name : undefined;
    if (slug && name) insertToken(`[[creature:${slug}|${name}]]`);
    setCreatureAnchor(null);
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
      <ToolbarToggle
        title="Liste à puces"
        active={editor.isActive('bulletList')}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <FormatListBulletedIcon fontSize="small" />
      </ToolbarToggle>
      <ToolbarToggle
        title="Liste numérotée"
        active={editor.isActive('orderedList')}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <FormatListNumberedIcon fontSize="small" />
      </ToolbarToggle>
      <ToolbarToggle
        title="Liste à cases à cocher"
        active={editor.isActive('taskList')}
        onClick={() => editor.chain().focus().toggleTaskList().run()}
      >
        <ChecklistIcon fontSize="small" />
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
      <Divider orientation="vertical" flexItem sx={{ mx: 0.25, my: 0.5 }} />
      <ToolbarToggle title="Insérer une référence de capacité" active={false} onClick={(e) => setCapabilityAnchor(e.currentTarget)}>
        <LinkOutlinedIcon fontSize="small" />
      </ToolbarToggle>
      <ToolbarToggle
        title="Insérer une référence de créature"
        active={false}
        onClick={(e) => {
          setCreatureAnchor(e.currentTarget);
          void loadCreatureList();
        }}
      >
        <PetsOutlinedIcon fontSize="small" />
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
          <TextField
            select
            label="Dé"
            size="small"
            value={dieFace}
            onChange={(e) => setDieFace(e.target.value as Die | typeof EVOLVING_DIE_OPTION)}
          >
            <MenuItem value={EVOLVING_DIE_OPTION}>
              <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                <DieIcon die="d4" evolving size={18} noTooltip />
                d4°
              </Box>
            </MenuItem>
            {DIE_FACES.map((f) => (
              <MenuItem key={f} value={f}>
                <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                  <DieIcon die={f} size={18} noTooltip />
                  {f}
                </Box>
              </MenuItem>
            ))}
          </TextField>
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
            {pageRefBooks.map((b) => (
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

      <Popover anchorEl={capabilityAnchor} open={!!capabilityAnchor} onClose={() => setCapabilityAnchor(null)}>
        <Box sx={{ p: 1.5, width: 340 }}>
          <FeaturePathAutocomplete
            label="Capacité"
            options={capabilityOptions}
            value={null}
            onChange={insertCapability}
            groupMode="profile"
            clearOnSelect
          />
        </Box>
      </Popover>

      <Popover anchorEl={creatureAnchor} open={!!creatureAnchor} onClose={() => setCreatureAnchor(null)}>
        <Box sx={{ p: 1.5, width: 340 }}>
          {creatureList ? (
            <CreatureCatalogAutocomplete options={creatureList} value={null} onSelect={insertCreature} label="Créature" />
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary', py: 1 }}>
              <CircularProgress size={16} />
              Chargement du bestiaire…
            </Box>
          )}
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
          maxHeight: '70vh',
          overflow: 'auto',
          resize: 'vertical',
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
          // Listes à puce/numérotées : marge/retrait minimal, cohérent avec `p { margin: 0 }`.
          '& .ProseMirror ul:not([data-type="taskList"]), & .ProseMirror ol': {
            margin: 0,
            paddingLeft: '1.4em',
          },
          // Case à cocher (`TaskList`/`TaskItem`) : pas de puce, case + texte alignés en ligne
          // (feuille de style recommandée par Tiptap, adaptée à `sx`).
          '& .ProseMirror ul[data-type="taskList"]': { listStyle: 'none', margin: 0, padding: 0 },
          '& .ProseMirror ul[data-type="taskList"] li': { display: 'flex', alignItems: 'flex-start' },
          '& .ProseMirror ul[data-type="taskList"] li > label': {
            flex: '0 0 auto',
            mr: 0.75,
            mt: '0.2em',
            userSelect: 'none',
          },
          '& .ProseMirror ul[data-type="taskList"] li > div': { flex: '1 1 auto' },
          '& .ProseMirror ul[data-type="taskList"] li[data-checked="true"] > div': {
            color: 'text.disabled',
            textDecoration: 'line-through',
          },
          // Tirette de redimensionnement (Chrome/Edge only, `::-moz-resizer` n'existe pas côté
          // Firefox — le redimensionnement y reste fonctionnel, juste avec la poignée native) :
          // remplace le triangle gris par défaut par 3 traits diagonaux discrets, sur fond
          // transparent plutôt que le carré gris du natif.
          '&::-webkit-resizer': {
            backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(
              '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 12 12">'
                + '<g stroke="#9e9e9e" stroke-width="1.4" stroke-linecap="round">'
                + '<line x1="10" y1="2" x2="2" y2="10"/>'
                + '<line x1="10" y1="6" x2="6" y2="10"/>'
                + '<line x1="10" y1="10" x2="9.3" y2="10.3"/>'
                + '</g></svg>',
            )}")`,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center',
            backgroundColor: 'transparent',
          },
        }}
      >
        <EditorContent editor={editor} />
      </Box>
    </Box>
  );
}
