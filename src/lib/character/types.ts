/**
 * Modèle de données « Personnage » — entièrement sérialisable en JSON
 * (contrainte structurante pour localStorage, export/import et la future
 * migration Supabase — PRD §7).
 *
 * Principes (PRD §7) :
 *  - `schemaVersion` en tête : tout chargement/import passe par la migration
 *    si la version est ancienne (voir `src/lib/engine/migrations.ts`).
 *  - le personnage stocke des **références** aux données de règles (ids) + ses
 *    **saisies propres** ; jamais de copie des textes de règles.
 *  - les valeurs dérivées ne sont **pas** stockées (recalculées à l'affichage),
 *    sauf surcharges manuelles explicites (`overrides`).
 */
import type { AbilityId, DerivedStatId, FeatureChoice } from '@/data/schema';
import type { AncestryChoice } from './ancestry';

/**
 * Version courante du schéma de personnage. Incrémenter à chaque évolution.
 * v2 : passage des clés du modèle en anglais (migration depuis v1 dans
 * `src/lib/engine/migrations.ts`).
 * v3 : ajout de `portraitVariant` (choix de l'illustration de profil).
 * v4 : ajout de `baseAbilities` + `ancestryChoices` (valeurs de base saisies à
 *   la création et résolution des modificateurs de peuple), pour afficher le
 *   détail « base + peuple = total » d'une caractéristique sur la fiche.
 * v5 : ajout de `featureChoices` (choix retenus pour les capacités qui en
 *   portent — sort d'une autre voie / caractéristique / option — PER-66).
 * v6 : ajout de `effectToggles` (interrupteurs manuels des effets conditionnels /
 *   temporaires portés par les capacités — PER-67).
 * v7 : ajout de `effectInputs` (saisies libres d'état de jeu corrélées à un
 *   interrupteur — ex. l'animal pris par « Forme animale » — PER-70).
 * v8 : ajout de `usageCounters` (décompte des capacités à usages limités — ex.
 *   « Les sept vies du chat », 6 usages — PER-70).
 * v9 : ajout de `priestVocation` (choix généraliste/spécialiste du prêtre et, le
 *   cas échéant, le dieu spécialisé — p. 122, table p. 126-127).
 * v10 : `identity.height` passe des mètres aux centimètres (saisie en cm +
 *   avertissement de fourchette).
 * v11 : ajout de `depletion` (dépletion transitoire des jauges — MANQUE des PV
 *   décomposé létal/temp, et mana dépensé — PER-147).
 */
export const SCHEMA_VERSION = 11;

/**
 * Manque de PV, décomposé selon la nature des dégâts (p. 218/220) :
 *  - `lethal` : dégâts normaux (létaux) subis ;
 *  - `temp` : dégâts temporaires (non létaux), régénérés à 1/min et distingués
 *    car ils assomment (0 PV) au lieu de faire tomber à terre.
 * PV courants = `clamp(maxHp − lethal − temp, 0, maxHp)`.
 */
export interface HpDepletion {
  lethal: number;
  temp: number;
}

/**
 * Dépletion transitoire des jauges (PER-147) : on stocke le **manque** de chaque
 * jauge (dégâts subis, mana dépensé), non sa valeur absolue. La valeur courante se
 * recalcule toujours depuis le max du moment → un changement de max (montée de
 * niveau, surcharge manuelle) est suivi automatiquement, sans re-clamp ni perte
 * d'information. Absence d'entrée = jauge **pleine**.
 *
 * État de jeu transitoire, au même titre que `effectToggles`/`effectInputs`/
 * `usageCounters` : modifiable hors mode « Modifier », normalisé aux changements
 * structurels (voir `pruneDepletion`). Les ressources de capacité à réserve limitée
 * (rage, sept vies…) restent modélisées par `usageCounters`, pas ici.
 */
export interface Depletion {
  /** Manque de PV (létal + temporaire). Absent = PV pleins. */
  hp?: HpDepletion;
  /** Points de mana dépensés. Absent = mana plein. */
  mana?: number;
  /** Dés de récupération (DR) dépensés (PER-151). Absent = réserve de DR pleine. */
  recoveryDice?: number;
}

/**
 * Vocation d'un prêtre (p. 122). `generalist` : suit les règles de base, aucun
 * effet mécanique (la liste des dieux n'est qu'une inspiration). `specialist` :
 * héraut d'un seul dieu (`godId` ∈ `src/data/priest-gods.ts`) — maîtrise son arme
 * sacrée et reçoit une capacité divine (câblage des effets à venir). Pertinent
 * uniquement pour un personnage prêtre ; `null` sur la fiche = non applicable.
 */
export type PriestVocation =
  | { mode: 'generalist' }
  | {
      mode: 'specialist';
      godId: string;
      /**
       * Voie de prêtre dont le slot de rang N (= rang natif de la capacité divine)
       * est occupé par la capacité divine, à la place de sa capacité native (p. 122).
       * Choisi à l'acquisition (création pour une divine de rang 1). Absent tant que
       * non choisi (ou pour une divine de rang 2+, dont l'accueil sera désigné à la
       * montée de niveau).
       */
      hostPathId?: string;
    };

