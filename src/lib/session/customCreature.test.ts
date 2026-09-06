import { describe, expect, it } from 'vitest';

import type { Creature } from '@/data/schema';
import {
  CUSTOM_CREATURE_FALLBACK_NAME,
  CUSTOM_CREATURE_SLUG,
  CUSTOM_LIST_MAX_LENGTH,
  CUSTOM_SPECIAL_ABILITIES_MAX_LENGTH,
  CUSTOM_TEXT_MAX_LENGTH,
  customCreatureBlob,
  customCreatureFromBestiary,
  normalizeCustomCreature,
} from './customCreature';

/** Socle minimal valide (initiative / PV / défense), réutilisé par les cas ci-dessous. */
const BASE = { initiative: 12, hitPoints: 30, defense: 14 };

describe('normalizeCustomCreature', () => {
  it('accepte le socle obligatoire seul', () => {
    expect(normalizeCustomCreature(BASE)).toEqual(BASE);
  });

  it('refuse un bloc dont le socle est incomplet ou non numérique', () => {
    expect(normalizeCustomCreature(null)).toBeUndefined();
    expect(normalizeCustomCreature({ initiative: 12, hitPoints: 30 })).toBeUndefined();
    expect(normalizeCustomCreature({ ...BASE, defense: '14' })).toBeUndefined();
    expect(normalizeCustomCreature({ ...BASE, initiative: Number.NaN })).toBeUndefined();
  });

  it('tronque les décimales et plancher les PV négatifs', () => {
    expect(normalizeCustomCreature({ initiative: 12.7, hitPoints: -5, defense: 13.2 })).toEqual({
      initiative: 12,
      hitPoints: 0,
      defense: 13,
    });
  });

  it('conserve une initiative négative (une créature peut être lente)', () => {
    expect(normalizeCustomCreature({ ...BASE, initiative: -2 })?.initiative).toBe(-2);
  });

  it('omet les champs facultatifs vides plutôt que de les persister', () => {
    const custom = normalizeCustomCreature({
      ...BASE,
      agility: undefined,
      nc: '   ',
      description: '',
      attacks: [],
      specialAbilities: [],
    });
    expect(custom).toEqual(BASE);
  });

  it('nettoie les champs facultatifs renseignés', () => {
    expect(
      normalizeCustomCreature({ ...BASE, agility: 3, nc: '  ½ ', description: ' Un PNJ ' }),
    ).toEqual({ ...BASE, agility: 3, nc: '½', description: 'Un PNJ' });
  });

  it('écarte les attaques sans mode et borne la liste', () => {
    const attacks = [
      { name: '  Épée longue ', bonus: ' +7 ', damage: '1d8+3', range: '' },
      { name: '   ', damage: '1d6' },
      ...Array.from({ length: CUSTOM_LIST_MAX_LENGTH + 3 }, (_v, i) => ({ name: `Attaque ${i}` })),
    ];
    const custom = normalizeCustomCreature({ ...BASE, attacks });
    expect(custom?.attacks?.[0]).toEqual({ name: 'Épée longue', bonus: '+7', damage: '1d8+3' });
    expect(custom?.attacks).toHaveLength(CUSTOM_LIST_MAX_LENGTH);
  });

  it('écarte les capacités entièrement vides et tronque les textes trop longs', () => {
    const custom = normalizeCustomCreature({
      ...BASE,
      specialAbilities: [
        { name: '', text: '' },
        { name: 'Souffle (L)', text: 'x'.repeat(CUSTOM_TEXT_MAX_LENGTH + 50) },
      ],
    });
    expect(custom?.specialAbilities).toHaveLength(1);
    expect(custom?.specialAbilities?.[0].text).toHaveLength(CUSTOM_TEXT_MAX_LENGTH);
  });

  it('borne les capacités spéciales à son propre plafond, plus large que celui des attaques', () => {
    expect(CUSTOM_SPECIAL_ABILITIES_MAX_LENGTH).toBeGreaterThan(CUSTOM_LIST_MAX_LENGTH);
    const specialAbilities = Array.from({ length: CUSTOM_SPECIAL_ABILITIES_MAX_LENGTH + 5 }, (_v, i) => ({
      name: `Capacité ${i}`,
      text: 'x',
    }));
    const custom = normalizeCustomCreature({ ...BASE, specialAbilities });
    expect(custom?.specialAbilities).toHaveLength(CUSTOM_SPECIAL_ABILITIES_MAX_LENGTH);
  });

  it('ne conserve que les caractéristiques renseignées (PER-455)', () => {
    const custom = normalizeCustomCreature({
      ...BASE,
      abilities: { FOR: 3.6, AGI: undefined, CON: 'x' },
    });
    expect(custom?.abilities).toEqual({ FOR: 3 });
  });

  it('omet les caractéristiques quand aucune n’est renseignée', () => {
    expect(normalizeCustomCreature({ ...BASE, abilities: {} })?.abilities).toBeUndefined();
  });

  it('normalise la RD, en écartant un type de dégât inconnu (PER-455)', () => {
    expect(normalizeCustomCreature({ ...BASE, damageReduction: { value: 5.9, scope: 'fire' } })
      ?.damageReduction).toEqual({ value: 5, scope: 'fire' });
    expect(normalizeCustomCreature({ ...BASE, damageReduction: { value: 5, scope: 'lave' } })
      ?.damageReduction).toEqual({ value: 5 });
  });

  it('omet la RD sans valeur numérique', () => {
    expect(normalizeCustomCreature({ ...BASE, damageReduction: { scope: 'fire' } })?.damageReduction).toBeUndefined();
    expect(normalizeCustomCreature({ ...BASE, damageReduction: {} })?.damageReduction).toBeUndefined();
  });

  it('normalise les caracs à dé bonus, en écartant les ids inconnus et les doublons', () => {
    expect(normalizeCustomCreature({ ...BASE, bonusDieAbilities: ['CON', 'PER', 'CON', 'xyz'] })
      ?.bonusDieAbilities).toEqual(['CON', 'PER']);
  });

  it('omet les caracs à dé bonus quand la liste est vide ou absente', () => {
    expect(normalizeCustomCreature({ ...BASE, bonusDieAbilities: [] })?.bonusDieAbilities).toBeUndefined();
    expect(normalizeCustomCreature(BASE)?.bonusDieAbilities).toBeUndefined();
  });
});

