/**
 * Rangée de pastilles en losange (PER-202) — équivalent décoratif des cases à cocher
 * « points de chance » / « dés de récupération » de la trame BBE. Purement ornemental :
 * le nombre affiché reste la valeur numérique dans la case MAX à côté, ces pastilles ne
 * suivent pas un état de jeu courant (pas de « dépensé » — hors périmètre, cf. plan PER-201).
 */
import { Svg, Polygon } from '@react-pdf/renderer';
import { GOLD } from './styles';

const SIZE = 8;
const R = 3.5;

function diamond(cx: number, cy: number, r: number) {
  return `${cx},${cy - r} ${cx + r},${cy} ${cx},${cy + r} ${cx - r},${cy}`;
}

/** Affiche jusqu'à `Math.min(count, max)` losanges (évite un ruban interminable si la valeur est élevée). */
export function DiamondPips({ count, max = 10, perRow = 5 }: { count: number; max?: number; perRow?: number }) {
  const shown = Math.max(0, Math.min(count, max));
  const rows = Math.ceil(shown / perRow) || 1;
  // Une seule rangée (cas courant : chance/récup dépassent rarement 5) : la largeur du SVG suit
  // le nombre réel de pastilles, pour que le `alignItems: 'center'` du parent centre le groupe —
  // sinon les pastilles restent tassées à gauche d'un SVG toujours large de `perRow` colonnes.
  const width = rows > 1 ? perRow * SIZE : Math.max(shown, 1) * SIZE;
  const height = rows * SIZE;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {Array.from({ length: shown }, (_, i) => {
        const col = i % perRow;
        const row = Math.floor(i / perRow);
        const cx = col * SIZE + SIZE / 2;
        const cy = row * SIZE + SIZE / 2;
        return <Polygon key={i} points={diamond(cx, cy, R)} stroke={GOLD} strokeWidth={0.75} fill="none" />;
      })}
    </Svg>
  );
}
