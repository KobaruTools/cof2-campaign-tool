/**
 * Catalogue des DOMAINES DE COMPÉTENCE (PER-89).
 *
 * CO2 ne définit PAS de liste fermée de compétences : les tests se font sur les 7
 * caractéristiques, et le livre ne donne que des EXEMPLES de domaines (p. 202,
 * regroupés par caractéristique gouvernante), en autorisant explicitement le MJ à
 * en inventer (`humain-r1`, p. 57 : « le MJ peut en inventer d'autres »).
 *
 * Ce catalogue est donc une liste OUVERTE et VIVANTE :
 *  - les EXEMPLES du livre (p. 202) servent d'épine dorsale et de suggestions ;
 *  - chaque domaine NOMMÉ dans une capacité y est enregistré (référencé par
 *    `TestBonusEffect.domains` et `FeatureChoiceOption.testBonusDomains`) ;
 *  - il s'enrichit famille par famille (graine ici : exemples p. 202 + mages).
 *
 * Convention (CLAUDE.md) : `id` = slug ANGLAIS (clé de contenu), `label` = FRANÇAIS,
 * `abilities` = caractéristique(s) gouvernante(s) (test = d20 + carac + bonus de
 * compétence). PLUSIEURS caracs = au choix selon la situation (ex. équitation, p. 233) :
 * le modificateur affiché retient la meilleure.
 *
 * ⚠️ POINT DE VALIDATION PROPRIÉTAIRE : la carac gouvernante de plusieurs domaines
 * n'est pas donnée par le livre (le métier/gagne-pain n'est pas classé). Ces cas sont
 * marqués `TODO(extraction)` ci-dessous — à confirmer avant câblage des effets.
 */
import type { TestDomain } from './schema';

