import { describe, expect, it } from 'vitest';
import { featureById } from '@/data';
import { deriveStats } from '@/lib/engine';
import {
  SCHEMA_VERSION,
  type Character,
  type EquipmentLine,
  type ItemDerivedBonuses,
} from '@/lib/character/types';
import { rulesContext } from '@/lib/character/rulesContext';
import { spellArmorManaSurcharge } from '@/lib/character/manaSurcharge';
import { buildCharacterDerivedView } from './characterDerivedView';

function makeCharacter(over: Partial<Character> = {}): Character {
  return {
    schemaVersion: SCHEMA_VERSION,
    id: 'test',
    name: 'Test',
    identity: {},
    ancestryId: 'humain',
    classId: 'guerrier',
    level: 1,
    priestVocation: null,
    portraitVariant: 'default',
    firearmsAllowed: true,
    campaignId: null,
    playerId: null,
    status: 'active',
    abilities: { AGI: 1, CON: 2, FOR: 3, PER: 0, CHA: -1, INT: 0, VOL: 1 },
    baseAbilities: { AGI: 1, CON: 2, FOR: 3, PER: 0, CHA: -1, INT: 0, VOL: 1 },
    ancestryChoices: [],
    ancestryPathId: 'humain',
    featureIds: [],
    featureChoices: {},
    effectToggles: {},
    effectInputs: {},
    usageCounters: {},
    depletion: {},
    companionDepletion: {},
    transformationDepletion: {},
    companionInstances: {},
    mounts: [],
    poisonedWeapons: [],
    purse: { platinum: 0, gold: 0, silver: 0, copper: 0 },
    levelUpHistory: [],
    equipment: [],
    overrides: {},
    notes: '',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...over,
  };
}

