# Inventaire et classification des capacités (PER-62)

> Passe **purement analytique** sur les **660** capacités du catalogue (2 passes croisées, réconciliées).
> Source machine : `src/data/feature-classification.ts`. Aucun code moteur, aucun changement de schéma de règles.

## Tags de nature

| Tag | Définition | Ticket aval |
|---|---|---|
| `flat-bonus` | Bonus chiffré **permanent et inconditionnel** à une stat dérivée. Exclut les bonus qui scalent. | effets |
| `choice` | La capacité fait **choisir** quelque chose. | choix |
| `mana-cost` | Coût en mana **explicite et spécifique** (le coût standard = 1 PM/rang est une règle générique, pas retaguée). | coûts mana |
| `conditional` | Effet **conditionnel / temporaire / scalant**, précisé par `conditionalKinds`. | effets conditionnels |
| `immunity` | Confère une **immunité / annulation totale** d'un DM ou état. | effets (immunités/états) |
| `pure-text` | **Aucune mécanique structurable** (narratif / arbitré MJ). Toujours seul. | — |

**Sous-types conditionnels** : `condition` (situation/état/arme/cible/test requis) · `temporary` (durée ou usages limités) · `scaling` (rang/niveau/dé évolutif).

## Répartition des tags

| Tag | Capacités |
|---|--:|
| `flat-bonus` | 108 |
| `choice` | 95 |
| `mana-cost` | 14 |
| `conditional` | 580 |
| `immunity` | 21 |
| `pure-text` | 8 |

**Sous-types conditionnels** (occurrences) : `condition` 443 · `temporary` 287 · `scaling` 261. 12 capacités `conditional` sans sous-type isolable (manœuvres actives).

## Par famille

| Famille | Cap. | flat-bonus | choice | mana-cost | conditional | immunity | pure-text |
|---|--:|--:|--:|--:|--:|--:|--:|
| Aventuriers (chap. 6, p. 91-111) | 100 | 18 | 17 | 0 | 90 | 1 | 0 |
| Combattants (chap. 5, p. 78-90) | 75 | 13 | 6 | 0 | 67 | 2 | 0 |
| Mages (chap. 7, p. 112-127) | 100 | 15 | 7 | 4 | 98 | 2 | 0 |
| Mystiques (chap. 4, p. 61-77) | 75 | 20 | 6 | 2 | 67 | 2 | 0 |
| Voies de peuple (chap. 3) + voie du mage (p. 60) | 40 | 18 | 8 | 1 | 22 | 2 | 0 |
| Voies de prestige — partie 1 (chap. 8, p. 128+) | 85 | 15 | 19 | 1 | 72 | 0 | 1 |
| Voies de prestige — partie 2 (chap. 8, p. 128+) | 185 | 9 | 32 | 6 | 164 | 12 | 7 |

## Capacités à immunité (21)

