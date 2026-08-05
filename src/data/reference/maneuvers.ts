/**
 * AIDE-MÉMOIRE — MANŒUVRES DE COMBAT (extraction PER-40).
 *
 * Verbatim du livre de base, section « Les manœuvres (L) » (p. 217-218). Une manœuvre est une action
 * LIMITÉE qui n'inflige pas de DM mais octroie un avantage tactique, résolue par un TEST OPPOSÉ d'attaque
 * au contact assorti du modificateur indiqué entre parenthèses (rendu dans le champ `test`).
 *
 * `*` (Repousser, Bloquer, Désarmer, Renverser, Étourdir) = modificateur de TAILLE, cf. l'entrée d'aperçu
 * `maneuvers-overview`. Le texte `body` est recopié VERBATIM ; les modificateurs vivent dans `test`.
 */

import type { ReferenceTextEntry } from './schema';

const SUBSECTION = 'maneuvers';

/** Manœuvres de combat p. 217-218 (aperçu + les 8 manœuvres nommées). */
export const MANEUVERS: ReferenceTextEntry[] = [
  {
    kind: 'text',
    id: 'maneuvers-overview',
    title: 'Les manœuvres',
    section: 'combat',
    subsection: SUBSECTION,
    tags: ['manœuvre', 'action limitée', 'test opposé', 'avantage tactique'],
    sourcePage: 217,
    shortEffect: 'Action limitée : test opposé d’attaque au contact (modificateur entre parenthèses) pour un avantage tactique, sans DM.',
    body: `Une manœuvre n’a pas pour but d’infliger des DM, mais d’obtenir un avantage tactique, généralement plus intéressant si les PJ combattent à plusieurs contre un seul adversaire.

Le PJ choisit une manœuvre et utilise une action limitée (L) pour faire un test opposé d’attaque au contact contre son adversaire (pas de notion de réussite critique). Selon la manœuvre, le test du PJ subit un modificateur indiqué entre parenthèses. En cas de réussite, il n’inflige pas de DM, mais obtient l’effet indiqué.

* -5 au test par catégorie de taille de moins par rapport à celle de l’attaquant, +5 par catégorie de taille de plus.

En fonction de la manœuvre réalisée et du mode opératoire de l’attaquant, ce dernier peut utiliser (si le MJ le valide) un test d’attaque à distance ou d’attaque magique plutôt qu’un test d’attaque au contact. En attaque au contact, l’AGI pourra remplacer la FOR si l’attaque décrite constitue une action en finesse.

Attention, ces tests sont soumis à la règle des rendements décroissants si la manœuvre est répétée contre un même adversaire durant le combat (-5 cumulatif).`,
    test: 'Test opposé d’attaque au contact (L)',
  },
  {
    kind: 'text',
    id: 'distraire',
    title: 'Distraire',
    section: 'combat',
    subsection: SUBSECTION,
    tags: ['manœuvre', 'CHA', 'surprise', 'PER'],
    sourcePage: 217,
    shortEffect: '-10 à tous les tests de PER et -5 en DEF pendant 1 round ; considérée surprise pour les attaques sournoises.',
    body: `La cible subit un malus de -10 à tous ses tests de PER et -5 en DEF pendant 1 round. Elle est considérée comme surprise pour les attaques sournoises.`,
    test: 'Test opposé d’attaque au contact (L), modificateur : +CHA',
  },
  {
    kind: 'text',
    id: 'gener',
    title: 'Gêner',
    section: 'combat',
    subsection: SUBSECTION,
    tags: ['manœuvre', 'ralenti'],
    sourcePage: 217,
    shortEffect: 'Au choix : la cible est ralentie, ou -5 en attaque pendant 1 round.',
    body: `Au choix, la cible est ralentie (une seule action M ou A) ou elle subit -5 en attaque pendant 1 round.`,
    test: 'Test opposé d’attaque au contact (L), sans modificateur',
  },
  {
    kind: 'text',
    id: 'repousser',
    title: 'Repousser',
    section: 'combat',
    subsection: SUBSECTION,
    tags: ['manœuvre', 'déplacement', 'acculé'],
    sourcePage: 217,
    shortEffect: 'La cible recule de [FOR + 3] m ; si acculée, elle perd autant en DEF pour 1 round.',
    body: `La cible recule de [FOR de l’attaquant + 3] mètres et l’attaquant occupe le terrain libéré. Si la cible est acculée (mur, précipice, adversaire), elle perd autant en DEF pour 1 round. Cette action peut être précédée d’un déplacement de 10 m en direction de la cible.`,
    // Variantes balisées (fiche) : la distance de recul est CALCULÉE sur la FOR du personnage
    // (chip bleu, quantité `[=…]`). `body`/`shortEffect` ci-dessus restent le verbatim de /reference.
    richShortEffect: 'La cible recule de [=FOR + 3] m ; si acculée, elle perd autant en DEF pour 1 round.',
    richBody: `La cible recule de [=FOR + 3] mètres et l’attaquant occupe le terrain libéré. Si la cible est acculée (mur, précipice, adversaire), elle perd autant en DEF pour 1 round. Cette action peut être précédée d’un déplacement de 10 m en direction de la cible.`,
    test: 'Test opposé d’attaque au contact (L), sans modificateur (modificateur de taille *)',
  },
  {
    kind: 'text',
    id: 'bloquer',
    title: 'Bloquer',
    section: 'combat',
    subsection: SUBSECTION,
    tags: ['manœuvre', 'immobilisé', 'FOR'],
    sourcePage: 217,
    shortEffect: 'La cible est immobilisée pendant 1 round (dé malus en attaque, pas de déplacement).',
    body: `La cible est immobilisée pendant 1 round (dé malus en attaque et pas de déplacement). Contre une créature de NC inférieur au niveau de l’attaquant, ce dernier peut maintenir sa prise à chaque round qui suit en emportant un test opposé de FOR (action limitée, modifiée en cas de différence de taille).`,
    test: 'Test opposé d’attaque au contact (L), -5 (modificateur de taille *)',
  },
  {
    kind: 'text',
    id: 'desarmer',
    title: 'Désarmer',
    section: 'combat',
    subsection: SUBSECTION,
    tags: ['manœuvre', 'arme'],
    sourcePage: 217,
    shortEffect: 'La cible laisse tomber son arme au sol.',
    body: `La cible laisse tomber son arme au sol. Elle peut la ramasser avant tout le monde en sacrifiant son prochain tour (elle n’agira pas).`,
    test: 'Test opposé d’attaque au contact (L), -5 (modificateur de taille *)',
  },
  {
    kind: 'text',
    id: 'aveugler',
    title: 'Aveugler',
    section: 'combat',
    subsection: SUBSECTION,
    tags: ['manœuvre', 'aveuglé'],
    sourcePage: 217,
    shortEffect: 'La cible est aveuglée pendant 1 round.',
    body: `La cible est aveuglée pendant 1 round (-5 en attaque au contact et en DEF, -10 contre une cible à distance).`,
    test: 'Test opposé d’attaque au contact (L), -5',
  },
  {
    kind: 'text',
    id: 'renverser',
    title: 'Renverser',
    section: 'combat',
    subsection: SUBSECTION,
    tags: ['manœuvre', 'renversé', 'quadrupède'],
    sourcePage: 217,
    shortEffect: 'La cible est renversée (-5 en DEF, action d’attaque pour se relever).',
    body: `La cible est renversée (-5 en DEF et action d’attaque pour se relever). Cette action peut être précédée d’un déplacement de 10 m en direction de la cible.`,
    test: 'Test opposé d’attaque au contact (L), -5 (-10 contre un quadrupède ; modificateur de taille *)',
  },
  {
    kind: 'text',
    id: 'etourdir',
    title: 'Étourdir',
    section: 'combat',
    subsection: SUBSECTION,
    tags: ['manœuvre', 'étourdi', 'assommé', 'CON'],
    sourcePage: 218,
    shortEffect: 'La cible est étourdie pendant 1 round (pas d’action, -5 en DEF).',
    body: `La cible est étourdie pendant 1 round (pas d’action et -5 en DEF). Si cette manœuvre est réussie contre une cible surprise de NC inférieur au niveau de l’attaquant, elle doit réussir un test de CON difficulté 10 (15 si l’attaquant utilise une arme qui inflige des DM contondants) ou être assommée (inconsciente) pour 1d6 min.`,
    test: 'Test opposé d’attaque au contact (L), -10 (modificateur de taille *)',
  },
];
