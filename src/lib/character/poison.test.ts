import { describe, expect, it } from 'vitest';
import { SCHEMA_VERSION, type Character, type EquipmentRef } from '@/lib/character/types';
import {
  availablePoisonKinds,
  isPoisonableWeaponLine,
  poisonLoadoutFeature,
  poisonedWeaponsView,
  prunePoisonedWeapons,
  weakeningUnlocked,
} from './poison';
import {
  applyPoisonToWeapon,
  removePoisonFromWeapon,
  setPoisonKind,
  setPoisonSpent,
} from './sheetActions';
import { shortRest } from './rest';

function makeCharacter(over: Partial<Character> = {}): Character {
  return {
    schemaVersion: SCHEMA_VERSION,
    id: 'test',
    name: 'Test',
    identity: {},
    ancestryId: 'halfelin',
    classId: 'voleur',
    level: 16,
    priestVocation: null,
    portraitVariant: 'default',
    firearmsAllowed: true,
    campaignId: null,
    playerId: null,
    status: 'active',
    abilities: { AGI: 3, CON: 2, FOR: 0, PER: 3, CHA: 1, INT: 4, VOL: 1 },
    baseAbilities: { AGI: 3, CON: 2, FOR: 0, PER: 3, CHA: 1, INT: 4, VOL: 1 },
    ancestryChoices: [],
    ancestryPathId: 'halfelin',
    featureIds: ['prestige-maitre-des-poisons-r5'],
    featureChoices: {},
    effectToggles: {},
    effectInputs: {},
    usageCounters: {},
    depletion: {},
    companionDepletion: {},
    transformationDepletion: {},
  transformationAbilities: {},
    companionInstances: {},
    mounts: [],
    poisonedWeapons: [],
    purse: { platinum: 0, gold: 0, silver: 0, copper: 0 },
    levelUpHistory: [],
    equipment: [
      { itemId: 'dague', quantity: 1 },
      { itemId: 'epee-courte', quantity: 1 },
      { itemId: 'arc-long', quantity: 1 },
      { itemId: 'torche', quantity: 1 }, // objet non-arme (contrôle négatif)
    ],
    overrides: {},
    notes: '',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...over,
  };
}

describe('poison — repérage de la capacité et déblocage', () => {
  it('r5 seul : loadout trouvé (3 armes), poison affaiblissant NON débloqué', () => {
    const c = makeCharacter();
    expect(poisonLoadoutFeature(c)?.loadout.maxWeapons).toBe(3);
    expect(weakeningUnlocked(c)).toBe(false);
    expect(availablePoisonKinds(c)).toEqual(['quick']);
  });

  it('r5 + r6 : poison affaiblissant débloqué', () => {
    const c = makeCharacter({
      featureIds: ['prestige-maitre-des-poisons-r5', 'prestige-maitre-des-poisons-r6'],
    });
    expect(weakeningUnlocked(c)).toBe(true);
    expect(availablePoisonKinds(c)).toEqual(['quick', 'weakening']);
  });

  it('sans la capacité : aucun loadout', () => {
    const c = makeCharacter({ featureIds: [] });
    expect(poisonLoadoutFeature(c)).toBeNull();
  });
});

describe('poison — éligibilité des armes', () => {
  it('dague/épée/arc = enduisables ; torche = non', () => {
    const c = makeCharacter();
    expect(isPoisonableWeaponLine(c.equipment[0])).toBe(true); // dague
    expect(isPoisonableWeaponLine(c.equipment[1])).toBe(true); // épée courte
    expect(isPoisonableWeaponLine(c.equipment[2])).toBe(true); // arc long
    expect(isPoisonableWeaponLine(c.equipment[3])).toBe(false); // torche
  });
});

