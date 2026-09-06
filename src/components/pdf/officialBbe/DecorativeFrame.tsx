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
// `FRAME_MARGIN` (18) sert de base commune ; les 2 filets sont ensuite décalés par `inset`
// (mesuré par tracé de pixels sur la trame de référence à 150dpi : filet extérieur à 22.6pt du
// bord, intérieur à 27.8pt — écart ~5.3pt entre les deux, constant sur toute la longueur des
// côtés droits, cf. plan PER-202 pour la méthode). Le chanfrein diffère volontairement entre
// les deux filets (20 vs 9) : c'est cet écart, et non l'inset, qui crée le décroché en "marche
// d'escalier" visible à chaque coin sur l'original (les 2 filets coïncident sur les côtés
// droits mais divergent juste avant le coin).
const OUTER_INSET = 4.6;
const INNER_INSET = 9.9;
const OUTER_CHAMFER = 20;
const INNER_CHAMFER = 9;

/** Rectangle (M..W-M, M..H-M) inset de `inset`, coins coupés à 45° sur `chamfer`. */
function chamferedRectPath(inset: number, chamfer: number): string {
  const x0 = FRAME_MARGIN + inset;
  const y0 = FRAME_MARGIN + inset;
  const x1 = W - FRAME_MARGIN - inset;
  const y1 = H - FRAME_MARGIN - inset;
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

// Repères en losange sur les côtés verticaux : mesurés à 25.4% et 74.1% de la hauteur de page
// (tracé de pixels sur la trame de référence), PAS à 32/68% (valeur estimée v1, imprécise).
const SIDE_MARK_RATIOS = [0.254, 0.741];
const SIDE_MARKS: [number, number][] = [
  [FRAME_MARGIN + OUTER_INSET, H * SIDE_MARK_RATIOS[0]],
  [FRAME_MARGIN + OUTER_INSET, H * SIDE_MARK_RATIOS[1]],
  [W - FRAME_MARGIN - OUTER_INSET, H * SIDE_MARK_RATIOS[0]],
  [W - FRAME_MARGIN - OUTER_INSET, H * SIDE_MARK_RATIOS[1]],
];

export function DecorativeFrame({ children }: { children: React.ReactNode }) {
  return (
    <View style={{ width: W, height: H, position: 'relative' }}>
      <Svg style={{ position: 'absolute', top: 0, left: 0 }} width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        <Path d={chamferedRectPath(OUTER_INSET, OUTER_CHAMFER)} stroke={GOLD} strokeWidth={1.1} fill="none" />
        <Path d={chamferedRectPath(INNER_INSET, INNER_CHAMFER)} stroke={GOLD} strokeWidth={1.1} fill="none" />
        {SIDE_MARKS.map(([cx, cy], i) => (
          <Polygon key={`side-${i}`} points={diamond(cx, cy, 7)} fill={GOLD} />
        ))}
      </Svg>
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>{children}</View>
    </View>
  );
}
