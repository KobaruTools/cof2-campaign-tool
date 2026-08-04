/**
 * AIDE-MÉMOIRE — DANGERS DU VOYAGE (extraction PER-42, section 'environment', subsection 'travel').
 *
 * Chapitre « Les règles de l'aventure » → « Dangers du voyage » (p. 233-236) : détermination de la
 * dangerosité de la région (règle + table), test de progression (règle + table de résultat, avec les
 * définitions des issues : progression stoppée/ralentie/rapide, événements majeur/mineur, bivouac
 * inconfortable/confortable) et aggravation hivernale (règle + table). `body` recopié VERBATIM du livre
 * de base ; `sourcePage` = page imprimée.
 *
 * Sous-domaine 'travel' ajouté à l'extraction PER-42 (validé par le proprio) : sous-système de gestion du
 * voyage distinct de l'encombrement (`encumbrance.ts`) et des dangers de l'environnement (`environment.ts`).
 * Le « test de récupération » (test de CON gating de la récupération complète, p. 236) N'EST PAS re-saisi
 * ici : il est déjà porté par `full-recovery` dans `damage.ts` (qui renvoie explicitement « page 233 »).
 *
 * ATTENTION VERBATIM : dés au symbole degré (« 1d4° ») conservés ; la « marge » de 10 points citée dans le
 * test de progression est propre à ce sous-système (le reste de CO2 n'utilise pas de marge — cf. `tests.ts`).
 */

import type { ReferenceEntry, ReferenceTableEntry, ReferenceTextEntry } from './schema';

const SUBSECTION = 'travel';

/** Encadrés de texte des dangers du voyage (p. 233-236). */
const TRAVEL_TEXT_ENTRIES: ReferenceTextEntry[] = [
  {
    kind: 'text',
    id: 'travel-dangers',
    title: 'Dangers du voyage',
    section: 'environment',
    subsection: SUBSECTION,
    tags: ['voyage', 'danger', 'dangerosité', 'région', 'dés évolutifs', 'test de progression'],
    sourcePage: 233,
    shortEffect: 'Le MJ fixe la dangerosité de la région (difficulté des tests + DM en cas d’échec, indexés sur le niveau via les dés évolutifs).',
    body: `Les voyages ne sont pas de tout repos, et il arrive régulièrement que les personnages fassent de mauvaises rencontres ou soient confrontés à des obstacles. En fin de journée, ils doivent également chercher un abri satisfaisant s’ils veulent pouvoir récupérer pendant la nuit. Les mauvaises rencontres et autres dangers ne sont pas systématiques, et le MJ fera souvent des ellipses, résumant telle ou telle partie du voyage en quelques phrases. Toutefois, lorsque le voyage possède un enjeu ou que le MJ décide que c’est utile pour réveiller une table qui est en train de s’endormir, vous pouvez utiliser la règle suivante.

Dans un premier temps, il appartient au MJ de déterminer la dangerosité de la région traversée. Chaque jour de voyage, le MJ fait faire un test de progression qui lui permet de déterminer les événements et la vitesse de progression pour la journée. De plus, durant les périodes de repos, le MJ peut demander un test de récupération pour déterminer si les PJ parviennent à récupérer ou pas.

Déterminer la dangerosité de la région.

La dangerosité d’une région fixe la difficulté des tests à venir et indique les DM éventuels en cas d’échec (cf. Test de progression, ci-après).

Les DM subis sont indexés sur le niveau des PJ et suivent la règle des dés évolutifs.`,
  },
  {
    kind: 'text',
    id: 'progression-test',
    title: 'Test de progression',
    section: 'environment',
    subsection: SUBSECTION,
    tags: ['test de progression', 'test de PER', 'survie', 'succès', 'échecs', 'bivouac', 'événement'],
    sourcePage: 235,
    shortEffect: 'Chaque jour, chaque PJ fait un test de PER (Survie) de la difficulté de la zone ; le MJ additionne succès et échecs du groupe pour déterminer l’événement de la journée.',
    test: 'Chaque jour, chaque PJ fait un test de PER (Survie) de difficulté correspondant à la zone ; succès et échecs du groupe s’annulent, le total détermine le résultat.',
    body: `Chaque jour, demandez à chaque PJ un test de PER (Survie) de la difficulté correspondant à la zone.

Si les PJ voyagent de nuit, un PJ qui ne voit pas dans le noir subit un dé malus.

Si les PJ connaissent le chemin (ce n’est pas la première fois qu’ils l’empruntent), vous pouvez leur accorder un bonus cumulatif de +2 par passage (par exemple, le trajet de retour est plus facile).

Si les PJ se sont assuré les services d’un guide compétent, celui-ci peut leur octroyer 1 ou 2 succès automatiques selon qu’il connaît parfaitement le secteur ou non.

Le MJ fait la somme des succès et des échecs du groupe, sachant que succès et échecs s’annulent entre eux. Le résultat final (cf. tableau Résultat du test de progression) détermine un événement de la journée, décrit ci-après.

Si un PJ réussit le test avec une marge d’au moins 10 points ou obtient une réussite critique, cela correspond à 2 succès. De même, un échec avec une marge de 10 points et un échec critique comptent pour 2 échecs.

Progression stoppée : les PJ se sont engagés dans un cul-de-sac, ils se sont heurtés à un obstacle infranchissable (ou un adversaire insurmontable) et ils ont rebroussé chemin, à moins qu’ils ne se soient perdus. Dans tous les cas, ils n’ont pas gagné la moindre distance par rapport à leur point de départ du jour.

Progression ralentie : les PJ n’obtiennent qu’une seule période de déplacement pour la journée.

Progression rapide : les PJ obtiennent une période de déplacement supplémentaire sans fatigue.

Événement majeur : pour une résolution rapide, le MJ peut se contenter d’infliger à chaque PJ ayant réussi son test de survie les DM indiqués par le tableau « Dangerosité d’une région » (aucun DM en cas de réussite critique) ; pour ceux qui ont échoué, les DM sont doublés (et triplés en cas d’échec critique). Il peut accompagner ces DM d’une description rapide adaptée au type de milieu selon qu’il choisit un accident (avalanche, chute de pierres, maladie, empoisonnement, etc.), une rencontre (difficulté ordinaire ou difficile) ou encore un épuisement intense (faim, soif, froid, chaleur, obstacles épuisants, etc.). S’il veut accorder du temps et de l’importance au voyage, le MJ peut mettre en scène un incident ou une rencontre.

Événement mineur : pour une résolution rapide, le MJ peut se contenter d’infliger à chaque PJ qui a raté son test de survie les DM indiqués par le tableau « Dangerosité d’une région » (le double en cas d’échec critique). Il peut accompagner ces DM d’une description rapide adaptée au type de milieu selon qu’il choisit un accident (chute en montagne, tempête de sable dans un désert, etc.), une rencontre (difficulté sans danger ou facile) ou simplement de l’épuisement. S’il veut accorder du temps et de l’importance au voyage, le MJ peut mettre en scène cet incident ou cette rencontre.

Bivouac inconfortable : les PJ passent la nuit dans un endroit qui ne leur permet pas de se reposer correctement. Ils subissent un dé malus au test de récupération (cf. Test de récupération).

Bivouac confortable : les PJ ont trouvé un abri sûr et confortable pour la nuit. Ils obtiennent un dé bonus au test de récupération (voir Test de récupération, ci-après).`,
  },
  {
    kind: 'text',
    id: 'winter-travel',
    title: 'Voyage en hiver',
    section: 'environment',
    subsection: SUBSECTION,
    tags: ['hiver', 'froid', 'saison', 'aggravation', 'difficulté', 'DM'],
    sourcePage: 235,
    shortEffect: 'En hiver, le MJ peut aggraver la difficulté et les DM des tests de voyage selon le mois (voir table).',
    body: `Hiver : l’hiver n’est pas propice au voyage. Il fait froid et les jours sont plus courts, toutes sortes de créatures maléfiques en profitent pour parcourir les campagnes. Si vous le souhaitez, en hiver vous pouvez modifier la difficulté et les DM comme suit :`,
  },
];

