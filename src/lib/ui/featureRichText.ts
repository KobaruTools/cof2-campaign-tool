/**
 * Couche de PRÉSENTATION parsable des capacités (PER-64, étendue PER-90) :
 * transforme le texte balisé `Feature.richText` en segments rendables (texte, dé,
 * formule, quantité). Pur, sans React, pour être testable isolément. Le rendu
 * visuel vit dans `src/components/sheet/FeatureRichText.tsx`.
 *
 * Mini-langage (format « balisé », cf. doc de `Feature.richText` et
 * `docs/extraction/rich-text-format.md`) :
 * - `{1d4°}`, `{d6}`, `{2d6}` : un dé (accolades). `°` = dé évolutif (p. 43). Le
 *   nombre de dés peut SCALER par rang de voie via des paliers `|C@R` (le compte
 *   passe à C au rang R) : `{1d4°|2@4}`, `{2d4°|3@4|4@5}` — utilisable aussi en formule
 *   (`[1d4°|2@4 + INT]`). Quand c'est la TAILLE du dé qui monte par rang (et non son
 *   seul nombre), les paliers portent un DÉ COMPLET `|CdF@R` (« passe à CdF au rang R »)
 *   — Poings de fer `{1d6|1d8@2|1d10@3|1d12@4|2d6@5}`. Résolu au rang ATTEINT dans la
 *   voie (cf. `dieAtRank`).
 * - `[FOR + 1]`, `[CHA]`, `[1d4° + CHA]`, `[10 + rang]`, `[niveau × 3]` : une
 *   formule de MODIFICATEUR (crochets) — suite de termes séparés par `+`/`-`.
 *   Un terme est une caractéristique / un dé / un nombre / `rang` / `niveau`,
 *   éventuellement multiplié par une constante (`CHA × 100`, `2 × FOR`). Rendue
 *   en encadré signé (total + détail). Un terme peut aussi être la MEILLEURE de
 *   plusieurs caractéristiques (`FOR/AGI` = la plus forte des deux) — substitution
 *   optionnelle de carac, ex. Poings de fer ; le rendu affiche la carac retenue.
 * - `[=CHA]`, `[=CHA × 100]`, `[=rang]`, `[=niveau × 5]` : une QUANTITÉ (crochets
 *   préfixés de `=`) — même grammaire, mais rendue en VALEUR BRUTE (une durée, une
 *   portée, un nombre de cibles), sans signe. « pendant [=CHA] minutes » → « 5 ».
 * - `[#rang]`, `[#niveau]`, `[#INT]` : un TERME NOMMÉ employé comme SUBSTANTIF dans la
 *   phrase (« égal au rang », « égal à son INT ») — rendu en encadré « mot (valeur) »
 *   (« rang (5) », « INT (4) »), info-bulle « … = valeur ». À utiliser quand la prose
 *   garde un déterminant qui réclame le nom (« au rang », « son INT », « par point de
 *   CHA », « d'INT ») là où `[=…]` afficherait un nombre nu (« au 5 », « son 4 »).
 *   Restreint à UN terme `rang`/`niveau`/caractéristique SEUL (ni multiplicateur ni opérateur).
 * - `paliers` (terme de formule) : un BONUS PLAT cross-voie, fourni de l'EXTÉRIEUR par
 *   le composant hôte (un compte de voies au seuil, ex. Marteau de la foi « +1 DM par
 *   AUTRE voie de prêtre au rang 4 »). La couche données ne porte que le placeholder
 *   `[… + paliers]` ; la valeur (le compte) est calculée et injectée à `resolveExpr`
 *   (`milestoneBonus`), comme le « rang » détourné des dés cross-voie. Multipliable
 *   (`2 × paliers`). Défaut 0 → le terme est OMIS (pas de « + 0 » parasite).
 * - `@FOR`, `@AGI`, … : une simple RÉFÉRENCE à une caractéristique (sigle `@`),
 *   mise en avant visuellement sans calcul de valeur (ex. « une @FOR égale au
 *   [CHA] », ou la stat d'une CIBLE qu'on ne peut pas calculer). Pour les sept
 *   codes `AGI/CON/FOR/PER/CHA/INT/VOL` uniquement.
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
  /**
   * Paliers de NOMBRE DE DÉS selon le rang ATTEINT dans la voie (IN-VOIE) — ex.
   * Arc de feu « 1d4° puis 2d4° au rang 4 », Feu grégeois « 2d4°→3d4°→4d4° ». Triés
   * par seuil croissant ; on retient le palier de plus haut seuil atteint, sinon
   * `count`. Notation : `1d4°|2@4`, `2d4°|3@4|4@5`. Absent = nombre fixe.
   */
  countSteps?: { minRank: number; count: number }[];
  /**
   * Paliers de DÉ COMPLET (nombre ET faces) selon le rang ATTEINT dans la voie —
   * pour les DM dont la TAILLE du dé monte par rang (que `countSteps` ne sait pas
   * exprimer), ex. Poings de fer « 1d6→1d8→1d10→1d12→2d6 ». Triés par seuil
   * croissant ; on retient le palier de plus haut seuil atteint, sinon le dé de
   * base. Notation : `1d6|1d8@2|1d10@3|1d12@4|2d6@5`. Absent = dé fixe.
   */
  dieSteps?: { minRank: number; count: number; die: Die }[];
}

