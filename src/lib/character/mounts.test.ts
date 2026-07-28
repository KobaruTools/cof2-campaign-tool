import { describe, expect, it } from 'vitest';
import {
  enSelleLink,
  isMountMounted,
  listOwnedMounts,
  mountCatalogEntry,
  mountDisplayName,
  mountMaxHp,
  mountedInitiativePenalty,
  resolveBarde,
  resolveMountCreature,
} from './mounts';
import { createBlankCharacter } from './factory';
import type { Character, OwnedMount } from './types';

const warHorse = (over: Partial<OwnedMount> = {}): OwnedMount => ({
  id: 'm1',
  catalogId: 'cheval-de-guerre',
  hp: {},
  ...over,
});

describe('mounts — résolution du catalogue', () => {
  it('résout l’entrée de catalogue d’une monture connue', () => {
    expect(mountCatalogEntry(warHorse())?.name).toBe('Cheval de guerre');
  });

  it('renvoie undefined pour un id de catalogue inconnu', () => {
    expect(mountCatalogEntry(warHorse({ catalogId: 'licorne-imaginaire' }))).toBeUndefined();
  });

  it('affiche le nom personnalisé si présent, sinon le nom de catalogue', () => {
    const entry = mountCatalogEntry(warHorse());
    expect(mountDisplayName(warHorse(), entry)).toBe('Cheval de guerre');
    expect(mountDisplayName(warHorse({ name: 'Bucéphale' }), entry)).toBe('Bucéphale');
    expect(mountDisplayName(warHorse({ name: '   ' }), entry)).toBe('Cheval de guerre');
  });
});

describe('mounts — barde', () => {
  it('applique +DEF et −Init au cheval de guerre selon la barde', () => {
    const owned = warHorse({ bardeId: 'barde-de-plaque' }); // +4 DEF
    const entry = mountCatalogEntry(owned);
    const creature = resolveMountCreature(owned, entry);
    // Base p.267 : DEF 11, Init 10 → +4 / −4.
    expect(creature?.defense).toBe(15);
    expect(creature?.initiative).toBe(6);
  });

  it('applique le caparaçon de mailles (+2 / −2)', () => {
    const owned = warHorse({ bardeId: 'caparacon-de-mailles' });
    const creature = resolveMountCreature(owned, mountCatalogEntry(owned));
    expect(creature?.defense).toBe(13);
    expect(creature?.initiative).toBe(8);
  });

  it('sans barde, renvoie le bloc de base intact', () => {
    const owned = warHorse();
    const creature = resolveMountCreature(owned, mountCatalogEntry(owned));
    expect(creature?.defense).toBe(11);
    expect(creature?.initiative).toBe(10);
  });

  it('ignore une barde sur une monture inapte au caparaçon (cheval de selle)', () => {
    const owned: OwnedMount = { id: 'm2', catalogId: 'cheval-de-selle', bardeId: 'barde-de-plaque', hp: {} };
    const entry = mountCatalogEntry(owned);
    expect(resolveBarde(owned, entry)).toBeUndefined();
    // DEF/Init inchangées (11 / 10).
    expect(resolveMountCreature(owned, entry)?.defense).toBe(11);
  });
});

describe('mounts — PV et entités sans stats', () => {
  it('résout les PV max fixes d’une monture de combat', () => {
    expect(mountMaxHp(mountCatalogEntry(warHorse()))).toBe(14);
  });

  it('renvoie null (pas de barre de vie) pour une bête de somme ou un véhicule', () => {
    const mule: OwnedMount = { id: 'm3', catalogId: 'mule-ou-ane', hp: {} };
    const cart: OwnedMount = { id: 'm4', catalogId: 'carriole', hp: {} };
    expect(mountMaxHp(mountCatalogEntry(mule))).toBeNull();
    expect(resolveMountCreature(cart, mountCatalogEntry(cart))).toBeUndefined();
  });
});

describe('mounts — en selle & malus d’Initiative de barde', () => {
  const withMounts = (over: Partial<Character>): Character => ({
    ...createBlankCharacter({ now: '2026-01-01T00:00:00.000Z' }),
    ...over,
  });

  it('le malus d’Init n’est appliqué qu’à la monture CHEVAUCHÉE (mountedKey)', () => {
    const bardedWarHorse: OwnedMount = { id: 'm1', catalogId: 'cheval-de-guerre', bardeId: 'barde-de-plaque', hp: {} };
    const afoot = withMounts({ mounts: [bardedWarHorse] }); // mountedKey absent
    const mounted = withMounts({ mounts: [bardedWarHorse], mountedKey: 'm1' });
    expect(isMountMounted(afoot, afoot.mounts[0])).toBe(false);
    expect(mountedInitiativePenalty(afoot)).toBe(0);
    expect(isMountMounted(mounted, mounted.mounts[0])).toBe(true);
    expect(mountedInitiativePenalty(mounted)).toBe(4);
  });

  it('en selle sans barde = aucun malus', () => {
    const noBarde = withMounts({ mounts: [{ id: 'm2', catalogId: 'cheval-de-guerre', hp: {} }], mountedKey: 'm2' });
    expect(mountedInitiativePenalty(noBarde)).toBe(0);
  });

  it('EXCLUSIF : mountedKey ne désigne qu’une seule monture (pas de cumul de malus)', () => {
    const c = withMounts({
      mounts: [
        { id: 'a', catalogId: 'cheval-de-guerre', bardeId: 'barde-de-plaque', hp: {} }, // −4 si montée
        { id: 'b', catalogId: 'cheval-de-guerre', bardeId: 'caparacon-de-mailles', hp: {} }, // −2 si montée
      ],
      mountedKey: 'a',
    });
    expect(isMountMounted(c, c.mounts[0])).toBe(true);
    expect(isMountMounted(c, c.mounts[1])).toBe(false);
    expect(mountedInitiativePenalty(c)).toBe(4); // seulement la monture 'a', jamais 4+2
  });

  it('chevalier : enSelleLink détecte cavalier-r2 (interrupteur Cavalier émérite piloté côté page)', () => {
    const c = withMounts({ featureIds: ['cavalier-r1', 'cavalier-r2'], mounts: [{ id: 'm', catalogId: 'cheval-de-guerre', hp: {} }] });
    expect(enSelleLink(c)).toEqual({ featureId: 'cavalier-r2', index: 0 });
  });
});

describe('mounts — listOwnedMounts', () => {
  it('résout chaque monture possédée dans l’ordre', () => {
    const list = listOwnedMounts([
      warHorse({ bardeId: 'caparacon-de-mailles' }),
      { id: 'v1', catalogId: 'chariot', hp: {} },
    ]);
    expect(list).toHaveLength(2);
    expect(list[0].displayName).toBe('Cheval de guerre');
    expect(list[0].creature?.defense).toBe(13);
    expect(list[0].barde?.id).toBe('caparacon-de-mailles');
    expect(list[0].maxHp).toBe(14);
    expect(list[1].displayName).toBe('Chariot');
    expect(list[1].creature).toBeUndefined();
    expect(list[1].maxHp).toBeNull();
  });
});
