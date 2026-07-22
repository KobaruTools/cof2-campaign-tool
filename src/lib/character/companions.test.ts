import { describe, expect, it } from 'vitest';
import { featureById } from '@/data';
import { createBlankCharacter } from './factory';
import type { Character, Depletion } from './types';
import {
  displayCreatureProfile,
  listCompanions,
  pruneCompanionDepletion,
  pruneCompanionInstances,
  resolveCompanionInstanceLimit,
  resolveCreatureMaxHp,
} from './companions';

/** Personnage de test : niveau + capacités + choix, le reste par défaut. */
function char(over: Partial<Character> = {}): Character {
  return { ...createBlankCharacter({ now: '2026-01-01T00:00:00.000Z' }), level: 5, ...over };
}

/** Profil de créature d'une capacité (raccourci de test). */
function _profile(id: string) {
  return featureById.get(id)!.creatureProfile!;
}

describe('listCompanions', () => {
  it('liste un compagnon débloqué (golem) avec sa clé = id du rang porteur', () => {
    const c = char({ classId: 'forgesort', featureIds: ['golem-r1', 'golem-r2'] });
    const companions = listCompanions(c);
    expect(companions).toHaveLength(1);
    expect(companions[0].key).toBe('golem-r2');
    expect(companions[0].profile.name).toBe('Golem');
    // Rang atteint dans la voie = 2 (plus haut rang acquis de la voie golem).
    expect(companions[0].pathRank).toBe(2);
  });

  it('aucun compagnon si aucun rang porteur de profil', () => {
    expect(listCompanions(char({ featureIds: ['golem-r1'] }))).toHaveLength(0);
    expect(listCompanions(char({ featureIds: [] }))).toHaveLength(0);
  });

  it('loup → Mâle alpha : le remplacement supplante le loup de base', () => {
    const loup = listCompanions(char({ classId: 'rodeur', featureIds: ['compagnon-animal-r1'] }));
    expect(loup.map((e) => e.profile.name)).toEqual(['Loup']);

    const alpha = listCompanions(
      char({ classId: 'rodeur', featureIds: ['compagnon-animal-r1', 'compagnon-animal-r4'] }),
    );
    expect(alpha).toHaveLength(1);
    expect(alpha[0].key).toBe('compagnon-animal-r4');
    expect(alpha[0].profile.name).toBe('Mâle alpha');
  });

  it('chevalier : la Monture fantastique (rang 5) supplante la Fidèle monture (rang 1)', () => {
    // Fidèle monture seule (rang 1).
    const fidele = listCompanions(char({ classId: 'chevalier', featureIds: ['cavalier-r1'] }));
    expect(fidele.map((e) => e.profile.name)).toEqual(['Fidèle monture']);

    // Rang 5 acquis mais option NON choisie → pas de profil effectif → on garde la Fidèle monture.
    const r5NoChoice = listCompanions(
      char({ classId: 'chevalier', featureIds: ['cavalier-r1', 'cavalier-r5'] }),
    );
    expect(r5NoChoice.map((e) => e.profile.name)).toEqual(['Fidèle monture']);

    // Rang 5 avec la monture choisie → un seul compagnon, la monture fantastique.
    const r5Chosen = listCompanions(
      char({
        classId: 'chevalier',
        featureIds: ['cavalier-r1', 'cavalier-r5'],
        featureChoices: { 'cavalier-r5': ['war-horse'] },
      }),
    );
    expect(r5Chosen).toHaveLength(1);
    expect(r5Chosen[0].key).toBe('cavalier-r5');
    expect(r5Chosen[0].profile.name).toBe('Cheval de guerre lourd');
  });

  it('écuyer : compagnon sans bloc de caractéristiques (grille masquée)', () => {
    const c = char({ classId: 'chevalier', featureIds: ['noblesse-r1', 'noblesse-r2'] });
    const companions = listCompanions(c);
    expect(companions).toHaveLength(1);
    expect(companions[0].profile.name).toBe('Écuyer');
    expect(companions[0].profile.abilities).toBeUndefined();
  });

  it('invocation (démon) : masquée tant que le sort n’est pas actif, visible une fois invoqué', () => {
    // « Démon invoqué » non coché → pas de compagnon affiché.
    expect(listCompanions(char({ classId: 'sorcier', featureIds: ['demon-r5'] }))).toHaveLength(0);
    // Interrupteur temporaire actif (index 0) → le démon apparaît.
    const invoked = listCompanions(
      char({ classId: 'sorcier', featureIds: ['demon-r5'], effectToggles: { 'demon-r5': [true] } }),
    );
    expect(invoked).toHaveLength(1);
    expect(invoked[0].profile.name).toBe('Démon');
  });

  it('familier du magicien (PER-235) : invocation masquée tant que non invoquée', () => {
    // Depuis PER-235, le familier du magicien s'invoque (p. 96). Effets : index 0 « familier en
    // vue » (condition, bonus DEF), index 1 « Familier invoqué » (marqueur temporaire d'invocation).
    // Non invoqué (ou seulement « en vue ») → aucun compagnon affiché.
    expect(listCompanions(char({ classId: 'magicien', featureIds: ['magie-universelle-r2'] }))).toHaveLength(0);
    expect(
      listCompanions(
        char({ classId: 'magicien', featureIds: ['magie-universelle-r2'], effectToggles: { 'magie-universelle-r2': [true] } }),
      ),
    ).toHaveLength(0);
    // Marqueur d'invocation (index 1) actif → le familier apparaît.
    const invoked = listCompanions(
      char({ classId: 'magicien', featureIds: ['magie-universelle-r2'], effectToggles: { 'magie-universelle-r2': [false, true] } }),
    );
    expect(invoked.map((e) => e.profile.name)).toEqual(['Familier']);
  });

  it('serviteur invisible (PER-235) : invocation légère sans PV, masquée tant que non invoquée', () => {
    // Non invoqué → absent.
    expect(listCompanions(char({ classId: 'ensorceleur', featureIds: ['invocation-r2'] }))).toHaveLength(0);
    // Invoqué (marqueur index 0) → un bloc léger : profil SANS caractéristiques ni PV, avec descriptionRich.
    const invoked = listCompanions(
      char({ classId: 'ensorceleur', featureIds: ['invocation-r2'], effectToggles: { 'invocation-r2': [true] } }),
    );
    expect(invoked).toHaveLength(1);
    expect(invoked[0].profile.name).toBe('Serviteur invisible');
    expect(invoked[0].profile.abilities).toBeUndefined();
    expect(invoked[0].profile.hitPoints).toBeUndefined();
    expect(invoked[0].profile.descriptionRich).toBeTruthy();
    // Pas de PV résolubles → aucune barre de vie.
    expect(resolveCreatureMaxHp(invoked[0].profile, char().abilities, 5, 2)).toBeNull();
  });

  it('zombies (PER-235) : une entrée par instance, clé composite + numérotation, supprimable', () => {
    // Sans instance créée → aucun zombie affiché, même capacité acquise.
    expect(listCompanions(char({ classId: 'sorcier', featureIds: ['outre-tombe-r3'] }))).toHaveLength(0);
    // Deux instances créées → deux entrées indépendantes, clés composites, instanceIndex ordonné.
    const zombies = listCompanions(
      char({
        classId: 'sorcier',
        featureIds: ['outre-tombe-r3'],
        companionInstances: { 'outre-tombe-r3': ['a1', 'b2'] },
      }),
    );
    expect(zombies).toHaveLength(2);
    expect(zombies.map((e) => e.key)).toEqual(['outre-tombe-r3#a1', 'outre-tombe-r3#b2']);
    expect(zombies.map((e) => e.instanceId)).toEqual(['a1', 'b2']);
    expect(zombies.map((e) => e.instanceIndex)).toEqual([0, 1]);
    expect(zombies.every((e) => e.profile.name === 'Zombie')).toBe(true);
  });

  it('plusieurs compagnons de voies distinctes coexistent', () => {
    const c = char({ classId: 'chevalier', featureIds: ['cavalier-r1', 'noblesse-r2'] });
    const companions = listCompanions(c);
    expect(companions.map((e) => e.profile.name).sort()).toEqual(['Fidèle monture', 'Écuyer']);
  });
});

