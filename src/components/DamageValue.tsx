import { Fragment } from 'react';
import Box from '@mui/material/Box';
import type { SxProps, Theme } from '@mui/material/styles';
import type { Die } from '@/data/schema';
import { DIE_ICON_PATHS } from '@/lib/ui/diceIcons';
import { DieIcon } from '@/components/DieIcon';

export interface DamageValueProps {
  /**
   * Notation de DM du livre (ex. « 1d6 », « 2d6 », « 5d4° + INT », « 1d3 »).
   * Les tokens de dé connus (`d4`…`d20`) sont rendus via <DieIcon> ; le marqueur
   * « ° » signale un dé évolutif (p. 43) ; le reste (nombre de dés, modificateurs,
   * dés inconnus comme « d3 », parenthèses) est laissé tel quel en texte.
   */
  damage: string;
  /** Taille de l'icône de dé en pixels. Défaut 18 (accordé au texte `caption`). */
  size?: number;
  sx?: SxProps<Theme>;
}

/**
 * Rend une notation de DM en remplaçant chaque dé connu par son icône (avec
 * info-bulle), tout en préservant le nombre de dés et les modificateurs en
 * texte. Composant d'affichage commun pour toute valeur de dommages.
 */
export function DamageValue({ damage, size = 18, sx }: DamageValueProps) {
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;

  // Token de dé : nombre optionnel, faces, marqueur évolutif optionnel.
  for (const match of damage.matchAll(/(\d*)d(\d+)(°?)/g)) {
    const [token, count, faces, marker] = match;
    const index = match.index;
    const die = `d${faces}` as Die;

    // Dé inconnu (ex. « d3 ») : on laisse le token brut dans le texte qui suit.
    if (!DIE_ICON_PATHS[die]) continue;

    // Texte entre le dé précédent et celui-ci (nombre exclu, géré à part).
    const between = damage.slice(lastIndex, index);
    if (between) nodes.push(<Fragment key={`t${index}`}>{between}</Fragment>);

    nodes.push(
      <Box
        key={`d${index}`}
        component="span"
        sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.25 }}
      >
        {count && count !== '1' ? count : null}
        <DieIcon die={die} size={size} evolving={marker === '°'} />
      </Box>,
    );
    lastIndex = index + token.length;
  }

  const tail = damage.slice(lastIndex);
  if (tail) nodes.push(<Fragment key="tail">{tail}</Fragment>);

  return (
    <Box
      component="span"
      sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.25, verticalAlign: 'middle', ...sx }}
    >
      {nodes}
    </Box>
  );
}
