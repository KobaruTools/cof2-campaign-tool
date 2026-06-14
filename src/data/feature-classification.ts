/**
 * Inventaire et classification analytique des capacités — ticket PER-62.
 *
 * Passe PUREMENT ANALYTIQUE sur les 660 capacités du catalogue (toutes familles
 * confondues). Pour chaque capacité : un ou plusieurs tags de nature mécanique
 * (+ sous-types pour les effets conditionnels) et sa page source. Point de
 * contrôle « validation propriétaire » de la méthode du projet (schéma →
 * extraction classée et validée → moteur → UI) et entrée partagée des tickets
 * aval (effets, choix, coûts mana, effets conditionnels).
 *
 * AUCUN code moteur, AUCUN changement de schéma de règles ici : ce fichier ne
 * décrit pas COMMENT appliquer un effet, seulement DE QUELLE NATURE il est.
 *
 * Méthode : classification dérivée du seul champ `text` (verbatim) de chaque
 * `Feature` ; `sourcePage` repris tel quel. Issue de deux passes de lecture
 * croisées (tags de nature, puis sous-types conditionnels + immunités),
 * réconciliées et validées par le propriétaire.
 *
 * Tags de nature (ensemble fermé — clés anglaises, cf. règle code-anglais) :
 * - 'flat-bonus'  : bonus chiffré permanent ET inconditionnel à une stat
 *                   dérivée (Init, DEF, PV, PC, mana, attaque, caractéristique…).
 *                   N'inclut PAS les bonus qui scalent (→ 'conditional'+'scaling').
 * - 'choice'      : la capacité fait choisir quelque chose (sort d'une autre
 *                   voie, caractéristique, option parmi plusieurs, spécialisation).
 * - 'mana-cost'   : coût en mana EXPLICITE et SPÉCIFIQUE dans le texte
 *                   (réduction, surcoût, coût par round/utilisation). Le coût
 *                   standard d'un sort est une règle générique (1 point de mana
 *                   par rang du sort), géré ailleurs — il n'est PAS retagué ici.
 * - 'conditional' : effet conditionnel / temporaire / scalant. Précisé par
 *                   `conditionalKinds` (voir ci-dessous). Quand la capacité est
 *                   une manœuvre active sans sous-type isolable du texte, le tag
 *                   est présent sans `conditionalKinds`.
 * - 'immunity'    : la capacité confère au personnage (ou à un allié/cible via
 *                   lui) une immunité / annulation totale d'un type de DM ou
 *                   d'un état (peur, charme, poison, maladie, feu, froid,
 *                   ralenti/immobilisé, corruption…). Permanente ou temporaire
 *                   (alors aussi 'conditional'+'temporary').
 * - 'pure-text'   : aucune mécanique structurable (narratif / arbitré par le MJ).
 *                   Exclusif : jamais combiné à un autre tag.
 *
 * Sous-types d'un effet conditionnel (`conditionalKinds`, 1+ par effet) :
 * - 'condition'   : ne s'applique que dans une situation / exige un état, une
 *                   arme, une armure, une position, un type de cible, un test.
 * - 'temporary'   : durée limitée OU usages limités (X rounds/minutes, jusqu'à
 *                   la fin du combat, 1 fois par combat/jour, concentration).
 * - 'scaling'     : évolue avec le rang/niveau ou un dé évolutif (par rang,
 *                   +1d4°, selon le niveau, « rang + 2 »).
 */

export const FEATURE_NATURE_TAGS = [
  'flat-bonus',
  'choice',
  'mana-cost',
  'conditional',
  'immunity',
  'pure-text',
] as const;

export type FeatureNatureTag = (typeof FEATURE_NATURE_TAGS)[number];

export const CONDITIONAL_KINDS = ['condition', 'temporary', 'scaling'] as const;

export type ConditionalKind = (typeof CONDITIONAL_KINDS)[number];

export interface FeatureClassification {
  /** Id de la capacité (référence `Feature.id` du catalogue). */
  id: string;
  /** Tags de nature mécanique ; 'pure-text' est toujours seul. */
  tags: FeatureNatureTag[];
  /**
   * Sous-types de l'effet conditionnel, présent uniquement quand `tags`
   * contient 'conditional' ET qu'un sous-type a pu être isolé du texte.
   */
  conditionalKinds?: ConditionalKind[];
  /** Page du livre de base (reprise de `Feature.sourcePage`). */
  sourcePage: number;
  /** Cas ambigu à trancher par le propriétaire (marqueur TODO(extraction)). */
  note?: string;
}

