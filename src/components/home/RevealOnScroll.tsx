'use client';

/**
 * Apparition en fondu à l'entrée dans la fenêtre, pour donner du rythme au défilement
 * de la vitrine. Un `IntersectionObserver` par bloc, déclenché UNE seule fois (on se
 * désabonne aussitôt) : rien ne réapparaît ni ne clignote si l'on remonte.
 *
 * **Le contenu est rendu VISIBLE, toujours.** Le masquage est posé par l'effet, en
 * écriture directe sur le nœud DOM (comme les parallaxes de l'app), puis levé à la
 * révélation. Deux raisons, et aucune n'est cosmétique :
 *  - un rendu serveur, ou un navigateur sans `IntersectionObserver`, laisse le contenu
 *    lisible au lieu de le condamner à l'invisibilité définitive ;
 *  - masquer via un `useState` obligerait à appeler `setState` dans l'effet, ce que le
 *    projet refuse (règle `react-hooks/set-state-in-effect`) : cascade de rendus pour
 *    un effet purement visuel.
 *
 * Neutralisé quand les animations sont réduites — préférence de l'OS **ou** réglage
 * maison `animateBackground` (`usePreferencesStore`). Ce réglage vise à l'origine le
 * parallaxe du fond, mais son intention est plus large (« ce poste rame ») : on
 * l'honore ici aussi.
 */
import { useEffect, useRef, type ReactNode } from 'react';
import Box from '@mui/material/Box';
import { usePreferencesStore } from '@/stores/preferences';

/** Décalage vertical de départ (px), ramené à zéro à la révélation. */
const OFFSET = 18;

/** Durée du fondu (ms). Doit rester en phase avec la `transition` du composant. */
const DURATION = 520;

export function RevealOnScroll({
  children,
  /** Retard d'entrée (ms) : sert à échelonner plusieurs blocs voisins. */
  delay = 0,
}: {
  children: ReactNode;
  delay?: number;
}) {
  const animateBackground = usePreferencesStore((s) => s.animateBackground);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const reduced =
      !animateBackground ||
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
    if (reduced || typeof IntersectionObserver === 'undefined') return;

    // Masquage posé ici, jamais au rendu : voir l'en-tête de fichier.
    node.style.opacity = '0';
    node.style.transform = `translateY(${OFFSET}px)`;
    node.style.transition = `opacity ${DURATION}ms ease-out, transform ${DURATION}ms ease-out`;
    node.style.transitionDelay = `${delay}ms`;

    const reveal = () => {
      node.style.opacity = '1';
      node.style.transform = 'none';
    };

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          reveal();
          observer.disconnect();
        }
      },
      // Marge négative en bas : le bloc n'est révélé qu'une fois franchement entré
      // dans la fenêtre, pas dès que son premier pixel affleure.
      { rootMargin: '0px 0px -12% 0px' },
    );
    observer.observe(node);
    return () => {
      observer.disconnect();
      // Démontage de l'effet (changement de préférence) : on rend la main sur un bloc
      // VISIBLE, sans reliquat de style.
      reveal();
      node.style.transition = '';
      node.style.transitionDelay = '';
    };
  }, [animateBackground, delay]);

  return (
    <Box ref={ref} data-glossary-shot="RevealOnScroll">
      {children}
    </Box>
  );
}
