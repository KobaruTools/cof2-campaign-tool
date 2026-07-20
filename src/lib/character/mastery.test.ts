import { describe, expect, it } from 'vitest';
import { equipmentById } from '@/data';
import type { Weapon } from '@/data/schema';
import { rulesContext } from './rulesContext';
import { createBlankCharacter } from './factory';
import type { Character } from './types';
import {
  ancestryWeaponMasteryIds,
  isWeaponMastered,
  masteredClassIds,
  sacredWeaponMasteryIds,
} from './mastery';

const ctx = rulesContext;
const weapon = (id: string) => equipmentById.get(id) as Weapon;

function makeChar(over: Partial<Character>): Character {
  return {
    ...createBlankCharacter({ now: '2026-01-01T00:00:00.000Z' }),
    ancestryId: 'humain',
    ancestryPathId: 'humain',
    ...over,
  };
}

describe('masteredClassIds', () => {
  it('le profil principal est toujours maîtrisé (fiche « Armes & armures maîtrisées »)', () => {
    const magicien = makeChar({ classId: 'magicien' });
    expect(masteredClassIds(magicien, ctx).has('magicien')).toBe(true);
  });

  it('≥ 2 rangs dans une voie d’un autre profil → ce profil est maîtrisé (p. 177)', () => {
    // Magicien qui a investi 2 rangs dans une voie de guerrier (voie du combat).
    const magicien = makeChar({
      classId: 'magicien',
      featureIds: ['combat-r1', 'combat-r2'],
    });
    const mastered = masteredClassIds(magicien, ctx);
    expect(mastered.has('magicien')).toBe(true);
    expect(mastered.has('guerrier')).toBe(true);
  });

  it('< 2 rangs dans une voie d’un autre profil → ce profil n’est PAS maîtrisé', () => {
    const magicien = makeChar({
      classId: 'magicien',
      featureIds: ['combat-r1'],
    });
    const mastered = masteredClassIds(magicien, ctx);
    expect(mastered.has('magicien')).toBe(true);
    expect(mastered.has('guerrier')).toBe(false);
  });

  it('hybride créé au niveau 1 → les DEUX profils maîtrisés d’office, dès le rang 1 (p. 180)', () => {
    // Guerrier totem : barbare (profil principal) + druide/magicien pris à la création,
    // rang 1 dans chaque voie. Les deux profils sont maîtrisés bien qu’il n’y ait qu’un
    // rang dans la voie du second profil.
    const level1 = ['rage-r1', 'magie-des-arcanes-r1', 'humain-r1'];
    const hybride = makeChar({
      classId: 'barbare',
      featureIds: level1,
      levelUpHistory: [{ level: 1, chosenFeatureIds: level1 }],
    });
    const mastered = masteredClassIds(hybride, ctx);
    expect(mastered.has('barbare')).toBe(true);
    expect(mastered.has('magicien')).toBe(true);
  });

  it('hybridé APRÈS la création : le second profil suit la règle des ≥ 2 rangs (p. 177)', () => {
    // Barbare qui ouvre une voie de magicien plus tard, mais n’y a qu’un seul rang :
    // l’entrée d’historique de niveau 1 ne contient que des voies de barbare.
    const magiePris = makeChar({
      classId: 'barbare',
      featureIds: ['rage-r1', 'brute-r1', 'humain-r1', 'magie-des-arcanes-r1'],
      levelUpHistory: [{ level: 1, chosenFeatureIds: ['rage-r1', 'brute-r1', 'humain-r1'] }],
    });
    const mastered = masteredClassIds(magiePris, ctx);
    expect(mastered.has('barbare')).toBe(true);
    expect(mastered.has('magicien')).toBe(false);
  });
});

