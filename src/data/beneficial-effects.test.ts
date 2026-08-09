import { describe, expect, it } from 'vitest';
import {
  ABILITY_MAX,
  BENEFICIAL_EFFECT_IDS,
  BENEFICIAL_EFFECTS,
  BENEFICIAL_EFFECT_LABELS,
  ENVIRONMENTAL_EFFECT_IDS,
  SITUATIONAL_EFFECT_IDS,
  STATUS_EFFECT_IDS,
} from './schema';
import { featureById } from './index';
import {
  isStackingStatus,
  resolveStatusModifiers,
  statusEntry,
  statusMaxIntensity,
  statusSheetImpact,
} from '@/lib/character/statusEffects';

// Catalogue des BUFFS DE GROUPE (PER-104) : quatrième famille, la seule BÉNÉFIQUE — un effet que le
// porteur confère à « ses alliés et lui » (Chant des héros p. 67, Bénédiction p. 124).
describe('BENEFICIAL_EFFECTS (catalogue)', () => {
  it('chaque id a un libellé + un effet verbatim + une page source valide', () => {
    for (const id of BENEFICIAL_EFFECT_IDS) {
      const entry = BENEFICIAL_EFFECTS[id];
      expect(entry, id).toBeDefined();
      expect(entry.label.trim().length, `${id}.label`).toBeGreaterThan(0);
      expect(entry.effect.trim().length, `${id}.effect`).toBeGreaterThan(0);
      expect(entry.sourcePage, `${id}.sourcePage`).toBeGreaterThan(0);
    }
  });

  it('BENEFICIAL_EFFECT_LABELS est dérivé du catalogue', () => {
    for (const id of BENEFICIAL_EFFECT_IDS) {
      expect(BENEFICIAL_EFFECT_LABELS[id]).toBe(BENEFICIAL_EFFECTS[id].label);
    }
  });

  // Les QUATRE espaces d'ids doivent rester DISJOINTS : `statusEntry` retrouve le catalogue à partir
  // du seul id (chaînage `??`), donc une collision ferait taire silencieusement une entrée.
  it('les ids bénéfiques ne collisionnent avec aucun autre catalogue', () => {
    const others = new Set<string>([
      ...STATUS_EFFECT_IDS,
      ...SITUATIONAL_EFFECT_IDS,
      ...ENVIRONMENTAL_EFFECT_IDS,
    ]);
    for (const id of BENEFICIAL_EFFECT_IDS) expect(others.has(id), id).toBe(false);
  });

  // Tout buff bénéfique se pose depuis la FENÊTRE de choix du camp, jamais sur la seule carte
  // survolée — mais depuis PER-359 la portée exacte se décline : tout le camp ou un seul allié.
  it('tout buff bénéfique porte une portée de camp (`group` ou `single-ally`)', () => {
    for (const id of BENEFICIAL_EFFECT_IDS)
      expect(['group', 'single-ally'], id).toContain(BENEFICIAL_EFFECTS[id].scope);
  });

  it('« Chant des héros » (p. 67) : +1 à tous les tests, palier +2 au rang 5', () => {
    const entry = BENEFICIAL_EFFECTS['heroes-song'];
    expect(entry.label).toBe('Chant des héros');
    expect(entry.sourcePage).toBe(67);
    // Verbatim du BARDE : « à tous leurs tests », sans la restriction du prêtre.
    expect(entry.effect).toContain('un bonus de +1 à tous leurs tests pendant un nombre de minutes');
    expect(entry.effect).toContain('Le bonus passe à +2 au rang 5.');
    expect(entry.modifiers).toEqual({ allTestsFlat: 1 });
    expect(entry.stacking).toEqual({ max: 2 });
    expect(isStackingStatus('heroes-song')).toBe(true);
    expect(statusMaxIntensity('heroes-song')).toBe(2);
  });

  it('« Bénédiction » (p. 124) : même chiffrage, verbatim DISTINCT du barde', () => {
    const entry = BENEFICIAL_EFFECTS.blessing;
    expect(entry.label).toBe('Bénédiction');
    expect(entry.sourcePage).toBe(124);
    // Verbatim du PRÊTRE : « tests de caractéristique et d'attaque ». Jamais fusionné avec le barde.
    expect(entry.effect).toContain("tests de caractéristique et d'attaque");
    expect(entry.effect).not.toBe(BENEFICIAL_EFFECTS['heroes-song'].effect);
    expect(entry.modifiers).toEqual({ allTestsFlat: 1 });
    expect(entry.stacking).toEqual({ max: 2 });
  });

  it('statusEntry retrouve un buff de groupe depuis son seul id', () => {
    expect(statusEntry('heroes-song')?.label).toBe('Chant des héros');
    expect(statusEntry('blessing')?.label).toBe('Bénédiction');
  });

  it('resolveStatusModifiers (écran de MJ) : +1 au rang 1, +2 à l’intensité 2', () => {
    expect(resolveStatusModifiers([{ id: 'heroes-song' }]).allTestsFlat).toBe(1);
    expect(resolveStatusModifiers([{ id: 'heroes-song', intensity: 2 }]).allTestsFlat).toBe(2);
    // Plafonné à 2 paliers : une intensité 3 relue de travers ne donne pas +3.
    expect(resolveStatusModifiers([{ id: 'blessing', intensity: 3 }]).allTestsFlat).toBe(2);
  });

  // Le buff ANNULE le malus, sans traitement particulier : les deux passent par `allTestsFlat`.
  it('se compense avec un malus plat (Attaque invalidante ×1)', () => {
    const r = resolveStatusModifiers([{ id: 'heroes-song' }, { id: 'invalidating-attack' }]);
    expect(r.allTestsFlat).toBe(0);
    expect(r.damageDealt).toBe(-1);
  });
});

