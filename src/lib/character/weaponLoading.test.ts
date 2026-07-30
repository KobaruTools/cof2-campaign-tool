import { describe, expect, it } from 'vitest';
import { createBlankCharacter } from './factory';
import type { Character, EquipmentLine, EquipmentRef, LoadedAmmunitionKind } from './types';
import { featureById } from '@/data';
import {
  ADVISED_LOADED_FIREARMS,
  fireShot,
  isModifiableWeapon,
  loadShot,
  loadedFirearmCount,
  loadingContext,
  modifiedWeaponCount,
  refillWeapon,
  reloadAllToFull,
  reloadableWeapon,
  setWeaponModification,
  weaponLoadingState,
  weaponModificationSlots,
} from './weaponLoading';

function makeChar(over: Partial<Character>): Character {
  return {
    ...createBlankCharacter({ now: '2026-01-01T00:00:00.000Z' }),
    ancestryId: 'humain',
    ancestryPathId: 'humain',
    classId: 'arquebusier',
    ...over,
  };
}

/** Arquebusier d'INT donnée, avec les capacités indiquées (pour les paliers de chargeur). */
function gunner(int: number, featureIds: string[] = [], equipment: EquipmentLine[] = []): Character {
  const base = makeChar({ featureIds, equipment });
  return { ...base, abilities: { ...base.abilities, INT: int } };
}

/** `n` munitions identiques (raccourci de fixture). */
const shots = (n: number, kind: LoadedAmmunitionKind = 'normal'): LoadedAmmunitionKind[] =>
  Array.from({ length: n }, () => kind);

/** État de chargement de la ligne 0 (raccourci de lecture). */
function state0(character: Character) {
  const s = weaponLoadingState(character.equipment[0], loadingContext(character));
  if (!s) throw new Error('la ligne 0 devrait se suivre');
  return s;
}

/** Ligne 0 relue comme référence de catalogue, après passage d'un réducteur. */
const ref0 = (equipment: EquipmentLine[]) => equipment[0] as EquipmentRef;

describe('reloadableWeapon — portée data-driven (table p. 185)', () => {
  it('les arbalètes et les armes à poudre se rechargent', () => {
    for (const itemId of ['arbalete-de-poing', 'arbalete-legere', 'arbalete-lourde', 'petoire', 'mousquet']) {
      expect(reloadableWeapon({ itemId, quantity: 1 })?.id, itemId).toBe(itemId);
    }
  });

  it('les arcs, frondes et armes de jet ne se rechargent pas (le livre ne compte rien)', () => {
    for (const itemId of ['arc-court', 'arc-long', 'fronde', 'lance-pierre', 'javelot']) {
      expect(reloadableWeapon({ itemId, quantity: 1 }), itemId).toBeNull();
    }
  });

  it('ni une arme de contact, ni une armure, ni un objet personnalisé', () => {
    expect(reloadableWeapon({ itemId: 'epee-longue', quantity: 1 })).toBeNull();
    expect(reloadableWeapon({ itemId: 'cuir-simple', quantity: 1 })).toBeNull();
    expect(reloadableWeapon({ custom: true, name: 'Pétoire du grand-père', quantity: 1 })).toBeNull();
  });
});

describe('loadingContext — capacité du chargeur (artilleur-r2, p. 62)', () => {
  it('[2 + INT] sans aucune voie d’arquebusier au rang 3', () => {
    expect(loadingContext(gunner(3)).magazineCapacity).toBe(5);
  });

  it('+1 par voie d’arquebusier au rang 3, voie hôte comprise', () => {
    expect(loadingContext(gunner(3, ['artilleur-r3'])).magazineCapacity).toBe(6);
    expect(loadingContext(gunner(3, ['artilleur-r3', 'explosifs-r3'])).magazineCapacity).toBe(7);
    // Le palier compte le rang ATTEINT : une voie au rang 5 compte aussi.
    expect(loadingContext(gunner(3, ['artilleur-r5', 'mercenaire-r4'])).magazineCapacity).toBe(7);
  });

  it('une voie sous le rang 3 ne compte pas', () => {
    expect(loadingContext(gunner(3, ['artilleur-r2'])).magazineCapacity).toBe(5);
  });

  it('plancher à 1 avec une INT très négative (un chargeur reste utilisable)', () => {
    expect(loadingContext(gunner(-3)).magazineCapacity).toBe(1);
  });
});