describe('customCreatureBlob', () => {
  it('projette le bloc saisi en créature synthétique sans page de livre', () => {
    const blob = customCreatureBlob({ ...BASE, nc: '3' }, 'Grishnak');
    expect(blob.id).toBe(CUSTOM_CREATURE_SLUG);
    expect(blob.name).toBe('Grishnak');
    expect(blob.initiative).toBe(12);
    expect(blob.hitPoints).toBe(30);
    expect(blob.defense).toBe(14);
    expect(blob.ncNote).toBe('3');
    expect(blob.sourcePage).toBe(0);
    // Aucune caractéristique saisie : la grille du bloc ne doit pas s'afficher.
    expect(blob.abilities).toBeUndefined();
  });

  it('retombe sur un nom générique quand l’instance n’est pas nommée', () => {
    expect(customCreatureBlob(BASE).name).toBe(CUSTOM_CREATURE_FALLBACK_NAME);
    expect(customCreatureBlob(BASE, '').name).toBe(CUSTOM_CREATURE_FALLBACK_NAME);
  });

  it('complète les caractéristiques partielles à 0 (PER-455)', () => {
    const blob = customCreatureBlob({ ...BASE, abilities: { FOR: 3, AGI: -1 } });
    expect(blob.abilities).toEqual({ FOR: 3, CON: 0, AGI: -1, PER: 0, CHA: 0, INT: 0, VOL: 0 });
  });

  it('projette une RD simple en DamageReduction plate (PER-455)', () => {
    const withScope = customCreatureBlob({ ...BASE, damageReduction: { value: 5, scope: 'fire' } });
    expect(withScope.damageReduction).toEqual({ kind: 'flat', value: 5, scopes: ['fire'] });

    const withoutScope = customCreatureBlob({ ...BASE, damageReduction: { value: 5 } });
    expect(withoutScope.damageReduction).toEqual({ kind: 'flat', value: 5 });
  });

  it('omet la RD et les caractéristiques quand elles sont absentes', () => {
    const blob = customCreatureBlob(BASE);
    expect(blob.abilities).toBeUndefined();
    expect(blob.damageReduction).toBeUndefined();
  });

  it('projette les caracs à dé bonus', () => {
    const blob = customCreatureBlob({ ...BASE, abilities: { CON: 1 }, bonusDieAbilities: ['CON', 'PER'] });
    expect(blob.bonusDieAbilities).toEqual(['CON', 'PER']);
  });

  it('affiche quand même la grille (à 0) si un dé bonus est coché sans aucune valeur chiffrée', () => {
    const blob = customCreatureBlob({ ...BASE, bonusDieAbilities: ['PER'] });
    expect(blob.abilities).toEqual({ FOR: 0, CON: 0, AGI: 0, PER: 0, CHA: 0, INT: 0, VOL: 0 });
    expect(blob.bonusDieAbilities).toEqual(['PER']);
  });
});

describe('customCreatureFromBestiary', () => {
  const CREATURE: Creature = {
    id: 'loup',
    name: 'Loup',
    category: 'animaux',
    nc: 0.5,
    abilities: { AGI: 3, CON: 1, FOR: 1, PER: 1, CHA: -1, INT: -4, VOL: 0 },
    defense: 13,
    hitPoints: 15,
    initiative: 8,
    description: 'Un loup famélique.',
    attacks: [{ name: 'Morsure', bonus: '+3', damage: '1d6+1', rider: '+ renversement' }],
    specialAbilities: [{ name: 'Odorat', text: 'Détecte au flair.' }],
    sourcePage: 274,
  };

  it('copie le socle, les 7 caractéristiques et les champs facultatifs, sans lien vers la créature d’origine', () => {
    const custom = customCreatureFromBestiary(CREATURE);
    expect(custom).toEqual({
      initiative: 8,
      hitPoints: 15,
      defense: 13,
      agility: 3,
      abilities: { AGI: 3, CON: 1, FOR: 1, PER: 1, CHA: -1, INT: -4, VOL: 0 },
      nc: '½',
      description: 'Un loup famélique.',
      attacks: [{ name: 'Morsure', bonus: '+3', damage: '1d6+1' }],
      specialAbilities: [{ name: 'Odorat', text: 'Détecte au flair.' }],
    });
  });

  it('reprend aussi les dés bonus de caractéristiques', () => {
    const custom = customCreatureFromBestiary({ ...CREATURE, bonusDieAbilities: ['AGI'] });
    expect(custom?.bonusDieAbilities).toEqual(['AGI']);
  });

  it('renvoie undefined pour une entrée gabarit sans socle chiffré', () => {
    expect(customCreatureFromBestiary({ ...CREATURE, initiative: undefined })).toBeUndefined();
  });
});