/** Tables des dangers du voyage : dangerosité (p. 233), résultat de progression et hiver (p. 235). */
const TRAVEL_TABLE_ENTRIES: ReferenceTableEntry[] = [
  {
    kind: 'table',
    id: 'region-danger-table',
    title: 'Dangerosité d’une région',
    section: 'environment',
    subsection: SUBSECTION,
    tags: ['dangerosité', 'région', 'difficulté', 'DM subis', 'zone civilisée', 'zone mortelle'],
    sourcePage: 233,
    columns: [
      { key: 'region', label: 'Type de région' },
      { key: 'difficulty', label: 'Difficulté des tests' },
      { key: 'damage', label: 'DM subis' },
    ],
    rows: [
      { region: 'Zone civilisée', difficulty: '10', damage: '1' },
      { region: 'Zone naturelle ou frontalière', difficulty: '10', damage: '1d4°' },
      { region: 'Zone sauvage ou reculée', difficulty: '15', damage: '2d4°' },
      { region: 'Zone dangereuse (très haute montagne, marais)', difficulty: '20', damage: '3d4°' },
      { region: 'Zone de guerre', difficulty: '20', damage: '3d4°' },
      { region: 'Zone mortelle ou maudite', difficulty: '25', damage: '4d4°' },
    ],
  },
  {
    kind: 'table',
    id: 'progression-result-table',
    title: 'Résultat du test de progression',
    section: 'environment',
    subsection: SUBSECTION,
    tags: ['test de progression', 'succès', 'échecs', 'bivouac', 'progression', 'événement'],
    sourcePage: 235,
    columns: [
      { key: 'result', label: 'Résultat' },
      { key: 'event', label: 'Événement' },
    ],
    rows: [
      { result: '3 échecs', event: 'Progression stoppée et événement majeur' },
      { result: '2 échecs', event: 'Progression ralentie et événement majeur' },
      { result: '1 échec', event: 'Événement mineur' },
      { result: '0 succès', event: 'Bivouac inconfortable' },
      { result: '1 succès', event: 'Progression ordinaire' },
      { result: '2 succès', event: 'Bivouac confortable' },
      { result: '3 succès', event: 'Progression rapide et bivouac confortable' },
    ],
  },
  {
    kind: 'table',
    id: 'winter-aggravation-table',
    title: 'Aggravation due à l’hiver',
    section: 'environment',
    subsection: SUBSECTION,
    tags: ['hiver', 'mois', 'novembre', 'décembre', 'janvier', 'février', 'difficulté', 'DM'],
    sourcePage: 235,
    columns: [
      { key: 'month', label: 'Mois' },
      { key: 'difficulty', label: 'Difficulté des tests' },
      { key: 'damage', label: 'DM subis' },
    ],
    rows: [
      { month: 'Novembre', difficulty: '+5', damage: '' },
      { month: 'Décembre', difficulty: '+5', damage: '+1d4°' },
      { month: 'Janvier', difficulty: '+5', damage: '+1d4°' },
      { month: 'Février', difficulty: '+5', damage: '' },
    ],
  },
];

/** Toutes les entrées « dangers du voyage » (p. 233-236). */
export const TRAVEL: ReferenceEntry[] = [...TRAVEL_TEXT_ENTRIES, ...TRAVEL_TABLE_ENTRIES];
