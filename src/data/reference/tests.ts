/**
 * AIDE-MÉMOIRE — RÉSOLUTION DES TESTS (extraction PER-41, section 'resolution').
 *
 * Mécanique de base du jeu (chapitre « Les règles de base », p. 198-204) : comment on résout un test,
 * la table des difficultés, dé bonus / dé malus, réussites et échecs critiques (règle générale), tests
 * opposés. `body` recopié VERBATIM du livre de base ; `sourcePage` = page imprimée.
 *
 * NB : CO2 n'utilise PAS de notion de « marge » (succès/échec binaire, avec critique sur 1 et 20) — il
 * n'y a donc pas d'entrée « marge ». La table des difficultés est un `ReferenceTableEntry` (p. 200), les
 * exemples de tests en opposition un second tableau (p. 202). Les critiques SPÉCIFIQUES AU COMBAT (double
 * des DM, critique amélioré) sont en revanche dans `damage.ts` (subsection 'damage', p. 213).
 */

import type { ReferenceEntry, ReferenceTableEntry, ReferenceTextEntry } from './schema';

const SUBSECTION = 'tests';

/** Encadrés de texte de la résolution des tests (p. 200-202). */
const TEST_TEXT_ENTRIES: ReferenceTextEntry[] = [
  {
    kind: 'text',
    id: 'test-resolution',
    title: 'Résolution d’un test',
    section: 'resolution',
    subsection: SUBSECTION,
    tags: ['test', 'd20', 'difficulté', 'caractéristique', 'modificateur'],
    sourcePage: 200,
    shortEffect: 'd20 + Carac. + modificateur ; l’action réussit si le résultat est supérieur ou égal à la difficulté.',
    test: 'd20 + Carac. + modificateur — réussite si le résultat final est supérieur ou égal à la difficulté.',
    body: `Pour effectuer un test, le joueur ou le MJ jette un d20 et ajoute au résultat obtenu la valeur de la caractéristique concernée (dans les scénarios vendus dans le commerce, la caractéristique est indiquée ; sinon, il revient au MJ de déterminer celle qui est adaptée à l’action qui nécessite le test). Le MJ peut appliquer toutes sortes de modificateurs en fonction de la situation, et le joueur peut ajouter un bonus à son résultat grâce à certaines capacités de son personnage (voir plus loin, compétences) ou son niveau (voir Test d’attaque, ci-après).

L’action est réussie lorsque le résultat final est supérieur ou égal à la difficulté du test.

LE TEST EN RÉSUMÉ
d20 + Carac. + modificateur
Si le résultat est inférieur à la difficulté, l’action échoue.
Si le résultat est supérieur ou égal à la difficulté, l’action réussit.`,
  },
  {
    kind: 'text',
    id: 'bonus-malus-die',
    title: 'Dé bonus et dé malus',
    section: 'resolution',
    subsection: SUBSECTION,
    tags: ['dé bonus', 'dé malus', 'avantage', 'désavantage'],
    sourcePage: 200,
    shortEffect: 'Dé bonus : un d20 en plus, on garde le plus haut. Dé malus : un d20 en plus, on garde le plus faible. Ils ne se cumulent pas et s’annulent.',
    body: `Dans certaines situations ou du fait de certaines capacités de voie, un test peut bénéficier d’un dé bonus ou subir un dé malus.

Dé bonus : lancez un d20 supplémentaire et gardez le plus haut résultat (pas celui de votre choix).

Dé malus : lancez un d20 supplémentaire et gardez le plus faible résultat.

Sur un même test, il peut arriver (du fait d’une capacité ou d’une situation particulière) qu’un personnage bénéficie de plusieurs dés bonus d’une part, et/ou subisse plusieurs dés malus d’autre part. Dans ce cas, les règles suivantes s’appliquent :

Il n’est pas possible de cumuler plusieurs dés bonus ou malus. Ainsi, si la situation entraîne plusieurs dés d’un type ou de l’autre, un seul de chaque sera pris en compte.

Le dé malus et le dé bonus s’annulent.

Caractéristiques héroïques : ce sont des capacités de rang 4 (parfois 5) qui permettent d’obtenir un dé bonus. Ce dé ne s’applique qu’aux tests de la caractéristique pas aux tests d’attaque.`,
  },
  {
    kind: 'text',
    id: 'critical-success',
    title: 'Réussite critique',
    section: 'resolution',
    subsection: SUBSECTION,
    tags: ['réussite critique', '20', 'succès automatique'],
    sourcePage: 201,
    shortEffect: 'Un 20 sur le d20 : succès automatique, avec un avantage supplémentaire (et le doublement des DM en combat).',
    body: `Lors d’un test, obtenir un résultat de 20 sur le d20 se traduit par une réussite critique. L’action réussit automatiquement et peut être accompagnée d’effets secondaires.

Action générique. Une réussite critique permet au personnage non seulement d’obtenir l’effet qu’il aurait eu sur une réussite normale, mais en plus, il bénéficie d’un avantage supplémentaire déterminé par le joueur sous réserve de l’approbation du MJ.

Par exemple, le personnage réussit à sauter par-dessus le précipice, et en plus, il atterrit debout tout en dégainant son arme sans que ça ne lui coûte d’action supplémentaire. Dans une autre situation, il repère des traces de passage sur le sol, et parvient en plus à déterminer le nombre de personnes dans le groupe pisté.

Bien entendu, le MJ peut mettre un veto sur une affirmation qui lui semble injustifiée ou qui porte préjudice à la bonne marche du scénario. Les tests où les personnages résistent ou sont passifs ne se prêtent pas toujours à l’amélioration du résultat par une décision du joueur (par exemple, un test de CON pour résister au poison).

Combat. La réussite critique sur un test d’attaque permet de doubler les DM (voir le chapitre dédié au combat).`,
  },
  {
    kind: 'text',
    id: 'critical-failure',
    title: 'Échec critique',
    section: 'resolution',
    subsection: SUBSECTION,
    tags: ['échec critique', '1', 'échec automatique'],
    sourcePage: 201,
    shortEffect: 'Un 1 sur le d20 : l’action échoue automatiquement ; le MJ peut improviser une complication (sans y être obligé).',
    body: `À l’inverse, pour de nombreux tests, obtenir un résultat de 1 sur le d20 se traduit par un échec critique.

L’action échoue automatiquement, même si l’ajout de la valeur de caractéristique et de modificateurs éventuels permettraient d’atteindre la valeur de difficulté. Le MJ a alors toute latitude pour improviser un effet supplémentaire désagréable pour l’auteur de l’échec. Il n’y est toutefois pas obligé, notamment s’il estime que la situation ne s’y prête pas ou que le moment est mal choisi pour le bon déroulement du scénario.

N’enfoncez pas vos joueurs si vous sentez qu’ils sont déjà en difficulté, en particulier en combat.`,
  },
  {
    kind: 'text',
    id: 'opposed-test',
    title: 'Test opposé',
    section: 'resolution',
    subsection: SUBSECTION,
    tags: ['test opposé', 'opposition', 'statu quo'],
    sourcePage: 201,
    shortEffect: 'Deux adversaires font chacun un test et comparent : le plus haut l’emporte (égalité = statu quo ; un critique l’emporte sur un non-critique).',
    test: 'Chaque protagoniste fait un test avec la caractéristique adaptée ; on compare les résultats.',
    body: `Quand plusieurs adversaires sont engagés dans une action qui les oppose directement, on dit qu’ils sont en opposition. Tous deux effectuent alors un test opposé, c’est-à-dire que chacun effectue un test que l’on compare leurs résultats respectifs.

Celui qui obtient le plus grand résultat l’emporte.

En cas d’égalité, il y a statu quo (éventuellement on relance).

Si l’un des participants obtient une réussite critique et pas l’autre, il remporte le test opposé, quel que soit le résultat de l’adversaire.`,
  },
];

