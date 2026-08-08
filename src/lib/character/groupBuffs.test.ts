import { describe, expect, it } from 'vitest';
import {
  groupBuffFeatureId,
  groupBuffIntensityFor,
  groupBuffsOf,
  isBuffToggleSuperseded,
  supersededBuffToggles,
  unlockedGroupBuffIds,
  withSupersededBuffTogglesOff,
} from './groupBuffs';
import { isEffectActive } from './effects';
import type { Character } from './types';

// Voie du musicien (barde, p. 67) : `musicien-r1` = Chant des héros, `musicien-r5` = rang 5 atteint.
const BARD_R1 = ['musicien-r1'];
const BARD_R5 = ['musicien-r1', 'musicien-r2', 'musicien-r3', 'musicien-r4', 'musicien-r5'];
// Voie de la prière (prêtre, p. 124) : `priere-r1` = Bénédiction.
const PRIEST_R1 = ['priere-r1'];

describe('groupBuffsOf', () => {
  it('reconnaît le Chant des héros porté par musicien-r1', () => {
    expect(groupBuffsOf(BARD_R1)).toEqual([
      { buffId: 'heroes-song', featureId: 'musicien-r1', pathRank: 1, intensity: 1 },
    ]);
  });

  it('au rang 5 de la voie, le palier pré-rempli passe à 2 (« +2 au rang 5 »)', () => {
    expect(groupBuffsOf(BARD_R5)).toEqual([
      { buffId: 'heroes-song', featureId: 'musicien-r1', pathRank: 5, intensity: 2 },
    ]);
  });

  it('c’est le rang ATTEINT dans la voie qui compte, pas le rang de la capacité', () => {
    // Rangs 1 et 3 seulement : le palier reste à +1.
    expect(groupBuffsOf(['musicien-r1', 'musicien-r3'])[0].intensity).toBe(1);
  });

  it('un personnage sans capacité porteuse ne confère aucun buff', () => {
    expect(groupBuffsOf(['guerrier-r1', 'combat-r2'])).toEqual([]);
    expect(groupBuffsOf([])).toEqual([]);
  });

  it('un barde-prêtre porte les deux buffs, dans l’ordre du catalogue', () => {
    expect(groupBuffsOf([...PRIEST_R1, ...BARD_R1]).map((c) => c.buffId)).toEqual([
      'heroes-song',
      'blessing',
    ]);
  });
});

describe('unlockedGroupBuffIds (gating de la palette)', () => {
  it('collecte les buffs de toute la table, dédupliqués, dans l’ordre du catalogue', () => {
    expect(
      unlockedGroupBuffIds([
        { featureIds: PRIEST_R1 },
        { featureIds: BARD_R5 },
        { featureIds: BARD_R1 },
      ]),
    ).toEqual(['heroes-song', 'blessing']);
  });

  it('table sans barde ni prêtre : aucune puce à proposer', () => {
    expect(unlockedGroupBuffIds([{ featureIds: ['guerrier-r1'] }])).toEqual([]);
    expect(unlockedGroupBuffIds([])).toEqual([]);
  });
});

describe('groupBuffIntensityFor (pré-remplissage du palier)', () => {
  it('rend le palier du porteur pour le buff visé', () => {
    expect(groupBuffIntensityFor(BARD_R1, 'heroes-song')).toBe(1);
    expect(groupBuffIntensityFor(BARD_R5, 'heroes-song')).toBe(2);
    expect(groupBuffIntensityFor(PRIEST_R1, 'blessing')).toBe(1);
  });

  it('retombe sur 1 quand le combattant ne porte pas ce buff (créature alliée, autre profil)', () => {
    expect(groupBuffIntensityFor(BARD_R5, 'blessing')).toBe(1);
    expect(groupBuffIntensityFor([], 'heroes-song')).toBe(1);
  });
});

// La fiche du BUFFÉ doit nommer la capacité source avec sa puce de capacité, alors qu'elle ne figure
// pas parmi ses propres capacités — d'où une table inverse indépendante de tout personnage.
describe('groupBuffFeatureId (capacité source, vue depuis la fiche du buffé)', () => {
  it('remonte du buff à la capacité qui le confère', () => {
    expect(groupBuffFeatureId('heroes-song')).toBe('musicien-r1');
    expect(groupBuffFeatureId('blessing')).toBe('priere-r1');
  });

  it('rend undefined pour ce qu’aucune capacité ne confère (état subi, environnement, id inconnu)', () => {
    expect(groupBuffFeatureId('blinded')).toBeUndefined();
    expect(groupBuffFeatureId('aquatic-combat')).toBeUndefined();
    expect(groupBuffFeatureId('nawak')).toBeUndefined();
  });
});