describe('isWeaponMastered', () => {
  const magicienIds = masteredClassIds(makeChar({ classId: 'magicien' }), ctx);
  const barbareIds = masteredClassIds(makeChar({ classId: 'barbare' }), ctx);
  const arquebusierIds = masteredClassIds(makeChar({ classId: 'arquebusier' }), ctx);
  const guerrierIds = masteredClassIds(makeChar({ classId: 'guerrier' }), ctx);

  it('le magicien maîtrise les armes listées par son profil (dague, bâton)', () => {
    expect(isWeaponMastered(weapon('dague'), magicienIds, ctx, true)).toBe(true);
    expect(isWeaponMastered(weapon('baton'), magicienIds, ctx, true)).toBe(true);
  });

  it('le magicien maîtrise le bâton ferré : même famille que le bâton (p. 184, arme de départ)', () => {
    // Le magicien ne liste que « bâton » mais reçoit un bâton ferré en équipement de
    // départ (p. 102). Bâton et bâton ferré sont une même famille — le ferrage ne
    // change que les DM, pas le type d’arme —, donc maîtriser l’un maîtrise l’autre.
    expect(isWeaponMastered(weapon('baton-ferre'), magicienIds, ctx, true)).toBe(true);
  });

  it('réciproque : un profil listant le bâton ferré (druide) maîtrise le bâton simple', () => {
    const druideIds = masteredClassIds(makeChar({ classId: 'druide' }), ctx);
    expect(isWeaponMastered(weapon('baton-ferre'), druideIds, ctx, true)).toBe(true);
    expect(isWeaponMastered(weapon('baton'), druideIds, ctx, true)).toBe(true);
  });

  it('le magicien ne maîtrise pas une arme hors de son accès (épée longue)', () => {
    expect(isWeaponMastered(weapon('epee-longue'), magicienIds, ctx, true)).toBe(false);
  });

  it('un magicien ayant ≥ 2 rangs de guerrier maîtrise alors l’épée longue', () => {
    const hybride = makeChar({ classId: 'magicien', featureIds: ['combat-r1', 'combat-r2'] });
    const mastered = masteredClassIds(hybride, ctx);
    expect(isWeaponMastered(weapon('epee-longue'), mastered, ctx, true)).toBe(true);
  });

  it('seul un profil « poudrier » maîtrise les armes à poudre (p. 185)', () => {
    // Poudre autorisée : le guerrier (accès « toutes les armes à distance ») ne
    // maîtrise PAS le mousquet ; l’arquebusier oui.
    expect(isWeaponMastered(weapon('mousquet'), guerrierIds, ctx, true)).toBe(false);
    expect(isWeaponMastered(weapon('mousquet'), arquebusierIds, ctx, true)).toBe(true);
  });

  it('armes à feu interdites : l’objet dual compte comme arbalète et suit l’accès à distance', () => {
    // Poudre interdite (firearmsAllowed = false) : le « Mousquet ou arbalète lourde »
    // est l’arbalète → maîtrisé par l’accès à distance normal du guerrier.
    expect(isWeaponMastered(weapon('mousquet'), guerrierIds, ctx, false)).toBe(true);
  });

  it('une arme retirée de l’accès global du profil n’est pas maîtrisée (barbare / arbalète)', () => {
    expect(isWeaponMastered(weapon('arbalete-legere'), barbareIds, ctx, true)).toBe(false);
    // …mais le barbare maîtrise l’arc, qui n’est pas exclu.
    expect(isWeaponMastered(weapon('arc-court'), barbareIds, ctx, true)).toBe(true);
  });

  it('l’accès « armes de contact à une main » exclut les armes à deux mains', () => {
    // Arquebusier : meleeAccess « oneHanded ». Il maîtrise l’épée longue (à une main)
    // mais pas l’espadon/bâton (à deux mains).
    expect(isWeaponMastered(weapon('epee-longue'), arquebusierIds, ctx, true)).toBe(true);
    expect(isWeaponMastered(weapon('baton'), arquebusierIds, ctx, true)).toBe(false);
  });
});

describe('sacredWeaponMasteryIds (arme sacrée du prêtre spécialiste, PER-96)', () => {
  it('généraliste : aucune arme sacrée ajoutée', () => {
    const pretre = makeChar({ classId: 'pretre', priestVocation: { mode: 'generalist' } });
    expect(sacredWeaponMasteryIds(pretre).size).toBe(0);
  });

  it('personnage sans vocation de prêtre : aucune arme sacrée ajoutée', () => {
    const magicien = makeChar({ classId: 'magicien', priestVocation: undefined });
    expect(sacredWeaponMasteryIds(magicien).size).toBe(0);
  });

  it('spécialiste d’Axénder : l’épée longue (tranchante) devient sacrée', () => {
    const pretre = makeChar({ classId: 'pretre', priestVocation: { mode: 'specialist', godId: 'axender' } });
    expect(sacredWeaponMasteryIds(pretre).has('epee-longue')).toBe(true);
  });

  it('variantes « au choix » : toutes prises en compte (Arwendée = arc long OU court)', () => {
    const pretre = makeChar({ classId: 'pretre', priestVocation: { mode: 'specialist', godId: 'arwendee' } });
    const ids = sacredWeaponMasteryIds(pretre);
    expect(ids.has('arc-long')).toBe(true);
    expect(ids.has('arc-court')).toBe(true);
  });

  it('cohérence des familles d’armes : un dieu au bâton couvre aussi le bâton ferré', () => {
    // Arcanna → arme sacrée « bâton ». Le bâton ferré est de la même famille (p. 184).
    const pretre = makeChar({ classId: 'pretre', priestVocation: { mode: 'specialist', godId: 'arcanna' } });
    const ids = sacredWeaponMasteryIds(pretre);
    expect(ids.has('baton')).toBe(true);
    expect(ids.has('baton-ferre')).toBe(true);
  });
});

