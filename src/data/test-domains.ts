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

  // --- INT — exemples p. 202 + savoirs/artisanats (mages) --------------------
  { id: 'knowledge', label: 'Connaissances', abilities: ['INT'], sourcePage: 202 },
  { id: 'logic', label: 'Logique', abilities: ['INT'], sourcePage: 202 },
  { id: 'medicine', label: 'Médecine', abilities: ['INT'], sourcePage: 202 },
  // forgesort « bricolage ou science » (texte explicite : « un peu de réflexion »,
  // test d'INT au lieu de FOR) → INT assuré.
  { id: 'tinkering', label: 'Bricolage', abilities: ['INT'], sourcePage: 99 },
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

  // --- CHA — exemples p. 202 + social (mages) --------------------------------
  { id: 'art', label: 'Art', abilities: ['CHA'], sourcePage: 202 },
  { id: 'fast-talk', label: 'Baratin', abilities: ['CHA'], sourcePage: 202 },
  { id: 'seduction', label: 'Séduction', abilities: ['CHA'], sourcePage: 202 },
  // ensorceleur « persuasion ou séduction » (Injonction, p. 94).
  { id: 'persuasion', label: 'Persuasion', abilities: ['CHA'], sourcePage: 94 },
  // ensorceleur « supercherie » (illusion, p. 95) : tromperie sociale → CHA.
  { id: 'deception', label: 'Supercherie', abilities: ['CHA'], sourcePage: 95 },
  // commerce (humain-r1 « Citadin ») : marchandage.
  // TODO(extraction) : CHA (négoce / baratin) ou INT (calcul) ?
  { id: 'commerce', label: 'Commerce', abilities: ['CHA'], sourcePage: 57 },

  // --- VOL — exemples p. 202 -------------------------------------------------
  { id: 'pushing-limits', label: 'Se dépasser', abilities: ['VOL'], sourcePage: 202 },
  { id: 'fear-resistance', label: 'Résister à la peur', abilities: ['VOL'], sourcePage: 202 },
  { id: 'temptation-resistance', label: 'Résister à la tentation', abilities: ['VOL'], sourcePage: 202 },
];

/** Index de lookup par id (clé de contenu → domaine). */
export const testDomainById = new Map<string, TestDomain>(testDomains.map((d) => [d.id, d]));