// PER-314 — l'interrupteur de fiche du PORTEUR face au même buff posé en séance par le MJ.
// Chez les deux porteuses, l'effet TEMPORAIRE est à l'index 1 (l'index 0 est le bonus de compétence
// permanent : musique pour le barde, théologie/cosmologie pour le prêtre).
const BUFF_TOGGLE_INDEX = 1;

const mkChar = (featureIds: string[], effectToggles: Record<string, boolean[]> = {}): Character =>
  ({ level: 5, featureIds, effectToggles, featureChoices: {}, usageCounters: {} }) as unknown as Character;

describe('supersededBuffToggles (PER-314)', () => {
  it('le Chant des héros posé en séance supplante l’interrupteur du barde', () => {
    expect(supersededBuffToggles(BARD_R1, ['heroes-song'])).toEqual([
      { featureId: 'musicien-r1', index: BUFF_TOGGLE_INDEX, buffId: 'heroes-song' },
    ]);
  });

  it('la Bénédiction posée en séance supplante l’interrupteur du prêtre', () => {
    expect(supersededBuffToggles(PRIEST_R1, ['blessing'])).toEqual([
      { featureId: 'priere-r1', index: BUFF_TOGGLE_INDEX, buffId: 'blessing' },
    ]);
  });

  it('hors séance (aucun état posé), rien n’est supplanté — l’interrupteur reprend la main', () => {
    expect(supersededBuffToggles(BARD_R1, [])).toEqual([]);
  });

  it('un AUTRE buff posé ne supplante pas l’interrupteur du barde', () => {
    expect(supersededBuffToggles(BARD_R1, ['blessing'])).toEqual([]);
  });

  it('les états SUBIS posés en même temps n’y changent rien (tri par intersection)', () => {
    expect(supersededBuffToggles(BARD_R1, ['weakened', 'heroes-song']).map((t) => t.buffId)).toEqual([
      'heroes-song',
    ]);
  });

  it('un personnage qui ne porte pas le buff n’a aucun interrupteur à neutraliser', () => {
    // Le buff est bien posé sur lui (tout le camp en bénéficie), mais il n'a pas de canal propre.
    expect(supersededBuffToggles(['guerrier-r1'], ['heroes-song'])).toEqual([]);
  });

  it('un barde-prêtre buffé deux fois voit ses DEUX interrupteurs supplantés', () => {
    expect(
      supersededBuffToggles([...BARD_R1, ...PRIEST_R1], ['heroes-song', 'blessing']).map(
        (t) => t.featureId,
      ),
    ).toEqual(['musicien-r1', 'priere-r1']);
  });
});

describe('isBuffToggleSuperseded (grisage de l’interrupteur)', () => {
  it('vise l’effet TEMPORAIRE, pas le bonus de compétence permanent du même rang', () => {
    expect(isBuffToggleSuperseded(BARD_R1, ['heroes-song'], 'musicien-r1', BUFF_TOGGLE_INDEX)).toBe(true);
    expect(isBuffToggleSuperseded(BARD_R1, ['heroes-song'], 'musicien-r1', 0)).toBe(false);
  });

  it('ne grise rien sur une autre capacité, ni hors séance', () => {
    expect(isBuffToggleSuperseded(BARD_R5, ['heroes-song'], 'musicien-r3', 0)).toBe(false);
    expect(isBuffToggleSuperseded(BARD_R1, [], 'musicien-r1', BUFF_TOGGLE_INDEX)).toBe(false);
  });
});

describe('withSupersededBuffTogglesOff (le calcul ne compte le bonus qu’une fois)', () => {
  it('éteint l’interrupteur du barde quand le MJ pose le Chant des héros', () => {
    const bard = mkChar(BARD_R1, { 'musicien-r1': [false, true] });
    expect(isEffectActive(bard, 'musicien-r1', BUFF_TOGGLE_INDEX)).toBe(true);
    const seen = withSupersededBuffTogglesOff(bard, ['heroes-song']);
    expect(isEffectActive(seen, 'musicien-r1', BUFF_TOGGLE_INDEX)).toBe(false);
  });

  it('ne PERSISTE rien : le personnage d’origine garde son interrupteur allumé', () => {
    const toggles = { 'musicien-r1': [false, true] };
    const bard = mkChar(BARD_R1, toggles);
    withSupersededBuffTogglesOff(bard, ['heroes-song']);
    expect(bard.effectToggles).toEqual({ 'musicien-r1': [false, true] });
    expect(toggles['musicien-r1']).toEqual([false, true]);
  });

  it('rend la MÊME référence hors séance (aucun re-calcul en aval)', () => {
    const bard = mkChar(BARD_R1, { 'musicien-r1': [false, true] });
    expect(withSupersededBuffTogglesOff(bard, [])).toBe(bard);
  });

  it('rend la MÊME référence quand l’interrupteur était déjà éteint', () => {
    // Cas courant : le MJ pose le buff, le barde n'avait rien allumé — rien à neutraliser.
    const bard = mkChar(BARD_R1, {});
    expect(withSupersededBuffTogglesOff(bard, ['heroes-song'])).toBe(bard);
  });

  it('laisse intacts les interrupteurs qui ne sont PAS des buffs de groupe', () => {
    // Sanctuaire (priere-r2) est un état temporaire, mais propre au prêtre : la séance ne le porte pas.
    const priest = mkChar(['priere-r1', 'priere-r2'], {
      'priere-r1': [false, true],
      'priere-r2': [true],
    });
    const seen = withSupersededBuffTogglesOff(priest, ['blessing']);
    expect(isEffectActive(seen, 'priere-r1', BUFF_TOGGLE_INDEX)).toBe(false);
    expect(isEffectActive(seen, 'priere-r2', 0)).toBe(true);
  });
});

