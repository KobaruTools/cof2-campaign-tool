'use client';

/**
 * Point de montage global du visualiseur PDF (milestone « Visualiseur PDF », socle v1 PER-240).
 * Monté une seule fois dans les providers ; n'affiche rien tant que le visualiseur n'a pas été
 * ouvert au moins une fois.
 *
 * Le composant lourd ([[PdfViewerDialog]] + react-pdf/pdf.js) est chargé :
 *  - **sans SSR** (`ssr: false`) car react-pdf touche à `window` et au worker pdf.js ;
 *  - **paresseusement**, et seulement une fois le visualiseur ouvert au moins une fois → le chunk
 *    pdf.js n'est pas téléchargé tant que le joueur n'a pas cliqué sur un renvoi de page.
 *
 * Une fois monté, le dialog RESTE monté (sa visibilité est pilotée par le store en interne) :
 * la transition de fermeture MUI joue normalement et le PDF déjà chargé est réutilisé à la
 * réouverture, au lieu d'être re-téléchargé.
 */
import { useState } from 'react';
import dynamic from 'next/dynamic';
import { usePdfViewerStore } from '@/stores/pdfViewer';

const PdfViewerDialog = dynamic(() => import('./PdfViewerDialog'), { ssr: false });

export function PdfViewerHost() {
  const open = usePdfViewerStore((s) => s.open);
  // Une fois ouvert, on garde le dialog monté (ajustement en phase de rendu, pas d'effet à
  // setState) : le chunk pdf.js n'est chargé qu'à la première ouverture, puis la modale gère
  // elle-même sa visibilité et réutilise le PDF déjà chargé.
  const [mounted, setMounted] = useState(open);
  if (open && !mounted) setMounted(true);
  if (!mounted) return null;
  return <PdfViewerDialog />;
}