/**
 * Un terme d'une formule, avec son signe (`+`/`-`). Les termes « variables »
 * (caractéristique, `rang`, `niveau`) peuvent porter un `coeff` multiplicateur
 * (ex. `CHA × 100` → `coeff: 100`) ; absent = 1.
 */
export type ExprTerm =
  | { kind: 'ability'; sign: 1 | -1; ability: AbilityId; coeff?: number }
  | { kind: 'abilityBest'; sign: 1 | -1; abilities: AbilityId[]; coeff?: number }
  | { kind: 'die'; sign: 1 | -1; token: DieToken }
  | { kind: 'number'; sign: 1 | -1; value: number }
  | { kind: 'rank'; sign: 1 | -1; coeff?: number }
  | { kind: 'level'; sign: 1 | -1; coeff?: number }
  | { kind: 'milestoneBonus'; sign: 1 | -1; coeff?: number };

/** Un fragment de `richText` prêt à rendre. */
export type RichTextSegment =
  | { kind: 'text'; value: string }
  | { kind: 'die'; token: DieToken }
  | { kind: 'expr'; terms: ExprTerm[]; raw: string }
  | { kind: 'quantity'; terms: ExprTerm[]; raw: string }
  | { kind: 'term'; terms: ExprTerm[]; raw: string }
  | { kind: 'abilityRef'; ability: AbilityId };

// `(\d*)d<faces>(°?)` éventuellement suivi de paliers par rang de voie : soit
// `|C@R` (seul le NOMBRE de dés passe à C — `1d4°|2@4`), soit `|CdF@R` (le DÉ COMPLET
// passe à CdF, quand la TAILLE monte — `1d6|1d8@2|2d6@5`). Les deux formes cohabitent.
const DIE_RE =
  /^(\d*)d(4|6|8|10|12|20)(°?)((?:\|(?:\d*d(?:4|6|8|10|12|20)|\d+)@\d+)*)$/;
/**
 * Capture un `{…}` (dé), un `[…]` (formule ou quantité) ou un `@CODE` (référence
 * de caractéristique) ; le reste est du texte.
 */
const TOKEN_RE = new RegExp(`\\{([^}]*)\\}|\\[([^\\]]*)\\]|@(${ABILITY_IDS.join('|')})\\b`, 'g');
/**
 * Tokenise le corps d'une formule : soit un opérateur (`+ - × *`), soit un
 * opérande (suite de caractères sans espace ni opérateur). Permet de gérer la
 * multiplication même avec des espaces autour du `×`.
 */
const EXPR_TOKEN_RE = /([+\-×*])|([^\s+\-×*]+)/g;

