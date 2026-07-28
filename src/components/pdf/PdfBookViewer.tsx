'use client';

/**
 * Visualiseur PDF intégré (milestone « Visualiseur PDF »). Rend un livre de règles à une page
 * donnée, avec recherche plein-texte (PER-58) et surlignage/centrage d'un passage ciblé (PER-59/61).
 *
 * **Défilement CONTINU** (PER-255) : le livre entier est une colonne d'emplacements de hauteur
 * uniforme, et seules les pages proches du viewport sont réellement montées (virtualisation).
 * L'inversion tient en une phrase : `current` ne décide plus ce qui est rendu, il est **déduit
 * de la position de défilement** — « aller à la page N » veut dire « défiler jusqu'à son
 * emplacement ». Toute l'arithmétique est dans [[pageColumn]] (pure, testée). Si le sondage
 * détecte des pages de formats différents (hypothèse d'uniformité cassée), on se rabat sur le
 * rendu page à page plutôt que de laisser les offsets dériver en silence.
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
import { downloadPaidBook, PaidBookAccessError } from '@/lib/pdf/paidBooks';
import {
  dominantPage,
  pageAnchor,
  scrollTopForAnchor,
  scrollTopForPage,
  visiblePageRange,
  type PageAnchor,
  type PageColumnGeometry,
} from '@/lib/pdf/pageColumn';
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

/** Espace vertical entre deux pages de la colonne continue (PER-255), en px. */
const PAGE_GAP = 12;

/**
 * Nombre de pages pré-rendues de chaque côté du viewport. Assez pour ne pas voir d'emplacement
 * vide en feuilletant, assez peu pour ne garder qu'une poignée de canvas en mémoire (~360 pages).
 */
const PAGE_OVERSCAN = 2;

/** Écart de ratio hauteur/largeur toléré entre deux pages avant de les juger de formats différents. */
const RATIO_TOLERANCE = 0.01;

export interface PdfBookViewerProps {
  /** Livre à afficher (validé en amont par la route). */
  bookId: BookId;
  /**
   * Page d'ENTRÉE demandée par l'URL, en numéro IMPRIMÉ (cohérent avec le livre papier).
   * Le visualiseur la convertit en numéro de FICHIER via `book.printedPageOffset`
   * (`pageFichier = imprimé + offset`) — sans décalage pour le livre de base, +3 pour
   * le Bestiaire (pages de garde).
   */
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

  // Décalage de pagination du livre : le visualiseur travaille en numéro de FICHIER
  // (ce que pdf.js indexe), l'URL/les badges en numéro IMPRIMÉ. `fileInitialPage` est
  // la page d'entrée convertie ; le compteur « X / N » affiche donc un n° de fichier.
  const pageOffset = book.printedPageOffset;
  const fileInitialPage = initialPage + pageOffset;

  const [numPages, setNumPages] = useState<number | null>(null);
  const [current, setCurrent] = useState(fileInitialPage);
  const [pageInput, setPageInput] = useState(String(fileInitialPage));
  const [zoom, setZoom] = useState(1);
  // Ajustement de la page : « page entière » (contain, défaut) ou « pleine largeur » (remplit la
  // largeur, on défile verticalement). Éphémère (comme le zoom) ; le zoom se multiplie par-dessus.
  const [fitMode, setFitMode] = useState<'page' | 'width'>('page');
  // Surlignage du passage ciblé par un renvoi (PER-59/61) : affiché par défaut à l'ouverture (et
  // recentré), masquable à la demande pour la lisibilité une fois le passage repéré. Remis à ON à
  // chaque nouveau renvoi (cf. resync sur la clé page/terme).
  const [showTarget, setShowTarget] = useState(true);
  const [loadError, setLoadError] = useState(false);

