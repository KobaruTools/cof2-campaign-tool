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
 * mini-fiche structurée, titre + nom de créature DÉCLINÉS sur la nature PRIMORDIALE de l'élément de
 * rang 4 (`%primordialOf%`, DISTINCTE du vocabulaire énergie de `%of%` — froid→terre, électricité→
 * air, acide→eau, feu→feu), DM en dice-parse (`[2d4° + 6]`), immunité + bonus de branche portés par
 * l'option de rang 4 — plus de tableau verbatim dans le rendu (richText prose seule), le texte des
 * 4 branches reste rappelé en note (`creatureProfile.verbatimSource`, encadré dédié). R7 : dé parsé
 * (`+{1d4°}`) + élément rappelé
 * (`%noun%`), toujours verbatim pour le bonus lui-même. R8 (3e passe, 2026-08-09) : durée parsée
 * (`[=5 + INT]`) ; RD/immunité MÉCANISÉES PAR BRANCHE (`DamageReduction.requiresElement`, NOUVEAU —
 * RD 5 pour Feu/Eau/Terre, RD 10 pour Air) ; Feu = +2d4° DM au contact mécanisé (`weapon-damage-bonus
 * requiresElement`, badge situationnel) + riposte au contact mécanisée en badge Défense
 * (`elementalistPath.ts`) ; Terre = +3 FOR mécanisé EN CARAC (`active-form-ability-bonus
 * requiresElement`, NOUVEAU) + +3 DEF mécanisé en statistique dérivée (`StatBonus.requiresElement`,
 * NOUVEAU) ; Air = DM ÷2 rappelé en badge sur les cartes d'attaque contact/distance. RESTENT verbatim
 * (arbitrage propriétaire explicite) : Eau (soins/déformation) et le VOL de la forme Air. La
 * réduction de l'AFFICHAGE aux seules capacités de la branche retenue reste EN ATTENTE (signalé).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { equipmentById, featureById, pathById } from '@/data';
