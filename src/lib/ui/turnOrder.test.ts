import { describe, expect, it } from 'vitest';
import { stepTurn, turnDirectionFromKey } from './turnOrder';

/** Ordre d'initiative de référence : quatre combattants, du plus rapide au plus lent. */
const KEYS = ['alix', 'gobelin-1', 'gobelin-2', 'ourse'] as const;

describe('stepTurn', () => {
  it('ne fait rien sans combattant', () => {
    expect(stepTurn({ keys: [], currentKey: null, roundNumber: 1 }, 1)).toBeNull();
    expect(stepTurn({ keys: [], currentKey: 'alix', roundNumber: 3 }, -1)).toBeNull();
  });

  it('avance d\'un cran sans toucher à la manche', () => {
    expect(stepTurn({ keys: KEYS, currentKey: 'alix', roundNumber: 2 }, 1)).toEqual({
      key: 'gobelin-1',
      roundNumber: 2,
    });
  });

  it('recule d\'un cran sans toucher à la manche', () => {
    expect(stepTurn({ keys: KEYS, currentKey: 'gobelin-2', roundNumber: 2 }, -1)).toEqual({
      key: 'gobelin-1',
      roundNumber: 2,
    });
  });

  it('reboucle du dernier au premier en passant à la manche suivante', () => {
    expect(stepTurn({ keys: KEYS, currentKey: 'ourse', roundNumber: 2 }, 1)).toEqual({
      key: 'alix',
      roundNumber: 3,
    });
  });

  it('reboucle du premier au dernier en revenant à la manche précédente', () => {
    expect(stepTurn({ keys: KEYS, currentKey: 'alix', roundNumber: 2 }, -1)).toEqual({
      key: 'ourse',
      roundNumber: 1,
    });
  });

  it('ne descend jamais sous la manche 1 en reculant', () => {
    expect(stepTurn({ keys: KEYS, currentKey: 'alix', roundNumber: 1 }, -1)).toEqual({
      key: 'ourse',
      roundNumber: 1,
    });
  });

  it('démarre au premier quand le combat n\'a pas commencé (en avant)', () => {
    expect(stepTurn({ keys: KEYS, currentKey: null, roundNumber: 1 }, 1)).toEqual({
      key: 'alix',
      roundNumber: 1,
    });
  });

  it('démarre au dernier quand le combat n\'a pas commencé (en arrière)', () => {
    expect(stepTurn({ keys: KEYS, currentKey: null, roundNumber: 1 }, -1)).toEqual({
      key: 'ourse',
      roundNumber: 1,
    });
  });

  it('se replace sans changer de manche quand le combattant actif a été retiré', () => {
    // Clé inconnue de l'ordre (créature retirée du roster en pleine manche 4) : on se repose au
    // bout, mais la manche en cours n'a aucune raison de bouger.
    expect(stepTurn({ keys: KEYS, currentKey: 'gobelin-9', roundNumber: 4 }, 1)).toEqual({
      key: 'alix',
      roundNumber: 4,
    });
    expect(stepTurn({ keys: KEYS, currentKey: 'gobelin-9', roundNumber: 4 }, -1)).toEqual({
      key: 'ourse',
      roundNumber: 4,
    });
  });

  it('avancer puis reculer ramène exactement à l\'état de départ', () => {
    // La symétrie est le cœur du ticket : le MJ qui clique une fois de trop doit retrouver son
    // combattant ET sa manche, y compris sur le passage d'une manche à l'autre.
    for (const key of KEYS) {
      const start = { keys: KEYS, currentKey: key, roundNumber: 3 };
      const forward = stepTurn(start, 1)!;
      expect(stepTurn({ keys: KEYS, currentKey: forward.key, roundNumber: forward.roundNumber }, -1)).toEqual({
        key,
        roundNumber: 3,
      });
      // Et dans l'autre sens, depuis le même point de départ.
      const backward = stepTurn(start, -1)!;
      expect(stepTurn({ keys: KEYS, currentKey: backward.key, roundNumber: backward.roundNumber }, 1)).toEqual({
        key,
        roundNumber: 3,
      });
    }
  });

  it('un tour de table complet avance d\'exactement une manche', () => {
    let state = { keys: KEYS, currentKey: KEYS[0] as string | null, roundNumber: 1 };
    for (let i = 0; i < KEYS.length; i += 1) {
      const next = stepTurn(state, 1)!;
      state = { ...state, currentKey: next.key, roundNumber: next.roundNumber };
    }
    expect(state.currentKey).toBe('alix');
    expect(state.roundNumber).toBe(2);
  });

  it('fonctionne avec un unique combattant (chaque pas change de manche)', () => {
    const solo = { keys: ['alix'], currentKey: 'alix', roundNumber: 2 };
    expect(stepTurn(solo, 1)).toEqual({ key: 'alix', roundNumber: 3 });
    expect(stepTurn(solo, -1)).toEqual({ key: 'alix', roundNumber: 1 });
  });
});