/** Table des difficultés (p. 200) et exemples de tests en opposition (p. 202). */
const TEST_TABLE_ENTRIES: ReferenceTableEntry[] = [
  {
    kind: 'table',
    id: 'test-difficulty-table',
    title: 'Table des difficultés',
    section: 'resolution',
    subsection: SUBSECTION,
    tags: ['difficulté', 'facile', 'moyenne', 'difficile', 'extrême', 'abominable'],
    sourcePage: 200,
    columns: [
      { key: 'qualifier', label: 'Qualificatif' },
      { key: 'value', label: 'Valeur de la difficulté' },
    ],
    rows: [
      { qualifier: 'Facile', value: '5' },
      { qualifier: 'Moyenne', value: '10' },
      { qualifier: 'Difficile', value: '15' },
      { qualifier: 'Très difficile', value: '20' },
      { qualifier: 'Extrême', value: '25' },
      { qualifier: 'Abominable', value: '30' },
    ],
  },
  {
    kind: 'table',
    id: 'opposed-test-examples',
    title: 'Exemples de tests en opposition',
    section: 'resolution',
    subsection: SUBSECTION,
    tags: ['test opposé', 'bras de fer', 'intimider', 'passer inaperçu'],
    sourcePage: 202,
    columns: [
      { key: 'situation', label: 'Situation' },
      { key: 'test', label: 'Test' },
    ],
    rows: [
      { situation: 'Bras de fer', test: 'FOR contre FOR' },
      { situation: 'Convaincre', test: 'CHA contre VOL' },
      { situation: 'Course à pied', test: 'AGI contre AGI (Sprint) puis CON contre CON (Course d’endurance)' },
      { situation: 'Intimider', test: 'CHA ou FOR contre VOL' },
      { situation: 'Jouer aux cartes', test: 'INT contre INT' },
      { situation: 'Ligoter un prisonnier', test: 'AGI contre AGI' },
      { situation: 'Mentir/bluff', test: 'CHA contre INT' },
      { situation: 'Passer inaperçu', test: 'AGI contre PER' },
    ],
  },
];

/** Toutes les entrées de la résolution des tests (p. 200-202). */
export const TESTS: ReferenceEntry[] = [...TEST_TEXT_ENTRIES, ...TEST_TABLE_ENTRIES];
