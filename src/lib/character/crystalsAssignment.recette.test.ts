/**
 * PER-360 — attribuer le bonus d'un cristal à un AUTRE personnage (voie des cristaux, p. 156).
 *
 * La règle l'autorise explicitement au rang 4 : « Il peut le porter ou le confier à la personne de
 * son choix », et la note de voie ajoute que l'activation vaut « à n'importe quelle distance ».
 * D'où les deux faces vérifiées ici :
 *  - le PORTEUR profite du cristal SANS l'avoir appris (`withReceivedCrystals`) — il ne l'a pas
 *    fabriqué, on le lui a confié ;
 *  - le PROPRIÉTAIRE cesse d'en profiter tant qu'il l'a confié (`withAssignedCrystalsOff`), sans
 *    pour autant le désactiver au sens de la règle (le cristal reste dans son plafond d'activation).
 *
 * Les chiffres restent ceux du catalogue des cristaux (`src/data/crystals.ts`, source unique) : les
 * entrées d'état de combat correspondantes ne portent AUCUN `modifiers`, sans quoi tout compterait
 * deux fois (cf. `src/data/crystalStatuses.ts`).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CRYSTALS, crystalById } from '@/data/crystals';
import { CRYSTAL_STATUS_IDS, CRYSTAL_STATUSES } from '@/data/crystalStatuses';
import { buildCharacterDerivedView } from '@/components/sheet/characterDerivedView';
import { deriveStats } from '@/lib/engine';
import { migrateCharacter } from '@/lib/engine/migrations';
import {
  activeKnownCrystals,
  crystalAbilityBonuses,
  crystalAbilitySources,
  crystalOwner,
  crystalsHeldByOthers,
  crystalStatBonuses,
  crystalStatSources,
  knownCrystalIds,
  maxActiveCrystals,
  receivedCrystals,
  withAssignedCrystalsOff,
  withReceivedCrystals,
} from '@/lib/character/crystals';
import { effectiveAbilities } from '@/lib/character/effects';
import { isBeneficialStatus, isCrystalStatus, statusEntry } from '@/lib/character/statusEffects';
import type { Character } from '@/lib/character/types';

function loadFixture(name: string): Character {
  const raw = JSON.parse(readFileSync(join(process.cwd(), 'examples/characters', `${name}.json`), 'utf8'));
  return migrateCharacter(raw);
}

/** Le mage de la voie des cristaux (9 appris, 5 actifs) et un camarade qui n'y connaît rien. */
const mage = loadFixture('recette-per74-cristaux');
const ally = loadFixture('recette-per104-allie-guerrier');

describe('PER-360 — catalogue des cristaux confiés (p. 156)', () => {
  it('un état par cristal, ids strictement alignés sur le catalogue des cristaux', () => {
    expect([...CRYSTAL_STATUS_IDS].sort()).toEqual(CRYSTALS.map((c) => c.id).sort());
    expect(Object.keys(CRYSTAL_STATUSES)).toHaveLength(14);
  });

  it('chaque entrée nomme le cristal, cite son effet et la règle du don, page 156', () => {
    for (const crystal of CRYSTALS) {
      const entry = CRYSTAL_STATUSES[crystal.id as keyof typeof CRYSTAL_STATUSES];
      expect(entry.label).toBe(`Cristal ${crystal.color} (${crystal.shape})`);
      expect(entry.effect).toContain(crystal.effectText);
      expect(entry.effect).toContain('confier à la personne de son choix');
      expect(entry.sourcePage).toBe(156);
    }
  });

  it('AUCUN `modifiers` : les chiffres viennent du canal des cristaux, jamais de l\'état', () => {
    for (const id of CRYSTAL_STATUS_IDS) {
      expect(CRYSTAL_STATUSES[id].modifiers).toBeUndefined();
      expect(CRYSTAL_STATUSES[id].stacking).toBeUndefined();
      // Portée INDIVIDUELLE : un cristal se confie à UNE personne, il n'ouvre pas de fenêtre de camp.
      expect(CRYSTAL_STATUSES[id].scope).toBeUndefined();
    }
  });

  it('un cristal confié est un état BÉNÉFIQUE, résolu par le catalogue commun', () => {
    for (const id of CRYSTAL_STATUS_IDS) {
      expect(isCrystalStatus(id)).toBe(true);
      expect(isBeneficialStatus(id)).toBe(true);
      expect(statusEntry(id)).toBe(CRYSTAL_STATUSES[id]);
    }
    // L'espace d'ids reste disjoint des quatre autres catalogues.
    expect(isCrystalStatus('heroes-song')).toBe(false);
    expect(isCrystalStatus('blinded')).toBe(false);
  });
});