import { migrateCharacter } from '@/lib/engine/migrations';
import {
  conditionalEffectBonuses,
  damageReductionSources,
  effectContext,
  effectiveAbilities,
  modsFromFeatures,
} from '@/lib/character/effects';
import { weaponDamageBonuses } from '@/lib/character/weaponDamageBonus';
import { displayCreatureProfile } from '@/lib/character/companions';
import { declineForFeature } from '@/lib/character/dragonElement';
import {
  elementalistFireRetaliationBadge,
  elementalistMeleeAttackNotes,
  elementalistRangedAttackNotes,
} from '@/lib/character/elementalistPath';
import { checkCompliance } from '@/lib/engine/legality';
import { rulesContext } from '@/lib/character/rulesContext';
import type { Character } from '@/lib/character/types';
import type { Weapon } from '@/data/schema';

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
      specialAbilities: [{ name: 'Vol', text: 'Vol de 30 m.' }],
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

  it("r6 Invocation d'élémentaire : titre + nom de créature déclinés sur la nature PRIMORDIALE de l'élément de rang 4", () => {
    const r6 = featureById.get(R6)!;
    expect(r6.name).toBe("Invocation d'élémentaire %primordialOf%");
    expect(r6.elementFromChoice).toEqual({ choiceFeatureId: R4, choiceIndex: 0 });
    // feu (fixture) → primordial « feu » lui-même ; froid → « terre » (PAS « froid »).
    expect(declineForFeature(character, r6, r6.name)).toBe("Invocation d'élémentaire de feu");
    const froid: Character = { ...character, featureChoices: { [R4]: ['cold'] } };
    expect(declineForFeature(froid, r6, r6.name)).toBe("Invocation d'élémentaire de terre");
    const air: Character = { ...character, featureChoices: { [R4]: ['lightning'] } };
    expect(declineForFeature(air, r6, r6.name)).toBe("Invocation d'élémentaire d'air");
    const eau: Character = { ...character, featureChoices: { [R4]: ['acid'] } };
    expect(declineForFeature(eau, r6, r6.name)).toBe("Invocation d'élémentaire d'eau");
    // richText = prose seule (durée [=INT] minutes), plus de tableau de stats verbatim dans le rendu.
    expect(r6.richText).not.toContain('CRÉATURE NON VIVANTE');
    expect(r6.richText).toContain('[=INT]');
  });

  it("r6 : mini-fiche de base — DM en dice-parse, PLUS de tableau des 4 branches figé, texte des branches en note (verbatimSource)", () => {
    const r6 = featureById.get(R6)!;
    expect(r6.creatureProfile).toMatchObject({
      name: 'Élémentaire %primordialOf%',
      companionType: 'summon',
      size: 'grande',
      defense: '[19]',
      hitPoints: '[=niveau × 5]',
      initiative: '10',
      attack: { fromMaster: 'magicAttack', damage: '[2d4° + 6]' },
    });
    expect(r6.creatureProfile?.specialAbilities).toBeUndefined();
    // Le texte des 4 branches reste visible en NOTE (encadré `verbatimSource`, demande propriétaire),
    // même si une seule s'applique et que les bonus sont déjà mécanisés via l'option du rang 4.
    expect(r6.creatureProfile?.verbatimSource?.sourcePage).toBe(157);
    const branchesText = r6.creatureProfile!.verbatimSource!.text;
    expect(branchesText.split('\n')).toHaveLength(4);
    expect(branchesText).toContain('• Feu : +1d4° DM, immunisé au feu.');
    expect(branchesText).toContain("• Eau : dé bonus en attaque, immunisé à l'acide.");
    expect(branchesText).toContain('• Air : vol 30 m, immunisé à la foudre.');
    expect(branchesText).toContain('• Terre : +5 DEF, immunisé au froid.');
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

  it('r6 (électricité) : immunité foudre + capacité spéciale « Vol », aucun bonus chiffré', () => {
    const r6 = featureById.get(R6)!;
    const air: Character = { ...character, featureChoices: { [R4]: ['lightning'] } };
    const profile = displayCreatureProfile(r6, air)!;
    expect(profile.specialAbilities).toEqual([{ name: 'Vol', text: 'Vol de 30 m.' }]);
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

  it('r8 Métamorphose élémentaire : durée parsée, RD par branche (5 sauf Air = 10)', () => {
    const r8 = featureById.get(R8)!;
    expect(r8.elementFromChoice).toEqual({ choiceFeatureId: R4, choiceIndex: 0 });
    expect(r8.richText).toContain('[=5 + INT]');
    expect(r8.damageReduction).toEqual([
      { kind: 'immunity', scopeFromElement: true },
      { kind: 'flat', value: 5, requiresElement: 'fire' },
      { kind: 'flat', value: 5, requiresElement: 'acid' },
      { kind: 'flat', value: 5, requiresElement: 'cold' },
      { kind: 'flat', value: 10, requiresElement: 'lightning' },
    ]);

    // Toute la RD (les 5 entrées) suit le MÊME interrupteur que « Forme élémentaire active ».
    expect(damageReductionSources(character).filter((d) => d.featureId === R8)).toHaveLength(0);

    // Fixture = feu : immunité feu + RD 5 (pas la RD 10, réservée à Air).
    const feuActif: Character = { ...character, effectToggles: { [R8]: [true] } };
    const drsFeu = damageReductionSources(feuActif).filter((d) => d.featureId === R8);
    expect(drsFeu).toHaveLength(2);
    expect(drsFeu.map((d) => d.reduction)).toContainEqual(expect.objectContaining({ kind: 'immunity', scopes: ['fire'] }));
    expect(drsFeu.map((d) => d.reduction)).toContainEqual(expect.objectContaining({ kind: 'flat', value: 5 }));

    // Air (électricité) : immunité foudre + RD 10 (pas RD 5).
    const airActif: Character = {
      ...character,
      featureChoices: { [R4]: ['lightning'] },
      effectToggles: { [R8]: [true] },
    };
    const drsAir = damageReductionSources(airActif).filter((d) => d.featureId === R8);
    expect(drsAir).toHaveLength(2);
    expect(drsAir.map((d) => d.reduction)).toContainEqual(expect.objectContaining({ kind: 'immunity', scopes: ['lightning'] }));
    expect(drsAir.map((d) => d.reduction)).toContainEqual(expect.objectContaining({ kind: 'flat', value: 10 }));
  });

  it('r8 (Feu) : +2d4° DM de feu au contact mécanisé (badge situationnel), inactif hors forme/branche', () => {
    const epeeLongue = equipmentById.get('epee-longue') as Weapon;
    const feuActif: Character = { ...character, effectToggles: { [R8]: [true] } }; // fixture = feu
    const bonus = weaponDamageBonuses(feuActif, 'melee', epeeLongue).situational.find((b) => b.featureId === R8);
    // Dé évolutif (`°`) résolu à la face du NIVEAU du personnage (p. 43) — pas forcément 1d4 littéral.
    expect(bonus).toMatchObject({ dice: { count: 2, evolving: true } });

    // MAINS NUES (retour propriétaire 2026-08-09) : « toutes ses attaques au contact » vaut aussi
    // sans arme — sous la forme Feu, le personnage EST fait de feu (`condition.includesUnarmed`).
    expect(
      weaponDamageBonuses(feuActif, 'melee', null).situational.find((b) => b.featureId === R8),
    ).toMatchObject({ dice: { count: 2, evolving: true } });
    // Le bonus reste propre au CONTACT : rien à distance, arme ou pas.
    expect(weaponDamageBonuses(feuActif, 'ranged', null).situational.some((b) => b.featureId === R8)).toBe(
      false,
    );

    // Forme inactive (interrupteur éteint) : aucun bonus.
    expect(weaponDamageBonuses(character, 'melee', epeeLongue).situational.some((b) => b.featureId === R8)).toBe(
      false,
    );
    // Forme active mais MAUVAISE branche (froid → Terre, pas Feu) : aucun bonus.
    const froidActif: Character = { ...character, featureChoices: { [R4]: ['cold'] }, effectToggles: { [R8]: [true] } };
    expect(weaponDamageBonuses(froidActif, 'melee', epeeLongue).situational.some((b) => b.featureId === R8)).toBe(
      false,
    );
  });

  it('r8 (Feu) : riposte au contact mécanisée en badge Défense (elemental-retaliation)', () => {
    const feuActif: Character = { ...character, effectToggles: { [R8]: [true] } }; // fixture = feu
    expect(elementalistFireRetaliationBadge(feuActif)).toEqual({ die: '1d4°' });
    expect(elementalistFireRetaliationBadge(character)).toBeNull(); // forme inactive
    const froidActif: Character = { ...character, featureChoices: { [R4]: ['cold'] }, effectToggles: { [R8]: [true] } };
    expect(elementalistFireRetaliationBadge(froidActif)).toBeNull(); // mauvaise branche
  });

  it('r8 : le texte ne garde que la branche retenue, les trois autres passent en note', () => {
    const r8 = featureById.get(R8)!;
    // Fixture = feu : la branche Feu reste dans le corps du texte…
    const feu = declineForFeature(character, r8, r8.richText!);
    expect(feu).toContain('Feu : le personnage ajoute');
    expect(feu.indexOf('Feu : le personnage ajoute')).toBeLessThan(feu.indexOf('Note — autres formes'));
    // …les trois autres sont rejetées APRÈS la note, et aucun marqueur ne fuit à l'écran.
    for (const autre of ['Eau : le personnage guérit', 'Terre : le personnage obtient', 'Air : le personnage peut voler'])
      expect(feu.indexOf(autre)).toBeGreaterThan(feu.indexOf('Note — autres formes'));
    expect(feu).not.toContain('%branch:');

    // Élément non choisi : les quatre branches restent en place (texte du livre), pas de note.
    const sansChoix: Character = { ...character, featureChoices: {} };
    const brut = declineForFeature(sansChoix, r8, r8.richText!);
    expect(brut).not.toContain('Note — autres formes');
    expect(brut).not.toContain('%branch:');
    expect(brut).toContain('Air : le personnage peut voler');
  });

  it('r8 (Terre) : +3 FOR en carac (delta, se répercute automatiquement) + +3 DEF mécanisés', () => {
    const froidActif: Character = { ...character, featureChoices: { [R4]: ['cold'] }, effectToggles: { [R8]: [true] } };
    const froidInactif: Character = { ...character, featureChoices: { [R4]: ['cold'] } };
    expect(effectiveAbilities(froidActif).FOR - effectiveAbilities(froidInactif).FOR).toBe(3);
    expect(
      (modsFromFeatures(froidActif.featureIds, effectContext(froidActif)).def ?? 0) -
        (modsFromFeatures(froidInactif.featureIds, effectContext(froidInactif)).def ?? 0),
    ).toBe(3);

    // Forme active mais MAUVAISE branche (feu, fixture) : ni le +3 FOR, ni le +3 DEF.
    expect(effectiveAbilities({ ...character, effectToggles: { [R8]: [true] } }).FOR).toBe(
      effectiveAbilities(character).FOR,
    );
  });

  it("r8 : le libellé de l'interrupteur « Forme élémentaire active » ne montre +3 DEF QUE pour Terre", () => {
    // Bug relevé par le propriétaire : le panneau « Effets conditionnels » affichait « +3 DEF » même
    // pour la branche Feu de la fixture — `conditionalEffectBonuses` ne filtrait pas `requiresElement`
    // (contrairement à `effectContributions`, qui calcule déjà le bon total). Fixture = feu.
    expect(conditionalEffectBonuses(character, R8, 0)).toEqual([]);
    const froid: Character = { ...character, featureChoices: { [R4]: ['cold'] } };
    expect(conditionalEffectBonuses(froid, R8, 0)).toEqual([{ stat: 'def', value: 3 }]);
  });

  it('r8 (Air) : DM ÷2 rappelé en badge sur les cartes Attaque contact ET distance, ailleurs aucune note', () => {
    const airActif: Character = {
      ...character,
      featureChoices: { [R4]: ['lightning'] },
      effectToggles: { [R8]: [true] },
    };
    expect(elementalistMeleeAttackNotes(airActif)).toEqual([expect.objectContaining({ featureId: R8, color: 'warning' })]);
    expect(elementalistRangedAttackNotes(airActif)).toEqual([expect.objectContaining({ featureId: R8, color: 'warning' })]);

    // Fixture (feu, forme active) : aucune note DM ÷2 — réservée à Air.
    const feuActif: Character = { ...character, effectToggles: { [R8]: [true] } };
    expect(elementalistMeleeAttackNotes(feuActif)).toEqual([]);
    expect(elementalistRangedAttackNotes(feuActif)).toEqual([]);
  });
});
