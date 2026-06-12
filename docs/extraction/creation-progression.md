# Notes d'extraction — Création du personnage (p. 20-37) & Progression et niveaux (p. 38-43)

Notes fidèles destinées au moteur de calcul, couvrant les règles **non capturées** par
`src/data/familles.ts`, `series.ts`, `progression.ts` et `ideaux-travers.ts`.
Les citations « entre guillemets » sont verbatim ; le reste est un condensé fidèle.

## 1. Les 15 étapes de création, dans l'ordre (encadré « La création de personnage (résumé) », p. 22)

1. Rôle (p. 20)
2. Profil (p. 22)
3. Peuple (p. 25)
4. Caractéristiques (p. 26)
5. Voies et capacités (p. 29)
6. Points de vigueur (p. 30)
7. Dé de récupération (p. 30)
8. Points de chance (p. 30)
9. Points de mana (p. 31)
10. Initiative (p. 31)
11. Équipement (p. 31)
12. Défense (p. 31)
13. Valeurs d'attaque (p. 32)
14. Dommages (p. 32)
15. Touche finale (p. 33)

## 2. Profil et familles (p. 22-25)

- « Chaque famille détermine les **points de vigueur (PV)** et éventuellement les **points
  de chance (PC)** et les **dés de récupération (DR)** associés » (p. 22).
- Chaque profil indique entre crochets ses **caractéristiques** les plus utiles « par ordre
  d'importance » et donne accès à des **capacités** réparties dans cinq **voies** (p. 23).
  → Les caracs conseillées par profil (champ `caracsConseillees`) sont bien listées entre
  crochets dans les descriptifs courts p. 24-25 ET dans les chapitres de profils.
- À la création, le personnage débute au **niveau 1** (p. 23).
- Familles (p. 23-25) :
  - **Aventuriers** : « vigueur intermédiaire (4 PV) », « 1 point de chance (PC) de plus »,
    armes de liste intermédiaire, armures légères (cuir ou cuir renforcé), caractéristique
    commune : l'Agilité. Profils : arquebusier, barde, rôdeur, voleur (p. 24).
  - **Combattants** : « vigueur élevée (5 PV) », très nombreuses armes, armures lourdes
    (cotte de mailles ou armure de plaque), caractéristique commune : la Force.
    Profils : barbare, chevalier, guerrier (p. 24).
  - **Mages** : « vigueur faible (3 PV) », « ne portent aucune armure (à l'exception du
    forgesort) », « 1 capacité de rang 2 en plus des capacités de rang 1 acquises par
    les autres personnages », caractéristique commune : l'Intelligence (remplacée par le
    Charisme pour l'ensorceleur). Profils : ensorceleur, forgesort, magicien, sorcier (p. 24-25).
  - **Mystiques** : « PV intermédiaires (4 PV) », « 1 dé de récupération (DR) de plus »,
    capacités de combat intermédiaires, caractéristique commune : la Volonté (VOL).
    Profils : druide, moine, prêtre (p. 25).
- Encadré **« Profils hybrides »** (p. 24) : mélanger les voies de plusieurs profils standard
  est possible (joueur averti, accord du MJ) — voir chapitre « Profils hybrides », p. 176.

## 3. Peuple (p. 25-26, 28)

- Huit peuples de base ; le choix du peuple a **deux conséquences mécaniques** (p. 26) :
  modification de deux valeurs de caractéristiques (**une seule pour les humains**) et ajout
  d'une **voie de peuple**.
- Table « Modificateur de peuple » (p. 28) — à choisir entre deux caractéristiques :
  | Peuple | Ajustement à la valeur |
  |---|---|
  | Demi-elfe | +1 PER ou CHA, -1 FOR ou CON |
  | Demi-orc | +1 FOR ou CON, -1 CHA ou INT |
  | Elfe haut | +1 INT ou CHA, -1 FOR |
  | Elfe sylvain | +1 AGI ou PER, -1 FOR |
  | Gnome | +1 INT ou PER, -1 FOR |
  | Halfelin | +1 AGI ou VOL, -1 FOR |
  | Humain | +1 à une des deux plus faibles carac. |
  | Nain | +1 CON ou VOL, -1 AGI |