- `saltimbanque-r4` (Liberté d'action, p. 68) — `immunity`
- `primitif-r3` (Vigilance, p. 81) — `conditional` `immunity` [condition, scaling]
- `meneur-d-hommes-r1` (Sans peur, p. 85) — `conditional` `immunity` [scaling]
- `air-r5` (Forme éthérée, p. 93) — `conditional` `immunity` [condition, temporary]
- `mort-r2` (Masque mortuaire, p. 108) — `conditional` `immunity` [condition, temporary]
- `energie-vitale-r3` (Invulnérable, p. 119) — `conditional` `immunity` [scaling]
- `vent-r3` (Course des airs, p. 121) — `immunity`
- `elfe-haut-r2` (Force d’âme, p. 50) — `conditional` `immunity` [condition, scaling]
- `elfe-haut-r4` (Immortel, p. 50) — `immunity`
- `prestige-combat-du-mal-r8` (Résister à la corruption, p. 148) — `conditional` `immunity` [temporary]
- `prestige-elementaliste-r8` (Métamorphose élémentaire, p. 157) — `choice` `conditional` `immunity` [condition, temporary]
- `prestige-gel-r5` (Cœur de glace, p. 157) — `immunity`
- `prestige-gel-r7` (Présence glaciale, p. 157) — `conditional` `immunity` [temporary]
- `prestige-magie-de-l-esprit-r4` (Esprit impénétrable, p. 161) — `flat-bonus` `conditional` `immunity` [condition, temporary]
- `prestige-elementaire-du-feu-r6` (Insensible au feu, p. 166) — `immunity`
- `prestige-elementaire-du-feu-r7` (Immolation, p. 166) — `conditional` `immunity` [condition, temporary]
- `prestige-elementaire-du-feu-r8` (Forme élémentaire de feu, p. 166) — `conditional` `immunity` [temporary]
- `prestige-elementaire-de-l-air-r8` (Forme élémentaire d'air, p. 168) — `conditional` `immunity` [condition, temporary]
- `prestige-elementaire-de-l-eau-r8` (Forme élémentaire d'eau, p. 169) — `conditional` `immunity` [condition, temporary]
- `prestige-templier-r4` (Résistance au mal, p. 174) — `flat-bonus` `conditional` `immunity` [condition, temporary]
- `prestige-templier-r6` (Résistance au mal supérieure, p. 174) — `flat-bonus` `conditional` `immunity` [condition]

## Tableau complet

### Aventuriers (chap. 6, p. 91-111)

| id | Capacité | Tags | Sous-types | Page |
|---|---|---|---|--:|
| `artilleur-r1` | Mécanismes | `conditional` | `condition` `scaling` | 62 |
| `artilleur-r2` | Arme à répétition | `choice` `conditional` | `scaling` | 62 |
| `artilleur-r3` | Tir de barrage | `conditional` | `condition` | 62 |
| `artilleur-r4` | Canon double | `conditional` | `condition` | 63 |
| `artilleur-r5` | Couleuvrine | `conditional` | `scaling` | 63 |
| `explosifs-r1` | Tir de grenaille | `conditional` | `condition` `scaling` | 63 |
| `explosifs-r2` | Démolition | `conditional` | `temporary` `scaling` | 63 |
| `explosifs-r3` | Poudre puissante | `conditional` | `scaling` | 63 |
| `explosifs-r4` | Piège explosif | `conditional` | `temporary` `scaling` | 64 |
| `explosifs-r5` | Boulet explosif | `conditional` | `temporary` `scaling` | 64 |
| `mercenaire-r1` | Pilier de bar | `conditional` | `condition` `scaling` | 64 |
| `mercenaire-r2` | Mort ou vif | `choice` `conditional` | `condition` `temporary` `scaling` | 64 |
| `mercenaire-r3` | Combattant aguerri | `flat-bonus` `choice` | — | 64 |
| `mercenaire-r4` | Constitution héroïque | `flat-bonus` | — | 64 |
| `mercenaire-r5` | Combat de masse | `flat-bonus` `choice` `conditional` | `condition` | 64 |
| `pistolero-r1` | Plus vite que son ombre | `conditional` | `condition` | 64 |
| `pistolero-r2` | Ajuster le tir | `conditional` | `condition` `temporary` | 64 |
| `pistolero-r3` | Tir double | `conditional` | `condition` | 64 |
| `pistolero-r4` | Agilité héroïque | `flat-bonus` | — | 64 |
| `pistolero-r5` | As de la gâchette | `conditional` | `condition` | 64 |
| `precision-r1` | Joli coup | `conditional` | `condition` | 65 |
| `precision-r2` | Défaut dans la cuirasse | `conditional` | `condition` `temporary` | 65 |
| `precision-r3` | Tir précis | `conditional` | `scaling` | 65 |
| `precision-r4` | Tireur d'élite | `conditional` | `condition` | 65 |
| `precision-r5` | Tir fatal | `conditional` | `condition` `scaling` | 65 |
| `escrime-r1` | Précision | `conditional` | `condition` | 66 |
| `escrime-r2` | Feinte | `conditional` | `condition` `temporary` `scaling` | 66 |
| `escrime-r3` | Intelligence du combat | `choice` `conditional` | `condition` `temporary` | 66 |
| `escrime-r4` | Attaque flamboyante | `conditional` | `condition` | 66 |
| `escrime-r5` | Botte mortelle | `conditional` | `condition` | 66 |
| `musicien-r1` | Chant des héros | `conditional` | `temporary` `scaling` | 67 |
| `musicien-r2` | Chant de réconfort | `conditional` | `temporary` `scaling` | 67 |
| `musicien-r3` | Attaque sonore | `conditional` | `scaling` | 67 |
| `musicien-r4` | Zone de silence | `conditional` | `temporary` | 67 |
| `musicien-r5` | Danse irrésistible | `conditional` | `condition` `temporary` `scaling` | 67 |
| `saltimbanque-r1` | Acrobate | `conditional` | `scaling` | 67 |
| `saltimbanque-r2` | Grâce féline | `flat-bonus` `conditional` | `scaling` | 68 |
| `saltimbanque-r3` | Lanceur de couteau | `conditional` | `scaling` | 68 |
| `saltimbanque-r4` | Liberté d'action | `immunity` | — | 68 |
| `saltimbanque-r5` | Esquive acrobatique | `conditional` | `condition` | 68 |
| `seduction-r1` | Charmant | `conditional` | `scaling` | 68 |
| `seduction-r2` | Dentelles et rapière | `conditional` | `condition` `scaling` | 68 |
| `seduction-r3` | Baratineur de génie | `conditional` | `condition` | 68 |
| `seduction-r4` | Charisme héroïque | `flat-bonus` | — | 68 |
| `seduction-r5` | Suggestion | `conditional` | `condition` `temporary` | 68 |
| `vagabond-r1` | Rumeurs et légendes | `conditional` | `scaling` | 68 |
| `vagabond-r2` | Éclectique | `flat-bonus` `conditional` | `scaling` | 69 |
| `vagabond-r3` | Attirail | `conditional` | — | 69 |
| `vagabond-r4` | Compréhension des langues | `conditional` | `temporary` `scaling` | 69 |
| `vagabond-r5` | Déguisement | `conditional` | `temporary` | 69 |
| `archer-r1` | Archer émérite | `flat-bonus` `choice` `conditional` | `scaling` | 70 |
| `archer-r2` | Tir chirurgical | `conditional` | `condition` | 70 |
| `archer-r3` | Dans le mille | `conditional` | `condition` `scaling` | 70 |
| `archer-r4` | Tir rapide | `conditional` | — | 70 |
| `archer-r5` | Flèche de mort | `choice` `conditional` | `condition` `temporary` `scaling` | 70 |
| `compagnon-animal-r1` | Le loup | `conditional` | `scaling` | 70 |
| `compagnon-animal-r2` | Travail d'équipe | `conditional` | `condition` | 71 |
| `compagnon-animal-r3` | Lien empathique | `conditional` | — | 71 |
| `compagnon-animal-r4` | Loup alpha | `conditional` | `scaling` | 72 |
| `compagnon-animal-r5` | Tactiques de meute | `conditional` | `condition` `scaling` | 72 |
| `survie-r1` | Survie | `conditional` | `condition` `scaling` | 72 |
| `survie-r2` | Nature nourricière | `conditional` | `condition` `temporary` `scaling` | 72 |
| `survie-r3` | Grand pas | `conditional` | `condition` `scaling` | 72 |
| `survie-r4` | Constitution héroïque | `flat-bonus` | — | 72 |
| `survie-r5` | Increvable | `conditional` | `condition` `temporary` `scaling` | 72 |
| `traqueur-r1` | Éclaireur | `choice` `conditional` | `condition` `scaling` | 72 |
| `traqueur-r2` | Attaque éclair | `conditional` | `scaling` | 72 |
| `traqueur-r3` | Chasseur émérite | `choice` `conditional` | `condition` `scaling` | 72 |
| `traqueur-r4` | Perception héroïque | `flat-bonus` | — | 73 |
| `traqueur-r5` | Repli | `conditional` | `condition` | 73 |
| `combat-a-deux-armes-r1` | Attaque à suivre | `choice` `conditional` | `condition` | 73 |
| `combat-a-deux-armes-r2` | Parade croisée | `flat-bonus` `conditional` | `condition` `scaling` | 73 |
| `combat-a-deux-armes-r3` | Droite - gauche | `conditional` | `condition` | 73 |
| `combat-a-deux-armes-r4` | Combattant héroïque | `flat-bonus` `choice` | — | 73 |
| `combat-a-deux-armes-r5` | Double peine | `choice` `conditional` | `condition` `scaling` | 73 |
| `assassin-r1` | Discrétion | `conditional` | `condition` `scaling` | 74 |
| `assassin-r2` | Attaque sournoise | `conditional` | `condition` `scaling` | 74 |
| `assassin-r3` | Attaque par surprise | `conditional` | `condition` `scaling` | 74 |
| `assassin-r4` | Disparition | `conditional` | `temporary` | 74 |
| `assassin-r5` | Ouverture mortelle | `choice` `conditional` | `temporary` | 74 |
| `aventurier-r1` | Baratin | `conditional` | `scaling` | 74 |
| `aventurier-r2` | Provocation | `choice` `conditional` | `condition` `scaling` | 75 |
| `aventurier-r3` | Souplesse du félin | `flat-bonus` `conditional` | `scaling` | 75 |
| `aventurier-r4` | Charisme héroïque | `flat-bonus` | — | 75 |
| `aventurier-r5` | Attaque paralysante | `choice` `conditional` | `condition` `temporary` `scaling` | 75 |
| `deplacement-r1` | Agile | `flat-bonus` `conditional` | `scaling` | 75 |
| `deplacement-r2` | Réflexes félins | `conditional` | `temporary` `scaling` | 76 |
| `deplacement-r3` | Acrobaties | `choice` `conditional` | `condition` `scaling` | 76 |
| `deplacement-r4` | Agilité héroïque | `flat-bonus` | — | 76 |
| `deplacement-r5` | Esquive de la magie | `conditional` | `condition` | 76 |
| `roublard-r1` | Doigts agiles | `flat-bonus` `conditional` | `scaling` | 76 |
| `roublard-r2` | Aux aguets | `conditional` | `scaling` | 76 |
| `roublard-r3` | Feindre la mort | `conditional` | `temporary` `scaling` | 76 |
| `roublard-r4` | Expert en criminalité | `conditional` | — | 76 |
| `roublard-r5` | Maître du poison | `conditional` | `temporary` `scaling` | 76 |
| `spadassin-r1` | Attaque en finesse | `flat-bonus` `conditional` | `condition` `scaling` | 77 |
| `spadassin-r2` | Esquive fatale | `conditional` | `condition` `temporary` | 77 |
| `spadassin-r3` | Frappe chirurgicale | `conditional` | `condition` | 77 |
| `spadassin-r4` | Ambidextrie | `conditional` | `condition` | 77 |
| `spadassin-r5` | Botte secrète | `choice` `conditional` | `condition` `temporary` | 77 |

### Combattants (chap. 5, p. 78-90)

| id | Capacité | Tags | Sous-types | Page |
|---|---|---|---|--:|
| `brute-r1` | Argument de taille | `flat-bonus` `conditional` | `condition` | 79 |
| `brute-r2` | Tour de force | `conditional` | `temporary` | 79 |
| `brute-r3` | Attaque brutale | `conditional` | `condition` `scaling` | 79 |
| `brute-r4` | Force héroïque | `flat-bonus` | — | 80 |
| `brute-r5` | Briseur d’os | `conditional` | `condition` `temporary` | 80 |
| `pagne-r1` | Vigueur | `conditional` | `condition` `scaling` | 80 |
| `pagne-r2` | Peau de pierre | `choice` `conditional` | `condition` `scaling` | 80 |
| `pagne-r3` | Tatouages | `choice` `conditional` | `condition` | 80 |
| `pagne-r4` | Constitution héroïque | `flat-bonus` | — | 80 |
| `pagne-r5` | Peau d’acier | `flat-bonus` | — | 81 |
| `pourfendeur-r1` | Réflexes éclair | `flat-bonus` `conditional` | `condition` `scaling` | 81 |
| `pourfendeur-r2` | Charge | `conditional` | `condition` | 81 |
| `pourfendeur-r3` | Enchaînement | `conditional` | `condition` | 81 |
| `pourfendeur-r4` | Déchaînement d’acier | `conditional` | `condition` | 81 |
| `pourfendeur-r5` | Attaque tourbillon | `conditional` | `condition` `temporary` | 81 |
| `primitif-r1` | Proche de la nature | `flat-bonus` `conditional` | `condition` `scaling` | 81 |
| `primitif-r2` | Armure de vent | `conditional` | `condition` `scaling` | 81 |
| `primitif-r3` | Vigilance | `conditional` `immunity` | `condition` `scaling` | 81 |
| `primitif-r4` | Résistance à la magie | `conditional` | `condition` `temporary` | 81 |
| `primitif-r5` | Vitalité débordante | `conditional` | `condition` | 82 |
| `rage-r1` | Cri de guerre | `conditional` | `condition` `temporary` `scaling` | 82 |
| `rage-r2` | Défier la mort | `conditional` | `condition` `temporary` | 82 |
| `rage-r3` | Rage du berserk | `conditional` | `temporary` `scaling` | 82 |
| `rage-r4` | Même pas mal | `conditional` | `condition` `temporary` | 82 |
| `rage-r5` | Furie du berserk | `conditional` | `temporary` `scaling` | 82 |
| `cavalier-r1` | Fidèle monture | `conditional` | `condition` `scaling` | 83 |
| `cavalier-r2` | Cavalier émérite | `conditional` | `condition` `scaling` | 83 |
| `cavalier-r3` | Charge | `conditional` | `condition` | 84 |
| `cavalier-r4` | Monture magique | `conditional` | — | 84 |
| `cavalier-r5` | Monture fantastique | `conditional` | `condition` | 84 |
| `guerre-r1` | Armure sur mesure | `conditional` | `condition` `scaling` | 84 |
| `guerre-r2` | Encaisser un coup | `conditional` | `condition` `temporary` `scaling` | 85 |
| `guerre-r3` | Frappe du justicier | `conditional` | `condition` | 85 |
| `guerre-r4` | Force héroïque | `flat-bonus` | — | 85 |
| `guerre-r5` | Mon armure est une arme | `conditional` | `condition` `temporary` | 85 |
| `preux-r1` | Ignorer la douleur | `conditional` | `temporary` `scaling` | 85 |
| `preux-r2` | Piqûres d’insectes | `conditional` | `condition` | 85 |
| `preux-r3` | Laissez-le-moi | `conditional` | `condition` `scaling` | 85 |
| `preux-r4` | Charisme héroïque | `flat-bonus` | — | 85 |
| `preux-r5` | Seul contre tous | `conditional` | `condition` | 85 |
| `meneur-d-hommes-r1` | Sans peur | `conditional` `immunity` | `scaling` | 85 |
| `meneur-d-hommes-r2` | Intercepter | `conditional` | `condition` `temporary` `scaling` | 85 |
| `meneur-d-hommes-r3` | Exemplaire | `conditional` | `condition` `temporary` | 86 |
| `meneur-d-hommes-r4` | Charge fantastique | `conditional` | `temporary` `scaling` | 86 |
| `meneur-d-hommes-r5` | Ordre de bataille | `conditional` | `condition` `temporary` | 86 |
| `noblesse-r1` | Éduqué | `conditional` | `scaling` | 86 |
| `noblesse-r2` | Écuyer | `conditional` | `condition` `scaling` | 86 |
| `noblesse-r3` | Autorité naturelle | `conditional` | `condition` `scaling` | 86 |
| `noblesse-r4` | Massacrer la piétaille | `conditional` | `condition` `scaling` | 86 |
| `noblesse-r5` | Formation d’élite | `choice` | — | 86 |
| `bouclier-r1` | Protéger un allié | `conditional` | `condition` `temporary` `scaling` | 87 |
| `bouclier-r2` | Parer un coup | `conditional` | `condition` `temporary` | 87 |
| `bouclier-r3` | Défense au bouclier | `conditional` | `condition` `scaling` | 88 |
| `bouclier-r4` | Absorber un sort | `conditional` | `condition` | 88 |
| `bouclier-r5` | Renvoi de sort | `conditional` | `condition` | 88 |
| `combat-r1` | Vivacité | `flat-bonus` `conditional` | `condition` `temporary` | 88 |
| `combat-r2` | Manœuvre | `conditional` | `condition` | 88 |
| `combat-r3` | Attaque puissante | `conditional` | `condition` | 88 |
| `combat-r4` | Double attaque | `conditional` | `condition` | 88 |
| `combat-r5` | Attaque circulaire | `conditional` | `condition` | 88 |
| `maitre-d-armes-r1` | Armes de prédilection | `choice` `conditional` | `condition` `scaling` | 88 |
| `maitre-d-armes-r2` | Science du critique | `conditional` | `condition` | 89 |
| `maitre-d-armes-r3` | Spécialisation | `choice` `conditional` | `condition` `scaling` | 89 |
| `maitre-d-armes-r4` | Attaque parfaite | `conditional` | `condition` | 89 |
| `maitre-d-armes-r5` | Riposte | `conditional` | `condition` `temporary` | 89 |
| `resistance-r1` | Robustesse | `conditional` | `condition` `scaling` | 89 |
| `resistance-r2` | Résilient | `conditional` | `condition` `scaling` | 90 |
| `resistance-r3` | Armure lourde | `choice` `conditional` | `condition` | 90 |
| `resistance-r4` | Constitution héroïque | `flat-bonus` | — | 90 |
| `resistance-r5` | Dur à cuire | `flat-bonus` `conditional` | `condition` `temporary` | 90 |
| `soldat-r1` | Teigneux | `conditional` | `condition` `temporary` `scaling` | 90 |
| `soldat-r2` | Prouesse | `conditional` | `temporary` | 90 |
| `soldat-r3` | Piqûre de rappel | `conditional` | `condition` `temporary` | 90 |
| `soldat-r4` | Force héroïque | `flat-bonus` | — | 90 |
| `soldat-r5` | Rempart | `flat-bonus` `conditional` | `condition` | 90 |

### Mages (chap. 7, p. 112-127)

| id | Capacité | Tags | Sous-types | Page |
|---|---|---|---|--:|
| `air-r1` | Murmures dans le vent | `flat-bonus` `conditional` | `condition` | 93 |
| `air-r2` | Sous tension | `conditional` | `condition` `temporary` `scaling` | 93 |
| `air-r3` | Télékinésie | `conditional` | `condition` `temporary` `scaling` | 93 |
| `air-r4` | Foudre | `conditional` | `condition` | 93 |
| `air-r5` | Forme éthérée | `conditional` `immunity` | `condition` `temporary` | 93 |
| `divination-r1` | Divination | `flat-bonus` `conditional` | `condition` `scaling` | 93 |
| `divination-r2` | Détection de l’invisible | `conditional` | `condition` `temporary` | 93 |
| `divination-r3` | Clairvoyance | `conditional` | `condition` `temporary` | 94 |
| `divination-r4` | Perception héroïque | `flat-bonus` | — | 94 |
| `divination-r5` | Prescience | `conditional` | `temporary` | 94 |
| `envouteur-r1` | Injonction | `flat-bonus` `conditional` | `condition` `scaling` | 94 |
| `envouteur-r2` | Sommeil | `conditional` | `condition` `temporary` `scaling` | 94 |
| `envouteur-r3` | Confusion | `conditional` | `condition` `temporary` | 94 |
| `envouteur-r4` | Amitié | `conditional` | `condition` `temporary` | 94 |
| `envouteur-r5` | Domination | `conditional` | `condition` `temporary` | 94 |
| `illusions-r1` | Mirage | `flat-bonus` `conditional` | `temporary` `scaling` | 95 |
| `illusions-r2` | Image décalée | `conditional` | `condition` `temporary` | 95 |
| `illusions-r3` | Sort illusoire | `conditional` | `condition` `scaling` | 95 |
| `illusions-r4` | Imitation | `conditional` | `condition` `temporary` | 95 |
| `illusions-r5` | Exécution mentale | `conditional` | `condition` `temporary` | 95 |
| `invocation-r1` | Choc | `conditional` | `condition` | 96 |
| `invocation-r2` | Serviteur invisible | `conditional` | `temporary` | 96 |
| `invocation-r3` | Arme de mana | `conditional` | `condition` `temporary` `scaling` | 96 |
| `invocation-r4` | Porte dimensionnelle | `conditional` | `scaling` | 96 |
| `invocation-r5` | Mur de mana | `conditional` | `condition` `temporary` | 96 |
| `artefacts-r1` | Bâton de mage | `conditional` | `scaling` | 97 |
| `artefacts-r2` | Ouverture ‑ fermeture | `conditional` | `condition` `temporary` | 97 |
| `artefacts-r3` | Sac sans fond | `conditional` | `condition` `temporary` `scaling` | 97 |
| `artefacts-r4` | Frappe des arcanes | `conditional` | `condition` | 97 |
| `artefacts-r5` | Artefact étrange | `choice` `conditional` | `condition` `temporary` | 97 |
| `elixirs-r1` | Fortifiant | `flat-bonus` `conditional` | `temporary` `scaling` | 98 |
| `elixirs-r2` | Feu grégeois | `conditional` | `condition` `scaling` | 98 |
| `elixirs-r3` | Élixir de guérison | `conditional` | `condition` | 98 |
| `elixirs-r4` | Élixirs mineurs | `choice` `conditional` | `scaling` | 98 |
| `elixirs-r5` | Élixirs majeurs | `choice` `conditional` | `scaling` | 98 |
| `metal-r1` | Morsure de la forge | `flat-bonus` `conditional` | `condition` `temporary` `scaling` | 99 |
| `metal-r2` | Métal brûlant | `conditional` | `condition` `temporary` | 99 |
| `metal-r3` | Magnétisme | `conditional` | `condition` `temporary` | 99 |
| `metal-r4` | Métal hurlant | `conditional` | `condition` | 99 |
| `metal-r5` | Endurer | `flat-bonus` | — | 99 |
| `golem-r1` | Grosse tête | `flat-bonus` `conditional` | `scaling` | 100 |
| `golem-r2` | Golem | `conditional` | `scaling` | 100 |
| `golem-r3` | Protecteur | `conditional` | `condition` `temporary` | 100 |
| `golem-r4` | Statuette | `conditional` | `condition` | 100 |
| `golem-r5` | Golem supérieur | `choice` `conditional` | `scaling` | 100 |
| `runes-r1` | Runes de défense | `flat-bonus` `conditional` | `scaling` | 101 |
| `runes-r2` | Rune de puissance | `conditional` | `condition` `temporary` | 101 |
| `runes-r3` | Rune de protection | `conditional` | `condition` `temporary` | 101 |
| `runes-r4` | Rune d’énergie | `conditional` | `condition` `temporary` | 101 |
| `runes-r5` | Rune de garde | `choice` `mana-cost` `conditional` | `condition` `temporary` | 101 |
| `magie-des-arcanes-r1` | Projectile de mana | `conditional` | `condition` `scaling` | 103 |
| `magie-des-arcanes-r2` | Lévitation | `conditional` | `temporary` | 103 |
| `magie-des-arcanes-r3` | Forme gazeuse | `conditional` | `condition` `temporary` | 103 |
| `magie-des-arcanes-r4` | Accélération | `mana-cost` `conditional` | `temporary` `scaling` | 103 |
| `magie-des-arcanes-r5` | Désintégration | `conditional` | `condition` `scaling` | 103 |
| `magie-destructrice-r1` | Arc de feu | `conditional` | `condition` `scaling` | 103 |
| `magie-destructrice-r2` | Saper les forces | `conditional` | `condition` `temporary` | 103 |
| `magie-destructrice-r3` | Flèche de feu | `conditional` | `condition` `temporary` `scaling` | 103 |
| `magie-destructrice-r4` | Explosion de feu | `conditional` | `condition` `scaling` | 103 |
| `magie-destructrice-r5` | Appel de la foudre | `conditional` | `condition` `scaling` | 103 |
| `magie-elementaire-r1` | Asphyxie | `conditional` | `condition` `temporary` | 104 |
| `magie-elementaire-r2` | Maîtrise des éléments | `conditional` | `temporary` `scaling` | 104 |
| `magie-elementaire-r3` | Arme élémentaire | `choice` `mana-cost` `conditional` | `condition` `temporary` `scaling` | 104 |
| `magie-elementaire-r4` | Respiration aquatique | `conditional` | `temporary` `scaling` | 104 |
| `magie-elementaire-r5` | Armure de pierre | `conditional` | `condition` `temporary` `scaling` | 104 |
| `magie-protectrice-r1` | Armure de mana | `conditional` | `condition` `temporary` `scaling` | 104 |
| `magie-protectrice-r2` | Chute ralentie | `conditional` | `condition` `scaling` | 105 |
| `magie-protectrice-r3` | Déphasage | `conditional` | `condition` `temporary` | 105 |
| `magie-protectrice-r4` | Cercle de protection | `conditional` | `condition` `temporary` `scaling` | 105 |
| `magie-protectrice-r5` | Interruption du temps | `conditional` | `temporary` `scaling` | 105 |
| `magie-universelle-r1` | Lumière | `conditional` | `condition` `temporary` | 106 |
| `magie-universelle-r2` | Familier | `flat-bonus` `conditional` | `condition` | 106 |
| `magie-universelle-r3` | Invisibilité | `conditional` | `condition` `temporary` `scaling` | 106 |
| `magie-universelle-r4` | Vol | `conditional` | `temporary` `scaling` | 106 |
| `magie-universelle-r5` | Téléportation | `conditional` | `condition` `temporary` `scaling` | 106 |
| `demon-r1` | Malédiction | `conditional` | `condition` | 107 |
| `demon-r2` | Beauté de la succube | `conditional` | `condition` `temporary` `scaling` | 107 |
| `demon-r3` | Pacte démoniaque | `conditional` | `condition` `scaling` | 107 |
| `demon-r4` | Aspect du démon | `conditional` | `condition` `temporary` `scaling` | 107 |
| `demon-r5` | Invocation d’un démon | `conditional` | `condition` `temporary` `scaling` | 107 |
| `mort-r1` | Siphon des âmes | `choice` `conditional` | `condition` `scaling` | 108 |
| `mort-r2` | Masque mortuaire | `conditional` `immunity` | `condition` `temporary` | 108 |
| `mort-r3` | Baiser du vampire | `conditional` | `condition` `scaling` | 108 |
| `mort-r4` | Peur | `conditional` | `condition` `temporary` `scaling` | 108 |
| `mort-r5` | Briser les cœurs | `conditional` | `condition` `scaling` | 108 |
| `outre-tombe-r1` | Un pied dans la tombe | `conditional` | `condition` `temporary` `scaling` | 109 |
| `outre-tombe-r2` | Armure d’os | `flat-bonus` `conditional` | `scaling` | 109 |
| `outre-tombe-r3` | Animation des morts | `conditional` | `condition` `scaling` | 109 |
| `outre-tombe-r4` | Ensevelissement | `conditional` | `condition` `temporary` | 109 |
| `outre-tombe-r5` | Armée des morts | `conditional` | `condition` `temporary` `scaling` | 109 |
| `sang-r1` | Saignements | `conditional` | `condition` `temporary` `scaling` | 109 |
| `sang-r2` | Sang mordant | `conditional` | `condition` `temporary` | 109 |
| `sang-r3` | Exsangue | `flat-bonus` `conditional` | `condition` `scaling` | 110 |
| `sang-r4` | Rituel de sang | `conditional` | `condition` `temporary` `scaling` | 110 |
| `sang-r5` | Lien de sang | `conditional` | `condition` `temporary` | 110 |
| `sombre-magie-r1` | Ténèbres | `flat-bonus` `conditional` | `condition` `temporary` `scaling` | 110 |
| `sombre-magie-r2` | Reptation | `conditional` | `temporary` | 110 |
| `sombre-magie-r3` | Strangulation | `mana-cost` `conditional` | `condition` `temporary` `scaling` | 111 |
| `sombre-magie-r4` | Manteau d’ombre | `conditional` | `condition` `temporary` | 111 |
| `sombre-magie-r5` | Pacte ténébreux | `flat-bonus` `conditional` | `condition` `scaling` | 110 |

### Mystiques (chap. 4, p. 61-77)

| id | Capacité | Tags | Sous-types | Page |
|---|---|---|---|--:|
| `animaux-r1` | Langage des animaux | `choice` `conditional` | `condition` `scaling` | 114 |
| `animaux-r2` | Petit compagnon | `flat-bonus` `choice` `conditional` | `condition` `scaling` | 114 |
| `animaux-r3` | Nuée d'insectes | `conditional` | `condition` `temporary` `scaling` | 114 |
| `animaux-r4` | Masque du prédateur | `flat-bonus` `conditional` | `temporary` | 114 |
| `animaux-r5` | Forme animale | `choice` `conditional` | `condition` `temporary` | 114 |
| `fauve-r1` | Vitesse du félin | `flat-bonus` `conditional` | `scaling` | 115 |
| `fauve-r2` | Panthère | `conditional` | `condition` `scaling` | 115 |
| `fauve-r3` | Attaque bondissante | `conditional` | `condition` `scaling` | 115 |
| `fauve-r4` | Grand félin | `conditional` | `condition` `scaling` | 115 |
| `fauve-r5` | Les sept vies du chat | `conditional` | `condition` `temporary` | 115 |
| `nature-r1` | Maître de la survie | `conditional` | `condition` `scaling` | 116 |
| `nature-r2` | Terrains difficiles | `conditional` | `condition` | 116 |
| `nature-r3` | Bâton de druide | `conditional` | `condition` `temporary` `scaling` | 116 |
| `nature-r4` | Constitution héroïque | `flat-bonus` | — | 116 |
| `nature-r5` | Résistant | `conditional` | `condition` | 116 |
| `protecteur-r1` | Baies magiques | `conditional` | `condition` `temporary` `scaling` | 116 |
| `protecteur-r2` | Forêt vivante | `conditional` | `condition` `temporary` `scaling` | 116 |
| `protecteur-r3` | Régénération | `conditional` | `condition` `temporary` `scaling` | 117 |
| `protecteur-r4` | Perception héroïque | `flat-bonus` | — | 117 |
| `protecteur-r5` | Forme d'arbre | `conditional` | `temporary` | 117 |
| `vegetaux-r1` | Peau d'écorce | `conditional` | `condition` `temporary` `scaling` | 117 |
| `vegetaux-r2` | Prison végétale | `conditional` | `condition` `temporary` `scaling` | 117 |
| `vegetaux-r3` | Flèche vivante | `conditional` | `condition` `temporary` | 117 |
| `vegetaux-r4` | Animation d'un arbre | `conditional` | `condition` `temporary` `scaling` | 117 |
| `vegetaux-r5` | Porte végétale | `conditional` | `condition` `temporary` `scaling` | 117 |
| `energie-vitale-r1` | Mains d'énergie | `conditional` | `condition` `scaling` | 119 |
| `energie-vitale-r2` | Projection du ki | `conditional` | `condition` `scaling` | 119 |
| `energie-vitale-r3` | Invulnérable | `conditional` `immunity` | `scaling` | 119 |
| `energie-vitale-r4` | Pression mortelle | `conditional` | `condition` `temporary` `scaling` | 119 |
| `energie-vitale-r5` | Ascétisme | `flat-bonus` `conditional` | `temporary` `scaling` | 119 |
| `maitrise-r1` | Agilité du singe | `flat-bonus` `conditional` | `condition` `scaling` | 119 |
| `maitrise-r2` | Griffes du tigre | `choice` `conditional` | `condition` | 119 |
| `maitrise-r3` | Morsure du serpent | `conditional` | `condition` `temporary` | 119 |
| `maitrise-r4` | Fureur du dragon | `conditional` | `condition` `temporary` | 119 |
| `maitrise-r5` | Moment de perfection | `flat-bonus` `conditional` | `temporary` `scaling` | 120 |
| `meditation-r1` | Pacifisme | `conditional` | `condition` `scaling` | 120 |
| `meditation-r2` | Transe de guérison | `conditional` | `temporary` `scaling` | 120 |
| `meditation-r3` | Maîtrise du ki | `flat-bonus` `conditional` | `scaling` | 120 |
| `meditation-r4` | Volonté héroïque | `flat-bonus` | — | 120 |
| `meditation-r5` | Projection mentale | `flat-bonus` `conditional` | `temporary` `scaling` | 120 |
| `poing-r1` | Poings de fer | `conditional` | `condition` `scaling` | 121 |
| `poing-r2` | Peau de fer | `flat-bonus` `conditional` | `scaling` | 121 |
| `poing-r3` | Parade de projectiles | `conditional` | `condition` `temporary` | 121 |
| `poing-r4` | Déluge de coups | `choice` | — | 121 |
| `poing-r5` | Puissance du ki | `conditional` | `condition` | 121 |
| `vent-r1` | Pas du vent | `flat-bonus` `conditional` | `scaling` | 121 |
| `vent-r2` | Course du vent | `flat-bonus` `conditional` | `scaling` | 121 |
| `vent-r3` | Course des airs | `immunity` | — | 121 |
| `vent-r4` | Agilité héroïque | `flat-bonus` | — | 121 |
| `vent-r5` | Passe-muraille | `flat-bonus` `conditional` | `condition` `temporary` `scaling` | 121 |
| `foi-r1` | Prédicateur | `conditional` | `condition` `temporary` | 122 |
| `foi-r2` | Miracle mineur | `conditional` | `condition` `scaling` | 122 |
| `foi-r3` | Arme de lumière | `conditional` | `condition` `temporary` `scaling` | 123 |
| `foi-r4` | Ailes célestes | `conditional` | `temporary` | 123 |
| `foi-r5` | Foudres divines | `mana-cost` `conditional` | `condition` `scaling` | 123 |
| `guerre-sainte-r1` | Arme bénie | `conditional` | `condition` `temporary` | 123 |
| `guerre-sainte-r2` | Bouclier de la foi | `flat-bonus` `conditional` | `condition` `scaling` | 123 |
| `guerre-sainte-r3` | Châtiment divin | `mana-cost` `conditional` | `condition` `scaling` | 123 |
| `guerre-sainte-r4` | Marteau de la foi | `conditional` | `condition` `scaling` | 123 |
| `guerre-sainte-r5` | Mot de pouvoir | `conditional` | `condition` `temporary` | 124 |
| `priere-r1` | Bénédiction | `conditional` | `condition` `temporary` `scaling` | 124 |
| `priere-r2` | Sanctuaire | `conditional` | `condition` `temporary` `scaling` | 124 |
| `priere-r3` | Destruction du mal | `conditional` | `condition` `scaling` | 124 |
| `priere-r4` | Volonté héroïque | `flat-bonus` | — | 124 |
| `priere-r5` | Intervention divine | `conditional` | `condition` `temporary` | 124 |
| `soins-r1` | Récupération mineure | `conditional` | `condition` `temporary` `scaling` | 124 |
| `soins-r2` | Vigueur divine | `conditional` | `condition` `scaling` | 124 |
| `soins-r3` | Récupération majeure | `conditional` | `condition` `scaling` | 125 |
| `soins-r4` | Phénix | `conditional` | `condition` `temporary` | 125 |
| `soins-r5` | Rétablissement | `conditional` | `condition` `temporary` `scaling` | 125 |
| `spiritualite-r1` | Vêtements sacrés | `flat-bonus` `choice` `conditional` | `condition` `scaling` | 125 |
| `spiritualite-r2` | Augure | `conditional` | `condition` | 125 |
| `spiritualite-r3` | Délivrance | `conditional` | `condition` | 125 |
| `spiritualite-r4` | Charisme héroïque | `flat-bonus` | — | 125 |
| `spiritualite-r5` | Marche des plans | `conditional` | `condition` `temporary` `scaling` | 125 |

### Voies de peuple (chap. 3) + voie du mage (p. 60)

| id | Capacité | Tags | Sous-types | Page |
|---|---|---|---|--:|
| `demi-orc-r1` | Impressionnant | `flat-bonus` | — | 48 |
| `demi-orc-r2` | Talent pour la violence | `choice` | — | 48 |
| `demi-orc-r3` | Critique brutal | `conditional` | `condition` | 48 |
| `demi-orc-r4` | Attaque sanglante | `conditional` | `condition` | 48 |
| `demi-orc-r5` | Colosse | `flat-bonus` | — | 48 |
| `elfe-haut-r1` | Lumière intérieure | `flat-bonus` | — | 50 |
| `elfe-haut-r2` | Force d’âme | `conditional` `immunity` | `condition` `scaling` | 50 |
| `elfe-haut-r3` | Talent pour la magie | `choice` | — | 50 |
| `elfe-haut-r4` | Immortel | `immunity` | — | 50 |
| `elfe-haut-r5` | Supériorité elfique | `flat-bonus` `choice` | — | 50 |
| `elfe-sylvain-r1` | Lumière des étoiles | `flat-bonus` | — | 52 |
| `elfe-sylvain-r2` | Enfant de la forêt | `choice` | — | 52 |
| `elfe-sylvain-r3` | Archer émérite | `conditional` | `condition` | 52 |
| `elfe-sylvain-r4` | Flèche sanglante | `conditional` | `condition` | 52 |
| `elfe-sylvain-r5` | Supériorité elfique | `flat-bonus` | — | 52 |
| `gnome-r1` | Don étrange | `flat-bonus` `choice` `conditional` | `condition` `temporary` | 53 |
| `gnome-r2` | Petit pote | `flat-bonus` `conditional` | `condition` | 54 |
| `gnome-r3` | Insignifiant | `conditional` | `condition` `scaling` | 54 |
| `gnome-r4` | Merveille technologique | `conditional` | `condition` | 54 |
| `gnome-r5` | Bonne nature | `flat-bonus` | — | 54 |
| `halfelin-r1` | Petite taille | `flat-bonus` | — | 55 |
| `halfelin-r2` | Résistance légendaire | `conditional` | `condition` `scaling` | 55 |
| `halfelin-r3` | Bon pour le moral | `conditional` | `condition` `temporary` | 55 |
| `halfelin-r4` | Petit veinard | `flat-bonus` `conditional` | `condition` `temporary` | 56 |
| `halfelin-r5` | Vif et bien nourri | `flat-bonus` | — | 56 |
| `humain-r1` | Diversité | `flat-bonus` `choice` | — | 57 |
| `humain-r2` | Instinct de survie | `conditional` | `condition` `temporary` | 57 |
| `humain-r3` | Touche-à-tout | `choice` | — | 57 |
| `humain-r4` | Loup parmi les loups | `conditional` | `condition` `temporary` | 57 |
| `humain-r5` | Polyvalence | `flat-bonus` `choice` | — | 57 |
| `nain-r1` | Habitant des tunnels | `flat-bonus` | — | 59 |
| `nain-r2` | Haches et marteaux | `conditional` | `condition` | 59 |
| `nain-r3` | Résistance à la magie | `conditional` | `condition` `temporary` | 59 |
| `nain-r4` | Fils du roc | `conditional` | `scaling` | 59 |
| `nain-r5` | Ténacité | `flat-bonus` | — | 60 |
| `mage-r1` | Capacité de peuple + occultisme | `conditional` | `condition` `scaling` | 60 |
| `mage-r2` | Maîtrise de la magie | `conditional` | `condition` | 60 |
| `mage-r3` | Tour de magie | `flat-bonus` `conditional` | `condition` | 60 |
| `mage-r4` | Esprit supérieur | `flat-bonus` `conditional` | `condition` | 60 |
| `mage-r5` | Tempête de mana | `mana-cost` `conditional` | `condition` | 60 |

### Voies de prestige — partie 1 (chap. 8, p. 128+)

| id | Capacité | Tags | Sous-types | Page |
|---|---|---|---|--:|
| `prestige-expert-r4` | Capacité de néophyte | `choice` | — | 129 |
| `prestige-expert-r5` | Capacité d'initié | `choice` | — | 129 |
| `prestige-expert-r6` | Capacité de professionnel | `choice` | — | 129 |
| `prestige-expert-r7` | Capacité d'expert | `choice` | — | 129 |
| `prestige-expert-r8` | Capacité de maître | `choice` | — | 129 |
| `prestige-specialiste-r4` | Expertise | `flat-bonus` `choice` | — | 129 |
| `prestige-specialiste-r5` | Capacité fabuleuse | `choice` `conditional` | `condition` | 129 |
| `prestige-specialiste-r6` | Caractéristique fabuleuse | `flat-bonus` `conditional` | `condition` | 129 |
| `prestige-specialiste-r7` | Capacité supérieure | `choice` `conditional` | `condition` `temporary` | 129 |
| `prestige-specialiste-r8` | Capacité signature | `choice` `mana-cost` `conditional` | `condition` `temporary` | 129 |
| `prestige-lycanthrope-r4` | Forme hybride | `conditional` | `condition` `temporary` | 130 |
| `prestige-lycanthrope-r5` | Transformation en loup | `conditional` | `condition` `temporary` `scaling` | 130 |
| `prestige-lycanthrope-r6` | Éventration | `conditional` | `condition` | 131 |
| `prestige-lycanthrope-r7` | Résistance surnaturelle | `conditional` | `condition` | 131 |
| `prestige-lycanthrope-r8` | Forme puissante | `conditional` | `condition` | 131 |
| `prestige-sang-dragon-r4` | Ascendance draconique | `flat-bonus` `choice` `conditional` | `scaling` | 131 |
| `prestige-sang-dragon-r5` | Griffes du dragon | `conditional` | `temporary` `scaling` | 131 |
| `prestige-sang-dragon-r6` | Souffle du dragon | `conditional` | `temporary` | 131 |
| `prestige-sang-dragon-r7` | Ailes de dragon | `conditional` | `temporary` | 132 |
| `prestige-sang-dragon-r8` | Écailles de dragon | `conditional` | `condition` | 132 |
| `prestige-familier-fantastique-r3` | Familier fantastique | `conditional` | — | 132 |
| `prestige-familier-fantastique-r4` | Pouvoir mineur | `pure-text` | — | 133 |
| `prestige-familier-fantastique-r5` | Résistance | `flat-bonus` `choice` `conditional` | `temporary` `scaling` | 133 |
| `prestige-familier-fantastique-r6` | Inséparables | `flat-bonus` | — | 133 |
| `prestige-familier-fantastique-r7` | Pouvoir supérieur | `flat-bonus` | — | 133 |
| `prestige-archer-arcanique-r4` | Flèche magique | `conditional` | `condition` | 137 |
| `prestige-archer-arcanique-r5` | Flèche intangible | `conditional` | — | 137 |
| `prestige-archer-arcanique-r6` | Flèche chercheuse | `conditional` | `condition` `temporary` | 137 |
| `prestige-archer-arcanique-r7` | Flèche élémentaire | `choice` `conditional` | `temporary` | 137 |
| `prestige-archer-arcanique-r8` | Flèche tueuse | `conditional` | `condition` `temporary` | 137 |
| `prestige-espion-r4` | Secrets d'alcôves | `flat-bonus` `conditional` | `scaling` | 138 |
| `prestige-espion-r5` | À la garde | `conditional` | `condition` | 138 |
| `prestige-espion-r6` | Mémoire eidétique | `flat-bonus` | — | 138 |
| `prestige-espion-r7` | Caméléon | `conditional` | `condition` | 138 |
| `prestige-espion-r8` | Réseau | `conditional` | `condition` `temporary` | 138 |
| `prestige-casse-cou-r4` | Au pied du mur | `conditional` | `condition` | 138 |
| `prestige-casse-cou-r5` | Mouche du coche | `flat-bonus` `conditional` | `condition` `scaling` | 139 |
| `prestige-casse-cou-r6` | L'amour du risque | `conditional` | `condition` | 139 |
| `prestige-casse-cou-r7` | Poussée d'adrénaline | `conditional` | `temporary` | 139 |
| `prestige-casse-cou-r8` | Attaque kamikaze | `conditional` | `condition` `scaling` | 139 |
| `prestige-ombres-r4` | Vision des ombres | `flat-bonus` `conditional` | `condition` | 139 |
| `prestige-ombres-r5` | Caméléon | `conditional` | `condition` | 139 |
| `prestige-ombres-r6` | Ombre mouvante | `conditional` | `temporary` | 139 |
| `prestige-ombres-r7` | Cape d'ombre | `conditional` | `temporary` | 139 |
| `prestige-ombres-r8` | Passe-muraille | `conditional` | `condition` | 139 |
| `prestige-chasseur-de-prime-r4` | Marque du chasseur | `flat-bonus` `conditional` | `condition` | 140 |
| `prestige-chasseur-de-prime-r5` | Assommer | `conditional` | `condition` `temporary` | 140 |
| `prestige-chasseur-de-prime-r6` | Traqueur infatigable | `conditional` | `condition` `scaling` | 140 |
| `prestige-chasseur-de-prime-r7` | Attaque invalidante | `conditional` | `condition` `temporary` | 140 |
| `prestige-chasseur-de-prime-r8` | Instinct du Traqueur | `conditional` | `condition` `temporary` | 140 |
| `prestige-duelliste-r4` | Vive attaque | `choice` `conditional` | `condition` | 140 |
| `prestige-duelliste-r5` | Défi | `conditional` | `condition` `temporary` | 140 |
| `prestige-duelliste-r6` | Juste toi et moi | `flat-bonus` `conditional` | `condition` | 142 |
| `prestige-duelliste-r7` | Duel mental | `conditional` | `condition` | 142 |
| `prestige-duelliste-r8` | Botte mortelle | `conditional` | `condition` `temporary` `scaling` | 142 |
| `prestige-flibustier-r4` | Pied marin | `flat-bonus` `conditional` | `condition` `scaling` | 141 |
| `prestige-flibustier-r5` | Coup de crosse | `conditional` | `temporary` | 141 |
| `prestige-flibustier-r6` | À l'abordage | `conditional` | `condition` | 142 |
| `prestige-flibustier-r7` | Sabre au poing | `conditional` | — | 142 |
| `prestige-flibustier-r8` | Pas de quartier | `conditional` | `condition` | 142 |
| `prestige-heros-r4` | Destin héroïque | `flat-bonus` `conditional` | `temporary` `scaling` | 142 |
| `prestige-heros-r5` | Homme/femme de la situation | `conditional` | `temporary` | 142 |
| `prestige-heros-r6` | Héros célèbre | `choice` `conditional` | `condition` `scaling` | 142 |
| `prestige-heros-r7` | Ténacité | `conditional` | `condition` | 142 |
| `prestige-heros-r8` | Meneur d'hommes | `conditional` | `temporary` | 142 |
| `prestige-maitre-des-poisons-r4` | Connaissance du poison | `conditional` | — | 143 |
| `prestige-maitre-des-poisons-r5` | Poison rapide | `conditional` | `condition` `temporary` | 143 |
| `prestige-maitre-des-poisons-r6` | Poison affaiblissant | `conditional` | `condition` | 143 |
| `prestige-maitre-des-poisons-r7` | Résistance au poison | `conditional` | `condition` | 143 |
| `prestige-maitre-des-poisons-r8` | Poisons virulents | `conditional` | `temporary` | 143 |
| `prestige-pacte-feerique-r4` | Amitié avec les animaux | `conditional` | `condition` | 143 |
| `prestige-pacte-feerique-r5` | Invisibilité | `conditional` | `condition` `temporary` | 143 |
| `prestige-pacte-feerique-r6` | Compagnon féérique | `conditional` | — | 143 |
| `prestige-pacte-feerique-r7` | Pas brumeux | `conditional` | `condition` `temporary` | 144 |
| `prestige-pacte-feerique-r8` | Pays des songes | `conditional` | `condition` `temporary` | 144 |
| `prestige-touche-a-tout-r4` | Domaine de l'aventure | `choice` | — | 144 |
| `prestige-touche-a-tout-r5` | Domaine de la guerre | `choice` | — | 144 |
| `prestige-touche-a-tout-r6` | Domaine du mystique | `choice` `conditional` | `condition` | 144 |
| `prestige-touche-a-tout-r7` | Domaine de la magie | `choice` `conditional` | `condition` | 144 |
| `prestige-touche-a-tout-r8` | Ultra polyvalent | `flat-bonus` `choice` | — | 144 |
| `prestige-tueur-a-gages-r4` | Faire taire | `conditional` | `condition` `temporary` | 145 |
| `prestige-tueur-a-gages-r5` | Brise genou | `conditional` | `condition` `temporary` | 145 |
| `prestige-tueur-a-gages-r6` | Ne me tourne pas le dos | `conditional` | `condition` `temporary` | 145 |
| `prestige-tueur-a-gages-r7` | Égorger | `conditional` | `condition` `scaling` | 145 |
| `prestige-tueur-a-gages-r8` | Un simple regard | `conditional` | `condition` `temporary` | 145 |

### Voies de prestige — partie 2 (chap. 8, p. 128+)

| id | Capacité | Tags | Sous-types | Page |
|---|---|---|---|--:|
| `prestige-armes-a-deux-mains-r4` | Frappe massive | `conditional` | `condition` | 146 |
| `prestige-armes-a-deux-mains-r5` | Gros monstre, grosse arme | `conditional` | `condition` | 146 |
| `prestige-armes-a-deux-mains-r6` | Tenir à distance | `conditional` | `condition` `scaling` | 146 |
| `prestige-armes-a-deux-mains-r7` | Critique destructeur | `conditional` | `condition` | 146 |
| `prestige-armes-a-deux-mains-r8` | Décapitation | `conditional` | `condition` | 146 |
| `prestige-arme-liee-r4` | Fidèle | `conditional` | `condition` `temporary` | 147 |
| `prestige-arme-liee-r5` | Alliée loyale | `conditional` | `condition` `temporary` | 147 |
| `prestige-arme-liee-r6` | Arme dansante | `conditional` | `temporary` `scaling` | 147 |
| `prestige-arme-liee-r7` | Aura élémentaire | `conditional` | `condition` `temporary` `scaling` | 147 |
| `prestige-arme-liee-r8` | Milles lames | `conditional` | `temporary` `scaling` | 147 |
| `prestige-chevalier-dragon-r4` | Ordre du chevalier dragon | `conditional` | `condition` | 147 |
| `prestige-chevalier-dragon-r5` | Résistance au feu | `conditional` | `condition` `scaling` | 148 |
| `prestige-chevalier-dragon-r6` | Épée de feu | `conditional` | `temporary` `scaling` | 148 |
| `prestige-chevalier-dragon-r7` | Monture puissante | `conditional` | — | 148 |
| `prestige-chevalier-dragon-r8` | Souffle enflammé | `conditional` | `condition` `temporary` | 148 |
| `prestige-combattant-des-tunnels-r4` | Infravision | `flat-bonus` `conditional` | `condition` | 148 |
| `prestige-combattant-des-tunnels-r5` | Combat confiné | `conditional` | `condition` `scaling` | 148 |
| `prestige-combattant-des-tunnels-r6` | Briseur de hordes | `conditional` | `condition` `temporary` `scaling` | 148 |
| `prestige-combattant-des-tunnels-r7` | Tueur de nuées | `conditional` | `condition` | 148 |
| `prestige-combattant-des-tunnels-r8` | Briseur de voûte | `conditional` | `condition` `temporary` | 148 |
| `prestige-combat-du-mal-r4` | Juste courroux | `conditional` | `condition` | 148 |
| `prestige-combat-du-mal-r5` | Épée de lumière | `conditional` | `condition` `temporary` | 148 |
| `prestige-combat-du-mal-r6` | Sentir la corruption | `conditional` | `condition` | 148 |
| `prestige-combat-du-mal-r7` | Frappe suppressive | `conditional` | `condition` `temporary` | 148 |
| `prestige-combat-du-mal-r8` | Résister à la corruption | `conditional` `immunity` | `temporary` | 148 |
| `prestige-colosse-r4` | Stature de géant | `conditional` | `condition` | 149 |
| `prestige-colosse-r5` | Résistance colossale | `flat-bonus` | — | 149 |
| `prestige-colosse-r6` | Force du titan | `flat-bonus` | — | 149 |
| `prestige-colosse-r7` | Poigne de fer | `conditional` | `condition` | 149 |
| `prestige-colosse-r8` | Attaque monumentale | `conditional` | `condition` `temporary` `scaling` | 149 |
| `prestige-danseur-de-guerre-r4` | Vent des lames | `choice` `conditional` | `condition` | 149 |
| `prestige-danseur-de-guerre-r5` | Pirouettes | `conditional` | `scaling` | 149 |
| `prestige-danseur-de-guerre-r6` | Attaque en mouvement | `conditional` | `condition` | 149 |
| `prestige-danseur-de-guerre-r7` | Danse des lames | `conditional` | `temporary` | 149 |
| `prestige-danseur-de-guerre-r8` | Volte-face | `conditional` | `condition` | 149 |
| `prestige-ecorcheur-r4` | Armes dentelées | `flat-bonus` `conditional` | `condition` `temporary` `scaling` | 150 |
| `prestige-ecorcheur-r5` | Armure à pointes | `conditional` | `condition` `scaling` | 150 |
| `prestige-ecorcheur-r6` | Blessures affreuses | `conditional` | `condition` | 150 |
| `prestige-ecorcheur-r7` | Hémorragie interne | `conditional` | `condition` `temporary` | 150 |
| `prestige-ecorcheur-r8` | Impitoyable | `conditional` | `condition` | 150 |
| `prestige-guerrier-mage-r4` | Magie en armure | `conditional` | `condition` `scaling` | 150 |
| `prestige-guerrier-mage-r5` | Rituel de combat | `choice` `conditional` | `condition` | 150 |
| `prestige-guerrier-mage-r6` | Déflexion arcanique | `mana-cost` `conditional` | `condition` `scaling` | 150 |
| `prestige-guerrier-mage-r7` | Magie de combat | `conditional` | `condition` | 150 |
| `prestige-guerrier-mage-r8` | Frappe des arcanes | `mana-cost` `conditional` | `condition` | 150 |
| `prestige-ours-r4` | Caractère d'ours | `flat-bonus` `conditional` | `condition` `temporary` `scaling` | 151 |
| `prestige-ours-r5` | Hibernation | `conditional` | `scaling` | 151 |
| `prestige-ours-r6` | Métamorphose | `conditional` | `condition` `temporary` | 151 |
| `prestige-ours-r7` | Étreinte de l'ours | `conditional` | `condition` `temporary` | 152 |
| `prestige-ours-r8` | Métamorphose supérieure | `conditional` | `temporary` | 152 |
| `prestige-porteur-de-bouclier-r4` | Parade au bouclier | `conditional` | `condition` `temporary` | 152 |
| `prestige-porteur-de-bouclier-r5` | Attaque au bouclier | `conditional` | `condition` `temporary` | 152 |
| `prestige-porteur-de-bouclier-r6` | Bousculade | `conditional` | `condition` `scaling` | 152 |
| `prestige-porteur-de-bouclier-r7` | Dévier les coups | `conditional` | `condition` `temporary` | 152 |
| `prestige-porteur-de-bouclier-r8` | Lancer de bouclier | `conditional` | `condition` | 152 |
| `prestige-tueur-de-geants-r4` | Profil bas | `conditional` | `condition` | 152 |
| `prestige-tueur-de-geants-r5` | Ventre mou | `conditional` | `condition` | 152 |
| `prestige-tueur-de-geants-r6` | Réduire la distance | `conditional` | `condition` `scaling` | 152 |
| `prestige-tueur-de-geants-r7` | Pieds d'argile | `conditional` | `condition` `temporary` | 152 |
| `prestige-tueur-de-geants-r8` | Tueur de géants | `conditional` | `condition` `scaling` | 152 |
| `prestige-archimage-r4` | Sceptre défensif | `conditional` | `condition` `scaling` | 154 |
| `prestige-archimage-r5` | Bâton magique | `choice` `conditional` | `scaling` | 154 |
| `prestige-archimage-r6` | Paralysie | `conditional` | `condition` `temporary` `scaling` | 154 |
| `prestige-archimage-r7` | Barrière magique | `conditional` | `condition` `temporary` `scaling` | 154 |
| `prestige-archimage-r8` | Métamorphose d'autrui | `choice` `conditional` | `condition` `temporary` | 154 |
| `prestige-chaos-r4` | Arc-en-ciel | `conditional` | `condition` `temporary` | 155 |
| `prestige-chaos-r5` | Mur arc-en-ciel | `choice` `conditional` | `condition` `temporary` `scaling` | 155 |
| `prestige-chaos-r6` | Pont arc-en-ciel | `conditional` | `condition` `temporary` `scaling` | 155 |
| `prestige-chaos-r7` | Explosion multicolore | `conditional` | `condition` `temporary` | 155 |
| `prestige-chaos-r8` | Sphère multicolore | `conditional` | `condition` `temporary` | 155 |
| `prestige-cristaux-r4` | Premier cristal | `choice` | — | 156 |
| `prestige-cristaux-r5` | Second cristal | `choice` | — | 156 |
| `prestige-cristaux-r6` | Troisième cristal | `choice` | — | 156 |
| `prestige-cristaux-r7` | Quatrième cristal | `choice` | — | 156 |
| `prestige-cristaux-r8` | Cinquième cristal | `choice` | — | 156 |
| `prestige-elementaliste-r4` | Élément de prédilection | `choice` `conditional` | `condition` | 157 |
| `prestige-elementaliste-r5` | Résistance élémentaire | `conditional` | `condition` | 157 |
| `prestige-elementaliste-r6` | Invocation d'élémentaire | `choice` `conditional` | `condition` `temporary` | 157 |
| `prestige-elementaliste-r7` | Élément puissant | `conditional` | `condition` | 157 |
| `prestige-elementaliste-r8` | Métamorphose élémentaire | `choice` `conditional` `immunity` | `condition` `temporary` | 157 |
| `prestige-enchanteur-r4` | Enchantement | `pure-text` | — | 157 |
| `prestige-enchanteur-r5` | Enchantement | `pure-text` | — | 157 |
| `prestige-enchanteur-r6` | Enchantement | `pure-text` | — | 157 |
| `prestige-enchanteur-r7` | Enchantement | `pure-text` | — | 157 |
| `prestige-enchanteur-r8` | Enchantement | `pure-text` | — | 157 |
| `prestige-gel-r4` | Verglas | `conditional` | `condition` `temporary` | 157 |
| `prestige-gel-r5` | Cœur de glace | `immunity` | — | 157 |
| `prestige-gel-r6` | Souffle glacial | `conditional` | `condition` | 157 |
| `prestige-gel-r7` | Présence glaciale | `conditional` `immunity` | `temporary` | 157 |
| `prestige-gel-r8` | Cryogénisation | `conditional` | `condition` `temporary` `scaling` | 157 |
| `prestige-invocation-majeure-r4` | Monture fantôme | `conditional` | `temporary` `scaling` | 158 |
| `prestige-invocation-majeure-r5` | Manoir d'outre-monde | `choice` `conditional` | `temporary` `scaling` | 158 |
| `prestige-invocation-majeure-r6` | Navire fantôme | `conditional` | `temporary` `scaling` | 159 |
| `prestige-invocation-majeure-r7` | Chasseur ailé | `conditional` | `temporary` | 159 |
| `prestige-invocation-majeure-r8` | Portail magique | `conditional` | `temporary` `scaling` | 159 |
| `prestige-mage-de-guerre-r4` | Coup au but | `choice` `mana-cost` `conditional` | `condition` `temporary` | 160 |
| `prestige-mage-de-guerre-r5` | Explosion différée | `conditional` | `condition` `temporary` `scaling` | 160 |
| `prestige-mage-de-guerre-r6` | Aura du chef de guerre | `conditional` | `temporary` `scaling` | 160 |
| `prestige-mage-de-guerre-r7` | Épargner les alliés | `mana-cost` `conditional` | `condition` | 160 |
| `prestige-mage-de-guerre-r8` | Vague de feu | `conditional` | `condition` `scaling` | 160 |
| `prestige-magie-de-l-esprit-r4` | Esprit impénétrable | `flat-bonus` `conditional` `immunity` | `condition` `temporary` | 161 |
| `prestige-magie-de-l-esprit-r5` | Lire les pensées | `conditional` | `condition` `temporary` `scaling` | 161 |
| `prestige-magie-de-l-esprit-r6` | Prison mentale | `conditional` | `condition` `temporary` | 161 |
| `prestige-magie-de-l-esprit-r7` | Attaque mentale | `conditional` | `condition` `temporary` `scaling` | 161 |
| `prestige-magie-de-l-esprit-r8` | Contrôle mental | `conditional` | `condition` `temporary` | 161 |
| `prestige-magie-des-mots-r4` | Chant fascinant | `conditional` | `condition` `temporary` `scaling` | 162 |
| `prestige-magie-des-mots-r5` | Poids des mots | `pure-text` | — | 162 |
| `prestige-magie-des-mots-r6` | Cri de la banshee | `conditional` | `condition` `temporary` | 162 |
| `prestige-magie-des-mots-r7` | Mot de mana | `conditional` | `condition` `temporary` | 162 |
| `prestige-magie-des-mots-r8` | Souhait | `choice` `conditional` | `temporary` `scaling` | 162 |
| `prestige-magie-du-temps-r4` | Fuite en avant | `conditional` | `condition` | 163 |
| `prestige-magie-du-temps-r5` | Lenteur | `conditional` | `condition` `temporary` | 163 |
| `prestige-magie-du-temps-r6` | Décalage | `conditional` | `condition` `temporary` | 163 |
| `prestige-magie-du-temps-r7` | Enkystement lointain | `conditional` | `condition` `temporary` | 163 |
| `prestige-magie-du-temps-r8` | Arrêt du temps | `conditional` | `temporary` `scaling` | 163 |
| `prestige-maitre-des-sorts-r4` | Connaissance des arcanes inférieures | `choice` | — | 164 |
| `prestige-maitre-des-sorts-r5` | Connaissance des arcanes mineures | `choice` | — | 164 |
| `prestige-maitre-des-sorts-r6` | Connaissance des arcanes supérieures | `choice` | — | 164 |
| `prestige-maitre-des-sorts-r7` | Connaissance des arcanes majeures | `choice` | — | 164 |
| `prestige-maitre-des-sorts-r8` | Connaissance des arcanes suprêmes | `choice` | — | 164 |
| `prestige-vision-r4` | Cécité | `conditional` | `condition` `temporary` | 165 |
| `prestige-vision-r5` | Œil magique | `conditional` | `temporary` | 165 |
| `prestige-vision-r6` | Motif hypnotique | `conditional` | `condition` `temporary` `scaling` | 165 |
| `prestige-vision-r7` | Vision de la vérité | `conditional` | `condition` `temporary` | 165 |
| `prestige-vision-r8` | Invisibilité supérieure | `choice` `conditional` | `temporary` `scaling` | 165 |
| `prestige-armure-sacree-r4` | Armure de bronze | `conditional` | `condition` | 166 |
| `prestige-armure-sacree-r5` | Pouvoir unique | `choice` `conditional` | `temporary` | 166 |
| `prestige-armure-sacree-r6` | Armure d'argent | `conditional` | `condition` | 166 |
| `prestige-armure-sacree-r7` | Pouvoir puissant | `choice` `conditional` | `temporary` | 166 |
| `prestige-armure-sacree-r8` | Armure d'or | `conditional` | `condition` | 166 |
| `prestige-elementaire-du-feu-r4` | Mur de feu | `conditional` | `condition` `temporary` | 166 |
| `prestige-elementaire-du-feu-r5` | Tornade de feu | `conditional` | `condition` | 166 |
| `prestige-elementaire-du-feu-r6` | Insensible au feu | `immunity` | — | 166 |
| `prestige-elementaire-du-feu-r7` | Immolation | `conditional` `immunity` | `condition` `temporary` | 166 |
| `prestige-elementaire-du-feu-r8` | Forme élémentaire de feu | `conditional` `immunity` | `temporary` | 166 |
| `prestige-elementaire-de-la-terre-r4` | Mur de pierre | `conditional` | `temporary` | 167 |
| `prestige-elementaire-de-la-terre-r5` | Litomorphose | `conditional` | `temporary` `scaling` | 167 |
| `prestige-elementaire-de-la-terre-r6` | Pétrification | `conditional` | `condition` | 167 |
| `prestige-elementaire-de-la-terre-r7` | Séisme | `conditional` | `condition` | 167 |
| `prestige-elementaire-de-la-terre-r8` | Forme élémentaire de terre | `conditional` | `condition` `temporary` | 167 |
| `prestige-elementaire-de-l-air-r4` | Bourrasque | `conditional` | `condition` `scaling` | 168 |
| `prestige-elementaire-de-l-air-r5` | Chevaucher les nuées | `conditional` | `condition` `scaling` | 168 |
| `prestige-elementaire-de-l-air-r6` | Mur de vent | `choice` `conditional` | `condition` `temporary` `scaling` | 168 |
| `prestige-elementaire-de-l-air-r7` | Cyclone | `conditional` | `condition` `temporary` | 168 |
| `prestige-elementaire-de-l-air-r8` | Forme élémentaire d'air | `conditional` `immunity` | `condition` `temporary` | 168 |
| `prestige-elementaire-de-l-eau-r4` | Brouillard | `conditional` | `temporary` | 169 |
| `prestige-elementaire-de-l-eau-r5` | Mur acide | `conditional` | `condition` `temporary` | 169 |
| `prestige-elementaire-de-l-eau-r6` | Armure d'eau | `conditional` | `temporary` | 169 |
| `prestige-elementaire-de-l-eau-r7` | Écartement des eaux | `conditional` | `temporary` | 169 |
| `prestige-elementaire-de-l-eau-r8` | Forme élémentaire d'eau | `conditional` `immunity` | `condition` `temporary` | 169 |
| `prestige-changeforme-r4` | Forme de voyage | `choice` `conditional` | `temporary` `scaling` | 170 |
| `prestige-changeforme-r5` | Transformation en animal | `choice` `conditional` | `condition` `temporary` | 170 |
| `prestige-changeforme-r6` | Transformation puissante | `conditional` | `condition` | 170 |
| `prestige-changeforme-r7` | Grande forme animale | `mana-cost` `conditional` | `condition` `scaling` | 170 |
| `prestige-changeforme-r8` | Forme animale énorme | `mana-cost` `conditional` | `condition` | 170 |
| `prestige-combat-mystique-r4` | Attaque étourdissante | `conditional` | `condition` `temporary` | 170 |
| `prestige-combat-mystique-r5` | Frappe concentrée | `conditional` | `temporary` | 170 |
| `prestige-combat-mystique-r6` | Pression nerveuse | `conditional` | `condition` `temporary` `scaling` | 170 |
| `prestige-combat-mystique-r7` | Paume mortelle | `conditional` | `condition` `temporary` | 170 |
| `prestige-combat-mystique-r8` | Main du tout puissant | `conditional` | `condition` `temporary` | 170 |
| `prestige-guerisseur-r4` | Premiers soins | `conditional` | `condition` `temporary` | 171 |
| `prestige-guerisseur-r5` | Soins rapides | `conditional` | — | 171 |
| `prestige-guerisseur-r6` | Rappel à la vie | `conditional` | `condition` `temporary` | 171 |
| `prestige-guerisseur-r7` | Zone de vie | `conditional` | `temporary` | 171 |
| `prestige-guerisseur-r8` | Résurrection | `conditional` | `condition` `temporary` | 171 |
| `prestige-maitre-de-la-nature-r4` | Amitié animale | `conditional` | `condition` `temporary` `scaling` | 172 |
| `prestige-maitre-de-la-nature-r5` | Seigneur de la nature | `choice` `conditional` | `condition` `scaling` | 172 |
| `prestige-maitre-de-la-nature-r6` | Invisibilité aux animaux | `conditional` | `condition` | 172 |
| `prestige-maitre-de-la-nature-r7` | Monture géante | `choice` `conditional` | `condition` `scaling` | 172 |
| `prestige-maitre-de-la-nature-r8` | Magie druidique innée | `choice` `conditional` | `condition` `temporary` | 172 |
| `prestige-saisons-r4` | Vigueur du printemps | `flat-bonus` `conditional` | `condition` | 173 |
| `prestige-saisons-r5` | Flamme de l'été | `conditional` | `condition` | 173 |
| `prestige-saisons-r6` | Tourbillon d'automne | `conditional` | `temporary` `scaling` | 173 |
| `prestige-saisons-r7` | Frimas de l'hiver | `conditional` | `condition` `temporary` | 173 |
| `prestige-saisons-r8` | Contrôle climatique | `conditional` | `temporary` `scaling` | 173 |
| `prestige-templier-r4` | Résistance au mal | `flat-bonus` `conditional` `immunity` | `condition` `temporary` | 174 |
| `prestige-templier-r5` | Quête | `conditional` | `condition` `temporary` `scaling` | 174 |
| `prestige-templier-r6` | Résistance au mal supérieure | `flat-bonus` `conditional` `immunity` | `condition` | 174 |
| `prestige-templier-r7` | Châtiment du mal | `conditional` | `condition` | 174 |
| `prestige-templier-r8` | Forme d'Ange | `conditional` | `temporary` | 174 |
| `prestige-vermines-r4` | Maître vermine | `pure-text` | — | 175 |
| `prestige-vermines-r5` | Nuées de criquets | `conditional` | `condition` `temporary` | 175 |
| `prestige-vermines-r6` | Compagnon vermine | `choice` `conditional` | `scaling` | 175 |
| `prestige-vermines-r7` | Affinité au poison | `conditional` | `condition` `temporary` | 175 |
| `prestige-vermines-r8` | Vermine supérieure | `choice` `conditional` | `condition` `scaling` | 175 |