/** Parse une notation de dé (ex. `1d4°`, `d6`, `2d6`, `1d4°|2@4`). `null` si invalide. */
function parseDie(raw: string): DieToken | null {
  const m = DIE_RE.exec(raw.trim());
  if (!m) return null;
  const token: DieToken = {
    count: m[1] ? Number(m[1]) : 1,
    die: `d${m[2]}` as Die,
    evolving: m[3] === '°',
  };
  if (m[4]) {
    const countSteps: { minRank: number; count: number }[] = [];
    const dieSteps: { minRank: number; count: number; die: Die }[] = [];
    for (const part of m[4].split('|').filter(Boolean)) {
      const [spec, rank] = part.split('@');
      const minRank = Number(rank);
      const dieMatch = /^(\d*)d(4|6|8|10|12|20)$/.exec(spec);
      if (dieMatch) {
        // Palier de dé complet `CdF@R` (la taille du dé change) — ex. Poings de fer.
        dieSteps.push({ minRank, count: dieMatch[1] ? Number(dieMatch[1]) : 1, die: `d${dieMatch[2]}` as Die });
      } else {
        // Palier de nombre seul `C@R` (la taille du dé ne change pas) — ex. Arc de feu.
        countSteps.push({ minRank, count: Number(spec) });
      }
    }
    if (countSteps.length > 0) token.countSteps = countSteps.sort((a, b) => a.minRank - b.minRank);
    if (dieSteps.length > 0) token.dieSteps = dieSteps.sort((a, b) => a.minRank - b.minRank);
  }
  return token;
}

/**
 * Dé (nombre ET faces) au rang de voie atteint : on applique le palier de plus
 * haut seuil ≤ `rank`, d'abord les paliers de nombre (`countSteps`) puis ceux de dé
 * complet (`dieSteps`, qui changent aussi la taille). Sans palier, renvoie le dé de
 * base. Les deux familles de paliers ne coexistent pas sur une même capacité.
 */
export function dieAtRank(token: DieToken, rank: number): { count: number; die: Die } {
  let count = token.count;
  let die = token.die;
  for (const step of token.countSteps ?? []) {
    if (rank >= step.minRank) count = step.count;
  }
  for (const step of token.dieSteps ?? []) {
    if (rank >= step.minRank) {
      count = step.count;
      die = step.die;
    }
  }
  return { count, die };
}

/**
 * Nombre de dés au rang de voie atteint (raccourci sur `dieAtRank`). Pour un dé à
 * nombre fixe (sans paliers), renvoie simplement `count`.
 */
export function dieCountAtRank(token: DieToken, rank: number): number {
  return dieAtRank(token, rank).count;
}

/** Un atome d'expression (avant réduction en terme). */
type ExprAtom =
  | { kind: 'ability'; ability: AbilityId }
  | { kind: 'abilityBest'; abilities: AbilityId[] }
  | { kind: 'die'; token: DieToken }
  | { kind: 'number'; value: number }
  | { kind: 'rank' }
  | { kind: 'level' }
  | { kind: 'milestoneBonus' };

/** Parse un opérande unique en atome. `null` si non reconnu. */
function parseAtom(raw: string): ExprAtom | null {
  const die = parseDie(raw);
  if (die) return { kind: 'die', token: die };
  if ((ABILITY_IDS as readonly string[]).includes(raw)) {
    return { kind: 'ability', ability: raw as AbilityId };
  }
  // Meilleure de plusieurs caractéristiques (« FOR/AGI » = la plus forte) : modélise
  // une substitution OPTIONNELLE de carac (« remplacer sa FOR par son AGI s'il le
  // souhaite » → on prend la plus avantageuse). Codes séparés par `/`.
  if (raw.includes('/')) {
    const codes = raw.split('/');
    if (codes.length >= 2 && codes.every((c) => (ABILITY_IDS as readonly string[]).includes(c))) {
      return { kind: 'abilityBest', abilities: codes as AbilityId[] };
    }
  }
  if (/^rang$/i.test(raw)) return { kind: 'rank' };
  if (/^niveau$/i.test(raw)) return { kind: 'level' };
  if (/^paliers$/i.test(raw)) return { kind: 'milestoneBonus' };
  if (/^\d+$/.test(raw)) return { kind: 'number', value: Number(raw) };
  return null;
}

