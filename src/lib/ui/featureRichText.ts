/**
 * Couche de PRÉSENTATION parsable des capacités (PER-64) : transforme le texte
 * balisé `Feature.richText` en segments rendables (texte, dé, formule). Pur, sans
 * React, pour être testable isolément. Le rendu visuel vit dans
 * `src/components/sheet/FeatureRichText.tsx`.
 *
 * Mini-langage (format « balisé », cf. doc de `Feature.richText`) :
 * - `{1d4°}`, `{d6}`, `{2d6}` : un dé (accolades). `°` = dé évolutif (p. 43).
 * - `[FOR + 1]`, `[CHA]`, `[1d4° + CHA]` : une formule (crochets) — suite de
 *   termes (caractéristique / dé / nombre) séparés par `+` ou `-`.
 * - `@FOR`, `@AGI`, … : une simple RÉFÉRENCE à une caractéristique (sigle `@`),
 *   mise en avant visuellement sans calcul de valeur (ex. « une @FOR égale
 *   au [CHA] »). Pour les sept codes `AGI/CON/FOR/PER/CHA/INT/VOL` uniquement.
 * - tout le reste : texte littéral.
 *
 * Robustesse : un `{…}` ou `[…]` dont le contenu n'est pas entièrement
 * reconnaissable est rendu tel quel (délimiteurs compris) comme texte littéral,
 * pour ne jamais casser l'affichage d'un balisage approximatif.
 */
import { scalingDie } from '@/lib/engine';
import { ABILITY_IDS, type AbilityId, type Die, type ProgressionRules } from '@/data/schema';
import type { Abilities } from '@/lib/engine';
import { ABILITY_NAMES } from './ability';

/** Un dé tokenisé : nombre, faces, et marqueur évolutif. */
export interface DieToken {
  /** Nombre de dés (1 si non précisé dans la notation). */
  count: number;
  /**
   * Faces du dé telles qu'écrites (souvent `d4` pour un dé évolutif). La valeur
   * concrète au niveau courant est calculée à part (`scalingDie`) — voir
   * `resolveExpr` et le rendu.
   */
  die: Die;
  /** Dé évolutif (« d4° », p. 43) : grandit avec le niveau. */
  evolving: boolean;
}

/** Un terme d'une formule, avec son signe (`+`/`-`). */
export type ExprTerm =
  | { kind: 'ability'; sign: 1 | -1; ability: AbilityId }
  | { kind: 'die'; sign: 1 | -1; token: DieToken }
  | { kind: 'number'; sign: 1 | -1; value: number };

/** Un fragment de `richText` prêt à rendre. */
export type RichTextSegment =
  | { kind: 'text'; value: string }
  | { kind: 'die'; token: DieToken }
  | { kind: 'expr'; terms: ExprTerm[]; raw: string }
  | { kind: 'abilityRef'; ability: AbilityId };

const DIE_RE = /^(\d*)d(4|6|8|10|12|20)(°?)$/;
/**
 * Capture un `{…}` (dé), un `[…]` (formule) ou un `@CODE` (référence de
 * caractéristique) ; le reste est du texte.
 */
const TOKEN_RE = new RegExp(`\\{([^}]*)\\}|\\[([^\\]]*)\\]|@(${ABILITY_IDS.join('|')})\\b`, 'g');
/** Un terme de formule : signe optionnel puis corps sans espace ni signe. */
const TERM_RE = /([+-]?)\s*([^+\-\s]+)/g;

/** Parse une notation de dé (ex. `1d4°`, `d6`, `2d6`). `null` si invalide. */
function parseDie(raw: string): DieToken | null {
  const m = DIE_RE.exec(raw.trim());
  if (!m) return null;
  return {
    count: m[1] ? Number(m[1]) : 1,
    die: `d${m[2]}` as Die,
    evolving: m[3] === '°',
  };
}

/** Parse le contenu d'une formule en termes. `null` si un terme est inconnu. */
function parseExpr(raw: string): ExprTerm[] | null {
  const terms: ExprTerm[] = [];
  let consumed = 0;
  TERM_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = TERM_RE.exec(raw)) !== null) {
    // On ne compte que le signe et le corps (pas les espaces internes), pour
    // vérifier ensuite que toute la formule a bien été reconnue.
    consumed += m[1].length + m[2].length;
    const sign: 1 | -1 = m[1] === '-' ? -1 : 1;
    const body = m[2];
    const die = parseDie(body);
    if (die) {
      terms.push({ kind: 'die', sign, token: die });
    } else if ((ABILITY_IDS as readonly string[]).includes(body)) {
      terms.push({ kind: 'ability', sign, ability: body as AbilityId });
    } else if (/^\d+$/.test(body)) {
      terms.push({ kind: 'number', sign, value: Number(body) });
    } else {
      return null; // terme non reconnu → formule rejetée (rendue en littéral)
    }
  }
  // Tout le contenu (hors espaces) doit avoir été consommé, sinon rejet.
  if (terms.length === 0 || consumed !== raw.replace(/\s/g, '').length) return null;
  return terms;
}

