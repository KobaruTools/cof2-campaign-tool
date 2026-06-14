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