describe('buildCharacterDerivedView', () => {
  it('profil valide : entrée moteur exploitable + tableaux de badges présents', () => {
    const view = buildCharacterDerivedView(makeCharacter());
    expect(view.derivedInput).not.toBeNull();
    // L'entrée alimente réellement le moteur (PV finis, défense numérique).
    const stats = deriveStats(view.derivedInput!);
    expect(stats.maxHp).toBeGreaterThan(0);
    expect(Number.isFinite(stats.defense)).toBe(true);
    // Sous-produits toujours fournis (même vides), utilisés par la fiche.
    expect(Array.isArray(view.modFeatureIds)).toBe(true);
    expect(Array.isArray(view.defenseBadges)).toBe(true);
    expect(Array.isArray(view.meleeCriticalRanges)).toBe(true);
    expect(Array.isArray(view.rangedCriticalRanges)).toBe(true);
  });

  it('barde « en selle » (PER-216) : le malus d’Init. du cavalier est fondu dans l’Initiative', () => {
    const base = makeCharacter(); // PER 0 → Initiative de base 10.
    expect(deriveStats(buildCharacterDerivedView(base).derivedInput!).initiative).toBe(10);
    // Barde de plaque (−4) sur un cheval de guerre, à pied (mountedKey absent) → aucun impact.
    const afoot = makeCharacter({
      mounts: [{ id: 'm', catalogId: 'cheval-de-guerre', bardeId: 'barde-de-plaque', hp: {} }],
    });
    expect(deriveStats(buildCharacterDerivedView(afoot).derivedInput!).initiative).toBe(10);
    // En selle (mountedKey pointe sur la monture) → −4 appliqué à l’Initiative de la fiche.
    const mounted = makeCharacter({
      mounts: [{ id: 'm', catalogId: 'cheval-de-guerre', bardeId: 'barde-de-plaque', hp: {} }],
      mountedKey: 'm',
    });
    expect(deriveStats(buildCharacterDerivedView(mounted).derivedInput!).initiative).toBe(6);
  });

  it('caractéristiques effectives : la défense suit l’AGI saisie', () => {
    const low = deriveStats(buildCharacterDerivedView(makeCharacter({
      abilities: { AGI: 0, CON: 2, FOR: 3, PER: 0, CHA: -1, INT: 0, VOL: 1 },
      baseAbilities: { AGI: 0, CON: 2, FOR: 3, PER: 0, CHA: -1, INT: 0, VOL: 1 },
    })).derivedInput!);
    const high = deriveStats(buildCharacterDerivedView(makeCharacter({
      abilities: { AGI: 4, CON: 2, FOR: 3, PER: 0, CHA: -1, INT: 0, VOL: 1 },
      baseAbilities: { AGI: 4, CON: 2, FOR: 3, PER: 0, CHA: -1, INT: 0, VOL: 1 },
    })).derivedInput!);
    expect(high.defense).toBeGreaterThan(low.defense);
  });

  it('profil incomplet (famille introuvable) : derivedInput null, badges quand même présents', () => {
    const view = buildCharacterDerivedView(makeCharacter({ classId: 'inexistant' }));
    expect(view.derivedInput).toBeNull();
    expect(Array.isArray(view.defenseBadges)).toBe(true);
    expect(Array.isArray(view.modFeatureIds)).toBe(true);
  });

  it('PER-141 : sans arme de contact portée, vue mains nues présente et DM d’arme null', () => {
    const view = buildCharacterDerivedView(makeCharacter());
    expect(view.meleeWeaponDamage).toBeNull();
    expect(view.unarmed.damage).toEqual({ count: 1, die: 'd3', nonLethal: true });
    expect(Array.isArray(view.unarmedCriticalRanges)).toBe(true);
  });

  it('PER-141 : DM de l’arme de contact tenue en main principale (dé + FOR)', () => {
    const view = buildCharacterDerivedView(
      makeCharacter({
        equipment: [{ itemId: 'epee-longue', quantity: 1, worn: { slot: 'mainHand' } }],
      }),
    );
    expect(view.meleeWeaponDamage).toEqual({
      dice: '1d8',
      abilities: ['FOR'],
      flatBonuses: [],
      nonLethal: false,
      name: 'Épée longue',
      weaponKind: 'sword',
      weaponInfo: { category: 'à une main', properties: 'Type de DM : tranchants.', sourcePage: 183 },
    });
  });

  it('PER-115 : DM de l’arme à distance portée (dé seul, aucune carac — p. 185)', () => {
    const view = buildCharacterDerivedView(
      makeCharacter({
        equipment: [{ itemId: 'arc-long', quantity: 1, worn: { slot: 'mainHand' } }],
      }),
    );
    expect(view.rangedWeaponDamage).toEqual({
      dice: '1d8',
      abilities: [],
      flatBonuses: [],
      nonLethal: false,
      name: 'Arc long',
      weaponKind: 'bow',
      weaponInfo: {
        category: 'à deux mains',
        range: '50 m',
        properties:
          'Type de DM : perforants. Arme tenue à deux mains, nécessite d’avoir une valeur minimale de +1 en FOR.',
        sourcePage: 185,
      },
    });
  });

  it('PER-115 : rôdeur Archer émérite avec un arc → +PER agrégé au DM à distance', () => {
    const view = buildCharacterDerivedView(
      makeCharacter({
        classId: 'rodeur',
        featureIds: ['archer-r1'],
        equipment: [{ itemId: 'arc-long', quantity: 1, worn: { slot: 'mainHand' } }],
      }),
    );
    expect(view.rangedWeaponDamage?.abilities).toEqual(['PER']);
  });

  it('PER-284 : canon double → dé de DM DOUBLÉ sur la carte de tir (1d10 → 2d10, p. 63)', () => {
    const view = buildCharacterDerivedView(
      makeCharacter({
        classId: 'arquebusier',
        featureIds: ['artilleur-r1', 'artilleur-r2', 'artilleur-r3', 'artilleur-r4'],
        equipment: [
          { itemId: 'petoire', quantity: 1, doubleBarrel: true, worn: { slot: 'mainHand' } },
        ],
      }),
    );
    expect(view.rangedWeaponDamage?.dice).toBe('2d10');
    // Le doublement doit être EXPLIQUÉ (sinon 2d10 sort de nulle part).
    expect(view.rangedWeaponDamage?.diceNote).toContain('DOUBLÉ');
  });

  it('PER-284 : avec un seul coup chargé, le dé revient à la normale (un seul canon, p. 63)', () => {
    const view = buildCharacterDerivedView(
      makeCharacter({
        classId: 'arquebusier',
        featureIds: ['artilleur-r1', 'artilleur-r2', 'artilleur-r3', 'artilleur-r4'],
        equipment: [
          {
            itemId: 'petoire',
            quantity: 1,
            doubleBarrel: true,
            loaded: ['normal'],
            worn: { slot: 'mainHand' },
          },
        ],
      }),
    );
    expect(view.rangedWeaponDamage?.dice).toBe('1d10');
    expect(view.rangedWeaponDamage?.diceNote).toBeUndefined();
  });

  it('PER-284 : sans canon double, le dé du catalogue est intact', () => {
    const view = buildCharacterDerivedView(
      makeCharacter({
        classId: 'arquebusier',
        equipment: [{ itemId: 'petoire', quantity: 1, worn: { slot: 'mainHand' } }],
      }),
    );
    expect(view.rangedWeaponDamage?.dice).toBe('1d10');
  });

  it('PER-284 : Poudre puissante → +1 aux DM des armes à poudre, +1 par voie d’arquebusier au rang 5', () => {
    const gunner = (featureIds: string[]) =>
      buildCharacterDerivedView(
        makeCharacter({
          classId: 'arquebusier',
          level: 20,
          featureIds,
          equipment: [{ itemId: 'mousquet', quantity: 1, worn: { slot: 'mainHand' } }],
        }),
      );
    // Socle : +1 dès l'acquisition, aucune voie au rang 5.
    const base = gunner(['explosifs-r1', 'explosifs-r2', 'explosifs-r3']);
    expect(base.rangedWeaponDamage?.flatBonuses.map((b) => b.value)).toEqual([1]);
    // Une voie d'arquebusier au rang 5 → +2.
    const oneMilestone = gunner(['explosifs-r1', 'explosifs-r2', 'explosifs-r3', 'artilleur-r5']);
    expect(oneMilestone.rangedWeaponDamage?.flatBonuses.map((b) => b.value)).toEqual([2]);
    // Le bonus ne vise QUE la poudre : une arbalète n'en profite pas (jumeau `maitre-des-arbaletes-r1`).
    const crossbow = buildCharacterDerivedView(
      makeCharacter({
        classId: 'arquebusier',
        level: 20,
        featureIds: ['explosifs-r1', 'explosifs-r2', 'explosifs-r3'],
        equipment: [{ itemId: 'arbalete-lourde', quantity: 1, worn: { slot: 'mainHand' } }],
      }),
    );
    expect(crossbow.rangedWeaponDamage?.flatBonuses).toEqual([]);
  });

  it('PER-115 : sans arme à distance portée, DM à distance null', () => {
    const view = buildCharacterDerivedView(makeCharacter());
    expect(view.rangedWeaponDamage).toBeNull();
  });

  it('PER-141 : une arme de contact simplement rangée ne compte pas', () => {
    const view = buildCharacterDerivedView(
      makeCharacter({ equipment: [{ itemId: 'epee-longue', quantity: 1 }] }),
    );
    expect(view.meleeWeaponDamage).toBeNull();
  });

  it('PER-141 : moine avec Morsure du serpent → badge de critique mains nues', () => {
    const view = buildCharacterDerivedView(
      makeCharacter({ classId: 'moine', featureIds: ['maitrise-r3'] }),
    );
    expect(view.unarmed.lethality).toBe('choice');
    expect(view.unarmedCriticalRanges).toHaveLength(1);
    expect(view.unarmedCriticalRanges[0].text).toBe('19-20');
  });
});

