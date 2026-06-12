# Magie et sorts — notes moteur (extraction CO2)

> **Source** : `CBHS_06_Chroniques_Oubliees_2_web_v2.pdf`, partie II, chapitre 3 « Magie et sorts », pages 227 à 230.
> **Statut** : extraction fidèle, citations verbatim. Destiné au moteur de calcul/validation (J3), pas du code.
> **Anomalie de pagination** : la page 230 est une illustration pleine page sans aucun texte de règle ; toutes les règles de ce chapitre (y compris la récupération des PM) tiennent sur les pages 227 à 229.

---

## 1. Qu'est-ce qu'un sort ? (l'astérisque)

> « La magie est un aspect important d'un jeu de fantasy. Tout ce qui ne semble pas issu des lois de la nature, telles que nous les connaissons sur Terre, est sans doute magique. Toutefois, tout ce qui est magique n'est pas un sort. Par exemple, la capacité de moine, Course des airs, lui permet de courir sur les murs, voire sur l'eau. Elle est assurément magique, mais ce n'est pas un sort. » — p. 227

> « Les sorts sont toutes les capacités qui sont signalées par un astérisque (*) après leur nom. » — p. 227

**Note moteur** : flag booléen `isSort` sur chaque capacité = présence de l'astérisque après le nom dans le livre. Magique ≠ sort : seules les capacités à astérisque sont soumises aux règles de ce chapitre (PM, incantation, armure, etc.).

## 2. Lancer un sort — décomposition

> « Lancer un sort peut se faire (techniquement parlant) de plusieurs façons différentes (par exemple, un test d'attaque magique contre la DEF de la cible, ou un test d'attaque magique en opposition) qui sont décrites dans les capacités concernées. » — p. 227

> « On peut décomposer le lancement d'un sort de la façon suivante :
> - incantation ;
> - dépense de points de mana ;
> - effet ;
> - durée du sort. » — p. 227

**Note moteur** : le mode de résolution (attaque magique vs DEF, opposition, automatique…) est défini capacité par capacité — pas de règle générale à coder ici.

## 3. Incantation

> « Lancer un sort demande une incantation basée sur une composante vocale (formules magiques) et une composante gestuelle (mouvement des mains et des bras, voire davantage). Un lanceur de sort a besoin de pouvoir parler et d'avoir les mains libres pour incanter. » — p. 227

### 3.1 Magie profane

> « La magie profane nécessite d'avoir au moins une main libre pour réaliser la composante gestuelle de l'incantation. Si le lanceur de sort tient une arme à deux mains, comme c'est le cas du bâton des magiciens, il suffit d'appuyer l'arme au sol en la tenant d'une seule main au moment où un sort est lancé. En revanche, il n'est pas possible d'utiliser un bouclier et une arme ou une arme dans chaque main tout en lançant des sorts de magie profane. » — p. 227

### 3.2 Magie divine

> « La magie divine n'est pas soumise à la même exigence, mais il est nécessaire de respecter les obligations morales qu'elle impose, c'est-à-dire de se restreindre à la liste d'armes auxquelles la voie est associée. Masse et marteau, plus une éventuelle arme de culte pour le prêtre. Bâton, épieu, etc. pour le druide. Sinon, l'entité qui accorde le sort ne répondra pas à la prière. » — p. 227

