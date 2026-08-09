import type { FeatureChoiceOption, ResistibleDamageType } from './schema';

/**
 * COULEURS DE DRAGON et leur type d'énergie, avec les DÉCLINAISONS FRANÇAISES nécessaires pour
 * réécrire un texte de règle écrit « pour le rouge » dans une autre couleur (PER-74).
 *
 * Le livre autorise EXPLICITEMENT cette déclinaison pour la voie du chevalier dragon (p. 147) :
 * « La voie présentée ci-dessous a été conçue à partir des symboles liés au dragon rouge, mais elle
 * peut évidemment être déclinée pour d'autres couleurs. » La voie est donc écrite en TOKENS
 * (`%of%`, `%toThe%`…) et déclinée à l'affichage contre la couleur du drake retenue au rang 5 de la
 * voie du cavalier (cf. `Feature.elementFromChoice`).
 *
 * La correspondance couleur → énergie est la MÊME que celle d'Ascendance draconique
 * (`prestige-sang-dragon-r4`, p. 131) — source unique, deux voies : le livre de base n'atteste que
 * rouge→feu (Chimère draconique p. 277) et blanc→froid (prêtre kobold p. 284), et dit « etc. » pour
 * le reste ; bleu→foudre, vert→acide, noir→poison viennent de la correspondance officielle CO2
 * (source communautaire, validée par le propriétaire le 2026-07-19, reconfirmée le 2026-08-04).
 *
 * Les champs de déclinaison sont des FORMES FLÉCHIES, pas des gabarits : le français ne se dérive
 * pas d'un nom nu (« de feu » mais « d'acide », « au froid » mais « à la foudre »), et le verbe
 * d'embrasement de l'épée n'a pas d'équivalent morphologique dans les autres éléments (on n'« acidifie »
 * pas une épée). Chaque forme est donc écrite à la main, une fois.
 */
export interface DragonElement {
  /** Type de dégâts moteur — AUSSI l'id de l'option de couleur (clé persistée dans `featureChoices`). */
  id: ResistibleDamageType;
  /** Couleur du dragon (« rouge »), pour les libellés d'option et le nom de la créature. */
  color: string;
  /** Nom NU de l'élément : « feu », « froid », « foudre », « acide », « poison ». */
  noun: string;
  /** Complément de matière : « de feu », « d'acide » — « il inflige des DM %of% ». */
  of: string;
  /** Datif : « au feu », « à la foudre » — « Résistance %toThe% ». */
  toThe: string;
  /** Nom DÉFINI : « le feu », « la foudre » — « une réduction des DM contre %theNoun% de 10 ». */
  theNoun: string;
  /** Adjectif du SOUFFLE, masculin : « enflammé », « glacial » — « Souffle %breathAdj% ». */
  breathAdj: string;
  /** Groupe verbal du souffle du drake : « cracher du feu », « souffler un jet de froid ». */
  breathPhrase: string;
  /** Adjectif de l'ÉPÉE, accordé au FÉMININ : « enflammée », « glacée » — « épée %swordAdj% ». */
  swordAdj: string;
  /** Groupe verbal d'activation de l'épée : « enflammer son épée », « enduire son épée d'acide ». */
  swordVerbPhrase: string;
  /**
   * NATURE PRIMORDIALE correspondante (PER-74, voie de l'élémentaliste, p. 157) : le livre y écrit
   * DEUX vocabulaires distincts pour les mêmes 4 énergies — l'« élément de prédilection » (feu/
   * froid/électricité/acide, ce que porte `noun`/`of` ci-dessus) et les 4 éléments PRIMORDIAUX de
   * l'élémentaire invoqué/de la forme élémentaire (Feu/Eau/Air/Terre). Mapping déduit des immunités
   * du tableau r6 et confirmé par le propriétaire (2026-08-09) : feu→Feu, froid→Terre,
   * électricité→Air, acide→Eau. Nom NU capitalisé (« Terre »).
   */
  primordialNoun: string;
  /** Complément de matière PRIMORDIAL : « de terre », « d'air » — « invoque un élémentaire %primordialOf%. » */
  primordialOf: string;
}