// Câblage DONNÉES → capacités : c'est `Feature.groupBuffIds` qui débloque la puce dans la palette.
describe('groupBuffIds (capacités porteuses)', () => {
  it('Chant des héros est déclaré sur musicien-r1 (p. 67)', () => {
    expect(featureById.get('musicien-r1')?.groupBuffIds).toEqual(['heroes-song']);
  });

  it('Bénédiction est déclarée sur priere-r1 (p. 124)', () => {
    expect(featureById.get('priere-r1')?.groupBuffIds).toEqual(['blessing']);
  });

  it('tout `groupBuffIds` déclaré pointe vers une entrée du catalogue', () => {
    const known = new Set<string>(BENEFICIAL_EFFECT_IDS);
    for (const feature of featureById.values()) {
      for (const id of feature.groupBuffIds ?? []) {
        expect(known.has(id), `${feature.id} → ${id}`).toBe(true);
      }
    }
  });
});

// VENTILATION vers la fiche (PER-104, lot 2) : un « +1 à tous les tests » doit se voir à la fois sur
// les tests de CARACTÉRISTIQUE (canal `abilityTestBonus`, rendu par `TestDomainsPanel`) et sur les
// trois jets d'ATTAQUE — jusqu'ici `allTestsFlat` ne retombait que sur les attaques.
describe('statusSheetImpact — buff de groupe sur la fiche', () => {
  // Un buff se ventile sous son PROPRE nom (« Chant des héros +1 »), sans le préfixe « État : »
  // réservé aux effets subis : ce n'est pas un état préjudiciable.
  it('Chant des héros +1 : les trois attaques ET les tests de carac', () => {
    const r = statusSheetImpact([{ id: 'heroes-song' }]);
    expect(r.mods).toEqual({ meleeAttack: 1, rangedAttack: 1, magicAttack: 1 });
    expect(r.modSources.meleeAttack).toEqual([{ label: 'Chant des héros', value: 1 }]);
    expect(r.abilityTestSources).toEqual([
      { id: 'heroes-song', label: 'Chant des héros', value: 1 },
    ]);
    expect(r.allTestsFlat).toBe(1);
  });

  it('au rang 5 (intensité 2), le palier vaut +2 partout', () => {
    const r = statusSheetImpact([{ id: 'blessing', intensity: 2 }]);
    expect(r.mods).toEqual({ meleeAttack: 2, rangedAttack: 2, magicAttack: 2 });
    expect(r.abilityTestSources).toEqual([{ id: 'blessing', label: 'Bénédiction', value: 2 }]);
  });

  // Un MALUS plat se ventile désormais AUSSI vers les tests de carac (il manquait) : « -1 à tous les
  // tests » de l'Attaque invalidante ne frappait que les attaques.
  it('un malus plat se ventile lui aussi vers les tests de carac', () => {
    const r = statusSheetImpact([{ id: 'invalidating-attack', intensity: 2 }]);
    expect(r.abilityTestSources).toEqual([
      { id: 'invalidating-attack', label: 'État : Attaque invalidante', value: -2 },
    ]);
    expect(r.mods.meleeAttack).toBe(-2);
  });

  it('buff et malus se compensent, chacun gardant sa ligne dans le détail « i »', () => {
    const r = statusSheetImpact([{ id: 'heroes-song' }, { id: 'invalidating-attack' }]);
    expect(r.abilityTestSources).toEqual([
      { id: 'heroes-song', label: 'Chant des héros', value: 1 },
      { id: 'invalidating-attack', label: 'État : Attaque invalidante', value: -1 },
    ]);
    // Total nul → la stat n'apparaît plus dans `mods` (on n'expose que les totaux non nuls).
    expect(r.mods.meleeAttack).toBeUndefined();
    expect(r.allTestsFlat).toBe(0);
  });

  it('un état sans malus plat ne produit aucune ventilation de test de carac', () => {
    expect(statusSheetImpact([{ id: 'prone' }]).abilityTestSources).toEqual([]);
  });
});

