/**
 * Glossaire des MOTS-CLÉS D'EFFET récurrents des riders d'attaque du bestiaire (« + régénération »,
 * etc.) qui ne correspondent PAS à une capacité du même nom sur la créature — le livre nomme parfois
 * le mécanisme autrement (l'âme damnée « régénère » via sa capacité « Toucher nécrotique »). Ces
 * mots-clés reçoivent un chip + une info-bulle GÉNÉRIQUE (sans chiffres, qui varient d'une créature à
 * l'autre) ; les modalités exactes restent dans le bloc de la créature. Distinct :
 *   - d'une capacité de la créature (chip violet + surlignage de sa carte, cf. BestiaryStatBlock) ;
 *   - d'un état préjudiciable du glossaire général (chip rouge, cf. FeatureRichText/glossary).
 *
 * La `key` est déjà NORMALISÉE (minuscules, sans accents ni espaces superflus) pour un rapprochement
 * direct avec `normalizeAbilityKey` de BestiaryStatBlock.
 */
export interface RiderKeyword {
  /** Clé normalisée (ex. 'regeneration') pour le rapprochement. */
  key: string;
  /** Libellé affiché par défaut si le rider n'en donne pas un (casse d'origine conservée sinon). */
  label: string;
  /** Explication générique, valable pour toutes les créatures (aucun chiffre spécifique). */
  explanation: string;
}

const ENTRIES: RiderKeyword[] = [
  {
    key: 'regeneration',
    label: 'Régénération',
    explanation:
      'La créature récupère des points de vie au cours du combat. Les modalités exactes ' +
      '(montant, fréquence, et ce qui l’empêche — souvent le feu ou l’acide) figurent dans son ' +
      'bloc de capacités.',
  },
];

export const riderKeywordByKey = new Map<string, RiderKeyword>(ENTRIES.map((e) => [e.key, e]));

/** Cherche un mot-clé d'effet récurrent par sa clé déjà normalisée. */
export function lookupRiderKeyword(normalizedKey: string): RiderKeyword | undefined {
  return riderKeywordByKey.get(normalizedKey);
}
