/**
 * AIDE-MÉMOIRE — DÉGÂTS, POINTS DE VIGUEUR & RÉCUPÉRATION (extraction PER-41, section 'resolution').
 *
 * Résolution des dommages, RD / résistance, dommages minimaux et temporaires, points de vigueur, règle du
 * dernier PV, inconscience et mort, premiers soins, récupérations rapide et complète, fatigue et DR, fuite
 * et poursuite. `body` recopié VERBATIM du livre de base ; `sourcePage` = page imprimée.
 *
 * SOURCES : bloc « LES DOMMAGES » + « Réduction des dommages (RD) » p. 218-220 ; points de vigueur /
 * récupération p. 220-222 ; fuite et poursuite p. 222-226. Les CRITIQUES en combat (double des DM, critique
 * amélioré) sont p. 213 (résolution du test d’attaque) — repris ici car ils relèvent de la résolution des DM.
 *
 * ATTENTION VERBATIM : le livre note certains dés avec le symbole degré (« 1d4° », « 3d4° ») — conservé tel quel.
 */

import type { ReferenceEntry, ReferenceTableEntry, ReferenceTextEntry } from './schema';

const SUBSECTION = 'damage';

/** Encadrés de texte des dégâts, PV et récupération (p. 213, 218-226). */
const DAMAGE_TEXT_ENTRIES: ReferenceTextEntry[] = [
  {
    kind: 'text',
    id: 'damage-resolution',
    title: 'Les dommages',
    section: 'resolution',
    subsection: SUBSECTION,
    tags: ['dommages', 'DM', 'FOR', 'arme', 'mains nues', 'attaque magique'],
    sourcePage: 218,
    shortEffect: 'DM = dé(s) de DM de l’arme + Carac. + bonus de magie/de capacité, retranchés des PV de la cible.',
    body: `Quand une attaque réussit, il faut déterminer les dommages (DM) et le résultat obtenu est alors retranché du nombre de PV de la cible.

Combat avec arme : on détermine les DM infligés avec une arme en lançant le dé (ou les dés) de dommages de l’arme (cf. chapitre Équipement) et en y ajoutant un modificateur.

Par défaut, on ajoute la FOR aux DM des attaques au contact, mais certaines capacités peuvent modifier la règle générale.

Pour les attaques à distance, on n’ajoute pas de caractéristique sauf si une capacité indique le contraire.

À plus haut niveau, les personnages peuvent ajouter des bonus de capacité ou des bonus d’objets magiques.

DM = dé(s) de DM de l’arme + Carac. + bonus de magie/de capacité

Exemple : Lhagva a réussi à attaquer un ogre avec une épée longue (DM 1d8) et sa FOR est de +3. Elle lance le d8, obtient 5 et inflige donc 8 DM (5 + 3). L’ogre possédait 30 PV, il ne lui en reste donc que 22 après cette attaque.

Combat à mains nues : un personnage qui ne possède pas de capacité particulière pour se battre à mains nues inflige des dommages égaux à 1d3 + FOR. Ces dommages sont toujours des DM temporaires (sauf si une capacité précise le contraire).

Attaques magiques : ces attaques n’ont pas de formule de DM par défaut ; celle-ci est indiquée dans la capacité correspondante.

Exemple : Ionas lance un sort de Choc sur l’ogre. Il fait un test d’attaque magique (1d20 + niveau + VOL) et réussit, lui aussi, à atteindre la DEF de l’ogre. Les DM de Choc sont indiqués dans la description de la capacité : 1d4 + CHA. Avec un CHA de +4 et un résultat de 4 sur le dé, Ionas inflige 8 DM à l’ogre.`,
  },
  {
    kind: 'text',
    id: 'critical-hit-damage',
    title: 'Réussite critique en combat',
    section: 'resolution',
    subsection: SUBSECTION,
    tags: ['critique', 'DM doublés', 'critique amélioré', 'rapière', 'vivelame', 'ouverture mortelle'],
    sourcePage: 213,
    shortEffect: 'Un critique touche automatiquement et double les DM (bonus inclus, mais dés bonus non multipliés).',
    body: `Dans un combat, comme pour la règle générale, toute réussite critique est un succès automatique. L’attaque inflige donc des DM, même si la DEF de la cible n’est pas atteinte.

De plus, les DM d’une réussite critique en attaque au contact ou à distance sont doublés (bonus inclus). Toutefois les dés obtenus en bonus ne peuvent pas être multipliés (attaque puissante, attaque sournoise, etc.).

Exemple : Wilibert le voleur inflige 1d6+3 à la rapière, plus 3d4° en Attaque sournoise. S’il obtient un critique, il inflige (1d6+3) × 2 + 3d4° DM.

En ce qui concerne les sorts, seuls ceux qui nécessitent un test d’attaque contre la DEF de la cible sont éligibles à une réussite critique. Les sorts qui nécessitent un test opposé et ceux qui touchent automatiquement ne peuvent pas bénéficier d’une réussite critique. En cas de réussite critique, les DM de ces sorts ne sont pas doublés, mais augmentés de 1d4° ; ces DM sont du même type que ceux du sort (feu pour une flèche de feu, etc.).

Critique amélioré : certains objets ou capacités augmentent de 1 point (ou plus) les chances d’obtenir un critique. Dans ce cas, le personnage obtient un critique sur un résultat de 19 ou 20 au d20 au lieu de 20 (ou 18 à 20 dans le cas d’une rapière ou d’une vivelame). Ces bonus peuvent se cumuler si deux capacités augmentent de 1 point les chances d’obtenir un critique : le personnage obtient alors un critique sur 18 à 20 (voire 17 à 20 avec une rapière ou une vivelame). Quoi qu’il en soit, la valeur minimale requise pour obtenir une réussite critique ne peut jamais être inférieure à 16.

Autre manœuvre : en cas de critique, plutôt que doubler les DM, le joueur peut décider d’obtenir un autre effet de son choix, par exemple désarmer, faire reculer, aveugler, faire chuter l’adversaire, etc. (la réussite est automatique). Cette option est soumise à l’arbitrage du MJ au cas par cas et sa durée dépend de la nature de l’adversaire : l’effet pourra durer 1d6 rounds, voire tout le reste du combat contre un figurant peu important, tandis qu’il sera limité à 1 round pour un PNJ ou une créature importante.

Réussite automatique : lorsqu’une capacité offre une réussite ou un critique automatique (comme Ouverture mortelle, par exemple), il n’est pas possible de la combiner avec une capacité qui impose un malus en attaque pour obtenir un quelconque avantage (comme Attaque puissante).`,
  },
  {
    kind: 'text',
    id: 'damage-reduction',
    title: 'Réduction des dommages (RD)',
    section: 'resolution',
    subsection: SUBSECTION,
    tags: ['RD', 'réduction des dommages', 'sauf feu', 'sauf magie', 'contondant'],
    sourcePage: 218,
    shortEffect: 'La créature retranche la valeur de RD à tous les DM subis ; les RD de sources différentes se cumulent.',
    body: `Lorsqu’une créature bénéficie d’une réduction des dommages (RD), elle retranche la valeur indiquée à tous les DM qu’elle subit.

Exemple : RD 5 indique que si la créature subit 7 DM, elle ne perd en réalité que 2 PV.

Parfois la RD précise une source particulière : « RD 5 sauf feu », signifie que la créature subit des DM normaux si on lui inflige des DM de ce type. « RD X sauf magie » signifie que la créature retranche X points au DM sauf ceux qui proviennent des armes magiques et des sorts.

À l’inverse, « RD 5 contre contondant » indique que la créature réduit seulement les DM contondants (bâtons, masses, mains nues, etc.).

Les RD obtenues de sources différentes se cumulent.`,
  },
  {
    kind: 'text',
    id: 'damage-resistance',
    title: 'Résistance aux dommages',
    section: 'resolution',
    subsection: SUBSECTION,
    tags: ['résistance aux dommages', 'diviser par deux', 'squelette'],
    sourcePage: 219,
    shortEffect: 'La créature divise les DM subis par deux ; on applique d’abord la RD, puis la division.',
    body: `Lorsqu’une créature possède une résistance aux dommages, elle divise les DM subis par deux (par exemple, les squelettes ont une résistance aux dommages tranchants et perforants).

RD et résistance aux dommages : si une capacité vous permet de diviser des DM par deux (ou plus), appliquez d’abord la RD puis divisez les DM restants par deux.`,
  },
  {
    kind: 'text',
    id: 'minimum-damage',
    title: 'Dommages minimaux',
    section: 'resolution',
    subsection: SUBSECTION,
    tags: ['dommages minimaux', 'au moins 1 DM', 'RD'],
    sourcePage: 219,
    shortEffect: 'Toute attaque qui touche inflige au moins 1 DM, même avec un modificateur négatif ou face à une RD.',
    body: `Toute attaque qui touche inflige au moins 1 DM même si la créature possède un modificateur négatif qui devrait réduire les DM à 0.

Exemple : un gobelin avec 1d4 – 1 DM qui obtient 1 au dé inflige tout de même 1 DM. Il fait donc toujours entre 1 et 3 DM.

Il en va de même pour la RD : une attaque qui touche inflige systématiquement au minimum 1 DM. Il est donc toujours possible pour un personnage, en théorie, de vaincre une créature, même s’il ne possède pas l’arme appropriée, bien que cela relève alors parfois de l’exploit de longue haleine. La règle s’applique aussi aux DM temporaires (cf. ci-après).`,
  },
  {
    kind: 'text',
    id: 'temporary-damage',
    title: 'Dommages temporaires',
    section: 'resolution',
    subsection: SUBSECTION,
    tags: ['dommages temporaires', 'non létaux', 'assommé', 'inconscient', 'dé malus'],
    sourcePage: 219,
    shortEffect: 'DM « non létaux » (dé malus sauf arme adaptée) : on retranche la FOR de la cible, ils sont comptés à part et l’assomment.',
    body: `Un personnage peut choisir d’infliger des DM « non létaux » s’il ne veut pas réellement blesser ou tuer une créature mais simplement l’assommer. On appelle ces dommages des DM temporaires. Dans ce cas, les tests d’attaque subissent un dé malus sauf si le personnage emploie une arme adaptée (mains nues, gourdin, etc.).

On retranche aux DM temporaires la FOR de la cible.

Les DM temporaires ne sont pas retranchés aux PV, mais additionnés et comptabilisés à part. Lorsqu’ils dépassent le nombre de PV restant de la créature, deux cas sont possibles :

si le dernier coup a infligé des DM temporaires, elle est assommée (inconsciente) ;

si le dernier coup a infligé des DM qui ne sont pas des DM temporaires, elle est réduite à 0 PV et dans le cas d’un PNJ, elle est morte.

Une créature élimine 1 DM temporaire subi par minute.

Exemple : Lhagva souhaite interroger un bandit avec 5 PV. Elle lui porte un coup du plat de l’épée (avec un dé malus en attaque) et inflige 8 DM. Le bandit, avec FOR +1, subit 7 DM temporaires, soit 2 points de plus que le nombre de PV qu’il possède. Il restera donc assommé pendant 2 min.`,
  },
  {
    kind: 'text',
    id: 'hit-points',
    title: 'Les points de vigueur',
    section: 'resolution',
    subsection: SUBSECTION,
    tags: ['points de vigueur', 'PV', 'capacité défensive'],
    sourcePage: 220,
    shortEffect: 'Les PV ne sont pas la robustesse mais le souffle et la capacité défensive globale ; plus ils baissent, plus le coup fatal approche.',
    body: `Dans COF, les PV ne reflètent pas la carrure ou la capacité à prendre un coup sans broncher, mais le souffle, l’expérience du combat et une capacité défensive globale. Ainsi, un PJ peut avoir beaucoup de PV et être rachitique (mais un excellent combattant) ou, au contraire, être une brute (FOR élevée) et avoir peu de PV. La plupart des PV perdus ne sont qu’épuisement et égratignures mais, plus ils baissent, plus le héros se rapproche du coup fatidique.`,
  },
  {
    kind: 'text',
    id: 'last-hp-rule',
    title: 'Règle du dernier PV',
    section: 'resolution',
    subsection: SUBSECTION,
    tags: ['dernier PV', '1 PV', 'affaibli', 'état préjudiciable'],
    sourcePage: 220,
    shortEffect: 'Un personnage ou une créature à 1 PV subit l’état préjudiciable affaibli (levé dès que les PV repassent au-dessus de 1).',
    body: `Si on considère que les PV représentent davantage une capacité défensive globale qu’une réserve d’énergie vitale ou un nombre de blessures qu’un personnage peut encaisser, alors seul le dernier PV représente un état de santé critique. Le moment où le personnage est gravement blessé bien qu’encore conscient.

Un personnage ou une créature à 1 PV subit l’état préjudiciable affaibli.

L’état affaibli disparaît dès que les PV repassent au-dessus de 1.`,
  },
  {
    kind: 'text',
    id: 'unconsciousness-death',
    title: 'Inconscience et mort',
    section: 'resolution',
    subsection: SUBSECTION,
    tags: ['0 PV', 'inconscient', 'mort', 'dé de récupération', 'DR'],
    sourcePage: 220,
    shortEffect: 'À 0 PV, un PJ tombe inconscient et perd 1 DR ; sans soins dans l’heure, il meurt. Un PNJ à 0 PV est le plus souvent mort.',
    body: `Quand un PJ tombe à 0 PV, il tombe au sol, inconscient, et perd 1 dé de récupération (DR).

On ne compte pas les PV perdus en dessous de 0 et on ne peut pas descendre en dessous de 0 DR.

Lorsqu’un PJ est à 0 PV, il ne peut plus agir, et s’il ne bénéficie pas d’un sort de soins, d’une potion ou de premiers soins dans l’heure qui suit (voir ci-après), il meurt. Pour le joueur, c’est la fin de la partie. Pour des raisons de vraisemblance, le MJ peut décider d’accélérer la mort du PJ (s’il est pris dans un incendie, dévoré par un monstre, achevé par un ennemi, etc.).

Lorsqu’un PNJ tombe à 0 PV, la plupart du temps, considérez simplement qu’il est mort. Des personnages qui veulent interroger quelqu’un, devraient prendre la peine de lui infliger des DM temporaires. Mais vous avez le dernier mot en tant que MJ.`,
  },
  {
    kind: 'text',
    id: 'first-aid',
    title: 'Premiers soins',
    section: 'resolution',
    subsection: SUBSECTION,
    tags: ['premiers soins', 'test d’INT', 'médecine', '0 PV'],
    sourcePage: 220,
    shortEffect: 'Test d’INT (Médecine) difficulté 10 pour ranimer un personnage à 0 PV (+5 si coup critique ou 0 DR).',
    test: 'Test d’INT (Médecine) difficulté 10 (+5 si le coup fatal était un critique ou si le personnage est à 0 DR ; difficulté 20 si les deux à la fois).',
    body: `Si un personnage à 0 PV reçoit des soins ordinaires, demandez au soigneur de faire un test d’INT (Médecine) difficulté 10. En cas d’échec, le personnage met 30 min pour reprendre connaissance avec 1 PV. En cas de succès, il reprend connaissance après 1 min avec 1d4° PV.

La difficulté du test augmente de +5 si le coup qui a amené le PJ à 0 PV est un coup critique ou si le personnage est à 0 DR (difficulté 20 si les deux à la fois).

Si un personnage récupère au moins 1 PV grâce à des soins, il reprend connaissance et peut de nouveau agir normalement.`,
  },
  {
    kind: 'text',
    id: 'quick-recovery',
    title: 'Récupération rapide',
    section: 'resolution',
    subsection: SUBSECTION,
    tags: ['récupération rapide', '30 min', 'dé de récupération', 'DR', 'une fois par combat'],
    sourcePage: 221,
    shortEffect: 'Pause de 30 min : dépenser 1 DR pour récupérer [1 DR + ½ Niveau] PV ; recharge les capacités « une fois par combat ».',
    body: `Une récupération rapide est une pause de 30 min durant laquelle le personnage se repose, répare son armure, affûte son arme, révise ses sorts ou soigne ses blessures superficielles.

Grâce à une récupération rapide, le personnage peut utiliser un dé de récupération (DR) pour restaurer ses PV. Il jette le dé et récupère [1 DR + ½ Niveau] PV ; en contrepartie, son nombre de DR est réduit de 1.

Cas particulier : un PJ n’ayant pas de dé de récupération ne peut restaurer ses PV que grâce à une récupération complète.

Pour regagner des DR dépensés, il faut prendre des récupérations complètes (voir ci-après).

Les capacités (sorts inclus) dont la fréquence indique « une fois par combat » nécessitent de terminer une récupération rapide avant de pouvoir à nouveau être utilisées.

Pour certains sorts, cette limitation n’empêche pas de les lancer hors combat, mais ils ne pourront jamais être lancés plus d’une fois durant un combat puisqu’ils nécessitent de prendre un repos de 30 min avant de pouvoir être de nouveau utilisés.

Exemple : le sort Sommeil (rang 2 de la voie de l’envoûteur) ne peut être utilisé qu’une seule fois par combat, ce qui signifie que l’ensorceleur doit se reposer 30 min avant de pouvoir le lancer à nouveau, même s’il possède assez de PM disponibles.`,
  },
  {
    kind: 'text',
    id: 'full-recovery',
    title: 'Récupération complète',
    section: 'resolution',
    subsection: SUBSECTION,
    tags: ['récupération complète', '8 h', 'dé de récupération', 'DR', 'une fois par jour'],
    sourcePage: 221,
    shortEffect: 'Repos de 8 h (une par jour) : rend 1 DR (max 2 + CON) ; recharge les capacités « une fois par jour ».',
    body: `Une récupération complète est une période de 8 h durant laquelle le personnage ne pratique aucune activité (généralement, il dort) dans des conditions optimales (confort d’un lit, nourriture suffisante, sécurité et nuit sans interruption). Si les conditions de repos ne sont pas optimales, le MJ est libre de demander un test de CON (difficulté 10 à 20) avant d’accorder cette récupération. Les règles de voyage (voir page 233) indiquent les seuils de difficulté du test en fonction de la dangerosité de la zone explorée. Certaines capacités permettent d’éviter ce test de CON et de récupérer 1 DR supplémentaire sans même effectuer de test.

Un personnage ne peut effectuer qu’une récupération complète par jour.

À la fin d’une récupération complète, un personnage gagne 1 DR, sans pouvoir dépasser son maximum (2 + CON). S’il le souhaite, il peut immédiatement choisir d’utiliser ce DR pour restaurer des PV. Dans ce cas, le nombre de PV récupérés est automatiquement égal à la valeur maximale du dé.

Cas particulier : un PJ qui n’a pas de dé de récupération ne peut regagner des PV qu’avec une récupération longue. Il ne bénéficie alors pas du résultat maximal et doit lancer le DR pour déterminer le nombre de PV restaurés.

Lorsqu’une capacité indique une utilisation une fois par jour, cela signifie que le personnage doit prendre une récupération complète avant de pouvoir à nouveau utiliser la capacité.`,
  },
  {
    kind: 'text',
    id: 'fatigue-recovery-dice',
    title: 'Fatigue et DR',
    section: 'resolution',
    subsection: SUBSECTION,
    tags: ['fatigue', 'épuisement', 'DR', 'marche forcée'],
    sourcePage: 222,
    shortEffect: 'Chaque épreuve éreintante fait perdre 1 DR ; sans DR restant, on perd des PV à la place (1d4° par DR).',
    body: `Les DR peuvent aussi servir à simuler l’épuisement (efforts, nuit blanche, etc. ; voir également la règle de marche forcée, page 233). Chaque épreuve éreintante fait perdre 1 DR. Cette solution est plus facile à gérer que d’éventuels malus. Lorsqu’un PJ n’a plus de DR, vous pouvez commencer à lui faire perdre des PV à la place (généralement 1d4° PV par DR qui devrait être perdu).`,
  },
  {
    kind: 'text',
    id: 'flight',
    title: 'Fuite',
    section: 'resolution',
    subsection: SUBSECTION,
    tags: ['fuite', 'test de VOL', 'moral', 'PNJ'],
    sourcePage: 222,
    shortEffect: 'Les PJ peuvent fuir à tout moment ; pour les PNJ, le MJ peut faire un test de VOL (voir table) quand l’effectif est décimé.',
    body: `À tout moment, les joueurs peuvent décider qu’il est déraisonnable de poursuivre le combat et temps pour leur personnage de prendre la fuite.

En ce qui concerne leurs adversaires, le MJ est seul maître de la décision. Pour cela il pourra s’appuyer sur l’évolution du rapport de force, sur la nature des créatures (certaines créatures dénuées de libre arbitre comme les zombies ou les golems ne fuient jamais, des géants ont du mal à croire que des créatures chétives pourraient les vaincre, etc.) et enfin leur valeur de VOL. Le MJ peut prendre cette décision de façon totalement arbitraire (puisque c’est lui l’arbitre) mais, si vous ne vous sentez pas à l’aise avec cette solution, voici une méthode un peu plus précise.

Lorsque le nombre initial de créatures est réduit de moitié, au tour de jeu des créatures, le MJ fait un test de VOL difficulté 10 plus modificateurs. En cas d’échec, les créatures utilisent leur prochain tour pour effectuer un double mouvement de fuite (voir le paragraphe « Poursuites », ci-après). Lorsque leur nombre est réduit au quart de l’effectif initial, faites un test de VOL difficulté 15, puis un nouveau test pour chaque nouveau round, si le nombre de créatures réduit encore.`,
  },
  {
    kind: 'text',
    id: 'pursuit',
    title: 'Poursuite',
    section: 'resolution',
    subsection: SUBSECTION,
    tags: ['poursuite', 'test opposé', 'AGI', 'distance', 'fuyard'],
    sourcePage: 222,
    shortEffect: 'Série de tests opposés d’AGI (modifiés, voir table) pour déterminer si le poursuivant rattrape le fuyard.',
    test: 'Série de tests opposés d’AGI, dont on retranche le bonus de DEF d’armure et auxquels on ajoute les bonus de capacité et les modificateurs de poursuite.',
    body: `Lorsque des adversaires utilisent chacun deux actions de mouvement par round ou une action sprinter (L), l’un pour s’éloigner et l’autre pour se rapprocher, les règles de combat cèdent la place aux règles de poursuite. La capacité d’une créature à en rattraper une autre dépend d’une série de tests opposés d’AGI qui simulent les aléas du terrain et de la poursuite.

Ces tests sont modifiés comme suit :

Retranchez aux tests le bonus de DEF d’une éventuelle armure.

Ajoutez les bonus de capacité (sprint, course, etc.).

Utilisez les modificateurs de poursuite indiqués dans la table ci-dessous.

Poursuite basique
Dans cette version de la poursuite, pas de circonvolutions, le but est juste de savoir si le fuyard peut être rattrapé ou non. Le processus permet de déterminer si le poursuivant peut attaquer malgré les déplacements.

Déterminez, la distance initiale entre les deux protagonistes.

Effectuez le test opposé d’AGI,

Si le fuyard l’emporte, il augmente la distance avec son poursuivant de 10 m (20 m en cas de réussite critique ou s’il obtient 10 de plus que son adversaire).

Si le poursuivant l’emporte, il réduit la distance de 10 m (20 m en cas de réussite critique ou s’il obtient 10 de plus que son adversaire).

Si la distance est alors de 0, le poursuivant obtient une action d’attaque contre le fuyard (s’il a obtenu un critique ou 10 de plus que son adversaire sur le test opposé d’AGI, il bénéficie même d’une action limitée).

Chaque fois qu’un protagoniste décide d’utiliser une action d’attaque (par exemple pour tirer), il perd automatiquement 10 m, ou 20 m s’il utilise une action limitée. Il n’est pas nécessaire d’effectuer un test opposé d’AGI pour ce round.

Lorsque la distance entre les deux protagonistes atteint 40 m, le poursuivant doit réussir un test de CON ou de PER (au choix) difficulté 10. En cas d’échec, il est trop essoufflé ou perd sa cible de vue et le combat est terminé. La difficulté augmente de +5 par tranche de 10 m supplémentaires.`,
  },
  {
    kind: 'text',
    id: 'cinematic-pursuit',
    title: 'Poursuite cinématographique',
    section: 'resolution',
    subsection: SUBSECTION,
    tags: ['poursuite', 'cinématographique', 'tests d’AGI', 'essoufflé'],
    sourcePage: 226,
    shortEffect: 'Le premier à gagner un nombre fixé de tests d’AGI (3 par défaut) l’emporte ; le rattrapé subit l’état essoufflé.',
    body: `Avec cette version, le but est davantage d’épuiser et d’acculer l’adversaire. Ce peut être pour poursuivre le combat, mais aussi pour le forcer à se rendre, l’interroger ou le capturer. Elle permet aussi d’éviter de calculer la distance précise entre les protagonistes au profit d’une gestion plus globale et narrative.

Décidez du nombre de tests qu’il est nécessaire de réussir pour remporter la poursuite, selon l’importance que vous voulez donner à cet événement.

Par défaut, pour une poursuite rapide. Vous pouvez décider que le premier protagoniste à gagner 3 tests d’AGI a remporté la poursuite.

Si c’est le fuyard, il a semé son poursuivant. Fin de la rencontre.

Si c’est le poursuivant, il rattrape le fuyard et celui-ci subit l’état préjudiciable essoufflé (déplacement limité à 5 m par action de mouvement) jusqu’à ce qu’il s’autorise une récupération rapide.

Vous pouvez modifier le nombre de tests à emporter en fonction de la nature du terrain et de la luminosité : plus le terrain est découvert, plus il faut de tests pour semer un poursuivant.

Voici quelques exemples du nombre de tests possibles pour terminer une poursuite.

Forêt ou cité : 3
Montagne, vallonné : 4
Plaine, désert : 5
Dans le noir : modificateur de -1

N’hésitez pas à faire preuve d’imagination pour interpréter une réussite critique (comptez 2 succès pour le gagnant ou lui permettre de réaliser une attaque à distance en bonus) ou un échec critique (cheville tordue, blessure, etc.).

Enfin, si le fuyard a déjà une large avance au moment où la poursuite débute (au moins 30 m), vous pouvez lui donner un succès dès le départ.`,
  },
];

