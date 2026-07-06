---
status: accepted
---

# Règle « armes à feu » : disponibilité campagne × choix personnage, valeur effective dérivée

## Contexte

Les armes à feu (arquebusier vs « Arbalétrier », livre p. 62) relèvent à la fois d'une **décision d'univers** (le maître de jeu décide si la poudre existe dans sa campagne) et d'une **préférence de joueur** (dans un univers où la poudre existe, un joueur peut vouloir jouer l'arbalète par goût). Il fallait câbler cette règle de bout en bout (wizard, fiche, level-up, conformité) sans jamais muter en silence les données d'un personnage déjà bâti.

## Décision

Deux valeurs cohabitent, et la valeur utilisée partout est **dérivée** de leur conjonction :

- `campaign.rules.firearmsAllowed` — la poudre **existe-t-elle** dans cette campagne (disponibilité d'option). Reste **éditable** par le MJ.
- `Character.firearmsAllowed` (*snapshot*) — le **choix du joueur** à la création, dans la limite de ce que la campagne autorise. **Verrouillé après la création** (plus d'interrupteur sur la fiche).
- **`firearmsEffectif = Character.firearmsAllowed ∧ campaign.rules.firearmsAllowed`** (campagne absente ⇒ `true`). Toutes les lectures historiques de `Character.firearmsAllowed` (nom affiché, `effectiveClassPathIds`, légalité/level-up, `checkCompliance`) passent par cette valeur effective.

## Conséquences

- Le MJ peut interdire la poudre **après coup** : l'effectif d'un Arquebusier existant bascule à `false`, il s'affiche « Arbalétrier », le level-up lui propose la voie du maître des arbalètes, et l'avertissement de conformité existant (`FIREARMS_DISABLED_PATH`, + arme à feu équipée) signale la voie explosifs orpheline à régulariser **à la main**. Aucune donnée n'est mutée ; rebasculer la campagne à `true` restaure l'Arquebusier.
- Un Arbalétrier (snapshot `false`) reste Arbalétrier quelle que soit la campagne — on ne transforme jamais un joueur en artificier malgré lui.

## Alternatives rejetées

- **Tout verrouiller** (règle campagne figée à la création de campagne + choix perso figé) : élimine tout scénario rétroactif mais supprime la souplesse du MJ, oblige à défaire l'interrupteur de réglages déjà livré (PER-183) et à porter le choix dans le dialogue de création de campagne. Plus de code pour moins de valeur.
- **Dérivé pur** (pas de champ par personnage, tout suit la règle campagne) : supprime la liberté du joueur (impossible de jouer l'arbalète par goût dans une campagne où la poudre existe).
