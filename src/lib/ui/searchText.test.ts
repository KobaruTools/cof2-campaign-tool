import { describe, expect, it } from 'vitest';
import { REFERENCE_ENTRIES } from '@/data/reference';
import { normalizeSearchText } from './searchText';

describe('normalisation du texte de recherche (français)', () => {
  it('retire les accents, y compris la cédille', () => {
    expect(normalizeSearchText('Élan')).toBe('elan');
    expect(normalizeSearchText('ça')).toBe('ca');
    expect(normalizeSearchText('Dégâts & critiques')).toBe('degats & critiques');
    expect(normalizeSearchText('naïf où être')).toBe('naif ou etre');
  });

  /**
   * LE cas qui a motivé ce module : `œ` n'est décomposé ni par NFD ni par NFKD (Unicode en fait une
   * lettre, pas une ligature typographique). Taper « manoeuvre » ne trouvait donc pas « Manœuvres ».
   */
  it('rabat les ligatures œ et æ, que Unicode ne décompose pas', () => {
    expect(normalizeSearchText('Manœuvres')).toBe('manoeuvres');
    expect(normalizeSearchText('cœur')).toBe('coeur');
    expect(normalizeSearchText('Æther')).toBe('aether');
    expect(normalizeSearchText('nævus')).toBe('naevus');
  });

  it('est idempotente et rend une saisie déjà simple inchangée', () => {
    expect(normalizeSearchText(normalizeSearchText('Manœuvres'))).toBe('manoeuvres');
    expect(normalizeSearchText('manoeuvre')).toBe('manoeuvre');
    expect(normalizeSearchText('')).toBe('');
  });

  it('fait correspondre les deux graphies dans les deux sens', () => {
    // Que le joueur tape la ligature ou les deux lettres, il tombe sur la même forme.
    expect(normalizeSearchText('manœuvre')).toBe(normalizeSearchText('manoeuvre'));
    expect(normalizeSearchText('MANŒUVRE')).toBe(normalizeSearchText('Manoeuvre'));
  });

  /** Garde-fou de bout en bout : la recherche naïve « manoeuvre » doit atteindre le vrai contenu. */
  it('permet de trouver les manœuvres du référentiel en tapant « manoeuvre »', () => {
    const needle = normalizeSearchText('manoeuvre');
    const hits = REFERENCE_ENTRIES.filter((e) =>
      normalizeSearchText([e.title, ...e.tags].join(' ')).includes(needle),
    );
    expect(hits.length).toBeGreaterThan(0);
  });
});
