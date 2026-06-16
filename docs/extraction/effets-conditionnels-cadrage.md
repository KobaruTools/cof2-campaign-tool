# Effets conditionnels / temporaires / scalants — cadrage (PER-67)

> Étend la couche `effects` (PER-63) aux effets qui ne sont **pas** des bonus plats
> inconditionnels, et **referme la liste** des capacités à traiter : ce document
> dit ce qui devient **structuré** vs ce qui reste **verbatim**, et recense
> explicitement les cas non structurés (aucun oubli silencieux).
>
> Couche schéma : `src/data/schema.ts` (`FeatureEffect`). Moteur : agrégation dans
> `src/lib/character/effects.ts`, consommée par `deriveStats`
> (`src/lib/engine/derived.ts`). Interrupteurs manuels : `Character.effectToggles`
> (`src/lib/character/types.ts`). Inventaire par capacité : `feature-classification.md`.

## Le mécanisme livré

La couche `effects` sait désormais représenter, **en plus** des bonus plats
permanents (PER-63) :

| Axe | Représentation | Exemple de règle |
|---|---|---|
| **scalant** | `value: ScalingValue` — `scale: 'ability'` (= une caractéristique) ou `scale: 'stepped'` par `by: 'level'` / `'path-rank'` (paliers `{ min, value }`). | « ajoute sa FOR à ses PV » ; « passe à +2 au rang 5 de la voie ». |
| **conditionnel** | `kind: 'conditional-stat-bonus'` + `activation.kind: 'condition'`. | « +1 en DEF avec une arme dans chaque main ». |
| **temporaire** | `kind: 'conditional-stat-bonus'` + `activation.kind: 'temporary'`. | « −2 en DEF pendant la rage berserk ». |

Conditionnel et temporaire se ramènent, côté moteur, à un **interrupteur on/off** :
l'effet n'est compté que lorsqu'il est **actif**. L'état courant est porté par un
**interrupteur manuel** persistant sur le personnage (`Character.effectToggles`,
aligné par position sur `Feature.effects`), dans la lignée de la surcharge manuelle
des stats dérivées (`overrides`, PER-48) : une déviation **manuelle, réversible**,
que le moteur respecte. Par défaut un effet conditionnel est **inactif**
(`activation.activeByDefault` absent = `false`).

### Cas internes prouvant le mécanisme

Trois capacités, choisies hors sémantique d'armure, couvrent les trois axes
(tests dans `src/lib/character/effects.test.ts`) :

- **Argument de taille** (`brute-r1`, p. 79) — `maxHp += FOR` : valeur **scalante
  par caractéristique**, permanente.
- **Parade croisée** (`combat-a-deux-armes-r2`, p. 73) — **conditionnel** (« une
  arme dans chaque main ») **+ scalant par paliers de rang de voie** (+1, puis +2
  au rang 5).
- **Rage du berserk** (`rage-r3`, p. 82) — **temporaire** (« pendant la rage »),
  malus de −2 en DEF.

## Frontière avec la milestone « Armures »

Ce ticket livre le **mécanisme générique** (un effet peut être conditionné +
interrupteur). Les conditions **spécifiques au port d'armure** (capacités
désactivées en armure, surcoûts liés à l'armure, etc.) sont câblées **côté
milestone Armures**, qui réutilise cette couche. **Aucune sémantique d'armure**
n'est modélisée ici (c'est pourquoi les cas de démonstration sont des conditions
de posture / d'état, jamais « si pas d'armure »).

## Ce qui est structuré vs verbatim

**Règle de structuration** : un effet n'est porté par `effects` que s'il modifie
l'une des **9 statistiques dérivées** connues du moteur (`DERIVED_STAT_IDS` :
`maxHp`, `def`, `initiative`, `luckPoints`, `manaPoints`, `recoveryDiceCount`,
`meleeAttack`, `rangedAttack`, `magicAttack`). Tout le reste **reste verbatim**
dans `text` (toujours la source) et, le cas échéant, mis en forme par `richText`
(PER-64/90) — sans interprétation par le moteur.

### Recensement des cas NON structurés (et pourquoi)

La passe analytique (`feature-classification.md`, 660 capacités) tague chaque
capacité ; ce ticket **n'en structure pas la totalité** — il pose le mécanisme et
la règle. Les familles de cas qui **restent verbatim** par construction :