/**
 * Réduit une liste de facteurs (séparés par `×`) en un seul terme. Un terme
 * comporte au plus UNE variable (caractéristique / `rang` / `niveau`), les
 * éventuels facteurs numériques se combinant en `coeff`. Un dé doit être seul
 * (pas de multiplicateur). `null` si la combinaison est invalide.
 */
function reduceFactors(sign: 1 | -1, factors: ExprAtom[]): ExprTerm | null {
  const dice = factors.filter((f) => f.kind === 'die');
  if (dice.length > 0) {
    if (factors.length !== 1) return null; // un dé ne se multiplie pas
    return { kind: 'die', sign, token: (dice[0] as { token: DieToken }).token };
  }
  const numbers = factors.filter((f) => f.kind === 'number') as { value: number }[];
  const vars = factors.filter(
    (f) =>
      f.kind === 'ability' ||
      f.kind === 'abilityBest' ||
      f.kind === 'rank' ||
      f.kind === 'level' ||
      f.kind === 'milestoneBonus',
  );
  if (vars.length > 1) return null; // pas de produit de deux variables
  const coeffProduct = numbers.reduce((acc, n) => acc * n.value, 1);
  if (vars.length === 0) {
    return { kind: 'number', sign, value: coeffProduct };
  }
  const coeff = numbers.length > 0 ? coeffProduct : undefined;
  const v = vars[0];
  if (v.kind === 'ability') {
    return coeff !== undefined
      ? { kind: 'ability', sign, ability: v.ability, coeff }
      : { kind: 'ability', sign, ability: v.ability };
  }
  if (v.kind === 'abilityBest') {
    return coeff !== undefined
      ? { kind: 'abilityBest', sign, abilities: v.abilities, coeff }
      : { kind: 'abilityBest', sign, abilities: v.abilities };
  }
  if (v.kind === 'rank') {
    return coeff !== undefined ? { kind: 'rank', sign, coeff } : { kind: 'rank', sign };
  }
  if (v.kind === 'milestoneBonus') {
    return coeff !== undefined ? { kind: 'milestoneBonus', sign, coeff } : { kind: 'milestoneBonus', sign };
  }
  return coeff !== undefined ? { kind: 'level', sign, coeff } : { kind: 'level', sign };
}

/** Parse le contenu d'une formule en termes. `null` si une partie est inconnue. */
function parseExpr(raw: string): ExprTerm[] | null {
  const terms: ExprTerm[] = [];
  let sign: 1 | -1 = 1;
  let factors: ExprAtom[] = [];
  let pendingOperand = false; // un opérande est attendu (après `×`/`+`/`-`)
  const flush = (): boolean => {
    if (factors.length === 0) return false;
    const term = reduceFactors(sign, factors);
    if (!term) return false;
    terms.push(term);
    factors = [];
    return true;
  };
  EXPR_TOKEN_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  let first = true;
  while ((m = EXPR_TOKEN_RE.exec(raw)) !== null) {
    if (m[1] !== undefined) {
      const op = m[1];
      if (op === '×' || op === '*') {
        if (factors.length === 0) return null; // `×` sans opérande à gauche
        pendingOperand = true;
      } else {
        if (factors.length > 0) {
          if (!flush()) return null;
        } else if (!first) {
          return null; // deux opérateurs additifs de suite
        }
        sign = op === '-' ? -1 : 1;
        pendingOperand = true;
      }
    } else {
      const atom = parseAtom(m[2]);
      if (!atom) return null;
      factors.push(atom);
      pendingOperand = false;
    }
    first = false;
  }
  if (pendingOperand && factors.length === 0) return null; // opérateur final orphelin
  if (factors.length > 0 && !flush()) return null;
  if (terms.length === 0) return null;
  return terms;
}

/**
 * Un `[#…]` (terme nommé) n'accepte qu'UN terme NU — `rang`, `niveau` ou une
 * caractéristique — sans multiplicateur ni opérateur : c'est un substantif rendu
 * par son mot (+ valeur), pas une valeur calculée. Sert quand la prose garde un
 * déterminant qui réclame le nom (« son INT », « par point de CHA », « d'INT »).
 */