describe('weaponLoadingState — file de munitions portée par l’ARME (une arme = une case)', () => {
  it('arme standard : 1 coup, pleine de munition normale par défaut (loaded absent)', () => {
    const s = state0(gunner(2, [], [{ itemId: 'petoire', quantity: 1 }]));
    expect(s.capacity).toBe(1);
    expect(s.shots).toEqual(['normal']);
    expect(s.loaded).toBe(1);
    expect(s.nextShot).toBe('normal');
    expect(s.full).toBe(true);
    expect(s.empty).toBe(false);
    expect(s.refillCost).toBeNull();
    expect(s.reloadAction).toBe('L');
    expect(s.firearm).toBe(true);
    expect(s.countsTowardLoadedLimit).toBe(true);
  });

  it('file VIDE (`[]`) : arme déchargée, distincte de l’absence (= pleine)', () => {
    const s = state0(gunner(2, [], [{ itemId: 'petoire', quantity: 1, loaded: [] }]));
    expect(s.shots).toEqual([]);
    expect(s.empty).toBe(true);
    expect(s.nextShot).toBeNull();
    expect(s.refillCost).toEqual({ action: 'L', count: 1 });
  });

  it('le PROCHAIN tir est la tête de file — mélange libre grenaille / normale', () => {
    const s = state0(
      gunner(
        3,
        ['artilleur-r3'],
        [{ itemId: 'petoire', quantity: 1, magazine: true, loaded: ['grapeshot', 'grapeshot', 'normal'] }],
      ),
    );
    expect(s.capacity).toBe(6);
    expect(s.loaded).toBe(3);
    expect(s.nextShot).toBe('grapeshot');
    expect(s.shots).toEqual(['grapeshot', 'grapeshot', 'normal']);
    expect(s.refillCost).toEqual({ action: 'L', count: 3 });
  });

  it('arbalète : action de MOUVEMENT, et hors du décompte des armes à poudre', () => {
    const s = state0(gunner(2, [], [{ itemId: 'arbalete-de-poing', quantity: 1, loaded: [] }]));
    expect(s.reload.action).toBe('M');
    expect(s.reloadAction).toBe('M');
    expect(s.firearm).toBe(false);
    expect(s.countsTowardLoadedLimit).toBe(false);
    expect(s.refillCost).toEqual({ action: 'M', count: 1 });
  });

  it('la QUANTITÉ de la ligne n’entre dans aucun calcul (une arme = une case)', () => {
    const one = state0(gunner(2, [], [{ itemId: 'petoire', quantity: 1 }]));
    const many = state0(gunner(2, [], [{ itemId: 'petoire', quantity: 4 }]));
    expect(many.capacity).toBe(one.capacity);
    expect(many.shots).toEqual(one.shots);
  });

  // « Il doit recharger chaque canon individuellement » (p. 63) : l'état « 1 coup sur 2 » est donc
  // légitime — c'est le TIR qui en consomme deux (cf. le bloc « canon double » plus bas).
  it('second canon (artilleur-r4, p. 63) : 2 coups, rechargeables un par un', () => {
    const s = state0(gunner(2, [], [{ itemId: 'petoire', quantity: 1, doubleBarrel: true }]));
    expect(s.capacity).toBe(2);
    expect(s.shots).toEqual(['normal', 'normal']);

    const oneBarrel = state0(
      gunner(2, [], [{ itemId: 'petoire', quantity: 1, doubleBarrel: true, loaded: shots(1) }]),
    );
    expect(oneBarrel.empty).toBe(false);
    expect(oneBarrel.full).toBe(false);
    expect(oneBarrel.refillCost).toEqual({ action: 'L', count: 1 });
  });

  it('chargeur (artilleur-r2, p. 62) : la capacité du chargeur devient celle de l’arme', () => {
    const s = state0(gunner(3, ['artilleur-r3'], [{ itemId: 'petoire', quantity: 1, magazine: true }]));
    // Chargeur = 2 + INT 3 + 1 palier = 6, plein par défaut.
    expect(s.capacity).toBe(6);
    expect(s.loaded).toBe(6);
    expect(s.full).toBe(true);
  });

  it('chargeur entamé : le coût du plein se compte par projectile manquant', () => {
    const s = state0(
      gunner(3, ['artilleur-r3'], [{ itemId: 'petoire', quantity: 1, magazine: true, loaded: shots(2) }]),
    );
    expect(s.refillCost).toEqual({ action: 'L', count: 4 });
    expect(s.empty).toBe(false);
  });

  it('chargeur : le rechargement se paie en actions LIMITÉES même sur une arbalète (p. 62)', () => {
    const s = state0(
      gunner(2, [], [{ itemId: 'arbalete-de-poing', quantity: 1, magazine: true, loaded: [] }]),
    );
    expect(s.reload.action).toBe('M');
    expect(s.reloadAction).toBe('L');
    expect(s.refillCost).toEqual({ action: 'L', count: 4 });
  });

  it('chargeur ET second canon s’ADDITIONNENT : réserve du chargeur + 1 coup chambré', () => {
    // INT 2, aucune voie au rang 3 → chargeur de 4 ; le second canon en ajoute un → 5.
    const s = state0(
      gunner(2, [], [{ itemId: 'petoire', quantity: 1, magazine: true, doubleBarrel: true }]),
    );
    expect(s.capacity).toBe(5);
    // Le cas énoncé par le propriétaire : chargeur de 6 (2 + INT 3 + 1 palier) + second canon = 7.
    const seven = state0(
      gunner(3, ['artilleur-r3'], [{ itemId: 'petoire', quantity: 1, magazine: true, doubleBarrel: true }]),
    );
    expect(seven.capacity).toBe(7);
    // La détente reste double : un tir consomme toujours 2 coups.
    expect(seven.shotsPerFire).toBe(2);
  });

  it('une file devenue trop longue est TRONQUÉE à la capacité (chargeur retiré, INT en baisse)', () => {
    const s = state0(gunner(2, [], [{ itemId: 'petoire', quantity: 1, loaded: shots(9) }]));
    expect(s.shots).toEqual(['normal']);
    expect(s.full).toBe(true);
  });

  // La fiche est permissive et l'inventaire peut venir d'un import JSON, d'un `localStorage` écrit
  // par une version antérieure ou d'un cloud partagé : le résolveur ne doit JAMAIS casser le rendu.
  it('tolère un `loaded` NUMÉRIQUE (forme antérieure) = autant de munitions normales', () => {
    // Cas vécu : une fiche enregistrée quand `loaded` était un simple compteur.
    const asCount = { itemId: 'petoire', quantity: 1, loaded: 4 } as unknown as EquipmentLine;
    const char = gunner(3, ['artilleur-r3'], [{ ...(asCount as EquipmentRef), magazine: true }]);
    const s = state0(char);
    expect(s.shots).toEqual(shots(4));
    expect(s.loaded).toBe(4);
    expect(s.nextShot).toBe('normal');
    // Borné à la capacité, et jamais négatif.
    expect(state0(gunner(2, [], [asCount as EquipmentRef])).shots).toEqual(['normal']);
    const negative = { itemId: 'petoire', quantity: 1, loaded: -3 } as unknown as EquipmentRef;
    expect(state0(gunner(2, [], [negative])).shots).toEqual([]);
  });

  it('tolère une valeur ABERRANTE : traitée comme absente (arme pleine)', () => {
    const junk = { itemId: 'petoire', quantity: 1, loaded: 'plein' } as unknown as EquipmentRef;
    expect(state0(gunner(2, [], [junk])).shots).toEqual(['normal']);
  });

  it('écarte les natures de munition inconnues d’une file', () => {
    const mixed = {
      itemId: 'petoire',
      quantity: 1,
      doubleBarrel: true,
      loaded: ['grapeshot', 'plomb-magique'],
    } as unknown as EquipmentRef;
    expect(state0(gunner(2, [], [mixed])).shots).toEqual(['grapeshot']);
  });

  it('rien à suivre sur un arc ou un objet personnalisé', () => {
    const ctx = loadingContext(gunner(2));
    expect(weaponLoadingState({ itemId: 'arc-long', quantity: 1 }, ctx)).toBeNull();
    expect(weaponLoadingState({ custom: true, name: 'Sarbacane', quantity: 1 }, ctx)).toBeNull();
  });
});

