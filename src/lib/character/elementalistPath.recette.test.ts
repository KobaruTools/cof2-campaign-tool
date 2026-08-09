/**
 * PER-74 — voie de l'élémentaliste (p. 157, 4ᵉ voie MAGE dans l'ordre du livre), recette end-to-end.
 *
 * Retours propriétaire (2026-08-08, 2e passe) : l'élémentaire invoqué au rang 6 (et la forme du
 * rang 8) ne sont PAS « de l'élément au choix » à chaque activation comme l'écrit le livre — ils
 * reprennent TOUJOURS l'élément de prédilection retenu au rang 4 (arbitrage propriétaire). Une
 * seule branche s'applique donc jamais, déduite des immunités du tableau r6 : feu→Feu, acide→Eau,
 * électricité→Air, froid→Terre.
 *
 * R4 Élément de prédilection : choix PERMANENT (patron Ascendance draconique, sang-dragon-r4) —
 * chaque option porte désormais le `creatureUpgrade` de SA branche (immunité + bonus propre),
 * gathered par `applyCreatureUpgrades` sur la voie (même pathId que r6, ciblage par défaut). Le
 * bonus d'attaque magique +2 / malus de résistance +2 restent verbatim (pas de primitive de bonus
 * d'attaque de SORT scopée par type de dégâts). R5 : RD ÷2 scopée cross-capacité, inchangée. R6 :
 * mini-fiche structurée, titre + nom de créature DÉCLINÉS (`%of%`) sur l'élément de rang 4, DM en
 * dice-parse (`[2d4° + 6]`), immunité + bonus de branche portés par l'option de rang 4 — plus de
 * tableau verbatim dans le rendu (richText prose seule). R7 : dé parsé (`+{1d4°}`) + élément rappelé
 * (`%noun%`), toujours verbatim pour le bonus lui-même. R8 : durée parsée (`[=5 + INT]`), immunité à
 * l'élément de rang 4 désormais mécanisée (2e entrée de RD, cross-capacité comme r5) — la
 * réduction aux seules capacités de la branche retenue et la mécanisation des bonus propres à
 * chaque branche restent EN ATTENTE (pas de primitive de bonus par branche sur une transformation).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { featureById, pathById } from '@/data';
import { migrateCharacter } from '@/lib/engine/migrations';
import { damageReductionSources } from '@/lib/character/effects';
import { displayCreatureProfile } from '@/lib/character/companions';
import { declineForFeature } from '@/lib/character/dragonElement';
import { checkCompliance } from '@/lib/engine/legality';
import { rulesContext } from '@/lib/character/rulesContext';
import type { Character } from '@/lib/character/types';

const PATH_ID = 'prestige-elementaliste';
const R4 = `${PATH_ID}-r4`;
const R5 = `${PATH_ID}-r5`;
const R6 = `${PATH_ID}-r6`;
const R7 = `${PATH_ID}-r7`;
const R8 = `${PATH_ID}-r8`;

function loadFixture(name: string): Character {
  const raw = JSON.parse(readFileSync(join(process.cwd(), 'examples/characters', `${name}.json`), 'utf8'));
  return migrateCharacter(raw);
}

describe("PER-74 — voie de l'élémentaliste (p. 157, recette end-to-end)", () => {
  const character = loadFixture('recette-per74-elementaliste'); // featureChoices r4 = ['fire']

  it('voie de prestige de la catégorie mage, sans prérequis', () => {
    const path = pathById.get(PATH_ID)!;
    expect(path.type).toBe('prestige');
    expect('category' in path && path.category).toBe('mage');
    expect(path.sourcePage).toBe(157);
    expect('prerequisites' in path && path.prerequisites).toBe('');
  });

  it('aucune anomalie de conformité sur le fixture (compliance propre)', () => {
    expect(checkCompliance(character, rulesContext)).toEqual([]);
  });

  it('r4 Élément de prédilection : choix permanent, chaque option porte le creatureUpgrade de sa branche', () => {
    const r4 = featureById.get(R4)!;
    expect(r4.choices).toHaveLength(1);
    const opts = r4.choices?.[0].kind === 'option' ? r4.choices[0].options : [];
    expect(opts.map((o) => o.id)).toEqual(['fire', 'cold', 'lightning', 'acid']);
    // feu→Feu (immunité feu + dé de DM), froid→Terre (immunité froid + DEF), électricité→Air
    // (immunité foudre + note vol), acide→Eau (immunité acide + dé bonus en attaque) — mapping
    // déduit des immunités du tableau r6 (confirmé propriétaire).
    expect(opts.find((o) => o.id === 'fire')?.creatureUpgrade).toEqual({
      damageReduction: { kind: 'immunity', scopes: ['fire'] },
      meleeDamageDice: '1d4°',
    });
    expect(opts.find((o) => o.id === 'cold')?.creatureUpgrade).toEqual({
      damageReduction: { kind: 'immunity', scopes: ['cold'] },
      def: 5,
    });
    expect(opts.find((o) => o.id === 'lightning')?.creatureUpgrade).toEqual({
      damageReduction: { kind: 'immunity', scopes: ['lightning'] },
      note: 'Peut voler à 30 m par round.',
    });
    expect(opts.find((o) => o.id === 'acid')?.creatureUpgrade).toEqual({
      damageReduction: { kind: 'immunity', scopes: ['acid'] },
      attackBonusDie: true,
    });
    expect(r4.effects).toBeUndefined();
  });

  it('r5 Résistance élémentaire : RD ÷2 scopée sur l’élément retenu au rang 4 (cross-capacité)', () => {
    const r5 = featureById.get(R5)!;
    expect(r5.elementFromChoice).toEqual({ choiceFeatureId: R4, choiceIndex: 0 });
    expect(r5.damageReduction).toEqual({ kind: 'divide', value: 2, scopeFromElement: true });

    const drs = damageReductionSources(character);
    const resistance = drs.find((d) => d.featureId === R5);
    expect(resistance?.reduction).toMatchObject({ kind: 'divide', value: 2, scopes: ['fire'] });
  });

  it('r5 : sans élément de prédilection choisi, la RD disparaît (pas de repli, comme sang-dragon)', () => {
    const sansChoix: Character = { ...character, featureIds: [R5], featureChoices: {} };
    expect(damageReductionSources(sansChoix).find((d) => d.featureId === R5)).toBeUndefined();
  });

  it("r6 Invocation d'élémentaire : titre + nom de créature déclinés sur l'élément de rang 4", () => {
    const r6 = featureById.get(R6)!;
    expect(r6.name).toBe("Invocation d'élémentaire %of%");
    expect(r6.elementFromChoice).toEqual({ choiceFeatureId: R4, choiceIndex: 0 });
    expect(declineForFeature(character, r6, r6.name)).toBe("Invocation d'élémentaire de feu");
    // richText = prose seule (durée [=INT] minutes), plus de tableau de stats verbatim dans le rendu —
    // mais le texte des 4 branches reste rappelé en note (demande propriétaire, même mécanisé ailleurs).
    expect(r6.richText).not.toContain('CRÉATURE NON VIVANTE');
    expect(r6.richText).toContain('[=INT]');
    expect(r6.richText).toContain('Note — texte des branches élémentaires');
    expect(r6.richText).toContain('Feu : +{1d4°} DM, immunisé au feu.');
    expect(r6.richText).toContain('Terre : +5 DEF, immunisé au froid.');
  });

  it("r6 : mini-fiche de base — DM en dice-parse, PLUS de tableau des 4 branches figé", () => {
    const r6 = featureById.get(R6)!;
    expect(r6.creatureProfile).toMatchObject({
      name: 'Élémentaire %of%',
      companionType: 'summon',
      size: 'grande',
      defense: '[19]',
      hitPoints: '[=niveau × 5]',
      initiative: '10',
      attack: { fromMaster: 'magicAttack', damage: '[2d4° + 6]' },
    });
    expect(r6.creatureProfile?.specialAbilities).toBeUndefined();
    expect(r6.effects).toEqual([
      {
        kind: 'conditional-stat-bonus',
        bonuses: [],
        activation: { kind: 'temporary', label: 'Élémentaire invoqué', activeByDefault: false },
      },
    ]);
  });

  it('r6 (feu, fixture) : profil affiché — immunité feu + +1d4° DM, nom décliné, PAS de dé bonus', () => {
    const r6 = featureById.get(R6)!;
    const profile = displayCreatureProfile(r6, character)!;
    expect(profile.name).toBe('Élémentaire de feu');
    expect(profile.attack?.damage).toBe('[2d4° + 6 + 1d4°]');
    expect(profile.attack?.bonusDie).toBeUndefined();
    expect(profile.damageReduction).toEqual([{ kind: 'immunity', scopes: ['fire'] }]);
  });

  it('r6 (acide) : dé bonus en attaque mécanisé + immunité acide, aucun bonus de DM', () => {
    const r6 = featureById.get(R6)!;
    const acide: Character = { ...character, featureChoices: { [R4]: ['acid'] } };
    const profile = displayCreatureProfile(r6, acide)!;
    expect(profile.attack?.bonusDie).toBe(true);
    expect(profile.attack?.damage).toBe('[2d4° + 6]');
    expect(profile.damageReduction).toEqual([{ kind: 'immunity', scopes: ['acid'] }]);
  });

  it('r6 (froid) : +5 DEF mécanisé + immunité froid', () => {
    const r6 = featureById.get(R6)!;
    const froid: Character = { ...character, featureChoices: { [R4]: ['cold'] } };
    const profile = displayCreatureProfile(r6, froid)!;
    expect(profile.defense).toBe('[19 + 5]');
    expect(profile.damageReduction).toEqual([{ kind: 'immunity', scopes: ['cold'] }]);
  });

  it('r6 (électricité) : immunité foudre + note de vol, aucun bonus chiffré', () => {
    const r6 = featureById.get(R6)!;
    const air: Character = { ...character, featureChoices: { [R4]: ['lightning'] } };
    const profile = displayCreatureProfile(r6, air)!;
    expect(profile.note).toBe('Peut voler à 30 m par round.');
    expect(profile.damageReduction).toEqual([{ kind: 'immunity', scopes: ['lightning'] }]);
  });

  it('r7 Élément puissant : dé parsé + élément de rang 4 rappelé, bonus toujours verbatim', () => {
    const r7 = featureById.get(R7)!;
    expect(r7.elementFromChoice).toEqual({ choiceFeatureId: R4, choiceIndex: 0 });
    expect(r7.richText).toContain('+{1d4°}');
    expect(r7.richText).toContain('(%noun%)');
    expect(declineForFeature(character, r7, r7.richText!)).toContain('élément de prédilection (feu)');
    expect(r7.effects).toBeUndefined();
  });

  it('r8 Métamorphose élémentaire : durée parsée + immunité à l’élément de rang 4 mécanisée', () => {
    const r8 = featureById.get(R8)!;
    expect(r8.elementFromChoice).toEqual({ choiceFeatureId: R4, choiceIndex: 0 });
    expect(r8.richText).toContain('[=5 + INT]');
    expect(r8.damageReduction).toEqual([
      { kind: 'flat', value: 5 },
      { kind: 'immunity', scopeFromElement: true },
    ]);

    // La RD (les deux entrées) suit le MÊME interrupteur que « Forme élémentaire active ».
    const inactive = damageReductionSources(character).filter((d) => d.featureId === R8);
    expect(inactive).toHaveLength(0);
    const active: Character = { ...character, effectToggles: { [R8]: [true] } };
    const drs = damageReductionSources(active).filter((d) => d.featureId === R8);
    expect(drs).toHaveLength(2);
    expect(drs[1].reduction).toMatchObject({ kind: 'immunity', scopes: ['fire'] });
  });
});