/* --------------------------------------------------------------------------- *
 * PER-359 — les quatre buffs issus du recensement. Chacun doit dire d'où sort son chiffre,
 * qui il vise, et si son lanceur en profite.
 * --------------------------------------------------------------------------- */

describe('PER-359 — buffs recensés', () => {
  it('« Aura du chef de guerre » (p. 161) : +1 DEF et +1 DM, palier au niveau 16', () => {
    const entry = BENEFICIAL_EFFECTS['warlord-aura'];
    expect(entry.label).toBe('Aura du chef de guerre');
    expect(entry.sourcePage).toBe(161);
    expect(entry.effect).toContain("d'un bonus de +1 en DEF et aux DM pendant INT minutes");
    expect(entry.effect).toContain('À partir du niveau 16, ce bonus passe à +2.');
    expect(entry.modifiers).toEqual({ derived: { def: 1 }, damageDealt: 1 });
    expect(entry.intensityFrom).toEqual({ kind: 'character-level', level: 16 });
    // « Tous VOS alliés » : le mage de guerre lui-même n'en profite pas.
    expect(entry.excludesCarrier).toBe(true);
  });

  it('« Sans peur » (p. 85) : bonus limité au domaine « résister à la peur », palier = CHA', () => {
    const entry = BENEFICIAL_EFFECTS['fearless-rally'];
    expect(entry.sourcePage).toBe(85);
    expect(entry.effect).toContain('un bonus égal à son CHA aux tests de tous ses alliés');
    expect(entry.modifiers?.testDomains).toEqual({ domains: ['fear-resistance'], value: 1 });
    // Le bonus ne frappe PAS tous les tests : c'est tout l'intérêt du canal par domaine.
    expect(entry.modifiers?.allTestsFlat).toBeUndefined();
    expect(entry.intensityFrom).toEqual({ kind: 'ability', ability: 'CHA' });
  });

  it('« Argument de taille » (p. 79) : les trois domaines sociaux du livre, palier = FOR', () => {
    const entry = BENEFICIAL_EFFECTS['towering-argument'];
    expect(entry.sourcePage).toBe(79);
    expect(entry.effect).toContain('à ceux de ses alliés au contact');
    expect(entry.modifiers?.testDomains).toEqual({
      domains: ['negotiation', 'persuasion', 'intimidation'],
      value: 1,
    });
    expect(entry.intensityFrom).toEqual({ kind: 'ability', ability: 'FOR' });
    // Le barbare a DÉJÀ ce bonus par ses propres effets : le lui poser le compterait deux fois.
    expect(entry.excludesCarrier).toBe(true);
  });

  it('« Protéger un allié » (p. 87) : +2 DEF sur UN allié, sans palier', () => {
    const entry = BENEFICIAL_EFFECTS['shield-ally'];
    expect(entry.sourcePage).toBe(87);
    expect(entry.scope).toBe('single-ally');
    expect(entry.modifiers).toEqual({ derived: { def: 2 } });
    // Valeur fixe : ni cumul ni escalade, donc rien à pré-remplir.
    expect(entry.stacking).toBeUndefined();
    expect(entry.intensityFrom).toBeUndefined();
  });

  it('un palier lu sur une carac laisse la place au maximum de cette carac', () => {
    for (const id of ['fearless-rally', 'towering-argument'] as const) {
      const entry = BENEFICIAL_EFFECTS[id];
      expect(entry.intensityFrom?.kind, id).toBe('ability');
      expect(entry.stacking?.max, id).toBe(ABILITY_MAX);
    }
  });
});

