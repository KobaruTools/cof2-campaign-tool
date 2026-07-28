import { describe, expect, it } from 'vitest';
import type { Creature } from '@/data/schema';
import {
  creatureDefenseBadges,
  damageImmunityTitle,
  defenseCoversPrintedRd,
} from './creatureDefenseBadges';

/** Créature minimale : seuls les traits défensifs comptent ici. */
function creature(patch: Partial<Creature>): Creature {
  return { id: 'test', name: 'Test', category: 'animaux', sourcePage: 1, ...patch };
}

describe('creatureDefenseBadges — traits défensifs en badges (PER-260)', () => {
  it('aucun trait renseigné → aucun badge', () => {
    expect(creatureDefenseBadges(creature({}))).toEqual([]);
  });

  it('immunité de type de dégât → badge vert avec icône du type', () => {
    const [badge, ...rest] = creatureDefenseBadges(
      creature({ damageReduction: { kind: 'immunity', scopes: ['fire'] } }),
    );
    expect(rest).toEqual([]);
    expect(badge.variant).toBe('immunity');
    expect(badge.scope).toBe('fire');
    expect(badge.title).toBe('Immunité au feu');
  });

  it('immunité sur plusieurs types → un badge par type', () => {
    const badges = creatureDefenseBadges(
      creature({ damageReduction: { kind: 'immunity', scopes: ['fire', 'cold', 'acid'] } }),
    );
    expect(badges.map((b) => b.scope)).toEqual(['fire', 'cold', 'acid']);
  });

  it('immunité sans portée → un seul badge « tous DM »', () => {
    const [badge] = creatureDefenseBadges(creature({ damageReduction: { kind: 'immunity' } }));
    expect(badge.scope).toBeUndefined();
    expect(badge.text).toBe('tous DM');
  });

  it('RD plate typée → badge bleu « RD Non magiques 5 »', () => {
    const [badge] = creatureDefenseBadges(
      creature({ damageReduction: { kind: 'flat', value: 5, scopes: ['non-magical'] } }),
    );
    expect(badge.variant).toBe('reduction');
    expect(badge.scope).toBe('non-magical');
    expect(badge.text).toBe('5');
    expect(badge.title).toBe('RD Non magiques 5');
  });

  it('division des dégâts → badge « /2 » et titre « RD ÷2 »', () => {
    const [badge] = creatureDefenseBadges(creature({ damageReduction: { kind: 'divide', value: 2 } }));
    expect(badge.variant).toBe('reduction');
    expect(badge.text).toBe('/2');
    expect(badge.title).toBe('RD ÷2');
  });

  it('RD typée sur plusieurs types → icône générique « RD », portées dans le titre', () => {
    const [badge] = creatureDefenseBadges(
      creature({ damageReduction: { kind: 'divide', value: 2, scopes: ['slashing', 'fire'] } }),
    );
    expect(badge.scope).toBeUndefined();
    expect(badge.title).toBe('RD Tranchants, Feu ÷2');
  });

  it('immunité d’état → badge avec icône d’état et libellé français', () => {
    const badges = creatureDefenseBadges(creature({ statusImmunities: ['magic-sleep', 'paralyzed'] }));
    expect(badges.map((b) => b.statusEffect)).toEqual(['magic-sleep', 'paralyzed']);
    expect(badges.map((b) => b.title)).toEqual(['Immunité : Sommeil magique', 'Immunité : Paralysé']);
  });

  it('ordre : immunités d’état, puis immunités de type, puis réductions', () => {
    // Limace électrique (Bestiaire p. 15, patron du ticket) + une immunité d'état pour l'ordre.
    const badges = creatureDefenseBadges(
      creature({
        statusImmunities: ['fear'],
        damageReduction: [
          { kind: 'immunity', scopes: ['lightning'] },
          { kind: 'divide', value: 2, scopes: ['bludgeoning'] },
        ],
      }),
    );
    expect(badges.map((b) => b.title)).toEqual([
      'Immunité : Peur',
      "Immunité à l'électricité",
      'RD Contondants ÷2',
    ]);
  });

  it('clés uniques même avec deux RD de même nature', () => {
    const badges = creatureDefenseBadges(
      creature({
        damageReduction: [
          { kind: 'divide', value: 2, scopes: ['fire'] },
          { kind: 'divide', value: 2, scopes: ['cold'] },
        ],
      }),
    );
    expect(new Set(badges.map((b) => b.key)).size).toBe(2);
  });

  it('la précision (exception/condition) est ajoutée en 2e ligne de l’info-bulle', () => {
    const [badge] = creatureDefenseBadges(
      creature({
        damageReduction: {
          kind: 'flat',
          value: 5,
          note: 'Sauf les armes en argent et le feu.',
        },
      }),
    );
    expect(badge.sources.map((s) => s.name)).toEqual([
      'Réduit de 5 les DM subis.',
      'Sauf les armes en argent et le feu.',
    ]);
  });

  it('la précision suit aussi une immunité', () => {
    const [badge] = creatureDefenseBadges(
      creature({
        damageReduction: { kind: 'immunity', scopes: ['disease'], note: 'Maladies non magiques seulement.' },
      }),
    );
    expect(badge.sources.map((s) => s.name)).toEqual([
      'Immunité à la maladie',
      'Maladies non magiques seulement.',
    ]);
  });

  it('chaque badge porte une source (explication en info-bulle)', () => {
    const badges = creatureDefenseBadges(
      creature({ statusImmunities: ['prone'], damageReduction: { kind: 'flat', value: 3 } }),
    );
    for (const b of badges) expect(b.sources[0]?.name).toBeTruthy();
  });
});

describe('defenseCoversPrintedRd — dédoublonnage du badge accolé aux PV (PER-260)', () => {
  it('RD plate de même valeur dans le cadre Défense → le badge des PV s’efface', () => {
    const c = creature({ damageReduction: { kind: 'flat', value: 5, scopes: ['non-magical'] } });
    expect(defenseCoversPrintedRd(c, '5')).toBe(true);
  });

  it('valeur différente → les deux badges restent (protections distinctes)', () => {
    const c = creature({ damageReduction: { kind: 'flat', value: 10, scopes: ['cold'] } });
    expect(defenseCoversPrintedRd(c, '5')).toBe(false);
  });

  it('une division ne couvre pas une RD plate imprimée', () => {
    const c = creature({ damageReduction: { kind: 'divide', value: 2 } });
    expect(defenseCoversPrintedRd(c, '2')).toBe(false);
  });

  it('aucun trait défensif → le badge imprimé reste', () => {
    expect(defenseCoversPrintedRd(creature({}), '3')).toBe(false);
  });
});

describe('damageImmunityTitle — terminologie du livre', () => {
  it('« électricité » et non « foudre »', () => {
    expect(damageImmunityTitle('lightning')).toBe("Immunité à l'électricité");
  });

  it('type sans tournure dédiée → repli explicite', () => {
    expect(damageImmunityTitle('area')).toBe('Immunité aux DM (area)');
  });
});
