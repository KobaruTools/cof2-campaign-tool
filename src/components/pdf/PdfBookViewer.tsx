'use client';

/**
 * Visualiseur PDF intégré (milestone « Visualiseur PDF »). Rend un livre de règles à une page
 * donnée, avec recherche plein-texte (PER-58) et surlignage/centrage d'un passage ciblé (PER-59/61).
 *
 * **Piloté par PROPS** (PER-60), plus par un store : `bookId`/`initialPage`/`term` viennent
 * désormais de l'URL `/rules/{book}/{page}?q={term}`. Deux habillages via `chrome` :
 *  - `'dialog'` : modale MUI superposée (route INTERCEPTÉE `@viewer/(.)rules/...`) — l'ouverture
 *    depuis un renvoi in-app est une navigation douce qui préserve la page en dessous ;
 *  - `'page'` : plein écran (route réelle `/rules/...`), servie au rechargement / lien partagé.
 *
 * Rendu via **pdf.js** (`react-pdf`) et non la visionneuse native : socle qu'exigent la recherche
 * (couche texte), le surlignage et le ciblage de paragraphe. Ce module touche à `window`/`DOMMatrix`
 * et au worker pdf.js : il DOIT être chargé sans SSR (via un wrapper `dynamic(..., { ssr: false })`,
 * cf. [[RulesViewerModal]] / [[RulesViewerPage]]). Le `workerSrc` est défini dans ce module même
 * (contrainte react-pdf : sinon l'ordre d'exécution des modules réécrit la valeur par défaut).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import CloseIcon from '@mui/icons-material/Close';
import FitScreenIcon from '@mui/icons-material/FitScreen';
import HighlightIcon from '@mui/icons-material/Highlight';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import SearchIcon from '@mui/icons-material/Search';
import WidthFullIcon from '@mui/icons-material/WidthFull';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Collapse from '@mui/material/Collapse';
import Dialog from '@mui/material/Dialog';
import GlobalStyles from '@mui/material/GlobalStyles';
import { alpha } from '@mui/material/styles';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { BOOKS, type BookId } from '@/lib/ui/books';
import {
  MIN_QUERY_LENGTH,
  renderTextItemWithHighlight,
  searchIndexedPages,
  type IndexedPage,
  type PdfSearchMatch,
} from '@/lib/pdf/pdfSearch';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

const ZOOM_MIN = 0.5;
const ZOOM_MAX = 3;
const ZOOM_STEP = 0.25;

/** Classe CSS des `<mark>` du terme CIBLÉ par un renvoi (couleur distincte de la recherche). */
const TARGET_MARK_CLASS = 'pdf-target';

/** Délai (ms) avant de lancer une recherche après la dernière frappe. */
const SEARCH_DEBOUNCE_MS = 300;

export interface PdfBookViewerProps {
  /** Livre à afficher (validé en amont par la route). */
  bookId: BookId;
  /** Page d'ENTRÉE demandée par l'URL (numéro imprimé = numéro de page du PDF). */
  initialPage: number;
  /**
   * Terme à CIBLER sur la page d'entrée (PER-59/61) : nom de l'entité (capacité/créature/état)
   * dont le renvoi cite la page. Surligné (couleur distincte) et centré à l'ouverture. Vide/absent
   * = simple saut de page.
   */
  term?: string;
  /**
   * Habillage : `'dialog'` = modale superposée (route interceptée) ; `'page'` = plein écran
   * (route réelle, rechargement / lien partagé).
   */
  chrome: 'dialog' | 'page';
  /** Ferme le visualiseur (modale : `router.back()` ; page : retour historique ou accueil). */
  onClose: () => void;
}

/**
 * Lit la couche texte de TOUTES les pages du PDF pour en constituer un index de recherche
 * (PER-58). Séquentiel : pdf.js déroule un seul worker, et le résultat est mis en cache par livre
 * côté appelant — on ne paie l'indexation qu'une fois. `onProgress` alimente la barre d'attente ;
 * `shouldCancel` permet d'abandonner si le livre change ou la modale se ferme en cours de route.
 */
