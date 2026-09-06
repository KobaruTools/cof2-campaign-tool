/**
 * Page 2 de la « Fiche officielle (BBE) » (PER-202) : description libre + grille des 6 voies
 * de profil/prestige. Positionnement ABSOLU en coordonnées mesurées sur la trame de référence
 * (`layout.ts`) — cf. Page1.tsx pour la justification.
 */
import { Text, View } from '@react-pdf/renderer';
import type { CampaignEditorPdfData, PdfPathGroup } from '@/lib/character/pdfExport/buildCharacterPdfData';
import type { BbeSlots } from '@/lib/character/pdfExport/mapPathsToBbeSlots';
import { RankRowsAbsolute } from './RankRowsAbsolute';
import { TitleBandValue } from './TitleBandValue';
import { GOLD } from './styles';
import { PAGE2 } from './layout';

const COLS = (L: typeof PAGE2) => [
  { x: L.grid.col1X, w: L.grid.col1W },
  { x: L.grid.col2X, w: L.grid.col2W },
  { x: L.grid.col3X, w: L.grid.col3W },
];

function GridCell({
  x,
  bandY,
  rowStartY,
  w,
  rowH,
  checkboxSize,
  title,
  group,
}: {
  x: number;
  bandY: number;
  rowStartY: number;
  w: number;
  rowH: number;
  checkboxSize: number;
  title: string;
  group: PdfPathGroup | null;
}) {
  return (
    <>
      <TitleBandValue x={x} y={bandY} w={w} h={rowStartY - bandY + 1} label={title} value={group?.title ?? ''} />
      <View style={{ position: 'absolute', left: x, top: rowStartY, width: w, height: rowH * 5, borderWidth: 1, borderColor: GOLD, borderTopWidth: 0 }} />
      <RankRowsAbsolute x={x} firstRowY={rowStartY} width={w} rowH={rowH} checkboxSize={checkboxSize} group={group} />
    </>
  );
}

export function Page2({ identity, slots }: { identity: CampaignEditorPdfData['identity']; slots: BbeSlots }) {
  const L = PAGE2;
  const cols = COLS(L);
  const [voie1, voie2, voie3, voie4, voie5] = slots.classPaths;
  const group1 = [voie1 ?? null, voie2 ?? null, voie3 ?? null];
  const group2 = [voie4 ?? null, voie5 ?? null, slots.prestigePath];
  const titles1 = ['Voie 1', 'Voie 2', 'Voie 3'];
  const titles2 = ['Voie 4', 'Voie 5', 'Prestige'];

  return (
    <View style={{ flexGrow: 1 }}>
      <View style={{ position: 'absolute', left: L.description.x, top: L.description.y, width: L.description.w, height: L.description.bandH, backgroundColor: GOLD, justifyContent: 'center', paddingHorizontal: 6 }}>
        <Text style={{ color: '#fff', fontWeight: 700, fontSize: 8.5, textTransform: 'uppercase' }}>Description du personnage</Text>
      </View>
      <View
        style={{
          position: 'absolute',
          left: L.description.x,
          top: L.description.boxY,
          width: L.description.w,
          height: L.description.boxH,
          borderWidth: 1,
          borderColor: GOLD,
          padding: 5,
          // `overflow:'hidden'` : une description très longue (texte libre, pas de plafond
          // côté modèle `Character`) tronque proprement dans la boîte plutôt que de déborder
          // sur la grille des voies juste en dessous, positionnée en absolu (PER-202).
          overflow: 'hidden',
        }}
      >
        <Text style={{ fontSize: 7.5, lineHeight: 1.3 }}>{identity.description ?? '—'}</Text>
      </View>

      {cols.map((c, i) => (
        <GridCell
          key={i}
          x={c.x}
          w={c.w}
          bandY={L.grid.group1BandY}
          rowStartY={L.grid.group1FirstRowY}
          rowH={L.grid.rowH}
          checkboxSize={L.grid.checkboxSize}
          title={titles1[i]}
          group={group1[i]}
        />
      ))}
      {cols.map((c, i) => (
        <GridCell
          key={i}
          x={c.x}
          w={c.w}
          bandY={L.grid.group2BandY}
          rowStartY={L.grid.group2FirstRowY}
          rowH={L.grid.rowH}
          checkboxSize={L.grid.checkboxSize}
          title={titles2[i]}
          group={group2[i]}
        />
      ))}
    </View>
  );
}
