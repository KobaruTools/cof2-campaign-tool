import { describe, expect, it } from 'vitest';
import type { Character } from './types';
import {
  EXPORT_FORMAT_VERSION,
  EXPORT_KIND,
  buildExportFile,
  parseImportFile,
  type TransferContext,
} from './transfer';

// Personnage minimal : les fonctions de transfert traitent le blob comme opaque
// (aucune inspection de champ), un id suffit pour vérifier le passage à travers.
const character = { id: 'char-1', name: 'Aldric', schemaVersion: 16 } as unknown as Character;

const context: TransferContext = {
  campaign: { id: 'camp-1', name: 'La Marche des Ombres' },
  player: { id: 'play-1', name: 'Marie' },
};

describe('buildExportFile', () => {
  it('enveloppe le personnage et le contexte avec le discriminant et la version', () => {
    const file = buildExportFile(character, context);
    expect(file.kind).toBe(EXPORT_KIND);
    expect(file.version).toBe(EXPORT_FORMAT_VERSION);
    expect(file.character).toBe(character);
    expect(file.context).toEqual(context);
  });
});

describe('parseImportFile', () => {
  it('décortique une enveloppe PER-182 (blob imbriqué + contexte)', () => {
    const file = buildExportFile(character, context);
    const { raw, context: parsed } = parseImportFile(file);
    expect(raw).toEqual(character);
    expect(parsed).toEqual(context);
  });

  it('rétrocompat : un blob personnage à plat est renvoyé tel quel, contexte null', () => {
    const { raw, context: parsed } = parseImportFile(character);
    expect(raw).toBe(character);
    expect(parsed).toBeNull();
  });

  it('normalise un contexte partiel (campagne seule, joueur absent)', () => {
    const file = {
      kind: EXPORT_KIND,
      version: 1,
      character,
      context: { campaign: { id: 'camp-1', name: 'X' } },
    };
    const { context: parsed } = parseImportFile(file);
    expect(parsed).toEqual({ campaign: { id: 'camp-1', name: 'X' }, player: null });
  });

  it('normalise une référence sans nom (id seul → nom vide, conservé pour le rattachement)', () => {
    const file = {
      kind: EXPORT_KIND,
      version: 1,
      character,
      context: { campaign: { id: 'camp-1' }, player: null },
    };
    const { context: parsed } = parseImportFile(file);
    expect(parsed?.campaign).toEqual({ id: 'camp-1', name: '' });
  });

  it('écarte les références mal formées (id manquant ou vide → null)', () => {
    const file = {
      kind: EXPORT_KIND,
      version: 1,
      character,
      context: { campaign: { name: 'sans id' }, player: { id: '' } },
    };
    const { context: parsed } = parseImportFile(file);
    expect(parsed).toEqual({ campaign: null, player: null });
  });

  it('un contexte absent de l’enveloppe est normalisé en deux références nulles', () => {
    const file = { kind: EXPORT_KIND, version: 1, character };
    const { raw, context: parsed } = parseImportFile(file);
    expect(raw).toEqual(character);
    expect(parsed).toEqual({ campaign: null, player: null });
  });
});
