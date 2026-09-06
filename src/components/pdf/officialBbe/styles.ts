/**
 * Palette et styles partagés du format « Fiche officielle (BBE) » (PER-202) — mesurée
 * directement (pipette de pixels) sur la trame papier de référence
 * (`pdf-payants/feuille-pj.pdf`, gitignoré, jamais servi) : or `#AC8A3C` pour tous les
 * éléments structurels (bandeaux, bordures, cadre), gris neutre `#CFD0D0` pour les champs
 * secondaires/vierges, encre quasi noire pour les cases à cocher. Formes ORIGINALES (pas
 * d'image extraite du PDF source, cf. plan PER-202) — seules les COULEURS et PROPORTIONS
 * sont reprises. Séparé de `campaignEditor/styles.ts` car l'esthétique est fixe (dorée) et
 * n'emprunte pas la couleur d'accent par profil.
 */
import { StyleSheet } from '@react-pdf/renderer';
import '@/components/pdf/registerFonts';

export const GOLD = '#AC8A3C';
export const GRAY_BORDER = '#CFD0D0';
export const INK = '#241d10';
export const CHECKBOX_BORDER = '#3a3a3a';

/** Page Lettre US (612×792 pt) — taille réelle de la trame de référence, PAS A4. */
export const PAGE_WIDTH = 612;
export const PAGE_HEIGHT = 792;

/** Marge extérieure du cadre décoratif (`DecorativeFrame`) : le contenu commence après. */
export const FRAME_MARGIN = 18;
export const CONTENT_PADDING = 12;
export const PAGE_INSET = FRAME_MARGIN + CONTENT_PADDING;

export const styles = StyleSheet.create({
  // Pas de padding ici : `DecorativeFrame` gère lui-même l'inset (la bordure doit être dessinée
  // aux coordonnées PLEINE PAGE, un padding sur `Page` la ferait clipper — cf. PER-202).
  page: {
    fontFamily: 'Roboto',
    fontSize: 8,
    color: INK,
  },
  row: { flexDirection: 'row' },
  col: { flexDirection: 'column' },

  band: {
    backgroundColor: GOLD,
    color: '#fff',
    fontWeight: 700,
    fontSize: 8.5,
    paddingVertical: 3,
    paddingHorizontal: 6,
    textTransform: 'uppercase',
  },
  bandSmall: {
    backgroundColor: GOLD,
    color: '#fff',
    fontWeight: 700,
    fontSize: 6.5,
    paddingVertical: 2,
    paddingHorizontal: 4,
    textTransform: 'uppercase',
    textAlign: 'center',
  },

  labelLine: {
    fontSize: 6.5,
    fontWeight: 700,
    color: GOLD,
    textTransform: 'uppercase',
    marginBottom: 1,
  },
  blankLine: {
    borderBottomWidth: 0.75,
    borderBottomColor: GOLD,
    minHeight: 11,
    marginBottom: 5,
  },

  bordered: {
    borderWidth: 1,
    borderColor: GOLD,
  },

  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    minHeight: 20,
    paddingVertical: 2,
    paddingHorizontal: 3,
    borderBottomWidth: 0.5,
    borderBottomColor: GRAY_BORDER,
  },
  checkbox: {
    width: 6,
    height: 6,
    borderWidth: 0.75,
    borderColor: CHECKBOX_BORDER,
    marginRight: 3,
    marginTop: 1.5,
  },
  rankLabel: {
    fontSize: 7,
    fontWeight: 700,
    marginRight: 3,
  },
  rankValue: {
    fontSize: 7,
  },
  rankValueEmpty: {
    fontSize: 7,
    color: GRAY_BORDER,
  },

  diamondPips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginVertical: 3,
  },

  placeholderText: {
    fontSize: 6.5,
    color: '#9a9a9a',
  },

  logoLine1: { fontFamily: 'Cinzel', fontSize: 19, fontWeight: 700, color: GOLD, lineHeight: 1.05 },
  logoLine2: { fontSize: 8, fontWeight: 700, color: GOLD, letterSpacing: 3 },
  identityHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  characterNameBox: { marginLeft: 10, marginVertical: 2 },
  characterNameText: { fontSize: 13, fontWeight: 700, color: INK, textAlign: 'center' },
  levelBox: { width: 34, height: 26, borderWidth: 1, borderColor: GOLD, alignItems: 'center', justifyContent: 'center', marginLeft: 6 },
  levelValue: { fontSize: 11, fontWeight: 700 },

  abilityRow: { flexDirection: 'row', marginBottom: 4 },
  abilityLabelBox: {
    width: 34,
    backgroundColor: GOLD,
    color: '#fff',
    fontSize: 8,
    fontWeight: 700,
    textAlign: 'center',
    paddingVertical: 4,
  },
  abilityValueBox: {
    width: 30,
    borderWidth: 1,
    borderColor: GOLD,
    textAlign: 'center',
    paddingVertical: 4,
    fontSize: 9,
    fontWeight: 700,
    marginLeft: 3,
  },
  abilityNotesBox: {
    flexGrow: 1,
    flexBasis: 0,
    borderWidth: 0.75,
    borderColor: GRAY_BORDER,
    marginLeft: 3,
  },

  statPairBox: { borderWidth: 1, borderColor: GOLD, marginBottom: 6 },
  statPairValue: { fontSize: 11, fontWeight: 700, textAlign: 'center', paddingVertical: 5 },

  attackTableRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  attackLabelBox: { width: 44, backgroundColor: GOLD, color: '#fff', fontSize: 7, fontWeight: 700, textAlign: 'center', paddingVertical: 3 },
  attackTotalBox: { width: 46, borderWidth: 1, borderColor: GOLD, textAlign: 'center', paddingVertical: 3, fontSize: 7, marginLeft: 3 },
  attackSubBox: { width: 24, borderWidth: 0.75, borderColor: GRAY_BORDER, textAlign: 'center', paddingVertical: 3, fontSize: 6, marginLeft: 3 },

  weaponRow: { marginBottom: 3 },
  weaponNameCell: { flexGrow: 1, flexBasis: 0, borderWidth: 1, borderColor: GOLD, paddingVertical: 3, paddingHorizontal: 3, fontSize: 7.5 },
  weaponAttackCell: { width: 52, borderWidth: 1, borderColor: GOLD, paddingVertical: 3, textAlign: 'center', fontSize: 7 },
  weaponDmCell: { width: 44, borderWidth: 1, borderColor: GOLD, paddingVertical: 3, textAlign: 'center', fontSize: 7 },
});
