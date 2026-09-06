/**
 * Cadre décoratif de page (PER-202) : double bordure dorée à coins coupés (chanfrein) +
 * pastilles en losange (contour) sur les côtés — en formes vectorielles ORIGINALES
 * (`Svg`/`Path`/`Polygon`), mesurées sur le PDF BBE de référence mais PAS une image extraite
 * (cf. plan : on vise le même style, pas une copie de l'artwork propriétaire).
 *
 * Contrairement à la v1, `children` n'est PLUS inset par `PAGE_INSET` : Page1/Page2
 * positionnent désormais leurs éléments en coordonnées ABSOLUES mesurées directement sur la
 * trame de référence (origine = coin haut-gauche de la page PLEINE, pas de la zone de
 * contenu) — cf. `layout.ts`.
 */
import { Svg, Path, Polygon, View } from '@react-pdf/renderer';
import { FRAME_MARGIN, PAGE_WIDTH, PAGE_HEIGHT, GOLD } from './styles';

const W = PAGE_WIDTH;
const H = PAGE_HEIGHT;
const M = FRAME_MARGIN;
/** Taille du chanfrein (coin coupé à 45°), mesurée sur la trame de référence. */
const CHAMFER = 16;

/** Rectangle (M..W-M, M..H-M) inset de `inset`, coins coupés à 45° sur `chamfer`. */
function chamferedRectPath(inset: number, chamfer: number): string {
  const x0 = M + inset;
  const y0 = M + inset;
  const x1 = W - M - inset;
  const y1 = H - M - inset;
  return [
    `M ${x0 + chamfer} ${y0}`,
    `L ${x1 - chamfer} ${y0}`,
    `L ${x1} ${y0 + chamfer}`,
    `L ${x1} ${y1 - chamfer}`,
    `L ${x1 - chamfer} ${y1}`,
    `L ${x0 + chamfer} ${y1}`,
    `L ${x0} ${y1 - chamfer}`,
    `L ${x0} ${y0 + chamfer}`,
    'Z',
  ].join(' ');
}

/** Petit losange (carré tourné à 45°, contour seul) centré sur (cx, cy). */
function diamond(cx: number, cy: number, r: number) {
  return `${cx},${cy - r} ${cx + r},${cy} ${cx},${cy + r} ${cx - r},${cy}`;
}

const SIDE_MARKS: [number, number][] = [
  [M, H * 0.32],
  [M, H * 0.68],
  [W - M, H * 0.32],
  [W - M, H * 0.68],
];

export function DecorativeFrame({ children }: { children: React.ReactNode }) {
  return (
    <View style={{ width: W, height: H, position: 'relative' }}>
      <Svg style={{ position: 'absolute', top: 0, left: 0 }} width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        <Path d={chamferedRectPath(0, CHAMFER)} stroke={GOLD} strokeWidth={1.3} fill="none" />
        <Path d={chamferedRectPath(5, CHAMFER - 3)} stroke={GOLD} strokeWidth={0.6} fill="none" />
        {SIDE_MARKS.map(([cx, cy], i) => (
          <Polygon key={`side-${i}`} points={diamond(cx, cy, 5)} stroke={GOLD} strokeWidth={0.9} fill="none" />
        ))}
      </Svg>
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>{children}</View>
    </View>
  );
}