function isBareNamedTerm(terms: ExprTerm[]): boolean {
  if (terms.length !== 1) return false;
  const t = terms[0];
  return (t.kind === 'rank' || t.kind === 'level' || t.kind === 'ability') && t.coeff === undefined;
}

/**
 * Découpe `richText` en segments. Les `{…}`/`[…]` non reconnus retombent en
 * texte littéral (délimiteurs inclus). Un `[=…]` produit une quantité (valeur
 * brute), un `[#…]` un terme nommé (le mot), un `[…]` une formule de modificateur.
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
      const body = m[2];
      const trimmed = body.trimStart();
      const isQuantity = trimmed.startsWith('=');
      const isTerm = trimmed.startsWith('#');
      const exprBody = isQuantity || isTerm ? trimmed.slice(1) : body;
      const terms = parseExpr(exprBody);
      // Un TERME NOMMÉ (`[#…]`) est restreint à `rang`/`niveau` SEUL (sans
      // multiplicateur ni opérateur) : c'est un substantif, pas une expression.
      // Tout le reste (`[#CHA]`, `[#rang × 2]`, `[#10 + rang]`…) retombe en littéral.
      if (terms && (!isTerm || isBareNamedTerm(terms))) {
        segments.push(
          isTerm
            ? { kind: 'term', terms, raw: m[0] }
            : isQuantity
              ? { kind: 'quantity', terms, raw: m[0] }
              : { kind: 'expr', terms, raw: m[0] },
        );
      } else pushText(m[0]); // crochets non reconnus → littéral
    } else {
      segments.push({ kind: 'abilityRef', ability: m[3] as AbilityId });
    }
  }
  pushText(richText.slice(lastIndex));
  return segments;
}

/** Un terme de formule résolu pour l'affichage. */
export interface ResolvedPart {
  /** Nature du terme (pour le rendu). */
  kind: ExprTerm['kind'];
  sign: 1 | -1;
  /** Libellé complet du terme (ex. « Charisme (CHA) », « Rang », « Niveau ») — info-bulle. */
  label: string;
  /**
   * Symbole court tel qu'écrit dans la formule (ex. « CHA », « CHA × 100 »,
   * « rang », « 1 », « d4° ») : affiché pour que la formule reste lisible.
   */
  symbol: string;
  /** Valeur numérique du terme (déjà multipliée par le coeff) ; `null` pour un dé. */
  value: number | null;
  /**
   * Multiplicateur du terme (ex. `CHA × 100` → 100), pour rendre la dérivation
   * explicite à l'affichage (« 5 × 100 = 500 »). Absent = pas de multiplicateur.
   */
  coeff?: number;
  /** Présent si le terme est un dé, avec sa valeur concrète au niveau courant. */
  die?: { count: number; displayDie: Die; evolving: boolean };
}

/** Résultat de l'évaluation d'une formule/quantité contre un personnage donné. */
export interface ResolvedExpr {
  /** La formule contient au moins un dé → non déterministe (pas de total). */
  hasDie: boolean;
  /** La formule contient au moins une variable (caractéristique / rang / niveau). */
  hasAbility: boolean;
  /** Total numérique si déterministe (`hasDie === false`), sinon `null`. */
  total: number | null;
  /** Détail des termes (pour l'encadré ou le rendu inline). */
  parts: ResolvedPart[];
}

/** Symbole d'une variable, suffixé du multiplicateur éventuel (« CHA × 100 »). */
function withCoeff(base: string, coeff?: number): string {
  return coeff !== undefined ? `${base} × ${coeff}` : base;
}

/**
 * Évalue une formule (ou une quantité) contre les caractéristiques, le niveau et
 * le rang fournis. Sans dé : on calcule le total. Avec dé : on résout les dés à
 * leur valeur au niveau courant et les variables à leur valeur, sans total (le dé
 * sera lancé à la table).
 *
 * `rank` (terme `rang`) = rang ATTEINT dans la voie hôte de la capacité, fourni par
 * l'appelant (« son rang » dynamique) — cf. `pathRank` côté `FeatureText`. Défaut 0
 * pour les appels hors contexte de personnage.
 */