async function buildTextIndex(
  pdf: PDFDocumentProxy,
  onProgress: (done: number, total: number) => void,
  shouldCancel: () => boolean,
): Promise<IndexedPage[] | null> {
  const total = pdf.numPages;
  const pages: IndexedPage[] = [];
  for (let n = 1; n <= total; n++) {
    if (shouldCancel()) return null;
    const page = await pdf.getPage(n);
    const content = await page.getTextContent();
    const text = content.items.map((it) => ('str' in it ? it.str : '')).join(' ');
    pages.push({ page: n, text });
    page.cleanup();
    onProgress(n, total);
  }
  return pages;
}

export default function PdfBookViewer({
  bookId,
  initialPage,
  term = '',
  chrome,
  onClose,
}: PdfBookViewerProps) {
  const book = BOOKS[bookId];

  const [numPages, setNumPages] = useState<number | null>(null);
  const [current, setCurrent] = useState(initialPage);
  const [pageInput, setPageInput] = useState(String(initialPage));
  const [zoom, setZoom] = useState(1);
  // Ajustement de la page : « page entière » (contain, défaut) ou « pleine largeur » (remplit la
  // largeur, on défile verticalement). Éphémère (comme le zoom) ; le zoom se multiplie par-dessus.
  const [fitMode, setFitMode] = useState<'page' | 'width'>('page');
  // Surlignage du passage ciblé par un renvoi (PER-59/61) : affiché par défaut à l'ouverture (et
  // recentré), masquable à la demande pour la lisibilité une fois le passage repéré. Remis à ON à
  // chaque nouveau renvoi (cf. resync sur la clé page/terme).
  const [showTarget, setShowTarget] = useState(true);
  const [loadError, setLoadError] = useState(false);

  // Dimensions du conteneur (largeur ET hauteur) + ratio hauteur/largeur de la page courante :
  // de quoi ajuster la page en mode « page entière » (contain) — le plus grand rendu qui tient
  // à la fois en largeur et en hauteur, multiplié ensuite par le zoom.
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [container, setContainer] = useState({ w: 0, h: 0 });
  const [pageRatio, setPageRatio] = useState<number | null>(null);

  // --- Recherche plein-texte (PER-58) ---------------------------------------------------------
  // Le document pdf.js chargé, capté à `onLoadSuccess` : c'est la source des couches texte à
  // indexer. L'index (texte de chaque page) est mis en cache PAR LIVRE dans une ref, pour ne le
  // reconstruire ni à la réouverture ni au changement de requête.
  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);
  const indexCacheRef = useRef<Map<BookId, IndexedPage[]>>(new Map());
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [matches, setMatches] = useState<PdfSearchMatch[] | null>(null);
  const [activeMatch, setActiveMatch] = useState(0);
  // Progression de l'indexation (0–100), `null` hors indexation.
  const [indexProgress, setIndexProgress] = useState<number | null>(null);
  // Bump quand un index vient d'être mis en cache : réveille l'effet de recherche qui attendait.
  const [indexVersion, setIndexVersion] = useState(0);

  // Mesure du conteneur via REF CALLBACK (exécuté au commit, `clientWidth/Height` force un
  // reflow synchrone → taille déjà mise en page, fiable dès le montage), là où `ResizeObserver`
  // seul laissait le conteneur à 0 au premier rendu (timing portail/transition MUI).
  const setScrollEl = useCallback((el: HTMLDivElement | null) => {
    scrollRef.current = el;
    if (el) setContainer({ w: el.clientWidth, h: el.clientHeight });
  }, []);

  // Resynchronisation en PHASE DE RENDU (pattern React « adjust state while rendering ») : quand
  // l'URL désigne une nouvelle page/terme d'entrée (navigation vers un autre renvoi), on recale la
  // page affichée. La clé combine page + terme, ce qui rejoue aussi le ciblage quand deux renvois
  // visent la même page avec des termes différents.
  const targetKey = `${initialPage}::${term}`;
  const [lastKey, setLastKey] = useState(targetKey);
  if (targetKey !== lastKey) {
    setLastKey(targetKey);
    setCurrent(initialPage);
    setPageInput(String(initialPage));
    // Nouveau renvoi → on ré-affiche le surlignage du passage ciblé (l'utilisateur a pu le masquer).
    setShowTarget(true);
  }
  // Changement de livre → nouveau document pdf.js, chargement/zoom réinitialisés, recherche remise
  // à zéro (l'index resté en cache par livre sera réutilisé si l'on revient sur ce livre).
  const [lastBookId, setLastBookId] = useState(bookId);
  if (bookId !== lastBookId) {
    setLastBookId(bookId);
    setNumPages(null);
    setLoadError(false);
    setZoom(1);
    setFitMode('page');
    setPdfDoc(null);
    setQuery('');
    setMatches(null);
    setActiveMatch(0);
    setIndexProgress(null);
  }

  // Suivi des redimensionnements (fenêtre, rotation…) une fois monté. La mesure INITIALE est
  // faite par le ref callback ci-dessus ; ici on ne fait que réagir aux changements de taille.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setContainer({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    return () => ro.disconnect();
  }, [bookId]);

  // Amène la page courante en haut du conteneur à chaque changement de page.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [current]);

  // Focus le champ dès l'ouverture de la barre de recherche.
  useEffect(() => {
    if (searchOpen) searchInputRef.current?.focus();
  }, [searchOpen]);

  // Raccourcis clavier :
  //  • Ctrl/Cmd+F ouvre la recherche (et re-sélectionne si déjà ouverte), au lieu de la recherche
  //    du navigateur qui ne verrait que la page rendue ;
  //  • Échap ferme le visualiseur — SAUF si la recherche est ouverte, auquel cas la barre de
  //    recherche gère son propre Échap (elle se ferme d'abord, cf. son `onKeyDown`).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setSearchOpen(true);
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      } else if (e.key === 'Escape' && !searchOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [searchOpen, onClose]);

  // Indexation paresseuse : dès l'ouverture de la recherche sur un livre, on lit la couche texte
  // de toutes ses pages (une seule fois, mise en cache par livre) → la 1re requête est instantanée.
  // Le bump d'`indexVersion` réveille l'effet de recherche resté en attente de l'index.
  useEffect(() => {
    if (!searchOpen || !pdfDoc) return;
    if (indexCacheRef.current.has(bookId)) return;
    let cancelled = false;
    setIndexProgress(0);
    void buildTextIndex(
      pdfDoc,
      (done, total) => {
        if (!cancelled) setIndexProgress(Math.round((done / total) * 100));
      },
      () => cancelled,
    ).then((built) => {
      if (cancelled || !built) return;
      indexCacheRef.current.set(bookId, built);
      setIndexProgress(null);
      setIndexVersion((v) => v + 1);
    });
    return () => {
      // Annule une indexation en cours (fermeture / changement de livre) et efface sa progression.
      cancelled = true;
      setIndexProgress(null);
    };
  }, [searchOpen, pdfDoc, bookId]);

  // Recherche débattue : recalcule les occurrences quand la requête change (ou dès que l'index
  // devient disponible), positionne sur la 1re occurrence.
  useEffect(() => {
    if (!searchOpen) return;
    const raw = query.trim();
    // Tout est fait dans le callback débattu (jamais de setState synchrone dans le corps d'effet).
    const timer = setTimeout(() => {
      if (raw.length < MIN_QUERY_LENGTH) {
        setMatches(null);
        setActiveMatch(0);
        return;
      }
      const index = indexCacheRef.current.get(bookId);
      if (!index) return; // pas encore indexé — l'effet d'indexation relancera via `indexVersion`
      const found = searchIndexedPages(index, raw);
      setMatches(found);
      setActiveMatch(0);
      if (found.length > 0) {
        setCurrent(found[0].page);
        setPageInput(String(found[0].page));
      }
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchOpen, query, bookId, indexVersion]);

  // Surlignage de la couche texte. Deux sources, JAMAIS enchevêtrées : la RECHERCHE tapée (ambre,
  // toutes pages, PER-58) a la PRIORITÉ ; à défaut, le terme CIBLÉ par le renvoi (couleur distincte,
  // PER-59/61) est surligné sur sa SEULE page. Une même fonction rend les deux (classe différente).
  const highlightQuery = searchOpen && query.trim().length >= MIN_QUERY_LENGTH ? query.trim() : '';
  // Terme ciblé actif : bascule ON, hors recherche, terme non vide, et on est bien sur la page citée.
  const targetActive =
    showTarget && !highlightQuery && term.length >= MIN_QUERY_LENGTH && current === initialPage;
  const textRenderer = useMemo(
    () =>
      highlightQuery
        ? (item: { str: string }) => renderTextItemWithHighlight(item.str, highlightQuery)
        : targetActive
          ? (item: { str: string }) => renderTextItemWithHighlight(item.str, term, TARGET_MARK_CLASS)
          : undefined,
    [highlightQuery, targetActive, term],
  );

  const clampPage = (p: number) => Math.min(Math.max(1, p), numPages ?? p);
  const goTo = (p: number) => {
    const next = clampPage(p);
    setCurrent(next);
    setPageInput(String(next));
  };
  const commitPageInput = () => {
    const parsed = Number.parseInt(pageInput, 10);
    if (Number.isFinite(parsed)) goTo(parsed);
    else setPageInput(String(current));
  };

  // Occurrence précédente/suivante (cyclique) : déplace le curseur et saute à sa page.
  const goToMatch = (delta: number) => {
    if (!matches || matches.length === 0) return;
    const next = (activeMatch + delta + matches.length) % matches.length;
    setActiveMatch(next);
    goTo(matches[next].page);
  };

  // Ferme la barre de recherche et purge son état (l'index reste en cache pour plus tard).
  const closeSearch = () => {
    setSearchOpen(false);
    setQuery('');
    setMatches(null);
    setActiveMatch(0);
  };

  const hasQuery = query.trim().length >= MIN_QUERY_LENGTH;
  const indexing = indexProgress !== null;

  // Largeur de base de la page selon l'ajustement choisi, puis × zoom. `PAGE_MARGIN` = padding du
  // conteneur (`p: 2` = 16 px de chaque côté).
  const PAGE_MARGIN = 16;
  const availW = container.w - PAGE_MARGIN * 2;
  const availH = container.h - PAGE_MARGIN * 2;
  const fitWidth =
    availW > 0 && availH > 0
      ? fitMode === 'width'
        ? availW
        : pageRatio
          ? Math.min(availW, availH / pageRatio)
          : availW
      : undefined;
  const pageWidth = fitWidth != null ? fitWidth * zoom : undefined;

  const content = (
    <>
      {/* Surlignage dans la couche texte pdf.js : les spans ont `color: transparent` (texte de
          sélection posé sur le canvas), donc le <mark> doit garder ce texte transparent et
          n'apporter qu'un fond translucide (le canvas reste lisible). Ambre = recherche (PER-58) ;
          teinte primaire + halo = terme ciblé par un renvoi (PER-59/61), pour les distinguer. */}
      <GlobalStyles
        styles={(theme) => ({
          '.textLayer mark': {
            color: 'transparent',
            backgroundColor: 'rgba(255, 196, 0, 0.45)',
            borderRadius: '2px',
            padding: 0,
          },
          [`.textLayer mark.${TARGET_MARK_CLASS}`]: {
            backgroundColor: alpha(theme.palette.primary.main, 0.4),
            boxShadow: `0 0 0 2px ${alpha(theme.palette.primary.main, 0.55)}`,
          },
        })}
      />
      <Stack
        direction="row"
        spacing={1}
        sx={{
          // Pleine largeur du conteneur : sans ça la barre épouse son contenu et le `flexGrow` de
          // l'espaceur (ci-dessous) n'aurait aucun espace libre à absorber pour pousser la croix à droite.
          width: '100%',
          alignItems: 'center',
          px: 2,
          py: 1,
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <book.Icon sx={{ fontSize: 20, color: 'text.secondary' }} />
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }} noWrap>
          {book.name}
        </Typography>

        <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
          <Tooltip title="Page précédente">
            <span>
              <IconButton size="small" onClick={() => goTo(current - 1)} disabled={current <= 1}>
                <ChevronLeftIcon />
              </IconButton>
            </span>
          </Tooltip>
          <TextField
            size="small"
            value={pageInput}
            onChange={(e) => setPageInput(e.target.value)}
            onBlur={commitPageInput}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitPageInput();
            }}
            slotProps={{ htmlInput: { inputMode: 'numeric', style: { textAlign: 'center', width: 44 } } }}
          />
          <Typography variant="body2" color="text.secondary" sx={{ minWidth: 36 }}>
            / {numPages ?? '…'}
          </Typography>
          <Tooltip title="Page suivante">
            <span>
              <IconButton
                size="small"
                onClick={() => goTo(current + 1)}
                disabled={numPages != null && current >= numPages}
              >
                <ChevronRightIcon />
              </IconButton>
            </span>
          </Tooltip>
        </Stack>

        <Tooltip title={fitMode === 'page' ? 'Pleine largeur' : 'Page entière'}>
          <IconButton
            size="small"
            onClick={() => setFitMode((m) => (m === 'page' ? 'width' : 'page'))}
            color={fitMode === 'width' ? 'primary' : 'default'}
            sx={{ ml: 1 }}
          >
            {fitMode === 'page' ? <WidthFullIcon /> : <FitScreenIcon />}
          </IconButton>
        </Tooltip>

        <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', ml: 1 }}>
          <Tooltip title="Dézoomer">
            <span>
              <IconButton
                size="small"
                onClick={() => setZoom((z) => Math.max(ZOOM_MIN, z - ZOOM_STEP))}
                disabled={zoom <= ZOOM_MIN}
              >
                <ZoomOutIcon />
              </IconButton>
            </span>
          </Tooltip>
          <Typography variant="body2" color="text.secondary" sx={{ minWidth: 40, textAlign: 'center' }}>
            {Math.round(zoom * 100)} %
          </Typography>
          <Tooltip title="Zoomer">
            <span>
              <IconButton
                size="small"
                onClick={() => setZoom((z) => Math.min(ZOOM_MAX, z + ZOOM_STEP))}
                disabled={zoom >= ZOOM_MAX}
              >
                <ZoomInIcon />
              </IconButton>
            </span>
          </Tooltip>
        </Stack>

        {/* Bascule du surlignage du passage ciblé par le renvoi (PER-59/61) : proposée seulement
            quand un terme a été fourni. Permet de masquer le repère pour la lisibilité. */}
        {term.length >= MIN_QUERY_LENGTH && (
          <Tooltip title={showTarget ? 'Masquer le surlignage du passage' : 'Afficher le surlignage du passage'}>
            <IconButton
              size="small"
              onClick={() => setShowTarget((v) => !v)}
              color={showTarget ? 'primary' : 'default'}
              sx={{ ml: 1 }}
            >
              <HighlightIcon />
            </IconButton>
          </Tooltip>
        )}

        <Tooltip title="Rechercher dans le livre (Ctrl+F)">
          <IconButton
            size="small"
            onClick={() => (searchOpen ? closeSearch() : setSearchOpen(true))}
            color={searchOpen ? 'primary' : 'default'}
            sx={{ ml: 1 }}
          >
            <SearchIcon />
          </IconButton>
        </Tooltip>

        {/* Espaceur flexible : pousse la croix TOUT À DROITE de la barre, isolée du groupe d'outils
            (croix « en haut à droite d'un bloc »). `flexGrow` plutôt qu'une marge auto, qui serait
            écrasée par l'espacement (`spacing`) du Stack. */}
        <Box sx={{ flexGrow: 1 }} />
        <Tooltip title="Fermer">
          <IconButton size="small" onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Tooltip>
      </Stack>

      <Collapse in={searchOpen} unmountOnExit>
        <Stack
          direction="row"
          spacing={1}
          sx={{ alignItems: 'center', px: 2, py: 1, borderBottom: 1, borderColor: 'divider' }}
        >
          <TextField
            inputRef={searchInputRef}
            size="small"
            fullWidth
            placeholder="Rechercher dans le livre…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                goToMatch(e.shiftKey ? -1 : 1);
              } else if (e.key === 'Escape') {
                e.preventDefault();
                // Ne pas laisser remonter jusqu'à l'écouteur global (qui fermerait le visualiseur) :
                // ici Échap ne fait que fermer la barre de recherche.
                e.stopPropagation();
                closeSearch();
              }
            }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" color="disabled" />
                  </InputAdornment>
                ),
              },
            }}
          />

          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ whiteSpace: 'nowrap', minWidth: 92, textAlign: 'right' }}
          >
            {indexing
              ? `Indexation… ${indexProgress} %`
              : !hasQuery
                ? ''
                : matches && matches.length > 0
                  ? `${activeMatch + 1} / ${matches.length}`
                  : 'Aucun résultat'}
          </Typography>

          <Tooltip title="Occurrence précédente (Maj+Entrée)">
            <span>
              <IconButton
                size="small"
                onClick={() => goToMatch(-1)}
                disabled={!matches || matches.length === 0}
              >
                <KeyboardArrowUpIcon />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Occurrence suivante (Entrée)">
            <span>
              <IconButton
                size="small"
                onClick={() => goToMatch(1)}
                disabled={!matches || matches.length === 0}
              >
                <KeyboardArrowDownIcon />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Fermer la recherche">
            <IconButton size="small" onClick={closeSearch}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      </Collapse>

      <Box
        ref={setScrollEl}
        sx={{
          // Modale : hauteur fixe (85 % de la fenêtre). Plein écran : occupe tout l'espace restant.
          height: chrome === 'dialog' ? '85vh' : 'auto',
          flex: chrome === 'page' ? 1 : 'none',
          minHeight: 0,
          overflow: 'auto',
          display: 'flex',
          bgcolor: 'action.hover',
          p: 2,
        }}
      >
        {loadError ? (
          <Typography color="error" sx={{ m: 'auto', textAlign: 'center', px: 3 }}>
            Impossible de charger le livre. Vérifiez que le fichier PDF est bien disponible.
          </Typography>
        ) : (
          // `margin: auto` sur le conteneur flex : la page est CENTRÉE quand elle tient, et
          // alignée au début (donc entièrement atteignable au défilement) quand le zoom la fait
          // déborder — les marges auto se collapsent à 0 en cas de débordement, contrairement à
          // `justify-content: center` qui rognerait et rendrait le bord inatteignable.
          <Box sx={{ m: 'auto' }}>
            <Document
              file={book.file}
              onLoadSuccess={(pdf) => {
                setNumPages(pdf.numPages);
                setPdfDoc(pdf);
              }}
              onLoadError={() => setLoadError(true)}
              loading={
                <Box sx={{ py: 8, textAlign: 'center' }}>
                  <CircularProgress />
                </Box>
              }
            >
              <Page
                pageNumber={current}
                width={pageWidth}
                customTextRenderer={textRenderer}
                onLoadSuccess={({ originalWidth, originalHeight }) =>
                  setPageRatio(originalHeight / originalWidth)
                }
                onRenderTextLayerSuccess={() => {
                  // Centrage du passage ciblé par un renvoi (PER-59/61) : la couche texte n'existe
                  // qu'ICI (après rendu), d'où le déclenchement sur ce callback plutôt qu'un effet.
                  if (!targetActive) return;
                  const mark = scrollRef.current?.querySelector(`.textLayer mark.${TARGET_MARK_CLASS}`);
                  mark?.scrollIntoView({ block: 'center' });
                }}
                loading={
                  <Box sx={{ py: 8, textAlign: 'center' }}>
                    <CircularProgress size={28} />
                  </Box>
                }
              />
            </Document>
          </Box>
        )}
      </Box>
    </>
  );

  // Modale superposée (route interceptée) : ferme au clic sur le fond / Échap via `onClose`.
  if (chrome === 'dialog') {
    return (
      <Dialog open onClose={onClose} maxWidth="lg" fullWidth>
        {content}
      </Dialog>
    );
  }

  // Plein écran (route réelle) : colonne pleine hauteur, la zone de page prend l'espace restant.
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100dvh', bgcolor: 'background.paper' }}>
      {content}
    </Box>
  );
}
