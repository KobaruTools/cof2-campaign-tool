/**
 * PER-116 — AFFICHAGE DU COMBAT À DEUX ARMES sur la carte « Attaque au contact » (p. 215).
 *
 * Le moteur signalait déjà le dé malus (`twoWeaponCombatStatus`) mais la fiche n'en montrait rien
 * sur la carte d'attaque, et la MAIN SECONDAIRE n'avait aucune ligne touche | DM. Ces tests
 * couvrent les trois champs que `buildCharacterDerivedView` expose désormais pour la seconde
 * ligne : `offHandMeleeWeaponDamage`, `offHandCriticalRanges`, `offHandTouchDelta`, plus le drapeau
 * `twoWeaponPenaltyDie`.
 *
 * `buildCharacterDerivedView` est un module PUR (testable en environnement node) — c'est la porte
 * d'entrée documentée pour tester ce que la fiche affiche.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { migrateCharacter } from '@/lib/engine/migrations';
import { buildCharacterDerivedView } from '@/components/sheet/characterDerivedView';
import { twoWeaponCombatStatus } from './twoWeaponCombat';
import type { Character, EquipmentLine } from './types';

/** Base : le danseur de guerre de recette (épée longue en main principale, dague en secondaire). */
const base = (): Character =>
  migrateCharacter(
    JSON.parse(
      readFileSync(join(process.cwd(), 'examples', 'characters', 'recette-per74-danseur-de-guerre.json'), 'utf-8'),
    ),
  ) as Character;

/** La base, avec exactement l'équipement porté fourni (rien d'autre en main). */
const holding = (...equipment: EquipmentLine[]): Character => ({ ...base(), equipment });

const MAIN = (itemId: string, grip: 'oneHand' | 'twoHands' = 'oneHand'): EquipmentLine => ({
  itemId,
  quantity: 1,
  worn: { slot: 'mainHand', grip },
});
const OFF = (itemId: string): EquipmentLine => ({ itemId, quantity: 1, worn: { slot: 'offHand' } });

describe('PER-116 — une seule arme en main : affichage inchangé', () => {
  it('aucune seconde ligne, aucun dé malus, aucun écart de touche', () => {
    const view = buildCharacterDerivedView(holding(MAIN('epee-longue')));
    expect(view.meleeWeaponDamage?.name).toBe('Épée longue');
    expect(view.offHandMeleeWeaponDamage).toBeNull();
    expect(view.offHandCriticalRanges).toEqual([]);
    expect(view.offHandTouchDelta).toBe(0);
    expect(view.twoWeaponPenaltyDie).toBe(false);
  });

  it('une arme tenue à DEUX mains occupe les deux mains : pas de seconde ligne', () => {
    const view = buildCharacterDerivedView(holding(MAIN('vivelame', 'twoHands')));
    expect(view.offHandMeleeWeaponDamage).toBeNull();
    expect(view.twoWeaponPenaltyDie).toBe(false);
  });
});

describe('PER-116 — deux armes en main : une ligne par main', () => {
  it('chaque main porte les DM de SON arme', () => {
    const view = buildCharacterDerivedView(holding(MAIN('epee-longue'), OFF('dague')));
    expect(twoWeaponCombatStatus(holding(MAIN('epee-longue'), OFF('dague'))).dualWielding).toBe(true);
    expect(view.meleeWeaponDamage?.name).toBe('Épée longue');
    expect(view.meleeWeaponDamage?.dice).toBe('1d8');
    expect(view.offHandMeleeWeaponDamage?.name).toBe('Dague');
    expect(view.offHandMeleeWeaponDamage?.dice).toBe('1d4');
  });

  it('le dé malus du combat à deux armes est signalé (p. 215)', () => {
    expect(buildCharacterDerivedView(holding(MAIN('epee-longue'), OFF('dague'))).twoWeaponPenaltyDie).toBe(true);
  });

  it('« Combattant héroïque » (option FOR, même arme des deux mains) exempte du dé malus (p. 73)', () => {
    const heroic: Character = {
      ...base(),
      featureIds: [...base().featureIds, 'combat-a-deux-armes-r4'],
      featureChoices: { ...base().featureChoices, 'combat-a-deux-armes-r4': ['FOR'] },
      equipment: [MAIN('epee-longue'), OFF('epee-longue')],
    };
    const view = buildCharacterDerivedView(heroic);
    // Les DEUX lignes restent affichées (le personnage attaque bien des deux mains)…
    expect(view.offHandMeleeWeaponDamage?.name).toBe('Épée longue');
    // …mais aucune n'est pénalisée.
    expect(view.twoWeaponPenaltyDie).toBe(false);
  });
});

describe('PER-116 — l’attaque en finesse est réservée à la main principale (p. 140/150)', () => {
  it('mode « DM » : la ligne principale passe en AGI, la secondaire garde sa FOR', () => {
    const view = buildCharacterDerivedView(holding(MAIN('epee-longue'), OFF('dague')));
    expect(view.meleeWeaponDamage?.abilities).toContain('AGI');
    expect(view.meleeWeaponDamage?.abilities).not.toContain('FOR');
    expect(view.offHandMeleeWeaponDamage?.abilities).toContain('FOR');
    expect(view.offHandMeleeWeaponDamage?.abilities).not.toContain('AGI');
    // La touche n'est pas concernée par le mode « DM » → même valeur sur les deux lignes.
    expect(view.offHandTouchDelta).toBe(0);
  });

  it('mode « attaque » : la touche de la main secondaire perd la substitution', () => {
    const attack: Character = {
      ...holding(MAIN('epee-longue'), OFF('dague')),
      effectInputs: { 'prestige-danseur-de-guerre-r4': 'attack' },
    };
    const view = buildCharacterDerivedView(attack);
    // AGI 4, FOR 1 → la main secondaire est 3 points sous la touche affichée (FOR − AGI).
    expect(view.offHandTouchDelta).toBe(-3);
    // Les DM des deux lignes restent en FOR (la substitution porte sur la touche).
    expect(view.meleeWeaponDamage?.abilities).toContain('FOR');
    expect(view.offHandMeleeWeaponDamage?.abilities).toContain('FOR');
  });

  it('sans finesse retenue, aucun écart de touche', () => {
    const none: Character = { ...holding(MAIN('epee-longue'), OFF('dague')), effectInputs: {} };
    expect(buildCharacterDerivedView(none).offHandTouchDelta).toBe(0);
  });
});

describe('PER-116 — plage de critique de la main secondaire', () => {
  it('elle est calculée sur SON arme, pas sur celle de la main principale', () => {
    // Dague (aucun critique élargi) en main principale, RAPIÈRE (19-20 intrinsèque, p. 183) en
    // secondaire : un badge unique issu de la main principale mentirait sur la seconde main.
    const view = buildCharacterDerivedView(holding(MAIN('dague'), OFF('rapiere')));
    expect(view.meleeCriticalRanges).toEqual([]);
    expect(view.offHandCriticalRanges).toHaveLength(1);
    expect(view.offHandCriticalRanges[0].key).toBe('crit-melee-offhand');
    expect(view.offHandCriticalRanges[0].text).toContain('19');
    expect(view.offHandCriticalRanges[0].title).toContain('main secondaire');
  });

  it('hors combat à deux armes, elle est vide', () => {
    expect(buildCharacterDerivedView(holding(MAIN('rapiere'))).offHandCriticalRanges).toEqual([]);
  });
});
