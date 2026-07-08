# Armures et équipement porté — règles extraites (PER-75)

Ticket de tête de la milestone « Armures et équipement porté ». Point de contrôle
propriétaire : extraction + sources avant tout code (doctrine schéma → extraction
validée → moteur → UI).

Complète `hybrides.md` §6-7 (maîtrise des armes, armure max par voie, sorts en
armure). Ce fichier couvre les **trois règles incertaines** que PER-75 demande de
trancher, plus le contexte moteur directement lié (plafond d'AGI, malus d'armure).

Source unique : `CBHS_06_Chroniques_Oubliees_2_web_v2.pdf` (livre de base CO2).

---

## 1. Plafond de défense — y a-t-il un plafond général au-delà du plafond d'AGI ?

**Conclusion : il n'existe aucun plafond de défense « global » à appliquer comme
règle indépendante.** Le seul plafond réel est le **plafond d'AGI imposé par
l'armure portée** (table p. 188). Le livre précise que ces valeurs d'AGI max sont
calibrées de sorte que le cumul AGI + armure ne dépasse pas +8 : ce n'est donc pas
une seconde règle à faire respecter, c'est une **propriété** qui découle du plafond
d'AGI correctement appliqué.

> « La règle est calibrée de façon qu'aucun personnage ne puisse dépasser un bonus
> de DEF de +8 en cumulant AGI + armure (+10 avec un grand bouclier). » — p. 188

### Table des armures (p. 188)

| Armure                       | DEF | AGI max | Prix   |
|------------------------------|-----|---------|--------|
| Tissus matelassés, fourrures | +1  | +7      | 2 pa   |
| Cuir simple                  | +2  | +6      | 4 pa   |
| Cuir renforcé, broigne       | +3  | +5      | 8 pa   |
| Chemise de mailles           | +4  | +4      | 15 pa  |
| Cotte de mailles             | +5  | +3      | 25 pa  |
| Armure de plaques            | +6  | +2      | 60 pa  |
| Plaque complète¹             | +7  | +1      | 200 pa |
| Petit bouclier               | +1  | —       | 2 pa   |
| Grand bouclier               | +2  | —       | 4 pa   |

¹ « Armure fabriquée sur mesure, seul le chevalier peut la porter grâce à la
capacité de rang 3 de la voie de la noblesse. » — p. 188

### Plafond d'AGI (mécanique exacte, p. 188)

> « La valeur maximale d'AGI d'un personnage est déterminée par l'armure qu'il
> porte. Les personnages avec une haute valeur d'AGI n'ont donc aucun intérêt à
> porter une armure trop lourde. » — p. 188

> « Exemple : un personnage avec une AGI de +3 peut porter jusqu'à la cotte de
> mailles sans subir de limitation, mais toute armure plus encombrante réduit la
> valeur de son AGI du nombre indiqué. S'il porte une armure de plaque, sa valeur
> d'AGI est réduite à +2 tant qu'il garde cette armure. » — p. 188

**Note moteur** : l'AGI effective = `min(AGI, armorAgiMax)`. Les boucliers n'ont pas
d'AGI max (colonne « — ») et ne plafonnent donc pas l'AGI ; leur +2 de DEF (grand
bouclier) s'ajoute par-dessus, d'où le « +10 » mentionné pour le plafond de cumul.
Le bonus magique d'une armure ne compte pas dans ce raisonnement (traité PER-85).
→ Détail d'implémentation dans le ticket dédié PER-78.

### Malus d'armure aux tests d'AGI (contexte, p. 188)

> « Les armures infligent des malus d'encombrement aux tests d'AGI : ajoutez la
> valeur de DEF de l'armure à la difficulté de tous les tests d'AGI effectués par
> le personnage. Pour certains tests de survie (CON), vous pouvez aussi imposer ce
> malus. » — p. 188

> « Si vous avez une armure magique, non seulement le bonus de magie n'augmente pas
> le malus d'encombrement, mais en plus il le réduit (minimum 0). » — p. 188

