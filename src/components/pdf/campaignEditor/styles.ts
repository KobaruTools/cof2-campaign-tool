/**
 * Feuille de styles partagée du PDF « Campaign Editor » (PER-201) — `@react-pdf/renderer`
 * n'accepte qu'un sous-ensemble de CSS (flexbox, pas de grid) ; regroupée ici pour que
 * les sections restent de simples arrangements de `View`/`Text`.
 */
import { StyleSheet } from '@react-pdf/renderer';
import '@/components/pdf/registerFonts';

/** Couleur d'accent par défaut quand le profil du personnage n'en fournit pas une (`classColor`). */
export const DEFAULT_ACCENT = '#90a4ae';

export const styles = StyleSheet.create({
  page: {
    fontFamily: 'Roboto',
    fontSize: 9,
    color: '#1a1a1a',
    padding: 28,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: 700,
    color: '#fff',
    backgroundColor: DEFAULT_ACCENT,
    paddingVertical: 3,
    paddingHorizontal: 6,
    marginBottom: 6,
  },
  row: {
    flexDirection: 'row',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: '#1a1a1a',
    paddingBottom: 6,
  },
  characterName: {
    fontSize: 18,
    fontWeight: 700,
  },
  identitySubtitle: {
    fontSize: 10,
    color: '#444',
    marginTop: 2,
  },
  levelBadge: {
    fontSize: 12,
    fontWeight: 700,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  statBox: {
    width: '14.2%',
    borderWidth: 1,
    borderColor: '#999',
    padding: 4,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 7,
    color: '#555',
  },
  statValue: {
    fontSize: 13,
    fontWeight: 700,
  },
  table: {
    marginBottom: 10,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    paddingVertical: 3,
  },
  tableCellName: {
    flexGrow: 1,
    flexBasis: 0,
  },
  tableCellValue: {
    width: 70,
    textAlign: 'right',
  },
  pathBlock: {
    marginBottom: 10,
  },
  pathTitle: {
    fontSize: 10,
    fontWeight: 700,
    marginBottom: 3,
    paddingBottom: 2,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  rankRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  rankBadge: {
    width: 34,
    fontSize: 8,
    fontWeight: 700,
    color: '#555',
  },
  rankBody: {
    flexGrow: 1,
    flexBasis: 0,
  },
  rankName: {
    fontSize: 9,
    fontWeight: 700,
    marginBottom: 1,
  },
  rankText: {
    fontSize: 8.5,
    lineHeight: 1.35,
  },
  equipmentLine: {
    fontSize: 8.5,
    marginBottom: 1,
  },
  description: {
    fontSize: 8.5,
    lineHeight: 1.35,
    marginBottom: 10,
  },
});