/** Tables des dégâts / récupération : fuite des PNJ (p. 222) et modificateurs de poursuite (p. 223). */
const DAMAGE_TABLE_ENTRIES: ReferenceTableEntry[] = [
  {
    kind: 'table',
    id: 'flight-npc-table',
    title: 'Fuite des PNJ',
    section: 'resolution',
    subsection: SUBSECTION,
    tags: ['fuite', 'test de VOL', 'moral', 'modificateurs'],
    sourcePage: 222,
    columns: [
      { key: 'situation', label: 'Situation' },
      { key: 'difficulty', label: 'Difficulté' },
    ],
    rows: [
      { situation: 'Le nombre initial de créatures est divisé par 2', difficulty: '10' },
      { situation: 'Le nombre initial de créatures est divisé par 4', difficulty: '15' },
      { situation: 'Le ou les chefs de groupe sont morts', difficulty: '+5' },
      { situation: 'Les créatures sont de taille petite ou inférieure', difficulty: '+2' },
      { situation: 'Les créatures sont de taille grande', difficulty: '-2' },
      { situation: 'Les créatures sont de taille énorme ou colossale', difficulty: '-5' },
      { situation: 'PJ à terre', difficulty: '-5/PJ' },
    ],
  },
  {
    kind: 'table',
    id: 'pursuit-modifiers-table',
    title: 'Modificateurs au test de poursuite',
    section: 'resolution',
    subsection: SUBSECTION,
    tags: ['poursuite', 'modificateurs', 'vitesse', 'vol', 'terrain', 'taille'],
    sourcePage: 223,
    columns: [
      { key: 'group', label: 'Catégorie' },
      { key: 'situation', label: 'Situation' },
      { key: 'modifier', label: 'Modificateur' },
    ],
    rows: [
      { group: 'Vitesse de la créature', situation: 'Créature ralentie', modifier: '-10' },
      { group: 'Vitesse de la créature', situation: '+1 action de mouvement par tour', modifier: '+5' },
      { group: 'Vitesse de la créature', situation: '15 m par action de mouvement', modifier: '+5' },
      { group: 'Vitesse de la créature', situation: '20 m par action de mouvement', modifier: '+10' },
      { group: 'Mode de déplacement', situation: 'Quadrupède (ne se cumule pas avec vol)', modifier: '+5' },
      { group: 'Mode de déplacement', situation: 'Vol', modifier: '+10' },
      { group: 'Environnement', situation: 'Terrain de prédilection', modifier: '+5 à +10' },
      { group: 'Environnement', situation: 'Gênant (boyau étroit, forêt dense…)', modifier: '-5 à -10' },
      { group: 'Environnement', situation: 'Obscurité (sans vision dans le noir)', modifier: '+5' },
      { group: 'Taille de la créature', situation: 'Très petite ou inférieure', modifier: '-5' },
      { group: 'Taille de la créature', situation: 'Énorme ou supérieure', modifier: '+5' },
    ],
    note: 'Ces modificateurs peuvent se cumuler : par exemple, un dragon (créature de taille énorme et volante) obtient un bonus de +15.',
  },
];

/** Toutes les entrées « dégâts, PV et récupération » (p. 213, 218-226). */
export const DAMAGE: ReferenceEntry[] = [...DAMAGE_TEXT_ENTRIES, ...DAMAGE_TABLE_ENTRIES];