describe('fireShot — dépenser le prochain coup chargé', () => {
  it('tirer consomme la TÊTE de file ; l’arme d’un coup devient vide', () => {
    const char = gunner(2, [], [{ itemId: 'petoire', quantity: 1 }]);
    const after = fireShot(char.equipment, 0, loadingContext(char));
    expect(ref0(after).loaded).toEqual([]);
  });

  it('tirer retire la grenaille de tête et laisse la suite intacte', () => {
    const char = gunner(
      3,
      ['artilleur-r3'],
      [{ itemId: 'petoire', quantity: 1, magazine: true, loaded: ['grapeshot', 'grapeshot', 'normal'] }],
    );
    const after = fireShot(char.equipment, 0, loadingContext(char));
    expect(ref0(after).loaded).toEqual(['grapeshot', 'normal']);
  });

  it('tirer entame le chargeur coup par coup', () => {
    const char = gunner(3, ['artilleur-r3'], [{ itemId: 'petoire', quantity: 1, magazine: true }]);
    const ctx = loadingContext(char);
    const once = fireShot(char.equipment, 0, ctx);
    expect(ref0(once).loaded).toEqual(shots(5));
    expect(ref0(fireShot(once, 0, ctx)).loaded).toEqual(shots(4));
  });

  it('tirer à vide ne change rien (même référence : aucune écriture à faire)', () => {
    const char = gunner(2, [], [{ itemId: 'petoire', quantity: 1, loaded: [] }]);
    expect(fireShot(char.equipment, 0, loadingContext(char))).toBe(char.equipment);
  });

  it('tirer sur une ligne qui ne se suit pas ne change rien', () => {
    const char = gunner(2, [], [{ itemId: 'arc-long', quantity: 1 }]);
    expect(fireShot(char.equipment, 0, loadingContext(char))).toBe(char.equipment);
  });
});