> « Exemple : une chemise de mailles (DEF +4, donc malus d'armure = -4) +3 impose
> seulement un malus d'armure de -1 (-4 + 3 = -1). » — p. 188

**Note moteur** : ce malus s'ajoute à la **difficulté** des tests d'AGI (et, au
choix du MJ, de certains tests de survie CON). Hors périmètre du moteur de défense,
mais utile pour un futur ticket « tests » / aide-mémoire MJ.

---

## 2. Mécanique du dé malus (p. 200)

Le dé malus est la mécanique **générale** de résolution ; les pages hybrides
(p. 177) y renvoient sans la détailler. Définition complète :

> « **Dé bonus** : lancez un d20 supplémentaire et gardez le plus haut résultat
> (pas celui de votre choix). » — p. 200

> « **Dé malus** : lancez un d20 supplémentaire et gardez le plus faible
> résultat. » — p. 200

### Cumul (p. 200)

> « Il n'est pas possible de cumuler plusieurs dés bonus ou malus. Ainsi, si la
> situation entraîne plusieurs dés d'un type ou de l'autre, un seul de chaque sera
> pris en compte. » — p. 200

> « Le dé malus et le dé bonus s'annulent. » — p. 200

> « Caractéristiques héroïques : ce sont des capacités de rang 4 (parfois 5) qui
> permettent d'obtenir un dé bonus. Ce dé ne s'applique qu'aux tests de la
> caractéristique, pas aux tests d'attaque. » — p. 200

**Note moteur** : le dé malus/bonus n'est **pas un modificateur chiffré** — c'est un
avantage/désavantage (2d20, on garde le pire/le meilleur). Il ne se cumule jamais
(au plus un malus et un bonus effectifs, qui s'annulent). Comme les caractéristiques
sont en saisie libre à la table et que les dés sont lancés en vrai (décision PRD),
le moteur n'a pas à simuler le tirage : il doit surtout **signaler** qu'un dé malus
en attaque s'applique (ex. arme non maîtrisée, p. 177) et rappeler la mécanique.
→ Indicateur de dé malus traité PER-79.

### Origine du dé malus qui nous concerne (arme non maîtrisée, p. 177)

> « Utiliser une arme sans la maîtriser impose un dé malus en attaque. » — p. 177

(Seuil de maîtrise = ≥ 2 rangs acquis dans une voie du profil concerné, voir
`hybrides.md` §6.1.)

---

## 3. Capacités passives en armure trop lourde — que dit le livre ?

**Le livre N'est PAS silencieux, mais il ne distingue jamais passif/actif.** Il
emploie un langage global : *toutes* les capacités restreintes sont interdites.

> « les voies de chaque profil sont associées à un type d'armure maximal : si vous
> utilisez une armure trop lourde, **toutes les capacités** restreintes à une armure
> plus légère vous seront interdites. » — p. 188

> « Ainsi, si un magicien porte une cotte de mailles ou utilise un bouclier, il ne
> peut plus utiliser ses capacités et ses sorts. Si un rôdeur porte une cotte de
> mailles, il ne peut plus utiliser les capacités de rôdeur. » — p. 188

> « Attention ! Chaque capacité impose toujours les restrictions d'armure qui
> correspondent au profil dont elle est issue : par exemple pas d'armure pour
> l'usage d'une capacité de moine, armure de cuir maximum pour une capacité de
> voleur, etc. » — p. 177

> « Exemple : Si un moine fait l'acquisition d'au moins deux rangs issus de voies de
> guerrier […]. En revanche, il ne peut toujours pas porter d'armure s'il veut
> **profiter** des capacités de moine. » — p. 177

**Analyse pour la décision propriétaire.** La décision du 2026-06-14 (consignée dans
PER-75) était : « on n'applique une désactivation/pénalité aux passifs que si une
règle l'indique explicitement ; à défaut de règle, aucune pénalité ». Or
l'extraction montre que le livre **contient bien une règle générale** — mais
formulée sans distinguer passif et actif : « toutes les capacités […] vous seront
interdites » (p. 188), et le verbe « profiter » (p. 177, moine) inclut plutôt les
passifs (on ne « utilise » pas un passif, on en « profite »). Deux lectures
possibles :

- **(A) Lecture littérale** : « toutes les capacités » = passifs inclus → une
  capacité passive dont la restriction d'armure est dépassée est **désactivée** (son
  bonus ne s'applique plus) tant que l'armure trop lourde est portée.
- **(B) Lecture « actif seulement »** (interprétation d'origine) : on ne désactive
  que ce qui s'« utilise » ; les passifs restent actifs faute de mention explicite
  du mot « passif ».

**Décision propriétaire (2026-07-09) : lecture (A) — littérale.** Une capacité
**passive** dont la restriction d'armure est dépassée est **désactivée** (son bonus
ne s'applique plus) tant que l'armure trop lourde est portée. C'est fidèle à la
lettre du livre (« toutes les capacités […] vous seront interdites », p. 188 ;
« profiter des capacités de moine », p. 177) et cela remplace l'interprétation
provisoire « actif seulement » du 2026-06-14. Sur la **fiche** (permissive), cela se
matérialise par un avertissement non bloquant **et** le retrait du bonus dans le
calcul ; dans le **wizard** (bloquant), la restriction peut être signalée en dur.
Ce choix pilote PER-83 (pénalités conditionnelles) et PER-86 (restriction d'armure
par capacité d'origine, hybrides).

---

## Hors scope (confirmé, PER-75)

- Règle optionnelle **high fantasy** (Atlas d'Osgild & règles optionnelles, p. 177)
  — hors scope.
- Périmètre exact des profils touchés par les pénalités d'armure : fixé par
  l'inventaire des capacités (PER-62), pas ici.