/**
 * Statistiques dérivées surchargeables manuellement (règle maison, cf. PRD
 * §5.4). Une surcharge présente remplace la valeur calculée ; elle est
 * réversible (suppression de la clé = retour au calcul automatique). Source
 * unique des clés dans `@/data/schema` (partagée avec `DerivedMods` du moteur).
 */
export type { DerivedStatId };

/**
 * Valeur d'un choix retenu pour une capacité (PER-66). Sérialisable, son SENS
 * dépend du `kind` du choix correspondant côté définition (`Feature.choices`,
 * aligné par position) :
 *  - `ability` → un `AbilityId` (`'FOR'`, `'AGI'`…) ;
 *  - `feature-from-path` → l'`id` de la capacité empruntée (`'pourfendeur-r1'`) ;
 *  - `option` → l'`id` de l'option retenue (`FeatureChoiceOption.id`), ou — pour un
 *    choix `option` RÉPÉTABLE (`OptionFeatureChoice.repeat`, ex. Golem supérieur) —
 *    un TABLEAU d'ids d'options distinctes.
 * `null` = choix pas encore fait (état explicite, à signaler dans l'UI). Pour un
 * choix répétable, un tableau vide vaut « rien choisi ».
 */
export type FeatureChoiceSelection = string | string[] | null;

export type { FeatureChoice };

/** Sexe du personnage (code interne, affiché en français). */
export type Sex = 'male' | 'female';

/**
 * Variante d'illustration du profil : chaque profil dispose d'une illustration
 * standard (`default` → `/classes/<id>.webp`) et d'une alternative
 * (`alt` → `/classes/<id>-2.webp`). Choix purement esthétique.
 */
export type PortraitVariant = 'default' | 'alt';

/** Champs d'identité libres (PRD §5.2 étape 6). */
export interface Identity {
  sex?: Sex;
  age?: string;
  /** Taille en centimètres (chaîne libre ; cf. migration v9→v10). */
  height?: string;
  weight?: string;
  description?: string;
}

/** Ligne d'équipement référençant le catalogue. */
export interface EquipmentRef {
  itemId: string;
  quantity: number;
}

/**
 * Objet personnalisé hors catalogue (saisie libre sur la fiche permissive).
 * `custom: true` discrimine de `EquipmentRef`.
 */
export interface CustomItem {
  custom: true;
  name: string;
  quantity: number;
  /** Notes libres (DM, DEF, propriétés…). */
  details?: string;
}

export type EquipmentLine = EquipmentRef | CustomItem;

/**
 * Récompense choisie pour un point de capacité orphelin (p. 40) : un point qui n'a
 * pas été dépensé en capacité, échangé contre un bonus permanent.
 *  - `luck` → +1 point de chance ;
 *  - `recovery-die` → +1 dé de récupération ;
 *  - `hp` → +2 points de vigueur (PV) ;
 *  - `mana` → +2 points de mana (PM ; sans effet tant que le perso n'a pas de réserve).
 */
export type OrphanReward = 'luck' | 'recovery-die' | 'hp' | 'mana';

/** Entrée d'historique : ce qui a été choisi à un niveau donné. */
export interface LevelUpEntry {
  level: number;
  /** Ids des capacités acquises à ce niveau (et autres choix sérialisables). */
  chosenFeatureIds: string[];
  /**
   * Points de capacité orphelins convertis à ce niveau (p. 40), un par point non
   * dépensé. Absent = aucun. Stocké sur le niveau d'origine → l'annulation du
   * niveau retire aussi ses bonus orphelins.
   */
  orphanRewards?: OrphanReward[];
}

export interface Character {
  schemaVersion: number;
  id: string; // uuid
  name: string;
  identity: Identity;

  ancestryId: string;
  classId: string;
  level: number;

  /**
   * Vocation du prêtre (p. 122) : généraliste ou spécialiste d'un dieu. `null`
   * pour les non-prêtres (et tant que le choix n'est pas fait). Voir
   * `PriestVocation`.
   */
  priestVocation: PriestVocation | null;

  /** Variante d'illustration de profil retenue (esthétique). */
  portraitVariant: PortraitVariant;

  /**
   * Valeurs des 7 caractéristiques telles qu'elles figurent sur la fiche
   * (saisie libre, modificateurs de peuple déjà appliqués — décision PRD #13 :
   * ce sont directement les « valeurs » du livre, -3 à +5 à la création).
   */
  abilities: Record<AbilityId, number>;

  /**
   * Valeurs de base saisies à la création, **avant** modificateurs de peuple.
   * Sert uniquement à expliquer d'où vient chaque caractéristique (détail
   * « base + peuple = total »). Invariant maintenu : `baseAbilities[x]` +
   * modificateurs de peuple résolus = `abilities[x]` ; l'édition d'une valeur
   * finale sur la fiche réajuste la base en conséquence.
   */
  baseAbilities: Record<AbilityId, number>;