describe('canon double — un tir consomme 2 projectiles (artilleur-r4, p. 63)', () => {
  const doubleBarrel = (loaded?: LoadedAmmunitionKind[]) =>
    gunner(2, [], [{ itemId: 'petoire', quantity: 1, doubleBarrel: true, ...(loaded ? { loaded } : {}) }]);

  it('expose les modifications de l’arme, pour les afficher à côté des munitions', () => {
    expect(state0(doubleBarrel())).toMatchObject({ doubleBarrel: true, magazine: false });
    const withMagazine = gunner(3, ['artilleur-r3'], [{ itemId: 'petoire', quantity: 1, magazine: true }]);
    expect(state0(withMagazine)).toMatchObject({ doubleBarrel: false, magazine: true });
    expect(state0(gunner(2, [], [{ itemId: 'petoire', quantity: 1 }]))).toMatchObject({
      doubleBarrel: false,
      magazine: false,
    });
  });

  it('déclare 2 coups par tir, et 1 sur une arme ordinaire', () => {
    expect(state0(doubleBarrel()).shotsPerFire).toBe(2);
    expect(state0(gunner(2, [], [{ itemId: 'petoire', quantity: 1 }])).shotsPerFire).toBe(1);
    // Un chargeur alimente les canons, il ne change pas la détente.
    expect(
      state0(gunner(3, ['artilleur-r3'], [{ itemId: 'petoire', quantity: 1, magazine: true }])).shotsPerFire,
    ).toBe(1);
  });

  it('tirer à deux canons pleins vide l’arme d’un coup', () => {
    const char = doubleBarrel();
    const after = fireShot(char.equipment, 0, loadingContext(char));
    expect(ref0(after).loaded).toEqual([]);
  });

  it('sur un chargeur, un tir retire les DEUX munitions de tête', () => {
    const char = gunner(
      3,
      ['artilleur-r3'],
      [
        {
          itemId: 'petoire',
          quantity: 1,
          magazine: true,
          doubleBarrel: true,
          loaded: ['grapeshot', 'grapeshot', 'normal'],
        },
      ],
    );
    // Capacité = chargeur (6), mais la détente reste double → 2 projectiles consommés.
    expect(state0(char).shotsPerFire).toBe(2);
    expect(ref0(fireShot(char.equipment, 0, loadingContext(char))).loaded).toEqual(['normal']);
  });

  it('SOUS-ALIMENTÉ à un seul coup : signalé, mais le tir reste possible (un seul canon)', () => {
    const char = doubleBarrel(['normal']);
    const s = state0(char);
    expect(s.underfed).toBe(true);
    expect(s.empty).toBe(false);
    // « il reste possible de décharger un seul canon à la fois » : on consomme ce coup-là.
    expect(ref0(fireShot(char.equipment, 0, loadingContext(char))).loaded).toEqual([]);
  });

  it('pas d’alerte quand l’arme est pleine, vide, ou sans second canon', () => {
    expect(state0(doubleBarrel()).underfed).toBe(false);
    expect(state0(doubleBarrel([])).underfed).toBe(false);
    expect(state0(gunner(2, [], [{ itemId: 'petoire', quantity: 1 }])).underfed).toBe(false);
  });
});