/* --------------------------------------------------------------------------- *
 * PER-359 — les capacités recensées comme posant un effet CHIFFRÉ sur autrui.
 * Un bloc par capacité ajoutée au catalogue : ce qu'elle débloque, et d'où sort son palier.
 * --------------------------------------------------------------------------- */

describe('PER-359 — capacités qui posent un effet sur les autres', () => {
  it('Sans peur (chevalier, p. 85) : le palier EST le CHA du chevalier', () => {
    expect(groupBuffsOf(['meneur-d-hommes-r1'], { abilities: { CHA: 3 } })).toEqual([
      { buffId: 'fearless-rally', featureId: 'meneur-d-hommes-r1', pathRank: 1, intensity: 3 },
    ]);
    // Sans contexte de lanceur, le palier retombe à 1 plutôt que d'inventer une valeur.
    expect(groupBuffIntensityFor(['meneur-d-hommes-r1'], 'fearless-rally')).toBe(1);
  });

  it('Argument de taille (barbare, p. 79) : le palier EST la FOR du barbare', () => {
    expect(groupBuffIntensityFor(['brute-r1'], 'towering-argument', { abilities: { FOR: 4 } })).toBe(
      4,
    );
  });

  it('un palier lu sur une carac reste borné par le plafond du catalogue', () => {
    // ABILITY_MAX = 5 : une valeur aberrante est ramenée dans les bornes, jamais propagée telle quelle.
    expect(
      groupBuffIntensityFor(['brute-r1'], 'towering-argument', { abilities: { FOR: 99 } }),
    ).toBe(5);
    // Et un lanceur à carac nulle ou négative retombe sur 1, pas sur un buff inversé.
    expect(groupBuffIntensityFor(['brute-r1'], 'towering-argument', { abilities: { FOR: -2 } })).toBe(
      1,
    );
  });

  it('Aura du chef de guerre (p. 161) : le palier suit le NIVEAU, pas le rang de la voie', () => {
    const carrier = ['prestige-mage-de-guerre-r6'];
    expect(groupBuffIntensityFor(carrier, 'warlord-aura', { level: 15 })).toBe(1);
    expect(groupBuffIntensityFor(carrier, 'warlord-aura', { level: 16 })).toBe(2);
    // Le rang 6 de la voie ne suffit PAS : c'est bien le niveau que la règle regarde.
    expect(groupBuffIntensityFor(carrier, 'warlord-aura', {})).toBe(1);
  });

  it('Protéger un allié (guerrier, p. 87) : valeur fixe, donc aucun palier', () => {
    expect(groupBuffIntensityFor(['bouclier-r1'], 'shield-ally', { abilities: { FOR: 5 } })).toBe(1);
  });

  it('chaque buff ajouté est débloqué par sa seule capacité porteuse', () => {
    expect(unlockedGroupBuffIds([{ featureIds: ['meneur-d-hommes-r1'] }])).toEqual([
      'fearless-rally',
    ]);
    expect(unlockedGroupBuffIds([{ featureIds: ['brute-r1'] }])).toEqual(['towering-argument']);
    expect(unlockedGroupBuffIds([{ featureIds: ['bouclier-r1'] }])).toEqual(['shield-ally']);
    expect(unlockedGroupBuffIds([{ featureIds: ['prestige-mage-de-guerre-r6'] }])).toEqual([
      'warlord-aura',
    ]);
  });

  it('la fiche du buffé retrouve la capacité source, qu’elle ne possède pas', () => {
    expect(groupBuffFeatureId('fearless-rally')).toBe('meneur-d-hommes-r1');
    expect(groupBuffFeatureId('towering-argument')).toBe('brute-r1');
    expect(groupBuffFeatureId('shield-ally')).toBe('bouclier-r1');
    expect(groupBuffFeatureId('warlord-aura')).toBe('prestige-mage-de-guerre-r6');
  });
});
