import { describe, expect, it } from 'vitest';
import { initialEquipment } from '@/components/wizard/helpers';
import { COIN_POUCH_ITEM_NAME } from '@/data';
import { adventurerClasses } from '@/data/classes/adventurers';
import { coinPouchItemName, diceRange, parseCoinPouchName } from './coinPouch';
import { isCustomItem } from './types';

/**
 * Garde-fou de la « Bourse de 2d6 pa » (sac d'aventurier, p. 31) : la fiche reconnaît cet
 * objet par son NOM (`COIN_POUCH_ITEM_NAME`) pour ouvrir la modale d'ajout de pa au clic sur
 * « Utiliser » (PER-152). Si le libellé de l'objet créé et la constante divergent, la
 * reconnaissance casse silencieusement — ce test verrouille l'alignement des deux.
 */
describe('bourse de départ (2d6 pa)', () => {
  it('la constante correspond au libellé attendu', () => {
    expect(COIN_POUCH_ITEM_NAME).toBe('Bourse de 2d6 pa');
  });

  it('l’équipement initial contient un objet custom nommé exactement COIN_POUCH_ITEM_NAME', () => {
    const pouch = initialEquipment(adventurerClasses[0]).find(
      (line) => isCustomItem(line) && line.name === COIN_POUCH_ITEM_NAME,
    );
    expect(pouch).toBeTruthy();
  });
});

/**
 * Généralisation PER-200 (Outils du MJ) : n'importe quelle monnaie/dés, reconnue par le
 * même motif de nom que la bourse d'origine — `COIN_POUCH_ITEM_NAME` doit continuer à s'y
 * reconnaître (garde-fou de non-régression).
 */
describe('parseCoinPouchName', () => {
  it('reconnaît la bourse historique (argent, p. 31)', () => {
    expect(parseCoinPouchName(COIN_POUCH_ITEM_NAME)).toEqual({
      currency: 'silver',
      abbrev: 'pa',
      label: 'pièces d’argent (pa)',
      dice: '2d6',
    });
  });

  it('reconnaît une bourse d’or créée depuis les Outils du MJ', () => {
    expect(parseCoinPouchName('Bourse de 3d6 po')).toEqual({
      currency: 'gold',
      abbrev: 'po',
      label: 'pièces d’or (po)',
      dice: '3d6',
    });
  });

  it('ignore un objet qui n’est pas une bourse', () => {
    expect(parseCoinPouchName('Épée longue')).toBeNull();
  });

  it('coinPouchItemName produit un nom reconnu par parseCoinPouchName (aller-retour)', () => {
    const name = coinPouchItemName('1d4', 'copper');
    expect(name).toBe('Bourse de 1d4 pc');
    expect(parseCoinPouchName(name)?.currency).toBe('copper');
  });
});

describe('diceRange', () => {
  it('calcule min/max d’une notation NdM', () => {
    expect(diceRange('2d6')).toEqual({ min: 2, max: 12 });
    expect(diceRange('1d4')).toEqual({ min: 1, max: 4 });
  });

  it('renvoie null pour une notation mal formée', () => {
    expect(diceRange('abc')).toBeNull();
  });
});
