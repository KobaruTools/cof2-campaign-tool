/**
 * PER-74 — voie du chaos (p. 155-156, catégorie MAGE), recette end-to-end.
 *
 * Voie 100% verbatim, aucune logique dédiée (contrairement à `archmagePath.ts`) : pas de choix, pas
 * d'interrupteur, aucun effet chiffré. R4 Arc-en-ciel et R7 Explosion multicolore (même effet, en
 * zone) infligent l'un des trois états selon le NC/niveau de la cible — aveuglé et affaibli sont des
 * états de BASE déjà auto-glosés dans le verbatim (PER-208) et le sort est RÉPÉTABLE (pas de cap
 * « 1×/combat par état » → aucun `inflictableStates`, patron spadassin-r5, PER-290) ; le palier
 * « inconscient » (NC≤1) n'a en revanche AUCUN équivalent dans les 10 états du glossaire (distinct
 * d'« assommé », déduit des PV via `hpHealthState`) → nouveau tag data-only `situationalEffectIds:
 * ['unconscious']` pour le futur Combat Tracker, sans effet actif aujourd'hui (patron `polymorphed`,
 * archimage r8). R5 Mur arc-en-ciel, R6 Pont arc-en-ciel et R8 Sphère multicolore restent verbatim
 * pour les EFFETS (ce sont des effets de terrain/instantanés — mur, téléportation —, pas un état qui
 * se SUIT sur un combattant dans la durée, hors périmètre des trois catalogues d'état PER-288), mais
 * portent chacun un `richText` : dés balisés (`{2d4°}`, `{3d4°}`, `{1d4°}`), difficultés `[10 + INT]`
 * (suffixe « du personnage »/« du mage » implicite, retiré) et durées en terme nommé `[#INT]` (le
 * déterminant « d' » réclame le mot, cf. rich-text-format.md § d) — corrigé après un premier passage
 * 100% verbatim resté trop littéral (retour proprio).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { featureById, pathById } from '@/data';
import { migrateCharacter } from '@/lib/engine/migrations';
import { checkCompliance } from '@/lib/engine/legality';
import { rulesContext } from '@/lib/character/rulesContext';
import { parseRichText } from '@/lib/ui/featureRichText';
import type { Character } from '@/lib/character/types';

function assertNoLeakedTokens(richText: string) {
  const leaked = parseRichText(richText)
    .filter((s): s is { kind: 'text'; value: string } => s.kind === 'text')
    .some((s) => /[{[]/.test(s.value));
  expect(leaked).toBe(false);
}

const PATH_ID = 'prestige-chaos';
const R4 = `${PATH_ID}-r4`;
const R5 = `${PATH_ID}-r5`;
const R6 = `${PATH_ID}-r6`;
const R7 = `${PATH_ID}-r7`;
const R8 = `${PATH_ID}-r8`;

function loadFixture(name: string): Character {
  const raw = JSON.parse(readFileSync(join(process.cwd(), 'examples/characters', `${name}.json`), 'utf8'));
  return migrateCharacter(raw);
}

describe('PER-74 — voie du chaos (p. 155-156, recette end-to-end)', () => {
  const character = loadFixture('recette-per74-chaos');

  it('voie de prestige de la famille des mages, sans prérequis', () => {
    const path = pathById.get(PATH_ID)!;
    expect(path.type).toBe('prestige');
    expect('category' in path && path.category).toBe('mage');
    expect(path.sourcePage).toBe(155);
    expect('prerequisites' in path && path.prerequisites).toBe('');
  });

  it('aucune anomalie de conformité sur le fixture (compliance propre)', () => {
    expect(checkCompliance(character, rulesContext)).toEqual([]);
  });

  it("r4 Arc-en-ciel : verbatim + tag data-only (inconscient), aucun effet actif", () => {
    const f = featureById.get(R4)!;
    expect(f.effects).toBeUndefined();
    expect(f.situationalEffectIds).toEqual(['unconscious']);
    expect(f.text).toContain('NC 1 ou moins : inconscient 1d6 rounds');
    expect(f.text).toContain('NC 2 ou 3 : aveuglé 1d6 rounds');
    expect(f.text).toContain('NC 4 et plus : affaibli 1d6 rounds');
  });

  it("r5 Mur arc-en-ciel : aucun effet chiffré (mur de terrain), richText balisé (durée/dé/difficulté)", () => {
    const f = featureById.get(R5)!;
    expect(f.effects).toBeUndefined();
    expect(f.situationalEffectIds).toBeUndefined();
    expect(f.text).toContain('mur opaque de couleurs chatoyantes');
    const richText = f.richText!;
    expect(richText).toContain("d'[#INT] minutes");
    expect(richText).toContain('{2d4°}');
    expect(richText).toContain('[10 + INT]');
    expect(richText).not.toContain('du personnage]');
    assertNoLeakedTokens(richText);
  });

  it("r6 Pont arc-en-ciel : aucun effet chiffré (téléportation instantanée), richText balisé (durée/difficulté/3 dés)", () => {
    const f = featureById.get(R6)!;
    expect(f.effects).toBeUndefined();
    expect(f.situationalEffectIds).toBeUndefined();
    expect(f.text).toContain('pont arc-en-ciel');
    const richText = f.richText!;
    expect(richText).toContain('pendant [#INT] heures');
    expect(richText).toContain('[10 + INT]');
    expect(richText).not.toContain('du mage]');
    expect(richText).toContain('{3d4°}');
    // Les DEUX 1d4° des sous-effets « temps » et « espace » sont balisés ; le 1d6 de sélection de
    // la table (discriminant 1-2/3-4/5-6) reste littéral, pas un dé de DM/durée.
    expect((richText.match(/\{1d4°\}/g) ?? []).length).toBe(2);
    expect(richText).toContain('en lançant 1d6');
    assertNoLeakedTokens(richText);
  });

  it("r7 Explosion multicolore : mêmes effets que r4, même tag data-only (inconscient)", () => {
    const f = featureById.get(R7)!;
    expect(f.effects).toBeUndefined();
    expect(f.situationalEffectIds).toEqual(['unconscious']);
    expect(f.text).toContain("mêmes effets que l'arc-en-ciel");
  });

  it("r8 Sphère multicolore : aucun effet chiffré (téléportation instantanée, zone), richText balisé (durée/2 dés/difficulté)", () => {
    const f = featureById.get(R8)!;
    expect(f.effects).toBeUndefined();
    expect(f.situationalEffectIds).toBeUndefined();
    expect(f.text).toContain('sphère immobile de lumières chatoyantes');
    const richText = f.richText!;
    expect(richText).toContain("d'[#INT] heures");
    expect(richText).toContain('[10 + INT]');
    expect(richText).not.toContain('du personnage]');
    // Les DEUX 2d4° (distance ×100 km, puis distance km) sont balisés ; le « × 100 km »/« km » qui
    // suit reste littéral (un dé ne se multiplie pas dans une formule).
    expect((richText.match(/\{2d4°\}/g) ?? []).length).toBe(2);
    assertNoLeakedTokens(richText);
  });
});
