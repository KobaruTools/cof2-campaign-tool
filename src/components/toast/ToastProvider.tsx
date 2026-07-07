'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';
import Box from '@mui/material/Box';
import Collapse from '@mui/material/Collapse';
import { alpha } from '@mui/material/styles';
import { AppAlert } from '@/components/AppAlert';
import type { AlertColor } from '@mui/material/Alert';

/** Durée d'affichage par défaut d'un toast, en millisecondes. */
const DEFAULT_DURATION = 5000;
/** Nombre maximum de toasts empilés simultanément (les plus anciens sont évincés). */
const MAX_STACK = 4;

interface ToastOptions {
  /** Durée avant disparition automatique (ms). `null` = persistant (fermeture manuelle). */
  duration?: number | null;
}

interface ToastEntry {
  id: number;
  message: React.ReactNode;
  severity: AlertColor;
  duration: number | null;
}

interface ToastContextValue {
  /**
   * Affiche un toast transitoire, empilé en bas à droite de l'écran. Reprend la
   * signature de l'ancien helper local `showToast(message, severity)` pour que la
   * migration des pages soit un simple remplacement.
   */
  showToast: (message: React.ReactNode, severity?: AlertColor, options?: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

/**
 * Accès au système de toasts global. À utiliser dans tout composant client sous
 * `ToastProvider` (monté une fois dans les providers de l'app).
 */
export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (ctx == null) {
    throw new Error('useToast doit être utilisé sous un <ToastProvider>.');
  }
  return ctx;
}

/**
 * Fournit un système de toasts unique pour l'app : une pile ancrée en bas à droite,
 * chacun avec sa sévérité, sa durée et une barre de progression calée sur sa
 * disparition automatique. Remplace le motif dupliqué « état local + `<Snackbar>` »
 * de chaque page. Le rendu réutilise `AppAlert` (variante `filled`) pour rester
 * cohérent avec le reste de l'app.
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastEntry[]>([]);
  // Compteur d'id monotone (pas de dépendance à Date.now/Math.random).
  const nextId = useRef(0);

  const remove = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback<ToastContextValue['showToast']>(
    (message, severity = 'info', options) => {
      const entry: ToastEntry = {
        id: nextId.current++,
        message,
        severity,
        duration: options?.duration === undefined ? DEFAULT_DURATION : options.duration,
      };
      // Empile le nouveau toast en fin de liste (donc au plus près du coin), en
      // évinçant le plus ancien au-delà de la limite de pile.
      setToasts((prev) => [...prev, entry].slice(-MAX_STACK));
    },
    [],
  );

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <Box
        aria-live="polite"
        sx={(theme) => ({
          position: 'fixed',
          bottom: 24,
          right: 24,
          zIndex: theme.zIndex.snackbar,
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
          // Ne pas capturer les clics sur la zone vide entre/autour des toasts.
          pointerEvents: 'none',
          maxWidth: 'min(420px, calc(100vw - 48px))',
        })}
      >
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={() => remove(toast.id)} />
        ))}
      </Box>
    </ToastContext.Provider>
  );
}

/**
 * Un toast de la pile. Gère sa propre disparition automatique via la fin de
 * l'animation de la barre de progression (`onAnimationEnd`) : ainsi la barre et le
 * minuteur restent parfaitement synchronisés, et le survol met les deux en pause
 * d'un seul geste (`animation-play-state`). L'entrée/sortie utilise `Collapse` pour
 * un reflux fluide de la pile.
 */
function ToastItem({ toast, onDismiss }: { toast: ToastEntry; onDismiss: () => void }) {
  const [open, setOpen] = useState(true);
  const [paused, setPaused] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const hasCountdown = toast.duration != null && toast.duration > 0;

  return (
    <Collapse appear in={open} onExited={onDismiss} sx={{ pointerEvents: 'auto' }}>
      <Box
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        sx={{ position: 'relative', overflow: 'hidden', borderRadius: 1 }}
      >
        <AppAlert
          severity={toast.severity}
          variant="filled"
          onClose={close}
          sx={{ width: '100%' }}
        >
          {toast.message}
        </AppAlert>
        {hasCountdown && (
          <Box
            onAnimationEnd={close}
            sx={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              width: '100%',
              height: 3,
              transformOrigin: 'left',
              bgcolor: (theme) => alpha(theme.palette.common.white, 0.85),
              animation: `toast-countdown ${toast.duration}ms linear forwards`,
              animationPlayState: paused ? 'paused' : 'running',
              '@keyframes toast-countdown': {
                from: { transform: 'scaleX(1)' },
                to: { transform: 'scaleX(0)' },
              },
            }}
          />
        )}
      </Box>
    </Collapse>
  );
}