  // --- Livraison du PDF (PER-252) -------------------------------------------------------------
  // Livre PUBLIC (livre de base) : chargé par URL statique (`book.file`). Livre PAYANT
  // (Bestiaire) : TÉLÉCHARGÉ de façon authentifiée depuis le bucket privé et gardé en mémoire
  // (`pdfBlob`), avec progression. `accessDenied` = la RLS a refusé (non entitlé) → message clair.
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);
  // Fraction téléchargée (0..1) ; `null` = pas de téléchargement en cours OU taille inconnue.
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);

  // Dimensions du conteneur (largeur ET hauteur) + ratio hauteur/largeur de la page courante :
  // de quoi ajuster la page en mode « page entière » (contain) — le plus grand rendu qui tient
  // à la fois en largeur et en hauteur, multiplié ensuite par le zoom.
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [container, setContainer] = useState({ w: 0, h: 0 });
  const [pageRatio, setPageRatio] = useState<number | null>(null);

  // --- Colonne à défilement continu (PER-255) -------------------------------------------------
  // `uniformPages` : verdict du sondage de formats (cf. effet plus bas). `true` = toutes les pages
  // ont le même ratio → colonne continue ; `false` = repli page à page ; `null` = pas encore su.
  const [uniformPages, setUniformPages] = useState<boolean | null>(null);
  const continuous = uniformPages === true;
  // Élément de la colonne : sert à lire son `offsetTop` réel (padding du conteneur compris)
  // plutôt qu'à le recalculer à la main.
  const columnRef = useRef<HTMLDivElement | null>(null);
  // Fenêtre de pages réellement montées. Initialisée sur la page d'entrée : la première page
  // rendue est déjà celle qu'on vise, sans monter puis démonter la page 1.
  const [visibleRange, setVisibleRange] = useState({ start: fileInitialPage, end: fileInitialPage });
  // Renvoi (livre + page + terme) dont le saut d'entrée a DÉJÀ été fait. Tant qu'il diffère du
  // renvoi courant, la première mise en page connue doit amener le défilement sur la page citée —
  // une seule fois par renvoi, sans drapeau à armer en phase de rendu.
  const jumpedRefKeyRef = useRef<string | null>(null);
  // Ciblage du passage EN ATTENTE (PER-59/61) : consommé une seule fois, au rendu de la couche
  // texte de la page citée — le seul moment où le `<mark>` existe dans le DOM.
  const [pendingTarget, setPendingTarget] = useState(term.length >= MIN_QUERY_LENGTH);
  // Ancre de lecture à restaurer après un changement d'échelle (zoom, ajustement, resize) :
  // toutes les hauteurs changent, garder le `scrollTop` en pixels téléporterait ailleurs.
  const anchorRef = useRef<PageAnchor | null>(null);
  // Coalescence du suivi de défilement sur une frame (le scroll tire beaucoup d'événements).
  const scrollRafRef = useRef<number | null>(null);
  // Le champ « page » a-t-il le focus ? On ne le resynchronise pas pendant la saisie.
  const pageInputFocusedRef = useRef(false);
  // Dernière version de `goTo` (définie plus bas, elle dépend de la géométrie), pour l'appeler
  // depuis un effet sans l'y déclarer en dépendance — sinon un changement de zoom relancerait
  // la recherche débattue et remettrait le curseur d'occurrence à zéro.
  const goToRef = useRef<(page: number) => void>(() => {});

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
  // Même clé, préfixée du livre : identifie le RENVOI à honorer par un saut de défilement (changer
  // de livre en gardant page et terme reste un nouveau saut à faire).
  const jumpKey = `${bookId}::${targetKey}`;
  const [lastKey, setLastKey] = useState(targetKey);
  if (targetKey !== lastKey) {
    setLastKey(targetKey);
    setCurrent(fileInitialPage);
    setPageInput(String(fileInitialPage));
    // Nouveau renvoi → on ré-affiche le surlignage du passage ciblé (l'utilisateur a pu le masquer).
    setShowTarget(true);
    // …et on réarme les deux mouvements du renvoi : défiler jusqu'à la page (via `jumpedRefKeyRef`,
    // qui ne correspond plus au renvoi courant), puis centrer le passage.
    setVisibleRange({ start: fileInitialPage, end: fileInitialPage });
    setPendingTarget(term.length >= MIN_QUERY_LENGTH);
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
    // Géométrie de colonne à resonder sur le nouveau livre (formats potentiellement différents).
    setPageRatio(null);
    setUniformPages(null);
    setVisibleRange({ start: fileInitialPage, end: fileInitialPage });
    setQuery('');
    setMatches(null);
    setActiveMatch(0);
    setIndexProgress(null);
    // Livraison : oublier le PDF payant du livre précédent (l'effet de téléchargement rechargera).
    setPdfBlob(null);
    setAccessDenied(false);
    setDownloadProgress(null);
  }

  // Largeur de base de la page selon l'ajustement choisi, puis × zoom. `PAGE_MARGIN` = padding du
  // conteneur (`p: 2` = 16 px de chaque côté). Calculé AVANT les effets : la géométrie de la
  // colonne en dépend.
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
  // Hauteur d'un emplacement de page : c'est CETTE valeur qui est posée en CSS sur chaque
  // emplacement, donc l'arithmétique d'offsets et la mise en page ne peuvent pas diverger.
  const slotHeight = pageWidth != null && pageRatio != null ? pageWidth * pageRatio : undefined;

  // Géométrie de la colonne, relue à la demande. `null` hors défilement continu ou tant que les
  // mesures manquent — tous les appels ci-dessous s'abstiennent alors proprement. L'identité de
  // cette fonction ne change QUE quand la mise en page change (zoom, ajustement, resize, livre) :
  // les effets qui en dépendent se rejouent exactement à ces moments-là, et pas à chaque scroll.
  const readColumn = useCallback((): PageColumnGeometry | null => {
    if (!continuous || numPages == null || slotHeight == null || !(slotHeight > 0)) return null;
    return {
      numPages,
      pageHeight: slotHeight,
      gap: PAGE_GAP,
      columnTop: columnRef.current?.offsetTop ?? PAGE_MARGIN,
    };
  }, [continuous, numPages, slotHeight]);

  // Déduit du défilement la page courante (compteur + champ « page ») et la fenêtre de pages à
  // monter. C'est ici que s'opère l'inversion de PER-255 : `current` SUIT le défilement.
  const syncFromScroll = useCallback(() => {
    const el = scrollRef.current;
    const g = readColumn();
    if (!el || !g) return;
    const page = dominantPage(g, el.scrollTop, el.clientHeight);
    setCurrent(page);
    if (!pageInputFocusedRef.current) setPageInput(String(page));
    // Moins de voisines pré-rendues quand une page dépasse déjà l'écran (zoom fort) : chaque
    // canvas y coûte cher en mémoire, et on ne peut de toute façon pas feuilleter vite.
    const overscan = g.pageHeight > el.clientHeight ? 1 : PAGE_OVERSCAN;
    const next = visiblePageRange(g, el.scrollTop, el.clientHeight, overscan);
    setVisibleRange((prev) => (prev.start === next.start && prev.end === next.end ? prev : next));
  }, [readColumn]);

  // Amène le défilement sur une page (n° de FICHIER). Instantané : un défilement animé se
  // battrait avec le centrage du passage ciblé, qui s'enchaîne juste après.
  const scrollToPage = useCallback(
    (page: number) => {
      const el = scrollRef.current;
      const g = readColumn();
      if (!el || !g) return;
      el.scrollTo({ top: scrollTopForPage(g, page) });
    },
    [readColumn],
  );

  // Mémorise l'endroit lu, à appeler AVANT tout changement d'échelle.
  const rememberAnchor = useCallback(() => {
    const el = scrollRef.current;
    const g = readColumn();
    if (el && g) anchorRef.current = pageAnchor(g, el.scrollTop);
  }, [readColumn]);

  // Suivi du défilement, coalescé sur une frame.
  const handleScroll = useCallback(() => {
    if (scrollRafRef.current != null) return;
    scrollRafRef.current = requestAnimationFrame(() => {
      scrollRafRef.current = null;
      syncFromScroll();
    });
  }, [syncFromScroll]);

  useEffect(
    () => () => {
      if (scrollRafRef.current != null) cancelAnimationFrame(scrollRafRef.current);
    },
    [],
  );

  // Sondage des formats de page (garde-fou de l'hypothèse d'uniformité) : on compare le ratio
  // de la première page, d'une page du milieu et de la dernière. Identiques → colonne continue,
  // avec un `pageRatio` connu AVANT tout rendu (pas de saut de mise en page). Divergents →
  // repli page à page, seul mode où les offsets ne peuvent pas dériver.
  useEffect(() => {
    if (!pdfDoc) return;
    let cancelled = false;
    const ratioOf = async (n: number) => {
      const page = await pdfDoc.getPage(n);
      const { width, height } = page.getViewport({ scale: 1 });
      page.cleanup();
      return height / width;
    };
    const last = pdfDoc.numPages;
    const probes = [...new Set([1, Math.ceil(last / 2), last])].filter((n) => n >= 1 && n <= last);
    void Promise.all(probes.map(ratioOf))
      .then((ratios) => {
        if (cancelled || ratios.length === 0) return;
        const [first] = ratios;
        setPageRatio(first);
        setUniformPages(ratios.every((r) => Math.abs(r - first) <= RATIO_TOLERANCE));
      })
      .catch(() => {
        // Sondage impossible : on reste en repli page à page (le rendu, lui, fonctionne).
        if (!cancelled) setUniformPages(false);
      });
    return () => {
      cancelled = true;
    };
  }, [pdfDoc]);

  // Suivi des redimensionnements (fenêtre, rotation…) une fois monté. La mesure INITIALE est
  // faite par le ref callback ci-dessus ; ici on ne fait que réagir aux changements de taille —
  // en mémorisant d'abord l'endroit lu, puisque les hauteurs vont changer.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      rememberAnchor();
      setContainer({ w: el.clientWidth, h: el.clientHeight });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [bookId, rememberAnchor]);

  // Mise en page (re)calculée : on replace le défilement, puis on resynchronise page courante et
  // fenêtre de rendu. Deux mouvements possibles, dans cet ordre de priorité :
  //  1. le saut d'entrée en attente (ouverture, nouveau renvoi) ;
  //  2. l'ancre de lecture (zoom, ajustement, redimensionnement).
  // Cet effet ne se rejoue qu'aux changements de mise en page (cf. identité de `readColumn`),
  // jamais au fil du défilement.
  useEffect(() => {
    const el = scrollRef.current;
    const g = readColumn();
    if (!el || !g) return;
    if (jumpedRefKeyRef.current !== jumpKey) {
      jumpedRefKeyRef.current = jumpKey;
      anchorRef.current = null;
      el.scrollTo({ top: scrollTopForPage(g, fileInitialPage) });
    } else if (anchorRef.current) {
      const anchor = anchorRef.current;
      anchorRef.current = null;
      el.scrollTo({ top: scrollTopForAnchor(g, anchor) });
    }
    syncFromScroll();
  }, [readColumn, syncFromScroll, jumpKey, fileInitialPage]);

  // Téléchargement du PDF payant (PER-252) : à l'ouverture du visualiseur sur un livre
  // en mode `paid-bucket`, on télécharge le fichier via la session authentifiée (gardé par
  // la RLS Storage) et on le garde en mémoire. Le cache de session (dans `paidBooks`) rend
  // une réouverture instantanée. Un refus RLS → `accessDenied` (message clair), toute autre
  // erreur → `loadError`. Les livres publics (`public-file`) ne passent pas par ici.
  useEffect(() => {
    if (book.delivery !== 'paid-bucket' || book.available === false || !book.sourceSlug) return;
    // La progression démarre à `null` (spinner indéterminé) le temps de l'ouverture de session
    // et des en-têtes ; `downloadPaidBook` la passe en déterminée dès qu'il connaît la taille.
    // Pas de `setState` synchrone ici (les `setState` restent dans les callbacks async).
    let cancelled = false;
    downloadPaidBook(book.sourceSlug, (fraction) => {
      if (!cancelled) setDownloadProgress(fraction);
    })
      .then((blob) => {
        if (cancelled) return;
        setPdfBlob(blob);
        setDownloadProgress(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setDownloadProgress(null);
        if (err instanceof PaidBookAccessError) setAccessDenied(true);
        else setLoadError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [book.delivery, book.available, book.sourceSlug]);

  // Repli page à page SEULEMENT (pages de formats différents) : la page rendue change, on revient
  // en haut du conteneur. En défilement continu, c'est l'inverse — le défilement commande la page.
  useEffect(() => {
    if (continuous) return;
    scrollRef.current?.scrollTo({ top: 0 });
  }, [current, continuous]);

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
      if (found.length > 0) goToRef.current(found[0].page);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchOpen, query, bookId, indexVersion]);

  // Surlignage de la couche texte. Deux sources, JAMAIS enchevêtrées : la RECHERCHE tapée (ambre,
  // toutes pages, PER-58) a la PRIORITÉ ; à défaut, le terme CIBLÉ par le renvoi (couleur distincte,
  // PER-59/61) est surligné sur sa SEULE page. Une même fonction rend les deux (classe différente).
  const highlightQuery = searchOpen && query.trim().length >= MIN_QUERY_LENGTH ? query.trim() : '';
  // Terme ciblé actif : bascule ON, hors recherche, terme non vide. En défilement continu, le
  // surlignage est porté par la SEULE page citée (cf. `textRendererFor`), donc rien à conditionner
  // à la page courante — la lier au compteur ferait clignoter le repère au moindre défilement, et
  // le centrage du passage (qui remonte d'une demi-page) suffirait déjà à l'éteindre. En repli page
  // à page, il faut en revanche vérifier qu'on est bien sur la page citée (en n° de FICHIER).
  const targetActive =
    showTarget &&
    !highlightQuery &&
    term.length >= MIN_QUERY_LENGTH &&
    (continuous || current === fileInitialPage);
  // Deux renderers d'identité STABLE (react-pdf reconstruit la couche texte dès que le renderer
  // change d'identité : en défilement continu, en fabriquer un par rendu la reconstruirait à
  // chaque frame de scroll). La recherche s'applique à toutes les pages rendues ; le terme ciblé
  // à la SEULE page citée — d'où la sélection par page dans `textRendererFor`.
  const searchRenderer = useMemo(
    () =>
      highlightQuery
        ? (item: { str: string }) => renderTextItemWithHighlight(item.str, highlightQuery)
        : undefined,
    [highlightQuery],
  );
  const targetRenderer = useMemo(
    () =>
      targetActive
        ? (item: { str: string }) => renderTextItemWithHighlight(item.str, term, TARGET_MARK_CLASS)
        : undefined,
    [targetActive, term],
  );
  const textRendererFor = (page: number) =>
    searchRenderer ?? (page === fileInitialPage ? targetRenderer : undefined);

  // Centrage du passage ciblé par un renvoi (PER-59/61), second des deux mouvements d'un renvoi.
  // Déclenché au rendu de la couche texte de la page citée (le `<mark>` n'existe pas avant) et
  // consommé UNE SEULE FOIS : sans ce drapeau, chaque reconstruction de couche texte
  // (recherche, zoom, aller-retour de défilement) recentrerait de force sur le passage.
  const centerTargetMark = () => {
    if (!pendingTarget || !targetActive) return;
    setPendingTarget(false);
    const mark = scrollRef.current?.querySelector(`.textLayer mark.${TARGET_MARK_CLASS}`);
    mark?.scrollIntoView({ block: 'center', behavior: 'auto' });
  };

  const clampPage = (p: number) => Math.min(Math.max(1, p), numPages ?? p);
  // « Aller à la page N » : en défilement continu, défiler jusqu'à son emplacement (le suivi de
  // défilement reconfirmera la page) ; en repli, changer la page rendue.
  const goTo = (p: number) => {
    const next = clampPage(p);
    setCurrent(next);
    setPageInput(String(next));
    if (continuous) scrollToPage(next);
  };
  // Publie la dernière version de `goTo` pour les effets (cf. `goToRef`).
  useEffect(() => {
    goToRef.current = goTo;
  });

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
            // Pendant la saisie, le suivi de défilement ne réécrit pas le champ sous les doigts.
            onFocus={() => {
              pageInputFocusedRef.current = true;
            }}
            onBlur={() => {
              pageInputFocusedRef.current = false;
              commitPageInput();
            }}
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
            onClick={() => {
              // Toutes les hauteurs vont changer : on note d'abord l'endroit lu.
              rememberAnchor();
              setFitMode((m) => (m === 'page' ? 'width' : 'page'));
            }}
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
                onClick={() => {
                  rememberAnchor();
                  setZoom((z) => Math.max(ZOOM_MIN, z - ZOOM_STEP));
                }}
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
                onClick={() => {
                  rememberAnchor();
                  setZoom((z) => Math.min(ZOOM_MAX, z + ZOOM_STEP));
                }}
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
        onScroll={continuous ? handleScroll : undefined}
        sx={{
          // Modale : hauteur fixe (85 % de la fenêtre). Plein écran : occupe tout l'espace restant.
          height: chrome === 'dialog' ? '85vh' : 'auto',
          flex: chrome === 'page' ? 1 : 'none',
          minHeight: 0,
          overflow: 'auto',
          display: 'flex',
          // Repère de positionnement de la colonne : son `offsetTop` (lu pour la géométrie) est
          // alors mesuré dans CE conteneur, padding compris.
          position: 'relative',
          bgcolor: 'action.hover',
          p: 2,
        }}
      >
        {book.available === false ? (
          // Livre DORMANT (PDF pas encore servi) : message clair plutôt qu'un chargement
          // voué à l'échec.
          <Typography color="text.secondary" sx={{ m: 'auto', textAlign: 'center', px: 3 }}>
            « {book.name} » n&apos;est pas encore disponible dans le visualiseur.
          </Typography>
        ) : accessDenied ? (
          // Livre PAYANT non débloqué (RLS Storage refuse le téléchargement, PER-252) :
          // message clair, jamais une erreur technique.
          <Typography color="text.secondary" sx={{ m: 'auto', textAlign: 'center', px: 3 }}>
            Vous n&apos;avez pas débloqué « {book.name} ». Débloquez ce livre pour le consulter ici.
          </Typography>
        ) : loadError ? (
          <Typography color="error" sx={{ m: 'auto', textAlign: 'center', px: 3 }}>
            Impossible de charger le livre. Vérifiez que le fichier PDF est bien disponible.
          </Typography>
        ) : book.delivery === 'paid-bucket' && pdfBlob === null ? (
          // Livre payant en cours de TÉLÉCHARGEMENT (via la session authentifiée) : indicateur
          // de progression (déterminé si la taille est connue, indéterminé sinon).
          <Stack sx={{ m: 'auto', alignItems: 'center', gap: 2, px: 3 }}>
            <CircularProgress
              variant={downloadProgress != null ? 'determinate' : 'indeterminate'}
              value={downloadProgress != null ? Math.round(downloadProgress * 100) : undefined}
            />
            <Typography color="text.secondary" sx={{ textAlign: 'center' }}>
              Téléchargement du livre…
              {downloadProgress != null ? ` ${Math.round(downloadProgress * 100)} %` : ''}
            </Typography>
          </Stack>
        ) : (
          // `margin: auto` sur le conteneur flex : la page est CENTRÉE quand elle tient, et
          // alignée au début (donc entièrement atteignable au défilement) quand le zoom la fait
          // déborder — les marges auto se collapsent à 0 en cas de débordement, contrairement à
          // `justify-content: center` qui rognerait et rendrait le bord inatteignable.
          <Box sx={{ m: 'auto' }}>
            <Document
              // Livre public : URL statique. Livre payant : Blob téléchargé (immuable → sûr
              // pour react-pdf, pas de détachement d'ArrayBuffer au transfert vers le worker).
              file={book.delivery === 'paid-bucket' ? pdfBlob! : book.file}
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
              {uniformPages == null || (continuous && slotHeight == null) ? (
                // Formats de page pas encore sondés (ou conteneur pas encore mesuré) : on attend
                // plutôt que de rendre une page qu'il faudrait aussitôt remplacer — un premier
                // rendu jeté consommerait le ciblage du passage pour rien.
                <Box sx={{ py: 8, textAlign: 'center' }}>
                  <CircularProgress size={28} />
                </Box>
              ) : continuous ? (
                // COLONNE CONTINUE (PER-255) : un emplacement par page, tous de la même hauteur,
                // dont seuls ceux proches du viewport portent une vraie `<Page>`. Les autres
                // gardent la place exacte — barre de défilement et sauts de page justes.
                <Box
                  ref={columnRef}
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: `${PAGE_GAP}px`,
                    // Emplacements stylés DEPUIS LA COLONNE, et non un par un : chaque page est un
                    // `div` nu (seules largeur/hauteur en style inline). Traverser le livre
                    // remonte la colonne entière à chaque franchissement de page — autant que ce
                    // soit 360 éléments nus plutôt que 360 composants stylés.
                    '& > .pdf-slot': {
                      flex: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                      bgcolor: 'background.paper',
                      boxShadow: 1,
                    },
                    // Emplacement pas encore monté : son numéro suffit à se repérer en feuilletant
                    // vite (rendu en CSS pour garder le `div` nu).
                    '& > .pdf-slot-empty::after': {
                      content: 'attr(data-page-label)',
                      color: 'text.disabled',
                      fontSize: '0.75rem',
                    },
                  }}
                >
                  {Array.from({ length: numPages ?? 0 }, (_, i) => i + 1).map((page) => {
                    const rendered = page >= visibleRange.start && page <= visibleRange.end;
                    return (
                      <div
                        key={page}
                        className={rendered ? 'pdf-slot' : 'pdf-slot pdf-slot-empty'}
                        data-page-label={`Page ${page}`}
                        style={{ width: pageWidth, height: slotHeight }}
                      >
                        {rendered && (
                          <Page
                            pageNumber={page}
                            width={pageWidth}
                            customTextRenderer={textRendererFor(page)}
                            onRenderTextLayerSuccess={
                              page === fileInitialPage ? centerTargetMark : undefined
                            }
                            loading={<CircularProgress size={24} />}
                          />
                        )}
                      </div>
                    );
                  })}
                </Box>
              ) : (
                // Repli page à page : pages de formats différents (ou sondage impossible), où une
                // colonne à hauteur uniforme ferait dériver les offsets. Comportement d'origine.
                <Page
                  pageNumber={current}
                  width={pageWidth}
                  customTextRenderer={textRendererFor(current)}
                  onLoadSuccess={({ originalWidth, originalHeight }) =>
                    setPageRatio(originalHeight / originalWidth)
                  }
                  onRenderTextLayerSuccess={centerTargetMark}
                  loading={
                    <Box sx={{ py: 8, textAlign: 'center' }}>
                      <CircularProgress size={28} />
                    </Box>
                  }
                />
              )}
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