1. **Effets sur les tests / compétences** — « ajoute son rang + 2 aux tests de
   survie / de discrétion / de stratégie… ». Ce ne sont pas des stats dérivées du
   moteur → verbatim. (Famille la plus nombreuse parmi les `conditional`.)
2. **Bonus aux DM / dés de dégâts** — « +1d4° DM au contact », « +2d4° à l'attaque
   sournoise ». Les DM ne sont pas une stat dérivée → verbatim (`richText` pour
   les dés).
3. **Immunités / annulations d'état** (tag `immunity`, 21 capacités) — « immunisé
   à la peur », « ignore les DM d'une attaque par jour ». Genre d'effet distinct,
   non modélisé ici → verbatim (ticket dédié éventuel).
4. **Manœuvres / actions de combat** — attaque supplémentaire, action de
   mouvement gratuite, déplacement stoppé… N'altèrent pas une valeur dérivée →
   verbatim.
5. **`pure-text`** (8 capacités) — narratif / arbitré MJ, aucune mécanique
   structurable → verbatim, toujours seul.
6. **Conditions de port d'armure** — renvoyées à la milestone Armures (voir
   ci-dessus).
7. **Coûts de mana dynamiques** — réductions liées à la Concentration, à l'arme
   élémentaire, au NC de la cible… traités par-dessus le coût de base (PER-65), pas
   ici.

### Cas structurables non encore peuplés

Les bonus **à une stat dérivée** qui sont conditionnels / temporaires / scalants
au-delà des trois cas de démonstration (ex. `combat-r1` +3 Init, `soldat-r5` /
`resistance-r5` +1 DEF, `outre-tombe-r2` armure d'os, `guerre-sainte-r2` bouclier
de la foi, les nombreuses « Constitution / Force / Charisme héroïque » à part
plate, etc.) **peuvent** désormais être portés par cette couche. Leur population
exhaustive, famille par famille, est un travail de contenu distinct : le ticket
fournit le mécanisme, la règle et la preuve, pas la saisie des 660 capacités. La
**liste de référence par capacité** (tags `flat-bonus` / `conditional` /
sous-types `condition` / `temporary` / `scaling`) vit dans l'inventaire
`feature-classification.md` — c'est lui qui « referme la liste ».

## Exclusion / désactivation entre capacités

Certaines capacités, lorsqu'elles sont **actives**, en **désactivent** une autre —
le livre l'énonce verbatim. **Comment le repérer** dans le `text` (lecture, pas
juste mots-clés) : « **ne se cumule pas avec** *X* », « **incompatible avec** *X*…
**il y met fin** », « un personnage **sous l'effet de** *X* **ne peut**… ». À NE PAS
confondre avec : un **cumul positif** (« se cumule à la Maîtrise des éléments »),
une **exclusion d'équipement** générique (« ne se cumule jamais à une armure » →
milestone Armures), une **auto-terminaison** (« le sort prend fin dès que… »).

**Modèle** : `ConditionalStatBonusEffect.disablesFeatures?: string[]` — ids des
capacités que CET interrupteur, **quand il est actif**, désactive. La RD ou les
bonus de la capacité ne sont pas concernés : c'est l'**interrupteur** qui porte
l'exclusion. Une capacité-cible **sans interrupteur** (`bonuses: []` non requis)
est simplement grisée ; une capacité-cible **avec** interrupteur le voit éteint.

**Réciprocité** : se déclare **des deux côtés** (lien bidirectionnel) ou **d'un
seul** (unidirectionnel), selon ce que dit le livre.

