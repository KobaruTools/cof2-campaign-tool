import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { migrateCharacter } from '@/lib/engine/migrations';
import { buildCharacterDerivedView } from '@/components/sheet/characterDerivedView';

function loadFixture(name: string) {
  const raw = JSON.parse(readFileSync(join(process.cwd(), 'examples/characters', `${name}.json`), 'utf8'));
  return migrateCharacter(raw);
}

describe('PER-136 — plage de critique câblée à l’arme portée (recette end-to-end)', () => {
  it('guerrier maître d’armes (prédilection épées) tenant une épée longue → Science du critique 19-20 auto', () => {
    const view = buildCharacterDerivedView(loadFixture('recette-per136-guerrier-predilection-epee'));
    expect(view.meleeCriticalRanges).toHaveLength(1);
    expect(view.meleeCriticalRanges[0]?.text).toBe('19-20');
    // Aucune plage à mains nues (ce n'est pas un moine).
    expect(view.unarmedCriticalRanges).toHaveLength(0);
  });

  it('MÊME guerrier tenant une masse (hors catégorie de prédilection) → aucune plage (contrôle négatif)', () => {
    const view = buildCharacterDerivedView(loadFixture('recette-per136-guerrier-predilection-masse'));
    expect(view.meleeCriticalRanges).toHaveLength(0);
  });

  it('voleur spadassin tenant une rapière (arme légère) → Frappe chirurgicale +2 auto cumulée à la rapière → 17-20', () => {
    const view = buildCharacterDerivedView(loadFixture('recette-per136-spadassin-arme-legere'));
    // Frappe chirurgicale (+2) + plage intrinsèque de la rapière (+1, PER-225) = 17-20.
    expect(view.meleeCriticalRanges).toHaveLength(1);
    expect(view.meleeCriticalRanges[0]?.text).toBe('17-20');
  });

  it('moine (Morsure du serpent), à mains nues → 19-20 sur la vue mains nues, RIEN sur la vue arme', () => {
    const view = buildCharacterDerivedView(loadFixture('recette-per136-moine-morsure-mains-nues'));
    // La plage à mains nues est portée par la vue mains nues, pas par la vue « arme ».
    expect(view.meleeCriticalRanges).toHaveLength(0);
    expect(view.unarmedCriticalRanges).toHaveLength(1);
    expect(view.unarmedCriticalRanges[0]?.text).toBe('19-20');
  });
});