/* ---------------------------------------------------------------------------
 * DOUBLE COMPTE CHEZ LE PORTEUR — l'invariant qui décide de `excludesCarrier`.
 *
 * Le porteur d'un buff a deux façons de tenir DÉJÀ le même chiffre sur sa fiche, et une seule des
 * deux se voit à l'exécution :
 *  - par un effet TEMPORAIRE (`conditional-stat-bonus`, un interrupteur : Chant des héros,
 *    Bénédiction) — la séance le neutralise à la volée, cf. `supersededBuffToggles` (PER-314) ;
 *  - par un effet PERMANENT (`test-bonus` : Argument de taille, où le barbare a déjà +FOR sur les
 *    trois domaines sociaux) — RIEN ne peut le neutraliser, puisqu'il n'y a pas d'interrupteur à
 *    éteindre. Le seul remède est de ne pas lui poser le buff du tout : `excludesCarrier`.
 *
 * D'où la règle vérifiée ici : dès qu'un buff par domaine recoupe un bonus PERMANENT de sa propre
 * capacité porteuse, `excludesCarrier` est OBLIGATOIRE. Ce test est le garde-fou du recensement
 * PER-359 — il rattrape tout buff ajouté plus tard qui rouvrirait le défaut de PER-314.
 * --------------------------------------------------------------------------- */

describe('PER-359 — aucun buff ne double le bonus PERMANENT de son porteur', () => {
  /** Capacité qui confère le buff (`groupBuffIds`), telle que la palette la débloque. */
  const carrierOf = (buffId: (typeof BENEFICIAL_EFFECT_IDS)[number]) =>
    [...featureById.values()].find((f) => f.groupBuffIds?.includes(buffId));

  it('un recoupement de domaines avec un `test-bonus` du porteur impose `excludesCarrier`', () => {
    for (const id of BENEFICIAL_EFFECT_IDS) {
      const buffDomains = BENEFICIAL_EFFECTS[id].modifiers?.testDomains?.domains;
      if (!buffDomains) continue;
      const carrier = carrierOf(id);
      expect(carrier, `aucune capacité ne confère ${id}`).toBeDefined();
      // `test-bonus` n'a ni `activation` ni durée : il vaut en permanence sur la fiche du porteur.
      const permanent = (carrier?.effects ?? []).flatMap((e) =>
        e.kind === 'test-bonus' ? e.domains : [],
      );
      const overlap = buffDomains.filter((d) => permanent.includes(d));
      if (overlap.length > 0) {
        expect(
          BENEFICIAL_EFFECTS[id].excludesCarrier,
          `${id} recoupe ${overlap.join(', ')} sur ${carrier?.id} : le porteur doit être exclu`,
        ).toBe(true);
      }
    }
  });

  it('Argument de taille est le cas qui motive la règle, Sans peur son contre-exemple', () => {
    // Le barbare : mêmes domaines des deux côtés → exclu.
    const brute = carrierOf('towering-argument');
    expect(brute?.id).toBe('brute-r1');
    expect(brute?.effects?.some((e) => e.kind === 'test-bonus')).toBe(true);
    expect(BENEFICIAL_EFFECTS['towering-argument'].excludesCarrier).toBe(true);

    // Le chevalier : son bonus permanent vise la tactique et le commandement, le buff la peur —
    // aucun recoupement. S'il est exclu, c'est parce que le livre dit « tous ses ALLIÉS », et
    // parce qu'il est de toute façon immunisé : deux raisons distinctes du double compte.
    const knight = carrierOf('fearless-rally');
    expect(knight?.id).toBe('meneur-d-hommes-r1');
    const knightDomains = (knight?.effects ?? []).flatMap((e) =>
      e.kind === 'test-bonus' ? e.domains : [],
    );
    expect(knightDomains).not.toContain('fear-resistance');
    expect(knight?.effects?.some((e) => e.kind === 'immunity')).toBe(true);
  });

  it('un porteur que la règle INCLUT reste bénéficiaire, son interrupteur relevant de PER-314', () => {
    // « ses alliés ET LUI » : ces deux-là ne s'excluent pas — les neutraliser priverait le barde et
    // le prêtre d'un bonus que le livre leur accorde. Leur porteur n'a AUCUN `test-bonus` sur les
    // tests visés par le buff (ses bonus permanents portent sur la musique / la théologie) : le seul
    // recoupement est l'interrupteur temporaire, que la séance éteint.
    for (const id of ['heroes-song', 'blessing'] as const) {
      const entry = BENEFICIAL_EFFECTS[id];
      expect(entry.effect, id).toContain('et lui');
      expect(entry.excludesCarrier, id).toBeUndefined();
      const carrier = carrierOf(id);
      expect(
        carrier?.effects?.some(
          (e) => e.kind === 'conditional-stat-bonus' && e.activation.kind === 'temporary',
        ),
        `${id} : le porteur doit garder l'interrupteur que PER-314 neutralise`,
      ).toBe(true);
    }
  });
});