**Comportement UI** (`FeaturesByPath` + `FeatureEffectToggles`, via
`disabledFeatureIds` / la cascade dans `setEffectToggle`) :
- la capacité désactivée est **grisée + semi-transparente** (`opacity` + `grayscale`) ;
- son interrupteur éventuel est **éteint** (sécurité redondante, à l'activation de
  l'autre) **et rendu non-interactif** ;
- **son détail reste consultable** (clic d'ouverture / accordéon préservé) — point
  de conception explicite : on n'empêche jamais de lire le sort qu'on ne peut activer.

**Cas mage de référence** (à ce jour les seuls de la famille) :

| Source (interrupteur actif) | Cible désactivée | Sens | Verbatim |
|---|---|---|---|
| Aspect du démon `demon-r4` | Beauté de la succube `demon-r2` | unidirectionnel (la cible n'a pas d'interrupteur) | « Ne se cumule pas avec la Beauté de la succube. » |
| Armure de pierre `magie-elementaire-r5` ↔ Déphasage `magie-protectrice-r3` | l'autre | réciproque (déclaré des deux côtés) | « incompatible avec le sort Déphasage… il y met fin » / « sous l'effet d'un sort d'armure de pierre ne peut se déphaser » |

## Réduction de dégâts (RD) — préparation « statistiques avancées »

La **réduction de dégâts** est un concept de règles **nommé dans le livre** (« les
réductions de dommages (voie du colosse, par exemple) ne s'appliquent pas », p. 105,
`magie-universelle-r?`). Le système de **statistiques avancées** (dont les DM) viendra
dans un ticket dédié ; en attendant, on **pose la donnée** pour ne pas reperdre
l'analyse — **le moteur ne la consomme pas encore**.

**Modèle** : `Feature.damageReduction?: DamageReduction` (cf. `schema.ts`).
- `kind` : `'flat'` (retrait plat), `'divide'` (division), `'immunity'` (aucun DM) ;
- `value` : `EffectValue` (constante ou scalante) — DM retranchés (`flat`) ou diviseur
  (`divide`) ; omis pour `'immunity'` ;
- `scopes?` : `ResistibleDamageType[]` — types réduits ; **absent = tous les DM subis** ;
- `absorptionCap?` : plafond total de DM absorbés avant dissipation (ajout du scaling
  `LevelScalingValue` `{ scale: 'level', factor }` pour exprimer « niveau × 3 »).

**La durée n'est PAS portée par la RD** : ces réductions sont temporaires et suivent
l'**interrupteur** de la capacité (ou sont permanentes pour une capacité passive).
L'**exclusion** mutuelle relève de `disablesFeatures`, pas de la RD.

### Inventaire mage — capacités modifiant les DM SUBIS

**Peuplées** (scope du ticket d'exclusion mutuelle) :

| Capacité | RD modélisée |
|---|---|
| Armure de pierre `magie-elementaire-r5` | `flat`, value 5, **tous**, `absorptionCap` niveau × 3 |
| Déphasage `magie-protectrice-r3` | `divide`, value 2, scope `physical` (hors sorts) |

**À peupler** (laissées verbatim ; analyse consignée ici pour ne pas la refaire) :

| Capacité | RD attendue | Remarque |
|---|---|---|
| Maîtrise des éléments `magie-elementaire-r2` | `flat` [rang + 2], scopes feu/froid/foudre/acide | — |
| Endurer `metal-r5` | `divide` 2, scope `fire` | porte déjà un `TODO(extraction)` dans `mages.ts` |
| Magnétisme `metal-r3` | `divide` 2, projectiles métalliques | scope « projectile métallique » absent de `RESISTIBLE_DAMAGE_TYPES` (à ajouter le moment venu) ; porte aussi +2 DEF (séparable) |
| Masque mortuaire `mort-r2` | `divide` 2, scope `cold` | + immunités aux pouvoirs de morts-vivants (hors RD) |
| Forme éthérée `air-r5` | `immunity`, scope `physical` | — |
| Forme gazeuse `magie-des-arcanes-r3` | `immunity`, scope `non-magical` | — |
| Prescience `divination-r5` | `divide` 2, **tous** | lié à « une fois par combat, 1 round » |

**Hors modèle RD** (laissées verbatim, ne PAS forcer dans `DamageReduction`) :
- **Négation probabiliste** — Image décalée `illusions-r2` : « sur 5-6, il ne subit
  pas les DM » (1d6) ; mécanique distincte d'une réduction.
- **RD portée par une CRÉATURE invoquée** — Invocation d'un démon `demon-r5` : « le
  démon divise par deux tous les DM non magiques subis » s'applique au **démon**, pas
  au lanceur → relèvera de `CreatureProfile`, pas de `Feature.damageReduction`.
- **Réduction OFFENSIVE** — Déphasage divise aussi les DM **infligés** (malus) : hors
  du modèle RD (défensif), reste verbatim.