**Note moteur** :
- Profane : exige ≥ 1 main libre (arme à 2 mains tolérée si appuyée au sol ; interdit bouclier + arme, ou deux armes).
- Divine : pas de contrainte de main libre, mais armes limitées à la liste de la voie (prêtre : masse, marteau + arme de culte ; druide : bâton, épieu, etc.) — sinon le sort échoue (l'entité « ne répondra pas »).
- La répartition profane/divine par profil n'est pas listée sur ces pages (prêtre et druide cités comme divins ; magicien comme profane). `TODO(extraction)` : confirmer le type de magie de chaque profil lanceur (ensorceleur, sorcier, forgesort, barde…) dans leurs chapitres respectifs.

### 3.3 Durée de l'incantation (type d'action)

> « Durée de l'incantation. Dans Chroniques Oubliées Fantasy, l'incantation d'un sort est relativement rapide. Selon la capacité, elle va nécessiter un type d'action spécifique (A, L, G ou M) ; » — p. 227
> « dans tous les cas, lancer un sort s'effectue dans le cadre d'un round de combat. » — p. 228

> « Il est tout à fait possible de lancer plusieurs sorts par round, si le type d'action requis le permet. Par exemple, si un sort peut être lancé en action mouvement et un autre en action d'attaque, alors le magicien peut lancer ces deux sorts dans le même round, tant qu'il peut payer le coût en PM. Les sorts de rang 1 et 2 peuvent ainsi voir leur coût réduit à 0. » — p. 228

**Note moteur** : chaque sort porte un type d'action ∈ {A (attaque), L (limitée), G (gratuite), M (mouvement)} défini dans sa capacité. Plusieurs sorts par round possibles si les types d'action sont compatibles avec l'économie d'actions du round et que les PM suffisent. La dernière phrase (« coût réduit à 0 ») renvoie vraisemblablement à la Concentration accrue (§ 5) — voir Questions ouvertes.

## 4. Dépenses de points de mana

> « Lancer un sort coûte un nombre de points de mana égal au rang de la capacité à laquelle il est associé. » — p. 228

> « Lorsqu'un lanceur de sort n'a plus ou pas assez de points de mana, il ne peut tout simplement plus lancer de sort, sauf s'il a recours à l'option brûlure de mana. » — p. 228

> « Exemple : Au niveau 1, Ionas connaît deux sorts de rang 1 et un sort de rang 2. Il a donc 3 PM auxquels il ajoute sa VOL de +2 pour un total de 5 PM. Ionas dépense 1 PM pour lancer chaque sort de rang 1 et 2 PM pour son sort de rang 2. » — p. 228

**Note moteur** :
- Coût en PM = rang de la capacité du sort.
- L'exemple révèle la formule du capital de PM : somme des rangs des sorts connus + VOL (1 + 1 + 2 + 2 = 5). `TODO(extraction)` : la règle générale du calcul des PM max est définie ailleurs (chapitre création/caractéristiques) — à confirmer avec sa page source avant de coder.
- PM insuffisants → lancement interdit (sauf brûlure de mana).

### 4.1 Brûlure de mana

> « Lorsqu'il n'a plus de points de mana, un personnage peut choisir de sacrifier son énergie vitale pour continuer à lancer des sorts. Pour chaque PM dépensé, il subit des DM égaux à son dé de récupération (DR).
> **PV perdus = 1 DR par point de mana du sort**
> Aucune RD ne s'applique à cette perte de PV. » — p. 228

> « Exemple : un magicien, qui est à 0 PM, a besoin de 2 PM pour lancer un sort. Son dé de récupération étant le d6, il doit sacrifier 2d6 PV. Il lance les dés et obtient 2 et 5 pour un total de 7 PV perdus.
> Un guerrier-magicien (profil principal guerrier, le DR est donc le d10) à court de mana sacrifie 2d10 PV pour obtenir 2 PM. Il lance les dés et obtient 3 et 9 pour un total de 12 PV perdus. » — p. 228

> « Attention, il est impossible d'utiliser la brûlure de mana pour lancer un sort de soins. » — p. 228

**Note moteur** :
- Déclencheur : « lorsqu'il n'a plus de points de mana » (PM à 0). Voir Questions ouvertes pour le cas PM partiels.
- Coût : 1 jet de DR en PV par PM manquant ; ignore la RD ; le DR utilisé est celui du personnage (donc celui du profil principal pour un hybride).
- Interdiction absolue : pas de brûlure de mana pour un sort de soins.

## 5. Concentration accrue

> « Lorsqu'il utilise un sort qui nécessite une action d'attaque (A) pour être lancé, le personnage peut se concentrer plus longtemps pour réduire le coût du sort de 2 PM : le sort devient une action limitée (L). » — p. 228

> « Les sorts qui n'utilisent pas une action d'attaque pour être lancés ne peuvent pas bénéficier de la concentration. » — p. 228

> « Les sorts qui indiquent une action limitée (L), une action de mouvement (M) ou une action gratuite (G) ne peuvent pas bénéficier de l'effet d'une concentration pour être lancés. Ils ont donc un coût égal à leur rang qui ne peut pas être réduit par cette option. » — p. 228

**Note moteur** : option uniquement pour les sorts de type A : coût = max(rang − 2, 0 ?) et l'action devient L. Le plancher exact (0 possible ?) n'est pas écrit ici, mais p. 228 (« Les sorts de rang 1 et 2 peuvent ainsi voir leur coût réduit à 0 ») confirme qu'un coût de 0 PM est atteignable — donc coût = max(rang − 2, 0).

## 6. Effets

> « Les effets de chaque sort sont décrits précisément dans la capacité éponyme. Toutefois, nous vous proposons ici quelques informations complémentaires concernant la variation des effets en fonction du niveau des cibles et du nombre de fois qu'un sort est lancé sur une même cible. Nous évoquerons également le cas particulier des sorts de zone. » — p. 228

### 6.1 Niveau des cibles

> « De nombreux sorts voient leur effet varier en fonction du niveau de la cible. On se reporte alors indistinctement au niveau ou au NC de la cible. On parle de niveau lorsqu'il s'agit d'un PJ et de NC (niveau de créature) pour les adversaires des PJ. » — p. 228

> « Exemple : si un sort indique qu'il fait effet contre les cibles d'un NC inférieur au niveau du PJ, alors un PJ de niveau 6 peut lancer ce sort sur toute créature de NC 5 ou moins, ou sur un autre PJ de niveau 5 maximum. » — p. 228

**Note moteur** : pour toute condition de sort portant sur le « niveau » de la cible : niveau (PJ) et NC (créature) sont interchangeables.

### 6.2 Sorts de zone

> « Dans un combat, il est presque impossible de lancer un sort de zone (Feu grégeois, Explosion de feu, etc.) sur un adversaire sans toucher un allié engagé au corps à corps avec la cible. » — p. 228

> « Ne laissez pas un joueur vous persuader du contraire parce que, sur le plan, il peut dessiner un cercle dont la limite passe au bon endroit. Un combat est dynamique et les adversaires sont sans cesse en mouvement, ce type de précision est illusoire. » — p. 229

> « Dans cette configuration, le PJ qui utilise l'attaque de zone peut choisir entre deux options.
> - **Il privilégie sa cible.** La cible subit les DM normaux. L'allié à son contact subit aussi les DM du sort, mais il bénéficie d'un bonus de +5 au test d'AGI pour diviser les DM par deux.
> - **Il privilégie son allié.** L'allié ne subit aucun DM. Dans ce cas, une cible à son contact divise les DM par deux si elle rate son test d'AGI et ne subit aucun DM si elle le réussit. » — p. 229

**Note moteur** : règle de table (résolution en jeu) plus que de fiche — hors périmètre du calcul de fiche, à documenter pour un éventuel simulateur de combat.

### 6.3 Rendement décroissant

> « De nombreux sorts ont un effet décroissant lorsqu'ils visent la même cible de façon répétée durant un combat. Cela simule tout simplement que la cible s'adapte et résiste mieux. Il s'agit de tous les sorts qui nécessitent un test opposé d'attaque magique (les sorts de contrôle mental, par exemple) ou ceux qui provoquent un état préjudiciable (par exemple, Renversé ou Étourdi). » — p. 229

> « La cible obtient un bonus cumulatif de +5 au test pour résister à la capacité, que ce soit au test opposé d'attaque magique ou au test de caractéristique pour résister à l'effet préjudiciable. » — p. 229

> « L'effet de rendement décroissant ne concerne pas les tests d'attaque magique contre la DEF d'un adversaire et les DM infligés (par exemple, un sort de flèche de feu, une Explosion de feu, etc.). » — p. 229

**Note moteur** : +5 cumulatif par tentative répétée sur la même cible durant un combat, uniquement pour : (a) sorts à test opposé d'attaque magique, (b) sorts infligeant un état préjudiciable. Jamais pour les attaques magiques contre la DEF ni pour les DM.

## 7. Durée du sort

> « La durée d'un sort est précisée dans la capacité éponyme. Toutefois, il peut prendre fin prématurément si le lanceur de sort le souhaite ou s'il perd connaissance. » — p. 229

### 7.1 Magicien inconscient

> « Lorsqu'un lanceur de sort perd conscience, les sorts qu'il a lancés (sauf les sorts permanents) cessent de faire effet. Ainsi éliminer le lanceur de sort reste un bon moyen pour une créature de se débarrasser du sort qui lui a été lancé. » — p. 229

### 7.2 Mettre fin à un sort

> « Si rien dans la capacité ne précise le contraire, un lanceur de sort peut mettre fin à un sort en une action gratuite. » — p. 229

**Note moteur** : fin de sort = durée écoulée, OU volonté du lanceur (action gratuite par défaut), OU perte de conscience du lanceur (sauf sorts permanents).

## 8. Récupérer les points de mana

> « Une fois par jour, le personnage regagne l'ensemble des PM dépensés lorsqu'il termine une récupération complète (8 h). Durant cette période, il doit prendre au moins une demi-heure pour réviser ses sorts, méditer ou prier selon la nature de sa magie. Le MJ a toute latitude pour ne rendre qu'une partie des PM (la moitié, par exemple) en cas de stress, d'inconfort ou de combat en pleine nuit. » — p. 229

> « Dans le cas des prêtres, la récupération des PM est liée au comportement du personnage : il ne récupère ceux-ci que si ses actions et l'utilisation de ses sorts étaient en accord avec les préceptes de son dieu. Le MJ à toute latitude pour ne rendre qu'une partie de ceux-ci, voire aucun, si le PJ n'a pas suivi le dogme de sa religion. Il en va de même pour un druide qui aurait meurtri la nature. » — p. 229
> *(« Le MJ à toute latitude » : coquille du livre, lire « a ».)*

> « Grimoire de magicien. Si un magicien a égaré son grimoire et qu'il ne peut pas y réviser ses sorts, leur coût est doublé jusqu'à ce qu'il puisse à nouveau réviser. Ainsi, un sort de rang 3 aura un coût de 6 PM. Si le grimoire est définitivement perdu, le magicien peut en rédiger un autre au prix d'une journée de travail et 10 pa par rang de sort inscrit. Il lui faut le matériel d'écriture et un grimoire vierge qu'il ne pourra trouver que dans une cité de taille respectable, dans une académie de magie ou peut-être chez un confrère (déjà comptabilisé dans le coût de 10 pa par rang). » — p. 229

**Note moteur** :
- Récupération : 1×/jour, récupération complète de 8 h incluant ≥ 30 min de révision/méditation/prière → tous les PM dépensés sont regagnés. Modulation MJ possible (partielle) selon les conditions.
- Prêtre : récupération conditionnée au respect des préceptes (MJ : partielle voire nulle). Idem druide ayant « meurtri la nature ».
- Magicien sans grimoire : coût des sorts doublé (rang × 2 PM) tant qu'il ne peut pas réviser. Réécriture d'un grimoire perdu : 1 journée + 10 pa par rang de sort inscrit (matériel inclus dans ce prix, disponible seulement en cité importante/académie/confrère).
- La page 230 ne contient aucune règle (illustration pleine page).

---

## Questions ouvertes

1. **« Les sorts de rang 1 et 2 peuvent ainsi voir leur coût réduit à 0 » (p. 228)** : cette phrase clôt le paragraphe sur les sorts multiples par round, mais le mécanisme de réduction (−2 PM) n'est décrit que dans « Concentration accrue » juste après. Interprétation retenue : elle anticipe la concentration accrue (rang 1 ou 2 − 2 PM = 0) et confirme le plancher à 0. À valider.
2. **Brûlure de mana avec PM partiels** : le texte dit « Lorsqu'il n'a plus de points de mana » et « n'a plus ou pas assez ». Peut-on mixer (payer une partie en PM restants et brûler le reste) ? L'exemple ne couvre que le cas 0 PM. `TODO(extraction)` / décision à arbitrer.
3. **Formule des PM maximum** : déduite de l'exemple Ionas (somme des rangs des sorts connus + VOL) mais la règle générale n'est pas sur ces pages. `TODO(extraction)` : trouver la page source exacte (chapitre création / profils).
4. **Types d'action A, L, G, M** : utilisés ici mais définis dans le chapitre des règles de combat — à extraire séparément.
5. **Magie profane vs divine par profil** : seuls prêtre et druide (divins) et magicien (profane, bâton) sont cités. Classer chaque profil lanceur (ensorceleur, sorcier, forgesort, barde, etc.) nécessite leurs chapitres. `TODO(extraction)`.
6. **« sort de soins » (interdiction de brûlure de mana)** : pas de définition formelle de « sort de soins » sur ces pages — identifier les capacités concernées lors de l'extraction des voies (probablement tout sort rendant des PV).
7. **Sorts permanents** : mentionnés p. 229 (exception à la perte de conscience) sans définition ici — la durée « permanent » doit être un attribut de la capacité éponyme.
8. **Coquilles du livre** : « Le MJ à toute latitude » (p. 229, deuxième occurrence) ; « cotte de maille » au singulier (p. 178, chapitre hybrides).