describe('poison — mutations', () => {
  it("enduire une arme : assigne un instanceId et ajoute une charge 'quick'", () => {
    const c = makeCharacter();
    const patch = applyPoisonToWeapon(c, 0, 'quick');
    expect(patch.poisonedWeapons).toHaveLength(1);
    const app = patch.poisonedWeapons![0];
    expect(app.kind).toBe('quick');
    expect(app.spent).toBe(false);
    // instanceId assigné sur la ligne d'équipement
    const line = (patch.equipment![0] as EquipmentRef);
    expect(line.instanceId).toBe(app.instanceId);
    expect(typeof app.instanceId).toBe('string');
  });

  it('ne dépasse pas maxWeapons (3)', () => {
    let c = makeCharacter();
    for (let i = 0; i < 3; i++) {
      c = { ...c, ...applyPoisonToWeapon(c, i, 'quick') };
    }
    expect(c.poisonedWeapons).toHaveLength(3);
    // 4e tentative (l'arc, index 2 déjà pris → prenons torche index 3 qui n'est pas une arme de toute façon)
    const patch = applyPoisonToWeapon(c, 3, 'quick');
    expect(patch).toEqual({}); // torche non-arme ET plafond atteint
  });

  it('ne ré-endue pas deux fois la même arme', () => {
    let c = makeCharacter();
    c = { ...c, ...applyPoisonToWeapon(c, 0, 'quick') };
    const patch = applyPoisonToWeapon(c, 0, 'quick');
    expect(patch).toEqual({});
  });

  it('sans arme enduisable (torche) : patch vide', () => {
    const c = makeCharacter();
    expect(applyPoisonToWeapon(c, 3, 'quick')).toEqual({});
  });

  it('changer le type (r6) et dépenser/ré-enduire', () => {
    let c = makeCharacter({
      featureIds: ['prestige-maitre-des-poisons-r5', 'prestige-maitre-des-poisons-r6'],
    });
    c = { ...c, ...applyPoisonToWeapon(c, 0, 'quick') };
    const id = c.poisonedWeapons[0].instanceId;

    c = { ...c, ...setPoisonKind(c, id, 'weakening') };
    expect(c.poisonedWeapons[0].kind).toBe('weakening');

    c = { ...c, ...setPoisonSpent(c, id, true) };
    expect(c.poisonedWeapons[0].spent).toBe(true);

    c = { ...c, ...setPoisonSpent(c, id, false) };
    expect(c.poisonedWeapons[0].spent).toBe(false);
  });

  it('retirer le poison', () => {
    let c = makeCharacter();
    c = { ...c, ...applyPoisonToWeapon(c, 0, 'quick') };
    const id = c.poisonedWeapons[0].instanceId;
    c = { ...c, ...removePoisonFromWeapon(c, id) };
    expect(c.poisonedWeapons).toHaveLength(0);
  });
});

describe('poison — vue enrichie et orphelines', () => {
  it('poisonedWeaponsView résout la ligne + le nom, ignore les orphelines', () => {
    let c = makeCharacter();
    c = { ...c, ...applyPoisonToWeapon(c, 0, 'quick') }; // dague
    expect(poisonedWeaponsView(c)).toHaveLength(1);
    expect(poisonedWeaponsView(c)[0].name).toBe('Dague');

    // Supprimer l'arme de l'inventaire → référence orpheline
    const orphaned = { ...c, equipment: c.equipment.slice(1) };
    expect(poisonedWeaponsView(orphaned)).toHaveLength(0);
    expect(prunePoisonedWeapons(orphaned)).toHaveLength(0);
  });
});

describe('poison — ré-enduisage au repos', () => {
  it('un repos court remet les charges dépensées à non-dépensé', () => {
    let c = makeCharacter();
    c = { ...c, ...applyPoisonToWeapon(c, 0, 'quick') };
    const id = c.poisonedWeapons[0].instanceId;
    c = { ...c, ...setPoisonSpent(c, id, true) };
    expect(c.poisonedWeapons[0].spent).toBe(true);

    const rest = shortRest(c);
    expect(rest.poisonedWeapons).toBeDefined();
    expect(rest.poisonedWeapons![0].spent).toBe(false);
  });

  it('aucune charge dépensée → le repos ne touche pas les poisons (pas de patch mixte)', () => {
    let c = makeCharacter();
    c = { ...c, ...applyPoisonToWeapon(c, 0, 'quick') };
    const rest = shortRest(c);
    expect(rest.poisonedWeapons).toBeUndefined();
  });
});