export const FEATURE_CLASSIFICATIONS: FeatureClassification[] = [
  // ---------------------------------------------------------------------------
  // Aventuriers (chap. 6, p. 91-111)
  // ---------------------------------------------------------------------------
  { id: 'artilleur-r1', tags: ['conditional'], conditionalKinds: ['condition', 'scaling'], sourcePage: 62 }, // Mécanismes
  { id: 'artilleur-r2', tags: ['choice', 'conditional'], conditionalKinds: ['scaling'], sourcePage: 62 }, // Arme à répétition
  { id: 'artilleur-r3', tags: ['conditional'], conditionalKinds: ['condition'], sourcePage: 62 }, // Tir de barrage
  { id: 'artilleur-r4', tags: ['conditional'], conditionalKinds: ['condition'], sourcePage: 63 }, // Canon double
  { id: 'artilleur-r5', tags: ['conditional'], conditionalKinds: ['scaling'], sourcePage: 63 }, // Couleuvrine
  { id: 'explosifs-r1', tags: ['conditional'], conditionalKinds: ['condition', 'scaling'], sourcePage: 63 }, // Tir de grenaille
  { id: 'explosifs-r2', tags: ['conditional'], conditionalKinds: ['temporary', 'scaling'], sourcePage: 63 }, // Démolition
  { id: 'explosifs-r3', tags: ['conditional'], conditionalKinds: ['scaling'], sourcePage: 63 }, // Poudre puissante
  { id: 'explosifs-r4', tags: ['conditional'], conditionalKinds: ['temporary', 'scaling'], sourcePage: 64 }, // Piège explosif
  { id: 'explosifs-r5', tags: ['conditional'], conditionalKinds: ['temporary', 'scaling'], sourcePage: 64 }, // Boulet explosif
  { id: 'mercenaire-r1', tags: ['conditional'], conditionalKinds: ['condition', 'scaling'], sourcePage: 64 }, // Pilier de bar
  { id: 'mercenaire-r2', tags: ['choice', 'conditional'], conditionalKinds: ['condition', 'temporary', 'scaling'], sourcePage: 64 }, // Mort ou vif
  { id: 'mercenaire-r3', tags: ['flat-bonus', 'choice'], sourcePage: 64 }, // Combattant aguerri
  { id: 'mercenaire-r4', tags: ['flat-bonus'], sourcePage: 64 }, // Constitution héroïque
  { id: 'mercenaire-r5', tags: ['flat-bonus', 'choice', 'conditional'], conditionalKinds: ['condition'], sourcePage: 64 }, // Combat de masse
  { id: 'pistolero-r1', tags: ['conditional'], conditionalKinds: ['condition'], sourcePage: 64 }, // Plus vite que son ombre
  { id: 'pistolero-r2', tags: ['conditional'], conditionalKinds: ['condition', 'temporary'], sourcePage: 64 }, // Ajuster le tir
  { id: 'pistolero-r3', tags: ['conditional'], conditionalKinds: ['condition'], sourcePage: 64 }, // Tir double
  { id: 'pistolero-r4', tags: ['flat-bonus'], sourcePage: 64 }, // Agilité héroïque
  { id: 'pistolero-r5', tags: ['conditional'], conditionalKinds: ['condition'], sourcePage: 64 }, // As de la gâchette
  { id: 'precision-r1', tags: ['conditional'], conditionalKinds: ['condition'], sourcePage: 65 }, // Joli coup
  { id: 'precision-r2', tags: ['conditional'], conditionalKinds: ['condition', 'temporary'], sourcePage: 65 }, // Défaut dans la cuirasse
  { id: 'precision-r3', tags: ['conditional'], conditionalKinds: ['scaling'], sourcePage: 65 }, // Tir précis
  { id: 'precision-r4', tags: ['conditional'], conditionalKinds: ['condition'], sourcePage: 65 }, // Tireur d'élite
  { id: 'precision-r5', tags: ['conditional'], conditionalKinds: ['condition', 'scaling'], sourcePage: 65 }, // Tir fatal
  { id: 'escrime-r1', tags: ['conditional'], conditionalKinds: ['condition'], sourcePage: 66 }, // Précision
  { id: 'escrime-r2', tags: ['conditional'], conditionalKinds: ['condition', 'temporary', 'scaling'], sourcePage: 66 }, // Feinte
  { id: 'escrime-r3', tags: ['choice', 'conditional'], conditionalKinds: ['condition', 'temporary'], sourcePage: 66 }, // Intelligence du combat
  { id: 'escrime-r4', tags: ['conditional'], conditionalKinds: ['condition'], sourcePage: 66 }, // Attaque flamboyante
  { id: 'escrime-r5', tags: ['conditional'], conditionalKinds: ['condition'], sourcePage: 66 }, // Botte mortelle
  { id: 'musicien-r1', tags: ['conditional'], conditionalKinds: ['temporary', 'scaling'], sourcePage: 67 }, // Chant des héros
  { id: 'musicien-r2', tags: ['conditional'], conditionalKinds: ['temporary', 'scaling'], sourcePage: 67 }, // Chant de réconfort
  { id: 'musicien-r3', tags: ['conditional'], conditionalKinds: ['scaling'], sourcePage: 67 }, // Attaque sonore
  { id: 'musicien-r4', tags: ['conditional'], conditionalKinds: ['temporary'], sourcePage: 67 }, // Zone de silence
  { id: 'musicien-r5', tags: ['conditional'], conditionalKinds: ['condition', 'temporary', 'scaling'], sourcePage: 67 }, // Danse irrésistible
  { id: 'saltimbanque-r1', tags: ['conditional'], conditionalKinds: ['scaling'], sourcePage: 67 }, // Acrobate
  { id: 'saltimbanque-r2', tags: ['flat-bonus', 'conditional'], conditionalKinds: ['scaling'], sourcePage: 68 }, // Grâce féline
  { id: 'saltimbanque-r3', tags: ['conditional'], conditionalKinds: ['scaling'], sourcePage: 68 }, // Lanceur de couteau
  { id: 'saltimbanque-r4', tags: ['immunity'], sourcePage: 68 }, // Liberté d'action
  { id: 'saltimbanque-r5', tags: ['conditional'], conditionalKinds: ['condition'], sourcePage: 68 }, // Esquive acrobatique
  { id: 'seduction-r1', tags: ['conditional'], conditionalKinds: ['scaling'], sourcePage: 68 }, // Charmant
  { id: 'seduction-r2', tags: ['conditional'], conditionalKinds: ['condition', 'scaling'], sourcePage: 68 }, // Dentelles et rapière
  { id: 'seduction-r3', tags: ['conditional'], conditionalKinds: ['condition'], sourcePage: 68 }, // Baratineur de génie
  { id: 'seduction-r4', tags: ['flat-bonus'], sourcePage: 68 }, // Charisme héroïque
  { id: 'seduction-r5', tags: ['conditional'], conditionalKinds: ['condition', 'temporary'], sourcePage: 68 }, // Suggestion
  { id: 'vagabond-r1', tags: ['conditional'], conditionalKinds: ['scaling'], sourcePage: 68 }, // Rumeurs et légendes
  { id: 'vagabond-r2', tags: ['flat-bonus', 'conditional'], conditionalKinds: ['scaling'], sourcePage: 69 }, // Éclectique
  { id: 'vagabond-r3', tags: ['conditional'], sourcePage: 69 }, // Attirail
  { id: 'vagabond-r4', tags: ['conditional'], conditionalKinds: ['temporary', 'scaling'], sourcePage: 69 }, // Compréhension des langues
  { id: 'vagabond-r5', tags: ['conditional'], conditionalKinds: ['temporary'], sourcePage: 69 }, // Déguisement
  { id: 'archer-r1', tags: ['flat-bonus', 'choice', 'conditional'], conditionalKinds: ['scaling'], sourcePage: 70 }, // Archer émérite
  { id: 'archer-r2', tags: ['conditional'], conditionalKinds: ['condition'], sourcePage: 70 }, // Tir chirurgical
  { id: 'archer-r3', tags: ['conditional'], conditionalKinds: ['condition', 'scaling'], sourcePage: 70 }, // Dans le mille
  { id: 'archer-r4', tags: ['conditional'], sourcePage: 70 }, // Tir rapide
  { id: 'archer-r5', tags: ['choice', 'conditional'], conditionalKinds: ['condition', 'temporary', 'scaling'], sourcePage: 70 }, // Flèche de mort
  { id: 'compagnon-animal-r1', tags: ['conditional'], conditionalKinds: ['scaling'], sourcePage: 70 }, // Le loup
  { id: 'compagnon-animal-r2', tags: ['conditional'], conditionalKinds: ['condition'], sourcePage: 71 }, // Travail d'équipe
  { id: 'compagnon-animal-r3', tags: ['conditional'], sourcePage: 71 }, // Lien empathique
  { id: 'compagnon-animal-r4', tags: ['conditional'], conditionalKinds: ['scaling'], sourcePage: 72 }, // Loup alpha
  { id: 'compagnon-animal-r5', tags: ['conditional'], conditionalKinds: ['condition', 'scaling'], sourcePage: 72 }, // Tactiques de meute
  { id: 'survie-r1', tags: ['conditional'], conditionalKinds: ['condition', 'scaling'], sourcePage: 72 }, // Survie
  { id: 'survie-r2', tags: ['conditional'], conditionalKinds: ['condition', 'temporary', 'scaling'], sourcePage: 72 }, // Nature nourricière
  { id: 'survie-r3', tags: ['conditional'], conditionalKinds: ['condition', 'scaling'], sourcePage: 72 }, // Grand pas
  { id: 'survie-r4', tags: ['flat-bonus'], sourcePage: 72 }, // Constitution héroïque
  { id: 'survie-r5', tags: ['conditional'], conditionalKinds: ['condition', 'temporary', 'scaling'], sourcePage: 72 }, // Increvable
  { id: 'traqueur-r1', tags: ['choice', 'conditional'], conditionalKinds: ['condition', 'scaling'], sourcePage: 72 }, // Éclaireur
  { id: 'traqueur-r2', tags: ['conditional'], conditionalKinds: ['scaling'], sourcePage: 72 }, // Attaque éclair
  { id: 'traqueur-r3', tags: ['choice', 'conditional'], conditionalKinds: ['condition', 'scaling'], sourcePage: 72 }, // Chasseur émérite
  { id: 'traqueur-r4', tags: ['flat-bonus'], sourcePage: 73 }, // Perception héroïque
  { id: 'traqueur-r5', tags: ['conditional'], conditionalKinds: ['condition'], sourcePage: 73 }, // Repli
  { id: 'combat-a-deux-armes-r1', tags: ['choice', 'conditional'], conditionalKinds: ['condition'], sourcePage: 73 }, // Attaque à suivre
  { id: 'combat-a-deux-armes-r2', tags: ['flat-bonus', 'conditional'], conditionalKinds: ['condition', 'scaling'], sourcePage: 73 }, // Parade croisée
  { id: 'combat-a-deux-armes-r3', tags: ['conditional'], conditionalKinds: ['condition'], sourcePage: 73 }, // Droite - gauche
  { id: 'combat-a-deux-armes-r4', tags: ['flat-bonus', 'choice'], sourcePage: 73 }, // Combattant héroïque
  { id: 'combat-a-deux-armes-r5', tags: ['choice', 'conditional'], conditionalKinds: ['condition', 'scaling'], sourcePage: 73 }, // Double peine
  { id: 'assassin-r1', tags: ['conditional'], conditionalKinds: ['condition', 'scaling'], sourcePage: 74 }, // Discrétion
  { id: 'assassin-r2', tags: ['conditional'], conditionalKinds: ['condition', 'scaling'], sourcePage: 74 }, // Attaque sournoise
  { id: 'assassin-r3', tags: ['conditional'], conditionalKinds: ['condition', 'scaling'], sourcePage: 74 }, // Attaque par surprise
  { id: 'assassin-r4', tags: ['conditional'], conditionalKinds: ['temporary'], sourcePage: 74 }, // Disparition
  { id: 'assassin-r5', tags: ['choice', 'conditional'], conditionalKinds: ['temporary'], sourcePage: 74 }, // Ouverture mortelle
  { id: 'aventurier-r1', tags: ['conditional'], conditionalKinds: ['scaling'], sourcePage: 74 }, // Baratin
  { id: 'aventurier-r2', tags: ['choice', 'conditional'], conditionalKinds: ['condition', 'scaling'], sourcePage: 75 }, // Provocation
  { id: 'aventurier-r3', tags: ['flat-bonus', 'conditional'], conditionalKinds: ['scaling'], sourcePage: 75 }, // Souplesse du félin
  { id: 'aventurier-r4', tags: ['flat-bonus'], sourcePage: 75 }, // Charisme héroïque
  { id: 'aventurier-r5', tags: ['choice', 'conditional'], conditionalKinds: ['condition', 'temporary', 'scaling'], sourcePage: 75 }, // Attaque paralysante
  { id: 'deplacement-r1', tags: ['flat-bonus', 'conditional'], conditionalKinds: ['scaling'], sourcePage: 75 }, // Agile
  { id: 'deplacement-r2', tags: ['conditional'], conditionalKinds: ['temporary', 'scaling'], sourcePage: 76 }, // Réflexes félins
  { id: 'deplacement-r3', tags: ['choice', 'conditional'], conditionalKinds: ['condition', 'scaling'], sourcePage: 76 }, // Acrobaties
  { id: 'deplacement-r4', tags: ['flat-bonus'], sourcePage: 76 }, // Agilité héroïque
  { id: 'deplacement-r5', tags: ['conditional'], conditionalKinds: ['condition'], sourcePage: 76 }, // Esquive de la magie
  { id: 'roublard-r1', tags: ['flat-bonus', 'conditional'], conditionalKinds: ['scaling'], sourcePage: 76 }, // Doigts agiles
  { id: 'roublard-r2', tags: ['conditional'], conditionalKinds: ['scaling'], sourcePage: 76 }, // Aux aguets
  { id: 'roublard-r3', tags: ['conditional'], conditionalKinds: ['temporary', 'scaling'], sourcePage: 76 }, // Feindre la mort
  { id: 'roublard-r4', tags: ['conditional'], sourcePage: 76 }, // Expert en criminalité
  { id: 'roublard-r5', tags: ['conditional'], conditionalKinds: ['temporary', 'scaling'], sourcePage: 76 }, // Maître du poison
  { id: 'spadassin-r1', tags: ['flat-bonus', 'conditional'], conditionalKinds: ['condition', 'scaling'], sourcePage: 77 }, // Attaque en finesse
  { id: 'spadassin-r2', tags: ['conditional'], conditionalKinds: ['condition', 'temporary'], sourcePage: 77 }, // Esquive fatale
  { id: 'spadassin-r3', tags: ['conditional'], conditionalKinds: ['condition'], sourcePage: 77 }, // Frappe chirurgicale
  { id: 'spadassin-r4', tags: ['conditional'], conditionalKinds: ['condition'], sourcePage: 77 }, // Ambidextrie
  { id: 'spadassin-r5', tags: ['choice', 'conditional'], conditionalKinds: ['condition', 'temporary'], sourcePage: 77 }, // Botte secrète

  // ---------------------------------------------------------------------------
  // Combattants (chap. 5, p. 78-90)
  // ---------------------------------------------------------------------------
  { id: 'brute-r1', tags: ['flat-bonus', 'conditional'], conditionalKinds: ['condition'], sourcePage: 79 }, // Argument de taille
  { id: 'brute-r2', tags: ['conditional'], conditionalKinds: ['temporary'], sourcePage: 79 }, // Tour de force
  { id: 'brute-r3', tags: ['conditional'], conditionalKinds: ['condition', 'scaling'], sourcePage: 79 }, // Attaque brutale
  { id: 'brute-r4', tags: ['flat-bonus'], sourcePage: 80 }, // Force héroïque
  { id: 'brute-r5', tags: ['conditional'], conditionalKinds: ['condition', 'temporary'], sourcePage: 80 }, // Briseur d’os
  { id: 'pagne-r1', tags: ['conditional'], conditionalKinds: ['condition', 'scaling'], sourcePage: 80 }, // Vigueur
  { id: 'pagne-r2', tags: ['choice', 'conditional'], conditionalKinds: ['condition', 'scaling'], sourcePage: 80 }, // Peau de pierre
  { id: 'pagne-r3', tags: ['choice', 'conditional'], conditionalKinds: ['condition'], sourcePage: 80 }, // Tatouages
  { id: 'pagne-r4', tags: ['flat-bonus'], sourcePage: 80 }, // Constitution héroïque
  { id: 'pagne-r5', tags: ['flat-bonus'], sourcePage: 81 }, // Peau d’acier
  { id: 'pourfendeur-r1', tags: ['flat-bonus', 'conditional'], conditionalKinds: ['condition', 'scaling'], sourcePage: 81 }, // Réflexes éclair
  { id: 'pourfendeur-r2', tags: ['conditional'], conditionalKinds: ['condition'], sourcePage: 81 }, // Charge
  { id: 'pourfendeur-r3', tags: ['conditional'], conditionalKinds: ['condition'], sourcePage: 81 }, // Enchaînement
  { id: 'pourfendeur-r4', tags: ['conditional'], conditionalKinds: ['condition'], sourcePage: 81 }, // Déchaînement d’acier
  { id: 'pourfendeur-r5', tags: ['conditional'], conditionalKinds: ['condition', 'temporary'], sourcePage: 81 }, // Attaque tourbillon
  { id: 'primitif-r1', tags: ['flat-bonus', 'conditional'], conditionalKinds: ['condition', 'scaling'], sourcePage: 81 }, // Proche de la nature
  { id: 'primitif-r2', tags: ['conditional'], conditionalKinds: ['condition', 'scaling'], sourcePage: 81 }, // Armure de vent
  { id: 'primitif-r3', tags: ['conditional', 'immunity'], conditionalKinds: ['condition', 'scaling'], sourcePage: 81 }, // Vigilance
  { id: 'primitif-r4', tags: ['conditional'], conditionalKinds: ['condition', 'temporary'], sourcePage: 81 }, // Résistance à la magie
  { id: 'primitif-r5', tags: ['conditional'], conditionalKinds: ['condition'], sourcePage: 82 }, // Vitalité débordante
  { id: 'rage-r1', tags: ['conditional'], conditionalKinds: ['condition', 'temporary', 'scaling'], sourcePage: 82 }, // Cri de guerre
  { id: 'rage-r2', tags: ['conditional'], conditionalKinds: ['condition', 'temporary'], sourcePage: 82 }, // Défier la mort
  { id: 'rage-r3', tags: ['conditional'], conditionalKinds: ['temporary', 'scaling'], sourcePage: 82 }, // Rage du berserk
  { id: 'rage-r4', tags: ['conditional'], conditionalKinds: ['condition', 'temporary'], sourcePage: 82 }, // Même pas mal
  { id: 'rage-r5', tags: ['conditional'], conditionalKinds: ['temporary', 'scaling'], sourcePage: 82 }, // Furie du berserk
  { id: 'cavalier-r1', tags: ['conditional'], conditionalKinds: ['condition', 'scaling'], sourcePage: 83 }, // Fidèle monture
  { id: 'cavalier-r2', tags: ['conditional'], conditionalKinds: ['condition', 'scaling'], sourcePage: 83 }, // Cavalier émérite
  { id: 'cavalier-r3', tags: ['conditional'], conditionalKinds: ['condition'], sourcePage: 84 }, // Charge
  { id: 'cavalier-r4', tags: ['conditional'], sourcePage: 84 }, // Monture magique
  { id: 'cavalier-r5', tags: ['conditional'], conditionalKinds: ['condition'], sourcePage: 84 }, // Monture fantastique
  { id: 'guerre-r1', tags: ['conditional'], conditionalKinds: ['condition', 'scaling'], sourcePage: 84 }, // Armure sur mesure
  { id: 'guerre-r2', tags: ['conditional'], conditionalKinds: ['condition', 'temporary', 'scaling'], sourcePage: 85 }, // Encaisser un coup
  { id: 'guerre-r3', tags: ['conditional'], conditionalKinds: ['condition'], sourcePage: 85 }, // Frappe du justicier
  { id: 'guerre-r4', tags: ['flat-bonus'], sourcePage: 85 }, // Force héroïque
  { id: 'guerre-r5', tags: ['conditional'], conditionalKinds: ['condition', 'temporary'], sourcePage: 85 }, // Mon armure est une arme
  { id: 'preux-r1', tags: ['conditional'], conditionalKinds: ['temporary', 'scaling'], sourcePage: 85 }, // Ignorer la douleur
  { id: 'preux-r2', tags: ['conditional'], conditionalKinds: ['condition'], sourcePage: 85 }, // Piqûres d’insectes
  { id: 'preux-r3', tags: ['conditional'], conditionalKinds: ['condition', 'scaling'], sourcePage: 85 }, // Laissez-le-moi
  { id: 'preux-r4', tags: ['flat-bonus'], sourcePage: 85 }, // Charisme héroïque
  { id: 'preux-r5', tags: ['conditional'], conditionalKinds: ['condition'], sourcePage: 85 }, // Seul contre tous
  { id: 'meneur-d-hommes-r1', tags: ['conditional', 'immunity'], conditionalKinds: ['scaling'], sourcePage: 85 }, // Sans peur
  { id: 'meneur-d-hommes-r2', tags: ['conditional'], conditionalKinds: ['condition', 'temporary', 'scaling'], sourcePage: 85 }, // Intercepter
  { id: 'meneur-d-hommes-r3', tags: ['conditional'], conditionalKinds: ['condition', 'temporary'], sourcePage: 86 }, // Exemplaire
  { id: 'meneur-d-hommes-r4', tags: ['conditional'], conditionalKinds: ['temporary', 'scaling'], sourcePage: 86 }, // Charge fantastique
  { id: 'meneur-d-hommes-r5', tags: ['conditional'], conditionalKinds: ['condition', 'temporary'], sourcePage: 86 }, // Ordre de bataille
  { id: 'noblesse-r1', tags: ['conditional'], conditionalKinds: ['scaling'], sourcePage: 86 }, // Éduqué
  { id: 'noblesse-r2', tags: ['conditional'], conditionalKinds: ['condition', 'scaling'], sourcePage: 86 }, // Écuyer
  { id: 'noblesse-r3', tags: ['conditional'], conditionalKinds: ['condition', 'scaling'], sourcePage: 86 }, // Autorité naturelle
  { id: 'noblesse-r4', tags: ['conditional'], conditionalKinds: ['condition', 'scaling'], sourcePage: 86 }, // Massacrer la piétaille
  { id: 'noblesse-r5', tags: ['choice'], sourcePage: 86 }, // Formation d’élite
  { id: 'bouclier-r1', tags: ['conditional'], conditionalKinds: ['condition', 'temporary', 'scaling'], sourcePage: 87 }, // Protéger un allié
  { id: 'bouclier-r2', tags: ['conditional'], conditionalKinds: ['condition', 'temporary'], sourcePage: 87 }, // Parer un coup
  { id: 'bouclier-r3', tags: ['conditional'], conditionalKinds: ['condition', 'scaling'], sourcePage: 88 }, // Défense au bouclier
  { id: 'bouclier-r4', tags: ['conditional'], conditionalKinds: ['condition'], sourcePage: 88 }, // Absorber un sort
  { id: 'bouclier-r5', tags: ['conditional'], conditionalKinds: ['condition'], sourcePage: 88 }, // Renvoi de sort
  { id: 'combat-r1', tags: ['flat-bonus', 'conditional'], conditionalKinds: ['condition', 'temporary'], sourcePage: 88 }, // Vivacité
  { id: 'combat-r2', tags: ['conditional'], conditionalKinds: ['condition'], sourcePage: 88 }, // Manœuvre
  { id: 'combat-r3', tags: ['conditional'], conditionalKinds: ['condition'], sourcePage: 88 }, // Attaque puissante
  { id: 'combat-r4', tags: ['conditional'], conditionalKinds: ['condition'], sourcePage: 88 }, // Double attaque
  { id: 'combat-r5', tags: ['conditional'], conditionalKinds: ['condition'], sourcePage: 88 }, // Attaque circulaire
  { id: 'maitre-d-armes-r1', tags: ['choice', 'conditional'], conditionalKinds: ['condition', 'scaling'], sourcePage: 88 }, // Armes de prédilection
  { id: 'maitre-d-armes-r2', tags: ['conditional'], conditionalKinds: ['condition'], sourcePage: 89 }, // Science du critique
  { id: 'maitre-d-armes-r3', tags: ['choice', 'conditional'], conditionalKinds: ['condition', 'scaling'], sourcePage: 89 }, // Spécialisation
  { id: 'maitre-d-armes-r4', tags: ['conditional'], conditionalKinds: ['condition'], sourcePage: 89 }, // Attaque parfaite
  { id: 'maitre-d-armes-r5', tags: ['conditional'], conditionalKinds: ['condition', 'temporary'], sourcePage: 89 }, // Riposte
  { id: 'resistance-r1', tags: ['conditional'], conditionalKinds: ['condition', 'scaling'], sourcePage: 89 }, // Robustesse
  { id: 'resistance-r2', tags: ['conditional'], conditionalKinds: ['condition', 'scaling'], sourcePage: 90 }, // Résilient
  { id: 'resistance-r3', tags: ['choice', 'conditional'], conditionalKinds: ['condition'], sourcePage: 90 }, // Armure lourde
  { id: 'resistance-r4', tags: ['flat-bonus'], sourcePage: 90 }, // Constitution héroïque
  { id: 'resistance-r5', tags: ['flat-bonus', 'conditional'], conditionalKinds: ['condition', 'temporary'], sourcePage: 90 }, // Dur à cuire
  { id: 'soldat-r1', tags: ['conditional'], conditionalKinds: ['condition', 'temporary', 'scaling'], sourcePage: 90 }, // Teigneux
  { id: 'soldat-r2', tags: ['conditional'], conditionalKinds: ['temporary'], sourcePage: 90 }, // Prouesse
  { id: 'soldat-r3', tags: ['conditional'], conditionalKinds: ['condition', 'temporary'], sourcePage: 90 }, // Piqûre de rappel
  { id: 'soldat-r4', tags: ['flat-bonus'], sourcePage: 90 }, // Force héroïque
  { id: 'soldat-r5', tags: ['flat-bonus', 'conditional'], conditionalKinds: ['condition'], sourcePage: 90 }, // Rempart

  // ---------------------------------------------------------------------------
  // Mages (chap. 7, p. 112-127)
  // ---------------------------------------------------------------------------
  { id: 'air-r1', tags: ['flat-bonus', 'conditional'], conditionalKinds: ['condition'], sourcePage: 93 }, // Murmures dans le vent
  { id: 'air-r2', tags: ['conditional'], conditionalKinds: ['condition', 'temporary', 'scaling'], sourcePage: 93 }, // Sous tension
  { id: 'air-r3', tags: ['conditional'], conditionalKinds: ['condition', 'temporary', 'scaling'], sourcePage: 93 }, // Télékinésie
  { id: 'air-r4', tags: ['conditional'], conditionalKinds: ['condition'], sourcePage: 93 }, // Foudre
  { id: 'air-r5', tags: ['conditional', 'immunity'], conditionalKinds: ['condition', 'temporary'], sourcePage: 93 }, // Forme éthérée
  { id: 'divination-r1', tags: ['flat-bonus', 'conditional'], conditionalKinds: ['condition', 'scaling'], sourcePage: 93 }, // Divination
  { id: 'divination-r2', tags: ['conditional'], conditionalKinds: ['condition', 'temporary'], sourcePage: 93 }, // Détection de l’invisible
  { id: 'divination-r3', tags: ['conditional'], conditionalKinds: ['condition', 'temporary'], sourcePage: 94 }, // Clairvoyance
  { id: 'divination-r4', tags: ['flat-bonus'], sourcePage: 94 }, // Perception héroïque
  { id: 'divination-r5', tags: ['conditional'], conditionalKinds: ['temporary'], sourcePage: 94 }, // Prescience
  { id: 'envouteur-r1', tags: ['flat-bonus', 'conditional'], conditionalKinds: ['condition', 'scaling'], sourcePage: 94 }, // Injonction
  { id: 'envouteur-r2', tags: ['conditional'], conditionalKinds: ['condition', 'temporary', 'scaling'], sourcePage: 94 }, // Sommeil
  { id: 'envouteur-r3', tags: ['conditional'], conditionalKinds: ['condition', 'temporary'], sourcePage: 94 }, // Confusion
  { id: 'envouteur-r4', tags: ['conditional'], conditionalKinds: ['condition', 'temporary'], sourcePage: 94 }, // Amitié
  { id: 'envouteur-r5', tags: ['conditional'], conditionalKinds: ['condition', 'temporary'], sourcePage: 94 }, // Domination
  { id: 'illusions-r1', tags: ['flat-bonus', 'conditional'], conditionalKinds: ['temporary', 'scaling'], sourcePage: 95 }, // Mirage
  { id: 'illusions-r2', tags: ['conditional'], conditionalKinds: ['condition', 'temporary'], sourcePage: 95 }, // Image décalée
  { id: 'illusions-r3', tags: ['conditional'], conditionalKinds: ['condition', 'scaling'], sourcePage: 95 }, // Sort illusoire
  { id: 'illusions-r4', tags: ['conditional'], conditionalKinds: ['condition', 'temporary'], sourcePage: 95 }, // Imitation
  { id: 'illusions-r5', tags: ['conditional'], conditionalKinds: ['condition', 'temporary'], sourcePage: 95 }, // Exécution mentale
  { id: 'invocation-r1', tags: ['conditional'], conditionalKinds: ['condition'], sourcePage: 96 }, // Choc
  { id: 'invocation-r2', tags: ['conditional'], conditionalKinds: ['temporary'], sourcePage: 96 }, // Serviteur invisible
  { id: 'invocation-r3', tags: ['conditional'], conditionalKinds: ['condition', 'temporary', 'scaling'], sourcePage: 96 }, // Arme de mana
  { id: 'invocation-r4', tags: ['conditional'], conditionalKinds: ['scaling'], sourcePage: 96 }, // Porte dimensionnelle
  { id: 'invocation-r5', tags: ['conditional'], conditionalKinds: ['condition', 'temporary'], sourcePage: 96 }, // Mur de mana
  { id: 'artefacts-r1', tags: ['conditional'], conditionalKinds: ['scaling'], sourcePage: 97 }, // Bâton de mage
  { id: 'artefacts-r2', tags: ['conditional'], conditionalKinds: ['condition', 'temporary'], sourcePage: 97 }, // Ouverture ‑ fermeture
  { id: 'artefacts-r3', tags: ['conditional'], conditionalKinds: ['condition', 'temporary', 'scaling'], sourcePage: 97 }, // Sac sans fond
  { id: 'artefacts-r4', tags: ['conditional'], conditionalKinds: ['condition'], sourcePage: 97 }, // Frappe des arcanes
  { id: 'artefacts-r5', tags: ['choice', 'conditional'], conditionalKinds: ['condition', 'temporary'], sourcePage: 97 }, // Artefact étrange
  { id: 'elixirs-r1', tags: ['flat-bonus', 'conditional'], conditionalKinds: ['temporary', 'scaling'], sourcePage: 98 }, // Fortifiant
  { id: 'elixirs-r2', tags: ['conditional'], conditionalKinds: ['condition', 'scaling'], sourcePage: 98 }, // Feu grégeois
  { id: 'elixirs-r3', tags: ['conditional'], conditionalKinds: ['condition'], sourcePage: 98 }, // Élixir de guérison
  { id: 'elixirs-r4', tags: ['choice', 'conditional'], conditionalKinds: ['scaling'], sourcePage: 98 }, // Élixirs mineurs
  { id: 'elixirs-r5', tags: ['choice', 'conditional'], conditionalKinds: ['scaling'], sourcePage: 98 }, // Élixirs majeurs
  { id: 'metal-r1', tags: ['flat-bonus', 'conditional'], conditionalKinds: ['condition', 'temporary', 'scaling'], sourcePage: 99 }, // Morsure de la forge
  { id: 'metal-r2', tags: ['conditional'], conditionalKinds: ['condition', 'temporary'], sourcePage: 99 }, // Métal brûlant
  { id: 'metal-r3', tags: ['conditional'], conditionalKinds: ['condition', 'temporary'], sourcePage: 99 }, // Magnétisme
  { id: 'metal-r4', tags: ['conditional'], conditionalKinds: ['condition'], sourcePage: 99 }, // Métal hurlant
  { id: 'metal-r5', tags: ['flat-bonus'], sourcePage: 99 }, // Endurer
  { id: 'golem-r1', tags: ['flat-bonus', 'conditional'], conditionalKinds: ['scaling'], sourcePage: 100 }, // Grosse tête
  { id: 'golem-r2', tags: ['conditional'], conditionalKinds: ['scaling'], sourcePage: 100 }, // Golem
  { id: 'golem-r3', tags: ['conditional'], conditionalKinds: ['condition', 'temporary'], sourcePage: 100 }, // Protecteur
  { id: 'golem-r4', tags: ['conditional'], conditionalKinds: ['condition'], sourcePage: 100 }, // Statuette
  { id: 'golem-r5', tags: ['choice', 'conditional'], conditionalKinds: ['scaling'], sourcePage: 100 }, // Golem supérieur
  { id: 'runes-r1', tags: ['flat-bonus', 'conditional'], conditionalKinds: ['scaling'], sourcePage: 101 }, // Runes de défense
  { id: 'runes-r2', tags: ['conditional'], conditionalKinds: ['condition', 'temporary'], sourcePage: 101 }, // Rune de puissance
  { id: 'runes-r3', tags: ['conditional'], conditionalKinds: ['condition', 'temporary'], sourcePage: 101 }, // Rune de protection
  { id: 'runes-r4', tags: ['conditional'], conditionalKinds: ['condition', 'temporary'], sourcePage: 101 }, // Rune d’énergie
  { id: 'runes-r5', tags: ['choice', 'mana-cost', 'conditional'], conditionalKinds: ['condition', 'temporary'], sourcePage: 101 }, // Rune de garde
  { id: 'magie-des-arcanes-r1', tags: ['conditional'], conditionalKinds: ['condition', 'scaling'], sourcePage: 103 }, // Projectile de mana
  { id: 'magie-des-arcanes-r2', tags: ['conditional'], conditionalKinds: ['temporary'], sourcePage: 103 }, // Lévitation
  { id: 'magie-des-arcanes-r3', tags: ['conditional'], conditionalKinds: ['condition', 'temporary'], sourcePage: 103 }, // Forme gazeuse
  { id: 'magie-des-arcanes-r4', tags: ['mana-cost', 'conditional'], conditionalKinds: ['temporary', 'scaling'], sourcePage: 103 }, // Accélération
  { id: 'magie-des-arcanes-r5', tags: ['conditional'], conditionalKinds: ['condition', 'scaling'], sourcePage: 103 }, // Désintégration
  { id: 'magie-destructrice-r1', tags: ['conditional'], conditionalKinds: ['condition', 'scaling'], sourcePage: 103 }, // Arc de feu
  { id: 'magie-destructrice-r2', tags: ['conditional'], conditionalKinds: ['condition', 'temporary'], sourcePage: 103 }, // Saper les forces
  { id: 'magie-destructrice-r3', tags: ['conditional'], conditionalKinds: ['condition', 'temporary', 'scaling'], sourcePage: 103 }, // Flèche de feu
  { id: 'magie-destructrice-r4', tags: ['conditional'], conditionalKinds: ['condition', 'scaling'], sourcePage: 103 }, // Explosion de feu
  { id: 'magie-destructrice-r5', tags: ['conditional'], conditionalKinds: ['condition', 'scaling'], sourcePage: 103 }, // Appel de la foudre
  { id: 'magie-elementaire-r1', tags: ['conditional'], conditionalKinds: ['condition', 'temporary'], sourcePage: 104 }, // Asphyxie
  { id: 'magie-elementaire-r2', tags: ['conditional'], conditionalKinds: ['temporary', 'scaling'], sourcePage: 104 }, // Maîtrise des éléments
  { id: 'magie-elementaire-r3', tags: ['choice', 'mana-cost', 'conditional'], conditionalKinds: ['condition', 'temporary', 'scaling'], sourcePage: 104 }, // Arme élémentaire
  { id: 'magie-elementaire-r4', tags: ['conditional'], conditionalKinds: ['temporary', 'scaling'], sourcePage: 104 }, // Respiration aquatique
  { id: 'magie-elementaire-r5', tags: ['conditional'], conditionalKinds: ['condition', 'temporary', 'scaling'], sourcePage: 104 }, // Armure de pierre
  { id: 'magie-protectrice-r1', tags: ['conditional'], conditionalKinds: ['condition', 'temporary', 'scaling'], sourcePage: 104 }, // Armure de mana
  { id: 'magie-protectrice-r2', tags: ['conditional'], conditionalKinds: ['condition', 'scaling'], sourcePage: 105 }, // Chute ralentie
  { id: 'magie-protectrice-r3', tags: ['conditional'], conditionalKinds: ['condition', 'temporary'], sourcePage: 105 }, // Déphasage
  { id: 'magie-protectrice-r4', tags: ['conditional'], conditionalKinds: ['condition', 'temporary', 'scaling'], sourcePage: 105 }, // Cercle de protection
  { id: 'magie-protectrice-r5', tags: ['conditional'], conditionalKinds: ['temporary', 'scaling'], sourcePage: 105 }, // Interruption du temps
  { id: 'magie-universelle-r1', tags: ['conditional'], conditionalKinds: ['condition', 'temporary'], sourcePage: 106 }, // Lumière
  { id: 'magie-universelle-r2', tags: ['flat-bonus', 'conditional'], conditionalKinds: ['condition'], sourcePage: 106 }, // Familier
  { id: 'magie-universelle-r3', tags: ['conditional'], conditionalKinds: ['condition', 'temporary', 'scaling'], sourcePage: 106 }, // Invisibilité
  { id: 'magie-universelle-r4', tags: ['conditional'], conditionalKinds: ['temporary', 'scaling'], sourcePage: 106 }, // Vol
  { id: 'magie-universelle-r5', tags: ['conditional'], conditionalKinds: ['condition', 'temporary', 'scaling'], sourcePage: 106 }, // Téléportation
  { id: 'demon-r1', tags: ['conditional'], conditionalKinds: ['condition'], sourcePage: 107 }, // Malédiction
  { id: 'demon-r2', tags: ['conditional'], conditionalKinds: ['condition', 'temporary', 'scaling'], sourcePage: 107 }, // Beauté de la succube
  { id: 'demon-r3', tags: ['conditional'], conditionalKinds: ['condition', 'scaling'], sourcePage: 107 }, // Pacte démoniaque
  { id: 'demon-r4', tags: ['conditional'], conditionalKinds: ['condition', 'temporary', 'scaling'], sourcePage: 107 }, // Aspect du démon
  { id: 'demon-r5', tags: ['conditional'], conditionalKinds: ['condition', 'temporary', 'scaling'], sourcePage: 107 }, // Invocation d’un démon
  { id: 'mort-r1', tags: ['choice', 'conditional'], conditionalKinds: ['condition', 'scaling'], sourcePage: 108 }, // Siphon des âmes
  { id: 'mort-r2', tags: ['conditional', 'immunity'], conditionalKinds: ['condition', 'temporary'], sourcePage: 108 }, // Masque mortuaire
  { id: 'mort-r3', tags: ['conditional'], conditionalKinds: ['condition', 'scaling'], sourcePage: 108 }, // Baiser du vampire
  { id: 'mort-r4', tags: ['conditional'], conditionalKinds: ['condition', 'temporary', 'scaling'], sourcePage: 108 }, // Peur
  { id: 'mort-r5', tags: ['conditional'], conditionalKinds: ['condition', 'scaling'], sourcePage: 108 }, // Briser les cœurs
  { id: 'outre-tombe-r1', tags: ['conditional'], conditionalKinds: ['condition', 'temporary', 'scaling'], sourcePage: 109 }, // Un pied dans la tombe
  { id: 'outre-tombe-r2', tags: ['flat-bonus', 'conditional'], conditionalKinds: ['scaling'], sourcePage: 109 }, // Armure d’os
  { id: 'outre-tombe-r3', tags: ['conditional'], conditionalKinds: ['condition', 'scaling'], sourcePage: 109 }, // Animation des morts
  { id: 'outre-tombe-r4', tags: ['conditional'], conditionalKinds: ['condition', 'temporary'], sourcePage: 109 }, // Ensevelissement
  { id: 'outre-tombe-r5', tags: ['conditional'], conditionalKinds: ['condition', 'temporary', 'scaling'], sourcePage: 109 }, // Armée des morts
  { id: 'sang-r1', tags: ['conditional'], conditionalKinds: ['condition', 'temporary', 'scaling'], sourcePage: 109 }, // Saignements
  { id: 'sang-r2', tags: ['conditional'], conditionalKinds: ['condition', 'temporary'], sourcePage: 109 }, // Sang mordant
  { id: 'sang-r3', tags: ['flat-bonus', 'conditional'], conditionalKinds: ['condition', 'scaling'], sourcePage: 110 }, // Exsangue
  { id: 'sang-r4', tags: ['conditional'], conditionalKinds: ['condition', 'temporary', 'scaling'], sourcePage: 110 }, // Rituel de sang
  { id: 'sang-r5', tags: ['conditional'], conditionalKinds: ['condition', 'temporary'], sourcePage: 110 }, // Lien de sang
  { id: 'sombre-magie-r1', tags: ['flat-bonus', 'conditional'], conditionalKinds: ['condition', 'temporary', 'scaling'], sourcePage: 110 }, // Ténèbres
  { id: 'sombre-magie-r2', tags: ['conditional'], conditionalKinds: ['temporary'], sourcePage: 110 }, // Reptation
  { id: 'sombre-magie-r3', tags: ['mana-cost', 'conditional'], conditionalKinds: ['condition', 'temporary', 'scaling'], sourcePage: 111 }, // Strangulation
  { id: 'sombre-magie-r4', tags: ['conditional'], conditionalKinds: ['condition', 'temporary'], sourcePage: 111 }, // Manteau d’ombre
  { id: 'sombre-magie-r5', tags: ['flat-bonus', 'conditional'], conditionalKinds: ['condition', 'scaling'], sourcePage: 110 }, // Pacte ténébreux

  // ---------------------------------------------------------------------------
  // Mystiques (chap. 4, p. 61-77)
  // ---------------------------------------------------------------------------
  { id: 'animaux-r1', tags: ['choice', 'conditional'], conditionalKinds: ['condition', 'scaling'], sourcePage: 114 }, // Langage des animaux
  { id: 'animaux-r2', tags: ['flat-bonus', 'choice', 'conditional'], conditionalKinds: ['condition', 'scaling'], sourcePage: 114 }, // Petit compagnon
  { id: 'animaux-r3', tags: ['conditional'], conditionalKinds: ['condition', 'temporary', 'scaling'], sourcePage: 114 }, // Nuée d'insectes
  { id: 'animaux-r4', tags: ['flat-bonus', 'conditional'], conditionalKinds: ['temporary'], sourcePage: 114 }, // Masque du prédateur
  { id: 'animaux-r5', tags: ['choice', 'conditional'], conditionalKinds: ['condition', 'temporary'], sourcePage: 114 }, // Forme animale
  { id: 'fauve-r1', tags: ['flat-bonus', 'conditional'], conditionalKinds: ['scaling'], sourcePage: 115 }, // Vitesse du félin
  { id: 'fauve-r2', tags: ['conditional'], conditionalKinds: ['condition', 'scaling'], sourcePage: 115 }, // Panthère
  { id: 'fauve-r3', tags: ['conditional'], conditionalKinds: ['condition', 'scaling'], sourcePage: 115 }, // Attaque bondissante
  { id: 'fauve-r4', tags: ['conditional'], conditionalKinds: ['condition', 'scaling'], sourcePage: 115 }, // Grand félin
  { id: 'fauve-r5', tags: ['conditional'], conditionalKinds: ['condition', 'temporary'], sourcePage: 115 }, // Les sept vies du chat
  { id: 'nature-r1', tags: ['conditional'], conditionalKinds: ['condition', 'scaling'], sourcePage: 116 }, // Maître de la survie
  { id: 'nature-r2', tags: ['conditional'], conditionalKinds: ['condition'], sourcePage: 116 }, // Terrains difficiles
  { id: 'nature-r3', tags: ['conditional'], conditionalKinds: ['condition', 'temporary', 'scaling'], sourcePage: 116 }, // Bâton de druide
  { id: 'nature-r4', tags: ['flat-bonus'], sourcePage: 116 }, // Constitution héroïque
  { id: 'nature-r5', tags: ['conditional'], conditionalKinds: ['condition'], sourcePage: 116 }, // Résistant
  { id: 'protecteur-r1', tags: ['conditional'], conditionalKinds: ['condition', 'temporary', 'scaling'], sourcePage: 116 }, // Baies magiques
  { id: 'protecteur-r2', tags: ['conditional'], conditionalKinds: ['condition', 'temporary', 'scaling'], sourcePage: 116 }, // Forêt vivante
  { id: 'protecteur-r3', tags: ['conditional'], conditionalKinds: ['condition', 'temporary', 'scaling'], sourcePage: 117 }, // Régénération
  { id: 'protecteur-r4', tags: ['flat-bonus'], sourcePage: 117 }, // Perception héroïque
  { id: 'protecteur-r5', tags: ['conditional'], conditionalKinds: ['temporary'], sourcePage: 117 }, // Forme d'arbre
  { id: 'vegetaux-r1', tags: ['conditional'], conditionalKinds: ['condition', 'temporary', 'scaling'], sourcePage: 117 }, // Peau d'écorce
  { id: 'vegetaux-r2', tags: ['conditional'], conditionalKinds: ['condition', 'temporary', 'scaling'], sourcePage: 117 }, // Prison végétale
  { id: 'vegetaux-r3', tags: ['conditional'], conditionalKinds: ['condition', 'temporary'], sourcePage: 117 }, // Flèche vivante
  { id: 'vegetaux-r4', tags: ['conditional'], conditionalKinds: ['condition', 'temporary', 'scaling'], sourcePage: 117 }, // Animation d'un arbre
  { id: 'vegetaux-r5', tags: ['conditional'], conditionalKinds: ['condition', 'temporary', 'scaling'], sourcePage: 117 }, // Porte végétale
  { id: 'energie-vitale-r1', tags: ['conditional'], conditionalKinds: ['condition', 'scaling'], sourcePage: 119 }, // Mains d'énergie
  { id: 'energie-vitale-r2', tags: ['conditional'], conditionalKinds: ['condition', 'scaling'], sourcePage: 119 }, // Projection du ki
  { id: 'energie-vitale-r3', tags: ['conditional', 'immunity'], conditionalKinds: ['scaling'], sourcePage: 119 }, // Invulnérable
  { id: 'energie-vitale-r4', tags: ['conditional'], conditionalKinds: ['condition', 'temporary', 'scaling'], sourcePage: 119 }, // Pression mortelle
  { id: 'energie-vitale-r5', tags: ['flat-bonus', 'conditional'], conditionalKinds: ['temporary', 'scaling'], sourcePage: 119 }, // Ascétisme
  { id: 'maitrise-r1', tags: ['flat-bonus', 'conditional'], conditionalKinds: ['condition', 'scaling'], sourcePage: 119 }, // Agilité du singe
  { id: 'maitrise-r2', tags: ['choice', 'conditional'], conditionalKinds: ['condition'], sourcePage: 119 }, // Griffes du tigre
  { id: 'maitrise-r3', tags: ['conditional'], conditionalKinds: ['condition', 'temporary'], sourcePage: 119 }, // Morsure du serpent
  { id: 'maitrise-r4', tags: ['conditional'], conditionalKinds: ['condition', 'temporary'], sourcePage: 119 }, // Fureur du dragon
  { id: 'maitrise-r5', tags: ['flat-bonus', 'conditional'], conditionalKinds: ['temporary', 'scaling'], sourcePage: 120 }, // Moment de perfection
  { id: 'meditation-r1', tags: ['conditional'], conditionalKinds: ['condition', 'scaling'], sourcePage: 120 }, // Pacifisme
  { id: 'meditation-r2', tags: ['conditional'], conditionalKinds: ['temporary', 'scaling'], sourcePage: 120 }, // Transe de guérison
  { id: 'meditation-r3', tags: ['flat-bonus', 'conditional'], conditionalKinds: ['scaling'], sourcePage: 120 }, // Maîtrise du ki
  { id: 'meditation-r4', tags: ['flat-bonus'], sourcePage: 120 }, // Volonté héroïque
  { id: 'meditation-r5', tags: ['flat-bonus', 'conditional'], conditionalKinds: ['temporary', 'scaling'], sourcePage: 120 }, // Projection mentale
  { id: 'poing-r1', tags: ['conditional'], conditionalKinds: ['condition', 'scaling'], sourcePage: 121 }, // Poings de fer
  { id: 'poing-r2', tags: ['flat-bonus', 'conditional'], conditionalKinds: ['scaling'], sourcePage: 121 }, // Peau de fer
  { id: 'poing-r3', tags: ['conditional'], conditionalKinds: ['condition', 'temporary'], sourcePage: 121 }, // Parade de projectiles
  { id: 'poing-r4', tags: ['choice'], sourcePage: 121 }, // Déluge de coups
  { id: 'poing-r5', tags: ['conditional'], conditionalKinds: ['condition'], sourcePage: 121 }, // Puissance du ki
  { id: 'vent-r1', tags: ['flat-bonus', 'conditional'], conditionalKinds: ['scaling'], sourcePage: 121 }, // Pas du vent
  { id: 'vent-r2', tags: ['flat-bonus', 'conditional'], conditionalKinds: ['scaling'], sourcePage: 121 }, // Course du vent
  { id: 'vent-r3', tags: ['immunity'], sourcePage: 121 }, // Course des airs
  { id: 'vent-r4', tags: ['flat-bonus'], sourcePage: 121 }, // Agilité héroïque
  { id: 'vent-r5', tags: ['flat-bonus', 'conditional'], conditionalKinds: ['condition', 'temporary', 'scaling'], sourcePage: 121 }, // Passe-muraille
  { id: 'foi-r1', tags: ['conditional'], conditionalKinds: ['condition', 'temporary'], sourcePage: 122 }, // Prédicateur
  { id: 'foi-r2', tags: ['conditional'], conditionalKinds: ['condition', 'scaling'], sourcePage: 122 }, // Miracle mineur
  { id: 'foi-r3', tags: ['conditional'], conditionalKinds: ['condition', 'temporary', 'scaling'], sourcePage: 123 }, // Arme de lumière
  { id: 'foi-r4', tags: ['conditional'], conditionalKinds: ['temporary'], sourcePage: 123 }, // Ailes célestes
  { id: 'foi-r5', tags: ['mana-cost', 'conditional'], conditionalKinds: ['condition', 'scaling'], sourcePage: 123 }, // Foudres divines
  { id: 'guerre-sainte-r1', tags: ['conditional'], conditionalKinds: ['condition', 'temporary'], sourcePage: 123 }, // Arme bénie
  { id: 'guerre-sainte-r2', tags: ['flat-bonus', 'conditional'], conditionalKinds: ['condition', 'scaling'], sourcePage: 123 }, // Bouclier de la foi
  { id: 'guerre-sainte-r3', tags: ['mana-cost', 'conditional'], conditionalKinds: ['condition', 'scaling'], sourcePage: 123 }, // Châtiment divin
  { id: 'guerre-sainte-r4', tags: ['conditional'], conditionalKinds: ['condition', 'scaling'], sourcePage: 123 }, // Marteau de la foi
  { id: 'guerre-sainte-r5', tags: ['conditional'], conditionalKinds: ['condition', 'temporary'], sourcePage: 124 }, // Mot de pouvoir
  { id: 'priere-r1', tags: ['conditional'], conditionalKinds: ['condition', 'temporary', 'scaling'], sourcePage: 124 }, // Bénédiction
  { id: 'priere-r2', tags: ['conditional'], conditionalKinds: ['condition', 'temporary', 'scaling'], sourcePage: 124 }, // Sanctuaire
  { id: 'priere-r3', tags: ['conditional'], conditionalKinds: ['condition', 'scaling'], sourcePage: 124 }, // Destruction du mal
  { id: 'priere-r4', tags: ['flat-bonus'], sourcePage: 124 }, // Volonté héroïque
  { id: 'priere-r5', tags: ['conditional'], conditionalKinds: ['condition', 'temporary'], sourcePage: 124 }, // Intervention divine
  { id: 'soins-r1', tags: ['conditional'], conditionalKinds: ['condition', 'temporary', 'scaling'], sourcePage: 124 }, // Récupération mineure
  { id: 'soins-r2', tags: ['conditional'], conditionalKinds: ['condition', 'scaling'], sourcePage: 124 }, // Vigueur divine
  { id: 'soins-r3', tags: ['conditional'], conditionalKinds: ['condition', 'scaling'], sourcePage: 125 }, // Récupération majeure
  { id: 'soins-r4', tags: ['conditional'], conditionalKinds: ['condition', 'temporary'], sourcePage: 125 }, // Phénix
  { id: 'soins-r5', tags: ['conditional'], conditionalKinds: ['condition', 'temporary', 'scaling'], sourcePage: 125 }, // Rétablissement
  { id: 'spiritualite-r1', tags: ['flat-bonus', 'choice', 'conditional'], conditionalKinds: ['condition', 'scaling'], sourcePage: 125 }, // Vêtements sacrés
  { id: 'spiritualite-r2', tags: ['conditional'], conditionalKinds: ['condition'], sourcePage: 125 }, // Augure
  { id: 'spiritualite-r3', tags: ['conditional'], conditionalKinds: ['condition'], sourcePage: 125 }, // Délivrance
  { id: 'spiritualite-r4', tags: ['flat-bonus'], sourcePage: 125 }, // Charisme héroïque
  { id: 'spiritualite-r5', tags: ['conditional'], conditionalKinds: ['condition', 'temporary', 'scaling'], sourcePage: 125 }, // Marche des plans

  // ---------------------------------------------------------------------------
  // Voies de peuple (chap. 3) + voie du mage (p. 60)
  // ---------------------------------------------------------------------------
  { id: 'demi-orc-r1', tags: ['flat-bonus'], sourcePage: 48 }, // Impressionnant
  { id: 'demi-orc-r2', tags: ['choice'], sourcePage: 48 }, // Talent pour la violence
  { id: 'demi-orc-r3', tags: ['conditional'], conditionalKinds: ['condition'], sourcePage: 48 }, // Critique brutal
  { id: 'demi-orc-r4', tags: ['conditional'], conditionalKinds: ['condition'], sourcePage: 48 }, // Attaque sanglante
  { id: 'demi-orc-r5', tags: ['flat-bonus'], sourcePage: 48 }, // Colosse
  { id: 'elfe-haut-r1', tags: ['flat-bonus'], sourcePage: 50 }, // Lumière intérieure
  { id: 'elfe-haut-r2', tags: ['conditional', 'immunity'], conditionalKinds: ['condition', 'scaling'], sourcePage: 50 }, // Force d’âme
  { id: 'elfe-haut-r3', tags: ['choice'], sourcePage: 50 }, // Talent pour la magie
  { id: 'elfe-haut-r4', tags: ['immunity'], sourcePage: 50 }, // Immortel
  { id: 'elfe-haut-r5', tags: ['flat-bonus', 'choice'], sourcePage: 50 }, // Supériorité elfique
  { id: 'elfe-sylvain-r1', tags: ['flat-bonus'], sourcePage: 52 }, // Lumière des étoiles
  { id: 'elfe-sylvain-r2', tags: ['choice'], sourcePage: 52 }, // Enfant de la forêt
  { id: 'elfe-sylvain-r3', tags: ['conditional'], conditionalKinds: ['condition'], sourcePage: 52 }, // Archer émérite
  { id: 'elfe-sylvain-r4', tags: ['conditional'], conditionalKinds: ['condition'], sourcePage: 52 }, // Flèche sanglante
  { id: 'elfe-sylvain-r5', tags: ['flat-bonus'], sourcePage: 52 }, // Supériorité elfique
  { id: 'gnome-r1', tags: ['flat-bonus', 'choice', 'conditional'], conditionalKinds: ['condition', 'temporary'], sourcePage: 53 }, // Don étrange
  { id: 'gnome-r2', tags: ['flat-bonus', 'conditional'], conditionalKinds: ['condition'], sourcePage: 54 }, // Petit pote
  { id: 'gnome-r3', tags: ['conditional'], conditionalKinds: ['condition', 'scaling'], sourcePage: 54 }, // Insignifiant
  { id: 'gnome-r4', tags: ['conditional'], conditionalKinds: ['condition'], sourcePage: 54 }, // Merveille technologique
  { id: 'gnome-r5', tags: ['flat-bonus'], sourcePage: 54 }, // Bonne nature
  { id: 'halfelin-r1', tags: ['flat-bonus'], sourcePage: 55 }, // Petite taille
  { id: 'halfelin-r2', tags: ['conditional'], conditionalKinds: ['condition', 'scaling'], sourcePage: 55 }, // Résistance légendaire
  { id: 'halfelin-r3', tags: ['conditional'], conditionalKinds: ['condition', 'temporary'], sourcePage: 55 }, // Bon pour le moral
  { id: 'halfelin-r4', tags: ['flat-bonus', 'conditional'], conditionalKinds: ['condition', 'temporary'], sourcePage: 56 }, // Petit veinard
  { id: 'halfelin-r5', tags: ['flat-bonus'], sourcePage: 56 }, // Vif et bien nourri
  { id: 'humain-r1', tags: ['flat-bonus', 'choice'], sourcePage: 57 }, // Diversité
  { id: 'humain-r2', tags: ['conditional'], conditionalKinds: ['condition', 'temporary'], sourcePage: 57 }, // Instinct de survie
  { id: 'humain-r3', tags: ['choice'], sourcePage: 57 }, // Touche-à-tout
  { id: 'humain-r4', tags: ['conditional'], conditionalKinds: ['condition', 'temporary'], sourcePage: 57 }, // Loup parmi les loups
  { id: 'humain-r5', tags: ['flat-bonus', 'choice'], sourcePage: 57 }, // Polyvalence
  { id: 'nain-r1', tags: ['flat-bonus'], sourcePage: 59 }, // Habitant des tunnels
  { id: 'nain-r2', tags: ['conditional'], conditionalKinds: ['condition'], sourcePage: 59 }, // Haches et marteaux
  { id: 'nain-r3', tags: ['conditional'], conditionalKinds: ['condition', 'temporary'], sourcePage: 59 }, // Résistance à la magie
  { id: 'nain-r4', tags: ['conditional'], conditionalKinds: ['scaling'], sourcePage: 59 }, // Fils du roc
  { id: 'nain-r5', tags: ['flat-bonus'], sourcePage: 60 }, // Ténacité
  { id: 'mage-r1', tags: ['conditional'], conditionalKinds: ['condition', 'scaling'], sourcePage: 60 }, // Capacité de peuple + occultisme
  { id: 'mage-r2', tags: ['conditional'], conditionalKinds: ['condition'], sourcePage: 60 }, // Maîtrise de la magie
  { id: 'mage-r3', tags: ['flat-bonus', 'conditional'], conditionalKinds: ['condition'], sourcePage: 60 }, // Tour de magie
  { id: 'mage-r4', tags: ['flat-bonus', 'conditional'], conditionalKinds: ['condition'], sourcePage: 60 }, // Esprit supérieur
  { id: 'mage-r5', tags: ['mana-cost', 'conditional'], conditionalKinds: ['condition'], sourcePage: 60 }, // Tempête de mana

  // ---------------------------------------------------------------------------
  // Voies de prestige — partie 1 (chap. 8, p. 128+)
  // ---------------------------------------------------------------------------
  { id: 'prestige-expert-r4', tags: ['choice'], sourcePage: 129 }, // Capacité de néophyte
  { id: 'prestige-expert-r5', tags: ['choice'], sourcePage: 129 }, // Capacité d'initié
  { id: 'prestige-expert-r6', tags: ['choice'], sourcePage: 129 }, // Capacité de professionnel
  { id: 'prestige-expert-r7', tags: ['choice'], sourcePage: 129 }, // Capacité d'expert
  { id: 'prestige-expert-r8', tags: ['choice'], sourcePage: 129 }, // Capacité de maître
  { id: 'prestige-specialiste-r4', tags: ['flat-bonus', 'choice'], sourcePage: 129 }, // Expertise
  { id: 'prestige-specialiste-r5', tags: ['choice', 'conditional'], conditionalKinds: ['condition'], sourcePage: 129 }, // Capacité fabuleuse
  { id: 'prestige-specialiste-r6', tags: ['flat-bonus', 'conditional'], conditionalKinds: ['condition'], sourcePage: 129 }, // Caractéristique fabuleuse
  { id: 'prestige-specialiste-r7', tags: ['choice', 'conditional'], conditionalKinds: ['condition', 'temporary'], sourcePage: 129 }, // Capacité supérieure
  { id: 'prestige-specialiste-r8', tags: ['choice', 'mana-cost', 'conditional'], conditionalKinds: ['condition', 'temporary'], sourcePage: 129 }, // Capacité signature
  { id: 'prestige-lycanthrope-r4', tags: ['conditional'], conditionalKinds: ['condition', 'temporary'], sourcePage: 130 }, // Forme hybride
  { id: 'prestige-lycanthrope-r5', tags: ['conditional'], conditionalKinds: ['condition', 'temporary', 'scaling'], sourcePage: 130 }, // Transformation en loup
  { id: 'prestige-lycanthrope-r6', tags: ['conditional'], conditionalKinds: ['condition'], sourcePage: 131 }, // Éventration
  { id: 'prestige-lycanthrope-r7', tags: ['conditional'], conditionalKinds: ['condition'], sourcePage: 131 }, // Résistance surnaturelle
  { id: 'prestige-lycanthrope-r8', tags: ['conditional'], conditionalKinds: ['condition'], sourcePage: 131 }, // Forme puissante
  { id: 'prestige-sang-dragon-r4', tags: ['flat-bonus', 'choice', 'conditional'], conditionalKinds: ['scaling'], sourcePage: 131 }, // Ascendance draconique
  { id: 'prestige-sang-dragon-r5', tags: ['conditional'], conditionalKinds: ['temporary', 'scaling'], sourcePage: 131 }, // Griffes du dragon
  { id: 'prestige-sang-dragon-r6', tags: ['conditional'], conditionalKinds: ['temporary'], sourcePage: 131 }, // Souffle du dragon
  { id: 'prestige-sang-dragon-r7', tags: ['conditional'], conditionalKinds: ['temporary'], sourcePage: 132 }, // Ailes de dragon
  { id: 'prestige-sang-dragon-r8', tags: ['conditional'], conditionalKinds: ['condition'], sourcePage: 132 }, // Écailles de dragon
  { id: 'prestige-familier-fantastique-r3', tags: ['conditional'], sourcePage: 132 }, // Familier fantastique
  { id: 'prestige-familier-fantastique-r4', tags: ['pure-text'], sourcePage: 133 }, // Pouvoir mineur
  { id: 'prestige-familier-fantastique-r5', tags: ['flat-bonus', 'choice', 'conditional'], conditionalKinds: ['temporary', 'scaling'], sourcePage: 133 }, // Résistance
  { id: 'prestige-familier-fantastique-r6', tags: ['flat-bonus'], sourcePage: 133 }, // Inséparables
  { id: 'prestige-familier-fantastique-r7', tags: ['flat-bonus'], sourcePage: 133 }, // Pouvoir supérieur
  { id: 'prestige-archer-arcanique-r4', tags: ['conditional'], conditionalKinds: ['condition'], sourcePage: 137 }, // Flèche magique
  { id: 'prestige-archer-arcanique-r5', tags: ['conditional'], sourcePage: 137 }, // Flèche intangible
  { id: 'prestige-archer-arcanique-r6', tags: ['conditional'], conditionalKinds: ['condition', 'temporary'], sourcePage: 137 }, // Flèche chercheuse
  { id: 'prestige-archer-arcanique-r7', tags: ['choice', 'conditional'], conditionalKinds: ['temporary'], sourcePage: 137 }, // Flèche élémentaire
  { id: 'prestige-archer-arcanique-r8', tags: ['conditional'], conditionalKinds: ['condition', 'temporary'], sourcePage: 137 }, // Flèche tueuse
  { id: 'prestige-espion-r4', tags: ['flat-bonus', 'conditional'], conditionalKinds: ['scaling'], sourcePage: 138 }, // Secrets d'alcôves
  { id: 'prestige-espion-r5', tags: ['conditional'], conditionalKinds: ['condition'], sourcePage: 138 }, // À la garde
  { id: 'prestige-espion-r6', tags: ['flat-bonus'], sourcePage: 138 }, // Mémoire eidétique
  { id: 'prestige-espion-r7', tags: ['conditional'], conditionalKinds: ['condition'], sourcePage: 138 }, // Caméléon
  { id: 'prestige-espion-r8', tags: ['conditional'], conditionalKinds: ['condition', 'temporary'], sourcePage: 138 }, // Réseau
  { id: 'prestige-casse-cou-r4', tags: ['conditional'], conditionalKinds: ['condition'], sourcePage: 138 }, // Au pied du mur
  { id: 'prestige-casse-cou-r5', tags: ['flat-bonus', 'conditional'], conditionalKinds: ['condition', 'scaling'], sourcePage: 139 }, // Mouche du coche
  { id: 'prestige-casse-cou-r6', tags: ['conditional'], conditionalKinds: ['condition'], sourcePage: 139 }, // L'amour du risque
  { id: 'prestige-casse-cou-r7', tags: ['conditional'], conditionalKinds: ['temporary'], sourcePage: 139 }, // Poussée d'adrénaline
  { id: 'prestige-casse-cou-r8', tags: ['conditional'], conditionalKinds: ['condition', 'scaling'], sourcePage: 139 }, // Attaque kamikaze
  { id: 'prestige-ombres-r4', tags: ['flat-bonus', 'conditional'], conditionalKinds: ['condition'], sourcePage: 139 }, // Vision des ombres
  { id: 'prestige-ombres-r5', tags: ['conditional'], conditionalKinds: ['condition'], sourcePage: 139 }, // Caméléon
  { id: 'prestige-ombres-r6', tags: ['conditional'], conditionalKinds: ['temporary'], sourcePage: 139 }, // Ombre mouvante
  { id: 'prestige-ombres-r7', tags: ['conditional'], conditionalKinds: ['temporary'], sourcePage: 139 }, // Cape d'ombre
  { id: 'prestige-ombres-r8', tags: ['conditional'], conditionalKinds: ['condition'], sourcePage: 139 }, // Passe-muraille
  { id: 'prestige-chasseur-de-prime-r4', tags: ['flat-bonus', 'conditional'], conditionalKinds: ['condition'], sourcePage: 140 }, // Marque du chasseur
  { id: 'prestige-chasseur-de-prime-r5', tags: ['conditional'], conditionalKinds: ['condition', 'temporary'], sourcePage: 140 }, // Assommer
  { id: 'prestige-chasseur-de-prime-r6', tags: ['conditional'], conditionalKinds: ['condition', 'scaling'], sourcePage: 140 }, // Traqueur infatigable
  { id: 'prestige-chasseur-de-prime-r7', tags: ['conditional'], conditionalKinds: ['condition', 'temporary'], sourcePage: 140 }, // Attaque invalidante
  { id: 'prestige-chasseur-de-prime-r8', tags: ['conditional'], conditionalKinds: ['condition', 'temporary'], sourcePage: 140 }, // Instinct du Traqueur
  { id: 'prestige-duelliste-r4', tags: ['choice', 'conditional'], conditionalKinds: ['condition'], sourcePage: 140 }, // Vive attaque
  { id: 'prestige-duelliste-r5', tags: ['conditional'], conditionalKinds: ['condition', 'temporary'], sourcePage: 140 }, // Défi
  { id: 'prestige-duelliste-r6', tags: ['flat-bonus', 'conditional'], conditionalKinds: ['condition'], sourcePage: 142 }, // Juste toi et moi
  { id: 'prestige-duelliste-r7', tags: ['conditional'], conditionalKinds: ['condition'], sourcePage: 142 }, // Duel mental
  { id: 'prestige-duelliste-r8', tags: ['conditional'], conditionalKinds: ['condition', 'temporary', 'scaling'], sourcePage: 142 }, // Botte mortelle
  { id: 'prestige-flibustier-r4', tags: ['flat-bonus', 'conditional'], conditionalKinds: ['condition', 'scaling'], sourcePage: 141 }, // Pied marin
  { id: 'prestige-flibustier-r5', tags: ['conditional'], conditionalKinds: ['temporary'], sourcePage: 141 }, // Coup de crosse
  { id: 'prestige-flibustier-r6', tags: ['conditional'], conditionalKinds: ['condition'], sourcePage: 142 }, // À l'abordage
  { id: 'prestige-flibustier-r7', tags: ['conditional'], sourcePage: 142 }, // Sabre au poing
  { id: 'prestige-flibustier-r8', tags: ['conditional'], conditionalKinds: ['condition'], sourcePage: 142 }, // Pas de quartier
  { id: 'prestige-heros-r4', tags: ['flat-bonus', 'conditional'], conditionalKinds: ['temporary', 'scaling'], sourcePage: 142 }, // Destin héroïque
  { id: 'prestige-heros-r5', tags: ['conditional'], conditionalKinds: ['temporary'], sourcePage: 142 }, // Homme/femme de la situation
  { id: 'prestige-heros-r6', tags: ['choice', 'conditional'], conditionalKinds: ['condition', 'scaling'], sourcePage: 142 }, // Héros célèbre
  { id: 'prestige-heros-r7', tags: ['conditional'], conditionalKinds: ['condition'], sourcePage: 142 }, // Ténacité
  { id: 'prestige-heros-r8', tags: ['conditional'], conditionalKinds: ['temporary'], sourcePage: 142 }, // Meneur d'hommes
  { id: 'prestige-maitre-des-poisons-r4', tags: ['conditional'], sourcePage: 143 }, // Connaissance du poison
  { id: 'prestige-maitre-des-poisons-r5', tags: ['conditional'], conditionalKinds: ['condition', 'temporary'], sourcePage: 143 }, // Poison rapide
  { id: 'prestige-maitre-des-poisons-r6', tags: ['conditional'], conditionalKinds: ['condition'], sourcePage: 143 }, // Poison affaiblissant
  { id: 'prestige-maitre-des-poisons-r7', tags: ['conditional'], conditionalKinds: ['condition'], sourcePage: 143 }, // Résistance au poison
  { id: 'prestige-maitre-des-poisons-r8', tags: ['conditional'], conditionalKinds: ['temporary'], sourcePage: 143 }, // Poisons virulents
  { id: 'prestige-pacte-feerique-r4', tags: ['conditional'], conditionalKinds: ['condition'], sourcePage: 143 }, // Amitié avec les animaux
  { id: 'prestige-pacte-feerique-r5', tags: ['conditional'], conditionalKinds: ['condition', 'temporary'], sourcePage: 143 }, // Invisibilité
  { id: 'prestige-pacte-feerique-r6', tags: ['conditional'], sourcePage: 143 }, // Compagnon féérique
  { id: 'prestige-pacte-feerique-r7', tags: ['conditional'], conditionalKinds: ['condition', 'temporary'], sourcePage: 144 }, // Pas brumeux
  { id: 'prestige-pacte-feerique-r8', tags: ['conditional'], conditionalKinds: ['condition', 'temporary'], sourcePage: 144 }, // Pays des songes
  { id: 'prestige-touche-a-tout-r4', tags: ['choice'], sourcePage: 144 }, // Domaine de l'aventure
  { id: 'prestige-touche-a-tout-r5', tags: ['choice'], sourcePage: 144 }, // Domaine de la guerre
  { id: 'prestige-touche-a-tout-r6', tags: ['choice', 'conditional'], conditionalKinds: ['condition'], sourcePage: 144 }, // Domaine du mystique
  { id: 'prestige-touche-a-tout-r7', tags: ['choice', 'conditional'], conditionalKinds: ['condition'], sourcePage: 144 }, // Domaine de la magie
  { id: 'prestige-touche-a-tout-r8', tags: ['flat-bonus', 'choice'], sourcePage: 144 }, // Ultra polyvalent
  { id: 'prestige-tueur-a-gages-r4', tags: ['conditional'], conditionalKinds: ['condition', 'temporary'], sourcePage: 145 }, // Faire taire
  { id: 'prestige-tueur-a-gages-r5', tags: ['conditional'], conditionalKinds: ['condition', 'temporary'], sourcePage: 145 }, // Brise genou
  { id: 'prestige-tueur-a-gages-r6', tags: ['conditional'], conditionalKinds: ['condition', 'temporary'], sourcePage: 145 }, // Ne me tourne pas le dos
  { id: 'prestige-tueur-a-gages-r7', tags: ['conditional'], conditionalKinds: ['condition', 'scaling'], sourcePage: 145 }, // Égorger
  { id: 'prestige-tueur-a-gages-r8', tags: ['conditional'], conditionalKinds: ['condition', 'temporary'], sourcePage: 145 }, // Un simple regard

  // ---------------------------------------------------------------------------
  // Voies de prestige — partie 2 (chap. 8, p. 128+)
  // ---------------------------------------------------------------------------
  { id: 'prestige-armes-a-deux-mains-r4', tags: ['conditional'], conditionalKinds: ['condition'], sourcePage: 146 }, // Frappe massive
  { id: 'prestige-armes-a-deux-mains-r5', tags: ['conditional'], conditionalKinds: ['condition'], sourcePage: 146 }, // Gros monstre, grosse arme
  { id: 'prestige-armes-a-deux-mains-r6', tags: ['conditional'], conditionalKinds: ['condition', 'scaling'], sourcePage: 146 }, // Tenir à distance
  { id: 'prestige-armes-a-deux-mains-r7', tags: ['conditional'], conditionalKinds: ['condition'], sourcePage: 146 }, // Critique destructeur
  { id: 'prestige-armes-a-deux-mains-r8', tags: ['conditional'], conditionalKinds: ['condition'], sourcePage: 146 }, // Décapitation
  { id: 'prestige-arme-liee-r4', tags: ['conditional'], conditionalKinds: ['condition', 'temporary'], sourcePage: 147 }, // Fidèle
  { id: 'prestige-arme-liee-r5', tags: ['conditional'], conditionalKinds: ['condition', 'temporary'], sourcePage: 147 }, // Alliée loyale
  { id: 'prestige-arme-liee-r6', tags: ['conditional'], conditionalKinds: ['temporary', 'scaling'], sourcePage: 147 }, // Arme dansante
  { id: 'prestige-arme-liee-r7', tags: ['conditional'], conditionalKinds: ['condition', 'temporary', 'scaling'], sourcePage: 147 }, // Aura élémentaire
  { id: 'prestige-arme-liee-r8', tags: ['conditional'], conditionalKinds: ['temporary', 'scaling'], sourcePage: 147 }, // Milles lames
  { id: 'prestige-chevalier-dragon-r4', tags: ['conditional'], conditionalKinds: ['condition'], sourcePage: 147 }, // Ordre du chevalier dragon
  { id: 'prestige-chevalier-dragon-r5', tags: ['conditional'], conditionalKinds: ['condition', 'scaling'], sourcePage: 148 }, // Résistance au feu
  { id: 'prestige-chevalier-dragon-r6', tags: ['conditional'], conditionalKinds: ['temporary', 'scaling'], sourcePage: 148 }, // Épée de feu
  { id: 'prestige-chevalier-dragon-r7', tags: ['conditional'], sourcePage: 148 }, // Monture puissante
  { id: 'prestige-chevalier-dragon-r8', tags: ['conditional'], conditionalKinds: ['condition', 'temporary'], sourcePage: 148 }, // Souffle enflammé
  { id: 'prestige-combattant-des-tunnels-r4', tags: ['flat-bonus', 'conditional'], conditionalKinds: ['condition'], sourcePage: 148 }, // Infravision
  { id: 'prestige-combattant-des-tunnels-r5', tags: ['conditional'], conditionalKinds: ['condition', 'scaling'], sourcePage: 148 }, // Combat confiné
  { id: 'prestige-combattant-des-tunnels-r6', tags: ['conditional'], conditionalKinds: ['condition', 'temporary', 'scaling'], sourcePage: 148 }, // Briseur de hordes
  { id: 'prestige-combattant-des-tunnels-r7', tags: ['conditional'], conditionalKinds: ['condition'], sourcePage: 148 }, // Tueur de nuées
  { id: 'prestige-combattant-des-tunnels-r8', tags: ['conditional'], conditionalKinds: ['condition', 'temporary'], sourcePage: 148 }, // Briseur de voûte
  { id: 'prestige-combat-du-mal-r4', tags: ['conditional'], conditionalKinds: ['condition'], sourcePage: 148 }, // Juste courroux
  { id: 'prestige-combat-du-mal-r5', tags: ['conditional'], conditionalKinds: ['condition', 'temporary'], sourcePage: 148 }, // Épée de lumière
  { id: 'prestige-combat-du-mal-r6', tags: ['conditional'], conditionalKinds: ['condition'], sourcePage: 148 }, // Sentir la corruption
  { id: 'prestige-combat-du-mal-r7', tags: ['conditional'], conditionalKinds: ['condition', 'temporary'], sourcePage: 148 }, // Frappe suppressive
  { id: 'prestige-combat-du-mal-r8', tags: ['conditional', 'immunity'], conditionalKinds: ['temporary'], sourcePage: 148 }, // Résister à la corruption
  { id: 'prestige-colosse-r4', tags: ['conditional'], conditionalKinds: ['condition'], sourcePage: 149 }, // Stature de géant
  { id: 'prestige-colosse-r5', tags: ['flat-bonus'], sourcePage: 149 }, // Résistance colossale
  { id: 'prestige-colosse-r6', tags: ['flat-bonus'], sourcePage: 149 }, // Force du titan
  { id: 'prestige-colosse-r7', tags: ['conditional'], conditionalKinds: ['condition'], sourcePage: 149 }, // Poigne de fer
  { id: 'prestige-colosse-r8', tags: ['conditional'], conditionalKinds: ['condition', 'temporary', 'scaling'], sourcePage: 149 }, // Attaque monumentale
  { id: 'prestige-danseur-de-guerre-r4', tags: ['choice', 'conditional'], conditionalKinds: ['condition'], sourcePage: 149 }, // Vent des lames
  { id: 'prestige-danseur-de-guerre-r5', tags: ['conditional'], conditionalKinds: ['scaling'], sourcePage: 149 }, // Pirouettes
  { id: 'prestige-danseur-de-guerre-r6', tags: ['conditional'], conditionalKinds: ['condition'], sourcePage: 149 }, // Attaque en mouvement
  { id: 'prestige-danseur-de-guerre-r7', tags: ['conditional'], conditionalKinds: ['temporary'], sourcePage: 149 }, // Danse des lames
  { id: 'prestige-danseur-de-guerre-r8', tags: ['conditional'], conditionalKinds: ['condition'], sourcePage: 149 }, // Volte-face
  { id: 'prestige-ecorcheur-r4', tags: ['flat-bonus', 'conditional'], conditionalKinds: ['condition', 'temporary', 'scaling'], sourcePage: 150 }, // Armes dentelées
  { id: 'prestige-ecorcheur-r5', tags: ['conditional'], conditionalKinds: ['condition', 'scaling'], sourcePage: 150 }, // Armure à pointes
  { id: 'prestige-ecorcheur-r6', tags: ['conditional'], conditionalKinds: ['condition'], sourcePage: 150 }, // Blessures affreuses
  { id: 'prestige-ecorcheur-r7', tags: ['conditional'], conditionalKinds: ['condition', 'temporary'], sourcePage: 150 }, // Hémorragie interne
  { id: 'prestige-ecorcheur-r8', tags: ['conditional'], conditionalKinds: ['condition'], sourcePage: 150 }, // Impitoyable
  { id: 'prestige-guerrier-mage-r4', tags: ['conditional'], conditionalKinds: ['condition', 'scaling'], sourcePage: 150 }, // Magie en armure
  { id: 'prestige-guerrier-mage-r5', tags: ['choice', 'conditional'], conditionalKinds: ['condition'], sourcePage: 150 }, // Rituel de combat
  { id: 'prestige-guerrier-mage-r6', tags: ['mana-cost', 'conditional'], conditionalKinds: ['condition', 'scaling'], sourcePage: 150 }, // Déflexion arcanique
  { id: 'prestige-guerrier-mage-r7', tags: ['conditional'], conditionalKinds: ['condition'], sourcePage: 150 }, // Magie de combat
  { id: 'prestige-guerrier-mage-r8', tags: ['mana-cost', 'conditional'], conditionalKinds: ['condition'], sourcePage: 150 }, // Frappe des arcanes
  { id: 'prestige-ours-r4', tags: ['flat-bonus', 'conditional'], conditionalKinds: ['condition', 'temporary', 'scaling'], sourcePage: 151 }, // Caractère d'ours
  { id: 'prestige-ours-r5', tags: ['conditional'], conditionalKinds: ['scaling'], sourcePage: 151 }, // Hibernation
  { id: 'prestige-ours-r6', tags: ['conditional'], conditionalKinds: ['condition', 'temporary'], sourcePage: 151 }, // Métamorphose
  { id: 'prestige-ours-r7', tags: ['conditional'], conditionalKinds: ['condition', 'temporary'], sourcePage: 152 }, // Étreinte de l'ours
  { id: 'prestige-ours-r8', tags: ['conditional'], conditionalKinds: ['temporary'], sourcePage: 152 }, // Métamorphose supérieure
  { id: 'prestige-porteur-de-bouclier-r4', tags: ['conditional'], conditionalKinds: ['condition', 'temporary'], sourcePage: 152 }, // Parade au bouclier
  { id: 'prestige-porteur-de-bouclier-r5', tags: ['conditional'], conditionalKinds: ['condition', 'temporary'], sourcePage: 152 }, // Attaque au bouclier
  { id: 'prestige-porteur-de-bouclier-r6', tags: ['conditional'], conditionalKinds: ['condition', 'scaling'], sourcePage: 152 }, // Bousculade
  { id: 'prestige-porteur-de-bouclier-r7', tags: ['conditional'], conditionalKinds: ['condition', 'temporary'], sourcePage: 152 }, // Dévier les coups
  { id: 'prestige-porteur-de-bouclier-r8', tags: ['conditional'], conditionalKinds: ['condition'], sourcePage: 152 }, // Lancer de bouclier
  { id: 'prestige-tueur-de-geants-r4', tags: ['conditional'], conditionalKinds: ['condition'], sourcePage: 152 }, // Profil bas
  { id: 'prestige-tueur-de-geants-r5', tags: ['conditional'], conditionalKinds: ['condition'], sourcePage: 152 }, // Ventre mou
  { id: 'prestige-tueur-de-geants-r6', tags: ['conditional'], conditionalKinds: ['condition', 'scaling'], sourcePage: 152 }, // Réduire la distance
  { id: 'prestige-tueur-de-geants-r7', tags: ['conditional'], conditionalKinds: ['condition', 'temporary'], sourcePage: 152 }, // Pieds d'argile
  { id: 'prestige-tueur-de-geants-r8', tags: ['conditional'], conditionalKinds: ['condition', 'scaling'], sourcePage: 152 }, // Tueur de géants
  { id: 'prestige-archimage-r4', tags: ['conditional'], conditionalKinds: ['condition', 'scaling'], sourcePage: 154 }, // Sceptre défensif
  { id: 'prestige-archimage-r5', tags: ['choice', 'conditional'], conditionalKinds: ['scaling'], sourcePage: 154 }, // Bâton magique
  { id: 'prestige-archimage-r6', tags: ['conditional'], conditionalKinds: ['condition', 'temporary', 'scaling'], sourcePage: 154 }, // Paralysie
  { id: 'prestige-archimage-r7', tags: ['conditional'], conditionalKinds: ['condition', 'temporary', 'scaling'], sourcePage: 154 }, // Barrière magique
  { id: 'prestige-archimage-r8', tags: ['choice', 'conditional'], conditionalKinds: ['condition', 'temporary'], sourcePage: 154 }, // Métamorphose d'autrui
  { id: 'prestige-chaos-r4', tags: ['conditional'], conditionalKinds: ['condition', 'temporary'], sourcePage: 155 }, // Arc-en-ciel
  { id: 'prestige-chaos-r5', tags: ['choice', 'conditional'], conditionalKinds: ['condition', 'temporary', 'scaling'], sourcePage: 155 }, // Mur arc-en-ciel
  { id: 'prestige-chaos-r6', tags: ['conditional'], conditionalKinds: ['condition', 'temporary', 'scaling'], sourcePage: 155 }, // Pont arc-en-ciel
  { id: 'prestige-chaos-r7', tags: ['conditional'], conditionalKinds: ['condition', 'temporary'], sourcePage: 155 }, // Explosion multicolore
  { id: 'prestige-chaos-r8', tags: ['conditional'], conditionalKinds: ['condition', 'temporary'], sourcePage: 155 }, // Sphère multicolore
  { id: 'prestige-cristaux-r4', tags: ['choice'], sourcePage: 156 }, // Premier cristal
  { id: 'prestige-cristaux-r5', tags: ['choice'], sourcePage: 156 }, // Second cristal
  { id: 'prestige-cristaux-r6', tags: ['choice'], sourcePage: 156 }, // Troisième cristal
  { id: 'prestige-cristaux-r7', tags: ['choice'], sourcePage: 156 }, // Quatrième cristal
  { id: 'prestige-cristaux-r8', tags: ['choice'], sourcePage: 156 }, // Cinquième cristal
  { id: 'prestige-elementaliste-r4', tags: ['choice', 'conditional'], conditionalKinds: ['condition'], sourcePage: 157 }, // Élément de prédilection
  { id: 'prestige-elementaliste-r5', tags: ['conditional'], conditionalKinds: ['condition'], sourcePage: 157 }, // Résistance élémentaire
  { id: 'prestige-elementaliste-r6', tags: ['choice', 'conditional'], conditionalKinds: ['condition', 'temporary'], sourcePage: 157 }, // Invocation d'élémentaire
  { id: 'prestige-elementaliste-r7', tags: ['conditional'], conditionalKinds: ['condition'], sourcePage: 157 }, // Élément puissant
  { id: 'prestige-elementaliste-r8', tags: ['choice', 'conditional', 'immunity'], conditionalKinds: ['condition', 'temporary'], sourcePage: 157 }, // Métamorphose élémentaire
  { id: 'prestige-enchanteur-r4', tags: ['pure-text'], sourcePage: 157 }, // Enchantement (niveau 1 — fabrication d'objets, hors stats)
  { id: 'prestige-enchanteur-r5', tags: ['pure-text'], sourcePage: 157 }, // Enchantement (niveau 2 — fabrication d'objets, hors stats)
  { id: 'prestige-enchanteur-r6', tags: ['pure-text'], sourcePage: 157 }, // Enchantement (niveau 3 — fabrication d'objets, hors stats)
  { id: 'prestige-enchanteur-r7', tags: ['pure-text'], sourcePage: 157 }, // Enchantement (niveau 4 — fabrication d'objets, hors stats)
  { id: 'prestige-enchanteur-r8', tags: ['pure-text'], sourcePage: 157 }, // Enchantement (niveau 5 — fabrication d'objets, hors stats)
  { id: 'prestige-gel-r4', tags: ['conditional'], conditionalKinds: ['condition', 'temporary'], sourcePage: 157 }, // Verglas
  { id: 'prestige-gel-r5', tags: ['immunity'], sourcePage: 157 }, // Cœur de glace
  { id: 'prestige-gel-r6', tags: ['conditional'], conditionalKinds: ['condition'], sourcePage: 157 }, // Souffle glacial
  { id: 'prestige-gel-r7', tags: ['conditional', 'immunity'], conditionalKinds: ['temporary'], sourcePage: 157 }, // Présence glaciale
  { id: 'prestige-gel-r8', tags: ['conditional'], conditionalKinds: ['condition', 'temporary', 'scaling'], sourcePage: 157 }, // Cryogénisation
  { id: 'prestige-invocation-majeure-r4', tags: ['conditional'], conditionalKinds: ['temporary', 'scaling'], sourcePage: 158 }, // Monture fantôme
  { id: 'prestige-invocation-majeure-r5', tags: ['choice', 'conditional'], conditionalKinds: ['temporary', 'scaling'], sourcePage: 158 }, // Manoir d'outre-monde
  { id: 'prestige-invocation-majeure-r6', tags: ['conditional'], conditionalKinds: ['temporary', 'scaling'], sourcePage: 159 }, // Navire fantôme
  { id: 'prestige-invocation-majeure-r7', tags: ['conditional'], conditionalKinds: ['temporary'], sourcePage: 159 }, // Chasseur ailé
  { id: 'prestige-invocation-majeure-r8', tags: ['conditional'], conditionalKinds: ['temporary', 'scaling'], sourcePage: 159 }, // Portail magique
  { id: 'prestige-mage-de-guerre-r4', tags: ['choice', 'mana-cost', 'conditional'], conditionalKinds: ['condition', 'temporary'], sourcePage: 160 }, // Coup au but
  { id: 'prestige-mage-de-guerre-r5', tags: ['conditional'], conditionalKinds: ['condition', 'temporary', 'scaling'], sourcePage: 160 }, // Explosion différée
  { id: 'prestige-mage-de-guerre-r6', tags: ['conditional'], conditionalKinds: ['temporary', 'scaling'], sourcePage: 160 }, // Aura du chef de guerre
  { id: 'prestige-mage-de-guerre-r7', tags: ['mana-cost', 'conditional'], conditionalKinds: ['condition'], sourcePage: 160 }, // Épargner les alliés
  { id: 'prestige-mage-de-guerre-r8', tags: ['conditional'], conditionalKinds: ['condition', 'scaling'], sourcePage: 160 }, // Vague de feu
  { id: 'prestige-magie-de-l-esprit-r4', tags: ['flat-bonus', 'conditional', 'immunity'], conditionalKinds: ['condition', 'temporary'], sourcePage: 161 }, // Esprit impénétrable
  { id: 'prestige-magie-de-l-esprit-r5', tags: ['conditional'], conditionalKinds: ['condition', 'temporary', 'scaling'], sourcePage: 161 }, // Lire les pensées
  { id: 'prestige-magie-de-l-esprit-r6', tags: ['conditional'], conditionalKinds: ['condition', 'temporary'], sourcePage: 161 }, // Prison mentale
  { id: 'prestige-magie-de-l-esprit-r7', tags: ['conditional'], conditionalKinds: ['condition', 'temporary', 'scaling'], sourcePage: 161 }, // Attaque mentale
  { id: 'prestige-magie-de-l-esprit-r8', tags: ['conditional'], conditionalKinds: ['condition', 'temporary'], sourcePage: 161 }, // Contrôle mental
  { id: 'prestige-magie-des-mots-r4', tags: ['conditional'], conditionalKinds: ['condition', 'temporary', 'scaling'], sourcePage: 162 }, // Chant fascinant
  { id: 'prestige-magie-des-mots-r5', tags: ['pure-text'], sourcePage: 162 }, // Poids des mots
  { id: 'prestige-magie-des-mots-r6', tags: ['conditional'], conditionalKinds: ['condition', 'temporary'], sourcePage: 162 }, // Cri de la banshee
  { id: 'prestige-magie-des-mots-r7', tags: ['conditional'], conditionalKinds: ['condition', 'temporary'], sourcePage: 162 }, // Mot de mana
  { id: 'prestige-magie-des-mots-r8', tags: ['choice', 'conditional'], conditionalKinds: ['temporary', 'scaling'], sourcePage: 162 }, // Souhait
  { id: 'prestige-magie-du-temps-r4', tags: ['conditional'], conditionalKinds: ['condition'], sourcePage: 163 }, // Fuite en avant
  { id: 'prestige-magie-du-temps-r5', tags: ['conditional'], conditionalKinds: ['condition', 'temporary'], sourcePage: 163 }, // Lenteur
  { id: 'prestige-magie-du-temps-r6', tags: ['conditional'], conditionalKinds: ['condition', 'temporary'], sourcePage: 163 }, // Décalage
  { id: 'prestige-magie-du-temps-r7', tags: ['conditional'], conditionalKinds: ['condition', 'temporary'], sourcePage: 163 }, // Enkystement lointain
  { id: 'prestige-magie-du-temps-r8', tags: ['conditional'], conditionalKinds: ['temporary', 'scaling'], sourcePage: 163 }, // Arrêt du temps
  { id: 'prestige-maitre-des-sorts-r4', tags: ['choice'], sourcePage: 164 }, // Connaissance des arcanes inférieures
  { id: 'prestige-maitre-des-sorts-r5', tags: ['choice'], sourcePage: 164 }, // Connaissance des arcanes mineures
  { id: 'prestige-maitre-des-sorts-r6', tags: ['choice'], sourcePage: 164 }, // Connaissance des arcanes supérieures
  { id: 'prestige-maitre-des-sorts-r7', tags: ['choice'], sourcePage: 164 }, // Connaissance des arcanes majeures
  { id: 'prestige-maitre-des-sorts-r8', tags: ['choice'], sourcePage: 164 }, // Connaissance des arcanes suprêmes
  { id: 'prestige-vision-r4', tags: ['conditional'], conditionalKinds: ['condition', 'temporary'], sourcePage: 165 }, // Cécité
  { id: 'prestige-vision-r5', tags: ['conditional'], conditionalKinds: ['temporary'], sourcePage: 165 }, // Œil magique
  { id: 'prestige-vision-r6', tags: ['conditional'], conditionalKinds: ['condition', 'temporary', 'scaling'], sourcePage: 165 }, // Motif hypnotique
  { id: 'prestige-vision-r7', tags: ['conditional'], conditionalKinds: ['condition', 'temporary'], sourcePage: 165 }, // Vision de la vérité
  { id: 'prestige-vision-r8', tags: ['choice', 'conditional'], conditionalKinds: ['temporary', 'scaling'], sourcePage: 165 }, // Invisibilité supérieure
  { id: 'prestige-armure-sacree-r4', tags: ['conditional'], conditionalKinds: ['condition'], sourcePage: 166 }, // Armure de bronze
  { id: 'prestige-armure-sacree-r5', tags: ['choice', 'conditional'], conditionalKinds: ['temporary'], sourcePage: 166 }, // Pouvoir unique
  { id: 'prestige-armure-sacree-r6', tags: ['conditional'], conditionalKinds: ['condition'], sourcePage: 166 }, // Armure d'argent
  { id: 'prestige-armure-sacree-r7', tags: ['choice', 'conditional'], conditionalKinds: ['temporary'], sourcePage: 166 }, // Pouvoir puissant
  { id: 'prestige-armure-sacree-r8', tags: ['conditional'], conditionalKinds: ['condition'], sourcePage: 166 }, // Armure d'or
  { id: 'prestige-elementaire-du-feu-r4', tags: ['conditional'], conditionalKinds: ['condition', 'temporary'], sourcePage: 166 }, // Mur de feu
  { id: 'prestige-elementaire-du-feu-r5', tags: ['conditional'], conditionalKinds: ['condition'], sourcePage: 166 }, // Tornade de feu
  { id: 'prestige-elementaire-du-feu-r6', tags: ['immunity'], sourcePage: 166 }, // Insensible au feu
  { id: 'prestige-elementaire-du-feu-r7', tags: ['conditional', 'immunity'], conditionalKinds: ['condition', 'temporary'], sourcePage: 166 }, // Immolation
  { id: 'prestige-elementaire-du-feu-r8', tags: ['conditional', 'immunity'], conditionalKinds: ['temporary'], sourcePage: 166 }, // Forme élémentaire de feu
  { id: 'prestige-elementaire-de-la-terre-r4', tags: ['conditional'], conditionalKinds: ['temporary'], sourcePage: 167 }, // Mur de pierre
  { id: 'prestige-elementaire-de-la-terre-r5', tags: ['conditional'], conditionalKinds: ['temporary', 'scaling'], sourcePage: 167 }, // Litomorphose
  { id: 'prestige-elementaire-de-la-terre-r6', tags: ['conditional'], conditionalKinds: ['condition'], sourcePage: 167 }, // Pétrification
  { id: 'prestige-elementaire-de-la-terre-r7', tags: ['conditional'], conditionalKinds: ['condition'], sourcePage: 167 }, // Séisme
  { id: 'prestige-elementaire-de-la-terre-r8', tags: ['conditional'], conditionalKinds: ['condition', 'temporary'], sourcePage: 167 }, // Forme élémentaire de terre
  { id: 'prestige-elementaire-de-l-air-r4', tags: ['conditional'], conditionalKinds: ['condition', 'scaling'], sourcePage: 168 }, // Bourrasque
  { id: 'prestige-elementaire-de-l-air-r5', tags: ['conditional'], conditionalKinds: ['condition', 'scaling'], sourcePage: 168 }, // Chevaucher les nuées
  { id: 'prestige-elementaire-de-l-air-r6', tags: ['choice', 'conditional'], conditionalKinds: ['condition', 'temporary', 'scaling'], sourcePage: 168 }, // Mur de vent
  { id: 'prestige-elementaire-de-l-air-r7', tags: ['conditional'], conditionalKinds: ['condition', 'temporary'], sourcePage: 168 }, // Cyclone
  { id: 'prestige-elementaire-de-l-air-r8', tags: ['conditional', 'immunity'], conditionalKinds: ['condition', 'temporary'], sourcePage: 168 }, // Forme élémentaire d'air
  { id: 'prestige-elementaire-de-l-eau-r4', tags: ['conditional'], conditionalKinds: ['temporary'], sourcePage: 169 }, // Brouillard
  { id: 'prestige-elementaire-de-l-eau-r5', tags: ['conditional'], conditionalKinds: ['condition', 'temporary'], sourcePage: 169 }, // Mur acide
  { id: 'prestige-elementaire-de-l-eau-r6', tags: ['conditional'], conditionalKinds: ['temporary'], sourcePage: 169 }, // Armure d'eau
  { id: 'prestige-elementaire-de-l-eau-r7', tags: ['conditional'], conditionalKinds: ['temporary'], sourcePage: 169 }, // Écartement des eaux
  { id: 'prestige-elementaire-de-l-eau-r8', tags: ['conditional', 'immunity'], conditionalKinds: ['condition', 'temporary'], sourcePage: 169 }, // Forme élémentaire d'eau
  { id: 'prestige-changeforme-r4', tags: ['choice', 'conditional'], conditionalKinds: ['temporary', 'scaling'], sourcePage: 170 }, // Forme de voyage
  { id: 'prestige-changeforme-r5', tags: ['choice', 'conditional'], conditionalKinds: ['condition', 'temporary'], sourcePage: 170 }, // Transformation en animal
  { id: 'prestige-changeforme-r6', tags: ['conditional'], conditionalKinds: ['condition'], sourcePage: 170 }, // Transformation puissante
  { id: 'prestige-changeforme-r7', tags: ['mana-cost', 'conditional'], conditionalKinds: ['condition', 'scaling'], sourcePage: 170 }, // Grande forme animale
  { id: 'prestige-changeforme-r8', tags: ['mana-cost', 'conditional'], conditionalKinds: ['condition'], sourcePage: 170 }, // Forme animale énorme
  { id: 'prestige-combat-mystique-r4', tags: ['conditional'], conditionalKinds: ['condition', 'temporary'], sourcePage: 170 }, // Attaque étourdissante
  { id: 'prestige-combat-mystique-r5', tags: ['conditional'], conditionalKinds: ['temporary'], sourcePage: 170 }, // Frappe concentrée
  { id: 'prestige-combat-mystique-r6', tags: ['conditional'], conditionalKinds: ['condition', 'temporary', 'scaling'], sourcePage: 170 }, // Pression nerveuse
  { id: 'prestige-combat-mystique-r7', tags: ['conditional'], conditionalKinds: ['condition', 'temporary'], sourcePage: 170 }, // Paume mortelle
  { id: 'prestige-combat-mystique-r8', tags: ['conditional'], conditionalKinds: ['condition', 'temporary'], sourcePage: 170 }, // Main du tout puissant
  { id: 'prestige-guerisseur-r4', tags: ['conditional'], conditionalKinds: ['condition', 'temporary'], sourcePage: 171 }, // Premiers soins
  { id: 'prestige-guerisseur-r5', tags: ['conditional'], sourcePage: 171 }, // Soins rapides
  { id: 'prestige-guerisseur-r6', tags: ['conditional'], conditionalKinds: ['condition', 'temporary'], sourcePage: 171 }, // Rappel à la vie
  { id: 'prestige-guerisseur-r7', tags: ['conditional'], conditionalKinds: ['temporary'], sourcePage: 171 }, // Zone de vie
  { id: 'prestige-guerisseur-r8', tags: ['conditional'], conditionalKinds: ['condition', 'temporary'], sourcePage: 171 }, // Résurrection
  { id: 'prestige-maitre-de-la-nature-r4', tags: ['conditional'], conditionalKinds: ['condition', 'temporary', 'scaling'], sourcePage: 172 }, // Amitié animale
  { id: 'prestige-maitre-de-la-nature-r5', tags: ['choice', 'conditional'], conditionalKinds: ['condition', 'scaling'], sourcePage: 172 }, // Seigneur de la nature
  { id: 'prestige-maitre-de-la-nature-r6', tags: ['conditional'], conditionalKinds: ['condition'], sourcePage: 172 }, // Invisibilité aux animaux
  { id: 'prestige-maitre-de-la-nature-r7', tags: ['choice', 'conditional'], conditionalKinds: ['condition', 'scaling'], sourcePage: 172 }, // Monture géante
  { id: 'prestige-maitre-de-la-nature-r8', tags: ['choice', 'conditional'], conditionalKinds: ['condition', 'temporary'], sourcePage: 172 }, // Magie druidique innée
  { id: 'prestige-saisons-r4', tags: ['flat-bonus', 'conditional'], conditionalKinds: ['condition'], sourcePage: 173 }, // Vigueur du printemps
  { id: 'prestige-saisons-r5', tags: ['conditional'], conditionalKinds: ['condition'], sourcePage: 173 }, // Flamme de l'été
  { id: 'prestige-saisons-r6', tags: ['conditional'], conditionalKinds: ['temporary', 'scaling'], sourcePage: 173 }, // Tourbillon d'automne
  { id: 'prestige-saisons-r7', tags: ['conditional'], conditionalKinds: ['condition', 'temporary'], sourcePage: 173 }, // Frimas de l'hiver
  { id: 'prestige-saisons-r8', tags: ['conditional'], conditionalKinds: ['temporary', 'scaling'], sourcePage: 173 }, // Contrôle climatique
  { id: 'prestige-templier-r4', tags: ['flat-bonus', 'conditional', 'immunity'], conditionalKinds: ['condition', 'temporary'], sourcePage: 174 }, // Résistance au mal
  { id: 'prestige-templier-r5', tags: ['conditional'], conditionalKinds: ['condition', 'temporary', 'scaling'], sourcePage: 174 }, // Quête
  { id: 'prestige-templier-r6', tags: ['flat-bonus', 'conditional', 'immunity'], conditionalKinds: ['condition'], sourcePage: 174 }, // Résistance au mal supérieure
  { id: 'prestige-templier-r7', tags: ['conditional'], conditionalKinds: ['condition'], sourcePage: 174 }, // Châtiment du mal
  { id: 'prestige-templier-r8', tags: ['conditional'], conditionalKinds: ['temporary'], sourcePage: 174 }, // Forme d'Ange
  { id: 'prestige-vermines-r4', tags: ['pure-text'], sourcePage: 175 }, // Maître vermine
  { id: 'prestige-vermines-r5', tags: ['conditional'], conditionalKinds: ['condition', 'temporary'], sourcePage: 175 }, // Nuées de criquets
  { id: 'prestige-vermines-r6', tags: ['choice', 'conditional'], conditionalKinds: ['scaling'], sourcePage: 175 }, // Compagnon vermine
  { id: 'prestige-vermines-r7', tags: ['conditional'], conditionalKinds: ['condition', 'temporary'], sourcePage: 175 }, // Affinité au poison
  { id: 'prestige-vermines-r8', tags: ['choice', 'conditional'], conditionalKinds: ['condition', 'scaling'], sourcePage: 175 }, // Vermine supérieure

];
