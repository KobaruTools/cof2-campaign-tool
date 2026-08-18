import { describe, expect, it } from 'vitest';
import { featureById } from '@/data';
import { resolveCreatureAbilities } from '@/lib/ui/creature';
import { createBlankCharacter } from './factory';
import type { Character, Depletion } from './types';
import {
  applyCreatureUpgrades,
  companionMountEnSelle,
  creatureDefenseBreakdown,
  displayCreatureProfile,
  effectiveCreatureProfile,
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

describe('companionMountEnSelle (PER-216)', () => {
  it('Fidèle monture (cavalier-r1) SANS Cavalier émérite → pas de toggle (null)', () => {
    const c = char({ classId: 'chevalier', featureIds: ['cavalier-r1'] });
    const mount = listCompanions(c)[0];
    expect(companionMountEnSelle(c, mount)).toBeNull();
  });

  it('avec Cavalier émérite (cavalier-r2) → toggle = cette monture est celle chevauchée (mountedKey)', () => {
    const off = char({ classId: 'chevalier', featureIds: ['cavalier-r1', 'cavalier-r2'] });
    expect(companionMountEnSelle(off, listCompanions(off)[0])).toBe(false);

    const on = char({
      classId: 'chevalier',
      featureIds: ['cavalier-r1', 'cavalier-r2'],
      mountedKey: 'cavalier-r1',
    });
    expect(companionMountEnSelle(on, listCompanions(on)[0])).toBe(true);
  });

  it('Monture fantastique (cavalier-r5) est aussi chevauchable', () => {
    const c = char({
      classId: 'chevalier',
      featureIds: ['cavalier-r1', 'cavalier-r2', 'cavalier-r5'],
      featureChoices: { 'cavalier-r5': ['war-horse'] },
      mountedKey: 'cavalier-r5',
    });
    const mount = listCompanions(c)[0];
    expect(mount.profile.name).toBe('Cheval de guerre lourd');
    expect(companionMountEnSelle(c, mount)).toBe(true);
  });

  it('un compagnon NON monture (golem) n’a jamais de toggle', () => {
    const c = char({ classId: 'forgesort', featureIds: ['golem-r1', 'golem-r2'] });
    expect(companionMountEnSelle(c, listCompanions(c)[0])).toBeNull();
  });
});

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

  it('capacité EMPRUNTÉE (PER-73, elfe-sylvain-r2 → compagnon-animal-r1) reste un compagnon visible', () => {
    const c = char({
      classId: 'druide',
      featureIds: ['elfe-sylvain-r1', 'elfe-sylvain-r2'],
      featureChoices: { 'elfe-sylvain-r2': ['compagnon-animal-r1'] },
    });
    const companions = listCompanions(c);
    expect(companions.map((e) => e.profile.name)).toEqual(['Loup']);
    expect(companions[0].key).toBe('compagnon-animal-r1');
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

  it('forme de loup (PER-74, transformation) : EXCLUE de la section Compagnons mais rendue inline', () => {
    const c = char({
      classId: 'barbare',
      level: 10,
      abilities: { FOR: 3, AGI: 2, CON: 2, PER: 1, CHA: 0, INT: -1, VOL: 1 },
      featureIds: ['prestige-lycanthrope-r4', 'prestige-lycanthrope-r5'],
    });
    // La transformation n'est PAS un compagnon → aucune entrée dans « Compagnons ».
    expect(listCompanions(c)).toHaveLength(0);
    // Mais le stat-block du loup reste disponible pour le rendu inline de la carte.
    const wolf = displayCreatureProfile(featureById.get('prestige-lycanthrope-r5')!, c)!;
    expect(wolf.name).toBe('Loup');
    expect(wolf.transformation).toBe(true);
    // FOR/AGI fixées (+3/+1) ; les autres héritées du maître (delta 0).
    const ab = resolveCreatureAbilities(wolf, c.abilities)!;
    expect(ab.FOR).toBe(3);
    expect(ab.AGI).toBe(1);
    expect(ab.CON).toBe(2); // = celle du maître
    expect(ab.VOL).toBe(1);
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

  it('invocation majeure (PER-363) : Monture fantôme est un compagnon, Chasseur ailé JAMAIS (summonedEnemy)', () => {
    const featureIds = ['prestige-invocation-majeure-r4', 'prestige-invocation-majeure-r7'];
    // Aucune des deux invoquée → aucun compagnon.
    expect(listCompanions(char({ classId: 'magicien', featureIds }))).toHaveLength(0);
    // Seule la monture invoquée → une entrée, profil léger.
    const mountOnly = listCompanions(
      char({ classId: 'magicien', featureIds, effectToggles: { 'prestige-invocation-majeure-r4': [true] } }),
    );
    expect(mountOnly.map((e) => e.profile.name)).toEqual(['Monture fantôme']);
    // Les DEUX « invoquées » EN MÊME TEMPS (interrupteur actif) → SEULE la monture reste un
    // compagnon. Le chasseur ailé est un ADVERSAIRE (retour propriétaire, PER-363) : son interrupteur
    // ajoute une créature ennemie dans l'écran de combat (`useCharacterGameState.ts`, MJ uniquement)
    // — il ne doit JAMAIS apparaître dans la section « Compagnons », ni côté joueur ni côté roster MJ.
    const both = listCompanions(
      char({
        classId: 'magicien',
        featureIds,
        effectToggles: {
          'prestige-invocation-majeure-r4': [true],
          'prestige-invocation-majeure-r7': [true],
        },
      }),
    );
    expect(both.map((e) => e.profile.name)).toEqual(['Monture fantôme']);
  });

  it("invocation majeure (PER-363) : l'amélioration « Court sur l'eau »/« Vol » de r6/r8 ne cible QUE la monture, pas le chasseur (targetSlot)", () => {
    // Chasseur ailé n'apparaissant plus JAMAIS dans `listCompanions` (summonedEnemy), on vérifie le
    // primitif `targetSlot` directement sur les profils résolus (même mécanisme que `listCompanions`
    // utiliserait s'il ne le filtrait pas) — la garantie utile reste : l'amélioration de r6/r8 ne
    // doit cibler QUE le slot de la monture, jamais celui du chasseur, même de manière invisible.
    const c = char({
      classId: 'magicien',
      featureIds: [
        'prestige-invocation-majeure-r4',
        'prestige-invocation-majeure-r6',
        'prestige-invocation-majeure-r7',
        'prestige-invocation-majeure-r8',
      ],
    });
    const mountFeature = featureById.get('prestige-invocation-majeure-r4')!;
    const hawkFeature = featureById.get('prestige-invocation-majeure-r7')!;
    const mountProfile = applyCreatureUpgrades(effectiveCreatureProfile(mountFeature, c)!, c, mountFeature.pathId);
    const hawkProfile = applyCreatureUpgrades(effectiveCreatureProfile(hawkFeature, c)!, c, hawkFeature.pathId);
    expect(mountProfile.specialAbilities?.map((a) => a.name)).toEqual([
      'Insensible aux terrains difficiles',
      "Court sur l'eau",
      'Vol',
    ]);
    // Le chasseur garde SES DEUX SEULES capacités — sans `targetSlot`, il hériterait à tort de
    // « Court sur l'eau »/« Vol » (même `pathId` que la monture).
    expect(hawkProfile.specialAbilities?.map((a) => a.name)).toEqual(['Vol rapide', 'Enlèvement']);
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

describe('companionType (PER-175)', () => {
  it('recopie le type déclaré sur le profil pour chaque famille de compagnon', () => {
    const golem = listCompanions(char({ classId: 'forgesort', featureIds: ['golem-r1', 'golem-r2'] }));
    expect(golem[0].companionType).toBe('summon');

    const ecuyer = listCompanions(char({ classId: 'chevalier', featureIds: ['noblesse-r1', 'noblesse-r2'] }));
    expect(ecuyer[0].companionType).toBe('companion');

    const monture = listCompanions(char({ classId: 'chevalier', featureIds: ['cavalier-r1'] }));
    expect(monture[0].companionType).toBe('mount');

    const loup = listCompanions(char({ classId: 'rodeur', featureIds: ['compagnon-animal-r1'] }));
    expect(loup[0].companionType).toBe('animal');
  });

  it('présence et taxonomie sont orthogonales : le familier du magicien (invoqué) reste `familiar`', () => {
    const invoked = listCompanions(
      char({
        classId: 'magicien',
        featureIds: ['magie-universelle-r2'],
        effectToggles: { 'magie-universelle-r2': [false, true] },
      }),
    );
    expect(invoked[0].companionType).toBe('familiar');
  });

  it('familier fantastique choisi : s’affiche via la mini-fiche commune avec ses écarts de carac', () => {
    // Rang 3 acquis mais aucun familier choisi → pas de profil effectif → aucun compagnon.
    expect(listCompanions(char({ featureIds: ['prestige-familier-fantastique-r3'] }))).toHaveLength(0);

    // Lézard voltaïque choisi → un compagnon `familiar`, FOR -6 (écart -2 sur le gabarit -4).
    const lezard = listCompanions(
      char({
        featureIds: ['prestige-familier-fantastique-r3'],
        featureChoices: { 'prestige-familier-fantastique-r3': ['lezard-voltaique'] },
      }),
    );
    expect(lezard).toHaveLength(1);
    expect(lezard[0].companionType).toBe('familiar');
    expect(lezard[0].profile.name).toBe('Lézard voltaïque');
    expect(lezard[0].profile.size).toBe('petite');
    expect(lezard[0].profile.abilities!.FOR).toBe(-6);
    // PV du gabarit minuscule [=niveau × 2] au niveau 5 → 10.
    expect(resolveCreatureMaxHp(lezard[0].profile, char().abilities, 5, 3)).toBe(10);

    // Fée : choix distinct du lutin, écart CHA +2 sur le gabarit -2 → CHA 0.
    const fee = listCompanions(
      char({
        featureIds: ['prestige-familier-fantastique-r3'],
        featureChoices: { 'prestige-familier-fantastique-r3': ['fee'] },
      }),
    );
    expect(fee[0].profile.abilities!.CHA).toBe(0);
  });

  it('minimoï : caractéristiques DÉRIVÉES du maître (FOR fixe -3, AGI = maître +2, autres = maître -2)', () => {
    const master = char({
      abilities: { FOR: 0, AGI: 1, CON: 2, PER: 0, CHA: -1, INT: 3, VOL: 1 },
      featureIds: ['prestige-familier-fantastique-r3'],
      featureChoices: { 'prestige-familier-fantastique-r3': ['minimoi'] },
    });
    const minimoi = listCompanions(master);
    expect(minimoi[0].companionType).toBe('familiar');
    expect(minimoi[0].profile.size).toBe('minuscule');
    // FOR fixe -3 ; AGI 1+2=3 ; CON 2-2=0 ; PER 0-2=-2 ; CHA -1-2=-3 ; INT 3-2=1 ; VOL 1-2=-1.
    expect(resolveCreatureAbilities(minimoi[0].profile, master.abilities)).toEqual({
      FOR: -3,
      AGI: 3,
      CON: 0,
      PER: -2,
      CHA: -3,
      INT: 1,
      VOL: -1,
    });
  });

  it('particularités modélisées en capacités (specialAbilities) avec richText parsable', () => {
    const araignee = listCompanions(
      char({
        featureIds: ['prestige-familier-fantastique-r3'],
        featureChoices: { 'prestige-familier-fantastique-r3': ['araignee-geante'] },
      }),
    )[0];
    const abilities = araignee.profile.specialAbilities ?? [];
    expect(abilities.map((a) => a.name)).toEqual(['Poison', 'Escalade']);
    // Le richText du Poison porte les jetons (dé + difficulté) → parsé, pas laissé littéral.
    const poison = abilities.find((a) => a.name === 'Poison')!;
    expect(poison.richText).toContain('{1d4°}');
    expect(poison.richText).toContain('[10 + rang]');
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

describe('bonus maître → créature (PER-94)', () => {
  describe('Runes de défense → golem (cross-voie, DEF stepped par rang de la voie runes)', () => {
    function forgesort(...featureIds: string[]): Character {
      return char({ classId: 'forgesort', featureIds: ['golem-r1', 'golem-r2', ...featureIds] });
    }
    const golemDef = (c: Character) => displayCreatureProfile(featureById.get('golem-r2')!, c)!.defense;

    it('sans rune → golem inchangé (rétro-compat)', () => {
      expect(golemDef(forgesort())).toBe('[10 + rang]');
    });

    it('rune au rang 1 → +2 en DEF du golem', () => {
      expect(golemDef(forgesort('runes-r1'))).toBe('[10 + rang + 2]');
    });

    it('rune au rang 3 → +3, au rang 5 → +4 (palier par rang de la voie runes)', () => {
      expect(golemDef(forgesort('runes-r1', 'runes-r2', 'runes-r3'))).toBe('[10 + rang + 3]');
      expect(golemDef(forgesort('runes-r1', 'runes-r2', 'runes-r3', 'runes-r4', 'runes-r5'))).toBe(
        '[10 + rang + 4]',
      );
    });

    // PER-256 : la ventilation par source explique l'écart de DEF (Base + Rang + capacité propagée).
    it('creatureDefenseBreakdown ventile la DEF du golem par source (Base + Rang + Runes)', () => {
      const c = forgesort('runes-r1');
      const profile = displayCreatureProfile(featureById.get('golem-r2')!, c)!;
      // Rang atteint dans la voie du golem = 2 ; niveau inerte pour la DEF.
      const bd = creatureDefenseBreakdown(profile, c.abilities, c.level, 2);
      expect(bd).toBeDefined();
      // 10 (base) + 2 (rang) + 2 (Runes de défense au rang 1) = 14.
      expect(bd!.total).toBe(14);
      expect(bd!.contributions).toEqual([
        { label: 'Base', value: 10 },
        { label: 'Rang', value: 2 },
        { label: featureById.get('runes-r1')!.name, value: 2, featureId: 'runes-r1' },
      ]);
    });

    it('creatureDefenseBreakdown ventile aussi un golem SANS bonus de maître (Base + Rang seulement)', () => {
      const c = forgesort();
      const profile = displayCreatureProfile(featureById.get('golem-r2')!, c)!;
      const bd = creatureDefenseBreakdown(profile, c.abilities, c.level, 2);
      expect(bd).toBeDefined();
      expect(bd!.total).toBe(12);
      expect(bd!.contributions).toEqual([
        { label: 'Base', value: 10 },
        { label: 'Rang', value: 2 },
      ]);
    });
  });

  describe('Tactiques de meute → loup (même voie, DEF milestone par voie de rôdeur au rang 5)', () => {
    function rodeur(...featureIds: string[]): Character {
      return char({ classId: 'rodeur', featureIds: ['compagnon-animal-r1', 'compagnon-animal-r4', ...featureIds] });
    }
    const loupDef = (c: Character) => listCompanions(c)[0].profile.defense;

    it('sans Tactiques de meute → Mâle alpha à DEF 18 (fix `[18]` littéral)', () => {
      expect(loupDef(rodeur())).toBe('[18]');
    });

    it('Tactiques de meute (compagnon-animal au rang 5) → +1 en DEF du loup', () => {
      expect(loupDef(rodeur('compagnon-animal-r5'))).toBe('[18 + 1]');
    });

    it('deux voies de rôdeur au rang 5 → +2 (palier de famille, cross-voie)', () => {
      const c = rodeur(
        'compagnon-animal-r5',
        'survie-r1',
        'survie-r2',
        'survie-r3',
        'survie-r4',
        'survie-r5',
      );
      expect(loupDef(c)).toBe('[18 + 2]');
    });
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

describe('PER-74 — le drake du chevalier dragon (p. 147-148)', () => {
  /**
   * Chevalier avec la voie du cavalier COMPLÈTE (le prérequis du livre : Monture fantastique au rang 5,
   * réglée sur le drake) + les rangs de prestige demandés. La voie entière compte : c'est Cavalier
   * émérite (r2) qui porte l'état « en selle », sans lequel aucune monture ne peut être déclarée montée.
   */
  const knight = (prestigeRanks: number[] = [], over: Partial<Character> = {}) =>
    char({
      classId: 'chevalier',
      level: 16,
      featureIds: [
        'cavalier-r1',
        'cavalier-r2',
        'cavalier-r3',
        'cavalier-r4',
        'cavalier-r5',
        ...prestigeRanks.map((r) => `prestige-chevalier-dragon-r${r}`),
      ],
      // 2ᵉ slot = COULEUR du drake (PER-74). Rouge = la voie telle qu'imprimée dans le livre.
      featureChoices: { 'cavalier-r5': ['drake', 'fire'] },
      ...over,
    });

  it('Monture fantastique propose le drake, monture volante à partir du niveau 9', () => {
    const choice = featureById.get('cavalier-r5')!.choices![0];
    const drake = choice.kind === 'option' ? choice.options.find((o) => o.id === 'drake') : undefined;
    expect(drake?.minLevel).toBe(9);
    expect(drake?.creatureProfile?.companionType).toBe('mount');
    // Drake JUVÉNILE : gabarit des montures volantes (le livre ne chiffre que l'adulte, p. 148).
    expect(drake?.creatureProfile?.defense).toBe('20');
    expect(drake?.creatureProfile?.abilities).toMatchObject({ CON: 4, FOR: 4 });
  });

  it('sans le rang 7 : le drake JUVÉNILE figure dans les compagnons', () => {
    const companions = listCompanions(knight());
    expect(companions).toHaveLength(1);
    expect(companions[0].profile.name).toBe('Drake rouge');
    expect(companions[0].profile.defense).toBe('20');
    expect(companions[0].profile.attack?.damage).toBe('[2d4° + 5]');
    expect(resolveCreatureMaxHp(companions[0].profile, resolveCreatureAbilities(companions[0].profile)!, 16, 5)).toBe(90);
  });

  it('r7 — le drake ADULTE REMPLACE le juvénile, sans créer un second compagnon', () => {
    const companions = listCompanions(knight([4, 5, 6, 7]));
    expect(companions).toHaveLength(1);
    const drake = companions[0];
    expect(drake.profile.defense).toBe('22');
    expect(drake.profile.attack?.damage).toBe('[2d4° + 6]');
    expect(drake.profile.abilities).toMatchObject({ CON: 6, FOR: 6 });
    expect(drake.profile.bonusDieAbilities).toEqual(['CON']);
    // PV : le bloc adulte passe à « 10 + niveau × 6 ».
    expect(resolveCreatureMaxHp(drake.profile, resolveCreatureAbilities(drake.profile)!, 16, 7)).toBe(106);
  });

  it('r7 — le compagnon garde son IDENTITÉ : clé de PV et état « en selle » survivent', () => {
    const c = knight([4, 5, 6, 7], { mountedKey: 'cavalier-r5' });
    const drake = listCompanions(c)[0];
    // La capacité porteuse reste Monture fantastique → la clé de PV ne bouge pas au passage du rang.
    expect(drake.key).toBe('cavalier-r5');
    expect(drake.feature.id).toBe('cavalier-r5');
    expect(companionMountEnSelle(c, drake)).toBe(true);
  });

  it('r4 — la RD feu 10 est portée par le drake, juvénile comme adulte', () => {
    for (const ranks of [[4], [4, 5, 6, 7]]) {
      const drake = listCompanions(knight(ranks))[0];
      const list = Array.isArray(drake.profile.damageReduction)
        ? drake.profile.damageReduction
        : [drake.profile.damageReduction];
      expect(list).toHaveLength(1);
      expect(list[0]).toMatchObject({ kind: 'flat', value: 10, scopes: ['fire'] });
    }
  });

  it('r4 — sans ce rang, le drake n’a aucune RD', () => {
    expect(listCompanions(knight())[0].profile.damageReduction).toBeUndefined();
  });

  it('r8 — le Souffle enflammé rejoint les capacités spéciales du drake', () => {
    const drake = listCompanions(knight([4, 5, 6, 7, 8]))[0];
    const names = (drake.profile.specialAbilities ?? []).map((a) => a.name);
    expect(names).toContain('Souffle enflammé (A)');
    expect(listCompanions(knight([4, 5, 6, 7]))[0].profile.specialAbilities).toBeUndefined();
  });

  // ---------------------------------------------------------------------------
  // Déclinaison par COULEUR du drake (p. 147). Le livre écrit la voie pour le rouge et autorise
  // explicitement les autres couleurs : le nom du compagnon, sa RD et son souffle suivent.
  // ---------------------------------------------------------------------------

  const blue = (ranks: number[] = []) =>
    knight(ranks, { featureChoices: { 'cavalier-r5': ['drake', 'lightning'] } });

  it('drake BLEU — nom, RD et souffle passent tous à la foudre', () => {
    const drake = listCompanions(blue([4, 5, 6, 7, 8]))[0].profile;
    expect(drake.name).toBe('Drake bleu');
    const list = Array.isArray(drake.damageReduction) ? drake.damageReduction : [drake.damageReduction];
    expect(list[0]).toMatchObject({ kind: 'flat', value: 10, scopes: ['lightning'] });
    expect((drake.specialAbilities ?? []).map((a) => a.name)).toContain('Souffle électrique (A)');
  });

  it('drake BLEU — l’épithète survit au remplacement du profil par le drake ADULTE (r7)', () => {
    // Le rang 7 SUBSTITUE un profil entier : sans déclinaison, l'adulte redeviendrait « Drake ».
    expect(listCompanions(blue())[0].profile.name).toBe('Drake bleu');
    expect(listCompanions(blue([4, 5, 6, 7]))[0].profile.name).toBe('Drake bleu');
  });

  it('couleur NON choisie — « Drake » tout court, et AUCUNE RD malgré le rang 4', () => {
    // Le livre ne nomme aucune couleur de drake : retomber sur « rouge » affirmerait un choix non fait
    // (token à repli vide). Et la RD, elle, est une MÉCANIQUE : elle reste inerte sans couleur.
    const c = knight([4, 5, 6, 7, 8], { featureChoices: { 'cavalier-r5': ['drake'] } });
    const drake = listCompanions(c)[0].profile;
    expect(drake.name).toBe('Drake');
    expect(drake.damageReduction).toBeUndefined();
    // Le souffle, lui, existe bel et bien : il est accordé sans condition, seul son NOM se décline.
    expect((drake.specialAbilities ?? []).map((a) => a.name)).toContain('Souffle enflammé (A)');
  });

  it('r7 — la carte du rang affiche le MÊME drake que la section Compagnons (RD et souffle compris)', () => {
    const c = knight([4, 5, 6, 7, 8]);
    const inline = displayCreatureProfile(featureById.get('prestige-chevalier-dragon-r7')!, c)!;
    const companion = listCompanions(c)[0].profile;
    expect(inline.defense).toBe(companion.defense);
    expect(inline.damageReduction).toEqual(companion.damageReduction);
    expect((inline.specialAbilities ?? []).map((a) => a.name)).toEqual(
      (companion.specialAbilities ?? []).map((a) => a.name),
    );
  });
});

describe('replacesCreatureFromPaths — améliorer, jamais ajouter (PER-74)', () => {
  it('sans aucun rang de la voie ciblée : AUCUN compagnon surgi du rang remplaçant', () => {
    // Données incomplètes (voie de prestige prise sans Monture fantastique) : le rang 7 améliore une
    // monture, il n'en crée pas. Mieux vaut aucune carte qu'un drake apparu à côté de rien.
    const c = char({
      classId: 'chevalier',
      level: 16,
      featureIds: ['prestige-chevalier-dragon-r7', 'prestige-chevalier-dragon-r8'],
    });
    expect(listCompanions(c)).toEqual([]);
    // La mini-fiche reste consultable sur la carte du rang lui-même.
    expect(displayCreatureProfile(featureById.get('prestige-chevalier-dragon-r7')!, c)?.name).toBe('Drake');
  });

  it('Monture fantastique acquise SANS monture choisie : le drake améliore la Fidèle monture (r1), sans doublon', () => {
    const c = char({
      classId: 'chevalier',
      level: 16,
      featureIds: ['cavalier-r1', 'cavalier-r2', 'cavalier-r5', 'prestige-chevalier-dragon-r7'],
    });
    const companions = listCompanions(c);
    expect(companions).toHaveLength(1);
    expect(companions[0].profile.defense).toBe('22');
  });
});
