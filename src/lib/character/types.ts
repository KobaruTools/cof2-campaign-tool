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
import { DERIVED_STAT_IDS } from '@/data/schema';
import type { ItemIconId } from '@/data/item-icons';
import type {
  AbilityId,
  DerivedStatId,
  FeatureChoice,
  PoisonKind,
  ResistibleDamageType,
  WeaponCategory,
  WeaponDamage,
} from '@/data/schema';
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
 * v18 : passage des DM d'arme d'une chaîne libre à un modèle structuré `WeaponDamage`
 *   (PER-217). La migration convertit les surcharges de DM des variantes d'objet
 *   (`EquipmentOverrides.damage`/`twoHandedDamage`) via un parser gelé ; une chaîne
 *   non parsable est retirée (la ligne retombe sur le DM structuré de l'arme de base,
 *   le nom et les autres surcharges survivant). Le catalogue `equipment.ts` (code
 *   source) est réécrit à la main en littéraux structurés — hors migration.
 * v19 : ajout de `companionDepletion` (dépletion transitoire des PV PAR COMPAGNON —
 *   monture, familier, écuyer, golem, loup, invocation… ; PER-233). Suivi de jeu
 *   indexé par l'`id` du rang de voie qui octroie le compagnon. La migration ajoute
 *   simplement `{}` (aucun compagnon blessé au chargement).
 * v20 : ajout de `companionInstances` (compagnons MULTI-INSTANCES — les zombies du
 *   sorcier, outre-tombe-r3 ; PER-235). Table `id de capacité → liste ordonnée d'ids
 *   d'instance` ; les PV de chaque instance vivent dans `companionDepletion` sous la clé
 *   composite `<featureId>#<instanceId>`. La migration ajoute `{}` (aucune instance au
 *   chargement).
 * v21 : ajout de `mounts` (montures & véhicules POSSÉDÉS, rattachés comme compagnons hors
 *   inventaire — table « Prix des montures » p. 191 ; PER-216). Liste d'`OwnedMount`
 *   (id d'instance + entrée de catalogue + barde + PV). La migration ajoute `[]` (aucune
 *   monture au chargement).
 * v22 : ajout de `poisonedWeapons` (armes enduites de poison — voie du maître des poisons, p. 143,
 *   PER-74). Liste de `PoisonApplication` (instanceId d'arme + nature du poison + dépensé). La
 *   migration ajoute `[]` (aucune arme enduite au chargement).
 */
export const SCHEMA_VERSION = 22;

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
 * Monture ou véhicule POSSÉDÉ par le personnage (PER-216, table « Prix des montures »,
 * livre de base p. 191). Distinct d'un objet d'inventaire (`EquipmentLine`) : une monture
 * est une entité rattachée au personnage comme COMPAGNON — elle a ses propres stats de
 * combat (via son entrée de catalogue `src/data/mounts.ts`, rendue comme un bloc de
 * bestiaire) et sa propre barre de vie. Contrairement aux compagnons dérivés d'un rang de
 * voie (`listCompanions`), une monture achetée n'a pas de voie porteuse : c'est une
 * possession, ajoutée/retirée manuellement sur la fiche.
 */
export interface OwnedMount {
  /** Id d'instance stable (une monture possédée = une instance). Voir `newId`. */
  id: string;
  /** Id de l'entrée de catalogue (`MountCatalogEntry.id`, ex. `cheval-de-guerre`, `carriole`). */
  catalogId: string;
  /** Nom personnalisé donné par le joueur (ex. « Bucéphale ») ; absent = nom du catalogue. */
  name?: string;
  /**
   * Barde portée (`BardeCatalogEntry.id`), UNIQUEMENT pour une monture de combat apte au
   * caparaçon (cheval de guerre, `MountCatalogEntry.canWearBarde`). Ajoute son bonus de DEF
   * au bloc de la monture et un malus d'Init. équivalent (au cheval ET au cavalier — ce
   * dernier est un RAPPEL affiché, non soustrait de l'Init. calculée du personnage, PER-216).
   * Absent = pas de barde.
   */
  bardeId?: string;
  /**
   * Manque de PV courant de la monture (état de jeu transitoire, comme `companionDepletion`).
   * `{}` = PV pleins. N'a de sens que pour une monture portant un bloc de stats (les
   * véhicules / bêtes de somme sans stats n'ont pas de barre de vie).
   */
  hp: Depletion;
}

/**
 * ARME ENDUITE de poison (voie du maître des poisons, p. 143, PER-74). État de jeu transitoire, une
 * entrée par arme enduite (cf. `Character.poisonedWeapons`). L'arme est référencée par son
 * `EquipmentRef.instanceId` stable (assigné à l'enduisage) plutôt que par index (fragile). Une entrée
 * dont l'`instanceId` ne correspond plus à aucune ligne d'équipement (arme vendue/supprimée) est
 * considérée ORPHELINE et ignorée/nettoyée par le résolveur.
 */
export interface PoisonApplication {
  /** `EquipmentRef.instanceId` de l'arme enduite. */
  instanceId: string;
  /** Nature du poison appliqué (`weakening` n'est possible qu'une fois le rang 6 acquis). */
  kind: PoisonKind;
  /**
   * La charge est-elle DÉPENSÉE (première attaque réussie déjà portée ce combat) ? `false` = enduite,
   * prête. Réinitialisée à `false` par un repos (« avant chaque combat, ses armes sont enduites »).
   */
  spent: boolean;
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
 * (`alt` → `/classes/<id>-2.webp`), ou d'un portrait personnalisé envoyé par le
 * joueur (`custom`, PER-383 — cf. `src/lib/storage/characterPortrait.ts` pour le
 * fichier, ce champ ne sert qu'à savoir LEQUEL afficher). Choix esthétique.
 */
export type PortraitVariant = 'default' | 'alt' | 'custom';

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
 *    (`twoHands`, ou `oneOrTwoHands` avec `grip: 'twoHands'`) occupe les deux mains ;
 *  - `accessory` : objet équipé hors de ces emplacements (bottes, cape, anneau,
 *    amulette…). NON exclusif (on peut en porter plusieurs, aucun conflit), n'occupe
 *    aucune main et n'apporte pas de DEF mondaine. Sert de support à un bonus de DEF
 *    MAGIQUE cumulable (`magicDef`) porté par n'importe quel objet équipé.
 */
export const EQUIP_SLOTS = ['armor', 'shield', 'mainHand', 'offHand', 'accessory'] as const;
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

/**
 * Type d'un objet d'inventaire (PER-211), pour l'icône de type et le classement de
 * l'inventaire. Deux familles :
 *  - MÉCANIQUE (`weapon` / `armor` / `shield`) : un objet personnalisé de ce type est
 *    une **variante d'un objet du livre** (base catalogue + `overrides`), qui s'équipe
 *    et compte dans le moteur comme un objet du catalogue ;
 *  - COSMÉTIQUE (`consumable` / `gear` / `treasure` / `misc`) : objet libre typé, sans
 *    effet de jeu structuré (le consommable custom porte seulement le décompte
 *    « Utiliser »). `misc` (« Divers ») est le défaut d'un objet sans type.
 *
 * Pour une `EquipmentRef` (objet du catalogue), le type se DÉDUIT de la catégorie du
 * catalogue (voir `itemType`) et n'est donc pas stocké ; il n'est persisté que sur un
 * `CustomItem` (`CustomItem.type`).
 */
export type ItemType = 'weapon' | 'armor' | 'shield' | 'consumable' | 'gear' | 'treasure' | 'misc';

/**
 * Surcharges d'instance d'une variante d'objet du livre (PER-211). Chaque champ ABSENT
 * ⇒ on retombe sur la valeur du catalogue (voir `effectiveItem`) ; un champ présent
 * ÉCRASE la valeur de base. Surcharges RICHES (n'importe quelle stat écrasable) et
 * FIGÉES au moment de la création (une variante ne suit pas les corrections futures du
 * catalogue — choix de simplicité). Le sous-type et la maîtrise restent portés par
 * l'`itemId` de base (jamais surchargés). Distinct de `magicDef`, qui reste séparé
 * (bonus magique d'armure, hors surcoût de mana des sorts en armure, p. 178).
 *
 * Les clés reprennent celles du catalogue (`@/data/schema`) : `damage`/
 * `twoHandedDamage`/`range`/`weaponCategory` pour une arme, `def`/`maxAgi` pour une
 * armure (`def` seul pour un bouclier), plus `name`/`description` communs. Une clé sans
 * rapport avec la catégorie de la base est simplement ignorée par le résolveur.
 *
 * Les DM (`damage`/`twoHandedDamage`) sont STRUCTURÉS (`WeaponDamage`, PER-217) depuis
 * le schéma v18 ; les variantes d'avant v18 (DM en chaîne) sont converties par la
 * migration v17→v18 (parser gelé), cf. `src/lib/engine/migrations.ts`.
 */
/**
 * Apport de CARACTÉRISTIQUES d'un objet enchanté (PER-272) : une entrée par
 * caractéristique, valeur signée (positive = bonus, négative = malus). Ex. des bottes de
 * vivacité `{ AGI: 1 }`, un heaume maudit `{ PER: -2 }`.
 *
 * Propriété du PERSONNAGE (comme `magicDef`, et non `EquipmentOverrides`) pour deux
 * raisons : le catalogue ne contient que des objets non magiques, et l'apport doit être
 * portable par un objet LIBRE (`CustomItem`) autant que par une variante d'objet du livre.
 * Une caractéristique ne peut donc apparaître qu'UNE fois par objet (clé d'objet), ce qui
 * est exactement la règle de saisie voulue (« une ligne par caractéristique »).
 *
 * Ne compte que lorsque l'objet est PORTÉ (`worn`) ; les apports de tous les objets portés
 * se CUMULENT. Voir `abilityBonusesFromEquipment` (agrégation) et `effectiveAbilities`
 * (application). Une valeur 0 n'est jamais persistée (équivaut à l'absence de ligne).
 */
export type ItemAbilityBonuses = Partial<Record<AbilityId, number>>;

/**
 * Statistique dérivée qu'un objet enchanté peut modifier (PER-273) : toutes SAUF la
 * **Défense**.
 *
 * La DEF est volontairement exclue (décision propriétaire, 2026-07-29) : trop d'éléments de
 * règle se calculent DEPUIS les valeurs d'armure — plafond d'AGI (p. 188), malus d'armure,
 * surcoût de mana des sorts en armure (p. 178), accès à l'armure par rang — et un bonus plat
 * posé à côté ne serait pas repris correctement par ces calculs. La DEF magique (`magicDef`)
 * fait déjà ce travail avec ses propres règles, elle reste le SEUL canal d'enchantement
 * défensif. Exclusion portée par le TYPE (et pas seulement par l'interface) pour qu'aucune
 * couche ne puisse réintroduire un bonus de DEF plat.
 */
export type ItemDerivedStatId = Exclude<DerivedStatId, 'def'>;

/**
 * Les stats dérivées modifiables par un objet, dans l'ordre canonique du moteur — liste
 * proposée par la modale d'objet et filtre appliqué à l'agrégation. Dérivée de
 * `DERIVED_STAT_IDS` pour qu'une future stat dérivée y entre automatiquement.
 */
export const ITEM_DERIVED_STAT_IDS = DERIVED_STAT_IDS.filter(
  (id): id is ItemDerivedStatId => id !== 'def',
);

/**
 * Apport de STATISTIQUES DÉRIVÉES d'un objet enchanté (PER-273) : une entrée par stat,
 * valeur signée (positive = bonus, négative = malus). Ex. une amulette de vitalité
 * `{ maxHp: 5 }`, un talisman `{ luckPoints: 1 }`, une cape `{ initiative: 2 }`.
 *
 * Jumeau de `ItemAbilityBonuses`, et propriété de l'INSTANCE pour les mêmes raisons.
 * Les clés sont celles du sac de modificateurs du moteur (`DerivedMods`), moins la Défense
 * (cf. `ItemDerivedStatId`) : l'apport ALIMENTE cette couche au lieu de la doubler, donc il
 * se cumule naturellement avec les bonus des voies. Une stat ne peut apparaître qu'UNE fois
 * par objet (clé d'objet), ce qui est exactement la règle de saisie voulue (« une ligne par
 * statistique »).
 *
 * Ne compte que lorsque l'objet est PORTÉ (`worn`) ; les apports de tous les objets portés
 * se CUMULENT. Voir `derivedBonusesFromEquipment` (agrégation) et `characterDerivedView`
 * (application). Une valeur 0 n'est jamais persistée (équivaut à l'absence de ligne).
 */
export type ItemDerivedBonuses = Partial<Record<ItemDerivedStatId, number>>;

/**
 * Cible d'un bonus aux TESTS porté par un objet enchanté (PER-275) : soit une
 * CARACTÉRISTIQUE (`AbilityId` — le bonus vaut alors pour TOUS ses tests, comme le tatouage
 * du barbare p. 80), soit un DOMAINE de compétence (id de `testDomains`, ex. `stealth`).
 *
 * Les deux espaces d'identifiants sont disjoints par convention (caracs en TROIS LETTRES
 * majuscules, domaines en slug anglais minuscule) : on peut donc les mêler dans une seule
 * liste de saisie et les démêler à l'agrégation. Typé `string` comme les domaines le sont
 * déjà partout dans le moteur (`TestBonusEffect.domains`, `TestDomainBonus.domain`) — la
 * liste des domaines est OUVERTE et vivante (cf. `test-domains.ts`), elle ne peut pas être
 * un type fermé. La liste des cibles acceptées est `ITEM_TEST_TARGET_IDS` (`equipment.ts`),
 * qui sert aussi de liste blanche à l'agrégation.
 */
export type ItemTestTarget = string;

/**
 * Bonus/malus aux TESTS d'une instance d'objet enchanté (PER-275) : une entrée par cible,
 * valeur signée. Ex. une cape d'ombre `{ stealth: 5 }`, un anneau de vigueur `{ FOR: 2 }`,
 * un heaume maudit `{ perception: -2 }`.
 *
 * Troisième jumeau de `ItemAbilityBonuses` / `ItemDerivedBonuses` : propriété de l'INSTANCE
 * pour les mêmes raisons, ne compte que si l'objet est PORTÉ, champ additif absent-safe (pas
 * de bump de `schemaVersion`), et une cible ne peut apparaître qu'UNE fois par objet.
 *
 * MAIS la règle de CUMUL diffère, et c'est le point structurant du ticket : là où les apports
 * de caracs et de stats dérivées s'additionnent librement, le bonus d'un objet magique à un
 * test est un **bonus de magie** qui ne se cumule PAS avec un autre bonus de magie sur le
 * même test — deux objets portés qui bonifient le même test ne se somment pas, on retient le
 * meilleur (p. 203 : « les bonus de compétence ne s'additionnent que lorsqu'ils proviennent
 * de sources différentes » ; p. 80, note des Tatouages : un bonus de magie « ne peut pas se
 * cumuler à un bonus fourni par un objet magique »). En revanche il SE CUMULE avec les bonus
 * de compétence des voies (p. 203 : « peut se cumuler avec n'importe quel bonus de
 * compétence »), sous le plafond commun de +15.
 *
 * Voir `testBonusSourcesFromEquipment` (agrégation) et `resolveTestBonus` (arbitrage).
 */
export type ItemTestBonuses = Partial<Record<ItemTestTarget, number>>;

/**
 * Nature d'UN coup chargé dans une arme (PER-284) : munition normale, ou mélange de poudre et de
 * grenaille du Tir de grenaille (`explosifs-r1`, p. 63). Chaque coup porte la sienne — l'arquebusier
 * « doit l'annoncer au moment où il charge », donc un chargeur peut parfaitement contenir deux
 * grenailles suivies de trois balles normales. Type fermé, extensible à d'autres mélanges.
 */
export type LoadedAmmunitionKind = 'normal' | 'grapeshot';

/**
 * DÉFINITION des charges d'un objet (PER-294) : combien d'utilisations il contient à plein, et
 * comment il se remplit tout seul. C'est la généralisation LIBRE du chargement des armes
 * (`weaponLoading.ts`) à n'importe quel objet — baguette, sceptre, talisman, potion à doses.
 *
 * Deux différences volontaires avec les munitions : les charges sont toutes IDENTIQUES (rien à
 * annoncer au chargement, cf. `LoadedAmmunitionKind`), et la capacité est SAISIE par le joueur
 * au lieu d'être dérivée du catalogue et des capacités (`weaponCapacity`) — l'application ne
 * connaît aucun objet magique, ces objets sont toujours inventés à la table.
 *
 * RÈGLE MAISON ASSUMÉE : le livre de base ne décrit aucun objet à charges (il n'a pas de
 * catalogue d'objets magiques). Ce champ ne modélise donc AUCUNE règle CO2 — c'est un support de
 * saisie pour ce que le meneur de jeu invente, sans `sourcePage`.
 */
export interface ItemCharges {
  /**
   * Nombre de charges de l'objet PLEIN (entier ≥ 1). Une valeur absente, nulle ou aberrante fait
   * de l'objet un objet SANS charges (cf. `itemChargeState`, qui normalise à la lecture).
   */
  max: number;
  /** L'objet se remet à plein au repos COURT. Absent = non. */
  onShortRest?: true;
  /**
   * L'objet se remet à plein au repos LONG. Absent = non. Cumulable avec `onShortRest` : les deux
   * réglages sont indépendants, et un objet marqué « repos court » repart de toute façon à plein
   * au repos long (une nuit fait au moins ce qu'une pause de trente minutes fait).
   */
  onLongRest?: true;
}

/**
 * PROPRIÉTÉS SPÉCIALES d'un objet magique (PER-306), telles que le livre les nomme
 * (chapitre « Objets magiques », p. 251-254). On distingue les propriétés d'ARME
 * (p. 251-252) des propriétés DÉFENSIVES (p. 253-254) — un même objet ne porte en
 * pratique que l'une ou l'autre famille, mais le modèle les réunit dans une seule
 * liste `magicProperties` pour rester simple.
 *
 * Chaque propriété contribue au NIVEAU DE MAGIE de l'objet (voir `magicItem.ts`), et
 * « on peut doubler une propriété » (p. 251) : `doubled` double alors son effet ET son
 * niveau de magie (p. 251/254). Ce ticket (306) ne pose que le socle de données et le
 * calcul du niveau/valeur ; les EFFETS mécaniques (attaque, DM, RD, résistances…) sont
 * câblés au ticket suivant (PER-307).
 */
export type MagicWeaponPropertyKind =
  /** Affûtée (p. 251) — crit +1 point et +1d4° DM aux critiques. Niveau de magie +1. */
  | 'sharp'
  /** Fléau des [catégorie] (p. 251) — +1d4° DM contre une catégorie de créature. Niveau +1. */
  | 'bane'
  /** [Élément/substance] (p. 251) — +1d4° DM d'un élément/substance. Niveau +2. */
  | 'elemental'
  /** Parade (p. 251) — l'arme offre un bonus de DEF. Niveau de magie = ce bonus. */
  | 'parry';

export type MagicDefensePropertyKind =
  /** Action libre (p. 253) — insensible à ralenti/immobilisé/paralysé magique. Niveau +1. */
  | 'free-action'
  /** Défense (RD 2, +1) / Défense supérieure (RD 4, +2) (p. 253) — voir `tier`. */
  | 'defense'
  /** Mobile (p. 253) — malus d'armure réduit de 4. Niveau +1. */
  | 'mobile'
  /** Natation (p. 253) — +5 aux tests de natation (armure flottante). Niveau +1. */
  | 'swimming'
  /** Ombre (p. 253) — +5 aux tests de discrétion (AGI). Niveau +1. */
  | 'shadow'
  /** Protection (p. 253) — divise par 2 les DM des critiques et attaques sournoises. Niveau +1. */
  | 'protection'
  /** Résistance à la magie (p. 253) — +5 en DEF ou aux tests pour résister à la magie. Niveau +1. */
  | 'magic-resistance'
  /** Résistance [substance] X (p. 253) — retranche `amount` aux DM de `substance`. Niveau +1. */
  | 'resistance';

export type MagicPropertyKind = MagicWeaponPropertyKind | MagicDefensePropertyKind;

/**
 * Une propriété spéciale portée par un objet magique (PER-306). Les paramètres ne
 * concernent que certains `kind` ; les autres restent absents.
 */
export interface MagicProperty {
  kind: MagicPropertyKind;
  /**
   * Fléau : catégorie de créatures ciblée (p. 251, LISTE OUVERTE — « les animaux, les
   * démons, les goblinoïdes, les lanceurs de sorts, les morts-vivants… etc. »). Texte
   * affiché tel quel (français), jamais une clé fermée.
   */
  creatureCategory?: string;
  /**
   * Élément / Résistance : substance concernée. Réutilise `ResistibleDamageType` (feu,
   * froid, foudre, acide, poison…), le canal de RD typée déjà présent (PER-137/138).
   */
  substance?: ResistibleDamageType;
  /** Résistance [substance] : nombre de points retranchés aux DM (le « X », p. 253). */
  amount?: number;
  /** Défense : 1 = Défense (RD 2, niveau +1) · 2 = Défense supérieure (RD 4, niveau +2) (p. 253). */
  tier?: 1 | 2;
  /** Parade : bonus de DEF offert par l'arme, qui EST son niveau de magie (p. 251). */
  defBonus?: number;
  /** Propriété DOUBLÉE (p. 251/254) : effet ET niveau de magie doublés. Absent = simple. */
  doubled?: true;
}

export interface EquipmentOverrides {
  name?: string;
  description?: string;
  damage?: WeaponDamage;
  twoHandedDamage?: WeaponDamage;
  range?: string;
  weaponCategory?: WeaponCategory;
  def?: number;
  maxAgi?: number | null;
}

/** Ligne d'équipement référençant le catalogue. */
export interface EquipmentRef {
  itemId: string;
  quantity: number;
  /**
   * Identifiant d'INSTANCE stable de cette ligne d'équipement (PER-74). Les lignes d'équipement sont
   * normalement repérées par leur index dans `Character.equipment`, fragile au réordonnancement/suppression ;
   * quand un état de jeu doit pointer une arme PRÉCISE dans la durée (poison appliqué, cf.
   * `Character.poisonedWeapons`), on lui assigne à la volée un `instanceId` stable (`ensureInstanceId`,
   * `src/lib/character/poison.ts`). Champ additif optionnel absent-safe → pas de bump de `schemaVersion`
   * (même logique que `magicDef`). Absent = jamais référencé par un état de jeu.
   */
  instanceId?: string;
  /** État de port (PER-76). Absent = rangé. Voir `WornState`. */
  worn?: WornState;
  /**
   * ICÔNE CHOISIE par le joueur pour cette ligne, qui l'emporte sur celle de l'objet du livre
   * (utile sur une **variante** : « Épée de Marek » à qui on veut une dague, un anneau enchanté
   * décliné d'un objet du catalogue…). Purement visuel, aucune règle. Absent = cascade par
   * défaut, cf. `itemIconId`. Champ additif optionnel absent-safe → pas de bump de
   * `schemaVersion` (même logique que `magicDef`).
   */
  icon?: ItemIconId;
  /**
   * Surcharges d'instance qui font de cette ligne une **variante** de l'objet du livre
   * `itemId` (PER-211) : nom, description et n'importe quelle stat écrasable (DM, DEF,
   * plafond AGI, portée, catégorie d'arme). Absent = objet du catalogue standard. Voir
   * `EquipmentOverrides` et `effectiveItem`. Champ additif optionnel absent-safe → pas
   * de bump de `schemaVersion` (même logique que `magicDef`).
   */
  overrides?: EquipmentOverrides;
  /**
   * Bonus de DEF MAGIQUE de cette instance d'objet enchanté (PER-85, généralisé),
   * en points de défense qui s'ajoutent à la DEF totale. Propriété du PERSONNAGE
   * (pas du catalogue, qui ne contient que des objets non magiques) : l'enchantement
   * est intrinsèque à l'objet, il survit au déséquipement. Porté par N'IMPORTE QUEL
   * objet ÉQUIPÉ (armure de corps, mais aussi bottes, cape, anneau… via le slot
   * `accessory`) ; les bonus de tous les objets portés se CUMULENT. Ne contribue à la
   * défense que lorsque l'objet est PORTÉ. Absent / 0 = non magique. Distinct de la
   * DEF mondaine car le surcoût de mana des sorts en armure (p. 178, PER-82) se
   * calcule HORS bonus magique (et n'y regarde que l'armure de corps). Champ additif
   * optionnel absent-safe → pas de bump de `schemaVersion` (cf. précédent `rolledHp`).
   */
  magicDef?: number;
  /**
   * BONUS MAGIQUE +N d'une ARME enchantée (PER-306, p. 251) — « un bonus en attaque et
   * aux dommages ». Ne concerne que les armes : pour un objet DÉFENSIF, le +N de défense
   * passe par `magicDef` (canal existant), pas par ce champ. Alimente le NIVEAU DE MAGIE
   * (voir `magicItem.ts`). Les effets mécaniques (attaque + DM) sont câblés au ticket
   * suivant (PER-307). Absent / 0 = arme non magique. Champ additif optionnel absent-safe
   * → pas de bump de `schemaVersion` (même logique que `magicDef`).
   */
  magicBonus?: number;
  /**
   * PROPRIÉTÉS SPÉCIALES de cet objet magique (PER-306, p. 251-254) : Affûtée, Fléau des
   * [créatures], Élément/substance, Parade (armes) ; Action libre, Défense, Mobile,
   * Natation, Ombre, Protection, Résistance à la magie, Résistance [substance] (défense).
   * Contribuent au niveau de magie (voir `magicItem.ts`). Effets câblés en PER-307. Absent
   * / vide = aucune propriété. Champ additif optionnel absent-safe → pas de bump de
   * `schemaVersion` (même logique que `magicDef`).
   */
  magicProperties?: MagicProperty[];
  /**
   * Bonus/malus de CARACTÉRISTIQUES de cette instance d'objet enchanté (PER-272), actifs
   * seulement quand l'objet est PORTÉ. Voir `ItemAbilityBonuses`. Champ additif optionnel
   * absent-safe → pas de bump de `schemaVersion` (même logique que `magicDef`).
   */
  abilityBonuses?: ItemAbilityBonuses;
  /**
   * Bonus/malus de STATISTIQUES DÉRIVÉES de cette instance d'objet enchanté (PER-273),
   * actifs seulement quand l'objet est PORTÉ. Voir `ItemDerivedBonuses`. Champ additif
   * optionnel absent-safe → pas de bump de `schemaVersion` (même logique que `magicDef`).
   */
  derivedBonuses?: ItemDerivedBonuses;
  /**
   * Bonus/malus aux TESTS de cette instance d'objet enchanté (PER-275), actifs seulement
   * quand l'objet est PORTÉ. Voir `ItemTestBonuses` — attention, règle de cumul propre
   * (bonus de magie non cumulable avec un autre bonus de magie). Champ additif optionnel
   * absent-safe → pas de bump de `schemaVersion` (même logique que `magicDef`).
   */
  testBonuses?: ItemTestBonuses;
  /**
   * DÉFINITION des charges de cette instance d'objet (PER-294) : nombre maximum d'utilisations et
   * politique de rechargement automatique. Absent = objet sans charges (le cas de la quasi-totalité
   * de l'inventaire). Propriété de l'INSTANCE comme `magicDef` et les bonus : le catalogue du livre
   * ne contient aucun objet à charges, c'est l'exemplaire possédé qui est enchanté.
   *
   * Se saisit en mode « Modifier » (`ItemDialog`), contrairement à `chargesSpent` qui est de l'état
   * de jeu. Champ additif optionnel absent-safe → pas de bump de `schemaVersion`.
   */
  charges?: ItemCharges;
  /**
   * Charges DÉPENSÉES sur cette instance (PER-294) — **ABSENT = objet PLEIN**, comme `loaded` pour
   * les armes : un objet au repos ne traîne aucune donnée de charge. ÉTAT DE JEU (le joueur dépense
   * une charge en pleine partie, hors mode « Modifier »), borné à `charges.max` à la lecture, ce qui
   * rend inoffensive une baisse du maximum sur un objet à moitié vide.
   *
   * Sans `charges`, ce champ est ignoré. Champ additif optionnel absent-safe → pas de bump de
   * `schemaVersion`. Voir `itemCharges.ts`.
   */
  chargesSpent?: number;
  /**
   * MUNITIONS CHARGÉES dans CETTE arme (PER-284), **dans l'ordre de tir** — `loaded[0]` est le
   * prochain coup qui partira, et recharger ajoute en fin de file. Concerne les armes que le livre
   * fait recharger (arbalètes et armes à poudre, `Weapon.reload`).
   *
   * **ABSENT = arme pleine de munitions normales** : c'est l'état normal, celui dans lequel un
   * personnage part à l'aventure, donc celui qui ne coûte aucune donnée. Un tableau VIDE (`[]`) est
   * une arme déchargée — distinct de l'absence.
   *
   * La nature est portée par CHAQUE coup, et non par l'arme, parce que le Tir de grenaille
   * (`explosifs-r1`, p. 63) se déclare au chargement — « il doit l'annoncer au moment où il charge » :
   * un chargeur peut donc contenir `['grapeshot', 'grapeshot', 'normal', 'normal']`, le joueur étant
   * libre du mélange et de son ordre.
   *
   * La liste appartient à l'ARME, pas au type d'arme : **une arme occupe une ligne d'inventaire** et
   * `quantity` n'entre dans AUCUN calcul de chargement. C'est ce qui permet de suivre les
   * modifications individuelles de l'arquebusier — le livre parle de « deux armes de son choix »
   * (p. 62) : deux pétoires dont une seule à chargeur sont deux lignes distinctes.
   *
   * Sa longueur est bornée par la capacité de l'arme : 1, 2 avec un second canon, ou la capacité du
   * chargeur (`weaponCapacity`). Aucun stock de munitions n'existe par ailleurs (p. 187 : « Nous vous
   * conseillons de ne pas tenir compte des dépenses de munitions ») : recharger ne consomme rien.
   * Champ additif optionnel absent-safe → pas de bump de `schemaVersion` (même logique que
   * `magicDef`). Voir `weaponLoading.ts`.
   */
  loaded?: LoadedAmmunitionKind[];
  /**
   * L'arme a été dotée d'un CHARGEUR par l'arquebusier (Arme à répétition, `artilleur-r2`,
   * p. 62 : « L'arquebusier modifie jusqu'à deux armes de son choix pour les doter de chargeurs.
   * La capacité du chargeur est égale à [2 + INT] et elle augmente de 1 projectile supplémentaire
   * chaque fois que le personnage atteint le rang 3 dans une voie d'arquebusier. »). Absent = arme
   * standard (un seul coup). Propriété de l'INSTANCE : c'est CETTE arme que le personnage a
   * bricolée, et la modification lui survit au déséquipement (même logique que `magicDef`) — le
   * livre parle bien de « deux armes de son choix », pas des pétoires en général — d'où le
   * compteur par ARME (cf. `loaded`).
   *
   * Le plafond de deux armes à chargeur n'est PAS contrôlé (fiche permissive). Champ additif
   * optionnel absent-safe → pas de bump de `schemaVersion`.
   */
  magazine?: true;
  /**
   * L'arme a été dotée d'un SECOND CANON par l'arquebusier (Canon double, `artilleur-r4`, p. 63 :
   * « L'arquebusier peut bricoler ses armes à poudre (mais pas une couleuvrine) pour les doter
   * d'un second canon. […] Il doit recharger chaque canon individuellement (un canon double
   * consomme 2 projectiles). »). Absent = un seul canon. Porte la capacité de l'exemplaire à 2 :
   * « il reste possible de décharger un seul canon à la fois ».
   *
   * Propriété de l'INSTANCE, comme `magazine`. Le doublement du dé de DM et le critique ×3 sont
   * des données d'affichage de la capacité, hors de ce champ. Champ additif optionnel absent-safe
   * → pas de bump de `schemaVersion`.
   */
  doubleBarrel?: true;
}

/**
 * Objet personnalisé hors catalogue (saisie libre sur la fiche permissive).
 * `custom: true` discrimine de `EquipmentRef`.
 */
export interface CustomItem {
  custom: true;
  name: string;
  quantity: number;
  /**
   * Type de l'objet (PER-211), pour l'icône et le classement de l'inventaire. Réservé
   * à la famille COSMÉTIQUE en pratique (`consumable`/`gear`/`treasure`/`misc`) — un
   * objet mécanique (arme/armure/bouclier) est modélisé comme variante d'un objet du
   * livre (`EquipmentRef` + `overrides`), pas comme `CustomItem`. Absent = `misc`
   * (« Divers »), pour rétrocompatibilité (champ additif absent-safe, pas de bump de
   * schéma). Voir `ItemType` et `itemType`.
   */
  type?: ItemType;
  /**
   * ICÔNE CHOISIE par le joueur pour cet objet libre. Un objet libre n'a pas de sous-catégorie
   * de catalogue à hériter : sans choix, il porte l'icône de son `type` (cf. `itemIconId`), ce
   * qui rend le choix d'autant plus utile (une cape, un anneau, un parchemin…). Purement
   * visuel. Champ additif optionnel absent-safe → pas de bump de `schemaVersion`.
   */
  icon?: ItemIconId;
  /** Notes libres (DM, DEF, propriétés…). */
  details?: string;
  /**
   * État de port (PER-76). Absent = rangé. Un objet personnalisé peut être marqué
   * porté pour l'affichage. Ses statistiques mondaines (DM, DEF de catalogue) restent
   * inconnues du moteur, MAIS un bonus de DEF magique (`magicDef`) éventuel est bien
   * pris en compte quand l'objet est porté (typiquement en `accessory`).
   */
  worn?: WornState;
  /**
   * Bonus de DEF MAGIQUE de cet objet libre enchanté (PER-85, généralisé). Même
   * sémantique que `EquipmentRef.magicDef` : s'ajoute à la DEF totale quand l'objet
   * est PORTÉ, se cumule avec les autres objets portés, reste HORS surcoût de mana.
   * Permet d'enchanter un objet libre (bottes, cape…) absent du catalogue. Champ
   * additif optionnel absent-safe → pas de bump de `schemaVersion`.
   */
  magicDef?: number;
  /**
   * BONUS MAGIQUE +N d'un objet libre faisant office d'ARME (PER-306, p. 251). Même
   * sémantique que `EquipmentRef.magicBonus` : +N en attaque et aux DM (câblé en PER-307),
   * réservé aux armes — le +N défensif passe par `magicDef`. Alimente le niveau de magie
   * (voir `magicItem.ts`). Champ additif optionnel absent-safe → pas de bump de `schemaVersion`.
   */
  magicBonus?: number;
  /**
   * PROPRIÉTÉS SPÉCIALES de cet objet libre magique (PER-306, p. 251-254). Même sémantique
   * que `EquipmentRef.magicProperties` — c'est un cas d'usage fréquent (cape, anneau,
   * bracelet enchantés absents du catalogue). Contribuent au niveau de magie ; effets en
   * PER-307. Champ additif optionnel absent-safe → pas de bump de `schemaVersion`.
   */
  magicProperties?: MagicProperty[];
  /**
   * Bonus/malus de CARACTÉRISTIQUES de cet objet libre enchanté (PER-272). Même sémantique
   * que `EquipmentRef.abilityBonuses` : ne comptent que si l'objet est PORTÉ et se cumulent
   * avec ceux des autres objets portés. Contrairement aux stats mondaines d'un objet libre
   * (DM, DEF, inconnus du moteur), cet apport EST pris en compte — c'est une saisie
   * structurée, pas une note libre.
   */
  abilityBonuses?: ItemAbilityBonuses;
  /**
   * Bonus/malus de STATISTIQUES DÉRIVÉES de cet objet libre enchanté (PER-273). Même
   * sémantique que `EquipmentRef.derivedBonuses` : ne comptent que si l'objet est PORTÉ
   * et se cumulent avec ceux des autres objets portés. Comme les apports de caracs, cette
   * saisie structurée EST prise en compte par le moteur (≠ note libre `details`).
   */
  derivedBonuses?: ItemDerivedBonuses;
  /**
   * Bonus/malus aux TESTS de cet objet libre enchanté (PER-275). Même sémantique que
   * `EquipmentRef.testBonuses` : ne comptent que si l'objet est PORTÉ, et ne se cumulent pas
   * avec un autre bonus de magie sur le même test (on retient le meilleur). C'est le cas
   * d'usage le plus fréquent du ticket — une cape, un anneau ou des bottes enchantés sont
   * rarement au catalogue.
   */
  testBonuses?: ItemTestBonuses;
  /**
   * DÉFINITION des charges de cet objet libre (PER-294). Même sémantique que
   * `EquipmentRef.charges` — c'est même le cas d'usage PRINCIPAL du ticket : une baguette ou un
   * talisman à charges n'a aucune contrepartie au catalogue, il s'invente de toutes pièces.
   */
  charges?: ItemCharges;
  /**
   * Charges DÉPENSÉES sur cet objet libre (PER-294). Même sémantique que
   * `EquipmentRef.chargesSpent` : **absent = plein**, état de jeu, borné à la lecture.
   */
  chargesSpent?: number;
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

  /**
   * Demi-elfe « version Le Compagnon » (PER-324) : ascendance elfique du personnage quand il suit la
   * VOIE DU DEMI-ELFE optionnelle (`ancestryPathId === 'demi-elfe'`). Le livre de base fait choisir au
   * demi-elfe une voie culturelle (humain/elfe haut/elfe sylvain) ; la voie du Compagnon la REMPLACE,
   * mais l'ascendance elfe subsiste et détermine le domaine du sort de « Sang féerique » (rang 4 :
   * elfe haut → ensorceleur, elfe sylvain → druide). Champ OPTIONNEL, sans migration : absent = demi-elfe
   * standard (ou tout autre peuple). Modifiable APRÈS création via la modale dédiée de la section Identité.
   */
  demiElfeElfAncestry?: 'elfe-haut' | 'elfe-sylvain';

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
   * Dépletion transitoire des PV, PAR COMPAGNON (PER-233). Clé = `id` du rang de voie
   * qui octroie le compagnon (ex. `golem-r2`, `cavalier-r1`, `compagnon-animal-r4`) —
   * un rang = un compagnon. La valeur réutilise la MÊME structure de manque que le
   * personnage (`Depletion`, dont seul `.hp` est renseigné en pratique), pour partager
   * tels quels les helpers de `src/lib/character/gauges.ts` (aucune duplication de
   * logique de PV). État de jeu transitoire, comme `depletion` : modifiable hors mode
   * « Modifier », reclampé au changement de max (via le recalcul du courant), et purgé
   * quand un compagnon disparaît (respec / baisse de niveau). `{}` = tous les
   * compagnons à PV pleins. Énumération et max dans `src/lib/character/companions.ts`.
   */
  companionDepletion: Record<string, Depletion>;

  /**
   * Compagnons MULTI-INSTANCES (PER-235) : clé = `id` de la capacité qui les octroie (ex.
   * `outre-tombe-r3` pour les zombies du sorcier) ; valeur = liste ORDONNÉE d'ids d'instance,
   * une par exemplaire invoqué. Chaque « Invoquer » ajoute un id ; l'auto-suppression à 0 PV
   * (« tombe en poussière », p. 109) et la suppression manuelle le retirent. Les PV de chaque
   * instance sont suivis dans `companionDepletion` sous la clé composite
   * `<featureId>#<instanceId>` (même mécanique de barre de vie que les autres compagnons). Le
   * nombre d'instances vivantes est plafonné par la limite du profil (`CreatureProfile.instances`,
   * résolue par `resolveCompanionInstanceLimit`). État de jeu transitoire (modifiable hors mode
   * « Modifier »), purgé quand la capacité disparaît (respec / baisse de niveau). `{}` = aucune
   * instance. Voir `src/lib/character/companions.ts`.
   */
  companionInstances: Record<string, string[]>;

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

  /**
   * Montures et véhicules POSSÉDÉS (PER-216) — rattachés au personnage comme compagnons,
   * hors inventaire (une monture n'est pas un objet porté). Ajoutés/retirés manuellement
   * sur la fiche ; leurs stats de combat viennent du catalogue `src/data/mounts.ts`. `[]`
   * = aucune monture. Voir `OwnedMount` et `src/lib/character/mounts.ts`.
   */
  mounts: OwnedMount[];

  /**
   * Monture actuellement CHEVAUCHÉE (« en selle »), état de jeu transitoire (PER-216). Clé UNIQUE :
   * on ne peut être en selle que d'une seule monture à la fois → l'exclusivité est structurelle (un
   * seul champ). Valeur = `OwnedMount.id` (monture possédée) OU la clé du compagnon monture de voie
   * (`CompanionEntry.key`, ex. `cavalier-r1` / `cavalier-r5`) ; absent = à pied. Pilote le malus
   * d'Initiative d'une barde sur le cavalier (monture possédée) et, s'il est chevalier, l'interrupteur
   * « en selle » de Cavalier émérite (`cavalier-r2`), maintenu synchronisé = « une monture est montée »
   * (mécanique GÉNÉRIQUE : n'importe quelle monture en selle active Cavalier émérite). Champ optionnel
   * additif (aucune migration). Voir `src/lib/character/mounts.ts`.
   */
  mountedKey?: string;

  /**
   * Cristaux ACTIVÉS (voie des cristaux, prestige mage, p. 156, PER-74). État de jeu DYNAMIQUE
   * (modifiable hors mode « Modifier », comme `mountedKey`), distinct des cristaux APPRIS
   * (`Character.featureChoices` sur `prestige-cristaux-r4..r8`, permanents) : un cristal appris
   * ne produit son effet que tant qu'il figure ici. La limite du nombre simultané (1 à 5 selon le
   * rang atteint dans la voie) n'est PAS appliquée en dur (fiche permissive) — un dépassement
   * (édition manuelle) déclenche un avertissement non bloquant. `[]`/absent = aucun cristal actif.
   * Voir `src/lib/character/crystals.ts`.
   */
  activeCrystalIds?: string[];

  /**
   * Cristaux REÇUS d'un autre personnage (PER-360, p. 156 : « Il peut le porter ou le confier à la
   * personne de son choix »). **Champ TRANSITOIRE, jamais persisté ni diffusé** : il n'existe que
   * dans la copie de CALCUL du porteur (`withReceivedCrystals`), reconstruite à chaque rendu depuis
   * les états de combat posés sur lui — l'état partagé faisant foi pour tout ce qui vient d'autrui.
   * Le porteur n'a rien APPRIS : ces cristaux ne comptent ni dans ses cristaux appris ni dans son
   * plafond d'activation, ils ne font qu'apporter leur bonus. `[]`/absent = aucun cristal confié.
   */
  receivedCrystalIds?: string[];

  /**
   * Armes ENDUITES de poison (voie du maître des poisons, p. 143, PER-74). État de jeu transitoire
   * (modifiable hors mode « Modifier »). Chaque entrée référence une ligne d'équipement par son
   * `EquipmentRef.instanceId` (assigné à l'enduisage), la nature du poison et si la charge est dépensée.
   * Plafonné par `Feature.poisonWeaponLoadout.maxWeapons`. Les repos ré-enduisent (spent → false). `[]`
   * = aucune arme enduite. Voir `PoisonApplication` et `src/lib/character/poison.ts`.
   */
  poisonedWeapons: PoisonApplication[];

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