describe('resolveCreatureMaxHp', () => {
  it('résout une quantité niveau × N en nombre', () => {
    const golem = featureById.get('golem-r2')!.creatureProfile!;
    // [=niveau × 5] au niveau 5 → 25.
    expect(resolveCreatureMaxHp(golem, char().abilities, 5, 2)).toBe(25);
  });

  it('résout une constante + niveau × N (fidèle monture)', () => {
    const mount = featureById.get('cavalier-r1')!.creatureProfile!;
    // [=10 + niveau × 4] au niveau 5 → 30.
    expect(resolveCreatureMaxHp(mount, char().abilities, 5, 1)).toBe(30);
  });
});

describe('pruneCompanionDepletion', () => {
  it('purge un compagnon disparu et normalise les manques restants', () => {
    const c = char({ classId: 'forgesort', featureIds: ['golem-r1', 'golem-r2'] });
    const record: Record<string, Depletion> = {
      'golem-r2': { hp: { lethal: 4, temp: 0 } }, // compagnon vivant → conservé
      'cavalier-r1': { hp: { lethal: 3, temp: 0 } }, // compagnon absent → purgé
      'compagnon-animal-r4': { hp: { lethal: 0, temp: 0 } }, // absent + vide → purgé
    };
    expect(pruneCompanionDepletion(record, c)).toEqual({ 'golem-r2': { hp: { lethal: 4, temp: 0 } } });
  });

  it('retire une entrée redevenue pleine même pour un compagnon vivant', () => {
    const c = char({ classId: 'forgesort', featureIds: ['golem-r2'] });
    expect(pruneCompanionDepletion({ 'golem-r2': { hp: { lethal: 0, temp: 0 } } }, c)).toEqual({});
  });

  it('purge les PV d’une instance de zombie disparue (clé composite)', () => {
    const c = char({
      classId: 'sorcier',
      featureIds: ['outre-tombe-r3'],
      companionInstances: { 'outre-tombe-r3': ['a1'] },
    });
    const record: Record<string, Depletion> = {
      'outre-tombe-r3#a1': { hp: { lethal: 3, temp: 0 } }, // instance vivante → conservée
      'outre-tombe-r3#zz': { hp: { lethal: 5, temp: 0 } }, // instance disparue → purgée
    };
    expect(pruneCompanionDepletion(record, c)).toEqual({ 'outre-tombe-r3#a1': { hp: { lethal: 3, temp: 0 } } });
  });
});