## 4. Caractéristiques (p. 26-28)

- 7 caractéristiques : 4 physiques (AGI, CON, FOR, PER), 3 mentales (CHA, INT, VOL).
- « À la création, chaque caractéristique a une valeur comprise entre -2 à +5 » (p. 26) ;
  l'échelle générale des valeurs va de -3 (catastrophique) à +5 (extraordinaire, maximum
  pour un héros non humain à la création ; +4 = maximum pour un humain à la création) (p. 27).
- Les points de chance *découlent du CHA* ; l'INT détermine *l'attaque magique et les
  points de mana* (magicien, forgesort, sorcier) ; la VOL « détermine *l'attaque magique
  et les points de mana*, et est donc primordiale pour les lanceurs de sorts » (p. 27).
  La PER « détermine aussi l'ordre d'action en combat » (p. 26).
- Répartition libre des 7 valeurs de la série choisie ; conseil : affecter les trois
  meilleures valeurs aux trois caractéristiques du profil (p. 27).
- **Règle « Magie »** (p. 27) : « Si vous voulez que votre personnage pratique la magie,
  veillez à mettre au moins une valeur de +1 dans la caractéristique de magie
  correspondante (INT pour les sorts de magicien, de forgesort et de sorcier, CHA pour les
  sorts d'ensorceleur, de barde et de prêtre, PER pour les sorts de druide). »
- Encadré « Méthode rapide pour les débutants » (p. 28) : série expert, trois hautes
  valeurs aux trois caracs du profil, dernier +1 et -1 libres, les deux dernières à 0.
- Encadré « L'équité est différente de l'égalité » (p. 28) : sommes volontairement
  inégales — polyvalent +7, expert +6, spécialiste +5 (la spécialisation à haut niveau est
  plus gourmande en ressources).

## 5. Voies et capacités à la création (p. 29)

- Le personnage choisit **deux voies** parmi les cinq de son profil et reçoit
  **automatiquement la capacité de rang 1** de chacune.
- Il reçoit automatiquement une **troisième voie : la voie de peuple** associée au peuple
  choisi (rang 1 acquis automatiquement aussi).
- **Mages** (famille des mages) — en plus de leurs deux capacités de rang 1, ils choisissent :
  - « obtenir **une capacité de rang 2 de leur choix** dans l'une des deux voies de profil
    qu'ils ont choisie » ; ou
  - « obtenir **le rang 2 de la voie du mage** ».
- **Voie du mage** (p. 29, détail p. 60) : les profils issus de la famille des mages peuvent
  choisir la voie du mage **en remplacement de la voie de peuple**. « Le personnage qui
  choisit la voie du mage bénéficie toutefois des effets du rang 1 de la voie de peuple
  correspondant à son peuple (il peut le cocher sur sa feuille de personnage), mais il ne
  pourra pas acquérir les rangs suivants de cette voie. » Il est possible d'obtenir le
  rang 2 de la voie du mage (Maîtrise de la magie) dès le niveau 1 en y investissant le
  point de capacité supplémentaire des mages.

## 6. Formules dérivées (p. 30-32)

- **PV (niveau 1)** : « PV = (2 x PV de la famille) + CON » (p. 30). Table : aventuriers
  8 + CON, combattants 10 + CON, mages 6 + CON, mystiques 8 + CON.
- **DR (niveau 1)** : « chaque personnage reçoit [2 + CON] DR dont le type dépend de sa
  famille » ; mystiques : 1 DR de plus, soit [3 + CON] (p. 30). Types : aventuriers d8,
  combattants d10, mages d6, mystiques d8.
  - **Cas particulier CON négative** (p. 30, verbatim) : « un PJ ayant -2 en CON n'a pas
    de dé de récupération (2 – 2 = 0). Il ne peut donc pas régénérer ses PV en prenant une
    récupération rapide, mais seulement avec une récupération complète. Il doit alors
    toujours lancer le dé de récupération (il n'obtient pas le résultat maximal sur le dé). »
  - Notation sur la fiche : « DR : 4 d10 » (nombre + type).
- **PC** : « Chaque personnage reçoit [2 + CHA] points de chance (PC). » ; « les PJ de la
  famille des aventuriers gagnent 1 PC de plus que les autres profils » (p. 30).
  L'exemple p. 30 montre que la capacité de peuple peut en ajouter (Lhagva, humaine :
  2 - 1 = 1 PC, +1 PC de la voie de l'humain = 2).
- **PM** (p. 31) : seulement si le personnage possède au moins une capacité signalée par un
  astérisque (sort). « Total de points de mana = VOL + Nbre de sorts » (nombre de sorts
  appris).
- **Initiative** (p. 31) : « À la création du personnage, son Initiative est égale à
  [10 + PER]. » (des capacités peuvent l'augmenter, ex. Réflexes éclair +3).
- **Défense** (p. 31) : « La DEF d'un personnage est égale à : 10 + AGI + éventuels
  modificateurs de capacités et d'armure ».
- **Valeurs d'attaque** (p. 32) :
  - Attaque au contact = niveau + FOR
  - Attaque à distance = niveau + AGI
  - Attaque magique = niveau + VOL
  - « Ainsi, au niveau 1, les valeurs d'attaque sont les suivantes : Attaque au contact =
    1 + FOR ; Attaque à distance = 1 + AGI ; Attaque magique = 1 + VOL ».
- **DM** (p. 32) : « la FOR s'ajoute aux DM des armes de contact ; aucune valeur n'est
  ajoutée aux DM des armes à distance ; lorsqu'une attaque magique bénéficie d'un bonus
  aux DM, cela est précisé dans la description de la capacité. » Certaines capacités
  modifient cette règle générale (ex. ajouter la PER en attaque à distance).

## 7. Équipement à la création (p. 31)

- Sac d'aventurier (capturé dans `progression.ts`) + équipement indiqué par le profil.
- Échange possible d'un objet contre un objet de valeur similaire avec l'accord du MJ
  (sinon sacrifier un autre objet ou attendre de trouver un trésor en jeu).
- **Règle d'armure** (p. 31) : les armures sont classées « par ordre croissant de valeur
  de protection (et de limitation de l'AGI) ». « Lorsqu'un profil indique par exemple
  "peut porter jusqu'à la chemise de mailles", cela signifie que le personnage peut porter
  toutes les armures dont le bonus de Défense est inférieur ou égal à celui de la chemise
  de mailles. » Dans cet exemple, cela inclut le cuir, le cuir renforcé et la chemise de
  mailles.

## 8. Touche finale (p. 33-37)

- Nom, description, illustration ; idéal héroïque et travers : d20 sur la table p. 33
  (capturée dans `ideaux-travers.ts`) — relance possible, choix libre, ou deux idéaux /
  deux travers.
- **Interprétation des traits** (p. 33) : « Si votre interprétation d'un trait est
  particulièrement appropriée et qu'elle respecte les critères évoqués ci-après, votre MJ
  pourra vous récompenser par la récupération d'un **point de chance**. » Les traits ne
  doivent pas remplacer le libre arbitre ni servir de prétexte à un comportement trop
  caricatural ; ne pas saboter le plaisir des autres joueurs.
- **Origine et historique** (p. 34-35) : deux tables d20 de « secrets intimes » (Table 1
  p. 34, Table 2 p. 35), purement narratives (pas de mécanique — non extraites en données).
- **Âge, taille, poids** (p. 36) : tables « Âge et espérance de vie du personnage »
  (âge de départ / espérance de vie par peuple) et « Taille et poids du personnage »
  (taille moyenne / poids moyen par peuple) — données de peuples, à raccorder à
  `ReperesPeuple` lors de l'extraction du chap. 3.
- **Langues maîtrisées** (p. 36) — règles dépendant de l'INT, utiles au moteur :
  - Chaque personnage parle la langue officielle de la région où débutent les aventures
    (ou la langue humaine locale) en plus de la langue de son peuple ou de son ethnie.
  - INT +0 : « sait déchiffrer sa langue maternelle de façon hésitante ».
  - INT négative : ne sait pas lire ; pour apprendre à lire par la suite : « sacrifier
    1 point de capacité à cet effet ou augmenter sa valeur d'Intelligence ». Il sait parler
    la langue de son peuple, plus la langue commune des humains.
  - INT -2 : « ne parle que la langue de son peuple (souvent un patois dans le cas d'un
    humain) et à peine quelques mots dans la langue humaine officielle ».
  - INT positive : « peut parler, lire et écrire une langue supplémentaire **par point
    d'Intelligence** » (connue au départ ou apprise par la suite, si une occasion d'y avoir
    été exposé existe).
  - Encadré « Listes des langues » (p. 36) : commun, sylvestre, runique, noir parlé,
    draconique, célestien, argotien* (voleurs), profond, abyssal, aquarien.
    (*L'argotien : ne compte pas pour les langues si le profil principal du PJ n'est pas
    voleur ou barde.)
- **Talent secondaire** (p. 37, optionnel, si le MJ l'autorise) : remplacer une langue par
  un talent secondaire ou un loisir (instrument, échecs, calligraphie, cuisine…). « ne
  procure aucun bonus en combat » ; « apporte un bonus de +3 sur les tests concernés
  (considéré comme un bonus de voie de peuple dans le cadre d'un cumul) ».
- **Fiches d'exemple** (p. 37), utiles comme jeux de tests du moteur :
  - Lhagva, barbare niveau 1 (humaine) : AGI +1, CON +2, FOR +3, PER +1, CHA -1, INT +0,
    VOL +1 ; DR 4d10, PC 2, DEF 16, PV 15, INIT 14 ; attaque contact +4, distance +2,
    magique +2 ; voies : pourfendeur 1, rage 1, humain 1.
  - Ionas, ensorceleur niveau 1 (elfe haut) : AGI +1, CON +1, FOR -2, PER +0, CHA +4,
    INT +0, VOL +2 ; DR 3d6, PC 6, PM 5, DEF 12, PV 7, INIT 11 ; attaque contact -1,
    distance +2, magique +3 ; voies : air 1, invocation 1, mage 1.

## 9. Passage de niveau (p. 38)

À chaque passage de niveau, le personnage :

- « augmente ses **PV** selon son profil (voir tableau) » — table « Gain de PV par
  niveau » p. 39, capturée dans `familles.ts` ;
- « augmente toutes ses **valeurs d'attaque de +1** (jusqu'au niveau 10) » ;
- « gagne **2 points de capacité** » ;
- « augmente ses **PM** (s'il dispose de sorts) » — voir §13.

Dés évolutifs : « à partir du niveau 6 et tous les 3 niveaux, son dé évolutif (d4°) »
augmente : d4 devient d6 au niveau 6, d8 au niveau 9, etc. (table p. 43, capturée dans
`progression.ts`).

Encadré « Temps d'apprentissage "réaliste" » (p. 38) : narratif (un mois par rang en
solitaire / une semaine par rang avec un maître) — sans impact moteur.

## 10. Changement rétroactif de Constitution (p. 39)

Verbatim : « si, durant le jeu, la valeur de Constitution d'un personnage change, ses
points de vigueur changent **rétroactivement** pour chaque niveau déjà acquis, que ce
soit en plus ou en moins. » Exemple : en passant au niveau 8, Lhagva choisit Constitution
héroïque (CON +1) et gagne immédiatement 8 PV supplémentaires (+1 par niveau déjà acquis).

→ Règle moteur : les PV se recalculent toujours depuis la CON courante, pas depuis un
historique de gains.

## 11. Achat de capacités (p. 39-40)

- « Il n'est pas possible de mettre de côté des points de capacités, ils doivent être
  immédiatement dépensés. »
- Coûts : rang 1 et 2 → 1 point chacune ; rang 3 et plus → 2 points chacune (p. 39).
- « pour choisir une capacité de rang supérieur à 1, le personnage doit déjà avoir acquis
  toutes les capacités de rang inférieur de cette voie » (p. 39).
- Niveau minimal par rang : table p. 39 (capturée dans `progression.ts`), avec l'exception
  mage « 2* » (rang 2 dès le niveau 1, sans accès anticipé au rang 3).
- **Voie de peuple** (p. 39-40) : « le premier rang de la voie de peuple est gratuit pour
  tous les personnages. Les rangs suivants sont acquis selon la règle générale en
  dépensant des points de capacités. »
- **Capacité de peuple prise dans une voie de profil** (p. 39) : « Certaines capacités de
  peuple vous permettent de choisir une capacité dans une autre voie. Si vous choisissez
  une capacité dans une voie de votre propre profil (par exemple un demi-orc guerrier),
  cochez cette capacité et considérez-la comme déjà acquise dans la voie, notamment pour
  déterminer si vous pouvez choisir les capacités de rang plus élevé par la suite. Bien
  entendu, vous n'obtenez pas deux fois le bonus qu'elle apporte ! » L'exemple 1 (p. 39-40)
  confirme : pour obtenir le rang 2 d'une voie déjà « cochée » via le peuple, il suffit de
  payer le rang 2.
- L'exemple 2 (p. 40) : il n'est pas possible de dépasser le niveau requis — au niveau 2,
  impossible d'acquérir un rang 3 ; on peut acheter rang 1 + rang 2 d'une nouvelle voie
  (1 + 1 point) ou 1 rang 2 et garder… non : les 2 points doivent être dépensés (rang 2 à
  1 point et un autre rang à 1 point, ou un rang 3 à 2 points si niveau 3+).
- **Point de capacité orphelin** (p. 40) : si un PJ a acquis toutes les capacités possibles
  de rang 1 et 2 sauf une, et qu'en achetant la dernière capacité de rang 2 (1 point) il
  lui est impossible de dépenser son second point (plus rien d'achetable à ce niveau),
  « il peut échanger le point de capacité orphelin (sans dépenser ses deux points) contre :
  **1 point de chance** ou **1 dé de récupération** ou **2 points de vigueur** ou
  **2 points de mana** supplémentaires. »

## 12. Appel à une capacité d'une autre voie (p. 40-41)

- Quand une capacité d'une voie A propose de choisir une capacité d'une autre voie B,
  celle-ci « évolue selon le rang » : c'est **le rang atteint dans la voie A** qui est
  utilisé. Exemple (p. 40-41) : Enfant de la forêt (voie de peuple, rang 2) permet de
  choisir Vitesse du félin (voie du fauve, rôdeur) — le bonus « rang + 2 » utilise le rang
  atteint dans la voie de peuple (soit +4 à ce moment-là), et le +2 en DEF prévu « au
  rang 5 » s'applique au rang 5 de la voie de peuple.
- **Poupées russes** (p. 41) : « lorsqu'une capacité permet de choisir une autre capacité
  […], il n'est pas possible de choisir une capacité qui permet de choisir elle-même une
  capacité » (pas de chaînage).
- **Armures autorisées** (p. 41) : « lorsqu'une capacité d'une voie A vous permet de
  choisir une capacité d'une voie B, ce sont les limitations d'armure qui correspondent à
  la capacité de la voie B qui s'appliquent. Lorsqu'il existe des exceptions, elles sont
  indiquées dans le texte de la capacité de la voie A. »
- **Sorts** (p. 41) : « si la capacité appelée est un sort, la caractéristique de magie
  utilisée est celle du profil dont est issu le sort » (ex. un chevalier qui apprend une
  capacité de druide utilisera sa Perception). « le coût du sort en points de mana est
  toujours calculé à partir du rang habituel du sort » (un sort de rang 1 appris via une
  capacité de rang 5 coûte toujours 1 PM). « Apprendre un sort, même par une autre
  capacité, rapporte toujours 1 point de mana au personnage. »

## 13. Nouvelles voies, plafond de voies, voies de prestige, PM (p. 41-42)

- **Nouvelles voies** (p. 41) : dès le niveau 2, dépenser les points pour : obtenir de
  nouvelles capacités dans les voies choisies au niveau 1 ; ouvrir de nouvelles voies parmi
  les cinq voies du profil principal ; ouvrir de nouvelles voies issues d'un autre profil
  (= création d'un **profil hybride**, chapitre p. 176 ; le MJ peut exiger un événement de
  jeu / mentor, sauf orientation naturelle au vu du vécu).
- **Plafond** (p. 42, verbatim) : « Au total, un personnage ne peut jamais posséder plus de
  **six voies, plus la voie de peuple**. »
- **Voies de prestige** (p. 42) : « À partir du niveau 5, un personnage peut choisir une
  voie de prestige. » Voies spécifiques à chaque famille + voies de prestige génériques ;
  le PJ choisit dans la liste de la famille de son profil principal ou parmi les génériques
  (chapitre « Voies de prestige », p. 128). « un PJ ne peut donc prendre qu'une seule voie
  de prestige durant toute sa carrière ». Chaque voie de prestige :
  - « est constituée de cinq rangs, échelonnés du rang 4 jusqu'au rang 8 » ; table
    « Voies de prestige – niveau requis » (p. 42) : rang 4 → niveau 5, 5 → 7, 6 → 9,
    7 → 11, 8 → 13 ;
  - « octroie son propre bonus de vigueur, […] utilisé lorsqu'un personnage choisit une
    capacité de cette voie lors d'un changement de niveau » ;
  - **Prérequis** : certaines voies de prestige nécessitent la possession préalable d'une
    capacité particulière ; en général la seule condition d'accès est un prérequis
    d'interprétation (action accomplie ou événement vécu, jugé par le MJ).
- **Points de mana** (p. 42) : « Les points de mana n'augmentent pas automatiquement
  lorsqu'un PJ gagne un niveau. En revanche, un PJ […] acquiert automatiquement 1 PM par
  nouveau sort appris lors du changement de niveau. **Total des PM = nombre de capacités
  de sorts + VOL**. » (1 PM par capacité de sort connue.)

## 14. Dés évolutifs et changement d'orientation (p. 43)

- **D4°, les dés évolutifs** : le symbole « ° » accolé à « d4 » indique que le dé est
  évolutif avec l'expérience du personnage : la capacité s'améliore au niveau 6, puis tous
  les trois niveaux (d4 → d6 au niveau 6, d8 au 9, d10 au 12, d12 au 15+ — table
  « Niveau d'acquisition des dés évolutifs », capturée dans `progression.ts`).
- **Changement d'orientation / oubli de capacité** (p. 43) :
  - « À chaque passage de niveau, le personnage peut "oublier" une capacité et la remplacer
    par une autre en suivant les règles normales de progression des voies. Un personnage
    avec au moins +2 en INT peut oublier et remplacer jusqu'à deux capacités par niveau. »
  - « Il n'est pas possible d'oublier une capacité acquise automatiquement et gratuitement
    (voie de peuple). » Si le personnage a atteint le rang 5 d'une voie, il ne peut pas
    oublier le rang 3 directement : « Il doit oublier le rang 5 puis le rang 4 et enfin le
    rang 3, et il est impossible de construire des voies à trous. »
  - « il n'est pas possible d'oublier sa jeunesse, c'est-à-dire d'oublier toutes les
    capacités du profil principal du PJ. Un personnage doit donc toujours conserver les
    deux capacités de rang 1 qu'il a acquises au niveau 1. »

## TODO / anomalies

- `TODO(extraction)` : **niveau maximum jouable** introuvable p. 19-43 (indices : table des
  rangs → niveau 13, attaque plafonnée au niveau 10, dés évolutifs « 15+ », mention
  anecdotique « du niveau 1 à niveau 12 ! » p. 38). `niveauMax: 20` posé par défaut dans
  `progression.ts`.
- Anomalie schéma : le commentaire de `ReglesProgression.niveauMinParRang` dans
  `schema.ts` indique « 2→1 », mais la table p. 39 donne **rang 2 → niveau 2** (« 2* »,
  l'astérisque renvoyant à l'exception des mages au niveau 1, qui ne se prolonge pas
  au-delà du niveau 2). Les données suivent le livre.
