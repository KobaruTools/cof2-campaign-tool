# Recensement et format du rendu enrichi des capacités (PER-90)

> Passe de **recensement des spécificités de mise en forme** des 660 capacités, en
> amont de la population de masse (PER-69 à PER-74). But : figer le mini-langage de
> `Feature.richText` pour qu'il sache exprimer **tous** les cas rencontrés dans le
> livre, sans avoir à repasser sur des centaines de capacités déjà balisées.
>
> Source du format : `src/lib/ui/featureRichText.ts` (parseur/évaluateur) et
> l'en-tête de `Feature.richText` dans `src/data/schema.ts`. Tests :
> `src/lib/ui/featureRichText.test.ts`.

## Méthode

Balayage des champs `text` (source verbatim) de toutes les capacités, à la
recherche des notations qui demandent un traitement de présentation autre que du
texte littéral. Les `text` ont été transcrits du PDF avec une notation d'auteur
(`[10 + rang]`, `CHA minutes`, `[Niveau × 5]`…) qui préfigure le balisage ; le
recensement formalise cette notation en grammaire `richText`.

## Cas déjà couverts par PER-64 (rappel)

| Cas | Balisage | Rendu |
|---|---|---|
| Dé (fixe ou évolutif) | `{1d4°}`, `{d6}`, `{2d6}` | icône de dé ; `°` = dé évolutif rendu à sa face au niveau courant |
| Formule additive (modificateur) | `[FOR + 1]`, `[CHA]`, `[1d4° + CHA]` | encadré : total signé + détail, ou dé(s) + stats résolues |
| Référence de stat (sans valeur) | `@FOR`, `@CHA` | puce mise en avant, sans calcul (renvoi, pas modificateur) |

## Spécificités recensées (par catégorie)

### 1. Stat utilisée comme quantité brute (≠ modificateur additif)

La caractéristique donne **un nombre** (durée, portée, nombre de cibles…), pas un
bonus à ajouter à un d20. Doit s'afficher en **valeur brute** (« 5 minutes »), pas
« CHA (+5) minutes ».

- **Durées** : « pendant `CHA` minutes » (Serviteur invisible, p. 96), « `INT`
  minutes », « `PER` minutes », « `CON` minutes », « `VOL` minutes », « `CHA`
  rounds », « `CHA` heures », « `PER` heures », « `INT` heures », « `INT` rounds »,
  « `PER` rounds », « `VOL` minutes ». **Très fréquent** sur les sorts.
- **Portées / distances** : « mur d'une épaisseur maximale de `VOL` mètres »
  (Passe-muraille, p. 121).
- **Nombres de cibles / éléments** : « jusqu'à un allié **par point de `CHA`** »
  (Porte dimensionnelle, p. 96), « soigner une créature **par point de `CHA`** »
  (p. 125). Sémantiquement = la valeur de la stat (un compte).

→ Balisage **`[=CHA]`** (quantité). Voir § format.

### 2. Stat avec multiplicateur

- « portée de `CHA × 100` m » (Murmures dans le vent, p. 93).
- « distance maximale de `PER × 10` km » (Porte végétale, p. 117).

→ Balisage **`[=CHA × 100]`** → « 500 » (info-bulle « CHA × 100 = 500 »). L'unité
(`m`, `km`) reste en texte littéral juste après.

### 3. Rang comme valeur

- Quantité : « pendant `[rang]` rounds » (Arme de mana, p. 96).
- Dans une formule additive : « difficulté `[10 + rang]` » (Mur de vent, p. 168),
  « Défense `[13 + rang dans la voie]` » (Panthère, p. 115), « `[10 + rang]` »
  (Arbre animé).
- Bonus additif inline aux tests : « ajoute son **rang + 2** aux tests de … »
  (récurrent : barbare p. 79, druide p. 116, prêtre p. 124, forgesort p. 99…).
- Multiplicateur « par rang » : « 50 kg **par rang** » (Télékinésie, p. 93), « 2 m
  de côté **par rang** » (Sort illusoire, p. 95), « 1 PV supplémentaire **par
  rang** » (Vigueur, p. 79), « une personne **par rang** » (Nature nourricière).