export function resolveExpr(
  terms: ExprTerm[],
  abilities: Abilities,
  level: number,
  progression: ProgressionRules,
  rank = 0,
  milestoneBonus = 0,
): ResolvedExpr {
  const allParts: ResolvedPart[] = terms.map((term) => {
    switch (term.kind) {
      case 'ability':
        return {
          kind: 'ability',
          sign: term.sign,
          label: `${ABILITY_NAMES[term.ability]} (${term.ability})`,
          symbol: withCoeff(term.ability, term.coeff),
          value: abilities[term.ability] * (term.coeff ?? 1),
          coeff: term.coeff,
        };
      case 'abilityBest': {
        // Meilleure des caractéristiques listées (substitution optionnelle, ex.
        // FOR↔AGI) : on retient la plus forte au moment du rendu et on l'AFFICHE
        // (« AGI (3) »), l'info-bulle rappelant que c'est la meilleure des deux.
        const best = term.abilities.reduce((a, b) => (abilities[b] > abilities[a] ? b : a));
        return {
          kind: 'abilityBest',
          sign: term.sign,
          label: `Meilleure de ${term.abilities.map((a) => `${ABILITY_NAMES[a]} (${a})`).join(' ou ')}`,
          symbol: withCoeff(best, term.coeff),
          value: abilities[best] * (term.coeff ?? 1),
          coeff: term.coeff,
        };
      }
      case 'rank':
        return {
          kind: 'rank',
          sign: term.sign,
          label: 'Rang',
          symbol: withCoeff('rang', term.coeff),
          value: rank * (term.coeff ?? 1),
          coeff: term.coeff,
        };
      case 'level':
        return {
          kind: 'level',
          sign: term.sign,
          label: 'Niveau',
          symbol: withCoeff('niveau', term.coeff),
          value: level * (term.coeff ?? 1),
          coeff: term.coeff,
        };
      case 'number':
        return {
          kind: 'number',
          sign: term.sign,
          label: 'Bonus',
          symbol: String(term.value),
          value: term.value,
        };
      case 'milestoneBonus':
        // Bonus plat cross-voie injecté par le composant hôte (compte de voies au
        // seuil, ex. Marteau de la foi). `milestoneBonus` = compte de base ; le
        // coeff applique le « par palier » (Marteau : +1 → coeff absent = ×1).
        return {
          kind: 'milestoneBonus',
          sign: term.sign,
          label: 'Bonus de paliers de voie',
          symbol: withCoeff('paliers', term.coeff),
          value: milestoneBonus * (term.coeff ?? 1),
          coeff: term.coeff,
        };
      case 'die': {
        // Nombre ET faces résolus au rang de voie atteint (paliers `countSteps`/`dieSteps`).
        const { count, die } = dieAtRank(term.token, rank);
        const displayDie = term.token.evolving ? scalingDie(level, progression) : die;
        const prefix = count > 1 ? String(count) : '';
        return {
          kind: 'die',
          sign: term.sign,
          label: 'Dé',
          symbol: `${prefix}${die}${term.token.evolving ? '°' : ''}`,
          value: null,
          die: { count, displayDie, evolving: term.token.evolving },
        };
      }
    }
  });
  // Un bonus de paliers nul (« +0 ») n'apporte rien : on l'omet pour ne pas afficher
  // de terme parasite « + 0 » dans l'encadré (cas fréquent : aucune AUTRE voie au seuil).
  const parts = allParts.filter((p) => !(p.kind === 'milestoneBonus' && (p.value ?? 0) === 0));
  const hasDie = parts.some((p) => p.die);
  const hasAbility = terms.some(
    (t) =>
      t.kind === 'ability' ||
      t.kind === 'abilityBest' ||
      t.kind === 'rank' ||
      t.kind === 'level' ||
      t.kind === 'milestoneBonus',
  );
  const total = hasDie
    ? null
    : parts.reduce((acc, p) => acc + p.sign * (p.value ?? 0), 0);
  return { hasDie, hasAbility, total, parts };
}
