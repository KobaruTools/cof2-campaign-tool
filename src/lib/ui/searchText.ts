/**
 * NORMALISATION DU TEXTE DE RECHERCHE — part PURE, partagée par les recherches plein texte de l'app.
 *
 * Une recherche doit être indulgente sur la façon d'écrire le français : le joueur tape « manoeuvre »,
 * « elan » ou « ca » et doit retrouver « Manœuvres », « Élan », « ça ». On ramène donc les deux côtés
 * (l'index et la saisie) à une forme commune, sans accents ni ligatures, en minuscules.
 *
 * DEUX MÉCANIQUES DISTINCTES, et c'est là qu'on se fait avoir :
 *
 *  1. Les LETTRES ACCENTUÉES se décomposent en Unicode : `é` → `e` + accent aigu combinant. Il suffit
 *     de normaliser en NFD puis de retirer la plage des diacritiques combinants (U+0300–U+036F). Ça
 *     couvre é/è/ê/ë, à/â, î/ï, ô, ù/û/ü, ÿ… et aussi le **ç**, qui est bien `c` + cédille combinante.
 *
 *  2. Les LIGATURES `œ` et `æ` ne se décomposent PAS — ni en NFD, ni même en NFKD. Unicode les traite
 *     comme des lettres à part entière, pas comme des ligatures typographiques (contrairement à `ﬁ`
 *     ou `ﬂ`, que NFKD sépare bien). C'est exactement ce qui empêchait de trouver « Manœuvres » en
 *     tapant « manoeuvre ». Il faut donc les rabattre à la main.
 *
 * D'où l'ordre ci-dessous : ligatures d'abord (sur le texte d'origine), puis NFD et retrait des
 * diacritiques. On passe par NFKD plutôt que NFD pour récupérer au passage les vraies ligatures
 * typographiques et les formes de compatibilité que peut charrier un texte issu d'un PDF.
 */

/** Diacritiques combinants laissés par la décomposition (accents, cédille, tréma…). */
const COMBINING_MARKS = /[̀-ͯ]/g;

/**
 * Ligatures que la normalisation Unicode NE défait PAS, à rabattre explicitement. La casse est
 * traitée avant le passage en minuscules pour rester lisible ici.
 */
const LIGATURES: [RegExp, string][] = [
  [/œ/g, 'oe'],
  [/Œ/g, 'OE'],
  [/æ/g, 'ae'],
  [/Æ/g, 'AE'],
];

/**
 * Forme comparable d'un texte : sans accents, sans ligatures, en minuscules. À appliquer des DEUX
 * côtés — sur l'index comme sur la saisie — sinon la comparaison est bancale dans un sens.
 */
export function normalizeSearchText(input: string): string {
  let out = input;
  for (const [pattern, replacement] of LIGATURES) out = out.replace(pattern, replacement);
  return out.normalize('NFKD').replace(COMBINING_MARKS, '').toLowerCase();
}
