'use client';

import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import type { SxProps, Theme } from '@mui/material/styles';
import { AppTooltip } from '@/components/AppTooltip';

export interface InfoHintProps {
  /** Corps de l'infobulle : conseil ou texte de règle (chaîne ou nœud React). */
  children: React.ReactNode;
  /** Numéro de page citée en source (cf. `SourceRef`) ; nombre ou plage (« 219-220 »). */
  page?: number | string;
  /** Section ou titre de paragraphe cité en source (cf. `SourceRef`). */
  section?: string;
  /** Taille de l'icône « i ». Par défaut `small`. */
  fontSize?: 'inherit' | 'small' | 'medium' | 'large';
  /** Classe CSS posée sur l'icône — permet à un parent de la cibler (ex. révélation au survol). */
  className?: string;
  /** Délai (ms) avant apparition de l'infobulle au survol (cf. `AppTooltip.enterDelay`). */
  enterDelay?: number;
  /** Style additionnel fusionné par-dessus le style de l'icône. */
  sx?: SxProps<Theme>;
}

/**
 * Icône « i » informative : affiche au survol un texte d'aide (conseil de jeu,
 * extrait de règle…), avec une citation de source optionnelle. Réutilisable
 * partout où une explication doit rester discrète et accessible à la demande.
 * Simple déclencheur (icône) au-dessus d'`AppTooltip`, qui porte le look et le
 * motif « contenu + source ».
 */
export function InfoHint({ children, page, section, fontSize = 'small', className, enterDelay, sx }: InfoHintProps) {
  return (
    <AppTooltip title={children} page={page} section={section} enterDelay={enterDelay}>
      <InfoOutlinedIcon
        fontSize={fontSize}
        className={className}
        sx={{ color: 'text.secondary', cursor: 'help', ...sx }}
      />
    </AppTooltip>
  );
}
