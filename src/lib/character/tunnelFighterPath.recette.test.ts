import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { featureById, pathById } from '@/data';
import { testDomainById } from '@/data/test-domains';
import { migrateCharacter } from '@/lib/engine/migrations';
import {
  capacityResourceGauges,
  effectContext,
  featureModSources,
  isEffectActive,
  testBonusSources,
} from '@/lib/character/effects';
import { parseRichText } from '@/lib/ui/featureRichText';
import type { Character } from '@/lib/character/types';

const PATH_ID = 'prestige-combattant-des-tunnels';
const R4 = `${PATH_ID}-r4`;
const R5 = `${PATH_ID}-r5`;

function loadFixture(name: string): Character {
  const raw = JSON.parse(readFileSync(join(process.cwd(), 'examples/characters', `${name}.json`), 'utf8'));
  return migrateCharacter(raw);
}

/** Total du bonus au domaine demandé, tel que « Compétences & tests » l'afficherait. */
function bonusOn(c: Character, domain: string): number | undefined {
  return testBonusSources(c.featureIds, effectContext(c)).find((b) => b.domain === domain)?.total;
}

/** Bonus de DEF ventilé pour la capacité `featureId`, ou `undefined` s'il n'y en a aucun. */
function defBonus(c: Character, featureId: string): number | undefined {
  return (featureModSources(c.featureIds, effectContext(c)).def ?? []).find((s) => s.featureId === featureId)?.value;
}

describe('PER-74 — voie du combattant des tunnels (p. 148, recette end-to-end)', () => {
  const character = loadFixture('recette-per74-combattant-des-tunnels');

  it("la voie est une voie de prestige de la famille des combattants, sans prérequis, avec sa présentation", () => {
    const path = pathById.get(PATH_ID)!;
    expect(path.type).toBe('prestige');
    // `category: 'fighter'` → habillage prestige ROUGE.
    expect('category' in path && path.category).toBe('fighter');
    expect(path.sourcePage).toBe(148);
    // Le livre ne donne AUCUN prérequis à cette voie (contraste avec le chevalier dragon).
    expect('prerequisites' in path && path.prerequisites).toBe('');
    expect('note' in path && path.note).toMatch(/spécialiste de la survie dans l'outre-monde/);
  });

  it("r4 Infravision : hors souterrain, aucun bonus de compétence", () => {
    expect(isEffectActive(character, R4, 0)).toBe(false);
    expect(bonusOn(character, 'survival')).toBeUndefined();
    expect(bonusOn(character, 'orientation')).toBeUndefined();
  });

  it("r4 Infravision : interrupteur « en milieu souterrain » allumé → +5 en survie ET en orientation", () => {
    // Les deux domaines du livre existent au catalogue et sont des tests de PER.
    expect(testDomainById.get('survival')?.abilities).toEqual(['PER']);
    expect(testDomainById.get('orientation')?.abilities).toEqual(['PER']);
    const underground: Character = { ...character, effectToggles: { [R4]: [true] } };
    expect(isEffectActive(underground, R4, 0)).toBe(true);
    expect(bonusOn(underground, 'survival')).toBe(5);
    expect(bonusOn(underground, 'orientation')).toBe(5);
    // Le +5 est explicite : le fallback de catégorie prestige donnerait 6.
    const domains = testBonusSources(underground.featureIds, effectContext(underground))
      .filter((b) => b.sources.some((s) => s.featureId === R4))
      .map((b) => b.domain)
      .sort();
    expect(domains).toEqual(['orientation', 'survival']);
    // Le bonus de la voie de peuple du nain reste intact et séparé.
    expect(bonusOn(underground, 'masonry')).toBe(3);
  });

  it("r5 Combat confiné : bonus de DEF PERMANENT, +1 puis +2 une fois le rang 7 atteint", () => {
    expect(defBonus(character, R5)).toBe(2);
    const upToRank6: Character = {
      ...character,
      featureIds: character.featureIds.filter((id) => !id.startsWith(PATH_ID) || Number(id.slice(-1)) <= 6),
    };
    expect(defBonus(upToRank6, R5)).toBe(1);
    const withoutR5: Character = { ...character, featureIds: character.featureIds.filter((id) => id !== R5) };
    expect(defBonus(withoutR5, R5)).toBeUndefined();
  });

  it("r5 Combat confiné : écart RAW assumé — lâcher son arme ne retire pas le bonus", () => {
    // « tant qu'il tient une arme en main » n'est pas mécanisé (arbitrage propriétaire : bonus
    // permanent ; aucun gate « une arme quelconque en main » n'existe dans le moteur).
    const disarmed: Character = { ...character, equipment: [] };
    expect(defBonus(disarmed, R5)).toBe(2);
  });

  it.each([
    [`${PATH_ID}-r6`, '{1d4°}'],
    [`${PATH_ID}-r7`, '+{1d4°}'],
    [`${PATH_ID}-r8`, '{4d4°}'],
  ])('%s : dé évolutif balisé, verbatim imprimé conservé en source', (id, token) => {
    const feature = featureById.get(id)!;
    expect(feature.richText).toContain(token);
    const segments = parseRichText(feature.richText!);
    expect(segments.filter((s) => s.kind === 'die')).toHaveLength(1);
    // Aucune balise ne doit retomber en littéral dans le texte rendu.
    const leaked = segments.some((s) => s.kind === 'text' && /[{[]/.test(s.value));
    expect(leaked).toBe(false);
    expect(feature.text).not.toContain('{');
  });

  it("r6 Briseur de hordes : aucun compteur (« une fois par round » est une cadence de tour)", () => {
    expect(featureById.get(`${PATH_ID}-r6`)?.usageCounter).toBeUndefined();
    expect(featureById.get(`${PATH_ID}-r7`)?.usageCounter).toBeUndefined();
  });

  it("r8 Briseur de voûte : un usage rechargé à la récupération rapide, suivi sur la carte", () => {
    expect(featureById.get(`${PATH_ID}-r8`)?.usageCounter).toEqual({
      max: 1,
      resetOn: 'short-rest',
      hideFromStatusPanel: true,
    });
    // Règle d'office des voies de prestige : aucune barre dans « État du personnage ».
    expect(capacityResourceGauges(character)).toEqual([]);
  });
});
