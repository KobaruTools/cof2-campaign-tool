import { describe, expect, it } from 'vitest';
import {
  BENEFICIAL_EFFECT_IDS,
  ENVIRONMENTAL_EFFECT_IDS,
  STATUS_EFFECT_IDS,
} from '@/data/schema';
import {
  buildStatusGroups,
  originStatusTone,
  statusIconId,
  statusLabel,
  statusTone,
} from './statusPalette';

// Helpers PURS de la palette d'états du Combat Tracker (groupes, libellés, icônes, teintes).
describe('buildStatusGroups', () => {
  it('sans effet situationnel débloqué : glossaire puis environnement', () => {
    const groups = buildStatusGroups([]);
    expect(groups.map((g) => g.title)).toEqual(['États préjudiciables', 'Environnement']);
    expect(groups[0].ids).toEqual(STATUS_EFFECT_IDS);
    expect(groups[1].ids).toEqual(ENVIRONMENTAL_EFFECT_IDS);
  });

  it('avec effets situationnels : ils s’intercalent avant l’environnement', () => {
    const groups = buildStatusGroups(['invalidating-attack']);
    expect(groups.map((g) => g.title)).toEqual([
      'États préjudiciables',
      'Effets situationnels',
      'Environnement',
    ]);
  });

  // L'environnement est UNIVERSEL (aucun déblocage par capacité) : toujours proposé au MJ.
  it('le groupe environnement est toujours présent', () => {
    expect(buildStatusGroups([]).map((g) => g.title)).toContain('Environnement');
    expect(buildStatusGroups(['silenced']).map((g) => g.title)).toContain('Environnement');
  });

  // Buffs de groupe (PER-104) : gatés comme les situationnels, mais en FIN de palette (seule
  // famille bénéfique, seule famille dont la pose s'adresse à plusieurs combattants).
  it('les buffs de groupe ferment la palette quand la table en débloque', () => {
    expect(buildStatusGroups(['invalidating-attack'], ['heroes-song']).map((g) => g.title)).toEqual([
      'États préjudiciables',
      'Effets situationnels',
      'Environnement',
      'Buffs de groupe',
    ]);
  });

  it('table sans barde ni prêtre : aucune ligne de buffs de groupe', () => {
    expect(buildStatusGroups([]).map((g) => g.title)).not.toContain('Buffs de groupe');
    expect(buildStatusGroups([], []).map((g) => g.title)).not.toContain('Buffs de groupe');
  });
});

describe('statusLabel / statusIconId / statusTone', () => {
  it('résout le libellé des quatre catalogues', () => {
    expect(statusLabel('blinded')).toBe('Aveuglé');
    expect(statusLabel('invalidating-attack')).toBe('Attaque invalidante');
    expect(statusLabel('aquatic-combat')).toBe('Combat aquatique');
    expect(statusLabel('heroes-song')).toBe('Chant des héros');
    expect(statusLabel('blessing')).toBe('Bénédiction');
  });

  it('les états d’environnement ont une icône, les situationnels et les buffs non', () => {
    expect(statusIconId('aquatic-combat')).toBe('aquatic-combat');
    expect(statusIconId('blinded')).toBe('blinded');
    expect(statusIconId('invalidating-attack')).toBeNull();
    expect(statusIconId('heroes-song')).toBeNull();
  });

  it('teinte : bleu (info) pour l’environnement, vert (success) pour un buff, rouge sinon', () => {
    expect(statusTone('aquatic-combat')).toBe('info');
    for (const id of STATUS_EFFECT_IDS) expect(statusTone(id), id).toBe('error');
    expect(statusTone('invalidating-attack')).toBe('error');
    for (const id of BENEFICIAL_EFFECT_IDS) expect(statusTone(id), id).toBe('success');
  });

  // Un état DÉDUIT (des PV, p. 220) passe en jaune, quelle que soit sa famille : il ne vient pas du
  // MJ et n'est pas retirable, il faut le distinguer d'un état posé.
  it('teinte : jaune (warning) pour un état déduit automatiquement', () => {
    expect(originStatusTone('weakened', 'auto')).toBe('warning');
    expect(originStatusTone('aquatic-combat', 'auto')).toBe('warning');
    expect(originStatusTone('weakened', 'manual')).toBe('error');
    expect(originStatusTone('aquatic-combat', 'manual')).toBe('info');
  });
});
