/**
 * AIDE-MÉMOIRE — ENCOMBREMENT ET DÉPLACEMENT (extraction PER-42, section 'environment').
 *
 * Chapitre « Les règles de l'aventure » → « Voyager » (p. 232-233) : période de déplacement et distance
 * parcourue (règle d'encombrement [12 + CON − pénalité d'armure] km), terrains difficiles (règle + table),
 * animaux de bât et montures, marche forcée. `body` recopié VERBATIM du livre de base ; `sourcePage` = page
 * imprimée.
 *
 * PÉRIMÈTRE : CO2 n'a PAS de capacité de charge chiffrée (poids porté) ; l'« encombrement » du livre est la
 * distance de voyage par période de déplacement, modulée par la pénalité d'armure et le terrain — c'est ce
 * qui est saisi ici. La VALEUR d'encombrement (pénalité) de chaque armure est une donnée d'équipement (table
 * des armures, chapitre Équipement, Partie II), pas une règle de ce chapitre : non re-stockée ici.
 *
 * HORS PÉRIMÈTRE : les « Dangers du voyage » (dangerosité de la région, test de progression, aggravation
 * hivernale, test de récupération — p. 233-236) forment un SOUS-SYSTÈME distinct de gestion du voyage, non
 * listé au périmètre de PER-42 ; à arbitrer au point de contrôle PER-43 (cf. handoff). Le test de CON de
 * récupération y est déjà référencé par `full-recovery` dans `damage.ts` (« voir page 233 »).
 */

import type { ReferenceEntry, ReferenceTableEntry, ReferenceTextEntry } from './schema';

const SUBSECTION = 'encumbrance';

/** Encadrés de texte de l'encombrement et du déplacement (p. 232-233). */
const ENCUMBRANCE_TEXT_ENTRIES: ReferenceTextEntry[] = [
  {
    kind: 'text',
    id: 'travel-movement',
    title: 'Voyager — période de déplacement',
    section: 'environment',
    subsection: SUBSECTION,
    tags: ['voyage', 'déplacement', 'encombrement', 'pénalité d’armure', 'sac de voyage', 'distance'],
    sourcePage: 232,
    shortEffect: 'Une période de déplacement = 4 h de marche (2 par jour) ; on couvre [12 + CON − pénalité d’armure] km par période.',
    body: `Une période de déplacement correspond à 4 h de marche. Une journée de voyage normale compte deux périodes de déplacement.

Un personnage qui marche sur un chemin plat en portant un sac de voyage bien rempli et tout son équipement couvre une distance de [12 + CON - pénalité d’armure] kilomètres par période de déplacement.

Si l’armure est dans le sac, sa pénalité est réduite de moitié.`,
  },
  {
    kind: 'text',
    id: 'difficult-terrain',
    title: 'Terrains difficiles',
    section: 'environment',
    subsection: SUBSECTION,
    tags: ['terrain difficile', 'hors piste', 'forêt', 'montagne', 'marais', 'grand pas', 'monture'],
    sourcePage: 232,
    shortEffect: 'Hors chemin : distance ÷2 ; terrain difficile : ÷2 ; les deux : ÷4 (montures menées par la bride).',
    body: `Si le personnage se déplace en dehors d’un chemin, il doit chercher sa route et divise la distance parcourue à chaque période de déplacement par deux.

Si le terrain est difficile (forêt dense, montagnes, marécage, etc.), il divise également la distance parcourue par deux.

Les deux paramètres sont cumulatifs : si le personnage sort des sentiers battus et s’aventure sur un terrain difficile, la distance parcourue par période de déplacement est donc divisée par 4. De plus, les montures doivent alors être menées par la bride (il faut marcher).

Rôdeur et druide : Les capacités Grand pas (Rôdeur, rang 3 de la voie de la survie) et Terrains difficiles (Druide, rang 2 de la voie de la nature) annulent les effets du terrain difficile.`,
  },
  {
    kind: 'text',
    id: 'pack-animals-mounts',
    title: 'Animaux de bât et montures',
    section: 'environment',
    subsection: SUBSECTION,
    tags: ['monture', 'mule', 'âne', 'cheval', 'poney', 'bât', 'déplacement'],
    sourcePage: 233,
    shortEffect: 'Mule/âne portant le barda : +2 km sans pénalité d’armure — [14 + CON] km. À cheval : 18 km/période (poney : 15 km).',
    body: `Une mule ou un âne peut porter tout le barda du personnage (armure comprise). Dans ce cas, la distance parcourue par déplacement augmente de 2 km et ne subit pas la pénalité d’armure :

Distance parcourue par période de déplacement = (14 + CON) km

Un personnage à cheval se déplace de 18 km par période (et 15 km pour un poney).`,
  },
  {
    kind: 'text',
    id: 'forced-march',
    title: 'Marche forcée',
    section: 'environment',
    subsection: SUBSECTION,
    tags: ['marche forcée', 'fatigue', 'dé de récupération', 'affaibli', 'monture', 'test de CON', 'test de CHA'],
    sourcePage: 233,
    shortEffect: 'Au-delà de 2 périodes/jour : à pied, −1 DR par période (puis affaibli, puis écroulé) ; monté, tests de CON et de CHA (Équitation) difficulté 10, +10 par période.',
    test: 'À monture : test de CON (Équitation) difficulté 10 pour éviter de perdre 1 DR, et test de CHA (Équitation) même difficulté pour faire avancer la monture ; +10 par période supplémentaire.',
    body: `Dans certaines situations, des personnages peuvent décider d’avancer à marche forcée et donc de ne pas se limiter à deux périodes de déplacement par jour. Ils s’exposent alors à la fatigue.

Si le personnage est à pied, à la fin de chaque période de marche supplémentaire, il perd 1 dé de récupération. S’il n’en a plus, il est affaibli jusqu’à ce qu’il termine une récupération complète. S’il est déjà affaibli, il s’écroule sur place et ne peut plus avancer.

Si le personnage utilise une monture, le cavalier peut faire un test de CON (Équitation) difficulté 10 pour éviter de perdre 1 DR et un test de CHA (Équitation) de même difficulté pour réussir à faire avancer la monture. La difficulté des deux tests augmente de 10 points pour chaque période supplémentaire.`,
  },
];

/** Table des terrains difficiles (p. 233). */
const ENCUMBRANCE_TABLE_ENTRIES: ReferenceTableEntry[] = [
  {
    kind: 'table',
    id: 'difficult-terrain-table',
    title: 'Terrains difficiles',
    section: 'environment',
    subsection: SUBSECTION,
    tags: ['terrain difficile', 'hors piste', 'forêt', 'montagne', 'marais', 'distance parcourue'],
    sourcePage: 233,
    columns: [
      { key: 'terrain', label: 'Type de terrain' },
      { key: 'modifier', label: 'Modificateur de distance parcourue' },
    ],
    rows: [
      { terrain: 'Hors piste', modifier: '/2' },
      { terrain: 'Forêt dense, montagne, marais…', modifier: '/2' },
      { terrain: 'Hors piste ET terrain difficile', modifier: '/4' },
    ],
  },
];

/** Toutes les entrées « encombrement et déplacement » (p. 232-233). */
export const ENCUMBRANCE: ReferenceEntry[] = [...ENCUMBRANCE_TEXT_ENTRIES, ...ENCUMBRANCE_TABLE_ENTRIES];