describe('loadShot — recharger en fin de file', () => {
  it('recharge en QUEUE : les munitions déjà en place partent d’abord', () => {
    const char = gunner(
      3,
      ['artilleur-r3'],
      [{ itemId: 'petoire', quantity: 1, magazine: true, loaded: ['grapeshot'] }],
    );
    const after = loadShot(char.equipment, 0, loadingContext(char));
    expect(ref0(after).loaded).toEqual(['grapeshot', 'normal']);
  });

  it('munition normale par défaut ; le plein s’écrit par l’ABSENCE de `loaded`', () => {
    const char = gunner(2, [], [{ itemId: 'petoire', quantity: 1, doubleBarrel: true, loaded: [] }]);
    const ctx = loadingContext(char);
    const one = loadShot(char.equipment, 0, ctx);
    expect(ref0(one).loaded).toEqual(['normal']);
    const two = loadShot(one, 0, ctx);
    // Pleine ET tout en munition normale = état canonique « rien à stocker ».
    expect(ref0(two).loaded).toBeUndefined();
    expect(state0({ ...char, equipment: two }).full).toBe(true);
  });

  it('pleine de GRENAILLE : la file est écrite (ce n’est pas l’état par défaut)', () => {
    const char = gunner(2, [], [{ itemId: 'petoire', quantity: 1, loaded: [] }]);
    const after = loadShot(char.equipment, 0, loadingContext(char), 'grapeshot');
    expect(ref0(after).loaded).toEqual(['grapeshot']);
  });

  it('recharger une arme pleine ne change rien', () => {
    const char = gunner(2, [], [{ itemId: 'petoire', quantity: 1 }]);
    expect(loadShot(char.equipment, 0, loadingContext(char))).toBe(char.equipment);
  });

  it('deux grenailles puis des balles normales — le cas d’usage du joueur', () => {
    const char = gunner(3, ['artilleur-r3'], [{ itemId: 'petoire', quantity: 1, magazine: true, loaded: [] }]);
    const ctx = loadingContext(char);
    let equipment = loadShot(char.equipment, 0, ctx, 'grapeshot');
    equipment = loadShot(equipment, 0, ctx, 'grapeshot');
    equipment = loadShot(equipment, 0, ctx);
    equipment = loadShot(equipment, 0, ctx);
    expect(ref0(equipment).loaded).toEqual(['grapeshot', 'grapeshot', 'normal', 'normal']);
    // Les deux premiers tirs sont bien les grenailles.
    const s = weaponLoadingState(ref0(equipment), ctx)!;
    expect(s.nextShot).toBe('grapeshot');
    expect(ref0(fireShot(equipment, 0, ctx)).loaded).toEqual(['grapeshot', 'normal', 'normal']);
  });
});