→ Le terme **`rang`** devient évaluable dans les formules et les quantités
(`[10 + rang]`, `[=rang]`, `[=rang + 2]`, `[=2 × rang]`).

### 4. Niveau comme valeur

- « Points de vigueur `[Niveau × 5]` » (Mâle alpha, p. 72 ; Arbre animé), « `[10 +
  Niveau × 4]` » (combattants), « `[10 + niveau × 6]` » (Drake), « `[niveau du
  druide × 4]` » (Panthère).
- « absorbé `[niveau du magicien × 3]` DM » (Armure de pierre, p. 104).
- « pendant `[niveau du druide]` rounds » (Animation d'un arbre).
- Multiplicateur « par niveau » : « 5 PV **par niveau** » (voies de prestige),
  « 1 m³ **par niveau** » (Armure de pierre / modelage).

→ Le terme **`niveau`** devient évaluable (`[niveau × 3]`, `[=niveau × 5]`).

### 5. Stat d'UNE AUTRE créature (cible / adversaire) — NE PAS évaluer

Cas piège : la stat ne désigne **pas** le personnage joueur mais une cible ou un
adversaire, dont l'éditeur ne connaît pas les caractéristiques. Ces valeurs ne
doivent **jamais** être calculées contre le joueur.

- « difficulté `[10 + CON de la cible]` » (Saignements, p. 109).
- « remplace la DEF par `10 + AGI de la cible` » (Flèche intangible, p. 137).
- « `[10 + NC de la créature]` » (arquebusier, p. 62), « FOR de la cible »
  (Mon armure est une arme, p. 85), « niveau de la cible ».

→ **Rester en référence non calculée** : baliser la stat en **`@CON`** (puce, sans
valeur) et garder le reste en texte littéral. Ne **pas** utiliser `[…]`/`[=…]` qui
calculeraient contre le joueur. Documenté comme règle de population.

### 6. Stat du joueur avec suffixe descriptif

Le `text` source écrit souvent « `CHA` de l'ensorceleur », « `CHA du prêtre` »,
« rang dans la voie », « niveau du magicien ». Le suffixe (« de l'ensorceleur »,
« du prêtre », « dans la voie ») est **implicite** (c'est le joueur) : au balisage,
on le **retire** et on écrit `[12 + CHA]`, `[=rang]`, `[niveau × 3]`. (Le parseur
rejette un terme inconnu comme « l'ensorceleur » et retomberait en littéral.)

### 7. Cas déjà gérés / hors périmètre

- **Dés conditionnels / par paliers** (« 1d6 rounds », « 2d4° par round », « à 1d6
  km près ») : ce sont des dés simples, couverts par `{…}` (PER-64). Le caractère
  « conditionnel » relève du texte, pas du dé lui-même.
- **Valeurs qui montent par rang** décrites en prose (« ce bonus passe à +2 au rang
  5 », « augmente de +1 aux rangs 3 et 5 ») : **texte littéral**. Pas de balisage —
  c'est une description de palier, pas une valeur à calculer à un instant donné.
- **Bonus au choix**, coûts en mana, immunités : relèvent de `effects` / des
  tickets de population, pas de la couche de présentation `richText`.
- **Texte littéral** (« une AGI et une INT de +0 ») : déjà correct, pas de balisage.

## Format final (extensions PER-90)

Trois extensions, rétrocompatibles avec PER-64 :

### a. Nouveaux termes : `rang` et `niveau`

Évaluables partout où une caractéristique l'est (formules `[…]` et quantités
`[=…]`). `niveau` = niveau du personnage ; `rang` = **rang ATTEINT dans la voie
hôte** (le plus haut rang acquis par le personnage dans cette voie), c.-à-d.
« son rang » qui grandit avec la progression — et **non** le rang figé de la
capacité (`Feature.rank`). Exemples : `[10 + rang]`, `[niveau × 3]`.

> **Règle de population (rang).** Dans les textes, « son rang » / « rang dans la
> voie » désigne toujours le rang ATTEINT dans la voie courante → baliser avec le
> terme `rang` (résolu dynamiquement par le rendu via le rang de la voie). Si le
> texte qualifie autrement (« rang **du sort** », « rang de la cible »…), ce n'est
> PAS ce `rang`-là : laisser en texte littéral. Le rendu résout `rang` au plus
> haut rang acquis dans la voie hôte (cf. `pathRank`, aligné sur la couche
> `effects` `by: 'path-rank'`).

### b. Multiplicateur dans un terme

Un terme peut être un **produit** « variable × constante » (ou « constante ×
variable »), avec `×` (U+00D7) ou `*` ASCII : `CHA × 100`, `niveau × 3`,
`2 × FOR`, `rang × 5`. (Une seule variable par terme ; pas de produit de deux
variables — aucun cas dans le livre.)

### c. Quantité : `[= … ]`

Même grammaire d'expression que `[…]`, mais **rendue en valeur brute** (un compte /
une durée / une portée), sans signe ni encadré de modificateur :

| Balisage | Rendu | Info-bulle |
|---|---|---|
| `[=CHA]` | `5` | « Charisme (CHA) = 5 » |
| `[=CHA × 100]` | `500` | « CHA × 100 = 500 » |
| `[=rang]` | `3` | « Rang = 3 » |
| `[=niveau × 5]` | `25` | « niveau × 5 = 25 » |
| `[=rang + 2]` | `5` | « rang + 2 = 5 » |

À comparer avec `[CHA]` (modificateur) qui rend « CHA (+5) » dans un encadré signé.
**Règle d'usage** : `[=…]` quand la stat est une **quantité** (durée, portée,
nombre, PV) ; `[…]` quand c'est un **modificateur** ajouté à un d20 / un total signé.