describe('PER-360 — le porteur profite du cristal sans l\'avoir appris', () => {
  it('le camarade ne connaît aucun cristal et n\'en active aucun', () => {
    expect(knownCrystalIds(ally)).toEqual([]);
    expect(maxActiveCrystals(ally)).toBe(0);
    expect(activeKnownCrystals(ally)).toEqual([]);
  });

  it.each(CRYSTALS.map((c) => [c.id, c.color] as const))(
    'reçoit %s (%s) : le catalogue le résout sur le porteur',
    (crystalId) => {
      const holder = withReceivedCrystals(ally, [crystalId]);
      expect(receivedCrystals(holder).map((c) => c.id)).toEqual([crystalId]);

      const crystal = crystalById.get(crystalId)!;
      // Bonus de caractéristique (6 cristaux) : delta d'exactement ce que dit la table p. 156.
      const expectedAbilities = crystal.abilityBonus
        ? { [crystal.abilityBonus.ability]: crystal.abilityBonus.value }
        : {};
      expect(crystalAbilityBonuses(holder)).toEqual(expectedAbilities);
      // Bonus de stat dérivée (3 cristaux, dont Vert pâle sur les TROIS jets d'attaque).
      const expectedStats: Record<string, number> = {};
      for (const b of crystal.statBonuses ?? []) expectedStats[b.stat] = b.value;
      expect(crystalStatBonuses(holder)).toEqual(expectedStats);
    },
  );

  it('un cristal de caractéristique confié CASCADE dans les stats dérivées du porteur', () => {
    const before = deriveStats(buildCharacterDerivedView(ally).derivedInput!);
    // Rose vif = +1 AGI, et la DEF vaut 10 + AGI : le porteur défend d'un point de mieux.
    const agile = withReceivedCrystals(ally, ['cristal-rose-vif']);
    expect(effectiveAbilities(agile).AGI).toBe(effectiveAbilities(ally).AGI + 1);
    expect(deriveStats(buildCharacterDerivedView(agile).derivedInput!).defense).toBe(
      before.defense + 1,
    );
    // Bleu incandescent = +1 PER, et l'Initiative vaut 10 + PER : elle monte d'un point elle aussi —
    // c'est bien la caractéristique qui a bougé, pas une stat recopiée.
    const alert = withReceivedCrystals(ally, ['cristal-bleu-incandescent']);
    expect(effectiveAbilities(alert).PER).toBe(effectiveAbilities(ally).PER + 1);
    expect(deriveStats(buildCharacterDerivedView(alert).derivedInput!).initiative).toBe(
      before.initiative + 1,
    );
  });

  it('un cristal de stat dérivée confié se fond dans les mods du porteur', () => {
    const holder = withReceivedCrystals(ally, ['cristal-bleu-nuit']); // +5 en Init.
    const before = deriveStats(buildCharacterDerivedView(ally).derivedInput!);
    const after = deriveStats(buildCharacterDerivedView(holder).derivedInput!);
    expect(after.initiative).toBe(before.initiative + 5);
  });

  it('plusieurs cristaux confiés se cumulent ; un id inconnu est ignoré', () => {
    const holder = withReceivedCrystals(ally, [
      'cristal-rose-vif', // +1 AGI
      'cristal-violet', // +1 CHA
      'cristal-rose-laiteux', // +2 DEF
      'chant-des-heros-nawak',
    ]);
    expect(crystalAbilityBonuses(holder)).toEqual({ AGI: 1, CHA: 1 });
    expect(crystalStatBonuses(holder)).toEqual({ def: 2 });
  });

  it('sans rien de confié, le personnage est renvoyé INCHANGÉ (même référence)', () => {
    expect(withReceivedCrystals(ally, [])).toBe(ally);
    expect(withReceivedCrystals(ally, ['heroes-song'])).toBe(ally);
  });
});

