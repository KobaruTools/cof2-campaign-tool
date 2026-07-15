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
 * v12 : ajout de `purse` (argent possédé, par unité or/argent/cuivre — PER-152).
 * v13 : ajout de `firearmsAllowed` (armes à feu autorisées dans l'univers de jeu ;
 *   `false` transforme l'arquebusier en « arbalétrier » — p. 62).
 * v14 : ajout de `purse.platinum` (pièce de platine, pp — 1 pp = 10 po, p. 181).
 * v15 : ajout des clés étrangères de la hiérarchie Campagne ⊃ Joueurs ⊃
 *   Personnages : `campaignId`, `playerId` (obligatoires) et `status`
 *   ('active' | 'dead' | 'retired', défaut 'active') — PER-179.
 * v16 : `campaignId`/`playerId` deviennent NULLABLE (PER-180 : la campagne est un
 *   regroupement optionnel, le personnage reste l'entité première). Les persos
 *   auto-attribués à la « Campagne par défaut » (v15) repassent « Non attribué »
 *   (`null`) ; une FK vers une VRAIE campagne choisie est préservée.
 * v17 : ajout de l'état « porté » sur les lignes d'équipement (`EquipmentRef.worn`
 *   / `CustomItem.worn`, PER-76). La migration auto-équipe la meilleure armure, le
 *   meilleur bouclier et la première arme déjà présents dans l'inventaire, pour que
 *   la défense des personnages existants ne chute pas au chargement (le calcul ne
 *   compte désormais que l'armure/bouclier PORTÉS, corrigeant le cumul erroné).
 */
export const SCHEMA_VERSION = 17;

/**
 * Statut d'un personnage dans sa campagne (PER-179) : `active` (jouable),
 * `dead` (mort — conservé pour l'historique, cf. cycle mort → recréation) ou
 * `retired` (retiré du jeu). Défaut `active`.
 */
export type CharacterStatus = 'active' | 'dead' | 'retired';

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
  /** Points de chance dépensés (PER-155). Absent = réserve de chance pleine. */
  luck?: number;
  /** Dés de récupération (DR) dépensés (PER-151). Absent = réserve de DR pleine. */
  recoveryDice?: number;
}

/**
 * Bourse du personnage (PER-152) : argent possédé, structuré par unité de monnaie
 * CO2 (livre de base, p. 181, « Système monétaire »). Codes du livre conservés en
 * commentaire : `platinum` = pièce de platine (pp), `gold` = pièce d'or (po),
 * `silver` = pièce d'argent (pa), `copper` = pièce de cuivre (pc). Conversion :
 * 1 pp = 10 po = 100 pa = 1000 pc. La platine reste rare/précieuse (« 1 pp = 10 po »,
 * p. 181) et n'apparaît dans aucune table de prix, mais elle est désormais suivie
 * pour permettre au joueur de la thésauriser et de faire la monnaie.
 *
 * État de jeu transitoire (modifiable hors mode « Modifier », au même titre que
 * `depletion`/`usageCounters`), mais NON réinitialisé par un repos : l'argent ne
 * se régénère pas. Chaque unité est un entier ≥ 0 ; les valeurs ne sont pas
 * normalisées automatiquement (10 pa ≠ forcément regroupées en 1 po — le joueur
 * décide), voir `src/lib/character/purse.ts`.
 */
export interface Purse {
  /** Pièces de platine (pp) — unité la plus forte, rare. 1 pp = 10 po. */
  platinum: number;
  /** Pièces d'or (po). */
  gold: number;
  /** Pièces d'argent (pa) — unité de référence des prix d'équipement. */
  silver: number;
  /** Pièces de cuivre (pc) — unité de base. */
  copper: number;
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

/**
 * Emplacements de port d'un objet équipé (PER-76). Le livre distingue l'armure,
 * le bouclier et les deux mains (p. 188) :
 *  - `armor` : l'armure portée (au plus une) ;
 *  - `shield` : le bouclier porté (au plus un) — occupe physiquement la main
 *    secondaire, mais reste un emplacement distinct d'une arme en main secondaire
 *    (permet de discriminer bouclier vs seconde arme du combat à deux armes) ;
 *  - `mainHand` / `offHand` : arme(s) tenue(s) en main. Une arme à deux mains
 *    (`twoHands`, ou `oneOrTwoHands` avec `grip: 'twoHands'`) occupe les deux mains.
 */
export const EQUIP_SLOTS = ['armor', 'shield', 'mainHand', 'offHand'] as const;
export type EquipSlot = (typeof EQUIP_SLOTS)[number];

/** Prise d'une arme tenue en main (p. 184) : à une main ou à deux mains. */
export type WeaponGrip = 'oneHand' | 'twoHands';

/**
 * État « porté » d'une ligne d'équipement (PER-76). Absent = objet simplement
 * rangé dans le sac (ne compte pas dans la défense, n'occupe aucune main). C'est
 * la brique qui distingue enfin le porté du rangé : avant PER-76, `equipment`
 * était une liste plate et le calcul de défense sommait à tort le bonus de DEF de
 * *toutes* les armures/boucliers de l'inventaire.
 */
export interface WornState {
  /** Emplacement occupé. */
  slot: EquipSlot;
  /**
   * Prise choisie, UNIQUEMENT pour une arme `oneOrTwoHands` tenue en main
   * principale : `oneHand` (DM `Weapon.damage`) ou `twoHands` (DM
   * `Weapon.twoHandedDamage`, occupe alors aussi la main secondaire). Absent /
   * ignoré pour les autres cas (arme `light`/`oneHand`, arme `twoHands`
   * intrinsèquement à deux mains, armure, bouclier).
   */
  grip?: WeaponGrip;
}

/** Ligne d'équipement référençant le catalogue. */
export interface EquipmentRef {
  itemId: string;
  quantity: number;
  /** État de port (PER-76). Absent = rangé. Voir `WornState`. */
  worn?: WornState;
  /**
   * Bonus de DEF MAGIQUE de cette instance d'armure enchantée (PER-85), en points
   * de défense qui s'ajoutent à la DEF mondaine du catalogue (`Armor.def`). Propriété
   * du PERSONNAGE (pas du catalogue, qui ne contient que des armures non magiques) :
   * l'enchantement est intrinsèque à l'objet, il survit au déséquipement. Ne concerne
   * QUE l'armure (l'enchantement des boucliers/armes est hors périmètre) et ne
   * contribue à la défense que lorsque l'armure est PORTÉE. Absent / 0 = non magique.
   * Distinct de la DEF mondaine car le surcoût de mana des sorts en armure (p. 178,
   * PER-82) se calcule HORS bonus magique. Champ additif optionnel absent-safe → pas
   * de bump de `schemaVersion` (cf. précédent `rolledHp`).
   */
  magicDef?: number;
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
  /**
   * État de port (PER-76). Absent = rangé. Un objet personnalisé peut être marqué
   * porté pour l'affichage, mais n'a pas de statistiques structurées : il ne
   * contribue pas au calcul de la défense (le moteur ne lit que le catalogue).
   */
  worn?: WornState;
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
  /**
   * Capacités OUBLIÉES à ce niveau via le changement d'orientation (p. 43) : le
   * personnage abandonne une capacité déjà acquise pour la remplacer par une autre
   * (le remplacement figure dans `chosenFeatureIds`, comme un choix normal). Absent
   * = aucun oubli. Stocké sur le niveau d'origine → l'annulation du niveau restitue
   * les capacités oubliées. Champ additif optionnel (pas de migration de schéma).
   */
  forgottenFeatureIds?: string[];
  /**
   * Résultat du **dé de vie** lancé à cette montée de niveau, quand la règle maison
   * de campagne `hitDieOnLevelUp` est active et que le joueur a choisi de lancer
   * plutôt que de prendre les PV fixes (PER-87). Valeur SAISIE LIBREMENT (le dé est
   * lancé à la vraie table) : c'est la composante « famille » du gain de PV du
   * niveau, AVANT CON (le moteur ajoute la CON par-dessus, comme pour les PV fixes).
   * Absent = PV fixes (comportement par défaut). Additif optionnel (pas de migration
   * de schéma). Stocké sur le niveau d'origine → l'annulation du niveau le retire.
   */
  rolledHp?: number;
}

export interface Character {
  schemaVersion: number;
  id: string; // uuid
  name: string;
  identity: Identity;

  /**
   * Clé étrangère vers la campagne de rattachement, ou `null` si le personnage
   * n'est **rattaché à aucune campagne** (PER-180 : la campagne est un
   * regroupement OPTIONNEL, le personnage reste l'entité première). Depuis PER-190
   * la campagne vit dans le cloud (Supabase, UUID) : le personnage — encore local
   * en attendant sa persistance cloud (PER-192/193) — pointe vers cet UUID. Une FK
   * qui ne résout aucune campagne connue est traitée comme « Non attribué ».
   */
  campaignId: string | null;
  /**
   * Clé étrangère vers le joueur qui incarne ce personnage, ou `null` si aucun
   * joueur n'est attribué (PER-180). Le joueur est LOCAL à la campagne (table
   * `players`, PER-191) : cet id n'a de sens que résolu dans `campaignId` (donc
   * `null` dès que `campaignId` est `null`). L'attribution est traitée par PER-184.
   */
  playerId: string | null;
  /** Statut du personnage dans sa campagne (PER-179). Voir `CharacterStatus`. */
  status: CharacterStatus;

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
   * Les armes à feu sont-elles autorisées dans l'univers de jeu (p. 185, encadré) ?
   * Réglage de campagne stocké au niveau du personnage en attendant un scope de
   * campagne (TODO). N'a d'effet que pour un profil qui maîtrise la poudre
   * (`CharacterClass.powderAllowed`, l'arquebusier) : à `false`, ses armes à feu
   * sont remplacées par des arbalètes et il prend le nom d'« Arbalétrier » (p. 62).
   * Par défaut `true` (les armes à feu conviennent à l'univers). Modifiable au
   * wizard comme en mode édition de la fiche.
   */
  firearmsAllowed: boolean;

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

  /**
   * Argent possédé (PER-152). État de jeu transitoire (modifiable hors mode
   * « Modifier »), non affecté par un repos. Voir `Purse` et
   * `src/lib/character/purse.ts`.
   */
  purse: Purse;

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