describe('stepTurn — créatures vaincues sautées (PER-302)', () => {
  it('saute une créature vaincue en avant', () => {
    expect(
      stepTurn({ keys: KEYS, currentKey: 'alix', roundNumber: 2, skipKeys: ['gobelin-1'] }, 1),
    ).toEqual({ key: 'gobelin-2', roundNumber: 2 });
  });

  it('saute plusieurs vaincues d’affilée', () => {
    expect(
      stepTurn(
        { keys: KEYS, currentKey: 'alix', roundNumber: 2, skipKeys: ['gobelin-1', 'gobelin-2'] },
        1,
      ),
    ).toEqual({ key: 'ourse', roundNumber: 2 });
  });

  it('saute aussi en arrière (symétrie)', () => {
    expect(
      stepTurn({ keys: KEYS, currentKey: 'ourse', roundNumber: 2, skipKeys: ['gobelin-2'] }, -1),
    ).toEqual({ key: 'gobelin-1', roundNumber: 2 });
  });

  it('n’incrémente la manche qu’UNE fois en franchissant la fin de bande peuplée de vaincues', () => {
    // Cas exact de la relégation (PER-302) : les vaincues sont massées en fin de bande, donc « Tour
    // suivant » depuis le dernier vivant les traverse toutes avant de boucler sur le premier.
    expect(
      stepTurn(
        { keys: KEYS, currentKey: 'gobelin-1', roundNumber: 2, skipKeys: ['gobelin-2', 'ourse'] },
        1,
      ),
    ).toEqual({ key: 'alix', roundNumber: 3 });
  });

  it('décrémente la manche une seule fois en reculant à travers les vaincues', () => {
    expect(
      stepTurn(
        { keys: KEYS, currentKey: 'alix', roundNumber: 3, skipKeys: ['gobelin-2', 'ourse'] },
        -1,
      ),
    ).toEqual({ key: 'gobelin-1', roundNumber: 2 });
  });

  it('part du tour courant même quand CE combattant est sauté', () => {
    // La créature qui vient de tomber garde la main jusqu'au pas suivant : on doit pouvoir la quitter.
    expect(
      stepTurn({ keys: KEYS, currentKey: 'gobelin-1', roundNumber: 2, skipKeys: ['gobelin-1'] }, 1),
    ).toEqual({ key: 'gobelin-2', roundNumber: 2 });
  });

  it('démarre sur le premier combattant NON sauté quand le combat n’a pas commencé', () => {
    expect(
      stepTurn({ keys: KEYS, currentKey: null, roundNumber: 1, skipKeys: ['alix', 'gobelin-1'] }, 1),
    ).toEqual({ key: 'gobelin-2', roundNumber: 1 });
    expect(
      stepTurn({ keys: KEYS, currentKey: null, roundNumber: 1, skipKeys: ['ourse'] }, -1),
    ).toEqual({ key: 'gobelin-2', roundNumber: 1 });
  });

  it('ignore le saut quand TOUT le monde est sauté (dernière créature abattue)', () => {
    // Sans ce garde-fou, le tour n'aurait nulle part où se poser : on retombe sur le pas simple.
    expect(stepTurn({ keys: KEYS, currentKey: 'ourse', roundNumber: 2, skipKeys: KEYS }, 1)).toEqual({
      key: 'alix',
      roundNumber: 3,
    });
  });

  it('ignore une clé sautée qui ne fait pas partie de l’ordre', () => {
    expect(
      stepTurn({ keys: KEYS, currentKey: 'alix', roundNumber: 2, skipKeys: ['gobelin-9'] }, 1),
    ).toEqual({ key: 'gobelin-1', roundNumber: 2 });
  });
});

describe('turnDirectionFromKey', () => {
  it('reconnaît les touches de progression', () => {
    expect(turnDirectionFromKey('n')).toBe(1);
    expect(turnDirectionFromKey('N')).toBe(1);
    expect(turnDirectionFromKey('ArrowRight')).toBe(1);
    expect(turnDirectionFromKey('p')).toBe(-1);
    expect(turnDirectionFromKey('P')).toBe(-1);
    expect(turnDirectionFromKey('ArrowLeft')).toBe(-1);
  });

  it('IGNORE la barre d\'espace (elle réactive le bouton qui a le focus)', () => {
    expect(turnDirectionFromKey(' ')).toBeNull();
    expect(turnDirectionFromKey('Spacebar')).toBeNull();
  });

  it('ignore les autres touches', () => {
    for (const key of ['Enter', 'ArrowUp', 'ArrowDown', 'Tab', 'Escape', 'a', 'm', '1']) {
      expect(turnDirectionFromKey(key)).toBeNull();
    }
  });
});