describe('objets enchantés : apport de caractéristiques (PER-272)', () => {
  const boots = (bonus: number) => ({
    custom: true as const,
    name: 'Bottes de vivacité',
    quantity: 1,
    worn: { slot: 'accessory' as const },
    abilityBonuses: { AGI: bonus },
  });

  it('un objet porté qui donne +AGI fait monter la DÉFENSE d’autant', () => {
    const bare = deriveStats(buildCharacterDerivedView(makeCharacter()).derivedInput!);
    const enchanted = deriveStats(
      buildCharacterDerivedView(makeCharacter({ equipment: [boots(2)] })).derivedInput!,
    );
    expect(enchanted.defense).toBe(bare.defense + 2);
    // Même objet RANGÉ (pas d'état `worn`) : aucun effet.
    const stowed = deriveStats(
      buildCharacterDerivedView(
        makeCharacter({ equipment: [{ custom: true, name: 'Bottes de vivacité', quantity: 1, abilityBonuses: { AGI: 2 } }] }),
      ).derivedInput!,
    );
    expect(stowed.defense).toBe(bare.defense);
  });

  it('un objet porté qui donne +CON fait monter les PV et l’attaque à distance suit l’AGI', () => {
    const bare = deriveStats(buildCharacterDerivedView(makeCharacter()).derivedInput!);
    const tough = deriveStats(
      buildCharacterDerivedView(
        makeCharacter({
          equipment: [
            {
              custom: true,
              name: 'Amulette de vigueur',
              quantity: 1,
              worn: { slot: 'accessory' },
              abilityBonuses: { CON: 2, AGI: 1 },
            },
          ],
        }),
      ).derivedInput!,
    );
    expect(tough.maxHp).toBeGreaterThan(bare.maxHp);
    expect(tough.rangedAttack).toBe(bare.rangedAttack + 1);
  });

  it('un MALUS d’objet fait BAISSER la statistique dérivée correspondante', () => {
    const bare = deriveStats(buildCharacterDerivedView(makeCharacter()).derivedInput!);
    const cursed = deriveStats(
      buildCharacterDerivedView(
        makeCharacter({
          equipment: [
            {
              custom: true,
              name: 'Heaume maudit',
              quantity: 1,
              worn: { slot: 'accessory' },
              abilityBonuses: { PER: -2 },
            },
          ],
        }),
      ).derivedInput!,
    );
    expect(cursed.initiative).toBe(bare.initiative - 2);
  });

  it('le PLAFOND d’AGI de l’armure portée s’applique APRÈS l’apport de l’objet (p. 188)', () => {
    // Plaque complète : DEF +7, plafond d'AGI 1. Le personnage a AGI 1 (déjà au plafond) :
    // les bottes +2 ne peuvent RIEN ajouter à la défense, le plafond mordant en aval.
    const plated = makeCharacter({
      equipment: [{ itemId: 'plaque-complete', quantity: 1, worn: { slot: 'armor' } }],
    });
    const platedBoots = makeCharacter({
      equipment: [
        { itemId: 'plaque-complete', quantity: 1, worn: { slot: 'armor' } },
        boots(2),
      ],
    });
    const withoutBoots = deriveStats(buildCharacterDerivedView(plated).derivedInput!);
    const withBoots = deriveStats(buildCharacterDerivedView(platedBoots).derivedInput!);
    expect(withBoots.defense).toBe(withoutBoots.defense);
  });
});