describe('isWeaponMastered avec arme sacrée (PER-96)', () => {
  const pretreIds = masteredClassIds(makeChar({ classId: 'pretre' }), ctx);

  it('le prêtre de base ne maîtrise pas les armes tranchantes/perçantes', () => {
    // Sans exception : l’épée longue reste non maîtrisée (accès none/none, contondantes only).
    expect(isWeaponMastered(weapon('epee-longue'), pretreIds, ctx, true)).toBe(false);
  });

  it('spécialiste : son arme sacrée est maîtrisée même tranchante (Axénder / épée longue)', () => {
    const pretre = makeChar({ classId: 'pretre', priestVocation: { mode: 'specialist', godId: 'axender' } });
    const sacred = sacredWeaponMasteryIds(pretre);
    expect(isWeaponMastered(weapon('epee-longue'), pretreIds, ctx, true, sacred)).toBe(true);
  });

  it('spécialiste : les AUTRES armes tranchantes/perçantes restent non maîtrisées', () => {
    const pretre = makeChar({ classId: 'pretre', priestVocation: { mode: 'specialist', godId: 'axender' } });
    const sacred = sacredWeaponMasteryIds(pretre);
    expect(isWeaponMastered(weapon('dague'), pretreIds, ctx, true, sacred)).toBe(false);
    expect(isWeaponMastered(weapon('rapiere'), pretreIds, ctx, true, sacred)).toBe(false);
  });

  it('généraliste : aucune exception, l’épée longue reste non maîtrisée', () => {
    const pretre = makeChar({ classId: 'pretre', priestVocation: { mode: 'generalist' } });
    const sacred = sacredWeaponMasteryIds(pretre);
    expect(isWeaponMastered(weapon('epee-longue'), pretreIds, ctx, true, sacred)).toBe(false);
  });
});

describe('ancestryWeaponMasteryIds (nain « Haches et marteaux », PER-154)', () => {
  it('nain avec nain-r2 : haches et marteau maîtrisés, quel que soit le profil', () => {
    const nain = makeChar({
      classId: 'magicien',
      ancestryId: 'nain',
      ancestryPathId: 'nain',
      featureIds: ['nain-r2'],
    });
    const ids = ancestryWeaponMasteryIds(nain);
    // Familles hache (axes) + marteau de guerre (hammers).
    expect(ids.has('hache')).toBe(true);
    expect(ids.has('hache-a-deux-mains')).toBe(true);
    expect(ids.has('hachette')).toBe(true);
    expect(ids.has('marteau')).toBe(true);
    // Autres armes contondantes : PAS couvertes (masse, fléau, gourdin).
    expect(ids.has('masse')).toBe(false);
    expect(ids.has('fleau')).toBe(false);
    expect(ids.has('gourdin')).toBe(false);
  });

  it('nain sans nain-r2 (rang 1 seulement) : ensemble vide', () => {
    const nain = makeChar({ ancestryId: 'nain', ancestryPathId: 'nain', featureIds: ['nain-r1'] });
    expect(ancestryWeaponMasteryIds(nain).size).toBe(0);
  });

  it('non-nain : ensemble vide', () => {
    const humain = makeChar({ classId: 'guerrier', featureIds: [] });
    expect(ancestryWeaponMasteryIds(humain).size).toBe(0);
  });
});

describe('isWeaponMastered avec octroi de peuple (nain, PER-154)', () => {
  const magicienIds = masteredClassIds(makeChar({ classId: 'magicien' }), ctx);

  it('un nain magicien maîtrise la hache par octroi de peuple, malgré son profil', () => {
    const nain = makeChar({
      classId: 'magicien',
      ancestryId: 'nain',
      ancestryPathId: 'nain',
      featureIds: ['nain-r2'],
    });
    const extra = ancestryWeaponMasteryIds(nain);
    // Sans l'octroi : un magicien ne maîtrise pas la hache.
    expect(isWeaponMastered(weapon('hache'), magicienIds, ctx, true)).toBe(false);
    // Avec l'octroi de peuple : maîtrisée.
    expect(isWeaponMastered(weapon('hache'), magicienIds, ctx, true, extra)).toBe(true);
    expect(isWeaponMastered(weapon('marteau'), magicienIds, ctx, true, extra)).toBe(true);
    // La masse reste non maîtrisée (hors haches/marteau).
    expect(isWeaponMastered(weapon('masse'), magicienIds, ctx, true, extra)).toBe(false);
  });
});
