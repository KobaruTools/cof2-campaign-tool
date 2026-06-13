import { describe, expect, it } from 'vitest';
import type { CaracId, Peuple } from '@/data/schema';
import {
  appliquerModificateurs,
  choixComplets,
  choixInitiaux,
  deltasModificateurs,
  deuxPlusFaibles,
} from './peuple';
import {
  capaciteIdsNiveau1,
  caracsFinales,
  createDraft,
  materializeDraft,
  voieDePeupleEffective,
  type WizardDraft,
} from './wizard';

const zero = (): Record<CaracId, number> => ({
  AGI: 0,
  CON: 0,
  FOR: 0,
  PER: 0,
  CHA: 0,
  INT: 0,
  VOL: 0,
});

// Fixture : peuple à deux modificateurs « ou » (façon demi-elfe).
const demiElfe: Peuple = {
  id: 'demi-elfe',
  nom: 'Demi-elfe',
  description: '',
  reperes: { ageDepart: '', esperanceVie: '', taille: '', poids: '', traits: '' },
  modificateurs: [
    { valeur: 1, caracs: ['PER', 'CHA'] },
    { valeur: -1, caracs: ['FOR', 'CON'] },
  ],
  voieDePeupleIds: ['humain', 'elfe-sylvain', 'elfe-haut'],
  sourcePage: 45,
};

// Fixture : peuple à modificateur fixe + un choix (façon nain).
const nain: Peuple = {
  id: 'nain',
  nom: 'Nain',
  description: '',
  reperes: { ageDepart: '', esperanceVie: '', taille: '', poids: '', traits: '' },
  modificateurs: [
    { valeur: 1, caracs: ['CON', 'VOL'] },
    { valeur: -1, caracs: ['AGI'] },
  ],
  voieDePeupleIds: ['nain'],
  sourcePage: 58,
};

describe('choix de modificateurs de peuple', () => {
  it('initialise les caracs fixes et laisse les choix à null', () => {
    expect(choixInitiaux(demiElfe)).toEqual([null, null]);
    expect(choixInitiaux(nain)).toEqual([null, 'AGI']);
  });

  it('détecte les choix incomplets', () => {
    expect(choixComplets(demiElfe, [null, null])).toBe(false);
    expect(choixComplets(demiElfe, ['PER', 'CON'])).toBe(true);
    expect(choixComplets(nain, [null, 'AGI'])).toBe(false);
    expect(choixComplets(nain, ['CON', 'AGI'])).toBe(true);
  });
});

describe('application des modificateurs', () => {
  it('calcule les deltas résolus', () => {
    expect(deltasModificateurs(demiElfe, ['PER', 'CON'])).toMatchObject({ PER: 1, CON: -1 });
    expect(deltasModificateurs(nain, ['VOL', 'AGI'])).toMatchObject({ VOL: 1, AGI: -1 });
  });

  it('applique les deltas aux valeurs de base', () => {
    const base = { ...zero(), PER: 2, FOR: 3 };
    const out = appliquerModificateurs(base, demiElfe, ['PER', 'FOR']);
    expect(out.PER).toBe(3);
    expect(out.FOR).toBe(2);
  });

  it('ignore les choix non résolus (delta 0)', () => {
    expect(deltasModificateurs(demiElfe, [null, null])).toEqual(zero());
  });

  it('trouve les deux caractéristiques les plus faibles', () => {
    const base = { AGI: 2, CON: 1, FOR: -1, PER: 3, CHA: 0, INT: -2, VOL: 1 };
    expect(deuxPlusFaibles(base)).toEqual(['INT', 'FOR']);
  });
});

describe('capacités de niveau 1', () => {
  const base = (over: Partial<WizardDraft> = {}): WizardDraft => ({
    ...createDraft('id-1', '2026-01-01T00:00:00.000Z'),
    voiesChoisies: ['rage', 'pourfendeur'],
    voieDePeupleId: 'humain',
    ...over,
  });

  it('non-mage : rang 1 des 2 voies + rang 1 de la voie de peuple', () => {
    expect(capaciteIdsNiveau1(base()).sort()).toEqual(
      ['humain-r1', 'pourfendeur-r1', 'rage-r1'].sort(),
    );
  });

  it('mage avec bonus rang 2 dans une voie de profil', () => {
    const ids = capaciteIdsNiveau1(
      base({
        voiesChoisies: ['air', 'invocation'],
        voieDePeupleId: 'elfe-haut',
        slotVoieDuMage: true,
        mageBonus: { type: 'profil-rang2', voieId: 'invocation' },
      }),
    );
    expect(ids).toEqual(
      expect.arrayContaining(['air-r1', 'invocation-r1', 'elfe-haut-r1', 'mage-r1', 'invocation-r2']),
    );
  });

  it('mage avec bonus rang 2 de la voie du mage', () => {
    const ids = capaciteIdsNiveau1(base({ mageBonus: { type: 'mage-rang2' } }));
    expect(ids).toEqual(expect.arrayContaining(['mage-r1', 'mage-r2']));
  });

  it("voie du mage occupe l'emplacement de peuple", () => {
    expect(voieDePeupleEffective(base({ slotVoieDuMage: true }))).toBe('mage');
    expect(voieDePeupleEffective(base())).toBe('humain');
  });
});

describe('materializeDraft', () => {
  it('produit un personnage de niveau 1 cohérent', () => {
    const draft = {
      ...createDraft('perso-9', '2026-01-01T00:00:00.000Z'),
      peupleId: 'demi-elfe',
      voieDePeupleId: 'humain',
      profilId: 'barbare',
      caracsBase: { ...zero(), FOR: 3, CON: 2 },
      peupleChoix: ['PER', 'CON'] as (CaracId | null)[],
      voiesChoisies: ['rage', 'pourfendeur'],
      name: '  Maalik  ',
    };
    const c = materializeDraft(draft, demiElfe, '2026-02-02T00:00:00.000Z');
    expect(c.id).toBe('perso-9');
    expect(c.name).toBe('Maalik'); // trim
    expect(c.niveau).toBe(1);
    expect(c.caracteristiques.PER).toBe(1); // 0 +1
    expect(c.caracteristiques.CON).toBe(1); // 2 -1
    expect(c.caracteristiques.FOR).toBe(3);
    expect(c.capaciteIds.sort()).toEqual(['humain-r1', 'pourfendeur-r1', 'rage-r1'].sort());
    expect(c.levelUpHistory).toHaveLength(1);
    expect(c.createdAt).toBe('2026-01-01T00:00:00.000Z');
    expect(c.updatedAt).toBe('2026-02-02T00:00:00.000Z');
  });

  it('nom vide → libellé par défaut', () => {
    const c = materializeDraft(
      { ...createDraft('x', '2026-01-01T00:00:00.000Z'), peupleId: 'demi-elfe' },
      demiElfe,
      '2026-01-01T00:00:00.000Z',
    );
    expect(c.name).toBe('Nouveau personnage');
  });
});