/**
 * Les cinq couleurs de dragon chromatique de CO2, dans l'ordre d'Ascendance draconique
 * (rouge d'abord : c'est la couleur dans laquelle le livre écrit la voie du chevalier dragon).
 */
export const DRAGON_ELEMENTS: readonly DragonElement[] = [
  {
    id: 'fire',
    color: 'rouge',
    noun: 'feu',
    of: 'de feu',
    toThe: 'au feu',
    theNoun: 'le feu',
    breathAdj: 'enflammé',
    breathPhrase: 'cracher du feu',
    swordAdj: 'enflammée',
    swordVerbPhrase: 'enflammer son épée',
    primordialNoun: 'Feu',
    primordialOf: 'de feu',
  },
  {
    id: 'cold',
    color: 'blanc',
    noun: 'froid',
    of: 'de froid',
    toThe: 'au froid',
    theNoun: 'le froid',
    breathAdj: 'glacial',
    breathPhrase: 'souffler un jet de froid',
    swordAdj: 'glacée',
    swordVerbPhrase: 'givrer son épée',
    primordialNoun: 'Terre',
    primordialOf: 'de terre',
  },
  {
    id: 'lightning',
    color: 'bleu',
    noun: 'foudre',
    of: 'de foudre',
    toThe: 'à la foudre',
    theNoun: 'la foudre',
    breathAdj: 'électrique',
    breathPhrase: 'cracher un arc de foudre',
    swordAdj: 'électrifiée',
    swordVerbPhrase: 'électrifier son épée',
    primordialNoun: 'Air',
    primordialOf: "d'air",
  },
  {
    id: 'acid',
    color: 'vert',
    noun: 'acide',
    of: "d'acide",
    toThe: "à l'acide",
    theNoun: "l'acide",
    breathAdj: 'acide',
    breathPhrase: "cracher de l'acide",
    swordAdj: 'acide',
    swordVerbPhrase: "enduire son épée d'acide",
    primordialNoun: 'Eau',
    primordialOf: "d'eau",
  },
  {
    id: 'poison',
    color: 'noir',
    noun: 'poison',
    of: 'de poison',
    toThe: 'au poison',
    theNoun: 'le poison',
    breathAdj: 'venimeux',
    breathPhrase: 'cracher un nuage de poison',
    swordAdj: 'empoisonnée',
    swordVerbPhrase: 'empoisonner son épée',
    // Pas de nature primordiale (le poison n'est pas l'un des 4 éléments d'air/terre/feu/eau, p. 157) —
    // valeur de repli auto-référentielle, INUTILISÉE en pratique (l'élémentaliste n'offre pas le poison).
    primordialNoun: 'Poison',
    primordialOf: 'de poison',
  },
] as const;

/** Index par id (= type de dégâts) — accès direct depuis une sélection persistée. */
export const dragonElementById = new Map<string, DragonElement>(
  DRAGON_ELEMENTS.map((e) => [e.id, e]),
);

/**
 * Options d'un choix `option` « couleur du drake », générées depuis `DRAGON_ELEMENTS` pour que la
 * liste affichée et la table de déclinaison ne puissent pas diverger. Libellé « Rouge (feu) » :
 * la COULEUR est le sujet du choix (c'est elle que le joueur décrit à la table), l'énergie suit
 * entre parenthèses. Miroir inversé d'Ascendance draconique, où l'énergie est le sujet.
 */
export const dragonColorOptions = (): FeatureChoiceOption[] =>
  DRAGON_ELEMENTS.map((e) => ({
    id: e.id,
    label: `${e.color.charAt(0).toUpperCase()}${e.color.slice(1)} (${e.noun})`,
  }));
