/**
 * 5 lignes « ☐ Rang N : nom » positionnées en ABSOLU (PER-202) — cases à cocher + nom de rang
 * SEULEMENT (pas le texte de règle complet, décision propriétaire), à l'intérieur d'un bloc
 * dont la géométrie (position/largeur/hauteur de ligne) est mesurée sur la trame de référence
 * (cf. `layout.ts`). Partagé entre « Voie du peuple » (page 1) et les 6 cases de la grille
 * (page 2), dont seule la géométrie diffère.
 */
import { Text, View } from '@react-pdf/renderer';
import type { PdfPathGroup } from '@/lib/character/pdfExport/buildCharacterPdfData';
import { GOLD, GRAY_BORDER, CHECKBOX_BORDER } from './styles';

const DEFAULT_RANKS = [1, 2, 3, 4, 5];

export function RankRowsAbsolute({
  x,
  firstRowY,
  width,
  rowH,
  checkboxSize,
  group,
}: {
  x: number;
  firstRowY: number;
  width: number;
  rowH: number;
  checkboxSize: number;
  group: PdfPathGroup | null;
}) {
  const byRank = new Map(group?.ranks.map((r) => [r.rank, r.name]));
  // Les rangs affichés ne sont PAS toujours 1-5 : une voie de prestige numérote les siens
  // 4-8 (parfois 3-7) — cf. `PdfPathGroup.rankLabels`. Rembourré à 5 entrées par sécurité
  // (aucune voie du catalogue n'en a moins), sans jamais en afficher plus (la case n'a que
  // 5 lignes) : si un jour une voie en avait davantage, les dernières seraient tronquées —
  // même esprit pragmatique que les autres simplifications documentées dans
  // `buildCharacterPdfData.ts`.
  const rankNumbers = (group?.rankLabels.length ? group.rankLabels : DEFAULT_RANKS).slice(0, 5);
  return (
    <>
      {rankNumbers.map((rank, i) => {
        const name = byRank.get(rank);
        const top = firstRowY + i * rowH;
        return (
          <View
            key={rank}
            style={{
              position: 'absolute',
              left: x,
              top,
              width,
              height: rowH,
              flexDirection: 'row',
              alignItems: 'flex-start',
              paddingTop: 4,
              paddingHorizontal: 6,
              borderBottomWidth: i < 4 ? 0.5 : 0,
              borderBottomColor: GRAY_BORDER,
            }}
          >
            <View
              style={{
                width: checkboxSize,
                height: checkboxSize,
                borderWidth: 1,
                borderColor: CHECKBOX_BORDER,
                backgroundColor: name ? GOLD : undefined,
                marginRight: 5,
                marginTop: 1,
              }}
            />
            <Text style={{ fontSize: 8, fontWeight: 700, marginRight: 4 }}>Rang {rank} :</Text>
            {/* `flexGrow`+`flexBasis:0` sur la View, PAS directement sur le Text : sinon
                @react-pdf/renderer peut figer le retour à la ligne sur une mesure non
                contrainte (bug constaté PER-202). */}
            <View style={{ flexGrow: 1, flexBasis: 0 }}>
              <Text style={{ fontSize: 8, color: name ? undefined : GRAY_BORDER }}>{name ?? '—'}</Text>
            </View>
          </View>
        );
      })}
    </>
  );
}
