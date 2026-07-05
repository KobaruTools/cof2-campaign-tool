'use client';

import Alert, { type AlertProps } from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import { alpha, type SxProps, type Theme } from '@mui/material/styles';

type Severity = NonNullable<AlertProps['severity']>;

/**
 * Verre dépoli teinté pour les encadrés d'alerte : fond dérivé de la couleur dédiée
 * à la sévérité (plus foncé, semi-transparent) + flou de l'arrière-plan, même idiome
 * que les sections de la fiche et les infobulles. La bordure et le texte colorés du
 * variant `outlined` restent visibles par-dessus.
 */
const frostedAlertSx = (severity: Severity) => (theme: Theme) => ({
  bgcolor: alpha(theme.palette[severity].dark, 0.22),
  backdropFilter: 'blur(10px)',
  WebkitBackdropFilter: 'blur(10px)',
  // Cadre moins criard : on remplace la bordure vive (`main`) par la variante
  // plus sombre de la sévérité, adoucie.
  borderColor: alpha(theme.palette[severity].dark, 0.6),
});

export interface AppAlertProps extends Omit<AlertProps, 'title'> {
  /** Titre optionnel affiché en gras au-dessus du contenu (habille `AlertTitle`). */
  title?: React.ReactNode;
}

/**
 * Alerte unique de l'application. Habille le `Alert` MUI en appliquant le look
 * « verre dépoli » commun (défini une seule fois ici) au variant `outlined`, qui
 * est le défaut : fond teinté translucide, flou de l'arrière-plan, bordure adoucie.
 * Absorbe aussi le motif « titre + contenu » via la prop `title`. Point d'entrée
 * unique : préférer ce composant à `@mui/material/Alert` partout dans l'app.
 *
 * Les toasts transitoires passent `variant="filled"` (fond opaque haut contraste) :
 * le verre dépoli ne s'applique alors pas.
 */
export function AppAlert({
  severity = 'info',
  variant = 'outlined',
  title,
  children,
  sx,
  ...rest
}: AppAlertProps) {
  const frosted = variant === 'outlined';
  // Le verre dépoli passe en tête pour que le `sx` de l'appelant reste prioritaire.
  const mergedSx: SxProps<Theme> = [
    frosted && frostedAlertSx(severity),
    ...(Array.isArray(sx) ? sx : [sx]),
  ].filter(Boolean) as SxProps<Theme>;
  return (
    <Alert severity={severity} variant={variant} sx={mergedSx} {...rest}>
      {title != null && <AlertTitle>{title}</AlertTitle>}
      {children}
    </Alert>
  );
}
