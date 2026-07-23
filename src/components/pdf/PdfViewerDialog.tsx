'use client';

/**
 * Visualiseur PDF intégré (milestone « Visualiseur PDF », socle v1 PER-240) : une modale
 * unique, partagée par l'app, qui ouvre un livre de règles à une page donnée depuis un renvoi.
 *
 * Rendu via **pdf.js** (`react-pdf`) et non la visionneuse native du navigateur : c'est le socle
 * qu'exigent PER-58 (recherche dans la couche texte), PER-59 (surlignage) et PER-61 (paragraphe).
 *
 * Ce module est chargé PARESSEUSEMENT et sans SSR (cf. [[PdfViewerHost]]) : react-pdf touche à
 * `window`/`DOMMatrix` et le worker pdf.js n'existe qu'au navigateur. Le `workerSrc` DOIT être
 * défini dans le module même où l'on rend `<Document>` (contrainte react-pdf : sinon l'ordre
 * d'exécution des modules réécrit la valeur par défaut).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import CloseIcon from '@mui/icons-material/Close';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { BOOKS } from '@/lib/ui/books';
import { usePdfViewerStore } from '@/stores/pdfViewer';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

const ZOOM_MIN = 0.5;
const ZOOM_MAX = 3;
const ZOOM_STEP = 0.25;

export default function PdfViewerDialog() {
  const { open, bookId, page, nonce, close } = usePdfViewerStore();
  const book = bookId ? BOOKS[bookId] : null;

  const [numPages, setNumPages] = useState<number | null>(null);
  const [current, setCurrent] = useState(page);
  const [pageInput, setPageInput] = useState(String(page));
  const [zoom, setZoom] = useState(1);
  const [loadError, setLoadError] = useState(false);

  // Dimensions du conteneur (largeur ET hauteur) + ratio hauteur/largeur de la page courante :
  // de quoi ajuster la page en mode « page entière » (contain) — le plus grand rendu qui tient
  // à la fois en largeur et en hauteur, multiplié ensuite par le zoom.
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [container, setContainer] = useState({ w: 0, h: 0 });
  const [pageRatio, setPageRatio] = useState<number | null>(null);

  // Mesure du conteneur via REF CALLBACK (exécuté au commit, `clientWidth/Height` force un
  // reflow synchrone → taille déjà mise en page, fiable dès le montage), là où `ResizeObserver`
  // seul laissait le conteneur à 0 au premier rendu (timing portail/transition MUI).
  const setScrollEl = useCallback((el: HTMLDivElement | null) => {
    scrollRef.current = el;
    if (el) setContainer({ w: el.clientWidth, h: el.clientHeight });
  }, []);

  // Resynchronisation en PHASE DE RENDU (pattern React « adjust state while rendering », plutôt
  // qu'un effet à setState) : chaque ouverture (`nonce`) recale la page affichée sur la page
  // demandée, et un changement de livre réinitialise chargement/zoom.
  const [lastNonce, setLastNonce] = useState(nonce);
  if (nonce !== lastNonce) {
    setLastNonce(nonce);
    setCurrent(page);
    setPageInput(String(page));
  }
  const [lastBookId, setLastBookId] = useState(bookId);
  if (bookId !== lastBookId) {
    setLastBookId(bookId);
    setNumPages(null);
    setLoadError(false);
    setZoom(1);
  }

  // Suivi des redimensionnements (fenêtre, rotation…) une fois monté. La mesure INITIALE est
  // faite par le ref callback ci-dessus ; ici on ne fait que réagir aux changements de taille.
  useEffect(() => {
    if (!open) return;
    const el = scrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setContainer({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    return () => ro.disconnect();
  }, [open, bookId]);

  // Amène la page courante en haut du conteneur à chaque changement de page.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [current]);

  if (!book) return null;

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

  // Ajustement « page entière » (contain) : largeur du plus grand rendu qui tient à la fois en
  // largeur (dispoW) et en hauteur (dispoH via le ratio), puis × zoom. `PAGE_MARGIN` = padding du
  // conteneur (`p: 2` = 16 px de chaque côté). Zoom 100 % = page entière ; au-delà, on défile.
  // Repli : tant que le ratio n'est pas connu (avant le 1er chargement de page), on ajuste sur la
  // largeur — la page reçoit AUSSITÔT une largeur (donc le zoom agit), puis le ratio affine.
  const PAGE_MARGIN = 16;
  const availW = container.w - PAGE_MARGIN * 2;
  const availH = container.h - PAGE_MARGIN * 2;
  const fitWidth =
    availW > 0 && availH > 0
      ? pageRatio
        ? Math.min(availW, availH / pageRatio)
        : availW
      : undefined;
  const pageWidth = fitWidth != null ? fitWidth * zoom : undefined;

  return (
    <Dialog open={open} onClose={close} maxWidth="lg" fullWidth>
      <Stack
        direction="row"
        spacing={1}
        sx={{
          alignItems: 'center',
          px: 2,
          py: 1,
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <book.Icon sx={{ fontSize: 20, color: 'text.secondary' }} />
        <Typography variant="subtitle1" sx={{ fontWeight: 600, mr: 'auto' }} noWrap>
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

        <Tooltip title="Fermer">
          <IconButton size="small" onClick={close} sx={{ ml: 1 }}>
            <CloseIcon />
          </IconButton>
        </Tooltip>
      </Stack>

      <Box
        ref={setScrollEl}
        sx={{
          height: '85vh',
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
              onLoadSuccess={({ numPages: n }) => setNumPages(n)}
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
                onLoadSuccess={({ originalWidth, originalHeight }) =>
                  setPageRatio(originalHeight / originalWidth)
                }
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
    </Dialog>
  );
}
