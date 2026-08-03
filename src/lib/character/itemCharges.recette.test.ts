import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { migrateCharacter } from '@/lib/engine/migrations';
import { itemChargeState } from './itemCharges';
import { longRest, shortRest } from './rest';
import { useEquipmentItem } from './sheetActions';
import type { EquipmentLine } from './types';

function loadFixture(name: string) {
  const raw = JSON.parse(
    readFileSync(join(process.cwd(), 'examples/characters', `${name}.json`), 'utf8'),
  );
  return migrateCharacter(raw);
}

/** « restantes/maximum » de chaque ligne à charges, indexé par nom affiché. */
function counters(equipment: EquipmentLine[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of equipment) {
    const state = itemChargeState(line);
    if (!state) continue;
    const name = 'custom' in line ? line.name : (line.overrides?.name ?? line.itemId);
    out[name] = `${state.remaining}/${state.max}`;
  }
  return out;
}

// PER-294 — la fixture livrée EST la recette : ce test verrouille les verdicts que le propriétaire
// est censé lire à l'écran, pour qu'un écart de moteur se voie sans rouvrir l'application.
describe('PER-294 — recette des objets à charges sur la fixture réelle', () => {
  const character = loadFixture('recette-per294-objets-a-charges');

  it('compteurs affichés au chargement de la fiche', () => {
    expect(counters(character.equipment)).toEqual({
      'Baguette de foudre': '5/5',
      'Talisman du souffle court': '1/3',
      'Sceptre du gardien avare': '0/4',
      'Fiole de lumière captive': '1/1',
      'Grimoire des mille runes': '11/15',
      'Épée longue des trois éclats': '2/3',
      'Flacon inépuisable de soins': '2/2',
      // La « Baguette éteinte » n'a AUCUNE charge : absente de ce relevé (aucune pastille affichée).
    });
  });

  it('le repos COURT ne recharge que les objets réglés « au repos court »', () => {
    const after = counters(shortRest(character).equipment!);
    expect(after['Talisman du souffle court']).toBe('3/3');
    expect(after['Grimoire des mille runes']).toBe('15/15');
    // Réglés « au repos long » ou manuels : intacts.
    expect(after['Épée longue des trois éclats']).toBe('2/3');
    expect(after['Sceptre du gardien avare']).toBe('0/4');
  });

  it('le repos LONG recharge tout SAUF le sceptre manuel', () => {
    const after = counters(longRest(character).equipment!);
    expect(after['Talisman du souffle court']).toBe('3/3');
    expect(after['Grimoire des mille runes']).toBe('15/15');
    expect(after['Épée longue des trois éclats']).toBe('3/3');
    expect(after['Sceptre du gardien avare']).toBe('0/4');
  });

  it('« Utiliser » un consommable à charges dépense une charge sans retirer la ligne', () => {
    const index = character.equipment.findIndex(
      (l) => !('custom' in l) && l.overrides?.name === 'Flacon inépuisable de soins',
    );
    const intent = useEquipmentItem(character, index);
    expect(intent.kind).toBe('consume');
    const after = intent.kind === 'consume' ? intent.patch.equipment! : [];
    expect(after).toHaveLength(character.equipment.length);
    expect(counters(after)['Flacon inépuisable de soins']).toBe('1/2');
  });
});