export const testDomains: TestDomain[] = [
  // --- AGI — exemples p. 202 -------------------------------------------------
  { id: 'acrobatics', label: 'Acrobaties', abilities: ['AGI'], sourcePage: 202 },
  { id: 'lockpicking', label: 'Crochetage', abilities: ['AGI'], sourcePage: 202 },
  { id: 'stealth', label: 'Discrétion', abilities: ['AGI'], sourcePage: 202 },
  { id: 'climbing', label: 'Escalade', abilities: ['AGI'], sourcePage: 202 },
  // course (sprint) et saut : groupés avec l'escalade (AGI) par les voies du fauve
  // (p. 115) et du vent (p. 121) — à distinguer de `long-running` (course longue, CON).
  { id: 'running', label: 'Course', abilities: ['AGI'], sourcePage: 115 },
  { id: 'jumping', label: 'Saut', abilities: ['AGI'], sourcePage: 115 },
  // esquive (Réflexes éclair, barbare pourfendeur-r1, p. 81) : « tests d'AGI destinés à
  // esquiver » (explosions de feu, souffles, pièges…) → réaction d'évitement, AGI.
  { id: 'evasion', label: 'Esquive', abilities: ['AGI'], sourcePage: 81 },
  // --- AGI — adresse / précision manuelle du voleur (PER-71) -----------------
  // pickpocket (Doigts agiles, roublard-r1, p. 76) : adresse des doigts → AGI.
  { id: 'pickpocketing', label: 'Vol à la tire', abilities: ['AGI'], sourcePage: 76 },
  // désamorçage de pièges (Doigts agiles, roublard-r1, p. 76 ; aussi artilleur-r1
  // « désamorcer des pièges mécaniques », p. 62) : précision manuelle → AGI. À
  // distinguer de la DÉTECTION du piège (`trap-detection`, PER, roublard-r2).
  { id: 'disarm-traps', label: 'Désamorçage de pièges', abilities: ['AGI'], sourcePage: 76 },
  // cacher une arme sur soi (Discrétion, assassin-r1, p. 74) : escamotage → AGI.
  // TODO(extraction) : domaine à part entière ou application de la discrétion ? À valider.
  { id: 'concealment', label: "Dissimulation d'objet", abilities: ['AGI'], sourcePage: 74 },

  // --- FOR — exemples p. 202 -------------------------------------------------
  { id: 'breaking', label: 'Briser', abilities: ['FOR'], sourcePage: 202 },
  { id: 'intimidation', label: 'Intimidation', abilities: ['FOR'], sourcePage: 202 },
  { id: 'lifting', label: 'Soulever', abilities: ['FOR'], sourcePage: 202 },
  // forge (forgesort « orfèvrerie ou forge ») : travail du métal.
  // TODO(extraction) : FOR (effort physique) ou INT (artisanat / thème forgesort) ?
  { id: 'smithing', label: 'Forge', abilities: ['FOR'], sourcePage: 99 },

  // --- CON — exemples p. 202 + résistances (humain-r1) + équitation (p. 233) --
  { id: 'long-running', label: 'Course longue', abilities: ['CON'], sourcePage: 202 },
  { id: 'swimming', label: 'Natation', abilities: ['CON'], sourcePage: 202 },
  { id: 'endurance', label: 'Résistance', abilities: ['CON'], sourcePage: 202 },
  { id: 'cold-resistance', label: 'Résistance au froid', abilities: ['CON'], sourcePage: 57 },
  { id: 'heat-resistance', label: 'Résistance à la chaleur', abilities: ['CON'], sourcePage: 57 },
  { id: 'disease-resistance', label: 'Résistance aux maladies', abilities: ['CON'], sourcePage: 57 },
  // poison : pendant de disease-resistance (Vigueur divine, prêtre, soins-r2, p. 124).
  { id: 'poison-resistance', label: 'Résistance aux poisons', abilities: ['CON'], sourcePage: 124 },
  // équitation : le livre teste l'Équitation sur DEUX caracs selon l'action — CON pour
  // l'endurance, CHA pour mener la monture (Marche forcée, p. 233). Meilleure des deux.
  { id: 'riding', label: 'Équitation', abilities: ['CON', 'CHA'], sourcePage: 233 },

  // --- PER — exemples p. 202 + survie (humain-r1) ----------------------------
  { id: 'senses', label: 'Sens', abilities: ['PER'], sourcePage: 202 },
  { id: 'intuition', label: 'Intuition', abilities: ['PER'], sourcePage: 202 },
  { id: 'empathy', label: 'Empathie', abilities: ['PER'], sourcePage: 202 },
  { id: 'tracking', label: 'Pister', abilities: ['PER'], sourcePage: 202 },
  { id: 'clue-finding', label: "Recherche d'indices", abilities: ['PER'], sourcePage: 202 },
  // chasser (humain-r1 « Sauvage ») : proche de pister / survie.
  // TODO(extraction) : PER (pistage / affût) ou AGI ?
  { id: 'hunting', label: 'Chasser', abilities: ['PER'], sourcePage: 57 },
  // orientation (humain-r1 « Nomade ») : se repérer.
  // TODO(extraction) : PER (lecture du terrain) ou INT (cartographie / astres) ?
  { id: 'orientation', label: 'Orientation', abilities: ['PER'], sourcePage: 57 },
  // météorologie (humain-r1 « Campagnard ») : lire le temps.
  // TODO(extraction) : PER (observation du ciel) ou INT (savoir) ?
  { id: 'meteorology', label: 'Météorologie', abilities: ['PER'], sourcePage: 57 },
  // survie (druide, Maître de la survie, nature-r1, p. 116) : s'orienter, trouver
  // abri/nourriture, éviter les dangers → lecture du milieu, PER (comme orientation).
  { id: 'survival', label: 'Survie', abilities: ['PER'], sourcePage: 116 },
  // --- PER — observation / fouille du voleur (PER-71) ------------------------
  // vigilance (Aux aguets, roublard-r2, p. 76 ; aussi Éclaireur, traqueur-r1, p. 72) :
  // éviter la surprise / repérer une embuscade — le livre nomme « Vigilance ».
  { id: 'vigilance', label: 'Vigilance', abilities: ['PER'], sourcePage: 76 },
  // fouille (Aux aguets, roublard-r2, p. 76) : fouiller une pièce, trouver un passage
  // secret → observation méthodique, PER. À distinguer de `clue-finding` (enquête).
  { id: 'searching', label: 'Fouille', abilities: ['PER'], sourcePage: 76 },
  // détection de pièges (Aux aguets, roublard-r2, p. 76) : repérer un piège (même
  // magique) → PER. Le DÉSAMORÇAGE est manuel (`disarm-traps`, AGI, roublard-r1).
  { id: 'trap-detection', label: 'Détection de pièges', abilities: ['PER'], sourcePage: 76 },

  // --- INT — exemples p. 202 + savoirs/artisanats (mages) --------------------
  { id: 'knowledge', label: 'Connaissances', abilities: ['INT'], sourcePage: 202 },
  { id: 'logic', label: 'Logique', abilities: ['INT'], sourcePage: 202 },
  { id: 'medicine', label: 'Médecine', abilities: ['INT'], sourcePage: 202 },
  // forgesort « bricolage ou science » (texte explicite : « un peu de réflexion »,
  // test d'INT au lieu de FOR) → INT assuré. Absorbe l'ancien domaine « mécanismes » de
  // l'arquebusier (Mécanismes, artilleur-r1, p. 62) : réparer/comprendre des mécanismes et
  // manipuler des armes de siège relèvent du même savoir-faire (INT) → fusionnés ici (PER-71),
  // d'où la `description` ci-dessous (info-bulle de périmètre).
  {
    id: 'tinkering',
    label: 'Bricolage',
    abilities: ['INT'],
    sourcePage: 99,
    description:
      'Bricoler, réparer ou comprendre des mécanismes (y compris manipuler des armes de siège). Le désamorçage manuel d’un piège relève de la Dextérité (Désamorçage de pièges).',
  },
  { id: 'science', label: 'Science', abilities: ['INT'], sourcePage: 99 },
  // forgesort « alchimie ou chimie » (étude des potions) → INT.
  { id: 'alchemy', label: 'Alchimie', abilities: ['INT'], sourcePage: 98 },
  { id: 'chemistry', label: 'Chimie', abilities: ['INT'], sourcePage: 98 },
  // sorcier « tests d'INT basés sur les savoirs sombres » (texte explicite) → INT.
  { id: 'occult-lore', label: 'Érudition occulte', abilities: ['INT'], sourcePage: 110 },
  // navigation (humain-r1 « Riverain ») : conduite d'embarcation / cap.
  // TODO(extraction) : INT (cartes / astres) ou PER (lecture du courant) ?
  { id: 'navigation', label: 'Navigation', abilities: ['INT'], sourcePage: 57 },
  // orfèvrerie (forgesort « orfèvrerie ou forge ») : artisanat de précision.
  // TODO(extraction) : INT (artisanat) ou FOR ? (cf. `smithing`)
  { id: 'goldsmithing', label: 'Orfèvrerie', abilities: ['INT'], sourcePage: 99 },
  // herboristerie (druide, Peau d'écorce, vegetaux-r1, p. 117) : identifier les
  // plantes et connaître leurs propriétés → savoir, INT.
  { id: 'herbalism', label: 'Herboristerie', abilities: ['INT'], sourcePage: 117 },
  // savoirs religieux (prêtre, Bénédiction, priere-r1, p. 124) → INT.
  { id: 'theology', label: 'Théologie', abilities: ['INT'], sourcePage: 124 },
  { id: 'cosmology', label: 'Cosmologie', abilities: ['INT'], sourcePage: 124 },
  // premiers soins (prêtre, Récupération mineure, soins-r1, p. 124) : groupés avec
  // la médecine (INT) par le livre.
  { id: 'first-aid', label: 'Premiers soins', abilities: ['INT'], sourcePage: 124 },
  // estimation (Doigts agiles, roublard-r1, p. 76) : évaluer un objet précieux
  // (joyaux, bijoux) → connaissance de la valeur, INT.
  { id: 'appraisal', label: 'Estimation', abilities: ['INT'], sourcePage: 76 },
  // --- INT — pyrotechnie de l'arquebusier (PER-71) ---------------------------
  // pyrotechnie (Tir de grenaille, explosifs-r1, p. 63) : « tests d'artificier » (fabriquer
  // et tirer des feux d'artifice) → savoir-faire de l'artificier, INT. (Le savoir mécanique de
  // l'arquebusier — Mécanismes, artilleur-r1 — est fusionné dans `tinkering`, voir plus haut.)
  { id: 'pyrotechnics', label: 'Pyrotechnie', abilities: ['INT'], sourcePage: 63 },
  // --- INT — savoirs nobiliaires & art militaire du chevalier (PER-72) -------
  // histoire / héraldique / géographie (Éduqué, chevalier noblesse-r1, p. 86) :
  // savoirs encyclopédiques → INT (groupe « connaissances », p. 202).
  { id: 'history', label: 'Histoire', abilities: ['INT'], sourcePage: 86 },
  { id: 'heraldry', label: 'Héraldique', abilities: ['INT'], sourcePage: 86 },
  { id: 'geography', label: 'Géographie', abilities: ['INT'], sourcePage: 86 },
  // stratégie / tactique militaire (Sans peur, chevalier meneur-d-hommes-r1, p. 85) :
  // science de la conduite des armées → INT (raisonnement). Le COMMANDEMENT effectif
  // d'une troupe est un domaine social distinct (`command`, CHA).
  { id: 'military-tactics', label: 'Tactique militaire', abilities: ['INT'], sourcePage: 85 },

  // --- CHA — exemples p. 202 + social (mages) --------------------------------
  { id: 'art', label: 'Art', abilities: ['CHA'], sourcePage: 202 },
  { id: 'fast-talk', label: 'Baratin', abilities: ['CHA'], sourcePage: 202 },
  { id: 'seduction', label: 'Séduction', abilities: ['CHA'], sourcePage: 202 },
  // ensorceleur « persuasion ou séduction » (Injonction, p. 94).
  { id: 'persuasion', label: 'Persuasion', abilities: ['CHA'], sourcePage: 94 },
  // négociation (Argument de taille, barbare brute-r1, p. 79) : marchander un accord —
  // proche de persuasion, conservé comme domaine distinct (décision propriétaire, PER-123).
  { id: 'negotiation', label: 'Négociation', abilities: ['CHA'], sourcePage: 79 },
  // ensorceleur « supercherie » (illusion, p. 95) : tromperie sociale → CHA.
  { id: 'deception', label: 'Supercherie', abilities: ['CHA'], sourcePage: 95 },
  // commerce (humain-r1 « Citadin ») : marchandage.
  // TODO(extraction) : CHA (négoce / baratin) ou INT (calcul) ?
  { id: 'commerce', label: 'Commerce', abilities: ['CHA'], sourcePage: 57 },
  // influence animale (druide, Langage des animaux, animaux-r1, p. 114) : influencer
  // un animal avec lequel le druide peut communiquer → ascendant social, CHA.
  { id: 'animal-handling', label: 'Influence animale', abilities: ['CHA'], sourcePage: 114 },
  // prêche (prêtre, Prédicateur, foi-r1, p. 122) : convertir un auditoire → CHA.
  { id: 'preaching', label: 'Prêche', abilities: ['CHA'], sourcePage: 122 },
  // déguisement (Discrétion, assassin-r1, p. 74) : se faire passer pour un autre —
  // compétence MONDAINE, distincte du sort Déguisement du barde (vagabond-r5, p. 69).
  // TODO(extraction) : CHA (jeu de rôle / imposture) ou AGI (maquillage, costume) ? À valider.
  { id: 'disguise', label: 'Déguisement', abilities: ['CHA'], sourcePage: 74 },
  // --- CHA — arts de la scène du barde (PER-71) ------------------------------
  // Domaines de spectacle nommés par les voies du barde. Tous gouvernés par le CHA
  // (prestation devant un public). À distinguer du domaine générique `art` (p. 202).
  // musique : « jouer d'un instrument de musique ou chanter » (Chant des héros,
  // musicien-r1, p. 67) — le chant est inclus dans la prestation musicale.
  { id: 'music', label: 'Musique', abilities: ['CHA'], sourcePage: 67 },
  // danse / mime / jonglerie (Grâce féline, saltimbanque-r2, p. 68).
  { id: 'dance', label: 'Danse', abilities: ['CHA'], sourcePage: 68 },
  { id: 'mime', label: 'Mime', abilities: ['CHA'], sourcePage: 68 },
  { id: 'juggling', label: 'Jonglerie', abilities: ['CHA'], sourcePage: 68 },
  // --- CHA — autorité & maintien du chevalier (PER-72) -----------------------
  // commandement : « commander une troupe » (Sans peur, meneur-d-hommes-r1, p. 85) et
  // « donner des ordres » (Autorité naturelle, noblesse-r3, p. 86) → ascendant sur des
  // subordonnés, CHA. Distinct de la TACTIQUE militaire (`military-tactics`, INT).
  { id: 'command', label: 'Commandement', abilities: ['CHA'], sourcePage: 85 },
  // harangue : « haranguer et convaincre les foules » (Ignorer la douleur, preux-r1, p. 85) →
  // entraîner un large auditoire, CHA. Proche du prêche (`preaching`) mais profane.
  { id: 'haranguing', label: 'Harangue', abilities: ['CHA'], sourcePage: 85 },
  // étiquette : « se comporter dans la haute société » (Éduqué, noblesse-r1, p. 86) →
  // manières mondaines, CHA.
  { id: 'etiquette', label: 'Étiquette', abilities: ['CHA'], sourcePage: 86 },
  // dressage : « tests d'équitation et de dressage » (Fidèle monture, cavalier-r1, p. 83) →
  // éduquer/maîtriser un animal. TODO(extraction) : CHA (ascendant, comme l'influence
  // animale et le volet CHA de l'équitation) ou PER (patience / lecture de l'animal) ?
  { id: 'animal-training', label: 'Dressage', abilities: ['CHA'], sourcePage: 83 },

  // --- VOL — exemples p. 202 -------------------------------------------------
  { id: 'pushing-limits', label: 'Se dépasser', abilities: ['VOL'], sourcePage: 202 },
  { id: 'fear-resistance', label: 'Résister à la peur', abilities: ['VOL'], sourcePage: 202 },
  { id: 'temptation-resistance', label: 'Résister à la tentation', abilities: ['VOL'], sourcePage: 202 },
];

/** Index de lookup par id (clé de contenu → domaine). */
export const testDomainById = new Map<string, TestDomain>(testDomains.map((d) => [d.id, d]));