describe('objets enchantés : apport de statistiques dérivées (PER-273)', () => {
  /** Objet libre porté en accessoire, avec les apports donnés. */
  const trinket = (name: string, derivedBonuses: ItemDerivedBonuses): EquipmentLine => ({
    custom: true,
    name,
    quantity: 1,
    worn: { slot: 'accessory' },
    derivedBonuses,
  });

  const statsOf = (over: Partial<Character> = {}) =>
    deriveStats(buildCharacterDerivedView(makeCharacter(over)).derivedInput!);

  it('un objet porté fait bouger la stat visée, et rien de plus', () => {
    const bare = statsOf();
    const amulet = statsOf({ equipment: [trinket('Amulette de vitalité', { maxHp: 5 })] });
    expect(amulet.maxHp).toBe(bare.maxHp + 5);
    expect(amulet.defense).toBe(bare.defense);
    expect(amulet.initiative).toBe(bare.initiative);
  });

  it('le même objet RANGÉ n’apporte rien (le déséquipement rend la valeur d’origine)', () => {
    const bare = statsOf();
    const stowed = statsOf({
      equipment: [
        { custom: true, name: 'Amulette de vitalité', quantity: 1, derivedBonuses: { maxHp: 5 } },
      ],
    });
    expect(stowed.maxHp).toBe(bare.maxHp);
  });

  it('couvre les huit statistiques modifiables, malus compris, et CUMULE les objets portés', () => {
    const bare = statsOf();
    const loaded = statsOf({
      equipment: [
        trinket('Amulette de vitalité', { maxHp: 5, luckPoints: 1, recoveryDiceCount: 1 }),
        trinket('Cape du voyageur', { initiative: 2 }),
        // Malus : la cape maudite retire de l'initiative et de la touche magique.
        trinket('Cape maudite', { initiative: -1, magicAttack: -2 }),
        trinket('Gantelets du duelliste', { meleeAttack: 1, rangedAttack: 1 }),
      ],
    });
    expect(loaded.maxHp).toBe(bare.maxHp + 5);
    expect(loaded.luckPoints).toBe(bare.luckPoints + 1);
    expect(loaded.recoveryDiceCount).toBe(bare.recoveryDiceCount + 1);
    // +2 puis −1 sur la même stat, portés par deux objets différents.
    expect(loaded.initiative).toBe(bare.initiative + 1);
    expect(loaded.magicAttack).toBe(bare.magicAttack - 2);
    expect(loaded.meleeAttack).toBe(bare.meleeAttack + 1);
    expect(loaded.rangedAttack).toBe(bare.rangedAttack + 1);
    // La DÉFENSE n'est pas modifiable par un objet : elle ne bouge pas.
    expect(loaded.defense).toBe(bare.defense);
  });

  it("se CUMULE avec le bonus d'une capacité de voie sans le remplacer", () => {
    // « Frappe éclair » (guerrier, voie du pourfendeur r1, p. 88) : +3 d'Initiative permanent.
    const feature = { classId: 'guerrier', level: 1, featureIds: ['pourfendeur-r1'] };
    const bare = statsOf();
    const swift = statsOf(feature);
    expect(swift.initiative).toBe(bare.initiative + 3);
    const both = statsOf({ ...feature, equipment: [trinket('Cape du voyageur', { initiative: 2 })] });
    expect(both.initiative).toBe(swift.initiative + 2);
  });

  it('un apport aux PM ne CRÉE PAS de réserve de mana à qui n’en a pas (p. 42)', () => {
    // Guerrier sans aucun sort : la réserve reste inexistante (null), l'apport n'y change rien.
    const noMana = statsOf({ equipment: [trinket('Talisman de mana', { manaPoints: 5 })] });
    expect(noMana.manaPoints).toBeNull();
    // Magicien (au moins un sort connu) : là, l'apport s'ajoute bien à la réserve.
    const mage = { classId: 'magicien', level: 1, featureIds: ['magie-des-arcanes-r1'] };
    const bareMage = statsOf(mage);
    expect(bareMage.manaPoints).not.toBeNull();
    const manaMage = statsOf({ ...mage, equipment: [trinket('Talisman de mana', { manaPoints: 5 })] });
    expect(manaMage.manaPoints).toBe(bareMage.manaPoints! + 5);
  });

  it('aucun apport d’objet ne touche la DÉFENSE, ni le surcoût de mana en armure (p. 178)', () => {
    // Décision propriétaire : la DEF est hors du dispositif — le type l'interdit à la saisie,
    // et une clé `def` forgée dans les données reste sans effet. Le surcoût de mana des sorts
    // en armure, qui ne regarde que la DEF mondaine de l'armure de corps, est donc intact.
    const spell = featureById.get('magie-des-arcanes-r1')!;
    const armor: EquipmentLine = { itemId: 'chemise-de-mailles', quantity: 1, worn: { slot: 'armor' } };
    const plain = makeCharacter({ classId: 'magicien', featureIds: [spell.id], equipment: [armor] });
    const forged = makeCharacter({
      classId: 'magicien',
      featureIds: [spell.id],
      equipment: [
        { ...armor, derivedBonuses: { def: 3 } },
        { ...trinket('Anneau de protection', {}), derivedBonuses: { def: 2 } },
      ] as unknown as EquipmentLine[],
    });
    expect(spellArmorManaSurcharge(forged, rulesContext, spell)).toEqual(
      spellArmorManaSurcharge(plain, rulesContext, spell),
    );
    // Et la défense elle-même reste celle de l'armure seule.
    expect(deriveStats(buildCharacterDerivedView(forged).derivedInput!).defense).toBe(
      deriveStats(buildCharacterDerivedView(plain).derivedInput!).defense,
    );
  });

  it("expose le détail par objet pour l'infobulle, sans doubler le score", () => {
    const view = buildCharacterDerivedView(
      makeCharacter({
        equipment: [
          trinket('Amulette de vitalité', { maxHp: 5 }),
          trinket('Broche de garde', { maxHp: 2, luckPoints: 1 }),
        ],
      }),
    );
    expect(view.itemDerivedModSources.maxHp).toEqual([
      { label: 'Amulette de vitalité', value: 5 },
      { label: 'Broche de garde', value: 2 },
    ]);
    expect(view.itemDerivedModSources.luckPoints).toEqual([{ label: 'Broche de garde', value: 1 }]);
    // Le total est FONDU une seule fois dans les mods du moteur (pas d'addition en double).
    expect(view.derivedInput!.mods?.maxHp).toBe(7);
  });
});