L'**unité** (« minutes », « m », « km », « PV ») reste en texte littéral juste
après la quantité — non embarquée dans le balisage (évite la redondance et garde
le `text` lisible).

### d. Terme nommé (substantif) : `[# … ]`

`rang`/`niveau` employé comme **substantif** dans la phrase (pas comme un compte) :
rendu en **encadré « mot (valeur) »** (« rang (5) »), en teinte **verte**
(`success`) pour le distinguer de la quantité bleue (`[=…]`) et de la formule de
modificateur (primaire). Restreint à **`rang`/`niveau` seuls** (ni multiplicateur
ni opérateur — sinon repli en littéral).

| Balisage | Rendu inline | Info-bulle |
|---|---|---|
| `[#rang]` | `rang (5)` (encadré vert) | « Rang atteint dans la voie = 5 » |
| `[#niveau]` | `niveau (5)` (encadré vert) | « Niveau = 5 » |

**Règle d'usage : `[=rang]` vs `[#rang]`.** Le critère est le **rôle grammatical**
du mot dans la phrase, signalé par le déterminant :

- **`[=rang]` (quantité, nombre nu)** quand `rang`/`niveau` est un **compte / une
  durée / une portée** suivi d'une unité, et que le mot peut disparaître :
  « pendant `[=rang]` rounds » → « pendant **5** rounds » (lisible).
- **`[#rang]` (terme nommé, le mot)** quand la prose conserve un **déterminant qui
  réclame le nom** (« au rang », « le rang … atteint dans la voie », « son rang ») :
  « égal au `[=rang]` » donnerait « égal au **5** » (cassé) → utiliser
  « égal au `[#rang]` » → « égal au **rang** » (info-bulle « = 5 »).

Cas de référence dans `src/data/classes/mages.ts` : `illusions-r3` (Sort illusoire,
« maximum de cibles égal au `[#rang]` ») et le sort de lumière du magicien
(« le `[#rang]` atteint dans la voie »). À comparer avec `invocation-r3` (Arme de
mana, « pendant `[=rang]` rounds ») qui reste une quantité.

## Glossaire des acronymes (auto-détecté, SANS balisage)

Ajout post-PER-90 (population des mages). Source unique : `src/lib/ui/glossary.ts`
(rendu par `RichTextRun` dans `FeatureRichText.tsx`). Certains acronymes de règles
sont **reconnus automatiquement dans le texte littéral** — aussi bien les segments
texte d'un `richText` que le `text` verbatim de repli — **sans aucun balisage à
poser par le populateur**. Trois catégories :