describe('refillWeapon — faire le plein et son coût en actions', () => {
  it('annonce le coût total en actions limitées d’un chargeur (une par projectile, p. 62)', () => {
    const char = gunner(
      3,
      ['artilleur-r3'],
      [{ itemId: 'petoire', quantity: 1, magazine: true, loaded: shots(1) }],
    );
    const { equipment, shotsAdded, cost } = refillWeapon(char.equipment, 0, loadingContext(char));
    expect(shotsAdded).toBe(5);
    expect(cost).toEqual({ action: 'L', count: 5 });
    expect(ref0(equipment).loaded).toBeUndefined();
  });

  it('conserve les grenailles déjà chargées et complète en munition normale', () => {
    const char = gunner(
      3,
      ['artilleur-r3'],
      [{ itemId: 'petoire', quantity: 1, magazine: true, loaded: ['grapeshot', 'grapeshot'] }],
    );
    const { equipment, shotsAdded } = refillWeapon(char.equipment, 0, loadingContext(char));
    expect(shotsAdded).toBe(4);
    expect(ref0(equipment).loaded).toEqual([
      'grapeshot',
      'grapeshot',
      'normal',
      'normal',
      'normal',
      'normal',
    ]);
  });

  it('second canon vide : deux rechargements (« recharger chaque canon individuellement »)', () => {
    const char = gunner(2, [], [{ itemId: 'mousquet', quantity: 1, doubleBarrel: true, loaded: [] }]);
    const { shotsAdded, cost } = refillWeapon(char.equipment, 0, loadingContext(char));
    expect(shotsAdded).toBe(2);
    expect(cost).toEqual({ action: 'L', count: 2 });
  });

  it('arme déjà pleine : aucun coût, équipement inchangé', () => {
    const char = gunner(2, [], [{ itemId: 'petoire', quantity: 1 }]);
    const result = refillWeapon(char.equipment, 0, loadingContext(char));
    expect(result).toEqual({ equipment: char.equipment, shotsAdded: 0, cost: null });
  });

  it('on peut faire le plein EN grenaille', () => {
    const char = gunner(2, [], [{ itemId: 'petoire', quantity: 1, doubleBarrel: true, loaded: [] }]);
    const { equipment } = refillWeapon(char.equipment, 0, loadingContext(char), 'grapeshot');
    expect(ref0(equipment).loaded).toEqual(['grapeshot', 'grapeshot']);
  });
});

describe('reloadAllToFull — remise à plein de tout l’inventaire (repos)', () => {
  it('efface la file de toutes les armes (plein de munitions NORMALES)', () => {
    const equipment: EquipmentLine[] = [
      { itemId: 'petoire', quantity: 1, loaded: ['grapeshot'] },
      { itemId: 'arbalete-lourde', quantity: 1, loaded: [] },
      { itemId: 'epee-longue', quantity: 1 },
      { custom: true, name: 'Corde', quantity: 1 },
    ];
    const after = reloadAllToFull(equipment);
    expect(after[0]).toEqual({ itemId: 'petoire', quantity: 1 });
    expect(after[1]).toEqual({ itemId: 'arbalete-lourde', quantity: 1 });
    expect(after[2]).toBe(equipment[2]);
    expect(after[3]).toBe(equipment[3]);
  });

  it('rien à recharger → MÊME référence (le patch de repos reste purement état de jeu)', () => {
    const equipment: EquipmentLine[] = [
      { itemId: 'petoire', quantity: 1 },
      { custom: true, name: 'Corde', quantity: 1 },
    ];
    expect(reloadAllToFull(equipment)).toBe(equipment);
  });

  it('conserve les autres propriétés d’instance de l’arme (chargeur, enchantement, port)', () => {
    const after = reloadAllToFull([
      { itemId: 'petoire', quantity: 1, loaded: [], magazine: true, magicDef: 1, worn: { slot: 'mainHand' } },
    ]);
    expect(after[0]).toEqual({
      itemId: 'petoire',
      quantity: 1,
      magazine: true,
      magicDef: 1,
      worn: { slot: 'mainHand' },
    });
  });
});