describe('resolveCompanionInstanceLimit', () => {
  it('zombie : 1 + une par voie de sorcier au rang 5', () => {
    const profile = _profile('outre-tombe-r3');
    // Voie outre-tombe au rang 3 seulement → aucune voie au rang 5 → limite 1.
    expect(resolveCompanionInstanceLimit(profile, char({ classId: 'sorcier', featureIds: ['outre-tombe-r3'] }))).toBe(1);
    // Voie outre-tombe au rang 5 (voie hôte incluse) → limite 2.
    expect(
      resolveCompanionInstanceLimit(
        profile,
        char({ classId: 'sorcier', featureIds: ['outre-tombe-r3', 'outre-tombe-r5'] }),
      ),
    ).toBe(2);
  });

  it('0 pour un profil non multi-instances', () => {
    expect(resolveCompanionInstanceLimit(_profile('golem-r2'), char())).toBe(0);
  });
});

describe('applyCreatureUpgrades (Golem supérieur, PER-94)', () => {
  function forgesortGolem(options: string[]): Character {
    return char({
      classId: 'forgesort',
      featureIds: ['golem-r1', 'golem-r2', 'golem-r5'],
      featureChoices: { 'golem-r5': [options] },
    });
  }

  it('cumule les bonus chiffrés des options retenues (Armure + Grande taille + Puissant)', () => {
    const c = forgesortGolem(['armor', 'large', 'mighty']);
    const p = displayCreatureProfile(featureById.get('golem-r2')!, c)!;
    // FOR : base 1 + Grande taille 1 + Puissant 2 = 4.
    expect(p.abilities!.FOR).toBe(4);
    // DEF : Armure +5 injecté dans l'expression.
    expect(p.defense).toBe('[10 + rang + 5]');
    // PV : Grande taille +2/niveau injecté.
    expect(p.hitPoints).toBe('[=niveau × 5 + niveau × 2]');
    // DM au contact : +1 (Grande taille) +2 (Puissant) = +3 plat.
    expect(p.attack!.damage).toBe('[1d4° + 1 + 3]');
    // Barre de vie : niveau × 7 au niveau 5 → 35.
    expect(resolveCreatureMaxHp(p, c.abilities, 5, 2)).toBe(35);
  });

  it('Baliste : attaque à distance supplémentaire, DM baké sur l’AGI du golem', () => {
    // AGI de base du golem = -1 → DM baliste = 1d4° - 1.
    const c = forgesortGolem(['ballista']);
    const p = displayCreatureProfile(featureById.get('golem-r2')!, c)!;
    expect(p.extraAttacks).toHaveLength(1);
    expect(p.extraAttacks![0]).toMatchObject({ label: 'Baliste', ranged: true, damage: '[1d4° - 1]' });

    // Avec Forme de félin (AGI +3 → +2) : DM baliste = 1d4° + 2.
    const c2 = forgesortGolem(['ballista', 'feline-form']);
    const p2 = displayCreatureProfile(featureById.get('golem-r2')!, c2)!;
    expect(p2.abilities!.AGI).toBe(2);
    expect(p2.extraAttacks![0].damage).toBe('[1d4° + 2]');
    // Forme de félin : +3 DEF aussi.
    expect(p2.defense).toBe('[10 + rang + 3]');
  });

  it('sans amélioration retenue, le profil de base est inchangé', () => {
    const c = char({ classId: 'forgesort', featureIds: ['golem-r1', 'golem-r2'] });
    const p = displayCreatureProfile(featureById.get('golem-r2')!, c)!;
    expect(p.defense).toBe('[10 + rang]');
    expect(p.extraAttacks).toBeUndefined();
  });
});

describe('pruneCompanionInstances', () => {
  it('conserve les instances d’une capacité multi-instances acquise, purge les autres', () => {
    const c = char({ classId: 'sorcier', featureIds: ['outre-tombe-r3'] });
    const record: Record<string, string[]> = {
      'outre-tombe-r3': ['a1', 'b2'], // capacité acquise + multi-instances → conservé
      'golem-r2': ['x'], // pas acquise (et pas multi-instances) → purgé
    };
    expect(pruneCompanionInstances(record, c)).toEqual({ 'outre-tombe-r3': ['a1', 'b2'] });
  });

  it('normalise ids vides/doublons et retire une liste vidée', () => {
    const c = char({ classId: 'sorcier', featureIds: ['outre-tombe-r3'] });
    expect(pruneCompanionInstances({ 'outre-tombe-r3': ['a', 'a', '', 'b'] }, c)).toEqual({
      'outre-tombe-r3': ['a', 'b'],
    });
    expect(pruneCompanionInstances({ 'outre-tombe-r3': [] }, c)).toEqual({});
  });
});