- **Caractéristique** (`ability`) → puce neutre (comme un renvoi `@CODE`) : les 7
  codes `AGI`/`CON`/`FOR`/`PER`/`CHA`/`INT`/`VOL`.
- **Stat dérivée** (`derived`) → puce mise en avant (couleur dédiée) : `DEF`, `PV`,
  `PM`, `PC`, `DR`, `Init` (`Init`/`Init.` en casse mixte).
- **Jargon de règle** (`jargon`) → souligné pointillé + info-bulle : `NC`, `RD`,
  `DM`, `MJ`, `PJ`, `PNJ`.

Casse **SENSIBLE** (majuscules ; « def » en minuscules dans une phrase n'est pas un
acronyme). Ensemble **fermé et non ambigu**.

> **Règle de population (glossaire).** NE PAS baliser ces acronymes : ils sont
> rendus automatiquement, laisse-les en texte littéral. **Les 7 caractéristiques en
> prose sont elles aussi auto-reconnues** (puce neutre) — `@CODE` reste cependant
> utile et **équivalent** pour FORCER une puce, notamment pour le renvoi d'une stat
> de CIBLE qu'on ne calcule pas (cf. § 5) ; et dans une FORMULE `[CHA]`/`[=CHA]` la
> carac est un jeton **calculé** du parser, jamais du texte (aucun double
> traitement). Si un acronyme de règle récurrent manque au glossaire, l'**ajouter
> dans `glossary.ts`** plutôt que de le baliser au cas par cas.

## Démos de référence (modèle à copier pour la population)

Capacités déjà balisées à prendre comme **gabarit** lors de la population
(PER-69 → PER-74). Toutes dans **`src/data/classes/mages.ts`** (chercher l'`id`) :

- **`invocation-r1`** — Choc (p. 96) : formule avec dé évolutif + caractéristique
  `[1d4° + CHA]`, et référence de stat `@FOR` (test contre la cible). *Démo
  fondatrice PER-64* (dé, dé dynamique, encadré de formule, référence).
- **`invocation-r2`** — Serviteur invisible (p. 96) : quantité brute
  `pendant [=CHA] minutes` → « 5 minutes » ; et `@FOR` « égale au `[CHA]` »
  (mélange référence + encadré). *Démo PER-90 (stat-quantité).*
- **`air-r1`** — Murmures dans le vent (p. 93) : quantité avec multiplicateur
  `portée est de [=CHA × 100] m` → « 500 m » (info-bulle « CHA × 100 = 500 »).
  *Démo PER-90 (multiplicateur).*

Règle d'or de la population : conserver `text` verbatim intact, **ajouter**
`richText` ; en cas de cas de mise en forme non prévu par ce doc, le signaler
(`TODO(extraction)`) plutôt que d'inventer une notation — le balisage non reconnu
retombe de toute façon proprement en texte littéral.

## Stabilité

Le format couvre désormais : dés (fixes/évolutifs), formules additives, références
de stat, **quantités brutes**, **multiplicateurs**, **rang** et **niveau**, **termes
nommés** (`[#…]`) et **glossaire** d'acronymes auto-détectés. Les stats d'autres
créatures restent volontairement non calculées (référence `@`). Les tickets de
population PER-69 à PER-74 peuvent s'appuyer sur ce format sans risque de reprise.

### Journal des évolutions (post-figeage PER-90)

PER-90 a figé le socle (dés, formules, quantités, multiplicateurs, `rang`/`niveau`,
`@STAT`). Les ajouts suivants, faits pendant la **population des mages (PER-69)**,
sont **rétrocompatibles** (aucun balisage existant à reprendre) — ce doc reste la
**source de vérité unique** du format, à jour :

- **Glossaire des acronymes** (auto-détecté, sans balisage) — voir § dédié.
- **Terme nommé `[#rang]` / `[#niveau]`** (substantif, encadré « mot (valeur) »
  vert) — voir § d ; corrige le « égal au 5 » de `[=rang]` quand la prose garde un
  déterminant.

Toute future extension du format se documente ICI (et dans `featureRichText.ts` +
tests) ; les tickets de population pointent vers ce doc plutôt que de réénumérer les
cas (qui dériveraient).