describe('modifications d’arme au choix du joueur (artilleur-r2 / r4, PER-284)', () => {
  const magazineSpec = featureById.get('artilleur-r2')!.weaponModification!;
  const doubleBarrelSpec = featureById.get('artilleur-r4')!.weaponModification!;

  it('la donnée porte le plafond et la portée du livre', () => {
    // « jusqu'à DEUX armes de son choix » (p. 62), toute arme à recharger (variante Arbalétrier).
    expect(magazineSpec).toMatchObject({ modification: 'magazine', maxWeapons: 2, scope: 'reloadable' });
    // « ses armes à poudre » (p. 63), aucun plafond annoncé.
    expect(doubleBarrelSpec).toMatchObject({ modification: 'doubleBarrel', scope: 'firearm' });
    expect(doubleBarrelSpec.maxWeapons).toBeUndefined();
  });

  it('les capacités possédées débloquent leurs modifications', () => {
    expect(weaponModificationSlots(gunner(2, ['artilleur-r2'])).map((s) => s.featureId)).toEqual([
      'artilleur-r2',
    ]);
    expect(
      weaponModificationSlots(gunner(2, ['artilleur-r2', 'artilleur-r4'])).map(
        (s) => s.spec.modification,
      ),
    ).toEqual(['magazine', 'doubleBarrel']);
    expect(weaponModificationSlots(gunner(2, ['artilleur-r1']))).toEqual([]);
  });

  it('éligibilité : le chargeur accepte les arbalètes, le second canon non', () => {
    const crossbow: EquipmentLine = { itemId: 'arbalete-lourde', quantity: 1 };
    const firearm: EquipmentLine = { itemId: 'petoire', quantity: 1 };
    const bow: EquipmentLine = { itemId: 'arc-long', quantity: 1 };
    expect(isModifiableWeapon(crossbow, magazineSpec)).toBe(true);
    expect(isModifiableWeapon(crossbow, doubleBarrelSpec)).toBe(false);
    expect(isModifiableWeapon(firearm, magazineSpec)).toBe(true);
    expect(isModifiableWeapon(firearm, doubleBarrelSpec)).toBe(true);
    expect(isModifiableWeapon(bow, magazineSpec)).toBe(false);
    expect(isModifiableWeapon({ custom: true, name: 'Pétoire bricolée', quantity: 1 }, magazineSpec)).toBe(
      false,
    );
  });

  it('cocher une arme lui pose le chargeur et lui donne la capacité correspondante', () => {
    const char = gunner(3, ['artilleur-r2', 'artilleur-r3'], [{ itemId: 'petoire', quantity: 1 }]);
    const after = setWeaponModification(char.equipment, 0, magazineSpec, true);
    expect(ref0(after).magazine).toBe(true);
    // La capacité passe de 1 à 6 (2 + INT 3 + 1 palier) — et l'arme est pleine par défaut.
    const s = state0({ ...char, equipment: after });
    expect(s.capacity).toBe(6);
    expect(s.loaded).toBe(6);
  });

  it('décocher retire le chargeur ; les munitions en trop sont écartées à la lecture', () => {
    const char = gunner(
      3,
      ['artilleur-r2', 'artilleur-r3'],
      [{ itemId: 'petoire', quantity: 1, magazine: true, loaded: shots(5) }],
    );
    const after = setWeaponModification(char.equipment, 0, magazineSpec, false);
    expect(ref0(after).magazine).toBeUndefined();
    const s = state0({ ...char, equipment: after });
    expect(s.capacity).toBe(1);
    expect(s.shots).toEqual(['normal']);
  });

  it('respecte le plafond de DEUX armes (p. 62) : la troisième est refusée', () => {
    const char = gunner(2, ['artilleur-r2'], [
      { itemId: 'petoire', quantity: 1, magazine: true },
      { itemId: 'petoire', quantity: 1, magazine: true },
      { itemId: 'mousquet', quantity: 1 },
    ]);
    expect(modifiedWeaponCount(char.equipment, 'magazine')).toBe(2);
    // Patch refusé → MÊME référence (rien à écrire).
    expect(setWeaponModification(char.equipment, 2, magazineSpec, true)).toBe(char.equipment);
    // Après libération d'un cran, la troisième devient possible.
    const freed = setWeaponModification(char.equipment, 0, magazineSpec, false);
    expect((setWeaponModification(freed, 2, magazineSpec, true)[2] as EquipmentRef).magazine).toBe(true);
  });

  it('sans plafond (second canon), on peut en bricoler autant qu’on veut', () => {
    const char = gunner(2, ['artilleur-r4'], [
      { itemId: 'petoire', quantity: 1, doubleBarrel: true },
      { itemId: 'petoire', quantity: 1, doubleBarrel: true },
      { itemId: 'mousquet', quantity: 1 },
    ]);
    const after = setWeaponModification(char.equipment, 2, doubleBarrelSpec, true);
    expect(modifiedWeaponCount(after, 'doubleBarrel')).toBe(3);
  });

  it('rien à écrire sur une arme inéligible, un index hors bornes, ou un état déjà voulu', () => {
    const char = gunner(2, ['artilleur-r2', 'artilleur-r4'], [
      { itemId: 'arc-long', quantity: 1 },
      { itemId: 'arbalete-lourde', quantity: 1 },
    ]);
    expect(setWeaponModification(char.equipment, 0, magazineSpec, true)).toBe(char.equipment);
    expect(setWeaponModification(char.equipment, 1, doubleBarrelSpec, true)).toBe(char.equipment);
    expect(setWeaponModification(char.equipment, 9, magazineSpec, true)).toBe(char.equipment);
    expect(setWeaponModification(char.equipment, 1, magazineSpec, false)).toBe(char.equipment);
  });
});

