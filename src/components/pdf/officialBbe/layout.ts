/**
 * Coordonnées ABSOLUES (points PDF, origine = coin haut-gauche de la page 612×792) mesurées
 * directement sur `pdf-payants/feuille-pj.pdf` (PER-202) via détection de contours (OpenCV :
 * masque des lignes horizontales/verticales → `cv2.findContours`, conversion px→pt au ratio
 * 72/200 puisque la mesure a été faite sur un rendu à 200 dpi). PAS des valeurs esthétiques :
 * chaque nombre correspond à une case réelle du PDF de référence (gitignoré, jamais servi).
 * Cf. plan PER-202 pour la méthode et sa justification (reproduction fidèle sans embarquer
 * l'asset source).
 */

export const PAGE1 = {
  header: {
    logoX: 51,
    // Le filet supérieur du cadre passe à y≈22.6 (FRAME_MARGIN + OUTER_INSET, cf.
    // DecorativeFrame.tsx) : logoY doit rester nettement en dessous, sous peine de chevaucher
    // le trait (constaté PER-202, le "C" de CHRONIQUES touchait le filet).
    logoY: 34,
    // Bloc nom centré dans l'espace RESTANT à droite du logo (249.1..572.6pt mesuré), pas au
    // centre de la page entière — d'où nameCenterX ≈ (249.1+572.6)/2, pas 306 (=612/2).
    nameCenterX: 411,
    nameWidth: 320,
    // Encadrement du nom : la trame de référence a 2 filets DOUBLES + un losange central de
    // part et d'autre du nom (mesuré par tracé de pixels) — simplifié en 2 filets SIMPLES au
    // rendu (retour visuel PER-202 : la double-barre + losange rendait mal à cette échelle).
    ornamentX: 249,
    ornamentW: 323.6,
    barTopGapY: 35.5,
    barBottomY: 66.2,
    nameTextY: 42,
    captionY: 78.5,
    subtitleY: 90,
    // NIV. : même patron que les lignes de caractéristiques (bande dorée + case blanche), PAS
    // une case empilée label-au-dessus-de-la-valeur (v1, erronée) — mesuré à côté de JOUEUR,
    // PAS dans la colonne stats à droite (où elle chevauchait la case DÉF, bug PER-202 corrigé
    // au passage).
    nivX: 169,
    nivY: 105.1,
    nivLabelW: 31.2,
    nivValueW: 36.5,
    nivH: 29.3,
  },
  caracteristiques: {
    x: 51,
    bandY: 151.6,
    w: 186.8,
    bandH: 20,
    columnHeadersY: 178,
    firstRowY: 197,
    rowH: 37.8,
    labelW: 42,
    valueX: 93,
    valueW: 38,
    notesX: 138,
    notesW: 98,
  },
  voieDuPeuple: {
    x: 250.6,
    y: 104.4,
    w: 205.6,
    bandH: 25.9,
    firstRowY: 130.3,
    rowH: 64.8,
    checkboxSize: 14,
  },
  stats: {
    x: 466.2,
    w: 105.8,
    initX: 466.2,
    initW: 45.7,
    defX: 526.3,
    defW: 46.1,
    initDefY: 105.1,
    initDefH: 49.7,
    vigueurY: 162.7,
    vigueurH: 58.7,
    chanceY: 258,
    chanceH: 46.6,
    recupY: 344,
    recupH: 47.6,
    manaY: 412.6,
    manaH: 49.7,
  },
  bottomLeft: {
    x: 51,
    identityLabelsY: 462,
    identityRowH: 44,
    columnHeadersY: 622,
    attaquesY: 637.2,
    rowH: 34.8,
    labelW: 84.6,
    totalX: 136,
    totalW: 33,
    nivX: 169,
    nivW: 33,
    abilX: 204,
    abilW: 32,
  },
  armes: {
    x: 250.6,
    bandY: 480,
    bandH: 20,
    firstNameY: 493.6,
    nameH: 28.8,
    attackX: 451.4,
    attackW: 71.3,
    dmX: 527,
    dmW: 44.6,
    placeholderH: 24.8,
    rowSpacing: 66.2,
  },
  equipement: {
    x: 250.2,
    bandY: 692.3,
    bandH: 20,
    boxY: 714,
    // boxH=55 amenait le bas de la boîte à 769pt, quasi confondu avec le filet bas du cadre
    // (~769.4pt = H - FRAME_MARGIN - OUTER_INSET) — réduit pour dégager une marge visible.
    boxH: 46,
    w: 321.5,
  },
} as const;

export const PAGE2 = {
  description: { x: 37, y: 30, w: 538, bandH: 16, boxY: 47, boxH: 60 },
  grid: {
    x: 36.4,
    col1X: 38.2,
    col1W: 177.8,
    col2X: 218.2,
    col2W: 177.1,
    col3X: 396.4,
    col3W: 177.8,
    bandH: 16,
    rowH: 58.7,
    group1BandY: 118,
    group1FirstRowY: 138.6,
    group2BandY: 435,
    group2FirstRowY: 456.1,
    checkboxSize: 13,
  },
} as const;