/**
 * Découpe `richText` en segments. Les `{…}`/`[…]` non reconnus retombent en
 * texte littéral (délimiteurs inclus).
 */
export function parseRichText(richText: string): RichTextSegment[] {
  const segments: RichTextSegment[] = [];
  let lastIndex = 0;
  TOKEN_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  const pushText = (value: string) => {
    if (!value) return;
    const last = segments[segments.length - 1];
    if (last?.kind === 'text') last.value += value;
    else segments.push({ kind: 'text', value });
  };
  while ((m = TOKEN_RE.exec(richText)) !== null) {
    pushText(richText.slice(lastIndex, m.index));
    lastIndex = TOKEN_RE.lastIndex;
    if (m[1] !== undefined) {
      const die = parseDie(m[1]);
      if (die) segments.push({ kind: 'die', token: die });
      else pushText(m[0]); // accolades non reconnues → littéral
    } else if (m[2] !== undefined) {
      const terms = parseExpr(m[2]);
      if (terms) segments.push({ kind: 'expr', terms, raw: m[0] });
      else pushText(m[0]); // crochets non reconnus → littéral
    } else {
      segments.push({ kind: 'abilityRef', ability: m[3] as AbilityId });
    }
  }
  pushText(richText.slice(lastIndex));
  return segments;
}

/** Un terme de formule résolu pour l'affichage. */
export interface ResolvedPart {
  /** Nature du terme (pour le rendu : caractéristique, nombre ou dé). */
  kind: ExprTerm['kind'];
  sign: 1 | -1;
  /** Libellé complet du terme (ex. « Charisme (CHA) », « Bonus ») — info-bulle. */
  label: string;
  /**
   * Symbole court tel qu'écrit dans la formule (ex. « CHA », « 1 », « d4° ») :
   * affiché dans l'encadré pour que la formule reste lisible (« CHA (+5) »).
   */
  symbol: string;
  /** Valeur numérique du terme ; `null` pour un dé. */
  value: number | null;
  /** Présent si le terme est un dé, avec sa valeur concrète au niveau courant. */
  die?: { count: number; displayDie: Die; evolving: boolean };
}

/** Résultat de l'évaluation d'une formule contre un personnage donné. */
export interface ResolvedExpr {
  /** La formule contient au moins un dé → non déterministe (pas de total). */
  hasDie: boolean;
  /** La formule contient au moins une caractéristique (→ on en montre le code). */
  hasAbility: boolean;
  /** Total numérique si déterministe (`hasDie === false`), sinon `null`. */
  total: number | null;
  /** Détail des termes (pour l'encadré ou le rendu inline). */
  parts: ResolvedPart[];
}

/**
 * Évalue une formule contre les caractéristiques et le niveau du personnage.
 * Sans dé : on calcule le total (affiché en encadré avec son détail). Avec dé :
 * on résout les dés à leur valeur au niveau courant et les caractéristiques à
 * leur valeur, sans total (le dé sera lancé à la table).
 */
export function resolveExpr(
  terms: ExprTerm[],
  abilities: Abilities,
  level: number,
  progression: ProgressionRules,
): ResolvedExpr {
  const parts: ResolvedPart[] = terms.map((term) => {
    switch (term.kind) {
      case 'ability':
        return {
          kind: 'ability',
          sign: term.sign,
          label: `${ABILITY_NAMES[term.ability]} (${term.ability})`,
          symbol: term.ability,
          value: abilities[term.ability],
        };
      case 'number':
        return {
          kind: 'number',
          sign: term.sign,
          label: 'Bonus',
          symbol: String(term.value),
          value: term.value,
        };
      case 'die': {
        const displayDie = term.token.evolving
          ? scalingDie(level, progression)
          : term.token.die;
        const prefix = term.token.count > 1 ? String(term.token.count) : '';
        return {
          kind: 'die',
          sign: term.sign,
          label: 'Dé',
          symbol: `${prefix}${term.token.die}${term.token.evolving ? '°' : ''}`,
          value: null,
          die: { count: term.token.count, displayDie, evolving: term.token.evolving },
        };
      }
    }
  });
  const hasDie = parts.some((p) => p.die);
  const hasAbility = terms.some((t) => t.kind === 'ability');
  const total = hasDie
    ? null
    : parts.reduce((acc, p) => acc + p.sign * (p.value ?? 0), 0);
  return { hasDie, hasAbility, total, parts };
}
