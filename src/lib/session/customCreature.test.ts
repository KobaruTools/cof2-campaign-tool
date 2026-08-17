import { describe, expect, it } from 'vitest';

import type { Creature } from '@/data/schema';
import {
  CUSTOM_CREATURE_FALLBACK_NAME,
  CUSTOM_CREATURE_SLUG,
  CUSTOM_LIST_MAX_LENGTH,
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
    // Le MJ ne saisit pas les 7 caractéristiques : la grille du bloc ne doit pas s'afficher.
    expect(blob.abilities).toBeUndefined();
  });

  it('retombe sur un nom générique quand l’instance n’est pas nommée', () => {
    expect(customCreatureBlob(BASE).name).toBe(CUSTOM_CREATURE_FALLBACK_NAME);
    expect(customCreatureBlob(BASE, '').name).toBe(CUSTOM_CREATURE_FALLBACK_NAME);
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

  it('copie le socle et les champs facultatifs, sans lien vers la créature d’origine', () => {
    const custom = customCreatureFromBestiary(CREATURE);
    expect(custom).toEqual({
      initiative: 8,
      hitPoints: 15,
      defense: 13,
      agility: 3,
      nc: '½',
      description: 'Un loup famélique.',
      attacks: [{ name: 'Morsure', bonus: '+3', damage: '1d6+1' }],
      specialAbilities: [{ name: 'Odorat', text: 'Détecte au flair.' }],
    });
  });

  it('renvoie undefined pour une entrée gabarit sans socle chiffré', () => {
    expect(customCreatureFromBestiary({ ...CREATURE, initiative: undefined })).toBeUndefined();
  });
});
