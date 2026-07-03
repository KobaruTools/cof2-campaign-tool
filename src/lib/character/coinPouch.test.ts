import { describe, expect, it } from 'vitest';
import { initialEquipment } from '@/components/wizard/helpers';
import { COIN_POUCH_ITEM_NAME } from '@/data';
import { adventurerClasses } from '@/data/classes/adventurers';
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