  /**
   * Résolution des modificateurs de peuple, dans le même ordre que
   * `ancestry.abilityModifiers` : indique quelle caractéristique reçoit chaque
   * modificateur (utile pour les peuples « au choix », ex. demi-elfe
   * « +1 PER ou CHA »). Permet d'attribuer le bonus/malus à la bonne ligne du
   * détail.
   */
  ancestryChoices: AncestryChoice;

  /**
   * Voie de peuple effectivement retenue (le demi-elfe choisit ; un mage peut
   * prendre la voie du mage à la place). `null` tant que non déterminée.
   */
  ancestryPathId: string | null;

  /** Ids des capacités acquises (toutes voies confondues). */
  featureIds: string[];

  /**
   * Choix retenus pour les capacités qui en portent (PER-66). Clé = id de la
   * capacité ; valeur = un tableau de sélections, une par entrée de
   * `Feature.choices`, ALIGNÉ PAR POSITION (`featureChoices[id][i]` correspond à
   * `feature.choices[i]`). `null` dans le tableau = choix pas encore fait.
   *
   * Champ DISTINCT de `featureIds` (acquisition) et `overrides` (surcharges de
   * stats dérivées) : il enregistre, pour une capacité déjà acquise, COMMENT le
   * joueur a résolu le choix qu'elle impose. Une capacité sans choix n'a pas
   * d'entrée ici. Le moteur lit ces choix là où ils ont un impact (cf.
   * `src/lib/character/choices.ts`).
   */
  featureChoices: Record<string, FeatureChoiceSelection[]>;

  /**
   * Interrupteurs manuels des effets conditionnels / temporaires portés par les
   * capacités (PER-67). Clé = id de la capacité ; valeur = un booléen par entrée
   * de `Feature.effects`, ALIGNÉ PAR POSITION (`effectToggles[id][i]` ↔
   * `feature.effects[i]`). Un effet `conditional-stat-bonus` n'est compté par le
   * moteur que s'il est actif ; case absente → on retombe sur
   * `activation.activeByDefault`. Les effets non conditionnels ignorent leur case.
   *
   * Prolonge la philosophie de `overrides` (PER-48) : une déviation MANUELLE,
   * réversible, persistée sur le personnage, que le moteur respecte — mais ciblée
   * sur un effet précis (« cette condition est réunie ») plutôt que sur la valeur
   * finale d'une stat. Une capacité sans effet conditionnel n'a pas d'entrée ici.
   */
  effectToggles: Record<string, boolean[]>;

  /**
   * Saisies LIBRES d'état de jeu corrélées à une capacité (PER-70). Clé = id de la
   * capacité ; valeur = texte libre saisi par le joueur. Distinct de `featureChoices`
   * (choix STRUCTURELS énumérés/validés, liés à la progression) : ici la valeur est
   * une note transitoire associée à un interrupteur d'effet, non contrainte par un
   * domaine. Cas actuel : l'animal pris par « Forme animale » (animaux-r5), corrélé à
   * son interrupteur de transformation. Une capacité sans saisie n'a pas d'entrée.
   */
  effectInputs: Record<string, string>;

  /**
   * Décompte courant des capacités à USAGES LIMITÉS (PER-70). Clé = id de la
   * capacité (qui doit déclarer un `Feature.usageCounter`) ; valeur = nombre
   * d'usages RESTANTS. Absent → on retombe sur le maximum déclaré (`usageCounter.max`,
   * compteur plein). État de jeu transitoire, comme `effectToggles`/`effectInputs` :
   * modifiable à tout moment, hors mode édition. Cas actuel : « Les sept vies du
   * chat » (fauve-r5, 6 usages). Une capacité sans usage limité n'a pas d'entrée.
   */
  usageCounters: Record<string, number>;

  /**
   * Dépletion transitoire des jauges (PER-147) : manque courant des PV (létal +
   * temporaire) et du mana. État de jeu transitoire, comme `usageCounters`. Voir
   * `Depletion` et `src/lib/character/gauges.ts`. `{}` = toutes les jauges pleines.
   */
  depletion: Depletion;

  /** Historique des montées de niveau (permet « qu'ai-je pris au niveau N ? »). */
  levelUpHistory: LevelUpEntry[];

  /** Équipement possédé (références catalogue + objets personnalisés). */
  equipment: EquipmentLine[];

  /** Surcharges manuelles de valeurs dérivées (réversibles). */
  overrides: Partial<Record<DerivedStatId, number>>;

  /** Notes libres du joueur. */
  notes: string;

  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

/** Garde de type : distingue un objet personnalisé d'une référence catalogue. */
export function isCustomItem(line: EquipmentLine): line is CustomItem {
  return 'custom' in line && line.custom === true;
}