describe('PER-360 — le propriétaire cesse d\'en profiter tant qu\'il l\'a confié', () => {
  it('le mage compte ses 5 cristaux actifs tant qu\'il n\'a rien confié', () => {
    expect(crystalAbilityBonuses(mage)).toEqual({ CHA: 1, AGI: 1 });
    expect(crystalStatBonuses(mage)).toEqual({
      initiative: 5,
      def: 2,
      meleeAttack: 1,
      rangedAttack: 1,
      magicAttack: 1,
    });
  });

  it('confier le Bleu nuit lui retire les +5 d\'Initiative, et rien d\'autre', () => {
    const giver = withAssignedCrystalsOff(mage, ['cristal-bleu-nuit']);
    expect(crystalStatBonuses(giver)).toEqual({
      def: 2,
      meleeAttack: 1,
      rangedAttack: 1,
      magicAttack: 1,
    });
    expect(crystalAbilityBonuses(giver)).toEqual({ CHA: 1, AGI: 1 });
  });

  it('confier un cristal de caractéristique lui retire le bonus correspondant', () => {
    const giver = withAssignedCrystalsOff(mage, ['cristal-violet']); // +1 CHA
    expect(crystalAbilityBonuses(giver)).toEqual({ AGI: 1 });
    expect(effectiveAbilities(giver).CHA).toBe(mage.abilities.CHA);
  });

  it('le cristal confié reste ACTIVÉ au sens de la règle (il compte dans le plafond du rang)', () => {
    const giver = withAssignedCrystalsOff(mage, ['cristal-bleu-nuit']);
    // La copie de calcul n'a plus le cristal, mais le personnage RÉEL, lui, l'a toujours activé :
    // « il peut activer les effets de N cristaux simultanément » (p. 156) ne distingue pas qui porte.
    expect(mage.activeCrystalIds).toContain('cristal-bleu-nuit');
    expect(giver.activeCrystalIds).not.toContain('cristal-bleu-nuit');
    expect(maxActiveCrystals(giver)).toBe(5);
  });

  it('rien de confié, ou un cristal inactif : personnage renvoyé INCHANGÉ (même référence)', () => {
    expect(withAssignedCrystalsOff(mage, [])).toBe(mage);
    expect(withAssignedCrystalsOff(mage, ['cristal-irise'])).toBe(mage); // appris mais pas actif
  });

  it('l\'état de combat partagé suffit à savoir ce qu\'il a confié (survit au rechargement)', () => {
    const posed = { 'guerrier-1': [{ id: 'cristal-bleu-nuit' }], [mage.id]: [{ id: 'blinded' }] };
    // Carte locale VIDE (page rechargée) : c'est l'état partagé qui dit que le cristal est ailleurs.
    expect(crystalsHeldByOthers(posed, mage.id, null)).toEqual(['cristal-bleu-nuit']);
    // Ce que le mage porte lui-même ne compte pas comme confié, cristal ou pas.
    expect(crystalsHeldByOthers({ [mage.id]: [{ id: 'cristal-violet' }] }, mage.id, null)).toEqual([]);
    // Couche optimiste et état partagé se réunissent sans doublon.
    expect(
      crystalsHeldByOthers(posed, mage.id, { 'cristal-bleu-nuit': 'guerrier-1', 'cristal-violet': 'x' }),
    ).toEqual(['cristal-bleu-nuit', 'cristal-violet']);
    // Aucun combat en cours : rien n'est confié.
    expect(crystalsHeldByOthers(undefined, mage.id, null)).toEqual([]);
  });

  it('chaque bonus NOMME son cristal dans le détail de calcul, et dit s\'il vient d\'ailleurs', () => {
    // Retour de recette : « Capacités / Divers » sans un mot sur la source ne dit rien au joueur.
    const own = crystalStatSources(mage);
    expect(own.initiative).toEqual([
      { crystalId: 'cristal-bleu-nuit', label: 'Cristal Bleu nuit (Rhombe)', value: 5, received: false },
    ]);
    expect(crystalAbilitySources(mage).CHA).toEqual([
      { crystalId: 'cristal-violet', label: 'Cristal Violet (Sphère)', value: 1, received: false },
    ]);
    // Le Vert pâle porte les TROIS attaques : une ligne par stat, toutes attribuées au même cristal.
    for (const key of ['meleeAttack', 'rangedAttack', 'magicAttack'] as const) {
      expect(own[key]).toEqual([
        { crystalId: 'cristal-vert-pale', label: 'Cristal Vert pâle (Prisme)', value: 1, received: false },
      ]);
    }
    // Chez le PORTEUR, le même bonus est marqué comme reçu — c'est ce qui déclenche la mention
    // « confié par … » dans l'info-bulle (le nom du JOUEUR, lu sur l'état posé).
    const holder = withReceivedCrystals(ally, ['cristal-bleu-nuit']);
    expect(crystalStatSources(holder).initiative).toEqual([
      { crystalId: 'cristal-bleu-nuit', label: 'Cristal Bleu nuit (Rhombe)', value: 5, received: true },
    ]);
    // Un cristal sans chiffre (narratif) n'invente aucune ligne.
    expect(crystalStatSources(withReceivedCrystals(ally, ['cristal-irise']))).toEqual({});
  });

  it('le mage à qui on rend un cristal est retrouvé par la table, jamais par l\'état posé', () => {
    // L'état posé sur le porteur ne porte que l'id du cristal : c'est la table qui dit à qui il est.
    expect(crystalOwner([ally, mage], 'cristal-bleu-nuit')?.id).toBe(mage.id);
    // Un cristal APPRIS mais éteint n'a personne à qui revenir (il est déjà chez lui, inactif).
    expect(crystalOwner([ally, mage], 'cristal-irise')).toBeNull();
    // Un cristal qu'on n'a pas appris ne s'attribue pas à qui l'a par erreur dans ses ids actifs.
    const impostor: Character = { ...ally, activeCrystalIds: ['cristal-bleu-nuit'] };
    expect(crystalOwner([impostor], 'cristal-bleu-nuit')).toBeNull();
  });

  it('un aller-retour complet ne fait jamais compter le bonus deux fois', () => {
    const crystalId = 'cristal-rose-laiteux'; // +2 DEF
    const giver = withAssignedCrystalsOff(mage, [crystalId]);
    const holder = withReceivedCrystals(ally, [crystalId]);
    // La DEF quitte le mage et arrive chez le porteur — jamais chez les deux à la fois.
    expect(crystalStatBonuses(giver).def).toBeUndefined();
    expect(crystalStatBonuses(holder).def).toBe(2);
  });
});