describe('loadedFirearmCount — limite conseillée de trois armes chargées (p. 187)', () => {
  it('compte les armes à POUDRE chargées, une par case, pas les arbalètes', () => {
    const char = gunner(2, [], [
      { itemId: 'petoire', quantity: 1 },
      { itemId: 'petoire', quantity: 1 },
      { itemId: 'mousquet', quantity: 1 },
      { itemId: 'arbalete-lourde', quantity: 1 },
    ]);
    // Deux pétoires + un mousquet = le cas canonique du livre, pile à la limite.
    expect(loadedFirearmCount(char)).toBe(ADVISED_LOADED_FIREARMS);
  });

  it('ne compte pas les armes déchargées', () => {
    const char = gunner(2, [], [
      { itemId: 'petoire', quantity: 1 },
      { itemId: 'petoire', quantity: 1, loaded: [] },
      { itemId: 'mousquet', quantity: 1, loaded: [] },
    ]);
    expect(loadedFirearmCount(char)).toBe(1);
  });

  it('dépasse la limite au-delà de trois armes à poudre chargées', () => {
    const char = gunner(2, [], [
      { itemId: 'petoire', quantity: 1 },
      { itemId: 'petoire', quantity: 1 },
      { itemId: 'petoire', quantity: 1 },
      { itemId: 'mousquet', quantity: 1 },
    ]);
    expect(loadedFirearmCount(char)).toBe(4);
  });

  it('un chargeur entamé reste UNE arme chargée', () => {
    const char = gunner(
      3,
      ['artilleur-r3'],
      [{ itemId: 'petoire', quantity: 1, magazine: true, loaded: shots(2) }],
    );
    expect(loadedFirearmCount(char)).toBe(1);
  });
});
