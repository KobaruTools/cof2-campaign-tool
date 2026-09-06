/**
 * Bandeau de titre à valeur encadrée (« Voie du peuple », « Voie 1 »… « Prestige ») : libellé
 * doré à gauche, boîte blanche encastrée à droite pour le nom réel de la voie — mesuré sur la
 * trame de référence (PER-202). Distinct d'un bandeau simple (« Caractéristiques »,
 * « Équipement »…) qui n'a pas cette boîte.
 */
import { Text, View } from '@react-pdf/renderer';
import { GOLD } from './styles';

export function TitleBandValue({
  x,
  y,
  w,
  h,
  label,
  value,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  value: string;
}) {
  return (
    <View style={{ position: 'absolute', left: x, top: y, width: w, height: h, backgroundColor: GOLD, flexDirection: 'row', alignItems: 'center' }}>
      <Text style={{ color: '#fff', fontWeight: 700, fontSize: 8.5, textTransform: 'uppercase', marginLeft: 6, marginRight: 6 }}>{label} :</Text>
      <View style={{ flexGrow: 1, flexBasis: 0, backgroundColor: '#fff', marginVertical: h * 0.2, marginRight: 6, justifyContent: 'center', paddingHorizontal: 4 }}>
        <Text style={{ fontSize: 8 }}>{value}</Text>
      </View>
    </View>
  );
}
