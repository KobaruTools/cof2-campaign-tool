# Notes d'extraction — étape « Peuples » et chapitre Peuples

Règles et informations des p. 25-28 et 44 non portées (ou partiellement
portées) par `src/data/peuples.ts` et `src/data/voies-peuples.ts`.

## Étape 3 « Peuples » de la création (p. 25)

> « Choisissez le peuple de votre personnage parmi l'un des huit peuples de
> base (voir leurs descriptions au chapitre "Peuples"). »

La page 25 donne aussi un résumé de chaque peuple avec ses **profils
typiques** (purement indicatifs, non stockés dans les données) :

| Peuple | Résumé p. 25 | Profils typiques |
| --- | --- | --- |
| Demi-elfe | être entre deux cultures, souvent d'une grande sensibilité | barde, prêtre |
| Demi-orc | une force de la nature en butte aux préjugés | barbare, guerrier |
| Elfe haut | un peuple d'intellectuels et d'artistes | barde, magicien, ensorceleur |
| Elfe sylvain | le peuple de la forêt, vif et en alerte | druide, rôdeur |
| Gnome | un petit peuple passé maître dans les sciences | forgesort, arquebusier |
| Halfelin | un petit peuple discret, mais plein d'astuce et de courage | voleur, rôdeur |
| Humain | le peuple le plus polyvalent | tous |
| Nain | un peuple bourru, idéaliste et résistant | guerrier, prêtre |

Dernier paragraphe (conseil, non bloquant) : le choix du peuple peut être
influencé par celui du profil (ex. un barbare demi-orc plutôt qu'un elfe
sylvain rôdeur), ou au contraire prendre le contrepied (halfelin barbare,
demi-orc barde) pour éviter un archétype déjà vu.

## Conséquences mécaniques du peuple (p. 26)

> « Le peuple choisi a deux conséquences mécaniques sur le personnage
> (toutes deux précisées dans le paragraphe dédié au peuple, dans le
> chapitre "Peuples") :
> - modification de deux valeurs de caractéristiques (une seule pour les
>   humains ; voir ci-après, au point 4, "Caractéristiques") ;
> - ajout d'une voie de peuple (voir ci-après, au point 5, "Voies et
>   capacités"). »

Portées par `Peuple.modificateurs` et `Peuple.voieDePeupleIds`.

## Modificateur de peuple (p. 28)

La table p. 28 est cohérente avec les blocs « Caractéristiques » des pages
peuples (vérifié peuple par peuple). Les modificateurs s'appliquent aux
**valeurs de base** choisies au point 4 de la création, avec choix du joueur
quand deux caractéristiques sont proposées.

Cas particulier **humain** (p. 28 : « +1 à une des deux plus faibles
carac. » ; p. 57 : « Un personnage humain gagne +1 à la valeur d'une de ses
deux plus faibles caractéristiques au choix. ») : la contrainte « parmi les
deux plus faibles » n'est pas exprimable dans `ModificateurCarac` — les
7 caractéristiques sont listées dans `caracs` et **le moteur/wizard doit
restreindre le choix aux deux plus faibles valeurs du personnage**. Même
logique pour la capacité Polyvalence (humain-r5) : « augmente sa
caractéristique la plus faible de +1 ».

L'exemple p. 28 (Lhagva, barbare humaine) illustre que le +1 humain est
appliqué après répartition de la série de valeurs, sur l'une des deux plus
faibles.

## « Peuple et stéréotypes » (p. 44) — règle de remplacement des bonus

> « Toutefois, si cette vision des choses ne vous convient pas ou si vous
> voulez tout simplement jouer un nain ou un elfe qui a vécu dans une cité
> humaine, alors rien ne vous empêche de remplacer les bonus de compétence
> de votre personnage par ceux de la voie de l'humain, en fonction du lieu
> où il a passé sa jeunesse ou du métier qu'il a exercé. »

Option de personnalisation (avec accord MJ implicite) : les bonus de
compétence typés d'un peuple non humain peuvent être remplacés par ceux de
la voie de l'humain (origine géographique/sociale de Diversité). Non modélisé
dans les données ; à traiter côté fiche éditable permissive le cas échéant.

## Divers

- Le demi-elfe n'a **pas de voie dédiée** (encadré p. 46) : choix entre la
  voie de l'humain et une des deux voies d'elfe → `voieDePeupleIds` du
  demi-elfe et `peupleIds` des voies humain / elfe-haut / elfe-sylvain.
- La voie du mage (p. 60) n'est pas une voie de peuple : option réservée à
  la famille des mages, remplace la voie de peuple (règles verbatim dans
  `voieDuMage.note`).
- p. 46, « Noms typiques » du demi-elfe : le livre contient une coquille,
  « (voir pages et 56) » (numéro de page manquant avant « et »).
